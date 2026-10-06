---
name: prototype-notes
preamble-tier: 1
version: 1.0.0
description: |
  给明确已有本地 HTML 增改交互说明、标注与人工编辑入口；真实确认当前业务版本后，
  AI 仅处理本次新增范围，人工可编辑整个支持原型。静态回流保留当前业务字节和人工历史，
  返回 exact candidate 给 caller 独立验收；不生成新页面、不改业务侧栏、不重开历史完成节点。
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
context-cost:
  self: 25471
  runtime-estimate: 6500
metadata:
  recommended-model: core-execution
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
_TOPIC=$(if [ -n "${_PROJECT_ROOT:-}" ]; then cat "$_PROJECT_ROOT/.luca/current-topic.txt" 2>/dev/null || echo "none"; else echo "none"; fi)
echo "CURRENT_TOPIC: $_TOPIC"
python3 .claude/observability/scripts/get_rules.py prototype-notes "*" 2>/dev/null || true
```

Before project reads/writes, caller verifies project-session and freezes its canonical binding as
`_PROJECT_ROOT`. NO_PIN inspection uses exact user-authorized files and leaves that variable unset.
This is one executor: caller owns independent QG dispatch, model selection and OD/workflow resumption.

## 1. 读取精确输入

先按 `.claude/skill-os/runtime/workflow-mode.md` 消费本 key 的 generated input view，缺失时走该 owner 的受控 fallback。
standalone 必需 actual_html_artifact/requested_notes_scope；workflow 另需本次实际已绑定 source_handoff，不能要未来 notes DONE。
internal 必需 caller/actual_html_artifact/requested_notes_scope/condition_evidence/inherited_authority/authority_effect_intersection，
权限只取当前宿主交集，来源/原 U-ID/真实确认可继承。固定 caller 把 copy/edit/metadata/browser 的双方明确 true 交集传给后续共享 API；缺项或 false 不授予 effect，checkpoint 写入也受 metadata 交集约束。独立外部 HTML 不要求 Brief/远端 OD receipt；宣称 OD/recover 来源才验证其真实 provenance。

读 `.claude/skills/office/references/prototype-notes/contract.md` §2/8 和 `.claude/skill-os/runtime/prototype-delivery.md` 到 EOF。
精确本地输入/asset closure、当前 read/copy/edit/metadata/browser effects 与获准相邻 delivery root 分别核实；文件路径、checkpoint 和 metadata 不签发权限。
普通输入不能与 delivery/base 根实路径相包含；exact accepted motion 仅走 delivery.deriveFromAccepted，不能假造 parent 或 notes→notes派生。
缺权限仍可在实际只读范围 intake/display，生产停在门前。缺实际 browser 能力时保留能力失败，不把 tier1 当运行证据。

## 2. 确认版本并冻结范围

真实用户确认须绑定当前业务 revision 和精确 input/source SHA；回收、motion PASS、自动 QA 与 authority 都不是确认。
已核有效确认直接继承，缺确认仅 intake/display，在生成/注入前停留 AWAITING_CONFIRMATION，不发有效 candidate。
requested_notes_scope 是用户意图；以当前来源/DOM 冻结本轮新增 unit/context/root/instance 与全部适用 behaviors，含混不得猜全页。
AI 只写这些新增或明确授权变化对象，人工新增/编辑/删除/重绑/下载覆盖整个支持原型；manual-only 允许空 AI scope，不编虚假生成分母。
已含说明先从最新完整 HTML extract，沿用 document/annotation ID、编号、人工文本、tombstone 和多次合并历史；本机旧缓存不代选最新版。

## 3. 读取共享内容与生成规范

完整读取 `.claude/skills/office/references/prototype-notes/content-guidelines.md` 与
`.claude/skills/office/references/prototype-notes/generation.md`；generation 与独立 content-review 绑定同版同 SHA。
当前 content-guidelines 1.0.0 的 SHA 为 322de1d236e7b4e0ba26520f036ccf2d76e3a58211d4bd5726adf37d78fbbf42。
适用性、自然语言准确性与原始来源全分母由独立审阅核对，字段/regex 或 synthetic integrity 不证明 A11。

## 4. 调共享核心生成、绑定、合并与组包

只调用 `scripts/prototype-notes.mjs` 的 validateNotes/validateGenerationScope/mergeNotes/buildAnnotatedHtml/extractNotes 与既有人工事务。
不复制 parser/合并/资源/运行时实现。无本次 AI scope/协助且原样保留已 strict extract 的完整说明时，复用 adapter 暴露的共享 core.buildAnnotatedHtml 对已验证 bundle 组包；旧 AI scope/origin 是历史，不冒充本次生成。业务和 notes 字节未变走既有 adequate-copy，原新增 AI 范围验证仍走 validateGenerationScope/buildAnnotatedHtml。AI 输出声明式 notes 数据，不执行 AI HTML/JS。原业务失败证据保留；最终完整源分母仍失败则阻断完成。
E6 三条回流：合法说明导出 extract 后沿用未变业务确认；可分离业务改动用共享 adapter 的显式 rebase，保留上传 bytes/hash，只剥已知且可验工具区间，
新业务源重核闭包/真实确认/锚点；不可分离或未知版本拒绝、原件留存。禁止用旧 snapshot 吞掉当前业务修改。rebase 数据动作和重绑复用共享 core。

下面固定 caller 是本入口唯一可直接执行的编排体（仓库根 Node ES module）；不是示例、测试分支或通用插件 executor。
宿主从当前 project/session/native 调用提供实际 authority、确认来源、模式/节点与冻结 input/scope/分母。候选/checkpoint不能构造宿主。
`confirmedBusiness()` 只由宿主已核真实消息/确认记录返回 exact ref，boolean不接受；合成测试宿主仅证明消费/拒绝，真人及 U008 两端证据另行验收。
本 block 只做前置、身份和 checkpoint/交付编排。独立 PREACCEPT/原票/seal 在 caller；本 block 不制造 QG PASS。

<!-- PROTOTYPE_NOTES_CALLER:START -->
```javascript
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as notes from './scripts/prototype-notes.mjs';
import * as delivery from './scripts/prototype-delivery.mjs';
const pnHash=bytes=>createHash('sha256').update(bytes).digest('hex');
const pnRequire=(test,code)=>{if(!test)throw Error(code);};
const pnResult=result=>{pnRequire(result.ok,result.code+': '+result.message);return result.value;};
const pnEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const pnRef=file=>({path:file,sha256:pnHash(fs.readFileSync(file))});
function pnPath(file){pnRequire(typeof file==='string'&&path.isAbsolute(file)&&!file.split(path.sep).some(x=>x==='.'||x==='..'),'PATH_ESCAPE');file=path.normalize(file);let p=path.parse(file).root;for(const x of file.slice(p.length).split(path.sep).filter(Boolean)){p=path.join(p,x);pnRequire(!fs.lstatSync(p).isSymbolicLink(),'SYMLINK_REFUSED');}return file;}
function pnRead(ref,host){pnRequire(ref&&/^[0-9a-f]{64}$/.test(ref.sha256),'REF_REQUIRED');const file=pnPath(ref.path),ctx=host.current_context;pnRequire(ctx&&((ctx.read_paths||[]).includes(file)||(ctx.read_roots||[]).some(r=>path.isAbsolute(r)&&(file===r||file.startsWith(r+path.sep)))),'READ_SCOPE_REFUSED');const bytes=fs.readFileSync(file);pnRequire(pnHash(bytes)===ref.sha256,'HASH_DRIFT');return bytes;}
function pnJson(ref,host){return JSON.parse(pnRead(ref,host));}
function pnWrite(file,data){fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return pnRef(file);}
function pnCheckpoint(host){const root=pnPath(host.call_evidence_root),a=host.current_evidence_authority;pnRequire(a&&a.root===root&&a.metadata===true&&(host.mode!=='internal'||host.current_context?.effects?.metadata===true),'EVIDENCE_EFFECT_REFUSED');pnRequire(/^[a-zA-Z0-9_-]{1,100}$/.test(host.call_id),'CALL_ID_REQUIRED');pnRequire(root!==host.delivery_root&&!root.startsWith(host.delivery_root+path.sep)&&!host.delivery_root.startsWith(root+path.sep),'CHECKPOINT_LOCATION');return path.join(root,'notes-checkpoint.json');}
async function pnInput(host){
 pnRequire(['standalone','workflow','internal'].includes(host.mode),'MODE_REQUIRED');
 pnRequire(Object.hasOwn(host,'requested_notes_scope')&&host.requested_notes_scope!==undefined,'REQUESTED_SCOPE_REQUIRED');
 pnRequire(Array.isArray(host.source_required)&&host.source_required.length&&Array.isArray(host.notes_required)&&host.notes_required.length&&host.notes_required.every(id=>/^NOTES:.+/.test(id)),'REQUIRED_DENOMINATOR');
 if(host.mode==='workflow'){pnRequire(host.node_context?.selected_skill==='prototype-notes'&&host.node_context.completion==='IN_PROGRESS','WORKFLOW_NODE_REQUIRED');pnRead(host.source_handoff,host);}
 if(host.mode==='internal'){for(const key of ['caller','condition_evidence','inherited_authority','authority_effect_intersection'])pnRequire(host[key],'INTERNAL_INPUT_REQUIRED:'+key);pnRequire(host.parent_call_ref,'PARENT_CALL_REQUIRED');pnRead(host.parent_call_ref,host);pnRequire(host.parent_completion==='IN_PROGRESS','PARENT_NOT_ACTIVE');}
 const data=pnJson(host.notes_input_ref,host);pnRequire(data.input_version===1&&data.document_id&&data.base&&Object.hasOwn(data,'scope')&&Array.isArray(data.behaviors)&&Array.isArray(data.source_refs),'NOTES_INPUT_REQUIRED');
 pnRequire(pnEqual(data.scope,host.approved_scope)&&pnEqual(data.behaviors,host.approved_behaviors),'SCOPE_NOT_FROZEN');
 pnRead(host.scope_ref,host);pnRequire(pnEqual(pnJson(host.scope_ref,host),data.scope),'SCOPE_CHANGED');
 const parent=host.exact_accepted_ref?delivery.resolveFinal({...host.exact_accepted_ref,delivery_root:host.delivery_root},host.current_context):null;
 pnRequire(!parent||parent.processor_id==='motion-polish','PARENT_PROCESSOR');
 const bound=parent?null:delivery.bindBase({...host.base_input,processor_id:'prototype-notes'},host.current_context);
 const entry_ref=parent?{path:parent.final_entry,sha256:parent.final_sha256}:{path:bound.base.entry,sha256:bound.base.sha256};
 pnRequire(data.base.entry_path===entry_ref.path&&data.base.entry_sha256===entry_ref.sha256,'INPUT_BASE_CHANGED');
 const bytes=pnRead(entry_ref,host).toString('utf8');let source=bytes,existing=null;
 if(host.input_kind==='annotated-html'){existing=pnResult(await notes.extractNotes(bytes,host.rebase_selected===true?{rebase:true}:undefined));source=existing.source;}else pnRequire(host.input_kind==='raw','INPUT_KIND_REQUIRED');
 const parentRoot=parent&&(parent.delivery.kind==='adequate-original'?parent.base.asset_root:path.join(path.dirname(parent.candidate_ref.path),'content'));
 const base=parent?{...parent.base,entry:parent.final_entry,sha256:parent.final_sha256,entry_relative:path.relative(parentRoot,parent.final_entry).split(path.sep).join('/'),closure:parent.delivery.closure.map(item=>({...item,path:path.relative(parentRoot,path.join(parent.delivery_root,item.path)).split(path.sep).join('/')}))}:bound.base;
 const files=base.closure.map(item=>({path:item.path,sha256:item.path===base.entry_relative?pnHash(source):item.sha256})).sort((a,b)=>a.path.localeCompare(b.path));
 const business_revision=pnHash(JSON.stringify(files));
 pnRequire(typeof host.confirmedBusiness==='function','CONFIRMATION_PROVIDER_REQUIRED');const confirmation=await host.confirmedBusiness({entry_ref:structuredClone(entry_ref),business_revision,source_sha256:pnHash(source),rebase:existing?.rebase||null});
 if(confirmation){pnRequire(typeof confirmation==='object'&&confirmation.source_ref,'CONFIRMATION_REQUIRED');pnRead(confirmation.source_ref,host);pnRequire(confirmation.confirmed_prototype_revision===business_revision&&(confirmation.input_artifact_sha256===entry_ref.sha256||existing&&!existing.rebase&&confirmation.input_artifact_sha256===pnHash(source)),'CONFIRMATION_STALE');}
 const guideline_ref=structuredClone(host.guideline_ref),runtime_ref=structuredClone(host.runtime_ref);pnRead(guideline_ref,host);pnRead(runtime_ref,host);
 pnRequire(guideline_ref.pin_or_version==='1.0.0'&&runtime_ref.pin_or_version==='1.0.0','UNKNOWN_VERSION');pnRequire(guideline_ref.sha256==='322de1d236e7b4e0ba26520f036ccf2d76e3a58211d4bd5726adf37d78fbbf42','CONTENT_GUIDELINE_CHANGED');
 return {data,bound,parent,entry_ref,source,existing,business_revision,confirmation,guideline_ref,runtime_ref};
}
export async function prototypeNotesCall(request,host){
 if(host.mode==='internal'){const inherited=host.authority_effect_intersection;pnRequire(inherited&&typeof inherited==='object'&&!Array.isArray(inherited),'INTERNAL_INPUT_REQUIRED:authority_effect_intersection');const current=host.current_context?.effects||{};host={...host,current_context:{...host.current_context,effects:{...current,...Object.fromEntries(['copy','edit','metadata','browser'].map(effect=>[effect,current[effect]===true&&inherited[effect]===true]))}}};}
 const file=pnCheckpoint(host),input=await pnInput(host),refs={input_ref:structuredClone(input.entry_ref),notes_input_ref:structuredClone(host.notes_input_ref),scope_ref:structuredClone(host.scope_ref)};
 let checkpoint=fs.existsSync(file)?pnJson(pnRef(file),host):null;
 if(checkpoint){pnRequire(checkpoint.version===1&&checkpoint.call_id===host.call_id&&checkpoint.mode===host.mode&&pnEqual(checkpoint.parent_call_ref,host.parent_call_ref||null),'CHECKPOINT_CALL_MISMATCH');for(const [key,value]of Object.entries(refs))pnRequire(pnEqual(checkpoint[key],value),'CHECKPOINT_INPUT_CHANGED');pnRequire(['ITERATING','AWAITING_CONFIRMATION','CONFIRMED_READY','CANDIDATE_REVIEW','ACCEPTED_AWAITING_PARENT'].includes(checkpoint.stage),'CHECKPOINT_STAGE');}
 const save=stage=>{checkpoint={version:1,call_id:host.call_id,mode:host.mode,parent_call_ref:structuredClone(host.parent_call_ref||null),stage,...refs,confirmed_business_revision:input.confirmation?input.business_revision:null,...(checkpoint?.candidate_ref?{candidate_ref:checkpoint.candidate_ref}:{}),...(checkpoint?.accepted_ref?{accepted_ref:checkpoint.accepted_ref}:{}),...(checkpoint?.completion_receipt?{completion_receipt:checkpoint.completion_receipt}:{})};const tmp=file+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(checkpoint,null,2)+'\n',{flag:'wx'});fs.renameSync(tmp,file);return structuredClone(checkpoint);};
 if(!input.confirmation){pnRequire(!checkpoint?.candidate_ref,'CONFIRMATION_LOST');return {stage:save('AWAITING_CONFIRMATION').stage,candidate_ref:null,display_only:true};}
 if(checkpoint?.confirmed_business_revision)pnRequire(checkpoint.confirmed_business_revision===input.business_revision,'CONFIRMATION_STALE');
 if(request.action==='iterate'){pnRequire(!checkpoint?.candidate_ref,'CANDIDATE_ALREADY_PREPARED');return {checkpoint:save('ITERATING'),candidate_ref:null,display_only:true};}
 if(request.action==='intake')return {checkpoint:checkpoint?.candidate_ref?structuredClone(checkpoint):save('CONFIRMED_READY'),candidate_ref:checkpoint?.candidate_ref||null};
 if(request.action==='prepare'){
  if(checkpoint?.candidate_ref){const current=delivery.resolveCandidateSubject({...checkpoint.candidate_ref,delivery_root:host.delivery_root},host.current_context);return {stage:checkpoint.stage,candidate_ref:current.candidate_ref,independent_acceptance:'NOT_RUN'};}
  save('CONFIRMED_READY');let current=structuredClone(input.existing?.notes||input.data.current_notes);pnRequire(current&&request.proposed,'NOTES_REQUIRED');
  if(input.existing?.rebase){
   current.provenance.business_revision=input.business_revision;
   for(const item of current.annotations.filter(a=>a.anchor&&!a.tombstone)){
    const binding=input.data.rebindings?.find(r=>r.annotation_id===item.id);pnRequire(binding&&binding.anchor.base_revision===current.base_revision&&binding.anchor.requires_rebind===false,'REBIND_REQUIRED');
    current=pnResult(await notes.applyManualTransaction({document:current,action:'rebind',annotation_id:item.id,anchor:binding.anchor,context:binding.context},input.data.source_refs)).document;
    pnResult(await notes.validateGenerationScope({source:input.source,before:current,proposed:current,scope:null,bindings:{version:1,roots:[],targets:[]},behaviors:[],sources:input.data.source_refs,assisted_ids:[item.id],request_kind:'assist-only'},host.notes_caller_context));
   }
  }
  pnRequire(request.proposed.provenance.business_revision===input.business_revision,'CONFIRMATION_STALE');
  const generation={source:input.source,before:current,proposed:request.proposed,scope:input.data.scope,bindings:input.data.bindings,behaviors:input.data.behaviors,sources:input.data.source_refs,dispositions:input.data.dispositions||[],assisted_ids:input.data.assisted_ids||[],request_kind:input.data.request_kind||undefined};
  let merged;if(input.data.scope||generation.assisted_ids.length){pnResult(await notes.validateGenerationScope(generation,host.notes_caller_context));merged=pnResult(await notes.mergeNotes({...generation,previous:current,current},host.notes_caller_context));}else{pnRequire(pnEqual(current,request.proposed)&&(current.generation_scope===null||input.existing&&!input.existing.rebase),'MANUAL_ONLY_CHANGED');merged={merged:pnResult(notes.validateNotes(current,input.data.source_refs)),coverage:[],conflicts:[],superseded_suggestions:[]};}
  if(merged.merged.provenance.business_revision!==input.business_revision){
   merged.merged.provenance.business_revision=input.business_revision;if(merged.merged.notes_revision===current.notes_revision)merged.merged.notes_revision++;merged.merged.validation_status='unreviewed';
  } // guard:verified-business-provenance
  const preserving=!input.data.scope&&!generation.assisted_ids.length&&input.existing&&!input.existing.rebase;
  const built=preserving?pnResult(await notes.core.buildAnnotatedHtml(input.existing.bundle)):pnResult(await notes.buildAnnotatedHtml({source:input.source,notes:merged.merged,sources:input.data.source_refs,bindings:input.data.bindings,generation:{...generation,before:merged.merged}},host.notes_caller_context));
  const kind=built.html===pnRead(input.entry_ref,host).toString('utf8')?'adequate-copy':'enhanced-copy';
  const after=await pnInput(host);pnRequire(pnEqual({...after,confirmation:null},{...input,confirmation:null}),'INPUT_CHANGED');pnRequire(after.confirmation,'CONFIRMATION_LOST');
  const ready=input.parent?delivery.deriveFromAccepted({accepted_ref:host.exact_accepted_ref,delivery_root:host.delivery_root,attempt_id:host.attempt_id,processor_id:'prototype-notes',scope:host.base_input.scope,methods:host.base_input.methods,authority_ref:host.base_input.authority_ref},host.current_context):{bound:input.bound,attempt:delivery.prepareCopy(input.bound,{delivery_root:host.delivery_root,attempt_id:host.attempt_id,processor_id:'prototype-notes',kind},host.current_context)};
  const {bound,attempt}=ready;fs.writeFileSync(attempt.entry,built.html);
  pnRequire(Array.isArray(host.source_required)&&host.source_required.length&&Array.isArray(host.notes_required)&&host.notes_required.length&&host.notes_required.every(id=>/^NOTES:.+/.test(id)),'REQUIRED_DENOMINATOR');
  const required=[...new Set([...host.source_required,...(input.parent?.required_behavior_refs||[]),...host.notes_required])],mapping=required.map(behavior_id=>({behavior_id,annotation_ids:merged.coverage.filter(row=>row.behavior_id===behavior_id).flatMap(row=>row.annotation_ids),source_refs:[bound.source.locator]}));
  const data_ref=pnWrite(path.join(attempt.attempt_dir,'notes-input.json'),{...input.data,notes:merged.merged,input_artifact_ref:input.entry_ref,business_revision:input.business_revision,confirmation:input.confirmation,guideline_ref:input.guideline_ref,runtime_ref:input.runtime_ref,coverage:merged.coverage,conflicts:merged.conflicts,superseded_suggestions:merged.superseded_suggestions,rebase:input.existing?.rebase||null,delivery_acceptance:'NOT_RUN'});
  const manifest_ref=pnWrite(path.join(attempt.attempt_dir,'notes-manifest.json'),{schema_version:1,scope:bound.scope,input_data_ref:data_ref,runtime:input.runtime_ref,content_guideline:input.guideline_ref,required_behavior_refs:required,notes_instance_refs:host.notes_required,behavior_mapping:mapping});
  const spec=path.join(attempt.attempt_dir,'prototype-spec.md');fs.writeFileSync(spec,'# Current notes candidate\n'+JSON.stringify({final:pnRef(attempt.entry),mapping,input_data_ref:data_ref,independent_acceptance:'NOT_RUN'},null,2)+'\n',{flag:'wx'});
  const closure=bound.base.closure.map(item=>{const p=path.join(attempt.content_root,item.path);return {path:path.relative(host.delivery_root,p).split(path.sep).join('/'),sha256:pnRef(p).sha256,bytes:fs.statSync(p).size};}),operations=bound.base.closure.flatMap((item,i)=>item.sha256===closure[i].sha256?[]:[{path:item.path,before_sha256:item.sha256,after_sha256:closure[i].sha256}]);
  const patch={base_sha256:bound.base.sha256,operations,content_changed:operations.length>0},patch_ref=pnWrite(path.join(attempt.attempt_dir,'patch.json'),patch);
  const candidate=delivery.checkCandidate({...bound,attempt_id:host.attempt_id,processor_id:'prototype-notes',delivery_root:host.delivery_root,required_behavior_refs:required,notes_manifest_ref:manifest_ref,delivery:{id:host.attempt_id,kind,entry:path.relative(host.delivery_root,attempt.entry).split(path.sep).join('/'),sha256:pnRef(attempt.entry).sha256,closure,spec:pnRef(spec)},patch:{...patch_ref,...patch}},host.current_context);
  checkpoint.candidate_ref=structuredClone(candidate.candidate_ref);save('CANDIDATE_REVIEW');return {...candidate,checkpoint:structuredClone(checkpoint),content_review:{guideline_ref:input.guideline_ref,input_data_ref:data_ref},independent_acceptance:'NOT_RUN'};
 }
 pnRequire(checkpoint?.candidate_ref,'CANDIDATE_REQUIRED');const candidate=delivery.resolveCandidateSubject({...checkpoint.candidate_ref,delivery_root:host.delivery_root},host.current_context),manifest=pnJson(candidate.notes_manifest_ref,host),data=pnJson(manifest.input_data_ref,host);
 pnRequire(pnEqual(data.input_artifact_ref,input.entry_ref)&&data.business_revision===input.business_revision&&pnEqual(data.guideline_ref,input.guideline_ref)&&pnEqual(data.runtime_ref,input.runtime_ref),'CURRENT_FINAL_INPUT_CHANGED');
 const accepted_ref=request.accepted_ref||checkpoint.accepted_ref;pnRequire(accepted_ref,'EXACT_ACCEPTED_REQUIRED');if(checkpoint.accepted_ref)pnRequire(pnEqual(checkpoint.accepted_ref,accepted_ref),'ACCEPTED_REF_CHANGED');
 const required=[...new Set([...host.source_required,...(input.parent?.required_behavior_refs||[]),...host.notes_required])];pnRequire(pnEqual(required,candidate.required_behavior_refs),'REQUIRED_DENOMINATOR_CHANGED');
 const final=delivery.resolveFinal({...accepted_ref,delivery_root:host.delivery_root},host.current_context);pnRequire(final.processor_id==='prototype-notes'&&pnEqual(final.candidate_ref,checkpoint.candidate_ref),'FINAL_IDENTITY_MISMATCH');
 checkpoint.accepted_ref=structuredClone(final.accepted_ref);save('ACCEPTED_AWAITING_PARENT');
 if(host.mode==='internal')return {...final,notes_final_ref:final.accepted_ref,parent_completion:'CALLER_OWNS_SINGLE_COMPLETION'};
 pnRequire(request.action==='complete','COMPLETION_ACTION_REQUIRED');
 if(checkpoint.completion_receipt){pnRead(checkpoint.completion_receipt,host);return {...final,completion_receipt:checkpoint.completion_receipt,already_completed:true};}
 pnRequire(typeof host.completeOnce==='function','COMPLETION_OWNER_REQUIRED');const receipt=await host.completeOnce({call_id:host.call_id,mode:host.mode,exact_final_ref:structuredClone(final.accepted_ref),node_context:host.mode==='workflow'?host.node_context:null});pnRead(receipt,host);checkpoint.completion_receipt=structuredClone(receipt);save('ACCEPTED_AWAITING_PARENT');return {...final,completion_receipt:receipt};
}
```
<!-- PROTOTYPE_NOTES_CALLER:END -->

## 5. Caller 独立 PREACCEPT、seal 与当前最终消费

调用体返回 candidate_ref/精确 HTML/spec/notes-manifest，caller 按 `.claude/agents/quality-gate.md` 独立 MR-004 派发 PREACCEPT，
核 actual runtime/browser/source/content/原分母与原票；不要求未来 DONE handoff。raw/spec/receipt/parent仅 provenance，不失败回退 raw。
真实独立通过后 caller 用现有 delivery.sealAccepted，再以本次 exact accepted_ref 调用上述 return/complete。
所有最终消费均走 `.claude/skill-os/runtime/prototype-delivery.md` processor-aware facet 与当前 read/effects，旧票或其它 accepted_ref 不可替代。
Synthetic local integrity 报告只用于机器测试，不是业务或独立验收票。

## 6. 恢复并只完成本次一次

`notes-checkpoint.json` 在已授权且在 attempt/content 外的 call evidence 位置；固定 caller写入五个本地 stage 与 exact SHA refs，
不含权限凭证、不增 NODE/STATUS/handoff。ITERATING/AWAITING_CONFIRMATION 无有效 candidate；CONFIRMED_READY 才生成，
CANDIDATE_REVIEW 只接该candidate；ACCEPTED_AWAITING_PARENT 重验exact结果后返回/完成。恢复从宿主重新核权限、确认、输入与scope。
internal 只返回父 caller，父核同 call_id 原完成记录后完成一次；standalone 写自己普通 handoff/receipt，不重开历史 OD/motion DONE；
workflow只完成本次明确选择且已绑定的notes节点，不自动插 optional graph。`completeOnce` 是原caller已授权普通完成出口，
必须先核同 call_id 持久完成记录并原子写入一次；若进程在receipt与checkpoint之间终止，恢复返回已有receipt，不能重复交接。
只要原规则/当前版本/必要行为仍 FAIL，保留问题和原件，不能以工具字段合法关闭门禁。

<!-- FILE_END: prototype-notes/SKILL.md -->
