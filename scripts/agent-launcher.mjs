#!/usr/bin/env node
/**
 * Candidate native-agent dispatcher for ADR-AGENT-001.
 *
 * This module validates role/packet inputs and constructs the native CLI launch.
 * It deliberately does not create trust anchors, sign receipts, or decide whether
 * a captured stream proves a native child edge.  Those jobs belong to the frozen
 * evidence TCB and its independent verifier.
 */
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const SELF = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = resolve(dirname(SELF), '..');
export const WORK_PACKET_VERSION = 'luca.work-packet.v1';
export const LOGICAL_ROLES = Object.freeze(['plan-agent', 'work-agent', 'oracle', 'quality-gate']);
export const ACTIVATION_GATED_ROLES = Object.freeze(['work-agent', 'oracle']);
export const ROLE_CONTRACT = Object.freeze({
  'plan-agent': Object.freeze({ tier: 'reasoning-heavy', claude: '.claude/agents/plan-agent.md', codex: '.codex/agents/plan-agent.toml' }),
  'work-agent': Object.freeze({ tier: 'core-execution', claude: '.claude/agents/work-agent.md', codex: '.codex/agents/work-agent.toml' }),
  oracle: Object.freeze({ tier: 'reasoning-heavy', claude: '.claude/agents/oracle.md', codex: '.codex/agents/oracle.toml' }),
  'quality-gate': Object.freeze({ tier: 'core-execution', claude: '.claude/agents/quality-gate.md', codex: '.codex/agents/quality-gate.toml' }),
});

const HASH_RE = /^[a-f0-9]{64}$/;
const ID_RE = /^wp-[a-z0-9][a-z0-9._-]{2,127}$/;
const NATIVE_WORK_VERIFY_COMMAND = "test -f scripts/agent-launcher.mjs && printf 'LUCA_NATIVE_WORK_AGENT_VERIFY_WP_NATIVE_SMOKE_V1\\n'";
const codexApiSandbox = (mode) => mode === 'workspace-write'
  ? { type: 'workspaceWrite', writableRoots: [], networkAccess: false, excludeTmpdirEnvVar: true, excludeSlashTmp: true }
  : { type: 'readOnly', networkAccess: false };
const MUTABLE_ACCESS = new Set(['write', 'create', 'delete']);
const ACCESS = new Set(['read', ...MUTABLE_ACCESS]);
const VALIDATED_PACKETS = new WeakSet();
const CLAUDE_MODEL_PROBE_SENTINEL = 'LUCA_CLAUDE_MODEL_PROBE_OK';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const stable = (value) => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const fail = (message) => { throw new Error(message); };
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;
const exactKeys = (value, keys, label) => {
  if (!isRecord(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (stable(actual) !== stable(expected)) fail(`${label} keys must be exact: ${expected.join(',')}`);
};
const boundedString = (value, label, maxLength) => {
  const length = typeof value === 'string' ? [...value].length : 0;
  if (typeof value !== 'string' || length < 1 || length > maxLength) {
    fail(`${label} must be a nonempty string of at most ${maxLength} characters`);
  }
};
const relativePath = (value, label) => {
  boundedString(value, label, 1024);
  const segments = value.split('/');
  if (value.startsWith('/') || value.endsWith('/') || /^[A-Za-z]:/.test(value)
    || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)
    || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    fail(`${label} must be a canonical non-traversing relative path`);
  }
};
const unique = (values, label) => {
  if (new Set(values).size !== values.length) fail(`${label} contains duplicates`);
};
const nonemptyArray = (value, label) => {
  if (!Array.isArray(value) || value.length < 1
    || Object.keys(value).length !== value.length
    || Object.getPrototypeOf(value) !== Array.prototype) fail(`${label} must be a dense nonempty array`);
};
const overlaps = (left, right) => left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
};

export function validateWorkPacket(packet) {
  const top = ['schema_version', 'packet_id', 'phase_id', 'logical_role', 'cwd_key', 'goal', 'ownership', 'files', 'inputs', 'constraints', 'protected_paths', 'outputs', 'done_criteria', 'verification', 'rollback'];
  exactKeys(packet, top, 'work packet');
  if (packet.schema_version !== WORK_PACKET_VERSION) fail('wrong work packet schema_version');
  if (typeof packet.packet_id !== 'string' || !ID_RE.test(packet.packet_id)) fail('invalid packet_id');
  boundedString(packet.phase_id, 'phase_id', 128);
  if (packet.logical_role !== 'work-agent') fail('work packet logical_role must be work-agent');
  boundedString(packet.cwd_key, 'cwd_key', 256);
  boundedString(packet.goal, 'goal', 4096);
  for (const key of ['ownership', 'files', 'inputs', 'constraints', 'protected_paths', 'outputs', 'done_criteria', 'verification', 'rollback']) nonemptyArray(packet[key], key);

  packet.constraints.forEach((value, index) => boundedString(value, `constraints[${index}]`, 4096));
  packet.rollback.forEach((value, index) => boundedString(value, `rollback[${index}]`, 4096));
  unique(packet.constraints, 'constraints');
  unique(packet.rollback, 'rollback');
  packet.protected_paths.forEach((value, index) => relativePath(value, `protected_paths[${index}]`));
  unique(packet.protected_paths, 'protected_paths');

  const ownership = new Map();
  packet.ownership.forEach((entry, index) => {
    exactKeys(entry, ['path', 'owner', 'access'], `ownership[${index}]`);
    relativePath(entry.path, `ownership[${index}].path`);
    boundedString(entry.owner, `ownership[${index}].owner`, 256);
    if (!ACCESS.has(entry.access)) fail(`ownership[${index}].access is invalid`);
    if (ownership.has(entry.path)) fail(`duplicate ownership path ${entry.path}`);
    ownership.set(entry.path, entry.access);
  });

  const files = new Map();
  packet.files.forEach((entry, index) => {
    exactKeys(entry, ['path', 'purpose', 'access'], `files[${index}]`);
    relativePath(entry.path, `files[${index}].path`);
    boundedString(entry.purpose, `files[${index}].purpose`, 2048);
    if (!ACCESS.has(entry.access)) fail(`files[${index}].access is invalid`);
    if (files.has(entry.path)) fail(`duplicate file path ${entry.path}`);
    files.set(entry.path, entry.access);
  });

  const inputIds = [];
  packet.inputs.forEach((entry, index) => {
    exactKeys(entry, ['id', 'source', 'content', 'content_sha256'], `inputs[${index}]`);
    if (typeof entry.id !== 'string' || !/^IN-[A-Z0-9][A-Z0-9_-]{0,63}$/.test(entry.id)) fail(`inputs[${index}].id is invalid`);
    boundedString(entry.source, `inputs[${index}].source`, 2048);
    if (typeof entry.content !== 'string' || entry.content.length < 1) fail(`inputs[${index}].content must be a nonempty string`);
    if (!HASH_RE.test(entry.content_sha256) || sha256(Buffer.from(entry.content, 'utf8')) !== entry.content_sha256) fail(`inputs[${index}] content hash mismatch`);
    inputIds.push(entry.id);
  });
  unique(inputIds, 'input IDs');

  const doneIds = new Set();
  packet.done_criteria.forEach((entry, index) => {
    exactKeys(entry, ['id', 'statement'], `done_criteria[${index}]`);
    if (typeof entry.id !== 'string' || !/^DONE-[A-Z0-9][A-Z0-9_-]{0,63}$/.test(entry.id)) fail(`done_criteria[${index}].id is invalid`);
    boundedString(entry.statement, `done_criteria[${index}].statement`, 4096);
    if (doneIds.has(entry.id)) fail(`duplicate done criterion ${entry.id}`);
    doneIds.add(entry.id);
  });

  const outputPaths = [];
  packet.outputs.forEach((entry, index) => {
    exactKeys(entry, ['path', 'description', 'done_criterion_ids'], `outputs[${index}]`);
    relativePath(entry.path, `outputs[${index}].path`);
    boundedString(entry.description, `outputs[${index}].description`, 2048);
    nonemptyArray(entry.done_criterion_ids, `outputs[${index}].done_criterion_ids`);
    unique(entry.done_criterion_ids, `outputs[${index}].done_criterion_ids`);
    for (const id of entry.done_criterion_ids) {
      if (typeof id !== 'string' || !/^DONE-[A-Z0-9][A-Z0-9_-]{0,63}$/.test(id) || !doneIds.has(id)) {
        fail(`output ${entry.path} references invalid or unknown done criterion ${String(id)}`);
      }
    }
    if (!MUTABLE_ACCESS.has(ownership.get(entry.path))) fail(`output ${entry.path} has no mutable ownership`);
    if (!MUTABLE_ACCESS.has(files.get(entry.path))) fail(`output ${entry.path} is not a declared mutable file`);
    outputPaths.push(entry.path);
  });
  unique(outputPaths, 'output paths');

  const verificationIds = [];
  packet.verification.forEach((entry, index) => {
    exactKeys(entry, ['id', 'command', 'expected_exit'], `verification[${index}]`);
    if (typeof entry.id !== 'string' || !/^VERIFY-[A-Z0-9][A-Z0-9_-]{0,63}$/.test(entry.id)) fail(`verification[${index}].id is invalid`);
    boundedString(entry.command, `verification[${index}].command`, 8192);
    if (!Number.isInteger(entry.expected_exit) || entry.expected_exit < 0 || entry.expected_exit > 255) fail(`verification[${index}].expected_exit is invalid`);
    verificationIds.push(entry.id);
  });
  unique(verificationIds, 'verification IDs');

  const protectedSet = new Set(packet.protected_paths);
  const collidesWithProtection = (path) => [...protectedSet].some((protectedPath) => overlaps(path, protectedPath));
  for (const [path, access] of ownership) if (MUTABLE_ACCESS.has(access) && collidesWithProtection(path)) fail(`protected path overlaps mutable ownership ${path}`);
  for (const [path, access] of files) {
    if (access !== ownership.get(path)) fail(`file ${path} access does not match ownership`);
    if (MUTABLE_ACCESS.has(access) && collidesWithProtection(path)) fail(`protected path overlaps mutable file ${path}`);
  }
  for (const path of outputPaths) if (collidesWithProtection(path)) fail(`output ${path} overlaps a protected path`);

  let frozenPacket;
  try {
    // JSON round-trip is intentional: the packet contract is a JSON schema, so
    // cycles, undefined values, exotic prototypes and non-finite numbers are
    // not admissible through the exported API either.
    const encoded = JSON.stringify(packet);
    if (typeof encoded !== 'string') fail('work packet is not JSON data');
    frozenPacket = JSON.parse(encoded);
  } catch (error) {
    fail(`work packet is not JSON data: ${error.message}`);
  }
  if (stable(frozenPacket) !== stable(packet)) fail('work packet changes under JSON canonicalization');
  deepFreeze(frozenPacket);
  const canonicalJson = stable(frozenPacket);
  const result = Object.freeze({
    packet: frozenPacket,
    canonical_json: canonicalJson,
    sha256: sha256(Buffer.from(canonicalJson, 'utf8')),
  });
  VALIDATED_PACKETS.add(result);
  return result;
}

export function loadWorkPacket(path) {
  const bytes = readFileSync(path);
  let packet;
  try { packet = JSON.parse(bytes.toString('utf8')); } catch { fail('work packet is not valid JSON'); }
  const validated = validateWorkPacket(packet);
  const result = Object.freeze({ ...validated, source_bytes_sha256: sha256(bytes), path: realpathSync(path) });
  VALIDATED_PACKETS.add(result);
  return result;
}

function validateLaunchPacket(role, packet) {
  if (role === 'work-agent') {
    if (!packet || !VALIDATED_PACKETS.has(packet)
      || stable(packet.packet) !== packet.canonical_json
      || sha256(Buffer.from(packet.canonical_json, 'utf8')) !== packet.sha256) {
      fail('work-agent launch requires an intact validateWorkPacket/loadWorkPacket result');
    }
    assertNativeSmokePacket(packet.packet);
  } else if (packet) fail(`${role} does not accept a work packet`);
}

function assertNativeSmokePacket(packet) {
  if (packet.ownership.length !== 1 || stable(packet.ownership[0]) !== stable({ path: '@response', owner: 'work-agent', access: 'create' })
    || packet.files.length !== 1 || stable(packet.files[0]) !== stable({ path: '@response', purpose: 'Logical native child response; this is not a filesystem path.', access: 'create' })
    || packet.outputs.length !== 1 || stable(packet.outputs[0]) !== stable({ path: '@response', description: 'Native child response containing the exact role sentinel and packet id.', done_criterion_ids: ['DONE-SENTINEL'] })
    || packet.done_criteria.length !== 1 || packet.done_criteria[0].id !== 'DONE-SENTINEL'
    || packet.verification.length !== 1 || packet.verification[0].id !== 'VERIFY-SENTINEL'
    || packet.verification[0].expected_exit !== 0 || packet.verification[0].command !== NATIVE_WORK_VERIFY_COMMAND) {
    fail('native work launch requires the sole exact @response smoke contract and frozen verification command');
  }
}

function parseRouting(root) {
  const path = join(root, '.claude/skill-os/model-routing.yaml');
  const text = readFileSync(path, 'utf8');
  const lineupMatch = text.match(/^known_lineup:\s*\[([^\]]+)\]\s*$/m);
  if (!lineupMatch) fail('model-routing missing known_lineup');
  const knownLineup = lineupMatch[1].split(',').map((value) => value.trim());
  if (knownLineup.some((value) => !/^[A-Za-z0-9._-]+$/.test(value))) fail('model-routing has invalid known_lineup');
  unique(knownLineup, 'model-routing known_lineup');
  const tier = {};
  for (const name of ['reasoning-heavy', 'core-execution', 'guided-execution', 'mechanical']) {
    const block = text.match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [a-z][a-z-]+:|^#|\\Z)`, 'm'))?.[1] || '';
    const alias = block.match(/^    resolves_to:\s*([A-Za-z0-9._-]+)/m)?.[1];
    if (!alias) fail(`model-routing missing Claude projection for ${name}`);
    if (!knownLineup.includes(alias)) fail(`model-routing Claude projection ${alias} for ${name} is outside known_lineup`);
    const fallback = block.match(/^    fallback:\s*([A-Za-z0-9._-]+)/m)?.[1] || null;
    if (fallback) {
      const primaryIndex = knownLineup.indexOf(alias);
      const fallbackIndex = knownLineup.indexOf(fallback);
      if (fallbackIndex < 0) fail(`model-routing fallback ${fallback} for ${name} is outside known_lineup`);
      if (fallbackIndex !== primaryIndex + 1) {
        fail(`model-routing fallback ${fallback} for ${name} must be the next lower known_lineup alias after ${alias}`);
      }
    }
    tier[name] = { alias, fallback };
  }
  if (!tier['reasoning-heavy'].fallback
      || tier['reasoning-heavy'].fallback !== tier['core-execution'].alias
      || tier['core-execution'].fallback !== null) {
    fail('model-routing Claude fallback chain must be reasoning-heavy -> core-execution with no core fallback');
  }
  const codexBlock = text.match(/^codex:\n([\s\S]*?)(?=^# ─── 新场景|\Z)/m)?.[1] || '';
  const effortBlock = codexBlock.match(/^  tier_to_effort:\n([\s\S]*?)(?=^  [a-z_]+:|\Z)/m)?.[1] || '';
  for (const name of Object.keys(tier)) {
    const effort = effortBlock.match(new RegExp(`^    ${name}:\\s*(none|low|medium|high|xhigh|max)\\b`, 'm'))?.[1];
    if (!effort || effort === 'minimal') fail(`model-routing missing valid Codex projection for ${name}`);
    tier[name].effort = effort;
  }
  return deepFreeze({ path, sha256: sha256(Buffer.from(text)), knownLineup, tier });
}

function parseClaudeFrontmatter(text, role) {
  if (!text.startsWith('---\n')) fail(`Claude role ${role} is not registered`);
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) fail(`Claude role ${role} has invalid frontmatter`);
  const front = text.slice(4, end);
  const name = front.match(/^name:\s*([^\s#]+)\s*$/m)?.[1];
  if (name !== role) fail(`Claude role name mismatch for ${role}`);
  if (/^model\s*:/m.test(front)) fail(`Claude role ${role} hardcodes a model`);
  return { frontmatter: front, body: text.slice(end + 5) };
}

function parseCodexToml(text, role, expectedEffort) {
  const name = text.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
  const effort = text.match(/^model_reasoning_effort\s*=\s*"([^"]+)"/m)?.[1];
  if (name !== role) fail(`Codex role name mismatch for ${role}`);
  if (/^model\s*=/m.test(text)) fail(`Codex role ${role} hardcodes a model`);
  if (effort !== expectedEffort) fail(`Codex role ${role} effort ${effort || 'missing'} != ${expectedEffort}`);
  if (!text.includes(`.claude/agents/${role}.md`)) fail(`Codex role ${role} does not point to Claude authority`);
}

export function resolveRole({ root = DEFAULT_ROOT, role, harness, projectionMode = 'primary' }) {
  root = realpathSync(root);
  if (!LOGICAL_ROLES.includes(role)) fail(`unknown logical role ${role}`);
  if (!['claude', 'codex'].includes(harness)) fail(`unknown harness ${harness}`);
  if (!['primary', 'fallback'].includes(projectionMode)) fail(`unknown projectionMode ${projectionMode}`);
  if (harness === 'codex' && projectionMode !== 'primary') fail('Codex projectionMode must be primary');
  const routing = parseRouting(root);
  const contract = ROLE_CONTRACT[role];
  const tierProjection = routing.tier[contract.tier];
  if (projectionMode === 'fallback' && !tierProjection.fallback) {
    fail(`model-routing has no fallback projection for ${contract.tier}`);
  }
  const definitionPath = join(root, contract[harness]);
  if (!existsSync(definitionPath)) fail(`missing ${harness} definition for ${role}`);
  const bytes = readFileSync(definitionPath);
  const text = bytes.toString('utf8');
  if (harness === 'claude') parseClaudeFrontmatter(text, role);
  else parseCodexToml(text, role, routing.tier[contract.tier].effort);
  return Object.freeze({
    root,
    role,
    harness,
    tier: contract.tier,
    projection: harness === 'claude'
      ? (projectionMode === 'fallback' ? tierProjection.fallback : tierProjection.alias)
      : tierProjection.effort,
    routing_path: relative(root, routing.path),
    routing_sha256: routing.sha256,
    definition_path: relative(root, definitionPath),
    definition_sha256: sha256(bytes),
    definition_text: text,
  });
}

function rolePayload(role, packet) {
  const sentinel = `LUCA_NATIVE_${role.replaceAll('-', '_').toUpperCase()}_RESULT`;
  if (role === 'work-agent') {
    if (!packet) fail('work-agent requires a validated work packet');
    // The registered work-agent accepts only the materialized packet.  Its
    // smoke goal/constraints (including the sentinel) live inside the packet;
    // no prose or XML wrapper may create a second, unvalidated instruction.
    return stable(packet.packet);
  }
  return `Perform a read-only native role smoke check. Do not call tools and do not edit files. Return exactly ${sentinel}.`;
}

const containsToolInvocation = (value) => {
  if (Array.isArray(value)) return value.some(containsToolInvocation);
  if (!value || typeof value !== 'object') return false;
  const type = typeof value.type === 'string' ? value.type.toLowerCase() : '';
  if (['tool_use', 'server_tool_use', 'mcp_tool_use'].includes(type)) return true;
  if (typeof value.tool_use_id === 'string' && value.tool_use_id.length > 0) return true;
  return Object.values(value).some(containsToolInvocation);
};

const modelMatchesAlias = (model, alias) => typeof model === 'string'
  && new RegExp(`(^|[-_.])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[-_.0-9])`, 'i').test(model);

export function classifyClaudeModelProbe({ status, stdout, stderr = '', expectedAlias, expectedCwd,
  allowCreditsRequired = false }) {
  if (!Number.isInteger(status)) return Object.freeze({ outcome: 'rejected', reason: 'missing_exit_status' });
  if (typeof stdout !== 'string' || typeof stderr !== 'string') {
    return Object.freeze({ outcome: 'rejected', reason: 'invalid_process_output' });
  }
  if (typeof expectedAlias !== 'string' || !/^[A-Za-z0-9._-]+$/.test(expectedAlias)) {
    return Object.freeze({ outcome: 'rejected', reason: 'invalid_expected_alias' });
  }
  if (typeof expectedCwd !== 'string' || !isAbsolute(expectedCwd) || resolve(expectedCwd) !== expectedCwd) {
    return Object.freeze({ outcome: 'rejected', reason: 'invalid_expected_cwd' });
  }
  const lines = stdout.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 1) return Object.freeze({ outcome: 'rejected', reason: 'empty_stream' });
  const events = [];
  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('not an object');
      events.push(event);
    } catch {
      return Object.freeze({ outcome: 'rejected', reason: 'non_json_stream' });
    }
  }
  if (events.some(containsToolInvocation)) return Object.freeze({ outcome: 'rejected', reason: 'tool_invocation_observed' });
  if (events.length !== 4) return Object.freeze({ outcome: 'rejected', reason: 'probe_transport_shape' });
  const [init, rateLimit, assistant, result] = events;
  const sessionId = init?.session_id;
  const exactTransport = init?.type === 'system'
    && init?.subtype === 'init'
    && init?.cwd === expectedCwd
    && Array.isArray(init?.tools)
    && init.tools.length === 0
    && init?.permissionMode === 'dontAsk'
    && modelMatchesAlias(init?.model, expectedAlias)
    && typeof sessionId === 'string'
    && sessionId.length > 0
    && rateLimit?.type === 'rate_limit_event'
    && assistant?.type === 'assistant'
    && result?.type === 'result'
    && events.every((event) => event.session_id === sessionId);
  if (!exactTransport) return Object.freeze({ outcome: 'rejected', reason: 'probe_transport_shape' });
  const assistantContent = assistant?.message?.content;
  const assistantText = Array.isArray(assistantContent) && assistantContent.length === 1
    && assistantContent[0]?.type === 'text' && typeof assistantContent[0]?.text === 'string'
    ? assistantContent[0].text : null;
  const exactSuccess = status === 0
    && stderr === ''
    && rateLimit?.rate_limit_info?.status === 'allowed'
    && assistant?.parent_tool_use_id === null
    && modelMatchesAlias(assistant?.message?.model, expectedAlias)
    && assistantText === CLAUDE_MODEL_PROBE_SENTINEL
    && result.subtype === 'success'
    && result.is_error === false
    && result.result === CLAUDE_MODEL_PROBE_SENTINEL
    && result.terminal_reason === 'completed';
  if (exactSuccess) return Object.freeze({ outcome: 'success', reason: 'exact_success' });
  const errorText = assistantText;
  const creditsTextMatchesAlias = typeof errorText === 'string'
    && new RegExp(`^${expectedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s+\\d+(?:\\.\\d+)*)?\\s+requires usage credits(?:[.!]|$)`, 'i').test(errorText);
  const exactCreditsRequired = allowCreditsRequired === true
    && status === 1
    && stderr === ''
    && rateLimit?.rate_limit_info?.status === 'rejected'
    && rateLimit?.rate_limit_info?.errorCode === 'credits_required'
    && assistant?.message?.model === '<synthetic>'
    && assistant?.parent_tool_use_id === null
    && assistant?.is_api_error_message === true
    && assistant?.error === 'rate_limit'
    && creditsTextMatchesAlias
    && result.subtype === 'success'
    && result.is_error === true
    && result.api_error_status === 429
    && result.terminal_reason === 'api_error'
    && result.result === errorText;
  if (exactCreditsRequired) return Object.freeze({ outcome: 'credits_required', reason: 'credits_required' });
  return Object.freeze({ outcome: 'rejected', reason: 'unclassified_failure' });
}

function runClaudeModelProbe({ command, cwd, alias, allowCreditsRequired = false }) {
  const args = ['--safe-mode', '-p', '--model', alias, '--output-format', 'stream-json', '--verbose',
    '--no-session-persistence', '--tools', '', '--permission-mode', 'dontAsk',
    `Reply with exactly ${CLAUDE_MODEL_PROBE_SENTINEL}. Do not call tools.`];
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    input: '',
    timeout: 45_000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, LUCA_NATIVE_AGENT_EVIDENCE: '0' },
  });
  if (result.error) return Object.freeze({ outcome: 'rejected', reason: result.error.code === 'ETIMEDOUT' ? 'probe_timeout' : 'probe_spawn_error' });
  return classifyClaudeModelProbe({
    status: result.status,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
    expectedAlias: alias,
    expectedCwd: cwd,
    allowCreditsRequired,
  });
}

export function resolveClaudeProjectionForLaunch({ root = DEFAULT_ROOT, role, probe }) {
  if (typeof probe !== 'function') fail('Claude projection resolution requires a probe function');
  const primary = resolveRole({ root, role, harness: 'claude', projectionMode: 'primary' }).projection;
  const route = parseRouting(realpathSync(root)).tier[ROLE_CONTRACT[role].tier];
  const primaryResult = probe(primary, Object.freeze({ allowCreditsRequired: route.fallback !== null }));
  if (primaryResult?.outcome === 'success') {
    return Object.freeze({ projectionMode: 'primary', primary, effective: primary, reason: null });
  }
  if (primaryResult?.outcome !== 'credits_required') {
    fail(`CLAUDE_MODEL_PROBE_REJECTED projection=${primary} reason=${primaryResult?.reason || 'invalid_probe_result'}`);
  }
  let fallback;
  try {
    fallback = resolveRole({ root, role, harness: 'claude', projectionMode: 'fallback' }).projection;
  } catch (error) {
    fail(`CLAUDE_MODEL_PROBE_REJECTED projection=${primary} reason=no_yaml_fallback (${error.message})`);
  }
  const fallbackResult = probe(fallback, Object.freeze({ allowCreditsRequired: false }));
  if (fallbackResult?.outcome !== 'success') {
    fail(`CLAUDE_MODEL_PROBE_REJECTED projection=${fallback} reason=${fallbackResult?.reason || 'invalid_probe_result'}`);
  }
  return Object.freeze({ projectionMode: 'fallback', primary, effective: fallback, reason: 'credits_required' });
}

function nativeBinaryIdentity(command, harness) {
  const commandPath = realpathSync(command);
  let nativePath = commandPath;
  if (harness === 'codex' && commandPath.endsWith('/@openai/codex/bin/codex.js')) {
    const packageRoot = resolve(dirname(commandPath), '..');
    const platformPackage = process.platform === 'darwin'
      ? (process.arch === 'arm64' ? 'codex-darwin-arm64' : 'codex-darwin-x64')
      : (process.arch === 'arm64' ? 'codex-linux-arm64' : 'codex-linux-x64');
    const triple = process.platform === 'darwin'
      ? (process.arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin')
      : (process.arch === 'arm64' ? 'aarch64-unknown-linux-musl' : 'x86_64-unknown-linux-musl');
    const candidate = join(packageRoot, 'node_modules', '@openai', platformPackage, 'vendor', triple, 'bin', 'codex');
    if (existsSync(candidate)) nativePath = realpathSync(candidate);
  }
  const version = spawnSync(command, ['--version'], { encoding: 'utf8', input: '', timeout: 20_000 });
  if (version.status !== 0) fail(`${harness} CLI version probe failed`);
  return {
    command_path: commandPath,
    command_sha256: sha256(readFileSync(commandPath)),
    native_binary_path: nativePath,
    native_binary_sha256: sha256(readFileSync(nativePath)),
    cli_version: String(version.stdout || version.stderr).trim(),
  };
}

export function prepareNativeLaunch({ root = DEFAULT_ROOT, harness, role, packet = null, dispatcherId, scratch = null,
  projectionMode = 'primary' }) {
  const resolvedRole = resolveRole({ root, role, harness, projectionMode });
  validateLaunchPacket(role, packet);
  boundedString(dispatcherId, 'dispatcherId', 256);
  const childPrompt = rolePayload(role, packet);
  const inputSha256 = sha256(Buffer.from(childPrompt, 'utf8'));
  const nativeTaskName = `edge_${inputSha256}`;
  const packetAttestation = role === 'work-agent'
    ? ` The launch supervisor independently validated the frozen work packet against luca.work-packet.v1 and the exact launcher cross-field contract; its canonical SHA-256 is ${packet.sha256}. The entire child prompt must be only the following JSON bytes, with no wrapper or extra instruction:\n${childPrompt}`
    : ` Use this exact child prompt:\n${childPrompt}`;
  const dispatcherPrompt = harness === 'claude'
    ? `Native evidence transaction ${dispatcherId}. Use the Agent tool exactly once with subagent_type ${role} and run_in_background=false.${packetAttestation}\nDo not perform the role yourself. Wait for the child result, then return it verbatim.`
    : `Native evidence transaction ${dispatcherId}. Use collaboration spawn_agent exactly once with agent_type ${role}, fork_turns \"none\", and task_name \"${nativeTaskName}\".${packetAttestation}\nUse wait_agent exactly once, call no other function, and return that distinct child result verbatim. Do not perform the role yourself.`;
  const dispatcherPromptSha256 = sha256(Buffer.from(dispatcherPrompt, 'utf8'));
  let command;
  let args;
  let sandboxContract;
  if (harness === 'claude') {
    command = process.env.LUCA_CLAUDE_BIN || '/Users/luca/.local/bin/claude';
    const agent = {
      description: `Native ${role} role projected from ${resolvedRole.definition_path}`,
      prompt: resolvedRole.definition_text,
      tools: role === 'work-agent' ? ['Bash'] : [],
      model: resolvedRole.projection,
      permissionMode: 'dontAsk',
    };
    const dispatcherName = 'u008-dispatcher';
    const dispatcher = {
      description: `Dispatch exactly one native ${role} child and return its result`,
      prompt: `Use only Agent(${role}) exactly once. Never perform the role yourself or call another tool.`,
      tools: [`Agent(${role})`],
      permissionMode: 'dontAsk',
    };
    const agentsJson = JSON.stringify({ [dispatcherName]: dispatcher, [role]: agent });
    const sandboxSettings = JSON.stringify({
      sandbox: {
        enabled: true,
        failIfUnavailable: true,
        autoAllowBashIfSandboxed: true,
        allowUnsandboxedCommands: false,
        excludedCommands: [],
        filesystem: { disabled: false, allowWrite: [] },
      },
    });
    sandboxContract = {
      type: 'claude-native-sandbox', cwd: resolvedRole.root,
      inline_settings: JSON.parse(sandboxSettings), setting_sources: ['project'],
      required_post_tool_use_event: 'Agent',
    };
    args = ['-p', '--output-format', 'stream-json', '--include-hook-events', '--verbose',
      '--no-session-persistence', '--setting-sources', 'project', '--settings', sandboxSettings,
      '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--disable-slash-commands',
      '--tools', 'Agent,Bash', '--allowedTools', `Agent(${role})`, '--permission-mode', 'dontAsk',
      '--agents', agentsJson, '--agent', dispatcherName, dispatcherPrompt];
  } else {
    command = process.env.LUCA_CODEX_BIN || '/Users/luca/.local/bin/codex';
    args = ['-C', resolvedRole.root, 'app-server', '--enable', 'multi_agent_v2',
      '-c', 'sandbox_workspace_write.writable_roots=[]',
      '-c', 'sandbox_workspace_write.network_access=false',
      '-c', 'sandbox_workspace_write.exclude_tmpdir_env_var=true',
      '-c', 'sandbox_workspace_write.exclude_slash_tmp=true',
      '-c', `model_reasoning_effort="${resolvedRole.projection}"`];
    sandboxContract = {
      type: role === 'work-agent' ? 'workspace-write' : 'read-only',
      cwd: resolvedRole.root,
      approval_policy: 'never',
      writable_roots: role === 'work-agent' ? [resolvedRole.root] : [],
      network_access: false,
      parent_allowed_function_calls: ['spawn_agent', 'wait_agent'],
      child_allowed_tools: role === 'work-agent' ? ['Bash'] : [],
      app_server_capabilities: { experimentalApi: true },
    };
  }
  const binary = nativeBinaryIdentity(command, harness);
  const processRoots = scratch ? [realpathSync(scratch)] : [];
  if (harness === 'claude') {
    const claudeHome = join(process.env.HOME || '', '.claude');
    const claudeTemp = `/private/tmp/claude-${typeof process.getuid === 'function' ? process.getuid() : 'unknown'}`;
    if (existsSync(claudeHome)) processRoots.push(realpathSync(claudeHome));
    if (existsSync(claudeTemp)) processRoots.push(realpathSync(claudeTemp));
  } else {
    const codexHome = process.env.CODEX_HOME || join(process.env.HOME || '', '.codex');
    if (existsSync(codexHome)) processRoots.push(realpathSync(codexHome));
  }
  return Object.freeze({
    schema_version: 'luca.native-launch.v2',
    dispatcher_id: dispatcherId,
    harness,
    role,
    tier: resolvedRole.tier,
    projection: resolvedRole.projection,
    definition_path: resolvedRole.definition_path,
    definition_sha256: resolvedRole.definition_sha256,
    routing_path: resolvedRole.routing_path,
    routing_sha256: resolvedRole.routing_sha256,
    packet_sha256: packet?.sha256 || null,
    packet_source_sha256: packet?.source_bytes_sha256 || null,
    input_sha256: inputSha256,
    native_task_name: harness === 'codex' ? nativeTaskName : null,
    sandbox_contract: sandboxContract,
    write_roots: [...new Set([...processRoots, ...(role === 'work-agent' ? [resolvedRole.root] : [])])],
    dispatcher_prompt: dispatcherPrompt,
    dispatcher_prompt_sha256: dispatcherPromptSha256,
    command_path: binary.command_path,
    args,
    argv_sha256: sha256(Buffer.from(stable(args), 'utf8')),
    command_sha256: binary.command_sha256,
    native_binary_path: binary.native_binary_path,
    native_binary_sha256: binary.native_binary_sha256,
    cli_version: binary.cli_version,
    cwd: resolvedRole.root,
  });
}

export function nativeDispatchContract(descriptor) {
  if (!descriptor || descriptor.schema_version !== 'luca.native-launch.v2') fail('invalid native launch descriptor');
  const { write_roots, ...contract } = descriptor;
  return Object.freeze({
    schema_version: 'luca.native-dispatch-contract.v1',
    descriptor: contract,
    contract_sha256: sha256(Buffer.from(stable(contract), 'utf8')),
  });
}

function spawnNativeLaunch(launch, { stdout = 'pipe', stderr = 'pipe' } = {}) {
  if (!launch || launch.schema_version !== 'luca.native-launch.v2') fail('invalid native launch descriptor');
  if (launch.harness === 'codex') fail('Codex app-server launches require runNativeLaunch');
  if (!isAbsolute(launch.command_path)) fail('native command must be absolute');
  return spawn(launch.command_path, launch.args, {
    cwd: launch.cwd,
    stdio: ['ignore', stdout, stderr],
    detached: true,
    env: { ...process.env, LUCA_NATIVE_AGENT_EVIDENCE: '1' },
  });
}

async function runNativeLaunch(launch, { stdout = process.stdout, stderr = process.stderr, timeoutMs = 300_000, scratch = null } = {}) {
  if (!launch || launch.schema_version !== 'luca.native-launch.v2') fail('invalid native launch descriptor');
  if (launch.harness === 'claude') {
    const child = spawnNativeLaunch(launch);
    child.stdout.pipe(stdout); child.stderr.pipe(stderr);
    return await new Promise((accept, reject) => {
      child.once('error', reject);
      child.once('close', (code) => accept(code ?? 1));
    });
  }
  const child = spawn(launch.command_path, launch.args, {
    cwd: launch.cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: true,
    env: { ...process.env, ...(scratch ? { TMPDIR: scratch } : {}), LUCA_NATIVE_AGENT_EVIDENCE: '0' },
  });
  let pending = ''; const messages = []; let closed = false; let closeCode = null; let streamError = null;
  child.stdout.on('data', (chunk) => {
    stdout.write(chunk); pending += String(chunk);
    const lines = pending.split('\n'); pending = lines.pop();
    for (const line of lines) if (line) {
      try { messages.push(JSON.parse(line)); } catch { streamError = new Error('Codex app-server emitted non-JSON stdout'); }
    }
  });
  child.stderr.on('data', (chunk) => stderr.write(chunk));
  child.once('error', (error) => { streamError = error; });
  child.once('close', (code) => { closed = true; closeCode = code; });
  const deadline = Date.now() + timeoutMs;
  const waitFor = async (predicate, label) => {
    while (Date.now() < deadline) {
      if (streamError) throw streamError;
      const found = messages.find(predicate); if (found) return found;
      if (closed) fail(`Codex app-server closed before ${label}`);
      await new Promise((accept) => setTimeout(accept, 20));
    }
    try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
    fail(`Codex app-server timed out before ${label}`);
  };
  const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
    clientInfo: { name: 'luca-native-agent-launcher', title: 'luca native agent launcher', version: '2.0.0' },
    capabilities: launch.sandbox_contract.app_server_capabilities,
  } });
  const initialized = await waitFor((message) => String(message?.id) === '1' && !message.method, 'initialize');
  if (initialized.error || !initialized.result) fail('Codex app-server initialize failed');
  send({ jsonrpc: '2.0', method: 'initialized' });
  const mode = launch.sandbox_contract.type;
  send({ jsonrpc: '2.0', id: 2, method: 'thread/start', params: {
    approvalPolicy: 'never', config: { features: { multi_agent_v2: true }, model_reasoning_effort: launch.projection,
      sandbox_workspace_write: { writable_roots: [], network_access: false, exclude_tmpdir_env_var: true, exclude_slash_tmp: true } },
    cwd: launch.cwd, ephemeral: false, runtimeWorkspaceRoots: [launch.cwd], sandbox: mode,
  } });
  const thread = await waitFor((message) => String(message?.id) === '2' && !message.method, 'thread/start');
  if (thread.error || typeof thread?.result?.thread?.id !== 'string') fail('Codex app-server thread/start failed');
  send({ jsonrpc: '2.0', id: 3, method: 'turn/start', params: {
    approvalPolicy: 'never', cwd: launch.cwd, effort: launch.projection,
    input: [{ type: 'text', text: launch.dispatcher_prompt }], runtimeWorkspaceRoots: [launch.cwd],
    sandboxPolicy: codexApiSandbox(mode), threadId: thread.result.thread.id,
  } });
  const turn = await waitFor((message) => String(message?.id) === '3' && !message.method, 'turn/start');
  if (turn.error || typeof turn?.result?.turn?.id !== 'string') fail('Codex app-server turn/start failed');
  const complete = await waitFor((message) => message?.method === 'turn/completed'
    && message?.params?.threadId === thread.result.thread.id && message?.params?.turn?.id === turn.result.turn.id, 'turn/completed');
  if (complete?.params?.turn?.status !== 'completed') fail('Codex parent turn failed');
  child.stdin.end();
  while (!closed && Date.now() < deadline) await new Promise((accept) => setTimeout(accept, 20));
  return closeCode ?? 1;
}

function option(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

async function main() {
  const argv = process.argv.slice(2);
  const mode = argv[0];
  if (mode === 'validate-work-packet') {
    const path = option(argv, '--packet');
    if (!path) fail('missing --packet');
    const result = loadWorkPacket(path);
    process.stdout.write(`${JSON.stringify({ schema_version: WORK_PACKET_VERSION, packet_id: result.packet.packet_id, packet_sha256: result.sha256, source_sha256: result.source_bytes_sha256 })}\nWORK_PACKET_VALID\n`);
    return;
  }
  if (mode === 'describe' || mode === 'describe-contract' || mode === 'launch') {
    const root = option(argv, '--root') || DEFAULT_ROOT;
    const harness = option(argv, '--harness');
    const role = option(argv, '--role');
    const projectionOverrideFlags = ['--projection-mode', '--model', '--projection', '--fallback', '--fallback-model'];
    const callerProjectionOverrides = argv.filter((value) => projectionOverrideFlags
      .some((flag) => value === flag || value.startsWith(`${flag}=`)));
    if (mode === 'launch' && callerProjectionOverrides.length > 0) {
      fail(`launch does not accept caller-controlled ${callerProjectionOverrides[0].split('=')[0]}`);
    }
    const projectionModeFlags = argv.filter((value) => value === '--projection-mode').length;
    const requestedProjectionMode = projectionModeFlags === 0 ? 'primary' : option(argv, '--projection-mode');
    if ((mode === 'describe' || mode === 'describe-contract')
      && (projectionModeFlags > 1 || !['primary', 'fallback'].includes(requestedProjectionMode))) {
      fail('--projection-mode must be exactly primary or fallback');
    }
    // Production activation applies only to the two routes introduced by U-008.
    // Keep this before packet loading, scratch creation and CLI identity probes so
    // DORMANT is mechanically zero-spawn even when no native CLI is installed.
    let earlyActivation = null;
    if (mode === 'launch' && ACTIVATION_GATED_ROLES.includes(role)) {
      const { verifyNativeRouteActivation } = await import('./check-agents-parity.mjs');
      earlyActivation = verifyNativeRouteActivation({ root, role });
      if (!earlyActivation.authorized) {
        fail(`NATIVE_ROLE_ROUTE_BLOCKED ${earlyActivation.code} ${role}`);
      }
    }
    const packetPath = option(argv, '--packet');
    const dispatcherId = option(argv, '--dispatcher-id') || `manual-${process.pid}`;
    const packet = packetPath ? loadWorkPacket(packetPath) : null;
    const scratch = mode === 'launch' ? realpathSync(mkdtempSync('/private/tmp/luca-native-launch-')) : null;
    if (scratch) chmodSync(scratch, 0o700);
    let launch;
    try {
      let projectionMode = requestedProjectionMode;
      if (mode === 'launch') {
        validateLaunchPacket(role, packet);
        if (harness === 'claude') {
          const command = process.env.LUCA_CLAUDE_BIN || '/Users/luca/.local/bin/claude';
          const resolution = resolveClaudeProjectionForLaunch({
            root,
            role,
            probe: (alias, options) => runClaudeModelProbe({ command, cwd: scratch, alias, ...options }),
          });
          projectionMode = resolution.projectionMode;
          if (resolution.reason === 'credits_required') {
            process.stderr.write(`NATIVE_MODEL_FALLBACK primary=${resolution.primary} effective=${resolution.effective} reason=credits_required\n`);
          }
        }
      }
      launch = prepareNativeLaunch({ root, harness, role, packet, dispatcherId, scratch, projectionMode });
    } catch (error) {
      if (scratch) rmSync(scratch, { recursive: true, force: false });
      throw error;
    }
    if (mode === 'describe' || mode === 'describe-contract') {
      const value = mode === 'describe' ? launch : nativeDispatchContract(launch);
      process.stdout.write(mode === 'describe-contract'
        ? `${stable(value)}\nNATIVE_DISPATCH_CONTRACT_READY\n`
        : `${JSON.stringify(value, null, 2)}\n`);
      return;
    }
    try {
      // Re-read the approved receipt in this same process immediately before the
      // native run.  A changed activation/receipt between preflight and dispatch
      // fails closed; programmatic prepare/run exports remain available only for
      // the frozen evidence TCB and do not silently become production routes.
      if (ACTIVATION_GATED_ROLES.includes(role)) {
        const { verifyNativeRouteActivation } = await import('./check-agents-parity.mjs');
        const immediateActivation = verifyNativeRouteActivation({ root, role });
        if (!immediateActivation.authorized
            || immediateActivation.proof_receipt_sha256 !== earlyActivation.proof_receipt_sha256
            || immediateActivation.activation_sha256 !== earlyActivation.activation_sha256) {
          fail(`NATIVE_ROLE_ROUTE_BLOCKED ${immediateActivation.code} ${role}`);
        }
      }
      process.exitCode = await runNativeLaunch(launch, { scratch });
    } finally {
      const canonical = realpathSync(scratch);
      if (!canonical.startsWith('/private/tmp/luca-native-launch-')) fail('refusing unsafe launcher scratch cleanup');
      rmSync(canonical, { recursive: true, force: false });
    }
    return;
  }
  fail('usage: agent-launcher.mjs validate-work-packet --packet FILE | describe|describe-contract [--projection-mode primary|fallback] | launch --harness claude|codex --role ROLE [--packet FILE] [--root DIR]');
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(SELF)) {
  main().catch((error) => {
    process.stderr.write(`AGENT_LAUNCHER_ERROR ${error.message}\n`);
    process.exitCode = 2;
  });
}
