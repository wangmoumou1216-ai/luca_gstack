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
import { isAbsolute, join, relative, resolve } from 'path';

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
let readGrants = null;
try {
  substrate = await import('./lib/project-substrate.mjs');
  if (substrate?.PROJECTS_ROOT) PROJECTS_ROOT = substrate.PROJECTS_ROOT;
} catch { /* fail-open：用默认根 */ }
try { readGrants = await import('./lib/project-read-grants.mjs'); } catch { }
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
// 求一个路径的**真实**目标（跟随符号链接）：逐段上溯到最近存在的祖先做 realpath，
// 再把缺失的叶子段拼回去。与 confinedProjectPath 同款技术，抽出来给框架豁免复用。
// 悬空软链视为身份边界（返回 null=不可豁免），与 confinedProjectPath 的判断保持一致。
// **为什么必须有这个**：resolve() 只做词法 `.`/`..` 折叠，**不解析软链**。只用它的话，
// gstackRoot 里任何一条名字不叫 docs/workflow-state/current-topic 的软链都会被豁免吞掉，
// 从而绕开 pin/redirect/deny 全部逻辑（2026-08-20 红队实证：backdoor -> 别的项目 可读可写；
// 更致命的是 docs2 -> docs 这种别名，直接重开了本 hook 存在的理由要堵的那个洞）。
function realTargetOf(input) {
  let probe = resolve(input);
  const missing = [];
  while (!existsSync(probe)) {
    try {
      if (lstatSync(probe).isSymbolicLink()) return null;   // 悬空软链 = 身份边界
    } catch (error) {
      if (error?.code !== 'ENOENT') return null;
    }
    const parent = join(probe, '..');
    if (parent === probe) return null;
    missing.unshift(probe.slice(parent.length + (parent.endsWith('/') ? 0 : 1)));
    probe = parent;
  }
  try { return join(realpathSync(probe), ...missing); } catch { return null; }
}

// 尽力求 realpath；不可解析（如软链悬空）时退回字面值，供"排除"用途——
// 排除面宁可用字面兜住，也不要因为解析失败而漏掉一条展示路径。
function realOrLiteral(input) {
  try { return realpathSync(input); } catch { return input; }
}

function classifyPath(p, binding) {
  if (typeof p !== 'string' || !p) return { scoped: false };
  let s = p.replace(/^\.\//, '');
  const gd = join(gstackRoot, 'docs');
  const gState = join(gstackRoot, '.claude', 'workflow-state.yaml');
  const gTopic = join(gstackRoot, '.claude', 'current-topic.txt');
  // 框架自身作用域豁免（与 resolvedRelativeProjectAccess 的 frameworkRoot 短路**同口径**）。
  // luca_gstack 的检出可能物理上就坐落在 PROJECTS_ROOT 之内（嵌套检出）。没有这条时，下面的
  // PROJECTS_ROOT 循环会先把框架自己的每个文件判成项目作用域，无 pin 的框架/meta session 连
  // 只读框架文件都被拒——而 route-guard 恰恰指示这类 session「不要 switch，直接在框架检出上
  // 作业」，两条指令互斥。更要命的是不对称：相对路径走 resolvedRelativeProjectAccess 已放行，
  // 绝对路径却在此被拒，**同一操作放行与否只取决于路径怎么拼**——这不是安全边界。
  // Bash 与 Read/Edit 两条链最终都汇到 classifyPath（directProjectPathsAllowed 逐 token 调它），
  // 补在这一处即可。**三条共享展示路径除外**：它们虽在 gstackRoot 内，正是本守卫要保护的项目软链。
  // 判据必须同时看**字面**与**归一化**两种形态：insidePath 是纯字符串前缀比对，
  // 只看字面的话 `<gstackRoot>/../../otherproj/x` 会因为字面以 gstackRoot 开头而被误放行，
  // 等于用 `..` 就能绕开整个项目隔离（2026-08-20 真机实测到该洞：直接路径被拒、穿越形式却列出了
  // 别的项目内容）。resolve() 吃掉 `..`/`.` 后再查一次，逃逸出根的路径归一化后自然落不进来。
  // 展示路径的排除也一律对归一化形态判，免得 `<gstackRoot>/x/../docs` 这类绕过保护面。
  // 判据必须问**真实目标**，不能只看字面或词法归一化：
  //   · 字面前缀 → `<gstackRoot>/../../otherproj/x` 会被误放行（词法洞，已修）
  //   · 词法归一化 → 仍不解析软链，`<gstackRoot>/backdoor/...` 照样被误放行（本次修的洞）
  // 三条共享展示路径的排除同样按 realpath 判，这样**经由任何别名软链**抵达它们的路径
  // 都会被认出来，而不是只认字面那三个名字。
  // 两侧必须锚在**同一基准**：gReal 是 realpath 形态；排除项若在软链不可解析时退回字面值
  // （/tmp/... 而非 /private/tmp/...），前缀比对就会落空、保护面静默失效——首版这么写，
  // 四条保护面断言当场转红。故兜底一律拼在 realpath 后的根上。
  const rootReal = realOrLiteral(gstackRoot);
  const underRoot = (abs, ...parts) => realTargetOf(abs) || join(rootReal, ...parts);
  const gReal = realTargetOf(s);
  if (gReal
      && insidePath(s, gstackRoot)
      && insidePath(gReal, rootReal)
      && !insidePath(gReal, underRoot(gd, 'docs'))
      && !samePath(gReal, underRoot(gState, '.claude', 'workflow-state.yaml'))
      && !samePath(gReal, underRoot(gTopic, '.claude', 'current-topic.txt'))) {
    return { scoped: false };
  }
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
function shellWordSegments(command) {
  const segments = [];
  let words = [];
  let token = null;
  let quote = '';

  const finishToken = (end) => {
    if (!token) return;
    token.end = end;
    words.push(token);
    token = null;
  };
  const finishSegment = () => {
    if (words.length) segments.push(words);
    words = [];
  };

  for (let index = 0; index < command.length; index++) {
    const char = command[index];
    if (!token && !quote && /\s/.test(char)) continue;
    if (!quote && (char === ';' || char === '|' || char === '&' || char === '\n')) {
      finishToken(index);
      finishSegment();
      continue;
    }
    if (!token) token = { start: index, end: index, value: '' };
    if (quote) {
      if (char === quote) {
        quote = '';
      } else if (char === '\\' && quote === '"' && index + 1 < command.length) {
        token.value += command[++index];
      } else {
        token.value += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '\\' && index + 1 < command.length) {
      token.value += command[++index];
    } else if (/\s/.test(char)) {
      finishToken(index);
    } else {
      token.value += char;
    }
  }
  finishToken(command.length);
  finishSegment();
  return segments;
}

function exactReadBrokerInvocation(command, expectedSessionId) {
  const source = String(command || '').trim();
  if (!source || /[;&|><`\n\r]/.test(source) || /\$/.test(source)) return false;
  const segments = shellWordSegments(source);
  if (segments.length !== 1) return false;
  const words = segments[0].map((word) => word.value);
  if (words[0] !== 'node' || words[1] !== 'scripts/project-read.mjs') return false;
  if (!['read', 'list', 'search'].includes(words[2])) return false;
  const options = new Map();
  for (let index = 3; index < words.length; index += 2) {
    const flag = words[index];
    const value = words[index + 1];
    if (!['--cap', '--relative', '--pattern'].includes(flag) || value === undefined || options.has(flag)) return false;
    options.set(flag, value);
  }
  const cap = options.get('--cap') || '';
  if (!/^[\w-]{1,36}:[0-9a-f-]{36}$/i.test(cap)) return false;
  if (!expectedSessionId || cap.slice(0, cap.indexOf(':')) !== expectedSessionId) return false;
  if (words[2] === 'search' && !options.has('--pattern')) return false;
  if (words[2] === 'search' && options.has('--relative')) return false;
  if (words[2] !== 'search' && options.has('--pattern')) return false;
  if (options.has('--relative')) {
    const rel = options.get('--relative');
    if (!rel || isAbsolute(rel) || rel.split(/[\\/]/).some((part) => !part || part === '.' || part === '..')) return false;
  }
  return true;
}

// 元字符 ≠ 够得着 sidecar（2026-09-03 收窄）。sidecar 是**直挂配置目录下的 dot-entry**，而
// bash/zsh 默认 glob 不匹配前导点、向下的 glob 也无法向上走。旧判据「配置目录后任意位置出现
// 元字符即 deny」把正常的框架编辑（skills 子目录下的通配）整类误判成伪造 sidecar。只有三种
// 形态能真正落到 sidecar 上，逐一保留、其余放行：
//  ① 首段自带元字符 —— 直接对着配置目录根展开，能命中 dot-entry；这一支刻意留了安全余量：
//     默认 glob 不匹配前导点，但 dotglob / GLOB_DOTS 一旦打开就能匹配，且守卫看不到调用方
//     的 shell 选项，故首段一律严判。想再收窄这一支的人请先解决这个不可观测性。
//  ② tail 含上行段 —— 可向上走，落点无法静态定界，整条 tail 退回旧的严判；
//  ③ tail 含 $ / 反引号 / ( —— 运行期生成任意文本，同样无法静态定界。
// 不含元字符的 dot-entry（如 framework 写豁免开关）保持既有放行语义，不因本次收窄改变。
function grantControlPlaneGlobReach(tail) {
  if (/[$`(]/.test(tail)) return true;
  const segments = tail.split('/');
  return /[*?[\]{}\\]/.test(segments.includes('..') ? tail : segments[0]);
}

// 路径判据单一实现：补丁 header 目标与 Write/Edit 的 file_path 走同一条，杜绝两处漂移。
function grantControlPlanePath(path, prefix) {
  if (typeof path !== 'string' || !path) return null;
  const absolute = isAbsolute(path) ? resolve(path) : resolve(gstackRoot, path);
  const dir = resolve(gstackRoot, '.claude');
  const rel = relative(dir, absolute);
  if (rel && !rel.startsWith('..') && !isAbsolute(rel) && rel.split('/').pop().startsWith(prefix)) return path;
  return null;
}

function readGrantControlPlaneReference(tool, inp) {
  const prefix = '.session-read-';
  if (tool === 'Bash') {
    const command = String(inp.command || '');
    // 补丁正文是任意源文本、不是路径位（与 inspectApplyPatch 同一条不变量）：识别为补丁时只按
    // header 目标判定，正文里出现的配置目录字面量不再被当作 shell 路径引用扫描。
    // 无法识别为补丁（含无 header 的畸形载荷）→ 退回下面的整段文本扫描，方向 fail-closed。
    const patchTargets = applyPatchTargets(command);
    if (patchTargets) {
      for (const target of patchTargets) {
        const hit = grantControlPlanePath(target, prefix);
        if (hit) return hit;
      }
      return null;
    }
    const partial = ['.session', 'rea'].join('-');
    for (const source of new Set([command, expandLocalAssignments(command)])) {
      if (source.includes(prefix) || source.includes(partial)) return prefix;
      const references = [...source.matchAll(/(?:^|[\s"'`])(?:\.\/)?\.claude\/([^\s"'`;|&<>]*)/g)];
      for (const match of references) {
        const tail = match[1] || '';
        const unquotedGlob = tail.replace(/[\[\]{}*?\\]/g, '');
        if (unquotedGlob.includes(prefix) || grantControlPlaneGlobReach(tail)) return match[0].trim();
      }
    }
    return null;
  }
  return grantControlPlanePath(inp.file_path || inp.notebook_path || inp.path, prefix);
}

function mentionsReadBrokerInvocation(command) {
  return String(command || '').includes('scripts/project-read');
}

function exactReadBrokerMaintenance(command) {
  const source = ['scripts/project', 'read.mjs'].join('-');
  if (String(command || '').trim() === `git add ${source}`) return true;
  return String(command || '').trim() === 'node --check scripts/project-read.mjs';
}

// Search patterns are data, not path operands. Mask only the pattern argument of a
// small, explicit command subset and only when an explicit path operand follows it.
// Unknown options remain unmasked (conservative fallback), while real path operands
// continue through the normal redirect/deny logic.
function maskSearchPatternArguments(command) {
  const ranges = [];
  const noValueFlags = /^-(?:[nHhIiLlSsUuvwcFq]+|-[A-Za-z0-9][\w-]*)$/;
  const valueFlags = new Set([
    '-A', '-B', '-C', '-g', '-j', '-m', '-t', '-T',
    '--after-context', '--before-context', '--context', '--encoding', '--engine',
    '--glob', '--iglob', '--max-count', '--max-depth', '--max-filesize', '--pre',
    '--pre-glob', '--replace', '--sort', '--sortr', '--threads', '--type', '--type-add',
  ]);

  for (const segment of shellWordSegments(String(command || ''))) {
    let cursor = 0;
    if (segment[cursor]?.value === 'command') cursor++;
    const executable = (segment[cursor]?.value || '').split('/').pop();
    if (!['rg', 'grep', 'egrep', 'fgrep'].includes(executable)) continue;
    cursor++;

    let defaultPattern = null;
    const explicitPatterns = [];
    const pathOperands = [];
    let pending = '';
    let positionalOnly = false;
    let unsupported = false;

    for (; cursor < segment.length; cursor++) {
      const word = segment[cursor];
      const value = word.value;
      if (pending === 'pattern') {
        explicitPatterns.push(word);
        pending = '';
        continue;
      }
      if (pending === 'option-value') {
        pending = '';
        continue;
      }
      if (!positionalOnly && value === '--') {
        positionalOnly = true;
        continue;
      }
      if (!positionalOnly && (value === '-e' || value === '--regexp')) {
        pending = 'pattern';
        continue;
      }
      if (!positionalOnly && /^(?:-e|--regexp=).+/.test(value)) {
        unsupported = true;
        break;
      }
      if (!positionalOnly && value.startsWith('-')) {
        const optionName = value.split('=')[0];
        if (valueFlags.has(optionName)) {
          if (!value.includes('=')) pending = 'option-value';
          continue;
        }
        if (noValueFlags.test(value)) continue;
        unsupported = true;
        break;
      }
      if (!defaultPattern && explicitPatterns.length === 0) defaultPattern = word;
      else pathOperands.push(word);
    }

    if (unsupported || pending || pathOperands.length === 0) continue;
    ranges.push(...explicitPatterns, ...(defaultPattern ? [defaultPattern] : []));
  }

  if (!ranges.length) return { command, restore: value => value };
  const restorations = [];
  let masked = String(command);
  [...ranges].sort((a, b) => b.start - a.start).forEach((range, index) => {
    const marker = `__LUCA_SEARCH_PATTERN_${index}__`;
    restorations.push([marker, masked.slice(range.start, range.end)]);
    masked = masked.slice(0, range.start) + marker + masked.slice(range.end);
  });
  return {
    command: masked,
    restore(value) {
      let restored = value;
      for (const [marker, original] of restorations) restored = restored.replace(marker, original);
      return restored;
    },
  };
}

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
      const value = match[0];
      const classified = classifyPath(value, binding);
      // 框架自身路径（嵌套检出时会落在 PROJECTS_ROOT 的正则里）不是项目作用域：
      // classifyPath 已判 scoped:false，此处必须据此放行。原先只看 redirected，
      // 而 scoped:false 天然没有 redirected，会把框架路径误判成"无 pin 的项目访问"。
      if (!classified.scoped) continue;
      seen = true;
      if (!classified.redirected) return { seen, allowed: false, value };
    }
  }
  return { seen, allowed: true };
}

// Expand only absolute-valued environment references for detection. Commands
// that reach project/display paths through an env alias are denied instead of
// rewritten: shell assignments can change the value again after this hook.
// 从命令文本**自身**提取静态赋值（`NAME=值`），与 env 变量合流参与展开。
// **为什么需要**：此前只展开已存在的 process.env 变量，于是把路径拆进本地变量就能让
// PROJECTS_ROOT 的字面子串在命令文本里从不出现，静态匹配整个落空（2026-08-20 红队实证：
// `A="…/项"; B="目"; cat "$A$B/别的项目/x"` 完全放行）。这条不需要恶意动机——agent 自己写
// 脚本时用变量拼含中文/空格的路径是很自然的写法，会**无意**触发。
// **明确不覆盖**（不要以为"变量间接已经处理了"）：命令替换 `$(...)`／反引号／`eval`／数组／
// printf 拼接／字符串切片等动态求值。那属于"任何非执行式静态分析都躲不掉"的范畴，
// 成本收益比低，故意不追。这里只堵**无意**触发的那一类——真要绕总能绕，但不该绊倒老实写法。
function localAssignments(cmd) {
  const map = new Map();
  // 只在语句起始位置认赋值；值只吃静态形态：双引号（允许 $VAR 但禁 $( ）、单引号、裸词。
  const re = /(?:^|[;&|\n]|\s)\s*([A-Za-z_][A-Za-z0-9_]*)=("(?:[^"`$]|\$(?!\())*"|'[^']*'|[^\s"'`;&|()$]+)/g;
  for (const m of String(cmd || '').matchAll(re)) {
    let v = m[2];
    if (v[0] === '"' || v[0] === "'") v = v.slice(1, -1);
    map.set(m[1], v);
  }
  return map;
}

function expandLocalAssignments(cmd) {
  let expanded = String(cmd || '');
  const table = [...localAssignments(expanded).entries()].sort((a, b) => b[0].length - a[0].length);
  for (let pass = 0; pass < 3; pass++) {
    const before = expanded;
    for (const [key, value] of table) {
      expanded = expanded
        .replace(new RegExp(`\\$\\{${escapeRe(key)}\\}`, 'g'), value)
        .replace(new RegExp(`\\$${escapeRe(key)}\\b`, 'g'), value);
    }
    if (expanded === before) break;
  }
  return expanded;
}

function variableProjectReference(cmd, binding) {
  let expanded = String(cmd || '');
  const original = expanded;
  const table = Object.entries(process.env)
    .filter(([key, value]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && typeof value === 'string' && value.startsWith('/'));
  for (const [key, value] of localAssignments(original)) table.push([key, value]);
  table.sort((a, b) => b[0].length - a[0].length);
  // 多趟：允许链式引用逐层解开；收敛即停，最多 3 趟防病态输入打转。
  // **防御性冗余**：2026-08-20 变异实测改成单趟后现有断言全绿——赋值语句自身被展开时
  // 字面路径就已出现并被抓到。留着是便宜的保险，但别以为它被测试守着。
  for (let pass = 0; pass < 3; pass++) {
    const before = expanded;
    for (const [key, value] of table) {
      expanded = expanded
        .replace(new RegExp(`\\$\\{${escapeRe(key)}\\}`, 'g'), value)
        .replace(new RegExp(`\\$${escapeRe(key)}\\b`, 'g'), value);
    }
    if (expanded === before) break;
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

// 与 inspectApplyPatch 完全同一套识别条件，只取 header 目标：让"正文不是路径位"这条不变量
// 能被补丁之前的检查复用（无 header 时返回 null → 调用方退回整段文本扫描，方向 fail-closed）。
function applyPatchTargets(command) {
  const source = String(command || '');
  if (!source.startsWith('*** Begin Patch\n') || !source.trimEnd().endsWith('*** End Patch')) return null;
  const header = /^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm;
  const targets = [...source.matchAll(header)].map((match) => match[1].trim()).filter(Boolean);
  return targets.length ? targets : null;
}

// Codex projects apply_patch into this hook's Bash-shaped input. A patch is not a
// shell command: only its file headers are path operands; body lines are arbitrary
// source text. Inspect and, when bound, rewrite those headers without scanning body
// content as executable shell syntax.
function inspectApplyPatch(command, binding) {
  const source = String(command || '');
  if (!source.startsWith('*** Begin Patch\n') || !source.trimEnd().endsWith('*** End Patch')) return null;

  const header = /^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm;
  const matches = [...source.matchAll(header)];
  if (!matches.length) return null;

  const replacements = [];
  for (const match of matches) {
    const target = match[1].trim();
    if (isFrameworkPath(target) && !frameworkEscapeActive()) {
      return { handled: true, denied: true, reason: `补丁目标位于只读母版保护区：${target}` };
    }
    const classified = classifyPath(target, binding);
    if (!classified.scoped) continue;
    if (!classified.redirected) {
      return { handled: true, denied: true, reason: `补丁目标不属于当前可验证 binding：${target}` };
    }
    const targetOffset = match.index + match[0].lastIndexOf(match[1]);
    replacements.push({ start: targetOffset, end: targetOffset + match[1].length, value: classified.redirected });
  }

  let rewritten = source;
  for (const item of replacements.sort((a, b) => b.start - a.start)) {
    rewritten = rewritten.slice(0, item.start) + item.value + rewritten.slice(item.end);
  }
  return { handled: true, denied: false, changed: rewritten !== source, command: rewritten };
}

function main() {
  const state = readSessionState();
  const binding = activeBinding(state);
  const bashCommand = toolName === 'Bash' ? String(input.command || '') : '';
  // 2026-09-03 post-seal 增量审计 finding #5：sidecar 写保护刻意保持 unconditional，不随
  // READ_GRANTS_ENABLED 关闭而放松——authorizeRead/reconcilePromptGrants 已在
  // project-read-grants.mjs 内部无条件 deny，这条只是纵深防御的另一层，不该被同一个开关连坐掉。
  const grantControlPlane = readGrantControlPlaneReference(toolName, input);
  if (grantControlPlane) {
    return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
      // 文案必须给出改写指引：本判据保留了 dotglob 安全余量，正常路径也可能被它拦下，而一条只说
      // 「你在伪造控制平面」的拒绝会把人推向绕行（实测：一次误拦就催生了「把载荷挪出命令文本」的
      // 方案）。给出两条不绕闸的出路，比让人自己发明第三条强。
      permissionDecisionReason: `read-grant sidecar 是 hook 内部控制平面，普通工具不得读取、写入或伪造（${grantControlPlane}）。`
        + '若你并非要碰 sidecar，只是路径里带了通配或运行期展开：把它写成不含元字符的确定路径，'
        + '或改用 Write/Edit 等文件类工具（按 file_path 精确判定，不扫命令文本）。' } });
  }
  if (toolName === 'Bash') {
    const patch = inspectApplyPatch(bashCommand, binding);
    if (patch?.denied) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: patch.reason } });
    }
    if (patch?.handled) {
      if (patch.changed) {
        return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: { ...input, command: patch.command } } });
      }
      passThrough();
    }
  }

  // framework/ 只读保护先于项目隔离（正交，两者都可能命中同一次调用；framework 写一律不放行）
  const fwHit = frameworkWriteDeny(toolName, input);
  if (fwHit) {
    return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
      permissionDecisionReason: `framework/ 是只读母版保护区（SF-002 宪法红线）：「${fwHit}」被拒。原型/演示应把母版复制到项目目录再改，绝不原地写 framework/。确需维护母版本身 → touch .claude/.allow-framework-write（改完 rm）或设 env ALLOW_FRAMEWORK_WRITE=1 后重试。` } });
  }

  // Bash 先处理，且优先识别命令位的 project.sh switch/new —— 直接 CLI 切换（! 命令）route-guard 看不到，
  // 在此认领 pin，闭合"CLI 切换后 pin 不更新"的洞。识别后立即用新 pin 继续本命令的重写。
  if (toolName === 'Bash') {
    const cmd = bashCommand;
    const maskedSearch = maskSearchPatternArguments(cmd);
    const guardCmd = maskedSearch.command;
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
    if (mentionsReadBrokerInvocation(cmd)) {
      if (exactReadBrokerInvocation(cmd, sid)) passThrough();
      if (!exactReadBrokerMaintenance(cmd)) {
        return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
          permissionDecisionReason: '跨项目只读 broker 必须是单一 exact argv 命令；禁止管道、重定向、控制操作符、命令替换、未知参数或复合命令。' } });
      }
    }
    const variableRef = variableProjectReference(guardCmd, binding);
    if (variableRef) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: 'Bash 通过环境变量或 ~ 间接引用项目根/display 路径，hook 无法安全重写其运行时值；请改用已验证 binding 的显式绝对路径。' } });
    }
    const relativeRef = relativeProjectReference(guardCmd, binding);
    if (relativeRef?.denied) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: `Bash 相对路径会离开 luca_gstack 并进入未绑定/跨项目作用域（${relativeRef.value}${relativeRef.resolved ? ` → ${relativeRef.resolved}` : ''}）；请先完成项目绑定或改用明确的框架内路径。` } });
    }
    const direct = directProjectPathsAllowed(guardCmd, binding);
    if (direct.seen && !direct.allowed) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: `Bash 直接项目路径不属于当前可验证 binding（${direct.value}）；禁止 no-pin/跨项目/失效 identity 访问。` } });
    }
    const r = rewriteBash(guardCmd, binding);
    if (r.unsafe) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: 'Bash 项目路径含 . / .. / 空段 traversal，禁止重写或执行。' } });
    }
    if (r.hasScoped && !binding) {
      // Bash 无 pin 一律 deny：shell 字符串里读/写难可靠区分，且共享展示链可能指向另一
      // session 的项目。框架/meta 任务应跳过项目状态；确需项目资料则先建立 binding。
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: `项目状态 ${state.state} 没有可验证的 TURN_ACTIVE identity/epoch，Bash 不能操作共享 docs/state/topic。框架任务请跳过项目状态；确需读取或写入项目资料，请先绑定项目。` } });
    }
    if (r.changed) {
      return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: { ...input, command: maskedSearch.restore(r.cmd) } } });
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
    const operation = toolName === 'Read' ? 'read' : toolName === 'Grep' ? 'search' : toolName === 'Glob' ? 'list' : '';
    if (operation && ['NO_PIN', 'TURN_ACTIVE'].includes(state.state) && readGrants?.authorizeRead) {
      const verdict = readGrants.authorizeRead({
        gstackRoot,
        projectsRoot: PROJECTS_ROOT,
        sessionId: sid,
        turnId: state.state === 'TURN_ACTIVE' ? state.turn?.turn_id : undefined,
        binding,
        operation,
        toolName,
        targetPath: target,
      });
      if (verdict.allowed) {
        return out({ hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: { ...input, [pathField]: verdict.canonicalPath } } });
      }
    }
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
