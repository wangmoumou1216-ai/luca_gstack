import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
import {locateOriginalEditRanges, verifyOriginalEditedOutput} from '../../scripts/original-template-edits.mjs';
import {appendBoundBehavior} from '../../scripts/original-composition.mjs';
import {createCarrierPacket} from '../../scripts/carrier-packet.mjs';
import {prepareOriginalCopyHandoff} from '../../scripts/original-copy-handoff.mjs';

// NO_PIN regression: exact original incident source, no product redesign or live OD.
const out=path.dirname(new URL(import.meta.url).pathname);
const hash=b=>createHash('sha256').update(b).digest('hex');
const source=await fs.readFile('/private/tmp/workbuddy-marketing-AI.html');
const base=await fs.readFile(new URL('../../.claude/skill-os/page-library/sources/originals/crm-workbench-home.html',import.meta.url));
assert.equal(hash(source),'068f140011273ddadaa8b4c90f824814c20309b0a5b537ea9c41f180f75e4b5c');
assert.equal(hash(base),'7a30a15978929ede4177e213f1090cb4d3860e5b2ef33509434cfff7879631e5');
const runId=randomUUID(),startedAt=new Date().toISOString();
const server=await chromium.launchServer({headless:true});
const browser=await chromium.connect(server.wsEndpoint()),results=[],errors=[],requests=[];
const record=(id,actual)=>results.push({id,status:'PASS',actual,observed_at:new Date().toISOString()});
try {
  const parser=await browser.newPage();
  const modules=await parser.evaluate(html=>[...new DOMParser().parseFromString(html,'text/html').querySelectorAll('.wb-workspace-tab')].map(n=>({key:n.dataset.workspace,title:n.textContent.trim()})),source.toString());
  assert.equal(modules.length,6);await parser.close();
  // Remove only the platform injection; preserve the source business scripts.
  const clean=source.toString().replace(/<script[^>]*src="\/page\/page_comm\/inject\.js"[^>]*><\/script>/,'');
  assert.notEqual(clean,source.toString());
  const ids=modules.map((_,i)=>'REAL-NAV-'+(i+1));
  const common={scope:[],confidence:'high',rationale:'Original incident six workspaces in CRM menu.',alternatives:[]};
  const actions=[{...common,action_id:'NAV',action:'add',locator:{kind:'attribute',name:'id',value:'crmMenuList'},source_ids:ids},{...common,action_id:'MOUNT',action:'add',locator:{kind:'attribute',name:'id',value:'workspaceCard'},source_ids:ids}];
  const plainActions=actions.map(({action_id,action,scope,locator})=>({action_id,action,scope,locator}));
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  const edits=[{action_id:'NAV',html:modules.map(m=>'<li><button type="button" class="crm-menu-item" data-menu="'+escape(m.title)+'" data-real-workspace="'+m.key+'"><span class="menu-text">'+escape(m.title)+'</span></button></li>').join('')},{action_id:'MOUNT',html:'<div id="real-workspace-mount" hidden></div>'}];
  const encoded=Buffer.from(clean).toString('base64');
  const bridge=Buffer.from('(()=>{const menu=document.getElementById("crmMenuList"),mount=document.getElementById("workspaceCard"),group=document.getElementById("real-workspace-mount");const originals=[...mount.children].filter(n=>n!==group);const frame=document.createElement("iframe");frame.title="标讯业务工作区";frame.style.cssText="width:100%;height:900px;border:0";frame.src=URL.createObjectURL(new Blob([new TextDecoder().decode(Uint8Array.from(atob("'+encoded+'"),c=>c.charCodeAt(0)))],{type:"text/html"}));group.appendChild(frame);let pending=null;frame.addEventListener("load",()=>{const d=frame.contentDocument,s=d.createElement("style");s.textContent=".wb-workspace-tab-list{display:none}";d.head.appendChild(s);if(pending)frame.contentWindow.setWorkspace(pending)});menu.addEventListener("click",e=>{const b=e.target.closest(".crm-menu-item");if(!b)return;pending=b.dataset.realWorkspace||null;group.hidden=!pending;originals.forEach(n=>n.hidden=Boolean(pending));if(pending&&frame.contentWindow.setWorkspace)frame.contentWindow.setWorkspace(pending)});})();');
  const binding={id:'original-incident-adapter',source_ids:ids,source_ref:'WorkBuddy incident HTML SHA '+hash(source),mount_action_id:'MOUNT',acceptance_ids:ids,bytes:bridge};
  await fs.writeFile(path.join(out,'real-source-adapter.js'),bridge);
  const ranges=(await locateOriginalEditRanges(base,plainActions,{browser,executionProfile:'original-composition-v1'})).targets;
  let text=base.toString();for(const e of [...edits].sort((a,b)=>ranges.find(r=>r.action_id===b.action_id).closeStart-ranges.find(r=>r.action_id===a.action_id).closeStart)){const r=ranges.find(r=>r.action_id===e.action_id);text=text.slice(0,r.closeStart)+e.html+text.slice(r.closeStart)}
  const output=appendBoundBehavior(Buffer.from(text),[binding]);
  assert.equal((await verifyOriginalEditedOutput({base,output,actions:plainActions,edits,executionProfile:'original-composition-v1',behaviorBindings:[binding]},{browser})).status,'PASS');
  await fs.writeFile(path.join(out,'real-source-composition.html'),output);
  const packetBody=createCarrierPacket({schema_version:1,packet_kind:'design-generation',items:ids.map((id,i)=>({source_kind:'decision',id,text:modules[i].title})),scopes:[]});
  const bundle=await prepareOriginalCopyHandoff({pageId:'crm-workbench-home',packetBody,target:{tool:'od',projectId:'no-pin-regression-only'},handoffId:'original-incident-regression',actions,executionProfile:'original-composition-v1',behaviorBindings:[binding]},{browser});
  assert.equal(bundle.files.find(f=>f.path==='input/behavior/original-incident-adapter.js').sha256,hash(bridge));record('REAL-SOURCE-TRANSPORT',{bundle_hash:bundle.handoff_bundle_hash,external_run:'NOT_RUN'});
  const required=['REAL-SOURCE-TRANSPORT',...ids,'REAL-SEARCH-STATE','REAL-SETTINGS','REAL-KEYBOARD','REAL-ORIGINAL-RETURN','REAL-RUNTIME'];
  const manifest={schema_version:1,project_identity:{project:'NO_PIN',fixture_id:'original-incident-regression'},source_revision:{source_sha256:hash(source),template_sha256:hash(base),output_sha256:hash(output)},approved_scope_ref:{path:path.resolve(out,'../workflow-executability-release-plan.md'),sha256:hash(await fs.readFile(path.resolve(out,'../workflow-executability-release-plan.md')))},surface:{url:'http://real-source.test/',browser:browser.version(),headless:true},instance_probe:{pid:server.process().pid,instance_id:runId},launch:{argv:['chromium.launchServer',{headless:true}],cwd:process.cwd()},drive:{driver_ref:{path:new URL(import.meta.url).pathname,sha256:hash(await fs.readFile(new URL(import.meta.url)))},argv:process.argv},test_data:{seed_ref:{path:'/private/tmp/workbuddy-marketing-AI.html',sha256:hash(source)},data_root:'isolated ephemeral Playwright context; no production data'},coverage:required.map(id=>({feature:id,entry:id==='REAL-SOURCE-TRANSPORT'?'prepareOriginalCopyHandoff':'CRM menu/source UI',state:id==='REAL-RUNTIME'?'runtime-error-and-network-state':'assertion result',assert_ids:[id]})),evidence_location:out,cleanup:{owned_resources:[{kind:'process',pid:server.process().pid},{kind:'browser-context',instance_id:runId}],preserve_evidence:true}};
  const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2));await fs.writeFile(path.join(out,'real-source-manifest.json'),manifestBytes);
  const context=await browser.newContext({serviceWorkers:'block'});await context.route('**/*',r=>{if(r.request().url()==='http://real-source.test/')return r.fulfill({contentType:'text/html',body:output});requests.push(r.request().url());return r.abort()});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const response=await page.goto('http://real-source.test/');
  const probe=async()=>({observed_at:new Date().toISOString(),instance_id:runId,pid:server.process().pid,alive:server.process().exitCode===null,url:page.url(),response_sha256:hash(await response.body()),source_sha256:hash(await fs.readFile('/private/tmp/workbuddy-marketing-AI.html')),template_sha256:hash(await fs.readFile(new URL('../../.claude/skill-os/page-library/sources/originals/crm-workbench-home.html',import.meta.url))),behavior_sha256:hash(await page.locator('script[data-luca-behavior="original-incident-adapter"]').textContent()),menu_count:await page.locator('[data-real-workspace]').count(),errors:[...errors],requests:[...requests]});
  const before=await probe();assert.equal(before.response_sha256,hash(output));assert.equal(before.behavior_sha256,hash(bridge));assert.equal(before.menu_count,6);assert.equal(before.alive,true);
  await fs.writeFile(path.join(out,'real-source-before.json'),JSON.stringify(before,null,2));
  const frame=page.frameLocator('iframe[title="标讯业务工作区"]');
  for(const [i,m] of modules.entries()){
    await page.locator('[data-real-workspace="'+m.key+'"]').click();await frame.locator('.workspace-panel.active[data-workspace-panel="'+m.key+'"]').waitFor({state:'visible'});assert.equal(await frame.locator('.workspace-panel.active').count(),1);
    const panel=frame.locator('.workspace-panel[data-workspace-panel="'+m.key+'"]'),ai=panel.locator('[data-ai]').first();assert.ok(await panel.locator('.wb-card').count()>0);
    if(await ai.count()){await ai.click();await frame.locator('#aiModal.open').waitFor({state:'visible'});await frame.locator('#closeModal').click();assert.equal(await frame.locator('#aiModal').isVisible(),false)}
    record('REAL-NAV-'+(i+1),{key:m.key,title:m.title,cards:await panel.locator('.wb-card').count(),ai_action:await ai.count()>0});
  }
  const first=modules[0],last=modules.at(-1);
  await page.locator('[data-real-workspace="'+first.key+'"]').click();const search=frame.locator('.workspace-panel.active .list-search').first();await search.fill('不匹配的回归测试');assert.equal(await frame.locator('.workspace-panel.active .notice-tbody tr:visible').count(),0);
  await page.locator('[data-real-workspace="'+last.key+'"]').click();await page.locator('[data-real-workspace="'+first.key+'"]').click();assert.equal(await search.inputValue(),'不匹配的回归测试');await search.fill('');record('REAL-SEARCH-STATE','filtered source rows and field retained across CRM navigation');
  await frame.locator('#openSettings').click();await frame.locator('#canvasSettings.open').waitFor({state:'visible'});await frame.locator('[data-mode="dark"]').click();assert.equal(await frame.locator('html').getAttribute('data-theme'),'dark');await frame.locator('#closeSettings').click();await page.locator('[data-real-workspace="'+last.key+'"]').click();assert.equal(await frame.locator('html').getAttribute('data-theme'),'dark');record('REAL-SETTINGS','source settings retained');
  await page.locator('[data-real-workspace="'+first.key+'"]').focus();await page.keyboard.press('Enter');await frame.locator('.workspace-panel.active[data-workspace-panel="'+first.key+'"]').waitFor({state:'visible'});record('REAL-KEYBOARD','Enter activates real business workspace');
  await page.locator('#crmSearch').fill(first.title);assert.equal(await page.locator('[data-real-workspace="'+first.key+'"]').isVisible(),true);await page.locator('#crmSearch').fill('');await page.locator('.crm-menu-item:not([data-real-workspace])').first().click();assert.equal(await page.locator('#real-workspace-mount').isVisible(),false);record('REAL-ORIGINAL-RETURN','original CRM menu/content restored');
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);record('REAL-RUNTIME','no page errors or external network');
  await page.screenshot({path:path.join(out,'real-source-composition.png'),fullPage:true});
  const after=await probe();assert.equal(after.response_sha256,hash(output));assert.equal(after.behavior_sha256,hash(bridge));assert.equal(after.alive,true);await fs.writeFile(path.join(out,'real-source-after.json'),JSON.stringify(after,null,2));await context.close();await browser.close();await server.close();
  assert.deepEqual(results.map(r=>r.id),required);
  const retained=['real-source-composition.html','real-source-adapter.js','real-source-composition.png','real-source-before.json','real-source-after.json','real-source-manifest.json'];
  const evidence_refs=await Promise.all(retained.map(async name=>({path:path.join(out,name),sha256:hash(await fs.readFile(path.join(out,name)))})));
  assert.equal(hash(await fs.readFile('/private/tmp/workbuddy-marketing-AI.html')),hash(source));
  await fs.writeFile(path.join(out,'real-source-results.json'),JSON.stringify({status:'PASS',scope:'NO_PIN framework real-source regression',run_id:runId,started_at:startedAt,ended_at:new Date().toISOString(),manifest_sha256:hash(manifestBytes),source_assert_ids:required,verified_instance:{before,after},driver_revision:manifest.drive.driver_ref,operations:[{argv:process.argv,cwd:process.cwd(),started_at:startedAt,ended_at:after.observed_at,exit_code:0,source_assert_ids:required}],evidence_refs,cleanup_result:{context_closed:true,owned_server_closed:true,remaining_owned_resources:[],post_cleanup_readback:'all retained files read and hashed'},remaining_gaps:[],source_sha256:hash(source),template_sha256:hash(base),output_sha256:hash(output),adapter_sha256:hash(bridge),driver_sha256:hash(await fs.readFile(new URL(import.meta.url))),results,errors,requests,not_run:['live OD','UI redesign','original product acceptance']},null,2));
  console.log('PASS real-source composition: '+results.length+' assertions; six actual modules, source business actions, state, keyboard, original return');
}finally{await browser.close();await server.close()}
