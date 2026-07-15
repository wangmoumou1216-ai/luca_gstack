# 对标深评运行手册（BENCHMARK RUNBOOK）— 演进模式 2，人工触发

> 月度 scout（模式 1）按 gaps-register 匹配候选，**结构上只能发现已知未知**；本模式承接
> **未知的未知**：选一个高信号目标做全量对标，让对标**反向创造新 gap**，而不是消费既有 gap。
> 实证依据：mattpocock 对标（framework-audit/mattpocock-benchmark-2026-07/，51 单元深评）
> 一轮产出 5 skill 采纳 + 4 个新 gap——是迄今**产出最高的进化路径**，故制度化为第一类模式。

## 何时跑（人工发起，非定时）

- 月度 digest 的 opportunities / prior_opportunities_to_adjudicate 出现**高信号 hub**（裁决=「开 gap」但一个 gap 装不下它的价值面）
- 用户点名某仓库/体系「全面对一对」
- 建议节奏：每季度 ≤1 次（对标是重活，框架建设预算内计）

## 目标选择

优先级：上期 opportunities 池 > 月度 scout 反复出现的同源 hub > 用户点名。
候选源另含 **vetting-registry rejected 池**（weighted_score≥80 且 non_redundancy FAIL——
「与自有 skill 重叠但质量信号高」正是对标的最佳素材，mattpocock 首批即人工从此池挖出；
2026-07-15 记忆层评审 B2 裁决：不改 scout 采集，这里补消费入口即可）。
选型标准：对方是**成体系**的实践（skill 集 / 框架 / 方法论），且与 luca_gstack 有可比面——
单点工具走模式 1 的 fit-to-gap 即可，不值得对标。

## 流程（六步，复用 mattpocock 先例的结构）

| # | 步骤 | 产物 |
|---|---|---|
| ① | inventory：枚举对方全部单元（skill/机制/文档），pin commit | 清单 + pin SHA |
| ② | 对标矩阵：逐单元映射到我方对应物（有/无/弱） | matrix |
| ③ | rubric 深评：逐单元 dossier（价值/冗余/借鉴面/证据） | N 份 dossier |
| ④ | 红队：含**反向红队**（用对方的失败反证我方机制，如 registration-sync 案例） | 红队定论 |
| ⑤ | fable 复审（model-routing 白名单 P2 翻案复审档） | 复审意见 |
| ⑥ | GATE 逐项裁决（luca 人裁）：install / refresh / adapt-idea / 开新 gap / 拒 | 裁决记录 |

产物统一落 `framework-audit/<target>-benchmark-YYYY-MM/`。

## 出口接线（对标不是终点）

- **开新 gap** → gaps-register（人裁落笔，带证据锚）
- **采纳批次** → 逐候选走 FUSION-RUNBOOK 九步管线（含 FM-11 可达性验收）+ ADOPTED.md 登记
- **拒绝/借鉴记录** → digest 叙事 + CHANGELOG 一行式

## 红线（与模式 1 同源）

- propose-only：对标全程零自动编辑行为面；GATE 逐项人裁，不存在批量默认采纳。
- 热度 ≠ 适配：对标目标的名气只买"值得对标"的票，逐单元仍过 rubric + 红队。
- 内容实查：逐单元读真身（pin commit），不引用训练记忆。

<!-- FILE_END: BENCHMARK-RUNBOOK -->
