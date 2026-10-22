#!/usr/bin/env node
// A supported-publication gate, not a Git server policy. The consumer is an
// explicitly configured local application; no product path is owned here.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const REQUIRED_INPUTS = ['.codex/hooks.json', 'scripts/codex-hook-contract.mjs',
  'scripts/lib/codex-hook-contract.mjs', 'scripts/codex-hook-health.mjs',
  '.codex/hook-source-integrity.mjs', 'scripts/source-guard-review.mjs',
  'scripts/fixtures/codex-hook-contract/native-071.json',
  'scripts/fixtures/codex-hook-contract/native-c6.json'];
const TRIGGERS = [...REQUIRED_INPUTS, 'scripts/fixtures/codex-hook-contract',
  '.codex/hook-source-integrity.mjs', 'scripts/source-guard-review.mjs',
  'scripts/check-codex-hook-consumer.mjs', '.githooks/pre-push'];
const MODES = ['direct', 'sidecar', 'system'];
const ZERO = /^(?:0{40}|0{64})$/;
const OID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const HASH = /^[a-f0-9]{64}$/;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// Git injects repository-location variables into hooks. The consumer itself
// creates private Git fixtures; none may accidentally address the pushed repo.
const cleanEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
const problem = (code, detail) => Object.assign(new Error(code), { code, detail });
const MESSAGES = {
  CONSUMER_CONFIG_GAP: 'Set local luca.hookConsumerAppRoot and luca.hookConsumerBundle to the reviewed App directory and actual candidate/installed .app.',
  CONSUMER_ASSET_GAP: 'The configured consumer driver or actual .app/Contents/Resources/app.asar is missing or unsafe. Build/install the compatible candidate first.',
  FRAMEWORK_SOURCE_MISMATCH: 'The checked-out contract inputs differ from this pushed commit. Use a checkout of that exact commit or push the refs separately; dirty bytes cannot certify another commit.',
  CONSUMER_REJECTED: 'The actual bundle compatibility gate failed. Resolve its code/GAP before publishing this hook change.',
  CONSUMER_REPORT_INVALID: 'The consumer did not return complete, commit-bound evidence for the actual bundle, framework and six required native tuples.',
  PUSH_INPUT_INVALID: 'Expected Git pre-push local-ref/local-object/remote-ref/remote-object tuples on stdin.',
  PUSH_OBJECT_UNAVAILABLE: 'A pushed object is missing or is not a commit (including annotated commit tags).',
  GIT_READ_FAILED: 'Git could not read the exact publication inputs; no network fetch or fallback was attempted.',
};

function git(root, args, allowMissing = false) {
  const result = spawnSync('git', ['-C', root, ...args], {
    shell: false, env: cleanEnv(), encoding: null, timeout: 15000, maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || result.signal || (result.status !== 0 && !allowMissing)) throw problem('GIT_READ_FAILED');
  return result.status === 0 ? result.stdout : null;
}
function directory(value) {
  if (typeof value !== 'string' || !isAbsolute(value) || resolve(value) !== value || realpathSync(value) !== value
      || !lstatSync(value).isDirectory()) throw problem('CONSUMER_ASSET_GAP');
  return value;
}
function file(path, limit = 2 * 1024 * 1024) {
  const before = lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink() || realpathSync(path) !== path || before.size > limit) throw problem('CONSUMER_ASSET_GAP');
  const bytes = readFileSync(path), after = lstatSync(path);
  const identity = stat => ({ dev: stat.dev, ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs });
  if (JSON.stringify(identity(before)) !== JSON.stringify(identity(after))) throw problem('CONSUMER_ASSET_GAP');
  return { sha256: sha(bytes), ...identity(before) };
}
function commit(root, oid) {
  const value = git(root, ['rev-parse', '--verify', `${oid}^{commit}`], true)?.toString().trim();
  if (!value || !OID.test(value)) throw problem('PUSH_OBJECT_UNAVAILABLE');
  return value;
}
function config(root, key) {
  const value = git(root, ['config', '--local', '--no-includes', '--get', key], true)?.toString().trim();
  if (!value) throw problem('CONSUMER_CONFIG_GAP');
  return value;
}
function consumerAssets(root) {
  const appRoot = config(root, 'luca.hookConsumerAppRoot');
  const bundle = config(root, 'luca.hookConsumerBundle');
  try {
    directory(appRoot); directory(bundle);
    if (!bundle.endsWith('.app')) throw problem('CONSUMER_ASSET_GAP');
    const driver = join(appRoot, 'hook-compatibility-gate.mjs');
    const archive = join(bundle, 'Contents/Resources/app.asar');
    return { appRoot, bundle, driver, archive, driverIdentity: file(driver), archiveIdentity: file(archive, 1024 * 1024 * 1024) };
  } catch { throw problem('CONSUMER_ASSET_GAP'); }
}

export function parsePushUpdates(input) {
  if (typeof input !== 'string' || Buffer.byteLength(input) > 64 * 1024) throw problem('PUSH_INPUT_INVALID');
  const lines = input.split('\n').filter(line => line.trim());
  if (lines.length > 128) throw problem('PUSH_INPUT_INVALID');
  return lines.map(line => {
    const fields = line.trim().split(/\s+/);
    if (fields.length !== 4 || fields.some(value => /[\x00-\x20\x7f]/.test(value))
        || !OID.test(fields[1]) || !OID.test(fields[3]) || !fields[2].startsWith('refs/')) throw problem('PUSH_INPUT_INVALID');
    const [localRef, localOid, remoteRef, remoteOid] = fields;
    return { localRef, localOid, remoteRef, remoteOid };
  });
}

export function inspectPushUpdates(root, input) {
  return parsePushUpdates(input).map(update => {
    if (ZERO.test(update.localOid)) return { ...update, state: 'DELETED', required: false };
    const localCommit = commit(root, update.localOid);
    if (update.localOid === update.remoteOid) return { ...update, localCommit, state: 'UNCHANGED', required: false };
    let changed, baseline = 'INITIAL';
    if (ZERO.test(update.remoteOid)) {
      changed = git(root, ['ls-tree', '-r', '--name-only', '-z', localCommit, '--', ...TRIGGERS]);
    } else {
      const remoteCommit = git(root, ['rev-parse', '--verify', `${update.remoteOid}^{commit}`], true)?.toString().trim();
      if (!remoteCommit || !OID.test(remoteCommit)) return { ...update, localCommit, state: 'BASELINE_UNAVAILABLE', required: true };
      baseline = remoteCommit;
      changed = git(root, ['diff', '--no-ext-diff', '--no-renames', '--name-only', '-z', remoteCommit, localCommit, '--', ...TRIGGERS]);
    }
    const changedInputs = changed.toString().split('\0').filter(Boolean);
    return { ...update, localCommit, baseline, changedInputs, required: changedInputs.length > 0,
      state: changedInputs.length ? 'CONSUMER_REQUIRED' : 'UNRELATED' };
  });
}

function committedHash(root, oid, name) {
  if (typeof name !== 'string' || !name || isAbsolute(name) || name.split('/').some(part => !part || part === '.' || part === '..')) throw problem('CONSUMER_REPORT_INVALID');
  const entry = git(root, ['ls-tree', '-z', oid, '--', name])?.toString();
  // A symlink or submodule must never be executed as a contract input.
  if (!entry || !/^100(?:644|755) blob [a-f0-9]+\t/.test(entry) || entry.split('\t')[1] !== `${name}\0`) {
    throw problem('FRAMEWORK_SOURCE_MISMATCH', name);
  }
  return sha(git(root, ['cat-file', 'blob', `${oid}:${name}`]));
}
function bindInputs(root, oid, names) {
  const bound = {};
  for (const name of names) {
    try {
      const current = file(join(root, name));
      if (current.sha256 !== committedHash(root, oid, name)) throw problem('FRAMEWORK_SOURCE_MISMATCH', name);
      bound[name] = current;
    } catch (error) {
      if (error.code === 'GIT_READ_FAILED') throw error;
      throw problem('FRAMEWORK_SOURCE_MISMATCH', name);
    }
  }
  return bound;
}
function runConsumer(root, assets) {
  const result = spawnSync(process.execPath, [assets.driver, assets.bundle, '--framework-root', root], {
    cwd: assets.appRoot, shell: false, env: { ...cleanEnv(), ELECTRON_RUN_AS_NODE: '1' },
    encoding: 'utf8', timeout: 240000, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let report;
  try { report = JSON.parse(result.stdout); } catch {}
  if (result.error || result.signal || result.status !== 0 || report?.ok !== true) {
    throw problem('CONSUMER_REJECTED', /^[A-Z_]+$/.test(report?.code || '') ? report.code : 'CONSUMER_PROCESS_FAILED');
  }
  return report;
}
function verifyReport(root, oid, assets, report) {
  if (report.schemaVersion !== 1 || report.framework?.canonicalPath !== root
      || report.app?.appPath !== assets.bundle || report.app?.archive?.canonicalPath !== assets.archive
      || report.app?.archive?.sha256 !== assets.archiveIdentity.sha256
      || !report.framework.files || Array.isArray(report.framework.files)
      || !Array.isArray(report.modes) || report.modes.some(row => !row || typeof row !== 'object')
      || report.modes.map(row => row.mode).sort().join(',') !== MODES.join(',')
      || !Array.isArray(report.tuples) || report.tuples.some(row => !row || typeof row !== 'object')
      || report.tuples.length !== 6) throw problem('CONSUMER_REPORT_INVALID');
  const tuples = new Set(report.tuples.map(row => `${row.mode}:${row.initial}:${row.status}`));
  if (tuples.size !== 6 || MODES.some(mode => ['fresh', 'legacy071'].some(initial => !tuples.has(`${mode}:${initial}:PASS`)))) throw problem('CONSUMER_REPORT_INVALID');
  const expected = REQUIRED_INPUTS.filter(name => !['scripts/codex-hook-health.mjs',
    '.codex/hook-source-integrity.mjs', 'scripts/source-guard-review.mjs'].includes(name));
  if (expected.some(name => !Object.hasOwn(report.framework.files, name))) throw problem('CONSUMER_REPORT_INVALID');
  for (const [name, identity] of Object.entries(report.framework.files)) {
    if (!identity || identity.canonicalPath !== join(root, name) || !HASH.test(identity.sha256 || '')
        || identity.sha256 !== committedHash(root, oid, name)) throw problem('CONSUMER_REPORT_INVALID');
  }
}

/** Read-only repository/config access; the fixed consumer probes private scratch. */
export function checkCodexHookConsumer({ root, input, remoteName = null }) {
  const report = { schemaVersion: 1, ok: false, state: 'BLOCKED', remoteName, updates: [], checks: [] };
  try {
    directory(root);
    if (git(root, ['rev-parse', '--show-toplevel']).toString().trim() !== root) throw problem('GIT_READ_FAILED');
    report.updates = inspectPushUpdates(root, input);
    const commits = [...new Set(report.updates.filter(update => update.required).map(update => update.localCommit))];
    if (!commits.length) return { ...report, ok: true, state: 'NOT_REQUIRED' };
    const assets = consumerAssets(root);
    for (const oid of commits) {
      const before = bindInputs(root, oid, REQUIRED_INPUTS);
      const consumer = runConsumer(root, assets);
      verifyReport(root, oid, assets, consumer);
      if (JSON.stringify(before) !== JSON.stringify(bindInputs(root, oid, REQUIRED_INPUTS))) throw problem('FRAMEWORK_SOURCE_MISMATCH');
      if (JSON.stringify(assets.driverIdentity) !== JSON.stringify(file(assets.driver))
          || JSON.stringify(assets.archiveIdentity) !== JSON.stringify(file(assets.archive, 1024 * 1024 * 1024))) throw problem('CONSUMER_ASSET_GAP');
      report.checks.push({ commit: oid, frameworkFiles: Object.fromEntries(Object.entries(before).map(([name, row]) => [name, row.sha256])),
        driverSha256: assets.driverIdentity.sha256, consumer });
    }
    return { ...report, ok: true, state: 'PASS' };
  } catch (error) {
    const code = Object.hasOwn(MESSAGES, error.code) ? error.code : 'CONSUMER_ASSET_GAP';
    return { ...report, code, state: code.endsWith('_GAP') || error.detail?.endsWith('_GAP') ? 'GAP' : 'BLOCKED', message: MESSAGES[code],
      ...(error.detail ? { detail: error.detail } : {}) };
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) {
  let output;
  try {
    const [mode, remoteName, remoteLocation, ...extra] = process.argv.slice(2);
    if (mode !== '--pre-push' || !remoteName || !remoteLocation || extra.length) throw problem('PUSH_INPUT_INVALID');
    const root = realpathSync(git(process.cwd(), ['rev-parse', '--show-toplevel']).toString().trim());
    output = checkCodexHookConsumer({ root, input: readFileSync(0, 'utf8'), remoteName });
  } catch (error) {
    const code = Object.hasOwn(MESSAGES, error.code) ? error.code : 'PUSH_INPUT_INVALID';
    output = { schemaVersion: 1, ok: false, state: 'BLOCKED', code, message: MESSAGES[code] };
  }
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exitCode = output.ok ? 0 : 1;
}
