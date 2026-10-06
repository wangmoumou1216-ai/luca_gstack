import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { canonicalJson, canonicalManifestHash, fileRecord, sha256Bytes as hash } from './carrier-asset-profile.mjs';
import { createCarrierPacket } from './carrier-packet.mjs';
import { prepareOriginalCopyHandoff, confirmOriginalCopyHandoff, authorizeOriginalOperation, verifyOriginalStage, reportOriginalGeneration, recoverOriginalOutput } from './original-copy-handoff.mjs';
import { inspectOriginalResources } from './original-template-resources.mjs';

const root = await mkdtemp(join(tmpdir(), 'original-handoff-'));
const ref = '.claude/skill-os/page-library/sources/originals/fixture.html';
await mkdir(join(root, '.claude/skill-os/page-library/sources/originals'), { recursive: true });
const base = Buffer.from('<!doctype html><html><head><style>body{color:orange}</style></head><body><nav id="nav">Keep</nav><section id="target">Original</section><script>window.original=true;</script><template id="detail"><p>Hidden original state</p></template></body></html>');
await writeFile(join(root,ref),base);
await writeFile(join(root,'.claude/skill-os/page-library/source-manifest.json'),JSON.stringify({profile:'original-template-copy-v1',policy:{byte_identical_copy_required:true},sources:[{page_id:'fixture',raw_bytes:base.length,raw_sha256:hash(base),copy_source:ref}]}));
const packetBody = createCarrierPacket({schema_version:1,packet_kind:'design-generation',items:[{source_kind:'decision',id:'D-001',text:'Add a choice inside the original target.'},{source_kind:'constraint',id:'KEEP-001',text:'Preserve original navigation.'}],scopes:[]});
const common={scope:[],confidence:'high',rationale:'Exact original fixture target; unique node, requested operation and no competing location.',alternatives:[]};
const actions=[{...common,action_id:'C-01',action:'add',locator:{kind:'attribute',name:'id',value:'target'},source_ids:['D-001']},{...common,action_id:'C-02',action:'preserve',locator:{kind:'attribute',name:'id',value:'nav'},source_ids:['KEEP-001']}];
const args={pageId:'fixture',packetBody,target:{tool:'od',projectId:'original-fixture'},handoffId:'original-fixture-1',actions};
const browser=await chromium.launch({headless:true});
try {
  const rejectsAssets = html => assert.rejects(inspectOriginalResources(Buffer.from(html),{browser}),{code:'ORIGINAL_ASSETS_REQUIRED'});
  for (const script of ["const action='import-menu'; function importConfirm() {}", "const action='finish-import-skill';"]) {
    assert.equal((await inspectOriginalResources(Buffer.from(`<html><body><script>${script}</script></body></html>`),{browser})).unresolved.length,0,'import UI labels are not dynamic module imports');
  }
  const duplicatedEmbedded = '<style>.x{background:url("data:image/png;base64,AA==");background:url("data:image/png;base64,AA==")}</style>';
  assert.equal((await inspectOriginalResources(Buffer.from(`<html><head>${duplicatedEmbedded}</head><body></body></html>`),{browser})).unresolved.length,0,'CSSOM merging embedded declarations cannot make a complete original unavailable');
  const embeddedSet = 'image-set(url("data:image/png;base64,AA==") 1x, url("data:image/png;base64,AQ==") 2x)';
  assert.equal((await inspectOriginalResources(Buffer.from(`<html><head><style>.x{background:-webkit-${embeddedSet};background:${embeddedSet}}</style></head><body></body></html>`),{browser})).unresolved.length,0,'merged vendor-prefixed embedded image-set candidates stay closed');
  await rejectsAssets(`<html><head><style>.x{background:image-set("assets/dropped.png" 1x);background:${embeddedSet}}</style></head><body></body></html>`);
  await rejectsAssets('<html><head><style>.x{background:url("assets/dropped.png");background:url("data:image/png;base64,AA==")}</style></head><body></body></html>');
  await rejectsAssets('<html><body><script>import // line comment\n /* block comment */ ("./dependency.js")</script></body></html>');
  for (const newline of ['\n', '\r\n', '\r', '\u2028', '\u2029']) {
    for (const gap of [`// line comment${newline}`, `<!-- HTML comment${newline}`, `${newline}--> HTML comment${newline}`]) {
      const code = `import${gap}("https://example.invalid/deferred.mjs");`;
      new Function(code); // Parse only: valid dynamic-import syntax must still be rejected by the asset audit.
      await rejectsAssets(`<html><body><script>${code}</script></body></html>`);
    }
  }
  for (const dependency of ['<link rel="stylesheet" href="assets/theme.css">','<link rel="preload" as="image" imagesrcset="assets/a.png 1x, assets/b.png 2x">','<link rel="preload" as="image" href="data:image/png;base64,AA==" imagesrcset="assets/a.png 1x">','<script src="assets/app.js"></script>','<img src="assets/logo.png">','<img lowsrc="assets/legacy-low.png">','<img dynsrc="assets/legacy-dynamic.png">','<table background="assets/legacy.png"><tr><td>x</td></tr></table>','<picture><source srcset="assets/a.png 1x, assets/b.png 2x"><img src="data:image/png;base64,AA=="></picture>']) await rejectsAssets(`<html><head></head><body>${dependency}</body></html>`);
  await rejectsAssets('<html><head></head><body background="assets/legacy-body.png"></body></html>');
  for (const refresh of ['<meta http-equiv="re&#102;resh" content="0;url=https://example.invalid/escape">','<meta http-equiv=" refresh " content="0;url=https://example.invalid/escape">','<meta http-equiv="refresh" content="0;https://example.invalid/escape">']) await rejectsAssets(`<html><head>${refresh}</head><body></body></html>`);
  await rejectsAssets('<html><head></head><body><img src="&#160;data:image/png;base64,AA=="></body></html>');
  for (const svg of ['<svg><feImage href="assets/filter.png"></feImage></svg>','<svg><script href="assets/app.js"></script></svg>','<svg><script xlink:href="assets/app.js"></script></svg>','<svg><rect fill="url(assets/paint.svg#paint)"></rect></svg>',String.raw`<svg><rect cursor="u\72l(assets/cursor.cur), auto"></rect></svg>`]) await rejectsAssets(`<html><body>${svg}</body></html>`);
  for (const value of ['url(&#160;data:image/svg+xml,abc)','url(&#160;#paint)']) await rejectsAssets(`<html><body><svg><rect fill="${value}"></rect></svg></body></html>`);
  for (const moduleGraph of ['<script type="module">import "./dependency.js";</script>','<script>import("./dependency.js")</script>','<script>import /* comment */ ("./dependency.js")</script>','<script src="data:text/javascript,import(%22./dependency.js%22)"></script>','<script type="module" src="data:text/javascript,import%20%22./dependency.js%22"></script>','<script type="module" src=" data:text/javascript,import%20%22./dependency.js%22"></script>','<script type="importmap">{"imports":{"dependency":"./dependency.js"}}</script>','<svg><script src="#ignored">import("./dependency.js")</script></svg>','<svg><script href="data:text/javascript,import(%22./dependency.js%22)"></script></svg>','<svg><script xlink:href="data:text/javascript,import(%22./dependency.js%22)"></script></svg>','<button onclick="import(&quot;./dependency.js&quot;)">Load</button>']) await rejectsAssets(`<html><head>${moduleGraph}</head><body></body></html>`);
  for (const css of [String.raw`<style>.x{background:u\72l("assets/escaped.png")}</style>`,String.raw`<style>@\69mport "assets/escaped.css";</style>`,String.raw`<style>@i\6dport "assets/escaped-mid.css";</style>`,'<style>.x{background-image:image-set("assets/a.png" 1x)}</style>','<style>.x{background-image:image-set(url("data:image/png;base64,AA==") 1x, "assets/missed.png" 2x)}</style>','<style>@counter-style external-symbol { system: cyclic; symbols: url("assets/symbol.png") }</style>','<style>@counter-style external-set { system: cyclic; symbols: image-set("assets/symbol.png" 1x) }</style>','<style>@property --picture { syntax: "<image>"; inherits: false; initial-value: url("https://example.invalid/missing.png") } #target { background-image: var(--picture) }</style>']) await rejectsAssets(`<html><head>${css}</head><body></body></html>`);
  const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'">';
  await rejectsAssets('<html><head><meta http-equiv=" content-security-policy " content="default-src \'none\'"></head><body><img src="https://example.invalid/not-really-blocked.png"></body></html>');
  await rejectsAssets('<html><head><meta http-equiv="content-security-policy" content="default-src&#160;\'none\'"></head><body><img src="https://example.invalid/nbsp-not-blocked.png"></body></html>');
  for (const early of ['<script src="assets/early.js"></script>','<link rel="stylesheet" href="assets/early.css">']) await rejectsAssets(`<html><head>${early}${csp}</head><body></body></html>`);
  await rejectsAssets(`<html><head><noscript>${csp}</noscript><script src="assets/not-blocked.js"></script></head><body></body></html>`);
  const cspBlocked = await inspectOriginalResources(Buffer.from(`<html><head>${csp}<script src="assets/blocked.js"></script><link rel="stylesheet" href="assets/blocked.css"></head><body></body></html>`),{browser});
  assert.equal(cspBlocked.preserved_but_source_csp_blocked,2,'only a preceding source CSP can make later resources unreachable');
  const closed = await inspectOriginalResources(Buffer.from('<html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'; font-src data:"><style>x{background:url(missing.png)}</style></head><body>Original CSP blocks this already-unreachable URL</body></html>'),{browser});
  assert.equal(closed.preserved_but_source_csp_blocked,1);
  const bundle=await prepareOriginalCopyHandoff(args,{root,browser});
  assert.ok(bundle.files[0].bytes.equals(base),'full original scripts/styles/templates are the transported input');
  const manifest=JSON.parse(bundle.files.at(-1).bytes);
  const adoption={actor:'user',evidence:'fixture-only-confirmation',confirmed_at:'2026-09-20T00:00:00Z',handoff_bundle_hash:bundle.handoff_bundle_hash,original_sha256:hash(base),tac_sha256:manifest.tac_sha256};
  const confirmed=confirmOriginalCopyHandoff(bundle,adoption);
  const {confirmation:_removedConfirmation,...unconfirmed}=confirmed;
  assert.throws(()=>confirmOriginalCopyHandoff(bundle,{...adoption,original_sha256:'0'.repeat(64)}),{code:'ORIGINAL_ADOPTION_REQUIRED'});
  const capabilityReceipt={version:1,kind:'od-handoff-capability',status:'PASS',runtime:'codex',receipt_ref:'fixture-only',tool:'od',project_id:args.target.projectId,handoff_id:bundle.handoff_id,namespace:bundle.namespace,handoff_bundle_hash:bundle.handoff_bundle_hash,output_profile:'single',operations:['stage','run','recover']};
  const grant={tool:'od',projectId:args.target.projectId,handoff_id:bundle.handoff_id,namespace:bundle.namespace,handoff_bundle_hash:bundle.handoff_bundle_hash,output_profile:'single',messageRef:'fixture-only',capabilityReceipt,inertStorageReceipt:{version:1,kind:'inert-storage',template_sha256:hash(base),receipt_ref:'fixture-only-inert',handoff_id:bundle.handoff_id}};
  const runtime={runtime:'codex'};
  assert.throws(()=>authorizeOriginalOperation(unconfirmed,{...grant,stage:true},'stage',runtime),{code:'ORIGINAL_ADOPTION_STALE'});
  for(const confirmation of [{...confirmed.confirmation,actor:'agent'},{...confirmed.confirmation,evidence:''},{...confirmed.confirmation,confirmed_at:'not-a-date'},{...confirmed.confirmation,tac_sha256:'0'.repeat(64)}]) assert.throws(()=>authorizeOriginalOperation({...confirmed,confirmation},{...grant,stage:true},'stage',runtime),{code:'ORIGINAL_ADOPTION_STALE'});
  assert.throws(()=>authorizeOriginalOperation(confirmed,{...grant,stage:true,inertStorageReceipt:undefined},'stage',runtime),{code:'INERT_STORAGE_RECEIPT_REQUIRED'});
  assert.deepEqual(authorizeOriginalOperation(confirmed,{...grant,stage:true},'stage',runtime).scope,['stage']);
  const files=confirmed.files.map(f=>({path:`${bundle.namespace}/${f.path}`,bytes:f.bytes}));
  const prior=[{path:'existing.txt',bytes:Buffer.from('untouched')}];
  const staged=verifyOriginalStage(confirmed,{tool:'od',projectId:args.target.projectId,namespace:bundle.namespace,readRef:'fixture readback',files,pre_inventory:prior,post_inventory:[...prior,...files]});
  assert.throws(()=>authorizeOriginalOperation(confirmed,{...grant,stage:true},'run',{...runtime,staged}),{code:'SCOPED_AUTHORIZATION_REQUIRED'});
  const run=authorizeOriginalOperation(confirmed,{...grant,run:true,prompt_hash:hash(Buffer.from('prompt'))},'run',{...runtime,staged});
  assert.throws(()=>authorizeOriginalOperation(confirmed,{...grant,recover:true},'recover',{...runtime,staged}),{code:'ORIGINAL_STAGE_REQUIRED'},'an old plain STAGED receipt cannot authorize recovery after a headless run was attempted');
  const recover=authorizeOriginalOperation(confirmed,{...grant,recover:true},'recover',{...runtime,staged:run});
  assert.throws(()=>reportOriginalGeneration(confirmed,staged,{messageRef:'fixture desktop generation report'}),{code:'ORIGINAL_DESKTOP_UNSUPPORTED'});
  const staleDesktop={...staged,status:'USER_GENERATION_REPORTED',generation_report:{messageRef:'saved before canceled run'}};
  assert.throws(()=>authorizeOriginalOperation(confirmed,{...grant,recover:true},'recover',{...runtime,staged:staleDesktop}),{code:'ORIGINAL_STAGE_REQUIRED'});
  const fragment='<select aria-label="Choice"><option>A</option><option>B</option></select>';
  const output=Buffer.from(base.toString().replace('>Original</section>',`>Original${fragment}</section>`));
  const extra=[{path:`${bundle.namespace}/output/index.html`,bytes:output},{path:`${bundle.namespace}/output/implementation-manifest.json`,bytes:Buffer.from(canonicalJson({schema_version:1,edits:[{action_id:'C-01',html:fragment}]}))}];
  const readback={tool:'od',projectId:args.target.projectId,namespace:bundle.namespace,readRef:'fixture actual bytes',files:[...files,...extra],post_inventory:[...prior,...files,...extra],run:{run_id:'fixture-run',handoff_id:bundle.handoff_id,prompt_hash:run.prompt_hash,status:'succeeded'}};
  const result=await recoverOriginalOutput(confirmed,run,readback,recover,{browser});
  assert.equal(result.status,'RECOVERED');assert.equal(result.semantic_acceptance,'PENDING_INDEPENDENT_REVIEW');
  for (const confirmation of [undefined,null,false]) {
    const without=confirmation===undefined?unconfirmed:{...confirmed,confirmation};
    await assert.rejects(recoverOriginalOutput(without,run,readback,recover,{browser}),{code:'ORIGINAL_ADOPTION_STALE'});
  }
  const {run: _headlessRun, ...desktopReadback}=readback;
  await assert.rejects(recoverOriginalOutput(confirmed,staleDesktop,desktopReadback,recover,{browser}),{code:'ORIGINAL_RECOVER_AUTHORITY'});
  await assert.rejects(recoverOriginalOutput(confirmed,run,{...readback,run:{...readback.run,status:'canceled'}},recover,{browser}),{code:'ORIGINAL_RUN_NOT_SUCCEEDED'});
  await assert.rejects(recoverOriginalOutput(confirmed,staged,{...desktopReadback},recover,{browser}),{code:'ORIGINAL_RECOVER_AUTHORITY'},'omitting run evidence cannot downgrade a run attempt to plain output observation');
  await assert.rejects(recoverOriginalOutput(confirmed,run,{...readback,post_inventory:[...prior,...files]},recover,{browser}),{code:'READBACK_INVENTORY_MISMATCH'});
  const changed={...confirmed,target:{...confirmed.target,projectId:'wrong'}};
  assert.throws(()=>verifyOriginalStage(changed,{}),{code:'ORIGINAL_BUNDLE_CHANGED'});
  await assert.rejects(prepareOriginalCopyHandoff({...args,actions:[{...actions[0],confidence:'uncertain'},actions[1]]},{root,browser}),{code:'ORIGINAL_NEEDS_CONTEXT'});
  await assert.rejects(prepareOriginalCopyHandoff({...args,actions:[{...actions[0],source_ids:['FAKE']},actions[1]]},{root,browser}),{code:'ORIGINAL_FACT_BINDING'});
  await assert.rejects(prepareOriginalCopyHandoff({...args,actions:[actions[0]]},{root,browser}),{code:'ORIGINAL_FACT_COVERAGE'});
  const prototypeEvidence = [{ path:'prototype.html', media_type:'text/html; charset=utf-8', purpose:'interaction-reference', source_ids:['D-001'], bytes:Buffer.from('<main><section>Prototype target</section><script>throw new Error("must never execute")</script></main>') }];
  const refineArgs = {...args,handoffId:'original-refinement-1',actions:[{...actions[0],action:'refine'},actions[1]],prototypeEvidence};
  const refineBundle = await prepareOriginalCopyHandoff(refineArgs,{root,browser});
  assert.equal(refineBundle.carrier_profile,'original-ui-refinement-v1');
  const refineManifest=JSON.parse(refineBundle.files.at(-1).bytes);
  assert.equal(refineManifest.prototype_evidence.length,1);
  assert.ok(refineBundle.files.find(f=>f.path==='evidence/prototype/prototype.html').bytes.equals(prototypeEvidence[0].bytes));
  const evidenceIndex=JSON.parse(refineBundle.files.find(f=>f.path==='control/prototype-evidence.json').bytes);
  assert.equal(evidenceIndex.usage,'inert-evidence-only');
  assert.equal(evidenceIndex.source_index_validation,'frozen-existing-ids');
  const refineAdoption={...adoption,handoff_bundle_hash:refineBundle.handoff_bundle_hash,tac_sha256:refineManifest.tac_sha256};
  const refineConfirmed=confirmOriginalCopyHandoff(refineBundle,refineAdoption);
  // Rehash every byte/record so these failures exercise closed schemas rather
  // than merely tripping an unrelated stale-hash check.
  const recanonicalize=(bundle,{manifestChange=()=>{},contractChange}={})=>{
    const files=bundle.files.map(f=>({...f,bytes:Buffer.from(f.bytes)}));
    const manifest=JSON.parse(files.at(-1).bytes);
    if(contractChange){const item=files.find(f=>f.path==='control/original-adaptation.json');const contract=JSON.parse(item.bytes);contractChange(contract);item.bytes=Buffer.from(canonicalJson(contract));item.sha256=hash(item.bytes);manifest.tac_sha256=hash(item.bytes);}
    const records=files.slice(0,-1).map(({bytes,...rest})=>({...rest,bytes:bytes.length}));
    manifest.immutable_files=records;manifestChange(manifest);manifest.handoff_bundle_hash=canonicalManifestHash(manifest,records);
    const body=Buffer.from(canonicalJson(manifest));files[files.length-1]={...fileRecord('control/handoff-manifest.json','application/json',body),bytes:body};
    return {...bundle,files,handoff_bundle_hash:manifest.handoff_bundle_hash,confirmation:{...bundle.confirmation,handoff_bundle_hash:manifest.handoff_bundle_hash,tac_sha256:manifest.tac_sha256}};
  };
  for(const manifestChange of [m=>{m.unrecognized=true;},m=>{m.prototype_evidence=[];},m=>{m.output_profile='multi';}])assert.throws(()=>verifyOriginalStage(recanonicalize(refineConfirmed,{manifestChange}),{}),{code:'ORIGINAL_BUNDLE_CHANGED'});
  for(const contractChange of [c=>{c.output.unrecognized=true;},c=>{c.actions[1].action='modify';},c=>{c.unrecognized=true;}])assert.throws(()=>verifyOriginalStage(recanonicalize(refineConfirmed,{contractChange}),{}),{code:'ORIGINAL_BUNDLE_CHANGED'});
  const refineCapability={...capabilityReceipt,handoff_id:refineBundle.handoff_id,namespace:refineBundle.namespace,handoff_bundle_hash:refineBundle.handoff_bundle_hash};
  const refineGrant={...grant,handoff_id:refineBundle.handoff_id,namespace:refineBundle.namespace,handoff_bundle_hash:refineBundle.handoff_bundle_hash,capabilityReceipt:refineCapability,inertStorageReceipt:{...grant.inertStorageReceipt,handoff_id:refineBundle.handoff_id}};
  const refineFiles=refineBundle.files.map(f=>({path:`${refineBundle.namespace}/${f.path}`,bytes:f.bytes}));
  const refineStaged=verifyOriginalStage(refineConfirmed,{tool:'od',projectId:args.target.projectId,namespace:refineBundle.namespace,readRef:'fixture refinement byte readback',files:refineFiles,pre_inventory:prior,post_inventory:[...prior,...refineFiles]});
  const refineRun=authorizeOriginalOperation(refineConfirmed,{...refineGrant,run:true,prompt_hash:hash(Buffer.from('refine prompt'))},'run',{...runtime,staged:refineStaged});
  const refineRecover=authorizeOriginalOperation(refineConfirmed,{...refineGrant,recover:true},'recover',{...runtime,staged:refineRun});
  const refineOuter='<section id="target" class="polished" style="padding:16px">Original</section>';
  const refineOutput=Buffer.from(base.toString().replace('<section id="target">Original</section>',refineOuter));
  const refineExtra=[{path:`${refineBundle.namespace}/output/index.html`,bytes:refineOutput},{path:`${refineBundle.namespace}/output/implementation-manifest.json`,bytes:Buffer.from(canonicalJson({schema_version:1,edits:[{action_id:'C-01',html:refineOuter}]}))}];
  const refineReadback={tool:'od',projectId:args.target.projectId,namespace:refineBundle.namespace,readRef:'fixture refinement actual output',files:[...refineFiles,...refineExtra],post_inventory:[...prior,...refineFiles,...refineExtra],run:{run_id:'fixture-refine-run',handoff_id:refineBundle.handoff_id,prompt_hash:refineRun.prompt_hash,status:'succeeded'}};
  const refined=await recoverOriginalOutput(refineConfirmed,refineRun,refineReadback,refineRecover,{browser});
  assert.equal(refined.mechanical_validation.business_dom_preserved,true);
  assert.equal(refined.semantic_acceptance,'PENDING_INDEPENDENT_REVIEW');
  await assert.rejects(prepareOriginalCopyHandoff({...refineArgs,prototypeEvidence:[{...prototypeEvidence[0],source_ids:['NONEXISTENT']}]},{root,browser}),{code:'PROTOTYPE_SOURCE_IDS_INVALID'});
  await assert.rejects(prepareOriginalCopyHandoff({...refineArgs,actions:[{...actions[0],action:'refine'},{...actions[1],action:'modify'}]},{root,browser}),{code:'ORIGINAL_REFINEMENT_PROFILE'});
  const tamperedEvidence={...refineConfirmed,files:refineConfirmed.files.map(f=>f.path==='evidence/prototype/prototype.html'?{...f,bytes:Buffer.from('changed')}:{...f})};
  assert.throws(()=>verifyOriginalStage(tamperedEvidence,{}),{code:'ORIGINAL_BUNDLE_CHANGED'});
  const missingEvidence=refineFiles.filter(f=>!f.path.endsWith('/evidence/prototype/prototype.html'));
  assert.throws(()=>verifyOriginalStage(refineConfirmed,{tool:'od',projectId:args.target.projectId,namespace:refineBundle.namespace,readRef:'fixture missing evidence',files:missingEvidence,pre_inventory:prior,post_inventory:[...prior,...missingEvidence]}),{code:'READBACK_EXTRA_FILE'});
  assert.ok((await readFile(join(root,ref))).equals(base));
  console.log('PASS: original functional and UI-only contracts preserve legacy authorization; actual prototype bytes and closed evidence metadata travel in immutable scope; forged IDs, evidence tampering/omission, mixed profiles, stale authority and canceled runs rejected');
}finally{await browser.close();}
