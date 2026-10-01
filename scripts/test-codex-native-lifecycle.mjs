#!/usr/bin/env node
// Opt-in real CLI regression; all model responses come from a loopback-only stub.
// Keeps the isolated fixture/result.json for diagnosis. Never changes installed hooks.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, cpSync, realpathSync, chmodSync, readdirSync, symlinkSync} from 'node:fs';
import {join, dirname, resolve, delimiter} from 'node:path';
import {spawn, spawnSync} from 'node:child_process';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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
Object.assign(baseEnv, {HOME:isolatedHome, TMPDIR:temporary, TMP:temporary, TEMP:temporary,
  PATH:bin + delimiter + (baseEnv.PATH || '/usr/bin:/bin')});
const hookLog = join(root, 'hook-payloads.jsonl');
const requestLog = join(root, 'responses-requests.jsonl');
const archive = spawnSync('git', ['archive','HEAD'], {cwd:repo,env:baseEnv,maxBuffer:64*1024*1024});
if(archive.status) throw Error('archive failed');
if(spawnSync('tar',['-xf','-','-C',work],{input:archive.stdout,env:baseEnv}).status) throw Error('extract failed');
const overlays = ['.codex/model-route-hook.mjs', 'scripts/codex-trust-hooks.mjs',
  'scripts/controlled-change.mjs', '.claude/hooks/controlled-change-guard.mjs', '.claude/hooks/project-scope-guard.mjs'];
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
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');process.exitCode=result.status??2;
`);

checked('git',['add','-A'],{cwd:work});
checked('git',['-c','user.name=Isolated Test','-c','user.email=test@invalid','commit','-qm','fixture'],{cwd:work});

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
    requestCount += 1;
    let parsed = {};
    try { parsed = JSON.parse(body); } catch {}
    appendFileSync(requestLog, JSON.stringify({n:requestCount,url:request.url,keys:Object.keys(parsed),input:parsed.input,tools:parsed.tools})+'\n');
    const userMessages=(parsed.input||[]).filter(x=>x.type==='message'&&x.role==='user');
    const lastUser=JSON.stringify(userMessages.map(x=>x.content));
    let item;
    const message=text=>({type:'message',role:'assistant',id:'msg_'+requestCount,content:[{type:'output_text',text}]});
    const call=(name,args,namespace)=>({type:'function_call',id:'fc_'+requestCount,call_id:'call_'+requestCount,name,arguments:JSON.stringify(args),...(namespace?{namespace}:{})});
    if(!lastUser.includes('Isolated framework acceptance:')&&!lastUser.includes('Repeat the isolated acceptance')) item=message('CHILD_DONE');
    else {
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

const isolatedEnv = {...baseEnv,NODE_ENV:'test',PYTHONUSERBASE:pythonUserBase,LUCA_EVENT_ATTESTATION_TEST:'1',LUCA_MODEL_ROUTE_STATE_ROOT:join(root,'state'),LUCA_MODEL_ROUTE_BINDINGS_PATH:bindings,LUCA_MODEL_ROUTE_TRANSCRIPT_ROOT:join(home,'sessions'),LUCA_CHILD_PROJECT_STORE_ROOT:join(root,'child-store'),LUCA_CHILD_PROJECT_TEST_CODEX_HOME:home,LUCA_PROJECTS_ROOT:join(root,'projects'),MEMORY_ROOT:work,HOME:isolatedHome,CODEX_HOME:home,LOCAL_STUB_KEY:'offline',NO_PROXY:'127.0.0.1,localhost',no_proxy:'127.0.0.1,localhost'};
function appServerRequest(method, params) {
  return new Promise((resolve,reject) => {
    const app = spawn(binary,['app-server','--listen','stdio://'],{env:isolatedEnv,cwd:work,stdio:['pipe','pipe','pipe']});
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
 const child=spawn(binary,args,{env:isolatedEnv,cwd:work});child.stdin.end();
 let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
 const timer=setTimeout(()=>child.kill('SIGKILL'),45000);
 let status;
 try {status=await new Promise((resolve,reject)=>{child.once('close',resolve);child.once('error',reject)});}
 finally {clearTimeout(timer);}
 const events=stdout.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
 return {status,events,stderr};
}
first=await runTurn(['exec','--json','--skip-git-repo-check','--sandbox','danger-full-access','-C',work,'Isolated framework acceptance: read README.md, create and edit incident-probe.txt, read it back, explicitly spawn one default child agent and wait, then answer ALL_SCENARIOS_DONE.']);
sid=first.events.find(x=>x.type==='thread.started')?.thread_id;
firstActivation=activation(sid);
rootStep=0;spawnedAgent='';iteration=2;
second=sid?await runTurn(['exec','resume','--json',sid,'Repeat the isolated acceptance actions in this resumed session, including one child agent.']):null;
secondActivation=activation(sid);
} catch(error) {
  writeFileSync(join(root,'failure.json'),JSON.stringify({error:error.stack,first,second},null,2));
  throw new Error(`Native lifecycle failed; evidence: ${root}`,{cause:error});
} finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
const hooks=readFileSync(hookLog,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const allEvents=[...first.events,...(second?.events||[])];
const denied=hooks.filter(x=>x.status!==0||/"permissionDecision":"deny"|"continue":false/.test(x.output));
const requests=readFileSync(requestLog,'utf8').split('\n').filter(Boolean).map(JSON.parse);
const toolErrors=requests.flatMap(x=>x.input||[]).filter(x=>(x.type==='function_call_output'||x.type==='custom_tool_call_output')&&/unsupported call:|failed to parse function arguments:|hook.*blocked|Process exited with code [1-9]|Exit code: [1-9]/i.test(x.output));
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
if(failures.length) {console.error(failures.join('; '));process.exitCode=1;}
