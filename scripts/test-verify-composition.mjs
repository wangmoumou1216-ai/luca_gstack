#!/usr/bin/env node
// Deterministic composition contract for verify.sh + verify-codex-wiring.mjs.
//
// This test intentionally does not run the repository-wide verifier, a browser, or a live model.
// It combines static checks over the real entrypoints with two small derived harnesses:
//   - the real S30 -> S34 delegation control block, with check commands replaced by fakes;
//   - the real wiring CLI/S10 branch, with `node` replaced by a task-owned fake executable.
// Every mutation is performed in memory or below an OS temp directory.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = {
  verify: join(ROOT, 'scripts', 'verify.sh'),
  wiring: join(ROOT, 'scripts', 'verify-codex-wiring.mjs'),
  package: join(ROOT, 'package.json'),
  ci: join(ROOT, '.github', 'workflows', 'ci.yml'),
};

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name}\n  ${String(error?.stack || error).split('\n').join('\n  ')}`);
  }
}

function loadInputs() {
  return {
    verify: readFileSync(FILES.verify, 'utf8'),
    wiring: readFileSync(FILES.wiring, 'utf8'),
    package: readFileSync(FILES.package, 'utf8'),
    ci: readFileSync(FILES.ci, 'utf8'),
  };
}

function activeShellLines(source) {
  return source.split('\n').filter((line) => !/^\s*#/.test(line));
}

function activeShell(source) {
  return activeShellLines(source).join('\n');
}

function shellCheckRows(source) {
  return activeShellLines(source).flatMap((line, index) => {
    const match = line.match(/^\s*(check|warn)\s+([^\s]+)\b/);
    return match ? [{ kind: match[1], id: match[2], line: index, text: line.trim() }] : [];
  });
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function extractShellFunction(source, name) {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => new RegExp(`^${name}\\(\\) \\{$`).test(line.trim()));
  assert.notEqual(start, -1, `missing shell function ${name}`);
  const end = lines.findIndex((line, index) => index > start && line === '}');
  assert.notEqual(end, -1, `unterminated shell function ${name}`);
  return lines.slice(start, end + 1).join('\n');
}

function extractBetween(source, startNeedle, endNeedle, label) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0, `${label}: missing start marker ${startNeedle}`);
  assert.ok(end > start, `${label}: missing end marker ${endNeedle}`);
  return source.slice(start, end);
}

function issue(list, code, detail) {
  list.push({ code, detail });
}

function validateComposition(inputs) {
  const issues = [];
  const shell = activeShell(inputs.verify);
  const rows = shellCheckRows(inputs.verify);
  const rowsFor = (id) => rows.filter((row) => row.id === id);

  for (const id of ['C11', 'S30', 'S34']) {
    if (rowsFor(id).length !== 1) issue(issues, `${id}_CARDINALITY`, `${id} count=${rowsFor(id).length}`);
  }
  const c11 = rowsFor('C11')[0];
  const s30 = rowsFor('S30')[0];
  const s34 = rowsFor('S34')[0];
  if (c11 && s30 && s34 && !(c11.line < s30.line && s30.line < s34.line)) {
    issue(issues, 'ORDER', `C11=${c11.line} S30=${s30.line} S34=${s34.line}`);
  }

  if (!c11?.text.includes('npm run check:hooks --silent')) issue(issues, 'C11_COMMAND', c11?.text || 'missing');
  if (!s30?.text.includes('npm run check:harness --silent')) issue(issues, 'S30_COMMAND', s30?.text || 'missing');
  if (!s34?.text.includes('node scripts/verify-codex-wiring.mjs')) issue(issues, 'S34_COMMAND', s34?.text || 'missing');
  if (countMatches(shell, /npm run check:hooks --silent/g) !== 1) issue(issues, 'C11_DUPLICATE', 'check:hooks must execute once');
  if (countMatches(shell, /npm run check:harness --silent/g) !== 1) issue(issues, 'S30_DUPLICATE', 'check:harness must execute once');
  if (countMatches(shell, /node scripts\/verify-codex-wiring\.mjs/g) !== 1) issue(issues, 'S34_DUPLICATE', 'wiring verifier must execute once');

  if (/VERIFY_CODEX_CLAUDE_REGRESSION_COVERED/.test(inputs.verify + inputs.wiring)) {
    issue(issues, 'LEGACY_ENV', 'legacy inherited delegation authority remains');
  }
  if (!/CODEX_WIRING_ARGS="--static"/.test(shell)
      || !/CODEX_WIRING_ARGS="\$CODEX_WIRING_ARGS --delegate-claude-regression"/.test(shell)) {
    issue(issues, 'NAMED_DELEGATION', 'S34 does not use the named delegation flag');
  }
  if (!/C11_PASSED=\$LAST_CHECK_PASSED/.test(shell)
      || !/S30_PASSED=\$LAST_CHECK_PASSED/.test(shell)
      || !/\[ "\$C11_PASSED" -eq 1 \].*\[ "\$S30_PASSED" -eq 1 \]/s.test(shell)) {
    issue(issues, 'DELEGATION_PROVENANCE', 'delegation is not gated by fresh C11 + S30 success');
  }
  const delegateCall = shell.search(/^\s*delegate\s+S34\/S10\b/m);
  const s34Call = shell.search(/^\s*check\s+S34\b/m);
  if (!/\[ "\$SHOULD_DELEGATE_CLAUDE_REGRESSION" -eq 1 \]/.test(shell)
      || countMatches(shell, /^\s*delegate\s+S34\/S10\b/gm) !== 1
      || delegateCall < 0 || s34Call < 0 || delegateCall > s34Call) {
    issue(issues, 'DELEGATION_EVENT_ORDER', 'an authorized delegation must be recorded before S34 runs');
  }

  const delegateBody = (() => {
    try { return extractShellFunction(inputs.verify, 'delegate'); } catch { return ''; }
  })();
  if (!/^DELEGATED=0$/m.test(shell)
      || !/DELEGATED=\$\(\(DELEGATED \+ 1\)\)/.test(delegateBody)
      || /PASS=\$\(\(PASS \+ 1\)\)/.test(delegateBody)
      || !/DELEGATED/.test(delegateBody)) {
    issue(issues, 'DELEGATED_IS_PASS', 'top-level delegated accounting is absent or contaminates PASS');
  }
  if (!/PASS=\$PASS\s+FAIL=\$FAIL\s+WARN=\$WARN\s+DELEGATED=\$DELEGATED/.test(shell)) {
    issue(issues, 'TOP_SUMMARY', 'top-level summary lacks an independent DELEGATED field');
  }

  const preflightCall = shell.indexOf('\nrun_environment_preflight\n');
  const firstCheck = shell.search(/^\s*check\s+/m);
  if (preflightCall < 0 || firstCheck < 0 || preflightCall > firstCheck) {
    issue(issues, 'PREFLIGHT_ORDER', 'environment preflight must run before the first suite check');
  }
  const preflight = (() => {
    try { return extractShellFunction(inputs.verify, 'run_environment_preflight'); } catch { return ''; }
  })();
  const toolLoop = (preflight.match(/for tool in ([^;]+); do/) || [])[1] || '';
  const declaredTools = toolLoop.trim().split(/\s+/).filter(Boolean);
  for (const tool of ['bash', 'git', 'node', 'npm', 'python3']) {
    if (!declaredTools.includes(tool)) issue(issues, 'MISSING_DEPENDENCY', `preflight tool list omits ${tool}`);
  }
  for (const evidence of [
    ['repository/worktree', /rev-parse --show-toplevel[\s\S]*rev-parse --is-inside-work-tree/],
    ['writable temp', /mkdtempSync[\s\S]*writeFileSync[\s\S]*rmSync/],
    ['candidate-local Playwright', /package-lock\.json[\s\S]*require\.resolve\("playwright\/package\.json"\)[\s\S]*node_modules/],
    ['cached Chromium', /chromium\.launch\(\{ headless: true \}\)[\s\S]*browser\.close\(\)/],
    ['browser timeout', /process\.exit\(124\)/],
  ]) {
    if (!evidence[1].test(preflight)) issue(issues, 'MISSING_DEPENDENCY', `preflight omits ${evidence[0]}`);
  }
  if (/\b(?:npm\s+(?:ci|install)|npx\s+playwright\s+install|curl|wget|brew\s+install|apt(?:-get)?\s+install)\b/.test(preflight)) {
    issue(issues, 'PREFLIGHT_SIDE_EFFECT', 'preflight attempts an install or network fallback');
  }
  if (!/preflight_fail[\s\S]*BLOCKED[\s\S]*exit 2/.test(shell)) {
    issue(issues, 'PREFLIGHT_FAIL_CLOSED', 'environment failures are not BLOCKED/exit 2');
  }

  if (/\$\{?CI\}?|process\.env\.CI/.test(shell)) issue(issues, 'IMPLICIT_CI', 'verify.sh derives mode from CI environment');
  if (/process\.env\.CI/.test(inputs.wiring)) issue(issues, 'IMPLICIT_CI', 'wiring derives mode from CI environment');
  if (!/case "\$\{1:-\}" in[\s\S]*--ci\) VERIFY_MODE="ci"/.test(shell)
      || !/\[ "\$VERIFY_MODE" = "ci" \][\s\S]*CODEX_WIRING_ARGS="\$CODEX_WIRING_ARGS --ci"/.test(shell)) {
    issue(issues, 'EXPLICIT_CI', 'explicit --ci is not the sole top-level CI selector');
  }

  if (/verify[-_ ]?(?:proof|result)[-_ ]?(?:cache|stamp)|(?:cache|reuse)[-_ ]?(?:proof|result)/i.test(shell)) {
    issue(issues, 'STALE_PROOF', 'persistent proof/result reuse is forbidden');
  }

  if (!/allowedArgs\s*=\s*new Set\(\[[^\]]*'--static'[^\]]*'--ci'[^\]]*'--delegate-claude-regression'/s.test(inputs.wiring)
      || !/delegateClaudeRegression\s*=\s*args\.includes\('--delegate-claude-regression'\)/.test(inputs.wiring)) {
    issue(issues, 'WIRING_FLAGS', 'wiring CLI does not expose the exact named flags');
  }
  if (!/delegateClaudeRegression\s*&&\s*!staticOnly/.test(inputs.wiring)
      || !/duplicateArgs\.length\s*>\s*0/.test(inputs.wiring)
      || !/unknownArgs\.length\s*>\s*0/.test(inputs.wiring)
      || !/process\.exit\(2\)/.test(inputs.wiring)) {
    issue(issues, 'WIRING_CLI_FAIL_CLOSED', 'invalid/duplicate/delegate-without-static args do not fail fast');
  }
  const s10 = (() => {
    try { return extractBetween(inputs.wiring, 'if (delegateClaudeRegression) {', '\n// S11 ', 'wiring S10'); } catch { return ''; }
  })();
  if (!/delegate\('S10 Claude 路径零回归'/.test(s10)
      || !/else\s*\{[\s\S]*test-harness\.mjs[\s\S]*test-hooks\.mjs/.test(s10)) {
    issue(issues, 'WIRING_S10', 'S10 does not delegate explicitly and execute both regressions otherwise');
  }
  if (/delegateClaudeRegression[\s\S]*ok\([^\n]*S10[^\n]*,\s*true/.test(s10)) {
    issue(issues, 'DELEGATED_IS_PASS', 'wiring counts delegated S10 as PASS');
  }
  if (!/let pass = 0, fail = 0, blocked = 0, delegated = 0/.test(inputs.wiring)
      || !/DELEGATED=\$\{delegated\}/.test(inputs.wiring)) {
    issue(issues, 'WIRING_SUMMARY', 'wiring summary lacks independent delegated accounting');
  }

  let pkg = null;
  try { pkg = JSON.parse(inputs.package); } catch { issue(issues, 'PACKAGE_JSON', 'package.json is invalid JSON'); }
  if (pkg?.scripts?.['test:verify-composition'] !== 'node scripts/test-verify-composition.mjs') {
    issue(issues, 'PACKAGE_ENTRY', 'named composition-test script is missing or widened');
  }

  const ciHook = inputs.ci.indexOf('run: npm run check:hooks');
  const ciHarness = inputs.ci.indexOf('run: npm run check:harness');
  const ciWiring = inputs.ci.indexOf('run: node scripts/verify-codex-wiring.mjs --static --ci');
  if (!(ciHook >= 0 && ciHarness > ciHook && ciWiring > ciHarness)) {
    issue(issues, 'CI_EXISTING_STEPS', 'existing CI C11/S30/S34 commands or order changed');
  }
  if (countMatches(inputs.ci, /run: npm run test:verify-composition\s*$/gm) !== 1) {
    issue(issues, 'CI_ENTRY', 'CI must add exactly one named composition-test step');
  }
  if (/verify-codex-wiring\.mjs[^\n]*--delegate-claude-regression/.test(inputs.ci)) {
    issue(issues, 'CI_SCOPE', 'frozen CI S34 step must remain standalone/full, not delegated');
  }

  return issues;
}

function assertValid(inputs, label = 'composition') {
  const issues = validateComposition(inputs);
  assert.deepEqual(issues, [], `${label}: ${issues.map((entry) => `${entry.code}: ${entry.detail}`).join('; ')}`);
}

function expectMutation(base, name, mutate, expectedCode) {
  check(`mutation rejects ${name}`, () => {
    const changed = { ...base };
    mutate(changed);
    assert.notDeepEqual(changed, base, `${name}: mutation did not change input`);
    const issues = validateComposition(changed);
    assert.ok(issues.some((entry) => entry.code === expectedCode),
      `${name}: expected ${expectedCode}; got ${issues.map((entry) => entry.code).join(', ')}`);
  });
}

function runScript(path, args = [], options = {}) {
  return spawnSync(options.command || process.execPath, options.command ? [path, ...args] : [path, ...args], {
    cwd: options.cwd || ROOT,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
    timeout: options.timeout || 10_000,
  });
}

function resultBlob(result) {
  return `${result.stdout || ''}${result.stderr || ''}`;
}

function makeVerifyControlHarness(source, scratch) {
  const stanza = extractBetween(source, 'check S30 ', '\ncheck S35 ', 'verify S30/S34 stanza');
  const delegate = extractShellFunction(source, 'delegate');
  const verdictStart = source.lastIndexOf('if [ "$FAIL" -gt 0 ]; then');
  assert.ok(verdictStart >= 0, 'verify final FAIL verdict missing');
  const finalVerdict = source.slice(verdictStart);
  const path = join(scratch, 'verify-control.sh');
  writeFileSync(path, `#!/bin/bash
set -u
PASS=0
FAIL=0
WARN=0
DELEGATED=0
LAST_CHECK_PASSED=0
C11_PASSED="\${FAKE_C11_PASSED:-1}"
if [ "$C11_PASSED" -ne 1 ]; then FAIL=$((FAIL + 1)); fi
S30_CALLS=0
S34_CALLS=0
VERIFY_MODE="\${FAKE_VERIFY_MODE:-local}"
check() {
  local id="$1"
  if [ "$id" = "S30" ]; then
    S30_CALLS=$((S30_CALLS + 1))
    if [ "\${FAKE_S30_STATUS:-0}" -eq 0 ]; then LAST_CHECK_PASSED=1; else LAST_CHECK_PASSED=0; fi
  elif [ "$id" = "S34" ]; then
    S34_CALLS=$((S34_CALLS + 1))
    printf 'S34_COMMAND=%s\\n' "$3"
    if [ "\${FAKE_S34_STATUS:-0}" -eq 0 ]; then LAST_CHECK_PASSED=1; else LAST_CHECK_PASSED=0; fi
  else
    echo "unexpected check: $id" >&2
    exit 91
  fi
  if [ "$LAST_CHECK_PASSED" -eq 1 ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
}
${delegate}
${stanza}
printf 'RESULT PASS=%s FAIL=%s WARN=%s DELEGATED=%s C11=%s S30_CALLS=%s S34_CALLS=%s LAST=%s MODE=%s\\n' \
  "$PASS" "$FAIL" "$WARN" "$DELEGATED" "$C11_PASSED" "$S30_CALLS" "$S34_CALLS" "$LAST_CHECK_PASSED" "$VERIFY_MODE"
${finalVerdict}
`);
  chmodSync(path, 0o755);
  return path;
}

function makeWiringS10Harness(source, scratch) {
  const preludeEnd = source.indexOf("console.log('── [静态]");
  assert.ok(preludeEnd > 0, 'wiring harness: static section marker missing');
  const prelude = source.slice(0, preludeEnd);
  const s10 = extractBetween(source, 'if (delegateClaudeRegression) {', '\n// S11 ', 'wiring S10');
  const path = join(scratch, 'wiring-s10.mjs');
  writeFileSync(path, `${prelude}
${s10}
console.log(\`HARNESS PASS=\${pass} FAIL=\${fail} BLOCKED=\${blocked} DELEGATED=\${delegated} CI_MODE=\${ciMode} STATIC=\${staticOnly}\`);
process.exit(fail === 0 ? 0 : 1);
`);
  return path;
}

function makeFakeNode(scratch) {
  const bin = join(scratch, 'bin');
  mkdirSync(bin);
  const path = join(bin, 'node');
  writeFileSync(path, `#!/bin/sh
printf '%s\\n' "$*" >> "$FAKE_NODE_LOG"
case "$*" in
  *test-harness.mjs*)
    if [ "\${FAKE_HARNESS_MODE:-exit}" = "signal" ]; then kill -TERM "$$"; fi
    exit "\${FAKE_HARNESS_STATUS:-0}"
    ;;
  *test-hooks.mjs*)
    if [ "\${FAKE_HOOKS_MODE:-exit}" = "signal" ]; then kill -TERM "$$"; fi
    exit "\${FAKE_HOOKS_STATUS:-0}"
    ;;
  *) exit 99 ;;
esac
`);
  chmodSync(path, 0o755);
  return bin;
}

const base = loadInputs();

check('real composition statically satisfies U4/A4/T9-T10', () => assertValid(base));

expectMutation(base, 'missing C11', (copy) => {
  copy.verify = copy.verify.replace(/^check C11 .*\n/m, '');
}, 'C11_CARDINALITY');

expectMutation(base, 'missing S30', (copy) => {
  copy.verify = copy.verify.replace(/^check S30 .*\n/m, '');
}, 'S30_CARDINALITY');

expectMutation(base, 'S30 moved after S34', (copy) => {
  const line = copy.verify.match(/^check S30 .*\n/m)?.[0];
  assert.ok(line, 'S30 line not found');
  copy.verify = copy.verify.replace(line, '').replace(/^(check S34 .*\n)/m, `$1${line}`);
}, 'ORDER');

expectMutation(base, 'legacy inherited coverage environment', (copy) => {
  copy.verify = copy.verify.replace('--delegate-claude-regression', 'VERIFY_CODEX_CLAUDE_REGRESSION_COVERED=1');
}, 'LEGACY_ENV');

expectMutation(base, 'delegated result counted as PASS', (copy) => {
  copy.verify = copy.verify.replace('DELEGATED=$((DELEGATED + 1))', 'PASS=$((PASS + 1))');
}, 'DELEGATED_IS_PASS');

expectMutation(base, 'duplicate C11 execution', (copy) => {
  const line = copy.verify.match(/^check C11 .*\n/m)?.[0];
  assert.ok(line, 'C11 line not found');
  copy.verify = copy.verify.replace(line, line + line);
}, 'C11_CARDINALITY');

expectMutation(base, 'omitted node dependency', (copy) => {
  copy.verify = copy.verify.replace('for tool in bash git node npm python3', 'for tool in bash git npm python3');
}, 'MISSING_DEPENDENCY');

expectMutation(base, 'implicit CI environment authority', (copy) => {
  copy.wiring = copy.wiring.replace(
    "const ciMode = args.includes('--ci');",
    "const ciMode = process.env.CI === '1' || args.includes('--ci');",
  );
}, 'IMPLICIT_CI');

expectMutation(base, 'persistent stale proof cache', (copy) => {
  copy.verify = copy.verify.replace(
    'check() {',
    'check() {\n  local verify_result_cache="$PROJECT_ROOT/.verify-result-cache" # reuse result cache',
  );
}, 'STALE_PROOF');

expectMutation(base, 'wiring delegated S10 as PASS', (copy) => {
  copy.wiring = copy.wiring.replace(
    "delegate('S10 Claude 路径零回归', '由聚合入口本轮的 C11 + S30 覆盖');",
    "ok('S10 Claude 路径零回归', true);",
  );
}, 'WIRING_S10');

expectMutation(base, 'missing CI composition entry', (copy) => {
  copy.ci = copy.ci.replace(/^\s*- name: Verify composition contract and mutation counterexamples\n\s*run: npm run test:verify-composition\n/m, '');
}, 'CI_ENTRY');

const scratch = mkdtempSync(join(tmpdir(), 'verify-composition-'));
try {
  const verifyHarness = makeVerifyControlHarness(base.verify, scratch);

  check('verify aggregation delegates only after fresh C11 + S30 success', () => {
    const result = runScript(verifyHarness, [], {
      command: '/bin/bash',
      cwd: scratch,
      env: { FAKE_C11_PASSED: '1', FAKE_S30_STATUS: '0', FAKE_S34_STATUS: '0', FAKE_VERIFY_MODE: 'local' },
    });
    const blob = resultBlob(result);
    assert.equal(result.status, 0, blob);
    assert.match(blob, /S34_COMMAND=.*--static --delegate-claude-regression/);
    assert.doesNotMatch(blob, /S34_COMMAND=.*--ci/);
    assert.match(blob, /RESULT PASS=2 FAIL=0 WARN=0 DELEGATED=1 .*S30_CALLS=1 S34_CALLS=1/);
  });

  for (const [name, env] of [
    ['C11 failed', { FAKE_C11_PASSED: '0', FAKE_S30_STATUS: '0', FAKE_S34_STATUS: '0' }],
    ['S30 failed', { FAKE_C11_PASSED: '1', FAKE_S30_STATUS: '7', FAKE_S34_STATUS: '0' }],
  ]) {
    check(`verify aggregation does not delegate when ${name}`, () => {
      const result = runScript(verifyHarness, [], { command: '/bin/bash', cwd: scratch, env });
      const blob = resultBlob(result);
      assert.equal(result.status, 1, blob);
      assert.match(blob, /DELEGATED=0/);
      assert.match(blob, /S30_CALLS=1 S34_CALLS=1/);
    });
  }

  for (const status of [7, 124, 130]) {
    check(`verify preserves delegation but exits nonzero when S34 returns ${status}`, () => {
      const result = runScript(verifyHarness, [], {
        command: '/bin/bash', cwd: scratch,
        env: { FAKE_C11_PASSED: '1', FAKE_S30_STATUS: '0', FAKE_S34_STATUS: String(status) },
      });
      const blob = resultBlob(result);
      assert.equal(result.status, 1, blob);
      assert.match(blob, /RESULT PASS=1 FAIL=1 WARN=0 DELEGATED=1/);
      assert.match(blob, /S30_CALLS=1 S34_CALLS=1/);
    });
  }

  check('CI=1 cannot replace explicit --ci in verify aggregation', () => {
    const inherited = runScript(verifyHarness, [], {
      command: '/bin/bash', cwd: scratch,
      env: { CI: '1', FAKE_C11_PASSED: '1', FAKE_S30_STATUS: '0', FAKE_S34_STATUS: '0', FAKE_VERIFY_MODE: 'local' },
    });
    assert.doesNotMatch(resultBlob(inherited), /S34_COMMAND=.*--ci/);
    const explicit = runScript(verifyHarness, [], {
      command: '/bin/bash', cwd: scratch,
      env: { FAKE_C11_PASSED: '1', FAKE_S30_STATUS: '0', FAKE_S34_STATUS: '0', FAKE_VERIFY_MODE: 'ci' },
    });
    assert.match(resultBlob(explicit), /S34_COMMAND=.*--ci/);
  });

  const wiringHarness = makeWiringS10Harness(base.wiring, scratch);
  const fakeBin = makeFakeNode(scratch);
  const fakeLog = join(scratch, 'fake-node.log');
  const wiringRun = (args = [], env = {}) => {
    writeFileSync(fakeLog, '');
    const result = runScript(wiringHarness, args, {
      cwd: scratch,
      env: { PATH: `${fakeBin}:${process.env.PATH || ''}`, FAKE_NODE_LOG: fakeLog, ...env },
    });
    return { result, blob: resultBlob(result), calls: readFileSync(fakeLog, 'utf8').trim().split('\n').filter(Boolean) };
  };

  check('wiring standalone executes each Claude regression exactly once', () => {
    const run = wiringRun(['--static']);
    assert.equal(run.result.status, 0, run.blob);
    assert.match(run.blob, /HARNESS PASS=1 FAIL=0 BLOCKED=0 DELEGATED=0/);
    assert.equal(run.calls.filter((line) => /test-harness\.mjs/.test(line)).length, 1);
    assert.equal(run.calls.filter((line) => /test-hooks\.mjs/.test(line)).length, 1);
  });

  check('wiring named delegation executes no duplicate child and never increments PASS', () => {
    const run = wiringRun(['--static', '--delegate-claude-regression']);
    assert.equal(run.result.status, 0, run.blob);
    assert.match(run.blob, /DELEGATED S10/);
    assert.match(run.blob, /HARNESS PASS=0 FAIL=0 BLOCKED=0 DELEGATED=1/);
    assert.deepEqual(run.calls, []);
  });

  check('legacy env is ignored and cannot authorize delegation', () => {
    const run = wiringRun(['--static'], { VERIFY_CODEX_CLAUDE_REGRESSION_COVERED: '1' });
    assert.equal(run.result.status, 0, run.blob);
    assert.match(run.blob, /HARNESS PASS=1 FAIL=0 BLOCKED=0 DELEGATED=0/);
    assert.equal(run.calls.length, 2);
  });

  check('CI=1 is ignored while explicit --ci selects wiring CI mode', () => {
    const inherited = wiringRun(['--static'], { CI: '1' });
    assert.match(inherited.blob, /CI_MODE=false/);
    const explicit = wiringRun(['--static', '--ci']);
    assert.match(explicit.blob, /CI_MODE=true/);
  });

  for (const scenario of [
    ['failed child', { FAKE_HARNESS_STATUS: '7' }],
    ['timed-out child status', { FAKE_HARNESS_STATUS: '124' }],
    ['interrupted child signal', { FAKE_HARNESS_MODE: 'signal' }],
    ['second child failure', { FAKE_HOOKS_STATUS: '9' }],
  ]) {
    check(`wiring does not turn ${scenario[0]} into PASS`, () => {
      const run = wiringRun(['--static'], scenario[1]);
      assert.equal(run.result.status, 1, run.blob);
      assert.match(run.blob, /HARNESS PASS=0 FAIL=1 BLOCKED=0 DELEGATED=0/);
    });
  }

  check('a fresh failing execution cannot reuse a prior PASS', () => {
    const first = wiringRun(['--static']);
    assert.equal(first.result.status, 0, first.blob);
    const second = wiringRun(['--static'], { FAKE_HARNESS_STATUS: '7' });
    assert.equal(second.result.status, 1, second.blob);
    assert.match(second.blob, /HARNESS PASS=0 FAIL=1/);
  });

  for (const [name, args, env] of [
    ['unknown argument', ['--unknown'], {}],
    ['duplicate argument', ['--static', '--static'], {}],
    ['delegation without --static', ['--delegate-claude-regression'], {}],
    ['CI=1 cannot legalize delegation without --static', ['--delegate-claude-regression'], { CI: '1' }],
  ]) {
    check(`wiring rejects ${name} before children`, () => {
      const run = wiringRun(args, env);
      assert.equal(run.result.status, 2, run.blob);
      assert.deepEqual(run.calls, []);
    });
  }

  check('verify preflight blocks a missing dependency before all suites', () => {
    const sparseBin = join(scratch, 'sparse-bin');
    mkdirSync(sparseBin);
    const dirnameProbe = spawnSync('/bin/sh', ['-c', 'command -v dirname'], { encoding: 'utf8' });
    assert.equal(dirnameProbe.status, 0, dirnameProbe.stderr);
    symlinkSync(dirnameProbe.stdout.trim(), join(sparseBin, 'dirname'));
    const result = spawnSync('/bin/bash', [FILES.verify], {
      cwd: ROOT,
      env: { ...process.env, PATH: sparseBin },
      encoding: 'utf8',
      timeout: 5_000,
    });
    const blob = resultBlob(result);
    assert.equal(result.status, 2, blob);
    assert.match(blob, /BLOCKED: environment admission failed before verification suites/);
    assert.doesNotMatch(blob, /\[ Git 基础设施 \]|C11:|S30:|S34:/);
  });
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

console.log(`\nverify composition: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
