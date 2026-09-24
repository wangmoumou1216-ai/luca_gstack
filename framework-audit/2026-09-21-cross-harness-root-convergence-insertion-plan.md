# 双端根合同收敛：轻量化主线的插入方案 v1.1

状态：PLAN_ONLY／供用户转交另一执行 session；不修改轻量化 v3.2、不解除其阶段门、不实施 U5、不运行 Claude CLI／付费会话、不提交发布。范围为框架 NO_PIN。本文的“插入”是建议，只有用户将 delta 纳入正在执行的计划并明确批准其版本、范围和费用后才生效。

## 0. 前提、问题和结论

1. **平台前提部分成立**：Claude Code 自 2.1.277 起可直接读取 `AGENTS.md`，但当前目录或祖先有 `CLAUDE.md`／`CLAUDE.local.md` 时默认优先后者；部分配置不能直接读 AGENTS。`CLAUDE.md` 中 `@AGENTS.md` 是官方支持的共享方式。Codex 的项目入口仍是 `AGENTS.md`。这不是 Claude 自动把本仓 `CLAUDE.md` 转成了 AGENTS。来源：[Claude 官方说明](https://code.claude.com/docs/en/memory)、[Codex 官方说明](https://learn.chatgpt.com/docs/agent-configuration/agents-md)。
2. **现状不是两套完整框架**：`AGENTS.md` 与 `CLAUDE.md` 各约 11 KB，K1–K9 基本重复，K5/K10 与入口有端别差异；一个正常会话只装自己的根。42 个 `.agents/skills/` 链接指向共享技能正文，Claude slash wrapper 与 Codex `$skill` 是不同入口；`.codex/` 仍须适配 hooks、模型分派和 workflow backend。见 `cross-harness.md`、`agent-root-kernel.json`。合并 MD 不会把单会话 token 减半，也不意味着可以删除原生适配。
3. **真正的问题**是共享规则需要维护两份手写根、两端校验对“独立双根”编码，长期会有漂移和修改负担；不是 21 KB 文件存储本身。价值分别核算：维护改动/漂移、单端启动及全任务成本、回归/发布成本。不能把 MD 去重算进 v3.2 的 30% 前置上下文收益。
4. **本案结论**：现在不把 MD 收敛混入 v3.2 的 U1–U4；在同一个轻量化项目下预留独立、可否决的 U5。若价值门成立，首选 `AGENTS.md` 为唯一共享规则权威、`CLAUDE.md` 保留极薄的 `@AGENTS.md` 原生入口及必要端别/失效安全提示。保留两端 native adapters，不追求“一个运行时”。直接删除 `CLAUDE.md`、只靠 Claude 直读 AGENTS 不作为首选；单源生成两完整根是 shim 未过安全/兼容门时的备选，须另计生成器成本。若维护收益不足以抵消迁移与验收成本，U5 取消，原双根保持。

反向默认立场：先假定“不合并也可以”，不因计划标题预设 U5 必做。Kill assumptions：K-A `@import` 在**所有目标 Claude 配置**真实、完整、只加载一次且 hooks/观测不退化；K-B K1–K10、Static Fallback、项目隔离/HITL 在导入或降级时不丢；K-C 有可量化的维护收益且不抵消 v3.2 成本收益。任一失败，不为收口整洁而关闭防线。K-A/K-B 无法仅靠 Codex、静态文件或 Claude 文档证明；若无 Claude 活体票，结论只能是设计候选：获批的隔离原型可开发，但不得切换正式根合同或发布 shim。

## 1. 当前执行状态和明确插槽

- v3.2 计划 SHA-256 为 `2ca0cd4d696ae86a72bdabb9e7fc29960b1df42b57fead7605d4390888d4ba0a`；其 P1 保全已完成。执行记录的 G1 R10 补充票为 `CONDITIONAL_PASS (8/9)`，C3 动态越界反例仍 `UNKNOWN`，**G1 未过、P2 入口未开**；原 56 个两端会话未运行。主工作区 HEAD 已前进到 `c07330d...`，而隔离 A/B 锁在 `05aa78a...`。以 `2026-09-21-context-lightening-p1-baseline.md` 的最新 checkpoint 为准，不把 v3.2 文档开头的旧 PLAN_ONLY 文字当作当前执行状态。
- **现在（P1 停点、G1→P2 之前）只插 D0 决策节点，严格只读**：固定观察窗口为此前 90 天（2026-06-21 至 2026-09-21）的根文件/校验器修改，逐次区分同一共享规则需手工改两处、端别差异、parity 拒绝、实际事故/返工；记录修改与复核工时可证数据、U5 一次性迁移和新增测试维护税，比较维持现状/导入/生成双根。价值门为：有一例可归因的真实漂移/返工，**且**保守估算的 12 个月净维护节省为正；或没有事故但可证的 12 个月净节省为正且至少三次独立共享规则双改。证据不足为 `UNKNOWN/NO-GO`，重复提交数不自动等于节省工时。D0 最高只给 `GO_TO_DESIGN`，不是实施/发布票；无 Claude 额度无法在此通过 K-A/K-B。D0 不修改 G1 评分器、七份主树 WIP、A/B 工作树、U1–U4 文件或 56 会话协议；不以此放行 G1。D0 后原执行 session 可继续处理 G1，不必等待 U5 实施。
- **最早安全候选开发插槽：原 U1–U4 分批验收、P4 加载语义及 P5 独立检查完成，候选 B 工程上精确冻结之后、原 G5 最终发布决策之前**。建议命名 `U5 / P6：根语义单源收敛`，从冻结 B 派生隔离 C=B+U5。A=原发布基线、B=原 v3.2 轻量化、C=其上的 MD 收敛。保留 A→B 的原判据与票，B→C 单独验证；A→C 只作组合旁证。B **工程冻结不等于 G5 安全/收益通过**：C 可在另获实施批准后离线开发，但 C 发布必须先有 B 的 G5 通过，再有 C 自身的 G6 双端行为/成本通过及单独发布授权。U5 不得让 B 的 G5 以 C 冒名顶替。
- **跨 session 交接责任**：本文件只提交给用户；由用户决定是否把只读 D0 和未来的 U5 *占位*插入另一 session 的主计划。本次若用户同意插入，**只授权 D0 只读审查和 U5 占位，不授权 U5 改文件、实验或发布**。B 冻结后必须再提交 B 精确 SHA、U5 精确文件白名单、C 候选差异、预算/费用和独立验收协议，取得用户对该 payload 的第二次明确授权。未获此回执，不在 U1/U2/U3“顺手”改根，更不擅改另一 session 的冻结 SHA。若用户选择“先完成 v3.2 再合并”，同一 U5 改为 B 的 G5 通过且发布后的下一批，范围和验收不变。

## 2. 为何不插 U1–U3：依赖和实验归因

| 主线节点 | 已有工作 | U5 混入的损害 | 本计划处理 |
|---|---|---|---|
| G1→U1/P2 | 索引、双根、生成/检查/评分器基线与回退 | G1 当前仍缺独立 C3 票；改根会改评分对象与冻结基线 | 只读 D0；等 G1 真 PASS |
| U2/P3 | Plan/输入模式/owner 拆分，重写双根及生成索引 | 根导入与 C4 接线同时变动，无法归因遗漏 | 原 U2 独立完成 |
| U3/P4 | 只调整加载期限及相关 owner，不改授权 | shim 改变加载机制和双根不变量，超出“只改期限” | 不借 U3 写权 |
| U4/P5 | verify、CI、package 验证组合 | U5 需调整的检查入口会与此批重叠 | 先冻结 B；C 单独复跑 |
| G5 | A→B 的安全/性能与 56 会话（另需费用批准） | C 混入会把轻量化收益及失败原因搅在一起 | B 和 C 分账、分票、分发布决策 |

v3.2 的 U1–U4 精确清单及 G0–G5 见 `2026-09-21-context-lightening-execution-plan.md:163-206`。即使 U5 安排在 G4 后、G5 前，它也需要由用户批准**新的文件白名单、独立判据、费用与 G5/B-C 关系**；本文件不是原计划授权的自动扩展。G1 若继续阻断、B SHA 漂移或 B 的安全/收益结论失败，C 不推进到发布。

## 3. U5 的工程边界（仅在 D0 GO 且用户插入/批准后）

`phase_type: task_execution`；Sequential + 独立 quality-gate；model role 依届时受信任路由，不能把 Claude CLI 缺额度转换为 Codex 单端票。Source：用户“把 Codex 和 Claude 的 MD 结合”及本次“嵌入正在执行的轻量化计划”。Status：`PLANNED`。

- **U5-a 冻结**：绑定 B 的完整 tree/SHA、已通过的验收与根有效内容；核对主工作区 WIP 不混入 C。比较四种候选：保持现状、AGENTS+CLAUDE import、单语义源生成两完整根、删除 CLAUDE 直接 AGENTS。D0 不满足维护价值则在此 NO-GO，记录理由，不做下面批次。
- **U5-b 源与适配（安全策略门）**：先做隔离原型，证明官方 `@AGENTS.md` 在**目标 Claude 配置**展开为完整有效 K1–K10/Static Fallback，并覆盖导入文件缺失、配置关闭 hooks、首次升级等实际降级条件。静默导入失败时一句“请停止”不是可机证 fail-closed；任何目标配置不能证明加载/安全底线，就**否决 shim，不改原完整双根**；若仍要一源维护，仅另提“单源生成两份完整内联根”的新方案及成本/授权，不能自动切换。通过后把 AGENTS 变为平台中立共享身份，Codex 仍直接读 AGENTS，CLAUDE 保留官方导入及必要端别差异。现有 AGENTS 的 K5/K10 含 Codex 专用命令/运行真相，须改写为双方可读的显式端别条件，用负例证明 Claude 不执行 Codex 专属动作。只迁移根语义，不动技能正文、项目授权、模型政策、hook 限制或 workflow 后端。
- **U5-c 消费者/测试同批变更**：现有 `agent-root-kernel.json` 和 `check-agents-parity.mjs` 假设两根 K 块各自内联；`check-agent-context.mjs` 禁止 Claude 读 AGENTS；`build-agent-context.py` 同步两根 Static Fallback；`run-agent-context-ab.mjs` 将另一根读取视作违规；`check-routing-map.mjs` 还检查两根的 Plan 条件；`check-coding-discipline.mjs`、`check-model-table.mjs`、`test-writing-for-agents-skill.mjs` 也抓 CLAUDE 原文；`verify.sh`/CI 对根预算做检查。D0 须仓库范围扫齐所有硬编码消费者、试验/发布入口，B 冻结后交**精确路径白名单**；不能以本文初步枚举作为授权。检查器改验“两个端的实际有效规则且端别真实”，加 import 缺失/循环/重复/截断/错路径/端别串线、fallback、EOF、hook 不可用等专项 fixture 和 mutation。额外路径需再请用户批准。
- **U5-d 双端验证/回退**：先确定性投影对账、专项 mutation 与全量仓库门，之后用绑定 C 精确树的 Claude/Codex 活体分别核对加载来源、K1–K10、Static Fallback、HITL/NO_PIN/Plan/STOP、slash vs `$skill`、hook/workflow 缺能力的拒绝路径，再测 B→C 前置和全任务 bytes/tokens/time。B/C 必须固定模型版本、工具配置、fixture 和评分器成对比较；若原 B 票跨时间/配置不可比，另获预算重跑 B，不直接借旧中位数。Claude token 当前不可用：静态和 Codex 证据可以先做，Claude 活体与性能一律 `UNKNOWN`，不能发表双端完成、不能以原 56 会话补票。失败只撤 C 可验证补丁，B 与用户 WIP 不动。

U5 的可执行断言（具体命令和 fixture 名须在 B 冻结时绑定，不用文字 PASS 冒充）：

```sh
# [BLOCKING] U5-1 — 生成/权威/静态回退一致
python3 scripts/build-agent-context.py check && node scripts/check-agent-context.mjs && node scripts/check-agents-parity.mjs
# [BLOCKING] U5-2 — 路由和语义负例
node scripts/check-routing-map.mjs && node scripts/test-agent-context.mjs && node scripts/test-semantic-parity.mjs
# [WARNING] U5-3 — 原 F1 两端离线评分器烟测；不能证明import、失效或行为
node scripts/run-agent-context-ab.mjs --root . --arm candidate --harness codex --fixture F1 --trials 1 --concurrency 1 --self-test
node scripts/run-agent-context-ab.mjs --root . --arm candidate --harness claude --fixture F1 --trials 1 --concurrency 1 --self-test
# [BLOCKING] U5-4 — 精确 C 树仓库门（只在隔离候选里运行）
bash scripts/verify.sh && git diff --check
```

专项 import fixture/失效 mutation/Claude 活体在 B 冻结后绑定精确命令和费用，均为独立 `[BLOCKING]`；未绑定前 U5 不能取得实施批准。行为 criteria：C1 两端真实装入同一共享 K1–K10/六条 Static Fallback 且只装一次；C2 原生入口/hook/workflow 的能力差异不被伪装等价；C3 安全、项目隔离、Plan/HITL、STOP 与失败降级无回归；C4 B→C 的维护改动和实际会话成本分开报告，任何退化不自动通过；C5 B 的原票、主工作区 WIP 和 C 的回退互不覆盖。逐项 `PASS/FAIL/UNKNOWN` 加证据，缺 Claude 活体即 C1–C3 的 Claude 部分 UNKNOWN。

## 4. 独立评审、停止与交付

先做架构/价值专家、契约/测试专家、独立红队三方只读会审；冲突以原始证据和可证伪实验裁决，不按多数票越过安全门。红队默认 REFUTE：尤其攻击“合并即减 token”“删 CLAUDE 也可回退”“更改评分器后自测全绿”“为了计划收口强行让 U5 通过”。U5 任何 BLOCKING FAIL 停止；最多两轮修订仍有重大问题交用户，不无限循环。

移交给执行 session 的最小包：现在为本文路径及 SHA、v3.2 计划 SHA、P1/G1 最新状态、D0 的只读任务与 U5 占位；B 冻结后另送 B 精确 tree/SHA、D0 GO/NO-GO 和价值证据、U5 精确白名单/费用上限、A→B 与 B→C 分账的测试及逆补丁方案。用户本次决定**是否在主线添加 D0（现在）和不带执行权的 U5 占位（B 冻结后）**；U5 实施需第二次批准精确 payload，56 会话之外的付费实验和发布各有独立授权。没有这些回执，本文保持 PLAN_ONLY。

<!-- FILE_END: framework-audit/2026-09-21-cross-harness-root-convergence-insertion-plan.md -->
