import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, statSync,
  rmSync, existsSync, appendFileSync, symlinkSync, chmodSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const script = fileURLToPath(new URL('./migrate-host-launch-journal.mjs', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = path => { const s=statSync(path); return {realpath:path,dev:String(s.dev),ino:String(s.ino)}; };
function fixture(t) {
  const base=realpathSync(mkdtempSync(join(tmpdir(),'journal-migration-')));
  t.after(()=>rmSync(base,{recursive:true,force:true}));
  const root=join(base,'repo'),home=join(base,'home'),sourceRoot=join(home,'.codex');
  const journal=join(root,'.claude','host-launch'),sessions=join(sourceRoot,'sessions','2026','09','29');
  mkdirSync(journal,{recursive:true});mkdirSync(sessions,{recursive:true});chmodSync(sourceRoot,0o700);
  const sid=randomUUID(),launch=randomUUID();
  const transcript=join(sessions,`rollout-2026-09-29T00-00-00-${sid}.jsonl`);
  const meta=JSON.stringify({type:'session_meta',payload:{id:sid,session_id:sid,cwd:root,thread_source:'user',parent_thread_id:null,forked_from_id:null}})+'\n';
  writeFileSync(transcript,meta);
  const ts=statSync(transcript),cursor={schema_version:1,harness:'codex',transcript_path:transcript,
    dev:String(ts.dev),ino:String(ts.ino),byte_offset:Buffer.byteLength(meta),record_index:1,prefix_sha256:hash(meta)};
  const grant={schemaVersion:1,provider:'codex',launchId:launch,sessionId:sid,cwd:root,
    sourceRoot:identity(sourceRoot),profileId:'default',configRevision:'old',sourceId:'default-source'};
  const sourcePath=join(journal,`${launch}.source.json`),sourceBytes=Buffer.from(JSON.stringify(grant));writeFileSync(sourcePath,sourceBytes);
  const statePath=join(root,'.claude',`.session-project-${sid}`);
  const state={schema_version:3,state:'NO_PIN',session_id:sid,host_launch_source:{launch_id:launch,sha256:hash(sourceBytes)},
    event_control:{current:null,consumed_events:[],candidates:[],cursor,
      fence:{schema_version:1,session_id:sid,harness:'codex',cwd:root,source_absent:false,cursor}}};
  writeFileSync(statePath,JSON.stringify(state));
  const history={launchId:launch,launchNonce:'retired-secret',claimHandle:'retired-handle',sid,status:'CANCELLED',
    request:{operationId:randomUUID(),profileIdentity:{provider:'codex',sourceRoot:identity(sourceRoot),profileId:'default',configRevision:'old',sourceId:'default-source'}}};
  const historyPath=join(journal,`${launch}.json`);writeFileSync(historyPath,JSON.stringify(history));
  const unbound=randomUUID();writeFileSync(join(journal,`${unbound}.json`),JSON.stringify({launchId:unbound,sid:null,status:'DISPATCHED',launchNonce:'old',request:{operationId:randomUUID()}}));
  const preload=join(base,'home.cjs');writeFileSync(preload,`const os=require('node:os'), old=os.userInfo;os.userInfo=()=>({...old(),homedir:${JSON.stringify(home)}});require('node:module').syncBuiltinESMExports();`);
  const manifest=join(base,'plan.json');
  const run=args=>spawnSync(process.execPath,['--require',preload,script,...args],{encoding:'utf8',timeout:15000,env:{...process.env,NODE_OPTIONS:'',CODEX_HOME:join(base,'untrusted-override')}});
  const plan=()=>{const r=run(['--root',root,'--plan',manifest]);assert.equal(r.status,0,r.stderr);return JSON.parse(readFileSync(manifest));};
  const apply=()=>run(['--apply',manifest,'--expected-sha256',hash(readFileSync(manifest))]);
  return {base,root,home,journal,sourceRoot,sid,launch,sourcePath,sourceBytes,statePath,state,historyPath,history,transcript,manifest,run,plan,apply};
}
test('reviewed default-home migration preserves source/state and copies deny-only history idempotently',t=>{
  const f=fixture(t),stateBefore=readFileSync(f.statePath),historyBefore=readFileSync(f.historyPath),plan=f.plan();
  assert.equal(existsSync(plan.destination),false,'plan must not create authority directories');
  const r=f.apply();assert.equal(r.status,0,r.stderr);
  const receipt=JSON.parse(r.stdout);assert.equal(receipt.verified,3);assert.equal(receipt.source_receipts,1);assert.equal(receipt.execution_authority,'NOT_PROVIDED');
  assert.deepEqual(readFileSync(f.statePath),stateBefore);assert.deepEqual(readFileSync(f.historyPath),historyBefore);
  assert.deepEqual(readFileSync(join(plan.destination,`${f.launch}.source.json`)),f.sourceBytes);
  const history=JSON.parse(readFileSync(join(plan.destination,`${f.launch}.json`)));
  assert.equal(history.request.operationId,f.history.request.operationId);assert.equal(history.status,'CANCELLED');
  assert.equal(Object.hasOwn(history,'launchNonce'),false);assert.equal(Object.hasOwn(history,'claimHandle'),false);
  assert.equal(statSync(plan.destination).mode&0o777,0o700);
  assert.equal(statSync(join(plan.destination,`${f.launch}.source.json`)).mode&0o777,0o600);
  const again=f.apply();assert.equal(again.status,0,again.stderr);assert.equal(JSON.parse(again.stdout).migrated,0);
});
for(const kind of ['source','state','native-prefix','native-replacement','target-conflict','target-symlink','directory-mode','manifest-hash']) {
 test(`migration refuses ${kind} drift without changing the original state`,t=>{
  const f=fixture(t),plan=f.plan();
  if(kind==='source')appendFileSync(f.sourcePath,' ');
  if(kind==='state')appendFileSync(f.statePath,' ');
  if(kind==='native-prefix')writeFileSync(f.transcript,readFileSync(f.transcript,'utf8').replace('thread_source','other_source_'));
  if(kind==='native-replacement'){const bytes=readFileSync(f.transcript);renameSync(f.transcript,f.transcript+'.old');writeFileSync(f.transcript,bytes);}
  if(kind.startsWith('target-')||kind==='directory-mode'){
   mkdirSync(plan.destination,{recursive:true,mode:0o700});
   if(kind==='target-conflict')writeFileSync(join(plan.destination,`${f.launch}.source.json`),'conflict',{mode:0o600});
   if(kind==='target-symlink')symlinkSync(f.sourcePath,join(plan.destination,`${f.launch}.source.json`));
   if(kind==='directory-mode')chmodSync(plan.destination,0o755);
  }
  const before=readFileSync(f.statePath);
  const r=kind==='manifest-hash'?f.run(['--apply',f.manifest,'--expected-sha256','0'.repeat(64)]):f.apply();
  assert.notEqual(r.status,0,kind);assert.equal(r.error,undefined);assert.deepEqual(readFileSync(f.statePath),before);
 });
}
test('migration never expands the independently trusted default source root',t=>{
 const f=fixture(t),other=join(f.base,'other');mkdirSync(other);
 const grant=JSON.parse(readFileSync(f.sourcePath));grant.sourceRoot=identity(other);writeFileSync(f.sourcePath,JSON.stringify(grant));
 const history=JSON.parse(readFileSync(f.historyPath));history.request.profileIdentity.sourceRoot=identity(other);writeFileSync(f.historyPath,JSON.stringify(history));
 const state=JSON.parse(readFileSync(f.statePath));state.host_launch_source.sha256=hash(readFileSync(f.sourcePath));writeFileSync(f.statePath,JSON.stringify(state));
 const r=f.run(['--root',f.root,'--plan',f.manifest]);assert.notEqual(r.status,0);assert.match(r.stderr,/only independently verified default Codex home/);
 assert.equal(existsSync(f.manifest),false);
});
test('a failed partial installation can resume without overwriting previously copied entries',t=>{
 const f=fixture(t),plan=f.plan();mkdirSync(plan.destination,{recursive:true,mode:0o700});
 const first=plan.entries.find(e=>e.kind==='history'),history=JSON.parse(readFileSync(join(f.journal,first.name)));delete history.launchNonce;delete history.claimHandle;
 const bytes=Buffer.from(JSON.stringify(history)),target=join(plan.destination,first.name);writeFileSync(target,bytes,{mode:0o600});
 const r=f.apply();assert.equal(r.status,0,r.stderr);assert.deepEqual(readFileSync(target),bytes);assert.equal(JSON.parse(r.stdout).migrated,2);
});

test('a missing source still referenced by a preserved session prevents planning',t=>{
 const f=fixture(t);rmSync(f.sourcePath);
 const r=f.run(['--root',f.root,'--plan',f.manifest]);assert.notEqual(r.status,0);assert.match(r.stderr,/referenced source receipt is missing/);
 assert.equal(existsSync(f.manifest),false);
});
test('a write fault cannot publish an empty target and a normal retry recovers',t=>{
 const f=fixture(t),plan=f.plan(),preload=join(f.base,'home.cjs');
 const original=readFileSync(preload,'utf8');
 appendFileSync(preload, `
const fs=require('node:fs'), open=fs.openSync, write=fs.writeFileSync;const blocked=new Set();
fs.openSync=(p,...a)=>{const fd=open(p,...a);if(String(p).includes('host-launch/')&&String(p).includes('.luca-migrate-'))blocked.add(fd);return fd;};
fs.writeFileSync=(fd,...a)=>{if(blocked.has(fd))throw Object.assign(new Error('injected write fault'),{code:'EIO'});return write(fd,...a);};
require('node:module').syncBuiltinESMExports();`);
 const failed=f.apply();assert.notEqual(failed.status,0);assert.match(failed.stderr,/injected write fault/);
 for(const entry of plan.entries)assert.equal(existsSync(join(plan.destination,entry.name)),false);
 writeFileSync(preload,original);
 const retried=f.apply();assert.equal(retried.status,0,retried.stderr);assert.equal(JSON.parse(retried.stdout).migrated,3);
});
