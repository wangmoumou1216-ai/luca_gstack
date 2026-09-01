# Final plan review ledger

Date: 2026-08-30  
Authoritative plan: `/Users/luca/Desktop/项目/muse/lucagstack/framework-audit/2026-08-30-mattpocock-six-skills-integration/FINAL-MASTER-PLAN.md`  
Final plan SHA-256: `1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9`  
Final status: `READY_FOR_GATE_A_PLAN`

## Review history

| Round | Plan SHA-256 | Flow | Plan contract | Safety | Disposition |
|---|---|---|---|---|---|
| 1 | `621869ab0830ac7ee57eef6bf3ce374d1b35a13b00ed7823693089f1f192fbe2` | PASS | FAIL (`FM-01..05`) | FAIL (`MASTER-SAFE-1..3`) | Phase contract、依赖、文件边界、manifest denominator、启动闭环与发布隔离均修订 |
| 2 | `eca9a1abc1e2d7097c42af30c1c690a52d97ea8f3bf151c66ad58f688c249bd5` | PASS | FAIL (`R2-B01..03`) | FAIL (`MASTER-SAFE-1..2`) | 增加 exact bootstrap、独立 witness；发布改用 isolated index/immutable OID；补齐 allowlist/path 公式 |
| 3 | `6335f13dc0a805eddad0a09d2fe1a5b176d33c539cec8e50f6c31914f5371577` | PASS | FAIL (`R3-B01`, `FM-01R`) | PASS | Gate A-bootstrap 补齐 U-003～U-007 授权；`skills_needed` 收敛为真实 SKILL.md |
| 4 | `693e804d11d684fc51a0790bafcadf376402316a625033a6d9dc4f9b3840c00b` | PASS | PASS | PASS | 语义与执行合同终审通过 |
| Final status-only re-sign | `1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9` | PASS | PASS | PASS | 仅状态从 `CANDIDATE_UNDER_REVIEW` 改为 `READY_FOR_GATE_A_PLAN`；三方分别还原该行并复算精确回到 Round 4 SHA |

## Final verdicts

- Flow reviewer: `PASS` — Skill-first / Graph-optional、六项 direct/semantic/internal、owner、主链及异常返回原 U-ID 均闭合。
- Plan Agent reviewer: `PASS` — 8 个 U-block 九字段完整，Phase/Wave/Gate/Files/Read List/Verification 可执行，依赖无环。
- Safety reviewer: `PASS` — exact bootstrap、独立 required witness、private ref、HEAD/main/index 不变、sanitized literal-URL push 与 expected-old lease CAS 均闭合。

## Approval boundary

这些 verdict 只证明计划可执行，不代表已安装或已发布。后续必须按计划依次经过：

1. `Gate A-plan`：批准 final plan SHA，仅授权 scratch bootstrap preparation。
2. `Gate A-bootstrap`：批准 exact bootstrap patch、后续 repo allowlist 与条件性 personal paths。
3. `Gate B`：批准 exact publish set、immutable commit OID 与 literal remote effect。


## U-007 implementation candidate review — superseded r4

Candidate manifest: `framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-MANIFEST.tsv`  
Candidate manifest SHA-256: `2c97033e69b1e749a685fb1155089e6b9dbaa69734ae6b04eceee4f735dc86c2`  
Runtime denominator: `81` rows  
Evidence policy: `final-master-v1` (7 paths)  
Publish path count: `88`  
Status: `SUPERSEDED_NON_BINDING`

| Axis | Reviewer / eval run | Verdict | Candidate SHA-256 | Evidence |
|---|---|---|---|---|
| flow | `ea-u007-flow-20260831-r2` | `PASS` | `2c97033e69b1e749a685fb1155089e6b9dbaa69734ae6b04eceee4f735dc86c2` | Independent flow assertions `8/8` passed. |
| safety | `ea-u007-safety-20260831-r2` | `PASS` | `2c97033e69b1e749a685fb1155089e6b9dbaa69734ae6b04eceee4f735dc86c2` | Independent safety assertions `7/7` passed. |
| quality | `ea-u007-quality-20260831-r2` | `PASS` | `2c97033e69b1e749a685fb1155089e6b9dbaa69734ae6b04eceee4f735dc86c2` | Independent quality assertions `7/7` passed. |

Earlier r1 review attempts bound superseded manifest
`cb2e539b17f0de3382079848c84eeb5dc06d0f8cc476b487c5a1638e123bd9bc` and were invalidated by
the U-005 corrections. They are non-binding history, not verdicts on the current candidate; their run IDs
were `ea-u007-flow-20260831-r1`, `ea-u007-safety-20260831-r1`, and
`ea-u007-quality-20260831-r1`.


The r4 PASS rows above bind only manifest `2c97033e69b1e749a685fb1155089e6b9dbaa69734ae6b04eceee4f735dc86c2`. The completed U-002 corrective changed runtime bytes, so those reviews are superseded and non-binding for r5.


## U-007 r5 review attempts — superseded receipt bytes

These attempts inspected runtime manifest `85a6ac9b65d9f822c1255b4ccc499967bc2e9459a32440d1487c13ba6c5d73ac` with pending receipt SHA-256
`6c2d6c91f3c588683fac212a16eeba760eaaef26d55e691364dbcd5385c1fb08` and ledger SHA-256
`28438783bdb6e1682134e9b92b4d7c397b6b4c616aee9010edf338eb60363fa0`. The receipt incorrectly
claimed U-003 generation r5; correcting that evidence byte invalidates the attempt set for the current review.

| Axis | Eval run | Historical result | Current binding |
|---|---|---|---|
| flow | `ea-u007-flow-20260831-r3` | Attempt superseded before a current verdict could be carried forward. | `NON_BINDING` |
| safety | `ea-u007-safety-20260831-r3` | `PASS 8/8` on the superseded receipt bytes. | `SUPERSEDED_NON_BINDING` |
| quality | `ea-u007-quality-20260831-r3` | `FAIL 6/7`: durable U-003 generation is r4, not r5. | `FAILED_NON_BINDING` |

## U-007 implementation candidate review — final r5

Candidate manifest: `framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-MANIFEST.tsv`  
Candidate manifest SHA-256: `85a6ac9b65d9f822c1255b4ccc499967bc2e9459a32440d1487c13ba6c5d73ac`  
Runtime denominator: `81` rows  
Evidence policy: `final-master-v1` (7 paths)  
Publish path count: `88`  
Status: `VERIFIED`

| Axis | Reviewer / eval run | Verdict | Candidate SHA-256 | Evidence |
|---|---|---|---|---|
| flow | `ea-u007-flow-20260831-r4` | `PASS` | `85a6ac9b65d9f822c1255b4ccc499967bc2e9459a32440d1487c13ba6c5d73ac` | Independent flow assertions `8/8` passed against receipt `84ed9d0e…` and ledger `bf8afc…`. |
| safety | `ea-u007-safety-20260831-r4` | `PASS` | `85a6ac9b65d9f822c1255b4ccc499967bc2e9459a32440d1487c13ba6c5d73ac` | Independent safety assertions `8/8` passed against the same reviewed evidence bytes. |
| quality | `ea-u007-quality-20260831-r4` | `PASS` | `85a6ac9b65d9f822c1255b4ccc499967bc2e9459a32440d1487c13ba6c5d73ac` | Independent quality assertions `7/7` passed against the same reviewed evidence bytes. |

These are the only current binding verdicts. All r1/r2/r3 attempts above remain historical and non-binding.

<!-- FILE_END: REVIEW-LEDGER.md -->
