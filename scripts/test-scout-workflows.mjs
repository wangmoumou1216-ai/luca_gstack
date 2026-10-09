#!/usr/bin/env node
// Real workflow bodies; only the external agent boundary uses fixtures. No native model claims.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const ROOT = resolve(process.env.SCOUT_TEST_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
export const evolution = 'framework-evolution-scout', external = 'external-skill-scout';
export const candidate = (repo = 'owner/one') => ({name: repo.split('/').at(-1), repo, url: `https://github.com/${repo}`,
  dimension: 'testing', gap_id: 'G1', reuse_mode: 'install', source_id: 'S1', one_line_value: 'fixture', fit_score: 3,
  type: 'skill', category: 'code-engineering'});
export const load = { sources: [{id: 'S1', authority_tier: 'official', discovery: {method: 'gh-search'},
  reuse_mode: ['install'], feeds_dimensions: ['testing']}], gaps: [{id: 'G1', dimension: 'testing', severity: 'high'}],
  existing_names: [], existing_repos: [] };
export const verdict = {scores: {fit: 3, quality: 3, adoption: 3, maintenance: 3},
  hard: {safety: 'PASS', compatibility: 'PASS', non_redundancy: 'PASS', gap_addressed: 'PASS', provenance: 'PASS'},
  evidence: {stars: 10, last_commit: '2026-10-01', license: 'MIT', verified_at: '2026-10-09', source_url: 'fixture'},
  supply_chain: {pinned_sha: 'a'.repeat(40), egress: 'none'}, why_useful: 'fixture', how_to_reuse: 'fixture',
  install_command: 'proposal only', integration_note: 'fixture'};
const redteam = {redteam_verdict: 'stands', integration_risk: 'LOW', reason: 'fixture'};
export const bundle = candidates => ({candidates, channel_notes: 'fixture'});
const runnerSource = readFileSync(resolve(ROOT, '.codex/workflow-runner.mjs'), 'utf8');
const extract = name => {
  const body = runnerSource.match(new RegExp(`function ${name}[\\s\\S]*?\\n\\}\\n`))?.[0];
  assert.ok(body, name); return new Function(`${body}; return ${name}`)();
};
const strictify = extract('strictifySchema'), revive = extract('reviveFreeform');
// Populate optional nulls from the REAL schema, enforce its required/types/enums, then
// pass freeform JSON strings through the REAL adapter revive function.
function wireValue(schema, value) {
  if (value === undefined) { assert.ok(schema.type?.includes?.('null')); return null; }
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (type === 'object' && types.includes('string')) return JSON.stringify(value);
  assert.ok(types.includes(type), `fixture type ${type} != ${types}`);
  if (schema.enum) assert.ok(schema.enum.includes(value));
  if (type === 'object') return Object.fromEntries(Object.entries(schema.properties).map(([k,s]) => [k, wireValue(s,value[k])]));
  if (type === 'array') return value.map(v => wireValue(schema.items,v));
  return value;
}
export async function run(name = evolution, args = {}, changes = {}, options = {}) {
  const source = options.source ?? readFileSync(resolve(ROOT, `.claude/workflows/${name}.js`), 'utf8');
  const calls = options.calls || [];
  const output = await new AsyncFunction('args','agent','phase','parallel','log',source.replace('export const meta','const meta'))(
    args, async (prompt, opts) => {
      calls.push({label: opts.label, phase: opts.phase, prompt});
      let value;
      if (Object.hasOwn(changes,opts.label)) value = changes[opts.label];
      else if (opts.phase === 'Load') value = name === external ? {existing_names: []} : load;
      else if (opts.phase === 'AdoptionReview') value = {entries: [], review_notes: 'fixture'};
      else if (opts.phase === 'Discover') value = bundle([candidate()]);
      else if (opts.phase === 'Intake') value = bundle([candidate(opts.label.slice(7))]);
      else if (opts.phase === 'Verify') value = verdict;
      else if (opts.phase === 'Redteam') value = redteam;
      value = structuredClone(value);
      if (options.strict && value !== null) {
        const free = []; value = revive(wireValue(strictify(opts.schema,free),value),free);
      }
      return value;
    }, () => {}, tasks => Promise.all(tasks.map(f => f())), () => {});
  return output;
}
const cases = [];
const test = (id, fn) => cases.push([id,fn]);
const incomplete = output => {
  assert.equal(output.run_status,'INCOMPLETE'); assert.ok(output.failures.length);
  for (const k of ['approved','approved_overflow','conditional','opportunities','results']) assert.equal(output[k]?.length || 0,0,k);
};
for (const name of [evolution, external]) {
  test(`${name}: full strict nullable response completes`, async () => {
    const r = await run(name,{}, {},{strict:true}); assert.equal(r.run_status,'COMPLETE');
    assert.equal(r.approved.length,1); assert.equal(r.approved[0].weighted_score,100);
    if (name===evolution) assert.equal(r.approved[0].gap_id,'G1');
    assert.ok(Object.values(r.phase_coverage).every(p => JSON.stringify(p.expected)===JSON.stringify(p.completed)));
  });
  for (const [label, opts] of name===evolution ? [['load:truth-files',{}],['adoption-review',{}],['disc:S1',{}],['intake:owner/one',{target_repos:'owner/one'}],['verify:owner/one',{}],['redteam:owner/one',{}]]
    : [['load:existing',{}],['C1:gh-search',{}],['verify:owner/one',{}]]) {
    test(`${name}: missing ${label}`, async () => incomplete(await run(name,opts,{[label]:null})));
  }
  test(`${name}: successful empty discovery`, async () => {
    const changes = Object.fromEntries((name===evolution ? ['disc:S1'] : ['C1:gh-search','C2:skills.sh','C3:awesome-lists','C4:npx-skills','C5:known-hubs']).map(k => [k,bundle([])]));
    const r = await run(name,{},changes); assert.equal(r.run_status,'COMPLETE'); assert.equal(r.stats.verified,0);
  });
  for (const value of [99,-1,'3',null]) test(`${name}: invalid score ${JSON.stringify(value)}`, async () => {
    incomplete(await run(name,{}, {'verify:owner/one': {...verdict,scores:{...verdict.scores,fit:value}}}));
  });
  for (const value of [0,3]) test(`${name}: score endpoint ${value}`, async () => {
    const r = await run(name,{}, {'verify:owner/one': {...verdict,scores:{fit:value,quality:value,maintenance:value,adoption:value}}});
    assert.equal(r.run_status,'COMPLETE'); assert.equal(r.stats[value===0?'rejected':'approved'],1);
  });
  test(`${name}: hard FAIL rejects without lost result`, async () => {
    const r=await run(name,{}, {'verify:owner/one':{...verdict,hard:{...verdict.hard,safety:'FAIL'}}});
    assert.equal(r.run_status,'COMPLETE'); assert.equal(r.stats.rejected,1);
  });
  test(`${name}: candidate score out of range`, async () => incomplete(await run(name,{}, {[name===evolution?'disc:S1':'C1:gh-search']:bundle([{...candidate(),fit_score:99}])})));
  test(`${name}: no fixed product or model in prompts`, async () => {
    const calls=[]; await run(name,{}, {},{calls}); assert.doesNotMatch(calls.map(c=>c.prompt).join('\n'), /CRM|FxUI|Sonnet default/);
  });
  test(`${name}: dedup and verification cap conserve selected set`, async () => {
    const cs=Array.from({length:36},(_,i)=>candidate(`owner/r${i}`));
    const r=await run(name,{}, {[name===evolution?'disc:S1':'C1:gh-search']:bundle([...cs,cs[0]])});
    assert.equal(r.run_status,'COMPLETE'); assert.equal(r.stats.verified,32); assert.equal(r.phase_coverage.Verify.expected.length,32);
  });
}
for (const t of ['owner/one',['owner/one'],['Owner/One','owner/one']]) test(`punctual legal ${JSON.stringify(t)}`,async()=>{
  const r=await run(evolution,{target_repos:t},{},{strict:true}); assert.equal(r.run_status,'COMPLETE'); assert.equal(r.results.length,1);
});
for (const t of ['',[],null,{},[''],['owner/one',3]]) test(`reject target ${JSON.stringify(t)} before agent`,async()=>{
  const calls=[]; await assert.rejects(run(evolution,{target_repos:t},{},{calls})); assert.equal(calls.length,0);
});
for (const [name,arg] of [[evolution,'bad'],[evolution,null],[evolution,[]],[external,''],[external,{focus:[]}],[external,{focus:null}],[external,'{bad']]) test(`reject args ${name} ${JSON.stringify(arg)}`,async()=>{
  const calls=[]; await assert.rejects(run(name,arg,{},{calls})); assert.equal(calls.length,0);
});
test('external bare focus and truly omitted args remain supported',async()=>{
  assert.equal((await run(external,'testing')).focus[0],'testing'); assert.equal((await run(evolution,undefined)).run_status,'COMPLETE');
});
for (const cs of [[],[candidate('other/repo')],[candidate(),candidate('owner/two')]]) test(`intake exactly original target ${cs.map(c=>c.repo)}`,async()=>{
  incomplete(await run(evolution,{target_repos:'owner/one'},{'intake:owner/one':bundle(cs)}));
});
test('two targets cannot lose one intake',async()=>incomplete(await run(evolution,{target_repos:['owner/one','owner/two']},{'intake:owner/two':null})));
for (const gap of [null,'UNKNOWN']) test(`verify gap ${gap}`,async()=>{
  const r=await run(evolution,{target_repos:'owner/one'},{'verify:owner/one':{...verdict,gap_id:gap}});
  if(gap===null) { assert.equal(r.run_status,'COMPLETE'); assert.equal(r.results[0].gap_id,'G1'); } else incomplete(r);
});
test('source and repo identity cannot change',async()=>{
  incomplete(await run(evolution,{}, {'disc:S1':bundle([{...candidate(),source_id:'S10'}])}));
  incomplete(await run(evolution,{}, {'verify:owner/one':{...verdict,repo:'other/repo'}}));
});
for (const mode of [{},{target_repos:'owner/one'}]) {
  test(`verify removes gap ${JSON.stringify(mode)} strict`,async()=>{
    const r=await run(evolution,mode,{'verify:owner/one':{...verdict,gap_id:'none'}},{strict:true});
    assert.equal(r.run_status,'COMPLETE'); assert.equal(r.stats.approved,0); assert.equal(r.stats.rejected,1);
  });
  for (const value of ['stands','downgraded','killed','UNKNOWN']) test(`redteam ${JSON.stringify(mode)} ${value}`,async()=>{
    const r=await run(evolution,mode,{'redteam:owner/one':{...redteam,redteam_verdict:value}});
    if(value==='UNKNOWN') incomplete(r); else { assert.equal(r.run_status,'COMPLETE'); assert.equal(r.stats[value==='stands'?'approved':value==='downgraded'?'conditional':'rejected'],1); }
  });
  test(`no open gap ${JSON.stringify(mode)}`,async()=>{
    const r=await run(evolution,mode,{'load:truth-files':{...load,gaps:[]},[mode.target_repos?'intake:owner/one':'disc:S1']:bundle([{...candidate(),gap_id:'none'}])});
    assert.equal(r.run_status,'COMPLETE'); assert.equal(r.stats.approved,0); assert.equal(r.stats[mode.target_repos?'rejected':'opportunities'],1);
  });
}
if (!process.env.SCOUT_TEST_ROOT) for (const name of [evolution,external]) test(`${name}: score guard removal detected`,async()=>{
  const original=readFileSync(resolve(ROOT,`.claude/workflows/${name}.js`),'utf8');
  assert.ok(original.includes('v <= 3')); const mutant=original.replace('v <= 3','true');
  const r=await run(name,{}, {'verify:owner/one':{...verdict,scores:{fit:99,quality:99,adoption:99,maintenance:99}}},{source:mutant});
  assert.throws(()=>incomplete(r),'the original invalid-score oracle must reject the mutant');
  assert.equal(readFileSync(resolve(ROOT,`.claude/workflows/${name}.js`),'utf8'),original);
});
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify({kind:'FIXTURE_NOT_NATIVE',pid:process.pid,root:ROOT,cases:cases.map(([id])=>id),sources:Object.fromEntries([evolution,external].map(n=>[n,createHash('sha256').update(readFileSync(resolve(ROOT,`.claude/workflows/${n}.js`))).digest('hex')]))}));
  let pass=0;
  for(const [id,fn] of cases) { try { await fn(); pass++; console.log(`PASS ${id}`); } catch(e) { console.log(`FAIL ${id}: ${e.stack}`); } }
  console.log(`scout-workflows ${pass}/${cases.length}`); process.exitCode=pass===cases.length?0:1;
}
