# Cycle 2 Round 1 closure rerun — Inventory / Lineage

Candidate SHA-256: `1964e44d150001aa10604b9abd6763792269c24e4995fadd6d4df737c289052c`

- Reviewer receipt: `R1-RERUN-INVENTORY-B2DF9F2E-35AE-4405-8503-D4122F010BFA`
- Posture: 从零、默认 REFUTE；先前 `25d948…` verdict 明确作废。本报告只绑定上述 Candidate，未来 WP 未实施不计 Plan finding。

## Fresh evidence

- Candidate 实测 SHA、题定 SHA 与 `candidate-plan-freeze.sha256` 三者完全一致。
- Source bundle 实测 SHA=`58e0f7f20bfcab7410d4f0fd308447ab734ad4c77db3f8d7132603d64f600f52`，与 Plan literal 一致。Plan-literal OS anchor 对 18 个成员的 FD/inode/bytes 检查 PASS；secondary source-bundle audit 亦 PASS。
- Architecture=`4134996a…a3db`、decision=`f76056e4…4967b`、manifest=`69af6829…afb48`、matrix=`c0ddd7da…48cc`、live probe=`e68096e3…477f8`、run-fixtures=`62dbad72…e856`，均与 source bundle/Plan 当前绑定一致。
- Manifest validator、matrix strict audit、五 ADR validator、candidate-plan exact appendix validator 与 freeze validator全部 PASS。

## BLOCKER / MAJOR status

| ID | Severity | Status | Fresh closure evidence |
|---|---|---|---|
| `RR-INV-001` — stale hash/freeze 或错误更新顺序 | BLOCKER | **CLOSED** | Bundle 先绑定最终 ADR、live probe、四个 repository validators 与 OS anchor；Plan 在 bundle 外绑定最终 member/bundle hashes；candidate freeze 再绑定最终 Plan。旧 `76592…`/`25d948…`/其它历史 SHA 和 freeze placeholder 在当前 Plan/ADR/bundle 中为 0。当前 identity graph 可机械复放且所有 SHA 命中。
| `RR-INV-002` — source bundle/Plan/anchor fixed point | BLOCKER | **CLOSED** | Bundle 不列 Plan、candidate freeze或自身；18 个 member 均不嵌最终 bundle/Candidate hash。OS anchor接收 Plan-literal expected hash作为参数而不内嵌它；run-fixtures动态读取 bundle而不写死 bundle hash。依赖唯一为 `Plan → anchor + bundle → members`，无回边。
| `RR-INV-003` — 321 appendix 漏项、重复、extra 或错 WP | BLOCKER | **CLOSED** | 独立解析 §9 得 321 rows / 321 unique / 0 duplicate；sorted-ID hash与 decision map 同为 `0c0cca2c814d2a5ecb79b21d4f1c8c652d2669bae138edaaafa10b520c976bff`。严格 validator逐 ID 比较 appendix WP，0 missing/extra/wrong-WP；WP-01..13计数为 56/3/5/3/21/21/35/12/35/42/71/13/4。
| `RR-INV-004` — adopted/control/HEAD lineage 混数或断链 | BLOCKER | **CLOSED** | Reconciled census是 source 196→adopted 197、HEAD raw 73→candidate 74，两个唯一 1→2 split明示；controls=50不充 adopted N。最终 universe 197+50+74=321且321 unique，和 decision map双向差集为空；unmatched/collision/composite均为0。
| `RR-INV-005` — decision/manifest/matrix语义或覆盖漂移 | MAJOR | **CLOSED** | Decision与matrix逐 ID的 id/slug/decision/WP mismatch均为0；manifest只含197 adopted atoms，source/live/independent coverage各197；matrix为321 rows/2,568 cells，128 N/A全且仅为WP-09 teach/Codex。
| `RR-INV-006` — Codex live probe 未冻结或冒充能力 PASS | MAJOR | **CLOSED** | Live receipt SHA=`e68096e3d290ef5d4470eaabe843a7d61d4b83ce95ab6b08ff34a5ad227477f8` 同时写入SRC-LIVE并进入18-member bundle。Plan仅将其解释为CLI可启动，WP-05仍要求fresh native re-probe，未把旧receipt当role/parity证明。
| `IL-001` — reviewed/installed/verified治理真值重叠 | BLOCKER | **CLOSED** | R只落review truth；A落dormant implementation；global swap observed后B才落route/installed pin/pending row；fresh live verify后C才落final adoption/ADOPTED/CHANGELOG；`VERIFIED`后repo/global/governance零写。失败先close gate，再按observed C/B/global/A补偿，partial B/C不猜修。
| `IL-C-001` — B OID/route hash与descriptor/gate自引用 | BLOCKER | **CLOSED** | B bytes只含transaction+非自引用epoch，不含B OID或route hash；外置H4b descriptor在B完成后绑定B OID+完整route SHA，root gate再单向绑定descriptor SHA，descriptor不含gate-file hash。C不含未来terminal payload root/hash；independent verifier要求self-reference及OID/route/epoch substitution负例失败。

## New material findings

无 open `BLOCKER` 或 `MAJOR`。

## Terminal

**AFFIRM**

新冻结 Candidate 的 source bundle、321 appendix/WP mapping、197/50/74 lineage、hash/freeze 身份和无自引用合同均闭合。

<!-- FILE_END: round1-rerun-closure-inventory.md -->
