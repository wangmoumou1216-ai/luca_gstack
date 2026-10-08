import {
  constants, closeSync, existsSync, fstatSync, lstatSync, mkdirSync, openSync,
  readFileSync, readdirSync, realpathSync, writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';

const sha = value => createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const need = (ok, code, message) => { if (!ok) fail(code, message); };
const schema = (properties, required) => ({ type: 'object', properties, required, additionalProperties: false });
const string = { type: 'string', minLength: 1 };
const digest = { type: 'string', pattern: '^[a-f0-9]{64}$' };

export const TOOL_DEFINITIONS = [
  { type: 'function', name: 'case_read', description: 'Read a currently released case file or exact condition file. Lines are one-based, inclusive; omit both bounds for the complete original content.',
    inputSchema: schema({ path: string, startLine: { type: 'integer', minimum: 1 }, endLine: { type: 'integer', minimum: 1 } }, ['path']) },
  { type: 'function', name: 'case_write', description: 'Write authorized UTF-8 artifact content. Replacing an existing artifact requires its current SHA-256. Accepted checkpoints cannot be replaced.',
    inputSchema: schema({ path: string, content: { type: 'string' }, expectedSha256: digest }, ['path', 'content']) },
  { type: 'function', name: 'case_checkpoint', description: 'Visit the next mandatory checkpoint, or acknowledge delivered events at the current checkpoint. Never skip nodes. Supply the actual artifact path and SHA when submitting a saved checkpoint; supply retryToken at a prescribed retry request.',
    inputSchema: schema({ checkpoint: string, acknowledgements: { type: 'array', items: string, uniqueItems: true },
      artifact: schema({ path: string, sha256: digest }, ['path', 'sha256']), retryToken: string }, ['checkpoint']) },
  { type: 'function', name: 'case_question', description: 'Request a frozen clarification. Does not invent permission, new facts, or advance future events. missing_material may name a currently released path.',
    inputSchema: schema({ kind: { type: 'string', enum: ['missing_material', 'unnecessary_confirmation', 'new_scope_request', 'required_human_choice'] }, path: string }, ['kind']) },
];

function validate(value, spec, label = 'arguments') {
  if (spec.type === 'object') {
    need(object(value), 'BAD_ARGUMENTS', `${label} must be an object`);
    need(Object.keys(value).every(key => key in spec.properties), 'BAD_ARGUMENTS', `${label} has unknown fields`);
    for (const key of spec.required) need(Object.hasOwn(value, key), 'BAD_ARGUMENTS', `${label}.${key} missing`);
    for (const [key, item] of Object.entries(value)) validate(item, spec.properties[key], `${label}.${key}`);
  } else if (spec.type === 'array') {
    need(Array.isArray(value), 'BAD_ARGUMENTS', `${label} must be an array`);
    if (spec.uniqueItems) need(new Set(value).size === value.length, 'BAD_ARGUMENTS', `${label} contains duplicates`);
    value.forEach(item => validate(item, spec.items, label));
  } else {
    need(spec.type === 'integer' ? Number.isSafeInteger(value) : typeof value === spec.type, 'BAD_ARGUMENTS', `${label} has wrong type`);
    if (spec.minimum !== undefined) need(value >= spec.minimum, 'BAD_ARGUMENTS', `${label} below minimum`);
    if (spec.minLength) need(value.length >= spec.minLength, 'BAD_ARGUMENTS', `${label} is empty`);
    if (spec.pattern) need(new RegExp(spec.pattern).test(value), 'BAD_ARGUMENTS', `${label} is not a SHA-256`);
    if (spec.enum) need(spec.enum.includes(value), 'BAD_ARGUMENTS', `${label} has unsupported value`);
  }
}

function localPath(path) {
  need(typeof path === 'string' && path.length && !isAbsolute(path) && !path.includes('\\') && !path.includes('\0')
    && path.split('/').every(part => part && part !== '.' && part !== '..'), 'PATH_DENIED', 'Expected a canonical relative file path');
  return path;
}
const within = (root, path) => path === root || path.startsWith(root + sep);

function prepareRoot(path) {
  need(typeof path === 'string' && isAbsolute(path), 'INVALID_CASE', 'Roots must be absolute');
  if (!existsSync(path)) mkdirSync(path, { recursive: true, mode: 0o700 });
  need(lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink(), 'PATH_DENIED', 'Root must be a real directory');
  need(readdirSync(path).length === 0, 'INVALID_CASE', 'Runtime roots must be fresh empty directories');
  return realpathSync(path);
}

// This is a local file boundary, not an OS sandbox against concurrent same-UID attackers.
function safePath(root, path, createParents = false) {
  localPath(path);
  need(realpathSync(root) === root && !lstatSync(root).isSymbolicLink(), 'PATH_DENIED', 'Root identity changed');
  let cursor = root;
  const parts = path.split('/');
  for (let i = 0; i < parts.length; i++) {
    cursor = join(cursor, parts[i]);
    if (!existsSync(cursor)) {
      // lstat also detects dangling symlinks, which existsSync deliberately does not.
      try { lstatSync(cursor); fail('PATH_DENIED', 'Dangling link'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (i < parts.length - 1 && createParents) mkdirSync(cursor, { mode: 0o700 });
      else if (i < parts.length - 1) fail('ENOENT', 'Missing parent');
    }
    if (existsSync(cursor)) {
      const stat = lstatSync(cursor);
      need(!stat.isSymbolicLink(), 'PATH_DENIED', 'Symlink denied');
      need(i === parts.length - 1 ? stat.isFile() && stat.nlink === 1 : stat.isDirectory(), 'PATH_DENIED', 'Not an isolated regular file/directory');
    }
  }
  return cursor;
}

function readRegular(root, path) {
  const full = safePath(root, path);
  const fd = openSync(full, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    need(stat.isFile() && stat.nlink === 1, 'PATH_DENIED', 'Non-regular/shared file');
    return readFileSync(fd);
  } finally { closeSync(fd); }
}

function put(root, path, content, exclusive = false, append = false) {
  const full = safePath(root, path, true);
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW
    | (exclusive ? constants.O_EXCL : append ? constants.O_APPEND : constants.O_TRUNC);
  const fd = openSync(full, flags, 0o600);
  try { writeFileSync(fd, content); } finally { closeSync(fd); }
}

export function createCaseRuntime({ caseData, caseRoot, evidenceRoot, conditionReadPaths = [] }) {
  const data = clone(caseData);
  need(object(data) && typeof data.request === 'string', 'INVALID_CASE', 'Missing request');
  const protocol = data.driver_protocol;
  const stages = protocol?.mandatory_checkpoints;
  need(Array.isArray(stages) && stages.length >= 3 && new Set(stages).size === stages.length
    && stages[0] === 'request_delivered' && stages.at(-1) === 'before_final_submission'
    && stages.includes('inputs_delivered') && stages.includes('work_ready'), 'INVALID_CASE', 'Unsupported checkpoint sequence');
  const auth = data.authorized_actions;
  need(object(auth) && Array.isArray(auth.read_paths) && Array.isArray(auth.write_paths), 'INVALID_CASE', 'Missing allowlists');
  const readSet = new Set(auth.read_paths.map(localPath));
  const writeSet = new Set(auth.write_paths.map(localPath));
  need(readSet.size === auth.read_paths.length && writeSet.size === auth.write_paths.length
    && [...writeSet].every(path => !readSet.has(path)), 'INVALID_CASE', 'Duplicate/overlapping allowlists');
  const materials = data.initial_files;
  need(Array.isArray(materials), 'INVALID_CASE', 'Missing materials');
  const materialMap = new Map();
  for (const file of materials) {
    need(readSet.has(file.path) && !materialMap.has(file.path) && stages.includes(file.stage)
      && file.encoding === 'utf-8' && typeof file.content === 'string' && sha(file.content) === file.sha256,
    'INVALID_CASE', 'Unbound, duplicate or unsupported material');
    materialMap.set(file.path, file);
  }
  const events = data.events ?? [];
  const eventIds = new Set();
  let previousStage = -1;
  for (const event of events) {
    const index = stages.indexOf(event.trigger?.checkpoint);
    need(typeof event.id === 'string' && !eventIds.has(event.id) && index >= previousStage && index >= 0
      && event.trigger.kind === 'mandatory_driver_checkpoint' && event.trigger.ordinal === 1
      && event.effective_from?.checkpoint === event.trigger.checkpoint
      && Array.isArray(event.revokes) && Array.isArray(event.supersedes),
    'INVALID_CASE', 'Invalid/duplicate/out-of-order event');
    previousStage = index;
    eventIds.add(event.id);
  }
  const recovery = data.failure_recovery_script;
  need(recovery?.mode === 'declarative_driver_actions_only' && recovery.no_shell_execution === true
    && Array.isArray(recovery.steps), 'INVALID_CASE', 'Only declarative recovery is supported');
  const steps = recovery.steps;
  const driverActions = new Set(['deliver_event', 'advance_checkpoint', 'validate_and_store_then_advance',
    'interrupt_and_discard_candidate_context', 'start_fresh_context_with_declared_resume_payload']);
  for (const step of steps) {
    const index = stages.indexOf(step.at);
    need(index >= 0 && driverActions.has(step.driver_action)
      && (!step.next || stages[index + 1] === step.next), 'INVALID_CASE', 'Unsupported recovery step');
    if (step.event_id) need(events.some(event => event.id === step.event_id && event.trigger.checkpoint === step.at), 'INVALID_CASE', 'Unbound recovery event');
    if (step.deliver_events) need(Array.isArray(step.deliver_events) && step.deliver_events.every(id => events.some(event => event.id === id && event.trigger.checkpoint === step.at)), 'INVALID_CASE', 'Unbound recovery bundle');
    if (step.candidate_action === 'submit_checkpoint') need(writeSet.has(step.artifact), 'INVALID_CASE', 'Checkpoint outside writes');
    else if (step.candidate_action === 'request_retry') need(typeof step.required_token === 'string' && Number.isSafeInteger(step.maximum_requests) && step.maximum_requests > 0, 'INVALID_CASE', 'Unbounded retry');
    else need(!step.candidate_action, 'INVALID_CASE', 'Unknown candidate recovery action');
  }
  const conditionFiles = new Map();
  for (const file of conditionReadPaths) {
    need(isAbsolute(file) && !lstatSync(file).isSymbolicLink() && lstatSync(file).isFile(), 'PATH_DENIED', 'Condition must be an exact regular file');
    const actual = realpathSync(file);
    need(actual === resolve(file), 'PATH_DENIED', 'Condition alias denied');
    conditionFiles.set(actual, sha(readFileSync(actual)));
  }
  need(!within(resolve(caseRoot), resolve(evidenceRoot)) && !within(resolve(evidenceRoot), resolve(caseRoot)), 'INVALID_CASE', 'Evidence must be outside case root');
  const root = prepareRoot(caseRoot);
  const evidence = prepareRoot(evidenceRoot);
  need(!within(root, evidence) && !within(evidence, root), 'INVALID_CASE', 'Canonical roots overlap');
  need([...conditionFiles.keys()].every(path => !within(root, path) && !within(evidence, path)), 'INVALID_CASE', 'Condition file overlaps private/case state');
  put(evidence, 'case-source.json', JSON.stringify(data, null, 2), true);

  let stageIndex = -1, sequence = 0, pendingFresh = false, newThreadRequired = true;
  let rootThread = null, family = 0, finalized = false, initial = null;
  const registeredThreads = new Map();
  const delivered = [], acknowledged = new Set(), released = new Set(), visits = [];
  const reads = [], writes = [], failures = [], errors = [], actions = [], receipts = [], semanticReview = [];
  const dependencies = new Map(), retryCounts = new Map(), revoked = new Set();
  const acceptedCheckpoints = new Map();
  let invalidRun = false;
  const stage = () => stages[stageIndex] ?? null;
  const log = record => {
    const entry = { sequence: ++sequence, stage: stage(), ...record };
    put(evidence, 'journal.ndjson', JSON.stringify(entry) + '\n', false, true);
    return entry;
  };
  const unknownAuthority = (event, message) => {
    semanticReview.push(log({ kind: 'semantic_review_required', event_id: event.id, message }));
  };
  function applyEvent(event) {
    delivered.push(clone(event));
    log({ kind: 'event_delivered', event: clone(event) });
    if (event.kind === 'dependency_result') {
      const result = event.payload?.result;
      const ok = result?.status === 'succeeded' && result.exit_code === 0 && result.artifact?.partial !== true;
      dependencies.set(event.object, { event_id: event.id, succeeded: ok });
      if (!ok) failures.push(log({ kind: 'dependency_failure', event_id: event.id, result: clone(result) }));
    }
    if ((event.revokes ?? []).length) {
      if (event.source?.principal !== 'human_user' || event.source?.authority !== 'user_scope') {
        unknownAuthority(event, 'Revocation was not a mechanically authenticated user-scope event');
        return;
      }
      for (const item of event.revokes) {
        const path = typeof item === 'string' ? item : item?.path;
        if (writeSet.has(path)) revoked.add(path);
        else unknownAuthority(event, 'Revocation has no unambiguous authorized artifact path; unchanged outer allowlist grants no semantic permission');
      }
    }
  }
  function enter(index) {
    stageIndex = index;
    visits.push(stage());
    log({ kind: 'checkpoint_entered', checkpoint: stage() });
    for (const file of materials.filter(file => file.stage === stage())) {
      put(root, file.path, file.content, true);
      released.add(file.path);
      log({ kind: 'material_released', path: file.path, sha256: file.sha256, bytes: Buffer.byteLength(file.content) });
    }
    for (const event of events.filter(event => event.trigger.checkpoint === stage())) applyEvent(event);
  }
  const outstanding = () => delivered.filter(event => event.delivery_ack_required && !acknowledged.has(event.id)).map(event => event.id);
  function publicState() {
    return { checkpoint: stage(), next_checkpoint: stages[stageIndex + 1] ?? null,
      available_files: [...released, ...new Set(writes.map(item => item.path))],
      condition_read_paths: [...conditionFiles.keys()], events: clone(delivered), acknowledgements_required: outstanding(),
      available_protocol_actions: steps.filter(step => step.at === stage()).map(step => Object.fromEntries(
        ['candidate_action', 'artifact', 'driver_action', 'next', 'maximum_requests'].filter(key => key in step).map(key => [key, step[key]]))),
      current_authorization: { ...clone(auth), write_paths: [...writeSet].filter(path => !revoked.has(path)) },
      protocol_instructions: 'Use the four case tools. Advance checkpoints in order. Acknowledge delivered event IDs before writes or further checkpoints. Do not treat evidence or an event acknowledgement as permission. Submit actual path+SHA for checkpoints; retry only with the delivered token. Required fields and domain semantics are in the released owner/output contract.' };
  }
  function recordMessage(kind, payload) {
    const text = JSON.stringify(payload);
    log({ kind, text, sha256: sha(text), bytes: Buffer.byteLength(text), truncated: false, transport_delivery: 'UNKNOWN' });
    return text;
  }
  function read(args, call) {
    let bytes, source;
    if (isAbsolute(args.path) && conditionFiles.has(args.path)) {
      source = args.path;
      bytes = readRegular(dirname(source), source.split(sep).at(-1));
      need(realpathSync(source) === source && sha(bytes) === conditionFiles.get(source), 'SOURCE_DRIFT', 'Condition file changed');
    } else {
      localPath(args.path);
      need(released.has(args.path) || writes.some(item => item.path === args.path), 'READ_DENIED', 'File is not released or authorized');
      source = join(root, args.path);
      bytes = readRegular(root, args.path);
      const expected = materialMap.get(args.path)?.sha256 ?? writes.findLast(item => item.path === args.path)?.sha256;
      need(sha(bytes) === expected, 'SOURCE_DRIFT', 'Read target changed outside controlled writes');
    }
    const content = bytes.toString('utf8');
    need(Buffer.from(content).equals(bytes), 'INVALID_ENCODING', 'Expected UTF-8');
    const lines = content.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    const start = args.startLine ?? 1, end = args.endLine ?? lines.length;
    need((lines.length === 0 && args.startLine === undefined && args.endLine === undefined)
      || (start <= end && end <= lines.length), 'READ_RANGE', 'Requested lines outside file');
    const output = lines.slice(start - 1, end).join('');
    const receipt = log({ kind: 'read', ...call, path: args.path, source_sha256: sha(bytes),
      source_bytes: bytes.length, requested_range: [start, end], returned_range: [start, end], line_count: lines.length,
      complete_file_returned: start === 1 && end === lines.length, content: output, output_sha256: sha(output),
      output_bytes: Buffer.byteLength(output), truncated: false, transport_delivery: 'UNKNOWN', semantic_consumption: 'UNKNOWN' });
    reads.push(receipt);
    return { path: args.path, content: output, sha256: sha(bytes), range: [start, end], receipt_sequence: receipt.sequence };
  }
  function write(args, call) {
    localPath(args.path);
    need(writeSet.has(args.path) && !revoked.has(args.path), 'WRITE_DENIED', 'Write not currently authorized');
    need(!invalidRun, 'INVALID_RUN', 'Driver authority unresolved');
    need(outstanding().length === 0, 'EVENT_ACK_REQUIRED', 'Acknowledge delivered events before writes');
    need(stageIndex >= stages.indexOf('work_ready') && stageIndex < stages.length - 1, 'WRITE_PHASE', 'Write outside work phase');
    need(!acceptedCheckpoints.has(args.path), 'CHECKPOINT_SEALED', 'Accepted checkpoint is immutable');
    const checkpoint = steps.find(step => step.candidate_action === 'submit_checkpoint' && step.artifact === args.path && step.at === stage());
    if (!checkpoint) {
      need(![...dependencies.values()].some(item => !item.succeeded), 'DEPENDENCY_FAILED', 'Required dependency is unsuccessful');
      // The save/interrupt protocol has one explicit pre-interruption artifact. Semantic
      // dependencies beyond this machine contract remain the candidate's and J's decision.
      const savePending = steps.some(step => step.candidate_action === 'submit_checkpoint'
        && step.at === stage() && !acceptedCheckpoints.has(step.artifact));
      need(!savePending, 'CHECKPOINT_REQUIRED', 'Save the declared checkpoint before continuing final delivery');
    }
    const full = safePath(root, args.path, true);
    let before = null;
    if (existsSync(full)) {
      before = sha(readRegular(root, args.path));
      need(writes.findLast(item => item.path === args.path)?.sha256 === before && args.expectedSha256 === before,
        'STALE_WRITE', 'Replacement requires the actual current controlled artifact digest');
    } else need(args.expectedSha256 === undefined, 'STALE_WRITE', 'Expected artifact does not exist');
    const bytes = Buffer.from(args.content);
    const versionPath = `artifacts/${writes.length + 1}.utf8`;
    put(evidence, versionPath, bytes, true);
    put(root, args.path, bytes, before === null);
    const receipt = log({ kind: 'write', ...call, path: args.path, before_sha256: before,
      sha256: sha(bytes), bytes: bytes.length, evidence_path: join(evidence, versionPath) });
    writes.push(receipt);
    return { path: args.path, sha256: receipt.sha256, bytes: bytes.length, receipt_sequence: receipt.sequence };
  }
  function ack(ids) {
    for (const id of ids) need(delivered.some(event => event.id === id) && !acknowledged.has(id), 'EVENT_ACK_INVALID', 'Event is not delivered or is already acknowledged');
    for (const id of ids) { acknowledged.add(id); log({ kind: 'event_acknowledged', event_id: id }); }
  }
  function checkpoint(args, call) {
    const target = stages.indexOf(args.checkpoint);
    need(target === stageIndex + 1 || target === stageIndex, 'CHECKPOINT_ORDER', 'Only the next checkpoint may be visited');
    if (target === stageIndex) {
      need(args.acknowledgements?.length && !args.artifact && !args.retryToken, 'CHECKPOINT_DUPLICATE', 'Current checkpoint accepts only event acknowledgements');
      ack(args.acknowledgements);
      return { payload: publicState(), control: stageIndex === stages.length - 1 && !outstanding().length
        ? { type: 'ready_for_final' } : null };
    }
    ack(args.acknowledgements ?? []);
    need(outstanding().length === 0, 'EVENT_ACK_REQUIRED', 'Unacknowledged event');
    const saveStep = steps.find(step => step.at === stage() && step.candidate_action === 'submit_checkpoint');
    if (saveStep) {
      need(args.artifact?.path === saveStep.artifact && args.checkpoint === saveStep.next, 'CHECKPOINT_RECEIPT', 'Exact checkpoint artifact required');
      const receipt = writes.findLast(item => item.path === saveStep.artifact);
      need(receipt && receipt.sha256 === args.artifact.sha256
        && sha(readRegular(root, saveStep.artifact)) === receipt.sha256, 'CHECKPOINT_RECEIPT', 'Stale, foreign or absent checkpoint receipt');
      acceptedCheckpoints.set(saveStep.artifact, clone(receipt));
      log({ kind: 'checkpoint_saved', ...call, receipt: clone(receipt) });
    } else need(!args.artifact, 'CHECKPOINT_RECEIPT', 'Unrequested checkpoint receipt');
    const retry = steps.find(step => step.at === args.checkpoint && step.candidate_action === 'request_retry');
    if (retry) {
      need(args.retryToken === retry.required_token && delivered.some(event => event.payload?.result?.retry_token === args.retryToken), 'RETRY_TOKEN', 'Retry requires the delivered token');
      const used = retryCounts.get(retry.at) ?? 0;
      need(used < retry.maximum_requests, 'RETRY_EXHAUSTED', 'Retry limit reached');
      retryCounts.set(retry.at, used + 1);
      log({ kind: 'retry_requested', ...call, token: args.retryToken, attempt: used + 1 });
    } else need(!args.retryToken, 'RETRY_TOKEN', 'No retry at this checkpoint');
    enter(target);
    if (retry?.driver_action === 'advance_checkpoint') enter(stageIndex + 1);
    const interruption = steps.find(step => step.at === stage() && step.driver_action === 'interrupt_and_discard_candidate_context');
    if (interruption) {
      pendingFresh = true;
      log({ kind: 'fresh_context_requested', ...call, next: interruption.next });
      return { payload: publicState(), control: { type: 'fresh_context' } };
    }
    return { payload: publicState(), control: stageIndex === stages.length - 1 && !outstanding().length
      ? { type: 'ready_for_final' } : null };
  }
  function artifacts() {
    return [...writeSet].map(path => {
      const receipt = writes.findLast(item => item.path === path);
      try {
        const bytes = readRegular(root, path);
        return { path, exists: true, sha256: sha(bytes), bytes: bytes.length, controlled: receipt?.sha256 === sha(bytes), revoked: revoked.has(path) };
      } catch (error) { return { path, exists: false, error: error.code, revoked: revoked.has(path) }; }
    });
  }
  function snapshot() {
    return clone({ evidenceRoot: evidence, evidencePaths: { caseSource: join(evidence, 'case-source.json'), journal: join(evidence, 'journal.ndjson') },
      stage: stage(), checkpoints: visits, events: delivered, acknowledged_event_ids: [...acknowledged],
      file_access: reads, writes, failures, protocol_errors: errors, actions, tool_receipts: receipts,
      semantic_review_required: semanticReview,
      artifacts: artifacts(), accepted_checkpoints: [...acceptedCheckpoints.values()], pending_fresh_context: pendingFresh,
      thread_family: { generation: family, root_thread_id: rootThread, registration_required: newThreadRequired,
        registrations: [...registeredThreads.values()], native_identity_verified_by_runtime: false },
      invalid_run: invalidRun, finalized, semantic_quality: 'NOT_EVALUATED', necessary_controls: 'NOT_EVALUATED' });
  }
  return {
    // Driver-only entry point. Native provenance must come from its RPC/collaboration journal;
    // a registration records that relationship, and does not authenticate it or grant scope.
    registerThread({ threadId, parentThreadId }) {
      try {
        need(!finalized && !pendingFresh, 'RUNTIME_PHASE', 'Thread registration outside an active family boundary');
        need(typeof threadId === 'string' && threadId.length > 0
          && (parentThreadId === null || typeof parentThreadId === 'string' && parentThreadId.length > 0),
        'CALL_IDENTITY', 'Exact thread ID and explicit parent/null required');
        const previous = registeredThreads.get(threadId);
        if (previous) {
          need(previous.generation === family, 'STALE_THREAD', 'Retired thread family cannot be revived');
          need(previous.parentThreadId === parentThreadId, 'THREAD_REBIND', 'Registered thread cannot change parent or role');
          log({ kind: 'thread_registered', ...previous, idempotent: true });
          return { ...previous, idempotent: true };
        }
        if (parentThreadId === null) {
          need(rootThread === null && newThreadRequired, 'THREAD_ROOT', 'A different root requires the fresh resume boundary');
          rootThread = threadId;
          newThreadRequired = false;
        } else {
          const parent = registeredThreads.get(parentThreadId);
          need(rootThread !== null && parent?.generation === family, 'THREAD_PARENT', 'Parent must belong to the currently registered family');
        }
        const registration = { threadId, parentThreadId, generation: family, rootThreadId: rootThread };
        registeredThreads.set(threadId, registration);
        log({ kind: 'thread_registered', ...registration, idempotent: false });
        return { ...registration, idempotent: false };
      } catch (error) {
        errors.push(log({ kind: 'thread_registration_error', threadId, parentThreadId,
          code: error.code ?? 'IO_ERROR', message: error.message }));
        throw error;
      }
    },
    initialMessage() {
      if (initial !== null) return initial;
      enter(0);
      initial = recordMessage('initial_message', { request: data.request, authorized_actions: publicState().current_authorization,
        mandatory_checkpoints: clone(stages), terminal_status_rule: protocol.terminal_status_rule, ...publicState() });
      return initial;
    },
    handleTool({ name, arguments: args, threadId, turnId }) {
      const call = { threadId: threadId ?? null, turnId: turnId ?? null };
      actions.push(log({ kind: 'tool_attempt', ...call, name, arguments: clone(args ?? null) }));
      let result;
      try {
        need(!finalized && stageIndex >= 0 && !pendingFresh, 'RUNTIME_PHASE', 'Runtime not accepting tools');
        need(typeof threadId === 'string' && threadId && typeof turnId === 'string' && turnId, 'CALL_IDENTITY', 'Thread and turn IDs required');
        const registration = registeredThreads.get(threadId);
        need(registration, 'CALL_IDENTITY', 'Driver must register the actual native thread before tools');
        need(!newThreadRequired && registration.generation === family, 'STALE_THREAD', 'Thread family is no longer active');
        const spec = TOOL_DEFINITIONS.find(tool => tool.name === name);
        need(spec, 'UNKNOWN_TOOL', 'Unknown case tool');
        need(threadId === rootThread || name === 'case_read' || name === 'case_write',
          'ROOT_CONTROL_ONLY', 'Only the current root coordinates checkpoints, acknowledgements, retries and human questions');
        validate(args, spec.inputSchema);
        let payload, control = null;
        if (name === 'case_read') payload = read(args, call);
        else if (name === 'case_write') payload = write(args, call);
        else if (name === 'case_checkpoint') ({ payload, control } = checkpoint(args, call));
        else {
          need(typeof data.clarification_script?.[args.kind] === 'string', 'QUESTION_UNAVAILABLE', 'No frozen clarification');
          payload = { answer: data.clarification_script[args.kind], authority_expanded: false };
          if (args.path) {
            need(args.kind === 'missing_material', 'BAD_ARGUMENTS', 'Only missing_material accepts a path');
            payload.material = read({ path: args.path }, call);
          }
        }
        result = { text: JSON.stringify(payload), isError: false, control };
      } catch (error) {
        const record = log({ kind: 'tool_error', ...call, name, code: error.code ?? 'IO_ERROR', message: error.message });
        errors.push(record);
        if (!error.code || ['EIO', 'ENOSPC', 'EACCES', 'EPERM'].includes(error.code)) invalidRun = true;
        result = { text: JSON.stringify({ error: record.code, message: record.message }), isError: true, control: null };
      }
      receipts.push(log({ kind: 'tool_response', ...call, name, ...result, bytes: Buffer.byteLength(result.text), sha256: sha(result.text), truncated: false, transport_delivery: 'UNKNOWN' }));
      return result;
    },
    resumeMessage() {
      need(pendingFresh && !finalized, 'RUNTIME_PHASE', 'No fresh resume pending');
      const interruption = steps.find(step => step.at === stage() && step.driver_action === 'interrupt_and_discard_candidate_context');
      need(stages[stageIndex + 1] === interruption.next, 'INVALID_CASE', 'Resume stage mismatch');
      for (const [path, receipt] of acceptedCheckpoints) need(sha(readRegular(root, path)) === receipt.sha256, 'SOURCE_DRIFT', 'Saved checkpoint drift');
      enter(stageIndex + 1);
      log({ kind: 'thread_family_retired', generation: family, root_thread_id: rootThread,
        native_work_termination: 'DRIVER_RESPONSIBILITY' });
      family++;
      rootThread = null;
      pendingFresh = false;
      newThreadRequired = true;
      const checkpointArtifacts = [...acceptedCheckpoints].map(([path, receipt]) => ({ path, sha256: receipt.sha256, content: readRegular(root, path).toString('utf8') }));
      return recordMessage('resume_message', { recovery: 'fresh_context_not_compaction', request: data.request,
        mandatory_checkpoints: clone(stages), terminal_status_rule: protocol.terminal_status_rule,
        checkpoint_artifacts: checkpointArtifacts, ...publicState() });
    },
    snapshot,
    finalize({ terminalMessage }) {
      need(!finalized, 'RUNTIME_PHASE', 'Already finalized');
      need(typeof terminalMessage === 'string', 'BAD_ARGUMENTS', 'Terminal message must be text');
      if (stageIndex !== stages.length - 1 || outstanding().length || pendingFresh || newThreadRequired) {
        errors.push(log({ kind: 'protocol_error', code: 'INCOMPLETE_PROTOCOL', message: 'Terminal message arrived before protocol completion' }));
      }
      finalized = true;
      log({ kind: 'terminal_message', text: terminalMessage });
      const result = { ...snapshot(), terminalMessage, protocol_complete: stageIndex === stages.length - 1
        && !outstanding().length && !pendingFresh && !newThreadRequired,
      status: invalidRun ? 'INVALID_RUN' : 'RECORDED', completion_claim_verified: false };
      put(evidence, 'final.json', JSON.stringify(result, null, 2), true);
      return { ...result, finalEvidencePath: join(evidence, 'final.json') };
    },
  };
}
