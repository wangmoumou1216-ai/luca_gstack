# Direct-read coverage report — Round 1 freeze

> 目的不是声称“模型内心看懂了”，而是留下可反驳的操作证据：对象、精确版本、完整范围、
> 截断状态、内容锚点与独立复读门。哈希只能证明对象没换，不能替代语义复核。

## 1. 读取规则与一次真实失败

- 正常文本每批不超过 200 行或约 32 KiB；输出出现 `truncated` 即整批作废。
- 上游 `to-spec/to-tickets/triage/AGENT-BRIEF/OUT-OF-SCOPE/wayfinder` 第一次合并读取收到
  `Warning: truncated output`，该批 **未计入覆盖**；随后逐文件重读并收到每个显式 `<<<EOF:path>>>`。
- `grilling/grill-me/handoff/writing-great-skills/GLOSSARY/CHANGELOG` 第一次合并读取亦截断；
  `GLOSSARY.md` 与 `CHANGELOG.md` 随后单独完整重读，其余小文件也有完整 EOF 回执。
- 没有 `FILE_END` 的上游 blob 以 Git blob OID + SHA-256 + logical line count + 显式 EOF 回执封口。
- 本地 mandatory contract 若有 `FILE_END`，必须读到该 marker；否则以最后一节语义和 EOF 封口。

## 2. 精确上游基线：38 个 origin blobs

版本：`mattpocock/skills@391a2701dd948f94f56a39f7533f8eea9a859c87`。
以下每个对象都直接读取完整内容；字段为 `path | lines | bytes | sha256 | git-blob`。

```text
.agents/invocation.md | 18 | 1795 | 03d4e958e7fdd2f199ea1b3b77d396080a3f3c73b4c7eb725e551ddd17ff4317 | c434516edb8ebb19ec0c6f8a4bf822490c4cc1ba
.agents/writing-docs.md | 81 | 7186 | 679d2e8e7470f48737df069150ace4d9accfdb918fcdd741c95e539ea789d8b9 | c3bfc83732e8ae6337f813a3201e89f0a799f2f5
.out-of-scope/mainstream-issue-trackers-only.md | 25 | 1574 | 6aa440190cf69f103063ded3ea5b07b38143baa877a1db200ab05dd1dbf283ad | 7cd3dd6ddd022fa3ca0c72b91eb852fab77b0a11
.out-of-scope/question-limits.md | 18 | 1262 | 4079b906b148c0c4eed7dff807348ad62b2c0c83ced017dc674973007e04a55d | 9ec41214d8e76f88d320613ba830bf9d81a229ea
.out-of-scope/setup-skill-verify-mode.md | 15 | 1134 | bac6a66bb6f50ff7f60a7853344dbfc05db38369bf517917389340355b4acf9f | 70d8714705002dd4e9d6fcb8cd79e98138ecfcb0
skills/engineering/code-review/SKILL.md | 89 | 6740 | 6a65cc61114f96db07ec41e3920e67c9c5bf70dd6e0901eb9460ebcb2bdc209f | 2a0b5240731b927caa9ac0bf43c3e2af9dc3f0a7
skills/engineering/diagnosing-bugs/SKILL.md | 134 | 8536 | 7a0779480f323a66d109404646bcc1a14bf0232b45b3e3ea93b652a035718acb | f400de7c1937377fec7ff9bae3b0c072670f1e81
skills/engineering/diagnosing-bugs/scripts/hitl-loop.template.sh | 41 | 1164 | b2932630950e5210075bcd6f850e5accf30c101c5367b29eac3a29b4dd8084c8 | 40afc4652f6f52fc117b2b00e1fa65fcec235838
skills/engineering/domain-modeling/SKILL.md | 74 | 3427 | 152e2c97239affb12a60c5f4a7e74ab546a49ae169688c81f4e2ccc42dafa579 | d0f7e1a5ccb06a7184056ff9af02b67bc77f9dda
skills/engineering/domain-modeling/ADR-FORMAT.md | 47 | 2766 | f1f36cd3f8d3b6474ddd5855da4e233bfc4ae1a1c5024909ccf11871819a41b2 | da7e78ec1c220cd0aedf7ad36424c9398034f375
skills/engineering/domain-modeling/CONTEXT-FORMAT.md | 60 | 2299 | b8cc318f2a4285b530e908b6bc43901c3c5cd11100362636bbc4216639bef597 | eaf2a18573f0a2d8c69ed53e29e4d9e21baf81d8
skills/engineering/improve-codebase-architecture/SKILL.md | 66 | 5421 | 0026900866ed2a542af0559cef11dd7ae707633b75cc6f668c2e7c0a33e35032 | a79b493ea386d537208beacc41ad26336da257eb
skills/engineering/improve-codebase-architecture/HTML-REPORT.md | 123 | 6685 | 0b0936104158abeef7246ff6cbabefa4dc055f17589f2833f2d93001421910a1 | 17f6d2c7b8342ee7c4260d8d98024d462c7d3eaa
skills/engineering/research/SKILL.md | 12 | 799 | af378829f015775a3bcd65ff466826722e99359017ae6bae227ca4c9bd14049c | 0ba594a07f306479baa67104381f48e209ab6aae
skills/engineering/to-spec/SKILL.md | 75 | 3073 | 267638edd513b5918de626ad5605d261952abb7428cb308869c663ca924e93e7 | f3cca8d3dbdb7c22e11447f1d13011a78ca6efba
skills/engineering/to-tickets/SKILL.md | 107 | 5800 | 1846d215e24ec1219b199a708329ca915db93138d4f3675af29db4d32ee41391 | 23140c577f71c98993523f0dbec74f250561b708
skills/engineering/triage/SKILL.md | 112 | 6574 | d45827c299c021f77b0f146fefa3ee679b13f99e9a2ffdf48e8de2347adeefe1 | be47b78100c8524c3af3681790d2bb8b9ff150b7
skills/engineering/triage/AGENT-BRIEF.md | 207 | 7972 | 5b78d347cc53f6bcf7b875106005ccf5315055fa4cf75eb28d41e96ee426d27b | 6535c9bd00e81266e03fc257348aa02405ee3d10
skills/engineering/triage/OUT-OF-SCOPE.md | 105 | 4712 | 2526f998fd7ca5e956d3f6f234bcc2431a5971ee769f1148ddc60b92f04d5914 | fc0e39f529146883d23d0dd315f55af05a39cbdf
skills/engineering/wayfinder/SKILL.md | 127 | 11503 | bef437de697fb6984a8a90b7fd82f128609148d6e02f635ce419d03555b351e1 | 2bce062ff22c3f21108db356822db9f66a2eb4f2
skills/productivity/grilling/SKILL.md | 12 | 821 | 5a35925d03a391bcfa46940868b649b72dba89ec9c19525e785bbb6bd3a7f478 | 219930f78b238d0980f5036af7d7736b855bbaea
skills/productivity/grill-me/SKILL.md | 7 | 147 | 6189dfceb7304a6e5558f75d87e68fa3bc7fcf7ba120e44f21f8a61fe01eba54 | 9470cfcfe231a35e46494cddbacdd395991afb1e
skills/productivity/handoff/SKILL.md | 16 | 879 | 57c9f1f392d7352cdc85b1e39ca49eddc70ce1dc278bd9653fb4f23dfc2560fc | 043d9e13dc7eca3002a47d3ab9865c568f647863
skills/productivity/writing-great-skills/SKILL.md | 83 | 9414 | 4d6ccbc3760b1bd4107c495a79872286ea69494003f3b0a719fc95b147457061 | 82abd0dce264eecb3ed461b3eac17bdafb52f84b
skills/productivity/writing-great-skills/GLOSSARY.md | 201 | 18488 | cccd684c73fb7a06f523497b0121765f92d2b33d6ef9c51602294849233451d6 | 0269ca89b9d886075c3d1ae624592f8a08ba3197
CHANGELOG.md | 116 | 21018 | e542f578f0626c8fe1afdb5ea778397f9e67e62babe5f3ce816b47595034d26b | f609fc1642ce217f2ebf926663df2e8cba548081
skills/engineering/tdd/SKILL.md | 36 | 3213 | 5363bb2775679fe9311fbb67947f95359169c6e7f1fac77c0f25e190bca6cf2f | 9a2e1d2a1ad856b0d5903dd002209ff8c32c9a48
skills/engineering/tdd/tests.md | 77 | 2214 | 859f9e592c188fda4fc7277dd180e4ce9c7a2e13f6efe1f6f29eccc9d28c106a | 7ab86479f925a1f9e8ba680af33cb3b12e015381
skills/engineering/tdd/mocking.md | 59 | 1481 | 3ceb807fdf4a47d6a93d4d9a891e5ba6d362a6247bd08adc451feebfc17361ef | 71cbfee674d93244ce81d1830b930ca9a69200bd
skills/engineering/codebase-design/SKILL.md | 114 | 6488 | a8d50abac5a4018f60e1d911d4b6f4e36454ca14d6c390c0695a578c7de65dad | 16620c24528b737408e78d95dd6a0e01a98d3d63
skills/engineering/codebase-design/DESIGN-IT-TWICE.md | 44 | 2712 | 21c3264953bd30ee87b181a3ccaf0e70649f461e5ffd7dc654acee4ba1788b31 | 49a7c42a2ccc6aff0ffc09efd28e6a4aa3c373d7
skills/engineering/codebase-design/DEEPENING.md | 37 | 2559 | 125e6b77413ad2bc7cf7a772bc74336d580a50f9e797db2178ed133d62333d06 | 3938457b88ddf98262d5f461aac703dbd74f749a
skills/engineering/resolving-merge-conflicts/SKILL.md | 14 | 921 | c7c9ba81362a786aac05d2223123bf1bd2f8a99c3243a72882ede9c68bedfb24 | aadb3fcb1dfb43413dff30c2fb4b18b7cf58e90e
skills/productivity/teach/SKILL.md | 140 | 9507 | 6d2dbe5e03084cf26fef66b535127b36cd1bcbe9478e26b0626029cd51dc2259 | b1603e5ac536d2b5c29496c06df4db0bb9f74e69
skills/productivity/teach/GLOSSARY-FORMAT.md | 35 | 2131 | d177def491519d97873291f2e860d8f1d60ead78feecb82eee022177958069c6 | 9cae84c44c8eb5d27b8695d4ef29a2893dc4900c
skills/productivity/teach/LEARNING-RECORD-FORMAT.md | 46 | 2777 | 855f81017625256584bbf62bd5edb9b0c86605c4cc1139c56acc36b802595d17 | 2faa7c98fabcdff48eb6bd07e4847d48a6b8d4e1
skills/productivity/teach/MISSION-FORMAT.md | 31 | 1553 | 8da6d3ac84eb2eb19f17c260b6acf01c560d3ac7a4501c415eea0e985602f4d7 | 5dac184a319308e2ec0c18c16d6b8d52b9be2748
skills/productivity/teach/RESOURCES-FORMAT.md | 32 | 1926 | 2bc634a64b0d0daa10904f9222e7aa0d361420dfacabbf092fbe3a72222edc08 | c94aac6a2634cc229fe0b777fc5cc7da3a28c3d2
```

内容回执锚点：invocation 的 user/model split；writing-great-skills 的 hierarchy→completion→leading-word→failure modes；
diagnosing 的 tight red-capable loop→ranked falsifiable hypotheses→`[DEBUG-*]`→seam honesty；wayfinder 的 destination/frontier/fog→HITL/AFK→one-ticket/session；
triage 的 redundancy/prior rejection→verify-before-grill→durable brief；最后一组的 TDD seam/tautology、codebase dependency taxonomy、teach ZPD/assets/wisdom 均读至末节。

### 安装内容身份证明

12 个原样安装文件（tdd 3、codebase-design 3、resolving 1、teach 5）的本地 SHA-256 与上表 pin blob SHA-256 **逐文件一致**。
因此本地完整读取同时也是该 12 个 origin blob 的内容读取；路径差异不代表内容差异。

## 3. 当前更新候选：20 个直接读取的 HEAD blobs

版本：`84fdeffd12f2ee307994d1eb6feb48173b6e0502`。

| 对象组 | 文件数 | 完整范围 | 末段语义回执 |
|---|---:|---|---|
| writing-for-agents | 2 | `SKILL.md` 1–81；`SKILL-MECHANICS.md` 1–22 | environment 也是 SSOT；文档只是昂贵 cache；skill invocation 分支单列 |
| diagnosing-bugs | 2 | SKILL 1–140；script 1–44 | 新增 Redact prose，但 HITL 脚本仍原样回显 `ERROR_MSG` |
| codebase-design | 3 | 1–114 / 1–44 / 1–37 | HEAD 仅把 `Agent tool` 改为中性 sub-agents；本地 pin 尚未同步 |
| tdd | 3 | 1–38 / 1–77 / 1–59 | 仅新增 codebase-design 条件指针；tests/mocking 与 pin 不变 |
| questionnaire | 1 | 1–53 | grill-the-send；who/what-back 两门后写当前目录 |
| prototype | 3 | 1–26 / 1–67 / 1–112 | logic 单 HTML、UI variants；最终把 prototype 放 throwaway branch |
| grilling | 1 | 1–22 | whole-frontier rounds，事实可由 subagent 异步补齐 |
| ask-matt | 2 | 1–90 / 1–55 | 150k smart-zone 与 `/clear`/`/compact`/`/handoff` 决策树 |
| wizard | 2 | 1–44 / 1–204 | 生成会写 `.env` 与 GitHub secrets 的交互 shell；无备份/回滚硬门 |
| wait-what | 1 | 1–7 | 只要求重述、补上下文、ASD-STE100、沿 CONTEXT 词汇 |

这 20 个 blob 的 lines/bytes/SHA/OID 已在本轮命令回执中单列；Round-2 evidence validator 必须按 HEAD OID 复读，不能引用本节摘要替代源文件。

## 4. 本地 live targets 与治理面

已完整读取且在当前 snapshot 锁定：

- 全局技能：tdd 3、codebase-design 3、resolving 1、teach 5、systematic-debugging 的 SKILL/CREATION-LOG/全部 references/scripts/tests。
- merge targets：skill-authoring、code-hygiene、registration checker、task-plan、plan-agent、tech-spec、brainstorm、handoff protocol、extraction bar、muse-req-triage、code-recon、quick-research、CHANGELOG。
- 治理/adapter：CLAUDE、AGENTS、routing map、model-routing、FUSION、BENCHMARK、hooks.json、全部 Codex agent TOML、Codex hook adapter 相关验证脚本。
- 审计血统：07-12 inventory + mapping matrix + FINAL-VERDICT-PACK + ORCHESTRATION-INTEGRATION；07-23 review/redteam/consensus；08-07 原 review/redteam/consensus；ADOPTED/adoption-log/pins/vetting/benchmark/gaps。

关键 frozen hashes：

```text
08-07 review       6425cb2937fe50bd2812d972a72cfd1721eea4b702034dbc984a67afced86a68
08-07 redteam      3d15f3a73b381b9274ba1936e54b534b7dfdc68599b780124f27edbd30218caf
08-07 consensus    66cc0f40c0e46d2ff0c3fe21144234efddeae242b68101975c3030ee1eb27c00
07-12 inventory    4e0d88b5dd77c2e7e2d4d60850081b85b3ac153d3a4fa66359bf90047f81688c
07-12 mapping      26e48dbe313fedb0e877b9917c3cbf7a6fbc68d0725ce3d34b6dcb60c606cf39
```

## 5. 行为探针，不把失败误当结论

- `check-registration-sync`: PASS（21 个一级 skill）。
- `check-routing-map`: PASS；`check-agents-parity`: 22/22 PASS。
- `verify-codex-wiring`: 沙箱内报告 18 PASS / 3 FAIL；拆分后证实 S10 是 `test-hooks.mjs` 未清 ambient `CODEX_*`，
  在清除这些变量后完整 PASS。
- 同一个 verifier 的 L1/L2 在沙箱内因 `Operation not permitted` 无法初始化 nested app-server，不能据此判 hook 失效。
  经用户批准在沙箱外运行只读 `codex exec`：exit 0，SessionStart/UserPromptSubmit/Pre/PostToolUse/Stop 全触发，
  `/tmp/luca-gstack-hooks.log` 从 77673 增至 78656 bytes，包含本仓 `session-restore/session-sync` 专属记录。
  因此“仓库 hook 失效”被反证；但 verifier 的环境分类与 S10 hermeticity 是确定的测试缺陷。
- 当前 Codex session catalog 明示 `tdd`、`systematic-debugging`，未列 `codebase-design`、`resolving-merge-conflicts`、`teach`；
  filesystem 同时确认后三者只存在于 `~/.claude/skills`。这不是 grep 推断，而是 catalog + target 双证据。

## 6. 仍未获准宣称的内容

- 哈希/EOF 不证明每条语义都被正确采用；需独立红队按 MP-001…047 逐票。
- Claude Code 本轮没有可调用的原生 session；Claude 的 catalog/真实触发不得写 PASS，只能以目录/历史 FM-11 为静态证据或标 `UNKNOWN-LIVE`。
- G0–G3 尚未实施；其 2×4 矩阵中的 live cell 都不能提前写 PASS。
- 该 ledger 仍需 fresh evidence redteam 复读后才能从 `ROOT-RECEIPT` 升为 `INDEPENDENTLY-REPLAYED`。

<!-- FILE_END: read-coverage-report.md -->
