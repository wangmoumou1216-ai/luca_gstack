#!/usr/bin/env node
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const subject = resolve(process.env.SYNC_SCRIPT_UNDER_TEST || join(repoRoot, 'scripts', 'sync.sh'));
const subjectOnly = process.argv.includes('--subject-only');

const stopHook = readFileSync(join(repoRoot, '.claude', 'hooks', 'session-sync.mjs'), 'utf8');
const memoryReadme = readFileSync(join(repoRoot, 'memory', 'README.md'), 'utf8');
for (const trackedLog of ['memory/semantic/reviews.jsonl', 'memory/retrieval-log.jsonl']) {
  assert.ok(stopHook.includes(trackedLog), `session-sync dirty reminder must include ${trackedLog}`);
}
assert.match(memoryReadme, /\| `semantic\/reviews\.jsonl` \| ✓/);
assert.match(memoryReadme, /\| `retrieval-log\.jsonl` \| ✓/);

const trackedState = [
  'memory/episodic/index.jsonl',
  'memory/episodic/archive/.keep',
  'memory/semantic/promoted-facts.yaml',
  'memory/semantic/reviews.jsonl',
  'memory/semantic/archive/.keep',
  'memory/evals/eval-log.jsonl',
  'memory/retrieval-log.jsonl',
  '.claude/skill-os/evolution/.keep',
  '.claude/observability/observations.jsonl',
];

function runHarness({ upstream = 'upstream/main', dirty = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'luca-sync-test-'));
  const bin = join(root, 'bin');
  const log = join(root, 'git.log');
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(root, 'scripts', 'sync.sh'), readFileSync(subject));
  for (const relative of trackedState) {
    const target = join(root, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, '\n');
  }

  const fakeGit = join(bin, 'git');
  writeFileSync(fakeGit, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$SYNC_FAKE_LOG"
if [[ "$1" == "rev-parse" && "$2" == "--show-toplevel" ]]; then
  printf '%s\\n' "$SYNC_FAKE_ROOT"
  exit 0
fi
if [[ "$1" == "rev-parse" && "$2" == "--abbrev-ref" ]]; then
  if [[ "$SYNC_FAKE_UPSTREAM" == "__MISSING__" ]]; then exit 1; fi
  printf '%s\\n' "$SYNC_FAKE_UPSTREAM"
  exit 0
fi
if [[ "$1" == "diff" && "$2" == "--cached" && "$3" == "--quiet" ]]; then
  if [[ ! -f "$SYNC_FAKE_LOG.index-checked" ]]; then
    touch "$SYNC_FAKE_LOG.index-checked"
    exit 0
  fi
  if [[ "$SYNC_FAKE_DIRTY" == "1" ]]; then exit 1; fi
  exit 0
fi
exit 0
`);
  chmodSync(fakeGit, 0o755);

  const result = spawnSync('bash', [join(root, 'scripts', 'sync.sh')], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH || ''}`,
      SYNC_FAKE_ROOT: root,
      SYNC_FAKE_LOG: log,
      SYNC_FAKE_UPSTREAM: upstream,
      SYNC_FAKE_DIRTY: dirty ? '1' : '0',
    },
  });
  return { ...result, calls: readFileSync(log, 'utf8').trim().split('\n').filter(Boolean) };
}

{
  const result = runHarness({ upstream: 'upstream/main' });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.calls.includes('pull --rebase --autostash upstream main'));
  assert.ok(result.calls.includes('add -- memory/semantic/reviews.jsonl'));
  assert.ok(result.calls.includes('add -- memory/retrieval-log.jsonl'));
  assert.ok(result.calls.includes('push upstream HEAD:refs/heads/main'));
  assert.ok(!result.calls.some((line) => line === 'push origin main'));
  console.log('PASS sync follows upstream/main and stages both tracked audit logs');
  console.log('PASS reminder and documentation agree that both audit logs are tracked');
}

{
  const result = runHarness({ upstream: 'backup/release/2026-09' });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.calls.includes('pull --rebase --autostash backup release/2026-09'));
  assert.ok(result.calls.includes('push backup HEAD:refs/heads/release/2026-09'));
  console.log('PASS sync preserves slash-containing tracking branch names');
}

{
  const result = runHarness({ upstream: '__MISSING__' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /没有 tracking upstream/);
  assert.ok(!result.calls.some((line) => line.startsWith('pull ')));
  assert.ok(!result.calls.some((line) => line.startsWith('push ')));
  console.log('PASS sync fails before Git effects when no tracking upstream exists');
}

if (!subjectOnly) {
  const original = readFileSync(subject, 'utf8');
  const mutated = original.replace(
    'git push "$tracking_remote" "HEAD:refs/heads/$tracking_branch"',
    'git push origin main',
  );
  assert.notEqual(mutated, original, 'mutation anchor must exist');
  const mutationRoot = mkdtempSync(join(tmpdir(), 'luca-sync-mutation-'));
  const mutationSubject = join(mutationRoot, 'sync.sh');
  writeFileSync(mutationSubject, mutated);
  const mutation = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--subject-only'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, SYNC_SCRIPT_UNDER_TEST: mutationSubject },
  });
  assert.notEqual(mutation.status, 0, 'test must reject a hard-coded push target mutation');
  assert.match(`${mutation.stdout}\n${mutation.stderr}`, /AssertionError|ERR_ASSERTION/);
  console.log('PASS sync test proof-it-bites rejects hard-coded origin/main push');
}
