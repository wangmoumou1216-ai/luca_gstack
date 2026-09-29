import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, realpathSync, statSync, opendirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { canonicalProjectIdentity, readProjectState, atomicProjectStateCas,
  initializeProjectEventFence, attestPendingProjectEvent, prepareProjectSwitch, validatedBindingForState } from './project-substrate.mjs';
import { executeProjectTransaction } from '../../../scripts/project-pin.mjs';
import { assertHostLaunchJournal, hostLaunchJournalRoot } from './event-attestation.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const MAX_CONFIG_BYTES = 1024 * 1024;
const liveControllerReceipts = new WeakSet();
const codeError = (code, message = code) => Object.assign(new Error(message), { code });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && !/[\x00-\x1f]/.test(value);
const normalizedId = value => id(value) && value.trim() === value && value.normalize('NFC') === value;
export function fileIdentity(path, fingerprint = false) {
  const canonical = realpathSync(path), st = statSync(canonical);
  const identity = { realpath: canonical, dev: String(st.dev), ino: String(st.ino) };
  if (fingerprint) {
    if (!st.isFile() || st.size > MAX_CONFIG_BYTES) throw codeError('CONFIG_SCOPE_INVALID');
    identity.size = st.size; identity.sha256 = hash(readFileSync(canonical));
  }
  return identity;
}
function verifyIdentity(expected, fingerprint = false) {
  if (!expected?.realpath || realpathSync(expected.realpath) !== expected.realpath) throw codeError('IDENTITY_CHANGED');
  const actual = fileIdentity(expected.realpath, fingerprint);
  for (const field of ['realpath','dev','ino', ...(fingerprint ? ['size','sha256'] : [])]) {
    if (String(actual[field]) !== String(expected[field])) throw codeError('IDENTITY_CHANGED');
  }
}
function verifyProfile(profile) {
  if (profile?.provider !== 'codex' || !normalizedId(profile.profileId) || !normalizedId(profile.configRevision) || !id(profile.sourceId)
    || !Array.isArray(profile.configFiles) || !profile.configFiles.length || profile.configFiles.length > 8) throw codeError('PROFILE_INVALID');
  verifyIdentity(profile.sourceRoot); verifyIdentity(profile.binary);
  if (!statSync(profile.sourceRoot.realpath).isDirectory() || !statSync(profile.binary.realpath).isFile()) throw codeError('PROFILE_INVALID');
  for (const config of profile.configFiles) verifyIdentity(config, true);
}
export function validateLaunchRequest(request, projectsRoot) {
  if (!request || !['operationId','openRequestId','hostRunId'].every(k => id(request[k]))) throw codeError('REQUEST_INVALID');
  verifyProfile(request.profileIdentity);
  if (request.projectIdentity !== null) {
    const current = canonicalProjectIdentity(request.projectIdentity?.project, projectsRoot);
    for (const field of ['project','realpath','dev','ino']) if (String(current[field]) !== String(request.projectIdentity[field])) throw codeError('PROJECT_CHANGED');
  }
  return structuredClone(request);
}

export function assertHostLaunchAuthority(gstackRoot, projectsRoot, hostLaunchReceipt = null) {
  if (hostLaunchReceipt && !liveControllerReceipts.has(hostLaunchReceipt)) throw codeError('HOST_RECEIPT_DENIED');
  gstackRoot=realpathSync(gstackRoot);projectsRoot=realpathSync(projectsRoot);
  const ownRoot=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),'../../..'));
  const fixture=/^\/private\/tmp\/host-launch-[^/]+\/gstack$/.test(gstackRoot)
    && projectsRoot===join(dirname(gstackRoot),'projects') && gstackRoot!==ownRoot;
  if (!fixture) {
    if (gstackRoot!==ownRoot || typeof process.send!=='function') throw codeError('HOST_PARENT_DENIED');
    let comm,args;
    try {comm=execFileSync('/bin/ps',['-p',String(process.ppid),'-o','comm='],{encoding:'utf8'}).trim();
      args=execFileSync('/bin/ps',['-p',String(process.ppid),'-o','args='],{encoding:'utf8'}).trim();
    } catch {throw codeError('HOST_PARENT_DENIED');}
    const installed='/Applications/luca.app/Contents/MacOS/luca';
    const app=join(dirname(ownRoot),'app'),dev=join(app,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
    if (!(comm===installed && args===installed) && !(comm===dev
      && (args===`${dev} ${app}` || args===`${dev} ${join(app,'main.js')}`))) throw codeError('HOST_PARENT_DENIED');
  }
}
export function createHostLaunchBroker({ gstackRoot, projectsRoot, revalidateProfile,
  journalRoot = hostLaunchJournalRoot(gstackRoot), fault = () => {} }) {
  gstackRoot = realpathSync(gstackRoot); projectsRoot = realpathSync(projectsRoot);
  assertHostLaunchAuthority(gstackRoot,projectsRoot);
  if (typeof revalidateProfile !== 'function') throw codeError('PROFILE_REVALIDATION_REQUIRED');
  if (journalRoot !== hostLaunchJournalRoot(gstackRoot)) throw codeError('JOURNAL_SCOPE_INVALID');
  mkdirSync(journalRoot, { recursive: true, mode: 0o700 });
  assertHostLaunchJournal(gstackRoot,journalRoot);
  const launches = new Map(), operations = new Map();
  let queue = Promise.resolve();
  const serial = work => { const result = queue.then(work); queue = result.catch(() => {}); return result; };
  const persist = record => {
    const { claimHandle, launchNonce, ...publicRecord } = record;
    const path = join(journalRoot, `${record.launchId}.json`), tmp = `${path}.tmp-${randomUUID()}`;
    writeFileSync(tmp, JSON.stringify(publicRecord), { mode:0o600, flag:'wx' }); renameSync(tmp,path);
  };
  const identityRecheck = record => {
    verifyProfile(record.request.profileIdentity);
    if (record.request.projectIdentity && record.status !== 'COMMITTED') {
      const current = canonicalProjectIdentity(record.request.projectIdentity.project, projectsRoot);
      for (const key of ['project','realpath','dev','ino']) if (String(current[key]) !== String(record.request.projectIdentity[key])) throw codeError('PROJECT_CHANGED');
    }
  };
  const lookup = params => {
    const r = launches.get(params?.launchId); if (!r) throw codeError('LAUNCH_UNKNOWN'); return r;
  };
  const reconcile = r => {
    if (!r.sid || r.status === 'COMMITTED') return;
    const current=readProjectState(gstackRoot,r.sid,projectsRoot).value;
    const receipt=current.selection?.receipts?.find(x=>x.status==='COMMITTED' && x.host_launch?.launchId===r.launchId);
    if (!receipt) return;
    const hostLaunch=receipt.host_launch, binding=validatedBindingForState(current,projectsRoot);
    if (!binding || binding.epoch!==receipt.binding_epoch || current.selection.last_success?.commit_id!==receipt.operation_id
      || !['project','realpath','dev','ino'].every(k=>String(binding[k])===String(r.request.projectIdentity?.[k]))
      || hostLaunch.openRequestId!==r.request.openRequestId || hostLaunch.hostRunId!==r.request.hostRunId
      || hostLaunch.sourceId!==r.request.profileIdentity.sourceId || !same(hostLaunch.projectIdentity,r.request.projectIdentity)) throw codeError('READBACK_MISMATCH');
    r.receipt={validation:'VERIFIED',sessionId:r.sid,launchId:r.launchId,openRequestId:r.request.openRequestId,
      hostRunId:r.request.hostRunId,operationId:receipt.operation_id,hostLaunch,binding,
      selectionCommit:current.selection.last_success,executionAuthority:'NOT_PROVIDED'};
    r.status='COMMITTED';r.revision++;persist(r);
  };
  const output = r => ({ launchId:r.launchId,launchNonce:r.launchNonce,claimHandle:r.claimHandle,status:r.status,revision:r.revision });
  const parent = (method, params) => serial(async () => {
    if (method === 'prepare') {
      const request = validateLaunchRequest(params, projectsRoot), payloadDigest = hash(Buffer.from(JSON.stringify(request)));
      const prior = operations.get(request.operationId);
      if (prior) { if (prior.payloadDigest !== payloadDigest) throw codeError('OPERATION_CONFLICT'); return output(prior); }
      // History is a durable replay barrier, not a lifetime launch quota.
      const journal = opendirSync(journalRoot);
      try {
        let entry;
        while ((entry = journal.readSync()) !== null) {
          if (!/^[a-f\d-]{36}\.json$/i.test(entry.name)) continue;
          const saved = JSON.parse(readFileSync(join(journalRoot, entry.name), 'utf8'));
          if (saved.request?.operationId === request.operationId) throw codeError('LAUNCH_RECOVERY_REQUIRED');
        }
      } finally { journal.closeSync(); }
      const r = { launchId:randomUUID(),launchNonce:randomUUID(),claimHandle:randomBytes(32).toString('base64url'),
        status:'PREPARED',revision:1,request,payloadDigest,createdAt:Date.now(),expiresAt:Date.now()+10*60*1000,sid:null,receipt:null };
      persist(r); launches.set(r.launchId,r); operations.set(request.operationId,r); return output(r);
    }
    const r = lookup(params);
    reconcile(r);
    if (method === 'readReceipt') {
      if (r.receipt) {
        const current=readProjectState(gstackRoot,r.sid,projectsRoot).value;
        if (!same(validatedBindingForState(current,projectsRoot),r.receipt.binding)
          || !same(current.selection.last_success,r.receipt.selectionCommit)) throw codeError('READBACK_MISMATCH');
      }
      return {launchId:r.launchId,status:r.status,revision:r.revision,receipt:r.receipt};
    }
    if (params.operationId !== r.request.operationId) throw codeError('OPERATION_CONFLICT');
    if (method === 'cancel') {
      if (r.status === 'COMMITTED') { r.claimHandle='';r.revision++;persist(r);return {status:'already_committed',receipt:r.receipt}; }
      r.status='CANCELLED'; r.claimHandle=''; r.revision++; persist(r); return {status:r.status,revision:r.revision};
    }
    if (method === 'dispatch') {
      if (params.launchNonce !== r.launchNonce || r.status !== 'PREPARED') throw codeError('DISPATCH_REJECTED');
      identityRecheck(r); r.status='DISPATCHED';r.revision++;persist(r);return {status:r.status};
    }
    throw codeError('METHOD_DENIED');
  });
  const claim = (method, params) => serial(async () => {
    const r = lookup(params), payload=params.nativePayload;
    const supplied = Buffer.from(String(params.claimHandle || params.handle || ''));
    const expected = Buffer.from(r.claimHandle);
    if (!expected.length || supplied.length !== expected.length || !timingSafeEqual(supplied,expected)
      || params.launchNonce !== r.launchNonce || params.hostRunId !== r.request.hostRunId
      || params.openRequestId !== r.request.openRequestId || ['CANCELLED','FAILED'].includes(r.status)
      || (!['COMMITTED','ACTIVE_NO_PIN'].includes(r.status) && Date.now()>r.expiresAt)) throw codeError('CLAIM_REJECTED');
    if (!payload || payload.cwd !== gstackRoot || !/^[\w-]{1,36}$/.test(payload.session_id || '')) throw codeError('NATIVE_CONTEXT_INVALID');
    identityRecheck(r);
    if (method === 'attach') {
      if (payload.hook_event_name !== 'SessionStart' || payload.source !== 'startup') throw codeError('NEW_LAUNCH_REQUIRED');
      if (r.sid) { if (r.sid !== payload.session_id) throw codeError('SID_CONFLICT'); return {status:r.status,sessionId:r.sid,sourceId:r.request.profileIdentity.sourceId}; }
      if (r.status !== 'DISPATCHED') throw codeError('CLAIM_REJECTED');
      const state = readProjectState(gstackRoot,payload.session_id,projectsRoot);
      if (state.raw !== null) throw codeError('NEW_LAUNCH_REQUIRED');
      const grant = {schemaVersion:1,provider:'codex',launchId:r.launchId,sessionId:payload.session_id,cwd:gstackRoot,
        sourceRoot:r.request.profileIdentity.sourceRoot,profileId:r.request.profileIdentity.profileId,
        configRevision:r.request.profileIdentity.configRevision,sourceId:r.request.profileIdentity.sourceId};
      const bytes=Buffer.from(JSON.stringify(grant)), grantPath=join(journalRoot,`${r.launchId}.source.json`);
      writeFileSync(grantPath,bytes,{mode:0o600,flag:'wx'});
      atomicProjectStateCas(gstackRoot,payload.session_id,state.raw,{...state.value,
        host_launch_source:{launch_id:r.launchId,sha256:hash(bytes)}});
      try {
        initializeProjectEventFence({gstackRoot,projectsRoot,sessionId:payload.session_id,harness:'codex',cwd:gstackRoot,
          transcriptPath:payload.transcript_path || '',codexHome:r.request.profileIdentity.sourceRoot.realpath});
      } catch (error) { r.status='FAILED'; r.revision++;persist(r);throw error; }
      r.sid=payload.session_id;r.status='ATTACHED';r.revision++;persist(r);fault('after-attach');return {status:'ATTACHED',sessionId:r.sid,sourceId:r.request.profileIdentity.sourceId};
    }
    if (method !== 'beforeTool' || payload.hook_event_name !== 'PreToolUse' || r.sid !== payload.session_id) throw codeError('METHOD_DENIED');
    let timer, profile;
    try {
      profile = await Promise.race([revalidateProfile({launchId:r.launchId,hostRunId:r.request.hostRunId,
        openRequestId:r.request.openRequestId,profileIdentity:r.request.profileIdentity}),
        new Promise((_,reject) => { timer=setTimeout(()=>reject(codeError('PROFILE_REVALIDATION_TIMEOUT')),3000); })]);
    } finally { clearTimeout(timer); }
    if (!same(profile,r.request.profileIdentity)) throw codeError('PROFILE_CHANGED');
    identityRecheck(r);
    reconcile(r);
    // Codex can report the parent session ID with a child's transcript. Route
    // that case onward without consuming root authority; the scope guard must
    // independently verify the child's native ancestry and protected receipt.
    const transcriptName = String(payload.transcript_path || '').split('/').at(-1) || '';
    const transcriptSessionId = /^rollout-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-(01[\w-]{34})\.jsonl$/.exec(transcriptName)?.[1] || '';
    if (transcriptSessionId && transcriptSessionId !== payload.session_id) {
      if (!['ACTIVE_NO_PIN', 'COMMITTED'].includes(r.status)) throw codeError('CHILD_LAUNCH_NOT_ACTIVE');
      return { status: 'CHILD_TOOL', executionAuthority: 'NOT_PROVIDED' };
    }
    const observed=attestPendingProjectEvent({gstackRoot,projectsRoot,sessionId:r.sid,boundaryId:payload.turn_id || payload.prompt_id,
      cwd:gstackRoot,observation:'pre-tool',transcriptPath:payload.transcript_path || '',codexHome:r.request.profileIdentity.sourceRoot.realpath});
    if (!r.request.projectIdentity) {
      if (observed.event?.status !== 'active') throw codeError('GLOBAL_STATE_INVALID');
      if (r.status === 'ATTACHED') {
        if (observed.state.state !== 'NO_PIN') throw codeError('GLOBAL_STATE_INVALID');
        r.status='ACTIVE_NO_PIN';r.revision++;persist(r);
      }
      return {status:'ACTIVE_NO_PIN',sessionId:r.sid};
    }
    if (r.status==='COMMITTED') {
      const current=readProjectState(gstackRoot,r.sid,projectsRoot).value;
      const receipt=current.selection?.receipts?.find(x=>x.operation_id===r.receipt.operationId);
      const binding=validatedBindingForState(current,projectsRoot);
      const selection=current.selection, latest=selection?.last_success;
      // The launch receipt proves the initial selection, not a permanent pin.
      // Later authority comes from the current attested event and controller state.
      const latestReceipt=selection?.receipts?.find(x=>x.operation_id===latest?.commit_id);
      if (observed.event?.status !== 'active'
        || selection?.stream_id !== r.receipt.selectionCommit.stream_id
        || !Number.isSafeInteger(selection.commit_sequence)
        || selection.commit_sequence < r.receipt.selectionCommit.sequence
        || latest?.sequence !== selection.commit_sequence
        || latest?.stream_id !== selection.stream_id
        || (latestReceipt && (latestReceipt.status !== 'COMMITTED'
          || latestReceipt.target !== latest.target || latestReceipt.binding_epoch !== latest.binding_epoch))
        || (receipt && !same(receipt.host_launch,r.receipt.hostLaunch))
        || ((selection.commit_sequence === r.receipt.selectionCommit.sequence
          || latest.commit_id === r.receipt.selectionCommit.commit_id)
          && !same(latest,r.receipt.selectionCommit))
        || (binding && (binding.project !== latest.target || binding.epoch !== latest.binding_epoch))) {
        throw codeError('READBACK_MISMATCH');
      }
      return same(binding,r.receipt.binding) && same(latest,r.receipt.selectionCommit)
        ? {status:'COMMITTED',receipt:r.receipt}
        : {status:'COMMITTED',sessionId:r.sid,executionAuthority:'NOT_PROVIDED'};
    }
    if (observed.state.state !== 'NO_PIN' || observed.state.event_control.consumed_events.length !== 1) throw codeError('FIRST_EVENT_REQUIRED');
    fault('before-prepare');
    const prepared=prepareProjectSwitch({gstackRoot,projectsRoot,sessionId:r.sid,operation:'switch',target:r.request.projectIdentity.project});
    const hostLaunch={launchId:r.launchId,openRequestId:r.request.openRequestId,hostRunId:r.request.hostRunId,
      eventId:observed.event.event_id,sourceId:r.request.profileIdentity.sourceId};
    hostLaunch.projectIdentity=r.request.projectIdentity;
    liveControllerReceipts.add(hostLaunch);
    let committed;
    try {
      committed=executeProjectTransaction({gstackRoot,projectsRoot,sessionId:r.sid,tx:prepared.proposal.tx,operation:'switch',
        target:r.request.projectIdentity.project,expectedEpoch:prepared.proposal.expected_epoch,hostLaunchReceipt:hostLaunch});
    } finally { liveControllerReceipts.delete(hostLaunch); }
    fault('after-controller');
    const current=readProjectState(gstackRoot,r.sid,projectsRoot).value;
    const binding=validatedBindingForState(current,projectsRoot), receipt=current.selection?.latest_operation;
    if (!binding || binding.project!==r.request.projectIdentity.project || receipt?.status!=='COMMITTED'
      || receipt.operation_id!==prepared.proposal.tx || !same(receipt.host_launch,hostLaunch)
      || committed.binding.epoch!==binding.epoch) throw codeError('READBACK_MISMATCH');
    r.receipt={validation:'VERIFIED',sessionId:r.sid,launchId:r.launchId,openRequestId:r.request.openRequestId,
      hostRunId:r.request.hostRunId,operationId:receipt.operation_id,hostLaunch,binding,
      selectionCommit:current.selection.last_success,executionAuthority:'NOT_PROVIDED'};
    r.status='COMMITTED';r.revision++;persist(r);fault('after-commit');return {status:'COMMITTED',receipt:r.receipt};
  });
  return {parent,claim};
}
