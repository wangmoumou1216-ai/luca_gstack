#!/usr/bin/env node
// Opt-in real CLI regression; all model responses come from a loopback-only stub.
// Keeps the isolated fixture/result.json for diagnosis. Never changes installed hooks.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, cpSync, realpathSync, chmodSync, readdirSync, symlinkSync} from 'node:fs';
import {join, dirname, resolve, relative, delimiter} from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import { cleanupNativeEvidence, evidenceOptions, moduleSourceFiles, nativeEvidence } from './native-test-evidence.mjs';

const concurrentMode = process.argv.includes('--controlled-concurrent');
const controlledMode = concurrentMode || process.argv.includes('--controlled-owner');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const audit = evidenceOptions(), driver = fileURLToPath(import.meta.url);
assert.ok(!audit || !controlledMode, 'bound U1 evidence currently covers only the default new/resumed lifecycle');
const evidenceRuns = [], turnEvidence = [], setupPids = [], ownedRuns = [];
let activeEvidence, activeSession, afterCaptured = false, activeHookOffset = 0, activeCapture;
// Allowlist inheritance: GIT_*, LUCA_*, CODEX_*, NODE_OPTIONS, secrets,
// proxy settings and shared memory roots never reach fixture processes.
const baseEnv = Object.fromEntries(['PATH', 'LANG', 'LC_ALL', 'SHELL', 'TERM', 'SYSTEMROOT']
  .filter(key => process.env[key]).map(key => [key, process.env[key]]));
function checked(command, args, options = {}) {
  const result = spawnSync(command, args, {env: baseEnv, encoding: 'utf8', timeout: 30000, ...options});
  assert.equal(result.status, 0, `${command}: ${result.error?.message || result.stderr}`);
  return result.stdout.trim();
}
let binary, python, pythonUserBase;
try {
  binary = realpathSync(process.env.CODEX_BIN || checked('which', ['codex']));
  python = checked('which', ['python3']);
  pythonUserBase = checked(python, ['-m', 'site', '--user-base']);
  checked(python, ['-c', 'import yaml'], {env: {...baseEnv, PYTHONUSERBASE: pythonUserBase}});
  checked('git', ['--version']); checked('tar', ['--version']);
} catch (error) {
  console.log(`SKIP native Codex lifecycle: requires Codex CLI, git, tar and Python 3 with PyYAML (${error.message})`);
  process.exit(0);
}
const shellQuote = value => "'" + value.replaceAll("'", "'\"'\"'") + "'";
// /tmp is an explicit fixture root accepted by child-project attestation, even
// when the subprocess TMPDIR is isolated further below this directory.
const root = realpathSync(mkdtempSync(join(realpathSync('/tmp'), 'luca-native-lifecycle.')));
const isolatedHome = join(root, 'home');
const home = join(isolatedHome, '.codex');
const work = join(root, 'work');
mkdirSync(home, {recursive:true});
mkdirSync(work, {recursive:true});
const temporary = join(root, 'tmp'), bin = join(root, 'bin');
mkdirSync(temporary, {mode:0o700}); mkdirSync(bin);
symlinkSync(binary, join(bin, 'codex'));
Object.assign(baseEnv, {HOME:isolatedHome, TMPDIR:realpathSync('/tmp'), TMP:temporary, TEMP:temporary,
  PATH:bin + delimiter + (baseEnv.PATH || '/usr/bin:/bin')});
const hookLog = join(root, 'hook-payloads.jsonl');
const requestLog = join(root, 'responses-requests.jsonl');
// The tracked evidence archive exceeds 64 MiB; stream it to the isolated file
// instead of truncating spawnSync stdout and mistaking status=null for success.
const archivePath = join(root, 'source.tar');
const archive = spawnSync('git', ['archive','--output',archivePath,'HEAD'], {cwd:repo,env:baseEnv});
if(archive.error || archive.status !== 0) throw Error(`archive failed: ${archive.error?.message || archive.stderr}`);
if(spawnSync('tar',['-xf',archivePath,'-C',work],{env:baseEnv}).status !== 0) throw Error('extract failed');
const overlays = ['.codex/model-route-hook.mjs', 'scripts/codex-trust-hooks.mjs',
  '.codex/codex-hook-adapter.mjs', 'scripts/controlled-change-controller.mjs', 'scripts/controlled-native-owner.mjs',
  'scripts/controlled-change.mjs', '.claude/hooks/controlled-change-guard.mjs', '.claude/hooks/project-scope-guard.mjs',
  '.claude/hooks/session-restore.mjs', '.claude/hooks/lib/harness.mjs'];
for(const path of overlays) cpSync(join(repo,path),join(work,path));
checked('git',['init','-q'],{cwd:work});
writeFileSync(join(work,'.codex/config.toml'), '# isolated fixture; no production writable roots\n');
chmodSync(isolatedHome,0o700);chmodSync(home,0o700);
const digestDir = join(work, 'memory/digests');
mkdirSync(digestDir, {recursive:true});
writeFileSync(join(digestDir, '.checked-' + new Date().toISOString().slice(0,10)), 'isolated test: governance skipped\n');
const bindings=join(root,'bindings.json');
writeFileSync(bindings,JSON.stringify({schema_version:1,harnesses:{codex:{peak_model:'gpt-6.1-sol',light_model:'gpt-6-luna',approved_order:['gpt-6-luna','gpt-6.1-sol']}}}));
const entries=[];
const definition=JSON.parse(readFileSync(join(work,'.codex/hooks.json'),'utf8'));
const dispatch=join(root,'dispatch.mjs');
for(const [event,groups] of Object.entries(definition.hooks)) for(const group of groups) for(const hook of group.hooks){
  entries.push({event,command:hook.command.replace(/MEMORY_ROOT=(?:"[^"]*"|'[^']*'|[^\s]+)/g, 'MEMORY_ROOT='+shellQuote(work)).replaceAll('/tmp/luca-gstack-hooks.log',join(root,'framework-stderr.log'))});
  hook.command=shellQuote(process.execPath)+' '+shellQuote(dispatch)+' '+(entries.length-1);
}
writeFileSync(join(root,'entries.json'),JSON.stringify(entries));
writeFileSync(join(work,'.codex/hooks.json'),JSON.stringify(definition));
writeFileSync(dispatch,`import {readFileSync,appendFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const raw=readFileSync(0,'utf8'),entry=JSON.parse(readFileSync(${JSON.stringify(join(root,'entries.json'))}))[+process.argv[2]];
const result=spawnSync('/bin/sh',['-c',entry.command],{input:raw,encoding:'utf8',env:process.env,timeout:35000,maxBuffer:4*1024*1024});
appendFileSync(${JSON.stringify(hookLog)},JSON.stringify({entry:+process.argv[2],payload:JSON.parse(raw),status:result.status,output:result.stdout,error:result.stderr})+'\\n');
if(process.env.LUCA_NATIVE_EVIDENCE_URL && entry.event==='SessionEnd') {
  const response=await fetch(process.env.LUCA_NATIVE_EVIDENCE_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({entry:+process.argv[2],session_id:JSON.parse(raw).session_id})});
  if(!response.ok) throw Error('native evidence observer failed: '+await response.text());
}
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');process.exitCode=result.status??2;
`);

if (controlledMode) writeFileSync(join(work, 'controlled-target.txt'), 'before\n');
if (concurrentMode) {
  writeFileSync(join(work, 'controlled-second.txt'), 'before B\n');
  writeFileSync(join(work, 'controlled-verification.mjs'), `import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';test('both edits',()=>{assert.equal(readFileSync('controlled-target.txt','utf8'),'after\\n');assert.equal(readFileSync('controlled-second.txt','utf8'),'after B\\n')});`);
}
checked('git',['add','-A'],{cwd:work});
checked('git',['-c','user.name=Isolated Test','-c','user.email=test@invalid','commit','-qm','fixture'],{cwd:work});

let controlledPrograms = [], controlledManifestPath, concurrentSteps = [], concurrentTurns = [], concurrentIds = [], coexistence;
if (controlledMode) {
  const core = await import(join(work, 'scripts/controlled-change.mjs'));
  const scratch = join(root, 'controlled-scratch'); mkdirSync(scratch);
  const head = checked('git', ['rev-parse', 'HEAD'], { cwd: work });
  const patch = '*** Begin Patch\n*** Update File: controlled-target.txt\n@@\n-before\n+after\n*** End Patch';
  controlledManifestPath = join(scratch, 'manifest.json');
  writeFileSync(controlledManifestPath, JSON.stringify({ schema_version: 1, task_id: 'native-wrapper-owner', u_id: 'U-003',
    repo_realpath: work, git_common_dir_realpath: core.gitCommonDirRealpath(work), plan_sha256: '1'.repeat(64),
    plan_recorded_baseline: head, observed_baseline: head, session: 'display-label', scratch_root: scratch,
    repo_paths: [{ path: 'controlled-target.txt', mutation: 'modify', preimage: core.pathTuple(join(work, 'controlled-target.txt')),
      postimage: { type: 'file', mode: '100644', sha256: core.sha256Bytes(Buffer.from('after\n')) } }],
    external_paths: [], mutation_classes: ['modify'], approved_effects: ['git-stage'], allowed_commands: ['printf OWNER_VALIDATION_OK'],
    metadata: { patch_sha256: core.sha256Bytes(Buffer.from(patch)) } }));
  const command = operation => `node scripts/controlled-change-controller.mjs ${operation} --manifest '${controlledManifestPath}'`;
  const shell = cmd => `text(await tools.exec_command({cmd:${JSON.stringify(cmd)},max_output_tokens:100}));`;
  controlledPrograms = [shell(command('prepare')), `text(await tools.apply_patch(${JSON.stringify(patch)}));`,
    shell('printf OWNER_VALIDATION_OK'),
    shell(command('authorize-effect') + ` --effect git-stage --gate fixture-gate --command-sha256 ${core.sha256Bytes(Buffer.from('git add controlled-target.txt'))} --cwd '${work}' --authorization-token wrapper-auth-0001`),
    shell('git add controlled-target.txt'), shell(command('finish'))];
  if (concurrentMode) {
    const secondScratch = join(root, 'controlled-scratch-b'), integrationScratch = join(root, 'controlled-integration');
    mkdirSync(secondScratch); mkdirSync(integrationScratch);
    const secondFile = join(secondScratch, 'manifest.json'), integrationFile = join(integrationScratch, 'manifest.json');
    const original = JSON.parse(readFileSync(controlledManifestPath));
    const patchB = patch.replaceAll('controlled-target.txt', 'controlled-second.txt').replace('-before\n+after', '-before B\n+after B');
    const secondManifest = { ...original, task_id: 'native-wrapper-b', scratch_root: secondScratch,
      repo_paths: [{ path: 'controlled-second.txt', mutation: 'modify', preimage: core.pathTuple(join(work, 'controlled-second.txt')),
        postimage: { type: 'file', mode: '100644', sha256: core.sha256Bytes(Buffer.from('after B\n')) } }],
      metadata: { patch_sha256: core.sha256Bytes(Buffer.from(patchB)) } };
    const integration = { ...original, task_id: 'native-wrapper-integration', scratch_root: integrationScratch,
      repo_paths: [...original.repo_paths, ...secondManifest.repo_paths].map(row => ({ ...row, preimage: row.postimage })),
      allowed_commands: ['node --test controlled-verification.mjs'] };
    writeFileSync(secondFile, JSON.stringify(secondManifest)); writeFileSync(integrationFile, JSON.stringify(integration));
    const ctl = (file, operation) => `node scripts/controlled-change-controller.mjs ${operation} --manifest '${file}'`;
    const stage = 'git add controlled-target.txt controlled-second.txt';
    concurrentSteps = [
      [shell(command('prepare'))],
      [shell(ctl(secondFile, 'prepare')), `text(await tools.apply_patch(${JSON.stringify(patchB)}));`],
      [shell('cat controlled-second.txt'), shell('rg -n after controlled-second.txt'),
        shell('pwd'), shell('head -n 3 README.md')],
      [`text(await tools.apply_patch(${JSON.stringify(patch)}));`, shell(command('finish'))],
      [shell(ctl(secondFile, 'finish'))],
      [shell(ctl(integrationFile, 'prepare')), shell('node --test controlled-verification.mjs'),
        shell(ctl(integrationFile, 'authorize-effect') + ` --effect git-stage --gate integration-gate --command-sha256 ${core.sha256Bytes(Buffer.from(stage))} --cwd '${work}' --authorization-token integration-native-auth`),
        shell(stage), shell(ctl(integrationFile, 'finish'))],
    ];
    controlledPrograms = concurrentSteps[0];
  }

}

function sse(events) {
  return events.map(event => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join('');
}
function completed(id) {
  return {type:'response.completed',response:{id,usage:{input_tokens:0,input_tokens_details:null,output_tokens:0,output_tokens_details:null,total_tokens:0}}};
}
let requestCount = 0; let rootStep=0; let spawnedAgent=''; let iteration=1; let spawnCallId='';
const server = createServer((request, response) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', chunk => body += chunk);
  request.on('end', () => {
    let parsed = {};
    try { parsed = JSON.parse(body); } catch {}
    if (request.url === '/native-evidence-after') {
      try {
        const rows = readFileSync(hookLog, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
        const currentRows = rows.slice(activeHookOffset);
        const rootEnds = currentRows.filter(row => row.payload.session_id === parsed.session_id && row.payload.hook_event_name === 'SessionEnd');
        const needed = entries.map((entry, index) => entry.event === 'SessionEnd' ? index : -1).filter(index => index >= 0);
        if (activeEvidence && !afterCaptured && parsed.session_id === activeSession
          && needed.every(index => rootEnds.some(row => row.entry === index))) {
          activeEvidence.after({ ready: true, native_session_id: parsed.session_id, session_end_registrations: rootEnds,
            hook_rows: currentRows, activation: activation(parsed.session_id) });
          afterCaptured = true;
        }
        response.writeHead(200); response.end('observed');
      } catch (error) { response.writeHead(500); response.end(error.stack); }
      return;
    }
    requestCount += 1;
    appendFileSync(requestLog, JSON.stringify({n:requestCount,url:request.url,keys:Object.keys(parsed),input:parsed.input,tools:parsed.tools})+'\n');
    const userMessages=(parsed.input||[]).filter(x=>x.type==='message'&&x.role==='user');
    const lastUser=JSON.stringify(userMessages.map(x=>x.content));
    let item;
    const message=text=>({type:'message',role:'assistant',id:'msg_'+requestCount,content:[{type:'output_text',text}]});
    const call=(name,args,namespace)=>({type:'function_call',id:'fc_'+requestCount,call_id:'call_'+requestCount,name,arguments:JSON.stringify(args),...(namespace?{namespace}:{})});
    if (controlledMode) {
      const flatten = (tools, namespace = '') => (tools || []).flatMap(tool => tool.type === 'namespace'
        ? flatten(tool.tools, tool.name) : [{ name: tool.name, namespace, type: tool.type }]);
      const offered = flatten([...(parsed.tools || []), ...(parsed.input || []).filter(row => row.type === 'additional_tools').flatMap(row => row.tools || [])]);
      const wrapper = offered.find(tool => tool.name === 'exec');
      const program = controlledPrograms[rootStep++];
      item = program && wrapper ? { type: 'custom_tool_call', id: 'ct_' + requestCount,
        call_id: 'call_' + requestCount, name: wrapper.name, namespace: wrapper.namespace, input: program }
        : message(program ? 'WRAPPER_MISSING' : 'CONTROLLED_OWNER_DONE');
    } else     if(!lastUser.includes('Isolated framework acceptance:')&&!lastUser.includes('Repeat the isolated acceptance')) item=message('CHILD_DONE');
    else {
      if (rootStep === 0) {
        try { activeEvidence?.before({ ready: Array.isArray(parsed.input) && parsed.input.length > 0 && Boolean(activeSession),
          endpoint: request.url, native_session_id: activeSession, request_keys: Object.keys(parsed), request_number: requestCount }); }
        catch (error) { response.writeHead(500); response.end(error.stack); return; }
      }
      rootStep++;
      if(rootStep===1) item=call('exec_command',{cmd:'head -1 README.md',max_output_tokens:100});
      else if(rootStep===2) item=call('exec_command',{cmd:"printf 'hook-test\\n' > incident-probe.txt",max_output_tokens:100});
      else if(rootStep===3) item=call('exec_command',{cmd:'cat incident-probe.txt',max_output_tokens:100});
      else if(rootStep===4) item={type:'custom_tool_call',id:'ct_'+requestCount,call_id:'call_'+requestCount,name:'apply_patch',input:'*** Begin Patch\n*** Update File: incident-probe.txt\n@@\n-hook-test\n+hook-patch-tested\n*** End Patch'};
      else if(rootStep===5) { spawnCallId='call_'+requestCount; item=call('spawn_agent',{agent_type:'default',task_name:'hook_smoke_child_'+iteration,message:'CHILD_SMOKE: Reply CHILD_DONE only.',fork_turns:'none'},'collaboration'); }
      else if(rootStep===6) {
        for(const input of parsed.input||[]) if(input.type==='function_call_output'&&input.call_id===spawnCallId) {
          try { const obj=JSON.parse(input.output); spawnedAgent=obj.agent_id||obj.task_name||spawnedAgent; } catch {}
        }
        item=spawnedAgent?call('wait_agent',{timeout_ms:10000},'collaboration'):message('SPAWN_FAILED');
      } else item=message('ALL_SCENARIOS_DONE');
    }
    const events=[{type:'response.created',response:{id:'resp_'+requestCount}},{type:'response.output_item.done',item},completed('resp_'+requestCount)];
    response.writeHead(200, {'content-type':'text/event-stream','cache-control':'no-cache'});
    response.end(sse(events));
  });
});

await new Promise((resolve,reject) => {server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const port = server.address().port;
const configPath = join(home, 'config.toml');
writeFileSync(configPath, `model = "gpt-6.1-sol"\nmodel_provider = "localstub"\napproval_policy = "never"\nsandbox_mode = "danger-full-access"\nmodel_reasoning_effort = "low"\ncheck_for_update_on_startup = false\nsuppress_unstable_features_warning = true\n[features]\nhooks = true\napps = false\ndaemon_auto_start = false\nmulti_agent = true\n[model_providers.localstub]\nname = "Local offline stub"\nbase_url = "http://127.0.0.1:${port}/v1"\nenv_key = "LOCAL_STUB_KEY"\nwire_api = "responses"\nsupports_websockets = false\nrequest_max_retries = 0\nstream_max_retries = 0\n[projects.${JSON.stringify(work)}]\ntrust_level = "trusted"\n`);

const isolatedEnv = {...baseEnv,NODE_ENV:'test',PYTHONUSERBASE:pythonUserBase,LUCA_EVENT_ATTESTATION_TEST:'1',LUCA_CONTROLLED_TEST_HOME:isolatedHome,LUCA_MODEL_ROUTE_STATE_ROOT:join(root,'state'),LUCA_MODEL_ROUTE_BINDINGS_PATH:bindings,LUCA_MODEL_ROUTE_TRANSCRIPT_ROOT:join(home,'sessions'),LUCA_CHILD_PROJECT_STORE_ROOT:join(root,'child-store'),LUCA_CHILD_PROJECT_TEST_CODEX_HOME:home,LUCA_PROJECTS_ROOT:join(root,'projects'),MEMORY_ROOT:work,HOME:isolatedHome,CODEX_HOME:home,LOCAL_STUB_KEY:'offline',NO_PROXY:'127.0.0.1,localhost',no_proxy:'127.0.0.1,localhost'};
if (audit) isolatedEnv.LUCA_NATIVE_EVIDENCE_URL = `http://127.0.0.1:${port}/native-evidence-after`;
function appServerRequest(method, params) {
  return new Promise((resolve,reject) => {
    const app = spawn(binary,['app-server','--listen','stdio://'],{env:isolatedEnv,cwd:work,stdio:['pipe','pipe','pipe']});
    setupPids.push(app.pid);
    let buffer='', appErr='', settled=false;
    const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);app.kill('SIGKILL');if(error)reject(error);else resolve(value)};
    const timer=setTimeout(()=>finish(new Error(`${method} timeout`)),10000);
    app.stderr.on('data',bytes=>appErr+=bytes);
    app.on('close',()=>finish(new Error(`${method} closed: ${appErr}`)));
    app.stdout.on('data', bytes => {
      buffer += bytes;
      const lines=buffer.split('\n');buffer=lines.pop();
      for (const line of lines) {
        let row;try{row=JSON.parse(line)}catch{continue}
        if(row.id===2){if(row.error)finish(new Error(JSON.stringify(row.error)));else finish(null,row.result);}
      }
    });
    app.on('error',finish);app.stdin.on('error',finish);
    app.stdin.write([JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{clientInfo:{name:'offline-hook-smoke',title:'offline-hook-smoke',version:'1'}}}),JSON.stringify({jsonrpc:'2.0',id:2,method,params})].join('\n')+'\n');
  });
}
let first, second, sid, firstActivation, secondActivation, initialRegistrations;
function activation(sessionId) {
  const directory=join(root,'state/codex');
  return readdirSync(directory).filter(name=>name.endsWith('.json'))
    .map(name=>JSON.parse(readFileSync(join(directory,name),'utf8'))).find(state=>state.root_session_id===sessionId);
}
function retainTurnTranscripts(turn) {
  const sessions = join(home, 'sessions');
  const parent = readdirSync(sessions, { recursive: true })
    .filter(path => path.endsWith(`-${turn.session}.jsonl`));
  assert.equal(parent.length, 1, 'retain the exact native parent transcript');
  const originals = [{ kind: 'parent', path: join(sessions, parent[0]) }];
  for (const call of Object.values(turn.state?.invocations || {})) {
    if (call.status !== 'accepted') continue;
    const match = /^codex-transcript:(.+\.jsonl):([^:]+)$/.exec(call.evidence_ref || '');
    assert.ok(match, 'accepted native child must name its original transcript');
    originals.push({ kind: 'child', path: match[1], invocation_id: call.invocation_id,
      input_sha: call.input_sha, external_identity: call.external_identity,
      original_evidence_ref: call.evidence_ref, turn_id: match[2] });
  }
  const retained = originals.map((original, index) => {
    const source = realpathSync(original.path), within = relative(realpathSync(sessions), source);
    assert.ok(within && !within.startsWith('..') && !within.startsWith('/'),
      'native transcript must belong to the isolated session directory');
    const ref = turn.run.write(`native-${original.kind}-transcript-${index}.jsonl`, readFileSync(source), true);
    return { ...original, path: source, source_sha256: ref.sha256, retained_ref: ref };
  });
  turn.run.write('native-transcript-index.json', { native_session_id: turn.session, transcripts: retained });
}
try {
const listed = await appServerRequest('hooks/list',{cwds:[work]});
const registrations=(listed.data||[]).flatMap(group=>group.hooks||[]);
if(registrations.length!==11) throw new Error(`expected 11 scratch hooks, got ${registrations.length}`);
let trust='';
for(const hook of registrations) trust += `\n[hooks.state.${JSON.stringify(hook.key)}]\ntrusted_hash = ${JSON.stringify(hook.currentHash)}\nenabled = true\n`;
appendFileSync(configPath,trust);
initialRegistrations=(await appServerRequest('hooks/list',{cwds:[work]})).data.flatMap(group=>group.hooks||[]);
assert.equal(initialRegistrations.length,11);
assert.ok(initialRegistrations.every(hook=>hook.enabled===true && hook.trustStatus==='trusted'),
  'all 11 isolated hooks must start enabled and trusted');

async function runTurn(args) {
 activeHookOffset = (() => { try { return readFileSync(hookLog, 'utf8').trim().split('\n').filter(Boolean).length; } catch { return 0; } })();
 const child=spawn(binary,args,{env:isolatedEnv,cwd:work,detached:Boolean(audit)});child.stdin.end();
 const name = iteration === 1 ? 'new' : 'resumed';
 if (audit) ownedRuns.push({ name, child });
 activeSession = null; afterCaptured = false;
 activeEvidence = nativeEvidence({ audit, name, repo, driver, child, argv: [binary, ...args], cwd: work, env: isolatedEnv, scratch: root, port, setupPids,
   sources: moduleSourceFiles([join(repo, 'scripts/native-test-evidence.mjs'), ...overlays.map(path => join(repo, path)),
     ...overlays.map(path => join(work, path)), ...['.codex/hooks.json', '.claude/hooks/session-restore.mjs', '.claude/hooks/session-sync.mjs',
       '.claude/hooks/session-end.mjs', '.claude/hooks/route-guard.mjs', '.claude/hooks/post-edit.mjs', '.claude/skill-os/model-routing.yaml'].map(path => join(work, path)),
     dispatch, configPath, bindings]), sourceMetadata: { fixture_git_head: checked('git', ['rev-parse', 'HEAD'], { cwd: work }),
       archived_source_head: checked('git', ['rev-parse', 'HEAD'], { cwd: repo }), binary_version: checked(binary, ['--version']) },
   seed: { initialRegistrations, entries, args, new_or_resumed: name, previous_session: sid || null,
     initial_file: (() => { try { return readFileSync(join(work, 'incident-probe.txt'), 'utf8'); } catch { return null; } })() },
   coverage: [
     { feature: 'native lifecycle', entry: `Codex ${name} CLI`, state: 'read-write-patch-child-completion', assert_ids: ['U1-A5'] },
     { feature: 'native hook registration', entry: `Codex ${name} CLI`, state: 'all eleven registrations executed', assert_ids: ['U1-A5'] },
     { feature: 'native child adoption', entry: `Codex ${name} CLI`, state: 'same-invocation evidence accepted', assert_ids: ['U1-A5'] },
   ] });
 if (activeEvidence) evidenceRuns.push(activeEvidence);
 let stdout='',stderr='';child.stdout.on('data',b=>{
   stdout+=b;
   const start = stdout.split('\n').filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } }).find(row => row.type === 'thread.started');
   if (start) activeSession = start.thread_id;
 });child.stderr.on('data',b=>stderr+=b);
 const timer=setTimeout(()=>child.kill('SIGKILL'),45000);
 let status;
 try {status=await new Promise((resolve,reject)=>{child.once('close',resolve);child.once('error',reject)});}
 finally {clearTimeout(timer);}
 activeCapture = { name, status, stdout, stderr };
 const events=stdout.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
 if (activeEvidence) {
   const rows = readFileSync(hookLog, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
   const turnRows = rows.slice(activeHookOffset).filter(row => row.payload.session_id === activeSession);
   const turn = { run: activeEvidence, data: { exitCode: status, stdout, stderr }, events, session: activeSession,
     hooks: turnRows, allHooks: rows.slice(activeHookOffset), state: activation(activeSession),
     file: (() => { try { return readFileSync(join(work, 'incident-probe.txt'), 'utf8'); } catch { return null; } })() };
   turnEvidence.push(turn);
   retainTurnTranscripts(turn);
 }
 return {status,events,stderr};
}
if (concurrentMode) {
  for (let i = 0; i < concurrentSteps.length; i++) {
    controlledPrograms = concurrentSteps[i]; rootStep = 0;
    const resume = i === 3 ? concurrentIds[0] : i === 4 ? concurrentIds[1] : null;
    const args = resume ? ['exec', 'resume', '--json', resume, 'Continue the isolated controlled phase.']
      : ['exec', '--json', '--skip-git-repo-check', '--sandbox', 'danger-full-access', '-C', work, 'Isolated framework acceptance: controlled phase.'];
    const result = await runTurn(args); concurrentTurns.push(result);
    concurrentIds.push(result.events.find(event => event.type === 'thread.started')?.thread_id);
    if (i === 1) coexistence = ['native-wrapper-owner', 'native-wrapper-b'].map(task =>
      JSON.parse(readFileSync(join(work, '.git/luca-controlled-change', task, 'required-witness.json'))));
  }
  first = concurrentTurns[0]; sid = concurrentIds[0];
} else {
first=await runTurn(['exec','--json','--skip-git-repo-check','--sandbox','danger-full-access','-C',work,'Isolated framework acceptance: read README.md, create and edit incident-probe.txt, read it back, explicitly spawn one default child agent and wait, then answer ALL_SCENARIOS_DONE.']);
sid=first.events.find(x=>x.type==='thread.started')?.thread_id;
firstActivation=activation(sid);
rootStep=0;spawnedAgent='';iteration=2;
if (!controlledMode) {
second=sid?await runTurn(['exec','resume','--json',sid,'Repeat the isolated acceptance actions in this resumed session, including one child agent.']):null;
secondActivation=activation(sid);
}
}
} catch(error) {
  writeFileSync(join(root,'failure.json'),JSON.stringify({error:error.stack,first,second},null,2));
  if (audit) {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    const captured = { status: 'GAP', error: error.stack, first, second, active_native_capture: activeCapture,
      hook_payloads: (() => { try { return readFileSync(hookLog, 'utf8'); } catch { return ''; } })(),
      requests: (() => { try { return readFileSync(requestLog, 'utf8'); } catch { return ''; } })() };
    turnEvidence.forEach(turn => turn.run.capture({ ...turn.data, results: [], artifacts: { 'failure.json': captured } }));
    const cleanup = await cleanupNativeEvidence(ownedRuns, root, port, setupPids);
    const receipts = turnEvidence.map(turn => turn.run.finish({ cleanup: cleanup(turn.run) }));
    writeFileSync(join(audit.dir, 'failure.json'), JSON.stringify({ ...captured, receipts,
      remaining_gaps: ['native driver failed before all required process arms completed'],
      cleanup: ownedRuns.map(run => ({ name: run.name, ...cleanup(run) })) }, null, 2));
  }
  throw new Error(`Native lifecycle failed; evidence: ${root}`,{cause:error});
} finally {server.closeAllConnections();if(server.listening)await new Promise(resolve=>server.close(resolve));}
const hooks=readFileSync(hookLog,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const allEvents=[...first.events,...(second?.events||[])];
const denied=hooks.filter(x=>x.status!==0||/"permissionDecision":"deny"|"continue":false/.test(x.output));
const requests=readFileSync(requestLog,'utf8').split('\n').filter(Boolean).map(JSON.parse);
const toolErrors=requests.flatMap(x=>x.input||[]).filter(x=>(x.type==='function_call_output'||x.type==='custom_tool_call_output')&&/unsupported call:|failed to parse function arguments:|hook.*blocked|Process exited with code [1-9]|Exit code: [1-9]/i.test(x.output));
if (concurrentMode) {
  const witnesses = ['native-wrapper-owner', 'native-wrapper-b', 'native-wrapper-integration'].map(task =>
    JSON.parse(readFileSync(join(work, '.git/luca-controlled-change', task, 'required-witness.json'))));
  const receipts = witnesses.map(w => JSON.parse(readFileSync(join(work, '.git/luca-controlled-change', w.task_id, 'receipt.json'))));
  const reads = hooks.filter(row => row.payload.session_id === concurrentIds[2] && row.payload.hook_event_name === 'PostToolUse');
  const checks = { turns: concurrentTurns.every(turn => turn.status === 0 && turn.events.some(event => event.type === 'turn.completed')),
    cleanHooks: !denied.length && !toolErrors.length,
    twoOwners: coexistence.every(w => w.state === 'REQUIRED') && new Set(coexistence.map(w => w.native_owner.session_id)).size === 2,
    thirdSidRead: !coexistence.some(w => w.native_owner.session_id === concurrentIds[2]) && reads.length === 4 && reads.every(row => row.status === 0),
    naturalCompletion: witnesses.every(w => w.state === 'COMPLETED') && receipts.every(r => !r.history.some(row => row.state === 'ABORTED')),
    stage: checked('git', ['diff', '--cached', '--name-only'], { cwd: work }) === 'controlled-second.txt\ncontrolled-target.txt',
    exactEdits: readFileSync(join(work, 'controlled-target.txt'), 'utf8') === 'after\n' && readFileSync(join(work, 'controlled-second.txt'), 'utf8') === 'after B\n' };
  const result = { pass: Object.values(checks).every(Boolean), root, checks, concurrentIds, witnesses, receipts, coexistence, reads, denied, toolErrors };
  writeFileSync(join(root, 'concurrent-result.json'), JSON.stringify(result, null, 2));
  console.log(`${result.pass ? 'PASS' : 'FAIL'} native concurrent wrapper: ${JSON.stringify(checks)}; evidence: ${join(root, 'concurrent-result.json')}`);
  process.exit(result.pass ? 0 : 1);
}
if (controlledMode) {
  let witness = {};
  try { witness = JSON.parse(readFileSync(join(work, '.git/luca-controlled-change/native-wrapper-owner/required-witness.json'))); } catch {}
  const checks = {
    cli: first.status === 0 && first.events.some(event => event.type === 'turn.completed'),
    cleanHooks: denied.length === 0 && toolErrors.length === 0,
    nativeOwner: witness.native_owner?.session_id === sid,
    terminal: witness.state === 'COMPLETED',
    exactPatch: readFileSync(join(work, 'controlled-target.txt'), 'utf8') === 'after\n',
    wrappers: requests.length === controlledPrograms.length + 1,
    injected: hooks.some(row => row.payload.hook_event_name === 'PostToolUse' && row.payload.tool_input?.command?.includes('--native-owner-claim')),
  };
  const result = { pass: Object.values(checks).every(Boolean), root, checks, denied, toolErrors, witness,
    hookEvents: hooks.map(row => ({ event: row.payload.hook_event_name, tool: row.payload.tool_name, status: row.status })) };
  writeFileSync(join(root, 'controlled-result.json'), JSON.stringify(result, null, 2));
  console.log(`${result.pass ? 'PASS' : 'FAIL'} native wrapper controlled owner: ${JSON.stringify(checks)}; evidence: ${join(root, 'controlled-result.json')}`);
  process.exit(result.pass ? 0 : 1);
}
const stops=hooks.filter(x=>x.payload.hook_event_name==='SubagentStop');
const result={binary,overlays,initialRegistrations,firstActivation,secondActivation,stops:stops.map(x=>({message:x.payload.last_assistant_message,output:x.output})),root,first,second,requestCount,events:hooks.map(x=>({entry:x.entry,event:x.payload.hook_event_name,source:x.payload.source,status:x.status,output:x.output})),denied,toolErrors,finalFile:readFileSync(join(work,'incident-probe.txt'),'utf8')};
const failures=[];
const check=(condition,label)=>{if(!condition)failures.push(label)};
check(first.status===0 && second?.status===0,'new and resumed CLI turns exit successfully');
check(Boolean(sid) && second?.events.find(event=>event.type==='thread.started')?.thread_id===sid,'resume keeps the same session identity');
check(first.events.some(event=>event.type==='turn.completed') && second?.events.some(event=>event.type==='turn.completed'),'both turns completed');
check(stops.length===2 && stops.every(event=>event.payload.last_assistant_message==='CHILD_DONE' && event.output.trim()==='{}'),'two successful child stops');
check(new Set(hooks.map(event=>event.entry)).size===11,'all 11 registrations actually triggered');
check(!denied.length && !toolErrors.length && !allEvents.some(event=>event.type==='turn.failed' || event.type==='error'),'no hook denial or tool/runtime failure');
check(result.finalFile==='hook-patch-tested\n','patch produced exact expected file');
for(const [index,state] of [firstActivation,secondActivation].entries()) {
  check(state && state.status==='paused' && state.critical_failure===false,`turn ${index+1} activation ended cleanly`);
  const invocations=Object.values(state?.invocations||{}), preparations=Object.values(state?.preparations||{});
  check(invocations.length===1 && invocations.every(call=>call.status==='accepted' && call.evidence_ref?.startsWith('codex-transcript:')),`turn ${index+1} adopted same-invocation success evidence`);
  check(!preparations.some(call=>['pending','invalidated'].includes(call.status)),`turn ${index+1} has no unresolved critical preparation`);
}
result.failures=failures;result.pass=failures.length===0;
writeFileSync(join(root,'result.json'),JSON.stringify(result,null,2));
console.log(`${result.pass?'PASS':'FAIL'} native Codex lifecycle: ${hooks.length} hook events, ${new Set(hooks.map(event=>event.entry)).size}/11 registrations; evidence: ${join(root,'result.json')}`);
if (audit) {
  const rawRequests = readFileSync(requestLog, 'utf8'), rawHooks = readFileSync(hookLog, 'utf8');
  turnEvidence.forEach(turn => {
    const invocations = Object.values(turn.state?.invocations || {}), preparations = Object.values(turn.state?.preparations || {});
    const expected = [
      { cli_exit: 0, turn_completed: true, session_preserved: true, exact_file: 'hook-patch-tested\n', native_failures: false },
      { registration_ids: entries.map((_, index) => index) },
      { status: 'paused', critical_failure: false, accepted_same_invocation: true, unresolved_preparations: false },
    ];
    const actual = [
      { cli_exit: turn.data.exitCode, turn_completed: turn.events.some(event => event.type === 'turn.completed'),
        session_preserved: turn.session === sid, exact_file: turn.file, native_failures: denied.length > 0 || toolErrors.length > 0 || turn.events.some(event => event.type === 'turn.failed' || event.type === 'error') },
      { registration_ids: [...new Set(turn.hooks.map(row => row.entry))].sort((a, b) => a - b) },
      { status: turn.state?.status, critical_failure: turn.state?.critical_failure,
        accepted_same_invocation: invocations.length === 1 && invocations.every(call => call.status === 'accepted' && call.evidence_ref?.startsWith('codex-transcript:')),
        unresolved_preparations: preparations.some(call => ['pending', 'invalidated'].includes(call.status)) },
    ];
    turn.run.capture({ ...turn.data, results: expected.map((value, index) => ({ expected: value, actual: actual[index] })),
      artifacts: { 'native-result.json': result, 'hook-payloads.json': turn.allHooks, 'responses-requests.json': rawRequests,
        'all-hook-payloads.json': rawHooks, 'activation.json': turn.state } });
  });
  const cleanup = await cleanupNativeEvidence(evidenceRuns, root, port, setupPids);
  const receipts = turnEvidence.map(turn => turn.run.finish({ cleanup: cleanup(turn.run) }));
  writeFileSync(join(audit.dir, 'summary.json'), JSON.stringify({ pass: result.pass && receipts.length === 2 && receipts.every(row => row.status === 'PASS'), receipts }, null, 2));
  assert.equal(receipts.length, 2, 'both native process instances require receipts');
  assert.ok(receipts.every(receipt => receipt.status === 'PASS'), JSON.stringify(receipts));
  console.log(`Bound native evidence: ${audit.dir}`);
}
if(failures.length) {console.error(failures.join('; '));process.exitCode=1;}
