#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {
  chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const hostPath = join(here, 'model-route-host.mjs');
const hex = value => createHash('sha256').update(value).digest('hex');
const mode = file => statSync(file).mode & 0o777;

function route(overrides = {}) {
  return {
    disposition: 'READY',
    harness: 'codex-native',
    role: 'anchor',
    requested_role: 'anchor',
    requested_model: 'anchor-model',
    critical: false,
    policy_sha: hex('policy'),
    routing_config_sha: hex('routing-config'),
    capability_evidence_sha: hex('capability-evidence'),
    ...overrides,
  };
}

function evidence(envelope, overrides = {}) {
  return {
    ...envelope,
    adopted_model: envelope.requested_model,
    status: 'completed',
    same_invocation_success: true,
    rerouted: false,
    fallback: false,
    evidence_ref: `test://${envelope.invocation_id}`,
    ...overrides,
  };
}

function fixture(api, stateRoot, name, routeOverrides = {}) {
  const root_session_id = `root-${name}`;
  const release_digest = api.computeReleaseDigest({
    policy_sha: hex('policy'),
    adapter_contract_sha: hex('adapter-v1'),
    interface_version: 'model-route-host/v1',
  });
  const activation = api.startActivation({
    harness: 'codex',
    root_session_id,
    root_anchor: {model: 'anchor-model', source: 'root-session'},
    release_digest,
    state_root: stateRoot,
  });
  return {root_session_id, release_digest, activation, route: route(routeOverrides)};
}

function prepare(api, stateRoot, fx, overrides = {}) {
  return api.prepareInvocation({
    harness: 'codex',
    root_session_id: fx.root_session_id,
    release_digest: fx.release_digest,
    route: fx.route,
    task_id: `task-${randomUUID()}`,
    input_sha: hex(`input-${randomUUID()}`),
    state_root: stateRoot,
    ...overrides,
  });
}

async function behaviorSuite(api) {
  const stateRoot = mkdtempSync(join(tmpdir(), 'model-route-host-test.'));
  let checks = 0;
  const eq = (actual, expected, message) => {
    checks += 1;
    assert.deepEqual(actual, expected, message);
  };
  try {
    const releaseA = api.computeReleaseDigest({
      policy_sha: hex('policy'), adapter_contract_sha: hex('adapter-v1'), interface_version: 'v1',
    });
    const releaseB = api.computeReleaseDigest({
      policy_sha: hex('policy'), adapter_contract_sha: hex('adapter-v2'), interface_version: 'v1',
    });
    eq(releaseA.length, 64, 'release digest is sha256');
    eq(releaseA === releaseB, false, 'adapter contract participates in release digest');

    const basic = fixture(api, stateRoot, 'basic');
    const stateFile = api.stateFileForTest({
      harness: 'codex', root_session_id: basic.root_session_id, state_root: stateRoot,
    });
    eq(mode(stateFile), 0o600, 'state file is private');
    eq(mode(dirname(stateFile)), 0o700, 'harness state directory is private');
    eq(api.readActivation({harness: 'codex', root_session_id: basic.root_session_id, state_root: stateRoot})
      .activation_id, basic.activation.activation_id, 'activation can be read back');

    const releaseMismatch = prepare(api, stateRoot, basic, {release_digest: hex('wrong-release')});
    eq(releaseMismatch.reason, 'RELEASE_MISMATCH', 'policy digest cannot impersonate the combined release');
    const wrongHarness = prepare(api, stateRoot, basic, {route: route({harness: 'claude-native'})});
    eq(wrongHarness.reason, 'INVALID_INVOCATION_INPUT', 'route harness must belong to activation harness');

    const good = prepare(api, stateRoot, basic);
    eq(good.disposition, 'READY', 'current invocation is prepared');
    const accepted = api.acceptInvocationEvidence({
      harness: 'codex', root_session_id: basic.root_session_id,
      evidence: evidence(good.envelope), state_root: stateRoot,
    });
    eq(accepted.reason, 'CURRENT_INVOCATION_VERIFIED', 'same-call adopted model evidence is accepted');
    const replay = api.acceptInvocationEvidence({
      harness: 'codex', root_session_id: basic.root_session_id,
      evidence: evidence(good.envelope), state_root: stateRoot,
    });
    eq(replay.reason, 'INVOCATION_ALREADY_CONSUMED', 'accepted evidence cannot be replayed');

    const identities = fixture(api, stateRoot, 'identities');
    const identityBase = {harness: 'codex', root_session_id: identities.root_session_id, state_root: stateRoot};
    const bind = (call, field, value) => api.bindInvocationExternalIdentity({
      ...identityBase, invocation_id: call.envelope.invocation_id, field, value,
    });
    const firstIdentity = prepare(api, stateRoot, identities);
    eq(bind(firstIdentity, 'tool_use_id', 'tool-one').disposition, 'BOUND', 'first tool identity binds');
    eq(bind(firstIdentity, 'agent_type', 'explorer').disposition, 'BOUND', 'first type binds');
    eq(bind(firstIdentity, 'agent_id', 'agent-one').disposition, 'BOUND', 'first agent identity binds');
    const secondIdentity = prepare(api, stateRoot, identities);
    eq(bind(secondIdentity, 'tool_use_id', 'tool-two').disposition, 'BOUND', 'distinct tool identity binds');
    eq(bind(secondIdentity, 'agent_type', 'explorer').disposition, 'BOUND', 'agent types are repeatable metadata');
    eq(bind(secondIdentity, 'agent_id', 'agent-two').disposition, 'BOUND', 'distinct same-type agent binds');
    const duplicateTool = prepare(api, stateRoot, identities);
    eq(bind(duplicateTool, 'tool_use_id', 'tool-one').reason, 'EXTERNAL_IDENTITY_DUPLICATE', 'duplicate tool ID is refused');
    eq(api.readActivation(identityBase).invocations[duplicateTool.envelope.invocation_id].status,
      'refused', 'failed identity binding does not leave a pending ticket');
    const duplicateAgent = prepare(api, stateRoot, identities);
    eq(bind(duplicateAgent, 'agent_id', 'agent-one').reason, 'EXTERNAL_IDENTITY_DUPLICATE', 'duplicate agent ID is refused');
    eq(bind(secondIdentity, 'agent_type', 'worker').reason, 'EXTERNAL_IDENTITY_REBIND', 'bound type cannot change');
    eq(api.readActivation(identityBase).invocations[secondIdentity.envelope.invocation_id].status,
      'refused', 'rebind failure terminates the conflicting ticket');
    eq(api.readActivation(identityBase).invocations[firstIdentity.envelope.invocation_id].status,
      'pending', 'identity conflict does not damage the original ticket');

    const recovery = fixture(api, stateRoot, 'incomplete-recovery');
    const recoveryBase = {harness: 'codex', root_session_id: recovery.root_session_id, state_root: stateRoot};
    const incomplete = prepare(api, stateRoot, recovery);
    api.bindInvocationExternalIdentity({...recoveryBase, invocation_id: incomplete.envelope.invocation_id,
      field: 'tool_use_id', value: 'tool-denied'});
    const recoverArgs = () => {
      const snapshot = api.readActivation(recoveryBase);
      return {...recoveryBase, invocation_id: incomplete.envelope.invocation_id,
        expected_activation_id: snapshot.activation_id,
        expected_call_sha: hex(JSON.stringify(snapshot.invocations[incomplete.envelope.invocation_id])),
        evidence_ref: 'test://captured-pretool-denial'};
    };
    eq(api.invalidateIncompleteNativeInvocation({...recoverArgs(), expected_call_sha: hex('stale')}).reason,
      'RECOVERY_STATE_CHANGED', 'recovery refuses stale evidence');
    eq(api.invalidateIncompleteNativeInvocation({...recoverArgs(), expected_activation_id: 'old-activation'}).reason,
      'RECOVERY_STATE_CHANGED', 'recovery refuses a superseded activation');
    eq(api.invalidateIncompleteNativeInvocation({...recoverArgs(), evidence_ref: ''}).reason,
      'INVALID_RECOVERY_EVIDENCE', 'recovery requires an audit reference');
    eq(api.invalidateIncompleteNativeInvocation(recoverArgs()).disposition,
      'INVALIDATED', 'exact incomplete pre-dispatch ticket is recoverable');
    eq(api.readActivation(recoveryBase).invocations[incomplete.envelope.invocation_id].status,
      'invalidated', 'recovery retains the failed invocation for audit');
    eq(api.invalidateIncompleteNativeInvocation(recoverArgs()).reason,
      'INVOCATION_NOT_RECOVERABLE', 'recovery cannot consume a terminal ticket again');
    const started = prepare(api, stateRoot, recovery);
    for (const [field, value] of [['tool_use_id', 'tool-started'], ['agent_type', 'explorer']]) {
      api.bindInvocationExternalIdentity({...recoveryBase, invocation_id: started.envelope.invocation_id, field, value});
    }
    const startedState = api.readActivation(recoveryBase);
    eq(api.invalidateIncompleteNativeInvocation({...recoverArgs(), invocation_id: started.envelope.invocation_id,
      expected_call_sha: hex(JSON.stringify(startedState.invocations[started.envelope.invocation_id]))}).reason,
      'INVOCATION_NOT_RECOVERABLE', 'recovery cannot invalidate a fully prepared dispatch awaiting agent ID');

    const criticalIdentity = fixture(api, stateRoot, 'critical-identity', {critical: true});
    const criticalIdentityBase = {harness: 'codex', root_session_id: criticalIdentity.root_session_id, state_root: stateRoot};
    const criticalIdentityCall = prepare(api, stateRoot, criticalIdentity);
    api.bindInvocationExternalIdentity({...criticalIdentityBase, invocation_id: criticalIdentityCall.envelope.invocation_id,
      field: 'tool_use_id', value: 'critical-tool'});
    const criticalSnapshot = api.readActivation(criticalIdentityBase);
    const criticalRecovery = {...criticalIdentityBase, invocation_id: criticalIdentityCall.envelope.invocation_id,
      expected_activation_id: criticalSnapshot.activation_id,
      expected_call_sha: hex(JSON.stringify(criticalSnapshot.invocations[criticalIdentityCall.envelope.invocation_id])),
      evidence_ref: 'test://critical-cannot-recover'};
    eq(api.invalidateIncompleteNativeInvocation(criticalRecovery).reason,
      'INVOCATION_NOT_RECOVERABLE', 'critical tickets cannot use incomplete recovery');
    const conflictingCritical = prepare(api, stateRoot, criticalIdentity, {route: {...criticalIdentity.route, harness: 'codex-cli'}});
    eq(api.bindInvocationExternalIdentity({...criticalIdentityBase, invocation_id: conflictingCritical.envelope.invocation_id,
      field: 'tool_use_id', value: 'critical-tool'}).critical_failure_latched,
    true, 'critical identity collision latches failure');
    eq(api.invalidateIncompleteNativeInvocation(criticalRecovery).reason,
      'ACTIVATION_NOT_RECOVERABLE', 'recovery never clears a critical failure latch');
    eq(prepare(api, stateRoot, criticalIdentity).reason,
      'CRITICAL_FAILURE_LATCHED', 'critical collision blocks later dispatch');

    const critical = fixture(api, stateRoot, 'critical', {role: 'peak', requested_role: 'peak',
      requested_model: 'peak-model', critical: true});
    const criticalCall = prepare(api, stateRoot, critical);
    const wrongModel = api.acceptInvocationEvidence({
      harness: 'codex', root_session_id: critical.root_session_id,
      evidence: evidence(criticalCall.envelope, {adopted_model: 'anchor-model'}), state_root: stateRoot,
    });
    eq(wrongModel.critical_failure_latched, true, 'critical wrong-model evidence latches failure');
    eq(prepare(api, stateRoot, critical).reason, 'CRITICAL_FAILURE_LATCHED', 'latch blocks later calls');

    const noncritical = fixture(api, stateRoot, 'noncritical');
    const noncriticalCall = prepare(api, stateRoot, noncritical);
    const noncriticalWrong = api.acceptInvocationEvidence({
      harness: 'codex', root_session_id: noncritical.root_session_id,
      evidence: evidence(noncriticalCall.envelope, {adopted_model: 'other-model'}), state_root: stateRoot,
    });
    eq(noncriticalWrong.critical_failure_latched, false, 'noncritical mismatch does not latch critical failure');
    eq(prepare(api, stateRoot, noncritical).disposition, 'READY', 'noncritical mismatch does not block later calls');

    eq(typeof api.latchCriticalFailure, 'function', 'trusted host exposes preparation-failure latch API');
    const preDispatch = fixture(api, stateRoot, 'pre-dispatch-failure');
    const preDispatchBase = {harness: 'codex', root_session_id: preDispatch.root_session_id, state_root: stateRoot};
    const failureArgs = {
      ...preDispatchBase, expected_activation_id: preDispatch.activation.activation_id,
      expected_root_generation: preDispatch.activation.root_generation, critical: true,
      reason: 'UNKNOWN_MODEL_RELATION', evidence_ref: 'test://critical-preparation-failure',
    };
    eq(api.latchCriticalFailure({...failureArgs, critical: false}).reason, 'NONCRITICAL_FAILURE',
      'noncritical preparation failure cannot latch activation');
    eq(api.readActivation(preDispatchBase).critical_failure, false, 'noncritical preparation leaves activation usable');
    eq(api.latchCriticalFailure({...failureArgs, expected_activation_id: 'superseded'}).reason,
      'ACTIVATION_STATE_CHANGED', 'preparation latch refuses superseded activation');
    eq(api.latchCriticalFailure({...failureArgs, expected_root_generation: 9}).reason,
      'ACTIVATION_STATE_CHANGED', 'preparation latch refuses stale generation');
    eq(api.readActivation(preDispatchBase).critical_failure, false, 'stale preparation failure cannot damage current activation');
    const pendingAtFailure = prepare(api, stateRoot, preDispatch);
    eq(api.latchCriticalFailure(failureArgs).disposition, 'LATCHED', 'critical preparation failure is persisted without envelope');
    const failedState = api.readActivation(preDispatchBase);
    eq(failedState.critical_failure, true, 'preparation failure latch survives a fresh state read');
    eq(failedState.invocations[pendingAtFailure.envelope.invocation_id].status, 'invalidated',
      'critical preparation latch terminates pending invocation evidence');
    eq(prepare(api, stateRoot, preDispatch).reason, 'CRITICAL_FAILURE_LATCHED',
      'persisted preparation failure blocks native dispatch');
    eq(api.latchCriticalFailure({...failureArgs, reason: 'different-reason'}).disposition,
      'UNCHANGED', 'critical preparation latch is monotonic');
    eq(api.readActivation(preDispatchBase).critical_failure_evidence.reason, 'UNKNOWN_MODEL_RELATION',
      'first preparation failure evidence remains intact');

    const replacementAtFailure = api.startActivation({...preDispatchBase,
      root_anchor: {model: 'anchor-model', source: 'root-session'}, release_digest: preDispatch.release_digest});
    eq(api.latchCriticalFailure(failureArgs).reason, 'ACTIVATION_STATE_CHANGED',
      'old preparation failure cannot latch restarted activation at same generation');
    eq(api.readActivation(preDispatchBase).activation_id, replacementAtFailure.activation_id, 'replacement activation is retained');
    eq(api.readActivation(preDispatchBase).critical_failure, false, 'replacement activation remains usable');

    const absentBase = {...preDispatchBase, root_session_id: 'absent-preparation-failure', state_root: join(stateRoot, 'absent-root')};
    const absentFile = api.stateFileForTest(absentBase);
    eq(api.latchCriticalFailure({...failureArgs, ...absentBase}).reason, 'INVALID_ACTIVATION',
      'preparation failure requires an existing activation');
    eq(existsSync(absentFile), false, 'preparation failure never creates missing activation state');
    eq(existsSync(dirname(absentFile)), false, 'preparation failure never creates missing state directory');

    eq(typeof api.beginCriticalPreparation, 'function', 'trusted host exposes durable preparation intent');
    const intentFx = fixture(api, stateRoot, 'durable-intent', {role: 'peak', requested_role: 'peak', requested_model: 'peak-model', critical: true});
    const intentBase = {harness: 'codex', root_session_id: intentFx.root_session_id, state_root: stateRoot};
    const intentArgs = {...intentBase, expected_activation_id: intentFx.activation.activation_id,
      expected_root_generation: intentFx.activation.root_generation, critical: true, task_id: 'intent-task', evidence_ref: 'test://intent'};
    eq(api.beginCriticalPreparation({...intentArgs, critical: false}).reason, 'NONCRITICAL_PREPARATION', 'noncritical work does not reserve');
    eq(Object.values(api.readActivation(intentBase).preparations || {}).length, 0, 'noncritical work creates no preparation ticket');
    eq(api.beginCriticalPreparation({...intentArgs, expected_activation_id: 'old'}).reason, 'ACTIVATION_STATE_CHANGED', 'intent refuses superseded activation');
    eq(api.beginCriticalPreparation({...intentArgs, expected_root_generation: 9}).reason, 'ACTIVATION_STATE_CHANGED', 'intent refuses stale generation');
    eq(api.beginCriticalPreparation({...intentArgs, ...absentBase}).reason, 'INVALID_ACTIVATION', 'intent never creates missing activation');
    eq(existsSync(dirname(absentFile)), false, 'intent never creates missing state directory');
    const reserved = api.beginCriticalPreparation(intentArgs);
    eq(reserved.disposition, 'READY', 'critical intent is durably reserved');
    eq(api.readActivation(intentBase).preparations[reserved.preparation_id].status, 'pending', 'reserved intent survives state reread');
    eq(api.beginCriticalPreparation(intentArgs).reason, 'UNRESOLVED_CRITICAL_PREPARATION', 'another preparation cannot bypass unresolved intent');
    eq(prepare(api, stateRoot, intentFx).reason, 'UNRESOLVED_CRITICAL_PREPARATION', 'native dispatch cannot bypass unresolved intent');
    eq(prepare(api, stateRoot, intentFx, {preparation_id: reserved.preparation_id, task_id: 'different'}).reason,
      'PREPARATION_BINDING_MISMATCH', 'intent is bound to its task');
    const consumed = prepare(api, stateRoot, intentFx, {preparation_id: reserved.preparation_id, task_id: 'intent-task'});
    eq(consumed.disposition, 'READY', 'matching critical dispatch consumes intent');
    eq(api.readActivation(intentBase).preparations[reserved.preparation_id].status, 'consumed', 'intent consumption is persisted');
    eq(api.readActivation(intentBase).preparations[reserved.preparation_id].invocation_id, consumed.envelope.invocation_id,
      'consumed intent identifies the atomically created invocation');
    eq(api.acceptInvocationEvidence({...intentBase, evidence: evidence(consumed.envelope)}).disposition,
      'ACCEPT', 'native invocation closes before replay is tested');
    eq(prepare(api, stateRoot, intentFx, {preparation_id: reserved.preparation_id, task_id: 'intent-task'}).reason,
      'PREPARATION_ALREADY_CONSUMED', 'preparation intent cannot be replayed');
    const failedIntent = api.beginCriticalPreparation({...intentArgs, task_id: 'failed-intent'});
    api.latchCriticalFailure({...intentArgs, reason: 'UNKNOWN_MODEL_RELATION', evidence_ref: 'test://intent-failure'});
    eq(api.readActivation(intentBase).preparations[failedIntent.preparation_id].status, 'invalidated', 'failure latch terminates pending intent');
    eq(api.beginCriticalPreparation(intentArgs).reason, 'CRITICAL_FAILURE_LATCHED', 'failure latch blocks later preparation');

    const intentGeneration = fixture(api, stateRoot, 'intent-generation');
    const generationIntentBase = {harness: 'codex', root_session_id: intentGeneration.root_session_id, state_root: stateRoot};
    const generationIntent = api.beginCriticalPreparation({...generationIntentBase,
      expected_activation_id: intentGeneration.activation.activation_id, expected_root_generation: 0,
      critical: true, task_id: 'generation-intent', evidence_ref: 'test://generation-intent'});
    api.updateRootAnchor({...generationIntentBase, root_anchor: {model: 'new-anchor', source: 'root-change'}});
    eq(api.readActivation(generationIntentBase).preparations[generationIntent.preparation_id].status, 'invalidated',
      'root generation change invalidates preparation intent');
    eq(api.readActivation(generationIntentBase).critical_failure, true,
      'root generation change preserves unresolved critical preparation as failure');
    eq(api.readActivation(generationIntentBase).critical_failure_evidence?.reason,
      'ROOT_ANCHOR_CHANGED_WITH_UNRESOLVED_CRITICAL_WORK', 'root change records the unresolved preparation obligation');
    eq(prepare(api, stateRoot, intentGeneration).reason, 'CRITICAL_FAILURE_LATCHED',
      'root change cannot reopen dispatch after unresolved critical preparation');

    for (const routeHarness of ['codex-native', 'codex-cli']) {
      const rootCritical = fixture(api, stateRoot, `root-change-${routeHarness}`, {harness: routeHarness,
        role: 'peak', requested_role: 'peak', requested_model: 'peak-model', critical: true});
      const rootCriticalBase = {harness: 'codex', root_session_id: rootCritical.root_session_id, state_root: stateRoot};
      const beforeRootChange = prepare(api, stateRoot, rootCritical);
      eq(api.updateRootAnchor({...rootCriticalBase, root_anchor: {model: 'changed-anchor', source: 'compact-root'}}).root_generation,
        1, `${routeHarness} root change still advances generation`);
      const afterRootChange = api.readActivation(rootCriticalBase);
      eq(afterRootChange.root_anchor.model, 'changed-anchor', `${routeHarness} root anchor still changes normally`);
      eq(afterRootChange.invocations[beforeRootChange.envelope.invocation_id].status, 'invalidated',
        `${routeHarness} old invocation is invalidated without adopted-model success`);
      eq(afterRootChange.critical_failure, true, `${routeHarness} unresolved critical invocation survives generation change as failure`);
      eq(prepare(api, stateRoot, rootCritical).reason, 'CRITICAL_FAILURE_LATCHED', `${routeHarness} same activation remains blocked`);
      api.startActivation({...rootCriticalBase, root_anchor: {model: 'changed-anchor', source: 'new-root'},
        release_digest: rootCritical.release_digest});
      eq(prepare(api, stateRoot, rootCritical).disposition, 'READY', `${routeHarness} new activation can restore dispatch`);
    }

    const preservedFailure = fixture(api, stateRoot, 'root-change-preserves-first-failure');
    const preservedBase = {harness: 'codex', root_session_id: preservedFailure.root_session_id, state_root: stateRoot};
    api.latchCriticalFailure({...preservedBase, expected_activation_id: preservedFailure.activation.activation_id,
      expected_root_generation: 0, critical: true, reason: 'ORIGINAL_FAILURE', evidence_ref: 'test://original-failure'});
    api.updateRootAnchor({...preservedBase, root_anchor: {model: 'changed-anchor', source: 'compact-root'}});
    eq(api.readActivation(preservedBase).critical_failure_evidence.reason, 'ORIGINAL_FAILURE',
      'generation change preserves first existing failure evidence');

    const malformedIntent = fixture(api, stateRoot, 'malformed-preparations');
    const malformedBase = {harness: 'codex', root_session_id: malformedIntent.root_session_id, state_root: stateRoot};
    const malformedFile = api.stateFileForTest(malformedBase);
    const malformedState = api.readActivation(malformedBase);
    malformedState.preparations = [];
    writeFileSync(malformedFile, JSON.stringify(malformedState));
    assert.throws(() => api.readActivation(malformedBase), /MODEL_ROUTE_INVALID_ACTIVATION/);
    checks += 1;
    eq(api.beginCriticalPreparation({...malformedBase, expected_activation_id: malformedIntent.activation.activation_id,
      expected_root_generation: 0, critical: true, task_id: 'malformed', evidence_ref: 'test://malformed'}).reason,
      'INVALID_ACTIVATION', 'malformed preparations cannot reserve intent');

    const races = ['critical-begin', 'critical-build', 'ordinary-build'].map(kind => {
      const fx = fixture(api, stateRoot, `native-admission-${kind}`, {role: 'peak', requested_role: 'peak',
        requested_model: 'peak-model', critical: true});
      const base = {harness: 'codex', root_session_id: fx.root_session_id, state_root: stateRoot};
      const stale = api.readActivation(base);
      const beginArgs = {...base, expected_activation_id: stale.activation_id, expected_root_generation: stale.root_generation,
        critical: true, evidence_ref: 'test://native-admission', route_harness: 'codex-native'};
      const aIntent = api.beginCriticalPreparation({...beginArgs, task_id: 'admitted-A'});
      const a = prepare(api, stateRoot, fx, {preparation_id: aIntent.preparation_id, task_id: 'admitted-A'});
      for (const [field, value] of [['tool_use_id', 'native-admitted-A'], ['agent_type', 'quality-gate']]) {
        api.bindInvocationExternalIdentity({...base, invocation_id: a.envelope.invocation_id, field, value});
      }
      let bIntent = null, result;
      if (kind === 'critical-begin') {
        result = api.beginCriticalPreparation({...beginArgs, task_id: 'stale-B'});
      } else if (kind === 'critical-build') {
        // Legacy reservations still exist; final native admission must not consume
        // this ticket while an earlier critical invocation remains pending.
        bIntent = api.beginCriticalPreparation({...beginArgs, route_harness: undefined, task_id: 'stale-B'});
        result = prepare(api, stateRoot, fx, {preparation_id: bIntent.preparation_id, task_id: 'stale-B'});
      } else {
        result = prepare(api, stateRoot, fx, {route: route({harness: 'codex-native'}), task_id: 'stale-B'});
      }
      return {kind, fx, base, stale, beginArgs, a, bIntent, result};
    });
    eq(races.map(race => race.result.reason), Array(3).fill('UNRESOLVED_CRITICAL_INVOCATION'),
      'locked native reservation/build reject stale snapshots after A is admitted');
    for (const race of races) {
      const current = api.readActivation(race.base);
      eq([current.activation_id, current.root_generation], [race.stale.activation_id, race.stale.root_generation],
        `${race.kind} rejection does not rely on generation change`);
      eq(Object.values(current.invocations).length, 1, `${race.kind} refusal creates no B invocation`);
      eq(Object.values(current.preparations).length, race.bIntent ? 2 : 1, `${race.kind} refusal creates no extra intent`);
      if (race.bIntent) eq(current.preparations[race.bIntent.preparation_id].status, 'pending', 'native build refusal does not consume B intent');
      eq(current.critical_failure, false, `${race.kind} admission refusal does not invent a critical failure`);
      api.acceptInvocationEvidence({...race.base, evidence: evidence(race.a.envelope)});
      if (race.kind === 'critical-begin') {
        const resumed = api.beginCriticalPreparation({...race.beginArgs, task_id: 'resumed-B'});
        eq(resumed.disposition, 'READY', 'native critical reservation resumes after accepted A evidence');
      } else {
        const resumed = prepare(api, stateRoot, race.fx, {task_id: 'stale-B',
          ...(race.bIntent ? {preparation_id: race.bIntent.preparation_id} : {route: route({harness: 'codex-native'})})});
        eq(resumed.disposition, 'READY', `${race.kind} native build resumes after accepted A evidence`);
      }
    }

    const cliParallel = fixture(api, stateRoot, 'cli-parallel-admission', {harness: 'codex-cli', role: 'peak',
      requested_role: 'peak', requested_model: 'peak-model', critical: true});
    const cliBase = {harness: 'codex', root_session_id: cliParallel.root_session_id, state_root: stateRoot};
    const cliCalls = [1, 2, 3].map(index => {
      const snapshot = api.readActivation(cliBase);
      const taskId = `cli-parallel-${index}`;
      const intent = api.beginCriticalPreparation({...cliBase, expected_activation_id: snapshot.activation_id,
        expected_root_generation: snapshot.root_generation, critical: true, task_id: taskId,
        evidence_ref: 'test://cli-parallel', route_harness: 'codex-cli'});
      return prepare(api, stateRoot, cliParallel, {task_id: taskId, preparation_id: intent.preparation_id});
    });
    eq(cliCalls.map(call => call.disposition), ['READY', 'READY', 'READY'], 'admitted CLI runner retains internal critical parallelism');

    const harnessBinding = fixture(api, stateRoot, 'preparation-harness-binding', {harness: 'codex-cli', role: 'peak',
      requested_role: 'peak', requested_model: 'peak-model', critical: true});
    const harnessBase = {harness: 'codex', root_session_id: harnessBinding.root_session_id, state_root: stateRoot};
    const harnessArgs = {...harnessBase, expected_activation_id: harnessBinding.activation.activation_id,
      expected_root_generation: 0, critical: true, task_id: 'harness-bound', evidence_ref: 'test://harness-bound', route_harness: 'codex-cli'};
    eq(api.beginCriticalPreparation({...harnessArgs, route_harness: 'codex-unknown'}).reason,
      'INVALID_PREPARATION_INPUT', 'unknown route harness cannot select an admission rule');
    const harnessIntent = api.beginCriticalPreparation(harnessArgs);
    const wrongHarnessBuild = prepare(api, stateRoot, harnessBinding, {preparation_id: harnessIntent.preparation_id,
      task_id: 'harness-bound', route: {...harnessBinding.route, harness: 'codex-native'}});
    eq(wrongHarnessBuild.reason, 'PREPARATION_BINDING_MISMATCH', 'explicit preparation harness binds final route harness');
    eq(api.readActivation(harnessBase).preparations[harnessIntent.preparation_id].status, 'pending', 'harness mismatch does not consume intent');
    eq(prepare(api, stateRoot, harnessBinding, {preparation_id: harnessIntent.preparation_id, task_id: 'harness-bound'}).disposition,
      'READY', 'matching harness consumes explicit preparation normally');

    const ordinaryParallel = fixture(api, stateRoot, 'native-ordinary-parallel');
    eq([prepare(api, stateRoot, ordinaryParallel).disposition, prepare(api, stateRoot, ordinaryParallel).disposition],
      ['READY', 'READY'], 'native noncritical work retains ordinary parallelism');

    const forged = fixture(api, stateRoot, 'forged', {role: 'peak', requested_role: 'peak',
      requested_model: 'peak-model', critical: true});
    const forgedCall = prepare(api, stateRoot, forged);
    eq(api.acceptInvocationEvidence({
      harness: 'codex', root_session_id: forged.root_session_id,
      evidence: evidence(forgedCall.envelope, {route_id: randomUUID()}), state_root: stateRoot,
    }).reason, 'INVOCATION_EVIDENCE_MISMATCH', 'forged route binding is refused');
    eq(api.readActivation({harness: 'codex', root_session_id: forged.root_session_id, state_root: stateRoot})
      .critical_failure, true, 'forged critical binding latches failure');

    const generation = fixture(api, stateRoot, 'generation');
    const generationCall = prepare(api, stateRoot, generation);
    const staleGeneration = api.acceptInvocationEvidence({
      harness: 'codex', root_session_id: generation.root_session_id,
      evidence: evidence(generationCall.envelope, {root_generation: 99}), state_root: stateRoot,
    });
    eq(staleGeneration.reason, 'STALE_INVOCATION', 'wrong generation is stale, not accepted');
    eq(api.acceptInvocationEvidence({
      harness: 'codex', root_session_id: generation.root_session_id,
      evidence: evidence(generationCall.envelope), state_root: stateRoot,
    }).disposition, 'ACCEPT', 'a forged stale attempt does not consume the real current ticket');
    eq(api.updateRootAnchor({
      harness: 'codex', root_session_id: generation.root_session_id,
      root_anchor: {model: 'anchor-model', source: 'root-session'}, state_root: stateRoot,
    }).reason, 'ROOT_ANCHOR_UNCHANGED', 'same root anchor does not advance generation');
    const pendingBeforeChange = prepare(api, stateRoot, generation);
    eq(api.updateRootAnchor({
      harness: 'codex', root_session_id: generation.root_session_id,
      root_anchor: {model: 'new-anchor', source: 'explicit-root-switch'}, state_root: stateRoot,
    }).root_generation, 1, 'root anchor change advances generation');
    eq(api.acceptInvocationEvidence({
      harness: 'codex', root_session_id: generation.root_session_id,
      evidence: evidence(pendingBeforeChange.envelope), state_root: stateRoot,
    }).reason, 'INVOCATION_ALREADY_CONSUMED', 'generation change invalidates in-flight tickets');
    eq(api.readActivation({harness: 'codex', root_session_id: generation.root_session_id, state_root: stateRoot})
      .critical_failure, false, 'generation change with only pending noncritical work does not latch');

    const paused = fixture(api, stateRoot, 'paused');
    const pausedCall = prepare(api, stateRoot, paused);
    eq(api.pauseActivation({harness: 'codex', root_session_id: paused.root_session_id, state_root: stateRoot})
      .disposition, 'PAUSED', 'activation can be paused');
    eq(api.acceptInvocationEvidence({
      harness: 'codex', root_session_id: paused.root_session_id,
      evidence: evidence(pausedCall.envelope), state_root: stateRoot,
    }).reason, 'INVOCATION_ALREADY_CONSUMED', 'pause invalidates in-flight tickets');
    eq(prepare(api, stateRoot, paused).reason, 'ACTIVATION_PAUSED', 'pause blocks new calls');

    const noRef = fixture(api, stateRoot, 'no-ref', {role: 'peak', requested_role: 'peak',
      requested_model: 'peak-model', critical: true});
    const noRefCall = prepare(api, stateRoot, noRef);
    eq(api.acceptInvocationEvidence({
      harness: 'codex', root_session_id: noRef.root_session_id,
      evidence: evidence(noRefCall.envelope, {evidence_ref: ''}), state_root: stateRoot,
    }).reason, 'INVOCATION_EVIDENCE_MISMATCH', 'evidence without a trusted reference is refused');

    const restart = fixture(api, stateRoot, 'restart');
    const oldCall = prepare(api, stateRoot, restart);
    const replacement = api.startActivation({
      harness: 'codex', root_session_id: restart.root_session_id,
      root_anchor: {model: 'anchor-model', source: 'root-session'},
      release_digest: restart.release_digest, state_root: stateRoot,
    });
    eq(replacement.root_generation, 0, 'new activation may restart at generation zero');
    eq(replacement.activation_id === restart.activation.activation_id, false, 'restart creates a fresh activation id');
    eq(api.acceptInvocationEvidence({
      harness: 'codex', root_session_id: restart.root_session_id,
      evidence: evidence(oldCall.envelope), state_root: stateRoot,
    }).reason, 'UNKNOWN_INVOCATION', 'old activation ticket cannot authorize a restarted activation');
    const archive = join(`${api.stateFileForTest({
      harness: 'codex', root_session_id: restart.root_session_id, state_root: stateRoot,
    })}.history`, `${restart.activation.activation_id}.json`);
    eq(existsSync(archive), true, 'superseded activation is retained for audit');
    eq(mode(archive), 0o600, 'activation archive is private');

    const busy = fixture(api, stateRoot, 'busy');
    const busyFile = api.stateFileForTest({
      harness: 'codex', root_session_id: busy.root_session_id, state_root: stateRoot,
    });
    writeFileSync(`${busyFile}.lock`, 'occupied\n', {mode: 0o600});
    assert.throws(() => api.pauseActivation({
      harness: 'codex', root_session_id: busy.root_session_id, state_root: stateRoot,
    }), /MODEL_ROUTE_STATE_BUSY/);
    checks += 1;
    assert.throws(() => api.latchCriticalFailure({
      harness: 'codex', root_session_id: busy.root_session_id, state_root: stateRoot,
      expected_activation_id: busy.activation.activation_id, expected_root_generation: busy.activation.root_generation,
      critical: true, reason: 'EVIDENCE_IO_FAILED', evidence_ref: 'test://occupied-lock',
    }), /MODEL_ROUTE_STATE_BUSY/);
    checks += 1;
    eq(api.readActivation({harness: 'codex', root_session_id: busy.root_session_id, state_root: stateRoot})
      .critical_failure, false, 'failed persistence cannot claim latch was stored');
    assert.throws(() => api.beginCriticalPreparation({
      harness: 'codex', root_session_id: busy.root_session_id, state_root: stateRoot,
      expected_activation_id: busy.activation.activation_id, expected_root_generation: busy.activation.root_generation,
      critical: true, task_id: 'never-started', evidence_ref: 'test://busy-reservation',
    }), /MODEL_ROUTE_STATE_BUSY/);
    checks += 1;
    eq(Object.values(api.readActivation({harness: 'codex', root_session_id: busy.root_session_id, state_root: stateRoot})
      .preparations || {}).length, 0, 'unavailable reservation creates no intent');
    rmSync(`${busyFile}.lock`);

    return checks;
  } finally {
    rmSync(stateRoot, {recursive: true, force: true});
  }
}

async function runMutations() {
  const source = readFileSync(hostPath, 'utf8');
  const mutations = [
    ['native reservation admission guard removed', "if (route_harness === 'codex-native' && hasPendingCriticalInvocation(state))", 'if (false)'],
    ['native invocation admission guard removed', "if (route.harness === 'codex-native' && hasPendingCriticalInvocation(state))", 'if (false)'],
    ['preparation route harness binding bypassed', '(preparation.route_harness !== undefined && preparation.route_harness !== route.harness)', 'false'],
    ['root change clears unresolved critical obligation', 'if (unresolvedCritical) {', 'if (false) {'],
    ['root change incorrectly latches noncritical work', "|| Object.values(state.invocations).some(call => record(call) && call.status === 'pending' && call.critical === true);",
      "|| Object.values(state.invocations).some(call => record(call) && call.status === 'pending');"],
    ['root change ignores critical invocations', "|| Object.values(state.invocations).some(call => record(call) && call.status === 'pending' && call.critical === true);", '|| false;'],
    ['unresolved intent permits dispatch', "&& ticket.status === 'pending' && ticket !== preparation", "&& false"],
    ['intent task binding bypassed', '|| preparation.task_id !== task_id', '|| false'],
    ['consumed intent remains replayable', "preparation.status = 'consumed';", "preparation.status = 'pending';"],
    ['preparation failure accepts stale activation', 'state.activation_id !== expected_activation_id || state.root_generation !== expected_root_generation',
      'false || state.root_generation !== expected_root_generation'],
    ['preparation failure accepts stale generation', 'state.activation_id !== expected_activation_id || state.root_generation !== expected_root_generation',
      'state.activation_id !== expected_activation_id || false'],
    ['preparation latch removed', 'state.critical_failure = true;\n    state.critical_failure_evidence',
      'state.critical_failure = false;\n    state.critical_failure_evidence'],
    ['preparation failure leaves pending tickets', "invalidatePending(state, 'CRITICAL_FAILURE_LATCHED');", '/* mutation */'],
    ['preparation failure creates missing directory', "if (!validState(readJson(file))) return outcome('NEEDS_CONTEXT', 'INVALID_ACTIVATION');",
      '/* mutation */'],
    ['agent type incorrectly unique', "field !== 'agent_type' &&", 'true &&'],
    ['duplicate identity accepted', 'if (duplicate) {', 'if (false) {'],
    ['identity failure leaves pending ticket', "call.status = 'refused';\n      call.failure_reason = 'EXTERNAL_IDENTITY_DUPLICATE';",
      "call.failure_reason = 'EXTERNAL_IDENTITY_DUPLICATE';"],
    ['release mismatch accepted', "if (release_digest !== state.release_digest)", 'if (false)'],
    ['critical latch removed', 'if (!accepted && call.critical) state.critical_failure = true;',
      'if (false) state.critical_failure = true;'],
    ['wrong adopted model accepted', '&& evidence.adopted_model === call.requested_model', '&& true'],
    ['forged route id accepted', '&& evidence.route_id === call.route_id', '&& true'],
    ['stale generation accepted', '&& evidence.root_generation === state.root_generation', '&& true'],
    ['replay accepted', "if (call.status !== 'pending')", 'if (false)'],
    ['pause leaves calls live', "invalidatePending(state, 'ACTIVATION_PAUSED');", '/* mutation */'],
    ['root switch leaves calls live', "invalidatePending(state, 'ROOT_GENERATION_CHANGED');", '/* mutation */'],
    ['missing evidence ref accepted', '&& text(evidence.evidence_ref);', '&& true;'],
    ['cross-harness route accepted', "|| !text(route.requested_role) || !text(route.harness) || !route.harness.startsWith(`${harness}-`)",
      '|| !text(route.requested_role) || !text(route.harness)'],
  ];
  const mutationRoot = mkdtempSync(join(tmpdir(), 'model-route-host-mutations.'));
  let killed = 0;
  try {
    for (const [name, from, to] of mutations) {
      assert.ok(source.includes(from), `mutation target missing: ${name}`);
      const mutatedPath = join(mutationRoot, `${String(killed).padStart(2, '0')}.mjs`);
      writeFileSync(mutatedPath, source.replace(from, to), {mode: 0o600});
      const api = await import(`${pathToFileURL(mutatedPath).href}?case=${randomUUID()}`);
      let failed = false;
      try { await behaviorSuite(api); }
      catch { failed = true; }
      assert.equal(failed, true, `mutation survived: ${name}`);
      killed += 1;
    }
  } finally {
    rmSync(mutationRoot, {recursive: true, force: true});
  }
  process.stdout.write(`PASS: ${killed}/${mutations.length} host mutations killed\n`);
}

const mutationMode = process.argv.slice(2).includes('--mutation');
if (mutationMode) {
  await runMutations();
} else {
  const api = await import(pathToFileURL(hostPath).href);
  const checks = await behaviorSuite(api);
  process.stdout.write(`PASS: ${checks} trusted model-route host checks\n`);
}
