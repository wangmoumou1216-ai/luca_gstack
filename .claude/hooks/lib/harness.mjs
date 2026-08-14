// Harness 检测 + 能力探针（P0 / WS-A0，2026-07-25 跨-agent 适配）。
//
// 职责：告诉调用方"当前跑在哪个 agent harness 上、它具备哪些能力"，让框架能**报告**降级面，
// 而不是静默失效。与 memroot.mjs（store 解析）/ project-substrate.mjs（项目身份）分属不同
// concern，保持 deep-module 边界。
//
// 【共享控制面 — 2026-08-05/06 活体与二进制证据】
// Claude 与当前 Codex 都原生接受 decision:block、permissionDecision:deny，以及与
// permissionDecision:allow 同发的 updatedInput。三态（claude/codex/unknown）一律保留这些强制动词；
// 只有 Workflow 原语与 AskUserQuestion widget 仍是 Claude 专有能力。失效方向固定为保住治理强制。

export const HARNESS = {
  CLAUDE: 'claude',
  CODEX: 'codex',
  UNKNOWN: 'unknown',
};

// 正向检测：CLAUDE_PROJECT_DIR 是 Claude Code 注入的标志性 env（本仓 6 个 hook 全依赖它）。
// Codex 侧 env 只在明确出现时才判 codex，绝不从 cwd 或工具名猜 harness。
export function detectHarness(env = process.env) {
  if (env.CLAUDE_PROJECT_DIR) return HARNESS.CLAUDE;
  if (env.CODEX_HOME || env.CODEX_SANDBOX || env.CODEX_SESSION_ID) return HARNESS.CODEX;
  return HARNESS.UNKNOWN;
}

// ── 「输出方言」与「实际 CLI」是两个问题（2026-08-04，勿混用）────────────────
// detectHarness() 回答的是**该按哪套协议输出**。当 .codex/codex-hook-adapter.mjs 在中间层
// 代偿时，它注入 CLAUDE_PROJECT_DIR 让 hook 走共享结构化控制路径，再由 adapter 做最小 schema 修补。
// 此时 detectHarness() 返回 'claude' 是**正确**的，不是 bug；两端的控制动词本就同字段同语义。
//
// 需要知道**实际跑在哪个 CLI** 的消费方（遥测、诊断、luca app 的 CLI 切换开关、
// 按厂商分流的行为）一律用 actualHarness()，绝不去猜 CLAUDE_PROJECT_DIR。
export function actualHarness(env = process.env) {
  const declared = String(env.LUCA_ACTUAL_HARNESS || '').toLowerCase();
  if (declared === HARNESS.CODEX || declared === HARNESS.CLAUDE) return declared;
  return detectHarness(env);   // 无显式声明时退回协议侧判断
}

// 当前 CC 语义是否由 adapter 代偿（=真实 harness 非 Claude 但按 CC 协议在跑）。
export function isAdapted(env = process.env) {
  return env.LUCA_HARNESS_ADAPTED === '1';
}

// ── Codex 方言表（2026-08-04 实测校正）──────────────────────────────────────
// 【本次修正的根因】首版把 Codex 判为"无 hook 强制能力"，据此把 deny/block 一律降级为
// stderr advisory。实测 codex-cli 0.133.0（`codex features list`）：`hooks` 与 `multi_agent`
// 均为 stable+enabled，stdin/stdout JSON 协议与 CC 近乎同构。真实差异只有三处：
//   【以下三条为 2026-08-04 的判断，2026-08-05/06 深审逐条推翻，保留以记录纠错轨迹】
//   1. ~~Stop 方言不同~~ → **同字段同语义**，`decision:block`+`reason` 直接可用，不该翻译
//      （二进制校验串 "Stop hook returned decision:block without a non-empty reason"）
//   2. ~~updatedInput 被显式拒绝~~ → **受支持**，只需与 `permissionDecision:allow` 同发
//      （校验串 "PreToolUse hook returned updatedInput without permissionDecision:allow"）；
//      原依据 openai/codex#18491 针对旧版本，不适用于 0.146.0
//   3. ~~只对 shell / apply_patch 分发~~ → 工具名实测是 **`Bash`** 与 `apply_patch`（不是 `shell`）
// 因此「能力有无」不足以描述，需再加一层「方言」——否则会把"翻译一下就能用"误判成"用不了"。
//
// 旧 capability 字段仍保留给调用方，但其事实值按当前 harness 校正：blockVerb/writeHook/
// inputMutation 在 Claude、Codex 与 unknown 都为 true；workflow/askUserWidget 仍只在 Claude 为 true。
// 实测工具名（matcher='.*' 抓真实载荷）：shell 执行 = 'Bash'（**不是 'shell'**）
export const CODEX_PRE_TOOL_SCOPE = ['Bash', 'apply_patch'];

// Codex 侧文件写工具名（≈ CC 的 Write/Edit/MultiEdit/NotebookEdit）
// 注意：apply_patch 的 tool_input 是 {command} 而非 {file_path}——消费方按用途分流别名，
// 权威实现在 .codex/codex-hook-adapter.mjs 的 TOOL_ALIAS_BY_HOOK。
export const CODEX_WRITE_TOOLS = ['apply_patch'];

// 【已废弃 · 保留为反面记录，勿使用】曾以为 Stop 拦截两家方言不同，实测**同字段同语义**：
// Codex 原生接受 {decision:'block', reason}。若按本函数去翻译成 continue:false，
// 语义会反转成"终止本轮"（自成长捕获不发生 + 用户回合被杀）。零调用点，不要接线。
export function stopDialect() {
  return 'shared';   // 两家一致；保留函数仅为不破坏可能的外部引用
}

// PreToolUse 的 deny 动词**两家都支持**且字段名相同（hookSpecificOutput.permissionDecision）。
// deny 与 canEmitControlVerb 覆盖的 block/updatedInput 都是双端共享控制面；保留独立函数只是兼容调用方。
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

// 能力表。结构化治理控制面三态都可用；仅交互/编排 widget 需要正向确认 Claude。
export function capabilities(harness = detectHarness()) {
  const notCodex = harness !== HARNESS.CODEX;
  return {
    harness,
    // ── 共享控制面 + 分发范围 ──
    denyVerb: true,                                        // PreToolUse deny：两家同字段同语义
    stopVerbDialect: 'shared',                             // Stop 拦截：两家同字段同语义
    preToolScope: notCodex ? null : CODEX_PRE_TOOL_SCOPE,  // null = 全工具分发
    contextInjection: true,                                // 两家都能注入（Codex 走 additionalContext）
    subagents: true,                                       // Codex multi_agent = stable+enabled
    blockVerb: true,            // Stop hook 的 decision:block（双端共享）
    writeHook: true,            // PreToolUse 写工具经各自 matcher/adapter 分发
    inputMutation: true,        // updatedInput + permissionDecision:allow（双端共享）
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
// project-scope-guard 的 permissionDecision:deny / updatedInput。当前三态均返回 true。
export function canEmitControlVerb(env = process.env) {
  return capabilities(detectHarness(env)).blockVerb;
}
