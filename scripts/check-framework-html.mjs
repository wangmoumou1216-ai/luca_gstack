#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const frameworkDir = join(root, 'framework');
const baselinePath = join(root, 'scripts', 'baselines', 'framework-html.json');

function parseArgs(argv) {
  const result = { reportFile: null, validatorBin: process.env.HTML_VALIDATE_BIN || 'html-validate' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--report-file') result.reportFile = argv[++index];
    else if (argv[index] === '--validator-bin') result.validatorBin = argv[++index];
    else throw new Error(`unknown argument: ${argv[index]}`);
  }
  if (result.reportFile === undefined || result.validatorBin === undefined) {
    throw new Error('missing value for command-line argument');
  }
  return result;
}

function validatorVersion(validatorBin) {
  const result = spawnSync(validatorBin, ['--version'], { encoding: 'utf8' });
  if (result.error) throw new Error(`cannot execute ${validatorBin}: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`${validatorBin} --version failed (${result.status}): ${result.stderr.trim()}`);
  }
  const match = result.stdout.trim().match(/(\d+\.\d+\.\d+)$/);
  if (!match) throw new Error(`cannot parse validator version: ${result.stdout.trim()}`);
  return match[1];
}

function runValidator(validatorBin, htmlFiles) {
  const reportDir = mkdtempSync(join(tmpdir(), 'luca-framework-html-report-'));
  const reportPath = join(reportDir, 'report.json');
  try {
    const result = spawnSync(
      validatorBin,
      [`--formatter=json=${reportPath}`, ...htmlFiles.map((file) => join(frameworkDir, file))],
      { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
    );
    if (result.error) throw new Error(`cannot execute ${validatorBin}: ${result.error.message}`);
    if (![0, 1].includes(result.status)) {
      throw new Error(`${validatorBin} failed unexpectedly (${result.status}): ${result.stderr.trim()}`);
    }
    if (!existsSync(reportPath)) {
      const diagnostic = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join('\n') || 'no diagnostic output';
      throw new Error(
        `${validatorBin} exited ${result.status} without producing a JSON report:\n${diagnostic}`,
      );
    }
    return readFileSync(reportPath, 'utf8');
  } finally {
    rmSync(reportDir, { recursive: true, force: true });
  }
}

function countReport(rawReport) {
  const report = JSON.parse(rawReport);
  assert.ok(Array.isArray(report), 'html-validate JSON report must be an array');
  const counts = new Map();
  for (const fileResult of report) {
    assert.equal(typeof fileResult.filePath, 'string', 'report entry missing filePath');
    assert.ok(Array.isArray(fileResult.messages), 'report entry missing messages array');
    const absolutePath = resolve(fileResult.filePath);
    assert.equal(dirname(absolutePath), frameworkDir, `report path escapes framework/: ${fileResult.filePath}`);
    const file = basename(absolutePath);
    for (const message of fileResult.messages) {
      const rule = typeof message.ruleId === 'string' && message.ruleId ? message.ruleId : '__parser__';
      const key = `${file}\u0000${rule}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

function expectedCounts(baseline) {
  const counts = new Map();
  for (const [file, rules] of Object.entries(baseline.files)) {
    for (const [rule, count] of Object.entries(rules)) counts.set(`${file}\u0000${rule}`, count);
  }
  return counts;
}

function formatKey(key) {
  const [file, rule] = key.split('\u0000');
  return `${file} :: ${rule}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  assert.equal(baseline.schema_version, 1, 'unsupported framework HTML baseline schema');
  assert.equal(baseline.validator, 'html-validate', 'unexpected framework HTML validator');
  assert.equal(baseline.policy, 'exact-debt-snapshot', 'unexpected framework HTML baseline policy');

  const htmlFiles = readdirSync(frameworkDir).filter((file) => file.endsWith('.html')).sort();
  const baselineFiles = Object.keys(baseline.files).sort();
  assert.deepEqual(
    htmlFiles,
    baselineFiles,
    'framework HTML file set changed; validate the new set and update the baseline intentionally',
  );

  let rawReport;
  if (args.reportFile) {
    rawReport = readFileSync(args.reportFile, 'utf8');
  } else {
    const actualVersion = validatorVersion(args.validatorBin);
    assert.equal(
      actualVersion,
      baseline.validator_version,
      `html-validate version drift: expected ${baseline.validator_version}, got ${actualVersion}`,
    );
    rawReport = runValidator(args.validatorBin, htmlFiles);
  }

  const expected = expectedCounts(baseline);
  const actual = countReport(rawReport);
  const keys = [...new Set([...expected.keys(), ...actual.keys()])].sort();
  const differences = [];
  for (const key of keys) {
    const wanted = expected.get(key) || 0;
    const got = actual.get(key) || 0;
    if (got > wanted) differences.push(`REGRESSION ${formatKey(key)}: baseline=${wanted}, actual=${got}`);
    if (got < wanted) differences.push(`DEBT_REDUCED ${formatKey(key)}: baseline=${wanted}, actual=${got}; lower the committed baseline`);
  }
  if (differences.length > 0) {
    throw new Error(`framework HTML debt snapshot changed:\n${differences.join('\n')}`);
  }

  const total = [...actual.values()].reduce((sum, count) => sum + count, 0);
  console.log(`PASS framework HTML exact debt snapshot (${htmlFiles.length} files, ${total} known findings)`);
}

try {
  main();
} catch (error) {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
}
