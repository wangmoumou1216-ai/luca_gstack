# 握手版 New Session Prompt · REX → MPC2 → Cycle 2

> 取代 `/Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap/NEW-SESSION-PROMPT.md` 的原版。
> 原版为何不能直接用：见同目录 `REVIEW.md`（F1/F2/F3/F4/F5/F7/F8）。
> **实质目标、DAG 第 5–11/13 步、13 条禁止项、memory clone 取证纪律、containment —— 全部原样保留。**
> 只改被实证证明已坏的部分，并加一条不让步的安全后置条件。

---

## 使用方式

从中性目录 `/Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap` 启动新 session，
把下面代码块整段贴进去（首 token 为 `/goal`）。

```text
/goal 继续现有的 REX → MPC2 → mattpocock/skills Cycle 2 Goal，直到最终 EVOLUTION_VERIFIED。

这是 luca_gstack 框架/meta 任务。Canonical repo：
/Users/luca/Desktop/项目/muse/lucagstack

保持当前 cwd：
/Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap

不要从 canonical repo、第二检出或任何 Git worktree 启动或切换 cwd。

────────────────────────────────────────────────────────
第 0 阶段 —— 门禁已知失效，第一件事是修门禁，不是过门禁
────────────────────────────────────────────────────────

先运行（**作为诊断，预期 FAIL，不是通行证**）：

node /Users/luca/Desktop/项目/muse/lucagstack/framework-audit/2026-08-19-rule-execution-recovery-handoff/tools/verify-recovery-handoff.mjs

已知实测结果：exit 1，`RECOVERY_HANDOFF_GATE_FAIL: canonical HEAD drift`。
独立复算显示 45 项冻结值里 12 项漂移（明细见 REVIEW.md §1）。
原因有两个，都必须承认：

  (a) 冻结（2026-08-20 14:08）之后 canonical 持续推进并 push（至本评审写就时已 +5 个提交：
      83e907b / 7b05466 / bc08674 / 8ae3d91 / 9dbb139），upstream/main 随之移动。
      **不要把这里的任何 SHA 当作当前值**——它此刻多半又变了，这正是 (b) 的症状。
  (b) 更根本：这份冻结把三类**注定会变**的东西写进了门禁——hook 持续追加的 untracked
      文件、别的 session 的在飞草稿目录、以及 upstream ref。在多 session 共享、hook 常驻
      写入的工作树上做字节级全树冻结，注定失效；实测它只活了约 20 分钟。

因此：

- **禁止**手改 manifest 里的任何哈希/HEAD 让 verifier 通过。那是把命令改到能过检查而风险
  原样存在，直接判本次 recovery 无效。
  **消歧（这两句表面矛盾，务必读清）**：禁的是**逐个改值**去迁就一份已过期的 manifest；
  允许并且要求的是**整份重新测量生成**——差别在于前者让门禁去适应现实，后者让 manifest
  重新反映现实，且必须经下面那道新的人类门。判据：你改的是「值」还是「测量」。
- **禁止**跳过或注释掉门禁继续往下走。
- 第一个工作项是 **G-REFREEZE**：重新采集冻结并**同时交付一个生成器**
  （`tools/emit-recovery-freeze.mjs` 或等价物），使 manifest 从此可复算、不再手工维护。
  当前 `tools/` 下只有 verifier、没有生成器——这正是它跟不上现实的根因。
- G-REFREEZE 必须**收窄冻结面**。判据是「这一项变了会不会让 adjudication 失效」：
  · 必须冻：forensic tip/tree/common_base、7 个 authority 的 SHA、3 个 containment 文件、
    8 条 overlap path 的内容身份、verifier 自身字节。
  · 不得冻：全树 porcelain status、untracked 路径清单、upstream ref 的 **OID（位置）**、
    别的 session 的草稿目录、hook 追加的 jsonl。
  · **必须冻 upstream 的 URL 身份（fetch 与 push 的 `--all` 全量列表，含基数）** ——
    这条不能跟着 OID 一起砍掉：红队 B 的 **B-R4-P1-001** 正是发现「冻结的 upstream endpoint
    不在 live gate 里」，remote URL 被改掉而所有 live 断言仍可全绿。
    **端点身份要冻，端点位置不要冻**——前者被改是攻击，后者移动是正常 push。
- G-REFREEZE 是**新的顶层人类门**：payload 算完停下等真实批准，不得自签。
  **预期行为：你会在此处停住等 luca**，这是设计的一部分，不是卡死。
- **只读阶段的例外，范围写死**：交付生成器意味着在「第一阶段只读」里写文件，与
  SAFE-BOOTSTRAP「first recovery phase 不得改 live source/hook」表面冲突。裁决：
  **允许**在 `framework-audit/2026-08-19-rule-execution-recovery-handoff/tools/` 下新建生成器，
  **不得**碰任何 live source / hook / skill / 生产脚本，**不得**在人类门批准前 commit/push。
  超出这个范围的任何写入都回到只读禁令。

只有 G-REFREEZE 获批并落地、verifier 在**新冻结**上给出唯一 RECOVERY_HANDOFF_GATE_PASS
之后，才允许进入第 1 阶段。

────────────────────────────────────────────────────────
第 1 阶段 —— 权威读取
────────────────────────────────────────────────────────

按绝对路径完整读取至 FILE_END：

1. /Users/luca/Desktop/项目/muse/lucagstack/AGENTS.md
2. /Users/luca/Desktop/项目/muse/lucagstack/CLAUDE.md
3. AGENTS.md 规定的 mandatory startup context
4. …/framework-audit/2026-08-19-rule-execution-recovery-handoff/FINAL-SESSION-HANDOFF.md
5. …/framework-audit/2026-08-19-rule-execution-recovery-handoff/SAFE-BOOTSTRAP.md
6. …/framework-audit/2026-08-19-rule-execution-recovery-handoff/RECOVERY-STATE.json
7. …/framework-audit/2026-08-19-rule-execution-recovery-handoff/RECOVERY-COMMIT-LEDGER.json
8. …/framework-audit/2026-08-19-rule-execution-recovery-handoff/FINAL-SESSION-HANDOFF-MANIFEST.json
9. …/framework-audit/2026-08-19-rule-execution-recovery-handoff-redteam-a.md
10. …/framework-audit/2026-08-19-rule-execution-recovery-handoff-redteam-b.md
11. …/framework-audit/2026-08-20-recovery-handoff-review/REVIEW.md   ← 评审第一轮
12. …/framework-audit/2026-08-20-recovery-handoff-review/DISPOSITION-AND-REDTEAM.md
    ← 评审第二轮（红队对抗）。**先读这份**：它更正了第一轮的一处错误结论，
      并列出了评审方自己没能完成的四项，别把第一轮当定稿。

读 4–10 时把其中的**状态数字**一律当作 2026-08-20 14:08 的快照，不是当前真相；
当前真相以 G-REFREEZE 的新冻结为准。REDTEAM_A_CLOSED / REDTEAM_B_CLOSED（remaining 均为 0）
仍然成立，那是对 handoff 文本的封闭，与状态漂移无关。

严格执行 SAFE-BOOTSTRAP.md，以下纪律**一条不减**：

- mandatory memory 命令只能在 disposable memory clone 中运行，MEMORY_ROOT 指向该 clone；
- 禁止让 search_memory.py 写 canonical 的 memory/retrieval-log.jsonl；
- memory clone 故意允许变脏，但永远不能作为证据、比较基线、package source 或 execution root；
- 必须另建一个干净、物理独立的 comparison clone；
- 所有 Git 调用使用 SAFE-BOOTSTRAP.md 中会清除全部继承 GIT_* 的 clean_git wrapper；
- 不得假设 shell function 能跨 tool call 保留。

**必办·记忆两层的处置（BLOCKER，不得静默跳过）**：08-15 的 `238bbd6` 给
`search_memory.py` 接入了 person / project 两层，同时加了一道隔离闸——
只有 `MEMORY_ROOT == /Users/luca/Desktop/luca_gstack` 才加载，否则 `PERSON_DIR = None`，
**静默关掉、不报错**。实测：一次性 clone → person 0 条；muse 检出 → 0 条；母版 → **83 条**。
`get_memory.py` 对 person 层**根本没有实现**，所以「--summary 跑过了」不构成覆盖。
上面的 bootstrap 强制 MEMORY_ROOT 指向 clone，且把母版判为 hazard 禁用——
**被判 hazard 的正是这道闸唯一认的权威哨兵。**
（归因：这是**框架级缺陷**，不是他们造的；任何非母版检出的 session 都一样盲。
但这份 bootstrap 把它焊死在整个 recovery 期间。两轮共 87KB 红队里 `person` 出现 0 次。）
二选一，**必须显式落其一**：
  ① 用 `MEMORY_PERSON_DIR` / `MEMORY_PROJECTS_DIR` 显式 opt-in——这两个 env 就是为
     「测试/沙箱显式取用」设计的，且**不破坏写隔离**（`RETRIEVAL_LOG` 仍从 MEMORY_ROOT 派生）；
  ② 明确记录「本次 recovery 在无 person/project 层的条件下作业」并列为已知盲区。
**不允许的是现状**：既不 opt-in 也不声明，看起来跑过了记忆启动协议。

**一处更正**：第二检出 /Users/luca/Desktop/luca_gstack 在 CLAUDE.md 里是**单真值源的两个
检出之一、且是记忆权威 store**，不是「stale 遗迹」。它当前是活的（当天 19:10 仍在被写，
有 5 个 tracked 脏文件，而 SAFE-BOOTSTRAP 散文只记了 2 个）。
所以：**本次 recovery adjudication 期间**把它冻为只读、禁止 align/pull/写入 —— 保留。
「**永远**只读」—— 撤销，那会宣布框架的记忆权威检出永久停摆。窗口结束即恢复常规纪律。

────────────────────────────────────────────────────────
第 2 阶段 —— 只读 recovery adjudication（顺序不变）
────────────────────────────────────────────────────────

1. 重新冻结 canonical、第二检出、worktrees/refs、containment、external evidence 和 checker
   truth（即 G-REFREEZE 的产物）。
2. 建立 **current main（= G-REFREEZE 时的实际 HEAD，不是 ad9903d）** ↔ forensic branch 的
   owner/hunk matrix，特别处理八个 overlap paths。
   **本条经红队降级，措辞已更正：** 原稿说「照原样执行会静默回滚安全洞」是**错的**——
   照原样执行会停在第 0 阶段的门禁，根本走不到这一步；而 RECOVERY-COMMIT-LEDGER 自己也写着
   owner matrix 必须 `freshly reconstructed`。真实成立条件只有一种：**门禁被绕过或手改后
   沿用冻结数字建矩阵**。所以这条是**绊线**不是活缺陷——但绊线仍要拉好。
   原版把基线钉死在 ad9903d，而 canonical 早已越过它——
   其中 .claude/hooks/project-scope-guard.mjs 与 scripts/test-project-scope-guard.mjs
   在 ad9903d 之后各有 >=3 个新提交（自己数，别信这里的数字）。用旧基线建矩阵，这些 hunk
   **不会被判 BLOCKED_DIRTY_OVERLAP，而是压根不进矩阵**，于是 forensic 侧的旧守卫会以
   「唯一有主的版本」身份被恢复。基线只能取 `git rev-parse HEAD` 的当场值。
3. 未确认归属的 hunk 必须 BLOCKED_DIRTY_OVERLAP。
4. 裁决 REX source-manifest drift、历史 G-PLAN/G-PACKAGE/G-CONTAIN、TST-001/TST-002，
   以及 root identity 已漂移的 G-OBLIGATION chain。
5. 旧 receipt 不得静默当作 fresh PASS。三个 checker 当前实测（2026-08-20 晚重跑）：
   Cycle 2 = FINAL_HANDOFF_GATE_FAIL (7) exit 1；REX = source manifest exact path set drift
   exit 1；MPC2 = FINAL_CHANGE_ORDER_GATE_PASS exit 0。性质与条数同冻结时，未新增失败；
   但 Cycle 2 其中一行的实测值已变为 `post-package HEAD parent drifted: expected dce92e6b…;
   observed bc08674812…`，须重新取样引用，不得当成新失败。
6. 如需新 package 或 obligation scope，计算 exact payload，并停在新的顶层人类门等待真实批准。
7. 只有有效 gate 和独立 TST receipt 允许后，才能从最早未解决的 REX 节点恢复实现。

**通报（经红队核实后已降级，不是文件级冲突）**：另有一条工作流
framework-audit/2026-08-20-routing-steering-handshake/ 在 2026-08-20 19:33 仍在写入，
Round-2 红队 5 条 BLOCKER 围绕 TURN_ACTIVE / epoch / lease / 直接调用重放。
核实结论：它自报 `Production hooks changed: no`，尚在普查/设计阶段；其计划点名的文件是
**pin 事务侧**（project-pin.mjs / project.sh / session-restore / session-sync），
**不含 project-scope-guard.mjs**。所以是**相邻面并发**，不是同文件冲突。
处置：动 pin 事务侧文件前先读它，避免重复设计；不必把交集列为 BLOCKED_DIRTY_OVERLAP。

────────────────────────────────────────────────────────
非负条款 —— 安全后置条件（不可协商）
────────────────────────────────────────────────────────

**两段式，第二段不做则第一段的绿不算数。**

【第一段·状态】任何 hunk 应用、分支恢复、package 重建之后，当场跑出并留证：

  node scripts/test-project-scope-guard.mjs      期望 >= 88/88 且 FAIL=0
  bash  scripts/verify.sh                        期望 PASS >= 75 且 FAIL=0
  grep -c realTargetOf     .claude/hooks/project-scope-guard.mjs    期望 >= 3
  grep -c 'resolve(input)' .claude/hooks/project-scope-guard.mjs    期望 >= 1
  grep -c localAssignments .claude/hooks/project-scope-guard.mjs    期望 >= 2

【第二段·断言自证】在真仓里做一次**故意的外科回退**——把框架豁免的判据从「真实目标」
退回词法解析（`realTargetOf(s)` → `resolve(s)`，其余不动）——**证明套件会转红**，
记下转红的断言编号，然后精确还原（`cp` 备份还原，禁止 `git checkout` 整文件）。

  转红 → 第一段的绿是真的；
  仍绿 → **说明这套断言测不到这个缺陷面**，第一段的绿是摆设，必须先补断言再谈恢复。

任一段不满足 → 判 REVERTS_SECURITY_FIX，回退该次恢复并停在人类门。

**为什么把举证责任放在你这边（诚实交代）**：这条款是评审方提的，但评审方**没能自己证明它有效**。
三次变异尝试全部失败——整体换 forensic 守卫、外科变异、以及**阳性对照（字节相同的现行守卫）**
三者给出**完全相同**的 `PASS=56 FAIL=32`，说明夹具在陌生 cwd 下自崩，那三次「转红」都是装置故障
不是缺陷检出。改用差分夹具也没救活（连「跨项目绝对路径应 DENY」这个对照都返回 PASSTHROUGH）。
所以：**「88/88 能挡住外科式回退」目前是一个未经证明的假设。** 你在真仓里有 in-place 权限，
证明它只要两分钟；不证明就用它当门，等于拿一个没验过的闸当安全边界。

来由：forensic 分支上那三个符号计数**全部为 0**（实测）。它们分别堵的是 `..` 词法穿越、
软链绕过、变量拼接绕过——三个都在 2026-08-20 由红队**实证复现**过，不是理论风险。

────────────────────────────────────────────────────────
附加工作项（本轮新增，各自独立，不阻塞主线）
────────────────────────────────────────────────────────

- **SC ID 撞号必须先修再提新候选。** 两个检出各有一条内容完全不同的 SC-20260820-001
  （SC-20260820-002 同样撞）。根因：memory/scripts/propose_semantic.py 的 next_id() 只扫
  本地 store 取 max+1，而 memory/semantic/candidates.jsonl 在**两个检出里都是 untracked**、
  永不合并。同一天在两个检出各提一条必然撞号。verifier 只在 canonical 侧按 ID+字节校验，
  所以门禁看不见这个损伤。在提出任何新 semantic candidate 之前先定 ID 分配方案
  （检出判别位 / 纳入版本控制 / 集中分配三选一），并把已撞的两对重新编号。

────────────────────────────────────────────────────────
之后严格按顺序完成（与原版一致，未改）
────────────────────────────────────────────────────────

RULE_EXECUTION_VERIFIED
→ MPC2 CO-01..CO-11、DASSERT-001..012
→ MPC2_CHANGE_ORDER_INTEGRATED
→ 原 Cycle 2 E0–E7、全部 DEV/TST/ASSERT、人类门、321/321、2,568/2,568、live cutover、
  adoption/pin/benchmark 和 fresh Claude/Codex
→ EVOLUTION_VERIFIED

保留所有 receipt 到持久路径，禁止只存在 /private/tmp。

全程禁止（与原版一致，未减一条，新增末两条）：

- git pull；
- git reset / clean；
- 自动 stash；
- broad stage 或 git add .；
- worktree prune；
- 自动 push；
- 覆盖用户 dirty/untracked；
- 写入或对齐第二检出（本次 adjudication 窗口内）；
- 把 focused/static/single-harness PASS 冒充完成；
- **手改 manifest 哈希或 HEAD 以让门禁通过**；
- **在 G-REFREEZE 获批落地之前进入第 2 阶段**。

────────────────────────────────────────────────────────
最终步骤的更正
────────────────────────────────────────────────────────

原版把 `git fetch upstream main` + 读 SESSION-CHANGE-DECLARATION.md 保留到最后一个
integration task。**这不是漂移造成的，是设计期就有的错误**——manifest 冻结值里
`upstream_main` 与 `canonical.head` 本来就是同一个对象，**成稿那一刻它就已经是空操作**。
（两轮红队都没抓到这条；B-R4-P1-001 谈的是 upstream **URL** 不在 live gate 里，是另一件事。）
实测 upstream/main 与本地 HEAD **完全相同**
（自己用 `git rev-parse HEAD refs/remotes/upstream/main` 复核，不要引用本文里的具体值），且

  git cat-file -e HEAD:framework-audit/2026-08-11-rule-execution-handshake/SESSION-CHANGE-DECLARATION.md

已存在。所以那份 declaration 现在就在本地、躺着可读，「留到最后才读的未来」这个设计意图
已经自动失效；继续照做只会在最后一步产生虚假的确认感。

改为：在第 2 阶段建 owner matrix 时**当场从 HEAD 读**该 declaration 并纳入 matrix 对账。
最后一步保留 `git fetch upstream main`（仅确认 remote 未再前进），出现新 overlap 或
payload drift 时返回 owner matrix 或对应 exact human gate。

RECOVERY_HANDOFF_GATE_PASS 只证明 handoff 完整，不是实现 PASS。只有全部义务和
fresh Claude/Codex 终验通过，才能报告唯一终态 EVOLUTION_VERIFIED。
```

<!-- FILE_END: HANDSHAKE-SESSION-PROMPT.md -->
