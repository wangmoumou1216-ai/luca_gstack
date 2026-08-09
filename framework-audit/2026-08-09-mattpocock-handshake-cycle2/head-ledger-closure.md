# HEAD ledger closure

> 状态：`PASS`  
> 上游 HEAD：`84fdeffd12f2ee307994d1eb6feb48173b6e0502`  
> 修复后 ledger SHA-256：`bc423f8c139f850d66c152571140ade2a011e80232f6ca0342d26e2771a05724`

## 发现

原 ledger 自身的 20 个 object identity 都正确，但它不是 HEAD candidate source closure：

- 73 raw candidate rows 引用 **24** 个唯一 source paths；
- 原 ledger 只有 **20** objects，其中只覆盖 14/24 mandatory paths；
- 漏 **10** 个候选 source paths；
- 原有 **6** 个对象不是 atom source path，而是解释 codebase-design、tdd、prototype、ask-matt 所需的 transitive/supporting refs。

这不是“hash 错”，而是“集合边界错”。若只检查 ledger 内部 hash，会假绿。

## 修复

修复后的唯一集合规则：

`24 mandatory candidate source blobs ∪ 6 explicitly justified transitive refs = 30 objects`

新增 10 个 mandatory objects：

| Path | Blob OID | SHA-256 | Lines | Bytes | Disposition |
|---|---|---|---:|---:|---|
| .agents/install-block.md | 8971bde2d7ad2bbc722cc4beb838ea6c906b57c7 | 8079456d3df5866785ee71e0e14e88b99ad96921e28f4e664b7f67dd1c455f16 | 61 | 2802 | REJECT |
| .agents/writing-docs.md | c915ab8be6e22dab003df00f76ffc69937517bd9 | d63abb087493db959d2e614f2a8fd697c0d32fb80df84c48b4c0bca18c82a443 | 96 | 12760 | OBSERVE_DEPENDENCY |
| skills/deprecated/README.md | ac3f47d3d28f8ca6371df209e14540243b47a360 | e951955161a17638da3abb77bd359be791d05d7744f6774a630b67cb8d47fc93 | 3 | 163 | KEEP_LINEAGE |
| skills/engineering/code-review/SKILL.md | 2d276fe88bddd363395b4887a555769222a34975 | 9cf46653dd9c710ea1e6c22423caf31a794c88773bc94bdaa23140277f470442 | 87 | 6634 | OBSERVE_DEPENDENCY |
| skills/engineering/improve-codebase-architecture/SKILL.md | 529761a3a01d35996018f27530b3c3cc0ab18d41 | 7b76f01b0eefe49a127754c9027a6235a036a21348df5dad988893d8b2f384d6 | 71 | 6009 | OBSERVE_DEPENDENCY |
| skills/engineering/triage/SKILL.md | e67b7bbabf5215b52f135c7e58b8da5f91337a86 | 91e2817ecb688c4df4e2444eab472d1d79d2a0a57abf9f6726967664c460ff2e | 112 | 6582 | REJECT |
| skills/engineering/wizard/agents/openai.yaml | b601bdf3a321e7d32d5714681540b811287d3988 | 98f44d682d58e262f160dc59a8befc365e0aa65820dd0261864af26aa8e59d83 | 3 | 96 | REJECT |
| skills/in-progress/loop-me/SKILL.md | c408efa39d2a5da50562e29c914bf8095bf4a1db | ad7110ecbd419fc312c3e7c62f496bd346a05462cdf1589b12ff7550fce3202a | 32 | 2560 | REJECT |
| skills/productivity/to-questionnaire/agents/openai.yaml | a58d14765beb4acb4c9708b516310558e1308a22 | 9e8a06c38c8842eea8d4922cb9d1ead8e3ace647bab259b943c994a1b4742bc2 | 5 | 166 | DEFER |
| skills/productivity/wait-what/agents/openai.yaml | ba77f1c967700d7c6574ba70b0dd585056c98b7f | 3ec661af8fc7063b650518c95ab775bbeabaefce38b89acaf6da2f749168f37e | 5 | 161 | REJECT |

保留 6 个 transitive/supporting refs，且每项在 ledger 的 `relevance` 字段有理由：

- `skills/engineering/ask-matt/SKILL.md`
- `skills/engineering/codebase-design/DEEPENING.md`
- `skills/engineering/codebase-design/SKILL.md`
- `skills/engineering/prototype/UI.md`
- `skills/engineering/tdd/mocking.md`
- `skills/engineering/tdd/tests.md`

## Replacement / deletion 边界

- grilling：`batch-grill-me → grilling`；consumer propagation 的 triage/loop-me source 已进入 ledger。
- writing：`writing-great-skills → writing-for-agents`；只窄吸收 doctrine，旧对象仍由 origin ledger 留存。
- questionnaire / wizard：promotion 后的 Codex metadata 现在都在 HEAD ledger，不能再用 Claude SKILL body 代替双端来源。
- logic prototype：terminal → self-contained HTML 的 replacement 由 prototype/LOGIC 两个 exact blobs 承载。
- deprecated/personal 删除只记 upstream lineage，不授权删除本地文件。

## 复放结果

- ledger objects：30；unique paths：30。
- mandatory：24/24；missing：0。
- transitive extras：6，全部有 `relevance`。
- 每个 object 的 commit/path 可解析；OID、SHA-256、bytes、lines、EOF newline 与 upstream exact blob 全相等；bad=0。
- duplicate paths=0；missing OID=0；missing SHA=0；unread EOF receipt=0。
- 73 raw ranges 和 24 census blob aliases 均落在 exact HEAD blob 内；bad=0。

这次 closure 修复只改审计资产，不改 route、skill、pin、global target 或 activation。

<!-- FILE_END: head-ledger-closure.md -->
