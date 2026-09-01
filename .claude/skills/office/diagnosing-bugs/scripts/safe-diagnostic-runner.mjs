#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const GIT = '/usr/bin/git';
const SAFE_COMMANDS = new Set([
  'status',
  'diff',
  'show',
  'log',
  'ls-files',
  'rev-parse',
  'cat-file',
  'merge-base',
  'name-rev',
]);
const FORBIDDEN_ARG = /(?:^|=)(?:https?|ssh|git):\/\/|^--(?:exec|ext-diff|textconv|filters?|output|config-env|upload-pack|receive-pack|show-signature)(?:=|$)|^-c$|%G/i;
const UNSAFE_LOCAL_CONFIG_KEY = [
  /^(?:include|includeif)\./,
  /^alias\./,
  /^hook\./,
  /^core\.(?:alternaterefscommand|askpass|editor|gitproxy|pager|sshcommand)$/,
  /^gpg(?:\.|$)/,
  /^(?:commit|tag)\.gpgsign$/,
  /^filter\./,
  /^diff\.external$/,
  /^diff\..*\.(?:command|textconv)$/,
  /^merge\..*\.driver$/,
  /^(?:difftool|mergetool)\./,
  /^interactive\.difffilter$/,
  /^sequence\.editor$/,
  /^pager\./,
  /^pretty\./,
  /^log\.showsignature$/,
  /^tar\..*\.command$/,
  /^(?:credential|http|lfs|url|protocol|submodule)\./,
  /^(?:browser|help|imap|instaweb|man|sendemail|web)\./,
];

function fail(message, code = 64) {
  process.stderr.write(`safe-diagnostic-runner: ${message}\n`);
  process.exit(code);
}

function sha256Bytes(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(path) {
  return sha256Bytes(readFileSync(path));
}

function inside(candidate, root) {
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
  return candidate === root || candidate.startsWith(prefix);
}

function parseArgs(argv) {
  let repo;
  let timeoutMs = 30_000;
  const separator = argv.indexOf('--');
  if (separator < 0) fail('usage: safe-diagnostic-runner.mjs --repo <realpath> [--timeout-ms N] -- <read-only-git-command> [args...]');
  const options = argv.slice(0, separator);
  const command = argv.slice(separator + 1);
  for (let i = 0; i < options.length; i += 1) {
    if (options[i] === '--repo') repo = options[++i];
    else if (options[i] === '--timeout-ms') timeoutMs = Number(options[++i]);
    else fail(`unknown option: ${options[i]}`);
  }
  if (!repo || !isAbsolute(repo) || resolve(repo) !== repo) fail('--repo must be a normalized absolute path');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) fail('--timeout-ms must be an integer from 1 to 120000');
  if (command.length === 0 || !SAFE_COMMANDS.has(command[0])) fail('only the documented read-only Git commands are supported');
  if (command.slice(1).some((arg) => typeof arg !== 'string' || arg.includes('\0') || FORBIDDEN_ARG.test(arg))) {
    fail('command contains a forbidden external-program, config, or network-shaped argument');
  }
  return { repo, timeoutMs, command };
}

function git(repo, args, timeout = 30_000) {
  const result = spawnSync(GIT, [
    '--no-optional-locks',
    '-c', 'core.fsmonitor=false',
    '-c', 'core.hooksPath=/dev/null',
    '-c', 'core.pager=cat',
    '-c', 'pager.status=false',
    '-c', 'submodule.recurse=false',
    '-C', repo,
    ...args,
  ], {
    encoding: 'utf8',
    timeout,
    maxBuffer: 16 * 1024 * 1024,
    env: {
      PATH: '/usr/bin:/bin',
      LANG: 'C',
      LC_ALL: 'C',
      GIT_OPTIONAL_LOCKS: '0',
      GIT_NO_LAZY_FETCH: '1',
      GIT_PAGER: 'cat',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_COUNT: '0',
      HOME: '/var/empty',
    },
  });
  if (result.error) throw result.error;
  return result;
}

function rejectUnsafeLocalConfig(repo) {
  const probe = git(repo, ['config', '--local', '--no-includes', '--name-only', '--null', '--list']);
  if (probe.status !== 0) fail(`cannot enumerate repository-local Git config: ${probe.stderr.trim()}`);
  const keys = probe.stdout.split('\0').filter(Boolean).map((key) => key.toLowerCase());
  const unsafe = [...new Set(keys.filter((key) => UNSAFE_LOCAL_CONFIG_KEY.some((pattern) => pattern.test(key))))].sort();
  if (unsafe.length) fail(`repository-local Git config exposes program or network surfaces: ${unsafe.join(', ')}`);
}

function indexTuple(repo) {
  const probe = git(repo, ['rev-parse', '--git-path', 'index']);
  if (probe.status !== 0) fail(`cannot resolve Git index: ${probe.stderr.trim()}`);
  let path = probe.stdout.trim();
  if (!isAbsolute(path)) path = resolve(repo, path);
  if (!existsSync(path)) return { type: 'absent', mode: '-', sha256: '-' };
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) fail('Git index must be a regular file');
  return { type: 'file', mode: (stat.mode & 0o111) ? '100755' : '100644', sha256: sha256File(path) };
}

function repoTuple(repo) {
  const head = git(repo, ['rev-parse', 'HEAD']);
  const status = git(repo, ['status', '--porcelain=v2', '--untracked-files=all']);
  if (head.status !== 0 || status.status !== 0) fail('unable to freeze repository observation tuple');
  return {
    head: head.stdout.trim(),
    index: indexTuple(repo),
    status_sha256: sha256Bytes(Buffer.from(status.stdout, 'utf8')),
  };
}

const { repo: inputRepo, timeoutMs, command } = parseArgs(process.argv.slice(2));
let repo;
try {
  repo = realpathSync(inputRepo);
} catch (error) {
  fail(`cannot resolve repository: ${error.message}`);
}
if (repo !== inputRepo || !lstatSync(repo).isDirectory()) fail('--repo must be an existing directory realpath');
rejectUnsafeLocalConfig(repo);
const top = git(repo, ['rev-parse', '--show-toplevel']);
if (top.status !== 0 || realpathSync(top.stdout.trim()) !== repo) fail('--repo must be the canonical Git worktree root');

const before = repoTuple(repo);
const [subcommand, ...userArgs] = command;
const safeArgs = ['diff', 'show', 'log'].includes(subcommand)
  ? [subcommand, '--no-ext-diff', '--no-textconv', ...userArgs]
  : [subcommand, ...userArgs];
const result = git(repo, safeArgs, timeoutMs);
const after = repoTuple(repo);

if (JSON.stringify(before) !== JSON.stringify(after)) {
  fail(`repository tuple changed during a diagnose-only command; before=${JSON.stringify(before)} after=${JSON.stringify(after)}`, 70);
}

process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
process.stderr.write(`safe-diagnostic-runner: unchanged ${sha256Bytes(Buffer.from(JSON.stringify(after)))}\n`);
process.exit(result.status === null ? 124 : result.status);
