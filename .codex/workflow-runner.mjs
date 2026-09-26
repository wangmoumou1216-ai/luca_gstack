#!/usr/bin/env node
// Workflow → Codex 执行后端。
//
// 【为什么需要它】
// .claude/workflows/*.js 是给 Claude Code 的 Workflow 工具写的编排脚本：顶层有 return、
// 零 import，靠 runtime 注入 4 个全局 API（agent / phase / parallel / log）。
// 直接 `node` 跑会 "Illegal return statement"。Codex 没有 Workflow 工具，若不接后端，
// 月度治理能力（framework-evolution-scout / external-skill-scout）在 Codex 下直接消失。
//
// 【为什么不是"自建平行机器"（Loop 宪法 §4）】
// 本文件不实现编排语义——阶段划分、并发分组、门禁、降级全在 workflow 脚本里，原样不动。
// 它只把 agent() 这一个原语接到 Codex app-server 的显式模型 thread 上，
// 并在接纳结果前核验同一调用的采用与完成证据。workflow 脚本零改写。
//
// 【契约（从 workflow 脚本的实际用法反推，不可违反）】
//  · agent(prompt, {label, phase, schema}) → Promise<对象|null>
//    **失败必须 resolve 成 falsy，绝不 throw** —— 脚本靠 filter(Boolean) / `r || {保守降级}`
//    做决定层降级。抛异常会让整套降级逻辑失效并炸掉整个 run。
//  · parallel(thunks[]) → Promise<结果数组>，**保持输入顺序**
//  · phase(title) / log(msg) → 同步，无返回值
//
// 【2026-08-05 深审修正（独立评审逐条实测，见 framework-audit/）】
//  B1 strictifySchema 漏掉**无 properties 的自由形态 object** → 真实 API 仍 400，
//     而它恰是 framework-evolution-scout 的 Phase-1 总闸 ⇒ 整个 workflow 每次第一步死掉。
//     修法不能简单补 additionalProperties:false —— 那会让 `discovery` 变成恒空对象，
//     而它是被 `src.discovery.method/.queries/.hubs` **结构化消费**的，等于静默丢数据。
//     ⇒ 自由形态 object 转 `type:'string'` 并**记录路径**，响应回来后自动 JSON.parse 还原。
//  B3 agent() 会 throw（writeFileSync / strictifySchema 在 Promise executor 里无 try/catch，
//     EACCES、循环引用、BigInt 均可触发）⇒ 直接 `await agent()` 的调用点会掀到顶层，
//     整套降级失效。⇒ executor 全体包 try/catch，任何异常一律收敛成 resolve(null)。
//  M4/M5 env 无校验：LUCA_WF_CONCURRENCY=0/-1/abc → 一个 thunk 都不跑且返回稀疏空洞数组；
//     TIMEOUT=0/abc → 每个 agent 4ms 被 SIGKILL。两者都是**静默全空**。⇒ 加正整数校验。
//  M6 超时只杀直接子进程，孙进程（gh/sandbox-exec）成孤儿；无信号 handler → tmp 残留。
//     ⇒ detached 进程组 + kill(-pid)；SIGINT/SIGTERM/exit 统一清理。
//  M7 stdout 设 pipe 却无消费者，>192KB 挂死到超时。runner 根本不读 stdout（结果走 -o 文件）
//     ⇒ 直接设 'ignore'，零成本消除该失败模式。
//     （我此前"10MB 不阻塞"的实测是对**另一条代码路径**——裸 node 写 stdout，
//       不是 spawn 后管道无人 drain 的情形；结论不适用于此，已更正。）

import { spawn, spawnSync } from 'child_process';
import { createInterface } from 'readline';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync, realpathSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, resolve, join, basename, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { modelRoutingPolicyDigest, resolve as resolveModelRoute, resolveDispatchScene } from '../scripts/model-route.mjs';
import {
  acceptInvocationEvidence, prepareInvocation, readActivation, releaseDigestForPolicy,
} from '../scripts/model-route-host.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// A task-owned project root is captured once at dispatch startup. It is never
// recomputed from session pins or shared display aliases after a project switch.
const WORK_ROOT = (() => {
  const configured = process.env.LUCA_WF_WORK_ROOT || ROOT;
  if (!isAbsolute(configured)) throw new Error('LUCA_WF_WORK_ROOT must be an absolute path');
  return realpathSync(configured);
})();
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const rawName = argv.find((a) => !a.startsWith('--') && a !== argvValueAfter('--args'));
function argvValueAfter(flag) { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; }
const ARGS_JSON = (() => {
  const v = argvValueAfter('--args');
  if (v === undefined) return {};
  try { return JSON.parse(v); } catch {
    process.stderr.write(`[runner] --args 不是合法 JSON，已忽略：${String(v).slice(0, 80)}\n`);
    return {};
  }
})();

if (!rawName) {
  console.error("用法: node .codex/workflow-runner.mjs <workflow名> [--args '<json>'] [--dry-run]");
  process.exit(2);
}
// NAME 校验：只允许纯 workflow 名，禁路径分隔与穿越（原实现可执行仓外任意 .js）
if (rawName !== basename(rawName) || !/^[A-Za-z0-9._-]+$/.test(rawName) || rawName.startsWith('.')) {
  console.error(`[runner] 非法 workflow 名（只允许 .claude/workflows/ 下的纯文件名）: ${rawName}`);
  process.exit(2);
}
const WF = join(ROOT, '.claude', 'workflows', `${rawName}.js`);
if (!existsSync(WF)) { console.error(`找不到 workflow: ${WF}`); process.exit(2); }

// Model choice is the shared v2 policy's job. Existing agent/user effort remains untouched and is
// deliberately absent from every route input, digest, app-server request and evidence envelope.
const TEST_MODE = process.env.NODE_ENV === 'test';
const testOverride = (name) => TEST_MODE && process.env[name] ? process.env[name] : null;
const POLICY_PATH = testOverride('LUCA_MODEL_ROUTE_POLICY_PATH')
  || join(ROOT, '.claude', 'skill-os', 'model-routing.yaml');
const BINDINGS_PATH = testOverride('LUCA_MODEL_ROUTE_BINDINGS_PATH')
  || '/Users/luca/.luca/model-routing-bindings.json';
const STATE_ROOT = testOverride('LUCA_MODEL_ROUTE_STATE_ROOT') || undefined;
const ROOT_SESSION_ID = process.env.LUCA_MODEL_ROUTE_ROOT_SESSION_ID || '';

function readCommonPolicy() {
  const loaded = spawnSync('python3', ['-c',
    'import json,sys,yaml;d=yaml.safe_load(open(sys.argv[1]));print(json.dumps(d.get("model_routing")))',
    POLICY_PATH], {encoding: 'utf8', timeout: 5000});
  if (loaded.status !== 0) throw new Error('MODEL_ROUTE_POLICY_UNREADABLE');
  const policy = JSON.parse(loaded.stdout);
  if (!policy || policy.version !== 2 || policy.scope !== 'common' || policy.status !== 'active') {
    throw new Error('MODEL_ROUTE_POLICY_NOT_ACTIVE');
  }
  return policy;
}

function readCodexBindings() {
  const parsed = JSON.parse(readFileSync(BINDINGS_PATH, 'utf8'));
  const binding = parsed?.schema_version === 1 ? parsed?.harnesses?.codex : null;
  if (!binding || typeof binding.peak_model !== 'string' || typeof binding.light_model !== 'string'
    || !Array.isArray(binding.approved_order)) throw new Error('MODEL_ROUTE_BINDINGS_INVALID');
  return binding;
}

function routeForPhase(phaseName) {
  if (!ROOT_SESSION_ID) throw new Error('MODEL_ROUTE_ROOT_SESSION_MISSING');
  const policy = readCommonPolicy();
  const scene = resolveDispatchScene(policy, {kind: 'workflow', workflow_id: rawName, phase_id: phaseName});
  if (!scene) throw new Error('MODEL_ROUTE_SCENE_UNKNOWN');
  const state = readActivation({
    harness: 'codex', root_session_id: ROOT_SESSION_ID, state_root: STATE_ROOT,
  });
  if (!state || state.status !== 'active') throw new Error('MODEL_ROUTE_ACTIVATION_MISSING');
  const binding = readCodexBindings();
  const route = resolveModelRoute({
    harness: 'codex-cli', scene, role_config: policy,
    effective_config: {
      anchor: state.root_anchor,
      peak: {model: binding.peak_model, source: 'user-approved-private-binding', approved: true},
      light: {model: binding.light_model, source: 'user-approved-private-binding', approved: true},
      approved_order: binding.approved_order,
      security: {provider: 'openai', sandbox: SANDBOX, approval_policy: 'never', network: SANDBOX === 'workspace-write'},
    },
    runtime_capabilities: {
      explicit_model_override: true,
      adopted_model_evidence: true,
      preserves_safety: true,
      model_pin: null,
      evidence: {owner: 'codex-app-server', ref: 'thread/start+turn/completed', harness: 'codex-cli'},
    },
  }, {verifyCapability: () => true});
  if (route.disposition !== 'READY') throw new Error(`MODEL_ROUTE_${route.reason}`);
  const policySha = modelRoutingPolicyDigest(policy);
  if (route.policy_sha !== policySha) throw new Error('MODEL_ROUTE_POLICY_DIGEST_MISMATCH');
  return {route, release_digest: releaseDigestForPolicy(policySha)};
}

// env 正整数校验（M4/M5）：非法值静默退回默认，绝不产生"零并发/零超时"的静默空转
function posInt(name, dflt) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return dflt;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    process.stderr.write(`[runner] ${name}=${raw} 非法（须为 ≥1 整数），退回默认 ${dflt}\n`);
    return dflt;
  }
  return n;
}
const MAX_CONCURRENCY = posInt('LUCA_WF_CONCURRENCY', 3);
const TIMEOUT_MS = posInt('LUCA_WF_AGENT_TIMEOUT_MS', 900000);

const tmp = mkdtempSync(join(tmpdir(), 'luca-wf-'));
// agent 的工作根：**不是仓库**。写入面被沙箱限死在这里，仓库只可读不可写。
const AGENT_CWD = join(tmp, 'agent-cwd');
mkdirSync(AGENT_CWD, { recursive: true });
let agentSeq = 0, agentFail = 0, agentOk = 0;
const liveChildren = new Set();
let cancellationRequested = false;
let queuedWork = 0;
let activeWork = 0;

// 统一清理：正常/异常/信号三条路径都走这里（M6：原实现只在正常路径清 tmp）
let cleanedUp = false;
function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  for (const pid of liveChildren) {
    try { process.kill(-pid, 'SIGKILL'); } catch { try { process.kill(pid, 'SIGKILL'); } catch { } }
  }
  try { rmSync(tmp, { recursive: true, force: true }); } catch { }
}
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    cancellationRequested = true;
    const report = {
      signal: sig,
      queued_not_dispatched: queuedWork,
      in_flight: Math.max(activeWork, liveChildren.size),
      termination_requested: liveChildren.size,
      os_revocation_guaranteed: false,
    };
    // This is an observation of the dispatch boundary, not a claim that the OS
    // rolled back an already-issued command. The process-group outcome is tested
    // separately by the runtime fixture.
    process.stderr.write(`[runner] cancellation ${JSON.stringify(report)}\n`);
    cleanup();
    process.exit(130);
  });
}

// ── Schema 归一化（OpenAI 结构化输出为 strict 模式）──────────────────────────
// strict 要求每层 object：① required 列全 properties ② additionalProperties:false。
// 自由形态 object（有 type:'object' 但无 properties）在 strict 下**无法表达**：
// 补 additionalProperties:false 会使其恒空 → 结构化消费方（如 src.discovery.method）拿到空 →
// 静默丢数据。故转成 string 并记录路径，响应回来后自动解析还原（见 reviveFreeform）。
// 原可选字段转 nullable，保住"可以没有"的语义，不强行必填。
// seen 是 **Map（原节点 → 已归一化结果）**，不是 Set。
// 2026-08-05 评审实证原 WeakSet 写法有两处错：①命中时 `return node` 返回**未处理的原节点**，
// 真环下后面 JSON.stringify 照抛，等于没达成"环检测"的宣称目的；②对**共享子 schema（DAG，非环）**
// 第二次引用被原样返回、**未 strict 化** → 递交真实 API 即 400（当前 workflow 是内联字面量
// 尚未触发，但 `const EVIDENCE = {...}` 复用两处是 JS 最自然的写法，一写就中）。
// 用 Map 缓存归一化结果后：DAG 复用拿到的是**已归一化**的同一份，真环拿到占位后不再无限递归。
function strictifySchema(node, freeform = [], path = [], seen = new Map()) {
  if (!node || typeof node !== 'object') return node;
  if (seen.has(node)) return seen.get(node);
  if (Array.isArray(node)) {
    const arr = [];
    seen.set(node, arr);
    for (const n of node) arr.push(strictifySchema(n, freeform, path, seen));
    return arr;
  }

  const out = { ...node };
  seen.set(node, out);          // 先登记再递归：环回到此处拿到的是同一份 out（不再无限下探）
  for (const k of ['items', 'not']) if (out[k]) out[k] = strictifySchema(out[k], freeform, path.concat(k === 'items' ? '[]' : k), seen);
  for (const k of ['anyOf', 'oneOf', 'allOf']) if (Array.isArray(out[k])) out[k] = out[k].map((n) => strictifySchema(n, freeform, path, seen));
  if (out.$defs) out.$defs = Object.fromEntries(Object.entries(out.$defs).map(([k, v]) => [k, strictifySchema(v, freeform, path, seen)]));

  const isObj = out.type === 'object' || (Array.isArray(out.type) && out.type.includes('object'));

  if (out.properties && typeof out.properties === 'object') {
    const keys = Object.keys(out.properties);
    const wasRequired = new Set(Array.isArray(out.required) ? out.required : []);
    const props = {};
    for (const k of keys) {
      let child = strictifySchema(out.properties[k], freeform, path.concat(k), seen);
      if (!wasRequired.has(k) && child && typeof child === 'object' && child.type) {
        const t = Array.isArray(child.type) ? child.type : [child.type];
        if (!t.includes('null')) child = { ...child, type: [...t, 'null'] };
      }
      props[k] = child;
    }
    out.properties = props;
    out.required = keys;
    out.additionalProperties = false;
  } else if (isObj) {
    // 自由形态 object → string（记录路径，响应后还原）
    freeform.push(path.join('.'));
    const desc = out.description ? `${out.description} ` : '';
    return { type: Array.isArray(out.type) && out.type.includes('null') ? ['string', 'null'] : 'string',
      description: `${desc}(Return a JSON object serialized as a compact JSON string.)` };
  }
  return out;
}

// 把被转成 string 的自由形态字段解析回对象（与 strictifySchema 的 freeform 路径配对）
function reviveFreeform(value, paths) {
  if (!paths.length || value === null || typeof value !== 'object') return value;
  const set = new Set(paths);
  const walk = (node, path) => {
    if (node === null || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map((n) => walk(n, path.concat('[]')));
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      const p = path.concat(k).join('.');
      if (set.has(p) && typeof v === 'string') {
        try { out[k] = JSON.parse(v); continue; } catch { /* 解析失败保留原串 */ }
      }
      out[k] = walk(v, path.concat(k));
    }
    return out;
  };
  return walk(value, []);
}

function appServerArgs() {
  const args = ['app-server', '--listen', 'stdio://', '--disable', 'hooks', '--disable', 'apps',
    '--disable', 'shell_snapshot', '-c', 'notify=[]', '-c', 'web_search="disabled"'];
  const meta = spawnSync('python3', ['-c',
    'import os,pathlib,tomllib,json;p=pathlib.Path(os.environ.get("CODEX_HOME",str(pathlib.Path.home()/".codex")));d=tomllib.loads((p/"config.toml").read_text());print(json.dumps(list(d.get("mcp_servers",{}))))'],
  {encoding: 'utf8', timeout: 5000});
  if (meta.status !== 0) throw new Error('MODEL_ROUTE_CONFIG_METADATA_FAILED');
  for (const name of JSON.parse(meta.stdout)) {
    if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new Error('MODEL_ROUTE_UNSAFE_MCP_KEY');
    args.push('-c', `mcp_servers.${name}.enabled=false`);
  }
  return args;
}

let runnerCriticalFailure = false;
function runCodex(prompt, schema, phaseName) {
  return new Promise((resolveP) => {
    const id = ++agentSeq;
    let settled = false, child = null, timer = null, prepared = null, route = null;
    let threadId = null, turnId = null, adoptedModel = null, rerouted = false;
    const freeform = [];
    const finish = (val, why, runtime = {}) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (child?.pid) liveChildren.delete(child.pid);
      if (prepared?.envelope) {
        const accepted = acceptInvocationEvidence({
          harness: 'codex', root_session_id: ROOT_SESSION_ID, state_root: STATE_ROOT,
          evidence: {
            ...prepared.envelope,
            adopted_model: adoptedModel || '',
            status: runtime.completed === true ? 'completed' : 'failed',
            same_invocation_success: runtime.completed === true
              && runtime.thread_id === threadId && runtime.turn_id === turnId,
            rerouted,
            fallback: false,
            evidence_ref: `app-server:${threadId || 'unstarted'}:${turnId || `call-${id}`}`,
          },
        });
        if (accepted.disposition !== 'ACCEPT') val = null;
        if (route?.critical && accepted.disposition !== 'ACCEPT') runnerCriticalFailure = true;
      }
      if (val) agentOk++; else {
        agentFail++;
        process.stderr.write(`   ⚠ agent#${id} 失败(${why})——按契约返回 null 交给 workflow 降级\n`);
      }
      if (child && child.exitCode === null && child.signalCode === null) {
        try { child.stdin.end(); } catch { }
        try { child.kill('SIGTERM'); } catch { }
      }
      resolveP(val);
    };

    (async () => {
      try {
        const routed = routeForPhase(phaseName);
        route = routed.route;
        prepared = prepareInvocation({
          harness: 'codex', root_session_id: ROOT_SESSION_ID,
          release_digest: routed.release_digest, route,
          task_id: `${rawName}:${phaseName}:${id}`,
          input_sha: modelRoutingPolicyDigest({prompt, schema: schema || null}),
          state_root: STATE_ROOT,
        });
        if (prepared.disposition !== 'READY') throw new Error(`MODEL_ROUTE_${prepared.reason}`);
        const outputSchema = schema ? strictifySchema(schema, freeform) : null;
        // JSON serialization happens before the child starts so cyclic/BigInt schemas still obey
        // the historical "failure is null, never a rejected workflow promise" contract.
        if (outputSchema) JSON.stringify(outputSchema);

        child = spawn('codex', appServerArgs(), {
          cwd: AGENT_CWD, stdio: ['pipe', 'pipe', 'pipe'], detached: true,
        });
        liveChildren.add(child.pid);
        let stderr = '', nextRpcId = 0, fatal = null, finalText = '';
        const pending = new Map();
        let completeResolve;
        const completion = new Promise(resolveCompletion => { completeResolve = resolveCompletion; });
        const send = value => child.stdin.write(`${JSON.stringify(value)}\n`);
        const rpc = (method, params) => new Promise((resolveRpc, rejectRpc) => {
          const rpcId = ++nextRpcId;
          pending.set(rpcId, {resolve: resolveRpc, reject: rejectRpc, method});
          send({id: rpcId, method, params});
        });
        const failTransport = reason => {
          if (fatal) return;
          fatal = reason;
          for (const pendingRpc of pending.values()) pendingRpc.reject(new Error(reason));
          pending.clear();
          completeResolve?.(null);
        };
        child.stderr.on('data', data => { if (stderr.length < 8000) stderr += String(data); });
        child.on('error', () => failTransport('APP_SERVER_SPAWN_FAILED'));
        child.on('exit', (code) => {
          if (!settled && code !== 0) failTransport(`APP_SERVER_EXIT_${code}`);
        });
        createInterface({input: child.stdout}).on('line', line => {
          let event;
          try { event = JSON.parse(line); }
          catch { failTransport('APP_SERVER_INVALID_EVENT'); return; }
          if (event.id !== undefined && pending.has(event.id)) {
            const pendingRpc = pending.get(event.id);
            pending.delete(event.id);
            if (event.error) pendingRpc.reject(new Error(`APP_SERVER_RPC_${pendingRpc.method}`));
            else pendingRpc.resolve(event.result);
            return;
          }
          if (event.id !== undefined && event.method) {
            send({id: event.id, error: {code: -32601, message: 'runner rejects server requests'}});
            failTransport('APP_SERVER_REQUEST_REFUSED');
            return;
          }
          if (/model\/rerouted|modelRerouted/i.test(event.method || '')) {
            rerouted = true;
            failTransport('MODEL_REROUTED');
          }
          if (event.method === 'item/completed' && event.params?.item?.type === 'agentMessage') {
            finalText = String(event.params.item.text || '');
          }
          if (event.method === 'error' && !event.params?.willRetry) failTransport('APP_SERVER_TURN_ERROR');
          if (event.method === 'turn/completed') completeResolve?.(event.params);
        });
        timer = setTimeout(() => {
          failTransport('APP_SERVER_TIMEOUT');
          try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch { } }
        }, TIMEOUT_MS);

        await rpc('initialize', {clientInfo: {name: 'luca_model_route_runner', version: '2'}});
        send({method: 'initialized', params: {}});
        const started = await rpc('thread/start', {
          model: route.requested_model,
          modelProvider: 'openai',
          cwd: AGENT_CWD,
          ephemeral: true,
          sandbox: SANDBOX === 'workspace-write' ? 'workspaceWrite' : 'readOnly',
          approvalPolicy: 'never',
          allowProviderModelFallback: false,
        });
        adoptedModel = started?.model || started?.thread?.model || null;
        threadId = started?.thread?.id || null;
        if (adoptedModel !== route.requested_model || started?.modelProvider !== 'openai' || !threadId
          || started?.approvalPolicy !== 'never') throw new Error('APP_SERVER_THREAD_CONTRACT_MISMATCH');
        const turnParams = {
          threadId,
          input: [{type: 'text', text: prompt}],
          cwd: AGENT_CWD,
          approvalPolicy: 'never',
          sandboxPolicy: {
            type: SANDBOX === 'workspace-write' ? 'workspaceWrite' : 'readOnly',
            ...(SANDBOX === 'workspace-write' ? {writableRoots: [AGENT_CWD], networkAccess: true} : {}),
          },
          model: route.requested_model,
          ...(outputSchema ? {outputSchema} : {}),
        };
        const startedTurn = await rpc('turn/start', turnParams);
        turnId = startedTurn?.turn?.id || null;
        if (!turnId) throw new Error('APP_SERVER_TURN_ID_MISSING');
        const completed = await completion;
        if (fatal) throw new Error(fatal);
        const sameCall = completed?.threadId === threadId && completed?.turn?.id === turnId;
        if (!sameCall || completed?.turn?.status !== 'completed' || completed?.turn?.error) {
          throw new Error('APP_SERVER_TURN_NOT_COMPLETED');
        }
        const match = finalText.trim().match(/\{[\s\S]*\}/);
        if (!match) throw new Error('APP_SERVER_NO_JSON');
        finish(reviveFreeform(JSON.parse(match[0]), freeform), 'ok', {
          completed: true, thread_id: completed.threadId, turn_id: completed.turn.id,
        });
      } catch (error) {
        const message = (error && error.message) || String(error);
        finish(null, message, {completed: false, thread_id: threadId, turn_id: turnId});
      }
    })();
  });
}

// ── 沙箱档 + 工作根隔离（2026-08-05 红队裁决，见文件尾「网络与沙箱」）──────────
// 红队实测推翻了「read-only 断网 vs 放开仓库写」的二选一：**codex 沙箱的读是全局的，
// 只有写受工作根约束**。故把工作根 -C 指到 scratch 子目录，即可同时拿到
// 网络通 + 仓库写入被沙箱硬拦（独立复核：写仓库报 operation not permitted，读仓库正常）。
// danger-full-access 不在白名单——逃生舱不该给这一档（原实现无值域校验，可被直接设进去）。
const SANDBOX_ALLOWED = ['read-only', 'workspace-write'];
const SANDBOX = (() => {
  const v = process.env.LUCA_WF_SANDBOX;
  if (!v) return 'workspace-write';
  if (SANDBOX_ALLOWED.includes(v)) return v;
  process.stderr.write(`[runner] LUCA_WF_SANDBOX=${v} 不在白名单 ${SANDBOX_ALLOWED}，退回 workspace-write\n`);
  return 'workspace-write';
})();

// ── 注入给 workflow 的 4 个 API ────────────────────────────────────────────
let currentPhase = '';
const phase = (t) => { currentPhase = t; process.stderr.write(`\n▶ Phase: ${t}\n`); };
const log = (...a) => process.stderr.write(`   ${a.join(' ')}\n`);

const agent = async (prompt, opts = {}) => {
  const ph = opts.phase || currentPhase;
  process.stderr.write(`   · agent ${opts.label || '(unlabeled)'} [model-route phase=${ph || '(unknown)'}]\n`);
  if (DRY) return null;                       // dry-run：不真调模型，走全 null 路径验降级
  // 工作根是 scratch 而非仓库（见 SANDBOX 段），故须显式告知仓库绝对路径——否则脚本里
  // 那些仓库相对路径（self-model.yaml 等）会解析到 scratch 而读不到。
  // 前缀加在 runner 侧 ⇒ workflow 脚本仍然零改写。红队端到端探针已验证模型能据此正确取文件。
  const prefixed = `REPO_ROOT=${ROOT}\nWORK_ROOT=${WORK_ROOT}\n（你的 CWD 是临时工作目录；框架仓库相对路径一律按 REPO_ROOT 解析；`
    + `任务项目与输出路径一律按冻结的 WORK_ROOT 解析，不得从 session pin 或共享展示别名重算；`
    + `仓库只读，任何写入只能落在 CWD 内。）\n\n${prompt}`;
  return runCodex(prefixed, opts.schema, ph);
};

// 顺序保持 + 并发节流；任一 thunk 抛错都收敛成 null（契约：失败是 falsy 不是异常）
const parallel = async (thunks) => {
  const list = Array.from(thunks || []);
  const out = new Array(list.length).fill(null);   // 预填，杜绝稀疏空洞
  let next = 0;
  queuedWork += list.length;
  const worker = async () => {
    for (;;) {
      if (cancellationRequested) return;
      const i = next++;
      if (i >= list.length) return;
      queuedWork--;
      activeWork++;
      try { out[i] = await list[i](); } catch { out[i] = null; }
      finally { activeWork--; }
    }
  };
  const width = Math.max(1, Math.min(MAX_CONCURRENCY, list.length));
  await Promise.all(Array.from({ length: width }, worker));
  return out;
};

// ── 执行 ───────────────────────────────────────────────────────────────────
// workflow 脚本是 ESM 形态（`export const meta = {...}`）却带顶层 return —— 它本就不是
// 独立可运行的模块，而是被 runtime 包进函数体执行的**片段**。放进 AsyncFunction 前须剥掉
// 顶层 export（函数体内 `export` 是 SyntaxError）。
// **不能用裸正则**（MINOR）：prompt 里的模板字符串常含行首 `export ...`（这两个 workflow
// 正是审查 skill 源码的），裸正则会静默改写发给模型的文本。故做一次轻量扫描，
// 只在**字符串/模板/注释之外**的顶层位置剥离。
function stripTopLevelExports(src) {
  let out = '', i = 0;
  const n = src.length;
  let atLineStart = true;
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    // 注释
    if (c === '/' && c2 === '/') { const e = src.indexOf('\n', i); const j = e < 0 ? n : e; out += src.slice(i, j); i = j; continue; }
    if (c === '/' && c2 === '*') { const e = src.indexOf('*/', i + 2); const j = e < 0 ? n : e + 2; out += src.slice(i, j); i = j; continue; }
    // 字符串 / 模板（模板内不追踪 ${}，代价是其中的行首 export 也不剥——安全侧）
    if (c === '"' || c === "'" || c === '`') {
      const q = c; let j = i + 1;
      while (j < n) { if (src[j] === '\\') { j += 2; continue; } if (src[j] === q) { j++; break; } j++; }
      out += src.slice(i, j); i = j; atLineStart = false; continue;
    }
    if (atLineStart) {
      const rest = src.slice(i);
      const mDefault = rest.match(/^export\s+default\s+/);
      if (mDefault) { out += 'const __wf_default = '; i += mDefault[0].length; atLineStart = false; continue; }
      const mDecl = rest.match(/^export\s+(?=(const|let|var|function|async\s+function|class)\s)/);
      if (mDecl) { i += mDecl[0].length; atLineStart = false; continue; }
      const mList = rest.match(/^export\s*\{[^}]*\}\s*;?/);       // `export { a, b }` 整条删掉
      if (mList) { i += mList[0].length; atLineStart = false; continue; }
    }
    atLineStart = (c === '\n');
    out += c; i++;
  }
  return out;
}

const src = stripTopLevelExports(readFileSync(WF, 'utf8'));
const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
let result = null, failed = null;
try {
  // 不得把 meta 作为注入参数名 —— 脚本体内自己 `const meta = {...}`，同名会重复声明报错
  const fn = new AsyncFunction('agent', 'phase', 'parallel', 'log', 'args', src);
  result = await fn(agent, phase, parallel, log, ARGS_JSON);
} catch (e) {
  failed = (e && e.message) ? e.message : String(e);
}
cleanup();

process.stderr.write(`\n── runner: agent ok=${agentOk} fail=${agentFail}${DRY ? ' (dry-run)' : ''} ──\n`);
if (runnerCriticalFailure) failed = failed || '关键模型路由证据失败，已阻断 workflow 可信输出';
if (failed) { process.stderr.write(`workflow 执行异常: ${failed}\n`); process.exit(1); }
process.stdout.write(JSON.stringify(result ?? null, null, 2) + '\n');

// ── 网络与沙箱（2026-08-05 红队裁决已闭合）──────────────────────────────────
// `-s read-only` 会**屏蔽网络**（实测：沙箱内 `gh api` 报 connect 失败，沙箱外同命令 exit=0）。
// 而两个 workflow 的发现层重度依赖 gh（external-skill-scout 16 处、framework-evolution-scout 12 处），
// 网络被堵 → 每个 channel 返回空 → filter(Boolean) 清零 → **静默产出零候选**。
// codex 确实没有「read-only + 联网」的组合档（network_access 只挂在 workspace-write 下），
// 但**不是真冲突**——红队实测：codex 沙箱的**读是全局的，只有写受工作根约束**。
// 故 `-C <scratch>` + workspace-write + network_access=true 同时满足两边：
//   · 网络通（gh 发现层可用）· 仓库写入被沙箱硬拦（独立复核：operation not permitted）
//   · 仓库仍可读（workflow 需要的 self-model/gaps-register 等全是读）
// 代价仅为 prompt 前缀一行（见 agent()），workflow 脚本零改写。
// 备注：`sandbox_workspace_write.writable_roots` 是**加法不是限制**（设了它 cwd 仍可写），
// 所以「cwd 留仓库根 + 收窄写入面」那条路不存在，换工作根是唯一解。
