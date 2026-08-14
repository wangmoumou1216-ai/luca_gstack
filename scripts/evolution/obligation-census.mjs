#!/usr/bin/env node
/**
 * REX U-009 obligation census.
 *
 * The repository source denominator is selected from a frozen manifest and an
 * exact commit.  The census stores pointers and hashes only; source prose stays
 * in its canonical file.  Live route targets are a separate, read-only census.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  humanGateSlots,
  validateHumanGateBinding,
  validateHumanGateProposal,
  verifyHumanGateChain,
} from '../../.claude/hooks/lib/human-gate-contract.mjs';

const SELF = realpathSync(fileURLToPath(import.meta.url));
const SOURCE_ROOT = realpathSync(resolve(dirname(SELF), '../..'));
const PLAN_ID = 'REX-20260811-001';
const HASH_RE = /^[a-f0-9]{64}$/;
const COMMIT_RE = /^[a-f0-9]{40}$/;
const CLASSES = Object.freeze([
  'S0_MACHINE_SAFETY',
  'S1_ROUTING_DISPATCH',
  'S2_COMPLETION_QUALITY',
  'S3_HUMAN_TASTE',
  'S4_NATIVE_CAPABILITY',
  'UNKNOWN',
]);
const RECORD_KEYS = Object.freeze([
  'id', 'source_pointer', 'source_anchor_hash', 'class', 'trigger', 'harnesses',
  'executor', 'activation_probe', 'verifier', 'mutant_ids', 'receipt_kind',
  'degradation_code', 'owner', 'classification_basis', 'review_state',
  'native_status', 'enforcement',
]);
const APPROVAL_KEYS = Object.freeze([
  'gate', 'candidate_sha256', 'source_manifest_sha256', 'live_target_census_sha256',
  'gate_payload_sha256', 'execution_envelope_sha256', 'proposal_id',
  'proposal_sha256', 'binding_id', 'binding_sha256', 'target_commit', 'target_tree',
]);
const POST_STATE_KEYS = Object.freeze([
  'schema_version', 'plan_id', 'gate', 'target_commit', 'target_tree',
  'candidate_sha256', 'approved_census_sha256', 'source_manifest_sha256',
  'live_target_census_sha256', 'gate_payload_sha256',
  'execution_envelope_sha256', 'proposal_id', 'proposal_sha256', 'binding_id',
  'binding_sha256', 'counts',
]);
const IMPLEMENTATION_RECEIPT_KEYS = Object.freeze([
  'schema_version', 'plan_id', 'unit', 'gate', 'status', 'target_commit',
  'target_tree', 'approved_slot', 'post_state_slot', 'candidate_sha256',
  'approved_census_sha256', 'post_state_sha256', 'proposal_id',
  'proposal_sha256', 'binding_id', 'binding_sha256', 'gate_result_id',
  'gate_result_sha256', 'counts',
]);
const POST_COUNT_KEYS = Object.freeze([
  'sources', 'anchors', 'obligations', 'unknown', 'missing_wiring',
  'native_impossible', 'degraded',
]);
const EXECUTION_GUARD_KEYS = Object.freeze([
  'head_commit', 'head_tree', 'tracked_diff_sha256', 'tracked_diff_bytes',
  'canonical_source_count', 'canonical_source_worktree_sha256',
  'runtime_trees', 'allowed_repo_mutations',
]);
const RUNTIME_GUARD_PATHS = Object.freeze([
  '.claude/hooks', '.codex', '.agents/skills', 'scripts/evolution',
]);
const APPROVED_SLOT = 'obligation-census/approved.json';
const POST_STATE_SLOT = 'obligation-census/post-state.json';
const IMPLEMENTATION_RECEIPT_SLOT = 'obligation-census/implementation-receipt.json';
const MARKERS = Object.freeze([
  ['MUST_UPPER', /\bMUST\b/u],
  ['SHALL_UPPER', /\bSHALL\b/u],
  ['REQUIRED_UPPER', /\bREQUIRED\b/u],
  ['NEVER_UPPER', /\bNEVER\b/u],
  ['DO_NOT_UPPER', /\bDO NOT\b/u],
  ['MUST_LOWER', /\bmust\b/u],
  ['SHALL_LOWER', /\bshall\b/u],
  ['REQUIRED_LOWER', /\brequired\b/u],
  ['NEVER_LOWER', /\bnever\b/u],
  ['DO_NOT_LOWER', /\bdo not\b/u],
  ['SHOULD_UPPER', /\bSHOULD\b/u],
  ['SHOULD_LOWER', /\bshould\b/u],
  ['CANNOT', /\bcannot\b/iu],
  ['MAY_NOT', /\bmay not\b/iu],
  ['ZH_MUST', /必须/u],
  ['ZH_MUST_NOT', /不得/u],
  ['ZH_FORBID', /禁止/u],
  ['ZH_STRICT_FORBID', /严禁/u],
  ['ZH_CANNOT', /不可/u],
  ['ZH_ENSURE', /务必/u],
  ['ZH_ONLY', /只能/u],
  ['ZH_SHOULD', /应当/u],
  ['ZH_DO_NOT', /不要/u],
  ['ZH_SHOULD_NOT', /不应/u],
  ['ZH_CANNOT', /不能/u],
  ['ZH_NOT_ALLOWED', /不允许/u],
  ['ZH_NEED', /需要/u],
  ['ZH_RED_LINE', /红线/u],
  ['IRON_LAW', /Iron Law/iu],
]);

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sortedValue(value) {
  if (Array.isArray(value)) return value.map(sortedValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortedValue(value[key])]));
  }
  return value;
}

export const jsonBytes = (value) => Buffer.from(`${JSON.stringify(sortedValue(value), null, 2)}\n`, 'utf8');
export const objectHash = (value) => sha256(Buffer.from(stable(value), 'utf8'));
const fail = (message) => { throw new Error(message); };
const within = (parent, child) => child === parent || child.startsWith(`${parent}${sep}`);

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (stable(actual) !== stable(wanted)) fail(`${label} keys must be exactly ${wanted.join(',')}`);
}

function safeRepoPath(value, label = 'repository path') {
  if (typeof value !== 'string' || !value || value.startsWith('/') || value.includes('\\')
    || value.includes('\0') || value.endsWith('/')
    || value.split('/').some((part) => !part || part === '.' || part === '..')) {
    fail(`${label} is unsafe: ${String(value)}`);
  }
  return value;
}

function cleanGitEnv() {
  const env = { ...process.env, GIT_NO_REPLACE_OBJECTS: '1', GIT_OPTIONAL_LOCKS: '0' };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_') && !['GIT_NO_REPLACE_OBJECTS', 'GIT_OPTIONAL_LOCKS'].includes(key)) delete env[key];
  return env;
}

function git(root, args, label, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, {
    cwd: root,
    env: cleanGitEnv(),
    input: '',
    maxBuffer: 128 * 1024 * 1024,
  });
  if (!allowFailure && result.status !== 0) fail(`${label} failed: ${String(result.stderr || result.stdout).trim()}`);
  return result;
}

function rejectReplacementRefs(root) {
  const refs = git(root, ['for-each-ref', '--format=%(refname)', 'refs/replace'], 'replacement ref scan')
    .stdout.toString('utf8').trim();
  if (refs) fail(`replacement refs are forbidden: ${refs.replace(/\s+/g, ',')}`);
}

export function resolveTargetCommit(root, requested) {
  const physical = realpathSync(resolve(root));
  rejectReplacementRefs(physical);
  const commit = git(physical, ['rev-parse', '--verify', `${requested}^{commit}`], 'target commit resolution')
    .stdout.toString('utf8').trim();
  if (!COMMIT_RE.test(commit)) fail('target commit did not resolve to one exact commit');
  const tree = git(physical, ['rev-parse', '--verify', `${commit}^{tree}`], 'target tree resolution')
    .stdout.toString('utf8').trim();
  if (!COMMIT_RE.test(tree)) fail('target tree is invalid');
  return { root: physical, commit, tree };
}

function parseTree(bytes, label) {
  if (!bytes.length) return [];
  return bytes.toString('utf8').split('\0').filter(Boolean).map((record) => {
    const match = record.match(/^(\d{6}) ([a-z]+) ([a-f0-9]{40})\t(.+)$/s);
    if (!match) fail(`${label} emitted malformed tree data`);
    return { mode: match[1], type: match[2], object_id: match[3], path: safeRepoPath(match[4], label) };
  });
}

function treeEntries(root, commit, path, label) {
  return parseTree(git(root, ['ls-tree', '-r', '-z', commit, '--', path], label).stdout, label);
}

function exactBlob(root, commit, path) {
  safeRepoPath(path);
  const entries = parseTree(git(root, ['ls-tree', '-z', commit, '--', path], `ls-tree ${path}`).stdout, `ls-tree ${path}`);
  if (entries.length !== 1 || entries[0].path !== path || entries[0].type !== 'blob'
    || !['100644', '100755'].includes(entries[0].mode)) fail(`source is not one regular tracked blob: ${path}`);
  const bytes = git(root, ['cat-file', 'blob', entries[0].object_id], `cat-file ${path}`).stdout;
  return { ...entries[0], bytes, sha256: sha256(bytes) };
}

function validateBaseline(baseline) {
  exactKeys(baseline, ['schema_version', 'plan_id', 'purpose', 'generation_rules', 'selection', 'exclusions', 'resolved_count', 'resolved'], 'baseline source manifest');
  if (baseline.schema_version !== 1 || baseline.plan_id !== PLAN_ID || !Array.isArray(baseline.generation_rules)
    || !Array.isArray(baseline.exclusions) || !Array.isArray(baseline.resolved)
    || baseline.resolved_count !== baseline.resolved.length) fail('baseline source manifest identity/count mismatch');
  exactKeys(baseline.selection, ['fixed', 'dynamic'], 'baseline selection');
  if (!Array.isArray(baseline.selection.fixed) || !Array.isArray(baseline.selection.dynamic)) fail('baseline selection is malformed');
  const paths = new Set();
  for (const row of baseline.resolved) {
    exactKeys(row, ['path', 'sha256'], 'baseline resolved row');
    safeRepoPath(row.path);
    if (!HASH_RE.test(row.sha256) || paths.has(row.path)) fail('baseline resolved row is invalid or duplicate');
    paths.add(row.path);
  }
  return baseline;
}

function dynamicMatches(rule, entry) {
  if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) return false;
  const rel = entry.path.slice(`${rule.root}/`.length);
  if (!rel || rel === entry.path) return false;
  if (rule.mode === 'all_files_recursive') return true;
  if (rule.mode === 'extensions_recursive') return rule.extensions.includes(extname(entry.path));
  if (rule.mode === 'basename_recursive') return basename(entry.path) === rule.basename;
  if (rule.mode === 'top_level_allowlist_and_extensions') {
    return !rel.includes('/') && (rule.allow.includes(rel) || rule.extensions.includes(extname(rel)));
  }
  fail(`unknown source selection mode: ${rule.mode}`);
}

export function recomputeSourceManifest({ root, targetCommit, baseline, baselineSha256 = sha256(jsonBytes(baseline)) }) {
  validateBaseline(baseline);
  if (!HASH_RE.test(baselineSha256)) fail('baseline source manifest hash is invalid');
  const target = resolveTargetCommit(root, targetCommit);
  const selected = new Set();
  for (const path of baseline.selection.fixed) {
    safeRepoPath(path, 'fixed source path');
    exactBlob(target.root, target.commit, path);
    selected.add(path);
  }
  for (const rule of baseline.selection.dynamic) {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) fail('dynamic source rule must be an object');
    safeRepoPath(rule.root, 'dynamic source root');
    const entries = treeEntries(target.root, target.commit, rule.root, `dynamic source scan ${rule.root}`);
    for (const entry of entries) if (dynamicMatches(rule, entry)) selected.add(entry.path);
  }
  const resolved = [...selected].sort().map((path) => {
    const blob = exactBlob(target.root, target.commit, path);
    return { path, sha256: blob.sha256 };
  });
  return {
    schema_version: 2,
    plan_id: PLAN_ID,
    purpose: baseline.purpose,
    baseline_manifest_sha256: baselineSha256,
    target_commit: target.commit,
    target_tree: target.tree,
    generation_rules: baseline.generation_rules,
    selection: baseline.selection,
    exclusions: baseline.exclusions,
    resolved_count: resolved.length,
    resolved,
  };
}

export function sourceDelta(baseline, effective) {
  validateBaseline(baseline);
  const before = new Map(baseline.resolved.map((row) => [row.path, row.sha256]));
  const after = new Map(effective.resolved.map((row) => [row.path, row.sha256]));
  const added = [...after].filter(([path]) => !before.has(path)).map(([path, value]) => ({ path, sha256: value }));
  const removed = [...before].filter(([path]) => !after.has(path)).map(([path, value]) => ({ path, sha256: value }));
  const hashChanged = [...after].filter(([path, value]) => before.has(path) && before.get(path) !== value)
    .map(([path, value]) => ({ path, before_sha256: before.get(path), after_sha256: value }));
  return {
    schema_version: 1,
    plan_id: PLAN_ID,
    status: added.length || removed.length || hashChanged.length ? 'SOURCE_SET_DRIFT' : 'NO_SOURCE_SET_DRIFT',
    baseline_manifest_sha256: effective.baseline_manifest_sha256,
    effective_manifest_sha256: sha256(jsonBytes(effective)),
    target_commit: effective.target_commit,
    target_tree: effective.target_tree,
    baseline_count: baseline.resolved_count,
    effective_count: effective.resolved_count,
    added,
    removed,
    hash_changed: hashChanged,
  };
}

function markerKinds(line) {
  const kinds = MARKERS.filter(([, pattern]) => pattern.test(line)).map(([kind]) => kind);
  if (/^\s*(?:[-*+]|[1-9][0-9]*[.)])\s+(?:use|read|run|ask|keep|do|never|always|prefer|treat|write|return|verify|load|check|stop|avoid|preserve|apply|follow|require|route|create|record|report|ensure|reject|refuse|only)\b/iu.test(line)
    || /^\s*(?:[-*+]|[1-9][0-9]*[.)])\s*(?:先|使用|读取|运行|询问|保持|写入|返回|验证|加载|检查|停止|避免|遵守|执行|记录|报告|确保|拒绝)/u.test(line)) {
    kinds.push('IMPERATIVE_LIST_ITEM');
  }
  return [...new Set(kinds)];
}

function classification(path, line) {
  const value = `${path}\n${line}`.toLowerCase();
  const test = (pattern) => pattern.test(value);
  if (test(/approve|approval|human gate|top-level user|ask (?:the )?user|user (?:chooses|decides|confirms)|用户.{0,12}(?:批准|选择|决定|确认)|人类门|人工门|顶层.{0,8}(?:用户|回复)|偏好|platform choice|scope choice|remote choice|激活.{0,8}批准/u)) {
    return ['S3_HUMAN_TASTE', 'HUMAN_CHOICE'];
  }
  if (test(/project isolation|project-scope|session-project|stable memory|promotion|promoted-facts|candidate→review|candidate->review|git (?:reset|clean|push|pull|rebase|stash|stage)|dangerous git|global target|resolver containment|fail-closed|项目隔离|项目身份|稳定记忆|晋升|危险.{0,8}git|全局.{0,8}(?:写|target)|解析器.{0,8}隔离|不可发现备份/u)) {
    return ['S0_MACHINE_SAFETY', test(/memory|promotion|promoted|记忆|晋升/u) ? 'STABLE_MEMORY' : test(/resolver|解析器/u) ? 'RESOLVER_CONTAINMENT' : test(/git|global|全局/u) ? 'GIT_GLOBAL' : 'PROJECT_ISOLATION'];
  }
  if (path.includes('codex-viability.yaml') || path.includes('capability-parity.json')
    || test(/slash|widget|native capability|workflow tool|sandbox event|event name|harness difference|codex.{0,40}(?:能力|不支持|无对应|降级|degrad|tier|tool|event|sandbox)|claude.{0,40}codex|fanout|mcp.{0,12}(?:能力|绑定|server)|原生.{0,8}(?:能力|事件)|沙箱.{0,8}(?:事件|差异)|斜杠|结构化提问工具/u)) {
    return ['S4_NATIVE_CAPABILITY', test(/slash|斜杠/u) ? 'SLASH' : test(/workflow/u) ? 'WORKFLOW' : test(/widget|提问工具/u) ? 'WIDGET' : test(/sandbox|沙箱|event|事件/u) ? 'SANDBOX_EVENT' : 'HARNESS_CAPABILITY'];
  }
  if (test(/project gate|plan agent|route-guard|routing|route |dispatch|skill routing|agent dispatch|项目门|项目 gate|路由|派发|分派/u)) {
    return ['S1_ROUTING_DISPATCH', test(/project gate|项目门|项目 gate/u) ? 'PROJECT_GATE' : test(/plan agent/u) ? 'PLAN' : 'DISPATCH'];
  }
  return ['S2_COMPLETION_QUALITY', test(/handoff|交接/u) ? 'HANDOFF' : test(/read order|read.*first|先读|完整读取|读序/u) ? 'READ_ORDER' : test(/done|完成|终态/u) ? 'DONE' : 'QUALITY'];
}

function classContract(className) {
  const contracts = {
    S0_MACHINE_SAFETY: ['MECHANICAL_DUAL_HARNESS', 'machine-safety'],
    S1_ROUTING_DISPATCH: ['DETERMINISTIC_ROUTE_LIVE_TRACE', 'routing-dispatch'],
    S2_COMPLETION_QUALITY: ['INVOCATION_LEDGER', 'completion-quality'],
    S3_HUMAN_TASTE: ['HUMAN_GATE', 'human-taste'],
    S4_NATIVE_CAPABILITY: ['CAPABILITY_CENSUS_LIVE_EVIDENCE', 'native-capability'],
    UNKNOWN: ['UNRESOLVED', 'unassigned'],
  };
  return contracts[className];
}

function sourceBlob(root, commit, path, expectedSha) {
  const blob = exactBlob(root, commit, path);
  if (blob.sha256 !== expectedSha) fail(`source manifest hash mismatch for ${path}`);
  return blob.bytes;
}

export function extractSourceAnchors({ root, effective }) {
  const target = resolveTargetCommit(root, effective.target_commit);
  if (target.tree !== effective.target_tree) fail('effective manifest target tree drift');
  const coverage = [];
  const anchors = [];
  const obligations = [];
  for (const source of effective.resolved) {
    const bytes = sourceBlob(target.root, target.commit, source.path, source.sha256);
    const text = bytes.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(bytes)) fail(`source is not canonical UTF-8: ${source.path}`);
    const lines = text.split('\n');
    let count = 0;
    for (let index = 0; index < lines.length; index += 1) {
      const kinds = markerKinds(lines[index]);
      if (!kinds.length) continue;
      count += 1;
      const pointer = `${source.path}#L${index + 1}`;
      const textSha = sha256(Buffer.from(lines[index], 'utf8'));
      const anchorHash = objectHash({ path: source.path, file_sha256: source.sha256, line: index + 1, text_sha256: textSha });
      const id = `OBL-${sha256(Buffer.from(`${pointer}\0${anchorHash}`, 'utf8')).slice(0, 20).toUpperCase()}`;
      const [className, basis] = classification(source.path, lines[index]);
      const [enforcement, owner] = classContract(className);
      const obligation = {
        id,
        source_pointer: pointer,
        source_anchor_hash: anchorHash,
        class: className,
        trigger: { kind: 'SOURCE_NORMATIVE_MARKER', markers: kinds },
        harnesses: ['claude', 'codex'],
        executor: null,
        activation_probe: null,
        verifier: null,
        mutant_ids: ['MUT-SOURCE-POINTER-REMOVED', `MUT-${className}-CONTRACT`],
        receipt_kind: 'OBLIGATION_LEDGER_ENTRY',
        degradation_code: null,
        owner,
        classification_basis: basis,
        review_state: 'PROPOSED',
        native_status: 'MISSING_WIRING',
        enforcement,
      };
      anchors.push({
        source_pointer: pointer,
        source_anchor_hash: anchorHash,
        disposition: 'OBLIGATION',
        obligation_id: id,
      });
      obligations.push(obligation);
    }
    coverage.push({
      path: source.path,
      file_sha256: source.sha256,
      anchor_count: count,
      disposition: count ? 'OBLIGATIONS_FOUND' : 'NO_NORMATIVE_MARKER_FOUND',
      review_state: 'MACHINE_EXTRACTED_CANDIDATE',
    });
  }
  return { coverage, anchors, obligations };
}

function summaryFor(coverage, obligations) {
  const classes = Object.fromEntries(CLASSES.map((name) => [name, obligations.filter((row) => row.class === name).length]));
  const native = {};
  for (const row of obligations) native[row.native_status] = (native[row.native_status] || 0) + 1;
  return {
    source_count: coverage.length,
    source_with_obligations: coverage.filter((row) => row.anchor_count > 0).length,
    source_without_normative_markers: coverage.filter((row) => row.anchor_count === 0).length,
    anchor_count: obligations.length,
    obligation_count: obligations.length,
    class_counts: classes,
    unknown_count: classes.UNKNOWN,
    native_status_counts: native,
  };
}

export function generateCandidate({ root, effective, liveTargets }) {
  const extracted = extractSourceAnchors({ root, effective });
  return {
    schema_version: 'luca.obligation-census.v1',
    plan_id: PLAN_ID,
    kind: 'CANDIDATE',
    approval_state: 'PENDING_G_OBLIGATION_SCOPE',
    target_commit: effective.target_commit,
    target_tree: effective.target_tree,
    source_manifest_sha256: sha256(jsonBytes(effective)),
    live_target_census_sha256: sha256(jsonBytes(liveTargets)),
    source_coverage: extracted.coverage,
    anchors: extracted.anchors,
    obligations: extracted.obligations,
    summary: summaryFor(extracted.coverage, extracted.obligations),
  };
}

export function classificationReport({ candidate, delta, liveTargets }) {
  const missingRoutes = [];
  const containedRoutes = [];
  const disabledRoutes = [];
  for (const route of liveTargets.routes) for (const harness of ['claude', 'codex']) {
    const finding = { route_id: route.id, declaration_pointer: route.declaration_pointer, harness, state: route[harness].state };
    if (route[harness].state === 'MISSING_WIRING') missingRoutes.push(finding);
    if (route[harness].state === 'CONTAINED_FAIL_CLOSED') containedRoutes.push(finding);
    if (route[harness].state === 'DISABLED_BY_OVERRIDE') disabledRoutes.push(finding);
  }
  return {
    schema_version: 'luca.obligation-classification-report.v1',
    plan_id: PLAN_ID,
    candidate_sha256: sha256(jsonBytes(candidate)),
    source_delta_sha256: sha256(jsonBytes(delta)),
    target_commit: candidate.target_commit,
    target_tree: candidate.target_tree,
    source_delta_status: delta.status,
    source_delta_counts: {
      added: delta.added.length,
      removed: delta.removed.length,
      hash_changed: delta.hash_changed.length,
    },
    live_target_findings: {
      missing_wiring_routes: missingRoutes,
      contained_fail_closed_routes: containedRoutes,
      disabled_by_override_routes: disabledRoutes,
      anomalies: liveTargets.anomalies,
    },
    class_counts: candidate.summary.class_counts,
    unknown_ids: candidate.obligations.filter((row) => row.class === 'UNKNOWN').map((row) => row.id),
    missing_wiring_ids: candidate.obligations.filter((row) => row.native_status === 'MISSING_WIRING').map((row) => row.id),
    native_impossible_ids: candidate.obligations.filter((row) => row.native_status === 'NATIVE_IMPOSSIBLE').map((row) => row.id),
    degraded_ids: candidate.obligations.filter((row) => row.degradation_code !== null).map((row) => row.id),
    source_dispositions: {
      obligations_found: candidate.source_coverage.filter((row) => row.disposition === 'OBLIGATIONS_FOUND').length,
      no_normative_marker_found: candidate.source_coverage.filter((row) => row.disposition === 'NO_NORMATIVE_MARKER_FOUND').length,
    },
    decision: candidate.summary.unknown_count === 0 ? 'READY_FOR_SCOPE_PROPOSAL' : 'BLOCKED_UNKNOWN_CLASSIFICATION',
    caveat: 'MISSING_WIRING is an explicit census result, not DEGRADED or PASS; enforcement is implemented after scope approval.',
  };
}

function fileMode(stat) {
  return (stat.mode & 0o7777).toString(8).padStart(4, '0');
}

function treeRows(path, base = path, seen = new Set()) {
  const stat = lstatSync(path);
  const rel = relative(base, path) || '.';
  if (stat.isSymbolicLink()) return [{ path: rel, type: 'symlink', mode: fileMode(stat), payload: readlinkSync(path) }];
  if (stat.isFile()) return [{ path: rel, type: 'file', mode: fileMode(stat), payload: sha256(readFileSync(path)) }];
  if (!stat.isDirectory()) fail(`live target contains special entry: ${path}`);
  const identity = `${stat.dev}:${stat.ino}`;
  if (seen.has(identity)) fail(`live target directory cycle: ${path}`);
  seen.add(identity);
  const rows = [{ path: rel, type: 'directory', mode: fileMode(stat), payload: null }];
  for (const name of readdirSync(path).sort()) rows.push(...treeRows(join(path, name), base, seen));
  seen.delete(identity);
  return rows;
}

function targetDescriptor(path, repoRoot) {
  const lexical = resolve(path);
  let stat;
  try { stat = lstatSync(lexical); }
  catch (error) {
    if (error?.code === 'ENOENT') return { lexical_path: lexical, entry_type: 'absent', mode: null, link_text: null, real_path: null, canonical_target: null, tree_sha256: null };
    throw error;
  }
  const entryType = stat.isSymbolicLink() ? 'symlink' : stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'special';
  if (entryType === 'special') fail(`live target is a special entry: ${lexical}`);
  const linkText = entryType === 'symlink' ? readlinkSync(lexical) : null;
  let real;
  try { real = realpathSync(lexical); }
  catch (error) {
    if (entryType === 'symlink' && error?.code === 'ENOENT') {
      return { lexical_path: lexical, entry_type: 'broken_symlink', mode: fileMode(stat), link_text: linkText, real_path: null, canonical_target: null, tree_sha256: null };
    }
    throw error;
  }
  const canonicalTarget = within(repoRoot, real) ? relative(repoRoot, real) : real;
  return {
    lexical_path: lexical,
    entry_type: entryType,
    mode: fileMode(stat),
    link_text: linkText,
    real_path: real,
    canonical_target: canonicalTarget,
    tree_sha256: objectHash(treeRows(real)),
  };
}

function catalogDescriptor(path, repoRoot) {
  const root = resolve(path);
  if (!existsSync(root)) return { root, state: 'ABSENT', entries: [], catalog_sha256: objectHash([]) };
  const stat = lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`catalog root must be a real directory: ${root}`);
  const entries = readdirSync(root).sort().map((name) => ({ name, ...targetDescriptor(join(root, name), repoRoot) }));
  return { root: realpathSync(root), state: 'PRESENT', entries, catalog_sha256: objectHash(entries) };
}

function parseJsonFile(path, label) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch (error) { fail(`${label} is not valid JSON: ${error.message}`); }
}

function commandJson(command, args, label) {
  const result = spawnSync(command, args, { input: '', encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) return { state: 'COMMAND_UNAVAILABLE', error_sha256: sha256(Buffer.from(String(result.stderr || result.stdout), 'utf8')), value: null };
  try { return { state: 'CAPTURED', error_sha256: null, value: JSON.parse(result.stdout) }; }
  catch { return { state: 'MALFORMED_OUTPUT', error_sha256: sha256(Buffer.from(result.stdout, 'utf8')), value: null }; }
}

function normalizedClaudePlugins(value, repoRoot) {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const installPath = typeof row.installPath === 'string' ? row.installPath : null;
    return {
      id: String(row.id || ''),
      version: String(row.version || ''),
      scope: String(row.scope || ''),
      enabled: row.enabled === true,
      install_target: installPath ? targetDescriptor(installPath, repoRoot) : null,
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

function normalizedCodexPlugins(value, repoRoot) {
  const installed = Array.isArray(value?.installed) ? value.installed : [];
  return installed.map((row) => {
    const path = row?.source?.source === 'local' && typeof row.source.path === 'string' ? row.source.path : null;
    return {
      id: String(row.pluginId || ''),
      version: String(row.version || ''),
      installed: row.installed === true,
      enabled: row.enabled === true,
      source_kind: String(row?.source?.source || ''),
      source_url: typeof row?.source?.url === 'string' ? row.source.url : null,
      source_sha: typeof row?.source?.sha === 'string' ? row.source.sha : null,
      source_target: path ? targetDescriptor(path, repoRoot) : null,
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

function parseRoutes(text, routePath) {
  const lines = text.split('\n');
  const routes = [];
  let section = null;
  let current = null;
  for (let index = 0; index < lines.length; index += 1) {
    if (/^(project_skills|builtin_skills):\s*$/.test(lines[index])) {
      if (current) routes.push(current);
      current = null;
      section = lines[index].split(':')[0];
      continue;
    }
    const entry = lines[index].match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (entry && section) {
      if (current) routes.push(current);
      current = { id: entry[1], section, declaration_pointer: `${routePath}#L${index + 1}`, skill: null, invoke: null };
      continue;
    }
    if (!current) continue;
    const field = lines[index].match(/^    (skill|invoke):\s*["']?([^"'#\s]+)["']?\s*(?:#.*)?$/);
    if (field) current[field[1]] = field[2];
  }
  if (current) routes.push(current);
  return routes.filter((row) => row.skill || row.invoke);
}

function findEntry(catalogs, name) {
  for (const catalog of catalogs) {
    const entry = catalog.entries.find((row) => row.name === name);
    if (entry) return { catalog_root: catalog.root, entry };
  }
  return null;
}

function routeSurface(route, harness, context) {
  if (route.invoke?.includes(':') && !route.invoke.startsWith('/')) {
    const pluginName = route.invoke.split(':')[0];
    const plugins = harness === 'claude' ? context.claudePlugins : context.codexPlugins;
    const matches = plugins.filter((row) => row.id.split('@')[0] === pluginName);
    const enabled = matches.filter((row) => row.enabled);
    return { harness, kind: 'plugin', requested: route.invoke, state: enabled.length ? 'ACTIVE_REGISTERED' : 'MISSING_WIRING', targets: matches.map((row) => row.id) };
  }
  const name = route.skill || route.invoke?.replace(/^\//, '') || route.id.replaceAll('_', '-');
  if (name === 'status') {
    const path = join(context.repoRoot, 'scripts/status.sh');
    return { harness, kind: 'repository-tool', requested: name, state: existsSync(path) ? 'PRESENT_UNPROBED' : 'MISSING_WIRING', targets: existsSync(path) ? ['scripts/status.sh'] : [] };
  }
  const catalogs = harness === 'claude' ? context.claudeCatalogs : context.codexCatalogs;
  const found = findEntry(catalogs, name);
  let state = found && found.entry.real_path ? 'PRESENT_UNPROBED' : 'MISSING_WIRING';
  if (harness === 'claude' && context.skillOverrides[name] === 'off') state = 'DISABLED_BY_OVERRIDE';
  if (name === 'resolving-merge-conflicts' && found?.entry.real_path) {
    const skill = join(found.entry.real_path, 'SKILL.md');
    if (existsSync(skill) && /containment:\s*fail-closed/.test(readFileSync(skill, 'utf8'))) state = 'CONTAINED_FAIL_CLOSED';
  }
  return {
    harness,
    kind: route.invoke?.startsWith('/') ? 'project-skill' : 'skill',
    requested: name,
    state,
    targets: found ? [found.entry.canonical_target] : [],
  };
}

export function censusLiveTargets({ root, targetCommit, home = homedir(), claudeSettingsPath, claudePluginJsonPath, codexPluginJsonPath }) {
  const target = resolveTargetCommit(root, targetCommit);
  const repoOffice = catalogDescriptor(join(target.root, '.claude/skills/office'), target.root);
  const repoAgents = catalogDescriptor(join(target.root, '.agents/skills'), target.root);
  const claudeHome = catalogDescriptor(join(home, '.claude/skills'), target.root);
  const agentsHome = catalogDescriptor(join(home, '.agents/skills'), target.root);
  const codexHome = catalogDescriptor(join(home, '.codex/skills'), target.root);
  const settingsPath = resolve(claudeSettingsPath || join(home, '.claude/settings.json'));
  const settings = existsSync(settingsPath) ? parseJsonFile(settingsPath, 'Claude settings') : {};
  const settingsSubset = {
    skillOverrides: settings.skillOverrides && typeof settings.skillOverrides === 'object' ? settings.skillOverrides : {},
    enabledPlugins: settings.enabledPlugins && typeof settings.enabledPlugins === 'object' ? settings.enabledPlugins : {},
  };
  const claudeRaw = claudePluginJsonPath
    ? { state: 'CAPTURED', error_sha256: null, value: parseJsonFile(claudePluginJsonPath, 'Claude plugin fixture') }
    : commandJson('claude', ['plugin', 'list', '--json'], 'Claude plugin registry');
  const codexRaw = codexPluginJsonPath
    ? { state: 'CAPTURED', error_sha256: null, value: parseJsonFile(codexPluginJsonPath, 'Codex plugin fixture') }
    : commandJson('codex', ['plugin', 'list', '--json'], 'Codex plugin registry');
  const claudePlugins = normalizedClaudePlugins(claudeRaw.value, target.root);
  const codexPlugins = normalizedCodexPlugins(codexRaw.value, target.root);
  const routePath = '.claude/skill-os/skill-routing-map.yaml';
  const routeBlob = exactBlob(target.root, target.commit, routePath);
  const declarations = parseRoutes(routeBlob.bytes.toString('utf8'), routePath);
  const context = {
    repoRoot: target.root,
    skillOverrides: settingsSubset.skillOverrides,
    claudePlugins,
    codexPlugins,
    claudeCatalogs: [repoOffice, claudeHome, agentsHome],
    codexCatalogs: [repoAgents, codexHome, agentsHome, claudeHome],
  };
  const routes = declarations.map((route) => ({
    ...route,
    claude: routeSurface(route, 'claude', context),
    codex: routeSurface(route, 'codex', context),
  }));
  const stateCounts = {};
  for (const route of routes) for (const harness of ['claude', 'codex']) {
    const state = route[harness].state;
    stateCounts[`${harness}:${state}`] = (stateCounts[`${harness}:${state}`] || 0) + 1;
  }
  const anomalies = [];
  for (const [catalogName, catalog] of Object.entries({ repo_office: repoOffice, repo_agents: repoAgents, claude_home: claudeHome, agents_home: agentsHome, codex_home: codexHome })) {
    for (const entry of catalog.entries) if (entry.entry_type === 'broken_symlink') {
      anomalies.push({ code: 'BROKEN_DISCOVERY_ENTRY', catalog: catalogName, name: entry.name, details_sha256: objectHash(entry) });
    }
  }
  for (const entry of repoAgents.entries) if (entry.entry_type !== 'symlink') {
    anomalies.push({ code: 'LIVE_TARGET_OUTSIDE_SOURCE_RULES', catalog: 'repo_agents', name: entry.name, details_sha256: objectHash(entry) });
  }
  const byName = new Map();
  for (const [catalogName, catalog] of Object.entries({ repo_office: repoOffice, repo_agents: repoAgents, claude_home: claudeHome, agents_home: agentsHome, codex_home: codexHome })) {
    for (const entry of catalog.entries) {
      if (!byName.has(entry.name)) byName.set(entry.name, []);
      byName.get(entry.name).push({ catalog: catalogName, tree_sha256: entry.tree_sha256, canonical_target: entry.canonical_target });
    }
  }
  for (const [name, entries] of byName) {
    const hashes = new Set(entries.map((entry) => entry.tree_sha256).filter(Boolean));
    if (hashes.size > 1) anomalies.push({ code: 'DIVERGENT_DISCOVERY_TARGETS', catalog: 'cross-catalog', name, details_sha256: objectHash(entries) });
  }
  anomalies.sort((a, b) => stable(a).localeCompare(stable(b)));
  return {
    schema_version: 'luca.live-route-target-census.v1',
    plan_id: PLAN_ID,
    target_commit: target.commit,
    target_tree: target.tree,
    route_map: { path: routePath, sha256: routeBlob.sha256, declaration_count: declarations.length },
    catalogs: { repo_office: repoOffice, repo_agents: repoAgents, claude_home: claudeHome, agents_home: agentsHome, codex_home: codexHome },
    claude_settings: { path: settingsPath, normalized: settingsSubset, normalized_sha256: objectHash(settingsSubset) },
    plugin_registries: {
      claude: { state: claudeRaw.state, error_sha256: claudeRaw.error_sha256, entries: claudePlugins, normalized_sha256: objectHash(claudePlugins) },
      codex: { state: codexRaw.state, error_sha256: codexRaw.error_sha256, entries: codexPlugins, normalized_sha256: objectHash(codexPlugins) },
    },
    routes,
    anomalies,
    summary: { route_count: routes.length, state_counts: stateCounts },
  };
}

function validateEffective(effective) {
  exactKeys(effective, ['schema_version', 'plan_id', 'purpose', 'baseline_manifest_sha256', 'target_commit', 'target_tree', 'generation_rules', 'selection', 'exclusions', 'resolved_count', 'resolved'], 'effective source manifest');
  if (effective.schema_version !== 2 || effective.plan_id !== PLAN_ID || !HASH_RE.test(effective.baseline_manifest_sha256)
    || !COMMIT_RE.test(effective.target_commit) || !COMMIT_RE.test(effective.target_tree)
    || effective.resolved_count !== effective.resolved.length) fail('effective source manifest identity/count mismatch');
  let previous = null;
  for (const row of effective.resolved) {
    exactKeys(row, ['path', 'sha256'], 'effective resolved row');
    safeRepoPath(row.path);
    if (!HASH_RE.test(row.sha256) || (previous !== null && previous >= row.path)) fail('effective resolved rows must be unique byte-sorted paths');
    previous = row.path;
  }
}

function validateObligation(row, mode) {
  exactKeys(row, RECORD_KEYS, `obligation ${row?.id || '<unknown>'}`);
  if (!/^OBL-[A-F0-9]{20}$/.test(row.id || '') || typeof row.source_pointer !== 'string'
    || !HASH_RE.test(row.source_anchor_hash || '') || !CLASSES.includes(row.class)
    || !row.trigger || row.trigger.kind !== 'SOURCE_NORMATIVE_MARKER' || !Array.isArray(row.trigger.markers) || !row.trigger.markers.length
    || stable(row.harnesses) !== stable(['claude', 'codex']) || !Array.isArray(row.mutant_ids) || !row.mutant_ids.length
    || row.receipt_kind !== 'OBLIGATION_LEDGER_ENTRY' || typeof row.owner !== 'string'
    || !['PROPOSED', 'HUMAN_APPROVED'].includes(row.review_state)) fail(`invalid obligation record: ${row.id}`);
  if (['candidate', 'gate-ready'].includes(mode) && row.review_state !== 'PROPOSED') fail(`candidate obligation review state mismatch: ${row.id}`);
  const expectedId = `OBL-${sha256(Buffer.from(`${row.source_pointer}\0${row.source_anchor_hash}`, 'utf8')).slice(0, 20).toUpperCase()}`;
  if (row.id !== expectedId) fail(`obligation id is not content-derived: ${row.id}`);
  const basisClasses = {
    PROJECT_ISOLATION: 'S0_MACHINE_SAFETY', STABLE_MEMORY: 'S0_MACHINE_SAFETY', GIT_GLOBAL: 'S0_MACHINE_SAFETY', RESOLVER_CONTAINMENT: 'S0_MACHINE_SAFETY',
    PROJECT_GATE: 'S1_ROUTING_DISPATCH', PLAN: 'S1_ROUTING_DISPATCH', DISPATCH: 'S1_ROUTING_DISPATCH',
    QUALITY: 'S2_COMPLETION_QUALITY', HANDOFF: 'S2_COMPLETION_QUALITY', READ_ORDER: 'S2_COMPLETION_QUALITY', DONE: 'S2_COMPLETION_QUALITY',
    HUMAN_CHOICE: 'S3_HUMAN_TASTE',
    SLASH: 'S4_NATIVE_CAPABILITY', WORKFLOW: 'S4_NATIVE_CAPABILITY', WIDGET: 'S4_NATIVE_CAPABILITY', SANDBOX_EVENT: 'S4_NATIVE_CAPABILITY', HARNESS_CAPABILITY: 'S4_NATIVE_CAPABILITY',
    UNRESOLVED: 'UNKNOWN',
  };
  if (basisClasses[row.classification_basis] !== row.class) fail(`classification basis/class mismatch: ${row.id}`);
  if (!['MISSING_WIRING', 'WIRED_UNPROBED', 'LIVE_VERIFIED', 'NATIVE_IMPOSSIBLE', 'MODEL_ONLY', 'DEGRADED'].includes(row.native_status)) fail(`invalid native status: ${row.id}`);
  if (![null, 'NATIVE_CAPABILITY_DIFFERENCE'].includes(row.degradation_code)) fail(`invalid degradation code: ${row.id}`);
  if (mode === 'gate-ready' && row.class === 'UNKNOWN') fail(`UNKNOWN classification blocks scope proposal: ${row.id}`);
  if (row.native_status === 'MISSING_WIRING') {
    if (row.executor !== null || row.activation_probe !== null || row.verifier !== null) fail(`MISSING_WIRING must not claim runtime pointers: ${row.id}`);
  } else if (![row.executor, row.activation_probe, row.verifier].every((value) => typeof value === 'string' && value.length)) {
    fail(`wired obligation lacks executor/probe/verifier: ${row.id}`);
  }
  if (row.class === 'S0_MACHINE_SAFETY') {
    if (row.enforcement !== 'MECHANICAL_DUAL_HARNESS' || row.degradation_code !== null
      || ['MODEL_ONLY', 'NATIVE_IMPOSSIBLE', 'DEGRADED'].includes(row.native_status)) fail(`S0 contract violation: ${row.id}`);
  }
  if (row.class === 'S3_HUMAN_TASTE' && (row.enforcement !== 'HUMAN_GATE' || row.degradation_code !== null)) fail(`S3 contract violation: ${row.id}`);
  if (row.native_status === 'NATIVE_IMPOSSIBLE' && (row.class !== 'S4_NATIVE_CAPABILITY' || row.degradation_code !== 'NATIVE_CAPABILITY_DIFFERENCE')) {
    fail(`native-impossible is restricted to explicit S4 capability differences: ${row.id}`);
  }
  if (row.degradation_code !== null && row.class !== 'S4_NATIVE_CAPABILITY') fail(`degradation is restricted to S4: ${row.id}`);
}

export function validateCandidate(candidate, effective, liveTargets, mode = 'candidate') {
  exactKeys(candidate, ['schema_version', 'plan_id', 'kind', 'approval_state', 'target_commit', 'target_tree', 'source_manifest_sha256', 'live_target_census_sha256', 'source_coverage', 'anchors', 'obligations', 'summary'], 'obligation census');
  if (!['candidate', 'gate-ready'].includes(mode) || candidate.schema_version !== 'luca.obligation-census.v1'
    || candidate.plan_id !== PLAN_ID || candidate.kind !== 'CANDIDATE'
    || candidate.approval_state !== 'PENDING_G_OBLIGATION_SCOPE'
    || candidate.target_commit !== effective.target_commit || candidate.target_tree !== effective.target_tree
    || candidate.source_manifest_sha256 !== sha256(jsonBytes(effective))
    || candidate.live_target_census_sha256 !== sha256(jsonBytes(liveTargets))) fail('candidate identity or input binding mismatch');
  if (!Array.isArray(candidate.source_coverage) || !Array.isArray(candidate.anchors) || !Array.isArray(candidate.obligations)) fail('candidate collections are malformed');
  const expectedSources = new Map(effective.resolved.map((row) => [row.path, row.sha256]));
  const covered = new Map();
  for (const row of candidate.source_coverage) {
    exactKeys(row, ['path', 'file_sha256', 'anchor_count', 'disposition', 'review_state'], 'source coverage row');
    if (!expectedSources.has(row.path) || expectedSources.get(row.path) !== row.file_sha256 || covered.has(row.path)
      || !Number.isInteger(row.anchor_count) || row.anchor_count < 0
      || !['OBLIGATIONS_FOUND', 'NO_NORMATIVE_MARKER_FOUND'].includes(row.disposition)
      || row.review_state !== 'MACHINE_EXTRACTED_CANDIDATE') fail(`invalid source coverage row: ${row.path}`);
    if ((row.anchor_count === 0) !== (row.disposition === 'NO_NORMATIVE_MARKER_FOUND')) fail(`source disposition/count mismatch: ${row.path}`);
    covered.set(row.path, row);
  }
  if (covered.size !== expectedSources.size) fail('source coverage does not cover exact effective source denominator');
  const obligations = new Map();
  for (const row of candidate.obligations) {
    validateObligation(row, mode);
    if (obligations.has(row.id)) fail(`duplicate obligation id: ${row.id}`);
    obligations.set(row.id, row);
  }
  const anchorPointers = new Set();
  const perSource = new Map([...expectedSources.keys()].map((path) => [path, 0]));
  for (const row of candidate.anchors) {
    exactKeys(row, ['source_pointer', 'source_anchor_hash', 'disposition', 'obligation_id'], 'anchor row');
    if (!HASH_RE.test(row.source_anchor_hash) || row.disposition !== 'OBLIGATION' || !obligations.has(row.obligation_id)
      || anchorPointers.has(row.source_pointer)) fail(`invalid/duplicate anchor row: ${row.source_pointer}`);
    const obligation = obligations.get(row.obligation_id);
    if (obligation.source_pointer !== row.source_pointer || obligation.source_anchor_hash !== row.source_anchor_hash) fail(`anchor/obligation mismatch: ${row.source_pointer}`);
    const match = row.source_pointer.match(/^(.+)#L([1-9][0-9]*)$/);
    if (!match || !expectedSources.has(match[1])) fail(`anchor source pointer is outside denominator: ${row.source_pointer}`);
    anchorPointers.add(row.source_pointer);
    perSource.set(match[1], perSource.get(match[1]) + 1);
  }
  if (candidate.anchors.length !== candidate.obligations.length) fail('every anchor must map one-to-one to an obligation');
  for (const [path, count] of perSource) if (covered.get(path).anchor_count !== count) fail(`source anchor count mismatch: ${path}`);
  const expectedSummary = summaryFor(candidate.source_coverage, candidate.obligations);
  if (stable(candidate.summary) !== stable(expectedSummary)) fail('candidate summary mismatch');
  return candidate;
}

function readCanonicalJson(path, label) {
  const bytes = readFileSync(path);
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch { fail(`${label} is not JSON`); }
  if (!bytes.equals(jsonBytes(value))) fail(`${label} bytes are not canonical JSON`);
  return value;
}

function readJson(path, label) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { fail(`${label} is not valid JSON: ${error.message}`); }
}

function trackedBytes(root, targetCommit, path, label) {
  const target = resolveTargetCommit(root, targetCommit);
  const absolute = resolve(path);
  let real;
  try { real = realpathSync(absolute); } catch { fail(`${label} is missing`); }
  if (!within(target.root, real) || real !== absolute) fail(`${label} must be an in-repository non-symlink path`);
  const stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) fail(`${label} must be a single-link regular file`);
  const rel = safeRepoPath(relative(target.root, absolute), label);
  const blob = exactBlob(target.root, target.commit, rel);
  const bytes = readFileSync(absolute);
  if (!bytes.equals(blob.bytes)) fail(`${label} differs from target-commit bytes`);
  return { bytes, relative_path: rel, sha256: blob.sha256 };
}

function trackedJson(root, targetCommit, path, label) {
  const tracked = trackedBytes(root, targetCommit, path, label);
  return { ...tracked, value: readJson(path, label) };
}

function sameValue(left, right, label) {
  if (stable(left) !== stable(right)) fail(`${label} drift`);
}

function writeExclusiveJson(path, value) {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true, mode: 0o700 });
  const temporary = `${absolute}.tmp-${process.pid}`;
  writeFileSync(temporary, jsonBytes(value), { flag: 'wx', mode: 0o600 });
  if (existsSync(absolute)) fail(`refusing to overwrite existing output: ${absolute}`);
  renameSync(temporary, absolute);
  return { path: absolute, sha256: sha256(readFileSync(absolute)) };
}

function statIdentity(path) {
  const stat = lstatSync(path, { bigint: true });
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`receipt root is not a real directory: ${path}`);
  return { dev: String(stat.dev), ino: String(stat.ino) };
}

function sameIdentity(left, right) {
  return String(left?.dev) === String(right?.dev) && String(left?.ino) === String(right?.ino);
}

function physicalReceiptRoot(path) {
  if (!isAbsolute(path)) fail('receipt root must be absolute');
  const lexical = resolve(path);
  if (lexical !== path || realpathSync(lexical) !== lexical) fail('receipt root must be a physical absolute path');
  statIdentity(lexical);
  return lexical;
}

function regularFileBytes(path, label) {
  const beforePath = lstatSync(path);
  if (beforePath.isSymbolicLink() || !beforePath.isFile() || beforePath.nlink !== 1) fail(`${label} must be a single-link regular file`);
  let descriptor;
  try {
    descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fstatSync(descriptor);
    if (!before.isFile() || before.nlink !== 1) fail(`${label} must be a single-link regular file`);
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
      fail(`${label} changed while read`);
    }
    const afterPath = lstatSync(path);
    if (afterPath.isSymbolicLink() || !afterPath.isFile() || afterPath.nlink !== 1
      || afterPath.dev !== after.dev || afterPath.ino !== after.ino || afterPath.size !== after.size) {
      fail(`${label} path identity changed while read`);
    }
    return bytes;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function safeReceiptSegments(slot) {
  const parts = String(slot).split('/');
  if (!slot || isAbsolute(slot) || slot.includes('\\')
    || parts.some((part) => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(part) || part === '.' || part === '..')) {
    fail(`invalid receipt slot: ${slot}`);
  }
  return parts;
}

function receiptPath(root, slot) {
  return join(root, ...safeReceiptSegments(slot));
}

function safeReadReceipt(root, slot, expectedIdentity, label) {
  if (!sameIdentity(statIdentity(root), expectedIdentity)) fail('receipt root identity mismatch');
  const parts = safeReceiptSegments(slot);
  const ancestors = [{ path: root, ...statIdentity(root) }];
  let current = root;
  for (const part of parts.slice(0, -1)) {
    current = join(current, part);
    const stat = lstatSync(current, { bigint: true });
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`${label} ancestor is not a real directory`);
    ancestors.push({ path: current, dev: String(stat.dev), ino: String(stat.ino) });
  }
  const bytes = regularFileBytes(join(current, parts.at(-1)), label);
  for (const ancestor of ancestors) if (!sameIdentity(statIdentity(ancestor.path), ancestor)) fail(`${label} ancestor identity changed while read`);
  return bytes;
}

function publishReceipt(root, identity, writerPath, writerSha256, slot, bytes) {
  if (sha256(regularFileBytes(writerPath, 'secure writer')) !== writerSha256) fail('secure writer hash mismatch');
  if (!sameIdentity(statIdentity(root), identity)) fail('receipt root identity mismatch');
  const parts = safeReceiptSegments(slot);
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'obligation-census-publish-'));
  const inputPath = join(temporaryRoot, 'receipt.input');
  try {
    writeFileSync(inputPath, bytes, { flag: 'wx', mode: 0o600 });
    const args = ['--root', root, '--root-dev', identity.dev, '--root-ino', identity.ino];
    for (const segment of parts.slice(0, -1)) args.push('--segment', segment);
    args.push('--final', parts.at(-1), '--input', inputPath, '--expected-input-sha', sha256(bytes));
    const result = spawnSync(writerPath, args, {
      input: '', encoding: 'utf8', env: { PATH: '/usr/bin:/bin' }, maxBuffer: 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) fail(`secure writer rejected publication: ${String(result.stderr || result.stdout).trim()}`);
    if (sha256(regularFileBytes(writerPath, 'secure writer')) !== writerSha256) fail('secure writer changed during publication');
    const readback = safeReadReceipt(root, slot, identity, 'published receipt');
    if (!readback.equals(bytes)) fail('secure writer read-back mismatch');
    if (String(result.stdout).trim() !== `OK sha256=${sha256(bytes)} bytes=${bytes.length}`) fail('secure writer success token mismatch');
    return { path: receiptPath(root, slot), sha256: sha256(readback), bytes: readback };
  } finally {
    try { unlinkSync(inputPath); } catch { }
    try { rmdirSync(temporaryRoot); } catch { }
  }
}

function parseReceipt(bytes, label) {
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch { fail(`${label} is not valid JSON`); }
  return value;
}

function runtimeTreeDescriptor(root, path) {
  const absolute = join(root, path);
  if (!existsSync(absolute)) return { path, state: 'ABSENT', entry_count: 0, tree_sha256: objectHash([]) };
  const stat = lstatSync(absolute);
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`runtime guard root must be a real directory: ${path}`);
  const rows = treeRows(absolute);
  return { path, state: 'PRESENT', entry_count: rows.length, tree_sha256: objectHash(rows) };
}

export function executionGuard({ root, targetCommit, effective }) {
  const target = resolveTargetCommit(root, targetCommit);
  const headCommit = git(target.root, ['rev-parse', '--verify', 'HEAD^{commit}'], 'HEAD resolution').stdout.toString('utf8').trim();
  const headTree = git(target.root, ['rev-parse', '--verify', 'HEAD^{tree}'], 'HEAD tree resolution').stdout.toString('utf8').trim();
  if (headCommit !== target.commit || headTree !== target.tree) fail('HEAD does not match the bound target commit/tree');
  const diff = git(target.root, ['diff', '--binary', '--no-ext-diff', 'HEAD', '--'], 'tracked worktree diff').stdout;
  const sourceRows = effective.resolved.map((row) => {
    const path = join(target.root, row.path);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) fail(`canonical source worktree entry is not a single-link file: ${row.path}`);
    const currentSha = sha256(readFileSync(path));
    if (currentSha !== row.sha256) fail(`canonical source worktree drift: ${row.path}`);
    return { path: row.path, mode: fileMode(stat), sha256: currentSha };
  });
  const guard = {
    head_commit: headCommit,
    head_tree: headTree,
    tracked_diff_sha256: sha256(diff),
    tracked_diff_bytes: diff.length,
    canonical_source_count: sourceRows.length,
    canonical_source_worktree_sha256: objectHash(sourceRows),
    runtime_trees: RUNTIME_GUARD_PATHS.map((path) => runtimeTreeDescriptor(target.root, path)),
    allowed_repo_mutations: [],
  };
  exactKeys(guard, EXECUTION_GUARD_KEYS, 'execution guard');
  return guard;
}

function approvalCounts(candidate, report) {
  const counts = {
    sources: candidate.summary.source_count,
    anchors: candidate.summary.anchor_count,
    obligations: candidate.summary.obligation_count,
    unknown: candidate.summary.unknown_count,
    missing_wiring: report.missing_wiring_ids.length,
    native_impossible: report.native_impossible_ids.length,
    degraded: report.degraded_ids.length,
  };
  exactKeys(counts, POST_COUNT_KEYS, 'approval counts');
  return counts;
}

function parseOptions(argv, allowed) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith('--')) fail(`unexpected argument: ${raw}`);
    const key = raw.slice(2);
    if (!allowed.has(key) || Object.hasOwn(options, key)) fail(`invalid option: --${key}`);
    const value = argv[++index];
    if (value === undefined || value.startsWith('--')) fail(`missing value for --${key}`);
    options[key] = value;
  }
  return options;
}

function requireOptions(options, names) {
  for (const name of names) if (!Object.hasOwn(options, name)) fail(`missing --${name}`);
}

function liveArgs(options) {
  return {
    root: options.root,
    targetCommit: options['target-commit'],
    home: options.home,
    claudeSettingsPath: options['claude-settings'],
    claudePluginJsonPath: options['claude-plugin-json'],
    codexPluginJsonPath: options['codex-plugin-json'],
  };
}

function fileBinding(path) {
  const bytes = readFileSync(path);
  return { path, sha256: sha256(bytes), bytes: bytes.length };
}

export function gatePayload({ planPath, baselinePath, sourcePath, deltaPath, targetsPath, candidatePath, reportPath, schemaPath, testPath, root }) {
  const candidate = readCanonicalJson(candidatePath, 'candidate census');
  const report = readCanonicalJson(reportPath, 'classification report');
  const source = readCanonicalJson(sourcePath, 'effective source manifest');
  const delta = readCanonicalJson(deltaPath, 'source delta');
  const targets = readCanonicalJson(targetsPath, 'live target census');
  validateEffective(source);
  if (report.candidate_sha256 !== sha256(jsonBytes(candidate)) || report.source_delta_sha256 !== sha256(jsonBytes(delta))
    || stable(report) !== stable(classificationReport({ candidate, delta, liveTargets: targets }))) fail('classification report binding mismatch');
  validateCandidate(candidate, source, targets, 'gate-ready');
  const bindings = {
    plan: fileBinding(planPath),
    baseline_source_manifest: fileBinding(baselinePath),
    effective_source_manifest: fileBinding(sourcePath),
    source_delta: fileBinding(deltaPath),
    live_target_census: fileBinding(targetsPath),
    candidate_census: fileBinding(candidatePath),
    classification_report: fileBinding(reportPath),
    generator: fileBinding(SELF),
    schema: fileBinding(schemaPath),
    test: fileBinding(testPath),
  };
  const target = resolveTargetCommit(root, candidate.target_commit);
  if (target.root === SOURCE_ROOT) {
    for (const [path, label] of [[planPath, 'gate plan'], [baselinePath, 'baseline source manifest'], [SELF, 'obligation generator'], [schemaPath, 'obligation schema'], [testPath, 'obligation test']]) {
      trackedBytes(target.root, target.commit, path, label);
    }
  }
  const guard = executionGuard({ root: target.root, targetCommit: target.commit, effective: source });
  return {
    payload: {
      schema_version: 'luca.g-obligation-scope-payload.v1',
      plan_id: PLAN_ID,
      gate: 'G-OBLIGATION-SCOPE',
      target_commit: target.commit,
      target_tree: target.tree,
      bindings,
      execution_guard: guard,
      counts: {
        baseline_sources: delta.baseline_count,
        effective_sources: delta.effective_count,
        source_added: delta.added.length,
        source_removed: delta.removed.length,
        source_hash_changed: delta.hash_changed.length,
        live_routes: targets.summary.route_count,
        obligations: candidate.summary.obligation_count,
        unknown: candidate.summary.unknown_count,
        missing_wiring: report.missing_wiring_ids.length,
        native_impossible: report.native_impossible_ids.length,
        degraded: report.degraded_ids.length,
      },
      scope: 'approve census/classification only',
      prohibited: ['canonical rule edit', 'runtime wiring', 'activation', 'global mutation'],
      decision_required: 'Approve or reject the exact source denominator, live target census, obligation pointers, proposed classes, and explicit missing-wiring/native/degradation dispositions.',
    },
    envelope: {
      schema_version: 'luca.g-obligation-scope-envelope.v1',
      plan_id: PLAN_ID,
      gate: 'G-OBLIGATION-SCOPE',
      target_commit: target.commit,
      target_tree: target.tree,
      allowed_after_approval: ['record immutable approval binding/result', 'promote exact bound candidate semantics to APPROVED', 'start DEV-010 against exact bound census'],
      forbidden: ['modify bound census bytes', 'modify canonical rules under DEV-009', 'mutate global targets', 'activate candidate runtime'],
      rollback: 'Before approval, retain candidate evidence only. After approval, any input drift invalidates the proposal and requires a new gate.',
    },
  };
}

function requireFixedReceiptPath(provided, expected, label) {
  const lexical = resolve(provided);
  if (lexical !== expected) fail(`${label} must name the fixed receipt slot`);
  let physical;
  try { physical = realpathSync(lexical); } catch { fail(`${label} is missing`); }
  if (physical !== lexical) fail(`${label} must not traverse a symlink`);
}

function canonicalReceipt(bytes, label) {
  const value = parseReceipt(bytes, label);
  if (!bytes.equals(jsonBytes(value))) fail(`${label} bytes are not canonical JSON`);
  return value;
}

function slotExists(root, slot) {
  try { lstatSync(receiptPath(root, slot)); return true; }
  catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
}

function reuseExactReceipt(root, identity, slot, expectedBytes, label) {
  const bytes = safeReadReceipt(root, slot, identity, label);
  if (!bytes.equals(expectedBytes)) fail(`${label} existing bytes mismatch`);
  return { path: receiptPath(root, slot), sha256: sha256(bytes), bytes, reused: true };
}

function publishOrReuseReceipt(root, identity, writerPath, writerSha256, slot, bytes, label) {
  if (slotExists(root, slot)) return reuseExactReceipt(root, identity, slot, bytes, label);
  try {
    return { ...publishReceipt(root, identity, writerPath, writerSha256, slot, bytes), reused: false };
  } catch (error) {
    if (slotExists(root, slot)) return reuseExactReceipt(root, identity, slot, bytes, label);
    throw error;
  }
}

function loadPromotionContext(options) {
  const trackedBaseline = trackedJson(options.root, options['target-commit'], options.baseline, 'baseline source manifest');
  const baseline = trackedBaseline.value;
  const source = readCanonicalJson(options.source, 'effective source manifest');
  const delta = readCanonicalJson(options.delta, 'source delta');
  const targets = readCanonicalJson(options.targets, 'live target census');
  const candidate = readCanonicalJson(options.candidate, 'candidate census');
  const report = readCanonicalJson(options.report, 'classification report');
  const currentSource = recomputeSourceManifest({
    root: options.root,
    targetCommit: options['target-commit'],
    baseline,
    baselineSha256: sha256(trackedBaseline.bytes),
  });
  sameValue(source, currentSource, 'effective source manifest');
  sameValue(delta, sourceDelta(baseline, currentSource), 'source delta');
  const currentTargets = censusLiveTargets(liveArgs(options));
  sameValue(targets, currentTargets, 'live target census');
  const currentCandidate = generateCandidate({ root: options.root, effective: source, liveTargets: targets });
  sameValue(candidate, currentCandidate, 'candidate census');
  validateCandidate(candidate, source, targets, 'gate-ready');
  sameValue(report, classificationReport({ candidate, delta, liveTargets: targets }), 'classification report');

  const expectedGate = gatePayload({
    planPath: options.plan,
    baselinePath: options.baseline,
    sourcePath: options.source,
    deltaPath: options.delta,
    targetsPath: options.targets,
    candidatePath: options.candidate,
    reportPath: options.report,
    schemaPath: options.schema,
    testPath: options.test,
    root: options.root,
  });
  const payload = readCanonicalJson(options.payload, 'gate payload');
  const envelope = readCanonicalJson(options.envelope, 'gate execution envelope');
  sameValue(payload, expectedGate.payload, 'gate payload');
  sameValue(envelope, expectedGate.envelope, 'gate execution envelope');

  const receiptRoot = physicalReceiptRoot(options['receipt-root']);
  const receiptIdentity = statIdentity(receiptRoot);
  const writerPath = resolve(options.writer);
  const writerSha256 = sha256(regularFileBytes(writerPath, 'secure writer'));
  const proposalProbe = parseReceipt(regularFileBytes(options.proposal, 'human gate proposal'), 'human gate proposal');
  validateHumanGateProposal(proposalProbe);
  const slots = humanGateSlots('G-OBLIGATION-SCOPE', proposalProbe.proposal_id);
  requireFixedReceiptPath(options.proposal, receiptPath(receiptRoot, slots.proposal), 'proposal');
  requireFixedReceiptPath(options.binding, receiptPath(receiptRoot, slots.binding), 'binding');
  const proposalBytes = safeReadReceipt(receiptRoot, slots.proposal, receiptIdentity, 'human gate proposal');
  const bindingBytes = safeReadReceipt(receiptRoot, slots.binding, receiptIdentity, 'human gate binding');
  const proposal = parseReceipt(proposalBytes, 'human gate proposal');
  const binding = parseReceipt(bindingBytes, 'human gate binding');
  validateHumanGateProposal(proposal);
  validateHumanGateBinding(binding, proposal, proposalBytes);
  if (proposal.gate !== 'G-OBLIGATION-SCOPE' || binding.gate !== proposal.gate) fail('wrong human gate identity');
  if (!sameIdentity(proposal.receipt_root, receiptIdentity) || !sameIdentity(binding.receipt_root, receiptIdentity)) fail('human gate receipt root mismatch');
  if (proposal.secure_writer_sha256 !== writerSha256 || binding.secure_writer_sha256 !== writerSha256) fail('human gate secure writer mismatch');
  const planBytes = regularFileBytes(options.plan, 'gate plan');
  const payloadBytes = regularFileBytes(options.payload, 'gate payload');
  const envelopeBytes = regularFileBytes(options.envelope, 'gate execution envelope');
  if (proposal.plan_sha256 !== sha256(planBytes) || proposal.payload_sha256 !== sha256(payloadBytes)
    || proposal.execution_envelope_sha256 !== sha256(envelopeBytes)) fail('human gate external input substitution detected');
  if (payload.target_commit !== candidate.target_commit || payload.target_tree !== candidate.target_tree
    || payload.bindings.candidate_census.sha256 !== sha256(jsonBytes(candidate))
    || payload.bindings.effective_source_manifest.sha256 !== sha256(jsonBytes(source))
    || payload.bindings.live_target_census.sha256 !== sha256(jsonBytes(targets))) fail('gate payload census binding mismatch');
  return {
    baseline, source, delta, targets, candidate, report, payload, envelope,
    planBytes, payloadBytes, envelopeBytes, proposal, proposalBytes, binding,
    bindingBytes, receiptRoot, receiptIdentity, writerPath, writerSha256, slots,
  };
}

function approvalMetadata(context) {
  const value = {
    gate: 'G-OBLIGATION-SCOPE',
    candidate_sha256: sha256(jsonBytes(context.candidate)),
    source_manifest_sha256: sha256(jsonBytes(context.source)),
    live_target_census_sha256: sha256(jsonBytes(context.targets)),
    gate_payload_sha256: sha256(context.payloadBytes),
    execution_envelope_sha256: sha256(context.envelopeBytes),
    proposal_id: context.proposal.proposal_id,
    proposal_sha256: sha256(context.proposalBytes),
    binding_id: context.binding.binding_id,
    binding_sha256: sha256(context.bindingBytes),
    target_commit: context.candidate.target_commit,
    target_tree: context.candidate.target_tree,
  };
  exactKeys(value, APPROVAL_KEYS, 'census approval metadata');
  return value;
}

export function buildApprovedCensus(context) {
  const approved = structuredClone(context.candidate);
  approved.kind = 'APPROVED';
  approved.approval_state = 'APPROVED_G_OBLIGATION_SCOPE';
  approved.source_coverage = approved.source_coverage.map((row) => ({ ...row, review_state: 'HUMAN_APPROVED' }));
  approved.obligations = approved.obligations.map((row) => ({ ...row, review_state: 'HUMAN_APPROVED' }));
  approved.approval = approvalMetadata(context);
  return approved;
}

export function validateApprovedCensus(approved, context) {
  exactKeys(approved, [
    'schema_version', 'plan_id', 'kind', 'approval_state', 'target_commit',
    'target_tree', 'source_manifest_sha256', 'live_target_census_sha256',
    'source_coverage', 'anchors', 'obligations', 'summary', 'approval',
  ], 'approved obligation census');
  exactKeys(approved.approval, APPROVAL_KEYS, 'census approval metadata');
  const expected = buildApprovedCensus(context);
  sameValue(approved, expected, 'approved census');
  return approved;
}

export function buildPostState(context, approved) {
  validateApprovedCensus(approved, context);
  const postState = {
    schema_version: 'luca.obligation-census-post-state.v1',
    plan_id: PLAN_ID,
    gate: 'G-OBLIGATION-SCOPE',
    target_commit: context.candidate.target_commit,
    target_tree: context.candidate.target_tree,
    candidate_sha256: sha256(jsonBytes(context.candidate)),
    approved_census_sha256: sha256(jsonBytes(approved)),
    source_manifest_sha256: sha256(jsonBytes(context.source)),
    live_target_census_sha256: sha256(jsonBytes(context.targets)),
    gate_payload_sha256: sha256(context.payloadBytes),
    execution_envelope_sha256: sha256(context.envelopeBytes),
    proposal_id: context.proposal.proposal_id,
    proposal_sha256: sha256(context.proposalBytes),
    binding_id: context.binding.binding_id,
    binding_sha256: sha256(context.bindingBytes),
    counts: approvalCounts(context.candidate, context.report),
  };
  exactKeys(postState, POST_STATE_KEYS, 'obligation census post-state');
  return postState;
}

function promoteApproved(options) {
  const context = loadPromotionContext(options);
  const approved = buildApprovedCensus(context);
  validateApprovedCensus(approved, context);
  const approvedBytes = jsonBytes(approved);
  const postState = buildPostState(context, approved);
  const postStateBytes = jsonBytes(postState);
  const approvedOutput = publishOrReuseReceipt(
    context.receiptRoot, context.receiptIdentity, context.writerPath,
    context.writerSha256, APPROVED_SLOT, approvedBytes, 'approved census',
  );
  const postStateOutput = publishOrReuseReceipt(
    context.receiptRoot, context.receiptIdentity, context.writerPath,
    context.writerSha256, POST_STATE_SLOT, postStateBytes, 'post-state',
  );
  return { context, approved, approvedBytes, postState, postStateBytes, approvedOutput, postStateOutput };
}

function verifyApproved(options) {
  const context = loadPromotionContext(options);
  requireFixedReceiptPath(options.approved, receiptPath(context.receiptRoot, APPROVED_SLOT), 'approved census');
  requireFixedReceiptPath(options['post-state'], receiptPath(context.receiptRoot, POST_STATE_SLOT), 'post-state');
  const approvedBytes = safeReadReceipt(context.receiptRoot, APPROVED_SLOT, context.receiptIdentity, 'approved census');
  const postStateBytes = safeReadReceipt(context.receiptRoot, POST_STATE_SLOT, context.receiptIdentity, 'post-state');
  const approved = canonicalReceipt(approvedBytes, 'approved census');
  const postState = canonicalReceipt(postStateBytes, 'post-state');
  validateApprovedCensus(approved, context);
  const expectedPostState = buildPostState(context, approved);
  exactKeys(postState, POST_STATE_KEYS, 'obligation census post-state');
  sameValue(postState, expectedPostState, 'obligation census post-state');
  const postStateSha256 = sha256(postStateBytes);
  const chain = verifyHumanGateChain({
    receiptRoot: context.receiptRoot,
    secureWriterPath: context.writerPath,
    gate: 'G-OBLIGATION-SCOPE',
    proposalId: context.proposal.proposal_id,
    planBytes: context.planBytes,
    payloadBytes: context.payloadBytes,
    executionEnvelopeBytes: context.envelopeBytes,
    readbackBytes: approvedBytes,
    expectedPostStateSha256: postStateSha256,
  });
  const implementationReceipt = {
    schema_version: 'luca.obligation-census-implementation-receipt.v1',
    plan_id: PLAN_ID,
    unit: 'U-009',
    gate: 'G-OBLIGATION-SCOPE',
    status: 'VERIFIED_APPROVED_CENSUS',
    target_commit: context.candidate.target_commit,
    target_tree: context.candidate.target_tree,
    approved_slot: APPROVED_SLOT,
    post_state_slot: POST_STATE_SLOT,
    candidate_sha256: sha256(jsonBytes(context.candidate)),
    approved_census_sha256: sha256(approvedBytes),
    post_state_sha256: postStateSha256,
    proposal_id: chain.proposal.proposal_id,
    proposal_sha256: chain.proposalSha256,
    binding_id: chain.binding.binding_id,
    binding_sha256: chain.bindingSha256,
    gate_result_id: chain.result.result_id,
    gate_result_sha256: chain.resultSha256,
    counts: approvalCounts(context.candidate, context.report),
  };
  exactKeys(implementationReceipt, IMPLEMENTATION_RECEIPT_KEYS, 'implementation receipt');
  const output = publishOrReuseReceipt(
    context.receiptRoot, context.receiptIdentity, context.writerPath,
    context.writerSha256, IMPLEMENTATION_RECEIPT_SLOT,
    jsonBytes(implementationReceipt), 'implementation receipt',
  );
  return { implementationReceipt, output, chain };
}

async function main() {
  const [mode, ...argv] = process.argv.slice(2);
  const promotionOptions = [
    'root', 'target-commit', 'plan', 'baseline', 'source', 'delta', 'targets',
    'candidate', 'report', 'schema', 'test', 'payload', 'envelope',
    'receipt-root', 'writer', 'proposal', 'binding', 'home', 'claude-settings',
    'claude-plugin-json', 'codex-plugin-json',
  ];
  const allowedByMode = {
    'recompute-source': ['root', 'target-commit', 'baseline', 'out', 'delta'],
    'census-targets': ['root', 'target-commit', 'out', 'home', 'claude-settings', 'claude-plugin-json', 'codex-plugin-json'],
    generate: ['root', 'source', 'targets', 'delta', 'out', 'report'],
    verify: ['root', 'target-commit', 'baseline', 'source', 'targets', 'delta', 'candidate', 'report', 'mode', 'home', 'claude-settings', 'claude-plugin-json', 'codex-plugin-json'],
    'make-gate-payload': ['root', 'plan', 'baseline', 'source', 'delta', 'targets', 'candidate', 'report', 'schema', 'test', 'out', 'envelope'],
    'promote-approved': promotionOptions,
    'verify-approved': [...promotionOptions, 'approved', 'post-state'],
  };
  if (!Object.hasOwn(allowedByMode, mode)) fail('usage: obligation-census.mjs <recompute-source|census-targets|generate|verify|make-gate-payload|promote-approved|verify-approved> [exact options]');
  const options = parseOptions(argv, new Set(allowedByMode[mode]));
  if (mode === 'recompute-source') {
    requireOptions(options, ['root', 'target-commit', 'baseline', 'out', 'delta']);
    const trackedBaseline = trackedJson(options.root, options['target-commit'], options.baseline, 'baseline source manifest');
    const baselineBytes = trackedBaseline.bytes;
    const baseline = trackedBaseline.value;
    const effective = recomputeSourceManifest({ root: options.root, targetCommit: options['target-commit'], baseline, baselineSha256: sha256(baselineBytes) });
    const delta = sourceDelta(baseline, effective);
    const manifestOutput = writeExclusiveJson(options.out, effective);
    const deltaOutput = writeExclusiveJson(options.delta, delta);
    process.stdout.write(`SOURCE_MANIFEST_RECOMPUTED ${effective.resolved_count} ${manifestOutput.sha256} ${delta.status} ${deltaOutput.sha256}\n`);
    return;
  }
  if (mode === 'census-targets') {
    requireOptions(options, ['root', 'target-commit', 'out']);
    const census = censusLiveTargets(liveArgs(options));
    const output = writeExclusiveJson(options.out, census);
    process.stdout.write(`LIVE_ROUTE_TARGET_CENSUS_CAPTURED ${census.summary.route_count} ${output.sha256}\n`);
    return;
  }
  if (mode === 'generate') {
    requireOptions(options, ['root', 'source', 'targets', 'delta', 'out', 'report']);
    const effective = readCanonicalJson(options.source, 'effective source manifest');
    const liveTargets = readCanonicalJson(options.targets, 'live target census');
    const delta = readCanonicalJson(options.delta, 'source delta');
    validateEffective(effective);
    const candidate = generateCandidate({ root: options.root, effective, liveTargets });
    validateCandidate(candidate, effective, liveTargets, 'candidate');
    const report = classificationReport({ candidate, delta, liveTargets });
    const candidateOutput = writeExclusiveJson(options.out, candidate);
    const reportOutput = writeExclusiveJson(options.report, report);
    process.stdout.write(`OBLIGATION_CENSUS_CANDIDATE_GENERATED ${candidate.summary.obligation_count} ${candidateOutput.sha256} ${reportOutput.sha256}\n`);
    return;
  }
  if (mode === 'verify') {
    requireOptions(options, ['root', 'target-commit', 'baseline', 'source', 'targets', 'delta', 'candidate', 'report', 'mode']);
    const trackedBaseline = trackedJson(options.root, options['target-commit'], options.baseline, 'baseline source manifest');
    const baselineBytes = trackedBaseline.bytes;
    const baseline = trackedBaseline.value;
    const effective = readCanonicalJson(options.source, 'effective source manifest');
    const targets = readCanonicalJson(options.targets, 'live target census');
    const delta = readCanonicalJson(options.delta, 'source delta');
    const candidate = readCanonicalJson(options.candidate, 'candidate census');
    const report = readCanonicalJson(options.report, 'classification report');
    const currentEffective = recomputeSourceManifest({ root: options.root, targetCommit: options['target-commit'], baseline, baselineSha256: sha256(baselineBytes) });
    sameValue(effective, currentEffective, 'effective source manifest');
    sameValue(delta, sourceDelta(baseline, currentEffective), 'source delta');
    const currentTargets = censusLiveTargets(liveArgs(options));
    sameValue(targets, currentTargets, 'live target census');
    const currentCandidate = generateCandidate({ root: options.root, effective, liveTargets: targets });
    sameValue(candidate, currentCandidate, 'candidate census');
    validateCandidate(candidate, effective, targets, options.mode);
    sameValue(report, classificationReport({ candidate, delta, liveTargets: targets }), 'classification report');
    const token = options.mode === 'gate-ready' ? 'OBLIGATION_CENSUS_GATE_READY' : 'OBLIGATION_CENSUS_CANDIDATE_PASS';
    process.stdout.write(`${token} ${candidate.summary.obligation_count} ${sha256(jsonBytes(candidate))}\n`);
    return;
  }
  if (mode === 'make-gate-payload') {
    requireOptions(options, ['root', 'plan', 'baseline', 'source', 'delta', 'targets', 'candidate', 'report', 'schema', 'test', 'out', 'envelope']);
    const result = gatePayload({
      planPath: options.plan,
      baselinePath: options.baseline,
      sourcePath: options.source,
      deltaPath: options.delta,
      targetsPath: options.targets,
      candidatePath: options.candidate,
      reportPath: options.report,
      schemaPath: options.schema,
      testPath: options.test,
      root: options.root,
    });
    const payloadOutput = writeExclusiveJson(options.out, result.payload);
    const envelopeOutput = writeExclusiveJson(options.envelope, result.envelope);
    process.stdout.write(`OBLIGATION_SCOPE_PAYLOAD_READY ${payloadOutput.sha256} ${envelopeOutput.sha256}\n`);
    return;
  }
  if (mode === 'promote-approved') {
    requireOptions(options, promotionOptions.filter((name) => !['home', 'claude-settings', 'claude-plugin-json', 'codex-plugin-json'].includes(name)));
    const result = promoteApproved(options);
    process.stdout.write(`OBLIGATION_CENSUS_APPROVED_PUBLISHED ${result.approvedOutput.sha256} ${result.postStateOutput.sha256}\n`);
    return;
  }
  if (mode === 'verify-approved') {
    requireOptions(options, [...promotionOptions.filter((name) => !['home', 'claude-settings', 'claude-plugin-json', 'codex-plugin-json'].includes(name)), 'approved', 'post-state']);
    const result = verifyApproved(options);
    process.stdout.write(`OBLIGATION_CENSUS_APPROVED_VERIFIED ${result.output.sha256} ${result.chain.resultSha256}\n`);
    return;
  }
  fail('unreachable obligation census mode');
}

if (process.argv[1] && realpathSync(process.argv[1]) === SELF) {
  main().catch((error) => {
    process.stderr.write(`OBLIGATION_CENSUS_REJECTED ${error.message}\n`);
    process.exitCode = 2;
  });
}
