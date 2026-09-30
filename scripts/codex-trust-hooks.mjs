#!/usr/bin/env node
// 给 luca_gstack 自己的 Codex hook 条目授信（2026-08-06）。
//
// 【背景】Codex 对 ~/.codex/hooks.json 的**每个条目**单独要求授信，未授信时 `codex exec`
// **静默跳过**（实测：注册后未授信 → 本仓 hook 日志零增长）。授信常规路径是交互式 TUI 的
// hooks 审阅界面。本脚本用 **Codex 自己的 app-server API** 完成同一件事，便于自动化与复核：
//   1. `hooks/list` → 拿到每个条目的 `key` 与 **codex 自己算出的 `currentHash`**
//      （不反推算法、不伪造哈希——哈希由 codex 提供）
//   2. `config/batchWrite` → 写入 `hooks.state."<key>".trusted_hash`
//      （二进制里那句 "config/batchWrite failed while updating hook trust in TUI"
//        说明 TUI 走的正是这个 API）
//
// 【安全纪律 — 本脚本刻意的自我限制】
//  · 只授信当前仓库精确 key、event 和完整 command 匹配的条目。
//    --host-launch 包含经检查的三个 Host Launch 注册项；默认只选择适配器和路由项。
//    绝不整体授信、绝不碰第三方条目（如 adrafinil）——那是别人的东西，不该由本脚本代人裁决。
//  · 写前备份 `~/.codex/config.toml`，并打印一键回退命令。
//  · 授信是**安全门**：它的意义是"人看过这些 hook 再让它跑"。本脚本不替代那个判断，
//    只在人已经决定要用这套 hook 时省掉 TUI 点击。--dry-run 会列出将被授信的完整命令行，
//    供人先看一眼再决定。
//
// 用法： node scripts/codex-trust-hooks.mjs --dry-run   （只列出，不写）
//        node scripts/codex-trust-hooks.mjs             （写入并复核）

import { spawn } from 'child_process';
import { copyFileSync, readFileSync, chmodSync, constants } from 'fs';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { assertHookHealth } from './codex-hook-health.mjs';

const DRY = process.argv.includes('--dry-run');
const HOST_LAUNCH = process.argv.includes('--host-launch');
const CODEX_HOME = process.env.CODEX_HOME || join(homedir(), '.codex');
if (!CODEX_HOME.startsWith('/')) throw new Error('CODEX_HOME must be absolute');
const CFG = join(CODEX_HOME, 'config.toml');
const OURS = /(?:codex-hook-adapter|model-route-hook)\.mjs/;
const GSTACK = resolve(fileURLToPath(new URL('..', import.meta.url)));
const HOOKS_PATH = join(GSTACK, '.codex', 'hooks.json');
const hooksBytes = readFileSync(HOOKS_PATH);
const registered = JSON.parse(hooksBytes.toString('utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hooksHash = sha(hooksBytes);
const routeCommand = registered.hooks.SessionStart.flatMap(group => group.hooks || [])
  .find(hook => /model-route-hook\.mjs/.test(hook.command || ''))?.command || '';
const routeEntry = 'node "$(git rev-parse --show-toplevel)/.codex/model-route-hook.mjs"';
const routeEntryAt = routeCommand.indexOf(routeEntry);
if (routeEntryAt < 0) throw new Error('Codex model-route hook guard prefix is missing');
const guardedPrefix = routeCommand.slice(0, routeEntryAt);
const HOST_COMMANDS = new Map([
  ['sessionStart', 'SessionStart', 'session-restore.mjs'],
  ['userPromptSubmit', 'UserPromptSubmit', 'route-guard.mjs'],
  ['preToolUse', 'PreToolUse', 'project-scope-guard.mjs'],
].map(([event, registration, target]) => [event, {
  registration,
  command: `${guardedPrefix}MEMORY_ROOT=/Users/luca/Desktop/luca_gstack node "$(git rev-parse --show-toplevel)/.codex/host-launch-hook.mjs" "$(git rev-parse --show-toplevel)/.claude/hooks/${target}" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ "$c" = "0" ] && exit 0 || exit 2`,
}]));
if (HOST_LAUNCH) for (const { registration, command } of HOST_COMMANDS.values()) {
  const matches = (registered.hooks[registration] || []).flatMap(group => group.hooks || [])
    .filter(hook => hook.type === 'command' && hook.command === command);
  if (matches.length !== 1) throw new Error(`Host Launch ${registration} exact registration is missing or duplicated`);
}
const registeredCommands = new Map();
const evToSnake = event => event.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
for (const [event, groups] of Object.entries(registered.hooks)) {
  groups.forEach((group, gi) => (group.hooks || []).forEach((hook, hi) => {
    registeredCommands.set(`${HOOKS_PATH}:${evToSnake(event)}:${gi}:${hi}`, {
      eventName: event[0].toLowerCase() + event.slice(1), command: hook.command });
  }));
}
const expected = [...registeredCommands].filter(([, row]) => OURS.test(row.command || '')
  || (HOST_LAUNCH && HOST_COMMANDS.get(row.eventName)?.command === row.command));
assert.ok(expected.length, 'No exact repository hook registrations');
if (HOST_LAUNCH) assert.equal(expected.length, 11, 'Host release requires all 11 registered hooks');
const selectedKeys = new Set(expected.map(([key]) => key));
function exactRows(all) {
  return expected.map(([key, row]) => {
    const matches = all.filter(hook => hook.key === key);
    assert.equal(matches.length, 1, `Expected exactly one official hook: ${key}`);
    const hook = matches[0];
    assert.equal(hook.command, row.command, `Registered command changed: ${key}`);
    assert.equal(hook.eventName, row.eventName, `Registered event changed: ${key}`);
    assert.ok(typeof hook.currentHash === 'string' && hook.currentHash, `Missing official hash: ${key}`);
    return hook;
  });
}

// One bounded official request. Missing/error responses can never mean success.
function rpc(id, method, params) {
  return new Promise((resolveResult, reject) => {
    const child = spawn('codex', ['app-server'], { cwd: GSTACK,
      stdio: ['pipe', 'pipe', 'ignore'], env: { ...process.env, CODEX_HOME } });
    let buffer = '', size = 0, settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true; clearTimeout(timer); child.kill('SIGKILL');
      if (error) reject(error); else resolveResult(result);
    };
    const timer = setTimeout(() => finish(new Error(`${method} timed out`)), 10_000);
    child.once('error', error => finish(error));
    child.once('close', () => finish(new Error(`Codex closed before ${method} acknowledgement`)));
    child.stdin.on('error', error => finish(error));
    child.stdout.on('data', bytes => {
      size += bytes.length;
      if (size > 4 * 1024 * 1024) return finish(new Error('Codex response exceeds bound'));
      buffer += bytes.toString();
      const lines = buffer.split('\n'); buffer = lines.pop();
      const matching = [];
      for (const line of lines) {
        let response;
        try { response = JSON.parse(line); } catch { continue; }
        if (response.id === 1 && response.error) return finish(new Error('Codex initialize failed'));
        if (response.id === id) matching.push(response);
      }
      if (matching.length > 1) return finish(new Error(`Duplicate ${method} response`));
      if (!matching.length) return;
      const response = matching[0];
      if (response.error || !Object.hasOwn(response, 'result')) {
        return finish(new Error(`${method} failed or omitted its result`));
      }
      finish(null, response.result);
    });
    child.stdin.write([
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {
        clientInfo: { name: 'luca-gstack-trust', title: 'luca_gstack', version: '1.1.0' } } },
      { jsonrpc: '2.0', id, method, params },
    ].map(JSON.stringify).join('\n') + '\n');
  });
}
async function listed() {
  const result = await rpc(2, 'hooks/list', {});
  assert.ok(Array.isArray(result?.data), 'Missing official hooks list');
  return result.data.flatMap(group => group.hooks || []);
}
async function userLayer() {
  const read = await rpc(4, 'config/read', { includeLayers: true });
  const layers = (read?.layers || []).filter(layer => layer?.name?.type === 'user'
    && layer.name.file === CFG && layer.name.profile == null);
  assert.equal(layers.length, 1, 'Expected the exact base user configuration layer');
  assert.ok(layers[0].version && layers[0].config, 'Missing official configuration version');
  return layers[0];
}
const unchangedHooks = () => assert.equal(sha(readFileSync(HOOKS_PATH)), hooksHash,
  'Hook registrations changed during trust');
const foreign = rows => rows.filter(row => !selectedKeys.has(row.key))
  .map(row => [row.key, row.eventName, row.command, row.currentHash, row.trustStatus])
  .sort((a, b) => a[0].localeCompare(b[0]));
assertHookHealth(GSTACK);
const before = await listed(), ours = exactRows(before);
unchangedHooks();
assertHookHealth(GSTACK);
const need = ours.filter(hook => hook.trustStatus !== 'trusted');
console.log(`本仓精确条目 ${ours.length} 个（待授信 ${need.length}）；第三方 ${before.length - ours.length} 个。`);
for (const hook of ours) console.log(`  [${hook.trustStatus}] ${hook.eventName}  ${hook.command}`);
if (!need.length) { console.log('全部已授信，无需操作。'); process.exit(0); }
if (DRY) { console.log('--dry-run：未写入。'); process.exit(0); }

const configHash = sha(readFileSync(CFG)), layer = await userLayer();
unchangedHooks();
assert.equal(sha(readFileSync(CFG)), configHash, 'Configuration changed before trust');
const again = exactRows(await listed());
if (!isDeepStrictEqual(again.map(h => [h.key, h.currentHash, h.trustStatus]),
  ours.map(h => [h.key, h.currentHash, h.trustStatus]))) throw new Error('Official hook identity changed before trust');
const backup = `${CFG}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
copyFileSync(CFG, backup, constants.COPYFILE_EXCL); chmodSync(backup, 0o600);
assert.equal(sha(readFileSync(backup)), configHash, 'Backup differs from reviewed configuration');
const edits = need.map(hook => ({
  keyPath: `hooks.state.${JSON.stringify(hook.key)}.trusted_hash`,
  mergeStrategy: 'replace', value: hook.currentHash,
}));
unchangedHooks();
assertHookHealth(GSTACK);
await rpc(3, 'config/batchWrite', { edits, expectedVersion: layer.version,
  filePath: CFG, reloadUserConfig: true });
const after = await listed(), verified = exactRows(after);
if (!isDeepStrictEqual(verified.map(h => [h.key, h.command, h.currentHash, h.trustStatus]),
  ours.map(h => [h.key, h.command, h.currentHash, 'trusted']))) throw new Error('Exact hook readback failed');
const expectedConfig = structuredClone(layer.config);
expectedConfig.hooks ||= {}; expectedConfig.hooks.state ||= {};
for (const hook of need) {
  expectedConfig.hooks.state[hook.key] ||= {};
  expectedConfig.hooks.state[hook.key].trusted_hash = hook.currentHash;
}
if (!isDeepStrictEqual((await userLayer()).config, expectedConfig)) {
  throw new Error('Non-target configuration changed');
}
if (!isDeepStrictEqual(foreign(after), foreign(before))) throw new Error('Foreign hook state changed');
unchangedHooks();
assertHookHealth(GSTACK);
console.log(`已精确授信并复核 ${verified.length} 个；备份：${backup}`);
