import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import {
  PROJECTS_ROOT,
  canonicalProjectIdentity,
  listProjects,
  projectStatePath,
  readProjectState,
  sanitizeSessionId,
  validateProjectName,
  validatedBindingForState,
} from './project-substrate.mjs';

export const PROJECT_HOST_VIEW_VERSION = 1;

function errorValue(code, message) {
  return { code, message: String(message || code).slice(0, 300) };
}

function strictSessionId(value) {
  const raw = String(value || '');
  const sanitized = sanitizeSessionId(raw);
  if (!raw || raw !== sanitized || !/^[\w-]{1,36}$/.test(raw)) throw new Error('session id is not canonical');
  return raw;
}

const OPERATION_STATES = new Set([
  'PREPARED', 'RUNNING', 'CREATING', 'COMMITTED', 'FAILED', 'SUPERSEDED',
  'OWNERSHIP_UNKNOWN', 'EXPIRED_OR_UNKNOWN',
]);

function validateOperation(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('operation record is invalid');
  const operationId = String(item.operation_id || item.tx || '');
  const kind = String(item.kind || item.operation || '');
  const status = String(item.status || '');
  if (!/^[A-Za-z0-9-]{8,128}$/.test(operationId) || !['switch', 'new'].includes(kind)
      || !OPERATION_STATES.has(status)) throw new Error('operation identity is invalid');
  validateProjectName(item.target);
  if (item.created != null && typeof item.created !== 'boolean') throw new Error('operation created flag is invalid');
  if (item.bound != null && typeof item.bound !== 'boolean') throw new Error('operation bound flag is invalid');
  if (item.commit_id != null && typeof item.commit_id !== 'string') throw new Error('operation commit id is invalid');
  if (status !== 'COMMITTED' && item.commit_id != null) throw new Error('uncommitted operation cannot publish a commit id');
  return item;
}

function validateSelection(selection) {
  if (selection == null) return null;
  if (typeof selection !== 'object' || Array.isArray(selection)) throw new Error('selection state is invalid');
  if (selection.pending != null) validateOperation(selection.pending);
  const receipts = selection.receipts == null ? [] : selection.receipts;
  if (!Array.isArray(receipts)) throw new Error('selection receipts are invalid');
  for (const receipt of receipts) validateOperation(receipt);
  if (selection.latest_operation != null) validateOperation(selection.latest_operation);
  const success = selection.last_success;
  if (success != null) {
    if (typeof success !== 'object' || Array.isArray(success)
        || !String(success.stream_id || '') || !/^[A-Za-z0-9-]{8,128}$/.test(String(success.commit_id || ''))
        || !Number.isSafeInteger(success.sequence) || success.sequence < 1
        || !['switch', 'new'].includes(success.kind)
        || !Number.isSafeInteger(success.binding_epoch) || success.binding_epoch < 1
        || !String(success.committed_at || '') || success.origin !== 'agent_user_selection') {
      throw new Error('selection commit is invalid');
    }
    validateProjectName(success.target);
    if (selection.stream_id !== success.stream_id || selection.commit_sequence !== success.sequence) {
      throw new Error('selection commit counter is inconsistent');
    }
  } else if (selection.stream_id != null || selection.commit_sequence != null) {
    if (!String(selection.stream_id || '') || !Number.isSafeInteger(selection.commit_sequence)
        || selection.commit_sequence < 0) throw new Error('selection stream is invalid');
  }
  return { selection, receipts };
}

function operationView(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    operation_id: String(item.operation_id || item.tx || ''),
    kind: String(item.kind || item.operation || ''),
    target: String(item.target || ''),
    status: String(item.status || ''),
    created: Boolean(item.created),
    bound: Boolean(item.bound),
    commit_id: item.commit_id ? String(item.commit_id) : null,
    error_code: item.error_code ? String(item.error_code) : null,
  };
}

function receiptView(item) {
  const base = operationView(item);
  return base ? {
    ...base,
    binding_epoch: Number.isSafeInteger(item.binding_epoch) ? item.binding_epoch : null,
    committed_at: item.committed_at ? String(item.committed_at) : null,
  } : null;
}

function selectionCommitView(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    stream_id: String(item.stream_id || ''),
    sequence: Number(item.sequence),
    commit_id: String(item.commit_id || ''),
    kind: String(item.kind || ''),
    target: String(item.target || ''),
    binding_epoch: Number(item.binding_epoch),
    committed_at: String(item.committed_at || ''),
    origin: item.origin === 'agent_user_selection' ? item.origin : 'unknown',
  };
}

function statusBase(sessionId, readStatus, error = null) {
  return {
    api_version: PROJECT_HOST_VIEW_VERSION,
    session_id: sessionId,
    read_status: readStatus,
    snapshot_id: null,
    state: null,
    binding_validation: 'UNKNOWN',
    current_binding: null,
    current_operation: null,
    queried_receipt: null,
    selection_commit: null,
    execution_authority: 'NOT_PROVIDED',
    error,
  };
}

export function projectHostInvalidView({ command, sessionId = '', message }) {
  const error = errorValue('INVALID_PARAMETERS', message || 'invalid host view parameters');
  if (command === 'list') {
    return {
      api_version: PROJECT_HOST_VIEW_VERSION,
      read_status: 'INVALID',
      projects: null,
      excluded: [],
      error,
    };
  }
  return statusBase(String(sessionId || ''), 'INVALID', error);
}

export function projectListHostView({ projectsRoot = PROJECTS_ROOT } = {}) {
  try {
    const listed = listProjects(projectsRoot, { strictErrors: true, realDirectoriesOnly: true, withExcluded: true });
    const projects = [];
    const excluded = [...listed.excluded];
    for (const name of listed.projects) {
      try { projects.push(canonicalProjectIdentity(name, projectsRoot)); }
      catch (error) { excluded.push({ project: name, code: 'INVALID_IDENTITY' }); }
    }
    projects.sort((a, b) => a.project.localeCompare(b.project, 'en'));
    excluded.sort((a, b) => a.project.localeCompare(b.project, 'en'));
    return { api_version: PROJECT_HOST_VIEW_VERSION, read_status: 'OK', projects, excluded, error: null };
  } catch (error) {
    return { api_version: PROJECT_HOST_VIEW_VERSION, read_status: 'UNAVAILABLE', projects: null, excluded: [],
      error: errorValue('PROJECT_LIST_UNAVAILABLE', error?.message) };
  }
}

export function projectStatusHostView({
  gstackRoot,
  projectsRoot = PROJECTS_ROOT,
  sessionId,
  operationId = '',
  afterFirstRead = null,
}) {
  let sid;
  try { sid = strictSessionId(sessionId); }
  catch (error) { return statusBase(String(sessionId || ''), 'INVALID', errorValue('INVALID_SESSION_ID', error.message)); }
  if (operationId && !/^[A-Za-z0-9-]{8,128}$/.test(String(operationId))) {
    return statusBase(sid, 'INVALID', errorValue('INVALID_OPERATION_ID', 'operation id is not canonical'));
  }
  let first;
  try { first = readProjectState(gstackRoot, sid, projectsRoot); }
  catch (error) {
    const unavailable = ['EACCES', 'EPERM', 'EIO', 'EMFILE', 'ENFILE'].includes(error?.code);
    return statusBase(sid, unavailable ? 'UNAVAILABLE' : 'INVALID',
      errorValue(unavailable ? 'STATE_READ_UNAVAILABLE' : 'INVALID_STATE', error.message));
  }
  if (first.raw === null) return statusBase(sid, 'NO_RECORD');

  const snapshotId = createHash('sha256').update(first.raw).digest('hex');
  let binding = null;
  let bindingValidation = 'NONE';
  try {
    binding = validatedBindingForState(first.value, projectsRoot);
    bindingValidation = binding ? 'VERIFIED' : 'NONE';
  } catch (error) {
    return { ...statusBase(sid, 'INVALID', errorValue('INVALID_BINDING', error.message)), snapshot_id: snapshotId,
      state: first.value?.state || null, binding_validation: 'INVALID' };
  }

  let selected;
  try { selected = validateSelection(first.value.selection); }
  catch (error) {
    return { ...statusBase(sid, 'INVALID', errorValue('INVALID_SELECTION', error.message)), snapshot_id: snapshotId,
      state: first.value?.state || null, binding_validation: bindingValidation };
  }

  if (afterFirstRead != null) {
    if (typeof afterFirstRead !== 'function') {
      return statusBase(sid, 'INVALID', errorValue('INVALID_READ_HOOK', 'afterFirstRead must be a function'));
    }
    try { afterFirstRead({ snapshot_id: snapshotId, state: first.value }); }
    catch (error) { return statusBase(sid, 'UNAVAILABLE', errorValue('READ_OBSERVER_FAILED', error.message)); }
  }

  let second;
  try { second = readFileSync(projectStatePath(gstackRoot, sid)); }
  catch (error) {
    if (error?.code === 'ENOENT') {
      return statusBase(sid, 'UNSTABLE', errorValue('STATE_CHANGED_DURING_READ', 'state disappeared during host projection'));
    }
    return statusBase(sid, 'UNAVAILABLE', errorValue('STATE_READ_UNAVAILABLE', error.message));
  }
  if (!second.equals(first.raw)) return statusBase(sid, 'UNSTABLE', errorValue('STATE_CHANGED_DURING_READ', 'state changed during host projection'));

  const selection = selected?.selection || {};
  const receipts = selected?.receipts || [];
  const pending = selection.pending;
  const latest = pending || selection.latest_operation || receipts.at(-1) || null;
  const queried = operationId
    ? receipts.find(item => item?.operation_id === operationId) || null
    : null;
  return {
    api_version: PROJECT_HOST_VIEW_VERSION,
    session_id: sid,
    read_status: 'OK',
    snapshot_id: snapshotId,
    state: first.value.state,
    binding_validation: bindingValidation,
    current_binding: binding ? { ...binding } : null,
    current_operation: operationView(latest),
    queried_receipt: operationId
      ? (queried ? { lookup: 'FOUND', receipt: receiptView(queried) } : { lookup: 'EXPIRED_OR_UNKNOWN', receipt: null })
      : null,
    selection_commit: selectionCommitView(selection.last_success),
    execution_authority: 'NOT_PROVIDED',
    error: null,
  };
}

export function hostViewExitCode(view) {
  if (view?.read_status === 'OK' || view?.read_status === 'NO_RECORD') return 0;
  if (view?.read_status === 'INVALID'
      && ['INVALID_PARAMETERS', 'INVALID_SESSION_ID', 'INVALID_OPERATION_ID'].includes(view?.error?.code)) return 2;
  return 1;
}
