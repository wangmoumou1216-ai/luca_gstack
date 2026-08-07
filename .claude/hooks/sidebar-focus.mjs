#!/usr/bin/env node
// sidebar-focus.mjs · UserPromptSubmit：把 luca 此刻在侧栏看/选中的东西随 prompt 一起带上。
//
// 【为什么存在】侧栏原本只是展示面。luca 看到问题时，得把眼睛看到的**翻译成文字**我才知道
//   （「第三个卡片那个按钮」「中间那段文字」）——这个翻译成本就是 session↔侧栏的协同缺口。
//   本 hook 砍掉其中的**指代**成本（不是描述成本：哪里不对仍要他说）。
//
// 【只认 file://】焦点文件由 muse app 写，而 app 侧只采集 `file://` 本地预览页。
//   公网页面**永不**自动注入：注入内容会以「用户当前焦点」的身份进入上下文，而此时 agent
//   没有「我在读不可信网页」的警觉，页面上任意一段文字都能借此影响它——间接提示注入。
//   公网页面的焦点只能由 agent 主动调 `mcp__muse__sidebar_focus()` 取，届时带不可信标注。
//   本 hook 仍二次校验 url 前缀，不把这条边界只押在写方。
//
// 【时效】超过 STALE_MS 不注入。陈旧焦点比没有焦点更糟——它会让我**带着确信**去改错东西。
//
// fail-open：任何异常一律静默退出 0，绝不挡住 luca 的这条消息。
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const STALE_MS = 90 * 1000;
const FOCUS_FILE = join(homedir(), '.luca', 'focus.json');

function main() {
  let f = null;
  try { f = JSON.parse(readFileSync(FOCUS_FILE, 'utf8')); } catch { return; }
  if (!f || typeof f !== 'object' || !f.url) return;
  if (typeof f.url !== 'string' || !f.url.startsWith('file:')) return;   // 边界二次校验
  const age = Date.now() - (Number(f.at) || 0);
  if (!(age >= 0) || age > STALE_MS) return;                              // 过期 / 时钟异常 → 不注入

  const secs = Math.round(age / 1000);
  const where = f.title || decodeURIComponent(String(f.url).replace(/^file:\/\//, ''));
  const lines = [];

  if (f.kind === 'selection' && f.text) {
    lines.push(`luca 此刻在侧栏《${where}》中**选中了**这段（${secs} 秒前）：`);
    lines.push(`> ${f.text}`);
    if (f.selector) lines.push(`（该文本所在元素：\`${f.selector}\`）`);
  } else if (f.kind === 'click') {
    const what = f.text ? `「${f.text}」` : (f.tag ? `<${f.tag}>` : '某元素');
    lines.push(`luca 此刻在侧栏《${where}》中**点了** ${what}（${secs} 秒前）` + (f.role ? `，role=${f.role}` : ''));
    if (f.selector) lines.push(`（元素：\`${f.selector}\`）`);
  } else if (f.kind === 'scroll') {
    const hs = Array.isArray(f.headings) && f.headings.length ? `，可见标题：${f.headings.join(' / ')}` : '';
    lines.push(`luca 此刻在侧栏《${where}》，滚到约 ${f.scrollPct ?? '?'}%${hs}（${secs} 秒前）`);
  } else return;

  lines.push('');
  lines.push('若他这句话里出现「这个 / 这段 / 这里」等指代，**优先按上面的焦点理解**；');
  lines.push('明显无关时忽略即可（焦点是被动采集的，不代表他一定在说它）。');

  // Claude Code：UserPromptSubmit 的裸文本输出即被当作附加上下文；
  // Codex：经 .codex/codex-hook-adapter.mjs 包成 hookSpecificOutput.additionalContext。
  process.stdout.write(lines.join('\n') + '\n');
}

try { main(); } catch { }
process.exitCode = 0;
