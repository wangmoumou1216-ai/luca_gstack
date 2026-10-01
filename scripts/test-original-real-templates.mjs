import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { sha256Bytes as hash } from './carrier-asset-profile.mjs';
import { createCarrierPacket } from './carrier-packet.mjs';
import { locateOriginalEditRanges, verifyOriginalEditedOutput } from './original-template-edits.mjs';
import { prepareOriginalCopyHandoff } from './original-copy-handoff.mjs';
import { loadCatalog, discoverCandidateHints, computeCatalogHash, computeDesignSourceRevision, validateAdaptationDraft } from './page-context.mjs';
const catalog=await loadCatalog();
for (const [pageId,queries] of [
  ['ai-quick-notes',['速记','AI速记','快速记录会议笔记','把录音转文字并查看会议纪要','在现场会议的录音工作区里增加说明']],
  ['shareagent',['ShareAgent','shareagent','share agent','在智能体对话里查看产出物预览','配置定时任务并查看任务日志','管理技能管理和模型配置']]
]) for (const query of queries) {
  const hints=discoverCandidateHints(catalog,query).candidate_hints;
  const hint=hints.find(h=>h.page_id===pageId);
  assert.ok(hint,`${pageId}: discover real use case ${query}`);
  assert.equal(hint.binding_mode,'original-preserving-v1');
  assert.equal(hint.source_hash,catalog.pages.find(p=>p.page_id===pageId).source_hash);
}
assert.equal(discoverCandidateHints(catalog,'双轨音频剪辑和试听').status,'NO_HINT','unrelated audio editing is not recording-template adoption');
console.log('PASS new originals discovered by Chinese/English names and natural-use aliases; unrelated request has no hint');
const manifest=JSON.parse(await readFile('.claude/skill-os/page-library/source-manifest.json','utf8'));
const targets={'settings-lead-pool':'crmmanage','customer-list-detail':'sub-tpl','crm-workbench-home':'workspaceCard','sales-record-list-detail':'tab-content-slot','ai-quick-notes':'source-shell','shareagent':'replica-app'};
const browser=await chromium.launch({headless:true});
try {
  for(const source of manifest.sources){
    const base=await readFile(source.copy_source);
    assert.ok(targets[source.page_id],`${source.page_id}: real original needs an explicit tested target`);
    const action={action_id:'C-01',action:'add',scope:[],locator:{kind:'attribute',name:'id',value:targets[source.page_id]}};
    const proof=await locateOriginalEditRanges(base,[action],{browser});
    const range=proof.targets[0],fragment='<span>Local original-preservation fixture</span>';
    // In-memory positive output only; neither original nor OD is modified.
    const html=base.toString(),output=Buffer.from(html.slice(0,range.closeStart)+fragment+html.slice(range.closeStart));
    const validation=await verifyOriginalEditedOutput({base,output,actions:[action],edits:[{action_id:'C-01',html:fragment}]},{browser});
    assert.equal(validation.status,'PASS');
    assert.equal(validation.original_scripts_styles_preserved,true);
    const packetBody=createCarrierPacket({schema_version:1,packet_kind:'design-generation',items:[{source_kind:'decision',id:'D-001',text:'Inert mechanical fixture: append one span in the identified original node; preserve every other original byte.'}],scopes:[]});
    const bundle=await prepareOriginalCopyHandoff({pageId:source.page_id,packetBody,target:{tool:'od',projectId:'local-original-proof'},handoffId:`local-${source.page_id}`,actions:[{...action,source_ids:['D-001'],confidence:'high',rationale:'This fixture explicitly names the unique existing original target; it does not test natural-language semantic matching.',alternatives:[]}]},{browser});
    assert.ok(bundle.files[0].bytes.equals(base));
    assert.equal(hash(await readFile(source.copy_source)),source.raw_sha256);
    console.log(`PASS real original ${source.page_id}: ${base.length} bytes preserved through package; scoped edit verified without rewriting CSS/script/template or executing source`);
    const index=JSON.parse(await readFile(`.claude/skill-os/page-library/original-index/${source.page_id}.json`,'utf8'));
    assert.equal(index.source_sha256,hash(base),'refinement location comes from the exact registered original version');
    const control=index.anchors.find(node=>node.unique_in_scope && ['button','input'].includes(node.tag) && node.label.trim());
    assert.ok(control,`${source.page_id}: an exact original control exists`);
    const refineAction={action_id:'UI-01',action:'refine',scope:control.scope,locator:control.locator};
    const {targets:[refineRange]}=await locateOriginalEditRanges(base,[refineAction],{browser});
    const original=html.slice(refineRange.start,refineRange.end),opening=html.slice(refineRange.start,refineRange.openEnd);
    const match=/\bclass\s*=\s*(["'])(.*?)\1/s.exec(opening);
    assert.ok(match || !/\bclass\s*=/.test(opening),'fixture preserves unambiguous source attribute spelling');
    // Preserve the original closing separator, including self-closing inputs.
    const refinedOpening=match ? opening.replace(match[0],match[0].slice(0,-1)+' local-ui-refinement-proof'+match[1]) : opening.replace(/([\t\n\f\r ]*\/?>)$/,' class="local-ui-refinement-proof"$1');
    const refined=refinedOpening+original.slice(opening.length);
    const refineOutput=Buffer.from(html.slice(0,refineRange.start)+refined+html.slice(refineRange.end));
    const refineValidation=await verifyOriginalEditedOutput({base,output:refineOutput,actions:[refineAction],edits:[{action_id:'UI-01',html:refined}]},{browser});
    assert.equal(refineValidation.profile,'original-ui-refinement-v1');
    assert.equal(refineValidation.business_dom_preserved,true);
    assert.equal(refineValidation.source_executed,false);
    const refinePacket=createCarrierPacket({schema_version:1,packet_kind:'design-generation',items:[{source_kind:'decision',id:'UI-001',text:'Inert mechanical fixture: add a visual class only to the exact existing original control; preserve all behavior, content and other bytes.'}],scopes:[]});
    const refineBundle=await prepareOriginalCopyHandoff({pageId:source.page_id,packetBody:refinePacket,target:{tool:'od',projectId:'local-original-proof'},handoffId:`refine-${source.page_id}`,actions:[{...refineAction,source_ids:['UI-001'],confidence:'high',rationale:'Exact existing original control from its source-bound index; this is a mechanical preservation fixture, not visual or semantic acceptance.',alternatives:[]}]},{browser});
    assert.equal(refineBundle.carrier_profile,'original-ui-refinement-v1');
    assert.ok(refineBundle.files[0].bytes.equals(base));
    console.log(`PASS real refinement ${source.page_id}: exact ${control.tag} source scope; business/hidden DOM, original scripts/styles and every non-target byte preserved, semantic acceptance remains pending`);
    const page=catalog.pages.find(page=>page.page_id===source.page_id);
    const sourceItems=[{id:'UI-001',text:'Fixture explicitly requests visual refinement of this exact indexed original control, preserving its content, behavior and all other bytes.',required_states:[page.states[0]]}];
    const draft={schema_version:1,mode:'adaptation_draft',source_revision_sha256:computeDesignSourceRevision(sourceItems),catalog_sha256:computeCatalogHash(catalog),page_id:page.page_id,source_hash:page.source_hash,decision:'ready',reason:'A fixture explicitly names one unique indexed original control and its catalog state; semantic behavior is independently pending.',reviewed_source_ids:['UI-001'],judgments:[{source_id:'UI-001',excerpt:sourceItems[0].text,state_id:page.states[0],action:'refine',location:{scope:control.scope,locator:control.locator,label:control.label},purpose_excerpt:page.intent,location_evidence:`Exact original source index ${source.page_id}: ${control.tag} label ${JSON.stringify(control.label)}; source hash ${index.source_sha256}.`,state_evidence:`Fixture scope is the unchanged original control in listed state ${page.states[0]}; native parsing confirms its location, while rendered state behavior remains independently pending.`,state_status:'supported',confidence:'high',alternatives:[]}]};
    const adaptation=await validateAdaptationDraft(catalog,draft,{sourceItems,browser});
    assert.equal(adaptation.status,'ADAPTATION_READY');
    assert.equal(adaptation.binding_allowed,false);
    assert.equal(adaptation.execution_allowed,false);
    assert.equal(adaptation.execution_path,'original_adapter');
    assert.equal(adaptation.semantic_verification,'model-reviewed-not-machine-proven');
    if(source.page_id==='ai-quick-notes') {
      const keep = index.anchors.find(node => node.unique_in_scope && ['button','input'].includes(node.tag) && node.label.trim() && JSON.stringify([node.scope,node.locator]) !== JSON.stringify([control.scope,control.locator]));
      assert.ok(keep,'a separate real original control supplies preservation evidence');
      const preserveSources=[...sourceItems,{id:'KEEP-001',text:'Keep this separate existing original control unchanged in the same observed state.',required_states:[page.states[0]]}];
      const preservedDraft=structuredClone(draft);
      preservedDraft.source_revision_sha256=computeDesignSourceRevision(preserveSources);
      preservedDraft.reviewed_source_ids.push('KEEP-001');
      preservedDraft.judgments.push({...structuredClone(draft.judgments[0]),source_id:'KEEP-001',excerpt:preserveSources[1].text,action:'preserve',location:{scope:keep.scope,locator:keep.locator,label:keep.label}});
      const preservation=await validateAdaptationDraft(catalog,preservedDraft,{sourceItems:preserveSources,browser});
      assert.equal(preservation.status,'ADAPTATION_READY','refine plus preserve must validate all real source locations without authorizing an unchanged derivative');
      assert.equal(preservation.binding_allowed,false);
      assert.equal(preservation.execution_allowed,false);

      const duplicateSource=structuredClone(preservedDraft);
      const sharedSources=[...preserveSources,{id:'UI-002',text:'A second source fact describes the same visual refinement and unchanged behavior at the original control.',required_states:[page.states[0]]}];
      duplicateSource.source_revision_sha256=computeDesignSourceRevision(sharedSources);
      duplicateSource.reviewed_source_ids.push('UI-002');
      duplicateSource.judgments.push({...structuredClone(draft.judgments[0]),source_id:'UI-002',excerpt:sharedSources[2].text});
      assert.equal((await validateAdaptationDraft(catalog,duplicateSource,{sourceItems:sharedSources,browser})).status,'ADAPTATION_READY','several facts for one exact action are deduplicated before joint range checks');
      const parent=index.anchors.find(node=>node.unique_in_scope && node.locator.kind==='attribute' && node.locator.name==='id' && node.locator.value==='source-shell');
      assert.ok(parent,'the original source-shell parent has exact index evidence');
      const overlapping=structuredClone(preservedDraft);
      overlapping.judgments[0].location={scope:parent.scope,locator:parent.locator,label:parent.label};
      overlapping.judgments[1].location={scope:control.scope,locator:control.locator,label:control.label};
      await assert.rejects(validateAdaptationDraft(catalog,overlapping,{sourceItems:preserveSources,browser}),{code:'ORIGINAL_ACTION_OVERLAP'},'individually valid nested refine/preserve ranges cannot report ready');
      overlapping.decision='needs_context';
      const conflict=await validateAdaptationDraft(catalog,overlapping,{sourceItems:preserveSources,browser});
      assert.equal(conflict.status,'NEEDS_CONTEXT');
      assert.equal(conflict.execution_allowed,false);
    }
    if(source.page_id===manifest.sources[0].page_id){
      const staleLabel=structuredClone(draft);staleLabel.judgments[0].location.label+=' stale';
      await assert.rejects(validateAdaptationDraft(catalog,staleLabel,{sourceItems,browser}),{code:'MATCH_TARGET_EVIDENCE'});
      const staleLocator=structuredClone(draft);staleLocator.judgments[0].location.locator={kind:'attribute',name:'id',value:'nonexistent-fixture-control'};
      await assert.rejects(validateAdaptationDraft(catalog,staleLocator,{sourceItems,browser}),{code:'ORIGINAL_LOCATION_UNRESOLVED'});
    }
    if (control.tag === 'input') {
      const invalidVoid = structuredClone(draft); invalidVoid.judgments[0].action = 'modify';
      await assert.rejects(validateAdaptationDraft(catalog, invalidVoid, {sourceItems,browser}), {code:'ORIGINAL_ACTION_UNSUPPORTED'}, 'early draft must not report ready for void-input modify rejected by the edit adapter');
      invalidVoid.decision='needs_context';
      assert.equal((await validateAdaptationDraft(catalog, invalidVoid, {sourceItems,browser})).status, 'NEEDS_CONTEXT');
    }
    console.log(`PASS real adaptation draft ${source.page_id}: exact indexed scope and actual source inventory validated; binding/execution remain false and semantic verification is not machine-proven`);
  }
}finally{await browser.close();}
