# Rule Execution / MPC2 / Cycle 2 Recovery Handoff — Red Team A

评审 target：`framework-audit/2026-08-19-rule-execution-recovery-handoff/FINAL-SESSION-HANDOFF.md`  
target SHA-256：`0cd1a137be6e4d8985ceb2854304ae26e7c4804d018d28e200d75914ca527e98`

## P0

### P0-001 — 新执行根中的 Cycle 2 权威字节与 handoff 声明的权威字节不一致

质疑：handoff §2 把原始 Cycle 2 Plan/Handoff 的 SHA `19711435...` / `57436e34...` 列为后续权威（target L55-L63），同时要求从 recovery commit `29282803...` 创建唯一执行根（target L112-L116、L202-L203）；但该 commit 中同名文件的实际 SHA 是 `4bfbfed8...` / `9f7837c4...`，且其头部已经写入 `BLOCKED_BY_REX_DELTA` 与 `RULE_EXECUTION_VERIFIED` shared-owner block。REX `G-PACKAGE-DESCRIPTOR.json` 也把这两个 after-SHA 冻结为批准 patch 结果。与此同时，MPC2 整个权威目录在 `29282803...` tree 中不存在（`git cat-file -e <commit>:.../FINAL-CHANGE-ORDER.md` 返回 128），当前仅有 canonical untracked copy。为什么一个 fresh session 能从这组互斥/缺失的字节得到唯一、可执行的 authority set？

如果成立，影响：接手者可能把已批准的 REX 安全阻断头误判为 drift 并回退到旧 Cycle 2 字节，重新开放 shared-owner task；也可能在隔离执行根中根本无法校验/执行 MPC2。任何一种都会让 REX → MPC2 → Cycle 2 的权威链不再确定。

证据：target L43-L63、L112-L126、L191-L223；recovery branch 中两文件的 `git show` SHA 与 L5-L10 overlap header；REX Plan L71-L77；REX `execution/G-PACKAGE-DESCRIPTOR.json` 的 `patch_targets`；MPC2 Final Change Order L125-L134、L257-L266。

### P0-002 — 顶层 REX gate 当前 FAIL，但 startup DAG 仍继续，缺少唯一裁决语义

质疑：handoff 明确记录 Rule Execution final-plan checker 当前以 `Error: proposal expired` 非零退出（target L146），又要求新 session 重跑三 checker（L200-L201）后直接建执行根并继续证据恢复/实施（L202-L220）。REX Plan 要求 blocking failure 停止、所有人类门有有效 receipt（L88-L96、L138-L140、L586-L608），而 branch 中 `G-PLAN-RESULT.json` 只记录 2026-08-11 的 explicit override，且明确只打开 U-001 PREP/TST-001 PRE。当前 FAIL 到底是“历史批准后可忽略的过期 pre-gate checker”还是“必须阻断 recovery 的 root authority failure”，target 没有给出唯一真值。

如果成立，影响：fresh session 只能在两种错误之间猜测——带着非零根门继续，或在其实已有历史批准时无限停住；两者都不能构成可审计的 DAG 恢复。

证据：target L118-L126、L135-L152、L191-L220；REX Plan L88-L96、L119-L140、L553-L576、L602-L618；recovery branch `execution/G-PLAN-RESULT.json`。

### P0-003 — 持久 U008/U009 外部证据被漏出 denominator，且其 G-OBLIGATION 链“存在但当前不可 fresh 验证”

质疑：target 把 U002-U013 receipt 概括为仅能从“external transcript/archive”恢复或独立重跑（L13-L30、L174-L178、L204-L209），但当前 `/Users/luca/.luca/framework-audit-evidence/REX-20260811-001` 实际存在 188 files / 8.8 MiB：包括 U008 多轮 native evidence，以及 `u009-3188148.XlLYVg` 下 exact G-OBLIGATION-SCOPE proposal `09cc3922...`、binding `c578e8a0...`、result `5d4f99b1...`、approved census `c27abc72...` 与 implementation receipt。另一方面，proposal/binding/result 冻结的 receipt-root 是 dev `16777230` / ino `132828101`，当前同目录 fresh stat 是 dev `16777233` / ino `132828101`；生产 `verifyHumanGateChain` 明确要求 physical dev+ino 与 proposal 一致。target 为什么既不枚举这些 bytes，也不标出它们当前是 historical evidence 而非 fresh-valid receipt？

如果成立，影响：接手者可能重复一个已经发生过的 exact 人类门并丢失真实 lineage，也可能仅凭文件存在把当前 verifier 必然拒绝的链当作有效 PASS；随后 U010-U013 的依赖合法性、15/15 denominator 与 G-REMOTE 聚合都会失真。

证据：target L13-L30、L118-L126、L170-L180、L204-L220；REX Plan L115-L117、L128-L135、L455-L473、L566-L568、L616-L618；上述 `.luca/framework-audit-evidence` 文件；recovery branch `.claude/hooks/lib/human-gate-contract.mjs` L478-L495 与 `scripts/evolution/obligation-census.mjs` L1218-L1244、L1335-L1358。

### P0-004 — 当前 target 没有证明自己是“两红队闭合后的最终握手版本”

质疑：target 自称 durable handoff，但它是 canonical 中一个未跟踪文件；没有 machine manifest 将 target SHA、两份独立 redteam SHA、closure verdict、最终 canonical/recovery/global tuples 与唯一 handoff status 绑定，也没有 checker 能拒绝“只拿到本次 redteam 前 draft”的接手者。target L8-L9 仅声明它不具实施授权，不能回答它是否已吸收两红队结论。

如果成立，影响：用户现在切换 session 后，新接手者无法机械区分 pre-redteam draft、修订稿与真正 closure 版本，可能在本轮 P0 尚未闭合时开始 recovery；“最终握手 handoff”会退化为文件存在/self-report。

证据：target L1-L9、L68-L86、L231-L243；当前 `git status --short` 对 target 为 `??`；本轮用户要求“两红队了解整个 session，完成直到最终握手的 handoff”。

## P1

### P1-001 — TST-002 PRE 在 containment 后不可按原时序重放，target 的“adjudicate”没有终态边界

质疑：target 同时声明 durable TST-002 PRE/POST receipt 不可用（L176）、unsafe resolver 永不 reopen（L167-L168、L237），以及新 session 要“adjudicate TST-002 explicitly”（L207-L209）。REX Plan 的 TST-002 PRE 必须证明 descriptor 闭合且 target 尚未写，随后才允许 G-CONTAIN/EXEC/POST（L125、L138-L140、L355-L367）。在 live target 已是 stub 的现实下，原 PRE 世界状态不可重造；若历史 bytes 不能形成合格 receipt，`adjudicate` 到底允许什么结论并未被限定。

如果成立，影响：15/15 独立 TST 无法诚实闭合，或接手者为了制造 PRE 而重新暴露 unsafe resolver，违反不可逆 containment 终态。

证据：target L154-L180、L204-L220、L231-L243；REX Plan L123-L140、L355-L367、L545-L549、L616-L618。

### P1-002 — live containment 只有散列，没有可定位、可绑定的 external-state tuple

质疑：target §5 仅列 live stub、backup、journal 三个 SHA 和两个 absent target（L154-L168），没有列 live target、quarantine root、backup target、journal 的 exact paths，也没有列 journal 绑定的 plan/unit/gate、descriptor SHA `7dcdc883...`、approval receipt SHA `c290ca82...`、turn id、old/new tree SHA。当前 journal 明明在 `/Users/luca/.luca/quarantine/resolving-merge-conflicts/20260811T055628Z-c7c9ba81362a/containment-journal.json` 保存这些字段。

如果成立，影响：同 SHA 的单文件 read-back 不能证明新 session 检查的是批准的 discoverable target/不可发现 backup，也不能证明 G-CONTAIN lineage；TST-002 POST、rollback prohibition 与后续 activation census 都缺少确定 external anchor。

证据：target L154-L168；实际 containment journal L3-L18；REX Plan L115-L117、L355-L367、L562-L568、L580-L587。

### P1-003 — Cycle 2 checker 的失败条件与 stale checkout 只读红线形成未裁决死锁

质疑：target 记录 Cycle 2 checker 因 stale HEAD 从冻结的 `3f2caad...` 漂到 `6edcab...` 而 FAIL（L139-L144），同时重申 stale checkout 永不对齐、pull 或写（L128-L133、L236），而原 Cycle 2 Plan 又规定 checker 非零且无唯一 `FINAL_HANDOFF_GATE_PASS` 时不得开始实施（Cycle 2 Plan L363-L369）。target 没有说明这一失败是由哪一份更高权威的 delta 消解，还是必须一直 BLOCKING。

如果成立，影响：fresh session 要么违反 stale read-only 红线来换 checker PASS，要么违反“gate 不 PASS 不实施”，要么永久停住；无一能按现有 handoff 自动推进到 321/2,568。

证据：target L128-L152、L191-L203、L221-L229；Cycle 2 Plan L31-L53、L351-L369、L380-L386；MPC2 Final Change Order L125-L134、L257-L266。

### P1-004 — 34 个 surviving commits 没有形成 U/DEV/TST/author/receipt 可核对 ledger

质疑：target 只给 recovery head/tree、“34 recovery-only commits”与“U001-U013 code survived”（L101-L126、L170-L178），却没有把 34 commits 映射到 U001..013、修复轮次、shared files、编写者、独立 tester、当前可用 receipt 与失效 receipt。实际历史含 U006 三个连续修复、U008 十余个 evidence 修复、U012 多轮 transactional 修复，且 branch 中没有 U002-U013 receipt files。凭一个 tip tree，如何验证“每个 DEV 后都由未编写者的对应 TST 验证”以及同根因失败次数？

如果成立，影响：重跑测试只能证明 tip 的某些行为，不能证明原 DAG 的 author/test independence、attempt 计数或每个 U-block 的 exact subject；15/15 与 28/28 聚合可能变成事后自认证。

证据：target L101-L126、L170-L185、L204-L220；`git log --reverse main..rex/rule-execution-recovery-u011-20260814` 的 34-entry history；REX Plan L88-L96、L119-L140、L299-L336、L545-L549。

### P1-005 — MPC2 的强制中间终态 token 从 handoff 消失

质疑：target 要求 `RULE_EXECUTION_VERIFIED` 后完成 CO-01..11/DASSERT 12/12 再进入 Cycle 2（L221-L225、L259-L260），但全文没有 `MPC2_CHANGE_ORDER_INTEGRATED`。MPC2 authority 明定 combined acceptance 的唯一 token 正是 `MPC2_CHANGE_ORDER_INTEGRATED`，且 PENDING、文件存在、静态或单端 PASS 不能代替（Final Change Order L253-L266）。为什么 handoff 可以只列任务条目而不保留这个停止/完成边界？

如果成立，影响：新 session 可能在 MPC2 尚未达到它自己的 completion contract 时进入 Cycle 2，或者最终只报告 `EVOLUTION_VERIFIED` 而遗漏用户追加任务的唯一可核验终态。

证据：target L29-L30、L181-L184、L219-L225、L245-L260；MPC2 Final Change Order L201-L223、L253-L266。

## P2

### P2-001 — handoff 的“当前”dirty snapshot 在评审发生前已经过期

质疑：target 冻结九个 tracked WIP、working diff SHA `af2f466f...` 与 post-handoff porcelain SHA `6792abf1...`（L76-L99）；本次 redteam read-back 已有 11 个 tracked modifications，新增 `memory/episodic/index.jsonl` 与 `memory/retrieval-log.jsonl`，working diff SHA 为 `5655f6e0...`，且 redteam artifacts 还会增加 untracked denominator。target 虽说 drift 要成为 delta（L197-L199），但这是否仍能被称为交接时的 final current-state freeze？

如果成立，影响：fresh session 从第一步就进入未归属 delta，不能用 target 的 path/hash denominator 判断 protected WIP 或 `BLOCKED_DIRTY_OVERLAP`，并可能把本轮 handoff/redteam 自身当作未知用户文件。

证据：target L68-L99、L191-L209、L231-L243；本轮 `git status --short` 与 `git diff --binary --no-ext-diff | shasum -a 256` read-back。

### P2-002 — “external transcript/archive”没有任何稳定 source inventory

质疑：target L25-L26、L204-L206 把 receipt recovery 交给未命名的 external session logs，却不列 session ID、path、record/byte boundary 或可恢复 artifact denominator。当前主要 Codex rollout 实际位于 `/Users/luca/.codex/sessions/2026/08/09/rollout-2026-08-09T17-30-44-019fe5dc-3e4c-7300-a7c2-c0d8747fac82.jsonl`，还存在 U008/U009 专属 Claude/Codex logs 与 `.luca` external evidence；主 rollout 在本 session 继续增长，整文件 SHA 也不是稳定 anchor。

如果成立，影响：不同接手者会扫描不同日志范围，得到不同“可恢复 receipt”集合；高成本证据可能被重复生成、漏掉，或从仍在增长的 transcript 截取后被误当成稳定独立 receipt。

证据：target L13-L33、L204-L209、L231-L241；上述 rollout path 与 `.luca/framework-audit-evidence/REX-20260811-001` 当前 filesystem census。

### P2-003 — concurrent worktree/branch/upstream before-state 没有进入交接冻结面

质疑：target 要求新 session re-freeze“every registered readable worktree, all branch refs”（L197-L199），但自身没有给 denominator 或 before tuple。当前除大量 prunable `/private/tmp` metadata 外，还有九个 readable `.claude/worktrees/*`，local `agent/session-change-declaration` 为 `caa7c9e...`，而当前 `upstream/main` 为 `6edcab...`；target 的最终 fetch/show task（L226-L229）也没有绑定 fetch 前 remote URL/ref SHA。

如果成立，影响：final cross-session declaration 检查无法证明 fetch 前后发生了什么，也无法区分 concurrent-session branch/worktree 变化与本 Goal 的 owner delta；shared hunk 冲突可能在没有完整 before-state 的情况下被漏判。

证据：target L101-L116、L191-L203、L224-L229；当前 `git worktree list --porcelain`、`git show-ref`、`git remote -v` read-back；REX Plan L90-L95、L309-L310、L607-L608。

REDTEAM_A_OPEN  
remaining counts: `P0=4 / P1=5 / P2=3 / P3=0 / total=12`  
target SHA-256: `0cd1a137be6e4d8985ceb2854304ae26e7c4804d018d28e200d75914ca527e98`

## Closure Review A — round 1（已漂移 target，不能闭合）

本轮完整复验的修订 target SHA-256 是
`a643f2d7c5d210f3b6bcfc283a734db0e835cba412ca9af1ce56565d4d8a714d`。在写入本节前，target
及 sidecars 已再次漂移；因此下列裁决只回答该 SHA，不适用于当前新字节，也不构成 closure。

### 首轮 12 项逐项裁决

| 原 finding | 裁决 | 复验证据 |
|---|---|---|
| P0-001 | ANSWERED | target §2 明确 current authority 是 REX-patched Cycle 2 Plan/Handoff，旧 SHA 仅作 lineage；§1/§8 把旧 recovery branch 限定为 forensic-only，并以 canonical authority + neutral clone 做比较，不再把缺 MPC2 的旧 tip 当执行根。当前七份 authority SHA 均与 state/manifest 声明一致。 |
| P0-002 | ANSWERED | target §4 将 REX `source manifest exact path set drift` 明列为 blocking，§8.6–8.8 只允许先做 authority/gate/evidence/owner adjudication；失败 checker 不得越过到 U014，必要时回到新的 exact G-PACKAGE。 |
| P0-003 | ANSWERED | target §5.1 与 `RECOVERY-STATE.json` 枚举 13 roots/188 files、U008 summary/consumption、U009 proposal/binding/result/census/implementation/post-state、receipt-root `dev/ino` 漂移以及 bounded transcript。复算的 188-file inventory、六个 U009 SHA、`16777233/132828101` fresh stat 和 transcript prefix SHA 均匹配；文本明确“存在不等于 fresh-valid”。 |
| P0-004 | ANSWERED, NOT CLOSED | 新 manifest/verifier 已能同时绑定 target、sidecars、两份 redteam artifacts、authority、repo tuples 与 containment，并要求两份 closure block 指向同一 final target SHA；但本轮仍有下列新 finding，故 verifier 正确保持 FAIL，不能闭合。 |
| P1-001 | ANSWERED | target §5.2 明确只可 fresh 跑 TST-002 POST；unsafe PRE world 不得重建，历史 PRE 不能验证则保持 BLOCKED 并寻求 authority delta。 |
| P1-002 | ANSWERED | target §5.2、state 与 manifest 给出 live/backup/journal exact paths、三 SHA、plan/unit/gate、descriptor、nonce、approval receipt、turn 与 offset；fresh read-back 与 journal 内容匹配，两个 discovery route 仍 absent。 |
| P1-003 | ANSWERED | target §4 不把 Cycle 2 的七项 FAIL 正常化；§8 固定 REX → MPC2 CO-01 new package/G-PACKAGE → unchanged Cycle 2 的次序，同时全程禁止写/对齐 stale checkout。当前三个 checker 复跑结果与 target 一致。 |
| P1-004 | ANSWERED | `RECOVERY-COMMIT-LEDGER.json` 唯一映射 34 个 commit 到 U001/U003–U013；复算为 4 个 common-history + 30 个 recovery-only，所有 OID 都存在且无漏项。ledger 对 author/tester/independent receipt 一律诚实标 UNKNOWN/NOT_ESTABLISHED，没有把 commit presence 冒充验收。 |
| P1-005 | ANSWERED | target §7、§8、new-session prompt 均恢复 `MPC2_CHANGE_ORDER_INTEGRATED`，并置于 `RULE_EXECUTION_VERIFIED` 之后、Cycle 2 最终终态之前。 |
| P2-001 | ANSWERED | capture 的 canonical HEAD/tree/upstream、空 tracked/index diff、45 个 exact untracked paths及三个 status hashes均可复算；manifest 对这些 path denominators 做 exact 校验。 |
| P2-002 | ANSWERED | target §5.1 固定 rollout absolute path、28119 lines、60441369 bytes、prefix SHA、message/turn/timestamp；复算完全一致且明确禁止依赖增长 suffix。 |
| P2-003 | ANSWERED | state 冻结 33 个 registered worktrees 的 porcelain SHA、sorted show-ref SHA、remote fetch/push URL、canonical/upstream/recovery/common-base/divergence；复算匹配，§8.12 保留 final fetch/show 且要求 owner-matrix reconciliation。 |

### A-NEW-P0 — 首条“safe” verifier 没有机械关闭 Git index refresh 写面

质疑：`SAFE-BOOTSTRAP.md` L8-L17、L32-L38、L56-L60 把 neutral start 与 stale checkout 零写作为
安全边界，并要求第一条命令运行 recovery verifier；但该 verifier L158-L163 的 Git helper 直接执行
`git -C`，没有声明 no-optional-lock 姿态，L292-L296 与 L348-L367 又分别对 canonical/stale 调用
`git status`/`git diff`。本轮 Trace2 实跑明确进入 stale `.git/index` 的 `index:refresh` 区域。当前 index
inode/mtime/SHA 在这一次调用前后未变，只能证明本次无需回写，不能证明 future stat-only refresh
不会写 index 后仍输出相同 porcelain 与 PASS。

如果成立，影响：新 session 遵循 handoff 的第一条所谓只读门时，就可能在读取仓库合同之前修改
canonical 或明确“绝不写”的 stale checkout Git metadata；safe bootstrap 无法证明自己的零写前提，
也会让 stale before-tuple 与未经人门零 mutation 的声明失去可信度。

证据：reviewed target §6、§8.1–8.3；`SAFE-BOOTSTRAP.md` L8-L17、L32-L38、L56-L60；
`verify-recovery-handoff.mjs` L158-L163、L292-L296、L348-L367；Trace2 的
`category:"index", label:"refresh"` 事件与调用前后 index stat/SHA read-back。

### A-NEW-P2 — 188-file inventory SHA 没有可唯一复现的 canonicalization contract

质疑：target §5.1 与 state 只把
`6028425c89a8d72ef4a38d75bc49d7899e49a1afc3011f0668fbc06b7ca67ad8` 描述为“deterministic
relative-path/file-hash inventory”，没有冻结排序 locale、记录字段顺序、分隔符或末尾换行。复验者必须
尝试多种编码后才发现它对应按 relative path 排序的 `sha256␠␠relative-path\n` 字节；manifest/verifier
也不校验该 inventory。

如果成立，影响：fresh session 在 §8.3 执行 external-evidence re-freeze 时，无法唯一判断一个 inventory
SHA 不同究竟是证据漂移还是序列化不同；188-file 高成本证据面的 exact denominator 可能被误判为 intact
或无谓 BLOCKED。

证据：reviewed target §5.1、§8.3；`RECOVERY-STATE.json` 的
`external_evidence.relative_path_file_hash_inventory_sha256`；manifest/verifier 的 external-evidence
校验缺席；本轮六种 serialization 复算，仅 `sha256␠␠relative-path\n` 命中声明 SHA。

REDTEAM_A_OPEN  
remaining counts: `P0=1 / P1=0 / P2=1 / P3=0 / total=2`  
reviewed target SHA-256: `a643f2d7c5d210f3b6bcfc283a734db0e835cba412ca9af1ce56565d4d8a714d`  
current target disposition: `DRIFTED_REVIEW_REQUIRED`

## Closure Review A — round 2（target `ae8606a5…` 已漂移，不能闭合）

本轮完整复验的 target SHA-256 是
`ae8606a5273b1d091b3d18df1460e541c8033b47ae6876b94ce2fbadfff288eb`；配套 state / ledger /
safe-bootstrap / verifier / manifest SHA 分别为 `a7c04691…` / `74c15312…` / `ac9b318b…` /
`a3ddff69…` / `6cb91c6e…`。在落本节前这些受审字节又已漂移，故本节只裁决上述冻结组，不适用于
当前新字节，也不构成 closure。

### 前序 findings 复核

- 首轮 P0-001..004、P1-001..005、P2-001..003 的 `ANSWERED` 裁决保持成立；authority、Git
  divergence、34-commit ledger、gate history、checker truth、containment、external evidence 与 transcript
  均再次匹配。
- A-NEW-P0 已被回答：reviewed verifier 的唯一 Git helper 同时强制 Git
  `--no-optional-locks` 与 child env `GIT_OPTIONAL_LOCKS=0`，且所有 Git 调用只经该 helper；从 forbidden cwd
  实跑时 canonical/stale index bytes未因 verifier 改变。
- A-NEW-P2 已被回答：target/state 冻结 raw UTF-8 byte sort 与
  `<lowercase-sha256><two spaces><relative POSIX path><LF>` exact serialization；reviewed verifier 机械复算
  188 regular files、inventory SHA 与两个 exact Unix sockets，并在 redteam closure 检查之前通过。
- Red Team B 的 canonical `search_memory.py` 写入问题已被回答：reviewed safe-bootstrap 先创建 exact-HEAD
  `--no-hardlinks` independent clone，再把 `MEMORY_ROOT` 绑定 clone。本轮按原命令实跑，clone object inode 与
  source 不同，clone retrieval-log 改变，而 canonical retrieval-log SHA 与 canonical status SHA 均保持不变。

### A-R2-NEW-P0-001 — verifier 不机械拒绝 forbidden cwd

质疑：reviewed manifest 声明 `neutral_cwd_required: true`、`start_in_repo_allowed: false`，reviewed
safe-bootstrap 也把 neutral start 定为零写安全边界；但 verifier 只检查这些字段和文档字面，没有读取或约束
`process.cwd()`。本轮分别以 canonical 与明确禁止的 stale checkout 为 `cwd` 运行同一 absolute verifier，
两次都通过 authority/state/containment/external-evidence 全部验证，唯一失败均是尚缺 A closure block。

如果成立，影响：一旦两份 closure block 齐全，一个已经从 canonical/stale 启动并可能先触发危险 lifecycle
hook 的 session 仍会得到 `RECOVERY_HANDOFF_GATE_PASS`；机器门无法区分真正 safe bootstrap 与已经越过
零写边界的启动，manifest 的 neutral policy 退化为未执行的散文。

证据：reviewed `SAFE-BOOTSTRAP.md` §Why/§Exact safe start；reviewed manifest
`safe_bootstrap_policy`；reviewed verifier `validateSafeBootstrap()` 与 `main()`；canonical/stale 两个 cwd
实跑均仅报 `redteam A must contain exactly one final closure block`。

### A-R2-NEW-P0-002 — inherited Git locator 环境可越过 `git -C`，并波及有写的 clone checkout

质疑：reviewed verifier 的 Git helper 通过 `{ ...process.env, GIT_OPTIONAL_LOCKS: '0' }` 原样继承
`GIT_DIR`、`GIT_WORK_TREE`、`GIT_INDEX_FILE`，reviewed safe-bootstrap 的 `git clone` 与随后
`git -C <clone> checkout --detach` 也没有定义 locator-env 边界。实测
`GIT_DIR=/Users/luca/Desktop/luca_gstack/.git git -C <canonical> rev-parse HEAD` 返回 stale HEAD
`6edcabde…`，而 `GIT_WORK_TREE=/Users/luca/Desktop/luca_gstack git -C <canonical>
rev-parse --show-toplevel` 返回 stale path，证明 `-C` 不能覆盖这些 inherited locators。clone-bound
mandatory search 本轮还检索到现行 `SC-20260814-001`，其机械纪律正是隔离 Git 子进程必须剥离这些变量并
证明父仓 tuple 不变。

如果成立，影响：verifier 可能检查或拒绝的是 inherited locator 指向的对象而非 manifest 声明的 roots；
更严重时，随后本应只写 neutral clone 的 `checkout --detach` 可落到 canonical/stale Git dir，直接改写
被保护 checkout 的 HEAD/index/worktree。safe-bootstrap 因此仍不能在异常但已知复发的 Git 环境下证明
零越界写。

证据：reviewed verifier `gitBytes()`；reviewed `SAFE-BOOTSTRAP.md` exact clone/checkout commands；上述
两个 locator probe；isolated memory search 命中的 promoted rule `SC-20260814-001`。

### A-R2-NEW-P2-001 — final copy/paste prompt 含孤立残句

质疑：reviewed target §9 的 fenced new-session prompt 在 authority/sidecar read-order 后留下单独的
`The old`，下一行才开始 `For mandatory memory commands...`，随后又重新出现完整的
`The old 29282803 branch is forensic only`。这是本轮修订引入、且 verifier 不会拒绝的断裂句。

如果成立，影响：用户直接复制最终 prompt 时会把一个语法残片交给 fresh agent；虽然下一句重复恢复了
主要约束，但“最终可直接使用的交接指令”不再是无歧义、无编辑负担的闭合字节。

证据：reviewed target §9 fenced prompt 中 `...MANIFEST.json. The old` / `For mandatory...` /
`The old 29282803...` 的连续三段。

REDTEAM_A_OPEN  
remaining counts: `P0=2 / P1=0 / P2=1 / P3=0 / total=3`  
reviewed target SHA-256: `ae8606a5273b1d091b3d18df1460e541c8033b47ae6876b94ce2fbadfff288eb`  
current target disposition: `DRIFTED_REVIEW_REQUIRED`

## Closure Review A — round 3（target `a180a095…` 已漂移，不能闭合）

本轮完整复验的 target SHA-256 是
`a180a095bd69a1c0af86e66a9b53379b7a7578032f11ef4baa9491138082d4f6`；配套 state / ledger /
safe-bootstrap / verifier / manifest SHA 分别为 `86168988…` / `74c15312…` / `04f2b285…` /
`d6bf66aa…` / `aea6975b…`。在本节落盘前该受审组已再次漂移，故下列裁决只适用于上述冻结组，
不构成 closure。

### 前序 findings 复核

- 原 P0-001..004、P1-001..005、P2-001..003，Round 1 的 A-NEW-P0/A-NEW-P2，以及 Round 2 的
  A-R2-NEW-P0-001、A-R2-NEW-P0-002、A-R2-NEW-P2-001，在该冻结组中均被真实回答：authority、
  checker/gate truth、34-commit ledger、containment、188-file + two-socket inventory、bounded transcript、
  exact neutral cwd、15 项 locator env 拒绝/child stripping 与 copy/paste prompt 均复核匹配。
- neutral cwd 实跑 verifier 依次通过 artifact/authority/containment/canonical/recovery/stale/state/evidence
  检查后，仅停在缺少 A closure；canonical/stale cwd 均在首个 Git 调用前拒绝。逐个注入当时清单内的
  15 项变量，也都在 Git read 前以变量名拒绝。

### A-R3-P1-001 — “拒绝任意 inherited Git config variable”仍漏掉三种官方 config selector

质疑：reviewed target §9 声明 verifier 会在首个 Git read 前拒绝“any inherited locator/config
variable”，但 reviewed state / manifest / verifier / safe-bootstrap 的 exact 清单遗漏
`GIT_CONFIG_GLOBAL`、`GIT_CONFIG_SYSTEM` 与 `GIT_CONFIG_NOSYSTEM`。从 exact neutral cwd 注入
`GIT_CONFIG_GLOBAL=/dev/null` 后，verifier 没有在 invocation boundary 拒绝，而是通过全部 live/state/
evidence 检查并只停在缺少 A closure。Git 本机手册明确前两项会替换 global/system config source；这类
config 可携带 `core.worktree`、`core.hooksPath` 或 `core.fsmonitor`，并会被 verifier 的 Git child 以及
safe-bootstrap 的 clone/checkout 原样继承。

如果成立，影响：一个 fresh shell 的 config-selector 环境仍可改变受审 Git root 的解释、触发外部 hook/
fsmonitor，或改变有写的 clone checkout 行为；机器门与 bootstrap 因此不能兑现“任何 inherited config
在首个 Git read 前拒绝”的零越界写边界。

证据：reviewed target §9；reviewed `RECOVERY-STATE.json` 与 manifest 的
`forbidden_inherited_git_environment`；reviewed verifier `LOCAL_GIT_ENV_KEYS`、`gitBytes()`、
`validateInvocationBoundary()`；reviewed `SAFE-BOOTSTRAP.md` pre-launch unset 与 `clean_git()`；上述
`GIT_CONFIG_GLOBAL=/dev/null` neutral-cwd 实跑；本机 `man git` 的
`GIT_CONFIG_GLOBAL, GIT_CONFIG_SYSTEM` 条目。

### A-R3-P1-002 — mandatory search 写脏的 clone 同时被指定为 clean/read-only comparison root

质疑：reviewed `SAFE-BOOTSTRAP.md` 在同一 `recovery_scratch/repo` clone 中运行
`search_memory.py`，而该命令按 handoff 已确认会追加该 clone 的 tracked
`memory/retrieval-log.jsonl`；紧接着 target §8.4 又要求“Keep that neutral clone read-only for
comparison”。new-session prompt 也没有区分可写的 disposable memory root 与 clean forensic comparison
root。此时该 clone 在进入 comparison 角色前已经产生 tracked dirty delta，且没有第二个独立 clean clone
或 empty-status denominator。

如果成立，影响：接手者会把 bootstrap 自己制造的 retrieval-log delta 混入 current-main ↔ forensic
owner/hunk 比较，或错误地把已写脏的 root 当成 package/evidence baseline；高风险 shared-owner 裁决失去
“comparison root 未被 startup 改写”的前提。

证据：reviewed target §8.3–8.4 与 §9；reviewed `SAFE-BOOTSTRAP.md` exact memory commands；已验证
`search_memory.py` 在 clone-bound `MEMORY_ROOT` 下只改变 clone retrieval log；Red Team B 同轮独立交叉
复核得出相同角色冲突。

REDTEAM_A_OPEN  
remaining counts: `P0=0 / P1=2 / P2=0 / P3=0 / total=2`  
reviewed target SHA-256: `a180a095bd69a1c0af86e66a9b53379b7a7578032f11ef4baa9491138082d4f6`  
current target disposition: `DRIFTED_REVIEW_REQUIRED`

## Closure Review A — final stable target `70029c7a…`

本轮完整复核的 target SHA-256 是
`70029c7af60aa95e71275b2f2db87c31d750b7e44b0fab6eabf4ce22681b80cf`；配套 state / ledger /
safe-bootstrap / verifier / manifest SHA 分别为 `cbec1bdd…` / `74c15312…` / `b2a065e1…` /
`53c89dc6…` / `6ba8c9c3…`。复核结束时上述字节保持稳定。

### 全量 closure 裁决

- 原 P0-001..004、P1-001..005、P2-001..003 继续为 `ANSWERED`：current REX-patched authority
  chain、blocking checker/gate truth、U008/U009 historical-not-fresh 语义、exact containment tuple、
  34-commit honest ledger、stale-checker disposition、bounded transcript、33-worktree/ref freeze、MPC2
  中间终态与最终 upstream fetch/show 顺序均无回退。
- Round 1 的 optional-lock 与 inventory-canonicalization findings 继续为 `ANSWERED`：所有 verifier
  Git read 均强制 no-optional-lock，188 regular files / two sockets / raw UTF-8 serialization 均机械复算。
- Round 2 的 forbidden-cwd、inherited locator 与 prompt findings 继续为 `ANSWERED`：exact neutral cwd
  在首个 Git call 前强制；canonical/stale cwd 活体负例均立即拒绝；final prompt 无断裂句。
- Round 3 的三种 config selector finding 已被回答：18 项 critical Git variables 在 state / manifest /
  SAFE / runtime exact 绑定，逐项注入均在 Git read 前拒绝；verifier Git child 另外剥离全部 `GIT_*`
  后固定 no-lock 与 null global/system config。用 poisoned `GIT_DIR` / `GIT_WORK_TREE` /
  `GIT_INDEX_FILE` / `GIT_CONFIG_GLOBAL` / `GIT_TEMPLATE_DIR` / `GIT_NAMESPACE` / `GIT_TRACE2_EVENT`
  复测 sanitized wrapper，仍只读取 canonical `ad9903df…`，没有 trace 泄漏。
- Round 3 的 clone-role finding 已被回答：mandatory retrieval 只写 disposable `memory-root`，该 root
  被明确禁止作为 evidence/comparison/package/execution；另建 second no-hardlinks `comparison-root`，
  detached 到 frozen HEAD 并要求 empty porcelain 后才保持 read-only。
- 写入本 closure 前，neutral verifier 已通过 artifact、authority、containment、canonical、recovery、
  stale、worktree/ref、eight-overlap、external inventory、U009 stat 与 bounded transcript 的全部前序
  检查，唯一 A-side failure 是缺少本 closure block。未发现该 final target 新增的 P0–P2。

本裁决只闭合 Red Team A 的 handoff 完整性审查；不把实现、TST、human gate、
`RULE_EXECUTION_VERIFIED`、`MPC2_CHANGE_ORDER_INTEGRATED` 或 `EVOLUTION_VERIFIED` 判为 PASS。

REDTEAM_A_CLOSED  
remaining counts: `P0=0 / P1=0 / P2=0 / P3=0 / total=0`  
final target SHA-256: `70029c7af60aa95e71275b2f2db87c31d750b7e44b0fab6eabf4ce22681b80cf`

## Closure Review A — final-candidate round 5（target `46e194a1…`，OPEN）

本轮完整复核的 target SHA-256 是
`46e194a110f170f7a135014cbd7ab91355669f820fe8b69c702c0c2659405514`；配套 state / ledger /
safe-bootstrap / verifier / manifest SHA 分别为 `1957e641…` / `74c15312…` / `f2b30323…` /
`04661095…` / `808fbc9c…`。前序全部 findings 的修复继续成立；新增的 self-contained 双 clone
shell block 也成立：同一 block 定义 `clean_git`、运行 memory-root search、再创建 clean
comparison-root，且散文明确以后每个 shell/tool call 都须重声明 wrapper。带 poisoned Git env 的
同-call 双次 read probe 均只返回 canonical `ad9903df…`。

### A-R5-P1-001 — remote live gate 只核对第一条 URL，未冻结实际 push fan-out exact set

质疑：reviewed manifest 新增单值 `repo.remote.fetch_url` / `push_url`，reviewed verifier 的
`validateRemote()` 分别调用 `git remote get-url upstream` 与
`git remote get-url --push upstream`；两条命令都没有 `--all`。Git 本机手册明确：默认只列第一条
URL，而 remote 可以有多条 URL / pushurl；没有 pushurl 时全部 URL 都用于 push，有多条 pushurl
时 push 同样发送到全部。因而只要保留第一条 expected URL，再追加第二条 URL 或 pushurl，当前
HEAD/tree/status/index/show-ref 与 verifier 读到的两个单值都可保持不变，gate 仍可越过。

如果成立，影响：handoff 可以在 `upstream` 已获得未冻结的第二个 push endpoint 时通过 live-state
检查；后续受 `G-REMOTE` 保护的 push 可能产生未在 before-state / owner delta 中出现的 fan-out，
remote identity 与 exact human-gate payload 不再是一一对应。当前 live remote 恰为单 URL 不能证明
verifier 会拒绝这种之后发生的 config drift。

证据：reviewed target §3 与 §8.12；reviewed state `worktree_and_refs`；reviewed manifest
`repo.remote`；reviewed verifier `validateRemote()`；当前
`git remote get-url --all upstream` 与 `--push --all` 各只有一行；本机 `man git-remote` 明列
“By default, only the first URL is listed”，`man git-config` 明列 multiple URL / pushurl 的 push
会发送到全部。

REDTEAM_A_OPEN  
remaining counts: `P0=0 / P1=1 / P2=0 / P3=0 / total=1`  
reviewed target SHA-256: `46e194a110f170f7a135014cbd7ab91355669f820fe8b69c702c0c2659405514`  
current target disposition: `REVISION_REQUIRED`

## Closure Review A — final stable target `6bc06746…`

本轮完整复核的 target SHA-256 是
`6bc067460231dc0ed61c7401d66b584b2522b9a882caa30c297b65e86aa2c448`；配套 state / ledger /
safe-bootstrap / verifier / manifest SHA 分别为 `1957e641…` / `74c15312…` / `f2b30323…` /
`785378c1…` / `d52462d8…`。复核结束时上述受审字节保持稳定。

### 全量 closure 裁决

- 原 P0-001..004、P1-001..005、P2-001..003，以及 Round 1–3 的 optional-lock、inventory
  canonicalization、forbidden cwd、Git locator/config environment、prompt 完整性、双 clone 角色隔离等
  findings，继续为 `ANSWERED`；本轮重读未见 authority、DAG、checker/gate truth、evidence denominator、
  owner/overlap、human-gate 或 completion boundary 回退。
- Round 5 的 A-R5-P1-001 已被回答：reviewed target §3 明确 `upstream` 的 fetch/push 都是 exact
  singleton set；reviewed verifier 的 `validateRemote()` 分别执行 fetch `get-url --all` 与 push
  `get-url --push --all`，再以 exact array 比较单元素 manifest 值，因此额外 URL、额外 pushurl、重复项或
  顺序/基数漂移都会被拒绝。fresh live read-back 两个列表都恰有一项且均为
  `https://github.com/wangmoumou1216-ai/luca_gstack.git`。
- self-contained bootstrap 约束保持成立：reviewed SAFE §6 的一个 shell block 内先定义 sanitized
  `clean_git`，再依次创建 disposable dirty `memory-root` 与独立 clean `comparison-root`；§7 要求任何后续
  shell/tool call 在同一 call 内重新声明 wrapper，未依赖跨调用函数状态。
- 写入本 closure 前，从 exact neutral cwd 实跑 verifier，artifact、authority、containment、canonical、
  remote、recovery、stale、worktree/ref、eight-overlap、external inventory、U009 stat 与 bounded
  transcript 的所有前置检查均通过；唯一失败是 A artifact 尚无 final closure block。

本裁决只闭合 Red Team A 的 handoff 完整性审查；不把实现、TST、human gate、
`RULE_EXECUTION_VERIFIED`、`MPC2_CHANGE_ORDER_INTEGRATED`、根 Goal 或 `EVOLUTION_VERIFIED` 判为 PASS。

REDTEAM_A_CLOSED  
remaining counts: `P0=0 / P1=0 / P2=0 / P3=0 / total=0`  
final target SHA-256: `6bc067460231dc0ed61c7401d66b584b2522b9a882caa30c297b65e86aa2c448`

## Closure Review A — Stop-hook extraction refreeze `ac66b080…`

本轮完整复核的 target SHA-256 是
`ac66b0808b44fe04192ae8fbd0270e4db93d03e685c243646aa374ba2bcc8f29`；配套 state / ledger /
safe-bootstrap / verifier / reviewed provisional manifest SHA 分别为 `5b91ffd3…` / `74c15312…` /
`f2b30323…` / `0c150690…` / `f563dd94…`。本轮 drift 仅来自强制 Stop-hook 的框架级自成长提取与其
必要 refreeze；authority、SAFE、ledger、forensic/global evidence 和执行 DAG 未改变。

### Delta 与历史 closure 裁决

- 全部历史 P0-001..004、P1-001..005、P2-001..003，以及 Round 1–5 的 optional-lock、inventory
  canonicalization、neutral cwd、Git locator/config sanitization、双 clone、prompt 与 remote full-list
  findings 继续为 `ANSWERED`。reviewed verifier 仍以 fetch `get-url --all`、push
  `get-url --push --all` 和 exact singleton arrays 拒绝 remote fan-out drift。
- canonical HEAD/tree/upstream 与 33-worktree/ref freeze 未变。当前完整 worktree binary diff SHA
  `17077a26…` 只覆盖 `memory/episodic/archive/2026.jsonl` 与 `memory/episodic/index.jsonl`；cached diff
  为空。manifest 的 exact status denominator 是 47 paths，其中 45 条仍为 frozen untracked paths，余下
  两条正是上述 tracked working paths；state/manifest/diff/status hashes 均机械交叉绑定。
- framework semantic candidate `SC-20260820-001` 仍是 `CANDIDATE` / pending review；meta episode
  `EP-20260820-133` 在 index 与 raw file 的 ID、candidate/index/archive/raw 的整文件 SHA，以及空字节
  unlock marker SHA 均匹配。candidate、raw episode 与 marker 的 ignore 规则也经 live read-back 确认；
  extraction scope 是 `FRAMEWORK_META_NOT_PRODUCT`，`completion_effect` 是 `NONE`。
- stale checkout HEAD/tree/status/worktree/cached tuple 与上轮完全相同；neutral verifier 完成 stale、
  containment、canonical diff、state/evidence/self-growth 与 completion-boundary 检查后，唯一失败是旧 A
  closure target 与新 handoff SHA 不匹配。未发现本轮新增 P0–P2。

本裁决只闭合 Stop-hook drift 后的 Red Team A handoff 完整性复核；不把 semantic candidate/episode、
实现、TST、human gate、`RULE_EXECUTION_VERIFIED`、`MPC2_CHANGE_ORDER_INTEGRATED`、根 Goal 或
`EVOLUTION_VERIFIED` 判为 PASS。

REDTEAM_A_CLOSED  
remaining counts: `P0=0 / P1=0 / P2=0 / P3=0 / total=0`  
final target SHA-256: `ac66b0808b44fe04192ae8fbd0270e4db93d03e685c243646aa374ba2bcc8f29`

## Post-closure delta review A — unlock-marker bookkeeping（OPEN）

reviewed target 仍为
`ac66b0808b44fe04192ae8fbd0270e4db93d03e685c243646aa374ba2bcc8f29`；本轮 state SHA 是
`295f780f851e8d67afec32c52d341e37ea135cfd268bfedb2f2ffc6e1416c6b3`。unlock marker 的 live bytes
精确为 7-byte ASCII `401 199`（hex `34303120313939`），SHA-256
`a015e4528ba717b865a1dc5453fdc8c44b65cb98c472cf99ee5f6737a9898e10`，与 state 一致。canonical
HEAD/tree/worktree diff/cached diff/status denominator、stale tuple、authority、completion claims 与
`completion_effect: NONE` 均未漂移；marker 是 hook bookkeeping，不构成 implementation/TST/Goal 扩权。

### A-POST-P1-001 — neutral launch prompt 的静态 Manifest SHA 已过期且不可稳定闭环

质疑：repo 外的直接启动文件
`/Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap/NEW-SESSION-PROMPT.md`（SHA-256
`990f0d676401106446fbb2ddf720efdc531ac709751434e33f89bdb12285ce33`）把
`a7b73e6e4aa7a9d7fdfc2742b8be2200f6f085198c57bcf303120b676d5550f6` 声明为“最终冻结” Manifest
SHA；marker refreeze 后的 reviewed manifest 实际 SHA 已是
`b4f4bae83f4fdc71fc2aca22013523bac0462fbc2a5817f78a7549ca9ee784a4`。更关键的是，A/B 对这次 delta
追加审查会再次改变各自 artifact SHA，继而必须再次 rebind manifest；因此让 prompt 继续追写一个
静态 manifest SHA 会形成 review → manifest → prompt → review 的循环，而不是稳定 anchor。

如果成立，影响：fresh session 按该直接启动文件先得到 verifier PASS，随后又读到一个与 live manifest
不一致的“最终冻结值”，只能猜测是 handoff drift、提示词过期，还是应忽略其中一个权威；提示词因此不能
作为无歧义的最终启动入口。只要静态 Manifest SHA 仍在，当前 A closure 就不能诚实保持 CLOSED。

证据：上述 prompt `最终冻结值` 段；reviewed manifest live SHA；state marker delta；manifest 对两份
redteam artifact SHA 的绑定结构。

REDTEAM_A_OPEN  
remaining counts: `P0=0 / P1=1 / P2=0 / P3=0 / total=1`  
reviewed target SHA-256: `ac66b0808b44fe04192ae8fbd0270e4db93d03e685c243646aa374ba2bcc8f29`  
current target disposition: `PROMPT_STATIC_MANIFEST_SHA_CONFLICT`

## Post-closure delta review A — prompt self-reference closure

A-POST-P1-001 已被回答。neutral launch prompt 的当前 SHA-256 是
`db4f72c6e9f4d94592aa0210abd3fd62f2647cf9f8e62120e1325a067bdcde90`，已完整回读至
`<!-- FILE_END: NEW-SESSION-PROMPT.md -->`；旧 `a7b73e…` 静态 Manifest SHA 已不存在。prompt 现在明确
规定 Manifest 与全部 artifact bytes 只由 verifier 的实时 sole PASS 判定，并禁止依赖复制出的静态
Manifest SHA，因而不再存在 redteam artifact rebind 造成的 hash self-reference 循环。

marker 仍是精确 7-byte ASCII `401 199`，state 仍为 `295f780f…`，target 仍为 `ac66b080…`；canonical
tracked/cached/status denominator、stale tuple、authority、checker truth 与 completion boundary 均未再次
漂移。修复前 neutral verifier 只因 A artifact byte drift fail-closed；manifest 最终 rebind 本 artifact
后才可获得 handoff-only PASS。未发现新的 P0–P2。

本裁决只恢复 Red Team A 对 handoff 的 closure；不把 marker、prompt、semantic candidate/episode、
实现、TST、human gate、`RULE_EXECUTION_VERIFIED`、`MPC2_CHANGE_ORDER_INTEGRATED`、根 Goal 或
`EVOLUTION_VERIFIED` 判为 PASS。

REDTEAM_A_CLOSED  
remaining counts: `P0=0 / P1=0 / P2=0 / P3=0 / total=0`  
final target SHA-256: `ac66b0808b44fe04192ae8fbd0270e4db93d03e685c243646aa374ba2bcc8f29`

## Final source-fix closure A — governed candidate + volatile marker

本轮完整复核的 target / state / verifier SHA-256 分别为
`97cc030fa39ebdace2189015b439449a53ecdfc757cda9a46595e53f2c7ade42`、
`6ae32c3d2bbc3201533d5615a3edcfae2e9c55c642a79d62171b71115d09ba06`、
`68616ff58b57d9e6c31c926df0b5896e388fabd368d5fc20fd0177dff9c531f3`；SAFE 与 ledger 未变。

### Delta 与全历史 closure 裁决

- 全部历史 findings 继续为 `ANSWERED`。authority/DAG、checker/gate truth、33-worktree/ref、eight-path
  overlap、external evidence、containment、remote full-list、neutral cwd、sanitized Git、双 clone、
  canonical tracked/status freeze、stale tuple 与 completion boundary 均无回退。
- governed candidate file 当前 SHA-256 是
  `fb7d53ebb5d7d88b6f179140e786c8654cd1b997afe37d999eb4ecd464e373a7`；
  `SC-20260820-001` 与 `SC-20260820-002` 各唯一一条，二者 live record 均为 `status: CANDIDATE`，state
  均声明 `CANDIDATE_PENDING_REVIEW`，没有 promotion 或 completion effect。reviewed verifier 同时绑定
  candidate file exact bytes、两个 ID、共同 path/hash 与两个 pending status。
- 第二次 Stop hook 把 marker 从 `401 199` 改为当前 7-byte ASCII `411 247`，证明其 counter bytes
  确实是 volatile hook bookkeeping。reviewed state 不再声明静态 marker hash，而是精确声明
  `verification: REGULAR_FILE_EXISTENCE_ONLY` 与 `volatile_hook_bookkeeping: true`；reviewed verifier 以
  repo-bounded path + `lstat` regular-file read 拒绝 missing/directory/symlink，同时刻意不把 volatile
  content 当 completion evidence。该 source fix 消除了每次 Stop hook 重写导致的 handoff hash 循环，
  没有扩大 implementation/TST/Goal 权限。
- final neutral launch prompt SHA-256 是
  `3424421deeb58662f619955e10a9fc9edb27d5fb48bcefef142a7c675beede25`，已读至 FILE_END；它已移除
  Handoff/Manifest/Verifier 的全部静态 64-hex bundle SHA，只以 live verifier sole PASS 为完整性真值，
  不再引入 prompt self-reference。
- 写入本 closure 前，neutral verifier 通过上述新增 candidate/marker checks 以及所有既有 live/state/
  evidence checks，唯一失败是旧 A closure target 与新 target SHA 不匹配。未发现新增 P0–P2。

本裁决只闭合 Red Team A 的 recovery handoff 审查；不把 candidates、marker、prompt、实现、TST、
human gate、`RULE_EXECUTION_VERIFIED`、`MPC2_CHANGE_ORDER_INTEGRATED`、根 Goal 或
`EVOLUTION_VERIFIED` 判为 PASS。

REDTEAM_A_CLOSED  
remaining counts: `P0=0 / P1=0 / P2=0 / P3=0 / total=0`  
final target SHA-256: `97cc030fa39ebdace2189015b439449a53ecdfc757cda9a46595e53f2c7ade42`

## Final machine-bound prompt closure A

### A-R6-P1-001 — external fresh-session prompt previously lacked a live machine binding

Initial challenge: the prior `97cc030f…` candidate described and manually hashed
`/Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap/NEW-SESSION-PROMPT.md`, but its manifest and
verifier did not read or bind those external bytes. If that condition had remained, the repo-local handoff gate
could still pass after the actual fresh-session prompt drifted, was replaced, or disappeared; that would leave the
new session unable to prove that its launch instructions were the reviewed instructions. The impact was P1
handoff-integrity risk, not an implementation/TST failure.

### Closure review

A-R6-P1-001 is `ANSWERED` in the final candidate. The reviewed target / state / verifier SHA-256 values are
`5c3344f20d807bccf378c990785f0897471c6555675c2cb2693f839d62be7bc4`,
`6ae32c3d2bbc3201533d5615a3edcfae2e9c55c642a79d62171b71115d09ba06`, and
`05629524c4d2bb18aab77d47b2673a5e3f7f67bd55d060b4cf17c061d4b827af`.

The manifest now has an exact `launch_prompt` object whose absolute path, SHA-256
`3424421deeb58662f619955e10a9fc9edb27d5fb48bcefef142a7c675beede25`, and role
`EXTERNAL_NEUTRAL_BOOTSTRAP_PROMPT` match the live regular file. The verifier’s
`validateLaunchPrompt` reads that exact path and fails closed on path, role, hash, terminal FILE_END, draft token,
any static 64-hex SHA in the prompt, missing absolute verifier path, missing sole PASS token, or missing exact
neutral cwd. The handoff also now explicitly says that the external manifest binds the neutral launch prompt.
The live prompt was completely reread through FILE_END; it contains the required absolute verifier path, exact
neutral cwd and sole-token rule, and no 64-hex static bundle SHA. `node --check` accepts the reviewed verifier.

All historical A findings, including the marker-volatility/source-fix delta, remain answered. No new P0–P2 was
introduced by the prompt binding. The current manifest is expected to fail closed on A artifact byte drift until
the main agent rebinds this final A artifact SHA; that mechanical rebind is not implementation authority.

This closure validates only the recovery handoff. It does not accept implementation, independent TST receipts,
human gates, `RULE_EXECUTION_VERIFIED`, `MPC2_CHANGE_ORDER_INTEGRATED`, the root Goal, or
`EVOLUTION_VERIFIED`.

REDTEAM_A_CLOSED  
remaining counts: `P0=0 / P1=0 / P2=0 / P3=0 / total=0`  
final target SHA-256: `5c3344f20d807bccf378c990785f0897471c6555675c2cb2693f839d62be7bc4`

<!-- RECOVERY_HANDOFF_CLOSURE_BEGIN -->
closure_token: `REDTEAM_A_CLOSED`
remaining_findings: `0`
final_target_sha256: `5c3344f20d807bccf378c990785f0897471c6555675c2cb2693f839d62be7bc4`
<!-- RECOVERY_HANDOFF_CLOSURE_END -->

<!-- FILE_END: 2026-08-19-rule-execution-recovery-handoff-redteam-a.md -->
