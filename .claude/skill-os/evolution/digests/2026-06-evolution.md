# 月度演进 digest — 2026-06

> 模式: **propose-only**（零自动编辑 luca_gstack；不走 consolidate_memory 晋升门）
> 运行: framework-evolution-scout（24 agents / 278 tool-uses / ~12min；2026-06-21）
> 红线: 热度≠适配——star 只是发现先验，录取要 fit-to-gap + 跨源收敛 + 过硬门

## 结论：本期 0 录取（APPROVED 0 / CONDITIONAL 0）—— 门禁严格的体现，非发现失败

发现 21 → 去重 19 → 核验 19 → **全部 REJECTED**（0 红队击杀：无候选达 APPROVED）。原因分两类：

### A. 3 个种子缺口已被本 session 自身 Phase 0-4 工作填补 → 外部候选判"冗余于我们刚建的更优方案"
| 缺口 | 已有解 | 被拒的外部候选（理由摘要） |
|---|---|---|
| behavioral-verification | `behavioral_ab.py`（Sonnet A/B + no-op/回归判定） | promptfoo（79-dep 不可作 skill 落地；解的是 output-vs-rubric 非 prose-delta）、evalite、cookbook tool_evaluation（均冗余且更弱） |
| no-rollback | FUSION-RUNBOOK git-tag 回滚 + worktree + adoption-log | managed-settings 版本钉（越权 + bogus 映射 + 冗余） |
| no-feedback-loop | `adoption-log.jsonl` + digest 采纳复盘 | （无对位候选） |

### B. 3 个缺口仍 open，但本期无"非冗余且不带重框架"的外部候选
- **GAP-promotion-deadend**：是**一行级 plumbing bug**（候选从不被置 `proposed_stable=True`），非记忆范式问题。A-MEM/Letta/TencentDB 全被拒（太重/解错问题）。**TencentDB 被验证击穿**：S1 发现通道称其有"count-triggered promotion"，验证 agent 实查发现它根本无 promotion/consolidation/proposed_stable 逻辑（发现乐观→验证证伪），且 2.5 月新仓 5947★ 速度异常 → provenance lean FAIL。→ **建议内部修复**（给 propose_semantic/consolidate 加 batch set-stable 入口），不在自进化 scout 的外部采纳范围。
- **GAP-routing-fragmentation**：发现多为零星 solo 仓 / SaaS；gh 多词查询 AND 合并致空（通道已用单词循环补偿，仍无非冗余优质项）。→ 下期用单关键词深挖一轮。
- **GAP-soft-enforcement**：hookwise（Go 二进制不可移植入 Node hook 层 + 无法编码 Plan-Agent/research-default 的语义规则 + **供应链风险：自动跑 `npx openlore` + 请求 Google Calendar OAuth**）被拒；apca-w3（色彩对比算法，bogus 映射 + 非许可 license）被拒。→ 需内部解或更深一轮。

## 门禁有效性证据（首跑 = 验证机制严格度，正是"我不信任你自己做"的回应）
- 抓发现层 over-claim：TencentDB「有 promotion」实为无 → 验证证伪
- 抓供应链风险：hookwise 自动 `npx openlore` + OAuth 外联
- 抓 star 灌水嫌疑：TencentDB 2.5 月新仓 5947★ 速度异常 → lean FAIL
- 抓重框架不可移植：A-MEM(chromadb/transformers)、promptfoo(79 deps)、Letta runtime
- 识别自有更优：behavioral_ab.py > cookbook-eval；FUSION-RUNBOOK > 版本钉
- 多信号非唯 star：各通道按 forks/真采纳/近期/fit 排序，丢弃零星长尾

## source yield（本期）
| 源 | surfaced | approved | 备注 |
|---|---|---|---|
| S1-github-stars | 5 | 0 | 强候选(promptfoo)均冗余/不可落地 |
| S2-anthropic-platform | 8 | 0 | building_evals 冗余于 behavioral_ab |
| S3-agent-frameworks | 5 | 0 | 重框架不可单模式 port |
| S4-design-craft | 3 | 0 | 自报对当前 open 缺口偏题（缺口多在 testing/memory/routing 非设计交付） |

> 连续零产出会触发 yield 剪枝；本期为首跑，全源保留观察。

## 待裁决（人工）/ 行动项
1. gaps-register：behavioral-verification / no-rollback / no-feedback-loop 已被本 session 填补 → 标 `addressed`（已更新，附 evidence）。如不认可可改回 open。
2. **GAP-promotion-deadend 建议内部 plumbing 修复**（scout 范围外）：consolidate/propose_semantic 加 batch set-stable 入口，解 SC-20260615-001。
3. 发现层 gh 多词查询 AND 合并致空 → sources-registry S1 查询可改单关键词；scout loader 已加读 candidate-log 防再现已拒项。

## 采纳复盘（上 N 次融合）
（无：本期 0 融合落地。下期起，每有融合落地，此节用 adoption-log.jsonl 复盘 keep/watch/revert。）
<!-- FILE_END: 2026-06-evolution -->
