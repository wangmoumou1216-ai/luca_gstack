#!/usr/bin/env node
// Real CLI in task-owned OS temp. No production governance data is written.
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,statSync,renameSync,readdirSync,chmodSync,symlinkSync,linkSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {run,evolution,load,bundle,candidate,verdict,ledgerBytes,snapshot,adoptionReview} from './test-scout-workflows.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=process.env.BOOKKEEP_TEST_CLI || join(ROOT,'scripts/evolution-bookkeep.mjs');
const scratch=mkdtempSync(join(tmpdir(),'workflow-bookkeep-test-'));
const source=id=>`  - id: ${id}\n    note: preserve me\n    yield_stats: { runs: 3, surfaced: 4, approved: 2, zero_yield_streak: 1 }\n    status: active\n`;
const sweep=await run(), punctual=await run(evolution,{target_repos:['owner/one','owner/two']});
let serial=0;
function fixture(input=sweep,registry='sources:\n'+source('S10')+source('S1')) {
  const root=join(scratch,String(serial++)), dir=join(root,'.claude/skill-os/evolution'); mkdirSync(dir,{recursive:true});
  const log=join(dir,'candidate-log.jsonl'), reg=join(dir,'sources-registry.yaml'), json=join(root,'input.json');
  writeFileSync(log,'{"run":"prior","note":"untouched"}\n'); writeFileSync(join(dir,'adoption-log.jsonl'),ledgerBytes); writeFileSync(reg,registry); writeFileSync(json,JSON.stringify(input));
  const invoke=(args=[],script=cli,env={})=>spawnSync(process.execPath,[script,json,'--root',root,...args],{encoding:'utf8',timeout:10000,env:{...process.env,...env}});
  return {root,dir,log,reg,json,invoke,adoption:join(dir,'adoption-log.jsonl'),journal:join(dir,'.evolution-bookkeep-journal.json'),lock:join(dir,'.evolution-bookkeep.lock')};
}
function bytes(f) { return [f.log,f.reg].map(p=>({bytes:readFileSync(p),mtime:statSync(p).mtimeMs})); }
function reject(input,registry,script=cli) {
  const f=fixture(input,registry), before=bytes(f), r=f.invoke([],script);
  assert.notEqual(r.status,0,`unexpected acceptance: ${r.stdout}`); assert.deepEqual(bytes(f),before,'rejected input wrote governance data'); return r;
}
const cases=[];const test=(id,fn)=>cases.push([id,fn]);
test('real sweep appends exact candidates and updates only S1',()=>{
  const f=fixture(),r=f.invoke();assert.equal(r.status,0,r.stderr);
  const rows=readFileSync(f.log,'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(rows.length,3);assert.equal(rows[0].note,'untouched');assert.equal(rows[1].verified,1);
  assert.equal(rows[1].bookkeep,true);assert.equal(rows[2].repo,'owner/one');
  assert.equal(readFileSync(f.reg,'utf8'),'sources:\n'+source('S10')+source('S1').replace('runs: 3, surfaced: 4, approved: 2, zero_yield_streak: 1','runs: 4, surfaced: 5, approved: 3, zero_yield_streak: 0'));
  const before=bytes(f),again=f.invoke();assert.equal(again.status,0,again.stderr);assert.match(again.stdout,/idempotent/);assert.deepEqual(bytes(f),before);
});
test('punctual conserves both targets and never updates source registry',()=>{
  const f=fixture(punctual),before=readFileSync(f.reg),r=f.invoke();assert.equal(r.status,0,r.stderr);assert.deepEqual(readFileSync(f.reg),before);
  const rows=readFileSync(f.log,'utf8').trim().split('\n').map(JSON.parse);assert.equal(rows.length,4);assert.deepEqual(rows.slice(2).map(r=>r.repo),['owner/one','owner/two']);
});
test('dry-run has zero writes',()=>{
  const f=fixture(),before=bytes(f),r=f.invoke(['--dry-run']);assert.equal(r.status,0,r.stderr);assert.deepEqual(bytes(f),before);
});
for(const [id,change] of [
 ['incomplete',v=>{v.run_status='INCOMPLETE'}],['unknown mode',v=>{v.mode='other'}],
 ['missing result',v=>{v.approved=[]}],['duplicate candidate',v=>{v.approved.push(v.approved[0])}],
 ['stats mismatch',v=>{v.stats.approved=2}],['stats metadata run',v=>{v.stats.run='hijack'}],['stats metadata bookkeep',v=>{v.stats.bookkeep=false}],
 ['stats negative',v=>{v.stats.verified=-1}],['stats string',v=>{v.stats.raw='1'}],
 ['missing coverage',v=>{delete v.phase_coverage}],['missing phase result',v=>{v.phase_coverage.Discover.completed=[]}],
 ['changed verify identity',v=>{v.phase_coverage.Verify.expected=['other/repo#one'];v.phase_coverage.Verify.completed=['other/repo#one']}],
 ['nonempty failure evidence',v=>{v.failures=[{phase:'Verify'}]}],['quarantined result',v=>{v.approved_quarantined=[v.approved[0]]}],
 ['source string count',v=>{v.source_yield.S1.surfaced='9'}],['source wrong approved count',v=>{v.source_yield.S1.approved=9}],
 ['candidate source spoof',v=>{v.approved[0].source_id='S10'}],
 ['bucket verdict contradiction',v=>{v.approved[0].verdict='REJECTED';v.approved[0].hard.safety='FAIL'}],
 ['hard gate contradiction',v=>{v.approved[0].hard.safety='FAIL'}],
 ['score range contradiction',v=>{v.approved[0].scores.fit=99}],
 ['weighted score contradiction',v=>{v.approved[0].weighted_score=99}],
 ['redteam contradiction',v=>{v.approved[0].redteam.redteam_verdict='killed'}],
 ['missing redteam',v=>{delete v.approved[0].redteam}],
 ['no open gap recommendation',v=>{v.approved[0].gap_id='none'}],
]) test(`zero writes: ${id}`,()=>{const v=structuredClone(sweep);change(v);reject(v)});
for(const [id,registry] of [
 ['S1 missing own yield cannot consume S10','sources:\n  - id: S1\n    status: active\n'+source('S10')],
 ['only prefix S10 cannot match S1','sources:\n'+source('S10')],
 ['unknown source','sources:\n'+source('S2')],
 ['duplicate source','sources:\n'+source('S1')+source('S1')],
 ['registry quoted number','sources:\n'+source('S1').replace('surfaced: 4','surfaced: "4"')],
]) test(`zero writes: ${id}`,()=>reject(sweep,registry));
test('punctual original denominator cannot shrink',()=>{const v=structuredClone(punctual);v.results.pop();reject(v)});
test('valid empty sweep can be booked',async()=>{
  const v=await run(evolution,{}, {'disc:S1':bundle([])});const r=fixture(v).invoke();assert.equal(r.status,0,r.stderr);
});
test('conditional, killed, rejected, opportunity and overflow remain bookable',async()=>{
  for(const changes of [
    {'redteam:owner/one':{redteam_verdict:'downgraded',integration_risk:'LOW',reason:'fixture'}},
    {'redteam:owner/one':{redteam_verdict:'killed',integration_risk:'LOW',reason:'fixture'}},
    {'verify:owner/one':{...verdict,hard:{...verdict.hard,safety:'FAIL'}}},
    {'disc:S1':bundle([{...candidate(),gap_id:'none'}])},
    {'disc:S1':bundle(Array.from({length:5},(_,i)=>candidate(`owner/r${i}`)))},
    {'verify:owner/one':{...verdict,gap_id:'none'}},
  ]) {const v=await run(evolution,{},changes);const r=fixture(v).invoke();assert.equal(r.status,0,r.stderr)}
});
test('all sources validated before any write',async()=>{
  const v=await run(evolution,{}, {'load:truth-files':{...load,sources:[...load.sources,{...load.sources[0],id:'S2'}]},'disc:S2':bundle([])});
  reject(v); const f=fixture(v,'sources:\n'+source('S1')+source('S2'));assert.equal(f.invoke().status,0);
  assert.match(readFileSync(f.reg,'utf8'),/S2[\s\S]*runs: 4, surfaced: 4, approved: 2, zero_yield_streak: 2/);
});
const hash=b=>createHash('sha256').update(b).digest('hex');
const allFiles=f=>Object.fromEntries(readdirSync(f.dir).sort().map(n=>[n,{bytes:readFileSync(join(f.dir,n)),mtime:statSync(join(f.dir,n)).mtimeMs}]));
const snapCli=join(ROOT,'scripts/evolution-adoption-snapshot.mjs');
const snapshotRun=(f,args=[])=>spawnSync(process.execPath,[snapCli,'--root',f.root,...args],{encoding:'utf8'});
const rows=f=>readFileSync(f.log,'utf8').trim().split('\n').map(JSON.parse);
const journal=f=>JSON.parse(readFileSync(f.journal,'utf8'));
const withDate=(date)=>({...structuredClone(sweep),run_date:date});
function asyncInvoke(f,json=f.json,args=[]) {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[cli,json,'--root',f.root,...args],{stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
    child.on('error',reject);child.on('close',(status,signal)=>resolve({status,signal,stdout,stderr}));
  });
}
test('U3-A1 snapshot preserves actual bytes, blank-line offsets, duplicate IDs; read-only',()=>{
  const f=fixture(),before=allFiles(f),r=snapshotRun(f);assert.equal(r.status,0,r.stderr);
  assert.deepEqual(JSON.parse(r.stdout),snapshot);assert.deepEqual(allFiles(f),before);
  writeFileSync(f.adoption,ledgerBytes.replaceAll('\n','\r\n'));
  const changed=JSON.parse(snapshotRun(f).stdout);assert.notEqual(changed.sha256,snapshot.sha256);assert.deepEqual(changed.entries,snapshot.entries);
  writeFileSync(f.adoption,'');assert.deepEqual(JSON.parse(snapshotRun(f).stdout),{version:1,sha256:hash(''),byte_length:0,entries:[]});
});
for(const [id,edit] of [
  ['missing',f=>rmSync(f.adoption)],['unreadable',f=>chmodSync(f.adoption,0)],
  ['malformed JSON',f=>writeFileSync(f.adoption,'{"fused_candidate_id":')],
  ['wrong row shape',f=>writeFileSync(f.adoption,'{}\n')],
  ['invalid UTF8',f=>writeFileSync(f.adoption,Buffer.from([0xff]))],
  ['symlink',f=>{rmSync(f.adoption);symlinkSync(f.json,f.adoption)}],
  ['hardlink',f=>{rmSync(f.adoption);linkSync(f.json,f.adoption)}],
]) test(`U3-A1 snapshot fails closed: ${id}`,()=>{const f=fixture();edit(f);const r=snapshotRun(f);assert.notEqual(r.status,0,r.stdout);assert.equal(r.stdout,'')});
test('U3-A1 stale expected ledger hash refuses',()=>{const f=fixture();assert.notEqual(snapshotRun(f,['--expect-sha256','0'.repeat(64)]).status,0)});
test('U3-A2 actual CLI caller freeze binds independent original denominator before Load mutation',async()=>{
  const f=fixture();
  writeFileSync(f.adoption,'{"fused_candidate_id":"original/a"}\n\n{"fused_candidate_id":"original/b"}\n{"fused_candidate_id":"original/b"}\n');
  const before=allFiles(f),r=snapshotRun(f,['--workflow-args','--date','2026-10']);assert.equal(r.status,0,r.stderr);
  const caller=JSON.parse(r.stdout);assert.equal(caller.date,'2026-10');assert.deepEqual(allFiles(f),before);
  writeFileSync(join(f.root,'caller-freeze.json'),r.stdout);
  for(const edit of [s=>{s.entries=[]},s=>s.entries.pop(),s=>{s.entries[1].line=2},s=>{s.entries[1].fused_candidate_id='forged'},s=>{s.sha256='0'.repeat(64)},s=>{s.byte_length++}]){
    const forged=structuredClone(caller.adoption_snapshot);edit(forged);
    const result=await run(evolution,caller,{'load:truth-files':{...load,adoption_snapshot:forged}});
    assert.equal(result.run_status,'INCOMPLETE');assert.ok(result.failures.some(v=>v.phase==='Load'));
  }
  const result=await run(evolution,caller,{'load:truth-files':{...load,adoption_snapshot:caller.adoption_snapshot}},{strict:true});
  assert.equal(result.run_status,'COMPLETE');assert.deepEqual(result.adoption_snapshot,caller.adoption_snapshot);
  writeFileSync(f.json,JSON.stringify(result));assert.equal(f.invoke().status,0);
  console.log(JSON.stringify({caller_freeze_path:join(f.root,'caller-freeze.json'),caller_freeze_sha256:hash(r.stdout),ledger_sha256:caller.adoption_snapshot.sha256,entries:caller.adoption_snapshot.entries}));
});
test('U3-A2 actual empty CLI caller freeze valid and unsupported date usage refuses',async()=>{
  const f=fixture();writeFileSync(f.adoption,'');const before=allFiles(f),r=snapshotRun(f,['--workflow-args']);assert.equal(r.status,0);
  const caller=JSON.parse(r.stdout);assert.deepEqual(caller,{adoption_snapshot:{version:1,sha256:hash(''),byte_length:0,entries:[]}});
  const result=await run(evolution,caller,{'load:truth-files':{...load,adoption_snapshot:caller.adoption_snapshot}},{strict:true});assert.equal(result.run_status,'COMPLETE');assert.deepEqual(allFiles(f),before);
  for(const args of [['--date','2026-10'],['--workflow-args','--workflow-args'],['--workflow-args','--date','']])assert.notEqual(snapshotRun(f,args).status,0);
});
for(const [id,edit] of [
  ['missing snapshot',v=>{delete v.adoption_snapshot}],
  ['forged hash',v=>{v.adoption_snapshot.sha256='0'.repeat(64)}],
  ['forged byte length',v=>{v.adoption_snapshot.byte_length=0}],
  ['forged original line',v=>{v.adoption_snapshot.entries[1].line=2}],
  ['shrunk denominator',v=>{v.adoption_snapshot.entries.pop();v.adoption_review.entries.pop();v.phase_coverage.AdoptionReview.expected.pop();v.phase_coverage.AdoptionReview.completed.pop()}],
  ['empty forged denominator',v=>{v.adoption_snapshot.entries=[];v.adoption_review.entries=[];v.phase_coverage.AdoptionReview={expected:[],completed:[]}}],
  ['missing review',v=>{delete v.adoption_review}],['omitted review',v=>{v.adoption_review.entries.pop()}],
  ['duplicate review',v=>{v.adoption_review.entries[1]=v.adoption_review.entries[0]}],
  ['spurious review',v=>{v.adoption_review.entries[1].line=999}],
  ['stale review',v=>{v.adoption_review.ledger_sha256='0'.repeat(64)}],
  ['fabricated helped',v=>{v.adoption_review.entries[0].helped_update='yes'}],
]) test(`U3-A3 consumer zero governance writes: ${id}`,()=>{const v=structuredClone(sweep);edit(v);reject(v)});
for(const [id,edit] of [
  ['ledger disappeared',f=>rmSync(f.adoption)],['ledger unreadable',f=>chmodSync(f.adoption,0)],
  ['ledger malformed',f=>writeFileSync(f.adoption,'bad')],['ledger byte-only drift',f=>writeFileSync(f.adoption,ledgerBytes+'\n')],
]) test(`U3-A3 consumer ${id}`,()=>{const f=fixture(),before=bytes(f);edit(f);const r=f.invoke();assert.notEqual(r.status,0);assert.deepEqual(bytes(f),before)});
test('U3-A3 actually empty adoption ledger books; punctual needs no ledger',async()=>{
  const empty={version:1,sha256:hash(''),byte_length:0,entries:[]};
  const result=await run(evolution,{adoption_snapshot:empty}, {'load:truth-files':{...load,adoption_snapshot:empty}});
  const f=fixture(result);writeFileSync(f.adoption,'');assert.equal(f.invoke().status,0);
  const p=fixture(punctual),before=statSync(p.reg).mtimeMs;rmSync(p.adoption);
  assert.equal(p.invoke().status,0);assert.equal(statSync(p.reg).mtimeMs,before);
});
test('U3-A6 dry-run zero file creations/mtime changes and inline registry comments preserved',()=>{
  const f=fixture(sweep,'# header\nsources:\n'+source('S1').replace('yield_stats: {','yield_stats: {').replace('1 }','1 } # keep inline runs: 999'));
  const before=allFiles(f);assert.equal(f.invoke(['--dry-run']).status,0);assert.deepEqual(allFiles(f),before);
  const r=f.invoke();assert.equal(r.status,0,r.stderr);assert.match(readFileSync(f.reg,'utf8'),/zero_yield_streak: 0 } # keep inline runs: 999/);
});
const boundaries=['prepared:file-fsync','prepared:rename','prepared:dir-fsync',
  'log:file-fsync','log:rename','log:dir-fsync','log:durable',
  'registry:file-fsync','registry:rename','registry:dir-fsync','registry:durable',
  'committed:file-fsync','committed:rename','committed:dir-fsync'];
for(const fault of boundaries)test(`U3-A4 real process crash/recovery ${fault}`,()=>{
  const f=fixture(withDate('fault-'+fault)),before=bytes(f);
  const crash=f.invoke([],cli,{EVOLUTION_BOOKKEEP_CRASH_AT:fault,EVOLUTION_BOOKKEEP_TEST_ROOT:f.root});
  assert.equal(crash.status,86,crash.stderr);assert.doesNotMatch(crash.stdout,/COMMITTED|✅/);
  let expected;
  if(fault!=='prepared:file-fsync'){
    const j=journal(f),tx=j.transactions[0];expected=Object.fromEntries(Object.entries(tx.after).map(([k,v])=>[k,Buffer.from(v.bytes_b64,'base64')]));
    assert.equal(j.transactions.length,1);assert.equal(tx.input_sha256,hash(readFileSync(f.json)));
    for(const states of [tx.before,tx.after])for(const value of Object.values(states))assert.equal(value.sha256,hash(Buffer.from(value.bytes_b64,'base64')));
    if(!fault.startsWith('committed:rename')&&!fault.startsWith('committed:dir-fsync'))assert.equal(tx.status,'PREPARED');
  }
  if(fault==='log:rename'){assert.notDeepEqual(readFileSync(f.log),before[0].bytes);assert.deepEqual(readFileSync(f.reg),before[1].bytes)}
  const recovered=f.invoke();assert.equal(recovered.status,0,recovered.stderr);
  if(expected){assert.deepEqual(readFileSync(f.log),expected.log);assert.deepEqual(readFileSync(f.reg),expected.registry)}
  assert.equal(rows(f).filter(r=>r.bookkeep).length,1);assert.match(readFileSync(f.reg,'utf8'),/id: S1\n[\s\S]*runs: 4, surfaced: 5, approved: 3/);
  assert.equal(journal(f).transactions[0].status,'COMMITTED');
  const after=bytes(f);assert.equal(f.invoke().status,0);assert.deepEqual(bytes(f),after);
  console.log(JSON.stringify({fault,recovered:true,log_sha256:hash(readFileSync(f.log)),registry_sha256:hash(readFileSync(f.reg)),journal_sha256:hash(readFileSync(f.journal))}));
});
test('U3-A4 PREPARED third-state refuses before repairing either file',()=>{
  for(const target of ['log','reg']){
    const f=fixture();assert.equal(f.invoke([],cli,{EVOLUTION_BOOKKEEP_CRASH_AT:'log:rename',EVOLUTION_BOOKKEEP_TEST_ROOT:f.root}).status,86);
    writeFileSync(f[target],readFileSync(f[target],'utf8')+'# foreign drift\n');const before=allFiles(f);
    const r=f.invoke();assert.notEqual(r.status,0);assert.match(r.stderr,/third-state drift/);assert.deepEqual(allFiles(f),before);
  }
});
test('U3-A4 prepared dry-run and conflicting retry cannot recover/write',()=>{
  const f=fixture();assert.equal(f.invoke([],cli,{EVOLUTION_BOOKKEEP_CRASH_AT:'log:rename',EVOLUTION_BOOKKEEP_TEST_ROOT:f.root}).status,86);
  let before=allFiles(f);assert.notEqual(f.invoke(['--dry-run']).status,0);assert.deepEqual(allFiles(f),before);
  writeFileSync(f.json,JSON.stringify({...sweep,channel_notes:['different']}));before=allFiles(f);
  assert.notEqual(f.invoke(['--force']).status,0);assert.deepEqual(allFiles(f),before);
});
test('U3-A5 same-input retry remains a no-op even with --force',()=>{
  const f=fixture();assert.equal(f.invoke().status,0);const before=allFiles(f);
  assert.equal(f.invoke(['--force']).status,0);assert.deepEqual(allFiles(f),before);
});
test('U3-A5 same run different input conflicts with and without --force',()=>{
  for(const flags of [[],['--force']]){
    const f=fixture();assert.equal(f.invoke().status,0);writeFileSync(f.json,JSON.stringify({...sweep,channel_notes:['different input']}));
    const before=allFiles(f),r=f.invoke(flags);assert.notEqual(r.status,0);assert.match(r.stderr,/same run\/different input conflict/);assert.deepEqual(allFiles(f),before);
  }
});
for(const flags of [[],['--force']])test(`U3-A5 real concurrent distinct runs retain all rows/counters (20 rounds x 4 processes) ${flags}`,async()=>{
  for(let round=0;round<20;round++){
    const f=fixture(withDate(`2026-10-${round}-A`));
    const inputs=[f.json,...Array.from({length:3},(_,i)=>{const file=join(f.root,`other-${i}.json`);writeFileSync(file,JSON.stringify(withDate(`2026-10-${round}-${i}`)));return file})];
    const results=await Promise.all(inputs.map(p=>asyncInvoke(f,p,flags)));
    console.log(JSON.stringify({concurrency_round:round,flags,processes:4,results}));
    for(const r of results)assert.equal(r.status,0,r.stderr);
    assert.equal(rows(f).filter(r=>r.bookkeep).length,4);assert.equal(journal(f).transactions.length,4);
    assert.match(readFileSync(f.reg,'utf8'),/id: S1\n[\s\S]*runs: 7, surfaced: 8, approved: 6/);
    const before=allFiles(f);assert.equal(f.invoke().status,0);assert.deepEqual(allFiles(f),before);
  }
});
for(const flags of [[],['--force']])test(`U3-A5 real concurrent identical input commits exactly once ${flags}`,async()=>{
  const f=fixture();const results=await Promise.all(Array.from({length:4},()=>asyncInvoke(f,f.json,flags)));
  for(const r of results)assert.equal(r.status,0,r.stderr);
  assert.equal(results.filter(r=>r.stdout.includes('idempotent')).length,3);
  assert.equal(rows(f).filter(r=>r.bookkeep).length,1);assert.equal(journal(f).transactions.length,1);
});
for(const flags of [[],['--force']])test(`U3-A5 real concurrent conflicting inputs ${flags}`,async()=>{
  const f=fixture(),other=join(f.root,'other.json');writeFileSync(other,JSON.stringify({...sweep,channel_notes:['conflicting']}));
  const results=await Promise.all([asyncInvoke(f,f.json,flags),asyncInvoke(f,other,flags)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[0,2]);assert.equal(rows(f).filter(r=>r.bookkeep).length,1);assert.equal(journal(f).transactions.length,1);
});
for(const target of ['log','reg','lock','journal'])for(const kind of ['symlink','hardlink'])test(`U3-A6 unsafe ${target} ${kind} refused`,()=>{
  const f=fixture();if(['lock','journal'].includes(target)){assert.equal(f.invoke().status,0);rmSync(f[target])}else rmSync(f[target]);
  const unrelated=join(f.root,'unrelated');writeFileSync(unrelated,'not owned');
  if(kind==='symlink')symlinkSync(unrelated,f[target]);else linkSync(unrelated,f[target]);
  const before=bytes(f);assert.notEqual(f.invoke().status,0);assert.deepEqual(bytes(f),before);assert.equal(readFileSync(unrelated,'utf8'),'not owned');
});
for(const malformed of ['null','{}','[]','bad'])test(`U3-A6 malformed journal ${malformed} refused`,()=>{
  const f=fixture();writeFileSync(f.journal,malformed);const before=allFiles(f);const r=f.invoke();assert.notEqual(r.status,0);
  assert.deepEqual(bytes(f).map(v=>v.bytes),[before['candidate-log.jsonl'].bytes,before['sources-registry.yaml'].bytes]);assert.equal(readFileSync(f.journal,'utf8'),malformed);
});
test('U3-A6 stale copied journal, byte-hash corruption and committed drift refuse',()=>{
  for(const change of [j=>{j.root+='-wrong'},j=>{j.transactions[0].after.log.sha256='0'.repeat(64)}]){
    const f=fixture();assert.equal(f.invoke().status,0);const j=journal(f);change(j);writeFileSync(f.journal,JSON.stringify(j));const before=allFiles(f);
    assert.notEqual(f.invoke().status,0);assert.deepEqual(allFiles(f),before);
  }
  const f=fixture();assert.equal(f.invoke().status,0);writeFileSync(f.reg,readFileSync(f.reg,'utf8')+'# manual drift\n');const before=allFiles(f);
  assert.notEqual(f.invoke().status,0);assert.deepEqual(allFiles(f),before);
});
test('U3-A6 replacement of stable lock identity refuses committed journal',()=>{
  const f=fixture();assert.equal(f.invoke().status,0);const original=journal(f).lock_identity;
  const held=join(f.root,'old-lock');renameSync(f.lock,held);writeFileSync(f.lock,'replacement');
  // Holding a distinct file avoids relying on immediate inode reuse behavior.
  const before=bytes(f),r=f.invoke();assert.notEqual(r.status,0,r.stdout);assert.match(r.stderr,/lock identity changed/);
  assert.deepEqual(bytes(f),before);assert.deepEqual(journal(f).lock_identity,original);
});
test('U3-A6 legacy run refuses without guessing, force cannot duplicate',()=>{
  const f=fixture(withDate('legacy'));writeFileSync(f.log,'{ "run": "legacy", "bookkeep": true, "type": "run_summary" }\n');const before=bytes(f);
  const r=f.invoke(['--force']);assert.notEqual(r.status,0);assert.match(r.stderr,/legacy same-run/);assert.deepEqual(bytes(f),before);
});
if(!process.env.BOOKKEEP_TEST_CLI)test('U3-A6 consumer adoption denominator mutation caught',()=>{
  const dir=join(scratch,'adoption-mutant');mkdirSync(dir);
  for(const name of ['evolution-adoption-snapshot.mjs','evolution-bookkeep-transaction.py'])copyFileSync(join(ROOT,'scripts',name),join(dir,name));
  const original=readFileSync(cli,'utf8'),mutant=join(dir,'evolution-bookkeep.mjs');
  const altered=original.replace(/  let actual;[\s\S]*?(?=  need\(candidates.concat\(opportunities\))/, '  // mutation: omit independent adoption reconciliation\n');
  assert.notEqual(altered,original);writeFileSync(mutant,altered);
  const bad=structuredClone(sweep);bad.adoption_snapshot.entries=[];bad.adoption_review.entries=[];bad.phase_coverage.AdoptionReview={expected:[],completed:[]};
  assert.throws(()=>reject(bad,undefined,mutant),/unexpected acceptance/);assert.equal(readFileSync(cli,'utf8'),original);
});
if(!process.env.BOOKKEEP_TEST_CLI)test('U3-A6 recovery third-state refusal mutation caught',()=>{
  const dir=join(scratch,'transaction-mutant');mkdirSync(dir);
  for(const name of ['evolution-adoption-snapshot.mjs','evolution-bookkeep.mjs'])copyFileSync(join(ROOT,'scripts',name),join(dir,name));
  const helper=join(ROOT,'scripts/evolution-bookkeep-transaction.py'),original=readFileSync(helper,'utf8');
  assert.ok(original.includes('require(current[key] in allowed,'));
  writeFileSync(join(dir,'evolution-bookkeep-transaction.py'),original.replace('require(current[key] in allowed,','require(True,'));
  const f=fixture();assert.equal(f.invoke([],cli,{EVOLUTION_BOOKKEEP_CRASH_AT:'log:rename',EVOLUTION_BOOKKEEP_TEST_ROOT:f.root}).status,86);
  writeFileSync(f.reg,readFileSync(f.reg,'utf8')+'# third-state drift\n');
  const result=f.invoke([],join(dir,'evolution-bookkeep.mjs'));
  assert.throws(()=>assert.notEqual(result.status,0),'original drift refusal oracle must reject mutant acceptance');
  assert.equal(readFileSync(helper,'utf8'),original);
});
if(!process.env.BOOKKEEP_TEST_CLI)test('stats conservation guard removal detected',()=>{
  const original=readFileSync(cli,'utf8'),guard='ret.stats[key]===rows.length';assert.ok(original.includes(guard));
  const mutant=join(scratch,'mutant.mjs');for(const name of ['evolution-adoption-snapshot.mjs','evolution-bookkeep-transaction.py'])copyFileSync(join(ROOT,'scripts',name),join(scratch,name));writeFileSync(mutant,original.replace(guard,'true'));
  const bad=structuredClone(sweep);bad.stats.approved=2;
  assert.throws(()=>reject(bad,undefined,mutant),/unexpected acceptance/);assert.equal(readFileSync(cli,'utf8'),original);
});
try {
 console.log(JSON.stringify({kind:'REAL_TEMP_FS_NOT_NATIVE',pid:process.pid,cases:cases.map(([id])=>id),cli_sha256:createHash('sha256').update(readFileSync(cli)).digest('hex')}));
 let pass=0;for(const [id,fn] of cases){try{await fn();pass++;console.log(`PASS ${id}`)}catch(e){console.log(`FAIL ${id}: ${e.stack}`)}}
 console.log(`evolution-bookkeep ${pass}/${cases.length}`);process.exitCode=pass===cases.length?0:1;
} finally {if(process.env.U3_KEEP_TEST_ROOT)console.log('RETAINED_TEST_ROOT='+scratch);else rmSync(scratch,{recursive:true,force:true})}
