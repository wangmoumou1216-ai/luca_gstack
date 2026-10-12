import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonicalJson,sha256Bytes as hash } from './carrier-asset-profile.mjs';
import { createCarrierPacket } from './carrier-packet.mjs';
import { buildClaudeDesignHandoff } from './claude-design-handoff.mjs';
import { createClaudeDesignManualBinding,recoverClaudeDesignDownload,verifyClaudeDesignRecovery } from './claude-design-recover.mjs';
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'cd-manual-fixture-')));let n=0,passes=0;
const write=(name,data)=>{const p=path.join(root,name);fs.writeFileSync(p,data);return {path:p,sha256:hash(Buffer.from(data))};};
const packet=write('packet.md',createCarrierPacket({schema_version:1,packet_kind:'design-generation',items:[{id:'R-1',source_kind:'requirement',text:'Keep the exact task.'}],scopes:[]}));
const witnessFile=write('fixture-native-selection.json','SIMULATED only: fixture selection, scope, transport and CD system. actor=user text grants no authority.');
const selectionRef={...witnessFile,excerpt:'SIMULATED only: fixture selection'};
const scopeRef={...witnessFile,excerpt:'scope, transport and CD system'};
const auth={authenticateSelection:s=>s.selectionRef.path===selectionRef.path&&s.selectionRef.sha256===selectionRef.sha256};
const boundAuth={authenticateAdoption:()=>true,authenticateTransport:()=>true,authenticateDesignSystem:()=>true}; // Fixture only, never native human evidence.
const designSystem={tool:'claude-design',choice:'current',sourceRef:'fixture:system',configurationRef:'fixture:current'};
const build=()=>buildClaudeDesignHandoff({packet,handoffId:'H-1',displayName:'Fixture',directory:path.join(root,'handoff-'+(++n)),scope:{kind:'new-design',sourceIds:['R-1'],workspaceAction:'reuse-empty'},scopeRef,authorizationSourceRef:scopeRef,designSystem,designSystemRef:scopeRef},boundAuth);
const handoff=build(),manifestRef={path:handoff.manifestPath,sha256:handoff.manifestSha256};
const downloadRef=write('download.html','<!doctype html><html><body><script>globalThis.__cdManualExecuted=true</script>Actual output 中文</body></html>');
const request=(extra={})=>({requestId:'recover-1',manifestRef,handoffId:'H-1',downloadRef,selectionRef,directory:path.join(root,'recovery-'+(++n)),...extra});
const test=(name,fn)=>{fn();passes++;console.log('PASS '+name);};
test('native boundary required; actor=user or readable source does not authorize import',()=>{
 assert.throws(()=>recoverClaudeDesignDownload(request()),{code:'CD_MANUAL_SELECTION_REQUIRED'});
 assert.throws(()=>recoverClaudeDesignDownload(request(),{authenticateSelection:()=>false}),{code:'CD_MANUAL_SELECTION_REQUIRED'});
 assert.throws(()=>recoverClaudeDesignDownload(request({selectionRef:{...selectionRef,excerpt:'missing'}}),auth),{code:'CD_MANUAL_SELECTION_REFERENCE'});
});
let good,chosen;
test('exact manual file preserves original and produces typed immutable local receipt, never executes',()=>{
 chosen=request();good=recoverClaudeDesignDownload(chosen,auth);assert.equal(good.provenance,'manual-download');assert.equal(good.receipt.remoteRevisionVerified,false);assert.equal(good.receipt.artifact.assurance,'user-attested');assert.equal(good.receipt.hostStageVerified,false);assert.equal(good.receipt.revision,downloadRef.sha256);assert.equal(good.sha256,downloadRef.sha256);assert.equal(good.designComplete,false);assert.equal(globalThis.__cdManualExecuted,undefined);assert.equal(hash(fs.readFileSync(downloadRef.path)),downloadRef.sha256);assert.equal(fs.statSync(good.entry).mode&0o777,0o400);
});
test('same request reuses exact receipt; another file or request cannot masquerade as same recovery',()=>{
 assert.deepEqual(recoverClaudeDesignDownload(chosen,auth).receiptRef,good.receiptRef);
 const other=write('other.html','<!doctype html><html><body>other</body></html>');assert.throws(()=>recoverClaudeDesignDownload({...chosen,downloadRef:other},auth),{code:'CD_MANUAL_RECOVERY_CONFLICT'});
 assert.throws(()=>recoverClaudeDesignDownload({...chosen,requestId:'different'},auth),{code:'CD_MANUAL_RECOVERY_CONFLICT'});
});
test('verification rereads all refs, enforces optional current read scope, and supplies no authority',()=>{
 const verified=verifyClaudeDesignRecovery(good.receiptRef);assert.equal(verified.selectionAuthenticity,'NOT_VERIFIED');assert.equal(verified.authority,'NOT_PROVIDED');assert.ok(verified.readRefs.some(r=>r.path===packet.path));assert.ok(verified.readRefs.some(r=>r.path===selectionRef.path));assert.ok(verified.readRefs.some(r=>r.path===downloadRef.path));
 assert.throws(()=>verifyClaudeDesignRecovery(good.receiptRef,{authorizeRead:r=>r.path!==packet.path}),{code:'CD_MANUAL_READ_SCOPE'});
});
test('scope-aware retry authorizes the retained machine receipt ref before zero receipt byte reads',()=>{
 const originalOpen=fs.openSync,originalRead=fs.readFileSync,receiptFDs=new Set(),trace=[];
 fs.openSync=function(file,...args){const fd=originalOpen.call(fs,file,...args);if(file===good.receiptRef.path){receiptFDs.add(fd);trace.push('OPEN_RECEIPT');}return fd;};
 fs.readFileSync=function(file,...args){if(file===good.receiptRef.path||receiptFDs.has(file))trace.push('READ_RECEIPT_BYTES');return originalRead.call(fs,file,...args);};
 try{
  assert.throws(()=>recoverClaudeDesignDownload(chosen,{...auth,existingReceiptRef:good.receiptRef,authorizeRead:r=>{if(r.path===good.receiptRef.path){trace.push('AUTHORIZE_DENIED');return false;}return true;}}),{code:'CD_MANUAL_READ_SCOPE'});
  assert.deepEqual(trace,['AUTHORIZE_DENIED']);trace.length=0;
  assert.throws(()=>recoverClaudeDesignDownload(chosen,{...auth,authorizeRead:()=>true}),{code:'CD_MANUAL_RECEIPT_REFERENCE_REQUIRED'});assert.deepEqual(trace,[]);
  const verified=recoverClaudeDesignDownload(chosen,{...auth,existingReceiptRef:good.receiptRef,authorizeRead:r=>{if(r.path===good.receiptRef.path)trace.push('AUTHORIZE_ALLOWED');return true;}});
  assert.deepEqual(verified.receiptRef,good.receiptRef);assert.ok(trace.indexOf('AUTHORIZE_ALLOWED')<trace.indexOf('READ_RECEIPT_BYTES'));
 }finally{fs.openSync=originalOpen;fs.readFileSync=originalRead;}
});
test('invalid path, hash, symlink and non HTML all refuse without output',()=>{
 const link=path.join(root,'linked.html');fs.symlinkSync(downloadRef.path,link);
 for(const bad of [{path:link,sha256:downloadRef.sha256},{path:'download.html',sha256:downloadRef.sha256},{...downloadRef,sha256:'0'.repeat(64)},write('not-html.html','not an HTML document'),write('wrong.txt','<!doctype html><html></html>')])assert.throws(()=>recoverClaudeDesignDownload(request({downloadRef:bad}),auth));
});
test('existing unknown directory refuses; original source, copied output and confirmation drift refuse',()=>{
 const occupied=path.join(root,'occupied');fs.mkdirSync(occupied);assert.throws(()=>recoverClaudeDesignDownload(request({directory:occupied}),auth),{code:'CD_MANUAL_DIRECTORY_EXISTS'});
 const original=fs.readFileSync(downloadRef.path);fs.writeFileSync(downloadRef.path,'changed');assert.throws(()=>verifyClaudeDesignRecovery(good.receiptRef),{code:'CD_SOURCE_DRIFT'});fs.writeFileSync(downloadRef.path,original);
 fs.chmodSync(good.entry,0o600);fs.writeFileSync(good.entry,'drift');assert.throws(()=>verifyClaudeDesignRecovery(good.receiptRef),{code:'CD_SOURCE_DRIFT'});fs.writeFileSync(good.entry,original);fs.chmodSync(good.entry,0o400);
 const source=fs.readFileSync(witnessFile.path);fs.writeFileSync(witnessFile.path,'changed witness');assert.throws(()=>verifyClaudeDesignRecovery(good.receiptRef),{code:'CD_SOURCE_DRIFT'});fs.writeFileSync(witnessFile.path,source);
});
test('legacy v1 frozen transport remains recoverable without rewriting or claiming a CD system',()=>{
 const m={...handoff.manifest,schema:'claude-design-stage-v1'},inv={...handoff.inventory,schema:'design-handoff-inventory-v1'};
 for(const key of ['designSystem','designSystemRef','designSystemAssets','materialsRef']){delete m[key];delete inv[key];}
 m.inventory=write('legacy-inventory.json',canonicalJson(inv));const legacy=write('legacy-manifest.json',canonicalJson(m));const result=recoverClaudeDesignDownload(request({manifestRef:legacy}),auth);assert.equal(result.receipt.designSystemStatus,'legacy-unspecified');
});
test('local binding accepts actual legacy packet/material/instruction refs without fictional host stage',()=>{
 const instructionsRef=write('instructions.txt','Keep the original confirmed facts and current configured tool system.');
 const local=createClaudeDesignManualBinding({handoffId:'H-1',packet,materials:[witnessFile],instructionsRef,scope:{kind:'new-design'},target:{workspace:'observed-work',artifact:'observed-artifact'},directory:path.join(root,'local-binding')});
 const result=recoverClaudeDesignDownload(request({manifestRef:local}),auth);assert.equal(result.receipt.bindingKind,'local-source-materials');assert.equal(result.receipt.hostStageVerified,false);assert.equal(result.receipt.remoteMaterialAcceptanceVerified,false);assert.equal(result.receipt.designSystemStatus,'legacy-frozen-source-only');assert.ok(result.readRefs.some(r=>r.path===instructionsRef.path));
});
test('original scope needs exact edit list and remains pending actual fidelity checking',()=>{
 const instructionsRef=write('original-instructions.txt','Keep original behavior.');const local=createClaudeDesignManualBinding({handoffId:'H-1',packet,materials:[witnessFile],instructionsRef,scope:{kind:'template-insertion'},directory:path.join(root,'original-binding')});
 assert.throws(()=>recoverClaudeDesignDownload(request({manifestRef:local}),auth),{code:'CD_MANUAL_EDIT_MANIFEST_REQUIRED'});
 const edits=write('implementation-manifest.json',canonicalJson({schema_version:1,edits:[]}));const result=recoverClaudeDesignDownload(request({manifestRef:local,implementationManifestRef:edits}),auth);assert.equal(result.mechanicalAcceptance,'PENDING_FIDELITY');assert.equal(result.designComplete,false);
});
test('actual packed material bytes are verified; Packet/material drift invalidates stored receipt',()=>{
 const attachments=Array.from({length:10},(_,i)=>({...write('material-'+i+'.md','material-'+i),purpose:'source',sourceIds:['R-1']}));
 const packed=buildClaudeDesignHandoff({packet,handoffId:'H-1',displayName:'Packed',directory:path.join(root,'packed'),scope:{kind:'new-design',sourceIds:['R-1'],workspaceAction:'reuse-empty'},scopeRef,authorizationSourceRef:scopeRef,designSystem,designSystemRef:scopeRef,attachments},boundAuth);
 const r=recoverClaudeDesignDownload(request({manifestRef:{path:packed.manifestPath,sha256:packed.manifestSha256}}),auth);assert.equal(r.receipt.materialCount,12);
 const original=fs.readFileSync(packet.path);fs.writeFileSync(packet.path,'changed Packet');assert.throws(()=>verifyClaudeDesignRecovery(r.receiptRef),{code:'CD_SOURCE_DRIFT'});fs.writeFileSync(packet.path,original);
 const asset=path.join(path.dirname(packed.materialsRef.path),'evidence/material-0.md');fs.chmodSync(asset,0o600);fs.writeFileSync(asset,'changed material');assert.throws(()=>verifyClaudeDesignRecovery(r.receiptRef),{code:'CD_SOURCE_DRIFT'});
});
console.log(`${passes}/${passes} manual cases passed. SIMULATED selection callbacks are fixture boundaries, not actual human approval. No downloaded script ran.`);console.log('Retained fixture:',root);
