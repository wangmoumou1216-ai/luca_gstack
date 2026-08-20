# 评审 · REX → MPC2 → Cycle 2 Recovery Handoff（RECOVERY-HANDOFF-20260820-001）

> 评审方：Claude session（muse 绑定，TURN_ACTIVE）· 2026-08-20
> 被评审对象：`framework-audit/2026-08-19-rule-execution-recovery-handoff/` 全套 + 外部启动提示
> `/Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap/NEW-SESSION-PROMPT.md`
> 评审性质：**不是接力**。判「是不是真问题、该不该改、谁来改」，产出握手版提示词。
> 证据基准：全部结论由**当场跑出的命令**支撑，无一条来自阅读推断。

---

## 0. 一句话结论

**这份 handoff 的实质目标（REX → MPC2 → Cycle 2）我不推翻，也无权推翻；但它的启动机制现在
是死的——新 session 的第一条命令必然 exit 1，而提示词写明「失败时立即停止」。**
更严重的是：它要建的 owner/hunk matrix 基线已经错了，照原样执行会**静默回滚两个当天刚堵上的
安全洞**。所以必须改，且必须在开新 session 之前改。

---

## 1. 运行时真相（不是推断）

```
$ cd /Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap
$ env -u GIT_DIR … node …/tools/verify-recovery-handoff.mjs
RECOVERY_HANDOFF_GATE_FAIL: canonical HEAD drift
EXIT=1
```

verifier 首错即停，所以我另写了一份独立漂移报告，把它的每一项冻结值重算一遍。
**45 项对比，12 项 MISMATCH：**

| 项 | 冻结值 | 现在 |
|---|---|---|
| canonical HEAD | `ad9903df…` | `8ae3d919…` |
| canonical tree | `c467889b…` | `8238a872…` |
| upstream/main | `ad9903df…` | `8ae3d919…` |
| canonical worktree diff | `17077a26…` | `5a78319c…` |
| canonical status porcelain | `2ac0d65c…` | `55b4fa5a…` |
| status path 数 | 47 | 58 |
| untracked 数 | 45 | 56 |
| stale status | `50ef74f5…` | `f4e2e1e9…` |
| stale worktree diff | `7060ced7…` | `745cc7f1…` |
| worktree census | `f25f75a4…` | `a7b05c7d…` |
| ref census | `e568f806…` | `4b0a020f…` |

**没有漂移的**（重要，说明损伤是局部的、可修的）：7 个 authority 的 SHA、3 个 containment
文件、6 个 artifact 自身字节、verifier 自身、`.codex/hooks.json`、semantic candidate 文件、
meta episode 的 index/archive/raw 三个哈希、unlock marker、forensic tip/tree/common_base、
overlap 路径集、external evidence 顶层数。

> 附带的一个正面事实：被冻结的两个 tracked episodic 文件，我是**提交**了它们，
> 不是覆盖——`meta_episode` 的三个字节哈希至今仍与冻结值**逐字节相符**。
> 它们离开 status 列表是因为从 dirty 变成 committed，内容一个字节没动。

---

## 2. 逐条裁决

### F1 [BLOCKER] 门禁已死，新 session 第一步就停 —— **必须改**

真问题。提示词把 verifier 的 sole PASS 设为唯一通行证，而它现在 exit 1。
按提示词字面执行的结果是：新 session 读完提示词、跑一条命令、停止，什么都不做。

**归因（我先认领我的那份）：** 冻结时间 14:08，我在 14:30 之后又推了 4 个提交
（`83e907b` `7b05466` `bc08674` `8ae3d91`）并 push，upstream/main 随之移动。
分歧计数从冻结的 17 main-only 变成 **21**。

**但归因只是一半。另一半是机制本身有缺陷：** 这份冻结把三类**注定会变**的东西写进了门禁：

1. **hook 持续追加的 untracked 文件**（`observations.jsonl`、`retrieval-log.jsonl` 等）——
   框架自己的自成长回路每个 session 都在写；
2. **别的 session 的在飞草稿目录**——新增的 13 个 untracked 里有 12 个属于
   `framework-audit/2026-08-20-routing-steering-handshake/`，该目录**在我做这次评审的当下
   （19:33）仍在被写**；
3. **`upstream/main` ref**——任何一次 push 都会移动它。

在一个多 session 共享、hook 常驻写入的工作树上做**字节级全树冻结**，不是「严格」，
是**注定失效**。实证：这份冻结从写下到失效只活了约 20 分钟。

> 这条不是我在替自己开脱。我确实是第一个踩碎它的人。但即使我一行都不提交，
> routing-steering 那个 session 在 19:01–19:33 之间写的 12 个文件同样会踩碎它。

### F2 [BLOCKER] owner/hunk matrix 的基线已错 → 会静默回滚两个安全洞 —— **必须改**

这是整份评审里**后果最重**的一条。

八个 overlap path 里有两条，我在冻结之后各推了 3 个提交：

```
3  .claude/hooks/project-scope-guard.mjs
3  scripts/test-project-scope-guard.mjs
```

而 forensic 分支 `29282803` 上的守卫，**三个关键符号一个都没有**：

| 符号 | forensic 分支 | 当前 main | 作用 |
|---|---|---|---|
| `realTargetOf` | **0** | 3 | 判**真实目标**，堵软链绕过 |
| `resolve(input)` | **0** | 1 | 路径归一化，堵 `..` 词法穿越 |
| `localAssignments` | **0** | 2 | 命令内本地赋值展开，堵变量拼接绕过 |

DAG 第 5 步要求 build the current main ↔ forensic branch owner/hunk matrix，
而 `current main` 在这份 handoff 里被钉死成 `ad9903d`。**在那个基线上，我这三个提交的 hunk
根本不存在**——它们不会被判成 `BLOCKED_DIRTY_OVERLAP`（那是给「归属不明」的），
而是**压根不进矩阵**。于是 forensic 侧的守卫版本会以「唯一有主的版本」身份被恢复，
两个洞（`..` 穿越 / 软链绕过）**无声回来**，而唯一能抓住它们的 88 条断言在 main 侧。

他们的 `BLOCKED_DIRTY_OVERLAP` 默认值是好设计，但**防不住这一格**：
它防的是「看得见但说不清归属」，防不了「基线太旧所以看不见」。

### F3 [MAJOR] 第 12 步的 `git fetch upstream main` 已是空操作 —— **必须改**

```
$ git rev-parse HEAD == git rev-parse refs/remotes/upstream/main
IDENTICAL
$ git cat-file -e HEAD:framework-audit/2026-08-11-rule-execution-handshake/SESSION-CHANGE-DECLARATION.md
EXISTS in HEAD
```

「把 remote 留到最后一个 integration task 才读，以免提前污染判断」——这个设计意图
在 upstream/main 已经等于本地 HEAD 之后**自动失效**：要读的那份 declaration 现在就在
本地 HEAD 里，躺着可读。继续把它当「未读的未来」，会在最后一步产生虚假的确认感。

### F4 [MAJOR] 「stale checkout 永远只读」与 CLAUDE.md 冲突 —— **改措辞与时限，不动 containment**

CLAUDE.md 明写：`/Users/luca/Desktop/luca_gstack` 是**单真值源的两个检出之一**，且是
**记忆权威 store**；纪律是「改前 pull、改完即 commit+push」。
这份 handoff 把它称为 `stale`、判为 `STALE_READ_ONLY_PROTECTED`、**永远只读**、
禁止 pull/align/写入，并把它的 `MEMORY_ROOT` 称作 hazard。

实证它不是「stale 遗迹」而是**活的**：其 `memory/semantic/candidates.jsonl` 当天 19:10 被写过，
当前有 5 个 tracked 脏文件（`episodic/archive`、`episodic/index`、`evals/eval-log`、
`evals/routing/fixtures`、`retrieval-log`），而 SAFE-BOOTSTRAP 的散文只说「两个」——
**它自己对 stale 的冻结也已经漂移**（见 §1 表）。

裁决：**在 recovery 取证窗口内把它冻成只读是正确的**，我不动这条 containment。
但「**永远**只读 / 禁止 pull」越界了——那等于宣布框架的记忆权威检出永久停摆。
改成**限定在本次 recovery adjudication 期间**，并把它的身份说对（记忆权威检出，不是遗迹）。

### F5 [MAJOR] semantic candidate ID 撞车 —— **框架真 bug，我也有份**

两个 store 各有一条 `SC-20260820-001`，内容完全不同：

- canonical（muse 检出）：`Framework Git-remote integrity gates must compare … --all lists`（他们的）
- 母版检出：`project-scope-guard: 守卫的放行判据不得依赖路径拼法`（**我的**）

`SC-20260820-002` 同样撞。根因可复现，不是巧合：

```
memory/scripts/propose_semantic.py:80
    return f"{prefix}{max(candidate_count, promoted_count) + 1:03d}"
```

`next_id()` 只扫**本地** store 取 max+1，而 `memory/semantic/candidates.jsonl`
**在两个检出里都是 untracked**（`git ls-files --error-unmatch` 两边都报 did not match）——
即两个检出各持一份永不合并的本地文件。**同一天在两个检出各提一条，必然撞号。**

verifier 按 ID+字节在 canonical 侧校验，所以它会「通过」，而语义 ID 空间实际上已经污染。
**这是一个门禁看不见的损伤。**

> **我自己的 checkpoint 也错了**：`docs/handoff/2026-08-20-guard-and-codex-theme-checkpoint.md`
> 把 `SC-20260820-001` 记成我的那条。已在本文件更正，checkpoint 同步修。

### F6 [MINOR] checker 事实仍成立，但有一行现在指向我的提交 —— **只需更新引文**

当场重跑三个 checker（均已确认零写操作）：

- Cycle 2：`FINAL_HANDOFF_GATE_FAIL (7)`，exit 1 —— 与 §4 所述一致
- REX：`Error: source manifest exact path set drift`，exit 1 —— 一致
- MPC2：`FINAL_CHANGE_ORDER_GATE_PASS`，exit 0 —— 一致

**性质与条数都没变，我的提交没有制造新的失败。** 但其中一行的实测值变了：

```
post-package HEAD parent drifted: expected dce92e6b…; observed bc08674812…
```

`bc08674` 是我的提交（HEAD 的父）。冻结时该行的 observed 是 `b920608`。
期望值 `dce92e6b` 与新旧两个实测值都不符 → **这条失败先于我存在**，我只改变了它的实测值。
§4 的引文需要重新取样，不能当成「新失败」。

### F7 [MAJOR] 有第三个工作流在飞，正在重做同一套机器 —— **必须先对齐再动手**

`framework-audit/2026-08-20-routing-steering-handshake/` 在**本次评审进行中**
（19:16 → 19:33）仍在被写。读其内容：`REDTEAM-ROUND-2-TRANSACTION.md` 的 5 条 BLOCKER
全部围绕 **project pin 事务 / `TURN_ACTIVE` / PreToolUse / epoch / lease** ——
正是 `project-scope-guard.mjs` + `project-pin.mjs` 这套机器，
也正是 F2 那条 overlap path 所在的机器。

三方（recovery handoff / 我的守卫加固 / routing-steering 重设计）在改同一个文件。
任何一方在不看另外两方的情况下动手，都会再撞一次。

### F8 [结构] bundle 自封，第三方无法把它修好还回去 —— **决定了改法**

verifier 校验 `launch_prompt.sha256` 与 6 个 artifact 的字节。
**任何人修正提示词或 handoff 正文，都会让这份 verifier 判自己 FAIL。**
所以「我把他们的文件改对」这条路在机制上不成立——除非同时手改 manifest 里的哈希，
而那正是「把命令改到能过检查、风险原样存在」的反面教材，我不做。

（他们自己已经识别出这个族的一半：`SC-20260820-002` 说的就是「启动提示词不该硬编码
会在评审收尾时变化的 manifest SHA」。但反向依赖——manifest 钉住提示词字节——仍在。）

**另一个放大因子：`tools/` 里只有 verifier，没有生成器**（全仓 grep
`FINAL-SESSION-HANDOFF-MANIFEST` 只命中 verifier 自身）。
即这份冻结是**手工维护**的——这正是它跟不上现实的原因，也意味着「重新冻结」目前是一件
需要手改 15KB JSON 的活。**这条必须变成工具，否则修好一次还会再坏一次。**

### F9 [自证据] 我自己的守卫在本次评审中误伤了一次 —— **记录，不在本轮改**

写本文件时，第一次用 Bash heredoc 落盘被 `project-scope-guard` 拒：

```
Bash 通过环境变量或 ~ 间接引用项目根/display 路径，hook 无法安全重写其运行时值
```

触发源是**文档正文**里出现的 `~/Desktop/...` 字样，不是任何真实的项目路径访问。
`~` 展开是既有逻辑（非当天新增的 `localAssignments`），但这说明**静态匹配无法区分
「命令参数」与「heredoc 正文」**——已知误伤面，写在这里供 F7 那条工作流一并处置。
本轮不改：改它属于守卫的下一轮，且与本次评审的裁决无关。

---

## 3. 我改了什么、没改什么

**最小改动原则**：只改我有实证证明已坏的部分；他们的安全纪律一条不删。
（依据：缩减既有逻辑是需授权的动作，不是设计自由度。）

| 项 | 处置 |
|---|---|
| 实质目标 REX → MPC2 → Cycle 2 → `EVOLUTION_VERIFIED` | **原样保留**，我无权也无据推翻 |
| DAG 第 5–11、13 步 | **原样保留** |
| 13 条禁止项（no pull/reset/clean/stash/broad-add/auto-push/prune…） | **原样保留** |
| memory clone + `MEMORY_ROOT` 重定向 + `clean_git` wrapper | **原样保留**（成本高，但那是他们的取证纪律，我不替他们精简） |
| containment（unsafe resolver 不得重开） | **原样保留** |
| 第 1–2 步：neutral cwd + verifier 硬门 | **改**：verifier 降为**诊断**，第一件事变成「重建冻结」（F1/F8） |
| 第 5 步：owner matrix 基线 | **改**：基线取**重新冻结时的 HEAD**，并加**可执行的安全后置条件**（F2） |
| 第 12 步：保留 fetch | **改**：改为当场从 HEAD 读 declaration（F3） |
| stale checkout「永远只读」 | **改措辞**：限本次 adjudication 窗口；身份改回「记忆权威检出」（F4） |
| — | **新增**：SC ID 撞号必须先修再提新候选（F5） |
| — | **新增**：动 pin/guard 前必须与 routing-steering 工作流对齐（F7） |
| — | **新增**：必须写 manifest **生成器**，冻结不再手工维护（F8） |

**握手版提示词** 落在 `HANDSHAKE-SESSION-PROMPT.md`（与本文件同目录），
并已覆盖到启动路径 `/Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap/NEW-SESSION-PROMPT.md`，
原件备份为同目录 `NEW-SESSION-PROMPT.original-20260820.md`（原文另存于仓内
`FINAL-SESSION-HANDOFF.md` §9，双份不丢）。

---

## 4. 非负条款（我唯一不让步的一条）

任何 hunk 应用、分支恢复、package 重建之后，**必须**当场跑出并留证：

```sh
node scripts/test-project-scope-guard.mjs   # 期望 >= 88/88，且 FAIL=0
bash  scripts/verify.sh                     # 期望 PASS >= 75，FAIL=0
grep -c realTargetOf     .claude/hooks/project-scope-guard.mjs   # 期望 >= 3
grep -c 'resolve(input)' .claude/hooks/project-scope-guard.mjs   # 期望 >= 1
grep -c localAssignments .claude/hooks/project-scope-guard.mjs   # 期望 >= 2
```

任一不满足 → 该次恢复判 **REVERTS_SECURITY_FIX**，回退并停在人类门。

理由：`..` 穿越与软链绕过是**当天由红队实证复现过的真洞**，不是理论风险；
而 forensic 分支上三个符号计数全为 0。散文写「不要回退安全修复」没有约束力，
**只有跑得出来的断言有**。

<!-- FILE_END: REVIEW.md -->
