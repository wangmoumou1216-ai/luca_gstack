#!/usr/bin/env node
// Static source adapter. Paths, manifests and recorded evidence never expand actual read authority.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import {parse as parseJavaScript} from 'acorn';
import { createNotesCore } from '../.claude/skills/office/references/prototype-notes/core.js';
import { startNotesRuntime } from '../.claude/skills/office/references/prototype-notes/runtime.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.claude/skills/office/references/prototype-notes');
const schema = JSON.parse(fs.readFileSync(path.join(root,'notes.schema.json'),'utf8'));
export const core = createNotesCore(schema);
export const validateNotes = core.validateNotes;
export const applyManualTransaction = core.applyManualTransaction;
const walk = node => [node,...(node.childNodes || []).flatMap(walk),...(node.content ? walk(node.content) : [])];
const attr = (node,name) => node.attrs?.find(a => a.name === name)?.value;
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
const normalize = value => value.replace(/\s+/g,' ').trim();
const fp = node => ({tag:node.tagName,role:attr(node,'role') ?? null,semantic_name:attr(node,'aria-label') || normalize(text(node)) || null});
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const within = (file,dir) => file === dir || file.startsWith(dir + path.sep);
function sourceTree(source) {
  if (typeof source !== 'string' || Buffer.byteLength(source) > 33554432 || source.includes('\ufffd') || /[\ud800-\udfff]/u.test(source)) throw Error('UNSUPPORTED_ASSET: valid UTF-8 source <=32 MiB required');
  const bom = source.startsWith('\ufeff') ? 1 : 0;
  const parseErrors = [], document = parse(source.slice(bom),{sourceCodeLocationInfo:true,onParseError:e=>parseErrors.push(e)}), nodes = walk(document);
  return {nodes,bom,parseErrors};
}
function controlledSelector(selector) {
  // Only declarative tag, ID, class and exact attribute compounds with descendant/child combinators.
  if (typeof selector !== 'string' || !selector.trim() || selector.length > 2000 || /[,:\\]|\b(?:javascript|eval)\b/i.test(selector)) throw Error('SCOPE_VIOLATION: unsupported selector ' + selector);
  const compounds = selector.trim().split(/\s*(>)\s*|\s+/).filter(Boolean);
  const atom = /^(?:[a-zA-Z][\w-]*)?(?:#[\w-]+|\.[\w-]+|\[[\w-]+="[^"\[\]<>]*"\])*$/;
  if (compounds.some(s => s !== '>' && (!atom.test(s) || !s))) throw Error('SCOPE_VIOLATION: unsupported selector ' + selector);
  function match(node,s) {
    if (!node?.tagName) return false;
    const tag = s.match(/^[A-Za-z][\w-]*/)?.[0]; if (tag && node.tagName !== tag.toLowerCase()) return false;
    for (const token of s.matchAll(/#[\w-]+|\.[\w-]+|\[([\w-]+)="([^"\[\]<>]*)"\]/g)) {
      if (token[0][0] === '#' && attr(node,'id') !== token[0].slice(1)) return false;
      if (token[0][0] === '.' && !(attr(node,'class') || '').split(/\s+/).includes(token[0].slice(1))) return false;
      if (token[0][0] === '[' && attr(node,token[1]) !== token[2]) return false;
    }
    return true;
  }
  return node => {
    let i = compounds.length - 1, cursor = node;
    if (!match(cursor,compounds[i--])) return false;
    while (i >= 0) {
      if (compounds[i] === '>') { cursor = cursor.parentNode; i--; if (i < 0 || !match(cursor,compounds[i--])) return false; }
      else { cursor = cursor.parentNode; while (cursor && !match(cursor,compounds[i])) cursor = cursor.parentNode; if (!cursor) return false; i--; }
    }
    return true;
  };
}
function sourceEvidence(source,scope,bindings,before=null,assisted_ids=[],base_revision=scope?.base_revision) {
  if(typeof source!=='string' || createHash('sha256').update(source).digest('hex')!==base_revision || scope && scope.base_revision!==base_revision)throw Error('SOURCE_CHANGED: actual source bytes differ from scope/base revision');
  const tree = sourceTree(source), select = s => tree.nodes.filter(controlledSelector(s)), id = node => tree.nodes.indexOf(node), ancestors = node => {const out=[]; for(let p=node;p;p=p.parentNode)out.push(id(p)); return out;};
  bindings ||= assisted_ids.length?{version:1,roots:[],targets:[]}:null;
  if (!bindings || bindings.version !== 1 || !Array.isArray(bindings.roots) || !Array.isArray(bindings.targets)) throw Error('SCOPE_VIOLATION: actual root and target mapping required');
  const evidence = {base_revision,roots:[],targets:[],assisted_targets:[]};
  for (const r of bindings.roots) {
    const matches = select(r.root_identity), node = matches[0], unit = scope?.units?.find(u=>u.id===r.unit_id);
    if (!unit?.root_anchor_ids.includes(r.anchor_id) || !unit.contexts.includes(r.context_id) || !r.evidence_refs?.length || r.portal && (!r.portal.trigger_locator || !r.portal.evidence_refs?.length || select(r.portal.trigger_locator).length !== 1)) throw Error('SCOPE_VIOLATION: root/portal evidence missing');
    evidence.roots.push({...r,match_count:matches.length,node_id:id(node),is_body:node?.tagName==='body'});
  }
  for (const r of evidence.roots.filter(r=>r.portal)) {
    const trigger=select(r.portal.trigger_locator)[0];
    r.portal={...r.portal,trigger_ancestor_node_ids:ancestors(trigger)};
  }
  for (const t of bindings.targets) {
    const matches = select(t.source_locator || t.locator), node = matches[0], actualFP = node && fp(node);
    const instance = node && (attr(node,'data-instance-key') ?? attr(node,'data-row-key') ?? null);
    // Deliberately discard self-reported contained/verified/unit facts; source containment below is authoritative.
    evidence.targets.push({...t,match_count:matches.length,node_id:id(node),ancestor_node_ids:node ? ancestors(node) : [],fingerprint:actualFP,instance_key:instance});
    if (node && !same(actualFP,t.fingerprint)) throw Error('SCOPE_VIOLATION: target fingerprint differs from actual source');
    if (node && instance !== t.instance_key) throw Error('SCOPE_VIOLATION: target instance differs from actual source');
  }
  for (const annotation_id of assisted_ids) {
    const a=before?.annotations?.find(a=>a.id===annotation_id && a.creation_origin==='manual');
    if(!a)continue;
    if(!a.anchor){evidence.assisted_targets.push({annotation_id,global_rule:a.kind==='rule',context_id:a.page_or_state_context.id});continue;}
    const matches=select(a.anchor.locator), roots=select(a.anchor.root_identity), node=matches[0], root=roots[0];
    evidence.assisted_targets.push({annotation_id,anchor_id:a.anchor.id,context_id:a.page_or_state_context.id,locator:a.anchor.locator,root_identity:a.anchor.root_identity,match_count:matches.length,root_match_count:roots.length,root_node_id:id(root),is_body:root?.tagName==='body',ancestor_node_ids:node?ancestors(node):[],fingerprint:node&&fp(node),instance_key:node&&(attr(node,'data-instance-key')??attr(node,'data-row-key')??null)});
  }
  return evidence;
}
const caught = error => {const match = error.message.match(/^([A-Z_]+):\s*(.*)$/s); return core.fail(match?.[1] || 'EXPORT_FAILED','无法完成说明加工，请保留原件。',[match?.[2] || error.message]);};
// Caller-owned transient tokens contain no trusted facts. Only this adapter's WeakMap has observations.
const observationSessions=new WeakMap(),maxObservationAgeMs=120000;
async function releaseObservation(caller,reason) {const session=caller?.observation_session && observationSessions.get(caller.observation_session);if(session)await session.release(reason);}
async function generationEvidence(input,caller,before=input.before,assisted_ids=input.assisted_ids || []) {
  if(!caller)return sourceEvidence(input.source,input.scope,input.bindings,before,assisted_ids,input.proposed.base_revision);
  const token=caller.observation_session;
  let session=token && typeof token==='object'?observationSessions.get(token):null;
  if(session?.busy)throw Error('SCOPE_VIOLATION: observation session is already in use');
  try {
    const base_revision=createHash('sha256').update(input.source).digest('hex'),fail=message=>{throw Error('SCOPE_VIOLATION: '+message);};
    if(base_revision!==input.proposed.base_revision || input.scope && input.scope.base_revision!==base_revision)throw Error('SOURCE_CHANGED: actual source bytes differ from scope/base revision');
    if(caller.permission?.browser_read!==true)fail('actual caller browser-read permission required');
    if(caller.provider!==undefined && typeof caller.provider!=='function')fail('observation provider must be a callable capability in trusted caller context');
    const surface=caller.provider?await caller.provider():caller.frame || caller.page;
    if(!surface || typeof surface.evaluate!=='function' || typeof surface.url!=='function')fail('live Page/Frame capability required; candidate JSON is not an observation provider');
    const page=typeof surface.context==='function'?surface:typeof surface.page==='function'?surface.page():null,frame=surface===page?page?.mainFrame():surface,context=page?.context?.(),browser=context?.browser?.();
    if(!browser?.isConnected() || !browser.contexts().includes(context) || !context.pages().includes(page) || !page.frames().includes(frame) || frame.page()!==page || page.isClosed())fail('observation surface is unavailable or is not an actual browser member');
    const currentURL=surface.url(),sourceRef=caller.source_ref;
    if(!sourceRef || sourceRef.sha256!==base_revision || currentURL!==caller.entry_url)throw Error('SOURCE_CHANGED: observation source reference or navigation changed');
    const currentBytes=authorizedRead(sourceRef.path,caller.read_context);
    if(createHash('sha256').update(currentBytes).digest('hex')!==base_revision || currentBytes.toString('utf8')!==input.source)throw Error('SOURCE_CHANGED: current authorized source reference changed');
    let loaded;
    if(/^data:text\/html(?:;charset=[\w-]+)?;base64,/i.test(currentURL))loaded=Buffer.from(currentURL.slice(currentURL.indexOf(',')+1),'base64');
    else {const response=caller.source_response;if(typeof response?.body!=='function' || typeof response.request!=='function' || response.url()!==currentURL || response.request().frame()!==frame)fail('actual loaded source response required for this Page/Frame URL');loaded=await response.body();}
    if(createHash('sha256').update(loaded).digest('hex')!==base_revision || loaded.toString('utf8')!==input.source)throw Error('SOURCE_CHANGED: actual loaded browser source differs from immutable source');
    const bindings=input.bindings || (assisted_ids.length?{version:1,roots:[],targets:[]}:null);
    if(!bindings || bindings.version!==1 || !Array.isArray(bindings.roots) || !Array.isArray(bindings.targets))fail('actual root/target mapping required');
    if(input.scope && (!same(input.scope,caller.approved_scope) || !Array.isArray(caller.approved_roots) || bindings.roots.some(r=>!caller.approved_roots.some(allowed=>same(allowed,r)))))fail('generation scope and root definitions must match the frozen trusted caller permission');
    const contexts=new Set([...bindings.roots,...bindings.targets].map(x=>x.context_id)),assisted=(before?.annotations || []).filter(a=>assisted_ids.includes(a.id));
    assisted.forEach(a=>contexts.add(a.page_or_state_context.id));
    const contextLocators={};for(const id of contexts){const locator=caller.contexts?.[id] || (caller.context_id===id?caller.context_locator:null);if(typeof locator!=='string' || !locator)fail('current state/context permission and locator required: '+id);contextLocators[id]=locator;}
    for(const r of bindings.roots){const u=input.scope?.units?.find(u=>u.id===r.unit_id);if(!u?.root_anchor_ids.includes(r.anchor_id) || !u.contexts.includes(r.context_id) || !r.evidence_refs?.length || r.portal && (!r.portal.trigger_locator || !r.portal.evidence_refs?.length))fail('root/portal ownership evidence required');}
    if(token!==undefined) {
      if(!token || typeof token!=='object' || Array.isArray(token))fail('observation session requires a caller-owned transient token');
      const maxAge=caller.observation_max_age_ms ?? maxObservationAgeMs;
      if(!Number.isInteger(maxAge) || maxAge<1 || maxAge>maxObservationAgeMs)fail('observation lifetime must be within 1..120000 ms');
      const signature=JSON.stringify({source_ref:sourceRef,permission:caller.permission,read_context:caller.read_context,document_id:input.proposed.document_id,scope:input.scope || null,approved_scope:caller.approved_scope || null,approved_roots:caller.approved_roots || null,bindings,contexts:contextLocators,behaviors:input.behaviors || [],sources:input.sources || [],assisted:assisted.map(a=>({id:a.id,binding_revision:a.binding_revision,anchor:a.anchor,context:a.page_or_state_context})),maxAge});
      if(session && (session.invalid || Date.now()>=session.expires_at))fail('observation session expired or invalidated: '+(session.invalid || 'expired'));
      if(session && (session.frame!==frame || session.page!==page || session.signature!==signature))fail('observation session source/context/permission/scope/target identity changed');
      if(caller.end_observation_session===true){if(session)await session.release('ended');fail('observation session ended; handles released');}
      if(!session) {
        if(typeof caller.observe_context!=='string' || !contexts.has(caller.observe_context))fail('observation session has no actual collected state; observe_context required');
        const handle=await frame.evaluateHandle(()=>({document,nodes:new Map(),nextId:0})),id=randomUUID();
        session={id,signature,page,frame,handle,expires_at:Date.now()+maxAge,records:new Map(),entries:new Map(),invalid:null,busy:false};observationSessions.set(token,session);
        const listeners=[];let timer;
        session.release=async reason=>{if(session.invalid)return;session.invalid=reason;clearTimeout(timer);for(const [object,event,listener] of listeners)object.off(event,listener);session.records.clear();session.entries.clear();const owned=session.handle;session.handle=null;await owned?.dispose().catch(()=>{});};
        const watch=(object,event,fn)=>{object.on(event,fn);listeners.push([object,event,fn]);};
        watch(page,'framenavigated',f=>{if(f===frame)void session.release('navigation');});watch(page,'framedetached',f=>{if(f===frame)void session.release('frame detached');});watch(page,'close',()=>void session.release('page closed'));watch(context,'close',()=>void session.release('context closed'));watch(browser,'disconnected',()=>void session.release('browser closed'));
        timer=setTimeout(()=>void session.release('expired'),maxAge);timer.unref();
      }
      session.busy=true;
    }
    const facts=await frame.evaluate(({bindings,assisted,contextLocators,identity,namespace})=>{
      if(identity && identity.document!==document)return {document_changed:true};
      const nodes=identity?null:[...document.querySelectorAll('*')],id=node=>{if(!node)return null;if(!identity)return nodes.indexOf(node);if(!identity.nodes.has(node))identity.nodes.set(node,namespace+':'+identity.nextId++);return identity.nodes.get(node);},select=selector=>[...document.querySelectorAll(selector)],ancestors=node=>{const out=[];for(let p=node;p;p=p.parentElement)out.push(id(p));return out;};
      const visible=node=>{if(!node || node.closest('[hidden],[inert],[aria-hidden="true"],[id^="luca-notes-"]'))return false;for(let p=node;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none' || s.visibility==='hidden' || s.visibility==='collapse')return false;}return !!node.getClientRects().length;};
      const fingerprint=node=>({tag:node.tagName.toLowerCase(),role:node.getAttribute('role'),semantic_name:node.getAttribute('aria-label') || node.textContent.replace(/\s+/g,' ').trim() || null}),instance=node=>node.getAttribute('data-instance-key')??node.getAttribute('data-row-key')??null;
      const contexts=Object.fromEntries(Object.entries(contextLocators).map(([key,selector])=>{const matches=select(selector);return [key,{match_count:matches.length,visible:matches.length===1 && visible(matches[0]),node_id:id(matches[0])}];}));
      const roots=bindings.roots.map(r=>{const m=select(r.root_identity),node=m[0],trigger=r.portal?select(r.portal.trigger_locator):[];return {...r,match_count:m.length,node_id:id(node),visible:visible(node),is_body:node?.tagName==='BODY',portal:r.portal?{...r.portal,trigger_match_count:trigger.length,trigger_node_id:id(trigger[0]),trigger_visible:trigger.length===1 && visible(trigger[0]),trigger_ancestor_node_ids:trigger.length===1?ancestors(trigger[0]):[]}:undefined};});
      const targets=bindings.targets.map(t=>{const m=select(t.source_locator || t.locator),node=m[0];return {...t,match_count:m.length,node_id:id(node),visible:visible(node),ancestor_node_ids:node?ancestors(node):[],fingerprint:node?fingerprint(node):null,instance_key:node?instance(node):null};});
      const assisted_targets=assisted.map(a=>{if(!a.anchor)return {annotation_id:a.id,context_id:a.page_or_state_context.id,global_rule:a.kind==='rule'};const m=select(a.anchor.locator),r=select(a.anchor.root_identity),node=m[0],root=r[0];return {annotation_id:a.id,anchor_id:a.anchor.id,context_id:a.page_or_state_context.id,locator:a.anchor.locator,root_identity:a.anchor.root_identity,match_count:m.length,root_match_count:r.length,root_node_id:id(root),is_body:root?.tagName==='BODY',visible:visible(node),root_visible:visible(root),ancestor_node_ids:node?ancestors(node):[],fingerprint:node?fingerprint(node):null,instance_key:node?instance(node):null};});
      return {contexts,roots,targets,assisted_targets};
    },{bindings:core.clone(bindings),assisted:core.clone(assisted),contextLocators,identity:session?.handle,namespace:session?.id});
    if(session?.invalid || facts.document_changed || surface.url()!==currentURL || createHash('sha256').update(authorizedRead(sourceRef.path,caller.read_context)).digest('hex')!==base_revision)throw Error('SOURCE_CHANGED: observation document/source/navigation changed during collection');
    function verifyHelper(t,contextNode) {
      const a=assisted.find(a=>a.id===t.annotation_id);if(!a?.anchor){if(!t.global_rule || a?.kind!=='rule')fail('actual assisted global rule is invalid');return;}
      if(t.match_count!==1 || t.root_match_count!==1 || !t.visible || !t.root_visible || !t.ancestor_node_ids.includes(t.root_node_id) || !t.ancestor_node_ids.includes(contextNode) || !same(t.fingerprint,a.anchor.fingerprint) || t.instance_key!==a.anchor.instance_key)fail('actual visible assisted target root/context/instance/fingerprint/uniqueness mismatch');
    }
    function verifyState(id) {
      const c=facts.contexts[id];if(c?.match_count!==1 || !c.visible)fail('actual current context is missing, ambiguous or hidden: '+id);
      const roots=facts.roots.filter(r=>r.context_id===id),targets=facts.targets.filter(t=>t.context_id===id),helpers=facts.assisted_targets.filter(t=>t.context_id===id).map(t=>{
        if(t.match_count>1 || t.root_match_count>1)fail('actual assisted target/root is ambiguous');
        const history=session?.records.get(id),old=history?.assisted_targets.find(old=>old.annotation_id===t.annotation_id);
        if(!t.global_rule && !t.visible && old)return {...old,historical:true,observed_at:old.observed_at || history.observed_at};
        verifyHelper(t,c.node_id);return t;
      });
      for(const r of roots)if(r.match_count!==1 || !r.visible || r.is_body)fail('actual current root is missing, ambiguous, hidden or unsupported');
      for(const t of targets){const r=roots.find(r=>r.anchor_id===t.root_anchor_id && r.unit_id===t.unit_id);if(t.match_count!==1)throw Error('ANCHOR_AMBIGUOUS: actual current target must be unique');if(!t.visible || !r || !t.ancestor_node_ids.includes(r.node_id) || !same(t.fingerprint,bindings.targets.find(b=>b.anchor_id===t.anchor_id)?.fingerprint) || t.instance_key!==bindings.targets.find(b=>b.anchor_id===t.anchor_id)?.instance_key)fail('actual current target root/instance/fingerprint mismatch');}
      for(const t of targets)if(t.ancestor_node_ids?.length && !t.ancestor_node_ids.includes(c.node_id) && !roots.some(r=>r.portal && r.anchor_id===t.root_anchor_id && (session?.entries.get(r.anchor_id) || r.portal).trigger_ancestor_node_ids.includes(c.node_id)))fail('actual target is outside the current observed context');
      return {context:c,roots,targets,assisted_targets:helpers,observed_at:Date.now()};
    }
    let combined=facts;
    if(session) {
      // Capture triggers while the caller normally enters their owning nonportal state, before opening.
      for(const r of facts.roots.filter(r=>r.portal?.trigger_visible)) {
        const lineage=r.portal.trigger_ancestor_node_ids,owner=facts.roots.find(q=>!q.portal && !q.is_body && q.unit_id===r.unit_id && q.match_count===1 && q.visible && lineage.includes(q.node_id));
        if(!owner || facts.roots.some(q=>q.portal && lineage.includes(q.node_id)))fail('actual portal trigger is outside approved nonportal unit roots');
        if(caller.observe_context===owner.context_id || session.records.has(owner.context_id))session.entries.set(r.anchor_id,{...core.clone(r.portal),observed_at:Date.now(),owner_context_id:owner.context_id});
      }
      if(caller.observe_context!==undefined){if(!contexts.has(caller.observe_context))fail('observe_context is outside the frozen context permission');session.records.set(caller.observe_context,verifyState(caller.observe_context));}
      if(![...contexts].some(id=>facts.contexts[id]?.visible))fail('no actual authorized current context is visible');
      // Selecting a new state never exempts other observed states from current DOM checks.
      for(const id of session.records.keys()) {
        const c=facts.contexts[id],roots=facts.roots.filter(r=>r.context_id===id),targets=facts.targets.filter(t=>t.context_id===id),helpers=facts.assisted_targets.filter(t=>t.context_id===id);
        if(c?.match_count>1 || roots.some(r=>r.match_count>1) || targets.some(t=>t.match_count>1) || helpers.some(t=>t.match_count>1 || t.root_match_count>1))fail('actual observed context/root/target is ambiguous');
        if(c?.visible){session.records.set(id,verifyState(id));continue;}
        // Conditional states may be absent; targets still visible now cannot borrow old ownership.
        // Shared tab controls may remain visible while their logical state selector is inactive.
        for(const t of targets.filter(t=>t.visible)) {
          const r=roots.find(r=>r.anchor_id===t.root_anchor_id && r.unit_id===t.unit_id),b=bindings.targets.find(b=>b.anchor_id===t.anchor_id);
          if(t.match_count!==1 || !r || r.match_count!==1 || !t.ancestor_node_ids.includes(r.node_id) || !same(t.fingerprint,b?.fingerprint) || t.instance_key!==b?.instance_key)fail('actual visible inactive-state target root/instance/fingerprint mismatch');
        }
        for(const t of helpers.filter(t=>t.visible))verifyHelper(t,c?.node_id || session.records.get(id).context.node_id);
      }
      const missing=[...contexts].filter(id=>!session.records.has(id)),missingPortals=bindings.roots.filter(r=>r.portal && !session.entries.has(r.anchor_id)).map(r=>r.anchor_id);
      if(missing.length || missingPortals.length){const pending=Error('SCOPE_VIOLATION: actual observation incomplete '+JSON.stringify({collected_context_ids:[...session.records.keys()],missing_context_ids:missing,missing_portal_entries:missingPortals}));pending.pendingObservation=true;throw pending;}
      combined={contexts:Object.fromEntries([...session.records].map(([id,r])=>[id,r.context])),roots:[...session.records.values()].flatMap(r=>r.roots),targets:[...session.records.values()].flatMap(r=>r.targets),assisted_targets:[...session.records.values()].flatMap(r=>r.assisted_targets)};
      for(const r of combined.roots.filter(r=>r.portal)){r.portal=core.clone(session.entries.get(r.anchor_id));if(!combined.roots.some(q=>!q.portal && q.unit_id===r.unit_id && r.portal.trigger_ancestor_node_ids.includes(q.node_id)))fail('portal entry observation requires renewed actual owner-state observation');}
    } else {
      for(const id of contexts)verifyState(id);
      if(facts.roots.some(r=>r.portal && (r.portal.trigger_match_count!==1 || !r.portal.trigger_visible)))fail('actual portal trigger is missing, ambiguous or hidden');
    }
    return {base_revision,...combined,observation:{source_ref:core.clone(sourceRef),loaded_source_sha256:base_revision,surface_url_sha256:createHash('sha256').update(currentURL).digest('hex'),context_ids:[...contexts],...combined,read_only:true,...(session?{session_id:session.id,expires_at:session.expires_at,current_context_ids:[...contexts].filter(id=>facts.contexts[id]?.visible),collected_at_by_context:Object.fromEntries([...session.records].map(([id,r])=>[id,r.observed_at])),live_document_identity:true,observation_kind:'actual states collected after caller normal entry; inactive state facts are historical, current visible states are rechecked'}:{})}};
  } catch(error) {if(session && !error.pendingObservation)await session.release(error.message);throw error;}
  finally {if(session)session.busy=false;}
}
export async function validateGenerationScope(input = {},callerContext) {
  try { if (!input.source || core.validateNotes(input.proposed,input.sources).ok !== true) {await releaseObservation(callerContext,'invalid notes input');return core.fail('SCOPE_VIOLATION','范围核验需要实际原型源码和完整说明。');}
    const evidence=await generationEvidence(input,callerContext),result=core.validateGenerationScope({...input,bindings:evidence});if(result.ok && evidence.observation)result.value.observation=evidence.observation;if(!result.ok)await releaseObservation(callerContext,result.code);return result;
  } catch (error) { return caught(error); }
}
export async function mergeNotes(input = {},callerContext) {
  try { const evidence=await generationEvidence(input,callerContext,input.current),result=await core.mergeNotes({...input,bindings:evidence});if(result.ok && evidence.observation)result.value.observation=evidence.observation;if(!result.ok)await releaseObservation(callerContext,result.code);return result; }
  catch (error) { return caught(error); }
}
function authorizedRead(file,context) {
  const absolute = path.resolve(file);
  if (!path.isAbsolute(file) || !context || !(context.read_paths || []).includes(absolute) && !(context.read_roots || []).some(r=>path.isAbsolute(r) && within(absolute,r))) throw Error('READ_SCOPE_REFUSED: ' + absolute);
  let cursor = path.parse(absolute).root;
  for (const part of absolute.slice(cursor.length).split(path.sep)) {cursor=path.join(cursor,part);if(fs.lstatSync(cursor).isSymbolicLink())throw Error('SYMLINK_REFUSED: '+cursor);}
  if (!fs.statSync(absolute).isFile() || fs.realpathSync(absolute)!==absolute) throw Error('READ_SCOPE_REFUSED: canonical file required');
  return fs.readFileSync(absolute);
}
async function inlineAssets(source,options) {
  const transformations = [], assets = new Map(), selected = options.closure || [];
  for (const item of selected) {
    if (!item || typeof item.path!=='string' || path.isAbsolute(item.path) || item.path.split('/').some(p=>!p || p==='.' || p==='..') || /[\\?#\0]/.test(item.path) || assets.has(item.path)) throw Error('UNSUPPORTED_ASSET: invalid/duplicate closure path');
    assets.set(item.path,item);
  }
  const mime = name => ({'.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.avif':'image/avif'})[path.extname(name).toLowerCase()];
  const readCache = new Map();
  async function resource(url,from,type,stack=[]) {
    if (!url || url.startsWith('#')) return url;
    if (/^data:/i.test(url)) {
      const m=url.match(/^data:([^;,]+)(?:;charset=[\w-]+)?(;base64)?,([\s\S]*)$/i);
      if(!m || stack.length>30)throw Error('UNSUPPORTED_ASSET: unsupported or recursive data resource: '+from);
      let data;
      if(m[2]) { if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(m[3]))throw Error('UNSUPPORTED_ASSET: invalid base64 data resource: '+from);data=Buffer.from(m[3],'base64'); }
      else {try{data=Buffer.from(decodeURIComponent(m[3]),'utf8');}catch{throw Error('UNSUPPORTED_ASSET: invalid encoded data resource: '+from);}}
      if(data.length>33554432)throw Error('UNSUPPORTED_ASSET: oversize data resource: '+from);
      const kind=m[1].toLowerCase(), js=['text/javascript','application/javascript','text/ecmascript','application/ecmascript'].includes(kind);
      if(type==='js'&&!js || type==='css'&&kind!=='text/css')throw Error('UNSUPPORTED_ASSET: data resource type mismatch: '+from);
      if(js){checkJS(decode(data,from),from+' data JavaScript');return url;}
      if(kind==='text/css'){const before=decode(data,from),after=await css(before,from,[...stack,'data:'+await core.hash(url)]);return before===after?url:'data:text/css;base64,'+Buffer.from(after).toString('base64');}
      if(kind==='image/svg+xml')checkSVG(decode(data,from),from+' data SVG');
      else if(!['image/png','image/jpeg','image/gif','image/webp','image/avif','image/x-icon','image/vnd.microsoft.icon','font/woff','font/woff2','font/ttf','font/otf','application/font-woff','application/vnd.ms-fontobject'].includes(kind))throw Error('UNSUPPORTED_ASSET: uninspectable data resource type: '+kind);
      return url;
    }
    if (!options.inline_assets) throw Error('UNSUPPORTED_ASSET: local resource requires approved inlining: ' + from + ' -> ' + url);
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|\/)/i.test(url) || /[\\\0?#]/.test(url) || /%(?:2e|2f|5c)/i.test(url)) throw Error('UNSUPPORTED_ASSET: escaping/network/query resource: ' + url);
    const name = path.posix.normalize(path.posix.join(path.posix.dirname(from),url));
    if (name.startsWith('../') || stack.includes(name)) throw Error('UNSUPPORTED_ASSET: escaping/cyclic resource: ' + name);
    const item = assets.get(name); if (!item) throw Error('UNSUPPORTED_ASSET: missing closure resource: ' + from + ' -> ' + name);
    let data = readCache.get(name);
    if (!data) {
      if (item.content !== undefined) data = typeof item.content==='string' ? Buffer.from(item.content,'utf8') : Buffer.from(item.content);
      else {if(!options.asset_root || !path.isAbsolute(options.asset_root))throw Error('READ_SCOPE_REFUSED: actual asset root required');data=authorizedRead(path.join(options.asset_root,name),options.read_context);}
      if (!item.sha256 || createHash('sha256').update(data).digest('hex')!==item.sha256 || item.bytes!==data.length) throw Error('SOURCE_CHANGED: asset closure changed: ' + name);
      readCache.set(name,data);
    }
    let content = data, kind = mime(name);
    if (!kind || type==='css' && kind!=='text/css' || type==='js' && kind!=='application/javascript') throw Error('UNSUPPORTED_ASSET: unsupported resource type: ' + name);
    if (kind==='text/css') content=Buffer.from(await css(decode(data,name),name,[...stack,name]));
    if (kind==='application/javascript') checkJS(decode(data,name),name);
    if (kind==='image/svg+xml')checkSVG(decode(data,name),name);
    const result='data:'+kind+';base64,'+content.toString('base64');
    transformations.push({from,resource:name,source_sha256:item.sha256,source_bytes:data.length,inline_sha256:await core.hash(result),kind}); return result;
  }
  const decode=(data,name)=>{try{return new TextDecoder('utf-8',{fatal:true}).decode(data);}catch{throw Error('UNSUPPORTED_ASSET: invalid UTF-8 asset: '+name);}};
  function checkSVG(svg,name) {
    if(/<script\b|\bon\w+\s*=|<foreignObject\b/i.test(svg))throw Error('UNSUPPORTED_ASSET: active SVG: '+name);
    const refs=[...svg.matchAll(/(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi),...svg.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/gi)].map(m=>m[1]||m[2]||m[3]||'');
    if(refs.some(r=>!r.startsWith('#')))throw Error('UNSUPPORTED_ASSET: SVG dependency requires a self-contained static fragment: '+name);
  }
  function checkJS(js,name,kind='script') {
    const refuse=reason=>{throw Error('UNSUPPORTED_ASSET: '+reason+' JavaScript: '+name);};
    let ast;try{ast=parseJavaScript(js,{ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:kind==='handler'});}catch(error){refuse('unsupported or invalid syntax ('+error.message+')');}
    const network=new Set(['fetch','XMLHttpRequest','WebSocket','EventSource','Worker','SharedWorker','importScripts','sendBeacon','eval','Function','Image','Audio']), resourceProps=new Set(['src','href','srcset','action','formAction']),resourceTags=new Set(['script','link','iframe','img','source','audio','video','object','embed']);
    const literal=node=>node?.type==='Literal' && typeof node.value==='string'?node.value:node?.type==='TemplateLiteral' && !node.expressions.length?node.quasis.map(q=>q.value.cooked).join(''):node?.type==='BinaryExpression' && node.operator==='+' && literal(node.left)!==null && literal(node.right)!==null?literal(node.left)+literal(node.right):null;
    const property=node=>node?.type==='MemberExpression'?(node.computed?literal(node.property):node.property.name):null;
    const globalAliases=new Set(['window','globalThis','self','navigator','document','top','parent','frames']),all=[];
    function collect(node){if(!node || typeof node!=='object')return;if(node.type)all.push(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(collect);else if(value && typeof value==='object' && value.type)collect(value);}
    collect(ast);
    let changed=true;while(changed){changed=false;for(const node of all){const id=node.type==='VariableDeclarator'?node.id:node.type==='AssignmentExpression' && node.operator==='='?node.left:null,init=node.type==='VariableDeclarator'?node.init:node.right;if(id?.type==='Identifier' && init?.type==='Identifier' && globalAliases.has(init.name) && !globalAliases.has(id.name)){globalAliases.add(id.name);changed=true;}}}
    function visit(node) {
      if(!node || typeof node!=='object')return;
      if(node.type==='Identifier' && node.name==='location')refuse('dynamic global navigation');
      if(node.type==='Identifier' && network.has(node.name) || node.type==='ImportExpression' || node.type?.startsWith('Export'))refuse('dynamic/network/module');
      if(node.type==='MemberExpression') {
        const p=property(node);if(network.has(p) || p==='constructor' || node.object.type==='Identifier' && globalAliases.has(node.object.name) && node.computed && p===null)refuse('dynamic/network/module member');
        if(p==='location' || p==='open' && node.object.type==='Identifier' && globalAliases.has(node.object.name))refuse('dynamic navigation');
      }
      if(node.type==='NewExpression' && (node.callee.name==='URL' || property(node.callee)==='URL'))refuse('dynamic URL');
      if(['AssignmentExpression','UpdateExpression'].includes(node.type) && resourceProps.has(property(node.left || node.argument)))refuse('dynamic resource assignment');
      if(node.type==='CallExpression') {
        if(node.callee.type==='MemberExpression' && node.callee.computed && property(node.callee)===null)refuse('unsupported computed executable member');
        const callee=node.callee.name || property(node.callee);
        if(node.callee.type==='Identifier' && ['open','showModalDialog'].includes(callee))refuse('dynamic global navigation');
        if(callee==='createElement' && (literal(node.arguments[0])===null || resourceTags.has(literal(node.arguments[0]).toLowerCase())))refuse('dynamic resource element');
        if(['setAttribute','setAttributeNS'].includes(callee)){const p=literal(node.arguments[callee==='setAttributeNS'?1:0]);if(p===null || resourceProps.has(p))refuse('dynamic resource attribute');}
      }
      for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value && typeof value==='object' && value.type)visit(value);
    }
    visit(ast);
  }
  async function css(value,from,stack=[]) {
    if (/\\/.test(value)) throw Error('UNSUPPORTED_ASSET: escaped CSS tokens are not supported by the static closure inspector: '+from);
    if (/(?<![\w-])(?:image-set|-webkit-image-set|image|src|cross-fade|-webkit-cross-fade|paint)\s*\(/i.test(value)) throw Error('UNSUPPORTED_ASSET: unsupported CSS resource function requires a complete resource parser: '+from);
    const matches=[...value.matchAll(/@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^\s;)'"<]+))\s*\)?/gi),...value.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)'"<]+))\s*\)/gi)];
    const patches=[];
    for(const m of matches.sort((a,b)=>a.index-b.index)) {
      if(patches.some(p=>m.index<p.end))continue;
      const url=m[1]||m[2]||m[3], result=await resource(url,from,m[0].startsWith('@')?'css':null,stack);
      patches.push({start:m.index,end:m.index+m[0].length,text:m[0].startsWith('@')?'@import url("'+result+'")':'url("'+result+'")'});
    }
    let out=value;for(const p of patches.reverse())out=out.slice(0,p.start)+p.text+out.slice(p.end);
    // An unparsed url/import must fail rather than silently leave an external dependency.
    const stripped=out.replace(/@import\s+url\("(?:data:[^"]+|#[^"]*)"\)|url\("(?:data:[^"]+|#[^"]*)"\)/gi,'');
    if(/url\s*\(|@import/i.test(stripped))throw Error('UNSUPPORTED_ASSET: unresolved CSS dependency: '+from);
    return out;
  }
  const tree=sourceTree(source), patches=[], entry=options.entry_relative || 'index.html';
  // Enumerate all parser-recognized executable entrances before examining resource attributes.
  const executable=[];
  const classicType=type=>!type || /^(?:application\/(?:x-)?(?:javascript|ecmascript)|text\/(?:(?:x-)?(?:javascript|ecmascript)|javascript1\.[0-5]|jscript|livescript))$/i.test(type.split(';')[0].trim());
  for(const node of tree.nodes) {
    if(node.tagName==='script' && classicType(attr(node,'type')))executable.push({code:text(node),name:entry+' script'});
    for(const a of node.attrs || []) {
      if(/^on/i.test(a.name))executable.push({code:a.value,name:entry+' '+node.tagName+' '+a.name,kind:'handler'});
      if(['href','src','action','formaction','data'].includes(a.name)) {
        const compact=a.value.replace(/[\u0000-\u0020\u007f]/g,'');
        if(/^javascript:/i.test(compact)) {
          let code;try{code=decodeURIComponent(a.value.slice(a.value.indexOf(':')+1));}catch{throw Error('UNSUPPORTED_ASSET: malformed executable URI: '+entry);}
          executable.push({code,name:entry+' '+a.name+' javascript URI'});
        } else if(/^vbscript:/i.test(compact))throw Error('UNSUPPORTED_ASSET: unsupported executable URI: '+entry);
        else if(/^data:/i.test(compact))await resource(a.value,entry);
      }
    }
  }
  for(const item of executable)checkJS(item.code,item.name,item.kind);
  const patchAttr = (node,a,replacement) => {
    const loc=node.sourceCodeLocation?.attrs?.[a.name];if(!loc)throw Error('UNSUPPORTED_ASSET: attribute source offset missing');
    patches.push({start:loc.startOffset+tree.bom,end:loc.endOffset+tree.bom,text:(a.prefix?a.prefix+':':'')+a.name+'="'+replacement.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'"'});
  };
  for(const node of tree.nodes) {
    if (['base','iframe','object','embed'].includes(node.tagName) || attr(node,'http-equiv')?.toLowerCase()==='content-security-policy')throw Error('UNSUPPORTED_ASSET: unsupported remapping/CSP/frame dependency: '+node.tagName);
    if(node.tagName==='script') {
      if(attr(node,'type')?.toLowerCase()==='module')throw Error('UNSUPPORTED_ASSET: module script');
      if(!attr(node,'type') || /^(?:text|application)\/(?:javascript|ecmascript)$/i.test(attr(node,'type')))checkJS(text(node),entry);
    }
    if(node.tagName==='style') {
      const before=text(node), after=await css(before,entry);
      if(before!==after){const loc=node.sourceCodeLocation;if(!loc?.startTag || !loc.endTag)throw Error('UNSUPPORTED_ASSET: style source offsets missing');patches.push({start:loc.startTag.endOffset+tree.bom,end:loc.endTag.startOffset+tree.bom,text:after});}
    }
    for(const a of node.attrs||[]) {
      let replacement=a.value;
      if(a.name==='style')replacement=await css(a.value,entry);
      else if(a.name==='srcset') {
        if(/^data:/i.test(a.value)) {
          const syntax=/(data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+)(?: (\d+(?:\.\d+)?[wx]))?/gi;
          const entries=[...a.value.matchAll(syntax)];
          if(!entries.length || entries.map(e=>e[0]).join(', ')!==a.value)throw Error('UNSUPPORTED_ASSET: ambiguous data srcset');
          for(const e of entries)await resource(e[1],entry);
          continue;
        }
        const entries=a.value.split(',').map(s=>s.trim().split(/\s+/));
        if(entries.some(e=>e.length>2 || e[1]&&!/^\d+(?:\.\d+)?[wx]$/.test(e[1])))throw Error('UNSUPPORTED_ASSET: ambiguous srcset');
        replacement=(await Promise.all(entries.map(async e=>[await resource(e[0],entry),e[1]].filter(Boolean).join(' ')))).join(', ');
      } else if(['src','poster','data','background'].includes(a.name))replacement=await resource(a.value,entry,node.tagName==='script'?'js':null);
      else if(a.name==='href') {
        if(node.tagName==='link') {if(!(attr(node,'rel')||'').split(/\s+/).every(r=>['stylesheet','icon'].includes(r)))throw Error('UNSUPPORTED_ASSET: unsupported link resource');replacement=await resource(a.value,entry,attr(node,'rel')==='stylesheet'?'css':null);}
        else if(node.namespaceURI==='http://www.w3.org/2000/svg' && node.tagName!=='a') {
          if(a.value.startsWith('#')) {const fragment=decodeURIComponent(a.value.slice(1));if(tree.nodes.filter(n=>attr(n,'id')===fragment).length!==1)throw Error('UNSUPPORTED_ASSET: missing/ambiguous SVG fragment');}
          else replacement=await resource(a.value,entry);
        }
      }
      if(replacement!==a.value)patchAttr(node,a,replacement);
    }
  }
  let result=source;for(const p of patches.sort((a,b)=>b.start-a.start))result=result.slice(0,p.start)+p.text+result.slice(p.end);
  return {source:result,transformations:transformations.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))};
}
function inspectSource(source) {
  const tree=sourceTree(source);
  if(tree.nodes.some(n=>(attr(n,'id')||'').startsWith('luca-notes-')))throw Error('CORRUPT_EMBEDDING: existing or damaged notes package');
  const head=tree.nodes.find(n=>n.tagName==='head'), end=head?.sourceCodeLocation?.startTag?.endOffset, offset=Number.isSafeInteger(end)?end+tree.bom:undefined;
  if(!Number.isSafeInteger(offset) || tree.nodes.some(n=>n.tagName==='script' && n.sourceCodeLocation?.startOffset+tree.bom<offset))throw Error('UNSUPPORTED_ASSET: explicit head before all business scripts required');
  if(tree.parseErrors.some(e=>['duplicate-attribute','eof-in-element-that-can-contain-only-text'].includes(e.code)))throw Error('UNSUPPORTED_ASSET: ambiguous source attributes or incomplete raw text');
  return {...tree,offset};
}
function bindingInsertions(source,bindings) {
  if(!bindings?.length)return [];
  const tree=sourceTree(source), insertions=[];
  for(const b of bindings) {
    if(b.strategy!=='injected')continue;
    if(!/^[0-9a-f-]{36}$/.test(b.anchor_id))throw Error('SCOPE_VIOLATION: invalid injected anchor identity');
    const matches=tree.nodes.filter(controlledSelector(b.source_locator));if(matches.length!==1)throw Error('ANCHOR_AMBIGUOUS: injected target must be unique');
    const n=matches[0], loc=n.sourceCodeLocation?.startTag;
    if(!loc || attr(n,'data-luca-note-anchor') || !same(fp(n),b.fingerprint))throw Error('SCOPE_VIOLATION: injected target source mismatch');
    const offset=loc.endOffset+tree.bom-(source.slice(loc.endOffset+tree.bom-2,loc.endOffset+tree.bom)==='/>'?2:1);
    if(insertions.some(p=>p.offset===offset))throw Error('ANCHOR_AMBIGUOUS: duplicate injected target');
    insertions.push({offset,text:' data-luca-note-anchor="'+b.anchor_id+'"'});
  }
  return insertions.sort((a,b)=>a.offset-b.offset);
}
export async function buildAnnotatedHtml(options = {},callerContext) {
  try {
    const {notes,sources = [],bindings = []}=options;
    const valid=core.validateNotes(notes,sources);if(!valid.ok){await releaseObservation(callerContext,valid.code);return valid;}
    const input_sha256=await core.hash(options.source), assets=await inlineAssets(options.source,options), source=assets.source;
    if(await core.hash(source)!==notes.base_revision){await releaseObservation(callerContext,'source changed');return core.fail('SOURCE_CHANGED','内联后的原型快照与说明版本不一致。',[{snapshot_sha256:await core.hash(source),transformations:assets.transformations}]);}
    let observation;
    const inspected=inspectSource(source), bindingRecords=Array.isArray(bindings)?bindings:bindings.targets;
    if(!Array.isArray(bindingRecords)){await releaseObservation(callerContext,'invalid bindings');return core.fail('SCOPE_VIOLATION','定位绑定表格式无效。');}
    if(notes.annotations.some(a=>a.creation_origin==='ai' && !a.tombstone)) {
      if(!options.generation){await releaseObservation(callerContext,'missing generation evidence');return core.fail('SCOPE_VIOLATION','AI说明组包需要实际范围和覆盖核验。');}
      const gate=await validateGenerationScope({...options.generation,source,proposed:notes,scope:notes.generation_scope,bindings,sources},callerContext);if(!gate.ok)return gate;observation=gate.value.observation;
    } else if(callerContext) {
      const manualIds=notes.annotations.filter(a=>a.creation_origin==='manual' && !a.tombstone).map(a=>a.id),evidence=await generationEvidence({source,proposed:notes,scope:null,bindings:{version:1,roots:[],targets:[]}},callerContext,notes,manualIds);
      for(const a of notes.annotations.filter(a=>manualIds.includes(a.id))){const t=evidence.assisted_targets.find(t=>t.annotation_id===a.id);if(a.anchor && (!t || t.match_count!==1 || t.root_match_count!==1 || t.visible===false || !t.ancestor_node_ids.includes(t.root_node_id) || !same(t.fingerprint,a.anchor.fingerprint) || t.instance_key!==a.anchor.instance_key)){await releaseObservation(callerContext,'manual target mismatch');return core.fail('SCOPE_VIOLATION','人工说明的实际当前目标不匹配。',[a.id]);}}
      observation=evidence.observation;
    }
    const bundle={version:1,source,offset:inspected.offset,notes:valid.value,sources:core.clone(sources),bindings:core.clone(bindingRecords),schema,
      core:createNotesCore.toString(),runtime:startNotesRuntime.toString(),css:fs.readFileSync(path.join(root,'panel.css'),'utf8'),insertions:bindingInsertions(source,bindingRecords),input_sha256,transformations:assets.transformations};
    const result=await core.assemble(bundle);if(result.ok && observation)result.value.metadata.observation=observation;if(!result.ok)await releaseObservation(callerContext,result.code);return result;
  } catch(error){if(!error.pendingObservation)await releaseObservation(callerContext,error.message);return caught(error);}
}
export async function extractNotes(html,options = {}) {
  try {
    if(typeof html!=='string' || Buffer.byteLength(html)>core.maxPackageBytes)return core.fail('CORRUPT_EMBEDDING','文件大小或编码不支持。');
    const tree=sourceTreeForPackage(html), owned=tree.nodes.filter(n=>(attr(n,'id')||'').startsWith('luca-notes-'));
    const data=owned.filter(n=>attr(n,'id')==='luca-notes-data'), boot=owned.filter(n=>attr(n,'id')==='luca-notes-bootstrap');
    if(owned.length!==2 || data.length!==1 || boot.length!==1 || data[0].tagName!=='script' || boot[0].tagName!=='script' || attr(data[0],'type')!=='application/json')return core.fail('CORRUPT_EMBEDDING','说明区块缺失、重复或损坏。');
    const raw=text(data[0]), envelope=core.parseJSON(raw), b=envelope.bundle;
    if(envelope.version!==1 || b?.version!==1)return core.fail('UNKNOWN_VERSION','说明封装版本不支持。');
    const keys='bindings,core,css,input_sha256,insertions,notes,offset,runtime,schema,source,sources,transformations,version';
    if(Object.keys(b).sort().join()!==keys)return core.fail('CORRUPT_EMBEDDING','说明包包含未知或缺失字段。');
    if(b.core!==createNotesCore.toString() || b.runtime!==startNotesRuntime.toString() || b.css!==fs.readFileSync(path.join(root,'panel.css'),'utf8') || !same(b.schema,schema))return core.fail('UNKNOWN_VERSION','运行时包不是此版本的固定实现。');
    const source=inspectSource(b.source);
    if(source.offset!==b.offset || !same(bindingInsertions(b.source,b.bindings),b.insertions))return core.fail('CORRUPT_EMBEDDING','原型源映射无效。');
    const closed=await inlineAssets(b.source,{});if(closed.source!==b.source)return core.fail('CORRUPT_EMBEDDING','原型快照依赖未闭合。');
    const strict=await core.extractNotes({html,raw});
    if(strict.ok || options.rebase!==true)return strict;
    // Explicit E6 admission verifies the one known package before removing its actual uploaded ranges.
    // Building the old package is only an integrity reference, never the returned business source.
    const canonical=await core.assemble(b);if(!canonical.ok)return canonical;
    const verified=await core.extractNotes({html:canonical.value.html,raw});if(!verified.ok)return verified;
    const originalTree=sourceTreeForPackage(canonical.value.html), originalOwned=originalTree.nodes.filter(n=>(attr(n,'id')||'').startsWith('luca-notes-'));
    const currentHead=tree.nodes.find(n=>n.tagName==='head'), removals=[];
    const range=node=>{const loc=node.sourceCodeLocation;if(!loc || !loc.endTag || !Number.isSafeInteger(loc.startOffset) || !Number.isSafeInteger(loc.endOffset))throw Error('unverifiable tool interval');return {start:loc.startOffset+tree.bom,end:loc.endOffset+tree.bom};};
    for(const node of [data[0],boot[0]]) {
      const expected=originalOwned.find(n=>attr(n,'id')===attr(node,'id')), actual=range(node), loc=expected?.sourceCodeLocation;
      if(!loc || html.slice(actual.start,actual.end)!==canonical.value.html.slice(loc.startOffset+originalTree.bom,loc.endOffset+originalTree.bom))throw Error('modified tool bytes');
      removals.push({...actual,kind:attr(node,'id'),sha256:await core.hash(html.slice(actual.start,actual.end))});
    }
    if(removals[0].start!==currentHead?.sourceCodeLocation?.startTag?.endOffset+tree.bom || removals[0].end!==removals[1].start || tree.nodes.some(n=>n.tagName==='script' && ![data[0],boot[0]].includes(n) && n.sourceCodeLocation?.startOffset+tree.bom<removals[1].end))throw Error('moved or noncontiguous tool intervals');
    const injected=b.bindings.filter(record=>record.strategy==='injected'), attributes=tree.nodes.flatMap(node=>(node.attrs||[]).filter(a=>a.name==='data-luca-note-anchor').map(a=>({node,a})));
    if(attributes.length!==injected.length || new Set(attributes.map(({a})=>a.value)).size!==attributes.length)throw Error('ambiguous injected mapping');
    for(const record of injected) {
      const target=attributes.find(({a})=>a.value===record.anchor_id), expected=' data-luca-note-anchor="'+record.anchor_id+'"', loc=target?.node.sourceCodeLocation?.attrs?.['data-luca-note-anchor'];
      if(!loc || !same(fp(target.node),record.fingerprint) || !controlledSelector(record.source_locator)(target.node))throw Error('unverifiable injected mapping');
      const start=loc.startOffset+tree.bom-1,end=loc.endOffset+tree.bom;
      if(html.slice(start,end)!==expected || !b.insertions.some(item=>item.text===expected))throw Error('modified injected tool bytes');
      removals.push({start,end,kind:'injected-anchor',anchor_id:record.anchor_id,sha256:await core.hash(expected)});
    }
    removals.sort((a,b)=>a.start-b.start);
    if(removals.some((r,i)=>i && r.start<removals[i-1].end))throw Error('overlapping tool intervals');
    let currentSource=html;for(const r of [...removals].reverse())currentSource=currentSource.slice(0,r.start)+currentSource.slice(r.end);
    inspectSource(currentSource);const currentClosed=await inlineAssets(currentSource,{});if(currentClosed.source!==currentSource)throw Error('current business dependency not closed');
    const current_sha256=await core.hash(currentSource);
    if(current_sha256===b.notes.base_revision)throw Error('nonbusiness package drift cannot be rebased');
    const changed=await core.applyManualTransaction({document:verified.value.notes,action:'rebase',base_revision:current_sha256},b.sources);if(!changed.ok)return changed;
    return core.ok({notes:changed.value.document,source:currentSource,bundle:b,rebase:{input_sha256:await core.hash(html),previous_source_sha256:b.notes.base_revision,current_source_sha256:current_sha256,removed_ranges:removals,confirmation:'AWAITING_REAL_CURRENT_BUSINESS_CONFIRMATION',binding_status:'REQUIRES_CURRENT_REBIND',behavior_equivalence:'NOT_RUN',uploaded_original_preserved:true}});
  } catch(error){return core.fail('CORRUPT_EMBEDDING','无法读取说明封装，请保留原件。',[error.message]);}
}
function sourceTreeForPackage(html) {const bom=html.startsWith('\ufeff')?1:0;return {nodes:walk(parse(html.slice(bom),{sourceCodeLocationInfo:true})),bom};}
// Local CLI is read-only: it never creates a candidate, publishes a file or guesses a project.
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const [command,file,...args]=process.argv.slice(2);
    if(command!=='extract' || !file || args.length || !path.isAbsolute(file))throw Error('CLI_USAGE: extract <exact absolute HTML path>');
    const bytes=authorizedRead(file,{read_paths:[file]});const result=await extractNotes(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;
  } catch(error){console.error(JSON.stringify(caught(error)));process.exitCode=1;}
}
