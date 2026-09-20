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
    rmSync(`${busyFile}.lock`);

    return checks;
  } finally {
    rmSync(stateRoot, {recursive: true, force: true});
  }
}

async function runMutations() {
  const source = readFileSync(hostPath, 'utf8');
  const mutations = [
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
