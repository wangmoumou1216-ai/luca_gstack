# Cycle 2 Round-1 Fresh 红队 C — Scope / Plan-first / Execution Review

- **Candidate SHA:** `364ba0144553e0e4e4f03ebd023f1df85a1df1da996636b1e5f791146c35d94a`
- **Reviewer receipt:** `C2-R1-C-SCOPE-EXECUTION-20260809T043953Z-364ba014`
- **Review posture:** default `REFUTE`
- **Scope:** 只读审查 frozen `candidate-handshake-plan.md`；未修改 Plan，未把未实施的 broker 当作当前必须存在的产物。

## 核验摘要

Candidate SHA 已与冻结值精确一致。现有静态审计工具实际运行通过：`build-manifest.mjs validate` 返回 321 decisions / 197 manifest atoms，`audit.mjs harness-matrix` 返回 321 atoms / 2,568 cells / 2,576 receipts。Plan 的 §1.2–1.3 已清楚回答“上游有什么→哪些适配 luca_gstack”，也显式保留了 Luca 新增的 AGENTS 路由表、muse 7-tool/sidebar-selection、exact-session spool 和 S4 全 hook-group 校验。

但“可按图施工”仍不成立：下表包含多个真实依赖环、自举矛盾与同文件并发所有权冲突。

## Findings

| ID | Severity | Evidence | Status | Required Plan fix |
|---|---|---|---|---|
| R1C-01 | **CRITICAL** | Plan §3 将 `WP-14 → H4a`（lines 95–109）；WP-14 又要求 `H4a native proof`（line 306）；P5 更规定 WP-13 不成功就“不得请求 H4a”（line 328）。但 ADR-ACT-001 明定 native broker installation/spike 在 H4a 之下运行（ADR lines 326–331, 465–468, 569–577）。因此当前是 `WP-13 PASS → WP-14 PASS → H4a` 与 `H4a → WP-13 native PASS → WP-14` 的硬环。A-015 还把 WP-13 输入写成 H4b descriptor（line 132），而 H4b 本身在 WP-14 之后。 | **OPEN / blocking** | 把 WP-13 拆成“无特权实现+冻结”与“H4a 安装/native proof”两个节点，唯一序列改为 `WP-13-build → H4a → WP-13-native-proof → WP-14 → H4b → WP-15`；A-015 改为 H4a spike descriptor/receipt，H4b 只消费已冻结 proof。 |
| R1C-02 | **CRITICAL** | ADR 声明 WP-13 “必须实现 exact non-live acceptance entry point，renaming a test 不合规”，锁定 `evolution-activate.mjs --mode spike ...fixtures/h4a-r5.json` + `verify-activation-r5.mjs`（ADR lines 559–577）。Plan WP-13 却改成一个不同的 `verify-activation-faults.mjs --architecture ... --isolated-apfs <approved-fixture-volume>` 命令（Plan lines 289–293），Files 中也没有 `verify-activation-r5.mjs` 和 `fixtures/h4a-r5.json`；当前两者确实均不存在。这不是要求现在建 broker，而是 Plan 对“唯一未来 contract”有两套互不相容命令。 | **OPEN / blocking** | 只保留一套 R5 command/receipt contract。WP-13 Files 必须显式产出 ADR 锁定的 verifier、fixture descriptor 和 receipt paths；若要更名，先修改 ADR 唯一真源并重签 SHA，Plan 不得另造第二套。 |
| R1C-03 | **CRITICAL** | Plan 自己承认 plan/work/oracle 当前仍缺（§8 risk 2），WP-05 才新增 Claude/Codex `work-agent`/`oracle` 以及 Codex `plan-agent`（lines 198–207）。但 WP-01–04 已把尚不存在的 `work-agent`/`oracle` 写为 owner（lines 154, 167, 178, 189），WP-05 更由它要创建的 `work-agent` 拥有（line 200）。实际 repo 列表也只有 Claude `work-agent-template.md`，Codex 仅 muse/preflight/quality-gate，没有该三个可调度 role。 | **OPEN / blocking** | 增加唯一 bootstrap owner 合同：由当前已存在且可调度的 main/orchestrator + 新鲜 quality-gate 实施/验收 WP-05；WP-05 PASS 后才允许新 logical roles 拥有后续 WP。不能让 role 生产自己。 |
| R1C-04 | **CRITICAL** | WP-06/07/08/09 命令都消费未绑定的 `<transaction-global-candidate>`（lines 214, 225, 236, 247），但没有更早 WP 创建、冻结或出具该 root 的 receipt。ADR 把 transaction worktree/HOME 和 GLOBAL_STAGED candidates 放在 PREPARED/GLOBAL_STAGED（ADR lines 455–463），而当前 WP-13 又在等 WP-12，WP-12 在等 WP-06–11。即 candidate producer 等 consumer 完成。 | **OPEN / blocking** | 把 transaction prepare/stage 抽成 WP-00 之后的早期包（或 WP-13-prep），产出唯一 absolute candidate-checkout/home/global-root、device/inode/hash 和 lease receipt；WP-06–12 全部依赖该 receipt，去掉未绑定 placeholder。 |
| R1C-05 | **HIGH** | DAG 明确并行 WP-03/WP-04（line 101），但两者都拥有 `.claude/hooks/project-scope-guard.mjs` 和 `scripts/test-project-scope-guard.mjs`（lines 179, 190）。WP-02 与 WP-03 都拥有 `route-guard.mjs`（lines 168, 179），又无依赖顺序；WP-07/WP-08 同样共有 `skill-routing-map.yaml`。这违反“owner/files 单义”，也使精确 commit rollback 无法归因。 | **OPEN / material** | 为每个共有文件指定唯一 integration owner，或增加明确顺序边与前置 hash/hunk contract。并行 WP 的 Files 必须 disjoint；合并后再由独立 oracle 验证。 |
| R1C-06 | **HIGH** | DAG 写 `WP-05 → WP-06 ∥ WP-11`（line 106）；但 WP-11 声明自己要验收“其它 WP 的 126 adopted atoms”，并在 Dependencies 散文中说 WP-06/07/08/09/10 atoms 必须等各 candidate 冻结（lines 268–273）。这个真实边没进 DAG，导致 WP-11 可在输入未产出时启动。 | **OPEN / material** | 把 `WP-06..WP-10 → WP-11 → WP-12` 写入唯一 DAG，或将 WP-11 拆成“旧 197 基线”与“adapted candidate 集成回归”两个 receipt；不得依赖散落在卡片 prose 中。 |
| R1C-07 | **HIGH** | WP-00 同时声明“新增 preflight script/receipt”（line 142）、“任何写入前两检出已对齐”（line 145）和“本 WP 只读”（line 147）。首个命令调用当前不存在、却要由这个 WP 新建的 script；`--plan candidate-handshake-plan.md` 也与其余 repo-root relative 参数的运行目录不一致，实际 Plan 在 audit 子目录。另外 Plan 已知另一 checkout 滞后，却只给 `BLOCKED_CURRENT`，没有经授权的 exact reconcile 下一步。 | **OPEN / material** | 在新的 frozen baseline 中预先交付并审计 preflight tool，或将 WP-00 改为仅用现有读命令；receipt 只在 checks PASS 后原子发布。传入 Plan 的完整 repo-relative path，并增加 `BLOCKED_CURRENT` 后的 Luca 授权 reconcile gate/command/receipt，不自动 pull/merge。 |
| R1C-08 | **HIGH** | ADR 规定 commit B “只包含 adoption/pin/route records”，B observed + gate open 才进 `LEDGER_COMMITTED`（ADR lines 482–489）。Plan WP-15 却说先观测 commit B 的 route/adoption/pin 行、开 gate、live verify 到 `VERIFIED`，“然后”才更新 ADOPTED/adoption-log/pins/registry/CHANGELOG（lines 311–316）。WP-01 又在 landing 之前推进 benchmark/vetting registry（lines 155–160）。同一批 governance 文件由 WP-01/WP-11/WP-13/WP-15 重叠拥有，但没有 reviewed/prepared/active/reverted 的状态真值。 | **OPEN / material** | 定义唯一 registry/adoption 状态机和时序：WP-01 只记录 reviewed upstream/decision baseline；commit B 携带的精确 prepared rows 及 hash 在 H4b 前冻结；`VERIFIED` 后只做不改变 B 语义的终态/audit 记录。每个文件只有一个 writer WP，其余包传 receipt/hash。 |
| R1C-09 | **HIGH** | WP-02 同一 Rollback 先说 containment 安全回滚“不得重新暴露已证实不安全的旧 resolver”，又说 H1 失败就恢复交换前精确字节（line 173）；P1 失败表也统一写“恢复精确前态”（line 324）。交换前正是已判定会自动 stage/commit 的不安全目标，两个规则不能同时执行。 | **OPEN / material** | 把 H1 写成状态化原子事务：pre-swap 失败保持旧态并显式 `CONTAINMENT_BLOCKED`；任一端已交换/旧目标已移出 live name 后，补偿只能 roll-forward 到两端 stub/quarantine，不能回放危险真身。H1 授权卡必须精确覆盖这个失败分支。 |

## Verdict

**REFUTE**

Plan 已足够清楚地完成能力盘点、适配/拒绝裁决、Claude/Codex 目标对等与 Luca 更新保留；但 R1C-01–04 使执行从流程上无法启动或无法走到 H4a/WP-14，R1C-05–09 使 owner/files/rollback/registry 无法单义执行。在修复上述 finding、重冻结 Candidate SHA 并重跑 fresh redteam 前，不应输出 `PLAN_HANDSHAKE_READY`。

