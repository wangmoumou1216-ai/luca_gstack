#!/usr/bin/env node
// Real CLI in task-owned OS temp. No production governance data is written.
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {run,evolution,load,bundle,candidate,verdict} from './test-scout-workflows.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=process.env.BOOKKEEP_TEST_CLI || join(ROOT,'scripts/evolution-bookkeep.mjs');
const scratch=mkdtempSync(join(tmpdir(),'workflow-bookkeep-test-'));
const source=id=>`  - id: ${id}\n    note: preserve me\n    yield_stats: { runs: 3, surfaced: 4, approved: 2, zero_yield_streak: 1 }\n    status: active\n`;
const sweep=await run(), punctual=await run(evolution,{target_repos:['owner/one','owner/two']});
let serial=0;
function fixture(input=sweep,registry='sources:\n'+source('S10')+source('S1')) {
  const root=join(scratch,String(serial++)), dir=join(root,'.claude/skill-os/evolution'); mkdirSync(dir,{recursive:true});
  const log=join(dir,'candidate-log.jsonl'), reg=join(dir,'sources-registry.yaml'), json=join(root,'input.json');
  writeFileSync(log,'{"run":"prior","note":"untouched"}\n'); writeFileSync(reg,registry); writeFileSync(json,JSON.stringify(input));
  const invoke=(args=[],script=cli)=>spawnSync(process.execPath,[script,json,'--root',root,...args],{encoding:'utf8',timeout:10000});
  return {root,log,reg,json,invoke};
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
  const before=bytes(f),again=f.invoke();assert.equal(again.status,1);assert.deepEqual(bytes(f),before);
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
if(!process.env.BOOKKEEP_TEST_CLI)test('stats conservation guard removal detected',()=>{
  const original=readFileSync(cli,'utf8'),guard='ret.stats[key]===rows.length';assert.ok(original.includes(guard));
  const mutant=join(scratch,'mutant.mjs');writeFileSync(mutant,original.replace(guard,'true'));
  const bad=structuredClone(sweep);bad.stats.approved=2;
  assert.throws(()=>reject(bad,undefined,mutant),/unexpected acceptance/);assert.equal(readFileSync(cli,'utf8'),original);
});
try {
 console.log(JSON.stringify({kind:'REAL_TEMP_FS_NOT_NATIVE',pid:process.pid,cases:cases.map(([id])=>id),cli_sha256:createHash('sha256').update(readFileSync(cli)).digest('hex')}));
 let pass=0;for(const [id,fn] of cases){try{await fn();pass++;console.log(`PASS ${id}`)}catch(e){console.log(`FAIL ${id}: ${e.stack}`)}}
 console.log(`evolution-bookkeep ${pass}/${cases.length}`);process.exitCode=pass===cases.length?0:1;
} finally {rmSync(scratch,{recursive:true,force:true})}
