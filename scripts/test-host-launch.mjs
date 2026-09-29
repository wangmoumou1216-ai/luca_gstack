import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, realpathSync, readdirSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fork, execFile } from 'node:child_process';
import { connect } from 'node:net';
import { createHostLaunchBroker, fileIdentity } from '../.claude/hooks/lib/host-launch.mjs';
import { queueProjectEventCandidate, readProjectState, canonicalProjectIdentity } from '../.claude/hooks/lib/project-substrate.mjs';
import { captureNativeEventFence, hostLaunchJournalRoot, readHostLaunchSourceScope, resolveCodexHome } from '../.claude/hooks/lib/event-attestation.mjs';
import { executeProjectTransaction } from './project-pin.mjs';

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
  const journal = hostLaunchJournalRoot(f.gstackRoot);
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
  const root = realpathSync(mkdtempSync('/private/tmp/host-launch-'));
  const gstackRoot = join(root, 'gstack'), projectsRoot = join(root, 'projects'), sourceRoot = join(root, 'sidecar');
  for (const path of [join(gstackRoot, '.claude'), projectsRoot, join(sourceRoot, 'sessions', '2026', '09', '27')]) mkdirSync(path, { recursive: true });
  const config = join(root, 'settings.json'); writeFileSync(config, '{"profile":"sidecar"}');
  const binary = process.execPath;
  const sid = randomUUID(), turn = randomUUID();
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

async function attached(f, project = false) {
  if (project) {
    mkdirSync(join(f.projectsRoot,'alpha'));
    f.request.projectIdentity=canonicalProjectIdentity('alpha',f.projectsRoot);
  }
  const p=await f.broker.parent('prepare',f.request);
  await f.broker.parent('dispatch',{launchId:p.launchId,operationId:f.request.operationId,launchNonce:p.launchNonce});
  const claim={...p,hostRunId:f.request.hostRunId,openRequestId:f.request.openRequestId,nativePayload:f.payload};
  await f.broker.claim('attach',claim);
  return claim;
}
test('project launch commits through the actual controller with one matching native receipt',async()=>{
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
test('cancel wins before commit and cannot be revived by a late native callback',async()=>{
  const f=fixture(),claim=await attached(f,true),payload=f.appendHuman();
  await f.broker.parent('cancel',{launchId:claim.launchId,operationId:f.request.operationId});
  await assert.rejects(f.broker.claim('beforeTool',{...claim,nativePayload:payload}),{code:'CLAIM_REJECTED'});
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
test('same operation is idempotent but changed payload and second dispatch are rejected',async()=>{
  const f=fixture(),p=await f.broker.parent('prepare',f.request);
  assert.equal((await f.broker.parent('prepare',f.request)).launchId,p.launchId);
  await assert.rejects(f.broker.parent('prepare',{...f.request,openRequestId:randomUUID()}),{code:'OPERATION_CONFLICT'});
  await f.broker.parent('dispatch',{launchId:p.launchId,operationId:f.request.operationId,launchNonce:p.launchNonce});
  await assert.rejects(f.broker.parent('dispatch',{launchId:p.launchId,operationId:f.request.operationId,launchNonce:p.launchNonce}),{code:'DISPATCH_REJECTED'});
});
test('profile config drift or failed main revalidation prevents project commit',async()=>{
  const f=fixture(),claim=await attached(f,true),payload=f.appendHuman();
  writeFileSync(f.config,'{"profile":"different"}');
  await assert.rejects(f.broker.claim('beforeTool',{...claim,nativePayload:payload}),{code:'IDENTITY_CHANGED'});
  assert.equal(readProjectState(f.gstackRoot,f.sid).value.state,'NO_PIN');
  const g=fixture({revalidateProfile:async()=>null}),other=await attached(g,true),human=g.appendHuman();
  await assert.rejects(g.broker.claim('beforeTool',{...other,nativePayload:human}),{code:'PROFILE_CHANGED'});
});
test('profile identifiers must be normalized nonempty strings',async()=>{
  const f=fixture();
  for(const patch of [{profileId:' '},{configRevision:' '},{profileId:' codex:sidecar'},
    {configRevision:'e\u0301'}]) {
    await assert.rejects(f.broker.parent('prepare',{...f.request,
      profileIdentity:{...f.request.profileIdentity,...patch}}),{code:'PROFILE_INVALID'});
  }
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
  const claim=await attached(f,true),payload=f.appendHuman();
  await assert.rejects(f.broker.claim('beforeTool',{...claim,nativePayload:payload}),/lost acknowledgement/);
  assert.equal(readProjectState(f.gstackRoot,f.sid).value.binding.project,'alpha');
  const receipt=await f.broker.parent('readReceipt',{launchId:claim.launchId});assert.equal(receipt.status,'COMMITTED');
  assert.equal((await f.broker.claim('beforeTool',{...claim,nativePayload:payload})).receipt.operationId,receipt.receipt.operationId);
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
  const claim=await attached(f,true),payload=f.appendHuman();
  await assert.rejects(f.broker.claim('beforeTool',{...claim,nativePayload:payload}),/ack gap/);
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
    assert.equal(readProjectState(f.gstackRoot,f.sid).value.state,'NO_PIN');
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
test('production broker refuses an unprotected App-style fork before importing framework authority',async()=>{
  const production=realpathSync(new URL('..',import.meta.url));
  const f=fixture();
  const script=new URL('./host-launch-broker.mjs',import.meta.url);
  const child=fork(script,[production,f.projectsRoot],{
    silent:true,env:{...process.env,NODE_OPTIONS:'',LUCA_PROTECTED_CODE_ROOT:''},
  });
  let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
  const code=await new Promise(resolve=>child.once('exit',resolve));
  assert.notEqual(code,0);
  assert.match(stderr,/HOST_SOURCE_UNPROTECTED/);
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
test('grant corruption refuses source scope instead of silently widening the source root',async()=>{
  const f=fixture(),claim=await attached(f);
  const path=join(f.gstackRoot,'.claude','host-launch',`${claim.launchId}.source.json`);
  const bytes=readFileSync(path);writeFileSync(path,'{}');
  assert.throws(()=>readHostLaunchSourceScope(f.gstackRoot,f.sid));
  writeFileSync(path,bytes);
  assert.equal(readHostLaunchSourceScope(f.gstackRoot,f.sid).sourceRoot.realpath,f.sourceRoot);
});
test('production source grants are outside the agent-writable checkout',()=>{
  const production=realpathSync(new URL('..',import.meta.url));
  const journal=hostLaunchJournalRoot(production);
  assert.ok(journal.includes('/.codex/luca-child-project/host-launch/'));
  assert.ok(!journal.startsWith(production+'/'));
});
test('historical committed receipt never masquerades as the current selection cursor',async()=>{
  const f=fixture(),claim=await attached(f,true),payload=f.appendHuman();
  await f.broker.claim('beforeTool',{...claim,nativePayload:payload});
  const path=join(f.gstackRoot,'.claude',`.session-project-${f.sid}`);
  const state=JSON.parse(readFileSync(path,'utf8'));
  state.selection.commit_sequence++;state.selection.last_success.sequence++;
  writeFileSync(path,JSON.stringify(state));
  await assert.rejects(f.broker.parent('readReceipt',{launchId:claim.launchId}),{code:'READBACK_MISMATCH'});
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
