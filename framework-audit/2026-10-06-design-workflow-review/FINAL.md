# Workflow 问题与方案会审结论

2026-10-06。审查任务：**DONE**；实施状态：**PLANNED**。

主会话认可最终修复计划 v2；独立方案终审 **PASS 6/6**，本次方案审查范围内无剩余 blocker/major。此结论认可问题裁决、修复边界和验收方案，不代表代码已经修好或真实 workflow 已全面通过。

## 最终裁决

| 优先级 | 问题 | 已认可方案 |
|---|---|---|
| P1 | F1：损坏状态被当成空状态覆盖，仍报成功 | 坏数据拒写，保留原字节；调用方传播失败 |
| P2 | F2：并发读改写可丢节点 | 完整事务锁 + 原子替换；ux-audit 使用同一入口 |
| P1 | F3：Oracle 允许作者内部自审充当独立票 | 真正独立 DESIGN_DRAFT 审查；缺票、未决 critical/high 均阻塞 |
| P2 | F4：auto 的 WA 启动规则与交互节点 main_agent 规则冲突 | 按 execution_context 区分逻辑分工与真实子代理调用 |
| P1 | F5：纯工程 CONV 来源进不了 task-plan | 显式来源分支、MUST→ASSERT→DEV/TEST 完整追踪；普通 PRD/Brief 门保留 |
| P2 | R7：original_copy 的桌面默认/失败回落与既有能力限制冲突 | 外部动作前按模式分流，未授权 headless 就停；保持桌面原件拒绝 |
| P2 | F8：QG 一律三方案，与合法轻量/标准档冲突 | 按每个 skill 的 scope matrix 验收，不膨胀产物、不放宽高档要求 |
| P3，设计取舍 | R6：绝对步数规则与决策增强/例外存在张力 | 保留 D-001 最小措辞建议及收益举证；等用户选择后再编译实施范围 |

F1/F2 有独立真实 writer 运行证据；F3/F4/F5/R7/F8 是当前源合同中确认的问题，未冒称已发生的生产事故。F2/F4 从上一轮 P1 降为 P2。R7 原有限制在 Phase 1 已有指针，撤回“没有早期披露”的推断；不支持桌面原件回收本身没有被判作 bug。

## 会审过程

| 独立审查 | 结果 | 留档 |
|---|---|---|
| E1：可靠性问题及最小修复边界 | PASS 3/3 | E1-review.md、E1-tool-evidence.json、E1-native-receipt.json |
| E2：流程/来源/UX 合同及最小修复边界 | PASS 6/6 | E2-review.md、E2-tool-evidence.json、E2-native-receipt.json |
| E3：方案 v1 | **FAIL 5/6** | E3-v1-review.md、E3-v1-native-receipt.json、PLAN-v1.md |
| E4：修订方案 v2 冷审 | **PASS 6/6** | E4-v2-review.md、E4-v2-native-receipt.json |

初版确实被退回：现有 QG 没有完整 draft 接口；阻塞词汇没有映射 Oracle 的 critical/high。U-002 已在计划中补齐拟新增接口、冻结输入、阶段豁免、XML/criteria/envelope 消费及严重性映射，终审确认这些方案缺口关闭。所有审查均为独立 AI 子代理，关键调用的实际采用和同次完成收据均为 accepted；并非外部真人专家背书。

## 被认可的精确版本

- `PLAN.md` SHA-256：`6e2ed3c76fb939468088800f3d82bb0925157be282fd2f7b573855f913f63f3a`。
- `FINDINGS.md` SHA-256：`e9396c8282926219b5085e53f27ca5e2e5fd8cbb9f3ceb0ca45bb3206560acaa`。
- 源根：`/Users/luca/Desktop/luca_gstack`，HEAD `d211bd3c1479720836219b035ec9963d278efa49`。
- 终审和父级复核均核对 99 项冻结文件，一致；见 `plan-review-v2-manifest.json`、`final-verification.json`。
- FINDINGS 中 skill 的缩写路径位于 `.claude/skills/office/`；routing-chain-check/model-routing/codex-viability/input-modes 位于 `.claude/skill-os/`；orchestrator/quality-gate 位于 `.claude/agents/`。精确绝对路径在冻结清单中。

## 下一阶段边界

实施按 PLAN 中稳定 U-ID 顺序推进。每项均定义有限文件、实际正反行为、mutation 和独立验收。当前未改生产逻辑、未触发 OD、未提交或发布；原有项目和无关工作保留。只生成本目录审查材料并按协议追加真实 expert eval 记录。

Claude runtime、live OD、完整原生端到端执行没有在本轮验证，不列为 PASS。D-001 仍是单独的用户设计选择。此前原型交互说明功能已经完成的发布不重开。后续实施和发布须针对最终实际改动分别验收，不用本次计划 PASS 替代。
