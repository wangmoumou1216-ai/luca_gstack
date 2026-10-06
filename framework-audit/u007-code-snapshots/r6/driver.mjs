#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {appendFileSync, mkdirSync, readFileSync, realpathSync, readdirSync, lstatSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import {isDeepStrictEqual} from 'node:util';
import {homedir} from 'node:os';

const self = fileURLToPath(import.meta.url);
const modulePaths = {driver: self, conditions: join(dirname(self), 'conditions.mjs'),
  protocol: join(dirname(self), 'case-protocol.mjs')};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const readJSON = path => JSON.parse(readFileSync(path, 'utf8'));
const sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms));
const validText = value => typeof value === 'string' && value.trim().length > 0;
const positive = value => Number.isSafeInteger(value) && value > 0;
const check = (condition, message) => { if (!condition) throw new Error(message); };
const deferred = () => {
  let resolvePromise;
  const promise = new Promise(r => { resolvePromise = r; });
  return {promise, resolve: resolvePromise};
};
const within = (root, path) => {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel));
};

function readProbeRegistration(release, caseFile, sourceManifest) {
  const ref = release.registration;
  check(validText(ref?.path) && isAbsolute(ref.path) && typeof ref.sha256 === 'string'
    && /^[a-f0-9]{64}$/.test(ref.sha256), 'PROBE_REGISTRATION_REQUIRED');
  const stat = lstatSync(ref.path);
  check(stat.isFile() && !stat.isSymbolicLink(), 'PROBE_REGISTRATION_NOT_REGULAR_FILE');
  const bytes = readFileSync(ref.path);
  check(sha(bytes) === ref.sha256, 'PROBE_REGISTRATION_HASH_DRIFT');
  const record = JSON.parse(bytes.toString('utf8'));
  for (const [key, value] of Object.entries({schema_version: 1, kind: 'u007-capability-probe',
    status: 'REGISTERED', issued_by: 'root-coordinator', pool: 'additional-capability', capability_probe_limit: 6,
    probe_id: release.probe_id, run_id: release.run_id})) {
    check(record?.[key] === value, `PROBE_REGISTRATION_MISMATCH:${key}`);
  }
  for (const key of ['run', 'bindings', 'model', 'resources', 'entry', 'native_command_permissions']) {
    check(isDeepStrictEqual(record[key], release[key]), `PROBE_REGISTRATION_MISMATCH:${key}`);
  }
  check(Object.keys(record.bindings).length === 6, 'PROBE_REGISTRATION_MISMATCH:bindings');
  for (const [key, actualPath, hashKey] of [['case_file', caseFile, 'cases_sha256'],
    ['source_manifest', sourceManifest, 'source_manifest_sha256']]) {
    const bound = record[key];
    check(validText(bound?.path) && isAbsolute(bound.path), `PROBE_REGISTRATION_PATH:${key}`);
    check(realpathSync(bound.path) === realpathSync(actualPath), `PROBE_REGISTRATION_PATH:${key}`);
    check(bound.sha256 === release.bindings[hashKey] && sha(readFileSync(bound.path)) === bound.sha256,
      `PROBE_REGISTRATION_HASH:${key}`);
  }
  check(Array.isArray(record.assertions) && record.assertions.length > 0
    && record.assertions.every(a => validText(a?.id) && validText(a.statement))
    && new Set(record.assertions.map(a => a.id.trim())).size === record.assertions.length
    && new Set(record.assertions.map(a => a.statement.trim())).size === record.assertions.length,
  'PROBE_REGISTRATION_ASSERTIONS');
  check(Array.isArray(record.stop_conditions) && record.stop_conditions.length > 0
    && record.stop_conditions.every(validText), 'PROBE_REGISTRATION_STOP_CONDITIONS');
  return {bytes, path: realpathSync(ref.path), sha256: ref.sha256};
}

const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort());
const canonicalDirectory = path => {
  check(validText(path) && isAbsolute(path) && realpathSync(path) === path
    && lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink(), 'NATIVE_PERMISSION_PATH');
  return path;
};
const readEvidence = ref => {
  check(exactKeys(ref, ['path', 'sha256']) && validText(ref.path) && isAbsolute(ref.path)
    && typeof ref.sha256 === 'string' && /^[a-f0-9]{64}$/.test(ref.sha256), 'NATIVE_PROOF_REFERENCE');
  check(realpathSync(ref.path) === ref.path && lstatSync(ref.path).isFile()
    && !lstatSync(ref.path).isSymbolicLink(), 'NATIVE_PROOF_FILE');
  const bytes = readFileSync(ref.path);
  check(sha(bytes) === ref.sha256, 'NATIVE_PROOF_DRIFT');
  return {path: ref.path, sha256: ref.sha256, bytes};
};
// TOML values are passed as argv entries, never through a shell.
const toml = value => typeof value === 'object' && value !== null
  ? `{${Object.entries(value).map(([key, v]) => `${JSON.stringify(key)}=${toml(v)}`).join(',')}}`
  : JSON.stringify(value);

function validateNativePermissions(release, conditionRoot, protectedPaths) {
  const native = release.native_command_permissions;
  if (native === undefined) return null;
  check(exactKeys(native, ['profile_id', 'profile', 'runtime_read_roots', 'effective_probe'])
    && typeof native.profile_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(native.profile_id), 'NATIVE_PERMISSION_SHAPE');
  check(exactKeys(native.profile, ['filesystem', 'network'])
    && isDeepStrictEqual(native.profile.network, {enabled: false}), 'NATIVE_PERMISSION_PROFILE');
  canonicalDirectory(conditionRoot);
  check(Array.isArray(native.runtime_read_roots)
    && new Set(native.runtime_read_roots).size === native.runtime_read_roots.length, 'NATIVE_RUNTIME_ROOTS');
  const broad = new Set(['/', '/Users', '/home', '/var', '/private', '/tmp', '/private/tmp', '/private/var',
    '/private/var/folders', '/opt', '/opt/homebrew', '/opt/homebrew/Cellar', '/usr', '/usr/local',
    '/System', '/Library', '/Applications', '/Volumes', realpathSync(homedir()),
    ...['Desktop', 'Documents', 'Downloads', 'Library', '.codex', '.config', '.ssh'].map(p => join(realpathSync(homedir()), p))]);
  for (const path of native.runtime_read_roots) {
    canonicalDirectory(path);
    check(!broad.has(path) && !within(path, homedir())
      && ![conditionRoot, ...protectedPaths].some(p => within(path, p) || within(p, path)), 'NATIVE_RUNTIME_ROOT_ESCAPE');
  }
  const expected = {':root': 'deny', ':minimal': 'read', [conditionRoot]: 'read',
    ...Object.fromEntries(native.runtime_read_roots.map(p => [p, 'read']))};
  check(isDeepStrictEqual(native.profile.filesystem, expected), 'NATIVE_FILESYSTEM_MISMATCH');
  if (native.effective_probe === null) {
    check(release.stage === 'probe', 'NATIVE_EFFECTIVE_PROOF_REQUIRED');
    return {native, proof: null, evidence: []};
  }
  const source = readEvidence(native.effective_probe), proof = JSON.parse(source.bytes);
  check(proof.schema_version === 1 && proof.kind === 'u007-app-server-native-command-boundary'
    && proof.status === 'ACCEPTED' && proof.issued_by === 'root-coordinator'
    && proof.j_review?.decision === 'ACCEPTED', 'NATIVE_PROOF_ACCEPTANCE');
  check(proof.driver_sha256 === release.bindings.driver_sha256 && validText(proof.codex_version)
    && validText(proof.codex_user_agent), 'NATIVE_PROOF_BINDING');
  check(validText(proof.condition_root) && isAbsolute(proof.condition_root)
    && resolve(proof.condition_root) === proof.condition_root && !broad.has(proof.condition_root)
    && !protectedPaths.some(p => within(proof.condition_root, p)), 'NATIVE_PROOF_CONDITION');
  const previous = proof.profile?.filesystem;
  check(previous && previous[proof.condition_root] === 'read', 'NATIVE_PROOF_PROFILE');
  const projected = structuredClone(proof.profile);
  delete projected.filesystem[proof.condition_root];
  check(!Object.hasOwn(projected.filesystem, conditionRoot), 'NATIVE_PROOF_PROFILE');
  projected.filesystem[conditionRoot] = 'read';
  check(isDeepStrictEqual(projected, native.profile)
    && isDeepStrictEqual(proof.runtime_read_roots, native.runtime_read_roots), 'NATIVE_PROOF_PROFILE');
  check(proof.active_permission_profile?.id === native.profile_id
    && proof.active_permission_profile.extends == null, 'NATIVE_PROOF_IDENTITY');
  check(isDeepStrictEqual(proof.effective_config, {
    default_permissions: native.profile_id, permissions: {[native.profile_id]: proof.profile}}), 'NATIVE_PROOF_EFFECTIVE_CONFIG');
  check(Array.isArray(proof.checks) && new Set(proof.checks.map(c => c.id)).size === proof.checks.length
    && proof.checks.every(c => validText(c.id) && c.passed === true && validText(c.command) && Number.isInteger(c.exit_code))
    && ['app_server_command', 'allowed_read', 'outside_read_denied',
    'symlink_escape_denied', 'write_denied', 'child_inherits_denial'].every(id =>
    proof.checks.filter(c => c.id === id && c.passed === true && validText(c.command)
      && Number.isInteger(c.exit_code)).length === 1), 'NATIVE_PROOF_CHECKS');
  check(Array.isArray(proof.unmeasured) && proof.unmeasured.length > 0
    && proof.unmeasured.every(validText), 'NATIVE_PROOF_UNMEASURED');
  const evidence = [source, readEvidence(proof.j_review.evidence), ...proof.checks.map(c => readEvidence(c.evidence))];
  return {native, proof, evidence};
}

// Dependency injection is for offline transports; the public CLI has no release bypass.
export function createTrialRunner({spawnProcess = spawn, paths = modulePaths, cleanupGraceMs = 1000,
  loadModules = async () => ({...await import('./conditions.mjs'), ...await import('./case-protocol.mjs')})} = {}) {
  return async function trialRunner({manifestPath, caseFile, caseId, conditionId, trial, outputRoot, codexCommand = 'codex'}) {
    const started = Date.now();
    const manifest = readJSON(manifestPath);
    const release = manifest.runtime_release;
    check(release?.status === 'READY', 'BUILD_ONLY: runtime release is not READY');
    check(['probe', 'development', 'hidden'].includes(release.stage), 'INVALID_RELEASE_STAGE');
    if (release.stage === 'probe') {
      check(validText(release.probe_id), 'PROBE_ID_REQUIRED');
    }
    check(['B', 'T', 'S', 'I'].includes(conditionId) && validText(caseId) && positive(trial), 'INVALID_RUN_ARGUMENTS');
    check(validText(release.run_id) && /^[A-Za-z0-9_-]+$/.test(release.run_id), 'INVALID_RUN_ID');
    check(release.entry?.transport === 'codex-app-server-stdio', 'INVALID_TRANSPORT');
    const bindings = release.bindings;
    check(bindings && release.run?.case_id === caseId && release.run?.condition_id === conditionId
      && release.run?.trial === trial, 'RELEASE_IDENTITY_MISMATCH');
    for (const key of ['driver_sha256', 'conditions_sha256', 'case_protocol_sha256', 'cases_sha256',
      'source_manifest_sha256', 'condition_material_sha256']) {
      check(typeof bindings[key] === 'string' && /^[a-f0-9]{64}$/.test(bindings[key]), `INVALID_BINDING:${key}`);
    }
    for (const [name, key] of [['driver', 'driver_sha256'], ['conditions', 'conditions_sha256'], ['protocol', 'case_protocol_sha256']]) {
      check(bindings[key] === sha(readFileSync(paths[name])), `RELEASE_${name.toUpperCase()}_DRIFT`);
    }
    check(bindings.cases_sha256 === sha(readFileSync(caseFile)), 'RELEASE_CASE_DRIFT');
    check(bindings.source_manifest_sha256 === sha(readFileSync(manifest.source_manifest)), 'RELEASE_SOURCE_DRIFT');
    check(validText(release.model?.name) && ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(release.model.effort), 'RELEASE_MODEL_REQUIRED');
    const data = readJSON(caseFile);
    const matches = (Array.isArray(data.cases) ? data.cases : [data]).filter(c => c.id === caseId);
    check(matches.length === 1, 'CASE_ID_NOT_UNIQUE');
    const resources = release.resources;
    const cap = manifest.budgets?.[matches[0].complexity];
    check(cap && ['wall_seconds', 'tool_actions', 'observed_tokens'].every(k => positive(resources?.[k])
      && positive(cap[k]) && resources[k] <= cap[k]), 'RELEASE_BUDGET_REQUIRED_OR_EXCEEDED');
    const registration = release.stage === 'probe' ? readProbeRegistration(release, caseFile, manifest.source_manifest) : null;
    if (release.stage !== 'probe') {
      check(release.native_command_permissions?.effective_probe != null, 'NATIVE_EFFECTIVE_PROOF_REQUIRED');
    }
    const budgets = {...resources, wall_ms: resources.wall_seconds * 1000};
    const grace = cleanupGraceMs;
    check(positive(grace) && grace <= 10000, 'INVALID_CLEANUP_GRACE');
    check(typeof codexCommand === 'string' && codexCommand.length > 0, 'INVALID_COMMAND');
    const requestedBase = resolve(outputRoot);
    mkdirSync(requestedBase, {recursive: true});
    check(!lstatSync(requestedBase).isSymbolicLink(), 'OUTPUT_ROOT_SYMLINK');
    const base = realpathSync(requestedBase);
    const root = join(base, release.run_id);
    mkdirSync(root); // Refuse overwriting evidence from an earlier attempt.
    const evidenceRoot = join(root, 'evidence');
    mkdirSync(evidenceRoot);
    const files = Object.fromEntries(['rpc.jsonl', 'stdout.log', 'stderr.log', 'result.json'].map(n => [n, join(evidenceRoot, n)]));
    for (const n of ['rpc.jsonl', 'stdout.log', 'stderr.log']) writeFileSync(files[n], '', {flag: 'wx'});
    const report = {version: 1, status: 'INVALID_RUN', stage: release.stage, run_id: release.run_id,
      case_id: caseId, condition_id: conditionId, trial,
      started_at: new Date(started).toISOString(), deadline_ms: started + budgets.wall_ms,
      evidence_root: evidenceRoot, errors: [], candidate_tool_errors: [], limitations: [
        'Native sandbox/read isolation, global injection and external-effect controls require a released live probe.',
        'No semantic quality or necessary-control PASS is assigned by this driver.',
        'External monetary costs are unknown.'
      ], invocation: null, threads: [], turns: [], native_tools: [], interruptions: [],
      cleanup: [], thread_registrations: [], usage: null, tool_actions: 0, engine: null};
    if (registration) {
      const copy = join(evidenceRoot, 'probe-registration.json');
      writeFileSync(copy, registration.bytes, {flag: 'wx'});
      report.probe_registration = {probe_id: release.probe_id, source_path: registration.path,
        copy_path: copy, sha256: registration.sha256,
        authority: 'Local coordinator run record only; not cryptographic identity authentication or behavior PASS. Global pool counting belongs to the coordinator ledger.'};
    }
    let runtime, child, closed = false, stopping = false, permissions = null, invalidNativeScope = false;
    const verifiedCommandThreads = new Set();
    let exitRecord = null, nextId = 0, active = null, nextControl = null, toolQueue = Promise.resolve();
    const pending = new Map(), knownThreads = new Map(), usage = new Map(), actionIds = new Set(), calls = new Set();
    const terminals = new Map(), activeTurns = new Map(), dynamicCounts = new Map(), clientOperations = new Map();
    const activeFamily = new Set();
    const hookEvents = [], toolProjections = new Map();
    const abort = deferred();
    let fatal = null;
    const journal = (direction, value) => appendFileSync(files['rpc.jsonl'], JSON.stringify({at: Date.now(), direction, ...value}) + '\n');
    const fail = error => {
      const message = error instanceof Error ? error.message : String(error);
      report.errors.push({at: Date.now(), message});
      if (!fatal) { fatal = new Error(message); abort.resolve(fatal); }
    };
    const bounded = promise => Promise.race([promise, abort.promise.then(error => { throw error; })]);
    const deadlineTimer = setTimeout(() => fail('ABSOLUTE_DEADLINE'), Math.max(0, report.deadline_ms - Date.now()));
    const onCancel = signal => fail(`CANCELLED_${signal}`);
    const signalHandlers = ['SIGINT', 'SIGTERM', 'SIGHUP'].map(signal => {
      const fn = () => onCancel(signal); process.on(signal, fn); return [signal, fn];
    });
    const send = message => {
      journal('outbound', {message});
      if (!child?.stdin?.writable || closed) throw new Error('TRANSPORT_CLOSED');
      child.stdin.write(JSON.stringify(message) + '\n');
    };
    const rpc = (method, params) => new Promise((resolveRpc, rejectRpc) => {
      if (method !== 'turn/interrupt') {
        if (Date.now() >= report.deadline_ms) fail('ABSOLUTE_DEADLINE');
        if (fatal) { rejectRpc(fatal); return; }
      }
      const id = ++nextId;
      pending.set(id, {method, resolve: resolveRpc, reject: rejectRpc});
      try { send({id, method, params}); } catch (error) { pending.delete(id); rejectRpc(error); }
    });
    const keyOf = (threadId, turnId) => `${threadId}:${turnId}`;
    const terminalFor = (threadId, turnId) => {
      const key = keyOf(threadId, turnId);
      if (!terminals.has(key)) terminals.set(key, deferred());
      return terminals.get(key);
    };
    const action = (threadId, turnId, id) => {
      const key = `${threadId}:${turnId}:${id}`;
      if (actionIds.has(key)) return true;
      actionIds.add(key); report.tool_actions = actionIds.size;
      if (report.tool_actions > budgets.tool_actions) { fail('TOOL_ACTION_BUDGET'); return false; }
      return true;
    };
    // RPC call IDs and streamed item IDs need not match. Count each projection's
    // unique calls by thread/turn/tool, then use the larger count, not their sum.
    const dynamicAction = (threadId, turnId, tool, id, projection) => {
      const key = JSON.stringify([threadId, turnId, tool]);
      if (!dynamicCounts.has(key)) dynamicCounts.set(key, {callbacks: new Set(), items: new Set()});
      const counts = dynamicCounts.get(key);
      counts[projection].add(id);
      const count = Math.max(counts.callbacks.size, counts.items.size);
      return action(threadId, turnId, `dynamic:${tool}:${count}`);
    };
    const toolProjection = (threadId, turnId, id, source) => {
      const key = JSON.stringify([threadId, turnId, id]);
      if (!toolProjections.has(key)) toolProjections.set(key, {
        thread_id: threadId, turn_id: turnId, call_id: id, sources: []});
      const record = toolProjections.get(key);
      if (!record.sources.includes(source)) record.sources.push(source);
    };
    const interrupt = async (threadId, turnId, reason) => {
      const record = {thread_id: threadId, turn_id: turnId, reason, requested_at: Date.now(), response: null, terminal: null};
      report.interruptions.push(record);
      const attempt = async () => {
        record.response = await rpc('turn/interrupt', {threadId, turnId});
        record.terminal = await terminalFor(threadId, turnId).promise;
      };
      await Promise.race([attempt().catch(error => { record.error = error.message; }), sleep(grace)]);
      record.confirmed = record.response !== null && ['interrupted', 'completed', 'failed'].includes(record.terminal?.turn?.status);
      return record;
    };
    const register = async (threadId, parentThreadId, evidence) => {
      const receipt = {threadId, parentThreadId, evidence, status: 'pending', at: Date.now()};
      report.thread_registrations.push(receipt);
      try {
        receipt.result = await runtime.registerThread({threadId, parentThreadId});
        // Context may return a structured refusal instead of throwing.
        check(receipt.result?.isError !== true && receipt.result?.ok !== false, 'CASE_THREAD_REGISTRATION_REFUSED');
        receipt.status = 'registered';
      } catch (error) { receipt.status = 'refused'; receipt.error = error.message; throw error; }
    };
    const observeChild = (threadId, parentThreadId, evidence) => {
      check(validText(threadId) && threadId !== parentThreadId && activeFamily.has(parentThreadId), 'UNTRUSTED_CHILD_PARENT');
      const previous = knownThreads.get(threadId);
      check(!previous || (previous.parent === parentThreadId && activeFamily.has(threadId)), 'THREAD_PARENT_REBIND_OR_OLD_FAMILY');
      if (!previous) knownThreads.set(threadId, {id: threadId, parent: parentThreadId, status: 'observed'});
      activeFamily.add(threadId);
      toolQueue = toolQueue.then(() => register(threadId, parentThreadId, evidence)).catch(fail);
      if (conditionId === 'I' && [...activeFamily].filter(id => knownThreads.get(id).parent).length > 1) fail('I_CHILD_ORGANIZATION_LIMIT');
    };
    const handleRequest = async event => {
      const p = event.params || {};
      if (event.method !== 'item/tool/call') {
        send({id: event.id, error: {code: -32601, message: 'No client authority for this request'}});
        fail(`UNSUPPORTED_SERVER_REQUEST:${event.method}`); return;
      }
      check(activeFamily.has(p.threadId), 'FOREIGN_OR_OLD_TOOL_THREAD');
      check(activeTurns.get(p.threadId) === p.turnId, 'STALE_TOOL_TURN');
      check(validText(p.callId) && !calls.has(keyOf(p.threadId, p.callId)), 'DUPLICATE_TOOL_CALL');
      calls.add(keyOf(p.threadId, p.callId));
      toolProjection(p.threadId, p.turnId, p.callId, 'item/tool/call');
      if (Date.now() >= report.deadline_ms) fail('ABSOLUTE_DEADLINE');
      if (fatal || stopping || nextControl?.type === 'fresh_context'
        || !dynamicAction(p.threadId, p.turnId, p.tool, p.callId, 'callbacks')) {
        report.candidate_tool_errors.push({thread_id: p.threadId, turn_id: p.turnId, call_id: p.callId,
          tool: p.tool, text: 'Request rejected after stop/budget/fresh boundary; no action executed.'});
        send({id: event.id, result: {contentItems: [{type: 'inputText', text: 'Driver stopped; no action executed.'}], success: false}}); return;
      }
      const operation = {thread_id: p.threadId, turn_id: p.turnId, call_id: p.callId, tool: p.tool, status: 'pending'};
      clientOperations.set(keyOf(p.threadId, p.callId), operation);
      let result;
      try {
        result = await runtime.handleTool({name: p.tool, arguments: p.arguments, threadId: p.threadId, turnId: p.turnId});
        operation.status = 'returned';
      } catch (error) { operation.status = 'failed'; operation.error = error.message; throw error; }
      if (stopping) { journal('client-late-result', {operation, result}); return; }
      check(typeof result?.text === 'string' && typeof result.isError === 'boolean', 'INVALID_CASE_TOOL_RESPONSE');
      if (result.isError) report.candidate_tool_errors.push({thread_id: p.threadId, turn_id: p.turnId, call_id: p.callId, tool: p.tool, text: result.text});
      send({id: event.id, result: {contentItems: [{type: 'inputText', text: result.text}], success: !result.isError}});
      if (result.control) {
        check(['fresh_context', 'ready_for_final'].includes(result.control.type), 'UNKNOWN_CASE_CONTROL');
        nextControl = result.control;
        if (result.control.type === 'fresh_context') {
          check(active?.threadId === p.threadId && active?.turnId === p.turnId, 'CHILD_CANNOT_RESTART_ROOT');
          active.fresh.resolve(true);
        }
      }
    };
    const observe = event => {
      if (event.id !== undefined && !event.method) {
        const waiter = pending.get(event.id);
        if (!waiter) { fail('FOREIGN_RPC_RESPONSE'); return; }
        pending.delete(event.id);
        if (event.error) waiter.reject(new Error(`RPC_${waiter.method}:${JSON.stringify(event.error)}`));
        else {
          if (waiter.method === 'turn/start' && active && validText(event.result?.turn?.id)) {
            active.turnId = event.result.turn.id;
            activeTurns.set(active.threadId, active.turnId);
          }
          waiter.resolve(event.result);
        }
        return;
      }
      if (event.id !== undefined && event.method) {
        toolQueue = toolQueue.then(() => handleRequest(event)).catch(error => { fail(error); });
        return;
      }
      const p = event.params || {};
      if (['hook/started', 'hook/completed'].includes(event.method)
        && ['preToolUse', 'postToolUse'].includes(p.run?.eventName)) {
        const run = p.run;
        // P06's observed HookRun ID convention, not a general call-ID schema.
        // Unknown formats remain evidence gaps; never guess from a final colon.
        const prefix = `${run.eventName === 'preToolUse' ? 'pre-tool-use' : 'post-tool-use'}:${run.displayOrder}:${run.sourcePath}:`;
        const callId = Number.isSafeInteger(run.displayOrder) && validText(run.sourcePath)
          && typeof run.id === 'string' && run.id.startsWith(prefix) ? run.id.slice(prefix.length) : null;
        hookEvents.push({thread_id: p.threadId, turn_id: p.turnId, event: event.method,
          hook_run_id: run.id, event_name: run.eventName, source_path: run.sourcePath,
          source: run.source, status: run.status, call_id: validText(callId) ? callId : null});
      }
      if (/model\/rerouted|modelRerouted/.test(event.method || '')) fail('MODEL_REROUTED');
      if (event.method === 'error') {
        report.errors.push({at: Date.now(), native: p});
        if (!p.willRetry) fail('NATIVE_ERROR');
      }
      if (event.method === 'thread/started') {
        const t = p.thread, parent = t?.source?.subAgent?.thread_spawn?.parent_thread_id;
        if (parent) observeChild(t.id, parent, {method: event.method, source: t.source});
      }
      if (event.method === 'turn/started') {
        check(activeFamily.has(p.threadId), 'FOREIGN_OR_OLD_STARTED_THREAD');
        activeTurns.set(p.threadId, p.turn.id);
        if (active?.threadId === p.threadId && active.turnId === null) active.turnId = p.turn.id;
      }
      if (event.method === 'thread/tokenUsage/updated') {
        check(knownThreads.has(p.threadId), 'FOREIGN_USAGE_THREAD');
        check(activeTurns.get(p.threadId) === p.turnId || report.turns.some(t => t.thread_id === p.threadId && t.id === p.turnId), 'FOREIGN_USAGE_TURN');
        const total = p.tokenUsage?.total;
        check(['totalTokens', 'inputTokens', 'outputTokens', 'cachedInputTokens', 'reasoningOutputTokens']
          .every(k => Number.isSafeInteger(total?.[k]) && total[k] >= 0), 'INVALID_USAGE');
        check(!usage.has(p.threadId) || usage.get(p.threadId).totalTokens <= total.totalTokens, 'CUMULATIVE_USAGE_REGRESSED');
        usage.set(p.threadId, {...total});
        // total is cumulative per thread. Cache is already part of input, not an extra charge.
        if ([...usage.values()].reduce((n, u) => n + u.totalTokens, 0) > budgets.observed_tokens) fail('OBSERVED_TOKEN_BUDGET');
      }
      if (['item/started', 'item/completed'].includes(event.method)) {
        check(knownThreads.has(p.threadId), 'FOREIGN_ITEM_THREAD');
        check(activeTurns.get(p.threadId) === p.turnId, 'STALE_ITEM_TURN');
        const item = p.item || {};
        if (item.type === 'collabAgentToolCall') {
          for (const id of item.receiverThreadIds || []) {
            // A send/wait receiver need not be the sender's child. Only creation
            // establishes a new edge; existing peers retain their original parent.
            if (item.tool === 'spawnAgent') observeChild(id, p.threadId, {method: event.method, item_id: item.id, tool: item.tool});
            else check(activeFamily.has(id), 'UNREGISTERED_COLLAB_RECEIVER');
          }
          for (const [id, state] of Object.entries(item.agentsStates || {})) {
            if (knownThreads.has(id)) knownThreads.get(id).status = state.status;
            if (['errored', 'notFound', 'interrupted'].includes(state.status)) report.errors.push({at: Date.now(), child_thread: id, state});
          }
        }
        const toolTypes = ['commandExecution', 'fileChange', 'mcpToolCall', 'dynamicToolCall', 'collabAgentToolCall', 'webSearch', 'imageView', 'imageGeneration'];
        if (toolTypes.includes(item.type)) {
          toolProjection(p.threadId, p.turnId, item.id, event.method);
          if (item.type === 'dynamicToolCall' && validText(item.tool)) dynamicAction(p.threadId, p.turnId, item.tool, item.id, 'items');
          else action(p.threadId, p.turnId, item.id);
          report.native_tools.push({thread_id: p.threadId, turn_id: p.turnId, event: event.method, item});
          if (['commandExecution', 'imageView', 'mcpToolCall'].includes(item.type)) {
            report.limitations.push(`UNKNOWN_NATIVE_READ_SCOPE:${p.threadId}:${item.id}`);
            if (item.type !== 'commandExecution' || !verifiedCommandThreads.has(p.threadId)) invalidNativeScope = true;
          }
          if (['webSearch', 'fileChange', 'imageGeneration'].includes(item.type)
            || (item.type === 'mcpToolCall' && item.readOnlyHint !== true)) fail(`UNVERIFIED_EXTERNAL_OR_WRITE_TOOL:${item.type}`);
          if (event.method === 'item/completed' && (item.error || item.success === false
            || (item.exitCode !== undefined && item.exitCode !== null && item.exitCode !== 0))) {
            report.errors.push({at: Date.now(), native_tool_failure: item});
          }
        }
        if (event.method === 'item/completed' && item.type === 'agentMessage' && active?.threadId === p.threadId && active?.turnId === p.turnId) active.messages.push(item.text);
      }
      if (event.method === 'turn/completed') {
        check(knownThreads.has(p.threadId), 'FOREIGN_COMPLETED_THREAD');
        check(activeTurns.get(p.threadId) === p.turn?.id, 'STALE_OR_FOREIGN_COMPLETED_TURN');
        terminalFor(p.threadId, p.turn.id).resolve(p);
        activeTurns.delete(p.threadId);
        knownThreads.get(p.threadId).status = p.turn.status;
        report.turns.push({thread_id: p.threadId, ...p.turn});
        if (p.turn.status === 'failed' || p.turn.error) report.errors.push({at: Date.now(), failed_turn: p});
      }
    };
    const terminateGroup = signal => {
      try {
        if (child?.pid && process.platform !== 'win32') process.kill(-child.pid, signal);
        else child?.kill(signal);
        report.cleanup.push({signal, at: Date.now(), sent: true});
      } catch (error) { report.cleanup.push({signal, at: Date.now(), error: error.code}); }
    };
    try {
      const modules = await bounded(loadModules());
      const condition = await bounded(modules.materializeCondition({conditionId, sourceRoot: manifest.source_root,
        sourceManifestPath: manifest.source_manifest, destination: join(root, 'condition')}));
      check(condition.id === conditionId && realpathSync(condition.root) === join(root, 'condition'), 'CONDITION_ROOT_MISMATCH');
      const readPaths = condition.allowedReadPaths.map(p => {
        check(!isAbsolute(p), 'CONDITION_ABSOLUTE_PATH');
        const path = join(condition.root, p);
        check(within(condition.root, realpathSync(path)) && !lstatSync(path).isSymbolicLink(), 'CONDITION_PATH_ESCAPE');
        return path;
      });
      const material = [];
      const collect = dir => {
        for (const name of readdirSync(dir).sort()) {
          const path = join(dir, name), stat = lstatSync(path);
          check(!stat.isSymbolicLink(), 'CONDITION_SYMLINK');
          if (stat.isDirectory()) collect(path);
          else { check(stat.isFile(), 'CONDITION_SPECIAL_FILE'); material.push({path: relative(condition.root, path).split(sep).join('/'), sha256: sha(readFileSync(path))}); }
        }
      };
      collect(condition.root); material.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
      const conditionIdentity = sha(JSON.stringify(material));
      check(condition.materialSha256 === conditionIdentity && bindings.condition_material_sha256 === conditionIdentity, 'RELEASE_CONDITION_TREE_DRIFT');
      report.condition = {...condition, identity_sha256: conditionIdentity};
      const protectedPaths = release.native_command_permissions === undefined ? [] :
        [realpathSync(manifest.source_root), dirname(realpathSync(manifestPath)),
          dirname(realpathSync(manifest.source_manifest)), dirname(realpathSync(caseFile)), root];
      permissions = validateNativePermissions(release, condition.root, protectedPaths);
      if (permissions) {
        report.native_command_permissions = {requested: permissions.native,
          boundary_status: permissions.proof ? 'EVIDENCE_BOUND_IDENTITY_PENDING' : 'NATIVE_BOUNDARY_UNVERIFIED',
          actual_read_scope: 'UNKNOWN', scope: 'native-command-only', effective_responses: [], evidence: []};
        if (!permissions.proof) report.limitations.push('NATIVE_BOUNDARY_UNVERIFIED');
        for (const [index, entry] of permissions.evidence.entries()) {
          const path = join(evidenceRoot, `native-permission-evidence-${index}.json`);
          writeFileSync(path, entry.bytes, {flag: 'wx'});
          report.native_command_permissions.evidence.push({source: entry.path, path, sha256: entry.sha256});
        }
      }
      const caseRoot = join(condition.root, 'case'); mkdirSync(caseRoot);
      // Only the case engine consumes the case body; it owns safe stage projection.
      const caseEvidenceRoot = join(evidenceRoot, 'case-engine');
      mkdirSync(caseEvidenceRoot);
      runtime = await bounded(modules.createCaseRuntime({caseData: matches[0], caseRoot, evidenceRoot: caseEvidenceRoot, conditionReadPaths: readPaths}));
      check(typeof runtime.registerThread === 'function', 'CASE_THREAD_REGISTRATION_API_REQUIRED');
      const definitions = modules.TOOL_DEFINITIONS;
      check(Array.isArray(definitions) && ['case_read', 'case_write', 'case_checkpoint', 'case_question']
        .every(name => definitions.filter(d => d.name === name && d.type === 'function').length === 1), 'CASE_TOOL_DEFINITIONS_INVALID');
      const conditionMessage = condition.instructionFiles.map(p => {
        const path = join(condition.root, p); check(readPaths.includes(path), 'UNDELIVERED_CONDITION_INSTRUCTION');
        return `Condition instruction path (native root discovery; do not duplicate its text): ${path}`;
      }).join('\n\n');
      for (const [name, key] of [['driver', 'driver_sha256'], ['conditions', 'conditions_sha256'], ['protocol', 'case_protocol_sha256']]) {
        check(bindings[key] === sha(readFileSync(paths[name])), `PRE_DISPATCH_${name.toUpperCase()}_DRIFT`);
      }
      check(bindings.cases_sha256 === sha(readFileSync(caseFile)), 'PRE_DISPATCH_CASE_DRIFT');
      check(bindings.source_manifest_sha256 === sha(readFileSync(manifest.source_manifest)), 'PRE_DISPATCH_SOURCE_DRIFT');
      if (registration) readProbeRegistration(release, caseFile, manifest.source_manifest);
      if (permissions) validateNativePermissions(release, condition.root, protectedPaths);
      if (Date.now() >= report.deadline_ms) fail('ABSOLUTE_DEADLINE');
      if (fatal) throw fatal;
      const args = ['app-server', '--listen', 'stdio://', '--disable', 'apps'];
      const permissionConfig = permissions ? {default_permissions: permissions.native.profile_id,
        permissions: {[permissions.native.profile_id]: permissions.native.profile}} : {};
      if (permissions) args.push('-c', `permissions.${permissions.native.profile_id}=${toml(permissions.native.profile)}`,
        '-c', `default_permissions=${JSON.stringify(permissions.native.profile_id)}`);
      report.invocation = {command: codexCommand, args, cwd: condition.root, model: release.model.name,
        effort: release.model.effort, native_base_instructions_preserved: true,
        parent_environment_inherited: true, permission_config: permissionConfig, native_injection: 'UNKNOWN_UNTIL_THREAD_RESPONSE'};
      child = spawnProcess(codexCommand, args, {cwd: condition.root, env: {...process.env},
        stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32'});
      child.stdin.on('error', error => { if (!stopping) fail(error); });
      child.stdout.on('data', bytes => appendFileSync(files['stdout.log'], bytes));
      child.stderr.on('data', bytes => appendFileSync(files['stderr.log'], bytes));
      child.on('error', fail);
      child.on('exit', (code, signal) => {
        exitRecord = {code, signal, at: Date.now()};
        if (!stopping) fail(`APP_SERVER_EXIT:${code}:${signal}`);
      });
      child.on('close', () => { closed = true; });
      createInterface({input: child.stdout}).on('line', line => {
        journal('inbound', {raw: line});
        try { observe(JSON.parse(line)); } catch (error) { fail(error); }
      });
      const initialized = await bounded(rpc('initialize', {clientInfo: {name: 'tri_system_eval', version: '1'}, capabilities: {experimentalApi: true}}));
      report.server_identity = initialized;
      if (permissions?.proof) {
        const version = initialized.userAgent?.match(/^(?:tri_system_eval|codex_cli_rs|codex)\/(\S+)/)?.[1];
        check(initialized.userAgent === permissions.proof.codex_user_agent && version === permissions.proof.codex_version,
          'NATIVE_CODEX_VERSION_MISMATCH');
      }
      send({method: 'initialized', params: {}});
      let message = await bounded(Promise.resolve(runtime.initialMessage()));
      let terminalMessage = '';
      while (true) {
        const response = await bounded(rpc('thread/start', {model: release.model.name,
          cwd: condition.root, ephemeral: true,
          ...(permissions ? {permissions: permissions.native.profile_id} : {sandbox: 'read-only'}), approvalPolicy: 'never',
          allowProviderModelFallback: false, dynamicTools: definitions,
          config: {...permissionConfig, web_search: 'disabled', ...(release.model.effort ? {model_reasoning_effort: release.model.effort} : {})}}));
        const threadId = response.thread?.id;
        check(validText(threadId) && !knownThreads.has(threadId), 'THREAD_ID_REUSED_OR_MISSING');
        if (permissions) {
          report.native_command_permissions.effective_responses.push({thread_id: threadId, response});
          check(response.activePermissionProfile?.id === permissions.native.profile_id
            && response.activePermissionProfile.extends == null, 'NATIVE_EFFECTIVE_PROFILE_MISMATCH');
        }
        check(response.model === release.model.name && validText(response.modelProvider)
          && response.approvalPolicy === 'never' && response.sandbox?.type === 'readOnly'
          && (permissions ? response.sandbox.networkAccess === false : response.sandbox.networkAccess !== true),
        'EFFECTIVE_MODEL_OR_SAFETY_MISMATCH');
        if (permissions?.proof) {
          verifiedCommandThreads.add(threadId);
          report.native_command_permissions.boundary_status = 'BOUND_TO_ACCEPTED_PROBE';
        }
        if (release.model.effort) check(response.reasoningEffort === release.model.effort, 'EFFECTIVE_EFFORT_MISMATCH');
        knownThreads.set(threadId, {id: threadId, parent: null, status: 'started', effective: response});
        activeFamily.clear(); activeFamily.add(threadId);
        await bounded(register(threadId, null, {method: 'thread/start', response_thread_id: response.thread.id}));
        report.invocation.native_injection = 'RECORDED_IN_THREAD_RESPONSE; completeness unverified';
        nextControl = null;
        active = {threadId, turnId: null, fresh: deferred(), messages: []};
        const begun = await bounded(rpc('turn/start', {threadId,
          input: [{type: 'text', text: `${conditionMessage}\n\n${message}`}],
          model: release.model.name, ...(release.model.effort ? {effort: release.model.effort} : {}),
          approvalPolicy: 'never', ...(permissions ? {permissions: permissions.native.profile_id}
            : {sandboxPolicy: {type: 'readOnly', networkAccess: false}})}));
        const turnId = begun.turn?.id;
        check(validText(turnId), 'MISSING_TURN_ID');
        active.turnId = turnId;
        // Notifications may precede the RPC response. Do not overwrite an already completed turn.
        if (!report.turns.some(t => t.thread_id === threadId && t.id === turnId)) activeTurns.set(threadId, turnId);
        const result = await bounded(Promise.race([terminalFor(threadId, turnId).promise.then(terminal => ({terminal})),
          active.fresh.promise.then(() => ({fresh: true}))]));
        await bounded(toolQueue);
        if (result.fresh || nextControl?.type === 'fresh_context') {
          const interruptedFamily = await bounded(Promise.all([...activeTurns]
            .filter(([id]) => activeFamily.has(id))
            .map(([id, turn]) => interrupt(id, turn, 'fresh_context'))));
          const interrupted = interruptedFamily.find(r => r.thread_id === threadId);
          check(interruptedFamily.every(r => r.confirmed), 'FRESH_FAMILY_INTERRUPT_UNCONFIRMED');
          check(interrupted?.confirmed && interrupted.terminal.turn.status === 'interrupted', 'FRESH_INTERRUPT_UNCONFIRMED');
          check([...activeTurns].every(([id]) => id === threadId), 'FRESH_HAS_UNFINISHED_CHILD');
          check([...activeFamily].every(id => ['completed', 'interrupted', 'failed', 'errored', 'shutdown'].includes(knownThreads.get(id).status)), 'FRESH_FAMILY_TERMINAL_UNKNOWN');
          message = await bounded(Promise.resolve(runtime.resumeMessage()));
          activeFamily.clear();
          active = null;
          continue;
        }
        check(result.terminal.turn.status === 'completed' && !result.terminal.turn.error, 'TURN_NOT_COMPLETED');
        terminalMessage = active.messages.join('\n');
        check(validText(terminalMessage), 'MISSING_TERMINAL_MESSAGE');
        check(activeTurns.size === 0, 'UNFINISHED_CHILD_TURN');
        check([...activeFamily].map(id => knownThreads.get(id)).filter(t => t.parent).every(t => t.status === 'completed'), 'CHILD_NOT_COMPLETED');
        report.engine = await bounded(Promise.resolve(runtime.finalize({terminalMessage})));
        report.status = report.engine?.status === 'INVALID_RUN' || report.engine?.invalid_run === true
          ? 'INVALID_RUN' : 'COMPLETED';
        break;
      }
    } catch (error) {
      if (!fatal || fatal.message !== error.message) fail(error);
    } finally {
      clearTimeout(deadlineTimer);
      for (const [signal, fn] of signalHandlers) process.removeListener(signal, fn);
      if (child) {
        if (fatal) await Promise.all([...activeTurns].map(([threadId, turnId]) => interrupt(threadId, turnId, fatal.message)));
        stopping = true;
        await Promise.race([toolQueue, sleep(grace)]);
        terminateGroup('SIGTERM');
        await sleep(grace);
        // Always address the process group, even if its leader already exited.
        terminateGroup('SIGKILL');
        await Promise.race([new Promise(r => child.once('close', r)), sleep(grace)]);
        child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy(); child.unref();
      }
      for (const waiter of pending.values()) waiter.reject(new Error('DRIVER_SHUTDOWN'));
      pending.clear();
      report.transport_exit = exitRecord;
      report.client_operations = [...clientOperations.values()];
      if (report.client_operations.some(op => op.status === 'pending')) {
        report.limitations.push('UNKNOWN_IN_FLIGHT_CASE_CALLBACK: callback API has no cancellation primitive; cleanup cannot revoke already-started filesystem work.');
        fail('UNFINISHED_CASE_CALLBACK');
      }
      report.unfinished_turns = [...activeTurns].map(([thread_id, turn_id]) => ({thread_id, turn_id}));
      report.threads = [...knownThreads.values()];
      report.dynamic_tool_counts = [...dynamicCounts].map(([key, counts]) => ({
        identity: JSON.parse(key), callback_count: counts.callbacks.size, item_count: counts.items.size,
        counted: Math.max(counts.callbacks.size, counts.items.size)}));
      if (report.dynamic_tool_counts.some(c => c.item_count && c.callback_count !== c.item_count)) {
        report.limitations.push('UNKNOWN_DYNAMIC_TOOL_CALLBACK_COVERAGE');
      }
      // Reconcile after cleanup so pre/post hooks, items and callbacks may arrive
      // in either order, including hooks following the terminal notification.
      // Hooks are activity witnesses, not extra billable actions or success proof.
      const unmatched = new Map();
      for (const event of hookEvents) {
        const key = JSON.stringify([event.thread_id, event.turn_id, event.call_id]);
        if (event.call_id && toolProjections.has(key)) continue;
        const gapKey = event.call_id ? key : JSON.stringify([event.thread_id, event.turn_id, event.hook_run_id]);
        if (!unmatched.has(gapKey)) unmatched.set(gapKey, {
          thread_id: event.thread_id, turn_id: event.turn_id, call_id: event.call_id,
          hook_run_ids: [], reason: event.call_id ? 'NO_MATCHING_ITEM_OR_CALLBACK' : 'UNRECOGNIZED_HOOK_ID'});
        const gap = unmatched.get(gapKey);
        if (!gap.hook_run_ids.includes(event.hook_run_id)) gap.hook_run_ids.push(event.hook_run_id);
      }
      const mappingComplete = unmatched.size === 0
        && !report.limitations.includes('UNKNOWN_DYNAMIC_TOOL_CALLBACK_COVERAGE');
      report.visible_tool_actions = report.tool_actions;
      report.tool_action_observability = {
        visible_unique_operations: report.visible_tool_actions,
        counting_basis: 'Unique visible items; dynamic callback/item projections use their per-tool maximum, not their sum. Hook-only activity is not added as a charge; no wrapper/child equivalence is inferred.',
        mapping_complete: mappingComplete, whole_chain_coverage: 'UNKNOWN',
        hard_limit_compliance: report.visible_tool_actions > budgets.tool_actions ? 'EXCEEDED' : 'UNKNOWN',
        formal_comparison_eligible: false,
        limitation: 'No whole-chain telemetry proof. Visible budget enforcement cannot cap unreported or ambiguously mapped operations; matched hooks prove neither execution success nor native permission behavior.',
        hook_events: hookEvents, tool_projections: [...toolProjections.values()],
        unmapped_hook_calls: [...unmatched.values()]};
      if (!mappingComplete) {
        report.tool_actions = null; // Do not expose the partial count as a complete scalar.
        report.limitations.push('INCOMPLETE_TOOL_ACTION_OBSERVABILITY');
        fail('INCOMPLETE_TOOL_ACTION_OBSERVABILITY');
      }
      const missing = [...knownThreads.keys()].filter(id => !usage.has(id));
      report.usage = {per_thread_cumulative: Object.fromEntries(usage), missing_thread_ids: missing,
        observed_total_tokens: usage.size ? [...usage.values()].reduce((n, u) => n + u.totalTokens, 0) : null,
        complete: knownThreads.size > 0 && missing.length === 0,
        whole_chain_coverage: 'UNKNOWN_UNTIL_NATIVE_CHILD_TELEMETRY_PROBE',
        token_limit: 'Stops when reported cumulative usage exceeds cap; unreported in-flight tokens cannot be hard-capped.',
        aggregation: 'Latest cumulative total per distinct thread; cached input not added again; descendant inclusion requires live confirmation.', cost: null};
      if (runtime) {
        try { report.engine_snapshot = runtime.snapshot(); } catch (error) { fail(`SNAPSHOT:${error.message}`); }
      }
      if (fatal) report.status = 'INVALID_RUN';
      if (invalidNativeScope || (permissions && !permissions.proof)) report.status = 'INVALID_RUN';
      report.finished_at = new Date().toISOString(); report.elapsed_ms = Date.now() - started;
      report.deadline_overrun_ms = Math.max(0, Date.now() - report.deadline_ms);
      writeFileSync(files['result.json'], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
    }
    return report;
  };
}

export const runTrial = createTrialRunner();

if (process.argv[1] && resolve(process.argv[1]) === self) {
  const names = {'--manifest': 'manifestPath', '--cases': 'caseFile', '--case': 'caseId',
    '--condition': 'conditionId', '--trial': 'trial', '--out': 'outputRoot'};
  try {
    const options = {};
    for (let i = 2; i < process.argv.length; i += 2) {
      const key = names[process.argv[i]], value = process.argv[i + 1];
      check(key && value && !value.startsWith('--') && options[key] === undefined, 'INVALID_CLI_ARGUMENTS');
      options[key] = value;
    }
    check(Object.keys(options).length === 6, 'REQUIRED: --manifest --cases --case --condition --trial --out');
    options.trial = Number(options.trial);
    const result = await runTrial(options);
    console.log(JSON.stringify({status: result.status, evidence_root: result.evidence_root}));
    process.exitCode = result.status === 'COMPLETED' ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
