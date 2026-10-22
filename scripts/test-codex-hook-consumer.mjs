#!/usr/bin/env node
// These tests exercise real Git refs and subprocess orchestration. Their small
// consumer fixture does NOT establish ASAR/native compatibility; the App suite
// runs that separate gate against an actual candidate and selected binaries.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkCodexHookConsumer, inspectPushUpdates, parsePushUpdates } from './check-codex-hook-consumer.mjs';

const SOURCE = dirname(fileURLToPath(import.meta.url));
const ZERO = '0'.repeat(40);
const FILES = ['.codex/hooks.json', 'scripts/codex-hook-contract.mjs', 'scripts/lib/codex-hook-contract.mjs',
  '.codex/hook-source-integrity.mjs', 'scripts/source-guard-review.mjs',
  'scripts/codex-hook-health.mjs', 'scripts/fixtures/codex-hook-contract/native-071.json',
  'scripts/fixtures/codex-hook-contract/native-c6.json'];
const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))),
  GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' };
function git(root, args, checked = true) {
  const result = spawnSync('git', ['-C', root, ...args], { env, encoding: 'utf8', timeout: 15000 });
  if (checked) assert.equal(result.status, 0, result.stderr);
  return checked ? result.stdout.trim() : result;
}
function put(root, name, bytes) {
  const file = join(root, name); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, bytes);
}
function commit(root, message) {
  git(root, ['add', '-A']); git(root, ['-c', 'core.hooksPath=/dev/null', 'commit', '-qm', message]);
  return git(root, ['rev-parse', 'HEAD']);
}
function update(local, remote, name = 'main') { return `refs/heads/${name} ${local} refs/heads/${name} ${remote}\n`; }
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hook-consumer-test-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, 'framework'); mkdirSync(repo);
  git(repo, ['init', '-q', '-b', 'main']);
  git(repo, ['config', 'user.name', 'Consumer Gate Test']);
  git(repo, ['config', 'user.email', 'consumer-gate@example.invalid']);
  git(repo, ['config', 'commit.gpgsign', 'false']);
  for (const name of FILES) put(repo, name, `base ${name}\n`);
  put(repo, 'README.md', 'base\n');
  const base = commit(repo, 'base');
  put(repo, '.codex/hooks.json', 'reviewed hook change\n');
  const changed = commit(repo, 'hook change');
  return { root, repo, base, changed };
}
function consumer(f) {
  const app = join(f.root, 'consumer app'), bundle = join(f.root, 'Candidate.app');
  mkdirSync(app);
  put(bundle, 'Contents/Resources/app.asar', 'actual physical candidate fixture\n');
  // This is deliberately only an orchestration fixture. No test calls its PASS
  // a proof of real bundled application behaviour.
  put(app, 'hook-compatibility-gate.mjs', `
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const [bundle, flag, root] = process.argv.slice(2);
if (flag !== '--framework-root') process.exit(2);
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const app = path.dirname(fileURLToPath(import.meta.url));
const config = path.join(app, 'behavior.json');
const behavior = fs.existsSync(config) ? JSON.parse(fs.readFileSync(config)) : {};
fs.appendFileSync(path.join(app, 'calls.log'), JSON.stringify({args:process.argv.slice(2),gitVars:Object.keys(process.env).filter(k=>k.startsWith('GIT_'))})+'\\n');
if (behavior.reject) { console.log(JSON.stringify({ok:false,code:'HOOK_GATE_MODE_GAP'})); process.exit(1); }
const archive = path.join(bundle, 'Contents/Resources/app.asar');
const files = Object.fromEntries(${JSON.stringify(FILES.filter(name => !['scripts/codex-hook-health.mjs', '.codex/hook-source-integrity.mjs', 'scripts/source-guard-review.mjs'].includes(name)))}.map(name=>[name,{canonicalPath:path.join(root,name),sha256:hash(path.join(root,name))}]));
const report = {schemaVersion:1,ok:true,app:{appPath:bundle,archive:{canonicalPath:archive,sha256:hash(archive)}},framework:{canonicalPath:root,files},modes:['system','sidecar','direct'].map(mode=>({mode})),tuples:['system','sidecar','direct'].flatMap(mode=>['fresh','legacy071'].map(initial=>({mode,initial,status:'PASS'})))};
if (behavior.wrongRoot) report.framework.canonicalPath += '/other';
if (behavior.wrongHash) report.framework.files['.codex/hooks.json'].sha256 = '0'.repeat(64);
if (behavior.missingTuple) report.tuples.pop();
if (behavior.duplicateTuple) report.tuples[0] = report.tuples[1];
if (behavior.extraInput) report.framework.files['scripts/uncommitted.mjs']={canonicalPath:path.join(root,'scripts/uncommitted.mjs'),sha256:hash(path.join(root,'scripts/uncommitted.mjs'))};
if (behavior.mutateSource) fs.appendFileSync(path.join(root,'.codex/hooks.json'),'concurrent\\n');
console.log(JSON.stringify(report));
`);
  git(f.repo, ['config', '--local', 'luca.hookConsumerAppRoot', app]);
  git(f.repo, ['config', '--local', 'luca.hookConsumerBundle', bundle]);
  return { app, bundle, behavior: value => put(app, 'behavior.json', JSON.stringify(value)),
    calls: () => existsSync(join(app, 'calls.log')) ? readFileSync(join(app, 'calls.log'), 'utf8').trim().split('\n').map(JSON.parse) : [] };
}

test('pre-push parser rejects malformed and oversized input; an empty push has no updates', () => {
  assert.deepEqual(parsePushUpdates(''), []);
  for (const value of ['oops\n', update('not-an-object', ZERO), update('a'.repeat(40), ZERO).replace('refs/heads/main', 'bad\0ref'), 'x'.repeat(65537)]) {
    assert.throws(() => parsePushUpdates(value), error => error.code === 'PUSH_INPUT_INVALID');
  }
});

test('real ref delta detection: hook changes, docs-only, initial, deletion and same object', t => {
  const f = fixture(t);
  assert.equal(inspectPushUpdates(f.repo, update(f.changed, f.base))[0].required, true);
  put(f.repo, 'README.md', 'docs only\n'); const docs = commit(f.repo, 'docs');
  assert.equal(inspectPushUpdates(f.repo, update(docs, f.changed))[0].required, false);
  assert.equal(inspectPushUpdates(f.repo, update(docs, ZERO))[0].required, true);
  assert.equal(inspectPushUpdates(f.repo, `(delete) ${ZERO} refs/heads/main ${docs}\n`)[0].state, 'DELETED');
  assert.equal(inspectPushUpdates(f.repo, update(docs, docs))[0].state, 'UNCHANGED');
  assert.equal(checkCodexHookConsumer({ root: f.repo, input: update(docs, f.changed) }).state, 'NOT_REQUIRED');
});

test('all contract owners and gate wiring trigger a consumer check', t => {
  const f = fixture(t);
  for (const name of [...FILES, 'scripts/fixtures/codex-hook-contract/another.json',
    'scripts/check-codex-hook-consumer.mjs', '.githooks/pre-push']) {
    const before = git(f.repo, ['rev-parse', 'HEAD']);
    put(f.repo, name, `changed ${name}\n`); const after = commit(f.repo, name);
    assert.equal(inspectPushUpdates(f.repo, update(after, before))[0].required, true, name);
  }
});

test('unknown remote baseline requires evidence; missing pushed object fails closed; annotated tags are supported', t => {
  const f = fixture(t);
  assert.equal(inspectPushUpdates(f.repo, update(f.changed, 'f'.repeat(40)))[0].state, 'BASELINE_UNAVAILABLE');
  assert.throws(() => inspectPushUpdates(f.repo, update('f'.repeat(40), ZERO)), error => error.code === 'PUSH_OBJECT_UNAVAILABLE');
  git(f.repo, ['tag', '-a', '-m', 'release', 'v-test', f.changed]);
  const oid = git(f.repo, ['rev-parse', 'v-test']);
  assert.equal(inspectPushUpdates(f.repo, `refs/tags/v-test ${oid} refs/tags/v-test ${ZERO}\n`)[0].localCommit, f.changed);
});

test('missing local configuration and missing physical bundle are explicit GAPs', t => {
  const f = fixture(t), input = update(f.changed, f.base);
  assert.equal(checkCodexHookConsumer({ root: f.repo, input }).code, 'CONSUMER_CONFIG_GAP');
  const c = consumer(f);
  rmSync(join(c.bundle, 'Contents/Resources/app.asar'));
  const result = checkCodexHookConsumer({ root: f.repo, input });
  assert.equal(result.state, 'GAP'); assert.equal(result.code, 'CONSUMER_ASSET_GAP'); assert.equal(c.calls().length, 0);
});

test('a configured symlink cannot substitute for the physical candidate', t => {
  const f = fixture(t), c = consumer(f), alias = join(f.root, 'Alias.app');
  symlinkSync(c.bundle, alias); git(f.repo, ['config', '--local', 'luca.hookConsumerBundle', alias]);
  assert.equal(checkCodexHookConsumer({ root: f.repo, input: update(f.changed, f.base) }).code, 'CONSUMER_ASSET_GAP');
});

test('pass → dirty contract rejects before consumer → restored pass, without changing Git or configuration', t => {
  const f = fixture(t), c = consumer(f), input = update(f.changed, f.base);
  const configBefore = readFileSync(join(f.repo, '.git/config'));
  const original = readFileSync(join(f.repo, '.codex/hooks.json'));
  assert.equal(checkCodexHookConsumer({ root: f.repo, input }).state, 'PASS');
  put(f.repo, '.codex/hooks.json', 'uncommitted contract\n');
  const rejected = checkCodexHookConsumer({ root: f.repo, input });
  assert.equal(rejected.code, 'FRAMEWORK_SOURCE_MISMATCH'); assert.equal(c.calls().length, 1);
  put(f.repo, '.codex/hooks.json', original);
  assert.equal(checkCodexHookConsumer({ root: f.repo, input }).state, 'PASS');
  assert.equal(c.calls().length, 2);
  assert.deepEqual(readFileSync(join(f.repo, '.git/config')), configBefore);
  assert.equal(git(f.repo, ['rev-parse', 'HEAD']), f.changed);
  assert.equal(git(f.repo, ['status', '--porcelain']), '');
});

test('every advertised framework input must belong to the pushed commit and every native tuple must be present', t => {
  const f = fixture(t), c = consumer(f), input = update(f.changed, f.base);
  put(f.repo, 'scripts/uncommitted.mjs', 'not in the pushed commit\n');
  for (const behavior of [{ wrongRoot: true }, { wrongHash: true }, { missingTuple: true }, { duplicateTuple: true }]) {
    c.behavior(behavior);
    assert.equal(checkCodexHookConsumer({ root: f.repo, input }).code, 'CONSUMER_REPORT_INVALID');
  }
  c.behavior({ extraInput: true });
  assert.equal(checkCodexHookConsumer({ root: f.repo, input }).code, 'FRAMEWORK_SOURCE_MISMATCH');
});

test('consumer mode GAP and concurrent source changes block publication', t => {
  const f = fixture(t), c = consumer(f), input = update(f.changed, f.base);
  c.behavior({ reject: true });
  const rejected = checkCodexHookConsumer({ root: f.repo, input });
  assert.equal(rejected.code, 'CONSUMER_REJECTED'); assert.equal(rejected.detail, 'HOOK_GATE_MODE_GAP');
  c.behavior({ mutateSource: true });
  assert.equal(checkCodexHookConsumer({ root: f.repo, input }).code, 'FRAMEWORK_SOURCE_MISMATCH');
});

test('multi-ref checks every distinct required tip and deduplicates identical tips', t => {
  const f = fixture(t), c = consumer(f);
  put(f.repo, 'README.md', 'separate tip with the same contract\n'); const docs = commit(f.repo, 'docs');
  const result = checkCodexHookConsumer({ root: f.repo, input: update(f.changed, f.base) + update(docs, f.base, 'other') + update(f.changed, ZERO, 'copy') });
  assert.equal(result.state, 'PASS'); assert.equal(result.checks.length, 2); assert.equal(c.calls().length, 2);
  put(f.repo, '.codex/hooks.json', 'different contract tip\n'); const newer = commit(f.repo, 'second contract');
  assert.equal(checkCodexHookConsumer({ root: f.repo, input: update(f.changed, f.base) + update(newer, docs, 'other') }).code, 'FRAMEWORK_SOURCE_MISMATCH');
});

test('actual local Git push invokes the hook; missing evidence blocks, configured evidence permits push', t => {
  const f = fixture(t), bare = join(f.root, 'remote.git');
  git(f.root, ['init', '--bare', '-q', bare]);
  git(f.repo, ['remote', 'add', 'release-target', bare]);
  mkdirSync(join(f.repo, '.githooks'));
  copyFileSync(join(SOURCE, '../.githooks/pre-push'), join(f.repo, '.githooks/pre-push'));
  chmodSync(join(f.repo, '.githooks/pre-push'), 0o755);
  copyFileSync(join(SOURCE, 'check-codex-hook-consumer.mjs'), join(f.repo, 'scripts/check-codex-hook-consumer.mjs'));
  const outgoing = commit(f.repo, 'install gate');
  git(f.repo, ['config', 'core.hooksPath', '.githooks']);
  const rejected = git(f.repo, ['push', 'release-target', 'main'], false);
  assert.notEqual(rejected.status, 0); assert.match(rejected.stdout + rejected.stderr, /CONSUMER_CONFIG_GAP/);
  assert.equal(git(bare, ['show-ref', '--verify', 'refs/heads/main'], false).status, 128);
  const c = consumer(f);
  const allowed = git(f.repo, ['push', 'release-target', 'main'], false);
  assert.equal(allowed.status, 0, allowed.stdout + allowed.stderr);
  assert.equal(git(bare, ['rev-parse', 'refs/heads/main']), outgoing);
  assert.equal(c.calls().length, 1);
  assert.deepEqual(c.calls()[0].gitVars, []);
});
