# Cycle 2 Round-1 Final Closure C — Scope / Executability

Candidate SHA-256: `25d948168640d6ec23a7f9a5f06e74f22ad4057039b6c17cc98e99ee3ec8c12d`

- Reviewer receipt: `C2-R1-FINAL-CLOSURE-SCOPE-20260809T080359Z-25d94816`
- Review posture: default `REFUTE`
- Boundary: 只读复核 Plan-first 权限、WP 字段/CWD、owner/files/command、human gate、DAG、DEV/TEST、rollback/hard-stop；未修改 Plan/ADR/matrix/bundle/freeze。未来实现本身不计 finding。

## 冻结与机械核验

- Candidate 实测 SHA 与 `candidate-plan-freeze.sha256` 精确一致。
- 绑定 ADR SHA `4134996ac6c131f0b919b639537013406272ef91c3763bf24ec131187393a3db`、source-bundle SHA `76592b91db271a0ce31aef7d54d0d3238885ab8f0af420603fb588d749e36cd3` 和 OS anchor SHA `6cdd7f72de0a8fe22c7db1681aaa82d57f8bbdd94e0f3f74c8750cb7439c04ac` 均匹配当前 bytes。
- 按 Plan exact OS-anchor command 实跑 PASS：18 bundle members、physical repo device/inode 及全部 bytes 通过；`audit.mjs source-bundle` 亦 PASS。
- `run-fixtures.mjs candidate-plan` PASS：16 WP / 321 atoms；`freeze` PASS。
- 独立脚本核对 16/16 WP：每个都有 `Owner/CWD/Files/Inputs/Command/Expected/Receipt/Rollback/Dependencies`。

## 原 scope findings 闭合状态

| Finding | Status | Closure evidence |
|---|---|---|
| NS-04 — G-REVIEW 无 exact executor/result，且 WP-13 未等 observed R | **CLOSED** | `ADR-GATE-001` 和 WP-01 现在冻结 R OID/tree/parent/path manifest，给出 prepare → exact user reply → land → independent verify 完整命令；DAG/WP-13/WP-15 统一消费 `G_REVIEW_R_OBSERVED`。 |
| NS-05 — WP-14 硬编码错误 WP-13 receipt path | **CLOSED** | WP-14 只消费 envelope 枚举 `--require-wp13-summary-key wp13-r6-summary`，并强制 key/path/envelope substitution 负例。 |
| NS-06 — human approval binding 无可执行信任边界 | **CLOSED under stated threat boundary** | 新 `ADR-GATE-001` 明确 trusted top-level `bootstrap-main` 是 approval recorder，只能在 proposal 后收到新的 exact `role=user` turn 才把字节交给 WP-00 TCB recorder；它明示不对抗已作为 Luca 运行的 trusted main，不再伪称有未安装 raw-hook 信任通道。H0/G-REVIEW/H1/H4a/H4b 均有 exact recorder argv 和 fail-closed `BLOCKED_HUMAN_CHANNEL`。 |
| NS-07 — WP-02 product/independent verifier 生产者与命令不全 | **CLOSED** | WP-02 Files 已指定三个 product scripts 与 WP-00 TCB executor/independent verifier 的分立 ownership；PREP、两个 product checks、TCB freeze、human binding、mutation、product post-check 和 TCB final verify 都有 exact command/key。 |
| NS-08 — ambient cwd / 两 checkout 命令不单义 | **CLOSED at process boundary; key-name drift remains below** | 每个 WP 已有强制 CWD；envelope 冻结三 checkout absolute path/device/inode/HEAD/tree，TCB 必须以 directory FD `fchdir`/CAS 后 spawn；WP-00A 两 checkout reads 是 exact absolute `git -C`。 |

Plan-first 权限边界也已单义：H3 只批 Plan，未授权 runtime/global/route/Git/root/live；EXEC-START、H0、G-REVIEW、H1、H4a、H4b 各自停下等真实用户。DEV/TEST 矩阵为 16/16 WP 指定不同 session/角色，candidate/product receipt 不被当成可信绿灯。R6 补偿顺序、H1 roll-forward-only、G-REVIEW partial manual recovery 和全局 hard-stop 均没有回退到 broad reset/guess-repair。

## 当前开放 BLOCKER / MAJOR

| ID | Severity | Evidence | Status | Required fix |
|---|---|---|---|---|
| FC-SCOPE-001 | **BLOCKER** | **冻结 Plan 自己定义的 `execution-key-manifest` exact-set 不等于它的 exact commands。** §2 规定 PREP “从冻结 Plan 机械提取所有 `--*-key`/`--receipt-prefix-key` 并与 manifest exact-set 对比，缺失即 freeze 前失败”（Plan 85）。当前 exact command 含 `--receipt-key h0-approval`（Plan 157），但冻结 `receipt/result=` 列表漏掉 `h0-approval`（Plan 87）。同时 PREP 含 `--bootstrap-root-key cycle2-audit-root`（Plan 157），而冻结列表既无该 key，也没有声明 bootstrap-root 从“所有 `--*-key`”提取中排除。按文本唯一机械语义，`TEST-WP-00-PREP` 必然 exact-set FAIL，无法产生 `WP00_PREP_FROZEN`，整条 DAG 在 H0 前停死。 | **OPEN** | 把 `h0-approval` 加入冻结 receipt/result 列表；对 `cycle2-audit-root` 二选一：将其加入显式 `bootstrap-root=` 闭集并纳入 manifest，或把机械规则精确改为“提取除题定 pre-envelope `--bootstrap-root-key cycle2-audit-root` 外的所有 keys”并使 validator 守护该唯一例外。重冻结后让 fixture 对真实 Plan flags 与列表做 exact-set 断言。 |
| FC-SCOPE-002 | **MAJOR** | **强制 CWD 卡仍与冻结 candidate-key/Command 不一致。** WP-08 CWD 说“只通过 `candidate-key resolver`”（Plan 254），但闭集与 exact Command 均是 `resolving-merge-conflicts`（87, 257）；WP-09 CWD 说“只通过 `candidate-key teach-personal`”（266），但闭集/命令均是 `teach`（87, 269）。由于 CWD 被 Plan 定义为必填强制执行字段，这不是可忽略的描述别名；一个执行者按卡读取了闭集不存在的 key，另一个按 Command 读取了另一 target，输入仍非单义。 | **OPEN** | WP-08 CWD 统一为 `candidate-key resolving-merge-conflicts`；WP-09 CWD 统一为 `candidate-key teach`。加一条 fixture：每个 CWD 卡中声明的 key 必须精确出现于 closed manifest 且与该 WP Command 的 flag 相等。 |

## Verdict

**REFUTE**

主链的大型结构缺口已关闭：Plan-first authority、G-REVIEW、trusted-main human gates、WP-02 独立验证、WP-14 receipt key、DEV/TEST 隔离和 R6 rollback 均已可施工。但当前冻结文本的 key exact-set 会在 WP-00-PREP 机械失败，且两个强制 CWD 卡指向了闭集外的 candidate key。在更正这两类文本、重冻结 Candidate SHA 并重跑 final closure 前，不能给出 `AFFIRM`/`PLAN_HANDSHAKE_READY`。

<!-- FILE_END: round1-final-closure-scope.md -->
