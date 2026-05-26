# A5 — Context 工程 & 治理 诊断

## 现状摘要

luca_gstack 的指令面（CLAUDE.md / AGENTS.md / CONTEXT.md + 全局 CLAUDE.md + office SKILL.md）
是一套精心设计、文档化程度极高的 context 治理层：三层记忆（episodic/semantic/skill-rule）、
懒加载协议、Checkpoint/PROGRESS、route-guard 分层路由、Plan Agent 门禁、skill-invariants 保护区。
设计意图正确，惰性加载脚本（get_memory --summary、search_memory、get_rules）也确实做到了"短规则热加载"。
但指令面本身已经膨胀：单 CLAUDE.md 559 行/2049 词，叠加 office SKILL.md 600 行、AGENTS.md 528 行，
再叠加 harness 每 session 注入的 ~90 条 skill 描述系统提示。最大问题不是脚本，而是
**框架自己写在 Markdown 里的"始终在场"指令**与它所宣扬的"懒加载/Simplicity First"形成结构性张力，
且 AGENTS.md 已与 CLAUDE.md 路由语义产生可证实的漂移。

## 优点（公允）

1. **懒加载脚本设计扎实。** `get_memory.py --summary` 实测仅 23 词；session-restore.mjs 只注入
   摘要而非长历史（session-restore.mjs:67-78）。读取协议明确禁止全量读 episodic/candidates/eval 长文件
   （CLAUDE.md:148-153），这是真正的 context 节流。
2. **治理门禁闭环完整。** 稳定事实必须走 candidate → review → promoted（CLAUDE.md:479-482，
   AGENTS.md:233-234），禁止直接改 promoted-facts.yaml / CLAUDE.md，有 SC-20260523-003 记录在案。
3. **Static Fallback 设计有韧性。** CLAUDE.md:186-214「关键约束速查」是 semantic memory 的静态副本，
   脚本失败时仍可用（session-restore.mjs:76 明确回退到此节）。
4. **skill-invariants 保护区清晰。** P1-P7 + 边界判断三问（skill-invariants.md:174-182）给自动优化/人工编辑
   划定了不可触碰区，避免路由依赖被破坏。
5. **优先级体系明确声明冲突处理规则。** "以更详细、更严格的为准"（CLAUDE.md:548）+ "改 project intent 则停下问"
   （AGENTS.md:77-78），方向正确。

## 问题清单

- **[高] [一致性] AGENTS.md ↔ CLAUDE.md 路由语义已漂移。**
  CLAUDE.md TL;DR 第 2/4 条强制"即使 route-guard 高置信命中 skill，仍须检查 Plan Agent 4 条件；
  满足任一不得直接执行"（CLAUDE.md:10、:12）。AGENTS.md 对应行只写"Complexity second: 复杂需求 → Plan Agent"
  和"Single skill last: 只在高置信时调用 skill"（AGENTS.md:19、:21），**丢失了"高置信仍须检查 Plan Agent"
  这一核心约束**。AGENTS.md:433 只在 `route-guard PLAN MODE` 时进 Plan Agent，缺失 CLAUDE.md:299 的
  `PLAN CHECK`（重型 skill）和"命中 skill 已知满足 4 条件之一"两条触发路径。两文件明文承诺"同一套路由语义"
  （CLAUDE.md:546），实际已不一致 → Codex 与 Claude 在同一需求上会做出不同路由决策。

- **[中] [一致性] 输出路径在 AGENTS.md 内部自相矛盾，且与 SKILL.md 漂移。**
  AGENTS.md 同时写 `docs/evaluation/...-ux-audit.md`（:340）和 `docs/evals/...-evals.md`（:348）；
  ux-audit 产出在 SKILL.md:307 与 skill-invariants.md:34 是 `docs/evaluation/`，但 CLAUDE.md 目录树（:532）
  用 `docs/evals/` 作为"隐藏工具产出"。evaluation/evals 两个目录语义混淆，glob 发现易静默失败。

- **[中] [context成本] 指令面膨胀，违背自身 Simplicity First。**
  每 session 注入核心 ~2752 token（见量化指标），叠加 office SKILL.md（~2340 token）和 harness 的 ~90 条
  skill 系统提示（实测约 1900 词 ≈ 2500 token）。框架自己写"最小文件原则"（CLAUDE.md:21）、
  "Simplicity First：实现最小方案，不加未请求的抽象层/兜底"（CLAUDE.md:34），却把大量 always-on 散文规则
  写进 CLAUDE.md（路由表、内置 skill 路由表 :348-368、目录树 :494-535、模型路由 :552-557）。
  这些是文档而非每轮必需的执行约束，挤占了本应留给任务的窗口。

- **[中] [重叠] Plan Agent 4 条件三处重复且措辞已分叉。**
  出现在 CLAUDE.md:45-48、plan-agent.md:34-37、route-guard.mjs（259 行注释 + 评分逻辑）。
  CLAUDE.md 写"≥ 3 个文件的创建或修改"，plan-agent.md:34 写"≥ 3 个文件"但额外引入了"不触发条件"和
  "触发优先"规则（plan-agent.md:46）——这条优先级规则**只存在于 plan-agent.md，CLAUDE.md 未同步**。
  三份副本无单一真相源，已开始各自演化。

- **[中] [重叠] "老项目/已有项目/继续项目" Project Gate 规则散落 7 处。**
  CLAUDE.md（:9、:298、:428-429）、AGENTS.md（:18、:431）、SKILL.md:352、skill-routing-map.yaml、
  route-guard.mjs、rules.yaml、observations.jsonl 都各写一遍。语义一致是好事，但维护成本随副本数线性上升，
  已经为此专门 promote 了一条 semantic fact（SC-20260523-002）来"打补丁"，说明重复本身在制造 bug。

- **[中] [健壮性] 启动协议与懒加载原则正面冲突。**
  CLAUDE.md:87-92「懒加载原则」明文"不在 session 开头一次性读取所有文件"。但同文件 Session 启动协议
  （:379-437）要求顺序读取 memory summary + CONTEXT.md + workflow-state.yaml + handoff summary +
  office SKILL.md，AGENTS.md:82-91 与 :497-513 复述同一套强制读取清单。虽然多数靠脚本摘要化，
  但 office SKILL.md（600 行）一旦"涉及 skill 操作"就被全量 Read（CLAUDE.md:253-255、:406），
  这正是"session 开头读大文件"。原则与协议互相打脸。

- **[低] [死代码] Optional Workflow Graph / SPAWNED_SESSION 是已知未启用的占位。**
  CLAUDE.md:454-460 与 SKILL.md:282-285 都承认"当前系统中没有强制 Orchestrator 会设置 LUCA_SPAWNED，
  此机制不会被触发"。每个 skill preamble 仍带检测逻辑（SKILL.md:21）。是 always-on 的死指令，
  占 context 且对读者造成"这套机制是否生效"的认知负担。

- **[低] [死代码] SKILL.md Hermes review 段落残留半截命令。**
  SKILL.md:260-265「评审写入」节标题说"旧 Hermes review 已废弃"，却仍贴出 `--context-risk` / `--rollback`
  两行无主命令片段（无前导可执行命令），是迁移未清理的孤儿内容。

- **[低] [复杂度] 优先级体系无法机械裁决真实冲突。**
  "以更详细、更严格的那条为准"（CLAUDE.md:548）在遇到 "Simplicity First（少做）" vs
  "多 Phase 协议（必须写 Checkpoint/PROGRESS/handoff）"这类**同等具体但方向相反**的规则时无法判定——
  二者都很具体、都很严格。体系给了排序却没给"少做 vs 多治理"的取舍准则。

## 量化指标

| 文件 | 行 | 词 | token 估算(×1.3) | 注入时机 |
|---|---|---|---|---|
| CLAUDE.md (项目) | 559 | 2049 | ~2664 | **每 session 强制** |
| 全局 CLAUDE.md | 6 | 11 | ~14 | **每 session 强制** |
| CONTEXT.md | 25 | 57 | ~74 | **每 session 强制** |
| office SKILL.md | 600 | 1801 | ~2341 | 涉及 skill 操作即全量读 |
| AGENTS.md | 528 | 2926 | ~3804 | Codex runtime |
| plan-agent.md | 560 | 2377 | ~3090 | PLAN MODE 时 |
| orchestrator.md | 357 | 1511 | ~1964 | Orchestrator 模式 |
| skill-invariants.md | 184 | — | — | 编辑/优化时 |

**每 session 注入估算（用户开口前，Claude runtime）：**
- 始终在场核心（项目+全局 CLAUDE.md + CONTEXT.md）：~2752 token
- harness 注入的 ~90 条 skill 描述 system-reminder：实测约 1900 词 ≈ ~2500 token
- memory summary（脚本）：23 词 ≈ ~30 token
- 其余 harness preamble + MCP instructions + task reminder：~500-800 token
- **小计（未触发 skill）：约 5,800-6,100 token**
- **一旦涉及 skill 操作再 +office SKILL.md ~2,340 token → 约 8,100-8,400 token**

判定：**偏膨胀**。始终在场的散文规则（路由表/目录树/模型路由表）占了核心的 30-40%，
其中大部分是文档而非每轮执行所需的硬约束。

**重复规则计数（按出现文件数）：**
- "老项目/已有项目/继续项目" Project Gate：**7 个文件**
- 品牌色 #FF8000：**26 个文件**（多数是 skill/reference，合理；但 CLAUDE/AGENTS/CONTEXT/SKILL/brand-tokens 5 份核心副本可收敛）
- Completion Status (DONE/BLOCKED/NEEDS_CONTEXT)：**6 个文件**
- Plan Agent 4 条件：**3 个文件**（且已分叉）
- Routing Contract TL;DR：CLAUDE.md + AGENTS.md 2 份（已漂移）

## 优化机会（候选方向）

1. **单一真相源化路由。** 把 Plan Agent 4 条件 + Project Gate + Routing TL;DR 收敛到一个
   `routing-contract.md`，CLAUDE.md / AGENTS.md / route-guard 都引用它而非各自抄写，消除漂移。
2. **修复 AGENTS.md 漂移（最高 ROI）。** 同步 AGENTS.md:19/:21 加回"高置信仍须检查 Plan Agent 4 条件"，
   :433 补 PLAN CHECK / 重型 skill 触发；统一 evaluation/evals 路径。
3. **CLAUDE.md 瘦身。** 把目录树（:494-535）、内置 skill 路由表（:348-368）、模型路由表（:552-557）
   移出 always-on 主文件，改为按需引用文件；保留 TL;DR + 路由层级 + 启动协议骨架。预计省 800-1200 token/session。
4. **清理已知死代码。** Optional Workflow Graph / SPAWNED_SESSION 若长期不启用，从 always-on 段落降级为
   单独的"未来扩展"备注文件；删除 SKILL.md:260-265 的孤儿命令片段。
5. **给优先级体系补"少做 vs 多治理"裁决条。** 明确"简单任务（单文件、无依赖、无不可逆）下，Simplicity First
   优先于多 Phase 治理协议"，让 CLAUDE.md:548 的冲突规则真正可裁决。

<!-- FILE_END: A5-context-governance.md -->
