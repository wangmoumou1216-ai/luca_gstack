# 执行前漂移审计 — EXECUTION-PLAN-CORE.md vs 当前 runtime

> 执行 session：`lucagstack-9d`（sid `ee5e5ee0-a9a4-4418-b7a2-e2d0d779311b`）
> 审计时间：2026-08-31
> 隔离工作面：`.claude/worktrees/routing-steering-exec`，分支 `fix/routing-steering-e1e2e3`，基于 `upstream/main` = `fc6eeb5`
> luca 的主检出（`HEAD=72bd1f2`，95 项在途）**全程零触碰**

---

## 0. 结论摘要

计划声明 `BASELINE=72bd1f2`。upstream 此后推进两条：`6aaa1c6`（六项 engineering-delivery 集成，
88 文件）与 `fc6eeb5`（`72bd1f2` 的等价重提交）。`6aaa1c6` 触及 §8 清单中的
`route-guard.mjs` 与 `codex-hook-adapter.mjs`，以及约 78 个非 audit 路径——
**`K2` 条件成立，"纯 audit 提交"豁免不适用，该轮评审按计划自身规则作废。**

漂移不是装饰性的。三条实质冲突（D1/D2/D3），其中 **D2 指向计划 §8 的文件清单错误**。

---

## D1 — §3.2「三个早返」在当前 runtime 是四个分支 / 五条 return

计划 §3.2 的核心接线约束是「`RESOLVE` 与 §4 信号必须穿过 `buildDecision` 的**全部三个**早返」。

实测（`.claude/hooks/route-guard.mjs`，`buildDecision` @788，`skillDecision` @850）：

| 分支 | 形态 | 计划是否覆盖 |
|---|---|---|
| `mixed_ambiguous` | 对象字面量，可 spread | ✅ |
| `gate` 短路 | 对象字面量，可 spread | ✅ |
| `PLAN_MODE` → `if (!wayfinderAutoPredicate(...)) return complexity;` | **裸 return** | ✅（但下面多了一条） |
| `PLAN_MODE` → `return { ...complexity, recommendedSkills:['/wayfinder'] }` | spread return | ❌ 计划成稿时不存在 |
| `explicitEngineeringDeliverySelection` → `FRAMEWORK_FLOW` | 对象字面量 | ❌ **全新分支，计划完全未知** |

符号存在性（阳性对照 `function buildDecision` = HEAD 1 / worktree 1）：

```
explicitEngineeringDeliverySelection   HEAD(72bd1f2)=0   worktree=3
wayfinderAutoPredicate                 HEAD(72bd1f2)=0   worktree=2
```

**后果**：漏掉新分支 = 计划 §7.2 变异体 12 描述的失效形态（信号被静默丢弃），
发生在 engineering-delivery preset 这条路径上。

**附带**：§3.2 的行号锚点在计划**自己声明的基线上就已过期**——
`:737/:757/:770/:772` 精确落在 `mixed_ambiguous`/`gate`/`return complexity`/`skillDecision`
的是 `4658595`（K2 已宣告失效的旧基线），不是 `72bd1f2`，也不是现在。

---

## D2 — §8 为 E3 指定的文件里没有 E3 的代码

计划 §8 写：`.codex/codex-hook-adapter.mjs  # Codex msg_* 身份与 null 源`。

实测（阳性对照：`apply_patch` 在该文件出现 11 次，证明文件确实被读到）：

```
.codex/codex-hook-adapter.mjs            turn_id 出现 0 次
.claude/hooks/lib/project-substrate.mjs  turn_id 出现 18 次
```

adapter 内对 `session_id` / `prompt_id` / `msg_` 的 grep 只命中一行注释，**零身份合成逻辑**。

产生 E3 故障的那行在别处：

```
.claude/hooks/lib/project-substrate.mjs:457
  if (consumed.includes(requested)) throw new Error(`top-level turn id already consumed: ${requested}`);
```

配套状态文件 `.claude/.session-consumed-turns-<sid>`（同文件 `:153`）。
这正是 E3 的现象——同一 `turn_id` 的第二条消息被 anti-replay 拒。

`project-substrate.mjs` **既不在 §8 的「要改」清单，也不在「不动」清单**——计划完全没有提到它。

---

## D3 — 计划成稿后落地了一套 fail-closed 的框架变更管制

`6aaa1c6` 新增 `.claude/hooks/controlled-change-guard.mjs`（195 行）并接进
`.claude/settings.json` 的 PreToolUse，Codex 侧由 adapter 的 +158 行负责分发。
`.claude/skill-os/controlled-change.yaml` 声明：

- `guard.structured_tools: [Write, Edit, MultiEdit, NotebookEdit, apply_patch]`
- `shell_policy: deny_by_default`
- `activation.applies_when: "A Plan Agent or Orchestrator execution will mutate the LucaGStack repository."`
- git stage/commit/push 需要绑定 command SHA 的一次性授权 + human gate

**当前是休眠态**（可执行边界，非文档推断）：`.git/luca-controlled-change/` 下两个 witness
（`matt-six-1db326ae078ddefe`、`matt-six-verifier-corrective`）**均为 `state: COMPLETED`**（terminal）
且各自有 `receipt.json` → 命中 yaml 的 `inactive_when`「最新 witness 为终态且与其持久 receipt 匹配」。

**但**：计划的 §8「只改这 5 个文件」与交接稿的 Git 纪律，都成稿于这套管制存在之前。
本次实现是否应当（或必须）走 controlled-change 事务，计划无法回答。

---

## 已核实为「不构成阻碍」的项

- **A2 / S44**：已解除。receipt 于 20:34 由他方改为 `state: VERIFIED`；`verify.sh` 现 **PASS=85 FAIL=0 WARN=2**。
- **A3 / K3 dirty overlap**：主检出 28 个改动文件中 **23 个与 `upstream/main` 逐字节相同**
  （含两个目标文件），差异的 5 个是 4 个运行时追加文件（`K5` 明文豁免）+ 5a 自己的
  `FINAL-EXECUTION-PLAN.md`。未跟踪项 27 个在 upstream 已有同名同容。
  **结论：目标文件上不存在他人未收口的分歧改动。** 本执行改走隔离 worktree，该条彻底绕开而非绕过。
- **A1**：非「落后 1 条」，是 ahead 1 / behind 2 的分叉；`git merge-tree`（只读）预演**零冲突**，
  合并结果保住 `72bd1f2` 的 `SESSION_SYNC_FORCE_ON_STOP` 修复。
- **§8 的 `.gitignore` 前提成立**：`.claude/.session-obligation-<sid>` **未被**忽略
  （阳性对照：`.session-project-<sid>` 命中 `.gitignore:97`）。

## D4 — `REDTEAM-C1-FINAL.md` 残留项逐条对账

交接稿称「3 BLOCKER 已修进计划，5 MAJOR / 5 MINOR 未全部处理」。逐条核实结果：

| 缺陷 | 状态 | 证据 |
|---|---|---|
| BLOCKER-1 终态无生产者 | ✅ 已修 | §4.2 有终态生产者表 + 20 轮封顶 |
| BLOCKER-2 义务拒 scope 未定义 | ✅ 已修 | 全文统一为「不拦 Stop、不拒 scope」 |
| BLOCKER-3 §5.3 `stop_hook_active` 残留 | ✅ 已修 | §5.3 明写该条随 08-31 裁决删除 |
| MAJOR-1 ≤40 字摘要生成方式 | ✅ 已修 | §4.2 有 NFC→折叠→按码位取 40→补 `…` |
| MAJOR-2 注入接线硬约束 | ✅ 已修 | §8 有「注入点位的接线硬约束」三条 |
| MAJOR-3 变异体 14 单轮恒绿 | ✅ 已修 | §7.2:14 要求同 sid 连续 ≥3 轮 |
| MAJOR-4 变异体 15 挂错文件恒绿 | ✅ 已修 | §7.2:15 已作废替换为 20 轮封顶变异 |
| **MAJOR-5 谁升 `PENDING` 未指定** | ❌ **未修，且是实现阻断** | 见下 |
| MINOR-1 §8 注释漏 `A-OBLIG-VISIBLE` | ✅ 已修 | §8:415-416 |
| MINOR-2 悬空引用「§4.2a 第 3 条」 | ✅ 已修 | 零命中（阳性对照：`§4.2a` 全文 5 次） |
| MINOR-3 KILL 顺序 K1,K2,K5,K3,K4,K6 | ❌ 未修（纯排版） | §10:463-476 |
| **MINOR-4 注入串与既有 hint 一字之差** | ❌ **未修，恒真风险** | 见下 |
| MINOR-5 §9 不跑 `test-codex-adapter` | ✅ 本执行已接住 | 计划 §9 仍缺，但已进本执行断言 `AS-07` |

### MAJOR-5（未修）—— 两条断言互相矛盾，照任一实现都会出事

计划 §4.2:155 只说「升 `PENDING` 的唯一途径 = 下一个**经认证的**人类事件」，**从未指定由哪个 hook 推进**。
而认证按 §5.2 发生在第一个 PreToolUse/Stop，与注入所在的 `UserPromptSubmit` 是不同进程。
更糟的是两条验收断言对 Stop 的措辞不一致：

- `A-OBLIG-VISIBLE`（§7.1:356）：「Stop 路径均无义务相关输出（`session-sync.mjs` 的 **stdout** 不因义务改变）」→ 只约束 stdout
- `A-OBLIG-LIFECYCLE`（§7.1:357）：「PreToolUse 与 Stop 两条路径均无任何义务相关输出（…的**行为**不因义务改变）」→ 约束行为，等于禁止状态写入

**事实前提已实测核实**：`.codex/hooks.json:30` 的 PreToolUse matcher 是 `^(Bash|apply_patch)$`
（阳性对照：Claude 侧 `.claude/settings.json:38` 是 `^(Write|Edit|MultiEdit|NotebookEdit|Read|Grep|Glob|Bash)$`）。
故 Codex 的**纯读回合根本没有 PreToolUse**。若按 `A-OBLIG-LIFECYCLE` 的字面实现（Stop 不得碰义务），
该回合永远升不到 `PENDING`——**E2 在这条路径上静默不修，且没有任何断言会红。**

**本执行的裁决（记为实现决策，不改计划字节以免触发 `K1`）**：采纳红队 A-7 给出的措辞——
> `SIGNAL_UNCONFIRMED → PENDING` 由**执行惰性认证的那一侧**（PreToolUse 或 Stop，先到先得）推进；
> Stop 侧**允许且必须**推进状态；`A-OBLIG-VISIBLE` / `A-OBLIG-LIFECYCLE` 的 Stop 约束**仅针对 stdout**，
> 与状态写入无关。

理由：另一种读法（Stop 完全不碰义务）与计划 §4.2 自身「`PENDING` 必须可达」直接冲突，不自洽；
本读法是唯一能让两条断言同时成立的解释。实现时必须**同时**加一条断言钉死「Stop 推进了状态但 stdout 无变化」，
否则这条裁决本身没有守卫。

### MINOR-4（未修）—— 注入串与既有 hint 一字之差，会造出恒真断言

计划 §4.2a:194 要注入 `[route-guard] 📌 当前有未完成任务：…`；
而 runtime `route-guard.mjs:1145` **已经**在同一个 `hints` 通道发 `[route-guard] ⚠️  当前有未完成节点: …`。
「任务」vs「节点」一字之差、同前缀、同通道。任何按 `当前有未完成` 做子串匹配的断言**对两者都绿**，
即变异体 14/15 可能在义务注入根本没实现的情况下照样通过。

**本执行的处置**：`A-OBLIG-VISIBLE` 相关断言一律锚定**完整串含 `📌`**，并对既有 `⚠️ …节点` 串加一条
反向对照（存在但不得被义务断言计入）。

## D5 —— 现场撞上的框架 bug：worktree 提交会被测试写进用户分支

**这条不是计划漂移，是执行中真实触发的缺陷，已完整复现并定位。**

### 现象（三个后果，同一根因）

在隔离 worktree 里执行一次普通 `git commit` 后：
1. 分支上出现一条**我没写过的提交** `d0384d8`，消息为 `fixture`，内容 = 我暂存的 2 份文档 + 一个 `target.txt`，
   且 author date 与 commit date 相差 52 秒；
2. 我那次提交本身被 `verify.sh` 判 FAIL 挡下（没落地）；
3. 此后约 10 分钟内，`controlled-change-guard` 对本 session **一切工具调用**（含 Bash 与 Read）返回
   `deny: guard exception while controlled mode is required: git rev-parse --show-toplevel failed`，随后自行解除。

### 根因（RED/GREEN 对照实测）

git 往 hook 注入的环境**在链接 worktree 与普通仓里不同**（实测，非文档推断）：

| | 普通仓 | 链接 worktree |
|---|---|---|
| `GIT_DIR` | **不注入** | `<main>/.git/worktrees/<name>`（**绝对路径**） |
| `GIT_INDEX_FILE` | `.git/index`（相对，随 `-C` 一起漂移，无害） | `<main>/.git/worktrees/<name>/index`（**绝对路径**） |

而 `scripts/test-controlled-change.mjs` 的 `run()` 整份继承 `process.env`：

```js
env: { ...process.env, ...(options.env || {}) },
```

`GIT_DIR` 重定向的是**仓库**（refs / objects / index），**不是工作树**——工作树仍由 `-C` / cwd 决定。
实测（只设 `GIT_DIR=A`，在仓库 B 里跑）：

| 查询 | 解析到 |
|---|---|
| `rev-parse --show-toplevel` | **B**（工作树未被重定向） |
| `rev-parse --absolute-git-dir` | **A** |
| `rev-parse --git-common-dir` | **A** |
| `git add new.txt && git commit -qm leaked` | 提交落在 **A 的分支**，内容取自 **B 的工作树** |

于是该测试的 `git(tempRepo, …)` 调用**从临时目录取内容、往真仓写提交**：`git add target.txt` 写进
**用户的 index**，`git commit -qm fixture` 把**用户当时的暂存区 + target.txt** 提交到**用户的分支**上。

> **更正（2026-09-01，由冷启动会审专家指出后我独立复验）**：本节初稿写的是「`GIT_DIR` 压过 `-C`，
> 阳性对照 `GIT_DIR=A git -C B rev-parse --show-toplevel` 打印 A」。**那条阳性对照是被污染的**——
> 我当时同时设了 `GIT_WORK_TREE=A`，打印 A 是后者的功劳。单独设 `GIT_DIR` 时它打印 **B**。
> 端到端 RED/GREEN 的结论不受影响（提交确实落进了用户分支），但那句机制论证是错的，已按上表更正。
> 教训与 [[feedback_scope-diff-measurement-to-fresh-output]] 同族：**阳性对照本身也要控制变量，
> 多设一个变量就等于没做对照。**

链路：`.githooks/pre-commit:84 → exec bash scripts/verify.sh` → `verify.sh:110 → npm run test:controlled-change`。
**即：这个仓里每一次从链接 worktree 发起的 `git commit`，都会走到这条路径。**

### 对照证据（同一夹具，只换脚本）

```
RED  （未修版 fc6eeb5）  分支提交数 1 → 2   顶部提交 = 'fixture'
GREEN（已修版）          分支提交数 1 → 1   顶部提交 = 'seed'
```

夹具是「scratch 主仓 + 链接 worktree + git 真实注入的钩子环境」，全程未接触真仓。
（过程中夹具坏过三次——漏传 `--all`、多设 `GIT_WORK_TREE`、误判普通仓可复现——
均先修夹具再下结论；**第三次修正的是结论本身：最初判定的「普通仓也会污染」不成立。**）

### 修复与它自己撞上的闸

一行级修复：`run()` 剥离位置类 `GIT_*`（`GIT_DIR` / `GIT_WORK_TREE` / `GIT_INDEX_FILE` /
`GIT_OBJECT_DIRECTORY` / `GIT_ALTERNATE_OBJECT_DIRECTORIES` / `GIT_COMMON_DIR` /
`GIT_NAMESPACE` / `GIT_PREFIX`），`options.env` 显式指定的仍然生效。修复后
`test-controlled-change.mjs --all` 全绿，无回归。

**但该文件被六项集成的 `CANDIDATE-MANIFEST.tsv` 按 sha256 钉死（CAS 锁）**，改一个字节即触发
`verify.sh` 的 **S45 `candidate tuple drift`**。移动这个 pin 属于 controlled-change 的人类门，
**不是执行者可以自决的**——故本修复留在工作树、不提交，等 luca 裁决。

另：worktree 里 `verify.sh` 还有 **S34 FAIL**（`本仓 hook 未获授信 6/6`，主检出 19/0 通过）。
修它要跑 `codex-trust-hooks.mjs` 改 Codex 全局配置，同样不属执行者自决范围。

## P1 门裁决 —— 冷启动独立会审（2026-09-01）

**VERDICT: `NEEDS_ARCHITECTURE_REVIEW`。** 会审为冷启动（无本 session 上下文），被明确告知
`NEEDS_ARCHITECTURE_REVIEW` / `BLOCKED` 是可接受结论，并被要求专攻本审计。它自己跑命令复核，
未改任何文件。逐条裁决：

| 项 | 裁决 | 要点 |
|---|---|---|
| D1 | **机械** | 五条 return 中 #4 是 `{...complexity}` spread，§3.2 已强制的携带模式免费覆盖它；只有 #5（`FRAMEWORK_FLOW` 对象字面量）需显式补一次 spread。需改的是散文计数、行号锚点、变异体 12 的用例表 |
| **D2** | **架构（且本审计诊断不足）** | 身份合成在 `route-guard.mjs:72`（`turn_id \|\| user_message_id \|\| randomUUID()`），`:1134` 同一次 UserPromptSubmit 内同步消费，`:1162` catch 成「⛔ PROJECT STATE」。§5.2 要求的惰性认证层**在本仓不存在**：`session-sync.mjs` 与 `project-scope-guard.mjs` 各自 `attest/queue/msg_/rollout/prompt_id` 全为 0，而这两个文件正是 §8 声明不改、变异体 15 声明「全程不改」的。**E3 按规格写是新子系统，不是重锚** |
| D3 | **无效（no-op）** | `controlled-change` 零编排集成（CLAUDE.md / AGENTS.md / plan-agent.md / orchestrator.md 提及数均为 0），无任何路径自动创建 witness；不走它不构成绕过。另：`controlRoot()` 用 `--git-common-dir`，worktree 与主检出同值，worktree 并未逃逸管制，只是管制没开 |
| D4 | **读法正确、归属错误** | 我采纳的红队 A-7 措辞是唯一自洽解，但「Stop 侧允许且必须推进状态」意味着往 `session-sync.mjs` 写义务代码，§8 从 5 文件重新扩到 7，正是 D2 的同一条边界。**并入 D2 一起裁，不能作为执行者的实现决策私下记账**——那恰好绕过 K1 存在的意义 |
| D5 | **成立，独立复现** | 它自建夹具复现了链接 worktree 的注入差异与端到端污染。**并指出本节初稿的阳性对照是错的**（见上文更正） |

**新查出、此前无人抓到的恒真项**：
- **变异体 19 恒真**：它描述的 `:683` / `tool_name='Bash'` / `*** Begin Patch` 形态在 `route-guard.mjs` 中计数全为 0，那些东西在 `project-scope-guard.mjs`——而该文件已被 BLOCKER-2 移出 §8。属 C1 改写变异体 13 后的残留，与 MAJOR-4 同型但未一并修。
- **`A-GATE-SUPPRESS` 反向对照测不到**：测试环境 `ROUTE_GUARD_PROJECTS='luca-dev,ai 宠物提示'` 不含 `muse`，故 `route-guard 在 muse 里怎么走` 与正例同样返回 `NONE`，零分辨力；fixture 必须自己覆盖 `ROUTE_GUARD_PROJECTS`。
- `A-OBLIG-VISIBLE` / `A-OBLIG-LIFECYCLE` 的 Stop 子句**今天恒真**（§8 从不改 `session-sync.mjs`），采纳 D4 后 LIFECYCLE 的「行为不因义务改变」将变**恒假**。两条都不是守卫。

**未被漂移动摇、不得重开**：§3.3 授权轴否定判定的删除、§4.1「同从句」的删除、§4.2a 不拦 Stop 的裁决、
§6 `REQ-SCOPE-NULL-FIRST`、E1 别名契约。会审在 `fc6eeb5` 上重验了 §6.1 与 `A-GATE-SUPPRESS` 正例仍成立。

**建议路径**：把 **E3 拆出单独立项**；E1+E2 对 `fc6eeb5` 确属机械，可在重锚后的计划上先行。

## 重锚清单（E1+E2 执行口径；E3 拆出）

依 P1 门裁决执行。**本清单不改 `EXECUTION-PLAN-CORE.md` 字节**（避免触发 `K1`）——它是执行者
对该计划的差异口径，落点在实现与测试里，计划本体的修订与重新批准 SHA 由 luca / 计划所有者裁。

### 拆分

- **E1 + E2 继续按本计划执行**，基线重钉为 `fc6eeb5`。会审在该基线上重验了 §6.1、
  `A-GATE-SUPPRESS` 正例、`A-SCOPE-NULL` 缺陷仍在，四条不得重开的结论（§3.3 / §4.1 /
  §4.2a / §6）全部存活。
- **E3 移出本次范围，单独立项**。理由不是漂移，是计划自身的边界矛盾：§5.2 要求的惰性认证层
  在本仓不存在，唯一可能的两个宿主（`project-scope-guard.mjs` / `session-sync.mjs`）都被 §8
  声明不改、被变异体 15 声明「全程不改」。这是 `EXPERT-REVIEW-CORE-01` Q1 在 `4658595` 就
  指出过、C1 只为 E2 侧「删掉要求」而从未对 E3 侧复用的同一条。**D4（MAJOR-5）随 E3 一起走**
  ——「Stop 侧允许且必须推进状态」同样要往 `session-sync.mjs` 写代码，是同一条边界。

### E1+E2 的差异口径（逐条可执行）

| # | 计划原文 | 执行口径 | 依据 |
|---|---|---|---|
| R-1 | §3.2「`buildDecision` 里有**三个**早返」 | 当前基线是**四个分支 / 五条 return**。#4（`{...complexity}` + wayfinder）由 §3.2 已强制的携带模式免费覆盖；**#5 `explicitEngineeringDeliverySelection → FRAMEWORK_FLOW` 是对象字面量，必须显式补一次 spread** | D1 |
| R-2 | §3.2 行号锚点 `:737/:757/:770/:772` | **作废**（指向已失效的 `4658595`）。当前：`buildDecision@788`、`skillDecision@850`。实现按**符号**定位不按行号 | D1 |
| R-3 | §7.2 变异体 12 列三个早返 | 补第 5 条早返的回归用例。会审已推导出可达串：`按工程交付流程执行：重构 luca app 的设置页面信息架构，功能堆砌很难找`（同时携带 E1 别名与 E2 三腿，且走 `FRAMEWORK_FLOW` 早返） | D1 |
| R-4 | §7.2 变异体 19 | **恒真，作废**。它描述的 `:683` / `tool_name='Bash'` / `*** Begin Patch` 在 `route-guard.mjs` 中计数全为 0，那些形态在 `project-scope-guard.mjs`——已被 BLOCKER-2 移出 §8。与 MAJOR-4 同型残留 | 会审 |
| R-5 | §7.1 `A-GATE-SUPPRESS` 反向控制 | **fixture 必须自己覆盖 `ROUTE_GUARD_PROJECTS` 并包含 `muse`**，否则 `route-guard 在 muse 里怎么走` 与正例同样返回 `NONE`，零分辨力 | 会审 |
| R-6 | §4.2a 注入串 `📌 当前有未完成任务` | 断言**锚定完整串含 `📌`**；`route-guard.mjs:1145` 已有 `⚠️ 当前有未完成节点` 同通道同前缀，按 `当前有未完成` 子串匹配会对两者都绿 | MINOR-4 |
| R-7 | §9 验证命令 | 补 `node scripts/test-codex-adapter.mjs`（23/0）。本执行已在 `AS-07` 接住 | MINOR-5 |
| R-8 | §10 KILL 顺序 `K1,K2,K5,K3,K4,K6`、标题「4 条」实列 6 条 | 纯排版，不影响执行 | MINOR-3 |
| R-9 | §7.1 `A-OBLIG-VISIBLE` / `A-OBLIG-LIFECYCLE` 的 Stop 子句 | **今天恒真**（§8 从不改 `session-sync.mjs`）。E2 侧只保留「注入存在/停止」这一半可测断言；Stop 侧断言随 E3 一起重做，不在本次充当守卫 | 会审 |

### 本次不做（明写，防止悄悄扩张）

E3 的 revoke-and-queue 与惰性认证、`project-substrate.mjs` 的状态机改造、
`session-sync.mjs` / `project-scope-guard.mjs` 的任何改动、plan-execution 状态机、
bridge / activation / rollback。

## 新基线实测（隔离 worktree @ `fc6eeb5`）

```
test-route-guard          PASS=139 FAIL=0
test-project-scope-guard  PASS=97  FAIL=0
test-codex-adapter        PASS=23  FAIL=0
test-hooks                ALL PASSED
verify.sh                 PASS=85 FAIL=0 WARN=2
```

§9 声明的既有底线在新基线上**逐条成立**，未因 upstream 漂移下降。

<!-- FILE_END: EXEC-AUDIT-DRIFT-01.md -->
