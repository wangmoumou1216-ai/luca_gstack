#!/usr/bin/env node
// PreToolUse：会话级项目隔离（方案A，2026-07-08）。
//
// 问题（此 hook 要解决的根因）：gstack/docs、.claude/workflow-state.yaml、.claude/current-topic.txt
// 是**全局共享软链**，所有并行 session 的 CWD 都是 gstack/，全部通过同一条软链解析 docs/…。
// 任一 session 跑 project.sh switch 就翻了软链，其它 session 此刻写 docs/… 会静默落错项目
// （截图里 mobile-list 后台 workflow 把 muse 上的 session 拽走就是此症）。原设计是"告警+3 次后
// 自动认领劫持者项目"（route-guard 旧 684-686），即字面意义的"随意切到其他项目"，luca 明确否决。
//
// 本 hook 把"当前项目"从**工作目录属性**（共享软链）改成**session 属性**（pin 文件）：
//  · pin 真值源：.claude/.session-project-<sid>（由 route-guard 在显式声明项目时写，永不从软链派生）。
//  · 每次工具调用前，把落在 docs/·workflow-state·current-topic 的路径**重写成本 session pin 项目的
//    绝对路径**（updatedInput）。于是每个 session 永远读写自己 pin 的项目，共享软链退化为纯展示，
//    别的 session 怎么 switch 都影响不到本 session 的落点 → "session 执行的是什么就是什么"。
//  · 无 pin（纯对话/框架元任务/未声明项目的 session）碰 docs/ → deny（绝不静默跟软链跑到别人项目）；
//    非项目路径（.claude/skills、memory/、scripts/、framework/、CLAUDE.md…）→ 原样放行。
//
// 铁律：**fail-open**。本 hook 任何异常都必须让工具照常执行（不输出=默认放行），绝不因 hook bug 卡住
// 工具调用。宁可偶发一次未重定向（route-guard/post-edit 仍会告警兜底），也不阻断工作流。
//
// Bash 说明（诚实边角）：Bash 命令是任意 shell 字符串，只能对"路径位"的 docs/ token 做保守重写
// （行首/空白/引号/重定向符 后紧跟 docs/），覆盖 mkdir -p docs/…、cat > docs/…、"docs/…" 等常见形态；
// 文件类工具（Write/Edit/Read/…）的 file_path 重写是**精确**的。含空格的项目名在无引号 Bash 场景下
// 可能不完美（罕见，kebab 命名不受影响）。
// 已知误伤（2026-07-14 实证，接受的权衡）：docs/ 作为**字符串字面量**（grep 模式/echo 文本/JSON
// payload）同样命中 anchor——未绑定被 deny、绑定被静默改写。anchor 无法区分"模式"与"路径"，收窄
// anchor 会漏真路径（安全侧优先）；处置=deny 文案给出改写指引，不改重写逻辑。
//
// Claude Code PreToolUse 契约（已核）：stdin JSON = { session_id, tool_name, tool_input }；
//  重定向：stdout 打印 {"hookSpecificOutput":{"hookEventName":"PreToolUse","updatedInput":{…整份输入…}}}
//         （updatedInput 整体替换 tool_input，须带齐原有字段 + 改后的路径）。
//  拒绝：  {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"…"}}
//         （reason 会展示给模型，模型可据此改用 switch/new）。

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function out(obj) { try { process.stdout.write(JSON.stringify(obj) + '\n'); } catch { } }
function passThrough() { process.exit(0); } // 不输出 = 默认放行

// ── 读 stdin（fail-open：读不到就放行）──
let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch { passThrough(); }
let data = {};
try { data = JSON.parse(raw || '{}'); } catch { passThrough(); }

const sid = String(data?.session_id || '').replace(/[^\w-]/g, '').slice(0, 36);
const toolName = data?.tool_name || '';
const input = data?.tool_input || {};

const gstackRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const PROJECTS_ROOT = join(process.env.HOME || '', 'Desktop', '项目');
const claudeDir = join(gstackRoot, '.claude');

function readPin() {
  if (!sid) return '';
  try { return readFileSync(join(claudeDir, `.session-project-${sid}`), 'utf8').trim(); } catch { return ''; }
}

// 本 session 绑定项目的绝对落点
function absDocs(pin) { return join(PROJECTS_ROOT, pin, 'docs'); }
function absState(pin) { return join(PROJECTS_ROOT, pin, '.luca', 'workflow-state.yaml'); }
function absTopic(pin) { return join(PROJECTS_ROOT, pin, '.luca', 'current-topic.txt'); }

// 判断一个路径是否"项目作用域"（docs/·state·topic），若是则给出重写后的绝对路径。
// 返回 { scoped:boolean, redirected?:string }。scoped 但无 pin → 调用方 deny。
function classifyPath(p, pin) {
  if (typeof p !== 'string' || !p) return { scoped: false };
  let s = p.replace(/^\.\//, '');
  const gd = join(gstackRoot, 'docs');
  const gState = join(gstackRoot, '.claude', 'workflow-state.yaml');
  const gTopic = join(gstackRoot, '.claude', 'current-topic.txt');

  // docs/（相对） 或 <gstack>/docs/（绝对，含软链未解析形式）
  if (s === 'docs' || s.startsWith('docs/')) {
    const rest = s === 'docs' ? '' : s.slice('docs'.length);
    return { scoped: true, redirected: pin ? absDocs(pin) + rest : null };
  }
  if (s === gd || s.startsWith(gd + '/')) {
    const rest = s.slice(gd.length);
    return { scoped: true, redirected: pin ? absDocs(pin) + rest : null };
  }
  // workflow-state / current-topic（相对 或 <gstack>/.claude/… 绝对）
  if (s === '.claude/workflow-state.yaml' || s === gState) {
    return { scoped: true, redirected: pin ? absState(pin) : null };
  }
  if (s === '.claude/current-topic.txt' || s === gTopic) {
    return { scoped: true, redirected: pin ? absTopic(pin) : null };
  }
  return { scoped: false };
}

// Bash：对"路径位"的 docs/·state·topic token 做保守重写。
// anchor = 行首 / 空白 / 引号 / 重定向或赋值符 —— 避免误伤 mydocs/、已是绝对的 /x/docs/。
function rewriteBash(cmd, pin) {
  if (typeof cmd !== 'string') return { changed: false, cmd, hasScoped: false };
  let hasScoped = false;
  let next = cmd;
  const anchor = `(^|[\\s"'\`>=(:;&|])`;
  const dRe = new RegExp(anchor + 'docs/', 'g');
  const sRe = new RegExp(anchor + '\\.claude/workflow-state\\.yaml', 'g');
  const tRe = new RegExp(anchor + '\\.claude/current-topic\\.txt', 'g');
  if (dRe.test(next) || sRe.test(next) || tRe.test(next)) hasScoped = true;
  if (pin) {
    next = next
      .replace(new RegExp(anchor + 'docs/', 'g'), (_m, a) => a + absDocs(pin) + '/')
      .replace(new RegExp(anchor + '\\.claude/workflow-state\\.yaml', 'g'), (_m, a) => a + absState(pin))
      .replace(new RegExp(anchor + '\\.claude/current-topic\\.txt', 'g'), (_m, a) => a + absTopic(pin));
  }
  return { changed: next !== cmd, cmd: next, hasScoped };
}

// 只把"命令段起始位"的 project.sh switch/new 当真调用 —— 防 echo/heredoc 里的字符串误置 pin。
// 按 \n ; & | 切段，每段去掉前导 bash/sh，要求以（可选路径）project.sh 开头才算数
// （`echo "...project.sh switch x"` 之类整段以 echo 开头，不再误触）。
function detectProjectSwitch(cmd) {
  for (let seg of String(cmd).split(/[\n;&|]+/)) {
    seg = seg.trim().replace(/^(?:bash|sh)\s+/, '');
    const m = seg.match(/^\.?\/?(?:[\w.一-龥/-]*\/)?project\.sh\s+(?:switch|new)\s+["']?([^\s"'&;|]+)/);
    if (m) { const p = m[1].replace(/[^\w一-龥.-]/g, '').slice(0, 64); if (p) return p; }
  }
  return null;
}

function main() {
  let pin = readPin();

  // Bash 先处理，且优先识别命令位的 project.sh switch/new —— 直接 CLI 切换（! 命令）route-guard 看不到，
  // 在此认领 pin，闭合"CLI 切换后 pin 不更新"的洞。识别后立即用新 pin 继续本命令的重写。
  if (toolName === 'Bash') {
    const cmd = String(input.command || '');
    const claimed = detectProjectSwitch(cmd);
    if (claimed && sid) { try { writeFileSync(join(claudeDir, `.session-project-${sid}`), claimed); } catch { } pin = claimed; }
    const r = rewriteBash(cmd, pin);
    if (r.hasScoped && !pin) {
      // Bash 无 pin 一律 deny：shell 字符串里读/写难可靠区分，从严防写泄漏；纯读某项目 docs 请改用 Read 工具。
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: '本 session 未绑定任何项目，Bash 不能操作 docs/·workflow-state·current-topic。先 ./scripts/project.sh switch <项目>（或 new <项目>）声明；仅想读某项目 docs 可直接用 Read 工具（读类不绑定也放行）。若命中的 docs/ 只是命令里的字符串字面量（grep 模式/echo 文本等）而非真实路径，属保守匹配的已知误伤——改写命令避开该字样即可（如拆成 "do""cs/" 或改用其它过滤词）。' } });
    }
    if (r.changed) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: { ...input, command: r.cmd } } });
    }
    passThrough();
  }

  // 文件类工具：精确重写 file_path / notebook_path / path
  // 注：无 path 的 Grep/Glob（搜整个 gstack 树）会经 docs 软链搜到当前全局项目 —— 已知的读/搜索侧
  //     局限（非写入损坏）；不在此拦（拦了会破坏"搜整个框架树"的正常用途）。记录于 CLAUDE.md 与回归说明。
  const pathField = toolName === 'NotebookEdit' ? 'notebook_path'
    : (toolName === 'Grep' || toolName === 'Glob') ? 'path'
    : 'file_path';
  const target = input[pathField];
  if (typeof target !== 'string' || !target) passThrough();

  const c = classifyPath(target, pin);
  if (!c.scoped) passThrough(); // 非项目路径 → 放行（.claude/skills、memory、scripts、framework、任意文件）

  if (!c.redirected) {
    // 项目作用域但本 session 无 pin：读类工具（Read/Grep/Glob）放行 —— 纯对话/审计 session 可读当前
    // 全局项目 docs（跟软链），摩擦更小；写类（Write/Edit/MultiEdit/NotebookEdit）仍 deny，绝不静默
    // 把写落到别人项目。
    if (/^(Read|Grep|Glob)$/.test(toolName)) passThrough();
    return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
      permissionDecisionReason: `本 session 未绑定任何项目，不能写「${target}」。先 ./scripts/project.sh switch <项目>（或 new <项目>）声明本 session 在哪个项目工作；纯对话/框架任务无需写 docs/。` } });
  }

  return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: { ...input, [pathField]: c.redirected } } });
}

// fail-open 包一层：main() 内任何未预期异常都放行，绝不因 hook bug 阻断工具调用。
try { main(); } catch (e) {
  try { process.stderr.write(`[project-scope-guard] fail-open: ${e && e.message}\n`); } catch { }
  passThrough();
}
