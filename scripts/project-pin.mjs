#!/usr/bin/env node
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { dirname, join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import {
  PROJECTS_ROOT,
  PROJECT_STATE_SCHEMA,
  atomicProjectStateCas,
  canonicalProjectIdentity,
  inspectProjectStateLock,
  inspectOrphanedActiveProjectEvent,
  migrateLegacyProjectState,
  readProjectState,
  refenceProjectStateForDeactivate,
  removeProjectStateCas,
  recoverProjectStateLock,
  quarantineLegacyProjectState,
  sanitizeSessionId,
  validateProjectName,
  validatedBindingForState,
} from '../.claude/hooks/lib/project-substrate.mjs';
import { acquireProjectLease, releaseProjectLease } from './project-lease.mjs';
import {
  hostViewExitCode,
  projectHostInvalidView,
  projectListHostView,
  projectStatusHostView,
} from '../.claude/hooks/lib/project-host-view.mjs';
import {
  authorizePublicSelection,
  minimalProjectContext,
  projectReservationPath,
  readProjectReservation,
} from '../.claude/hooks/lib/project-selection.mjs';
import { discoverControlState } from './controlled-change.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function roots() {
  return {
    gstackRoot: realpathSync(resolve(process.env.LUCA_GSTACK_ROOT || process.env.CLAUDE_PROJECT_DIR || REPO_ROOT)),
    projectsRoot: realpathSync(resolve(process.env.LUCA_PROJECTS_ROOT || PROJECTS_ROOT)),
  };
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function parseHostCli(command, argv) {
  if (command === 'list') {
    if (argv.length === 0) return { requested: false };
    if (argv.length !== 2 || argv[0] !== '--view' || argv[1] !== 'host') {
      return { requested: true, error: 'list host view requires exactly: --view host' };
    }
    return { requested: true, values: {} };
  }
  if (command !== 'status' || !argv.includes('--view')) return { requested: false };
  const allowed = new Set(['--view', '--session-id', '--operation']);
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(key)) return { requested: true, error: `unknown host view option: ${key || '<empty>'}` };
    if (Object.hasOwn(values, key)) return { requested: true, error: `duplicate host view option: ${key}` };
    if (!value || value.startsWith('--')) return { requested: true, error: `missing host view value for: ${key}` };
    values[key] = value;
  }
  if (values['--view'] !== 'host') return { requested: true, error: '--view must equal host' };
  if (!values['--session-id']) return { requested: true, error: 'status host view requires --session-id' };
  return { requested: true, values };
}

function fault(name) {
  if (process.env.LUCA_PROJECT_FAULT === name) throw new Error(`injected project transaction fault: ${name}`);
}

function linkPaths(gstackRoot) {
  return [
    { path: join(gstackRoot, 'docs'), key: 'docs' },
    { path: join(gstackRoot, '.claude', 'workflow-state.yaml'), key: 'state' },
    { path: join(gstackRoot, '.claude', 'current-topic.txt'), key: 'topic' },
  ];
}

function captureLink(path) {
  try {
    const st = lstatSync(path);
    if (!st.isSymbolicLink()) throw new Error(`shared display path is not a symlink: ${path}`);
    return { kind: 'symlink', target: readlinkSync(path) };
  } catch (error) {
    if (error?.code === 'ENOENT') return { kind: 'absent' };
    throw error;
  }
}

function replaceLink(path, target) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tx-${process.pid}-${randomUUID()}`;
  symlinkSync(target, tmp);
  renameSync(tmp, path);
}

function restoreLink(path, snapshot) {
  if (snapshot.kind === 'symlink') return replaceLink(path, snapshot.target);
  try {
    if (lstatSync(path).isSymbolicLink()) unlinkSync(path);
    else throw new Error(`cannot restore absent link over non-symlink: ${path}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function assertLink(path, target) {
  const st = lstatSync(path);
  if (!st.isSymbolicLink() || readlinkSync(path) !== target) throw new Error(`link readback mismatch: ${path}`);
}

function proposalFields(state) {
  const sw = state?.switch;
  const control = state?.event_control;
  const event = control?.current;
  if (state?.schema_version !== PROJECT_STATE_SCHEMA || state?.state !== 'SWITCH_ONLY' || !sw) {
    throw new Error('session is not in an attested SWITCH_ONLY event');
  }
  if (!control || !Array.isArray(control.candidates) || !Array.isArray(control.consumed_events)
      || !event || event.status !== 'active'
      || !String(event.event_id || '') || !String(event.boundary_id || '')
      || event.event_id !== sw.event_id || event.boundary_id !== sw.boundary_id
      || !control.consumed_events.some(item => item?.event_id === event.event_id
        && item?.boundary_id === event.boundary_id)) {
    throw new Error('SWITCH_ONLY lacks matching native event authority');
  }
  return sw;
}

export function executeProjectTransaction({ sessionId, tx, operation, target, expectedEpoch }) {
  const sid = sanitizeSessionId(sessionId);
  const op = String(operation || '');
  const project = validateProjectName(target);
  const expected = Number(expectedEpoch);
  if (!sid || !['switch', 'new'].includes(op) || !Number.isSafeInteger(expected) || expected < 0) throw new Error('invalid transaction arguments');
  const { gstackRoot, projectsRoot } = roots();
  let current = readProjectState(gstackRoot, sid);
  const initial = current;
  const authorizeController = (mode, trustedRecord) => {
    if (!existsSync(join(gstackRoot, '.git'))) return;
    const controlled = discoverControlState(gstackRoot);
    if (controlled.kind === 'invalid') throw new Error(`controlled state invalid: ${controlled.reason}`);
    if (controlled.kind === 'required') {
      authorizePublicSelection({
        manifest: controlled.current.manifest,
        selection: { operation: op, target: project, session_id: sid, tx, expected_epoch: expected },
        projectsRoot,
        mode,
        trustedRecord,
      });
    }
  };
  const priorReceipts = Array.isArray(initial.value.selection?.receipts) ? initial.value.selection.receipts : [];
  const replay = priorReceipts.find(item => item?.operation_id === tx);
  if (replay) {
    if (replay.kind !== op || replay.target !== project || replay.expected_epoch !== expected) {
      throw new Error('replayed operation id does not match its committed receipt');
    }
    if (replay.status !== 'COMMITTED') {
      throw new Error(`operation ${tx} is terminal ${replay.status}; it is not executable authority`);
    }
    authorizeController('replay', replay);
    return { ...initial.value, replayed: true, operation_receipt: replay };
  }
  const proposal = proposalFields(initial.value);
  if (proposal.tx !== tx || proposal.operation !== op || proposal.target !== project || proposal.expected_epoch !== expected) {
    throw new Error('switch transaction does not match prepared tx/operation/target/epoch');
  }
  const oldBinding = validatedBindingForState(initial.value, projectsRoot);
  if ((oldBinding?.epoch || 0) !== expected) throw new Error('stale expected epoch');
  const targetRoot = join(projectsRoot, project);
  let created = false;
  let staging = join(projectsRoot, `.luca-staging-${tx}`);
  // Resolve the control-plane reservation path before the controller authorization
  // recheck. A recovery can be rejected there (for example because the durable
  // CONTEXT postimage drifted). The catch path still needs this exact reservation
  // to preserve the already-created phase instead of publishing a false
  // FAILED/created=false receipt for bytes that remain on disk.
  let reservationPath = op === 'new' ? projectReservationPath(projectsRoot, project) : '';
  let reservation = null;
  let committed = null;
  let ownsExecution = false;
  const refreshPending = (patch) => {
    const pending = current.value.selection?.pending || current.value.switch;
    if (!pending || pending.tx !== tx || current.value.state !== 'SWITCH_ONLY') {
      throw new Error('selection pending state changed during transaction');
    }
    const updated = { ...pending, ...patch };
    const next = {
      ...current.value,
      switch: { ...current.value.switch, ...patch },
      selection: { ...(current.value.selection || {}), pending: updated },
    };
    atomicProjectStateCas(gstackRoot, sid, current.raw, next);
    current = readProjectState(gstackRoot, sid);
  };
  const claimExecution = () => {
    const pending = current.value.selection?.pending || current.value.switch;
    const status = String(pending?.status || 'PREPARED');
    if (!pending || pending.tx !== tx || !['PREPARED', 'RUNNING', 'CREATING'].includes(status)) {
      throw new Error('selection is not claimable by this transaction');
    }
    if (['RUNNING', 'CREATING'].includes(status) && Number.isSafeInteger(pending.owner_pid)
        && pending.owner_pid > 0 && pending.owner_pid !== process.pid) {
      let alive = true;
      try { process.kill(pending.owner_pid, 0); }
      catch (error) { alive = error?.code !== 'ESRCH'; }
      if (alive) {
        const busy = new Error('selection controller is already running');
        busy.code = 'SELECTION_BUSY';
        throw busy;
      }
    }
    refreshPending({ status: status === 'CREATING' ? 'CREATING' : 'RUNNING', owner_pid: process.pid,
      created: Boolean(pending.created), bound: false });
    ownsExecution = true;
  };
  const writeReservation = (value, exclusive = false) => {
    if (exclusive) writeFileSync(reservationPath, `${JSON.stringify(value)}\n`, { flag: 'wx' });
    else {
      const tmp = `${reservationPath}.tmp-${process.pid}-${randomUUID()}`;
      writeFileSync(tmp, `${JSON.stringify(value)}\n`, { flag: 'wx' });
      renameSync(tmp, reservationPath);
    }
  };
  try {
    // This CAS is the execution ownership boundary. No project-directory or
    // binding side effect occurs while the proposal is merely PREPARED.
    claimExecution();
    authorizeController(op === 'new' ? 'recover' : 'prepare',
      current.value.selection?.pending || current.value.switch);
    if (process.env.LUCA_PROJECT_FAULT === 'crash-after-execution-claim') process.exit(86);
    if (op === 'switch') {
      canonicalProjectIdentity(project, projectsRoot);
    } else {
      reservation = readProjectReservation(projectsRoot, project).value;
      if (!reservation) {
        if (existsSync(targetRoot)) throw new Error(`new project already exists: ${project}`);
        reservation = {
          schema_version: 1, operation: 'new', tx, session_id: sid, target: project,
          phase: 'RESERVED', staging, dev: null, ino: null,
        };
        writeReservation(reservation, true);
      } else if (reservation.schema_version !== 1 || reservation.operation !== 'new'
          || reservation.tx !== tx || reservation.session_id !== sid || reservation.target !== project) {
        throw new Error(`new project target is reserved by another operation: ${project}`);
      }
      refreshPending({ status: 'CREATING', phase: reservation.phase, owner_pid: process.pid,
        created: reservation.dev != null, bound: false });

      if (!existsSync(staging)) mkdirSync(staging);
      else if (!statSync(staging).isDirectory()) throw new Error('new staging identity is not a directory');
      const stagingContext = join(staging, 'CONTEXT.md');
      const expectedContext = minimalProjectContext(project);
      if (!existsSync(stagingContext)) writeFileSync(stagingContext, expectedContext, { flag: 'wx' });
      else if (readFileSync(stagingContext, 'utf8') !== expectedContext) throw new Error('new staging CONTEXT.md has unexpected bytes');
      fault('after-new-staging');

      if (!existsSync(targetRoot)) {
        if (process.env.LUCA_PROJECT_FAULT === 'empty-target-race') mkdirSync(targetRoot);
        try { mkdirSync(targetRoot); }
        catch (error) { throw new Error(`new project lost creation race without replacing target: ${error.message}`); }
        const targetStat = statSync(targetRoot);
        reservation = { ...reservation, phase: 'DIRECTORY_CREATED', dev: Number(targetStat.dev), ino: Number(targetStat.ino) };
        writeReservation(reservation);
      } else {
        const targetStat = statSync(targetRoot);
        if (!targetStat.isDirectory() || Number(targetStat.dev) !== reservation.dev || Number(targetStat.ino) !== reservation.ino) {
          throw new Error('existing new-project target is not owned by this reservation');
        }
      }
      created = true;
      refreshPending({ status: 'CREATING', phase: 'DIRECTORY_CREATED', owner_pid: process.pid, created: true, bound: false });
      fault('after-new-mkdir');

      const finalContext = join(targetRoot, 'CONTEXT.md');
      if (!existsSync(finalContext)) renameSync(stagingContext, finalContext);
      else if (readFileSync(finalContext, 'utf8') !== expectedContext) throw new Error('new target CONTEXT.md has unexpected bytes');
      reservation = { ...reservation, phase: 'READY' };
      writeReservation(reservation);
      refreshPending({ status: 'CREATING', phase: 'READY', owner_pid: process.pid, created: true, bound: false });
      fault('after-new-context');
    }

    const identity = canonicalProjectIdentity(project, projectsRoot);
    fault('after-target-validate');
    const sameIdentity = oldBinding && ['project', 'realpath', 'dev', 'ino'].every(field => oldBinding[field] === identity[field]);
    const binding = { ...identity, epoch: sameIdentity ? oldBinding.epoch : expected + 1 };
    const priorSelection = current.value.selection || {};
    const currentReceipts = Array.isArray(priorSelection.receipts) ? priorSelection.receipts : priorReceipts;
    const streamId = priorSelection.stream_id || randomUUID();
    const sequence = Number.isSafeInteger(priorSelection.commit_sequence) ? priorSelection.commit_sequence + 1 : 1;
    const committedAt = new Date().toISOString();
    const receipt = {
      operation_id: tx, kind: op, target: project, status: 'COMMITTED',
      created, bound: true, commit_id: tx, expected_epoch: expected,
      binding_epoch: binding.epoch, committed_at: committedAt, error_code: null,
      proposal: { tx, operation: op, target: project, expected_epoch: expected,
        event_id: proposal.event_id, boundary_id: proposal.boundary_id },
    };
    const selectionCommit = {
      stream_id: streamId, sequence, commit_id: tx, kind: op, target: project,
      binding_epoch: binding.epoch, committed_at: committedAt,
      origin: 'agent_user_selection',
    };
    const next = {
      schema_version: PROJECT_STATE_SCHEMA,
      state: 'TURN_ACTIVE',
      session_id: sid,
      binding,
      turn: {
        event_id: proposal.event_id,
        boundary_id: proposal.boundary_id,
        epoch: binding.epoch,
      },
      selection: {
        stream_id: streamId,
        commit_sequence: sequence,
        pending: null,
        receipts: [...currentReceipts, receipt],
        latest_operation: receipt,
        last_success: selectionCommit,
      },
      event_control: initial.value.event_control,
    };
    const priorStateLockFault = process.env.LUCA_PROJECT_STATE_LOCK_FAULT;
    if (process.env.LUCA_PROJECT_COMMIT_STATE_LOCK_FAULT) {
      process.env.LUCA_PROJECT_STATE_LOCK_FAULT = process.env.LUCA_PROJECT_COMMIT_STATE_LOCK_FAULT;
    }
    try { atomicProjectStateCas(gstackRoot, sid, current.raw, next); }
    finally {
      if (process.env.LUCA_PROJECT_COMMIT_STATE_LOCK_FAULT) {
        if (priorStateLockFault === undefined) delete process.env.LUCA_PROJECT_STATE_LOCK_FAULT;
        else process.env.LUCA_PROJECT_STATE_LOCK_FAULT = priorStateLockFault;
      }
    }
    committed = next;
    let cleanupWarning = null;
    if (op === 'new') {
      try {
        reservation = { ...reservation, phase: 'COMMITTED' };
        writeReservation(reservation);
        fault('after-binding-before-cleanup');
        if (existsSync(staging)) {
          if (readdirSync(staging).length !== 0) throw new Error('staging is not empty after publish');
          rmdirSync(staging);
        }
        const liveReservation = readProjectReservation(projectsRoot, project).value;
        const live = statSync(targetRoot);
        if (!liveReservation || liveReservation.tx !== tx
            || Number(live.dev) !== liveReservation.dev || Number(live.ino) !== liveReservation.ino) {
          throw new Error('reservation cleanup ownership changed');
        }
        unlinkSync(reservationPath);
      } catch (error) {
        cleanupWarning = String(error?.message || error);
      }
    }
    return cleanupWarning ? { ...next, cleanup_warning: cleanupWarning } : next;
  } catch (error) {
    if (committed) return { ...committed, cleanup_warning: String(error?.message || error) };
    if (!ownsExecution) throw error;
    try {
      current = readProjectState(gstackRoot, sid);
      const pending = current.value.selection?.pending;
      if (pending?.tx === tx) {
        const finishTerminal = (status, errorCode, wasCreated = false, phase = null) => {
          const terminal = {
            operation_id: tx, kind: op, target: project, status, created: wasCreated, bound: false,
            commit_id: null, expected_epoch: expected, binding_epoch: oldBinding?.epoch || null,
            committed_at: null, error_code: errorCode,
            ...(phase ? { phase } : {}),
          };
          const selection = current.value.selection || {};
          const next = {
            schema_version: PROJECT_STATE_SCHEMA,
            state: oldBinding ? 'TURN_ACTIVE' : 'NO_PIN',
            session_id: sid,
            ...(oldBinding ? { binding: oldBinding, turn: { event_id: proposal.event_id,
              boundary_id: proposal.boundary_id, epoch: oldBinding.epoch } } : {}),
            selection: { ...selection, pending: null,
              receipts: [...(Array.isArray(selection.receipts) ? selection.receipts : []), terminal],
              latest_operation: terminal },
            event_control: current.value.event_control,
          };
          atomicProjectStateCas(gstackRoot, sid, current.raw, next);
        };
        if (op === 'new' && reservationPath && existsSync(reservationPath)) {
          const owner = readProjectReservation(projectsRoot, project).value;
          const exactOwner = owner?.schema_version === 1 && owner.tx === tx
            && owner.session_id === sid && owner.operation === 'new' && owner.target === project;
          if (!exactOwner) {
            finishTerminal('FAILED', 'TARGET_RESERVED');
            throw error;
          }
          let ownershipUnknown = false;
          if (owner?.dev == null || owner?.ino == null) {
            ownershipUnknown = existsSync(targetRoot);
          } else if (!existsSync(targetRoot)) {
            ownershipUnknown = true;
          } else {
            const actual = statSync(targetRoot);
            ownershipUnknown = Number(actual.dev) !== owner.dev || Number(actual.ino) !== owner.ino;
          }
          if (ownershipUnknown) {
            finishTerminal('OWNERSHIP_UNKNOWN', 'OWNERSHIP_UNKNOWN', false, owner?.phase || pending.phase || 'RESERVED');
          } else {
            refreshPending({ status: 'CREATING', phase: owner?.phase || pending.phase || 'RESERVED',
              owner_pid: process.pid, created: Boolean(owner?.dev != null), bound: false,
              error_code: String(error?.code || 'CREATE_INTERRUPTED') });
          }
        } else {
          finishTerminal('FAILED', String(error?.code || 'SELECTION_FAILED'));
        }
      }
    } catch { /* preserve the original transaction failure */ }
    throw error;
  }
}

function injectProjectContext(project) {
  const { projectsRoot } = roots();
  const name = validateProjectName(project);
  const identity = canonicalProjectIdentity(name, projectsRoot);
  const memory = join(identity.realpath, '.luca', 'memory', 'MEMORY.md');
  const context = join(identity.realpath, 'CONTEXT.md');
  const chunks = [];
  if (existsSync(memory)) chunks.push(`🧠 项目本地记忆（${name}）:\n${readFileSync(memory, 'utf8')}`);
  if (existsSync(context)) chunks.push(`📌 项目 CONTEXT（${name}）:\n${readFileSync(context, 'utf8').split('\n').slice(0, 100).join('\n')}`);
  return chunks.join('\n\n');
}

function deactivateProject(sessionId) {
  const sid = sanitizeSessionId(sessionId);
  const { gstackRoot, projectsRoot } = roots();
  const current = readProjectState(gstackRoot, sid);
  if (!['NO_PIN', 'BOUND', 'TURN_CLOSED'].includes(current.value.state)) throw new Error(`deactivate requires NO_PIN or a closed binding, got ${current.value.state}`);
  const binding = validatedBindingForState(current.value, projectsRoot);
  const leaseToken = `${sid}-deactivate-${randomUUID()}`;
  const lease = acquireProjectLease({ root: gstackRoot, ownerToken: leaseToken, pid: process.pid });
  const snapshots = new Map();
  let touched = false;
  let committedResult = null;
  let primaryError = null;
  try {
    // NO_PIN recovery must not consult or touch another session's display links.
    const expectedTargets = new Map(binding ? [
      [join(gstackRoot, 'docs'), join(binding.realpath, 'docs')],
      [join(gstackRoot, '.claude', 'workflow-state.yaml'), join(binding.realpath, '.luca', 'workflow-state.yaml')],
      [join(gstackRoot, '.claude', 'current-topic.txt'), join(binding.realpath, '.luca', 'current-topic.txt')],
    ] : []);
    for (const [path, target] of expectedTargets) {
      const snapshot = captureLink(path);
      snapshots.set(path, snapshot);
      if (snapshot.kind === 'symlink' && snapshot.target === target) { unlinkSync(path); touched = true; }
    }
    // A fenced state is re-fenced instead of deleted so the session can still attest and
    // switch; only a state with no fence to rebuild from is removed.
    const refenced = refenceProjectStateForDeactivate({
      gstackRoot, sessionId: sid, expectedRaw: current.raw, codexHome: process.env.CODEX_HOME || '',
    });
    if (!refenced) removeProjectStateCas(gstackRoot, sid, current.raw);
    committedResult = { state: 'NO_PIN', deactivated: binding?.project || null,
      recovery: 'authority removed; submit a new human prompt. If an earlier prompt flushes later, repeat deactivate after it is visible.' };
    return committedResult;
  } catch (error) {
    primaryError = error;
    if (touched) for (const [path, snapshot] of snapshots) restoreLink(path, snapshot);
    throw error;
  } finally {
    try {
      fault('before-lease-release');
      const released = releaseProjectLease({ root: gstackRoot, ownerHandle: lease.owner_handle });
      if (released.cleanup_required) {
        if (committedResult) committedResult.lease_release = released;
        process.stderr.write(`[project-pin] ⚠️ lease 已释放，但精确残留清理失败（不应重试解绑）：${released.parked_path} — ${released.error}\n`);
      }
    } catch (error) {
      const warning = {
        released: false,
        recovery_required: true,
        error: String(error?.message || error),
        owner_handle: lease.owner_handle,
      };
      if (committedResult) {
        committedResult.lease_release = warning;
        process.stderr.write(`[project-pin] ⚠️ 项目解绑已提交，但 lease 释放失败；禁止重试解绑，请按 owner_handle 显式恢复：${warning.error}\n`);
      } else {
        process.stderr.write(`[project-pin] ⚠️ 项目解绑未提交且 lease 释放失败，需按 owner_handle 显式恢复：${warning.error}\n`);
        if (!primaryError) throw error;
      }
    }
  }
}

function recoverSession(sessionId) {
  const sid = sanitizeSessionId(sessionId);
  const { gstackRoot, projectsRoot } = roots();
  const snapshot = inspectOrphanedActiveProjectEvent({
    gstackRoot, projectsRoot, sessionId: sid, codexHome: process.env.CODEX_HOME || '',
  });
  const refenced = refenceProjectStateForDeactivate({
    gstackRoot, sessionId: sid, expectedRaw: snapshot.raw, codexHome: process.env.CODEX_HOME || '',
  });
  if (!refenced) throw new Error('orphan recovery requires a durable native source fence');
  return { state: 'NO_PIN', recovered: true,
    recovery: 'old authority removed without touching project data or shared links; submit a new human project prompt' };
}

function status(sessionId, operationId = '') {
  if (operationId && !/^[A-Za-z0-9-]{8,128}$/.test(String(operationId))) {
    throw new Error('operation id is not canonical');
  }
  const { gstackRoot } = roots();
  const state = readProjectState(gstackRoot, sessionId).value;
  const receipts = Array.isArray(state.selection?.receipts) ? state.selection.receipts : [];
  const receipt = operationId ? receipts.find(item => item?.operation_id === operationId) : null;
  return {
    ...state,
    queried_receipt: operationId
      ? (receipt ? { lookup: 'FOUND', receipt } : { lookup: 'EXPIRED_OR_UNKNOWN', receipt: null })
      : null,
    execution_authority: 'NOT_PROVIDED',
  };
}

async function cli() {
  const command = process.argv[2];
  const hostCli = parseHostCli(command, process.argv.slice(3));
  const hostValues = hostCli.values || {};
  const sessionId = hostCli.requested ? (hostValues['--session-id'] || '') : (arg('--session') || arg('--session-id'));
  const hostView = hostCli.requested;
  const projectionView = hostView || command === 'list' || command === 'status';
  const base = projectionView ? {
    gstackRoot: realpathSync(resolve(process.env.LUCA_GSTACK_ROOT || process.env.CLAUDE_PROJECT_DIR || REPO_ROOT)),
    projectsRoot: resolve(process.env.LUCA_PROJECTS_ROOT || PROJECTS_ROOT),
  } : roots();
  let result;
  if (hostCli.error) {
    result = projectHostInvalidView({ command, sessionId, message: hostCli.error });
    process.exitCode = hostViewExitCode(result);
  } else if (['prepare', 'begin-turn', 'close-turn', 'close-switch-turn'].includes(command)) {
    throw new Error(`${command} raw turn-id authority is retired; use UserPromptSubmit candidate plus native event attestation`);
  } else if (command === 'list' && hostView) {
    result = projectListHostView({ projectsRoot: base.projectsRoot });
    process.exitCode = hostViewExitCode(result);
  } else if (command === 'status' && hostView) {
    result = projectStatusHostView({
      gstackRoot: base.gstackRoot,
      projectsRoot: base.projectsRoot,
      sessionId,
      operationId: hostValues['--operation'] || '',
    });
    process.exitCode = hostViewExitCode(result);
  } else if (command === 'list') {
    result = projectListHostView({ projectsRoot: base.projectsRoot });
    process.exitCode = hostViewExitCode(result);
  } else if (command === 'status') {
    result = status(sessionId, arg('--operation') || '');
  } else if (command === 'inspect-state-lock') {
    result = inspectProjectStateLock(base.gstackRoot, sessionId);
  } else if (command === 'recover-state-lock') {
    result = recoverProjectStateLock(base.gstackRoot, sessionId, JSON.parse(arg('--handle-json') || 'null'));
  } else if (command === 'recover-session') {
    result = recoverSession(sessionId);
  } else if (command === 'migrate-legacy-pin') {
    result = migrateLegacyProjectState(base.gstackRoot, sessionId, base.projectsRoot);
  } else if (command === 'quarantine-legacy-pin') {
    result = quarantineLegacyProjectState(base.gstackRoot, sessionId, arg('--expected-project'));
  } else if (command === 'inject') {
    process.stdout.write(`${injectProjectContext(arg('--target'))}\n`);
    return;
  } else if (command === 'deactivate') {
    result = deactivateProject(sessionId);
  } else if (command === 'switch' || command === 'new') {
    result = executeProjectTransaction({
      sessionId,
      tx: arg('--tx'),
      operation: command,
      target: arg('--target'),
      expectedEpoch: arg('--expected-epoch'),
    });
  } else {
    throw new Error('usage: project-pin.mjs <status|switch|new|recover-session|inspect-state-lock|recover-state-lock|migrate-legacy-pin|quarantine-legacy-pin> ...');
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  cli().catch((error) => {
    process.stderr.write(`[project-pin] ${error.message}\n`);
    process.exitCode = 1;
  });
}
