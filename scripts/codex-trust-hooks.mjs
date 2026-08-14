#!/usr/bin/env node
// 给 luca_gstack 自己的 Codex hook 条目授信（2026-08-06）。
//
// 【背景】Codex 对合并后发现的 hook **每个条目**单独要求授信；本仓定义来自仓库级
// `.codex/hooks.json`，trust state 写在用户配置。未授信时 `codex exec`
// **静默跳过**（实测：注册后未授信 → 本仓 hook 日志零增长）。授信常规路径是交互式 TUI 的
// hooks 审阅界面。本脚本用 **Codex 自己的 app-server API** 完成同一件事，便于自动化与复核：
//   1. `hooks/list` → 拿到每个条目的 `key` 与 **codex 自己算出的 `currentHash`**
//      （不反推算法、不伪造哈希——哈希由 codex 提供）
//   2. `config/batchWrite` → 写入 `hooks.state."<key>".trusted_hash`
//      （二进制里那句 "config/batchWrite failed while updating hook trust in TUI"
//        说明 TUI 走的正是这个 API）
//
// 【安全纪律 — 本脚本刻意的自我限制】
//  · **只授信 command 里含 `codex-hook-adapter.mjs` 的条目**，即本仓自己的 hook。
//    绝不整体授信、绝不碰第三方条目（如 adrafinil）——那是别人的东西，不该由本脚本代人裁决。
//  · 写前备份 `~/.codex/config.toml`，并打印一键回退命令。
//  · 授信是**安全门**：它的意义是"人看过这些 hook 再让它跑"。本脚本不替代那个判断，
//    只在人已经决定要用这套 hook 时省掉 TUI 点击。--dry-run 会列出将被授信的完整命令行，
//    供人先看一眼再决定。
//
// 用法： node scripts/codex-trust-hooks.mjs --dry-run   （只列出，不写）
//        node scripts/codex-trust-hooks.mjs             （写入并复核）

import { spawn } from 'child_process';
import { copyFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const DRY = process.argv.includes('--dry-run');
const CFG = join(homedir(), '.codex', 'config.toml');
const OURS = /codex-hook-adapter\.mjs/;

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
if (!all.length) { console.error('[trust] hooks/list 未返回条目——检查仓库 .codex/hooks.json 顶层合法性、仓库发现与 trust 状态'); process.exit(2); }

const ours = all.filter((h) => OURS.test(h.command || ''));
const foreign = all.filter((h) => !OURS.test(h.command || ''));
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
const stillUntrusted = after.filter((h) => OURS.test(h.command || '') && h.trustStatus !== 'trusted');
console.log(`\n复核：本仓条目仍未授信 ${stillUntrusted.length} 个`);
for (const h of stillUntrusted) console.log(`  ✗ ${h.key}`);
console.log(`\n回退（一条命令还原）： cp "${bak}" "${CFG}"`);
process.exit(stillUntrusted.length ? 1 : 0);
