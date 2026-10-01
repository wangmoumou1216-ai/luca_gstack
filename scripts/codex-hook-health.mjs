#!/usr/bin/env node
// Read-only preflight. Never installs source, edits registrations, or grants trust.
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import nodeModule from 'node:module';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCE_SCAN, sourceDigest, readSourceApproval } from '../.codex/hook-source-integrity.mjs';
import { approvedJavaScript, snapshotSourceInventory, sourceInventory, snapshotInventory, equalArtifact } from './source-guard-review.mjs';
export { SOURCE_SCAN, sourceDigest } from '../.codex/hook-source-integrity.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const DIGEST = /^[a-f0-9]{64}$/;
// Keep the registered shell's byte ordering, filename escaping and pipefail semantics.
// This is a fixed program: never execute command text read from hooks.json.
const GATE_START = `cd "$(git rev-parse --show-toplevel)" || exit 2; ${SOURCE_SCAN}; case "$h" in `;
// Pin the reviewed registration protocol independently of hooks.json. Only the
// source digest varies; event/group order, matchers, full launch/recovery text,
// timeouts and context limits must remain reviewed. Description is presentation.
// Intentional protocol changes require reviewing and updating this pin together.
const LEGACY_REGISTRATION_CONTRACT = '0d3e966d491751a1e45ce6a29fc62fd850981ba972393b81fdf51be989cbd50a';
const STABLE_REGISTRATION_CONTRACT = '217d8a0116f375282aa67e0b59415e3ca742b42bc24685082c2b17fcb7635189';
const NATIVE_REGISTRATION_CONTRACT = '4045d37a195d19ab5a3f437f83cf500b24cd41868cf563b5f01790dc6945f476';
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

function fileBytes(path, privateFile = false) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(path) !== path
      || stat.size > 64 * 1024 * 1024
      || (privateFile && (stat.uid !== process.getuid() || (stat.mode & 0o077)))) {
    throw new Error(`unsafe file: ${path}`);
  }
  return readFileSync(path);
}
function privateDir(path) {
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(path) !== path
      || stat.uid !== process.getuid() || (stat.mode & 0o077)) throw new Error(`unsafe directory: ${path}`);
}
function snapshotDrift(source, snapshot, label, changed) {
  privateDir(snapshot);
  const names = folder => readdirSync(folder).filter(name => name !== '__pycache__' && !name.endsWith('.pyc')).sort();
  const sourceNames = names(source), snapshotNames = names(snapshot);
  for (const name of new Set([...sourceNames, ...snapshotNames])) {
    const rel = `${label}/${name}`, from = join(source, name), to = join(snapshot, name);
    if (!sourceNames.includes(name) || !snapshotNames.includes(name)) { changed.push(rel); continue; }
    const stat = lstatSync(from);
    if (stat.isDirectory() && !stat.isSymbolicLink()) snapshotDrift(from, to, rel, changed);
    else if (!fileBytes(from).equals(fileBytes(to, true))) changed.push(rel);
  }
}
function keys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === expected.sort().join(',');
}
function javaScriptFormat(root, name) {
  if (name.endsWith('.mjs')) return 'module';
  // The loader uses the installer-approved format. Recompute the installer's
  // nearest package rule so valid-looking but corrupt metadata cannot pass.
  for (let folder = dirname(join(root, name));; folder = dirname(folder)) {
    const path = join(folder, 'package.json');
    if (existsSync(path)) return JSON.parse(fileBytes(path)).type === 'module' ? 'module' : 'commonjs';
    if (folder === root) return 'commonjs';
  }
}
function javaScriptFiles(root) {
  // Match install-codex-source-guard.mjs: approvals cover the entire physical
  // repository, not just the four directories covered by the shell digest.
  const files = [], skip = new Set(['.git', 'node_modules', '__pycache__']);
  let visited = 0;
  function scan(folder) {
    if (++visited > 20000) throw new Error('too many source directories');
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const path = join(folder, entry.name);
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) scan(path);
      } else if (entry.isFile() && /\.(?:mjs|js)$/.test(entry.name)) {
        files.push(relative(root, path).split('\\').join('/'));
        if (files.length > 10000) throw new Error('too many JavaScript sources');
      }
    }
  }
  scan(root);
  return files.sort();
}
export function inspectHookHealth(root, { sourceOnly = false,
  guardRoot = join(homedir(), '.codex', 'luca-child-project', 'source-guard') } = {}) {
  root = resolve(root);
  const report = { schema_version: 1, root, scope: sourceOnly ? 'registration-source' : 'registration-source-installation',
    ok: false, registration: { status: 'FAIL', problems: [] },
    approval: { status: 'NOT_CHECKED', problems: [], reason: 'source-only scan cannot establish approved installation or grant trust' },
    installation: { status: 'NOT_CHECKED', problems: [], changed_files: [] },
    live_session: 'UNVERIFIED: a fresh process cannot attest the commands cached by an existing session' };
  try {
    if (realpathSync(root) !== root) throw new Error('source root must be canonical');
    const bytes = fileBytes(join(root, '.codex', 'hooks.json'));
    report.registration.config_sha256 = sha(bytes);
    const config = JSON.parse(bytes);
    if (!keys(config, ['description', 'hooks']) || typeof config.description !== 'string') throw new Error('invalid registration config keys');
    if (!config.hooks || typeof config.hooks !== 'object' || Array.isArray(config.hooks)) throw new Error('invalid hooks object');
    const commands = Object.values(config.hooks).flatMap(groups => {
      if (!Array.isArray(groups)) throw new Error('invalid groups');
      return groups.flatMap(group => {
        if (!Array.isArray(group.hooks) || !group.hooks.length) throw new Error('empty hook group');
        return group.hooks.map(hook => {
          if (hook.type !== 'command' || typeof hook.command !== 'string') throw new Error('unrecognized source gate');
          return hook.command;
        });
      });
    });
    if (commands.length !== 11) throw new Error(`expected 11 registrations, found ${commands.length}`);
    const fullContract = sha(JSON.stringify(canonical(config.hooks)));
    const digests = [];
    if (fullContract === NATIVE_REGISTRATION_CONTRACT) {
      report.registration.protocol = 'native-trust-v1';
      report.registration.contract_sha256 = fullContract;
      report.registration.trust_owner = 'Codex native trusted command';
    } else if (fullContract === STABLE_REGISTRATION_CONTRACT) {
      report.registration.protocol = 'stable-v3';
      report.registration.contract_sha256 = fullContract;
    } else {
      const normalized = structuredClone(config.hooks);
      for (const command of commands) {
        if (!command.startsWith(GATE_START)) throw new Error('REGISTRATION_CONTRACT_MISMATCH: unrecognized source gate');
        const match = command.slice(GATE_START.length).match(/^([a-f0-9]{64})\) ;; \*\) echo "\[luca_gstack\] hook source integrity mismatch" >&2;/);
        if (!match) throw new Error('invalid digest gate');
        digests.push(match[1]);
      }
      for (const groups of Object.values(normalized)) for (const group of groups) for (const hook of group.hooks) {
        hook.command = hook.command.replace(/case "\$h" in [a-f0-9]{64}/, 'case "$h" in SOURCE_DIGEST');
      }
      report.registration.contract_sha256 = sha(JSON.stringify(canonical(normalized)));
      if (report.registration.contract_sha256 !== LEGACY_REGISTRATION_CONTRACT) {
        throw new Error('REGISTRATION_CONTRACT_MISMATCH: event, matcher or complete command differs from the reviewed protocol');
      }
      report.registration.protocol = 'legacy-literal';
      report.registration.expected_digests = [...new Set(digests)];
    }
    report.registration.hook_count = commands.length;
    if (report.registration.protocol !== 'native-trust-v1') report.registration.current_digest = sourceDigest(root);
    if (digests.some(digest => digest !== report.registration.current_digest)) {
      throw new Error('SOURCE_DIGEST_MISMATCH: registered commands do not match current source; restarting alone cannot repair this');
    }
    report.registration.status = 'PASS';
  } catch (error) { report.registration.problems.push(error.message); }

  if (report.registration.protocol === 'native-trust-v1') {
    report.scope = 'registration-native-trust';
    report.approval = { status: 'NOT_APPLICABLE', problems: [],
      reason: 'native-trust-v1 does not require workspace source approval' };
    report.installation = { status: 'NOT_REQUIRED', problems: [], changed_files: [],
      reason: 'source guard is optional and is not a default Hook prerequisite' };
    report.native_trust = { status: 'NOT_CHECKED', owner: 'Codex hooks/list and config/batchWrite',
      reason: 'registration health does not attest native trust; use the official exact-command trust readback' };
    report.optional_source_guard = { status: 'NOT_CHECKED',
      manifest_present: existsSync(join(guardRoot, 'manifest.json')) };
    report.ok = report.registration.status === 'PASS';
    return report;
  }

  if (!sourceOnly) {
    const installation = report.installation;
    installation.status = 'FAIL';
    try {
      installation.runtime = { node_version: process.version,
        synchronous_loader_supported: typeof nodeModule.registerHooks === 'function' };
      if (!installation.runtime.synchronous_loader_supported) throw new Error('RUNTIME_CAPABILITY_MISSING: Node cannot run the protected synchronous source loader');
      if (report.registration.protocol === 'stable-v3') {
        report.approval.status = 'FAIL';
        delete report.approval.reason;
        const approved = readSourceApproval(root, { guardRoot });
        report.approval.sha256 = approved.approval.sha256;
        report.approval.artifact_sha256 = approved.approval.artifact_sha256;
        installation.manifest_sha256 = approved.manifestSha256;
        const current = report.registration.current_digest ?? sourceDigest(root);
        if (current !== approved.approval.sha256) {
          report.registration.status = 'FAIL';
          report.registration.problems.push('SOURCE_DIGEST_MISMATCH: current source differs from protected approval');
        }
        const js = approvedJavaScript(root);
        installation.changed_files = Object.keys(approved.entry.files).filter(name => js[name]?.sha256 !== approved.entry.files[name].sha256);
        installation.unapproved_files = Object.keys(js).filter(name => !Object.hasOwn(approved.entry.files, name));
        installation.format_changed_files = Object.keys(approved.entry.files).filter(name => js[name] && js[name].format !== approved.entry.files[name].format);
        const expectedSnapshot = approved.row.snapshot_files, actualSnapshot = snapshotInventory(approved.snapshotRoot, { excludeMetadata: true });
        const liveSnapshot = snapshotSourceInventory(root);
        installation.snapshot_changed_files = [...new Set([...Object.keys(expectedSnapshot), ...Object.keys(liveSnapshot), ...Object.keys(actualSnapshot)])]
          .filter(name => expectedSnapshot[name] !== liveSnapshot[name] || expectedSnapshot[name] !== actualSnapshot[name]);
        const inventory = sourceInventory(root);
        if (sha(fileBytes(join(root, '.codex/hooks.json'))) !== approved.row.hooks_sha256) throw new Error('INSTALLED_REGISTRATION_MISMATCH: hooks.json differs from reviewed artifact');
        if (installation.changed_files.length || installation.unapproved_files.length) throw new Error('INSTALLED_SOURCE_MISMATCH: reviewed manifest differs from workspace JavaScript');
        if (installation.format_changed_files.length) throw new Error('INSTALLED_FORMAT_MISMATCH: reviewed formats differ from package rules');
        if (installation.snapshot_changed_files.length) throw new Error('INSTALLED_SNAPSHOT_MISMATCH: source or protected snapshot differs from reviewed artifact');
        if (current !== approved.approval.sha256 || !equalArtifact(inventory, approved.row.source_files)) throw new Error('SOURCE_DIGEST_MISMATCH: source inventory differs from reviewed artifact');
        report.approval.status = 'PASS';
      } else {
        report.approval.status = 'NOT_APPLICABLE';
        report.approval.reason = 'legacy literal digest uses the existing protected installation contract';
      // Validate the protected path and schema without launching workspace hooks.
      if (guardRoot === join(homedir(), '.codex', 'luca-child-project', 'source-guard')) {
        const home = lstatSync(homedir());
        if (!home.isDirectory() || home.uid !== process.getuid() || (home.mode & 0o022)) throw new Error('unsafe user home');
        privateDir(join(homedir(), '.codex'));
      }
      privateDir(dirname(guardRoot)); privateDir(guardRoot); privateDir(join(guardRoot, 'roots'));
      const bytes = fileBytes(join(guardRoot, 'manifest.json'), true);
      installation.manifest_sha256 = sha(bytes);
      const manifest = JSON.parse(bytes);
      if (!keys(manifest, ['schema_version', 'loader_sha256', 'roots']) || manifest.schema_version !== 1
          || !DIGEST.test(manifest.loader_sha256) || !Array.isArray(manifest.roots) || !manifest.roots.length) {
        throw new Error('invalid installed manifest');
      }
      const seen = new Set();
      for (const row of manifest.roots) {
        if (!keys(row, ['root', 'snapshot', 'files']) || typeof row.root !== 'string'
            || !isAbsolute(row.root) || resolve(row.root) !== row.root || seen.has(row.root)
            || typeof row.snapshot !== 'string' || !/^[a-f0-9]{64}-[a-f0-9-]{36}$/.test(row.snapshot)
            || row.snapshot.slice(0, 64) !== sha(row.root) || !row.files || typeof row.files !== 'object'
            || Array.isArray(row.files)) throw new Error('invalid installed root');
        seen.add(row.root);
        for (const [name, approval] of Object.entries(row.files)) {
          if (!name || isAbsolute(name) || name.includes('\\') || name.split('/').some(part => !part || part === '.' || part === '..')
              || !/\.(?:mjs|js)$/.test(name) || !keys(approval, ['sha256', 'format'])
              || !DIGEST.test(approval.sha256) || !['module', 'commonjs'].includes(approval.format)) throw new Error('invalid installed file approval');
        }
      }
      const entry = manifest.roots.find(row => row.root === root);
      if (!entry) throw new Error('SOURCE_ROOT_NOT_INSTALLED');
      const snapshotRoot = join(guardRoot, 'roots', entry.snapshot);
      privateDir(snapshotRoot);
      for (const name of ['bootstrap', 'loader']) {
        const installed = fileBytes(join(guardRoot, `${name}.mjs`), true);
        if (!installed.equals(fileBytes(join(root, '.codex', `codex-source-guard-${name}.mjs`)))) throw new Error(`INSTALLED_RUNTIME_MISMATCH: ${name}`);
        if (name === 'loader' && sha(installed) !== manifest.loader_sha256) throw new Error('installed loader hash mismatch');
      }
      installation.format_changed_files = [];
      for (const [name, approval] of Object.entries(entry.files)) {
        try {
          if (sha(fileBytes(join(root, name))) !== approval.sha256) installation.changed_files.push(name);
          if (approval.format !== javaScriptFormat(root, name)) installation.format_changed_files.push(name);
        }
        catch { installation.changed_files.push(name); }
      }
      installation.unapproved_files = javaScriptFiles(root).filter(name => !Object.hasOwn(entry.files, name));
      if (installation.changed_files.length || installation.unapproved_files.length) throw new Error('INSTALLED_SOURCE_MISMATCH: reviewed manifest differs from workspace JavaScript');
      if (installation.format_changed_files.length) throw new Error('INSTALLED_FORMAT_MISMATCH: reviewed module formats differ from source extension or package rules');
      installation.snapshot_changed_files = [];
      for (const name of ['memory/scripts', '.claude/skill-os', '.claude/skills/office', '.claude/agents']) {
        snapshotDrift(join(root, name), join(snapshotRoot, name), name, installation.snapshot_changed_files);
      }
      if (!fileBytes(join(root, 'CLAUDE.md')).equals(fileBytes(join(snapshotRoot, 'CLAUDE.md'), true))) installation.snapshot_changed_files.push('CLAUDE.md');
      if (installation.snapshot_changed_files.length) throw new Error('INSTALLED_SNAPSHOT_MISMATCH: protected Python or policy snapshot differs from workspace');
      // The emergency Stop path imports these protected copies directly. A
      // healthy live tree cannot establish that the fallback copies still work.
      installation.recovery_changed_files = [];
      if (Object.hasOwn(entry.files, '.codex/stop-integrity-failure.mjs')) {
        for (const name of ['.codex/stop-integrity-failure.mjs',
          '.claude/hooks/lib/project-substrate.mjs', '.claude/hooks/lib/event-attestation.mjs',
          '.claude/hooks/lib/project-selection.mjs', '.claude/hooks/lib/project-event-closure.mjs']) {
          try {
            if (!fileBytes(join(root, name)).equals(fileBytes(join(snapshotRoot, name), true))) installation.recovery_changed_files.push(name);
          } catch { installation.recovery_changed_files.push(name); }
        }
      }
      if (installation.recovery_changed_files.length) throw new Error('INSTALLED_RECOVERY_MISMATCH: protected Stop recovery source is missing or changed');
      }
      installation.status = 'PASS';
    } catch (error) { installation.problems.push(error.message); if (report.approval.status === 'FAIL') report.approval.problems.push(error.message); }
  }
  report.ok = report.registration.status === 'PASS' && (sourceOnly || report.installation.status === 'PASS');
  return report;
}
export function assertHookHealth(root) {
  const report = inspectHookHealth(root);
  if (!report.ok) throw new Error(`[hook health] ${JSON.stringify(report)}\nReview source, registration and protected installation before granting trust. No automatic repair was performed.`);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--json', '--source-only'].includes(arg)) || new Set(args).size !== args.length) {
    process.stderr.write('Usage: node scripts/codex-hook-health.mjs [--json] [--source-only]\n');
    process.exitCode = 2;
  } else {
    const report = inspectHookHealth(resolve(dirname(fileURLToPath(import.meta.url)), '..'), { sourceOnly: args.includes('--source-only') });
    process.stdout.write(`${JSON.stringify(report, null, args.includes('--json') ? 0 : 2)}\n`);
    process.exitCode = report.ok ? 0 : 1;
  }
}
