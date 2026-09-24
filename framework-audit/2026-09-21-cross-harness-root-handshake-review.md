# 双端根合同终版握手：专家会审与执行交接票

对象：[`2026-09-21-cross-harness-root-handshake-final.md`](./2026-09-21-cross-harness-root-handshake-final.md)，SHA-256 `521d5373a3bd67b445761ac2881ae7efc20461f45c3185f890799b70db1920c8`。这是 PLAN_ONLY 的同版票；各专家只读独立审查。红队问题、失败历史及处置见 [`2026-09-21-cross-harness-root-handshake-redteam.md`](./2026-09-21-cross-harness-root-handshake-redteam.md)。

| 独立视角 | 同版判决 | 验证重点 |
|---|---|---|
| 架构/插槽 | PASS，0 BLOCKER/MAJOR | 单源编译双完整根，B 根字节不变，G4.5 不越 G1/G5，价值覆盖票不越安全门 |
| 消费者/测试闭集 | PASS，计划级 | 五实施文件、两证据产物；旧 fallback-only 循环替换；`cmp`、生成检查和 `--describe --release-manifest` 命令可执行 |
| 独立红队 | PASS，0 BLOCKER/MAJOR | C 新 context/manifest，全部 C\B 可观察差分逐场景不可达；不能证明即 UNKNOWN，不偷转 B 全任务票 |
| 价值审计 D0 | UNKNOWN，实施按 NO-GO | 90 天主线非 merge 根触及 74 次，同提交双改 28 次；有两例旧制漂移返工，但 9/6 根重构后样本不足，未证明未来 12 个月净节省 |

价值事件证据：`7ff2d475` 修复 AGENTS 缺 Scene D；`55b17daa` 修复 Codex 根缺五个一级 skill。两者不能直接外推新根制度的人时收益。原根比较约 10.5/11.1 KB，一个会话不是同时消费两根。当前不以技术选择倒逼实施；默认完成 v3.2 主线。

**交接执行 session**：P1 停止等待本票后，先独立修复 G1 的 C3 动态反例并取得真实 PASS，方可继续 P2；不得将本票当作 G1 放行。把计划中的 `G4.5 / U5-option` 条件插槽放在原 G4 的 B 工程冻结之后、G5 的 A→B 最终裁决之前；目前 V=UNKNOWN，默认 `SKIP_U5` 并照常走 G5。只有新增 `GO_EVIDENCE` 或用户另作明示 `GO_VALUE_OVERRIDE`、再批准绑定 B 的五文件隔离 C payload 时，才执行 U5a→U5b→U5c；B 的 G5、C 的 G6、付费会话及发布均各自独立。此次交接不要求执行 session 在 P1 写根、不更改另一 session 的 v3.2 文件。

计划票与实施票严格分开：Claude 当前无额度、原 56 个 A/B 会话未完成、G1 仍为 8/9，均不得报已验收；B 根若在 U1–U4 变化，G4 须重扫消费者闭集并重新绑定 SHA。五文件范围不够或任一阻断失败，停止并请用户审批 delta，不自动升范围/费用。

<!-- FILE_END: framework-audit/2026-09-21-cross-harness-root-handshake-review.md -->
