// 项目基座单一裁决 helper（P2 / FIX-2，2026-07-24；2026-07-25 深审加固）。
// 与 py 孪生 memory/scripts/_project.py **同算法**（parity 由 scripts/test-project-substrate.mjs 保证）。
//
// FIX-2：4 个 marker-parser 站点（route-guard / session-restore / session-sync / append_episode）
// 原本语义不一（route-guard 多段 slice+endsWith 兜底、其余首段正则），嵌套路径下 cross-hook
// 项目身份分裂。统一为**单一 canonical 裁决**。
//
// 深审加固（2026-07-25）：
//  · 段校验 fail-closed：任一段为 '' / '.' / '..' → 返回 ''（实证旧行为可让写入逃出 projects 根）。
//  · PROJECTS_ROOT 归一化：去尾斜杠（带斜杠曾让 4 站全部静默解析失败）；非绝对路径的 override
//    忽略并告警（相对根会随各 hook 的 cwd 漂移 = 重新制造分裂）。
//  · 恢复 endsWith 兜底（旧 route-guard 的第二通路，被 FIX-2 首版误删）。
//  · marker 用 **first**（indexOf/find）与被替换的旧实现语义一致，不做静默反转。
//  · listProjects 接受 projectsRoot 形参；软链目录判定与 py `Path.is_dir()`（跟随）对齐。
import {
  lstatSync,
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { dirname, join, isAbsolute, relative, resolve } from 'path';
import { homedir, tmpdir } from 'os';
import { createHash, randomUUID } from 'crypto';
import {
  attestNativeUserEvent,
  captureNativeEventFence,
  MAX_NATIVE_PROMPT_BYTES,
  observeCurrentNativeEvent,
} from './event-attestation.mjs';
import { readProjectReservation } from './project-selection.mjs';

const DEFAULT_ROOT = join(homedir(), 'Desktop', '项目');
function normRoot(p) {
  const s = String(p || '').replace(/\/+$/, '');
  return s || DEFAULT_ROOT;
}
// LUCA_PROJECTS_ROOT 覆盖（cloud/异机）；非绝对路径忽略（会随 cwd 漂移→跨 hook 分裂）
export const PROJECTS_ROOT = (() => {
  const ov = process.env.LUCA_PROJECTS_ROOT;
  if (!ov) return normRoot(DEFAULT_ROOT);
  if (!isAbsolute(ov)) {
    try { process.stderr.write(`[project-substrate] LUCA_PROJECTS_ROOT=${ov} 非绝对路径（会随 cwd 漂移）→忽略，用默认根\n`); } catch { }
    return normRoot(DEFAULT_ROOT);
  }
  return normRoot(ov);
})();

// PROJECTS_ROOT 直接子目录名（均单段）。Host view 可请求同一次枚举的排除原因；
// 默认返回值保持旧数组合同。
export function listProjects(projectsRoot = PROJECTS_ROOT, options = {}) {
  try {
    const projects = [];
    const excluded = [];
    for (const d of readdirSync(projectsRoot, { withFileTypes: true })) {
      if (d.name.startsWith('.')) continue;
      if (d.isSymbolicLink() && options.realDirectoriesOnly) {
        excluded.push({ project: d.name, code: 'SYMLINK' });
        continue;
      }
      let directory = d.isDirectory();
      if (d.isSymbolicLink()) {
        try { directory = statSync(join(projectsRoot, d.name)).isDirectory(); }
        catch { directory = false; }
      }
      if (!directory) {
        if (options.withExcluded) excluded.push({ project: d.name, code: 'NOT_DIRECTORY' });
        continue;
      }
      let reservation;
      try { reservation = readProjectReservation(projectsRoot, d.name).value; }
      catch {
        if (options.withExcluded) excluded.push({ project: d.name, code: 'INVALID_RESERVATION' });
        continue;
      }
      if (reservation && !['READY', 'COMMITTED'].includes(reservation.phase)) {
        if (options.withExcluded) excluded.push({ project: d.name, code: 'NOT_READY' });
        continue;
      }
      projects.push(d.name);
    }
    return options.withExcluded ? { projects, excluded } : projects;
  } catch (error) {
    if (options.strictErrors) throw error;
    return options.withExcluded ? { projects: [], excluded: [] } : [];
  }
}

// docs 软链 target → 规范项目名。opts.projects / opts.projectsRoot 可覆盖（测试与 route-guard 用）。
export function projectNameFromLink(target, opts = {}) {
  if (!target) return '';
  const projectsRoot = normRoot(opts.projectsRoot || PROJECTS_ROOT);
  const projects = opts.projects || listProjects(projectsRoot);
  const raw = String(target);
  const path = raw.replace(/\/docs\/?$/, ''); // strip 尾部 /docs（含尾斜杠）
  let rest = null;
  if (path === projectsRoot) {
    return '';
  } else if (path.startsWith(projectsRoot + '/')) {
    rest = path.slice(projectsRoot.length + 1);
  } else {
    // legacy/相对软链：用**第一个** marker（与被替换的旧实现 indexOf/正则语义一致）
    for (const mk of ['/项目/', 'Desktop/项目/']) {
      const idx = path.indexOf(mk);
      if (idx >= 0) { rest = path.slice(idx + mk.length); break; }
    }
  }
  if (rest == null) {
    // 兜底：已知项目名后缀匹配（旧 route-guard 的第二通路；根外/同级相对链仍可解析）
    const hit = projects.find((name) => name && !name.includes('/') && raw.endsWith(`/${name}/docs`));
    return hit || '';
  }
  const segs = rest.split('/');
  // fail-closed 段校验：空段 / '.' / '..' 一律拒绝（防路径穿越——实证可让写入逃出 projects 根）
  if (segs.some((s) => s === '' || s === '.' || s === '..')) return '';
  if (segs.length === 0) return '';
  // known-projects 最长前缀匹配（合约；生产中 listProjects 恒单段 ⇒ 等价首段）
  for (let n = segs.length; n >= 1; n--) {
    const cand = segs.slice(0, n).join('/');
    if (projects.includes(cand)) return cand;
  }
  return segs[0]; // 无 known 前缀（新项目/列表读失败）→ 回退首段
}

export const PROJECT_STATE_SCHEMA = 3;
export const NATIVE_RELEASE_DIRECTIVE = '解除本会话项目绑定，恢复 NO_PIN';
const READABLE_PROJECT_STATE_SCHEMAS = new Set([2, PROJECT_STATE_SCHEMA]);
export const PROJECT_STATES = new Set(['NO_PIN', 'BOUND', 'SWITCH_ONLY', 'TURN_ACTIVE', 'TURN_CLOSED']);
export const PROJECT_EVENT_CANDIDATE_LIMIT = 32;
// The ledger never evicts entries. Once full, the session must rotate instead
// of making an old native event replayable again.
export const PROJECT_EVENT_HISTORY_LIMIT = 256;

export function sanitizeSessionId(value) {
  return String(value || '').replace(/[^\w-]/g, '').slice(0, 36);
}

export function validateProjectName(value) {
  const name = String(value || '');
  if (!name || name === '.' || name === '..' || name.includes('/') || name.includes('\\') || name.startsWith('.')) {
    throw new Error(`invalid canonical project id: ${name || '(empty)'}`);
  }
  return name;
}

export function canonicalProjectIdentity(project, projectsRoot = PROJECTS_ROOT) {
  const name = validateProjectName(project);
  const root = realpathSync(resolve(projectsRoot));
  const candidate = join(root, name);
  const lst = lstatSync(candidate);
  if (lst.isSymbolicLink() || !lst.isDirectory()) throw new Error(`project identity must be a real directory: ${name}`);
  const reservation = readProjectReservation(root, name).value;
  if (reservation && !['READY', 'COMMITTED'].includes(reservation.phase)) {
    throw new Error(`project identity is not READY: ${name}`);
  }
  const real = realpathSync(candidate);
  if (dirname(real) !== root || relative(root, real) !== name) throw new Error(`project identity escaped canonical root: ${name}`);
  const st = statSync(real);
  return { project: name, realpath: real, dev: Number(st.dev), ino: Number(st.ino) };
}

export function verifyProjectBinding(binding, projectsRoot = PROJECTS_ROOT) {
  if (!binding || !Number.isSafeInteger(binding.epoch) || binding.epoch < 1) throw new Error('binding epoch is invalid');
  const now = canonicalProjectIdentity(binding.project, projectsRoot);
  for (const field of ['project', 'realpath', 'dev', 'ino']) {
    if (now[field] !== binding[field]) throw new Error(`project identity changed at ${field}`);
  }
  return true;
}

export function projectStatePath(gstackRoot, sessionId) {
  const sid = sanitizeSessionId(sessionId);
  if (!sid) throw new Error('session id required');
  return join(realpathSync(resolve(gstackRoot)), '.claude', `.session-project-${sid}`);
}

function readOptionalBytes(path) {
  try { return readFileSync(path); }
  catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function stateLockOwnerBytes(owner) {
  return Buffer.from(`${JSON.stringify(owner)}\n`);
}

function validStateLockOwner(owner) {
  return Boolean(owner?.schema_version === 1
    && typeof owner.owner_token === 'string' && owner.owner_token
    && Number.isSafeInteger(owner.pid) && owner.pid > 0
    && typeof owner.process_nonce === 'string' && owner.process_nonce);
}

function sameStateLockOwner(a, b) {
  return validStateLockOwner(a) && validStateLockOwner(b)
    && a.owner_token === b.owner_token
    && a.pid === b.pid
    && a.process_nonce === b.process_nonce
    && a.acquired_at === b.acquired_at;
}

function stateLockOwnerAlive(owner) {
  if (!validStateLockOwner(owner)) throw new Error('project state lock owner is malformed');
  try { process.kill(owner.pid, 0); return true; }
  catch (error) {
    if (error?.code === 'ESRCH') return false;
    if (error?.code === 'EPERM') return true;
    throw new Error(`project state lock owner liveness is unknown (${error?.code || error})`);
  }
}

export function inspectProjectStateLock(gstackRoot, sessionId) {
  const lock = `${projectStatePath(gstackRoot, sessionId)}.lock`;
  const raw = readOptionalBytes(lock);
  if (raw === null) return { occupied: false, lock };
  let owner;
  try { owner = JSON.parse(raw.toString('utf8')); }
  catch { throw new Error(`project state lock is malformed: ${lock}`); }
  if (!validStateLockOwner(owner) || !raw.equals(stateLockOwnerBytes(owner))) {
    throw new Error(`project state lock owner record is not canonical: ${lock}`);
  }
  return { occupied: true, owner_alive: stateLockOwnerAlive(owner), owner_handle: { lock, owner } };
}

export function recoverProjectStateLock(gstackRoot, sessionId, ownerHandle) {
  const lock = `${projectStatePath(gstackRoot, sessionId)}.lock`;
  if (!ownerHandle || ownerHandle.lock !== lock || !validStateLockOwner(ownerHandle.owner)) {
    throw new Error('complete exact project state lock owner handle required');
  }
  const raw = readFileSync(lock);
  let current;
  try { current = JSON.parse(raw.toString('utf8')); }
  catch { throw new Error(`project state lock is malformed: ${lock}`); }
  if (!sameStateLockOwner(current, ownerHandle.owner) || !raw.equals(stateLockOwnerBytes(ownerHandle.owner))) {
    throw new Error('project state lock owner handle mismatch');
  }
  if (stateLockOwnerAlive(current)) throw new Error(`refusing to recover live project state lock pid=${current.pid}`);
  const parked = `${lock}.manual-recovery-${current.process_nonce}-${randomUUID()}`;
  renameSync(lock, parked);
  const parkedRaw = readFileSync(parked);
  if (!parkedRaw.equals(raw)) throw new Error(`project state lock changed during manual recovery: ${parked}`);
  unlinkSync(parked);
  const parentFd = openSync(dirname(lock), 'r');
  try { fsyncSync(parentFd); } finally { closeSync(parentFd); }
  return { recovered: true, owner_handle: ownerHandle };
}

function atomicWriteBytes(path, body, prefix) {
  const parent = dirname(path);
  const realParent = realpathSync(parent);
  if (realParent !== parent) throw new Error('project state parent must be canonical real directory');
  const tmp = join(realParent, `.${prefix}-${process.pid}-${randomUUID()}`);
  let fd = null;
  let published = false;
  try {
    fd = openSync(tmp, 'wx', 0o600);
    writeFileSync(fd, body);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
    if (process.env.LUCA_PROJECT_STATE_WRITE_FAULT === 'before-rename') {
      throw new Error('injected project state write fault before-rename');
    }
    renameSync(tmp, path);
    published = true;
    try {
      if (process.env.LUCA_PROJECT_STATE_WRITE_FAULT === 'after-rename') {
        throw new Error('injected project state write fault after-rename');
      }
      const dirFd = openSync(realParent, 'r');
      try { fsyncSync(dirFd); } finally { closeSync(dirFd); }
      const readback = readFileSync(path);
      if (!readback.equals(body)) throw new Error('project state atomic write readback mismatch');
    } catch (error) {
      // rename is the publication commit point. Reporting failure after it can
      // make callers roll back links while the new state is already visible.
      process.stderr.write(`[project-substrate] ⚠️ state bytes 已原子发布，后置持久化/读回检查失败；禁止重试操作：${path} — ${String(error?.message || error)}\n`);
    }
  } catch (error) {
    if (fd !== null) try { closeSync(fd); } catch { }
    if (!published) try { unlinkSync(tmp); } catch { }
    if (published) {
      process.stderr.write(`[project-substrate] ⚠️ state bytes 已发布但后置异常；禁止重试操作：${path} — ${String(error?.message || error)}\n`);
      return;
    }
    throw error;
  }
}

// Contention is not broken identity. Wait only for live owners, never reclaim
// by age. Partial owner publication can be observed between open and write.
function waitForProjectStateUnlock(gstackRoot, sessionId, deadline = performance.now() + 1000) {
  const sleeper = new Int32Array(new SharedArrayBuffer(4));
  let inspectionError = null;
  for (;;) {
    if (performance.now() >= deadline) {
      if (inspectionError) {
        throw new ProjectEventAuthorityError('STATE_LOCK_INVALID', String(inspectionError.message));
      }
      throw new ProjectEventAuthorityError('STATE_LOCK_BUSY', 'project state lock is busy; retry after the active operation completes');
    }
    let held;
    try { held = inspectProjectStateLock(gstackRoot, sessionId); inspectionError = null; }
    catch (error) {
      inspectionError = error;
      if (performance.now() >= deadline) {
        throw new ProjectEventAuthorityError('STATE_LOCK_INVALID', String(error.message));
      }
    }
    if (held && !held.occupied) return;
    if (held?.owner_alive === false) {
      throw new ProjectEventAuthorityError('STATE_LOCK_ORPHANED',
        `project state lock exists; manual recovery required: ${held.owner_handle.lock}`);
    }
    Atomics.wait(sleeper, 0, 0, 10);
  }
}

function withProjectStateLock(gstackRoot, sessionId, work) {
  const statePath = projectStatePath(gstackRoot, sessionId);
  const lockPath = `${statePath}.lock`;
  const record = {
    schema_version: 1,
    owner_token: randomUUID(),
    pid: process.pid,
    process_nonce: randomUUID(),
    acquired_at: new Date().toISOString(),
  };
  const bytes = stateLockOwnerBytes(record);
  let fd = null;
  const deadline = performance.now() + 1000;
  try {
    for (;;) {
      try { fd = openSync(lockPath, 'wx', 0o600); break; }
      catch (error) {
        if (error?.code !== 'EEXIST') throw error;
        waitForProjectStateUnlock(gstackRoot, sessionId, deadline);
      }
    }
    writeFileSync(fd, bytes);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
  } catch (error) {
    if (fd !== null) {
      try { closeSync(fd); } catch { }
      try { unlinkSync(lockPath); } catch { }
    }
    throw error;
  }
  let completed = false;
  let primaryError = null;
  try {
    const result = work();
    completed = true;
    return result;
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    // Exact owner readback both before and after rename: an old owner cannot
    // release a replacement lock. Crash residue is never stolen by age.
    try {
      const current = readFileSync(lockPath);
      if (!current.equals(bytes)) throw new Error(`project state lock owner changed; manual recovery required: ${lockPath}`);
      if (process.env.LUCA_PROJECT_STATE_LOCK_FAULT === 'before-release') {
        throw new Error('injected project state lock fault before-release');
      }
      const parked = `${lockPath}.release-${record.process_nonce}`;
      renameSync(lockPath, parked);
      try {
        const parkedBytes = readFileSync(parked);
        if (!parkedBytes.equals(bytes)) throw new Error(`project state lock changed during release: ${parked}`);
        if (process.env.LUCA_PROJECT_STATE_LOCK_FAULT === 'after-release-rename') {
          throw new Error('injected project state lock fault after-release-rename');
        }
        unlinkSync(parked);
        const parentFd = openSync(dirname(statePath), 'r');
        try { fsyncSync(parentFd); } finally { closeSync(parentFd); }
      } catch (error) {
        // The canonical lock name is already absent, so serialization has been
        // released. Leave the exact parked residue visible, but do not turn a
        // completed state operation into an apparent failure.
        process.stderr.write(`[project-substrate] ⚠️ state lock 已释放但残留清理失败（不应重试操作）：${parked} — ${String(error?.message || error)}\n`);
      }
    } catch (error) {
      const handle = JSON.stringify({ lock: lockPath, owner: record });
      if (completed) {
        process.stderr.write(`[project-substrate] ⚠️ state 操作已提交但锁释放失败；禁止重试，进程退出后用 inspect-state-lock → recover-state-lock 精确恢复。owner_handle=${handle} error=${String(error?.message || error)}\n`);
      } else {
        process.stderr.write(`[project-substrate] ⚠️ state 操作未提交且锁释放失败；进程退出后需精确恢复。owner_handle=${handle} error=${String(error?.message || error)}\n`);
        if (!primaryError) throw error;
      }
    }
  }
}

export function readProjectState(gstackRoot, sessionId, projectsRoot = PROJECTS_ROOT) {
  const path = projectStatePath(gstackRoot, sessionId);
  const sid = sanitizeSessionId(sessionId);
  const raw = readOptionalBytes(path);
  if (raw === null) return {
    path,
    raw: null,
    value: {
      schema_version: PROJECT_STATE_SCHEMA,
      state: 'NO_PIN',
      session_id: sid,
      event_control: { candidates: [], current: null, cursor: null, consumed_events: [] },
    },
  };
  let value;
  try { value = JSON.parse(raw.toString('utf8')); }
  catch {
    const project = parseLegacyProjectPin(raw);
    throw new Error(`legacy project pin requires explicit migration: session=${sid} project=${project}`);
  }
  if (!READABLE_PROJECT_STATE_SCHEMAS.has(value?.schema_version) || !PROJECT_STATES.has(value?.state)) throw new Error('invalid project state schema');
  if (value.session_id !== sid) throw new Error('project state session mismatch');
  return { path, raw, value };
}

function projectStateFromBytes(raw, sid) {
  if (raw === null) return {
    schema_version: PROJECT_STATE_SCHEMA,
    state: 'NO_PIN',
    session_id: sid,
    event_control: { candidates: [], current: null, cursor: null, consumed_events: [] },
  };
  let value;
  try { value = JSON.parse(raw.toString('utf8')); }
  catch { throw new Error('project state is malformed'); }
  if (!READABLE_PROJECT_STATE_SCHEMAS.has(value?.schema_version) || !PROJECT_STATES.has(value?.state)) {
    throw new Error('invalid project state schema');
  }
  if (value.session_id !== sid) throw new Error('project state session mismatch');
  return value;
}

export class ProjectEventAuthorityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProjectEventAuthorityError';
    this.code = code;
  }
}

function validPromptIntegrity(integrity) {
  if (integrity?.encoding !== 'utf-8' || typeof integrity.bytes_base64 !== 'string'
      || !Number.isSafeInteger(integrity.byte_length) || integrity.byte_length < 0
      || integrity.byte_length > MAX_NATIVE_PROMPT_BYTES
      || !/^[0-9a-f]{64}$/.test(String(integrity.sha256 || ''))
      || integrity.bytes_base64.length > Math.ceil(MAX_NATIVE_PROMPT_BYTES / 3) * 4 + 4) return false;
  const bytes = Buffer.from(integrity.bytes_base64, 'base64');
  return bytes.toString('base64') === integrity.bytes_base64
    && bytes.length === integrity.byte_length
    && createHash('sha256').update(bytes).digest('hex') === integrity.sha256;
}

function validEventCursor(cursor) {
  return Boolean(cursor?.schema_version === 1
    && ['claude', 'codex'].includes(cursor.harness)
    && isAbsolute(String(cursor.transcript_path || ''))
    && /^\d+$/.test(String(cursor.dev || ''))
    && /^\d+$/.test(String(cursor.ino || ''))
    && Number.isSafeInteger(cursor.byte_offset) && cursor.byte_offset >= 0
    && Number.isSafeInteger(cursor.record_index) && cursor.record_index >= 0
    && /^[0-9a-f]{64}$/.test(String(cursor.prefix_sha256 || '')));
}

function validNativeEventRecord(item, sessionId) {
  if (!item || !['claude', 'codex'].includes(item.harness)
      || !new RegExp(`^${item.harness}:[0-9a-f]{64}$`).test(String(item.event_id || ''))
      || !String(item.boundary_id || '') || !String(item.native_id || '')) return false;
  if (item.harness === 'codex' ? !String(item.anchor_id || '') : item.anchor_id != null) return false;
  if (item.stop_witness_id != null) {
    const validWitness = item.harness === 'codex'
      ? /^msg_[\w-]+$/.test(String(item.stop_witness_id))
      : /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(item.stop_witness_id));
    if (!validWitness) return false;
  }
  return item.event_id === expectedNativeEventId({ harness: item.harness, session_id: sessionId }, item);
}

function eventControlFromState(value) {
  if (value?.schema_version !== PROJECT_STATE_SCHEMA) {
    return { candidates: [], current: null, cursor: null, consumed_events: [] };
  }
  if (!value.event_control) {
    throw new ProjectEventAuthorityError('STATE_SCHEMA', 'schema-v3 project state lacks event control');
  }
  const control = value.event_control;
  if (control.fence != null && !(control.fence.schema_version === 1
      && control.fence.session_id === value.session_id
      && ['claude', 'codex'].includes(control.fence.harness)
      && isAbsolute(String(control.fence.cwd || ''))
      && (control.fence.source_absent === true ? control.fence.cursor === null
        : control.fence.source_absent === false && validEventCursor(control.fence.cursor)))) {
    throw new ProjectEventAuthorityError('STATE_SCHEMA', 'native startup fence schema is invalid');
  }
  if (!Array.isArray(control.candidates) || !Array.isArray(control.consumed_events)) {
    throw new ProjectEventAuthorityError('STATE_SCHEMA', 'project event control schema is invalid');
  }
  if (control.candidates.length > PROJECT_EVENT_CANDIDATE_LIMIT
      || control.consumed_events.length > PROJECT_EVENT_HISTORY_LIMIT) {
    throw new ProjectEventAuthorityError('STATE_SCHEMA', 'project event control exceeds its durable bounds');
  }
  for (const candidate of control.candidates) {
    if (candidate?.schema_version !== 1 || candidate.session_id !== value.session_id
        || !String(candidate.boundary_id || '') || !isAbsolute(String(candidate.cwd || ''))
        || !['claude', 'codex'].includes(candidate.harness)
        || (candidate.harness === 'claude' && candidate.boundary_id !== candidate.session_id)
        || !validPromptIntegrity(candidate.prompt_integrity)
        || !candidate.intent || typeof candidate.intent !== 'object' || Array.isArray(candidate.intent)) {
      throw new ProjectEventAuthorityError('STATE_SCHEMA', 'project event candidate schema is invalid');
    }
  }
  if (control.cursor != null && !validEventCursor(control.cursor)) {
    throw new ProjectEventAuthorityError('STATE_SCHEMA', 'project event cursor schema is invalid');
  }
  if (control.current && (!validNativeEventRecord(control.current, value.session_id)
      || !String(control.current.boundary_id || '') || !isAbsolute(String(control.current.cwd || ''))
      || !['claude', 'codex'].includes(control.current.harness)
      || !['active', 'closed'].includes(control.current.status))) {
    throw new ProjectEventAuthorityError('STATE_SCHEMA', 'current project event schema is invalid');
  }
  const seenEvents = new Set();
  for (const item of control.consumed_events) {
    if (!validNativeEventRecord(item, value.session_id) || seenEvents.has(item.event_id)) {
      throw new ProjectEventAuthorityError('STATE_SCHEMA', 'project event ledger schema is invalid');
    }
    seenEvents.add(item.event_id);
  }
  if ((control.current || control.consumed_events.length > 0) && !validEventCursor(control.cursor)) {
    throw new ProjectEventAuthorityError('STATE_SCHEMA', 'attested project event state lacks a durable cursor');
  }
  if (control.current) {
    const ledger = control.consumed_events.find(item => item.event_id === control.current.event_id);
    if (!ledger || ledger.boundary_id !== control.current.boundary_id
        || ledger.harness !== control.current.harness || ledger.native_id !== control.current.native_id
        || ledger.anchor_id !== control.current.anchor_id
        || control.cursor.harness !== control.current.harness) {
      throw new ProjectEventAuthorityError('STATE_SCHEMA', 'current project event is not bound to its ledger and cursor');
    }
  }
  const harnesses = new Set([
    ...control.candidates.map(item => item.harness),
    ...control.consumed_events.map(item => item.harness),
    ...(control.current ? [control.current.harness] : []),
    ...(control.fence ? [control.fence.harness] : []),
  ]);
  if (harnesses.size > 1) throw new ProjectEventAuthorityError('STATE_SCHEMA', 'project event state mixes native harnesses');
  return {
    candidates: control.candidates,
    current: control.current || null,
    cursor: control.cursor || null,
    consumed_events: control.consumed_events,
    ...(control.fence ? { fence: control.fence } : {}),
  };
}

function priorClosedState(current, binding, control) {
  if (!binding) return { state: 'NO_PIN' };
  const prior = control.current;
  if (prior?.event_id && prior?.boundary_id) {
    return {
      state: 'TURN_CLOSED',
      binding,
      turn: {
        event_id: prior.event_id,
        boundary_id: prior.boundary_id,
        epoch: binding.epoch,
        outcome: 'next-user-prompt',
      },
    };
  }
  const legacy = current.state === 'BOUND' ? current.terminal
    : current.state === 'SWITCH_ONLY' ? current.switch : current.turn;
  return {
    state: 'TURN_CLOSED',
    binding,
    turn: {
      turn_id: String(legacy?.turn_id || 'legacy-event-unavailable'),
      epoch: binding.epoch,
      outcome: 'next-user-prompt',
    },
  };
}

function selectionAfterEventChange(selection, binding, nextEventId, reason) {
  if (!selection?.pending || selection.pending.event_id === nextEventId) return selection || null;
  const pending = selection.pending;
  const expired = {
    operation_id: pending.tx,
    kind: pending.operation,
    target: pending.target,
    status: 'EXPIRED_OR_UNKNOWN',
    created: Boolean(pending.created),
    bound: false,
    commit_id: null,
    expected_epoch: pending.expected_epoch,
    binding_epoch: binding?.epoch || null,
    committed_at: null,
    error_code: reason,
    ...(pending.phase ? { phase: pending.phase } : {}),
  };
  return compactSelectionHistory({
    ...selection,
    pending: null,
    receipts: [...(Array.isArray(selection.receipts) ? selection.receipts : []), expired],
    latest_operation: expired,
  });
}

function compactSelectionHistory(selection) {
  if (!selection) return null;
  const receipts = Array.isArray(selection.receipts) ? selection.receipts : [];
  const unresolvedCreation = item => item?.kind === 'new'
    && ['RUNNING', 'CREATING', 'OWNERSHIP_UNKNOWN', 'EXPIRED_OR_UNKNOWN'].includes(item?.status);
  const unresolved = receipts.filter(unresolvedCreation);
  const recentTerminal = receipts.filter(item => !unresolvedCreation(item)).slice(-16);
  const keep = new Set([...unresolved, ...recentTerminal]);
  return { ...selection, receipts: receipts.filter(item => keep.has(item)) };
}

// UserPromptSubmit records only an unattested candidate. In particular,
// boundary_id is transport provenance, never a consumed event identity.
export function queueProjectEventCandidate({
  gstackRoot,
  projectsRoot = PROJECTS_ROOT,
  sessionId,
  boundaryId,
  cwd,
  harness,
  prompt,
  promptId = '',
  intent,
}) {
  const sid = sanitizeSessionId(sessionId);
  const boundary = String(boundaryId || '');
  const candidateCwd = String(cwd || '');
  const candidateHarness = String(harness || '');
  const exactPrompt = String(prompt ?? '');
  if (!boundary || boundary.length > 256 || /[\u0000-\u001f\u007f]/.test(boundary)) {
    throw new Error('boundary id is missing or invalid');
  }
  if (!isAbsolute(candidateCwd) || /[\u0000\r\n]/.test(candidateCwd)) throw new Error('candidate cwd is missing or invalid');
  if (!['claude', 'codex'].includes(candidateHarness)) throw new Error('candidate harness is missing or invalid');
  if (candidateHarness === 'claude' && boundary !== sid) throw new Error('Claude boundary must equal the native session id');
  if (promptId && (String(promptId).length > 256 || /[\u0000-\u001f\u007f]/.test(String(promptId)))) {
    throw new Error('prompt id is invalid');
  }
  const normalizedIntent = JSON.parse(JSON.stringify(intent ?? null));
  if (!normalizedIntent || typeof normalizedIntent !== 'object' || Array.isArray(normalizedIntent)) {
    throw new Error('candidate intent is missing or invalid');
  }
  const promptBytes = Buffer.from(exactPrompt, 'utf8');
  if (promptBytes.length > MAX_NATIVE_PROMPT_BYTES) {
    throw new Error(`native prompt exceeds ${MAX_NATIVE_PROMPT_BYTES} bytes`);
  }
  const candidate = {
    schema_version: 1,
    session_id: sid,
    boundary_id: boundary,
    cwd: candidateCwd,
    harness: candidateHarness,
    ...(promptId ? { prompt_id: String(promptId) } : {}),
    prompt_integrity: {
      encoding: 'utf-8',
      bytes_base64: promptBytes.toString('base64'),
      byte_length: promptBytes.length,
      sha256: createHash('sha256').update(promptBytes).digest('hex'),
    },
    intent: normalizedIntent,
  };

  return withProjectStateLock(gstackRoot, sid, () => {
    const path = projectStatePath(gstackRoot, sid);
    const current = projectStateFromBytes(readOptionalBytes(path), sid);
    const binding = validatedBindingForState(current, projectsRoot);
    const control = eventControlFromState(current);
    const closed = priorClosedState(current, binding, control);
    const next = {
      schema_version: PROJECT_STATE_SCHEMA,
      state: closed.state,
      session_id: sid,
      ...(closed.binding ? { binding: closed.binding, turn: closed.turn } : {}),
      ...(current.selection ? { selection: current.selection } : {}),
      event_control: {
        // Candidates are untrusted hints, not an event ledger. Keep admission live
        // under synthetic floods without advancing the cursor or consuming events.
        // An evicted human candidate may leave an orphan; only explicit deactivate
        // recovery can fence it out, never this bounded queue operation.
        candidates: [...control.candidates, candidate].slice(-PROJECT_EVENT_CANDIDATE_LIMIT),
        current: control.current ? { ...control.current, status: 'closed' } : null,
        cursor: control.cursor,
        consumed_events: control.consumed_events,
        ...(control.fence ? { fence: control.fence } : {}),
      },
    };
    const body = Buffer.from(`${JSON.stringify(next)}\n`);
    atomicWriteBytes(path, body, 'project-event-candidate');
    return next;
  });
}

// Only the pre-input startup/resume lifecycle may establish this fence. A
// prompt or tool call cannot repair missing authority from the transcript tail.
export function initializeProjectEventFence({
  gstackRoot, projectsRoot = PROJECTS_ROOT, sessionId, harness, cwd,
  transcriptPath = '', codexHome = '',
}) {
  const sid = sanitizeSessionId(sessionId);
  return withProjectStateLock(gstackRoot, sid, () => {
    const path = projectStatePath(gstackRoot, sid);
    const state = projectStateFromBytes(readOptionalBytes(path), sid);
    const control = eventControlFromState(state);
    if (control.cursor || control.fence) return state;
    const binding = validatedBindingForState(state, projectsRoot);
    const fence = captureNativeEventFence({
      sessionId: sid, harness, cwd, transcriptPath, codexHome,
      allowTestSourceRoot: allowFixtureSourceOverride(gstackRoot, transcriptPath, codexHome),
    });
    const closed = priorClosedState(state, binding, control);
    const next = {
      schema_version: PROJECT_STATE_SCHEMA, session_id: sid, ...closed,
      ...(state.selection ? { selection: state.selection } : {}),
      event_control: { candidates: [], current: null, cursor: fence.cursor,
        consumed_events: [], fence },
    };
    validatedBindingForState(next, projectsRoot);
    atomicWriteBytes(path, Buffer.from(`${JSON.stringify(next)}\n`), 'project-event-fence');
    return next;
  });
}

// Deactivating must not strand the session. Only the pre-input SessionStart lifecycle
// mints a fence, so a deactivate that deletes the state leaves a session that can never
// attest again — not even to switch — and the only escape is restarting the process.
// Instead the binding is dropped and the fence is rebuilt at the current source tail.
// Every already-flushed native event now sits behind a cursor bound to the source's
// identity and prefix hash and cannot attest again. An unflushed pending human row
// can still arrive after this fence; NO_PIN therefore supports the same explicit
// downgrade again after that row is visible. This is recovery, not automatic orphan
// skipping, and no discarded switch intent survives it. The cursor prevents replay, so the
// consumed-event ledger is reset rather than carried forward: carrying it would keep an
// exhausted ledger (PROJECT_EVENT_HISTORY_LIMIT) exhausted and leave a long session
// locked. This only ever removes authority: new authority still requires a genuine human
// turn after the rebuilt fence, so a caller gains nothing by invoking it. Returns null
// when there is no fence to rebuild from, and throws — publishing nothing — when the
// source cannot be re-fenced.
export function refenceProjectStateForDeactivate({
  gstackRoot, sessionId, expectedRaw, codexHome = '',
}) {
  const sid = sanitizeSessionId(sessionId);
  return withProjectStateLock(gstackRoot, sid, () => {
    const path = projectStatePath(gstackRoot, sid);
    const raw = readOptionalBytes(path);
    if (!raw || !Buffer.isBuffer(expectedRaw) || !raw.equals(expectedRaw)) {
      throw new Error('project state re-fence CAS mismatch');
    }
    const state = projectStateFromBytes(raw, sid);
    const control = eventControlFromState(state);
    if (!control.fence) return null;
    const transcriptPath = control.fence.harness === 'claude'
      ? String(control.cursor?.transcript_path || control.fence.cursor?.transcript_path || '') : '';
    const fence = captureNativeEventFence({
      sessionId: sid, harness: control.fence.harness, cwd: control.fence.cwd, transcriptPath, codexHome,
      allowTestSourceRoot: allowFixtureSourceOverride(gstackRoot, transcriptPath, codexHome),
      recoveryCursor: control.cursor || control.fence.cursor,
    });
    if (fence.source_absent) {
      throw new ProjectEventAuthorityError('SOURCE_NOT_VISIBLE',
        'deactivate cannot rebuild the native fence because the session source is not visible');
    }
    const next = {
      schema_version: PROJECT_STATE_SCHEMA, session_id: sid, state: 'NO_PIN',
      ...(state.selection ? { selection: state.selection } : {}),
      event_control: { candidates: [], current: null, cursor: fence.cursor,
        consumed_events: [], fence },
    };
    atomicWriteBytes(path, Buffer.from(`${JSON.stringify(next)}\n`), 'project-state-refence');
    return next;
  });
}

// A failed prompt admission can leave genuine native user turns after an
// active cursor, with no queued candidates. An explicit
// recovery may remove the stale authority, but only after the source proves
// that the current event has been superseded. This never attests the orphans.
export function inspectOrphanedActiveProjectEvent({
  gstackRoot, projectsRoot = PROJECTS_ROOT, sessionId, codexHome = '',
}) {
  const sid = sanitizeSessionId(sessionId);
  const snapshot = readProjectState(gstackRoot, sid);
  const state = snapshot.value;
  const control = eventControlFromState(state);
  if (state.schema_version !== PROJECT_STATE_SCHEMA || state.state !== 'TURN_ACTIVE'
      || control.candidates.length !== 0 || control.current?.status !== 'active'
      || !control.fence || state.turn?.event_id !== control.current.event_id
      || state.turn?.boundary_id !== control.current.boundary_id
      || !validatedBindingForState(state, projectsRoot)) {
    throw new ProjectEventAuthorityError('RECOVERY_INVALID', 'only a superseded attested active binding can be recovered');
  }
  const transcriptPath = control.current.harness === 'claude' ? control.cursor.transcript_path : '';
  try {
    observeCurrentNativeEvent({
      event: control.current, sessionId: sid, cursor: control.cursor,
      transcriptPath, codexHome, observation: 'pre-tool',
      allowTestSourceRoot: allowFixtureSourceOverride(gstackRoot, transcriptPath, codexHome),
    });
  } catch (error) {
    if (error?.code === 'INTERVENING_USER') return snapshot;
    throw error;
  }
  throw new ProjectEventAuthorityError('RECOVERY_INVALID', 'current native event is still fresh; refusing to remove its authority');
}

function validateObservationContext({ sessionId, boundaryId, cwd }) {
  const sid = sanitizeSessionId(sessionId);
  const boundary = String(boundaryId || '');
  const workingDirectory = String(cwd || '');
  if (!sid) throw new ProjectEventAuthorityError('SESSION_MISMATCH', 'session id is missing');
  if (!boundary) throw new ProjectEventAuthorityError('BOUNDARY_MISMATCH', 'boundary id is missing');
  if (!isAbsolute(workingDirectory)) throw new ProjectEventAuthorityError('CWD_MISMATCH', 'cwd is missing or non-absolute');
  return { sid, boundary, workingDirectory };
}

function currentMatchesObservation(current, boundary, cwd) {
  return current?.boundary_id === boundary && current?.cwd === cwd;
}

function eventIdPart(value) {
  const bytes = Buffer.from(String(value), 'utf8');
  return Buffer.concat([Buffer.from(`${bytes.length}:`, 'ascii'), bytes]);
}

function expectedNativeEventId(candidate, evidence) {
  const hash = createHash('sha256');
  const domain = `luca-native-event:v1:${candidate.harness}`;
  const values = candidate.harness === 'codex'
    ? [domain, candidate.session_id, evidence.native_id, evidence.anchor_id]
    : [domain, candidate.session_id, evidence.native_id];
  for (const value of values) hash.update(eventIdPart(value));
  return `${candidate.harness}:${hash.digest('hex')}`;
}

function validateAttestedEvidence(candidate, evidence, boundary) {
  if (!evidence?.event_id || evidence.event_id === boundary
      || !String(evidence.native_id || '') || evidence.boundary_id !== boundary
      || !evidence.cursor_after || evidence.cursor_after.schema_version !== 1
      || evidence.cursor_after.harness !== candidate.harness
      || !isAbsolute(String(evidence.cursor_after.transcript_path || ''))
      || !/^\d+$/.test(String(evidence.cursor_after.dev || ''))
      || !/^\d+$/.test(String(evidence.cursor_after.ino || ''))
      || !Number.isSafeInteger(evidence.cursor_after.byte_offset) || evidence.cursor_after.byte_offset < 0
      || !Number.isSafeInteger(evidence.cursor_after.record_index) || evidence.cursor_after.record_index < 0
      || !/^[0-9a-f]{64}$/.test(String(evidence.cursor_after.prefix_sha256 || ''))
      || (candidate.harness === 'codex' && !String(evidence.anchor_id || ''))
      || (candidate.harness === 'claude' && evidence.anchor_id != null)
      || !['codex', 'claude'].includes(candidate.harness)
      || evidence.event_id !== expectedNativeEventId(candidate, evidence)) {
    throw new ProjectEventAuthorityError('UNATTESTED_IDENTITY', 'attester did not return verified native event evidence');
  }
}

function insidePath(candidate, root) {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function allowFixtureSourceOverride(gstackRoot, transcriptPath, codexHome) {
  if (process.env.LUCA_EVENT_ATTESTATION_TEST !== '1') return false;
  try {
    const tempRoot = realpathSync(resolve(tmpdir()));
    const gstack = realpathSync(resolve(gstackRoot));
    const parent = dirname(gstack);
    const fixtureRoot = parent === tempRoot ? gstack : parent;
    if (!insidePath(fixtureRoot, tempRoot) || fixtureRoot === tempRoot) return false;
    const explicit = transcriptPath ? realpathSync(resolve(transcriptPath))
      : codexHome ? realpathSync(resolve(codexHome)) : '';
    return Boolean(explicit && insidePath(explicit, fixtureRoot));
  } catch { return false; }
}

// Publication requires the state lock. Re-observation of an already attested
// event is pure: optimistic byte readback avoids read/read contention and leaves
// no lock behind if the harness cancels a parallel tool. A writer on either side
// of the observation must finish, and any changed snapshot revokes this result.
export function attestPendingProjectEvent({
  gstackRoot,
  projectsRoot = PROJECTS_ROOT,
  sessionId,
  boundaryId,
  cwd,
  observation = 'pre-tool',
  transcriptPath = '',
  codexHome = '',
  assistantText = '',
}) {
  const { sid, boundary, workingDirectory } = validateObservationContext({ sessionId, boundaryId, cwd });
  if (!['pre-tool', 'stop'].includes(observation)) {
    throw new ProjectEventAuthorityError('OBSERVATION_INVALID', 'observation must be pre-tool or stop');
  }
  if (observation === 'pre-tool') {
    waitForProjectStateUnlock(gstackRoot, sid);
    const path = projectStatePath(gstackRoot, sid);
    const raw = readOptionalBytes(path);
    const state = projectStateFromBytes(raw, sid);
    const control = eventControlFromState(state);
    if (control.candidates.length === 0 && control.current?.status === 'active'
        && currentMatchesObservation(control.current, boundary, workingDirectory)) {
      observeCurrentNativeEvent({
        event: control.current, sessionId: sid, cursor: control.cursor,
        transcriptPath, codexHome, observation, assistantText,
        allowTestSourceRoot: allowFixtureSourceOverride(gstackRoot, transcriptPath, codexHome),
        priorEvents: control.consumed_events,
      });
      waitForProjectStateUnlock(gstackRoot, sid);
      const after = readOptionalBytes(path);
      if (!raw || !after || !raw.equals(after)) {
        throw new ProjectEventAuthorityError('STATE_CHANGED', 'project state changed during native observation; retry against the new state');
      }
      return { state, event: control.current, idempotent: true };
    }
  }
  return withProjectStateLock(gstackRoot, sid, () => {
    const path = projectStatePath(gstackRoot, sid);
    const state = projectStateFromBytes(readOptionalBytes(path), sid);
    const control = eventControlFromState(state);
    const allowTestSourceRoot = allowFixtureSourceOverride(gstackRoot, transcriptPath, codexHome);
    if (control.candidates.length === 0) {
      if (control.current?.status === 'active'
          && currentMatchesObservation(control.current, boundary, workingDirectory)) {
        const evidence = observeCurrentNativeEvent({
          event: control.current,
          sessionId: sid,
          cursor: control.cursor,
          transcriptPath,
          codexHome,
          observation,
          assistantText,
          allowTestSourceRoot,
          priorEvents: control.consumed_events,
        });
        if (evidence.stop_witness_id
            && evidence.stop_witness_id !== control.current.stop_witness_id) {
          const next = {
            ...state,
            event_control: {
              ...control,
              current: { ...control.current, stop_witness_id: evidence.stop_witness_id },
            },
          };
          atomicWriteBytes(path, Buffer.from(`${JSON.stringify(next)}\n`), 'project-event-observed');
          return { state: next, event: next.event_control.current, idempotent: true };
        }
        return { state, event: control.current, idempotent: true };
      }
      throw new ProjectEventAuthorityError('NO_PENDING_EVENT', 'no pending native event candidate');
    }
    // Equal bytes in a non-human row cannot disprove a human row still waiting
    // to flush. Keep the final candidate; a later real prompt can safely heal
    // unmatched non-final candidates without guessing their provenance.
    const candidates = control.candidates;
    const candidate = candidates[candidates.length - 1];
    if (candidate.session_id !== sid) throw new ProjectEventAuthorityError('SESSION_MISMATCH', 'candidate session mismatch');
    if (candidate.boundary_id !== boundary) throw new ProjectEventAuthorityError('BOUNDARY_MISMATCH', 'latest candidate boundary mismatch');
    if (candidate.cwd !== workingDirectory) throw new ProjectEventAuthorityError('CWD_MISMATCH', 'latest candidate cwd mismatch');
    if (control.consumed_events.length + candidates.length > PROJECT_EVENT_HISTORY_LIMIT) {
      throw new ProjectEventAuthorityError('EVENT_LEDGER_FULL', `project event history capacity ${PROJECT_EVENT_HISTORY_LIMIT} reached`);
    }
    let cursor = control.cursor;
    const consumed = [...control.consumed_events];
    const events = [];
    // A non-final candidate whose scan meets a different genuine human turn cannot
    // match at this cursor (see `next_native_turn_differs` in event-attestation.mjs).
    // It may still have named an earlier human event; skipping grants nothing. Without this,
    // one harness-synthesised prompt wedges the queue and the session permanently loses
    // project authority. The skip grants nothing: the cursor does not advance, so
    // authority can still only come from the first human event after the cursor
    // matching the final candidate byte for byte. It is also deferred rather than
    // committed — nothing is published until the loop completes, so a queue whose last
    // entry is unwitnessable still fails closed and is retried, and the next real turn
    // makes that entry non-final and heals the queue.
    const unwitnessed = [];
    for (let index = 0; index < candidates.length; index += 1) {
      const pending = candidates[index];
      const final = index === candidates.length - 1;
      let evidence;
      try {
        evidence = attestNativeUserEvent({
          candidate: pending,
          cursor,
          transcriptPath,
          codexHome,
          bootstrapFence: control.fence || null,
          observation: final ? observation : 'pre-tool',
          assistantText: final ? assistantText : '',
          allowTestSourceRoot,
          requireNoFollowingUser: final,
          priorEvents: consumed,
        });
      } catch (error) {
        if (final || error?.details?.next_native_turn_differs !== true) throw error;
        unwitnessed.push({
          boundary_id: pending.boundary_id,
          harness: pending.harness,
          prompt_sha256: pending.prompt_integrity?.sha256 || null,
          reason: 'next-native-turn-differs',
        });
        continue;
      }
      validateAttestedEvidence(pending, evidence, pending.boundary_id);
      if (consumed.some(item => item?.event_id === evidence.event_id)) {
        throw new ProjectEventAuthorityError('EVENT_REPLAY', `native event already consumed: ${evidence.event_id}`);
      }
      const event = {
        event_id: evidence.event_id,
        boundary_id: pending.boundary_id,
        native_id: evidence.native_id,
        anchor_id: evidence.anchor_id || null,
        cwd: pending.cwd,
        harness: pending.harness,
        status: final ? 'active' : 'closed',
        attested_at: new Date().toISOString(),
        ...(!final ? { outcome: 'superseded-before-observation' } : {}),
        ...(evidence.stop_witness_id ? { stop_witness_id: evidence.stop_witness_id } : {}),
      };
      consumed.push({
        event_id: event.event_id,
        boundary_id: event.boundary_id,
        harness: event.harness,
        native_id: event.native_id,
        anchor_id: event.anchor_id,
      });
      events.push(event);
      cursor = evidence.cursor_after;
    }
    const event = events[events.length - 1];
    const binding = validatedBindingForState(state, projectsRoot);
    const selection = selectionAfterEventChange(
      state.selection, binding, event?.event_id || '', 'NATIVE_EVENT_REPLACED_BEFORE_COMMIT',
    );
    const intent = candidate.intent || {};
    if (intent.kind === 'release' && binding) {
      if (!control.fence || !event || event.status !== 'active') {
        throw new ProjectEventAuthorityError('RELEASE_INVALID', 'native release requires a fenced active event');
      }
      const verifyRelease = () => observeCurrentNativeEvent({
        event, sessionId: sid, cursor, transcriptPath, codexHome,
        observation: 'pre-tool', requiredPrompt: NATIVE_RELEASE_DIRECTIVE,
        allowTestSourceRoot, priorEvents: consumed,
      });
      verifyRelease();
      const fence = captureNativeEventFence({
        sessionId: sid, harness: event.harness, cwd: event.cwd, transcriptPath, codexHome,
        allowTestSourceRoot, recoveryCursor: cursor,
      });
      if (fence.source_absent) {
        throw new ProjectEventAuthorityError('SOURCE_NOT_VISIBLE', 'release cannot rebuild the native source fence');
      }
      // A newer human row during capture must not be swallowed by the new cursor.
      // A row after this observation remains beyond the captured fence.
      verifyRelease();
      const released = {
        schema_version: PROJECT_STATE_SCHEMA, state: 'NO_PIN', session_id: sid,
        ...(selection ? { selection } : {}),
        event_control: { candidates: [], current: null, cursor: fence.cursor,
          consumed_events: [], fence },
      };
      if (process.env.LUCA_EVENT_TX_FAULT === 'after-attest-before-publish') {
        throw new ProjectEventAuthorityError('INJECTED_FAULT', 'injected event transaction fault after attestation before publish');
      }
      atomicWriteBytes(path, Buffer.from(`${JSON.stringify(released)}\n`), 'project-event-release');
      return { state: released, event: null, events, unwitnessed, idempotent: false, released: true };
    }
    let materialized;
    if (intent.kind === 'switch' && observation === 'pre-tool') {
      materialized = {
        state: 'SWITCH_ONLY',
        switch: {
          tx: intent.tx,
          operation: intent.operation,
          target: intent.target,
          expected_epoch: intent.expected_epoch,
          binding,
          event_id: event.event_id,
          boundary_id: boundary,
        },
      };
    } else if (binding) {
      materialized = {
        state: 'TURN_ACTIVE',
        binding,
        turn: {
          event_id: event.event_id,
          boundary_id: boundary,
          epoch: binding.epoch,
        },
      };
    } else {
      materialized = { state: 'NO_PIN' };
    }
    const next = {
      schema_version: PROJECT_STATE_SCHEMA,
      state: materialized.state,
      session_id: sid,
      ...(materialized.binding ? { binding: materialized.binding, turn: materialized.turn } : {}),
      ...(materialized.switch ? { switch: materialized.switch } : {}),
      ...(selection ? { selection } : {}),
      event_control: {
        candidates: [],
        current: event,
        cursor,
        consumed_events: consumed,
        ...(control.fence ? { fence: control.fence } : {}),
      },
    };
    if (process.env.LUCA_EVENT_TX_FAULT === 'after-attest-before-publish') {
      throw new ProjectEventAuthorityError('INJECTED_FAULT', 'injected event transaction fault after attestation before publish');
    }
    atomicWriteBytes(path, Buffer.from(`${JSON.stringify(next)}\n`), 'project-event-attested');
    const dropped = unwitnessed;
    for (const item of dropped) {
      process.stderr.write(`[project-substrate] skipped a queued candidate that cannot match at the current native cursor (session ${sid}, ${item.reason}, prompt sha256 ${String(item.prompt_sha256 || '').slice(0, 12)})\n`);
    }
    return { state: next, event, events, unwitnessed: dropped, idempotent: false };
  });
}

export function activeProjectAuthority(value, expected = {}, projectsRoot = PROJECTS_ROOT) {
  if (value?.schema_version !== PROJECT_STATE_SCHEMA || value.state !== 'TURN_ACTIVE') return null;
  const current = eventControlFromState(value).current;
  if (!current || current.status !== 'active') return null;
  if (value.turn?.event_id !== current.event_id || value.turn?.boundary_id !== current.boundary_id) return null;
  if (expected.boundaryId && current.boundary_id !== String(expected.boundaryId)) return null;
  if (expected.eventId && current.event_id !== String(expected.eventId)) return null;
  if (expected.cwd && current.cwd !== String(expected.cwd)) return null;
  const binding = validatedBindingForState(value, projectsRoot);
  return binding ? { binding, event: current } : null;
}

export function closeAttestedProjectEvent({
  gstackRoot,
  projectsRoot = PROJECTS_ROOT,
  sessionId,
  eventId,
  boundaryId,
  outcome = 'stop',
}) {
  const sid = sanitizeSessionId(sessionId);
  const event = String(eventId || '');
  const boundary = String(boundaryId || '');
  if (!sid || !event || !boundary) throw new ProjectEventAuthorityError('EVENT_MISMATCH', 'complete attested event identity required');
  return withProjectStateLock(gstackRoot, sid, () => {
    const path = projectStatePath(gstackRoot, sid);
    const state = projectStateFromBytes(readOptionalBytes(path), sid);
    const control = eventControlFromState(state);
    if (control.current?.event_id !== event || control.current?.boundary_id !== boundary) {
      throw new ProjectEventAuthorityError('EVENT_MISMATCH', 'attested event snapshot changed before close');
    }
    if (control.current.status === 'closed') return state;
    if (control.current.status !== 'active') throw new ProjectEventAuthorityError('EVENT_MISMATCH', 'attested event is not active');
    const snapshot = state.state === 'TURN_ACTIVE' ? state.turn
      : state.state === 'BOUND' ? state.terminal
        : state.state === 'SWITCH_ONLY' ? state.switch
          : state.state === 'NO_PIN' ? control.current : null;
    if (snapshot?.event_id !== event || snapshot?.boundary_id !== boundary) {
      throw new ProjectEventAuthorityError('EVENT_MISMATCH', 'project state snapshot does not match the current native event');
    }
    const binding = ['TURN_ACTIVE', 'BOUND', 'SWITCH_ONLY'].includes(state.state)
      ? validatedBindingForState(state, projectsRoot)
      : null;
    let selection = state.selection || null;
    if (selection?.pending) {
      const pending = selection.pending;
      const expired = {
        operation_id: pending.tx,
        kind: pending.operation,
        target: pending.target,
        status: 'EXPIRED_OR_UNKNOWN',
        created: Boolean(pending.created),
        bound: false,
        commit_id: null,
        expected_epoch: pending.expected_epoch,
        binding_epoch: binding?.epoch || null,
        committed_at: null,
        error_code: 'EVENT_CLOSED_BEFORE_EXECUTION',
        ...(pending.phase ? { phase: pending.phase } : {}),
      };
      selection = {
        ...selection,
        pending: null,
        receipts: [...(Array.isArray(selection.receipts) ? selection.receipts : []), expired],
        latest_operation: expired,
      };
    }
    selection = compactSelectionHistory(selection);
    const next = {
      schema_version: PROJECT_STATE_SCHEMA,
      state: binding ? 'TURN_CLOSED' : 'NO_PIN',
      session_id: sid,
      ...(binding ? {
        binding,
        turn: { event_id: event, boundary_id: boundary, epoch: binding.epoch, outcome: String(outcome || 'stop') },
      } : {}),
      event_control: {
        ...control,
        current: { ...control.current, status: 'closed', outcome: String(outcome || 'stop') },
      },
      ...(selection ? { selection } : {}),
    };
    atomicWriteBytes(path, Buffer.from(`${JSON.stringify(next)}\n`), 'project-event-close');
    return next;
  });
}

function parseLegacyProjectPin(raw) {
  const decoded = raw.toString('utf8');
  const project = decoded.endsWith('\r\n') ? decoded.slice(0, -2)
    : decoded.endsWith('\n') ? decoded.slice(0, -1) : decoded;
  if (!project || project !== project.trim() || /[\u0000-\u001f\u007f]/.test(project)
      || project.startsWith('{') || project.startsWith('[')) {
    throw new Error('legacy or malformed project pin is not a validated project name');
  }
  return validateProjectName(project);
}

export function migrateLegacyProjectState(gstackRoot, sessionId, projectsRoot = PROJECTS_ROOT) {
  const path = projectStatePath(gstackRoot, sessionId);
  const sid = sanitizeSessionId(sessionId);
  const raw = readOptionalBytes(path);
  if (raw === null) throw new Error('legacy project pin is absent');
  try {
    const current = readProjectState(gstackRoot, sid, projectsRoot);
    return { ...current, migrated: false };
  } catch (error) {
    if (!/legacy project pin requires explicit migration/.test(String(error?.message || error))) throw error;
  }
  const project = parseLegacyProjectPin(raw);
  return withProjectStateLock(gstackRoot, sid, () => {
    const currentRaw = readOptionalBytes(path);
    if (!currentRaw?.equals(raw)) throw new Error('legacy project pin changed before explicit migration');
    const identity = canonicalProjectIdentity(project, projectsRoot);
    const next = {
      schema_version: 2,
      state: 'TURN_CLOSED',
      session_id: sid,
      binding: { ...identity, epoch: 1 },
      turn: { turn_id: 'legacy-pin-migration-v2', epoch: 1, outcome: 'legacy-pin-migrated' },
    };
    const body = Buffer.from(`${JSON.stringify(next)}\n`);
    atomicWriteBytes(path, body, 'project-state-migration');
    return { path, raw: body, value: next, migrated: true };
  });
}

export function quarantineLegacyProjectState(gstackRoot, sessionId, expectedLegacyProject) {
  const path = projectStatePath(gstackRoot, sessionId);
  const sid = sanitizeSessionId(sessionId);
  const raw = readOptionalBytes(path);
  if (raw === null) throw new Error('legacy project pin is absent');
  const project = parseLegacyProjectPin(raw);
  if (project !== String(expectedLegacyProject || '')) throw new Error('legacy project expectation mismatch');
  return withProjectStateLock(gstackRoot, sid, () => {
    const currentRaw = readOptionalBytes(path);
    if (!currentRaw?.equals(raw)) throw new Error('legacy project pin changed before quarantine');
    const parent = dirname(path);
    const quarantineDir = join(parent, 'project-state-quarantine');
    try { mkdirSync(quarantineDir, { mode: 0o700 }); }
    catch (error) { if (error?.code !== 'EEXIST') throw error; }
    if (realpathSync(quarantineDir) !== quarantineDir) throw new Error('project state quarantine directory must be canonical');
    const parked = join(quarantineDir, `${sid}-${randomUUID()}.legacy-pin`);
    renameSync(path, parked);
    let verification_warning = '';
    try {
      const parkedRaw = readFileSync(parked);
      if (!parkedRaw.equals(raw)) throw new Error('legacy project quarantine readback mismatch');
      for (const dir of [quarantineDir, parent]) {
        const fd = openSync(dir, 'r');
        try { fsyncSync(fd); } finally { closeSync(fd); }
      }
    } catch (error) {
      verification_warning = String(error?.message || error);
      process.stderr.write(`[project-substrate] ⚠️ legacy pin 已隔离，但后置读回/持久化检查失败；禁止重试隔离：${parked} — ${verification_warning}\n`);
    }
    return { quarantined: true, session_id: sid, legacy_project: project, quarantine_path: parked, ...(verification_warning ? { verification_warning } : {}) };
  });
}

export function stateBinding(value) {
  if (!value || value.state === 'NO_PIN') return null;
  if (value.state === 'SWITCH_ONLY') return value.switch?.binding || null;
  return value.binding || null;
}

// Validate both filesystem identity and the state-specific epoch snapshot.
// Keeping this in the substrate prevents route/restore/scope/Stop from each
// accepting a different partially-corrupt shape.
export function validatedBindingForState(value, projectsRoot = PROJECTS_ROOT) {
  if (!value || !PROJECT_STATES.has(value.state)) throw new Error('invalid project state');
  if (value.schema_version === PROJECT_STATE_SCHEMA) eventControlFromState(value);
  if (value.state === 'NO_PIN') {
    if (value.binding || value.switch) throw new Error('NO_PIN cannot carry project identity');
    return null;
  }

  if (value.state === 'SWITCH_ONLY') {
    const sw = value.switch;
    const eventRefValid = value.schema_version === PROJECT_STATE_SCHEMA
      ? Boolean(String(sw?.event_id || '') && String(sw?.boundary_id || ''))
      : Boolean(String(sw?.turn_id || ''));
    if (!sw || !['switch', 'new'].includes(sw.operation) || !String(sw.tx || '') || !eventRefValid) {
      throw new Error('SWITCH_ONLY transaction shape is invalid');
    }
    validateProjectName(sw.target);
    if (!Number.isSafeInteger(sw.expected_epoch) || sw.expected_epoch < 0) throw new Error('SWITCH_ONLY expected epoch is invalid');
    if (!sw.binding) {
      if (sw.expected_epoch !== 0) throw new Error('unbound SWITCH_ONLY must expect epoch 0');
      if (value.schema_version === PROJECT_STATE_SCHEMA) {
        const current = eventControlFromState(value).current;
        if (current?.status !== 'active' || current.event_id !== sw.event_id
            || current.boundary_id !== sw.boundary_id) throw new Error('SWITCH_ONLY native event snapshot is invalid');
      }
      return null;
    }
    if (sw.binding.epoch !== sw.expected_epoch) throw new Error('SWITCH_ONLY binding epoch mismatch');
    verifyProjectBinding(sw.binding, projectsRoot);
    if (value.schema_version === PROJECT_STATE_SCHEMA) {
      const current = eventControlFromState(value).current;
      if (current?.status !== 'active' || current.event_id !== sw.event_id
          || current.boundary_id !== sw.boundary_id) throw new Error('SWITCH_ONLY native event snapshot is invalid');
    }
    return sw.binding;
  }

  const binding = value.binding;
  verifyProjectBinding(binding, projectsRoot);
  if (value.state === 'BOUND') {
    const terminal = value.terminal;
    const eventRefValid = value.schema_version === PROJECT_STATE_SCHEMA
      ? Boolean(String(terminal?.event_id || '') && String(terminal?.boundary_id || ''))
      : Boolean(String(terminal?.turn_id || ''));
    if (!terminal || !String(terminal.tx || '') || !eventRefValid
        || !['switch', 'new'].includes(terminal.operation)
        || !Number.isSafeInteger(terminal.expected_epoch)
        || terminal.expected_epoch !== binding.epoch - 1) {
      throw new Error('BOUND terminal snapshot is invalid');
    }
    if (value.schema_version === PROJECT_STATE_SCHEMA) {
      const current = eventControlFromState(value).current;
      if (current?.status !== 'active' || current.event_id !== terminal.event_id
          || current.boundary_id !== terminal.boundary_id) throw new Error('BOUND native event snapshot is invalid');
    }
    return binding;
  }
  const turn = value.turn;
  const eventRefValid = value.schema_version === PROJECT_STATE_SCHEMA
    ? Boolean((String(turn?.event_id || '') && String(turn?.boundary_id || ''))
      || (value.state === 'TURN_CLOSED' && String(turn?.turn_id || '')
        && (value.event_control?.candidates?.length > 0 || value.event_control?.fence)))
    : Boolean(String(turn?.turn_id || ''));
  if (!turn || !eventRefValid || turn.epoch !== binding.epoch) {
    throw new Error(`${value.state} turn epoch snapshot is invalid`);
  }
  if (value.schema_version === PROJECT_STATE_SCHEMA && turn.event_id) {
    const current = eventControlFromState(value).current;
    const expectedStatus = value.state === 'TURN_ACTIVE' ? 'active' : 'closed';
    if (current?.status !== expectedStatus || current.event_id !== turn.event_id
        || current.boundary_id !== turn.boundary_id) throw new Error(`${value.state} native event snapshot is invalid`);
  }
  return binding;
}

export function atomicProjectStateCas(gstackRoot, sessionId, expectedRaw, nextValue) {
  return withProjectStateLock(gstackRoot, sessionId, () => {
    const path = projectStatePath(gstackRoot, sessionId);
    const raw = readOptionalBytes(path);
    const same = raw === null
      ? expectedRaw === null
      : Buffer.isBuffer(expectedRaw) && raw.equals(expectedRaw);
    if (!same) throw new Error('project state CAS mismatch');
    const body = Buffer.from(`${JSON.stringify(nextValue)}\n`);
    atomicWriteBytes(path, body, 'project-state-tmp');
    return nextValue;
  });
}

export function removeProjectStateCas(gstackRoot, sessionId, expectedRaw) {
  return withProjectStateLock(gstackRoot, sessionId, () => {
    const path = projectStatePath(gstackRoot, sessionId);
    const raw = readOptionalBytes(path);
    if (!raw || !Buffer.isBuffer(expectedRaw) || !raw.equals(expectedRaw)) throw new Error('project state remove CAS mismatch');
    const parent = dirname(path);
    const parked = join(parent, `.project-state-remove-${process.pid}-${randomUUID()}`);
    renameSync(path, parked);
    try {
      if (process.env.LUCA_PROJECT_STATE_REMOVE_FAULT === 'after-rename') {
        throw new Error('injected project state remove fault after-rename');
      }
      const dirFd = openSync(parent, 'r');
      try { fsyncSync(dirFd); } finally { closeSync(dirFd); }
      unlinkSync(parked);
      const dirFd2 = openSync(parent, 'r');
      try { fsyncSync(dirFd2); } finally { closeSync(dirFd2); }
      try { readFileSync(path); throw new Error('project state remove readback failed'); }
      catch (error) { if (error?.code !== 'ENOENT') throw error; }
    } catch (error) {
      process.stderr.write(`[project-substrate] ⚠️ project state 已从 canonical 路径移除，但残留清理/持久化检查失败；禁止重试解绑：${parked} — ${String(error?.message || error)}\n`);
    }
    return {
      schema_version: PROJECT_STATE_SCHEMA,
      state: 'NO_PIN',
      session_id: sanitizeSessionId(sessionId),
      event_control: { candidates: [], current: null, cursor: null, consumed_events: [] },
    };
  });
}

export function prepareProjectSwitch({ gstackRoot, projectsRoot = PROJECTS_ROOT, sessionId, operation, target, turnId = '' }) {
  void turnId;
  const sid = sanitizeSessionId(sessionId);
  const op = String(operation || '');
  const project = validateProjectName(target);
  if (!sid || !['switch', 'new'].includes(op)) {
    throw new ProjectEventAuthorityError('INVALID_SELECTION', 'selection requires a session, switch/new operation, and canonical target');
  }
  return withProjectStateLock(gstackRoot, sid, () => {
    const path = projectStatePath(gstackRoot, sid);
    const raw = readOptionalBytes(path);
    const state = projectStateFromBytes(raw, sid);
    const control = eventControlFromState(state);
    const event = control.current;
    if (!event || event.status !== 'active') {
      throw new ProjectEventAuthorityError('NO_ACTIVE_EVENT', 'selection requires the current attested native event');
    }
    const binding = validatedBindingForState(state, projectsRoot);
    const expectedEpoch = binding?.epoch || 0;
    const proposalTx = randomUUID();
    let baseSelection = state.selection || {};
    if (state.state === 'SWITCH_ONLY') {
      const existing = state.switch;
      if (existing?.operation === op && existing?.target === project && existing?.event_id === event.event_id
          && existing?.boundary_id === event.boundary_id) return { state, proposal: existing, idempotent: true };
      if (existing?.status !== 'PREPARED') {
        let ownerAlive = false;
        if (Number.isSafeInteger(existing?.owner_pid) && existing.owner_pid > 0) {
          try { process.kill(existing.owner_pid, 0); ownerAlive = true; }
          catch (error) { ownerAlive = error?.code !== 'ESRCH'; }
        }
        if (ownerAlive) {
          throw new ProjectEventAuthorityError('SELECTION_BUSY', 'another selection has started side effects for this native event');
        }
        let unresolvedStatus = 'EXPIRED_OR_UNKNOWN';
        let unresolvedCreated = Boolean(existing.created);
        if (existing.operation === 'new') {
          try {
            const reservation = readProjectReservation(projectsRoot, existing.target).value;
            if (reservation?.tx === existing.tx && reservation?.session_id === sid
                && reservation?.target === existing.target) {
              unresolvedCreated = reservation.dev != null && reservation.ino != null;
              const targetExists = existsSync(join(realpathSync(resolve(projectsRoot)), existing.target));
              unresolvedStatus = unresolvedCreated ? 'CREATING'
                : targetExists ? 'OWNERSHIP_UNKNOWN' : 'RUNNING';
            } else if (existsSync(join(realpathSync(resolve(projectsRoot)), existing.target))) {
              unresolvedStatus = 'OWNERSHIP_UNKNOWN';
            }
          } catch { unresolvedStatus = 'OWNERSHIP_UNKNOWN'; }
        }
        const unresolved = {
          operation_id: existing.tx, kind: existing.operation, target: existing.target,
          status: unresolvedStatus, created: unresolvedCreated, bound: false, commit_id: null,
          expected_epoch: existing.expected_epoch, binding_epoch: binding?.epoch || null,
          committed_at: null, error_code: existing.error_code || 'OWNER_EXITED_BEFORE_COMMIT',
          phase: existing.phase || null,
          superseded_by: proposalTx,
        };
        baseSelection = {
          ...baseSelection,
          pending: null,
          receipts: [...(Array.isArray(baseSelection.receipts) ? baseSelection.receipts : []), unresolved],
          latest_operation: unresolved,
        };
      } else {
        const expired = {
          operation_id: existing.tx, kind: existing.operation, target: existing.target,
          status: 'SUPERSEDED', created: false, bound: false, commit_id: null,
          expected_epoch: existing.expected_epoch, binding_epoch: binding?.epoch || null,
          committed_at: null, error_code: 'SUPERSEDED_BEFORE_EXECUTION',
          superseded_by: proposalTx,
        };
        baseSelection = {
          ...baseSelection,
          pending: null,
          receipts: [...(Array.isArray(baseSelection.receipts) ? baseSelection.receipts : []), expired],
          latest_operation: expired,
        };
      }
    }
    const proposal = {
      tx: proposalTx, operation: op, target: project, expected_epoch: expectedEpoch,
      binding: binding || null, event_id: event.event_id, boundary_id: event.boundary_id,
      status: 'PREPARED', prepared_at: new Date().toISOString(),
    };
    const next = {
      schema_version: PROJECT_STATE_SCHEMA, state: 'SWITCH_ONLY', session_id: sid,
      switch: proposal, event_control: state.event_control,
      selection: { ...baseSelection, pending: proposal },
    };
    const currentRaw = readOptionalBytes(path);
    const unchanged = currentRaw === null ? raw === null : Buffer.isBuffer(raw) && currentRaw.equals(raw);
    if (!unchanged) throw new ProjectEventAuthorityError('STATE_CHANGED', 'selection state changed before proposal commit');
    atomicWriteBytes(path, Buffer.from(`${JSON.stringify(next)}\n`), 'project-selection-prepare');
    return { state: next, proposal, idempotent: false };
  });
}

export function beginProjectTurn({ gstackRoot, projectsRoot = PROJECTS_ROOT, sessionId, turnId }) {
  void gstackRoot; void projectsRoot; void sessionId; void turnId;
  throw new Error('raw turn-id project authority is retired; queue and attest a native event');
}

export function closeProjectTurn({ gstackRoot, projectsRoot = PROJECTS_ROOT, sessionId, turnId, expectedEpoch, outcome = 'closed' }) {
  void gstackRoot; void projectsRoot; void sessionId; void turnId; void expectedEpoch; void outcome;
  throw new Error('raw turn-id project authority is retired; close an attested native event');
}

export function closeSwitchTurn({ gstackRoot, projectsRoot = PROJECTS_ROOT, sessionId, turnId, expectedEpoch, outcome = 'switch-terminal' }) {
  void gstackRoot; void projectsRoot; void sessionId; void turnId; void expectedEpoch; void outcome;
  throw new Error('raw turn-id switch authority is retired; close an attested native event');
}

export function cancelProjectSwitch({ gstackRoot, projectsRoot = PROJECTS_ROOT, sessionId, outcome = 'switch-abandoned-at-next-prompt' }) {
  void gstackRoot; void projectsRoot; void sessionId; void outcome;
  throw new Error('raw turn-id switch authority is retired; close an attested native event');
}
