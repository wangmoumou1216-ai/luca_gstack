// Real Git refs and index contents: fake-git command matching cannot prove publication.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const subject = resolve(process.env.SYNC_SCRIPT_UNDER_TEST || 'scripts/sync.sh');
const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_AUTHOR_NAME: 'Memory Test', GIT_AUTHOR_EMAIL: 'memory@example.invalid',
  GIT_COMMITTER_NAME: 'Memory Test', GIT_COMMITTER_EMAIL: 'memory@example.invalid' };
for (const key of Object.keys(env)) {
  if (/^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|CONFIG_COUNT|CONFIG_KEY_|CONFIG_VALUE_)/.test(key)) delete env[key];
}
function git(cwd, ...args) {
  const out = spawnSync('git', args, { cwd, env, encoding: 'utf8' });
  assert.equal(out.status, 0, `${args.join(' ')}\n${out.stderr}`);
  return out.stdout.trim();
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'memory-sync-real-'));
  const remote = join(root, 'remote.git');
  const repo = join(root, 'work');
  git(root, 'init', '--bare', remote);
  git(root, 'init', '-b', 'main', repo);
  mkdirSync(join(repo, 'memory'), { recursive: true });
  writeFileSync(join(repo, 'memory/retrieval-log.jsonl'), '{}\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-m', 'baseline');
  git(repo, 'remote', 'add', 'upstream', remote);
  git(repo, 'push', '-u', 'upstream', 'main');
  git(repo, 'switch', '-c', 'memory-fix');
  git(repo, 'branch', '--set-upstream-to', 'upstream/main');
  return { repo, remote };
}
{
  const { repo, remote } = fixture();
  writeFileSync(join(repo, 'memory/retrieval-log.jsonl'), '{"changed":true}\n');
  const out = spawnSync('bash', [subject], { cwd: repo, env, encoding: 'utf8' });
  assert.equal(out.status, 0, out.stderr);
  assert.equal(git(remote, 'rev-parse', 'refs/heads/main'), git(repo, 'rev-parse', 'HEAD'),
    'remote upstream must receive current HEAD even when local branch has a different name');
  console.log('PASS real Git: current HEAD reaches tracked remote branch');
}
{
  const { repo, remote } = fixture();
  writeFileSync(join(repo, 'unrelated.txt'), 'private unfinished work\n');
  git(repo, 'add', 'unrelated.txt');
  writeFileSync(join(repo, 'memory/retrieval-log.jsonl'), '{"changed":true}\n');
  const head = git(repo, 'rev-parse', 'HEAD');
  const index = git(repo, 'diff', '--cached', '--binary');
  const out = spawnSync('bash', [subject], { cwd: repo, env, encoding: 'utf8' });
  assert.notEqual(out.status, 0, 'sync must refuse an existing staged transaction');
  assert.equal(git(repo, 'rev-parse', 'HEAD'), head);
  assert.equal(git(remote, 'rev-parse', 'refs/heads/main'), head);
  assert.equal(git(repo, 'diff', '--cached', '--binary'), index);
  assert.equal(readFileSync(join(repo, 'unrelated.txt'), 'utf8'), 'private unfinished work\n');
  console.log('PASS real Git: preexisting staged work remains untouched');
}
{
  const { repo, remote } = fixture();
  const reject = join(remote, 'hooks/pre-receive');
  writeFileSync(reject, '#!/bin/sh\nexit 1\n');
  chmodSync(reject, 0o755);
  writeFileSync(join(repo, 'memory/retrieval-log.jsonl'), '{"retry":true}\n');
  const first = spawnSync('bash', [subject], { cwd: repo, env, encoding: 'utf8' });
  assert.notEqual(first.status, 0);
  const committed = git(repo, 'rev-parse', 'HEAD');
  assert.notEqual(git(remote, 'rev-parse', 'refs/heads/main'), committed);
  assert.equal(git(repo, 'status', '--porcelain'), '');
  unlinkSync(reject);
  const retry = spawnSync('bash', [subject], { cwd: repo, env, encoding: 'utf8' });
  assert.equal(retry.status, 0, retry.stderr);
  assert.equal(git(repo, 'rev-parse', 'HEAD'), committed, 'retry must not create a duplicate commit');
  assert.equal(git(remote, 'rev-parse', 'refs/heads/main'), committed,
    'clean worktree retry must publish the commit left behind by failed push');
  console.log('PASS real Git: rejected push resumes from clean worktree without duplicate commit');
}
