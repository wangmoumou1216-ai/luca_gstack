#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const option = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const root = resolve(option('--root') || join(here, '..'));
const evidence = resolve(option('--evidence') || process.env.DOMAIN_MODELING_EVIDENCE || join(tmpdir(),'domain-modeling-evidence'));
const canonical = '.claude/skills/office/domain-modeling';
const callers = ['.claude/agents/plan-agent.md', '.claude/agents/orchestrator.md', ...['brainstorm','code-recon','tech-spec'].map(x => `.claude/skills/office/${x}/SKILL.md`)];
export const CONTRACT_PATHS = [
  `${canonical}/SKILL.md`, `${canonical}/CONTEXT-FORMAT.md`, `${canonical}/ADR-FORMAT.md`, `${canonical}/LICENSE`, `${canonical}/agents/openai.yaml`,
  '.claude/commands/domain-modeling.md', '.claude/skill-os/skill-routing-map.yaml', '.claude/skill-os/input-modes.yaml',
  '.claude/skills/office/SKILL.md', '.claude/skills/office/references/handoff-protocol.md',
  '.claude/skill-os/runtime/project-session.md', '.claude/skill-os/extraction-bar.md',
  '.claude/skill-os/model-routing.yaml', '.claude/skill-os/codex-viability.yaml', '.claude/skill-os/generated/skill-catalog.md',
  '.claude/skill-os/skill-invariants.md', ...callers, 'memory/evals/domain-modeling/fixtures.json',
  'scripts/test-domain-modeling-behavior.mjs', 'scripts/test-domain-modeling-skill.mjs', 'package.json',
  'scripts/check-skill-scene-coverage.py',
  'framework-audit/2026-09-16-domain-modeling-source-freeze.json'
];
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function sourceManifest(base) {
  return Object.fromEntries(CONTRACT_PATHS.map(p => [p, digest(readFileSync(join(base,p)))]));
}
const read = p => readFileSync(join(root,p),'utf8');
function yaml(p) {
  const r = spawnSync('python3',['-c','import json,sys,yaml; print(json.dumps(yaml.safe_load(sys.stdin.read())))'], {input:read(p),encoding:'utf8'});
  assert.equal(r.status,0,`${p}: YAML decode failed: ${r.stderr}`); return JSON.parse(r.stdout);
}
function contracts() {
  const body = read(`${canonical}/SKILL.md`);
  for (const text of ['name: domain-modeling','guided-execution','NEEDS_CONTEXT','resolved_terms','relationships','code_evidence','open_questions','writes','blocking_for_caller','resume_target','apply_patch','NO_PIN','extraction-bar.md','321658273cb1d20b76026717d027d505790106d4','FILE_END: domain-modeling/SKILL.md']) assert.ok(body.includes(text),`canonical missing ${text}`);
  assert.match(body,/one decision at\s+a time and wait for a real response/);
  assert.match(body,/no workflow\s+node\/state/);
  const frontmatter=spawnSync('python3',['-c',
    'import json,sys,yaml; text=sys.stdin.read(); print(json.dumps(yaml.safe_load(text.split("---",2)[1])))'],{input:body,encoding:'utf8'});
  assert.equal(frontmatter.status,0,'canonical frontmatter must parse');
  const metadata=JSON.parse(frontmatter.stdout);
  assert.equal(metadata['context-cost'],'lightweight','missing lightweight terminal-delivery classification');
  assert.ok(Object.keys(metadata).every(key=>['name','description','license','allowed-tools','metadata','context-cost'].includes(key)),'unexpected skill frontmatter property');
  assert.match(body,/resolved terminal result may be DONE without a disk artifact/,'missing authorized terminal completion exemption');
  assert.match(body,/Never create a handoff merely to obtain DONE or without\s+write authority/,'handoff cannot expand effect authority');
  assert.match(read(`${canonical}/LICENSE`),/MIT License/);
  assert.match(read(`${canonical}/agents/openai.yaml`),/allow_implicit_invocation: true/);
  for (const alias of ['.claude/skills/domain-modeling','.agents/skills/domain-modeling']) {
    assert.equal(lstatSync(join(root,alias)).isSymbolicLink(),true,`${alias}: not symbolic link`);
    assert.equal(realpathSync(join(root,alias)),realpathSync(join(root,canonical)),`${alias}: alias escaped canonical`);
  }
  assert.match(read('.claude/commands/domain-modeling.md'),/office\/domain-modeling\/SKILL\.md/);
  const modes = yaml('.claude/skill-os/input-modes.yaml').skills['domain-modeling'];
  assert.ok(modes?.modes?.standalone, 'missing standalone mode');
  for(const key of ['caller','domain_question','trigger_condition','scope','inherited_authority','authority_effect_intersection']) assert.ok(modes.modes.internal.required.includes(key),`internal mode missing ${key}`);
  assert.ok(modes.modes.internal.optional.includes('parent_u_id'),'parent U-ID must be optional');
  const ordinaryCaller={caller:'code-recon',domain_question:'ownership contradiction',trigger_condition:'code evidence differs',scope:'verified fixture',inherited_authority:'read-only',authority_effect_intersection:'read-only'};
  assert.deepEqual(modes.modes.internal.required.filter(key=>!(key in ordinaryCaller)),[],'a valid non-Plan caller must not need a fabricated U-ID');
  const routing = read('.claude/skill-os/model-routing.yaml');
  assert.match(routing,/guided-execution:[\s\S]*?skills:\s*\[[^\]]*domain-modeling/);
  assert.match(routing,/core-execution: high/); assert.match(routing,/guided-execution: medium/);
  assert.match(read('.claude/skill-os/codex-viability.yaml'),/domain-modeling: \{tier: 1\}/);
  assert.match(read('.claude/skill-os/skill-routing-map.yaml'),/invoke: "\/domain-modeling"/);
  assert.match(read('.claude/skill-os/generated/skill-catalog.md'),/`domain-modeling`.*office\/domain-modeling\/SKILL\.md/);
  const p2 = read('.claude/skill-os/skill-invariants.md');
  assert.match(p2.split('#### P2-V')[0],/docs\/domain\/glossary\.md/,'missing P2 glossary registration');
  assert.match(p2,/持续词汇单文件豁免[^\n]*docs\/domain\/glossary\.md[^\n]*就地[^\n]*不创建日期\/序号副本/,'missing P2-V exact glossary exception');
  // The old dated-output rule remains normative; the glossary is an additive exception.
  assert.match(p2,/递增三位序号/); assert.match(p2,/目录型产出豁免/);
  for(const path of callers) assert.ok(read(path).includes(`${canonical}/SKILL.md`),`${path}: missing true caller pointer`);
  const fixtures = JSON.parse(read('memory/evals/domain-modeling/fixtures.json'));
  assert.equal(fixtures.baseline_ref,'45eff207');
  for(let n=1;n<=11;n++) assert.ok(fixtures.fixtures.some(f=>f.id===`F${String(n).padStart(2,'0')}`||f.id.startsWith(`F${String(n).padStart(2,'0')}-`)),`missing F${n}`);
  for(const [target,tier,effort] of [['domain-modeling','guided-execution','medium'],['brainstorm','core-execution','high'],['code-recon','guided-execution','medium'],['tech-spec','core-execution','high']]) {
    assert.equal(fixtures.targets[target].tier,tier,`${target}: wrong tier`); assert.equal(fixtures.targets[target].effort,effort,`${target}: wrong effort`);
  }
  const freeze = JSON.parse(read('framework-audit/2026-09-16-domain-modeling-source-freeze.json'));
  assert.equal(freeze.baseline,'45eff207a585757907f323c6952f969ac76a14b2');
  assert.equal(freeze.scope,'framework_meta / NO_PIN'); assert.equal(freeze.approval_delta.claude_live_and_ab,'DEFERRED_BY_USER');
  assert.match(read('scripts/check-skill-scene-coverage.py'),/['"]domain-modeling['"]\s*:\s*\(None,\s*\[\],\s*['"]unobservable['"]\)/,'missing C19 scene-agnostic authoring exemption');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts['test:domain-modeling'],'node scripts/test-domain-modeling-skill.mjs --all');
  assert.equal(pkg.scripts['test:domain-modeling-behavior'],'node scripts/test-domain-modeling-behavior.mjs --self-test');
  const test = spawnSync(process.execPath,[join(root,'scripts/test-domain-modeling-behavior.mjs'),'--self-test'],{encoding:'utf8',timeout:30000});
  assert.equal(test.status,0,`scorer selftest: ${test.stdout}\n${test.stderr}`);
  console.log('PASS domain-modeling source, native aliases, callers, P2 and eval contracts');
}
function standardValidation() {
  // Official quick_validate supports five standard fields, while Luca's shared
  // completion contract additionally consumes context-cost. Never patch that helper
  // or pretend its projection is a direct validation of the extended canonical file.
  const validator=option('--quick-validator');
  assert.ok(validator&&existsSync(validator),'--validate-standard requires an exact existing --quick-validator');
  const scratch=mkdtempSync(join(tmpdir(),'domain-modeling-standard-frontmatter-'));
  const original=read(`${canonical}/SKILL.md`);
  assert.match(original,/^context-cost: lightweight$/m);
  writeFileSync(join(scratch,'SKILL.md'),original.replace(/^context-cost: lightweight\r?\n/m,''));
  const result=spawnSync('python3',[resolve(validator),scratch],{encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,`standard-key projection validation: ${result.stdout} ${result.stderr}`);
  console.log(`PASS standard-key projection ${scratch}; Luca context-cost checked separately, not direct canonical quick_validate PASS`);
}
function mutation() {
  const scratch = mkdtempSync(join(tmpdir(),'domain-modeling-mutation-'));
  for(const p of CONTRACT_PATHS){mkdirSync(dirname(join(scratch,p)),{recursive:true});cpSync(join(root,p),join(scratch,p));}
  for(const alias of ['.claude/skills/domain-modeling','.agents/skills/domain-modeling']){mkdirSync(dirname(join(scratch,alias)),{recursive:true});symlinkSync(join(scratch,canonical),join(scratch,alias));}
  const run = () => spawnSync(process.execPath,[join(scratch,'scripts/test-domain-modeling-skill.mjs'),'--all','--root',scratch],{encoding:'utf8',timeout:60000});
  const receipts=[];
  const record=(id,result,expected)=>{receipts.push({id,exit_code:result.status,stdout:result.stdout,stderr:result.stderr});assert.equal(result.status===0,expected,`${id}: mutation failed to bite: ${result.stdout} ${result.stderr}`);if(!expected){assert.equal(result.status,1,`${id}: wrong failure exit`);assert.match(result.stderr,/FAIL domain-modeling:/,`${id}: unrelated transport/crash failure`);}};
  record('clean-before',run(),true);
  const cases=[
    ['alias','.agents/skills/domain-modeling',null],
    ['internal-mode','.claude/skill-os/input-modes.yaml',s=>s.replace('"authority_effect_intersection"','"incorrect_authority"')],
    ['optional-u-id','.claude/skill-os/input-modes.yaml',s=>s.replace('"scope", "inherited_authority"','"scope", "parent_u_id", "inherited_authority"')],
    ['terminal-handoff',`${canonical}/SKILL.md`,s=>s.replace('context-cost: lightweight\n','')],
    ['P2','.claude/skill-os/skill-invariants.md',s=>s.replaceAll('docs/domain/glossary.md','docs/domain/not-glossary.md')],
    ['tier','memory/evals/domain-modeling/fixtures.json',s=>s.replace('"effort":"high"','"effort":"medium"')],
    ['C19','scripts/check-skill-scene-coverage.py',s=>s.replace(/[^\n]*['"]domain-modeling['"][^\n]*\n/,'')],
    ['scorer','scripts/test-domain-modeling-behavior.mjs',s=>s.replace('checks.every(c => c.pass)','true /* deliberate scorer mutation */')]
  ];
  for(const [id,p,change] of cases){
    if(change){const original=readFileSync(join(scratch,p),'utf8');const changed=change(original);assert.notEqual(changed,original,`${id}: did not mutate`);writeFileSync(join(scratch,p),changed);record(id,run(),false);writeFileSync(join(scratch,p),original);}
    else {rmSync(join(scratch,p));symlinkSync(join(scratch,'.claude/skills/office/brainstorm'),join(scratch,p));record(id,run(),false);rmSync(join(scratch,p));symlinkSync(join(scratch,canonical),join(scratch,p));}
    record(`${id}-restored`,run(),true);
  }
  mkdirSync(evidence,{recursive:true});writeFileSync(join(evidence,'mutation-summary.json'),JSON.stringify({verdict:'PASS',source_manifest:sourceManifest(root),scratch,receipts},null,2));
  console.log(`PASS mutation alias/mode/P2/tier/scorer; receipts ${join(evidence,'mutation-summary.json')}`);
}
function rollout() {
  for(const name of ['live-summary.json','ab-summary.json','mutation-summary.json']){
    const ticket=JSON.parse(readFileSync(join(evidence,name),'utf8'));
    assert.equal(ticket.verdict,'PASS',`${name}: missing/failed actual ticket`);
    assert.deepEqual(ticket.source_manifest,sourceManifest(root),`${name}: stale verified bytes`);
    const fixtures=JSON.parse(read('memory/evals/domain-modeling/fixtures.json'));
    if(name==='live-summary.json'){
      assert.equal(ticket.harness,'codex');assert.equal(ticket.full_coverage,true);
      for(const fixture of fixtures.fixtures.filter(f=>f.id.startsWith('F')))assert.ok(ticket.cells?.some(c=>c.fixture_id===fixture.id),`missing live cell ${fixture.id}`);
    }
    if(name==='ab-summary.json'){
      assert.equal(ticket.harness,'codex');assert.equal(ticket.full_coverage,true);
      for(const [target,entry] of Object.entries(fixtures.targets))for(const id of [entry.positive,entry.control])assert.ok(ticket.cells?.some(c=>c.fixture_id===id&&c.target===target&&c.baseline&&c.candidate),`missing A/B arms ${target}/${id}`);
    }
    for(const cell of ticket.cells||[]){
      assert.equal(cell.verdict,'PASS',`${name}/${cell.fixture_id}: not PASS`);
      for(const raw of cell.raw_evidence||[]) assert.equal(digest(readFileSync(raw.path)),raw.sha256,`${raw.path}: raw evidence drift`);
    }
  }
  console.log('PASS rollout aliases and exact-byte actual Codex/mutation receipts (Claude deferred)');
}
if(process.argv[1]&&realpathSync(process.argv[1])===realpathSync(fileURLToPath(import.meta.url))){
  try{contracts();if(process.argv.includes('--validate-standard'))standardValidation();if(process.argv.includes('--mutation'))mutation();if(process.argv.includes('--rollout'))rollout();}
  catch(error){console.error(`FAIL domain-modeling: ${error.message}`);process.exitCode=1;}
}
