# Red Team B — Recovery / Durability / Fresh-Session Executability

Target: `framework-audit/2026-08-19-rule-execution-recovery-handoff/FINAL-SESSION-HANDOFF.md`  
Target SHA-256: `0cd1a137be6e4d8985ceb2854304ae26e7c4804d018d28e200d75914ca527e98`

## P0

### P0-001 — 当前启动序列在 blocking checker 与前置 human-gate 链未可验时仍跨入实施

证据：

- Target L137–L152 明记 Cycle 2 final-handoff checker 为 exit `1` / `FINAL_HANDOFF_GATE_FAIL`，REX final-plan checker 为 exit `1` / `proposal expired`；Target L8–L9 又明记本 handoff 不是 implementation authority 或 human-gate approval。
- Target L202–L218 仍要求 fresh session 创建 execution worktree、重跑测试、重建 U014 并进入 TST-014 PRE，即实际跨过了当前失败门。
- Recovery tip 唯一持久 G-PACKAGE descriptor 的 SHA-256 为 `e59eb3742895a05166b2a65f49ef3befc87930bb488ea9379f9ed394f4dc93fb`，其状态仍是 `AWAITING_TST_PRE_AND_USER_APPROVAL`，且 `expires_at=2026-08-18T05:02:48Z`；branch 中没有 G-PACKAGE result/binding receipt。
- `execution/G-PLAN-RESULT.json` 只打开 `U-001 PREP` 和 `TST-001 PRE`，并明确列出它不打开 `G-PACKAGE`、`G-CONTAIN`、`G-OBLIGATION-SCOPE`、`G-ACTIVATE`、`G-REMOTE`。Target L204–L209 要求的是 TST evidence denominator，没有对这些已经跨过的 human gates 做等价的可验性裁决。

如果成立的影响：fresh session 严格尊重 blocking gate 时会立即停滞；照 handoff 继续时则会在未可验的授权链上构建 U014/U015，后续 `RULE_EXECUTION_VERIFIED` 和根 Goal 终态都不成立。

### P0-002 — Surviving G-OBLIGATION-SCOPE 链被 handoff 遗漏，而其根身份已被自身 verifier 拒绝

证据：

- 本机仍存在已批准 U009 root：`/Users/luca/.luca/framework-audit-evidence/REX-20260811-001/u009-3188148.XlLYVg`。其 proposal/binding/result SHA-256 分别为 `09cc3922205220bb403c0e070b7d35fa3978f5fff34e315ec4280ec66edfb306`、`c578e8a082ccd54a38daf028f6330ff42c8764acee2a0225cea4b5e2c92b4364`、`5d4f99b132bed2a85513ae979b17f35968c1541a82691ad40d5491f5248371ed`；approved census/implementation receipt/post-state 分别为 `c27abc72cdbc34e78be4e40018eaa1f90f216a43f495ce89e71717f954b84107`、`3c1c7cb59818167d450c3c8adbe3bdb396737764918ef4f98ce1969a6a22e30c`、`4ab18426c979b07666f243c90f2f002ddcdfeeed5bfac95e5972de2164398b4d`。
- 三份 gate 文件都绑定 `receipt_root={dev:"16777230",ino:"132828101"}`；2026-08-19 用 Node `lstatSync(...,{bigint:true})` 读回同一物理路径为 `{dev:"16777233",ino:"132828101"}`。同样的 device-only drift 存在于另两个 U009 roots。
- Recovery tip 的 `.claude/hooks/lib/human-gate-contract.mjs` SHA-256 为 `07013d3d23c5374abc0abb3f28d25e58ec3f735edc077b3637abb834b28bab9d`；其 `safeRead` 按 dev+ino 精确比较 root identity，不等即抛出 `receipt root identity mismatch`，verify path 也再比对 proposal 内的 root tuple。
- Target L25–L26、L176–L177、L204–L209 只将证据归为“丢失/外部 log 恢复/重生”，完全没有指出该 surviving root、它的字节价值、当前 identity mismatch 或其 `UNKNOWN/BLOCKING` 身份；L210 随后直接进入 U014。

如果成立的影响：接手者可能把尚存的授权原始字节当成不存在，也可能反向把已无法通过根身份校验的 result 当成当前可复用 PASS。两种分支都无法为依赖 G-OBLIGATION-SCOPE 的 U010–U015 建立连续、可机械重放的门禁链。

### P0-003 — “stale checkout 绝不写入”与已授信的自动 hook 实际执行面直接冲突

证据：

- Target L130–L133 规定 `/Users/luca/Desktop/luca_gstack` 是 stale read-only reference，“Never align, pull, or write it”；L236 再次禁止写它。
- 当前 canonical `.codex/hooks.json` 的 6 条 SessionStart/UserPromptSubmit/PreToolUse/PostToolUse/Stop/SessionEnd 命令全部内联 `MEMORY_ROOT=/Users/luca/Desktop/luca_gstack`；recovery tip 的 `.codex/hooks.json` 也指向同一路径。
- `node scripts/codex-trust-hooks.mjs --dry-run` 读回“本仓条目 6 个（其中待授信 0）”且 6 条均为 `[trusted]`。`.claude/hooks/session-restore.mjs` 的实行合同明记 episodic/semantic 读写及 daily governance 都落到该 `MEMORY_ROOT`。
- 这些 lifecycle hooks 可在 fresh agent 执行 Target L193 之前或 Stop 时自动触发；文档中的“不写”句子不是对该已授信命令的机械禁止。
- 当 fresh Codex 以 canonical repo 为 cwd 启动时，repository hook 发现与 SessionStart 早于主 agent 读取 handoff；因此任何 repo-internal “先读取再遵守”的步骤都无法在时序上拦住第一次 hook。能证明 zero-write 的 bootstrap 边界必须早于 repo hook discovery，而 Target L193 以 repo 内阅读作为第一步，没有这个先行边界。

如果成立的影响：按 copy-paste prompt 从 canonical repo 内启动的 fresh session，可在主体尚未进入恢复步骤时就自动写入用户明确定义为 read-only 的 stale checkout，同时污染后续用来证明“不曾触碰 stale”的状态基线；一个已进入 repo hook 边界的 agent 无法再追溯性证明该零写入前置。

### P0-004 — Surviving recovery ancestry 已携带受保护 WIP，handoff 却把整个 tip 呈现为可继承实施边界

证据：

- Target L88–L99 把 9 个 tracked WIP paths 定义为受保护用户/并发状态；L103–L118 又将整个 `29282803bd5f31064819de34c19a2e1663247b66` 称为“implementation through U013”的 durable recovery boundary。
- Recovery commit `43fef9c9699a2bd3bb33a99de997bd020985d7bb` （`chore(governance): preserve protected cycle2 wip`）直接提交 `.claude/observability/observations.jsonl` 和 `.claude/skill-os/capability-parity.json`；final tip `29282803...` 又提交受保护的 `.claude/hooks/session-sync.mjs`。
- Recovery tree 携带 9 个受保护 path 的版本；其中 `route-guard.mjs` 与当前 canonical WIP SHA-256 为 `daff1b99a17e2c6bb14dce9246b289b66d9b299377be539bb7d538529890e3bf` vs `d1c8d04490485ee2a097cad175c78ca78c37811d077f9d2537873bedfe1f525b`，`session-sync.mjs` 为 `4db5e1d2c152c0097cd1118c160450b45edd2deb769ab9813c2b2a7246341664` vs `f55cbdd12249d1edd7a7ca7e6db31cea1514723dbe643179ce4eba6a116b6343`，其余多个受保护 path 也不同。
- Target 没有为这些已在 ancestry 内的 hunk 提供 commit/hunk owner 身份；L219–L220 又把“完整 ancestry”的 G-REMOTE 作为后续终端。

如果成立的影响：fresh session 可能把用户/并发 WIP 错当成 REX-owned 实施，并在未显式展示该属性的情况下将其带入后续完整 ancestry 发布；反向合并时也可能覆盖 canonical 中已分叉的受保护字节。

## P1

### P1-001 — Evidence denominator 漏掉了唯一存活的全局 U008/U009 evidence forest

证据：

- `/Users/luca/.luca/framework-audit-evidence/REX-20260811-001/` 下现存 13 个 mode `0700` 的 top-level roots：10 个 `u008-*` 和 3 个 `u009-*`。Target 的“survived/did not survive”、全局 freeze 和 evidence-denominator 段均未列出该 forest。
- 最终 U008 commit 的 root `u008-83adec9.yUSHyU` 仍有 8 份 Claude/Codex × plan-agent/work-agent/oracle/quality-gate receipts、raw native logs、signed summary 和 consumption record。Summary SHA-256 为 `3620bca8d1e39553d683bbb9a904d210a24bbedcac2a164dc3cf539fdc859cb5`，consumption SHA-256 为 `139cad0c7ed2da8c5855cc75d4d76b1fc58095787ae01d207959bf497b67591f`。
- 该 U008 transaction 已 expired 且 already consumed，所以它不是 fresh PASS；但它仍是确定何种 native evidence 实际存在、哪个 commit 曾被消费验证的原始取证材料。Target L204–L209 只给出“外部 session logs 或重生”二分法。

如果成立的影响：新 session 构建的 denominator 从起点就不完整；它既可能错过对历史原始证据的独立审核，也可能不知情地把唯一存活原始材料留在未冻结、未纳入 handoff 保护的全局路径。

### P1-002 — Canonical freeze 已漂移，且强制 startup 本身会修改被 freeze 的 tracked state

证据：

- Target L76–L86 记录 post-handoff porcelain SHA-256 `6792abf19e3c18e2b6ec91e1697160c5198644cc0dd4c1e9ce327511f0c316f9` 和 working diff SHA-256 `af2f466f7351d579e9990855899ace1ea7e159286285bc84e891976e14d589af`，并声称只有 9 个 tracked WIP paths。
- 在本 Red Team artifact 写入之前，实测 porcelain SHA-256 已为 `0f7fd172e27ecfbc28cfb7b62625e875fccb19895e0c7d1012c0463e6b46d649`，working diff SHA-256 为 `5655f6e03fbf570041be2bfee2910e4a32ec9452d1cef0f333fc900a91cec5da`，tracked dirty 为 11 个；额外两个是 `memory/episodic/index.jsonl` 和 `memory/retrieval-log.jsonl`。
- Target L193 要求读取 mandatory startup context；AGENTS.md 的同一 startup contract 要求 task-related `search_memory.py`。本次严格 startup 在 `17:02:13` 和 `17:02:43` 向 tracked `memory/retrieval-log.jsonl` 追加了两条记录。
- Target 只提供聚合 diff/status hash 与 9 个路径名，没有可用来定位“哪些字节是 capture 后新生”的逐路径 byte hash/snapshot。

如果成立的影响：fresh session 完全照 handoff 启动也会自己造成 baseline drift；之后既无法把自动日志与用户/并发修改可机械分离，也无法证明“re-freeze”没有静默吸收 unknown tracked bytes。

### P1-003 — Handoff 未区分 canonical authority bytes 与 recovery worktree 中的已改写 authority bytes

证据：

- Target L55–L63 锁定 canonical Cycle 2 Final Plan/Handoff SHA-256 为 `19711435e97eb4c7f27b2185bb5f9b6bfe8f04d78d160be73e78ff8c8afacf28` 和 `57436e3496c641ee0b8393dc7cc569c334a7a5771c18e68b687d7a03f0d507ad`。
- Target L112–L118 要求从 recovery tip 建立 fresh worktree；该 tip 中同两个 path 的 SHA-256 分别是 `4bfbfed81496fe53174a73bc4242b1b0043cc01292db636c379e0dd1892c12d7` 和 `9f7837c44f9c3ef85d00f219e5beee5479bd7d05b5a8a71429d5aa20cce0b0d3`。Manifest 和 defer register 则两端保持与 Target 一致。
- Target 没有声明这是两组不同用途的 authority/patched-pointer bytes，也没有在 fresh worktree 阅读顺序中标出哪一份仅为 recovery delta 的产物。

如果成立的影响：接手者在 canonical 与 execution worktree 中会对“同 path 的唯一权威”得到相反 hash，并可能把预期 patch 误判为篡改，或把 recovery 内的改写版本反向升格为原始 Cycle 2 权威，从而错过/重开 shared-owner 义务。

### P1-004 — Global containment 声明只有裸 hash，无法从 handoff 唯一确定对象、路径、mode 和授权链

证据：

- Target L154–L168 只列 live stub/unsafe backup/journal 的三个 SHA-256，没有给出前两者的 exact object path，也没有给出 journal path、object type、mode、descriptor/nonce/approval locator。
- 实际 journal 是 `/Users/luca/.luca/quarantine/resolving-merge-conflicts/20260811T055628Z-c7c9ba81362a/containment-journal.json`，mode `0600`、SHA-256 `a3c30778b30c12dd1329b162aa8afc8d6279dc572e33ed6e9f76617a34e09592`。它给出 live target、backup target、descriptor SHA `7dcdc8833c0ee2df2155d90acaa24f9ff616b496dbba93112381fb13603fe7fe`、nonce、approval turn ID 及 transcript offset。
- Journal 只记录 approval receipt SHA `c290ca8271fb1c13782fdf241da67a0b75838d6412fe294c76b6e667d94b038f`；在 canonical 与 `/Users/luca/.luca` 中全文检索该 SHA 只命中 journal，未找到 receipt object 本身。
- 当前 live path 是 `/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md`，backup 是 `.../unsafe-original/SKILL.md`；这些可机械读回事实无法仅由 Target 的三个裸 hash 重建。

如果成立的影响：fresh session 无法证明它读的正是原 G-CONTAIN 的 exact live/backup/journal 三对象，也无法从 handoff 自足地验证授权绑定、回滚对象和不可发现 backup 约束；TST-002 POST 因此只能保持 `UNKNOWN`。

### P1-005 — 当前 handoff 本身仍是无外部锚定的 untracked 单文件，也未绑定本轮两份红队与最终 closure

证据：

- `git status --short --untracked-files=all` 将 target 显示为 `??`；target 旁无 committed manifest/sidecar 绑定它的 SHA。
- Target 的 copy-paste prompt L247–L260 只给路径，不给期望 target SHA-256；target 文本内也没有一个能避免 self-hash 循环的外部 integrity anchor。
- Target 生成于本轮 Red Team A/B 之前，当前文本没有两个红队 artifact path/SHA、remaining count 或 closure token；即它现在不能证明用户要求的“两红队对抗后最终握手”已发生。

如果成立的影响：同一 path 在之后被改写、截断或替换时，完全 fresh 的接手者无法仅凭 handoff 辨认它是否仍是本次被审 target，也可能把 pre-redteam 版本误报成 final handshake。

## P2

### P2-001 — 34 个 surviving commits 没有与 U/TST/owner 的精确对应，丢失 U014 的“6+2”也没有 path identity

证据：

- Target L108 只给 `34` 个 recovery-only commits，L118 将其整体称为“through U013”；实际 ancestry 包含 U006/U008/U012 的多轮 repair commits、generic `fix(...)` commits 和前述 protected-WIP commits，handoff 没有 commit→unit→author/tester→receipt-state 对应。
- Target L27–L28 声称 U014 丢失的是“6 个新文件+2 个 tracked modifications”，但没有列出这 8 个 path 或能证明该分母的 surviving source；REX DEV-014 只列职责类别，不能反推唯一的原 path set。

如果成立的影响：fresh session 无法凭 handoff 区分最终有效 commit 与中间失败/repair commit，也无法对 U014 重建后的文件分母与“6+2”声明做机械等价比较，容易跳步或重复验证错误 commit。

### P2-002 — Copy-paste terminal 少了 MPC2 唯一完成 token，三个 checker 也没有固定精确命令

证据：

- Target L221–L225 和 copy-paste prompt L258–L260 要求 MPC2 CO-01..CO-11/DASSERT 12/12，但均没有保留 Final Change Order 规定的唯一 task terminal `MPC2_CHANGE_ORDER_INTEGRATED`。
- Target L200–L201 只说“Re-run all three current checkers”；L137–L148 给出结果类别而未固定三条 exact command/path 与 unique-token 判定。

如果成立的影响：接手者可能在 CO/DASSERT 表面齐全时跳过 MPC2 独立终态，或使用非权威 checker/非唯一输出条件把静态存在误报成 gate PASS。

REDTEAM_B_OPEN  
Remaining counts: `P0=4 / P1=5 / P2=2 / P3=0`  
Target SHA-256: `0cd1a137be6e4d8985ceb2854304ae26e7c4804d018d28e200d75914ca527e98`

## Closure Review B — 2026-08-20

Reviewed target SHA-256:
`a643f2d7c5d210f3b6bcfc283a734db0e835cba412ca9af1ce56565d4d8a714d`.

### Original-finding adjudication

| Original finding | Disposition |
|---|---|
| P0-001 | RESOLVED — the revised DAG stops on the two failing root checkers, adjudicates the REX gate chain, and forbids entering U014 before valid gates and independent TST receipts. |
| P0-002 | RESOLVED — the surviving U009 proposal/binding/result/census/implementation/post-state bytes, stored and current device/inode tuples, bounded approval transcript locator, and non-fresh-valid disposition are explicit. |
| P0-003 | RESOLVED — `SAFE-BOOTSTRAP.md` requires a neutral pre-hook-discovery cwd and the absolute verifier before any repository startup. |
| P0-004 | RESOLVED — the old recovery ref is mechanically frozen as `FORENSIC_ONLY_NOT_EXECUTION_BASE`; the revised DAG requires an independent neutral clone and an eight-path owner/hunk matrix. |
| P1-001 | RESOLVED — the 13-root/188-file external forest, deterministic inventory hash, final U008 root, and approved U009 root are frozen with their historical-only dispositions. |
| P1-002 | REMAINING — see the finding below. |
| P1-003 | RESOLVED — the current REX-patched Cycle 2 Plan/Handoff hashes are explicit, and older hashes are labeled lineage rather than current authority. |
| P1-004 | RESOLVED — exact live/backup/journal paths and hashes, journal descriptor/nonce/approval lineage, absent discovery routes, and the no-reopen rule are explicit. |
| P1-005 | RESOLVED SUBJECT TO FINAL MANIFEST REBIND — target, sidecars, verifier, and both red-team artifacts are a six-artifact manifest set; verifier requires both SHA-bound zero-remaining closure blocks. The current pre-closure manifest correctly cannot PASS yet. |
| P2-001 | RESOLVED — the 34-commit ledger maps every surviving commit to a unit and reachability state, records verification accountability as UNKNOWN, and explicitly rejects reuse of the lost U014 `6+2` denominator. |
| P2-002 | RESOLVED — all three exact checker commands and the terminal chain `RULE_EXECUTION_VERIFIED` → `MPC2_CHANGE_ORDER_INTEGRATED` → `EVOLUTION_VERIFIED` are explicit. |

### P1-002 — Mandatory startup still mutates the canonical freeze before ownership adjudication

Evidence:

- `SAFE-BOOTSTRAP.md` step 4 requires the fresh session to fully read canonical `AGENTS.md`,
  `CLAUDE.md`, and their mandatory startup context; the target's copy-paste prompt repeats that
  requirement.
- Canonical `AGENTS.md` §2 requires task-related
  `python3 memory/scripts/search_memory.py "<task/skill/topic>" --limit 5`; canonical `CLAUDE.md`
  Session startup step 0 likewise requires that search after the concrete task is known. The
  copy-paste Goal makes the concrete recovery task known immediately.
- `memory/scripts/search_memory.py` defines the tracked canonical file
  `memory/retrieval-log.jsonl` as `RETRIEVAL_LOG`; `log_retrieval()` creates its parent and opens it
  in append mode, and the normal search path calls `log_retrieval()` after computing results. The
  file is confirmed by `git ls-files --error-unmatch memory/retrieval-log.jsonl`.
- The neutral cwd does not redirect that write: `MEMORY_DIR` is derived from the canonical script's
  own repository root. The handoff provides no read-only invocation or explicit startup exception.
- This conflicts with the target prompt's "do not ... change live files until authority, gates,
  evidence and the eight-path owner/hunk matrix are adjudicated" boundary. The captured canonical
  state has empty tracked working/index diffs and exactly 45 untracked paths.

If this holds: a fresh receiver cannot obey both contracts. Running mandatory startup introduces a
new tracked canonical delta before the first owner/gate adjudication and invalidates the clean
45-path freeze; refusing the write violates mandatory startup and leaves the recovery sequence
blocked or interpretation-dependent. The handoff is therefore not yet unambiguous fresh-session
execution authority.

REDTEAM_B_OPEN  
Remaining counts: `P0=0 / P1=1 / P2=0 / P3=0`  
Target SHA-256: `a643f2d7c5d210f3b6bcfc283a734db0e835cba412ca9af1ce56565d4d8a714d`

## Closure Review B — Round 2 — 2026-08-20

Reviewed target SHA-256:
`ae8606a5273b1d091b3d18df1460e541c8033b47ae6876b94ce2fbadfff288eb`.

The previous B remaining `P1-002` is resolved for this target: the bootstrap now requires a local
`--no-hardlinks` clone detached at exact canonical HEAD and runs both mandatory memory commands with
`MEMORY_ROOT` bound to that clone. `search_memory.py` and `get_memory.py` both honor that absolute
root through `_memroot.resolve_memory_root`; current canonical/stale status hashes remain
`9f5ee243cac375ad83e84ecd3d62ce916d71cbee2941ab5dd865aaf6130ed549` and
`50ef74f5f7672bab82bc39b6bae7e500bcfa21f56825386a068eb171c9ab8c8b`.
The earlier ten resolved findings remain resolved. The revised verifier also reached its final
red-team-closure check after mechanically recomputing the 45-path freeze, worktree/ref census,
eight-path overlap, regular-file inventory, excluded non-regular path set, bounded transcript,
authority bytes, stale state, and containment; its Git calls now disable optional locks.

### B-R2-P0-001 — The gate does not mechanically reject an unsafe repository/stale cwd

Evidence:

- `SAFE-BOOTSTRAP.md` defines neutral pre-repository-hook startup as the safety boundary because the
  six trusted lifecycle hooks can run before the agent reads instructions and target the stale
  checkout.
- `verify-recovery-handoff.mjs` validates that the manifest names a neutral root and forbidden
  roots, but never compares `process.cwd()` with that neutral root or rejects either forbidden cwd.
- The same absolute verifier was run from
  `/Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap`, canonical
  `/Users/luca/Desktop/项目/muse/lucagstack`, and stale `/Users/luca/Desktop/luca_gstack`.
  All three traversed every state/evidence validation and failed at the identical final condition:
  `RECOVERY_HANDOFF_GATE_FAIL: redteam A must contain exactly one final closure block`.
- Because closure validation is the final check in `main()`, that identical result proves the
  verifier itself does not distinguish a safe neutral invocation from either forbidden invocation.
  A final-state hash match cannot prove that a repository SessionStart hook did not write before the
  verifier began and later leave the same bytes.

If this holds: a fresh receiver can start inside canonical or stale, cross repository-hook discovery
before reading the safety contract, and still obtain the same future handoff PASS as a neutral
receiver. The machine token therefore cannot prove the pre-hook zero-write condition on which the
stale-checkout protection and recovery before-state rely.

### B-R2-P1-001 — Inherited Git repository selectors can override the verifier's `git -C` target

Evidence:

- `gitBytes()` invokes `git --no-optional-locks -C <repo>` with
  `env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }`. It preserves inherited `GIT_DIR`,
  `GIT_WORK_TREE`, and `GIT_INDEX_FILE`.
- From neutral cwd, injecting `GIT_DIR=/Users/luca/Desktop/luca_gstack/.git` changed the verifier's
  failure to `canonical HEAD drift`; injecting
  `GIT_INDEX_FILE=/Users/luca/Desktop/luca_gstack/.git/index` changed it to
  `canonical porcelain-v2 status drift`. These two mechanical probes prove that `-C` does not
  neutralize the inherited selectors and that the verifier reads the selected Git metadata.
- A mismatching alternate fails, but an alternate Git dir/index carrying the frozen HEAD/index
  bytes can satisfy the same comparisons while the declared repository's actual metadata differs.
  The current safe-bootstrap commands likewise contain no inherited-selector boundary.

If this holds: an inherited packaging/worktree environment can make the handoff gate inspect the
wrong refs or index, causing either an unexplained bootstrap block or a false state PASS against a
matching alternate metadata snapshot. The gate is not hermetic enough to certify the declared
canonical/stale Git state from a completely fresh shell context.

REDTEAM_B_OPEN  
Remaining counts: `P0=1 / P1=1 / P2=0 / P3=0`  
Target SHA-256: `ae8606a5273b1d091b3d18df1460e541c8033b47ae6876b94ce2fbadfff288eb`

## Closure Review Round 3 — target `a180a095bd69a1c0af86e66a9b53379b7a7578032f11ef4baa9491138082d4f6`

The Round-2 unsafe-cwd and inherited-Git-selector findings are resolved in this revision: the
verifier rejects canonical/stale cwd before its first Git read, rejects the manifest-bound set of
15 inherited repository-local Git variables, and strips that set again from child Git calls. The
isolated startup-memory clone also prevents the mandatory memory commands from touching canonical
or stale. One new durability contradiction remains.

### B-R3-P1-001 — The startup-memory clone is both a known write target and the required read-only comparison root

Evidence:

- `SAFE-BOOTSTRAP.md` points `MEMORY_ROOT` at the disposable clone for both mandatory memory
  commands. `search_memory.py` appends its retrieval record beneath that root, so this procedure
  intentionally changes the clone worktree before reconstruction begins.
- The target DAG nevertheless instructs the receiver to keep that same neutral clone read-only for
  comparison and offers no separately frozen clean comparison root.
- A detached exact commit preserves commit identity, but it does not make the clone's working tree
  immutable or clean. The handoff therefore assigns one worktree two incompatible evidence roles:
  permitted startup write sink and uncontaminated forensic baseline.

If this holds: a fresh receiver cannot follow both instructions literally and cannot tell whether a
later comparison difference is recovered source state or bootstrap-generated memory noise. Any
owner-matrix, dirty-overlap, or package-boundary decision that treats this clone as clean evidence
can inherit an unrecorded local mutation and cease to be independently reproducible.

REDTEAM_B_OPEN  
Remaining counts: `P0=0 / P1=1 / P2=0 / P3=0`  
Target SHA-256: `a180a095bd69a1c0af86e66a9b53379b7a7578032f11ef4baa9491138082d4f6`

## Closure Review Round 4 — target `70029c7af60aa95e71275b2f2db87c31d750b7e44b0fab6eabf4ce22681b80cf`

### B-R4-P1-001 — The frozen upstream endpoint is not part of the live-state gate

Evidence:

- `RECOVERY-STATE.json` freezes both `upstream_fetch_url` and `upstream_push_url` as
  `https://github.com/wangmoumou1216-ai/luca_gstack.git`; the reserved final task later executes
  `git fetch upstream main` and reads `upstream/main` by that symbolic remote name.
- `validateStateClaims()` recomputes the registered-worktree bytes and sorted `show-ref` bytes, and
  `validateCanonical()` checks the existing `refs/remotes/upstream/main` object ID. No verifier path
  reads or compares either frozen URL; `upstream_fetch_url` and `upstream_push_url` occur only in the
  state sidecar.
- The live URLs currently match the freeze, but they are stored in `.git/config`. Changing a remote
  URL or push URL does not itself change HEAD, tree, worktree status, index, or `show-ref`, so every
  live Git assertion implemented by the gate can remain identical while the endpoint differs.

If this holds: the handoff can emit its integrity token after `upstream` has been redirected. The
reserved cross-session fetch can then ingest a different declaration/history, and a later
`G-REMOTE` can target a different push endpoint, without producing the owner delta or gate stop the
handoff promises. The machine token therefore does not certify the remote identity on which its
last integration task depends.

### B-R4-P1-002 — The second-clone command depends on a shell-local wrapper that has already expired

Evidence:

- `SAFE-BOOTSTRAP.md` defines `clean_git()` inside the step-6 code block, uses it to create the
  disposable memory clone, and then requires the agent to finish mandatory context reads.
- Step 7 is a later, separate code block. It calls `clean_git` three times to create and inspect the
  clean comparison clone, but does not define the function in that block or bind it to a durable
  executable.
- Claude/Codex shell-tool calls do not preserve a function from one completed shell process into a
  later call. A mechanical two-call probe defined the exact function successfully in call one;
  `typeset -f clean_git` in call two exited `1` with no definition. Thus the step-7 block is not an
  independently executable command sequence in the named receiving harnesses.
- The same bootstrap forbids unsanitized Git commands. After the missing function, a strict receiver
  therefore has no exact command it can execute to reach the mandatory clean comparison root.

If this holds: a fully fresh receiver stops before the owner/hunk adjudication, or improvises a raw
Git invocation and loses the inherited-environment/optional-lock boundary that the handoff treats
as safety-critical. The recovery DAG is not yet copy/paste durable across the Claude/Codex tool
process model it claims to support.

REDTEAM_B_OPEN  
Remaining counts: `P0=0 / P1=2 / P2=0 / P3=0`  
Target SHA-256: `70029c7af60aa95e71275b2f2db87c31d750b7e44b0fab6eabf4ce22681b80cf`

## Closure Review Round 5 — target `46e194a110f170f7a135014cbd7ab91355669f820fe8b69c702c0c2659405514` (superseded)

The original eleven findings and all later B findings are resolved for this exact target. In
particular, the manifest now freezes the reserved `upstream` fetch and push URLs and the verifier
compares both live values before recovery/ref/stale validation; a neutral invocation traversed that
check and every later live/state/evidence check before stopping only on Red Team A's now-stale
target binding. The bootstrap now defines `clean_git`, creates both physically independent clones,
runs clone-bound memory retrieval, and checks the clean comparison root inside one self-contained
shell block. It explicitly rejects function persistence assumptions and requires the exact wrapper
to be re-declared in each later tool call. Wrong-cwd and inherited-config negative probes still fail
before Git, while the sanitized wrapper reads the frozen canonical HEAD and exact upstream URLs.

This round was superseded when an independent cross-review showed that single-value remote checks
did not reject additional fetch/push URLs. Its former machine closure was removed after the target
drift and carries no current closure status.

REDTEAM_B_SUPERSEDED_BY_TARGET_DRIFT  
Remaining counts for that target after cross-review: `P0=0 / P1=1 / P2=0 / P3=0`

## Closure Review Round 6 — target `6bc067460231dc0ed61c7401d66b584b2522b9a882caa30c297b65e86aa2c448` (superseded)

All original and later B findings are resolved for this exact target. The remote check now reads
both `git remote get-url --all upstream` and `git remote get-url --push --all upstream`, then exact-
compares each ordered result to a singleton manifest array. The live fetch and push lists each have
exactly one entry, the frozen GitHub URL. A neutral verifier invocation traversed verifier/artifact,
authority, containment, canonical, exact remote-list, forensic recovery, stale, bootstrap,
worktree/ref, overlap, external-evidence, U009, transcript, and completion-boundary validation, and
stopped only because Red Team A has not yet added its closure for this latest target. The
self-contained two-clone bootstrap, per-call Git wrapper rule, wrong-cwd refusal, inherited-config
refusal, protected stale state, forensic-only boundary, exact human gates, and terminal chain remain
intact. No new P0–P2 remains.

This closure certifies only recovery-handoff completeness and fresh-session executability. It does
not authorize implementation, satisfy any TST or human gate, complete REX/MPC2/Cycle 2, or emit a
Goal terminal.

The later mandatory self-growth extraction changed the frozen target/state package, so this
target-bound closure is historical only.

REDTEAM_B_SUPERSEDED_BY_TARGET_DRIFT  
Remaining counts for that target: `P0=0 / P1=0 / P2=0 / P3=0`

## Closure Review Round 7 — final target `ac66b0808b44fe04192ae8fbd0270e4db93d03e685c243646aa374ba2bcc8f29`

All original and later B findings remain resolved for these final bytes. The new freeze binds the
mandatory framework-meta extraction without converting it into implementation evidence: semantic
candidate `SC-20260820-001` remains `CANDIDATE`, meta episode `EP-20260820-133` and its raw file are
present at their exact hashes, the then-empty unlock marker was hash-bound, and
`completion_effect` remains `NONE`.

Independent live recomputation matched the canonical HEAD/tree/upstream values, the complete
tracked binary diff SHA-256
`17077a26b71cd2b60a1d9980e68406ca680d9bd6537c4b82795cd7f4abda0c84`, empty cached diff, porcelain
SHA-256 `2ac0d65c4561af1f490bc2937ecf5a9b362720754da15289370ac412e57d912f`, exactly 47 status paths,
exactly 45 untracked paths, and exactly the two declared tracked episodic paths. The ignored
candidate, raw episode, and unlock marker are nevertheless bound by exact path and bytes through
the state sidecar. The stale checkout retained its frozen HEAD/tree/status/worktree/index hashes;
no stale write was observed.

From the exact neutral cwd, the verifier traversed the new extraction, canonical diff/status,
authority, singleton fetch/push URL, forensic-only ref, stale, containment, external-evidence,
U009, transcript, bootstrap, overlap, and completion-boundary checks, then stopped only on Red Team
A's expected prior-target binding. Separate negative probes still rejected canonical cwd and an
inherited `GIT_CONFIG_GLOBAL` before Git state validation. The three root checkers also retain the
honest frozen results: Cycle 2 fails with seven findings, REX fails on source-manifest path drift,
and MPC2 passes only its change-order definition gate.

No new P0–P2 remains. This closure certifies only recovery-handoff completeness and
fresh-session executability. It does not authorize implementation, satisfy a TST or human gate,
complete REX/MPC2/Cycle 2, or emit a Goal terminal.

REDTEAM_B_SUPERSEDED_BY_POST_CLOSURE_DELTA  
Remaining counts: `P0=0 / P1=0 / P2=0 / P3=0`

## Post-Closure Delta Review — state `295f780f851e8d67afec32c52d341e37ea135cfd268bfedb2f2ffc6e1416c6b3`

The marker delta itself is bookkeeping only. The ignored marker is exactly seven ASCII bytes
`401 199` (hex `34 30 31 20 31 39 39`) with SHA-256
`a015e4528ba717b865a1dc5453fdc8c44b65cb98c472cf99ee5f6737a9898e10`; the state binds those bytes,
keeps all three completion claims false, and retains `completion_effect: NONE`. Independent
recomputation found no canonical HEAD/tree/worktree/index/status or stale HEAD/tree/status/diff
drift. The neutral verifier emitted the sole token `RECOVERY_HANDOFF_GATE_PASS` against the
provisional rebind.

### B-D1-P1-001 — The neutral new-session prompt freezes the pre-delta manifest SHA

Evidence:

- `/Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap/NEW-SESSION-PROMPT.md` has SHA-256
  `990f0d676401106446fbb2ddf720efdc531ac709751434e33f89bdb12285ce33`, but its “最终冻结值” section
  declares Manifest SHA-256
  `a7b73e6e4aa7a9d7fdfc2742b8be2200f6f085198c57bcf303120b676d5550f6`.
- The current manifest that binds the new state is SHA-256
  `b4f4bae83f4fdc71fc2aca22013523bac0462fbc2a5817f78a7549ca9ee784a4`; it binds state SHA-256
  `295f780f851e8d67afec32c52d341e37ea135cfd268bfedb2f2ffc6e1416c6b3` and the current A/B artifacts.
- The verifier can still PASS because it reads the current manifest by repository path and does not
  read or bind the repository-external prompt. The prompt therefore presents a contradictory
  integrity value even while its first command succeeds.

If this holds: a fully fresh receiver must either stop on the declared manifest-hash mismatch or
silently ignore a value labeled final, so the advertised copy/paste recovery entry point is no
longer unambiguous or self-consistent after the marker rebind.

REDTEAM_B_OPEN  
Remaining counts: `P0=0 / P1=1 / P2=0 / P3=0`  
Target SHA-256: `ac66b0808b44fe04192ae8fbd0270e4db93d03e685c243646aa374ba2bcc8f29`  
State SHA-256: `295f780f851e8d67afec32c52d341e37ea135cfd268bfedb2f2ffc6e1416c6b3`

## Post-Closure Delta Closure Review — prompt `db4f72c6e9f4d94592aa0210abd3fd62f2647cf9f8e62120e1325a067bdcde90`

`B-D1-P1-001` is resolved. The neutral prompt no longer copies a static manifest SHA: the obsolete
`a7b73e6e4aa7a9d7fdfc2742b8be2200f6f085198c57bcf303120b676d5550f6` value is absent, and the prompt
now says that the manifest and all artifact bytes are accepted only through the verifier's live
sole PASS. Its stable handoff and verifier hashes remain exact, its recovery/completion boundaries
remain explicit, and it ends at its `FILE_END` marker.

The marker remains exactly seven ASCII bytes `401 199`, state SHA-256 remains
`295f780f851e8d67afec32c52d341e37ea135cfd268bfedb2f2ffc6e1416c6b3`, and all completion claims
remain false with `completion_effect: NONE`. Canonical HEAD/tree, complete tracked diff, empty index,
47-path status freeze, stale hashes, target SHA, and verifier SHA remain unchanged. No implementation,
TST, human-gate, or Goal authority was added. No P0–P2 remains.

This closure remains limited to recovery-handoff and neutral-prompt integrity; the manifest must
bind the final A/B artifact hashes and the neutral verifier must emit its sole PASS after that
mechanical rebind. It is not a downstream completion receipt.

REDTEAM_B_SUPERSEDED_BY_TARGET_DRIFT  
Remaining counts: `P0=0 / P1=0 / P2=0 / P3=0`

## Final Source-Fix Closure Review — target `5c3344f20d807bccf378c990785f0897471c6555675c2cb2693f839d62be7bc4`

All original findings and every later B delta remain resolved for these final bytes. The governed
candidate file has SHA-256 `fb7d53ebb5d7d88b6f179140e786c8654cd1b997afe37d999eb4ecd464e373a7`;
both `SC-20260820-001` and `SC-20260820-002` are present as pending `CANDIDATE` records, share the
same bound file path/hash, and confer no promoted rule or implementation authority.

The unlock marker is correctly separated from durable evidence. Live hook source shows that its
contents are the mutable edit/tool-count baseline and rewrites that baseline on later Stop-hook
rearms. State SHA-256 `6ae32c3d2bbc3201533d5615a3edcfae2e9c55c642a79d62171b71115d09ba06`
therefore declares `REGULAR_FILE_EXISTENCE_ONLY` and `volatile_hook_bookkeeping: true`; verifier
SHA-256 `05629524c4d2bb18aab77d47b2673a5e3f7f67bd55d060b4cf17c061d4b827af`
requires the exact repo-local marker path to resolve to an existing regular file but does not turn
its counters into a receipt. Candidate/episode bytes remain hash-bound, all three completion claims
remain false, and `completion_effect` remains `NONE`.

The previously exposed prompt-drift path is also closed mechanically. Manifest `launch_prompt`
binds the exact absolute neutral path, SHA-256
`3424421deeb58662f619955e10a9fc9edb27d5fb48bcefef142a7c675beede25`, and role
`EXTERNAL_NEUTRAL_BOOTSTRAP_PROMPT`. Before repository artifact and live-state validation, the
verifier reads that exact regular file and checks its bytes, terminal `FILE_END`, absence of draft
tokens and static 64-hex bundle SHA values, absolute verifier path, sole PASS token, and exact
neutral cwd. The handoff now explicitly states that the manifest binds this prompt, so later prompt
drift cannot retain a gate PASS and the binding introduces no prompt↔manifest self-hash cycle.

Independent live recomputation still matches canonical HEAD/tree/upstream, singleton fetch/push
URL lists, complete tracked diff, empty index, 47-path status freeze with 45 untracked paths and the
same two tracked episodic paths, plus every frozen stale hash. Wrong-cwd and inherited Git-config
probes still fail before Git state validation. The current neutral verifier passes its invocation,
self-hash and new live-prompt checks; it stops only at the provisional Red Team A artifact rebind,
which must be refreshed together with this final B artifact before the sole final PASS. No P0–P2
remains.

This closure certifies only recovery-handoff and neutral-launch integrity. It does not authorize
implementation, satisfy any TST or human gate, complete REX/MPC2/Cycle 2, or emit a Goal terminal.

REDTEAM_B_CLOSED  
Remaining counts: `P0=0 / P1=0 / P2=0 / P3=0`

<!-- RECOVERY_HANDOFF_CLOSURE_BEGIN -->
closure_token: `REDTEAM_B_CLOSED`
remaining_findings: `0`
final_target_sha256: `5c3344f20d807bccf378c990785f0897471c6555675c2cb2693f839d62be7bc4`
<!-- RECOVERY_HANDOFF_CLOSURE_END -->

<!-- FILE_END: 2026-08-19-rule-execution-recovery-handoff-redteam-b.md -->
