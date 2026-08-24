# 题目

在 Final Plan 要求先冻结 canonical parent、再创建 exact package-only child commit、随后重跑 final checker 的前提下，`verify-final-handoff.mjs` 的正确 Git identity contract 应是什么，才能同时检测未授权 drift 与允许获批 package commit？

## 结论（先行）

正确合同不是永远要求 `HEAD == frozen_inputs.canonical_head`，而是只接受两个阶段态：pre-package 时 `HEAD == frozen_parent`；post-package 时 `HEAD` 必须是 `frozen_parent` 的单一直接子提交，且该 child 相对 parent 的变更路径 exact-set 等于 package allowlist、child 中每个包成员的 blob hash 等于冻结 bundle、没有任何额外路径；其余 HEAD 一律判 drift。Final Plan 明确先重跑 checker、经 G-PACKAGE 后只提交 exact allowlist、再从该 package commit 建隔离 worktree并重跑 TST-001，因此这是同一 E0 的两个合法身份态。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md#L166-L179]

`final-execution-manifest.json` 不需要把 `canonical_head` 改成 child；该字段应继续充当不可变的 `frozen_parent` 锚点。需要修的是 checker 第 159–162 行的单态等值判断，并同步更新 `final-source-bundle.sha256` 内 checker 自身的 hash；manifest 的语义和字段均可不改。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-execution-manifest.json#L17-L24] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/verify-final-handoff.mjs#L159-L163]

## 逐条发现

1. Final Plan 把 `dce92e6b8c91c617d086ac044e90187b68325fc6` 定义为 E0 要重验的 Luca HEAD，而不是“package commit 完成后 HEAD 永远不得变化”的终态；同一 Plan 又要求 G-PACKAGE 后创建一个 package-only commit。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md#L32-L39] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md#L166-L173]

2. G-PACKAGE 的批准载荷包含 package allowlist、cached exact-set、commit parent 和 unrelated dirty/untracked；用户批准的是“把 exact cycle2 package 物化为一个 commit”，所以 parent 与 exact diff 都属于 post-package 身份合同，不能只比较 child OID 与旧 parent OID。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md#L335-L340]

3. manifest 把 allowlist 真值指向 `final-source-bundle.sha256`，要求 source file 本身也进入提交、范围仅限 package root、禁止额外文件，并明确 staging 必须是 bundle 所列路径加 bundle 自身的 exact-set。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-execution-manifest.json#L148-L154]

4. ASSERT-001 要求逐成员核 hash，ASSERT-002 要求 cached path exact-set 等于 manifest allowlist，ASSERT-003 要求 stale checkout tuple 不变；TST-001 还要求从 package commit 的新 worktree 逐文件读回并确认 unrelated dirty/untracked 未进入 commit。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md#L143-L148] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md#L175-L179]

5. 当前 checker 已能解析 bundle、逐文件核 SHA-256、拒绝逃逸/重复项，并把 package 目录实际文件 exact-set 与 bundle 声明集合比较；但这些检查针对当前文件系统，Git 身份段只做 `actualHead === manifest.frozen_inputs.canonical_head`，没有 package-child parent/diff/blob 合同。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/verify-final-handoff.mjs#L130-L157] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/verify-final-handoff.mjs#L159-L166]

6. 单纯 `HEAD == frozen_parent` 在 post-package 必败：独立 TST-001 的目标提交是 `9806885b25eed703a9b4cc46325d7e289d932715`，checker 仍拿它与 manifest 的 `dce92e6b8c91c617d086ac044e90187b68325fc6` 做等值比较，结果 ASSERT-001 FAIL，且没有输出 PASS token。[源: /private/tmp/lucagstack-cycle2.Fndrqg/worktree/framework-audit/2026-08-09-mattpocock-handshake-cycle2/receipts/TST-001.json#L12-L30] [源: /private/tmp/lucagstack-cycle2.Fndrqg/worktree/framework-audit/2026-08-09-mattpocock-handshake-cycle2/receipts/TST-001.json#L46-L47]

7. Final Handoff 的时序同样是：只有 preflight checker PASS 才进 DEV-001；E0 的输出随后包括 package-only commit 和隔离 worktree；最终 acceptance 又要求 checker 零退出及 TST-001 独立 PASS，因此 checker 必须在 package commit 前后都可合法运行。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-HANDOFF.md#L54-L70] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-HANDOFF.md#L77-L83]

8. manifest 的 `frozen_inputs.hashes` 只冻结六个上游输入，并未保存 `final-source-bundle.sha256` 整文件 hash；它对 bundle 的合同是“按名称作为 allowlist source 并包含自身”，所以为双态身份修复 checker 不要求新增或改写 manifest 字段。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-execution-manifest.json#L25-L32] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-execution-manifest.json#L148-L154]

9. checker 本身是 bundle 第 75 个受保护成员；修改 checker 会使该行现存 hash `ea26c1fe...` 失效，必须更新该行。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-source-bundle.sha256#L75]

10. 更新 bundle 内 checker hash 会改变 `final-source-bundle.sha256` 整文件 hash；旧 TST-001 receipt 记录的 bundle manifest hash `8cb2856c...` 因而不能作为修复后 PASS 证据，必须由 fresh 独立重跑产生新 receipt。[源: /private/tmp/lucagstack-cycle2.Fndrqg/worktree/framework-audit/2026-08-09-mattpocock-handshake-cycle2/receipts/TST-001.json#L12-L16] [源: /private/tmp/lucagstack-cycle2.Fndrqg/worktree/framework-audit/2026-08-09-mattpocock-handshake-cycle2/receipts/TST-001.json#L46-L47]

11. bundle 不列出自身，checker 也显式把 `final-source-bundle.sha256` 从被声明成员集合中排除，所以更新 bundle 整文件不会形成自我 hash 递归；它仍须作为 manifest 规定的额外 allowlist 成员进入 package commit。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/verify-final-handoff.mjs#L148-L156] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-execution-manifest.json#L148-L153]

## 可机械验证的正确合同

1. 令 `P = manifest.frozen_inputs.canonical_head`，令 `A = bundle 声明路径集合 ∪ {final-source-bundle.sha256}`；`P` 保持冻结 parent 语义，不随 package commit 改写。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-execution-manifest.json#L17-L24] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-execution-manifest.json#L148-L154]

2. 合法 pre-package 状态：`HEAD == P`；同时按现有 bundle 规则验证工作区 package 的 required files、逐成员 hash、package exact-set，并验证 stale checkout HEAD 仍等于冻结值。任一失败即 FAIL。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/verify-final-handoff.mjs#L44-L57] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/verify-final-handoff.mjs#L130-L166]

3. 合法 post-package 状态：`HEAD = C`、`C != P`、`C` 恰有一个 parent 且该 parent 等于 `P`；这是对 Final Plan 所要求“一个 package-only commit”与 G-PACKAGE `commit parent` 的直接机械化。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md#L166-L173] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md#L337-L340]

4. 在 post-package 状态，必须断言 `changed_paths(P,C) == A`，路径无缺失、无额外项；不得只断言所有 changed path 都“位于 package root”，因为 manifest 明确要求 exact-set 且 `extra_files_allowed: false`。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-execution-manifest.json#L148-L154] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md#L143-L147]

5. 在 post-package 状态，必须从 commit `C` 的 tree/blob 读取 bundle 与每个成员，断言 blob SHA-256 等于 bundle 所列值，并断言 bundle 声明集合与 commit 中 package 文件集合（排除 bundle 自身后）完全相等；这样验证的是获批 child 的提交内容，而不是可能含未提交改动的当前工作区。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md#L175-L179] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/verify-final-handoff.mjs#L130-L157]

6. 两种合法状态都必须继续验证 stale checkout HEAD 等于 `manifest.frozen_inputs.stale_checkout_head`；任何 off-parent child、额外 descendant、merge commit、路径集合不等、blob hash 不等或 stale checkout 漂移均 FAIL。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-execution-manifest.json#L22-L24] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/verify-final-handoff.mjs#L159-L166]

7. 因此本次合同修复的最小语义范围是 checker 的 Git identity 分支；机械完整性范围还必须包含 `final-source-bundle.sha256` 中 checker hash 的更新。manifest 无须改；修复后的 package tree/commit OID 与旧 receipt 的 target/bundle hash会变化，必须重新生成独立 TST-001 证据。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-source-bundle.sha256#L75] [源: /private/tmp/lucagstack-cycle2.Fndrqg/worktree/framework-audit/2026-08-09-mattpocock-handshake-cycle2/receipts/TST-001.json#L12-L16]

## 未证实/边界

- 当前一手材料能证明 G-PACKAGE 是人类门，并冻结其载荷形状，但没有一份受 checker 验证的签名 approval receipt；因此 checker 能证明“child 满足获批载荷的结构与内容”，不能仅凭仓内 manifest/checker 证明某次真实人类批准确已发生。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-execution-manifest.json#L133-L137] [源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md#L337-L349]

- 若威胁模型包含攻击者同时改写 child 内的 checker、bundle 与全部 payload，现有材料没有提供位于该 child 之外的不可变 bundle digest 或签名锚；对这种对抗性篡改的抵抗能力未证实。独立 receipt 明确标记 `harness_signed: false`。[源: /private/tmp/lucagstack-cycle2.Fndrqg/worktree/framework-audit/2026-08-09-mattpocock-handshake-cycle2/receipts/TST-001.json#L1-L5]

- 修复后的 Git 历史应通过重建单一 child、amend、还是新增 repair descendant，属于新的授权/执行选择；Final Plan 的既有合同只允许 `P` 的一个 exact package-only child，且禁止用 reset 纠正，所以本研究不替用户选择历史改写方案。[源: framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md#L166-L173]
