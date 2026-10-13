#!/usr/bin/env node
// Process-level boundary tests. Native host timeout/launch enforcement is a
// separate live acceptance check; configuration assertions do not impersonate it.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hook = process.env.PSG_HOOK_UNDER_TEST || join(repo, '.claude/hooks/project-scope-guard.mjs');
const scratch = mkdtempSync(join(tmpdir(), 'scope-fail-closed-'));
mkdirSync(join(scratch, '.claude'));
const env = { ...process.env, CLAUDE_PROJECT_DIR: scratch, LUCA_GSTACK_ROOT: scratch,
  LUCA_PROJECTS_ROOT: join(scratch, 'projects') };
const payload = { session_id: 'failure-recovery', hook_event_name: 'PreToolUse',
  tool_name: 'Read', tool_input: { file_path: 'scripts/verify.sh' }, cwd: scratch };
function run(input, target = hook, extraArgs = []) {
  return spawnSync(process.execPath, [...extraArgs, target], { input, env, cwd: scratch, encoding: 'utf8', timeout: 10000 });
}
function denied(result) {
  assert.equal(result.error, undefined);
  assert.ok(result.status === 2 || (result.status === 0
    && JSON.parse(result.stdout).hookSpecificOutput.permissionDecision === 'deny'), result.stderr);
}
for (const input of ['', 'not json{', '{}', 'null', '[]', '0', 'true', '"text"',
  '{"tool_name":"Read"}', '{"tool_name":"Read","tool_input":[]}']) {
  denied(run(input));
}

// Inject faults only into an isolated copy / preload. Never modify active hooks.
const source = readFileSync(hook, 'utf8').replace(
  /(['"])(\.{1,2}\/[^'"\n]+\.mjs)\1/g,
  (_match, quote, specifier) => quote + new URL(specifier, pathToFileURL(hook)).href + quote,
);
assert.ok(source.includes('function main() {'), 'runtime fault seam must exist');
const broken = join(scratch, 'runtime-fault.mjs');
writeFileSync(broken, source.replace('function main() {', 'function main() { throw new Error("isolated runtime fault");'));
denied(run(JSON.stringify(payload), broken));
for (const name of ['project-substrate', 'project-read-grants', 'codex-child-project']) {
  const dependency = new URL(`./lib/${name}.mjs`, pathToFileURL(hook)).href;
  assert.ok(source.includes(dependency));
  const missingDependency = join(scratch, `missing-${name}.mjs`);
  writeFileSync(missingDependency, source.replace(dependency, pathToFileURL(join(scratch, 'missing-dependency.mjs')).href));
  denied(run(JSON.stringify(payload), missingDependency));
}
const preload = join(scratch, 'stdin-fault.mjs');
writeFileSync(preload, `import fs from 'node:fs'; import { syncBuiltinESMExports } from 'node:module';
const original = fs.readFileSync;
fs.readFileSync = function (path, ...args) { if (path === 0) throw new Error('isolated stdin fault'); return original.call(this, path, ...args); };
syncBuiltinESMExports();\n`);
denied(run(JSON.stringify(payload), hook, ['--import', preload]));

// A failure does not poison the next parsed call; NO_PIN still denies projects.
const safe = run(JSON.stringify(payload));
assert.equal(safe.status, 0, safe.stderr);
assert.equal(safe.stdout.trim(), '');
denied(run(JSON.stringify({ ...payload, tool_input: { file_path: 'docs/private.md' } })));
const settings = JSON.parse(readFileSync(join(repo, '.claude/settings.json'), 'utf8'));
const registration = settings.hooks.PreToolUse.flatMap(entry => entry.hooks)
  .find(entry => entry.command.includes('project-scope-guard.mjs'));
assert.equal(registration.onFailure, 'block', 'Claude startup/timeout errors must fail closed');
assert.doesNotMatch(registration.command, /\|\|\s*true/);
// Retain the registered launcher but keep its stderr log inside this fixture.
const isolatedLauncher = registration.command.replace('2>> /tmp/luca-gstack-hooks.log', `2>> "${join(scratch, 'launcher.log')}"`);
const missing = spawnSync('bash', ['-c', isolatedLauncher], {
  input: JSON.stringify(payload), env, cwd: scratch, encoding: 'utf8', timeout: 10000,
});
assert.notEqual(missing.status, 0, 'registered launcher must preserve missing-hook failure');
console.log('PASS scope failures: 10 malformed inputs, runtime/stdin/dependency faults, safe recovery, project denial and launcher policy');
console.log(`Evidence class: process boundary + configuration, not native-host enforcement. Scratch: ${scratch}`);
