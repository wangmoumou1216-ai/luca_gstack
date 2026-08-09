# Cycle 2 Round 1 fresh recheck — Inventory / Lineage / Governance

Candidate SHA-256: `34bcc92ba5ff7ff6c27a5ed724068a2faadcf6641af8399fda0216056050cf45`

- Architecture SHA-256: `85b64175c97a38ced9b5b4c3d02a5d6c5ab5a6787b0df7fe0fbc9adc7b1164c4`
- Source-bundle SHA-256: `dac6fd8376f99a54c4fd5ce752cbb5a7588140286efd39b60387acabbce38b66`
- Reviewer receipt: `R1-RECHECK-INV-LINEAGE-136524C5-5405-47E2-A3F5-C71207D2C9DA`
- Posture: fresh、默认 REFUTE；只读冻结 Candidate、source bundle、census/ledger/decision/matrix、R6 ADR 与原 inventory findings。未来 WP 尚未实施不计 Plan finding。

## 冻结边界与独立复算

- `candidate-plan-freeze.sha256` 与题定 Candidate 字节一致；收尾再次 read-back 仍为 `34bcc92b…cf45`。
- `source-bundle.sha256` 的 16 个成员逐字节校验全部通过；Plan 内 SRC-ARCH、SRC-HARNESS、SRC-DECISION、SRC-MANIFEST、SRC-BUNDLE 值均命中实际冻结字节。
- census 独立 replay 到 `/private/tmp` 后与冻结 `reconciled-census.json` 同 SHA：`e40a4667…d5b`；self-test 的 source tamper、prejoin tamper、missing control mapping、composite control 均被拒。
- 复算 universe 为 adopted 197 + control 50 + head 74 = 321，321 个 ID 唯一；与 `decision-map.json` 双向差集均为空。
- `decision-map.json`、`harness-matrix.yaml` 逐 ID 的 id/slug/decision/WP mismatch 均为 0；matrix 为 321 rows / 2,568 cells，128 个 N/A 全且仅为 WP-09 teach/Codex。
- Plan §9 解析得到 321 个 ID、321 unique、0 duplicate，与 decision universe 双向差集为空。`build-manifest.mjs validate`、strict matrix audit、candidate-plan validator 与 freeze validator 均 PASS。

## 原 findings 关闭复核

| Finding | 原级别 | 状态 | 关闭证据 |
|---|---|---|---|
| `IL-001` — review/proposed/installed/verified 治理真值时序冲突 | BLOCKER | **CLOSED** | Plan §7.2 已给出逐文件唯一 transition：WP-01/G-REVIEW 的 R 只落 reviewed benchmark/vetting/gaps/decision history；能力包只产 proposed delta；A 只落 dormant implementation；global swap 已 observed 后，B 才落 route、真实 installed pin 和 `pending_live_verification`；fresh 双端 live receipts 后，C 才落 final adoption/`ADOPTED.md`/`CHANGELOG.md` 并进入 `GOVERNANCE_COMMITTED`；`VERIFIED` 后 repo/global/governance 零写。失败序列固定为先 close gate，再按 observed C/B/global/A 补偿；partial B/C 明确保留第三态而不猜修。reviewed、installed 与 verified adoption 不再互相冒充或重复写。
| `IL-002` — upstream window / baseline identity | INFO | **CLOSED** | 冻结 head ledger 记录 previous `ed37663c…`、current `84fdeffd…`、tree `5c5d817a…`，remote/local match 且 post-2026-08-07 commit=0；Plan 把该推进定义为 reviewed truth，并要求上游越界时硬停重审。
| `IL-003` — census 与 origin/head lineage closure | INFO | **CLOSED** | source 196 经唯一 1→2 split 得 adopted 197；HEAD raw 73 经唯一 adoption 前 1→2 split 得 74；origin ledger 46 objects / 196 referenced atoms / 0 missing，head ledger 30 objects = 24 mandatory + 6 justified transitive / 0 missing。replay 与冻结字节完全一致。
| `IL-004` — HEAD 决策和 zero-new-surface | INFO | **CLOSED** | `head-decision-map.json` 与 decision map 的 74 行逐 ID decision/slug 均一致：ADAPT 10 / KEEP 18 / DEFER 19 / REJECT 27 / QUARANTINE 0。64 个非 ADAPT 中，WP-01 的 56 行只写 lineage/revisit，WP-10 的 8 个 questionnaire DEFER 只写具名重访 gap；Plan 明禁它们新增 skill/route/command/global target。
| `IL-005` — 321→WP 精确覆盖 | INFO | **CLOSED** | decision/map/matrix/Plan appendix 精确同集合，0 missing/extra/duplicate；WP-01..13 数量为 56/3/5/3/21/21/35/12/35/42/71/13/4，与 decision map 完全一致。
| `IL-C-001` — commit B / route-file 身份自引用 fixed point | BLOCKER | **CLOSED** | R6 ADR 与 Plan 现在明确：B rows **只**携带预冻结 transaction ID + 非自引用 route-epoch ID，B bytes 不嵌 B OID 或完整 route-file hash。B 完成后，外置 H4b descriptor 单向绑定 exact B OID + complete route-file path/SHA；descriptor SHA 确定后，root gate 再单向绑定 descriptor SHA + transaction/epoch + 同一 B OID/route SHA，descriptor 不嵌自身 SHA或 gate-file hash。C 也只写预定 transaction/public-bundle logical name，不写未来 payload root/hash。WP-12 要求扫描 B tree 不含自引用字段，WP-13 independent TCB gate 明列 `b-self-reference`、`b-oid-swap`、`route-byte-swap`、`transaction-epoch-swap` 负例。原 B↔OID、route↔digest、descriptor↔gate 三类 fixed point 均已拆除。

## 同域新增 BLOCKER / MAJOR 扫描

未发现新的 inventory、lineage、decision、governance 或 fixed-point `BLOCKER/MAJOR`。

本结论不把 WP-13 broker、R/A/B/C commits、2,568 live receipts 尚未实施误判为 Plan 缺陷；这些仍由 H4a/H4b 与未来执行 gates 阻断，Candidate 没有把它们冒充当前 PASS。

## 终局

**AFFIRM**

该冻结 Candidate 已关闭原 inventory/governance blocker 与后续 B 自引用 blocker；在本 reviewer 负责的 inventory / lineage / governance 域内，可进入下一轮 fresh redteam。

<!-- FILE_END: round1-recheck-inventory-lineage.md -->
