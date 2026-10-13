import fs from 'node:fs';
import path from 'node:path';
import { canonicalJson, sha256Bytes } from './carrier-asset-profile.mjs';
import { readExact } from './design-behavior-preparation.mjs';
import { packMaterials } from './design-handoff-archive.mjs';
import { inspectClaudeDesignExportArchive } from './claude-design-export-archive.mjs';

const fail=code=>{throw Object.assign(new Error(code),{code});};
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const exact=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||!same(Object.keys(v).sort(),[...keys].sort()))fail('CD_MANUAL_SCHEMA');};
const safeId=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(v);
function reader(options={}) {
 const read=ref=>{exact(ref,['path','sha256']);if(!/^[a-f0-9]{64}$/.test(ref.sha256))fail('CD_MANUAL_HASH');if(options.authorizeRead&&options.authorizeRead(ref)!==true)fail('CD_MANUAL_READ_SCOPE');const bytes=readExact(ref);read.refs.push({...ref});return bytes;};read.refs=[];return read;
}
function witness(ref,read){exact(ref,['path','sha256','excerpt']);if(typeof ref.excerpt!=='string'||!ref.excerpt.trim()||!read({path:ref.path,sha256:ref.sha256}).toString('utf8').includes(ref.excerpt))fail('CD_MANUAL_SELECTION_REFERENCE');return ref;}
function fresh(directory){if(typeof directory!=='string'||!path.isAbsolute(directory)||path.normalize(directory)!==directory||fs.realpathSync(path.dirname(directory))!==path.dirname(directory))fail('CD_MANUAL_DIRECTORY');}
function writeExact(file,bytes){const fd=fs.openSync(file,'wx',0o400);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return {path:file,sha256:sha256Bytes(bytes)};}
const encode=value=>Buffer.from(canonicalJson(value));
function html(ref,read){if(!/\.html?$/i.test(ref.path))fail('CD_MANUAL_HTML_REQUIRED');const bytes=read(ref),text=bytes.toString('utf8');if(!Buffer.from(text).equals(bytes)||!/^\s*(?:<!doctype\s+html\b|<html\b)/i.test(text.slice(0,512))||!/<html\b/i.test(text)||!/<\/html\s*>/i.test(text))fail('CD_MANUAL_HTML_REQUIRED');return bytes;}

// Only our deterministic uncompressed material transport is supported. Repacking
// proves local/central headers, flags, CRC, path set and every actual inner byte.
function unpackMaterials(bytes){
 const files=[];let offset=0,total=0;
 while(offset+30<=bytes.length&&bytes.readUInt32LE(offset)===0x04034b50){
  const flags=bytes.readUInt16LE(offset+6),method=bytes.readUInt16LE(offset+8),size=bytes.readUInt32LE(offset+18),plain=bytes.readUInt32LE(offset+22),nameSize=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28),start=offset+30+nameSize;
  if(flags!==0x800||method||extra||size!==plain||start+size>bytes.length||files.length>=1000||(total+=size)>50*1024*1024)fail('CD_MANUAL_MATERIAL_ARCHIVE');
  const nameBytes=bytes.subarray(offset+30,start),name=nameBytes.toString('utf8');if(!Buffer.from(name).equals(nameBytes))fail('CD_MANUAL_MATERIAL_ARCHIVE');
  files.push({path:name,bytes:Buffer.from(bytes.subarray(start,start+size))});offset=start+size;
 }
 try{if(!files.length||!packMaterials(files).equals(bytes))fail('CD_MANUAL_MATERIAL_ARCHIVE');}catch{fail('CD_MANUAL_MATERIAL_ARCHIVE');}return files;
}

// This local freeze explicitly says nothing about remote upload or host STAGED.
// It supports existing exploratory material whose actual source bytes are known.
export function createClaudeDesignManualBinding({handoffId,packet,materials,instructionsRef,preparationRef=null,target=null,scope,directory},options={}){
 const read=reader(options);if(!safeId(handoffId)||!['new-design','template-insertion','visual-refinement'].includes(scope?.kind)||!Array.isArray(materials)||materials.length>30)fail('CD_MANUAL_BINDING');
 if(new Set(materials.map(r=>r?.path)).size!==materials.length)fail('CD_MANUAL_BINDING');read(packet);for(const ref of materials)read(ref);read(instructionsRef);if(preparationRef)read(preparationRef);
 if(target&&(typeof target.workspace!=='string'||!target.workspace.trim()||typeof target.artifact!=='string'||!target.artifact.trim()||Object.keys(target).sort().join(',')!=='artifact,workspace'))fail('CD_MANUAL_TARGET');
 fresh(directory);if(fs.existsSync(directory))fail('CD_MANUAL_DIRECTORY_EXISTS');fs.mkdirSync(directory,{mode:0o700});
 return writeExact(path.join(directory,'local-binding.json'),encode({schema:'claude-design-manual-binding-v1',tool:'claude-design',handoffId,packet,materials,instructionsRef,preparationRef,target,scope,bindingKind:'local-source-materials',hostStageVerified:false,remoteMaterialAcceptanceVerified:false}));
}

function inspectBinding(ref,handoffId,read){
 const manifest=JSON.parse(read(ref));const refs=[ref];const take=r=>{const bytes=read(r);refs.push(r);return bytes;};
 if(manifest.schema==='claude-design-manual-binding-v1'){
  exact(manifest,['schema','tool','handoffId','packet','materials','instructionsRef','preparationRef','target','scope','bindingKind','hostStageVerified','remoteMaterialAcceptanceVerified']);
  if(manifest.tool!=='claude-design'||manifest.handoffId!==handoffId||manifest.bindingKind!=='local-source-materials'||manifest.hostStageVerified!==false||manifest.remoteMaterialAcceptanceVerified!==false||!Array.isArray(manifest.materials)||manifest.materials.length>30||!['new-design','template-insertion','visual-refinement'].includes(manifest.scope?.kind))fail('CD_MANUAL_BINDING');
  if(new Set(manifest.materials.map(r=>r?.path)).size!==manifest.materials.length)fail('CD_MANUAL_BINDING');
  if(manifest.target){exact(manifest.target,['workspace','artifact']);if(Object.values(manifest.target).some(v=>typeof v!=='string'||!v.trim()||v.length>500))fail('CD_MANUAL_TARGET');}
  take(manifest.packet);for(const r of manifest.materials)take(r);take(manifest.instructionsRef);if(manifest.preparationRef)take(manifest.preparationRef);
  return {manifest,refs,bindingKind:manifest.bindingKind,designSystemStatus:'legacy-frozen-source-only',materialCount:manifest.materials.length};
 }
 const v2=manifest.schema==='claude-design-stage-v2',extra=v2?['designSystem','designSystemRef','designSystemAssets','materialsRef']:[];
 exact(manifest,['schema','tool','handoffId','displayName','packet','inventory','attachments','instructions','scope','sourceRefs','scopeRef','authorizationSourceRef',...extra]);
 if(!['claude-design-stage-v1','claude-design-stage-v2'].includes(manifest.schema)||manifest.tool!=='claude-design'||manifest.handoffId!==handoffId||!['new-design','template-insertion','visual-refinement'].includes(manifest.scope?.kind)||!Array.isArray(manifest.attachments)||manifest.attachments.length>9||!Array.isArray(manifest.sourceRefs)||!same(manifest.sourceRefs,manifest.scope.sourceIds))fail('CD_MANUAL_BINDING');
 take(manifest.packet);const inventory=JSON.parse(take(manifest.inventory));
 exact(inventory,['schema','displayName','packet','requiredAttachments','scope','sourceRefs','scopeRef','authorizationSourceRef',...extra]);
 if(inventory.schema!==(v2?'design-handoff-inventory-v2':'design-handoff-inventory-v1'))fail('CD_MANUAL_INVENTORY');
 for(const key of ['displayName','packet','scope','sourceRefs','scopeRef','authorizationSourceRef',...extra])if(!same(inventory[key],manifest[key]))fail('CD_MANUAL_INVENTORY');
 if(!same(inventory.requiredAttachments,manifest.attachments))fail('CD_MANUAL_INVENTORY');
 for(const r of [manifest.scopeRef,manifest.authorizationSourceRef,...(v2?[manifest.designSystemRef]:[])]){witness(r,read);refs.push({path:r.path,sha256:r.sha256});}
 const transport=[];const names=new Set();
 for(const f of manifest.attachments){exact(f,['path','sha256','name','size','mime','sourceIds']);const bytes=take({path:f.path,sha256:f.sha256});if(f.name!==path.basename(f.path)||bytes.length!==f.size||names.has(f.name))fail('CD_MANUAL_MATERIAL');names.add(f.name);transport.push({path:f.name,bytes});}
 let actual=transport;
 if(transport.length===1&&manifest.attachments[0].mime==='application/zip')actual=unpackMaterials(transport[0].bytes);
 const indexFile=actual.find(f=>f.path==='materials-index.json');let index=null;
 if(indexFile){
  index=JSON.parse(indexFile.bytes);if(!same(index.packet,manifest.packet)||!Array.isArray(index.files)||index.files.length>1000)fail('CD_MANUAL_MATERIAL');
  const expected=[];
  for(const f of index.files){
   if(typeof f.path!=='string'||!f.path||f.path.includes('\\')||f.path.startsWith('/')||f.path.split('/').some(p=>!p||p==='.'||p==='..'))fail('CD_MANUAL_MATERIAL');
   const matches=actual.filter(a=>a.path===f.path||(actual===transport&&a.path===path.basename(f.path)));if(matches.length!==1||matches[0].bytes.length!==f.size||sha256Bytes(matches[0].bytes)!==f.sha256)fail('CD_MANUAL_MATERIAL');expected.push(matches[0]);
  }
  if(new Set(expected).size!==expected.length||actual.length!==expected.length+1)fail('CD_MANUAL_MATERIAL');
 }
 if(v2){
  const ds=manifest.designSystem;if(!ds||ds.tool!=='claude-design'||!['current','bound','none'].includes(ds.choice)||typeof ds.sourceRef!=='string'||!ds.sourceRef.trim()||(ds.choice!=='none'&&(typeof ds.configurationRef!=='string'||!ds.configurationRef.trim()))||!Array.isArray(manifest.designSystemAssets)||!index||index.schema!=='claude-design-materials-v2')fail('CD_MANUAL_DESIGN_SYSTEM');
  for(const key of ['designSystem','designSystemRef','designSystemAssets'])if(!same(index[key],manifest[key]))fail('CD_MANUAL_DESIGN_SYSTEM');
  for(const r of manifest.designSystemAssets)take(r);const localIndex=take(manifest.materialsRef);if(!localIndex.equals(indexFile.bytes))fail('CD_MANUAL_MATERIAL');
  for(const f of index.files)take({path:path.join(path.dirname(manifest.materialsRef.path),f.path),sha256:f.sha256});
  const dsBytes=actual.find(a=>a.path==='design-system.json')?.bytes;if(!dsBytes||!same(JSON.parse(dsBytes),{schema:'claude-design-system-v1',designSystem:ds,designSystemRef:manifest.designSystemRef,designSystemAssets:manifest.designSystemAssets}))fail('CD_MANUAL_DESIGN_SYSTEM');
  if(!manifest.instructions.includes('design-system.json')||!manifest.instructions.includes(JSON.stringify(ds.sourceRef)))fail('CD_MANUAL_DESIGN_SYSTEM');
 }
 return {manifest,refs,bindingKind:'stage-transport-manifest',designSystemStatus:v2?'frozen-confirmation-reference':'legacy-unspecified',materialCount:actual.length};
}

function inspectRequest(request,options,requireSelection=true){
 const zip=typeof request.downloadRef?.path==='string'&&/\.zip$/i.test(request.downloadRef.path);
 if(zip&&typeof request.exportEntryPath!=='string')fail('CD_EXPORT_ENTRY_SELECTION_REQUIRED');
 exact(request,['requestId','manifestRef','handoffId','downloadRef','selectionRef','directory','implementationManifestRef',...(zip?['exportEntryPath']:[])]);
 if(!safeId(request.requestId)||!safeId(request.handoffId))fail('CD_MANUAL_REQUEST');const read=reader(options),bound=inspectBinding(request.manifestRef,request.handoffId,read),bytes=zip?read(request.downloadRef):html(request.downloadRef,read),archive=zip?inspectClaudeDesignExportArchive(bytes,{entryPath:request.exportEntryPath}):null;witness(request.selectionRef,read);
 if(requireSelection&&(typeof options.authenticateSelection!=='function'||options.authenticateSelection({requestId:request.requestId,handoffId:request.handoffId,manifestRef:request.manifestRef,packet:bound.manifest.packet,materialRefs:bound.refs,downloadRef:request.downloadRef,selectionRef:request.selectionRef,scope:bound.manifest.scope,target:bound.manifest.target??null,artifactAssurance:'user-attested',...(zip?{exportArchiveRef:request.downloadRef,exportEntryPath:archive.entryPath,exportInventory:archive.inventory}:{})})!==true))fail('CD_MANUAL_SELECTION_REQUIRED');
 const original=bound.manifest.scope.kind!=='new-design';if(original&&!request.implementationManifestRef)fail('CD_MANUAL_EDIT_MANIFEST_REQUIRED');
 if(request.implementationManifestRef){const edits=JSON.parse(read(request.implementationManifestRef));exact(edits,['schema_version','edits']);if(edits.schema_version!==1||!Array.isArray(edits.edits))fail('CD_MANUAL_EDIT_MANIFEST_REQUIRED');}
 return {bound,bytes,archive,original,readRefs:read.refs};
}

function bundleFor(directory,archive){return {asset_root:path.join(directory,'content'),entry_relative:archive.entryPath,closure:archive.inventory};}
function writeBundle(directory,archive){
 const bundle=bundleFor(directory,archive),directories=new Set([directory,bundle.asset_root]);fs.mkdirSync(bundle.asset_root,{mode:0o700});
 for(const member of archive.files){const file=path.join(bundle.asset_root,member.path);let parent=path.dirname(file);const missing=[];while(!directories.has(parent)){missing.push(parent);parent=path.dirname(parent);}for(const d of missing.reverse()){fs.mkdirSync(d,{mode:0o700});directories.add(d);}writeExact(file,member.bytes);}
 return {bundle,directories:[...directories].sort((a,b)=>b.length-a.length)};
}
function verifyBundleTree(directory,bundle){
 const expectedFiles=new Set(['recovery.json','export.zip',...bundle.closure.map(f=>'content/'+f.path)]),expectedDirectories=new Set(['content']);
 for(const file of bundle.closure){const parts=('content/'+file.path).split('/');for(let i=1;i<parts.length;i++)expectedDirectories.add(parts.slice(0,i).join('/'));}
 if(fs.realpathSync(directory)!==directory||!fs.lstatSync(directory).isDirectory()||fs.lstatSync(directory).isSymbolicLink())fail('CD_EXPORT_RETAINED_INVENTORY');
 const found=new Set();const walk=(dir,relative='')=>{for(const name of fs.readdirSync(dir)){const r=relative?relative+'/'+name:name,file=path.join(dir,name),stat=fs.lstatSync(file);if(stat.isSymbolicLink())fail('CD_EXPORT_RETAINED_INVENTORY');if(stat.isDirectory()){if(!expectedDirectories.has(r))fail('CD_EXPORT_RETAINED_INVENTORY');walk(file,r);}else if(stat.isFile()){if(!expectedFiles.has(r))fail('CD_EXPORT_RETAINED_INVENTORY');found.add(r);}else fail('CD_EXPORT_RETAINED_INVENTORY');}};walk(directory);
 if(found.size!==expectedFiles.size||[...expectedFiles].some(f=>!found.has(f)))fail('CD_EXPORT_RETAINED_INVENTORY');
}

export function recoverClaudeDesignDownload(input,options={}){
 const request={...input,implementationManifestRef:input.implementationManifestRef??null};const {bound,bytes,archive,original}=inspectRequest(request,options);fresh(request.directory);
 const receiptPath=path.join(request.directory,'recovery.json');
 if(fs.existsSync(request.directory)){
  if(!fs.existsSync(receiptPath))fail('CD_MANUAL_DIRECTORY_EXISTS');
  // A scope-aware caller already saved the exact ref from the first import.
  // Never bootstrap its hash by reading bytes before authorizeRead can run.
  if(archive||options.authorizeRead||options.existingReceiptRef){
   const receiptRef=options.existingReceiptRef;
   if(!receiptRef||receiptRef.path!==receiptPath)fail('CD_MANUAL_RECEIPT_REFERENCE_REQUIRED');
   const existing=verifyClaudeDesignRecovery(receiptRef,options);
   if(!same(existing.receipt.request,request))fail('CD_MANUAL_RECOVERY_CONFLICT');return existing;
  }
  if(fs.realpathSync(receiptPath)!==receiptPath||!fs.lstatSync(receiptPath).isFile())fail('CD_MANUAL_DIRECTORY_EXISTS');
  const fd=fs.openSync(receiptPath,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);let existingBytes;try{if(fs.fstatSync(fd).size>2*1024*1024)fail('CD_MANUAL_RECEIPT');existingBytes=fs.readFileSync(fd);}finally{fs.closeSync(fd);}
  const receiptRef={path:receiptPath,sha256:sha256Bytes(existingBytes)};const existing=verifyClaudeDesignRecovery(receiptRef,options);
  if(!same(existing.receipt.request,request))fail('CD_MANUAL_RECOVERY_CONFLICT');return existing;
 }
 fs.mkdirSync(request.directory,{mode:0o700});let recoveredHTMLRef,exportBundle,retainedArchiveRef,directories;
 if(archive){retainedArchiveRef=writeExact(path.join(request.directory,'export.zip'),bytes);({bundle:exportBundle,directories}=writeBundle(request.directory,archive));recoveredHTMLRef={path:path.join(exportBundle.asset_root,exportBundle.entry_relative),sha256:sha256Bytes(archive.entry.bytes)};}else recoveredHTMLRef=writeExact(path.join(request.directory,'index.html'),bytes);
 const receipt={schema:archive?'claude-design-manual-recovery-v2':'claude-design-manual-recovery-v1',source:'claude-design',provenance:'manual-download',status:'IMPORTED',request,
  handoffId:request.handoffId,bindingKind:bound.bindingKind,hostStageVerified:false,remoteMaterialAcceptanceVerified:false,
  packet:bound.manifest.packet,materialRefs:bound.refs,materialCount:bound.materialCount,designSystemStatus:bound.designSystemStatus,
  artifact:{assurance:'user-attested',knownTarget:bound.manifest.target??null,selectionRef:request.selectionRef},revisionKind:'export-content',revision:request.downloadRef.sha256,remoteRevisionVerified:false,
  downloadRef:request.downloadRef,recoveredHTMLRef,implementationManifestRef:request.implementationManifestRef,mechanicalAcceptance:original?'PENDING_FIDELITY':'NOT_APPLICABLE',semanticAcceptance:'PENDING_INDEPENDENT_REVIEW',designComplete:false,scriptsExecuted:false,...(archive?{retainedArchiveRef,exportBundle}:{})};
 const receiptRef=writeExact(receiptPath,encode(receipt));if(archive)for(const directory of directories)fs.chmodSync(directory,0o500);return verifyClaudeDesignRecovery(receiptRef,options);
}

export function verifyClaudeDesignRecovery(receiptRef,options={}){
 const read=reader(options),receipt=JSON.parse(read(receiptRef));
 const zip=receipt.schema==='claude-design-manual-recovery-v2';
 exact(receipt,['schema','source','provenance','status','request','handoffId','bindingKind','hostStageVerified','remoteMaterialAcceptanceVerified','packet','materialRefs','materialCount','designSystemStatus','artifact','revisionKind','revision','remoteRevisionVerified','downloadRef','recoveredHTMLRef','implementationManifestRef','mechanicalAcceptance','semanticAcceptance','designComplete','scriptsExecuted',...(zip?['retainedArchiveRef','exportBundle']:[])]);
 if(!['claude-design-manual-recovery-v1','claude-design-manual-recovery-v2'].includes(receipt.schema)||receipt.source!=='claude-design'||receipt.provenance!=='manual-download'||receipt.status!=='IMPORTED'||receipt.hostStageVerified!==false||receipt.remoteMaterialAcceptanceVerified!==false||receipt.remoteRevisionVerified!==false||receipt.revisionKind!=='export-content'||receipt.revision!==receipt.downloadRef.sha256||receipt.designComplete!==false||receipt.scriptsExecuted!==false||receipt.semanticAcceptance!=='PENDING_INDEPENDENT_REVIEW')fail('CD_MANUAL_RECEIPT');
 const {bound,bytes,archive,original,readRefs}=inspectRequest(receipt.request,options,options.authenticateSelection!==undefined);
 const expectedEntry=archive?path.join(receipt.request.directory,'content',archive.entryPath):path.join(receipt.request.directory,'index.html');
 if(zip!==Boolean(archive)||receiptRef.path!==path.join(receipt.request.directory,'recovery.json')||receipt.recoveredHTMLRef.path!==expectedEntry||!same(receipt.downloadRef,receipt.request.downloadRef)||!same(receipt.implementationManifestRef,receipt.request.implementationManifestRef)||!same(receipt.packet,bound.manifest.packet)||!same(receipt.materialRefs,bound.refs)||receipt.materialCount!==bound.materialCount||receipt.bindingKind!==bound.bindingKind||receipt.designSystemStatus!==bound.designSystemStatus||receipt.handoffId!==receipt.request.handoffId||!same(receipt.artifact,{assurance:'user-attested',knownTarget:bound.manifest.target??null,selectionRef:receipt.request.selectionRef})||receipt.mechanicalAcceptance!==(original?'PENDING_FIDELITY':'NOT_APPLICABLE'))fail('CD_MANUAL_RECEIPT');
 if(archive){
  const expectedBundle=bundleFor(receipt.request.directory,archive),expectedArchive={path:path.join(receipt.request.directory,'export.zip'),sha256:receipt.downloadRef.sha256};
  if(!same(receipt.exportBundle,expectedBundle)||!same(receipt.retainedArchiveRef,expectedArchive)||receipt.recoveredHTMLRef.sha256!==sha256Bytes(archive.entry.bytes))fail('CD_MANUAL_RECEIPT');
  verifyBundleTree(receipt.request.directory,expectedBundle);
  if(!read(receipt.retainedArchiveRef).equals(bytes))fail('CD_MANUAL_RECEIPT');
  for(const member of archive.files){const ref={path:path.join(expectedBundle.asset_root,member.path),sha256:sha256Bytes(member.bytes)};if(!read(ref).equals(member.bytes))fail('CD_MANUAL_RECEIPT');}
 }else if(!read(receipt.recoveredHTMLRef).equals(bytes))fail('CD_MANUAL_RECEIPT');
 return {status:'IMPORTED',source:'claude-design',provenance:'manual-download',receiptRef,receipt,entry:receipt.recoveredHTMLRef.path,sha256:receipt.recoveredHTMLRef.sha256,base:{entry:receipt.recoveredHTMLRef.path,sha256:receipt.recoveredHTMLRef.sha256,origin:'claude-design'},semanticAcceptance:receipt.semanticAcceptance,mechanicalAcceptance:receipt.mechanicalAcceptance,designComplete:false,selectionAuthenticity:options.authenticateSelection?'CALLER_VERIFIED':'NOT_VERIFIED',authority:'NOT_PROVIDED',readRefs:[...read.refs,...readRefs],...(archive?{bundle:receipt.exportBundle,runtime_requirements:archive.dependencyProof.runtime_requirements}:{})};
}
