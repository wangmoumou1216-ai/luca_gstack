import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonicalJson,sha256Bytes as hash } from './carrier-asset-profile.mjs';
import { createCarrierPacket } from './carrier-packet.mjs';
import { buildClaudeDesignHandoff } from './claude-design-handoff.mjs';
import { createClaudeDesignManualBinding,recoverClaudeDesignDownload,verifyClaudeDesignRecovery } from './claude-design-recover.mjs';
import { inspectClaudeDesignExportArchive } from './claude-design-export-archive.mjs';
import { packMaterials,crc32 } from './design-handoff-archive.mjs';
import { verifyMaterialDependencies } from './material-dependencies.mjs';
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

// A bounded fixture writer deliberately permits unsafe names and duplicate
// members so the public parser, rather than the fixture builder, rejects them.
function exportZIP(files){
 const locals=[],centrals=[];let offset=0;
 for(const {path:name,bytes:data} of files){const filename=Buffer.from(name),bytes=Buffer.from(data),crc=crc32(bytes),local=Buffer.alloc(30),central=Buffer.alloc(46);
  local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt32LE(crc,14);local.writeUInt32LE(bytes.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(filename.length,26);
  central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt32LE(crc,16);central.writeUInt32LE(bytes.length,20);central.writeUInt32LE(bytes.length,24);central.writeUInt16LE(filename.length,28);central.writeUInt32LE(offset,42);
  locals.push(local,filename,bytes);centrals.push(central,filename);offset+=30+filename.length+bytes.length;
 }
 const central=Buffer.concat(centrals),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,central,end]);
}
const exportMembers=[
 {path:'Main.dc.html',bytes:Buffer.from('<!doctype html><html><head><script src="./vendor/react.js"></script><script src="./vendor/react-dom.js"></script><script src="./support.js"></script></head><body>ZIP fixture 中文</body></html>')},
 {path:'support.js',bytes:Buffer.from('globalThis.__cdArchiveExecuted=true;')},
 {path:'vendor/react.js',bytes:Buffer.from('globalThis.__cdReactExecuted=true;')},
 {path:'vendor/react-dom.js',bytes:Buffer.from('globalThis.__cdReactDOMExecuted=true;')},
 {path:'README.md',bytes:Buffer.from('Retain this unreferenced original member.\n')}
];
const exportBytes=exportZIP(exportMembers),exportRef=write('official-layout.zip',exportBytes),zipRequest=(extra={})=>request({downloadRef:exportRef,exportEntryPath:'Main.dc.html',...extra});
let zipGood,zipChosen;
test('observed official STORE layout discovers sole entry and authenticates exact archive, entry and all members',()=>{
 assert.ok(exportBytes.equals(packMaterials(exportMembers)));
 const parsed=inspectClaudeDesignExportArchive(exportBytes);assert.equal(parsed.entryPath,'Main.dc.html');assert.equal(parsed.inventory.length,5);
 assert.throws(()=>recoverClaudeDesignDownload(request({downloadRef:exportRef}),auth),{code:'CD_EXPORT_ENTRY_SELECTION_REQUIRED'});
 zipChosen=zipRequest();let authenticated=0;
 zipGood=recoverClaudeDesignDownload(zipChosen,{authenticateSelection:s=>{authenticated++;assert.deepEqual(s.exportArchiveRef,exportRef);assert.equal(s.exportEntryPath,'Main.dc.html');assert.deepEqual(s.exportInventory,parsed.inventory);return true;}});
 assert.equal(authenticated,2);assert.equal(zipGood.receipt.schema,'claude-design-manual-recovery-v2');assert.equal(zipGood.entry,path.join(zipChosen.directory,'content/Main.dc.html'));
 assert.deepEqual(zipGood.bundle,{asset_root:path.join(zipChosen.directory,'content'),entry_relative:'Main.dc.html',closure:parsed.inventory});
 assert.equal(zipGood.sha256,hash(exportMembers[0].bytes));assert.equal(zipGood.receipt.revision,exportRef.sha256);assert.equal(zipGood.receipt.remoteRevisionVerified,false);assert.equal(zipGood.receipt.scriptsExecuted,false);assert.equal(zipGood.designComplete,false);
 assert.ok(fs.readFileSync(zipGood.receipt.retainedArchiveRef.path).equals(exportBytes));assert.ok(fs.readFileSync(exportRef.path).equals(exportBytes));
 for(const member of exportMembers){const p=path.join(zipGood.bundle.asset_root,member.path);assert.ok(fs.readFileSync(p).equals(member.bytes));assert.equal(fs.statSync(p).mode&0o777,0o400);}
 for(const d of [zipChosen.directory,zipGood.bundle.asset_root,path.join(zipGood.bundle.asset_root,'vendor')])assert.equal(fs.statSync(d).mode&0o777,0o500);
 assert.equal(globalThis.__cdArchiveExecuted,undefined);assert.equal(globalThis.__cdReactExecuted,undefined);assert.equal(globalThis.__cdReactDOMExecuted,undefined);
});
test('ZIP retry requires saved exact receipt and binds request, archive and selected entry',()=>{
 assert.throws(()=>recoverClaudeDesignDownload(zipChosen,auth),{code:'CD_MANUAL_RECEIPT_REFERENCE_REQUIRED'});
 const retry={...auth,existingReceiptRef:zipGood.receiptRef};assert.deepEqual(recoverClaudeDesignDownload(zipChosen,retry).receiptRef,zipGood.receiptRef);
 assert.throws(()=>recoverClaudeDesignDownload({...zipChosen,requestId:'changed'},retry),{code:'CD_MANUAL_RECOVERY_CONFLICT'});
 assert.throws(()=>recoverClaudeDesignDownload({...zipChosen,downloadRef:write('another-export.zip',exportBytes)},retry),{code:'CD_MANUAL_RECOVERY_CONFLICT'});
 assert.throws(()=>recoverClaudeDesignDownload({...zipChosen,exportEntryPath:'support.js'},retry),{code:'CD_EXPORT_ENTRY_REQUIRED'});
 const occupied=path.join(root,'unknown-zip-directory');fs.mkdirSync(occupied);fs.writeFileSync(path.join(occupied,'unknown'),'user file');assert.throws(()=>recoverClaudeDesignDownload(zipRequest({directory:occupied}),auth),{code:'CD_MANUAL_DIRECTORY_EXISTS'});assert.equal(fs.readFileSync(path.join(occupied,'unknown'),'utf8'),'user file');
});
test('every ZIP verify and retry gates original archive, retained archive and every retained member before byte reads',()=>{
 const refs=[exportRef,zipGood.receipt.retainedArchiveRef,...zipGood.bundle.closure.map(f=>({path:path.join(zipGood.bundle.asset_root,f.path),sha256:f.sha256}))];
 const verified=verifyClaudeDesignRecovery(zipGood.receiptRef);for(const ref of refs)assert.ok(verified.readRefs.some(r=>r.path===ref.path&&r.sha256===ref.sha256));
 const originalRead=fs.readFileSync;
 try{for(const blocked of refs){const trace=[];fs.readFileSync=function(file,...args){if(file===blocked.path)trace.push('READ_DENIED');return originalRead.call(fs,file,...args);};
   const opts={...auth,existingReceiptRef:zipGood.receiptRef,authorizeRead:r=>{if(r.path===blocked.path){trace.push('AUTHORIZE_DENIED');return false;}return true;}};
   assert.throws(()=>verifyClaudeDesignRecovery(zipGood.receiptRef,opts),{code:'CD_MANUAL_READ_SCOPE'});assert.deepEqual(trace,['AUTHORIZE_DENIED']);trace.length=0;
   assert.throws(()=>recoverClaudeDesignDownload(zipChosen,opts),{code:'CD_MANUAL_READ_SCOPE'});assert.deepEqual(trace,['AUTHORIZE_DENIED']);
  }}finally{fs.readFileSync=originalRead;}
});
test('ZIP entry selection refuses missing or ambiguous entries and accepts explicitly selected nested entry',()=>{
 const second={path:'nested/Other.html',bytes:Buffer.from('<!doctype html><html><script src="../support.js"></script></html>')},multi=exportZIP([...exportMembers,second]);
 assert.throws(()=>inspectClaudeDesignExportArchive(multi),{code:'CD_EXPORT_ENTRY_SELECTION_REQUIRED'});
 const multiRef=write('multi-entry.zip',multi);assert.throws(()=>recoverClaudeDesignDownload(zipRequest({downloadRef:multiRef,exportEntryPath:'missing.html'}),auth),{code:'CD_EXPORT_ENTRY_REQUIRED'});
 const nested=recoverClaudeDesignDownload(zipRequest({downloadRef:multiRef,exportEntryPath:'nested/Other.html'}),auth);assert.equal(nested.bundle.entry_relative,'nested/Other.html');assert.equal(nested.bundle.closure.length,6);assert.ok(fs.readFileSync(nested.entry).equals(second.bytes));
 assert.throws(()=>inspectClaudeDesignExportArchive(exportZIP(exportMembers.slice(1))),{code:'CD_MANUAL_HTML_REQUIRED'});
});
test('ZIP parser refuses traversal, absolute/backslash names, normalization/case aliases, duplicates and file-directory collisions',()=>{
 const tiny={path:'Main.html',bytes:Buffer.from('<html></html>')};
 for(const unsafe of ['../escape.js','/absolute.js','C:/escape.js','vendor\\escape.js','a/./escape.js','a//escape.js','a/../escape.js','a/','a\u0000.js','e\u0301.js','a./file.js','CON.js'])assert.throws(()=>inspectClaudeDesignExportArchive(exportZIP([tiny,{path:unsafe,bytes:'unsafe'}])),{code:'CD_EXPORT_PATH'});
 assert.throws(()=>inspectClaudeDesignExportArchive(exportZIP([tiny,tiny])),{code:'CD_EXPORT_DUPLICATE'});
 for(const aliases of [['a.js','A.js'],['vendor/a.js','Vendor/b.js'],['\u00df.js','SS.js']])assert.throws(()=>inspectClaudeDesignExportArchive(exportZIP([tiny,...aliases.map(p=>({path:p,bytes:'alias'}))])),{code:'CD_EXPORT_ALIAS'});
 assert.throws(()=>inspectClaudeDesignExportArchive(exportZIP([tiny,{path:'vendor',bytes:'file'},{path:'vendor/a.js',bytes:'child'}])),{code:'CD_EXPORT_PATH_COLLISION'});
});
test('ZIP parser checks EOCD/central/local agreement, CRC, offsets, supported flags and symlink attributes',()=>{
 const central=exportBytes.readUInt32LE(exportBytes.length-6),mutate=fn=>{const b=Buffer.from(exportBytes);fn(b,central);return b;};
 const attacks=[
  [b=>b[b.length-22]=0,'CD_EXPORT_ARCHIVE_STRUCTURE'],
  [(b,c)=>b.writeUInt32LE(0,c+42),'CD_EXPORT_ARCHIVE_STRUCTURE',1],
  [(b,c)=>b.writeUInt32LE(0xa1ff0000,c+38),'CD_EXPORT_SYMLINK'],
  [(b,c)=>b.writeUInt16LE(8,c+10),'CD_EXPORT_ARCHIVE_UNSUPPORTED'],
  [(b,c)=>b.writeUInt16LE(0,c+8),'CD_EXPORT_ARCHIVE_UNSUPPORTED'],
  [(b,c)=>b.writeUInt16LE(1,c+30),'CD_EXPORT_ARCHIVE_UNSUPPORTED'],
  [(b,c)=>b.writeUInt16LE(1,c+32),'CD_EXPORT_ARCHIVE_UNSUPPORTED'],
  [(b,c)=>b.writeUInt16LE(1,c+34),'CD_EXPORT_ARCHIVE_UNSUPPORTED'],
  [b=>b.writeUInt16LE(1,b.length-18),'CD_EXPORT_ARCHIVE_UNSUPPORTED'],
  [b=>b.writeUInt16LE(1,b.length-2),'CD_EXPORT_ARCHIVE_UNSUPPORTED'],
  [b=>b.writeUInt16LE(0,6),'CD_EXPORT_ARCHIVE_STRUCTURE'],
  [b=>b.writeUInt16LE(1,28),'CD_EXPORT_ARCHIVE_STRUCTURE'],
  [b=>b.writeUInt32LE(1,18),'CD_EXPORT_ARCHIVE_STRUCTURE'],
  [b=>b[30]^=1,'CD_EXPORT_ARCHIVE_STRUCTURE'],
  [b=>b[30+Buffer.byteLength('Main.dc.html')]^=1,'CD_EXPORT_ARCHIVE_CRC']
 ];
 for(const [fn,code,second] of attacks){const corrupted=mutate((b,c)=>fn(b,second?c+46+Buffer.byteLength('Main.dc.html'):c));assert.throws(()=>inspectClaudeDesignExportArchive(corrupted),{code});}
 assert.throws(()=>inspectClaudeDesignExportArchive(Buffer.concat([exportBytes,Buffer.from('trailing')])),{code:'CD_EXPORT_ARCHIVE_STRUCTURE'});
 const hidden=Buffer.concat([Buffer.from('hidden'),exportBytes]);assert.throws(()=>inspectClaudeDesignExportArchive(hidden),{code:'CD_EXPORT_ARCHIVE_STRUCTURE'});
 assert.throws(()=>inspectClaudeDesignExportArchive(exportZIP(Array.from({length:1001},(_,i)=>({path:'f'+i+'.html',bytes:'<html></html>'})))),{code:'CD_EXPORT_ARCHIVE_LIMIT'});
});
test('missing or escaped literal HTML resources refuse before output creation',()=>{
 for(const missing of ['support.js','vendor/react.js','vendor/react-dom.js']){const ref=write('missing-'+missing.replaceAll('/','-')+'.zip',exportZIP(exportMembers.filter(f=>f.path!==missing))),input=zipRequest({downloadRef:ref});assert.throws(()=>recoverClaudeDesignDownload(input,auth),{code:'CD_EXPORT_RESOURCE_MISSING'});assert.equal(fs.existsSync(input.directory),false);}
 for(const src of ['../outside.js','/outside.js','..%2foutside.js']){const ref=write('escaped-'+(++n)+'.zip',exportZIP([{path:'Main.html',bytes:'<html><script src="'+src+'"></script></html>'}]));assert.throws(()=>recoverClaudeDesignDownload(zipRequest({downloadRef:ref,exportEntryPath:'Main.html'}),auth),{code:'CD_EXPORT_RESOURCE'});}
});
test('srcset/imagesrcset refuse missing, escaping and present candidates before output; simple src stays supported',()=>{
 for(const [tag,attribute] of [['img','srcset'],['source','srcset'],['link','imagesrcset']])for(const value of ['missing.png 1x','../outside.png 1x','present.png 1x','present.png 1x, missing.png 2x']){
  const ref=write('srcset-'+(++n)+'.zip',exportZIP([{path:'Main.html',bytes:'<html><body><'+tag+' '+attribute+'="'+value+'"></body></html>'},{path:'present.png',bytes:'fixture image'}])),input=zipRequest({downloadRef:ref,exportEntryPath:'Main.html'});
  assert.throws(()=>recoverClaudeDesignDownload(input,auth),{code:'CD_EXPORT_RESOURCE_SRCSET_UNSUPPORTED'});assert.equal(fs.existsSync(input.directory),false);
 }
 const ref=write('simple-img.zip',exportZIP([{path:'Main.html',bytes:'<html><body><img src="present.png"></body></html>'},{path:'present.png',bytes:'fixture image'}]));const result=recoverClaudeDesignDownload(zipRequest({downloadRef:ref,exportEntryPath:'Main.html'}),auth);assert.equal(result.bundle.closure.length,2);
});
test('unknown custom tags including constructor use no inherited resource attributes',()=>{
 const ref=write('custom-tags.zip',exportZIP([{path:'Main.html',bytes:'<html><body><constructor id="x"></constructor><__proto__ id="y"></__proto__><custom-widget id="z"></custom-widget></body></html>'}]));
 const result=recoverClaudeDesignDownload(zipRequest({downloadRef:ref,exportEntryPath:'Main.html'}),auth);assert.equal(result.bundle.entry_relative,'Main.html');assert.equal(result.bundle.closure.length,1);assert.equal(result.receipt.scriptsExecuted,false);
});
test('ZIP retained/source archive drift, resource drift, deletion, new members and symlinks refuse then recover after restore',()=>{
 const assertRestored=()=>assert.deepEqual(verifyClaudeDesignRecovery(zipGood.receiptRef).bundle,zipGood.bundle);
 for(const ref of [exportRef,zipGood.receipt.retainedArchiveRef,...zipGood.bundle.closure.map(f=>({path:path.join(zipGood.bundle.asset_root,f.path),sha256:f.sha256}))]){const original=fs.readFileSync(ref.path),mode=fs.statSync(ref.path).mode&0o777;fs.chmodSync(ref.path,0o600);fs.writeFileSync(ref.path,Buffer.concat([original,Buffer.from('drift')]));assert.throws(()=>verifyClaudeDesignRecovery(zipGood.receiptRef),{code:'CD_SOURCE_DRIFT'});fs.writeFileSync(ref.path,original);fs.chmodSync(ref.path,mode);assertRestored();}
 const assetRoot=zipGood.bundle.asset_root,file=path.join(assetRoot,'README.md'),original=fs.readFileSync(file);fs.chmodSync(assetRoot,0o700);fs.unlinkSync(file);assert.throws(()=>verifyClaudeDesignRecovery(zipGood.receiptRef),{code:'CD_EXPORT_RETAINED_INVENTORY'});fs.writeFileSync(file,original,{mode:0o400});
 const extra=path.join(assetRoot,'new-member.js');fs.writeFileSync(extra,'extra');assert.throws(()=>verifyClaudeDesignRecovery(zipGood.receiptRef),{code:'CD_EXPORT_RETAINED_INVENTORY'});fs.unlinkSync(extra);fs.mkdirSync(path.join(assetRoot,'empty'));assert.throws(()=>verifyClaudeDesignRecovery(zipGood.receiptRef),{code:'CD_EXPORT_RETAINED_INVENTORY'});fs.rmdirSync(path.join(assetRoot,'empty'));
 fs.unlinkSync(file);fs.symlinkSync(exportRef.path,file);assert.throws(()=>verifyClaudeDesignRecovery(zipGood.receiptRef),{code:'CD_EXPORT_RETAINED_INVENTORY'});fs.unlinkSync(file);fs.writeFileSync(file,original,{mode:0o400});fs.chmodSync(assetRoot,0o500);assertRestored();
});
test('ZIP receipt cannot substitute bundle root, omit an unreferenced member or rebind a resource hash',()=>{
 const original=fs.readFileSync(zipGood.receiptRef.path),mode=fs.statSync(zipGood.receiptRef.path).mode&0o777;
 for(const mutate of [r=>r.exportBundle.asset_root=root,r=>r.exportBundle.closure=r.exportBundle.closure.filter(f=>f.path!=='README.md'),r=>r.exportBundle.closure.find(f=>f.path==='support.js').sha256='0'.repeat(64),r=>r.recoveredHTMLRef.sha256=exportRef.sha256]){
  const receipt=JSON.parse(original);mutate(receipt);const bytes=Buffer.from(canonicalJson(receipt));fs.chmodSync(zipGood.receiptRef.path,0o600);fs.writeFileSync(zipGood.receiptRef.path,bytes);assert.throws(()=>verifyClaudeDesignRecovery({path:zipGood.receiptRef.path,sha256:hash(bytes)}),{code:'CD_MANUAL_RECEIPT'});
 }fs.writeFileSync(zipGood.receiptRef.path,original);fs.chmodSync(zipGood.receiptRef.path,mode);assert.deepEqual(verifyClaudeDesignRecovery(zipGood.receiptRef).bundle,zipGood.bundle);
});
test('CSS url/import, inline module and every external CSS/JS dependency refuse missing, escape and outside URLs before output',()=>{
 const documents=[
  '<html><style>body{background:url("TARGET")}</style></html>',
  '<html><body style="background:url(TARGET)"></body></html>',
  '<html><style>@import "TARGET";</style></html>',
  '<html><script type="module">import "TARGET";</script></html>'
 ];
 for(const target of ['missing.png','../outside.png','https://outside.invalid/file'])for(const html of documents){
  const ref=write('dependency-'+(++n)+'.zip',exportZIP([{path:'Main.html',bytes:html.replace('TARGET',target)}])),input=zipRequest({downloadRef:ref,exportEntryPath:'Main.html'});
  assert.throws(()=>recoverClaudeDesignDownload(input,auth),e=>typeof e.code==='string'&&/MATERIAL_CLOSURE_MISSING|PATH_ESCAPE|DEPENDENCY_ESCAPE|NETWORK_SCOPE_REFUSED/.test(e.code));assert.equal(fs.existsSync(input.directory),false);
 }
 for(const member of [{path:'unused.css',bytes:'@import "missing.css";body{background:url(missing.png)}'},{path:'unused.js',bytes:'import "./missing.js";'}]){
  const ref=write('external-dependency-'+(++n)+'.zip',exportZIP([{path:'Main.html',bytes:'<html></html>'},member])),input=zipRequest({downloadRef:ref,exportEntryPath:'Main.html'});
  assert.throws(()=>recoverClaudeDesignDownload(input,auth),{code:'MATERIAL_CLOSURE_MISSING'});assert.equal(fs.existsSync(input.directory),false);
 }
 const unknown=write('unknown-import.zip',exportZIP([{path:'Main.html',bytes:'<html><script type="module">import(location.search);</script></html>'}]));assert.throws(()=>recoverClaudeDesignDownload(zipRequest({downloadRef:unknown,exportEntryPath:'Main.html'}),auth),{code:'DYNAMIC_DEPENDENCY_UNRESOLVED'});
});
test('complete static CSS/module closure passes unchanged; external resource/hash drift rejects replay',()=>{
 const members=[
  {path:'Main.html',bytes:'<html><link rel="stylesheet" href="css/main.css"><style>body{background:url(assets/bg.png)}</style><script type="module">import "./modules/start.js";</script></html>'},
  {path:'css/main.css',bytes:'@import "./theme.css";body{background:url(../assets/bg.png)}'},
  {path:'css/theme.css',bytes:'body{color:#111}'},
  {path:'modules/start.js',bytes:'import "./helper.js";globalThis.__cdStaticModuleExecuted=true;'},
  {path:'modules/helper.js',bytes:'export const data="retained";'},
  {path:'assets/bg.png',bytes:'fixture bytes'}
 ];
 const source=write('static-closure.zip',exportZIP(members)),input=zipRequest({downloadRef:source,exportEntryPath:'Main.html'}),result=recoverClaudeDesignDownload(input,auth);assert.equal(result.bundle.closure.length,members.length);assert.deepEqual(result.runtime_requirements,[]);assert.equal(globalThis.__cdStaticModuleExecuted,undefined);
 for(const member of members){const file=path.join(result.bundle.asset_root,member.path),original=fs.readFileSync(file);assert.ok(original.equals(Buffer.from(member.bytes)));fs.chmodSync(file,0o600);fs.writeFileSync(file,'drift');assert.throws(()=>verifyClaudeDesignRecovery(result.receiptRef),{code:'CD_SOURCE_DRIFT'});fs.writeFileSync(file,original);fs.chmodSync(file,0o400);assert.deepEqual(verifyClaudeDesignRecovery(result.receiptRef).bundle,result.bundle);}
});
const officialFixturePath=new URL('./fixtures/claude-design-official-export-v1/export.zip',import.meta.url),officialFixtureBytes=fs.readFileSync(officialFixturePath),officialArchive=inspectClaudeDesignExportArchive(officialFixtureBytes),officialMembers=officialArchive.files;
test('exact official runtime supports static profile and requires independent runtime assertion; fixture/source bytes remain unchanged',()=>{
 assert.equal(hash(officialFixtureBytes),'b5385e882008374f0f8a16cd3af43299dad9b3c05cb2cf8541b25ff0121d7231');assert.deepEqual(officialArchive.dependencyProof,{dispatch:'SUPPORTED',profile:'claude-design-official-export-v1',runtime_requirements:['RUNTIME:DC_EXPORT_V1']});
 const source=write('official-profile.zip',officialFixtureBytes),result=recoverClaudeDesignDownload(zipRequest({downloadRef:source}),auth);assert.deepEqual(result.runtime_requirements,['RUNTIME:DC_EXPORT_V1']);assert.equal(result.designComplete,false);assert.equal(result.receipt.semanticAcceptance,'PENDING_INDEPENDENT_REVIEW');assert.equal(result.receipt.scriptsExecuted,false);
 for(const member of officialMembers)assert.ok(fs.readFileSync(path.join(result.bundle.asset_root,member.path)).equals(member.bytes));assert.equal(hash(fs.readFileSync(officialFixturePath)),hash(officialFixtureBytes));
});
test('recognized DC profile refuses identity/order/config/template/class/alias/callback/prototype uncertainty without generic fallback',()=>{
 const main=officialMembers.find(f=>f.path==='Main.dc.html').bytes.toString('utf8');
 const attacks=[
  t=>t.replace('src="./vendor/react.js"','defer src="./vendor/react.js"'),
  t=>t.replace('<script src="./vendor/react.js"></script>\n<script src="./vendor/react-dom.js"></script>','<script src="./vendor/react-dom.js"></script>\n<script src="./vendor/react.js"></script>'),
  t=>t.replace('<body>','<body><script>window.__resources={}</script>'),
  t=>t.replace('<x-dc>','<x-dc><x-import src="./missing.js"></x-import>'),
  t=>t.replace('<x-dc>','<x-dc><dc-import component="Other"></dc-import>'),
  t=>t.replace('<helmet>','<helmet><link href="./support.js">'),
  t=>t.replace('<helmet>','<sc-helmet>'),
  t=>t.replace('<header data-req=','<header ref="{{query}}" data-req='),
  t=>t.replace('<header data-req=','<header sc-camel-src="./missing.js" data-req='),
  t=>t.replace('style="margin: 0; font-size: 26px; line-height: 1.25"','style="{{query}}"'),
  t=>t.replace('"$preview":','"evilConfig":{},"$preview":'),
  t=>t.replace('class Component extends DCLogic {','class Component extends DCLogic { constructor(){super();}'),
  t=>t.replace("query: '',", "get query(){return ''},"),
  t=>t.replace('renderVals() {','renderVals() { fetch("./support.js");'),
  t=>t.replace('renderVals() {','renderVals() { const loader=fetch; loader("./support.js");'),
  t=>t.replace('renderVals() {','renderVals() { const bad={focus(){fetch("x")}};bad.focus();'),
  t=>t.replace('renderVals() {','renderVals() { const bad=document.constructor;'),
  t=>t.replace('renderVals() {','renderVals() { const bad={querySelectorAll:()=>[]};bad.querySelectorAll("button")[0].focus();'),
  t=>t.replace("const doc = () => document;", "const doc = () => document; const unused = (x) => x();"),
  t=>t.replace("const doc = () => document;", "const doc = () => document; const poison = () => this.setState({query:document});")
 ];
 for(const [index,mutate] of attacks.entries()){const mutated=mutate(main);assert.notEqual(mutated,main);const members=officialMembers.map(f=>f.path==='Main.dc.html'?{path:f.path,bytes:mutated}:f);assert.throws(()=>inspectClaudeDesignExportArchive(exportZIP(members)),e=>typeof e.code==='string'&&/DC_RUNTIME_PROFILE_REFUSED|CD_EXPORT_RESOURCE|CSS|SCRIPT|MATERIAL|DYNAMIC/.test(e.code),'profile attack '+index);}
 for(const name of ['support.js','vendor/react.js','vendor/react-dom.js'])assert.throws(()=>inspectClaudeDesignExportArchive(exportZIP(officialMembers.map(f=>f.path===name?{path:f.path,bytes:Buffer.concat([f.bytes,Buffer.from('\n// changed')])}:f))),{code:'DC_RUNTIME_PROFILE_REFUSED'});
 assert.deepEqual(inspectClaudeDesignExportArchive(officialFixtureBytes).dependencyProof.runtime_requirements,['RUNTIME:DC_EXPORT_V1']);
});
test('generic recursive/native inference graphs terminate with typed refusal and preserve literal missing-resource guard',()=>{
 const code='const a={};a.self=a;const k=()=>a.self;document.body.innerHTML=k().self;',members=[{path:'Main.html',bytes:'<html><script>'+code+'</script></html>'}],bytes=exportZIP(members);assert.throws(()=>inspectClaudeDesignExportArchive(bytes),e=>typeof e.code==='string'&&/DYNAMIC_DEPENDENCY_UNRESOLVED|MATERIAL_ANALYSIS_LIMIT/.test(e.code));
 const direct=[{path:'Main.html',bytes:Buffer.from('<html><style>body{background:url(missing.png)}</style></html>')}],items=direct.map(f=>({path:f.path,sha256:hash(f.bytes),bytes:f.bytes.length}));assert.throws(()=>verifyMaterialDependencies({items,entry:'Main.html',bytesOf:p=>direct.find(f=>f.path===p).bytes}),{code:'MATERIAL_CLOSURE_MISSING'});
});
const nestedHTML=depth=>Buffer.from('<!doctype html><html><head></head><body>'+'<div>'.repeat(depth)+'x'+'</div>'.repeat(depth)+'</body></html>');
const wideHTML=Buffer.from('<!doctype html><html><head></head><body>'+'<div>x</div>'.repeat(20000)+'</body></html>');
test('archive HTML depth/node budgets refuse before output; shallow and restored official bytes still pass',()=>{
 for(const html of [nestedHTML(6000),wideHTML]){
  const bytes=exportZIP([{path:'Main.html',bytes:html}]);assert.throws(()=>inspectClaudeDesignExportArchive(bytes),{code:'CD_EXPORT_HTML_ANALYSIS_LIMIT'});
  const input=zipRequest({downloadRef:write('html-budget-'+(++n)+'.zip',bytes),exportEntryPath:'Main.html'});assert.throws(()=>recoverClaudeDesignDownload(input,auth),{code:'CD_EXPORT_HTML_ANALYSIS_LIMIT'});assert.equal(fs.existsSync(input.directory),false);
 }
 assert.equal(inspectClaudeDesignExportArchive(exportZIP([{path:'Main.html',bytes:nestedHTML(1)}])).entryPath,'Main.html');
 assert.deepEqual(inspectClaudeDesignExportArchive(officialFixtureBytes).dependencyProof,officialArchive.dependencyProof);
});
test('generic dependency analysis bounds every retained HTML member, including template content',()=>{
 const check=files=>verifyMaterialDependencies({items:files.map(f=>({path:f.path,sha256:hash(f.bytes),bytes:f.bytes.length})),entry:'Main.html',bytesOf:p=>files.find(f=>f.path===p).bytes});
 const shallow={path:'Main.html',bytes:nestedHTML(1)};
 for(const html of [nestedHTML(6000),wideHTML,Buffer.from('<html><body><template>'+nestedHTML(6000).toString()+'</template></body></html>')])assert.throws(()=>check([shallow,{path:'nested.html',bytes:html}]),{code:'MATERIAL_ANALYSIS_LIMIT'});
 assert.deepEqual(check([shallow,{path:'nested.html',bytes:nestedHTML(1)}]),{dispatch:'NOT_APPLICABLE',profile:null,runtime_requirements:[]});
});
test('many finite documents share total traversal budgets and nested srcdoc has a separate finite call budget',()=>{
 const check=files=>{const bytes=new Map(files.map(f=>[f.path,f.bytes]));return verifyMaterialDependencies({items:files.map(f=>({path:f.path,sha256:hash(f.bytes),bytes:f.bytes.length})),entry:'Main.html',bytesOf:p=>bytes.get(p)});};
 const html=Buffer.from('<html><body>'+'<div>x</div>'.repeat(1100)+'</body></html>'),many=Array.from({length:1000},(_,i)=>({path:i===0?'Main.html':'secondary-'+i+'.html',bytes:html}));
 assert.throws(()=>inspectClaudeDesignExportArchive(exportZIP(many),{entryPath:'Main.html'}),{code:'CD_EXPORT_HTML_ANALYSIS_LIMIT'});assert.throws(()=>check(many),{code:'MATERIAL_ANALYSIS_LIMIT'});
 let fragment='<div>x</div>';for(let i=0;i<65;i++)fragment='<iframe srcdoc="'+fragment.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"></iframe>';
 assert.throws(()=>check([{path:'Main.html',bytes:nestedHTML(1)},{path:'fragment.html',bytes:Buffer.from('<html><body>'+fragment+'</body></html>')}]),{code:'MATERIAL_ANALYSIS_LIMIT'});
});
test('current ZIP replay rechecks deeply replaced secondary HTML even when receipt hashes are rebound, then restores',()=>{
 const members=[{path:'Main.html',bytes:nestedHTML(1)},{path:'nested.html',bytes:nestedHTML(1)}],originalZIP=exportZIP(members),source=write('replay-html-budget.zip',originalZIP),input=zipRequest({downloadRef:source,exportEntryPath:'Main.html'}),result=recoverClaudeDesignDownload(input,auth);
 const receiptBytes=fs.readFileSync(result.receiptRef.path),secondary=path.join(result.bundle.asset_root,'nested.html'),changedHTML=nestedHTML(6000),changedZIP=exportZIP(members.map(f=>f.path==='nested.html'?{...f,bytes:changedHTML}:f)),changedHash=hash(changedZIP);
 const receipt=JSON.parse(receiptBytes);receipt.request.downloadRef.sha256=changedHash;receipt.downloadRef.sha256=changedHash;receipt.revision=changedHash;receipt.retainedArchiveRef.sha256=changedHash;Object.assign(receipt.exportBundle.closure.find(f=>f.path==='nested.html'),{sha256:hash(changedHTML),bytes:changedHTML.length});
 const rebound=Buffer.from(canonicalJson(receipt)),ownedFiles=[{path:source.path,original:originalZIP,changed:changedZIP},{path:result.receipt.retainedArchiveRef.path,original:originalZIP,changed:changedZIP},{path:secondary,original:members[1].bytes,changed:changedHTML},{path:result.receiptRef.path,original:receiptBytes,changed:rebound}].map(f=>({...f,mode:fs.statSync(f.path).mode&0o777}));
 try{
  for(const f of ownedFiles){fs.chmodSync(f.path,0o600);fs.writeFileSync(f.path,f.changed);}
  const receiptRef={path:result.receiptRef.path,sha256:hash(rebound)};assert.throws(()=>verifyClaudeDesignRecovery(receiptRef),{code:'CD_EXPORT_HTML_ANALYSIS_LIMIT'});assert.throws(()=>recoverClaudeDesignDownload(receipt.request,{...auth,existingReceiptRef:receiptRef}),{code:'CD_EXPORT_HTML_ANALYSIS_LIMIT'});
 }finally{for(const f of ownedFiles){fs.writeFileSync(f.path,f.original);fs.chmodSync(f.path,f.mode);}}
 assert.deepEqual(verifyClaudeDesignRecovery(result.receiptRef).bundle,result.bundle);assert.deepEqual(recoverClaudeDesignDownload(input,{...auth,existingReceiptRef:result.receiptRef}).receiptRef,result.receiptRef);
});
if(process.env.CD_OFFICIAL_EXPORT_FIXTURE)test('selected official archive is parsed read-only with exact original five-member inventory',()=>{
 const bytes=fs.readFileSync(process.env.CD_OFFICIAL_EXPORT_FIXTURE);assert.equal(hash(bytes),'b5385e882008374f0f8a16cd3af43299dad9b3c05cb2cf8541b25ff0121d7231');const parsed=inspectClaudeDesignExportArchive(bytes);assert.equal(parsed.entryPath,'Main.dc.html');assert.deepEqual(parsed.inventory.map(f=>[f.path,f.bytes]),[['Main.dc.html',12408],['README.md',895],['support.js',45305],['vendor/react-dom.js',131835],['vendor/react.js',10751]]);assert.equal(hash(fs.readFileSync(process.env.CD_OFFICIAL_EXPORT_FIXTURE)),hash(bytes));
});
console.log(`${passes}/${passes} manual cases passed. SIMULATED selection callbacks are fixture boundaries, not actual human approval. No downloaded script ran.`);console.log('Retained fixture:',root);
