import { createHash, randomBytes } from 'crypto';
import { spawnSync } from 'child_process';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { isAbsolute, join, resolve } from 'path';

// Trust boundary (ADR-GATE-001): this module records, but does not create,
// native authority. The already-trusted top-level bootstrap main must supply
// the exact post-proposal role=user event. A delegated process, tool result or
// assistant-authored string has no authority; without that event the CLI emits
// BLOCKED_HUMAN_CHANNEL. This is replay/payload-drift evidence, not a
// cryptographic defense against an unsandboxed bootstrap main impersonating Luca.

export const HUMAN_GATE_PROPOSAL_SCHEMA_VERSION = 'human-gate-proposal-v1';
export const HUMAN_GATE_BINDING_SCHEMA_VERSION = 'human-gate-binding-v1';
export const HUMAN_GATE_RESULT_SCHEMA_VERSION = 'human-gate-result-v1';

const HASH_RE = /^[a-f0-9]{64}$/;
const NONCE_RE = /^[a-f0-9]{64}$/;
const GATE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const SESSION_RE = /^[A-Za-z0-9_-]{1,36}$/;
const EVENT_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const HARNESSES = new Set(['claude', 'codex']);

const PROPOSAL_KEYS = [
  'schema_version', 'proposal_id', 'gate', 'plan_sha256', 'payload_sha256',
  'execution_envelope_sha256', 'harness', 'session_id', 'receipt_root',
  'secure_writer_sha256', 'nonce', 'created_at', 'expires_at',
];
const BINDING_KEYS = [
  'schema_version', 'binding_id', 'proposal_id', 'proposal_sha256', 'gate',
  'plan_sha256', 'payload_sha256', 'execution_envelope_sha256', 'harness',
  'session_id', 'receipt_root', 'secure_writer_sha256', 'nonce', 'created_at',
  'expires_at', 'role', 'authority', 'top_level', 'event_id',
  'event_created_at', 'raw_prompt_sha256', 'observed_at',
];
const RESULT_KEYS = [
  'schema_version', 'result_id', 'binding_id', 'binding_sha256', 'proposal_id',
  'proposal_sha256', 'gate', 'harness', 'session_id', 'receipt_root',
  'secure_writer_sha256', 'readback_sha256', 'post_state_sha256', 'observed_at',
];

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

function canonicalInstant(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new Error(`${label} must be canonical UTC date-time`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    throw new Error(`${label} must be canonical UTC date-time`);
  }
  return milliseconds;
}

function hashValue(value, label) {
  if (!HASH_RE.test(value)) throw new Error(`${label} must be a sha256`);
  return value;
}

function validateIdentity(identity, label = 'receipt_root') {
  exactKeys(identity, ['dev', 'ino'], label);
  if (!/^(?:0|[1-9][0-9]*)$/.test(identity.dev) || !/^(?:0|[1-9][0-9]*)$/.test(identity.ino)) {
    throw new Error(`${label} identity is invalid`);
  }
  return identity;
}

function sameIdentity(left, right) {
  return String(left.dev) === String(right.dev) && String(left.ino) === String(right.ino);
}

function statIdentity(path) {
  const st = lstatSync(path, { bigint: true });
  if (st.isSymbolicLink() || !st.isDirectory()) throw new Error(`receipt root is not a real directory: ${path}`);
  return { dev: String(st.dev), ino: String(st.ino) };
}

function physicalRoot(path) {
  const root = resolve(path);
  if (!isAbsolute(path) || root !== path || realpathSync(root) !== root) {
    throw new Error('receiptRoot must be an absolute physical path without symlink ancestors');
  }
  return root;
}

function regularFileBytes(path, label) {
  const lst = lstatSync(path);
  if (lst.isSymbolicLink() || !lst.isFile() || lst.nlink !== 1) throw new Error(`${label} must be a single-link regular file`);
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1) throw new Error(`${label} must be a single-link regular file`);
    const bytes = readFileSync(fd);
    const after = fstatSync(fd);
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
      throw new Error(`${label} changed while read`);
    }
    const pathAfter = lstatSync(path);
    if (pathAfter.isSymbolicLink() || !pathAfter.isFile() || pathAfter.nlink !== 1
      || pathAfter.dev !== after.dev || pathAfter.ino !== after.ino || pathAfter.size !== after.size) {
      throw new Error(`${label} path identity changed while read`);
    }
    return bytes;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function safeSegments(relative) {
  if (typeof relative !== 'string' || !relative || relative.startsWith('/') || relative.includes('\\')) {
    throw new Error('receipt slot is invalid');
  }
  const parts = relative.split('/');
  if (parts.some(part => !SEGMENT_RE.test(part) || part === '.' || part === '..')) throw new Error('receipt slot is invalid');
  return parts;
}

function safeRead(root, relative, expectedRoot) {
  const parts = safeSegments(relative);
  const identities = [];
  let current = root;
  const rootIdentity = statIdentity(root);
  if (!sameIdentity(rootIdentity, expectedRoot)) throw new Error('receipt root identity mismatch');
  identities.push({ path: root, ...rootIdentity });
  for (const part of parts.slice(0, -1)) {
    current = join(current, part);
    const st = lstatSync(current, { bigint: true });
    if (st.isSymbolicLink() || !st.isDirectory()) throw new Error('receipt ancestor is not a real directory');
    identities.push({ path: current, dev: String(st.dev), ino: String(st.ino) });
  }
  const final = join(current, parts.at(-1));
  const bytes = regularFileBytes(final, 'receipt');
  for (const identity of identities) {
    const currentIdentity = statIdentity(identity.path);
    if (!sameIdentity(identity, currentIdentity)) throw new Error('receipt ancestor identity changed while read');
  }
  return bytes;
}

function writerHash(writerPath) {
  return sha256(regularFileBytes(writerPath, 'secure writer'));
}

function publish(root, identity, writerPath, expectedWriterSha, relative, bytes) {
  if (writerHash(writerPath) !== expectedWriterSha) throw new Error('secure writer hash mismatch');
  const parts = safeSegments(relative);
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'human-gate-publish-'));
  const inputPath = join(temporaryRoot, 'receipt.input');
  try {
    writeFileSync(inputPath, bytes, { flag: 'wx', mode: 0o600 });
    const argv = ['--root', root, '--root-dev', identity.dev, '--root-ino', identity.ino];
    for (const segment of parts.slice(0, -1)) argv.push('--segment', segment);
    argv.push('--final', parts.at(-1), '--input', inputPath, '--expected-input-sha', sha256(bytes));
    const result = spawnSync(writerPath, argv, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: '/usr/bin:/bin' },
      maxBuffer: 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`secure writer rejected publication: ${String(result.stderr || result.stdout).trim()}`);
    if (writerHash(writerPath) !== expectedWriterSha) throw new Error('secure writer changed during publication');
    const readback = safeRead(root, relative, identity);
    if (!readback.equals(bytes)) throw new Error('secure writer read-back mismatch');
    const expectedToken = `OK sha256=${sha256(bytes)} bytes=${bytes.length}`;
    if (String(result.stdout).trim() !== expectedToken) throw new Error('secure writer success token mismatch');
    return { path: join(root, ...parts), sha256: sha256(bytes), bytes: readback };
  } finally {
    try { unlinkSync(inputPath); } catch { }
    try { rmdirSync(temporaryRoot); } catch { }
  }
}

function proposalBody(proposal) {
  const { proposal_id: ignored, ...body } = proposal;
  return body;
}

function bindingBody(binding) {
  const { binding_id: ignored, ...body } = binding;
  return body;
}

function resultBody(result) {
  const { result_id: ignored, ...body } = result;
  return body;
}

export function validateHumanGateProposal(proposal) {
  exactKeys(proposal, PROPOSAL_KEYS, 'human gate proposal');
  if (proposal.schema_version !== HUMAN_GATE_PROPOSAL_SCHEMA_VERSION) throw new Error('proposal schema mismatch');
  if (!/^hgp-[a-f0-9]{64}$/.test(proposal.proposal_id)) throw new Error('invalid proposal_id');
  if (!GATE_RE.test(proposal.gate)) throw new Error('invalid gate');
  hashValue(proposal.plan_sha256, 'plan_sha256');
  hashValue(proposal.payload_sha256, 'payload_sha256');
  hashValue(proposal.execution_envelope_sha256, 'execution_envelope_sha256');
  if (!HARNESSES.has(proposal.harness)) throw new Error('invalid harness');
  if (!SESSION_RE.test(proposal.session_id)) throw new Error('invalid session_id');
  validateIdentity(proposal.receipt_root);
  hashValue(proposal.secure_writer_sha256, 'secure_writer_sha256');
  if (!NONCE_RE.test(proposal.nonce)) throw new Error('invalid nonce');
  const created = canonicalInstant(proposal.created_at, 'created_at');
  const expires = canonicalInstant(proposal.expires_at, 'expires_at');
  if (expires <= created) throw new Error('proposal expiry must follow creation');
  if (proposal.proposal_id !== `hgp-${stableHash(proposalBody(proposal))}`) throw new Error('proposal_id content binding mismatch');
  return proposal;
}

export function validateHumanGateBinding(binding, proposal, proposalBytes) {
  exactKeys(binding, BINDING_KEYS, 'human gate binding');
  validateHumanGateProposal(proposal);
  if (binding.schema_version !== HUMAN_GATE_BINDING_SCHEMA_VERSION) throw new Error('binding schema mismatch');
  if (!/^hgb-[a-f0-9]{64}$/.test(binding.binding_id)) throw new Error('invalid binding_id');
  const copied = ['proposal_id', 'gate', 'plan_sha256', 'payload_sha256', 'execution_envelope_sha256', 'harness', 'session_id', 'secure_writer_sha256', 'nonce', 'created_at', 'expires_at'];
  for (const key of copied) if (binding[key] !== proposal[key]) throw new Error(`binding ${key} mismatch`);
  validateIdentity(binding.receipt_root, 'binding receipt_root');
  if (!sameIdentity(binding.receipt_root, proposal.receipt_root)) throw new Error('binding receipt_root mismatch');
  if (binding.proposal_sha256 !== sha256(proposalBytes)) throw new Error('binding proposal hash mismatch');
  if (binding.role !== 'user' || binding.authority !== 'trusted-bootstrap-main' || binding.top_level !== true) {
    throw new Error('binding authority mismatch');
  }
  if (!EVENT_RE.test(binding.event_id)) throw new Error('invalid event_id');
  const created = canonicalInstant(binding.created_at, 'binding created_at');
  const eventCreated = canonicalInstant(binding.event_created_at, 'event_created_at');
  const observed = canonicalInstant(binding.observed_at, 'binding observed_at');
  const expires = canonicalInstant(binding.expires_at, 'binding expires_at');
  if (eventCreated <= created || observed < eventCreated || observed >= expires) throw new Error('binding event is stale or expired');
  hashValue(binding.raw_prompt_sha256, 'raw_prompt_sha256');
  const expectedPrompt = Buffer.from(`APPROVE ${proposal.gate} ${sha256(proposalBytes)} ${proposal.nonce}`, 'utf8');
  if (binding.raw_prompt_sha256 !== sha256(expectedPrompt)) throw new Error('binding raw prompt hash mismatch');
  if (binding.binding_id !== `hgb-${stableHash(bindingBody(binding))}`) throw new Error('binding_id content binding mismatch');
  return binding;
}

export function validateHumanGateResult(result, proposal, proposalBytes, binding, bindingBytes) {
  exactKeys(result, RESULT_KEYS, 'human gate result');
  validateHumanGateBinding(binding, proposal, proposalBytes);
  if (result.schema_version !== HUMAN_GATE_RESULT_SCHEMA_VERSION) throw new Error('result schema mismatch');
  if (!/^hgr-[a-f0-9]{64}$/.test(result.result_id)) throw new Error('invalid result_id');
  const copied = ['binding_id', 'proposal_id', 'gate', 'harness', 'session_id', 'secure_writer_sha256'];
  for (const key of copied) if (result[key] !== binding[key]) throw new Error(`result ${key} mismatch`);
  validateIdentity(result.receipt_root, 'result receipt_root');
  if (!sameIdentity(result.receipt_root, binding.receipt_root)) throw new Error('result receipt_root mismatch');
  if (result.proposal_sha256 !== sha256(proposalBytes)) throw new Error('result proposal hash mismatch');
  if (result.binding_sha256 !== sha256(bindingBytes)) throw new Error('result binding hash mismatch');
  hashValue(result.readback_sha256, 'readback_sha256');
  hashValue(result.post_state_sha256, 'post_state_sha256');
  const observed = canonicalInstant(result.observed_at, 'result observed_at');
  if (observed < canonicalInstant(binding.observed_at, 'binding observed_at')) throw new Error('result predates binding');
  if (result.result_id !== `hgr-${stableHash(resultBody(result))}`) throw new Error('result_id content binding mismatch');
  return result;
}

export function humanGateSlots(gate, proposalId) {
  if (!GATE_RE.test(gate) || !/^hgp-[a-f0-9]{64}$/.test(proposalId)) throw new Error('invalid human gate slot identity');
  const base = `human-gates/${gate}/${proposalId}`;
  return { proposal: `${base}/proposal.json`, binding: `${base}/approval-binding.json`, result: `${base}/result.json` };
}

export function createHumanGateProposal({
  receiptRoot, secureWriterPath, gate, planBytes, payloadBytes, executionEnvelopeBytes,
  harness, sessionId, now = new Date().toISOString(), expiresAt,
}) {
  const root = physicalRoot(receiptRoot);
  const identity = statIdentity(root);
  const createdAt = new Date(Date.parse(now)).toISOString();
  const expiry = new Date(Date.parse(expiresAt)).toISOString();
  const wallClock = Date.now();
  if (Date.parse(createdAt) > wallClock || Date.parse(expiry) <= wallClock) {
    throw new Error('proposal must be created no later than now and expire in the future');
  }
  const body = {
    schema_version: HUMAN_GATE_PROPOSAL_SCHEMA_VERSION,
    gate,
    plan_sha256: sha256(planBytes),
    payload_sha256: sha256(payloadBytes),
    execution_envelope_sha256: sha256(executionEnvelopeBytes),
    harness,
    session_id: sessionId,
    receipt_root: identity,
    secure_writer_sha256: writerHash(secureWriterPath),
    nonce: randomBytes(32).toString('hex'),
    created_at: createdAt,
    expires_at: expiry,
  };
  const proposal = { schema_version: body.schema_version, proposal_id: `hgp-${stableHash(body)}`, ...Object.fromEntries(Object.entries(body).slice(1)) };
  validateHumanGateProposal(proposal);
  const bytes = jsonBytes(proposal);
  const slots = humanGateSlots(gate, proposal.proposal_id);
  const published = publish(root, identity, secureWriterPath, proposal.secure_writer_sha256, slots.proposal, bytes);
  return { proposal, proposalBytes: bytes, proposalSha256: published.sha256, path: published.path, exactReply: `APPROVE ${gate} ${published.sha256} ${proposal.nonce}` };
}

function parseReceipt(bytes, label) {
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error(`${label} is not valid JSON`); }
  if (!jsonBytes(value).equals(bytes)) throw new Error(`${label} is not canonical JSON`);
  return value;
}

function readProposal(root, gate, proposalId, identity) {
  const slots = humanGateSlots(gate, proposalId);
  const bytes = safeRead(root, slots.proposal, identity);
  const proposal = validateHumanGateProposal(parseReceipt(bytes, 'proposal'));
  if (proposal.gate !== gate || proposal.proposal_id !== proposalId) throw new Error('proposal slot mismatch');
  return { proposal, bytes, slots };
}

function verifyExternalBytes(proposal, { planBytes, payloadBytes, executionEnvelopeBytes, secureWriterPath }) {
  if (sha256(planBytes) !== proposal.plan_sha256) throw new Error('Plan substitution detected');
  if (sha256(payloadBytes) !== proposal.payload_sha256) throw new Error('payload substitution detected');
  if (sha256(executionEnvelopeBytes) !== proposal.execution_envelope_sha256) throw new Error('execution envelope substitution detected');
  if (writerHash(secureWriterPath) !== proposal.secure_writer_sha256) throw new Error('secure writer substitution detected');
}

export function recordHumanGateApproval({
  receiptRoot, secureWriterPath, gate, proposalId, planBytes, payloadBytes,
  executionEnvelopeBytes, rawPromptBytes, event,
}) {
  const root = physicalRoot(receiptRoot);
  const rootIdentity = statIdentity(root);
  const initial = readProposal(root, gate, proposalId, rootIdentity);
  const { proposal, bytes: proposalBytes, slots } = initial;
  if (!sameIdentity(rootIdentity, proposal.receipt_root)) throw new Error('receipt root does not match proposal');
  verifyExternalBytes(proposal, { planBytes, payloadBytes, executionEnvelopeBytes, secureWriterPath });
  exactKeys(event, ['role', 'top_level', 'authority', 'event_id', 'event_created_at', 'observed_at', 'harness', 'session_id'], 'native user event');
  if (event.role !== 'user' || event.top_level !== true || event.authority !== 'trusted-bootstrap-main') throw new Error('native event lacks top-level user authority');
  if (event.harness !== proposal.harness || event.session_id !== proposal.session_id) throw new Error('native event scope mismatch');
  if (!EVENT_RE.test(event.event_id)) throw new Error('invalid native event_id');
  const created = canonicalInstant(proposal.created_at, 'proposal created_at');
  const expires = canonicalInstant(proposal.expires_at, 'proposal expires_at');
  const eventCreated = canonicalInstant(event.event_created_at, 'event_created_at');
  const observed = canonicalInstant(event.observed_at, 'observed_at');
  if (eventCreated <= created) throw new Error('native user event is not newer than proposal');
  const wallClock = Date.now();
  if (observed < eventCreated || observed > wallClock || observed >= expires || wallClock >= expires) {
    throw new Error('native user event is expired or temporally invalid');
  }
  const exact = Buffer.from(`APPROVE ${proposal.gate} ${sha256(proposalBytes)} ${proposal.nonce}`, 'utf8');
  if (!Buffer.isBuffer(rawPromptBytes) || !rawPromptBytes.equals(exact)) throw new Error('approval prompt bytes are not exact');
  const body = {
    schema_version: HUMAN_GATE_BINDING_SCHEMA_VERSION,
    proposal_id: proposal.proposal_id,
    proposal_sha256: sha256(proposalBytes),
    gate: proposal.gate,
    plan_sha256: proposal.plan_sha256,
    payload_sha256: proposal.payload_sha256,
    execution_envelope_sha256: proposal.execution_envelope_sha256,
    harness: proposal.harness,
    session_id: proposal.session_id,
    receipt_root: proposal.receipt_root,
    secure_writer_sha256: proposal.secure_writer_sha256,
    nonce: proposal.nonce,
    created_at: proposal.created_at,
    expires_at: proposal.expires_at,
    role: 'user',
    authority: 'trusted-bootstrap-main',
    top_level: true,
    event_id: event.event_id,
    event_created_at: event.event_created_at,
    raw_prompt_sha256: sha256(rawPromptBytes),
    observed_at: event.observed_at,
  };
  const binding = { schema_version: body.schema_version, binding_id: `hgb-${stableHash(body)}`, ...Object.fromEntries(Object.entries(body).slice(1)) };
  const bindingBytes = jsonBytes(binding);
  validateHumanGateBinding(binding, proposal, proposalBytes);
  const published = publish(root, proposal.receipt_root, secureWriterPath, proposal.secure_writer_sha256, slots.binding, bindingBytes);
  return { binding, bindingBytes, bindingSha256: published.sha256, path: published.path };
}

export function recordHumanGateResult({
  receiptRoot, secureWriterPath, gate, proposalId, planBytes, payloadBytes,
  executionEnvelopeBytes, readbackBytes, postStateSha256, observedAt = new Date().toISOString(),
}) {
  const root = physicalRoot(receiptRoot);
  const rootIdentity = statIdentity(root);
  const { proposal, bytes: proposalBytes, slots } = readProposal(root, gate, proposalId, rootIdentity);
  if (!sameIdentity(rootIdentity, proposal.receipt_root)) throw new Error('receipt root does not match proposal');
  verifyExternalBytes(proposal, { planBytes, payloadBytes, executionEnvelopeBytes, secureWriterPath });
  const bindingBytes = safeRead(root, slots.binding, proposal.receipt_root);
  const binding = parseReceipt(bindingBytes, 'binding');
  validateHumanGateBinding(binding, proposal, proposalBytes);
  hashValue(postStateSha256, 'post_state_sha256');
  const resultObservedAt = new Date(Date.parse(observedAt)).toISOString();
  if (Date.parse(resultObservedAt) > Date.now()) throw new Error('result observation cannot be in the future');
  const body = {
    schema_version: HUMAN_GATE_RESULT_SCHEMA_VERSION,
    binding_id: binding.binding_id,
    binding_sha256: sha256(bindingBytes),
    proposal_id: proposal.proposal_id,
    proposal_sha256: sha256(proposalBytes),
    gate: proposal.gate,
    harness: proposal.harness,
    session_id: proposal.session_id,
    receipt_root: proposal.receipt_root,
    secure_writer_sha256: proposal.secure_writer_sha256,
    readback_sha256: sha256(readbackBytes),
    post_state_sha256: postStateSha256,
    observed_at: resultObservedAt,
  };
  const result = { schema_version: body.schema_version, result_id: `hgr-${stableHash(body)}`, ...Object.fromEntries(Object.entries(body).slice(1)) };
  const resultBytes = jsonBytes(result);
  validateHumanGateResult(result, proposal, proposalBytes, binding, bindingBytes);
  const published = publish(root, proposal.receipt_root, secureWriterPath, proposal.secure_writer_sha256, slots.result, resultBytes);
  return { result, resultBytes, resultSha256: published.sha256, path: published.path };
}

export function verifyHumanGateChain({
  receiptRoot, secureWriterPath, gate, proposalId, planBytes, payloadBytes,
  executionEnvelopeBytes, readbackBytes, expectedPostStateSha256,
}) {
  const root = physicalRoot(receiptRoot);
  const identity = statIdentity(root);
  const { proposal, bytes: proposalBytes, slots } = readProposal(root, gate, proposalId, identity);
  if (!sameIdentity(identity, proposal.receipt_root)) throw new Error('receipt root does not match proposal');
  verifyExternalBytes(proposal, { planBytes, payloadBytes, executionEnvelopeBytes, secureWriterPath });
  const bindingBytes = safeRead(root, slots.binding, proposal.receipt_root);
  const binding = parseReceipt(bindingBytes, 'binding');
  validateHumanGateBinding(binding, proposal, proposalBytes);
  const resultBytes = safeRead(root, slots.result, proposal.receipt_root);
  const result = parseReceipt(resultBytes, 'result');
  validateHumanGateResult(result, proposal, proposalBytes, binding, bindingBytes);
  if (result.readback_sha256 !== sha256(readbackBytes)) throw new Error('independent read-back mismatch');
  if (result.post_state_sha256 !== expectedPostStateSha256) throw new Error('post-state mismatch');
  return { proposal, binding, result, proposalSha256: sha256(proposalBytes), bindingSha256: sha256(bindingBytes), resultSha256: sha256(resultBytes) };
}

export function hashHumanGateBytes(bytes) {
  return sha256(bytes);
}
