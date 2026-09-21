import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { sha256Bytes as hash } from './carrier-asset-profile.mjs';
import { createCarrierPacket } from './carrier-packet.mjs';
import { locateOriginalEditRanges, verifyOriginalEditedOutput } from './original-template-edits.mjs';
import { prepareOriginalCopyHandoff } from './original-copy-handoff.mjs';
const manifest=JSON.parse(await readFile('.claude/skill-os/page-library/source-manifest.json','utf8'));
const targets={'settings-lead-pool':'crmmanage','customer-list-detail':'sub-tpl','crm-workbench-home':'workspaceCard','sales-record-list-detail':'tab-content-slot'};
const browser=await chromium.launch({headless:true});
try {
  for(const source of manifest.sources){
    const base=await readFile(source.copy_source);
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
  }
}finally{await browser.close();}
