// Harness 检测 + 能力探针（P0 / WS-A0，2026-07-25 跨-agent 适配）。
//
// 职责：告诉调用方"当前跑在哪个 agent harness 上、它具备哪些能力"，让框架能**报告**降级面，
// 而不是静默失效。与 memroot.mjs（store 解析）/ project-substrate.mjs（项目身份）分属不同
// concern，保持 deep-module 边界。
//
// 【降级方向 — 本模块最关键的安全设计（2026-07-25 深审修正）】
// CC 专有强制动词（decision:block / permissionDecision:deny / updatedInput）**只在正向确定是
// Codex 时才降级为纯文本**；claude 与 unknown 一律照常输出。
//
// 为什么不是"unknown 也关"（我的首版设计，已被推翻）：unknown 的现实来源绝大多数是
// **CLAUDE_PROJECT_DIR 被剥掉的 Claude 会话**（测试沙箱、异常 spawn、cwd 漂移），而非 Codex。
// 若 unknown 关掉强制动词，后果是**主路径上静默丢失治理强制**（Stop 的自成长捕获环不再拦、
// PreToolUse 不再 deny 落错项目）——这比"在未知 harness 上多吐一行它解析不了的 JSON"严重得多。
// 失效方向要偏向**保住强制**，不偏向保住整洁。

export const HARNESS = {
  CLAUDE: 'claude',
  CODEX: 'codex',
  UNKNOWN: 'unknown',
};

// 正向检测：CLAUDE_PROJECT_DIR 是 Claude Code 注入的标志性 env（本仓 6 个 hook 全依赖它）。
// Codex 侧 env 名**未对实装核验**（计划 §2b），故只在明确出现时才判 codex，绝不猜。
export function detectHarness(env = process.env) {
  if (env.CLAUDE_PROJECT_DIR) return HARNESS.CLAUDE;
  if (env.CODEX_HOME || env.CODEX_SANDBOX || env.CODEX_SESSION_ID) return HARNESS.CODEX;
  return HARNESS.UNKNOWN;
}

// ── Codex 方言表（2026-08-04 实测校正）──────────────────────────────────────
// 【本次修正的根因】首版把 Codex 判为"无 hook 强制能力"，据此把 deny/block 一律降级为
// stderr advisory。实测 codex-cli 0.133.0（`codex features list`）：`hooks` 与 `multi_agent`
// 均为 stable+enabled，stdin/stdout JSON 协议与 CC 近乎同构。真实差异只有三处：
//   1. Stop 拦截**能力存在但方言不同**：CC 用 {decision:'block'}，Codex 用 {continue:false,stopReason}
//   2. PreToolUse `updatedInput` 被运行时**显式拒绝**（output_parser.rs，openai/codex#18491 OPEN）
//   3. PreToolUse 只对 shell / apply_patch 分发，read_file / grep 无 hook（同 issue）
// 因此「能力有无」不足以描述，需再加一层「方言」——否则会把"翻译一下就能用"误判成"用不了"。
//
// 【向后兼容硬约束】旧字段（blockVerb/writeHook/inputMutation/workflow/askUserWidget）的取值
// **一律保持原样不动**：blockVerb 语义是"能否原样输出 **CC 形**动词"，对 Codex 确实为 false，
// 原值正确；scripts/test-harness.mjs 的 H7a/H7b/H8 断言这些取值，本次修改必须保持全绿。
// 新能力一律以**新增字段**表达，调用方按需迁移，绝不改写既有语义（不缩减任何现有逻辑）。
export const CODEX_PRE_TOOL_SCOPE = ['shell', 'apply_patch'];

// Codex 侧文件写工具名（≈ CC 的 Write/Edit/MultiEdit/NotebookEdit）
export const CODEX_WRITE_TOOLS = ['apply_patch'];

// Stop 拦截方言：'claude' → {decision:'block',reason}；'codex' → {continue:false,stopReason}
export function stopDialect(env = process.env) {
  return detectHarness(env) === HARNESS.CODEX ? 'codex' : 'claude';
}

// PreToolUse 的 deny 动词**两家都支持**且字段名相同（hookSpecificOutput.permissionDecision）。
// 与 canEmitControlVerb 的区别：那个门管的是"CC 专有动词整体"（含 Codex 不认的 block/updatedInput），
// 这个只管 deny —— Codex 实测可用，不该被一并关掉（首版正是在这里白白丢了强制）。
export function canEmitDeny(env = process.env) {
  return true;
}

// 该 tool_name 是否落在当前 harness 的 PreToolUse 分发范围内。
// Codex 返回 false 的工具（read_file/grep）意味着 hook 根本不会被调用——调用方据此决定
// 是否需要在别处补防线，而不是误以为"放行了"。
export function isPreToolDispatched(toolName, env = process.env) {
  if (detectHarness(env) !== HARNESS.CODEX) return true;
  return CODEX_PRE_TOOL_SCOPE.includes(String(toolName || ''));
}

// 跨 harness 的「文件编辑类工具」判定。post-edit 的计数器与 session-sync 的自成长捕获
// 共用此判据——Codex 下 tool_name=apply_patch，若仍只认 CC 名，计数恒 0 会让 Stop 捕获
// 永不触发（2026-08-04 发现的连锁失效）。
export function isEditTool(toolName) {
  return /^(Write|Edit|MultiEdit|NotebookEdit|apply_patch)$/.test(String(toolName || ''));
}

// 能力表。CC 专有原语 = **非-codex 即视为可用**（见上：失效方向偏向保住强制）。
export function capabilities(harness = detectHarness()) {
  const notCodex = harness !== HARNESS.CODEX;
  return {
    harness,
    // ── 新增（2026-08-04 实测）：方言层，旧字段语义不变 ──
    denyVerb: true,                                        // PreToolUse deny：两家同字段同语义
    stopVerbDialect: notCodex ? 'claude' : 'codex',        // Stop 拦截：能力都有，方言不同
    preToolScope: notCodex ? null : CODEX_PRE_TOOL_SCOPE,  // null = 全工具分发
    contextInjection: true,                                // 两家都能注入（Codex 走 additionalContext）
    subagents: true,                                       // Codex multi_agent = stable+enabled
    // CC 专有强制原语（正向确定是 Codex 时才判为不可用）
    blockVerb: notCodex,        // Stop hook 的 decision:block（自成长强制捕获）
    writeHook: notCodex,        // PreToolUse 对文件写工具名触发（project-scope-guard 拦截）
    inputMutation: notCodex,    // updatedInput（docs 重定向）
    // 以下两项**没有安全的兜底方向**（吐一个 Codex 执行不了的 Workflow(...)/AskUserQuestion
    // 调用不会"多一层保护"，只会让 agent 卡住），故仍门于 claude 正向确定。
    workflow: harness === HARNESS.CLAUDE,
    askUserWidget: harness === HARNESS.CLAUDE,
    // 跨 harness 通常都有（Codex 侧工具名未核验 → 计划 §2b）
    fanout: true,               // 子 agent 派发；研究类 skill 自带顺序回退，成立与否都稳健
    web: true,                  // WebSearch/WebFetch（Codex 工具名未核验）
  };
}

// 强制动词是否允许原样输出。**已接线的生产调用点**：session-sync 的 decision:block、
// project-scope-guard 的 permissionDecision:deny / updatedInput。false（=正向 Codex）时
// 调用方必须改吐 harness-agnostic 纯文本。
export function canEmitControlVerb(env = process.env) {
  return capabilities(detectHarness(env)).blockVerb;
}
