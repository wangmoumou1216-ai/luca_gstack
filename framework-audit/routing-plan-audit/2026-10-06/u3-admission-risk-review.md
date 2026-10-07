# U3 admission 风险复核（2026-10-07）

## 目的

复核 U3 新增的批准、计划身份和依赖图检查是否已经证明了“真实用户批准后才可首次派发或产生 effect”。本记录只处理新增风险，不改写已认证的 R1–R4、P1–P4、E1–E3。

## 受控证据

### A1 — 批准票的来源不可证明

\`scripts/check-plan-approval.mjs\` 检查 \`approved\`、\`plan_id\`、精确路径、计划 SHA、scope、effects、时间戳和 \`confirmed_by: "user"\`。它没有检查批准票是否由受信 runtime 根据真实用户事件生成，也没有绑定 native \`event_id\`、session、边界、prompt bytes hash 或一次性 nonce。

在隔离临时目录中人工写入字段齐全的 \`approval.json\` 后，运行 checker 得到 \`status: PASS\`、exit 0。这个反例确认了：

> checker 能证明票据字段彼此一致，不能证明人确实批准过。

威胁模型结论：

- **checker 层：CONFIRMED GAP**。只要调用方把可写 JSON 的 PASS 当成用户授权，授权来源就可伪造。
- **生产越权：UNKNOWN**。当前生产搜索没有发现 \`check-plan-admission.mjs\` 的调用点，尚未证明普通 Agent/脚本能在真实执行链中把伪造票送进 effect。

最小落地方向：复用现有 \`event-attestation.mjs\` 的 native 用户事件证明；批准 receipt 至少绑定 \`event_id\`、\`boundary_id\`、\`session_id\`、规范化用户输入 hash、精确计划 SHA、scope、effect set 和 nonce。receipt 由受保护 runtime 写入，admission 只验证，不创建授权。

### A2 — 重放与一次性消费没有闭环

同一个字段齐全的批准票可以被 checker 重复验证。checker 没有 nonce 消费、原子 claim 或 effect receipt；\`authorization_created: false\` 也明确表示它不会改变状态。

这不是 checker 的字段错误，而是调用方合同缺口：如果首次 dispatch/effect 之后仍能把同一 receipt 再交给执行器，批准范围可能被重放。

结论：**CONFIRMED AS DESIGN GAP；生产影响 UNKNOWN**，因为真实执行器尚未接 admission。

最小落地方向：在受保护 runtime 中对 receipt 做一次性 claim，绑定 \`plan_sha256 + scope + effect + nonce\`；claim 与首次 dispatch/effect 原子提交，重复使用返回 \`REPLAY\` 并保持 \`PLANNED\`/\`NEEDS_CONTEXT\`。

### A3 — graph symlink 与统一快照缺口

\`check-plan-approval.mjs\` 和 \`check-plan-identity.mjs\` 拒绝 symlink，\`check-plan-graph.mjs\` 当前直接 \`readFileSync\`，未要求 canonical regular file。隔离反例中，graph symlink 能够返回 exit 0。\`check-plan-admission.mjs\` 还会在子检查后再次读取 graph，计划、批准、身份和 graph 也不是同一个不可变快照。

结论：**CONFIRMED PATH-TRUST GAP；TOCTOU exploitability UNKNOWN**。若 graph 路径来自不受保护的可写目录，symlink 可把检查对象指向另一个文件；若执行器在 admission 后才读取文件，检查结果与 effect 输入可能分离。

最小落地方向：所有输入统一要求 absolute canonical regular file；用固定文件描述符/不可变 admission envelope 读取一次并计算 hash；把 plan、approval、identity、graph 的 hash 和 scope 写入 envelope；首次 dispatch/effect 使用同一 envelope，并在 effect 前做一次原子 revalidation。

## 与既有问题的关系

| 风险 | 是否重复 | 关系 |
|---|---|---|
| A1 批准来源 | 不重复 | P1 认证“哪些模式需要批准”，A1 认证“批准票是否来自真实用户”。 |
| A2 重放 | 不重复 | P2 认证计划身份恢复，A2 认证 receipt 是否一次性消费。 |
| A3 graph/snapshot | 部分相邻 | P4 认证拓扑合法性；A3 认证检查输入的路径信任与跨检查快照。 |
| U3 runtime wiring | 互补 | wiring gap 说明 checker 未被生产调用；A1/A2/A3 说明即使接线后还不能把 JSON PASS 当完整授权证明。 |

## 独立会审状态

本轮尝试派发两份独立冷启动会审：一份专审 admission 授权链，一份专审路由/Plan Agent 适配。两个 Codex app 线程均因模型服务 \`503 Service Unavailable\` 失败，未产生 reviewer 票。因此 A1–A3 不标记为专家会审通过，保留 \`UNKNOWN / 待补票\`。

## 当前 U3 判定

\`IMPLEMENTED_WITH_RUNTIME_WIRING_GAP\` 仍是准确状态：

1. 三个 checker 和组合 seam 的确定性测试通过；
2. checker 文档合同已写入 Plan Agent、implement 和 Orchestrator；
3. 生产 Claude/Codex 执行器尚无真实调用证据；
4. 批准来源、重放和统一快照仍需在 runtime 接线后用原生事件与负向 mutation 复核。

<!-- FILE_END: u3-admission-risk-review.md -->
