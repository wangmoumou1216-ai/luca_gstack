#!/usr/bin/env node
// Recovery behaviors are exercised against the public host, never by clearing a ledger.
import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {copyFileSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as host from './model-route-host.mjs';
import {attestCurrentNativeCall,readRecoveryDescriptor,recoveryCommand,parseRecoveryReport,assertRecoveryRegistration} from './codex-review-recovery.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const ownedRoots=[];
function temporaryRoot(prefix) {
  const root=realpathSync(mkdtempSync(join(tmpdir(),prefix)));
  ownedRoots.push(root);
  return root;
}
after(()=>{for(const root of ownedRoots)rmSync(root,{recursive:true,force:true});});
if (process.argv.includes('--mutation')) {
  const here = dirname(fileURLToPath(import.meta.url));
  const run = cwd => spawnSync(process.execPath, [join(cwd, 'test-codex-review-recovery.mjs')],
    {encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});
  const baseline = run(here);
  assert.equal(baseline.status, 0, `unmutated recovery suite failed: ${baseline.stdout}\n${baseline.stderr}`);
  assert.match(baseline.stdout, /# fail 0/);
  console.log('PASS unmutated recovery suite before mutation');
  const mutations = [
    ['continuation obligation', 'model-route-host.mjs', "if(intent.kind==='followup_task'&&proof.status==='interrupted'&&call.critical&&call.status==='accepted')", 'if(false)', 'C02 interrupted accepted-review followup'],
    ['continuation retirement', 'model-route-host.mjs', "(call.status !== 'interrupted'&&!continuation)", "call.status !== 'interrupted'", 'C02 interrupted accepted-review followup'],
    ['continuation relation', 'model-route-host.mjs', "if(obligation.continuation_operation_id!==undefined)", 'if(false)', 'C03 continuation obligation cannot'],
    ['interruption identity', 'model-route-host.mjs', '&& evidence.agent_id === identity.agent_id', '&& true', 'C03 wrong model/input/identity/turn'],
    ['interruption input', 'model-route-host.mjs', 'evidence[key] === call[key]', "(key === 'input_sha' || evidence[key] === call[key])", 'C03 wrong model/input/identity/turn'],
    ['report descriptor', 'model-route-host.mjs', 'report?.descriptor_sha === call.descriptor_sha', 'true', 'C05 missing criteria or wrong descriptor'],
    ['reservation uniqueness', 'model-route-host.mjs', "obligation.status !== 'OPEN'", 'false', 'C08 one native operation'],
    ['hard failure', 'model-route-host.mjs', "state.failure_records.some(f => f.kind !== 'coordination'\n          || f.reason !== 'ROOT_ANCHOR_CHANGED_WITH_UNRESOLVED_CRITICAL_WORK')", 'false', 'C06 later hard failure'],
    ['retired child fence', 'model-route-host.mjs', 'if (state.retired_agents[input.agent_id])', 'if (false)', 'C08 retirement fences'],
    ['continuation race fence', 'model-route-host.mjs', "if (Object.values(original.resume_intents).some(i => i.status === 'pending'))", 'if (false)', 'C08 retirement fences'],
    ['state CAS', 'model-route-host.mjs', 'if (activationContentSha(input) !== input.expected_state_sha)', 'if (false)', 'C09 stale state'],
    ['legacy refusal', 'model-route-host.mjs', 'if (previous?.version === 1 && (previous.critical_failure || unresolvedWork(previous)))', 'if (false)', 'C07 legacy locked ledger'],
    ['current native identity', 'codex-review-recovery.mjs', '&&call.call_id===payload.tool_use_id', '&&true', 'C03 current native command'],
    ['current command bytes', 'codex-review-recovery.mjs', 'args.cmd!==payload.tool_input?.command', 'false', 'C03 current native command'],
    ['native omitted namespace', 'codex-review-recovery.mjs', "(call.namespace===undefined||call.namespace==='functions')", "call.namespace==='functions'", 'C03 current native command'],
    ['primary registration identity', 'codex-review-recovery.mjs', "resolve(dirname(realpathSync(git.stdout.trim())),'.codex/hooks.json')", 'local', 'C03 native fence'],
    ['native event identity', 'codex-review-recovery.mjs', '&&h.eventName===event', '', 'C03 native fence'],
    ['shared registration drift', 'codex-review-recovery.mjs', '!canonicalFile(path).equals(bytes)', 'false', 'C03 native fence'],
    ['frozen source hash', 'codex-review-recovery.mjs', 'digest(canonicalFile(file.path))!==file.sha256', 'false', 'C03 descriptor source'],
    ['canonical path', 'codex-review-recovery.mjs', 'realpathSync(path)!==path || ', '', 'C03 descriptor source'],
    ['quality-gate report framing', 'codex-review-recovery.mjs', 'if(tail) {', 'if(false) {', 'C05 recovery report framing'],
    ['recovery entry specificity', 'codex-review-recovery.mjs', 'if(!entry)return null;', "if(!entry)throw Error('INVALID_RECOVERY_ENTRY');", 'C01 recovery interception'],
  ];
  const root = mkdtempSync(join(tmpdir(), 'recovery-mutations.'));
  try {
    for (const [name, file, from, to, expected] of mutations) {
      for (const entry of ['model-route-host.mjs','codex-review-recovery.mjs','test-codex-review-recovery.mjs']) {
        copyFileSync(join(here, entry), join(root, entry));
      }
      const path = join(root, file), source = readFileSync(path, 'utf8');
      assert.ok(source.includes(from), `missing mutation target: ${name}`);
      writeFileSync(path, source.replace(from, to));
      const syntax = spawnSync(process.execPath, ['--check',path], {encoding:'utf8'});
      assert.equal(syntax.status, 0, `invalid mutation: ${name}: ${syntax.stderr}`);
      const result = run(root);
      assert.equal(result.status, 1, `mutation survived: ${name}: ${result.stdout}\n${result.stderr}`);
      assert.ok(result.stdout.split('\n').some(line => line.startsWith('not ok ') && line.includes(expected)),
        `mutation failed outside its expected assertion: ${name}: ${result.stdout}`);
      console.log(`KILLED ${name}: ${expected}`);
    }
  } finally { rmSync(root, {recursive:true,force:true}); }
  const restored = run(here);
  assert.equal(restored.status, 0, `restored recovery suite failed: ${restored.stdout}\n${restored.stderr}`);
  console.log(`PASS ${mutations.length}/${mutations.length} recovery mutations; restored suite green`);
  process.exit(0);
}
function fixture() {
  const input = {harness:'codex', root_session_id:randomUUID(), state_root:temporaryRoot('review-recovery.'),
    root_anchor:{model:'fixture-anchor',source:'native-fixture'},release_digest:sha('release')};
  const state=host.startActivation(input);
  const route={disposition:'READY',harness:'codex-native',requested_role:'peak',requested_model:'fixture-peak',critical:true,
    policy_sha:sha('policy'),routing_config_sha:sha('binding'),capability_evidence_sha:sha('native-capability')};
  const call=host.prepareInvocation({...input,route,task_id:'native:turn:spawn',input_sha:sha('opaque-input')});
  assert.equal(call.disposition,'READY');
  return {input,state,call:call.envelope,route,path:host.stateFileForTest(input)};
}
test('C07 same-SID SessionStart preserves an unresolved critical invocation',()=>{
  const f=fixture();host.startActivation(f.input);const after=host.readActivation(f.input);
  assert.equal(after.invocations[f.call.invocation_id]?.status,'pending','restart must not erase the outstanding review');
  assert.equal(after.activation_id,f.state.activation_id);
});
test('C06 repeated failures retain both independent causes',()=>{
  const f=fixture();
  for(const reason of ['MISSING_BINDING','MODEL_MISMATCH']) host.latchCriticalFailure({...f.input,
    expected_activation_id:f.state.activation_id,expected_root_generation:0,critical:true,reason,evidence_ref:'fixture:'+reason});
  const after=host.readActivation(f.input);
  assert.deepEqual((after.failure_records||[]).map(x=>x.reason),['MISSING_BINDING','MODEL_MISMATCH']);
  assert.equal(after.critical_failure,true);
});
test('C07 legacy locked ledger cannot be overwritten by SessionStart',()=>{
  const f=fixture();const legacy=JSON.parse(readFileSync(f.path));legacy.version=1;legacy.critical_failure=true;
  writeFileSync(f.path,JSON.stringify(legacy));const before=readFileSync(f.path);
  assert.throws(()=>host.startActivation(f.input),/LEGACY_RECOVERY_NEEDS_CONTEXT/);
  assert.deepEqual(readFileSync(f.path),before);
});
test('C07 release change cannot discard unresolved critical work',()=>{
  const f=fixture();const before=readFileSync(f.path);
  assert.throws(()=>host.startActivation({...f.input,release_digest:sha('new-release')}),/UNRESOLVED|RELEASE/);
  assert.deepEqual(readFileSync(f.path),before);
});
function interruption(f, overrides={}, identityOverrides={}) {
  const identity={agent_id:'fixture-child',tool_use_id:'spawn',agent_type:'quality-gate',...identityOverrides};
  for(const [field,value] of Object.entries(identity)) assert.equal(host.bindInvocationExternalIdentity({
    ...f.input,invocation_id:f.call.invocation_id,field,value}).disposition,'BOUND');
  return {...f.call,...identity,status:'interrupted',adopted_model:f.call.requested_model,
    native_turn_id:'child-turn',parent_transcript_sha:sha('parent-prefix'),child_transcript_sha:sha('native-abort'),
    evidence_ref:'native:child-turn',...overrides};
}
function interrupted(overrides={}) {
  const f=fixture();f.proof=interruption(f,overrides);
  f.interrupted=host.recordInvocationInterruption({...f.input,evidence:f.proof});return f;
}
function request(f,overrides={}) {
  const descriptor={schema_version:1,read_only:true,agent_type:'quality-gate',fork_turns:'none',
    files:[{path:'/fixture/frozen-review.md',sha256:sha('frozen')}],
    criteria:[{id:'R1',text:'Review the complete frozen requirement'}],authorization_ref:'actual-user-ref'};
  return {...f.input,expected_state_sha:host.activationContentSha(f.input),descriptor,
    descriptor_sha:sha(JSON.stringify(descriptor)),obligation_id:f.call.invocation_id,operation_id:'native:turn:reserve',
    policy_sha:f.route.policy_sha,authorization_ref:'actual-user-ref',verifyNativeEvidence:()=>{},...overrides};
}
function reserve(f,overrides={}) {return host.reserveReviewRecovery(request(f,overrides));}
function replacement(f,reservation) {
  return host.prepareInvocation({...f.input,route:f.route,task_id:'native:new-turn:new-spawn',input_sha:sha('new-opaque-input'),
    recovery_id:reservation.recovery_id});
}
function complete(f,call,report={descriptor_sha:call.descriptor_sha,criteria:[{id:'R1',status:'FAIL',evidence:'Observed a real defect'}]}) {
  return host.acceptInvocationEvidence({...f.input,evidence:{...call,adopted_model:call.requested_model,
    status:'completed',same_invocation_success:true,rerouted:false,fallback:false,evidence_ref:'native:new-report',review_report:report}});
}
test('C02 interrupted accepted-review followup creates a recoverable turn-bound obligation',()=>{
  const f=fixture();interruption(f);assert.equal(complete(f,f.call).disposition,'ACCEPT');
  const intent={...f.input,agent_id:'fixture-child',operation_id:'followup-aborted',native_call_id:'followup-call',
    evidence_ref:'native:followup',kind:'followup_task',child_turn_before:'first-completed-turn',
    native_prefix_sha:sha('native-followup'),native_prefix_length:10,child_event_count_before:20};
  assert.equal(host.beginNativeContinuation(intent).disposition,'READY');
  assert.equal(host.beginNativeContinuation({...intent,operation_id:'overtaking-followup'}).reason,'NATIVE_CONTINUATION_PENDING');
  const terminal={status:'interrupted',native_turn_id:'second-aborted-turn',child_transcript_sha:sha('followup-abort'),parent_result_sha:sha('result')};
  const settle={...intent,verifyNativeEvidence:()=>terminal};
  assert.equal(host.settleNativeContinuation(settle).disposition,'CLOSED');
  const state=host.readActivation(f.input),obligation=Object.values(state.review_obligations)[0];
  assert.equal(obligation?.status,'OPEN','aborted followup must retain its own review obligation');
  assert.equal(obligation.continuation_operation_id,intent.operation_id);
  assert.equal(state.invocations[f.call.invocation_id].status,'accepted','first review acceptance is historical evidence only');
  assert.equal(host.settleNativeContinuation(settle).disposition,'UNCHANGED');
  assert.equal(host.settleNativeContinuation({...settle,verifyNativeEvidence:()=>({...terminal,native_turn_id:'changed'})}).disposition,'REFUSE');
  assert.equal(host.beginNativeContinuation({...intent,operation_id:'later-followup'}).reason,'UNRESOLVED_REVIEW_OBLIGATION');
  host.startActivation(f.input);
  for(const harness of ['codex-native','codex-runner']) assert.equal(host.prepareInvocation({...f.input,
    route:{...f.route,harness},task_id:'unrelated',input_sha:sha('later')}).reason,'UNRESOLVED_REVIEW_OBLIGATION');
  assert.throws(()=>host.startActivation({...f.input,release_digest:sha('next-release')}),/UNRESOLVED|RELEASE/);
  const ticket=reserve(f,{obligation_id:obligation.obligation_id});assert.equal(ticket.disposition,'RESERVED');
  assert.equal(host.beginNativeContinuation({...intent,operation_id:'retired-followup'}).reason,'RETIRED_REVIEW_AGENT');
  const fresh=replacement(f,ticket.reservation);assert.equal(fresh.disposition,'READY');
  assert.equal(complete(f,fresh.envelope).disposition,'ACCEPT');
  const after=host.readActivation(f.input);
  assert.equal(after.review_obligations[obligation.obligation_id].status,'COMPLETED');
  assert.equal(after.invocations[f.call.invocation_id].status,'accepted');
  assert.equal(after.invocations[f.call.invocation_id].retired_native_turn_id,terminal.native_turn_id);
  assert.equal(host.prepareInvocation({...f.input,route:f.route,task_id:'after-recovery',input_sha:sha('later')}).disposition,'READY');
});
test('C03 continuation obligation cannot be omitted or rebound in a persisted ledger',()=>{
  for(const corrupt of [s=>s.review_obligations={},s=>Object.values(s.review_obligations)[0].continuation_operation_id='other',
    s=>Object.values(s.resume_intents)[0].terminal_proof.native_turn_id='first']) {
    const f=fixture();interruption(f);complete(f,f.call);
    const input={...f.input,agent_id:'fixture-child',operation_id:'followup',native_call_id:'call',kind:'followup_task',
      child_turn_before:'first',evidence_ref:'native:followup'};
    host.beginNativeContinuation(input);
    host.settleNativeContinuation({...input,verifyNativeEvidence:()=>({status:'interrupted',native_turn_id:'second',
      child_transcript_sha:sha('child'),parent_result_sha:sha('parent')})});
    const state=JSON.parse(readFileSync(f.path));corrupt(state);writeFileSync(f.path,JSON.stringify(state));
    assert.equal(host.readActivation(f.input),null,'malformed continuation relationship is not a valid ledger');
    assert.equal(host.prepareInvocation({...f.input,route:f.route,task_id:'later',input_sha:sha('later')}).reason,'INVALID_ACTIVATION');
  }
});
test('C02 interrupted original remains unaccepted and ordinary native/runner dispatch stays blocked',()=>{
  const f=interrupted();assert.equal(f.interrupted.disposition,'INTERRUPTED');const state=host.readActivation(f.input);
  assert.equal(state.invocations[f.call.invocation_id].status,'interrupted');
  for(const route_harness of ['codex-native','codex-cli']) assert.equal(host.dispatchAdmission(state,{route_harness}).reason,'UNRESOLVED_REVIEW_OBLIGATION');
});
test('C03 wrong model/input/identity/turn evidence cannot create a recoverable obligation',()=>{
  for(const change of [{adopted_model:'other'},{input_sha:sha('other')},{agent_id:'other'},{native_turn_id:''}]) {
    const f=interrupted(change);assert.equal(f.interrupted.disposition,'REFUSE');const state=host.readActivation(f.input);
    assert.equal(state.critical_failure,true);assert.equal(Object.keys(state.review_obligations).length,0);
  }
});
test('C04/C05 only the reserved replacement runs and a complete FAIL report discharges execution only',()=>{
  const f=interrupted(),r=reserve(f);assert.equal(r.disposition,'RESERVED');
  assert.equal(host.dispatchAdmission(host.readActivation(f.input)).disposition,'NEEDS_CONTEXT');
  const next=replacement(f,r.reservation);assert.equal(next.disposition,'READY');
  assert.notEqual(next.envelope.invocation_id,f.call.invocation_id);assert.notEqual(next.envelope.input_sha,f.call.input_sha);
  assert.notEqual(replacement(f,r.reservation).disposition,'READY');
  assert.equal(complete(f,next.envelope).disposition,'ACCEPT');
  const state=host.readActivation(f.input);assert.equal(state.review_obligations[f.call.invocation_id].status,'COMPLETED');
  assert.equal(state.invocations[f.call.invocation_id].status,'interrupted');assert.equal(host.dispatchAdmission(state).disposition,'READY');
});
test('C05 missing criteria or wrong descriptor never completes the recovery',()=>{
  for(const report of [{descriptor_sha:sha('other'),criteria:[{id:'R1',status:'PASS',evidence:'Complete but wrong scope'}]},
      {descriptor_sha:null,criteria:[]},{descriptor_sha:'CURRENT',criteria:[]},
      {descriptor_sha:'CURRENT',criteria:[{id:'OTHER',status:'PASS',evidence:'Wrong criterion'}]},
      {descriptor_sha:'CURRENT',criteria:[{id:'R1',status:'OK',evidence:'Unknown status'}]},
      {descriptor_sha:'CURRENT',criteria:[{id:'R1',status:'PASS',evidence:''}]}]) {
    const f=interrupted(),r=reserve(f),next=replacement(f,r.reservation);
    const bound=report.descriptor_sha==='CURRENT'?{...report,descriptor_sha:next.envelope.descriptor_sha}:report;
    assert.equal(complete(f,next.envelope,bound).disposition,'REFUSE');
    assert.equal(host.readActivation(f.input).review_obligations[f.call.invocation_id].status,'BLOCKED');
  }
});
test('C07 audited coordination failure gets an obligation-only successor, preserving the failed activation',()=>{
  const f=fixture(),proof=interruption(f);
  host.updateRootAnchor({...f.input,root_anchor:{model:'new-anchor',source:'native'}});
  assert.equal(host.recordInvocationInterruption({...f.input,evidence:proof}).disposition,'INTERRUPTED');
  const r=reserve(f);assert.equal(r.disposition,'RESERVED');const state=host.readActivation(f.input);
  assert.notEqual(state.activation_id,f.state.activation_id);assert.equal(state.activation_history.at(-1).critical_failure,true);
  assert.equal(host.dispatchAdmission(state).reason,'UNRESOLVED_REVIEW_OBLIGATION');
});
test('C06 later hard failure prevents the coordination-only successor',()=>{
  const f=fixture(),proof=interruption(f);host.updateRootAnchor({...f.input,root_anchor:{model:'new-anchor',source:'native'}});
  host.recordInvocationInterruption({...f.input,evidence:proof});const s=host.readActivation(f.input);
  host.latchCriticalFailure({...f.input,expected_activation_id:s.activation_id,expected_root_generation:s.root_generation,
    critical:true,reason:'WRONG_NATIVE_MODEL',evidence_ref:'native:wrong-model'});
  assert.equal(reserve(f).reason,'CRITICAL_FAILURE_LATCHED');assert.equal(host.readActivation(f.input).failure_records.length,2);
});
test('C08 one native operation is idempotent, competing requests and changed payloads fail',()=>{
  const f=interrupted(),q=request(f),r=host.reserveReviewRecovery(q);assert.equal(r.disposition,'RESERVED');
  assert.equal(host.reserveReviewRecovery(q).reservation.recovery_id,r.reservation.recovery_id);
  assert.equal(host.reserveReviewRecovery({...q,descriptor_sha:sha('altered')}).reason,'RECOVERY_OPERATION_REUSED');
  assert.equal(reserve(f,{operation_id:'second-call'}).reason,'RECOVERY_OBLIGATION_NOT_OPEN');
});
test('C08 retirement fences old child; a prior continuation intent prevents reservation',()=>{
  const f=interrupted();assert.equal(reserve(f).disposition,'RESERVED');
  assert.equal(host.beginNativeContinuation({...f.input,agent_id:'fixture-child',operation_id:'followup',evidence_ref:'native:followup'}).reason,'RETIRED_REVIEW_AGENT');
  const other=interrupted();assert.equal(host.beginNativeContinuation({...other.input,agent_id:'fixture-child',operation_id:'followup',evidence_ref:'native:followup'}).disposition,'READY');
  assert.equal(reserve(other).reason,'NATIVE_CONTINUATION_PENDING');
});
test('C08 replacement interruption reopens its existing obligation without accepting either call',()=>{
  const f=interrupted(),r=reserve(f),next=replacement(f,r.reservation);
  const fx={...f,call:next.envelope};const proof=interruption(fx,{native_turn_id:'replacement-turn'},
    {agent_id:'replacement-child',tool_use_id:'replacement-spawn'});
  assert.equal(host.recordInvocationInterruption({...f.input,evidence:proof}).disposition,'INTERRUPTED');
  const after=host.readActivation(f.input);assert.equal(after.review_obligations[f.call.invocation_id].status,'OPEN');
  assert.equal(Object.keys(after.review_obligations).length,1);
});
test('C09 stale state or failed native revalidation cannot create a reservation',()=>{
  const f=interrupted(),before=readFileSync(f.path);
  assert.equal(reserve(f,{expected_state_sha:sha('stale')}).reason,'RECOVERY_STATE_CHANGED');
  assert.throws(()=>reserve(f,{verifyNativeEvidence:()=>{throw Error('native prefix changed');}}),/native prefix changed/);
  assert.deepEqual(readFileSync(f.path),before);
});

test('C03 current native command binding rejects fake hooks, completed replay, and dynamic wrappers',()=>{
  const cwd=temporaryRoot('native-call-proof.');
  const payload={session_id:'root',turn_id:'turn',tool_use_id:'call_1',cwd,tool_input:{command:'node scripts/codex-review-recovery.mjs reserve'}};
  const context={turn_id:'turn',cwd};
  const call={type:'response_item',payload:{type:'function_call',name:'exec_command',call_id:'call_1',arguments:JSON.stringify({cmd:payload.tool_input.command})}};
  const records={actual:join(cwd,'rollout.jsonl'),context,events:[{type:'turn_context',payload:context},call]};
  const good=attestCurrentNativeCall(records,payload);assert.equal(good.call_id,'call_1');
  assert.throws(()=>attestCurrentNativeCall({...records,events:records.events.slice(0,1)},payload),/CURRENT_NATIVE_CALL_MISSING/);
  assert.throws(()=>attestCurrentNativeCall(records,{...payload,tool_use_id:'fake'}),/MISMATCH/);
  assert.throws(()=>attestCurrentNativeCall(records,{...payload,tool_input:{command:'different'}}),/MISMATCH/);
  assert.throws(()=>attestCurrentNativeCall({...records,events:[...records.events,call]},payload),/NOT_UNIQUE/);
  assert.throws(()=>attestCurrentNativeCall({...records,events:[...records.events,{type:'response_item',payload:{type:'function_call_output',call_id:'call_1',output:'done'}}]},payload),/NOT_PENDING/);
  const wrapper={type:'response_item',payload:{type:'custom_tool_call',namespace:'functions',name:'exec',call_id:'outer_1',
    input:`text(await tools.exec_command({cmd:${JSON.stringify(payload.tool_input.command)},max_output_tokens:100}));`}};
  const wrapped={...records,events:[records.events[0],wrapper]};
  const a=attestCurrentNativeCall(wrapped,{...payload,tool_use_id:'exec-a'}),b=attestCurrentNativeCall(wrapped,{...payload,tool_use_id:'exec-b'});
  assert.equal(a.operation_id,b.operation_id,'synthetic Bash ID cannot mint a second operation');
  // Native Codex records functions.exec as custom_tool_call name=exec without
  // a namespace. Keep binding its exact pending wrapper, not the synthetic ID.
  const unqualified=structuredClone(wrapped); delete unqualified.events[1].payload.namespace;
  const observed=attestCurrentNativeCall(unqualified,payload);
  assert.equal(observed.operation_id,a.operation_id);
  for(const namespace of ['other','',null]) {
    const wrong=structuredClone(unqualified);wrong.events[1].payload.namespace=namespace;
    assert.throws(()=>attestCurrentNativeCall(wrong,payload),/CURRENT_NATIVE_CALL_MISMATCH/);
  }
  assert.throws(()=>attestCurrentNativeCall(unqualified,{...payload,turn_id:'other-turn'}),/MISMATCH/);
  assert.throws(()=>attestCurrentNativeCall(unqualified,{...payload,tool_input:{command:'other-command'}}),/MISMATCH/);
  assert.throws(()=>attestCurrentNativeCall({...unqualified,events:[...unqualified.events,
    {type:'response_item',payload:{type:'custom_tool_call_output',call_id:'outer_1',output:'done'}}]},payload),/NOT_PENDING/);
  assert.throws(()=>attestCurrentNativeCall({...wrapped,events:[records.events[0],{...wrapper,payload:{...wrapper.payload,input:'const cmd="unsafe"; text(await tools.exec_command({cmd}));'}}]},payload),/UNSUPPORTED_RECOVERY_WRAPPER/);
});
test('C03 descriptor source and authorization are checked by exact bytes and criterion IDs',()=>{
  const cwd=temporaryRoot('recovery-descriptor.'),file=join(cwd,'input.md'),path=join(cwd,'descriptor.json'),auth=join(cwd,'authorization.json');
  writeFileSync(file,'frozen input');
  const descriptor={schema_version:1,read_only:true,agent_type:'quality-gate',fork_turns:'none',authorization_ref:'actual-user',
    files:[{path:file,sha256:sha('frozen input')}],criteria:[{id:'R1',text:'Complete requirement'}]};
  writeFileSync(path,JSON.stringify(descriptor));
  writeFileSync(auth,JSON.stringify({approved:true,descriptor_sha:sha(readFileSync(path)),user_source_ref:'actual-user',effect:'independent-readonly-review'}));
  assert.equal(readRecoveryDescriptor(path,auth).descriptor_sha,sha(readFileSync(path)));
  const alias=join(cwd,'alias.json');symlinkSync(path,alias);
  assert.throws(()=>readRecoveryDescriptor(alias,auth),/SOURCE_NOT_CANONICAL/);
  writeFileSync(file,'changed');assert.throws(()=>readRecoveryDescriptor(path,auth),/FILE_MISMATCH/);writeFileSync(file,'frozen input');
  const authorization=JSON.parse(readFileSync(auth));authorization.user_source_ref='other';writeFileSync(auth,JSON.stringify(authorization));
  assert.throws(()=>readRecoveryDescriptor(path,auth),/AUTHORIZATION_BINDING_MISMATCH/);
  descriptor.criteria.push(descriptor.criteria[0]);writeFileSync(path,JSON.stringify(descriptor));
  assert.throws(()=>readRecoveryDescriptor(path,auth),/CRITERIA_INVALID/);
  assert.throws(()=>recoveryCommand('node scripts/codex-review-recovery.mjs reserve; echo bypass',cwd,cwd),/UNSAFE_RECOVERY_COMMAND/);
});

test('C03 native fence uses the Git primary registration and distinguishes repeated commands by event',()=>{
  const root=temporaryRoot('recovery-worktree.'),primary=join(root,'primary'),linked=join(root,'linked');
  fs.mkdirSync(join(primary,'.codex'),{recursive:true});
  const run=args=>{const result=spawnSync('/usr/bin/git',args,{encoding:'utf8',env:Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')))});assert.equal(result.status,0,result.stderr);};
  run(['init','-q',primary]);run(['-C',primary,'config','user.name','Fixture']);run(['-C',primary,'config','user.email','fixture@example.invalid']);
  const definition={hooks:{SessionStart:[{hooks:[{command:'same-native-command'}]}],PreToolUse:[{
    matcher:'^(collaborationfollowup_task|collaborationsend_message)$',hooks:[{command:'same-native-command'}]}]}};
  const source=join(primary,'.codex/hooks.json');writeFileSync(source,JSON.stringify(definition));
  run(['-C',primary,'add','.codex/hooks.json']);run(['-C',primary,'-c','core.hooksPath=/dev/null','commit','-qm','fixture']);
  run(['-C',primary,'worktree','add','--detach',linked]);
  const hooks=[['sessionStart',null],['preToolUse',definition.hooks.PreToolUse[0].matcher]].map(([eventName,matcher])=>({
    sourcePath:source,eventName,matcher,command:'same-native-command',enabled:true,trustStatus:'trusted',async:false}));
  assertRecoveryRegistration(primary,{hooks});assertRecoveryRegistration(linked,{hooks});
  for(const edit of [h=>h.enabled=false,h=>h.trustStatus='untrusted',h=>h.async=true,h=>delete h.async,
    h=>h.sourcePath=join(root,'foreign/hooks.json'),h=>h.matcher='.*',h=>h.eventName='stop']) {
    const changed=structuredClone(hooks);edit(changed[1]);assert.throws(()=>assertRecoveryRegistration(linked,{hooks:changed}),/FENCE_NOT_TRUSTED/);
  }
  assert.throws(()=>assertRecoveryRegistration(linked,{hooks:[...hooks,hooks[1]]}),/FENCE_NOT_TRUSTED/);
  writeFileSync(join(linked,'.codex/hooks.json'),JSON.stringify({...definition,description:'drift'}));
  assert.throws(()=>assertRecoveryRegistration(linked,{hooks}),/SOURCE_DRIFT/);
});
test('C01 recovery interception leaves ordinary references and tests untouched',()=>{
  const root=temporaryRoot('ordinary-recovery-entry.');
  for(const command of ['cat scripts/codex-review-recovery.mjs',
    'rg codex-review-recovery.mjs scripts', 'node --test scripts/test-codex-review-recovery.mjs',
    'node scripts/test-codex-review-recovery.mjs --mutation',
    'node scripts/codex-review-recovery.mjs inspect --session fixture | head -1',
    'printf "node scripts/codex-review-recovery.mjs reserve"',
    'cat scripts/codex-review-recovery.mjs | head -1']) {
    assert.equal(recoveryCommand(command,root,root),null,command);
  }
  const prefix='node scripts/codex-review-recovery.mjs reserve';
  for(const suffix of ['; echo bypass',' --descriptor "$(echo unsafe)"',' | cat',' > receipt']) {
    assert.throws(()=>recoveryCommand(prefix+suffix,root,root),/UNSAFE_RECOVERY_COMMAND/);
  }
});
test('C08 only verified pre-effect denial settles a pending continuation intent',()=>{
  const f=interrupted();host.beginNativeContinuation({...f.input,agent_id:'fixture-child',operation_id:'followup',native_call_id:'native-followup',evidence_ref:'native:followup'});
  assert.equal(reserve(f).reason,'NATIVE_CONTINUATION_PENDING');
  const args={...f.input,operation_id:'followup',native_call_id:'native-followup',evidence_ref:'native:pre-effect-denied'};
  assert.equal(host.settleDeniedNativeContinuation(args).disposition,'REFUSE');
  assert.throws(()=>host.settleDeniedNativeContinuation({...args,verifyNativeEvidence:()=>{throw Error('still pending');}}),/still pending/);
  assert.equal(host.settleDeniedNativeContinuation({...args,verifyNativeEvidence:()=>{}}).disposition,'CLOSED');
  assert.equal(reserve(f).disposition,'RESERVED');
});
test('C07 reserved recovery reopens on root generation change without losing retirement',()=>{
  const f=interrupted(),r=reserve(f);
  host.updateRootAnchor({...f.input,root_anchor:{model:'new-root',source:'native'}});
  const changed=host.readActivation(f.input);
  assert.equal(changed.review_obligations[f.call.invocation_id].status,'OPEN');
  assert.equal(changed.recovery_reservations[r.reservation.recovery_id].status,'invalidated');
  assert.ok(changed.retired_agents['fixture-child']);
  assert.notEqual(replacement(f,r.reservation).disposition,'READY');
  const next=reserve(f,{operation_id:'new-generation-reserve'});
  assert.equal(next.disposition,'RESERVED');
  assert.notEqual(next.reservation.recovery_id,r.reservation.recovery_id);
  assert.equal(host.readActivation(f.input).activation_history.at(-1).critical_failure,true);
});
test('C08 successful native continuation settles only from verified terminal evidence',()=>{
  const f=fixture();interruption(f);
  assert.equal(complete(f,f.call).disposition,'ACCEPT');
  const input={...f.input,agent_id:'fixture-child',operation_id:'native-followup',native_call_id:'followup-call',
    child_turn_before:'old-turn',child_event_count_before:10,kind:'followup_task',evidence_ref:'native:followup'};
  assert.equal(host.beginNativeContinuation(input).disposition,'READY');
  assert.equal(host.dispatchAdmission(host.readActivation(f.input)).reason,'NATIVE_CONTINUATION_PENDING');
  const terminal={status:'completed',native_turn_id:'new-turn',child_transcript_sha:sha('completed-child'),
    parent_result_sha:sha('native-result')};
  assert.equal(host.settleNativeContinuation({...input,verifyNativeEvidence:()=>null}).disposition,'REFUSE');
  assert.throws(()=>host.settleNativeContinuation({...input,verifyNativeEvidence:()=>{throw Error('not complete');}}),/not complete/);
  assert.equal(host.settleNativeContinuation({...input,verifyNativeEvidence:()=>terminal}).disposition,'CLOSED');
  assert.equal(host.dispatchAdmission(host.readActivation(f.input)).disposition,'READY');
  assert.equal(host.readActivation(f.input).invocations[f.call.invocation_id].status,'accepted');
  assert.equal(host.settleNativeContinuation({...input,verifyNativeEvidence:()=>terminal}).disposition,'UNCHANGED');
  assert.equal(host.settleNativeContinuation({...input,verifyNativeEvidence:()=>({...terminal,native_turn_id:'other'})}).reason,
    'CONTINUATION_EVIDENCE_CHANGED');
});
test('C03 malformed v2 records and orphaned interrupted obligations refuse all dispatch',()=>{
  const corruptions=[s=>{s.review_obligations[frozenId(s)].status='NOT_A_STATE';},
    s=>{s.review_obligations[frozenId(s)].status='COMPLETED';},
    s=>{s.review_obligations[frozenId(s)].status='RESERVED';},
    s=>{s.review_obligations[frozenId(s)].status='RUNNING';},
    s=>{s.invocations[frozenId(s)].interruption.child_transcript_sha='not-a-hash';},
    s=>{delete s.review_obligations[frozenId(s)];},s=>{s.failure_records.push(null);},
    s=>{s.resume_intents.bad={operation_id:'bad',status:'unknown'};},
    s=>{s.recovery_reservations.bad={recovery_id:'bad',status:'reserved'};}];
  const frozenId=s=>Object.keys(s.invocations)[0];
  for(const corrupt of corruptions) {
    const f=interrupted(),state=JSON.parse(readFileSync(f.path));corrupt(state);
    writeFileSync(f.path,JSON.stringify(state));
    assert.equal(host.readActivation(f.input),null);
    assert.equal(host.dispatchAdmission(state).reason,'INVALID_ACTIVATION');
    assert.notEqual(host.prepareInvocation({...f.input,route:f.route,task_id:'bad',input_sha:sha('bad')}).disposition,'READY');
    assert.equal(reserve(f).reason,'INVALID_ACTIVATION');
  }
});
test('C09 lock initialization and pre-rename failures preserve the old state and release only owned locks',()=>{
  for(const fault of ['lock-write','rename']) {
    const f=interrupted(),before=readFileSync(f.path),write=fs.writeFileSync,rename=fs.renameSync;
    try {
      if(fault==='lock-write')fs.writeFileSync=(target,...args)=>{
        if(typeof target==='number'&&fs.fstatSync(target).size===0)throw Error('injected lock write failure');
        return write(target,...args);
      };
      else fs.renameSync=()=>{throw Error('injected rename failure');};
      syncBuiltinESMExports();
      assert.throws(()=>reserve(f),/injected/);
    } finally {fs.writeFileSync=write;fs.renameSync=rename;syncBuiltinESMExports();}
    assert.deepEqual(readFileSync(f.path),before);
    assert.equal(fs.existsSync(f.path+'.lock'),false);
    assert.equal(reserve(f).disposition,'RESERVED');
  }
});
test('C09 post-rename failure reads back the exact committed operation without a second reservation',()=>{
  const f=interrupted(),q=request(f),sync=fs.fsyncSync;
  let r;
  try {
    fs.fsyncSync=fd=>{if(fs.fstatSync(fd).isDirectory())throw Error('injected directory fsync');return sync(fd);};
    syncBuiltinESMExports();r=host.reserveReviewRecovery(q);
  } finally {fs.fsyncSync=sync;syncBuiltinESMExports();}
  assert.equal(r.disposition,'RESERVED');
  assert.equal(host.reserveReviewRecovery(q).reservation.recovery_id,r.reservation.recovery_id);
  assert.equal(Object.keys(host.readActivation(f.input).recovery_reservations).length,1);
});
test('C09 a process crash after rename preserves the reservation and never clears its uncertain lock',()=>{
  const f=interrupted(),q=request(f);
  const script=`import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';
    import {reserveReviewRecovery} from ${JSON.stringify(new URL('./model-route-host.mjs',import.meta.url).href)};
    const rename=fs.renameSync;fs.renameSync=(...args)=>{rename(...args);process.exit(86);};syncBuiltinESMExports();
    reserveReviewRecovery({...JSON.parse(process.argv[1]),verifyNativeEvidence:()=>{}});`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script,JSON.stringify(q)],{encoding:'utf8',timeout:10000});
  assert.equal(child.status,86,child.stderr);
  const state=host.readActivation(f.input);
  assert.equal(Object.keys(state.recovery_reservations).length,1);
  assert.equal(state.review_obligations[f.call.invocation_id].status,'RESERVED');
  assert.equal(fs.existsSync(f.path+'.lock'),true);
  assert.throws(()=>host.reserveReviewRecovery(q),/MODEL_ROUTE_STATE_BUSY/);
  assert.equal(fs.existsSync(f.path+'.lock'),true);
});
test('C01 noncritical continuation preserves normal dispatch parallelism',()=>{
  const f=fixture();assert.equal(complete(f,f.call).disposition,'ACCEPT');
  const route={...f.route,critical:false,requested_role:'anchor'};
  const call=host.prepareInvocation({...f.input,route,task_id:'ordinary-child',input_sha:sha('ordinary-child')});
  assert.equal(call.disposition,'READY');
  assert.equal(host.bindInvocationExternalIdentity({...f.input,invocation_id:call.envelope.invocation_id,
    field:'agent_id',value:'ordinary-child'}).disposition,'BOUND');
  assert.equal(host.beginNativeContinuation({...f.input,agent_id:'ordinary-child',operation_id:'ordinary-message',
    native_call_id:'ordinary-message-call',evidence_ref:'native:ordinary-message'}).disposition,'READY');
  assert.equal(host.dispatchAdmission(host.readActivation(f.input)).disposition,'READY');
});
test('C05 recovery report framing preserves the quality-gate eval envelope tail',()=>{
  const descriptor={criteria:[{id:'R1'}]};
  const report={descriptor_sha:sha('descriptor'),criteria:[{id:'R1',status:'UNKNOWN',evidence:'Actual inspection limits'}]};
  const envelope={schema_version:1,producer:'quality-gate',eval_run_id:'real-provider-framing',
    subject:{skill:'review',topic:'framing',scene:'unknown',input_summary:'read-only',output_paths:[],duration:'medium'},
    verdict:{status:'FAIL',passed:0,total:1,findings:['UNKNOWN R1']}};
  const body='REVIEW_RECOVERY_REPORT_JSON\n'+JSON.stringify(report);
  assert.deepEqual(parseRecoveryReport(body,descriptor),report);
  assert.deepEqual(parseRecoveryReport(body+'\n\nEVAL_ENVELOPE_JSON\n'+JSON.stringify(envelope),descriptor),report);
  assert.deepEqual(parseRecoveryReport('REVIEW_RECOVERY_REPORT_JSON\n```json\n'+JSON.stringify(report)
    +'\n```\n\nEVAL_ENVELOPE_JSON\n'+JSON.stringify(envelope),descriptor),report);
  for(const tail of ['\ngarbage','\nEVAL_ENVELOPE_JSON\n{broken','\nEVAL_ENVELOPE_JSON\n[]']) {
    assert.throws(()=>parseRecoveryReport(body+tail,descriptor));
  }
  const textInside={...report,criteria:[{id:'R1',status:'FAIL',evidence:'line\nEVAL_ENVELOPE_JSON\ninside JSON text'}]};
  assert.deepEqual(parseRecoveryReport('REVIEW_RECOVERY_REPORT_JSON\n'+JSON.stringify(textInside),descriptor),textInside);
  const quotedMarker={...report,criteria:[{id:'R1',status:'PASS',evidence:'The REVIEW_RECOVERY_REPORT_JSON marker is correctly emitted.'}]};
  assert.deepEqual(parseRecoveryReport('REVIEW_RECOVERY_REPORT_JSON\n'+JSON.stringify(quotedMarker),descriptor),quotedMarker);
});
