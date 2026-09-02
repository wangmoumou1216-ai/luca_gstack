#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chmodSync, existsSync, lstatSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = ['grilling', 'diagnosing-bugs', 'resolving-merge-conflicts', 'to-spec', 'to-tickets', 'wayfinder', 'implement'];
const cases = new Map();

function test(name, fn) { cases.set(name, fn); }
function absolute(path) { return join(ROOT, path); }
function required(path) {
  const target = absolute(path);
  if (!existsSync(target)) throw new Error(`RED_NOT_IMPLEMENTED: missing ${path}`);
  return target;
}
function text(path) { return readFileSync(required(path), 'utf8'); }
function assertMatches(body, expressions, label) {
  for (const expression of expressions) assert.match(body, expression, `${label} lacks ${expression}`);
}

function assertInOrder(body, expressions, label) {
  let cursor = 0;
  for (const expression of expressions) {
    const match = body.slice(cursor).match(expression);
    assert.ok(match, `${label} lacks ordered step ${expression}`);
    cursor += match.index + match[0].length;
  }
}

const FIXTURE_ENV = {
  PATH: '/usr/bin:/bin',
  LANG: 'C',
  LC_ALL: 'C',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_COUNT: '0',
  GIT_OPTIONAL_LOCKS: '0',
  GIT_TERMINAL_PROMPT: '0',
};

function run(file, args, env = FIXTURE_ENV) {
  return spawnSync(file, args, { encoding: 'utf8', env });
}

function fixtureGit(repo, args, allowFailure = false) {
  const result = run('/usr/bin/git', ['--no-optional-locks', '-C', repo, ...args]);
  if (!allowFailure) assert.equal(result.status, 0, result.stderr || `git ${args[0]} failed`);
  return result;
}

function createRepositoryFixture(label) {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), `luca-engineering-delivery-${label}-`)));
  fixtureGit(repo, ['init', '-q']);
  fixtureGit(repo, ['config', 'user.name', 'Engineering Delivery Test']);
  fixtureGit(repo, ['config', 'user.email', 'engineering-delivery@example.invalid']);
  writeFileSync(join(repo, 'subject.txt'), 'base\n');
  fixtureGit(repo, ['add', 'subject.txt']);
  fixtureGit(repo, ['commit', '-qm', 'base']);
  return repo;
}

function createMarkerProgram(repo) {
  const marker = join(repo, 'PROGRAM_EXECUTED');
  const program = join(repo, 'marker.sh');
  writeFileSync(program, `#!/bin/sh\n/usr/bin/touch '${marker}'\nexit 0\n`);
  chmodSync(program, 0o755);
  return { marker, program };
}

function diagnosticRunner(repo, args) {
  return run(process.execPath, [
    absolute('.claude/skills/office/diagnosing-bugs/scripts/safe-diagnostic-runner.mjs'),
    '--repo', repo, '--', ...args,
  ]);
}

function conflictTransaction(repo, command, args = []) {
  return run(process.execPath, [
    absolute('.claude/skills/office/resolving-merge-conflicts/scripts/conflict-transaction.mjs'),
    command, '--repo', repo, ...args,
  ]);
}

function parseJsonOutput(result, label) {
  assert.equal(result.status, 0, `${label}: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

function assertDiagnosticRefusal(result, marker, label) {
  assert.notEqual(result.status, 0, `${label} must fail closed`);
  assert.equal(existsSync(marker), false, `${label} must be rejected before any configured program executes`);
}

function assertDiagnosticSuccess(result, marker, label) {
  assert.equal(result.status, 0, `${label} must remain diagnose-only usable: ${result.stderr}`);
  assert.equal(existsSync(marker), false, `${label} must be mechanically disabled, not executed`);
}

function verifyBenignRepositoryMetadata() {
  const repo = createRepositoryFixture('benign-metadata');
  const { marker, program } = createMarkerProgram(repo);
  for (const [key, value] of [
    ['core.fsmonitor', program],
    ['core.hooksPath', program],
    ['remote.origin.url', 'https://example.invalid/repo.git'],
    ['remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'],
    ['branch.main.remote', 'origin'],
    ['branch.main.merge', 'refs/heads/main'],
  ]) fixtureGit(repo, ['config', key, value]);
  assertDiagnosticSuccess(diagnosticRunner(repo, ['status', '--short']), marker, 'ordinary repository metadata');
}

function gitCommand(args, env = FIXTURE_ENV, allowFailure = false) {
  const result = run('/usr/bin/git', args, env);
  if (!allowFailure) assert.equal(result.status, 0, result.stderr || `git ${args[0]} failed`);
  return result;
}

function verifyLazyFetchIsMechanicallyDisabled() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'luca-engineering-delivery-lazy-fetch-')));
  const remote = join(root, 'remote.git');
  const seed = join(root, 'seed');
  const partial = join(root, 'partial');
  gitCommand(['init', '--bare', '-q', remote]);
  gitCommand(['init', '-q', seed]);
  gitCommand(['-C', seed, 'config', 'user.name', 'Lazy Fetch Test']);
  gitCommand(['-C', seed, 'config', 'user.email', 'lazy-fetch@example.invalid']);
  writeFileSync(join(seed, 'payload.txt'), 'payload-'.repeat(8192));
  gitCommand(['-C', seed, 'add', 'payload.txt']);
  gitCommand(['-C', seed, 'commit', '-qm', 'payload']);
  gitCommand(['-C', seed, 'branch', '-M', 'main']);
  gitCommand(['-C', seed, 'remote', 'add', 'origin', `file://${remote}`]);
  gitCommand(['-C', seed, 'push', '-q', 'origin', 'main']);
  gitCommand(['--git-dir', remote, 'symbolic-ref', 'HEAD', 'refs/heads/main']);
  gitCommand(['--git-dir', remote, 'config', 'uploadpack.allowFilter', 'true']);
  gitCommand(['--git-dir', remote, 'config', 'uploadpack.allowAnySHA1InWant', 'true']);
  gitCommand(['clone', '-q', '--filter=blob:none', '--no-checkout', `file://${remote}`, partial]);
  const oid = gitCommand(['-C', seed, 'rev-parse', 'HEAD:payload.txt']).stdout.trim();
  const noLazyEnv = { ...FIXTURE_ENV, GIT_NO_LAZY_FETCH: '1' };
  const missingBefore = gitCommand(['-C', partial, 'rev-list', '--objects', '--missing=print', 'HEAD'], noLazyEnv).stdout;
  assert.match(missingBefore, new RegExp(`^\\?${oid}$`, 'm'), 'fixture blob must start absent');
  const result = diagnosticRunner(partial, ['cat-file', '-p', oid]);
  assert.equal(result.status, 128, `lazy object access must fail without fetching: ${result.stderr}`);
  const missingAfter = gitCommand(['-C', partial, 'rev-list', '--objects', '--missing=print', 'HEAD'], noLazyEnv).stdout;
  assert.match(missingAfter, new RegExp(`^\\?${oid}$`, 'm'), 'diagnose-only command must not hydrate a missing object');
}

function verifyCurrentCheckoutDiagnostic() {
  const probe = gitCommand(['-C', ROOT, 'rev-parse', '--show-toplevel'], FIXTURE_ENV, true);
  if (probe.status !== 0 || realpathSync(probe.stdout.trim()) !== ROOT) return;
  const result = diagnosticRunner(ROOT, ['status', '--short']);
  assert.equal(result.status, 0, `checked-out repository must remain diagnosable: ${result.stderr}`);
}

function verifyDiagnosticProgramIsolation() {
  const repo = createRepositoryFixture('diagnostic');
  const { marker, program } = createMarkerProgram(repo);
  for (const [key, value, args] of [
    ['gpg.program', program, ['status', '--short']],
    ['filter.evil.process', program, ['status', '--short']],
    ['diff.evil.command', program, ['status', '--short']],
    ['alias.evil', `!${program}`, ['status', '--short']],
    ['core.pager', program, ['status', '--short']],
    ['pager.log', program, ['status', '--short']],
    ['hook.evil.command', program, ['status', '--short']],
    ['log.showSignature', 'true', ['status', '--short']],
  ]) {
    fixtureGit(repo, ['config', key, value]);
    assertDiagnosticRefusal(diagnosticRunner(repo, args), marker, key);
    fixtureGit(repo, ['config', '--unset-all', key]);
  }
  const included = join(repo, 'included.config');
  writeFileSync(included, `[core]\n\tfsmonitor = ${program}\n`);
  fixtureGit(repo, ['config', 'include.path', included]);
  assertDiagnosticRefusal(diagnosticRunner(repo, ['status', '--short']), marker, 'include.path');
  fixtureGit(repo, ['config', '--unset-all', 'include.path']);
  assertDiagnosticRefusal(diagnosticRunner(repo, ['show', '--show-signature', 'HEAD']), marker, '--show-signature');
  assertDiagnosticRefusal(diagnosticRunner(repo, ['cat-file', '--filters', 'HEAD:subject.txt']), marker, '--filters');
  assertDiagnosticRefusal(diagnosticRunner(repo, ['show', '--textconv', 'HEAD']), marker, '--textconv');
  const harmless = diagnosticRunner(repo, ['status', '--short']);
  assert.equal(harmless.status, 0, `benign diagnose-only command must remain available: ${harmless.stderr}`);
  assert.equal(existsSync(marker), false, 'benign diagnose-only command must not execute the marker program');
  verifyBenignRepositoryMetadata();
  verifyLazyFetchIsMechanicallyDisabled();
  verifyCurrentCheckoutDiagnostic();
}

function verifyConflictDoorPreconditions() {
  const repo = createRepositoryFixture('conflict');
  fixtureGit(repo, ['branch', '-M', 'main']);
  fixtureGit(repo, ['checkout', '-qb', 'other']);
  writeFileSync(join(repo, 'subject.txt'), 'other\n');
  fixtureGit(repo, ['commit', '-qam', 'other']);
  fixtureGit(repo, ['checkout', '-q', 'main']);
  writeFileSync(join(repo, 'subject.txt'), 'main\n');
  fixtureGit(repo, ['commit', '-qam', 'main']);
  const merge = fixtureGit(repo, ['merge', 'other'], true);
  assert.notEqual(merge.status, 0, 'fixture must enter a real merge conflict');

  const conflictedInspect = parseJsonOutput(conflictTransaction(repo, 'inspect'), 'inspect with conflicts');
  assert.equal(conflictedInspect.observation.operation, 'merge');
  assert.equal(conflictedInspect.observation.conflicts.length, 1);
  assert.notEqual(
    conflictTransaction(repo, 'approval-payload', ['--operation', 'advance']).status,
    0,
    'advance must fail closed while any unmerged entry remains',
  );

  writeFileSync(join(repo, 'subject.txt'), 'resolved-v1\n');
  const stageV1 = parseJsonOutput(
    conflictTransaction(repo, 'approval-payload', ['--operation', 'stage', '--path', 'subject.txt']),
    'stage v1',
  );
  assert.deepEqual(stageV1.approval_payload.preconditions.resolved_worktree_tuples, [{
    path: 'subject.txt',
    type: 'file',
    mode: '100644',
    sha256: 'e6be2128ed532da2caa19918676d55c7a53a417750e10d17241b6f5280055b52',
  }]);
  writeFileSync(join(repo, 'subject.txt'), 'resolved-v2\n');
  const stageV2 = parseJsonOutput(
    conflictTransaction(repo, 'approval-payload', ['--operation', 'stage', '--path', 'subject.txt']),
    'stage v2',
  );
  assert.notEqual(stageV1.approval_sha256, stageV2.approval_sha256, 'stage approval must bind exact current resolved bytes');
  assert.equal(stageV2.approval_payload.preconditions.resolved_worktree_tuples[0].sha256, '4337cd602dceb14265a67924118660941cf1059a67dc92c93e2675e4a17e94b4');

  fixtureGit(repo, ['add', 'subject.txt']);
  const resolvedInspect = parseJsonOutput(conflictTransaction(repo, 'inspect'), 'inspect with zero unmerged entries');
  assert.equal(resolvedInspect.observation.conflicts.length, 0);
  parseJsonOutput(conflictTransaction(repo, 'propose'), 'propose with zero unmerged entries');
  assert.notEqual(
    conflictTransaction(repo, 'approval-payload', ['--operation', 'stage', '--path', 'subject.txt']).status,
    0,
    'stage must be unavailable after every conflict is staged',
  );
  const advance = parseJsonOutput(
    conflictTransaction(repo, 'approval-payload', ['--operation', 'advance']),
    'advance with zero unmerged entries',
  );
  assert.deepEqual(advance.approval_payload.preconditions.zero_unmerged, {
    operation_active: true,
    conflicts_count: 0,
    conflicts_sha256: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
  });
  parseJsonOutput(conflictTransaction(repo, 'approval-payload', ['--operation', 'abort']), 'abort with zero unmerged entries');
}

function assertCanonicalSkill(name) {
  const path = `.claude/skills/office/${name}/SKILL.md`;
  const body = text(path);
  assert.match(body, new RegExp(`^---[\\s\\S]*?name:\\s*${name}(?:\\s|$)`, 'm'), `${path} must declare its canonical name`);
  assert.match(body, /FILE_END/, `${path} must have a FILE_END marker`);
  required(`.claude/skills/office/${name}/LICENSE`);
  required(`.claude/skills/office/${name}/agents/openai.yaml`);
  return body;
}

test('independent-methods', () => {
  const grilling = assertCanonicalSkill('grilling');
  const diagnosing = assertCanonicalSkill('diagnosing-bugs');
  const resolving = assertCanonicalSkill('resolving-merge-conflicts');
  assertMatches(grilling, [/one question|一次[^\n]{0,20}(?:问题|提问)/i, /human|用户|HITL/i], 'grilling');
  assertMatches(diagnosing, [/diagnos(?:e|is)-only|只诊断|diagnose only/i, /root cause|根因/i, /regression|unexpected failure|异常/i], 'diagnosing-bugs');
  assertMatches(resolving, [/real (?:git )?conflict|真实[^\n]{0,20}冲突/i, /inspect|检查/i, /propose|建议|提案/i], 'resolving-merge-conflicts');
  assertMatches(`${diagnosing}\n${resolving}`, [/never[^\n]{0,80}(?:commit|push)|禁止[^\n]{0,80}(?:commit|push)|不得[^\n]{0,80}(?:commit|push)/i], 'independent safety contract');
  for (const path of [
    '.claude/skills/office/diagnosing-bugs/scripts/safe-diagnostic-runner.mjs',
    '.claude/skills/office/diagnosing-bugs/scripts/safe-snapshot-copy.py',
    '.claude/skills/office/resolving-merge-conflicts/scripts/conflict-transaction.mjs',
  ]) required(path);
  verifyDiagnosticProgramIsolation();
  verifyConflictDoorPreconditions();
});

test('facade-owner-candidate', () => {
  const toSpec = assertCanonicalSkill('to-spec');
  const toTickets = assertCanonicalSkill('to-tickets');
  const wayfinder = assertCanonicalSkill('wayfinder');
  const implement = assertCanonicalSkill('implement');
  assertMatches(toSpec, [/tech-spec/i, /conversation[_ -]synthesis/i, /facade|薄门面|薄入口/i], 'to-spec');
  assertMatches(toTickets, [/task-plan/i, /tracer[- ]bullet/i, /blocking edges/i, /explicit-only/i], 'to-tickets');
  assertMatches(toTickets, [/sole owner|sole decomposition truth|唯一真值/i, /SHA-256/i, /preview/i, /read every created|read back/i], 'to-tickets owner and publication gates');
  assertMatches(toTickets, [/disable-model-invocation:\s*true/i], 'to-tickets Claude explicit-only policy');
  assertMatches(text('.claude/skills/office/to-tickets/agents/openai.yaml'), [/allow_implicit_invocation:\s*false/i], 'to-tickets Codex explicit-only policy');
  assertInOrder(toTickets, [
    /TASK PLAN GATE PASS/i,
    /Compute the lowercase SHA-256/i,
    /Quiz before any publication/i,
    /approves this exact preview/i,
    /Publish the approved projection/i,
    /Read back and report/i,
  ], 'to-tickets bind-preview-publish-readback sequence');
  assertMatches(text('.claude/skills/office/task-plan/SKILL.md'), [/to-tickets[\s\S]*implement/i], 'task-plan downstream publication/execution boundary');
  assertMatches(implement, [/ticket[\s\S]*projection[\s\S]*never grants execution authority/i], 'implement rejects ticket authority');
  assertMatches(wayfinder, [/Plan Agent/i, /huge|超大/i, /multi-session|多会话/i, /fog|迷雾|不确定/i], 'wayfinder');
  assertMatches(implement, [/task-plan/i, /Plan Agent/i, /Orchestrator/i, /approved[^\n]{0,40}U-ID|已批准[^\n]{0,40}U-ID/i], 'implement');
  assertMatches(implement, [/standalone/i, /optional[^\n]{0,40}graph|graph[^\n]{0,40}(?:optional|非依赖)/i], 'implement standalone contract');
  assertMatches(implement, [/## Compile barrier/i], 'selected-preset compile barrier');
  assertInOrder(implement, [
    /selected engineering-delivery preset/i,
    /canonical task-plan gate passes/i,
    /exact SHA-256 is frozen/i,
    /`implement compile` mode/i,
    /human confirmation/i,
    /explicit approval bound to those bytes/i,
  ], 'selected-preset compile sequence');
  assertMatches(text('.claude/skills/office/tech-spec/SKILL.md'), [/conversation[_ -]synthesis/i], 'tech-spec owner');
  const planAgent = text('.claude/agents/plan-agent.md');
  assertMatches(planAgent, [/wayfinder/i, /implement/i], 'Plan Agent owner');
  assertInOrder(planAgent, [
    /`implement compile` mode/i,
    /Phase gate 已 PASS/i,
    /最终\s*`task_plan_sha256`/i,
    /engineering-delivery preset/i,
    /exact U-ID/i,
    /明确确认/i,
    /同一份计划/i,
  ], 'Plan Agent same-payload confirmation sequence');
  assertMatches(text('.claude/agents/orchestrator.md'), [/diagnosing-bugs/i, /resolving-merge-conflicts/i], 'Orchestrator owner');
});

test('dual-loader-parity', () => {
  for (const name of SKILLS) {
    const canonical = realpathSync(required(`.claude/skills/office/${name}`));
    for (const prefix of ['.claude/skills', '.agents/skills']) {
      const aliasPath = required(`${prefix}/${name}`);
      assert.equal(lstatSync(aliasPath).isSymbolicLink(), true, `${prefix}/${name} must be a thin symlink`);
      assert.equal(realpathSync(aliasPath), canonical, `${prefix}/${name} must resolve to the project canonical tree`);
    }
    const command = text(`.claude/commands/${name}.md`);
    assertMatches(command, [new RegExp(`office/${name}/SKILL\\.md`), /read|读取|执行/i], `${name} command`);
  }
});

test('trigger-contract', () => {
  const routing = text('.claude/skill-os/skill-routing-map.yaml');
  const modes = text('.claude/skill-os/input-modes.yaml');
  for (const name of SKILLS) {
    assert.match(routing, new RegExp(`(?:^|\\n)[^\\n]*${name.replaceAll('-', '\\-')}(?:\\s|:|$)`, 'i'), `routing map must register ${name}`);
    assert.match(modes, new RegExp(name.replaceAll('-', '\\-'), 'i'), `input modes must register ${name}`);
  }
  assertMatches(routing, [/direct/i, /semantic/i, /internal/i], 'three-layer routing contract');
  const routeGuard = text('.claude/hooks/route-guard.mjs');
  assertMatches(routeGuard, [/Project Gate|project[^\n]{0,20}gate/i, /Plan Agent|complex/i], 'routing priority');
});

test('flow-and-owner-contract', () => {
  const graph = text('.claude/skill-os/optional-workflow-graph.yaml');
  assertMatches(graph, [/engineering-delivery/i, /optional|opt-in|selected/i], 'optional engineering-delivery graph');
  for (const name of SKILLS) assert.match(graph, new RegExp(name.replaceAll('-', '\\-'), 'i'), `engineering-delivery graph must name ${name}`);
  assertMatches(graph, [/tech-spec/i, /task-plan/i, /code-review/i], 'engineering-delivery core flow');
  const implement = text('.claude/skills/office/implement/SKILL.md');
  assertMatches(implement, [/task-plan[^\n]{0,100}(?:SHA|hash|冻结)/i, /confirm|确认|approved/i], 'compile barrier');
});

test('trigger-and-flow-contract', () => {
  cases.get('trigger-contract')();
  cases.get('flow-and-owner-contract')();
});

test('personal-collision-cutover', () => {
  const resolver = text('.claude/skill-os/compat/resolving-merge-conflicts/SKILL.md');
  const debuggerAdapter = text('.claude/skill-os/compat/systematic-debugging/SKILL.md');
  const transaction = text('scripts/skill-cutover-transaction.mjs');
  assertMatches(`${resolver}\n${debuggerAdapter}`, [/canonical|office/i, /compat|兼容/i], 'personal compatibility adapters');
  assertMatches(transaction, [/preimage/i, /backup/i, /rollback/i, /rename|atomic/i, /fresh/i], 'personal cutover transaction');
});

const inventory = [...cases.keys()];
function selected(argv) {
  if (argv.includes('--inventory')) return [];
  if (argv.includes('--all')) return inventory;
  const index = argv.indexOf('--case');
  if (index >= 0 && cases.has(argv[index + 1])) return [argv[index + 1]];
  throw new Error('usage: test-engineering-delivery-skills.mjs --inventory | --all | --case <name>');
}

let failures = 0;
try {
  const chosen = selected(process.argv.slice(2));
  if (process.argv.includes('--inventory')) {
    for (const name of inventory) process.stdout.write(`RED_NOT_IMPLEMENTED\t${name}\n`);
  }
  for (const name of chosen) {
    try { await cases.get(name)(); process.stdout.write(`PASS\t${name}\n`); }
    catch (error) {
      failures++;
      const prefix = String(error.message || '').includes('RED_NOT_IMPLEMENTED') ? 'RED_NOT_IMPLEMENTED' : 'FAIL';
      process.stderr.write(`${prefix}\t${name}\t${error.stack || error}\n`);
    }
  }
} catch (error) {
  failures++;
  process.stderr.write(`FAIL\tcli\t${error.message}\n`);
}
process.exitCode = failures ? 1 : 0;
