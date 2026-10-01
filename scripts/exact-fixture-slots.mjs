// Optional test-only exact-slot lifecycle. No production host/native authority is changed.
// Deletion is sequential identity-checked traversal, NOT atomic directory CAS.
// Same-UID hostile concurrent mutation is outside the required exclusive owner window.
import {
  closeSync, constants, fsyncSync, lstatSync, mkdirSync, mkdtempSync, openSync,
  readFileSync, readdirSync, realpathSync, renameSync, rmdirSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const contexts = new Map();
const claims = new Map();
const fail = code => { throw Object.assign(new Error(code), { code }); };
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const uid = () => process.getuid();

function identity(path) {
  const st = lstatSync(path, { bigint: true });
  return { dev: String(st.dev), ino: String(st.ino), uid: String(st.uid),
    mode: Number(st.mode & 0o7777n), type: st.isDirectory() ? 'directory' : st.isFile() ? 'file' : st.isSymbolicLink() ? 'symlink' : 'other' };
}
function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function components(path) {
  if (!isAbsolute(path) || resolve(path) !== path) fail('NONCANONICAL_PATH');
  const result = [];
  for (let p = path;; p = dirname(p)) {
    const id = identity(p);
    if (id.type !== 'directory' || realpathSync(p) !== p) fail('COMPONENT_DRIFT');
    result.unshift({ path: p, ...id });
    if (p === sep) return result;
  }
}
function rootIdentity(path) {
  const id = identity(path);
  if (id.type !== 'directory' || id.uid !== String(uid()) || id.mode !== 0o700 || realpathSync(path) !== path) fail('ROOT_IDENTITY');
  return { path, ...id, components: components(path) };
}
function requireRoot(expected) {
  const actual = rootIdentity(expected.path);
  if (!equal(actual, expected)) fail('ROOT_OR_COMPONENT_DRIFT');
  return actual;
}
function bytes(path, mode = 0o600) {
  const id = identity(path);
  if (id.type !== 'file' || id.uid !== String(uid()) || id.mode !== mode) fail('BOUND_FILE_IDENTITY');
  components(dirname(path));
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { return readFileSync(fd); } finally { closeSync(fd); }
}
function readJSON(path) { return JSON.parse(bytes(path)); }
function durable(path, value) {
  components(dirname(path));
  const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { writeFileSync(fd, JSON.stringify(value) + '\n'); fsyncSync(fd); } finally { closeSync(fd); }
  const parent = openSync(dirname(path), constants.O_RDONLY);
  try { fsyncSync(parent); } finally { closeSync(parent); }
}
function present(path) { try { lstatSync(path); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } }
function manifest(path, expectedSHA) {
  if (!hash(expectedSHA)) fail('CONFIG_HASH_REQUIRED');
  const raw = bytes(path);
  if (sha(raw) !== expectedSHA) fail('CONFIG_DRIFT');
  const cfg = JSON.parse(raw);
  if (cfg.version !== 1 || !/^[a-z0-9-]+$/.test(cfg.runId) || !['fullverify', 'lifecycle-regression'].includes(cfg.purpose)) fail('CONFIG_SCHEMA');
  if (!hash(cfg.helperSHA256) || sha(readFileSync(self)) !== cfg.helperSHA256) fail('HELPER_DRIFT');
  if (!Array.isArray(cfg.slots) || !cfg.slots.length || cfg.slots.length > 75) fail('FINITE_SLOTS_REQUIRED');
  const paths = new Set(), ids = new Set();
  for (const slot of cfg.slots) {
    if (!/^[a-z0-9-]+$/.test(slot.id) || ids.has(slot.id) || paths.has(slot.path)) fail('DUPLICATE_SLOT');
    if (!isAbsolute(slot.path) || resolve(slot.path) !== slot.path || dirname(slot.path) !== cfg.fixtureParent ||
      !['/private/tmp/host-launch-', '/private/tmp/host-launch-model-profile-', '/private/tmp/host-parent-', '/private/tmp/host-guard-'].includes(slot.defaultPrefix) ||
      !basename(slot.path).startsWith(basename(slot.defaultPrefix))) fail('SLOT_PATH');
    if (slot.quarantine !== slot.path + '-quarantine' || paths.has(slot.quarantine)) fail('QUARANTINE_PATH');
    paths.add(slot.path); paths.add(slot.quarantine); ids.add(slot.id);
  }
  if (!Array.isArray(cfg.exitEvidencePaths) || !cfg.exitEvidencePaths.length || new Set(cfg.exitEvidencePaths).size !== cfg.exitEvidencePaths.length) fail('EXIT_EVIDENCE_PATHS');
  for (const key of ['fixtureParent', 'receiptDir', 'approvalPath', 'exitConfirmationPath']) {
    if (!isAbsolute(cfg[key]) || resolve(cfg[key]) !== cfg[key]) fail('CONFIG_PATH');
  }
  if (cfg.slots.some(s => s.path === cfg.receiptDir) || cfg.receiptDir.startsWith(cfg.fixtureParent + sep) && cfg.fixtureParent !== '/private/tmp') {
    // Regression receipts are siblings of regression roots, never descendants of a slot.
    if (cfg.slots.some(s => cfg.receiptDir.startsWith(s.path + sep))) fail('RECEIPT_INSIDE_SLOT');
  }
  if (!cfg.limits || !Number.isSafeInteger(cfg.limits.maxEntries) || cfg.limits.maxEntries < 1 || cfg.limits.maxEntries > 30000 || !Number.isSafeInteger(cfg.limits.maxBytes) || cfg.limits.maxBytes < 1 || cfg.limits.maxBytes > 268435456) fail('FINITE_SUBTREE_LIMITS');
  if (cfg.purpose === 'lifecycle-regression' && (!process.env.TMPDIR || !cfg.fixtureParent.startsWith(resolve(process.env.TMPDIR) + sep) || !basename(cfg.fixtureParent).startsWith('regression-'))) fail('REGRESSION_ROOT_BOUNDARY');
  if (cfg.purpose === 'fullverify') {
    const counts = Object.fromEntries(['/private/tmp/host-launch-', '/private/tmp/host-launch-model-profile-', '/private/tmp/host-parent-', '/private/tmp/host-guard-'].map(prefix => [prefix, cfg.slots.filter(s => s.defaultPrefix === prefix).length]));
    if (cfg.fixtureParent !== '/private/tmp' || !equal(Object.values(counts), [68, 1, 1, 5])) fail('FULLVERIFY_SLOT_PARTITION');
  }
  for (const path of cfg.exitEvidencePaths) if (!isAbsolute(path) || resolve(path) !== path) fail('EXIT_EVIDENCE_PATH');
  const approval = readJSON(cfg.approvalPath);
  if (approval.configSHA256 !== expectedSHA || approval.helperSHA256 !== cfg.helperSHA256 || approval.runId !== cfg.runId ||
    approval.exclusiveSameUserWindow !== true || approval.approved !== true ||
    (cfg.purpose === 'fullverify' ? approval.kind !== 'REAL_HUMAN_H0d_OWNER_RECEIPT' : approval.kind !== 'SYNTHETIC_LIFECYCLE_REGRESSION')) fail('APPROVAL_OR_OWNER_WINDOW_UNBOUND');
  return { cfg, configPath: path, configSHA256: expectedSHA };
}
function receipt(ctx, name) { return join(ctx.cfg.receiptDir, name + '.json'); }
function prepared(ctx) {
  const p = readJSON(receipt(ctx, 'prepared'));
  if (p.configSHA256 !== ctx.configSHA256 || p.helperSHA256 !== ctx.cfg.helperSHA256 || p.runId !== ctx.cfg.runId) fail('PREPARATION_DRIFT');
  requireRoot(p.receiptRoot);
  return p;
}
export function prepareSlots(configPath, configSHA256) {
  const ctx = manifest(configPath, configSHA256), { cfg } = ctx;
  components(cfg.fixtureParent); components(dirname(cfg.receiptDir));
  // Both mkdir operations are exclusive. Partial failure is retained, never reused or auto-cleaned.
  mkdirSync(cfg.receiptDir, { mode: 0o700 });
  const receiptRoot = rootIdentity(cfg.receiptDir), roots = [];
  for (const slot of cfg.slots) {
    durable(receipt(ctx, 'intent-' + slot.id), { runId: cfg.runId, slot });
    mkdirSync(slot.path, { mode: 0o700 });
    const root = rootIdentity(slot.path);
    if (readdirSync(slot.path).length) fail('NEW_ROOT_NOT_EMPTY');
    mkdirSync(slot.quarantine, { mode: 0o700 });
    const quarantine = rootIdentity(slot.quarantine);
    if (readdirSync(slot.quarantine).length) fail('NEW_QUARANTINE_NOT_EMPTY');
    durable(receipt(ctx, 'created-' + slot.id), { configSHA256, slot, root, quarantine });
    roots.push({ slot, root, quarantine });
  }
  durable(receipt(ctx, 'prepared'), { runId: cfg.runId, configSHA256, helperSHA256: cfg.helperSHA256, receiptRoot, roots });
  return roots;
}
function optionalContext() {
  const path = process.env.LUCA_EXACT_FIXTURE_CONFIG;
  const digest = process.env.LUCA_EXACT_FIXTURE_CONFIG_SHA256;
  if (!path && !digest) return null;
  if (!path || !digest) fail('OPTIONAL_MODE_INCOMPLETE');
  const key = path + ':' + digest;
  if (!contexts.has(key)) contexts.set(key, manifest(path, digest));
  return contexts.get(key);
}
export function allocateFixtureRoot(defaultPrefix) {
  const ctx = optionalContext();
  if (!ctx) return realpathSync(mkdtempSync(defaultPrefix));
  const p = prepared(ctx);
  for (const entry of p.roots.filter(e => e.slot.defaultPrefix === defaultPrefix)) {
    requireRoot(entry.root);
    if (readdirSync(entry.slot.path).length) {
      if (present(receipt(ctx, 'claim-' + entry.slot.id))) continue;
      fail('UNCLAIMED_ROOT_NOT_EMPTY');
    }
    try {
      durable(receipt(ctx, 'claim-' + entry.slot.id), { configSHA256: ctx.configSHA256, slot: entry.slot, root: entry.root, pid: process.pid });
    } catch (error) { if (error.code === 'EEXIST') continue; throw error; }
    claims.set(entry.slot.path, { ctx, entry });
    return entry.slot.path;
  }
  fail('SLOT_EXHAUSTED_NO_FALLBACK');
}
export function releaseFixtureRoot(path, defaultCleanup) {
  if (!optionalContext()) return defaultCleanup();
  const claim = claims.get(path);
  if (!claim) fail('FOREIGN_RELEASE');
  requireRoot(claim.entry.root);
  // Optional cleanup delegates to the lifecycle owner; it performs no root deletion.
  durable(receipt(claim.ctx, 'release-' + claim.entry.slot.id), { slot: claim.entry.slot.id, pid: process.pid, configSHA256: claim.ctx.configSHA256 });
}
function snapshotRoot(expected, limits) {
  requireRoot(expected);
  const rows = [];
  let totalBytes = 0;
  const walk = path => {
    const id = identity(path);
    if (id.uid !== String(uid())) fail('DESCENDANT_UID');
    if (!['file', 'directory'].includes(id.type)) fail('DESCENDANT_SYMLINK_OR_SPECIAL');
    const row = { path, ...id };
    if (id.type === 'file') { const content = readFileSync(path); totalBytes += content.length; row.sha256 = sha(content); }
    rows.push(row);
    if (rows.length > limits.maxEntries || totalBytes > limits.maxBytes) fail('SUBTREE_LIMIT');
    if (id.type === 'directory') {
      if (realpathSync(path) !== path) fail('DESCENDANT_COMPONENT_DRIFT');
      for (const name of readdirSync(path).sort()) walk(join(path, name));
    }
  };
  walk(expected.path);
  return rows;
}
function requireGone(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) fail('EXIT_PID');
  try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') return; throw error; }
  fail('PROCESS_STILL_LIVE_OR_PID_REUSED');
}
function confirmed(ctx, p, confirmationSHA256) {
  const raw = bytes(ctx.cfg.exitConfirmationPath);
  if (!hash(confirmationSHA256) || sha(raw) !== confirmationSHA256) fail('EXIT_OBSERVATION_HASH_REQUIRED');
  const confirmation = JSON.parse(raw);
  if (!Array.isArray(confirmation.evidence) || confirmation.evidence.length !== ctx.cfg.exitEvidencePaths.length) fail('ACTUAL_EXIT_OBSERVATIONS_REQUIRED');
  for (const path of ctx.cfg.exitEvidencePaths) {
    const evidence = confirmation.evidence.find(e => e.path === path);
    if (!evidence || !hash(evidence.sha256) || sha(bytes(path)) !== evidence.sha256) fail('EXIT_EVIDENCE_DRIFT');
    const observation = readJSON(path);
    if (observation.runId !== ctx.cfg.runId || observation.configSHA256 !== ctx.configSHA256 || observation.exitCode !== 0 ||
      observation.kind !== (ctx.cfg.purpose === 'fullverify' ? 'ACTUAL_TOOL_PROCESS_EXIT_OBSERVATION' : 'SYNTHETIC_LIFECYCLE_REGRESSION_EXIT')) fail('EXIT_EVIDENCE_PROVENANCE');
  }
  if (confirmation.configSHA256 !== ctx.configSHA256 || confirmation.runId !== ctx.cfg.runId ||
    confirmation.allFrozenChildrenExited !== true || confirmation.exclusiveSameUserWindow !== true ||
    !Array.isArray(confirmation.childPids)) fail('CHILD_EXIT_CONFIRMATION_UNBOUND');
  for (const pid of confirmation.childPids) requireGone(pid);
  for (const entry of p.roots) {
    const c = readJSON(receipt(ctx, 'claim-' + entry.slot.id));
    if (c.configSHA256 !== ctx.configSHA256 || !equal(c.root, entry.root) || !equal(c.slot, entry.slot)) fail('CLAIM_DRIFT');
    requireGone(c.pid);
    const exit = readJSON(receipt(ctx, 'exit-' + entry.slot.id));
    if (exit.configSHA256 !== ctx.configSHA256 || exit.pid !== c.pid || exit.code !== 0 || exit.slot !== entry.slot.id) fail('CLAIMER_EXIT_UNCONFIRMED');
  }
}
export function captureSlots(configPath, configSHA256, confirmationSHA256) {
  const ctx = manifest(configPath, configSHA256), p = prepared(ctx);
  confirmed(ctx, p, confirmationSHA256);
  const roots = p.roots.map(entry => ({ ...entry, rows: snapshotRoot(entry.root, ctx.cfg.limits) }));
  const value = { configSHA256, runId: ctx.cfg.runId, roots };
  durable(receipt(ctx, 'captured'), value);
  return sha(bytes(receipt(ctx, 'captured')));
}
export function retireSlots(configPath, configSHA256, capturedSHA256, confirmationSHA256) {
  const ctx = manifest(configPath, configSHA256), p = prepared(ctx);
  confirmed(ctx, p, confirmationSHA256);
  const raw = bytes(receipt(ctx, 'captured'));
  if (!hash(capturedSHA256) || sha(raw) !== capturedSHA256) fail('CAPTURE_DRIFT');
  const saved = JSON.parse(raw);
  if (saved.configSHA256 !== configSHA256 || saved.runId !== ctx.cfg.runId || saved.roots.length !== p.roots.length) fail('CAPTURE_BINDING');
  // Validate ALL subtrees before the first deletion. Unknown state is retained.
  for (const entry of saved.roots) {
    const actual = p.roots.find(e => e.slot.id === entry.slot.id);
    if (!actual || !equal(actual.root, entry.root) || !equal(actual.quarantine, entry.quarantine) || !equal(snapshotRoot(entry.root, ctx.cfg.limits), entry.rows)) fail('DESCENDANT_OR_ROOT_DRIFT');
    requireRoot(entry.quarantine);
    if (readdirSync(entry.slot.quarantine).length) fail('QUARANTINE_NOT_EMPTY');
  }
  durable(receipt(ctx, 'retire-intent'), { configSHA256, capturedSHA256 });
  for (const entry of saved.roots) {
    requireRoot(entry.root); requireRoot(entry.quarantine);
    const target = join(entry.slot.quarantine, 'root');
    if (present(target)) fail('QUARANTINE_TARGET_EXISTS');
    // Rename anchors an inode within our exclusive quarantine. This is not rename-noreplace
    // against a malicious same-UID writer; post-rename drift is retained without deletion.
    renameSync(entry.slot.path, target);
    const anchored = rootIdentity(target);
    if (!equal(identity(target), Object.fromEntries(['dev', 'ino', 'uid', 'mode', 'type'].map(k => [k, entry.root[k]])))) fail('QUARANTINE_ROOT_DRIFT');
    const rows = entry.rows.map(row => ({ ...row, path: target + row.path.slice(entry.slot.path.length) }));
    if (!equal(snapshotRoot(anchored, ctx.cfg.limits), rows)) fail('QUARANTINE_DESCENDANT_DRIFT');
    durable(receipt(ctx, 'quarantined-' + entry.slot.id), { configSHA256, capturedSHA256, anchored });
    for (const row of [...rows].reverse()) {
      requireRoot(entry.quarantine); requireRoot(anchored);
      components(dirname(row.path));
      const id = identity(row.path);
      if (!equal(id, Object.fromEntries(['dev', 'ino', 'uid', 'mode', 'type'].map(k => [k, row[k]])))) fail('RETIRE_IDENTITY_DRIFT');
      if (row.type === 'file') {
        if (sha(readFileSync(row.path)) !== row.sha256) fail('RETIRE_CONTENT_DRIFT');
        unlinkSync(row.path);
      } else rmdirSync(row.path); // Non-recursive: unexpected new entries make this fail.
    }
    requireRoot(entry.quarantine);
    rmdirSync(entry.slot.quarantine);
    durable(receipt(ctx, 'retired-' + entry.slot.id), { slot: entry.slot.id, configSHA256, capturedSHA256 });
  }
  durable(receipt(ctx, 'retired'), { runId: ctx.cfg.runId, configSHA256, capturedSHA256 });
}
process.on('exit', code => {
  for (const ctx of contexts.values()) {
    const slots = [...claims.values()].filter(c => c.ctx === ctx).map(c => c.entry.slot.id);
    for (const slot of slots) durable(receipt(ctx, 'exit-' + slot), { configSHA256: ctx.configSHA256, pid: process.pid, code, slot });
  }
});
if (process.argv[1] && resolve(process.argv[1]) === self) {
  const [operation, path, digest, fourthDigest, fifthDigest] = process.argv.slice(2);
  if (operation === 'prepare') prepareSlots(path, digest);
  else if (operation === 'capture') process.stdout.write(captureSlots(path, digest, fourthDigest) + '\n');
  else if (operation === 'retire') retireSlots(path, digest, fourthDigest, fifthDigest);
  else fail('EXACT_OPERATION_REQUIRED');
}
