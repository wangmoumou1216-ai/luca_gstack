import test from 'node:test';
import { allocateFixtureRoot } from './exact-fixture-slots.mjs';
import os from 'node:os';
import { syncBuiltinESMExports } from 'node:module';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, appendFileSync, realpathSync, readdirSync, cpSync, renameSync, rmSync, symlinkSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fork, execFile, execFileSync, spawnSync } from 'node:child_process';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createHostLaunchBroker, fileIdentity, codexConfigIdentity } from '../.claude/hooks/lib/host-launch.mjs';
import { queueProjectEventCandidate, readProjectState, canonicalProjectIdentity, prepareProjectSwitch,
  closeAttestedProjectEvent, refenceProjectStateForDeactivate } from '../.claude/hooks/lib/project-substrate.mjs';
import { captureNativeEventFence, hostLaunchJournalRoot, readHostLaunchSourceScope, resolveCodexHome } from '../.claude/hooks/lib/event-attestation.mjs';
import { executeProjectTransaction } from './project-pin.mjs';
import * as projectPinApi from './project-pin.mjs';
import { parseExpandedSelectionCommand } from '../.claude/hooks/lib/project-selection.mjs';
import { projectStatusHostView } from '../.claude/hooks/lib/project-host-view.mjs';
import { canonicalJson, gitCommonDirRealpath, pathTuple, manifestSha256, witnessAnchor,
  sha256Bytes, setNativeScopeState, discoverControlState } from './controlled-change.mjs';

test('nested child tools do not consume root events or receive the root receipt', async () => {
  for (const project of [false, true]) {
    const f = fixture(), claim = await attached(f, project);
    const childPayload = { ...f.payload, hook_event_name: 'PreToolUse', turn_id: randomUUID(),
      transcript_path: join(f.sourceRoot, 'sessions', '2026', '09', '27',
        `rollout-2026-09-27T00-00-01-01${randomUUID().slice(2)}.jsonl`) };
    await f.broker.claim('beforeTool', { ...claim, nativePayload: f.appendHuman() });
    const state = () => JSON.stringify(readProjectState(f.gstackRoot, f.sid).value);
    const before = state();
    assert.deepEqual(await f.broker.claim('beforeTool', { ...claim, nativePayload: childPayload }),
      { status: 'CHILD_TOOL', executionAuthority: 'NOT_PROVIDED' });
    assert.equal(state(), before);
    writeFileSync(f.config, '{"profile":"changed"}');
    await assert.rejects(f.broker.claim('beforeTool', { ...claim, nativePayload: childPayload }),
      { code: 'IDENTITY_CHANGED' });
    assert.equal(state(), before);
  }
  const f = fixture(), claim = await attached(f);
  await assert.rejects(f.broker.claim('beforeTool', { ...claim, nativePayload: {
    ...f.payload, hook_event_name: 'PreToolUse', turn_id: randomUUID(),
    transcript_path: `rollout-2026-09-27T00-00-01-01${randomUUID().slice(2)}.jsonl`,
  } }), { code: 'CHILD_LAUNCH_NOT_ACTIVE' });
});

test('historical journal above 512 preserves replay denial and existing receipts', async () => {
  const f = fixture(), claim = await attached(f);
  const journal = join(f.gstackRoot, '.claude', 'host-launch');
  const savedPath = join(journal, `${claim.launchId}.json`);
  const saved = readFileSync(savedPath);
  for (let i = 0; i < 513; i++) {
    writeFileSync(join(journal, `${randomUUID()}.json`), JSON.stringify({ request: { operationId: randomUUID() } }));
  }
  const restarted = createHostLaunchBroker({ gstackRoot: f.gstackRoot, projectsRoot: f.projectsRoot,
    revalidateProfile: async () => f.request.profileIdentity });
  assert.equal((await restarted.parent('prepare', { ...f.request, operationId: randomUUID() })).status, 'PREPARED');
  await assert.rejects(restarted.parent('prepare', f.request), { code: 'LAUNCH_RECOVERY_REQUIRED' });
  await assert.rejects(restarted.claim('attach', claim), { code: 'LAUNCH_UNKNOWN' });
  assert.deepEqual(readFileSync(savedPath), saved);
  writeFileSync(join(journal, `${randomUUID()}.json`), '{broken');
  await assert.rejects(restarted.parent('prepare', { ...f.request, operationId: randomUUID() }), SyntaxError);
});

test('native lookup streams large history but still rejects duplicate session sources', () => {
  const f = fixture(), sessions = join(f.sourceRoot, 'sessions');
  const history = join(sessions, '2025', '01', '01');
  mkdirSync(history, { recursive: true });
  for (let i = 0; i < 8193; i++) writeFileSync(join(history, `rollout-history-${i}.jsonl`), '');
  for (let year = 4000; year < 6050; year++) mkdirSync(join(sessions, String(year)));
  const capture = () => captureNativeEventFence({ sessionId: f.sid, harness: 'codex', cwd: f.gstackRoot,
    codexHome: f.sourceRoot, allowTestSourceRoot: true });
  assert.equal(capture().source_absent, false);
  const other = join(sessions, '2027', '12', '31');
  mkdirSync(other, { recursive: true });
  const duplicate = join(other, `rollout-duplicate-${f.sid}.jsonl`);
  writeFileSync(duplicate, readFileSync(f.source));
  assert.throws(capture, { code: 'SOURCE_AMBIGUOUS' });
  rmSync(duplicate);
  assert.equal(capture().source_absent, false);
});

function fixture(options = {}) {
  const root = allocateFixtureRoot('/private/tmp/host-launch-');
  const gstackRoot = join(root, 'gstack'), projectsRoot = join(root, 'projects'), sourceRoot = options.defaultCodexHome ? join(root, 'home', '.codex') : join(root, 'sidecar');
  for (const path of [join(gstackRoot, '.claude'), projectsRoot, join(sourceRoot, 'sessions', '2026', '09', '27')]) mkdirSync(path, { recursive: true });
  const config = join(root, 'settings.json'); writeFileSync(config, '{"profile":"sidecar"}');
  const binary = process.execPath;
  const sid = randomUUID();
  const source = join(sourceRoot, 'sessions', '2026', '09', '27', `rollout-2026-09-27T00-00-00-${sid}.jsonl`);
  writeFileSync(source, JSON.stringify({ type:'session_meta', payload:{ id:sid, session_id:sid, cwd:gstackRoot,
    originator:'codex-tui', thread_source:'user', parent_thread_id:null, forked_from_id:null } }) + '\n');
  const profileIdentity = { provider:'codex', profileId:'codex:sidecar', configRevision:'1', sourceId:'fixture-sidecar',
    sourceRoot:fileIdentity(sourceRoot), binary:fileIdentity(binary), configFiles:[fileIdentity(config, true)] };
  const request = { operationId:randomUUID(), openRequestId:randomUUID(), hostRunId:randomUUID(), projectIdentity:null, profileIdentity };
  const broker = createHostLaunchBroker({ gstackRoot, projectsRoot,
    revalidateProfile: async () => profileIdentity, journalRoot:join(gstackRoot,'.claude','host-launch'), ...options });
  const payload = { hook_event_name:'SessionStart', session_id:sid, source:'startup', cwd:gstackRoot, transcript_path:source };
  const appendHuman = () => {
    const turn = randomUUID();
    const prompt = 'Do the first business task.';
    appendFileSync(source, [
      { type:'response_item', payload:{type:'message',role:'user',id:`msg_${randomUUID()}`,
        content:[{type:'input_text',text:prompt}],internal_chat_message_metadata_passthrough:{turn_id:turn}}},
      { type:'event_msg',payload:{type:'item_completed',thread_id:sid,turn_id:turn,item:{type:'UserMessage',id:randomUUID(),content:[{type:'text',text:prompt}]}}},
    ].map(JSON.stringify).join('\n')+'\n');
    queueProjectEventCandidate({gstackRoot,projectsRoot,sessionId:sid,boundaryId:turn,cwd:gstackRoot,harness:'codex',prompt,intent:{kind:'turn'}});
    return {...payload,hook_event_name:'PreToolUse',turn_id:turn,tool_name:'Bash',tool_input:{command:'true'}};
  };
  return {root,gstackRoot,projectsRoot,sourceRoot,source,config,sid,request,broker,payload,appendHuman};
}
test('global new launch authenticates an exact Sidecar source but remains NO_PIN', async () => {
  const f=fixture(); const prepared=await f.broker.parent('prepare',f.request);
  await f.broker.parent('dispatch',{launchId:prepared.launchId,operationId:f.request.operationId,launchNonce:prepared.launchNonce});
  const claim={...prepared,hostRunId:f.request.hostRunId,openRequestId:f.request.openRequestId,nativePayload:f.payload};
  assert.equal((await f.broker.claim('attach',claim)).status,'ATTACHED');
  const observation=f.appendHuman();
  assert.equal((await f.broker.claim('beforeTool',{...claim,nativePayload:observation})).status,'ACTIVE_NO_PIN');
  assert.equal(readProjectState(f.gstackRoot,f.sid).value.state,'NO_PIN');
  const journal=readFileSync(join(f.gstackRoot,'.claude','host-launch',`${prepared.launchId}.json`),'utf8');
  assert.ok(!journal.includes(prepared.claimHandle));
  assert.ok(!journal.includes(prepared.launchNonce));
});

async function dispatched(f, project = false) {
  if (project) {
    mkdirSync(join(f.projectsRoot,'alpha'));
    f.request.projectIdentity=canonicalProjectIdentity('alpha',f.projectsRoot);
  }
  const p=await f.broker.parent('prepare',f.request);
  await f.broker.parent('dispatch',{launchId:p.launchId,operationId:f.request.operationId,launchNonce:p.launchNonce});
  const claim={...p,hostRunId:f.request.hostRunId,openRequestId:f.request.openRequestId,nativePayload:f.payload};
  return claim;
}
async function attached(f, project = false) {
  const claim = await dispatched(f, project);
  await f.broker.claim('attach', claim);
  return claim;
}
test('fresh private host binding coexists with native scopes and scoped damage but preserves unknown/legacy fences', async () => {
  const previous = [process.env.LUCA_EVENT_ATTESTATION_TEST, process.env.LUCA_CONTROLLED_TEST_HOME, process.env.TMPDIR];
  try {
    for (const mode of ['native', 'scoped-damage', 'unknown-damage', 'legacy', 'foreign-legacy']) {
      const f = fixture(), home = join(f.root, 'home'); mkdirSync(home);
      process.env.LUCA_EVENT_ATTESTATION_TEST = '1'; process.env.LUCA_CONTROLLED_TEST_HOME = home; process.env.TMPDIR = '/private/tmp';
      const env = { ...process.env }; for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
      execFileSync('/usr/bin/git', ['init', '-q', f.gstackRoot], { env });
      let controlledCheckout = f.gstackRoot;
      if (mode === 'foreign-legacy') {
        execFileSync('/usr/bin/git', ['-C', f.gstackRoot, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
          'commit', '--allow-empty', '-qm', 'fixture'], { env });
        controlledCheckout = join(f.root, 'foreign-worktree');
        execFileSync('/usr/bin/git', ['-C', f.gstackRoot, 'worktree', 'add', '--quiet', '--detach', controlledCheckout], { env });
        assert.equal(gitCommonDirRealpath(controlledCheckout), gitCommonDirRealpath(f.gstackRoot));
      }
      const legacy = mode.endsWith('legacy');
      const paths = [];
      for (const name of legacy ? ['a'] : ['a', 'b']) {
        const scratch = join(f.root, `scratch-${name}`); mkdirSync(scratch);
        const target = join(controlledCheckout, `scope-${name}.txt`); writeFileSync(target, 'fixture\n');
        const manifest = { schema_version: 1, task_id: `host-scope-${name}`, u_id: 'U-003',
          repo_realpath: controlledCheckout, git_common_dir_realpath: gitCommonDirRealpath(f.gstackRoot),
          plan_sha256: '1'.repeat(64), plan_recorded_baseline: '0'.repeat(40), observed_baseline: '0'.repeat(40),
          session: 'fixture-display-only', scratch_root: scratch,
          repo_paths: [{ path: `scope-${name}.txt`, mutation: 'modify', preimage: pathTuple(target), postimage: pathTuple(target) }],
          external_paths: [], mutation_classes: ['modify'], approved_effects: [], allowed_commands: [] };
        const owner = { version: 1, harness: 'codex', session_id: randomUUID(), repo_realpath: f.gstackRoot };
        const witness = { schema_version: 1, state: 'REQUIRED', task_id: manifest.task_id, u_id: manifest.u_id,
          generation: randomUUID(), plan_sha256: manifest.plan_sha256, manifest_sha256: manifestSha256(manifest),
          repo_realpath: controlledCheckout, created_at: Date.now(), expires_at: Date.now() + 3600000,
          ...(legacy ? {} : { native_owner: owner }) };
        const active = { ...witness, state: 'ACTIVE', witness_anchor_sha256: witnessAnchor(witness), manifest };
        const dir = join(gitCommonDirRealpath(f.gstackRoot), 'luca-controlled-change', manifest.task_id); mkdirSync(dir, { recursive: true });
        const activePath = join(dir, 'active-context.json'); paths.push(activePath);
        writeFileSync(activePath, `${canonicalJson(active)}\n`);
        writeFileSync(join(dir, 'required-witness.json'), `${canonicalJson({ ...witness,
          active_context_sha256: sha256Bytes(`${canonicalJson(active)}\n`), effect_authorizations: [] })}\n`);
        if (!legacy) setNativeScopeState(manifest, owner, witness.generation, 'ACTIVE');
      }
      if (mode === 'scoped-damage') writeFileSync(paths[1], '{broken');
      if (mode === 'unknown-damage') {
        const orphan = join(gitCommonDirRealpath(f.gstackRoot), 'luca-controlled-change/orphan-writer'); mkdirSync(orphan);
        writeFileSync(join(orphan, 'active-context.json'), '{}');
      }
      const state = discoverControlState(f.gstackRoot);
      assert.equal(state.kind, mode === 'unknown-damage' ? 'invalid' : 'required');
      const controlledBytes = () => paths.flatMap(path => [readFileSync(path, 'utf8'),
        readFileSync(path.replace(/active-context\.json$/, 'required-witness.json'), 'utf8')]);
      const beforeBinding = controlledBytes();
      const claim = await dispatched(f, true);
      if (['native', 'scoped-damage', 'foreign-legacy'].includes(mode)) {
        await f.broker.claim('attach', claim);
        assert.equal(readProjectState(f.gstackRoot, f.sid).value.binding.project, 'alpha');
      } else {
        await assert.rejects(f.broker.claim('attach', claim));
        assert.equal(readProjectState(f.gstackRoot, f.sid).value.binding, undefined);
      }
      assert.deepEqual(controlledBytes(), beforeBinding, 'host binding must not mutate existing controlled records');
    }
  } finally {
    for (const [i, key] of ['LUCA_EVENT_ATTESTATION_TEST', 'LUCA_CONTROLLED_TEST_HOME', 'TMPDIR'].entries()) {
      if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i];
    }
  }
});
const codexLaunchConfig = 'model = "fixture-model"\nmodel_provider = "local"\n[model_providers.local]\nbase_url = "http://127.0.0.1:64069/v1"\n';
function semanticConfigFixture() {
  const f = fixture();
  f.nativeConfig = join(f.sourceRoot, 'config.toml');
  writeFileSync(f.nativeConfig, codexLaunchConfig, { mode: 0o600 });
  f.request.profileIdentity.configFiles.unshift(codexConfigIdentity(f.nativeConfig));
  return f;
}
function replaceConfig(file, text) {
  writeFileSync(`${file}.next`, text, { mode: 0o600 });
  renameSync(`${file}.next`, file);
}
test('first-run Codex TUI atomic config writes preserve startup and tool authority', async () => {
  for (const project of [false, true]) {
    const f = semanticConfigFixture(), claim = await dispatched(f, project);
    const original = f.request.profileIdentity.configFiles[0];
    replaceConfig(f.nativeConfig, `${codexLaunchConfig}\n[tui]\nscreen_reader_detection_done = true\n[tui.model_availability_nux]\n"fixture-model" = 1\n`);
    assert.deepEqual(codexConfigIdentity(f.nativeConfig), original);
    await f.broker.claim('attach', claim);
    replaceConfig(f.nativeConfig, `${codexLaunchConfig}\n[tui]\nscreen_reader_detection_done = false\n[tui.model_availability_nux]\n"fixture-model" = 2\n`);
    const result = await f.broker.claim('beforeTool', { ...claim, nativePayload: f.appendHuman() });
    assert.equal(result.status, project ? 'COMMITTED' : 'ACTIVE_NO_PIN');
  }
});
test('Codex config semantic identity retains all launch settings and non-UI types', async () => {
  for (const changed of [
    codexLaunchConfig.replace('fixture-model', 'other-model'),
    codexLaunchConfig.replace('64069', '64070'),
    codexLaunchConfig + '\n[hooks]\nenabled = false\n',
    codexLaunchConfig + '\n[projects."/tmp"]\ntrust_level = "trusted"\n',
    codexLaunchConfig + '\n[tui]\nunknown_policy = true\n',
    codexLaunchConfig.replace('model_provider = "local"\n', ''),
  ]) {
    const f = semanticConfigFixture(), claim = await dispatched(f);
    replaceConfig(f.nativeConfig, changed);
    await assert.rejects(f.broker.claim('attach', claim), { code: 'IDENTITY_CHANGED' });
    assert.equal(readProjectState(f.gstackRoot, f.sid).raw, null);
  }
  const f = semanticConfigFixture();
  replaceConfig(f.nativeConfig, 'value = 1\n'); const integer = codexConfigIdentity(f.nativeConfig);
  replaceConfig(f.nativeConfig, 'value = 1.0\n'); assert.notEqual(codexConfigIdentity(f.nativeConfig).sha256, integer.sha256);
  for (const invalid of ['value = 1979-05-27\n', 'value = nan\n', '[tui]\nscreen_reader_detection_done = "true"\n',
    '[tui.model_availability_nux]\nmodel = true\n', 'model = "a"\nmodel = "b"\n']) {
    replaceConfig(f.nativeConfig, invalid);
    assert.throws(() => codexConfigIdentity(f.nativeConfig), { code: 'CONFIG_PARSE_FAILED' });
  }
});
test('semantic identity cannot be selected for other files, symlinks or legacy profiles', async () => {
  for (const change of [
    f => { f.request.profileIdentity.configFiles[0].kind = 'unknown-kind'; },
    f => { f.request.profileIdentity.configFiles.reverse(); },
    f => { f.request.profileIdentity.configFiles[0].realpath = f.config; },
    f => { f.request.profileIdentity.provider = 'claude'; },
  ]) {
    const f = semanticConfigFixture(); change(f);
    await assert.rejects(f.broker.parent('prepare', f.request), { code: 'PROFILE_INVALID' });
  }
  const f = semanticConfigFixture(), claim = await dispatched(f);
  const target = `${f.nativeConfig}.target`; renameSync(f.nativeConfig, target); symlinkSync(target, f.nativeConfig);
  await assert.rejects(f.broker.claim('attach', claim), { code: 'CONFIG_SCOPE_INVALID' });
  const legacy = fixture(), legacyClaim = await dispatched(legacy);
  replaceConfig(legacy.config, readFileSync(legacy.config));
  await assert.rejects(legacy.broker.claim('attach', legacyClaim), { code: 'IDENTITY_CHANGED' });
});
test('a login PATH with old Python first selects an existing TOML-capable runtime', () => {
  const f = semanticConfigFixture(), originalPath = process.env.PATH;
  const expected = codexConfigIdentity(f.nativeConfig);
  const python = execFileSync('python3', ['-c', 'import sys,tomllib;print(sys.executable)'], { encoding: 'utf8' }).trim();
  const old = join(f.root, 'old-python'), modern = join(f.root, 'modern-python');
  mkdirSync(old); mkdirSync(modern);
  writeFileSync(join(old, 'python3'), '#!/bin/sh\necho "ModuleNotFoundError: tomllib" >&2\nexit 1\n');
  chmodSync(join(old, 'python3'), 0o700); symlinkSync(python, join(modern, 'python3'));
  try {
    process.env.PATH = `${old}:${modern}`;
    assert.deepEqual(codexConfigIdentity(f.nativeConfig), expected);
    replaceConfig(f.nativeConfig, 'model = "a"\nmodel = "b"\n');
    assert.throws(() => codexConfigIdentity(f.nativeConfig), { code: 'CONFIG_PARSE_FAILED' });
    process.env.PATH = old;
    assert.throws(() => codexConfigIdentity(f.nativeConfig), { code: 'CONFIG_PARSER_UNAVAILABLE' });
  } finally { process.env.PATH = originalPath; }
});
test('project is bound at native startup without a prompt or tool and has no execution event', async () => {
  const f = fixture(), claim = await attached(f, true);
  const result = await f.broker.parent('readReceipt', { launchId: claim.launchId });
  assert.equal(result.status, 'COMMITTED');
  assert.equal(result.receipt.validation, 'VERIFIED');
  assert.equal(result.receipt.executionAuthority, 'NOT_PROVIDED');
  const view = projectStatusHostView({ gstackRoot: f.gstackRoot, projectsRoot: f.projectsRoot, sessionId: f.sid });
  assert.equal(view.read_status, 'OK', JSON.stringify(view.error));
  assert.equal(view.current_binding.project, 'alpha');
  assert.equal(view.execution_authority, 'NOT_PROVIDED');
  const state = readProjectState(f.gstackRoot, f.sid).value;
  assert.equal(state.event_control.current, null);
  assert.deepEqual(state.event_control.consumed_events, []);
  await assert.rejects(f.broker.claim('beforeTool', { ...claim,
    nativePayload: { ...f.payload, hook_event_name: 'PreToolUse', turn_id: 'fabricated-turn' } }));
  assert.equal((await f.broker.claim('attach', claim)).receipt.operationId, result.receipt.operationId);
  assert.equal((await f.broker.parent('readReceipt', { launchId: claim.launchId })).receipt.selectionCommit.sequence, 1);
});
test('project startup receipt survives the first attested human event',async()=>{
  const f=fixture(), claim=await attached(f,true), payload=f.appendHuman();
  const result=await f.broker.claim('beforeTool',{...claim,nativePayload:payload});
  assert.equal(result.status,'COMMITTED');assert.equal(result.receipt.validation,'VERIFIED');
  const actual=readProjectState(f.gstackRoot,f.sid).value;
  assert.equal(actual.state,'TURN_ACTIVE');assert.equal(actual.binding.project,'alpha');
  assert.equal(actual.selection.latest_operation.host_launch.launchId,claim.launchId);
  assert.equal(actual.selection.last_success.origin,'host_launch');
  const again=await f.broker.claim('beforeTool',{...claim,nativePayload:payload});
  assert.equal(again.receipt.operationId,result.receipt.operationId);
  assert.equal(readProjectState(f.gstackRoot,f.sid).value.selection.commit_sequence,1);
  assert.equal((await f.broker.parent('cancel',{launchId:claim.launchId,operationId:f.request.operationId})).status,'already_committed');
  assert.equal(readProjectState(f.gstackRoot,f.sid).value.binding.project,'alpha');
  await assert.rejects(f.broker.claim('beforeTool',{...claim,nativePayload:payload}),{code:'CLAIM_REJECTED'});
});
test('startup binding alone cannot pass either harness project guard; a real Codex turn can', async () => {
  const f = fixture(), claim = await attached(f, true);
  const guard = (harness, payload = {}) => {
    const result = spawnSync(process.execPath,
      [fileURLToPath(new URL('../.claude/hooks/project-scope-guard.mjs', import.meta.url))], {
        cwd: f.gstackRoot, encoding: 'utf8', timeout: 5000,
        env: { ...process.env, CLAUDE_PROJECT_DIR: f.gstackRoot, LUCA_PROJECTS_ROOT: f.projectsRoot,
          CODEX_HOME: f.sourceRoot, LUCA_ACTUAL_HARNESS: harness },
        input: JSON.stringify({ ...f.payload, hook_event_name: 'PreToolUse',
          tool_name: 'Write', tool_input: { file_path: 'docs/probe.md', content: 'probe' }, ...payload }),
      });
    assert.ok(result.stdout.trim(), result.stderr);
    return JSON.parse(result.stdout).hookSpecificOutput;
  };
  assert.equal(guard('codex').permissionDecision, 'deny');
  assert.equal(guard('claude').permissionDecision, 'deny');
  const payload = f.appendHuman();
  await f.broker.claim('beforeTool', { ...claim, nativePayload: payload });
  const allowed = guard('codex', { turn_id: payload.turn_id });
  assert.notEqual(allowed.permissionDecision, 'deny');
  assert.equal(allowed.updatedInput.file_path, join(f.projectsRoot, 'alpha', 'docs', 'probe.md'));
});
test('host view refuses a startup binding whose receipt lost its authenticated origin', async () => {
  const f = fixture(); await attached(f, true);
  const path = join(f.gstackRoot, '.claude', `.session-project-${f.sid}`);
  const state = JSON.parse(readFileSync(path, 'utf8'));
  delete state.selection.latest_operation.host_launch.authority;
  writeFileSync(path, JSON.stringify(state));
  const view = projectStatusHostView({ gstackRoot: f.gstackRoot, projectsRoot: f.projectsRoot, sessionId: f.sid });
  assert.equal(view.read_status, 'INVALID');
  assert.equal(view.current_binding, null);
});
test('Claude startup cannot consume a Codex host-only initial binding', async () => {
  const f = fixture(); await attached(f, true);
  const result = spawnSync(process.execPath,
    [fileURLToPath(new URL('../.claude/hooks/session-restore.mjs', import.meta.url))], {
      cwd: f.gstackRoot, encoding: 'utf8', timeout: 5000,
      env: { ...process.env, CLAUDE_PROJECT_DIR: f.gstackRoot, MEMORY_ROOT: f.gstackRoot,
        LUCA_PROJECTS_ROOT: f.projectsRoot, LUCA_ACTUAL_HARNESS: 'claude' },
      input: JSON.stringify(f.payload),
    });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Codex startup binding requires the Codex harness/);
});
test('cancel received during profile revalidation prevents startup commit', async () => {
  let release, entered;
  const waiting = new Promise(resolve => { entered = resolve; });
  const f = fixture({ revalidateProfile: () => {
    entered(); return new Promise(resolve => { release = () => resolve(f.request.profileIdentity); });
  } });
  const claim = await dispatched(f, true);
  const attach = f.broker.claim('attach', claim);
  const rejected = assert.rejects(attach, { code: 'CLAIM_REJECTED' });
  await waiting;
  const cancel = f.broker.parent('cancel', { launchId: claim.launchId, operationId: f.request.operationId });
  release();
  await rejected;
  assert.equal((await cancel).status, 'CANCELLED');
  assert.equal(readProjectState(f.gstackRoot, f.sid).value.state, 'NO_PIN');
  assert.equal((await f.broker.parent('readReceipt', { launchId: claim.launchId })).receipt, null);
  await assert.rejects(f.broker.claim('attach', claim), { code: 'CLAIM_REJECTED' });
});
test('invalid cancel received during profile revalidation cannot revoke a launch', async () => {
  let release, entered;
  const waiting = new Promise(resolve => { entered = resolve; });
  const f = fixture({ revalidateProfile: () => {
    entered(); return new Promise(resolve => { release = () => resolve(f.request.profileIdentity); });
  } });
  const claim = await dispatched(f, true), attach = f.broker.claim('attach', claim);
  await waiting;
  const cancel = assert.rejects(f.broker.parent('cancel', { launchId: claim.launchId, operationId: 'wrong' }),
    { code: 'OPERATION_CONFLICT' });
  release();
  assert.equal((await attach).status, 'COMMITTED');
  await cancel;
});
test('cancel wins before commit and cannot be revived by a late native callback',async()=>{
  const f=fixture(),claim=await dispatched(f,true);
  await f.broker.parent('cancel',{launchId:claim.launchId,operationId:f.request.operationId});
  await assert.rejects(f.broker.claim('attach',claim),{code:'CLAIM_REJECTED'});
  assert.equal(readProjectState(f.gstackRoot,f.sid).value.state,'NO_PIN');
});
test('ordinary default source policy rejects Sidecar without a framework scope',()=>{
  const f=fixture();
  mkdirSync(join(f.root,'.luca','codex'),{recursive:true});
  assert.throws(()=>resolveCodexHome(f.sourceRoot,f.root),{code:'SOURCE_ROOT'});
});
test('cross-run/nonce/request/SID claims cannot borrow an attached grant',async()=>{
  const f=fixture(),claim=await attached(f);
  for (const patch of [{hostRunId:'wrong'},{openRequestId:'wrong'},{launchNonce:'wrong'},
    {claimHandle:'wrong'},{nativePayload:{...f.payload,session_id:randomUUID()}}]) {
    await assert.rejects(f.broker.claim('attach',{...claim,...patch}));
  }
});
test('initial project binding refuses resume, wrong cwd, and a replaced project directory', async () => {
  for (const patch of [{ source: 'resume' }, { cwd: '/private/tmp' }, { hook_event_name: 'PreToolUse' }]) {
    const f = fixture(), claim = await dispatched(f, true);
    await assert.rejects(f.broker.claim('attach', { ...claim, nativePayload: { ...f.payload, ...patch } }));
    assert.equal(readProjectState(f.gstackRoot, f.sid).value.state, 'NO_PIN');
  }
  const f = fixture(), claim = await dispatched(f, true);
  renameSync(join(f.projectsRoot, 'alpha'), join(f.projectsRoot, 'old-alpha'));
  mkdirSync(join(f.projectsRoot, 'alpha'));
  await assert.rejects(f.broker.claim('attach', claim), { code: 'PROJECT_CHANGED' });
  assert.equal(readProjectState(f.gstackRoot, f.sid).value.state, 'NO_PIN');
});
test('same operation is idempotent but changed payload and second dispatch are rejected',async()=>{
  const f=fixture(),p=await f.broker.parent('prepare',f.request);
  assert.equal((await f.broker.parent('prepare',f.request)).launchId,p.launchId);
  await assert.rejects(f.broker.parent('prepare',{...f.request,openRequestId:randomUUID()}),{code:'OPERATION_CONFLICT'});
  await f.broker.parent('dispatch',{launchId:p.launchId,operationId:f.request.operationId,launchNonce:p.launchNonce});
  await assert.rejects(f.broker.parent('dispatch',{launchId:p.launchId,operationId:f.request.operationId,launchNonce:p.launchNonce}),{code:'DISPATCH_REJECTED'});
});
test('profile config drift or failed main revalidation prevents project commit',async()=>{
  const f=fixture(),claim=await dispatched(f,true);
  writeFileSync(f.config,'{"profile":"different"}');
  await assert.rejects(f.broker.claim('attach',claim),{code:'IDENTITY_CHANGED'});
  assert.equal(readProjectState(f.gstackRoot,f.sid).value.state,'NO_PIN');
  const g=fixture({revalidateProfile:async()=>null}),other=await dispatched(g,true);
  await assert.rejects(g.broker.claim('attach',other),{code:'PROFILE_CHANGED'});
  assert.equal(readProjectState(g.gstackRoot,g.sid).value.state,'NO_PIN');
});
test('profile identifiers must be normalized nonempty strings',async()=>{
  const f=fixture();
  for(const patch of [{profileId:' '},{configRevision:' '},{profileId:' codex:sidecar'},
    {configRevision:'e\u0301'}]) {
    await assert.rejects(f.broker.parent('prepare',{...f.request,
      profileIdentity:{...f.request.profileIdentity,...patch}}),{code:'PROFILE_INVALID'});
  }
});
test('unfinished startup refuses tools without consuming a user event or silently binding', async () => {
  let fail = true;
  const f = fixture({ fault: stage => { if (stage === 'before-prepare' && fail) throw new Error('startup paused'); } });
  const claim = await dispatched(f, true);
  await assert.rejects(f.broker.claim('attach', claim), /startup paused/);
  const payload = f.appendHuman();
  await assert.rejects(f.broker.claim('beforeTool', { ...claim, nativePayload: payload }), { code: 'INITIAL_BINDING_REQUIRED' });
  const state = readProjectState(f.gstackRoot, f.sid).value;
  assert.equal(state.state, 'NO_PIN');
  assert.deepEqual(state.event_control.consumed_events, []);
  fail = false;
  await assert.rejects(f.broker.claim('attach', claim), /untouched native startup fence/);
  assert.equal(readProjectState(f.gstackRoot, f.sid).value.state, 'NO_PIN');
});
test('SDK/nonhuman provenance cannot acquire launch attestation',async()=>{
  const f=fixture();
  const meta=JSON.parse(readFileSync(f.source,'utf8'));delete meta.payload.thread_source;
  writeFileSync(f.source,JSON.stringify(meta)+'\n');
  await assert.rejects(attached(f,true),{code:'PROVENANCE_MISMATCH'});
  assert.equal(readProjectState(f.gstackRoot,f.sid).value.state,'NO_PIN');
});
test('after-commit fault has real pin proof and receipt, without a second transaction',async()=>{
  let injected=false;
  const f=fixture({fault:stage=>{if(stage==='after-commit'&&!injected){injected=true;throw new Error('lost acknowledgement');}}});
  const claim=await dispatched(f,true);
  await assert.rejects(f.broker.claim('attach',claim),/lost acknowledgement/);
  assert.equal(readProjectState(f.gstackRoot,f.sid).value.binding.project,'alpha');
  const receipt=await f.broker.parent('readReceipt',{launchId:claim.launchId});assert.equal(receipt.status,'COMMITTED');
  assert.equal((await f.broker.claim('attach',claim)).receipt.operationId,receipt.receipt.operationId);
  assert.equal(readProjectState(f.gstackRoot,f.sid).value.selection.commit_sequence,1);
});
test('restart never reconstructs a plaintext handle or silently replays a durable intent',async()=>{
  const f=fixture(),claim=await attached(f);
  const restarted=createHostLaunchBroker({gstackRoot:f.gstackRoot,projectsRoot:f.projectsRoot,revalidateProfile:async()=>f.request.profileIdentity});
  await assert.rejects(restarted.parent('prepare',f.request),{code:'LAUNCH_RECOVERY_REQUIRED'});
  await assert.rejects(restarted.claim('attach',claim),{code:'LAUNCH_UNKNOWN'});
});
test('controller commit before broker acknowledgement reconciles from the authoritative receipt',async()=>{
  const f=fixture({fault:stage=>{if(stage==='after-controller')throw new Error('ack gap');}});
  const claim=await dispatched(f,true);
  await assert.rejects(f.broker.claim('attach',claim),/ack gap/);
  const receipt=await f.broker.parent('readReceipt',{launchId:claim.launchId});
  assert.equal(receipt.status,'COMMITTED');assert.equal(receipt.receipt.validation,'VERIFIED');
  const cancelled=await f.broker.parent('cancel',{launchId:claim.launchId,operationId:f.request.operationId});
  assert.equal(cancelled.status,'already_committed');
  assert.equal(readProjectState(f.gstackRoot,f.sid).value.selection.commit_sequence,1);
});
test('private broker transport rejects hook prepare and works with an isolated physical fixture',async()=>{
  const f=fixture();mkdirSync(join(f.projectsRoot,'alpha'));
  f.request.projectIdentity=canonicalProjectIdentity('alpha',f.projectsRoot);
  const script=new URL('./host-launch-broker.mjs',import.meta.url);
  const child=fork(script,[f.gstackRoot,f.projectsRoot,'--fixture'],{silent:true});
  child.on('message',message=>{if(message.type==='revalidateProfile')child.send({type:'revalidateProfileResult',
    id:message.id,profileIdentity:f.request.profileIdentity});});
  const wait=predicate=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{child.off('message',listener);reject(new Error('broker timeout'));},5000);
    const listener=msg=>{if(predicate(msg)){clearTimeout(timer);child.off('message',listener);resolve(msg);}};
    child.on('message',listener);child.once('error',reject);
  });
  try{
    const ready=await wait(m=>m.type==='ready');
    const reply=wait(m=>m.id==='prepare');child.send({id:'prepare',method:'prepare',params:f.request});
    const prepared=(await reply).result;assert.ok(prepared.claimHandle);assert.equal(prepared.claimEndpoint,ready.claimEndpoint);
    const socketCall=(method,params)=>new Promise((resolve,reject)=>{const socket=connect(ready.claimEndpoint);let data='';
      socket.on('connect',()=>socket.write(JSON.stringify({method,params})+'\n'));
      socket.on('data',chunk=>data+=chunk);socket.on('end',()=>resolve(JSON.parse(data)));socket.on('error',reject);});
    const denied=await socketCall('prepare',f.request);
    assert.equal(denied.error.code,'METHOD_DENIED');
    const dispatched=wait(m=>m.id==='dispatch');child.send({id:'dispatch',method:'dispatch',params:{launchId:prepared.launchId,
      operationId:f.request.operationId,launchNonce:prepared.launchNonce}});assert.equal((await dispatched).result.status,'DISPATCHED');
    mkdirSync(join(f.gstackRoot,'.codex'));mkdirSync(join(f.gstackRoot,'.claude','hooks'),{recursive:true});
    for(const name of ['host-launch-hook.mjs','host-launch-adapter.mjs','codex-hook-adapter.mjs'])
      cpSync(new URL('../.codex/'+name,import.meta.url),join(f.gstackRoot,'.codex',name));
    const env={...process.env,MUSE_HOST_LAUNCH_ENDPOINT:ready.claimEndpoint,
      MUSE_HOST_LAUNCH_ID:prepared.launchId,MUSE_HOST_LAUNCH_HANDLE:prepared.claimHandle,
      MUSE_HOST_LAUNCH_NONCE:prepared.launchNonce,MUSE_HOST_RUN_ID:f.request.hostRunId,
      MUSE_OPEN_REQUEST_ID:f.request.openRequestId};
    const invoke=(name,payload)=>new Promise(resolve=>{const hook=join(f.gstackRoot,'.claude','hooks',name);
      const subprocess=execFile(process.execPath,[join(f.gstackRoot,'.codex','host-launch-hook.mjs'),hook],
        {env,cwd:f.gstackRoot,timeout:5000},(error,stdout,stderr)=>resolve({code:error?.code || 0,stdout,stderr}));
      subprocess.stdin.end(JSON.stringify(payload));});
    writeFileSync(join(f.gstackRoot,'.claude','hooks','session-restore.mjs'),
      'throw new Error("isolated restore crash");');
    const restore=await invoke('session-restore.mjs',f.payload);
    assert.equal(restore.code,2);assert.match(restore.stderr,/isolated restore crash/);
    assert.equal(readProjectState(f.gstackRoot,f.sid).value.state,'HOST_BOUND');
    assert.equal(readProjectState(f.gstackRoot,f.sid).value.event_control.current,null);
    writeFileSync(join(f.gstackRoot,'.claude','hooks','route-guard.mjs'),
      'throw new Error("isolated route guard crash");');
    const route=await invoke('route-guard.mjs',{...f.payload,hook_event_name:'UserPromptSubmit',
      prompt:'fixture',turn_id:randomUUID()});
    assert.equal(route.code,2);assert.match(route.stderr,/isolated route guard crash/);
    const payload=f.appendHuman();
    writeFileSync(join(f.gstackRoot,'.claude','hooks','project-scope-guard.mjs'),
      'throw new Error("isolated project guard crash");');
    const beforeTool=await invoke('project-scope-guard.mjs',payload);
    assert.equal(beforeTool.code,2);assert.match(beforeTool.stderr,/isolated project guard crash/);
    const receiptReply=wait(m=>m.id==='readReceipt');
    child.send({id:'readReceipt',method:'readReceipt',params:{launchId:prepared.launchId}});
    assert.equal((await receiptReply).result.receipt.validation,'VERIFIED');
    assert.equal(readProjectState(f.gstackRoot,f.sid).value.binding.project,'alpha');
    writeFileSync(join(f.gstackRoot,'.claude','hooks','project-scope-guard.mjs'),
      'process.stdout.write(JSON.stringify({hookSpecificOutput:{updatedInput:{command:"true"}}}));');
    writeFileSync(join(f.gstackRoot,'.claude','hooks','controlled-change-guard.mjs'),'');
    const allowed=await invoke('project-scope-guard.mjs',payload);
    assert.equal(allowed.code,0);
    assert.equal(JSON.parse(allowed.stdout).hookSpecificOutput.permissionDecision,'allow');
  }finally{child.disconnect();await new Promise(resolve=>child.once('exit',resolve));}
});
test('host adapter preserves controlled read rewrites and distinguishes denial from output', () => {
  const f = fixture();
  mkdirSync(join(f.gstackRoot, '.codex')); mkdirSync(join(f.gstackRoot, '.claude', 'hooks'), { recursive: true });
  const adapter = join(f.gstackRoot, '.codex', 'host-launch-adapter.mjs');
  cpSync(new URL('../.codex/host-launch-adapter.mjs', import.meta.url), adapter);
  const target = join(f.gstackRoot, '.claude', 'hooks', 'project-scope-guard.mjs');
  const controlled = join(f.gstackRoot, '.claude', 'hooks', 'controlled-change-guard.mjs');
  writeFileSync(target, '');
  execFileSync('/usr/bin/git', ['init', '-q', f.gstackRoot], { env: { PATH: process.env.PATH } });
  const actualGuard = fileURLToPath(new URL('../.claude/hooks/controlled-change-guard.mjs', import.meta.url));
  writeFileSync(controlled, `import {spawnSync} from 'node:child_process';import {readFileSync} from 'node:fs';
    const r=spawnSync(process.execPath,[${JSON.stringify(actualGuard)}],{input:readFileSync(0),env:process.env,encoding:'utf8'});
    process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');process.exitCode=r.status;`);
  const invoke = command => spawnSync(process.execPath, [adapter, target], {
    cwd: f.gstackRoot, env: { PATH: process.env.PATH }, encoding: 'utf8',
    input: JSON.stringify({ ...f.payload, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } }),
  });
  for (const command of ['pwd', 'head -n 3 README.md']) {
    const result = invoke(command);
    assert.equal(result.status, 0, `${command}: ${result.stderr || result.stdout}`);
    assert.equal(result.stderr, '');
    const output = JSON.parse(result.stdout);
    assert.equal(output.hookSpecificOutput.permissionDecision, 'allow');
    assert.match(output.hookSpecificOutput.updatedInput.command, /^'\/(?:bin\/pwd|usr\/bin\/head)'/);
    assert.equal(result.stdout.trim().split('\n').length, 1);
  }
  for (const status of [0, 2]) {
    writeFileSync(controlled, `process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',
      permissionDecision:'deny',permissionDecisionReason:'exact fixture refusal'}}));process.exitCode=${status};`);
    const result = invoke('pwd');
    assert.equal(result.status, 2); assert.match(result.stderr, /exact fixture refusal/);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
  }
  for (const output of ['not JSON', '[]', 'null', '{}', JSON.stringify({ additionalContext: 'unexpected' }),
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: 'unexpected' } }),
    ...[{}, [], null, { command: 123 }, { command: '' }, { command: ' ' }].map(updatedInput => JSON.stringify({ hookSpecificOutput: {
      hookEventName: 'PreToolUse', permissionDecision: 'allow', updatedInput } })),
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', permissionDecision: 'allow', updatedInput: { command: 'pwd' } } }),
    JSON.stringify({ hookSpecificOutput: { updatedInput: { command: 'pwd' } } })]) {
    writeFileSync(controlled, `process.stdout.write(${JSON.stringify(output)});`);
    const result = invoke('pwd');
    assert.equal(result.status, 2, `unexpected controlled output must refuse: ${output}`);
    assert.match(result.stderr, /CONTROLLED_OUTPUT_INVALID/);
  }
  writeFileSync(controlled, '');
  const noIntervention = invoke('pwd');
  assert.equal(noIntervention.status, 0); assert.equal(noIntervention.stdout, ''); assert.equal(noIntervention.stderr, '');
  writeFileSync(controlled, 'process.exitCode=2;');
  const silentDenial = invoke('pwd'); assert.equal(silentDenial.status, 2); assert.match(silentDenial.stderr, /controlled guard refused/);
  writeFileSync(controlled, 'throw new Error("controlled fixture crash");');
  const crash = invoke('pwd'); assert.equal(crash.status, 2); assert.match(crash.stderr, /controlled fixture crash|INNER_HOOK_FAILED/);
});
test('project controller has no public no-event initial binding API', () => {
  assert.equal(Object.hasOwn(projectPinApi, 'executeHostInitialBinding'), false);
});
test('grant corruption refuses source scope instead of silently widening the source root',async()=>{
  const f=fixture(),claim=await attached(f);
  const path=join(f.gstackRoot,'.claude','host-launch',`${claim.launchId}.source.json`);
  const bytes=readFileSync(path);writeFileSync(path,'{}');
  assert.throws(()=>readHostLaunchSourceScope(f.gstackRoot,f.sid));
  writeFileSync(path,bytes);
  assert.equal(readHostLaunchSourceScope(f.gstackRoot,f.sid).sourceRoot.realpath,f.sourceRoot);
});
test('historical committed receipt never masquerades as the current selection cursor',async()=>{
  const f=fixture(),claim=await attached(f,true),payload=f.appendHuman();
  await f.broker.claim('beforeTool',{...claim,nativePayload:payload});
  const path=join(f.gstackRoot,'.claude',`.session-project-${f.sid}`);
  const state=JSON.parse(readFileSync(path,'utf8'));
  state.selection.commit_sequence++;state.selection.last_success.sequence++;
  writeFileSync(path,JSON.stringify(state));
  await assert.rejects(f.broker.parent('readReceipt',{launchId:claim.launchId}),{code:'READBACK_MISMATCH'});
  await assert.rejects(f.broker.claim('attach',claim),{code:'READBACK_MISMATCH'});
  await assert.rejects(f.broker.claim('beforeTool',{...claim,nativePayload:payload}),{code:'READBACK_MISMATCH'});
});
test('host wrapper fails closed when its legacy route guard crashes, while legacy remains fail-open',async()=>{
  const f=fixture(),claim=await attached(f);
  mkdirSync(join(f.gstackRoot,'.codex'));mkdirSync(join(f.gstackRoot,'.claude','hooks'),{recursive:true});
  for(const name of ['host-launch-hook.mjs','host-launch-adapter.mjs','codex-hook-adapter.mjs'])
    cpSync(new URL('../.codex/'+name,import.meta.url),join(f.gstackRoot,'.codex',name));
  const target=join(f.gstackRoot,'.claude','hooks','route-guard.mjs');
  writeFileSync(target,'throw new Error("isolated route guard crash");');
  const invoke=env=>new Promise(resolve=>{const child=execFile(process.execPath,
    [join(f.gstackRoot,'.codex','host-launch-hook.mjs'),target],{env,cwd:f.gstackRoot,timeout:5000},
    (error,stdout,stderr)=>resolve({code:error?.code || 0,stdout,stderr}));
    child.stdin.end(JSON.stringify({...f.payload,hook_event_name:'UserPromptSubmit',prompt:'fixture',turn_id:randomUUID()}));});
  const env={PATH:process.env.PATH,MUSE_HOST_LAUNCH_ID:claim.launchId,MUSE_HOST_LAUNCH_HANDLE:claim.claimHandle};
  const host=await invoke(env);assert.equal(host.code,2);assert.match(host.stderr,/isolated route guard crash/);
  assert.equal((await invoke({PATH:process.env.PATH})).code,0);
  assert.equal(readProjectState(f.gstackRoot,f.sid).value.state,'NO_PIN');
});
test('ordinary Codex hook keeps legacy fail-open behavior for malformed input',async()=>{
  const f=fixture();
  mkdirSync(join(f.gstackRoot,'.codex'));mkdirSync(join(f.gstackRoot,'.claude','hooks'),{recursive:true});
  for(const name of ['host-launch-hook.mjs','codex-hook-adapter.mjs'])
    cpSync(new URL('../.codex/'+name,import.meta.url),join(f.gstackRoot,'.codex',name));
  const target=join(f.gstackRoot,'.claude','hooks','route-guard.mjs');
  writeFileSync(target,'process.stdout.write("ok");');
  const result=await new Promise(resolve=>{const child=execFile(process.execPath,
    [join(f.gstackRoot,'.codex','host-launch-hook.mjs'),target],
    {env:{PATH:process.env.PATH},cwd:f.gstackRoot,timeout:5000},
    (error,stdout,stderr)=>resolve({code:error?.code || 0,stdout,stderr}));
    child.stdin.end('{malformed');});
  assert.equal(result.code,0);
});
test('an authenticated global launch remains usable after the initial capability deadline',async()=>{
  const f=fixture(),claim=await attached(f),payload=f.appendHuman();
  assert.equal((await f.broker.claim('beforeTool',{...claim,nativePayload:payload})).status,'ACTIVE_NO_PIN');
  const realNow=Date.now;Date.now=()=>realNow()+601000;
  try{
    assert.equal((await f.broker.claim('beforeTool',{...claim,nativePayload:payload})).status,'ACTIVE_NO_PIN');
    assert.equal((await f.broker.parent('readReceipt',{launchId:claim.launchId})).status,'ACTIVE_NO_PIN');
    await f.broker.parent('cancel',{launchId:claim.launchId,operationId:f.request.operationId});
    await assert.rejects(f.broker.claim('beforeTool',{...claim,nativePayload:payload}),{code:'CLAIM_REJECTED'});
  }finally{Date.now=realNow;}
});
test('unfulfilled launch capability expires, while active global launches still recheck profile',async()=>{
  const f=fixture(),claim=await attached(f);
  const realNow=Date.now;Date.now=()=>realNow()+601000;
  try {
    await assert.rejects(f.broker.claim('beforeTool',{...claim,nativePayload:f.appendHuman()}),{code:'CLAIM_REJECTED'});
    assert.equal((await f.broker.parent('readReceipt',{launchId:claim.launchId})).status,'ATTACHED');
  } finally {Date.now=realNow;}
  const g=fixture(),active=await attached(g),payload=g.appendHuman();
  await g.broker.claim('beforeTool',{...active,nativePayload:payload});
  writeFileSync(g.config,'{"profile":"changed"}');
  await assert.rejects(g.broker.claim('beforeTool',{...active,nativePayload:payload}),{code:'IDENTITY_CHANGED'});
});
test('active global launch rechecks native evidence on every tool',async()=>{
  const f=fixture(),claim=await attached(f),payload=f.appendHuman();
  await f.broker.claim('beforeTool',{...claim,nativePayload:payload});
  writeFileSync(f.source,'{"type":"session_meta","payload":{}}\n');
  await assert.rejects(f.broker.claim('beforeTool',{...claim,nativePayload:payload}));
  assert.equal((await f.broker.parent('readReceipt',{launchId:claim.launchId})).status,'ACTIVE_NO_PIN');
});

// Real default-profile launches omit CODEX_HOME; a broker still records the
// canonical default source. Exercise the attester again outside the broker.
test('host default home without CODEX_HOME survives downstream native source validation', async t => {
  const f = fixture({ defaultCodexHome: true });
  const realUserInfo = os.userInfo;
  t.mock.method(os, 'userInfo', () => ({ ...realUserInfo(), homedir: join(f.root, 'home') }));
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  await attached(f);
  const scope = readHostLaunchSourceScope(f.gstackRoot, f.sid);
  const options = { sessionId: f.sid, harness: 'codex', cwd: f.gstackRoot, hostSourceScope: scope };
  assert.doesNotThrow(() => captureNativeEventFence(options));
  assert.doesNotThrow(() => captureNativeEventFence({ ...options, codexHome: f.sourceRoot }));
  assert.throws(() => captureNativeEventFence({ ...options, codexHome: f.root }), { code: 'SOURCE_ROOT' });
  assert.throws(() => captureNativeEventFence({ ...options, sessionId: randomUUID() }), { code: 'SOURCE_ROOT' });
  assert.throws(() => captureNativeEventFence({ ...options, cwd: f.root }), { code: 'SOURCE_ROOT' });
  assert.throws(() => captureNativeEventFence({ ...options, hostSourceScope: { ...scope } }), { code: 'SOURCE_ROOT' });
});
test('omitted CODEX_HOME cannot borrow a nondefault host source', async () => {
  const f = fixture();
  await attached(f);
  const hostSourceScope = readHostLaunchSourceScope(f.gstackRoot, f.sid);
  assert.throws(() => captureNativeEventFence({ sessionId: f.sid, harness: 'codex',
    cwd: f.gstackRoot, hostSourceScope }), { code: 'SOURCE_ROOT' });
});

test('project host launch permits later controller selections and bounded receipt history', async (t) => {
  const f = fixture(), claim = await attached(f, true);
  const previousRoots = [process.env.LUCA_GSTACK_ROOT, process.env.LUCA_PROJECTS_ROOT];
  process.env.LUCA_GSTACK_ROOT = f.gstackRoot;
  process.env.LUCA_PROJECTS_ROOT = f.projectsRoot;
  t.after(() => {
    for (const [index, key] of ['LUCA_GSTACK_ROOT', 'LUCA_PROJECTS_ROOT'].entries()) {
      if (previousRoots[index] === undefined) delete process.env[key];
      else process.env[key] = previousRoots[index];
    }
  });
  mkdirSync(join(f.projectsRoot, 'beta'));
  await f.broker.claim('beforeTool', { ...claim, nativePayload: f.appendHuman() });
  for (let index = 0; index < 18; index++) {
    const payload = f.appendHuman();
    await f.broker.claim('beforeTool', { ...claim, nativePayload: payload });
    const prepared = prepareProjectSwitch({ gstackRoot: f.gstackRoot, projectsRoot: f.projectsRoot,
      sessionId: f.sid, operation: 'switch', target: 'beta' });
    executeProjectTransaction({
      sessionId: f.sid, tx: prepared.proposal.tx, operation: 'switch', target: 'beta',
      expectedEpoch: prepared.proposal.expected_epoch });
    const result = await f.broker.claim('beforeTool', { ...claim, nativePayload: payload });
    assert.equal(result.status, 'COMMITTED');
    assert.equal(result.receipt, undefined, 'historical launch receipt must not describe the current selection');
    assert.equal(readProjectState(f.gstackRoot, f.sid).value.binding.project, 'beta');
    if (index === 0) renameSync(join(f.projectsRoot, 'alpha'), join(f.projectsRoot, 'alpha-moved'));
    const event = readProjectState(f.gstackRoot, f.sid).value.event_control.current;
    closeAttestedProjectEvent({ gstackRoot: f.gstackRoot, projectsRoot: f.projectsRoot,
      sessionId: f.sid, eventId: event.event_id, boundaryId: event.boundary_id });
  }
  const state = readProjectState(f.gstackRoot, f.sid).value;
  assert.equal(state.selection.receipts.some(row => row.host_launch), false);
  refenceProjectStateForDeactivate({ gstackRoot: f.gstackRoot, sessionId: f.sid,
    expectedRaw: readProjectState(f.gstackRoot, f.sid).raw, codexHome: f.sourceRoot });
  assert.equal((await f.broker.claim('beforeTool', { ...claim, nativePayload: f.appendHuman() })).status, 'COMMITTED');
  assert.equal(readProjectState(f.gstackRoot, f.sid).value.state, 'NO_PIN');
  const prepared = prepareProjectSwitch({ gstackRoot: f.gstackRoot, projectsRoot: f.projectsRoot,
    sessionId: f.sid, operation: 'switch', target: 'beta' });
  executeProjectTransaction({
    sessionId: f.sid, tx: prepared.proposal.tx, operation: 'switch', target: 'beta',
    expectedEpoch: prepared.proposal.expected_epoch });
  assert.equal((await f.broker.claim('beforeTool', { ...claim, nativePayload: f.appendHuman() })).status, 'COMMITTED');
  assert.equal(readProjectState(f.gstackRoot, f.sid).value.binding.project, 'beta');
  await assert.rejects(f.broker.parent('readReceipt', { launchId: claim.launchId }), { code: 'READBACK_MISMATCH' });
});

test('cancelled selections may evict old receipts without revoking the current host session', async () => {
  const f = fixture(), claim = await attached(f, true);
  mkdirSync(join(f.projectsRoot, 'beta'));
  await f.broker.claim('beforeTool', { ...claim, nativePayload: f.appendHuman() });
  for (let index = 0; index < 17; index++) {
    await f.broker.claim('beforeTool', { ...claim, nativePayload: f.appendHuman() });
    prepareProjectSwitch({ gstackRoot: f.gstackRoot, projectsRoot: f.projectsRoot,
      sessionId: f.sid, operation: 'switch', target: 'beta' });
    const event = readProjectState(f.gstackRoot, f.sid).value.event_control.current;
    closeAttestedProjectEvent({ gstackRoot: f.gstackRoot, projectsRoot: f.projectsRoot,
      sessionId: f.sid, eventId: event.event_id, boundaryId: event.boundary_id });
  }
  assert.equal((await f.broker.claim('beforeTool', { ...claim, nativePayload: f.appendHuman() })).status, 'COMMITTED');
  assert.equal(readProjectState(f.gstackRoot, f.sid).value.binding.project, 'alpha');
});

test('default-home public switch crosses the real guard and controller on consecutive human turns', async (t) => {
  const f = fixture({ defaultCodexHome: true });
  const previousRoots = [process.env.LUCA_GSTACK_ROOT, process.env.LUCA_PROJECTS_ROOT];
  process.env.LUCA_GSTACK_ROOT = f.gstackRoot;
  process.env.LUCA_PROJECTS_ROOT = f.projectsRoot;
  t.after(() => {
    for (const [index, key] of ['LUCA_GSTACK_ROOT', 'LUCA_PROJECTS_ROOT'].entries()) {
      if (previousRoots[index] === undefined) delete process.env[key];
      else process.env[key] = previousRoots[index];
    }
  });
  execFileSync('git', ['init', '-q', f.gstackRoot]);
  await attached(f);
  for (const name of ['alpha', 'beta']) mkdirSync(join(f.projectsRoot, name));
  const preload = join(f.root, 'default-home.cjs');
  writeFileSync(preload, `const os = require('node:os'); const original = os.userInfo;
os.userInfo = () => ({ ...original(), homedir: ${JSON.stringify(join(f.root, 'home'))} });
require('node:module').syncBuiltinESMExports();`);
  const env = { ...process.env, CLAUDE_PROJECT_DIR: f.gstackRoot,
    LUCA_PROJECTS_ROOT: f.projectsRoot, LUCA_ACTUAL_HARNESS: 'codex' };
  delete env.CODEX_HOME;
  delete env.NODE_OPTIONS;
  delete env.LUCA_EVENT_ATTESTATION_TEST;
  const invoke = (payload, extra = {}) => new Promise(resolve => {
    const child = execFile(process.execPath, ['--require', preload,
      fileURLToPath(new URL('../.claude/hooks/project-scope-guard.mjs', import.meta.url))],
    { cwd: f.gstackRoot, env: { ...env, ...extra }, timeout: 5000 },
    (error, stdout, stderr) => resolve({ code: error?.code || 0, stdout, stderr }));
    child.stdin.end(JSON.stringify(payload));
  });
  for (const [index, target] of ['alpha', 'beta'].entries()) {
    const turn = randomUUID(), prompt = `进入 ${target} 项目`;
    appendFileSync(f.source, [
      { type: 'response_item', payload: { type: 'message', role: 'user', id: `msg_${randomUUID()}`,
        content: [{ type: 'input_text', text: prompt }], internal_chat_message_metadata_passthrough: { turn_id: turn } } },
      { type: 'event_msg', payload: { type: 'item_completed', thread_id: f.sid, turn_id: turn,
        item: { type: 'UserMessage', id: randomUUID(), content: [{ type: 'text', text: prompt }] } } },
    ].map(JSON.stringify).join('\n') + '\n');
    queueProjectEventCandidate({ gstackRoot: f.gstackRoot, projectsRoot: f.projectsRoot,
      sessionId: f.sid, boundaryId: turn, cwd: f.gstackRoot, harness: 'codex', prompt, intent: { kind: 'turn' } });
    const payload = { ...f.payload, hook_event_name: 'PreToolUse', turn_id: turn,
      tool_name: 'Bash', tool_input: { command: `./scripts/project.sh switch ${target}` } };
    const denied = await invoke(payload, { CODEX_HOME: f.root });
    assert.ok(denied.stdout.trim(), denied.stderr || `guard returned ${denied.code}`);
    const failure = JSON.parse(denied.stdout).hookSpecificOutput;
    assert.equal(failure.permissionDecision, 'deny');
    assert.match(failure.permissionDecisionReason, /SOURCE_ROOT/);
    assert.ok(denied.stderr.includes(`[session=${f.sid}]`));
    const allowed = await invoke(payload);
    assert.equal(allowed.code, 0, allowed.stderr);
    const output = JSON.parse(allowed.stdout).hookSpecificOutput;
    assert.ok(output.updatedInput?.command, JSON.stringify(output));
    const proposal = parseExpandedSelectionCommand(output.updatedInput.command);
    assert.ok(proposal);
    const committed = executeProjectTransaction({
      sessionId: proposal.session_id, tx: proposal.tx, operation: proposal.operation,
      target: proposal.target, expectedEpoch: proposal.expected_epoch });
    assert.equal(committed.binding.project, target);
    assert.equal(readProjectState(f.gstackRoot, f.sid).value.selection.commit_sequence, index + 1);
  }
});

test('production broker refuses an ordinary parent independently of optional source protection',async()=>{
  const production=realpathSync(new URL('..',import.meta.url));
  const f=fixture();
  const script=new URL('./host-launch-broker.mjs',import.meta.url);
  const child=fork(script,[production,f.projectsRoot],{
    silent:true,env:{...process.env,NODE_OPTIONS:'',LUCA_PROTECTED_CODE_ROOT:''},
  });
  let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
  const code=await new Promise(resolve=>child.once('exit',resolve));
  assert.notEqual(code,0);
  assert.match(stderr,/HOST_PARENT_DENIED/);
});

test('ordinary model import cannot construct production authority or change any existing pin bytes',()=>{
  const production=realpathSync(new URL('..',import.meta.url));
  const f=fixture();
  const snapshot=()=>Object.fromEntries(readdirSync(join(production,'.claude')).filter(n=>/^\.session-project-/.test(n))
    .map(n=>[n,createHash('sha256').update(readFileSync(join(production,'.claude',n))).digest('hex')]));
  const before=snapshot();
  assert.throws(()=>executeProjectTransaction({gstackRoot:production,projectsRoot:f.projectsRoot,sessionId:randomUUID(),
    tx:randomUUID(),operation:'switch',target:'muse',expectedEpoch:0}),/host launch roots require a receipt/);
  assert.throws(()=>createHostLaunchBroker({gstackRoot:production,projectsRoot:f.projectsRoot,
    revalidateProfile:async()=>null}),{code:'HOST_PARENT_DENIED'});
  assert.throws(()=>executeProjectTransaction({gstackRoot:production,projectsRoot:f.projectsRoot,sessionId:randomUUID(),
    tx:randomUUID(),operation:'switch',target:'muse',expectedEpoch:0,hostLaunchReceipt:{launchId:randomUUID()}}),{code:'HOST_RECEIPT_DENIED'});
  assert.deepEqual(snapshot(),before);
});

test('production source grants are outside the agent-writable checkout',()=>{
  const production=realpathSync(new URL('..',import.meta.url));
  const journal=hostLaunchJournalRoot(production);
  assert.ok(journal.includes('/.codex/luca-child-project/host-launch/'));
  assert.ok(!journal.startsWith(production+'/'));
});

test('ordinary protected Codex hook fails closed on a legacy adapter crash',async()=>{
  const f=fixture();
  mkdirSync(join(f.gstackRoot,'.codex'));mkdirSync(join(f.gstackRoot,'.claude','hooks'),{recursive:true});
  cpSync(new URL('../.codex/host-launch-hook.mjs',import.meta.url),join(f.gstackRoot,'.codex','host-launch-hook.mjs'));
  const target=join(f.gstackRoot,'.claude','hooks','route-guard.mjs');
  writeFileSync(target,'process.stdout.write("ok");');
  const result=await new Promise(resolve=>{const child=execFile(process.execPath,
    [join(f.gstackRoot,'.codex','host-launch-hook.mjs'),target],
    {env:{PATH:process.env.PATH,LUCA_CHILD_SOURCE_ROOT:f.gstackRoot},cwd:f.gstackRoot,timeout:5000},
    (error,stdout,stderr)=>resolve({code:error?.code || 0,stdout,stderr}));
    child.stdin.end(JSON.stringify({...f.payload,hook_event_name:'UserPromptSubmit'}));});
  assert.equal(result.code,2);
});

test('registered Host Launch PreToolUse intercepts every native tool kind',()=>{
  const hooks=JSON.parse(readFileSync(new URL('../.codex/hooks.json',import.meta.url),'utf8'));
  const group=hooks.hooks.PreToolUse.find(item => item.hooks?.some(hook =>
    hook.command.includes('.codex/host-launch-hook.mjs')));
  assert.ok(group);
  const matcher=new RegExp(group.matcher);
  for(const name of ['Bash','apply_patch','collaborationspawn_agent','Agent','unknown_future_tool']) {
    assert.equal(matcher.test(name),true,name);
  }
});
