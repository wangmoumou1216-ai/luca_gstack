# DECIDE 裁决处理 Checkpoint — 2026-07-18

> 触发：luca「把裁决交给你处理，但必须谨慎——高置信度净正向的直接解决，拿不准是否正向的跑红队辅助」。
> 前置：P1 深审 W0-W13 完成（HEAD c1f001b），83 DECIDE 清单 `2026-07-18-W13-DECIDE-list.md`。

## 方法（luca 授权 = 批量预授权 + 红队兜底，不回头问）

- **高置信度净正向 → 直接修**（verify.sh 门禁 + 抽验落地）
- **拿不准是否正向 → 红队 2 轮对抗自裁决**（survive→修 / refute→留原因 / 纯产品→给建议）
- 动保护区（P1 frontmatter / P5 FILE_END / P7 workflow-state）格外谨慎，红队优先

## 三阶段编排

- **Phase 1 — 红队 triage workflow**：分 bin，逐条核缺陷真伪（grep 当前文件）+ 对抗判修复净值 → 分 HIGH_CONF_FIX（给精确 edit）/ NEEDS_DEEPER / LUCA_PRODUCT / DROP。
- **Phase 2 — 深红队**：NEEDS_DEEPER 逐条 2-3 独立对抗 agent 辩「修 vs 不修」→ 多数裁决。
- **Phase 3 — 应用**：HIGH + 红队存活 → 分区 fix workflow，verify.sh + validate-skills 门禁，抽验落地，分批 commit+push。
- **Phase 4 — 呈报**：LUCA_PRODUCT（如 muse-x-digest 登记/删除、description 定位）+ DROP 清单给 luca。

## 已识别模式（triage 先验，不代替 agent 评估）

- **高置信候选**：重复 FILE_END（同 retro FW12-01 已验证的 P5 合规修复：FW4-133 evals/FW4-132 redteam/FW5-dup-B1a-03）；stale FILE_END 路径（FW3-065/FW4-110/FW3-045）；ID 词汇错配（FW9-r7-41 DEC-DXXX/FW9-r9-48 R-NNN）；缺 get_rules/mkdir/NEEDS_CONTEXT（FW3-049/FW4-141/FW3-023/FW3-077/FW3-046/FW9-r4-24）；_TOPIC idea→prd 回退（同 challenge FW9-r1-08，_TOPIC 非 P7 保护）。
- **红队候选**：allowed-tools 加 vs 删（FW4-151/090/126/091/FW3-022/044）；careful hook 逻辑（FW9-r1-05 死锁/FW9-r4-18 假阳）；死文件删除（FW3-072/FW9-r5-29/FW4-086/FW4-144/FW3-039）；CRM/销售去硬编码（FW3-010/052/053/054/FW4-084/139/FW9-r5-30）；P7 workflow-state（FW4-134/FW9-r6-31/FW3-058）；defining-constraint 撞车（FW4-093/FW5-dc-designB-01/FW5-dc-review-02）。
- **纯产品**：muse-x-digest 登记（FW4-111/FW9-r9-52）；description 定位（FW3-017/FW5-dc-designB-04）。

## 台账/脚本

- 真值源 `framework-audit/2026-07-17-skills-findings.jsonl`（class=DECIDE 83 条）
- scratchpad：dump_decide.py（全字段）、mark_fix.py（--fixed/--decide）
- 处理结果回写：DECIDE→fixed（修了）/ 保持 DECIDE + luca_note（呈报）/ REFUTED（红队驳回，改 status）

## 恢复指令

compact 后：读本文件 + DECIDE 清单 → 从未完成的 Phase 继续；已修的看 findings.jsonl status=fixed + git log；红队结论看 workflow journal。
