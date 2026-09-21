import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { locateOriginalEditRanges, verifyOriginalEditedOutput } from './original-template-edits.mjs';
const browser = await chromium.launch({ headless: true });
const base = Buffer.from('<!doctype html><html><head><style>body{color:red}</style></head><body><nav id="keep">Original</nav><div id="edit">Before</div><script>window.originalBehavior=true;</script><template id="hidden"><p id="state">隐藏</p></template></body></html>');
const action = (kind, value = 'edit') => ({ action_id:'C-01', action:kind, scope:[], locator:{kind:'attribute',name:'id',value} });
const preserve = { ...action('preserve','keep'), action_id:'KEEP-01' };
const check = (actions, html, replace, code) => {
  const output = Buffer.from(base.toString().replace('Before', replace));
  const run = verifyOriginalEditedOutput({base,output,actions,edits:[{action_id:'C-01',html}]},{browser});
  return code ? assert.rejects(run,{code}) : run;
};
try {
  const ranges = await locateOriginalEditRanges(base,[action('modify'),preserve],{browser});
  assert.equal(ranges.targets.length,2);
  assert.equal(base.subarray(ranges.targets[0].start_byte,ranges.targets[0].end_byte).toString(),'<div id="edit">Before</div>');
  assert.equal((await check([action('modify'),preserve],'<b>After</b>','<b>After</b>')).status,'PASS');
  assert.equal((await check([action('add'),preserve],'<button>新增</button>','Before<button>新增</button>')).status,'PASS');
  const removed = Buffer.from(base.toString().replace('<div id="edit">Before</div>',''));
  assert.equal((await verifyOriginalEditedOutput({base,output:removed,actions:[action('remove'),preserve],edits:[{action_id:'C-01',html:''}]},{browser})).status,'PASS');
  await check([action('modify')],'<b>After</b>','<b>Wrong</b>','ORIGINAL_OUTSIDE_EDIT_CHANGED');
  const outside = Buffer.from(base.toString().replace('Before','After').replace('Original</nav>','Destroyed</nav>'));
  await assert.rejects(verifyOriginalEditedOutput({base,output:outside,actions:[action('modify')],edits:[{action_id:'C-01',html:'After'}]},{browser}),{code:'ORIGINAL_OUTSIDE_EDIT_CHANGED'});
  await check([action('add')],'<!-- only comment -->','Before<!-- only comment -->','ORIGINAL_DOM_SCOPE_VIOLATION');
  const nested = Buffer.from('<main><div id="edit"><b>Before</b></div></main>');
  await assert.rejects(verifyOriginalEditedOutput({base:nested,output:Buffer.from(nested.toString().replace('<b>Before</b>','<!-- note --><b>Before</b>')),actions:[action('modify')],edits:[{action_id:'C-01',html:'<!-- note --><b>Before</b>'}]},{browser}),{code:'ORIGINAL_DOM_SCOPE_VIOLATION'});
  await check([action('modify')],'<script>alert(1)</script>','<script>alert(1)</script>','ACTIVE_CONTENT_FORBIDDEN');
  for (const fragment of ['<table background="assets/missing.png"><tbody><tr><td>x</td></tr></tbody></table>','<input type="image" src="assets/missing.png">','<span style="background-image:image-set(&quot;assets/missing.png&quot; 1x)">x</span>','<span style="background-image:u&#114;l(&quot;assets/missing.png&quot;)">x</span>']) await check([action('add')],fragment,`Before${fragment}`,'ORIGINAL_ASSETS_REQUIRED');
  const paragraph = Buffer.from('<main><p id="edit">Before</p><aside id="keep">Keep</aside></main>');
  await assert.rejects(verifyOriginalEditedOutput({base:paragraph,output:Buffer.from(paragraph.toString().replace('Before','<figure>escape</figure>')),actions:[action('modify')],edits:[{action_id:'C-01',html:'<figure>escape</figure>'}]},{browser}),{code:'ORIGINAL_DOM_SCOPE_VIOLATION'});
  const hiddenParagraph = Buffer.from('<html><head></head><body><template id="detail"><p id="edit">Before</p><aside>Keep</aside></template></body></html>');
  const hiddenAction = {...action('modify'),scope:[{template_id:'detail',path:[0,1,0]}]};
  await assert.rejects(verifyOriginalEditedOutput({base:hiddenParagraph,output:Buffer.from(hiddenParagraph.toString().replace('Before','<figure>escape</figure>')),actions:[hiddenAction],edits:[{action_id:'C-01',html:'<figure>escape</figure>'}]},{browser}),{code:'ORIGINAL_DOM_SCOPE_VIOLATION'});
  // Browser-recovered attribute separators are outside the supported fragment grammar.
  await check([action('modify')],'<button/title="label">Go</button>','<button/title="label">Go</button>','CARRIER_DOM_UNSUPPORTED');
  const hidden = [{ ...action('modify','state'),scope:[{template_id:'hidden',path:[0,1,3]}]}];
  assert.equal((await verifyOriginalEditedOutput({base,output:Buffer.from(base.toString().replace('隐藏','新内容')),actions:hidden,edits:[{action_id:'C-01',html:'新内容'}]},{browser})).status,'PASS');
  const duplicate = Buffer.from('<main><p id="edit">A</p><p id="edit">B</p></main>');
  await assert.rejects(locateOriginalEditRanges(duplicate,[action('modify')],{browser}),/missing or ambiguous/);
  assert.ok(base.toString().includes('window.originalBehavior=true;'));
  console.log('PASS: raw original add/modify/remove/preserve and hidden state; outside bytes, script injection, no-op comments, duplicate locators and HTML parser escape rejected');
} finally { await browser.close(); }
