#!/usr/bin/env node
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checker = join(root, 'scripts', 'check-framework-html.mjs');
const baseline = JSON.parse(readFileSync(join(root, 'scripts', 'baselines', 'framework-html.json'), 'utf8'));
const tempDir = mkdtempSync(join(tmpdir(), 'luca-framework-html-test-'));

function reportFromBaseline() {
  return Object.entries(baseline.files).map(([file, rules]) => ({
    filePath: join(root, 'framework', file),
    messages: Object.entries(rules).flatMap(([ruleId, count]) =>
      Array.from({ length: count }, () => ({ ruleId, severity: 2, message: 'fixture' }))),
  }));
}

function run(name, mutate, expectedStatus, expectedText) {
  const report = reportFromBaseline();
  mutate(report);
  const reportPath = join(tempDir, `${name}.json`);
  writeFileSync(reportPath, `${JSON.stringify(report)}\n`);
  const result = spawnSync(process.execPath, [checker, '--report-file', reportPath], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, expectedStatus, `${name}: ${result.stdout}${result.stderr}`);
  assert.match(`${result.stdout}${result.stderr}`, expectedText, name);
  console.log(`PASS ${name}`);
}

run('exact-baseline', () => {}, 0, /PASS framework HTML exact debt snapshot/);
run(
  'new-finding-blocks',
  (report) => report[0].messages.push({ ruleId: 'new-rule', severity: 2, message: 'fixture' }),
  1,
  /REGRESSION .*new-rule: baseline=0, actual=1/,
);
run('debt-reduction-demands-ratchet', (report) => report[0].messages.pop(), 1, /DEBT_REDUCED/);
run(
  'parser-failure-blocks',
  (report) => report[0].messages.push({ ruleId: null, severity: 2, message: 'parse failed' }),
  1,
  /REGRESSION .*__parser__/,
);

const brokenValidator = join(tempDir, 'validator-no-report.mjs');
writeFileSync(
  brokenValidator,
  `#!/usr/bin/env node
if (process.argv.includes('--version')) {
  console.log('html-validate-11.10.0');
  process.exit(0);
}
console.error('validator runtime exploded');
process.exit(1);
`,
);
chmodSync(brokenValidator, 0o755);
const missingReport = spawnSync(process.execPath, [checker, '--validator-bin', brokenValidator], {
  cwd: root,
  encoding: 'utf8',
});
assert.equal(missingReport.status, 1, `${missingReport.stdout}${missingReport.stderr}`);
assert.match(`${missingReport.stdout}${missingReport.stderr}`, /validator runtime exploded/);
assert.doesNotMatch(`${missingReport.stdout}${missingReport.stderr}`, /ENOENT/);
console.log('PASS validator failure preserves the original diagnostic');

console.log('PASS framework HTML baseline contract 5/5');
