# Red Team Handoff — Rule Execution Closure

## Metadata

- status: `REFUTED`
- target_sha256: `6690c1251ad3fd844a3b4c8511dedad04f3372c16f530a48c75a109bb40229cb`
- mode: framework governance / standalone redteam
- workflow state: not applicable

## Decisions

1. 旧修复计划不可执行，必须重新生成单一权威计划。
2. 新计划不得把 Cycle 2 当作含糊的 E4；要么完整吸收，要么明确分离并要求 delta-rebase。
3. correction evidence 必须由归因层级派生，不允许统一要求三类治理实体。
4. project pin 必须覆盖切换、读侧、工具侧和同一轮 epoch。
5. obligation index 必须反向证明分母完整，并证明 executor 在真实 harness 可达。
6. Git 证明必须覆盖 hunk、commit ancestry、remote URL/refspec 与 before/after ref。
7. 最终批准必须绑定新计划 SHA、proposal SHA、nonce、expiry 与新的顶层用户回复。

## Risks

1. 当前工作树 dirty 且计划文件与已有修改同路径重叠，路径 allowlist 不足以保护 WIP。
2. 现有 unsafe resolver 仍可达，任何 conflict workflow 都有高风险。
3. Cycle 2 与本任务共享项目事务、patch、native agent、activation 等实现面，必须避免双 owner。

## Output

- `framework-audit/2026-08-11-rule-execution-handshake/ROUND-1-REDTEAM.md`
- 下游唯一允许消费：同目录 `FINAL-EXECUTION-PLAN.md`

<!-- FILE_END: REDTEAM-HANDOFF.md -->
