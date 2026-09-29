// Codex child project association. A child has delegated provenance, never a
// human-attested project pin. Receipts are immutable; claims are single-use.
import {
  closeSync, constants as fsConstants, existsSync, fstatSync, fsyncSync,
  lstatSync, mkdirSync, openSync, opendirSync, readFileSync, readdirSync, realpathSync,
  writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { homedir, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { readActivation } from '../../../scripts/model-route-host.mjs';
import {
  PROJECTS_ROOT, activeProjectAuthority, attestPendingProjectEvent,
  readProjectState, verifyProjectBinding,
} from './project-substrate.mjs';

const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
const MAX_RECEIPTS = 256;
const SID = /^[\w-]{1,36}$/;
const ROLE = /^[\w-]{1,80}$/;
const DIGEST = /^[a-f0-9]{64}$/;

export class CodexChildProjectError extends Error {
  constructor(code, message) { super(message); this.name = 'CodexChildProjectError'; this.code = code; }
}
const fail = (code, message) => { throw new CodexChildProjectError(code, message); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sameBinding = (left, right) => ['project', 'realpath', 'dev', 'ino', 'epoch']
  .every(field => left?.[field] === right?.[field]);
const inside = (path, root) => {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};
function id(value, label, pattern = SID) {
  if (typeof value !== 'string' || !pattern.test(value)) fail('IDENTITY_INVALID', `${label} is invalid`);
  return value;
}
function text(value, label, max = 256) {
  if (typeof value !== 'string' || !value || value.length > max) fail('IDENTITY_INVALID', `${label} is invalid`);
  return value;
}
function canonical(path, label) {
  if (!isAbsolute(String(path || ''))) fail('PATH_INVALID', `${label} must be absolute`);
  const requested = resolve(path);
  let actual;
  try { actual = realpathSync(requested); } catch { fail('PATH_INVALID', `${label} is unavailable`); }
  if (actual !== requested) fail('PATH_INVALID', `${label} is not canonical`);
  return actual;
}
function dir(path, label, create = false) {
  if (create) mkdirSync(path, { recursive: true, mode: 0o700 });
  const lst = lstatSync(path);
  if (!lst.isDirectory() || lst.isSymbolicLink() || realpathSync(path) !== path) {
    fail('PATH_INVALID', `${label} is not a canonical directory`);
  }
  return path;
}
function protectedDir(path, label, create = false) {
  if (create) {
    try { mkdirSync(path, { mode: 0o700 }); }
    catch (error) { if (error?.code !== 'EEXIST') throw error; }
  }
  const lst = lstatSync(path);
  if (!lst.isDirectory() || lst.isSymbolicLink() || realpathSync(path) !== path
      || lst.uid !== process.getuid() || (lst.mode & 0o077) !== 0) {
    fail('STORE_UNTRUSTED', `${label} is not an owner-only canonical directory`);
  }
  return path;
}
function protectedBase(gstackRoot, create = false) {
  const root = canonical(gstackRoot, 'gstack root');
  let codexRoot;
  const override = process.env.LUCA_CHILD_PROJECT_STORE_ROOT;
  if (override) {
    const isolated = [realpathSync(tmpdir()), realpathSync('/tmp')]
      .some(temp => inside(root, temp) && root !== temp);
    if (process.env.NODE_ENV !== 'test' || process.env.LUCA_EVENT_ATTESTATION_TEST !== '1'
        || !isolated || !isAbsolute(override)
        || !inside(resolve(override), dirname(root))) {
      fail('STORE_UNTRUSTED', 'child store override is only valid for an isolated test fixture');
    }
    protectedDir(dirname(resolve(override)), 'test store parent');
    codexRoot = protectedDir(resolve(override), 'test child store root', create);
  } else {
    const home = canonical(homedir(), 'user home');
    codexRoot = protectedDir(join(home, '.codex'), 'native Codex home');
    codexRoot = protectedDir(join(codexRoot, 'luca-child-project'), 'child store root', create);
  }
  return protectedDir(join(codexRoot, sha(Buffer.from(root))), 'gstack child store', create);
}
function store(gstackRoot, parentSessionId, create = false) {
  const base = protectedBase(gstackRoot, create);
  return protectedDir(join(base, id(parentSessionId, 'parent session')),
    'parent receipt directory', create);
}
function safeRead(file) {
  const lst = lstatSync(file, { bigint: true });
  if (!lst.isFile() || lst.isSymbolicLink() || lst.size > BigInt(MAX_SOURCE_BYTES)) fail('SOURCE_INVALID', 'source is not a bounded regular file');
  const fd = openSync(file, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0));
  try {
    const opened = fstatSync(fd, { bigint: true });
    if (!opened.isFile() || opened.dev !== lst.dev || opened.ino !== lst.ino) fail('SOURCE_DRIFT', 'source changed during open');
    const bytes = readFileSync(fd);
    if (bytes.length > MAX_SOURCE_BYTES) fail('SOURCE_LIMIT', 'source exceeds byte limit');
    return bytes;
  } finally { closeSync(fd); }
}
function jsonFile(file) {
  let value;
  try { value = JSON.parse(safeRead(file).toString('utf8')); }
  catch (error) { if (error instanceof CodexChildProjectError) throw error; fail('RECEIPT_INVALID', 'receipt is not valid JSON'); }
  return value;
}
function writeOnce(file, value) {
  const bytes = Buffer.from(`${JSON.stringify(value)}\n`);
  const fd = openSync(file, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | (fsConstants.O_NOFOLLOW || 0), 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  const parent = openSync(dirname(file), fsConstants.O_RDONLY);
  try { fsyncSync(parent); } finally { closeSync(parent); }
  return sha(bytes);
}
function receiptFiles(folder) {
  const files = readdirSync(folder).filter(name => /^[a-f0-9]{64}\.receipt\.json$/.test(name));
  if (files.length > MAX_RECEIPTS) fail('RECEIPT_LIMIT', 'too many child receipts for one parent');
  return files.map(name => join(folder, name));
}
function claimForChild(gstackRoot, childSessionId) {
  let base;
  try { base = protectedBase(gstackRoot); }
  catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
  const parents = readdirSync(base, { withFileTypes: true });
  if (parents.length > 512) fail('RECEIPT_LIMIT', 'too many parent receipt directories');
  const hits = [];
  let scanned = 0;
  for (const entry of parents) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || !SID.test(entry.name)) continue;
    const folder = protectedDir(join(base, entry.name), 'parent receipt directory');
    for (const file of receiptFiles(folder)) {
      if (++scanned > 4096) fail('RECEIPT_LIMIT', 'too many child receipts to resolve');
      if (!existsSync(`${file}.claim`)) continue;
      const receipt = receiptAt(file);
      const claim = claimAt(file);
      if (claim.childSessionId === childSessionId) hits.push({ receipt, claim });
    }
  }
  if (hits.length > 1) fail('CLAIM_AMBIGUOUS', 'child has multiple project claims');
  return hits[0] || null;
}
function receiptAt(file) {
  const bytes = safeRead(file);
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch { fail('RECEIPT_INVALID', 'receipt is malformed'); }
  if (value?.schema_version !== 1 || !SID.test(value.parentSessionId || '')
      || !SID.test(value.rootSessionId || '') || !ROLE.test(value.agentType || '')
      || !DIGEST.test(value.toolUseDigest || '') || !value.binding || !value.activationId
      || !value.parentEventId || !value.turnId || !value.cwd || !value.receiptId
      || typeof value.taskName !== 'string'
      || !['direct', 'exec'].includes(value.spawnKind)
      || !Number.isSafeInteger(value.expectedDepth) || value.expectedDepth < 1) {
    fail('RECEIPT_INVALID', 'receipt shape is invalid');
  }
  return { value, digest: sha(bytes) };
}
function claimAt(file) {
  const claim = jsonFile(`${file}.claim`);
  if (claim?.schema_version !== 1 || !SID.test(claim.childSessionId || '')
      || !DIGEST.test(claim.receiptDigest || '') || !DIGEST.test(claim.toolUseDigest || '')
      || !['direct', 'exec'].includes(claim.spawnKind) || !claim.turnId
      || !claim.activationId || !claim.cwd) fail('CLAIM_INVALID', 'child claim shape is invalid');
  return claim;
}
function claimMatchesReceipt(claim, receipt, childSessionId) {
  const value = receipt.value;
  return claim.childSessionId === childSessionId && claim.receiptDigest === receipt.digest
    && claim.parentSessionId === value.parentSessionId && claim.agentType === value.agentType
    && claim.turnId === value.turnId && claim.toolUseDigest === value.toolUseDigest
    && claim.spawnKind === value.spawnKind && claim.activationId === value.activationId
    && claim.cwd === value.cwd;
}
function revocations(gstackRoot, create = false) {
  const base = protectedBase(gstackRoot, create);
  return protectedDir(join(base, 'revocations'), 'activation revocations', create);
}
function revocationFile(gstackRoot, rootSessionId, activationId, create = false) {
  const folder = revocations(gstackRoot, create);
  return join(folder, `${id(rootSessionId, 'root session')}-${sha(Buffer.from(text(activationId, 'activation ID')))}.revoked.json`);
}
function activationRevoked(gstackRoot, rootSessionId, activationId) {
  try { return existsSync(revocationFile(gstackRoot, rootSessionId, activationId)); }
  catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
}
function rawActivation(rootSessionId) {
  return readActivation({
    harness: 'codex', root_session_id: rootSessionId,
    state_root: process.env.NODE_ENV === 'test' ? process.env.LUCA_MODEL_ROUTE_STATE_ROOT : undefined,
  });
}
function activation(rootSessionId, gstackRoot) {
  const state = rawActivation(rootSessionId);
  return state?.status === 'active'
    && !activationRevoked(gstackRoot, rootSessionId, state.activation_id) ? state : null;
}
export function revokeCodexChildProjectActivation({ gstackRoot, rootSessionId }) {
  const root = canonical(gstackRoot, 'gstack root');
  const session = id(rootSessionId, 'root session');
  const ids = new Set();
  const state = rawActivation(session);
  if (state?.activation_id) ids.add(text(state.activation_id, 'activation ID'));
  // The routing JSON is tool-writable. Its absence or corruption cannot hide
  // the activation IDs already frozen in protected child receipts.
  let base;
  try { base = protectedBase(root); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; }
  if (base) {
    const parents = readdirSync(base, { withFileTypes: true });
    if (parents.length > 512) fail('RECEIPT_LIMIT', 'too many parent receipt directories');
    let scanned = 0;
    for (const entry of parents) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || entry.name === 'revocations'
          || !SID.test(entry.name)) continue;
      const folder = protectedDir(join(base, entry.name), 'parent receipt directory');
      for (const file of receiptFiles(folder)) {
        if (++scanned > 4096) fail('RECEIPT_LIMIT', 'too many child receipts to revoke');
        const value = receiptAt(file).value;
        if (value.rootSessionId === session) ids.add(text(value.activationId, 'activation ID'));
      }
    }
  }
  if (!ids.size) return null;
  for (const activationId of ids) {
    const file = revocationFile(root, session, activationId, true);
    try { writeOnce(file, { schema_version: 1, rootSessionId: session, activationId }); }
    catch (error) { if (error?.code !== 'EEXIST') throw error; }
  }
  return { rootSessionId: session, activationId: state?.activation_id || '',
    revokedCount: ids.size, revoked: true };
}
function sourceHome(gstackRoot, rootSessionId, codexHome) {
  const requested = String(codexHome || '');
  if (process.env.NODE_ENV === 'test' && process.env.LUCA_EVENT_ATTESTATION_TEST === '1'
      && process.env.LUCA_CHILD_PROJECT_TEST_CODEX_HOME) {
    const gstack = canonical(gstackRoot, 'fixture root');
    const expected = canonical(process.env.LUCA_CHILD_PROJECT_TEST_CODEX_HOME, 'test Codex home');
    const isolated = [realpathSync(tmpdir()), realpathSync('/tmp')]
      .some(temp => inside(gstack, temp) && gstack !== temp);
    if (isolated && inside(expected, dirname(gstack))) {
      if (requested && canonical(requested, 'Codex home') !== expected) {
        fail('SOURCE_ROOT', 'Codex rollout source is not the protected native home');
      }
      return expected;
    }
  }
  const nativeHome = canonical(join(homedir(), '.codex'), 'native Codex home');
  protectedDir(nativeHome, 'native Codex home');
  if (requested && canonical(requested, 'Codex home') !== nativeHome) {
    fail('SOURCE_ROOT', 'Codex rollout source is not the protected native home');
  }
  return nativeHome;
}
function rollout(gstackRoot, rootSessionId, sessionId, codexHome) {
  const home = sourceHome(gstackRoot, rootSessionId, codexHome);
  const sessions = dir(join(home, 'sessions'), 'Codex sessions root');
  const matches = [];
  function scan(folder, depth) {
    const entries = opendirSync(folder);
    try {
      let entry;
      while ((entry = entries.readSync()) !== null) {
        if (entry.isSymbolicLink()) continue;
        const path = join(folder, entry.name);
        if (depth < 3) {
          const valid = depth === 0 ? /^\d{4}$/.test(entry.name)
            : depth === 1 ? /^(?:0[1-9]|1[0-2])$/.test(entry.name)
              : /^(?:0[1-9]|[12]\d|3[01])$/.test(entry.name);
          if (entry.isDirectory() && valid) scan(path, depth + 1);
        } else if (entry.isFile()
            && entry.name.startsWith('rollout-') && entry.name.endsWith(`-${sessionId}.jsonl`)) {
          matches.push(path);
          if (matches.length > 1) fail('SOURCE_NOT_UNIQUE', 'expected exactly one native Codex rollout');
        }
      }
    } finally { entries.closeSync(); }
  }
  scan(sessions, 0);
  if (matches.length !== 1) fail('SOURCE_NOT_UNIQUE', 'expected exactly one native Codex rollout');
  const bytes = safeRead(matches[0]);
  const lines = bytes.toString('utf8').trimEnd().split('\n');
  if (lines.length > 200_000) fail('SOURCE_LIMIT', 'native Codex rollout has too many records');
  let records;
  try { records = lines.map(line => JSON.parse(line)); } catch { fail('SOURCE_INVALID', 'native Codex rollout is malformed'); }
  return records;
}
function childMeta(records, childSessionId) {
  const rows = records.filter(row => row?.type === 'session_meta');
  if (rows.length !== 1 || records[0] !== rows[0]) fail('SOURCE_INVALID', 'child rollout has ambiguous session metadata');
  const meta = rows[0].payload || {};
  if (meta.id !== childSessionId) {
    fail('SOURCE_INVALID', 'native child session ID mismatch');
  }
  return meta;
}
function aborted(records, turnId = '') {
  return records.some(row => {
    if (row?.type !== 'turn_aborted' && row?.payload?.type !== 'turn_aborted') return false;
    const rowTurn = row?.payload?.turn_id || row?.turn_id || '';
    return !turnId || !rowTurn || rowTurn === turnId;
  });
}
function currentTaskActive(records) {
  let active = false;
  for (const row of records) {
    if (row?.type !== 'event_msg') continue;
    if (row.payload?.type === 'task_started') active = true;
    if (row.payload?.type === 'task_complete' || row.payload?.type === 'turn_aborted') active = false;
  }
  return active;
}
const SPAWN_NAMES = new Set([
  'Agent', 'agent', 'spawn_agent', 'collaboration__spawn_agent',
  'collaborationspawn_agent', 'collaboration.spawn_agent',
  'functions.collaboration.spawn_agent',
]);
function nativeSpawn(records, toolUseDigest, turnId, agentType, taskName) {
  let currentTurn = '';
  let found = 0;
  for (const row of records) {
    if (row?.type === 'turn_context') currentTurn = row.payload?.turn_id || '';
    if (row?.type !== 'response_item' || row?.payload?.type !== 'function_call') continue;
    const call = row.payload;
    const callTurn = call.internal_chat_message_metadata_passthrough?.turn_id || currentTurn;
    if (typeof call.call_id !== 'string' || sha(Buffer.from(call.call_id)) !== toolUseDigest
        || callTurn !== turnId) continue;
    if (!SPAWN_NAMES.has(call.name)) fail('SPAWN_WITNESS', 'matching native call is not a spawn tool');
    let args;
    try { args = JSON.parse(call.arguments); } catch { fail('SPAWN_WITNESS', 'native spawn arguments are malformed'); }
    const role = args?.agent_type ?? args?.agentType ?? 'default';
    if (role !== agentType) fail('SPAWN_WITNESS', 'native spawn role differs from receipt');
    if (taskName && (args?.task_name ?? args?.taskName) !== taskName) {
      fail('SPAWN_WITNESS', 'native spawn task name differs from receipt');
    }
    found += 1;
  }
  if (found > 1) fail('SPAWN_WITNESS', 'parent native spawn call is ambiguous');
  return found === 1;
}
function requireSpawnWitness(records, value) {
  if (!nativeSpawn(records, value.toolUseDigest, value.turnId, value.agentType, value.taskName)) {
    fail('SPAWN_WITNESS', 'native parent spawn call is not visible');
  }
}
function parentRootAuthority({ gstackRoot, projectsRoot, parentSessionId, turnId, cwd, transcriptPath, codexHome }) {
  const snapshot = readProjectState(gstackRoot, parentSessionId, projectsRoot).value;
  if (snapshot.state !== 'TURN_ACTIVE' && !snapshot.event_control?.candidates?.length) return null;
  const observed = attestPendingProjectEvent({
    gstackRoot, projectsRoot, sessionId: parentSessionId, boundaryId: turnId,
    cwd, observation: 'pre-tool', transcriptPath, codexHome,
  });
  return activeProjectAuthority(observed.state, { boundaryId: turnId, cwd }, projectsRoot);
}

export function prepareCodexChildProject({
  gstackRoot, projectsRoot = PROJECTS_ROOT, parentSessionId, turnId, toolUseId,
  agentType, taskName = '', cwd, transcriptPath = '', codexHome = '',
}) {
  const parent = id(parentSessionId, 'parent session');
  const turn = text(turnId, 'turn ID');
  const tool = text(toolUseId, 'tool use ID');
  const role = id(agentType, 'agent type', ROLE);
  const task = taskName ? id(taskName, 'task name', /^[a-z0-9_-]{1,80}$/) : '';
  const workingDirectory = canonical(cwd, 'working directory');
  const root = canonical(gstackRoot, 'gstack root');
  let binding;
  let rootSessionId = parent;
  let parentEventId;
  let expectedDepth = 1;
  const direct = parentRootAuthority({ gstackRoot: root, projectsRoot,
    parentSessionId: parent, turnId: turn, cwd: workingDirectory, transcriptPath, codexHome });
  if (direct) {
    binding = direct.binding;
    parentEventId = direct.event.event_id;
  } else {
    const inherited = resolveCodexChildProject({ gstackRoot: root, projectsRoot,
      childSessionId: parent, cwd: workingDirectory, codexHome });
    if (!inherited || !inherited.active) return null;
    const records = rollout(root, inherited.rootSessionId, parent, codexHome);
    const context = records.filter(row => row?.type === 'turn_context').at(-1)?.payload;
    if (context?.turn_id !== turn) fail('PARENT_TURN_MISMATCH', 'nested child turn is not current');
    const parentMeta = childMeta(records, parent);
    const depth = parentMeta.source?.subagent?.thread_spawn?.depth;
    if (!Number.isSafeInteger(depth) || depth < 1 || depth >= 32) {
      fail('PARENT_PROVENANCE', 'nested parent depth is invalid');
    }
    expectedDepth = depth + 1;
    binding = inherited.binding;
    rootSessionId = inherited.rootSessionId;
    parentEventId = `child:${inherited.receiptDigest}`;
  }
  if (!binding) return null;
  verifyProjectBinding(binding, projectsRoot);
  const act = activation(rootSessionId, root);
  if (!act) fail('ACTIVATION_INACTIVE', 'Codex root activation is not active');
  const receipt = {
    schema_version: 1, receiptId: randomUUID(), parentSessionId: parent, rootSessionId,
    parentEventId, turnId: turn, toolUseDigest: sha(Buffer.from(tool)), agentType: role,
    taskName: task, spawnKind: tool.startsWith('exec-') ? 'exec' : 'direct', expectedDepth,
    cwd: workingDirectory, binding, activationId: act.activation_id,
    sourceHome: sourceHome(root, rootSessionId, codexHome),
  };
  const folder = store(root, parent, true);
  const file = join(folder, `${receipt.toolUseDigest}.receipt.json`);
  try {
    const receiptDigest = writeOnce(file, receipt);
    return { receiptId: receipt.receiptId, receiptDigest, origin: 'codex-child' };
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const existing = receiptAt(file);
    const old = existing.value;
    if (old.parentSessionId !== parent || old.rootSessionId !== rootSessionId
        || old.parentEventId !== parentEventId || old.turnId !== turn
        || old.agentType !== role || old.taskName !== task || old.spawnKind !== receipt.spawnKind
        || old.expectedDepth !== expectedDepth
        || old.cwd !== workingDirectory
        || old.activationId !== act.activation_id
        || JSON.stringify(old.binding) !== JSON.stringify(binding)) {
      fail('RECEIPT_CONFLICT', 'tool use already has a different project receipt');
    }
    return { receiptId: old.receiptId, receiptDigest: existing.digest, origin: 'codex-child' };
  }
}

export function bindCodexChildProject({
  gstackRoot, parentSessionId, turnId, agentId, agentType, toolUseId = '', codexHome = '',
}) {
  const parent = id(parentSessionId, 'parent session');
  const child = id(agentId, 'child session');
  const turn = text(turnId, 'turn ID');
  const role = id(agentType, 'agent type', ROLE);
  const exactToolDigest = toolUseId ? sha(Buffer.from(text(toolUseId, 'tool use ID'))) : '';
  const root = canonical(gstackRoot, 'gstack root');
  let folder;
  try { folder = store(root, parent); } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
  const matches = [];
  let eligibleExec = 0;
  for (const file of receiptFiles(folder)) {
    const receipt = receiptAt(file);
    if (receipt.value.turnId !== turn || receipt.value.agentType !== role) continue;
    const claimFile = `${file}.claim`;
    if (receipt.value.spawnKind === 'exec' && !existsSync(claimFile)) eligibleExec += 1;
    if (exactToolDigest && receipt.value.toolUseDigest !== exactToolDigest) continue;
    if (existsSync(claimFile)) {
      const claim = claimAt(file);
      if (claimMatchesReceipt(claim, receipt, child)) {
        matches.push({ file, receipt, claimed: true });
      }
    } else matches.push({ file, receipt, claimed: false });
  }
  if (matches.length === 0) return null;
  if (matches.length !== 1) fail('SPAWN_AMBIGUOUS', 'cannot uniquely match child to one spawn');
  const { file, receipt, claimed } = matches[0];
  const value = receipt.value;
  if (value.spawnKind === 'exec' && !claimed && eligibleExec !== 1) {
    fail('SPAWN_AMBIGUOUS', 'exec child has multiple protected pending receipts');
  }
  if (value.parentSessionId !== parent || value.sourceHome !== sourceHome(root, value.rootSessionId, codexHome)) {
    fail('SOURCE_ROOT', 'child source home differs from frozen spawn');
  }
  const act = activation(value.rootSessionId, root);
  if (!act || act.activation_id !== value.activationId) fail('ACTIVATION_INACTIVE', 'spawn activation has ended');
  const parentRecords = rollout(root, value.rootSessionId, parent, codexHome);
  if (value.spawnKind === 'direct') requireSpawnWitness(parentRecords, value);
  else if (nativeSpawn(parentRecords, value.toolUseDigest, value.turnId,
    value.agentType, value.taskName)) fail('SPAWN_WITNESS', 'exec receipt conflicts with a direct spawn');
  if (aborted(parentRecords, value.turnId)) fail('PARENT_ABORTED', 'parent spawn turn was aborted');
  // A later normal Stop is allowed only for a claim already bound before it.
  if (!claimed) {
    const latestTurn = parentRecords.filter(row => row?.type === 'turn_context').at(-1)?.payload?.turn_id;
    if (latestTurn !== value.turnId) fail('PARENT_CLOSED', 'unbound spawn is not in the current parent turn');
    if (parent === value.rootSessionId) {
      const observed = attestPendingProjectEvent({ gstackRoot: root, sessionId: parent,
        boundaryId: value.turnId, cwd: value.cwd, observation: 'pre-tool', codexHome });
      const authority = activeProjectAuthority(observed.state,
        { eventId: value.parentEventId, boundaryId: value.turnId, cwd: value.cwd });
      if (!authority || !sameBinding(authority.binding, value.binding)) {
        fail('PARENT_CLOSED', 'unbound spawn has lost its frozen parent binding');
      }
    } else {
      const inherited = resolveCodexChildProject({ gstackRoot: root,
        childSessionId: parent, cwd: value.cwd, codexHome });
      if (!inherited?.active || `child:${inherited.receiptDigest}` !== value.parentEventId) {
        fail('PARENT_CLOSED', 'unbound nested spawn has lost its active parent task');
      }
      if (!sameBinding(inherited.binding, value.binding)) {
        fail('PARENT_CLOSED', 'unbound nested spawn has lost its frozen binding');
      }
    }
  }
  if (!claimed) {
    try { writeOnce(`${file}.claim`, { schema_version: 1, childSessionId: child,
      receiptDigest: receipt.digest, parentSessionId: parent, agentType: role,
      turnId: value.turnId, toolUseDigest: value.toolUseDigest, spawnKind: value.spawnKind,
      activationId: value.activationId, cwd: value.cwd }); }
    catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      const concurrent = claimAt(file);
      if (!claimMatchesReceipt(concurrent, receipt, child)) {
        fail('CLAIM_CONFLICT', 'spawn was claimed by another child');
      }
    }
  }
  return { receiptId: value.receiptId, receiptDigest: receipt.digest, childSessionId: child };
}

function resolveCodexChildProjectEdge({
  gstackRoot, projectsRoot = PROJECTS_ROOT, childSessionId, cwd, codexHome = '',
}, visited) {
  const child = id(childSessionId, 'child session');
  if (visited.has(child) || visited.size >= 32) {
    fail('ANCESTRY_CYCLE', 'native child ancestry is cyclic or exceeds the depth bound');
  }
  visited.add(child);
  const root = canonical(gstackRoot, 'gstack root');
  // Find the frozen claim before opening the transcript: a host-launched root
  // can carry an exact trusted source scope that the child SID itself lacks.
  const hit = claimForChild(root, child);
  if (!hit) return null;
  const { receipt, claim } = hit;
  const value = receipt.value;
  const records = rollout(root, value.rootSessionId, child, codexHome);
  const meta = childMeta(records, child);
  const parent = id(meta.parent_thread_id, 'native parent session');
  const spawn = meta.source?.subagent?.thread_spawn;
  // Codex records the built-in default agent as a null native role.
  const role = spawn?.agent_role == null ? 'default'
    : id(spawn.agent_role, 'native agent role', ROLE);
  if (meta.session_id !== parent
      || (meta.forked_from_id != null && meta.forked_from_id !== parent)
      || meta.thread_source !== 'subagent' || spawn?.parent_thread_id !== parent
      || spawn?.depth !== value.expectedDepth
      || (spawn.agent_path != null && (typeof spawn.agent_path !== 'string' || !spawn.agent_path))) {
    fail('SOURCE_INVALID', 'native child ancestry fields disagree');
  }
  if (!claimMatchesReceipt(claim, receipt, child) || value.agentType !== role
      || value.parentSessionId !== parent) {
    fail('CLAIM_MISMATCH', 'native child does not match frozen spawn claim');
  }
  if (value.taskName && ((value.spawnKind === 'direct' && typeof spawn.agent_path !== 'string')
      || (spawn.agent_path != null
        && spawn.agent_path.split('/').filter(Boolean).at(-1) !== value.taskName))) {
    fail('CLAIM_MISMATCH', 'native child task path differs from frozen spawn');
  }
  if (value.sourceHome !== sourceHome(root, value.rootSessionId, codexHome)) {
    fail('SOURCE_ROOT', 'child source home differs from frozen spawn');
  }
  if (cwd !== undefined && canonical(cwd, 'child working directory') !== value.cwd) {
    fail('CWD_MISMATCH', 'child cwd differs from frozen spawn');
  }
  if (meta.cwd !== undefined && meta.cwd !== value.cwd) fail('CWD_MISMATCH', 'native child cwd differs from spawn');
  const act = activation(value.rootSessionId, root);
  if (!act || act.activation_id !== value.activationId) return null;
  const parentRecords = rollout(root, value.rootSessionId, parent, codexHome);
  if (value.spawnKind === 'direct') requireSpawnWitness(parentRecords, value);
  else if (nativeSpawn(parentRecords, value.toolUseDigest, value.turnId,
    value.agentType, value.taskName)) fail('SPAWN_WITNESS', 'exec receipt conflicts with a direct spawn');
  if (aborted(parentRecords, value.turnId) || aborted(records)) return null;
  verifyProjectBinding(value.binding, projectsRoot);
  if (parent !== value.rootSessionId) {
    const ancestor = resolveCodexChildProjectEdge({ gstackRoot: root, projectsRoot,
      childSessionId: parent, cwd: value.cwd, codexHome }, visited);
    if (!ancestor) return null;
    if (value.parentEventId !== `child:${ancestor.receiptDigest}`
        || ancestor.rootSessionId !== value.rootSessionId
        || value.expectedDepth !== ancestor.depth + 1
        || ['project', 'realpath', 'dev', 'ino', 'epoch'].some(field =>
          value.binding[field] !== ancestor.binding[field])) {
      fail('ANCESTRY_MISMATCH', 'frozen child binding differs from verified ancestor');
    }
  }
  return {
    binding: value.binding, origin: 'codex-child', parentSessionId: parent,
    rootSessionId: value.rootSessionId, receiptDigest: receipt.digest,
    receiptId: value.receiptId, active: currentTaskActive(records), depth: value.expectedDepth,
  };
}

export function resolveCodexChildProject(options) {
  return resolveCodexChildProjectEdge(options, new Set());
}
