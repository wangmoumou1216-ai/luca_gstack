#!/usr/bin/env node
// Codex ↔ Claude Code hook 适配层。
//
// 【2026-08-05 深审重写 — 初版四个 BLOCKER 全部经一手证据证实并修正】
// 初版把 Codex 当成"协议相似但方言不同"的 harness，翻译了本不需要翻译的动词，且关键证据取自
// 一个 OPEN 的 GitHub issue 而非实际运行的二进制。实测（codex-cli 0.146.0，本会话期间自动从
// 0.133.0 升级）逐条推翻：
//
//  B1 【2026-08-06 二次推翻——上一轮的结论本身是错的】曾判「仓库级 hooks.json 根本不被加载」，
//     依据是 `.codex/`/`.agents/`/`.claude/` × trust/bypass 的"穷尽矩阵"全不触发。
//     真相：**每一格都因同一个原因失败**——hooks.json 顶层只接受 `description` 与 `hooks`，
//     而我写了个 `_comment` 键，整份文件被拒（`unknown field _comment`），警告只在会话启动时
//     一闪而过。改名后 `hooks/list` 立刻从 7 条变 13 条（user 7 + **project 6**）。
//     ⇒ 仓库级完全可用，配置随版本控制走，**不需要**全局注册，也就没有跨项目污染。
//     `inRepo` 守卫因此从"必需"降级为纵深防御（万一将来又被全局注册，它仍挡得住）。
//  B2 `process.stdout.write` 后立刻 `process.exit()` 会丢弃未落 OS 管道的数据（macOS 64KiB）。
//     实测 200000 字节 → 对端只收到 65536。大 payload（往 docs/ 写报告/原型时的 updatedInput）
//     恰在最需要控制动词时被截断成非法 JSON。⇒ 改用 process.exitCode，让 Node 自然退出。
//  B3 Stop 的 `decision:block` **不需要翻译**。运行中二进制内含校验串
//     "Stop hook returned decision:block without a non-empty reason" 与
//     "Stop hook requested continuation without a prompt; ignoring the block"
//     ——Codex 与 CC 同字段同语义（block = 别停、这是继续的提示词）。
//     初版译成 `continue:false`（=终止本轮）是**语义反转**：自成长捕获不再发生，用户回合还被杀掉。
//  B4 `updatedInput` **受支持**，不是被拒绝。二进制校验串
//     "PreToolUse hook returned updatedInput without permissionDecision:allow" 说明它是一等字段，
//     只是必须与 permissionDecision:allow 同发。初版据 openai/codex#18491（针对旧版本、且仍 OPEN）
//     降级为 deny，把 project-scope-guard 的**正常重定向路径**变成硬拒绝，比 fail-open 更糟。
//
// 【职责】只做三件必要的事，能不翻译就不翻译：
//  1. 仓库自守（B1 的必然要求）
//  2. 入向 tool_name 归一化：shell→Bash；apply_patch 保留原生事件名，严格解析 control
//     headers 后逐 target 合成 Write，Post 复用同一冻结 inventory。
//  3. 出向**最小**适配：updatedInput 补 allow；裸文本包 additionalContext（仅限支持该字段的事件）。
//
// 一般适配失败 fail-open 但留 stderr；apply_patch parser/inventory/lease 失败必须 fail-closed。
//
// 用法：node codex-hook-adapter.mjs <hook脚本绝对路径>

import { spawnSync } from 'child_process';
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { createHash, randomUUID } from 'crypto';
import { dirname, resolve, relative, isAbsolute, join, sep } from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const diag = (m) => { try { process.stderr.write(`[codex-adapter] ${m}\n`); } catch { } };

// 【tool_name 实测（2026-08-05，matcher='.*' 抓真实载荷）】
//   shell 执行  → tool_name='Bash'      tool_input={command}
//   文件编辑    → tool_name='apply_patch' tool_input={command}   ← **不是 file_path**
// 两个都用 `command` 装载，这决定了映射必须**按目标 hook 分流**，而不是全局一张表：
// apply_patch 不进入别名表：adapter 对严格解析出的每个 control-header target 合成一次
// synthetic Write。正文永远不交给 scope guard，Post 也只消费 Pre 冻结的 inventory。
const TOOL_ALIAS_BY_HOOK = [
  { match: /project-scope-guard/, map: { shell: 'Bash', local_shell: 'Bash' } },
  { match: /post-edit/,           map: { shell: 'Bash', local_shell: 'Bash' } },
];
const DEFAULT_TOOL_MAP = { shell: 'Bash', local_shell: 'Bash' };   // Bash 本就是 CC 名，无需改写
function aliasFor(targetPath) {
  const hit = TOOL_ALIAS_BY_HOOK.find((e) => e.match.test(targetPath || ''));
  return hit ? hit.map : DEFAULT_TOOL_MAP;
}

// 哪些事件的输出 schema 含 additionalContext。Stop 的 schema 是 additionalProperties:false
// 且**没有** hookSpecificOutput —— 往 Stop 塞它会被判 "invalid stop hook JSON output"。
// 全量支持 additionalContext 的是 5 个事件；SubagentStart 当前未注册，先列上以免将来注册时漏配。
const SUPPORTS_ADDITIONAL_CONTEXT = new Set([
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'SubagentStart',
]);

// 本 adapter 由仓库级 `.codex/hooks.json` 注册并随仓库版本化；不应复制到用户级全局配置。
// inRepo 仍作为纵深防御：即便未来误被全局注册，也只在本仓范围内工作、其它项目静默放行。
// 2026-08-05 评审：macOS 默认卷**大小写不敏感**，而 relative() 大小写敏感 ——
// 从 `/…/muse/LUCAGSTACK/` 进来时 rel=`../LUCAGSTACK` → 判不在仓内 → **人明明在仓内，
// 6 个 hook 全部静默跳过**（项目隔离/路由/自成长捕获同时消失）且零线索。
// 故先用 realpath 归一（解符号链接与大小写），失败再退回大小写不敏感比较。
function inRepo(cwd) {
  const norm = (p) => {
    try { return realpathSync(p); } catch { return resolve(p); }
  };
  try {
    const root = norm(REPO_ROOT);
    const here = norm(cwd || process.cwd());
    let rel = relative(root, here);
    if (rel !== '' && (rel.startsWith('..') || isAbsolute(rel))) {
      // 退路：大小写不敏感再判一次（realpath 在不存在的路径上不生效）
      rel = relative(root.toLowerCase(), here.toLowerCase());
    }
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
  } catch { return false; }
}

// 出向适配：**默认原样透传**，只做两处必要修补。
function adapt(text, event) {
  let obj = null;
  try { obj = JSON.parse(text); } catch { /* 非 JSON = 纯文本 */ }

  // 纯文本（route-guard / session-restore 的提示）→ additionalContext。
  // 仅限支持该字段的事件；Stop 不支持，塞了会被判非法输出，宁可丢弃并留诊断。
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    if (!SUPPORTS_ADDITIONAL_CONTEXT.has(event)) {
      diag(`${event || '(未知事件)'} 不支持 additionalContext，已丢弃非结构化 hook 输出`);
      return null;
    }
    return { hookSpecificOutput: { hookEventName: event, additionalContext: text } };
  }

  // decision:block —— **刻意不翻译**。Codex 与 CC 同字段同语义（见文件头 B3）。

  const hso = obj.hookSpecificOutput;
  if (hso && typeof hso === 'object' && hso.updatedInput) {
    // updatedInput 受支持，但必须与 permissionDecision:allow 同发（见文件头 B4）
    return {
      ...obj,
      hookSpecificOutput: {
        ...hso,
        hookEventName: hso.hookEventName || 'PreToolUse',
        permissionDecision: hso.permissionDecision || 'allow',
      },
    };
  }
  return obj;
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
let patchModulesPromise = null;
const PATCH_STATE_KEYS = [
  'schema_version',
  'session_id',
  'source_hash',
  'transformed_hash',
  'non_header_hash',
  'non_path_hash',
  'targets',
  'span_map',
  'lease_handles',
  'created_at',
  'state_hash',
];

function patchStateMaterial(state) {
  return {
    schema_version: state.schema_version,
    session_id: state.session_id,
    source_hash: state.source_hash,
    transformed_hash: state.transformed_hash,
    non_header_hash: state.non_header_hash,
    non_path_hash: state.non_path_hash,
    targets: state.targets,
    span_map: state.span_map,
    lease_handles: state.lease_handles,
    created_at: state.created_at,
  };
}

function sealPatchState(state) {
  const material = patchStateMaterial(state);
  return { ...material, state_hash: sha256(Buffer.from(JSON.stringify(material), 'utf8')) };
}

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function validSpan(value) {
  return exactKeys(value, ['start', 'end'])
    && Number.isSafeInteger(value.start) && Number.isSafeInteger(value.end)
    && value.start >= 0 && value.end > value.start;
}

// Patch-critical modules are loaded lazily and inside the patch lane. If one is
// missing or malformed, patches fail closed while Bash and read-only hooks keep
// working; a top-level import crash would incorrectly fail-open every hook.
function loadPatchModules() {
  if (!patchModulesPromise) {
    patchModulesPromise = Promise.all([
      import('./lib/patch-targets.mjs'),
      import('../.claude/hooks/lib/project-write-lease.mjs'),
      import('../.claude/hooks/lib/project-substrate.mjs'),
    ]).then(([parser, lease, substrate]) => ({ parser, lease, substrate }));
  }
  return patchModulesPromise;
}

function patchSessionId(value) {
  const raw = String(value || '');
  if (!/^[A-Za-z0-9_-]{1,36}$/.test(raw)) throw new Error('a valid session_id is required');
  return raw;
}

function patchStatePath(sessionId) {
  const sid = patchSessionId(sessionId);
  const dir = resolve(process.env.LUCA_PATCH_STATE_DIR || join(REPO_ROOT, '.claude'));
  return join(dir, `.codex-patch-contract-${sid}.json`);
}

function fsyncDirectory(path) {
  const fd = openSync(path, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function writePatchState(path, state) {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  const body = Buffer.from(`${JSON.stringify(sealPatchState(state))}\n`);
  const temp = `${path}.tmp-${process.pid}-${randomUUID()}`;
  let fd = null;
  let claimFd = null;
  let claimed = false;
  try {
    fd = openSync(temp, 'wx', 0o600);
    writeFileSync(fd, body);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
    // The zero-byte claim makes state ownership exclusive for this session.
    // rename then publishes complete bytes atomically over our own claim.
    claimFd = openSync(path, 'wx', 0o600);
    closeSync(claimFd);
    claimFd = null;
    claimed = true;
    renameSync(temp, path);
    claimed = false;
    fsyncDirectory(dir);
  } catch (error) {
    if (fd !== null) try { closeSync(fd); } catch { }
    if (claimFd !== null) try { closeSync(claimFd); } catch { }
    try { unlinkSync(temp); } catch { }
    // We remove only the exact empty claim made by this call. Any replacement
    // or partial residue remains visible and fail-closed for manual recovery.
    if (claimed) {
      try {
        const raw = readFileSync(path);
        if (raw.length === 0) unlinkSync(path);
      } catch { }
    }
    throw error;
  }
}

function readPatchState(path, sessionId) {
  const raw = readFileSync(path);
  const state = JSON.parse(raw.toString('utf8'));
  if (!exactKeys(state, PATCH_STATE_KEYS)
      || state?.schema_version !== 1 || state.session_id !== patchSessionId(sessionId)
      || !/^[a-f0-9]{64}$/.test(String(state.source_hash || ''))
      || !/^[a-f0-9]{64}$/.test(String(state.transformed_hash || ''))
      || !/^[a-f0-9]{64}$/.test(String(state.non_header_hash || ''))
      || !/^[a-f0-9]{64}$/.test(String(state.non_path_hash || ''))
      || !/^[a-f0-9]{64}$/.test(String(state.state_hash || ''))
      || !Array.isArray(state.targets) || !state.targets.length
      || !Array.isArray(state.span_map) || state.span_map.length !== state.targets.length
      || !Array.isArray(state.lease_handles)
      || typeof state.created_at !== 'string' || Number.isNaN(Date.parse(state.created_at))) {
    throw new Error('patch state is malformed');
  }
  if (sha256(Buffer.from(JSON.stringify(patchStateMaterial(state)), 'utf8')) !== state.state_hash) {
    throw new Error('patch state integrity hash mismatch');
  }
  let sourceCursor = 0;
  let outputCursor = 0;
  for (let index = 0; index < state.targets.length; index += 1) {
    const item = state.targets[index];
    const span = state.span_map[index];
    if (!exactKeys(item, ['index', 'operation', 'source_path', 'output_path', 'guard_generated_absolute'])
        || item.index !== index || !['add', 'update', 'delete'].includes(item.operation)
        || typeof item.source_path !== 'string' || !item.source_path
        || typeof item.output_path !== 'string' || !item.output_path
        || typeof item.guard_generated_absolute !== 'boolean'
        || item.guard_generated_absolute !== isAbsolute(item.output_path)
        || !exactKeys(span, ['index', 'source', 'output', 'source_path', 'output_path'])
        || span.index !== index || span.source_path !== item.source_path
        || span.output_path !== item.output_path || !validSpan(span.source) || !validSpan(span.output)
        || span.source.start < sourceCursor || span.output.start < outputCursor) {
      throw new Error('patch state target/span inventory is malformed');
    }
    sourceCursor = span.source.end;
    outputCursor = span.output.end;
  }
  return { raw, state };
}

function removePatchState(path, expectedRaw, expectedHash) {
  const parked = `${path}.release-${randomUUID()}`;
  renameSync(path, parked);
  const parkedRaw = readFileSync(parked);
  if (!parkedRaw.equals(expectedRaw)) {
    throw new Error(`patch state changed during release; preserved at ${parked}`);
  }
  const state = JSON.parse(parkedRaw.toString('utf8'));
  if (state.transformed_hash !== expectedHash) {
    throw new Error(`patch state hash changed during release; preserved at ${parked}`);
  }
  unlinkSync(parked);
  fsyncDirectory(dirname(path));
}

function spawnHook(target, payload, childEnv) {
  return spawnSync('node', [target], {
    input: JSON.stringify(payload), env: childEnv, encoding: 'utf8',
    timeout: 30000, cwd: REPO_ROOT, maxBuffer: 64 * 1024 * 1024,
  });
}

function hookJson(result) {
  const text = String(result?.stdout || '').trim();
  if (!text) return null;
  try { return JSON.parse(text); }
  catch { throw new Error(`target guard returned non-JSON control output: ${text.slice(0, 120)}`); }
}

function emitPatchDeny(reason) {
  const detail = String(reason || 'unknown patch contract failure').replace(/[\r\n]+/g, ' ').slice(0, 1200);
  process.stdout.write(`${JSON.stringify({ hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: `Codex patch contract denied this patch: ${detail}. Correct the reported control-header or exact state/lease condition, then retry apply_patch; Bash and read-only inspection remain available.`,
  } })}\n`);
  // Structured PreToolUse denial is the control channel. Exit 0 prevents the
  // wrapper from replacing this useful reason with a generic exit-2 error.
  return 0;
}

function inside(candidate, root) {
  const rel = relative(root, candidate);
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel));
}

function projectTarget(outputPath, projectsRoot) {
  if (!isAbsolute(outputPath)) return null;
  if (resolve(outputPath) !== outputPath || outputPath.includes('\\')) {
    throw new Error('guard-generated target is not a canonical absolute path');
  }
  const declaredRoot = resolve(projectsRoot);
  const physicalRoot = realpathSync(declaredRoot);
  let rel = relative(physicalRoot, outputPath);
  if (!inside(outputPath, physicalRoot)) {
    if (!inside(outputPath, declaredRoot)) throw new Error('guard-generated absolute target is outside PROJECTS_ROOT');
    rel = relative(declaredRoot, outputPath);
  }
  const parts = rel.split(sep);
  if (parts.length < 2 || parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error('guard-generated project target is malformed');
  }
  return {
    project: parts[0],
    projects_root: physicalRoot,
    target: join(physicalRoot, ...parts),
  };
}

function globalProjectLeaseActive() {
  return existsSync(join(REPO_ROOT, '.claude', '.project-switch.lock'));
}

function releaseWriteLeases(handles, leaseModule) {
  const errors = [];
  for (const handle of [...handles].reverse()) {
    try {
      const result = leaseModule.releaseProjectWriteLease(handle);
      if (!result?.released) errors.push('project write lease did not report logical release');
      if (result?.cleanup_required) {
        errors.push(`released lease requires exact cleanup at ${result.parked_path}: ${result.reason}`);
      }
    }
    catch (error) { errors.push(String(error?.message || error)); }
  }
  if (errors.length) throw new Error(`project write lease release failed: ${errors.join('; ')}`);
}

async function handlePatchPreTool(target, data, childEnv) {
  let modules;
  try { modules = await loadPatchModules(); }
  catch (error) { return emitPatchDeny(`patch safety module unavailable (${error?.message || error})`); }

  let parsed;
  try { parsed = modules.parser.parsePatchTargets(data?.tool_input?.command); }
  catch (error) { return emitPatchDeny(error?.message || error); }

  const replacements = [];
  const decisions = [];
  for (const item of parsed.targets) {
    const payload = {
      ...data,
      tool_name: 'Write',
      tool_input: { file_path: item.path, __luca_patch_header_target: true },
    };
    const result = spawnHook(target, payload, childEnv);
    if (result?.stderr) process.stderr.write(result.stderr);
    let output;
    try { output = hookJson(result); }
    catch (error) { return emitPatchDeny(error.message); }
    const hso = output?.hookSpecificOutput || {};
    if (hso.permissionDecision === 'deny' || result?.status === 2) {
      return emitPatchDeny(hso.permissionDecisionReason || `target guard denied ${item.path}`);
    }
    if (!result || result.error || (result.status !== 0 && result.status !== null)) {
      return emitPatchDeny(`target guard failed for ${item.path}`);
    }
    const redirected = hso.updatedInput?.file_path;
    if (redirected !== undefined && (typeof redirected !== 'string' || !redirected || !isAbsolute(redirected))) {
      return emitPatchDeny(`target guard returned a non-canonical redirect for ${item.path}`);
    }
    const outputPath = redirected || item.path;
    replacements.push(outputPath);
    decisions.push({
      index: item.index,
      operation: item.operation,
      source_path: item.path,
      output_path: outputPath,
      guard_generated_absolute: Boolean(redirected),
    });
  }

  let rewritten;
  try { rewritten = modules.parser.rewritePatchTargets(parsed, replacements); }
  catch (error) { return emitPatchDeny(error?.message || error); }

  const leases = [];
  try {
    const groups = new Map();
    for (const outputPath of replacements) {
      const scoped = projectTarget(outputPath, modules.substrate.PROJECTS_ROOT);
      if (!scoped) continue;
      const group = groups.get(scoped.project) || { ...scoped, targets: [] };
      group.targets.push(scoped.target);
      groups.set(scoped.project, group);
    }
    const ownerToken = modules.lease.ownerTokenForPatch(data.session_id, parsed.source_hash);
    for (const [project, group] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
      if (globalProjectLeaseActive()) throw new Error('a project switch transaction is active');
      const acquired = modules.lease.acquireProjectWriteLease({
        targetPaths: group.targets,
        patchHash: rewritten.output_hash,
        ownerToken,
        projectsRoot: group.projects_root,
      });
      leases.push(acquired.owner_handle);
      if (acquired.owner_handle?.owner?.project !== project) throw new Error('write lease project identity mismatch');
      // Lock order is global→project for switch and check-global→project→recheck-global
      // for patch. This second check closes the only acquisition race.
      if (globalProjectLeaseActive()) throw new Error('a project switch transaction raced patch lease acquisition');
    }
    const statePath = patchStatePath(data.session_id);
    writePatchState(statePath, {
      schema_version: 1,
      session_id: patchSessionId(data.session_id),
      source_hash: parsed.source_hash,
      transformed_hash: rewritten.output_hash,
      non_header_hash: parsed.non_header_hash,
      non_path_hash: parsed.non_path_hash,
      targets: decisions,
      span_map: rewritten.span_map,
      lease_handles: leases,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    try { releaseWriteLeases(leases, modules.lease); }
    catch (releaseError) { return emitPatchDeny(`${error?.message || error}; ${releaseError.message}`); }
    return emitPatchDeny(error?.message || error);
  }

  process.stdout.write(`${JSON.stringify({ hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'allow',
    updatedInput: { ...(data.tool_input || {}), command: rewritten.output.toString('utf8') },
  } })}\n`);
  return 0;
}

function postEventFailed(data) {
  const response = data?.tool_response ?? data?.tool_result;
  return Boolean(data?.tool_error || data?.error
    || response?.success === false || response?.is_error === true || response?.isError === true);
}

async function handlePatchPostTool(target, data, childEnv) {
  let modules;
  try { modules = await loadPatchModules(); }
  catch (error) { diag(`patch safety module unavailable during PostToolUse: ${error?.message || error}`); return 2; }

  let statePath;
  let raw;
  let state;
  try {
    statePath = patchStatePath(data.session_id);
    ({ raw, state } = readPatchState(statePath, data.session_id));
    const command = Buffer.from(String(data?.tool_input?.command || ''), 'utf8');
    const commandHash = sha256(command);
    if (commandHash !== state.source_hash && commandHash !== state.transformed_hash) {
      throw new Error('PostToolUse patch bytes do not match the PreToolUse inventory');
    }
    for (const handle of state.lease_handles) modules.lease.assertProjectWriteLease(handle);
  } catch (error) {
    diag(`patch PostToolUse inventory verification failed: ${error?.message || error}`);
    return 2;
  }

  let firstOutput = '';
  let postError = null;
  if (!postEventFailed(data)) {
    for (const item of state.targets) {
      const payload = {
        ...data,
        tool_name: 'Write',
        tool_input: { ...(data.tool_input || {}), file_path: item.output_path },
      };
      const result = spawnHook(target, payload, childEnv);
      if (result?.stderr) process.stderr.write(result.stderr);
      if (!result || result.error || (result.status !== 0 && result.status !== null)) {
        postError = new Error(`post-edit failed for frozen target ${item.output_path}`);
        break;
      }
      if (!firstOutput && String(result.stdout || '').trim()) firstOutput = String(result.stdout).trim();
    }
  }

  try {
    for (const handle of state.lease_handles) modules.lease.assertProjectWriteLease(handle);
    releaseWriteLeases(state.lease_handles, modules.lease);
    removePatchState(statePath, raw, state.transformed_hash);
  } catch (error) {
    diag(`patch PostToolUse lease/state cleanup failed: ${error?.message || error}`);
    return 2;
  }
  if (postError) { diag(postError.message); return 2; }
  if (firstOutput) {
    const payload = adapt(firstOutput, data.hook_event_name || 'PostToolUse');
    if (payload !== null) process.stdout.write(`${JSON.stringify(payload)}\n`);
  }
  return 0;
}

// ── 主流程（全程 process.exitCode，绝不用 process.exit —— 见 B2）──────────────
async function main() {
  const target = process.argv[2];
  if (!target) { diag('缺少目标 hook 路径参数'); return 0; }

  let raw = '';
  try { raw = readFileSync(0, 'utf8'); } catch (e) {
    // EAGAIN（非阻塞 stdin）等：如实报告，不假装读到了空输入
    diag(`读取 stdin 失败(${(e && e.code) || e})——放行，hook 未执行`); return 0;
  }

  let data;
  try { data = JSON.parse(raw || '{}'); } catch {
    // 初版在此静默降级成 {} 并照常执行 hook —— 等于用空 payload 骗过守卫
    diag('stdin 不是合法 JSON——放行且不执行 hook（不以空 payload 冒充真实输入）'); return 0;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) { diag('stdin JSON 不是对象——放行'); return 0; }

  if (!inRepo(data.cwd)) {
    // 本行曾是全文件**唯一**不打诊断的失败路径，与文件头「失败一律 fail-open 但留 stderr 诊断」
    // 自相矛盾：一旦 inRepo 误判（如大小写），现象是"6 个 hook 集体静默消失"且事后零线索。
    diag(`cwd 不在本仓范围内，放行不处理（cwd=${data.cwd || '(未提供)'} repo=${REPO_ROOT}）`);
    return 0;
  }

  const event = data.hook_event_name || '';
  const origToolName = data.tool_name;
  // 【2026-08-06 深审修正：原写法是死代码】原注释称"Codex 的 SessionStart 无 source 字段"，
  // 实测**为假**——schema 里 source 是 required，实捕载荷为 `source:"startup"`。
  // 于是 `!data.source` 恒 false、兜底永不执行，session-restore 拿到 startup 直落 doClear()，
  // **每次 codex exec 都按冷启动清三条软链**。本轮实跑没清掉纯属侥幸（并行 session 侦测兜住了），
  // 作者想要的"未知 source → 保守保留 + canary"从未生效。
  // 改为**无条件映射**：codex exec 是一次性脚本调用，把它当"全新工作会话"去翻软链，
  // 比交互式冷启动激进得多；且风险不对称（误清不可逆、误保留可 switch 恢复），故取保守侧。
  if (event === 'SessionStart') data.source = 'codex-start';

  const childEnv = { ...process.env };
  // REPO_ROOT 由本文件自身路径推得，永远正确；继承来的同名变量可能指向别的仓库
  // （例如从 Claude Code 的 shell 里启动 codex），必须以本值为准。
  childEnv.CLAUDE_PROJECT_DIR = REPO_ROOT;
  childEnv.LUCA_ACTUAL_HARNESS = 'codex';   // 真实 CLI 身份（detectHarness 回答的是"按哪套协议输出"）
  childEnv.LUCA_HARNESS_ADAPTED = '1';

  // apply_patch remains a native event. Pre parses and freezes target inventory;
  // Post consumes exactly that state and never scans the body again.
  if (origToolName === 'apply_patch' && event === 'PreToolUse' && /project-scope-guard/.test(target)) {
    try { return await handlePatchPreTool(target, data, childEnv); }
    catch (error) { return emitPatchDeny(`unexpected patch preflight failure (${error?.message || error})`); }
  }
  if (origToolName === 'apply_patch' && event === 'PostToolUse' && /post-edit/.test(target)) {
    try { return await handlePatchPostTool(target, data, childEnv); }
    catch (error) { diag(`unexpected patch PostToolUse failure: ${error?.message || error}`); return 2; }
  }

  const alias = aliasFor(target);
  if (data.tool_name && alias[data.tool_name]) data.tool_name = alias[data.tool_name];

  let r;
  try {
    r = spawnSync('node', [target], {
      input: JSON.stringify(data), env: childEnv, encoding: 'utf8',
      timeout: 30000, cwd: REPO_ROOT,
      maxBuffer: 64 * 1024 * 1024,   // 默认 1MiB 会让大 payload 的控制动词整个消失
    });
  } catch (e) { diag(`spawn 异常(${(e && e.message) || e})——放行`); return 0; }
  if (!r) { diag('spawnSync 无返回——放行'); return 0; }

  if (r.stderr) process.stderr.write(r.stderr);
  // 初版这些失败全部静默 exit 0，事后无从排查
  if (r.error) {
    diag(`hook 执行失败(${r.error.code || r.error.message})`
      + (r.error.code === 'ETIMEDOUT' ? '——30s 超时，控制动词已丢失' : ''));
  }

  const out = String(r.stdout || '').trim();
  if (out) {
    const payload = adapt(out, event);
    if (payload !== null) {
      try { process.stdout.write(JSON.stringify(payload) + '\n'); }
      catch (e) { diag(`输出序列化失败(${(e && e.message) || e})`); }
    }
  }
  return r.status === 2 ? 2 : 0;
}

process.exitCode = await main();
