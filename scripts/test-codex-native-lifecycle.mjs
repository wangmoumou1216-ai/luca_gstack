#!/usr/bin/env node
// Opt-in real CLI regression; all model responses come from a loopback-only stub.
// Keeps the isolated fixture/result.json for diagnosis. Never changes installed hooks.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, cpSync, realpathSync, chmodSync, readdirSync, symlinkSync} from 'node:fs';
import {join, dirname, resolve, relative, delimiter} from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import { cleanupNativeEvidence, evidenceOptions, moduleSourceFiles, nativeEvidence } from './native-test-evidence.mjs';

const recoveryDirect = process.argv.includes('--recovery-direct');
const recoveryContinuation = process.argv.includes('--recovery-continuation');
const recoveryMode = recoveryDirect || recoveryContinuation || process.argv.includes('--critical-recovery');
const continuationMode = process.argv.includes('--continuation');
assert.ok(!continuationMode || !recoveryMode, 'select one lifecycle scenario');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
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
let binary, python, pythonUserBase, git;
try {
  binary = realpathSync(process.env.CODEX_BIN || checked('which', ['codex']));
  python = checked('which', ['python3']);
  pythonUserBase = checked(python, ['-m', 'site', '--user-base']);
  checked(python, ['-c', 'import yaml'], {env: {...baseEnv, PYTHONUSERBASE: pythonUserBase}});
  git = realpathSync(checked('which', ['git']));
  checked(git, ['--version']); checked('tar', ['--version']);
} catch (error) {
  console.log(`SKIP native Codex lifecycle: requires Codex CLI, git, tar and Python 3 with PyYAML (${error.message})`);
  process.exit(process.argv.includes('--require-native') || recoveryMode ? 1 : 0);
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
// Prevent fixture-resolved Git transports even if plugin defaults regress.
// This is a Git-network fence, not a general OS network sandbox.
const gitNetworkLog=join(root,'git-network-attempts.jsonl');
const gitShim=join(bin,'git');
writeFileSync(gitShim,`#!${process.execPath}
import {appendFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2);let i=0;
while(i<args.length&&args[i].startsWith('-')) {
  if(['-C','-c','--git-dir','--work-tree','--namespace','--config-env'].includes(args[i]))i+=2;else i++;
}
const verb=args[i],rest=args.slice(i+1);
const network=['fetch','pull','push','clone','ls-remote','send-pack','receive-pack','upload-pack'].includes(verb)
  ||(verb==='remote'&&rest.includes('update'))||(verb==='submodule'&&rest.includes('update'));
if(network) {
  appendFileSync(${JSON.stringify(gitNetworkLog)},JSON.stringify({args,blocked:true})+'\\n');
  process.stderr.write('ISOLATED_GIT_NETWORK_DENIED\\n');process.exit(126);
}
const result=spawnSync(${JSON.stringify(git)},args,{stdio:'inherit',env:process.env});process.exit(result.status??127);
`);chmodSync(gitShim,0o700);
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
const overlays = ['.codex/hooks.json','.codex/model-route-hook.mjs','.codex/workflow-runner.mjs',
  'scripts/model-route-host.mjs','scripts/model-route.mjs','scripts/codex-review-recovery.mjs','scripts/codex-hook-health.mjs',
  '.claude/skill-os/model-routing.yaml','scripts/codex-trust-hooks.mjs',
  '.codex/codex-hook-adapter.mjs', 'scripts/controlled-change-controller.mjs', 'scripts/controlled-native-owner.mjs',
  'scripts/controlled-change.mjs', '.claude/hooks/controlled-change-guard.mjs', '.claude/hooks/project-scope-guard.mjs',
  '.claude/hooks/session-restore.mjs', '.claude/hooks/lib/harness.mjs'];
for(const path of overlays) cpSync(join(repo,path),join(work,path));
const candidateBytes = overlays.map(path=>({path,sha256:hash(readFileSync(join(repo,path)))}));
for(const row of candidateBytes)assert.equal(hash(readFileSync(join(work,row.path))),row.sha256,'native overlay must match candidate bytes');
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

const recoveryDescriptorPath=join(root,'recovery-descriptor.json'), recoveryAuthorizationPath=join(root,'recovery-authorization.json');
if(recoveryMode) {
  const descriptor={schema_version:1,read_only:true,agent_type:'quality-gate',fork_turns:'none',
    files:[{path:join(work,'README.md'),sha256:hash(readFileSync(join(work,'README.md')))}],
    criteria:[{id:'NATIVE-1',text:'Read and report on the frozen README'}],authorization_ref:'isolated-native-user-prompt'};
  writeFileSync(recoveryDescriptorPath,JSON.stringify(descriptor));
  writeFileSync(recoveryAuthorizationPath,JSON.stringify({approved:true,descriptor_sha:hash(readFileSync(recoveryDescriptorPath)),
    user_source_ref:descriptor.authorization_ref,effect:'independent-readonly-review'}));
}
if (controlledMode) writeFileSync(join(work, 'controlled-target.txt'), 'before\n');
if (concurrentMode) {
  writeFileSync(join(work, 'controlled-second.txt'), 'before B\n');
  writeFileSync(join(work, 'controlled-verification.mjs'), `import test from 'node:test';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import{readFileSync}from'node:fs';test('both edits',()=>{assert.equal(readFileSync('controlled-target.txt','utf8'),'after\\n');assert.equal(readFileSync('controlled-second.txt','utf8'),'after B\\n')});`);
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
let requestCount = 0; let rootStep=0; let spawnedAgent=''; let iteration=1; let spawnCallId=''; let recoveryChildRequests=0;
const parentReported=new Set();
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
    // The native task envelope identifies the child independently of its
    // opaque task message. Do not pretend to decode encrypted_content.
    const reportingChild=(parsed.input||[]).find(row=>row.type==='agent_message'
      &&/^\/root\/hook_smoke_child_\d+$/.test(row.recipient||''))?.recipient;
    let item;
    const message=text=>({type:'message',role:'assistant',id:'msg_'+requestCount,content:[{type:'output_text',text}]});
    const call=(name,args,namespace)=>({type:'function_call',id:'fc_'+requestCount,call_id:'call_'+requestCount,name,arguments:JSON.stringify(args),...(namespace?{namespace}:{})});
    if(recoveryMode) {
      const isRoot=lastUser.includes('Isolated framework acceptance:')||lastUser.includes('Repeat the isolated acceptance');
      if(!isRoot) {
        recoveryChildRequests++;
        if(recoveryChildRequests===(recoveryContinuation?2:1)) {
          response.writeHead(200,{'Content-Type':'text/event-stream'});
          response.write('event: response.created\ndata: {"type":"response.created","response":{"id":"interrupted-child"}}\n\n');return;
        }
        const report={descriptor_sha:hash(readFileSync(recoveryDescriptorPath)),criteria:[{id:'NATIVE-1',status:'PASS',evidence:'Loopback lifecycle response only; real provider reading is separately verified.'}]};
        const envelope={schema_version:1,producer:'quality-gate',eval_run_id:'fixture-native-'+requestCount,
          subject:{skill:'native-lifecycle',topic:'report framing',scene:'unknown',input_summary:'Loopback lifecycle only',
            output_paths:[recoveryDescriptorPath],duration:'lightweight'},verdict:{status:'PASS',passed:1,total:1,findings:[]}};
        item=message('REVIEW_RECOVERY_REPORT_JSON\n'+JSON.stringify(report)+'\n\nEVAL_ENVELOPE_JSON\n'+JSON.stringify(envelope));
      } else {
        const shell=cmd=>recoveryDirect?call('exec_command',{cmd,max_output_tokens:2000}):
          ({type:'custom_tool_call',id:'ct_'+requestCount,call_id:'call_'+requestCount,
          name:'exec',namespace:'functions',input:`text(await tools.exec_command({cmd:${JSON.stringify(cmd)},max_output_tokens:2000}));`});
        const rootState=activeSession?activation(activeSession):null;
        rootStep++;
        const stage=recoveryContinuation&&rootStep>6?rootStep-3:rootStep;
        if(recoveryContinuation&&rootStep<=6) {
          if(rootStep===1) {spawnCallId='call_'+requestCount;item=call('spawn_agent',{agent_type:'quality-gate',task_name:'recovery_original',message:'CHILD: complete the first review.',fork_turns:'none'},'collaboration');}
          else if(rootStep===2) {
            const output=(parsed.input||[]).find(x=>x.type==='function_call_output'&&x.call_id===spawnCallId);
            spawnedAgent=JSON.parse(output.output).task_name;item=call('wait_agent',{timeout_ms:10000},'collaboration');
          } else if(rootStep===3)item=call('followup_task',{target:spawnedAgent,message:'CHILD: continue this critical review until interrupted.'},'collaboration');
          else if(rootStep===4)item=call('interrupt_agent',{target:spawnedAgent},'collaboration');
          else if(rootStep===5)item=call('spawn_agent',{agent_type:'default',task_name:'must_not_start_before_resume',message:'Must be denied after the critical followup abort.',fork_turns:'none'},'collaboration');
          else item=message('INTERRUPTED_FOLLOWUP_RETAINED');
        } else if(stage===1){spawnCallId='call_'+requestCount;item=call('spawn_agent',{agent_type:'quality-gate',task_name:'recovery_original',message:'CHILD: hold this review until interrupted.',fork_turns:'none'},'collaboration');}
        else if(stage===2) {
          const output=(parsed.input||[]).find(x=>x.type==='function_call_output'&&x.call_id===spawnCallId);
          spawnedAgent=JSON.parse(output.output).task_name;item=call('interrupt_agent',{target:spawnedAgent},'collaboration');
        } else if(stage===3)item=message('INTERRUPTED_REVIEW_RETAINED');
        else if(stage===4)item=call('spawn_agent',{agent_type:'default',task_name:'must_not_start',message:'This must be rejected while the review is open.',fork_turns:'none'},'collaboration');
        else if(stage===5)item=shell(`node scripts/codex-review-recovery.mjs inspect --session ${activeSession}`);
        else if(stage===6) {
          const stateFile=readdirSync(join(root,'state/codex')).filter(p=>p.endsWith('.json')).map(p=>join(root,'state/codex',p)).find(p=>JSON.parse(readFileSync(p)).root_session_id===activeSession);
          item=shell(`node scripts/codex-review-recovery.mjs reserve --descriptor '${recoveryDescriptorPath}' --expected-state-sha ${hash(readFileSync(stateFile))} --authorization '${recoveryAuthorizationPath}'`);
        } else if(stage===7)item=call('followup_task',{target:spawnedAgent,message:'Must be fenced before old child restarts.'},'collaboration');
        else if(stage===8)item=call('send_message',{target:Object.keys(rootState.retired_agents||{})[0]||'missing-retired-id',message:'Must be fenced.'},'collaboration');
        else if(stage===9){const ticket=Object.values(rootState.recovery_reservations||{})[0];item=call('spawn_agent',{agent_type:'quality-gate',task_name:ticket?.task_name||'missing_reservation',message:'Complete the frozen descriptor at '+recoveryDescriptorPath+'; return REVIEW_RECOVERY_REPORT_JSON.',fork_turns:'none'},'collaboration');}
        else if(stage===10||stage===12)item=call('wait_agent',{timeout_ms:10000},'collaboration');
        else if(stage===11)item=call('spawn_agent',{agent_type:'default',task_name:'after_recovery',message:'Normal dispatch after the review completed.',fork_turns:'none'},'collaboration');
        else item=message('RECOVERY_SCENARIOS_DONE');
      }
    } else if (controlledMode) {
      const flatten = (tools, namespace = '') => (tools || []).flatMap(tool => tool.type === 'namespace'
        ? flatten(tool.tools, tool.name) : [{ name: tool.name, namespace, type: tool.type }]);
      const offered = flatten([...(parsed.tools || []), ...(parsed.input || []).filter(row => row.type === 'additional_tools').flatMap(row => row.tools || [])]);
      const wrapper = offered.find(tool => tool.name === 'exec');
      const program = controlledPrograms[rootStep++];
      item = program && wrapper ? { type: 'custom_tool_call', id: 'ct_' + requestCount,
        call_id: 'call_' + requestCount, name: wrapper.name, namespace: wrapper.namespace, input: program }
        : message(program ? 'WRAPPER_MISSING' : 'CONTROLLED_OWNER_DONE');
    } else if(continuationMode&&reportingChild&&!parentReported.has(reportingChild)) {
      parentReported.add(reportingChild);
      item=call('send_message',{target:'..',message:'Native child progress report.'},'collaboration');
    } else if(!lastUser.includes('Isolated framework acceptance:')&&!lastUser.includes('Repeat the isolated acceptance')) item=message('CHILD_DONE');
    else {
      if (rootStep === 0) {
        try { activeEvidence?.before({ ready: Array.isArray(parsed.input) && parsed.input.length > 0 && Boolean(activeSession),
          endpoint: request.url, native_session_id: activeSession, request_keys: Object.keys(parsed), request_number: requestCount }); }
        catch (error) { response.writeHead(500); response.end(error.stack); return; }
      }
      rootStep++;
      if(rootStep===1) item=call('exec_command',{cmd:'head -1 README.md scripts/codex-review-recovery.mjs',max_output_tokens:150});
      else if(rootStep===2) item=call('exec_command',{cmd:"printf 'hook-test\\n' > incident-probe.txt",max_output_tokens:100});
      else if(rootStep===3) item=call('exec_command',{cmd:'cat incident-probe.txt',max_output_tokens:100});
      else if(rootStep===4) item={type:'custom_tool_call',id:'ct_'+requestCount,call_id:'call_'+requestCount,name:'apply_patch',input:'*** Begin Patch\n*** Update File: incident-probe.txt\n@@\n-hook-test\n+hook-patch-tested\n*** End Patch'};
      else if(rootStep===5) { spawnCallId='call_'+requestCount; item=call('spawn_agent',{agent_type:continuationMode?'quality-gate':'default',task_name:'hook_smoke_child_'+iteration,message:(continuationMode?'CHILD_REPORT_PARENT: Report to your parent once, then reply CHILD_DONE.':'CHILD_SMOKE: Reply CHILD_DONE only.'),fork_turns:'none'},'collaboration'); }
      else if(rootStep===6) {
        for(const input of parsed.input||[]) if(input.type==='function_call_output'&&input.call_id===spawnCallId) {
          try { const obj=JSON.parse(input.output); spawnedAgent=obj.agent_id||obj.task_name||spawnedAgent; } catch {}
        }
        item=spawnedAgent?call('wait_agent',{timeout_ms:10000},'collaboration'):message('SPAWN_FAILED');
      } else if(continuationMode&&rootStep===7) item=call('send_message',
        {target:spawnedAgent,message:'Queue this for later; do not start a new turn.'},'collaboration');
      else if(continuationMode&&rootStep===8) item=call('followup_task',
        {target:'./'+spawnedAgent.split('/').at(-1),message:'CHILD_SMOKE: Continue once and reply CHILD_DONE only.'},'collaboration');
      else if(continuationMode&&rootStep===9) item=call('wait_agent',{timeout_ms:10000},'collaboration');
      else if(continuationMode&&rootStep===10) item=call('spawn_agent',
        {agent_type:'default',task_name:'after_continuation_'+iteration,message:'CHILD_SMOKE: Reply CHILD_DONE only.',fork_turns:'none'},'collaboration');
      else if(continuationMode&&rootStep===11) item=call('wait_agent',{timeout_ms:10000},'collaboration');
      else item=message('ALL_SCENARIOS_DONE');
    }
    const events=[{type:'response.created',response:{id:'resp_'+requestCount}},{type:'response.output_item.done',item},completed('resp_'+requestCount)];
    response.writeHead(200, {'content-type':'text/event-stream','cache-control':'no-cache'});
    response.end(sse(events));
  });
});

await new Promise((resolve,reject) => {server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const port = server.address().port;
const configPath = join(home, 'config.toml');
writeFileSync(configPath, `model = "gpt-6.1-sol"\nmodel_provider = "localstub"\napproval_policy = "never"\nsandbox_mode = "danger-full-access"\nmodel_reasoning_effort = "low"\ncheck_for_update_on_startup = false\nsuppress_unstable_features_warning = true\n[features]\nhooks = true\napps = false\nplugins = false\nremote_plugin = false\nplugin_sharing = false\nrecommended_plugins = false\ndaemon_auto_start = false\nmulti_agent = true\n[model_providers.localstub]\nname = "Local offline stub"\nbase_url = "http://127.0.0.1:${port}/v1"\nenv_key = "LOCAL_STUB_KEY"\nwire_api = "responses"\nsupports_websockets = false\nrequest_max_retries = 0\nstream_max_retries = 0\n[projects.${JSON.stringify(work)}]\ntrust_level = "trusted"\n`);

const isolatedEnv = {...baseEnv,NODE_ENV:'test',PYTHONUSERBASE:pythonUserBase,LUCA_EVENT_ATTESTATION_TEST:'1',LUCA_CONTROLLED_TEST_HOME:isolatedHome,LUCA_MODEL_ROUTE_STATE_ROOT:join(root,'state'),LUCA_MODEL_ROUTE_BINDINGS_PATH:bindings,LUCA_MODEL_ROUTE_TRANSCRIPT_ROOT:join(home,'sessions'),LUCA_CHILD_PROJECT_STORE_ROOT:join(root,'child-store'),LUCA_CHILD_PROJECT_TEST_CODEX_HOME:home,LUCA_PROJECTS_ROOT:join(root,'projects'),MEMORY_ROOT:work,HOME:isolatedHome,CODEX_HOME:home,LOCAL_STUB_KEY:'offline',NO_PROXY:'127.0.0.1,localhost',no_proxy:'127.0.0.1,localhost'};
const featureState=checked(binary,['features','list'],{env:isolatedEnv,cwd:work});
for(const name of ['plugins','remote_plugin','plugin_sharing','recommended_plugins']) {
  assert.match(featureState,new RegExp('^'+name+'\\s+\\S+\\s+false$','m'),'fixture disables '+name);
}
const gitProbe=spawnSync('git',['-C',work,'-c','safe.bareRepository=explicit','ls-remote','https://example.invalid/never-contact'],
  {env:isolatedEnv,encoding:'utf8'});
assert.equal(gitProbe.status,126,'Git transport denied before execution');
assert.match(gitProbe.stderr,/ISOLATED_GIT_NETWORK_DENIED/);
writeFileSync(join(root,'isolation-setup.json'),JSON.stringify({featureState,gitProbe:{status:gitProbe.status,stderr:gitProbe.stderr}},null,2));
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
const prompt=recoveryMode
  ? 'Isolated framework acceptance: I authorize the isolated interrupted review and one replacement independent read-only review. Frozen descriptor '+recoveryDescriptorPath
    +' SHA256 '+hash(readFileSync(recoveryDescriptorPath))+'. Its entire files/criteria scope is '+readFileSync(recoveryDescriptorPath,'utf8')
    +'. Interrupt the original review, retain its obligation across restart, reserve the replacement and verify the old-child fences; then complete the replacement and verify ordinary dispatch.'
  : 'Isolated framework acceptance: read README.md, create and edit incident-probe.txt, read it back, explicitly spawn one default child agent and wait'
    +(continuationMode?', authorize that child to report to its parent, queue an idle message, follow up that child once, wait for completion and dispatch one further child':'')+', then answer ALL_SCENARIOS_DONE.';
first=await runTurn(['exec','--json','--skip-git-repo-check','--sandbox','danger-full-access','-C',work,prompt]);
sid=first.events.find(x=>x.type==='thread.started')?.thread_id;
firstActivation=activation(sid);
rootStep=recoveryMode?(recoveryContinuation?6:3):0;if(!recoveryMode)spawnedAgent='';iteration=2;
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
const gitAttempts=readFileSync(gitNetworkLog,'utf8').trim().split('\n').map(JSON.parse);
const isolationChecks={pluginsDisabled:true,gitProbeBlocked:gitAttempts.length===1
  &&gitAttempts[0].args.at(-1)==='https://example.invalid/never-contact',
  noPluginClone:!readdirSync(home,{recursive:true}).some(p=>p.includes('plugins-clone-'))};
writeFileSync(join(root,'isolation-result.json'),JSON.stringify({checks:isolationChecks,gitAttempts,featureState},null,2));
assert.ok(Object.values(isolationChecks).every(Boolean),'fixture must not synchronize external plugins');
const hooks=readFileSync(hookLog,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const allEvents=[...first.events,...(second?.events||[])];
const denied=hooks.filter(x=>x.status!==0||/"permissionDecision":"deny"|"continue":false/.test(x.output));
const requests=readFileSync(requestLog,'utf8').split('\n').filter(Boolean).map(JSON.parse);
const toolErrors=requests.flatMap(x=>x.input||[]).filter(x=>(x.type==='function_call_output'||x.type==='custom_tool_call_output')&&/unsupported call:|agent_name.*reserved|failed to parse function arguments:|hook.*blocked|Process exited with code [1-9]|Exit code: [1-9]/i.test(x.output));
const traceFiles=[];
function collectTraces(folder) {
  for(const entry of readdirSync(folder,{withFileTypes:true})) {
    const path=join(folder,entry.name);
    if(entry.isDirectory())collectTraces(path);
    else if(entry.name.endsWith('.jsonl'))traceFiles.push(path);
  }
}
collectTraces(join(home,'sessions'));
const nativeTraces=traceFiles.map(path=>({path,rows:readFileSync(path,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)}));
if(continuationMode) {
  const intents=Object.values(secondActivation?.resume_intents||{}),calls=Object.values(secondActivation?.invocations||{});
  const continuationCalls=nativeTraces.flatMap(t=>t.rows.filter(r=>r.type==='response_item'
    &&r.payload?.type==='function_call'&&r.payload.namespace==='collaboration'
    &&['send_message','followup_task'].includes(r.payload.name)).map(r=>({trace:t,call:r.payload})));
  const continuationResults=continuationCalls.map(({trace,call})=>({call_id:call.call_id,name:call.name,
    arguments:JSON.parse(call.arguments),results:trace.rows.filter(r=>r.type==='response_item'
      &&r.payload?.type==='function_call_output'&&r.payload.call_id===call.call_id).map(r=>r.payload.output)}));
  // Replay the actual recorded Stop payload only after its intent has settled.
  // This is callback fault injection, not a claim that the CLI emitted it twice.
  const continuationStopReplays=intents.filter(i=>i.kind==='followup_task').map(intent=> {
    const stop=hooks.findLast(h=>h.payload.hook_event_name==='SubagentStop'&&h.payload.agent_id===intent.agent_id);
    if(!stop)return {agent_id:intent.agent_id,pass:false,reason:'missing native stop'};
    const transcriptBefore=hash(readFileSync(stop.payload.agent_transcript_path));
    const stateBefore=hash(JSON.stringify(activation(sid)));
    const replay=spawnSync(process.execPath,[join(work,'.codex/model-route-hook.mjs')],
      {input:JSON.stringify(stop.payload),cwd:work,env:isolatedEnv,encoding:'utf8',timeout:35000});
    return {agent_id:intent.agent_id,invocation_id:intent.invocation_id,
      terminal_turn:intent.terminal_proof?.native_turn_id,exit:replay.status,stdout:replay.stdout,stderr:replay.stderr,
      pass:replay.status===0&&replay.stdout.trim()==='{}'
        &&stateBefore===hash(JSON.stringify(activation(sid)))
        &&transcriptBefore===hash(readFileSync(stop.payload.agent_transcript_path))};
  });
  const checks={bothExits:first.status===0&&second?.status===0,
    duplicateStopReplays:continuationStopReplays.length===2&&continuationStopReplays.every(r=>r.pass),
    nativeMessageResults:continuationResults.length===6
      &&continuationResults.every(r=>r.results.length===1&&r.results[0]===''),noErrors:!denied.length&&!toolErrors.length
      &&!allEvents.some(e=>['turn.failed','error'].includes(e.type)),
    exactlyTwoContinuations:intents.filter(i=>i.kind==='followup_task').length===2
      &&intents.filter(i=>i.kind==='followup_task').every(i=>i.status==='completed'&&i.terminal_proof?.native_turn_id!==i.child_turn_before),
    exactlyTwoIdleQueues:intents.length===4&&intents.filter(i=>i.kind==='send_message').length===2
      &&intents.filter(i=>i.kind==='send_message').every(i=>i.status==='completed'&&i.terminal_proof?.native_turn_id===i.child_turn_before),
    exactlyTwoParentReports:new Set(hooks.filter(h=>h.payload.tool_name==='collaborationsend_message'
      &&h.payload.tool_input?.target==='..'&&h.status===0&&!h.output.includes('deny'))
      .map(h=>h.payload.tool_use_id)).size===2,
    subsequentDispatchAccepted:calls.length===4&&calls.every(c=>c.status==='accepted'),
    retainedFirstCalls:Object.keys(firstActivation?.invocations||{}).length===2
      &&Object.keys(firstActivation?.invocations||{}).every(id=>secondActivation?.invocations?.[id]?.status==='accepted'),
    sameActivation:firstActivation?.activation_id===secondActivation?.activation_id,
    exactlySixStops:hooks.filter(h=>h.payload.hook_event_name==='SubagentStop').length===6,
    noLatch:secondActivation?.critical_failure===false};
  const result={pass:Object.values(checks).every(Boolean),checks,root,first,second,firstActivation,secondActivation,candidateBytes,denied,toolErrors,continuationResults,continuationStopReplays};
  writeFileSync(join(root,'continuation-result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({pass:result.pass,checks,evidence:join(root,'continuation-result.json')}));
  process.exit(result.pass?0:1);
}
if(recoveryMode) {
  const callRows=Object.values(secondActivation?.invocations||{}),obligations=Object.values(secondActivation?.review_obligations||{});
  const original=callRows.find(x=>x.retired_by_recovery_id&&!x.recovery_id),replacement=callRows.find(x=>x.recovery_id);
  const sourceIntent=Object.values(secondActivation?.resume_intents||{}).find(i=>i.review_obligation_id);
  const interruptedTurn=recoveryContinuation?sourceIntent?.terminal_proof?.native_turn_id:original?.interruption?.native_turn_id;
  const originalTrace=nativeTraces.find(t=>t.rows[0]?.payload?.id===original?.external_identity?.agent_id);
  const aborts=originalTrace?.rows.filter(r=>r.type==='turn_aborted'||r.payload?.type==='turn_aborted')||[];
  const originalTurns=new Set(originalTrace?.rows.filter(r=>r.type==='turn_context').map(r=>r.payload.turn_id));
  const expectedDenial=/UNRESOLVED_REVIEW_OBLIGATION|RETIRED_REVIEW_AGENT/;
  let interruptedStopReplay=null;
  if(recoveryContinuation&&originalTrace) {
    // Fault-inject the original callback against the now interrupted/retired
    // native child; it must not erase history or accept the aborted later turn.
    const stop=hooks.find(h=>h.payload.hook_event_name==='SubagentStop'&&h.payload.agent_id===original.external_identity.agent_id);
    const before=hash(JSON.stringify(activation(sid))),transcript=hash(readFileSync(originalTrace.path));
    const replay=stop&&spawnSync(process.execPath,[join(work,'.codex/model-route-hook.mjs')],
      {input:JSON.stringify(stop.payload),cwd:work,env:isolatedEnv,encoding:'utf8',timeout:35000});
    interruptedStopReplay={exit:replay?.status,stdout:replay?.stdout,stderr:replay?.stderr,
      pass:replay?.status===0&&replay.stdout.trim()==='{}'&&before===hash(JSON.stringify(activation(sid)))
        &&transcript===hash(readFileSync(originalTrace.path))};
  }
  const checks={bothExits:first.status===0&&second?.status===0,sameActivation:firstActivation?.activation_id===secondActivation?.activation_id,
    originalRetained:!!original&&Object.values(firstActivation?.invocations||{}).length===1,
    singleReplacement:callRows.filter(x=>x.recovery_id).length===1&&replacement?.status==='accepted',
    obligationComplete:obligations.length===1&&obligations[0].status==='COMPLETED',
    ordinaryAllowed:callRows.some(x=>!x.critical&&x.status==='accepted'),
    noLatch:secondActivation?.critical_failure===false,
    preEffectFences:['collaborationfollowup_task','collaborationsend_message'].every(name=>hooks.some(x=>x.payload.tool_name===name&&x.output.includes('RETIRED_REVIEW_AGENT'))),
    openReviewDenied:hooks.some(x=>x.payload.tool_input?.task_name==='must_not_start'&&x.output.includes('UNRESOLVED_REVIEW_OBLIGATION')),
    exactChildRequests:recoveryChildRequests===(recoveryContinuation?4:3),
    attributedActualAbort:aborts.length===1&&(aborts[0].payload?.turn_id||aborts[0].turn_id)===interruptedTurn,
    oldChildNeverResumed:originalTurns.size===(recoveryContinuation?2:1)&&originalTurns.has(interruptedTurn)
      &&originalTrace?.rows.filter(r=>r.payload?.type==='task_complete').length===(recoveryContinuation?1:0),
    interruptedCallback:!recoveryContinuation||interruptedStopReplay?.pass===true,
    historicalAcceptance:!recoveryContinuation||(original?.status==='accepted'&&sourceIntent?.status==='interrupted'
      &&obligations[0]?.continuation_operation_id===sourceIntent.operation_id
      &&Object.values(firstActivation?.review_obligations||{})[0]?.status==='OPEN'),
    beforeResumeBlocked:!recoveryContinuation||hooks.some(x=>x.payload.tool_input?.task_name==='must_not_start_before_resume'
      &&x.output.includes('UNRESOLVED_REVIEW_OBLIGATION')),
    noUnexpectedFailures:denied.length===(recoveryContinuation?4:3)&&denied.every(h=>h.status===0&&expectedDenial.test(h.output))
      &&toolErrors.every(e=>expectedDenial.test(e.output))&&!allEvents.some(e=>['turn.failed','error'].includes(e.type))};
  const result={pass:Object.values(checks).every(Boolean),checks,root,first,second,firstActivation,secondActivation,candidateBytes,
    scope:'Real CLI lifecycle against loopback provider; no claim of real model file reading.',denied,toolErrors,interruptedStopReplay};
  writeFileSync(join(root,recoveryContinuation?'continuation-recovery-result.json':'critical-recovery-result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({pass:result.pass,checks,evidence:join(root,recoveryContinuation?'continuation-recovery-result.json':'critical-recovery-result.json')}));
  process.exit(result.pass?0:1);
}
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
check([first,second].every(turn=>turn.events.some(event=>event.type==='item.completed'
  &&event.item?.type==='command_execution'&&event.item.exit_code===0
  &&event.item.aggregated_output?.includes('==> scripts/codex-review-recovery.mjs <=='))),
  'ordinary native file reads mentioning the recovery entry execute successfully');
check(result.finalFile==='hook-patch-tested\n','patch produced exact expected file');
const firstIds = Object.keys(firstActivation?.invocations || {});
const secondIds = Object.keys(secondActivation?.invocations || {});
check(firstIds.length === 1 && secondIds.length === 2 && secondIds.includes(firstIds[0])
  && secondIds.filter(id => !firstIds.includes(id)).length === 1
  && firstActivation.activation_id === secondActivation.activation_id,
  'resume retains the first invocation and accepts exactly one new invocation');
for(const [index,state] of [firstActivation,secondActivation].entries()) {
  check(state && state.status==='paused' && state.critical_failure===false,`turn ${index+1} activation ended cleanly`);
  const invocations=Object.values(state?.invocations||{}), preparations=Object.values(state?.preparations||{});
  // A resumed root retains accepted history; only the first turn has one call.
  // Every retained call must still be independently accepted with its own evidence.
  check(invocations.length === index + 1 && invocations.every(call=>call.status==='accepted' && call.evidence_ref?.startsWith('codex-transcript:')),`turn ${index+1} adopted same-invocation success evidence`);
  check(!preparations.some(call=>['pending','invalidated'].includes(call.status)),`turn ${index+1} has no unresolved critical preparation`);
}
result.failures=failures;result.pass=failures.length===0;
writeFileSync(join(root,'result.json'),JSON.stringify(result,null,2));
console.log(`${result.pass?'PASS':'FAIL'} native Codex lifecycle: ${hooks.length} hook events, ${new Set(hooks.map(event=>event.entry)).size}/11 registrations; evidence: ${join(root,'result.json')}`);
if (audit) {
  const rawRequests = readFileSync(requestLog, 'utf8'), rawHooks = readFileSync(hookLog, 'utf8');
  turnEvidence.forEach((turn, index) => {
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
        accepted_same_invocation: invocations.length === index + 1 && invocations.every(call => call.status === 'accepted' && call.evidence_ref?.startsWith('codex-transcript:')),
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
