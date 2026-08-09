# Cycle 2 Round 1 修订闭合复核 — Harness / Security

Candidate SHA-256: `fe76562742f05f776aa3fd1b434fe358bf3307dbd78346496437bcfb8a5a724a`

- Reviewer receipt: `round1-closure-harness-security-C578BAC8-C5BA-4A10-92EB-FA9E09AC9C06`

## 复核边界

本轮只读复核前一份 `round1-harness-security.md` 的 3 个 BLOCKER 与 3 个 MAJOR 是否被同一个冻结 Plan 关闭，并检查修订是否引入同域新 BLOCKER/MAJOR。未来 WP、broker、role 或 verifier 尚未实现不算 Plan finding；只有冻结 Plan、ADR、matrix、现有审计工具之间已经存在的执行矛盾、授权越界或机械假绿才计入。

独立确认：candidate 文件 SHA 与题定 SHA 完全一致。复核开始时，Plan 内绑定的 ADR、matrix、decision SHA 也分别与当时文件一致；但最终 read-back 时 ADR 已被并发改写并产生新的 SHA，详见新 finding。本人未对 Plan、architecture 或 matrix 做任何编辑。为避免触碰冻结 matrix，matrix generator 的机械复核显式使用 `/private/tmp` 输出；生成 SHA 与冻结 matrix 相同，321 rows / 2,568 cells / 4 roles 通过，8 个 negative bites 均以 exit 41 被拒。

## 原 findings 闭合结果

| 原 finding | 状态 | 闭合证据 |
|---|---|---|
| H4a 顺序循环 / exact R6 entry 冲突 | **CLOSED** | Plan `candidate-handshake-plan.md:96-112` 已固定 `WP-13-BUILD → H4a → WP-13-NATIVE → WP-14 → H4b → WP-15`，不存在 WP-13/WP-14/H4a 互等；WP-13 Files/Command/Expected/Dependencies 在 `:288-308` 登记 `verify-activation-r6.mjs`，并逐字采用 ADR 的 spike + strict verifier 两条入口和唯一 token `WP13_R6_NATIVE_PASS`。ADR 的 `WP-13 / H4 command and receipt contract` 给出同一入口、五份 receipt 与新 signer/hash 缺失必败合同。 |
| candidate launcher 自发 trust anchor | **CLOSED** | Plan `candidate-handshake-plan.md:141-150` 把 evidence TCB、anchor、nonce commitment、binary/verifier hash 前置到 WP-00；`:200-209` 明确 WP-05 不拥有且不得修改 TCB/anchor/raw transport/verifier，并要求 forged-three-events、replacement-key、replacement-anchor 必败。ADR `architecture-decisions.md:237-267` 进一步规定 parent/orchestrator 直通道、child 不可写根、私钥不暴露、verifier 只信 immutable envelope 的预提交值，不从 candidate/receipt tree 接 anchor。原“被测 launcher 自给自证”链路已拆除。 |
| H1 无唯一 executor 且 rollback 恢复危险 resolver | **CLOSED** | Plan `candidate-handshake-plan.md:167-176` 指定由冻结 WP-00 TCB 的 `contain-resolver.mjs` 执行，参数只接受 immutable envelope、H1 binding、枚举 slot/mode；独立 verifier 后验检查两端 direct discovery。首个 mutation edge 后只允许 roll-forward 到 `stub/absent + fail-closed`，旧字节只进不可发现 quarantine，Rollback 明确没有恢复旧危险真身分支。 |
| matrix 可接受 decision/WP/expected 漂移 | **CLOSED** | `tools/audit.mjs:264-466` 现在读取 matrix header 所绑定的 decision map 与 census，逐 ID 核对 decision、WP、slug、精确 expected、命令 token、role set、receipt 唯一性；`tools/build-harness-matrix.mjs:307-336` 固定 8 类 negative bite。独立在 `/private/tmp` 运行 `build-harness-matrix.mjs --negative-bite --out ...`，decision drift、WP drift、generic `PASS`、单端 token swap、missing role、duplicate receipt 等 8 类均 exit 41；输出 SHA 为冻结值 `c0ddd7da...548cc`。 |
| oracle canary 明文公开、可被 producer 特判 | **CLOSED** | Plan `candidate-handshake-plan.md:211-220` 已把仓内 `secret-canaries.json` 降为公开回归集；真实 security negative 在 candidate freeze 后由独立 oracle 随机生成，只经 parent-memory FD 注入，producer 只见公开样本。命令和 Expected 固定 encoded/split/cross-field/receipt-self-leak 负例与未知 canary 失败条件。 |
| redaction 输出面在 Plan/matrix 间不一致 | **CLOSED** | `fixtures/security/output-surfaces.json:3-12` 唯一定义七面 `stdout/stderr/native-transcript/artifact/handoff/final/receipt-log`；Plan A-008、WP-06 Command/Receipt 在 `candidate-handshake-plan.md:125,213-219` 使用同一七面并要求全部 168 WP-06 cell receipt 绑定 manifest hash。matrix 的 WP-06 commands 与 generator/audit required fragments 也使用完全相同七面列表。 |

## 修订引入的新 finding

| severity | evidence | status | required Plan fix |
|---|---|---|---|
| BLOCKER | **WP-00A 的 exact“只读”命令会覆盖冻结 matrix，形成先重建证据、再验证重建结果的 laundering path。** EXEC-START 只授权 `WP-00A(read-only)`（Plan `candidate-handshake-plan.md:89,97-99`），WP-00 又明确说 A 段“只读取证”并在 Rollback 声明“A 段零写”（`:141-150`）；但其 exact command 是无 `--out` 的 `build-harness-matrix.mjs --negative-bite`（`:146`）。该工具默认输出正是冻结 `harness-matrix.yaml`（`tools/build-harness-matrix.mjs:9-13`），并在任何 positive/negative validation 前无条件 `writeFileSync(outPath, ...)`（`:289-305`）。因此照 Plan 执行会在 immutable envelope/TCB 建立前改写冻结 SRC-HARNESS；若原 matrix 被篡改，工具不是验证该字节对象，而是先从 census/decision 重新生成并替换它，再对替换后的对象 PASS。前置 `shasum -a 256` 只是打印摘要，没有 exact expected 比对/非零失败命令，不能机械阻断这条路径。 | **OPEN** | WP-00A 先用不写文件的 `audit.mjs harness-matrix`（或等价 strict verifier）对**现存冻结 matrix bytes**做 expected SHA + census/decision cross-artifact 校验，hash 不符必须在任何写前非零退出。把 generator/negative-bite 移到 WP-00B 的隔离 scratch，或至少显式 `--out` 到新建 transaction scratch，并比较生成 SHA 与已验证的原 matrix；同步修正“read-only/零写”权限语义。禁止无 `--out` 的默认命令触碰 SRC-HARNESS。 |
| BLOCKER | **Plan 绑定的 ADR 在复核期间发生 post-freeze identity drift。** 冻结 Plan `candidate-handshake-plan.md:74-82` 绑定 `architecture-decisions.md` SHA `b7f875823fb261fd449df68c97832ff41411204598980f252a9fd3c428dcb80a`，且 WP-13 Inputs 再次使用该 SHA。复核开始时实测匹配；最终 read-back 时同一路径已变为 `c44a63796995ae3d520f6be408ade50811fe28410abdb30b15cc5bd275f9510c`（文件从先前 688 行变为 692 行），而 candidate Plan 仍保持题定 `fe765...724a`。因此当前工作树已不再是该冻结 Plan 声称的 source bundle；即使内容改动意图良性，也不能把未绑定的 ADR 当作同一 candidate 证据。 | **OPEN** | 恢复 Plan 所绑定的 exact ADR bytes，或将新 ADR SHA 写入 Plan 后重新冻结 candidate SHA，并对受影响合同重跑 fresh closure/redteam。按照 Plan `:152,384`，不能只接受漂移后的文件或只改 expected SHA。 |

## 终局

`REFUTE`

原 3 BLOCKER + 3 MAJOR 已全部 **CLOSED**，但当前 bundle 仍有 2 个 BLOCKER：WP-00A 的现有 exact command 与只读授权冲突，并可把被篡改的冻结输入替换后再宣称通过；同时 Plan 所绑定的 ADR 在复核期间发生 post-freeze identity drift。两者都不是“未来实现尚未发生”。除这两点外，本 reviewer 当前未发现其他同域 BLOCKER/MAJOR。

<!-- FILE_END: round1-closure-harness-security.md -->
