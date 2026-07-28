# RESIDUAL — 全生命周期审计 Loop 终局记录

> 对象：跨-agent(Codex)+跨-环境(cloud) 适配改造 `feab63d..b26101a`。
> 计划 Part II 在 `~/.claude/plans/lucagstack-codex-claude-cloud-agent-age-reactive-nest.md`。

## STATUS: 无存活 BLOCKER/MAJOR；追形式收敛中（按用户明确目标越过自设 5 轮上限继续）

诚实裁决：无任何存活 BLOCKER/MAJOR。形式判据「连续两个干轮、第二轮换分区」——Round4 干、Round5 不干
（运行时分区抓到 MAJOR，已修）、**Round6 干（第一个含运行时视角的干轮）**；Round7（换分区，须含
运行时）待跑，若干则**连续两干轮达成 → 形式收敛**。用户目标（形式收敛）优先于计划自设的 5 轮 backstop。

## Round 6 — 干轮（运行时为主，2026-07-28）
4 agent（全仓 async 扫 / 云端+Codex 再 sim / 门强度 / 完整性+对抗）**全部判干**，零 CONFIRMED ≥MINOR。
R5 修复三项运行时实证生效；全仓仅 2 处 async spawn 均已守卫。**3 条非阻塞 watch-item（不修，记录）：**
- **[UNCERTAIN] governance spawn 1/168 flaky 崩溃**：守卫（.on('error')）在场且 167 次验证成立，1 次
  首跑观测到 unhandled 'error' 逃逸、无法复现。冷 agent 判证据不足、不达 CONFIRMED。**不加顶层
  uncaughtException 网**——它会掩盖 R5 的 GOVERNANCE-SPAWN-FAILOPEN 回归门（吞 mutation→死断言）。
  重开触发器：若能稳定复现，再评估顶层网 vs 保专用门锐利的权衡。
- **[NIT] 治理"已后台触发"消息在缺 python3 时误导**：pre-existing（早于 feab63d，不在审计 range），
  上方"未找到 python3→记忆层整体不可用"已大声暴露同根因，无静默失效。可选低优先改条件打印。
- **[NIT] route-guard/session-sync 静态 import lib 无 fail-open**：前瞻加固（libs 现全有效、parity
  全绿、无当前 BLAST）；project-scope-guard 已用 fail-open 动态 import。backlog 一致性项。

## 轮次与发现（5 轮，硬上限）
| 轮 | 分区 | 结果 |
|---|---|---|
| R1 | 子系统（13 agent）| 2 MAJOR + ~15 MINOR，0 存活 BLOCKER |
| R2 | per-commit × per-type（11 agent）| **1 MAJOR**（WS-B4 门测死路径，子系统视角漏的）|
| R3 | 复核 + 对抗 6 UNCERTAIN（11 agent）| 0 MAJOR；6 UNCERTAIN **全 REFUTED**；修 R2 引入的 2 MINOR |
| R4 | 门强度 + 覆盖 + 新眼对抗（4 agent）| **干轮**（0 CONFIRMED ≥MINOR）|
| R5 | **运行时 + 完整性批判**（4 agent）| **1 MAJOR**（detached spawn 云端崩溃，4 个静态轮全漏）|

**共 4 个 MAJOR 找到并修复**（R1×2 / R2×1 / R5×1），每个：独立冷验证（fixer≠verifier）+ mutation
证承重 + 回归门有杀伤力。12+ commit 全 push，verify 全程 66/66。

## 为何未形式收敛（这是纪律在做实功，非空转）
Round5 换运行时分区，抓到 R1-R4 四个静态轮（含"新眼全-diff 对抗"）**集体判干**却真实存在的 MAJOR：
云端 python3 缺失时 detached spawn 的 async 'error' 未捕获 → 每次 SessionStart 崩溃栈盖过告警。
**含义**：新审计分区（尤其运行时视角）仍能 surface 真缺陷 → 无法诚实声称"已证收敛"。
对抗审计渐近逼近但可能永不干净达到"连续两干轮"——每个新视角都是新镜头。**教训已落记忆候选**
（audit-needs-runtime-partition：深审必须含运行时分区）。

## 残留（非 CONFIRMED 缺陷 — 全部已归档，无一需再改代码）
- **commit-message 簿记误差**（历史固化不可 rewrite，产物无 bug）：dcdc920 "15→17" 实为 16→17；
  db1128e 幻影 §0.5b 引用；a2bffc0 header 泛化。详见 PLAN「Round2 记录」。
- **[U] 未核验声称 13 条 + harness 门覆盖 2/3 emitter**：全在 `U-REGISTER.md`，真 Codex spike 时定论。
  计数纪律：本审计已验证项从不含这 13 条 [U]，报数恒 `verified/total (+13 不可验)`。
- **6 条 UNCERTAIN 设计观察**：R3 对抗全部 REFUTED（生产恒单段/正常态零回归/无真 BLAST）。
- **低价值 NIT**：S27 内联重复、反空壳门 1500 字符启发式等——记录不阻塞。

## 重开触发器
- 真 Codex spike：按 U-REGISTER 逐条定论 [U]；第一项检查 = `.agents/skills/` 分叉（keystone 反证）。
- 若要追形式收敛：新 session 干净 context 跑 Round6/7（须至少一轮运行时分区），重生成登记册
  BASE=feab63d HEAD=b26101a。

<!-- 审计 loop 于 2026-07-28 到 5 轮硬上限终止。无存活 BLOCKER/MAJOR。 -->
