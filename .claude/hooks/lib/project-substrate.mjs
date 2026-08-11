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
import { homedir } from 'os';
import { randomUUID } from 'crypto';

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

// PROJECTS_ROOT 直接子目录名（均单段）；软链目录也算（与 py Path.is_dir() 跟随语义一致）
export function listProjects(projectsRoot = PROJECTS_ROOT) {
  try {
    return readdirSync(projectsRoot, { withFileTypes: true })
      .filter((d) => {
        if (d.name.startsWith('.')) return false;
        if (d.isDirectory()) return true;
        if (d.isSymbolicLink()) {
          try { return statSync(join(projectsRoot, d.name)).isDirectory(); } catch { return false; }
        }
        return false;
      })
      .map((d) => d.name);
  } catch {
    return [];
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

export const PROJECT_STATE_SCHEMA = 2;
export const PROJECT_STATES = new Set(['NO_PIN', 'BOUND', 'SWITCH_ONLY', 'TURN_ACTIVE', 'TURN_CLOSED']);
// The ledger never evicts entries. Once full, the session must rotate instead
// of making an old turn identifier replayable again.
export const PROJECT_TURN_HISTORY_LIMIT = 256;

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

function projectTurnHistoryPath(gstackRoot, sessionId) {
  const sid = sanitizeSessionId(sessionId);
  if (!sid) throw new Error('session id required');
  // Keep the ledger outside `.session-project-*`: check-project-links treats
  // that prefix as the canonical identity-state census.
  return join(realpathSync(resolve(gstackRoot)), '.claude', `.session-consumed-turns-${sid}`);
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
  try {
    fd = openSync(lockPath, 'wx', 0o600);
    writeFileSync(fd, bytes);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
  } catch (error) {
    if (fd !== null) try { closeSync(fd); } catch { }
    if (error?.code === 'EEXIST') throw new Error(`project state lock exists; manual recovery required: ${lockPath}`);
    try { unlinkSync(lockPath); } catch { }
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
  if (raw === null) return { path, raw: null, value: { schema_version: PROJECT_STATE_SCHEMA, state: 'NO_PIN', session_id: sid } };
  let value;
  try { value = JSON.parse(raw.toString('utf8')); }
  catch {
    const project = parseLegacyProjectPin(raw);
    throw new Error(`legacy project pin requires explicit migration: session=${sid} project=${project}`);
  }
  if (value?.schema_version !== PROJECT_STATE_SCHEMA || !PROJECT_STATES.has(value?.state)) throw new Error('invalid project state schema');
  if (value.session_id !== sid) throw new Error('project state session mismatch');
  return { path, raw, value };
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
      schema_version: PROJECT_STATE_SCHEMA,
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

function knownTurnIds(value) {
  return [value?.terminal?.turn_id, value?.turn?.turn_id, value?.switch?.turn_id]
    .map(item => String(item || ''))
    .filter(Boolean);
}

function consumeTopLevelTurnId(gstackRoot, sessionId, turnId, stateValue) {
  const sid = sanitizeSessionId(sessionId);
  const requested = String(turnId || '');
  if (!requested || requested.length > 256 || /[\u0000-\u001f\u007f]/.test(requested)) {
    throw new Error('top-level turn id is missing or invalid');
  }
  const path = projectTurnHistoryPath(gstackRoot, sid);
  return withProjectStateLock(gstackRoot, sid, () => {
    const raw = readOptionalBytes(path);
    let history = { schema_version: 1, session_id: sid, consumed_turn_ids: [] };
    if (raw) {
      try { history = JSON.parse(raw.toString('utf8')); }
      catch { throw new Error('project turn history is malformed'); }
      if (history?.schema_version !== 1 || history.session_id !== sid
          || !Array.isArray(history.consumed_turn_ids)
          || history.consumed_turn_ids.some(item => typeof item !== 'string')) {
        throw new Error('project turn history schema is invalid');
      }
    }
    const consumed = [...new Set([...history.consumed_turn_ids, ...knownTurnIds(stateValue)])];
    if (consumed.includes(requested)) throw new Error(`top-level turn id already consumed: ${requested}`);
    if (consumed.length >= PROJECT_TURN_HISTORY_LIMIT) {
      throw new Error(`project turn history capacity ${PROJECT_TURN_HISTORY_LIMIT} reached; rotate the session manually`);
    }
    consumed.push(requested);
    const next = { schema_version: 1, session_id: sid, consumed_turn_ids: consumed };
    atomicWriteBytes(path, Buffer.from(`${JSON.stringify(next)}\n`), 'project-turn-history');
    return next;
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
  if (value.state === 'NO_PIN') {
    if (value.binding || value.switch) throw new Error('NO_PIN cannot carry project identity');
    return null;
  }

  if (value.state === 'SWITCH_ONLY') {
    const sw = value.switch;
    if (!sw || !['switch', 'new'].includes(sw.operation) || !String(sw.tx || '') || !String(sw.turn_id || '')) {
      throw new Error('SWITCH_ONLY transaction shape is invalid');
    }
    validateProjectName(sw.target);
    if (!Number.isSafeInteger(sw.expected_epoch) || sw.expected_epoch < 0) throw new Error('SWITCH_ONLY expected epoch is invalid');
    if (!sw.binding) {
      if (sw.expected_epoch !== 0) throw new Error('unbound SWITCH_ONLY must expect epoch 0');
      return null;
    }
    if (sw.binding.epoch !== sw.expected_epoch) throw new Error('SWITCH_ONLY binding epoch mismatch');
    verifyProjectBinding(sw.binding, projectsRoot);
    return sw.binding;
  }

  const binding = value.binding;
  verifyProjectBinding(binding, projectsRoot);
  if (value.state === 'BOUND') {
    const terminal = value.terminal;
    if (!terminal || !String(terminal.tx || '') || !String(terminal.turn_id || '')
        || !['switch', 'new'].includes(terminal.operation)
        || !Number.isSafeInteger(terminal.expected_epoch)
        || terminal.expected_epoch !== binding.epoch - 1) {
      throw new Error('BOUND terminal snapshot is invalid');
    }
    return binding;
  }
  const turn = value.turn;
  if (!turn || !String(turn.turn_id || '') || turn.epoch !== binding.epoch) {
    throw new Error(`${value.state} turn epoch snapshot is invalid`);
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
    return { schema_version: PROJECT_STATE_SCHEMA, state: 'NO_PIN', session_id: sanitizeSessionId(sessionId) };
  });
}

export function prepareProjectSwitch({ gstackRoot, projectsRoot = PROJECTS_ROOT, sessionId, operation, target, turnId = '' }) {
  const sid = sanitizeSessionId(sessionId);
  const op = String(operation || '');
  if (!['switch', 'new'].includes(op)) throw new Error('operation must be switch or new');
  const project = validateProjectName(target);
  const requestedTurnId = String(turnId || '');
  if (!requestedTurnId) throw new Error('switch-only turn id required');
  const current = readProjectState(gstackRoot, sid, projectsRoot);
  if (current.value.state === 'SWITCH_ONLY') throw new Error('switch transaction already pending');
  if (current.value.state === 'TURN_ACTIVE') throw new Error('mid-turn switch is forbidden; close the active turn first');
  if (!['NO_PIN', 'BOUND', 'TURN_CLOSED'].includes(current.value.state)) throw new Error(`cannot prepare switch from ${current.value.state}`);
  const binding = validatedBindingForState(current.value, projectsRoot);
  consumeTopLevelTurnId(gstackRoot, sid, requestedTurnId, current.value);
  const expectedEpoch = binding?.epoch || 0;
  const next = {
    schema_version: PROJECT_STATE_SCHEMA,
    state: 'SWITCH_ONLY',
    session_id: sid,
    switch: {
      tx: randomUUID(),
      operation: op,
      target: project,
      expected_epoch: expectedEpoch,
      binding,
      turn_id: requestedTurnId,
    },
  };
  atomicProjectStateCas(gstackRoot, sid, current.raw, next);
  return next;
}

export function beginProjectTurn({ gstackRoot, projectsRoot = PROJECTS_ROOT, sessionId, turnId }) {
  const sid = sanitizeSessionId(sessionId);
  const requestedTurnId = String(turnId || '');
  if (!requestedTurnId) throw new Error('active turn id required');
  const current = readProjectState(gstackRoot, sid, projectsRoot);
  if (!['NO_PIN', 'BOUND', 'TURN_CLOSED'].includes(current.value.state)) {
    throw new Error(`cannot begin project turn from ${current.value.state}`);
  }
  const binding = validatedBindingForState(current.value, projectsRoot);
  if (current.value.state === 'BOUND' && current.value.terminal.turn_id === requestedTurnId) {
    throw new Error('successful switch is terminal for its originating turn');
  }
  consumeTopLevelTurnId(gstackRoot, sid, requestedTurnId, current.value);
  if (!binding) {
    // NO_PIN is represented by absence. Do not create a marker that legacy
    // presence checks could mistake for an active binding.
    return { schema_version: PROJECT_STATE_SCHEMA, state: 'NO_PIN', session_id: sid, turn: { turn_id: requestedTurnId } };
  }
  const next = {
    schema_version: PROJECT_STATE_SCHEMA,
    state: 'TURN_ACTIVE',
    session_id: sid,
    binding,
    turn: { turn_id: requestedTurnId, epoch: binding.epoch },
  };
  atomicProjectStateCas(gstackRoot, sid, current.raw, next);
  return next;
}

export function closeProjectTurn({ gstackRoot, projectsRoot = PROJECTS_ROOT, sessionId, turnId, expectedEpoch, outcome = 'closed' }) {
  const sid = sanitizeSessionId(sessionId);
  const current = readProjectState(gstackRoot, sid, projectsRoot);
  if (current.value.state !== 'TURN_ACTIVE') throw new Error(`cannot close non-active turn: ${current.value.state}`);
  const binding = validatedBindingForState(current.value, projectsRoot);
  if (!binding) throw new Error('active turn lacks binding');
  if (current.value.turn?.turn_id !== String(turnId || '')) throw new Error('turn id snapshot mismatch');
  if (binding.epoch !== Number(expectedEpoch) || current.value.turn?.epoch !== Number(expectedEpoch)) throw new Error('turn epoch snapshot mismatch');
  const next = {
    schema_version: PROJECT_STATE_SCHEMA,
    state: 'TURN_CLOSED',
    session_id: sid,
    binding,
    turn: { ...(current.value.turn || {}), epoch: binding.epoch, outcome },
  };
  atomicProjectStateCas(gstackRoot, sid, current.raw, next);
  return next;
}

export function closeSwitchTurn({ gstackRoot, projectsRoot = PROJECTS_ROOT, sessionId, turnId, expectedEpoch, outcome = 'switch-terminal' }) {
  const sid = sanitizeSessionId(sessionId);
  const current = readProjectState(gstackRoot, sid, projectsRoot);
  if (current.value.state !== 'BOUND' || !current.value.terminal) throw new Error(`cannot close non-terminal switch state: ${current.value.state}`);
  const binding = validatedBindingForState(current.value, projectsRoot);
  if (current.value.terminal.turn_id !== String(turnId || '')) throw new Error('switch turn id mismatch');
  if (binding?.epoch !== Number(expectedEpoch)) throw new Error('switch epoch mismatch');
  const next = {
    schema_version: PROJECT_STATE_SCHEMA,
    state: 'TURN_CLOSED',
    session_id: sid,
    binding,
    turn: { turn_id: String(turnId), epoch: binding.epoch, outcome },
  };
  atomicProjectStateCas(gstackRoot, sid, current.raw, next);
  return next;
}

export function cancelProjectSwitch({ gstackRoot, projectsRoot = PROJECTS_ROOT, sessionId, outcome = 'switch-abandoned-at-next-prompt' }) {
  const sid = sanitizeSessionId(sessionId);
  const current = readProjectState(gstackRoot, sid, projectsRoot);
  if (current.value.state !== 'SWITCH_ONLY') throw new Error(`cannot cancel non-switch state: ${current.value.state}`);
  const binding = validatedBindingForState(current.value, projectsRoot);
  if (!binding) return removeProjectStateCas(gstackRoot, sid, current.raw);
  const next = {
    schema_version: PROJECT_STATE_SCHEMA,
    state: 'TURN_CLOSED',
    session_id: sid,
    binding,
    turn: { turn_id: current.value.switch.turn_id, epoch: binding.epoch, outcome },
  };
  atomicProjectStateCas(gstackRoot, sid, current.raw, next);
  return next;
}
