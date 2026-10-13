#!/usr/bin/env node
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const ROOT = resolve(process.env.FRAMEWORK_AUDIT_TEST_ROOT || process.cwd());
const scratch = mkdtempSync(join(tmpdir(),'framework-preambles-'));
try {
  mkdirSync(join(scratch,'.claude/observability/scripts'),{recursive:true});
  const trace=join(scratch,'trace');
  const aliasTrace=join(scratch,'alias-commands');
  const bin=join(scratch,'bin');mkdirSync(bin);
  for(const command of ['ls','cat']) {
    writeFileSync(join(bin,command),`#!/bin/sh\ncase "$*" in\n  *docs/*|*.claude/current-topic.txt*|*.claude/workflow-state.yaml*) printf '%s\\n' "$0 $*" >> '${aliasTrace}' ;;\nesac\nexit 93\n`,{mode:0o755});
  }
  // Readiness probes belong to the selected service invocation. This extracted
  // NO_PIN preamble fixture must never contact OD or inspect real host processes.
  for(const command of ['curl','pgrep','lsof']) {
    writeFileSync(join(bin,command),'#!/bin/sh\nexit 93\n',{mode:0o755});
  }
  writeFileSync(join(scratch,'.claude/observability/scripts/get_rules.py'),
    `from pathlib import Path\nimport sys\nwith Path(${JSON.stringify(trace)}).open('a') as f:f.write(' '.join(sys.argv[1:])+'\\n')\n`);
  mkdirSync(join(scratch,'docs/handoff'),{recursive:true});
  mkdirSync(join(scratch,'docs/prd'),{recursive:true});
  for(const path of ['.claude/current-topic.txt','docs/handoff/2099-other-design-brief-handoff.md','docs/prd/2099-other-prd.md']) {
    const made=spawnSync('mkfifo',[join(scratch,path)],{encoding:'utf8'});
    assert.equal(made.status,0,made.stderr);
  }
  for(const key of ['implement','to-spec','to-tickets','wayfinder','tech-spec','task-plan','challenge',
    'design-brief','evals','open-design','figma-demo','idea','research-kit','quick-research',
    'retro','insight-synthesis','ux-audit','ux-writing','html-prototype']) {
    const body=readFileSync(join(ROOT,'.claude/skills/office',key,'SKILL.md'),'utf8');
    const preamble=body.match(/## Preamble[^\n]*[\s\S]*?```bash\n([\s\S]*?)```/)?.[1];
    assert.ok(preamble,`Missing ${key} preamble`);
    writeFileSync(aliasTrace,'');
    const env={PATH:bin+':'+process.env.PATH,LANG:'C',NO_PIN:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'};
    const r=spawnSync('/bin/bash',['-c',preamble],{cwd:scratch,encoding:'utf8',env,timeout:5000,detached:true});
    if(r.error) { try { process.kill(-r.pid,'SIGKILL'); } catch {} }
    assert.equal(r.error,undefined,`${key}: alias/FIFO read or process failure: ${r.error}`);
    assert.equal(r.status,0,r.stderr);
    assert.equal(readFileSync(aliasTrace,'utf8'),'',`${key}: unauthorized alias discovery`);
    if(key!=='evals')assert.match(readFileSync(trace,'utf8'),new RegExp(`^${key} \\*$`,'m'));
    else assert.match(r.stdout,/EXISTING_EVALS: unknown/); // no fabricated zero from an ungranted glob
    console.log(`PASS ${key} extracted preamble avoids NO_PIN shared aliases; startup behavior retained`);
  }
  // A newer, unrelated blueprint must not replace the caller's exact resume input.
  const figmaBody=readFileSync(join(ROOT,'.claude/skills/office/figma-demo/SKILL.md'),'utf8');
  const resumeSection=figmaBody.match(/### 断点恢复\n([\s\S]*?)(?:\n---|$)/)?.[1];
  const resume=resumeSection?.match(/```bash\n([\s\S]*?)```/)?.[1];
  assert.ok(resume,'Missing figma-demo resume block');
  mkdirSync(join(scratch,'docs/prototype/unrelated'),{recursive:true});
  writeFileSync(join(scratch,'docs/prototype/unrelated/blueprint.yaml'),'topic: unrelated\n');
  const exact=join(scratch,'approved-blueprint.yaml');writeFileSync(exact,'topic: approved\n');
  for(const input of [exact,'']) {
    const result=spawnSync('/bin/bash',['-c',resume+'\nprintf "%s\\n" "$_EXISTING_BLUEPRINT"'],{
      cwd:scratch,encoding:'utf8',timeout:5000,env:{PATH:process.env.PATH,LANG:'C',
        _EXISTING_BLUEPRINT:input,NO_PIN:'1'}});
    assert.equal(result.error,undefined);
    assert.equal(result.status,0,result.stderr);
    assert.equal(result.stdout.trim(),input,'figma-demo must preserve exact resume input or absence');
  }
  console.log('PASS figma-demo resume preserves explicit source and does not select an unrelated latest blueprint');
} finally {rmSync(scratch,{recursive:true,force:true});}
