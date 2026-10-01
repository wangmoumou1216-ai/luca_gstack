import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, renameSync, chmodSync,
  symlinkSync, rmSync, existsSync, realpathSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { freezeSourceGuardReview, installFrozenSourceGuard, installTestSourceGuard,
  frozenManifestSha } from './source-guard-test-fixture.mjs';
import { sha256 } from './source-guard-review.mjs';
const installer=fileURLToPath(new URL('./install-codex-source-guard.mjs',import.meta.url));
function fixture(t,{hook=false}={}) {
 const base=mkdtempSync(join(realpathSync(tmpdir()),'source-preserve-'));t.after(()=>rmSync(base,{recursive:true,force:true}));
 const roots=['a','b'].map(name=>join(base,name)),dest=join(base,'guard');
 for(const root of roots){
  for(const dir of ['memory/scripts','.claude/skill-os','.claude/skills/office','.claude/agents','.claude/hooks','scripts','.codex'])mkdirSync(join(root,dir),{recursive:true});
  writeFileSync(join(root,'CLAUDE.md'),'rules');writeFileSync(join(root,'main.mjs'),'export const version=1;');
  writeFileSync(join(root,'.claude/skill-os/rules.json'),'{"rule":1}');
  if(hook){writeFileSync(join(root,'.codex/hooks.json'),'{}');writeFileSync(join(root,'scripts/source.py'),'print(1)\n');}
 }
 const freeze=(targets=roots)=>freezeSourceGuardReview({roots:targets,destination:dest,directory:base});
 const install=(review,targets=roots,options={})=>installFrozenSourceGuard({roots:targets,destination:dest,review,...options});
 const initial=freeze();const result=install(initial);assert.equal(result.status,0,result.stderr);
 const manifest=()=>JSON.parse(readFileSync(join(dest,'manifest.json'),'utf8'));
 const run=args=>spawnSync(process.execPath,[installer,'--test-dest',dest,...args],{env:{...process.env,NODE_ENV:'test'},encoding:'utf8'});
 return {base,roots,dest,freeze,install,initial,manifest,run};
}
function unchanged(f,before) {assert.deepEqual(readFileSync(join(f.dest,'manifest.json')),before);}
function denied(result,pattern) {assert.notEqual(result.status,0,result.stdout);if(pattern)assert.match(result.stderr,pattern);}
function freezeMutatedArtifact(f,mutate){const review=f.freeze();const artifact=JSON.parse(review.bytes);mutate(artifact);const bytes=Buffer.from(`${JSON.stringify(artifact,null,2)}\n`);writeFileSync(review.file,bytes);return {...review,bytes,artifact,sha256:sha256(bytes)};}

test('preserve updates one root without reading or approving another changed/missing source',t=>{
 const f=fixture(t),old=f.manifest(),other=old.roots[1],runtime=['bootstrap.mjs','loader.mjs'].map(name=>readFileSync(join(f.dest,name)));
 writeFileSync(join(f.roots[0],'main.mjs'),'export const version=2;');writeFileSync(join(f.roots[1],'main.mjs'),'export const unreviewed=true;');renameSync(f.roots[1],`${f.roots[1]}-moved`);
 const review=f.freeze([f.roots[0]]),result=f.install(review,[f.roots[0]],{preserveOtherRoots:true});assert.equal(result.status,0,result.stderr);
 const next=f.manifest();assert.deepEqual(next.roots.map(r=>r.root),old.roots.map(r=>r.root));assert.deepEqual(next.roots[1],other);
 assert.notEqual(next.roots[0].files['main.mjs'].sha256,old.roots[0].files['main.mjs'].sha256);
 assert.equal(readFileSync(join(f.dest,'roots',other.snapshot,'CLAUDE.md'),'utf8'),'rules');
 for(const [i,name]of ['bootstrap.mjs','loader.mjs'].entries())assert.deepEqual(readFileSync(join(f.dest,name)),runtime[i]);
 assert.deepEqual(readFileSync(join(f.dest,'roots',next.roots[0].snapshot,'.codex/reviewed-install.json')),review.bytes);
});
test('review is deterministic, byte-bound, exact-schema, all content maps and root-order bound',t=>{
 const f=fixture(t,{hook:true}),a=f.freeze(),b=f.freeze();assert.deepEqual(a.bytes,b.bytes);
 const before=readFileSync(join(f.dest,'manifest.json'));
 const mutations=[
  ['schema',x=>x.extra=true],['bootstrap',x=>x.bootstrap_sha256='0'.repeat(64)],['loader',x=>x.loader_sha256='0'.repeat(64)],
  ['JS',x=>x.roots[0].files['main.mjs'].sha256='0'.repeat(64)],['format',x=>x.roots[0].files['main.mjs'].format='commonjs'],
  ['snapshot',x=>x.roots[0].snapshot_files['CLAUDE.md']='0'.repeat(64)],['source',x=>x.roots[0].source_files['scripts/source.py']='0'.repeat(64)],
  ['source SHA',x=>x.roots[0].source_sha256='0'.repeat(64)],['hooks',x=>x.roots[0].hooks_sha256='0'.repeat(64)],
  ['root-order',x=>x.roots.reverse()],['traversal',x=>x.roots[0].snapshot_files['../outside']='0'.repeat(64)],
 ];
 for(const [name,mutate]of mutations){const review=freezeMutatedArtifact(f,mutate);denied(f.install(review),/review|artifact/i);unchanged(f,before);assert.equal(existsSync(join(f.dest,'.install.lock')),false,name);}
 const original=f.freeze();writeFileSync(original.file,`${original.bytes} `);denied(f.install(original),/REVIEW_SHA_MISMATCH/);unchanged(f,before);
 const missing=f.run(f.roots.flatMap(root=>['--root',root]));denied(missing,/ARGUMENT_INVALID/);
});
test('source, snapshot, config drift after freeze refuses without publishing',t=>{
 for(const file of ['main.mjs','.claude/skill-os/rules.json','scripts/source.py','.codex/hooks.json']){
  const f=fixture(t,{hook:true}),review=f.freeze(),before=readFileSync(join(f.dest,'manifest.json'));
  writeFileSync(join(f.roots[0],file),'changed');denied(f.install(review),/REVIEW_MISMATCH/);unchanged(f,before);
 }
});
test('single-root candidate mapping changes only canonical deployment identity',t=>{
 const f=fixture(t),result=f.run(['--print-review','--root',f.roots[0],'--as-root',f.roots[1]]);assert.equal(result.status,0,result.stderr);
 const actual=JSON.parse(result.stdout),original=f.freeze([f.roots[0]]).artifact;
 assert.equal(actual.roots[0].root,f.roots[1]);actual.roots[0].root=f.roots[0];assert.deepEqual(actual,original);
 denied(f.run(['--root',f.roots[0],'--as-root',f.roots[1]]),/ARGUMENT_INVALID/);
 denied(f.run(['--print-review',...f.roots.flatMap(root=>['--root',root]),'--as-root',f.roots[0]]),/ARGUMENT_INVALID/);
});
test('preserve refuses invalid manifest/private paths/runtime and corrupt prior reviewed snapshots',t=>{
 for(const kind of ['schema','unknown','duplicate','traversal','manifest-mode','file-traversal','snapshot-symlink','loader','bootstrap','snapshot-bytes','reviewed-bytes']){
  const f=fixture(t),review=f.freeze([f.roots[0]]),m=f.manifest();
  if(kind==='schema')m.schema_version=99;if(kind==='unknown')m.extra=true;if(kind==='duplicate')m.roots.push(m.roots[0]);if(kind==='traversal')m.roots[1].snapshot='../elsewhere';
  if(kind==='file-traversal')m.roots[1].files['../evil.mjs']={sha256:'0'.repeat(64),format:'module'};
  if(['schema','unknown','duplicate','traversal','file-traversal'].includes(kind))writeFileSync(join(f.dest,'manifest.json'),JSON.stringify(m));
  if(kind==='manifest-mode')chmodSync(join(f.dest,'manifest.json'),0o666);
  if(kind==='snapshot-symlink'){const p=join(f.dest,'roots',m.roots[1].snapshot);renameSync(p,`${p}-old`);symlinkSync(`${p}-old`,p);}
  if(['loader','bootstrap'].includes(kind))writeFileSync(join(f.dest,`${kind}.mjs`),'// changed');
  if(kind==='snapshot-bytes')writeFileSync(join(f.dest,'roots',m.roots[1].snapshot,'CLAUDE.md'),'changed');
  if(kind==='reviewed-bytes')writeFileSync(join(f.dest,'roots',m.roots[1].snapshot,'.codex/reviewed-install.json'),'{}');
  const before=readFileSync(join(f.dest,'manifest.json'));review.expectedManifestSha=sha256(before);
  denied(f.install(review,[f.roots[0]],{preserveOtherRoots:true}));unchanged(f,before);
 }
});
test('dry run makes no snapshots or locks and stale manifest CAS is rejected',t=>{
 const f=fixture(t),before=readFileSync(join(f.dest,'manifest.json')),snapshots=readdirSync(join(f.dest,'roots'));
 const review=f.freeze([f.roots[0]]);const r=f.install(review,[f.roots[0]],{preserveOtherRoots:true,dryRun:true});assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).dry_run,true);
 unchanged(f,before);assert.deepEqual(readdirSync(join(f.dest,'roots')),snapshots);assert.equal(existsSync(join(f.dest,'.install.lock')),false);
 denied(f.run(['--preserve-other-roots']),/ARGUMENT_INVALID/);
 review.expectedManifestSha='ABSENT';denied(f.install(review,[f.roots[0]],{preserveOtherRoots:true}),/MANIFEST_CHANGED/);unchanged(f,before);assert.deepEqual(readdirSync(join(f.dest,'roots')),snapshots);
});

// This preload changes real fs builtins before ESM captures them. It never adds a production fault API.
function preload(f) {
 const path=join(f.base,'barrier.mjs');writeFileSync(path,`
 import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';
 const original={renameSync:fs.renameSync,openSync:fs.openSync,readFileSync:fs.readFileSync,writeFileSync:fs.writeFileSync,fsyncSync:fs.fsyncSync};
 const wait=()=>{original.writeFileSync(process.env.BARRIER_READY,'ready');const stop=Date.now()+20000;while(!fs.existsSync(process.env.BARRIER_GO)){if(Date.now()>stop)throw new Error('barrier timeout');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);}};
 let used=false,committed=false,lockFd=-1;const mode=process.env.BARRIER_MODE;
 fs.renameSync=(from,to)=>{if(to===process.env.BARRIER_MANIFEST && !used && ['before','after','throw-after','throw-fsync-after'].includes(mode)){used=true;if(mode==='before')wait();const result=original.renameSync(from,to);committed=true;if(mode==='after')wait();if(mode==='throw-after')throw new Error('post-rename failure');return result;}return original.renameSync(from,to);};
 fs.openSync=(path,...args)=>{if(!used && typeof path==='string' && ((mode==='before-temp' && path.startsWith(process.env.BARRIER_MANIFEST+'.')) || (mode==='copy-target' && path.includes('/roots/') && path.endsWith('/.claude/skill-os/rules.json') && ((args[0]&fs.constants.O_WRONLY)!==0)))){used=true;wait();}const fd=original.openSync(path,...args);if(typeof path==='string'&&path.endsWith('/.install.lock')&&((args[0]&fs.constants.O_WRONLY)!==0))lockFd=fd;return fd;};
 fs.readFileSync=(fd,...args)=>{if(!used && mode==='copy-source' && typeof fd==='number'){try{const stat=fs.fstatSync(fd),target=fs.statSync(process.env.BARRIER_SOURCE);if(stat.dev===target.dev&&stat.ino===target.ino){used=true;wait();}}catch{}}return original.readFileSync(fd,...args);};
 fs.fsyncSync=(fd)=>{if(mode==='throw-fsync-after'&&committed)throw new Error('post-commit fsync failure');if(mode==='throw-lock-fsync'&&fd===lockFd&&!used){used=true;throw new Error('lock fsync failure');}return original.fsyncSync(fd);};
 const stdoutWrite=process.stdout.write;
 process.stdout.write=function(chunk,...args){
  if(!used&&String(chunk).includes('"installed": true')&&['stdout','stdout-pipe','stdout-callback-error'].includes(mode)){
   used=true;const callback=args.at(-1);
   if(mode==='stdout-callback-error'){process.nextTick(()=>{const error=new Error('stdout callback failure');error.code='EIO';callback(error);});return false;}
   if(mode==='stdout-pipe')wait();
   const forwarded=args.slice(0,-1);forwarded.push(error=>{if(mode==='stdout')wait();callback(error);});
   return stdoutWrite.call(this,chunk,...forwarded);
  }
  return stdoutWrite.call(this,chunk,...args);
 };
 syncBuiltinESMExports();
 `);return path;
}
function argsFor(f,review,roots){return [installer,...roots.flatMap(root=>['--root',root]),'--test-dest',f.dest,'--reviewed-file',review.file,'--reviewed-sha',review.sha256,'--expected-manifest-sha',review.expectedManifestSha,'--preserve-other-roots'];}
function startBarrier(f,review,mode,{source}={}) {
 const ready=join(f.base,`${mode}-ready`),go=join(f.base,`${mode}-go`),nodeArgs=['--import',preload(f)];
 const env={...process.env,NODE_ENV:'test',BARRIER_MODE:mode,BARRIER_READY:ready,BARRIER_GO:go,BARRIER_MANIFEST:join(f.dest,'manifest.json'),...(source?{BARRIER_SOURCE:source}:{})};
 const child=spawn(process.execPath,[...nodeArgs,...argsFor(f,review,[f.roots[0]])],{env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);
 const done=new Promise(resolve=>child.on('close',(status,signal)=>resolve({status,signal,stdout,stderr})));
 return {child,ready,go,done};
}
async function readyAt(barrier){const end=Date.now()+20000;while(!existsSync(barrier.ready)){if(Date.now()>end)throw new Error(`child barrier did not arrive: ${JSON.stringify(await Promise.race([barrier.done,Promise.resolve(null)]))}`);await new Promise(resolve=>setTimeout(resolve,10));}}
function recover(f,expected=frozenManifestSha(f.dest),lockSha=sha256(readFileSync(join(f.dest,'.install.lock')))){return f.run(['--recover-lock-sha',lockSha,'--expected-manifest-sha',expected]);}

test('real concurrent installer refuses live lock, then stale CAS after first commit',async t=>{
 const f=fixture(t),before=readFileSync(join(f.dest,'manifest.json'));writeFileSync(join(f.roots[0],'main.mjs'),'export const version=2;');
 const a=f.freeze([f.roots[0]]),b=f.freeze([f.roots[0]]),barrier=startBarrier(f,a,'before');await readyAt(barrier);
 const snapshots=readdirSync(join(f.dest,'roots'));denied(f.install(b,[f.roots[0]],{preserveOtherRoots:true}),/LOCK_BUSY/);unchanged(f,before);assert.deepEqual(readdirSync(join(f.dest,'roots')),snapshots);
 denied(recover(f),/LOCK_LIVE/);writeFileSync(barrier.go,'go');const result=await barrier.done;assert.equal(result.status,0,result.stderr);
 const after=readFileSync(join(f.dest,'manifest.json'));denied(f.install(b,[f.roots[0]],{preserveOtherRoots:true}),/MANIFEST_CHANGED/);unchanged(f,after);
});
test('real SIGKILL before/after manifest commit preserves authoritative old/full-new and exact dead-lock recovery',async t=>{
 for(const mode of ['before','after']){
  const f=fixture(t),before=readFileSync(join(f.dest,'manifest.json'));writeFileSync(join(f.roots[0],'main.mjs'),'export const version=2;');const review=f.freeze([f.roots[0]]);
  const barrier=startBarrier(f,review,mode);await readyAt(barrier);barrier.child.kill('SIGKILL');const crash=await barrier.done;assert.equal(crash.signal,'SIGKILL');
  const after=readFileSync(join(f.dest,'manifest.json'));if(mode==='before')assert.deepEqual(after,before);else{assert.notDeepEqual(after,before);const row=f.manifest().roots[0];assert.deepEqual(readFileSync(join(f.dest,'roots',row.snapshot,'.codex/reviewed-install.json')),review.bytes);}
  denied(recover(f,frozenManifestSha(f.dest),'0'.repeat(64)),/LOCK_CHANGED/);
  denied(recover(f,'0'.repeat(64)),/MANIFEST_CHANGED/);assert.equal(existsSync(join(f.dest,'.install.lock')),true);
  const success=recover(f);assert.equal(success.status,0,success.stderr);unchanged(f,after);assert.equal(existsSync(join(f.dest,'.install.lock')),false);
  const retried={...review,expectedManifestSha:frozenManifestSha(f.dest)};assert.equal(f.install(retried,[f.roots[0]],{preserveOtherRoots:true}).status,0);
 }
});
test('malformed, symlink, broad-permission, live/EPERM locks cannot be recovered',t=>{
 for(const kind of ['malformed','symlink','mode','live','EPERM']){
  const f=fixture(t),before=readFileSync(join(f.dest,'manifest.json')),lock=join(f.dest,'.install.lock');
  writeFileSync(lock,JSON.stringify({schema_version:1,kind:'luca-source-guard-install-lock',pid:process.pid,nonce:'12345678-1234-1234-1234-123456789012',roots:[f.roots[0]],expected_manifest_sha:frozenManifestSha(f.dest)}),{mode:0o600});
  if(kind==='malformed')writeFileSync(lock,'{}');if(kind==='mode')chmodSync(lock,0o666);
  if(kind==='symlink'){renameSync(lock,`${lock}-real`);symlinkSync(`${lock}-real`,lock);}
  if(kind==='EPERM'){
   const patch=join(f.base,'eperm.mjs');writeFileSync(patch,"process.kill=()=>{const e=new Error('denied');e.code='EPERM';throw e;};");
   const result=spawnSync(process.execPath,['--import',patch,installer,'--test-dest',f.dest,'--recover-lock-sha',sha256(readFileSync(lock)),'--expected-manifest-sha',frozenManifestSha(f.dest)],{env:{...process.env,NODE_ENV:'test'},encoding:'utf8'});denied(result,/EPERM/);
  }else denied(recover(f));
  unchanged(f,before);assert.equal(existsSync(lock),true);
 }
});
test('pre-commit source, copied snapshot and manifest/runtime drift refuse publication under real preload fences',async t=>{
 for(const kind of ['snapshot','copied-snapshot','source','manifest','runtime']){
  const f=fixture(t,{hook:true}),before=readFileSync(join(f.dest,'manifest.json'));const review=f.freeze([f.roots[0]]),barrier=startBarrier(f,review,'before-temp');await readyAt(barrier);
  let expected=before;
  if(kind==='snapshot')writeFileSync(join(f.roots[0],'.claude/skill-os/rules.json'),'{"rule":2}');
  if(kind==='copied-snapshot'){const old=new Set(f.manifest().roots.map(row=>row.snapshot)),staged=readdirSync(join(f.dest,'roots')).find(name=>!old.has(name));writeFileSync(join(f.dest,'roots',staged,'CLAUDE.md'),'copied drift');}
  if(kind==='source')writeFileSync(join(f.roots[0],'scripts/source.py'),'print(2)');
  if(kind==='manifest'){expected=Buffer.from(`${before} `);writeFileSync(join(f.dest,'manifest.json'),expected);}
  if(kind==='runtime')writeFileSync(join(f.dest,'loader.mjs'),'changed');
  writeFileSync(barrier.go,'go');const result=await barrier.done;denied(result,/SOURCE_CHANGED|SNAPSHOT_CHANGED|MANIFEST_CHANGED|RUNTIME_CHANGED/);unchanged(f,expected);assert.equal(existsSync(join(f.dest,'.install.lock')),false);
 }
});
test('drift during a real snapshot copy refuses before commit',async t=>{
 const f=fixture(t),before=readFileSync(join(f.dest,'manifest.json')),review=f.freeze([f.roots[0]]),barrier=startBarrier(f,review,'copy-target');
 await readyAt(barrier);writeFileSync(join(f.roots[0],'CLAUDE.md'),'changed during copy');writeFileSync(barrier.go,'go');
 const result=await barrier.done;denied(result,/SOURCE_CHANGED/);unchanged(f,before);assert.equal(existsSync(join(f.dest,'.install.lock')),false);
});
test('post-rename exception reports committed authoritative outcome and rollback needs fresh CAS',t=>{
 const f=fixture(t),oldReview=f.freeze([f.roots[0]]),oldSource=readFileSync(join(f.roots[0],'main.mjs')),other=f.manifest().roots[1];
 writeFileSync(join(f.roots[0],'main.mjs'),'export const version=2;');const review=f.freeze([f.roots[0]]);
 const result=f.install(review,[f.roots[0]],{preserveOtherRoots:true,nodeArgs:['--import',preload(f)],env:{BARRIER_MODE:'throw-after',BARRIER_MANIFEST:join(f.dest,'manifest.json')}});
 denied(result,/post-rename failure/);const receipt=JSON.parse(result.stderr.trim());assert.equal(receipt.committed,true);assert.equal(receipt.durability_verified,false);
 const current=readFileSync(join(f.dest,'manifest.json'));assert.notEqual(sha256(current),oldReview.expectedManifestSha);assert.equal(existsSync(join(f.dest,'.install.lock')),false);
 writeFileSync(join(f.roots[0],'main.mjs'),oldSource);denied(f.install(oldReview,[f.roots[0]],{preserveOtherRoots:true}),/MANIFEST_CHANGED/);unchanged(f,current);
 const rollback={...oldReview,expectedManifestSha:frozenManifestSha(f.dest)};const restored=f.install(rollback,[f.roots[0]],{preserveOtherRoots:true});assert.equal(restored.status,0,restored.stderr);assert.deepEqual(f.manifest().roots[1],other);
});
test('post-commit directory fsync failure reports committed but unverified durability',t=>{
 const f=fixture(t),review=f.freeze([f.roots[0]]);
 const result=f.install(review,[f.roots[0]],{preserveOtherRoots:true,nodeArgs:['--import',preload(f)],env:{BARRIER_MODE:'throw-fsync-after',BARRIER_MANIFEST:join(f.dest,'manifest.json')}});
 denied(result,/post-commit fsync failure/);const receipt=JSON.parse(result.stderr.trim());assert.equal(receipt.committed,true);assert.equal(receipt.durability_verified,false);assert.equal(receipt.authoritative_manifest_sha256,frozenManifestSha(f.dest));assert.equal(existsSync(join(f.dest,'.install.lock')),false);
});
test('a normal lock fsync exception removes only this exact lock and changes no installed state',t=>{
 const f=fixture(t),before=readFileSync(join(f.dest,'manifest.json')),snapshots=readdirSync(join(f.dest,'roots')),review=f.freeze([f.roots[0]]);
 const result=f.install(review,[f.roots[0]],{preserveOtherRoots:true,nodeArgs:['--import',preload(f)],env:{BARRIER_MODE:'throw-lock-fsync',BARRIER_MANIFEST:join(f.dest,'manifest.json')}});
 denied(result,/lock fsync failure/);const receipt=JSON.parse(result.stderr.trim());assert.equal(receipt.committed,false);unchanged(f,before);assert.deepEqual(readdirSync(join(f.dest,'roots')),snapshots);assert.equal(existsSync(join(f.dest,'.install.lock')),false);
});
test('success output holds the live lock until its real stdout callback completes',async t=>{
 const f=fixture(t);writeFileSync(join(f.roots[0],'main.mjs'),'export const version=2;');
 const review=f.freeze([f.roots[0]]),barrier=startBarrier(f,review,'stdout');await readyAt(barrier);
 const current=readFileSync(join(f.dest,'manifest.json')),next=f.freeze([f.roots[0]]);
 assert.equal(existsSync(join(f.dest,'.install.lock')),true,'output must retain the lock');
 denied(f.install(next,[f.roots[0]],{preserveOtherRoots:true}),/LOCK_BUSY/);unchanged(f,current);
 writeFileSync(barrier.go,'go');const result=await barrier.done;assert.equal(result.status,0,result.stderr);
 assert.equal(JSON.parse(result.stdout).manifest_sha256,sha256(current));unchanged(f,current);assert.equal(existsSync(join(f.dest,'.install.lock')),false);
});
test('stdout callback and real closed-pipe failures retain authoritative commit facts and release owned lock',async t=>{
 for(const mode of ['stdout-callback-error','stdout-pipe']){
  const f=fixture(t),review=f.freeze([f.roots[0]]);let result;
  if(mode==='stdout-pipe'){
   const barrier=startBarrier(f,review,mode);await readyAt(barrier);barrier.child.stdout.destroy();writeFileSync(barrier.go,'go');result=await barrier.done;
  }else result=f.install(review,[f.roots[0]],{preserveOtherRoots:true,nodeArgs:['--import',preload(f)],env:{BARRIER_MODE:mode,BARRIER_MANIFEST:join(f.dest,'manifest.json')}});
  denied(result,/EIO|EPIPE/);const receipt=JSON.parse(result.stderr.trim());assert.equal(receipt.phase,'output');assert.equal(receipt.committed,true);assert.equal(receipt.durability_verified,true);assert.equal(receipt.authoritative_manifest_sha256,frozenManifestSha(f.dest));assert.equal(existsSync(join(f.dest,'.install.lock')),false);
 }
});
