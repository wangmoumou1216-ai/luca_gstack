#!/usr/bin/env node
// Publish only a frozen review, under a private lock and exact manifest CAS.
import { randomUUID } from 'node:crypto';
import { closeSync, constants, existsSync, fsyncSync, lstatSync,
  openSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, createReviewArtifact, equalArtifact, exactKeys, inside,
  parseReviewArtifact, privateDir, protectedBytes, safeRelative, sha256,
  snapshotInventory, sourceBytes } from './source-guard-review.mjs';

const scriptRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fail=(code,message)=>{const error=new Error(message);error.code=code;throw error;};
const hex=value=>typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
function writeResult(bytes) {
  return new Promise((resolve,reject)=>{
    const onError=error=>reject(error);
    process.stdout.once('error',onError);
    try {
      process.stdout.write(bytes,error=>{
        // Keep the error listener for the stream's error event after a failed callback.
        if(error)reject(error);
        else {process.stdout.removeListener('error',onError);resolve();}
      });
    }catch(error){process.stdout.removeListener('error',onError);reject(error);}
  });
}
function fsyncDir(path) { const fd=openSync(path,constants.O_RDONLY);try {fsyncSync(fd);}finally{closeSync(fd);} }
function writeNew(path,bytes) {
  const fd=openSync(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|(constants.O_NOFOLLOW||0),0o600);
  try {writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}
}
function manifestBytes(destination) {
  try {return protectedBytes(join(destination,'manifest.json'));}
  catch(error){if(error.code==='ENOENT')return null;throw error;}
}
const manifestSha=bytes=>bytes===null?'ABSENT':sha256(bytes);
function checkCas(destination,expected) {
  const bytes=manifestBytes(destination);
  if(manifestSha(bytes)!==expected)fail('MANIFEST_CHANGED','manifest does not match --expected-manifest-sha');
  return bytes;
}
function validateManifest(bytes,destination,bootstrap,loader) {
  privateDir(join(destination,'roots'));
  if(!protectedBytes(join(destination,'bootstrap.mjs')).equals(bootstrap)
      || !protectedBytes(join(destination,'loader.mjs')).equals(loader))fail('RUNTIME_CHANGED','installed bootstrap or loader differs');
  let value;try{value=JSON.parse(bytes);}catch{fail('MANIFEST_INVALID','invalid installed manifest JSON');}
  if(!exactKeys(value,['schema_version','loader_sha256','roots']) || value.schema_version!==1
      || value.loader_sha256!==sha256(loader) || !Array.isArray(value.roots) || !value.roots.length)fail('MANIFEST_INVALID','invalid installed manifest');
  const seen=new Set();
  for(const row of value.roots){
    if(!exactKeys(row,['root','snapshot','files']) || typeof row.root!=='string' || !isAbsolute(row.root)
        || resolve(row.root)!==row.root || seen.has(row.root) || typeof row.snapshot!=='string'
        || !/^[a-f0-9]{64}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(row.snapshot) || row.snapshot.slice(0,64)!==sha256(Buffer.from(row.root))
        || !row.files || typeof row.files!=='object' || Array.isArray(row.files))fail('MANIFEST_INVALID','invalid installed root');
    seen.add(row.root);
    for(const [file,approval] of Object.entries(row.files))if(!safeRelative(file) || !/\.(?:mjs|js)$/.test(file)
        || !exactKeys(approval,['sha256','format']) || !hex(approval.sha256)
        || !['module','commonjs'].includes(approval.format))fail('MANIFEST_INVALID','invalid installed file approval');
    const snapshot=join(destination,'roots',row.snapshot);
    const inventory=snapshotInventory(snapshot);
    // Legacy snapshots can be preserved; reviewed snapshots must retain their byte binding.
    const reviewFile=join(snapshot,'.codex/reviewed-install.json');
    const approvalFile=join(snapshot,'.codex/hook-source-approval.json');
    if(existsSync(reviewFile) || existsSync(approvalFile)){
      const artifactBytes=protectedBytes(reviewFile),artifact=parseReviewArtifact(artifactBytes);
      const reviewed=artifact.roots.find(item=>item.root===row.root);
      if(!reviewed || artifact.bootstrap_sha256!==sha256(bootstrap) || artifact.loader_sha256!==sha256(loader)
          || !equalArtifact(row.files,reviewed.files)
          || !equalArtifact(snapshotInventory(snapshot,{excludeMetadata:true}),reviewed.snapshot_files))fail('SNAPSHOT_CHANGED','preserved snapshot differs from its review');
      if(reviewed.source_sha256!==null){
        const approval=JSON.parse(protectedBytes(approvalFile));
        if(!exactKeys(approval,['schema_version','kind','root','algorithm','sha256','artifact_sha256'])
            || approval.schema_version!==1 || approval.kind!=='luca-hook-source-approval'
            || approval.root!==row.root || approval.algorithm!=='shell-source-scan-v2'
            || approval.sha256!==reviewed.source_sha256 || approval.artifact_sha256!==sha256(artifactBytes))fail('APPROVAL_INVALID','preserved approval differs from review');
      }else if(existsSync(approvalFile))fail('APPROVAL_INVALID','generic root cannot have hook approval');
    }
    if(!Object.keys(inventory).length)fail('SNAPSHOT_INVALID','empty protected snapshot');
  }
  return value;
}
function validateLock(path) {
  const bytes=protectedBytes(path,{limit:64*1024});let value;
  try{value=JSON.parse(bytes);}catch{fail('LOCK_INVALID','invalid installation lock JSON');}
  if(!exactKeys(value,['schema_version','kind','pid','nonce','roots','expected_manifest_sha'])
      || value.schema_version!==1 || value.kind!=='luca-source-guard-install-lock'
      || !Number.isSafeInteger(value.pid) || value.pid<=0 || typeof value.nonce!=='string'
      || !/^[a-f0-9-]{36}$/.test(value.nonce) || !Array.isArray(value.roots) || !value.roots.length
      || new Set(value.roots).size!==value.roots.length
      || value.roots.some(root=>typeof root!=='string'||!isAbsolute(root)||resolve(root)!==root)
      || !(value.expected_manifest_sha==='ABSENT'||hex(value.expected_manifest_sha)))fail('LOCK_INVALID','invalid installation lock schema');
  return {bytes,value,stat:lstatSync(path)};
}
function removeSameLock(path,owned) {
  const current=validateLock(path);
  if(current.stat.dev!==owned.stat.dev || current.stat.ino!==owned.stat.ino
      || current.value.nonce!==owned.value.nonce || !current.bytes.equals(owned.bytes))fail('LOCK_CHANGED','installation lock changed');
  unlinkSync(path);fsyncDir(dirname(path));
}
function runtimeState(destination,bootstrap,loader) {
  const state={};
  for(const [name,bytes] of [['bootstrap.mjs',bootstrap],['loader.mjs',loader]]){
    const path=join(destination,name);
    if(existsSync(path)) {if(!protectedBytes(path).equals(bytes))fail('RUNTIME_CHANGED',`existing ${name} differs`);state[name]=true;}
    else state[name]=false;
  }
  return state;
}
function runtimeCas(destination,state,bootstrap,loader) {
  for(const [name,bytes] of [['bootstrap.mjs',bootstrap],['loader.mjs',loader]]){
    const path=join(destination,name);
    if(state[name] ? !protectedBytes(path).equals(bytes) : existsSync(path))fail('RUNTIME_CHANGED',`protected ${name} changed during installation`);
  }
}
function makeSnapshot(root,destination,row,artifactBytes,artifactSha) {
  privateDir(destination,true);
  for(const rel of ['memory','memory/scripts','.claude','.claude/skill-os','.claude/skills','.claude/skills/office','.claude/agents'])privateDir(join(destination,rel),true);
  for(const [file,expected] of Object.entries(row.snapshot_files)){
    const target=join(destination,file),parts=file.split('/');let folder=destination;
    for(const part of parts.slice(0,-1)){folder=join(folder,part);privateDir(folder,true);}
    const bytes=sourceBytes(join(root,file));
    if(sha256(bytes)!==expected)fail('SOURCE_CHANGED',`snapshot source changed: ${file}`);
    writeNew(target,bytes);
  }
  privateDir(join(destination,'.codex'),true);
  writeNew(join(destination,'.codex/reviewed-install.json'),artifactBytes);
  if(row.source_sha256!==null)writeNew(join(destination,'.codex/hook-source-approval.json'),Buffer.from(`${JSON.stringify({
    schema_version:1,kind:'luca-hook-source-approval',root:row.root,algorithm:'shell-source-scan-v2',
    sha256:row.source_sha256,artifact_sha256:artifactSha,
  })}\n`));
  if(!equalArtifact(snapshotInventory(destination,{excludeMetadata:true}),row.snapshot_files))fail('SNAPSHOT_CHANGED','copied snapshot differs from reviewed inventory');
  if(!protectedBytes(join(destination,'.codex/reviewed-install.json')).equals(artifactBytes))fail('SNAPSHOT_CHANGED','reviewed artifact changed after copy');
  if(row.source_sha256!==null){
    const approval=JSON.parse(protectedBytes(join(destination,'.codex/hook-source-approval.json')));
    if(!exactKeys(approval,['schema_version','kind','root','algorithm','sha256','artifact_sha256']) || approval.schema_version!==1
        || approval.kind!=='luca-hook-source-approval' || approval.root!==row.root || approval.algorithm!=='shell-source-scan-v2'
        || approval.sha256!==row.source_sha256 || approval.artifact_sha256!==artifactSha)fail('SNAPSHOT_CHANGED','copied approval differs');
  }
  function syncTree(folder){for(const entry of readdirSync(folder,{withFileTypes:true}))if(entry.isDirectory())syncTree(join(folder,entry.name));fsyncDir(folder);}
  syncTree(destination);
}

async function main(){
  const args=process.argv.slice(2),requestedRoots=[];
  let printReview=false,asRoot='',dryRun=false,preserve=false,testDest='',reviewedFile='',reviewedSha='',expected='',recover='';
  for(let index=0;index<args.length;index++){
    const arg=args[index];
    if(['--root','--as-root','--test-dest','--reviewed-file','--reviewed-sha','--expected-manifest-sha','--recover-lock-sha'].includes(arg)){
      if(!args[index+1])fail('ARGUMENT_INVALID',`incomplete argument: ${arg}`);const value=args[++index];
      if(arg==='--root')requestedRoots.push(value);
      else if(arg==='--as-root')asRoot=value;
      else if(arg==='--test-dest')testDest=value;
      else if(arg==='--reviewed-file')reviewedFile=value;
      else if(arg==='--reviewed-sha')reviewedSha=value;
      else if(arg==='--expected-manifest-sha')expected=value;
      else recover=value;
    }else if(arg==='--print-review')printReview=true;
    else if(arg==='--dry-run')dryRun=true;
    else if(arg==='--preserve-other-roots')preserve=true;
    else fail('ARGUMENT_INVALID',`unknown argument: ${arg}`);
  }
  if(asRoot && (!printReview || requestedRoots.length!==1))fail('ARGUMENT_INVALID','--as-root is only allowed with single-root --print-review');
  if(printReview && (dryRun||preserve||recover||reviewedFile||reviewedSha||expected))fail('ARGUMENT_INVALID','--print-review cannot be combined with installation options');
  if(recover && (requestedRoots.length||asRoot||dryRun||preserve||printReview||reviewedFile||reviewedSha))fail('ARGUMENT_INVALID','lock recovery does not install or approve roots');
  if(preserve && !requestedRoots.length)fail('ARGUMENT_INVALID','--preserve-other-roots requires explicit --root');
  if(!printReview && !(expected==='ABSENT'||hex(expected)))fail('ARGUMENT_INVALID','explicit --expected-manifest-sha is required');
  if(recover && !hex(recover))fail('ARGUMENT_INVALID','invalid --recover-lock-sha');
  if(!recover&&!printReview&&(!reviewedFile||!hex(reviewedSha)))fail('ARGUMENT_INVALID','explicit --reviewed-file and --reviewed-sha are required');
  const roots=recover?[]:(requestedRoots.length?requestedRoots:[scriptRoot]).map(path=>canonical(path));
  if(new Set(roots).size!==roots.length)fail('ARGUMENT_INVALID','duplicate source root');
  const bootstrap=sourceBytes(join(scriptRoot,'.codex/codex-source-guard-bootstrap.mjs')),
    loader=sourceBytes(join(scriptRoot,'.codex/codex-source-guard-loader.mjs'));
  if(printReview){process.stdout.write(`${JSON.stringify(await createReviewArtifact(roots,{bootstrap,loader,asRoot}),null,2)}\n`);return;}
  let destination=join(realpathSync(homedir()),'.codex/luca-child-project/source-guard');
  if(testDest){
    if(process.env.NODE_ENV!=='test'||!isAbsolute(testDest)||![realpathSync(tmpdir()),realpathSync('/tmp')].some(temp=>inside(resolve(testDest),temp))
        || [realpathSync(tmpdir()),realpathSync('/tmp')].includes(resolve(testDest)))fail('ARGUMENT_INVALID','--test-dest requires NODE_ENV=test and a child of OS temp');
    destination=resolve(testDest);privateDir(dirname(destination));
  }else{
    const home=canonical(homedir(),'user home'),stat=lstatSync(home);
    if(stat.uid!==process.getuid()||(stat.mode&0o022)!==0)fail('DIRECTORY_INVALID','user home writable by others');
    privateDir(join(home,'.codex'));privateDir(join(home,'.codex/luca-child-project'));
  }
  const lockPath=join(destination,'.install.lock');
  if(recover){
    privateDir(destination);const lock=validateLock(lockPath);
    if(sha256(lock.bytes)!==recover)fail('LOCK_CHANGED','lock does not match --recover-lock-sha');
    try{process.kill(lock.value.pid,0);fail('LOCK_LIVE','installation lock owner is live');}
    catch(error){if(error.code!=='ESRCH')throw error;}
    checkCas(destination,expected);removeSameLock(lockPath,lock);
    process.stdout.write(`${JSON.stringify({recovered_lock:true,destination,manifest_sha256:expected})}\n`);return;
  }
  const artifactBytes=sourceBytes(resolve(reviewedFile),{limit:64*1024*1024});
  if(sha256(artifactBytes)!==reviewedSha)fail('REVIEW_SHA_MISMATCH','reviewed artifact bytes do not match --reviewed-sha');
  const artifact=parseReviewArtifact(artifactBytes);
  if(!equalArtifact(await createReviewArtifact(roots,{bootstrap,loader}),artifact))fail('REVIEW_MISMATCH','actual source/runtime inventory differs from reviewed artifact');
  if(dryRun){
    if(existsSync(destination))privateDir(destination);
    const previousBytes=checkCas(destination,expected);
    if(previousBytes)validateManifest(previousBytes,destination,bootstrap,loader);
    else if(existsSync(destination))runtimeState(destination,bootstrap,loader);
    process.stdout.write(`${JSON.stringify({dry_run:true,destination,preserve_other_roots:preserve,artifact_sha256:reviewedSha,roots:artifact.roots.map(row=>({root:row.root,approved_js:Object.keys(row.files).length}))},null,2)}\n`);return;
  }
  privateDir(destination,true);
  let owned=null,prepared=null,phase='lock',committed=false,durable=false;
  const createdRuntime=[];
  try{
    const lockBytes=Buffer.from(`${JSON.stringify({schema_version:1,kind:'luca-source-guard-install-lock',pid:process.pid,nonce:randomUUID(),roots,expected_manifest_sha:expected})}\n`);
    try{writeNew(lockPath,lockBytes);}catch(error){if(error.code==='EEXIST'){
      validateLock(lockPath);fail('LOCK_BUSY','installation lock exists; exact dead-owner recovery is required');
    }
    // A completed write with a failed fsync is still our exact lock and can be released.
    try{const candidate=validateLock(lockPath);if(candidate.bytes.equals(lockBytes))owned=candidate;}catch{}
    throw error;}
    owned=validateLock(lockPath);fsyncDir(destination);
    phase='validate';const previousBytes=checkCas(destination,expected);
    const previous=previousBytes?validateManifest(previousBytes,destination,bootstrap,loader):null;
    const runtime=runtimeState(destination,bootstrap,loader);
    privateDir(join(destination,'roots'),true);
    const updated=artifact.roots.map(row=>({root:row.root,snapshot:`${sha256(Buffer.from(row.root))}-${randomUUID()}`,files:row.files}));
    phase='snapshot';
    for(let index=0;index<updated.length;index++)makeSnapshot(roots[index],join(destination,'roots',updated[index].snapshot),artifact.roots[index],artifactBytes,reviewedSha);
    fsyncDir(join(destination,'roots'));
    if(!equalArtifact(await createReviewArtifact(roots,{bootstrap,loader}),artifact))fail('SOURCE_CHANGED','source inventory changed before manifest publication');
    const replacements=new Map(updated.map(row=>[row.root,row]));
    const entries=preserve&&previous?previous.roots.map(row=>{const next=replacements.get(row.root);replacements.delete(row.root);return next||row;}).concat([...replacements.values()]):updated;
    prepared=Buffer.from(`${JSON.stringify({schema_version:1,loader_sha256:sha256(loader),roots:entries})}\n`);
    const temp=join(destination,`manifest.json.${randomUUID()}.tmp`);writeNew(temp,prepared);
    phase='commit';checkCas(destination,expected);runtimeCas(destination,runtime,bootstrap,loader);
    // Initialize identical runtime only; upgrading shared runtime needs separate review.
    for(const [name,bytes] of [['bootstrap.mjs',bootstrap],['loader.mjs',loader]])if(!runtime[name]){writeNew(join(destination,name),bytes);createdRuntime.push({path:join(destination,name),bytes,stat:lstatSync(join(destination,name))});}
    fsyncDir(destination);
    // Last check follows runtime creation and immediately precedes the only manifest publication.
    checkCas(destination,expected);
    for(const [name,bytes] of [['bootstrap.mjs',bootstrap],['loader.mjs',loader]])if(!protectedBytes(join(destination,name)).equals(bytes))fail('RUNTIME_CHANGED','runtime changed at commit');
    if(!equalArtifact(await createReviewArtifact(roots,{bootstrap,loader}),artifact))fail('SOURCE_CHANGED','source inventory changed at commit');
    validateManifest(prepared,destination,bootstrap,loader);
    renameSync(temp,join(destination,'manifest.json'));committed=true;
    fsyncDir(destination);durable=true;phase='readback';
    const authoritative=manifestBytes(destination);
    if(!authoritative?.equals(prepared))fail('READBACK_CHANGED','published manifest differs on readback');
    validateManifest(authoritative,destination,bootstrap,loader);
    phase='output';
    await writeResult(`${JSON.stringify({installed:true,committed:true,durability_verified:true,destination,preserve_other_roots:preserve,artifact_sha256:reviewedSha,manifest_sha256:sha256(authoritative),roots:entries.map(row=>({root:row.root,approved_js:Object.keys(row.files).length,snapshot:row.snapshot}))},null,2)}\n`);
    removeSameLock(lockPath,owned);owned=null;
  }catch(error){
    let authoritativeSha=null;
    try{const authoritative=manifestBytes(destination);authoritativeSha=manifestSha(authoritative);
      if(prepared)committed=authoritative?.equals(prepared)===true;}catch{if(prepared)committed=null;}
    if(committed===false)for(const item of createdRuntime){try{const stat=lstatSync(item.path);if(stat.dev===item.stat.dev&&stat.ino===item.stat.ino&&protectedBytes(item.path).equals(item.bytes))unlinkSync(item.path);}catch{}}
    let cleanupError=null;
    if(owned){try{removeSameLock(lockPath,owned);}catch(cleanup){cleanupError=cleanup.message;}}
    process.stderr.write(`${JSON.stringify({installed:false,committed,durability_verified:durable,authoritative_manifest_sha256:authoritativeSha,phase,code:error.code||'INSTALL_FAILED',error:error.message,...(cleanupError?{lock_cleanup_error:cleanupError}:{})})}\n`);
    process.exitCode=1;
  }
}
try{await main();}catch(error){process.stderr.write(`${JSON.stringify({installed:false,committed:false,code:error.code||'INSTALL_FAILED',error:error.message})}\n`);process.exitCode=1;}
