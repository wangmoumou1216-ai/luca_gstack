import { createHash, randomUUID } from 'crypto';
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmdirSync,
  writeSync,
} from 'fs';
import { dirname, join, resolve } from 'path';
import {
  CORRECTION_VERIFIER_REGISTRY,
  CORRECTION_VERIFIER_REGISTRY_VERSION,
  verifyCorrectionEvidence,
} from './correction-verifiers.mjs';

export const CORRECTION_TICKET_SCHEMA_VERSION = 'correction-ticket-v1';
export const CORRECTION_RECEIPT_SCHEMA_VERSION = 'correction-receipt-v1';
export const CORRECTION_COMPLETION_SCHEMA_VERSION = 'correction-completion-v1';
export const CORRECTION_REQUEST_SCHEMA_VERSION = 'correction-close-request-v1';

const HASH_RE = /^[a-f0-9]{64}$/;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TICKET_RE = /^ct-[a-f0-9]{64}$/;
const RECEIPT_RE = /^cr-[a-f0-9]{64}$/;
const LEVELS = new Set(['NONE', 'L1', 'L2', 'L3', 'L4', 'L5']);
const PROMPT_SIGNALS = new Set(['NO_EXPLICIT_CORRECTION', 'EXPLICIT_CORRECTION']);
const EVIDENCE_KINDS = new Set([
  'DISCLOSURE',
  'AFFECTED_ARTIFACT',
  'OBSERVATION_RULE',
  'SEMANTIC_CANDIDATE',
  'FIX_OR_TASK_POINTER',
  'ROUTING_FIXTURE',
]);

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  return sha256(Buffer.from(stable(value), 'utf8'));
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} keys must be exactly: ${wanted.join(', ')}`);
  }
}

function validDate(value, label) {
  if (typeof value !== 'string' || !value || Number.isNaN(Date.parse(value))) throw new Error(`${label} must be an ISO date-time`);
}

function validatePromptSignal(value) {
  if (!PROMPT_SIGNALS.has(value)) throw new Error('invalid correction prompt_signal');
  return value;
}

export function classifyCorrectionPrompt(prompt) {
  const text = String(prompt || '').normalize('NFKC').trim();
  if (!text) return 'NO_EXPLICIT_CORRECTION';
  const explicitCorrection = [
    /(?:纠正|更正|改正|修正(?:一下)?|你(?:刚才|前面)?(?:做|说|理解|路由)?错(?:了)?|不对|不是.{0,80}而是|不要再|别再|以后(?:不要|必须|应该|请)|今后(?:不要|必须|应该|请)|听懂(?:了)?吗|我要求你(?:以后|今后)|记住(?:这个|这一点|以后|今后))/u,
    /(?:\bcorrection\b|\bcorrect\s+(?:this|that|your)\b|\byou(?:'re| are| were)?\s+wrong\b|\bthat(?:'s| is)\s+(?:wrong|incorrect)\b|\bnot\s+.{1,80}\s+but\b|\bdo not\s+.{0,80}\s+again\b|\bdon't\s+.{0,80}\s+again\b|\bfrom now on\b|\bin the future\b|\bremember (?:that|to)\b|\byou should have\b|\byou must not\b)/iu,
  ].some(pattern => pattern.test(text));
  return explicitCorrection ? 'EXPLICIT_CORRECTION' : 'NO_EXPLICIT_CORRECTION';
}

function validateSessionId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,36}$/.test(value)) throw new Error('invalid correction session_id');
  return value;
}

function validateEventId(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 256 || value.includes('\0')) throw new Error('invalid correction event_id');
  return value;
}

function ensureDirectory(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  const st = lstatSync(path);
  if (st.isSymbolicLink() || !st.isDirectory()) throw new Error(`correction state component is not a real directory: ${path}`);
}

function fsyncDirectory(path) {
  let fd;
  try {
    fd = openSync(path, 'r');
    fsyncSync(fd);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function createExclusive(path, bytes) {
  let fd;
  try {
    fd = openSync(path, 'wx', 0o600);
    let offset = 0;
    while (offset < bytes.length) offset += writeSync(fd, bytes, offset, bytes.length - offset);
    fsyncSync(fd);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
  fsyncDirectory(dirname(path));
}

function atomicReplace(path, bytes) {
  const temp = `${path}.tmp-${process.pid}-${randomUUID()}`;
  createExclusive(temp, bytes);
  renameSync(temp, path);
  fsyncDirectory(dirname(path));
}

function readRegularBytes(path, label) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1) throw new Error(`${label} must be a regular non-symlink, non-hardlink file: ${path}`);
    const raw = readFileSync(fd);
    const after = fstatSync(fd);
    if (
      after.dev !== before.dev
      || after.ino !== before.ino
      || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs
    ) throw new Error(`${label} changed while being read: ${path}`);
    return raw;
  } catch (error) {
    if (error?.code === 'ELOOP') throw new Error(`${label} must be a regular non-symlink file: ${path}`);
    throw error;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function statePaths(root, sessionId) {
  const sid = validateSessionId(sessionId);
  const stateRoot = resolve(root, '.claude', 'correction-state');
  const sessionRoot = join(stateRoot, sid);
  return {
    stateRoot,
    sessionRoot,
    active: join(sessionRoot, 'active-ticket.json'),
    completion: join(sessionRoot, 'completion.json'),
    receipts: join(sessionRoot, 'receipts'),
    consumed: join(sessionRoot, 'consumed'),
    lock: join(sessionRoot, '.close.lock'),
  };
}

function ensureState(root, sessionId) {
  const paths = statePaths(root, sessionId);
  ensureDirectory(resolve(root, '.claude'));
  ensureDirectory(paths.stateRoot);
  ensureDirectory(paths.sessionRoot);
  ensureDirectory(paths.receipts);
  ensureDirectory(paths.consumed);
  return paths;
}

function readExistingState(root, sessionId) {
  const paths = statePaths(root, sessionId);
  for (const path of [paths.stateRoot, paths.sessionRoot, paths.receipts, paths.consumed]) {
    if (!existsSync(path)) throw new Error('no correction state for requested session');
    const st = lstatSync(path);
    if (st.isSymbolicLink() || !st.isDirectory()) throw new Error(`correction state component is not a real directory: ${path}`);
  }
  return paths;
}

function validateTicket(ticket) {
  exactKeys(ticket, [
    'schema_version', 'verifier_registry', 'ticket_id', 'session_id', 'event_id',
    'prompt_sha256', 'prompt_signal', 'nonce', 'created_at',
  ], 'correction ticket');
  if (ticket.schema_version !== CORRECTION_TICKET_SCHEMA_VERSION) throw new Error('wrong correction ticket schema_version');
  if (ticket.verifier_registry !== CORRECTION_VERIFIER_REGISTRY_VERSION) throw new Error('wrong correction verifier registry');
  if (!TICKET_RE.test(ticket.ticket_id)) throw new Error('invalid correction ticket_id');
  validateSessionId(ticket.session_id);
  validateEventId(ticket.event_id);
  if (!HASH_RE.test(ticket.prompt_sha256)) throw new Error('invalid correction prompt hash');
  validatePromptSignal(ticket.prompt_signal);
  if (!UUID_V4_RE.test(ticket.nonce)) throw new Error('invalid correction nonce');
  validDate(ticket.created_at, 'ticket created_at');
  const expectedId = `ct-${stableHash({
    session_id: ticket.session_id,
    event_id: ticket.event_id,
    prompt_sha256: ticket.prompt_sha256,
    prompt_signal: ticket.prompt_signal,
    nonce: ticket.nonce,
    created_at: ticket.created_at,
  })}`;
  if (ticket.ticket_id !== expectedId) throw new Error('correction ticket_id integrity mismatch');
  return ticket;
}

function readTicket(path) {
  const raw = readRegularBytes(path, 'correction ticket');
  let ticket;
  try { ticket = JSON.parse(raw.toString('utf8')); } catch { throw new Error(`invalid correction ticket JSON: ${path}`); }
  return { ticket: validateTicket(ticket), raw, sha256: sha256(raw) };
}

function ticketFromBinding({ sessionId, eventId, promptSha256, promptSignal, now = new Date().toISOString() }) {
  const nonce = randomUUID();
  const binding = {
    session_id: validateSessionId(sessionId),
    event_id: validateEventId(eventId),
    prompt_sha256: promptSha256,
    prompt_signal: validatePromptSignal(promptSignal),
    nonce,
    created_at: now,
  };
  if (!HASH_RE.test(binding.prompt_sha256)) throw new Error('invalid correction prompt hash');
  validDate(binding.created_at, 'ticket created_at');
  return {
    schema_version: CORRECTION_TICKET_SCHEMA_VERSION,
    verifier_registry: CORRECTION_VERIFIER_REGISTRY_VERSION,
    ticket_id: `ct-${stableHash(binding)}`,
    ...binding,
  };
}

export function issueCorrectionTicket({ root, sessionId, eventId, prompt, promptSha256, promptSignal, now }) {
  const paths = ensureState(root, sessionId);
  if (existsSync(paths.active)) {
    const existing = readTicket(paths.active);
    if (existing.ticket.session_id !== sessionId) throw new Error('active correction ticket belongs to another session');
    return { ...existing, path: paths.active, created: false };
  }
  const hasPrompt = prompt !== undefined && prompt !== null;
  const derivedHash = hasPrompt ? sha256(Buffer.from(String(prompt), 'utf8')) : '';
  if (promptSha256 && hasPrompt && promptSha256 !== derivedHash) throw new Error('supplied correction prompt hash does not match prompt bytes');
  const promptHash = promptSha256 || derivedHash;
  if (!promptHash) throw new Error('correction prompt or promptSha256 is required');
  const derivedSignal = hasPrompt ? classifyCorrectionPrompt(prompt) : validatePromptSignal(promptSignal);
  if (hasPrompt && promptSignal && promptSignal !== derivedSignal) throw new Error('supplied correction prompt_signal does not match prompt bytes');
  const ticket = ticketFromBinding({ sessionId, eventId, promptSha256: promptHash, promptSignal: derivedSignal, now });
  const raw = jsonBytes(ticket);
  createExclusive(paths.active, raw);
  const readback = readTicket(paths.active);
  if (!raw.equals(readback.raw)) throw new Error('correction ticket read-back mismatch');
  return { ...readback, path: paths.active, created: true };
}

export function readActiveCorrectionTicket({ root, sessionId }) {
  const paths = statePaths(root, sessionId);
  if (!existsSync(paths.active)) return null;
  readExistingState(root, sessionId);
  return { ...readTicket(paths.active), path: paths.active };
}

export function correctionEvidenceVariants(attributionLevel, routeCorrection) {
  if (!LEVELS.has(attributionLevel)) throw new Error(`invalid attribution level: ${attributionLevel}`);
  if (typeof routeCorrection !== 'boolean') throw new Error('route_correction must be boolean');
  if (attributionLevel === 'NONE' && routeCorrection) throw new Error('NONE cannot be a route correction');
  const route = routeCorrection ? ['ROUTING_FIXTURE'] : [];
  switch (attributionLevel) {
    case 'NONE': return [[]];
    case 'L1': return [['DISCLOSURE', ...route]];
    case 'L2': return [['AFFECTED_ARTIFACT', ...route]];
    case 'L3': return [
      ['OBSERVATION_RULE', ...route],
      ['SEMANTIC_CANDIDATE', ...route],
    ];
    case 'L4': return [['SEMANTIC_CANDIDATE', ...route]];
    case 'L5': return [['FIX_OR_TASK_POINTER', ...route]];
    default: throw new Error('unreachable attribution level');
  }
}

function sameSet(actual, expected) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validateRequest(request) {
  exactKeys(request, [
    'schema_version', 'ticket_id', 'session_id', 'event_id', 'prompt_sha256', 'prompt_signal', 'nonce',
    'attribution_level', 'route_correction', 'evidence',
  ], 'correction close request');
  if (request.schema_version !== CORRECTION_REQUEST_SCHEMA_VERSION) throw new Error('wrong correction close request schema_version');
  if (!TICKET_RE.test(request.ticket_id)) throw new Error('invalid request ticket_id');
  validateSessionId(request.session_id);
  validateEventId(request.event_id);
  if (!HASH_RE.test(request.prompt_sha256)) throw new Error('invalid request prompt_sha256');
  validatePromptSignal(request.prompt_signal);
  if (!UUID_V4_RE.test(request.nonce)) throw new Error('invalid request nonce');
  if (!LEVELS.has(request.attribution_level)) throw new Error('invalid request attribution_level');
  if (typeof request.route_correction !== 'boolean') throw new Error('request route_correction must be boolean');
  if (!Array.isArray(request.evidence)) throw new Error('request evidence must be an array');
  const kinds = request.evidence.map((entry, index) => {
    exactKeys(entry, ['kind', 'verifier', 'path', 'selector'], `request evidence[${index}]`);
    if (!EVIDENCE_KINDS.has(entry.kind)) throw new Error(`unknown evidence kind: ${entry.kind}`);
    const registered = CORRECTION_VERIFIER_REGISTRY[entry.verifier];
    if (!registered) throw new Error(`unknown fixed verifier enum: ${entry.verifier}`);
    if (registered.kind !== entry.kind) throw new Error(`verifier ${entry.verifier} cannot verify ${entry.kind}`);
    return entry.kind;
  });
  if (new Set(kinds).size !== kinds.length) throw new Error('duplicate evidence kind');
  const variants = correctionEvidenceVariants(request.attribution_level, request.route_correction);
  const matched = variants.find(variant => sameSet(kinds, variant));
  if (!matched) throw new Error(`evidence kinds are not the exact attribution-derived set for ${request.attribution_level}`);
  return { request, requiredKinds: matched };
}

function assertRequestBindsTicket(request, ticket) {
  for (const key of ['ticket_id', 'session_id', 'event_id', 'prompt_sha256', 'prompt_signal', 'nonce']) {
    if (request[key] !== ticket[key]) throw new Error(`correction request ${key} does not bind active ticket`);
  }
}

function normalizeCounts(counts) {
  exactKeys(counts, ['edit', 'tool'], 'baseline counts');
  const edit = Number(counts.edit);
  const tool = Number(counts.tool);
  if (!Number.isSafeInteger(edit) || edit < 0 || !Number.isSafeInteger(tool) || tool < 0) throw new Error('baseline counts must be non-negative integers');
  return { edit, tool };
}

function validateReceiptShape(receipt) {
  exactKeys(receipt, [
    'schema_version', 'verifier_registry', 'receipt_id', 'ticket_id', 'ticket_sha256',
    'session_id', 'event_id', 'prompt_sha256', 'prompt_signal', 'nonce', 'attribution_level',
    'route_correction', 'required_evidence_kinds', 'evidence', 'baseline_counts', 'closed_at',
  ], 'correction receipt');
  if (receipt.schema_version !== CORRECTION_RECEIPT_SCHEMA_VERSION) throw new Error('wrong correction receipt schema_version');
  if (receipt.verifier_registry !== CORRECTION_VERIFIER_REGISTRY_VERSION) throw new Error('wrong receipt verifier registry');
  if (!RECEIPT_RE.test(receipt.receipt_id) || !TICKET_RE.test(receipt.ticket_id)) throw new Error('invalid correction receipt/ticket id');
  if (!HASH_RE.test(receipt.ticket_sha256) || !HASH_RE.test(receipt.prompt_sha256)) throw new Error('invalid correction receipt hash');
  validatePromptSignal(receipt.prompt_signal);
  validateSessionId(receipt.session_id);
  validateEventId(receipt.event_id);
  if (!UUID_V4_RE.test(receipt.nonce)) throw new Error('invalid correction receipt nonce');
  if (!LEVELS.has(receipt.attribution_level) || typeof receipt.route_correction !== 'boolean') throw new Error('invalid correction receipt attribution');
  if (!Array.isArray(receipt.required_evidence_kinds) || !Array.isArray(receipt.evidence)) throw new Error('invalid correction receipt evidence arrays');
  if (new Set(receipt.required_evidence_kinds).size !== receipt.required_evidence_kinds.length) throw new Error('duplicate receipt evidence kind');
  normalizeCounts(receipt.baseline_counts);
  validDate(receipt.closed_at, 'receipt closed_at');
  const expectedReceiptId = `cr-${stableHash({
    ticket_id: receipt.ticket_id,
    ticket_sha256: receipt.ticket_sha256,
    prompt_signal: receipt.prompt_signal,
    attribution_level: receipt.attribution_level,
    route_correction: receipt.route_correction,
    evidence: receipt.evidence,
    baseline_counts: receipt.baseline_counts,
    closed_at: receipt.closed_at,
  })}`;
  if (receipt.receipt_id !== expectedReceiptId) throw new Error('correction receipt_id integrity mismatch');
  return receipt;
}

function verifyReceiptAgainstTicket({ root, receipt, ticketRecord }) {
  validateReceiptShape(receipt);
  const ticket = ticketRecord.ticket;
  for (const key of ['ticket_id', 'session_id', 'event_id', 'prompt_sha256', 'prompt_signal', 'nonce']) {
    if (receipt[key] !== ticket[key]) throw new Error(`correction receipt ${key} does not bind ticket`);
  }
  if (receipt.ticket_sha256 !== ticketRecord.sha256) throw new Error('correction receipt ticket hash mismatch');
  if (Date.parse(receipt.closed_at) < Date.parse(ticket.created_at)) throw new Error('correction receipt predates ticket');
  if (receipt.attribution_level === 'NONE' && ticket.prompt_signal === 'EXPLICIT_CORRECTION') {
    throw new Error('explicit correction cannot close as NONE');
  }

  const variants = correctionEvidenceVariants(receipt.attribution_level, receipt.route_correction);
  if (!variants.some(variant => sameSet(receipt.required_evidence_kinds, variant))) {
    throw new Error('receipt required evidence set is not attribution-derived');
  }
  if (!sameSet(receipt.evidence.map(entry => entry.kind), receipt.required_evidence_kinds)) {
    throw new Error('receipt evidence does not match required kinds');
  }
  const reverified = receipt.evidence.map((entry, index) => {
    exactKeys(entry, ['kind', 'verifier', 'path', 'selector', 'observed_at', 'claim_sha256', 'artifacts'], `receipt evidence[${index}]`);
    validDate(entry.observed_at, `receipt evidence[${index}].observed_at`);
    if (Date.parse(entry.observed_at) < Date.parse(ticket.created_at)) throw new Error('correction evidence predates ticket');
    if (Date.parse(entry.observed_at) > Date.parse(receipt.closed_at)) throw new Error('correction evidence postdates receipt');
    if (!HASH_RE.test(entry.claim_sha256) || !Array.isArray(entry.artifacts) || entry.artifacts.length < 1) throw new Error('invalid receipt evidence proof');
    for (const [artifactIndex, item] of entry.artifacts.entries()) {
      exactKeys(item, ['path', 'sha256'], `receipt evidence[${index}].artifacts[${artifactIndex}]`);
      if (typeof item.path !== 'string' || !item.path || !HASH_RE.test(item.sha256)) throw new Error('invalid receipt artifact proof');
    }
    return verifyCorrectionEvidence(
      { kind: entry.kind, verifier: entry.verifier, path: entry.path, selector: entry.selector },
      { root, attributionLevel: receipt.attribution_level },
    );
  });
  if (stable(reverified) !== stable(receipt.evidence)) throw new Error('correction evidence changed after receipt close');
  return receipt;
}

function acquireCloseLock(paths) {
  mkdirSync(paths.lock, { mode: 0o700 });
  fsyncDirectory(paths.sessionRoot);
}

function releaseCloseLock(paths) {
  rmdirSync(paths.lock);
  fsyncDirectory(paths.sessionRoot);
}

function validateCompletion(completion) {
  exactKeys(completion, ['schema_version', 'ticket_id', 'ticket_sha256', 'receipt_id', 'receipt_sha256', 'completed_at'], 'correction completion');
  if (completion.schema_version !== CORRECTION_COMPLETION_SCHEMA_VERSION) throw new Error('wrong correction completion schema');
  if (!TICKET_RE.test(completion.ticket_id) || !RECEIPT_RE.test(completion.receipt_id)) throw new Error('invalid correction completion ids');
  if (!HASH_RE.test(completion.ticket_sha256) || !HASH_RE.test(completion.receipt_sha256)) throw new Error('invalid correction completion hashes');
  validDate(completion.completed_at, 'completion completed_at');
  return completion;
}

export function buildCorrectionCloseRequest({ ticket, attributionLevel, routeCorrection = false, evidence = [] }) {
  validateTicket(ticket);
  if (attributionLevel === 'NONE' && ticket.prompt_signal === 'EXPLICIT_CORRECTION') {
    throw new Error('explicit correction cannot close as NONE');
  }
  const request = {
    schema_version: CORRECTION_REQUEST_SCHEMA_VERSION,
    ticket_id: ticket.ticket_id,
    session_id: ticket.session_id,
    event_id: ticket.event_id,
    prompt_sha256: ticket.prompt_sha256,
    prompt_signal: ticket.prompt_signal,
    nonce: ticket.nonce,
    attribution_level: attributionLevel,
    route_correction: routeCorrection,
    evidence,
  };
  validateRequest(request);
  return request;
}

export function closeCorrectionTicket({ root, request, baselineCounts, now }) {
  const { requiredKinds } = validateRequest(request);
  if (now !== undefined) validDate(now, 'receipt closed_at');
  // A forged session id must not manufacture a new state tree before it is
  // rejected. Issuance is the only operation allowed to create session state.
  const paths = readExistingState(root, request.session_id);
  acquireCloseLock(paths);
  try {
    if (existsSync(paths.completion)) {
      const current = validateCompletion(JSON.parse(readRegularBytes(paths.completion, 'correction completion').toString('utf8')));
      if (current.ticket_id === request.ticket_id) throw new Error('correction ticket already consumed');
    }
    if (!existsSync(paths.active)) throw new Error('no active correction ticket');
    const ticketRecord = readTicket(paths.active);
    assertRequestBindsTicket(request, ticketRecord.ticket);
    if (request.attribution_level === 'NONE' && ticketRecord.ticket.prompt_signal === 'EXPLICIT_CORRECTION') {
      throw new Error('explicit correction cannot close as NONE');
    }
    const validatedEvidence = request.evidence.map(entry => verifyCorrectionEvidence(entry, {
      root,
      attributionLevel: request.attribution_level,
    }));
    const closedAt = now || new Date().toISOString();
    validDate(closedAt, 'receipt closed_at');
    for (const evidence of validatedEvidence) {
      validDate(evidence.observed_at, 'correction evidence observed_at');
      if (Date.parse(evidence.observed_at) < Date.parse(ticketRecord.ticket.created_at)) {
        throw new Error('correction evidence predates ticket');
      }
      if (Date.parse(evidence.observed_at) > Date.parse(closedAt)) throw new Error('correction evidence postdates receipt');
    }
    const counts = normalizeCounts(baselineCounts);
    const receiptCore = {
      schema_version: CORRECTION_RECEIPT_SCHEMA_VERSION,
      verifier_registry: CORRECTION_VERIFIER_REGISTRY_VERSION,
      ticket_id: ticketRecord.ticket.ticket_id,
      ticket_sha256: ticketRecord.sha256,
      session_id: ticketRecord.ticket.session_id,
      event_id: ticketRecord.ticket.event_id,
      prompt_sha256: ticketRecord.ticket.prompt_sha256,
      prompt_signal: ticketRecord.ticket.prompt_signal,
      nonce: ticketRecord.ticket.nonce,
      attribution_level: request.attribution_level,
      route_correction: request.route_correction,
      required_evidence_kinds: [...requiredKinds],
      evidence: validatedEvidence,
      baseline_counts: counts,
      closed_at: closedAt,
    };
    const receipt = {
      schema_version: receiptCore.schema_version,
      verifier_registry: receiptCore.verifier_registry,
      receipt_id: `cr-${stableHash({
        ticket_id: receiptCore.ticket_id,
        ticket_sha256: receiptCore.ticket_sha256,
        prompt_signal: receiptCore.prompt_signal,
        attribution_level: receiptCore.attribution_level,
        route_correction: receiptCore.route_correction,
        evidence: receiptCore.evidence,
        baseline_counts: receiptCore.baseline_counts,
        closed_at: receiptCore.closed_at,
      })}`,
      ...Object.fromEntries(Object.entries(receiptCore).slice(2)),
    };
    validateReceiptShape(receipt);
    const receiptRaw = jsonBytes(receipt);
    const receiptPath = join(paths.receipts, `${ticketRecord.ticket.ticket_id}.json`);
    if (existsSync(receiptPath)) {
      const existingRaw = readRegularBytes(receiptPath, 'correction receipt');
      const existing = JSON.parse(existingRaw.toString('utf8'));
      verifyReceiptAgainstTicket({ root, receipt: existing, ticketRecord });
      if (!existingRaw.equals(receiptRaw)) throw new Error('pre-existing receipt collision');
    } else {
      createExclusive(receiptPath, receiptRaw);
    }

    const activeReadback = readRegularBytes(paths.active, 'correction ticket');
    if (!activeReadback.equals(ticketRecord.raw)) throw new Error('active correction ticket changed before consumption');
    const consumedPath = join(paths.consumed, `${ticketRecord.ticket.ticket_id}.json`);
    if (existsSync(consumedPath)) throw new Error('consumed correction ticket collision');
    renameSync(paths.active, consumedPath);
    fsyncDirectory(paths.sessionRoot);
    fsyncDirectory(paths.consumed);

    const completion = {
      schema_version: CORRECTION_COMPLETION_SCHEMA_VERSION,
      ticket_id: ticketRecord.ticket.ticket_id,
      ticket_sha256: ticketRecord.sha256,
      receipt_id: receipt.receipt_id,
      receipt_sha256: sha256(receiptRaw),
      completed_at: closedAt,
    };
    atomicReplace(paths.completion, jsonBytes(completion));
    const verified = readCurrentCorrectionReceipt({ root, sessionId: request.session_id });
    if (verified.receipt.receipt_id !== receipt.receipt_id) throw new Error('correction completion read-back mismatch');
    return verified;
  } finally {
    releaseCloseLock(paths);
  }
}

export function readCurrentCorrectionReceipt({ root, sessionId }) {
  const paths = statePaths(root, sessionId);
  if (!existsSync(paths.completion)) return null;
  readExistingState(root, sessionId);
  if (existsSync(paths.active)) {
    readTicket(paths.active);
    throw new Error('active correction ticket supersedes prior completion');
  }
  let completion;
  try { completion = validateCompletion(JSON.parse(readRegularBytes(paths.completion, 'correction completion').toString('utf8'))); } catch (error) {
    throw new Error(`invalid correction completion: ${error.message}`);
  }
  const ticketPath = join(paths.consumed, `${completion.ticket_id}.json`);
  const receiptPath = join(paths.receipts, `${completion.ticket_id}.json`);
  if (!existsSync(ticketPath) || !existsSync(receiptPath)) throw new Error('correction completion points to missing ticket/receipt');
  const ticketRecord = readTicket(ticketPath);
  const receiptRaw = readRegularBytes(receiptPath, 'correction receipt');
  if (ticketRecord.sha256 !== completion.ticket_sha256 || sha256(receiptRaw) !== completion.receipt_sha256) {
    throw new Error('correction completion hash mismatch');
  }
  let receipt;
  try { receipt = JSON.parse(receiptRaw.toString('utf8')); } catch { throw new Error('invalid correction receipt JSON'); }
  verifyReceiptAgainstTicket({ root, receipt, ticketRecord });
  if (receipt.receipt_id !== completion.receipt_id) throw new Error('correction completion receipt id mismatch');
  return { completion, receipt, ticket: ticketRecord.ticket, ticket_sha256: ticketRecord.sha256, receipt_sha256: sha256(receiptRaw) };
}

export function ensureRearmCorrectionTicket({ root, sessionId, completed }) {
  const active = readActiveCorrectionTicket({ root, sessionId });
  if (active) return active;
  if (!completed?.ticket || completed.ticket.session_id !== sessionId) throw new Error('cannot rearm without a verified prior correction ticket');
  return issueCorrectionTicket({
    root,
    sessionId,
    eventId: completed.ticket.event_id,
    promptSha256: completed.ticket.prompt_sha256,
    promptSignal: completed.ticket.prompt_signal,
  });
}

export function correctionStatePath({ root, sessionId }) {
  return statePaths(root, sessionId).sessionRoot;
}

export function hashCorrectionPrompt(prompt) {
  return sha256(Buffer.from(String(prompt), 'utf8'));
}
