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
import {readActivation, releaseDigestForPolicy, startActivation} from './model-route-host.mjs';
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
      send({method:'turn/completed',params:{threadId,turn:{id:turnId,status:failed?'failed':'completed',error:failed?{message:'failed'}:null}}});
    }
  });
}
`, {mode: 0o755});
chmodSync(fakeCodex, 0o755);

let sequence = 0;
function runWF(scriptBody, extraEnv = {}, anchor = 'gpt-5.6-sol') {
  const name = '__rt_probe';
  const workflow = join(WF_DIR, `${name}.js`);
  writeFileSync(workflow, scriptBody);
  const rootSessionId = `runner-test-${process.pid}-${++sequence}`;
  startActivation({
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
      ...extraEnv,
    },
  });
  rmSync(workflow, {force: true});
  return {
    ...result,
    rootSessionId,
    state: readActivation({harness: 'codex', root_session_id: rootSessionId, state_root: stateRoot}),
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
  return {child, workflow};
}

async function waitFor(predicate, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise(resolveWait => setTimeout(resolveWait, 25));
  }
  throw new Error('timed out waiting for runtime fixture');
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
