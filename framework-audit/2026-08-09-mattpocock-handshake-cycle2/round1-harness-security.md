# Cycle 2 Round 1 — Harness / Security 红队 B

Candidate SHA-256: `364ba0144553e0e4e4f03ebd023f1df85a1df1da996636b1e5f791146c35d94a`

- Reviewer receipt: `r1-harness-security-20DE3FD9-773C-4C39-96EE-BFAEEAB29D51`

## 审查边界

本轮只判断 frozen Plan 是否已经是一份不会诱导执行者穿透门禁或产出假绿的执行指导，不要求未来 WP 已实现。缺少现有实现本身不构成 finding；以下只记录 Plan/ADR/matrix/tool 合同之间已经存在的矛盾、缺失的唯一执行路径或可机械复现的假绿。

已独立确认：冻结 SHA 匹配；matrix 当前为 321 rows / 2,568 T/E/D/V cells；`N/A` 精确为 128 cells，且只落在 32 个 adopted teach atoms 的 Codex 四相位。当前 Codex 缺 plan/work/oracle、Claude/Codex adapter 尚未实现目标状态，都被 Plan 正确标为未来 WP，不单独判错。ADR-PIN-001 与 ADR-PATCH-001 的目标合同也已给出足够具体的未来 fault/byte-identity acceptance。

## Findings

| severity | evidence | status | required Plan fix |
|---|---|---|---|
| BLOCKER | **H4a 顺序不可执行，且 WP-13 命令违背冻结 ADR 的 exact entry point。** Plan DAG 把 `WP-13 → WP-14 → H4a` 固定在 `candidate-handshake-plan.md:95-109`；WP-14 又在 `:301-306` 明确依赖 WP-13 isolated broker receipts，并规定 H4a native proof 不存在就 BLOCKED。与此同时 ADR 在 `architecture-decisions.md:559-577` 明定 WP-13 spike **只能在 H4a 下运行**，且必须执行 `evolution-activate.mjs --mode spike` 加 `verify-activation-r5.mjs` 两条 exact 命令。Plan `:288-295` 却写成“H4a 前”跑 fault matrix，只调用另一条 `verify-activation-faults.mjs`，Files 也未登记 ADR 指定的 `scripts/verify-activation-r5.mjs`。这不是未实现，而是执行顺序闭环加权威命令冲突；执行者只能越过 H4a 或伪造 WP-13/WP-14 绿灯。 | OPEN | 把唯一 DAG 改成 `WP-13 dormant build → H4a prepare/install → ADR exact native spike + verify-activation-r5 → WP-13 PASS → WP-14 → H4b → WP-15`；WP-13 Files/Command/Receipt 必须逐字采用 ADR `:559-577` 的两条入口和四份 receipt，删除/降为内部 helper 的冲突入口；P5/P6/P7 阶段表同步同一顺序。 |
| BLOCKER | **签名回执的 trust anchor 仍由被测 launcher 链路自给，无法证明 native edge。** WP-05 的 Dev owner 同时写 `agent-launcher.mjs` 与 role verifier（Plan `:198-205`）；matrix 的 8 个 role contract 都从同一个可写 receipt tree 读取 `future-receipts/roles/h3-trust-bundle.json`（`harness-matrix.yaml:28-99`）。ADR `architecture-decisions.md:246-258` 又规定 signer key/fingerprint 由该 launcher 现场生成并从该 launcher 的 tool result 作为“out-of-band”输入。现有 delegated verifier 只验证调用者提供的 key/fingerprint 是否彼此一致（`tools/verify-receipt.mjs:117-145`），无法判断 native log 是否真来自 harness；`make-signed-receipt-fixture.mjs:32-116` 可完全在无 native child 情况下生成 launch/session/result、key、log 和 receipt，给 verifier 配套 fingerprint 后实际返回 PASS。签名只证明“同一 signer 写了这些字节”，没有建立 signer 独立于候选 launcher 的来源。 | OPEN | 把 receipt issuer/anchor 从 WP-05 被测候选中分离为先冻结、独立审过、候选不可写的 TCB；supervisor 在 child 和 candidate checkout 之外预提交 nonce、issuer binary hash 与 public-key fingerprint，并通过直接父通道交给独立 verifier，禁止 verifier 从 receipt root 或 launcher 自述文件取得 anchor。增加“候选 launcher 伪造三事件 + 自换 key/bundle”负例，必须失败；WP-14 只接收该预提交 anchor 绑定的 raw native transport capture。 |
| BLOCKER | **H1 只有验收命令，没有危险 global swap 的唯一执行命令，且 rollback 自相矛盾地恢复旧不安全能力。** WP-02 `candidate-handshake-plan.md:165-174` 的唯一 Command 是 `verify-route-containment.mjs`，并未给出执行 `/Users/luca/.claude/skills/...` 与 `/Users/luca/.agents/skills/...` CAS/atomic swap 的命令、参数或失败状态机；执行 Agent 必须现场发明高风险写法。更严重的是同一 Rollback 先说绝不重新暴露旧 resolver，下一句却要求 H1 失败恢复交换前精确字节。当前 live resolver 的精确旧字节明确要求 `never --abort` 并“Stage everything and commit”（`/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md:10-14`），恢复它会使 direct discovery 再次可达。 | OPEN | 为 H1 增加唯一、参数冻结的 containment executor（expected old inode/tree hash、stub hash、两个 target、route epoch、H1 approval identity、CAS + atomic exchange），并把 verifier 留作独立后验。失败终态只能是“route closed + stub/absent direct target”或显式 `BLOCKED_UNSAFE_CURRENT`；任何已开始的 H1 交易不得恢复旧危险 target。旧字节只保存在不可发现 quarantine，未来仅 H4b 可交换到 WP-08 安全真身。 |
| MAJOR | **matrix validator 可以把被篡改的决策或无咬合 expected 宣称为 2,568-cell biting PASS。** `tools/audit.mjs:265-390` 不读取 matrix header 指向的 decision-map，也不核对每行 `(decision, work_package)` 与 decision-map；对 `expected` 只检查非空。独立变异实测：把第一个 adopted row 的 `decision` 从 `ADAPT` 改成 `KEEP` 后，原 validator 仍输出 321/2,568 PASS；把该行 Claude degrade 的 `expected` 改成字面 `PASS`，仍输出同一 “unique, biting” PASS。Plan WP-00 `candidate-handshake-plan.md:139-145` 明确调用的正是这个 validator，因而当前机械门不能支撑 A-002/A-016 的“唯一决策/咬合”声明。 | OPEN | WP-00 增加独立 cross-artifact validator：从 reconciled census + decision-map 重算并逐行核对 id/lane/decision/WP/behavior slug、matrix header hashes、四相位命令参数和 atom-specific expected/negative oracle；同时固定 matrix SHA。negative bites 至少加入 decision drift、WP drift、`expected="PASS"`、Claude/Codex 仅换 token 的单端假绿、role dispatch 字符串伪装。WP-14 必须先过该 validator，不能只把 matrix 当输入真值。 |
| MAJOR | **WP-06 声称 oracle 隐藏 canary，但 Plan 把明文 fixture 交给 producer；已知样本可被特判。** Plan `candidate-handshake-plan.md:211-214` 同时写“oracle 不向生产者透露实值”和把 `fixtures/security/secret-canaries.json` 作为 work-agent/命令输入。该文件当前权限为 `0644`，仓内任一 producer 都可读取三个明文 canary。于是候选可以只替换已知 token 而对未知 credential/free-text 继续泄露，仍过静态扫描。 | OPEN | 保留公开 fixture 只作回归基线；真正 security negative 由独立 oracle 在 candidate freeze 后随机生成，放在 producer/child 不可读且不可写的父目录，通过受控 stdin/FD 注入真实 harness run，quality-gate 扫描后只发布 salted commitment/类别结果。增加未知形态、分片/编码、跨字段拼接和 receipt 自身泄漏负例。 |
| MAJOR | **debug-redaction 的输出面合同在 Plan 与 matrix 间不一致。** Plan owner/receipt 只列 `stdout/stderr/artifact/handoff` 四面（`candidate-handshake-plan.md:211-216`）；matrix 的 WP-06 cell 命令却固定扫描 `stdout,stderr,transcript,artifact,final` 五面（例如 `harness-matrix.yaml:643-687`），没有 handoff。执行者可以让 WP summary 与 atom cells 各扫一套不同集合，产生“某套回执全绿但另一输出面泄露”的单端/单面假绿。 | OPEN | 建立一个由 WP-06 与 matrix 共同引用的 output-surface manifest，至少覆盖 stdout、stderr、raw/native transcript、artifact、handoff、final response、receipt/log；每个 surface 有独立 hash 和 canary absence receipt。WP summary 必须验证所有 168 WP-06 cell receipt 都绑定同一 manifest hash。 |

## 结论

`REFUTE`

冻结 Plan 尚不能作为 H3 后的唯一执行指导。阻断理由是已有合同矛盾和可伪造证据链，而不是 WP 尚未实现。修复上述 3 个 BLOCKER 并让 3 个 MAJOR 的 mutation tests 真正非零退出后，才适合重新冻结 SHA 进入下一轮。

<!-- FILE_END: round1-harness-security.md -->
