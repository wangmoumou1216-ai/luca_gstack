#!/usr/bin/env node
// Real Chromium DOM/time driver for the scoped drawer fixture. Local evidence is never a native QG vote.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { checkCandidate, resolveCandidateSubject } from './prototype-delivery.mjs';
import { createDeliveryFixture, enhancedCSS } from './test-prototype-delivery.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fileRef = file => ({ path: file, sha256: hash(fs.readFileSync(file)) });
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const option = name => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined;
const options = name => process.argv.flatMap((value, index, args) => value === name ? [args[index + 1]] : []);

async function serveClosure(root, closure) {
  const files = new Set(closure.map(item => item.path));
  const requests = [];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    let name;
    try { name = decodeURIComponent(url.pathname.slice(1)); } catch { response.writeHead(400).end(); return; }
    const allowed = files.has(name) && !name.split('/').includes('..');
    requests.push({ url: request.url, allowed, time: Date.now() });
    if (!allowed) { response.writeHead(403).end('Outside selected closure'); return; }
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.md': 'text/plain' }[path.extname(name)] || 'application/octet-stream';
    response.writeHead(200, { 'content-type': type }); response.end(fs.readFileSync(path.join(root, name)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}/`, requests, close: () => new Promise(resolve => server.close(resolve)) };
}

export async function sampleDrawer(page) {
  return page.evaluate(() => {
    const drawer = document.querySelector('#drawer'), toggle = document.querySelector('#toggle');
    const style = getComputedStyle(drawer);
    const matrix = style.transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(style.transform);
    const focused = document.activeElement, focusRect = focused?.getBoundingClientRect(), focusStyle = focused && getComputedStyle(focused);
    const focus_visible = Boolean(focusRect && focusRect.width > 0 && focusRect.height > 0 &&
      focusRect.left >= 0 && focusRect.top >= 0 && focusRect.right <= innerWidth && focusRect.bottom <= innerHeight &&
      focusStyle.visibility !== 'hidden' && focusStyle.display !== 'none' && !focused.closest('[inert]'));
    return { time: performance.now(), x: matrix.m41, width: drawer.getBoundingClientRect().width,
      logical_open: document.body.dataset.open, expanded: toggle.getAttribute('aria-expanded'), hidden: drawer.getAttribute('aria-hidden'),
      inert: drawer.inert, focused: focused?.id, focus_visible,
      focus_rect: focusRect && {left:focusRect.left,top:focusRect.top,right:focusRect.right,bottom:focusRect.bottom},
      result: document.querySelector('#result')?.textContent,
      animations: drawer.getAnimations().map(animation => ({ current_time: animation.currentTime, state: animation.playState })),
      reduced_motion: matchMedia('(prefers-reduced-motion: reduce)').matches };
  });
}
async function frame(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve()))); }
async function until(page, predicate) {
  const samples = [];
  // Driver watchdog only; this is not a universal animation-duration requirement.
  for (let index = 0; index < 120; index++) {
    const sample = await sampleDrawer(page); samples.push(sample);
    if (predicate(sample)) return { found: true, samples };
    await frame(page);
  }
  return { found: false, samples };
}

export async function driveDrawer(page, expectations) {
  const results = [], traces = [];
  const result = (id, passed, sequence, observed) => {
    assert.ok(expectations[id], `Source must prefreeze ${id}`);
    traces.push({ id, expected: expectations[id], sequence });
    results.push({ id, status: passed ? 'PASS' : 'FAIL', expected: expectations[id], observed });
  };
  const endpoint = async open => until(page, sample => Math.abs(sample.x - (open ? 0 : sample.width)) < 0.01);
  const reset = async () => { await page.keyboard.press('Escape'); await endpoint(false); };
  await page.evaluate(() => { window.motionInputTrace=[];for(const type of ['click','keydown'])document.addEventListener(type,event=>window.motionInputTrace.push({time:performance.now(),type,target:event.target.id,key:event.key,logical_open:document.body.dataset.open}),true) });

  await reset();
  const start = await sampleDrawer(page);
  await page.locator('#toggle').click();
  const committed = await sampleDrawer(page);
  const middle = await until(page, sample => sample.x > 0.01 && sample.x < sample.width - 0.01);
  const end = await endpoint(true);
  result('AC-open', committed.logical_open === 'true' && committed.expanded === 'true' && middle.found && end.found,
    [start, committed, ...middle.samples, ...end.samples], `actual open=${committed.logical_open}, presentation middle=${middle.found}, endpoint=${end.found}`);

  // Start fully open, close, observe a true intermediate value, reverse inside one actual DOM event frame.
  await page.locator('#close').click({ force: true });
  const closeMiddle = await until(page, sample => sample.x > sample.width * 0.25 && sample.x < sample.width * 0.75);
  const reverse = await page.evaluate(() => {
    const drawer=document.querySelector('#drawer');
    const observe=()=>({time:performance.now(),x:new DOMMatrixReadOnly(getComputedStyle(drawer).transform).m41,width:drawer.getBoundingClientRect().width,logical_open:document.body.dataset.open});
    const before=observe();document.querySelector('#toggle').click();const after=observe();return {before,after};
  });
  const reverseEnd = await endpoint(true);
  const continuous = closeMiddle.found && reverse.before.x > 0 && reverse.before.x < reverse.before.width &&
    Math.abs(reverse.after.x - reverse.before.x) < 0.01 && reverse.after.logical_open === 'true' && reverseEnd.found;
  result('AC-mid-close-reverse', continuous, [...closeMiddle.samples, reverse.before, reverse.after, ...reverseEnd.samples],
    `actual midclose=${closeMiddle.found}; reverse x before=${reverse.before.x}, after=${reverse.after.x}; final open=${reverseEnd.samples.at(-1).logical_open}`);

  await reset();
  const repeat = await page.evaluate(() => {
    const samples=[];for(let index=0;index<6;index++){document.querySelector('#toggle').click();const drawer=document.querySelector('#drawer');samples.push({time:performance.now(),input:index+1,logical_open:document.body.dataset.open,x:new DOMMatrixReadOnly(getComputedStyle(drawer).transform).m41})}return samples;
  });
  const repeatEnd = await endpoint(false);
  result('AC-repeat', repeat.every((item,index)=>item.logical_open===String(index%2===0)) && repeatEnd.found && repeatEnd.samples.at(-1).logical_open==='false',
    [...repeat,...repeatEnd.samples], `six actual toggle inputs: ${repeat.map(item=>item.logical_open).join(',')}; terminal=${repeatEnd.samples.at(-1).logical_open}`);

  await page.locator('#toggle').click(); await frame(page); const cancelStart=await sampleDrawer(page);
  await page.keyboard.press('Escape'); const cancelCommit=await sampleDrawer(page); const cancelEnd=await endpoint(false);
  result('AC-cancel', cancelCommit.logical_open==='false' && cancelCommit.result==='No business side effect' && cancelCommit.focused==='toggle' && cancelEnd.found,
    [cancelStart,cancelCommit,...cancelEnd.samples], `Escape actual result=${cancelCommit.result}, focus=${cancelCommit.focused}, closed=${cancelCommit.logical_open}`);

  await page.emulateMedia({ reducedMotion: 'reduce' }); await reset();
  await page.locator('#toggle').click(); const reducedOpen=await sampleDrawer(page);
  await page.keyboard.press('Escape'); const reducedClosed=await sampleDrawer(page);
  result('AC-reduced-motion', reducedOpen.reduced_motion && reducedOpen.logical_open==='true' && Math.abs(reducedOpen.x)<0.01 &&
    reducedOpen.animations.length===0 && reducedClosed.logical_open==='false' && Math.abs(reducedClosed.x-reducedClosed.width)<0.01 && reducedClosed.focused==='toggle',
    [reducedOpen,reducedClosed], `browser media reduce=${reducedOpen.reduced_motion}, actual open x=${reducedOpen.x}, active animations=${reducedOpen.animations.length}, closed x=${reducedClosed.x}`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.evaluate(() => {
    window.keyboardFocusAtCommit = null;
    // Bubble observation runs after the real toggle handler, before the first presentation frame.
    document.querySelector('#toggle').addEventListener('click', () => {
      const control = document.activeElement, rect = control.getBoundingClientRect(), style = getComputedStyle(control);
      window.keyboardFocusAtCommit = {focused:control.id,logical_open:document.body.dataset.open,
        focus_visible:rect.width>0&&rect.height>0&&rect.left>=0&&rect.top>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight&&
          style.visibility!=='hidden'&&style.display!=='none'&&!control.closest('[inert]'),
        focus_rect:{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom}};
    }, {once:true});
  });
  await page.locator('#toggle').focus(); await page.keyboard.press('Enter');
  const keyCommit=await page.evaluate(()=>window.keyboardFocusAtCommit), keyOpen=await sampleDrawer(page);
  await frame(page); const keyFirstFrame=await sampleDrawer(page);
  await page.keyboard.press('Escape'); const keyClosed=await sampleDrawer(page); const keyEnd=await endpoint(false);
  result('AC-keyboard-focus', keyCommit?.logical_open==='true' && keyCommit.focused==='close' && keyCommit.focus_visible &&
    keyOpen.logical_open==='true' && keyOpen.focused==='close' && keyOpen.focus_visible && keyOpen.hidden==='false' && !keyOpen.inert &&
    keyFirstFrame.focused==='close' && keyFirstFrame.focus_visible &&
    keyClosed.logical_open==='false' && keyClosed.focused==='toggle' && keyClosed.focus_visible && keyClosed.hidden==='true' && keyClosed.inert && keyEnd.found,
    [keyCommit,keyOpen,keyFirstFrame,keyClosed,...keyEnd.samples], `Enter actual focus=${keyOpen.focused}/open=${keyOpen.logical_open}, event visible=${keyCommit?.focus_visible}, first frame visible=${keyFirstFrame.focus_visible}; Escape focus=${keyClosed.focused}/closed=${keyClosed.logical_open}`);
  return { results, traces, input_events: await page.evaluate(() => window.motionInputTrace) };
}

export async function observeDrawer({ root, closure, entry_relative, source, final_sha256, candidate_ref }, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const sourceText = fs.readFileSync(source, 'utf8');
  const expectations = Object.fromEntries([...sourceText.matchAll(/^(AC-[^:]+): (.+)$/gm)].map(match => [match[1],match[2]]));
  const server = await serveClosure(root, closure);
  let browser, context, tracingStarted = false, failure, report;
  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 1000, height: 760 }, reducedMotion: 'no-preference' });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    tracingStarted = true;
    const page = await context.newPage(), errors = [], network = [];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*', route => {
      const url=route.request().url();const allowed=url.startsWith(server.url);
      network.push({ url, allowed, method:route.request().method(), resource_type:route.request().resourceType(),time:Date.now() });
      return allowed ? route.continue() : route.abort();
    });
    await page.goto(server.url + entry_relative, { waitUntil: 'networkidle' });
    const observation = await driveDrawer(page, expectations);
    for (const trace of observation.traces) json(path.join(outputDir, `${trace.id}.json`), trace);
    json(path.join(outputDir, 'input-events.json'), observation.input_events);
    json(path.join(outputDir, 'network.json'), { browser: network, server: server.requests, page_errors:errors });
    await page.screenshot({ path:path.join(outputDir,'final.png') });
    const results=observation.results.map(item=>({...item,evidence_refs:[fileRef(path.join(outputDir,`${item.id}.json`)),fileRef(path.join(outputDir,'input-events.json'))]}));
    const status=results.every(item=>item.status==='PASS') && errors.length===0 && network.every(item=>item.allowed) && server.requests.every(item=>item.allowed) ? 'PASS' : 'FAIL';
    const invocation=path.join(outputDir,'local-driver-invocation.json'), output=path.join(outputDir,'local-driver-output.json');
    json(invocation,{argv:process.argv,driver_ref:fileRef(fileURLToPath(import.meta.url)),browser_version:browser.version(),scope:'EXPLICIT_NO_PIN_FRAMEWORK_FIXTURE',production_pin:'NONE'});
    json(output,{status,results,errors,final_sha256,source_ref:fileRef(source)});
    report={schema_version:1,candidate_ref:candidate_ref||{path:path.join(root,entry_relative),sha256:final_sha256},final_sha256,
      required_behavior_results:results,reviewer_provenance:{reviewer_role:'local-browser-driver',invocation_ref:fileRef(invocation),output_ref:fileRef(output),origin:'LOCAL_DRIVER_NOT_INDEPENDENT'},status};
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    const cleanupErrors = [];
    const cleanup = [
      ...(tracingStarted ? [() => context.tracing.stop({path:path.join(outputDir,'playwright-trace.zip')})] : []),
      ...(context ? [() => context.close()] : []),
      ...(browser ? [() => browser.close()] : []),
      () => server.close() // guard:browser-cleanup
    ];
    for (const close of cleanup) {
      try { await close(); } catch (error) { cleanupErrors.push(error); }
    }
    if (cleanupErrors.length) throw new AggregateError(failure ? [failure, ...cleanupErrors] : cleanupErrors,
      'Browser driver cleanup failed', {cause:failure});
  }
  json(path.join(outputDir,'local-browser-report.json'),report);
  return report;
}

async function testSetupFailures(evidenceRoot) {
  const root = path.join(evidenceRoot, 'setup-failures'); fs.mkdirSync(root);
  const source = path.join(root, 'source.md'); fs.writeFileSync(source, 'Failure-lifecycle fixture only; no product acceptance.\n');
  const launch = chromium.launch, createServer = http.createServer, results = [];
  try {
    for (const boundary of ['launch', 'context', 'tracing', 'page', 'route', 'trace-stop', 'context-close', 'browser-close']) {
      const servers = [], closed = [];
      http.createServer = (...args) => { const server = createServer(...args); servers.push(server); return server; };
      const injected = name => { throw new Error(`Injected ${name} failure`); };
      chromium.launch = async () => {
        if (boundary === 'launch') injected(boundary);
        return {
          newContext: async () => {
            if (boundary === 'context') injected(boundary);
            return {
              tracing: { start: async () => { if (boundary === 'tracing') injected(boundary); },
                stop: async () => { closed.push('trace'); if (boundary === 'trace-stop') injected(boundary); } },
              newPage: async () => { if (boundary === 'page') injected(boundary); return { on: () => {}, route: async () => injected('route') }; },
              close: async () => { closed.push('context'); if (boundary === 'context-close') injected(boundary); }
            };
          },
          close: async () => { closed.push('browser'); if (boundary === 'browser-close') injected(boundary); }
        };
      };
      let error;
      const outputDir = path.join(root, boundary);
      try { await observeDrawer({root, closure:[], entry_relative:'unused.html', source, final_sha256:'0'.repeat(64)}, outputDir); }
      catch (caught) { error = caught; }
      const leaked = servers.filter(server => server.listening).length;
      // Retain the actual leak observation, then clean only this fixture's servers even on RED.
      for (const server of servers.filter(server => server.listening)) await new Promise(resolve => server.close(resolve));
      const messages = (error instanceof AggregateError ? error.errors : [error]).map(item => item?.message);
      results.push({boundary, messages, closed, listeners_still_open:leaked, scope:'INJECTED_FAILURE_LIFECYCLE_ONLY'});
      json(path.join(root,'results.json'),results);
      assert.ok(error, 'Injected setup/cleanup failure must reject');
      assert.equal(leaked, 0, 'Owned listener must close after every failure');
      assert.ok(!fs.existsSync(path.join(outputDir,'local-browser-report.json')), 'Failed lifecycle must not publish a passing report');
      if (boundary !== 'launch') assert.ok(closed.includes('browser'), 'Browser cleanup continues after earlier failure');
      if (!['launch','context'].includes(boundary)) assert.ok(closed.includes('context'), 'Context cleanup continues after trace failure');
      if (['trace-stop','context-close','browser-close'].includes(boundary)) {
        assert.ok(error instanceof AggregateError);
        assert.ok(messages.includes('Injected route failure') && messages.includes(`Injected ${boundary} failure`), 'Preserve primary and cleanup errors');
      }
    }
  } finally { chromium.launch = launch; http.createServer = createServer; }
  console.log('PASS eight injected setup/cleanup boundaries; resources closed, failures preserved, no final report');
}

async function main() {
  const evidenceRoot=fs.mkdtempSync(path.join(fs.realpathSync('/tmp'),'luca-motion-browser-'));
  const receipts=[];
  try {
    await testSetupFailures(evidenceRoot);
    if (process.argv.includes('--lifecycle-only')) return;
    if (option('--subject')) {
      const context={read_paths:options('--read-path'),read_roots:options('--read-root')};
      const resolved=resolveCandidateSubject({path:option('--subject'),sha256:option('--sha256'),delivery_root:option('--delivery-root')},context);
      assert.ok(path.isAbsolute(resolved.source_ref.locator),'This driver requires actual file-backed fixture expectations');
      const report=await observeDrawer({root:resolved.delivery_root,closure:resolved.delivery.closure,entry_relative:resolved.delivery.entry,
        source:resolved.source_ref.locator,final_sha256:resolved.final_sha256,candidate_ref:resolved.candidate_ref},evidenceRoot);
      assert.equal(report.status,'PASS','Actual candidate required browser behaviors must pass');
    } else {
      const fixture=createDeliveryFixture(path.join(evidenceRoot,'fixture'),{freeze:false});
      const css=path.join(fixture.attempt.content_root,'assets/base.css');
      // This is the actual CSS current-presentation guard, altered only in an owned negative-control copy.
      let candidateCSS = enhancedCSS;
      if(process.argv.includes('--remove-continuity-guard')) candidateCSS = candidateCSS.replace('transition:transform 420ms ease-in-out','transition:none');
      if(process.argv.includes('--remove-focus-guard')) candidateCSS = candidateCSS.replace('#close{transform:translateX(-100%)}body:not([data-open=true]) #close{visibility:hidden}\n','');
      fs.writeFileSync(css,candidateCSS);
      fixture.resolved=checkCandidate(fixture.candidateInput(),fixture.context);
      json(path.join(fixture.root,'fixture-context.json'),{scope:'EXPLICIT_NO_PIN_FRAMEWORK_FIXTURE',context:fixture.context,source_ref:fixture.bound.source,
        raw_entry:fixture.bound.base.entry,attempt:fixture.attempt,candidate_ref:fixture.resolved.candidate_ref});
      const raw=await observeDrawer({root:fixture.sourceRoot,closure:fixture.bound.base.closure,entry_relative:fixture.bound.base.entry_relative,
        source:fixture.source,final_sha256:fixture.bound.base.sha256},path.join(evidenceRoot,'raw'));
      assert.equal(raw.status,'FAIL','Real raw subject must fail dynamic source expectations');
      assert.equal(raw.required_behavior_results.find(item=>item.id==='AC-mid-close-reverse').status,'FAIL','Actual raw reverse fails');
      const enhanced=await observeDrawer({root:fixture.deliveryRoot,closure:fixture.resolved.delivery.closure,entry_relative:fixture.resolved.delivery.entry,
        source:fixture.source,final_sha256:fixture.resolved.final_sha256,candidate_ref:fixture.resolved.candidate_ref},path.join(evidenceRoot,'enhanced'));
      if(option('--case')) assert.equal(enhanced.required_behavior_results.find(item=>item.id===option('--case'))?.status,'PASS','Same current-presentation browser case');
      else assert.equal(enhanced.status,'PASS','Actual enhanced subject must satisfy all frozen source expectations');
      assert.ok(!fs.existsSync(path.join(fixture.attempt.attempt_dir,'accepted-delivery.json')),'Local browser self-check does not seal before independent QG');
      for(const item of fixture.bound.base.closure)assert.equal(fileRef(path.join(fixture.sourceRoot,item.path)).sha256,item.sha256,'Raw preserved');
      console.log('PASS actual raw FAIL and enhanced PASS, DOM/time traces, reverse/repeat/cancel/media/keyboard/focus');
      if(!option('--case')&&!process.argv.includes('--remove-continuity-guard')&&!process.argv.includes('--remove-focus-guard')) {
        for(const [guard,behavior,flag] of [['continuity','AC-mid-close-reverse','--remove-continuity-guard'],['focus','AC-keyboard-focus','--remove-focus-guard']]) {
        for(const [label,extra,expected] of [['removed',[flag],1],['restored',[],0]]) {
          const argv=[fileURLToPath(import.meta.url),'--case',behavior,...extra];
          const result=spawnSync(process.execPath,argv,{encoding:'utf8',timeout:45000});
          const stdout=path.join(evidenceRoot,`${guard}-${label}.stdout`),stderr=path.join(evidenceRoot,`${guard}-${label}.stderr`);
          fs.writeFileSync(stdout,result.stdout||'');fs.writeFileSync(stderr,result.stderr||'');
          receipts.push({argv:[process.execPath,...argv],exit_code:result.status,stdout_ref:fileRef(stdout),stderr_ref:fileRef(stderr)});
          assert.equal(result.status,expected,`Actual same-case browser ${guard} guard ${label}`);
        }
        console.log(`PASS actual ${guard} guard mutation RED and restored GREEN`);
        }
      }
    }
  } catch(error) {console.error(error.stack);process.exitCode=1;}
  finally {json(path.join(evidenceRoot,'commands.json'),receipts);json(path.join(evidenceRoot,'test-summary.json'),{exit_code:process.exitCode||0,
    driver_ref:fileRef(fileURLToPath(import.meta.url)),scope:'EXPLICIT_NO_PIN_FRAMEWORK_FIXTURE',independent_native_acceptance:'NOT_TESTED',production_pin:'NONE'});console.log(`Evidence: ${evidenceRoot}`);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
