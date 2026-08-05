#!/usr/bin/env node
// Workflow → Codex 执行后端（2026-08-04）。
//
// 【为什么需要它】
// .claude/workflows/*.js 是给 Claude Code 的 Workflow 工具写的编排脚本：顶层有 return、
// 零 import，靠 runtime 注入 4 个全局 API（agent / phase / parallel / log）。
// 直接 `node` 跑会 "Illegal return statement"。Codex 没有 Workflow 工具，若不接后端，
// 月度治理能力（framework-evolution-scout / external-skill-scout）在 Codex 下直接消失。
//
// 【为什么不是"自建平行机器"（Loop 宪法 §4）】
// 本文件不实现编排语义——阶段划分、并发分组、门禁、降级全在 workflow 脚本里，原样不动。
// 它只把 agent() 这一个原语接到 **Codex 原生的 `codex exec`** 上（--output-schema 提供
// 结构化返回，正是 agent(prompt,{schema}) 需要的语义）。这是"接 harness 原生原语"，
// 不是造第二套 workflow 引擎。workflow 脚本零改写 —— 与 codex-hook-adapter 同一手法。
//
// 【契约（从 workflow 脚本的实际用法反推，不可违反）】
//  · agent(prompt, {label, phase, schema}) → Promise<对象|null>
//    **失败必须 resolve 成 falsy，绝不 throw** —— 脚本靠 filter(Boolean) / `r || {保守降级}`
//    做决定层降级（如 redteam agent 失败按"downgraded/UNKNOWN"保守处理）。抛异常会让
//    整套降级逻辑失效并炸掉整个 run。
//  · parallel(thunks[]) → Promise<结果数组>，**保持输入顺序**（脚本用 index 对齐语义）
//  · phase(title) / log(msg) → 同步，无返回值
//
// 用法： node .codex/workflow-runner.mjs <workflow名> [--args '<json>'] [--dry-run]
// 例：   node .codex/workflow-runner.mjs framework-evolution-scout --args '{"date":"2026-08"}'

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const NAME = argv.find((a) => !a.startsWith('--'));
const DRY = argv.includes('--dry-run');
const ARGS_JSON = (() => {
  const i = argv.indexOf('--args');
  if (i < 0 || !argv[i + 1]) return {};
  try { return JSON.parse(argv[i + 1]); } catch { return {}; }
})();

if (!NAME) {
  console.error('用法: node .codex/workflow-runner.mjs <workflow名> [--args \'<json>\'] [--dry-run]');
  process.exit(2);
}
const WF = join(ROOT, '.claude', 'workflows', `${NAME}.js`);
if (!existsSync(WF)) { console.error(`找不到 workflow: ${WF}`); process.exit(2); }

// ── 档位：真值源 .claude/skill-os/model-routing.yaml 的 codex.tier_to_effort ──
// 不写死模型名（随账户失效）；只映射 effort（枚举稳定）。见该文件 why_not_model_names。
// phase 名 → tier 的归属：判定型阶段（红队/裁决）走 reasoning-heavy，其余走 guided-execution。
// mechanical 用 low 而非 minimal：config 解析器接受 minimal，但真实模型返回
// 400 unsupported_value（2026-08-05 实测）。见 model-routing.yaml effort_rejected_by_model。
const TIER_TO_EFFORT = { 'reasoning-heavy': 'xhigh', 'core-execution': 'high', 'guided-execution': 'medium', mechanical: 'low' };
const PHASE_TIER = { Redteam: 'reasoning-heavy', Verify: 'core-execution', AdoptionReview: 'core-execution' };
const effortFor = (phase) => TIER_TO_EFFORT[PHASE_TIER[phase] || 'guided-execution'];

// Codex 侧并发上限。workflow 的 parallel() 可能一次抛出十几个 agent；
// 无节流会打爆速率限制，而 agent 失败是静默 falsy → 表现为"候选莫名变少"，极难归因。
const MAX_CONCURRENCY = Number(process.env.LUCA_WF_CONCURRENCY || 3);
const TIMEOUT_MS = Number(process.env.LUCA_WF_AGENT_TIMEOUT_MS || 900000);

const tmp = mkdtempSync(join(tmpdir(), 'luca-wf-'));
let agentSeq = 0, agentFail = 0, agentOk = 0;

// ── Schema 归一化（2026-08-05 实测发现，BLOCKER 修复）────────────────────────
// OpenAI 结构化输出是 **strict** 模式：每一层 object 都要求
//   ① `required` 包含 `properties` 的**全部** key   ② `additionalProperties: false`
// 而 .claude/workflows/*.js 的 schema 是给 Claude Code 的 Workflow 工具写的，普遍带可选字段。
// 实测：不归一化时 codex 返回 400 invalid_json_schema
//   （"'required' is required to be supplied and to be an array including every key in properties"）
// → 子进程 exit=1 → agent() 按契约返回 null → **每个 candidate 都静默消失**，
// workflow 照常跑完并产出空结果。这正是本文件开头警告的"候选莫名变少"失效模式，
// 且不报错、极难归因 —— 若不修，Codex 侧的 workflow 等于常态空转。
//
// 归一化不改变语义：原本**非** required 的字段转成 nullable（type 并上 'null'），
// 模型仍可用 null 表达"没有"，而 strict 模式的形式要求得到满足。
// 修在 runner 而非 workflow 脚本：零改写是本设计的根本前提（同 codex-hook-adapter 手法）。
function strictifySchema(node) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(strictifySchema);

  const out = { ...node };
  for (const k of ['items', 'not']) if (out[k]) out[k] = strictifySchema(out[k]);
  for (const k of ['anyOf', 'oneOf', 'allOf']) if (Array.isArray(out[k])) out[k] = out[k].map(strictifySchema);
  if (out.$defs) out.$defs = Object.fromEntries(Object.entries(out.$defs).map(([k, v]) => [k, strictifySchema(v)]));

  if (out.properties && typeof out.properties === 'object') {
    const keys = Object.keys(out.properties);
    const wasRequired = new Set(Array.isArray(out.required) ? out.required : []);
    const props = {};
    for (const k of keys) {
      let child = strictifySchema(out.properties[k]);
      if (!wasRequired.has(k) && child && typeof child === 'object' && child.type) {
        // 原可选 → nullable，保住"可以没有"的语义
        const t = Array.isArray(child.type) ? child.type : [child.type];
        if (!t.includes('null')) child = { ...child, type: [...t, 'null'] };
      }
      props[k] = child;
    }
    out.properties = props;
    out.required = keys;              // strict：必须列全
    out.additionalProperties = false; // strict：必须显式关闭
  }
  return out;
}

function runCodex(prompt, schema, phaseName) {
  return new Promise((resolveP) => {
    const id = ++agentSeq;
    const outFile = join(tmp, `out-${id}.json`);
    const args = ['exec', '--skip-git-repo-check', '-s', 'read-only',
      '-c', `model_reasoning_effort="${effortFor(phaseName)}"`,
      '-o', outFile];
    if (schema) {
      const sf = join(tmp, `schema-${id}.json`);
      writeFileSync(sf, JSON.stringify(strictifySchema(schema)));
      args.push('--output-schema', sf);
    }
    args.push(prompt);

    // read-only 沙箱：约束的是**这个 codex 子进程**（即模型在 agent 调用里可能生成并执行的
    // 命令），使 workflow 红线①（propose-only / 绝不编辑行为面文件）在**模型侧**成为不可能。
    // 【边界，别高估】它**不**约束 workflow 脚本本身——脚本经 AsyncFunction 跑在 runner 的
    // node 进程里，不在任何沙箱内，理论上仍能读写磁盘。对脚本自身而言 propose-only 依旧是
    // 纸面约定（与 Claude Code 侧同等），沙箱只堵住了模型生成命令这条更危险的路径。
    // （2026-08-04 初版注释把这写成"纸面约定变成沙箱层面的不可能"，是夸大，已改正。）
    const p = spawn('codex', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    p.stderr.on('data', (d) => { stderr += String(d).slice(0, 2000); });
    const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch { } }, TIMEOUT_MS);

    const done = (val, why) => {
      clearTimeout(timer);
      if (val) { agentOk++; } else { agentFail++; process.stderr.write(`   ⚠ agent#${id} 失败(${why})——按契约返回 null 交给 workflow 降级\n`); }
      resolveP(val);
    };
    p.on('error', () => done(null, 'spawn 失败'));
    p.on('close', (code) => {
      if (/not supported when using Codex with a ChatGPT account/.test(stderr)) return done(null, '模型不可用/订阅');
      // 失败原因必须可见：agent 失败是**静默 falsy**（契约要求），若再把 stderr 吞掉，
      // 症状就只剩"产出莫名变空"。2026-08-05 的 schema BLOCKER 正因此难以归因——
      // 从摘要里提取 API 报错关键句，让下一次一眼可辨。
      if (code !== 0) {
        const api = (stderr.match(/"message":\s*"([^"]{0,200})/) || [])[1];
        return done(null, `exit=${code}${api ? ' | ' + api : ''}`);
      }
      try {
        const raw = readFileSync(outFile, 'utf8').trim();
        const m = raw.match(/\{[\s\S]*\}/);           // 容忍模型在 JSON 前后加话
        return done(m ? JSON.parse(m[0]) : null, m ? 'ok' : '无 JSON');
      } catch { return done(null, '读回失败'); }
    });
  });
}

// ── 注入给 workflow 的 4 个 API ────────────────────────────────────────────
let currentPhase = '';
const phase = (t) => { currentPhase = t; process.stderr.write(`\n▶ Phase: ${t}\n`); };
const log = (...a) => process.stderr.write(`   ${a.join(' ')}\n`);

const agent = async (prompt, opts = {}) => {
  const ph = opts.phase || currentPhase;
  process.stderr.write(`   · agent ${opts.label || '(unlabeled)'} [effort=${effortFor(ph)}]\n`);
  if (DRY) return null;                       // dry-run：不真调模型，走全 null 路径验降级
  return runCodex(prompt, opts.schema, ph);
};

// 顺序保持 + 并发节流；任一 thunk 抛错都收敛成 null（契约：失败是 falsy 不是异常）
const parallel = async (thunks) => {
  const list = Array.from(thunks || []);
  const out = new Array(list.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= list.length) return;
      try { out[i] = await list[i](); } catch { out[i] = null; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, list.length) }, worker));
  return out;
};

// ── 执行 ───────────────────────────────────────────────────────────────────
// workflow 脚本是 ESM 形态（`export const meta = {...}`）却带顶层 return —— 它本就不是
// 独立可运行的模块，而是被 runtime 包进函数体执行的**片段**。放进 AsyncFunction 前须剥掉
// 顶层 export 关键字（函数体内 `export` 是 SyntaxError）。只锚行首 + 限定声明关键字，
// 避免误伤字符串/注释里的 "export" 字样。
// 注意：不得把 meta 作为注入参数名 —— 脚本体内自己 `const meta = {...}`，同名会重复声明报错。
const src = readFileSync(WF, 'utf8')
  .replace(/^export\s+default\s+/gm, 'const __wf_default = ')
  .replace(/^export\s+(?=(const|let|var|function|async\s+function)\s)/gm, '');
const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
let result = null, failed = null;
try {
  const fn = new AsyncFunction('agent', 'phase', 'parallel', 'log', 'args', src);
  result = await fn(agent, phase, parallel, log, ARGS_JSON);
} catch (e) {
  failed = e && e.message ? e.message : String(e);
}
try { rmSync(tmp, { recursive: true, force: true }); } catch { }

process.stderr.write(`\n── runner: agent ok=${agentOk} fail=${agentFail}${DRY ? ' (dry-run)' : ''} ──\n`);
if (failed) { process.stderr.write(`workflow 执行异常: ${failed}\n`); process.exit(1); }
process.stdout.write(JSON.stringify(result ?? null, null, 2) + '\n');
