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
//  · **只授信 command 里含 `codex-hook-adapter.mjs` 或 `model-route-hook.mjs`
//    的条目**，即本仓自己的 hook。
//    绝不整体授信、绝不碰第三方条目（如 adrafinil）——那是别人的东西，不该由本脚本代人裁决。
//  · 写前备份 `~/.codex/config.toml`，并打印一键回退命令。
//  · 授信是**安全门**：它的意义是"人看过这些 hook 再让它跑"。本脚本不替代那个判断，
//    只在人已经决定要用这套 hook 时省掉 TUI 点击。--dry-run 会列出将被授信的完整命令行，
//    供人先看一眼再决定。
//
// 用法： node scripts/codex-trust-hooks.mjs --dry-run   （只列出，不写）
//        node scripts/codex-trust-hooks.mjs             （写入并复核）

import { spawn } from 'child_process';
import { copyFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const DRY = process.argv.includes('--dry-run');
const HOST_LAUNCH = process.argv.includes('--host-launch');
const CODEX_HOME = process.env.CODEX_HOME || join(homedir(), '.codex');
if (!CODEX_HOME.startsWith('/')) throw new Error('CODEX_HOME must be absolute');
const CFG = join(CODEX_HOME, 'config.toml');
const OURS = /(?:codex-hook-adapter|model-route-hook)\.mjs/;
const GSTACK = resolve(fileURLToPath(new URL('..', import.meta.url)));
const HOOKS_PATH = join(GSTACK, '.codex', 'hooks.json');
const registered = JSON.parse(readFileSync(HOOKS_PATH, 'utf8'));
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
    registeredCommands.set(`${HOOKS_PATH}:${evToSnake(event)}:${gi}:${hi}`, hook.command);
  }));
}
const isOurs = hook => registeredCommands.get(hook.key) === hook.command
  && (OURS.test(hook.command || '')
    || (HOST_LAUNCH && HOST_COMMANDS.get(hook.eventName)?.command === hook.command));

// 与 app-server 通一次 JSON-RPC：喂请求、收响应
function rpc(requests, waitMs = 6000) {
  return new Promise((res) => {
    const p = spawn('codex', ['app-server'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => { out += String(d); });
    p.stderr.on('data', () => { });
    p.stdin.write(requests.map((r) => JSON.stringify(r)).join('\n') + '\n');
    setTimeout(() => { try { p.kill('SIGKILL'); } catch { } }, waitMs);
    p.on('close', () => {
      const msgs = [];
      for (const line of out.split('\n')) {
        try { msgs.push(JSON.parse(line)); } catch { }
      }
      res(msgs);
    });
  });
}
const INIT = {
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { clientInfo: { name: 'luca-gstack-trust', title: 'luca_gstack', version: '1.0.0' } },
};

const listMsgs = await rpc([INIT, { jsonrpc: '2.0', id: 2, method: 'hooks/list', params: {} }]);
const listed = listMsgs.find((m) => m.id === 2)?.result?.data || [];
const all = listed.flatMap((g) => g.hooks || []);
if (!all.length) { console.error('[trust] hooks/list 未返回条目——检查 ~/.codex/hooks.json'); process.exit(2); }

const ours = all.filter(isOurs);
const foreign = all.filter((h) => !isOurs(h));
if (HOST_LAUNCH && (registeredCommands.size !== 11 || ours.length !== 11
    || [...HOST_COMMANDS].some(([event, expected]) =>
      ours.filter(hook => hook.eventName === event && hook.command === expected.command).length !== 1))) {
  throw new Error('Host Launch release requires all 11 exact commands in Codex hooks/list');
}
const need = ours.filter((h) => h.trustStatus !== 'trusted');

console.log(`本仓条目 ${ours.length} 个（其中待授信 ${need.length}）；第三方条目 ${foreign.length} 个——不碰。`);
for (const h of ours) {
  console.log(`  [${h.trustStatus}] ${h.eventName}  ${String(h.command).replace(/\s+/g, ' ').slice(0, 110)}…`);
}
if (foreign.length) {
  for (const h of foreign) console.log(`  (跳过·第三方) [${h.trustStatus}] ${h.eventName}`);
}
if (!need.length) { console.log('\n全部已授信，无需操作。'); process.exit(0); }
if (DRY) { console.log('\n--dry-run：未写入。确认无误后去掉该参数重跑。'); process.exit(0); }

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const bak = `${CFG}.bak-${stamp}`;
copyFileSync(CFG, bak);
console.log(`\n已备份 → ${bak}`);

const edits = need.map((h) => ({
  keyPath: `hooks.state."${h.key}".trusted_hash`,
  mergeStrategy: 'replace',
  value: h.currentHash,          // 哈希来自 codex 自身，非本脚本计算
}));
const writeMsgs = await rpc([INIT,
  { jsonrpc: '2.0', id: 3, method: 'config/batchWrite', params: { edits, reloadUserConfig: true } }]);
const wr = writeMsgs.find((m) => m.id === 3);
if (wr?.error) {
  console.error('[trust] config/batchWrite 失败:', JSON.stringify(wr.error).slice(0, 300));
  console.error(`回退： cp "${bak}" "${CFG}"`);
  process.exit(1);
}

// 复核：重新 list，确认状态真的翻转（不信自己的写入自陈）
const recheck = await rpc([INIT, { jsonrpc: '2.0', id: 4, method: 'hooks/list', params: {} }]);
const after = (recheck.find((m) => m.id === 4)?.result?.data || []).flatMap((g) => g.hooks || []);
const stillUntrusted = after.filter((h) => isOurs(h) && h.trustStatus !== 'trusted');
console.log(`\n复核：本仓条目仍未授信 ${stillUntrusted.length} 个`);
for (const h of stillUntrusted) console.log(`  ✗ ${h.key}`);
console.log(`\n回退（一条命令还原）： cp "${bak}" "${CFG}"`);
process.exit(stillUntrusted.length ? 1 : 0);
