// W35 integration: real runtime modules; only the stdio peer and on-disk trace are synthetic.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createInterface } from 'node:readline';
import { appendFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Default deployment is next to the three actual modules. The override selects
// an integration checkout, never replacement implementations or runtime stubs.
const moduleRoot = resolve(process.env.U007_MODULE_ROOT || dirname(fileURLToPath(import.meta.url)));
const { createTrialRunner } = await import(pathToFileURL(join(moduleRoot, 'driver.mjs')));
const { materializeCondition } = await import(pathToFileURL(join(moduleRoot, 'conditions.mjs')));
// RED may pair the frozen R8 driver with the frozen real observer. This override
// selects only owner code; it never supplies a stub or replacement parser.
const traceModuleRoot = resolve(process.env.U007_TRACE_MODULE_ROOT || moduleRoot);
const { createNativeTraceObserver } = await import(pathToFileURL(join(traceModuleRoot, 'native-trace.mjs')));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHashes = Object.fromEntries(['driver', 'conditions', 'case-protocol'].map(name =>
  [name, sha(readFileSync(join(moduleRoot, `${name}.mjs`)))]));
const offlineUserAgent = 'tri_system_eval/0.0.0-offline';
const nativeLaunch = { allow_login_shell: false, shell_snapshot: false, experimental_raw_events: true };
const material = (path, content, stage = 'inputs_delivered') =>
  ({ path, content, stage, encoding: 'utf-8', sha256: sha(content) });
const event = (id, checkpoint, extras = {}) => ({ id, kind: 'human_choice',
  trigger: { kind: 'mandatory_driver_checkpoint', checkpoint, ordinal: 1 },
  effective_from: { checkpoint, position: 'after_delivery_before_any_next_action' },
  source: { principal: 'human_user', authority: 'user_scope' }, object: 'local-job', scope: 'local only',
  revokes: [], supersedes: [], payload: { choice: 'local' }, delivery_ack_required: true, ...extras });
const dependency = (id, checkpoint, succeeded) => event(id, checkpoint, { kind: 'dependency_result',
  payload: { result: succeeded ? { status: 'succeeded', exit_code: 0, artifact: { records: [] } }
    : { status: 'failed', exit_code: 2, completed_claim: true, artifact: { partial: true }, retry_token: 'one-retry' } } });

function fixture() {
  return { id: 'synthetic-local-records', complexity: 'simple',
    request: 'Read the supplied records and preserve their contents in the authorized local result.',
    authorized_actions: { read_paths: ['input/records.json'], write_paths: ['output/result.json'], network: false, external_effects: false },
    initial_files: [material('input/records.json', '{"records":[{"id":"first"},{"id":"second"}]}\n')],
    events: [], expected_artifacts: [{ path: 'output/result.json', format: 'json', required: true }],
    driver_protocol: { mandatory_checkpoints: ['request_delivered', 'inputs_delivered', 'work_ready', 'before_final_submission'],
      terminal_status_rule: 'Complete the authorized local delivery with retained failure history.' },
    failure_recovery_script: { mode: 'declarative_driver_actions_only', no_shell_execution: true, steps: [] },
    clarification_script: { missing_material: 'Use the released material.', unnecessary_confirmation: 'Continue authorized work.',
      new_scope_request: 'No added scope.', required_human_choice: 'Only the delivered event supplies a decision.' } };
}

// Only the stdio peer is simulated. Its script calls the real driver's dynamic
// tools; it cannot access the case runtime, write artifacts, or finalize it.
function fakeTransport(script, permissions, launch, traceSetup) {
  const transcript = [], scripts = [], terminalThreads = new Set();
  let failure;
  const spawnProcess = (_command, args, options) => {
    assert.deepEqual(args.slice(0, 5), ['app-server', '--listen', 'stdio://', '--disable', 'apps']);
    if (launch) {
      assert.ok(permissions, 'launch settings must not replace the permission profile');
      assert.equal(args.length, 13, 'only two fixed launch settings may be added');
      const pairs = [];
      for (let i = 5; i < args.length; i += 2) pairs.push(args.slice(i, i + 2));
      const toml = value => value && typeof value === 'object'
        ? `{${Object.entries(value).map(([key, v]) => `${JSON.stringify(key)}=${toml(v)}`).join(',')}}` : JSON.stringify(value);
      // Both documented spellings disable the same single feature. No other
      // flag, environment override, permission expansion or duplicate is valid.
      const normalized = pairs.map(pair => JSON.stringify(
        pair[0] === '--disable' && pair[1] === 'shell_snapshot' ? ['-c', 'features.shell_snapshot=false'] : pair)).sort();
      assert.deepEqual(normalized, [
        ['-c', `permissions.${permissions.profile_id}=${toml(permissions.profile)}`],
        ['-c', `default_permissions=${JSON.stringify(permissions.profile_id)}`],
        ['-c', 'allow_login_shell=false'], ['-c', 'features.shell_snapshot=false'],
      ].map(pair => JSON.stringify(pair)).sort());
    } else if (permissions) {
      assert.equal(args.length, 9);
      assert.equal(args[5], '-c'); assert.equal(args[7], '-c');
      const toml = value => value && typeof value === 'object'
        ? `{${Object.entries(value).map(([key, v]) => `${JSON.stringify(key)}=${toml(v)}`).join(',')}}` : JSON.stringify(value);
      assert.equal(args[6], `permissions.${permissions.profile_id}=${toml(permissions.profile)}`);
      assert.equal(args[8], `default_permissions=${JSON.stringify(permissions.profile_id)}`);
    } else assert.equal(args.length, 5);
    const trace = traceSetup?.(options.env?.CODEX_ROLLOUT_TRACE_ROOT, options);
    const child = new EventEmitter();
    child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.unref = () => {};
    child.kill = signal => { child.emit('exit', null, signal); child.emit('close'); return true; };
    child.stdin.on('finish', () => { child.emit('exit', 0, null); child.emit('close'); });
    let rootCount = 0, callCount = 0;
    const pending = new Map(), usageTotals = new Map();
    const send = message => { transcript.push({ direction: 'server', message }); child.stdout.write(JSON.stringify(message) + '\n'); };
    const notify = (method, params) => send({ method, params });
    const respond = (request, result) => send({ id: request.id, result });
    const identity = threadId => ({ threadId, turnId: `turn-${threadId}` });
    const terminal = (threadId, status = 'completed') => {
      trace?.terminal?.(threadId, status);
      terminalThreads.add(threadId);
      notify('thread/tokenUsage/updated', { threadId, turnId: identity(threadId).turnId,
        tokenUsage: { total: usageTotals.get(threadId) ?? { totalTokens: 7, inputTokens: 4, outputTokens: 3, cachedInputTokens: 0, reasoningOutputTokens: 0 } } });
      notify('turn/completed', { threadId, turn: { id: identity(threadId).turnId, status, error: null } });
    };
    const api = {
      trace,
      conditionPath: join(options.cwd, 'AGENTS.md'), conditionRoot: options.cwd,
      // Explicit call IDs let the integration fixture reproduce observed hook /
      // callback / item correlations without replacing the real observer.
      call: (threadId, tool, arguments_, callId) => new Promise(resolveCall => {
        const id = `tool-${++callCount}`, logicalId = callId ?? id;
        const operation = trace?.start?.(threadId, logicalId, tool);
        pending.set(id, result => { if (operation) trace.end(operation, result); resolveCall(result); });
        send({ id, method: 'item/tool/call', params: { ...identity(threadId), callId: logicalId, tool, arguments: arguments_ } });
      }),
      notify,
      identity,
      usage: (threadId, tokenUsage) => {
        usageTotals.set(threadId, tokenUsage.total);
        notify('thread/tokenUsage/updated', { ...identity(threadId), tokenUsage });
      },
      exhaustTokens: threadId => {
        const total = { totalTokens: 1001, inputTokens: 1000, outputTokens: 1, cachedInputTokens: 0, reasoningOutputTokens: 0 };
        usageTotals.set(threadId, total);
        notify('thread/tokenUsage/updated', { ...identity(threadId), tokenUsage: { total } });
      },
      child: (parent, id) => {
        trace?.child?.(parent, id, identity(id).turnId);
        notify('thread/started', { thread: { id, source: { subAgent: { thread_spawn: { parent_thread_id: parent } } } } });
        notify('turn/started', { threadId: id, turn: { id: identity(id).turnId } });
      },
      commandObservation: threadId => notify('item/completed', { ...identity(threadId),
        item: { id: 'synthetic-computation', type: 'commandExecution', command: 'printf 2', commandActions: [], exitCode: 0 } }),
      finish: threadId => {
        notify('item/completed', { ...identity(threadId), item: { id: `message-${threadId}`, type: 'agentMessage', text: 'Local delivery recorded.' } });
        terminal(threadId);
      },
      terminal,
    };
    createInterface({ input: child.stdin }).on('line', line => {
      const request = JSON.parse(line); transcript.push({ direction: 'client', message: request });
      if (!request.method) { pending.get(request.id)?.(request.result); pending.delete(request.id); return; }
      if (request.method === 'initialize') respond(request, { userAgent: offlineUserAgent });
      else if (request.method === 'thread/start') {
        assert.equal(request.params.experimentalRawEvents, launch ? true : undefined);
        if (permissions) {
          assert.equal(request.params.permissions, permissions.profile_id);
          assert.equal(Object.hasOwn(request.params, 'sandbox'), false);
          assert.equal(Object.hasOwn(request.params, 'sandboxPolicy'), false);
          assert.deepEqual(request.params.config.permissions, { [permissions.profile_id]: permissions.profile });
          assert.equal(request.params.config.default_permissions, permissions.profile_id);
        }
        const id = `root-${++rootCount}`;
        respond(request, { thread: { id }, model: request.params.model, modelProvider: 'offline-synthetic',
          ...(permissions ? { activePermissionProfile: { id: permissions.profile_id, extends: null } } : {}),
          reasoningEffort: 'high', approvalPolicy: 'never', sandbox: { type: 'readOnly', networkAccess: false }, instructionSources: [] });
      } else if (request.method === 'turn/start') {
        if (permissions) {
          assert.equal(request.params.permissions, permissions.profile_id);
          assert.equal(Object.hasOwn(request.params, 'sandbox'), false);
          assert.equal(Object.hasOwn(request.params, 'sandboxPolicy'), false);
        }
        const threadId = request.params.threadId;
        trace?.root?.(threadId, identity(threadId).turnId);
        respond(request, { turn: { id: identity(threadId).turnId } });
        notify('turn/started', { threadId, turn: { id: identity(threadId).turnId } });
        // Let the driver consume its turn/start response before callbacks begin.
        scripts.push(Promise.resolve().then(() => script(api, threadId, request.params.input, rootCount)).catch(error => {
          failure = error; child.emit('error', error);
        }));
      } else if (request.method === 'turn/interrupt') {
        respond(request, {});
        // A response alone is deliberately insufficient: the terminal event is
        // emitted in a later event-loop turn, as with asynchronous transport.
        setImmediate(() => terminal(request.params.threadId, 'interrupted'));
      } else assert.equal(request.method, 'initialized');
    });
    return child;
  };
  return { spawnProcess, transcript, terminalThreads, settle: async () => { await Promise.all(scripts); if (failure) throw failure; } };
}

async function invoke(api, thread, tool, args, denied) {
  const response = await api.call(thread, tool, args);
  assert.equal(response.success, !denied, JSON.stringify(response));
  const payload = JSON.parse(response.contentItems[0].text);
  if (denied) assert.equal(payload.error, denied);
  return payload;
}
const checkpoint = (api, thread, name, extra = {}) => invoke(api, thread, 'case_checkpoint', { checkpoint: name, ...extra });
async function begin(api, thread) {
  const condition = await invoke(api, thread, 'case_read', { path: api.conditionPath });
  assert.ok(condition.content.length > 0);
  await checkpoint(api, thread, 'inputs_delivered');
  await checkpoint(api, thread, 'work_ready');
}
async function copy(api, thread) {
  const input = await invoke(api, thread, 'case_read', { path: 'input/records.json' });
  await invoke(api, thread, 'case_write', { path: 'output/result.json', content: input.content });
}
async function finish(api, thread) { await checkpoint(api, thread, 'before_final_submission'); api.finish(thread); }

// These records test binding and consumption ONLY. They are created in an
// exclusive temporary fixture and used solely with the injected fake transport.
// No command, native boundary probe, reviewer, or real approval is represented.
function offlineProof(temp, release, conditionRoot) {
  const native = release.native_command_permissions;
  const evidence = id => {
    const path = join(temp, `FAKE-ONLY-${id}.json`);
    writeFileSync(path, JSON.stringify({ id, fake_transport_only: true, no_live_authority: true }));
    return { path, sha256: sha(readFileSync(path)) };
  };
  const proof = { schema_version: 1, kind: 'u007-app-server-native-command-boundary', status: 'ACCEPTED',
    issued_by: 'root-coordinator', offline_fixture: true, no_live_authority: true,
    j_review: { decision: 'ACCEPTED', evidence: evidence('synthetic-review') },
    driver_sha256: release.bindings.driver_sha256, codex_version: '0.0.0-offline', codex_user_agent: offlineUserAgent,
    condition_root: conditionRoot, profile: structuredClone(native.profile), runtime_read_roots: [],
    active_permission_profile: { id: native.profile_id, extends: null },
    effective_config: { default_permissions: native.profile_id, permissions: { [native.profile_id]: structuredClone(native.profile) } },
    checks: ['app_server_command', 'allowed_read', 'outside_read_denied', 'symlink_escape_denied', 'write_denied', 'child_inherits_denial']
      .map(id => ({ id, passed: true, command: `FAKE ONLY: ${id}; never executed`, exit_code: 0, evidence: evidence(id) })),
    unmeasured: ['No live command, sandbox, model, child, MCP, image, or semantic consumption is verified.'] };
  const path = join(temp, 'FAKE-ONLY-boundary-proof.json');
  writeFileSync(path, JSON.stringify(proof));
  return { path, sha256: sha(readFileSync(path)) };
}

async function run(t, data, conditionId, script, options = {}) {
  const temp = realpathSync(mkdtempSync(join(tmpdir(), 'u007-real-integration-')));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  let sourceRoot = join(temp, 'source'); mkdirSync(sourceRoot);
  let sourceManifest = join(temp, 'source-manifest.json');
  if (['B', 'S'].includes(conditionId)) {
    assert.ok(process.env.U007_SOURCE_MANIFEST, 'B/S integration requires the explicit frozen source manifest');
    sourceManifest = realpathSync(process.env.U007_SOURCE_MANIFEST);
    sourceRoot = JSON.parse(readFileSync(sourceManifest)).root;
  } else writeFileSync(sourceManifest, JSON.stringify({ root: sourceRoot, tracked_sources: [] }));
  const prepared = await materializeCondition({ conditionId, sourceRoot, sourceManifestPath: sourceManifest, destination: join(temp, 'prepared') });
  const caseFile = join(temp, 'synthetic-case.json'); writeFileSync(caseFile, JSON.stringify(data));
  const resources = { wall_seconds: 8, tool_actions: options.toolActions ?? 80, observed_tokens: 1000 };
  const manifest = { source_root: sourceRoot, source_manifest: sourceManifest, budgets: { simple: resources }, runtime_release: {
    status: 'READY', stage: options.stage || 'development', run_id: 'offline-integration',
    entry: { transport: 'codex-app-server-stdio' }, run: { case_id: data.id, condition_id: conditionId, trial: 1 },
    model: { name: 'offline-fixture-no-model', effort: 'high' }, resources,
    bindings: { driver_sha256: sourceHashes.driver, conditions_sha256: sourceHashes.conditions,
      case_protocol_sha256: sourceHashes['case-protocol'], cases_sha256: sha(readFileSync(caseFile)),
      source_manifest_sha256: sha(readFileSync(sourceManifest)), condition_material_sha256: prepared.materialSha256 } } };
  if (options.enableTrace !== false) {
    manifest.runtime_release.native_trace = { enabled: true, schema_version: 1 };
    manifest.runtime_release.bindings.native_trace_sha256 = sha(readFileSync(join(traceModuleRoot, 'native-trace.mjs')));
  }
  if (Object.hasOwn(options, 'nativeLaunch')) manifest.runtime_release.entry.native_launch = options.nativeLaunch;
  if (options.permissions !== 'omit') {
    const release = manifest.runtime_release;
    const conditionRoot = join(temp, 'runs', release.run_id, 'condition');
    release.native_command_permissions = { profile_id: 'offline_integration',
      profile: { filesystem: { ':root': 'deny', ':minimal': 'read', [conditionRoot]: 'read' }, network: { enabled: false } },
      runtime_read_roots: [], effective_probe: null };
    if (options.permissions !== 'unverified')
      release.native_command_permissions.effective_probe = offlineProof(temp, release, conditionRoot);
    options.mutatePermissions?.(release.native_command_permissions, temp);
    if (release.stage === 'probe') {
      release.probe_id = 'OFFLINE-FIXTURE-NOT-A-LIVE-RELEASE';
      const registrationPath = join(temp, 'synthetic-registration.json');
      const registration = structuredClone({ schema_version: 1, kind: 'u007-capability-probe',
        status: 'REGISTERED', issued_by: 'root-coordinator', pool: 'additional-capability',
        capability_probe_limit: Object.hasOwn(options, 'nativeLaunch') ? 7 : 6,
        ...Object.fromEntries(['probe_id', 'run_id', 'run', 'bindings', 'model', 'resources', 'entry', 'native_command_permissions'].map(k => [k, release[k]])),
        case_file: { path: caseFile, sha256: release.bindings.cases_sha256 },
        source_manifest: { path: sourceManifest, sha256: release.bindings.source_manifest_sha256 },
        assertions: [{ id: 'offline', statement: 'Synthetic transport validates integration only; grants no live run.' }],
        stop_conditions: ['No actual native transport or model may be started.'], offline_fixture: true });
      options.mutateRegistration?.(registration);
      writeFileSync(registrationPath, JSON.stringify(registration));
      release.registration = { path: registrationPath, sha256: sha(readFileSync(registrationPath)) };
    }
  }
  options.configureRelease?.(manifest.runtime_release);
  const manifestPath = join(temp, 'fake-ready.json'); writeFileSync(manifestPath, JSON.stringify(manifest));
  const transport = fakeTransport(script, manifest.runtime_release.native_command_permissions, options.nativeLaunch, options.traceSetup);
  const runner = createTrialRunner({ spawnProcess: transport.spawnProcess, paths: {
    driver: join(moduleRoot, 'driver.mjs'), conditions: join(moduleRoot, 'conditions.mjs'),
    protocol: join(moduleRoot, 'case-protocol.mjs'), nativeTrace: join(traceModuleRoot, 'native-trace.mjs'),
  } });
  const args = { manifestPath, caseFile, caseId: data.id, conditionId, trial: 1, outputRoot: join(temp, 'runs') };
  if (options.rejection) {
    await assert.rejects(runner(args), options.rejection);
    assert.equal(transport.transcript.length, 0);
    if (options.noCaseEffects) assert.equal(existsSync(join(temp, 'runs', 'offline-integration', 'condition', 'case')), false);
    return;
  }
  const report = await runner(args);
  if (options.driverFailure) {
    assert.equal(report.status, 'INVALID_RUN');
    assert.ok(report.errors.some(e => e.message?.includes(options.driverFailure)), JSON.stringify(report.errors));
    assert.equal(transport.transcript.length, 0);
    return;
  }
  await transport.settle();
  assert.deepEqual(JSON.parse(readFileSync(join(report.evidence_root, 'result.json'))), report);
  t.diagnostic(JSON.stringify({ sourceHashes, status: report.status, tool_actions: report.tool_actions,
    trace_status: report.native_trace?.status, issues: report.native_trace?.issues,
    trace_operations: report.native_trace?.operations.map(o => ({ key: o.key, tool: o.tool_name, status: o.status, exit_code: o.exit_code })),
    accounting: report.native_trace_accounting, errors: report.errors,
    interruptions: report.interruptions.map(i => ({ confirmed: i.confirmed, reason: i.reason, requested_at: i.requested_at })) }));
  const rpc = readFileSync(join(report.evidence_root, 'rpc.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  await options.inspect?.({ report, transport, rpc });
  return { report, transport };
}

// Native trace fixture encoding and contract assertions follow the frozen owner schema.
// Reference: W33 synthetic-index.json SHA256
// 2ccd7492c0edac5f884f26526dad2b6a9b988791660e216044523fa1a2d8f45d.
// This writes test data only. It neither implements nor substitutes the reader.
const directRequester = () => ({ type: 'model' });
// Official model/runtime.rs ToolCallKind: exec_command or other{name}.
const toolKind = tool => tool === 'exec_command' ? { type: 'exec_command' } : { type: 'other', name: tool };
const toolResult = (result, codeMode, callId) => codeMode
  ? { type: 'code_mode_response', value: result }
  : { type: 'direct_response', response_item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(result) } };
function traceFixture(t, { fault, endRunningOnInterrupt = false } = {}) {
  let traceRoot, processTraceRoot;
  const bundles = new Map(), threads = new Map(), operations = new Map();
  const setup = (requestedRoot, spawnOptions) => {
    processTraceRoot = requestedRoot;
    traceRoot = requestedRoot || join(dirname(spawnOptions.cwd), 'evidence', 'synthetic-offline-trace');
    mkdirSync(traceRoot, { recursive: true });
    assert.equal(traceRoot.startsWith(spawnOptions.cwd + '/'), false, 'trace must be outside candidate read root');
    for (const key of new Set([...Object.keys(process.env), ...Object.keys(spawnOptions.env)]))
      if (key !== 'CODEX_ROLLOUT_TRACE_ROOT') assert.equal(spawnOptions.env[key], process.env[key], 'only trace env key may change');
    const payload = (bundle, kind, value) => {
      const id = ++bundle.payloadId, path = `payloads/${id}.json`;
      writeFileSync(join(bundle.path, path), JSON.stringify(value));
      return { raw_payload_id: `raw_payload:${id}`, kind: { type: kind }, path };
    };
    const emit = (bundle, thread, turn, value) => {
      if (fault === 'missing') return;
      appendFileSync(join(bundle.path, 'trace.jsonl'), JSON.stringify({ schema_version: 1, seq: ++bundle.seq,
        wall_time_unix_ms: Date.now(), rollout_id: bundle.root, thread_id: thread, codex_turn_id: turn, payload: value }) + '\n');
    };
    const addThread = (bundle, id, turn) => {
      const metadata = { thread_id: id, agent_path: '/root', task_name: null,
        nickname: null, agent_role: null, session_source: 'cli',
        cwd: '/synthetic', rollout_path: null, model: 'offline-fixture-no-model', provider_name: 'offline-synthetic',
        approval_policy: 'never', sandbox_policy: 'synthetic' };
      threads.set(id, { bundle, turn, ended: false });
      emit(bundle, null, null, { type: 'thread_started', thread_id: id, agent_path: metadata.agent_path,
        metadata_payload: payload(bundle, 'session_metadata', metadata) });
      emit(bundle, id, turn, { type: 'codex_turn_started', codex_turn_id: turn, thread_id: id });
    };
    const api = {
      root(id, turn) {
        const path = join(traceRoot, `trace-${id}`);
        const bundle = { root: id, path, seq: 0, payloadId: 0, ended: false };
        bundles.set(id, bundle);
        if (fault === 'missing') { threads.set(id, { bundle, turn }); return; }
        mkdirSync(join(path, 'payloads'), { recursive: true });
        writeFileSync(join(path, 'manifest.json'), JSON.stringify({ schema_version: 1, trace_id: `trace-${id}`,
          rollout_id: id, root_thread_id: id, started_at_unix_ms: Date.now(), raw_event_log: 'trace.jsonl', payloads_dir: 'payloads' }));
        emit(bundle, null, null, { type: 'rollout_started', trace_id: `trace-${id}`, root_thread_id: id });
        addThread(bundle, id, turn);
      },
      start(thread, id, tool, { codeMode = false } = {}) {
        if (fault === 'missing') return null;
        const { bundle, turn } = threads.get(thread), cell = `cell-${id}`;
        if (codeMode) emit(bundle, thread, turn, { type: 'code_cell_started', runtime_cell_id: cell,
          model_visible_call_id: `wrapper-${id}`, source_js: '/* synthetic data, never execute */' });
        const op = { bundle, thread, turn, id, tool, cell: codeMode ? cell : null, ended: false };
        operations.set(id, op);
        emit(bundle, thread, turn, { type: 'tool_call_started', tool_call_id: id,
          model_visible_call_id: codeMode ? null : id, code_mode_runtime_tool_id: codeMode ? `runtime-${id}` : null,
          requester: codeMode ? { type: 'code_cell', runtime_cell_id: cell } : directRequester(),
          kind: toolKind(tool), summary: { type: 'generic', label: tool, input_preview: null, output_preview: null },
          invocation_payload: payload(bundle, 'tool_invocation', { tool_name: tool, tool_namespace: null,
            payload: { type: 'function', arguments: '{"note":"TRACE_PAYLOAD_CONTENT_MUST_NOT_LEAK"}' } }) });
        if (tool === 'exec_command') emit(bundle, thread, turn, { type: 'tool_call_runtime_started', tool_call_id: id,
          runtime_payload: payload(bundle, 'tool_runtime_event', { call_id: id, turn_id: turn, process_id: `process-${id}`,
            command: ['synthetic'], cwd: '/synthetic', parsed_cmd: [], source: 'unified_exec_startup', started_at_ms: Date.now() }) });
        return op;
      },
      end(op, result) {
        if (!op || op.ended) return;
        op.ended = true;
        const { bundle, thread, turn, id, tool, cell } = op;
        const exit = result.exit_code ?? (result.success === false ? 1 : 0), status = exit ? 'failed' : 'completed';
        if (tool === 'exec_command') emit(bundle, thread, turn, { type: 'tool_call_runtime_ended', tool_call_id: id, status,
          runtime_payload: payload(bundle, 'tool_runtime_event', { call_id: id, turn_id: turn, process_id: `process-${id}`,
            command: ['synthetic'], cwd: '/synthetic', parsed_cmd: [], source: 'unified_exec_startup', completed_at_ms: Date.now(),
            stdout: '', stderr: '', aggregated_output: result.output || '', exit_code: exit,
            duration: { secs: 0, nanos: 1 }, formatted_output: result.output || '', status }) });
        emit(bundle, thread, turn, { type: 'tool_call_ended', tool_call_id: id, status,
          result_payload: payload(bundle, 'tool_result', toolResult(result, !!cell, id)) });
        if (cell) for (const type of ['code_cell_initial_response', 'code_cell_ended'])
          emit(bundle, thread, turn, { type, runtime_cell_id: cell, status: 'completed',
            response_payload: payload(bundle, 'tool_result', { response: { Result: { cell_id: cell, content_items: [], error_text: null } } }) });
      },
      terminal(thread, status) {
        // Native Rollout Trace maps TurnAbortReason::Interrupted to Cancelled.
        // RPC keeps its own interrupted status; only this disk fixture is mapped.
        const turnStatus = status === 'interrupted' ? 'cancelled' : status;
        const rolloutStatus = status === 'interrupted' ? 'aborted' : status;
        if (fault === 'missing' || fault === 'missing-terminal') return;
        const state = threads.get(thread);
        if (!state || state.ended) return;
        if (endRunningOnInterrupt) for (const op of operations.values())
          if (op.thread === thread && !op.ended) api.end(op, { exit_code: 130, output: 'synthetic interruption' });
        state.ended = true;
        emit(state.bundle, thread, state.turn, { type: 'codex_turn_ended', codex_turn_id: state.turn, status: turnStatus });
        emit(state.bundle, null, null, { type: 'thread_ended', thread_id: thread, status: rolloutStatus });
        if ([...threads.values()].filter(s => s.bundle === state.bundle).every(s => s.ended)) {
          emit(state.bundle, null, null, { type: 'rollout_ended', status: rolloutStatus }); state.bundle.ended = true;
          if (fault === 'truncated') appendFileSync(join(state.bundle.path, 'trace.jsonl'), '{"unfinished":');
        }
      },
    };
    return api;
  };
  setup.verify = async ({ roots, status, operations: count }) => {
    const observer = createNativeTraceObserver({ traceRoot });
    const first = await observer.poll({ rootThreadIds: roots, final: true });
    assert.equal(first.status, status, JSON.stringify(first.issues));
    assert.equal(first.operations.length, count);
    assert.deepEqual(await observer.poll({ rootThreadIds: roots, final: true }), first, 'disk replay poll is cumulative and idempotent');
    t.diagnostic(JSON.stringify({ trace_module_sha256: sha(readFileSync(join(traceModuleRoot, 'native-trace.mjs'))),
      process_trace_enabled: !!processTraceRoot, fixture_roots: roots, status: first.status, operations: count }));
  };
  return setup;
}

function assertUnknownCoverage(report) {
  assert.equal(report.native_trace_accounting.whole_chain_coverage, 'UNKNOWN');
  assert.equal(report.tool_action_observability.formal_comparison_eligible, false);
  assert.equal(report.engine_snapshot.necessary_controls, 'NOT_EVALUATED');
  assert.ok(report.native_trace_accounting.poll_count > 0);
  assert.ok(Number.isFinite(report.native_trace_accounting.max_poll_gap_ms));
  assert.doesNotMatch(JSON.stringify(report.native_trace), /TRACE_PAYLOAD_CONTENT_MUST_NOT_LEAK/);
}

test('W35: direct and CodeMode inner dispatches map without charging wrapper or callback projections twice', async t => {
  const traceSetup = traceFixture(t);
  const { report } = await run(t, fixture(), 'T', async (api, root) => {
    const args = { checkpoint: 'inputs_delivered' }, id = 'dynamic-checkpoint';
    api.notify('item/started', { ...api.identity(root), item: { id, type: 'dynamicToolCall', tool: 'case_checkpoint', arguments: args } });
    const response = await api.call(root, 'case_checkpoint', args, id);
    assert.equal(response.success, true);
    const dynamic = { ...api.identity(root), item: { id, type: 'dynamicToolCall', tool: 'case_checkpoint', arguments: args,
      status: 'completed', contentItems: response.contentItems, success: true } };
    api.notify('item/completed', dynamic); api.notify('item/completed', dynamic);
    for (const [callId, codeMode] of [['direct-native', false], ['inner-native', true]]) {
      const op = api.trace.start(root, callId, 'exec_command', { codeMode });
      api.trace.end(op, { exit_code: 0, output: 'TRACE_PAYLOAD_CONTENT_MUST_NOT_LEAK' });
      if (!codeMode) api.notify('item/completed', { ...api.identity(root),
        item: { id: callId, type: 'commandExecution', command: 'FAKE ONLY', exitCode: 0 } });
    }
    api.notify('rawResponseItem/completed', { ...api.identity(root), item: { type: 'custom_tool_call',
      id: 'outer-item', call_id: 'outer-wrapper', name: 'exec', input: 'tools.exec_command(); tools.exec_command(); // DATA ONLY' } });
    api.finish(root);
  }, { traceSetup });
  assert.equal(report.native_trace.status, 'VALID');
  assert.equal(report.native_trace.operations.length, 3);
  assert.equal(report.native_trace_accounting.observed_unique_operations, 3);
  assert.equal(report.native_trace_accounting.mapping_complete, true);
  assert.equal(report.tool_actions, null, 'three observed operations are not proof of whole-chain coverage');
  assert.equal(report.status, 'COMPLETED');
  assert.equal(report.engine.protocol_complete, false, 'valid trace cannot repair missing candidate deliverables');
  assert.equal(report.engine_snapshot.writes.length, 0);
  assertUnknownCoverage(report);
  await traceSetup.verify({ roots: ['root-1'], status: 'VALID', operations: 3 });
});

test('W35: live trace starts exceed budget before terminal and remain readable after interrupt cleanup', async t => {
  const traceSetup = traceFixture(t, { endRunningOnInterrupt: true });
  let dispatchedAt;
  const { report, transport } = await run(t, fixture(), 'T', async (api, root) => {
    dispatchedAt = Date.now();
    for (let i = 0; i < 3; i++) api.trace.start(root, `running-${i}`, 'exec_command', { codeMode: true });
    // No RPC tool projection, terminal event or manual token exhaustion. Only
    // the real driver's live disk polling can discover this budget overrun.
  }, { traceSetup, toolActions: 2 });
  assert.equal(report.status, 'INVALID_RUN');
  assert.ok(report.interruptions.some(r => r.confirmed && r.terminal.turn.status === 'interrupted'));
  assert.ok(report.interruptions[0].requested_at - dispatchedAt < 3000, 'must interrupt from live starts, not the 8-second wall deadline');
  assert.ok(report.errors.some(e => /BUDGET/.test(e.message || '') && !/DEADLINE/.test(e.message || '')));
  assert.equal(report.native_trace_accounting.observed_unique_operations, 3);
  assert.equal(report.native_trace.operations.length, 3);
  assert.ok(transport.terminalThreads.has('root-1'));
  assert.equal(report.engine_snapshot.artifacts.find(a => a.path === 'output/result.json').exists, false);
  assertUnknownCoverage(report);
  await traceSetup.verify({ roots: ['root-1'], status: 'VALID', operations: 3 });
});

for (const fault of ['missing', 'truncated', 'missing-terminal']) test(`W35: ${fault} trace cannot become zero-action success`, async t => {
  const traceSetup = traceFixture(t, { fault });
  const { report } = await run(t, fixture(), 'T', async (api, root) => {
    if (fault !== 'missing') {
      const op = api.trace.start(root, 'native-failure', 'exec_command');
      api.trace.end(op, { exit_code: 1, output: 'TRACE_PAYLOAD_CONTENT_MUST_NOT_LEAK' });
    }
    api.finish(root);
  }, { traceSetup });
  assert.equal(report.status, 'INVALID_RUN');
  assert.equal(report.native_trace.status, 'INVALID');
  assert.equal(report.tool_actions, null);
  assert.ok(report.native_trace.issues.length > 0);
  assert.equal(report.engine_snapshot.artifacts.find(a => a.path === 'output/result.json').exists, false);
  assertUnknownCoverage(report);
});

test('W35: failed native result is retained without inventing a successful result or artifact', async t => {
  const traceSetup = traceFixture(t);
  const { report } = await run(t, fixture(), 'T', async (api, root) => {
    const op = api.trace.start(root, 'native-exit-one', 'exec_command', { codeMode: true });
    api.trace.end(op, { exit_code: 1, output: 'TRACE_PAYLOAD_CONTENT_MUST_NOT_LEAK' });
    api.finish(root);
  }, { traceSetup });
  assert.equal(report.native_trace.status, 'VALID', 'native failure need not corrupt the trace structure');
  assert.equal(report.native_trace.operations.length, 1);
  assert.equal(report.native_trace.operations[0].exit_code, 1);
  assert.equal(report.native_trace.operations[0].status, 'failed');
  assert.equal(report.engine.protocol_complete, false);
  assert.equal(report.engine.completion_claim_verified, false);
  assert.equal(report.engine_snapshot.artifacts.find(a => a.path === 'output/result.json').exists, false);
  assertUnknownCoverage(report);
  await traceSetup.verify({ roots: ['root-1'], status: 'VALID', operations: 1 });
});
