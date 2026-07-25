// Harness 检测 + 能力探针（P0 / WS-A0，2026-07-25 跨-agent 适配）。
//
// 职责：告诉调用方"当前跑在哪个 agent harness 上、它具备哪些能力"，让框架能**报告**降级面，
// 而不是静默失效。与 memroot.mjs（store 解析）/ project-substrate.mjs（项目身份）分属不同
// concern，保持 deep-module 边界。
//
// 【按输出类型反转默认 — 本模块最关键的安全设计】
// harness 检测天然不可靠（Codex 侧 env 名未核验、未来会变）。所以默认值**按输出类型分开定**：
//  · advisory / 上下文注入（人类可读文本）：unknown → 照常输出（本就 harness-agnostic，无害）
//  · CC 专有强制动词（decision:block / permissionDecision:deny / updatedInput）：
//    **仅在 claude 正向确定时才允许**；unknown/codex 一律降级为纯文本 advisory。
// 反过来（unknown 默认吐 CC JSON）会让真 Codex 会话收到解析不了的 JSON——这正是要避免的。
import { statSync } from 'fs';
import { join } from 'path';

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

// 能力表。writeHook/blockVerb/inputMutation 门于 **claude 正向**（非 !== 'codex'），
// 即 unknown 一律按"没有"处理 → 强制动词降级为文本。
export function capabilities(harness = detectHarness()) {
  const isClaude = harness === HARNESS.CLAUDE;
  return {
    harness,
    // CC 专有强制原语（仅 claude 正向确定时可用）
    blockVerb: isClaude,        // Stop hook 的 decision:block（自成长强制捕获）
    writeHook: isClaude,        // PreToolUse 对文件写工具名触发（project-scope-guard 拦截）
    inputMutation: isClaude,    // updatedInput（docs 重定向）
    workflow: isClaude,         // Workflow 工具（两个 evolution scout）
    askUserWidget: isClaude,    // AskUserQuestion 结构化提问
    // 跨 harness 通常都有（但 Codex 侧工具名未核验 → 标 unverified）
    fanout: true,               // 子 agent 派发；Codex 有 GA subagents，且研究类 skill 自带顺序回退
    web: true,                  // WebSearch/WebFetch（Codex 工具名未核验）
  };
}

// 强制动词是否允许原样输出。调用点：session-sync 的 decision:block、project-scope-guard 的
// deny/updatedInput。false 时调用方必须改吐 harness-agnostic 纯文本。
export function canEmitControlVerb(env = process.env) {
  return capabilities(detectHarness(env)).blockVerb;
}

// 读 skill 的 Codex 存活性 registry（声明式，非派生量：只存 {tier, degrade}）
export function readViability(repoRoot) {
  try {
    const p = join(repoRoot, '.claude', 'skill-os', 'codex-viability.yaml');
    statSync(p);
    return p;
  } catch {
    return null;
  }
}
