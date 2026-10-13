#!/usr/bin/env node
// Opt-in native Claude hook acceptance with loopback model responses. This
// proves CLI tool enforcement, not model judgment or subscription/network ROI.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanupNativeEvidence, evidenceOptions, moduleSourceFiles, nativeEvidence } from './native-test-evidence.mjs';

const cliIndex = process.argv.indexOf('--claude');
assert.ok(cliIndex >= 0 && process.argv[cliIndex + 1], 'opt in with --claude /absolute/path/to/claude');
const cli = resolve(process.argv[cliIndex + 1]);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const audit = evidenceOptions();
const driver = fileURLToPath(import.meta.url);
const evidenceRuns = [], completedRuns = [], ownedRuns = [];
const scratch = mkdtempSync(join(tmpdir(), 'claude-scope-native-'));
const version = spawnSync(cli, ['--version'], { encoding: 'utf8' });
assert.equal(version.status, 0, version.stderr);
const numbers = version.stdout.match(/(\d+)\.(\d+)\.(\d+)/)?.slice(1).map(Number);
assert.ok(numbers && (numbers[0] > 2 || (numbers[0] === 2
  && (numbers[1] > 1 || (numbers[1] === 1 && numbers[2] >= 295)))), 'onFailure:block requires Claude >=2.1.295');
const configured = JSON.parse(readFileSync(join(repo, '.claude/settings.json'), 'utf8'))
  .hooks.PreToolUse.flatMap(entry => entry.hooks).find(entry => entry.command.includes('project-scope-guard.mjs'));
assert.equal(configured.onFailure, 'block');
assert.doesNotMatch(configured.command, /\|\|\s*true/);
let current;
function stream(response, content, stopReason) {
  response.writeHead(200, { 'content-type': 'text/event-stream' });
  const emit = (type, data) => response.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  emit('message_start', { message: { id: 'msg_scope_fixture', type: 'message', role: 'assistant',
    model: 'claude-sonnet-4-5', content: [], stop_reason: null, stop_sequence: null,
    usage: { input_tokens: 20, output_tokens: 0 } } });
  emit('content_block_start', { index: 0, content_block: content.type === 'tool_use'
    ? { ...content, input: {} } : { type: 'text', text: '' } });
  emit('content_block_delta', { index: 0, delta: content.type === 'tool_use'
    ? { type: 'input_json_delta', partial_json: JSON.stringify(content.input) }
    : { type: 'text_delta', text: content.text } });
  emit('content_block_stop', { index: 0 });
  emit('message_delta', { delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 10 } });
  emit('message_stop', {});
  response.end();
}
const server = createServer(async (request, response) => {
  let body = '';
  for await (const chunk of request) body += chunk;
  if (request.url.includes('count_tokens')) {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{"input_tokens":20}'); return;
  }
  if (!request.url.startsWith('/v1/messages')) { response.writeHead(404); response.end(); return; }
  const data = JSON.parse(body);
  current.requests++;
  const results = data.messages?.flatMap(message => Array.isArray(message.content)
    ? message.content.filter(block => block.type === 'tool_result') : []) || [];
  current.results.push(...results);
  try {
    if (results.length) {
      current.evidence?.after({ ready: true, native_tool_results: results, marker_exists: existsSync(current.marker) });
      stream(response, { type: 'text', text: 'Native scope fixture finished.' }, 'end_turn');
    } else {
      current.evidence?.before({ ready: Array.isArray(data.tools) && data.tools.some(tool => tool.name === 'Bash'),
        endpoint: request.url, offered_tool_names: data.tools?.map(tool => tool.name), request_number: current.requests });
      stream(response, { type: 'tool_use', id: 'toolu_scope_fixture', name: 'Bash',
        input: { command: current.command, description: 'Write the isolated validation marker' } }, 'tool_use');
    }
  } catch (error) { current.evidenceError = error.stack; response.writeHead(500); response.end('fixture evidence observer failed'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
const hook = join(repo, '.claude/hooks/project-scope-guard.mjs');
const source = readFileSync(hook, 'utf8').replace(/(['"])(\.{1,2}\/[^'"\n]+\.mjs)\1/g,
  (_match, quotation, specifier) => quotation + new URL(specifier, pathToFileURL(hook)).href + quotation);
const broken = join(scratch, 'runtime-fault.mjs');
assert.ok(source.includes('function main() {'));
writeFileSync(broken, source.replace('function main() {', 'function main() { throw new Error("native isolated runtime fault");'));
const cases = [
  { name: 'launch-failure', command: `node ${quote(join(scratch, 'missing-hook.mjs'))}`, blocked: true },
  { name: 'timeout', command: 'node -e "setTimeout(() => {}, 5000)"', timeout: 1, blocked: true },
  { name: 'malformed-input', command: `printf invalid_json | node ${quote(hook)}`, blocked: true },
  { name: 'runtime-exception', command: `node ${quote(broken)}`, blocked: true },
  { name: 'project-denial', command: `node ${quote(hook)}`, project: true, blocked: true },
  { name: 'safe-framework', command: `node ${quote(hook)}`, blocked: false },
];
const summary = { version: version.stdout.trim(), evidence_class: 'native-cli-loopback-model', cases: [] };
console.log(`Retained native evidence: ${scratch}`);
try {
  for (const item of cases) {
    const cwd = join(scratch, item.name);
    mkdirSync(join(cwd, '.claude'), { recursive: true });
    mkdirSync(join(cwd, 'docs'));
    const marker = join(cwd, item.project ? 'docs/marker.txt' : 'marker.txt');
    current = { command: item.project ? "printf 'marker' > docs/marker.txt" : `printf 'marker' > ${quote(marker)}`, marker, requests: 0, results: [] };
    const settings = join(cwd, 'settings.json');
    writeFileSync(settings, JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [
      { ...configured, command: item.command, timeout: item.timeout || 10 },
    ] }] } }));
    const env = { ...process.env, CLAUDE_CONFIG_DIR: join(cwd, 'config'),
      ANTHROPIC_API_KEY: 'isolated-loopback-test-key', ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_AUTOUPDATER: '1',
      LUCA_PROJECTS_ROOT: join(scratch, 'projects'), LUCA_GSTACK_ROOT: cwd,
      NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' };
    for (const name of ['CLAUDECODE', 'CLAUDE_PROJECT_DIR', 'CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_AUTH_TOKEN',
      'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']) delete env[name];
    const args = ['-p', 'Run the single isolated marker command provided by the model fixture.',
      '--model', 'sonnet', '--tools', 'Bash', '--allowedTools', 'Bash', '--settings', settings,
      '--setting-sources', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
      '--output-format', 'stream-json', '--verbose', '--include-hook-events', '--max-turns', '3'];
    const child = spawn(cli, args, { cwd, env, detached: Boolean(audit), stdio: ['ignore', 'pipe', 'pipe'] });
    if (audit) ownedRuns.push({ name: item.name, child });
    current.evidence = nativeEvidence({ audit, name: item.name, repo, driver, child, argv: [cli, ...args], cwd, env, scratch, port,
      sources: moduleSourceFiles([join(repo, 'scripts/native-test-evidence.mjs'), join(repo, '.claude/settings.json'),
        join(repo, '.claude/skill-os/model-routing.yaml'), hook, broken, settings]),
      sourceMetadata: { cli_version: version.stdout.trim() }, seed: { item, command: current.command, marker_initially_exists: existsSync(marker), settings: JSON.parse(readFileSync(settings)) },
      coverage: [{ feature: 'project-scope fail-closed', entry: 'Claude native Bash', state: item.name, assert_ids: ['U1-A4'] }] });
    if (current.evidence) evidenceRuns.push(current.evidence);
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const timer = setTimeout(() => child.kill('SIGTERM'), 60000);
    const exitCode = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
    clearTimeout(timer);
    writeFileSync(join(cwd, 'stdout.jsonl'), stdout);
    writeFileSync(join(cwd, 'stderr.log'), stderr);
    const capture = { command: current.command, marker, requests: current.requests, results: current.results, evidenceError: current.evidenceError };
    writeFileSync(join(cwd, 'tool-results.json'), JSON.stringify(capture, null, 2));
    if (current.evidence) {
      const data = { exitCode, stdout, stderr,
      results: [{ expected: { marker_exists: !item.blocked, native_error: item.blocked, has_native_result: true, onFailure_block: ['launch-failure', 'timeout'].includes(item.name) },
        actual: { marker_exists: existsSync(marker), native_error: current.results.some(result => result.is_error), has_native_result: current.requests >= 2 && current.results.length > 0,
          onFailure_block: /blocking because onFailure|onFailure.*block/.test(JSON.stringify(current.results)) } }],
        artifacts: { 'tool-results.json': capture } };
      current.evidence.capture(data);
      completedRuns.push({ run: current.evidence });
    }
    assert.equal(exitCode, 0, `${item.name}: ${stderr}\n${stdout.slice(-2500)}`);
    assert.ok(current.requests >= 2 && current.results.length, `${item.name}: missing actual native tool_result`);
    assert.equal(existsSync(marker), !item.blocked, `${item.name}: marker execution disagrees with boundary`);
    assert.equal(current.results.some(result => result.is_error), item.blocked, `${item.name}: wrong native tool result`);
    if (['launch-failure', 'timeout'].includes(item.name)) {
      assert.match(JSON.stringify(current.results), /blocking because onFailure|onFailure.*block/, item.name);
    }
    summary.cases.push({ name: item.name, status: 'PASS', marker_exists: existsSync(marker),
      requests: current.requests, result_path: join(cwd, 'tool-results.json') });
    writeFileSync(join(scratch, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log(`PASS native Claude ${item.name}`);
  }
} finally {
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  if (audit) {
    const cleanup = await cleanupNativeEvidence(ownedRuns, scratch, port);
    const receipts = completedRuns.map(({ run }) => run.finish({ cleanup: cleanup(run) }));
    writeFileSync(join(audit.dir, 'summary.json'), JSON.stringify({ ...summary, receipts,
      remaining_gaps: cases.filter(item => !receipts.some(receipt => receipt.name === item.name)).map(item => `missing completed receipt: ${item.name}`),
      cleanup: ownedRuns.map(run => ({ name: run.name, ...cleanup(run) })) }, null, 2));
    assert.equal(receipts.length, cases.length, 'every frozen Claude scenario needs a receipt');
    assert.ok(receipts.every(receipt => receipt.status === 'PASS'), JSON.stringify(receipts));
    console.log(`Bound native evidence: ${audit.dir}`);
  }
}
