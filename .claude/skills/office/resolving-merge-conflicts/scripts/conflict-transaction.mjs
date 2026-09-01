#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { isAbsolute, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const GIT = '/usr/bin/git';
const MUTATION_DOORS = new Set(['edit', 'stage', 'advance', 'abort']);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function inside(candidate, root) {
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
  return candidate === root || candidate.startsWith(prefix);
}

function fail(message, code = 64) {
  process.stderr.write(`conflict-transaction: ${message}\n`);
  process.exit(code);
}

function parse(argv) {
  const command = argv.shift();
  if (!['inspect', 'propose', 'approval-payload'].includes(command)) {
    fail('usage: conflict-transaction.mjs inspect|propose|approval-payload --repo <realpath> [--operation edit|stage|advance|abort] [--path <conflicted-path> ...]');
  }
  let repo;
  let operation;
  const paths = [];
  while (argv.length) {
    const key = argv.shift();
    if (key === '--repo') repo = argv.shift();
    else if (key === '--operation') operation = argv.shift();
    else if (key === '--path') paths.push(argv.shift());
    else fail(`unknown or incomplete option: ${key}`);
  }
  if (!repo || !isAbsolute(repo) || resolve(repo) !== repo) fail('--repo must be a normalized absolute path');
  if (command === 'approval-payload' && !MUTATION_DOORS.has(operation)) fail('approval-payload requires one exact mutation door');
  if (command !== 'approval-payload' && (operation || paths.length)) fail('inspect/propose accept only --repo');
  if (paths.some((path) => !path || isAbsolute(path) || path.includes('\\') || path.split('/').some((part) => !part || part === '.' || part === '..'))) {
    fail('--path values must be normalized POSIX repository-relative paths');
  }
  if (new Set(paths).size !== paths.length) fail('--path values must be unique');
  return { command, repo, operation, paths: [...paths].sort() };
}

function git(repo, args, allowFailure = false) {
  const result = spawnSync(GIT, ['--no-optional-locks', '-C', repo, ...args], {
    encoding: null,
    timeout: 30_000,
    maxBuffer: 32 * 1024 * 1024,
    env: {
      PATH: '/usr/bin:/bin',
      LANG: 'C',
      LC_ALL: 'C',
      GIT_OPTIONAL_LOCKS: '0',
      GIT_PAGER: 'cat',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_COUNT: '0',
      HOME: '/var/empty',
    },
  });
  if (result.error) fail(result.error.message, 70);
  if (!allowFailure && result.status !== 0) fail(Buffer.from(result.stderr || '').toString('utf8').trim() || `git ${args[0]} failed`, 70);
  return result;
}

function gitText(repo, args, allowFailure = false) {
  const result = git(repo, args, allowFailure);
  return { status: result.status, stdout: Buffer.from(result.stdout || '').toString('utf8'), stderr: Buffer.from(result.stderr || '').toString('utf8') };
}

function gitPath(repo, name) {
  const value = gitText(repo, ['rev-parse', '--git-path', name]).stdout.trim();
  return isAbsolute(value) ? value : resolve(repo, value);
}

function operationType(repo) {
  if (existsSync(gitPath(repo, 'rebase-merge')) || existsSync(gitPath(repo, 'rebase-apply'))) return 'rebase';
  if (existsSync(gitPath(repo, 'MERGE_HEAD'))) return 'merge';
  if (existsSync(gitPath(repo, 'CHERRY_PICK_HEAD'))) return 'cherry-pick';
  if (existsSync(gitPath(repo, 'REVERT_HEAD'))) return 'revert';
  return 'none';
}

function unmerged(repo) {
  const raw = git(repo, ['ls-files', '-u', '-z']).stdout || Buffer.alloc(0);
  const grouped = new Map();
  for (const record of raw.toString('utf8').split('\0').filter(Boolean)) {
    const tab = record.indexOf('\t');
    if (tab < 0) fail('unexpected git ls-files -u record', 70);
    const [mode, object, stageText] = record.slice(0, tab).split(' ');
    const path = record.slice(tab + 1);
    const stage = Number(stageText);
    if (!/^[0-7]{6}$/.test(mode) || !/^[0-9a-f]{40,64}$/.test(object) || ![1, 2, 3].includes(stage) || !path) {
      fail('malformed unmerged index entry', 70);
    }
    if (!grouped.has(path)) grouped.set(path, { path, stages: {} });
    grouped.get(path).stages[String(stage)] = { mode, object };
  }
  return [...grouped.values()].sort((a, b) => Buffer.from(a.path).compare(Buffer.from(b.path)));
}

function resolvedWorktreeTuple(repo, path) {
  const target = resolve(repo, ...path.split('/'));
  if (!inside(target, repo)) fail(`approval path escapes repository: ${path}`);
  let stat;
  try {
    stat = lstatSync(target);
  } catch (error) {
    if (error.code === 'ENOENT') return { path, type: 'absent', mode: '-', sha256: '-' };
    fail(`cannot inspect approved path ${path}: ${error.message}`, 70);
  }
  if (stat.isSymbolicLink()) {
    return { path, type: 'symlink', mode: '120000', sha256: sha256(Buffer.from(readlinkSync(target), 'utf8')) };
  }
  if (stat.isFile()) {
    return { path, type: 'file', mode: (stat.mode & 0o111) ? '100755' : '100644', sha256: sha256(readFileSync(target)) };
  }
  fail(`approved path must be a regular file, symlink, or absent resolution: ${path}`);
}

function inspect(repo) {
  const top = gitText(repo, ['rev-parse', '--show-toplevel']).stdout.trim();
  const repoReal = realpathSync(top);
  if (repoReal !== repo) fail('--repo must be the canonical worktree realpath');
  const gitDirValue = gitText(repo, ['rev-parse', '--git-dir']).stdout.trim();
  const gitDir = realpathSync(isAbsolute(gitDirValue) ? gitDirValue : resolve(repo, gitDirValue));
  const operation = operationType(repo);
  const conflicts = unmerged(repo);
  const status = gitText(repo, ['status', '--porcelain=v2', '--untracked-files=all']).stdout;
  const headProbe = gitText(repo, ['rev-parse', 'HEAD'], true);
  const observation = {
    schema_version: 1,
    repository_realpath: repo,
    git_dir_realpath: gitDir,
    head: headProbe.status === 0 ? headProbe.stdout.trim() : null,
    operation,
    conflicts,
    status_sha256: sha256(Buffer.from(status, 'utf8')),
    status_porcelain_v2: status,
  };
  const stateSha = sha256(Buffer.from(canonical(observation), 'utf8'));
  return { ...observation, state_sha256: stateSha, operation_active: operation !== 'none' };
}

function doorApplicable(state, command, operation) {
  if (command === 'inspect' || command === 'propose') return state.operation_active;
  if (operation === 'edit' || operation === 'stage') return state.operation_active && state.conflicts.length > 0;
  if (operation === 'advance') return state.operation_active && state.conflicts.length === 0;
  if (operation === 'abort') return state.operation_active;
  return false;
}

function notApplicableReason(state, command, operation) {
  if (!state.operation_active) return 'no real in-progress Git operation';
  if (command === 'inspect' || command === 'propose') return 'operation is not observable';
  if (operation === 'edit' || operation === 'stage') return 'edit/stage require current unmerged entries';
  if (operation === 'advance') return 'advance requires an active operation with zero unmerged entries';
  return 'requested mutation door is not applicable';
}

const parsed = parse(process.argv.slice(2));
let repo;
try {
  repo = realpathSync(parsed.repo);
} catch (error) {
  fail(`cannot resolve repository: ${error.message}`);
}
if (repo !== parsed.repo || !lstatSync(repo).isDirectory() || lstatSync(repo).isSymbolicLink()) {
  fail('--repo must be an existing non-symlink directory realpath');
}

const state = inspect(repo);
if (!doorApplicable(state, parsed.command, parsed.operation)) {
  process.stdout.write(`${canonical({ status: 'NOT_APPLICABLE', reason: notApplicableReason(state, parsed.command, parsed.operation), observation: state })}\n`);
  process.exit(3);
}

if (parsed.command === 'inspect') {
  process.stdout.write(`${canonical({ status: 'INSPECTED_READ_ONLY', observation: state })}\n`);
} else if (parsed.command === 'propose') {
  process.stdout.write(`${canonical({
    status: 'PROPOSAL_INPUT_READ_ONLY',
    state_sha256: state.state_sha256,
    operation: state.operation,
    conflicts: state.conflicts,
    required_next_step: 'recover both sides intent from primary sources; do not edit, stage, advance, or abort',
  })}\n`);
} else {
  const conflictPaths = new Set(state.conflicts.map((row) => row.path));
  const paths = parsed.paths.length ? parsed.paths : [...conflictPaths].sort();
  if (['edit', 'stage'].includes(parsed.operation) && paths.length === 0) fail(`${parsed.operation} requires at least one exact --path`);
  if (paths.some((path) => !conflictPaths.has(path))) fail('edit/stage approval paths must be current conflicted paths');
  if (['advance', 'abort'].includes(parsed.operation) && parsed.paths.length) fail(`${parsed.operation} approval must not carry path scope`);
  const preconditions = {};
  if (parsed.operation === 'stage') {
    preconditions.resolved_worktree_tuples = paths.map((path) => resolvedWorktreeTuple(repo, path));
  }
  if (parsed.operation === 'advance') {
    preconditions.zero_unmerged = {
      operation_active: true,
      conflicts_count: 0,
      conflicts_sha256: sha256(Buffer.from(canonical(state.conflicts), 'utf8')),
    };
  }
  const payload = {
    schema_version: 1,
    effect: `git-conflict-${parsed.operation}`,
    repository_realpath: repo,
    git_dir_realpath: state.git_dir_realpath,
    operation_type: state.operation,
    state_sha256: state.state_sha256,
    paths: ['edit', 'stage'].includes(parsed.operation) ? paths : [],
    preconditions,
    constraints: {
      one_door_only: true,
      automatic_commit: false,
      automatic_push: false,
      preserve_unrelated_wip: true,
    },
  };
  process.stdout.write(`${canonical({
    status: 'HUMAN_APPROVAL_REQUIRED',
    approval_payload: payload,
    approval_sha256: sha256(Buffer.from(canonical(payload), 'utf8')),
    note: 'This helper never executes the mutation. Approval of this exact SHA authorizes only the named door for a trusted caller.',
  })}\n`);
}
