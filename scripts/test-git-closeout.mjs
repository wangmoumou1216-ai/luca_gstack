#!/usr/bin/env node
import assert from 'assert/strict';
import { spawnSync } from 'child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join, resolve } from 'path';
import {
  createHumanGateProposal,
  recordHumanGateApproval,
} from '../.claude/hooks/lib/human-gate-contract.mjs';
import { withoutLocalGitEnv } from '../.claude/hooks/lib/git-env.mjs';

const sourceRoot = process.cwd();
const cliSource = resolve(sourceRoot, 'scripts/git-closeout.mjs');
const tempRoot = mkdtempSync('/private/tmp/git-closeout-test-');
let passed = 0;

function pass(label) {
  passed += 1;
  process.stdout.write(`PASS ${label}\n`);
}

function run(command, args, { cwd = sourceRoot, env = {}, input = '', expected = 0 } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...withoutLocalGitEnv(), ...env },
    input,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== expected) {
    throw new Error(`${command} ${args.join(' ')} exited ${result.status}, expected ${expected}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return result;
}

function git(repo, args, options = {}) {
  return run('git', ['-C', repo, ...args], options);
}

function cli(args, options = {}) {
  return run(process.execPath, [cliSource, ...args], options);
}

function expectFailure(label, command, pattern) {
  assert.notEqual(command.status, 0, `${label} unexpectedly passed`);
  assert.match(`${command.stdout}\n${command.stderr}`, pattern, `${label} emitted the wrong rejection`);
  pass(label);
}

function fixtureRepo(name = 'repo') {
  const root = join(tempRoot, `${name}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(root, { recursive: true });
  run('git', ['init', '-q', '-b', 'main', root]);
  git(root, ['config', 'user.name', 'Fixture']);
  git(root, ['config', 'user.email', 'fixture@example.invalid']);
  writeFileSync(join(root, 'shared.txt'), 'base1\nbase2\nbase3\n');
  writeFileSync(join(root, 'other.txt'), 'other-base\n');
  git(root, ['add', 'shared.txt', 'other.txt']);
  git(root, ['commit', '-q', '-m', 'fixture: baseline']);
  return root;
}

function approvedPatchPath(root, name = 'approved.patch') {
  const path = join(root, name);
  writeFileSync(path, [
    'diff --git a/shared.txt b/shared.txt',
    '--- a/shared.txt',
    '+++ b/shared.txt',
    '@@ -1,3 +1,3 @@',
    ' base1',
    '-base2',
    '+plan2',
    ' base3',
    '',
  ].join('\n'));
  return path;
}

function prepareLocal(root, patch, descriptor, env = {}) {
  return cli([
    'prepare-local', '--repo', root, '--patch', patch, '--out', descriptor,
    '--plan-id', 'REX-U012', '--created-at', new Date().toISOString(),
  ], { env });
}

function verifyLocal(root, patch, descriptor, env = {}, expected = 0) {
  return cli(['verify-local', '--repo', root, '--patch', patch, '--descriptor', descriptor], { env, expected });
}

function installRuntime(root) {
  for (const dir of ['scripts', '.githooks', '.claude/hooks/lib']) mkdirSync(join(root, dir), { recursive: true });
  for (const [source, target] of [
    ['scripts/git-closeout.mjs', 'scripts/git-closeout.mjs'],
    ['.githooks/pre-commit', '.githooks/pre-commit'],
    ['.githooks/pre-commit-git-closeout', '.githooks/pre-commit-git-closeout'],
    ['.githooks/pre-push', '.githooks/pre-push'],
    ['.claude/hooks/lib/git-closeout-contract.mjs', '.claude/hooks/lib/git-closeout-contract.mjs'],
    ['.claude/hooks/lib/git-env.mjs', '.claude/hooks/lib/git-env.mjs'],
    ['.claude/hooks/lib/human-gate-contract.mjs', '.claude/hooks/lib/human-gate-contract.mjs'],
  ]) copyFileSync(resolve(sourceRoot, source), join(root, target));
  chmodSync(join(root, '.githooks/pre-commit'), 0o755);
  chmodSync(join(root, '.githooks/pre-commit-git-closeout'), 0o755);
  chmodSync(join(root, '.githooks/pre-push'), 0o755);
  chmodSync(join(root, 'scripts/git-closeout.mjs'), 0o755);
  git(root, ['config', 'core.hooksPath', '.githooks']);
}

function compileWriter() {
  const output = join(tempRoot, 'secure-receipt-writer');
  run('/usr/bin/cc', [
    '-std=c11', '-Wall', '-Wextra', '-Werror', '-pedantic', '-O2',
    resolve(sourceRoot, 'scripts/native/secure-receipt-writer.c'), '-o', output,
  ]);
  chmodSync(output, 0o700);
  return output;
}

function bare(name) {
  const root = join(tempRoot, name);
  run('git', ['init', '-q', '--bare', root]);
  return root;
}

function remoteFixture() {
  const repo = fixtureRepo('remote-source');
  const alpha = bare(`alpha-${Math.random().toString(16).slice(2)}.git`);
  const beta = bare(`beta-${Math.random().toString(16).slice(2)}.git`);
  git(repo, ['remote', 'add', 'alpha', alpha]);
  git(repo, ['remote', 'add', 'beta', beta]);
  git(repo, ['push', '-q', 'alpha', 'refs/heads/main:refs/heads/main']);
  git(repo, ['push', '-q', 'beta', 'refs/heads/main:refs/heads/main']);
  writeFileSync(join(repo, 'ahead.txt'), 'ahead\n');
  git(repo, ['add', 'ahead.txt']);
  git(repo, ['commit', '-q', '-m', 'fixture: approved ahead']);
  const descriptor = join(repo, 'remote-descriptor.json');
  const created = new Date(Date.now() - 2_000).toISOString();
  const expires = new Date(Date.now() + 10 * 60_000).toISOString();
  cli([
    'prepare-remote', '--repo', repo, '--remote', 'alpha',
    '--refspec', 'refs/heads/main:refs/heads/main', '--out', descriptor,
    '--plan-id', 'REX-U012', '--created-at', created, '--expires-at', expires,
  ]);
  return { repo, alpha, beta, descriptor, created, expires };
}

try {
  for (const schema of [
    '.claude/skill-os/git-local-descriptor.schema.json',
    '.claude/skill-os/git-remote-descriptor.schema.json',
    '.claude/skill-os/git-remote-receipt.schema.json',
  ]) {
    const value = JSON.parse(readFileSync(resolve(sourceRoot, schema), 'utf8'));
    assert.equal(value.additionalProperties, false);
    assert.ok(Array.isArray(value.required) && value.required.length > 5);
  }
  pass('three descriptor/receipt schemas are strict and closed');

  const operative = [
    'CLAUDE.md', 'AGENTS.md', 'CONTRIBUTING.md', 'README.md',
    '.claude/agents/plan-agent.md', '.claude/skill-os/correction-attribution.md',
    '.claude/skill-os/evolution/FUSION-RUNBOOK.md',
    '.claude/hooks/session-sync.mjs', '.claude/hooks/session-restore.mjs',
    '.claude/hooks/route-guard.mjs', 'scripts/check-behind-upstream.sh',
  ].map((path) => [path, readFileSync(resolve(sourceRoot, path), 'utf8')]);
  for (const [path, text] of operative) {
    assert.match(text, /git-closeout-policy/, `${path} lacks the SSOT pointer`);
    assert.doesNotMatch(text, /git pull|commit\+push|推到 GitHub|推回 GitHub/, `${path} retains executable stale advice`);
  }
  assert.doesNotMatch(readFileSync(resolve(sourceRoot, '.claude/hooks/session-restore.mjs'), 'utf8'), /spawn\('git',\s*\['fetch'/);
  assert.doesNotMatch(readFileSync(resolve(sourceRoot, 'scripts/check-behind-upstream.sh'), 'utf8'), /git fetch/);
  pass('operative Git consumers point to one policy and contain no automatic pull/push advice');

  const forbiddenSource = [
    readFileSync(resolve(sourceRoot, '.claude/hooks/lib/git-closeout-contract.mjs'), 'utf8'),
    readFileSync(resolve(sourceRoot, 'scripts/git-closeout.mjs'), 'utf8'),
  ].join('\n');
  assert.doesNotMatch(forbiddenSource, /(?:pull|rebase|stash|reset|clean)|--force|--no-verify/);
  assert.match(readFileSync(cliSource, 'utf8'), /'push', '--porcelain', '--'/);
  pass('Git closeout has one fixed non-force push surface and no destructive/history options');

  {
    const repo = fixtureRepo('local-exact');
    const patch = approvedPatchPath(repo);
    const descriptor = join(repo, 'local-descriptor.json');
    writeFileSync(join(repo, 'shared.txt'), 'base1\nplan2\nbase3\n');
    prepareLocal(repo, patch, descriptor);
    git(repo, ['apply', '--cached', patch]);
    const result = verifyLocal(repo, patch, descriptor);
    assert.match(result.stdout, /GIT_LOCAL_INDEX_PASS/);
    pass('clean exact approved hunk passes');
    git(repo, ['commit', '-q', '-m', 'fixture: exact local closeout']);
    const post = cli(['verify-local-commit', '--repo', repo, '--descriptor', descriptor, '--commit', 'HEAD']);
    assert.match(post.stdout, /GIT_LOCAL_COMMIT_PASS/);
    pass('local commit read-back binds parent/tree/path');
  }

  {
    const repo = fixtureRepo('local-same-file-wip');
    const patch = approvedPatchPath(repo);
    const descriptor = join(repo, 'local-descriptor.json');
    writeFileSync(join(repo, 'shared.txt'), 'base1\nplan2\nbase3\nUSER-WIP\n');
    prepareLocal(repo, patch, descriptor);
    git(repo, ['apply', '--cached', patch]);
    const indexBefore = git(repo, ['write-tree']).stdout.trim();
    const worktreeBefore = readFileSync(join(repo, 'shared.txt'));
    const result = verifyLocal(repo, patch, descriptor, {}, 2);
    expectFailure('same-file unknown WIP is BLOCKED_DIRTY_OVERLAP', result, /BLOCKED_DIRTY_OVERLAP/);
    assert.equal(git(repo, ['write-tree']).stdout.trim(), indexBefore);
    assert.deepEqual(readFileSync(join(repo, 'shared.txt')), worktreeBefore);
  }

  {
    const repo = fixtureRepo('local-broad');
    const patch = approvedPatchPath(repo);
    const descriptor = join(repo, 'local-descriptor.json');
    writeFileSync(join(repo, 'shared.txt'), 'base1\nplan2\nbase3\nUSER-WIP\n');
    prepareLocal(repo, patch, descriptor);
    git(repo, ['add', 'shared.txt']);
    const indexBefore = git(repo, ['write-tree']).stdout.trim();
    const bytesBefore = readFileSync(join(repo, 'shared.txt'));
    const result = verifyLocal(repo, patch, descriptor, {}, 2);
    expectFailure('broad same-file stage is BLOCKED_DIRTY_OVERLAP', result, /BLOCKED_DIRTY_OVERLAP/);
    assert.equal(git(repo, ['write-tree']).stdout.trim(), indexBefore);
    assert.deepEqual(readFileSync(join(repo, 'shared.txt')), bytesBefore);
    pass('failed local checker is zero-mutation');
  }

  {
    const consumer = readFileSync(resolve(sourceRoot, '.githooks/pre-commit'), 'utf8');
    const invocation = consumer.indexOf('/.githooks/pre-commit-git-closeout"');
    const fastBranch = consumer.indexOf('if [ "${FAST_COMMIT');
    assert.ok(invocation >= 0 && fastBranch >= 0 && invocation < fastBranch);
    const repo = fixtureRepo('local-mandatory-consumer');
    const patch = approvedPatchPath(repo);
    const descriptor = join(repo, 'local-descriptor.json');
    writeFileSync(join(repo, 'shared.txt'), 'base1\nplan2\nbase3\n');
    prepareLocal(repo, patch, descriptor);
    installRuntime(repo);
    git(repo, ['apply', '--cached', patch]);
    const indexBefore = git(repo, ['write-tree']).stdout.trim();
    const omitted = git(repo, ['commit', '-q', '-m', 'fixture: omitted closeout'], { expected: 1 });
    expectFailure('actual pre-commit blocks an omitted local closeout consumer', omitted, /GIT_LOCAL_CLOSEOUT_REQUIRED/);
    assert.equal(git(repo, ['write-tree']).stdout.trim(), indexBefore);
    const helper = run(join(repo, '.githooks/pre-commit-git-closeout'), [], {
      cwd: repo,
      env: {
        GIT_CLOSEOUT_LOCAL_DESCRIPTOR: descriptor,
        GIT_CLOSEOUT_LOCAL_PATCH: patch,
      },
    });
    assert.match(helper.stdout, /GIT_LOCAL_INDEX_PASS/);
    pass('mandatory pre-commit consumer accepts only the exact descriptor and patch');
  }

  {
    const repo = fixtureRepo('local-extra');
    const patch = approvedPatchPath(repo);
    const descriptor = join(repo, 'local-descriptor.json');
    prepareLocal(repo, patch, descriptor);
    git(repo, ['apply', '--cached', patch]);
    writeFileSync(join(repo, 'other.txt'), 'unauthorized\n');
    git(repo, ['add', 'other.txt']);
    const result = verifyLocal(repo, patch, descriptor, {}, 2);
    expectFailure('extra staged path is BLOCKED_DIRTY_OVERLAP', result, /BLOCKED_DIRTY_OVERLAP/);
  }

  {
    const repo = fixtureRepo('local-drift');
    const patch = approvedPatchPath(repo);
    const descriptor = join(repo, 'local-descriptor.json');
    prepareLocal(repo, patch, descriptor);
    const changedPatch = join(repo, 'changed.patch');
    writeFileSync(changedPatch, readFileSync(patch, 'utf8').replace('+plan2', '+other-plan'));
    const patchResult = verifyLocal(repo, changedPatch, descriptor, {}, 2);
    expectFailure('patch-byte drift is blocked', patchResult, /BLOCKED_DIRTY_OVERLAP/);
    writeFileSync(join(repo, 'advance.txt'), 'advance\n');
    git(repo, ['add', 'advance.txt']);
    git(repo, ['commit', '-q', '-m', 'fixture: unapproved base advance']);
    git(repo, ['apply', '--cached', patch]);
    const baseResult = verifyLocal(repo, patch, descriptor, {}, 2);
    expectFailure('base HEAD drift is blocked', baseResult, /BLOCKED_DIRTY_OVERLAP/);
  }

  {
    const sentinel = fixtureRepo('sentinel');
    const sentinelHead = git(sentinel, ['rev-parse', 'HEAD']).stdout.trim();
    const sentinelTree = git(sentinel, ['write-tree']).stdout.trim();
    const repo = fixtureRepo('poison-target');
    const patch = approvedPatchPath(repo);
    const descriptor = join(repo, 'local-descriptor.json');
    const poison = {
      GIT_DIR: join(sentinel, '.git'),
      GIT_WORK_TREE: sentinel,
      GIT_INDEX_FILE: join(sentinel, '.git', 'index'),
    };
    prepareLocal(repo, patch, descriptor, poison);
    assert.equal(git(sentinel, ['rev-parse', 'HEAD']).stdout.trim(), sentinelHead);
    assert.equal(git(sentinel, ['write-tree']).stdout.trim(), sentinelTree);
    pass('poisoned inherited GIT_* cannot redirect fixture Git operations');
  }

  const remote = remoteFixture();
  {
    const result = cli(['verify-remote-pre', '--repo', remote.repo, '--descriptor', remote.descriptor]);
    assert.match(result.stdout, /GIT_REMOTE_PRE_PASS/);
    pass('ahead ancestor exact remote descriptor passes preflight');
  }

  {
    const missing = cli([
      'prepare-remote', '--repo', remote.repo, '--refspec', 'refs/heads/main:refs/heads/main',
      '--out', join(remote.repo, 'missing.json'), '--plan-id', 'REX-U012',
      '--created-at', remote.created, '--expires-at', remote.expires,
    ], { expected: 2 });
    expectFailure('multi-remote repository never guesses a missing remote', missing, /missing --remote/);
  }

  {
    git(remote.repo, ['remote', 'set-url', '--push', 'alpha', remote.beta]);
    const changed = cli(['verify-remote-pre', '--repo', remote.repo, '--descriptor', remote.descriptor], { expected: 2 });
    expectFailure('changed remote URL is blocked', changed, /REMOTE_DESCRIPTOR_DRIFT/);
    git(remote.repo, ['remote', 'set-url', '--push', 'alpha', remote.alpha]);
  }

  {
    const value = JSON.parse(readFileSync(remote.descriptor, 'utf8'));
    value.force = true;
    const forced = join(remote.repo, 'forced.json');
    writeFileSync(forced, `${JSON.stringify(value, null, 2)}\n`);
    const result = cli(['verify-remote-pre', '--repo', remote.repo, '--descriptor', forced], { expected: 2 });
    expectFailure('force=true descriptor is rejected', result, /FORCE_FORBIDDEN/);
  }

  {
    const unrelated = fixtureRepo('unrelated');
    git(unrelated, ['commit', '--amend', '-q', '-m', 'fixture: unrelated baseline']);
    git(unrelated, ['remote', 'add', 'alpha', remote.alpha]);
    git(unrelated, ['fetch', '-q', 'alpha', 'refs/heads/main:refs/remotes/alpha/main']);
    const out = join(unrelated, 'nonff.json');
    const result = cli([
      'prepare-remote', '--repo', unrelated, '--remote', 'alpha',
      '--refspec', 'refs/heads/main:refs/heads/main', '--out', out,
      '--plan-id', 'REX-U012', '--created-at', remote.created, '--expires-at', remote.expires,
    ], { expected: 2 });
    expectFailure('non-fast-forward range is rejected', result, /NON_FAST_FORWARD/);
  }

  installRuntime(remote.repo);
  {
    const direct = git(remote.repo, ['push', 'alpha', 'refs/heads/main:refs/heads/main'], { expected: 1 });
    expectFailure('direct push without G-REMOTE approval is blocked by real pre-push hook', direct, /G_REMOTE_REQUIRED/);
  }

  const writer = compileWriter();
  const gateRoot = join(tempRoot, 'gate-receipts');
  mkdirSync(gateRoot);
  const planPath = join(tempRoot, 'gate-plan.md');
  const envelopePath = join(tempRoot, 'gate-envelope.json');
  writeFileSync(planPath, 'REX U012 fixture plan\n');
  writeFileSync(envelopePath, '{"mode":"fixture"}\n');
  const descriptorBytes = readFileSync(remote.descriptor);
  const proposal = createHumanGateProposal({
    receiptRoot: gateRoot,
    secureWriterPath: writer,
    gate: 'G-REMOTE',
    planBytes: readFileSync(planPath),
    payloadBytes: descriptorBytes,
    executionEnvelopeBytes: readFileSync(envelopePath),
    harness: 'codex',
    sessionId: 'u012-fixture',
    now: new Date(Date.now() - 2_000).toISOString(),
    expiresAt: new Date(Date.now() + 8 * 60_000).toISOString(),
  });
  const eventAt = new Date(Date.now() - 100).toISOString();
  recordHumanGateApproval({
    receiptRoot: gateRoot,
    secureWriterPath: writer,
    gate: 'G-REMOTE',
    proposalId: proposal.proposal.proposal_id,
    planBytes: readFileSync(planPath),
    payloadBytes: descriptorBytes,
    executionEnvelopeBytes: readFileSync(envelopePath),
    rawPromptBytes: Buffer.from(proposal.exactReply, 'utf8'),
    event: {
      role: 'user',
      top_level: true,
      authority: 'trusted-bootstrap-main',
      event_id: 'event-u012-fixture',
      event_created_at: eventAt,
      observed_at: eventAt,
      harness: 'codex',
      session_id: 'u012-fixture',
    },
  });
  const gateEnv = {
    GIT_CLOSEOUT_DESCRIPTOR: remote.descriptor,
    GIT_CLOSEOUT_GATE_ROOT: gateRoot,
    GIT_CLOSEOUT_GATE_PROPOSAL_ID: proposal.proposal.proposal_id,
    GIT_CLOSEOUT_GATE_PLAN: planPath,
    GIT_CLOSEOUT_GATE_ENVELOPE: envelopePath,
    GIT_CLOSEOUT_GATE_WRITER: writer,
  };

  {
    const descriptor = JSON.parse(descriptorBytes.toString('utf8'));
    const wrongRemote = cli([
      'pre-push', '--repo', remote.repo, '--descriptor', remote.descriptor,
      '--remote-name', 'beta', '--remote-url', remote.beta,
      '--gate-root', gateRoot, '--proposal-id', proposal.proposal.proposal_id,
      '--plan', planPath, '--envelope', envelopePath, '--writer', writer,
      '--execution-token', '0'.repeat(64),
    ], {
      input: `${descriptor.source_ref} ${descriptor.after} ${descriptor.destination_ref} ${descriptor.before}\n`,
      expected: 2,
    });
    expectFailure('wrong remote execution is blocked despite a valid approval', wrongRemote, /REMOTE_DESCRIPTOR_DRIFT/);
    const wrongRef = cli([
      'pre-push', '--repo', remote.repo, '--descriptor', remote.descriptor,
      '--remote-name', 'alpha', '--remote-url', remote.alpha,
      '--gate-root', gateRoot, '--proposal-id', proposal.proposal.proposal_id,
      '--plan', planPath, '--envelope', envelopePath, '--writer', writer,
      '--execution-token', '0'.repeat(64),
    ], {
      input: `${descriptor.source_ref} ${descriptor.after} refs/heads/wrong ${descriptor.before}\n`,
      expected: 2,
    });
    expectFailure('wrong destination ref is blocked despite a valid approval', wrongRef, /REMOTE_DESCRIPTOR_DRIFT/);
  }

  {
    const descriptor = JSON.parse(descriptorBytes.toString('utf8'));
    const forced = git(remote.repo, ['push', '--force', 'alpha', 'refs/heads/main:refs/heads/main'], { env: gateEnv, expected: 1 });
    expectFailure('direct force command cannot reuse a valid G-REMOTE approval', forced, /G_REMOTE_REQUIRED/);
    assert.equal(git(remote.repo, ['ls-remote', '--refs', remote.alpha, 'refs/heads/main']).stdout.split(/\s+/)[0], descriptor.before);
    const pushed = cli([
      'execute-remote', '--repo', remote.repo, '--descriptor', remote.descriptor,
      '--gate-root', gateRoot, '--proposal-id', proposal.proposal.proposal_id,
      '--plan', planPath, '--envelope', envelopePath, '--writer', writer,
    ]);
    assert.match(pushed.stdout, /GIT_REMOTE_EXECUTED/);
    pass('fresh exact G-REMOTE approval permits one controlled non-force update');
  }

  const receipt = join(remote.repo, 'remote-receipt.json');
  {
    const recorded = cli([
      'record-remote', '--repo', remote.repo, '--descriptor', remote.descriptor,
      '--out', receipt, '--observed-at', new Date().toISOString(),
      '--gate-root', gateRoot, '--proposal-id', proposal.proposal.proposal_id,
      '--plan', planPath, '--envelope', envelopePath, '--writer', writer,
    ]);
    assert.match(recorded.stdout, /GIT_REMOTE_RECEIPT_CREATED .* hgr-/);
    const receiptValue = JSON.parse(readFileSync(receipt, 'utf8'));
    assert.equal(receiptValue.gate, 'G-REMOTE');
    assert.equal(receiptValue.gate_proposal_id, proposal.proposal.proposal_id);
    const verified = cli([
      'verify-remote-post', '--repo', remote.repo, '--descriptor', remote.descriptor,
      '--receipt', receipt,
      '--gate-root', gateRoot, '--proposal-id', proposal.proposal.proposal_id,
      '--plan', planPath, '--envelope', envelopePath, '--writer', writer,
    ]);
    assert.match(verified.stdout, /GIT_REMOTE_POST_PASS .* hgr-/);
    pass('remote read-back receipt and human-gate result form one verified chain');
  }

  {
    const replay = cli(['verify-remote-pre', '--repo', remote.repo, '--descriptor', remote.descriptor], { expected: 2 });
    expectFailure('consumed descriptor replay is blocked', replay, /REMOTE_DESCRIPTOR_REPLAY/);
  }

  {
    const other = join(tempRoot, 'external-advance');
    run('git', ['clone', '-q', remote.alpha, other]);
    git(other, ['config', 'user.name', 'External']);
    git(other, ['config', 'user.email', 'external@example.invalid']);
    writeFileSync(join(other, 'external.txt'), 'external advance\n');
    git(other, ['add', 'external.txt']);
    git(other, ['commit', '-q', '-m', 'fixture: external advance']);
    git(other, ['push', '-q', 'origin', 'refs/heads/main:refs/heads/main']);
    const stale = cli([
      'verify-remote-post', '--repo', remote.repo, '--descriptor', remote.descriptor,
      '--receipt', receipt,
      '--gate-root', gateRoot, '--proposal-id', proposal.proposal.proposal_id,
      '--plan', planPath, '--envelope', envelopePath, '--writer', writer,
    ], { expected: 2 });
    expectFailure('post receipt replay fails after remote advances again', stale, /REMOTE_READBACK_REJECTED/);
  }

  process.stdout.write(`GIT_CLOSEOUT_TEST_PASS ${passed}\n`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
