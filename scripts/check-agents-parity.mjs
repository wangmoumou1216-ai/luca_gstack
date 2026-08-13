#!/usr/bin/env node
// AGENTS.md 治理平价 tripwire（P3 / WS-A5，2026-07-25）。
//
// 为什么需要：AGENTS.md 是 Codex 侧的执行契约，但它长期只被 check-routing-map 守住「路由 TL;DR」
// 一小块，治理面（记忆门禁 / 模型档意图 / 会话隔离 / human-gate / Static Fallback）无锚点 → 曾静默
// 腐烂成陈旧的「CRM 身份 + 已被取代的 G6 共享软链模型」。本门把这些段落钉死，并做**跨源一致性**
// 检查：SF 镜像的 id 集合必须 == static-fallback-allowlist.txt（防两处 SF 分叉）。
import assert from 'assert/strict';
import { createHash, createPublicKey, verify as verifyBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { LOGICAL_ROLES, ROLE_CONTRACT, resolveRole } from './agent-launcher.mjs';
import { targetTreeManifest as deriveTargetTreeManifest } from './evolution/agent-evidence-tcb.mjs';

// 深审：用 CLAUDE_PROJECT_DIR 定位会在双检出下验错仓并报绿（实测）。改脚本相对：
// 本文件在 scripts/ → 上 1 级 = 仓根，与被验文件恒同仓。
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SELF = fileURLToPath(import.meta.url);
export const NATIVE_PROOF_RECEIPT_PATH = 'framework-audit/2026-08-11-rule-execution-handshake/execution/u008/TST-008-RESULT.json';
export const NATIVE_ROUTE_GATE_COMMAND = 'node scripts/agent-launcher.mjs launch';
export const NATIVE_ROUTE_SURFACES = Object.freeze({
  '.claude/agents/orchestrator.md': 'work-agent',
  '.claude/skills/office/brainstorm/SKILL.md': 'oracle',
  '.claude/skills/office/brainstorm/references/adversarial-review.md': 'oracle',
  '.claude/skills/office/deepresearch/SKILL.md': 'oracle',
  '.claude/skills/office/ux-brainstorm/SKILL.md': 'oracle',
  '.claude/skills/office/ux-research/SKILL.md': 'oracle',
});
const ACTIVATION_GATED_ROLES = new Set(['work-agent', 'oracle']);
const REGISTERED_ROLE_DEFINITIONS = new Set(Object.values(ROLE_CONTRACT)
  .flatMap((entry) => [entry.claude, entry.codex]));
const ACTIVATION_KEYS = ['schema_version', 'status', 'proof_receipt_path', 'proof_receipt_sha256', 'activated_at'];
const TST_RESULT_KEYS = ['schema_version', 'plan_id', 'unit', 'test', 'captured_at', 'status', 'recommendation',
  'independent_tester', 'source_binding', 'criteria', 'native_evidence', 'blocking_criteria_all_passed'];
const NATIVE_EVIDENCE_KEYS = ['verification_token', 'harnesses', 'roles', 'target_commit', 'anchor_path',
  'anchor_sha256', 'envelope_path', 'envelope_sha256', 'summary_path', 'summary_sha256', 'consume_path',
  'consume_sha256', 'tcb_path', 'tcb_sha256', 'verifier_path', 'verifier_sha256',
  'evidence_public_key_fingerprint_sha256', 'counter_fingerprint_sha256', 'nonce_set_sha256',
  'verification_stdout_path', 'verification_stdout_sha256', 'independent_verifier_exit_code',
  'evidence_consumed_once', 'edges'];
const EDGE_KEYS = ['harness', 'role', 'parent_id', 'child_id', 'definition_path', 'definition_sha256',
  'input_sha256', 'output_sha256', 'source_log_sha256', 'receipt_path', 'receipt_sha256',
  'native_descriptor_sha256'];
const HASH = /^[a-f0-9]{64}$/;
const OID = /^[a-f0-9]{40}$/;
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const bytesSha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const stable = (value) => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};
const within = (base, target) => target === base || target.startsWith(`${base}/`);
const cleanGitEnv = () => {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) if (!key.startsWith('GIT_')) env[key] = value;
  env.GIT_NO_REPLACE_OBJECTS = '1';
  env.GIT_OPTIONAL_LOCKS = '0';
  return env;
};
const git = (root, args, { bytes = false, allowStatus = null } = {}) => {
  const result = spawnSync('git', args, { cwd: root, env: cleanGitEnv(), encoding: bytes ? null : 'utf8', input: '' });
  if (allowStatus !== null) return result.status === allowStatus;
  if (result.status !== 0) throw new Error(`git ${args[0]} failed`);
  return bytes ? result.stdout : String(result.stdout).trim();
};
const parseJson = (bytes, label) => {
  try { return JSON.parse(bytes.toString('utf8')); } catch { throw new Error(`${label} is not valid JSON`); }
};
const canonicalFile = (path, label, { privateFile = false, outsideRoot = null } = {}) => {
  if (typeof path !== 'string' || !isAbsolute(path) || resolve(path) !== path) throw new Error(`${label} path is not canonical absolute`);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || realpathSync(path) !== path) {
    throw new Error(`${label} is not a canonical regular single-link file`);
  }
  if ((stat.mode & 0o022) !== 0) throw new Error(`${label} is group/world writable`);
  if (privateFile && (stat.mode & 0o777) !== 0o600) throw new Error(`${label} is not an exact 0600 private file`);
  if (outsideRoot && within(outsideRoot, path)) throw new Error(`${label} must be outside repository`);
  return readFileSync(path);
};
const verifySigned = (object, coreKeys, hashKey, signatureKey, key, label) => {
  if (!exactKeys(object, [...coreKeys, hashKey, signatureKey])) throw new Error(`${label} keys are not exact`);
  const core = Object.fromEntries(coreKeys.map((name) => [name, object[name]]));
  const payload = Buffer.from(stable(core), 'utf8');
  if (object[hashKey] !== bytesSha256(payload)
      || typeof object[signatureKey] !== 'string'
      || !verifyBytes(null, payload, key, Buffer.from(object[signatureKey], 'base64'))) {
    throw new Error(`${label} signature/hash is invalid`);
  }
  return core;
};
const iso = (value, label) => {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw new Error(`${label} is not canonical ISO time`);
  return parsed;
};
const assertHash = (value, label) => { if (!HASH.test(value || '')) throw new Error(`${label} is not SHA-256`); };
const trackedBytes = (root, commit, path, label) => {
  const bytes = git(root, ['show', `${commit}:${path}`], { bytes: true });
  if (!Buffer.isBuffer(bytes)) throw new Error(`${label} target blob is unavailable`);
  return bytes;
};

const claudeFamilyMatches = (alias, model) => typeof alias === 'string' && typeof model === 'string'
  && new RegExp(`(^|[-_.])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[-_.0-9])`, 'i').test(model);

const parseRoutingProjection = (root) => {
  const path = join(root, '.claude/skill-os/model-routing.yaml');
  const bytes = canonicalFile(path, 'model routing');
  const text = bytes.toString('utf8');
  const lineup = (text.match(/^known_lineup:\s*\[([^\]]+)\]\s*$/m)?.[1] || '')
    .split(',').map((item) => item.trim()).filter(Boolean);
  if (!lineup.length || new Set(lineup).size !== lineup.length
      || lineup.some((alias) => !/^[A-Za-z0-9._-]+$/.test(alias))) {
    throw new Error('model-routing known_lineup is invalid');
  }
  const codex = text.match(/^codex:\n([\s\S]*?)(?=^# ─── 新场景|(?![\s\S]))/m)?.[1] || '';
  const efforts = codex.match(/^  tier_to_effort:\n([\s\S]*?)(?=^  [a-z_]+:|(?![\s\S]))/m)?.[1] || '';
  const tiers = {};
  for (const name of ['reasoning-heavy', 'core-execution', 'guided-execution', 'mechanical']) {
    const block = text.match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [a-z][a-z-]+:|^#|(?![\\s\\S]))`, 'm'))?.[1] || '';
    const alias = block.match(/^    resolves_to:\s*([A-Za-z0-9._-]+)/m)?.[1];
    const fallback = block.match(/^    fallback:\s*([A-Za-z0-9._-]+)/m)?.[1] || null;
    const effort = efforts.match(new RegExp(`^    ${name}:\\s*(none|low|medium|high|xhigh|max)\\b`, 'm'))?.[1];
    if (!alias || !lineup.includes(alias) || !effort) throw new Error(`model-routing projection missing for ${name}`);
    if (fallback && (!lineup.includes(fallback) || lineup.indexOf(fallback) !== lineup.indexOf(alias) + 1)) {
      throw new Error(`model-routing fallback is not immediately below ${name}`);
    }
    tiers[name] = { alias, fallback, effort };
  }
  if (!tiers['reasoning-heavy'].fallback
      || tiers['reasoning-heavy'].fallback !== tiers['core-execution'].alias
      || tiers['core-execution'].fallback !== null) {
    throw new Error('model-routing Claude fallback chain is not reasoning-heavy -> core-execution');
  }
  return { path: '.claude/skill-os/model-routing.yaml', sha256: bytesSha256(bytes), tiers };
};

const evidenceFile = (root, evidenceRoot, rel, label) => {
  if (typeof rel !== 'string' || isAbsolute(rel) || rel.includes('\\')
      || rel.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`${label} path is not a canonical relative path`);
  }
  const path = join(evidenceRoot, rel);
  if (!within(evidenceRoot, path) || relative(evidenceRoot, path) !== rel) {
    throw new Error(`${label} escapes evidence root`);
  }
  return { path, bytes: canonicalFile(path, label, { privateFile: true, outsideRoot: root }) };
};

const parseJsonl = (bytes, label) => {
  const lines = bytes.toString('utf8').split(/\r?\n/).filter((line) => line.length);
  if (!lines.length) throw new Error(`${label} is empty`);
  return lines.map((line) => parseJson(Buffer.from(line, 'utf8'), label));
};

const modelProbeContainsTool = (value) => {
  if (Array.isArray(value)) return value.some(modelProbeContainsTool);
  if (!value || typeof value !== 'object') return false;
  if (['tool_use', 'server_tool_use', 'mcp_tool_use'].includes(String(value.type || '').toLowerCase())) return true;
  if (typeof value.tool_use_id === 'string' && value.tool_use_id) return true;
  return Object.values(value).some(modelProbeContainsTool);
};

const claudeModelProbeArgs = (alias) => ['--safe-mode', '-p', '--model', alias, '--output-format', 'stream-json',
  '--verbose', '--no-session-persistence', '--tools', '', '--permission-mode', 'dontAsk',
  'Reply with exactly LUCA_CLAUDE_MODEL_PROBE_OK. Do not call tools.'];

const validateModelResolutions = ({ root, proofRoot, evidenceRoot, commitments }) => {
  if (!Array.isArray(commitments) || commitments.length !== 2) {
    throw new Error('model resolutions must contain exactly two Claude tiers');
  }
  const routing = parseRoutingProjection(root);
  const expectedTiers = ['reasoning-heavy', 'core-execution'];
  const bindings = new Map();
  for (const item of commitments) {
    if (!exactKeys(item, ['harness', 'tier', 'primary_projection', 'fallback_projection', 'effective_projection',
      'effective_model', 'reason', 'path', 'sha256']) || item.harness !== 'claude' || !expectedTiers.includes(item.tier)
      || bindings.has(item.tier) || !HASH.test(item.sha256 || '')) {
      throw new Error('model resolution commitment is invalid or duplicate');
    }
    const route = routing.tiers[item.tier];
    if (item.primary_projection !== route.alias || item.fallback_projection !== route.fallback) {
      throw new Error(`model resolution route differs from routing truth for ${item.tier}`);
    }
    if (item.path !== `raw/claude-${item.tier}-resolution.json`) {
      throw new Error(`model resolution path is not canonical ${item.tier}`);
    }
    const recordRead = evidenceFile(root, evidenceRoot, item.path, `model resolution ${item.tier}`);
    if (bytesSha256(recordRead.bytes) !== item.sha256) throw new Error(`model resolution hash mismatch ${item.tier}`);
    const record = parseJson(recordRead.bytes, `model resolution ${item.tier}`);
    if (!exactKeys(record, ['schema_version', 'harness', 'tier', 'primary_projection', 'fallback_projection',
      'effective_projection', 'effective_model', 'reason', 'attempts'])
      || record.schema_version !== 'luca.agent-model-resolution.v1') {
      throw new Error(`model resolution record contract is invalid ${item.tier}`);
    }
    if (!recordRead.bytes.equals(Buffer.from(`${stable(record)}\n`, 'utf8'))) {
      throw new Error(`model resolution record is not canonical ${item.tier}`);
    }
    const projected = Object.fromEntries(Object.keys(item).filter((key) => !['path', 'sha256'].includes(key))
      .map((key) => [key, item[key]]));
    const recordProjection = Object.fromEntries(Object.keys(record).filter((key) => !['schema_version', 'attempts'].includes(key))
      .map((key) => [key, record[key]]));
    if (stable(projected) !== stable(recordProjection) || !Array.isArray(record.attempts)) {
      throw new Error(`model resolution record differs from signed commitment ${item.tier}`);
    }
    const fallbackUsed = item.reason === 'credits_required';
    if (item.tier === 'core-execution') {
      if (route.fallback !== null || item.reason !== 'primary_available'
          || item.effective_projection !== route.alias || record.attempts.length !== 1) {
        throw new Error('core-execution model resolution is not the exact direct route');
      }
    } else if ((!fallbackUsed && (item.reason !== 'primary_available'
        || item.effective_projection !== route.alias || record.attempts.length !== 1))
      || (fallbackUsed && (item.effective_projection !== route.fallback || record.attempts.length !== 2))) {
      throw new Error('reasoning-heavy model resolution is not the governed route');
    }
    let effectiveConcrete = null;
    record.attempts.forEach((attempt, index) => {
      if (!exactKeys(attempt, ['projection', 'outcome', 'resolved_model', 'exit_code', 'argv_sha256',
        'stdout_path', 'stdout_sha256', 'stderr_path', 'stderr_sha256'])) {
        throw new Error(`model resolution attempt keys invalid ${item.tier}/${index}`);
      }
      const expectedProjection = index === 0 ? route.alias : route.fallback;
      const expectedOutcome = fallbackUsed && index === 0 ? 'credits_required' : 'available';
      const expectedArgvSha = bytesSha256(Buffer.from(stable(claudeModelProbeArgs(expectedProjection)), 'utf8'));
      const expectedStdoutPath = `raw/claude-model-${expectedProjection}.stdout.jsonl`;
      const expectedStderrPath = `raw/claude-model-${expectedProjection}.stderr`;
      if (attempt.projection !== expectedProjection || attempt.outcome !== expectedOutcome
          || attempt.exit_code !== (expectedOutcome === 'available' ? 0 : 1)
          || attempt.argv_sha256 !== expectedArgvSha
          || attempt.stdout_path !== expectedStdoutPath || attempt.stderr_path !== expectedStderrPath
          || !HASH.test(attempt.stdout_sha256 || '') || !HASH.test(attempt.stderr_sha256 || '')) {
        throw new Error(`model resolution attempt is not governed ${item.tier}/${index}`);
      }
      const stdout = evidenceFile(root, evidenceRoot, attempt.stdout_path, `model probe stdout ${item.tier}/${index}`);
      const stderr = evidenceFile(root, evidenceRoot, attempt.stderr_path, `model probe stderr ${item.tier}/${index}`);
      if (bytesSha256(stdout.bytes) !== attempt.stdout_sha256 || bytesSha256(stderr.bytes) !== attempt.stderr_sha256
          || stderr.bytes.length !== 0) throw new Error(`model probe raw bytes mismatch ${item.tier}/${index}`);
      const events = parseJsonl(stdout.bytes, `model probe stdout ${item.tier}/${index}`);
      if (events.some(modelProbeContainsTool)) throw new Error(`model probe invoked a tool ${item.tier}/${index}`);
      if (events.length !== 4) throw new Error(`model probe event count is not exact ${item.tier}/${index}`);
      const [init, rateLimit, assistant, result] = events;
      const expectedCwd = join(dirname(evidenceRoot), 'child-scratch', 'model-resolution', expectedProjection);
      if (realpathSync(expectedCwd) !== expectedCwd || !lstatSync(expectedCwd).isDirectory()) {
        throw new Error(`model probe cwd is not canonical ${item.tier}/${index}`);
      }
      if (init?.type !== 'system' || init?.subtype !== 'init' || stable(init.tools) !== stable([])
          || init.cwd !== expectedCwd || init.permissionMode !== 'dontAsk'
          || !claudeFamilyMatches(expectedProjection, init.model)
          || typeof init.session_id !== 'string' || !init.session_id
          || rateLimit?.type !== 'rate_limit_event' || assistant?.type !== 'assistant' || result?.type !== 'result'
          || events.some((event) => event.session_id !== init.session_id)) {
        throw new Error(`model probe transport is not exact ${item.tier}/${index}`);
      }
      const text = Array.isArray(assistant?.message?.content)
        ? assistant.message.content.filter((part) => part?.type === 'text').map((part) => part.text || '').join('') : '';
      if (expectedOutcome === 'credits_required') {
        const expectedCredits = new RegExp(`\\b${expectedProjection}\\b[^\\n]*requires usage credits`, 'i');
        if (expectedProjection !== 'fable' || attempt.resolved_model !== null
            || rateLimit?.rate_limit_info?.status !== 'rejected'
            || rateLimit?.rate_limit_info?.errorCode !== 'credits_required'
            || assistant.parent_tool_use_id !== null || assistant.message?.model !== '<synthetic>'
            || assistant.error !== 'rate_limit' || assistant.is_api_error_message !== true
            || !expectedCredits.test(text) || text !== result.result
            || result.subtype !== 'success' || result.is_error !== true
            || result.api_error_status !== 429 || result.terminal_reason !== 'api_error') {
          throw new Error(`model probe is not an explicit credits rejection ${item.tier}/${index}`);
        }
      } else {
        if (!claudeFamilyMatches(expectedProjection, attempt.resolved_model)
            || rateLimit?.rate_limit_info?.status !== 'allowed'
            || assistant.parent_tool_use_id !== null || assistant.message?.model !== attempt.resolved_model
            || text !== 'LUCA_CLAUDE_MODEL_PROBE_OK'
            || result.subtype !== 'success' || result.is_error !== false
            || result.result !== 'LUCA_CLAUDE_MODEL_PROBE_OK' || result.terminal_reason !== 'completed') {
          throw new Error(`model probe does not prove the effective model ${item.tier}/${index}`);
        }
        effectiveConcrete = attempt.resolved_model;
      }
    });
    if (!effectiveConcrete || item.effective_model !== effectiveConcrete
        || !claudeFamilyMatches(item.effective_projection, effectiveConcrete)) {
      throw new Error(`effective concrete model is missing ${item.tier}`);
    }
    bindings.set(item.tier, { alias: item.effective_projection, concrete: effectiveConcrete });
  }
  if (expectedTiers.some((tier) => !bindings.has(tier))) throw new Error('model resolution tier set is incomplete');
  return { routing, bindings };
};

function validateApprovedReceipt({ root, receipt, receiptPath }) {
  if (!exactKeys(receipt, TST_RESULT_KEYS) || receipt.schema_version !== 'luca.tst-008-result.v1'
      || receipt.plan_id !== 'REX-20260811-001' || receipt.unit !== 'U-008' || receipt.test !== 'TST-008'
      || receipt.status !== 'AGENT_EVIDENCE_VERIFIED' || receipt.recommendation !== 'PASS'
      || receipt.blocking_criteria_all_passed !== true) throw new Error('TST-008 result contract is not exact PASS');
  iso(receipt.captured_at, 'captured_at');
  if (!exactKeys(receipt.independent_tester, ['task', 'role', 'implementation_participation'])
      || receipt.independent_tester.task !== '/root/u008_dormancy_audit'
      || receipt.independent_tester.role !== 'independent-harness-reviewer'
      || receipt.independent_tester.implementation_participation !== false) throw new Error('independent tester binding is invalid');
  if (!exactKeys(receipt.source_binding, ['commit', 'target_tree'])
      || !OID.test(receipt.source_binding.commit || '') || !OID.test(receipt.source_binding.target_tree || '')) {
    throw new Error('source binding is invalid');
  }
  if (!Array.isArray(receipt.criteria) || receipt.criteria.length !== 2
      || receipt.criteria.some((item) => !exactKeys(item, ['id', 'status']) || item.status !== 'PASS')
      || stable(receipt.criteria.map((item) => item.id).sort()) !== stable(['ASSERT-014', 'ASSERT-015'])) {
    throw new Error('criteria must be exact ASSERT-014/015 PASS');
  }
  const native = receipt.native_evidence;
  if (!exactKeys(native, NATIVE_EVIDENCE_KEYS) || native.verification_token !== 'AGENT_EVIDENCE_VERIFIED'
      || stable(native.harnesses) !== stable(['claude', 'codex'])
      || stable(native.roles) !== stable([...LOGICAL_ROLES])
      || native.independent_verifier_exit_code !== 0 || native.evidence_consumed_once !== true) {
    throw new Error('native evidence result is not exact verified matrix');
  }
  for (const key of ['anchor_sha256', 'envelope_sha256', 'summary_sha256', 'consume_sha256',
    'tcb_sha256', 'verifier_sha256', 'evidence_public_key_fingerprint_sha256',
    'counter_fingerprint_sha256', 'nonce_set_sha256', 'verification_stdout_sha256']) assertHash(native[key], key);
  const commit = receipt.source_binding.commit;
  if (native.target_commit !== commit) throw new Error('source/evidence target commit mismatch');
  if (git(root, ['cat-file', '-t', commit]) !== 'commit') throw new Error('source binding is not a commit');
  const targetTree = git(root, ['rev-parse', `${commit}^{tree}`]);
  if (targetTree !== receipt.source_binding.target_tree
      || !git(root, ['merge-base', '--is-ancestor', commit, 'HEAD'], { allowStatus: 0 })
      || git(root, ['for-each-ref', '--format=%(refname)', 'refs/replace']) !== '') {
    throw new Error('source commit/tree is stale, non-ancestor, or replacement refs are present');
  }

  const external = {};
  for (const [key, label] of [['anchor_path', 'anchor'], ['envelope_path', 'envelope'],
    ['summary_path', 'summary'], ['consume_path', 'consume'], ['verification_stdout_path', 'verification stdout']]) {
    external[key] = canonicalFile(native[key], label, { privateFile: true, outsideRoot: root });
  }
  if (bytesSha256(external.anchor_path) !== native.anchor_sha256
      || bytesSha256(external.envelope_path) !== native.envelope_sha256
      || bytesSha256(external.summary_path) !== native.summary_sha256
      || bytesSha256(external.consume_path) !== native.consume_sha256
      || bytesSha256(external.verification_stdout_path) !== native.verification_stdout_sha256) {
    throw new Error('evidence artifact hash mismatch');
  }
  const tcbBytes = canonicalFile(native.tcb_path, 'TCB', { privateFile: true, outsideRoot: root });
  const verifierBytes = canonicalFile(native.verifier_path, 'verifier', { privateFile: true, outsideRoot: root });
  const currentTcb = canonicalFile(join(root, 'scripts/evolution/agent-evidence-tcb.mjs'), 'current TCB');
  const currentVerifier = canonicalFile(join(root, 'scripts/evolution/verify-agent-evidence.mjs'), 'current verifier');
  if (bytesSha256(tcbBytes) !== native.tcb_sha256 || bytesSha256(verifierBytes) !== native.verifier_sha256
      || !tcbBytes.equals(currentTcb) || !verifierBytes.equals(currentVerifier)
      || !tcbBytes.equals(trackedBytes(root, commit, 'scripts/evolution/agent-evidence-tcb.mjs', 'TCB'))
      || !verifierBytes.equals(trackedBytes(root, commit, 'scripts/evolution/verify-agent-evidence.mjs', 'verifier'))) {
    throw new Error('TCB/verifier bytes do not match current target commit');
  }

  const anchor = parseJson(external.anchor_path, 'anchor');
  const anchorCoreKeys = ['schema_version', 'transaction_id', 'created_at', 'expires_at', 'repo_root', 'evidence_root',
    'consume_path', 'target_commit', 'target_tree_manifest', 'tcb', 'verifier', 'candidate_launcher', 'work_packet',
    'counter_ready', 'evidence_public_key_pem', 'evidence_fingerprint_sha256', 'nonce_commitments', 'nonce_set_sha256',
    'model_resolutions', 'runs'];
  const anchorKeys = [...anchorCoreKeys, 'base_core_sha256', 'evidence_signature_ed25519', 'counter_public_key_pem',
    'counter_fingerprint_sha256', 'counter_signature_ed25519'];
  if (!exactKeys(anchor, anchorKeys) || anchor.schema_version !== 'luca.agent-evidence-anchor.v2') throw new Error('anchor schema/keys invalid');
  let evidenceKey; let counterKey;
  try { evidenceKey = createPublicKey(anchor.evidence_public_key_pem); counterKey = createPublicKey(anchor.counter_public_key_pem); }
  catch { throw new Error('anchor public key invalid'); }
  const anchorCore = Object.fromEntries(anchorCoreKeys.map((key) => [key, anchor[key]]));
  const anchorPayload = Buffer.from(stable(anchorCore), 'utf8');
  const evidenceFingerprint = bytesSha256(evidenceKey.export({ type: 'spki', format: 'der' }));
  const counterFingerprint = bytesSha256(counterKey.export({ type: 'spki', format: 'der' }));
  if (anchor.base_core_sha256 !== bytesSha256(anchorPayload)
      || anchor.evidence_fingerprint_sha256 !== evidenceFingerprint
      || anchor.evidence_fingerprint_sha256 !== native.evidence_public_key_fingerprint_sha256
      || anchor.counter_fingerprint_sha256 !== counterFingerprint
      || anchor.counter_fingerprint_sha256 !== native.counter_fingerprint_sha256
      || anchor.nonce_set_sha256 !== native.nonce_set_sha256
      || !verifyBytes(null, anchorPayload, evidenceKey, Buffer.from(anchor.evidence_signature_ed25519, 'base64'))
      || !verifyBytes(null, anchorPayload, counterKey, Buffer.from(anchor.counter_signature_ed25519, 'base64'))) {
    throw new Error('anchor dual signature/fingerprint invalid');
  }
  const proofRoot = realpathSync(anchor.repo_root);
  if (!isAbsolute(anchor.repo_root) || proofRoot !== anchor.repo_root || proofRoot === root
      || anchor.target_commit !== commit || anchor.consume_path !== native.consume_path
      || anchor.tcb?.path !== native.tcb_path || anchor.tcb?.sha256 !== native.tcb_sha256
      || anchor.verifier?.path !== native.verifier_path || anchor.verifier?.sha256 !== native.verifier_sha256) {
    throw new Error('anchor source/TCB/verifier binding mismatch');
  }
  if (git(proofRoot, ['rev-parse', 'HEAD']) !== commit
      || git(proofRoot, ['rev-parse', `${commit}^{tree}`]) !== receipt.source_binding.target_tree
      || git(proofRoot, ['for-each-ref', '--format=%(refname)', 'refs/replace']) !== '') {
    throw new Error('signed proof checkout is not the frozen target commit/tree');
  }
  const evidenceRoot = realpathSync(anchor.evidence_root);
  const transactionRoot = dirname(native.anchor_path);
  const frozenRoot = dirname(native.tcb_path);
  if (native.anchor_path !== join(transactionRoot, 'precommit-anchor.json')
      || native.consume_path !== join(transactionRoot, 'verification-consumed.json')
      || native.verification_stdout_path !== join(transactionRoot, 'verification-stdout.txt')
      || native.tcb_path === native.verifier_path || dirname(native.verifier_path) !== frozenRoot
      || within(transactionRoot, frozenRoot) || within(frozenRoot, transactionRoot)
      || within(proofRoot, native.tcb_path) || within(proofRoot, native.verifier_path)
      || within(root, evidenceRoot) || dirname(evidenceRoot) !== transactionRoot || dirname(native.consume_path) !== transactionRoot
      || native.envelope_path !== join(evidenceRoot, 'execution-envelope.json')
      || native.summary_path !== join(evidenceRoot, 'summary.json')) throw new Error('evidence transaction layout invalid');
  if (!exactKeys(anchor.tcb, ['path', 'sha256']) || !exactKeys(anchor.verifier, ['path', 'sha256'])
      || !exactKeys(anchor.candidate_launcher, ['path', 'sha256', 'execution'])
      || !exactKeys(anchor.work_packet, ['path', 'sha256', 'source_sha256'])
      || !exactKeys(anchor.counter_ready, ['path', 'sha256', 'ready_id', 'created_at', 'expires_at', 'socket_path'])) {
    throw new Error('anchor nested contract invalid');
  }
  const proofLauncherPath = join(proofRoot, 'scripts/agent-launcher.mjs');
  const proofLauncherBytes = canonicalFile(proofLauncherPath, 'proof candidate launcher');
  const currentLauncherBytes = canonicalFile(join(root, 'scripts/agent-launcher.mjs'), 'current candidate launcher');
  const targetLauncherBytes = trackedBytes(root, commit, 'scripts/agent-launcher.mjs', 'candidate launcher');
  if (anchor.candidate_launcher.path !== proofLauncherPath || anchor.candidate_launcher.execution !== 'describe-contract-only-before-evidence-key'
      || anchor.candidate_launcher.sha256 !== bytesSha256(proofLauncherBytes)
      || !proofLauncherBytes.equals(targetLauncherBytes) || !currentLauncherBytes.equals(targetLauncherBytes)) {
    throw new Error('candidate launcher target binding invalid');
  }
  const gatePath = join(root, 'scripts/check-agents-parity.mjs');
  const gateBytes = canonicalFile(gatePath, 'native route gate');
  if (!gateBytes.equals(trackedBytes(root, commit, 'scripts/check-agents-parity.mjs', 'native route gate'))) {
    throw new Error('native route gate differs from evidence target commit');
  }
  const proofPacketBytes = canonicalFile(anchor.work_packet.path, 'proof work packet');
  const currentPacketBytes = canonicalFile(join(root, 'scripts/fixtures/agent-valid-work-packet.json'), 'current work packet');
  const targetPacketBytes = trackedBytes(root, commit, 'scripts/fixtures/agent-valid-work-packet.json', 'work packet');
  if (anchor.work_packet.path !== join(proofRoot, 'scripts/fixtures/agent-valid-work-packet.json')
      || bytesSha256(proofPacketBytes) !== anchor.work_packet.source_sha256
      || !proofPacketBytes.equals(targetPacketBytes) || !currentPacketBytes.equals(targetPacketBytes)) {
    throw new Error('work packet proof/current/target bytes mismatch');
  }
  const derivedManifest = deriveTargetTreeManifest(proofRoot, commit, anchor.work_packet.path);
  if (stable(anchor.target_tree_manifest) !== stable(derivedManifest)) {
    throw new Error('target-tree manifest is not exactly derivable from the frozen proof checkout');
  }
  const counterReadyBytes = canonicalFile(anchor.counter_ready.path, 'counter ready', {
    privateFile: true,
    outsideRoot: root,
  });
  const counterReadyPath = realpathSync(anchor.counter_ready.path);
  if (within(proofRoot, counterReadyPath) || within(transactionRoot, counterReadyPath)
      || within(counterReadyPath, transactionRoot)
      || bytesSha256(counterReadyBytes) !== anchor.counter_ready.sha256) {
    throw new Error('counter ready artifact path/hash is unsafe');
  }
  const counterReady = parseJson(counterReadyBytes, 'counter ready');
  if (!exactKeys(counterReady, ['schema_version', 'ready_id', 'created_at', 'expires_at', 'socket_path',
    'counter_public_key_pem', 'counter_fingerprint_sha256', 'commitments'])
      || !exactKeys(counterReady.commitments, ['tcb_sha256', 'verifier_sha256', 'repo_root', 'target_commit',
        'work_packet_sha256', 'work_packet_source_sha256'])
      || !counterReadyBytes.equals(Buffer.from(`${stable(counterReady)}\n`, 'utf8'))
      || counterReady.schema_version !== 'luca.agent-evidence-counter-ready.v1'
      || !/^counter-[a-f0-9]{24}$/.test(counterReady.ready_id || '')
      || counterReady.ready_id !== anchor.counter_ready.ready_id
      || counterReady.created_at !== anchor.counter_ready.created_at
      || counterReady.expires_at !== anchor.counter_ready.expires_at
      || counterReady.socket_path !== anchor.counter_ready.socket_path
      || counterReady.counter_public_key_pem !== anchor.counter_public_key_pem
      || counterReady.counter_fingerprint_sha256 !== counterFingerprint
      || counterReady.commitments.tcb_sha256 !== native.tcb_sha256
      || counterReady.commitments.verifier_sha256 !== native.verifier_sha256
      || counterReady.commitments.repo_root !== proofRoot
      || counterReady.commitments.target_commit !== commit
      || counterReady.commitments.work_packet_sha256 !== anchor.work_packet.sha256
      || counterReady.commitments.work_packet_source_sha256 !== anchor.work_packet.source_sha256) {
    throw new Error('counter ready artifact/commitments differ from signed anchor');
  }
  const readyCreated = iso(counterReady.created_at, 'counter_ready.created_at');
  const readyExpires = iso(counterReady.expires_at, 'counter_ready.expires_at');
  const anchorCreated = iso(anchor.created_at, 'anchor.created_at');
  const anchorExpires = iso(anchor.expires_at, 'anchor.expires_at');
  if (readyCreated > anchorCreated || anchorCreated >= anchorExpires || anchorExpires > readyExpires) {
    throw new Error('counter ready/anchor lifetime ordering is invalid');
  }
  const socketPath = counterReady.socket_path;
  if (!isAbsolute(socketPath || '') || resolve(socketPath) !== socketPath) {
    throw new Error('counter socket path is not canonical absolute');
  }
  const counterSocketParent = realpathSync(dirname(socketPath));
  if (join(counterSocketParent, basename(socketPath)) !== socketPath
      || within(proofRoot, socketPath) || within(transactionRoot, socketPath)
      || within(socketPath, transactionRoot)) {
    throw new Error('counter socket parent overlaps protected roots');
  }
  const modelResolution = validateModelResolutions({ root, proofRoot, evidenceRoot,
    commitments: anchor.model_resolutions });

  const envelope = parseJson(external.envelope_path, 'envelope');
  const envelopeCoreKeys = ['schema_version', 'transaction_id', 'anchor_path', 'anchor_sha256', 'target_commit', 'repo_root',
    'created_at', 'expires_at', 'public_key_fingerprint_sha256', 'tcb_sha256', 'verifier_sha256', 'launcher_sha256',
    'work_packet_sha256', 'work_packet_source_sha256', 'runtime_attestations', 'runs'];
  const envelopeCore = verifySigned(envelope, envelopeCoreKeys, 'envelope_core_sha256', 'signature_ed25519', evidenceKey, 'envelope');
  if (envelope.schema_version !== 'luca.agent-evidence-envelope.v2' || envelope.transaction_id !== anchor.transaction_id
      || envelope.anchor_path !== native.anchor_path || envelope.anchor_sha256 !== native.anchor_sha256
      || envelope.target_commit !== commit || envelope.repo_root !== proofRoot || envelope.public_key_fingerprint_sha256 !== evidenceFingerprint
      || envelope.tcb_sha256 !== native.tcb_sha256 || envelope.verifier_sha256 !== native.verifier_sha256
      || envelope.launcher_sha256 !== anchor.candidate_launcher.sha256
      || envelope.work_packet_sha256 !== anchor.work_packet.sha256
      || envelope.work_packet_source_sha256 !== anchor.work_packet.source_sha256) throw new Error('envelope binding mismatch');
  void envelopeCore;
  if (!Array.isArray(envelope.runs) || envelope.runs.length !== 8 || !Array.isArray(anchor.runs) || anchor.runs.length !== 8) {
    throw new Error('anchor/envelope run matrix must contain eight runs');
  }
  const descriptorKeys = ['schema_version', 'dispatcher_id', 'harness', 'role', 'tier', 'projection', 'definition_path',
    'definition_sha256', 'routing_path', 'routing_sha256', 'packet_sha256', 'packet_source_sha256', 'input_sha256',
    'native_task_name', 'sandbox_contract', 'write_roots', 'dispatcher_prompt', 'dispatcher_prompt_sha256', 'command_path',
    'args', 'argv_sha256', 'command_sha256', 'native_binary_path', 'native_binary_sha256', 'cli_version', 'cwd'];
  const runKeys = ['run_id', 'harness', 'role', 'nonce_commitment_sha256', 'candidate_contract_sha256',
    'native_descriptor', 'native_descriptor_sha256'];
  const anchorRunKeys = ['run_id', 'harness', 'role', 'projection', 'input_sha256', 'candidate_contract_sha256',
    'native_descriptor_sha256', 'write_roots', 'sandbox_contract'];
  const runByPair = new Map();
  const runIds = new Set();
  const anchorNonces = new Map();
  if (!Array.isArray(anchor.nonce_commitments) || anchor.nonce_commitments.length !== 8) {
    throw new Error('anchor nonce commitments must contain eight records');
  }
  for (const entry of anchor.nonce_commitments) {
    if (!exactKeys(entry, ['run_id', 'commitment_sha256']) || typeof entry.run_id !== 'string'
        || !entry.run_id || !HASH.test(entry.commitment_sha256 || '') || anchorNonces.has(entry.run_id)) {
      throw new Error('anchor nonce commitment invalid or duplicate');
    }
    anchorNonces.set(entry.run_id, entry.commitment_sha256);
  }
  if (new Set(anchorNonces.values()).size !== 8
      || anchor.nonce_set_sha256 !== bytesSha256(Buffer.from(stable(anchor.nonce_commitments), 'utf8'))) {
    throw new Error('anchor nonce-set hash mismatch');
  }
  for (const run of envelope.runs) {
    if (!exactKeys(run, runKeys) || !exactKeys(run.native_descriptor, descriptorKeys)) throw new Error('native run/descriptor keys invalid');
    const descriptor = run.native_descriptor;
    const pair = `${run.harness}/${run.role}`;
    const contract = ROLE_CONTRACT[run.role];
    const expectedProjection = run.harness === 'claude'
      ? modelResolution.bindings.get(contract?.tier)?.alias
      : modelResolution.routing.tiers[contract?.tier]?.effort;
    if (!['claude', 'codex'].includes(run.harness) || !contract || runByPair.has(pair) || runIds.has(run.run_id)
        || descriptor.schema_version !== 'luca.native-launch.v2' || descriptor.harness !== run.harness
        || descriptor.role !== run.role || descriptor.tier !== contract.tier || descriptor.projection !== expectedProjection
        || descriptor.definition_path !== contract[run.harness]
        || descriptor.routing_path !== modelResolution.routing.path
        || descriptor.routing_sha256 !== modelResolution.routing.sha256
        || !HASH.test(descriptor.definition_sha256 || '') || !HASH.test(descriptor.input_sha256 || '')
        || bytesSha256(Buffer.from(stable(descriptor), 'utf8')) !== run.native_descriptor_sha256
        || anchorNonces.get(run.run_id) !== run.nonce_commitment_sha256) {
      throw new Error(`native descriptor binding invalid ${pair}`);
    }
    runIds.add(run.run_id);
    const anchorRun = anchor.runs.find((item) => item?.run_id === run.run_id);
    if (!exactKeys(anchorRun, anchorRunKeys) || anchorRun.harness !== run.harness || anchorRun.role !== run.role
        || anchorRun.projection !== descriptor.projection || anchorRun.input_sha256 !== descriptor.input_sha256
        || anchorRun.candidate_contract_sha256 !== run.candidate_contract_sha256
        || anchorRun.native_descriptor_sha256 !== run.native_descriptor_sha256
        || stable(anchorRun.write_roots) !== stable(descriptor.write_roots)
        || stable(anchorRun.sandbox_contract) !== stable(descriptor.sandbox_contract)) {
      throw new Error(`anchor/envelope run mismatch ${pair}`);
    }
    const { write_roots: omittedRoots, ...contractDescriptor } = descriptor;
    void omittedRoots;
    if (bytesSha256(Buffer.from(stable(contractDescriptor), 'utf8')) !== run.candidate_contract_sha256) {
      throw new Error(`candidate dispatch contract hash mismatch ${pair}`);
    }
    const proofDefinitionBytes = canonicalFile(join(proofRoot, descriptor.definition_path), `proof definition ${pair}`);
    const currentDefinitionBytes = canonicalFile(join(root, descriptor.definition_path), `current definition ${pair}`);
    const targetDefinitionBytes = trackedBytes(root, commit, descriptor.definition_path, `definition ${pair}`);
    if (descriptor.cwd !== proofRoot || bytesSha256(proofDefinitionBytes) !== descriptor.definition_sha256
        || !proofDefinitionBytes.equals(targetDefinitionBytes) || !currentDefinitionBytes.equals(targetDefinitionBytes)) {
      throw new Error(`definition current/target bytes mismatch ${pair}`);
    }
    const proofRoutingBytes = canonicalFile(join(proofRoot, descriptor.routing_path), `proof routing ${pair}`);
    const currentRoutingBytes = canonicalFile(join(root, descriptor.routing_path), `current routing ${pair}`);
    const targetRoutingBytes = trackedBytes(root, commit, descriptor.routing_path, `routing ${pair}`);
    if (bytesSha256(proofRoutingBytes) !== descriptor.routing_sha256
        || !proofRoutingBytes.equals(targetRoutingBytes) || !currentRoutingBytes.equals(targetRoutingBytes)) {
      throw new Error(`routing current/target bytes mismatch ${pair}`);
    }
    runByPair.set(pair, run);
  }
  const expectedPairs = ['claude', 'codex'].flatMap((harness) => LOGICAL_ROLES.map((role) => `${harness}/${role}`));
  if (stable([...runByPair.keys()].sort()) !== stable(expectedPairs.sort())) throw new Error('native descriptor matrix exact-set mismatch');

  const delegatedRoots = [...new Set(envelope.runs.flatMap((run) => run.native_descriptor.write_roots || []).map((path) => resolve(path)))];
  if (delegatedRoots.some((writeRoot) => within(writeRoot, counterReadyPath)
      || within(counterReadyPath, writeRoot) || within(writeRoot, counterSocketParent)
      || within(counterSocketParent, writeRoot))) {
    throw new Error('counter ready/socket parent overlaps delegated child root');
  }
  for (const [path, label] of [[native.anchor_path, 'anchor'], [native.envelope_path, 'envelope'],
    [native.summary_path, 'summary'], [native.consume_path, 'consume'],
    [native.verification_stdout_path, 'verification stdout'], [native.tcb_path, 'TCB'],
    [native.verifier_path, 'verifier']]) {
    if (delegatedRoots.some((writeRoot) => within(writeRoot, path))) throw new Error(`${label} overlaps delegated child root`);
  }

  const summary = parseJson(external.summary_path, 'summary');
  const summaryCoreKeys = ['schema_version', 'transaction_id', 'anchor_sha256', 'envelope_path', 'envelope_sha256',
    'public_key_fingerprint_sha256', 'target_commit', 'harnesses', 'roles', 'receipts', 'completed_at'];
  verifySigned(summary, summaryCoreKeys, 'summary_core_sha256', 'signature_ed25519', evidenceKey, 'summary');
  if (summary.schema_version !== 'luca.agent-evidence-summary.v2' || summary.transaction_id !== anchor.transaction_id
      || summary.anchor_sha256 !== native.anchor_sha256 || summary.envelope_path !== relative(evidenceRoot, native.envelope_path)
      || summary.envelope_sha256 !== native.envelope_sha256 || summary.public_key_fingerprint_sha256 !== evidenceFingerprint
      || summary.target_commit !== commit || stable(summary.harnesses) !== stable(['claude', 'codex'])
      || stable(summary.roles) !== stable([...LOGICAL_ROLES]) || !Array.isArray(summary.receipts)
      || summary.receipts.length !== 8) throw new Error('summary binding/matrix invalid');
  iso(summary.completed_at, 'summary.completed_at');

  const consumption = parseJson(external.consume_path, 'consumption');
  if (!exactKeys(consumption, ['schema_version', 'anchor_sha256', 'envelope_sha256', 'verified_at'])
      || consumption.schema_version !== 'luca.agent-evidence-consumption.v1'
      || consumption.anchor_sha256 !== native.anchor_sha256 || consumption.envelope_sha256 !== native.envelope_sha256) {
    throw new Error('one-use consumption binding invalid');
  }
  iso(consumption.verified_at, 'consumption.verified_at');
  const verificationLines = external.verification_stdout_path.toString('utf8').split('\n');
  if (verificationLines.length !== 3 || verificationLines[2] !== ''
      || verificationLines[1] !== 'AGENT_EVIDENCE_VERIFIED') throw new Error('independent verifier stdout shape invalid');
  const verificationRecord = parseJson(Buffer.from(verificationLines[0], 'utf8'), 'verification stdout record');
  if (!exactKeys(verificationRecord, ['transaction_id', 'receipts', 'anchor_sha256', 'consumed'])
      || verificationRecord.transaction_id !== anchor.transaction_id || verificationRecord.receipts !== 8
      || verificationRecord.anchor_sha256 !== native.anchor_sha256
      || verificationRecord.consumed !== native.consume_path) throw new Error('independent verifier stdout binding invalid');

  if (!Array.isArray(native.edges) || native.edges.length !== 8) throw new Error('edge matrix must contain eight records');
  const parents = new Set(); const children = new Set(); const edgePairs = new Set();
  const receiptCoreKeys = ['schema_version', 'transaction_id', 'run_id', 'anchor_sha256', 'envelope_sha256',
    'public_key_fingerprint_sha256', 'harness', 'role', 'target_commit', 'native_descriptor_sha256',
    'nonce_commitment_sha256', 'parent_id', 'child_id', 'spawn_id', 'source_log_sha256', 'output_sha256',
    'events', 'created_at', 'completed_at', 'expires_at'];
  for (const edge of native.edges) {
    if (!exactKeys(edge, EDGE_KEYS)) throw new Error('edge keys are not exact');
    const pair = `${edge.harness}/${edge.role}`;
    const run = runByPair.get(pair);
    if (!run || edgePairs.has(pair) || typeof edge.parent_id !== 'string' || !edge.parent_id
        || typeof edge.child_id !== 'string' || !edge.child_id || edge.parent_id === edge.child_id
        || parents.has(edge.parent_id) || children.has(edge.child_id) || parents.has(edge.child_id) || children.has(edge.parent_id)) {
      throw new Error(`edge identity/exact-set invalid ${pair}`);
    }
    edgePairs.add(pair); parents.add(edge.parent_id); children.add(edge.child_id);
    for (const key of ['definition_sha256', 'input_sha256', 'output_sha256', 'source_log_sha256',
      'receipt_sha256', 'native_descriptor_sha256']) assertHash(edge[key], `edge.${key}`);
    const descriptor = run.native_descriptor;
    if (edge.definition_path !== descriptor.definition_path || edge.definition_sha256 !== descriptor.definition_sha256
        || edge.input_sha256 !== descriptor.input_sha256 || edge.native_descriptor_sha256 !== run.native_descriptor_sha256) {
      throw new Error(`edge descriptor/input/definition mismatch ${pair}`);
    }
    const summaryEntry = summary.receipts.find((item) => item?.harness === edge.harness && item?.role === edge.role);
    if (!exactKeys(summaryEntry, ['harness', 'role', 'path', 'sha256', 'child_id'])
        || typeof summaryEntry.path !== 'string' || summaryEntry.path.startsWith('/') || summaryEntry.path.includes('..')
        || join(evidenceRoot, summaryEntry.path) !== edge.receipt_path || summaryEntry.sha256 !== edge.receipt_sha256
        || summaryEntry.child_id !== edge.child_id) throw new Error(`summary/edge receipt mismatch ${pair}`);
    const receiptBytes = canonicalFile(edge.receipt_path, `edge receipt ${pair}`, { privateFile: true, outsideRoot: root });
    if (delegatedRoots.some((writeRoot) => within(writeRoot, edge.receipt_path))
        || bytesSha256(receiptBytes) !== edge.receipt_sha256) throw new Error(`edge receipt path/hash invalid ${pair}`);
    const signedReceipt = parseJson(receiptBytes, `edge receipt ${pair}`);
    verifySigned(signedReceipt, receiptCoreKeys, 'receipt_core_sha256', 'signature_ed25519', evidenceKey, `edge receipt ${pair}`);
    if (signedReceipt.schema_version !== 'luca.agent-evidence-receipt.v2'
        || signedReceipt.transaction_id !== anchor.transaction_id || signedReceipt.run_id !== run.run_id
        || signedReceipt.anchor_sha256 !== native.anchor_sha256 || signedReceipt.envelope_sha256 !== native.envelope_sha256
        || signedReceipt.public_key_fingerprint_sha256 !== evidenceFingerprint
        || signedReceipt.harness !== edge.harness || signedReceipt.role !== edge.role || signedReceipt.target_commit !== commit
        || signedReceipt.native_descriptor_sha256 !== edge.native_descriptor_sha256
        || signedReceipt.nonce_commitment_sha256 !== run.nonce_commitment_sha256
        || signedReceipt.parent_id !== edge.parent_id || signedReceipt.child_id !== edge.child_id
        || signedReceipt.source_log_sha256 !== edge.source_log_sha256 || signedReceipt.output_sha256 !== edge.output_sha256
        || !Array.isArray(signedReceipt.events) || signedReceipt.events.length !== 3) {
      throw new Error(`signed receipt edge binding invalid ${pair}`);
    }
    let previous = null;
    const kinds = ['launch', 'session', 'result'];
    const eventCores = signedReceipt.events.map((event, index) => {
      const eventKeys = ['schema_version', 'kind', 'sequence', 'previous_sha256', 'payload'];
      const core = verifySigned(event, eventKeys, 'event_sha256', 'signature_ed25519', evidenceKey, `edge event ${pair}/${index}`);
      if (event.schema_version !== 'luca.agent-evidence-event.v2' || event.kind !== kinds[index]
          || event.sequence !== index + 1 || event.previous_sha256 !== previous) throw new Error(`edge event chain invalid ${pair}`);
      previous = event.event_sha256;
      return core.payload;
    });
    const [launch, session, result] = eventCores;
    const sessionProjectionMatches = edge.harness === 'claude'
      ? claudeFamilyMatches(run.native_descriptor.projection, session.observed_projection)
        && session.observed_projection === modelResolution.bindings.get(run.native_descriptor.tier)?.concrete
      : session.observed_projection === run.native_descriptor.projection;
    if (!exactKeys(launch, ['run_id', 'anchor_sha256', 'envelope_sha256', 'nonce', 'nonce_commitment_sha256',
      'harness', 'role', 'native_descriptor_sha256', 'target_commit', 'launched_at'])
      || !exactKeys(session, ['run_id', 'parent_id', 'child_id', 'spawn_id', 'native_identity_kind', 'input_binding_kind',
        'observed_input_sha256', 'observed_projection', 'source_log_sha256', 'raw_logs', 'stderr_sha256', 'observed_at'])
      || !exactKeys(result, ['run_id', 'output_sha256', 'output_size', 'completed_at', 'exit_code'])) {
      throw new Error(`edge event payload keys invalid ${pair}`);
    }
    if (launch.run_id !== run.run_id || launch.anchor_sha256 !== native.anchor_sha256
        || launch.envelope_sha256 !== native.envelope_sha256 || launch.harness !== edge.harness || launch.role !== edge.role
        || launch.native_descriptor_sha256 !== edge.native_descriptor_sha256 || launch.target_commit !== commit
        || launch.nonce_commitment_sha256 !== run.nonce_commitment_sha256
        || bytesSha256(Buffer.from(launch.nonce || '', 'utf8')) !== launch.nonce_commitment_sha256
        || session.run_id !== run.run_id || session.parent_id !== edge.parent_id || session.child_id !== edge.child_id
        || session.spawn_id !== signedReceipt.spawn_id || session.observed_input_sha256 !== edge.input_sha256
        || !sessionProjectionMatches
        || session.native_identity_kind !== (edge.harness === 'claude'
          ? 'dispatcher_session_to_child_agent_id' : 'parent_thread_to_child_thread')
        || session.input_binding_kind !== (edge.harness === 'claude'
          ? 'native_plaintext_prompt_sha256' : 'precommitted_dispatcher_plus_native_ciphertext_continuity')
        || session.source_log_sha256 !== edge.source_log_sha256 || result.run_id !== run.run_id
        || result.output_sha256 !== edge.output_sha256 || result.exit_code !== 0) {
      throw new Error(`edge signed event binding invalid ${pair}`);
    }
    const expectedKinds = edge.harness === 'claude' ? ['public', 'stderr'] : ['public', 'stderr', 'parent_rollout', 'child_rollout'];
    if (!Array.isArray(session.raw_logs) || stable(session.raw_logs.map((raw) => raw?.kind)) !== stable(expectedKinds)
        || new Set(session.raw_logs.map((raw) => raw?.kind)).size !== expectedKinds.length
        || !HASH.test(session.stderr_sha256 || '')) throw new Error(`edge raw log manifest invalid ${pair}`);
    const framed = [];
    for (const raw of session.raw_logs) {
      if (!exactKeys(raw, ['kind', 'path', 'size', 'sha256']) || typeof raw.path !== 'string'
          || raw.path.startsWith('/') || raw.path.includes('..') || !Number.isInteger(raw.size) || raw.size < 0
          || !HASH.test(raw.sha256 || '')) throw new Error(`edge raw log entry invalid ${pair}`);
      const rawPath = join(evidenceRoot, raw.path);
      const rawBytes = canonicalFile(rawPath, `raw log ${pair}`, { privateFile: true, outsideRoot: root });
      if (delegatedRoots.some((writeRoot) => within(writeRoot, rawPath))
          || rawBytes.length !== raw.size || bytesSha256(rawBytes) !== raw.sha256) throw new Error(`edge raw log hash invalid ${pair}`);
      framed.push(Buffer.from(`${raw.kind}:${rawBytes.length}:`), rawBytes);
      if (raw.kind === 'stderr' && bytesSha256(rawBytes) !== session.stderr_sha256) throw new Error(`edge stderr hash invalid ${pair}`);
    }
    if (bytesSha256(Buffer.concat(framed)) !== edge.source_log_sha256) throw new Error(`edge source log framing invalid ${pair}`);
  }
  if (edgePairs.size !== 8 || parents.size !== 8 || children.size !== 8
      || stable([...edgePairs].sort()) !== stable(expectedPairs.sort())) throw new Error('edge matrix identities are incomplete');
  if (receiptPath !== join(root, NATIVE_PROOF_RECEIPT_PATH)) throw new Error('proof receipt path is not canonical');
}

// Production route authorization is deliberately separate from agent-launcher.mjs.  The frozen
// U008 evidence TCB must be able to exercise the dormant definitions directly; first-class skills
// and the orchestrator, by contrast, must pass this exact gate before every native role dispatch.
// The CLI below always binds to this checkout's state.  The exported pure function accepts a root
// only so the hermetic test suite can build mutation fixtures without rewriting the live state.
export function verifyNativeRouteActivation({ root = ROOT, role }) {
  const blocked = (code, detail = '') => Object.freeze({ authorized: false, code, detail, role });
  if (!LOGICAL_ROLES.includes(role)) return blocked('UNKNOWN_ROLE');
  if (!ACTIVATION_GATED_ROLES.has(role)) {
    return Object.freeze({ authorized: true, code: 'EXISTING_ROUTE_UNGATED', role });
  }
  let canonicalRoot;
  try { canonicalRoot = realpathSync(root); } catch { return blocked('ROOT_UNAVAILABLE'); }
  const activationPath = join(canonicalRoot, '.claude', 'skill-os', 'native-agent-activation.json');
  let activationBytes;
  let activationStat;
  let activation;
  try {
    activationStat = lstatSync(activationPath);
    if (!activationStat.isFile() || activationStat.isSymbolicLink() || activationStat.nlink !== 1) {
      return blocked('ACTIVATION_FILE_UNSAFE');
    }
    activationBytes = readFileSync(activationPath);
    activation = JSON.parse(activationBytes.toString('utf8'));
  } catch {
    return blocked('ACTIVATION_STATE_INVALID');
  }
  if (!exactKeys(activation, ACTIVATION_KEYS)
      || activation.schema_version !== 'luca.native-agent-activation.v1'
      || !['DORMANT', 'ACTIVE'].includes(activation.status)) {
    return blocked('ACTIVATION_STATE_INVALID');
  }
  if (activation.status === 'DORMANT') {
    if (activation.proof_receipt_path !== null || activation.proof_receipt_sha256 !== null
        || activation.activated_at !== null) return blocked('DORMANT_STATE_INVALID');
    return blocked('DORMANT');
  }
  if (activation.proof_receipt_path !== NATIVE_PROOF_RECEIPT_PATH
      || !/^[a-f0-9]{64}$/.test(activation.proof_receipt_sha256 || '')
      || typeof activation.activated_at !== 'string'
      || !Number.isFinite(Date.parse(activation.activated_at))) {
    return blocked('ACTIVE_BINDING_INVALID');
  }
  const receiptPath = join(canonicalRoot, NATIVE_PROOF_RECEIPT_PATH);
  let receiptBytes;
  let receipt;
  try {
    const receiptStat = lstatSync(receiptPath);
    if (!receiptStat.isFile() || receiptStat.isSymbolicLink() || receiptStat.nlink !== 1
        || realpathSync(receiptPath) !== receiptPath) return blocked('PROOF_RECEIPT_UNSAFE');
    receiptBytes = readFileSync(receiptPath);
    if (bytesSha256(receiptBytes) !== activation.proof_receipt_sha256) {
      return blocked('PROOF_RECEIPT_HASH_MISMATCH');
    }
    receipt = JSON.parse(receiptBytes.toString('utf8'));
  } catch {
    return blocked('PROOF_RECEIPT_INVALID');
  }
  try { validateApprovedReceipt({ root: canonicalRoot, receipt, receiptPath }); }
  catch (error) { return blocked('PROOF_RECEIPT_NOT_APPROVED', error.message); }
  return Object.freeze({
    authorized: true,
    code: 'AUTHORIZED',
    role,
    proof_receipt_path: activation.proof_receipt_path,
    proof_receipt_sha256: activation.proof_receipt_sha256,
    activation_sha256: bytesSha256(activationBytes),
  });
}

const DIRECT_NEW_ROLE_SYNTAX = Object.freeze([
  /\b(?:subagent_type|agent_type)\s*[=:]\s*["'`](?:work-agent|oracle)["'`]/i,
  /\bAgent\((?:work-agent|oracle)\)/i,
  /\btask\s*\([^\n]{0,160}\b(?:subagent_type|agent_type)\s*[=:]\s*["'`](?:work-agent|oracle)["'`]/i,
  /\bspawn_agent\s*\([^\n]{0,160}\bagent_type\s*[=:]\s*["'`](?:work-agent|oracle)["'`]/i,
  /\bspawn\s+[`"']?(?:work-agent|oracle)[`"']?\b/i,
]);
const DIRECT_NEW_ROLE_LAUNCH = /\bscripts\/agent-launcher\.mjs[^\n]*\blaunch\b[^\n]*--role\s+(?:work-agent|oracle)\b/i;

export function findNativeRouteBypasses({ activationStatus, surfaces }) {
  const errors = [];
  const hasOperationalGate = (text, role) => text.includes(NATIVE_ROUTE_GATE_COMMAND)
    && text.includes(`--role ${role}`) && text.includes('NATIVE_ROLE_ROUTE_ACTIVE');
  for (const [rel, role] of Object.entries(NATIVE_ROUTE_SURFACES)) {
    const text = surfaces[rel];
    if (typeof text !== 'string') {
      errors.push(`${rel} missing from production route surface map`);
      continue;
    }
    if (activationStatus === 'DORMANT') {
      const oracleSurface = role === 'oracle';
      if (oracleSurface
          && (!text.includes('NATIVE_ROLE_ROUTE_DORMANT_BLOCK')
            || !text.includes('BLOCKED_NATIVE_ROLE_DORMANT'))) {
        errors.push(`${rel} missing oracle dormant fail-closed marker`);
      }
    } else if (activationStatus === 'ACTIVE') {
      if (!hasOperationalGate(text, role)) errors.push(`${rel} missing ACTIVE receipt-bound operational gate for ${role}`);
      for (const pattern of DIRECT_NEW_ROLE_SYNTAX) {
        if (pattern.test(text)) {
          errors.push(`${rel} contains direct exact ${role} bypass while ACTIVE: ${pattern.source}`);
          break;
        }
      }
      if (/internal reasoning|内部推理|generic (?:agent|child)|Workflow runner/i.test(text)
          && !/(?:never|不得|不能|不可|do not)[^\n]{0,120}(?:internal reasoning|内部推理|generic (?:agent|child)|Workflow runner)/i.test(text)
          && !/(?:internal reasoning|内部推理|generic (?:agent|child)|Workflow runner)[^\n]{0,120}(?:never|不得|不能|不可)/i.test(text)) {
        errors.push(`${rel} permits non-native substitution while ACTIVE`);
      }
    } else {
      errors.push(`invalid activation status ${activationStatus || 'missing'}`);
      break;
    }
  }
  if (['DORMANT', 'ACTIVE'].includes(activationStatus)) {
    for (const [rel, text] of Object.entries(surfaces)) {
      if (typeof text !== 'string' || REGISTERED_ROLE_DEFINITIONS.has(rel)) continue;
      for (const pattern of DIRECT_NEW_ROLE_SYNTAX) {
        if (pattern.test(text)) {
          errors.push(`${rel} contains direct new native role syntax while ${activationStatus}: ${pattern.source}`);
          break;
        }
      }
      if (activationStatus === 'DORMANT' && DIRECT_NEW_ROLE_LAUNCH.test(text)
          && !(text.includes('NATIVE_ROLE_ROUTE_ACTIVE') && text.includes('NATIVE_ROLE_ROUTE_DORMANT_BLOCK'))) {
        errors.push(`${rel} invokes the governed new-role launcher without an explicit DORMANT/ACTIVE branch`);
      }
    }
  }
  return errors;
}

export function collectNativeRouteSurfaces(root = ROOT) {
  const found = {};
  const walk = (rel) => {
    const absolute = join(root, rel);
    if (!existsSync(absolute)) return;
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && /\.(?:md|js|mjs)$/.test(entry.name)) found[child] = readFileSync(join(root, child), 'utf8');
    }
  };
  walk('.claude/agents');
  walk('.claude/commands');
  walk('.claude/skills/office');
  walk('.claude/workflows');
  for (const rel of Object.keys(NATIVE_ROUTE_SURFACES)) {
    if (!(rel in found) && existsSync(join(root, rel))) found[rel] = readFileSync(join(root, rel), 'utf8');
  }
  return found;
}

function runParityChecks() {
const agents = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8');
let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

// ⓪ 反空壳门（深审：裸 includes 可被 12 行空壳骗过 —— 只要把关键词堆在一起就 15/15 全绿）。
// 治理段落必须有**实质体量**且结构完整，光有关键词不算。
{
  const govStart = agents.indexOf('## 4.8 Governance Parity');
  const govEnd = agents.indexOf('\n## 5.', govStart > 0 ? govStart : 0);
  const gov = govStart > 0 && govEnd > govStart ? agents.slice(govStart, govEnd) : '';
  check('anti-shell: §4.8 存在且成节', gov.length > 0, '找不到 §4.8 Governance Parity 到 §5 之间的内容');
  check('anti-shell: §4.8 有实质体量（≥1500 字符）', gov.length >= 1500, `实际 ${gov.length} 字符——疑似被掏空成关键词壳`);
  const subs = ['4.8.1', '4.8.2', '4.8.3', '4.8.4', '4.8.5'];
  const missSub = subs.filter((x) => !gov.includes(x));
  check('anti-shell: §4.8 五个子节齐全', missSub.length === 0, `缺 ${missSub.join(',')}`);
  check('anti-shell: AGENTS.md 整体未被掏空（≥400 行）', agents.split('\n').length >= 400,
    `实际 ${agents.split('\n').length} 行`);
}

// ① 治理段落存在性锚点（内容删了/改跑题即红）
const ANCHORS = [
  ['记忆门禁·默认不存', '默认不存'],
  ['记忆门禁·四强信号', '四强信号'],
  ['记忆门禁·归因阶梯', 'correction-attribution.md'],
  ['记忆门禁·三分归属', 'propose_semantic.py'],
  ['记忆红线 SC-20260523-003', 'SC-20260523-003'],
  ['模型档·真值源指针', 'model-routing.yaml'],
  ['模型档·能力档意图', 'reasoning-heavy'],
  ['会话隔离·方案A pin', '.session-project-'],
  ['human-gate 全局规则', '缺结构化工具'],
  ['Static Fallback 节', '关键约束速查'],
];
for (const [name, needle] of ANCHORS) check(`anchor: ${name}`, agents.includes(needle), `缺 "${needle}"`);

// ② 陈旧面回归门：产品/品牌不得再硬编码进 AGENTS.md（已转 profile 激活）
check('no-stale: 产品身份未硬编码', !agents.includes('纷享销客'), '出现 纷享销客 → §0 身份又被写死');
check('no-stale: 品牌色未硬编码', !agents.includes('#FF8000'), '出现 #FF8000 → 品牌应 profile 激活');
check('no-stale: 已被取代的共享软链模型未复活',
  !agents.includes('still a global shared symlink'),
  '出现旧 G6 表述 → 应为方案A per-session pin');

// ③ 跨源一致性：SF 镜像 id 集合 == allowlist（防两处 SF 分叉）
{
  const allow = readFileSync(join(ROOT, 'memory/semantic/static-fallback-allowlist.txt'), 'utf8')
    .split('\n').map(l => l.split('#')[0].trim()).filter(Boolean).sort();
  const sfSection = agents.slice(agents.indexOf('关键约束速查'));
  const mirrored = [...new Set([...sfSection.matchAll(/\[(SF-\d+|SC-\d{8}-\d+)\s*\//g)].map(m => m[1]))].sort();
  const same = JSON.stringify(allow) === JSON.stringify(mirrored);
  check('cross-source: AGENTS.md SF ids == allowlist', same,
    `allowlist=${JSON.stringify(allow)} vs AGENTS.md=${JSON.stringify(mirrored)}`);
}

// ④ 分层诚实性：Tier-2/3 降级必须显式声明「弱于 Claude」，不得假装等价
check('honesty: 降级面显式声明弱于 Claude', /弱于 Claude/.test(agents),
  '缺「弱于 Claude」声明 → 降级被写成等价');

// ⑤ [U] hedge 守护（审计 Round1 验证 agent 发现的 MISSING_GATE）：AGENTS.md 关于 Codex per-agent
// model 参数的断言必须带未核验 hedge——该 Codex 事实本仓从未 spike，无门则未来编辑可静默退回
// 「Codex 无 model 参数」的既成事实断言，翻掉 §0.5b「model-tier LOCKS」而无告警。
{
  const hedge = /未核验|尚未.{0,4}核验|unverified|pending.{0,6}spike|保守假设/i;
  // §4.8.2 model routing 段（到 §4.8.3 前）
  const i2 = agents.indexOf('4.8.2'); const i3 = agents.indexOf('4.8.3');
  const mdSec = i2 >= 0 && i3 > i2 ? agents.slice(i2, i3) : '';
  // Round2 强化 + Round3 加固：hedge 就近判定 **且** 就近不得出现既成事实反措辞。整段/整窗只查 hedge
  // 存在性时，半回退（把 model 句翻成"无法传/已确认/has no"、却在窗口别处保留一个 hedge 词）会误 PASS。
  const revert = /无法.{0,4}传|已(?:经)?确认|Codex has no per-agent|Codex cannot .{0,12}model/i;

  // 2026-08-04 演进：spike 已真做（Codex subagent toml 实测支持 model / model_reasoning_effort）。
  // 门的不变量从来不是"永远保持 hedge"，而是**断言不得无凭据**——未核验时凭据是 hedge，
  // 已核验时凭据是实测锚。若只认 hedge，spike 完成后守的就是一句假话，且会逼后来者
  // 要么写假 hedge 要么删掉整个门（两条都比现在糟）。故补一条**更严**的合法解除路径：
  // 必须同时出现「已核验措辞」+「可追的实测落点」，缺一不可；revert 反措辞检测照旧生效。
  // 判定粒度刻意分两级：hedge / 已核验措辞 / 反措辞按**就近窗口**判（防"半回退"——把某一句
  // 翻成既成事实、却靠段落别处残留的词蒙混过关，这是 Round2/Round3 加固的原意，不可放宽）；
  // 而实测锚按**全文**判——它是可追的落点凭据（真值源字段名 / 验收脚本名），本就散落在别处，
  // 要求它紧贴该句会逼出复读式冗余。锚被整体删除时仍会转红（已变异测试验证）。
  const verified = /spike 已完成|已核验|实测推翻|实测(?:证据|校正|枚举)|被实测/i;
  // 2026-08-05 深审：把「必须 hedge」放宽成「hedge 或(已核验词 + 全文锚)」后，评审用一条
  // **与代码直接矛盾的假断言**（"effort 一律固定为 xhigh、调用方不可配置"，而 .codex/agents/*.toml
  // 明明分三档）拿到 22/22 全绿——两个弱条件相乘不等于强条件：verified 只是词表匹配，
  // 锚是全文级（文件任何角落出现该词即算数）。
  // 修法：已核验路径不能只靠"说了什么"，必须与**磁盘真实状态**对账——
  // 断言 AGENTS.md 声称的可配置性与 .codex/agents/*.toml 的实际档位分布一致。
  // 说假话就会与磁盘对不上，词表再全也过不了。
  const tomlEfforts = (() => {
    const d = join(ROOT, '.codex', 'agents');
    if (!existsSync(d)) return [];
    return readdirSync(d).filter((f) => f.endsWith('.toml'))
      .map((f) => (readFileSync(join(d, f), 'utf8').match(/^model_reasoning_effort\s*=\s*"([^"]+)"/m) || [])[1])
      .filter(Boolean);
  })();
  const tomlIsConfigurable = new Set(tomlEfforts).size > 1;   // 多档并存 = 可配置
  const claimsNotConfigurable = /不可配置|一律固定|固定为\s*\w+|无法配置/.test(agents);
  const groundTruthOk = !(tomlIsConfigurable && claimsNotConfigurable);
  const attested = (t) =>
    (hedge.test(t) || (verified.test(t) && evidenceAnchorNear(t))) && !revert.test(t) && groundTruthOk;
  // 锚的判定范围：全文级太松（评审实证形同虚设），±400 字符太脆（措辞一改就误红）。
  // 取中间——**同一小节内**：主张与其证据本就该在同一节。真正的强度来自上面的
  // groundTruthOk（与 .codex/agents/*.toml 的实际档位分布对账），说假话对不上磁盘就过不了。
  function evidenceAnchorNear() { return /model_reasoning_effort|verify-codex-wiring|tier_to_effort/i.test(mdSec); }

  // 逐个匹配点各取窗口，**任一成立即通过**（2026-08-05 修）：
  // 原实现只看首个匹配，而 §4.8.2 的**标题**本身就含 "reasoning effort"，
  // 于是窗口恒定落在段首 400 字符、看不到写在后文的凭据——断言恒红，是定位 bug 不是内容问题。
  const wins = [...mdSec.matchAll(/per-agent[ \u4e00-\u9fa5]{0,4}(model|档位)|model 参数|reasoning effort/gi)]
    .map((m) => mdSec.slice(Math.max(0, m.index - 160), m.index + 400));
  check('hedge: §4.8.2 model 档位断言有凭据（hedge 或实测锚）且无既成事实反措辞',
    wins.length > 0 && wins.some(attested),
    '§4.8.2 model 句缺凭据（既无 hedge 也无实测锚）或现既成事实措辞（无法传/已确认）→ 恐退回断言');
  // §11 Non-goal：整条目查 hedge 存在性 **+ 反措辞检测**（Round3 加固）。反措辞是真防护——半回退把
  // 本句翻成"Codex has no per-agent model"既成事实时，即便条目别处留 hedge 词也会被 revert 检测抓住。
  // 大小写不敏感：条目首字母会随行文改写（Do not attempt per-agent… → **Per-agent…**），
  // indexOf 恒敏感会让本 check 静默恒 FAIL（2026-08-04 实证，一度被误读成"反措辞被抓到"）。
  const ng = agents.search(/per-agent model-tier dispatch/i);
  const ngItem = ng >= 0 ? agents.slice(ng, ng + 600) : '';
  check('hedge: §11 model dispatch 条目有凭据（hedge 或实测锚）且无既成事实反措辞',
    ng >= 0 && attested(ngItem),
    '§11 model dispatch 缺凭据（既无 hedge 也无实测锚）或现既成事实断言（Codex has no per-agent model）');
}

// ⑥ 无字面绝对路径（审计 CR0022 的门守护）：项目路径应全用 <PROJECTS_ROOT>；仅 PROJECTS_ROOT
// 定义行（$HOME/Desktop/项目 或 LUCA_PROJECTS_ROOT）允许出现字面 Desktop/项目。
{
  // Round3 零豁免：无任何合法行需要字面 /Users/luca/Desktop（PROJECTS_ROOT 定义行用 $HOME/Desktop，
  // 非字面 /Users/luca）。旧 LUCA_PROJECTS_ROOT 豁免是死豁免且开旁路（同行硬编码绝对路径会被漏放）→ 删。
  const bad = agents.split('\n').filter((l) => l.includes('/Users/luca/Desktop'));
  check('no-abs-path: 无字面 /Users/luca/Desktop 硬编码（除 PROJECTS_ROOT 定义行）',
    bad.length === 0, `残留 ${bad.length} 行硬编码绝对路径`);
}

// ⑦ ADR-AGENT-001：四个 logical role 必须是仓库原生定义，两端投影同源。
// 这里查「精确名字 + 精确路径 + 定义 bytes hash」，而不是“目录里有几个文件”。
// hash 会在每次运行时从当前 bytes 重算，同时与 review-owned 常量和 launcher
// 解析结果对账。改了 role body 却没显式更新 pin，必须变红。
{
  const EXACT_ROLES = ['plan-agent', 'work-agent', 'oracle', 'quality-gate'];
  const EXPECTED = {
    'plan-agent': { tier: 'reasoning-heavy', claude: '.claude/agents/plan-agent.md', codex: '.codex/agents/plan-agent.toml' },
    'work-agent': { tier: 'core-execution', claude: '.claude/agents/work-agent.md', codex: '.codex/agents/work-agent.toml' },
    oracle: { tier: 'reasoning-heavy', claude: '.claude/agents/oracle.md', codex: '.codex/agents/oracle.toml' },
    'quality-gate': { tier: 'core-execution', claude: '.claude/agents/quality-gate.md', codex: '.codex/agents/quality-gate.toml' },
  };
  // Definition bytes are part of the registered-role identity, not merely files that happen to
  // parse today.  Intentional role-body changes must update this review-owned pin in the same
  // change; an unreviewed body edit therefore fails even when its name/path remain unchanged.
  const EXPECTED_HASHES = {
    claude: {
      'plan-agent': '857aada14b161e98c9b626ef3c856d58dd4c018ddcd6555b266f91e2365862c7',
      'work-agent': 'ef0ff9b632e37067fa0a026118aa4d4915745fcfabd5dbdc0a5558541e5da664',
      oracle: 'de7fe2bd4404f980ff5551eb61dae931cbeee813647c3cb2f1023f5f556e55eb',
      'quality-gate': '36a61adced31a6038e4d87e56b96c158752ffd12a6bd68347410a588726c7fb4',
    },
    codex: {
      'plan-agent': '877d38847e644800d83feedea80702ede9efdf034550fce7c02024313d94f5d2',
      'work-agent': '715a4f694179ad328f54e7a7c3c1e31abe85fa7edfe39a782885e6ae8c700118',
      oracle: '661d1ea7c74c1cbd0f8351bdf516b87d9bde4327e051f176a9fa4c5df3384b87',
      'quality-gate': '49f7d50ebcc4dc8d073b62f43cfb60ebc953fd5c0c00b8f5a9b985b8b828d898',
    },
  };
  const sorted = (xs) => [...xs].sort();
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const routingPath = join(ROOT, '.claude', 'skill-os', 'model-routing.yaml');
  const routing = readFileSync(routingPath, 'utf8');

  const indentedBlock = (text, key, indent = 0) => {
    const prefix = `${' '.repeat(indent)}${key}:`;
    const lines = text.split('\n');
    const start = lines.findIndex((line) => line.split('#', 1)[0].trimEnd() === prefix);
    if (start < 0) return '';
    const out = [];
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() && !line.trimStart().startsWith('#')) {
        const leading = line.length - line.trimStart().length;
        if (leading <= indent) break;
      }
      out.push(line);
    }
    return out.join('\n');
  };
  const scalarMap = (block, indent) => Object.fromEntries(
    [...block.matchAll(new RegExp(`^\\s{${indent}}([a-z0-9-]+):\\s*([a-z0-9-]+)\\s*(?:#.*)?$`, 'gm'))]
      .map((m) => [m[1], m[2]]),
  );
  const logical = scalarMap(indentedBlock(routing, 'logical_roles'), 2);
  const claudeProjection = scalarMap(indentedBlock(routing, 'agents'), 2);
  const codexBlock = indentedBlock(routing, 'codex');
  const codexProjection = scalarMap(indentedBlock(codexBlock, 'agents', 2), 4);
  const tierEffort = scalarMap(indentedBlock(codexBlock, 'tier_to_effort', 2), 4);
  const tierAlias = Object.fromEntries(['reasoning-heavy', 'core-execution', 'guided-execution', 'mechanical'].map((tier) => {
    const block = indentedBlock(indentedBlock(routing, 'tiers'), tier, 2);
    return [tier, (block.match(/^\s{4}resolves_to:\s*([a-z0-9-]+)/m) || [])[1] || ''];
  }));

  check('roles: launcher logical role set 精确为四个注册名',
    same(sorted(LOGICAL_ROLES), sorted(EXACT_ROLES)),
    `actual=${JSON.stringify(LOGICAL_ROLES)}`);
  check('roles: launcher ROLE_CONTRACT 名字/路径/tier 精确',
    same(ROLE_CONTRACT, EXPECTED), `actual=${JSON.stringify(ROLE_CONTRACT)}`);
  check('roles: model-routing logical_roles 精确为四个注册名',
    same(sorted(Object.keys(logical)), sorted(EXACT_ROLES)),
    `actual=${JSON.stringify(logical)}`);

  const projectionErrors = [];
  for (const role of EXACT_ROLES) {
    const tier = EXPECTED[role].tier;
    if (logical[role] !== tier) projectionErrors.push(`${role}:logical=${logical[role] || '缺失'}≠${tier}`);
    if (claudeProjection[role] !== tierAlias[tier]) {
      projectionErrors.push(`${role}:claude=${claudeProjection[role] || '缺失'}≠tier.${tier}=${tierAlias[tier] || '缺失'}`);
    }
    if (codexProjection[role] !== tierEffort[tier]) {
      projectionErrors.push(`${role}:codex=${codexProjection[role] || '缺失'}≠tier.${tier}=${tierEffort[tier] || '缺失'}`);
    }
  }
  check('roles: logical tier 与 Claude alias / Codex effort 投影同源',
    projectionErrors.length === 0, projectionErrors.join(', '));

  const claudeDir = join(ROOT, '.claude', 'agents');
  const claudeNames = new Map();
  for (const file of readdirSync(claudeDir).filter((name) => name.endsWith('.md'))) {
    const text = readFileSync(join(claudeDir, file), 'utf8');
    if (!text.startsWith('---\n')) continue;
    const end = text.indexOf('\n---\n', 4);
    const name = end < 0 ? '' : (text.slice(4, end).match(/^name:\s*([^\s#]+)/m) || [])[1];
    if (name) claudeNames.set(name, [...(claudeNames.get(name) || []), file]);
  }
  const codexDir = join(ROOT, '.codex', 'agents');
  const codexNames = new Map();
  for (const file of readdirSync(codexDir).filter((name) => name.endsWith('.toml'))) {
    const text = readFileSync(join(codexDir, file), 'utf8');
    const name = (text.match(/^name\s*=\s*"([^"]+)"/m) || [])[1];
    if (name) codexNames.set(name, [...(codexNames.get(name) || []), file]);
  }
  const registrationErrors = [];
  for (const role of EXACT_ROLES) {
    const claudeFile = EXPECTED[role].claude.split('/').at(-1);
    const codexFile = EXPECTED[role].codex.split('/').at(-1);
    if (!same(claudeNames.get(role) || [], [claudeFile])) registrationErrors.push(`${role}:Claude=${claudeNames.get(role) || '缺失'}`);
    if (!same(codexNames.get(role) || [], [codexFile])) registrationErrors.push(`${role}:Codex=${codexNames.get(role) || '缺失'}`);
  }
  check('roles: Claude/Codex 四个精确注册名各有且仅有一份定义',
    registrationErrors.length === 0, registrationErrors.join(', '));

  const hashManifest = {};
  const hashErrors = [];
  for (const harness of ['claude', 'codex']) {
    hashManifest[harness] = {};
    for (const role of EXACT_ROLES) {
      try {
        const resolved = resolveRole({ root: ROOT, role, harness });
        const expectedPath = EXPECTED[role][harness];
        const diskHash = sha256(readFileSync(join(ROOT, expectedPath)));
        hashManifest[harness][role] = diskHash;
        if (resolved.definition_path !== expectedPath) hashErrors.push(`${harness}/${role}:path=${resolved.definition_path}`);
        if (resolved.definition_sha256 !== diskHash) hashErrors.push(`${harness}/${role}:hash mismatch`);
        if (diskHash !== EXPECTED_HASHES[harness][role]) hashErrors.push(`${harness}/${role}:unpinned-bytes=${diskHash}`);
        if (resolved.tier !== EXPECTED[role].tier) hashErrors.push(`${harness}/${role}:tier=${resolved.tier}`);
      } catch (error) {
        hashErrors.push(`${harness}/${role}:${error.message}`);
      }
    }
  }
  const hashes = Object.values(hashManifest).flatMap((roles) => Object.values(roles));
  if (hashes.length !== 8 || new Set(hashes).size !== 8 || hashes.some((hash) => !/^[a-f0-9]{64}$/.test(hash))) {
    hashErrors.push(`hash-set=count:${hashes.length}/unique:${new Set(hashes).size}`);
  }
  check('roles: 八份定义 bytes 的 SHA-256 与 launcher 解析精确一致',
    hashErrors.length === 0, hashErrors.join(', '));
  console.log(`ROLE_DEFINITION_HASHES ${JSON.stringify(hashManifest)}`);

  const template = readFileSync(join(ROOT, '.claude', 'agents', 'work-agent-template.md'), 'utf8');
  check('roles: work-agent-template 保持未注册且无 Codex 同名 adapter',
    !template.startsWith('---\n')
      && !existsSync(join(ROOT, '.codex', 'agents', 'work-agent-template.toml'))
      && /\b不注册为 subagent\b|不注册为 subagent/.test(template),
    '模板不得带 frontmatter/同名 TOML，也不得成为 dispatch 目标');

  // 只扫可执行 role call graph，不扫历史审计档：role 定义、orchestrator、
  // 引用四 role 之一的 first-class skill、workflow 源和其 Codex runner。
  const callGraphFiles = new Set([
    '.claude/agents/orchestrator.md',
    '.claude/agents/work-agent-template.md',
    '.codex/workflow-runner.mjs',
    'scripts/agent-launcher.mjs',
    ...Object.values(EXPECTED).flatMap((entry) => [entry.claude, entry.codex]),
  ]);
  const skillRoot = join(ROOT, '.claude', 'skills', 'office');
  const rolePattern = /\b(?:plan-agent|work-agent|oracle|quality-gate)\b/i;
  for (const entry of readdirSync(skillRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const rel = `.claude/skills/office/${entry.name}/SKILL.md`;
    if (existsSync(join(ROOT, rel)) && rolePattern.test(readFileSync(join(ROOT, rel), 'utf8'))) callGraphFiles.add(rel);
  }
  const workflowRoot = join(ROOT, '.claude', 'workflows');
  if (existsSync(workflowRoot)) for (const file of readdirSync(workflowRoot).filter((name) => name.endsWith('.js'))) {
    callGraphFiles.add(`.claude/workflows/${file}`);
  }
  const lineup = ((routing.match(/^known_lineup:\s*\[([^\]]+)\]/m) || [])[1] || '')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  const forbiddenAliases = [...new Set(['fable', 'opus', 'sonnet', 'haiku', ...lineup])];
  const aliasPattern = new RegExp(`\\b(?:${forbiddenAliases.join('|')})\\b`, 'gi');
  const aliasLeaks = [];
  for (const rel of sorted(callGraphFiles)) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    const lines = text.split('\n');
    const skill = /^\.claude\/skills\/office\/[^/]+\/SKILL\.md$/.test(rel);
    const hits = [];
    for (let i = 0; i < lines.length; i++) {
      aliasPattern.lastIndex = 0;
      const found = [...lines[i].matchAll(aliasPattern)];
      if (!found.length) continue;
      // Skill prose may cite a routing example/history without making a dispatch decision.  A
      // direct pin is an alias on/near a role call, dispatch/spawn instruction, model field, or
      // recommended-model declaration.  Core definitions/orchestrator/runner/workflows are all
      // executable dispatch surfaces, so any alias in those files remains a hard failure.
      const window = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
      const direct = !skill
        || rolePattern.test(window)
        || /\brecommended-model\b|\b(?:subagent_type|agent_type)\b|\b(?:dispatch|spawn)\b|\bmodel\s*[:=]/i.test(window);
      if (direct) hits.push(...found.map((m) => `${m[0]}@${i + 1}`));
    }
    if (hits.length) aliasLeaks.push(`${rel}:${hits.join(',')}`);
  }
  check('roles: 可执行 role call graph 不在 model-routing.yaml 之外直写模型 alias',
    aliasLeaks.length === 0, aliasLeaks.join(' | '));

  const runner = readFileSync(join(ROOT, '.codex', 'workflow-runner.mjs'), 'utf8');
  const activationPath = join(ROOT, '.claude', 'skill-os', 'native-agent-activation.json');
  let activation;
  try { activation = JSON.parse(readFileSync(activationPath, 'utf8')); } catch { activation = null; }
  const activationExact = exactKeys(activation, ACTIVATION_KEYS)
    && activation.schema_version === 'luca.native-agent-activation.v1'
    && ['DORMANT', 'ACTIVE'].includes(activation.status);
  check('roles: native route activation state 精确且 fail-closed', activationExact,
    activation ? `status=${activation.status}` : 'missing/invalid activation state');
  const substitutionErrors = [];
  if (!/forbiddenClaims\s*=\s*\[[^\]]*agent_type[^\]]*subagent_type[^\]]*logical_role[^\]]*receipt[^\]]*evidence[^\]]*\]/s.test(runner)
      || !/Object\.hasOwn\(opts, key\)/.test(runner)
      || !/runner 不能证明 native role\/receipt/.test(runner)) {
    substitutionErrors.push('workflow-runner 未 fail-closed 拒绝 role/evidence claim');
  }
  const routeSurfaces = collectNativeRouteSurfaces(ROOT);
  if (activationExact) substitutionErrors.push(...findNativeRouteBypasses({
    activationStatus: activation.status,
    surfaces: routeSurfaces,
  }));
  if (activationExact && activation.status === 'DORMANT') {
    if (activation.proof_receipt_path !== null || activation.proof_receipt_sha256 !== null
      || activation.activated_at !== null) substitutionErrors.push('DORMANT state 携带伪 proof/activation 数据');
  } else if (activationExact) {
    for (const role of EXACT_ROLES) {
      const routeGate = verifyNativeRouteActivation({ root: ROOT, role });
      if (!routeGate.authorized) {
        substitutionErrors.push(`ACTIVE state ${role} 未绑定 approved live proof: ${routeGate.code}`);
      }
    }
  }
  check('roles: generic agent / root reasoning / Workflow runner 不得替代 native role',
    substitutionErrors.length === 0, substitutionErrors.join(' | '));
}

console.log(`\n=== check-agents-parity summary: PASS=${pass} FAIL=${fail} ===`);
return fail ? 1 : 0;
}

function main(argv) {
  const gateIndex = argv.indexOf('--native-route-gate');
  if (gateIndex >= 0) {
    if (argv.length !== 2 || gateIndex !== 0 || typeof argv[1] !== 'string') {
      process.stderr.write('NATIVE_ROLE_ROUTE_BLOCKED INVALID_INVOCATION unknown\n');
      return 4;
    }
    const result = verifyNativeRouteActivation({ role: argv[1] });
    if (!result.authorized) {
      process.stderr.write(`NATIVE_ROLE_ROUTE_BLOCKED ${result.code} ${argv[1]}\n`);
      return 4;
    }
    if (result.code === 'EXISTING_ROUTE_UNGATED') {
      process.stdout.write(`NATIVE_ROLE_ROUTE_EXISTING_UNGATED ${argv[1]}\n`);
      return 0;
    }
    process.stdout.write(`NATIVE_ROLE_ROUTE_AUTHORIZED ${argv[1]} ${result.proof_receipt_sha256}\n`);
    return 0;
  }
  if (argv.length) {
    process.stderr.write('usage: check-agents-parity.mjs [--native-route-gate ROLE]\n');
    return 2;
  }
  return runParityChecks();
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(SELF)) {
  process.exitCode = main(process.argv.slice(2));
}
