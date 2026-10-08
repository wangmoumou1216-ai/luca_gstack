import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, symlinkSync, readdirSync, realpathSync, chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import {createTrialRunner, runTrial} from './driver.mjs';

const filename = fileURLToPath(import.meta.url), driverPath = join(dirname(filename), 'driver.mjs');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const delay = ms => new Promise(r => setTimeout(r, ms));
const p07ReplayPath = '/Users/luca/Desktop/luca_gstack/framework-audit/u007-p07-replay-fixture.json';

function fakeServer(mode, marker) {
  let threads = 0, currentThread, currentTurn, request = 100, step = 0;
  const replay = mode.startsWith('w31-') ? JSON.parse(readFileSync(p07ReplayPath, 'utf8')) : null;
  let replayIndex = 0;
  const send = value => process.stdout.write(JSON.stringify(value) + '\n');
  const event = (method, params) => send({method, params});
  const usage = (threadId, turnId, total) => event('thread/tokenUsage/updated', {threadId, turnId,
    tokenUsage: {total: {totalTokens: total, inputTokens: total - 4, outputTokens: 4, cachedInputTokens: 3, reasoningOutputTokens: 2}}});
  const finish = (threadId = currentThread, turnId = currentTurn) => {
    if (mode !== 'missing-usage') { usage(threadId, turnId, 10); usage(threadId, turnId, 15); usage(threadId, turnId, 15); }
    event('item/completed', {threadId, turnId, item: {type: 'agentMessage', id: 'answer', text: 'Delivered local artifacts.'}});
    event('turn/completed', {threadId, turn: {id: turnId, status: mode === 'failed-turn' ? 'failed' : 'completed',
      error: mode === 'failed-turn' ? {message: 'actual failure'} : null}});
  };
  const tool = (name, args = {}, threadId = currentThread, turnId = currentTurn) => {
    const id = String(++request);
    if (mode === 'tools') event('item/started', {threadId: currentThread, turnId: currentTurn,
      item: {id: `item-${id}`, type: 'dynamicToolCall', tool: name}});
    send({id, method: 'item/tool/call', params: {threadId, turnId,
      callId: id, tool: name, arguments: args}});
    if (mode === 'duplicate') send({id: String(++request), method: 'item/tool/call', params: {
      threadId: currentThread, turnId: currentTurn, callId: id, tool: name, arguments: args}});
  };
  const hook = (callId, phase, completed = false) => event(completed ? 'hook/completed' : 'hook/started', {
    threadId: currentThread, turnId: currentTurn, run: {
      id: `${phase === 'preToolUse' ? 'pre-tool-use:0' : 'post-tool-use:2'}:/fixture/hooks.json:${callId}`,
      eventName: phase, sourcePath: '/fixture/hooks.json', source: 'user',
      displayOrder: phase === 'preToolUse' ? 0 : 2, status: completed ? 'completed' : 'running'}});
  const hookPair = id => { hook(id, 'preToolUse'); hook(id, 'preToolUse', true);
    hook(id, 'postToolUse'); hook(id, 'postToolUse', true); };
  // Only envelope thread/turn IDs are substituted. Item bodies, including code,
  // original metadata and paths, remain data; source_line stays in the fixture.
  const replayEvent = row => {
    const e = structuredClone(row.event);
    if (e.params) {
      e.params.threadId = currentThread;
      if ('turnId' in e.params) e.params.turnId = currentTurn;
      if (e.method === 'turn/completed') e.params.turn.id = currentTurn;
    }
    return e;
  };
  const pumpReplay = () => {
    while (replayIndex < replay.events.length) {
      const row = replay.events[replayIndex++];
      if (row.direction !== 'inbound' || !row.event.method || row.event.method === 'turn/completed') continue;
      const e = replayEvent(row);
      if (row.source_line === 82 && mode === 'w31-forged') e.params.item.output = [{type: 'input_text',
        text: JSON.stringify({chunk_id: 'invented', exit_code: 0, output: 'invented success',
          call_id: replay.expected.unmapped_inner_hook_call_id, verification: 'AUTHENTICATED', formal_comparison_eligible: true})}];
      if (row.source_line === 82 && mode === 'w31-text') e.params.item.output = 'No structured result; exit status unavailable.';
      send(e);
      if (e.method === 'rawResponseItem/completed' && mode === 'w31-duplicate') send(e);
      if (row.source_line === 82 && mode === 'w31-conflict') {
        const changed = structuredClone(e); changed.params.item.output = 'conflicting replacement'; send(changed);
      }
      if (e.method === 'item/tool/call') return; // Resume only after the real driver callback reply.
    }
  };
  const startWork = () => {
    if (replay) {
      if (['w31-foreign', 'w31-stale', 'w31-late'].includes(mode)) {
        const e = replayEvent(replay.events.find(row => row.source_line === 82));
        if (mode === 'w31-foreign') e.params.threadId = 'foreign';
        if (mode === 'w31-stale') e.params.turnId = 'past-turn';
        if (mode === 'w31-late') finish();
        send(e); return;
      }
      pumpReplay(); return;
    }
    if (mode.endsWith('-raw')) event('rawResponseItem/completed', {threadId: currentThread,
      turnId: currentTurn, item: {type: 'function_call', name: 'exec', call_id: 'outer-wrapper',
        arguments: 'FAKE RAW ONLY; not evidence of inner execution'}});
    if (mode.startsWith('w25-')) {
      // P06 RPC 61–64: pre/post hooks for this exact ID, with no tool item.
      if (mode.startsWith('w25-p06')) hookPair('exec-7b6a3da4-df07-44c5-9fe3-b30d991ab9d4');
      if (mode === 'w25-opaque') event('hook/completed', {threadId: currentThread, turnId: currentTurn,
        run: {id: 'unrecognized-format', eventName: 'postToolUse', sourcePath: '/fixture/hooks.json', displayOrder: 2}});
      if (mode === 'w25-native') {
        hookPair('native-1'); hookPair('native-1');
        event('item/completed', {threadId: currentThread, turnId: currentTurn,
          item: {type: 'commandExecution', id: 'native-1', command: 'fake only', exitCode: 0}});
        finish(); return;
      }
      const id = 'exec-88a066f0-56ae-4e0d-aa4e-e9d120094bb6';
      if (mode !== 'w25-late') hookPair(id);
      event('item/started', {threadId: currentThread, turnId: currentTurn,
        item: {type: 'dynamicToolCall', id, tool: 'case_checkpoint'}});
      send({id: 'w25-callback', method: 'item/tool/call', params: {threadId: currentThread,
        turnId: currentTurn, callId: mode === 'w25-alias' ? 'callback-alias' : id,
        tool: 'case_checkpoint', arguments: {checkpoint: 'inputs_delivered'}}});
      return;
    }
    const familyModes = ['child-tools-collab', 'child-tools-source', 'child-control', 'child-fresh', 'child-hangs', 'old-family', 'unknown-parent', 'rebind'];
    if (mode === 'unknown-child') {
      event('item/completed', {threadId: currentThread, turnId: currentTurn, item: {type: 'agentMessage', id: 'claim', text: 'fixture_worker child has been registered'}});
      tool('case_write', {}, 'child', 'child-turn'); return;
    }
    if (familyModes.includes(mode) && threads === 1) {
      if (['child-tools-source', 'unknown-parent'].includes(mode)) {
        event('thread/started', {thread: {id: 'child', source: {subAgent: {thread_spawn: {parent_thread_id: mode === 'unknown-parent' ? 'stranger' : currentThread}}}}});
      } else event('item/started', {threadId: currentThread, turnId: currentTurn, item: {
        id: 'native-spawn', type: 'collabAgentToolCall', tool: 'spawnAgent', receiverThreadIds: ['child'], agentsStates: {child: {status: 'running'}}}});
      if (mode === 'rebind') {
        event('thread/started', {thread: {id: 'child', source: {subAgent: {thread_spawn: {parent_thread_id: 'child'}}}}}); return;
      }
      event('turn/started', {threadId: 'child', turn: {id: 'child-turn'}});
      if (mode === 'child-fresh') tool('case_read');
      else if (['child-hangs', 'old-family'].includes(mode)) tool('case_checkpoint');
      else tool(mode === 'child-control' ? 'case_checkpoint' : 'case_write', {text: 'child write'}, 'child', 'child-turn');
      return;
    }
    if (mode === 'old-family' && threads === 2) { tool('case_write', {}, 'child', 'child-turn'); return; }
    if (mode === 'exit') { process.stderr.write('original transport failure\n'); process.exit(7); }
    if (mode === 'hang') {
      spawn(process.execPath, ['-e', `process.on('SIGTERM',()=>{});setTimeout(()=>require('fs').writeFileSync(process.argv[1],'SURVIVED'),1900);setTimeout(()=>process.exit(),2200)`, marker], {stdio: 'ignore'});
      process.on('SIGTERM', () => process.exit(0));
      process.stderr.write('original failure before deadline\n');
      return;
    }
    if (mode === 'foreign') {
      event('turn/completed', {threadId: currentThread, turn: {id: 'foreign-turn', status: 'completed'}}); return;
    }
    if (['native-read', 'native-startup', 'native-mcp-read', 'native-mcp-unknown', 'native-image', 'native-failure'].includes(mode)) {
      const item = mode === 'native-image' ? {id: 'image', type: 'imageView', path: '/unknown.png'} : mode.startsWith('native-mcp')
        ? {id: 'mcp-read', type: 'mcpToolCall', server: 'fake-read-server', tool: 'read', arguments: {},
          status: 'completed', readOnlyHint: mode === 'native-mcp-read' ? true : null}
        : {id: 'shell-read', type: 'commandExecution',
          command: mode === 'native-startup' ? 'python3 memory/scripts/get_memory.py --summary' : 'cat unknown',
          commandActions: [], exitCode: mode === 'native-failure' ? 7 : 0};
      event('item/completed', {threadId: currentThread, turnId: currentTurn,
        item});
      finish(); return;
    }
    if (mode === 'child') {
      event('item/started', {threadId: currentThread, turnId: currentTurn, item: {
        id: 'spawn', type: 'collabAgentToolCall', tool: 'spawnAgent', receiverThreadIds: ['child'], agentsStates: {child: {status: 'running'}}}});
      event('turn/started', {threadId: 'child', turn: {id: 'child-turn'}});
      usage('child', 'child-turn', 8);
      event('item/completed', {threadId: 'child', turnId: 'child-turn', item: {id: 'child-tool', type: 'dynamicToolCall', success: false}});
      event('turn/completed', {threadId: 'child', turn: {id: 'child-turn', status: 'failed', error: {message: 'child failure'}}});
      finish(); return;
    }
    if (['fresh', 'absolute', 'unconfirmed-fresh'].includes(mode) && threads === 1) { tool('case_checkpoint', {at: 'checkpoint_accepted'}); return; }
    if (mode === 'ordinary-checkpoint') { tool('case_checkpoint', {at: 'ready'}); return; }
    if (mode === 'slow-callback') { tool('case_write', {text: 'delayed'}); return; }
    if (mode === 'absolute') { setTimeout(finish, 700); return; }
    if (mode === 'tools' || mode === 'duplicate' || mode === 'tool-budget') { tool('case_read', {path: 'input'}); return; }
    finish();
  };
  createInterface({input: process.stdin}).on('line', line => {
    const m = JSON.parse(line);
    if (!m.method) {
      if (replay) { pumpReplay(); return; }
      if (mode.startsWith('w25-')) {
        const id = 'exec-88a066f0-56ae-4e0d-aa4e-e9d120094bb6';
        event('item/completed', {threadId: currentThread, turnId: currentTurn,
          item: {type: 'dynamicToolCall', id, tool: 'case_checkpoint', success: true}});
        if (mode === 'w25-alias') hookPair('callback-alias');
        if (mode === 'w25-p06-budget') { usage(currentThread, currentTurn, 2000); return; }
        finish();
        if (mode === 'w25-late') { hookPair(id); hookPair(id); }
        return;
      }
      if (mode === 'child-fresh' && step++ === 0) { tool('case_checkpoint'); return; }
      if (['child-tools-collab', 'child-tools-source', 'child-control'].includes(mode)) {
        usage('child', 'child-turn', 8);
        event('turn/completed', {threadId: 'child', turn: {id: 'child-turn', status: 'completed'}});
        finish(); return;
      }
      if (mode === 'ordinary-checkpoint') { finish(); return; }
      if (mode === 'tools' || mode === 'tool-budget') {
        if (mode === 'tools') event('item/completed', {threadId: currentThread, turnId: currentTurn,
          item: {id: `item-${m.id}`, type: 'dynamicToolCall', tool: step === 0 ? 'case_read' : 'case_write', success: m.result.success}});
        step++;
        if (step === 1) tool('case_write', {text: 'retry-result'}); else finish();
      }
      return;
    }
    if (m.method === 'initialize') send({id: m.id, result: {userAgent: mode === 'actual-client-identity'
      ? 'tri_system_eval/0.160.0 (Mac OS 26.7.0; arm64) dumb (tri_system_eval; 1)'
      : mode === 'wrong-version' ? 'codex_cli_rs/9.9.9' : 'codex_cli_rs/0.0.0-offline'}});
    if (m.method === 'thread/start') {
      currentThread = `thread-${++threads}`;
      send({id: m.id, result: {thread: {id: currentThread}, model: mode === 'wrong-model' ? 'foreign' : m.params.model,
        modelProvider: 'offline-provider', reasoningEffort: 'high', approvalPolicy: 'never',
        ...(m.params.permissions && mode !== 'missing-profile' ? {activePermissionProfile: {
          id: mode === 'wrong-profile' ? 'other' : m.params.permissions,
          extends: mode === 'wrong-extends' ? ':workspace' : null}} : {}),
        sandbox: {type: mode === 'unsafe-profile' ? 'dangerFullAccess' : 'readOnly', networkAccess: false}, instructionSources: []}});
    }
    if (m.method === 'turn/start') {
      currentTurn = `turn-${threads}`;
      send({id: m.id, result: {turn: {id: currentTurn}}});
      event('turn/started', {threadId: currentThread, turn: {id: currentTurn}});
      if (mode === 'absolute' && threads === 1) setTimeout(startWork, 650); else startWork();
    }
    if (m.method === 'turn/interrupt') {
      send({id: m.id, result: {}});
      if (replay) { send(replayEvent(replay.events.find(row => row.source_line === 118))); return; }
      if (!['hang', 'unconfirmed-fresh'].includes(mode) && !(mode === 'child-hangs' && m.params.threadId === 'child')) event('turn/completed', {threadId: m.params.threadId,
        turn: {id: m.params.turnId, status: 'interrupted', error: null}});
    }
  });
}

if (process.argv[2] === '--fake-server') {
  fakeServer(process.argv[3], process.argv[4]);
} else {
  function bareFixture(t, mode = 'normal') {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'tri-driver-test-')));
    t.after(() => rmSync(root, {recursive: true, force: true}));
    const cases = join(root, 'cases.json'), source = join(root, 'source.json'), manifestPath = join(root, 'manifest.json');
    writeFileSync(cases, JSON.stringify({cases: [{id: 'example', complexity: 'simple', request: 'synthetic bounded task'}]}));
    writeFileSync(source, '{}');
    const instruction = 'Same synthetic owner; no fixture answers.';
    const materialSha256 = digest(JSON.stringify([{path: 'AGENTS.md', sha256: digest(instruction)}]));
    const manifest = {source_root: root, source_manifest: source,
      budgets: {simple: {wall_seconds: 2, observed_tokens: 100, tool_actions: 10}},
      runtime_release: {status: 'READY', stage: 'development', run_id: 'offline-run', run: {case_id: 'example', condition_id: 'T', trial: 1},
        bindings: {driver_sha256: digest(readFileSync(driverPath)), conditions_sha256: digest(readFileSync(filename)),
          case_protocol_sha256: digest(readFileSync(filename)), cases_sha256: digest(readFileSync(cases)),
          source_manifest_sha256: digest(readFileSync(source)), condition_material_sha256: materialSha256},
        model: {name: 'offline-test-model', effort: 'high'}, resources: {wall_seconds: 2, tool_actions: 10, observed_tokens: 100},
        entry: {transport: 'codex-app-server-stdio'}}};
    const state = {calls: [], failures: [], resumed: 0, finalized: false, registrations: []};
    let launches = 0;
    const definitions = ['case_read', 'case_write', 'case_checkpoint', 'case_question'].map(name => ({type: 'function', name,
      description: 'offline stub', inputSchema: {type: 'object'}}));
    const runner = createTrialRunner({cleanupGraceMs: 40, paths: {driver: driverPath, conditions: filename, protocol: filename},
      spawnProcess: (_command, _args, options) => {
        state.spawn = {command: _command, args: _args};
        launches++; return spawn(process.execPath, [filename, '--fake-server', mode, join(root, 'survived')], options);
      },
      loadModules: async () => ({TOOL_DEFINITIONS: definitions,
        materializeCondition: async ({conditionId, destination}) => {
          state.beforeMaterialize?.();
          mkdirSync(destination); writeFileSync(join(destination, 'AGENTS.md'), instruction);
          return {id: conditionId, root: destination, allowedReadPaths: ['AGENTS.md'], instructionFiles: ['AGENTS.md'], materialSha256};
        },
        createCaseRuntime: async ({caseRoot, evidenceRoot}) => {
          assert.deepEqual(readdirSync(evidenceRoot), []);
          assert.equal(evidenceRoot.endsWith('/case-engine'), true);
          // An existing artifact is deliberately not proof of a completed model turn.
          writeFileSync(join(caseRoot, 'partial.json'), '{}');
          state.afterRuntime?.();
          const family = new Map(), history = new Map();
          let rootThread = null;
          return {initialMessage: () => 'initial legal material', resumeMessage: () => {
            state.resumed++; family.clear(); rootThread = null; return 'current lawful checkpoint'; },
            registerThread: async ({threadId, parentThreadId}) => {
              if (history.has(threadId)) {
                assert.equal(family.has(threadId), true, 'old family cannot revive');
                assert.equal(history.get(threadId), parentThreadId, 'parent cannot change');
              } else if (parentThreadId === null) {
                assert.equal(rootThread, null, 'new root requires resume'); rootThread = threadId;
              } else assert.equal(family.has(parentThreadId), true, 'parent must already be registered');
              family.set(threadId, parentThreadId); history.set(threadId, parentThreadId);
              state.registrations.push({threadId, parentThreadId}); return {ok: true};
            },
            handleTool: async call => {
              assert.equal(family.has(call.threadId), true, 'driver must register before tool delivery');
              state.calls.push(call);
              if (call.threadId !== rootThread && ['case_checkpoint', 'case_question'].includes(call.name)) {
                return {text: 'child control refused', isError: true, control: null};
              }
              if (mode === 'slow-callback') return await new Promise(() => {});
              if (call.name === 'case_checkpoint') return {text: 'checkpoint stored', isError: false,
                control: {type: mode === 'ordinary-checkpoint' || mode.startsWith('w25-') || mode.startsWith('w31-') ? 'ready_for_final' : 'fresh_context'}};
              if (mode.startsWith('w31-') && call.name === 'case_read') return {text: 'offline fixture read', isError: false, control: null};
              if (call.name === 'case_read') { state.failures.push('original dependency failure'); return {text: state.failures[0], isError: true, control: null}; }
              return {text: 'write recorded', isError: false, control: null};
            },
            snapshot: () => structuredClone(state), finalize: async ({terminalMessage}) => { state.finalized = true; return {terminalMessage, failures: [...state.failures], ...state.finalizeResult}; }};
        }})});
    const save = () => writeFileSync(manifestPath, JSON.stringify(manifest));
    const options = {manifestPath, caseFile: cases, caseId: 'example', conditionId: 'T', trial: 1, outputRoot: join(root, 'out')};
    return {root, manifest, options, state, save, launches: () => launches, run: async () => { save(); return runner(options); }};
  }

  // Normal formal trials must have explicit proof. Only negative cases and
  // separately registered probes may use the bare fixture.
  function fixture(t, mode = 'normal') {
    return permissionFixture(t, mode);
  }

  // These registrations are confined to fixture-owned temporary paths and the
  // injected fake-server transport above. They never authorize a codex launch.
  function probeFixture(t, mode = 'normal') {
    const f = bareFixture(t, mode), release = f.manifest.runtime_release;
    release.stage = 'probe'; release.probe_id = 'offline-probe';
    const path = join(f.root, 'registration.json');
    const record = {schema_version: 1, kind: 'u007-capability-probe', status: 'REGISTERED',
      issued_by: 'root-coordinator', probe_id: release.probe_id, run_id: release.run_id,
      ...structuredClone(Object.fromEntries(['run', 'bindings', 'model', 'resources', 'entry'].map(k => [k, release[k]]))),
      case_file: {path: f.options.caseFile, sha256: release.bindings.cases_sha256},
      source_manifest: {path: f.manifest.source_manifest, sha256: release.bindings.source_manifest_sha256},
      assertions: [{id: 'fake-terminal', statement: 'Fake transport returns a completed turn and evidence.'}],
      stop_conditions: ['Stop on budget, permission or transport error; retain evidence.'],
      pool: 'additional-capability', capability_probe_limit: 6};
    const saveRegistration = () => {
      const bytes = JSON.stringify(record, null, 2) + '\n';
      writeFileSync(path, bytes); release.registration = {path, sha256: digest(bytes)};
    };
    saveRegistration();
    return {...f, record, saveRegistration};
  }

  function permissionFixture(t, mode = 'native-read', {proof = true, stage = 'development'} = {}) {
    const f = stage === 'probe' ? probeFixture(t, mode) : bareFixture(t, mode);
    const release = f.manifest.runtime_release;
    release.stage = stage;
    const conditionRoot = join(f.options.outputRoot, release.run_id, 'condition');
    const native = {profile_id: 'offline-command-profile', profile: {
      filesystem: {':root': 'deny', ':minimal': 'read', [conditionRoot]: 'read'}, network: {enabled: false}},
      runtime_read_roots: [], effective_probe: null};
    release.native_command_permissions = native;
    const artifact = join(f.root, 'fake-effective-transcript.json');
    writeFileSync(artifact, JSON.stringify({fake_transport_only: true, no_live_authority: true}));
    const evidence = {path: artifact, sha256: digest(readFileSync(artifact))};
    const record = {schema_version: 1, kind: 'u007-app-server-native-command-boundary', status: 'ACCEPTED',
      issued_by: 'root-coordinator', j_review: {decision: 'ACCEPTED', evidence},
      driver_sha256: release.bindings.driver_sha256, codex_version: '0.0.0-offline', codex_user_agent: 'codex_cli_rs/0.0.0-offline',
      condition_root: conditionRoot, profile: structuredClone(native.profile), runtime_read_roots: [],
      active_permission_profile: {id: native.profile_id, extends: null},
      effective_config: {default_permissions: native.profile_id, permissions: {[native.profile_id]: structuredClone(native.profile)}},
      checks: ['app_server_command', 'allowed_read', 'outside_read_denied', 'symlink_escape_denied', 'write_denied', 'child_inherits_denial']
        .map(id => ({id, passed: true, command: 'FAKE ONLY: bounded command', exit_code: 0, evidence})),
      unmeasured: ['MCP, hooks, image access, actual read bytes; fake transcript proves no live boundary.']};
    const savePermissions = () => {
      if (proof) {
        const path = join(f.root, 'fake-proof.json');
        writeFileSync(path, JSON.stringify(record)); native.effective_probe = {path, sha256: digest(readFileSync(path))};
      }
      if (f.record) { f.record.native_command_permissions = structuredClone(native); f.saveRegistration(); }
    };
    savePermissions();
    return {...f, native, proof: record, conditionRoot, savePermissions};
  }

  function runFakeCli(f, finalResult) {
    const bundle = join(f.root, 'cli-bundle'), bin = join(f.root, 'fake-bin');
    mkdirSync(bundle); mkdirSync(bin);
    const copy = join(bundle, 'driver.mjs'); writeFileSync(copy, readFileSync(driverPath));
    const conditions = join(bundle, 'conditions.mjs'), protocol = join(bundle, 'case-protocol.mjs');
    writeFileSync(conditions, `import {mkdirSync,writeFileSync} from 'node:fs';
      import {join} from 'node:path';
      export function materializeCondition({conditionId,destination}) {
        mkdirSync(destination); writeFileSync(join(destination,'AGENTS.md'),'Same synthetic owner; no fixture answers.');
        return {id:conditionId,root:destination,allowedReadPaths:['AGENTS.md'],instructionFiles:['AGENTS.md'],
          materialSha256:${JSON.stringify(f.manifest.runtime_release.bindings.condition_material_sha256)}};
      }`);
    writeFileSync(protocol, `const finalResult=${JSON.stringify(finalResult)};
      export const TOOL_DEFINITIONS=['case_read','case_write','case_checkpoint','case_question'].map(name=>
        ({type:'function',name,description:'fake only',inputSchema:{type:'object'}}));
      export function createCaseRuntime(){return {registerThread:()=>({ok:true}),initialMessage:()=> 'fake CLI task',
        snapshot:()=>finalResult,finalize:()=>finalResult};}`);
    // A fixture-owned executable handles the public CLI's "codex" command.
    // It imports only this file's fake-server branch; no real binary is invoked.
    const fakeCodex = join(bin, 'codex');
    writeFileSync(fakeCodex, `#!${process.execPath}\nprocess.argv=[process.execPath,${JSON.stringify(filename)},'--fake-server','normal'];\nimport(${JSON.stringify(import.meta.url)});\n`);
    chmodSync(fakeCodex, 0o700);
    f.manifest.runtime_release.bindings.conditions_sha256 = digest(readFileSync(conditions));
    f.manifest.runtime_release.bindings.case_protocol_sha256 = digest(readFileSync(protocol));
    f.save();
    return spawnSync(process.execPath, [copy, '--manifest', f.options.manifestPath, '--cases', f.options.caseFile,
      '--case', 'example', '--condition', 'T', '--trial', '1', '--out', f.options.outputRoot], {
      encoding: 'utf8', timeout: 10000, env: {...process.env, PATH: bin}});
  }

  const nativeLaunch = {allow_login_shell: false, shell_snapshot: false, experimental_raw_events: true};
  function replayFixture(t, mode) {
    assert.equal(digest(readFileSync(p07ReplayPath)), '58242ba647aeac8a49d565dfbaf7fd032e491200794a680d8ec468cb4ae7115c');
    const f = fixture(t, mode);
    f.manifest.budgets.simple.observed_tokens = 60000;
    f.manifest.runtime_release.resources.observed_tokens = 60000;
    return f;
  }
  for (const mode of ['w31-replay', 'w31-duplicate']) {
    test(`W31 ${mode} indexes P07 exit1 without authenticating or charging wrapper content`, async t => {
      const f = replayFixture(t, mode), r = await f.run();
      const frozen = JSON.parse(readFileSync(p07ReplayPath, 'utf8'));
      assert.equal(r.raw_tool_evidence?.length, 2);
      for (const entry of r.raw_tool_evidence) {
        assert.equal(entry.source, 'rawResponseItem/completed');
        assert.equal(entry.verification, 'WRAPPER_CONTENT_ONLY');
        assert.equal(entry.thread_id, 'thread-1'); assert.equal(entry.turn_id, 'turn-1');
        assert.deepEqual(entry.item, frozen.events.find(row => row.event.params?.item?.type === entry.item_type).event.params.item);
      }
      assert.equal(r.raw_reported_command_results.length, 1);
      const result = r.raw_reported_command_results[0];
      assert.equal(result.wrapper_call_id, frozen.expected.native_wrapper_call_id);
      assert.equal(result.output_index, 1); assert.equal(result.reported_chunk_id, '16cd62');
      assert.equal(result.reported_exit_code, 1);
      assert.match(result.reported_output, /PermissionError.*Operation not permitted/);
      assert.equal(result.verification, 'WRAPPER_REPORTED_NOT_AUTHENTICATED');
      assert.equal(r.visible_tool_actions, 2); assert.equal(r.tool_actions, null);
      assert.equal(r.tool_action_observability.unmapped_hook_calls[0].call_id, frozen.expected.unmapped_inner_hook_call_id);
      assert.equal(r.usage.observed_total_tokens, 61934);
      assert.equal(r.status, 'INVALID_RUN'); assert.ok(r.errors.some(e => e.message === 'OBSERVED_TOKEN_BUDGET'));
      assert.equal(r.interruptions[0].confirmed, true); assert.equal(r.turns.at(-1).status, 'interrupted');
      assert.equal(r.engine, null); assert.equal(r.candidate_tool_errors.length, 0);
      assert.equal(existsSync(join(f.root, 'out/offline-run/condition/case/output/probe-result.json')), false);
      assert.equal(r.tool_action_observability.whole_chain_coverage, 'UNKNOWN');
      assert.equal(r.tool_action_observability.formal_comparison_eligible, false);
    });
  }
  for (const mode of ['w31-foreign', 'w31-stale', 'w31-late']) {
    test(`W31 ${mode} cannot contaminate indexed raw evidence`, async t => {
      const r = await replayFixture(t, mode).run();
      assert.deepEqual(r.raw_tool_evidence, []); assert.deepEqual(r.raw_reported_command_results, []);
      assert.equal(r.status, 'INVALID_RUN');
      assert.ok(r.errors.some(e => /FOREIGN_RAW_TOOL_THREAD|STALE_RAW_TOOL_TURN/.test(e.message)));
    });
  }
  test('W31 conflicting repeated output cannot replace retained original evidence', async t => {
    const r = await replayFixture(t, 'w31-conflict').run();
    assert.equal(r.raw_reported_command_results?.length, 1);
    assert.equal(r.raw_reported_command_results[0].reported_exit_code, 1);
    assert.ok(r.errors.some(e => e.message === 'CONFLICTING_RAW_TOOL_EVIDENCE'));
    assert.equal(r.status, 'INVALID_RUN');
  });
  test('W31 fabricated JSON remains reported-only and cannot map an inner hook', async t => {
    const r = await replayFixture(t, 'w31-forged').run();
    assert.equal(r.raw_reported_command_results?.[0].reported_exit_code, 0);
    assert.equal(r.raw_reported_command_results[0].verification, 'WRAPPER_REPORTED_NOT_AUTHENTICATED');
    assert.equal(Object.hasOwn(r.raw_reported_command_results[0], 'call_id'), false);
    assert.equal(r.tool_action_observability.unmapped_hook_calls.length, 1);
    assert.equal(r.tool_action_observability.formal_comparison_eligible, false);
    assert.equal(r.tool_actions, null); assert.equal(r.visible_tool_actions, 2); assert.equal(r.status, 'INVALID_RUN');
  });
  test('W31 unstructured output remains intact without invented command result', async t => {
    const r = await replayFixture(t, 'w31-text').run();
    assert.equal(r.raw_tool_evidence?.at(-1).item.output, 'No structured result; exit status unavailable.');
    assert.deepEqual(r.raw_reported_command_results, []);
    assert.equal(r.status, 'INVALID_RUN');
  });
  const outbound = r => readFileSync(join(r.evidence_root, 'rpc.jsonl'), 'utf8').trim().split('\n')
    .map(JSON.parse).filter(e => e.direction === 'outbound').map(e => e.message);
  test('W28 absent native launch retains the R6 argv and thread defaults', async t => {
    const f = probeFixture(t), r = await f.run();
    assert.deepEqual(f.state.spawn.args, ['app-server', '--listen', 'stdio://', '--disable', 'apps']);
    assert.equal(Object.hasOwn(r.invocation, 'native_launch'), false);
    for (const m of outbound(r).filter(m => m.method === 'thread/start'))
      assert.equal(Object.hasOwn(m.params, 'experimentalRawEvents'), false);
    assert.equal(outbound(r).some(m => m.method === 'config/read'), false);
  });
  test('W28 exact launch applies only owned process flags and every fresh root request', async t => {
    const f = fixture(t, 'fresh'); f.manifest.runtime_release.entry.native_launch = {...nativeLaunch};
    const r = await f.run(); assert.equal(r.status, 'COMPLETED');
    const args = f.state.spawn.args;
    assert.deepEqual(args.slice(0, 9), ['app-server', '--listen', 'stdio://', '--disable', 'apps',
      '-c', 'allow_login_shell=false', '--disable', 'shell_snapshot']);
    assert.equal(args.filter(v => v === 'allow_login_shell=false').length, 1);
    const starts = outbound(r).filter(m => m.method === 'thread/start');
    assert.equal(starts.length, 2);
    for (const {params} of starts) {
      assert.equal(params.experimentalRawEvents, true);
      assert.equal(params.model, 'offline-test-model'); assert.equal(params.config.model_reasoning_effort, 'high');
      assert.deepEqual(params.config.permissions, {[f.native.profile_id]: f.native.profile});
      assert.equal(Object.hasOwn(params.config, 'allow_login_shell'), false);
    }
    assert.equal(outbound(r).some(m => m.method === 'config/read'), false);
    assert.deepEqual(r.invocation.native_launch.requested, nativeLaunch);
    assert.equal(r.invocation.native_launch.behavior_verified, false);
    assert.equal(r.tool_action_observability.whole_chain_coverage, 'UNKNOWN');
  });
  test('W28 malformed launch is rejected before any output directory or spawn', async t => {
    for (const value of [null, false, [], {}, {allow_login_shell: false, shell_snapshot: false},
      {...nativeLaunch, allow_login_shell: true}, {...nativeLaunch, shell_snapshot: true},
      {...nativeLaunch, experimental_raw_events: false}, {...nativeLaunch, allow_login_shell: 'false'},
      {...nativeLaunch, permission_override: 'danger-full-access'}]) {
      const f = fixture(t); f.manifest.runtime_release.entry.native_launch = value;
      await assert.rejects(f.run(), /INVALID_NATIVE_LAUNCH/);
      assert.equal(f.launches(), 0); assert.equal(existsSync(f.options.outputRoot), false);
    }
  });
  test('W28 launch is exactly bound to probe registration before side effects', async t => {
    const f = probeFixture(t); f.manifest.runtime_release.entry.native_launch = {...nativeLaunch};
    f.record.capability_probe_limit = 7; f.saveRegistration();
    await assert.rejects(f.run(), /PROBE_REGISTRATION_MISMATCH:entry/);
    assert.equal(f.launches(), 0); assert.equal(existsSync(f.options.outputRoot), false);
    f.record.entry.native_launch = {...nativeLaunch}; f.saveRegistration();
    const r = await f.run(); assert.equal(r.status, 'COMPLETED');
    assert.deepEqual(r.invocation.native_launch.requested, nativeLaunch);
    assert.equal(outbound(r).find(m => m.method === 'thread/start').params.experimentalRawEvents, true);
  });
  test('W28 registration cap is exactly seven for new launch and six for legacy launch', async t => {
    for (const enabled of [false, true]) {
      for (const cap of [0, 6, 7, 8, 100, '7', null]) {
        const f = probeFixture(t);
        if (enabled) f.manifest.runtime_release.entry.native_launch = {...nativeLaunch};
        f.record.entry = structuredClone(f.manifest.runtime_release.entry);
        f.record.capability_probe_limit = cap; f.saveRegistration();
        if (cap === (enabled ? 7 : 6)) {
          const r = await f.run(); assert.equal(r.status, 'COMPLETED');
        } else {
          await assert.rejects(f.run(), /PROBE_REGISTRATION_MISMATCH:capability_probe_limit/);
          assert.equal(f.launches(), 0); assert.equal(existsSync(f.options.outputRoot), false);
        }
      }
    }
  });
  test('W28 raw notification is retained without counting wrappers or clearing hooks and engine failure', async t => {
    const f = fixture(t, 'w25-p06-raw'); f.manifest.runtime_release.entry.native_launch = {...nativeLaunch};
    f.state.finalizeResult = {status: 'INVALID_RUN', failures: [{code: 'EIO', message: 'original error'}]};
    const r = await f.run();
    assert.equal(r.status, 'INVALID_RUN'); assert.equal(r.tool_actions, null); assert.equal(r.visible_tool_actions, 1);
    assert.equal(r.tool_action_observability.unmapped_hook_calls.length, 1);
    assert.equal(r.tool_action_observability.mapping_complete, false);
    assert.equal(r.tool_action_observability.formal_comparison_eligible, false);
    assert.equal(r.tool_action_observability.hard_limit_compliance, 'UNKNOWN');
    assert.deepEqual(r.engine.failures, f.state.finalizeResult.failures);
    const raw = readFileSync(join(r.evidence_root, 'rpc.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
      .filter(e => e.direction === 'inbound').map(e => JSON.parse(e.raw))
      .find(e => e.method === 'rawResponseItem/completed');
    assert.equal(raw.params.item.call_id, 'outer-wrapper');
    assert.equal(raw.params.item.arguments, 'FAKE RAW ONLY; not evidence of inner execution');
    assert.equal(r.native_tools.some(e => e.item.type === 'commandExecution'), false);
  });

  for (const mode of ['w25-p06', 'w25-p06-budget', 'w25-opaque']) {
    test(`W25 ${mode} keeps unmatched activity and invalidates comparison accounting`, async t => {
      const f = fixture(t, mode), r = await f.run();
      assert.equal(r.tool_actions, null);
      assert.equal(r.visible_tool_actions, 1);
      assert.equal(r.status, 'INVALID_RUN');
      const o = r.tool_action_observability;
      assert.equal(o.mapping_complete, false);
      assert.equal(o.whole_chain_coverage, 'UNKNOWN');
      assert.equal(o.hard_limit_compliance, 'UNKNOWN');
      assert.equal(o.formal_comparison_eligible, false);
      assert.equal(o.unmapped_hook_calls.length, 1);
      assert.ok(o.hook_events.some(e => e.source_path === '/fixture/hooks.json'));
      if (mode !== 'w25-opaque') {
        assert.equal(o.unmapped_hook_calls[0].call_id, 'exec-7b6a3da4-df07-44c5-9fe3-b30d991ab9d4');
        assert.equal(r.native_tools.some(e => e.item.type === 'commandExecution'), false);
      }
      if (mode === 'w25-p06-budget') {
        assert.ok(r.errors.some(e => e.message === 'OBSERVED_TOKEN_BUDGET'));
        assert.ok(r.interruptions.some(e => e.confirmed));
      }
    });
  }
  for (const mode of ['w25-mapped', 'w25-alias', 'w25-late', 'w25-native']) {
    test(`W25 ${mode} maps hooks without duplicate charges or premature gaps`, async t => {
      const r = await fixture(t, mode).run();
      assert.equal(r.status, 'COMPLETED');
      assert.equal(r.tool_actions, 1);
      assert.equal(r.visible_tool_actions, 1);
      assert.equal(r.tool_action_observability.mapping_complete, true);
      assert.deepEqual(r.tool_action_observability.unmapped_hook_calls, []);
      assert.equal(r.tool_action_observability.whole_chain_coverage, 'UNKNOWN');
      assert.equal(r.tool_action_observability.hard_limit_compliance, 'UNKNOWN');
    });
  }

  for (const stage of ['development', 'hidden']) {
    test(`W22 formal ${stage} missing entire permissions object rejects before spawn`, async t => {
      const f = fixture(t); f.manifest.runtime_release.stage = stage;
      delete f.manifest.runtime_release.native_command_permissions;
      await assert.rejects(f.run(), /NATIVE_EFFECTIVE_PROOF_REQUIRED/);
      assert.equal(f.launches(), 0);
    });
  }
  for (const invalid of [{status: 'INVALID_RUN'}, {status: 'RECORDED', invalid_run: true}]) {
    const identity = invalid.invalid_run ? 'invalid_run flag' : 'INVALID_RUN status';
    test(`W22 engine ${identity} propagates to top-level and preserves original failure`, async t => {
      const f = permissionFixture(t, 'normal');
      f.state.finalizeResult = {...invalid, failures: [{code: 'EACCES', message: 'original fixture I/O failure'}]};
      const r = await f.run();
      assert.equal(r.status, 'INVALID_RUN');
      assert.deepEqual(r.engine.failures, f.state.finalizeResult.failures);
      assert.deepEqual(JSON.parse(readFileSync(join(r.evidence_root, 'result.json'))).engine, r.engine);
    });
    test(`W22 public CLI exits nonzero for engine ${identity}`, t => {
      const f = permissionFixture(t, 'normal');
      const result = runFakeCli(f, {...invalid, failures: [{code: 'EIO', message: 'original fake engine failure'}]});
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      const summary = JSON.parse(result.stdout);
      assert.equal(summary.status, 'INVALID_RUN');
      const report = JSON.parse(readFileSync(join(summary.evidence_root, 'result.json')));
      assert.equal(report.engine.failures[0].code, 'EIO');
    });
  }
  test('W22 candidate tool and semantic failures remain recorded valid trials, not infrastructure INVALID', async t => {
    const finalResult = {status: 'RECORDED', invalid_run: false, protocol_complete: false,
      protocol_errors: [{code: 'INCOMPLETE_PROTOCOL'}], completion_claim_verified: false};
    const f = fixture(t, 'tools'); f.state.finalizeResult = finalResult;
    const report = await f.run();
    assert.equal(report.status, 'COMPLETED');
    assert.equal(report.candidate_tool_errors.length, 1);
    assert.equal(report.engine.failures[0], 'original dependency failure');
    assert.deepEqual(report.engine.protocol_errors, finalResult.protocol_errors);
    assert.equal(report.engine.completion_claim_verified, false);
    const g = fixture(t); const cli = runFakeCli(g, finalResult);
    assert.equal(cli.error, undefined); assert.equal(cli.status, 0, cli.stdout + cli.stderr);
    const summary = JSON.parse(cli.stdout);
    assert.equal(summary.status, 'COMPLETED');
    assert.equal(JSON.parse(readFileSync(join(summary.evidence_root, 'result.json'))).engine.protocol_complete, false);
  });

  test('BUILD_ONLY rejects before loading absent modules or spawning a model; CLI is nonzero', async t => {
    const f = fixture(t); f.manifest.runtime_release.status = 'BUILD_ONLY'; f.save();
    await assert.rejects(runTrial(f.options), /BUILD_ONLY/);
    const r = spawnSync(process.execPath, [driverPath, '--manifest', f.options.manifestPath, '--cases', f.options.caseFile,
      '--case', 'example', '--condition', 'T', '--trial', '1', '--out', f.options.outputRoot], {encoding: 'utf8'});
    assert.equal(r.status, 1); assert.match(r.stderr, /BUILD_ONLY/); assert.equal(f.launches(), 0);
  });
  test('valid turn preserves native base and records effective identity and cumulative usage once', async t => {
    const f = fixture(t); const r = await f.run();
    assert.equal(r.status, 'COMPLETED'); assert.equal(r.usage.observed_total_tokens, 15); assert.equal(r.usage.complete, true);
    assert.equal(r.engine_snapshot.finalized, true);
    const rpc = readFileSync(join(r.evidence_root, 'rpc.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const thread = rpc.find(e => e.message?.method === 'thread/start').message.params;
    assert.equal('baseInstructions' in thread, false); assert.equal('multiAgentMode' in thread, false);
    assert.equal(thread.dynamicTools.length, 4); assert.equal(r.threads[0].effective.model, 'offline-test-model');
    const input = rpc.find(e => e.message?.method === 'turn/start').message.params.input[0].text;
    assert.equal(input.includes('Same synthetic owner; no fixture answers.'), false);
    assert.match(input, /Condition instruction path/);
  });
  test('stale source identity, foreign run identity and excessive budget never dispatch', async t => {
    for (const change of [f => { f.manifest.runtime_release.bindings.driver_sha256 = '0'.repeat(64); },
      f => { f.manifest.runtime_release.run.case_id = 'foreign'; },
      f => { f.manifest.runtime_release.resources.wall_seconds = 3; }]) {
      const f = fixture(t); change(f); await assert.rejects(f.run(), /RELEASE_/); assert.equal(f.launches(), 0);
    }
  });
  test('material drift fails before model launch and preserves rejection evidence', async t => {
    const f = fixture(t); f.manifest.runtime_release.bindings.condition_material_sha256 = 'f'.repeat(64);
    const r = await f.run(); assert.equal(r.status, 'INVALID_RUN'); assert.equal(f.launches(), 0);
    assert.match(JSON.stringify(r.errors), /CONDITION_TREE_DRIFT/); assert.ok(existsSync(join(r.evidence_root, 'result.json')));
  });
  test('output symlink escape is rejected before writing run materials', async t => {
    const f = fixture(t); const outside = join(f.root, 'outside'); mkdirSync(outside); symlinkSync(outside, f.options.outputRoot);
    await assert.rejects(f.run(), /OUTPUT_ROOT_SYMLINK/); assert.equal(f.launches(), 0);
  });
  test('dynamic failure is returned as failure and retained after valid retry', async t => {
    const f = fixture(t, 'tools'); const r = await f.run();
    assert.equal(r.status, 'COMPLETED'); assert.equal(r.tool_actions, 2);
    assert.equal(r.candidate_tool_errors.length, 1); assert.deepEqual(r.engine.failures, ['original dependency failure']);
    assert.equal(r.engine_snapshot.calls[1].arguments.text, 'retry-result');
  });
  test('fresh recovery interrupts and observes terminal before a new thread, never ordinary checkpoint reopening', async t => {
    const f = fixture(t, 'fresh'); const r = await f.run();
    assert.equal(r.status, 'COMPLETED'); assert.equal(r.threads.length, 2); assert.equal(r.engine_snapshot.resumed, 1);
    assert.equal(r.interruptions[0].confirmed, true); assert.equal(r.interruptions[0].terminal.turn.status, 'interrupted');
    assert.equal(r.usage.complete, false); // no invented usage for interrupted first thread
    assert.equal(r.turns[0].status, 'interrupted');
  });
  test('duplicate dynamic call cannot cause a second write', async t => {
    const f = fixture(t, 'duplicate'); const r = await f.run();
    assert.equal(r.status, 'INVALID_RUN'); assert.match(JSON.stringify(r.errors), /DUPLICATE_TOOL_CALL/);
    assert.equal(r.engine_snapshot.calls.length, 1);
  });
  test('ordinary checkpoint stays in its thread; interrupt acknowledgement alone cannot authorize fresh resume', async t => {
    const f = fixture(t, 'ordinary-checkpoint'); const r = await f.run();
    assert.equal(r.status, 'COMPLETED'); assert.equal(r.threads.length, 1); assert.equal(r.interruptions.length, 0);
    const g = fixture(t, 'unconfirmed-fresh'); const bad = await g.run();
    assert.equal(bad.status, 'INVALID_RUN'); assert.equal(bad.threads.length, 1); assert.equal(bad.engine_snapshot.resumed, 0);
    assert.match(JSON.stringify(bad.errors), /FRESH_(FAMILY_)?INTERRUPT_UNCONFIRMED/);
  });
  test('foreign terminal, failed turn, wrong model and transport exit cannot become success', async t => {
    for (const mode of ['foreign', 'failed-turn', 'wrong-model', 'exit']) {
      const f = fixture(t, mode); const r = await f.run();
      assert.equal(r.status, 'INVALID_RUN', mode); assert.equal(r.engine_snapshot.finalized, false, mode);
      assert.ok(existsSync(join(r.evidence_root, 'stdout.log')));
      if (mode === 'exit') { assert.equal(r.transport_exit.code, 7); assert.match(readFileSync(join(r.evidence_root, 'stderr.log'), 'utf8'), /original transport failure/); }
    }
  });
  test('unknown native read scope is contamination, child failure and usage remain attributable', async t => {
    const f = probeFixture(t, 'native-read'); const r = await f.run();
    assert.equal(r.status, 'INVALID_RUN'); assert.ok(r.limitations.some(x => x.startsWith('UNKNOWN_NATIVE_READ_SCOPE')));
    const g = fixture(t, 'child'); const c = await g.run();
    assert.equal(c.status, 'INVALID_RUN'); assert.equal(c.usage.per_thread_cumulative.child.totalTokens, 8);
    assert.equal(c.usage.observed_total_tokens, 23); assert.ok(c.errors.some(e => e.failed_turn?.threadId === 'child'));
    assert.equal(c.tool_actions, 2);
  });
  test('successful B startup shell and read-only MCP hints cannot prove native access scope', async t => {
    for (const mode of ['native-startup', 'native-mcp-read', 'native-mcp-unknown']) {
      const f = probeFixture(t, mode);
      f.options.conditionId = 'B'; f.manifest.runtime_release.run.condition_id = 'B';
      f.record.run.condition_id = 'B'; f.saveRegistration();
      const r = await f.run(); assert.equal(r.status, 'INVALID_RUN');
      assert.ok(r.limitations.some(x => x.startsWith('UNKNOWN_NATIVE_READ_SCOPE')));
      assert.equal(r.native_tools.length, 1);
      assert.equal(r.errors.some(x => x.message?.startsWith('UNVERIFIED_EXTERNAL_OR_WRITE_TOOL')), mode === 'native-mcp-unknown');
    }
  });
  test('missing usage stays unknown; action and token budgets stop the chain', async t => {
    const f = fixture(t, 'missing-usage'); const r = await f.run();
    assert.equal(r.usage.observed_total_tokens, null); assert.equal(r.usage.complete, false);
    const g = fixture(t, 'tool-budget'); g.manifest.runtime_release.resources.tool_actions = 1;
    const a = await g.run(); assert.match(JSON.stringify(a.errors), /TOOL_ACTION_BUDGET/); assert.equal(a.engine_snapshot.calls.length, 1);
    const h = fixture(t); h.manifest.runtime_release.resources.observed_tokens = 12;
    const b = await h.run(); assert.equal(b.status, 'INVALID_RUN'); assert.match(JSON.stringify(b.errors), /OBSERVED_TOKEN_BUDGET/);
  });
  test('absolute deadline spans fresh threads instead of resetting per RPC', async t => {
    const f = fixture(t, 'absolute'); f.manifest.runtime_release.resources.wall_seconds = 1;
    const r = await f.run(); assert.equal(r.status, 'INVALID_RUN'); assert.match(JSON.stringify(r.errors), /ABSOLUTE_DEADLINE/);
    assert.ok(r.elapsed_ms < 1500); assert.equal(r.engine_snapshot.resumed, 1);
  });
  test('timeout keeps original evidence and kills TERM-resistant descendants after leader exits', async t => {
    const f = fixture(t, 'hang'); f.manifest.runtime_release.resources.wall_seconds = 1;
    const r = await f.run();
    assert.equal(r.status, 'INVALID_RUN'); assert.match(JSON.stringify(r.errors), /ABSOLUTE_DEADLINE/);
    assert.equal(r.engine_snapshot.finalized, false); assert.ok(existsSync(join(r.condition.root, 'case', 'partial.json')));
    assert.equal(r.interruptions[0].confirmed, false); assert.ok(r.unfinished_turns.length);
    assert.equal(r.transport_exit.code, 0); assert.ok(r.cleanup.some(x => x.signal === 'SIGKILL' && x.sent));
    assert.match(readFileSync(join(r.evidence_root, 'stderr.log'), 'utf8'), /original failure/);
    await delay(1100); assert.equal(existsSync(join(f.root, 'survived')), false);
    assert.ok(existsSync(join(r.evidence_root, 'result.json')));
  });
  test('run directory cannot be reused to overwrite prior evidence', async t => {
    const f = fixture(t); await f.run(); await assert.rejects(f.run(), /EEXIST/); assert.equal(f.launches(), 1);
  });
  test('deadline does not hide a case callback that has not returned', async t => {
    const f = fixture(t, 'slow-callback'); f.manifest.runtime_release.resources.wall_seconds = 1;
    const r = await f.run(); assert.equal(r.status, 'INVALID_RUN');
    assert.equal(r.client_operations[0].status, 'pending');
    assert.match(JSON.stringify(r.errors), /UNFINISHED_CASE_CALLBACK/);
  });
  test('release stage is validated and preserved; probe cannot be inferred from READY', async t => {
    const f = fixture(t); delete f.manifest.runtime_release.stage;
    await assert.rejects(f.run(), /INVALID_RELEASE_STAGE/); assert.equal(f.launches(), 0);
    const g = fixture(t); g.manifest.runtime_release.stage = 'probe';
    await assert.rejects(g.run(), /PROBE_ID_REQUIRED/);
    g.manifest.runtime_release.probe_id = 'probe-registered-elsewhere';
    await assert.rejects(g.run(), /PROBE_REGISTRATION_REQUIRED/); assert.equal(g.launches(), 0);
    const h = fixture(t); h.manifest.runtime_release.stage = 'hidden';
    const r = await h.run(); assert.equal(r.stage, 'hidden'); assert.equal(r.status, 'COMPLETED');
  });
  test('registered probe uses fake transport, ignores object key order and preserves exact registration bytes', async t => {
    const f = probeFixture(t);
    for (const key of ['run', 'bindings', 'model', 'resources', 'entry']) {
      f.record[key] = Object.fromEntries(Object.entries(f.record[key]).reverse());
    }
    f.saveRegistration();
    const r = await f.run();
    assert.equal(r.status, 'COMPLETED'); assert.equal(r.stage, 'probe'); assert.equal(f.launches(), 1);
    assert.equal(r.probe_registration.sha256, f.manifest.runtime_release.registration.sha256);
    assert.deepEqual(readFileSync(r.probe_registration.copy_path), readFileSync(f.manifest.runtime_release.registration.path));
    assert.equal(digest(readFileSync(r.probe_registration.copy_path)), r.probe_registration.sha256);
    assert.match(r.probe_registration.authority, /not cryptographic identity authentication or behavior PASS/);
    await assert.rejects(f.run(), /EEXIST/); assert.equal(f.launches(), 1);
  });
  test('probe rejects missing, non-file, symlink and raw hash drift before transport dispatch', async t => {
    for (const change of [
      f => { delete f.manifest.runtime_release.registration; },
      f => { f.manifest.runtime_release.registration.path = 'relative.json'; },
      f => { f.manifest.runtime_release.registration.path = join(f.root, 'missing.json'); },
      f => { f.manifest.runtime_release.registration.path = f.root; },
      f => { const p = join(f.root, 'link.json'); symlinkSync(f.manifest.runtime_release.registration.path, p); f.manifest.runtime_release.registration.path = p; },
      f => { writeFileSync(f.manifest.runtime_release.registration.path, '{}'); },
    ]) {
      const f = probeFixture(t); change(f);
      await assert.rejects(f.run(), /PROBE_REGISTRATION_|ENOENT/); assert.equal(f.launches(), 0);
    }
  });
  test('probe rejects fixed-field, identity, path, binding, assertion and stop-condition mismatch before dispatch', async t => {
    const changes = [
      ...['schema_version', 'kind', 'status', 'issued_by', 'pool', 'capability_probe_limit', 'probe_id', 'run_id']
        .map(key => f => { f.record[key] = 'wrong'; }),
      f => { f.record.run.case_id = 'another-case'; },
      f => { f.record.run.condition_id = 'B'; },
      f => { f.record.run.trial = 2; },
      f => { f.record.model.name = 'wrong-model'; },
      f => { f.record.model.effort = 'low'; },
      f => { f.record.bindings.driver_sha256 = '0'.repeat(64); },
      f => { delete f.record.bindings.cases_sha256; },
      f => { f.record.bindings.extra = f.manifest.runtime_release.bindings.extra = '0'.repeat(64); },
      f => { f.record.entry.transport = 'other'; },
      f => { f.record.resources.wall_seconds++; },
      ...['case_file', 'source_manifest'].flatMap(key => [
        f => { f.record[key].path = 'relative.json'; },
        f => { const p = join(f.root, `other-${key}.json`); writeFileSync(p, readFileSync(f.record[key].path)); f.record[key].path = p; },
        f => { f.record[key].sha256 = '0'.repeat(64); },
      ]),
      f => { f.record.assertions = []; },
      f => { f.record.assertions[0].id = ' '; },
      f => { f.record.assertions[0].statement = ''; },
      f => { f.record.assertions.push({...f.record.assertions[0], statement: 'different statement'}); },
      f => { f.record.assertions.push({...f.record.assertions[0], id: 'different-id'}); },
      f => { f.record.stop_conditions = []; },
      f => { f.record.stop_conditions = ['']; },
    ];
    for (const change of changes) {
      const f = probeFixture(t); change(f); f.saveRegistration();
      await assert.rejects(f.run(), /PROBE_REGISTRATION_/); assert.equal(f.launches(), 0);
    }
  });
  test('probe registration cannot raise complexity caps or drift while material is prepared', async t => {
    const f = probeFixture(t);
    f.record.resources.wall_seconds = ++f.manifest.runtime_release.resources.wall_seconds; f.saveRegistration();
    await assert.rejects(f.run(), /RELEASE_BUDGET_REQUIRED_OR_EXCEEDED/); assert.equal(f.launches(), 0);
    const g = probeFixture(t);
    g.state.beforeMaterialize = () => { writeFileSync(g.manifest.runtime_release.registration.path, '{}'); };
    const r = await g.run(); assert.equal(r.status, 'INVALID_RUN'); assert.equal(g.launches(), 0);
    assert.match(JSON.stringify(r.errors), /PROBE_REGISTRATION_HASH_DRIFT/);
    assert.equal(digest(readFileSync(r.probe_registration.copy_path)), r.probe_registration.sha256);
  });
  test('accepted fake boundary permits commands while read consumption remains UNKNOWN and config agrees at both surfaces', async t => {
    const f = permissionFixture(t); const r = await f.run();
    assert.equal(r.status, 'COMPLETED');
    assert.equal(r.native_command_permissions.boundary_status, 'BOUND_TO_ACCEPTED_PROBE');
    assert.equal(r.native_command_permissions.actual_read_scope, 'UNKNOWN');
    assert.ok(r.limitations.some(s => s.startsWith('UNKNOWN_NATIVE_READ_SCOPE')));
    const messages = readFileSync(join(r.evidence_root, 'rpc.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
      .filter(e => e.direction === 'outbound').map(e => e.message);
    const start = messages.find(m => m.method === 'thread/start').params;
    const turn = messages.find(m => m.method === 'turn/start').params;
    assert.equal(start.permissions, f.native.profile_id); assert.equal(turn.permissions, f.native.profile_id);
    assert.equal(Object.hasOwn(start, 'sandbox'), false); assert.equal(Object.hasOwn(turn, 'sandboxPolicy'), false);
    assert.deepEqual(start.config.permissions, {[f.native.profile_id]: f.native.profile});
    assert.equal(start.config.default_permissions, f.native.profile_id);
    assert.deepEqual(r.invocation.permission_config.permissions, start.config.permissions);
    assert.ok(f.state.spawn.args.includes(`default_permissions="${f.native.profile_id}"`));
    const profileArg = f.state.spawn.args.find(a => a.startsWith(`permissions.${f.native.profile_id}=`));
    assert.ok(profileArg.includes(`${JSON.stringify(f.conditionRoot)}="read"`));
    assert.ok(profileArg.includes('"network"={"enabled"=false}'));
    assert.equal(start.config.permissions[f.native.profile_id].filesystem[':root'], 'deny');
    for (const e of r.native_command_permissions.evidence) assert.equal(digest(readFileSync(e.path)), e.sha256);
  });
  test('no effective proof permits only registered probe evidence and never formal completion', async t => {
    for (const stage of ['development', 'hidden']) {
      const f = permissionFixture(t, 'normal', {proof: false, stage});
      await assert.rejects(f.run(), /NATIVE_EFFECTIVE_PROOF_REQUIRED/); assert.equal(f.launches(), 0);
    }
    const f = permissionFixture(t, 'native-startup', {proof: false, stage: 'probe'});
    const r = await f.run(); assert.equal(f.launches(), 1); assert.equal(r.status, 'INVALID_RUN');
    assert.equal(r.native_command_permissions.boundary_status, 'NATIVE_BOUNDARY_UNVERIFIED');
    assert.ok(r.native_tools.some(t => t.item.command.includes('get_memory.py')));
    assert.ok(r.limitations.includes('NATIVE_BOUNDARY_UNVERIFIED'));
    const g = permissionFixture(t, 'normal', {proof: false, stage: 'probe'});
    g.record.native_command_permissions.profile.network.enabled = true; g.saveRegistration();
    await assert.rejects(g.run(), /PROBE_REGISTRATION_MISMATCH:native_command_permissions/); assert.equal(g.launches(), 0);
  });
  test('actual initialize client-name prefix accepts matching version and still rejects a changed version', async t => {
    for (const version of ['0.160.0', '9.9.9']) {
      const f = permissionFixture(t, 'actual-client-identity');
      f.proof.codex_version = version;
      f.proof.codex_user_agent = 'tri_system_eval/0.160.0 (Mac OS 26.7.0; arm64) dumb (tri_system_eval; 1)';
      f.savePermissions();
      const result = await f.run();
      assert.equal(result.status, version === '0.160.0' ? 'COMPLETED' : 'INVALID_RUN');
      if (version !== '0.160.0') assert.match(JSON.stringify(result.errors), /NATIVE_CODEX_VERSION_MISMATCH/);
    }
  });
  test('permission profile rejects extensions, writes, broad roots, mismatched sets and noncanonical or symlink paths before dispatch', async t => {
    const changes = [
      f => { f.native.profile.extends = ':workspace'; },
      f => { f.native.profile.network.extra = false; },
      f => { f.native.profile.network.enabled = true; },
      f => { f.native.profile.filesystem[':root'] = 'read'; },
      f => { f.native.profile.filesystem[f.conditionRoot] = 'write'; },
      f => { f.native.profile.filesystem['/'] = 'read'; },
      f => { delete f.native.profile.filesystem[f.conditionRoot]; },
      f => { f.native.profile_id = 'x.y'; },
      f => { f.native.runtime_read_roots = ['/']; f.native.profile.filesystem['/'] = 'read'; },
      f => { f.native.runtime_read_roots = [f.root]; f.native.profile.filesystem[f.root] = 'read'; },
      f => { f.native.runtime_read_roots = [f.root + '/missing']; },
      f => { f.native.runtime_read_roots = [f.root + '/.']; },
      f => { const link = join(f.root, 'runtime-link'); symlinkSync(f.root, link); f.native.runtime_read_roots = [link]; },
      f => { f.native.runtime_read_roots = [f.root, f.root]; },
    ];
    for (const change of changes) {
      const f = permissionFixture(t, 'normal', {proof: false, stage: 'probe'}); change(f); f.savePermissions();
      const r = await f.run(); assert.equal(r.status, 'INVALID_RUN'); assert.equal(f.launches(), 0);
      assert.match(JSON.stringify(r.errors), /NATIVE_|ENOENT/);
    }
  });
  test('effective proof structure, acceptance, source hashes and bindings fail closed', async t => {
    for (const change of [
      f => { f.proof.kind = 'native-cli-filesystem-boundary'; },
      f => { f.proof.j_review.decision = 'PENDING'; },
      f => { f.proof.driver_sha256 = '0'.repeat(64); },
      f => { f.proof.profile.filesystem['/'] = 'read'; },
      f => { f.proof.runtime_read_roots = ['/']; },
      f => { f.proof.condition_root = '/'; },
      f => { f.proof.effective_config.default_permissions = 'other'; },
      f => { f.proof.active_permission_profile.extends = ':workspace'; },
      f => { f.proof.checks.pop(); },
      f => { f.proof.checks[0].passed = false; },
      f => { f.proof.checks[0].evidence.sha256 = '0'.repeat(64); },
      f => { f.proof.unmeasured = []; },
    ]) {
      const f = permissionFixture(t, 'normal'); change(f); f.savePermissions();
      const r = await f.run(); assert.equal(r.status, 'INVALID_RUN'); assert.equal(f.launches(), 0);
      assert.match(JSON.stringify(r.errors), /NATIVE_PROOF_/);
    }
    const f = permissionFixture(t); writeFileSync(f.native.effective_probe.path, '{}');
    const r = await f.run(); assert.equal(f.launches(), 0); assert.match(JSON.stringify(r.errors), /NATIVE_PROOF_DRIFT/);
  });
  test('missing or mismatched effective identity, inherited profile, unsafe response and Codex version reject', async t => {
    for (const mode of ['wrong-profile', 'wrong-extends', 'missing-profile', 'unsafe-profile', 'wrong-version']) {
      const f = permissionFixture(t, mode); const r = await f.run(); assert.equal(r.status, 'INVALID_RUN');
      assert.match(JSON.stringify(r.errors), /NATIVE_EFFECTIVE_PROFILE_MISMATCH|EFFECTIVE_MODEL_OR_SAFETY_MISMATCH|NATIVE_CODEX_VERSION_MISMATCH/);
    }
  });
  test('command proof does not certify MCP or image reads and preserves native failures', async t => {
    for (const mode of ['native-mcp-read', 'native-mcp-unknown', 'native-image']) {
      const f = permissionFixture(t, mode); const r = await f.run();
      assert.equal(r.status, 'INVALID_RUN'); assert.ok(r.limitations.some(x => x.startsWith('UNKNOWN_NATIVE_READ_SCOPE')));
    }
    const f = permissionFixture(t, 'native-failure'); const r = await f.run();
    assert.ok(r.errors.some(e => e.native_tool_failure?.exitCode === 7));
    assert.ok(r.native_tools.some(e => e.item.exitCode === 7));
  });
  test('same-shaped proof projects only the exclusive condition root; fresh RPCs retain identical permissions', async t => {
    const f = permissionFixture(t, 'fresh');
    const old = join(f.root, 'previous-exclusive-condition');
    f.proof.condition_root = old;
    delete f.proof.profile.filesystem[f.conditionRoot]; f.proof.profile.filesystem[old] = 'read';
    f.proof.effective_config.permissions[f.native.profile_id] = structuredClone(f.proof.profile);
    f.savePermissions();
    const r = await f.run(); assert.equal(r.status, 'COMPLETED');
    assert.equal(r.native_command_permissions.effective_responses.length, 2);
    const rpc = readFileSync(join(r.evidence_root, 'rpc.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const starts = rpc.filter(e => e.direction === 'outbound' && ['thread/start', 'turn/start'].includes(e.message.method));
    assert.equal(starts.length, 4);
    assert.ok(starts.every(e => e.message.params.permissions === f.native.profile_id));
  });
  test('runtime directories allow exact read grants and reject symlink drift immediately before dispatch', async t => {
    for (const drift of [false, true]) {
      const f = permissionFixture(t, 'normal', {proof: false, stage: 'probe'});
      const parent = realpathSync(mkdtempSync(join(tmpdir(), 'native-runtime-only-')));
      t.after(() => rmSync(parent, {recursive: true, force: true}));
      const runtimeRoot = join(parent, 'versioned-runtime'); mkdirSync(runtimeRoot);
      f.native.runtime_read_roots = [runtimeRoot]; f.native.profile.filesystem[runtimeRoot] = 'read';
      f.savePermissions();
      if (drift) f.state.afterRuntime = () => { rmSync(runtimeRoot, {recursive: true}); symlinkSync(f.root, runtimeRoot); };
      const r = await f.run(); assert.equal(r.status, 'INVALID_RUN');
      assert.equal(f.launches(), drift ? 0 : 1);
      if (drift) assert.match(JSON.stringify(r.errors), /NATIVE_PERMISSION_PATH/);
      else assert.equal(r.native_command_permissions.boundary_status, 'NATIVE_BOUNDARY_UNVERIFIED');
    }
  });
  test('native collab and thread-source evidence register children before their tools', async t => {
    for (const mode of ['child-tools-collab', 'child-tools-source']) {
      const f = fixture(t, mode); const r = await f.run(); assert.equal(r.status, 'COMPLETED');
      assert.deepEqual(r.engine_snapshot.registrations, [{threadId: 'thread-1', parentThreadId: null}, {threadId: 'child', parentThreadId: 'thread-1'}]);
      assert.equal(r.engine_snapshot.calls[0].threadId, 'child');
      assert.equal(r.thread_registrations[1].status, 'registered');
    }
  });
  test('child control denial remains a candidate error and does not request fresh', async t => {
    const f = fixture(t, 'child-control'); const r = await f.run();
    assert.equal(r.status, 'COMPLETED'); assert.equal(r.engine_snapshot.resumed, 0);
    assert.equal(r.candidate_tool_errors[0].thread_id, 'child'); assert.match(r.candidate_tool_errors[0].text, /refused/);
  });
  test('unknown child, fake parent and parent rebind cannot be laundered into the root', async t => {
    for (const mode of ['unknown-child', 'unknown-parent', 'rebind']) {
      const f = fixture(t, mode); const r = await f.run(); assert.equal(r.status, 'INVALID_RUN');
      assert.equal(r.engine_snapshot.calls.length, 0);
    }
  });
  test('fresh confirms all active family terminals, re-registers root and excludes old family', async t => {
    const f = fixture(t, 'child-fresh'); const r = await f.run();
    assert.equal(r.status, 'COMPLETED'); assert.equal(r.interruptions.length, 2);
    assert.deepEqual(r.engine_snapshot.failures, ['original dependency failure']);
    assert.ok(r.interruptions.every(x => x.confirmed)); assert.equal(r.engine_snapshot.registrations.at(-1).threadId, 'thread-2');
    const g = fixture(t, 'child-hangs'); const pending = await g.run();
    assert.equal(pending.status, 'INVALID_RUN'); assert.equal(pending.engine_snapshot.resumed, 0);
    const h = fixture(t, 'old-family'); const stale = await h.run();
    assert.equal(stale.status, 'INVALID_RUN'); assert.equal(stale.engine_snapshot.calls.length, 1);
    assert.match(JSON.stringify(stale.errors), /FOREIGN_OR_OLD_TOOL_THREAD/);
  });
}
