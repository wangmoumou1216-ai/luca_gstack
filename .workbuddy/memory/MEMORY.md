# luca_gstack 工作区长期记忆（WorkBuddy 层）

## 定位声明（2026-09-16，luca 明确纠正）

**luca_gstack 不是"项目"，是 harness——luca 给我外置的一层执行框架。**

- 它的角色等同于"外置 system prompt / 执行契约层"，不是被开发的下游项目，也不是普通项目上下文。
- 仓库内的 AGENTS.md / CLAUDE.md / CONTEXT.md / .claude/skill-os/* 是这层 harness 的契约文件，读取后**按其语义执行**。
- 层级关系：WorkBuddy runtime 原生约束 > luca_gstack harness 契约（外置层）> 具体下游项目（~/Desktop/项目/<name>/）。
- 本环境无 Claude Code hooks 注入，route-guard 等按 AGENTS.md 语义手动遵守。

## 最高规则（2026-09-16，luca 颁布）

**对 luca_gstack 框架：只读，不能改写。**

- 范围：整个框架层——framework/、.claude/skill-os/、.claude/agents/、.claude/hooks/、
  .claude/skills/、契约文件（AGENTS.md/CLAUDE.md/CONTEXT.md 等）、scripts/。
- 执行中读、按契约执行都正常；**任何写/改/删框架文件一律禁止**。
- 发现框架问题（bug、过期、缺漏）→ 只报告 luca，不动手修；修改动议交 luca 裁。
- 与 CONTEXT.md 红线 1（framework/ 只读）同向，但本条范围更广、优先级最高（用户最新明确请求）。
- 例外边界：`memory/`（框架三层记忆）按其自身写入协议正常读写——那是记忆系统的设计用途，
  不属于"改写框架"；`.workbuddy/` 是 WorkBuddy 层，不受此限。下游项目目录（~/Desktop/项目/）不受此限。

## 产出物落位规则（2026-09-16，luca 颁布）

**我的任何产出物（deliverable）不放进 luca_gstack 框架目录。**

- 依据：框架定位是外置 harness（只读执行律），不是工作产出存放地——「环境/项目剥离原则」本来就是这个设计意图。
- 禁放：根目录新建文件、`.claude/`、`framework/`、`memory/`、`docs/`（共享软链）、`scripts/` 等框架树内任何位置。
- 允许落位：
  1. **下游项目目录** `~/Desktop/项目/<name>/`——按项目归属落（需先过 Project Gate 绑定项目）
  2. **`.workbuddy/`**——WorkBuddy 层自己的产物与临时工作文件
  3. 系统临时目录（macOS `mktemp` 等）
- 判定顺序：任务有项目归属 → 落项目目录；无项目归属（框架/meta/session 级产物）→ 落 `.workbuddy/`。

## 模型路由使用画像（2026-09-16，luca 确认）

- **范围**：仅 Claude Code + Codex 双 harness，无第三环境扩展计划。
- **主力环境是 Codex**（Claude 为辅）——模型路由的审查/修复优先级以 Codex 侧为重；
  治理工具链目前锚在 Claude 侧文件上，存在「守护投入与使用权重倒挂」。
- 主力环境私有配置现状（2026-09-16 实测）：用户级 `~/.codex/config.toml` 写死
  `model = "gpt-5.6-sol"` + 全局 `xhigh`——**v2.0 已改判「设计内行为」**（见下条锚点制）。
- 审查报告真值：`.workbuddy/memory/模型路由最终审查报告-合并版.md`（**v2.0 握手终稿**，
  v1.3 备份 .v1.3.bak）。

## 锚点制动念调配（2026-09-16 v2.0 裁决，luca 钦定）

- **峰值三明治**：计划(peak)→执行(anchor)→验证(peak)⟲；红队/专家会审/计划模式/review→peak
  （gpt-6-astra=catalog priority 最小值）；深度研究与执行→anchor（config 顶层 model 行=动态锚点，
  luca 随时换）。触发者含 agent 自己 spawn。
- **机制铁事实（0.154.0 隔离实测）**：内嵌 `[profiles.*]` 已 legacy 会导致 --profile 加载失败，
  正确载体=独立 `~/.codex/peak.config.toml`；profile 省略 model 行继承顶层锚点；
  agent spawn 统一 `--profile peak` 禁 `-m` 直传（N 个硬编码点）。
- **C-5 温和并存**：框架 effort 轴（yaml codex 段/runner/toml）原样保留，用户层 peak 轴叠加其上，
  零框架改动（只读红线）；行为合同投影 AGENTS.md 与机检入 governance 两动议待 luca 裁。
- 设计推导全记录：`.workbuddy/memory/锚点制动态调配设计稿-v2.md`（3 专家+红队 2 轮）。
