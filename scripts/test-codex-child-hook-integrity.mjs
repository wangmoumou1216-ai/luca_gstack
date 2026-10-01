#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync,
  symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installTestSourceGuard } from './source-guard-test-fixture.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, '.codex/hooks.json')));
const entries = Object.entries(config.hooks).flatMap(([event, groups]) => groups.flatMap(group => group.hooks.map(hook => ({event, command: hook.command}))));
const native = entries.filter(entry => entry.command.includes('model-route-hook.mjs'));
assert.equal(native.length, 5); assert.equal(new Set(native.map(entry => entry.command)).size, 1);
const base = realpathSync(mkdtempSync(join(tmpdir(), 'codex-child-hook-')));
const fixture = join(base, 'repo'), home = join(base, 'home');
mkdirSync(fixture); mkdirSync(home, { mode: 0o700 });
const guardRoot = join(home, '.codex/luca-child-project/source-guard');
mkdirSync(dirname(guardRoot), { recursive: true, mode: 0o700 });
const env = { ...process.env, HOME: home, NODE_ENV: 'test', NODE_OPTIONS: '', LUCA_SOURCE_GUARD_TEST_ROOT: guardRoot };
try {
  assert.equal(spawnSync('git', ['init', '-q', fixture]).status, 0);
  for (const folder of ['.codex', '.claude/hooks', 'scripts', 'memory/scripts', '.claude/skill-os', '.claude/skills/office', '.claude/agents']) cpSync(join(root, folder), join(fixture, folder), { recursive: true });
  cpSync(join(root, 'CLAUDE.md'), join(fixture, 'CLAUDE.md'));
  const installed = installTestSourceGuard({ roots: [fixture], destination: guardRoot, directory: base });
  assert.equal(installed.status, 0, installed.stderr);
  const payload = JSON.stringify({ hook_event_name: 'Stop', cwd: fixture, session_id: 'integrity-probe' });
  const run = (entry, extra = {}) => spawnSync('/bin/sh', ['-c', entry.command], { cwd: fixture, encoding: 'utf8', input: payload,
    timeout: 15000, env: { ...env, ...extra } });
  const valid = run(native[0]); assert.equal(valid.status, 0, valid.stderr);
  const stop = entries.find(entry => entry.event === 'Stop');
  const deny = (label, all = false, extra = {}) => {
    for (const entry of all ? entries : [native[0], stop]) {
      const result = run(entry, extra);
      assert.equal(result.error, undefined, `${label}: ${result.error}`);
      assert.equal(result.status, entry.event === 'Stop' ? 0 : 2, `${label}/${entry.event}: ${result.stderr}`);
      if (entry.event === 'Stop') assert.equal(JSON.parse(result.stdout).continue, false, label);
    }
  };
  const manifestPath = join(guardRoot, 'manifest.json'), manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes), snapshot = join(guardRoot, 'roots', manifest.roots[0].snapshot);
  const approvalPath = join(snapshot, '.codex/hook-source-approval.json'), approvalBytes = readFileSync(approvalPath);
  const approval = JSON.parse(approvalBytes), artifactPath = join(snapshot, '.codex/reviewed-install.json'), artifactBytes = readFileSync(artifactPath);
  for (const mutation of ['missing', 'json', 'mode', 'symlink', 'unknown', 'root', 'algorithm', 'sha', 'artifact-sha', 'array-hash']) {
    if (mutation === 'missing') rmSync(approvalPath);
    else if (mutation === 'json') writeFileSync(approvalPath, '{bad');
    else if (mutation === 'mode') chmodSync(approvalPath, 0o644);
    else if (mutation === 'symlink') { rmSync(approvalPath); const fake = join(base, 'fake-approval.json'); writeFileSync(fake, approvalBytes, {mode:0o600}); symlinkSync(fake, approvalPath); }
    else {
      const changed = {...approval};
      if (mutation === 'unknown') changed.unreviewed = true;
      if (mutation === 'root') changed.root = base;
      if (mutation === 'algorithm') changed.algorithm = 'environment-says-approved';
      if (mutation === 'sha') changed.sha256 = 'invalid';
      if (mutation === 'artifact-sha') changed.artifact_sha256 = 'a'.repeat(64);
      if (mutation === 'array-hash') changed.sha256 = [approval.sha256];
      writeFileSync(approvalPath, JSON.stringify(changed));
    }
    deny(`approval ${mutation}`);
    rmSync(approvalPath, {force:true}); writeFileSync(approvalPath, approvalBytes, {mode:0o600});
  }
  for (const mutation of ['missing', 'json', 'bytes', 'mode', 'unknown-artifact', 'wrong-row-files', 'wrong-source-files', 'array-digest']) {
    if (mutation === 'missing') rmSync(artifactPath);
    else if (mutation === 'json') writeFileSync(artifactPath, '{bad');
    else if (mutation === 'bytes') writeFileSync(artifactPath, '{}');
    else if (mutation === 'mode') chmodSync(artifactPath, 0o644);
    else {
      // A forged associated SHA still cannot make malformed content a valid review.
      const changed = JSON.parse(artifactBytes);
      if (mutation === 'unknown-artifact') changed.extra = true;
      if (mutation === 'wrong-row-files') changed.roots[0].files['.codex/hook-source-integrity.mjs'].sha256 = 'a'.repeat(64);
      if (mutation === 'wrong-source-files') changed.roots[0].source_files['../outside.sh'] = 'a'.repeat(64);
      if (mutation === 'array-digest') changed.roots[0].hooks_sha256 = [changed.roots[0].hooks_sha256];
      const bytes = Buffer.from(JSON.stringify(changed)); writeFileSync(artifactPath, bytes);
      const {createHash} = await import('node:crypto');
      writeFileSync(approvalPath, JSON.stringify({...approval,artifact_sha256:createHash('sha256').update(bytes).digest('hex')}));
    }
    deny(`artifact ${mutation}`);
    rmSync(artifactPath, {force:true}); writeFileSync(artifactPath, artifactBytes, {mode:0o600}); writeFileSync(approvalPath, approvalBytes, {mode:0o600});
  }
  for (const mutation of ['duplicate', 'unknown', 'root-hash', 'traversal', 'files']) {
    const changed = structuredClone(manifest);
    if (mutation === 'duplicate') changed.roots.push(changed.roots[0]);
    if (mutation === 'unknown') changed.extra = true;
    if (mutation === 'root-hash') changed.roots[0].snapshot = `a${changed.roots[0].snapshot.slice(1)}`;
    if (mutation === 'traversal') changed.roots[0].snapshot = '../snapshot';
    if (mutation === 'files') changed.roots[0].files['.codex/model-route-hook.mjs'].format = 'commonjs';
    writeFileSync(manifestPath, JSON.stringify(changed)); deny(`manifest ${mutation}`); writeFileSync(manifestPath, manifestBytes);
  }
  for (const name of ['bootstrap.mjs', 'loader.mjs']) {
    const path = join(guardRoot, name), bytes = readFileSync(path);
    writeFileSync(path, 'throw new Error("broken protected runtime");\n'); deny(name, true); writeFileSync(path, bytes);
  }
  chmodSync(join(snapshot, '.codex'), 0o755); deny('wide snapshot metadata directory'); chmodSync(join(snapshot, '.codex'), 0o700);
  for (const target of ['.codex/hook-source-integrity.mjs', '.codex/codex-hook-adapter.mjs', '.claude/hooks/lib/codex-child-project.mjs']) {
    const path = join(fixture, target), bytes = readFileSync(path); writeFileSync(path, Buffer.concat([bytes, Buffer.from('\n// unapproved\n')])); deny(`modified ${target}`); writeFileSync(path, bytes);
  }
  const helper = join(fixture, '.codex/hook-source-integrity.mjs');
  const helperEnv = { ...env, LUCA_CHILD_SOURCE_ROOT: fixture, NODE_OPTIONS: `--import=${guardRoot}/bootstrap.mjs` };
  const stdin = 'unchanged stdin\nquoted " payload';
  const untouched = spawnSync('/bin/sh', ['-c', `node '${helper}' --verify && cat`], {cwd:fixture,encoding:'utf8',input:stdin,env:helperEnv});
  assert.equal(untouched.status, 0, untouched.stderr); assert.equal(untouched.stdout, stdin);
  for (const args of [[], ['--verify','--verify'], ['--verify','unknown']]) {
    const result = spawnSync(process.execPath, [helper,...args], {cwd:fixture,encoding:'utf8',input:stdin,env:helperEnv}); assert.equal(result.status,2);
  }
  const fake = spawnSync(process.execPath, [helper,'--verify'], {cwd:fixture,encoding:'utf8',env:{...helperEnv,NODE_OPTIONS:'',LUCA_PROTECTED_CODE_ROOT:fixture}});
  assert.equal(fake.status,2,'workspace metadata or environment must not establish approval');
  deny('fake source root', false, {LUCA_SOURCE_GUARD_TEST_ROOT: join(base,'fake')});
  console.log('PASS protected helper: private approval/artifact/manifest schema, bootstrap/loader/helper tampering, fake environment, strict CLI, unread stdin, Stop failure closure');
} finally { rmSync(base, {recursive:true,force:true}); }
