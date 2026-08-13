#!/usr/bin/env node
/**
 * Frozen, candidate-independent verifier for ADR-AGENT-001.
 *
 * The candidate launcher is never imported and never launches or signs evidence.
 * Its pre-key describe-contract output is untrusted and must equal the TCB's
 * independently derived native contract, which this verifier derives again.
 * Trust starts at an out-of-band, dual-signed precommit anchor created before
 * any native child.  A successful verification consumes that anchor once.
 */
import {
  createHash, createPublicKey, generateKeyPairSync, sign as signBytes, verify as verifyBytes,
} from 'node:crypto';
import {
  chmodSync, closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, realpathSync, statSync,
  unlinkSync, writeSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SELF = realpathSync(fileURLToPath(import.meta.url));
const TCB = realpathSync(join(dirname(SELF), 'agent-evidence-tcb.mjs'));
const ROLES = Object.freeze(['plan-agent', 'work-agent', 'oracle', 'quality-gate']);
const HARNESSES = Object.freeze(['claude', 'codex']);
const ROLE_TIERS = Object.freeze({
  'plan-agent': 'reasoning-heavy', 'work-agent': 'core-execution',
  oracle: 'reasoning-heavy', 'quality-gate': 'core-execution',
});
const ROLE_PATHS = Object.freeze({
  claude: Object.fromEntries(ROLES.map((role) => [role, `.claude/agents/${role}.md`])),
  codex: Object.fromEntries(ROLES.map((role) => [role, `.codex/agents/${role}.toml`])),
});
const HASH = /^[a-f0-9]{64}$/;
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
const jsonBytes = (value) => Buffer.from(`${stable(value)}\n`, 'utf8');
const codexApiSandbox = (mode) => mode === 'workspace-write'
  ? { type: 'workspaceWrite', writableRoots: [], networkAccess: false, excludeTmpdirEnvVar: true, excludeSlashTmp: true }
  : { type: 'readOnly', networkAccess: false };
const fail = (message) => { throw new Error(message); };
const within = (parent, child) => child === parent || child.startsWith(parent + sep);
const overlaps = (a, b) => within(a, b) || within(b, a);
const exactKeys = (value, keys, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} is not an object`);
  if (stable(Object.keys(value).sort()) !== stable([...keys].sort())) fail(`${label} keys are not exact`);
};
const option = (argv, name) => {
  const index = argv.indexOf(name);
  return index < 0 ? undefined : argv[index + 1];
};

function cleanGitEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
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

function targetTreeManifest(root, targetCommit, workPacketPath) {
  assertNoReplaceRefs(root);
  if (!/^[a-f0-9]{40}$/.test(targetCommit)
    || gitRead(root, ['cat-file', '-t', targetCommit], 'git target object type').toString('utf8') !== 'commit\n') {
    fail('target commit is not one exact commit object');
  }
  const targetTree = gitRead(root, ['rev-parse', `${targetCommit}^{tree}`], 'git target tree').toString('utf8').trim();
  if (!/^[a-f0-9]{40}$/.test(targetTree)
    || gitRead(root, ['cat-file', '-t', targetTree], 'git target tree type').toString('utf8') !== 'tree\n') {
    fail('target commit does not resolve to one exact tree object');
  }
  const packetReal = realpathSync(workPacketPath);
  if (!within(root, packetReal)) fail('work packet must be a tracked target-commit file inside the frozen checkout');
  const packetRel = packetReal.slice(root.length + 1);
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
const iso = (value, label) => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(`${label} is not an ISO timestamp`);
  return parsed;
};

function secureRead(path, root, label) {
  const absolute = resolve(path);
  if (root && !within(root, absolute)) fail(`${label} escapes evidence root`);
  const real = realpathSync(absolute);
  if (real !== absolute) fail(`${label} is symlinked`);
  const stat = statSync(real);
  if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600) {
    fail(`${label} is not a 0600 single-link regular file`);
  }
  return { path: real, bytes: readFileSync(real) };
}

function canonicalDirectory(path, label) {
  const absolute = resolve(path);
  const real = realpathSync(absolute);
  if (real !== absolute || !statSync(real).isDirectory()) fail(`${label} is not a canonical directory`);
  return real;
}

function parseJson(bytes, label) {
  try { return JSON.parse(bytes.toString('utf8')); } catch { fail(`${label} is invalid JSON`); }
}

function parseJsonl(bytes, label) {
  const lines = bytes.toString('utf8').split('\n').filter(Boolean);
  if (!lines.length) fail(`${label} is empty`);
  return lines.map((line, index) => {
    try { return JSON.parse(line); } catch { fail(`${label} line ${index + 1} is invalid JSON`); }
  });
}

function verifySignature(publicKey, core, hash, signature, label) {
  const bytes = Buffer.from(stable(core), 'utf8');
  if (sha256(bytes) !== hash) fail(`${label} core hash mismatch`);
  if (!verifyBytes(null, bytes, publicKey, Buffer.from(signature, 'base64'))) fail(`${label} Ed25519 signature mismatch`);
}

function pemKey(pem, expectedFingerprint, label) {
  if (typeof pem !== 'string' || !pem.includes('PUBLIC KEY')) fail(`${label} public key missing`);
  const key = createPublicKey(pem);
  if (key.asymmetricKeyType !== 'ed25519') fail(`${label} key is not Ed25519`);
  const der = key.export({ type: 'spki', format: 'der' });
  if (sha256(der) !== expectedFingerprint) fail(`${label} public-key fingerprint mismatch`);
  return key;
}

function exclusive0600(path, bytes, label) {
  let fd;
  try {
    fd = openSync(path, 'wx', 0o600);
    writeSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
  chmodSync(path, 0o600);
  const parentFd = openSync(dirname(path), 'r');
  try { fsyncSync(parentFd); } finally { closeSync(parentFd); }
  const stat = statSync(path);
  if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600) fail(`${label} is not an exclusive 0600 single-link file`);
}

function newExternalPath(value, root, label) {
  if (!isAbsolute(value || '') || existsSync(value)) fail(`${label} must be a new absolute path`);
  const parent = realpathSync(dirname(value));
  const canonical = join(parent, value.slice(dirname(value).length + 1));
  if (within(root, canonical)) fail(`${label} must be outside the frozen repo`);
  return canonical;
}

function validateCounterBaseCore(core, ready, readyPath, readySha, commitments, readyCreated, readyExpiry, tcbPath, packetPath) {
  const keys = ['schema_version', 'transaction_id', 'created_at', 'expires_at', 'repo_root', 'evidence_root', 'consume_path', 'target_commit', 'target_tree_manifest', 'tcb', 'verifier', 'candidate_launcher', 'work_packet', 'counter_ready', 'evidence_public_key_pem', 'evidence_fingerprint_sha256', 'nonce_commitments', 'nonce_set_sha256', 'model_resolutions', 'runs'];
  exactKeys(core, keys, 'counter request base_core');
  if (core.schema_version !== 'luca.agent-evidence-anchor.v2' || typeof core.transaction_id !== 'string' || !core.transaction_id) {
    fail('counter request base_core identity mismatch');
  }
  exactKeys(core.tcb, ['path', 'sha256'], 'counter request TCB');
  exactKeys(core.verifier, ['path', 'sha256'], 'counter request verifier');
  exactKeys(core.candidate_launcher, ['path', 'sha256', 'execution'], 'counter request candidate launcher');
  exactKeys(core.work_packet, ['path', 'sha256', 'source_sha256'], 'counter request work packet');
  exactKeys(core.counter_ready, ['path', 'sha256', 'ready_id', 'created_at', 'expires_at', 'socket_path'], 'counter request ready commitment');
  const root = commitments.repo_root;
  const candidatePath = realpathSync(join(root, 'scripts/agent-launcher.mjs'));
  if (realpathSync(core.repo_root) !== root || core.target_commit !== commitments.target_commit
    || realpathSync(core.tcb.path) !== tcbPath || core.tcb.sha256 !== commitments.tcb_sha256
    || sha256(readFileSync(tcbPath)) !== commitments.tcb_sha256
    || realpathSync(core.verifier.path) !== SELF || core.verifier.sha256 !== commitments.verifier_sha256
    || sha256(readFileSync(SELF)) !== commitments.verifier_sha256
    || realpathSync(core.work_packet.path) !== packetPath
    || core.work_packet.sha256 !== commitments.work_packet_sha256
    || core.work_packet.source_sha256 !== commitments.work_packet_source_sha256
    || core.counter_ready.path !== readyPath || core.counter_ready.sha256 !== readySha
    || core.counter_ready.ready_id !== ready.ready_id || core.counter_ready.created_at !== ready.created_at
    || core.counter_ready.expires_at !== ready.expires_at || core.counter_ready.socket_path !== ready.socket_path
    || core.candidate_launcher.execution !== 'describe-contract-only-before-evidence-key'
    || realpathSync(core.candidate_launcher.path) !== candidatePath
    || sha256(readFileSync(candidatePath)) !== core.candidate_launcher.sha256) {
    fail('counter request differs from frozen ready commitments');
  }
  const packetBytes = readFileSync(packetPath);
  const packet = validatePacket(parseJson(packetBytes, 'counter request work packet'));
  if (sha256(packetBytes) !== commitments.work_packet_source_sha256 || packet.sha256 !== commitments.work_packet_sha256) {
    fail('counter request work packet drifted after ready');
  }
  if (stable(core.target_tree_manifest) !== stable(targetTreeManifest(root, core.target_commit, packetPath))) {
    fail('counter request target-tree manifest is not exact');
  }
  const created = iso(core.created_at, 'counter base_core.created_at');
  const expires = iso(core.expires_at, 'counter base_core.expires_at');
  if (created < readyCreated || created >= expires || expires > readyExpiry || Date.now() > readyExpiry) {
    fail('counter request is outside the ready lifetime');
  }
  const evidenceRoot = resolve(core.evidence_root);
  const consumePath = resolve(core.consume_path);
  const transactionRoot = realpathSync(dirname(evidenceRoot));
  if (!isAbsolute(core.evidence_root || '') || !isAbsolute(core.consume_path || '')
    || evidenceRoot !== join(transactionRoot, evidenceRoot.slice(dirname(evidenceRoot).length + 1))
    || consumePath !== join(transactionRoot, consumePath.slice(dirname(consumePath).length + 1))
    || dirname(evidenceRoot) !== transactionRoot || dirname(consumePath) !== transactionRoot
    || within(root, evidenceRoot) || within(root, consumePath) || overlaps(evidenceRoot, consumePath)
    || overlaps(readyPath, transactionRoot) || overlaps(resolve(ready.socket_path), transactionRoot)) {
    fail('counter request evidence/consume location is unsafe');
  }
  const evidenceKey = createPublicKey(core.evidence_public_key_pem);
  if (evidenceKey.asymmetricKeyType !== 'ed25519'
    || sha256(evidenceKey.export({ type: 'spki', format: 'der' })) !== core.evidence_fingerprint_sha256) {
    fail('counter request evidence key/fingerprint mismatch');
  }
  const routing = routingProjection(root);
  const effectiveModels = verifyModelResolutions(core.model_resolutions, root, evidenceRoot, routing);
  if (!Array.isArray(core.nonce_commitments) || core.nonce_commitments.length !== 8
    || new Set(core.nonce_commitments.map((item) => item?.run_id)).size !== 8
    || new Set(core.nonce_commitments.map((item) => item?.commitment_sha256)).size !== 8
    || core.nonce_commitments.some((item) => {
      try { exactKeys(item, ['run_id', 'commitment_sha256'], 'counter nonce commitment'); } catch { return true; }
      return typeof item.run_id !== 'string' || !item.run_id || !HASH.test(item.commitment_sha256 || '');
    })
    || sha256(Buffer.from(stable(core.nonce_commitments), 'utf8')) !== core.nonce_set_sha256
    || !Array.isArray(core.runs) || core.runs.length !== 8
    || new Set(core.runs.map((run) => run?.run_id)).size !== 8
    || core.runs.some((run) => {
      try { exactKeys(run, ['run_id', 'harness', 'role', 'projection', 'input_sha256', 'candidate_contract_sha256', 'native_descriptor_sha256', 'write_roots', 'sandbox_contract'], 'counter anchor run'); } catch { return true; }
      const expectedProjection = run.harness === 'claude'
        ? effectiveModels.get(`claude/${ROLE_TIERS[run.role]}`)?.projection
        : routing.tiers[ROLE_TIERS[run.role]]?.effort;
      return !HARNESSES.includes(run.harness) || !ROLES.includes(run.role) || run.projection !== expectedProjection
        || !HASH.test(run.input_sha256 || '') || !HASH.test(run.candidate_contract_sha256 || '')
        || !HASH.test(run.native_descriptor_sha256 || '') || !Array.isArray(run.write_roots)
        || !core.nonce_commitments.some((nonce) => nonce.run_id === run.run_id);
    })) {
    fail('counter request nonce/run precommitment is invalid');
  }
}

async function counterSignServer(argv) {
  const readyArg = option(argv, '--ready');
  const socketArg = option(argv, '--socket');
  const tcbArg = option(argv, '--tcb');
  const rootArg = option(argv, '--repo-root');
  const target = option(argv, '--target-commit');
  const packetArg = option(argv, '--work-packet');
  const ttl = Number(option(argv, '--ttl-ms') || 3_600_000);
  if (!tcbArg || !rootArg || !packetArg || !/^[a-f0-9]{40}$/.test(target || '')
    || !Number.isInteger(ttl) || ttl < 60_000 || ttl > 86_400_000) {
    fail('counter-sign-server requires ready/socket/tcb/repo-root/target-commit/work-packet and a bounded ttl');
  }
  const root = canonicalDirectory(rootArg, 'counter frozen repo root');
  const tcbPath = realpathSync(tcbArg);
  const packetPath = realpathSync(packetArg);
  if (!statSync(tcbPath).isFile() || !statSync(packetPath).isFile()) fail('counter TCB/work packet is not a regular file');
  if (tcbPath !== TCB || within(root, tcbPath) || within(root, SELF)) fail('counter TCB/verifier identity is not the external frozen pair');
  const readyPath = newExternalPath(readyArg, root, 'counter ready artifact');
  const socketPath = newExternalPath(socketArg, root, 'counter Unix socket');
  if (readyPath === socketPath || socketPath.length > 100) fail('counter ready/socket path is unsafe or too long');
  const packetBytes = readFileSync(packetPath);
  const packet = validatePacket(parseJson(packetBytes, 'counter work packet'));
  const pair = generateKeyPairSync('ed25519');
  const publicPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const fingerprint = sha256(pair.publicKey.export({ type: 'spki', format: 'der' }));
  const created = Date.now();
  const expiry = created + ttl;
  const commitments = {
    tcb_sha256: sha256(readFileSync(tcbPath)),
    verifier_sha256: sha256(readFileSync(SELF)),
    repo_root: root,
    target_commit: target,
    work_packet_sha256: packet.sha256,
    work_packet_source_sha256: sha256(packetBytes),
  };
  const ready = {
    schema_version: 'luca.agent-evidence-counter-ready.v1',
    ready_id: `counter-${createHash('sha256').update(pair.publicKey.export({ type: 'spki', format: 'der' })).update(String(created)).digest('hex').slice(0, 24)}`,
    created_at: new Date(created).toISOString(),
    expires_at: new Date(expiry).toISOString(),
    socket_path: socketPath,
    counter_public_key_pem: publicPem,
    counter_fingerprint_sha256: fingerprint,
    commitments,
  };
  const readyBytes = Buffer.from(`${stable(ready)}\n`, 'utf8');
  const readySha = sha256(readyBytes);
  let claimed = false;
  let completed = false;
  let activeSocket = null;
  let expiryTimer;
  const cleanupSocket = () => { if (existsSync(socketPath)) { try { unlinkSync(socketPath); } catch { } } };
  const server = createServer({ allowHalfOpen: true }, (socket) => {
    if (claimed) { socket.destroy(); return; }
    claimed = true;
    activeSocket = socket;
    server.close();
    const chunks = [];
    let size = 0;
    let settled = false;
    const reject = (message) => {
      if (settled) return;
      settled = true;
      socket.end(`${JSON.stringify({ schema_version: 'luca.agent-evidence-counter-error.v1', error: message })}\n`);
      process.exitCode = 2;
    };
    socket.on('data', (chunk) => {
      size += chunk.length;
      if (size > 16 * 1024 * 1024) { reject('counter request exceeds 16 MiB'); return; }
      chunks.push(Buffer.from(chunk));
    });
    socket.on('end', () => {
      if (settled) return;
      try {
        const supplied = Buffer.concat(chunks);
        if (!supplied.length || supplied.at(-1) !== 0x0a || supplied.subarray(0, supplied.length - 1).includes(0x0a)) {
          fail('counter request must be exactly one newline-terminated canonical JSON line');
        }
        const requestBytes = supplied.subarray(0, supplied.length - 1);
        const request = parseJson(requestBytes, 'counter request');
        exactKeys(request, ['schema_version', 'ready_id', 'ready_sha256', 'base_core_sha256', 'base_core'], 'counter request');
        if (Buffer.from(stable(request), 'utf8').compare(requestBytes) !== 0
          || request.schema_version !== 'luca.agent-evidence-counter-request.v1'
          || request.ready_id !== ready.ready_id || request.ready_sha256 !== readySha
          || request.base_core_sha256 !== sha256(Buffer.from(stable(request.base_core), 'utf8'))) {
          fail('counter request canonical/ready/base-core commitment mismatch');
        }
        validateCounterBaseCore(request.base_core, ready, readyPath, readySha, commitments, created, expiry, tcbPath, packetPath);
        const signature = signBytes(null, Buffer.from(stable(request.base_core), 'utf8'), pair.privateKey).toString('base64');
        const response = {
          schema_version: 'luca.agent-evidence-counter-signature.v1',
          ready_id: ready.ready_id,
          ready_sha256: readySha,
          base_core_sha256: request.base_core_sha256,
          counter_fingerprint_sha256: fingerprint,
          signature_ed25519: signature,
        };
        settled = true;
        completed = true;
        socket.end(`${stable(response)}\n`);
      } catch (error) { reject(error.message); }
    });
    socket.on('error', (error) => reject(error.message));
  });
  await new Promise((accept, reject) => {
    const startupError = (error) => { cleanupSocket(); reject(error); };
    server.once('error', startupError);
    server.listen(socketPath, () => { server.off('error', startupError); accept(); });
  });
  server.on('error', (error) => {
    process.stderr.write(`AGENT_EVIDENCE_COUNTER_SERVER_ERROR ${error.message}\n`);
    process.exitCode = 2;
    cleanupSocket();
  });
  chmodSync(socketPath, 0o600);
  const socketStat = statSync(socketPath);
  if (!socketStat.isSocket() || (socketStat.mode & 0o777) !== 0o600) {
    server.close();
    cleanupSocket();
    fail('counter socket is not an exclusive 0600 Unix socket');
  }
  try {
    exclusive0600(readyPath, readyBytes, 'counter ready artifact');
  } catch (error) {
    server.close();
    cleanupSocket();
    throw error;
  }
  process.stdout.write(`${JSON.stringify({ ready_path: readyPath, ready_sha256: readySha, counter_fingerprint_sha256: fingerprint })}\nCOUNTER_SIGN_SERVER_READY\n`);
  expiryTimer = setTimeout(() => {
    if (!completed) process.exitCode = 2;
    if (activeSocket) activeSocket.destroy();
    server.close();
    cleanupSocket();
  }, ttl);
  await new Promise((accept) => server.once('close', accept));
  clearTimeout(expiryTimer);
  cleanupSocket();
}

function routingProjection(root) {
  const path = join(root, '.claude/skill-os/model-routing.yaml');
  const bytes = readFileSync(path);
  const text = bytes.toString('utf8');
  const lineup = (text.match(/^known_lineup:\s*\[([^\]]+)\]/m)?.[1] || '')
    .split(',').map((item) => item.trim()).filter(Boolean);
  if (!lineup.length || new Set(lineup).size !== lineup.length
    || lineup.some((alias) => !/^[A-Za-z0-9._-]+$/.test(alias))) fail('routing known_lineup is invalid');
  const tiers = {};
  const codex = text.match(/^codex:\n([\s\S]*?)(?=^# ─── 新场景|(?![\s\S]))/m)?.[1] || '';
  const efforts = codex.match(/^  tier_to_effort:\n([\s\S]*?)(?=^  [a-z_]+:|(?![\s\S]))/m)?.[1] || '';
  for (const name of ['reasoning-heavy', 'core-execution', 'guided-execution', 'mechanical']) {
    const block = text.match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [a-z][a-z-]+:|^#|(?![\\s\\S]))`, 'm'))?.[1] || '';
    const alias = block.match(/^    resolves_to:\s*([A-Za-z0-9._-]+)/m)?.[1];
    const fallback = block.match(/^    fallback:\s*([A-Za-z0-9._-]+)/m)?.[1] || null;
    const effort = efforts.match(new RegExp(`^    ${name}:\\s*(none|low|medium|high|xhigh|max)\\b`, 'm'))?.[1];
    if (!alias || !lineup.includes(alias) || !effort) fail(`routing projection missing for ${name}`);
    if (fallback && (!lineup.includes(fallback) || lineup.indexOf(fallback) !== lineup.indexOf(alias) + 1)) {
      fail(`routing fallback is not the immediately lower projection for ${name}`);
    }
    tiers[name] = { alias, fallback, effort };
  }
  const logicalBlock = text.match(/^logical_roles:\n([\s\S]*?)(?=^\S|(?![\s\S]))/m)?.[1] || '';
  const agentsBlock = text.match(/^agents:\n([\s\S]*?)(?=^\S|(?![\s\S]))/m)?.[1] || '';
  const logicalKeys = [...logicalBlock.matchAll(/^  ([a-z][a-z-]+):/gm)].map((match) => match[1]);
  if (stable(logicalKeys.sort()) !== stable([...ROLES].sort())) fail('routing logical role set is not exact');
  for (const role of ROLES) {
    const tier = logicalBlock.match(new RegExp(`^  ${role}:\\s*([a-z][a-z-]+)\\s*$`, 'm'))?.[1];
    const alias = agentsBlock.match(new RegExp(`^  ${role}:\\s*([A-Za-z0-9._-]+)`, 'm'))?.[1];
    if (tier !== ROLE_TIERS[role] || alias !== tiers[tier]?.alias) fail(`routing logical role/Claude projection mismatch for ${role}`);
  }
  return { path: '.claude/skill-os/model-routing.yaml', sha256: sha256(bytes), lineup, tiers };
}

const modelProbeContainsTool = (value) => {
  if (Array.isArray(value)) return value.some(modelProbeContainsTool);
  if (!value || typeof value !== 'object') return false;
  if (['tool_use', 'server_tool_use', 'mcp_tool_use'].includes(String(value.type || '').toLowerCase())) return true;
  if (typeof value.tool_use_id === 'string' && value.tool_use_id) return true;
  return Object.values(value).some(modelProbeContainsTool);
};

function claudeModelProbeArgs(alias) {
  return ['--safe-mode', '-p', '--model', alias, '--output-format', 'stream-json', '--verbose',
    '--no-session-persistence', '--tools', '', '--permission-mode', 'dontAsk',
    'Reply with exactly LUCA_CLAUDE_MODEL_PROBE_OK. Do not call tools.'];
}

function classifyClaudeResolutionProbe(bytes, stderr, exitCode, projection, expectedCwd) {
  if (!Number.isInteger(exitCode) || stderr.length) fail('Claude model-resolution probe process result is invalid');
  const events = parseJsonl(bytes, 'Claude model-resolution probe');
  if (events.some(modelProbeContainsTool)) fail('Claude safe-mode model-resolution probe invoked a tool');
  if (events.length !== 4) fail('Claude model-resolution probe must contain exactly four events');
  const [init, rate, assistant, result] = events;
  const sessionId = init?.session_id;
  if (init?.type !== 'system' || init?.subtype !== 'init'
    || rate?.type !== 'rate_limit_event' || assistant?.type !== 'assistant' || result?.type !== 'result'
    || init.cwd !== expectedCwd || init.permissionMode !== 'dontAsk'
    || stable(init.tools) !== stable([]) || !claudeFamilyMatches(projection, init.model)) {
    fail('Claude safe-mode model-resolution ordered transport/init is not exact');
  }
  if (typeof sessionId !== 'string' || !sessionId
    || !events.every((event) => event.session_id === sessionId)) {
    fail('Claude safe-mode model-resolution session binding is not exact');
  }
  const content = assistant?.message?.content;
  const assistantText = Array.isArray(content) && content.length === 1
    && content[0]?.type === 'text' && typeof content[0]?.text === 'string'
    ? content[0].text : null;
  if (exitCode === 0 && result.subtype === 'success' && result.is_error === false
    && result.result === 'LUCA_CLAUDE_MODEL_PROBE_OK' && result.terminal_reason === 'completed'
    && rate?.rate_limit_info?.status === 'allowed'
    && assistant.parent_tool_use_id === null
    && assistant?.message?.model === init.model && claudeFamilyMatches(projection, assistant.message.model)
    && assistantText === 'LUCA_CLAUDE_MODEL_PROBE_OK') {
    return { outcome: 'available', resolved_model: assistant.message.model };
  }
  const expectedCredits = /^Fable(?:\s+\d+(?:\.\d+)*)?\s+requires usage credits\.(?: Run \/usage-credits to continue or switch models with \/model\.)?$/;
  if (projection === 'fable' && exitCode === 1
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
  fail('Claude model-resolution probe is not exact success or explicit credits_required');
}

function verifyModelResolutions(items, root, evidenceRoot, routing) {
  if (!Array.isArray(items) || items.length !== 2) fail('model_resolutions must contain the exact two Claude tiers used by U008');
  const expectedTiers = ['reasoning-heavy', 'core-execution'];
  const reasoningRoute = routing.tiers['reasoning-heavy'];
  const coreRoute = routing.tiers['core-execution'];
  if (!reasoningRoute.fallback || reasoningRoute.fallback !== coreRoute.alias || coreRoute.fallback !== null) {
    fail('Claude model-resolution fallback chain is not reasoning-heavy primary -> core-execution primary');
  }
  const transactionRoot = canonicalDirectory(dirname(evidenceRoot), 'model-resolution transaction root');
  const seen = new Set();
  const effective = new Map();
  for (const item of items) {
    exactKeys(item, ['harness', 'tier', 'primary_projection', 'fallback_projection', 'effective_projection', 'effective_model', 'reason', 'path', 'sha256'], 'model resolution commitment');
    if (item.harness !== 'claude' || !expectedTiers.includes(item.tier) || seen.has(item.tier)
      || !HASH.test(item.sha256 || '')) fail('model resolution commitment identity/hash is invalid');
    seen.add(item.tier);
    const route = routing.tiers[item.tier];
    if (item.primary_projection !== route.alias || item.fallback_projection !== route.fallback) {
      fail(`model resolution route differs from routing truth for ${item.tier}`);
    }
    const expectedRecordPath = `raw/claude-${item.tier}-resolution.json`;
    if (item.path !== expectedRecordPath) fail(`model resolution path is not canonical for ${item.tier}`);
    const read = secureRead(join(evidenceRoot, item.path), evidenceRoot, `model resolution ${item.tier}`);
    if (sha256(read.bytes) !== item.sha256) fail(`model resolution hash mismatch ${item.tier}`);
    const record = parseJson(read.bytes, `model resolution ${item.tier}`);
    if (!read.bytes.equals(jsonBytes(record))) fail(`model resolution record is not canonical JSON ${item.tier}`);
    exactKeys(record, ['schema_version', 'harness', 'tier', 'primary_projection', 'fallback_projection', 'effective_projection', 'effective_model', 'reason', 'attempts'], `model resolution record ${item.tier}`);
    const projected = Object.fromEntries(Object.keys(item).filter((key) => !['path', 'sha256'].includes(key)).map((key) => [key, item[key]]));
    if (record.schema_version !== 'luca.agent-model-resolution.v1'
      || stable(projected) !== stable(Object.fromEntries(Object.keys(record).filter((key) => key !== 'schema_version' && key !== 'attempts').map((key) => [key, record[key]])))) {
      fail(`model resolution record differs from signed commitment ${item.tier}`);
    }
    if (item.tier === 'core-execution') {
      if (item.fallback_projection !== null || item.effective_projection !== item.primary_projection
        || item.reason !== 'primary_available' || !Array.isArray(record.attempts) || record.attempts.length !== 1) {
        fail('core-execution model resolution is not the exact direct route');
      }
    } else {
      if (route.fallback === null || !Array.isArray(record.attempts)) fail('reasoning-heavy model resolution lacks governed attempts');
      const fallbackUsed = item.reason === 'credits_required';
      if ((!fallbackUsed && (item.reason !== 'primary_available' || item.effective_projection !== route.alias || record.attempts.length !== 1))
        || (fallbackUsed && (item.effective_projection !== route.fallback || record.attempts.length !== 2))) {
        fail('reasoning-heavy effective projection/reason/attempt count is invalid');
      }
    }
    const fallbackUsed = item.reason === 'credits_required';
    record.attempts.forEach((attempt, index) => {
      exactKeys(attempt, ['projection', 'outcome', 'resolved_model', 'exit_code', 'argv_sha256', 'stdout_path', 'stdout_sha256', 'stderr_path', 'stderr_sha256'], `model resolution attempt ${index}`);
      const expectedProjection = index === 0 ? route.alias : route.fallback;
      const expectedOutcome = fallbackUsed && index === 0 ? 'credits_required' : 'available';
      const expectedExit = expectedOutcome === 'credits_required' ? 1 : 0;
      const expectedArgvSha = sha256(Buffer.from(stable(claudeModelProbeArgs(expectedProjection)), 'utf8'));
      const expectedStdoutPath = `raw/claude-model-${expectedProjection}.stdout.jsonl`;
      const expectedStderrPath = `raw/claude-model-${expectedProjection}.stderr`;
      if (attempt.projection !== expectedProjection || attempt.outcome !== expectedOutcome
        || attempt.exit_code !== expectedExit || attempt.argv_sha256 !== expectedArgvSha
        || attempt.stdout_path !== expectedStdoutPath || attempt.stderr_path !== expectedStderrPath
        || !HASH.test(attempt.stdout_sha256 || '') || !HASH.test(attempt.stderr_sha256 || '')) {
        fail(`model resolution attempt ${index} is not the governed route`);
      }
      const stdout = secureRead(join(evidenceRoot, attempt.stdout_path), evidenceRoot, `model probe stdout ${index}`);
      const stderr = secureRead(join(evidenceRoot, attempt.stderr_path), evidenceRoot, `model probe stderr ${index}`);
      if (sha256(stdout.bytes) !== attempt.stdout_sha256 || sha256(stderr.bytes) !== attempt.stderr_sha256 || stderr.bytes.length) {
        fail(`model resolution attempt ${index} raw bytes mismatch`);
      }
      const expectedCwd = canonicalDirectory(
        join(transactionRoot, 'child-scratch', 'model-resolution', expectedProjection),
        `model probe scratch ${expectedProjection}`,
      );
      const parsed = classifyClaudeResolutionProbe(stdout.bytes, stderr.bytes, attempt.exit_code,
        attempt.projection, expectedCwd);
      if (parsed.outcome !== attempt.outcome || parsed.resolved_model !== attempt.resolved_model) {
        fail(`model resolution attempt ${index} classification mismatch`);
      }
    });
    const successfulAttempt = record.attempts.at(-1);
    if (typeof item.effective_model !== 'string' || !item.effective_model
      || successfulAttempt?.outcome !== 'available'
      || item.effective_model !== successfulAttempt.resolved_model) {
      fail(`model resolution effective concrete model mismatch ${item.tier}`);
    }
    effective.set(`${item.harness}/${item.tier}`, {
      projection: item.effective_projection,
      model: item.effective_model,
    });
  }
  if (expectedTiers.some((tier) => !seen.has(tier))) fail('model_resolutions tier set is incomplete');
  return effective;
}

function validatePacket(packet) {
  const top = ['schema_version', 'packet_id', 'phase_id', 'logical_role', 'cwd_key', 'goal', 'ownership', 'files', 'inputs', 'constraints', 'protected_paths', 'outputs', 'done_criteria', 'verification', 'rollback'];
  exactKeys(packet, top, 'work packet');
  if (packet.schema_version !== 'luca.work-packet.v1' || packet.logical_role !== 'work-agent'
    || !/^wp-[a-z0-9][a-z0-9._-]{2,127}$/.test(packet.packet_id || '')) fail('work packet identity is invalid');
  const arrays = ['ownership', 'files', 'inputs', 'constraints', 'protected_paths', 'outputs', 'done_criteria', 'verification', 'rollback'];
  if (arrays.some((key) => !Array.isArray(packet[key]) || !packet[key].length)) fail('work packet arrays must be nonempty');
  const bounded = (value, max) => typeof value === 'string' && [...value].length > 0 && (max === null || [...value].length <= max);
  if (!bounded(packet.phase_id, 128) || !bounded(packet.cwd_key, 256) || !bounded(packet.goal, 4096)) {
    fail('invalid bounded packet identity field');
  }
  for (const key of arrays) {
    if (new Set(packet[key].map(stable)).size !== packet[key].length) fail(`work packet ${key} contains duplicate items`);
  }
  const access = new Set(['read', 'write', 'create', 'delete']);
  const mutable = new Set(['write', 'create', 'delete']);
  const safePath = (value) => bounded(value, 1024) && (() => {
    const segments = value.split('/');
    return !value.startsWith('/') && !value.endsWith('/') && !/^[A-Za-z]:/.test(value)
      && !value.includes('\\') && !/[\u0000-\u001F\u007F]/.test(value)
      && segments.every((segment) => segment && segment !== '.' && segment !== '..');
  })();
  const pathContains = (parent, child) => child === parent || child.startsWith(parent.endsWith('/') ? parent : `${parent}/`);
  const pathsOverlap = (a, b) => pathContains(a, b) || pathContains(b, a);
  const ownership = new Map();
  packet.ownership.forEach((entry, index) => {
    exactKeys(entry, ['path', 'owner', 'access'], `ownership[${index}]`);
    if (!safePath(entry.path) || !bounded(entry.owner, 256) || !access.has(entry.access) || ownership.has(entry.path)) fail(`invalid ownership[${index}]`);
    ownership.set(entry.path, entry.access);
  });
  const files = new Map();
  packet.files.forEach((entry, index) => {
    exactKeys(entry, ['path', 'purpose', 'access'], `files[${index}]`);
    if (!safePath(entry.path) || !bounded(entry.purpose, 2048) || !access.has(entry.access) || files.has(entry.path)
      || ownership.get(entry.path) !== entry.access) fail(`invalid files[${index}]`);
    files.set(entry.path, entry.access);
  });
  const inputIds = new Set();
  packet.inputs.forEach((entry, index) => {
    exactKeys(entry, ['id', 'source', 'content', 'content_sha256'], `inputs[${index}]`);
    if (!/^IN-[A-Z0-9][A-Z0-9_-]{0,63}$/.test(entry.id || '') || inputIds.has(entry.id)
      || !bounded(entry.source, 2048) || !bounded(entry.content, null) || !HASH.test(entry.content_sha256 || '')
      || sha256(Buffer.from(entry.content, 'utf8')) !== entry.content_sha256) fail(`invalid inputs[${index}]`);
    inputIds.add(entry.id);
  });
  const doneIds = new Set();
  packet.done_criteria.forEach((entry, index) => {
    exactKeys(entry, ['id', 'statement'], `done_criteria[${index}]`);
    if (!/^DONE-[A-Z0-9][A-Z0-9_-]{0,63}$/.test(entry.id || '') || doneIds.has(entry.id)
      || !bounded(entry.statement, 4096)) fail(`invalid done_criteria[${index}]`);
    doneIds.add(entry.id);
  });
  const outputs = new Set();
  packet.outputs.forEach((entry, index) => {
    exactKeys(entry, ['path', 'description', 'done_criterion_ids'], `outputs[${index}]`);
    if (!safePath(entry.path) || outputs.has(entry.path) || !bounded(entry.description, 2048)
      || !Array.isArray(entry.done_criterion_ids) || !entry.done_criterion_ids.length
      || new Set(entry.done_criterion_ids).size !== entry.done_criterion_ids.length
      || entry.done_criterion_ids.some((id) => !doneIds.has(id)) || !mutable.has(files.get(entry.path))
      || !mutable.has(ownership.get(entry.path))) fail(`invalid outputs[${index}]`);
    outputs.add(entry.path);
  });
  const protectedPaths = new Set(packet.protected_paths);
  if ([...protectedPaths].some((path) => !safePath(path)) || protectedPaths.size !== packet.protected_paths.length) fail('invalid protected_paths');
  for (const [path, mode] of ownership) {
    if (mutable.has(mode) && [...protectedPaths].some((protectedPath) => pathsOverlap(protectedPath, path))) fail(`protected path overlaps mutable ownership: ${path}`);
  }
  for (const [path, mode] of files) {
    if (ownership.get(path) !== mode) fail(`packet file access mismatches ownership: ${path}`);
    if (mutable.has(mode) && [...protectedPaths].some((protectedPath) => pathsOverlap(protectedPath, path))) fail(`protected path overlaps mutable file: ${path}`);
  }
  for (const path of outputs) if ([...protectedPaths].some((protectedPath) => pathsOverlap(protectedPath, path))) fail(`packet output overlaps protected path: ${path}`);
  const verification = new Set();
  packet.verification.forEach((entry, index) => {
    exactKeys(entry, ['id', 'command', 'expected_exit'], `verification[${index}]`);
    if (!/^VERIFY-[A-Z0-9][A-Z0-9_-]{0,63}$/.test(entry.id || '') || verification.has(entry.id)
      || !bounded(entry.command, 8192) || !Number.isInteger(entry.expected_exit)
      || entry.expected_exit < 0 || entry.expected_exit > 255) fail(`invalid verification[${index}]`);
    verification.add(entry.id);
  });
  for (const key of ['constraints', 'rollback']) if (packet[key].some((value) => !bounded(value, 4096))) fail(`invalid ${key}`);
  if (packet.ownership.length !== 1 || stable(packet.ownership[0]) !== stable({ path: '@response', owner: 'work-agent', access: 'create' })
    || packet.files.length !== 1 || stable(packet.files[0]) !== stable({ path: '@response', purpose: 'Logical native child response; this is not a filesystem path.', access: 'create' })
    || packet.outputs.length !== 1 || stable(packet.outputs[0]) !== stable({ path: '@response', description: 'Native child response containing the exact role sentinel and packet id.', done_criterion_ids: ['DONE-SENTINEL'] })
    || packet.done_criteria.length !== 1 || packet.done_criteria[0].id !== 'DONE-SENTINEL') {
    fail('native work smoke requires the sole exact @response output contract');
  }
  if (packet.verification.length !== 1 || packet.verification[0].id !== 'VERIFY-SENTINEL'
    || packet.verification[0].expected_exit !== 0 || packet.verification[0].command !== NATIVE_WORK_VERIFY_COMMAND) {
    fail('native work smoke requires the exact frozen zero-exit verification command');
  }
  const verificationSentinels = packet.verification[0].command.match(/LUCA_NATIVE_WORK_AGENT_VERIFY_[A-Z0-9_-]+/g) || [];
  if (verificationSentinels.length !== 1) fail('native work smoke command must contain exactly one frozen verification sentinel');
  const expectedOutputs = packet.done_criteria
    .map((entry) => entry.statement.match(/^The child response is exactly (LUCA_NATIVE_WORK_AGENT_RESULT [a-z0-9][a-z0-9._-]{2,127})\.$/i)?.[1])
    .filter(Boolean);
  const expectedOutput = `LUCA_NATIVE_WORK_AGENT_RESULT ${packet.packet_id}`;
  if (expectedOutputs.length !== 1 || expectedOutputs[0] !== expectedOutput) fail('native work smoke has no unique exact output criterion');
  const canonical = stable(packet);
  return {
    packet,
    canonical,
    sha256: sha256(Buffer.from(canonical, 'utf8')),
    expected_output: expectedOutput,
    verification_sentinel: verificationSentinels[0],
  };
}

function roleInput(role, packet) {
  if (role === 'work-agent') return packet.canonical;
  return `Perform a read-only native role smoke check. Do not call tools and do not edit files. Return exactly LUCA_NATIVE_${role.replaceAll('-', '_').toUpperCase()}_RESULT.`;
}

function expectedOutput(role, packet) {
  return role === 'work-agent'
    ? packet.expected_output
    : `LUCA_NATIVE_${role.replaceAll('-', '_').toUpperCase()}_RESULT`;
}

function dispatcherPrompt(harness, runId, role, input, inputSha, packet) {
  const nativeTaskName = `edge_${inputSha}`;
  const packetAttestation = role === 'work-agent'
    ? ` The launch supervisor independently validated the frozen work packet against luca.work-packet.v1 and the exact launcher cross-field contract; its canonical SHA-256 is ${packet.sha256}. The entire child prompt must be only the following JSON bytes, with no wrapper or extra instruction:\n${input}`
    : ` Use this exact child prompt:\n${input}`;
  return harness === 'claude'
    ? `Native evidence transaction ${runId}. Use the Agent tool exactly once with subagent_type ${role} and run_in_background=false.${packetAttestation}\nDo not perform the role yourself. Wait for the child result, then return it verbatim.`
    : `Native evidence transaction ${runId}. Use collaboration spawn_agent exactly once with agent_type ${role}, fork_turns \"none\", and task_name \"${nativeTaskName}\".${packetAttestation}\nUse wait_agent exactly once, call no other function, and return that distinct child result verbatim. Do not perform the role yourself.`;
}

const CLAUDE_INLINE_SETTINGS = Object.freeze({ sandbox: Object.freeze({
  enabled: true, failIfUnavailable: true, autoAllowBashIfSandboxed: true,
  allowUnsandboxedCommands: false, excludedCommands: Object.freeze([]),
  filesystem: Object.freeze({ disabled: false, allowWrite: Object.freeze([]) }),
}) });

function verifyRoleDefinition(root, harness, role, projection, expectedPath) {
  if (expectedPath !== ROLE_PATHS[harness][role]) fail(`definition path mismatch for ${harness}/${role}`);
  const bytes = readFileSync(join(root, expectedPath));
  const text = bytes.toString('utf8');
  if (harness === 'claude') {
    if (!text.startsWith('---\n') || !new RegExp(`^name:\\s*${role}\\s*$`, 'm').test(text)) fail(`Claude role is not registered: ${role}`);
    const end = text.indexOf('\n---\n', 4);
    if (end < 0 || /^model\s*:/m.test(text.slice(4, end))) fail(`Claude role pins a model: ${role}`);
  } else if (!new RegExp(`^name\\s*=\\s*\"${role}\"`, 'm').test(text) || /^model\s*=/m.test(text)
    || !new RegExp(`^model_reasoning_effort\\s*=\\s*\"${projection}\"`, 'm').test(text)
    || !new RegExp(`^sandbox_mode\\s*=\\s*\"${role === 'work-agent' ? 'workspace-write' : 'read-only'}\"`, 'm').test(text)
    || !text.includes(`.claude/agents/${role}.md`)) fail(`Codex role definition mismatch: ${role}`);
  return { bytes, text };
}

function expectedSandbox(harness, role, root, supplied) {
  if (harness === 'claude') {
    exactKeys(supplied, ['type', 'cwd', 'inline_settings', 'setting_sources', 'required_post_tool_use_event'], 'Claude sandbox contract');
    if (supplied.type !== 'claude-native-sandbox' || supplied.cwd !== root
      || stable(supplied.inline_settings) !== stable(CLAUDE_INLINE_SETTINGS)
      || stable(supplied.setting_sources) !== stable(['project'])
      || supplied.required_post_tool_use_event !== 'Agent') fail('Claude sandbox is not exact/fail-closed');
    return supplied;
  }
  exactKeys(supplied, ['type', 'cwd', 'approval_policy', 'writable_roots', 'network_access', 'parent_allowed_function_calls', 'child_allowed_tools', 'app_server_capabilities'], 'Codex sandbox contract');
  const type = role === 'work-agent' ? 'workspace-write' : 'read-only';
  const writable = role === 'work-agent' ? [root] : [];
  if (supplied.type !== type || supplied.cwd !== root || supplied.approval_policy !== 'never'
    || supplied.network_access !== false || stable(supplied.writable_roots) !== stable(writable)
    || stable(supplied.parent_allowed_function_calls) !== stable(['spawn_agent', 'wait_agent'])
    || stable(supplied.child_allowed_tools) !== stable(role === 'work-agent' ? ['Bash'] : [])
    || stable(supplied.app_server_capabilities) !== stable({ experimentalApi: true })) {
    fail(`Codex sandbox contract mismatch for ${role}`);
  }
  return supplied;
}

function verifyManagedSandbox(value, label) {
  if (!value || typeof value !== 'object' || !value.sandbox) return;
  const box = value.sandbox;
  if (!box || typeof box !== 'object' || Array.isArray(box)) fail(`${label} has an invalid sandbox object`);
  if (box.enabled === false || box.failIfUnavailable === false || box.allowUnsandboxedCommands === true
    || box.filesystem?.disabled === true || (box.excludedCommands !== undefined && stable(box.excludedCommands) !== '[]')
    || (box.filesystem?.allowWrite !== undefined && stable(box.filesystem.allowWrite) !== '[]')) fail(`${label} broadens the Claude sandbox`);
}

function verifyRuntimeAttestations(att, root, claudeContracts) {
  exactKeys(att, ['claude_settings_path', 'claude_settings_sha256', 'claude_post_tool_use_agent_hooks', 'claude_settings_sources', 'codex_hooks_path', 'codex_hooks_sha256', 'codex_config_path', 'codex_config_sha256', 'codex_hook_runtime'], 'runtime attestations');
  if (att.claude_settings_path !== '.claude/settings.json' || att.codex_hooks_path !== '.codex/hooks.json') fail('runtime source paths mismatch');
  const settingsBytes = readFileSync(join(root, att.claude_settings_path));
  const settings = parseJson(settingsBytes, 'Claude project settings');
  verifyManagedSandbox(settings, 'Claude project settings');
  const matchers = (settings?.hooks?.PostToolUse || []).map((entry) => entry?.matcher).filter((value) => typeof value === 'string');
  let actuallyMatchesAgent = false;
  for (const matcher of matchers) {
    try { if (new RegExp(matcher).test('Agent')) actuallyMatchesAgent = true; } catch { fail(`invalid Claude matcher ${matcher}`); }
  }
  const actualHooks = (settings?.hooks?.PostToolUse || []).flatMap((entry) => (entry.hooks || []).map((hook) => ({ matcher: entry.matcher, command_sha256: sha256(Buffer.from(hook.command || '', 'utf8')) })))
    .filter((entry) => { try { return new RegExp(entry.matcher).test('Agent'); } catch { return false; } });
  if (!actuallyMatchesAgent || sha256(settingsBytes) !== att.claude_settings_sha256
    || stable(actualHooks) !== stable(att.claude_post_tool_use_agent_hooks) || !actualHooks.length) fail('Claude PostToolUse:Agent matcher/hook attestation mismatch');
  if (!Array.isArray(att.claude_settings_sources) || att.claude_settings_sources.length !== 3) fail('Claude settings-source exact set missing');
  const expectedSources = [
    { path: realpathSync(join(root, '.claude/settings.json')), kind: 'json' },
    { path: '/Library/Application Support/ClaudeCode/managed-settings.json', kind: 'json' },
    { path: '/Library/Managed Preferences/com.anthropic.claudecode.plist', kind: 'plist' },
  ];
  att.claude_settings_sources.forEach((source, index) => {
    exactKeys(source, ['path', 'kind', 'present', 'sha256'], `Claude settings source ${index}`);
    const expected = expectedSources[index];
    const expectedPath = existsSync(expected.path) ? realpathSync(expected.path) : expected.path;
    if (source.path !== expectedPath || source.kind !== expected.kind || source.present !== existsSync(source.path)) fail('Claude settings-source set/order mismatch');
    if (!source.present) { if (source.sha256 !== null) fail('absent Claude setting has a hash'); return; }
    const bytes = readFileSync(source.path);
    if (sha256(bytes) !== source.sha256) fail(`Claude settings source drift: ${source.path}`);
    let parsed;
    if (source.kind === 'json') parsed = parseJson(bytes, source.path);
    else {
      const result = spawnSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', source.path], { encoding: 'utf8', input: '', timeout: 20_000 });
      if (result.status !== 0) fail(`cannot inspect managed plist ${source.path}`);
      parsed = JSON.parse(result.stdout);
    }
    verifyManagedSandbox(parsed, source.path);
  });
  for (const contract of claudeContracts) {
    if (stable(contract.setting_sources) !== stable(['project'])
      || contract.required_post_tool_use_event !== 'Agent') {
      fail('Claude loaded settings/matcher contract drift');
    }
  }

  const hooksBytes = readFileSync(join(root, att.codex_hooks_path));
  if (sha256(hooksBytes) !== att.codex_hooks_sha256) fail('frozen Codex hooks drift');
  const configPath = realpathSync(att.codex_config_path);
  const activeConfig = realpathSync(join(process.env.CODEX_HOME || join(process.env.HOME || '', '.codex'), 'config.toml'));
  if (configPath !== activeConfig) fail('Codex trust config is not active');
  const configBytes = readFileSync(configPath);
  if (sha256(configBytes) !== att.codex_config_sha256) fail('Codex trust config drift');
  const config = configBytes.toString('utf8');
  const hooks = parseJson(hooksBytes, 'Codex hooks');
  const snake = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  const expected = [];
  for (const [event, groups] of Object.entries(hooks.hooks || {})) groups.forEach((group, gi) => (group.hooks || []).forEach((hook, hi) => {
    if (/codex-hook-adapter/.test(hook.command || '')) expected.push({ suffix: `:${snake(event)}:${gi}:${hi}`, event_name: event, command: hook.command });
  }));
  if (!expected.length || !Array.isArray(att.codex_hook_runtime) || att.codex_hook_runtime.length !== expected.length) fail('Codex runtime hook exact set missing');
  const runtimeKeys = [];
  const runtimeConfigPaths = new Set();
  att.codex_hook_runtime.forEach((runtime) => {
    exactKeys(runtime, ['key', 'event_name', 'current_hash', 'command', 'command_sha256', 'trust_status'], 'Codex runtime hook');
    const exp = expected.find((entry) => runtime.key.endsWith(entry.suffix));
    const nativeEvent = exp?.event_name ? exp.event_name[0].toLowerCase() + exp.event_name.slice(1) : null;
    if (!exp || runtime.event_name !== nativeEvent || runtime.command !== exp.command
      || sha256(Buffer.from(runtime.command, 'utf8')) !== runtime.command_sha256
      || runtime.trust_status !== 'trusted' || !/^sha256:[a-f0-9]{64}$/.test(runtime.current_hash || '')) fail('Codex hooks/list edge is stale/untrusted/non-equivalent');
    const configFromKey = runtime.key.slice(0, -exp.suffix.length);
    runtimeConfigPaths.add(realpathSync(configFromKey));
    if (sha256(readFileSync(configFromKey)) !== sha256(hooksBytes)) fail('runtime Codex hook config differs from frozen checkout bytes');
    const header = `[hooks.state.\"${runtime.key}\"]`;
    const start = config.indexOf(header);
    const next = config.indexOf('\n[', start + header.length);
    const block = start < 0 ? '' : config.slice(start + header.length, next < 0 ? undefined : next);
    if (block.match(/^trusted_hash\s*=\s*\"([^\"]+)\"\s*$/m)?.[1] !== runtime.current_hash) fail('Codex trusted hash differs from hooks/list');
    runtimeKeys.push(runtime.key);
  });
  if (runtimeConfigPaths.size !== 1 || new Set(runtimeKeys).size !== expected.length) fail('Codex hooks/list/trust exact-set mismatch');
}

function expectedNativeIdentity(harness) {
  const configured = harness === 'claude'
    ? (process.env.LUCA_CLAUDE_BIN || '/Users/luca/.local/bin/claude')
    : (process.env.LUCA_CODEX_BIN || '/Users/luca/.local/bin/codex');
  const commandPath = realpathSync(configured);
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
  const version = spawnSync(commandPath, ['--version'], { encoding: 'utf8', input: '', timeout: 20_000 });
  if (version.status !== 0) fail(`${harness} version probe failed during independent verification`);
  return {
    command_path: commandPath,
    command_sha256: sha256(readFileSync(commandPath)),
    native_binary_path: nativePath,
    native_binary_sha256: sha256(readFileSync(nativePath)),
    cli_version: String(version.stdout || version.stderr).trim(),
  };
}

function makeExpectedDescriptor(run, root, routing, packet, definition) {
  const input = roleInput(run.role, packet);
  const inputSha = sha256(Buffer.from(input, 'utf8'));
  const dispatcherId = run.run_id;
  const prompt = dispatcherPrompt(run.harness, dispatcherId, run.role, input, inputSha, packet);
  const nativeTaskName = run.harness === 'codex' ? `edge_${inputSha}` : null;
  const sandbox = expectedSandbox(run.harness, run.role, root, run.native_descriptor.sandbox_contract);
  const binary = expectedNativeIdentity(run.harness);
  let args;
  if (run.harness === 'claude') {
    const agent = { description: `Native ${run.role} role projected from ${run.native_descriptor.definition_path}`, prompt: definition.text,
      tools: run.role === 'work-agent' ? ['Bash'] : [], model: run.projection, permissionMode: 'dontAsk' };
    const dispatcher = {
      description: `Dispatch exactly one native ${run.role} child and return its result`,
      prompt: `Use only Agent(${run.role}) exactly once. Never perform the role yourself or call another tool.`,
      tools: [`Agent(${run.role})`], permissionMode: 'dontAsk',
    };
    const agentsJson = JSON.stringify({ 'u008-dispatcher': dispatcher, [run.role]: agent });
    args = ['-p', '--output-format', 'stream-json', '--include-hook-events', '--forward-subagent-text', '--verbose', '--no-session-persistence',
      '--setting-sources', 'project', '--settings', JSON.stringify(CLAUDE_INLINE_SETTINGS), '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
      '--disable-slash-commands', '--tools', 'Agent,Bash', '--allowedTools', `Agent(${run.role})`, '--permission-mode', 'dontAsk',
      '--agents', agentsJson, '--agent', 'u008-dispatcher', prompt];
  } else {
    args = ['-C', root, 'app-server', '--enable', 'multi_agent_v2',
      '-c', 'sandbox_workspace_write.writable_roots=[]',
      '-c', 'sandbox_workspace_write.network_access=false',
      '-c', 'sandbox_workspace_write.exclude_tmpdir_env_var=true',
      '-c', 'sandbox_workspace_write.exclude_slash_tmp=true',
      '-c', `model_reasoning_effort=\"${run.projection}\"`];
  }
  return {
    schema_version: 'luca.native-launch.v2', dispatcher_id: dispatcherId, harness: run.harness, role: run.role,
    tier: run.tier, projection: run.projection, definition_path: run.native_descriptor.definition_path,
    definition_sha256: sha256(definition.bytes), routing_path: routing.path, routing_sha256: routing.sha256,
    packet_sha256: run.role === 'work-agent' ? packet.sha256 : null,
    packet_source_sha256: run.role === 'work-agent' ? packet.source_sha256 : null,
    input_sha256: inputSha, native_task_name: nativeTaskName, sandbox_contract: sandbox,
    write_roots: run.native_descriptor.write_roots, dispatcher_prompt: prompt,
    dispatcher_prompt_sha256: sha256(Buffer.from(prompt, 'utf8')), command_path: binary.command_path,
    command_sha256: binary.command_sha256, native_binary_path: binary.native_binary_path,
    native_binary_sha256: binary.native_binary_sha256, cli_version: binary.cli_version,
    cwd: root, args, argv_sha256: sha256(Buffer.from(stable(args), 'utf8')),
  };
}

function nativeDispatchContract(descriptor) {
  const { write_roots, ...contract } = descriptor;
  return {
    schema_version: 'luca.native-dispatch-contract.v1',
    descriptor: contract,
    contract_sha256: sha256(Buffer.from(stable(contract), 'utf8')),
  };
}

function textFromContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => typeof part === 'string' ? part : (part?.type === 'text' ? (part.text || '') : '')).join('');
}

function claudeFamilyMatches(alias, resolved) {
  return typeof alias === 'string' && typeof resolved === 'string'
    && new RegExp(`^claude-${alias.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?:-|$)`, 'i').test(resolved);
}

function assertClaudeInit(init, root, role, label) {
  const agents = Array.isArray(init?.agents) ? init.agents : [];
  const tools = Array.isArray(init?.tools) ? init.tools : [];
  const uniqueAgents = agents.length === new Set(agents).size && agents.every((agent) => typeof agent === 'string');
  const exactNativeDispatcherTool = stable(tools) === stable(['Task']) || stable(tools) === stable(['Agent']);
  if (init?.cwd !== root || init?.permissionMode !== 'dontAsk' || !uniqueAgents
    || agents.filter((agent) => agent === 'u008-dispatcher').length !== 1
    || agents.filter((agent) => agent === role).length !== 1 || !exactNativeDispatcherTool) {
    fail(`${label} dispatcher/role/tool pool is not exact`);
  }
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
  // stream-json's exact is_error:false plus the frozen printf command is the
  // structured zero-exit attestation; its content removes the terminal newline.
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

function verifyClaudeLogs(bytes, run, expectedInput, expectedResult) {
  const events = parseJsonl(bytes, 'Claude raw transport');
  const indexed = events.map((event, index) => ({ event, index }));
  const inits = events.filter((event) => event?.type === 'system' && event?.subtype === 'init');
  if (inits.length !== 1) fail('Claude transport must contain exactly one init');
  assertClaudeInit(inits[0], run.native_descriptor.cwd, run.role, 'Claude init');
  const sessions = new Set(events.map((event) => event?.session_id).filter(Boolean));
  if (sessions.size !== 1) fail('Claude transport has multiple/no dispatcher sessions');
  const parentId = [...sessions][0];
  if (!events.every((event) => event?.session_id === parentId)) fail('Claude transport event lacks exact session binding');
  const parentToolUses = [];
  const childToolUses = [];
  for (const { event, index } of indexed) if (event?.type === 'assistant' && !event.parent_tool_use_id) {
    for (const item of event?.message?.content || []) if (item?.type === 'tool_use') parentToolUses.push({ item, index });
  }
  for (const { event, index } of indexed) if (event?.type === 'assistant' && event.parent_tool_use_id) {
    for (const item of event?.message?.content || []) if (item?.type === 'tool_use') childToolUses.push({ item, index });
  }
  if (parentToolUses.length !== 1 || parentToolUses[0].item.name !== 'Agent') fail('Claude dispatcher made an extra/non-Agent tool call');
  const toolRecord = parentToolUses[0];
  const tool = toolRecord.item;
  const allowedInput = new Set(['subagent_type', 'prompt', 'description', 'run_in_background']);
  if (!tool.input || Object.keys(tool.input).some((key) => !allowedInput.has(key))
    || tool.input.subagent_type !== run.role || tool.input.prompt !== expectedInput
    || tool.input.run_in_background !== false) fail('Claude Agent input differs from frozen role input');
  const toolContent = indexed[toolRecord.index]?.event?.message?.content;
  if (!Array.isArray(toolContent) || toolContent.length !== 1 || toolContent[0] !== tool) {
    fail('Claude dispatcher Agent message is not exclusive');
  }
  const spawnId = tool.id;
  const childAssistantEvents = indexed.filter(({ event }) => event?.type === 'assistant' && event.parent_tool_use_id);
  if (childAssistantEvents.some(({ event }) => event.parent_tool_use_id !== spawnId
    || event.subagent_type !== run.role)) fail('Claude forwarded child assistant identity mismatch');
  if (run.role !== 'work-agent' && childToolUses.length) fail('read-only Claude child called a tool');
  if (childToolUses.some(({ item }) => item.name !== 'Bash')) fail('Claude child called a non-Bash tool');
  const childToolResults = indexed.flatMap(({ event, index }) => {
    const parts = Array.isArray(event?.message?.content) ? event.message.content : [];
    return parts.filter((part) => part?.type === 'tool_result' && event.parent_tool_use_id)
      .map((part) => ({ event, index, part }));
  });
  if (run.role !== 'work-agent' && childToolResults.length) fail('read-only Claude child emitted a tool result');
  const starts = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'task_started'
    && event.tool_use_id === spawnId && event.subagent_type === run.role && event.prompt === expectedInput);
  const allStarts = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'task_started');
  if (allStarts.length !== 1 || starts.length !== 1 || starts[0].index <= toolRecord.index) fail('Claude task_started edge is not exact');
  const childId = starts[0].event.task_id;
  if (!childId || childId === parentId) fail('Claude child identity is missing/not distinct');
  const launches = indexed.filter(({ event }) => event?.type === 'user' && event?.tool_use_result?.status === 'async_launched'
    && event.tool_use_result.agentId === childId && event.tool_use_result.prompt === expectedInput);
  const completedReceipts = indexed.filter(({ event }) => event?.type === 'user' && event?.tool_use_result?.status === 'completed'
    && event.tool_use_result.agentId === childId && event.tool_use_result.prompt === expectedInput);
  const allNativeResults = indexed.filter(({ event }) => event?.type === 'user' && Object.hasOwn(event, 'tool_use_result'));
  if (allNativeResults.length !== 1
    || !((launches.length === 1 && completedReceipts.length === 0)
      || (launches.length === 0 && completedReceipts.length === 1))) {
    fail('Claude native launch/completion binding mismatch');
  }
  const postStarts = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'hook_started'
    && event?.hook_event === 'PostToolUse' && event?.hook_name === 'PostToolUse:Agent');
  const postResponses = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'hook_response'
    && event?.hook_event === 'PostToolUse' && event?.hook_name === 'PostToolUse:Agent'
    && event?.exit_code === 0 && event?.outcome === 'success');
  const allPostResponses = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'hook_response'
    && event?.hook_event === 'PostToolUse' && event?.hook_name === 'PostToolUse:Agent');
  if (postStarts.length !== 1 || allPostResponses.length !== 1 || postResponses.length !== 1
    || typeof postStarts[0].event.hook_id !== 'string' || !postStarts[0].event.hook_id
    || typeof postResponses[0].event.hook_id !== 'string' || !postResponses[0].event.hook_id
    || postStarts[0].event.hook_id !== postResponses[0].event.hook_id
    || postStarts[0].index <= starts[0].index || postResponses[0].index <= postStarts[0].index) {
    fail('Claude PostToolUse:Agent hook pair is absent/unbound/reordered');
  }
  const children = childAssistantEvents.map(({ event }) => event);
  const completions = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'task_notification'
    && event.task_id === childId && event.tool_use_id === spawnId && event.status === 'completed');
  const allCompletions = indexed.filter(({ event }) => event?.type === 'system' && event?.subtype === 'task_notification');
  const frozenCommands = run.role === 'work-agent'
    ? run.packet.packet.verification.map((entry) => entry.command) : [];
  let resolvedModel;
  let output;
  if (launches.length === 1) {
    const launch = launches[0];
    if (launch.index <= postResponses[0].index || launch.event.tool_use_result.resolvedModel !== run.expectedConcreteModel
      || !children.length || allCompletions.length !== 1 || completions.length !== 1
      || completions[0].index <= Math.max(...children.map((event) => events.indexOf(event)))) {
      fail('Claude legacy launch/completion edge is not exact');
    }
    if (run.role === 'work-agent') {
      const observedCommands = childToolUses.map(({ item }) => item.input?.command);
      if (observedCommands.some((command) => typeof command !== 'string')
        || stable([...observedCommands].sort()) !== stable([...frozenCommands].sort())) fail('Claude work child Bash calls differ from the frozen verification command');
      const bashId = childToolUses[0]?.item?.id;
      assertClaudeWorkResult(events, bashId, tool.id, run.packet.verification_sentinel);
    }
    resolvedModel = launch.event.tool_use_result.resolvedModel;
    output = children.map((event) => textFromContent(event?.message?.content)).join('\n').trim();
  } else {
    const receipt = completedReceipts[0];
    const allChildPrompts = indexed.filter(({ event }) => event?.type === 'user'
      && event.message?.role === 'user' && Array.isArray(event.message.content)
      && event.message.content.length === 1 && event.message.content[0]?.type === 'text');
    const childPrompts = allChildPrompts.filter(({ event }) => event.parent_tool_use_id === spawnId
      && event.subagent_type === run.role && event.message.content[0].text === expectedInput);
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
    const childOutputMessage = childTextMessages[0];
    const exactChildMessageShapes = childAssistantEvents.every(({ event }) => Array.isArray(event.message?.content)
      && event.message.content.length === 1
      && ['text', 'tool_use'].includes(event.message.content[0]?.type));
    if (allChildPrompts.length !== 1 || childPrompts.length !== 1 || childPrompts[0].index <= starts[0].index
      || allUpdates.length !== 1 || updates.length !== 1 || updates[0].index <= childPrompts[0].index
      || !exactEvidenceUserSet
      || childAssistantEvents.some(({ index }) => index <= childPrompts[0].index || index >= updates[0].index)
      || !exactChildMessageShapes || childTextMessages.length !== 1
      || childToolMessages.length !== actualToolUses || childAssistantEvents.length !== actualToolUses + 1
      || childOutputMessage.event.message.content[0].text !== expectedResult
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
      || detail.agentType !== run.role || detail.resolvedModel !== run.expectedConcreteModel
      || !Array.isArray(structuredContent) || structuredContent.length !== 1
      || structuredContent[0]?.type !== 'text' || structuredContent[0]?.text !== expectedResult
      || !Number.isInteger(detail.totalTokens) || detail.totalTokens < 0
      || !Number.isInteger(detail.totalDurationMs) || detail.totalDurationMs < 0
      || actualToolUses !== expectedToolUses || detail.totalToolUseCount !== actualToolUses
      || completions[0].event.summary !== expectedResult
      || completions[0].event.usage?.tool_uses !== actualToolUses) {
      fail('Claude completed native result binding mismatch');
    }
    const parentContent = receipt.event.message?.content;
    const parentToolResult = Array.isArray(parentContent) && parentContent.length === 1 ? parentContent[0] : null;
    const resultParts = parentToolResult?.content;
    const expectedMetadata = `agentId: ${childId} (use SendMessage with to: '${childId}', summary: '<5-10 word recap>' to continue this agent)\n<usage>subagent_tokens: ${detail.totalTokens}\ntool_uses: ${detail.totalToolUseCount}\nduration_ms: ${detail.totalDurationMs}</usage>`;
    if (parentToolResult?.type !== 'tool_result' || parentToolResult.tool_use_id !== spawnId
      || !Array.isArray(resultParts) || resultParts.length !== 2
      || resultParts[0]?.type !== 'text' || resultParts[0]?.text !== expectedResult
      || resultParts[1]?.type !== 'text' || resultParts[1]?.text !== expectedMetadata) {
      fail('Claude completed parent tool_result is not exact');
    }
    if (run.role === 'work-agent') {
      const observedCommands = childToolUses.map(({ item }) => item.input?.command);
      if (observedCommands.some((command) => typeof command !== 'string')
        || stable([...observedCommands].sort()) !== stable([...frozenCommands].sort())) fail('Claude forwarded work child Bash calls differ from the frozen command');
      const bashId = childToolUses[0]?.item?.id;
      assertClaudeWorkResult(events, bashId, tool.id, run.packet.verification_sentinel);
    }
    const parentOutputs = indexed.filter(({ event, index }) => index > receipt.index && event?.type === 'assistant'
      && !event.parent_tool_use_id && Array.isArray(event.message?.content)
      && event.message.content.length === 1 && event.message.content[0]?.type === 'text'
      && event.message.content[0]?.text === expectedResult);
    const parentAssistants = indexed.filter(({ event }) => event?.type === 'assistant' && !event.parent_tool_use_id);
    const terminal = indexed.filter(({ event }) => event?.type === 'result' && event?.subtype === 'success'
      && event.is_error === false && event.result === expectedResult && event.terminal_reason === 'completed');
    const allTerminal = indexed.filter(({ event }) => event?.type === 'result');
    const childText = children.map((event) => textFromContent(event.message?.content)).filter(Boolean).join('\n').trim();
    if (parentAssistants.length !== 2 || parentOutputs.length !== 1
      || !children.length || childText !== expectedResult
      || allTerminal.length !== 1 || terminal.length !== 1
      || terminal[0].index <= parentOutputs[0].index) fail('Claude completed dispatcher result is not exact');
    resolvedModel = detail.resolvedModel;
    output = structuredContent[0].text;
  }
  if (resolvedModel !== run.expectedConcreteModel
    || children.some((event) => event?.message?.model !== resolvedModel)) fail('Claude child output/model edge mismatch');
  if (output !== expectedResult) fail('Claude child result differs from the exact frozen result');
  return { parentId, childId, spawnId, output, observedInputSha256: sha256(Buffer.from(tool.input.prompt)), observedProjection: resolvedModel };
}

function callArguments(value, label) {
  if (typeof value === 'string') { try { return JSON.parse(value); } catch { fail(`${label} arguments are invalid JSON`); } }
  if (!value || typeof value !== 'object') fail(`${label} arguments missing`);
  return value;
}

function appServerObject(item) {
  if (!item || typeof item !== 'object') return null;
  const value = item?.params?.item || item?.item || item?.result?.item;
  if (!value || typeof value !== 'object') return null;
  return value;
}

function codexItemEvents(messages) {
  const events = messages.map((message, index) => ({ message, index, item: appServerObject(message) }))
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

function verifyCodexPublic(publicBytes, run, expectedInput) {
  const messages = parseJsonl(publicBytes, 'Codex app-server transport');
  const response = (id) => messages.filter((message) => String(message?.id) === String(id) && !message?.method);
  const initialize = response(1);
  const threadResponse = response(2);
  const turnResponse = response(3);
  if (initialize.length !== 1 || initialize[0].error || !initialize[0].result
    || threadResponse.length !== 1 || threadResponse[0].error || !threadResponse[0].result
    || turnResponse.length !== 1 || turnResponse[0].error || !turnResponse[0].result) {
    fail('Codex app-server initialize/thread/start/turn/start response graph is not exact');
  }
  exactKeys(initialize[0].result, ['userAgent', 'codexHome', 'platformFamily', 'platformOs'], 'Codex initialize response');
  if (Object.values(initialize[0].result).some((value) => typeof value !== 'string' || !value)) {
    fail('Codex initialize response is not schema-conformant');
  }
  const parentId = threadResponse[0]?.result?.thread?.id;
  const turnId = turnResponse[0]?.result?.turn?.id;
  const threadStarted = messages.filter((message) => message?.method === 'thread/started'
    && (message?.params?.thread?.id || message?.params?.threadId) === parentId);
  const turnStarted = messages.filter((message) => message?.method === 'turn/started'
    && message?.params?.threadId === parentId && message?.params?.turn?.id === turnId);
  const turnCompleted = messages.filter((message) => message?.method === 'turn/completed'
    && message?.params?.threadId === parentId && message?.params?.turn?.id === turnId);
  if (!UUID_RE.test(parentId || '') || !UUID_RE.test(turnId || '')
    || threadStarted.length !== 1 || turnStarted.length !== 1 || turnCompleted.length !== 1
    || threadResponse[0].result.approvalPolicy !== 'never'
    || threadResponse[0].result.cwd !== run.native_descriptor.cwd
    || stable(threadResponse[0].result.sandbox) !== stable(codexApiSandbox(run.native_descriptor.sandbox_contract.type))
    || stable(threadResponse[0].result.runtimeWorkspaceRoots) !== stable([run.native_descriptor.cwd])
    || threadResponse[0].result.reasoningEffort !== run.projection
    || turnCompleted[0]?.params?.turn?.status !== 'completed') {
    fail('Codex app-server parent lifecycle/policy response mismatch');
  }
  for (const key of ['approvalPolicy', 'approvalsReviewer', 'cwd', 'model', 'modelProvider', 'sandbox', 'thread']) {
    if (!Object.hasOwn(threadResponse[0].result, key)) fail(`Codex thread/start response lacks ${key}`);
  }
  exactKeys(threadStarted[0].params, ['thread'], 'Codex thread/started params');
  exactKeys(turnStarted[0].params, ['threadId', 'turn'], 'Codex parent turn/started params');
  exactKeys(turnCompleted[0].params, ['threadId', 'turn'], 'Codex parent turn/completed params');
  assertCodexThread(threadResponse[0].result.thread, parentId, run.native_descriptor.cwd, 'Codex thread/start response');
  assertCodexThread(threadStarted[0].params.thread, parentId, run.native_descriptor.cwd, 'Codex thread/started notification');
  assertCodexTurn(turnResponse[0].result.turn, 'inProgress', 'Codex turn/start response');
  assertCodexTurn(turnStarted[0].params.turn, 'inProgress', 'Codex parent turn/started notification');
  assertCodexTurn(turnCompleted[0].params.turn, 'completed', 'Codex parent turn/completed notification');
  assertStrictOrder('Codex public request/thread/parent-turn lifecycle',
    messages.indexOf(initialize[0]), messages.indexOf(threadResponse[0]), messages.indexOf(threadStarted[0]),
    messages.indexOf(turnResponse[0]), messages.indexOf(turnStarted[0]), messages.indexOf(turnCompleted[0]));
  const itemEvents = codexItemEvents(messages);
  if (itemEvents.some(({ item }) => /collab/i.test(String(item?.type || ''))
    && item?.type !== 'collabAgentToolCall')) fail('Codex app-server exposes a non-v2 collaboration item');
  const activities = itemEvents.filter(({ item }) => item?.type === 'subAgentActivity');
  for (const { item } of activities) exactKeys(item, ['type', 'id', 'kind', 'agentThreadId', 'agentPath'], 'Codex subAgentActivity');
  if (activities.length !== 2 || activities[0].message.method !== 'item/started'
    || activities[1].message.method !== 'item/completed' || activities[0].index >= activities[1].index
    || activities.some(({ item }) => item.id !== activities[0].item.id || item.kind !== 'started'
      || item.agentThreadId !== activities[0].item.agentThreadId || item.agentPath !== activities[0].item.agentPath)) {
    fail('Codex app-server native spawn activity is not one exact lifecycle');
  }
  const childId = activities[0].item.agentThreadId;
  if (!CALL_ID_RE.test(activities[0].item.id || '') || !UUID_RE.test(childId || '') || childId === parentId
    || !String(activities[0].item.agentPath || '').endsWith(`/${run.native_descriptor.native_task_name}`)) {
    fail('Codex app-server native spawn identity/path binding mismatch');
  }
  if (activities.some(({ message }) => message.params.threadId !== parentId || message.params.turnId !== turnId)) {
    fail('Codex spawn activity is not bound to the parent turn');
  }
  const childTurnStarts = messages.filter((message) => message?.method === 'turn/started'
    && message?.params?.threadId === childId);
  const childTurnEnds = messages.filter((message) => message?.method === 'turn/completed'
    && message?.params?.threadId === childId);
  const childTurnId = childTurnStarts[0]?.params?.turn?.id;
  if (childTurnStarts.length !== 1 || childTurnEnds.length !== 1 || !UUID_RE.test(childTurnId || '')
    || childTurnEnds[0]?.params?.turn?.id !== childTurnId
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
  const parentTurnStartIndex = messages.indexOf(turnStarted[0]);
  const parentTurnEndIndex = messages.indexOf(turnCompleted[0]);
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
    if (owner === childId && !(childTurnStartIndex < index && index < childTurnEndIndex)) {
      fail('Codex child item escaped its public turn lifetime');
    }
  }
  if (itemEvents.some(({ message }) => {
    const owner = message.params.threadId;
    return owner !== parentId && owner !== childId || (owner === parentId && message.params.turnId !== turnId);
  })) fail('Codex item lifecycle is not bound to an observed parent/child thread');
  const lifecycleThreads = messages.filter((message) => ['thread/started', 'turn/started', 'turn/completed'].includes(message?.method))
    .map((message) => message?.params?.thread?.id || message?.params?.threadId).filter(Boolean);
  if (lifecycleThreads.some((id) => id !== parentId && id !== childId)) fail('Codex app-server exposes an unrelated thread lifecycle');
  return {
    parentId,
    childId,
    spawnId: activities[0].item.id,
    observedInputSha256: sha256(Buffer.from(expectedInput, 'utf8')),
    itemEvents,
    childTurnId,
  };
}

function staticExecCommand(source, cwd) {
  if (typeof source !== 'string' || source.length > 65_536
    || /(?:\/\*|\/\/|`|\btools\s*\[)/.test(source)) {
    fail('Codex work child exec wrapper is not a bounded static wrapper');
  }
  const wrapper = source.match(/^\s*const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*await\s+tools\.exec_command\s*\(\s*\{([\s\S]*)\}\s*\)\s*;\s*text\s*\(\s*\1\.output\s*\)\s*;?\s*$/);
  if (!wrapper || (source.match(/tools\.exec_command\s*\(/g) || []).length !== 1) {
    fail('Codex work child exec wrapper is not the exact static family');
  }
  const fields = {};
  let rest = wrapper[2];
  const literalEntry = /^\s*(?:"([A-Za-z_][A-Za-z0-9_]*)"|([A-Za-z_][A-Za-z0-9_]*))\s*:\s*("(?:[^"\\]|\\.)*"|-?(?:0|[1-9][0-9]*))\s*(?:,|$)/;
  while (rest.trim()) {
    const match = rest.match(literalEntry);
    if (!match) fail('Codex work child exec payload contains executable/non-literal syntax');
    const key = match[1] || match[2];
    if (Object.hasOwn(fields, key)
      || !['cmd', 'workdir', 'yield_time_ms', 'max_output_tokens'].includes(key)) {
      fail('Codex work child exec payload contains a duplicate/unsafe field');
    }
    try { fields[key] = JSON.parse(match[3]); } catch { fail('Codex work child exec payload literal is invalid'); }
    rest = rest.slice(match[0].length);
  }
  if (typeof fields.cmd !== 'string'
    || (fields.workdir !== undefined && fields.workdir !== cwd)
    || (fields['yield_time_ms'] !== undefined && (!Number.isInteger(fields['yield_time_ms'])
      || fields['yield_time_ms'] < 250 || fields['yield_time_ms'] > 30_000))
    || (fields.max_output_tokens !== undefined && (!Number.isInteger(fields.max_output_tokens)
      || fields.max_output_tokens < 1 || fields.max_output_tokens > 100_000))) {
    fail('Codex work child exec payload is outside the frozen policy');
  }
  return fields.cmd;
}

function verifyCodexTurnContext(context, mode, root, projection, label) {
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

function verifyCodexLogs(publicBytes, parentBytes, childBytes, run, expectedInput, expectedResult, root) {
  const observed = verifyCodexPublic(publicBytes, run, expectedInput);
  const parentId = observed.parentId;
  const parent = parseJsonl(parentBytes, 'Codex parent rollout');
  const expectedPrompt = dispatcherPrompt('codex', run.run_id, run.role, expectedInput,
    run.native_descriptor.input_sha256, { sha256: run.native_descriptor.packet_sha256 });
  const parentPrompts = parent.filter((event) => event?.type === 'event_msg' && event?.payload?.type === 'user_message').map((event) => event.payload.message);
  if (parentPrompts.length !== 1 || parentPrompts[0] !== expectedPrompt) fail('Codex dispatcher prompt is not exact');
  const parentContexts = parent.filter((event) => event?.type === 'turn_context');
  if (parentContexts.length !== 1) fail('Codex dispatcher turn_context is not exact');
  const parentContext = parentContexts[0].payload || {};
  verifyCodexTurnContext(parentContext, run.native_descriptor.sandbox_contract.type,
    root, run.projection, 'Codex dispatcher');
  if (parent.some((event) => event?.type === 'response_item' && event?.payload?.type === 'custom_tool_call')) {
    fail('Codex dispatcher made a non-collaboration tool call');
  }
  const calls = parent.filter((event) => event?.type === 'response_item' && event?.payload?.type === 'function_call');
  const spawnCalls = calls.filter((event) => event.payload.name === 'spawn_agent');
  const waitCalls = calls.filter((event) => event.payload.name === 'wait_agent');
  if (calls.length !== 2 || spawnCalls.length !== 1 || waitCalls.length !== 1) fail('Codex dispatcher function graph is not exact spawn+wait');
  const args = callArguments(spawnCalls[0].payload.arguments, 'Codex persisted spawn_agent');
  exactKeys(args, ['agent_type', 'fork_turns', 'message', 'task_name'], 'Codex persisted spawn_agent arguments');
  if (args.agent_type !== run.role || args.fork_turns !== 'none' || args.task_name !== run.native_descriptor.native_task_name
    || typeof args.message !== 'string' || !/^gAAAA[A-Za-z0-9_=-]+$/.test(args.message)) fail('Codex persisted encrypted spawn/input/task/role binding mismatch');
  const spawnId = spawnCalls[0].payload.call_id;
  const waitArgs = callArguments(waitCalls[0].payload.arguments, 'Codex wait_agent');
  if (Array.isArray(waitArgs) || Object.keys(waitArgs).some((key) => key !== 'timeout_ms')
    || (waitArgs.timeout_ms !== undefined && (!Number.isInteger(waitArgs.timeout_ms)
      || waitArgs.timeout_ms < 10_000 || waitArgs.timeout_ms > 3_600_000))) fail('Codex wait_agent has unexpected arguments');
  const callOutputs = parent.filter((event) => event?.type === 'response_item' && event?.payload?.type === 'function_call_output');
  if (callOutputs.length !== 2 || !callOutputs.some((event) => event.payload.call_id === spawnId)
    || !callOutputs.some((event) => event.payload.call_id === waitCalls[0].payload.call_id)) fail('Codex spawn/wait results are not exact');
  const waitOutput = callOutputs.find((event) => event.payload.call_id === waitCalls[0].payload.call_id)?.payload?.output;
  let waitResult;
  try { waitResult = typeof waitOutput === 'string' ? JSON.parse(waitOutput) : waitOutput; } catch { fail('Codex wait result is invalid JSON'); }
  if (!waitResult || waitResult.timed_out === true || /timed out/i.test(waitResult.message || '')) fail('Codex wait did not complete');
  const edges = parent.filter((event) => event?.type === 'event_msg' && event?.payload?.type === 'sub_agent_activity');
  const begun = edges.filter((event) => event?.payload?.kind === 'started');
  if (begun.length !== 1 || begun[0].payload.event_id !== spawnId || edges.some((event) => event.payload.kind !== 'started')) fail('Codex native persisted start graph is not exact');
  const childId = begun[0].payload.agent_thread_id;
  const spawnOutputEvent = callOutputs.find((event) => event.payload.call_id === spawnId);
  const waitOutputEvent = callOutputs.find((event) => event.payload.call_id === waitCalls[0].payload.call_id);
  assertStrictOrder('Codex persisted parent spawn/wait lifecycle',
    parent.indexOf(spawnCalls[0]), parent.indexOf(spawnOutputEvent), parent.indexOf(begun[0]),
    parent.indexOf(waitCalls[0]), parent.indexOf(waitOutputEvent));
  if (!childId || childId === parentId) fail('Codex child identity is missing/not distinct');
  if (childId !== observed.childId || spawnId !== observed.spawnId) fail('Codex public plaintext seam differs from persisted native edge');
  const spawnOutput = callOutputs.find((event) => event.payload.call_id === spawnId)?.payload?.output;
  if (typeof spawnOutput !== 'string' || !spawnOutput.includes(childId)) fail('Codex spawn result does not bind the native child ID');
  const child = parseJsonl(childBytes, 'Codex child rollout');
  const metas = child.filter((event) => event?.type === 'session_meta');
  if (metas.length !== 1) fail('Codex child session_meta is not exact');
  const meta = metas[0];
  const spawn = meta?.payload?.source?.subagent?.thread_spawn;
  if (meta?.payload?.id !== childId || meta?.payload?.parent_thread_id !== parentId || meta?.payload?.thread_source !== 'subagent'
    || meta?.payload?.agent_role !== run.role || spawn?.agent_role !== run.role || spawn?.parent_thread_id !== parentId
    || spawn?.agent_path !== meta?.payload?.agent_path || !String(meta?.payload?.agent_path || '').endsWith(`/${run.native_descriptor.native_task_name}`)) {
    fail('Codex child parent/role/path binding mismatch');
  }
  const encryptedInputs = child.filter((event) => event?.type === 'response_item' && event?.payload?.type === 'agent_message')
    .flatMap((event) => event?.payload?.content || []).filter((item) => item?.type === 'encrypted_content')
    .map((item) => item.encrypted_content).filter((value) => typeof value === 'string');
  if (encryptedInputs.length !== 1 || encryptedInputs[0] !== args.message) fail('Codex child encrypted input does not exactly bind persisted parent spawn ciphertext');
  const contexts = child.filter((event) => event?.type === 'turn_context');
  if (contexts.length !== 1) fail('Codex child turn_context is not exact');
  const context = contexts[0].payload;
  verifyCodexTurnContext(context, run.native_descriptor.sandbox_contract.type,
    root, run.projection, 'Codex child');
  const childStarts = child.filter((event) => event?.type === 'event_msg' && event?.payload?.type === 'task_started');
  const childCompletes = child.filter((event) => event?.type === 'event_msg' && event?.payload?.type === 'task_complete');
  if (childStarts.length !== 1 || childCompletes.length !== 1
    || childStarts[0]?.payload?.turn_id !== childCompletes[0]?.payload?.turn_id) fail('Codex child task start/completion is not exact');
  if (!UUID_RE.test(childStarts[0]?.payload?.turn_id || '') || childStarts[0].payload.turn_id !== observed.childTurnId
    || observed.itemEvents.some(({ message }) =>
    message.params.threadId === childId && message.params.turnId !== childStarts[0].payload.turn_id)) {
    fail('Codex public child items are not bound to the persisted child turn');
  }
  const outputs = child.filter((event) => event?.type === 'event_msg' && event?.payload?.type === 'agent_message')
    .map((event) => event.payload.message).filter((value) => typeof value === 'string' && value.trim());
  if (outputs.length !== 1 || outputs[0].trim() !== expectedResult) fail('Codex child result differs from the exact frozen result');
  const outputEvent = child.find((event) => event?.type === 'event_msg'
    && event?.payload?.type === 'agent_message' && event.payload.message === outputs[0]);
  assertStrictOrder('Codex persisted child task lifecycle',
    child.indexOf(childStarts[0]), child.indexOf(outputEvent), child.indexOf(childCompletes[0]));
  if (run.role === 'work-agent') {
    const toolCalls = child.filter((event) => event?.type === 'response_item' && event?.payload?.type === 'custom_tool_call');
    const toolResults = child.filter((event) => event?.type === 'response_item' && event?.payload?.type === 'custom_tool_call_output');
    if (toolCalls.length !== 1 || toolCalls[0].payload.name !== 'exec' || toolResults.length !== 1
      || toolResults[0].payload.call_id !== toolCalls[0].payload.call_id) {
      fail('Codex work child tool graph is not one exact exec call/result');
    }
    assertStrictOrder('Codex persisted work tool lifecycle',
      child.indexOf(childStarts[0]), child.indexOf(toolCalls[0]), child.indexOf(toolResults[0]),
      child.indexOf(outputEvent), child.indexOf(childCompletes[0]));
    const observedCommand = staticExecCommand(toolCalls[0].payload.input, root);
    if (observedCommand !== run.packet.packet.verification[0].command) fail('Codex work child executed a non-frozen verification command');
    if (!Buffer.from(stable(toolResults[0].payload), 'utf8').toString('utf8').includes(run.packet.verification_sentinel)) {
      fail('Codex work verification result lacks the frozen success sentinel');
    }
    exactCodexWorkCommand(observed.itemEvents, childId, childStarts[0].payload.turn_id, root, run.packet);
  } else if (child.some((event) => event?.type === 'response_item'
    && ['custom_tool_call', 'function_call'].includes(event?.payload?.type))) {
    fail('Codex read-only child called a tool');
  } else if (observed.itemEvents.some(({ item }) => item?.type === 'commandExecution')) {
    fail('Codex read-only child emitted a commandExecution lifecycle');
  }
  return {
    parentId,
    childId,
    spawnId,
    output: outputs[0].trim(),
    observedInputSha256: observed.observedInputSha256,
    observedProjection: run.projection,
  };
}

function verifyAll(argv) {
  const evidenceRoot = canonicalDirectory(option(argv, '--evidence-root'), 'evidence root');
  const anchorPathArg = option(argv, '--anchor');
  const expectedAnchorSha = option(argv, '--expected-anchor-sha');
  const expectedEnvelopeSha = option(argv, '--expected-envelope-sha');
  const expectedFingerprint = option(argv, '--expected-fingerprint');
  const expectedCounterFingerprint = option(argv, '--expected-counter-fingerprint');
  const expectedNonceSetSha = option(argv, '--expected-nonce-set-sha');
  const expectedTarget = option(argv, '--expected-target-commit');
  const expectedTcbSha = option(argv, '--expected-tcb-sha');
  const expectedVerifierSha = option(argv, '--expected-verifier-sha');
  for (const [name, value] of Object.entries({ expectedAnchorSha, expectedEnvelopeSha, expectedFingerprint, expectedCounterFingerprint, expectedNonceSetSha, expectedTcbSha, expectedVerifierSha })) {
    if (!HASH.test(value || '')) fail(`missing/invalid out-of-band ${name}`);
  }
  if (!anchorPathArg || !/^[a-f0-9]{40}$/.test(expectedTarget || '')) fail('missing out-of-band anchor path/target commit');
  const anchorRead = secureRead(anchorPathArg, null, 'precommit anchor');
  if (sha256(anchorRead.bytes) !== expectedAnchorSha) fail('out-of-band precommit anchor hash mismatch');
  if (within(evidenceRoot, anchorRead.path) || within(anchorRead.path, evidenceRoot)) fail('precommit anchor is not outside evidence');
  const anchor = parseJson(anchorRead.bytes, 'precommit anchor');
  const baseKeys = ['schema_version', 'transaction_id', 'created_at', 'expires_at', 'repo_root', 'evidence_root', 'consume_path', 'target_commit', 'target_tree_manifest', 'tcb', 'verifier', 'candidate_launcher', 'work_packet', 'counter_ready', 'evidence_public_key_pem', 'evidence_fingerprint_sha256', 'nonce_commitments', 'nonce_set_sha256', 'model_resolutions', 'runs'];
  const anchorKeys = [...baseKeys, 'base_core_sha256', 'evidence_signature_ed25519', 'counter_public_key_pem', 'counter_fingerprint_sha256', 'counter_signature_ed25519'];
  exactKeys(anchor, anchorKeys, 'precommit anchor');
  if (anchor.schema_version !== 'luca.agent-evidence-anchor.v2') fail('wrong precommit anchor schema');
  const baseCore = Object.fromEntries(baseKeys.map((key) => [key, anchor[key]]));
  const evidenceKey = pemKey(anchor.evidence_public_key_pem, expectedFingerprint, 'evidence');
  const counterKey = pemKey(anchor.counter_public_key_pem, expectedCounterFingerprint, 'quality-gate counter');
  if (anchor.evidence_fingerprint_sha256 !== expectedFingerprint
    || anchor.counter_fingerprint_sha256 !== expectedCounterFingerprint) fail('anchor fingerprint differs from out-of-band commitment');
  verifySignature(evidenceKey, baseCore, anchor.base_core_sha256, anchor.evidence_signature_ed25519, 'anchor evidence signature');
  verifySignature(counterKey, baseCore, anchor.base_core_sha256, anchor.counter_signature_ed25519, 'anchor quality-gate countersignature');
  if (!Array.isArray(anchor.runs) || anchor.runs.length !== 8) fail('anchor run matrix must contain eight runs');
  if (!Array.isArray(anchor.nonce_commitments) || anchor.nonce_commitments.length !== 8) fail('anchor nonce commitments missing');
  for (const nonce of anchor.nonce_commitments) {
    exactKeys(nonce, ['run_id', 'commitment_sha256'], 'anchor nonce commitment');
    if (typeof nonce.run_id !== 'string' || !nonce.run_id || !HASH.test(nonce.commitment_sha256 || '')) {
      fail('anchor nonce commitment is invalid');
    }
  }
  const nonceProjection = anchor.nonce_commitments;
  if (anchor.nonce_set_sha256 !== expectedNonceSetSha
    || sha256(Buffer.from(stable(nonceProjection), 'utf8')) !== expectedNonceSetSha) fail('nonce-set commitment mismatch');
  exactKeys(anchor.tcb, ['path', 'sha256'], 'anchor TCB');
  exactKeys(anchor.verifier, ['path', 'sha256'], 'anchor verifier');
  exactKeys(anchor.candidate_launcher, ['path', 'sha256', 'execution'], 'anchor candidate launcher');
  exactKeys(anchor.work_packet, ['path', 'sha256', 'source_sha256'], 'anchor work packet');
  exactKeys(anchor.counter_ready, ['path', 'sha256', 'ready_id', 'created_at', 'expires_at', 'socket_path'], 'anchor counter ready');
  if (anchor.tcb.sha256 !== expectedTcbSha || anchor.verifier.sha256 !== expectedVerifierSha
    || realpathSync(anchor.tcb.path) !== TCB || realpathSync(anchor.verifier.path) !== SELF
    || sha256(readFileSync(TCB)) !== expectedTcbSha || sha256(readFileSync(SELF)) !== expectedVerifierSha) fail('frozen TCB/verifier identity mismatch');
  const tcbSource = readFileSync(TCB, 'utf8');
  if (/(?:import\s*\(|\bfrom\b|\bspawn(?:Sync)?\b|\bexec(?:File|Sync)?\b)[^\n]*agent-launcher\.mjs/.test(tcbSource)) fail('TCB imports or executes the candidate launcher');
  if (anchor.candidate_launcher.execution !== 'describe-contract-only-before-evidence-key'
    || sha256(readFileSync(anchor.candidate_launcher.path)) !== anchor.candidate_launcher.sha256) fail('candidate launcher is not hash-only/frozen');
  const root = canonicalDirectory(anchor.repo_root, 'frozen repo root');
  const transactionRoot = canonicalDirectory(dirname(evidenceRoot), 'transaction root');
  if (anchor.target_commit !== expectedTarget || realpathSync(anchor.evidence_root) !== evidenceRoot
    || realpathSync(anchor.candidate_launcher.path) !== realpathSync(join(root, 'scripts/agent-launcher.mjs'))
    || dirname(anchorRead.path) !== transactionRoot || dirname(evidenceRoot) !== transactionRoot) fail('anchor root/target/candidate binding mismatch');
  const counterReadyRead = secureRead(anchor.counter_ready.path, null, 'counter ready artifact');
  if (sha256(counterReadyRead.bytes) !== anchor.counter_ready.sha256) fail('counter ready artifact hash mismatch');
  const counterReady = parseJson(counterReadyRead.bytes, 'counter ready artifact');
  exactKeys(counterReady, ['schema_version', 'ready_id', 'created_at', 'expires_at', 'socket_path', 'counter_public_key_pem', 'counter_fingerprint_sha256', 'commitments'], 'counter ready artifact');
  exactKeys(counterReady.commitments, ['tcb_sha256', 'verifier_sha256', 'repo_root', 'target_commit', 'work_packet_sha256', 'work_packet_source_sha256'], 'counter ready commitments');
  const counterReadyCanonicalBytes = Buffer.from(`${stable(counterReady)}\n`, 'utf8');
  const counterSocketParentCandidate = canonicalDirectory(dirname(resolve(counterReady.socket_path)), 'counter socket parent');
  const canonicalSocketPath = join(counterSocketParentCandidate, resolve(counterReady.socket_path).slice(dirname(resolve(counterReady.socket_path)).length + 1));
  if (counterReadyCanonicalBytes.compare(counterReadyRead.bytes) !== 0
    || counterReady.schema_version !== 'luca.agent-evidence-counter-ready.v1'
    || !/^counter-[a-f0-9]{24}$/.test(counterReady.ready_id || '')
    || counterReady.ready_id !== anchor.counter_ready.ready_id || counterReady.created_at !== anchor.counter_ready.created_at
    || counterReady.expires_at !== anchor.counter_ready.expires_at || counterReady.socket_path !== anchor.counter_ready.socket_path
    || counterReady.counter_public_key_pem !== anchor.counter_public_key_pem
    || counterReady.counter_fingerprint_sha256 !== expectedCounterFingerprint
    || counterReady.commitments.tcb_sha256 !== expectedTcbSha
    || counterReady.commitments.verifier_sha256 !== expectedVerifierSha
    || realpathSync(counterReady.commitments.repo_root) !== root
    || counterReady.commitments.target_commit !== expectedTarget
    || counterReady.commitments.work_packet_sha256 !== anchor.work_packet.sha256
    || counterReady.commitments.work_packet_source_sha256 !== anchor.work_packet.source_sha256
    || !isAbsolute(counterReady.socket_path || '') || resolve(counterReady.socket_path) !== canonicalSocketPath
    || within(root, counterReadyRead.path)
    || within(root, resolve(counterReady.socket_path))) fail('counter ready artifact/commitments differ from anchor/out-of-band truth');
  const counterSocketParent = counterSocketParentCandidate;
  if (overlaps(counterReadyRead.path, transactionRoot) || overlaps(resolve(counterReady.socket_path), transactionRoot)) {
    fail('counter ready/socket overlaps the evidence transaction root');
  }
  const consumePath = resolve(anchor.consume_path);
  if (existsSync(consumePath)) fail('precommit anchor was already consumed');
  const consumeParent = canonicalDirectory(dirname(consumePath), 'consume parent');
  if (consumeParent !== transactionRoot || join(consumeParent, consumePath.slice(consumeParent.length + 1)) !== consumePath) fail('consume path is not canonical/transaction-bound');
  const writeRoots = new Set();
  const anchorRunMap = new Map();
  for (const run of anchor.runs) {
    exactKeys(run, ['run_id', 'harness', 'role', 'projection', 'input_sha256', 'candidate_contract_sha256', 'native_descriptor_sha256', 'write_roots', 'sandbox_contract'], `anchor run ${run?.run_id}`);
    const key = `${run.harness}/${run.role}`;
    if (!HARNESSES.includes(run.harness) || !ROLES.includes(run.role) || anchorRunMap.has(key)
      || !HASH.test(run.input_sha256 || '') || !HASH.test(run.candidate_contract_sha256 || '')
      || !Array.isArray(run.write_roots)) fail(`invalid/duplicate anchor run ${key}`);
    for (const path of run.write_roots) writeRoots.add(canonicalDirectory(path, `write root ${run.run_id}`));
    anchorRunMap.set(key, run);
  }
  if (new Set(anchor.runs.map((run) => run.run_id)).size !== 8
    || new Set(anchor.nonce_commitments.map((run) => run.run_id)).size !== 8
    || new Set(anchor.nonce_commitments.map((run) => run.commitment_sha256)).size !== 8
    || anchor.runs.some((run) => !anchor.nonce_commitments.some((nonce) => nonce.run_id === run.run_id))) {
    fail('anchor run IDs/nonces are not unique or one-to-one');
  }
  for (const protectedPath of [root, ...writeRoots]) {
    if (overlaps(evidenceRoot, protectedPath) || overlaps(anchorRead.path, protectedPath) || overlaps(consumePath, protectedPath)) fail('evidence/anchor/consume overlaps repo or child/process write root');
    if (overlaps(counterReadyRead.path, protectedPath) || overlaps(counterSocketParent, protectedPath)) fail('counter ready/socket parent overlaps repo or child/process write root');
  }
  if (overlaps(evidenceRoot, consumePath) || overlaps(anchorRead.path, consumePath)) fail('consume path overlaps evidence/anchor');
  if (within(root, SELF) || [...writeRoots].some((path) => within(path, SELF) || within(path, TCB))) fail('TCB/verifier is inside candidate or child/process write root');
  const head = gitRead(root, ['rev-parse', 'HEAD'], 'git rev-parse HEAD').toString('utf8').trim();
  const status = gitRead(root, ['status', '--porcelain=v2', '--untracked-files=no'], 'git status');
  if (head !== expectedTarget || status.length) fail('frozen checkout target/clean state mismatch');
  const anchorCreated = iso(anchor.created_at, 'anchor.created_at');
  const expiry = iso(anchor.expires_at, 'anchor.expires_at');
  const counterReadyCreated = iso(counterReady.created_at, 'counter ready.created_at');
  const counterReadyExpiry = iso(counterReady.expires_at, 'counter ready.expires_at');
  const verifyAt = Date.now();
  if (counterReadyCreated > anchorCreated || anchorCreated >= counterReadyExpiry
    || anchorCreated >= expiry || expiry > counterReadyExpiry || verifyAt > expiry) fail('precommit anchor/counter-ready is invalid or improperly ordered');

  const packetBytes = readFileSync(anchor.work_packet.path);
  if (sha256(packetBytes) !== anchor.work_packet.source_sha256) fail('work packet source drift');
  const packet = validatePacket(parseJson(packetBytes, 'work packet'));
  packet.source_sha256 = sha256(packetBytes);
  if (packet.sha256 !== anchor.work_packet.sha256) fail('work packet canonical hash drift');
  if (stable(anchor.target_tree_manifest) !== stable(targetTreeManifest(root, expectedTarget, anchor.work_packet.path))) {
    fail('target-tree manifest drift or target-commit substitution');
  }
  const routing = routingProjection(root);
  const effectiveModels = verifyModelResolutions(anchor.model_resolutions, root, evidenceRoot, routing);
  const envelopeRead = secureRead(join(evidenceRoot, 'execution-envelope.json'), evidenceRoot, 'execution envelope');
  if (sha256(envelopeRead.bytes) !== expectedEnvelopeSha) fail('out-of-band envelope hash mismatch');
  const envelope = parseJson(envelopeRead.bytes, 'execution envelope');
  const envelopeCoreKeys = ['schema_version', 'transaction_id', 'anchor_path', 'anchor_sha256', 'target_commit', 'repo_root', 'created_at', 'expires_at', 'public_key_fingerprint_sha256', 'tcb_sha256', 'verifier_sha256', 'launcher_sha256', 'work_packet_sha256', 'work_packet_source_sha256', 'runtime_attestations', 'runs'];
  const envelopeKeys = [...envelopeCoreKeys, 'envelope_core_sha256', 'signature_ed25519'];
  exactKeys(envelope, envelopeKeys, 'execution envelope');
  if (envelope.schema_version !== 'luca.agent-evidence-envelope.v2' || envelope.transaction_id !== anchor.transaction_id
    || realpathSync(envelope.anchor_path) !== anchorRead.path || envelope.anchor_sha256 !== expectedAnchorSha
    || envelope.target_commit !== expectedTarget || realpathSync(envelope.repo_root) !== root
    || envelope.expires_at !== anchor.expires_at || envelope.public_key_fingerprint_sha256 !== expectedFingerprint
    || envelope.tcb_sha256 !== expectedTcbSha || envelope.verifier_sha256 !== expectedVerifierSha
    || envelope.launcher_sha256 !== anchor.candidate_launcher.sha256 || envelope.work_packet_sha256 !== anchor.work_packet.sha256
    || envelope.work_packet_source_sha256 !== anchor.work_packet.source_sha256) fail('envelope does not bind the precommit anchor');
  verifySignature(evidenceKey, Object.fromEntries(envelopeCoreKeys.map((key) => [key, envelope[key]])), envelope.envelope_core_sha256, envelope.signature_ed25519, 'execution envelope');
  const envelopeCreated = iso(envelope.created_at, 'envelope.created_at');
  if (envelopeCreated < anchorCreated || envelopeCreated > expiry) fail('envelope timestamp is outside precommit lifetime');
  const runKeys = ['run_id', 'harness', 'role', 'nonce_commitment_sha256', 'candidate_contract_sha256', 'native_descriptor', 'native_descriptor_sha256'];
  if (!Array.isArray(envelope.runs) || envelope.runs.length !== 8) fail('envelope run matrix must contain eight runs');
  const runMap = new Map();
  for (const run of envelope.runs) {
    exactKeys(run, runKeys, `envelope run ${run?.run_id}`);
    const key = `${run.harness}/${run.role}`;
    if (!HARNESSES.includes(run.harness) || !ROLES.includes(run.role) || runMap.has(key)) fail(`invalid/duplicate run ${key}`);
    const anchorRun = anchorRunMap.get(key);
    const nonce = anchor.nonce_commitments.find((item) => item.run_id === run.run_id);
    if (!anchorRun || !nonce || nonce.commitment_sha256 !== run.nonce_commitment_sha256
      || run.candidate_contract_sha256 !== anchorRun.candidate_contract_sha256) fail(`run ${key} differs from precommit anchor`);
    const descriptorKeys = ['schema_version', 'dispatcher_id', 'harness', 'role', 'tier', 'projection', 'definition_path', 'definition_sha256', 'routing_path', 'routing_sha256', 'packet_sha256', 'packet_source_sha256', 'input_sha256', 'native_task_name', 'sandbox_contract', 'write_roots', 'dispatcher_prompt', 'dispatcher_prompt_sha256', 'command_path', 'command_sha256', 'native_binary_path', 'native_binary_sha256', 'cli_version', 'cwd', 'args', 'argv_sha256'];
    exactKeys(run.native_descriptor, descriptorKeys, `native descriptor ${key}`);
    const descriptor = run.native_descriptor;
    if (descriptor.schema_version !== 'luca.native-launch.v2' || descriptor.dispatcher_id !== run.run_id
      || descriptor.harness !== run.harness || descriptor.role !== run.role || descriptor.tier !== ROLE_TIERS[run.role]
      || descriptor.routing_sha256 !== routing.sha256) fail(`native descriptor identity/routing mismatch ${key}`);
    const projection = run.harness === 'claude'
      ? effectiveModels.get(`claude/${descriptor.tier}`)?.projection
      : routing.tiers[descriptor.tier].effort;
    if (descriptor.projection !== projection) fail(`native projection mismatch ${key}`);
    const def = verifyRoleDefinition(root, run.harness, run.role, projection, descriptor.definition_path);
    if (sha256(def.bytes) !== descriptor.definition_sha256) fail(`definition drift ${key}`);
    const expected = makeExpectedDescriptor({ ...run, tier: descriptor.tier, projection }, root, routing, packet, def);
    if (stable(descriptor) !== stable(expected)) fail(`native descriptor was not independently derivable ${key}`);
    if (nativeDispatchContract(expected).contract_sha256 !== run.candidate_contract_sha256) {
      fail(`candidate dispatch contract does not match independently derived native launch ${key}`);
    }
    const expectedWriteRoots = [canonicalDirectory(join(transactionRoot, 'child-scratch', run.run_id), `scratch ${key}`)];
    if (run.harness === 'claude') {
      const claudeHome = join(process.env.HOME || '', '.claude');
      const claudeTemp = `/private/tmp/claude-${typeof process.getuid === 'function' ? process.getuid() : 'unknown'}`;
      if (existsSync(claudeHome)) expectedWriteRoots.push(realpathSync(claudeHome));
      if (existsSync(claudeTemp)) expectedWriteRoots.push(realpathSync(claudeTemp));
    } else {
      const codexHome = process.env.CODEX_HOME || join(process.env.HOME || '', '.codex');
      if (existsSync(codexHome)) expectedWriteRoots.push(realpathSync(codexHome));
    }
    if (run.role === 'work-agent') expectedWriteRoots.push(root);
    if (stable(descriptor.write_roots) !== stable([...new Set(expectedWriteRoots)])) fail(`native process/child write-root exact set mismatch ${key}`);
    const descriptorSha = sha256(Buffer.from(stable(descriptor), 'utf8'));
    if (descriptorSha !== run.native_descriptor_sha256 || descriptorSha !== anchorRun.native_descriptor_sha256
      || anchorRun.harness !== run.harness || anchorRun.role !== run.role || anchorRun.projection !== projection
      || anchorRun.input_sha256 !== descriptor.input_sha256 || stable(anchorRun.write_roots) !== stable(descriptor.write_roots)
      || stable(anchorRun.sandbox_contract) !== stable(descriptor.sandbox_contract)) fail(`native descriptor differs from precommit ${key}`);
    if (sha256(readFileSync(descriptor.command_path)) !== descriptor.command_sha256
      || sha256(readFileSync(descriptor.native_binary_path)) !== descriptor.native_binary_sha256
      || !/(?:claude|codex).*\d+\.\d+|\d+\.\d+.*(?:claude|codex)/i.test(descriptor.cli_version)) fail(`native binary identity drift ${key}`);
    for (const path of descriptor.write_roots) if (!writeRoots.has(realpathSync(path))) fail(`descriptor write root is not precommitted ${key}`);
    runMap.set(key, {
      ...run,
      projection,
      expectedConcreteModel: run.harness === 'claude'
        ? effectiveModels.get(`claude/${descriptor.tier}`)?.model
        : null,
      packet,
      input: roleInput(run.role, packet),
      expectedResult: expectedOutput(run.role, packet),
    });
  }
  if (HARNESSES.flatMap((harness) => ROLES.map((role) => `${harness}/${role}`)).some((key) => !runMap.has(key))) fail('native matrix incomplete');
  verifyRuntimeAttestations(envelope.runtime_attestations, root, [...runMap.values()].filter((run) => run.harness === 'claude').map((run) => run.native_descriptor.sandbox_contract));

  const summaryRead = secureRead(join(evidenceRoot, 'summary.json'), evidenceRoot, 'summary');
  const summary = parseJson(summaryRead.bytes, 'summary');
  const summaryCoreKeys = ['schema_version', 'transaction_id', 'anchor_sha256', 'envelope_path', 'envelope_sha256', 'public_key_fingerprint_sha256', 'target_commit', 'harnesses', 'roles', 'receipts', 'completed_at'];
  const summaryKeys = [...summaryCoreKeys, 'summary_core_sha256', 'signature_ed25519'];
  exactKeys(summary, summaryKeys, 'summary');
  if (summary.schema_version !== 'luca.agent-evidence-summary.v2' || summary.transaction_id !== anchor.transaction_id
    || summary.anchor_sha256 !== expectedAnchorSha || summary.envelope_sha256 !== expectedEnvelopeSha
    || summary.public_key_fingerprint_sha256 !== expectedFingerprint || summary.target_commit !== expectedTarget
    || stable([...summary.harnesses].sort()) !== stable([...HARNESSES].sort())
    || stable([...summary.roles].sort()) !== stable([...ROLES].sort()) || summary.receipts.length !== 8) fail('summary binding/matrix mismatch');
  verifySignature(evidenceKey, Object.fromEntries(summaryCoreKeys.map((key) => [key, summary[key]])), summary.summary_core_sha256, summary.signature_ed25519, 'summary');
  const summaryAt = iso(summary.completed_at, 'summary.completed_at');
  if (summaryAt < envelopeCreated || summaryAt > expiry) fail('summary timestamp outside anchor lifetime');

  const seen = new Set();
  const parents = new Set();
  const children = new Set();
  const nonces = new Set();
  const receiptCoreKeys = ['schema_version', 'transaction_id', 'run_id', 'anchor_sha256', 'envelope_sha256', 'public_key_fingerprint_sha256', 'harness', 'role', 'target_commit', 'native_descriptor_sha256', 'nonce_commitment_sha256', 'parent_id', 'child_id', 'spawn_id', 'source_log_sha256', 'output_sha256', 'events', 'created_at', 'completed_at', 'expires_at'];
  const receiptKeys = [...receiptCoreKeys, 'receipt_core_sha256', 'signature_ed25519'];
  let latestCompletion = anchorCreated;
  for (const item of summary.receipts) {
    exactKeys(item, ['harness', 'role', 'path', 'sha256', 'child_id'], 'summary receipt item');
    const key = `${item.harness}/${item.role}`;
    if (!runMap.has(key) || seen.has(key)) fail(`unexpected/duplicate receipt ${key}`);
    seen.add(key);
    const read = secureRead(join(evidenceRoot, item.path), evidenceRoot, `receipt ${key}`);
    if (sha256(read.bytes) !== item.sha256) fail(`receipt hash mismatch ${key}`);
    const receipt = parseJson(read.bytes, `receipt ${key}`);
    exactKeys(receipt, receiptKeys, `receipt ${key}`);
    const run = runMap.get(key);
    if (receipt.schema_version !== 'luca.agent-evidence-receipt.v2' || receipt.transaction_id !== anchor.transaction_id
      || receipt.run_id !== run.run_id || receipt.anchor_sha256 !== expectedAnchorSha || receipt.envelope_sha256 !== expectedEnvelopeSha
      || receipt.public_key_fingerprint_sha256 !== expectedFingerprint || receipt.harness !== item.harness || receipt.role !== item.role
      || receipt.target_commit !== expectedTarget || receipt.native_descriptor_sha256 !== run.native_descriptor_sha256
      || receipt.nonce_commitment_sha256 !== run.nonce_commitment_sha256 || receipt.child_id !== item.child_id) fail(`receipt top-level binding mismatch ${key}`);
    verifySignature(evidenceKey, Object.fromEntries(receiptCoreKeys.map((field) => [field, receipt[field]])), receipt.receipt_core_sha256, receipt.signature_ed25519, `receipt ${key}`);
    if (!Array.isArray(receipt.events) || receipt.events.length !== 3) fail(`receipt event count mismatch ${key}`);
    let previous = null;
    const kinds = ['launch', 'session', 'result'];
    receipt.events.forEach((event, index) => {
      exactKeys(event, ['schema_version', 'kind', 'sequence', 'previous_sha256', 'payload', 'event_sha256', 'signature_ed25519'], `receipt event ${key}/${index}`);
      if (event.schema_version !== 'luca.agent-evidence-event.v2' || event.kind !== kinds[index] || event.sequence !== index + 1 || event.previous_sha256 !== previous) fail(`event chain mismatch ${key}`);
      const core = { schema_version: event.schema_version, kind: event.kind, sequence: event.sequence, previous_sha256: event.previous_sha256, payload: event.payload };
      verifySignature(evidenceKey, core, event.event_sha256, event.signature_ed25519, `event ${key}/${index}`);
      previous = event.event_sha256;
    });
    const [launch, session, result] = receipt.events.map((event) => event.payload);
    exactKeys(launch, ['run_id', 'anchor_sha256', 'envelope_sha256', 'nonce', 'nonce_commitment_sha256', 'harness', 'role', 'native_descriptor_sha256', 'target_commit', 'launched_at'], `launch ${key}`);
    exactKeys(session, ['run_id', 'parent_id', 'child_id', 'spawn_id', 'native_identity_kind', 'input_binding_kind', 'observed_input_sha256', 'observed_projection', 'source_log_sha256', 'raw_logs', 'stderr_sha256', 'observed_at'], `session ${key}`);
    exactKeys(result, ['run_id', 'output_sha256', 'output_size', 'completed_at', 'exit_code'], `result ${key}`);
    const expectedInputBinding = run.harness === 'claude'
      ? 'native_plaintext_prompt_sha256'
      : 'precommitted_dispatcher_plus_native_ciphertext_continuity';
    if (session.input_binding_kind !== expectedInputBinding
      || launch.run_id !== run.run_id || session.run_id !== run.run_id || result.run_id !== run.run_id
      || launch.anchor_sha256 !== expectedAnchorSha || launch.envelope_sha256 !== expectedEnvelopeSha
      || launch.native_descriptor_sha256 !== run.native_descriptor_sha256 || launch.target_commit !== expectedTarget
      || launch.harness !== run.harness || launch.role !== run.role || sha256(Buffer.from(launch.nonce, 'utf8')) !== run.nonce_commitment_sha256
      || launch.nonce_commitment_sha256 !== run.nonce_commitment_sha256 || nonces.has(run.nonce_commitment_sha256)) fail(`launch/precommit binding mismatch ${key}`);
    nonces.add(run.nonce_commitment_sha256);
    if (receipt.parent_id === receipt.child_id || parents.has(receipt.parent_id)
      || children.has(receipt.child_id) || children.has(receipt.parent_id) || parents.has(receipt.child_id)
      || session.parent_id !== receipt.parent_id || session.child_id !== receipt.child_id || session.spawn_id !== receipt.spawn_id) fail(`session identity mismatch/reuse ${key}`);
    parents.add(receipt.parent_id);
    children.add(receipt.child_id);
    const receiptCreated = iso(receipt.created_at, `receipt.created_at ${key}`);
    const launchedAt = iso(launch.launched_at, `launch.launched_at ${key}`);
    const observedAt = iso(session.observed_at, `session.observed_at ${key}`);
    const resultAt = iso(result.completed_at, `result.completed_at ${key}`);
    const receiptCompleted = iso(receipt.completed_at, `receipt.completed_at ${key}`);
    if (!(anchorCreated <= envelopeCreated && envelopeCreated <= receiptCreated && receiptCreated === launchedAt
      && launchedAt <= observedAt && observedAt <= resultAt && resultAt === receiptCompleted
      && receiptCompleted <= summaryAt && summaryAt <= expiry) || receipt.expires_at !== anchor.expires_at || result.exit_code !== 0) fail(`full timestamp ordering/expiry mismatch ${key}`);
    latestCompletion = Math.max(latestCompletion, receiptCompleted);
    const expectedKinds = run.harness === 'claude' ? ['public', 'stderr'] : ['public', 'stderr', 'parent_rollout', 'child_rollout'];
    if (!Array.isArray(session.raw_logs) || stable(session.raw_logs.map((raw) => raw.kind)) !== stable(expectedKinds)) fail(`raw log exact manifest mismatch ${key}`);
    const byKind = new Map();
    const framed = [];
    for (const raw of session.raw_logs) {
      exactKeys(raw, ['kind', 'path', 'size', 'sha256'], `raw log ${key}`);
      if (byKind.has(raw.kind)) fail(`duplicate raw log kind ${key}`);
      const rawRead = secureRead(join(evidenceRoot, raw.path), evidenceRoot, `raw log ${key}/${raw.kind}`);
      if (rawRead.bytes.length !== raw.size || sha256(rawRead.bytes) !== raw.sha256) fail(`raw log hash mismatch ${key}/${raw.kind}`);
      byKind.set(raw.kind, rawRead.bytes);
      framed.push(Buffer.from(`${raw.kind}:${rawRead.bytes.length}:`), rawRead.bytes);
    }
    if (sha256(byKind.get('stderr')) !== session.stderr_sha256 || sha256(Buffer.concat(framed)) !== session.source_log_sha256
      || session.source_log_sha256 !== receipt.source_log_sha256) fail(`raw source framing mismatch ${key}`);
    const parsed = run.harness === 'claude'
      ? verifyClaudeLogs(byKind.get('public'), run, run.input, run.expectedResult)
      : verifyCodexLogs(byKind.get('public'), byKind.get('parent_rollout'), byKind.get('child_rollout'), run, run.input, run.expectedResult, root);
    if (parsed.parentId !== receipt.parent_id || parsed.childId !== receipt.child_id || parsed.spawnId !== receipt.spawn_id
      || parsed.observedInputSha256 !== run.native_descriptor.input_sha256 || session.observed_input_sha256 !== parsed.observedInputSha256
      || session.observed_projection !== parsed.observedProjection) fail(`native graph/input/projection differs from signed session ${key}`);
    const outputHash = sha256(Buffer.from(parsed.output, 'utf8'));
    if (outputHash !== receipt.output_sha256 || outputHash !== result.output_sha256
      || result.output_size !== Buffer.byteLength(parsed.output, 'utf8')) fail(`native result hash/size mismatch ${key}`);
  }
  const verifiedAt = Date.now();
  if (seen.size !== 8 || parents.size !== 8 || children.size !== 8 || nonces.size !== 8
    || latestCompletion > summaryAt || verifiedAt > expiry) fail('matrix/verification-time invariant failed');
  let fd;
  try {
    fd = openSync(consumePath, 'wx', 0o600);
    writeSync(fd, `${JSON.stringify({ schema_version: 'luca.agent-evidence-consumption.v1', anchor_sha256: expectedAnchorSha, envelope_sha256: expectedEnvelopeSha, verified_at: new Date(verifiedAt).toISOString() })}\n`);
    fsyncSync(fd);
  } finally { if (fd !== undefined) closeSync(fd); }
  chmodSync(consumePath, 0o600);
  const consumeStat = statSync(consumePath);
  if (!consumeStat.isFile() || consumeStat.nlink !== 1 || (consumeStat.mode & 0o777) !== 0o600) {
    fail('verification consumption receipt is not a private single-link file');
  }
  process.stdout.write(`${JSON.stringify({ transaction_id: anchor.transaction_id, receipts: seen.size, anchor_sha256: expectedAnchorSha, consumed: consumePath })}\nAGENT_EVIDENCE_VERIFIED\n`);
}

try {
  if (process.argv[2] === 'counter-sign-server') await counterSignServer(process.argv.slice(3));
  else verifyAll(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`AGENT_EVIDENCE_VERIFY_ERROR ${error.message}\n`);
  process.exitCode = 2;
}
