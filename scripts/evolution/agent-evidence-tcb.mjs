#!/usr/bin/env node
/**
 * Frozen native-agent evidence trust-computing base (ADR-AGENT-001).
 *
 * Security boundary:
 * - this process independently resolves every role and builds every native argv;
 * - the candidate launcher is never imported and never launches/signs evidence;
 * - before any evidence root or private key exists, its describe-contract mode is
 *   treated as untrusted data and compared with this TCB's independent derivation;
 * - the evidence private key exists only in this supervisor's memory;
 * - an isolated verifier process supplies the independent quality-gate countersignature;
 * - children receive no evidence/anchor path and their declared write roots cannot overlap them.
 */
import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign as signBytes,
  verify as verifyBytes,
} from 'node:crypto';
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  lstatSync,
  statSync,
  writeSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';

const SELF = realpathSync(fileURLToPath(import.meta.url));
const VERIFY = realpathSync(join(dirname(SELF), 'verify-agent-evidence.mjs'));
const ROLES = Object.freeze(['plan-agent', 'work-agent', 'oracle', 'quality-gate']);
const ROLE_CONTRACT = Object.freeze({
  'plan-agent': { tier: 'reasoning-heavy', claude: '.claude/agents/plan-agent.md', codex: '.codex/agents/plan-agent.toml' },
  'work-agent': { tier: 'core-execution', claude: '.claude/agents/work-agent.md', codex: '.codex/agents/work-agent.toml' },
  oracle: { tier: 'reasoning-heavy', claude: '.claude/agents/oracle.md', codex: '.codex/agents/oracle.toml' },
  'quality-gate': { tier: 'core-execution', claude: '.claude/agents/quality-gate.md', codex: '.codex/agents/quality-gate.toml' },
});
const PACKET_KEYS = ['schema_version', 'packet_id', 'phase_id', 'logical_role', 'cwd_key', 'goal', 'ownership', 'files', 'inputs', 'constraints', 'protected_paths', 'outputs', 'done_criteria', 'verification', 'rollback'];
const COMMIT_RE = /^[a-f0-9]{40}$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const CALL_ID_RE = /^call_[A-Za-z0-9_-]{16,}$/;
const EXEC_ID_RE = /^exec-[a-f0-9-]{36}$/i;
const NATIVE_WORK_VERIFY_COMMAND = "test -f scripts/agent-launcher.mjs && printf 'LUCA_NATIVE_WORK_AGENT_VERIFY_WP_NATIVE_SMOKE_V1\\n'";
const TARGET_TREE_BASE_PATHS = Object.freeze([
  ...ROLES.flatMap((role) => [`.claude/agents/${role}.md`, `.codex/agents/${role}.toml`]),
  '.claude/agents/orchestrator.md',
  '.claude/agents/work-agent-template.md',
  '.claude/skill-os/model-routing.yaml',
  '.claude/skill-os/native-agent-activation.json',
  '.claude/skill-os/schemas/work-packet.schema.json',
  '.claude/skill-os/skill-routing-map.yaml',
  '.claude/skill-os/input-modes.yaml',
  '.claude/skill-os/optional-workflow-graph.yaml',
  '.claude/settings.json',
  '.claude/hooks/post-edit.mjs',
  '.claude/hooks/route-guard.mjs',
  '.claude/skills/office/brainstorm/SKILL.md',
  '.claude/skills/office/deepresearch/SKILL.md',
  '.claude/skills/office/ux-brainstorm/SKILL.md',
  '.claude/skills/office/ux-research/SKILL.md',
  '.claude/skills/office/code-hygiene/SKILL.md',
  '.codex/hooks.json',
  '.codex/config.toml',
  '.codex/codex-hook-adapter.mjs',
  '.codex/workflow-runner.mjs',
  'AGENTS.md',
  'CLAUDE.md',
  'scripts/agent-launcher.mjs',
  'scripts/check-agents-parity.mjs',
]);
const TARGET_TREE_EXACT_NAMESPACES = Object.freeze([
  '.claude/agents',
  '.codex/agents',
  '.claude/skill-os/schemas',
]);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const stable = (value) => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const codexApiSandbox = (mode) => mode === 'workspace-write'
  ? { type: 'workspaceWrite', writableRoots: [], networkAccess: false, excludeTmpdirEnvVar: true, excludeSlashTmp: true }
  : { type: 'readOnly', networkAccess: false };
const jsonBytes = (value) => Buffer.from(`${stable(value)}\n`, 'utf8');
const fail = (message) => { throw new Error(message); };
const within = (parent, child) => child === parent || child.startsWith(parent + sep);
const exactKeys = (value, keys, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || stable(Object.keys(value).sort()) !== stable([...keys].sort())) fail(`${label} has non-exact keys`);
};

function canonicalIso(value, label) {
  if (typeof value !== 'string') fail(`${label} is not a timestamp`);
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch) || new Date(epoch).toISOString() !== value) fail(`${label} is not canonical ISO-8601`);
  return epoch;
}

function assertFrozenSource(path, label) {
  const st = statSync(path);
  if (!st.isFile() || st.nlink !== 1 || (st.mode & 0o022) !== 0) fail(`${label} must be a single-link regular file with no group/world write bit`);
}

function cleanGitEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  // Object replacement rewrites commit/tree identity without changing the
  // caller-supplied SHA.  Every Git child in this TCB is therefore forced to
  // ignore replacements; targetTreeManifest additionally rejects their refs.
  env.GIT_NO_REPLACE_OBJECTS = '1';
  env.GIT_OPTIONAL_LOCKS = '0';
  return env;
}

function gitRead(root, args, label) {
  const result = spawnSync('git', args, {
    cwd: root,
    env: cleanGitEnv(),
    input: '',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) fail(`${label} failed: ${String(result.stderr).trim()}`);
  return result.stdout;
}

function assertNoReplaceRefs(root) {
  const refs = gitRead(root, ['for-each-ref', '--format=%(refname)', 'refs/replace'], 'git replacement-ref scan')
    .toString('utf8').trim();
  if (refs) fail(`target repository contains forbidden refs/replace entries: ${refs.replace(/\s+/g, ',')}`);
}

function parseTreeRecords(bytes, label) {
  if (!bytes.length) return [];
  return bytes.toString('utf8').split('\0').filter(Boolean).map((record) => {
    const match = record.match(/^(\d{6}) ([a-z]+) ([a-f0-9]{40})\t(.+)$/s);
    if (!match) fail(`${label} emitted a malformed tree record`);
    return { mode: match[1], type: match[2], object_id: match[3], path: match[4] };
  });
}

function namespaceTreePaths(root, targetCommit) {
  const records = parseTreeRecords(
    gitRead(root, ['ls-tree', '-r', '-z', targetCommit, '--', ...TARGET_TREE_EXACT_NAMESPACES], 'git critical namespace tree'),
    'git critical namespace tree',
  );
  if (!records.length) fail('target commit has no critical agent/schema namespace entries');
  for (const entry of records) {
    if (!['100644', '100755'].includes(entry.mode) || entry.type !== 'blob') {
      fail(`critical namespace contains symlink/submodule/non-blob entry: ${entry.path}`);
    }
  }
  const targetPaths = new Set(records.map(({ path }) => path));
  const additions = gitRead(root,
    ['ls-files', '--others', '-z', '--', ...TARGET_TREE_EXACT_NAMESPACES],
    'git critical namespace untracked scan');
  if (additions.length) {
    fail(`critical namespace contains relevant untracked additions: ${additions.toString('utf8').split('\0').filter(Boolean).join(',')}`);
  }
  return targetPaths;
}

function assertExactIndexEntry(root, targetEntry) {
  const tag = gitRead(root, ['ls-files', '-v', '-z', '--', targetEntry.path], `git index flags ${targetEntry.path}`);
  if (!tag.equals(Buffer.from(`H ${targetEntry.path}\0`, 'utf8'))) {
    fail(`critical target path has skip-worktree/assume-unchanged/noncanonical index flags: ${targetEntry.path}`);
  }
  const staged = gitRead(root, ['ls-files', '-s', '-z', '--', targetEntry.path], `git staged entry ${targetEntry.path}`)
    .toString('utf8');
  const expected = `${targetEntry.mode} ${targetEntry.object_id} 0\t${targetEntry.path}\0`;
  if (staged !== expected) fail(`critical target index entry differs from target commit: ${targetEntry.path}`);
}

export function targetTreeManifest(root, targetCommit, workPacketPath) {
  assertNoReplaceRefs(root);
  if (!COMMIT_RE.test(targetCommit)
    || gitRead(root, ['cat-file', '-t', targetCommit], 'git target object type').toString('utf8') !== 'commit\n') {
    fail('target commit is not one exact commit object');
  }
  const targetTree = gitRead(root, ['rev-parse', `${targetCommit}^{tree}`], 'git target tree').toString('utf8').trim();
  if (!COMMIT_RE.test(targetTree)
    || gitRead(root, ['cat-file', '-t', targetTree], 'git target tree type').toString('utf8') !== 'tree\n') {
    fail('target commit does not resolve to one exact tree object');
  }
  const packetReal = realpathSync(workPacketPath);
  if (!within(root, packetReal)) fail('work packet must be a tracked target-commit file inside the frozen checkout');
  const packetRel = relative(root, packetReal);
  const namespacePaths = namespaceTreePaths(root, targetCommit);
  const paths = [...new Set([...TARGET_TREE_BASE_PATHS, ...namespacePaths, packetRel])].sort();
  const manifest = [];
  for (const path of paths) {
    const absolute = resolve(root, path);
    if (!within(root, absolute) || realpathSync(absolute) !== absolute) fail(`critical target path is missing or symlinked: ${path}`);
    const st = lstatSync(absolute);
    if (!st.isFile() || st.isSymbolicLink() || st.nlink !== 1 || (st.mode & 0o022) !== 0) {
      fail(`critical target path is not a single-link regular non-writable file: ${path}`);
    }
    const entries = parseTreeRecords(gitRead(root, ['ls-tree', '-z', targetCommit, '--', path], `git ls-tree ${path}`), `git ls-tree ${path}`);
    if (entries.length !== 1 || entries[0].path !== path || !['100644', '100755'].includes(entries[0].mode)
      || entries[0].type !== 'blob') fail(`critical target path is not one tracked regular blob at target commit: ${path}`);
    assertExactIndexEntry(root, entries[0]);
    const blob = gitRead(root, ['cat-file', 'blob', entries[0].object_id], `git cat-file ${path}`);
    const bytes = readFileSync(absolute);
    if (!bytes.equals(blob)) fail(`critical target bytes differ from target-commit blob: ${path}`);
    manifest.push({ path, mode: entries[0].mode, type: 'blob', object_id: entries[0].object_id, size: bytes.length, sha256: sha256(bytes) });
  }
  return manifest;
}

function exclusiveFile(path, bytes) {
  const fd = openSync(path, 'wx', 0o600);
  try { writeSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  chmodSync(path, 0o600);
  const dfd = openSync(dirname(path), 'r');
  try { fsyncSync(dfd); } finally { closeSync(dfd); }
  const st = statSync(path);
  if (!st.isFile() || st.nlink !== 1 || (st.mode & 0o777) !== 0o600) fail(`unsafe immutable file ${path}`);
}

function newExternalRoot(path, repoRoot) {
  if (!isAbsolute(path) || existsSync(path)) fail('--out-root must be a new absolute path');
  const parent = realpathSync(dirname(path));
  const destination = join(parent, path.slice(dirname(path).length + 1));
  if (within(repoRoot, destination)) fail('transaction root must be outside the frozen checkout');
  mkdirSync(destination, { mode: 0o700 });
  chmodSync(destination, 0o700);
  return realpathSync(destination);
}

function privateDir(path) {
  mkdirSync(path, { mode: 0o700 });
  chmodSync(path, 0o700);
  return realpathSync(path);
}

function parseJsonl(bytes, label) {
  const lines = bytes.toString('utf8').split('\n').filter(Boolean);
  if (!lines.length) fail(`${label} is empty`);
  return lines.map((line, index) => {
    try { return JSON.parse(line); } catch { fail(`${label} line ${index + 1} is not JSON`); }
  });
}

export function validatePacket(path) {
  const source = readFileSync(path);
  let packet;
  try { packet = JSON.parse(source.toString('utf8')); } catch { fail('work packet is not JSON'); }
  exactKeys(packet, PACKET_KEYS, 'work packet');
  if (packet.schema_version !== 'luca.work-packet.v1' || packet.logical_role !== 'work-agent') fail('wrong work packet identity');
  if (!/^wp-[a-z0-9][a-z0-9._-]{2,127}$/.test(packet.packet_id || '')) fail('invalid work packet id');
  for (const key of ['ownership', 'files', 'inputs', 'constraints', 'protected_paths', 'outputs', 'done_criteria', 'verification', 'rollback']) {
    if (!Array.isArray(packet[key]) || !packet[key].length) fail(`work packet ${key} must be nonempty`);
  }
  const bounded = (value, max) => typeof value === 'string' && [...value].length > 0 && (max === null || [...value].length <= max);
  const safePath = (value) => bounded(value, 1024) && (() => {
    const segments = value.split('/');
    return !value.startsWith('/') && !value.endsWith('/') && !/^[A-Za-z]:/.test(value)
      && !value.includes('\\') && !/[\u0000-\u001F\u007F]/.test(value)
      && segments.every((segment) => segment && segment !== '.' && segment !== '..');
  })();
  const pathContains = (parent, child) => child === parent || child.startsWith(parent.endsWith('/') ? parent : `${parent}/`);
  const pathsOverlap = (a, b) => pathContains(a, b) || pathContains(b, a);
  if (!bounded(packet.phase_id, 128) || !bounded(packet.cwd_key, 256) || !bounded(packet.goal, 4096)) fail('invalid bounded packet identity field');
  for (const key of ['ownership', 'files', 'inputs', 'constraints', 'protected_paths', 'outputs', 'done_criteria', 'verification', 'rollback']) {
    if (new Set(packet[key].map(stable)).size !== packet[key].length) fail(`work packet ${key} contains duplicate items`);
  }
  const accesses = new Set(['read', 'write', 'create', 'delete']);
  const mutable = new Set(['write', 'create', 'delete']);
  const ownership = new Map();
  for (const entry of packet.ownership) {
    exactKeys(entry, ['path', 'owner', 'access'], 'packet ownership');
    if (!safePath(entry.path) || !bounded(entry.owner, 256) || !accesses.has(entry.access) || ownership.has(entry.path)) fail('invalid/duplicate packet ownership');
    ownership.set(entry.path, entry.access);
  }
  const files = new Map();
  for (const entry of packet.files) {
    exactKeys(entry, ['path', 'purpose', 'access'], 'packet file');
    if (!safePath(entry.path) || !bounded(entry.purpose, 2048) || !accesses.has(entry.access)
      || files.has(entry.path) || ownership.get(entry.path) !== entry.access) fail('invalid/duplicate packet file or access mismatch');
    files.set(entry.path, entry.access);
  }
  const inputIds = new Set();
  for (const input of packet.inputs) {
    exactKeys(input, ['id', 'source', 'content', 'content_sha256'], 'packet input');
    if (!/^IN-[A-Z0-9][A-Z0-9_-]{0,63}$/.test(input.id || '') || inputIds.has(input.id)
      || !bounded(input.source, 2048) || !bounded(input.content, null) || !HASH_RE.test(input.content_sha256 || '')
      || sha256(Buffer.from(input.content, 'utf8')) !== input.content_sha256) fail('work packet input hash mismatch');
    inputIds.add(input.id);
  }
  const done = new Set();
  for (const entry of packet.done_criteria) {
    exactKeys(entry, ['id', 'statement'], 'packet done criterion');
    if (!/^DONE-[A-Z0-9][A-Z0-9_-]{0,63}$/.test(entry.id || '') || done.has(entry.id) || !bounded(entry.statement, 4096)) fail('invalid/duplicate done criterion');
    done.add(entry.id);
  }
  const outputs = new Set();
  for (const entry of packet.outputs) {
    exactKeys(entry, ['path', 'description', 'done_criterion_ids'], 'packet output');
    if (!safePath(entry.path) || outputs.has(entry.path) || !bounded(entry.description, 2048)
      || !Array.isArray(entry.done_criterion_ids) || !entry.done_criterion_ids.length
      || new Set(entry.done_criterion_ids).size !== entry.done_criterion_ids.length
      || entry.done_criterion_ids.some((id) => !done.has(id)) || !mutable.has(files.get(entry.path))
      || !mutable.has(ownership.get(entry.path))) fail('invalid/duplicate packet output');
    outputs.add(entry.path);
  }
  const protectedPaths = new Set(packet.protected_paths);
  if (protectedPaths.size !== packet.protected_paths.length || [...protectedPaths].some((entry) => !safePath(entry))) fail('invalid/duplicate protected path');
  for (const [ownedPath, access] of ownership) if (mutable.has(access) && [...protectedPaths].some((path) => pathsOverlap(path, ownedPath))) fail('protected path overlaps mutable ownership');
  for (const [filePath, access] of files) {
    if (ownership.get(filePath) !== access) fail('packet file access mismatches ownership');
    if (mutable.has(access) && [...protectedPaths].some((path) => pathsOverlap(path, filePath))) fail('protected path overlaps mutable file');
  }
  for (const outputPath of outputs) if ([...protectedPaths].some((path) => pathsOverlap(path, outputPath))) fail('packet output overlaps protected path');
  const verifyIds = new Set();
  for (const entry of packet.verification) {
    exactKeys(entry, ['id', 'command', 'expected_exit'], 'packet verification');
    if (!/^VERIFY-[A-Z0-9][A-Z0-9_-]{0,63}$/.test(entry.id || '') || verifyIds.has(entry.id)
      || !bounded(entry.command, 8192) || !Number.isInteger(entry.expected_exit) || entry.expected_exit < 0 || entry.expected_exit > 255) fail('invalid/duplicate packet verification');
    verifyIds.add(entry.id);
  }
  for (const key of ['constraints', 'rollback']) if (packet[key].some((item) => !bounded(item, 4096))) fail(`invalid packet ${key}`);
  if (packet.inputs.length !== inputIds.size || packet.done_criteria.length !== done.size
    || packet.outputs.length !== outputs.size || packet.verification.length !== verifyIds.size) fail('work packet logical IDs/paths are duplicated');
  if (packet.ownership.length !== 1 || stable(packet.ownership[0]) !== stable({ path: '@response', owner: 'work-agent', access: 'create' })
    || packet.files.length !== 1 || stable(packet.files[0]) !== stable({ path: '@response', purpose: 'Logical native child response; this is not a filesystem path.', access: 'create' })
    || packet.outputs.length !== 1 || stable(packet.outputs[0]) !== stable({ path: '@response', description: 'Native child response containing the exact role sentinel and packet id.', done_criterion_ids: ['DONE-SENTINEL'] })
    || packet.done_criteria.length !== 1
    || packet.done_criteria[0].id !== 'DONE-SENTINEL') fail('native work smoke requires the sole exact @response output contract');
  if (packet.verification.length !== 1 || packet.verification[0].id !== 'VERIFY-SENTINEL'
    || packet.verification[0].expected_exit !== 0 || packet.verification[0].command !== NATIVE_WORK_VERIFY_COMMAND) {
    fail('native work smoke requires the exact frozen zero-exit verification command');
  }
  const verifySentinels = packet.verification[0].command.match(/LUCA_NATIVE_WORK_AGENT_VERIFY_[A-Z0-9_-]+/g) || [];
  if (verifySentinels.length !== 1) fail('native work smoke command must contain exactly one frozen verification sentinel');
  const doneMatches = packet.done_criteria.map((entry) => entry.statement.match(/^The child response is exactly (LUCA_NATIVE_WORK_AGENT_RESULT [a-z0-9][a-z0-9._-]{2,127})\.$/i)?.[1]).filter(Boolean);
  if (doneMatches.length !== 1 || doneMatches[0] !== `LUCA_NATIVE_WORK_AGENT_RESULT ${packet.packet_id}`) fail('native work smoke has no unique exact output criterion');
  const canonical = stable(packet);
  return { path: realpathSync(path), packet, canonical, sha256: sha256(Buffer.from(canonical)), source_sha256: sha256(source), expected_output: doneMatches[0], verification_sentinel: verifySentinels[0] };
}

export function parseRouting(root) {
  const path = join(root, '.claude/skill-os/model-routing.yaml');
  const bytes = readFileSync(path);
  const text = bytes.toString('utf8');
  const lineup = (text.match(/^known_lineup:\s*\[([^\]]+)\]/m)?.[1] || '')
    .split(',').map((item) => item.trim()).filter(Boolean);
  if (!lineup.length || new Set(lineup).size !== lineup.length
    || lineup.some((alias) => !/^[A-Za-z0-9._-]+$/.test(alias))) fail('routing known_lineup is invalid');
  const tiers = {};
  for (const name of ['reasoning-heavy', 'core-execution', 'guided-execution', 'mechanical']) {
    const block = text.match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [a-z][a-z-]+:|^#|\\Z)`, 'm'))?.[1] || '';
    const alias = block.match(/^    resolves_to:\s*([A-Za-z0-9._-]+)/m)?.[1];
    const fallback = block.match(/^    fallback:\s*([A-Za-z0-9._-]+)/m)?.[1] || null;
    if (!alias || !lineup.includes(alias)) fail(`routing has no valid Claude projection for ${name}`);
    if (fallback && (!lineup.includes(fallback) || lineup.indexOf(fallback) !== lineup.indexOf(alias) + 1)) {
      fail(`routing has invalid Claude fallback for ${name}`);
    }
    tiers[name] = { alias, fallback };
  }
  const codex = text.match(/^codex:\n([\s\S]*?)(?=^# ─── 新场景|\Z)/m)?.[1] || '';
  const efforts = codex.match(/^  tier_to_effort:\n([\s\S]*?)(?=^  [a-z_]+:|\Z)/m)?.[1] || '';
  for (const name of Object.keys(tiers)) {
    const effort = efforts.match(new RegExp(`^    ${name}:\\s*(none|low|medium|high|xhigh|max)\\b`, 'm'))?.[1];
    if (!effort || effort === 'minimal') fail(`routing has no valid Codex projection for ${name}`);
    tiers[name].effort = effort;
  }
  return { path: realpathSync(path), sha256: sha256(bytes), lineup, tiers };
}

function resolveRole(root, harness, role, routing, projectionMode = 'primary') {
  if (!ROLES.includes(role) || !['claude', 'codex'].includes(harness)) fail('unknown native role/harness');
  const contract = ROLE_CONTRACT[role];
  const path = join(root, contract[harness]);
  const bytes = readFileSync(path);
  const text = bytes.toString('utf8');
  if (!['primary', 'fallback'].includes(projectionMode)) fail('invalid projection mode');
  const tierRoute = routing.tiers[contract.tier];
  if (projectionMode === 'fallback' && (harness !== 'claude' || !tierRoute.fallback)) {
    fail(`fallback projection is unavailable for ${harness}/${role}`);
  }
  const projection = harness === 'claude'
    ? (projectionMode === 'fallback' ? tierRoute.fallback : tierRoute.alias)
    : tierRoute.effort;
  if (harness === 'claude') {
    const front = text.match(/^---\n([\s\S]*?)\n---\n/)?.[1] || '';
    if (front.match(/^name:\s*(\S+)/m)?.[1] !== role || /^model\s*:/m.test(front)) fail(`invalid Claude role ${role}`);
  } else {
    if (text.match(/^name\s*=\s*"([^"]+)"/m)?.[1] !== role
      || text.match(/^model_reasoning_effort\s*=\s*"([^"]+)"/m)?.[1] !== projection
      || /^model\s*=/m.test(text) || !text.includes(`.claude/agents/${role}.md`)) fail(`invalid Codex role ${role}`);
  }
  return {
    tier: contract.tier,
    projection,
    definition_path: relative(root, path),
    definition_sha256: sha256(bytes),
    definition_text: text,
    routing_path: relative(root, routing.path),
    routing_sha256: routing.sha256,
  };
}

function childInput(role, packet) {
  const sentinel = `LUCA_NATIVE_${role.replaceAll('-', '_').toUpperCase()}_RESULT`;
  if (role === 'work-agent') {
    if (!packet) fail('work-agent requires the frozen packet');
    return packet.canonical;
  }
  return `Perform a read-only native role smoke check. Do not call tools and do not edit files. Return exactly ${sentinel}.`;
}

function nativeIdentity(command, harness) {
  const commandPath = realpathSync(command);
  let nativePath = commandPath;
  if (harness === 'codex' && commandPath.endsWith('/@openai/codex/bin/codex.js')) {
    const packageRoot = resolve(dirname(commandPath), '..');
    const platform = process.platform === 'darwin'
      ? (process.arch === 'arm64' ? 'codex-darwin-arm64' : 'codex-darwin-x64')
      : (process.arch === 'arm64' ? 'codex-linux-arm64' : 'codex-linux-x64');
    const triple = process.platform === 'darwin'
      ? (process.arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin')
      : (process.arch === 'arm64' ? 'aarch64-unknown-linux-musl' : 'x86_64-unknown-linux-musl');
    const candidate = join(packageRoot, 'node_modules', '@openai', platform, 'vendor', triple, 'bin', 'codex');
    if (existsSync(candidate)) nativePath = realpathSync(candidate);
  }
  const version = spawnSync(commandPath, ['--version'], { encoding: 'utf8', input: '', timeout: 20_000 });
  if (version.status !== 0) fail(`${harness} version probe failed`);
  return {
    command_path: commandPath,
    command_sha256: sha256(readFileSync(commandPath)),
    native_binary_path: nativePath,
    native_binary_sha256: sha256(readFileSync(nativePath)),
    cli_version: String(version.stdout || version.stderr).trim(),
  };
}

export function buildNativeLaunch({ root, harness, role, packet, routing, dispatcherId, runtime, scratch, projectionMode = 'primary' }) {
  const resolved = resolveRole(root, harness, role, routing, projectionMode);
  const input = childInput(role, packet);
  const inputSha = sha256(Buffer.from(input, 'utf8'));
  const taskName = `edge_${inputSha}`;
  const packetClause = role === 'work-agent'
    ? ` The launch supervisor independently validated the frozen work packet against luca.work-packet.v1 and the exact launcher cross-field contract; its canonical SHA-256 is ${packet.sha256}. The entire child prompt must be only the following JSON bytes, with no wrapper or extra instruction:\n${input}`
    : ` Use this exact child prompt:\n${input}`;
  const dispatcherPrompt = harness === 'claude'
    ? `Native evidence transaction ${dispatcherId}. Use the Agent tool exactly once with subagent_type ${role} and run_in_background=false.${packetClause}\nDo not perform the role yourself. Wait for the child result, then return it verbatim.`
    : `Native evidence transaction ${dispatcherId}. Use collaboration spawn_agent exactly once with agent_type ${role}, fork_turns "none", and task_name "${taskName}".${packetClause}\nUse wait_agent exactly once, call no other function, and return that distinct child result verbatim. Do not perform the role yourself.`;
  let command;
  let args;
  let inlineSettings = null;
  let agents = null;
  const sandboxMode = role === 'work-agent' ? 'workspace-write' : 'read-only';
  const childWriteRoots = role === 'work-agent' ? [root] : [];
  const processRoots = [scratch];
  if (harness === 'claude') {
    command = process.env.LUCA_CLAUDE_BIN || '/Users/luca/.local/bin/claude';
    inlineSettings = {
      sandbox: {
        enabled: true,
        failIfUnavailable: true,
        autoAllowBashIfSandboxed: true,
        allowUnsandboxedCommands: false,
        excludedCommands: [],
        filesystem: { disabled: false, allowWrite: [] },
      },
    };
    agents = {
      'u008-dispatcher': {
        description: `Dispatch exactly one native ${role} child and return its result`,
        prompt: `Use only Agent(${role}) exactly once. Never perform the role yourself or call another tool.`,
        tools: [`Agent(${role})`],
        permissionMode: 'dontAsk',
      },
      [role]: {
        description: `Native ${role} role projected from ${resolved.definition_path}`,
        prompt: resolved.definition_text,
        tools: role === 'work-agent' ? ['Bash'] : [],
        model: resolved.projection,
        permissionMode: 'dontAsk',
      },
    };
    args = ['-p', '--output-format', 'stream-json', '--include-hook-events', '--forward-subagent-text', '--verbose',
      '--no-session-persistence', '--setting-sources', 'project', '--settings', JSON.stringify(inlineSettings),
      '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--disable-slash-commands',
      '--tools', 'Agent,Bash', '--allowedTools', `Agent(${role})`, '--permission-mode', 'dontAsk',
      '--agents', JSON.stringify(agents), '--agent', 'u008-dispatcher', dispatcherPrompt];
  } else {
    command = process.env.LUCA_CODEX_BIN || '/Users/luca/.local/bin/codex';
    args = ['-C', root, 'app-server', '--enable', 'multi_agent_v2',
      '-c', 'sandbox_workspace_write.writable_roots=[]',
      '-c', 'sandbox_workspace_write.network_access=false',
      '-c', 'sandbox_workspace_write.exclude_tmpdir_env_var=true',
      '-c', 'sandbox_workspace_write.exclude_slash_tmp=true',
      '-c', `model_reasoning_effort="${resolved.projection}"`];
  }
  const binary = nativeIdentity(command, harness);
  if (harness === 'claude') {
    const claudeHome = join(process.env.HOME || '', '.claude');
    const claudeTemp = `/private/tmp/claude-${typeof process.getuid === 'function' ? process.getuid() : 'unknown'}`;
    if (existsSync(claudeHome)) processRoots.push(realpathSync(claudeHome));
    if (existsSync(claudeTemp)) processRoots.push(realpathSync(claudeTemp));
  } else {
    const codexHome = process.env.CODEX_HOME || join(process.env.HOME || '', '.codex');
    if (existsSync(codexHome)) processRoots.push(realpathSync(codexHome));
  }
  const writeRoots = [...new Set([...processRoots, ...childWriteRoots])];
  const sandboxContract = harness === 'claude'
    ? { type: 'claude-native-sandbox', cwd: root, inline_settings: inlineSettings, setting_sources: ['project'], required_post_tool_use_event: 'Agent' }
    : { type: sandboxMode, cwd: root, approval_policy: 'never', writable_roots: childWriteRoots, network_access: false, parent_allowed_function_calls: ['spawn_agent', 'wait_agent'], child_allowed_tools: role === 'work-agent' ? ['Bash'] : [], app_server_capabilities: { experimentalApi: true } };
  const descriptor = {
    schema_version: 'luca.native-launch.v2',
    dispatcher_id: dispatcherId,
    harness,
    role,
    tier: resolved.tier,
    projection: resolved.projection,
    definition_path: resolved.definition_path,
    definition_sha256: resolved.definition_sha256,
    routing_path: resolved.routing_path,
    routing_sha256: resolved.routing_sha256,
    packet_sha256: role === 'work-agent' ? packet.sha256 : null,
    packet_source_sha256: role === 'work-agent' ? packet.source_sha256 : null,
    input_sha256: inputSha,
    native_task_name: harness === 'codex' ? taskName : null,
    sandbox_contract: sandboxContract,
    write_roots: writeRoots,
    dispatcher_prompt: dispatcherPrompt,
    dispatcher_prompt_sha256: sha256(Buffer.from(dispatcherPrompt, 'utf8')),
    command_path: binary.command_path,
    command_sha256: binary.command_sha256,
    native_binary_path: binary.native_binary_path,
    native_binary_sha256: binary.native_binary_sha256,
    cli_version: binary.cli_version,
    cwd: root,
    args,
    argv_sha256: sha256(Buffer.from(stable(args), 'utf8')),
  };
  return { descriptor, descriptor_sha256: sha256(Buffer.from(stable(descriptor))), command: binary.command_path, args, input, dispatcherPrompt };
}

export function nativeDispatchContract(descriptor) {
  const { write_roots, ...contract } = descriptor;
  return {
    schema_version: 'luca.native-dispatch-contract.v1',
    descriptor: contract,
    contract_sha256: sha256(Buffer.from(stable(contract), 'utf8')),
  };
}

function verifyCandidateDispatchContract(candidateLauncher, launch, root, harness, role, packet, projectionMode) {
  const args = [candidateLauncher, 'describe-contract', '--root', root, '--harness', harness,
    '--role', role, '--dispatcher-id', launch.descriptor.dispatcher_id, '--projection-mode', projectionMode];
  if (role === 'work-agent') args.push('--packet', packet.path);
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: cleanGitEnv(),
    input: '',
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0 || result.stderr) fail(`candidate describe-contract failed for ${harness}/${role}`);
  const lines = result.stdout.split('\n');
  if (lines.length !== 3 || lines[1] !== 'NATIVE_DISPATCH_CONTRACT_READY' || lines[2] !== '') {
    fail(`candidate describe-contract framing is not exact for ${harness}/${role}`);
  }
  let observed;
  try { observed = JSON.parse(lines[0]); } catch { fail(`candidate describe-contract is not JSON for ${harness}/${role}`); }
  const expected = nativeDispatchContract(launch.descriptor);
  if (stable(observed) !== stable(expected)) fail(`candidate/native TCB dispatch contract mismatch for ${harness}/${role}`);
  return expected.contract_sha256;
}

function assertNoClaudeBroadening(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} is not a settings object`);
  if (value.sandbox === undefined) return;
  const box = value.sandbox;
  if (!box || typeof box !== 'object' || Array.isArray(box)) fail(`${label} has invalid sandbox`);
  if (box.enabled === false || box.failIfUnavailable === false || box.allowUnsandboxedCommands === true
    || box.filesystem?.disabled === true) fail(`${label} broadens/weakens sandbox`);
  if (box.excludedCommands !== undefined && (!Array.isArray(box.excludedCommands) || box.excludedCommands.length)) fail(`${label} excludes sandbox commands`);
  if (box.filesystem?.allowWrite !== undefined && (!Array.isArray(box.filesystem.allowWrite) || box.filesystem.allowWrite.length)) fail(`${label} adds sandbox write roots`);
}

function settingsSource(path, kind) {
  if (!existsSync(path)) return { path, kind, present: false, sha256: null };
  const real = realpathSync(path);
  const bytes = readFileSync(real);
  let value;
  if (kind === 'json') {
    try { value = JSON.parse(bytes.toString('utf8')); } catch { fail(`invalid Claude settings ${real}`); }
  } else {
    const probe = spawnSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', real], { encoding: 'utf8', input: '', timeout: 20_000 });
    if (probe.status !== 0) fail(`cannot inspect managed settings ${real}`);
    try { value = JSON.parse(probe.stdout); } catch { fail(`invalid managed settings ${real}`); }
  }
  assertNoClaudeBroadening(value, real);
  return { path: real, kind, present: true, sha256: sha256(bytes) };
}

function matcherCoversAgent(matcher) {
  try { return new RegExp(matcher).test('Agent'); } catch { return false; }
}

async function listNativeCodexHooks(root, frozenBytes, expected) {
  const binary = process.env.LUCA_CODEX_BIN || '/Users/luca/.local/bin/codex';
  const child = spawn(binary, ['-C', root, 'app-server'], { stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += String(chunk); });
  child.stderr.on('data', (chunk) => { stderr += String(chunk); });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { clientInfo: { name: 'luca-u008-tcb', title: 'luca U008 TCB', version: '2.0.0' } } })}\n`);
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'hooks/list', params: {} })}\n`);
  const outcome = await new Promise((resolveOutcome) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(poll);
      try { child.kill('SIGTERM'); } catch { }
      resolveOutcome(value);
    };
    const timer = setTimeout(() => finish('timeout'), 15_000);
    const poll = setInterval(() => {
      const messages = stdout.split('\n').flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
      if (messages.some((message) => message.id === 2)) finish('response');
    }, 20);
    child.once('error', () => finish('error'));
    child.once('close', () => finish('closed'));
  });
  if (outcome !== 'response') fail(`Codex hooks/list ${outcome}: ${stderr.slice(0, 500)}`);
  const messages = stdout.split('\n').flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
  const listed = messages.find((message) => message.id === 2)?.result?.data || [];
  const hooks = listed.flatMap((group) => group.hooks || []).filter((hook) => /codex-hook-adapter\.mjs/.test(hook.command || ''));
  if (hooks.length !== expected.length) fail('native hooks/list has missing/extra repository adapter hooks');
  const runtime = [];
  for (const item of expected) {
    const hook = hooks.find((candidate) => String(candidate.key || '').endsWith(item.suffix));
    const nativeEvent = item.event_name[0].toLowerCase() + item.event_name.slice(1);
    if (!hook || hook.eventName !== nativeEvent || hook.command !== item.command
      || hook.trustStatus !== 'trusted' || !/^sha256:[a-f0-9]{64}$/.test(hook.currentHash || '')) fail(`native hook mismatch ${item.suffix}`);
    const configPath = hook.key.slice(0, -item.suffix.length);
    if (!existsSync(configPath) || sha256(readFileSync(realpathSync(configPath))) !== sha256(frozenBytes)) fail('runtime hook config does not equal frozen checkout bytes');
    runtime.push({ key: hook.key, event_name: hook.eventName, command: hook.command, command_sha256: sha256(Buffer.from(hook.command)), current_hash: hook.currentHash, trust_status: hook.trustStatus });
  }
  return runtime.sort((a, b) => a.key.localeCompare(b.key));
}

async function runtimeAttestations(root) {
  const claudePath = join(root, '.claude/settings.json');
  const claudeBytes = readFileSync(claudePath);
  let claude;
  try { claude = JSON.parse(claudeBytes.toString('utf8')); } catch { fail('invalid Claude project settings'); }
  assertNoClaudeBroadening(claude, claudePath);
  const allMatchers = (claude?.hooks?.PostToolUse || []).map((entry) => entry.matcher).filter((value) => typeof value === 'string');
  const post = (claude?.hooks?.PostToolUse || []).filter((entry) => matcherCoversAgent(entry.matcher));
  if (!post.length) fail('no configured PostToolUse matcher actually matches Agent');
  const postHooks = post.flatMap((entry) => (entry.hooks || []).map((hook) => ({ matcher: entry.matcher, command_sha256: sha256(Buffer.from(hook.command || '')) })));
  if (!postHooks.length) fail('Agent matcher has no PostToolUse hook');
  const codexPath = join(root, '.codex/hooks.json');
  const codexBytes = readFileSync(codexPath);
  let codex;
  try { codex = JSON.parse(codexBytes.toString('utf8')); } catch { fail('invalid Codex hooks config'); }
  exactKeys(codex, ['description', 'hooks'], 'Codex hooks config');
  const expected = [];
  const snake = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  for (const [event, groups] of Object.entries(codex.hooks || {})) groups.forEach((group, gi) => (group.hooks || []).forEach((hook, hi) => {
    if (/codex-hook-adapter\.mjs/.test(hook.command || '')) expected.push({ suffix: `:${snake(event)}:${gi}:${hi}`, event_name: event, command: hook.command });
  }));
  const runtime = await listNativeCodexHooks(root, codexBytes, expected);
  const configPath = join(process.env.CODEX_HOME || join(process.env.HOME || '', '.codex'), 'config.toml');
  const configBytes = readFileSync(configPath);
  const configText = configBytes.toString('utf8');
  if (runtime.some((entry) => !configText.includes(`[hooks.state."${entry.key}"]`) || !configText.includes(entry.current_hash))) fail('native trusted hook state is absent/stale');
  return {
    claude_settings_path: relative(root, claudePath),
    claude_settings_sha256: sha256(claudeBytes),
    claude_post_tool_use_agent_hooks: postHooks,
    claude_settings_sources: [
      settingsSource(claudePath, 'json'),
      settingsSource('/Library/Application Support/ClaudeCode/managed-settings.json', 'json'),
      settingsSource('/Library/Managed Preferences/com.anthropic.claudecode.plist', 'plist'),
    ],
    codex_hooks_path: relative(root, codexPath),
    codex_hooks_sha256: sha256(codexBytes),
    codex_config_path: realpathSync(configPath),
    codex_config_sha256: sha256(configBytes),
    codex_hook_runtime: runtime,
  };
}

function textOnly(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter((part) => part?.type === 'text').map((part) => part.text || '').join('');
}

function claudeThinkingOnly(event) {
  const content = event?.message?.content;
  if (!Array.isArray(content) || content.length !== 1) return false;
  const part = content[0];
  return part?.type === 'thinking'
    && stable(Object.keys(part).sort()) === stable(['signature', 'thinking', 'type'])
    && typeof part.thinking === 'string'
    && typeof part.signature === 'string' && part.signature.length > 0;
}

function projectionMatches(alias, model) {
  return typeof model === 'string' && new RegExp(`^claude-${alias.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?:-|$)`, 'i').test(model);
}

function assertClaudeInit(init, run, label = 'Claude init') {
  const agents = Array.isArray(init?.agents) ? init.agents : [];
  const tools = Array.isArray(init?.tools) ? init.tools : [];
  const uniqueAgents = agents.length === new Set(agents).size && agents.every((agent) => typeof agent === 'string');
  const exactNativeDispatcherTool = stable(tools) === stable(['Task']) || stable(tools) === stable(['Agent']);
  if (init?.cwd !== run.descriptor.cwd || init?.permissionMode !== 'dontAsk' || !uniqueAgents
    || agents.filter((agent) => agent === 'u008-dispatcher').length !== 1
    || agents.filter((agent) => agent === run.role).length !== 1 || !exactNativeDispatcherTool) {
    fail(`${label} is not the frozen dispatcher`);
  }
}

const containsToolInvocation = (value) => {
  if (Array.isArray(value)) return value.some(containsToolInvocation);
  if (!value || typeof value !== 'object') return false;
  if (['tool_use', 'server_tool_use', 'mcp_tool_use'].includes(String(value.type || '').toLowerCase())) return true;
  if (typeof value.tool_use_id === 'string' && value.tool_use_id) return true;
  return Object.values(value).some(containsToolInvocation);
};

export function classifyClaudeModelProbe({ status, stdout, stderr, expectedAlias, expectedCwd }) {
  if (!Number.isInteger(status) || !Buffer.isBuffer(stdout) || !Buffer.isBuffer(stderr)
    || !/^[A-Za-z0-9._-]+$/.test(expectedAlias || '') || !isAbsolute(expectedCwd || '')
    || resolve(expectedCwd) !== expectedCwd) {
    fail('Claude model probe classifier input is invalid');
  }
  if (stderr.length) fail('Claude model probe wrote stderr');
  const events = parseJsonl(stdout, 'Claude safe-mode model probe');
  if (events.some(containsToolInvocation)) fail('Claude safe-mode model probe invoked a tool');
  if (events.length !== 4) fail('Claude safe-mode model probe must contain exactly four events');
  const [init, rate, assistant, result] = events;
  const sessionId = init?.session_id;
  if (init?.type !== 'system' || init?.subtype !== 'init'
    || rate?.type !== 'rate_limit_event' || assistant?.type !== 'assistant' || result?.type !== 'result'
    || init.cwd !== expectedCwd || init.permissionMode !== 'dontAsk'
    || stable(init.tools) !== stable([]) || !projectionMatches(expectedAlias, init.model)) {
    fail('Claude safe-mode model probe ordered transport/init is not exact');
  }
  if (typeof sessionId !== 'string' || !sessionId
    || !events.every((event) => event.session_id === sessionId)) {
    fail('Claude safe-mode model probe session binding is not exact');
  }
  const content = assistant?.message?.content;
  const assistantText = Array.isArray(content) && content.length === 1
    && content[0]?.type === 'text' && typeof content[0]?.text === 'string'
    ? content[0].text : null;
  if (status === 0 && result.subtype === 'success' && result.is_error === false
    && result.result === 'LUCA_CLAUDE_MODEL_PROBE_OK' && result.terminal_reason === 'completed'
    && rate?.rate_limit_info?.status === 'allowed'
    && assistant.parent_tool_use_id === null
    && assistant?.message?.model === init.model && projectionMatches(expectedAlias, assistant.message.model)
    && assistantText === 'LUCA_CLAUDE_MODEL_PROBE_OK') {
    return { outcome: 'available', resolved_model: assistant.message.model };
  }
  const expectedCredits = /^Fable(?:\s+\d+(?:\.\d+)*)?\s+requires usage credits\.(?: Run \/usage-credits to continue or switch models with \/model\.)?$/;
  if (expectedAlias === 'fable' && status === 1
    && rate?.rate_limit_info?.status === 'rejected'
    && rate?.rate_limit_info?.errorCode === 'credits_required'
    && assistant.parent_tool_use_id === null
    && assistant?.message?.model === '<synthetic>' && assistant.is_api_error_message === true
    && assistant.error === 'rate_limit' && assistantText === result.result
    && result.is_error === true && result.subtype === 'success'
    && result.api_error_status === 429 && result.terminal_reason === 'api_error'
    && expectedCredits.test(String(result.result || ''))) {
    return { outcome: 'credits_required', resolved_model: null };
  }
  fail('Claude safe-mode model probe result is not exact success or explicit credits_required');
}

function assertClaudeWorkResult(events, bashId, parentSpawnId, sentinel) {
  const linked = [];
  const allChildResults = [];
  for (const event of events) {
    const parts = Array.isArray(event?.message?.content) ? event.message.content : [];
    for (const part of parts) if (part?.type === 'tool_result') {
      if (event.parent_tool_use_id) allChildResults.push({ event, part });
      if (part.tool_use_id === bashId) linked.push({ event, part });
    }
  }
  if (allChildResults.length !== 1 || linked.length !== 1
    || linked[0].event?.parent_tool_use_id !== parentSpawnId) {
    fail('Claude work verification must have exactly one result bound to the sole Bash call');
  }
  const { event, part } = linked[0];
  exactKeys(part, ['type', 'tool_use_id', 'content', 'is_error'], 'Claude Bash tool_result');
  // Claude stream-json reports Bash success as is_error:false and strips the
  // command's one terminal newline from content.  Together with the frozen
  // printf command this is the native structured equivalent of exit=0,
  // normalized stdout=sentinel, stderr=""; accepting substring prose would allow a
  // sentinel-before-failure transcript to masquerade as success.
  if (part.is_error !== false || typeof part.content !== 'string' || part.content !== sentinel) {
    fail('Claude work verification result is not exact structured zero-exit sentinel output');
  }
  if (Object.hasOwn(event, 'tool_use_result')) {
    fail('Claude Bash result has a duplicate/ambiguous snake-case result representation');
  }
  if (Object.hasOwn(event, 'toolUseResult')) {
    exactKeys(event.toolUseResult,
      ['stdout', 'stderr', 'interrupted', 'isImage', 'noOutputExpected'], 'Claude Bash detailed result');
    if (event.toolUseResult.stdout !== sentinel || event.toolUseResult.stderr !== ''
      || event.toolUseResult.interrupted !== false || event.toolUseResult.isImage !== false
      || event.toolUseResult.noOutputExpected !== false) {
      fail('Claude Bash detailed result is not exact zero-exit stdout/stderr state');
    }
  }
}

function parseClaude(bytes, run, runtime, packet, expectedConcreteModel) {
  const events = parseJsonl(bytes, 'Claude transport');
  const indexed = events.map((event, index) => ({ event, index }));
  const inits = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'init');
  if (inits.length !== 1) fail('Claude transport must contain exactly one init');
  const init = inits[0].event;
  assertClaudeInit(init, run);
  const sessions = new Set(events.map((event) => event?.session_id).filter(Boolean));
  if (sessions.size !== 1) fail('Claude transport must have one session');
  const parentId = [...sessions][0];
  if (!events.every((event) => event?.session_id === parentId)) fail('Claude transport event lacks exact session binding');
  const parentToolUses = [];
  const childToolUses = [];
  for (const { event, index } of indexed) {
    if (event?.type !== 'assistant') continue;
    for (const item of event?.message?.content || []) if (item?.type === 'tool_use') {
      (event.parent_tool_use_id ? childToolUses : parentToolUses).push({ item, index });
    }
  }
  const allowedInput = new Set(['subagent_type', 'prompt', 'description', 'run_in_background']);
  if (parentToolUses.length !== 1 || parentToolUses[0].item.name !== 'Agent'
    || !parentToolUses[0].item.input
    || Object.keys(parentToolUses[0].item.input).some((key) => !allowedInput.has(key))
    || parentToolUses[0].item.input.subagent_type !== run.role
    || parentToolUses[0].item.input.run_in_background !== false) fail('Claude dispatcher action graph is not exclusive');
  if (run.role !== 'work-agent' && childToolUses.length) fail('read-only Claude child called a tool');
  if (childToolUses.some(({ item }) => item.name !== 'Bash')) fail('Claude child called a non-Bash tool');
  const childToolResults = indexed.flatMap(({ event, index }) => {
    const parts = Array.isArray(event?.message?.content) ? event.message.content : [];
    return parts.filter((part) => part?.type === 'tool_result' && event.parent_tool_use_id)
      .map((part) => ({ event, index, part }));
  });
  if (run.role !== 'work-agent' && childToolResults.length) fail('read-only Claude child emitted a tool result');
  const tool = parentToolUses[0];
  const toolContent = indexed[tool.index]?.event?.message?.content;
  if (!Array.isArray(toolContent) || toolContent.length !== 1 || toolContent[0] !== tool.item) {
    fail('Claude dispatcher Agent message is not exclusive');
  }
  const childAssistantEvents = indexed.filter(({ event }) => event?.type === 'assistant' && event.parent_tool_use_id);
  if (childAssistantEvents.some(({ event }) => event.parent_tool_use_id !== tool.item.id
    || event.subagent_type !== run.role)) fail('Claude forwarded child assistant identity mismatch');
  const prompt = tool.item.input?.prompt;
  if (typeof prompt !== 'string' || sha256(Buffer.from(prompt)) !== run.descriptor.input_sha256) fail('Claude child prompt hash mismatch');
  const starts = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'task_started'
    && event.tool_use_id === tool.item.id && event.subagent_type === run.role && event.prompt === prompt);
  const allStarts = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'task_started');
  if (allStarts.length !== 1 || starts.length !== 1 || starts[0].index <= tool.index) fail('Claude native task_started edge mismatch');
  const childId = starts[0].event.task_id;
  if (typeof childId !== 'string' || !childId || childId === parentId) fail('Claude child identity is missing/not distinct');
  const launches = indexed.filter(({ event }) => event?.type === 'user' && event?.tool_use_result?.status === 'async_launched'
    && event.tool_use_result.agentId === childId && event.tool_use_result.prompt === prompt);
  const completedReceipts = indexed.filter(({ event }) => event?.type === 'user' && event?.tool_use_result?.status === 'completed'
    && event.tool_use_result.agentId === childId && event.tool_use_result.prompt === prompt);
  const allNativeResults = indexed.filter(({ event }) => event?.type === 'user' && Object.hasOwn(event, 'tool_use_result'));
  if (allNativeResults.length !== 1
    || !((launches.length === 1 && completedReceipts.length === 0)
      || (launches.length === 0 && completedReceipts.length === 1))) {
    fail('Claude launch/completion result mismatch');
  }
  const postStarts = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'hook_started' && event.hook_event === 'PostToolUse' && event.hook_name === 'PostToolUse:Agent');
  const postResponses = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'hook_response' && event.hook_event === 'PostToolUse'
    && event.hook_name === 'PostToolUse:Agent' && event.exit_code === 0 && event.outcome === 'success');
  const allPostResponses = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'hook_response'
    && event.hook_event === 'PostToolUse' && event.hook_name === 'PostToolUse:Agent');
  if (postStarts.length !== 1 || allPostResponses.length !== 1 || postResponses.length !== 1
    || typeof postStarts[0].event.hook_id !== 'string' || !postStarts[0].event.hook_id
    || typeof postResponses[0].event.hook_id !== 'string' || !postResponses[0].event.hook_id
    || postStarts[0].event.hook_id !== postResponses[0].event.hook_id
    || postStarts[0].index <= starts[0].index || postResponses[0].index <= postStarts[0].index
    || !runtime.claude_post_tool_use_agent_hooks.some(({ matcher }) => matcherCoversAgent(matcher))) fail('Claude Agent hook edge is not bound to an effective matcher');
  const childMessages = childAssistantEvents;
  const completions = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'task_notification'
    && event.task_id === childId && event.tool_use_id === tool.item.id && event.status === 'completed');
  const allCompletions = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'task_notification');
  const expected = run.role === 'work-agent' ? packet.expected_output : `LUCA_NATIVE_${run.role.replaceAll('-', '_').toUpperCase()}_RESULT`;
  const frozenCommands = run.role === 'work-agent'
    ? packet.packet.verification.map((entry) => entry.command) : [];
  let resolvedModel;
  let output;
  if (launches.length === 1) {
    const launch = launches[0];
    const expectedToolUses = frozenCommands.length;
    const actualToolUses = childToolUses.length;
    const childTextMessages = childAssistantEvents.filter(({ event }) => Array.isArray(event.message?.content)
      && event.message.content.some((part) => part?.type === 'text'));
    const childToolMessages = childAssistantEvents.filter(({ event }) => Array.isArray(event.message?.content)
      && event.message.content.some((part) => part?.type === 'tool_use'));
    const childThinkingMessages = childAssistantEvents.filter(({ event }) => claudeThinkingOnly(event));
    const childOutputMessage = childTextMessages[0];
    const exactChildMessageShapes = childAssistantEvents.every(({ event }) => claudeThinkingOnly(event)
      || (Array.isArray(event.message?.content) && event.message.content.length === 1
        && ['text', 'tool_use'].includes(event.message.content[0]?.type)));
    const parentAssistants = indexed.filter(({ event }) => event?.type === 'assistant' && !event.parent_tool_use_id);
    const parentThinkingMessages = parentAssistants.filter(({ event }) => claudeThinkingOnly(event));
    const parentEvidenceMessages = parentAssistants.filter(({ event }) => !claudeThinkingOnly(event));
    const parentModel = indexed[tool.index].event.message?.model;
    const legacyUserEvents = indexed.filter(({ event, index }) => event?.type === 'user'
      && index > starts[0].index && index < (completions[0]?.index ?? Number.POSITIVE_INFINITY));
    const expectedLegacyUserIndexes = [launch.index,
      ...(run.role === 'work-agent' ? [childToolResults[0]?.index] : [])];
    const exactLegacyUserSet = legacyUserEvents.length === expectedLegacyUserIndexes.length
      && expectedLegacyUserIndexes.every((index) => Number.isInteger(index)
        && legacyUserEvents.some((record) => record.index === index));
    if (launch.index <= postResponses[0].index || allCompletions.length !== 1 || completions.length !== 1
      || !exactLegacyUserSet || !exactChildMessageShapes || childTextMessages.length !== 1
      || childToolMessages.length !== actualToolUses
      || childAssistantEvents.length !== childThinkingMessages.length + actualToolUses + 1
      || actualToolUses !== expectedToolUses || childOutputMessage.event.message.content[0].text !== expected
      || childAssistantEvents.some(({ index }) => index <= launch.index || index >= completions[0].index)
      || childOutputMessage.index !== Math.max(...childAssistantEvents.map(({ index }) => index))
      || parentEvidenceMessages.length !== 1 || parentEvidenceMessages[0].index !== tool.index
      || typeof parentModel !== 'string' || !parentModel
      || parentThinkingMessages.some(({ event, index }) => index >= tool.index || event.message?.model !== parentModel)
      || (run.role === 'work-agent' && (childToolResults.length !== 1
        || childToolResults[0].index <= childToolUses[0]?.index
        || childOutputMessage.index <= childToolResults[0].index))) fail('Claude legacy child completion edge mismatch');
    if (run.role === 'work-agent') {
      const observedCommands = childToolUses.map(({ item }) => item.input?.command);
      if (observedCommands.some((command) => typeof command !== 'string')
        || stable([...observedCommands].sort()) !== stable([...frozenCommands].sort())) fail('Claude work child Bash calls are not the exact frozen verification commands');
      const bashId = childToolUses[0]?.item?.id;
      assertClaudeWorkResult(events, bashId, tool.item.id, packet.verification_sentinel);
    }
    resolvedModel = launch.event.tool_use_result.resolvedModel;
    output = childTextMessages.map(({ event }) => textOnly(event.message?.content)).join('\n').trim();
  } else {
    const receipt = completedReceipts[0];
    const allChildPrompts = indexed.filter(({ event }) => event?.type === 'user'
      && event.message?.role === 'user' && Array.isArray(event.message.content)
      && event.message.content.length === 1 && event.message.content[0]?.type === 'text');
    const childPrompts = allChildPrompts.filter(({ event }) => event.parent_tool_use_id === tool.item.id
      && event.subagent_type === run.role && event.message.content[0].text === prompt);
    const updates = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'task_updated'
      && event.task_id === childId && event.patch?.status === 'completed'
      && Number.isFinite(event.patch?.end_time));
    const allUpdates = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'task_updated');
    const evidenceUserEvents = indexed.filter(({ event, index }) => event?.type === 'user'
      && index > starts[0].index && index <= receipt.index);
    const expectedEvidenceUserIndexes = [childPrompts[0]?.index,
      ...(run.role === 'work-agent' ? [childToolResults[0]?.index] : []), receipt.index];
    const exactEvidenceUserSet = evidenceUserEvents.length === expectedEvidenceUserIndexes.length
      && expectedEvidenceUserIndexes.every((index) => Number.isInteger(index)
        && evidenceUserEvents.some((record) => record.index === index));
    const expectedToolUses = frozenCommands.length;
    const actualToolUses = childToolUses.length;
    const childTextMessages = childAssistantEvents.filter(({ event }) => Array.isArray(event.message?.content)
      && event.message.content.some((part) => part?.type === 'text'));
    const childToolMessages = childAssistantEvents.filter(({ event }) => Array.isArray(event.message?.content)
      && event.message.content.some((part) => part?.type === 'tool_use'));
    const childThinkingMessages = childAssistantEvents.filter(({ event }) => claudeThinkingOnly(event));
    const childOutputMessage = childTextMessages[0];
    const exactChildMessageShapes = childAssistantEvents.every(({ event }) => claudeThinkingOnly(event)
      || (Array.isArray(event.message?.content) && event.message.content.length === 1
        && ['text', 'tool_use'].includes(event.message.content[0]?.type)));
    if (allChildPrompts.length !== 1 || childPrompts.length !== 1 || childPrompts[0].index <= starts[0].index
      || allUpdates.length !== 1 || updates.length !== 1 || updates[0].index <= childPrompts[0].index
      || !exactEvidenceUserSet
      || childMessages.some(({ index }) => index <= childPrompts[0].index || index >= updates[0].index)
      || !exactChildMessageShapes || childTextMessages.length !== 1
      || childToolMessages.length !== actualToolUses
      || childAssistantEvents.length !== childThinkingMessages.length + actualToolUses + 1
      || childOutputMessage.event.message.content[0].text !== expected
      || childOutputMessage.index !== Math.max(...childAssistantEvents.map(({ index }) => index))
      || (run.role === 'work-agent' && (childToolResults.length !== 1
        || childToolResults[0].index <= childToolUses[0]?.index || childToolResults[0].index >= updates[0].index
        || childOutputMessage.index <= childToolResults[0].index))
      || allCompletions.length !== 1 || completions.length !== 1 || completions[0].index <= updates[0].index
      || postStarts[0].index <= completions[0].index || receipt.index <= postResponses[0].index) {
      fail('Claude completed child task lifecycle mismatch');
    }
    const detail = receipt.event.tool_use_result;
    const structuredContent = detail.content;
    if (receipt.event.parent_tool_use_id !== null || receipt.event.message?.role !== 'user'
      || detail.agentType !== run.role || detail.resolvedModel !== expectedConcreteModel
      || !Array.isArray(structuredContent) || structuredContent.length !== 1
      || structuredContent[0]?.type !== 'text' || structuredContent[0]?.text !== expected
      || !Number.isInteger(detail.totalTokens) || detail.totalTokens < 0
      || !Number.isInteger(detail.totalDurationMs) || detail.totalDurationMs < 0
      || actualToolUses !== expectedToolUses || detail.totalToolUseCount !== actualToolUses
      || completions[0].event.summary !== expected
      || completions[0].event.usage?.tool_uses !== actualToolUses) {
      fail('Claude completed native result binding mismatch');
    }
    const parentContent = receipt.event.message?.content;
    const parentToolResult = Array.isArray(parentContent) && parentContent.length === 1 ? parentContent[0] : null;
    const resultParts = parentToolResult?.content;
    const expectedMetadata = `agentId: ${childId} (use SendMessage with to: '${childId}', summary: '<5-10 word recap>' to continue this agent)\n<usage>subagent_tokens: ${detail.totalTokens}\ntool_uses: ${detail.totalToolUseCount}\nduration_ms: ${detail.totalDurationMs}</usage>`;
    if (parentToolResult?.type !== 'tool_result' || parentToolResult.tool_use_id !== tool.item.id
      || !Array.isArray(resultParts) || resultParts.length !== 2
      || resultParts[0]?.type !== 'text' || resultParts[0]?.text !== expected
      || resultParts[1]?.type !== 'text' || resultParts[1]?.text !== expectedMetadata) {
      fail('Claude completed parent tool_result is not exact');
    }
    if (run.role === 'work-agent') {
      const observedCommands = childToolUses.map(({ item }) => item.input?.command);
      if (observedCommands.some((command) => typeof command !== 'string')
        || stable([...observedCommands].sort()) !== stable([...frozenCommands].sort())) fail('Claude forwarded work child Bash calls differ from the frozen commands');
      const bashId = childToolUses[0]?.item?.id;
      assertClaudeWorkResult(events, bashId, tool.item.id, packet.verification_sentinel);
    }
    const parentOutputs = indexed.filter(({ event, index }) => index > receipt.index && event?.type === 'assistant'
      && !event.parent_tool_use_id && Array.isArray(event.message?.content)
      && event.message.content.length === 1 && event.message.content[0]?.type === 'text'
      && event.message.content[0]?.text === expected);
    const parentAssistants = indexed.filter(({ event }) => event?.type === 'assistant' && !event.parent_tool_use_id);
    const parentThinkingMessages = parentAssistants.filter(({ event }) => claudeThinkingOnly(event));
    const parentEvidenceMessages = parentAssistants.filter(({ event }) => !claudeThinkingOnly(event));
    const parentModel = indexed[tool.index].event.message?.model;
    const terminal = indexed.filter(({ event }) => event?.type === 'result' && event?.subtype === 'success'
      && event.is_error === false && event.result === expected && event.terminal_reason === 'completed');
    const allTerminal = indexed.filter(({ event }) => event?.type === 'result');
    const childText = childMessages.map(({ event }) => textOnly(event.message?.content)).filter(Boolean).join('\n').trim();
    if (parentEvidenceMessages.length !== 2 || parentOutputs.length !== 1
      || typeof parentModel !== 'string' || !parentModel
      || parentThinkingMessages.some(({ event, index }) => index >= tool.index || event.message?.model !== parentModel)
      || parentOutputs[0].event.message?.model !== parentModel
      || !childMessages.length || childText !== expected
      || allTerminal.length !== 1 || terminal.length !== 1
      || terminal[0].index <= parentOutputs[0].index) fail('Claude completed dispatcher result is not exact');
    resolvedModel = detail.resolvedModel;
    output = structuredContent[0].text;
  }
  if (typeof expectedConcreteModel !== 'string' || !expectedConcreteModel
    || resolvedModel !== expectedConcreteModel
    || childMessages.some(({ event }) => event.message?.model !== resolvedModel)) fail('Claude routed concrete model mismatch');
  if (output !== expected) fail('Claude child text output is not the exact frozen result');
  return { parent_id: parentId, child_id: childId, spawn_id: tool.item.id, output, observed_input_sha256: sha256(Buffer.from(prompt)), observed_projection: resolvedModel, event_count: events.length };
}

function dateDirs(base) {
  const out = [];
  if (!existsSync(base)) return out;
  for (const year of readdirSync(base)) {
    const yp = join(base, year); if (!statSync(yp).isDirectory()) continue;
    for (const month of readdirSync(yp)) {
      const mp = join(yp, month); if (!statSync(mp).isDirectory()) continue;
      for (const day of readdirSync(mp)) { const dp = join(mp, day); if (statSync(dp).isDirectory()) out.push(dp); }
    }
  }
  return out;
}

function rolloutIndex() {
  const base = join(process.env.CODEX_HOME || join(process.env.HOME || '', '.codex'), 'sessions');
  const map = new Map();
  for (const dir of dateDirs(base)) for (const name of readdirSync(dir)) {
    if (!name.endsWith('.jsonl')) continue;
    const path = join(dir, name); const bytes = readFileSync(path);
    try { const first = JSON.parse(bytes.toString('utf8').split('\n', 1)[0]); if (first?.type === 'session_meta' && first.payload?.id) map.set(first.payload.id, { path, bytes, first }); } catch { }
  }
  return map;
}

function appServerItem(message) {
  const item = message?.params?.item || message?.item || message?.result?.item;
  return item && typeof item === 'object' ? item : null;
}

function codexItemEvents(messages) {
  const events = messages.map((message, index) => ({ message, index, item: appServerItem(message) }))
    .filter(({ message }) => ['item/started', 'item/completed'].includes(message?.method));
  const pairs = new Map();
  for (const event of events) {
    const timestampKey = event.message.method === 'item/started' ? 'startedAtMs' : 'completedAtMs';
    exactKeys(event.message.params, ['item', 'threadId', 'turnId', timestampKey], `Codex ${event.message.method} params`);
    if (!UUID_RE.test(event.message.params.threadId || '')
      || !UUID_RE.test(event.message.params.turnId || '') || !Number.isInteger(event.message.params[timestampKey])
      || event.message.params[timestampKey] < 0 || !event.item || typeof event.item.id !== 'string' || !event.item.id) {
      fail(`Codex ${event.message.method} envelope is not schema-conformant`);
    }
    const key = `${event.message.params.threadId}/${event.message.params.turnId}/${event.item.type}/${event.item.id}`;
    const pair = pairs.get(key) || [];
    pair.push(event); pairs.set(key, pair);
  }
  for (const pair of pairs.values()) {
    if (pair.length !== 2 || pair[0].message.method !== 'item/started' || pair[1].message.method !== 'item/completed'
      || pair[0].index >= pair[1].index || pair[0].message.params.startedAtMs > pair[1].message.params.completedAtMs) {
      fail('Codex item lifecycle is not one ordered start/completion pair');
    }
  }
  return events;
}

function assertStrictOrder(label, ...indices) {
  if (indices.some((index) => !Number.isInteger(index) || index < 0)
    || indices.some((index, position) => position > 0 && indices[position - 1] >= index)) {
    fail(`${label} violates the required strict partial order`);
  }
}

function assertCodexTurn(turn, expectedStatus, label) {
  if (!turn || !UUID_RE.test(turn.id || '') || !Array.isArray(turn.items) || turn.status !== expectedStatus) {
    fail(`${label} is not a schema-conformant Turn`);
  }
  const allowed = new Set(['id', 'items', 'itemsView', 'status', 'error', 'startedAt', 'completedAt', 'durationMs']);
  if (Object.keys(turn).some((key) => !allowed.has(key))) fail(`${label} has an unknown Turn field`);
}

function assertCodexThread(thread, expectedId, root, label) {
  const required = ['cliVersion', 'createdAt', 'cwd', 'ephemeral', 'id', 'modelProvider', 'preview',
    'sessionId', 'source', 'status', 'turns', 'updatedAt'];
  if (!thread || required.some((key) => !Object.hasOwn(thread, key)) || thread.id !== expectedId
    || thread.sessionId !== expectedId || thread.cwd !== root || !Array.isArray(thread.turns)
    || typeof thread.ephemeral !== 'boolean' || typeof thread.cliVersion !== 'string'
    || typeof thread.modelProvider !== 'string' || typeof thread.preview !== 'string'
    || typeof thread.source !== 'string' || !thread.status || typeof thread.status !== 'object') {
    fail(`${label} is not a schema-conformant Thread`);
  }
}

function exactCodexWorkCommand(itemEvents, childId, childTurnId, root, packet) {
  const commands = itemEvents.filter(({ item }) => item?.type === 'commandExecution');
  if (commands.length !== 2 || commands[0].message.method !== 'item/started'
    || commands[1].message.method !== 'item/completed') fail('Codex work command has no exact public lifecycle');
  const [started, completed] = commands;
  const expectedKeys = ['type', 'id', 'pluginId', 'scriptPath', 'command', 'cwd', 'processId', 'source',
    'status', 'commandActions', 'aggregatedOutput', 'exitCode', 'durationMs'];
  exactKeys(started.item, expectedKeys, 'Codex started commandExecution');
  exactKeys(completed.item, expectedKeys, 'Codex completed commandExecution');
  const command = packet.packet.verification[0].command;
  const shellCommand = `/bin/zsh -lc "${command.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
  const action = [{ type: 'unknown', command }];
  if (!EXEC_ID_RE.test(started.item.id || '') || completed.item.id !== started.item.id
    || started.message.params.threadId !== childId || completed.message.params.threadId !== childId
    || started.message.params.turnId !== childTurnId || completed.message.params.turnId !== childTurnId
    || started.item.command !== shellCommand || completed.item.command !== shellCommand
    || started.item.cwd !== root || completed.item.cwd !== root
    || started.item.processId !== completed.item.processId || !/^\d+$/.test(started.item.processId || '')
    || started.item.source !== 'unifiedExecStartup' || completed.item.source !== 'unifiedExecStartup'
    || stable(started.item.commandActions) !== stable(action) || stable(completed.item.commandActions) !== stable(action)
    || started.item.status !== 'inProgress' || started.item.aggregatedOutput !== null
    || started.item.exitCode !== null || started.item.durationMs !== null
    || completed.item.status !== 'completed' || completed.item.aggregatedOutput !== `${packet.verification_sentinel}\n`
    || completed.item.exitCode !== 0 || !Number.isInteger(completed.item.durationMs) || completed.item.durationMs < 0
    || started.item.pluginId !== null || completed.item.pluginId !== null
    || started.item.scriptPath !== null || completed.item.scriptPath !== null) {
    fail('Codex work command/output/structured exit differs from the frozen smoke contract');
  }
}

function parseExactExecWrapper(source, cwd) {
  if (typeof source !== 'string' || source.length > 65_536 || /(?:\/\*|\/\/|`|\btools\s*\[)/.test(source)) {
    fail('Codex work child exec wrapper is not a bounded static wrapper');
  }
  const wrapper = source.match(/^\s*const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*await\s+tools\.exec_command\s*\(\s*\{([\s\S]*)\}\s*\)\s*;\s*text\s*\(\s*\1\.output\s*\)\s*;?\s*$/);
  if (!wrapper) fail('Codex work child exec wrapper is not the exact static form');
  const fields = {};
  let rest = wrapper[2];
  const entry = /^\s*(?:"([A-Za-z_][A-Za-z0-9_]*)"|([A-Za-z_][A-Za-z0-9_]*))\s*:\s*("(?:[^"\\]|\\.)*"|-?(?:0|[1-9][0-9]*)|true|false)\s*(?:,|$)/;
  while (rest.trim()) {
    const matched = rest.match(entry);
    if (!matched) fail('Codex work child exec options contain executable or non-literal syntax');
    const key = matched[1] || matched[2];
    if (Object.hasOwn(fields, key) || !['cmd', 'workdir', 'yield_time_ms', 'max_output_tokens'].includes(key)) {
      fail('Codex work child exec options contain a duplicate or unsafe field');
    }
    try { fields[key] = JSON.parse(matched[3]); } catch { fail('Codex work child exec option is not a JSON literal'); }
    rest = rest.slice(matched[0].length);
  }
  if (typeof fields.cmd !== 'string' || (fields.workdir !== undefined && fields.workdir !== cwd)
    || (fields['yield_time_ms'] !== undefined && (!Number.isInteger(fields['yield_time_ms']) || fields['yield_time_ms'] < 250 || fields['yield_time_ms'] > 30_000))
    || (fields.max_output_tokens !== undefined && (!Number.isInteger(fields.max_output_tokens) || fields.max_output_tokens < 1 || fields.max_output_tokens > 100_000))) {
    fail('Codex work child exec options are outside the frozen policy');
  }
  return fields.cmd;
}

function assertCodexTurnContext(context, mode, root, projection, label) {
  const box = context?.sandbox_policy || {};
  const permissions = context?.permission_profile || {};
  const entries = permissions.file_system?.entries;
  if (context?.cwd !== root || stable(context?.workspace_roots) !== stable([root])
    || context?.approval_policy !== 'never' || context?.effort !== projection
    || context?.collaboration_mode?.settings?.reasoning_effort !== projection
    || permissions.network !== 'restricted' || permissions.file_system?.type !== 'restricted'
    || !Array.isArray(entries) || entries.some((entry) => !['read', 'write'].includes(entry?.access))) {
    fail(`${label} context/routing/permission profile is not exact`);
  }
  const roots = box.writable_roots || box.writableRoots || [];
  const writes = entries.filter((entry) => entry.access === 'write');
  if (mode === 'read-only') {
    if (box.type !== 'read-only' || ![undefined, false].includes(box.network_access)
      || roots.length || writes.length
      || stable(entries) !== stable([{ path: { type: 'special', value: { kind: 'root' } }, access: 'read' }])) {
      fail(`${label} is not effective read-only/no-network`);
    }
    return;
  }
  if (mode !== 'workspace-write' || box.type !== 'workspace-write' || box.network_access !== false
    || box.exclude_tmpdir_env_var !== true || box.exclude_slash_tmp !== true || roots.length
    || writes.length !== 1 || writes.some((entry) => stable(entry.path) !== stable({ type: 'path', path: root }))) {
    fail(`${label} is not exact workspace-write/no-network`);
  }
  const filePolicy = context.file_system_sandbox_policy;
  if (!filePolicy || filePolicy.kind !== 'restricted' || stable(filePolicy.entries) !== stable(entries)) {
    fail(`${label} filesystem policy does not match the effective permission profile`);
  }
}

function parseCodex(publicBytes, before, run, packet) {
  const messages = parseJsonl(publicBytes, 'Codex app-server transport');
  const initialize = messages.filter((message) => String(message?.id) === '1' && !message.method);
  const threadResponse = messages.filter((message) => String(message?.id) === '2' && !message.method);
  const turnResponse = messages.filter((message) => String(message?.id) === '3' && !message.method);
  if (initialize.length !== 1 || initialize[0].error || !initialize[0].result
    || threadResponse.length !== 1 || threadResponse[0].error
    || turnResponse.length !== 1 || turnResponse[0].error) fail('Codex app-server request lifecycle failed');
  exactKeys(initialize[0].result, ['userAgent', 'codexHome', 'platformFamily', 'platformOs'], 'Codex initialize response');
  if (Object.values(initialize[0].result).some((value) => typeof value !== 'string' || !value)) {
    fail('Codex initialize response is not schema-conformant');
  }
  const parentId = threadResponse[0]?.result?.thread?.id;
  const turnId = turnResponse[0]?.result?.turn?.id;
  const threadStarts = messages.filter((message) => message?.method === 'thread/started'
    && (message?.params?.thread?.id || message?.params?.threadId) === parentId);
  const turnStarts = messages.filter((message) => message?.method === 'turn/started'
    && message?.params?.threadId === parentId && message?.params?.turn?.id === turnId);
  const turnEnds = messages.filter((message) => message?.method === 'turn/completed'
    && message?.params?.threadId === parentId && message?.params?.turn?.id === turnId);
  if (threadStarts.length !== 1 || turnStarts.length !== 1 || turnEnds.length !== 1) fail('Codex app-server parent lifecycle is not exact');
  for (const key of ['approvalPolicy', 'approvalsReviewer', 'cwd', 'model', 'modelProvider', 'sandbox', 'thread']) {
    if (!Object.hasOwn(threadResponse[0].result, key)) fail(`Codex thread/start response lacks ${key}`);
  }
  exactKeys(threadStarts[0].params, ['thread'], 'Codex thread/started params');
  exactKeys(turnStarts[0].params, ['threadId', 'turn'], 'Codex parent turn/started params');
  exactKeys(turnEnds[0].params, ['threadId', 'turn'], 'Codex parent turn/completed params');
  assertCodexThread(threadResponse[0].result.thread, parentId, run.descriptor.cwd, 'Codex thread/start response');
  assertCodexThread(threadStarts[0].params.thread, parentId, run.descriptor.cwd, 'Codex thread/started notification');
  assertCodexTurn(turnResponse[0].result.turn, 'inProgress', 'Codex turn/start response');
  assertCodexTurn(turnStarts[0].params.turn, 'inProgress', 'Codex parent turn/started notification');
  assertCodexTurn(turnEnds[0].params.turn, 'completed', 'Codex parent turn/completed notification');
  assertStrictOrder('Codex public request/thread/parent-turn lifecycle',
    messages.indexOf(initialize[0]), messages.indexOf(threadResponse[0]), messages.indexOf(threadStarts[0]),
    messages.indexOf(turnResponse[0]), messages.indexOf(turnStarts[0]), messages.indexOf(turnEnds[0]));
  if (!UUID_RE.test(parentId || '') || before.has(parentId) || !UUID_RE.test(turnId || '')
    || threadResponse[0]?.result?.approvalPolicy !== 'never' || threadResponse[0]?.result?.cwd !== run.descriptor.cwd
    || stable(threadResponse[0]?.result?.sandbox) !== stable(codexApiSandbox(run.descriptor.sandbox_contract.type))
    || stable(threadResponse[0]?.result?.runtimeWorkspaceRoots) !== stable([run.descriptor.cwd])
    || threadResponse[0]?.result?.reasoningEffort !== run.descriptor.projection
    || (threadStarts[0]?.params?.thread?.id || threadStarts[0]?.params?.threadId) !== parentId
    || turnStarts[0]?.params?.threadId !== parentId || turnStarts[0]?.params?.turn?.id !== turnId
    || turnEnds[0]?.params?.threadId !== parentId || turnEnds[0]?.params?.turn?.id !== turnId) fail('Codex app-server parent thread/turn edge mismatch');
  const itemEvents = codexItemEvents(messages);
  if (itemEvents.some(({ item }) => /collab/i.test(String(item?.type || ''))
    && item?.type !== 'collabAgentToolCall')) fail('Codex app-server emitted a non-native collaboration item');
  const activities = itemEvents.filter(({ item }) => item?.type === 'subAgentActivity');
  for (const { item } of activities) exactKeys(item, ['type', 'id', 'kind', 'agentThreadId', 'agentPath'], 'Codex subAgentActivity');
  if (activities.length !== 2 || activities[0].message.method !== 'item/started'
    || activities[1].message.method !== 'item/completed' || activities[0].index >= activities[1].index
    || activities.some(({ item }) => item.id !== activities[0].item.id || item.kind !== 'started'
      || item.agentThreadId !== activities[0].item.agentThreadId || item.agentPath !== activities[0].item.agentPath)) {
    fail('Codex app-server native spawn activity is not one exact lifecycle');
  }
  const publicSpawnId = activities[0].item.id;
  const publicChildId = activities[0].item.agentThreadId;
  if (!CALL_ID_RE.test(publicSpawnId || '') || !UUID_RE.test(publicChildId || '')
    || publicChildId === parentId || !String(activities[0].item.agentPath || '').endsWith(`/${run.descriptor.native_task_name}`)) {
    fail('Codex app-server native spawn identity/path binding mismatch');
  }
  if (activities.some(({ message }) => message.params.threadId !== parentId || message.params.turnId !== turnId)) {
    fail('Codex spawn activity is not bound to the parent turn');
  }
  const childTurnStarts = messages.filter((message) => message?.method === 'turn/started'
    && message?.params?.threadId === publicChildId);
  const childTurnEnds = messages.filter((message) => message?.method === 'turn/completed'
    && message?.params?.threadId === publicChildId);
  const publicChildTurnId = childTurnStarts[0]?.params?.turn?.id;
  if (childTurnStarts.length !== 1 || childTurnEnds.length !== 1 || !UUID_RE.test(publicChildTurnId || '')
    || childTurnEnds[0]?.params?.turn?.id !== publicChildTurnId
    || childTurnStarts[0]?.params?.turn?.status !== 'inProgress'
    || childTurnEnds[0]?.params?.turn?.status !== 'completed') {
    fail('Codex public child turn lifecycle is not exact');
  }
  exactKeys(childTurnStarts[0].params, ['threadId', 'turn'], 'Codex child turn/started params');
  exactKeys(childTurnEnds[0].params, ['threadId', 'turn'], 'Codex child turn/completed params');
  assertCodexTurn(childTurnStarts[0].params.turn, 'inProgress', 'Codex child turn/started notification');
  assertCodexTurn(childTurnEnds[0].params.turn, 'completed', 'Codex child turn/completed notification');
  const waitPair = itemEvents.filter(({ item }) => item?.type === 'collabAgentToolCall');
  for (const { item } of waitPair) exactKeys(item, ['type', 'id', 'tool', 'status', 'senderThreadId',
    'receiverThreadIds', 'prompt', 'model', 'reasoningEffort', 'agentsStates'], 'Codex collabAgentToolCall');
  if (waitPair.length !== 2 || waitPair[0].message.method !== 'item/started'
    || waitPair[1].message.method !== 'item/completed' || waitPair[0].index >= waitPair[1].index
    || waitPair.some(({ item }) => item.id !== waitPair[0].item.id || item.tool !== 'wait'
      || item.senderThreadId !== parentId || item.prompt !== null || item.model !== null
      || item.reasoningEffort !== null || stable(item.receiverThreadIds) !== '[]' || stable(item.agentsStates) !== '{}')
    || waitPair[0].item.status !== 'inProgress' || waitPair[1].item.status !== 'completed') {
    fail('Codex app-server wait lifecycle is not exact');
  }
  if (!CALL_ID_RE.test(waitPair[0].item.id || '')
    || waitPair.some(({ message }) => message.params.threadId !== parentId || message.params.turnId !== turnId)) {
    fail('Codex wait activity is not bound to the parent turn');
  }
  const parentTurnStartIndex = messages.indexOf(turnStarts[0]);
  const parentTurnEndIndex = messages.indexOf(turnEnds[0]);
  const childTurnStartIndex = messages.indexOf(childTurnStarts[0]);
  const childTurnEndIndex = messages.indexOf(childTurnEnds[0]);
  assertStrictOrder('Codex public spawn lifecycle', parentTurnStartIndex,
    activities[0].index, activities[1].index, childTurnStartIndex, childTurnEndIndex, parentTurnEndIndex);
  assertStrictOrder('Codex public spawn/wait lifecycle', activities[1].index,
    waitPair[0].index, waitPair[1].index, parentTurnEndIndex);
  assertStrictOrder('Codex public child-before-wait completion lifecycle', childTurnEndIndex,
    waitPair[1].index, parentTurnEndIndex);
  for (const { message, index } of itemEvents) {
    const owner = message.params.threadId;
    if (owner === parentId && !(parentTurnStartIndex < index && index < parentTurnEndIndex)) {
      fail('Codex parent item escaped its public turn lifetime');
    }
    if (owner === publicChildId && !(childTurnStartIndex < index && index < childTurnEndIndex)) {
      fail('Codex child item escaped its public turn lifetime');
    }
  }
  if (itemEvents.some(({ message, item }) => {
    const owner = message.params.threadId;
    return owner !== parentId && owner !== publicChildId
      || (owner === parentId && message.params.turnId !== turnId);
  })) fail('Codex item lifecycle is not bound to the observed parent/child turns');
  const lifecycleThreads = messages.filter((message) => ['thread/started', 'turn/started', 'turn/completed'].includes(message?.method))
    .map((message) => message?.params?.thread?.id || message?.params?.threadId).filter(Boolean);
  if (lifecycleThreads.some((id) => id !== parentId && id !== publicChildId)) fail('Codex app-server exposed an unrelated thread lifecycle');
  const waited = waitPair[1].item.receiverThreadIds?.length ? waitPair[1].item.receiverThreadIds : waitPair[0].item.receiverThreadIds;
  if (waited?.length && (waited.length !== 1 || waited[0] !== publicChildId)) fail('Codex wait did not bind the spawned child');
  const deadline = Date.now() + 15_000;
  let index;
  let parent;
  let pe;
  do {
    index = rolloutIndex();
    parent = index.get(parentId);
    if (parent) {
      try {
        const candidate = parseJsonl(parent.bytes, 'Codex parent rollout');
        if (candidate.filter((event) => event?.type === 'response_item' && event?.payload?.type === 'function_call_output').length >= 2) pe = candidate;
      } catch { pe = null; }
    }
    if (!pe) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  } while (!pe && Date.now() < deadline);
  if (!parent) fail('Codex parent rollout missing');
  if (!pe) fail('Codex parent rollout did not become complete');
  const parentPrompts = pe.filter((event) => event?.type === 'event_msg' && event?.payload?.type === 'user_message')
    .map((event) => event.payload.message);
  if (parentPrompts.length !== 1 || parentPrompts[0] !== run.dispatcherPrompt) fail('Codex persisted dispatcher prompt is not exact');
  const parentContexts = pe.filter((event) => event?.type === 'turn_context');
  if (parentContexts.length !== 1) fail('Codex parent has no exact turn_context');
  const parentContext = parentContexts[0].payload || {};
  assertCodexTurnContext(parentContext, run.descriptor.sandbox_contract.type,
    run.descriptor.cwd, run.descriptor.projection, 'Codex parent dispatcher');
  const functions = pe.filter((event) => event?.type === 'response_item' && event?.payload?.type === 'function_call');
  if (pe.some((event) => event?.type === 'response_item' && event?.payload?.type === 'custom_tool_call')) fail('Codex dispatcher made a non-collaboration tool call');
  const spawns = functions.filter((event) => event.payload.name === 'spawn_agent');
  const waits = functions.filter((event) => event.payload.name === 'wait_agent');
  if (functions.length !== 2 || spawns.length !== 1 || waits.length !== 1) fail('Codex dispatcher function graph is not exclusive');
  let args;
  try { args = JSON.parse(spawns[0].payload.arguments); } catch { fail('Codex spawn arguments are not JSON'); }
  exactKeys(args, ['agent_type', 'fork_turns', 'message', 'task_name'], 'Codex persisted spawn arguments');
  if (args.agent_type !== run.role || args.fork_turns !== 'none' || args.task_name !== run.descriptor.native_task_name
    || typeof args.message !== 'string' || !/^gAAAA[A-Za-z0-9_=-]+$/.test(args.message)) fail('Codex persisted encrypted spawn binding mismatch');
  const spawnId = spawns[0].payload.call_id;
  if (publicSpawnId !== spawnId) fail('Codex public/persisted spawn id mismatch');
  let waitArgs;
  try { waitArgs = JSON.parse(waits[0].payload.arguments); } catch { fail('Codex wait arguments are not JSON'); }
  if (!waitArgs || typeof waitArgs !== 'object' || Array.isArray(waitArgs)
    || Object.keys(waitArgs).some((key) => key !== 'timeout_ms')
    || (waitArgs.timeout_ms !== undefined && (!Number.isInteger(waitArgs.timeout_ms) || waitArgs.timeout_ms < 10_000 || waitArgs.timeout_ms > 3_600_000))) fail('Codex wait arguments are not exact');
  const callOutputs = pe.filter((event) => event?.type === 'response_item' && event?.payload?.type === 'function_call_output');
  if (callOutputs.length !== 2 || !callOutputs.some((event) => event.payload.call_id === spawnId)
    || !callOutputs.some((event) => event.payload.call_id === waits[0].payload.call_id)) fail('Codex spawn/wait outputs are not exact');
  const edges = pe.filter((event) => event?.type === 'event_msg' && event?.payload?.type === 'sub_agent_activity');
  if (edges.length !== 1 || edges[0].payload.kind !== 'started' || typeof edges[0].payload.agent_thread_id !== 'string') fail('Codex native start edge mismatch');
  const childId = edges[0].payload.agent_thread_id;
  const spawnOutput = callOutputs.find((event) => event.payload.call_id === spawnId);
  const waitOutput = callOutputs.find((event) => event.payload.call_id === waits[0].payload.call_id);
  assertStrictOrder('Codex persisted parent spawn/wait lifecycle',
    pe.indexOf(spawns[0]), pe.indexOf(spawnOutput), pe.indexOf(edges[0]),
    pe.indexOf(waits[0]), pe.indexOf(waitOutput));
  const childDeadline = Date.now() + 15_000;
  let child;
  let ce;
  do {
    index = rolloutIndex();
    child = index.get(childId);
    if (child) {
      try {
        const candidate = parseJsonl(child.bytes, 'Codex child rollout');
        if (candidate.some((event) => event?.type === 'event_msg' && event?.payload?.type === 'task_complete')) ce = candidate;
      } catch { ce = null; }
    }
    if (!ce) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  } while (!ce && Date.now() < childDeadline);
  if (!child || childId !== publicChildId || childId === parentId || before.has(childId)) fail('Codex child rollout missing/reused');
  if (!ce) fail('Codex child rollout did not become complete');
  const meta = child.first.payload;
  const thread = meta?.source?.subagent?.thread_spawn;
  if (meta.id !== childId || meta.parent_thread_id !== parentId || meta.thread_source !== 'subagent'
    || meta.agent_role !== run.role || thread?.parent_thread_id !== parentId || thread?.agent_role !== run.role
    || thread?.agent_path !== meta.agent_path || !String(meta.agent_path || '').endsWith(`/${run.descriptor.native_task_name}`)) fail('Codex child identity binding mismatch');
  const encryptedInputs = ce.filter((event) => event?.type === 'response_item' && event?.payload?.type === 'agent_message')
    .flatMap((event) => event?.payload?.content || []).filter((item) => item?.type === 'encrypted_content')
    .map((item) => item.encrypted_content).filter((value) => typeof value === 'string');
  if (encryptedInputs.length !== 1 || encryptedInputs[0] !== args.message) fail('Codex child encrypted input does not bind persisted parent ciphertext');
  const contexts = ce.filter((event) => event?.type === 'turn_context');
  if (contexts.length !== 1) fail('Codex child has no exact turn_context');
  for (const event of contexts) {
    assertCodexTurnContext(event.payload || {}, run.descriptor.sandbox_contract.type,
      run.descriptor.cwd, run.descriptor.projection, 'Codex child');
  }
  const taskStarts = ce.filter((event) => event?.type === 'event_msg' && event?.payload?.type === 'task_started');
  const taskEnds = ce.filter((event) => event?.type === 'event_msg' && event?.payload?.type === 'task_complete');
  if (taskStarts.length !== 1 || taskEnds.length !== 1 || taskStarts[0].payload.turn_id !== taskEnds[0].payload.turn_id) fail('Codex child start/completion graph mismatch');
  if (!UUID_RE.test(taskStarts[0].payload.turn_id || '') || taskStarts[0].payload.turn_id !== publicChildTurnId
    || itemEvents.some(({ message }) =>
    message.params.threadId === childId && message.params.turnId !== taskStarts[0].payload.turn_id)) {
    fail('Codex public child items are not bound to the persisted child turn');
  }
  const outputs = ce.filter((event) => event?.type === 'event_msg' && event?.payload?.type === 'agent_message').map((event) => event.payload.message).filter((v) => typeof v === 'string' && v.trim());
  if (outputs.length !== 1) fail('Codex child output is missing/duplicated');
  const outputEvent = ce.find((event) => event?.type === 'event_msg'
    && event?.payload?.type === 'agent_message' && event.payload.message === outputs[0]);
  assertStrictOrder('Codex persisted child task lifecycle',
    ce.indexOf(taskStarts[0]), ce.indexOf(outputEvent), ce.indexOf(taskEnds[0]));
  const output = outputs.at(-1).trim();
  const expected = run.role === 'work-agent' ? packet.expected_output : `LUCA_NATIVE_${run.role.replaceAll('-', '_').toUpperCase()}_RESULT`;
  if (output !== expected) fail('Codex child output is not the exact frozen result');
  if (run.role === 'work-agent') {
    const calls = ce.filter((event) => event?.type === 'response_item' && event?.payload?.type === 'custom_tool_call');
    const callOutputs = ce.filter((event) => event?.type === 'response_item' && event?.payload?.type === 'custom_tool_call_output');
    if (calls.length !== 1 || calls[0].payload.name !== 'exec' || callOutputs.length !== 1
      || callOutputs[0].payload.call_id !== calls[0].payload.call_id) fail('Codex work child tool graph is not one exact exec call/result');
    assertStrictOrder('Codex persisted work tool lifecycle',
      ce.indexOf(taskStarts[0]), ce.indexOf(calls[0]), ce.indexOf(callOutputs[0]),
      ce.indexOf(outputEvent), ce.indexOf(taskEnds[0]));
    const observedCommand = parseExactExecWrapper(calls[0].payload.input, run.descriptor.cwd);
    if (observedCommand !== packet.packet.verification[0].command) fail('Codex work child executed a non-frozen verification command');
    const resultBytes = Buffer.from(stable(callOutputs[0].payload), 'utf8').toString('utf8');
    if (!resultBytes.includes(packet.verification_sentinel)) fail('Codex work verification result lacks the frozen success sentinel');
    exactCodexWorkCommand(itemEvents, childId, taskStarts[0].payload.turn_id, run.descriptor.cwd, packet);
  } else if (ce.some((event) => event?.type === 'response_item'
    && ['custom_tool_call', 'function_call'].includes(event?.payload?.type))) {
    fail('Codex read-only child called a tool');
  } else if (itemEvents.some(({ item }) => item?.type === 'commandExecution')) {
    fail('Codex read-only child emitted a commandExecution lifecycle');
  }
  return { parent_id: parentId, child_id: childId, spawn_id: spawnId, output, observed_input_sha256: sha256(Buffer.from(run.input)), observed_projection: contexts.at(-1).payload.effort, public_bytes: publicBytes, parent_bytes: parent.bytes, child_bytes: child.bytes };
}

function signObject(key, object) {
  const bytes = Buffer.from(stable(object));
  return { sha256: sha256(bytes), signature: signBytes(null, bytes, key).toString('base64') };
}

function signedEvent(key, kind, sequence, previous, payload) {
  const body = { schema_version: 'luca.agent-evidence-event.v2', kind, sequence, previous_sha256: previous, payload };
  const signed = signObject(key, body);
  return { ...body, event_sha256: signed.sha256, signature_ed25519: signed.signature };
}

function parseOptions(argv) {
  const out = { harnesses: [], roles: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--harness') out.harnesses.push(argv[++i]);
    else if (argv[i] === '--role') out.roles.push(argv[++i]);
    else if (argv[i].startsWith('--')) out[argv[i].slice(2).replaceAll('-', '_')] = argv[++i];
  }
  return out;
}

function readCounterReady(path, root, targetCommit, packet) {
  const absolute = resolve(path || '');
  if (!isAbsolute(path || '') || realpathSync(absolute) !== absolute) fail('counter ready path must be canonical absolute');
  const st = statSync(absolute);
  if (!st.isFile() || st.nlink !== 1 || (st.mode & 0o777) !== 0o600) fail('counter ready must be a 0600 single-link regular file');
  const readyBytes = readFileSync(absolute);
  let ready;
  try { ready = JSON.parse(readyBytes.toString('utf8')); } catch { fail('counter ready is not JSON'); }
  exactKeys(ready, ['schema_version', 'ready_id', 'created_at', 'expires_at', 'socket_path', 'counter_public_key_pem', 'counter_fingerprint_sha256', 'commitments'], 'counter ready');
  exactKeys(ready.commitments, ['tcb_sha256', 'verifier_sha256', 'repo_root', 'target_commit', 'work_packet_sha256', 'work_packet_source_sha256'], 'counter ready commitments');
  const socketAbsolute = resolve(ready.socket_path || '');
  const readyParent = realpathSync(dirname(absolute));
  const socketParent = realpathSync(dirname(socketAbsolute));
  const createdAt = canonicalIso(ready.created_at, 'counter ready.created_at');
  const expiresAt = canonicalIso(ready.expires_at, 'counter ready.expires_at');
  let counterKey;
  try { counterKey = createPublicKey(ready.counter_public_key_pem); } catch { fail('counter ready public key is invalid'); }
  const counterFingerprint = counterKey.asymmetricKeyType === 'ed25519'
    ? sha256(counterKey.export({ type: 'spki', format: 'der' })) : null;
  if (ready.schema_version !== 'luca.agent-evidence-counter-ready.v1' || !/^counter-[a-f0-9]{24}$/.test(ready.ready_id || '')
    || createdAt >= expiresAt || Date.now() > expiresAt
    || Buffer.compare(readyBytes, jsonBytes(ready)) !== 0
    || !isAbsolute(ready.socket_path || '') || ready.socket_path !== socketAbsolute
    || socketAbsolute !== join(socketParent, basename(socketAbsolute))
    || within(root, readyParent) || within(root, socketParent)
    || !HASH_RE.test(ready.counter_fingerprint_sha256 || '')
    || counterFingerprint !== ready.counter_fingerprint_sha256
    || ready.commitments.tcb_sha256 !== sha256(readFileSync(SELF))
    || ready.commitments.verifier_sha256 !== sha256(readFileSync(VERIFY))
    || ready.commitments.repo_root !== root || ready.commitments.target_commit !== targetCommit
    || ready.commitments.work_packet_sha256 !== packet.sha256
    || ready.commitments.work_packet_source_sha256 !== packet.source_sha256) fail('counter ready commitments mismatch');
  let socketStat;
  try { socketStat = statSync(socketAbsolute); } catch { fail('pre-existing quality-gate counter socket is absent'); }
  if (!socketStat.isSocket() || (socketStat.mode & 0o777) !== 0o600) fail('counter channel is not a private 0600 Unix socket');
  return { path: absolute, sha256: sha256(readyBytes), ready, counterKey, createdAt, expiresAt };
}

async function requestCounterSignature(counter, baseCore, expectedFingerprint, timeoutMs = 20_000) {
  if (counter.ready.counter_fingerprint_sha256 !== expectedFingerprint) fail('counter fingerprint differs from out-of-band expectation');
  const requestCore = {
    schema_version: 'luca.agent-evidence-counter-request.v1',
    ready_id: counter.ready.ready_id,
    ready_sha256: counter.sha256,
    base_core_sha256: sha256(Buffer.from(stable(baseCore))),
    base_core: baseCore,
  };
  return await new Promise((resolveResult, rejectResult) => {
    const socket = createConnection({ path: counter.ready.socket_path });
    let response = ''; let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer); socket.destroy();
      if (error) rejectResult(error); else resolveResult(value);
    };
    const timer = setTimeout(() => finish(new Error('quality-gate counter signer timed out')), timeoutMs);
    socket.setEncoding('utf8');
    socket.once('connect', () => socket.end(`${stable(requestCore)}\n`));
    socket.on('data', (chunk) => { response += chunk; if (response.length > 1_000_000) finish(new Error('counter response too large')); });
    socket.once('error', (error) => finish(error));
    socket.once('end', () => {
      let value;
      try { value = JSON.parse(response.trim()); } catch { finish(new Error('quality-gate counter signer returned invalid JSON')); return; }
      try {
        exactKeys(value, ['schema_version', 'ready_id', 'ready_sha256', 'base_core_sha256', 'counter_fingerprint_sha256', 'signature_ed25519'], 'counter signature');
        if (value.schema_version !== 'luca.agent-evidence-counter-signature.v1' || value.ready_id !== counter.ready.ready_id
          || value.ready_sha256 !== counter.sha256 || value.base_core_sha256 !== requestCore.base_core_sha256
          || value.counter_fingerprint_sha256 !== expectedFingerprint || typeof value.signature_ed25519 !== 'string'
          || response !== `${stable(value)}\n`
          || !verifyBytes(null, Buffer.from(stable(baseCore), 'utf8'), counter.counterKey, Buffer.from(value.signature_ed25519, 'base64'))) fail('counter response binding/signature mismatch');
      } catch (error) { finish(error); return; }
      finish(null, value);
    });
  });
}

async function capture(child, timeoutMs) {
  const stdout = []; const stderr = [];
  child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
  child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
  let killed = false;
  const timer = setTimeout(() => { killed = true; try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch { } } }, timeoutMs);
  const code = await new Promise((ok, bad) => { child.once('error', bad); child.once('close', (value) => ok(value ?? 1)); });
  clearTimeout(timer);
  return { code, killed, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) };
}

async function captureCodexAppServer(run, scratch, timeoutMs) {
  const child = spawn(run.command, run.args, {
    cwd: run.descriptor.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env, TMPDIR: scratch, LUCA_NATIVE_AGENT_EVIDENCE: '1' },
  });
  const stdout = []; const stderr = []; const messages = [];
  let pending = ''; let streamError = null; let closed = false; let closeCode = null; let killed = false;
  child.stdout.on('data', (chunk) => {
    const bytes = Buffer.from(chunk); stdout.push(bytes); pending += bytes.toString('utf8');
    const lines = pending.split('\n'); pending = lines.pop();
    for (const line of lines) if (line) {
      try { messages.push(JSON.parse(line)); } catch { streamError = new Error('Codex app-server emitted non-JSON stdout'); }
    }
  });
  child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
  child.once('error', (error) => { streamError = error; });
  child.once('close', (code) => { closed = true; closeCode = code; });
  const kill = (signal) => {
    try { process.kill(-child.pid, signal); } catch { try { child.kill(signal); } catch { } }
  };
  const deadline = Date.now() + timeoutMs;
  const waitFor = async (predicate, label) => {
    while (Date.now() < deadline) {
      if (streamError) throw streamError;
      const found = messages.find(predicate);
      if (found) return found;
      if (closed) fail(`Codex app-server closed before ${label} (exit=${closeCode})`);
      await new Promise((resolveWait) => setTimeout(resolveWait, 20));
    }
    killed = true; kill('SIGKILL'); fail(`Codex app-server timed out waiting for ${label}`);
  };
  const request = (message) => {
    if (!child.stdin.write(`${JSON.stringify(message)}\n`)) child.stdin.once('drain', () => {});
  };
  try {
    request({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      clientInfo: { name: 'luca-u008-tcb', title: 'luca U008 native evidence TCB', version: '2.0.0' },
      capabilities: run.descriptor.sandbox_contract.app_server_capabilities,
    } });
    const initialized = await waitFor((message) => String(message?.id) === '1' && !message.method, 'initialize response');
    if (initialized.error || !initialized.result) fail('Codex app-server initialize failed');
    request({ jsonrpc: '2.0', method: 'initialized' });
    const parentMode = run.descriptor.sandbox_contract.type;
    request({ jsonrpc: '2.0', id: 2, method: 'thread/start', params: {
      approvalPolicy: 'never',
      config: {
        features: { multi_agent_v2: true },
        model_reasoning_effort: run.descriptor.projection,
        sandbox_workspace_write: { writable_roots: [], network_access: false,
          exclude_tmpdir_env_var: true, exclude_slash_tmp: true },
      },
      cwd: run.descriptor.cwd,
      ephemeral: false,
      runtimeWorkspaceRoots: [run.descriptor.cwd],
      sandbox: parentMode,
    } });
    const thread = await waitFor((message) => String(message?.id) === '2' && !message.method, 'thread/start response');
    if (thread.error || typeof thread?.result?.thread?.id !== 'string'
      || thread.result.approvalPolicy !== 'never' || thread.result.cwd !== run.descriptor.cwd
      || stable(thread.result.sandbox) !== stable(codexApiSandbox(parentMode))
      || stable(thread.result.runtimeWorkspaceRoots) !== stable([run.descriptor.cwd])
      || thread.result.reasoningEffort !== run.descriptor.projection) fail('Codex app-server thread/start policy response mismatch');
    const threadId = thread.result.thread.id;
    request({ jsonrpc: '2.0', id: 3, method: 'turn/start', params: {
      approvalPolicy: 'never',
      cwd: run.descriptor.cwd,
      effort: run.descriptor.projection,
      input: [{ type: 'text', text: run.dispatcherPrompt }],
      runtimeWorkspaceRoots: [run.descriptor.cwd],
      sandboxPolicy: codexApiSandbox(parentMode),
      threadId,
    } });
    const turn = await waitFor((message) => String(message?.id) === '3' && !message.method, 'turn/start response');
    if (turn.error || typeof turn?.result?.turn?.id !== 'string') fail('Codex app-server turn/start failed');
    const turnId = turn.result.turn.id;
    const completed = await waitFor((message) => message?.method === 'turn/completed'
      && message?.params?.threadId === threadId && message?.params?.turn?.id === turnId, 'parent turn/completed');
    if (completed?.params?.turn?.status !== 'completed') fail('Codex parent turn did not complete successfully');
    child.stdin.end();
    const grace = Date.now() + 10_000;
    while (!closed && Date.now() < grace) await new Promise((resolveWait) => setTimeout(resolveWait, 20));
    if (!closed) { killed = true; kill('SIGTERM'); while (!closed && Date.now() < grace + 2_000) await new Promise((resolveWait) => setTimeout(resolveWait, 20)); }
    if (!closed) { killed = true; kill('SIGKILL'); }
    if (pending.trim()) {
      try { messages.push(JSON.parse(pending)); } catch { fail('Codex app-server ended with non-JSON stdout'); }
    }
    return { code: closeCode ?? 1, killed, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) };
  } catch (error) {
    try { child.stdin.end(); } catch { }
    kill('SIGKILL');
    throw error;
  }
}

function spawnNative(run, scratch) {
  return spawn(run.command, run.args, {
    cwd: run.descriptor.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env, TMPDIR: scratch, LUCA_NATIVE_AGENT_EVIDENCE: '1' },
  });
}

function claudeModelProbeArgs(alias) {
  return ['--safe-mode', '-p', '--model', alias, '--output-format', 'stream-json', '--verbose',
    '--no-session-persistence', '--tools', '', '--permission-mode', 'dontAsk',
    'Reply with exactly LUCA_CLAUDE_MODEL_PROBE_OK. Do not call tools.'];
}

async function resolveClaudeModels({ root, routing, scratchRoot, rawRoot, timeoutMs }) {
  const reasoning = routing.tiers['reasoning-heavy'];
  const core = routing.tiers['core-execution'];
  if (!reasoning.fallback || core.fallback || reasoning.fallback !== core.alias) {
    fail('Claude U008 fallback chain must be exactly reasoning-heavy primary -> core-execution primary');
  }
  const command = realpathSync(process.env.LUCA_CLAUDE_BIN || '/Users/luca/.local/bin/claude');
  const probeRoot = privateDir(join(scratchRoot, 'model-resolution'));
  const cache = new Map();
  const probe = async (alias) => {
    if (cache.has(alias)) return cache.get(alias);
    const scratch = privateDir(join(probeRoot, alias));
    const args = claudeModelProbeArgs(alias);
    const captured = await capture(spawn(command, args, {
      cwd: scratch,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
      env: { ...process.env, TMPDIR: scratch, LUCA_NATIVE_AGENT_EVIDENCE: '0' },
    }), timeoutMs);
    if (captured.killed) fail(`Claude ${alias} safe-mode model probe timed out`);
    const publicPath = join(rawRoot, `claude-model-${alias}.stdout.jsonl`);
    const stderrPath = join(rawRoot, `claude-model-${alias}.stderr`);
    exclusiveFile(publicPath, captured.stdout);
    exclusiveFile(stderrPath, captured.stderr);
    const classification = classifyClaudeModelProbe({ status: captured.code, stdout: captured.stdout,
      stderr: captured.stderr, expectedAlias: alias, expectedCwd: scratch });
    const attempt = {
      projection: alias,
      outcome: classification.outcome,
      resolved_model: classification.resolved_model,
      exit_code: captured.code,
      argv_sha256: sha256(Buffer.from(stable(args), 'utf8')),
      stdout_path: relative(dirname(rawRoot), publicPath),
      stdout_sha256: sha256(captured.stdout),
      stderr_path: relative(dirname(rawRoot), stderrPath),
      stderr_sha256: sha256(captured.stderr),
    };
    cache.set(alias, attempt);
    return attempt;
  };
  const primaryAttempt = await probe(reasoning.alias);
  let reasoningEffective = reasoning.alias;
  let reasoningEffectiveModel = primaryAttempt.resolved_model;
  let reasoningReason = 'primary_available';
  const reasoningAttempts = [primaryAttempt];
  if (primaryAttempt.outcome === 'credits_required') {
    const fallbackAttempt = await probe(reasoning.fallback);
    if (fallbackAttempt.outcome !== 'available') fail('governed Claude fallback is unavailable');
    reasoningAttempts.push(fallbackAttempt);
    reasoningEffective = reasoning.fallback;
    reasoningEffectiveModel = fallbackAttempt.resolved_model;
    reasoningReason = 'credits_required';
  } else if (primaryAttempt.outcome !== 'available') {
    fail('Claude primary model did not produce a governed resolution');
  }
  const coreAttempt = await probe(core.alias);
  if (coreAttempt.outcome !== 'available') fail('Claude core-execution primary is unavailable');
  const specs = [
    { tier: 'reasoning-heavy', route: reasoning, effective: reasoningEffective,
      effectiveModel: reasoningEffectiveModel,
      reason: reasoningReason, attempts: reasoningAttempts },
    { tier: 'core-execution', route: core, effective: core.alias,
      effectiveModel: coreAttempt.resolved_model,
      reason: 'primary_available', attempts: [coreAttempt] },
  ];
  const records = specs.map((spec) => {
    const record = {
      schema_version: 'luca.agent-model-resolution.v1',
      harness: 'claude', tier: spec.tier,
      primary_projection: spec.route.alias,
      fallback_projection: spec.route.fallback,
      effective_projection: spec.effective,
      effective_model: spec.effectiveModel,
      reason: spec.reason,
      attempts: spec.attempts,
    };
    const path = join(rawRoot, `claude-${spec.tier}-resolution.json`);
    const bytes = jsonBytes(record);
    exclusiveFile(path, bytes);
    return {
      harness: 'claude', tier: spec.tier,
      primary_projection: spec.route.alias,
      fallback_projection: spec.route.fallback,
      effective_projection: spec.effective,
      effective_model: spec.effectiveModel,
      reason: spec.reason,
      path: relative(dirname(rawRoot), path),
      sha256: sha256(bytes),
    };
  });
  return {
    records,
    modes: new Map([['claude/reasoning-heavy',
      reasoningEffective === reasoning.alias ? 'primary' : 'fallback']]),
    concreteModels: new Map([
      ['reasoning-heavy', reasoningEffectiveModel],
      ['core-execution', coreAttempt.resolved_model],
    ]),
  };
}

async function runMatrix(options) {
  const root = realpathSync(options.root || resolve(dirname(SELF), '../..'));
  const candidateLauncher = realpathSync(join(root, 'scripts', 'agent-launcher.mjs'));
  assertFrozenSource(SELF, 'external TCB');
  assertFrozenSource(VERIFY, 'external verifier');
  if (SELF === VERIFY || within(root, SELF) || within(root, VERIFY)) fail('TCB/verifier must be distinct files outside the candidate repo');
  if (!COMMIT_RE.test(options.target_commit || '')) fail('invalid --target-commit');
  const head = gitRead(root, ['rev-parse', 'HEAD'], 'git rev-parse HEAD').toString('utf8').trim();
  if (head !== options.target_commit) fail('target commit is not frozen HEAD');
  const drift = gitRead(root, ['status', '--porcelain=v2', '--untracked-files=no'], 'git status');
  if (drift.length) fail('frozen checkout has tracked/staged drift');
  const roles = options.roles.length ? options.roles : [...ROLES];
  const harnesses = options.harnesses.length ? options.harnesses : ['claude', 'codex'];
  if (stable([...roles].sort()) !== stable([...ROLES].sort()) || stable([...harnesses].sort()) !== stable(['claude', 'codex'])) fail('matrix must be exact 2x4');
  const packet = validatePacket(options.work_packet);
  const targetManifest = targetTreeManifest(root, options.target_commit, packet.path);
  if (!HASH_RE.test(options.expected_counter_fingerprint || '')) fail('missing/invalid --expected-counter-fingerprint');
  const counterReady = readCounterReady(options.counter_ready, root, options.target_commit, packet);
  const routing = parseRouting(root);
  const runtime = await runtimeAttestations(root);
  const transactionRoot = newExternalRoot(options.out_root, root);
  const evidenceRoot = privateDir(join(transactionRoot, 'evidence'));
  const rawRoot = privateDir(join(evidenceRoot, 'raw'));
  const receiptRoot = privateDir(join(evidenceRoot, 'receipts'));
  const scratchRoot = privateDir(join(transactionRoot, 'child-scratch'));
  const anchorPath = join(transactionRoot, 'precommit-anchor.json');
  const consumePath = join(transactionRoot, 'verification-consumed.json');
  for (const externalPath of [counterReady.path, counterReady.ready.socket_path]) {
    if (within(transactionRoot, resolve(externalPath)) || within(resolve(externalPath), transactionRoot)) fail('counter channel overlaps evidence transaction root');
  }
  // Availability is resolved by the external TCB before either evidence key or
  // anchor exists.  Probe bytes are private 0600 artifacts and their canonical
  // resolution record is later counter-signed; a post-anchor model switch is impossible.
  const modelResolution = await resolveClaudeModels({ root, routing, runtime, scratchRoot, rawRoot,
    timeoutMs: Number(options.timeout_ms || 300_000) });
  const preflightRuns = [];
  for (const harness of harnesses) for (const role of roles) {
    const nonce = randomBytes(32).toString('hex');
    const runId = `${harness}-${role}-${randomBytes(8).toString('hex')}`;
    const tier = ROLE_CONTRACT[role].tier;
    const projectionMode = modelResolution.modes.get(`${harness}/${tier}`) || 'primary';
    const launch = buildNativeLaunch({ root, harness, role, packet: role === 'work-agent' ? packet : null,
      routing, dispatcherId: runId, runtime, scratch: root, projectionMode });
    const candidateContractSha256 = verifyCandidateDispatchContract(candidateLauncher, launch, root, harness, role, packet, projectionMode);
    preflightRuns.push({ run_id: runId, harness, role, nonce, projection_mode: projectionMode,
      nonce_commitment_sha256: sha256(Buffer.from(nonce)), candidate_contract_sha256: candidateContractSha256,
      preflight_contract: nativeDispatchContract(launch.descriptor) });
  }
  if (stable(targetTreeManifest(root, options.target_commit, packet.path)) !== stable(targetManifest)
    || gitRead(root, ['status', '--porcelain=v2', '--untracked-files=no'], 'git status after candidate contract comparison').length) {
    fail('candidate contract comparison changed the frozen target');
  }
  const created = new Date();
  const requestedTtl = Number(options.ttl_ms || 3_600_000);
  if (!Number.isInteger(requestedTtl) || requestedTtl < 60_000 || requestedTtl > 86_400_000) fail('invalid --ttl-ms');
  const expires = new Date(Math.min(created.getTime() + requestedTtl, Date.parse(counterReady.ready.expires_at)));
  if (expires.getTime() <= created.getTime()) fail('counter authorization expires before the evidence transaction');
  const prepared = preflightRuns.map((preflight) => {
    const scratch = privateDir(join(scratchRoot, preflight.run_id));
    const launch = buildNativeLaunch({ root, harness: preflight.harness, role: preflight.role,
      packet: preflight.role === 'work-agent' ? packet : null, routing,
      dispatcherId: preflight.run_id, runtime, scratch, projectionMode: preflight.projection_mode });
    if (stable(nativeDispatchContract(launch.descriptor)) !== stable(preflight.preflight_contract)) {
      fail(`native contract changed while materializing ${preflight.harness}/${preflight.role}`);
    }
    const { preflight_contract, ...run } = preflight;
    return { ...run, scratch, ...launch };
  });
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const evidenceFingerprint = sha256(publicKey.export({ type: 'spki', format: 'der' }));
  const delegatedWriteRoots = [...new Set(prepared.flatMap((run) => run.descriptor.write_roots).map((path) => realpathSync(path)))];
  for (const frozenPath of [SELF, VERIFY, counterReady.path]) {
    if (within(root, frozenPath) || delegatedWriteRoots.some((writeRoot) => within(writeRoot, frozenPath))) fail('TCB/verifier/counter-ready overlaps candidate or delegated write root');
  }
  const socketParent = realpathSync(dirname(counterReady.ready.socket_path));
  if (within(root, socketParent) || delegatedWriteRoots.some((writeRoot) => within(writeRoot, socketParent))) fail('counter socket parent overlaps candidate or delegated write root');
  const anchorRuns = prepared.map((run) => ({
    run_id: run.run_id,
    harness: run.harness,
    role: run.role,
    projection: run.descriptor.projection,
    input_sha256: run.descriptor.input_sha256,
    candidate_contract_sha256: run.candidate_contract_sha256,
    native_descriptor_sha256: run.descriptor_sha256,
    write_roots: run.descriptor.write_roots,
    sandbox_contract: run.descriptor.sandbox_contract,
  }));
  const nonceCommitments = prepared.map((run) => ({ run_id: run.run_id, commitment_sha256: run.nonce_commitment_sha256 }));
  const nonceSetSha = sha256(Buffer.from(stable(nonceCommitments)));
  const baseCore = {
    schema_version: 'luca.agent-evidence-anchor.v2',
    transaction_id: options.transaction_id || `agent-evidence-${randomBytes(12).toString('hex')}`,
    created_at: created.toISOString(),
    expires_at: expires.toISOString(),
    repo_root: root,
    evidence_root: evidenceRoot,
    consume_path: consumePath,
    target_commit: options.target_commit,
    target_tree_manifest: targetManifest,
    tcb: { path: SELF, sha256: sha256(readFileSync(SELF)) },
    verifier: { path: VERIFY, sha256: sha256(readFileSync(VERIFY)) },
    candidate_launcher: { path: candidateLauncher, sha256: sha256(readFileSync(candidateLauncher)), execution: 'describe-contract-only-before-evidence-key' },
    work_packet: { path: packet.path, sha256: packet.sha256, source_sha256: packet.source_sha256 },
    counter_ready: {
      path: counterReady.path,
      sha256: counterReady.sha256,
      ready_id: counterReady.ready.ready_id,
      created_at: counterReady.ready.created_at,
      expires_at: counterReady.ready.expires_at,
      socket_path: counterReady.ready.socket_path,
    },
    evidence_public_key_pem: publicPem,
    evidence_fingerprint_sha256: evidenceFingerprint,
    nonce_commitments: nonceCommitments,
    nonce_set_sha256: nonceSetSha,
    model_resolutions: modelResolution.records,
    runs: anchorRuns,
  };
  const counterResult = await requestCounterSignature(counterReady, baseCore, options.expected_counter_fingerprint);
  const evidenceSignature = signObject(privateKey, baseCore).signature;
  const anchor = {
    ...baseCore,
    base_core_sha256: sha256(Buffer.from(stable(baseCore))),
    evidence_signature_ed25519: evidenceSignature,
    counter_public_key_pem: counterReady.ready.counter_public_key_pem,
    counter_fingerprint_sha256: counterResult.counter_fingerprint_sha256,
    counter_signature_ed25519: counterResult.signature_ed25519,
  };
  const anchorBytes = jsonBytes(anchor);
  exclusiveFile(anchorPath, anchorBytes);
  const anchorSha = sha256(anchorBytes);
  const envelopeCreated = created.toISOString();
  const envelopeRuns = prepared.map((run) => ({ run_id: run.run_id, harness: run.harness, role: run.role,
    nonce_commitment_sha256: run.nonce_commitment_sha256, candidate_contract_sha256: run.candidate_contract_sha256,
    native_descriptor: run.descriptor, native_descriptor_sha256: run.descriptor_sha256 }));
  const envelopeCore = {
    schema_version: 'luca.agent-evidence-envelope.v2',
    transaction_id: anchor.transaction_id,
    anchor_path: anchorPath,
    anchor_sha256: anchorSha,
    target_commit: options.target_commit,
    repo_root: root,
    created_at: envelopeCreated,
    expires_at: anchor.expires_at,
    public_key_fingerprint_sha256: evidenceFingerprint,
    tcb_sha256: anchor.tcb.sha256,
    verifier_sha256: anchor.verifier.sha256,
    launcher_sha256: anchor.candidate_launcher.sha256,
    work_packet_sha256: anchor.work_packet.sha256,
    work_packet_source_sha256: anchor.work_packet.source_sha256,
    runtime_attestations: runtime,
    runs: envelopeRuns,
  };
  const envelopeSigned = signObject(privateKey, envelopeCore);
  const envelope = { ...envelopeCore, envelope_core_sha256: envelopeSigned.sha256, signature_ed25519: envelopeSigned.signature };
  const envelopePath = join(evidenceRoot, 'execution-envelope.json');
  exclusiveFile(envelopePath, jsonBytes(envelope));
  const envelopeSha = sha256(readFileSync(envelopePath));
  process.stdout.write(`${JSON.stringify({ anchor_path: anchorPath, anchor_sha256: anchorSha, evidence_root: evidenceRoot, evidence_public_key_fingerprint_sha256: evidenceFingerprint, quality_gate_public_key_fingerprint_sha256: anchor.counter_fingerprint_sha256, nonce_set_sha256: nonceSetSha, tcb_sha256: anchor.tcb.sha256, verifier_sha256: anchor.verifier.sha256 })}\nAGENT_EVIDENCE_PRECOMMIT_FROZEN\n`);
  const beforeCodex = rolloutIndex();
  const seenParents = new Set();
  const seenChildren = new Set();
  const receipts = [];
  for (const run of prepared) {
    if (Date.now() >= expires.getTime()) fail('transaction expired before native launch');
    const launchedAt = new Date().toISOString();
    const launchEvent = signedEvent(privateKey, 'launch', 1, null, {
      run_id: run.run_id,
      anchor_sha256: anchorSha,
      envelope_sha256: envelopeSha,
      nonce: run.nonce,
      nonce_commitment_sha256: run.nonce_commitment_sha256,
      harness: run.harness,
      role: run.role,
      native_descriptor_sha256: run.descriptor_sha256,
      target_commit: options.target_commit,
      launched_at: launchedAt,
    });
    const captured = run.harness === 'codex'
      ? await captureCodexAppServer(run, run.scratch, Number(options.timeout_ms || 300_000))
      : await capture(spawnNative(run, run.scratch), Number(options.timeout_ms || 300_000));
    if (captured.killed || captured.code !== 0) fail(`${run.harness}/${run.role} native process failed exit=${captured.code}${captured.killed ? ' timeout' : ''}: ${captured.stderr.toString('utf8').slice(0, 800).replace(/[\r\n]+/g, ' ')}`);
    const prefix = `${run.harness}-${run.role}`;
    const raw = [];
    const addRaw = (kind, name, bytes) => { const path = join(rawRoot, name); exclusiveFile(path, bytes); raw.push({ kind, path, bytes }); };
    addRaw('public', `${prefix}.stdout.jsonl`, captured.stdout);
    addRaw('stderr', `${prefix}.stderr`, captured.stderr);
    let parsed;
    if (run.harness === 'claude') {
      parsed = parseClaude(captured.stdout, run, runtime, packet,
        modelResolution.concreteModels.get(run.descriptor.tier));
    }
    else {
      parsed = parseCodex(captured.stdout, beforeCodex, run, packet);
      addRaw('parent_rollout', `${prefix}.parent-rollout.jsonl`, parsed.parent_bytes);
      addRaw('child_rollout', `${prefix}.child-rollout.jsonl`, parsed.child_bytes);
    }
    if (parsed.parent_id === parsed.child_id || seenParents.has(parsed.parent_id)
      || seenChildren.has(parsed.child_id) || seenChildren.has(parsed.parent_id)
      || seenParents.has(parsed.child_id)) fail('parent/child execution identity reused or cross-collided');
    seenParents.add(parsed.parent_id);
    seenChildren.add(parsed.child_id);
    const expectedOutput = run.role === 'work-agent' ? packet.expected_output : `LUCA_NATIVE_${run.role.replaceAll('-', '_').toUpperCase()}_RESULT`;
    if (parsed.output !== expectedOutput) fail(`${run.harness}/${run.role} output differs from the exact frozen result`);
    const observedAt = new Date().toISOString();
    const manifest = raw.map((part) => ({ kind: part.kind, path: relative(evidenceRoot, part.path), size: part.bytes.length, sha256: sha256(part.bytes) }));
    const sourceHash = sha256(Buffer.concat(raw.flatMap((part) => [Buffer.from(`${part.kind}:${part.bytes.length}:`), part.bytes])));
    const sessionEvent = signedEvent(privateKey, 'session', 2, launchEvent.event_sha256, {
      run_id: run.run_id,
      parent_id: parsed.parent_id,
      child_id: parsed.child_id,
      spawn_id: parsed.spawn_id,
      native_identity_kind: run.harness === 'claude' ? 'dispatcher_session_to_child_agent_id' : 'parent_thread_to_child_thread',
      input_binding_kind: run.harness === 'claude'
        ? 'native_plaintext_prompt_sha256'
        : 'precommitted_dispatcher_plus_native_ciphertext_continuity',
      observed_input_sha256: parsed.observed_input_sha256,
      observed_projection: parsed.observed_projection,
      source_log_sha256: sourceHash,
      raw_logs: manifest,
      stderr_sha256: sha256(captured.stderr),
      observed_at: observedAt,
    });
    const completedAt = new Date().toISOString();
    const resultEvent = signedEvent(privateKey, 'result', 3, sessionEvent.event_sha256, {
      run_id: run.run_id,
      output_sha256: sha256(Buffer.from(parsed.output)),
      output_size: Buffer.byteLength(parsed.output),
      exit_code: captured.code,
      completed_at: completedAt,
    });
    const receiptCore = {
      schema_version: 'luca.agent-evidence-receipt.v2',
      transaction_id: anchor.transaction_id,
      run_id: run.run_id,
      anchor_sha256: anchorSha,
      envelope_sha256: envelopeSha,
      public_key_fingerprint_sha256: evidenceFingerprint,
      harness: run.harness,
      role: run.role,
      target_commit: options.target_commit,
      native_descriptor_sha256: run.descriptor_sha256,
      nonce_commitment_sha256: run.nonce_commitment_sha256,
      parent_id: parsed.parent_id,
      child_id: parsed.child_id,
      spawn_id: parsed.spawn_id,
      source_log_sha256: sourceHash,
      output_sha256: resultEvent.payload.output_sha256,
      events: [launchEvent, sessionEvent, resultEvent],
      created_at: launchedAt,
      completed_at: completedAt,
      expires_at: anchor.expires_at,
    };
    const signed = signObject(privateKey, receiptCore);
    const receipt = { ...receiptCore, receipt_core_sha256: signed.sha256, signature_ed25519: signed.signature };
    const receiptPath = join(receiptRoot, `${prefix}.json`);
    exclusiveFile(receiptPath, jsonBytes(receipt));
    receipts.push({ harness: run.harness, role: run.role, path: relative(evidenceRoot, receiptPath), sha256: sha256(readFileSync(receiptPath)), child_id: parsed.child_id });
  }
  if (seenParents.size !== 8 || seenChildren.size !== 8) fail('native matrix lacks eight unique parent/child identities');
  const summaryAt = new Date().toISOString();
  const summaryCore = {
    schema_version: 'luca.agent-evidence-summary.v2',
    transaction_id: anchor.transaction_id,
    anchor_sha256: anchorSha,
    envelope_path: relative(evidenceRoot, envelopePath),
    envelope_sha256: envelopeSha,
    public_key_fingerprint_sha256: evidenceFingerprint,
    target_commit: options.target_commit,
    harnesses,
    roles,
    receipts,
    completed_at: summaryAt,
  };
  const summarySigned = signObject(privateKey, summaryCore);
  const summary = { ...summaryCore, summary_core_sha256: summarySigned.sha256, signature_ed25519: summarySigned.signature };
  const summaryPath = join(evidenceRoot, 'summary.json');
  exclusiveFile(summaryPath, jsonBytes(summary));
  process.stdout.write(`${JSON.stringify({ anchor_path: anchorPath, anchor_sha256: anchorSha, evidence_root: evidenceRoot, envelope_sha256: envelopeSha, summary_sha256: sha256(readFileSync(summaryPath)), evidence_public_key_fingerprint_sha256: evidenceFingerprint, quality_gate_public_key_fingerprint_sha256: anchor.counter_fingerprint_sha256, nonce_set_sha256: nonceSetSha, tcb_sha256: anchor.tcb.sha256, verifier_sha256: anchor.verifier.sha256, receipts: receipts.length })}\nAGENT_EVIDENCE_MATRIX_CAPTURED\n`);
}

async function main() {
  const [mode, ...argv] = process.argv.slice(2);
  if (mode !== 'run-matrix') fail('usage: agent-evidence-tcb.mjs run-matrix --root DIR --out-root NEW_EXTERNAL_DIR --target-commit SHA --work-packet FILE --counter-ready ABS --expected-counter-fingerprint SHA256 --harness claude --harness codex --role ROLE...');
  await runMatrix(parseOptions(argv));
}

if (process.argv[1] && realpathSync(process.argv[1]) === SELF) {
  main().catch((error) => {
    process.stderr.write(`AGENT_EVIDENCE_TCB_ERROR ${error.message}\n`);
    process.exitCode = 2;
  });
}
