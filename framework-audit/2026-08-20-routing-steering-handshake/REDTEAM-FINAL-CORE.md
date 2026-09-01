# REDTEAM-FINAL-CORE — `EXECUTION-PLAN-CORE.md` 实施前终审

> 性质：**只读**独立红队终审。本 session 未修改计划、未修改任何既有报告/收据、未改任何
> runtime/hook/test/config、未跑任何 git 写命令。所有临时脚本落在 scratchpad。
> 立场：只报**会让实施翻车**的缺陷。文档措辞/排版/记账问题一律不用于卡实施。

---

## 三次自核

| 时点 | `shasum -a 256 EXECUTION-PLAN-CORE.md` | `wc -l` | `git rev-parse HEAD` |
|---|---|---|---|
| 开审前 | `ffc7347329bede165836b53ba48fd1f2d4919ea94494542aa9f78de09da60bb6` | 408 | `4658595ac20ce544cb406657c70ba3259eb1f842` |
| 写报告前 | `ffc7347329bede165836b53ba48fd1f2d4919ea94494542aa9f78de09da60bb6` | 408 | `4658595ac20ce544cb406657c70ba3259eb1f842` |
| 写完后 | 见文末「收尾自核」 | | |

三次一致，**无 STALE**，**未触发 K2 豁免**（HEAD 全程未移动，无需举证纯 audit 提交，
故也无需跑该豁免的阳性对照）。

---

## 裁决

**NO_GO** — **4 BLOCKER / 3 MAJOR / 4 MINOR**

四条 BLOCKER 全部是「按此计划实施会产出错误或不安全的结果」，且**全部落在会审 12 项改动的
落实缺口上**，不是新开的架构争论：三条是「改了 A 处忘了 B 处」的残留，一条是计划自称可实现
但**算术上不成立**。架构方向（判定挪到拿得到证据的那一层）经我实测**成立**，E3 的真实 rollout
佐证也**已被我核到**（会审列为最大单点未知，现已解决，但解出了一个新的版本依赖风险）。
补完下述 4 条即可重新握手；不需要回架构评审。

---

## BLOCKER

### B1 — §7.1 `A-SIGNAL` 仍在编码已被 §4.1 删除的「同从句」约束，并使变异体 11 失效

**小节**：§7.1（断言表）vs §4.1 / §4.3 / §7.2-11

**缺陷**：会审 R-A 裁决取 (A)「删掉同从句约束」，§4.1（行 122–134）已照办并写明理由。
但 §7.1 的 `A-SIGNAL` 行（行 288）**原文未改**：

> 三腿同从句才产信号；每种 2/3、同段兼任、**跨从句均为反例**

这与 §4.1「三腿在整个 prompt 内命中即可」正面冲突。§11 第 2 步是「**每步先加断言、后改实现**」
——断言表就是实现合同，且先写。

**失败场景**：实现者按 §11 先落 `A-SIGNAL` → 测试把「跨从句」钉为**反例** → §4.3 强制新增的
E2 直接回归串 `帮我优化下设置页面，功能堆砌太严重了很难找`（变更腿「优化」+ 界面腿「设置/页面」
在第一从句，结构腿「功能堆砌/很难找」在第二从句）被断言为**不产信号** → E2 带着全绿测试套件
原样出厂。同时变异体 11（「恢复同从句约束 → 该回归用例转红」）退化成 no-op：它要「恢复」的
东西已经是基线，转不了红——**专门为防这件事设的守卫，恰好被这件事本身解除了武装**。

这正是任务点名的前科同类残留（§4.1 那句「该从句」残句作者已自行修掉，断言表这处没修）。

**建议改法**：`A-SIGNAL` 改写为——「三腿在整条 prompt 内命中即产信号；反例**只有**每种 2/3 腿
与同段兼任；**跨从句是正例**，且必须含 §4.3 的 E2 回归串 `帮我优化下设置页面，功能堆砌太严重了很难找`；
`negation_context` 记录整条 prompt 原始字节」。

---

### B2 — §3.2 的携带模式只点了两个早返；`buildDecision` 有**第三个**，PLAN_MODE 下信号静默丢失

**小节**：§3.2（求值顺序）/ §7.2-12 / §7.1

**缺陷**：§3.2 写「`mixed_ambiguous` 早返（`:737`）与 `gate` 短路（`:757`）都排在
`skillDecision`（`:772`）之前 …… 并**穿过那两个 return** 一起带出」。

实测 `buildDecision`（`route-guard.mjs:732–786`）共有**五个** return，早于 `skillDecision` 的是**三个**：

```
:738  mixed_ambiguous 早返        （§3.2 已点）
:758  gate 短路                   （§3.2 已点）
:770  if (!directCall && complexity.decision === 'PLAN_MODE') return complexity;   ← §3.2 未点
:777  PLAN_CHECK（spread skillResult）
:785  最终 return（spread skillResult）
```

`:770` 返回的是**裸 `complexity` 对象**，没有任何 spread —— 在 `:751` 求值的
`semanticRouteAxis` / `alias_resolution` 挂不上去。

**实跑证据**（本 session，dry-run）：

```
prompt = 重构设置页面的信息架构，新增权限、通知、导出三个分组，层级太深很难找
        （变更腿=重构 / 界面腿=设置·页面 / 结构腿=信息架构·层级·很难找，三腿俱全）
cur='muse' → {"decision":"PLAN_MODE","complexityScore":6,"signals":["多功能需求"]}   ← 走 :770
cur=''     → PROJECT_STOP                                                          ← 走 :758
```

**失败场景**：用户提一个**复杂的**界面结构改造需求 → 命中「多功能需求」(w6) → PLAN_MODE →
从 `:770` 裸返 → 信号与别名候选双双丢失 → 义务不建立 → 任务丢失。这就是 E2 的原始症状，
而且发生在**最该被接住的那一类请求**上（多阶段 Plan Agent 长任务正是「一旦跑偏就丢」的重灾区）。

守卫全线缺席：变异体 12 只写「`PROJECT_STOP`/`NEEDS_CONTEXT` 早返」，不覆盖 PLAN_MODE；
§7.1 只在 `A-GATE-SUPPRESS` 里测了 `STOP` 一种 decision；会审 Q5 建议的「九种 decision 输出通道
断言」（其建议 #4）**未被采纳**。→ 无断言、无变异体、无测试。

**建议改法**：二选一——(a) §3.2 逐一列全五个 return 并要求每个都携带；或（更稳，即会审原建议）
(b) 改为在 `route-guard.mjs:1074` 那层、`hints.push(...decisionToHints(decision))` **之后**、
与 decision 类型**无关**地注入。无论取哪个，都必须补「九种 decision 下信号均出现」的断言，
并把变异体 12 扩到 PLAN_MODE。

---

### B3 — §4.2a 的「复合 reason ≤900」在当前 runtime 上**算术不成立**

**小节**：§4.2a 第 2、3 条 / §9

**缺陷**：§4.2a 称「现有模板已接近上限」并要求义务段与自成长段合并为**单个**复合 reason
（「义务在前、自成长在后」），同时不得超 `scripts/test-hooks.mjs:290` 的 ≤900 硬断言。

**实测**（直接跑 `session-sync.mjs`，以及提取 `buildReason` 求值，非估算）：

| 形态 | reason 长度 | 距 900 余量 |
|---|---|---|
| 实跑 · 无绑定项目 | **604** | 296 |
| 非 rearm · project=`muse` · 36 位 sid | **737** | 163 |
| 非 rearm · project=20 字名 | **785** | 115 |
| rearm · project=20 字名 | 770 | 130 |

> 附带更正：会审 Q2(c) 的「余量只剩 37 字符」**是错的**（它把 `buildReason` 里两个三元
> 分支的字面量**都**计了进去）。真实余量比会审以为的宽——但仍然不够。

按 §4.2a 第 2 条自己规定的三要素（有未完成任务 + 状态文件路径 + 一行摘要）写一段**最省**的
义务段（12 位 sha 前缀 + `.claude/.session-obligation-<36位 sid>` + 一行摘要，**不含**解锁条件）：

```
最小义务段 = 168 字符
复合后：737 + 1 + 168 = 906   → 超 900（project=muse，最常见形态）
        785 + 1 + 168 = 954   → 超 900（20 字项目名）
        625 + 1 + 168 = 794   → 仅「无激活项目」时才过
```

**失败场景**：第一个「已绑定项目 + 有 PENDING 义务」的 session → 复合 reason 906 字符 →
`HOOK-007` 断言转红 → §9「任何既有用例转红即停」在第 4 步（最小义务）当场把实施停掉。
或者实现者顺手把 900 上调——那既违反 §4.2a 第 2 条，又回归了短指针契约。

根因是落实缺口：会审的可实现方案有**两半**（义务段 ≤300 **且**「有义务时提取段压成一行指针」），
§4.2a 只落了前半，把「压缩提取段」那半丢了，于是预算对不上。

**建议改法**：§4.2a 第 3 条补一句硬约束——「**有义务时，自成长段压成一行指针**（完整四信号
速记降级到 `extraction-bar.md` 指针）」；或在 §8 显式声明新上限数字并说明依据。二者必居其一，
不得留给实现阶段临场决定。

---

### B4 — 义务挡 Stop 既无防循环不变量，也没有任何测试文件认领

**小节**：§4.2 / §4.2a / §7.1 `A-OBLIG` / §8

两个半缺陷，合并为一条，因为它们导致同一个结果：E2 的核心修复**要么把 session 卡死，要么形同虚设，且测不出来**。

**(a) 防循环缺失。** `session-sync.mjs:9` 的安全契约明写「三重防循环」，`:190` 用
`!stopHookActive` 守住自成长那条。§4.2 的五个状态里**没有任何一个能表示「已因该义务挡过一次」**：

- 义务分支**不**检查 `stopHookActive` → 模型被挡、只输出文字、再 Stop、又被挡……**回合无法结束**（session 卡死，不安全结果）；
- 义务分支**检查** `stopHookActive` → 只挡得住第一次，此后恒放行 → 任务照样丢，E2 未修。

计划两种都没规定。会审给的 `blocked_at_turn` 不变量（其建议 #3 / Q2 第 3 点）**被丢掉**，
只在 §5.3 缺口 2 里留下一句**条件式、且只针对 Codex** 的兜底（「若 Codex 无此标记……」）——
**Claude 侧这个洞无人认领**。

**(b) 没有测试文件认领「`PENDING` 起挡 Stop」。** §7.1 的 `A-OBLIG` 仍是**一整行**；
§8 把它挂在 `scripts/test-project-scope-guard.mjs`（注「A-OBLIG（scope 侧）」），
而那是 PreToolUse 夹具，**物理上收不到 Stop 事件**；`scripts/test-hooks.mjs` 在 §8 里
只负责「900 字符闸随复合 reason 更新」。于是 E2 修复的**核心断言无家可归 → 永不运行 → 恒绿**。
会审要求把 `A-OBLIG` 拆成 `-STOP`/`-SCOPE` 两条并各指定测试文件（其建议 #7 / Q1.4），未落实。

**失败场景**：实现完成、三套测试全绿、变异体报告漂亮；luca 第一次在真实 session 里被义务挡住
后无法结束回合（或挡一次之后任务照丢）。两种都不会被任何自动化捕获。

**建议改法**：①§4.2 补 `blocked_at_turn`（或等价的一次性标记）作为**承重不变量**，写明它
**不依赖** `stop_hook_active`；②§7.1 拆 `A-OBLIG-STOP`（落 `test-hooks.mjs`）/ `A-OBLIG-SCOPE`
（落 `test-project-scope-guard.mjs`），并加 `A-OBLIG-NOLOOP`，其夹具**必须不含** `stop_hook_active`
字段，否则该断言在 CC 夹具下恒绿。

---

## MAJOR

### M1 — 变异体 13、14 没有咬合控制；两条会审要求的变异体被静默丢弃

**小节**：§7.2 / §7.1 / §8

计划自述「变异体扩到 14 条」，但：

- **变异体 13**（义务检查挪到 `passThrough()` 之后 → 「Codex apply_patch 与框架豁免路径下……
  对应 scope 用例转红」）要转红，前提是存在一条 **apply_patch 形状 + 义务生效**的 scope 用例。
  §7.1 的 `A-OBLIG` **没有规定这条用例**。会审原话：「缺这条，杀手 1 测不出来」（其建议 #7）。
  → 变异体 13 目前是纸面变异体。
- **变异体 14**（reason 复述全文 → 900 断言转红）要转红，前提是 `HOOK-007` 的夹具里**有一条
  生效的义务**（否则 reason 里根本没有义务段，改它什么也不会变）。§8 只写「900 字符闸随复合
  reason 更新」，**没有**要求新增带义务的夹具。→ 变异体 14 同样不咬。
- 会审要求新增的两条变异体**都没进来**：「让义务状态成为任何路径类 deny 的豁免条件」与
  「让义务读取的异常冒泡到 `:770`」（其建议 #8）。后者是安全相关的那条：§8 把义务读取
  自带 try/catch 定为「硬约束（违反即静默失效）」，却**没有任何变异体守它**。
  实测 `project-scope-guard.mjs:770–773` 确为通吃型 `catch → passThrough()`，
  一个损坏的义务文件会让路径隔离与 `framework/` 保护**同时**消失。

**失败场景**：交付报告写「14 条变异体逐条确认变红」，其中 2 条是靠别的原因变红或根本没测到；
try/catch 硬约束漏写时无人发现，直到某天义务文件损坏顺带放行了对 `framework/` 的写入。

**建议改法**：§7.1 给 `A-OBLIG-SCOPE` 明确加一条 Codex `apply_patch` 形状用例
（`tool_name='Bash'` + `tool_input.command` 为 `*** Begin Patch …`）；§8 明确要求
`test-hooks.mjs` 新增「带 PENDING 义务」的夹具；补回会审那两条变异体。

### M2 — §5.2 只对**当前** Codex rollout schema 成立，而计划没钉任何 Codex 版本；旧 schema 下 100% fail closed

**小节**：§5.2 / §5.3 KILL / §10

这是会审自陈的「最大单点未知」。我核了真实 rollout 文件，**先说好消息**：

- §1 引用的证据**属实**。`~/.codex/sessions/2026/08/20/rollout-2026-08-20T17-41-22-01a01e8b-ee89-70f3-baf1-a1b79deb8a8d.jsonl`
  第 60、63 行确为两条 `response_item/message/role=user`，id 分别是
  `msg_01a01e8d-4cfe-7430-…` 与 `msg_01a01e8d-4d7a-7b73-…`，同挂 `turn_id 01a01e8c-c476-…`。
  E3 的根因诊断对真实文件成立。
- §5.2 的「相邻对」规则在当前 schema 下**站得住**：当前 schema 文件里 502 条真人 user 记录，
  **0 条**缺相邻 `item_completed/UserMessage`（仅有的 2 条例外是
  `<codex_internal_context source="goal">` 合成记录，非真人输入）。文本投影也逐字相等。
- `msg_*` **确实唯一**：486 个 8 月 rollout 中 **0 个**存在重复 `msg_*`。
  （我一度从截断后的 dump 里怀疑 id 重复，跑了对照后被推翻，该发现已丢弃——写在这里是为了
  说明「恰好支持我想要结论的阴性/阳性结果」都过了对照。）

**缺陷在版本依赖**：这套 schema 是**新的**。按月统计「user 记录缺 `item_completed/UserMessage`
锚点」的比例：

```
2026-04  100.0%      2026-07  100.0%
2026-05  100.0%      2026-08   76.8%
2026-06  100.0%
```

旧 schema（`session_meta.cli_version = 0.146.1`）后继记录是 `event_msg/user_message`，且
`item_completed/UserMessage` **在整个文件里根本不存在**（「别处存在」计数在每个月都是 0）。
486 个 8 月 rollout 里只有 **38 个**是当前 schema（`cli_version = 0.148.0`，08-24 起稳定）。

**失败场景**：luca（或某个 subagent thread、或一次 Codex 降级/回滚）跑在 ≤0.146.x 上 →
§5.2 一条也绑不上 → §5.1 fail closed，而 `prompt_gate.phase = ATTESTATION_PENDING`
已经把「之前所有写入授权立即失效」执行掉且**永不恢复** → 该 sid 的**每一条**用户消息都无法认证，
session 对路由/项目动作整体报废。这**比 E3 本身更糟**：E3 只拒同一 turn 的第二条起。
而 §5.3 的 KILL 只在 L0 探针**恰好跑在旧版**时才会触发——K2 钉死了框架 HEAD，却**没钉
Codex 二进制版本**，所以今天跑探针必过，隐患照样出厂。

**建议改法**：§5.2 增加 schema 纪元判定（`session_meta.cli_version`，或「文件内是否出现过
`item_completed/UserMessage`」）与**明确的安全降级**——未识别 schema 时**降级回今天的行为**，
绝不把 `ATTESTATION_PENDING` 长期锁住；或补 `event_msg/user_message` 作为备用锚点。
§5.3 的 KILL 要写明它是**版本域内**的结论，并把最低版本号钉进计划。

### M3 — §8 漏掉 `.gitignore`；义务状态文件将每 session 污染工作树，且内含原始 prompt 字节

**小节**：§8 / §4.2 / §10 K5

会审建议 #1 要求 §8 补**三**项（`session-sync.mjs`、`test-hooks.mjs`、`.gitignore`）。
前两项已补，**`.gitignore` 没补**，且它在 §8 的「动」与「不动」两个清单里**都不出现**。

**实测**：`.gitignore:90–104` 对每个 `.session-*` 前缀**逐条**列举，无通配。

```
$ git check-ignore -v .claude/.session-obligation-abc123   → 无输出（未被忽略）
$ git check-ignore -v .claude/.session-project-abc123      → .gitignore:97 命中
```

**失败场景**：每个产生义务的 session 都留下一个未跟踪的 `.claude/.session-obligation-<sid>`，
其中按 §4.2 存着 `exact_task_text` = **完整原始 prompt 字节（上限 262,144 B）**。
`git status` 永久变脏；一次 `git add -A` 就把用户 prompt 原文提交进仓库。
§10 K5 只豁免了 `memory/**` 与 `.claude/observability/**` 的运行时追加，**不覆盖**这个新文件。

**不判 BLOCKER 的理由**：我核过 `scripts/verify.sh`，其中**没有**工作树洁净门，
所以不会自动卡住 §9 的验证。

**建议改法**：§8 的「动」清单加 `.gitignore`（新增 `.claude/.session-obligation-*`），
并在 §10 K5 一并说明。

---

## MINOR

| # | 小节 | 缺陷 |
|---|---|---|
| m1 | §4.1 | 会审建议 #5 要求补「不改 `routingScope.kind` / 不改 `scope: framework_meta` 路由过滤 / 不改 `FRAMEWORK_FLOW` 判定」三句，未落实；行 136 仍只有原来三句。别名轴有变异体 1 兜底，信号轴无。 |
| m2 | §3.2 | 会审建议 #1 的实现侧约束（`classifyRoutingScope`/`projectGate`/`skillDecision` 的输入**均不得包含** `alias_resolution`）只活在变异体 1 里，没进实现指令。 |
| m3 | §5.3 | 已指出 `session-sync.mjs` 注释是陈迹，但**没写「实现时顺手改正该注释」**（会审建议 #9）。实测该陈旧注释仍在 `:192–193`，留着会诱导下一个人重新把 Codex 降级成 advisory。 |
| m4 | §4.3 | 段首仍写 7 条 fixture「每条都产出信号」，三行后的「已定案」段又说仍缺腿的要移出。就地自我更正，实现者按顺序读会先写错一版断言。 |

---

## 我核过、结论是「计划正确」的部分（不作为缺陷）

- **§6.1 `REQ-SCOPE-NULL-FIRST` 是真缺陷**，我独立复现了四组最小对（非引用会审）：
  ```
  new project: 涉及项目的route-guard    → NEEDS_CONTEXT / clarify_framework_or_project_scope
  new project: 不涉及项目的route-guard  → PROJECT_SWITCH / create_new_project / project='不涉及项目的route-guard'
  new project: 属于项目的route-guard    → NEEDS_CONTEXT
  new project: 不属于项目的route-guard  → PROJECT_SWITCH / create_new_project
  ```
  §6.1 的描述、`A-SCOPE-NULL`「基线为红」的定性、以及「不得扩充该否定词表」的两个推论都准确。
- **§3.2 引用的行号全部属实**：`:737` mixed_ambiguous / `:751` complexity / `:757` gate / `:772` skillDecision。
- **§4.2 关于 `check-project-links.mjs:59` 的警告属实**：正则确为 `/^\.session-project-[\w-]{1,36}$/`。
- **§8 两条接线硬约束的依据属实**：`project-scope-guard.mjs` 的 `passThrough()` 确在
  `:683 / :701 / :741 / :754 / :757 / :772`，全局 fail-open 外壳确在 `:770–773`；
  §3.2 引用的 `:706` SWITCH_ONLY 拒绝分支也确实存在。
- **§9 的基线数字属实**：`test-route-guard.mjs` = PASS 132 / FAIL 0。
- **§5.1 的 Codex 载荷前提可行**：`.codex/codex-hook-adapter.mjs:227` 以
  `input: JSON.stringify(data)` 原样透传 payload，`turn_id` 能到达 hook。
- **§5.3「已更正的前提」属实**（会审已验，我未重复跑 harness 探针）。

---

## 范围：该砍的 / 必须做但没写的

- **该继续砍的：没有。** 剩余每一节都能追到 E1/E2/E3 之一。§6 虽非三故障之一，但
  `REQ-SCOPE-NULL-FIRST` 是 E1 别名工作会途经的同一条 `projectGate` 臂序，留着正确。
- **必须做但没写的**（除上述 B1–B4、M1–M3 外）：
  1. **义务状态文件的并发写协议**。三个独立进程（route-guard 写 / project-scope-guard 读 /
     session-sync 读）共享它，会审建议 #2 要求复用 `project-substrate.mjs` 的
     `atomicProjectStateCas` / 临时文件 + `renameSync`，**§4.2 没有落这一条**，只写了文件名约束。
     裸 `writeFileSync` 在并行 session 下会产生半截 JSON —— 再叠加 B4(a) 的 fail-open 读取，
     结果是「义务静默消失」，即 E2 复发且无痕。
  2. **Codex 侧 `stop_hook_active` 的实测**。§5.3 缺口 2 正确指出全仓无证据，但把它放在
     KILL 条件里当「已知缺口」而非**实施前必须先做的探针**。B4(a) 的防循环设计取决于这个
     事实，应在动 runtime 前先测。

---

## 读了什么 / 没读到什么

**通读**：`EXECUTION-PLAN-CORE.md` 全部 408 行（§1–§11 + 附）；
`EXPERT-REVIEW-CORE-01.md` 全部 504 行（Q1–Q5、R-A/R-B/R-C、总评、自身局限）。

**读了但只作背景**：`route-guard.mjs`（`buildDecision` 全函数、`complexityDecision`、
返回点枚举）、`session-sync.mjs`（`buildReason` + 主决策 + 防循环）、
`project-scope-guard.mjs`（passThrough 站点 + fail-open 外壳 + `:706`）、
`test-hooks.mjs`（HOOK-007 + 夹具助手）、`check-project-links.mjs:55–62`、
`.gitignore:90–104`、`.codex/hooks.json`、`.codex/codex-hook-adapter.mjs`（透传路径）。

**没读到**：

- `FINAL-EXECUTION-PLAN.md`（5890 行原稿）—— 按预算未读。本审**未**核对 CORE 的「附：与原稿
  的关系」是否忠实承接了它声称的五条结论。
- **§3.1 的别名 manifest 限额/规范化/拒绝规则整节未验证**——目前无实现可测，且我未构造
  manifest 试跑。`O_NOFOLLOW` / dev-ino-size 复核 / NFKC 折叠这些点是**纸面审查**。
- **未实跑 Codex**（本 session 是 Claude 档）。Codex 是否注入 `stop_hook_active` 仍**无证据**，
  与会审的局限相同；M2 的结论基于**磁盘上的真实 rollout 文件**，不是 Codex 进程实测。
- 未跑变异测试（不得改 runtime）。M1 对「变异体不咬」的判断是**咬合面推理 + 夹具核对**，
  不是变异实证。

---

## 实跑命令与输出摘要

```bash
# 自核（三次，输出见文首/文末）
shasum -a 256 EXECUTION-PLAN-CORE.md ; wc -l < EXECUTION-PLAN-CORE.md
git -C /Users/luca/Desktop/项目/muse/lucagstack rev-parse HEAD

# 仓库自带测试（只写临时目录）
node scripts/test-route-guard.mjs         → PASS=132 FAIL=0
node scripts/test-project-scope-guard.mjs → PASS=96  FAIL=0
node scripts/test-hooks.mjs               → ALL HOOK/MEMORY REGRESSION TESTS PASSED

# route-guard dry-run 探针（B2 / §6.1）
ROUTE_GUARD_DRY_RUN=1 ROUTE_GUARD_PROJECTS="muse,crm,luca-dev" ROUTE_GUARD_CURRENT_PROJECT=... \
  node .claude/hooks/route-guard.mjs
  · 帮我优化下设置页面，功能堆砌太严重了很难找        cur=muse → STOP / no_keyword_match / score 0
  · 重构设置页面的信息架构，新增权限、通知、导出三个分组，层级太深很难找
                                                      cur=muse → PLAN_MODE / score 6   ← 走 :770 裸返
                                                      cur=''   → PROJECT_STOP          ← 走 :758
  · new project: {涉及|不涉及|属于|不属于}项目的route-guard → 否定臂翻转成 create_new_project（§6.1 复现）

# reason 长度实测（B3）——直接跑 hook + 提取 buildReason 求值
node scratchpad/measure-reason.mjs → 实跑 block reason = 604 字符
node scratchpad/max-reason.mjs     → 无项目 625 / project=muse 737 / 20 字项目名 785 / rearm 770
node scratchpad/oblig-seg.mjs      → 最小义务段 168；复合 906(muse) / 954(20字) → 超 900

# Codex rollout 取证（M2）——只读 ~/.codex/sessions
grep -rl "01a01e8c-c476" ~/.codex/sessions   → 命中 2026/08/20 三个文件，含 §1 引用的那个
scratchpad/scan-adjacency.py 150   → 1242 条 user 记录，相邻锚点缺失 58.7%
scratchpad/scan-by-date.py         → 按月：04/05/06/07 均 100% 不符；08 为 76.8%
scratchpad/scan-aug-detail.py      → 08-24 起 only_user_message 归零；「锚点在别处」全月为 0
scratchpad/final-e3.py             → msg_* 重复：0/486 文件；当前 schema 真人记录 502 条，缺锚点 0 条
                                     （唯二例外为 <codex_internal_context> 合成记录）
head -1 <rollout> | ...            → cli_version 0.148.0（新）vs 0.146.1（旧），纪元可判定

# .gitignore 覆盖（M3）
git check-ignore -v .claude/.session-obligation-abc123 → 无输出（未忽略）
git check-ignore -v .claude/.session-project-abc123    → .gitignore:97 命中
grep -n "porcelain|status --|untracked|dirty" scripts/verify.sh → 无匹配（无洁净门）
```

---

## 收尾自核

```
$ shasum -a 256 EXECUTION-PLAN-CORE.md
ffc7347329bede165836b53ba48fd1f2d4919ea94494542aa9f78de09da60bb6  EXECUTION-PLAN-CORE.md
$ wc -l < EXECUTION-PLAN-CORE.md
408
$ git -C /Users/luca/Desktop/项目/muse/lucagstack rev-parse HEAD
4658595ac20ce544cb406657c70ba3259eb1f842
```

与开审前、写报告前**三次一致** → 本裁决对 SHA
`ffc7347329bede165836b53ba48fd1f2d4919ea94494542aa9f78de09da60bb6` 有效。
K2 全程未触发，无豁免举证需求。

**裁决：NO_GO — 4 BLOCKER / 3 MAJOR / 4 MINOR。**

<!-- FILE_END: REDTEAM-FINAL-CORE.md -->
