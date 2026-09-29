import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, renameSync, chmodSync, symlinkSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const installer=fileURLToPath(new URL('./install-codex-source-guard.mjs',import.meta.url));
function fixture(t) {
 const base=mkdtempSync(join(realpathSync(tmpdir()), 'source-preserve-'));t.after(()=>rmSync(base,{recursive:true,force:true}));
 const roots=['a','b'].map(name=>join(base,name)),dest=join(base,'guard');
 for(const root of roots){for(const dir of ['memory/scripts','.claude/skill-os','.claude/skills/office','.claude/agents'])mkdirSync(join(root,dir),{recursive:true});writeFileSync(join(root,'CLAUDE.md'),'rules');writeFileSync(join(root,'main.mjs'),'export const version=1;');}
 const run=(args=[])=>spawnSync(process.execPath,[installer,'--test-dest',dest,...args],{env:{...process.env,NODE_ENV:'test'},encoding:'utf8'});
 assert.equal(run(roots.flatMap(root=>['--root',root])).status,0);
 const manifest=()=>JSON.parse(readFileSync(join(dest,'manifest.json'),'utf8'));
 return {base,roots,dest,run,manifest};
}
test('preserve mode updates one root without reading or approving another changed source',t=>{
 const f=fixture(t),old=f.manifest(),other=old.roots[1];
 writeFileSync(join(f.roots[0],'main.mjs'),'export const version=2;');
 writeFileSync(join(f.roots[1],'main.mjs'),'export const unreviewed=true;');
 // A missing original source proves preserved roots are not scanned at all.
 renameSync(f.roots[1],`${f.roots[1]}-moved`);
 const result=f.run(['--root',f.roots[0],'--preserve-other-roots']);
 assert.equal(result.status,0,result.stderr);
 const next=f.manifest();assert.deepEqual(next.roots.map(r=>r.root),old.roots.map(r=>r.root));assert.equal(next.roots.length,2);assert.deepEqual(next.roots[1],other);
 assert.notEqual(next.roots[0].files['main.mjs'].sha256,old.roots[0].files['main.mjs'].sha256);
 assert.equal(readFileSync(join(f.dest,'roots',other.snapshot,'CLAUDE.md'),'utf8'),'rules');
});
test('preserve mode fails closed on invalid manifest, private paths, or changed runtime',t=>{
 for(const kind of ['schema','unknown','duplicate','traversal','manifest-mode','file-traversal','snapshot-symlink','loader','bootstrap']){
  const f=fixture(t),m=f.manifest();
  if(kind==='schema')m.schema_version=99;
  if(kind==='unknown')m.extra=true;
  if(kind==='duplicate')m.roots.push(m.roots[0]);
  if(kind==='traversal')m.roots[1].snapshot='../elsewhere';
  if(['schema','unknown','duplicate','traversal'].includes(kind))writeFileSync(join(f.dest,'manifest.json'),JSON.stringify(m));
  if(kind==='file-traversal'){m.roots[1].files['../evil.mjs']={sha256:'0'.repeat(64),format:'module'};writeFileSync(join(f.dest,'manifest.json'),JSON.stringify(m));}
  if(kind==='manifest-mode')chmodSync(join(f.dest,'manifest.json'),0o666);
  if(kind==='snapshot-symlink'){const p=join(f.dest,'roots',m.roots[1].snapshot);renameSync(p,`${p}-old`);symlinkSync(`${p}-old`,p);}
  if(['loader','bootstrap'].includes(kind))writeFileSync(join(f.dest,`${kind}.mjs`),'// changed');
  const before=readFileSync(join(f.dest,'manifest.json'));
  const r=f.run(['--root',f.roots[0],'--preserve-other-roots']);assert.notEqual(r.status,0,kind);
  assert.deepEqual(readFileSync(join(f.dest,'manifest.json')),before,kind);
 }
});

test('preserve dry run validates without writing and requires an explicit target',t=>{
 const f=fixture(t),before=readFileSync(join(f.dest,'manifest.json'));
 assert.notEqual(f.run(['--preserve-other-roots']).status,0);
 const r=f.run(['--root',f.roots[0],'--preserve-other-roots','--dry-run']);assert.equal(r.status,0,r.stderr);
 assert.deepEqual(readFileSync(join(f.dest,'manifest.json')),before);
 assert.equal(JSON.parse(r.stdout).preserve_other_roots,true);
});
