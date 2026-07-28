# U-REGISTER — 未核验（[U]）声称登记册

> 全生命周期审计 Round 1（2026-07-27）产出。这些声称的决定性核验都需要**真 Codex 安装 / 真云端 /
> 第二台机器**，本仓无法定论。**五条规则**（见计划 Part II Phase 5）：① [U] 永不计入已验证，计数
> 永远报 `verified/total (+k 不可验)`；② [U] 不阻塞干轮；③ **产物如何呈现 [U] 在范围内且阻塞**
> ——凡以既成事实出现即 CONFIRMED 假声称（已在 Round1 修：AGENTS.md model dispatch、open-design
> Codex-断 已加 hedge）；④ 绿灯依赖 [U] 事实的门须标 u_dependent；⑤ 每条带重开触发器。

**共 13 条**。每条真 Codex spike 时按 settling_experiment 逐一定论。

| uid | 声称（[U] 内核） | 缺什么能力 | 定论实验 | 产物中当前呈现 | 重开触发器 |
|-----|------|-----------|----------|--------------|-----------|
| U-01 | [keystone] Codex fan-out（max_concurrent_threads_per_session~6、GA 默认开、TOML/AGENTS.md delegation） | 真 Codex 装机跑并发子线程 | 在真 Codex 上跑 deepresearch/auto，观察是否真并行 spawn ≥2 子 agent；`codex --version` + 并发 delegation 配置探测 | HEDGED | Codex fan-out GA 发布/文档更新 |
| U-02 | Codex 对 Bash 触发 PreToolUse + 能 deny | 真 Codex hook 事件模型 | Codex 上挂 PreToolUse(Bash) hook，跑 careful 的 check-careful.sh，看 deny 是否生效（退出码/拦截字符串） | HEDGED | Codex 暴露 Bash-PreToolUse deny |
| U-03 | Codex 无 SessionEnd（事件） | 真 Codex 生命周期事件清单 | Codex 上注册 SessionEnd hook，结束会话看是否触发 | HEDGED | Codex 加 SessionEnd |
| U-04 | Codex updatedInput 不能变异（无 input mutation） | 真 Codex PreToolUse 返回契约 | Codex PreToolUse 返回 updatedInput，验证工具入参是否被改写 | HEDGED | Codex 加 input mutation |
| U-05 | Codex 可挂 MCP + figma server 名一致（挂同一 figma MCP 即恢复） | 真 Codex MCP 挂载 + server 命名 | Codex 上挂 figma MCP，调 mcp__plugin_figma_figma__whoami 看工具名/命名空间是否一致 | HEDGED（即恢复=条件性） | Codex MCP 命名空间文档 |
| U-06 | Codex harness 提供可探测的 env 名（harness.mjs 据以判 codex） | 真 Codex 运行时环境变量 | Codex 会话内 `env \| grep -i codex`，确认存在稳定判别变量 | HEDGED（明标须核验） | Codex env 契约公布 |
| U-07 | Codex Web 工具名（WebSearch/WebFetch 等价） | 真 Codex web 工具命名 | Codex 上跑 html-prototype Phase2.1 / muse-x-digest FxTwitter，看 web 工具是否可调 | HEDGED | Codex web 工具文档 |
| U-08 | Codex hook 成熟度 / Workflow 等价（auto·muse-loop 恢复触发器） | 真 Codex 编排/Workflow 原语 | Codex 上尝试等价 Workflow + 子 dispatch，观察是否成熟 | HEDGED（恢复触发器=IF 框架） | Codex Workflow GA |
| U-09 | Codex 读哪棵 skill 树（.claude vs .agents） | 真 Codex skill 加载根 | Codex 会话内触发 magicpath，看它读 .agents/skills/magicpath(576行) 还是 .claude/skills/office/magicpath(49行) | HEDGED（P4 首查点名） | P4 Codex spike 首查 .agents 分叉 |
| U-10 | Codex 对 apply_patch 不触发 PreToolUse，只 Bash（native-edit 臂真 T3） | 真 Codex apply_patch 事件行为（有外部证据未 spike） | Codex 上 native-edit 一个文件，看 PreToolUse 是否触发；对照追踪三 issue 状态 | HEDGED（§2b′ 块内，明标'未 spike 前不当既成事实'） | 追踪 openai/codex #16732/#17794/#20204 |
| U-11 | Codex 侧无法传 per-agent model 参数 / Codex 上 frontmatter inert（故 model-tier 分档不可移植 LOCKS） | 真 Codex 是否暴露 per-agent model dispatch 参数 / 是否消费 SKILL.md frontmatter | Codex 上 spawn 子 agent 尝试传 model 参数；确认 recommended-model frontmatter 是否被读取 | HEDGED（H6-001 已由 db1128e 修复：§4.8.2+§11 加"尚未核验/pending spike"，并由 check-agents-parity ⑤ 门守护）| Codex 暴露 per-agent model 参数 / frontmatter 消费 |
| U-12 | Codex 真消费 AGENTS.md（AGENTS.md↔CLAUDE.md 平价被 Codex 读取，意图路由据此 PORTS） | 真 Codex 是否读 AGENTS.md 作操作手册 | Codex 会话给一个路由歧义 prompt，看它是否按 AGENTS.md §4.8 意图路由/model 意图选档 | HEDGED（§0.5c-2 明列为 P4 待核验项） | P4 Codex spike 验 AGENTS.md 消费 |
| U-13 | careful 的 deny hook 在 Codex 上不可自动注册（Codex 无 SKILL.md-frontmatter hook 加载器） | 真 Codex 是否有等价 skill-frontmatter hook 注册器 | Codex 上放置 careful/SKILL.md（frontmatter 内含 hooks 块），验证 check-careful.sh 是否被自动挂载 | HEDGED（同句含'若 Codex 提供等价 skill-hook 注册则可恢复'） | Codex 提供 skill-hook 注册 |

## 承重 caveat
所有 Codex 侧结论在真 Codex spike 前均为**假设**。仓内已有反证：`.agents/skills/magicpath/SKILL.md`
（576 行）与 `.claude/skills/office/magicpath/SKILL.md`（49 行）是两份 git-tracked、内容分叉的副本
——「Codex 读同一棵树」未必成立。真 Codex spike 的**第一项检查**须厘清 `.agents/skills/` 分叉。

## harness 门加固覆盖面（审计 Round5 登记）
CC 专有强制动词的 harness 降级门只加固了 **2/3** 个 emitter：`session-sync`（decision:block）与
`project-scope-guard`（deny/updatedInput）——两个 .mjs 已按 `detectHarness` 降级为纯文本 advisory。
**第 3 个 emitter `.claude/skills/office/careful/bin/check-careful.sh`**（经 careful SKILL.md
frontmatter 注册为 PreToolUse hook、吐 `permissionDecision:"ask"` CC-JSON）**未做 harness 降级**。
是否构成真实故障取决于 [U-02]（Codex 是否 Bash-PreToolUse deny）+ [U-13]（careful hook 在 Codex
上能否自动注册）——二者未核验，故此项 UNVERIFIABLE_U。若 U-13 证实不能注册则不触发、无输出（间接安全）；
若能注册则 check-careful.sh 需读 `CODEX_*` env 做同款纯文本降级。真 Codex spike 时按 U-13 先验证。

## 计数纪律
本审计的最终计数永远写成 `verified/total (+k 不可验)` 形式，绝不把这 13 条 [U] 折进 verified 或 total 的任一数。

<!-- 生成源：审计 Round1 H6 agent 的 h6-result.json；重跑 scratchpad/audit/gen_uregister.py -->
