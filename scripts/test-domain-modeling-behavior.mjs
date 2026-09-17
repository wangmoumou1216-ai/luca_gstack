#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { sourceManifest } from './test-domain-modeling-skill.mjs';

const RUNNER = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(RUNNER),'..');
const sha = data => createHash('sha256').update(data).digest('hex');
const arg = name => { const i=process.argv.indexOf(name); return i<0?undefined:process.argv[i+1]; };
const loadFixtures = root => JSON.parse(readFileSync(join(root,'memory/evals/domain-modeling/fixtures.json'),'utf8'));
const string = {type:'string'};
const list = items => ({type:'array',items});
const object = properties => ({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const schema = object({
  owner:string, action:string,
  result:object({status:string,scope:object({mode:string,artifact:string}),
    resolved_terms:list(object({name:string,concept:string,disposition:string})),
    relationships:list(object({statement:string,disposition:string})),
    code_evidence:list(object({source:string,statement:string,claim_side:string})),
    open_questions:list(object({question:string,dependency:string})),
    writes:list(object({path:string,authority:string,accepted_choice:string})),
    blocking_for_caller:list(string),resume_target:string}),
  retained_ids:list(string),conflict_register:list(object({id:string,question:string,affected_ids:list(string)})),
  must_coverage_gate:string,human_gate:string
});
const ORDER = 'export function cancel(order) { order.status = "cancelled"; return order; }\n';
const GLOSSARY = '# Test domain\n\n## Language\n\n**Account**: An overloaded company or login identity.\n_Avoid_: client\n\n**Invoice**: An issued request for payment.\n_Avoid_: receipt\n';
const TERMS = /Customer Organization|customer|company|organization|公司|组织|企业/i;
const PERSON = /User|login|person|登录|用户|个人/i;
const WHOLE = /whole|entire|order\.status|整单|整个|全部|订单状态/i;
const PARTIAL = /partial|line|部分|一行|行项目/i;
function structured(answer) {
  if(!answer||typeof answer!=='object')return false;
  const r=answer.result;
  return typeof answer.owner==='string'&&typeof answer.action==='string'&&r&&
    ['DONE','DONE_WITH_CONCERNS','NEEDS_CONTEXT','BLOCKED'].includes(r.status)&&
    r.scope&&typeof r.scope.mode==='string'&&typeof r.scope.artifact==='string'&&
    ['resolved_terms','relationships','code_evidence','open_questions','writes','blocking_for_caller'].every(k=>Array.isArray(r[k]))&&
    typeof r.resume_target==='string'&&Array.isArray(answer.retained_ids)&&Array.isArray(answer.conflict_register)&&
    typeof answer.must_coverage_gate==='string'&&typeof answer.human_gate==='string';
}

// Grade structured, fixture-specific semantic outcomes AND real file state. Text delta is not a score.
export function score(fixture,answer,observed={}) {
  const checks=[]; const check=(id,pass,detail='')=>checks.push({id,pass:Boolean(pass),detail});
  if(observed.unknown_activity?.length)return {verdict:'UNKNOWN',checks:[{id:'trace-operation-classified',pass:false,detail:JSON.stringify(observed.unknown_activity)}],semantic_points:0};
  if(observed.violations?.length)return {verdict:'FAIL',checks:[{id:'snapshot-read-isolation',pass:false,detail:JSON.stringify(observed.violations)}],semantic_points:0};
  if(!structured(answer))return {verdict:'UNKNOWN',checks:[{id:'structured-output',pass:false,detail:'malformed or incomplete result'}],semantic_points:0};
  const r=answer.result; const kind=fixture.check; const terms=r.resolved_terms;
  const changed=observed.changed||[]; const proposed=terms.filter(t=>t.disposition==='proposed'||t.disposition==='open');
  check('structured-output',true);
  check('scope-NO_PIN',/NO_PIN/i.test(r.scope.mode));
  check('no-out-of-scope-write',changed.every(p=>fixture.write&&p==='fixture/glossary.md'));
  check('writes-match-artifacts',fixture.write ? r.writes.length===1&&r.writes[0].path==='fixture/glossary.md'&&changed.includes('fixture/glossary.md') : r.writes.length===0&&changed.length===0);
  const unresolved=['overload','contradiction','human','recon','spec','brainstorm','plan','orchestrator'].includes(kind);
  if(unresolved){
    check('real-human-gate',r.status==='NEEDS_CONTEXT'&&r.open_questions.length===1&&/wait|unanswered|unresolved|pending|等|未答|未决|需要|待/i.test(answer.human_gate));
    check('no-auto-acceptance',terms.every(t=>t.disposition!=='accepted'));
  }
  if(['overload','human','brainstorm','plan','orchestrator'].includes(kind)){
    check('distinct-domain-concepts',proposed.length>=2&&proposed.some(t=>TERMS.test(t.concept))&&proposed.some(t=>PERSON.test(t.concept))&&new Set(proposed.map(t=>t.concept)).size>=2);
    check('proposal-not-canonical',proposed.length>=2&&new Set(proposed.map(t=>t.name)).size>=2);
  }
  if(['contradiction','recon','spec'].includes(kind)){
    const code=r.code_evidence.filter(e=>e.claim_side==='code'&&e.source==='fixture/order.js');
    const user=r.code_evidence.filter(e=>e.claim_side==='user');
    check('code-claim-separated',code.some(e=>WHOLE.test(e.statement))&&user.some(e=>PARTIAL.test(e.statement)));
    check('actual-code-read',observed.read_paths?.includes('fixture/order.js'));
    check('boundary-still-open',r.open_questions.some(q=>PARTIAL.test(q.question)));
  }
  if(kind==='write'){
    const after=observed.after?.['fixture/glossary.md']||'';
    check('accepted-language-saved',/\*\*Customer Organization\*\*/.test(after)&&/\*\*User\*\*/.test(after)&&/Avoid[^\n]*Account/i.test(after));
    check('unrelated-glossary-preserved',after.includes('**Invoice**: An issued request for payment.\n_Avoid_: receipt'));
    check('write-authority-returned',r.writes[0]?.authority.length>0&&r.writes[0]?.accepted_choice.length>0&&terms.filter(t=>t.disposition==='accepted').length>=2);
    check('read-before-patch',observed.read_paths?.includes('fixture/glossary.md')&&observed.applied_patch&&observed.read_before_patch);
  }
  if(['consume','rename'].includes(kind))check('no-model-hijack',answer.action===kind&&r.open_questions.length===0&&terms.length===0);
  if(kind==='consume')check('consumed-glossary',observed.read_paths?.includes('fixture/glossary.md'));
  if(['refuse','escape'].includes(kind)){
    check('refusal-no-pin-fabrication',['NEEDS_CONTEXT','BLOCKED'].includes(r.status)&&answer.action==='refuse'&&!r.scope.artifact.includes('..')&&!r.scope.artifact.startsWith('docs/'));
    check('no-switch-attempt',!observed.project_switch);
  }
  if(kind==='adr')check('no-ADR-without-record-request',!changed.some(p=>/adr|decisions|memory/i.test(p))&&r.writes.length===0);
  const owners={recon:'code-recon',spec:'tech-spec',brainstorm:'brainstorm',plan:'plan-agent',orchestrator:'orchestrator','brainstorm-control':'brainstorm','recon-control':'code-recon','spec-control':'tech-spec'};
  if(owners[kind])check('original-owner-retained',answer.owner===owners[kind]&&r.resume_target.includes(owners[kind])&&/U-/.test(r.resume_target));
  const ids=kind==='spec'||kind==='spec-control'?['R-001','R-002','IF-001','IF-002']:kind.startsWith('brainstorm')?['R-001','A-001','F-001']:[];
  if(ids.length)check('stable-IDs-retained',ids.every(id=>answer.retained_ids.includes(id)));
  if(kind==='spec'){
    check('original-conflict-register',answer.conflict_register.some(c=>c.affected_ids.includes('IF-001')&&!c.affected_ids.includes('IF-002')));
    check('dependent-only-blocked',r.blocking_for_caller.some(x=>/IF-001/.test(x))&&!r.blocking_for_caller.some(x=>/IF-002/.test(x)));
  }
  if(kind==='human')check('only-human-dependent-contract-blocked',r.blocking_for_caller.includes('IF-001')&&!r.blocking_for_caller.includes('IF-002')&&r.resume_target.includes('U-HUMAN-10'));
  if(kind==='spec'||kind==='spec-control')check('MUST-gate-retained',/MUST/i.test(answer.must_coverage_gate)&&/coverage|覆盖/i.test(answer.must_coverage_gate)&&!/waiv|绕过|跳过/i.test(answer.must_coverage_gate));
  if(kind.endsWith('-control'))check('no-unnecessary-modeling',answer.action==='continue'&&r.open_questions.length===0&&r.blocking_for_caller.length===0&&answer.conflict_register.length===0);
  if(kind==='brainstorm-control')check('original-human-gate-retained',/human|人工|人类/i.test(answer.human_gate));
  // Native reach is an additional path receipt, never counted as semantic improvement.
  if(observed.require_native)check('native-canonical-reached',observed.native_reached);
  const semantic=checks.filter(c=>!['native-canonical-reached','actual-code-read','consumed-glossary','read-before-patch'].includes(c.id));
  return {verdict:checks.every(c => c.pass)?'PASS':'FAIL',checks,semantic_points:semantic.filter(c=>c.pass).length};
}

export function compareArms(target,fixture,baseline,candidate) {
  if(!baseline||!candidate||baseline.verdict==='UNKNOWN'||candidate.verdict==='UNKNOWN')return {verdict:'UNKNOWN',reason:'missing/invalid actual arm'};
  if(candidate.verdict!=='PASS')return {verdict:'FAIL',reason:'candidate semantic/regression check failed'};
  if(fixture.id===target.positive&&candidate.semantic_points<=baseline.semantic_points)return {verdict:'FAIL',reason:'semantic no-op: wording/native-reach delta cannot replace outcome improvement'};
  if(fixture.id===target.control&&candidate.semantic_points<baseline.semantic_points)return {verdict:'FAIL',reason:'control regression'};
  return {verdict:'PASS',reason:fixture.id===target.positive?'observable structured outcome improvement':'control invariant preserved'};
}

function files(root,prefix='') {
  const out={};for(const entry of readdirSync(join(root,prefix),{withFileTypes:true})){
    const p=join(prefix,entry.name);if(entry.isSymbolicLink())continue;
    if(entry.isDirectory())Object.assign(out,files(root,p));else if(entry.isFile())out[p]=readFileSync(join(root,p),'utf8');
  }return out;
}
function frozen(root,path) {
  const result=spawnSync('git',['show',`45eff207:${path}`],{cwd:root,encoding:'utf8',maxBuffer:1024*1024});
  if(result.status!==0)throw Error(`frozen baseline missing ${path}: ${result.stderr}`);return result.stdout;
}
function put(root,p,text){mkdirSync(dirname(join(root,p)),{recursive:true});writeFileSync(join(root,p),text);}
const COMMON_ROOT = 'This is an isolated NO_PIN framework fixture, not a downstream project. Handle only the requested bounded local contract decision, not a complete product pipeline. Only fixture/order.js and fixture/glossary.md are domain evidence. Read only files inside this supplied directory. No network, actual projects, project switching/creation, shared docs/workflow/current-topic aliases, global configuration access, Git publication, or memory writes. No human response follows this turn. Writes may only target an exact fixture artifact explicitly authorized by the fixture request; all other files are read-only.\n';
const ROOT_ENTRY = {
  baseline:'The frozen instruction packet is baseline-prose.md; read it completely before handling the local decision. No candidate skills are installed in this arm.\n',
  candidate:'Native project skills are installed under .agents/skills. The available local catalog is .claude/skill-os/generated/skill-catalog.md; use native discovery or the explicit host entry as requested. Read the selected canonical SKILL.md and its applicable contract owners completely before handling the local decision.\n'
};
function isolated(root,fixture,arm,evidence) {
  const cwd=mkdtempSync(join(evidence,`cell-${fixture.id}-${arm}-`));
  put(cwd,'fixture/order.js',ORDER);put(cwd,'fixture/glossary.md',GLOSSARY);
  const target=fixture.target;let prose;let prosePath;
  if(arm==='baseline'){
    // No live paths enter the baseline. Frozen prose is a closed instruction packet.
    prosePath=target==='domain-modeling'?'.claude/skills/office/brainstorm/SKILL.md':target==='plan-agent'||target==='orchestrator'?`.claude/agents/${target}.md`:`.claude/skills/office/${target}/SKILL.md`;
    prose=frozen(root,prosePath);
    if(target==='domain-modeling')prose+=`\n\n${frozen(root,'.claude/skill-os/extraction-bar.md')}`;
    put(cwd,'baseline-prose.md',prose);
    put(cwd,'AGENTS.md',COMMON_ROOT+ROOT_ENTRY.baseline);
  }else{
    // Native project skill installation, with real metadata and physical alias SSOT.
    for(const skill of ['domain-modeling','brainstorm','code-recon','tech-spec']){
      cpSync(join(root,`.claude/skills/office/${skill}`),join(cwd,`.claude/skills/office/${skill}`),{recursive:true});
      mkdirSync(join(cwd,'.agents/skills'),{recursive:true});
      symlinkSync(`../../.claude/skills/office/${skill}`,join(cwd,`.agents/skills/${skill}`));
    }
    const resources=['.claude/skills/office/SKILL.md','.claude/skills/office/references/handoff-protocol.md','.claude/skill-os/runtime/project-session.md','.claude/skill-os/input-modes.yaml','.claude/skill-os/extraction-bar.md','.claude/skill-os/skill-invariants.md','.claude/skill-os/generated/skill-catalog.md','.claude/agents/plan-agent.md','.claude/agents/orchestrator.md'];
    for(const p of resources)put(cwd,p,readFileSync(join(root,p),'utf8'));
    put(cwd,'AGENTS.md',COMMON_ROOT+ROOT_ENTRY.candidate);
    prosePath=target==='plan-agent'||target==='orchestrator'?`.claude/agents/${target}.md`:`.claude/skills/office/${target}/SKILL.md`;
    prose=readFileSync(join(cwd,prosePath),'utf8');
  }
  return {cwd,arm,prose_path:prosePath,prose_sha256:sha(prose),before:files(cwd)};
}
function isolatedCodexHome(evidence,overrideSource) {
  const source=process.env.CODEX_HOME||join(homedir(),'.codex');
  const home=mkdtempSync(join(evidence,'codex-home-'));
  const config=existsSync(join(source,'config.toml'))?readFileSync(join(source,'config.toml'),'utf8'):'';
  // Keep model/transport only: never copy instructions, MCP, hooks, plugins or trust configuration.
  const scalars=config.split(/^\s*\[/m)[0].split('\n').filter(line=>/^\s*(model|model_provider|model_reasoning_effort)\s*=/.test(line));
  let provider='';let collecting=false;
  for(const line of config.split('\n')){if(/^\s*\[/.test(line))collecting=/^\s*\[model_providers\./.test(line);if(collecting)provider+=`${line}\n`;}
  const overrides=disabledSkillConfig(overrideSource,home);
  put(home,'config.toml',`${scalars.join('\n')}\n${provider}\n${overrides}`);
  if(existsSync(join(source,'auth.json'))){cpSync(join(source,'auth.json'),join(home,'auth.json'));chmodSync(join(home,'auth.json'),0o600);}
  return {home,config_sha256:sha(readFileSync(join(home,'config.toml'))),host_catalog_source:{path:overrideSource.path,sha256:overrideSource.sha256},disabled_overrides_sha256:sha(overrides)};
}
function run(command,args,{cwd,env,input,timeout}) {
  return new Promise(resolveRun=>{
    const child=spawn(command,args,{cwd,env,stdio:['pipe','pipe','pipe']});let stdout='',stderr='',timed_out=false;let error='';
    const timer=setTimeout(()=>{timed_out=true;child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),2000).unref();},timeout);
    child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
    child.on('error',e=>error=e.message);child.on('close',(exit_code,signal)=>{clearTimeout(timer);resolveRun({stdout,stderr,exit_code,signal,timed_out,error});});
    child.stdin.end(input);
  });
}
function eventsFrom(stdout){const events=[];let malformed=false;for(const line of stdout.split('\n').filter(x=>x.trim())){try{events.push(JSON.parse(line));}catch{malformed=true;}}return {events,malformed};}
// Parse literals only; never evaluate shell expansions or accept a script as a reader.
function literalWords(command) {
  if(typeof command!=='string'||/[\r\n\x00]/.test(command))return null;
  const words=[];let word='';let quote=null;let started=false;
  for(let i=0;i<command.length;i++){
    const ch=command[i];
    if(quote==="'"){if(ch==="'")quote=null;else word+=ch;continue;}
    if(quote==='"'){
      if(ch==='"'){quote=null;continue;}
      if(ch==='$'||ch==='`')return null;
      if(ch==='\\'){if(/["\\$`]/.test(command[i+1]||''))word+=command[++i];else word+=ch;}
      else word+=ch;
      continue;
    }
    if(/\s/.test(ch)){if(started){words.push(word);word='';started=false;}continue;}
    if(/[;|<>&()$`#*?\[\]{}~!]/.test(ch))return null;
    started=true;
    if(ch==="'"||ch==='"')quote=ch;
    else if(ch==='\\'){if(i+1===command.length)return null;word+=command[++i];}
    else word+=ch;
  }
  if(quote)return null;if(started)words.push(word);return words;
}
function safeOperation(raw) {
  let words=literalWords(raw);if(!words)return null;
  if(words[0]==='/bin/zsh'){
    // Only the native exact quoted shell envelope; no options, nested shells or other executables.
    if(words.length!==3||words[1]!=='-lc'||!/^\/bin\/zsh\s+-lc\s+(['"])[\s\S]*\1\s*$/.test(raw))return null;
    words=literalWords(words[2]);if(!words)return null;
  }
  if(words[0]==='cat'){
    if(words[1]==='--')words.splice(1,1);
    return words.length===2&&!words[1].startsWith('-')?{kind:'read',path:words[1]}:null;
  }
  if(words[0]==='sed'&&words.length===4&&words[1]==='-n'&&/^(?:p|[1-9]\d*,(?:[1-9]\d*|\$)p)$/.test(words[2])&&!words[3].startsWith('-'))return {kind:'read',path:words[3]};
  if(words[0]==='ls'){
    const tail=words.slice(1);while(tail[0]&&/^(?:-[al]+|--)$/.test(tail[0]))tail.shift();
    return tail.length<=1&&(!tail[0]||!tail[0].startsWith('-'))?{kind:'discover',path:tail[0]||'.'}:null;
  }
  if(words[0]==='rg'){
    const tail=words.slice(1);
    if(tail[0]==='--files'){tail.shift();return tail.length<=1&&(!tail[0]||!tail[0].startsWith('-'))?{kind:'discover',path:tail[0]||'.'}:null;}
    while(tail[0]&&['-n','--line-number','-i','--ignore-case','-F','--fixed-strings'].includes(tail[0]))tail.shift();
    if(tail[0]==='--')tail.shift();
    return tail.length===2&&!tail[0].startsWith('-')&&!tail[1].startsWith('-')?{kind:'discover',path:tail[1]}:null;
  }
  return null;
}
function packetPath(cwd,path,arm,kind) {
  if(typeof path!=='string'||!path||path.split(/[\\/]/).includes('..'))throw Error('relative traversal or missing path');
  const root=realpathSync(cwd);const lexical=resolve(root,path);const real=realpathSync(lexical);
  const inside=p=>p===root||p.startsWith(`${root}/`);
  if(!inside(lexical)||!inside(real))throw Error('reader path or symlink escaped snapshot');
  const local=relative(root,real);const allowed=['AGENTS.md','baseline-prose.md','fixture/order.js','fixture/glossary.md'];
  if(arm==='baseline'&&(kind==='read'?!allowed.includes(local):!['','fixture'].includes(local)))throw Error('baseline cannot reach candidate/native/catalog');
  if(kind==='read'&&!readFileSync(real).length)throw Error('empty read has no auditable full-output receipt');
  return {real,local,lexical_local:relative(root,lexical)};
}
function traceObservation(events,cwd,arm,{fixture={},before={}}={}) {
  const read_paths=[];const source_receipts=[];const violations=[];const unknown=[];
  const pending=new Map();
  let applied_patch=false;let read_before_patch=false;let project_switch=false;
  for(const event of events){
    if(event.type==='item.started'&&['command_execution','file_change'].includes(event.item?.type)){
      if(!event.item.id)unknown.push({event,reason:'UNKNOWN started tool identity'});
      else pending.set(event.item.id,event);
      continue;
    }
    if(event.type!=='item.completed')continue;
    const item=event.item||{};
    const started=pending.get(item.id);
    if(started&&item.type==='command_execution'&&started.item.command!==item.command)unknown.push({event,reason:'UNKNOWN started/completed command mismatch'});
    pending.delete(item.id);
    if(item.type==='command_execution'){
      const command=item.command||'';project_switch ||= /project\.sh.*(?:switch|new)/.test(command);
      const operation=safeOperation(command);
      if(!operation){unknown.push({event,reason:'UNKNOWN executable, compound shell, expansion or filesystem operation'});continue;}
      let target;try{target=packetPath(cwd,operation.path,arm,operation.kind);}catch(error){violations.push({command,reason:error.message});continue;}
      if(operation.kind==='read'&&item.exit_code===0){
        const expected=before[target.local]??readFileSync(target.real,'utf8');
        if(expected.trim()&&(item.aggregated_output||'').includes(expected.trim())){
          read_paths.push(target.local,target.lexical_local);
          source_receipts.push({path:target.local,sha256:sha(expected),command,output_sha256:sha(item.aggregated_output||'')});
        }
      }
    }else if(item.type==='file_change'){
      if(!Array.isArray(item.changes)||!item.changes.length){unknown.push({event,reason:'UNKNOWN native patch path list'});continue;}
      let allowed=fixture.write===true;
      for(const change of item.changes){
        if(!change||typeof change.path!=='string'){allowed=false;unknown.push({event,reason:'UNKNOWN patch path'});continue;}
        try{const target=packetPath(cwd,change.path,arm,'write');allowed &&= target.local==='fixture/glossary.md'&&target.lexical_local==='fixture/glossary.md';}
        catch(error){allowed=false;violations.push({path:change.path,reason:error.message});}
      }
      if(!allowed){violations.push({event,reason:'native patch is not authorized exact fixture/glossary.md'});continue;}
      read_before_patch ||= read_paths.includes('fixture/glossary.md');
      applied_patch=true;
    }else if(!['agent_message','reasoning','todo_list'].includes(item.type))unknown.push({event,reason:'UNKNOWN native activity'});
  }
  for(const event of pending.values())unknown.push({event,reason:'UNKNOWN tool operation missing native completion'});
  return {read_paths:[...new Set(read_paths)],source_receipts,native_reached:read_paths.includes('.claude/skills/office/domain-modeling/SKILL.md'),applied_patch,read_before_patch,project_switch,violations,unknown_activity:unknown};
}
function nativeContent(events,kind,role) {
  const blocks=[];
  for(const event of events){
    const p=event.payload;const kinds=p?.internal_chat_message_metadata_passthrough?.content_item_kinds;
    if(event.type!=='response_item'||p?.type!=='message'||!Array.isArray(kinds)||!kinds.includes(kind))continue;
    if(p.role!==role||!Array.isArray(p.content)||p.content.length!==kinds.length)throw Error(`malformed native ${kind} envelope`);
    for(let i=0;i<kinds.length;i++)if(kinds[i]===kind){
      if(p.content[i]?.type!=='input_text'||typeof p.content[i].text!=='string')throw Error(`malformed native ${kind} content`);
      blocks.push({kind,text:p.content[i].text,event_id:p.id,role:p.role});
    }
  }return blocks;
}
function parseHostCatalog(text) {
  if(!text.startsWith('<skills_instructions>\n## Skills\n')||!text.endsWith('\n</skills_instructions>'))throw Error('missing/malformed native host catalog header');
  const rootsAt=text.indexOf('\n### Skill roots\n');const availableAt=text.indexOf('\n### Available skills\n');
  if(rootsAt<0||availableAt<=rootsAt)throw Error('missing native host catalog roots/available header');
  const aliases={};
  for(const line of text.slice(rootsAt+'\n### Skill roots\n'.length,availableAt).split('\n').filter(Boolean)){
    const match=line.match(/^- `(r\d+)` = `(\/[^`\x00]+)`$/);
    if(!match||aliases[match[1]]||match[2].split('/').includes('..'))throw Error('malformed native host root alias');
    aliases[match[1]]=match[2];
  }
  const entries=[];
  for(const line of text.slice(availableAt+'\n### Available skills\n'.length,-'\n</skills_instructions>'.length).split('\n').filter(Boolean)){
    const match=line.match(/^- (.+?): .+ \(file: ([^)\x00]+)\)$/);
    if(!match)throw Error('malformed native host skill entry');
    const short=match[2];const alias=short.match(/^(r\d+)\/(.+)$/);
    if(!alias||!aliases[alias[1]]||alias[2].split('/').some(x=>!x||x==='..'||x==='.')||!alias[2].endsWith('/SKILL.md'))throw Error('malformed/unbound native host skill file');
    entries.push({name:match[1],path:resolve(aliases[alias[1]],alias[2]),short_path:short});
  }
  return {aliases,entries,header_sha256:sha(text)};
}
function packetReceipt(events,cwd,arm,before={}) {
  const receipt={verdict:'UNKNOWN',catalogs:[],selected_skills:[],native_reached:false};
  try{
    const headers=nativeContent(events,'host_skills.instructions','developer');
    if(!headers.length)throw Error('missing native host_skills.instructions header');
    const root=realpathSync(cwd);
    for(const header of headers){
      const catalog=parseHostCatalog(header.text);
      for(const path of Object.values(catalog.aliases)){
        if(!path.startsWith(`${root}/`))throw Error(`foreign native host root alias ${path}`);
        packetPath(root,path,arm,'discover');
      }
      for(const entry of catalog.entries){
        // Do not probe/stat external skill files; the metadata itself already violates packet isolation.
        if(!entry.path.startsWith(`${root}/`))throw Error(`foreign native host skill metadata ${entry.path}`);
        const target=packetPath(root,entry.path,arm,'read');
        if(!['domain-modeling','brainstorm','code-recon','tech-spec'].some(name=>target.local===`.claude/skills/office/${name}/SKILL.md`))throw Error(`non-candidate native host skill ${entry.path}`);
        if(arm==='baseline')throw Error('baseline native candidate metadata');
        entry.physical_path=target.real;
      }
      receipt.catalogs.push({...catalog,event_id:header.event_id});
    }
    for(const selected of nativeContent(events,'skills.selected_skill_instructions','user')){
      if(arm==='baseline')throw Error('baseline selected native skill instructions');
      const match=selected.text.match(/^<skill>\n<name>([^<>\n]+)<\/name>\n<path>([^<>\n]+)<\/path>\n([\s\S]*)\n<\/skill>$/);
      if(!match)throw Error('malformed native selected-skill body');
      const target=packetPath(root,match[2],arm,'read');
      const expected=before[target.local]??readFileSync(target.real,'utf8');
      const body=match[3];
      if(sha(body)!==sha(expected))throw Error('selected native full-body hash mismatch');
      if(target.local!==`.claude/skills/office/${match[1]}/SKILL.md`)throw Error('selected native name/path mismatch');
      receipt.selected_skills.push({kind:selected.kind,event_id:selected.event_id,name:match[1],path:match[2],physical_path:target.real,body_sha256:sha(body),installed_sha256:sha(expected)});
      receipt.native_reached ||= target.local==='.claude/skills/office/domain-modeling/SKILL.md';
    }
    receipt.verdict='PASS';
  }catch(error){receipt.reason=error.message;}
  return receipt;
}
function hostOverrideSource(path) {
  if(!path||!path.startsWith('/'))throw Error('UNKNOWN --host-catalog-receipt absolute task-owned rollout is required before live dispatch');
  const real=realpathSync(path);const tempRoots=[realpathSync(tmpdir()),'/private/tmp'];
  if(!tempRoots.some(p=>real.startsWith(`${p}/`))||!real.includes('/sessions/')||!real.endsWith('.jsonl'))throw Error('UNKNOWN host catalog source must be an exact task-owned temporary rollout');
  const bytes=readFileSync(real);const parsed=eventsFrom(bytes.toString());
  if(parsed.malformed)throw Error('UNKNOWN malformed host catalog source rollout');
  const meta=parsed.events.find(e=>e.type==='session_meta')?.payload;
  const headers=nativeContent(parsed.events,'host_skills.instructions','developer');
  if(!meta?.cwd||!headers.length)throw Error('UNKNOWN missing native source session/catalog header');
  if(!tempRoots.some(p=>meta.cwd.startsWith(`${p}/`)))throw Error('UNKNOWN source session is not a task-owned temporary snapshot');
  const entries=headers.flatMap(h=>parseHostCatalog(h.text).entries);
  return {path:real,sha256:sha(bytes),source_cwd:meta.cwd,entries};
}
function disabledSkillConfig(source,home) {
  const paths=new Set();
  for(const entry of source.entries){
    const p=entry.path;
    if(p.startsWith(`${source.source_cwd}/`))continue; // Never disable this arm's native candidates.
    const system=p.match(/\/skills\/\.system\/([^/]+)\/SKILL\.md$/);
    const file=system?join(home,'skills/.system',system[1],'SKILL.md'):p;
    paths.add(dirname(file));paths.add(file);
  }
  return [...paths].map(path=>`\n[[skills.config]]\npath = ${JSON.stringify(path)}\nenabled = false\n`).join('');
}
function modelReceipt(home,threadId,effort,cwd,arm,before) {
  const sessions=join(home,'sessions');if(!existsSync(sessions))return null;
  const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):e.name.endsWith('.jsonl')?[join(p,e.name)]:[]);
  for(const path of walk(sessions)){
    const bytes=readFileSync(path);const {events,malformed}=eventsFrom(bytes.toString());
    if(malformed)return null;
    if(!events.some(e=>e.type==='session_meta'&&(e.payload?.id===threadId||e.payload?.session_id===threadId)))continue;
    const context=events.find(e=>e.type==='turn_context'&&e.payload?.model);
    const actualEffort=context?.payload?.effort||context?.payload?.reasoning_effort||context?.payload?.model_reasoning_effort;
    if(!context||actualEffort!==effort)return null;
    return {path,sha256:sha(bytes),model:context.payload.model,effort:actualEffort,packet_receipt:packetReceipt(events,cwd,arm,before)};
  }return null;
}
async function invoke(root,fixture,arm,target,evidence,timeout,overrideSource) {
  const isolation=isolated(root,fixture,arm,evidence);const home=isolatedCodexHome(evidence,overrideSource);
  const schemaPath=join(evidence,'answer-schema.json');writeFileSync(schemaPath,JSON.stringify(schema));
  // Non-ephemeral only in the task-owned home, so native observed model/effort is auditable.
  const args=['exec','--json','--skip-git-repo-check','--ignore-rules','--sandbox',fixture.write?'workspace-write':'read-only','-C',isolation.cwd,'--output-schema',schemaPath,'-c',`model_reasoning_effort="${target.effort}"`,'-'];
  const scope='This single turn is a bounded framework NO_PIN fixture. Stay strictly inside the supplied snapshot. Do not read the original repository or any other checkout, use network, switch/create a project or mutate harness config. No human response follows this turn. Preserve unmet human decisions as open. Return the structured envelope in the schema: owner and action describe the task you actually handled; result is the modeling/analysis return; retained_ids, conflict_register, must_coverage_gate and human_gate describe the original caller invariants (empty when inapplicable). Proposed terms are not accepted. Cite actual code separately from user statements. Never claim a write without an actual artifact change.\n';
  const prompt=`${scope}${fixture.entry==='internal'&&['plan-agent','orchestrator'].includes(fixture.target)?`Read .claude/agents/${fixture.target}.md completely before the local host decision.\n`:''}${fixture.request}`;
  let execution;let receipt;
  try{
    execution=await run('codex',args,{cwd:isolation.cwd,input:prompt,timeout,env:{...process.env,CODEX_HOME:home.home,MEMORY_ROOT:isolation.cwd,CLAUDE_PROJECT_DIR:isolation.cwd,LUCA_GSTACK_ROOT:isolation.cwd,LUCA_PROJECTS_ROOT:join(isolation.cwd,'nonexistent-projects'),LUCA_ACTUAL_HARNESS:'codex'}});
    const nativeEvents=eventsFrom(execution.stdout).events;
    receipt=modelReceipt(home.home,nativeEvents.find(e=>e.type==='thread.started')?.thread_id,target.effort,isolation.cwd,arm,isolation.before);
  }finally{
    // Exact generated auth copy only; preserve native rollout receipts and never touch the source home.
    if(existsSync(join(home.home,'auth.json')))rmSync(join(home.home,'auth.json'));
  }
  const rawPath=join(isolation.cwd,'raw-stdout.jsonl');const errPath=join(isolation.cwd,'raw-stderr.txt');
  const after=files(isolation.cwd);const changed=Object.keys({...isolation.before,...after}).filter(p=>isolation.before[p]!==after[p]);
  writeFileSync(rawPath,execution.stdout);writeFileSync(errPath,execution.stderr);
  const parsed=eventsFrom(execution.stdout);const observed=traceObservation(parsed.events,isolation.cwd,arm,{fixture,before:isolation.before});
  observed.native_reached ||= receipt?.packet_receipt?.native_reached===true;
  const final=parsed.events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').at(-1)?.item?.text;
  let answer=null;let malformedAnswer='';try{answer=JSON.parse(final);}catch(e){malformedAnswer=e.message;}
  const unknown=execution.exit_code!==0||execution.timed_out||execution.error||parsed.malformed||malformedAnswer||!receipt||receipt.packet_receipt?.verdict!=='PASS'||!parsed.events.some(e=>e.type==='turn.completed')||observed.unknown_activity.length;
  const requireNative=arm!=='baseline'&&!['consume','rename','refuse','escape','adr','brainstorm-control','recon-control','spec-control'].includes(fixture.check);
  const check=unknown?{verdict:'UNKNOWN',checks:[{id:'native-execution-receipt',pass:false,detail:JSON.stringify({exit_code:execution.exit_code,timed_out:execution.timed_out,error:execution.error,malformed_stream:parsed.malformed,malformed_answer:malformedAnswer,model_receipt:receipt,unknown_activity:observed.unknown_activity})}],semantic_points:0}:score(fixture,answer,{...observed,changed,after,require_native:requireNative});
  if(observed.violations.length){check.verdict='FAIL';check.checks.push({id:'snapshot-read-isolation',pass:false,detail:JSON.stringify(observed.violations)});}
  const raw_evidence=[{path:rawPath,sha256:sha(execution.stdout)},{path:errPath,sha256:sha(execution.stderr)},home.host_catalog_source,...(receipt?[{path:receipt.path,sha256:receipt.sha256}]:[])];
  const cell={fixture_id:fixture.id,arm,target:fixture.target,tier:target.tier,effort:target.effort,cli:{command:'codex',args,cwd:isolation.cwd,config_sha256:home.config_sha256,host_catalog_source:home.host_catalog_source,disabled_overrides_sha256:home.disabled_overrides_sha256},prose_path:isolation.prose_path,prose_sha256:isolation.prose_sha256,fixture_sha256:sha(JSON.stringify(fixture)),model_receipt:receipt,packet_receipt:receipt?.packet_receipt||{verdict:'UNKNOWN',reason:'missing native model/packet rollout receipt'},answer,changed,check,verdict:check.verdict,raw_evidence};
  writeFileSync(join(isolation.cwd,'verdict.json'),JSON.stringify(cell,null,2));return cell;
}

function sample(action='model') {
  return {owner:'domain-modeling',action,result:{status:'NEEDS_CONTEXT',scope:{mode:'NO_PIN',artifact:''},resolved_terms:[{name:'Customer Organization',concept:'buying company',disposition:'proposed'},{name:'User',concept:'login person',disposition:'proposed'}],relationships:[],code_evidence:[],open_questions:[{question:'Which names do you accept?',dependency:'user'}],writes:[],blocking_for_caller:[],resume_target:'user'},retained_ids:[],conflict_register:[],must_coverage_gate:'',human_gate:'waiting for real human response'};
}
function selfTest() {
  const f={id:'F02',check:'overload'};const good=sample();assert.equal(score(f,good,{changed:[]}).verdict,'PASS');
  const accepted=structuredClone(good);accepted.result.resolved_terms[0].disposition='accepted';assert.equal(score(f,accepted,{changed:[]}).verdict,'FAIL','automatic canonical term was green');
  assert.equal(score(f,good,{changed:['CONTEXT.md']}).verdict,'FAIL','unauthorized write was green');
  const sameConcept=structuredClone(good);sameConcept.result.resolved_terms[1].concept='buying company';assert.equal(score(f,sameConcept,{changed:[]}).verdict,'FAIL','renaming same concept passed');
  assert.equal(score(f,null,{}).verdict,'UNKNOWN');
  assert.equal(compareArms({positive:'F02'},f,{verdict:'PASS',semantic_points:8},{verdict:'PASS',semantic_points:8}).verdict,'FAIL','textual/native delta became semantic PASS');
  assert.equal(compareArms({positive:'F02'},f,null,{verdict:'PASS',semantic_points:9}).verdict,'UNKNOWN','missing arm green');
  assert.equal(compareArms({positive:'F02'},f,{verdict:'FAIL',semantic_points:5},{verdict:'PASS',semantic_points:9}).verdict,'PASS');
  assert.equal(compareArms({control:'F02'},f,{verdict:'PASS',semantic_points:9},{verdict:'PASS',semantic_points:8}).verdict,'FAIL');
  const positive={...score(f,good,{}),verdict:'UNKNOWN'};assert.equal(compareArms({positive:'F02'},f,positive,score(f,good,{})).verdict,'UNKNOWN');
  const scratch=realpathSync(mkdtempSync(join(tmpdir(),'domain-modeling-reader-selftest-')));
  put(scratch,'fixture/order.js',ORDER);put(scratch,'fixture/glossary.md',GLOSSARY);
  put(scratch,'baseline-prose.md','Frozen prose only\n');
  put(scratch,'.claude/skills/office/domain-modeling/SKILL.md','Native canonical full body\n');
  mkdirSync(join(scratch,'.agents/skills'),{recursive:true});symlinkSync('../../.claude/skills/office/domain-modeling',join(scratch,'.agents/skills/domain-modeling'));
  const commandEvent=(command,output='')=>({type:'item.completed',item:{type:'command_execution',command,exit_code:0,aggregated_output:output}});
  const observe=(command,output='',arm='candidate')=>traceObservation([commandEvent(command,output)],scratch,arm);
  for(const [id,command] of [
    ['python-hidden-read',"python3 -c 'import pathlib; print(pathlib.Path(\"/Users/luca/live/SKILL.md\").read_text())'"],
    ['node-hidden-read',"node -e 'console.log(require(\"fs\").readFileSync(\"/Users/luca/live/SKILL.md\"))'"],
    ['HOME-expansion','cat "$HOME/live/SKILL.md"'],
    ['substitution','cat "$(pwd)/fixture/order.js"'],
    ['compound','cat fixture/order.js; cat fixture/glossary.md'],
    ['redirect','cat fixture/order.js > fixture/copy.js'],
    ['unknown-operation','unknown-reader fixture/order.js'],
    ['rg-script-preprocessor','rg --pre=python fixture/order.js'],
    ['shell-script','/bin/zsh -lc \'node -e "require(\\"fs\\").readFileSync(\\"/Users/luca/live\\")"\'']
  ]){const observation=observe(command,ORDER);assert.ok(observation.unknown_activity.length,`${id}: unknown read accepted`);assert.equal(score(f,good,observation).verdict,'UNKNOWN',`${id}: unknown operation became green`);}
  const outside=realpathSync(mkdtempSync(join(tmpdir(),'domain-modeling-outside-selftest-')));put(outside,'secret.md','Do not consume\n');symlinkSync(join(outside,'secret.md'),join(scratch,'fixture/escape.md'));
  for(const command of ['cat ../other-project/glossary.md','cat fixture/escape.md',`cat ${join(outside,'secret.md')}`]){const observation=observe(command,'Do not consume');assert.ok(observation.violations.length,'scope/symlink escape accepted');assert.equal(score(f,good,observation).verdict,'FAIL');}
  for(const command of ['cat .agents/skills/domain-modeling/SKILL.md',"sed -n '1,200p' .claude/skills/office/domain-modeling/SKILL.md","/bin/zsh -lc 'cat .agents/skills/domain-modeling/SKILL.md'"]){const observation=observe(command,'Native canonical full body\n');assert.equal(observation.unknown_activity.length,0);assert.equal(observation.violations.length,0);assert.equal(observation.native_reached,true,'permitted native reader did not receipt canonical');}
  assert.equal(observe('cat .agents/skills/domain-modeling/SKILL.md','Native canonical full body','baseline').violations.length,1,'baseline native path accepted');
  assert.equal(observe('cat baseline-prose.md','Frozen prose only\n','baseline').read_paths.includes('baseline-prose.md'),true);
  assert.equal(observe("sed -n '1,1p' fixture/glossary.md",'# Test domain\n').read_paths.length,0,'partial output minted full-read receipt');
  for(const command of ['ls -la .agents/skills','rg --files .claude',"rg -n 'domain-modeling' .claude/skills/office/domain-modeling/SKILL.md"]){const observation=observe(command);assert.equal(observation.unknown_activity.length,0);assert.equal(observation.violations.length,0);assert.equal(observation.read_paths.length,0,'discovery minted full-read receipt');}
  const patchEvent=path=>({type:'item.completed',item:{type:'file_change',changes:[{path,kind:'update'}]}});
  const patched=traceObservation([commandEvent('cat fixture/glossary.md',GLOSSARY),patchEvent('fixture/glossary.md')],scratch,'candidate',{fixture:{write:true},before:{'fixture/glossary.md':GLOSSARY}});
  assert.equal(patched.applied_patch,true);assert.equal(patched.read_before_patch,true);
  const noAuthority=traceObservation([patchEvent('fixture/glossary.md')],scratch,'candidate');assert.equal(noAuthority.violations.length,1,'unapproved native patch green');
  const wrongPatch=traceObservation([patchEvent('fixture/order.js')],scratch,'candidate',{fixture:{write:true}});assert.equal(wrongPatch.violations.length,1,'wrong artifact patch green');
  const patchFirst=traceObservation([patchEvent('fixture/glossary.md'),commandEvent('cat fixture/glossary.md',GLOSSARY)],scratch,'candidate',{fixture:{write:true},before:{'fixture/glossary.md':GLOSSARY}});assert.equal(patchFirst.read_before_patch,false,'post-patch read asserted read-before-write');
  const missingCompletion=traceObservation([{type:'item.started',item:{id:'unclosed',type:'command_execution',command:'cat fixture/order.js'}}],scratch,'candidate');assert.equal(score(f,good,missingCompletion).verdict,'UNKNOWN','uncompleted tool green');
  const catalogText=(aliases={},entries=[])=>'<skills_instructions>\n## Skills\nNative skill metadata.\n### Skill roots\n'+Object.entries(aliases).map(([name,path])=>`- \`${name}\` = \`${path}\``).join('\n')+'\n### Available skills\n'+entries.map(([name,path])=>`- ${name}: Native description. (file: ${path})`).join('\n')+'\n</skills_instructions>';
  const nativeBlock=(kind,text,role='developer')=>({type:'response_item',payload:{type:'message',id:`native-${kind}`,role,content:[{type:'input_text',text}],internal_chat_message_metadata_passthrough:{content_item_kinds:[kind]}}});
  const nativeHeader=nativeBlock('host_skills.instructions',catalogText({r0:join(scratch,'.agents/skills')},[['domain-modeling','r0/domain-modeling/SKILL.md']]));
  const emptyHeader=nativeBlock('host_skills.instructions',catalogText());
  assert.equal(packetReceipt([emptyHeader],scratch,'baseline').verdict,'PASS','native empty header not legal for baseline');
  assert.equal(packetReceipt([],scratch,'candidate').verdict,'UNKNOWN','missing native header green');
  assert.equal(packetReceipt([nativeBlock('host_skills.instructions','malformed')],scratch,'candidate').verdict,'UNKNOWN');
  const foreignHeader=nativeBlock('host_skills.instructions',catalogText({r0:'/Users/example/.agents/skills'},[['foreign','r0/foreign/SKILL.md']]));
  assert.equal(packetReceipt([foreignHeader],scratch,'candidate').verdict,'UNKNOWN','foreign native metadata green');
  assert.equal(packetReceipt([nativeHeader],scratch,'baseline').verdict,'UNKNOWN','baseline native candidate metadata green');
  const selectedText=(path,body='Native canonical full body\n',name='domain-modeling')=>`<skill>\n<name>${name}</name>\n<path>${path}</path>\n${body}\n</skill>`;
  const selected=nativeBlock('skills.selected_skill_instructions',selectedText(join(scratch,'.agents/skills/domain-modeling/SKILL.md')),'user');
  const injection=packetReceipt([nativeHeader,selected],scratch,'candidate');assert.equal(injection.verdict,'PASS');assert.equal(injection.native_reached,true,'valid native injection missed reach');assert.equal(injection.selected_skills[0].body_sha256,sha('Native canonical full body\n'));
  assert.equal(packetReceipt([emptyHeader,selected],scratch,'baseline').verdict,'UNKNOWN','baseline native auto injection green');
  for(const selectedBad of [
    nativeBlock('skills.selected_skill_instructions',selectedText(join(scratch,'.agents/skills/domain-modeling/SKILL.md'),'Different body\n'),'user'),
    nativeBlock('skills.selected_skill_instructions',selectedText('/Users/example/foreign/SKILL.md'),'user'),
    nativeBlock('skills.selected_skill_instructions',selectedText(join(scratch,'.agents/skills/domain-modeling/SKILL.md'),'Native canonical full body\n','wrong-name'),'user'),
    nativeBlock('generic.user.prose',selected.payload.content[0].text,'user')
  ]){const packet=packetReceipt([nativeHeader,selectedBad],scratch,'candidate');assert.equal(packet.native_reached,false,'wrong native hash/path/name/kind minted reach');}
  const generic=nativeBlock('generic.user.prose',selected.payload.content[0].text,'user');assert.equal(packetReceipt([nativeHeader,generic],scratch,'candidate').native_reached,false,'generic <skill> user prose minted native reach');
  assert.throws(()=>hostOverrideSource(),/host-catalog-receipt/,'missing explicit override receipt accepted');
  const overrideHome=join(scratch,'generated-home');
  const overrideSource={source_cwd:scratch,entries:[{path:join(scratch,'.agents/skills/domain-modeling/SKILL.md')},{path:'/Users/example/.agents/skills/foreign/SKILL.md'},{path:'/private/tmp/old-task-home/skills/.system/openai-docs/SKILL.md'}]};
  const config=disabledSkillConfig(overrideSource,overrideHome);
  assert.ok(config.includes('path = "/Users/example/.agents/skills/foreign"')&&config.includes('path = "/Users/example/.agents/skills/foreign/SKILL.md"'));
  assert.ok(config.includes(JSON.stringify(join(overrideHome,'skills/.system/openai-docs/SKILL.md'))),'builtins not remapped to task home');
  assert.ok(!config.includes('/private/tmp/old-task-home')&&!config.includes('.agents/skills/domain-modeling'),'override disabled native candidates or retained old builtin home');
  assert.equal(config.match(/\[\[skills.config\]\]/g).length,4);assert.equal(config.match(/enabled = false/g).length,4);
  if(arg('--host-catalog-receipt')){
    const source=hostOverrideSource(arg('--host-catalog-receipt'));
    const actualConfig=disabledSkillConfig(source,overrideHome);
    assert.ok(source.entries.length>0&&actualConfig.includes('[[skills.config]]'),'explicit saved native source produced no overrides');
    console.log(`PASS explicit task-owned host catalog source ${source.path} sha256=${source.sha256} entries=${source.entries.length} overrides_sha256=${sha(actualConfig)}`);
  }
  const native=score(f,good,{require_native:true,native_reached:false});assert.equal(native.verdict,'FAIL','fake injected discovery passed');
  assert.equal((COMMON_ROOT+ROOT_ENTRY.baseline).slice(0,COMMON_ROOT.length),(COMMON_ROOT+ROOT_ENTRY.candidate).slice(0,COMMON_ROOT.length),'arm safety roots differ');
  assert.doesNotMatch(COMMON_ROOT,/rename|canonical|accepted|IDs|coverage|glossary.*consume|original.owner/i,'root teaches tested semantics');
  const escape=sample('refuse');escape.result.scope.artifact='fixture/glossary.md';escape.result.resolved_terms=[];assert.equal(score({check:'escape'},escape,{changed:[],project_switch:false}).verdict,'PASS','legal scope expression rejected');
  console.log('PASS domain-modeling scorer/readers/native packet: semantic no-op, missing arms, unsafe reads UNKNOWN, scope/patch refusal, native catalog contamination and missing headers UNKNOWN, selected kind/path/full-body hash receipt, scoped disabled overrides');
}
async function main() {
  if(process.argv.includes('--self-test')){selfTest();return;}
  if(process.argv.includes('--describe')){console.log(JSON.stringify(loadFixtures(resolve(arg('--root')||ROOT)),null,2));return;}
  if(arg('--harness')==='claude'){console.error('UNKNOWN Claude live/A-B DEFERRED_BY_USER; runner refuses invocation and cannot issue a PASS ticket');process.exitCode=2;return;}
  if(arg('--harness')!=='codex')throw Error('usage: --harness codex --fixtures all --trials 1 [--ab --targets domain-modeling,brainstorm,code-recon,tech-spec] [--evidence absolute-dir]');
  const overrideSource=hostOverrideSource(arg('--host-catalog-receipt'));
  const trials=Number(arg('--trials')||1);if(!Number.isInteger(trials)||trials<1)throw Error('invalid --trials');
  const root=resolve(arg('--root')||ROOT);const suite=loadFixtures(root);const evidence=resolve(arg('--evidence')||process.env.DOMAIN_MODELING_EVIDENCE||join(tmpdir(),'domain-modeling-evidence'));mkdirSync(evidence,{recursive:true});
  const ab=process.argv.includes('--ab');const targets=(arg('--targets')||Object.keys(suite.targets).join(',')).split(',');
  if(ab&&(targets.length!==4||Object.keys(suite.targets).some(t=>!targets.includes(t))))throw Error('A/B requires all four target arms, no partial green');
  const selection=arg('--fixtures')||'all';let fixtures=ab?targets.flatMap(t=>[suite.targets[t].positive,suite.targets[t].control]).map(id=>suite.fixtures.find(f=>f.id===id)):suite.fixtures.filter(f=>f.id.startsWith('F'));
  if(!ab&&selection!=='all')fixtures=fixtures.filter(f=>selection.split(',').includes(f.id));
  if(!fixtures.length)throw Error('empty/missing fixture selection');
  const version=spawnSync('codex',['--version'],{encoding:'utf8'});if(version.status!==0)throw Error(`UNKNOWN Codex CLI missing: ${version.stderr||version.error?.message}`);
  const manifest=sourceManifest(root);const cells=[];const timeout=Number(arg('--timeout-ms')||300000);
  for(let trial=0;trial<trials;trial++)for(const fixture of fixtures){
    const target=suite.targets[fixture.target]||{tier:'core-execution',effort:'high'};
    console.log(`RUN ${fixture.id} ${ab?'baseline/candidate':'native'} ${target.tier}/${target.effort}`);
    if(ab){
      const baseline=await invoke(root,fixture,'baseline',target,evidence,timeout,overrideSource);const candidate=await invoke(root,fixture,'candidate',target,evidence,timeout,overrideSource);
      const comparison=compareArms(target,fixture,baseline.check,candidate.check);
      if(!baseline.model_receipt||!candidate.model_receipt||baseline.model_receipt.model!==candidate.model_receipt.model){comparison.verdict='UNKNOWN';comparison.reason='missing or mismatched native observed inherited-model receipts';}
      const cell={fixture_id:fixture.id,target:fixture.target,trial,verdict:comparison.verdict,comparison,baseline,candidate,raw_evidence:[...baseline.raw_evidence,...candidate.raw_evidence]};cells.push(cell);
      console.log(`${cell.verdict} ${fixture.id}: ${comparison.reason}`);
    }else{const cell=await invoke(root,fixture,'native',target,evidence,timeout,overrideSource);cell.trial=trial;cells.push(cell);console.log(`${cell.verdict} ${fixture.id}`);}
    // Save every attempted cell immediately; a crash cannot manufacture complete coverage.
    writeFileSync(join(evidence,ab?'ab-summary.json':'live-summary.json'),JSON.stringify({verdict:'UNKNOWN',harness:'codex',claude:'DEFERRED_BY_USER',source_manifest:manifest,cells},null,2));
  }
  const full=selection==='all'&&fixtures.length===(ab?8:suite.fixtures.filter(f=>f.id.startsWith('F')).length);
  const stable=JSON.stringify(manifest)===JSON.stringify(sourceManifest(root));
  const verdict=full&&stable&&cells.every(c=>c.verdict==='PASS')?'PASS':cells.some(c=>c.verdict==='FAIL')?'FAIL':'UNKNOWN';
  const summary={verdict,harness:'codex',claude:'DEFERRED_BY_USER',baseline_ref:suite.baseline_ref,cli_version:version.stdout.trim(),source_manifest:manifest,full_coverage:full,source_bytes_stable:stable,cells};
  const path=join(evidence,ab?'ab-summary.json':'live-summary.json');writeFileSync(path,JSON.stringify(summary,null,2));
  console.log(`${verdict} ${path} sha256=${sha(readFileSync(path))}`);if(verdict!=='PASS')process.exitCode=1;
}
if(process.argv[1]&&realpathSync(process.argv[1])===realpathSync(RUNNER))main().catch(error=>{console.error(`UNKNOWN domain-modeling eval: ${error.message}`);process.exitCode=2;});
