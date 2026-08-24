#!/usr/bin/env node

// Handoff-integrity gate only. RECOVERY_HANDOFF_GATE_PASS proves that the frozen recovery
// handoff bundle still matches the declared local state; it does not authorize implementation,
// satisfy a REX/MPC2/Cycle 2 gate, complete the active Goal, or emit EVOLUTION_VERIFIED.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL = fileURLToPath(import.meta.url);
const PACKAGE = resolve(dirname(TOOL), '..');
const REPO = resolve(PACKAGE, '..', '..');
const MANIFEST_PATH = resolve(PACKAGE, 'FINAL-SESSION-HANDOFF-MANIFEST.json');
const LAUNCH_PROMPT_PATH = '/Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap/NEW-SESSION-PROMPT.md';
const HANDOFF_ID = 'RECOVERY-HANDOFF-20260820-001';
const PASS_TOKEN = 'RECOVERY_HANDOFF_GATE_PASS';
const UNSAFE_MEMORY_ROOT = '/Users/luca/Desktop/luca_gstack';
const LOCAL_GIT_ENV_KEYS = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CONFIG',
  'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT',
  'GIT_CONFIG_GLOBAL',
  'GIT_CONFIG_SYSTEM',
  'GIT_CONFIG_NOSYSTEM',
  'GIT_OBJECT_DIRECTORY',
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_IMPLICIT_WORK_TREE',
  'GIT_GRAFT_FILE',
  'GIT_INDEX_FILE',
  'GIT_NO_REPLACE_OBJECTS',
  'GIT_REPLACE_REF_BASE',
  'GIT_PREFIX',
  'GIT_SHALLOW_FILE',
  'GIT_COMMON_DIR',
];

const packageRelative = relative(REPO, PACKAGE).split(sep).join('/');
const EXPECTED_ARTIFACTS = {
  handoff: `${packageRelative}/FINAL-SESSION-HANDOFF.md`,
  state: `${packageRelative}/RECOVERY-STATE.json`,
  ledger: `${packageRelative}/RECOVERY-COMMIT-LEDGER.json`,
  safe_bootstrap: `${packageRelative}/SAFE-BOOTSTRAP.md`,
  redteam_a: 'framework-audit/2026-08-19-rule-execution-recovery-handoff-redteam-a.md',
  redteam_b: 'framework-audit/2026-08-19-rule-execution-recovery-handoff-redteam-b.md',
};

const EXPECTED_ARTIFACT_TYPES = {
  handoff: 'markdown',
  state: 'json',
  ledger: 'json',
  safe_bootstrap: 'markdown',
  redteam_a: 'markdown',
  redteam_b: 'markdown',
};

const EXPECTED_AUTHORITIES = {
  cycle2_plan: {
    path: 'framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md',
    sha256: '4bfbfed81496fe53174a73bc4242b1b0043cc01292db636c379e0dd1892c12d7',
  },
  cycle2_handoff: {
    path: 'framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-HANDOFF.md',
    sha256: '9f7837c44f9c3ef85d00f219e5beee5479bd7d05b5a8a71429d5aa20cce0b0d3',
  },
  cycle2_manifest: {
    path: 'framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-execution-manifest.json',
    sha256: '45ccb4812bdf5f8bcd86eab59ff35fd20810326354bdfeda7b03a4668d64e715',
  },
  defer_register: {
    path: 'framework-audit/2026-08-09-mattpocock-handshake-cycle2/defer-promotion-register.json',
    sha256: '92c6b8bd3a9b5754a4da31baa893beec8020c699c98ec4731fe185a804f0d5f7',
  },
  rex_plan: {
    path: 'framework-audit/2026-08-11-rule-execution-handshake/FINAL-EXECUTION-PLAN.md',
    sha256: 'ca4d57b0057dea529943e167b833eaca5a07d51495fc0f62e2dd47ac23daf4d8',
  },
  mpc2_change_order: {
    path: 'framework-audit/2026-08-11-mattpocock-selected-skills-reassessment/FINAL-CHANGE-ORDER.md',
    sha256: '563f3b1bb4edff297ba932831b3d35faa7bc6fe9da63298c48934f94f059b9ce',
  },
  mpc2_delta: {
    path: 'framework-audit/2026-08-11-mattpocock-selected-skills-reassessment/execution-delta.json',
    sha256: '8c36052143790ff099d71549d788a2c36dd8582391224344ad224c6693660ced',
  },
};

const EXPECTED_CONTAINMENT_FILES = {
  resolver_live: {
    path: '/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md',
    sha256: '5befc05bd6cc6513485521b0f62b80de39abb38cfb8703daa3aed9abb30fd4de',
  },
  resolver_backup: {
    path: '/Users/luca/.luca/quarantine/resolving-merge-conflicts/20260811T055628Z-c7c9ba81362a/unsafe-original/SKILL.md',
    sha256: 'c7c9ba81362a786aac05d2223123bf1bd2f8a99c3243a72882ede9c68bedfb24',
  },
  containment_journal: {
    path: '/Users/luca/.luca/quarantine/resolving-merge-conflicts/20260811T055628Z-c7c9ba81362a/containment-journal.json',
    sha256: 'a3c30778b30c12dd1329b162aa8afc8d6279dc572e33ed6e9f76617a34e09592',
  },
};

const EXPECTED_ABSENT_RESOLVERS = [
  '/Users/luca/.agents/skills/resolving-merge-conflicts',
  '/Users/luca/.codex/skills/resolving-merge-conflicts',
];

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readBytes(path, label = path) {
  try {
    const stat = lstatSync(path);
    assert(stat.isFile(), `${label} is not a regular file: ${path}`);
    return readFileSync(path);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(`${label} is not a regular file:`)) throw error;
    fail(`cannot read ${label}: ${path}: ${error.message}`);
  }
}

function readText(path, label = path) {
  return readBytes(path, label).toString('utf8');
}

function parseJsonText(source, label) {
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function assertSha(value, label) {
  assert(typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value), `${label} is not a lowercase SHA-256`);
}

function assertGitOid(value, label) {
  assert(typeof value === 'string' && /^[0-9a-f]{40}$/u.test(value), `${label} is not a lowercase Git SHA-1 object ID`);
}

function assertNoDraftTokens(source, label) {
  const match = source.match(/(?:^|[^A-Za-z0-9_])(PLACEHOLDER|TODO)(?:$|[^A-Za-z0-9_])/iu);
  assert(!match, `${label} contains forbidden draft token: ${match?.[1]}`);
}

function assertMarkdownFileEnd(source, path, label) {
  const marker = `<!-- FILE_END: ${basename(path)} -->`;
  assert(source.trimEnd().endsWith(marker), `${label} missing terminal marker: ${marker}`);
}

function assertJsonFileEnd(value, path, label) {
  assert(value && value._file_end === basename(path), `${label} JSON FILE_END sentinel mismatch`);
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function assertExactArray(actual, expected, label) {
  assert(Array.isArray(actual), `${label} is not an array`);
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label} exact set/order drift`);
}

function nulListHash(paths) {
  const body = paths.length ? `${paths.join('\0')}\0` : '';
  return sha256Bytes(Buffer.from(body, 'utf8'));
}

function gitBytes(repo, ...args) {
  try {
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
      if (key.startsWith('GIT_')) delete env[key];
    }
    env.GIT_OPTIONAL_LOCKS = '0';
    env.GIT_CONFIG_GLOBAL = '/dev/null';
    env.GIT_CONFIG_SYSTEM = '/dev/null';
    env.GIT_CONFIG_NOSYSTEM = '1';
    return execFileSync('git', ['--no-optional-locks', '-C', repo, ...args], {
      env,
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch (error) {
    fail(`git -C ${repo} ${args.join(' ')} failed: ${error.message}`);
  }
}

function validateInvocationBoundary(manifest) {
  const policy = manifest.safe_bootstrap_policy;
  assert(policy && typeof policy === 'object', 'safe_bootstrap_policy missing before invocation check');
  assertExactArray(policy.forbidden_inherited_git_environment, LOCAL_GIT_ENV_KEYS,
    'forbidden inherited Git environment');
  assert(resolve(process.cwd()) === resolve(policy.neutral_root),
    `verifier must run from exact neutral cwd: ${policy.neutral_root}`);
  const inherited = LOCAL_GIT_ENV_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(process.env, key));
  assert(inherited.length === 0, `verifier refuses inherited Git locator/config variables: ${inherited.join(',')}`);
}

function bytewiseSort(values) {
  return [...values].sort((a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')));
}

function walkRegularFiles(root) {
  const out = [];
  const excluded = [];
  const visit = (directory) => {
    const entries = readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) out.push(absolute);
      else excluded.push(relative(root, absolute).split(sep).join('/'));
    }
  };
  visit(root);
  return { files: out, excluded: bytewiseSort(excluded) };
}

function evidenceInventory(root) {
  const { files, excluded } = walkRegularFiles(root);
  const records = files.map((absolute) => ({
    absolute,
    relative: relative(root, absolute).split(sep).join('/'),
  }));
  records.sort((a, b) => Buffer.compare(Buffer.from(a.relative, 'utf8'), Buffer.from(b.relative, 'utf8')));
  const serialized = records.map(({ absolute, relative: rel }) =>
    `${sha256Bytes(readBytes(absolute, `external evidence ${rel}`))}  ${rel}\n`).join('');
  return { file_count: records.length, excluded, sha256: sha256Bytes(Buffer.from(serialized, 'utf8')) };
}

function gitText(repo, ...args) {
  return gitBytes(repo, ...args).toString('utf8').trim();
}

function gitNulPaths(repo, ...args) {
  return gitBytes(repo, ...args).toString('utf8').split('\0').filter(Boolean);
}

function pathExistsIncludingDanglingSymlink(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return false;
    fail(`cannot inspect path: ${path}: ${error.message}`);
  }
}

function resolveRepoFile(repoRelative, label) {
  assert(typeof repoRelative === 'string' && repoRelative.length > 0, `${label} path missing`);
  assert(!isAbsolute(repoRelative), `${label} must be repository-relative`);
  const absolute = resolve(REPO, repoRelative);
  assert(absolute === REPO || absolute.startsWith(`${REPO}${sep}`), `${label} escapes repository`);
  return absolute;
}

function assertOutside(root, forbidden, label) {
  const normalizedRoot = resolve(root);
  const normalizedForbidden = resolve(forbidden);
  const inside = normalizedRoot === normalizedForbidden || normalizedRoot.startsWith(`${normalizedForbidden}${sep}`);
  assert(!inside, `${label} must be outside forbidden root: ${normalizedForbidden}`);
}

function validateArtifacts(manifest) {
  assert(manifest.artifacts && typeof manifest.artifacts === 'object' && !Array.isArray(manifest.artifacts), 'artifacts object missing');
  assertExactArray(Object.keys(manifest.artifacts).sort(), Object.keys(EXPECTED_ARTIFACTS).sort(), 'artifact IDs');

  const loaded = {};
  for (const [id, expectedPath] of Object.entries(EXPECTED_ARTIFACTS)) {
    const entry = manifest.artifacts[id];
    assert(entry && typeof entry === 'object', `artifact entry missing: ${id}`);
    assert(entry.path === expectedPath, `artifact path mismatch: ${id}`);
    assert(entry.type === EXPECTED_ARTIFACT_TYPES[id], `artifact type mismatch: ${id}`);
    assertSha(entry.sha256, `artifact ${id} sha256`);
    const absolute = resolveRepoFile(entry.path, `artifact ${id}`);
    const bytes = readBytes(absolute, `artifact ${id}`);
    assert(sha256Bytes(bytes) === entry.sha256, `artifact byte drift: ${id}`);
    const source = bytes.toString('utf8');
    assertNoDraftTokens(source, `artifact ${id}`);
    if (entry.type === 'markdown') assertMarkdownFileEnd(source, absolute, `artifact ${id}`);
    else {
      const value = parseJsonText(source, `artifact ${id}`);
      assertJsonFileEnd(value, absolute, `artifact ${id}`);
      assert(value.schema_version === 1, `artifact ${id} schema_version mismatch`);
      assert(value.handoff_id === HANDOFF_ID, `artifact ${id} handoff_id mismatch`);
      loaded[`${id}_json`] = value;
    }
    loaded[id] = { absolute, bytes, source, sha256: entry.sha256 };
  }
  return loaded;
}

function validateVerifier(manifest) {
  const entry = manifest.verifier;
  assert(entry && typeof entry === 'object', 'verifier entry missing');
  assert(entry.path === `${packageRelative}/tools/verify-recovery-handoff.mjs`, 'verifier path mismatch');
  assertSha(entry.sha256, 'verifier sha256');
  const absolute = resolveRepoFile(entry.path, 'verifier');
  assert(absolute === TOOL, 'verifier path does not resolve to executing tool');
  assert(sha256Bytes(readBytes(absolute, 'verifier')) === entry.sha256, 'verifier byte drift');
}

function validateLaunchPrompt(manifest) {
  const entry = manifest.launch_prompt;
  assert(entry && typeof entry === 'object', 'launch_prompt entry missing');
  assert(entry.path === LAUNCH_PROMPT_PATH, 'launch prompt path mismatch');
  assert(entry.role === 'EXTERNAL_NEUTRAL_BOOTSTRAP_PROMPT', 'launch prompt role mismatch');
  assertSha(entry.sha256, 'launch prompt sha256');
  const bytes = readBytes(entry.path, 'launch prompt');
  assert(sha256Bytes(bytes) === entry.sha256, 'launch prompt byte drift');
  const source = bytes.toString('utf8');
  assertMarkdownFileEnd(source, entry.path, 'launch prompt');
  assertNoDraftTokens(source, 'launch prompt');
  assert(!/[0-9a-f]{64}/u.test(source), 'launch prompt contains a static SHA-256 and can self-stale');
  assert(source.includes(TOOL), 'launch prompt omits the absolute verifier path');
  assert(source.includes(PASS_TOKEN), 'launch prompt omits the sole PASS token');
  assert(source.includes(manifest.safe_bootstrap_policy.neutral_root), 'launch prompt omits the exact neutral cwd');
}

function validateRedteamClosure(artifact, reviewer, handoffSha) {
  const expectedToken = `REDTEAM_${reviewer}_CLOSED`;
  const blocks = [...artifact.source.matchAll(/<!-- RECOVERY_HANDOFF_CLOSURE_BEGIN -->([\s\S]*?)<!-- RECOVERY_HANDOFF_CLOSURE_END -->/gu)];
  assert(blocks.length === 1, `redteam ${reviewer} must contain exactly one final closure block`);
  const block = blocks[0][1];
  const tokenPattern = new RegExp(`^\\s*(?:[-*]\\s*)?closure_token\\s*:\\s*` + '`?' + `${expectedToken}` + '`?' + `\\s*$`, 'mu');
  assert(tokenPattern.test(block), `redteam ${reviewer} closure token missing`);
  assert(/^\s*(?:[-*]\s*)?remaining_findings\s*:\s*`?0`?\s*$/mu.test(block), `redteam ${reviewer} does not declare remaining_findings: 0`);
  const targetPattern = new RegExp(`^\\s*(?:[-*]\\s*)?final_target_sha256\\s*:\\s*` + '`?' + `${handoffSha}` + '`?' + `\\s*$`, 'mu');
  assert(targetPattern.test(block), `redteam ${reviewer} final target does not match handoff SHA`);
}

function validateAuthorities(manifest) {
  assert(Array.isArray(manifest.authorities), 'authorities array missing');
  const byId = new Map();
  for (const entry of manifest.authorities) {
    assert(entry && typeof entry.id === 'string', 'authority entry missing id');
    assert(!byId.has(entry.id), `duplicate authority id: ${entry.id}`);
    byId.set(entry.id, entry);
  }
  assertExactArray([...byId.keys()].sort(), Object.keys(EXPECTED_AUTHORITIES).sort(), 'authority IDs');
  for (const [id, expected] of Object.entries(EXPECTED_AUTHORITIES)) {
    const entry = byId.get(id);
    assert(entry.path === expected.path, `authority path mismatch: ${id}`);
    assert(entry.sha256 === expected.sha256, `authority frozen SHA mismatch: ${id}`);
    const actual = sha256Bytes(readBytes(resolveRepoFile(entry.path, `authority ${id}`), `authority ${id}`));
    assert(actual === entry.sha256, `authority byte drift: ${id}`);
  }
}

function validateContainment(manifest) {
  const containment = manifest.containment;
  assert(containment && Array.isArray(containment.files), 'containment.files array missing');
  const byId = new Map();
  for (const entry of containment.files) {
    assert(entry && typeof entry.id === 'string', 'containment file missing id');
    assert(!byId.has(entry.id), `duplicate containment id: ${entry.id}`);
    byId.set(entry.id, entry);
  }
  assertExactArray([...byId.keys()].sort(), Object.keys(EXPECTED_CONTAINMENT_FILES).sort(), 'containment file IDs');
  for (const [id, expected] of Object.entries(EXPECTED_CONTAINMENT_FILES)) {
    const entry = byId.get(id);
    assert(entry.path === expected.path, `containment path mismatch: ${id}`);
    assert(entry.sha256 === expected.sha256, `containment frozen SHA mismatch: ${id}`);
    const bytes = readBytes(entry.path, `containment ${id}`);
    assert(sha256Bytes(bytes) === entry.sha256, `containment byte drift: ${id}`);
    if (id === 'containment_journal') parseJsonText(bytes.toString('utf8'), 'containment journal');
  }
  assertExactArray(containment.absent_paths, EXPECTED_ABSENT_RESOLVERS, 'absent resolver paths');
  for (const path of EXPECTED_ABSENT_RESOLVERS) {
    assert(!pathExistsIncludingDanglingSymlink(path), `contained resolver path became discoverable: ${path}`);
  }
}

function currentStatusSnapshot(repo) {
  const porcelain = gitBytes(repo, 'status', '--porcelain=v2', '-z', '--untracked-files=all');
  const worktreePaths = gitNulPaths(repo, 'diff', '--name-only', '-z', '--');
  const indexPaths = gitNulPaths(repo, 'diff', '--cached', '--name-only', '-z', '--');
  const untrackedPaths = sortedUnique(gitNulPaths(repo, 'ls-files', '--others', '--exclude-standard', '-z'));
  const paths = sortedUnique([...worktreePaths, ...indexPaths, ...untrackedPaths]);
  return {
    porcelain_v2_z_sha256: sha256Bytes(porcelain),
    paths,
    paths_nul_sha256: nulListHash(paths),
    untracked_paths: untrackedPaths,
    untracked_paths_nul_sha256: nulListHash(untrackedPaths),
  };
}

function validateCanonical(manifest) {
  const canonical = manifest.repo?.canonical;
  assert(canonical && typeof canonical === 'object', 'repo.canonical missing');
  assert(canonical.path === REPO, `canonical path mismatch: ${canonical.path}`);
  assertGitOid(canonical.head, 'canonical head');
  assertGitOid(canonical.tree, 'canonical tree');
  assertGitOid(canonical.upstream_main, 'canonical upstream_main');
  assertSha(canonical.worktree_diff_binary_sha256, 'canonical worktree diff hash');
  assertSha(canonical.cached_diff_binary_sha256, 'canonical cached diff hash');
  assert(gitText(REPO, 'rev-parse', 'HEAD') === canonical.head, 'canonical HEAD drift');
  assert(gitText(REPO, 'rev-parse', 'HEAD^{tree}') === canonical.tree, 'canonical tree drift');
  assert(gitText(REPO, 'rev-parse', 'refs/remotes/upstream/main') === canonical.upstream_main, 'upstream/main drift');
  const worktreeDiff = gitBytes(REPO, 'diff', '--binary', '--no-ext-diff', '--');
  const cachedDiff = gitBytes(REPO, 'diff', '--cached', '--binary', '--no-ext-diff', '--');
  assert(sha256Bytes(worktreeDiff) === canonical.worktree_diff_binary_sha256, 'canonical worktree diff drift');
  assert(sha256Bytes(cachedDiff) === canonical.cached_diff_binary_sha256, 'canonical cached diff drift');

  const observed = currentStatusSnapshot(REPO);
  const frozen = canonical.status;
  assert(frozen && typeof frozen === 'object', 'canonical status snapshot missing');
  assertSha(frozen.porcelain_v2_z_sha256, 'canonical status porcelain hash');
  assertSha(frozen.paths_nul_sha256, 'canonical status path-list hash');
  assertSha(frozen.untracked_paths_nul_sha256, 'canonical untracked path-list hash');
  assertExactArray(frozen.paths, sortedUnique(frozen.paths ?? []), 'canonical frozen status paths sort/uniqueness');
  assertExactArray(frozen.untracked_paths, sortedUnique(frozen.untracked_paths ?? []), 'canonical frozen untracked paths sort/uniqueness');
  assert(frozen.porcelain_v2_z_sha256 === observed.porcelain_v2_z_sha256, 'canonical porcelain-v2 status drift');
  assertExactArray(observed.paths, frozen.paths, 'canonical status paths');
  assert(frozen.paths_nul_sha256 === observed.paths_nul_sha256, 'canonical status path-list hash drift');
  assertExactArray(observed.untracked_paths, frozen.untracked_paths, 'canonical untracked paths');
  assert(frozen.untracked_paths_nul_sha256 === observed.untracked_paths_nul_sha256, 'canonical untracked path-list hash drift');
}

function validateRecovery(manifest) {
  const recovery = manifest.repo?.recovery;
  assert(recovery && typeof recovery === 'object', 'repo.recovery missing');
  assert(recovery.ref === 'refs/heads/rex/rule-execution-recovery-u011-20260814', 'recovery ref mismatch');
  assertGitOid(recovery.tip, 'recovery tip');
  assertGitOid(recovery.tree, 'recovery tree');
  assertGitOid(recovery.common_base, 'recovery common_base');
  const actualTip = gitText(REPO, 'rev-parse', recovery.ref);
  assert(actualTip === recovery.tip, 'recovery tip drift');
  assert(gitText(REPO, 'rev-parse', `${actualTip}^{tree}`) === recovery.tree, 'recovery tree drift');
  const canonicalHead = manifest.repo.canonical.head;
  assert(gitText(REPO, 'merge-base', actualTip, canonicalHead) === recovery.common_base, 'recovery/common-main base drift');
  assert(recovery.role === 'FORENSIC_ONLY', 'recovery branch must remain FORENSIC_ONLY');
}

function validateRemote(manifest) {
  const remote = manifest.repo?.remote;
  assert(remote && typeof remote === 'object', 'repo.remote missing');
  assert(remote.name === 'upstream', 'reserved final-task remote name drift');
  const fetchUrls = gitText(REPO, 'remote', 'get-url', '--all', remote.name).split('\n').filter(Boolean);
  const pushUrls = gitText(REPO, 'remote', 'get-url', '--push', '--all', remote.name).split('\n').filter(Boolean);
  assertExactArray(fetchUrls, [remote.fetch_url], 'upstream fetch URL list');
  assertExactArray(pushUrls, [remote.push_url], 'upstream push URL list');
}

function validateStale(manifest) {
  const stale = manifest.repo?.stale;
  assert(stale && typeof stale === 'object', 'repo.stale missing');
  assert(stale.path === UNSAFE_MEMORY_ROOT, `stale checkout path mismatch: ${stale.path}`);
  assert(stale.role === 'STALE_READ_ONLY_PROTECTED', 'stale checkout role mismatch');
  for (const [field, label] of [
    ['status_porcelain_v2_z_sha256', 'stale status hash'],
    ['worktree_diff_binary_sha256', 'stale worktree diff hash'],
    ['cached_diff_binary_sha256', 'stale cached diff hash'],
  ]) assertSha(stale[field], label);
  assertGitOid(stale.head, 'stale head');
  assertGitOid(stale.tree, 'stale tree');
  assert(gitText(stale.path, 'rev-parse', 'HEAD') === stale.head, 'stale HEAD drift');
  assert(gitText(stale.path, 'rev-parse', 'HEAD^{tree}') === stale.tree, 'stale tree drift');
  const status = gitBytes(stale.path, 'status', '--porcelain=v2', '-z', '--untracked-files=all');
  const worktreeDiff = gitBytes(stale.path, 'diff', '--binary', '--no-ext-diff', '--');
  const cachedDiff = gitBytes(stale.path, 'diff', '--cached', '--binary', '--no-ext-diff', '--');
  assert(sha256Bytes(status) === stale.status_porcelain_v2_z_sha256, 'stale status drift');
  assert(sha256Bytes(worktreeDiff) === stale.worktree_diff_binary_sha256, 'stale worktree diff drift');
  assert(sha256Bytes(cachedDiff) === stale.cached_diff_binary_sha256, 'stale cached diff drift');
}

function validateSafeBootstrap(manifest, artifacts) {
  const policy = manifest.safe_bootstrap_policy;
  assert(policy && typeof policy === 'object', 'safe_bootstrap_policy missing');
  assert(policy.required === true, 'safe bootstrap is not mandatory');
  assert(policy.neutral_cwd_required === true, 'neutral cwd is not mandatory');
  assert(policy.start_in_repo_allowed === false, 'starting inside a governed checkout is improperly allowed');
  assert(policy.artifact_id === 'safe_bootstrap', 'safe bootstrap artifact binding mismatch');
  assert(policy.hook_path === '.codex/hooks.json', 'hook hazard path mismatch');
  assert(policy.unsafe_memory_root === UNSAFE_MEMORY_ROOT, 'unsafe MEMORY_ROOT declaration mismatch');
  assertSha(policy.hooks_sha256, 'repo hooks hash');
  assert(typeof policy.neutral_root === 'string' && isAbsolute(policy.neutral_root), 'neutral_root must be absolute');
  const forbidden = [manifest.repo.canonical.path, manifest.repo.stale.path].sort();
  assertExactArray(policy.forbidden_start_roots, forbidden, 'safe bootstrap forbidden roots');
  for (const root of forbidden) assertOutside(policy.neutral_root, root, 'neutral_root');

  const hookPath = resolveRepoFile(policy.hook_path, 'repo hooks');
  const hookSource = readText(hookPath, 'repo hooks');
  assert(sha256Bytes(Buffer.from(hookSource, 'utf8')) === policy.hooks_sha256, 'repo hooks byte drift');
  assert(hookSource.includes(UNSAFE_MEMORY_ROOT), 'repo hooks no longer contain the frozen unsafe MEMORY_ROOT hazard');

  const safeSource = artifacts.safe_bootstrap.source;
  for (const required of [policy.neutral_root, ...forbidden, UNSAFE_MEMORY_ROOT, PASS_TOKEN]) {
    assert(safeSource.includes(required), `safe-bootstrap instructions omit required literal: ${required}`);
  }
  assert(/neutral/iu.test(safeSource), 'safe-bootstrap instructions omit neutral-cwd requirement');
  assert(safeSource.includes('MEMORY_ROOT'), 'safe-bootstrap instructions omit isolated MEMORY_ROOT');
  assert(safeSource.includes('search_memory.py'), 'safe-bootstrap instructions omit isolated memory search');
  assert(safeSource.includes('--no-hardlinks'), 'safe-bootstrap instructions omit physically independent clone');
  assert(safeSource.includes('memory-root'), 'safe-bootstrap instructions omit dedicated dirty memory clone');
  assert(safeSource.includes('comparison-root'), 'safe-bootstrap instructions omit separate clean comparison clone');
  for (const key of LOCAL_GIT_ENV_KEYS) {
    assert(safeSource.includes(key), `safe-bootstrap instructions omit forbidden Git variable: ${key}`);
  }
}

function validateStateClaims(artifacts, manifest) {
  const state = artifacts.state_json;
  assert(state.state === 'READY_FOR_NEW_SESSION_RECOVERY_REQUIRED', 'state recovery status mismatch');
  assert(state.next_state === 'READ_ONLY_AUTHORITY_GATE_EVIDENCE_OWNER_ADJUDICATION', 'state next recovery phase drift');
  assert(state.prohibited_next_state === 'U014_IMPLEMENTATION', 'state no longer blocks U014 as next phase');
  assert(state.canonical.tracked_working_diff_sha256 === manifest.repo.canonical.worktree_diff_binary_sha256,
    'state/manifest canonical worktree diff hash mismatch');
  assert(state.canonical.tracked_cached_diff_sha256 === manifest.repo.canonical.cached_diff_binary_sha256,
    'state/manifest canonical cached diff hash mismatch');
  assert(state.canonical.status_porcelain_v2_z_sha256 === manifest.repo.canonical.status.porcelain_v2_z_sha256,
    'state/manifest canonical status hash mismatch');

  const worktrees = state.worktree_and_refs;
  assert(worktrees && typeof worktrees === 'object', 'state worktree/ref census missing');
  const worktreeBytes = gitBytes(REPO, 'worktree', 'list', '--porcelain');
  assert(sha256Bytes(worktreeBytes) === worktrees.worktree_porcelain_sha256, 'registered worktree census drift');
  const worktreeCount = worktreeBytes.toString('utf8').split('\n').filter((line) => line.startsWith('worktree ')).length;
  assert(worktreeCount === worktrees.registered_worktree_count, 'registered worktree count drift');
  const refLines = bytewiseSort(gitText(REPO, 'show-ref').split('\n').filter(Boolean));
  const refBytes = Buffer.from(refLines.length ? `${refLines.join('\n')}\n` : '', 'utf8');
  assert(sha256Bytes(refBytes) === worktrees.show_ref_sorted_sha256, 'sorted ref census drift');

  const forensic = state.forensic_recovery;
  const mainPaths = bytewiseSort(gitNulPaths(REPO, 'diff', '--name-only', '-z',
    `${forensic.common_base_with_canonical}..${manifest.repo.canonical.head}`, '--'));
  const recoveryPaths = bytewiseSort(gitNulPaths(REPO, 'diff', '--name-only', '-z',
    `${forensic.common_base_with_canonical}..${manifest.repo.recovery.tip}`, '--'));
  assert(mainPaths.length === forensic.canonical_changed_paths_from_base, 'canonical changed-path denominator drift');
  assert(recoveryPaths.length === forensic.recovery_changed_paths_from_base, 'recovery changed-path denominator drift');
  const recoverySet = new Set(recoveryPaths);
  const overlap = mainPaths.filter((path) => recoverySet.has(path));
  assertExactArray(overlap, forensic.exact_overlap_paths, 'state exact overlap paths');
  assertExactArray(overlap, artifacts.ledger_json.shared_owner_overlap.paths, 'ledger exact overlap paths');
  assert(forensic.unowned_overlap_disposition === 'BLOCKED_DIRTY_OVERLAP', 'state overlap disposition drift');

  const evidence = state.external_evidence;
  assert(evidence && typeof evidence === 'object', 'state external evidence missing');
  const topLevel = readdirSync(evidence.root, { withFileTypes: true });
  assert(topLevel.length === evidence.top_level_roots, 'external evidence top-level denominator drift');
  const inventory = evidenceInventory(evidence.root);
  assert(inventory.file_count === evidence.file_count, 'external evidence file denominator drift');
  assertExactArray(inventory.excluded, evidence.excluded_non_regular_entries, 'external evidence excluded non-regular entries');
  assert(inventory.sha256 === evidence.relative_path_file_hash_inventory_sha256, 'external evidence inventory drift');

  const u009Root = join(evidence.root, evidence.u009_approved_root);
  const u009Stat = lstatSync(u009Root, { bigint: true });
  assert(`${u009Stat.dev}/${u009Stat.ino}` === evidence.u009_current_root_device_inode,
    'U009 current receipt-root device/inode drift');
  assert(evidence.u009_state === 'HISTORICAL_BYTES_ROOT_IDENTITY_MISMATCH_NOT_FRESH_VALID',
    'U009 evidence state was improperly promoted');

  const transcript = evidence.transcript;
  const transcriptBytes = readBytes(transcript.path, 'bounded approval transcript');
  assert(transcriptBytes.length >= transcript.prefix_bytes, 'approval transcript shorter than frozen prefix');
  const prefix = transcriptBytes.subarray(0, transcript.prefix_bytes);
  assert(sha256Bytes(prefix) === transcript.prefix_sha256, 'approval transcript prefix drift');
  const prefixLineCount = prefix.toString('utf8').split('\n').length - 1;
  assert(prefixLineCount === transcript.prefix_lines, 'approval transcript line boundary drift');
}

function validateSelfGrowthExtraction(artifacts) {
  const extraction = artifacts.state_json.self_growth_extraction;
  assert(extraction && typeof extraction === 'object', 'self-growth extraction state missing');
  assert(extraction.scope === 'FRAMEWORK_META_NOT_PRODUCT', 'self-growth extraction scope drift');
  assert(extraction.completion_effect === 'NONE', 'self-growth extraction improperly changes completion');

  const candidate = extraction.semantic_candidate;
  assert(candidate?.id === 'SC-20260820-001', 'semantic candidate id drift');
  assert(candidate.status === 'CANDIDATE_PENDING_REVIEW', 'semantic candidate was improperly promoted');
  assertSha(candidate.sha256, 'semantic candidate file hash');
  const candidateSource = readText(resolveRepoFile(candidate.path, 'semantic candidate file'), 'semantic candidate file');
  assert(sha256Bytes(Buffer.from(candidateSource, 'utf8')) === candidate.sha256, 'semantic candidate file drift');
  const candidateRecords = candidateSource.split('\n').filter(Boolean)
    .map((line, index) => parseJsonText(line, `semantic candidate line ${index + 1}`));
  const candidateRecord = candidateRecords.find((record) => record.id === candidate.id);
  assert(candidateRecord?.status === 'CANDIDATE', 'semantic candidate record missing or no longer pending');
  const promptCandidate = extraction.prompt_semantic_candidate;
  assert(promptCandidate?.id === 'SC-20260820-002', 'prompt semantic candidate id drift');
  assert(promptCandidate.status === 'CANDIDATE_PENDING_REVIEW', 'prompt semantic candidate was improperly promoted');
  assert(promptCandidate.path === candidate.path, 'semantic candidate file path split');
  assert(promptCandidate.sha256 === candidate.sha256, 'semantic candidate file hash split');
  const promptCandidateRecord = candidateRecords.find((record) => record.id === promptCandidate.id);
  assert(promptCandidateRecord?.status === 'CANDIDATE', 'prompt semantic candidate record missing or no longer pending');

  const episode = extraction.meta_episode;
  assert(episode?.id === 'EP-20260820-133', 'meta episode id drift');
  for (const [pathField, shaField, label] of [
    ['index_path', 'index_sha256', 'meta episode index'],
    ['archive_path', 'archive_sha256', 'meta episode archive'],
    ['raw_path', 'raw_sha256', 'meta episode raw file'],
  ]) {
    assertSha(episode[shaField], `${label} hash`);
    const bytes = readBytes(resolveRepoFile(episode[pathField], label), label);
    assert(sha256Bytes(bytes) === episode[shaField], `${label} drift`);
  }
  const indexSource = readText(resolveRepoFile(episode.index_path, 'meta episode index'), 'meta episode index');
  assert(indexSource.includes(`\"id\": \"${episode.id}\"`), 'meta episode id missing from index');
  const rawSource = readText(resolveRepoFile(episode.raw_path, 'meta episode raw file'), 'meta episode raw file');
  assert(rawSource.includes(`**ID:** ${episode.id}`), 'meta episode id missing from raw file');

  const marker = extraction.unlock_marker;
  assert(marker.verification === 'REGULAR_FILE_EXISTENCE_ONLY', 'self-growth unlock marker policy drift');
  assert(marker.volatile_hook_bookkeeping === true, 'self-growth unlock marker volatility declaration missing');
  readBytes(resolveRepoFile(marker.path, 'self-growth unlock marker'), 'self-growth unlock marker');
}

function validateCompletionBoundary(manifest) {
  const boundary = manifest.completion_boundary;
  assert(boundary && typeof boundary === 'object', 'completion_boundary missing');
  assert(boundary.handoff_only === true, 'manifest does not declare handoff-only scope');
  assert(boundary.implementation_authorized === false, 'handoff manifest improperly authorizes implementation');
  assert(boundary.goal_complete === false, 'handoff manifest improperly completes the Goal');
  assert(boundary.completion_token_emitted === false, 'handoff manifest improperly emits a completion token');
}

function main() {
  const manifestSource = readText(MANIFEST_PATH, 'recovery handoff manifest');
  assertNoDraftTokens(manifestSource, 'recovery handoff manifest');
  const manifest = parseJsonText(manifestSource, 'recovery handoff manifest');
  assertJsonFileEnd(manifest, MANIFEST_PATH, 'recovery handoff manifest');
  assert(manifest.schema_version === 1, 'manifest schema_version mismatch');
  assert(manifest.handoff_id === HANDOFF_ID, 'manifest handoff_id mismatch');
  assert(manifest.status === 'READY_FOR_NEW_SESSION_RECOVERY_REQUIRED', 'manifest status mismatch');
  assert(manifest.expected_pass_token === PASS_TOKEN, 'manifest expected pass token mismatch');

  validateInvocationBoundary(manifest);
  validateVerifier(manifest);
  validateLaunchPrompt(manifest);
  const artifacts = validateArtifacts(manifest);
  validateAuthorities(manifest);
  validateContainment(manifest);
  validateCanonical(manifest);
  validateRemote(manifest);
  validateRecovery(manifest);
  validateStale(manifest);
  validateSafeBootstrap(manifest, artifacts);
  validateStateClaims(artifacts, manifest);
  validateSelfGrowthExtraction(artifacts);
  validateCompletionBoundary(manifest);
  validateRedteamClosure(artifacts.redteam_a, 'A', artifacts.handoff.sha256);
  validateRedteamClosure(artifacts.redteam_b, 'B', artifacts.handoff.sha256);

  process.stdout.write(`${PASS_TOKEN}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`RECOVERY_HANDOFF_GATE_FAIL: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
