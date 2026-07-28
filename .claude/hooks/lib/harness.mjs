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

// 能力表。CC 专有原语 = **非-codex 即视为可用**（见上：失效方向偏向保住强制）。
export function capabilities(harness = detectHarness()) {
  const notCodex = harness !== HARNESS.CODEX;
  return {
    harness,
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
