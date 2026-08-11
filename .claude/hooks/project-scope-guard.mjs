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
// 边界语义：能解析出项目作用域时 fail-closed（无 pin、失效 identity、宽搜、穿越均 deny）；
// 只有 stdin/运行时完全不可解析时保留 harness 级 fail-open 并留诊断，避免 hook 自身故障锁死所有工具。
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

import { readFileSync, existsSync, lstatSync, realpathSync } from 'fs';
import { join, relative, resolve } from 'path';

// harness 门（P0/WS-A0 接线，2026-07-25）：CC 专有强制动词（permissionDecision:deny /
// updatedInput）只在**正向确定是 Codex** 时降级为纯文本 advisory——claude/unknown 照常输出，
// 失效方向偏向"保住强制"（详见 lib/harness.mjs 头注）。动态 import 失败即视为可输出（fail-open）。
let _canEmitVerb = true;
try {
  const h = await import('./lib/harness.mjs');
  _canEmitVerb = h.canEmitControlVerb(process.env);
} catch { /* fail-open：保持 CC 形输出 */ }

function out(obj) {
  try {
    if (!_canEmitVerb) {
      // Codex：吐 harness-agnostic 纯文本到 stderr，绝不吐它解析不了的 CC JSON
      const o = obj?.hookSpecificOutput || obj || {};
      // Round5 NIT 修：updatedInput 嵌在 hookSpecificOutput（即 o）里，原查 obj.updatedInput 恒空 →
      // 友好文案是死分支、永远整体转储裸 JSON。改查 o.updatedInput 让"路径应重定向到"分支可达。
      const msg = o.permissionDecisionReason || o.reason
        || (o.updatedInput ? `路径应重定向到 ${JSON.stringify(o.updatedInput)}` : JSON.stringify(obj));
      process.stderr.write(`[project-scope-guard] ⚠️ ${msg}（当前 harness 无 PreToolUse 强制能力，此为 advisory：请自行遵守项目边界）\n`);
      return;
    }
    process.stdout.write(JSON.stringify(obj) + '\n');
  } catch { }
}
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
// WS-B2/FIX-2（2026-07-25 深审）：与 4 个身份解析站点共用同一根，支持 LUCA_PROJECTS_ROOT 覆盖。
// 半接线（此处硬编码而别处已覆盖）会造成"写落 A 根、身份判 B 根"的分裂——正是本 hook 要消灭的症状。
// 动态 import 失败时回落硬编码默认，保 fail-open（本 hook 任何异常都不得阻断工具调用）。
let PROJECTS_ROOT = join(process.env.HOME || '', 'Desktop', '项目');
let substrate = null;
try {
  substrate = await import('./lib/project-substrate.mjs');
  if (substrate?.PROJECTS_ROOT) PROJECTS_ROOT = substrate.PROJECTS_ROOT;
} catch { /* fail-open：用默认根 */ }
const claudeDir = join(gstackRoot, '.claude');

function readSessionState() {
  if (!sid || !substrate?.readProjectState) return { state: 'NO_PIN' };
  try {
    return substrate.readProjectState(gstackRoot, sid).value;
  } catch (error) {
    return { state: 'INVALID', error: String(error?.message || error) };
  }
}

function activeBinding(state) {
  if (state?.state !== 'TURN_ACTIVE') return null;
  try {
    return substrate.validatedBindingForState(state, PROJECTS_ROOT);
  } catch { return null; }
}

// 本 session 绑定项目的绝对落点
function absDocs(binding) { return join(binding.realpath, 'docs'); }
function absState(binding) { return join(binding.realpath, '.luca', 'workflow-state.yaml'); }
function absTopic(binding) { return join(binding.realpath, '.luca', 'current-topic.txt'); }
const pathKey = (value) => process.platform === 'darwin' ? String(value).toLowerCase() : String(value);
const samePath = (a, b) => pathKey(a) === pathKey(b);
const insidePath = (candidate, root) => samePath(candidate, root) || pathKey(candidate).startsWith(pathKey(root) + '/');
const escapeRe = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function safeSegments(parts) {
  return parts.every(part => part !== '' && part !== '.' && part !== '..');
}

function confinedProjectPath(binding, parts) {
  if (!binding || !safeSegments(parts)) return null;
  const candidate = join(binding.realpath, ...parts);
  if (!insidePath(candidate, binding.realpath)) return null;
  // Resolve the nearest existing parent. This rejects an in-project symlink
  // whose target escapes to another project, even when the final leaf is new.
  let probe = candidate;
  const missing = [];
  while (!existsSync(probe)) {
    try {
      // existsSync follows symlinks; lstat distinguishes a missing leaf from a
      // dangling symlink. A dangling link is an identity boundary, not a leaf
      // that may be reconstructed under its parent.
      if (lstatSync(probe).isSymbolicLink()) return null;
    } catch (error) {
      if (error?.code !== 'ENOENT') return null;
    }
    const parent = join(probe, '..');
    if (parent === probe) return null;
    missing.unshift(probe.slice(parent.length + (parent.endsWith('/') ? 0 : 1)));
    probe = parent;
  }
  let realParent;
  try { realParent = realpathSync(probe); } catch { return null; }
  if (!insidePath(realParent, binding.realpath)) return null;
  const resolved = join(realParent, ...missing);
  return insidePath(resolved, binding.realpath) ? resolved : null;
}

// 判断一个路径是否"项目作用域"（docs/·state·topic），若是则给出重写后的绝对路径。
// 返回 { scoped:boolean, redirected?:string }。scoped 但无 pin → 调用方 deny。
function classifyPath(p, binding) {
  if (typeof p !== 'string' || !p) return { scoped: false };
  let s = p.replace(/^\.\//, '');
  const gd = join(gstackRoot, 'docs');
  const gState = join(gstackRoot, '.claude', 'workflow-state.yaml');
  const gTopic = join(gstackRoot, '.claude', 'current-topic.txt');
  // Direct absolute project paths are project scope too. A shared-alias-only
  // guard can be bypassed with /projects/<other>/... even when docs/ is safe.
  const roots = [PROJECTS_ROOT];
  try { const real = realpathSync(PROJECTS_ROOT); if (!roots.includes(real)) roots.push(real); } catch { }
  for (const root of roots) {
    if (samePath(s, root)) return { scoped: true, redirected: null, direct: true, unsafe: true };
    if (pathKey(s).startsWith(pathKey(root) + '/')) {
      const rest = s === root ? '' : s.slice(root.length + 1);
      const [project, ...tail] = rest.split('/');
      const insideBinding = binding && pathKey(project) === pathKey(binding.project);
      return {
        scoped: true,
        redirected: insideBinding && safeSegments([project, ...tail]) ? confinedProjectPath(binding, tail) : null,
        direct: true,
        unsafe: !safeSegments([project, ...tail]),
      };
    }
  }

  // docs/（相对） 或 <gstack>/docs/（绝对，含软链未解析形式）
  if (s === 'docs' || s.startsWith('docs/')) {
    const tail = s === 'docs' ? ['docs'] : ['docs', ...s.slice('docs/'.length).split('/')];
    const redirected = binding && safeSegments(tail) ? confinedProjectPath(binding, tail) : null;
    return { scoped: true, redirected, unsafe: !safeSegments(tail) };
  }
  if (samePath(s, gd) || pathKey(s).startsWith(pathKey(gd) + '/')) {
    const tail = samePath(s, gd) ? ['docs'] : ['docs', ...s.slice(gd.length + 1).split('/')];
    const redirected = binding && safeSegments(tail) ? confinedProjectPath(binding, tail) : null;
    return { scoped: true, redirected, unsafe: !safeSegments(tail) };
  }
  // workflow-state / current-topic（相对 或 <gstack>/.claude/… 绝对）
  if (s === '.claude/workflow-state.yaml' || samePath(s, gState)) {
    return { scoped: true, redirected: binding ? absState(binding) : null };
  }
  if (s === '.claude/current-topic.txt' || samePath(s, gTopic)) {
    return { scoped: true, redirected: binding ? absTopic(binding) : null };
  }
  return { scoped: false };
}

// Bash：对"路径位"的 docs/·state·topic token 做保守重写。
// anchor = 行首 / 空白 / 引号 / 重定向或赋值符 —— 避免误伤 mydocs/、已是绝对的 /x/docs/。
function rewriteBash(cmd, binding) {
  if (typeof cmd !== 'string') return { changed: false, cmd, hasScoped: false, unsafe: false };
  let hasScoped = false;
  let unsafe = false;
  let next = cmd;
  const anchor = `(^|[\\s"'\`>=(:;&|])`;
  const dToken = 'docs(?=\\/|$|[\\s"\'\`);&|])';
  const dRe = new RegExp(anchor + dToken, 'g');
  const sRe = new RegExp(anchor + '\\.claude/workflow-state\\.yaml', 'g');
  const tRe = new RegExp(anchor + '\\.claude/current-topic\\.txt', 'g');
  const gstackRoots = [gstackRoot];
  try { const real = realpathSync(gstackRoot); if (!gstackRoots.includes(real)) gstackRoots.push(real); } catch { }
  const absPatterns = gstackRoots.flatMap(root => [
    { re: new RegExp(escapeRe(join(root, 'docs')) + '(?=\\/|$|[\\s"\'`;)&|])', process.platform === 'darwin' ? 'gi' : 'g'), replacement: binding ? absDocs(binding) : '' },
    { re: new RegExp(escapeRe(join(root, '.claude', 'workflow-state.yaml')) + '(?=$|[\\s"\'`;)&|])', process.platform === 'darwin' ? 'gi' : 'g'), replacement: binding ? absState(binding) : '' },
    { re: new RegExp(escapeRe(join(root, '.claude', 'current-topic.txt')) + '(?=$|[\\s"\'`;)&|])', process.platform === 'darwin' ? 'gi' : 'g'), replacement: binding ? absTopic(binding) : '' },
  ]);
  if (dRe.test(next) || sRe.test(next) || tRe.test(next) || absPatterns.some(({ re }) => { re.lastIndex = 0; return re.test(next); })) hasScoped = true;
  const scopedTokenRe = new RegExp(anchor + '(docs(?:/[^\\s"\'\`);&|]*)?)', 'g');
  for (const match of next.matchAll(scopedTokenRe)) {
    const token = match[2] || '';
    const parts = token.split('/');
    if (!safeSegments(parts)) { unsafe = true; break; }
    if (binding && !confinedProjectPath(binding, parts)) { unsafe = true; break; }
  }
  if (binding) {
    next = next
      .replace(new RegExp(anchor + dToken, 'g'), (_m, a) => a + absDocs(binding))
      .replace(new RegExp(anchor + '\\.claude/workflow-state\\.yaml', 'g'), (_m, a) => a + absState(binding))
      .replace(new RegExp(anchor + '\\.claude/current-topic\\.txt', 'g'), (_m, a) => a + absTopic(binding));
    for (const { re, replacement } of absPatterns) {
      re.lastIndex = 0;
      next = next.replace(re, replacement);
    }
  }
  return { changed: next !== cmd, cmd: next, hasScoped, unsafe };
}

function directProjectPathsAllowed(cmd, binding) {
  const roots = [PROJECTS_ROOT];
  try { const real = realpathSync(PROJECTS_ROOT); if (!roots.includes(real)) roots.push(real); } catch { }
  let seen = false;
  for (const root of roots) {
    const escaped = escapeRe(root);
    const re = new RegExp(`${escaped}(?:/[^\\s"';&|]+)?`, process.platform === 'darwin' ? 'gi' : 'g');
    for (const match of String(cmd || '').matchAll(re)) {
      seen = true;
      const value = match[0];
      const classified = classifyPath(value, binding);
      if (!classified.redirected) return { seen, allowed: false, value };
    }
  }
  return { seen, allowed: true };
}

// Expand only absolute-valued environment references for detection. Commands
// that reach project/display paths through an env alias are denied instead of
// rewritten: shell assignments can change the value again after this hook.
function variableProjectReference(cmd, binding) {
  let expanded = String(cmd || '');
  const original = expanded;
  const entries = Object.entries(process.env)
    .filter(([key, value]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && typeof value === 'string' && value.startsWith('/'))
    .sort((a, b) => b[0].length - a[0].length);
  for (const [key, value] of entries) {
    expanded = expanded
      .replace(new RegExp(`\\$\\{${escapeRe(key)}\\}`, 'g'), value)
      .replace(new RegExp(`\\$${escapeRe(key)}\\b`, 'g'), value);
  }
  if (process.env.HOME) expanded = expanded.replace(/(^|[\s"'`=:(;&|])~(?=\/)/g, (_m, a) => a + process.env.HOME);
  if (expanded === original) return null;
  const direct = directProjectPathsAllowed(expanded, binding);
  const shared = rewriteBash(expanded, binding);
  return direct.seen || shared.hasScoped ? { expanded } : null;
}

function resolvedRelativeProjectAccess(candidate, binding) {
  let frameworkRoot = resolve(gstackRoot);
  try { frameworkRoot = realpathSync(frameworkRoot); } catch { }
  // luca_gstack itself may physically live under PROJECTS_ROOT. Framework/meta
  // work inside its own root remains framework scope; only escaping that root
  // into the containing/downstream project tree is a project access.
  if (insidePath(candidate, frameworkRoot)) return { scoped: false, allowed: true };
  const roots = [resolve(PROJECTS_ROOT)];
  try { const real = realpathSync(PROJECTS_ROOT); if (!roots.some(root => samePath(root, real))) roots.push(real); } catch { }
  for (const root of roots) {
    if (!insidePath(candidate, root)) continue;
    if (samePath(candidate, root)) return { scoped: true, allowed: false, value: candidate };
    const rest = relative(root, candidate);
    const [project, ...tail] = rest.split('/');
    if (!binding || pathKey(project) !== pathKey(binding.project)) {
      return { scoped: true, allowed: false, value: candidate };
    }
    const confined = confinedProjectPath(binding, tail);
    return { scoped: true, allowed: Boolean(confined), value: candidate };
  }
  return { scoped: false, allowed: true };
}

// Track literal cwd changes and relative dot-path operands. This closes the
// natural `cd ../.. && find .` / `find ../..` path that bypasses absolute/env
// detection when luca_gstack itself is nested under PROJECTS_ROOT. Dynamic cd
// targets make subsequent dot paths fail closed because their cwd is unknown.
function relativeProjectReference(cmd, binding) {
  let cwd = resolve(gstackRoot);
  try { cwd = realpathSync(cwd); } catch { }
  const segments = String(cmd || '').split(/&&|\|\||[;\n]/);
  const dotPath = /(^|[\s"'`=:(>])((?:\.{1,2})(?:\/[A-Za-z0-9._@%+,\-\u3400-\u9fff]+)*)(?=$|[\s"'`);&|])/g;
  for (const rawSegment of segments) {
    const segment = rawSegment.trim();
    if (!segment) continue;
    dotPath.lastIndex = 0;
    for (const match of segment.matchAll(dotPath)) {
      const token = match[2];
      if (!cwd) return { denied: true, value: token, reason: 'dynamic-cwd' };
      const checked = resolvedRelativeProjectAccess(resolve(cwd, token), binding);
      if (checked.scoped && !checked.allowed) return { denied: true, value: token, resolved: checked.value };
    }
    const cd = segment.match(/^(?:command\s+)?cd\s+(?:--\s+)?(?:(['"])([^'$"`]+)\1|([^\s;&|]+))/);
    if (cd) {
      const target = cd[2] || cd[3] || '';
      if (!target || /[$`]/.test(target)) {
        return { denied: true, value: target || '(dynamic cd)', reason: 'dynamic-cwd' };
      } else {
        cwd = resolve(cwd || gstackRoot, target);
        const checked = resolvedRelativeProjectAccess(cwd, binding);
        if (checked.scoped && !checked.allowed) return { denied: true, value: target, resolved: checked.value };
      }
    }
  }
  return null;
}

// 只把"命令段起始位"的 project.sh switch/new 当真调用 —— 防 echo/heredoc 里的字符串误置 pin。
// 按 \n ; & | 切段，每段去掉前导 bash/sh，要求以（可选路径）project.sh 开头才算数
// （`echo "...project.sh switch x"` 之类整段以 echo 开头，不再误触）。
function parseExactSwitchMutation(cmd) {
  const value = String(cmd || '').trim();
  const match = value.match(/^(?:bash\s+)?(?:\.\/)?scripts\/project\.sh\s+(switch|new)\s+([^\s"';&|]+)\s+--session-id\s+([\w-]{1,36})\s+--tx\s+([A-Za-z0-9-]{8,128})\s+--expected-epoch\s+(\d+)$/);
  if (!match) return null;
  return { operation: match[1], target: match[2], session_id: match[3], tx: match[4], expected_epoch: Number(match[5]) };
}

function mentionsProjectMutation(cmd) {
  return /(?:^|[\s;&|])(?:\.\/)?scripts\/project\.sh\s+(?:switch|new)\b/.test(String(cmd || ''));
}

function mentionsInternalProjectController(cmd) {
  return /(?:^|[\s;&|])(?:node\s+)?(?:\.\/)?scripts\/project-pin\.mjs\s+(?:prepare|begin-turn|close-turn|close-switch-turn|switch|new|inject|deactivate)\b/.test(String(cmd || ''));
}

function exactMutationMatches(state, cmd) {
  const parsed = parseExactSwitchMutation(cmd);
  const sw = state?.switch;
  return Boolean(parsed && sw
    && parsed.session_id === sid
    && parsed.operation === sw.operation
    && parsed.target === sw.target
    && parsed.tx === sw.tx
    && parsed.expected_epoch === sw.expected_epoch);
}

// framework/ 只读母版保护（SF-002 宪法红线，保护磁盘母版资产）。与项目隔离正交——纯拒绝、不重定向。
// 定位（诚实）：**咨询式「防手滑」守卫**，不是对抗性守卫（fail-open + agent 可 touch marker 自解）。
// 目标是挡住意外覆盖母版的常见向量，不追求防有意绕过。
// 覆盖（2026-07-22 安全验收后收紧）：
//   · Write/Edit/MultiEdit/NotebookEdit：file_path 精确判定，**锚定仓根 framework/**（不误伤
//     src/framework、/tmp/framework、别项目 framework——B#4 误伤修复），大小写不敏感（APFS）。
//   · Bash 写信号：重定向(含 ./ 前缀) / sed -i / tee / rm|truncate|dd / **cp|mv|install|ln|rsync 目标位**
//     （framework/ 在命令末尾≈写目标；源位 `cp framework/src dest` 的 framework/ 后还有 dest，放行，
//     不误伤 html-prototype 复制母版），全部大小写不敏感。
// 已知边界（咨询守卫不追，诚实声明）：Bash 里绝对路径 / $PWD/ / `..` 穿越写 framework、解释器写
//   （python -c / node -e）——这些是「有意」而非「手滑」，agent 有意写母版会自己 touch marker。
// escape：marker 文件 .claude/.allow-framework-write 或 env ALLOW_FRAMEWORK_WRITE=1（母版正当维护）。
function isFrameworkPath(p) {
  const low = String(p || '').replace(/^\.\//, '').toLowerCase();  // 大小写不敏感（APFS 上 FRAMEWORK==framework）
  const fwAbsLow = join(gstackRoot, 'framework').toLowerCase();
  // 只匹配**仓根** framework/：相对仓根 或 <gstackRoot>/framework —— 不匹配 src/framework、/tmp/framework、别项目
  return low === 'framework' || low.startsWith('framework/') || low === fwAbsLow || low.startsWith(fwAbsLow + '/');
}
function frameworkEscapeActive() {
  if (process.env.ALLOW_FRAMEWORK_WRITE === '1') return true;
  try { return existsSync(join(claudeDir, '.allow-framework-write')); } catch { return false; }
}
function frameworkWriteDeny(tool, inp) {
  if (frameworkEscapeActive()) return null;
  if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(tool)) {
    const p = inp.file_path || inp.notebook_path || '';
    return isFrameworkPath(p) ? String(p) : null;
  }
  if (tool === 'Bash') {
    const cmd = String(inp.command || '');
    // fw 匹配：仓根绝对路径 <gstackRoot>/framework/（A#2 手滑级绝对路径）或 (./)framework/（相对）
    const escAbs = join(gstackRoot, 'framework').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fw = '(?:' + escAbs + '/|(?:\\./)?framework/)';
    const writeSignals = [
      new RegExp('>>?\\s*' + fw, 'i'),                              // > framework/  >> ./framework/
      new RegExp('\\btee\\s+(?:-\\S+\\s+)*' + fw, 'i'),              // tee framework/
      new RegExp('\\bsed\\s+-i\\S*\\s+[^|;&]*\\b' + fw, 'i'),         // sed -i ... framework/
      new RegExp('\\b(?:rm|truncate|dd)\\s+[^|;&]*\\b' + fw, 'i'),    // rm/truncate/dd ... framework/
      // cp/mv/install/ln/rsync 写目标位：framework/ 在命令末尾（后接命令边界）≈ 目标；源位不在末尾→放行
      new RegExp('\\b(?:cp|mv|install|rsync|ln)\\b[^|;&]*\\s' + fw + '\\S*\\s*(?:$|[;&|])', 'i'),
    ];
    return writeSignals.some((re) => re.test(cmd)) ? 'framework/（Bash 写信号）' : null;
  }
  return null;
}

function main() {
  // framework/ 只读保护先于项目隔离（正交，两者都可能命中同一次调用；framework 写一律不放行）
  const fwHit = frameworkWriteDeny(toolName, input);
  if (fwHit) {
    return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
      permissionDecisionReason: `framework/ 是只读母版保护区（SF-002 宪法红线）：「${fwHit}」被拒。原型/演示应把母版复制到项目目录再改，绝不原地写 framework/。确需维护母版本身 → touch .claude/.allow-framework-write（改完 rm）或设 env ALLOW_FRAMEWORK_WRITE=1 后重试。` } });
  }

  const state = readSessionState();
  const binding = activeBinding(state);

  // Bash 先处理，且优先识别命令位的 project.sh switch/new —— 直接 CLI 切换（! 命令）route-guard 看不到，
  // 在此认领 pin，闭合"CLI 切换后 pin 不更新"的洞。识别后立即用新 pin 继续本命令的重写。
  if (toolName === 'Bash') {
    const cmd = String(input.command || '');
    if (state.state === 'SWITCH_ONLY') {
      if (exactMutationMatches(state, cmd)) passThrough();
      if (mentionsProjectMutation(cmd) || mentionsInternalProjectController(cmd) || rewriteBash(cmd, null).hasScoped) {
        return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
          permissionDecisionReason: 'SWITCH_ONLY 本轮只允许一条与 tx、target、expected_epoch 完全匹配的 project.sh switch/new；禁止复合命令与同轮项目工作。' } });
      }
    } else if (mentionsProjectMutation(cmd)) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: `当前项目状态 ${state.state} 不允许直接 switch/new；必须由显式切换 prompt 创建 SWITCH_ONLY 事务。` } });
    } else if (mentionsInternalProjectController(cmd)) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: 'project-pin.mjs 是 hook/project.sh 的内部事务接口，不能作为同轮绕过 terminal/epoch 的项目工具调用。' } });
    }
    const variableRef = variableProjectReference(cmd, binding);
    if (variableRef) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: 'Bash 通过环境变量或 ~ 间接引用项目根/display 路径，hook 无法安全重写其运行时值；请改用已验证 binding 的显式绝对路径。' } });
    }
    const relativeRef = relativeProjectReference(cmd, binding);
    if (relativeRef?.denied) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: `Bash 相对路径会离开 luca_gstack 并进入未绑定/跨项目作用域（${relativeRef.value}${relativeRef.resolved ? ` → ${relativeRef.resolved}` : ''}）；请先完成项目绑定或改用明确的框架内路径。` } });
    }
    const direct = directProjectPathsAllowed(cmd, binding);
    if (direct.seen && !direct.allowed) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: `Bash 直接项目路径不属于当前可验证 binding（${direct.value}）；禁止 no-pin/跨项目/失效 identity 访问。` } });
    }
    const r = rewriteBash(cmd, binding);
    if (r.unsafe) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: 'Bash 项目路径含 . / .. / 空段 traversal，禁止重写或执行。' } });
    }
    if (r.hasScoped && !binding) {
      // Bash 无 pin 一律 deny：shell 字符串里读/写难可靠区分，从严防写泄漏；纯读某项目 docs 请改用 Read 工具。
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: `项目状态 ${state.state} 没有可验证的 TURN_ACTIVE identity/epoch，Bash 不能操作共享 docs/state/topic。` } });
    }
    if (r.changed) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: { ...input, command: r.cmd } } });
    }
    passThrough();
  }

  // 文件类工具：精确重写 file_path / notebook_path / path。
  // 无 path/仓根 Grep、Glob 会穿过展示软链，因此要求调用方显式给出非展示链路径。
  const pathField = toolName === 'NotebookEdit' ? 'notebook_path'
    : (toolName === 'Grep' || toolName === 'Glob') ? 'path'
    : 'file_path';
  const target = input[pathField];
  if ((toolName === 'Grep' || toolName === 'Glob') && (typeof target !== 'string' || !target || target === '.' || target === gstackRoot)) {
    return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
      permissionDecisionReason: '框架级 Grep/Glob 必须给出明确的非 display-symlink 路径（如 .claude/、scripts/）；仓根宽搜可能穿过共享 docs 展示链。' } });
  }
  if (typeof target !== 'string' || !target) passThrough();

  const c = classifyPath(target, binding);
  if (!c.scoped) passThrough(); // 非项目路径 → 放行（.claude/skills、memory、scripts、framework、任意文件）

  if (!c.redirected) {
    return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
      permissionDecisionReason: c.unsafe
        ? `项目路径含 . / .. / 空段 traversal，拒绝「${target}」。`
        : `项目状态 ${state.state} 没有可验证的 TURN_ACTIVE identity/epoch，不能访问共享路径「${target}」。` } });
  }

  return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: { ...input, [pathField]: c.redirected } } });
}

// fail-open 包一层：main() 内任何未预期异常都放行，绝不因 hook bug 阻断工具调用。
try { main(); } catch (e) {
  try { process.stderr.write(`[project-scope-guard] fail-open: ${e && e.message}\n`); } catch { }
  passThrough();
}
