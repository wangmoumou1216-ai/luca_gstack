#!/usr/bin/env node
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'quality-gates-scope-')));
const root = join(scratch, 'framework');
const projects = join(scratch, 'projects');
const project = join(projects, 'alpha');
const foreign = join(projects, 'foreign');
const script = join(root, 'scripts/check-quality-gates.mjs');
const fixture = `# Handoff
gate_result: CONDITIONAL_PASS
criteria:
  - "[C1] Input preserved PASS evidence: source.md"
  - "[C2] Scope preserved PASS evidence: scope-check"
  - "[C3] External result UNKNOWN reason: not observed"
## Decisions
Keep scope.
## Constraints
Exact target only.
## Risks
External evidence pending.
## Outputs
report.md
`;
function write(path, body) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}
const guard = join(scratch, 'guard.cjs');
const aliases = [join(root, 'docs'), join(root, '.claude/workflow-state.yaml'), join(root, '.claude/current-topic.txt'), foreign];
write(guard, `const fs = require('node:fs');
const path = require('node:path');
const denied = ${JSON.stringify(aliases)}.concat(JSON.parse(process.env.EXTRA_DENIED || '[]'));
for (const name of ['existsSync', 'readFileSync', 'readdirSync', 'statSync', 'lstatSync', 'realpathSync', 'readlinkSync']) {
  const original = fs[name];
  fs[name] = function (target, ...rest) {
    if (typeof target === 'string' || target instanceof URL) {
      const absolute = path.resolve(String(target));
      if (denied.some(p => absolute === p || absolute.startsWith(p + '/'))) {
        throw new Error('FORBIDDEN_ALIAS_READ: ' + absolute);
      }
    }
    return original.call(this, target, ...rest);
  };
}
require('node:module').syncBuiltinESMExports();
`);
function run(args = [], extraDenied = [], cwd = root) {
  return spawnSync(process.execPath, ['--require', guard, script, ...args], {
    cwd, encoding: 'utf8', env: { ...process.env, LUCA_PROJECTS_ROOT: projects, EXTRA_DENIED: JSON.stringify(extraDenied) },
  });
}
function passes(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
function rejects(result, reason) {
  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stderr, reason);
  assert.doesNotMatch(result.stderr, /FORBIDDEN_ALIAS_READ/, 'scope refusal must occur before any forbidden read');
}

try {
  for (const rel of ['scripts/check-quality-gates.mjs', '.claude/agents/preflight-agent.md', '.claude/agents/quality-gate.md', '.claude/hooks/lib/project-substrate.mjs']) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    copyFileSync(join(source, rel), join(root, rel));
  }
  mkdirSync(join(project, 'docs/handoff'), { recursive: true });
  mkdirSync(join(project, '.luca'), { recursive: true });
  mkdirSync(foreign, { recursive: true });
  symlinkSync(foreign, join(root, 'docs'));
  symlinkSync(join(foreign, 'workflow-state.yaml'), join(root, '.claude/workflow-state.yaml'));
  symlinkSync(join(foreign, 'current-topic.txt'), join(root, '.claude/current-topic.txt'));

  passes(run());
  passes(run(['--framework']));
  const original = readFileSync(script, 'utf8');
  writeFileSync(script, original.replace('const root = process.cwd();', "const root = process.cwd();\nexistsSync(join(root, 'docs'));"));
  const mutation = run();
  assert.equal(mutation.status, 1);
  assert.match(mutation.stderr, /FORBIDDEN_ALIAS_READ:.*framework\/docs/);
  writeFileSync(script, original);
  passes(run());
  console.log('PASS framework default/explicit: forbidden alias read mutation rejected and restored');

  const exact = join(scratch, 'exact-handoff.md');
  writeFileSync(exact, fixture);
  const unrelated = [join(root, '.claude/agents'), join(root, '.claude/hooks')];
  passes(run(['--handoff', exact], unrelated));
  writeFileSync(exact, fixture.replace('gate_result: CONDITIONAL_PASS\n', ''));
  rejects(run(['--handoff', exact], unrelated), /missing gate_result/);
  writeFileSync(exact, fixture);
  passes(run(['--handoff', exact], unrelated));
  rejects(run(['--handoff', 'docs/handoff/exact-handoff.md']), /NO_PIN refuses shared project alias/);
  rejects(run(['--handoff', join(root, 'docs/handoff/exact-handoff.md')]), /NO_PIN refuses shared project alias/);
  rejects(run(['--project-session', 'absent']), /TURN_ACTIVE verified project pin/);
  rejects(run(['--project-session', '../invalid']), /invalid exact session id/);
  rejects(run(['--framework', '--handoff', exact]), /cannot be combined/);
  console.log('PASS exact handoff: no unrelated reads; malformed rejection/recovery; unbound aliases refused');

  const st = statSync(project);
  const pin = { schema_version: 2, state: 'TURN_ACTIVE', session_id: 'test',
    binding: { project: 'alpha', realpath: project, dev: st.dev, ino: st.ino, epoch: 1 },
    turn: { turn_id: 'fixture-turn', epoch: 1 } };
  const pinPath = join(root, '.claude/.session-project-test');
  const statePath = join(project, '.luca/workflow-state.yaml');
  const handoff = join(project, 'docs/handoff/2026-09-05-test-handoff.md');
  writeFileSync(pinPath, JSON.stringify(pin));
  writeFileSync(statePath, 'mode: "workflow"\nnodes:\n  design-brief:\n    status: DONE\n    output: "docs/missing.md"\n');
  writeFileSync(handoff, fixture);
  const scoped = run(['--project-session', 'test']);
  passes(scoped);
  assert.match(scoped.stderr, /WARN workflow-state design-brief.output points to missing path: docs\/missing.md/);
  passes(run(['--project-session', 'test', '--handoff', 'docs/handoff/2026-09-05-test-handoff.md'], [statePath]));
  writeFileSync(handoff, fixture.replace('gate_result: CONDITIONAL_PASS\n', ''));
  rejects(run(['--project-session', 'test']), /missing gate_result/);
  writeFileSync(handoff, fixture);
  passes(run(['--project-session', 'test']));
  writeFileSync(statePath, 'mode: "workflow"\nnodes:\n  design-brief:\n    status: DONE\n    output: "../foreign/secret.md"\n');
  rejects(run(['--project-session', 'test']), /path outside verified project/);
  writeFileSync(statePath, 'mode: "workflow"\nnodes:\n');
  symlinkSync(join(foreign, 'secret.md'), join(project, 'docs/escape-handoff.md'));
  rejects(run(['--project-session', 'test', '--handoff', 'docs/escape-handoff.md']), /must not traverse symlink/);
  writeFileSync(pinPath, JSON.stringify({ ...pin, turn: { ...pin.turn, epoch: 2 } }));
  rejects(run(['--project-session', 'test']), /turn epoch snapshot is invalid/);
  writeFileSync(pinPath, 'alpha\n');
  rejects(run(['--project-session', 'test']), /legacy project pin requires explicit migration/);
  writeFileSync(pinPath, JSON.stringify(pin));
  passes(run(['--project-session', 'test']));
  console.log('PASS verified project: handoff and last DONE node checked; escape/symlink/stale/legacy rejected; recovery passed');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
