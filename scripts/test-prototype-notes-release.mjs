#!/usr/bin/env node
// Exercise the shipped HTML, including the edit transaction boundary, not a rebuilt fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium,firefox} from 'playwright';
import {core,extractNotes} from './prototype-notes.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const releaseRoot=path.join(repo,'framework-audit/2026-10-04-prototype-notes-implementation');
const manifest=JSON.parse(fs.readFileSync(path.join(releaseRoot,'release.json'),'utf8'));
const artifact=path.resolve(releaseRoot,manifest.artifact.path);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const html=fs.readFileSync(artifact,'utf8');
assert.equal(hash(html),manifest.artifact.sha256,'release artifact hash');
const extracted=await extractNotes(html);
assert.equal(extracted.ok,true,'shipped HTML must be readable by the shipped runtime: '+JSON.stringify(extracted));
const before=extracted.value.notes;
assert.equal(hash(extracted.value.source),manifest.source_sha256);
assert.equal(before.notes_revision,manifest.notes_revision);
assert.equal(before.annotations.length,manifest.annotation_count);
assert.equal(before.annotations.filter(a=>a.creation_origin==='manual').length,manifest.manual_count);
assert.deepEqual(before.generation_scope.units.map(u=>u.id),manifest.ai_scope);
assert.ok(fs.readFileSync(path.join(releaseRoot,'RELEASE.md'),'utf8').includes(manifest.artifact.path),'release link must identify the checked HTML');

// A self-consistent package with a different embedded runtime must fail the same reimport seam.
const staleBundle=structuredClone(extracted.value.bundle);staleBundle.runtime+='\n/* stale release */';
const stale=await core.assemble(staleBundle);assert.equal(stale.ok,true);
const rejected=await extractNotes(stale.value.html);assert.equal(rejected.ok,false);assert.equal(rejected.code,'UNKNOWN_VERSION');
assert.equal((await extractNotes(html)).ok,true);

const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'prototype-notes-release-'));
const results=[];
try {
 for(const [engine,type] of Object.entries({chromium,firefox})){
  const browser=await type.launch({headless:true});
  try {
   const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}});
   const page=await context.newPage();page.setDefaultTimeout(10000);
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/*',route=>route.request().url().startsWith('file:')?route.continue():route.abort());
   await page.goto(pathToFileURL(artifact).href);
   const host=page.locator('#luca-notes-host');
   const command=name=>host.locator(`[data-command="${name}"]`);
   await command('open').click();
   assert.equal(await host.locator('[data-card]').count(),before.annotations.length);
   assert.equal(await command('edit').count(),before.annotations.length);
   const expectedStatuses=before.annotations.filter(a=>!a.tombstone).map(a=>[a.evidence_status==='proposed'?'待确认':'',a.implementation_status==='not_demonstrated'?'原型未演示':''].filter(Boolean).join(' · ')).filter(Boolean);
   assert.deepEqual(await host.locator('.note-status').allTextContents(),expectedStatuses);
   const manual=before.annotations.find(a=>a.creation_origin==='manual'&&a.anchor&&!a.tombstone);
   const edit=()=>host.locator(`[data-command="edit"][data-id="${manual.id}"]`).click();
   const rebind=async()=>{await command('rebind').click();await command('pick-mode').click();await command('confirm-tree').click();};
   let sequence=0;
   const download=async()=>{
    const pending=page.waitForEvent('download');await command('download').click();const saved=await pending;
    const file=path.join(scratch,`${engine}-${sequence++}.html`);await saved.saveAs(file);
    const value=await extractNotes(fs.readFileSync(file,'utf8'));assert.equal(value.ok,true);
    assert.equal(value.value.source,extracted.value.source);return {file,...value.value};
   };
   await edit();await rebind();await command('cancel-edit').click();
   assert.deepEqual((await download()).notes,before,'cancel must discard rebind and all revision/history changes');
   await edit();await host.locator('[data-field="body"]').fill('');await rebind();await command('save').click();
   assert.equal(await host.locator('.panel').getAttribute('data-state'),'EDIT_FORM','invalid edit stays in draft');
   await command('cancel-edit').focus();await page.keyboard.press('Escape');
   assert.deepEqual((await download()).notes,before,'failed validation and Escape must not commit rebind');
   await edit();await rebind();await command('save').click();
   const saved=await download(),changed=saved.notes.annotations.find(a=>a.id===manual.id);
   assert.notEqual(changed.anchor.locator,manual.anchor.locator,'save commits the selected different target');
   assert.equal(changed.binding_revision,manual.binding_revision+1);
   assert.equal(saved.notes.notes_revision,before.notes_revision+1,'one edit is one transaction');
   assert.equal(changed.body,manual.body);assert.equal(changed.display_number,manual.display_number);
   assert.deepEqual(saved.notes.annotations.filter(a=>a.id!==manual.id),before.annotations.filter(a=>a.id!==manual.id));
   await page.goto(pathToFileURL(saved.file).href);await command('open').click();
   assert.equal(await host.locator('[data-card]').count(),before.annotations.length);
   assert.deepEqual((await download()).notes,saved.notes,'saved binding survives reopen and another download');
   await command('close').click();await page.locator('#tab-projects').click();
   assert.match(await page.locator('#tab-projects').getAttribute('class'),/active/,'closed notes preserve business navigation');
   assert.deepEqual(errors,[]);
   results.push({engine,cancel_rebind:'PASS',invalid_edit_escape:'PASS',save_rebind:'PASS',offline_reopen:'PASS',business_navigation:'PASS'});
  } finally {await browser.close();}
 }
} finally {fs.rmSync(scratch,{recursive:true,force:true});}
console.log(JSON.stringify({artifact_sha256:hash(html),integrity:'PASS',stale_runtime_rejected:'UNKNOWN_VERSION',results,limits:'Not native OS IME/zoom, recipient or Codex lifecycle evidence'}));
