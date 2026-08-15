# Cycle 2 Round 1 — Inventory / Lineage / Decision 红队

- Candidate SHA: `364ba0144553e0e4e4f03ebd023f1df85a1df1da996636b1e5f791146c35d94a`
- Reviewer receipt: `R1-INV-LINEAGE-E912D835-C3B2-4539-B947-57A719BEC0FE`
- Review posture: fresh、默认 REFUTE；只读冻结 Plan 与一手 JSON/ledger，不以 Plan 摘要作证。

## Findings

| ID | Severity | Evidence | Status | Required Plan fix |
|---|---|---|---|---|
| IL-001 | BLOCKER | Plan 先规定 landing 前不得把 ADAPT 写成完成（Plan L155），但 WP-11 又把 `installed-pins.yaml` 和 `adoption-log.jsonl` 的“未落地候选记录”列为候选期写面（L264-L273）；WP-13 再把同两份文件放进事务，状态顺序却是 `... GLOBAL_SWAPPED → LEDGER_COMMITTED → VERIFIED`，且要求 commit B 已含 route/adoption/pin 行（L286-L295）；WP-15 随后同时说这些行在开 gate 前已被 exact-observed，又说 live verify 得到 `VERIFIED` **之后**才更新 ADOPTED/adoption-log/pins/registry/CHANGELOG（L308-L316）。这让同一 pin/adoption/registry 真值既在 VERIFIED 前进入 B/LEDGER_COMMITTED，又在 VERIFIED 后再次变化。当前 `installed-pins.yaml` 自声明只记录“已装”path-domain truth，并要求 refresh **落地后**更新（installed-pins L1-L7）；当前 FUSION 步⑨也把 adoption-log/pins 放在落地与可达性验收之后。按现 Plan，执行者无法唯一决定：候选期写的是 pending 还是 live truth、commit B 含哪些字段、VERIFIED 后的第二次治理写是否仍受 journal/逆 DAG 覆盖；可能造成提前宣称采纳，或产生 terminal seal 之外不可回滚的第三次写。 | OPEN | 在 Plan 内新增逐文件、逐状态的唯一 transition table，并改写 WP-11/13/15：① WP-01 只落 review truth（decision-ledger、benchmark/vetting、gaps），明确 benchmark 从 `ed37663...` 推到 `84fdeffd...` 与 landing 无关；② WP-06/07/09/11 只生成冻结的 proposed pin/adoption delta，不改 live truth；③ commit B 只应用一套明确定义的 pending/installed 字段，并逐字段列出；④ fresh live verify 后，在 terminal seal 前增加受 journal 覆盖的 `GOVERNANCE_COMMITTED`（或等价）状态，才写 verified adoption/ADOPTED/CHANGELOG；⑤ `installed-pins` 若在 global swap 后即代表“已装”而需提前写，明确它与 verified adoption 的语义分离，删除 WP-15 的重复 pin 更新；⑥ 所有失败/回滚为每份 registry/pin/adoption 文件给出精确补偿边。 |
| IL-002 | INFO | GitHub API 对 `mattpocock/skills` main 的 fresh 读取返回 `84fdeffd12f2ee307994d1eb6feb48173b6e0502`、tree `5c5d817a...`；只读 clone 同 HEAD。`benchmark-registry.yaml` 当前 last_review 为 `ed37663cc5fbef691ddfecd080dff42f7e7e350d`，且该节点是当前 HEAD 的祖先，窗口为 106 commits。与 `source-census.json` L19-L20、Plan L28-L31/L156 一致。 | CLOSED | None. |
| IL-003 | INFO | 一手 reconciliation 为 source 196 行，经 `MATT-a0566b42dcc8` 一拆二得到 adopted 197；controls 50；HEAD raw 73 经 `MATT-fa7e31d36e28` 一拆二得到 canonical 74；总宇宙 321（`reconciled-census.json` L18-L25、L4221/L4246、L7058、L7728/L7752）。source parent 覆盖 196/196、HEAD parent 覆盖 73/73；origin-ledger 46 个对象覆盖全部 29 个直接 source commit/path 并保留 17 个显式闭包对象；head-ledger 30 个对象覆盖 24 个候选 source blobs，6 个额外对象均是声明的 transitive closure，blob OID/SHA/bytes 无 mismatch。 | CLOSED | None. |
| IL-004 | INFO | `head-decision-map.json` 74 个唯一 ID 的实算结果为 ADAPT 10 / KEEP 18 / DEFER 19 / REJECT 27 / QUARANTINE 0（L29/L34-L38）；与 `decision-map.json` 的 74 个 head 行逐 ID 比较，decision、reason、WP 映射均 0 mismatch。KEEP 的契约明确是 lineage/existing-local only，非未采纳 HEAD 的激活；19 个 DEFER 全有 observable revisit gate；KEEP/DEFER/REJECT 的计划包只允许 ledger/gap 条目而无 route/skill/command/agent/symlink/global target。 | CLOSED | None. |
| IL-005 | INFO | `decision-map.json` 实有 adopted 197 + control 50 + head 74 = 321（L3385-L3389），无重复 ID、无缺字段。独立解析 Plan §9 得到 321 行/321 唯一 ID；对 decision-map 精确集合比较 missing=0、extra=0、duplicates=0；逐 ID work_package 比较 mismatch=0。WP 数量依次为 56/3/5/3/21/21/35/12/35/42/71/13/4（WP-01..WP-13），与 decision-map 分组完全一致。`build-manifest.mjs validate` 另返回 manifest 197 / decisions 321 PASS；harness audit 返回 321 atoms / 2,568 cells PASS。 | CLOSED | None. |

## 终局

**REFUTE**

Inventory、lineage、决策计数和 321→WP 映射本身闭合；但 IL-001 是冻结 Plan 内部的真实时序矛盾，不是“未来实现尚未完成”。在 registry/pin/adoption 的候选、installed、verified 三态被唯一化并纳入同一可回滚事务前，这份 Plan 不能作为无歧义执行指导。
