# mattpocock/skills 自进化 Cycle 2 — 最终执行指导 Plan

> 状态：`FROZEN CANDIDATE`；独立终审只写同目录 `judge-verdict.md`。  
> 第一交付物：一份可信、事无巨细、可由执行 Agent 按图施工的 Plan。  
> 权限边界：本文、census、ledger、matrix、fixture 都是计划证据，不是实施回执；本次没有授权 runtime、global、route、Git、root 或 live cutover 写入。

## 0. 第一原则、完成定义和不可越权项

本轮先回答“该怎么安全执行”，不是先建 broker 再倒推计划。H3 完成只要求：上游增量有完整分母、每个行为有唯一裁决、当前 Luca 框架已复核、Claude/Codex 有原生适配合同、每个开发任务有独立测试任务、危险写有明确人类门和失败终态、两轮红队与独立 judge 同意 Plan 可执行。

执行硬规则：

1. 321 个审计原子必须各有唯一 decision、WP 和 Claude/Codex T/E/D/V 合同；包级绿灯不能代替原子证据。
2. 每个 WP 必须给出 Owner、Files、Inputs、Command、Expected、Receipt、Rollback、Dependencies；transaction checkout/HOME/quarantine、candidate/global target 和其它可变执行路径只通过固定 `execution-envelope.json` 的枚举 key 解析，不允许命令里留下人工替换占位符。Plan 冻结的 source/descriptor 路径与固定 audit receipt 逻辑地址可以字面出现，但 executor 必须把 receipt 地址 canonicalize 后证明它位于 envelope 的 receipt root 内。
3. DEV 与 TEST 是不同任务、不同 child session；生产者、candidate launcher 和被测 verifier 都不能给自己发可信回执。
4. H3 只批准 Plan；`EXEC-START`、H0、H1、H4a、H4b 分别重新授权。没有后一张人类卡，就停在前一状态。
5. 任一强制门非零退出立即停。禁止 `git reset --hard`、`git clean`、广泛 add/commit、猜测恢复、自动 pull/merge/push、恢复已证实危险的 resolver 真身。
6. `framework/`、产品项目 `/Users/luca/Desktop/项目/X/docs/`、用户 dirty/untracked 内容、Luca 本轮新接线都不属于本次可改面。

## 1. 上游裁决与当前框架对齐

### 1.1 冻结身份与分母

| 对象 | 冻结值 | 计划含义 |
|---|---|---|
| 当前 luca_gstack | `dce92e6b8c91c617d086ac044e90187b68325fc6` | 已 review Luca 中途更新后的框架；重叠面若再变，必须增量重审。 |
| mattpocock/skills HEAD | `84fdeffd12f2ee307994d1eb6feb48173b6e0502` | 与 2026-08-07 节点相同；没有伪造“新 commit”，本轮闭合上次未完成的能力/适配决策。 |
| 上次 benchmark baseline | `ed37663cc5fbef691ddfecd080dff42f7e7e350d` | WP-01 记录 reviewed upstream truth；它不代表能力已落地。 |
| 另一 luca_gstack checkout | `3f2caad60ec2aa085b87e01db98c852491b53edf` | 是严格祖先但滞后；当前执行必然先停在 H0，不可自动同步。 |

| lane | 数量 | 语义 |
|---|---:|---|
| adopted manifest | 197 | 既有已采纳行为真实分母 `N=197`。 |
| local controls | 50 | 安全/双 harness 控制原子，不充大 N。 |
| HEAD candidates | 74 | 当前窗口候选，未落地前不进 N。 |
| total universe | 321 | 197 + 50 + 74；集合必须 321/321 精确相等。 |

HEAD 74 终局：`ADAPT 10 / KEEP 18 / DEFER 19 / REJECT 27 / QUARANTINE 0`。

| 家族 | 决策 | 数量 | 唯一本地动作 |
|---|---|---:|---|
| diagnosing/debug redaction | ADAPT | 6 | 吸收凭据不捕获、先脱敏后展示、最小信号、free-text/env 防守、无法充分脱敏即停止。 |
| codebase-design wording | ADAPT | 1 | 仅吸收 harness-neutral 措辞；共享真身、3 个 nested refs、双端原生派发全齐才激活。 |
| authoring doctrine | ADAPT | 3 | 合入既有 `skill-authoring.md`；不新建 skill。 |
| phase/handoff | KEEP 4 / REJECT 4 | 8 | 保留 boundary/lossiness；拒绝 `/clear`、`/compact`、150k 窗口及 portability-only 叙事。 |
| logic-prototype | DEFER | 10 | 等首个“只验证状态逻辑”的具名项目；本轮零 route/skill/mode。 |
| questionnaire | DEFER | 8 | 等“具名收件人 + 决策回收目标”；届时只在 pinned project 试点。 |
| TDD vocabulary pointer | DEFER | 1 | 无 seam 失败样本且 codebase-design 未双端闭合；本轮不增指针。 |
| grilling frontier | KEEP 3 / REJECT 5 | 8 | 保留人类决策/事实查询；拒绝 whole-frontier 批量逼问。 |
| setup wizard | REJECT | 12 | 凭据、`.env`、GitHub/GUI 外写无逐写身份/回滚；整体不进。 |
| wait-what | KEEP 2 / REJECT 3 | 5 | 保留用户语言重述；不新建修正 skill，不强塞 ASD-STE100。 |
| distribution/docs lineage | KEEP 9 / REJECT 3 | 12 | 保留谱系/既有原则；拒绝 plugin auto-update、skills.sh 直拷、排他安装通道。 |

硬裁决：**不整包安装、不盲同步、不因上游“毕业”自动加 route。**

### 1.2 Luca 更新后的不可退化基线

| 当前能力 | Plan 保护方式 |
|---|---|
| `AGENTS.md` Codex 一级 skill 路由表 | WP-12/14 做 exact hash + mutation regression；不覆写新表。 |
| muse 7 tools + `sidebar_selection` | 全程 protected path；candidate diff 触碰即失败。 |
| exact-session spool | WP-05 只消费既有 session 身份，不另造第二套。 |
| `verify-codex-wiring` S4 遍历全部 hook groups | WP-12 加删组/伪第一组负例，禁止退回“只看第一组”。 |
| `framework/` 只读与 session project pin 规则 | WP-00 protected manifest + WP-14 全量断言。 |
| 尚未关闭的 pin/patch/roles/resolver/activation 缺口 | 分别只由 WP-03/04/05/02+08/13 关闭；“当前还没有”不冒充失败，也不冒充 PASS。 |

## 2. 证据索引和固定绑定

| Source | 路径 | 冻结真值 |
|---|---|---|
| SRC-CENSUS | `reconciled-census.json` + ledgers | 197/50/74/321、source/head split lineage、origin closure |
| SRC-MANIFEST | `atomic-manifest.yaml` | `69af68294271995a4f130541698b87f65f10f59bd1f956212e69125dfa7afb48` |
| SRC-DECISION | `decision-map.json` | `f76056e4a7d9c510d4c4a0e79fc8dea6e2b3c7dae312aa4a54d4ce17d9f4967b` |
| SRC-HARNESS | `harness-matrix.yaml` | `c0ddd7da94389ab20e50461abe8bcc8fd79c8164fef1cf71f6b17fe22dd548cc`；321 rows / 2,568 cells / 8 role contracts |
| SRC-ARCH | `architecture-decisions.md` | `4134996ac6c131f0b919b639537013406272ef91c3763bf24ec131187393a3db`；五 ADR（含 `ADR-GATE-001`）+ R6 seven-state activation |
| SRC-BUNDLE | `source-bundle.sha256` | `58e0f7f20bfcab7410d4f0fd308447ab734ad4c77db3f8d7132603d64f600f52`；对 SRC census/MANIFEST/DECISION/HARNESS/ARCH、Codex live probe、四件 repository validator及 Plan-literal OS anchor 做逐字节校验；共 18 members；不含 Plan/自身，避免自引用。 |
| SRC-LIVE | `codex-live-probe-receipt.json` | `e68096e3d290ef5d4470eaabe843a7d61d4b83ce95ab6b08ff34a5ad227477f8`，且纳入 SRC-BUNDLE；只证明 Codex CLI 可启动，不证明未来 role/WP 已实现；WP-05 仍须 fresh native re-probe。 |

实施时唯一运行绑定固定为：

`framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json`

WP-00-PREP 在任何 H0 target mutation 前生成该文件；一经独立 freeze 即不可变。它至少包含：Plan/ADR/matrix/decision/source-bundle SHA，transaction ID，canonical repo，`canonical-checkout`/`stale-checkout`/`transaction-checkout` 三个 cwd key 的绝对路径、HEAD/tree/device/inode，`observed_pre_head/tree` 与 `required_post_head/tree`，transaction HOME/quarantine 的绝对路径，五个 candidate key 到绝对路径的映射，receipt root 与 receipt-key map，protected paths，evidence-TCB binary/verifier/human-gate/secure-writer hash、public fingerprint、nonce commitment、expiry。它不嵌未来 approval binding/result SHA；binding 单向绑定 envelope/proposal，result 再单向绑定 binding。后续 mutation/native 命令必须传 `--execution-envelope`；可变目录只接受枚举型 cwd/candidate/receipt key，不接受自由路径。每张 WP 卡的 `CWD` 是强制字段：TCB executor 必须用 envelope 冻结的 directory FD/device/inode/HEAD/tree 做 `fchdir`/CAS 后才 spawn，禁止继承 ambient cwd。所有 `Command` 中即使裸列 `node`/`git` argv，也只能由该 TCB executor 在题定 CWD key 下启动，绝不表示可继承调用者 cwd。Plan 冻结的 source/descriptor 和 receipt 逻辑地址若以字面传入，executor 必须核其 SHA；所有 evidence 写从已打开、已核 inode 的 receipt-root FD 逐级 `openat(O_DIRECTORY|O_NOFOLLOW)`，最终 `openat(O_CREAT|O_EXCL|O_NOFOLLOW)` 并经同一 FD read-back，逐层 device/inode 必须与冻结向量相等且 final `nlink=1`，不得对 raw path 使用 lexical `resolve()` 代替 containment。

execution envelope 尚不存在时只允许一个非递归 bootstrap：冻结 TCB 以编译枚举 `cycle2-audit-root` 从已打开的 `canonical-checkout` FD 逐级 `openat`/`mkdirat` 固定相对段 `framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00`，冻结每层 device/inode 后，以 `--receipt-key execution-envelope` O_EXCL 写首个 envelope；不接受 raw `--receipt`、自由 root 或 symlink ancestor。envelope 内 `execution-key-manifest` 是闭集：必须枚举本文所有 cwd/source/candidate/descriptor/executor/proposal/approval/result/receipt/prefix/write-root key 及唯一相对落点；PREP 从冻结 Plan 机械提取所有 `--*-key`/`--receipt-prefix-key` 并与 manifest exact-set 对比，缺失、重复、越根或执行中动态新增 key 均在 freeze 前失败。H0/G-REVIEW/H1/H4a/H4b 的固定 binding 路径分别是 `future-receipts/H0/approval-binding.json`、`G-REVIEW/approval-binding.json`、`H1/approval-binding.json`、`H4a/approval-binding.json`、`H4b/approval-binding.json`。

闭集值在本 Plan 冻结时为：cwd=`canonical-checkout,stale-checkout,transaction-checkout`；bootstrap root=`cycle2-audit-root`；candidate/write-root=`codebase-design,resolving-merge-conflicts,systematic-debugging,tdd,teach,teach-fixture-root`；source/ledger/executor/commit/descriptor=`harness-matrix,decision-ledger,contain-resolver,review-r,h1-containment,h4a-spike,h4b-cutover`；proposal=`h0-proposal,g-review-proposal,h1-proposal,h4a-proposal,h4b-proposal`；approval alias=`H0,G-REVIEW,H1,H4a,H4b`；receipt/result=`execution-envelope,wp00-matrix-generated,h0-approval,wp01-decision-ledger,g-review-prep,g-review-approval,g-review-result,g-review-observed,h1-prep-candidate,h1-prep-candidate-check,h1-route-candidate-check,h1-prep-freeze,h1-approval,h1-mutation,h1-contained-candidate,h1-contained,h4a-approval,wp13-build-candidate,wp13-build-gate,wp13-r6,wp13-r6-summary,wp14-acceptance,h4b-prep,h4b-approval,wp15`；receipt prefix=`wp03,wp04,wp05,wp06,wp07,wp08,wp09,wp10,wp11,wp12`。同一值被不同只读 consumer flag引用是允许的，但 manifest 只能有一个 canonical entry。

## 3. 人类门与无环执行 DAG

| Gate | 谁拍板 | 唯一授权 | 明确不授权 |
|---|---|---|---|
| H3 | Luca | 批准本 Plan | 实施、commit、global/root/live 写入 |
| EXEC-START | Luca | 启动 WP-00A 只读 preflight、audit-local bootstrap/H0 payload 冻结与隔离 transaction 准备 | 自动对齐另一 checkout、canonical/runtime/global 写 |
| H0 ALIGN | Luca | 仅在独立 TEST 已冻结 executor + old/new/dirty/tree descriptor 后，对该 exact payload 做 clean strict-ancestor `--ff-only`；否则拒绝 | 先批后造 payload、merge/rebase/reset/清理用户内容 |
| G-REVIEW | Luca | 在 R manifest/parent/tree 与 trusted executor 独立冻结后，将 exact commit R（只含 reviewed benchmark/vetting/gaps/decision history）CAS/ff-only 落到 canonical | 先批后造 R、route、skill、pin、adoption、global target |
| H1 CONTAIN | Luca | 在 WP-02-PREP + 独立 freeze 后，绑定 exact executor/envelope/old/stub/descriptor SHA，把危险 resolver 两端直达面换成 fail-closed stub/quarantine | 先批后造 payload、激活 WP-08、新 route、恢复旧危险真身 |
| H4a PREPARE | Luca | 绑定 envelope + synthetic-only spike descriptor + binary/config/schema/transition/verifier hashes + broker fingerprint + fault matrix，在隔离 APFS fixture 安装并跑 R6 native spike | canonical/global/A-B-C/live cutover；绑定未来 native summary |
| H4b CUTOVER | Luca | 绑定另一份 production cutover descriptor、H4a summary、R→A→B→C OID/tree/path manifests 与真实 targets，执行 A/global/B/gate/C/R6 DAG | 通用 root API、动态 path/argv、复用 H4a descriptor、descriptor↔gate/B 自引用、自动 push/扩面 |

所有人类门统一服从 `ADR-GATE-001`：先发布 write-once proposal（payload SHA + random nonce + expiry），然后**停下等待新的顶层 `role=user` turn**。唯一有效回复字节为 `APPROVE <gate> <proposal_sha256> <nonce>`。Claude/Codex 的 trusted top-level `bootstrap-main` 是批准记录者：它必须在 proposal 之后真实收到完整内容逐字相等的新 user turn，才可把该回复通过 closed stdin 交给 WP-00 TCB 的 `human-gate-recorder.mjs`；assistant/tool/subagent/proposal/self-authored text、旧轮次、模糊“好”、重放、错 gate/hash/nonce/expiry都拒绝。recorder 与 `secure-receipt-writer` 均在 candidate/child 写根外，由现有 quality-gate 预冻结；它把 harness、session/turn（以 runtime 可提供字段为准）、`role=user`、exact prompt hash、proposal/envelope/Plan hash写成 O_EXCL binding。此 binding 防 child/candidate replay 与 payload drift，不声称对抗已作为 Luca 运行的 trusted top-level main；若 harness 不能交付独立的新顶层 user turn，则 `BLOCKED_HUMAN_CHANNEL`，不安装额外 hook、不让 agent 自签。

```text
H3 → EXEC-START → WP-00A(read-only source verification)
WP-00A → DEV-WP-00-BOOTSTRAP → TEST-WP-00-BOOTSTRAP
TEST-WP-00-BOOTSTRAP → WP-00-PREP(envelope + isolated roots + evidence TCB + proposed H0 payload) → TEST-WP-00-PREP(`WP00_PREP_FROZEN`)
TEST-WP-00-PREP → [若 checkout 滞后则 H0 → WP-00-ALIGN → TEST-WP-00-ALIGN；否则 signed no-op ready] → WP-00-READY(`WP00_ENV_FROZEN`)
WP-00-READY → WP-05(bootstrap roles) → WP-01 → G-REVIEW
WP-00-READY + WP-05 → WP-02-PREP → TEST-WP-02-PREP → H1 → WP-02-EXEC → TEST-WP-02-EXEC
TEST-WP-02-EXEC → WP-03 → WP-04
WP-05 → WP-06 ∥ WP-07 ∥ WP-10
TEST-WP-02-EXEC + WP-05 → WP-08
WP-03 + WP-05 → WP-09
WP-06 + WP-07 + WP-08 + WP-09 + WP-10 → WP-11
WP-01 + WP-04 + WP-11 → WP-12
G_REVIEW_R_OBSERVED + WP-03 + WP-04 + WP-05 + WP-12 → WP-13-BUILD
WP-13-BUILD → H4a → WP-13-NATIVE(`WP13_R6_NATIVE_PASS`)
WP-01..WP-13-NATIVE → WP-14
WP-14 → H4b → WP-15
```

这条 DAG 明确是 `build → H4a → native proof → 321 acceptance → H4b → landing`，不存在 WP-13/WP-14/H4a 互等。WP-13 未实施和 WP-14 未运行是后续 gate，不是当前 Plan 的伪绿。

## 4. 断言矩阵

| ASSERT | Given / When / Then | Proof | WP |
|---|---|---|---|
| A-001 | 冻结身份进入 preflight；重叠 HEAD 或 checkout 未对齐时；必须停止并给出 H0 卡，不自动同步。 | read-only integration | 00 |
| A-002 | census/decision/matrix 输入；逐 ID 交叉核对；必须 197/50/74/321 且 decision/WP/slug/header hash 精确。 | cross-artifact + mutations | 00/01 |
| A-003 | HEAD 74；复算；必须 10/18/19/27/0，KEEP/DEFER/REJECT zero-new-surface。 | deterministic | 01 |
| A-004 | H1 卡和危险 old hashes；执行 containment；已开始的交易只能收敛到 stub/absent + deny，旧字节仅在不可发现 quarantine。 | CAS/exchange/direct discovery | 02 |
| A-005 | switch/new 成功、失败、并发；执行项目事务；只有 links/state readback 全成功后 commit pin。 | boundary faults | 03 |
| A-006 | patch body 含项目路径字面量；执行 Codex adapter；只解析 target headers，body hash 不变，malformed fail-closed。 | byte identity/live event | 04 |
| A-007 | 预冻结 evidence TCB；派发四 logical roles；每端产生四个真实 native child edge，candidate 自换 key/伪三事件必须失败。 | native transport/signature | 05 |
| A-008 | candidate freeze 后 oracle 随机 canary；经 parent-memory FD 注入；七输出面都无原值/编码/分片重组泄漏。 | secret negative | 06 |
| A-009 | codebase-design candidate；双端调用；共享真身、3 nested refs、至少 3 native agents 全闭合。 | parity/live | 07 |
| A-010 | merge/rebase/rename/modify-delete fixtures；执行 resolver；abort/stage/commit/continue 每一步都等真实用户批准。 | adversarial repos | 08 |
| A-011 | personal teach；双端扫描；Claude 只写 `$LUCA_TEACH_ROOT`，Codex 无 project/global route。 | scoped absence | 09 |
| A-012 | agent-consumed docs；验证 doctrine；两端只指向同一 `skill-authoring.md`。 | pointer parity | 10 |
| A-013 | 197 adopted atoms + 新 candidate；回归；既有行为不退化，TDD 悬空 `code-review` 改本地 `code-hygiene`。 | atom matrix | 11 |
| A-014 | route/catalog/refs/agents；hermetic mutation；任一缺项、ambient harness 污染或 S4 漏 group 非零。 | hermetic mutations | 12 |
| A-015 | H4a synthetic R6 descriptor + human binding；在隔离 APFS 跑 exact spike/verifier；替换 envelope/binding/descriptor/signer 或 guardian、partial B/C、terminal publication 漏一项均失败，唯一 token=`WP13_R6_NATIVE_PASS`。 | native fault matrix | 13 |
| A-016 | 321 matrix；双端四相位验收；2,568/2,568 唯一 receipts，N/A 仅 teach/Codex 128 格且每格有 no-route proof。 | full acceptance | 14 |
| A-017 | H4b production descriptor exact binding；R→A→B→C parent/tree/path manifests 精确，B rows 只含 transaction/epoch，external gate 单向核 descriptor SHA + exact B OID + complete route-file SHA；A→global→B→open→live verify→C→VERIFIED，补偿先 close 再 C/B/global/A。 | live R6 journal | 15 |
| A-018 | 只批准 H3；不执行后续命令；runtime/global/root/Git 状态不变。 | authority diff | global |
| A-019 | review/proposed/installed/verified 三类治理事实；按状态表写入；VERIFIED 后零治理写，回滚逐文件单义。 | governance journal | 01/12/13/15 |
| A-020 | Luca 新 AGENTS/muse/spool/S4/framework 基线；全程 diff + mutation；字节或语义退化即阻断。 | protected baseline | 00/12/14 |

## 5. 工作包

### WP-00 — 实施前身份、差异和审计基线门

- **Owner:** WP-05 尚不存在时，只允许当前 main/orchestrator 作为 `bootstrap-main` 生产 audit-local bootstrap/prep；仓库现有、未由本包修改的 `quality-gate` 用不同 child/session 分别执行 BOOTSTRAP、PREP、ALIGN tests。A 段只有只读命令；bootstrap-main 不得给自己签可信回执。
- **CWD:** A/BOOTSTRAP=`canonical-checkout`；两 checkout Git reads 必须用题定 absolute `git -C`；PREP 生成并冻结 `transaction-checkout` 后，后续子阶段只用该 cwd key。
- **Files:** A 段不产文件。BOOTSTRAP 只在编译固定 `cycle2-audit-root` 产 `WP-00/bootstrap/prepare-cycle2.mjs`、`WP-00/execution-key-manifest.json`、align/G-review schemas/verifiers，以及 candidate 不可写的 `WP-00/evidence-tcb/human-gate-recorder.mjs`、`secure-receipt-writer.c`/frozen binary、`verify-activation-build-independent.mjs`、`verify-route-containment-independent.mjs`、`land-review.mjs`；现有 quality-gate 先冻结其 hashes。PREP 只可产 `WP-00/read-only-preflight.json`、immutable `WP-00/execution-envelope.json`、secure-FD 写出的 `WP-00/scratch/harness-matrix.generated.json`、`WP-00/evidence-tcb-anchor.json`、`H0/proposal.json`、隔离 transaction checkout/HOME/quarantine 与五个 candidate staging roots；H0 顶层真实回复后 recorder 才原子发布 `H0/approval-binding.json`，ALIGN/TEST 再产 `H0/alignment-result.json` 与 `WP-00/ready.json`。canonical runtime/hook 文件不改；H0 只触及题定 stale checkout ref/worktree。
- **Inputs:** H3 Plan SHA、repo `dce92e...`、upstream `84fdef...`、两 checkout HEAD/dirty/tree/branch、SRC-BUNDLE、protected-path manifest、真实挂载/device/inode 信息。
- **Command:** A 段在 absolute canonical CWD `/Users/luca/Desktop/项目/muse/lucagstack` 的第一条命令必须是 repository 外的 OS byte anchor：`/bin/sh -ceu 'for tool in /bin/sh /usr/bin/python3 /usr/bin/shasum /usr/bin/awk /bin/test /usr/bin/stat; do /bin/test "$(/usr/bin/stat -f %Su "$tool")" = root; /bin/test ! -w "$tool"; done; anchor="$1"; anchor_expected="$2"; anchor_actual=$(/usr/bin/shasum -a 256 "$anchor" | /usr/bin/awk "{print \$1}"); /bin/test "$anchor_actual" = "$anchor_expected"; /bin/sh "$anchor" "$3" "$4" "$5"' cycle2-byte-anchor framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/os-byte-anchor.sh 6cdd7f72de0a8fe22c7db1681aaa82d57f8bbdd94e0f3f74c8750cb7439c04ac /Users/luca/Desktop/项目/muse/lucagstack framework-audit/2026-08-09-mattpocock-handshake-cycle2/source-bundle.sha256 58e0f7f20bfcab7410d4f0fd308447ab734ad4c77db3f8d7132603d64f600f52`。它 PASS 后在同一 absolute CWD 逐字执行 `node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/audit.mjs source-bundle --input framework-audit/2026-08-09-mattpocock-handshake-cycle2/source-bundle.sha256 --expected-sha 58e0f7f20bfcab7410d4f0fd308447ab734ad4c77db3f8d7132603d64f600f52`、`node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/build-manifest.mjs validate --decisions framework-audit/2026-08-09-mattpocock-handshake-cycle2/decision-map.json --manifest framework-audit/2026-08-09-mattpocock-handshake-cycle2/atomic-manifest.yaml`、`node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/audit.mjs harness-matrix --universe framework-audit/2026-08-09-mattpocock-handshake-cycle2/reconciled-census.json --matrix framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml --expected-matrix-sha c0ddd7da94389ab20e50461abe8bcc8fd79c8164fef1cf71f6b17fe22dd548cc`，再重跑完全相同 OS anchor；任一 pre/post identity tuple 变化均失败。两 checkout exact reads 为 `git -C /Users/luca/Desktop/项目/muse/lucagstack status --porcelain=v2`、`git -C /Users/luca/Desktop/项目/muse/lucagstack rev-parse HEAD`、`git -C /Users/luca/Desktop/luca_gstack status --porcelain=v2`、`git -C /Users/luca/Desktop/luca_gstack rev-parse HEAD`、`git -C /Users/luca/Desktop/luca_gstack merge-base --is-ancestor 3f2caad60ec2aa085b87e01db98c852491b53edf dce92e6b8c91c617d086ac044e90187b68325fc6`。BOOTSTRAP DEV 生成 TCB，`TEST-WP-00-BOOTSTRAP` 独立核 hashes、闭集 key manifest、参数白名单、human reply replay 与 clean/dirty/non-ancestor/ancestor-symlink/open-after-parent-swap/hardlink 负例。PREP exact entry 为 `node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/bootstrap/prepare-cycle2.mjs --mode prepare --plan framework-audit/2026-08-09-mattpocock-handshake-cycle2/candidate-handshake-plan.md --bootstrap-root-key cycle2-audit-root --receipt-key execution-envelope`；matrix proof 入口为 `node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/bootstrap/prepare-cycle2.mjs --mode matrix-negative --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --source-key harness-matrix --receipt-key wp00-matrix-generated`，内部只向 secure writer 提交已打开的 FD，不接受 raw `--out`/`--receipt`。`TEST-WP-00-PREP` 输出 `WP00_PREP_FROZEN`。若需要 H0，trusted top-level bootstrap-main 在收到 exact user reply 后唯一调用 `node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/evidence-tcb/human-gate-recorder.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --gate H0 --proposal-key h0-proposal --approval-stdin --receipt-key h0-approval`；binding PASS 后唯一 align entry 为 `node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/bootstrap/prepare-cycle2.mjs --mode align --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --approval-key H0`，随后独立读回；已对齐路径也必须生成同 envelope 的 signed no-op ready receipt。
- **Expected:** OS anchor 在任何 repository validator 执行前同时咬住 Plan-literal anchor-script SHA、bundle SHA、全部成员 bytes及 source path/device/inode/size/mtime/ctime/mode/`nlink=1`；替换 `audit.mjs`、同时改 bundle+成员、PATH shadow、source symlink/hardlink/parent swap均先失败。当前任何 source `nlink!=1` 都是显式 `BLOCKED_SOURCE_IDENTITY`，必须先以 byte-identical exclusive regular file重建、复算 bundle/Plan并重过红队，不得豁免。PREP 对 canonical/runtime/global 零写，只允许 EXEC-START 已授权的 audit evidence 与隔离 roots；generated matrix 必须 byte-for-byte 等于 SRC-HARNESS、8 类 negative bite 全被 exit 41，source pre/post identity不变。pre-existing final、ancestor symlink、root-open 后 parent rename/swap、hardlink alias均在 publication 前失败，final fstat/readback也必须匹配，且授权根外零文件。当前 checkout tuple返回 `BLOCKED_ALIGNMENT`，但只在 PREP 独立冻结 exact envelope/executor + old/new/dirty/tree payload 后才可展示 H0。H0 binding 必须符合 ADR-GATE-001并含 Plan/envelope/executor/PREP-test SHA、checkout canonical identity、old/new HEAD/tree、唯一 `ff-only` argv、expiry/nonce，不绑定未来 result；align 首边前重验 clean + strict ancestor + CAS。成功或已对齐都要 `WP00_ENV_FROZEN`，envelope 不重写；child 对 TCB/anchor/recorder/receipt root无写权。
- **Receipt:** A 段只有 live stdout/readback；BOOTSTRAP 与 PREP 分别有现有 quality-gate countersign，PREP 产 immutable envelope、TCB anchor、source identity、proposed H0 payload。H0 后才有 human-bound approval receipt；ALIGN/skip 结果单向绑定 H0/envelope并产生 `ready.json`。全部绑定 Plan/ADR/matrix/decision/source-bundle SHA、两 checkout状态和 expiry。
- **Rollback:** A 段严格零写。BOOTSTRAP/PREP 仅写 audit evidence/isolated roots，失败将 transaction ID 标废且不复用；不删共享 worktree/用户文件。H0 未批准不执行 align；H0 仅允许 clean strict-ancestor `ff-only`，首边前失败零 mutation；开始后的 Git 结果必须是 exact required post HEAD/tree，否则 `BLOCKED_ALIGNMENT_RECOVERY` 并停，绝不 reset/clean/猜修。TCB anchor 一旦发布不可复用 transaction ID。
- **Dependencies:** H3 + `EXEC-START` → WP-00A → DEV/TEST-WP-00-BOOTSTRAP → WP-00-PREP → TEST-WP-00-PREP；若检测到滞后则另需 Luca H0 → WP-00-ALIGN → TEST-WP-00-ALIGN，否则 signed no-op ready；只有 `WP00_ENV_FROZEN` 可进入 WP-05。

新 HEAD 规则：非重叠文档改变也必须生成 `implementation-delta-alignment.md`；route/hook/agent/skill/evolution/activation 或 protected path 重叠则本 Plan 失效，重跑受影响 census/decision/matrix/redteam，不能只改 expected SHA。

### WP-01 — 74 个 HEAD 决策、谱系和基线推进

- **Owner:** WP-05 后的 `work-agent` 只生成 review truth；独立 `oracle` 复算，`quality-gate` 只消费 TCB 回执。
- **CWD:** `transaction-checkout`；G-REVIEW executor 例外地从 TCB 以 `canonical-checkout` FD 执行，不继承调用者 cwd。
- **Files:** transaction checkout 内 `implementation/decision-ledger.json` 及 benchmark/vetting/gaps proposed review delta、exact review-only commit R + allowed path/action/before-after manifest、`scripts/evolution/verify-decision-ledger.mjs`；audit receipt root 的 `G-REVIEW/proposal.json`、`approval-binding.json`、`result.json`、`observed.json`。trusted `land-review.mjs`/human-gate recorder归 WP-00 TCB，不由本包改。不写 live `ADOPTED.md`、adoption log 或 installed pins。
- **Inputs:** SRC-HEAD、SRC-DECISION、H3 Plan/envelope SHA、benchmark registry 上次 `ed37663c...`、上游 `84fdeffd...`、aligned canonical HEAD/tree/branch/clean tuple、commit R OID/tree/parent/manifest。
- **Command:** 先执行 `node scripts/evolution/verify-decision-ledger.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --ledger-key decision-ledger --decisions framework-audit/2026-08-09-mattpocock-handshake-cycle2/decision-map.json --head framework-audit/2026-08-09-mattpocock-handshake-cycle2/head-decision-map.json --expected 'ADAPT=10,KEEP=18,DEFER=19,REJECT=27,QUARANTINE=0' --assert-zero-new-surface --receipt-key wp01-decision-ledger`。然后 TCB prepare：`node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/evidence-tcb/land-review.mjs --mode prepare --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --commit-key review-r --proposal-key g-review-proposal --receipt-key g-review-prep`。trusted top-level bootstrap-main 收到 exact `APPROVE G-REVIEW ...` 后唯一调用 `node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/evidence-tcb/human-gate-recorder.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --gate G-REVIEW --proposal-key g-review-proposal --approval-stdin --receipt-key g-review-approval`；落地唯一入口：`node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/evidence-tcb/land-review.mjs --mode land --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --approval-key G-REVIEW --commit-key review-r --receipt-key g-review-result`；独立读回唯一入口：`node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/evidence-tcb/land-review.mjs --mode verify --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --commit-key review-r --result-key g-review-result --receipt-key g-review-observed`。
- **Expected:** 74/74、raw 73→canonical 74 split 可追溯；56 个 KEEP/DEFER/REJECT 只有 lineage/revisit 条目。R 的 parent 必须等于 aligned canonical exact HEAD，tree/manifest 只准 benchmark/vetting/gaps/decision history；无 route/skill/pin/adoption/global bytes、无 hooks/filter/submodule/custom driver。proposal 在 R 独立 freeze 后产生；G-REVIEW binding 符合 ADR-GATE-001。land executor拿 repository lease，重验所有 checkout clean/HEAD/tree/CAS，以固定 `git -C canonical-checkout` argv做 ff-only；只有 ref/index/worktree readback全等 R 才发 `G_REVIEW_R_OBSERVED`。未获 binding、R/parent/path drift、伪 user event、相对 cwd、partial checkout均失败。
- **Receipt:** 74-row ordered hash、zero-surface oracle receipt、R OID/tree/parent/manifest、G-REVIEW proposal/binding、Git intent+observed/result 与独立 readback；后续 WP-13 只消费 `G_REVIEW_R_OBSERVED`。
- **Rollback:** G-REVIEW 前丢弃 proposed R。首 Git edge 前失败零 mutation；partial ref/index/worktree 进入 `BLOCKED_MANUAL_REVIEW_RECOVERY`，不 reset/clean/猜修。完整落地后如需纠正，只能新建 exact revert commit + superseded/reverted review history并再次过独立人类 gate，不篡改原审计事实、不与 activation journal混用。
- **Dependencies:** `WP00_ENV_FROZEN` + WP-05 PASS。

DEFER 重访条件必须写成可观察事件：logic demo=首个只要状态逻辑的具名项目；questionnaire=具名收件人+明确决策回收；TDD pointer=已发生 seam 词汇缺失失败且 WP-07 已双端可达。

### WP-02 — H1 最小危险 resolver 隔离

- **Owner:** `work-agent` 在 PREP 只生成枚举 slot descriptor 与 fail-closed stub；独立 `oracle` 在 H1 前冻结/攻击 payload。H1 后只有 WP-00 TCB 内已冻结 executor 能执行，另一个 fresh `oracle` 从 route 和 direct discovery 穿透；Luca 唯一批准 H1，candidate producer 不持有 approval writer。
- **CWD:** PREP/product verifier=`transaction-checkout`；H1 executor/independent verifier由 TCB 从 envelope 的 target/receipt directory FDs 操作，不使用 ambient cwd。
- **Files:** DEV-WP-02-PREP 明确拥有 transaction checkout 的 `scripts/evolution/prepare-resolver-containment.mjs`、product `verify-containment-plan.mjs`、product `verify-route-containment.mjs`，并只在 transaction/audit receipt root 产 `WP-02/containment-descriptor.json` 与冻结 fail-closed stub；这些 product receipts 不可信。WP-00 TCB 独立拥有 `contain-resolver.mjs`、`verify-route-containment-independent.mjs`/PREP verifier和 human-gate recorder，candidate不可写。H1 后 executor 才写 transaction quarantine和两个 global discovery target；不编辑 repo route map/hook。
- **Inputs:** `CTRL-2884996e7795`、`CTRL-2ccc7c745c06`、`CTRL-ac6ded4c514b`，execution-envelope SHA，contain-executor SHA，现有 Claude target inode/tree hash，当前 Codex 缺失目标事实，stub/descriptor SHA；EXEC 另需同时绑定这些精确值的 H1 approval receipt。
- **Command:** PREP entry 为 `node scripts/evolution/prepare-resolver-containment.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --slot resolving-merge-conflicts --descriptor-key h1-containment --receipt-key h1-prep-candidate`；两个不可信 product checks 逐字为 `node scripts/evolution/verify-containment-plan.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --descriptor-key h1-containment --candidate-receipt-key h1-prep-candidate-check` 与 `node scripts/evolution/verify-route-containment.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --descriptor-key h1-containment --mode candidate-preflight --harness claude --harness codex --candidate-receipt-key h1-route-candidate-check`。可信 freeze 唯一入口为 `node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/evidence-tcb/verify-route-containment-independent.mjs --mode prepare --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --descriptor-key h1-containment --executor-key contain-resolver --negative old-hash,stub-hash,target-slot,envelope,verifier-delete,verifier-swap,approval-replay --proposal-key h1-proposal --receipt-key h1-prep-freeze`。只有 `WP02_PAYLOAD_FROZEN` 后，trusted top-level bootstrap-main 收到 exact user reply 才可调用 `node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/evidence-tcb/human-gate-recorder.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --gate H1 --proposal-key h1-proposal --approval-stdin --receipt-key h1-approval`。EXEC 唯一入口为 `node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/evidence-tcb/contain-resolver.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --descriptor-key h1-containment --approval-key H1 --slot resolving-merge-conflicts --mode quarantine-stub --receipt-key h1-mutation`；product post-check逐字为 `node scripts/evolution/verify-route-containment.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --descriptor-key h1-containment --mutation-key h1-mutation --mode candidate-post --harness claude --harness codex --candidate-receipt-key h1-contained-candidate`，最终可信入口为 `node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/evidence-tcb/verify-route-containment-independent.mjs --mode verify --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --descriptor-key h1-containment --mutation-key h1-mutation --harness claude --harness codex --require-direct-stub --receipt-key h1-contained`。
- **Expected:** PREP/freeze 零 live/global mutation，删/替换两个 product script、TCB verifier、任一 hash/slot/approval replay负例非零。H1 在 payload冻结前不存在，binding必须符合 ADR-GATE-001并逐字绑定 descriptor/executor/independent-verifier/envelope/old/stub/quarantine/PREP receipt。preflight失败且尚无 mutation时返回 `BLOCKED_UNSAFE_CURRENT`；首 edge 前 state drift 零写退出。一旦首个 H1 edge 开始，executor只可 roll-forward到“两端 stub/absent + route resolves fail-closed”。旧真身仅保存于 envelope 指定、不可发现 quarantine；不得执行 abort/stage/commit/continue。
- **Receipt:** TCB-signed `h1-prep-freeze` 先绑定 producer/product+independent verifier/executor/envelope/old/stub/descriptor；native top-level user event随后生成不可替换 H1 binding；EXEC 再产每端 CAS/RENAME_SWAP intent+observed、route/direct outputs、quarantine inode 与 independent `h1-contained` receipt。
- **Rollback:** H1 没有“恢复旧危险真身”分支。未开始则保持原态并显式报警；已开始则补齐 stub/absent 安全终态。只有 WP-08+WP-14+H4b 可把 stub 原子换成安全 candidate。
- **Dependencies:** `WP00_ENV_FROZEN` + WP-05 PASS → DEV-WP-02-PREP → TEST-WP-02-PREP；其 PASS + Luca H1 → WP-02-EXEC → TEST-WP-02-EXEC。gate 不得早于 payload。

### WP-03 — `ADR-PIN-001` 项目事务与 post-success session pin

- **Owner:** `work-agent` 仅拥有 ADR 列出的 project substrate/hook/script/test 文件；`quality-gate` 运行并发与故障注入。
- **CWD:** `transaction-checkout`。
- **Files:** transaction checkout 的 `.claude/hooks/lib/project-substrate.mjs`、`.claude/hooks/route-guard.mjs`、`.claude/hooks/project-scope-guard.mjs`、`scripts/project-pin.mjs`、`scripts/project-lease.mjs`、`scripts/project.sh`、相关 tests/verifier。WP-02 不编辑这些文件；WP-04 对 shared scope-guard/test 的后续 ownership 由 exact pre-hash 交接。
- **Inputs:** `CTRL-103ad715d273`、`CTRL-5b11d4879e74`、`CTRL-a93a75d3aec6`、`CTRL-cf7ea74e1bfe`、`CTRL-d95faa1f617e`，project fixtures，旧 pin/link tuple，ADR-PIN-001。
- **Command:** `node scripts/evolution/verify-project-substrate.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --matrix framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml --work-package WP-03 --invalid framework-audit/2026-08-09-mattpocock-handshake-cycle2/fixtures/project/invalid-names.json --compound framework-audit/2026-08-09-mattpocock-handshake-cycle2/fixtures/project/compound-switch.json --fault-every-boundary --concurrency 2 --receipt-prefix-key wp03`。
- **Expected:** guard 只接受 bare exact `switch/new`，不预写 pin；同一 owner-token lease 保护 link tuple 和 pin；所有 link/state read-back 成功后才 temp+fsync+CAS+rename+dir-fsync commit pin；任意失败完整保留旧 tuple；并发 new 只有一个 winner。
- **Receipt:** `future-receipts/WP-03/summary.json` + 每个故障边界回执，包含调用顺序、pin/link 前后 hash、lock owner/start-token、并发 winner 和负例非零退出。
- **Rollback:** 回退精确 implementation commit；活体事务失败在释放 lease 前恢复三个精确旧 link target 和旧 pin；不从共享 symlink 猜原项目，不递归删项目。
- **Dependencies:** TEST-WP-02-EXEC=`WP02_CONTAINED` + WP-05 PASS。

### WP-04 — `ADR-PATCH-001` Codex patch header/body 与写 lease

- **Owner:** `work-agent` 接收 WP-03 shared-file pre-hash 后成为 scope-guard/test 的唯一集成 owner；`oracle` 攻击 body literal、multi-file、malformed、move、symlink/race。
- **CWD:** `transaction-checkout`。
- **Files:** transaction checkout 新增 `.codex/lib/patch-targets.mjs`、`.claude/hooks/lib/project-write-lease.mjs`；修订 adapter、project-scope-guard、tests、wiring verifier；新增独立 patch verifier。与 WP-03 的 shared files 不并发写。
- **Inputs:** `CTRL-c9c6d3c99a7a`、`CTRL-cc8fd49096a7`、`CTRL-f0db46b0c5a5`，`fixtures/harness/patch-literal.patch`，真实 Codex apply_patch event，ADR-PATCH-001。
- **Command:** `node scripts/evolution/verify-patch-contract.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --matrix framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml --work-package WP-04 --fixture framework-audit/2026-08-09-mattpocock-handshake-cycle2/fixtures/harness/patch-literal.patch --real-codex --fault-every-boundary --receipt-prefix-key wp04`。
- **Expected:** adapter 不再把 `apply_patch` 冒充 Bash；只解析 `Add/Update/Delete File` control lines，每个 target 以 synthetic Write 检查；非 header 字节顺序和 hash 完全不变；任一目标被拒绝则整个 patch 拒绝；malformed/move/escape fail-closed；PostToolUse target 数与 parser 一致。
- **Receipt:** `future-receipts/WP-04/summary.json`、原 patch/body SHA、header span map、synthetic Write 决策、真 Codex native event/hash、lease inode vector 和负例。
- **Rollback:** 回退精确 adapter/parser commit；parser 无法加载时 patch fail-closed，但 Bash/只读工具仍可用；不恢复已证明不安全的全 patch body 扫描。
- **Dependencies:** WP-03 PASS + exact ownership handoff receipt。

### WP-05 — `ADR-AGENT-001` 双 harness 原生 logical roles 和签名回执

- **Owner:** `bootstrap-main` 只实现 dormant role definitions/candidate launcher/schema；现有 `quality-gate` 通过 WP-00 evidence TCB 验收。WP-05 PASS 后，后续包才可使用新 plan/work/oracle 名称。
- **CWD:** `transaction-checkout`；native child packets显式继承此 frozen cwd key 而非 parent 当前目录。
- **Files:** transaction checkout 的 Claude/Codex 四 role definitions、work-packet schema、candidate `agent-launcher.mjs`、parity/native launcher scripts；**不拥有也不得改** WP-00 evidence TCB、anchor、raw transport、TCB verifier。
- **Inputs:** WP-05 的 21 个 atoms，SRC-HARNESS roles 合同，model-routing truth source，`schemas/work-packet.schema.json`，ADR-AGENT-001，Codex CLI availability receipt。
- **Command:** `node scripts/evolution/verify-native-agent-launcher.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --matrix framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml --roles plan-agent,work-agent,oracle,quality-gate --harness claude --harness codex --negative replay,self-report,missing-role,forged-three-events,replacement-key,replacement-anchor --receipt-prefix-key wp05`；Codex stdin 必须 EOF。
- **Expected:** 精确四 logical roles；每端四个不同 native child edge；候选 launcher 伪造 launch/session/result 并自换 key/bundle 时，TCB verifier 必须拒绝。回执绑定 precommitted nonce、TCB hash、definition/work-packet/input/output/raw-transport hash、expiry；模型名只从 routing tier 投影。
- **Receipt:** 8 role receipts + 8 raw native transports + immutable WP-00 anchor + parity summary；anchor 不得来自 candidate/receipt root。
- **Rollback:** definitions/launcher 先以无 route 指向的休眠形态落地；失败只回退精确文件，保留现有 quality-gate 和 workflow-runner。
- **Dependencies:** `WP00_ENV_FROZEN`；这是所有新 logical role 的 bootstrap gate。

### WP-06 — systematic-debugging / handoff 脱敏源头修复

- **Owner:** `work-agent` 只改 envelope 的 `systematic-debugging` candidate；candidate freeze 后，独立 `oracle` 在父进程内随机生成未知 canary，`quality-gate` 扫描固定七输出面。生产者只可见公开回归 canary。
- **CWD:** `transaction-checkout`；candidate 内容只通过 `candidate-key systematic-debugging` 解析。
- **Files:** candidate tree、debug verifier、`fixtures/security/output-surfaces.json`、`implementation/deltas/WP-06.json`；不写 live target、pins、INTEGRATION-MAP。
- **Inputs:** 21 atoms、现有 shared skill/creation log/scripts、公开回归 fixture、HITL 样本、post-freeze oracle canary classes、七面 manifest SHA。
- **Command:** `node scripts/evolution/verify-debug-redaction.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --candidate-key systematic-debugging --matrix framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml --public-canaries framework-audit/2026-08-09-mattpocock-handshake-cycle2/fixtures/security/secret-canaries.json --oracle-canary-fd parent-memory --surface-manifest framework-audit/2026-08-09-mattpocock-handshake-cycle2/fixtures/security/output-surfaces.json --scan stdout,stderr,native-transcript,artifact,handoff,final,receipt-log --negative encoded,split,cross-field,receipt-self-leak --harness claude --harness codex --receipt-prefix-key wp06`。
- **Expected:** credentials/login 不捕获；env/identity 只保留键名/存在性/类别；free-text 在七面进入统一 redactor；公开和未知 canary 的原值、编码、分片、跨字段重组均不得出现；不能充分脱敏就 `BLOCKED_REDACTION`。
- **Receipt:** summary 绑定 output-surface manifest hash、全部 168 WP-06 cell receipts、每面 hash/salted commitments、双端同 tree hash；回执/log 自身也不得泄漏。
- **Rollback:** H4b 前只丢弃/隔离 candidate，不动 live。H4b 后失败由 activation DAG 原子换回旧 directory；但若旧版已证明会泄露，route 保持 `NEEDS_ADAPTATION`，不为追求可用性重新暴露。
- **Dependencies:** WP-00 + WP-05 PASS；global swap 仍需 WP-13/14/H4b。

### WP-07 — codebase-design 共享真身、嵌套引用和原生并行性

- **Owner:** `work-agent` 只处理 codebase-design candidate/refs；`oracle` 删除一个 nested ref、一个 harness target、一个 role 做负例。route/pin 只产 proposed delta，WP-12 唯一集成。
- **CWD:** `transaction-checkout`；candidate 内容只通过 `candidate-key codebase-design` 解析。
- **Files:** envelope `codebase-design` candidate 的三文件闭包、parity verifier、`implementation/deltas/WP-07.json`；不写 live symlink/catalog/pins。
- **Inputs:** WP-07 的 35 个 atoms，WP-05 roles，现有 Claude-only target，SRC-HARNESS，HEAD 的 harness-neutral 原子。
- **Command:** `node scripts/evolution/verify-codebase-parity.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --candidate-key codebase-design --matrix framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml --harness claude --harness codex --spawn-min 3 --receipt-prefix-key wp07`。
- **Expected:** canonical truth 在 `~/.agents/skills/codebase-design`，Claude 仅以 symlink 消费，Codex 直接发现；三文件闭包全部在同一 pinned tree；route 两端可达；真实派发 3+ 个约束差异的原生子 agent，只返回结果不产生副作用；不因上游去掉 vendor 字样就冒充可达性 PASS。
- **Receipt:** `future-receipts/WP-07/summary.json`、共享 tree hash、两个 link resolution、route resolution、nested refs hash、3+ native role receipts 和结果输出 hash。
- **Rollback:** H4b 前不动 live Claude target；失败则保留现有 Claude-only 版本但将 Codex 能力继续标为不可用，不伪造对等。H4b 后用 activation 精确换回原 target/link。
- **Dependencies:** WP-05 PASS；global activation 需 WP-13/14 + H4b。

### WP-08 — resolving-merge-conflicts 安全意图适配

- **Owner:** `work-agent` 只在隔离 candidate 内改写 resolver；`oracle` 构造 merge/rebase/modify-delete/rename 冲突和用户拒绝高风险步骤的反例；H1 stub 在 H4b 前不解除。
- **CWD:** `transaction-checkout`；candidate 内容只通过 `candidate-key resolving-merge-conflicts` 解析。
- **Files:** envelope `resolving-merge-conflicts` candidate、safe-resolver verifier、冲突 fixture repos、`implementation/deltas/WP-08.json`；WP-02 stub 与 live route 在 H4b 前不解除。
- **Inputs:** WP-08 的 12 个 adopted atoms，WP-02 quarantine，旧 resolver tree，两侧 commit/PR/issue 一手证据，用户批准合同。
- **Command:** `node scripts/evolution/verify-safe-resolver.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --candidate-key resolving-merge-conflicts --matrix framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml --harness claude --harness codex --fixture-set merge,rebase,modify-delete,rename --deny-auto abort,stage,commit,continue --receipt-prefix-key wp08`。
- **Expected:** 保留 inspect conflict state、溯源双方一手意图、不发明行为、解到 underlying goal、保留已有正常行为、记录 tradeoff、运行相关检查、修复解决引入失败；将“never abort”改为“不自动 abort，由用户选择”，将 stage/commit/continue 改为预览精确文件或命令后的单步人类门；禁止 `git add .`、`git add -A`、自动 commit/rebase continue。
- **Receipt:** `future-receipts/WP-08/summary.json`、每个 fixture 的 pre/post Git predicate、被改文件精确列表、用户门回执、检查输出、Claude/Codex 同 tree hash。
- **Rollback:** 候选失败继续保持 WP-02 quarantine，不回到危险旧技能。H4b 后失败首先 route gate close，再原子换回 quarantine stub，保留冲突 repo 用户字节。
- **Dependencies:** TEST-WP-02-EXEC=`WP02_CONTAINED` + WP-05 PASS；global activation 需 WP-13/14 + H4b。

### WP-09 — teach 的个人范围例外与专用写根

- **Owner:** `work-agent` 只处理 personal teach candidate；`quality-gate` 分别验证 Claude 可用与 Codex 项目面不可达；不为追求形式对称而强行添加 Codex route。
- **CWD:** `transaction-checkout`；personal root 只通过 `candidate-key teach` 解析。
- **Files:** envelope `teach` candidate、专用 fixture write root、scope verifier、`implementation/deltas/WP-09.json`；禁止 `.agents/skills/teach`、project route/Codex pointer；不写 live pins。
- **Inputs:** WP-09 的 35 个 atoms，当前 personal install，显式 user-invoked scope，teach/Codex 128 个 N/A 单元的 no-route 命令。
- **Command:** `node scripts/evolution/verify-teach-scope.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --candidate-key teach --matrix framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml --write-root-key teach-fixture-root --assert-no-codex-route --assert-no-project-write --receipt-prefix-key wp09`。
- **Expected:** Claude 只在用户明确调用时运行，任何 lesson/course/resource 只能在 canonical teach root；当前目录、`/Users/luca/Desktop/项目/X/docs/`、framework checkout 和活跃项目都不被当默认写根；Codex 不存在 project route/symlink/automatic trigger，因此 N/A 是可机械证明的意图范围，不是适配失败。
- **Receipt:** `future-receipts/WP-09/summary.json`、Claude 直呼与写根 inode/hash、越界写拒绝、Codex catalog/route/symlink absence proof、128 N/A cell receipts。
- **Rollback:** H4b 前不动 personal live install；若候选失败则丢弃候选并保持现有版本暂时不变。H4b 后按精确 tree swap 恢复，不删除已有 lesson 数据。
- **Dependencies:** WP-03 + WP-05 PASS；global activation 需 WP-13/14/H4b。

### WP-10 — 单一 skill-authoring doctrine 与 questionnaire 延迟门

- **Owner:** `work-agent` 只修改 doctrine/pointers/gap 数据；`oracle` 搜索重复语义、断开 Claude 或 Codex 指针并验证 checker 会咬。
- **CWD:** `transaction-checkout`。
- **Files:** transaction checkout 的 `skill-authoring.md` SSOT、CLAUDE/AGENTS/FUSION 短指针、questionnaire proposed gap delta、doctrine verifier。WP-13 后续只拥有 FUSION activation 段，接收本包 exact pre-hash。
- **Inputs:** WP-10 的 42 个 atoms，现有 `skill-authoring.md`，HEAD 三个 ADAPT 原子，questionnaire 八个 DEFER 原子，Luca 新增的 AGENTS 一级路由表。
- **Command:** `node scripts/evolution/verify-authoring-doctrine.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --matrix framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml --ssot .claude/skill-os/skill-authoring.md --pointer CLAUDE.md --pointer AGENTS.md --pointer .claude/skill-os/evolution/FUSION-RUNBOOK.md --assert-questionnaire-deferred --receipt-prefix-key wp10`。
- **Expected:** 新增三个狭原则：写作合同覆盖所有 agent-consumed docs；廉价可检查事实以 environment/runtime 为 SSOT；只缓存重获成本高且稳定的事实。语义只出现在 SSOT，三个消费面是指针。Questionnaire 仅更新 gap：首个具名收件人+明确回收目标才重访，届时输出必须落 pinned project；本包不新增 skill/command/route。
- **Receipt:** `future-receipts/WP-10/summary.json`、SSOT/pointer hashes、语义重复搜索、Claude/Codex retrieval probe、questionnaire zero-surface diff。
- **Rollback:** 回退精确 doctrine/pointer/gap 行；不改 Luca 新增的 AGENTS route table、muse 7-tool contract 或 sidebar selection 规则。
- **Dependencies:** WP-05 PASS。

### WP-11 — 197 adopted atoms 回归、TDD 指针和漂移 pin

- **Owner:** `work-agent` 只修改 envelope `tdd` candidate；其它 candidate 完全只读。独立 `quality-gate` 按 atom matrix 聚合，不按 skill 名计数。
- **CWD:** `transaction-checkout`；tdd 只通过 `candidate-key tdd` 解析。
- **Files:** tdd candidate、atom verifier、`implementation/deltas/WP-11.json`；不写 pins/adoption log，不修改 WP-06..10 trees。
- **Inputs:** atomic manifest N=197，WP-11 的 71 个 atoms，其它 WP 的 126 adopted atoms，当前 tdd tree，`MATT-bbde2783e7c4`。
- **Command:** `node scripts/evolution/verify-atom-behavior.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --candidate-key tdd --manifest framework-audit/2026-08-09-mattpocock-handshake-cycle2/atomic-manifest.yaml --decisions framework-audit/2026-08-09-mattpocock-handshake-cycle2/decision-map.json --matrix framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml --all-adopted --harness claude --harness codex --negative-bite --receipt-prefix-key wp11`。
- **Expected:** 197/197 有可观测 T/E/D/V 或唯一已证明的 teach/Codex scope exception；任一 nested ref/pin/route/behavior 删除使 checker 失败；TDD 的 `refactor-outside-red-green` 不再指向不存在的 `code-review`，而指向本地 `code-hygiene` 的 post-green review/cleanup；HEAD 的 interface-vocabulary pointer 仍 DEFER。
- **Receipt:** `future-receipts/WP-11/adopted-summary.json` 包含 197 ordered IDs、每原子两端回执索引、pin/tree hashes、TDD pointer proof 和负例咬合结果。
- **Rollback:** H4b 前 global candidate 不进 live；repo-only pointer 修正也只通过精确 commit 回退。H4b 后按 activation DAG 交换旧 tree，并将相应 atoms 重新标为 BLOCKED，不保留假绿回执。
- **Dependencies:** WP-06 + WP-07 + WP-08 + WP-09 + WP-10 candidate freeze PASS；global activation 需 WP-13/14/H4b。

### WP-12 — route/catalog/registration/nested-reference 双端闭包

- **Owner:** `work-agent` 是 transaction checkout 登记面的唯一 integration owner；能力包只交 proposed deltas。`oracle` 每面删除/替换变异；`quality-gate` 跑纯 Claude、纯 Codex、污染环境。
- **CWD:** `transaction-checkout`。
- **Files:** transaction route/catalog/commands/input/model/agents/checkers；Luca 的 AGENTS/muse/spool/S4 为 protected baseline，只允许必要短指针且必须语义/hash 守卫。输出 exact commit-A dormant manifest、commit-B route/pin/pending-row manifest、commit-C governance manifest proposal；B rows 只携带 frozen transaction ID + route-epoch ID，不嵌入 B OID 或 route-file hash；本包不切 live。
- **Inputs:** WP-12 的 13 个 atoms，WP-05/06/07/08/09/10/11 冻结 targets，Luca 已更新的 AGENTS 路由表，当前 S4 “所有 hook group additionalContextLimit=0”规则。
- **Command:** `node scripts/evolution/verify-route-registration.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --matrix framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml --harness claude --harness codex --hermetic --mutate-each-surface --protect luca-agents-route,muse-seven-tools,sidebar-selection,exact-session-spool,s4-all-groups,framework --receipt-prefix-key wp12`；随后在 transaction checkout 运行 registration/routing/agent/Codex wiring checkers。
- **Expected:** checker 不再只枚举“带 invoke 的第一层 office skill”；它从 route/commands/tables/model/input/agents/global-target/nested-reference manifests 闭包全部消费面；两端解析到同一语义真身，只有 native syntax/role adapter 不同；环境污染测试显式隔离 `CODEX_*` 与 `LUCA_ACTUAL_HARNESS`，不把 ambient Codex 变量当 Claude 失败；S4 仍遍历每个 hook group；B tree 扫描必须证明不存在 `commit_b_oid`/完整 route hash 自引用字段。
- **Receipt:** `future-receipts/WP-12/summary.json`、全登记闭包列表、Claude/Codex 解析 hash、每个 mutation 的预期失败、hermetic env manifest、现有 AGENTS/muse/S4 不变 hash。
- **Rollback:** 只回退本包添加的登记行/checker；不删 Luca 已更新的一级表、sidebar tool contract 或 S4 多 group 检查。任一端回退后不对称就将对应 route 关闭，不单端假激活。
- **Dependencies:** WP-01 + WP-04 + WP-11 PASS。

### WP-13 — `ADR-ACT-001` 激活事务的未来实现包

- **Owner:** `work-agent` 在 transaction checkout 完成 BUILD 与 product verifiers；独立 macOS-security `oracle` 审 source/compiled transition table，现有 `quality-gate` 只信 WP-00 TCB 内、candidate 不可写的 `verify-activation-build-independent.mjs` 对 raw Git/descriptor bytes 的复算。只有 Luca H4a 后，冻结 broker 才在隔离 APFS fixture 跑 NATIVE；H4b 另用 production descriptor，仍单独保留。
- **CWD:** BUILD/H4a launcher=`transaction-checkout`；root broker不接受 cwd，全部资源从 root-owned descriptor FDs 解析。
- **Files:** FUSION activation 段、activation supervisor/broker/atomic-swap/drop-exec/guardian/recover、product `scripts/evolution/verify-activation-build.mjs` 与 `scripts/verify-activation-r6.mjs`、R6 journal schema、synthetic-only `fixtures/h4a-r6.json`、`future-receipts/H4a/proposal.json`/`approval-binding.json`、外置 `future-receipts/H4b/cutover-descriptor.json`、route quarantine/gate slot、exact commit R/A/B/C manifests。WP-00 evidence TCB 另有独立 build/native oracle与human-gate recorder，candidate/child 无写权；当前 audit R2 schema/verifier 只属审计脚手架，不可作 native proof。
- **Inputs:** SRC-ARCH exact SHA、execution envelope、WP-03/04/05/12 hashes、global old inode/tree、observed R OID，commit A/B/C OID+tree+parent+exact allowed path/action/before-after manifests，B complete route path/SHA，frozen forward/compensation DAG，APFS/launchd/root capability。H4a synthetic descriptor 禁含 canonical/global targets 与 R/A/B/C；H4b descriptor 才含真实 target tuple。
- **Command:** BUILD candidate entry：`node scripts/evolution/verify-activation-build.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --architecture framework-audit/2026-08-09-mattpocock-handshake-cycle2/architecture-decisions.md --descriptor-key h4a-spike --assert-commit-manifests R,A,B,C --receipt-key wp13-build-candidate`。可信 STATIC gate只由 WP-00 TCB independent verifier对 raw bytes运行：`node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/evidence-tcb/verify-activation-build-independent.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --descriptor-key h4a-spike --assert-parent-chain R,A,B,C --negative b-self-reference,b-oid-swap,route-byte-swap,transaction-epoch-swap,abc-parent-swap,abc-tree-swap,manifest-omission,manifest-duplicate,manifest-reorder,manifest-bleed,h4a-binding-swap,envelope-swap,verifier-swap,signer-swap,summary-swap --proposal-key h4a-proposal --receipt-key wp13-build-gate`；只有它可发 `WP13_BUILD_FROZEN`。随后必须停下；trusted top-level bootstrap-main 收到 exact `APPROVE H4a ...` 后唯一调用 `node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/evidence-tcb/human-gate-recorder.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --gate H4a --proposal-key h4a-proposal --approval-stdin --receipt-key h4a-approval` 形成 binding。H4a 后 exact native entry只有两条：`node scripts/evolution-activate.mjs --mode spike --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --approval-key H4a --descriptor-key h4a-spike --fault-matrix guardian-lifetime,partial-b-route-gate,partial-c-governance,terminal-publication --receipt-key wp13-r6`；`node scripts/verify-activation-r6.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --approval-key H4a --descriptor-key h4a-spike --receipt-key wp13-r6`。
- **Expected:** BUILD product verifier只产不可信 candidate receipt；独立 STATIC gate从 raw bytes证明 `parent(A)=R,parent(B)=A,parent(C)=B`、四个 OID/tree、逐阶段 exact path/action/hash manifest、B无自引用且 complete route-file hash可外置绑定、C不含 route/pin/target/executable并只写 transaction/public-bundle logical name（不写未来 payload root/hash）。H4a proposal在所有 payload冻结后产生，binding必须符合 ADR-GATE-001并外置绑定 Plan/ADR/envelope/BUILD-gate SHA、transaction、synthetic descriptor、binary/config/schema/compiled-transition/drop-exec/guardian/product+independent verifier hashes、approved broker fingerprint、fixture device/inodes、exact fault matrix、nonce/expiry；不得绑定未来 native summary。两 native命令从 envelope key解析 descriptor/approval/receipt roots，任一 replacement user-event/envelope/binding/descriptor/signer非零。NATIVE实现唯一七态 `PREPARED → GLOBAL_STAGED → REPO_COMMITTED → GLOBAL_SWAPPED → LEDGER_COMMITTED → GOVERNANCE_COMMITTED → VERIFIED`；guardian是 launchd one-shot primary PID，`ACTOR_ARMED` durable后才 release gate，再 exec-in-place；B observed后才 open；live verify后才 C；任何补偿先 close，再 C/B/global/A；terminal唯一顺序 payload→`TERMINAL_SEALED`→public publish/fsync/unprivileged readback→key unlink/fsync。strict verifier唯一 success token `WP13_R6_NATIVE_PASS`。
- **Receipt:** candidate build receipt不可信；TCB-signed `wp13-build-gate` 才是 BUILD 绿灯；H4a approval binding；`guardian-lifetime`、`partial-b-route-gate`、`partial-c-governance`、`terminal-publication`、`wp13-r6-summary` 五份 signed receipts，绑定 synthetic descriptor 与 approved broker fingerprint。H4b 只要求 binary/config/schema/compiled-transition/drop-exec/guardian/verifier hashes 与 H4a summary相同，production descriptor 本身必须不同。
- **Rollback:** BUILD 失败丢弃 private commit manifests。H4a spike 失败不提供 H4b；休眠 broker 只按 H4a 卡所列 exact uninstall 回退。H4b journal 只补偿 observed edges，首边 close，随后 C/B/global/A；partial B/C 保留人工第三态，不猜修。
- **Dependencies:** `G_REVIEW_R_OBSERVED` + WP-03 + WP-04 + WP-05 + WP-12 PASS → DEV-WP-13-BUILD → TEST-WP-13-STATIC=`WP13_BUILD_FROZEN`；该 token + ADR-GATE-001-valid H4a binding → WP-13-NATIVE PASS。H4a 不依赖未来 summary；H4b 才绑定 summary。H3 不要求这些未来命令已运行。

### WP-14 — 321 原子隔离双 harness 全量验收

- **Owner:** `plan-agent` 只生成四分法 work packets；Claude/Codex `work-agent` 分开执行；两端 `oracle` 跑 degrade 负例；新的 `quality-gate` 仅汇总回执不修 candidate。
- **CWD:** `transaction-checkout`；每个 native work packet绑定相同 cwd key/HEAD/tree。
- **Files:** 隔离 transaction checkout/HOME、`future-receipts/atoms/`、`future-receipts/roles/`、`future-receipts/WP-14/acceptance-summary.json`，`scripts/evolution/run-cycle2-acceptance.mjs`；live/global/canonical checkout 不改。
- **Inputs:** execution envelope、冻结 candidate trees/commit A/B/C、321 decisions、2,568-cell matrix、WP-05 TCB-bound roles、envelope key `wp13-r6-summary` 指向的 WP-13 R6 native summary。
- **Command:** `node scripts/evolution/run-cycle2-acceptance.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --decisions framework-audit/2026-08-09-mattpocock-handshake-cycle2/decision-map.json --manifest framework-audit/2026-08-09-mattpocock-handshake-cycle2/atomic-manifest.yaml --matrix framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml --require-wp13-summary-key wp13-r6-summary --harness claude --harness codex --phase trigger,execute,degrade,verify --fresh-native-roles --receipt-key wp14-acceptance`。
- **Expected:** summary key必须在 envelope receipt map 内 canonicalize到同一 frozen receipt-root，且绑定 `WP13_R6_NATIVE_PASS`/H4a descriptor/signer；summary-key/path/envelope substitution非零。随后321/321 rows，2,568/2,568 cells，2,568个唯一 atom receipt + 8个 role receipts；status不得从 PLANNED/BLOCKED_CURRENT/DECISION_GATED直接改为 PASS，只有真命令和原生日志可改；DEFER/REJECT/HEAD KEEP必须证明 zero-new-surface；N/A仅 teach/Codex 128格且每格实际跑 no-project-route。
- **Receipt:** `future-receipts/WP-14/acceptance-summary.json` 绑定 candidate commit/tree、所有单元回执 hash、四角色 native edges、运行时环境、时间/过期、零漏项证明和独立 quality-gate 结论。
- **Rollback:** 本 WP 在隔离面运行；任一失败冻结 candidate 和证据为 BLOCKED，不切换 live。隔离产物保留在 transaction quarantine 供审计，不使用广泛清理。
- **Dependencies:** WP-01..WP-12 PASS + WP-13-BUILD + H4a + `WP13_R6_NATIVE_PASS`；缺 native proof 时 BLOCKED，不降级静态验收。

### WP-15 — H4 人类门后的受治理 landing 与最终记录

- **Owner:** root broker 只执行 H4b frozen descriptor；`work-agent` 不持有 root/control channel；两端 native `quality-gate` 完成 live verification；Luca 独立批准 H4a/H4b 和任何 commit/push。
- **CWD:** launcher=`transaction-checkout`；broker内部无 ambient cwd，所有 repo/global/public资源由 H4b descriptor-relative FDs 指定。
- **Files:** private exact commits R/A/B/C、外置 `future-receipts/H4b/cutover-descriptor.json`、`proposal.json`、human `approval-binding.json`、root activation gate/journal/public bundle、global candidates/backups；descriptor/approval/gate bytes全在 R/A/B/C trees外。A=implementation/gate substrate，B=route + installed pins + `pending_live_verification` row，C=final ADOPTED/adoption/CHANGELOG only。benchmark/vetting review truth来自独立 commit R；C不改 route/pin/target/executable，也不写未来 terminal payload root/bundle hash。
- **Inputs:** H4a verified summary、`G_REVIEW_R_OBSERVED`、WP-14 PASS；production descriptor 外置绑定 `parent(A)=R,parent(B)=A,parent(C)=B`、每个 OID+tree、A/B/C exact allowed-path/action/before-after manifests、B complete route path/SHA、old/global inode trees、binary/config/schema/compiled-transition/drop-exec/guardian/verifier hashes、broker fingerprint与 forward/reverse DAG。root gate 单向绑定 transaction+epoch+B OID+route path/SHA+cutover-descriptor SHA；descriptor 不含最终 gate-file hash，杜绝 descriptor↔gate fixed point。
- **Command:** WP-14 PASS后先由 WP-00 TCB independent verifier `node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/evidence-tcb/verify-activation-build-independent.mjs --mode prepare-h4b --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --descriptor-key h4b-cutover --summary-key wp13-r6-summary --acceptance-key wp14-acceptance --proposal-key h4b-proposal --receipt-key h4b-prep` 冻结 proposal并停下；只有 trusted top-level bootstrap-main 收到 exact `APPROVE H4b ...` 后调用 `node framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/evidence-tcb/human-gate-recorder.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --gate H4b --proposal-key h4b-proposal --approval-stdin --receipt-key h4b-approval` 才生成 binding。cutover唯一入口为 `node scripts/evolution-activate.mjs --mode cutover --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --approval-key H4b --descriptor-key h4b-cutover --expected-state PREPARED --receipt-key wp15`；broker只从 envelope枚举 key解析 approval/descriptor/receipt，内部执行 fresh live registration/parity/Codex wiring和 WP-14 verify phase，外部不再拼自由参数。
- **Expected:** H4b proposal只在 H4a summary/WP-14/R-A-B-C/production descriptor全冻结后产生；binding必须符合 ADR-GATE-001并精确核 production descriptor SHA、H4a summary、R/A/B/C chain/tree/manifests与 gate tuple。H4a和H4b descriptor必须不同，而受测 binary/config/schema/compiled transition/guardian/drop-exec/verifier hashes必须相同。伪/重放 user event或任一 parent/tree/path/action/before-after/B OID/route byte/descriptor/gate/envelope substitution在首写前失败。A observed→global swaps while gate CLOSED→B observed→external gate OPEN→fresh Claude/Codex verify→C observed=`GOVERNANCE_COMMITTED`→`VERIFIED`→sealed public bundle。VERIFIED后零 repo/global/governance写；无自动 push。
- **Receipt:** landing summary + immutable journal + unprivileged-readable sealed bundle + fresh live receipts + R/A/B/C OID/tree/parent与逐文件 before/after hashes + external descriptor/gate identity。
- **Rollback:** journal 首先 `ROUTE_GATE_CLOSE`；再 exact observed C、B、global swaps、A。partial B/C 只在 gate 可证关闭后保留第三态；不删用户产物、不猜 Git 修复。回滚结果写入 sealed bundle；不在 terminal seal 外追加治理写。
- **Dependencies:** `G_REVIEW_R_OBSERVED` + WP-14 PASS + Luca H4b；H4b binding 必须引用已通过的 H4a R6 summary 和 exact A/B/C。

## 6. DEV / TEST 双任务矩阵

每行 DEV 和 TEST 必须由不同 session 执行；TEST 只读 candidate 或在专用 fixture 变异，不修生产者文件。命令细节以对应 WP 的 `Command` 为唯一源，表中不得用“自行测试”代替。

| WP | DEV task / owner / output | TEST task / independent owner / assertions | Green token |
|---|---|---|---|
| 00 | `DEV-WP-00-BOOTSTRAP` bootstrap-main：OS-anchored audit-local executor/schema/secure writer/key manifest/recorder；`DEV-WP-00-PREP`：immutable envelope/roots/H0 proposal；H0 后 frozen executor ALIGN | `TEST-WP-00-BOOTSTRAP` existing quality-gate：anchor+bundle/member substitution、source symlink/nlink/path swap、每层 FD/parent-swap/final readback、伪/重放 human reply；`TEST-WP-00-PREP`：A-001/002/018/020、8 类 cross-artifact + key exact-set；`TEST-WP-00-ALIGN`：exact post HEAD/tree | `WP00_PREP_FROZEN` → `WP00_ENV_FROZEN` |
| 01 | `DEV-WP-01` work-agent：review ledger/deltas/exact R | `TEST-WP-01` oracle：A-002/003/019，复算 74 与 zero-surface；G-REVIEW proposal/reply/binding/result substitution；TCB 独立读回 R | `WP01_REVIEW_PASS` → `G_REVIEW_R_OBSERVED` |
| 02 | `DEV-WP-02-PREP` work-agent：descriptor/stub/old predicates与两 product verifier（零 live 写）；H1 后 `DEV-WP-02-EXEC` 仅指 frozen TCB executor edge | `TEST-WP-02-PREP` oracle：删/换 producer、两 product verifier、TCB verifier、hash/slot/old-state/human reply replay；H1 后 fresh `TEST-WP-02-EXEC`：A-004 pre-edge/partial-edge/direct discovery | `WP02_PAYLOAD_FROZEN` → `WP02_CONTAINED` |
| 03 | `DEV-WP-03` work-agent：project transaction/pin | `TEST-WP-03` quality-gate：A-005，every-boundary + concurrency | `WP03_PIN_PASS` |
| 04 | `DEV-WP-04` work-agent：patch parser/lease | `TEST-WP-04` oracle：A-006，header/body/move/symlink/race | `WP04_PATCH_PASS` |
| 05 | `DEV-WP-05` bootstrap-main：dormant roles/launcher/schema | `TEST-WP-05` existing quality-gate via TCB：A-007，伪三事件/自换 key/anchor 必败 | `WP05_NATIVE_ROLES_PASS` |
| 06 | `DEV-WP-06` work-agent：redactor candidate | `TEST-WP-06` oracle+quality-gate：A-008，post-freeze secrets × 7 surfaces | `WP06_REDACTION_PASS` |
| 07 | `DEV-WP-07` work-agent：codebase-design candidate | `TEST-WP-07` oracle：A-009，删 target/ref/role mutations | `WP07_PARITY_PASS` |
| 08 | `DEV-WP-08` work-agent：safe resolver candidate | `TEST-WP-08` oracle：A-010，4 repo types + 用户拒绝门 | `WP08_RESOLVER_PASS` |
| 09 | `DEV-WP-09` work-agent：personal teach candidate | `TEST-WP-09` quality-gate：A-011，Claude scope + 128 Codex no-route cells | `WP09_SCOPE_PASS` |
| 10 | `DEV-WP-10` work-agent：doctrine/pointers/gap | `TEST-WP-10` oracle：A-012，重复语义/断指针/zero-surface | `WP10_DOCTRINE_PASS` |
| 11 | `DEV-WP-11` work-agent：tdd pointer + adopted aggregator | `TEST-WP-11` quality-gate：A-013，197 exact set + per-atom negative | `WP11_ADOPTED_PASS` |
| 12 | `DEV-WP-12` work-agent：registration integration/manifests | `TEST-WP-12` oracle+quality-gate：A-014/020，三环境+逐面 mutation | `WP12_REGISTRATION_PASS` |
| 13 | `DEV-WP-13-BUILD` work-agent：R6 source/product verifiers/R-A-B-C manifests/synthetic descriptor；candidate receipt不可信 | `TEST-WP-13-STATIC` 用 WP-00 TCB independent verifier复算 parent/tree/path与 15 类 substitution/manifest负例，唯一发 `WP13_BUILD_FROZEN`；H4a exact reply/binding substitution；H4a 后 `TEST-WP-13-NATIVE` fresh quality-gate 跑 exact spike | `WP13_BUILD_FROZEN` → `WP13_R6_NATIVE_PASS` |
| 14 | `DEV-WP-14` plan-agent：materialize 2,568 work packets，不执行/修 candidate | `TEST-WP-14` 两端 work/oracle + fresh quality-gate：A-016/020；`wp13-r6-summary` key/path/envelope substitution | `WP14_2568_PASS` |
| 15 | `DEV-WP-15` root broker：只执行 frozen H4b descriptor | `TEST-WP-15` fresh dual quality-gate + public verifier：A-017/019；H4b exact reply/binding replay与 production descriptor substitution | `WP15_VERIFIED_SEALED` |

## 7. 文件 ownership 与治理状态机

### 7.1 共享文件只有顺序 ownership，不并发写

| Surface | 写入 epoch | 交接约束 |
|---|---|---|
| `route-guard.mjs` | WP-03 project logic → WP-13 commit-A activation epoch | WP-13 输入必须等于 WP-03 post-hash；WP-12 只给 route delta，不并发编辑。 |
| `project-scope-guard.mjs` + tests | WP-03 → WP-04 final integration | WP-04 receipt 记录 pre-hash，并完整重跑 WP-03 回归。 |
| `skill-routing-map.yaml` | WP-12 生成 dormant/pending manifest → WP-13 原样物化 B | WP-13 不做语义改写；hash 不等即退回 WP-12。 |
| FUSION runbook | WP-10 doctrine pointer → WP-13 activation 段 | 不同 heading/hunk；交接 hash + doctrine regression。 |
| candidate trees | WP-06/07/08/09/11 各自单 owner | WP-11 对其它 trees 只读；WP-12 只消费 frozen hashes。 |
| pins/adoption/ADOPTED/CHANGELOG | WP-12 提议 → WP-13 freeze A/B/C → WP-15 broker应用 | 其它 WP 只能写 `implementation/deltas/`，不能碰 live truth。 |

### 7.2 逐文件治理 transition

| 文件/事实 | REVIEWED / candidate | commit A | commit B (`LEDGER_COMMITTED`) | commit C (`GOVERNANCE_COMMITTED`) | VERIFIED 后 |
|---|---|---|---|---|---|
| decision ledger / benchmark / vetting / gaps | WP-01 proposed exact commit R；`84fdef...` 表示 reviewed | G-REVIEW 独立落 R，A 不再改这些文件 | 不变 | 不变 | 零写 |
| capability deltas / INTEGRATION-MAP | WP-06..12 proposed/frozen | dormant implementation + mapping | 不变 | 不变 | 零写 |
| route map / activation gate schema | proposed closed rows；rows 只含 transaction/epoch | dispatcher/gate substrate，route 默认 deny | B authored 后 production descriptor 绑定 exact B OID + complete route-file SHA；descriptor SHA 算出后 gate 再单向绑定 descriptor SHA/txn/epoch/B/route，descriptor 不含 gate-file hash；gate CLOSED，B observed 后单独 OPEN | 不变 | 零写 |
| installed-pins | proposed path/domain/hash | 不变 | global swap 已 observed 后写真实 installed pin；状态不等于 verified adoption | 不变 | 零写 |
| adoption-log | proposed transaction row | 不变 | `pending_live_verification`，不得写 success | exact final record，指向预定 public-bundle transaction ID | 零写 |
| `ADOPTED.md` / `CHANGELOG.md` | proposed C bytes | 不变 | 不变 | fresh live receipts 后应用 exact C | 零写 |

失败补偿唯一为：可能 open 时先 `ROUTE_GATE_CLOSE`；observed C revert；observed B revert；global `RENAME_SWAP` back；A compensate。benchmark 的“已评审”事实不因 adoption 失败伪装成“没评过”，只追加 superseded/reverted review history。terminal bundle 一旦 seal，任何治理写都非法。

## 8. 阶段绿灯、停止条件与范围

| Phase | 工作包 | 绿灯 | 失败终态 |
|---|---|---|---|
| P0 | WP-00 BOOTSTRAP/PREP + H0/ALIGN(若需) + WP-05 + WP-01 + G-REVIEW | OS anchor、pre-H0 envelope/TCB、post-H0 ready、roles、review-only R 全冻结并独立读回=`G_REVIEW_R_OBSERVED` | `BLOCKED_SOURCE_IDENTITY`/`BLOCKED_HUMAN_CHANNEL`/`BLOCKED_ALIGNMENT`/`BLOCKED_TCB`，零 runtime/global；H0 前零 checkout mutation |
| P1 | WP-02-PREP + H1 + WP-02-EXEC/VERIFY | payload 先冻结；H1 后 resolver 两端只达 stub/absent | 未开始=`BLOCKED_UNSAFE_CURRENT`；已开始只 roll-forward safe |
| P2 | WP-03/04 | pin/patch every-boundary 负例全咬 | 回退 private candidate，不碰 live |
| P3 | WP-06..11 | 各 capability candidate 与 adopted regression 全绿 | 隔离/quarantine；live 不交换 |
| P4 | WP-12 | 双端 registration closure + protected baseline | route manifest 保持 CLOSED |
| P5a | WP-13-BUILD | independent TCB 复算后 `WP13_BUILD_FROZEN`；H4a synthetic descriptor 与 future H4b production descriptor 分离 | 不得请求 H4a |
| P5b | H4a + WP-13-NATIVE | `WP13_R6_NATIVE_PASS` + 5 receipts | 不得请求 WP-14/H4b |
| P6 | WP-14 | 321/321、2,568/2,568、8 TCB-bound roles | frozen BLOCKED，不切 live |
| P7 | H4b + WP-15 | `WP15_VERIFIED_SEALED` + public bundle | journal reverse DAG，绝不 broad reset |

硬停止：上游越过 `84fdef...` 未重审；framework 重叠面变化；checkout CWD key/path/device/inode/HEAD/tree 不符或 owned path 有用户 dirty overlap；OS anchor/script/source-bundle/decision/matrix/manifest/hash 不符，任一 source 非 exclusive regular file、出现 symlink ancestor/inode alias/parent swap；execution-key-manifest 缺 key/重复/越根/运行期扩容；TCB anchor/recorder/secure writer 可被 candidate 写；harness 无独立新顶层 user turn=`BLOCKED_HUMAN_CHANNEL`；任一 role/BUILD verifier 只能自述；KEEP/DEFER/REJECT 出现新 surface；未知 canary 泄漏；APFS/launchd/root/UID-GID-FD/fault matrix 不可真实运行；H0/G-REVIEW/H1/H4a/H4b proposal 未先冻结或 reply/binding 缺失、过期、hash 不符；H4a/H4b descriptor混用；R/A/B/C parent/tree/path manifest不符；C 不是纯治理 bytes；VERIFIED 后仍有写。

计划允许改：project pin/patch/roles/registration/doctrine/activation substrate；四个 shared skill candidates；Claude-only teach；review/pin/adoption governance。明确不动：`framework/`、任一产品项目 `/Users/luca/Desktop/项目/X/docs/`、用户 dirty/untracked、muse 7-tool/sidebar、AGENTS 新路由表、exact-session spool、S4 all groups、所有被 DEFER/REJECT 家族的 route/skill/command。

残余风险不包装成解决：另一 checkout 仍滞后，未来先等 H0；Codex live probe 只证明 CLI；logical roles、R6 broker、native crash proof 都是未来 WP；human gate 对 trusted top-level main 不是密码学防伪，只防 child/candidate replay与 payload drift；teach/Codex 128-cell 非对称是明确个人范围；H1 以短期不可用换取不再自动 stage/commit。任何一项未过只说明执行尚未完成，不反向污染 H3 对 Plan 本身的判断。

## 9. 321 原子工作包覆盖

下列 ID 是执行索引；每个 ID 的决策原因和原子级命令分别以 `decision-map.json` 和 `harness-matrix.yaml` 为唯一真源。列表必须与决策表 321/321 精确相等，不得用本节的紧凑排版代替详细行。

#### WP-01 atom coverage (56)

MATT-0f394f53d5d7 · MATT-0f66ea53c99a · MATT-14788bc00c7c · MATT-14aa6fda7115 · MATT-17a0ed5e3b83 · MATT-1926a447c911 · MATT-1ea3663314a9 · MATT-1eb663064749 · MATT-1ef0003875bf · MATT-28d950692bef · MATT-2d330e7516fe · MATT-3032fe812104 · MATT-32a587e2ae16 · MATT-3359aa28ff1a · MATT-3601e39b1222 · MATT-36a37a56c05b · MATT-3e8939104418 · MATT-4df741edbd67 · MATT-4ef75cf060d9 · MATT-5ae242a1e7a3 · MATT-63cf1a43166c · MATT-68dd81ed3614 · MATT-69c03fa3848c · MATT-759e33cc418f · MATT-764808dd085a · MATT-768dcd6a9f31 · MATT-7e6c82da4918 · MATT-7fa068e58440 · MATT-826719117fa0 · MATT-83b5baf3a2a6 · MATT-864d55193e5e · MATT-875493a46768 · MATT-88bd946f2af3 · MATT-8ec2838b5cad · MATT-93c541c588be · MATT-995d533d88fa · MATT-9cd8048bc76e · MATT-9e17e436b51c · MATT-9ebf3141af1c · MATT-a624582e0135 · MATT-a9b1e31a35ad · MATT-addf618cdf4b · MATT-af30e0ed4176 · MATT-ba5ba30d55fc · MATT-cacaba6fee83 · MATT-cbc9590cf27c · MATT-cd5eca63e78c · MATT-d32e20a647b2 · MATT-d630109f0348 · MATT-df4775134f2f · MATT-dfe75cd8c7e9 · MATT-e072e08dc8b4 · MATT-e1881ecf0f86 · MATT-ec1e2352340c · MATT-ef3806a9c4af · MATT-f785c73e1ec8

#### WP-02 atom coverage (3)

CTRL-2884996e7795 · CTRL-2ccc7c745c06 · CTRL-ac6ded4c514b

#### WP-03 atom coverage (5)

CTRL-103ad715d273 · CTRL-5b11d4879e74 · CTRL-a93a75d3aec6 · CTRL-cf7ea74e1bfe · CTRL-d95faa1f617e

#### WP-04 atom coverage (3)

CTRL-c9c6d3c99a7a · CTRL-cc8fd49096a7 · CTRL-f0db46b0c5a5

#### WP-05 atom coverage (21)

MATT-18e52b5f091d · MATT-34e280addae5 · MATT-46e4365cc5af · MATT-4b054922a7d3 · MATT-67900874d64c · MATT-7adf9ea0ad31 · MATT-8c98f264c50c · MATT-9a6cb6fdaec0 · MATT-a4f566d38089 · MATT-b34b24ea1018 · MATT-c2e99e7f8524 · MATT-dddfb551b1f4 · MATT-dfba6d8951d5 · MATT-ec0ef96aa62c · CTRL-3e3c98304e25 · CTRL-65586d8b2bc5 · CTRL-6e6d427966fc · CTRL-882319381970 · CTRL-bc29ab4c40bf · CTRL-d670d4e458e2 · CTRL-ea4f00f9af5d

#### WP-06 atom coverage (21)

MATT-1101b1fc2687 · MATT-4208a8fab1df · MATT-4c87f2bc7a1f · MATT-533bb3fbd132 · MATT-56aa9571a6e3 · MATT-5dedd94dc46e · MATT-8953d6ad9a01 · MATT-8ef4dfa714d5 · MATT-e1804fa3e83d · MATT-e30ba0f32921 · MATT-e40dcb5cc0f9 · MATT-e4ca763b1b1c · CTRL-20b2d48ccba6 · CTRL-89a1d5497e1a · CTRL-8abc08b5c355 · MATT-087eaf541c55 · MATT-1cfdccc521e3 · MATT-1dea85381675 · MATT-29d6533391d8 · MATT-3fab1efa17e6 · MATT-e900d56ff86c

#### WP-07 atom coverage (35)

MATT-06baf62f40eb · MATT-0d37abd78dd2 · MATT-111a1b92627d · MATT-1407567c473c · MATT-140e7afa9788 · MATT-15485bb22446 · MATT-1ea0f91fc4a9 · MATT-28d2f29c8990 · MATT-40511a116496 · MATT-4cd3187c5fc3 · MATT-53559f445e14 · MATT-538bc022a77f · MATT-5415ba505994 · MATT-6dbcb7203d84 · MATT-73ae85a30a74 · MATT-76146c6e4949 · MATT-7a2724c2338e · MATT-84b0ef32976f · MATT-8ea4417e52b6 · MATT-942e6ab6ce59 · MATT-a274e23d48df · MATT-afe207f5f55a · MATT-b29e699b092e · MATT-c34c9bea72c0 · MATT-c67bec38d586 · MATT-d3050f8c0bfd · MATT-d3287e529dbb · MATT-d5f02709eab6 · MATT-f0faf1b7ee95 · MATT-f80bd1d84ca6 · CTRL-067857878e73 · CTRL-991da0cbe8a0 · CTRL-af483a83f399 · CTRL-f15057a6e7af · MATT-2e91f1b00c08

#### WP-08 atom coverage (12)

MATT-127daf4bf0ac · MATT-15ab6bef833e · MATT-37dc2f9c1058 · MATT-3d7d5b68dc87 · MATT-5d37af533e7b · MATT-89e00ced8a97 · MATT-97e6b49655a7 · MATT-a6cb54e9b6d2 · MATT-bbb9c3f9d57e · MATT-c0f70c5e9feb · MATT-cf58ebc6d623 · MATT-ee41891aaab5

#### WP-09 atom coverage (35)

MATT-2078085333fd · MATT-241024e11cdf · MATT-2bedc3c6fd85 · MATT-38334ef06d4d · MATT-39a072bb7b58 · MATT-39c2563e2cc1 · MATT-3e38be0f9764 · MATT-3e8a44ea488a · MATT-46596b9d7b36 · MATT-49c7fdbf5776 · MATT-5adcf9315175 · MATT-5d41ce3b389f · MATT-6ead816fdfbe · MATT-6fd379d5366d · MATT-709f14d1320a · MATT-7970347cb8d1 · MATT-8c55afe36688 · MATT-90a2d7417e80 · MATT-9ccc1540af8a · MATT-b03e58473886 · MATT-b33234f5e4d8 · MATT-c5330b65f2d5 · MATT-c5f866973596 · MATT-d237b0ad2fee · MATT-d791c08cc574 · MATT-e8904e44a50c · MATT-e946354e755c · MATT-f14789f26257 · MATT-f26725cd4ac3 · MATT-f2c08a702dac · MATT-f3b7c2069f77 · MATT-f5dbbdb73cd7 · CTRL-1dadcd35bfa7 · CTRL-1f70841cab55 · CTRL-93ab6b2a434f

#### WP-10 atom coverage (42)

MATT-0261a740295f · MATT-03e4eb13963c · MATT-0570bc8d2999 · MATT-0a53b72be4e9 · MATT-0a9e93314192 · MATT-1f966fb0d410 · MATT-36dba8805ddb · MATT-40f9c0e526bf · MATT-4890d9057b14 · MATT-4da647d8b6e1 · MATT-51799dcfefd9 · MATT-5fa120e2be08 · MATT-70d0fc06870a · MATT-7187491bdac0 · MATT-82e9843da4ee · MATT-9be0134050b9 · MATT-a3aaa647aaa4 · MATT-aa494e6e1ef5 · MATT-b0c0a8ac9c7f · MATT-b8468d932b72 · MATT-c338631e1af2 · MATT-c5989fa21e70 · MATT-c5a2f1239e64 · MATT-c82b83a7017e · MATT-d42c3fe44b94 · MATT-d99654edc8ca · MATT-f79e0fab364f · CTRL-2984d5394505 · CTRL-3e171b1b6b5a · CTRL-5b32986bfe2f · CTRL-7f2f0d135a21 · MATT-1047ab54aad9 · MATT-1c575c15b60e · MATT-617e3a2a95a3 · MATT-67f419958c76 · MATT-8603aff9d903 · MATT-b3589d5156a5 · MATT-b38846688969 · MATT-c2613bbdf6f0 · MATT-c64f15d32b8f · MATT-c786c75d9ce5 · MATT-e9258f150e5f

#### WP-11 atom coverage (71)

MATT-03def577b39b · MATT-0d0c190fa8fc · MATT-1255551b75b6 · MATT-1325b5597939 · MATT-1b86b321487e · MATT-1f9c1b70aeff · MATT-29bde5edb226 · MATT-2aeabccea366 · MATT-34b79a286455 · MATT-35b6c87ab446 · MATT-3609f7403c0c · MATT-3aedc100aa38 · MATT-3ddacd9a5c11 · MATT-3dfb3c48d978 · MATT-3f8cbf4f286c · MATT-430aa46524cb · MATT-489f7d41e23d · MATT-4ab39f9b578a · MATT-4e06282c5bcd · MATT-4fdac0593d2b · MATT-5404beb35412 · MATT-5626527013d7 · MATT-5d8afee7d6ea · MATT-603d5be80f52 · MATT-63657d578563 · MATT-636ced1b204e · MATT-6533defb2dc1 · MATT-6674e058b36b · MATT-66e32c11cde4 · MATT-6d2cb921a70d · MATT-72e5071e2a35 · MATT-857925a93192 · MATT-8b37d64a16e2 · MATT-8c03ef8961de · MATT-8cff28050948 · MATT-93d03c228db7 · MATT-9e29a77e6581 · MATT-a170f51c539f · MATT-a17cf3e7893b · MATT-a180b289f07f · MATT-a1ea8c358191 · MATT-a4960189591a · MATT-b1e53acbdaf0 · MATT-b55c645aeef0 · MATT-bbde2783e7c4 · MATT-bcdf6fa46f89 · MATT-bd4240ee4565 · MATT-be5d474141dc · MATT-c35661170bbe · MATT-c5026b27545e · MATT-c7a88350b48b · MATT-c805300f20ba · MATT-ce7c8d8773f2 · MATT-d2af03d19255 · MATT-d47f4a181325 · MATT-d5e1af44f0f3 · MATT-d80ea51036ce · MATT-def446ebf97a · MATT-e330d907544b · MATT-e5b350fa765c · MATT-eb57baa2d020 · MATT-edf0f3f0b74a · MATT-f06998587ea3 · MATT-f62c5aacc8d4 · MATT-f6f21e46723c · CTRL-424724a22c9c · CTRL-a57b37499519 · CTRL-d02a2022bf6d · CTRL-ed1e1107bcf4 · CTRL-ed96012b4388 · CTRL-efb798196881

#### WP-12 atom coverage (13)

MATT-29a389b085fa · MATT-5df2e8d0079d · MATT-7a0fb29ec0b5 · MATT-a0e5308ee1f7 · MATT-ef67aca33ea4 · CTRL-120f0cccee8d · CTRL-3b6ee076572b · CTRL-acdc6ccfb8e1 · CTRL-b9170a7a70d8 · CTRL-cca0ab638937 · CTRL-d838977435c6 · CTRL-df19ef8d0a10 · CTRL-e9667bafa7c2

#### WP-13 atom coverage (4)

CTRL-1050debda42f · CTRL-7494fd744cae · CTRL-95ce11434746 · CTRL-ad3a4e1bd37c

## 10. H3 终局语义

当且仅当本文的冻结 SHA 通过两轮 fresh redteam 和独立 judge，judge 才能输出 `PLAN_HANDSHAKE_READY`。这个 token 的精确含义是：

- 它是可靠的执行指导，不是已执行报告；
- 它已给出唯一决策、文件面、命令、验收、回执、依赖和回滚；
- 它保持 H1/H4a/H4b 人类门，不能被 H3 替代；
- 它没有把未构建的 WP-13 或未跑的 WP-14 冒充已 PASS。

<!-- FILE_END: candidate-handshake-plan.md -->
