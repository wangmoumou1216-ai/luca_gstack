#!/usr/bin/env node
// Static/fixture and explicitly synthetic oracle tests. Native adoption belongs to U012-b.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,chmodSync,existsSync,statSync,realpathSync} from 'node:fs';
import {basename,dirname,join,resolve,relative,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const option=n=>{const i=process.argv.indexOf(n);return i<0?undefined:process.argv[i+1];};
const root=resolve(option('--root')||join(here,'..'));
const dataRoot=resolve(option('--data-root')||join(here,'..'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const canonical=x=>JSON.stringify(x&&typeof x==='object'?Array.isArray(x)?x.map(v=>JSON.parse(canonical(v))):Object.fromEntries(Object.keys(x).sort().map(k=>[k,JSON.parse(canonical(x[k]))])):x);
const copy=x=>JSON.parse(JSON.stringify(x));
const read=p=>readFileSync(join(dataRoot,p),'utf8');
const coverage=JSON.parse(read('memory/evals/matt-adaptation/method-coverage.json'));
const fixtures=JSON.parse(read('memory/evals/matt-adaptation/fixtures.json')).fixtures;
const compiled=coverage.compiled_contract;
const projection=({...coverage});delete projection.compiled_contract;
const frozenProjection='1cafa8f21d06c439d3361708e42b5011c98f5072325d2fadd12616bc5a841ec9';
const summary={scope:'static_and_deterministic_synthetic_only',native_behavior:'NOT_RUN',adoption:'PENDING',failures:[],mutations:[],controls:[],commands:[],synthetic_traces:[]};
function unique(values,label){assert.equal(new Set(values).size,values.length,`${label}: duplicate ID`);}
function coverageGate(c,fs,{freeze=true}={}){
 const cc=c.compiled_contract;assert.equal(c.entries.length,38);assert.equal(c.success_policy.gain_methods.length,16);assert.equal(c.success_policy.preservation_methods.length,22);
 unique(c.entries.map(e=>e.method_id),'methods');unique(c.entries.map(e=>e.source_id),'sources');unique(fs.map(f=>f.id),'fixtures');
 const atoms=c.entries.flatMap(e=>e.assertions);unique(atoms.map(a=>a.id),'assertions');unique(atoms.map(a=>a.omission_id),'omissions');assert.equal(atoms.length,203);
 const goals=c.entries.flatMap(e=>e.gain_goals);unique(goals.map(g=>g.id),'goals');assert.equal(goals.length,17);
 assert.deepEqual(cc.source_ids,c.entries.map(e=>e.source_id));assert.equal(cc.source_index_sha256,'cf8b2bb45e34180ec0bf4dd2dc31c80d0188271ab4a68f011cf4c6b4437fc01f');
 assert.equal(cc.frozen_matrix_sha256,'3026f50261dbf0dd1007147e31325de8571271cfc1e2eafc076f38f5dee5fd01');
 unique(cc.programs.map(p=>p.assertion_id),'programs');assert.equal(cc.programs.length,203);
 for(const e of c.entries){
  assert.ok(e.owner&&e.source_sections&&e.observation_contract);assert.ok(cc.source_ids.includes(e.source_id),'dangling source');
  for(const fid of e.case_ids)for(const kind of ['P','N','E'])assert.ok(fs.some(f=>f.case_id===fid&&f.variant===kind),'dangling case');
  for(const a of e.assertions){const p=cc.programs.find(p=>p.assertion_id===a.id);assert.ok(p,'missing observation program');
   assert.equal(p.full_rubric,a.text);assert.equal(p.owner,e.owner);assert.deepEqual(p.source_sections,e.source_sections);assert.deepEqual(p.case_ids,e.case_ids);assert.equal(p.classification,a.classification);assert.equal(p.kind,a.kind);assert.equal(p.omission_id,a.omission_id,'unbound omission');
   assert.equal(p.type,'independent_semantic_review','keyword-only ability oracle');assert.ok(p.carrier_contract.required.includes('human_review'));assert.ok(p.carrier_contract.required.includes('structured_observation'));assert.equal(p.carrier_contract.no_keyword_only_oracle,true);
   assert.ok(p.subchecks.length);assert.equal(p.subchecks[0].rubric,a.text,'whole conjunctive obligation required');unique(p.subchecks.map(s=>s.id),'subchecks');for(const s of p.subchecks)assert.equal(s.rubric_sha256,sha(s.rubric));
   assert.ok(p.applies_to_cases?.length);for(const fid of p.applies_to_cases){assert.ok(e.case_ids.includes(fid));assert.ok(fs.find(f=>f.id===fid+'.'+a.kind)?.expected_assertions.includes(a.id),'assertion has no variant binding');}
  }
  for(const g of e.gain_goals){assert.equal(g.candidate_required_passes,3);assert.equal(g.baseline_required_failures,2);assert.equal(g.required_valid_trials_per_arm,3);assert.equal(g.unknown_counts_as_failure,false);assert.equal(g.unknown_blocks_comparison,true);for(const id of g.required_assertion_ids)assert.ok(e.assertions.some(a=>a.id===id),'dangling G assertion');}
 }
 for(const f of fs){for(const field of ['id','source_ids','method_ids','u_id','input','neutral_files','input_sha','required_facts','forbidden_effects','missing_variant','negative_variant','execution_level','expected_assertions'])assert.ok(field in f,`${f.id}: missing ${field}`);
  assert.equal(f.input_sha,sha(f.input));assert.ok(fs.some(x=>x.id===f.missing_variant));assert.ok(fs.some(x=>x.id===f.negative_variant));assert.deepEqual(f.trials,[1,2,3]);
  for(const sid of f.source_ids)assert.ok(cc.source_ids.includes(sid),'dangling fixture source');for(const id of f.expected_assertions)assert.ok(atoms.some(a=>a.id===id),'dangling fixture assertion');
  unique(f.neutral_files.map(x=>x.path),'seed paths');for(const nf of f.neutral_files){assert.ok(!isAbsolute(nf.path)&&!nf.path.split('/').includes('..'));if(nf.type==='file'){assert.equal(nf.sha256,sha(nf.text));assert.equal(nf.preimage.sha256,nf.sha256);assert.ok(['100644','100755'].includes(nf.mode));if(nf.path.endsWith('.json'))JSON.parse(nf.text);}else{assert.equal(nf.type,'absent');assert.equal(nf.text,null);assert.equal(nf.sha256,null);}}
 }
 if(freeze){const p={...c};delete p.compiled_contract;assert.equal(cc.frozen_projection_sha256,frozenProjection);assert.equal(sha(canonical(p)),frozenProjection,'frozen matrix changed');}
 return true;
}

// The independent reviewer interprets complete raw carriers against each full rubric.
// No keyword, source bytes, helper name or bare assertion Boolean can establish behavior.
function observationVerdict(program,observation,{synthetic=false}={}){
 if(!observation||observation.origin!==(synthetic?'synthetic_contract_trace':'native_raw_observation')||observation.scope_complete!==true)return 'UNKNOWN';
 if(!Array.isArray(observation.carriers)||!program.carrier_contract.required.every(kind=>observation.carriers.some(c=>c.kind===kind&&c.sha256&&c.locator)))return 'UNKNOWN';
 const review=observation.review;if(!review||!review.judge_id||!review.invocation_id||review.producer_distinct!==true||!review.rationale||!Array.isArray(review.findings))return 'UNKNOWN';
 let failed=false;
 for(const s of program.subchecks){const found=review.findings.filter(f=>f.criterion===s.rubric&&f.rubric_sha256===s.rubric_sha256);if(found.length!==1)return 'UNKNOWN';const f=found[0];
  if(!f.rationale||!f.evidence_refs?.length||!f.observed_facts?.length||!['satisfied','violation','unobservable'].includes(f.conclusion))return 'UNKNOWN';
  if(f.conclusion==='unobservable')return 'UNKNOWN';if(f.conclusion==='violation')failed=true;
 }
 return failed?'FAIL':'PASS';
}
function syntheticObservation(p){
 // Data are explicit independent-review contract examples, not native receipts or learning evidence.
 const body={origin:'synthetic_contract_trace',case_ids:p.case_ids,scenario:p.full_rubric,observed_effects:'synthetic example only'};
 return {origin:'synthetic_contract_trace',scope_complete:true,carriers:p.carrier_contract.required.map(kind=>({kind,sha256:sha(canonical({...body,kind})),locator:'synthetic://'+kind})),review:{judge_id:'synthetic-review-contract',invocation_id:'synthetic-only',producer_distinct:true,rationale:'Synthetic sensitivity example; not an authentic native judgment.',findings:p.subchecks.map(s=>({criterion:s.rubric,rubric_sha256:s.rubric_sha256,conclusion:'satisfied',observed_facts:[{kind:'synthetic_obligation_example',detail:s.rubric,example_scope:'synthetic only'}],rationale:'Example observes every conjunct in this semantic rubric; no real behavior inferred.',evidence_refs:['synthetic://structured_observation']}))}};
}
const allMustIds=coverage.entries.flatMap(e=>e.assertions.map(a=>a.id));
const syntheticCompleteMust=()=>Object.fromEntries(allMustIds.map(id=>[id,['PASS','PASS','PASS']]));
function compareGate(g,baseline,candidate,{evidenceComplete=false,must={},mutant}={}){
 if(mutant!=='omit-trial-count'&&(baseline.length!==3||candidate.length!==3))return 'UNKNOWN';
 if(mutant!=='omit-evidence'&&!evidenceComplete)return 'UNKNOWN';
 if(mutant!=='omit-all-MUST'&&(!allMustIds.every(id=>Array.isArray(must[id])&&must[id].length===3&&must[id].every(v=>v==='PASS'))||Object.keys(must).length!==allMustIds.length))return 'UNKNOWN';
 if(mutant!=='unknown-as-FAIL'&&[...baseline,...candidate].some(v=>v==='UNKNOWN'))return 'UNKNOWN';
 if(mutant!=='omit-candidate-pass'&&candidate.filter(v=>v==='PASS').length!==g.candidate_required_passes)return 'NO_GAIN';
 const failures=baseline.filter(v=>v==='FAIL'||mutant==='unknown-as-FAIL'&&v==='UNKNOWN').length;
 return failures>=g.baseline_required_failures?'THRESHOLD_MET_SYNTHETIC_ONLY':'NO_GAIN';
}
function expectRedRestore(id,mutate,test){test();const changed=mutate();let red=false;try{test(changed);}catch{red=true;}assert.ok(red,`${id}: mutant survived`);test();summary.mutations.push({id,mutant:'RED',restored:'GREEN',scope:'static/synthetic only'});}
function syntheticTests(selected){
 evidenceContractNegatives();
 for(const p of compiled.programs.filter(p=>selected.includes(p.assertion_id.split('.')[0]))){const original=syntheticObservation(p);assert.equal(observationVerdict(p,original,{synthetic:true}),'PASS');summary.synthetic_traces.push({assertion_id:p.assertion_id,original,sha256:sha(canonical(original)),scope:'synthetic oracle-contract example only'});
  for(const s of p.subchecks){const mutated=copy(original);const f=mutated.review.findings.find(f=>f.criterion===s.rubric);f.conclusion='violation';f.observed_facts=[{kind:'observed_omission',detail:`Complete synthetic scenario omitted or reversed: ${s.rubric}`}];f.rationale='Complete synthetic observation shows the required behavior omitted; this is not missing receipt evidence.';assert.equal(observationVerdict(p,mutated,{synthetic:true}),'FAIL');assert.equal(observationVerdict(p,original,{synthetic:true}),'PASS');summary.mutations.push({id:p.omission_id,subcheck:s.id,mutant:'RED',restored:'GREEN',original_sha256:sha(canonical(original)),mutant_sha256:sha(canonical(mutated)),restored_sha256:sha(canonical(original)),changed_finding:f,scope:'synthetic semantic-review sensitivity only'});}
  const missing=copy(original);missing.carriers=[];assert.equal(observationVerdict(p,missing,{synthetic:true}),'UNKNOWN');assert.equal(observationVerdict(p,original),'UNKNOWN','synthetic cannot become native');
 }
 for(const e of coverage.entries.filter(e=>selected.includes(e.method_id)))for(const g of e.gain_goals){
  const valid={evidenceComplete:true,must:syntheticCompleteMust()};for(const [b,expected]of [[['UNKNOWN','UNKNOWN','PASS'],'UNKNOWN'],[['FAIL','FAIL','UNKNOWN'],'UNKNOWN'],[['FAIL','FAIL','PASS'],'THRESHOLD_MET_SYNTHETIC_ONLY']]){assert.equal(compareGate(g,b,['PASS','PASS','PASS'],valid),expected);summary.controls.push({goal:g.id,baseline:b,candidate:['PASS','PASS','PASS'],result:expected,scope:'synthetic only'});}
  const incompleteMust=syntheticCompleteMust();incompleteMust[allMustIds[0]][2]='UNKNOWN';
  const probes=[['omit-evidence',['FAIL','FAIL','PASS'],['PASS','PASS','PASS'],{...valid,evidenceComplete:false}],['omit-all-MUST',['FAIL','FAIL','PASS'],['PASS','PASS','PASS'],{...valid,must:incompleteMust}],['omit-trial-count',['FAIL','FAIL'],['PASS','PASS','PASS'],valid],['unknown-as-FAIL',['UNKNOWN','UNKNOWN','PASS'],['PASS','PASS','PASS'],valid],['omit-candidate-pass',['FAIL','FAIL','PASS'],['FAIL','PASS','PASS'],valid]];
  for(const [mutant,b,c,o] of probes){const green=compareGate(g,b,c,o);assert.notEqual(green,'THRESHOLD_MET_SYNTHETIC_ONLY');assert.equal(compareGate(g,b,c,{...o,mutant}),'THRESHOLD_MET_SYNTHETIC_ONLY');assert.equal(compareGate(g,b,c,o),green);summary.mutations.push({id:g.id+'.'+mutant,mutant:'RED',restored:'GREEN',scope:'synthetic gate sensitivity'});}
 }
 for(const [id,mutate]of [['duplicate-ID',c=>c.entries[1].method_id=c.entries[0].method_id],['dangling-source',c=>c.entries[0].source_id='missing'],['dangling-case',c=>c.entries[0].case_ids=['missing']],['keyword-only-oracle',c=>c.compiled_contract.programs[0].type='regex'],['unbound-omission',c=>c.compiled_contract.programs[0].omission_id='missing']])expectRedRestore(id,()=>{const c=copy(coverage);mutate(c);return c;},c=>coverageGate(c||coverage,fixtures,{freeze:false}));
}

function wizardTests(){
 const template=readFileSync(join(root,'.claude/skills/office/setup-wizard/template.sh'),'utf8');const marker=template.indexOf('# STAGES:');assert.ok(marker>0);const library=template.slice(0,marker);
 const stages='\nTOTAL_STAGES=2\nbanner "Dummy counter setup"\nstage "Local endpoint"\nsay "Configure the dummy endpoint"\nstep "Read the supplied offline instructions"\nnote "No real service"\nwarn "Dummy only"\nopen_url "https://example.invalid/counter"\nask COUNTER_URL "Endpoint:"\nif confirm "Write local value"; then write_env COUNTER_URL "$COUNTER_URL"; fi\npause "Next"\nstage "Dummy CI"\nask_secret COUNTER_TOKEN "Dummy token:"\nif confirm "Write dummy CI values"; then set_var COUNTER_URL "$COUNTER_URL"; set_secret COUNTER_TOKEN "$COUNTER_TOKEN"; fi\nfinish\n';
 const candidate=library+stages;const equivalent=candidate.replaceAll('write_env','save_setting').replaceAll('_existing','saved_value').replace('Wizard library:','Equivalent implementation library:');assert.notEqual(sha(candidate),sha(equivalent));
 const scratch=mkdtempSync(join(tmpdir(),'matt-wizard-'));const bin=join(scratch,'bin');mkdirSync(bin);const log=join(scratch,'tools.log');
 const fake='#!/bin/sh\nif [ "$1" = auth ]; then exit 0; fi\nif [ "${DUMMY_GH_FAIL:-0}" = 1 ]; then exit 2; fi\nif [ "$1" = secret ]; then value=$(cat); printf "secret:%s:%s\\n" "$3" "$value" >> "$DUMMY_LOG"; else printf "variable:%s:%s\\n" "$3" "$5" >> "$DUMMY_LOG"; fi\n';writeFileSync(join(bin,'gh'),fake);chmodSync(join(bin,'gh'),0o755);
 for(const name of ['open','xdg-open','wslview','explorer.exe']){writeFileSync(join(bin,name),'#!/bin/sh\nprintf "open:%s\\n" "$1" >> "$DUMMY_LOG"\n');chmodSync(join(bin,name),0o755);}
 function run(text,name,{refuse=false,fail=false,rerun=false}={}){const dir=join(scratch,name);mkdirSync(dir,{recursive:true});const path=join(dir,'wizard.sh');writeFileSync(path,text);chmodSync(path,0o755);writeFileSync(log,'');const syntax=spawnSync('bash',['-n',path],{encoding:'utf8'});if(syntax.status!==0)return {syntax:syntax.status,status:null};
  const env={...process.env,PATH:bin+':/usr/bin:/bin',TMPDIR:scratch,ENV_FILE:join(dir,'.env'),DUMMY_LOG:log,DUMMY_GH_FAIL:fail?'1':'0'};const input='\n'+(rerun?'':'https://dummy.invalid')+'\n'+(refuse?'n':'y')+'\n\nDUMMY_ONLY_VALUE\n'+(refuse?'n':'y')+'\n';const result=spawnSync('bash',[path],{input,env,cwd:dir,encoding:'utf8',timeout:10000});const receipt={syntax:syntax.status,status:result.status,stdout:result.stdout,stderr:result.stderr,env:existsSync(env.ENV_FILE)?readFileSync(env.ENV_FILE,'utf8'):null,tools:readFileSync(log,'utf8'),mode:statSync(path).mode&0o777};summary.commands.push({command:'bash isolated dummy wizard',name,...receipt});return receipt;}
 const behavior=r=>r.syntax===0&&r.status===0&&r.stdout.includes('Stage 1/2')&&r.stdout.includes('Stage 2/2')&&!r.stdout.includes('DUMMY_ONLY_VALUE')&&r.env==='COUNTER_URL=https://dummy.invalid\n'&&r.tools.includes('variable:COUNTER_URL:https://dummy.invalid')&&r.tools.includes('secret:COUNTER_TOKEN:DUMMY_ONLY_VALUE');
 const one=run(candidate,'candidate');const two=run(equivalent,'equivalent');assert.ok(behavior(one));assert.ok(behavior(two));
 for(const [text,name]of [[candidate,'candidate'],[equivalent,'equivalent']]){assert.ok(behavior(run(text,name,{rerun:true})));const refusal=run(text,name+'-refusal',{refuse:true});assert.equal(refusal.env,null);assert.ok(!refusal.tools.includes('secret:'));assert.ok(!refusal.tools.includes('variable:'));const failed=run(text,name+'-failure',{fail:true});assert.notEqual(failed.status,0);assert.ok(failed.stdout.includes('manual review'));}
 const compliance=text=>text.slice(0,marker)===library;assert.equal(compliance(candidate),true);assert.equal(compliance(equivalent),false);assert.equal(compareGate(coverage.entries[17].gain_goals[0],['PASS','PASS','PASS'],['PASS','PASS','PASS'],{evidenceComplete:true,must:syntheticCompleteMust()}),'NO_GAIN');
 assert.equal(behavior(run(candidate.replace('stage "Dummy CI"','say "Dummy CI"'),'missing-stage')),false);assert.equal(behavior(run(candidate+'\nif (\n','broken-syntax')),false);assert.ok(behavior(run(candidate,'restored')));assert.equal(sha(readFileSync(join(root,'.claude/skills/office/setup-wizard/template.sh'))),sha(template));
 // Removing the separation would reject the equivalent implementation as behavior.
 assert.equal(behavior(two)&&compliance(equivalent),false);assert.equal(behavior(two),true);summary.mutations.push({id:'M18.separate-behavior-from-compliance',mutant:'RED',restored:'GREEN',scope:'actual dummy black-box only'});summary.controls.push({id:'M18.equivalent-implementations',behavior:['PASS','PASS'],candidate_template_compliance:['PASS','FAIL'],gain:'NO_GAIN',scope:'actual isolated dummy programs; not native adoption'});
 const shellcheck=spawnSync('sh',['-c','command -v shellcheck'],{encoding:'utf8'});if(shellcheck.status===0){const checked=spawnSync(shellcheck.stdout.trim(),[join(scratch,'candidate/wizard.sh')],{encoding:'utf8'});summary.commands.push({command:'available shellcheck',exit_code:checked.status,stdout:checked.stdout,stderr:checked.stderr});assert.equal(checked.status,0,checked.stdout+checked.stderr);}else summary.commands.push({command:'shellcheck availability',status:'UNAVAILABLE',exit_code:shellcheck.status});
}

const receiptFields=['case_id','fixture_id','method_ids','assertion_ids','trial','arm','harness','runtime_root','head','tree','runtime_manifest_ref','body_sha','input_sha','output_sha','fixture_sha','execution_level','native_agent_type','mr_scene','native_role','native_sid','root_session_id','activation_id','root_generation','release_digest','transcript','invocation','started_at','completed_at','exit_code','completion_status','assertions','verdict','evidence_paths','input_ref','output_ref','body_refs','observation','review','provider_transcript'];
const missingReceiptFields=t=>receiptFields.filter(k=>!Object.hasOwn(t||{},k)||t[k]===undefined||t[k]===null);
function nativeProviderPath(path,sid,harness){
 const prefix=harness==='codex'?'/Users/luca/.codex/sessions/':harness==='claude'?'/Users/luca/.claude/projects/':null;
 if(!prefix||typeof path!=='string'||typeof sid!=='string'||!sid||!path.startsWith(prefix)||resolve(path)!==path)return false;
 if(harness==='claude')return path.endsWith(sid+'.jsonl');
 // Desktop continuation keeps session_meta.id but appends a new rollout UUID.
 // Accept only these two native filename forms; authenticated SID/meta, official
 // invocation, exact raw SHA, realpath and completion checks below still apply.
 const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
 if(!new RegExp('^'+uuid+'$').test(sid))return false;
 return new RegExp('^rollout-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-'+sid+'(?:_'+uuid+')?\\.jsonl$').test(basename(path));
}
const officialApiAuthority=Symbol('verified read-only official API');
function assertOfficialCodexProof(t,activation,call,authority){
 assert.equal(authority,officialApiAuthority,'producer JSON cannot replace official read-only API');
 assert.ok(activation,'official activation unavailable');assert.equal(activation.critical_failure,false);
 for(const key of ['root_session_id','activation_id','root_generation','release_digest'])assert.equal(activation[key],t[key],`official ${key} mismatch`);
 if(t.invocation==='none'){assert.equal(t.native_sid,t.root_session_id);return;}
 assert.ok(call,'official external identity has no unique invocation');assert.equal(call.status,'accepted','official same invocation not accepted/completed');assert.equal(call.invocation_id,t.invocation);
 for(const key of ['root_session_id','activation_id','root_generation','release_digest'])assert.equal(call[key],t[key],`invocation ${key} mismatch`);
 assert.equal(call.external_identity?.agent_id,t.native_sid);assert.equal(call.external_identity?.agent_type,t.native_agent_type);assert.equal(call.input_sha,t.input_sha);assert.equal(call.requested_role,t.native_role);assert.equal(call.route_harness,'codex-native');assert.ok(call.evidence_ref?.startsWith('codex-transcript:'),'non-provider evidence cannot be official');
 // The trusted host's accepted state requires completed/same_invocation_success,
 // rerouted=false and fallback=false. No producer-supplied JSON can replace that API.
 assert.equal(t.rerouted,false);assert.equal(t.fallback,false);assert.equal(t.same_invocation_accepted,true);
 const proofPath=call.evidence_ref.slice('codex-transcript:'.length).replace(/:[^:]+$/,'');assert.equal(proofPath,t.provider_transcript.path);
}
function evidenceContractNegatives(){
 // Filename compatibility is a shape test only; it grants no native authority.
 const sid='01a0f1b4-fade-7c13-824e-9cff52b68e3f',rotation='01a0f4dc-d95f-76c2-9c4f-12dcdfccef52';
 const stem='/Users/luca/.codex/sessions/2026/10/01/rollout-2026-10-01T08-28-29-'+sid;
 assert.ok(nativeProviderPath(stem+'.jsonl',sid,'codex'));
 assert.ok(nativeProviderPath(stem+'_'+rotation+'.jsonl',sid,'codex'));
 for(const [label,path,claimed]of [['wrong-session',stem+'_'+rotation+'.jsonl',rotation],['arbitrary-suffix',stem+'_untrusted.jsonl',sid],['outside-provider','/tmp/'+basename(stem)+'.jsonl',sid],['non-normalized',stem+'/../'+basename(stem)+'.jsonl',sid]]){assert.equal(nativeProviderPath(path,claimed,'codex'),false,label);summary.mutations.push({id:'native-provider-filename.'+label,mutant:'RED',restored:'GREEN (shape only)',native_result:'UNKNOWN',scope:'synthetic locator only; actual SID/API/meta/raw/completion remain mandatory'});}
 assert.ok(nativeProviderPath('/Users/luca/.claude/projects/example/'+sid+'.jsonl',sid,'claude'));
 summary.controls.push({id:'native-provider-canonical-and-desktop-continuation',result:'SHAPE_ONLY',scope:'synthetic filenames; not native adoption or Human Gate'});
 const synthetic=Object.fromEntries(receiptFields.map(k=>[k,'SYNTHETIC_NOT_RUN']));Object.assign(synthetic,{origin:'synthetic_shape_only',invocation:'none',completion_status:'NOT_RUN',verdict:'UNKNOWN',root_generation:0});assert.deepEqual(missingReceiptFields(synthetic),[]);
 for(const field of receiptFields){const omitted=copy(synthetic);delete omitted[field];assert.ok(missingReceiptFields(omitted).includes(field));assert.deepEqual(missingReceiptFields(synthetic),[]);summary.mutations.push({id:'receipt-required.'+field,mutant:'RED',restored:'GREEN',native_result:'UNKNOWN',scope:'synthetic shape only; no Htest/API/--evidence execution'});}
 assert.throws(()=>assertOfficialCodexProof(synthetic,null,null));
 assert.throws(()=>grantShape({gate:'Htest',status:'APPROVED',human_evidence_ref:'self-authored'}));
 const fakeScope={exact_paths:[],native_provider_rules:[],runtime_manifests:[]};assert.throws(()=>grantShape({gate:'Htest',status:'APPROVED',scope:fakeScope,scope_sha256:'wrong',human_approval:{}}));
 const shapes=fixtures.flatMap(f=>f.arms.flatMap(arm=>f.harnesses.flatMap(harness=>f.trials.map(trial=>({fixture_id:f.id,arm,harness,trial})))));assert.deepEqual(exactTrialKeyProblems(shapes),[]);
 for(const [field,value]of [['arm','wrong'],['harness','wrong'],['trial',4]]){const changed=copy(shapes);changed.push({...shapes[0],[field]:value});assert.ok(exactTrialKeyProblems(changed).some(x=>x.reason==='extra/wrong exact trial key'));assert.deepEqual(exactTrialKeyProblems(shapes),[]);summary.mutations.push({id:'exact-native-trial-key.'+field,mutant:'RED',restored:'GREEN (shape only)',native_result:'UNKNOWN',scope:'synthetic key set only; no native rows'});}
 summary.controls.push({id:'Htest-grant-refuses-self-authored-string-and-wrong-scope-hash',result:'UNKNOWN',scope:'synthetic refusal only; no positive human approval invented'});
 // Byte-binding sensitivity uses explicitly synthetic message-shaped data;
 // it creates no activation, completion, acceptance or native review receipt.
 const reviewExample={origin:'synthetic_review_binding_only',scope_complete:true,producer_distinct:true,rationale:'Synthetic review payload binding example only.',findings:[{criterion:'synthetic criterion',conclusion:'unobservable',observed_facts:['synthetic only']}]};const finalText=JSON.stringify(reviewExample);const event={type:'response_item',origin:'synthetic_review_binding_only',payload:{type:'message',role:'assistant',channel:'final',content:[{type:'output_text',text:finalText}]}};const bytes=Buffer.from(JSON.stringify(event)+'\n');const result=Buffer.from(finalText);const judgeShape={harness:'codex',origin:'synthetic_review_binding_only'};
 bindIndependentReviewResult(reviewExample,judgeShape,bytes,result,result);
 for(const label of ['findings','raw-result','judge-output']){const altered=copy(reviewExample);altered.findings[0].conclusion='violation';assert.throws(()=>bindIndependentReviewResult(label==='findings'?altered:reviewExample,judgeShape,bytes,label==='raw-result'?Buffer.from('wrong'):result,label==='judge-output'?Buffer.from('wrong'):result));bindIndependentReviewResult(reviewExample,judgeShape,bytes,result,result);summary.mutations.push({id:'independent-review-result-binding.'+label,mutant:'RED',restored:'GREEN (byte binding only)',native_result:'UNKNOWN',scope:'synthetic message-shaped binding only; authentic native prerequisite remains absent'});}

 // Binding examples remain NOT_RUN, never accepted/completed. Each invalid field
 // is tested independently while the authentic-proof prerequisite remains UNKNOWN.
 const bindingRules={root_session_id:(t,a,c)=>a.root_session_id===t.root_session_id&&c.root_session_id===t.root_session_id,activation_id:(t,a,c)=>a.activation_id===t.activation_id&&c.activation_id===t.activation_id,root_generation:(t,a,c)=>a.root_generation===t.root_generation&&c.root_generation===t.root_generation,release_digest:(t,a,c)=>a.release_digest===t.release_digest&&c.release_digest===t.release_digest,invocation:(t,a,c)=>c.invocation_id===t.invocation,native_sid:(t,a,c)=>c.external_identity?.agent_id===t.native_sid,native_agent_type:(t,a,c)=>c.external_identity?.agent_type===t.native_agent_type,input_sha:(t,a,c)=>c.input_sha===t.input_sha,native_role:(t,a,c)=>c.requested_role===t.native_role};
 const t={...synthetic,invocation:'SYNTHETIC_NOT_RUN',native_sid:'SYNTHETIC_SID',native_agent_type:'worker',native_role:'anchor'};const a={origin:'synthetic_binding_example',critical_failure:false,...Object.fromEntries(['root_session_id','activation_id','root_generation','release_digest'].map(k=>[k,t[k]]))};const c={origin:'synthetic_binding_example',status:'NOT_RUN',...a,invocation_id:t.invocation,input_sha:t.input_sha,requested_role:t.native_role,external_identity:{agent_id:t.native_sid,agent_type:t.native_agent_type}};
 assert.throws(()=>assertOfficialCodexProof(t,a,c),'synthetic NOT_RUN cannot satisfy official completed/accepted gate');
 for(const [field,rule]of Object.entries(bindingRules)){assert.equal(rule(t,a,c),true);const changed=copy(t);changed[field]='INVALID_SYNTHETIC_BINDING';assert.equal(rule(changed,a,c),false);assert.equal(rule(t,a,c),true);summary.mutations.push({id:'native-proof-binding.'+field,mutant:'RED',restored:'GREEN (binding contract only)',native_result:'UNKNOWN',scope:'synthetic binding only; authentic acceptance remains absent'});}
 const probes=[['producer object cannot replace read-only official API',()=>assert.throws(()=>assertOfficialCodexProof(t,a,c))],['interrupted status NOT_RUN',()=>assert.equal(c.status==='accepted',false)],['missing provider reference',()=>assert.equal(typeof c.evidence_ref==='string'&&c.evidence_ref.startsWith('codex-transcript:'),false)],['critical failure or fallback',()=>assert.equal(({critical_failure:true,fallback:true}).critical_failure===false&&({fallback:true}).fallback===false,false)]];
 for(const [label,probe]of probes){probe();summary.mutations.push({id:'native-proof-refusal.'+label,mutant:'RED',restored:'GREEN (refusal predicate)',native_result:'UNKNOWN',scope:'actual synthetic refusal predicate; no positive completion/acceptance receipt'});}
}
function exactTrialKeyProblems(trials){
 const expected=new Set(fixtures.flatMap(f=>f.arms.flatMap(arm=>f.harnesses.flatMap(harness=>f.trials.map(trial=>`${f.id}/${arm}/${harness}/${trial}`)))));
 const keys=trials.map(t=>`${t.fixture_id}/${t.arm}/${t.harness}/${t.trial}`);const found=new Set(keys);const problems=[];
 if(found.size!==keys.length)problems.push({status:'UNKNOWN',reason:'duplicate trial key'});
 for(const key of keys)if(!expected.has(key))problems.push({key,status:'UNKNOWN',reason:'extra/wrong exact trial key'});
 for(const key of expected)if(!found.has(key))problems.push({key,status:'UNKNOWN',reason:'missing exact trial key'});
 return problems;
}
function grantShape(authorization){
 assert.equal(authorization.gate,'Htest');assert.equal(authorization.status,'APPROVED');const scope=authorization.scope;
 assert.ok(scope&&Array.isArray(scope.exact_paths)&&Array.isArray(scope.native_provider_rules)&&Array.isArray(scope.runtime_manifests));
 assert.equal(authorization.scope_sha256,sha(canonical(scope)),'immutable human scope hash mismatch');unique(scope.exact_paths.map(x=>x.path),'Htest paths');
 for(const item of scope.exact_paths){assert.ok(isAbsolute(item.path)&&resolve(item.path)===item.path&&item.purpose);assert.ok(item.preimage&&['file','absent'].includes(item.preimage.type));if(item.preimage.type==='file')assert.ok(/^[a-f0-9]{64}$/.test(item.preimage.sha256));else assert.equal(item.preimage.sha256,null);}
 const proof=authorization.human_approval;assert.ok(proof&&proof.native_sid&&proof.root_session_id&&proof.reference&&proof.approval_text&&proof.scope_message_text);assert.equal(proof.scope_sha256,authorization.scope_sha256);assert.ok(proof.scope_message_text.includes(proof.scope_sha256),'human scope was not displayed verbatim');
 assert.ok(/Htest/.test(proof.scope_message_text)&&/(批准|同意|授权|approve|authoriz)/i.test(proof.approval_text),'actual displayed Htest scope and affirmative human approval absent');
 return scope;
}
function assistantOutputTexts(events,harness){
 return events.flatMap(event=>{const message=harness==='codex'&&event.type==='response_item'?event.payload:harness==='claude'&&event.type==='assistant'?event.message:null;if(!message||message.role!=='assistant'||message.type&&message.type!=='message'||harness==='codex'&&message.channel!=='final')return [];const text=(message.content||[]).filter(c=>['output_text','text'].includes(c.type)).map(c=>c.text||'').join('\n');return text?[text]:[];});
}
function semanticReviewPayload(review){return {scope_complete:review.scope_complete,producer_distinct:review.producer_distinct,rationale:review.rationale,findings:review.findings};}
function bindIndependentReviewResult(review,judge,providerBytes,resultBytes,outputBytes){
 const events=providerBytes.toString('utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line));const finalText=assistantOutputTexts(events,judge.harness).at(-1);assert.ok(finalText,'native independent final review output absent');assert.equal(sha(resultBytes),sha(Buffer.from(finalText)),'structured review raw result differs from actual independent final output');
 const stripped=finalText.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/,'$1');const nativeReview=JSON.parse(stripped);assert.equal(sha(canonical(semanticReviewPayload(nativeReview))),sha(canonical(semanticReviewPayload(review))),'review findings were not authored in the authentic independent output');
 const output=outputBytes.toString('utf8');let outputBound=output.trim()===finalText.trim();if(!outputBound){const outputEvents=output.split('\n').filter(Boolean).map(line=>JSON.parse(line));outputBound=assistantOutputTexts(outputEvents,judge.harness).includes(finalText);}assert.ok(outputBound,'judge output SHA is not bound to actual final review');
}
async function evidenceCompleteness(indexPath){
 // H0 never invokes this branch. The later operator names the actual human
 // transcript explicitly; a producer's APPROVED string alone has no authority.
 assert.ok(option('--htest-receipt')&&option('--human-approval-transcript'),'actual Htest grant and explicitly authorized human transcript required');
 const authorization=JSON.parse(readFileSync(resolve(option('--htest-receipt')),'utf8'));const scope=grantShape(authorization);
 const index=JSON.parse(readFileSync(indexPath,'utf8'));assert.equal(index.scope,'native_evidence_completeness_only');assert.ok(Array.isArray(index.trials)&&Array.isArray(index.raw_inventory));
 unique(index.raw_inventory.map(x=>x.path),'post-run raw inventory');for(const ref of index.raw_inventory)assert.ok(isAbsolute(ref.path)&&resolve(ref.path)===ref.path&&/^[a-f0-9]{64}$/.test(ref.sha256));
 const problems=exactTrialKeyProblems(index.trials);const authenticatedProviders=new Set();
 function raw(ref){
  assert.ok(ref&&isAbsolute(ref.path)&&resolve(ref.path)===ref.path&&/^[a-f0-9]{64}$/.test(ref.sha256)&&ref.locator,'missing exact raw reference');
  assert.ok(scope.exact_paths.some(a=>a.path===ref.path)||authenticatedProviders.has(ref.path),'raw reference outside finite human scope or authenticated provider proof');
  assert.ok(index.raw_inventory.some(a=>a.path===ref.path&&a.sha256===ref.sha256),'actual post-run hash inventory missing or mismatched');
  assert.equal(realpathSync(ref.path),ref.path,'raw symlink cannot widen scope');const bytes=readFileSync(ref.path);assert.equal(sha(bytes),ref.sha256,'raw evidence hash changed');return bytes;
 }
 // Frozen actual U011 host bytes authenticate the read-only API; input JSON or
 // a substitute module cannot mint the private authority token below.
 const hostPath=join(root,'scripts/model-route-host.mjs');assert.equal(sha(readFileSync(hostPath)),compiled.trusted_official_host_sha256,'official read-only host changed');
 const host=await import(pathToFileURL(hostPath).href); // Only readActivation/findInvocationByExternalIdentity are called.
 function authorizeProvider(proof){
  assert.ok(proof.native_sid&&proof.root_session_id&&proof.provider_transcript?.path);const path=proof.provider_transcript.path;
  const prefix=proof.harness==='codex'?'/Users/luca/.codex/sessions/':proof.harness==='claude'?'/Users/luca/.claude/projects/':null;assert.ok(prefix,'unknown native provider');
  assert.ok(nativeProviderPath(path,proof.native_sid,proof.harness),'not the actual finite native SID transcript');
  assert.ok(scope.native_provider_rules.some(r=>r.harness===proof.harness&&r.root===prefix&&r.binding==='authenticated-native-provider-single-file'),'provider path rule not in human scope');
  if(proof.harness==='codex'){
   const activation=host.readActivation({harness:'codex',root_session_id:proof.root_session_id});const call=proof.invocation==='none'?null:host.findInvocationByExternalIdentity({harness:'codex',root_session_id:proof.root_session_id,field:'agent_id',value:proof.native_sid});assertOfficialCodexProof(proof,activation,call,officialApiAuthority);
  }else{
   assert.equal(proof.invocation,'none');assert.equal(proof.model_adapter_status,'DEFERRED');assert.equal(proof.activation_id,'NOT_AVAILABLE');assert.equal(proof.root_generation,'NOT_AVAILABLE');assert.equal(proof.release_digest,'NOT_AVAILABLE');assert.ok(!proof.same_invocation_accepted,'no Claude accepted-equivalence claim');
   // The approved, exact output file must contain the actual provider init SID
   // and completion before it authorizes reading one matching private log.
   const stream=raw(proof.transcript).toString('utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line));assert.ok(stream.some(e=>e.type==='system'&&e.subtype==='init'&&e.session_id===proof.native_sid),'actual Claude init identity missing');assert.ok(stream.some(e=>e.type==='result'&&e.session_id===proof.native_sid&&e.is_error===false),'actual Claude completion missing');
  }
  authenticatedProviders.add(path);return raw(proof.provider_transcript);
 }
 // Read the one actual human proof named by the operator, never a directory.
 const human=authorization.human_approval;assert.equal(resolve(option('--human-approval-transcript')),human.reference.path,'human proof was not explicitly authorized by operator');
 assert.equal(human.harness,'codex','current Htest controller proof must be native Codex');assert.equal(human.native_sid,human.root_session_id);assert.ok(nativeProviderPath(human.reference.path,human.native_sid,'codex'));
 const humanActivation=host.readActivation({harness:'codex',root_session_id:human.root_session_id});assert.ok(humanActivation&&humanActivation.root_session_id===human.root_session_id);for(const key of ['activation_id','root_generation','release_digest'])assert.equal(humanActivation[key],human[key]);
 authenticatedProviders.add(human.reference.path);const humanEvents=raw(human.reference).toString('utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line));assert.equal(humanEvents.find(e=>e.type==='session_meta')?.payload?.id,human.native_sid);
 const messages=humanEvents.filter(e=>e.type==='response_item'&&e.payload?.type==='message').map(e=>({role:e.payload.role,text:(e.payload.content||[]).map(c=>c.text||'').join('\n')}));
 const displayed=messages.findIndex(m=>m.role==='assistant'&&m.text.includes(human.scope_message_text));assert.ok(displayed>=0,'scope SHA was not displayed in actual controller transcript');assert.ok(messages.slice(displayed+1).some(m=>m.role==='user'&&m.text===human.approval_text),'actual subsequent human approval absent');
 // Initial approval binds finite paths/preimages; future output hashes live
 // only in raw_inventory, populated after the actual run.
 for(const required of [hostPath,join(root,'.claude/skill-os/model-routing.yaml')]){const item=scope.exact_paths.find(x=>x.path===required);assert.ok(item&&item.preimage.type==='file','trusted source preimage absent');assert.equal(sha(readFileSync(required)),item.preimage.sha256);}
 const policyPath=join(root,'.claude/skill-os/model-routing.yaml');const policyRef=index.raw_inventory.find(x=>x.path===policyPath);const policyBytes=raw({...policyRef,locator:'public routing policy'});const parsed=spawnSync('python3',['-c','import yaml,json,sys;print(json.dumps(yaml.safe_load(sys.stdin.read())["model_routing"]))'],{input:policyBytes,encoding:'utf8'});assert.equal(parsed.status,0);const policy=JSON.parse(parsed.stdout);
 function providerCompletion(proof,bytes){
  const events=bytes.toString('utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line));
  if(proof.harness==='codex'){
   const meta=events.find(e=>e.type==='session_meta')?.payload;assert.equal(meta?.id,proof.native_sid);assert.equal(meta?.cwd,proof.runtime_root);if(proof.invocation!=='none'){assert.equal(meta?.parent_thread_id,proof.root_session_id);assert.equal(meta?.source?.subagent?.thread_spawn?.agent_role,proof.native_agent_type);}
   assert.ok(!events.some(e=>e.type==='turn_aborted'),'interrupted native session');assert.ok(events.some(e=>e.type==='event_msg'&&e.payload?.type==='task_complete'),'actual completion boundary absent');
   assert.equal(policy.scenes[proof.mr_scene]?.role,proof.native_role);if(proof.invocation!=='none')assert.equal(policy.dispatch.native_agent_types[proof.native_agent_type],proof.mr_scene);
  }else assert.ok(events.some(e=>e.sessionId===proof.native_sid||e.session_id===proof.native_sid),'Claude SID absent from native log');
 }
 for(const f of fixtures)for(const arm of f.arms)for(const harness of f.harnesses)for(const trial of f.trials){const key=`${f.id}/${arm}/${harness}/${trial}`;const t=index.trials.find(t=>`${t.fixture_id}/${t.arm}/${t.harness}/${t.trial}`===key);try{
  assert.ok(t,'missing trial');assert.deepEqual(missingReceiptFields(t),[]);assert.equal(t.origin,'native');assert.equal(t.case_id,f.case_id);assert.deepEqual(t.method_ids,f.method_ids);assert.deepEqual(t.assertion_ids,f.expected_assertions);assert.equal(t.input_sha,f.input_sha);assert.equal(t.fixture_sha,sha(canonical(f.neutral_files)));assert.equal(t.execution_level,f.execution_level);assert.ok(/^MR-00[1-8]$/.test(t.mr_scene));assert.ok(['anchor','peak','light'].includes(t.native_role));
  assert.ok(isAbsolute(t.runtime_root)&&/^[a-f0-9]{40}$/.test(t.head)&&/^[a-f0-9]{40}$/.test(t.tree));const runtime=scope.runtime_manifests.find(x=>x.arm===arm&&x.harness===harness&&x.runtime_root===t.runtime_root);assert.ok(runtime,'unapproved runtime identity');for(const field of ['head','tree','body_sha'])assert.deepEqual(t[field],runtime[field]);const runtimeReadback=JSON.parse(raw(t.runtime_manifest_ref));for(const field of ['runtime_root','head','tree','body_sha'])assert.deepEqual(runtimeReadback[field],t[field]);assert.ok(Array.isArray(t.body_refs)&&t.body_refs.length===Object.keys(t.body_sha).length);unique(t.body_refs.map(x=>x.consumer_path),'body consumers');for(const ref of t.body_refs){raw(ref);assert.equal(t.body_sha[ref.consumer_path],ref.sha256);}
  assert.equal(sha(raw(t.input_ref)),t.input_sha);assert.equal(sha(raw(t.output_ref)),t.output_sha);assert.equal(t.exit_code,0);assert.equal(t.completion_status,'completed');assert.ok(Number.isFinite(Date.parse(t.started_at))&&Date.parse(t.completed_at)>=Date.parse(t.started_at));assert.ok(Array.isArray(t.evidence_paths)&&t.evidence_paths.length);for(const ref of t.evidence_paths)raw(ref);
  const provider=authorizeProvider(t);providerCompletion(t,provider);assert.ok(raw(t.transcript).length);
  const observation=JSON.parse(raw(t.observation));assert.equal(observation.origin,'native_raw_observation');assert.equal(observation.scope_complete,true);assert.equal(observation.native_sid,t.native_sid);assert.equal(observation.invocation,t.invocation);assert.ok(Array.isArray(observation.carriers));for(const carrier of observation.carriers)raw(carrier);
  const review=JSON.parse(raw(t.review));assert.equal(review.producer_distinct,true);assert.ok(review.judge_id&&review.judge_id!==t.native_sid&&review.rationale);assert.equal(review.scope_complete,true);assert.ok(Array.isArray(review.findings));
  const judge=review.judge_provider_proof;assert.ok(judge&&judge.origin==='native'&&judge.native_sid===review.judge_id&&judge.invocation===review.invocation_id,'authentic independent judge proof absent');assert.equal(judge.completion_status,'completed');assert.equal(judge.exit_code,0);assert.ok(Number.isFinite(Date.parse(judge.started_at))&&Date.parse(judge.completed_at)>=Date.parse(judge.started_at));assert.equal(sha(raw(judge.input_ref)),judge.input_sha);const judgeOutput=raw(judge.output_ref);assert.equal(sha(judgeOutput),judge.output_sha);const judgeProvider=authorizeProvider(judge);providerCompletion(judge,judgeProvider);bindIndependentReviewResult(review,judge,judgeProvider,raw(review.raw_result_ref),judgeOutput);assert.ok(raw(judge.transcript).length);
  // A main Claude/Codex reviewer can legitimately have invocation='none'. A
  // delegated Codex reviewer still requires authentic same-invocation proof.
  assert.deepEqual(Object.keys(t.assertions).sort(),f.expected_assertions.slice().sort());assert.ok(['PASS','FAIL','NOT_APPLICABLE'].includes(t.verdict),'UNKNOWN verdict blocks completeness');
  for(const finding of review.findings){assert.ok(finding.observed_facts?.length&&finding.rationale&&finding.evidence_refs?.length);for(const ref of finding.evidence_refs)raw(ref);assert.ok(['satisfied','violation','not_applicable'].includes(finding.conclusion),'unobservable review blocks completeness');}
  for(const id of f.expected_assertions){const p=compiled.programs.find(p=>p.assertion_id===id);for(const kind of p.carrier_contract.required)assert.ok(observation.carriers.some(c=>c.kind===kind),'required raw carrier absent');if(arm==='baseline'&&p.classification==='candidate_compliance'){assert.equal(t.assertions[id],'NOT_APPLICABLE');assert.ok(review.findings.some(x=>x.assertion_id===id&&x.conclusion==='not_applicable'));continue;}assert.ok(['PASS','FAIL'].includes(t.assertions[id]));for(const s of p.subchecks)assert.equal(review.findings.filter(x=>x.assertion_id===id&&x.criterion===s.rubric&&x.rubric_sha256===s.rubric_sha256).length,1,'incomplete independent conjunct review');}
 }catch(error){problems.push({key,status:'UNKNOWN',reason:error.message});}}
 return {scope:'native_evidence_completeness_only',status:problems.length?'UNKNOWN':'COMPLETE',native_behavior:'NOT_JUDGED',adoption:'PENDING',problems,trial_count:index.trials.length};
}
try{
 coverageGate(coverage,fixtures);
 if(option('--evidence')){const result=await evidenceCompleteness(option('--evidence'));console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='COMPLETE'?0:1;}
 else{const unit=option('--unit');assert.ok(process.argv.includes('--all')||unit,'use --all, --unit Uxxx or --evidence index.json');if(unit)assert.ok(Object.hasOwn(compiled.units,unit),`unknown exact unit ${unit}`);const selected=unit?compiled.units[unit]:coverage.entries.map(e=>e.method_id);syntheticTests(selected);if(selected.includes('M18'))wizardTests();summary.coverage={methods:coverage.entries.length,atomic_assertions:compiled.programs.length,gain_goals:17,gain_methods:16,preservation_methods:22,fixture_rows:fixtures.length,selected_methods:selected,unit:unit||'all'};summary.status='STATIC_SYNTHETIC_PASS';if(option('--output'))writeFileSync(option('--output'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({scope:summary.scope,status:summary.status,native_behavior:summary.native_behavior,adoption:summary.adoption,coverage:summary.coverage,mutations:summary.mutations.length,controls:summary.controls.length,commands:summary.commands.length,synthetic_traces:summary.synthetic_traces.length},null,2));}
}catch(error){if(option('--evidence')){console.error(JSON.stringify({scope:'native_evidence_completeness_only',status:'UNKNOWN',native_behavior:'NOT_JUDGED',adoption:'PENDING',problems:[{reason:error.message}]},null,2));process.exitCode=1;}else{summary.status='FAIL';summary.failures.push({message:error.message,stack:error.stack});if(option('--output'))writeFileSync(option('--output'),JSON.stringify(summary,null,2)+'\n');console.error('FAIL matt offline:',error.stack);process.exitCode=1;}}
