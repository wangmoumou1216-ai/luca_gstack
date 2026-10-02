#!/usr/bin/env node
// Runs the actual documented assertions; this is a local shell test, not a native QG verdict.
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
let sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let evidencePath;
let keepFixtures = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--source-root' && args[i + 1]) sourceRoot = resolve(args[++i]);
  else if (args[i] === '--evidence' && args[i + 1]) evidencePath = args[++i];
  else if (args[i] === '--keep-fixtures') keepFixtures = true;
  else throw new Error(`Unknown/incomplete option: ${args[i]}`);
}
if (evidencePath && !isAbsolute(evidencePath)) throw new Error('--evidence requires an absolute path');

const surfaces = [
  ['.claude/agents/plan-agent.md', 4],
  ['.claude/agents/references/plan-design-guidance.md', 1],
  ['.claude/agents/references/plan-assertion-examples.md', 16],
];
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const sha256 = text => createHash('sha256').update(text).digest('hex');
const failures = [];
const extracted = [];
const runs = [];
const fixtureRoot = mkdtempSync(join(tmpdir(), 'verification-exit-contract-'));
const executable = (path, body) => {
  writeFileSync(path, `#!/bin/bash\n${body}\n`);
  chmodSync(path, 0o755);
};
const realPython = spawnSync('/bin/bash', ['-c', 'command -v python3'], { encoding: 'utf8' }).stdout.trim();
const realRg = spawnSync('/bin/bash', ['-c', 'command -v rg'], { encoding: 'utf8' }).stdout.trim();
if (!isAbsolute(realPython) || !isAbsolute(realRg)) throw new Error('python3 and rg must be available');

function extract(source, expectedCount) {
  const text = readFileSync(join(sourceRoot, source), 'utf8');
  const lines = text.split('\n');
  let inBash = false;
  let current;
  const assertions = [];
  const finish = () => {
    if (!current) return;
    while (current.lines.length && !current.lines.at(-1).trim()) current.lines.pop();
    current.command = current.lines.join('\n');
    current.endLine = current.startLine + current.lines.length;
    delete current.lines;
    assertions.push(current);
    current = undefined;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === '```bash') { inBash = true; continue; }
    if (inBash && line === '```') { finish(); inBash = false; continue; }
    if (!inBash) continue;
    const header = line.match(/^# \[(BLOCKING|WARNING)\] <ID> — (.+)$/);
    if (header) {
      finish();
      current = { source, sourceSha256: sha256(text), startLine: i + 1, header: line,
        level: header[1], description: header[2], lines: [] };
    } else if (current) current.lines.push(line);
  }
  finish();
  if (assertions.length !== expectedCount) failures.push(`${source}: expected ${expectedCount} actual templates, found ${assertions.length}`);
  return assertions;
}

function kind(assertion) {
  if (assertion.command.includes('<check_command>')) return 'generic';
  if (assertion.description.includes('skill handoff 文件存在')) return 'handoff-file';
  if (assertion.description.includes('skill handoff 包含必要字段')) return 'handoff-field';
  const kinds = {
    'MagicPath component build completed': 'magicpath', '文件存在': 'file', '目录存在': 'directory',
    '文件包含关键词': 'grep', '文件不包含某词': 'negative-grep', '文件可执行': 'executable',
    'Node.js 语法合法': 'node', 'Python 语法合法': 'python', 'YAML 合法': 'yaml', 'JSON 合法': 'json',
    'Shell 脚本退出码 0': 'shell', 'git 仓库存在': 'git-dir', 'git hooks 路径配置': 'git-hooks',
    'npm 测试套件通过': 'npm', 'pytest 套件通过': 'pytest', 'swift 测试套件通过': 'swift',
    '项目 verify 脚本通过': 'verify',
  };
  return kinds[assertion.description];
}

function scenarios(type) {
  const cases = ['success', 'failure'];
  if (['generic', 'magicpath', 'negative-grep', 'node', 'npm', 'pytest', 'swift', 'handoff-field'].includes(type)) cases.push('tool-error');
  if (['generic', 'magicpath', 'git-hooks'].includes(type)) cases.push('pipeline-error');
  if (['file', 'directory', 'executable', 'handoff-file', 'handoff-field', 'grep', 'negative-grep', 'node', 'python', 'yaml', 'json', 'shell'].includes(type)) cases.push('missing');
  if (type === 'negative-grep') cases.push('negative-search-error');
  if (type === 'generic') cases.push('negative-rg-error');
  return cases;
}

function prepare(assertion, type, scenario) {
  const dir = join(fixtureRoot, `${assertion.id}-${scenario}`);
  const bin = join(dir, 'bin');
  mkdirSync(bin, { recursive: true });
  symlinkSync(process.execPath, join(bin, 'node'));
  symlinkSync(realRg, join(bin, 'rg'));
  const failed = scenario === 'failure';
  const toolError = scenario === 'tool-error';
  const pipelineError = scenario === 'pipeline-error';
  const externalRc = toolError ? 127 : failed ? 5 : 0;
  for (const tool of ['npm', 'swift']) executable(join(bin, tool), `echo 'isolated ${tool} fixture' >&2\nexit ${externalRc}`);
  executable(join(bin, 'python3'), `if [ "$1" = '-m' ] && [ "$2" = 'pytest' ]; then\n  echo 'isolated pytest fixture' >&2\n  exit ${externalRc}\nfi\nexec ${quote(realPython)} "$@"`);
  executable(join(bin, 'fixture_check'), `echo 'isolated check' >&2\nexit ${toolError ? 17 : pipelineError ? 23 : failed ? 1 : 0}`);
  executable(join(bin, 'npx'), `echo 'isolated MagicPath status fixture' >&2\nprintf '%s\\n' '${failed ? '{"status":"pending"}' : '{"status":"completed"}'}'\nexit ${toolError ? 17 : pipelineError ? 23 : 0}`);
  const hooksPath = join(dir, 'exact hooks path');
  executable(join(bin, 'git'), `printf '%s\\n' ${quote(failed ? 'wrong-hooks' : hooksPath)}\nexit ${pipelineError ? 23 : 0}`);

  const path = join(dir, 'fixture with space');
  const extension = { node: 'mjs', python: 'py', yaml: 'yaml', json: 'json' }[type] || 'txt';
  const file = join(dir, `input with space.${extension}`);
  const handoff = join(dir, 'exact authorized handoff.md');
  writeFileSync(file, 'needle\n');
  writeFileSync(handoff, 'gate_result: PASS\n');
  if (type === 'directory') mkdirSync(path);
  else { writeFileSync(path, 'fixture\n'); chmodSync(path, 0o755); }
  if (failed && type === 'directory') rmSync(path, { recursive: true });
  if (failed && type === 'executable') chmodSync(path, 0o644);
  if (failed && ['file', 'handoff-file'].includes(type)) rmSync(type === 'file' ? path : handoff);
  if (failed && ['grep', 'handoff-field'].includes(type)) writeFileSync(type === 'grep' ? file : handoff, 'unrelated\n');
  if (type === 'negative-grep') writeFileSync(file, failed ? 'needle\n' : 'unrelated\n');
  if (type === 'node') writeFileSync(file, failed ? 'const = ;\n' : 'const value = 1;\n');
  if (type === 'python') writeFileSync(file, failed ? 'def :\n' : 'value = 1\n');
  if (type === 'yaml') writeFileSync(file, failed ? '[\n' : 'value: 1\n');
  if (type === 'json') writeFileSync(file, failed ? '{\n' : '{"value":1}\n');
  const script = join(dir, 'check script.sh');
  executable(script, `exit ${failed ? 6 : 0}`);
  mkdirSync(join(dir, 'scripts'));
  executable(join(dir, 'scripts/verify.sh'), `exit ${failed ? 6 : 0}`);
  if (type === 'git-dir' && !failed) mkdirSync(join(dir, '.git'));
  if (scenario === 'missing') {
    const target = type.startsWith('handoff') ? handoff : ['file', 'directory', 'executable'].includes(type) ? path : type === 'shell' ? script : file;
    rmSync(target, { recursive: true, force: true });
  }
  if (toolError && ['negative-grep', 'handoff-field'].includes(type)) executable(join(bin, 'grep'), "echo 'isolated grep tool error' >&2\nexit 17");
  if (toolError && type === 'node') { rmSync(join(bin, 'node')); executable(join(bin, 'node'), "echo 'isolated node tool error' >&2\nexit 17"); }
  let check = scenario === 'pipeline-error' ? 'fixture_check | cat' : 'fixture_check';
  if (scenario === 'negative-rg-error') check = `if rg -q '[' ${quote(file)}; then exit 1; else search_rc=$?; if [ "$search_rc" -eq 1 ]; then exit 0; else exit "$search_rc"; fi; fi`;
  const replacements = { '<ID>': assertion.id, '<check_command>': check, '<path>': ['git-hooks'].includes(type) ? hooksPath : path,
    '<file>': file, '<script>': script, '<keyword>': scenario === 'negative-search-error' ? '[' : 'needle',
    '<jobId>': 'isolated-job', '<authorized_absolute_handoff_path>': handoff };
  let command = assertion.command;
  // Legacy paths are mapped only so the same behavioral test can reproduce their failure.
  command = command.replaceAll('docs/handoff/*-<skill>-handoff.md', quote(handoff));
  for (const [placeholder, value] of Object.entries(replacements)) command = command.replaceAll(placeholder, value);
  if (/<[\w-]+>/.test(command)) failures.push(`${assertion.id}: unbound placeholder in ${scenario}`);
  let expectedExit = 0;
  if (failed) expectedExit = ['npm', 'pytest', 'swift'].includes(type) ? 5 : ['shell', 'verify'].includes(type) ? 6 : 1;
  if (toolError) expectedExit = ['npm', 'pytest', 'swift'].includes(type) ? 127 : 17;
  if (pipelineError) expectedExit = 23;
  if (['negative-search-error', 'negative-rg-error'].includes(scenario)) expectedExit = 2;
  if (scenario === 'missing') expectedExit = ['handoff-field', 'grep', 'negative-grep'].includes(type) ? 2 : type === 'shell' ? 127 : 1;
  const header = assertion.header.replaceAll('<ID>', assertion.id);
  return { dir, bin, header, command, expectedExit };
}

try {
  for (const [source, expectedCount] of surfaces) extracted.push(...extract(source, expectedCount));
  for (let i = 0; i < extracted.length; i++) {
    const assertion = extracted[i];
    assertion.id = `EXIT-${String(i + 1).padStart(3, '0')}`;
    const type = kind(assertion);
    if (!type) { failures.push(`${assertion.id}: unknown actual template ${assertion.description}`); continue; }
    if (!/^\s*(?:#.*\n)*if \( set -o pipefail;/.test(assertion.command)
        || !/else\s+check_rc=\$\?\s+echo "FAIL <ID>"\s+exit "\$check_rc"\s+fi\s*(?:#.*)?$/.test(assertion.command)) {
      failures.push(`${assertion.id} ${assertion.source}:${assertion.startLine}: source wrapper does not preserve the check exit`);
    }
    for (const scenario of scenarios(type)) {
      const fixture = prepare(assertion, type, scenario);
      const result = spawnSync('/bin/bash', ['-c', fixture.command], { cwd: fixture.dir, encoding: 'utf8',
        env: { ...process.env, PATH: `${fixture.bin}:/usr/bin:/bin`, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 10000 });
      const marker = `${fixture.expectedExit === 0 ? 'PASS' : 'FAIL'} ${assertion.id}`;
      const passed = result.status === fixture.expectedExit && result.stdout.split('\n').includes(marker) && !result.error;
      const run = { source: assertion.source, startLine: assertion.startLine, endLine: assertion.endLine,
        id: assertion.id, level: assertion.level, type, scenario, expectedExit: fixture.expectedExit,
        actualExit: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr,
        error: result.error?.message, passed, fixtureDirectory: fixture.dir, command: `${fixture.header}\n${fixture.command}`,
        replayCommand: `${fixture.header}\nexport PATH=${quote(`${fixture.bin}:/usr/bin:/bin`)}\nexport PYTHONDONTWRITEBYTECODE=1\ncd ${quote(fixture.dir)} || exit $?\n${fixture.command}` };
      runs.push(run);
      if (!passed) failures.push(`${assertion.id} ${type}/${scenario}: expected exit ${fixture.expectedExit} + ${marker}; actual exit ${result.status}`);
    }
  }
} catch (error) { failures.push(error.stack); }
finally {
  const report = { schema_version: 1, test: 'verification-exit-contract', sourceRoot, fixtureRoot,
    fixturesRetained: keepFixtures, passed: failures.length === 0, templateCount: extracted.length,
    caseCount: runs.length, passedCases: runs.filter(run => run.passed).length,
    limits: ['Local /bin/bash execution only; native cold quality-gate consumption remains pending.',
      'npx/npm/swift/git-config/pytest use isolated deterministic executables; their real products and suites are not exercised.',
      'Node/Python syntax, JSON/YAML parsing, grep/rg and shell checks execute real local tools.'],
    extractedAssertions: extracted, runs, failures };
  if (evidencePath) writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`verification-exit-contract: ${report.passedCases}/${report.caseCount} cases; ${report.templateCount} actual templates; ${report.passed ? 'PASS' : 'FAIL'}`);
  for (const failure of failures) console.error(failure);
  if (evidencePath) console.log(`Evidence: ${evidencePath}`);
  if (keepFixtures) console.log(`Fixtures retained: ${fixtureRoot}`);
  else rmSync(fixtureRoot, { recursive: true, force: true });
  process.exitCode = report.passed ? 0 : 1;
}
