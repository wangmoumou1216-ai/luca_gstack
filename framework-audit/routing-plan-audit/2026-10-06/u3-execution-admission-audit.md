# U3 执行接线审查（2026-10-07）

## 审查问题

首次派发或首次 effect 前，Plan Agent 的批准、计划身份和依赖图检查是否真的由执行方调用？

## 证据

- 基线审查：在 U3 改动前，三个 checker 只出现在 Plan 合同与各自测试中；对 agents、implement、Codex runner 和 scripts 的生产调用点检索没有命中调用方。
- 当前修复：新增 scripts/check-plan-admission.mjs，串行调用三个 checker，并额外核对 graph 的 plan_sha256 与批准票 SHA 相等。该命令只读现有文件，输出 authorization_created: false。
- 执行合同：orchestrator.md 和 implement/SKILL.md 现在要求首次派发前使用组合 admission seam；Plan Agent 也给出同一命令。
- 外部阻塞：scripts/check-plan-graph.mjs --require-no-external-blockers 在任意 FAIL/UNKNOWN 外部依赖时返回非零；默认模式仍报告 blocker 而保持兼容。

## 确定性验证

    npm run test:plan-agent-contracts --silent
    PASS plan graph
    PASS plan approval
    PASS plan identity
    PASS plan admission
    PASS quality-gates-scope
    npm run check:agent-contracts --silent
    agent-contracts: 99/99 断言通过
    node --check scripts/check-plan-admission.mjs
    node --check scripts/check-plan-graph.mjs
    git diff --check

## 结论边界

当前已证明组合检查器和文档合同的一致性；尚未证明 Claude/Codex 原生运行时在真实 Plan 任务中自动调用该命令。若实现方没有实际执行该命令，文档合同仍只能作为要求，不能作为运行时安全证明。U5 必须用原生 RP/PO 轨迹确认首次派发是否被该门拦截。

## 状态

U3 IMPLEMENTED_WITH_RUNTIME_WIRING_GAP。组合 admission seam 已可执行，原生调用证据仍待 U5。
