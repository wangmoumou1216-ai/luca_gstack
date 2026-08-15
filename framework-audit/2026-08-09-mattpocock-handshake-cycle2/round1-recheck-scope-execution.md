# Cycle 2 Round-1 Recheck 红队 C — Scope / Executability / Human Gates

Candidate SHA-256: `34bcc92ba5ff7ff6c27a5ed724068a2faadcf6641af8399fda0216056050cf45`

- Reviewer receipt: `C2-R1-C-RECHECK-SCOPE-20260809T063229Z-34bcc92b`
- Review posture: default `REFUTE`
- Boundary: 只读复核题定冻结 Plan 及其绑定 ADR；未修改 Plan/ADR/source/tool。未来 broker、role、script 尚未实施本身不计 Plan finding；只判定生产者、文件面、人类授权、依赖、命令和回执合同是否已经可单义施工。

## 冻结与静态证据

- Candidate 实测 SHA 与题定值精确一致；`candidate-plan-freeze.sha256` 校验 PASS。
- Plan 绑定的 ADR SHA `85b64175c97a38ced9b5b4c3d02a5d6c5ab5a6787b0df7fe0fbc9adc7b1164c4`、matrix SHA `c0ddd7da94389ab20e50461abe8bcc8fd79c8164fef1cf71f6b17fe22dd548cc` 与 source-bundle SHA `dac6fd8376f99a54c4fd5ce752cbb5a7588140286efd39b60387acabbce38b66` 均与当前字节一致。
- `run-fixtures.mjs candidate-plan` PASS：16 WP / 321 atoms；这只证明字段/原子/固定 token 完整，不会捕捉下述跨 WP 依赖和 path-resolution 矛盾。

## R1C-01..09 与 NS-01..03 闭合复核

| ID | Status | 当前证据 / 裁决 |
|---|---|---|
| R1C-01 | **CLOSED** | 唯一 DAG 已是 `WP-13-BUILD → H4a → WP-13-NATIVE → WP-14 → H4b → WP-15`（Plan 97–113, 301–233），BUILD/native/landing 不再互等。 |
| R1C-02 | **CLOSED** | Plan 297 与 ADR 628–629 的 R6 spike + strict verifier 命令字面一致，都以 envelope/key 解析。 |
| R1C-03 | **CLOSED** | WP-00 用现存 bootstrap-main + 未被修改的 quality-gate 建/验 TCB；WP-05 PASS 前禁用新 role（Plan 147–154, 204–213）。 |
| R1C-04 | **CLOSED** | WP-00-PREP 先产 immutable envelope、isolated roots 和枚举 candidate keys；后续 WP 不再消费未绑定 `<transaction-global-candidate>`。 |
| R1C-05 | **CLOSED** | WP-02→03→04 已串行，共享文件在 §7.1 给出顺序 writer epoch 和 pre/post-hash 交接。 |
| R1C-06 | **CLOSED** | DAG 和 WP-11 Dependencies 同时写明 WP-06..10 全部先于 WP-11。 |
| R1C-07 | **CLOSED** | H0 前现有无特权 bootstrap 产 executor/schema，独立 TEST 后 PREP 才产 envelope/H0 exact payload；A 段本身不写。 |
| R1C-08 | **CLOSED** | REVIEWED/R、A、B/pending、C/final、VERIFIED 已在 §7.2 逐文件定义，失败反向顺序唯一。 |
| R1C-09 | **CLOSED** | H1 首 edge 后只能 roll-forward 到 stub/absent + deny，明禁恢复已证实危险真身（Plan 177–180）。 |
| NS-01 | **CLOSED** | 已拆成 `WP-02-PREP → TEST-WP-02-PREP → H1 → EXEC → TEST`，H1 绑定的 descriptor/stub/old/executor 都先冻结。 |
| NS-02 | **CLOSED** | H4a 两条 exact native command 均传 `--execution-envelope` 及枚举 approval/descriptor/receipt key，不再绕过 envelope。 |
| NS-03 | **CLOSED** | `verify-activation-build.mjs` 已进 WP-13 Files/ADR owned surfaces；candidate receipt 明确不可信，唯一 BUILD 绿灯由 WP-00 TCB independent verifier 发出。 |

## 同域新 BLOCKER / MAJOR

| ID | Severity | Evidence | Status | Required Plan fix |
|---|---|---|---|---|
| NS-04 | **BLOCKER** | **G-REVIEW 是必经的 canonical Git mutation，但没有 executor/command/receipt 合同，也没有成为 WP-13-BUILD 依赖。** Gate 表只说“将 exact commit R 落到 canonical”（Plan 92）；WP-01 Command 只验 decision ledger（163），没有创建/核验/落地 R 的 exact Git entry，也没有 G-REVIEW binding/result 路径。同时 WP-13 Inputs 要求 `observed R OID` 并构造 `parent(A)=R`（296–298），但 DAG 110 和 WP-13 Dependencies 301 只等 WP-03/04/05/12，WP-12 又只等 WP-01 PASS（290），未等 G-REVIEW observed。因而 Luca 未批 G-REVIEW 时图上仍可进 WP-13，但其必需输入不可能合法存在。 | **OPEN** | 为 G-REVIEW 定义唯一 trusted writer、exact path-limited Git command/CAS、human binding/result receipt 和 exact-revert 失败分支；把 `G-REVIEW observed R` 显式加入 WP-13-BUILD DAG/Dependencies，H4a descriptor 冻结前独立核对 R OID/tree/manifest。 |
| NS-05 | **BLOCKER** | **WP-14 exact command 指向了 envelope receipt root 之外/不存在的 WP-13 summary 逻辑地址。** 唯一 receipt root 是 `.../future-receipts/`（Plan 81–83），WP-13 native 用 `--receipt-key wp13-r6` 从 envelope 解析五份 receipt（297–299）；但 WP-14 却硬编码 `--require-wp13-summary framework-audit/.../receipts/wp13-r6/wp13-r6-summary.receipt.json`（Plan 308），少了 `future-` 且没有用 key。该命令按 Plan 硬规则必须被 canonical-parent 检查拒绝，或直接找不到 WP-13 绿灯，因而 `WP13_R6_NATIVE_PASS → WP-14` 无法执行。 | **OPEN** | 将 WP-14 改为只消费 envelope 中的枚举 summary/receipt key（或至少使用受 canonical-parent 校验的 exact `future-receipts` 地址），并加 summary-key/path substitution 负例。 |
| NS-06 | **BLOCKER** | **H0/H1/H4a/H4b 的“真实 Luca 回复 → 不可替换 approval binding”没有生产者或可机械审计的入口。** Plan 固定四个 binding 路径（83）并多次说“真实回复后生成”（148、150、178、298–299），但未命名 approval writer、schema、exact command、人类 transcript/turn/nonce 的绑定方式或独立 verifier；WP-02 反而特意说 candidate producer 不持有 approval writer（173），但全 Plan 没有另一个 owner。因此执行 Agent 可能自己把 proposal 复制为 `approval-binding.json`；后续 hash 校验只能证明“文件一致”，不能证明 Luca 真实批了该 payload。这使四个人类门在 Plan 层面没有可执行信任边界。 | **OPEN** | 定义一个 candidate/child 不可写的 human-gate adapter/receipt protocol：每门先冻结 proposal SHA + nonce/expiry，只从真实用户回复/工具批准事件生成 write-once binding，记录可独立验证的 session/turn/event hash；把 writer、schema、四个 exact entry 与 replay/forgery/substitution 负例写进 WP-00/02/13/15。 |
| NS-07 | **MAJOR** | **WP-02 的 Files/owner 没有覆盖它的 exact commands 所需的两个未来脚本。** Files 只列 `verify-containment-plan.mjs`、stub/descriptor 与 WP-00 TCB executor（Plan 174），Command 却还调用 `scripts/evolution/prepare-resolver-containment.mjs` 和 `scripts/evolution/verify-route-containment.mjs`（176）；两者当前未存在，也没有任何 WP Files 声明由谁未来产出。这不是要求它们现在实现，而是 Plan 的生产者/消费者图缺两个节点；尤其 EXEC verifier 的独立 owner 与 candidate write boundary 无法判定。 | **OPEN** | 将 descriptor producer 和 route-containment verifier 的 exact paths 加入 WP-02 Files，明确分配到 DEV-WP-02-PREP 与独立 TEST-WP-02-EXEC（或把可信 verifier 前置到 WP-00 TCB）；绑定其 pre/post hash 并增加删脚本/替换 verifier 负例。 |
| NS-08 | **MAJOR** | **两 checkout 环境下的 command working directory 未入 envelope 合同，所谓 exact command 仍会指向不同字节。** WP-00A 只用散文说对“两 checkout”跑 `git status/rev-parse/merge-base`（150），没有两个 `git -C <exact path>`/checkout-key entry；WP-01..15 的未来 `scripts/...` 都是相对路径，但这些脚本只会存在于 transaction checkout，Plan 没有一条全局规则要求 process cwd 由 envelope 的 transaction-checkout key 解析/CAS 后设定。从 canonical cwd 照抄命令会运行旧脚本或 `ENOENT`，从任意 cwd 运行则绕过了“可变路径只由 envelope 解析”。 | **OPEN** | 在 §2/WP-00 冻结枚举 `canonical-checkout`/`stale-checkout`/`transaction-checkout` cwd keys 和各自 HEAD/tree/device/inode；为每类 command 明确 cwd-key，执行前 CAS/readback，两 checkout Git 预检改成可直接执行的精确 `git -C`/equivalent entry。 |

## Verdict

**REFUTE**

R1C-01..09 和 NS-01..03 的原始问题均已被实质修复，并且 H0/H1 payload-before-gate、R6 build→native→acceptance→cutover 主链已经无环。但题定 SHA 仍有三个会让危险门或主链无法机械执行的 BLOCKER：G-REVIEW 无执行/依赖合同、WP-14 消费错误 receipt 地址、四个 human binding 没有可信 writer；另有 WP-02 产生者文件面和全局 cwd 两个 MAJOR。修正、重冻结并对新 SHA 重跑 fresh redteam 前，不能给出 `PLAN_HANDSHAKE_READY`。

<!-- FILE_END: round1-recheck-scope-execution.md -->
