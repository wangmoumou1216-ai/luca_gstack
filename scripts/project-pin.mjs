#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { dirname, join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import {
  PROJECTS_ROOT,
  PROJECT_STATE_SCHEMA,
  atomicProjectStateCas,
  atomicProjectStateRawCas,
  beginProjectTurn,
  canonicalProjectIdentity,
  closeProjectTurn,
  closeSwitchTurn,
  inspectProjectStateLock,
  migrateLegacyProjectState,
  prepareProjectSwitch,
  projectSwitchRollbackRaw,
  readProjectState,
  removeProjectStateCas,
  recoverProjectStateLock,
  quarantineLegacyProjectState,
  sanitizeSessionId,
  validateProjectName,
  validatedBindingForState,
} from '../.claude/hooks/lib/project-substrate.mjs';
import { acquireProjectLease, releaseProjectLease } from './project-lease.mjs';
import { projectWriteLeaseForPath } from '../.claude/hooks/lib/project-write-lease.mjs';
import { withoutLocalGitEnv } from '../.claude/hooks/lib/git-env.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function roots() {
  return {
    gstackRoot: realpathSync(resolve(process.env.LUCA_GSTACK_ROOT || process.env.CLAUDE_PROJECT_DIR || REPO_ROOT)),
    projectsRoot: realpathSync(resolve(process.env.LUCA_PROJECTS_ROOT || PROJECTS_ROOT)),
  };
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function fault(name) {
  if (process.env.LUCA_PROJECT_FAULT === name) throw new Error(`injected project transaction fault: ${name}`);
}

function ensureSkeleton(root, name, template) {
  mkdirSync(join(root, 'docs', 'handoff'), { recursive: true });
  mkdirSync(join(root, '.luca', 'memory'), { recursive: true });
  const state = join(root, '.luca', 'workflow-state.yaml');
  if (!existsSync(state)) {
    if (existsSync(template)) copyFileSync(template, state);
    else writeFileSync(state, 'topic: ""\nnodes: {}\n');
  }
  const topic = join(root, '.luca', 'current-topic.txt');
  if (!existsSync(topic)) writeFileSync(topic, '');
  const memory = join(root, '.luca', 'memory', 'MEMORY.md');
  if (!existsSync(memory)) writeFileSync(memory, [
    `# ${name} — 项目本地记忆`, '',
    '> 只存「只对本项目成立」的事实。跨项目偏好进全局记忆；框架规则走 semantic candidate。',
    '> 一行一条：- [标题](file.md) — 一句钩子', '',
  ].join('\n'));
  const decisions = join(root, '.luca', 'memory', 'decisions.md');
  if (!existsSync(decisions)) writeFileSync(decisions, [
    `# ${name} — 决策台账（ADR-lite）`, '',
    '> 只记无法从代码或产物推导的决策与 why；被推翻时标 superseded_by，不删除。', '',
  ].join('\n'));
  const context = join(root, 'CONTEXT.md');
  if (!existsSync(context)) writeFileSync(context, [
    `# ${name} — CONTEXT`, '',
    '> 项目级长期约束与共识；保持 ≤80 行。', '',
    '## 概览', '- 一句话：<这个项目是什么、给谁、解决什么问题>', '- 当前阶段：<idea / 原型 / 开发 / 上线维护>', '',
    '## 技术栈与禁用项', '- 栈：<语言/框架/关键依赖>', '- 禁用：<明确不用的方案>', '',
    '## 目录结构要点', '- <关键目录>：<一句话作用>', '',
    '## 红线', '- <本项目不可违反的硬约束>', '',
  ].join('\n'));
}

function linkPaths(gstackRoot) {
  return [
    { path: join(gstackRoot, 'docs'), key: 'docs' },
    { path: join(gstackRoot, '.claude', 'workflow-state.yaml'), key: 'state' },
    { path: join(gstackRoot, '.claude', 'current-topic.txt'), key: 'topic' },
  ];
}

function captureLink(path) {
  try {
    const st = lstatSync(path);
    if (!st.isSymbolicLink()) throw new Error(`shared display path is not a symlink: ${path}`);
    return { kind: 'symlink', target: readlinkSync(path) };
  } catch (error) {
    if (error?.code === 'ENOENT') return { kind: 'absent' };
    throw error;
  }
}

function replaceLink(path, target) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tx-${process.pid}-${randomUUID()}`;
  symlinkSync(target, tmp);
  renameSync(tmp, path);
}

function restoreLink(path, snapshot) {
  if (snapshot.kind === 'symlink') return replaceLink(path, snapshot.target);
  try {
    if (lstatSync(path).isSymbolicLink()) unlinkSync(path);
    else throw new Error(`cannot restore absent link over non-symlink: ${path}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function assertLink(path, target) {
  const st = lstatSync(path);
  if (!st.isSymbolicLink() || readlinkSync(path) !== target) throw new Error(`link readback mismatch: ${path}`);
}

function proposalFields(state) {
  const sw = state?.switch;
  if (state?.state !== 'SWITCH_ONLY' || !sw) throw new Error('session is not in SWITCH_ONLY');
  return sw;
}

function assertNoProjectWriteLease(projectPath, projectsRoot, label) {
  const active = projectWriteLeaseForPath(projectPath, projectsRoot);
  if (active) {
    throw new Error(`${label} project has an active patch write lease (owner=${active.owner.owner_token})`);
  }
}

export function executeProjectTransaction({ sessionId, tx, operation, target, expectedEpoch }) {
  const sid = sanitizeSessionId(sessionId);
  const op = String(operation || '');
  const project = validateProjectName(target);
  const expected = Number(expectedEpoch);
  if (!sid || !['switch', 'new'].includes(op) || !Number.isSafeInteger(expected) || expected < 0) throw new Error('invalid transaction arguments');
  const { gstackRoot, projectsRoot } = roots();
  const initial = readProjectState(gstackRoot, sid);
  const proposal = proposalFields(initial.value);
  if (proposal.tx !== tx || proposal.operation !== op || proposal.target !== project || proposal.expected_epoch !== expected) {
    throw new Error('switch transaction does not match prepared tx/operation/target/epoch');
  }
  const oldBinding = validatedBindingForState(initial.value, projectsRoot);
  if ((oldBinding?.epoch || 0) !== expected) throw new Error('stale expected epoch');
  const rollbackRaw = projectSwitchRollbackRaw(initial.value, projectsRoot);

  const leaseToken = `${sid}-${tx}`;
  const lease = acquireProjectLease({ root: gstackRoot, ownerToken: leaseToken, pid: process.pid });
  const snapshots = new Map();
  let linksTouched = false;
  let visibleNewProject = false;
  let staging = '';
  let committedState = null;
  let committedRaw = null;
  let rollbackExpectedRaw = initial.raw;
  let primaryError = null;
  try {
    // Recheck the proposal only after owning the lease. This closes the gap where
    // two callers both validate before serialization.
    const locked = readProjectState(gstackRoot, sid);
    if (!locked.raw?.equals(initial.raw)) throw new Error('project state changed before lease acquisition');
    if (oldBinding) assertNoProjectWriteLease(oldBinding.realpath, projectsRoot, 'current');

    const targetRoot = join(projectsRoot, project);
    if (op === 'switch') {
      const targetIdentity = canonicalProjectIdentity(project, projectsRoot);
      assertNoProjectWriteLease(targetIdentity.realpath, projectsRoot, 'target');
    } else {
      if (existsSync(targetRoot)) throw new Error(`new project already exists: ${project}`);
      staging = join(projectsRoot, `.luca-staging-${project}-${tx}`);
      if (existsSync(staging)) throw new Error(`staging path already exists: ${staging}`);
      ensureSkeleton(staging, project, join(gstackRoot, '.claude', 'templates', 'workflow-state.yaml'));
      const gitInit = spawnSync('git', ['init', '-q'], {
        cwd: staging,
        stdio: 'ignore',
        env: withoutLocalGitEnv(),
      });
      if (gitInit.error || gitInit.status !== 0) {
        throw new Error(`git init failed for staged project (${gitInit.error?.message || `exit ${gitInit.status}`})`);
      }
      fault('after-new-staging');
      // POSIX rename may replace a concurrently-created *empty* directory.
      // Claim the final name with mkdir instead: mkdir is the no-replace
      // primitive, and every staged top-level entry is then moved into the
      // directory we exclusively created.
      if (process.env.LUCA_PROJECT_FAULT === 'empty-target-race') mkdirSync(targetRoot);
      try { mkdirSync(targetRoot); }
      catch (error) { throw new Error(`new project lost creation race without replacing target: ${error.message}`); }
      visibleNewProject = true;
      for (const entry of readdirSync(staging)) renameSync(join(staging, entry), join(targetRoot, entry));
      if (readdirSync(staging).length !== 0) throw new Error('staging directory was not empty after no-replace publish');
      rmdirSync(staging);
      staging = '';
    }

    const identity = canonicalProjectIdentity(project, projectsRoot);
    fault('after-target-validate');
    const targets = {
      docs: join(identity.realpath, 'docs'),
      state: join(identity.realpath, '.luca', 'workflow-state.yaml'),
      topic: join(identity.realpath, '.luca', 'current-topic.txt'),
    };
    for (const item of linkPaths(gstackRoot)) snapshots.set(item.path, captureLink(item.path));
    for (const item of linkPaths(gstackRoot)) {
      replaceLink(item.path, targets[item.key]);
      linksTouched = true;
      fault(`after-${item.key === 'docs' ? 'docs-link' : item.key === 'state' ? 'state-link' : 'topic-link'}`);
    }
    for (const item of linkPaths(gstackRoot)) assertLink(item.path, targets[item.key]);
    if (!existsSync(targets.state) || !existsSync(targets.topic) || !existsSync(targets.docs)) throw new Error('project state/link target readback failed');
    const identityAfterLinks = canonicalProjectIdentity(project, projectsRoot);
    for (const field of ['realpath', 'dev', 'ino']) if (identityAfterLinks[field] !== identity[field]) throw new Error(`project identity changed before commit: ${field}`);
    fault('after-readback');

    const binding = { ...identity, epoch: expected + 1 };
    const next = {
      schema_version: PROJECT_STATE_SCHEMA,
      state: 'BOUND',
      session_id: sid,
      binding,
      terminal: { tx, operation: op, expected_epoch: expected, turn_id: proposal.turn_id, committed_at: new Date().toISOString() },
    };
    committedRaw = Buffer.from(`${JSON.stringify(next)}\n`);
    atomicProjectStateCas(gstackRoot, sid, initial.raw, next);
    rollbackExpectedRaw = committedRaw;
    if (process.env.LUCA_PROJECT_FAULT === 'after-state-commit-drift') {
      const drift = {
        schema_version: PROJECT_STATE_SCHEMA,
        state: 'TURN_CLOSED',
        session_id: sid,
        binding,
        turn: { turn_id: proposal.turn_id, epoch: binding.epoch, outcome: 'injected-post-commit-drift' },
      };
      atomicProjectStateCas(gstackRoot, sid, committedRaw, drift);
      throw new Error('injected project transaction fault: after-state-commit-drift');
    }
    if (process.env.LUCA_PROJECT_FAULT === 'after-state-commit-link-drift') {
      // Deterministic race seam: emulate a competing display publisher after
      // the state commit so the final full-tuple readback must catch it.
      for (const item of [...linkPaths(gstackRoot)].reverse()) restoreLink(item.path, snapshots.get(item.path));
    }
    fault('after-state-commit');
    for (const item of linkPaths(gstackRoot)) assertLink(item.path, targets[item.key]);
    const published = readProjectState(gstackRoot, sid, projectsRoot);
    if (!published.raw?.equals(committedRaw)) throw new Error('final project state bytes readback mismatch');
    const publishedBinding = validatedBindingForState(published.value, projectsRoot);
    for (const field of ['project', 'realpath', 'dev', 'ino', 'epoch']) {
      if (publishedBinding?.[field] !== binding[field]) throw new Error(`final project tuple readback mismatch: ${field}`);
    }
    committedState = next;
    return committedState;
  } catch (error) {
    primaryError = error;
    try {
      atomicProjectStateRawCas(gstackRoot, sid, rollbackExpectedRaw, rollbackRaw);
    } catch (rollbackError) {
      const recovery = new Error(`project transaction rollback CAS refused; manual recovery required: ${String(rollbackError?.message || rollbackError)}`, { cause: error });
      primaryError = recovery;
      throw recovery;
    }
    if (linksTouched) {
      for (const item of [...linkPaths(gstackRoot)].reverse()) {
        const snapshot = snapshots.get(item.path);
        if (snapshot) restoreLink(item.path, snapshot);
      }
    }
    if (visibleNewProject) {
      const targetRoot = join(projectsRoot, project);
      const parked = join(projectsRoot, `.luca-aborted-target-${project}-${tx}`);
      try {
        const now = canonicalProjectIdentity(project, projectsRoot);
        if (now.project === project) renameSync(targetRoot, parked);
      } catch { /* never remove or rename an identity we can no longer prove */ }
    }
    if (staging && existsSync(staging)) {
      const parked = join(projectsRoot, `.luca-aborted-staging-${project}-${tx}`);
      try { renameSync(staging, parked); }
      catch { /* preserve the staging path in place if exact parking fails */ }
    }
    throw error;
  } finally {
    try {
      fault('before-lease-release');
      const released = releaseProjectLease({ root: gstackRoot, ownerHandle: lease.owner_handle });
      if (released.cleanup_required) {
        if (committedState) committedState.lease_release = released;
        process.stderr.write(`[project-pin] ⚠️ lease 已释放，但精确残留清理失败（不应重试事务）：${released.parked_path} — ${released.error}\n`);
      }
    } catch (error) {
      const warning = {
        released: false,
        recovery_required: true,
        error: String(error?.message || error),
        owner_handle: lease.owner_handle,
      };
      if (committedState) {
        // The binding CAS is the commit point. A later cleanup failure must not
        // turn a successful transaction into an apparent failure that callers
        // may retry; return the durable result and make recovery explicit.
        committedState.lease_release = warning;
        process.stderr.write(`[project-pin] ⚠️ 项目事务已提交，但 lease 释放失败；禁止重试事务，请按 owner_handle 显式恢复：${warning.error}\n`);
      } else {
        process.stderr.write(`[project-pin] ⚠️ 项目事务未提交且 lease 释放失败，需按 owner_handle 显式恢复：${warning.error}\n`);
        // Preserve the primary transaction error when one exists. If cleanup
        // is the only failure, it remains fatal.
        if (!primaryError) throw error;
      }
    }
  }
}

function injectProjectContext(project) {
  const { projectsRoot } = roots();
  const name = validateProjectName(project);
  const identity = canonicalProjectIdentity(name, projectsRoot);
  const memory = join(identity.realpath, '.luca', 'memory', 'MEMORY.md');
  const context = join(identity.realpath, 'CONTEXT.md');
  const chunks = [];
  if (existsSync(memory)) chunks.push(`🧠 项目本地记忆（${name}）:\n${readFileSync(memory, 'utf8')}`);
  if (existsSync(context)) chunks.push(`📌 项目 CONTEXT（${name}）:\n${readFileSync(context, 'utf8').split('\n').slice(0, 100).join('\n')}`);
  return chunks.join('\n\n');
}

function deactivateProject(sessionId) {
  const sid = sanitizeSessionId(sessionId);
  const { gstackRoot, projectsRoot } = roots();
  const current = readProjectState(gstackRoot, sid);
  if (!['BOUND', 'TURN_CLOSED'].includes(current.value.state)) throw new Error(`deactivate requires a closed binding, got ${current.value.state}`);
  const binding = validatedBindingForState(current.value, projectsRoot);
  const leaseToken = `${sid}-deactivate-${randomUUID()}`;
  const lease = acquireProjectLease({ root: gstackRoot, ownerToken: leaseToken, pid: process.pid });
  const snapshots = new Map();
  let touched = false;
  let committedResult = null;
  let primaryError = null;
  try {
    assertNoProjectWriteLease(binding.realpath, projectsRoot, 'current');
    const expectedTargets = new Map([
      [join(gstackRoot, 'docs'), join(binding.realpath, 'docs')],
      [join(gstackRoot, '.claude', 'workflow-state.yaml'), join(binding.realpath, '.luca', 'workflow-state.yaml')],
      [join(gstackRoot, '.claude', 'current-topic.txt'), join(binding.realpath, '.luca', 'current-topic.txt')],
    ]);
    for (const [path, target] of expectedTargets) {
      const snapshot = captureLink(path);
      snapshots.set(path, snapshot);
      if (snapshot.kind === 'symlink' && snapshot.target === target) { unlinkSync(path); touched = true; }
    }
    removeProjectStateCas(gstackRoot, sid, current.raw);
    committedResult = { state: 'NO_PIN', deactivated: binding.project };
    return committedResult;
  } catch (error) {
    primaryError = error;
    if (touched) for (const [path, snapshot] of snapshots) restoreLink(path, snapshot);
    throw error;
  } finally {
    try {
      fault('before-lease-release');
      const released = releaseProjectLease({ root: gstackRoot, ownerHandle: lease.owner_handle });
      if (released.cleanup_required) {
        if (committedResult) committedResult.lease_release = released;
        process.stderr.write(`[project-pin] ⚠️ lease 已释放，但精确残留清理失败（不应重试解绑）：${released.parked_path} — ${released.error}\n`);
      }
    } catch (error) {
      const warning = {
        released: false,
        recovery_required: true,
        error: String(error?.message || error),
        owner_handle: lease.owner_handle,
      };
      if (committedResult) {
        committedResult.lease_release = warning;
        process.stderr.write(`[project-pin] ⚠️ 项目解绑已提交，但 lease 释放失败；禁止重试解绑，请按 owner_handle 显式恢复：${warning.error}\n`);
      } else {
        process.stderr.write(`[project-pin] ⚠️ 项目解绑未提交且 lease 释放失败，需按 owner_handle 显式恢复：${warning.error}\n`);
        if (!primaryError) throw error;
      }
    }
  }
}

function status(sessionId) {
  const { gstackRoot } = roots();
  const state = readProjectState(gstackRoot, sessionId).value;
  const display_links = {};
  for (const item of linkPaths(gstackRoot)) {
    try {
      const st = lstatSync(item.path);
      display_links[item.key] = st.isSymbolicLink()
        ? { kind: 'symlink', target: readlinkSync(item.path), target_exists: existsSync(item.path) }
        : { kind: 'other' };
    } catch (error) {
      display_links[item.key] = error?.code === 'ENOENT' ? { kind: 'absent' } : { kind: 'error', error: String(error?.message || error) };
    }
  }
  return { ...state, display_links };
}

async function cli() {
  const command = process.argv[2];
  const sessionId = arg('--session') || arg('--session-id');
  const base = roots();
  let result;
  if (command === 'prepare') {
    result = prepareProjectSwitch({ ...base, sessionId, operation: arg('--operation'), target: arg('--target'), turnId: arg('--turn-id') });
    result = { ...result, ...result.switch };
  } else if (command === 'begin-turn') {
    result = beginProjectTurn({ ...base, sessionId, turnId: arg('--turn-id') });
  } else if (command === 'close-turn') {
    result = closeProjectTurn({ ...base, sessionId, turnId: arg('--turn-id'), expectedEpoch: arg('--expected-epoch'), outcome: arg('--outcome') || 'closed' });
  } else if (command === 'close-switch-turn') {
    result = closeSwitchTurn({ ...base, sessionId, turnId: arg('--turn-id'), expectedEpoch: arg('--expected-epoch'), outcome: arg('--outcome') || 'switch-terminal' });
  } else if (command === 'status') {
    result = status(sessionId);
  } else if (command === 'inspect-state-lock') {
    result = inspectProjectStateLock(base.gstackRoot, sessionId);
  } else if (command === 'recover-state-lock') {
    result = recoverProjectStateLock(base.gstackRoot, sessionId, JSON.parse(arg('--handle-json') || 'null'));
  } else if (command === 'migrate-legacy-pin') {
    result = migrateLegacyProjectState(base.gstackRoot, sessionId, base.projectsRoot);
  } else if (command === 'quarantine-legacy-pin') {
    result = quarantineLegacyProjectState(base.gstackRoot, sessionId, arg('--expected-project'));
  } else if (command === 'inject') {
    process.stdout.write(`${injectProjectContext(arg('--target'))}\n`);
    return;
  } else if (command === 'deactivate') {
    result = deactivateProject(sessionId);
  } else if (command === 'switch' || command === 'new') {
    result = executeProjectTransaction({
      sessionId,
      tx: arg('--tx'),
      operation: command,
      target: arg('--target'),
      expectedEpoch: arg('--expected-epoch'),
    });
  } else {
    throw new Error('usage: project-pin.mjs <prepare|begin-turn|close-turn|status|switch|new|inspect-state-lock|recover-state-lock|migrate-legacy-pin|quarantine-legacy-pin> ...');
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  cli().catch((error) => {
    process.stderr.write(`[project-pin] ${error.message}\n`);
    process.exitCode = 1;
  });
}
