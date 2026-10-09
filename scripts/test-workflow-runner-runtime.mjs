#!/usr/bin/env node
// Runtime regression for the app-server-backed Codex workflow adapter. All model calls are fake;
// the runner still executes its real JSON-RPC, route, activation, evidence and sandbox paths.
import {spawn, spawnSync} from 'node:child_process';
import {chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {modelRoutingPolicyDigest} from './model-route.mjs';
import {acceptInvocationEvidence, beginCriticalPreparation, bindInvocationExternalIdentity, prepareInvocation, readActivation, releaseDigestForPolicy, startActivation, stateFileForTest} from './model-route-host.mjs';
import {prepareProjectSwitch, readProjectState} from '../.claude/hooks/lib/project-substrate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUNNER = join(ROOT, '.codex', 'workflow-runner.mjs');
const WF_DIR = join(ROOT, '.claude', 'workflows');
let pass = 0, fail = 0;
const ok = (name, condition, extra = '') => {
  condition ? (process.stdout.write(`PASS ${name}\n`), pass++)
    : (process.stdout.write(`FAIL ${name}${extra ? ` — ${extra}` : ''}\n`), fail++);
};
const parse = value => { try { return JSON.parse(value); } catch { return null; } };

const sandbox = mkdtempSync(join(tmpdir(), 'wf-app-server-test.'));
const binDir = join(sandbox, 'bin');
mkdirSync(binDir);
const codexHome = join(sandbox, 'codex-home');
mkdirSync(codexHome);
writeFileSync(join(codexHome, 'config.toml'), '', {mode: 0o600});
const stateRoot = join(sandbox, 'state');
const policyPath = join(sandbox, 'policy.json');
const bindingsPath = join(sandbox, 'bindings.json');

const policy = {
  version: 2, status: 'active', scope: 'common',
  roles: {anchor: 'root-effective-selection', peak: 'user-approved-higher-selection', light: 'user-approved-lower-selection'},
  scenes: {
    'MR-001': {trigger: 'normal', role: 'anchor', critical: false},
    'MR-004': {trigger: 'terminal-review', role: 'peak', critical: true},
    'MR-008': {trigger: 'mechanical', role: 'light', critical: false},
  },
  dispatch: {
    native_agent_types: {},
    workflows: {'__rt_probe': {P: 'MR-001', Verify: 'MR-004', Light: 'MR-008'}},
  },
  critical_failure: 'refuse-no-fallback',
  evidence: 'trusted-runtime-adoption-and-same-invocation-success',
  effort: 'user-owned-not-a-routing-input',
};
writeFileSync(policyPath, `${JSON.stringify({model_routing: policy}, null, 2)}\n`, {mode: 0o600});
writeFileSync(bindingsPath, `${JSON.stringify({
  schema_version: 1,
  harnesses: {codex: {
    peak_model: 'gpt-6-astra', light_model: 'gpt-5.6-luna',
    approved_order: ['gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-6-astra'],
  }},
}, null, 2)}\n`, {mode: 0o600});
const releaseDigest = releaseDigestForPolicy(modelRoutingPolicyDigest(policy));

const fakeCodex = join(binDir, 'codex');
writeFileSync(fakeCodex, `#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const {spawn} = require('child_process');
const mode = process.env.FAKE_MODE || 'normal';
const dump = process.env.FAKE_DUMP || '';
const record = [];
function send(value) { process.stdout.write(JSON.stringify(value) + '\\n'); }
function save() { if (dump) fs.writeFileSync(dump, JSON.stringify({argv:process.argv.slice(2),record}, null, 2)); }
process.on('exit', save);
if (process.env.FAKE_STARTS) fs.appendFileSync(process.env.FAKE_STARTS, String(process.pid) + '\\n');
if (mode === 'exit') { process.stderr.write('Invalid schema for response_format'); process.exit(1); }
if (mode === 'hang') {
  spawn('sh',['-c','sleep 8; echo alive > "' + (process.env.FAKE_MARKER || '/tmp/no-marker') + '"'],{stdio:'ignore'});
  setInterval(()=>{},1000);
} else {
  let threadId = 'thread-' + process.pid, turnId = 'turn-' + process.pid;
  readline.createInterface({input:process.stdin}).on('line', line => {
    let msg; try { msg=JSON.parse(line); } catch { process.exit(2); }
    record.push(msg); save();
    if (msg.method === 'initialize') return send({id:msg.id,result:{userAgent:'fake-app-server'}});
    if (msg.method === 'initialized') return;
    if (msg.method === 'thread/start') {
      if (!['read-only','workspace-write','danger-full-access'].includes(msg.params.sandbox)) {
        return send({id:msg.id,error:{code:-32602,message:'Invalid thread/start SandboxMode'}});
      }
      const adopted = mode === 'wrong-model' ? 'gpt-5.6-luna' : msg.params.model;
      return send({id:msg.id,result:{model:adopted,modelProvider:'openai',approvalPolicy:'never',
        sandbox:{type:msg.params.sandbox},thread:{id:threadId,model:adopted}}});
    }
    if (msg.method === 'turn/start') {
      send({id:msg.id,result:{turn:{id:turnId,status:'inProgress',items:[],error:null}}});
      if (mode === 'hold') {
        spawn('sh',['-c','sleep 4; echo alive > "' + (process.env.FAKE_MARKER || '/tmp/no-marker') + '"'],{stdio:'ignore'});
        if (process.env.FAKE_READY) fs.writeFileSync(process.env.FAKE_READY, 'ready\\n');
        return;
      }
      if (mode === 'reroute') send({method:'model/rerouted',params:{from:msg.params.model,to:'other'}});
      if (mode === 'huge') send({method:'test/large',params:{blob:'X'.repeat(2*1024*1024)}});
      let result = {ok:true,who:'fake'};
      if (mode === 'schema') {
        const disc=msg.params.outputSchema.properties.sources.items.properties.discovery;
        const typeOk=disc.type==='string'||(Array.isArray(disc.type)&&disc.type.includes('string'));
        result={schema_discovery_type_ok:typeOk,sources:[{id:'s1',discovery:JSON.stringify({method:'gh-search',queries:['a','b']})}]};
      }
      if (process.env.FAKE_RESPONSE) result=JSON.parse(process.env.FAKE_RESPONSE);
      send({method:'item/completed',params:{threadId,turnId,item:{id:'a1',type:'agentMessage',text:JSON.stringify(result)}}});
      const failed = mode === 'failed-turn';
      if (mode === 'busy-evidence') fs.writeFileSync(process.env.FAKE_STATE_FILE + '.lock', 'occupied\\n', {mode:0o600});
      send({method:'turn/completed',params:{threadId,turn:{id:turnId,status:failed?'failed':'completed',error:failed?{message:'failed'}:null}}});
      if (mode === 'busy-evidence') setTimeout(()=>process.exit(0),100);
    }
  });
}
`, {mode: 0o755});
chmodSync(fakeCodex, 0o755);

let sequence = 0;
function runWF(scriptBody, extraEnv = {}, anchor = 'gpt-5.6-sol', options = {}) {
  const name = '__rt_probe';
  const workflow = join(WF_DIR, `${name}.js`);
  writeFileSync(workflow, scriptBody);
  const rootSessionId = options.rootSessionId || `runner-test-${process.pid}-${++sequence}`;
  if (!options.rootSessionId) startActivation({
    harness: 'codex', root_session_id: rootSessionId,
    root_anchor: {model: anchor, source: 'test-root-session'},
    release_digest: releaseDigest, state_root: stateRoot,
  });
  const result = spawnSync('node', [RUNNER, name], {
    cwd: ROOT, encoding: 'utf8', timeout: 120000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      CODEX_HOME: codexHome,
      PATH: `${binDir}:${process.env.PATH}`,
      LUCA_MODEL_ROUTE_POLICY_PATH: policyPath,
      LUCA_MODEL_ROUTE_BINDINGS_PATH: bindingsPath,
      LUCA_MODEL_ROUTE_STATE_ROOT: stateRoot,
      LUCA_MODEL_ROUTE_ROOT_SESSION_ID: rootSessionId,
      FAKE_STATE_FILE: stateFileForTest({harness: 'codex', root_session_id: rootSessionId, state_root: stateRoot}),
      ...extraEnv,
    },
  });
  rmSync(workflow, {force: true});
  return {
    ...result,
    rootSessionId,
    state: options.skipStateRead ? null : readActivation({harness: 'codex', root_session_id: rootSessionId, state_root: stateRoot}),
  };
}

function startWF(scriptBody, extraEnv = {}, anchor = 'gpt-5.6-sol') {
  const name = '__rt_probe';
  const workflow = join(WF_DIR, `${name}.js`);
  writeFileSync(workflow, scriptBody);
  const rootSessionId = `runner-test-${process.pid}-${++sequence}`;
  startActivation({
    harness: 'codex', root_session_id: rootSessionId,
    root_anchor: {model: anchor, source: 'test-root-session'},
    release_digest: releaseDigest, state_root: stateRoot,
  });
  const child = spawn('node', [RUNNER, name], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      CODEX_HOME: codexHome,
      PATH: `${binDir}:${process.env.PATH}`,
      LUCA_MODEL_ROUTE_POLICY_PATH: policyPath,
      LUCA_MODEL_ROUTE_BINDINGS_PATH: bindingsPath,
      LUCA_MODEL_ROUTE_STATE_ROOT: stateRoot,
      LUCA_MODEL_ROUTE_ROOT_SESSION_ID: rootSessionId,
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {child, workflow, rootSessionId};
}

async function waitFor(predicate, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise(resolveWait => setTimeout(resolveWait, 25));
  }
  throw new Error('timed out waiting for runtime fixture');
}

function nativeTicket(critical, bound = true) {
  const rootSessionId = `native-runner-test-${process.pid}-${++sequence}`;
  const base = {harness: 'codex', root_session_id: rootSessionId, state_root: stateRoot};
  const activation = startActivation({...base, root_anchor: {model: 'gpt-5.6-sol', source: 'test-native-root'},
    release_digest: releaseDigest});
  const taskId = `native-task-${sequence}`;
  const reservation = critical ? beginCriticalPreparation({...base, expected_activation_id: activation.activation_id,
    expected_root_generation: activation.root_generation, critical: true, task_id: taskId, evidence_ref: 'test://native-prepare',
    route_harness: 'codex-native'}) : null;
  const prepared = prepareInvocation({...base, release_digest: releaseDigest, task_id: taskId, input_sha: releaseDigest,
    ...(reservation ? {preparation_id: reservation.preparation_id} : {}),
    route: {disposition: 'READY', harness: 'codex-native', requested_role: critical ? 'peak' : 'anchor',
      requested_model: critical ? 'gpt-6-astra' : 'gpt-5.6-sol', critical,
      policy_sha: modelRoutingPolicyDigest(policy), routing_config_sha: releaseDigest, capability_evidence_sha: releaseDigest}});
  if (prepared.disposition !== 'READY') throw new Error(`native fixture prepare failed: ${prepared.reason}`);
  if (bound) {
    for (const [field, value] of [['tool_use_id', `native-tool-${sequence}`],
      ['agent_type', critical ? 'quality-gate' : 'explorer'], ['agent_id', `native-agent-${sequence}`]]) {
      const result = bindInvocationExternalIdentity({...base, invocation_id: prepared.envelope.invocation_id, field, value});
      if (result.disposition !== 'BOUND') throw new Error(`native fixture bind failed: ${result.reason}`);
    }
  }
  return {rootSessionId, base, envelope: prepared.envelope, evidence: {...prepared.envelope,
    adopted_model: prepared.envelope.requested_model, status: 'completed', same_invocation_success: true,
    rerouted: false, fallback: false, evidence_ref: 'test://native-completion'}};
}

try {
  {
    const dump = join(sandbox, 'g1.json');
    const result = runWF("phase('P'); const x=await agent('hi',{label:'g1',schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok']}}); return {x}",
      {FAKE_DUMP: dump});
    const output = parse(result.stdout);
    const calls = parse(readFileSync(dump, 'utf8'))?.record || [];
    const thread = calls.find(call => call.method === 'thread/start');
    const turn = calls.find(call => call.method === 'turn/start');
    ok('G1 app-server path returns structured output', output?.x?.ok === true, String(result.stderr).slice(-200));
    ok('G1b anchor model is explicit and adopted', thread?.params?.model === 'gpt-5.6-sol');
    ok('G1c effort is absent from thread and turn requests', !('effort' in (thread?.params || {})) && !('effort' in (turn?.params || {})));
    ok('G1d accepted evidence is persisted', Object.values(result.state?.invocations || {}).some(call => call.status === 'accepted'));
  }

  {
    const result = runWF(`phase('P'); const s={type:'object',properties:{a:{type:'string'}},required:['a']}; s.properties.self=s;
let threw=false,val='unset'; try{val=await agent('hi',{label:'cycle',schema:s})}catch{threw=true} return {threw,val}`);
    const output = parse(result.stdout);
    ok('G2 cyclic schema does not throw', output?.threw === false && output?.val === null, JSON.stringify(output));
  }
  {
    const result = runWF(`phase('P'); let threw=false; try{await agent('hi',{schema:{type:'object',properties:{n:{type:'number',const:1n}},required:['n']}})}catch{threw=true} return {threw}`);
    ok('G2b BigInt schema does not throw', parse(result.stdout)?.threw === false);
  }

  {
    const result = runWF("phase('P'); const x=await agent('hi'); return {x}", {FAKE_MODE: 'exit'});
    ok('G3 app-server exit returns null without crashing workflow', parse(result.stdout)?.x === null);
    ok('G3b transport failure is visible', /APP_SERVER_(EXIT|RPC)|Invalid schema/.test(String(result.stderr)), String(result.stderr).slice(-220));
    ok('G3c noncritical transport failure does not latch', result.state?.critical_failure === false);
  }

  {
    const started = Date.now();
    const result = runWF("phase('P'); const x=await agent('hi'); return {x}", {FAKE_MODE: 'huge', LUCA_WF_AGENT_TIMEOUT_MS: '15000'});
    ok('G4 large app-server notification does not block', parse(result.stdout)?.x?.ok === true && Date.now() - started < 12000);
  }

  {
    const marker = join(sandbox, 'grandchild-alive.txt');
    const result = runWF("phase('P'); const x=await agent('hi'); return {x}",
      {FAKE_MODE: 'hang', FAKE_MARKER: marker, LUCA_WF_AGENT_TIMEOUT_MS: '2000'});
    ok('G5 timeout returns null and runner exits normally', parse(result.stdout)?.x === null);
    spawnSync('sleep', ['9']);
    ok('G5b timeout kills the process group', !existsSync(marker), existsSync(marker) ? 'grandchild survived' : '');
  }

  {
    const result = runWF(`phase('P'); const x=await agent('hi',{schema:{type:'object',properties:{
schema_discovery_type_ok:{type:'boolean'},sources:{type:'array',items:{type:'object',properties:{id:{type:'string'},discovery:{type:'object'}},required:['id','discovery']}}
},required:['sources']}}); return {x}`, {FAKE_MODE: 'schema'});
    const output = parse(result.stdout);
    ok('G6 freeform object is converted before app-server', output?.x?.schema_discovery_type_ok === true);
    ok('G6b freeform response is revived', output?.x?.sources?.[0]?.discovery?.method === 'gh-search');
  }

  for (const bad of ['0', '-1', 'abc']) {
    const result = runWF("phase('P'); const xs=await parallel([1,2,3].map(i=>()=>agent('p'+i))); return {ran:xs.filter(Boolean).length}",
      {LUCA_WF_CONCURRENCY: bad});
    ok(`G7 concurrency ${bad} cannot silently skip work`, parse(result.stdout)?.ran === 3);
  }

  {
    const result = runWF([
      "export const meta={name:'__rt_probe'}", "phase('P')", 'const sample=`',
      'export const fromTemplate=1', '`',
      'return {kept:sample.includes("export const fromTemplate"),metaOk:typeof meta==="object"}',
    ].join('\n'));
    const output = parse(result.stdout);
    ok('G8 template-string export text is preserved', output?.kept === true);
    ok('G8b real top-level export is stripped', output?.metaOk === true);
  }

  {
    const dump = join(sandbox, 'isolation.json');
    const result = runWF("phase('P'); const x=await agent('hi'); return {x}", {FAKE_DUMP: dump});
    const calls = parse(readFileSync(dump, 'utf8'))?.record || [];
    const thread = calls.find(call => call.method === 'thread/start')?.params || {};
    const turn = calls.find(call => call.method === 'turn/start')?.params || {};
    ok('I1 thread cwd is scratch, never repository root', /agent-cwd/.test(thread.cwd || '') && thread.cwd !== ROOT);
    ok('I1b thread/start uses the protocol SandboxMode enum', thread.sandbox === 'workspace-write');
    ok('I2 turn sandbox writes only scratch', turn.sandboxPolicy?.type === 'workspaceWrite'
      && turn.sandboxPolicy?.writableRoots?.length === 1 && /agent-cwd/.test(turn.sandboxPolicy.writableRoots[0]));
    ok('I3 network is explicit for workspace-write', turn.sandboxPolicy?.networkAccess === true);
    ok('I4 approval is never and provider fallback is disabled', thread.approvalPolicy === 'never' && thread.allowProviderModelFallback === false);
    ok('I5 runner completed under isolated contract', result.status === 0);
  }

  {
    const lightDump = join(sandbox, 'light.json');
    runWF("phase('Light'); const x=await agent('hi'); return {x}", {FAKE_DUMP: lightDump});
    const lightCalls = parse(readFileSync(lightDump, 'utf8'))?.record || [];
    ok('R1 light scene selects approved lower model', lightCalls.find(call => call.method === 'thread/start')?.params?.model === 'gpt-5.6-luna');
  }
  {
    const peakDump = join(sandbox, 'peak.json');
    runWF("phase('Verify'); const x=await agent('hi'); return {x}", {FAKE_DUMP: peakDump});
    const peakCalls = parse(readFileSync(peakDump, 'utf8'))?.record || [];
    ok('R2 critical review selects approved peak model', peakCalls.find(call => call.method === 'thread/start')?.params?.model === 'gpt-6-astra');
  }

  {
    const stalePolicyPath = join(sandbox, 'stale-policy.json');
    const stalePolicy = structuredClone(policy);
    stalePolicy.scenes['MR-004'].trigger = 'changed-terminal-review';
    writeFileSync(stalePolicyPath, JSON.stringify({model_routing: stalePolicy}), {mode: 0o600});
    const cases = [
      {name: 'unknown model relation', anchor: 'gpt-6-sol', diagnostic: /UNKNOWN_MODEL_RELATION/},
      {name: 'missing bindings', env: {LUCA_MODEL_ROUTE_BINDINGS_PATH: join(sandbox, 'missing-bindings.json')}, diagnostic: /ENOENT/},
      {name: 'missing activation', env: {LUCA_MODEL_ROUTE_ROOT_SESSION_ID: 'not-activated'}, diagnostic: /ACTIVATION_MISSING/},
      {name: 'unprepared release mismatch', env: {LUCA_MODEL_ROUTE_POLICY_PATH: stalePolicyPath}, diagnostic: /RELEASE_MISMATCH/},
    ];
    for (const fixture of cases) {
      const starts = join(sandbox, `pre-dispatch-${fixture.name.replaceAll(' ', '-')}.txt`);
      const result = runWF("phase('Verify'); const x=await agent('hi'); phase('P'); const y=await agent('later'); return {x:x||{ok:true,fallback:true},y}",
        {...fixture.env, FAKE_STARTS: starts}, fixture.anchor);
      ok(`R4 critical pre-dispatch ${fixture.name} blocks fallback output`,
        result.status !== 0 && String(result.stdout).trim() === '', `${result.status}: ${result.stdout}`);
      ok(`R4b critical pre-dispatch ${fixture.name} keeps diagnostic`, fixture.diagnostic.test(String(result.stderr)),
        String(result.stderr).slice(-400));
      ok(`R4c critical pre-dispatch ${fixture.name} stops later agent dispatch`, !existsSync(starts));
    }
  }

  {
    const result = runWF("phase('P'); const x=await agent('Verify critical terminal review'); return x||{ok:true,fallback:true}",
      {LUCA_MODEL_ROUTE_BINDINGS_PATH: join(sandbox, 'missing-noncritical-bindings.json')});
    ok('R5 canonical noncritical pre-dispatch failure preserves null/fallback',
      result.status === 0 && parse(result.stdout)?.fallback === true && result.state?.critical_failure === false);
  }
  for (const fixture of [
    {name: 'unknown phase', body: "phase('unregistered'); return await agent('hi')||{ok:true,fallback:true}"},
    {name: 'unreadable policy', body: "phase('P'); return await agent('hi')||{ok:true,fallback:true}",
      env: {LUCA_MODEL_ROUTE_POLICY_PATH: join(sandbox, 'missing-policy.yaml')}},
  ]) {
    const result = runWF(fixture.body, fixture.env);
    ok(`R6 unclassified ${fixture.name} refuses fallback output`, result.status !== 0 && String(result.stdout).trim() === '');
  }

  {
    const queuedMarker = join(sandbox, 'critical-queued-thunk');
    const starts = join(sandbox, 'critical-queue-starts.txt');
    const result = runWF(`phase('Verify'); const xs=await parallel([
()=>agent('critical'),
async()=>{const fs=await import('node:fs');fs.writeFileSync(${JSON.stringify(queuedMarker)},'ran');return agent('later',{phase:'P'})}
]); return {xs:xs.map(x=>x||{ok:true,fallback:true})}`,
      {FAKE_MODE: 'wrong-model', FAKE_STARTS: starts, LUCA_WF_CONCURRENCY: '1'});
    ok('R7 critical evidence failure stops queued workflow thunk', !existsSync(queuedMarker));
    ok('R7b critical evidence failure starts only the first agent', readFileSync(starts, 'utf8').trim().split('\n').length === 1);
    ok('R7c critical queue failure blocks fallback output', result.status !== 0 && String(result.stdout).trim() === '');
  }

  {
    const first = runWF("phase('Verify'); return await agent('critical')||{ok:true,fallback:true}", {}, 'gpt-6-sol');
    ok('R8 critical preparation failure persists activation latch', first.status === 1 && first.state?.critical_failure === true);
    const native = prepareInvocation({
      harness: 'codex', root_session_id: first.rootSessionId, release_digest: releaseDigest,
      route: {disposition: 'READY', harness: 'codex-native', requested_role: 'anchor', requested_model: 'gpt-6-sol',
        critical: false, policy_sha: modelRoutingPolicyDigest(policy), routing_config_sha: releaseDigest,
        capability_evidence_sha: releaseDigest},
      task_id: 'native-after-preparation-failure', input_sha: releaseDigest, state_root: stateRoot,
    });
    ok('R8b persisted critical preparation failure blocks native prepare', native.reason === 'CRITICAL_FAILURE_LATCHED');
    const second = runWF("phase('P'); return await agent('later')||{ok:true,fallback:true}", {}, undefined,
      {rootSessionId: first.rootSessionId});
    ok('R8c same activation second runner refuses credible output', second.status === 1 && String(second.stdout).trim() === '');
    const marker = join(sandbox, 'latched-entry-thunk');
    const noAgent = runWF(`const xs=await parallel([async()=>{const fs=await import('node:fs');fs.writeFileSync(${JSON.stringify(marker)},'ran');return {ok:true}}]);return {xs}`, {}, undefined,
      {rootSessionId: first.rootSessionId});
    ok('R8d latched entry refuses no-agent thunk before workflow effects', noAgent.status === 1
      && String(noAgent.stdout).trim() === '' && !existsSync(marker));
  }

  {
    const result = runWF("phase('Verify'); return await agent('critical')||{ok:true,fallback:true}", {FAKE_MODE: 'busy-evidence'});
    ok('R9 evidence state lock failure settles runner with exit 1', result.status === 1 && String(result.stdout).trim() === '',
      `${result.status}: ${String(result.stderr).slice(-600)}`);
    ok('R9b evidence I/O failure reports unpersisted critical latch',
      /MODEL_ROUTE_EVIDENCE_IO_FAILED.*MODEL_ROUTE_STATE_BUSY/.test(String(result.stderr))
        && /MODEL_ROUTE_CRITICAL_FAILURE_NOT_PERSISTED.*MODEL_ROUTE_STATE_BUSY/.test(String(result.stderr)));
    ok('R9c blocked evidence does not claim activation latch persisted', result.state?.critical_failure === false
      && Object.values(result.state?.invocations || {}).some(call => call.status === 'pending'));
    rmSync(`${stateFileForTest({harness: 'codex', root_session_id: result.rootSessionId, state_root: stateRoot})}.lock`);
    const second = runWF("phase('P'); return await agent('later')||{ok:true,fallback:true}", {}, undefined,
      {rootSessionId: result.rootSessionId});
    ok('R9d unresolved critical ticket blocks second runner after lock is cleared',
      second.status === 1 && String(second.stdout).trim() === ''
        && /MODEL_ROUTE_UNRESOLVED_CRITICAL_INVOCATION/.test(String(second.stderr)));
    ok('R9e unresolved-ticket refusal does not claim persistence succeeded', second.state?.critical_failure === false);
  }

  {
    const result = runWF("phase('Verify'); const xs=await parallel([1,2,3].map(i=>()=>agent('review-'+i))); return {ran:xs.filter(Boolean).length}");
    ok('R10 current runner critical agents retain normal parallel dispatch', result.status === 0 && parse(result.stdout)?.ran === 3);
    ok('R10b parallel critical evidence is accepted independently',
      Object.values(result.state?.invocations || {}).filter(call => call.critical && call.status === 'accepted').length === 3);
  }

  {
    const fifo = join(sandbox, 'reserved-bindings.fifo');
    const made = spawnSync('mkfifo', [fifo], {encoding: 'utf8'});
    if (made.status !== 0) throw new Error(`cannot create binding fixture FIFO: ${made.stderr}`);
    const started = startWF("phase('Verify'); return await agent('critical')||{ok:true,fallback:true}",
      {LUCA_MODEL_ROUTE_BINDINGS_PATH: fifo}, 'gpt-6-sol');
    let stdout = '', stderr = '';
    started.child.stdout.on('data', data => { stdout += String(data); });
    started.child.stderr.on('data', data => { stderr += String(data); });
    const closed = new Promise(resolveExit => started.child.on('close', code => resolveExit(code)));
    const stateFile = stateFileForTest({harness: 'codex', root_session_id: started.rootSessionId, state_root: stateRoot});
    let reserved = false;
    try {
      await waitFor(() => Object.values(readActivation({harness: 'codex', root_session_id: started.rootSessionId,
        state_root: stateRoot})?.preparations || {}).some(ticket => ticket.status === 'pending'));
      reserved = true;
    } catch { }
    ok('R11 critical preparation is durable before binding read', reserved);
    writeFileSync(`${stateFile}.lock`, 'occupied\n', {mode: 0o600});
    writeFileSync(fifo, readFileSync(bindingsPath, 'utf8'));
    const status = await closed;
    rmSync(started.workflow, {force: true});
    const state = readActivation({harness: 'codex', root_session_id: started.rootSessionId, state_root: stateRoot});
    ok('R11b unknown relation with failed latch keeps durable preparation intent', status === 1 && stdout.trim() === ''
      && state?.critical_failure === false && Object.values(state?.preparations || {}).some(ticket => ticket.status === 'pending')
      && /UNKNOWN_MODEL_RELATION/.test(stderr) && /CRITICAL_FAILURE_NOT_PERSISTED.*MODEL_ROUTE_STATE_BUSY/.test(stderr));
    rmSync(`${stateFile}.lock`);
    const second = runWF("phase('P'); return await agent('later')||{ok:true,fallback:true}", {}, undefined,
      {rootSessionId: started.rootSessionId});
    ok('R11c pending preparation blocks next runner after write lock clears', second.status === 1
      && String(second.stdout).trim() === '' && /UNRESOLVED_CRITICAL_PREPARATION/.test(String(second.stderr)));
    const native = prepareInvocation({harness: 'codex', root_session_id: started.rootSessionId, release_digest: releaseDigest,
      route: {disposition: 'READY', harness: 'codex-native', requested_role: 'anchor', requested_model: 'gpt-6-sol',
        critical: false, policy_sha: modelRoutingPolicyDigest(policy), routing_config_sha: releaseDigest, capability_evidence_sha: releaseDigest},
      task_id: 'native-after-reserved-failure', input_sha: releaseDigest, state_root: stateRoot});
    ok('R11d pending preparation blocks native prepare', native.reason === 'UNRESOLVED_CRITICAL_PREPARATION');
  }

  {
    const rootSessionId = `reserve-busy-${process.pid}`;
    startActivation({harness: 'codex', root_session_id: rootSessionId,
      root_anchor: {model: 'gpt-5.6-sol', source: 'test-root-session'}, release_digest: releaseDigest, state_root: stateRoot});
    const stateFile = stateFileForTest({harness: 'codex', root_session_id: rootSessionId, state_root: stateRoot});
    const starts = join(sandbox, 'reserve-busy-starts');
    writeFileSync(`${stateFile}.lock`, 'occupied\n', {mode: 0o600});
    const first = runWF("phase('Verify'); return await agent('critical')||{ok:true,fallback:true}",
      {LUCA_MODEL_ROUTE_BINDINGS_PATH: join(sandbox, 'never-read-bindings.json'), FAKE_STARTS: starts}, undefined, {rootSessionId});
    ok('R12 unavailable reservation refuses binding/resolver/model work', first.status === 1 && String(first.stdout).trim() === ''
      && !/ENOENT|UNKNOWN_MODEL_RELATION/.test(String(first.stderr)) && /MODEL_ROUTE_STATE_BUSY/.test(String(first.stderr)) && !existsSync(starts));
    ok('R12b refused reservation creates neither failure nor intent', first.state?.critical_failure === false
      && Object.values(first.state?.preparations || {}).length === 0);
    rmSync(`${stateFile}.lock`);
    const second = runWF("phase('P'); return await agent('ordinary')", {}, undefined, {rootSessionId});
    ok('R12c ordinary work can start after reservation lock clears', second.status === 0 && parse(second.stdout)?.ok === true);
  }

  {
    const fifo = join(sandbox, 'ordinary-bindings.fifo');
    const made = spawnSync('mkfifo', [fifo], {encoding: 'utf8'});
    if (made.status !== 0) throw new Error(`cannot create ordinary binding fixture FIFO: ${made.stderr}`);
    const started = startWF("phase('P'); return await agent('ordinary')||{ok:true,fallback:true}", {LUCA_MODEL_ROUTE_BINDINGS_PATH: fifo});
    let stdout = '', stderr = '';
    started.child.stdout.on('data', data => { stdout += String(data); });
    started.child.stderr.on('data', data => { stderr += String(data); });
    const closed = new Promise(resolveExit => started.child.on('close', code => resolveExit(code)));
    await waitFor(() => /model-route phase=P/.test(stderr));
    const state = readActivation({harness: 'codex', root_session_id: started.rootSessionId, state_root: stateRoot});
    beginCriticalPreparation({harness: 'codex', root_session_id: started.rootSessionId, state_root: stateRoot,
      expected_activation_id: state.activation_id, expected_root_generation: state.root_generation,
      critical: true, task_id: 'concurrent-critical-preparation', evidence_ref: 'test://concurrent-preparation'});
    writeFileSync(fifo, readFileSync(bindingsPath, 'utf8'));
    const status = await closed;
    rmSync(started.workflow, {force: true});
    const after = readActivation({harness: 'codex', root_session_id: started.rootSessionId, state_root: stateRoot});
    ok('R13 concurrent unresolved preparation blocks noncritical fallback', status === 1 && stdout.trim() === ''
      && /UNRESOLVED_CRITICAL_PREPARATION/.test(stderr));
    ok('R13b noncritical pending-intent refusal does not write failure latch', after?.critical_failure === false);
  }

  {
    const rootSessionId = `malformed-preparations-${process.pid}`;
    const state = startActivation({harness: 'codex', root_session_id: rootSessionId,
      root_anchor: {model: 'gpt-5.6-sol', source: 'test-root-session'}, release_digest: releaseDigest, state_root: stateRoot});
    state.preparations = [];
    writeFileSync(stateFileForTest({harness: 'codex', root_session_id: rootSessionId, state_root: stateRoot}), JSON.stringify(state));
    const marker = join(sandbox, 'malformed-entry-thunk');
    const result = runWF(`const fs=await import('node:fs');fs.writeFileSync(${JSON.stringify(marker)},'ran');return {ok:true}`, {}, undefined,
      {rootSessionId, skipStateRead: true});
    ok('R14 malformed preparations refuse entry before workflow effects', result.status === 1 && String(result.stdout).trim() === ''
      && /MODEL_ROUTE_INVALID_ACTIVATION/.test(String(result.stderr)) && !existsSync(marker));
  }

  {
    const native = nativeTicket(true);
    const stateFile = stateFileForTest(native.base);
    writeFileSync(`${stateFile}.lock`, 'occupied\n', {mode: 0o600});
    let completionBusy = false;
    try { acceptInvocationEvidence({...native.base, evidence: native.evidence}); }
    catch (error) { completionBusy = /MODEL_ROUTE_STATE_BUSY/.test(error.message); }
    const pending = readActivation(native.base);
    ok('R15 native completion lock failure retains bound critical ticket', completionBusy && pending.critical_failure === false
      && pending.invocations[native.envelope.invocation_id].status === 'pending'
      && Boolean(pending.invocations[native.envelope.invocation_id].external_identity?.agent_id));
    rmSync(`${stateFile}.lock`);
    const marker = join(sandbox, 'native-pending-thunk');
    const blocked = runWF(`const xs=await parallel([async()=>{const fs=await import('node:fs');fs.writeFileSync(${JSON.stringify(marker)},'ran');return {ok:true}}]);return {xs}`, {}, undefined,
      {rootSessionId: native.rootSessionId});
    ok('R15b unresolved native critical completion blocks no-agent runner effects', blocked.status === 1
      && String(blocked.stdout).trim() === '' && !existsSync(marker) && /UNRESOLVED_CRITICAL_INVOCATION/.test(String(blocked.stderr)),
      `${blocked.status}: ${blocked.stdout}`);
    ok('R15c native pending-ticket refusal does not claim failure latch persisted', blocked.state?.critical_failure === false);
    const accepted = acceptInvocationEvidence({...native.base, evidence: native.evidence});
    ok('R15d native critical completion can close normally after lock clears', accepted.disposition === 'ACCEPT');
    const closedMarker = join(sandbox, 'native-closed-thunk');
    const allowed = runWF(`const fs=await import('node:fs');fs.writeFileSync(${JSON.stringify(closedMarker)},'ran');return {ok:true}`, {}, undefined,
      {rootSessionId: native.rootSessionId});
    ok('R15e closed critical native evidence allows runner effects', allowed.status === 0 && parse(allowed.stdout)?.ok === true
      && existsSync(closedMarker));
  }

  {
    const native = nativeTicket(false);
    const allowed = runWF('return {ok:true}', {}, undefined, {rootSessionId: native.rootSessionId});
    ok('R16 pending noncritical native work does not block runner entry', allowed.status === 0 && parse(allowed.stdout)?.ok === true);
  }

  {
    const native = nativeTicket(true, false);
    const blocked = runWF('return {ok:true}', {}, undefined, {rootSessionId: native.rootSessionId});
    ok('R17 unbound critical native ticket also blocks runner entry', blocked.status === 1 && String(blocked.stdout).trim() === ''
      && /UNRESOLVED_CRITICAL_INVOCATION/.test(String(blocked.stderr)));
  }

  {
    const dispatchRoot = join(sandbox, 'dispatch-root');
    const dispatchGstack = join(dispatchRoot, 'gstack');
    const dispatchProjects = join(dispatchRoot, 'projects');
    const workAPath = join(dispatchProjects, 'alpha');
    const workBPath = join(dispatchProjects, 'beta');
    mkdirSync(join(dispatchGstack, '.claude'), {recursive: true});
    mkdirSync(workAPath, {recursive: true});
    mkdirSync(workBPath, {recursive: true});
    const workA = realpathSync(workAPath);
    const workB = realpathSync(workBPath);
    writeFileSync(join(workA, 'CONTEXT.md'), '# alpha\n');
    writeFileSync(join(workB, 'CONTEXT.md'), '# beta\n');
    const aStat = statSync(workA);
    const sid = 'runner-frozen-work-root';
    const nativeId = 'fixture-native-a08';
    const eventHash = createHash('sha256');
    for (const value of ['luca-native-event:v1:claude', sid, nativeId]) {
      const bytes = Buffer.from(value);
      eventHash.update(Buffer.from(`${bytes.length}:`));
      eventHash.update(bytes);
    }
    const transcript = join(dispatchRoot, 'fixture-transcript.jsonl');
    writeFileSync(transcript, '');
    const transcriptStat = statSync(transcript);
    const cursor = {schema_version: 1, harness: 'claude', transcript_path: transcript,
      dev: String(transcriptStat.dev), ino: String(transcriptStat.ino), byte_offset: 0, record_index: 0,
      prefix_sha256: createHash('sha256').update('').digest('hex')};
    const event = {event_id: `claude:${eventHash.digest('hex')}`, boundary_id: 'fixture-boundary-a08', native_id: nativeId,
      anchor_id: null, cwd: dispatchGstack, harness: 'claude', status: 'active', attested_at: '2026-09-25T00:00:00Z'};
    writeFileSync(join(dispatchGstack, '.claude', `.session-project-${sid}`), `${JSON.stringify({
      schema_version: 3, state: 'TURN_ACTIVE', session_id: sid,
      binding: {project: 'alpha', realpath: workA, dev: Number(aStat.dev), ino: Number(aStat.ino), epoch: 1},
      turn: {event_id: event.event_id, boundary_id: event.boundary_id, epoch: 1},
      event_control: {candidates: [], current: event, cursor,
        consumed_events: [{event_id: event.event_id, boundary_id: event.boundary_id,
          harness: event.harness, native_id: event.native_id, anchor_id: null}]},
    })}\n`);
    const dump = join(sandbox, 'cancel-dispatch.json');
    const ready = join(sandbox, 'cancel-ready');
    const marker = join(sandbox, 'cancel-grandchild-alive');
    const started = startWF("phase('P'); const out=await parallel([1,2,3].map(i=>()=>agent('task-'+i))); return {out}", {
      FAKE_MODE: 'hold', FAKE_DUMP: dump, FAKE_READY: ready, FAKE_MARKER: marker,
      LUCA_WF_CONCURRENCY: '1', LUCA_WF_AGENT_TIMEOUT_MS: '30000', LUCA_WF_WORK_ROOT: workA,
    });
    let stdout = '', stderr = '';
    started.child.stdout.on('data', data => { stdout += String(data); });
    started.child.stderr.on('data', data => { stderr += String(data); });
    await waitFor(() => existsSync(ready) && existsSync(dump));
    const proposal = prepareProjectSwitch({gstackRoot: dispatchGstack, projectsRoot: dispatchProjects,
      sessionId: sid, operation: 'switch', target: 'beta'}).proposal;
    const switched = spawnSync('/bin/bash', [join(ROOT, 'scripts', 'project.sh'), 'switch', 'beta',
      '--session-id', sid, '--tx', proposal.tx, '--expected-epoch', '1'], {
      cwd: dispatchGstack, encoding: 'utf8', env: {...process.env,
        LUCA_GSTACK_ROOT: dispatchGstack, LUCA_PROJECTS_ROOT: dispatchProjects},
    });
    ok('A08 actual session switch A→B succeeds while A work is in flight', switched.status === 0,
      switched.stderr || switched.stdout);
    ok('A08 current session binding is B after the switch',
      readProjectState(dispatchGstack, sid, dispatchProjects).value.binding?.project === 'beta');
    started.child.kill('SIGTERM');
    const exit = await new Promise(resolveExit => started.child.on('close', (code, signal) => resolveExit({code, signal})));
    rmSync(started.workflow, {force: true});
    const calls = parse(readFileSync(dump, 'utf8'))?.record || [];
    const turns = calls.filter(call => call.method === 'turn/start');
    const dispatchedPrompt = turns[0]?.params?.input?.[0]?.text || '';
    ok('A08 queued A work keeps the frozen absolute A root after the session switches to B',
      turns.length === 1 && dispatchedPrompt.includes(`WORK_ROOT=${workA}`) && !dispatchedPrompt.includes(`WORK_ROOT=${workB}`));
    ok('A08 explicit cancellation prevents not-yet-dispatched tool work',
      turns.length === 1 && /"queued_not_dispatched":2/.test(stderr), stderr.slice(-500));
    ok('A08 cancellation reports in-flight work and does not claim OS rollback',
      /"in_flight":1/.test(stderr) && /"os_revocation_guaranteed":false/.test(stderr)
      && (exit.code === 130 || exit.signal === 'SIGTERM'), `${JSON.stringify(exit)} ${stderr.slice(-500)}`);
    await new Promise(resolveWait => setTimeout(resolveWait, 4500));
    ok('A08 cancellation terminates the started child process group', !existsSync(marker),
      existsSync(marker) ? 'grandchild survived process-group termination' : stdout);
  }

  for (const badMode of ['wrong-model', 'reroute', 'failed-turn']) {
    const result = runWF("phase('Verify'); const x=await agent('hi'); phase('P'); const y=await agent('later'); return {x,y}",
      {FAKE_MODE: badMode});
    ok(`R3 critical ${badMode} blocks runner output`, result.status !== 0 && String(result.stdout).trim() === '');
    ok(`R3b critical ${badMode} latches activation`, result.state?.critical_failure === true);
  }
} finally {
  rmSync(join(WF_DIR, '__rt_probe.js'), {force: true});
  rmSync(sandbox, {recursive: true, force: true});
}

process.stdout.write(`\n=== test-workflow-runner-runtime summary: PASS=${pass} FAIL=${fail} ===\n`);
process.exit(fail === 0 ? 0 : 1);
