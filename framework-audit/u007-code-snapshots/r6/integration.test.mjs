import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createInterface } from 'node:readline';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Default deployment is next to the three actual modules. The override selects
// an integration checkout, never replacement implementations or runtime stubs.
const moduleRoot = resolve(process.env.U007_MODULE_ROOT || dirname(fileURLToPath(import.meta.url)));
const { createTrialRunner } = await import(pathToFileURL(join(moduleRoot, 'driver.mjs')));
const { materializeCondition } = await import(pathToFileURL(join(moduleRoot, 'conditions.mjs')));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHashes = Object.fromEntries(['driver', 'conditions', 'case-protocol'].map(name =>
  [name, sha(readFileSync(join(moduleRoot, `${name}.mjs`)))]));
const offlineUserAgent = 'tri_system_eval/0.0.0-offline';
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
function fakeTransport(script, permissions) {
  const transcript = [], scripts = [], terminalThreads = new Set();
  let failure;
  const spawnProcess = (_command, args, options) => {
    assert.deepEqual(args.slice(0, 5), ['app-server', '--listen', 'stdio://', '--disable', 'apps']);
    if (permissions) {
      assert.equal(args.length, 9);
      assert.equal(args[5], '-c'); assert.equal(args[7], '-c');
      const toml = value => value && typeof value === 'object'
        ? `{${Object.entries(value).map(([key, v]) => `${JSON.stringify(key)}=${toml(v)}`).join(',')}}` : JSON.stringify(value);
      assert.equal(args[6], `permissions.${permissions.profile_id}=${toml(permissions.profile)}`);
      assert.equal(args[8], `default_permissions=${JSON.stringify(permissions.profile_id)}`);
    } else assert.equal(args.length, 5);
    const child = new EventEmitter();
    child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.unref = () => {};
    child.kill = signal => { child.emit('exit', null, signal); child.emit('close'); return true; };
    let rootCount = 0, callCount = 0;
    const pending = new Map(), usageTotals = new Map();
    const send = message => { transcript.push({ direction: 'server', message }); child.stdout.write(JSON.stringify(message) + '\n'); };
    const notify = (method, params) => send({ method, params });
    const respond = (request, result) => send({ id: request.id, result });
    const identity = threadId => ({ threadId, turnId: `turn-${threadId}` });
    const terminal = (threadId, status = 'completed') => {
      terminalThreads.add(threadId);
      notify('thread/tokenUsage/updated', { threadId, turnId: identity(threadId).turnId,
        tokenUsage: { total: usageTotals.get(threadId) ?? { totalTokens: 7, inputTokens: 4, outputTokens: 3, cachedInputTokens: 0, reasoningOutputTokens: 0 } } });
      notify('turn/completed', { threadId, turn: { id: identity(threadId).turnId, status, error: null } });
    };
    const api = {
      conditionPath: join(options.cwd, 'AGENTS.md'), conditionRoot: options.cwd,
      // Explicit call IDs let the integration fixture reproduce observed hook /
      // callback / item correlations without replacing the real observer.
      call: (threadId, tool, arguments_, callId) => new Promise(resolveCall => {
        const id = `tool-${++callCount}`; pending.set(id, resolveCall);
        send({ id, method: 'item/tool/call', params: { ...identity(threadId), callId: callId ?? id, tool, arguments: arguments_ } });
      }),
      notify,
      identity,
      exhaustTokens: threadId => {
        const total = { totalTokens: 1001, inputTokens: 1000, outputTokens: 1, cachedInputTokens: 0, reasoningOutputTokens: 0 };
        usageTotals.set(threadId, total);
        notify('thread/tokenUsage/updated', { ...identity(threadId), tokenUsage: { total } });
      },
      child: (parent, id) => {
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
  const resources = { wall_seconds: 15, tool_actions: 80, observed_tokens: 1000 };
  const manifest = { source_root: sourceRoot, source_manifest: sourceManifest, budgets: { simple: resources }, runtime_release: {
    status: 'READY', stage: options.stage || 'development', run_id: 'offline-integration',
    entry: { transport: 'codex-app-server-stdio' }, run: { case_id: data.id, condition_id: conditionId, trial: 1 },
    model: { name: 'offline-fixture-no-model', effort: 'high' }, resources,
    bindings: { driver_sha256: sourceHashes.driver, conditions_sha256: sourceHashes.conditions,
      case_protocol_sha256: sourceHashes['case-protocol'], cases_sha256: sha(readFileSync(caseFile)),
      source_manifest_sha256: sha(readFileSync(sourceManifest)), condition_material_sha256: prepared.materialSha256 } } };
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
      writeFileSync(registrationPath, JSON.stringify({ schema_version: 1, kind: 'u007-capability-probe',
        status: 'REGISTERED', issued_by: 'root-coordinator', pool: 'additional-capability', capability_probe_limit: 6,
        ...Object.fromEntries(['probe_id', 'run_id', 'run', 'bindings', 'model', 'resources', 'entry', 'native_command_permissions'].map(k => [k, release[k]])),
        case_file: { path: caseFile, sha256: release.bindings.cases_sha256 },
        source_manifest: { path: sourceManifest, sha256: release.bindings.source_manifest_sha256 },
        assertions: [{ id: 'offline', statement: 'Synthetic transport validates integration only; grants no live run.' }],
        stop_conditions: ['No actual native transport or model may be started.'], offline_fixture: true }));
      release.registration = { path: registrationPath, sha256: sha(readFileSync(registrationPath)) };
    }
  }
  const manifestPath = join(temp, 'fake-ready.json'); writeFileSync(manifestPath, JSON.stringify(manifest));
  const transport = fakeTransport(script, manifest.runtime_release.native_command_permissions);
  const runner = createTrialRunner({ spawnProcess: transport.spawnProcess });
  const args = { manifestPath, caseFile, caseId: data.id, conditionId, trial: 1, outputRoot: join(temp, 'runs') };
  if (options.rejection) {
    await assert.rejects(runner(args), options.rejection);
    assert.equal(transport.transcript.length, 0);
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
  if (options.inspectObservation) {
    const result = JSON.parse(readFileSync(join(report.evidence_root, 'result.json')));
    assert.deepEqual(result, report);
    const rpc = readFileSync(join(report.evidence_root, 'rpc.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const inbound = rpc.filter(r => r.direction === 'inbound').map(r => JSON.parse(r.raw));
    t.diagnostic(JSON.stringify({ sourceHashes, status: report.status, tool_actions: report.tool_actions,
      visible_tool_actions: report.visible_tool_actions, observability: report.tool_action_observability,
      errors: report.errors, limitations: report.limitations, engine_status: report.engine?.status,
      snapshot_stage: report.engine_snapshot?.stage, writes: report.engine_snapshot?.writes.length,
      hook_ids: inbound.filter(e => e.method?.startsWith('hook/')).map(e => e.params.run.id) }));
    await options.inspectObservation({ report, transport, inbound, data });
    return { report, transport };
  }
  t.diagnostic(JSON.stringify({ stage: manifest.runtime_release.stage, observed_status: report.status,
    engine_status: report.engine?.status, engine_invalid_run: report.engine?.invalid_run,
    protocol_errors: report.engine?.protocol_errors.map(e => e.code), sourceHashes }));
  if (options.engineInvalid) {
    // Check the real engine fault before testing its top-level propagation.
    assert.equal(report.engine.invalid_run, true);
    assert.equal(report.engine.status, 'INVALID_RUN');
    assert.ok(report.engine.protocol_errors.some(e => e.code === 'EACCES'));
    assert.ok(report.engine.tool_receipts.some(r => r.isError && JSON.parse(r.text).error === 'EACCES'));
  }
  assert.equal(report.status, options.permissions === 'unverified' || options.engineInvalid ? 'INVALID_RUN' : 'COMPLETED', JSON.stringify(report.errors));
  if (options.permissions !== 'omit') {
    const permission = report.native_command_permissions;
    assert.equal(permission.boundary_status, options.permissions === 'unverified' ? 'NATIVE_BOUNDARY_UNVERIFIED' : 'BOUND_TO_ACCEPTED_PROBE');
    assert.equal(permission.actual_read_scope, 'UNKNOWN');
    assert.equal(report.limitations.includes('NATIVE_BOUNDARY_UNVERIFIED'), options.permissions === 'unverified');
    assert.deepEqual(permission.requested.profile.filesystem,
      { ':root': 'deny', ':minimal': 'read', [report.condition.root]: 'read' });
    // caseRoot is inside the only task read root; evidence, original case and
    // its future payloads are outside it. This is configuration, not OS proof.
    for (const denied of [report.evidence_root, caseFile, sourceManifest])
      assert.equal(denied.startsWith(report.condition.root + '/'), false);
  }
  assert.equal(report.engine.protocol_complete, !options.candidateIncomplete);
  assert.equal(report.engine.finalized, true);
  assert.equal(report.engine.status, options.engineInvalid ? 'INVALID_RUN' : 'RECORDED');
  assert.equal(report.engine.invalid_run, !!options.engineInvalid);
  assert.equal(report.engine.completion_claim_verified, false);
  assert.equal(report.engine.semantic_quality, 'NOT_EVALUATED');
  assert.deepEqual(report.engine.checkpoints, options.candidateIncomplete ? ['request_delivered'] : data.driver_protocol.mandatory_checkpoints);
  if (!options.engineInvalid) assert.deepEqual(report.errors, []);
  assert.deepEqual(report.unfinished_turns, []);
  assert.equal(report.usage.complete, true);
  assert.equal(report.condition.materialSha256, prepared.materialSha256);
  const { finalEvidencePath, ...finalRecord } = report.engine;
  assert.deepEqual(JSON.parse(readFileSync(finalEvidencePath)), finalRecord);
  const result = JSON.parse(readFileSync(join(report.evidence_root, 'result.json')));
  assert.deepEqual(result, report);
  const output = join(report.condition.root, 'case/output/result.json');
  if (options.candidateIncomplete) assert.equal(existsSync(output), false);
  else assert.equal(readFileSync(output, 'utf8'), data.initial_files[0].content);
  t.diagnostic(JSON.stringify({ moduleRoot, sourceHashes, conditionId, tool_actions: report.tool_actions,
    simulated_tokens: report.usage.observed_total_tokens, candidate_errors: report.candidate_tool_errors.length,
    failures: report.engine.failures.length, threads: report.threads.length }));
  return { report, transport };
}

// P06 RPC hook envelope shape, with synthetic identities and source path. These
// are notifications from the fake app-server peer, never candidate tool text or
// real global hook configuration. The hook handler's completion is not the
// command's completion and carries no command-output/permission proof.
function hookPair(api, thread, callId, { duplicate = false } = {}) {
  for (const [eventName, prefix, displayOrder] of [['preToolUse', 'pre-tool-use', 0], ['postToolUse', 'post-tool-use', 2]]) {
    for (const status of ['running', 'completed']) {
      const method = status === 'running' ? 'hook/started' : 'hook/completed';
      const sourcePath = '/offline/fixture-hooks.json';
      const params = { ...api.identity(thread), run: {
        id: `${prefix}:${displayOrder}:${sourcePath}:${callId}`, eventName, handlerType: 'command',
        executionMode: 'sync', scope: 'turn', sourcePath, source: 'user', displayOrder, status,
        statusMessage: null, startedAt: 1, completedAt: status === 'completed' ? 2 : null,
        durationMs: status === 'completed' ? 1 : null, entries: [] } };
      api.notify(method, params);
      if (duplicate) api.notify(method, params);
    }
  }
}
function dynamicItem(api, thread, id, args, result, { duplicate = false } = {}) {
  for (const phase of ['started', 'completed']) {
    const params = { ...api.identity(thread), item: { type: 'dynamicToolCall', id,
      namespace: null, tool: 'case_checkpoint', arguments: args,
      status: phase === 'started' ? 'inProgress' : 'completed',
      contentItems: phase === 'completed' ? result.contentItems : null,
      success: phase === 'completed' ? result.success : null } };
    api.notify(`item/${phase}`, params);
    if (duplicate) api.notify(`item/${phase}`, params);
  }
}
function assertPartialInputs({ report, inbound, data }) {
  const state = report.engine_snapshot;
  assert.equal(state.stage, 'inputs_delivered');
  assert.deepEqual(state.checkpoints, ['request_delivered', 'inputs_delivered']);
  assert.equal(state.writes.length, 0);
  assert.equal(state.artifacts.find(a => a.path === 'output/result.json').exists, false);
  assert.equal(readFileSync(join(report.condition.root, 'case/input/records.json'), 'utf8'), data.initial_files[0].content);
  assert.equal(report.engine?.completion_claim_verified === true, false);
  assert.equal(state.necessary_controls, 'NOT_EVALUATED');
  assert.ok(inbound.some(e => e.method === 'hook/completed' && e.params.run.id.endsWith(':exec-unmapped-native')));
  assert.ok(inbound.some(e => e.method === 'item/completed' && e.params.item.id === 'exec-visible-checkpoint'));
  assert.equal(report.native_tools.some(n => n.item.type === 'commandExecution'), false);
}

for (const interrupted of [false, true]) test(`W26: P06 unmapped hook attempt survives ${interrupted ? 'budget interruption' : 'normal terminal'} as incomplete evidence`, async t => {
  await run(t, fixture(), 'T', async (api, root) => {
    hookPair(api, root, 'exec-unmapped-native');
    const id = 'exec-visible-checkpoint', args = { checkpoint: 'inputs_delivered' };
    hookPair(api, root, id);
    const result = await api.call(root, 'case_checkpoint', args, id);
    assert.equal(result.success, true);
    dynamicItem(api, root, id, args, result);
    if (interrupted) {
      api.exhaustTokens(root);
      // Leave the turn open. The real driver must interrupt and retain the
      // unmatched hook evidence as well as its original budget failure.
    } else api.finish(root);
  }, { inspectObservation(observation) {
    const { report } = observation;
    assertPartialInputs(observation);
    if (interrupted) {
      assert.ok(report.errors.some(e => e.message === 'OBSERVED_TOKEN_BUDGET'));
      assert.ok(report.interruptions.some(e => e.confirmed && e.terminal.turn.status === 'interrupted'));
    }
    assert.equal(report.status, 'INVALID_RUN', 'unmapped native activity cannot qualify as a completed comparable run');
    assert.equal(report.tool_actions, null, 'a partial visible count must not masquerade as a whole-chain total');
    assert.equal(report.visible_tool_actions, 1, 'one mapped dynamic callback/item action; hook-only activity is separately unresolved');
    const coverage = report.tool_action_observability;
    assert.equal(coverage.mapping_complete, false);
    assert.equal(coverage.whole_chain_coverage, 'UNKNOWN');
    assert.equal(coverage.hard_limit_compliance, 'UNKNOWN');
    assert.equal(coverage.formal_comparison_eligible, false);
    assert.equal(coverage.unmapped_hook_calls.length, 1);
    const gap = coverage.unmapped_hook_calls[0];
    assert.equal(gap.call_id, 'exec-unmapped-native');
    assert.equal(gap.thread_id, 'root-1');
    assert.equal(gap.turn_id, 'turn-root-1');
    assert.equal(gap.reason, 'NO_MATCHING_ITEM_OR_CALLBACK');
    assert.equal(gap.hook_run_ids.length, 2, 'pre/post hooks identify the same unresolved call');
    assert.equal(coverage.hook_events.length, 8, 'original start/complete and pre/post records remain visible');
    assert.ok(report.errors.some(e => e.message === 'INCOMPLETE_TOOL_ACTION_OBSERVABILITY'));
    assert.ok(report.limitations.includes('INCOMPLETE_TOOL_ACTION_OBSERVABILITY'));
  } });
});

for (const late of [false, true]) test(`W26: mapped native and dynamic ${late ? 'late duplicate' : 'normal'} items do not double-count or erase candidate errors`, async t => {
  await run(t, fixture(), 'T', async (api, root) => {
    const nativeId = 'exec-mapped-native';
    hookPair(api, root, nativeId, { duplicate: late });
    const native = { ...api.identity(root), item: { id: nativeId, type: 'commandExecution',
      command: 'FAKE ONLY: candidate computation failed', commandActions: [], exitCode: 2 } };
    if (!late) api.notify('item/started', native);
    const id = 'exec-visible-checkpoint', args = { checkpoint: 'inputs_delivered' };
    hookPair(api, root, id, { duplicate: late });
    if (!late) api.notify('item/started', { ...api.identity(root), item: { type: 'dynamicToolCall', id,
      tool: 'case_checkpoint', arguments: args, status: 'inProgress' } });
    const result = await api.call(root, 'case_checkpoint', args, id);
    assert.equal(result.success, true);
    dynamicItem(api, root, id, args, result, { duplicate: late });
    api.notify('item/completed', native);
    if (late) api.notify('item/completed', native);
    api.finish(root); // Deliberate candidate omission: unfinished protocol.
  }, { inspectObservation({ report, inbound }) {
    assert.equal(report.status, 'COMPLETED', 'ordinary candidate failure remains scoreable, not an observer infrastructure failure');
    assert.equal(report.tool_actions, 2);
    assert.equal(report.visible_tool_actions, 2);
    const observation = report.tool_action_observability;
    assert.equal(observation.mapping_complete, true);
    assert.deepEqual(observation.unmapped_hook_calls, []);
    assert.equal(observation.hook_events.length, late ? 16 : 8, 'retain duplicate raw events without counting them twice');
    assert.equal(observation.whole_chain_coverage, 'UNKNOWN');
    assert.equal(observation.hard_limit_compliance, 'UNKNOWN');
    assert.equal(observation.formal_comparison_eligible, false);
    assert.equal(report.engine.invalid_run, false);
    assert.equal(report.engine.protocol_complete, false);
    assert.equal(report.engine.completion_claim_verified, false);
    assert.ok(report.engine.protocol_errors.some(e => e.code === 'INCOMPLETE_PROTOCOL'));
    assert.ok(report.errors.some(e => e.native_tool_failure?.exitCode === 2));
    assert.ok(inbound.some(e => e.method === 'hook/completed'));
    assert.equal(report.engine.writes.length, 0);
    assert.equal(report.engine.necessary_controls, 'NOT_EVALUATED');
    assert.equal(report.limitations.includes('INCOMPLETE_TOOL_ACTION_OBSERVABILITY'), false);
  } });
});

for (const condition of ['T', 'I']) test(`real ${condition} materialization, staged tools and finalization`, async t => {
  const { report } = await run(t, fixture(), condition, async (api, root) => {
    await begin(api, root); await copy(api, root); await finish(api, root);
  });
  assert.deepEqual(report.candidate_tool_errors, []);
  assert.equal(report.engine.writes.length, 1);
  assert.equal(report.engine.failures.length, 0);
});

for (const condition of ['B', 'S']) test(`frozen ${condition} startup materials and case tools integrate`,
  { skip: !process.env.U007_SOURCE_MANIFEST && 'set U007_SOURCE_MANIFEST to a frozen source manifest' }, async t => {
    const { report } = await run(t, fixture(), condition, async (api, root) => {
      // Read-only reachability and byte identity, never execute startup/governance.
      const manifest = JSON.parse(readFileSync(process.env.U007_SOURCE_MANIFEST));
      for (const path of ['memory/scripts/get_memory.py', 'memory/scripts/daily_governance.py',
        'memory/scripts/_memroot.py', 'memory/scripts/_project.py',
        '.claude/skill-os/generated/context-index.md', '.claude/skills/office/SKILL.md']) {
        const record = manifest.tracked_sources.find(r => r.path === path);
        assert.ok(record, `missing frozen startup dependency ${path}`);
        assert.equal(sha(readFileSync(join(api.conditionRoot, path))), record.sha256, path);
      }
      assert.ok(existsSync(join(api.conditionRoot, '.agents/skills/office/SKILL.md')),
        'native repo skill material must be discoverable without following external aliases');
      await begin(api, root); await copy(api, root); await finish(api, root);
    }, { permissions: true });
    assert.deepEqual(report.candidate_tool_errors, []);
    assert.ok(report.condition.sourceBindings.length > 1);
  });

test('real Context denies evidence and future material, then releases only the declared stage', async t => {
  const data = fixture();
  data.authorized_actions.read_paths.push('input/future.txt');
  data.initial_files.push(material('input/future.txt', 'future-stage-content', 'work_ready'));
  const { report } = await run(t, data, 'T', async (api, root) => {
    await checkpoint(api, root, 'inputs_delivered');
    assert.equal(existsSync(join(api.conditionRoot, 'case/input/future.txt')), false);
    const evidencePath = join(dirname(api.conditionRoot), 'evidence/case-engine/case-source.json');
    assert.equal(existsSync(evidencePath), true);
    await invoke(api, root, 'case_read', { path: evidencePath }, 'PATH_DENIED');
    await invoke(api, root, 'case_read', { path: 'input/future.txt' }, 'READ_DENIED');
    await checkpoint(api, root, 'work_ready');
    assert.equal((await invoke(api, root, 'case_read', { path: 'input/future.txt' })).content, 'future-stage-content');
    api.commandObservation(root); // Event only: this command is never executed.
    await copy(api, root); await finish(api, root);
  }, { permissions: true });
  assert.deepEqual(report.engine.protocol_errors.map(e => e.code), ['PATH_DENIED', 'READ_DENIED']);
  assert.ok(report.limitations.some(s => s.startsWith('UNKNOWN_NATIVE_READ_SCOPE:')));
  assert.equal(report.native_tools.filter(n => n.item.type === 'commandExecution').length, 1);
});

test('configured permissions cannot start development without an accepted native proof', async t => {
  await run(t, fixture(), 'T', () => assert.fail('transport must not start'),
    { permissions: 'unverified', stage: 'development', rejection: /NATIVE_EFFECTIVE_PROOF_REQUIRED/ });
});

for (const stage of ['development', 'hidden']) test(`J05: missing permissions object rejects ${stage} before transport startup`, async t => {
  await run(t, fixture(), 'T', async (api, root) => {
    // The vulnerable driver actually completes this script. The repaired one
    // must reject before spawn; a callback failure is not accepted as refusal.
    await begin(api, root); await copy(api, root); await finish(api, root);
  }, { permissions: 'omit', stage, rejection: /NATIVE_.*(?:PERMISSION|PROOF)/ });
});

test('J05: real engine EACCES remains INVALID_RUN at the driver and persisted result', async t => {
  await run(t, fixture(), 'T', async (api, root) => {
    await begin(api, root); await copy(api, root);
    const input = join(api.conditionRoot, 'case/input/records.json');
    // Only the test harness induces the OS fault in its own disposable fixture.
    // The real case_read must hit fs EACCES; no runtime/module stub is injected.
    chmodSync(input, 0o000);
    try { await invoke(api, root, 'case_read', { path: 'input/records.json' }, 'EACCES'); }
    finally { chmodSync(input, 0o600); }
    await finish(api, root);
  }, { engineInvalid: true });
});

test('candidate omission stays a recorded quality failure, not an infrastructure INVALID_RUN', async t => {
  const { report } = await run(t, fixture(), 'T', (api, root) => api.finish(root), { candidateIncomplete: true });
  assert.deepEqual(report.engine.protocol_errors.map(e => e.code), ['INCOMPLETE_PROTOCOL']);
  assert.equal(report.engine.writes.length, 0);
});

test('registered fake probe without accepted proof remains boundary-unverified and INVALID_RUN', async t => {
  await run(t, fixture(), 'T', async (api, root) => {
    await begin(api, root); await copy(api, root); await finish(api, root);
  }, { permissions: 'unverified', stage: 'probe' });
});

test('registered offline probe rejects granting the run parent containing case-engine evidence', async t => {
  await run(t, fixture(), 'T', () => assert.fail('transport must not start'), {
    permissions: 'unverified', stage: 'probe', driverFailure: 'NATIVE_FILESYSTEM_MISMATCH',
    mutatePermissions(permission, temp) { permission.profile.filesystem[join(temp, 'runs', 'offline-integration')] = 'read'; },
  });
});

test('real dependency failure blocks output; one authorized retry preserves the failed attempt', async t => {
  const data = fixture();
  data.driver_protocol.mandatory_checkpoints.splice(3, 0, 'retry_requested', 'retry_result_delivered');
  data.events = [dependency('failed-attempt', 'work_ready', false), dependency('successful-retry', 'retry_result_delivered', true)];
  data.failure_recovery_script.steps = [
    { at: 'work_ready', driver_action: 'deliver_event', event_id: 'failed-attempt' },
    { at: 'retry_requested', candidate_action: 'request_retry', required_token: 'one-retry', maximum_requests: 1,
      driver_action: 'advance_checkpoint', next: 'retry_result_delivered' },
    { at: 'retry_result_delivered', driver_action: 'deliver_event', event_id: 'successful-retry' }];
  const { report } = await run(t, data, 'T', async (api, root) => {
    await begin(api, root);
    await checkpoint(api, root, 'work_ready', { acknowledgements: ['failed-attempt'] });
    await invoke(api, root, 'case_write', { path: 'output/result.json', content: '{}' }, 'DEPENDENCY_FAILED');
    await invoke(api, root, 'case_checkpoint', { checkpoint: 'retry_requested', retryToken: 'wrong' }, 'RETRY_TOKEN');
    await checkpoint(api, root, 'retry_requested', { retryToken: 'one-retry' });
    await checkpoint(api, root, 'retry_result_delivered', { acknowledgements: ['successful-retry'] });
    await copy(api, root); await finish(api, root);
  });
  assert.equal(report.engine.failures.length, 1);
  assert.equal(report.engine.failures[0].result.exit_code, 2);
  assert.deepEqual(report.engine.events.map(e => e.id), ['failed-attempt', 'successful-retry']);
  assert.deepEqual(report.engine.protocol_errors.map(e => e.code), ['DEPENDENCY_FAILED', 'RETRY_TOKEN']);
  assert.equal(report.candidate_tool_errors.length, 2);
});

test('driver registers a child with the real runtime: read/write allowed, root controls refused', async t => {
  const { report } = await run(t, fixture(), 'I', async (api, root) => {
    await begin(api, root); api.child(root, 'child-1');
    await invoke(api, 'child-1', 'case_checkpoint', { checkpoint: 'before_final_submission' }, 'ROOT_CONTROL_ONLY');
    await invoke(api, 'child-1', 'case_question', { kind: 'required_human_choice' }, 'ROOT_CONTROL_ONLY');
    await copy(api, 'child-1'); api.terminal('child-1'); await finish(api, root);
  });
  assert.equal(report.thread_registrations.length, 2);
  assert.ok(report.thread_registrations.every(r => r.status === 'registered'));
  assert.equal(report.thread_registrations[1].parentThreadId, 'root-1');
  assert.equal(report.engine.writes[0].threadId, 'child-1');
  assert.ok(report.engine.file_access.some(r => r.threadId === 'child-1'));
  assert.deepEqual(report.engine.protocol_errors.map(e => e.code), ['ROOT_CONTROL_ONLY', 'ROOT_CONTROL_ONLY']);
  assert.equal(report.candidate_tool_errors.length, 2);
});

test('fresh waits for old root and child terminal events; new root retains checkpoint, failure and identities', async t => {
  const data = fixture();
  data.authorized_actions.write_paths.push('output/checkpoint.json');
  data.authorized_actions.read_paths.push('input/current.txt');
  data.initial_files.push(material('input/current.txt', 'released-after-recovery', 'resume_start'));
  data.driver_protocol.mandatory_checkpoints.splice(3, 0, 'checkpoint_accepted', 'resume_start', 'decision_resolved');
  data.events = [dependency('old-failure', 'inputs_delivered', false), dependency('resolved-dependency', 'resume_start', true),
    event('current-decision', 'decision_resolved')];
  data.failure_recovery_script.steps = [
    { at: 'inputs_delivered', driver_action: 'deliver_event', event_id: 'old-failure' },
    { at: 'work_ready', candidate_action: 'submit_checkpoint', artifact: 'output/checkpoint.json', driver_action: 'validate_and_store_then_advance', next: 'checkpoint_accepted' },
    { at: 'checkpoint_accepted', driver_action: 'interrupt_and_discard_candidate_context', next: 'resume_start' },
    { at: 'resume_start', driver_action: 'start_fresh_context_with_declared_resume_payload', deliver_events: ['resolved-dependency'], next: 'decision_resolved' },
    { at: 'decision_resolved', driver_action: 'deliver_event', event_id: 'current-decision' }];
  const { report, transport } = await run(t, data, 'I', async (api, root, input, generation) => {
    if (generation === 1) {
      assert.doesNotMatch(JSON.stringify(input), /released-after-recovery/);
      await checkpoint(api, root, 'inputs_delivered');
      await checkpoint(api, root, 'work_ready', { acknowledgements: ['old-failure'] });
      api.child(root, 'old-child');
      const saved = await invoke(api, 'old-child', 'case_write', { path: 'output/checkpoint.json', content: '{"unfinished":"local delivery","failed_attempt":"old-failure"}' });
      await checkpoint(api, root, 'checkpoint_accepted', { artifact: { path: saved.path, sha256: saved.sha256 } });
      // Both turns remain active until the driver's interrupt requests arrive.
    } else {
      assert.equal(root, 'root-2');
      assert.match(JSON.stringify(input), /old-failure/);
      const saved = await invoke(api, root, 'case_read', { path: 'output/checkpoint.json' });
      assert.match(saved.content, /old-failure/);
      assert.equal((await invoke(api, root, 'case_read', { path: 'input/current.txt' })).content, 'released-after-recovery');
      await checkpoint(api, root, 'decision_resolved', { acknowledgements: ['resolved-dependency'] });
      await checkpoint(api, root, 'decision_resolved', { acknowledgements: ['current-decision'] });
      await copy(api, root); await finish(api, root);
    }
  });
  assert.equal(report.interruptions.length, 2);
  assert.ok(report.interruptions.every(r => r.confirmed && r.terminal.turn.status === 'interrupted'));
  const messages = transport.transcript;
  const newStart = messages.findIndex(r => r.direction === 'server' && r.message.result?.thread?.id === 'root-2');
  for (const id of ['root-1', 'old-child']) {
    const terminalIndex = messages.findIndex(r => r.message.method === 'turn/completed' && r.message.params.threadId === id);
    assert.ok(terminalIndex >= 0 && terminalIndex < newStart, `${id} terminal must precede fresh root`);
  }
  assert.equal(report.engine.failures.length, 1);
  assert.equal(report.engine.failures[0].result.exit_code, 2);
  assert.deepEqual(report.engine.writes.map(w => w.threadId), ['old-child', 'root-2']);
  assert.equal(report.engine.thread_family.root_thread_id, 'root-2');
  assert.equal(report.engine.thread_family.generation, 1);
  assert.equal(report.engine.thread_family.registrations.length, 3);
  assert.deepEqual(report.threads.map(r => r.id), ['root-1', 'old-child', 'root-2']);
  assert.deepEqual(report.candidate_tool_errors, []);
});
