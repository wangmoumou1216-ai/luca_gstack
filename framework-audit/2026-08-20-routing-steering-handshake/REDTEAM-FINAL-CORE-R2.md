# REDTEAM-FINAL-CORE-R2 — 修复复核（对 R1 的 4 BLOCKER / 3 MAJOR / 4 MINOR）

> 性质：**只读**复核。本 session 未修改计划、未修改任何既有报告、未改任何 runtime/hook/test/config、
> 未跑任何 git 写命令。所有临时脚本落在 scratchpad。
> 范围：**聚焦复核 R1 提出的缺陷是否闭合**，不重新全审。立场不变：只报会让实施翻车的缺陷；
> 措辞/排版/记账问题最多 MINOR，不用于卡实施。

---

## 三次自核

| 时点 | `shasum -a 256 EXECUTION-PLAN-CORE.md` | `wc -l` | `git rev-parse HEAD` |
|---|---|---|---|
| 开审前 | `24c81ec52a15b79ce8a5b8f3ea28c0464aecf4ba9790e072b29321d34bedd444` | 450 | `4658595ac20ce544cb406657c70ba3259eb1f842` |
| 写报告前 | `24c81ec52a15b79ce8a5b8f3ea28c0464aecf4ba9790e072b29321d34bedd444` | 450 | `4658595ac20ce544cb406657c70ba3259eb1f842` |
| 写完后 | 见文末「收尾自核」 | | |

三次一致，与任务书给定的 SHA / 行数 / HEAD 全部相符 → **无 STALE**。
K2 全程未触发（HEAD 未移动），**无需**纯 audit 提交豁免，故也无该豁免的阳性对照义务。

---

## 裁决

**NO_GO** — **1 BLOCKER / 3 MAJOR / 7 MINOR**

**R1 的四条 BLOCKER 全部闭合，M2 的核心也闭合。** 架构不需要重开，四条修复我逐条实测确认有效，
其中 B2、B3 的关键数字我用自己的实测复核过（不是复读作者的数字）。

**唯一的 NO_GO 理由是 M2 修复自身引入的新缺陷**：K6 把判据写成了 **Codex 版本闸**
（§5.3 "只存在于 cli_version 0.148.0 及以后"、变异体 16 "版本闸……放宽到 0.148.0 以下"），
而我在 640 个真实 rollout 上实测：**版本根本不是判据**——0.148.0 有 6/11 个文件无锚点、
0.150.1 有 12/19 个无锚点。按版本闸实施，这 25 个文件会被判成"新 schema"→ 撤销写授权 →
逐条 fail closed → **正是 K6 想防的卡死态，且发生在 luca 今天在跑的版本上**。

好消息：正确判据我已经测出来了，**改一行即可**——判据换成"文件内是否出现过
`event_msg/item_completed` 且 `item.type=UserMessage`"。该判据在 640 个 rollout 上**零反例**
（无任何文件混合两种记录）。这不是架构问题，补完即可重新握手。

**同时必须纠正我自己 R1 的错误建议**：R1 建议用 `session_meta.cli_version` 做纪元判定——
**那条建议是错的**，作者若照办正好落进本 BLOCKER。详见下文 M2。

---

## BLOCKER

### NB1 — K6 的判据被写成"版本闸"，而版本不是判据；照此实施会在当前 Codex 上卡死 session

**小节**：§5.3 `K6` / §7.2 变异体 16 / §10 `K6`

**K6 做对的部分（先说清，避免误伤）**：
- 旁路**不依赖**那个失败的东西——它是"不进入 `ATTESTATION_PENDING`、保持改造前旧行为"，
  而不是"再解析一次锚点"。计划还明确写了「**不得**用『兜底再解析一次锚点』——那是拿坏掉的
  那个东西去兜它自己」。**任务点名要查的这一条，是干净的。**
- 失败方向写死了（"不得 fail closed"、"把 session 卡死不是可接受结果"），§10 有对应 KILL。
- **§5.2 的相邻对规则本身正确**：我实测 489 条有锚点的真人 prompt，**489 条的锚点距离恰好为 1**，
  没有一条是"锚点存在但不相邻"。计划的"紧跟"措辞与真实文件一致。

**缺陷在判据的形态**。计划有两处把 K6 定义成版本闸：

- §5.3：「§5.2 的相邻对锚点**只存在于 `cli_version 0.148.0` 及以后的 rollout**」
- §7.2 变异体 16：「把 Codex **版本闸**（K6）去掉或**放宽到 0.148.0 以下**」

变异体是可执行合同：要让变异体 16 有意义，实现里就**必须存在一个 0.148.0 的版本阈值**。

**实测反驳**（`~/.codex/sessions`，640 个 rollout；只统计真人 typed prompt，
已剔除三类注入记录：XML 标签注入、`# AGENTS.md instructions`、`# Files mentioned by the user`）：

```
cli_version        全部有锚点(文件数)   全部无锚点(文件数)   混合
0.146.0                    0                 86            0
0.146.1                    0                139            0
0.147.0                    2                  4            0      ← 锚点在 0.148 之前就已出现
0.148.0                    5                  6            0
0.149.0                    2                  2            0
0.149.1                   18                  5            0
0.150.1                    7                 12            0
0.151.0                    1                  0            0
```

两个结论：

1. **"只存在于 0.148.0 及以后"是错的**——0.147.0 已有 2 个全锚点文件。
2. **版本与锚点无关**：0.147.0 / 0.148.0 / 0.149.0 / 0.149.1 / 0.150.1 **每一个版本都同时出现在两侧**。
   按"≥0.148.0 即新 schema"放行，会误判 **25 个文件**（0.148.0 六个、0.149.0 两个、0.149.1 五个、
   0.150.1 十二个）。

**失败场景**：luca 在 0.150.1 上开一个 codex-tui session（该版本 19 个文件里 **12 个无锚点**）→
版本闸判定"新 schema" → §5.1 置 `ATTESTATION_PENDING`、**撤销全部写授权** → §5.2 找不到锚点 →
每条消息 fail closed → **session 整体报废**。这正是 M2 指出、K6 声称要修的那个态，
只是触发条件从"老版 Codex"变成了"当前版 Codex 的一半 session"。

**为什么这不是措辞问题**：K6 正文写的是「无锚点的老 schema」，"无锚点"三个字确实在；
但变异体 16 与 §5.3 的事实句都锚在版本上，实现者要满足变异体 16 就得建版本闸。
两处指令互相冲突，而冲突的那一支是不安全的那支。

**建议改法（一行）**：
- K6 判据明确写死为**内容判据**：「探测 = 该 rollout 文件内是否出现过 `event_msg/item_completed`
  且 `item.type=UserMessage`；**判据不得使用 `cli_version`**」。我的数据支持这条：640 个 rollout
  **零混合文件**，per-file 二分干净。
- 删掉 §5.3「只存在于 0.148.0 及以后」这句（事实错误），改为「锚点最早见于 0.147.0，
  但与版本不相关，须按文件内容判定」。
- 变异体 16 改写为真正咬得住的那条：「**把 K6 判据从锚点存在性换成 `cli_version` 阈值** →
  『0.148+ 但无锚点』的回归用例转红」。这条变异体恰好守住本 BLOCKER。
- 补一条回归夹具：`cli_version=0.150.1` 且**无锚点**的 rollout → 必须走旁路、写授权不被撤销。

**残留（一并处理，不单列）**：§5.1 允许 Codex 源为 `kind:UNPUBLISHED`（文件尚未落盘），
而 K6 要求"**在入队前**探测"。文件不存在时无法探测，计划未规定该格。按 K6 自己的方向原则
（"卡死不是可接受结果"）应显式写成"探测不确定 → 按无锚点处理、走旁路"。

---

## 逐条复核（R1 的 4 BLOCKER）

### B1 — `A-SIGNAL` 的"同从句"残留 → ✅ **已闭合**

- §7.1 `A-SIGNAL`（行 323）已改写为「三腿在**整条 prompt 内**命中即可产信号……
  **跨从句是正例不是反例**」，并把 E2 复现串 `帮我优化下设置页面，功能堆砌太严重了很难找`
  写成**直接回归断言**（"必须产信号"），反例收窄为「缺腿（2/3）与同段兼任两腿」。
- **与 §4.1 一致**：§4.1（行 131–143）「三腿不要求同从句」「三腿在整个 prompt 内命中即可」，
  `negation_context` 记录整条 prompt 原始字节。两处口径逐字对得上。
- **变异体 11 现在真的会咬**：基线已是"无同从句约束"→ E2 串产信号；变异体"恢复同从句约束"
  → 我核过该串的腿位（变更腿`优化`+界面腿`设置/页面`在第一从句，结构腿`功能堆砌/很难找`
  在第二从句）→ 恢复约束后必然不产信号 → 断言转红。**不再是 no-op。**

**第三处残留：全文搜过，没有。** `从句` 在全文出现 9 次，逐条核实：
行 73（别名轴"从句结构一律不看"）、131/133/134/136/143（§4.1 推翻叙述与新规则）、
196/200（§4.3 历史说明）、323（新断言）、349（变异体 11）——**没有一处是仍在生效的规范性约束**。
唯一措辞不精确的是变异体 7「把义务的 `exact_task_text` 截断到三腿从句」：删掉同从句约束后
"三腿从句"可能不存在。但该变异体仍咬得住（`A-OBLIG-SCOPE` 要求"保留**完整**原始任务字节"，
截断到任何子串都转红）→ 降为 MINOR 措辞项，不是残留。

### B2 — §3.2 只点两个早返 → ✅ **已闭合**

我**自己读了 `route-guard.mjs:732–786`**（不是引用作者）：

```
:738  mixed_ambiguous 早返      对象字面量，可 spread
:758  gate 短路                 return { ...gate, ... }，可 spread
:770  if (!directCall && complexity.decision === 'PLAN_MODE') return complexity;   ← 裸 return
:777  PLAN_CHECK（spread skillResult）   ← 在 skillDecision 之后
:785  最终 return（spread skillResult）  ← 在 skillDecision 之后
```

`skillDecision` 在 `:772`。**排在它之前的恰好三个**，§3.2 的表格三行（`:737` / `:757` / `:770`）
在**行号与形态描述上都与真实代码相符**，`:770` 确为「裸 return，没有可 spread 的对象」。
计划并已写明「`complexity` 对象必须先被扩展成可携带信号的形状」。

**三条路径我都实跑复现（dry-run，只读）**，证明变异体 12 要求的三条回归用例都构造得出来：

```
重构设置页面的信息架构，新增权限、通知、导出三个分组，层级太深很难找
   cur=muse → {"decision":"PLAN_MODE","complexityScore":6,"signals":["多功能需求"]}
              ← 裸对象：无 projects / hasActiveProject / planHint，确认走 :770
   cur=''   → PROJECT_STOP（gate 短路 :758）
优化 route-guard 的设置页面，功能堆砌层级太深很难找
   cur=muse → NEEDS_CONTEXT / clarify_framework_or_project_scope（mixed_ambiguous :738）
帮我优化下设置页面，功能堆砌太严重了很难找
   cur=muse → STOP / no_keyword_match（落到 :785）
```

**变异体 12 已扩到 PLAN_MODE**，且明写「三条对应回归用例……**必须各自转红**——只覆盖前两个不算数」。

### B3 — ≤900 复合 reason 算术不成立 → ✅ **已闭合**（两半都在）

§4.2a 第 2 条现在**两半齐全**：(a) 义务段绝不复述 `exact_task_text`、只给三要素；
(b)「**有义务时压缩自成长段**……把 604/737/785 压到 ≤600」，并要求「实施前先实测两段拼接后的
真实长度，并把该长度写成断言，不要靠估算」。

**预算数字我自己重测了一遍**（提取 `buildReason` 真实源码求值，非估算、非复读）：

| 形态 | 实测长度 | 距 900 |
|---|---|---|
| 无项目（36 位 sid） | **625** | 275 |
| project=`muse` | **737** | 163 |
| project=20 字名 | **785** | 115 |
| rearm 三态 | 609 / 721 / 769 | — |

**与真实 hook 交叉验证**：直接跑 `session-sync.mjs` 得 `decision=block`、reason = **604**，
其 sid 为 `date-2026-08-30`（15 字符）；`625 − 604 = 21 = 36 − 15`，与 sid 长度差**逐字节吻合**
→ 证明我提取的函数忠实于运行时，也证明 R1 的 604 与计划的 604/737/785 **都是对的**。

**关于任务书提到的"作者静态估算 697 余量"**：我 grep 过计划全文与整个 audit 目录，
**"697" 这个余量数字不存在**（唯一命中都是 SHA/行号里的巧合数字）。
交付稿 §4.2a 写的就是 604/737/785 与"义务段约 168"，与我的实测一致——**没有需要裁决的分歧**。

**我自己算的义务段**（按 §4.2a(a) 三要素：有未完成任务 + 状态文件路径 + ≤40 字摘要）：
21 字摘要 = **143** 字符；摘要用满 40 字 = **162** 字符。据此：

```
只做 (a)：737 + 1 + 162 = 900  ← 恰好贴边，零余量（muse）
          785 + 1 + 162 = 948  ← 仍爆闸（20 字项目名）
做 (a)+(b)：600 + 1 + 162 = 763  ← 137 余量，成立
```

**结论：(b) 确实是必需的，不是保险**——计划自己的判断正确，两半缺一不可，现在都在。

### B4 — 义务 Stop-block 无防循环、`A-OBLIG` 挂错夹具 → ✅ **已闭合**（留一条 MAJOR 验证强度）

**(a) `blocked_at_turn` 语义成立。** §4.2 新增该字段，并写明两个方向：
「同一回合已挡过就不再挡」（防自环）+「**下一个经认证的人类事件**清空它、义务重新可挡」
（防"只挡一次就永远静默"）。我逐一验证这两半**确实同时成立**：

- 自环：同回合第二次 Stop 时 `blocked_at_turn == 当前回合` → 放行 → 回合能结束。✔
- 永久静默：下一个认证事件清空 → 义务恢复可挡，不退化为"一生只挡一次"。✔
- **不依赖 `stop_hook_active` 是可实现的**：回合标识由 §5.1 的入队路径写进同一个 per-sid
  状态文件，Stop 侧比对即可，无需 harness 提供重入标记。计划明写「这条不依赖 harness 是否
  提供 `stop_hook_active`」，与 §5.3 缺口 2（Codex 侧无证据）自洽。

**(b) 断言已拆且挂对文件。** §7.1 现有 `A-OBLIG-STOP`（**挂 `scripts/test-hooks.mjs`**，
并附一句硬警告「**不得挂 `test-project-scope-guard.mjs`**：那是 PreToolUse 夹具，物理上看不到
Stop，挂错等于 E2 的核心断言从不运行」）与 `A-OBLIG-SCOPE`（挂 `test-project-scope-guard.mjs`）。
R1 的原缺陷（核心断言无家可归 → 恒绿）已消除。

**变异体 15 咬得住**——前提是实现遵守 §4.2 的"不依赖 `stop_hook_active`"。这个前提没有被
断言钉死，见下 MAJOR-1。

---

## MAJOR

### MAJOR-1（新）— `A-OBLIG-STOP` 未排除 `stop_hook_active`，变异体 15 可能绿得不是因为它对

R1 曾要求「`A-OBLIG-NOLOOP` 的夹具**必须不含** `stop_hook_active` 字段」，**这半没被带进 `A-OBLIG-STOP`**。

**实测风险面**：`scripts/test-hooks.mjs:214` 已有断言
`stop_hook_active: true → stdout 为空（应放行）`；而义务分支按 §4.2a 第 1 条要落在
`session-sync.mjs`，紧邻 `:190` 现成的 `!stopHookActive` 守卫。实现者顺手复用它是最省事的写法。

**后果**：若"同回合不重挡"的夹具用 `stop_hook_active:true` 模拟第二次 Stop，则
一个**违反 §4.2、改用 `stopHookActive` 实现**的版本同样会让该用例变绿；此时删掉
`blocked_at_turn`（变异体 15）**不会转红**——影子守卫，变异体空转。而在 Codex 上
（§5.3 缺口 2：该标记全仓无证据）义务拦截会自环 → session 卡死，测试全绿。

**建议改法（一行）**：`A-OBLIG-STOP` 补一句——「同回合用例必须由状态文件里的
`blocked_at_turn` 驱动，**夹具不得包含 `stop_hook_active` 字段**」。

> 不判 BLOCKER 的理由：§4.2 的**指令本身是对的**（明写不依赖该标记），
> 缺的是"证明实现照做了"的那层。这是验证强度问题，不是会让实施必然翻车的指令错误。

### MAJOR-2 — 变异体 13 仍不咬；R1 要求的两条变异体仍缺（M1 部分未处理）

- **变异体 14：已闭合。** `A-OBLIG-STOP` 现要求在 `test-hooks.mjs` 测「`PENDING` 起挡 Stop +
  复合 reason ≤900」，这**隐含强制**了一条带 PENDING 义务的夹具 → 变异体 14（reason 复述全文
  → 900 断言转红）现在有咬合面。R1 的这半算解决。
- **变异体 13：仍不咬。** 它要靠一条 **apply_patch 形状 + 义务生效**的 scope 用例转红，
  而 §7.1 `A-OBLIG-SCOPE` 只写了「义务对 scope 的拒绝；转 `DEFERRED`；事务后恢复；tombstone」，
  **没有规定 apply_patch 形状用例**。§8 的接线硬约束点名了 `:683`（Codex 全部 apply_patch），
  但没有对应断言 → 变异体 13 仍是纸面变异体。
- **R1 要求新增的两条变异体仍缺席**：①让义务状态成为任何路径类 deny 的豁免条件；
  ②让义务读取的异常冒泡到 `:770` 的全局 fail-open。§8 仍把"义务读取必须自带 try/catch"
  列为**硬约束（违反即静默失效）**，却**没有任何变异体守它**——一个损坏的义务文件会让
  路径隔离与 `framework/` 保护同时消失，这条无人把守。

**建议改法**：`A-OBLIG-SCOPE` 明确加一条 Codex `apply_patch` 形状用例
（`tool_name='Bash'` + `tool_input.command` 为 `*** Begin Patch …`）；补回那两条变异体。

### MAJOR-3 — `.gitignore` 仍未补（M3 完全未处理）

**实测（含阳性对照）**：

```
git check-ignore -v .claude/.session-obligation-abc123 → 无输出（未被忽略）
git check-ignore -v .claude/.session-project-abc123    → .gitignore:97 命中（阳性对照）
grep -n "gitignore\|session-obligation" EXECUTION-PLAN-CORE.md → 零命中
```

`.gitignore` 在计划全文（含 §8「动」「不动」两个清单、§10 K5）**一次都没出现**。
每个产生义务的 session 会留下未跟踪的 `.claude/.session-obligation-<sid>`，
内含 §4.2 规定的 `exact_task_text` = **完整原始 prompt 字节**（上限 262,144 B）；
`git status` 永久变脏，一次 `git add -A` 就把用户 prompt 原文提交进仓库。

**仍不判 BLOCKER**（与 R1 同理，且我复核过）：`scripts/verify.sh` 无工作树洁净门，
不会自动卡住 §9 的验证。属于隐私/卫生问题，不是"实施会翻车"。

---

## MINOR

| # | 小节 | 状态 | 说明 |
|---|---|---|---|
| m1 | §4.1 | **未处理** | R1 要求补「不改 `routingScope.kind` / 不改 `scope: framework_meta` 路由过滤 / 不改 `FRAMEWORK_FLOW` 判定」三句，仍无。别名轴有变异体 1 兜底，信号轴仍裸奔。 |
| m2 | §3.2 | **未处理** | 「`classifyRoutingScope`/`projectGate`/`skillDecision` 的输入均不得包含 `alias_resolution`」仍只活在变异体 1 里，没进实现指令（全文搜 `classifyRoutingScope` 零命中）。 |
| m3 | §5.3 | **未处理** | 计划正确指出 `session-sync.mjs:193` 注释是陈迹（我复核：该注释仍在），但**仍未写「实现时顺手改正」**。留着会诱导下一个人把 Codex 重新降级成 advisory。 |
| m4 | §4.3 | **未处理** | 段首仍写 7 条 fixture「每条都产出信号」，三行后又说仍缺腿的要移出。就地自我更正，按顺序读会先写错一版断言。 |
| n1（新） | §7.2-7 | 新增 | 变异体 7「截断到**三腿从句**」——删掉同从句约束后该措辞已无所指。仍咬得住（`A-OBLIG-SCOPE` 要求完整字节），纯措辞。 |
| n2（新） | §8 | 新增 | §8 改动清单仍写 `test-project-scope-guard.mjs # A-OBLIG（scope 侧）`、`test-hooks.mjs # 900 字符闸`，未反映 §7.1 的 `A-OBLIG-STOP`/`-SCOPE` 拆分。§7.1 措辞明确且更严，属记账不同步。 |
| n3（新） | §4.2a(b) | 新增 | 压缩自成长段到 ≤600 时必须保住 `HOOK-007` 钉的 10 个关键词（`默认不存`/`明确纠正`/`复发`/`返工`/`候选`/`candidate_feedback_`/`extraction-bar.md`/`写入协议`/`修源头`/`.episode-written-`），计划未点名。我实测各段长度：[1]=203、[2]=199 承载其中 9 个，砍 137 字符可行，且 HOOK-007 会自动兜住。 |

---

## R1 三条 MAJOR / 四条 MINOR 的处理情况（逐条）

| R1 项 | 结论 |
|---|---|
| **M1**（变异体 13/14 不咬 + 两条变异体被丢） | **部分处理**：变异体 14 已闭合；变异体 13 与两条新变异体**未处理且应继续跟踪** → 本轮 MAJOR-2。 |
| **M2**（Codex rollout 老 schema fail closed） | **核心已处理**（K6 + 旁路 + 两条回归用例），但**引入新问题** → 本轮 BLOCKER NB1。 |
| **M3**（`.gitignore`） | **未处理**，实测复现 → 本轮 MAJOR-3。不阻断。 |
| m1 / m2 / m3 / m4 | **四条全部未处理**，均维持 MINOR，**不应阻断实施**。 |
| R1「必须做但没写的」①义务状态文件并发写协议 | **仍未写**。§4.2 只约束文件名，未落 `atomicProjectStateCas` / 临时文件 + `renameSync`。并行 session 下裸 `writeFileSync` 会产生半截 JSON，叠加 §8 的 fail-open 读取 → 义务静默消失（E2 无痕复发）。归入 MAJOR-2 同族，建议一并补；我本轮**未**新增计数（避免重复记账）。 |
| R1「必须做但没写的」②Codex `stop_hook_active` 实测 | 仍在 §5.3 缺口 2 里作为"已知缺口"，未提为实施前必做探针。与 MAJOR-1 同根。 |

---

## 我实跑的命令与输出摘要

```bash
# 三次自核
shasum -a 256 EXECUTION-PLAN-CORE.md ; wc -l < ... ; git -C <repo> rev-parse HEAD
  → 24c81ec… / 450 / 4658595…（三次一致）

# 仓库自带测试（只读，未改任何文件）
node scripts/test-route-guard.mjs         → PASS=132 FAIL=0   （与 §9 基线一致）
node scripts/test-project-scope-guard.mjs → PASS=96  FAIL=0
node scripts/test-hooks.mjs               → ALL HOOK/MEMORY REGRESSION TESTS PASSED

# B1：全文残留搜查
grep -n "从句" EXECUTION-PLAN-CORE.md → 9 处，逐条核实无规范性残留
grep -n "同段|兼任|clause|邻接" → 无新残留

# B2：自己读代码 + 三条早返实跑
sed -n '726,790p' .claude/hooks/route-guard.mjs
  → :738 / :758 / :770(裸 return complexity) 早于 :772 skillDecision，形态与 §3.2 表格相符
route-guard dry-run（stdin 喂 JSON payload）
  · 重构设置页面的信息架构…  cur=muse → PLAN_MODE score6（裸对象，走 :770）
                              cur=''   → PROJECT_STOP（:758）
  · 优化 route-guard 的设置页面… → NEEDS_CONTEXT（:738）
  · 帮我优化下设置页面…          → STOP（落 :785）

# B3：自己测 buildReason（提取真实函数源码求值）
scratchpad/measure-reason-r2.mjs → 625 / 737 / 785（非rearm）、609 / 721 / 769（rearm）
真实 hook 端到端                 → decision=block, reason=604（sid=date-2026-08-30）
交叉验证                          → 625 − 604 = 21 = 36 − 15（sid 长度差），提取忠实
scratchpad/seg-r2.mjs            → 段长 49/203/199/198/84；最小义务段 143（40字摘要=162）
                                    (a)单独：muse=900 贴边、20字名=948 爆闸 → (b) 必需
grep -rn "697" .                  → 计划与 audit 目录均无该数字

# NB1：Codex rollout 取证（只读 ~/.codex/sessions，640 个 rollout）
scratchpad/schema-probe-r2.py  → cli_version 分布；锚点存在性与版本不对齐
scratchpad/control-r2.py       → 对照：剔除"无 user 记录"文件后重算
scratchpad/posctl-r2.py        → **阳性对照**：计划 §1 引用的 rollout 检出 22 条
                                  item_completed/UserMessage → 我的探测器正确
scratchpad/perrec-r2.py        → 首版按记录统计：codex-tui 真人记录 68.4% 缺锚点
scratchpad/pos-r2.py           → **自我证伪**：抽查缺锚点样本，发现是 <hook_prompt> /
                                  <recommended_plugins> 注入记录，我的"真人"分类器太松
scratchpad/robust-r2.py        → 收紧（排除 XML 标签注入）后仍 43.3% 缺
scratchpad/one-r2.py           → **再自我证伪**：抽一个 0.150.1 混合文件逐条看，
                                  两条未锚定的都是 "# AGENTS.md instructions" 注入，
                                  真人 typed prompt 全部锚定
scratchpad/final-r2.py         → 排除三类注入后：≥0.148 真人 prompt 489 锚定 / 186 无锚点
scratchpad/dist-r2.py          → 锚点存在时距离**恒为 1**（489/489），无"存在但不相邻"
                                  186 条是"整个文件里根本没有该锚点"
scratchpad/mixed-r2.py         → **决定性**：per-file 分类，**混合文件 = 0**
                                  0.147.0 起每个版本都同时出现在"全锚点/全无锚点"两侧
                                  → 版本不是判据；锚点存在性是干净判据

# MAJOR-1 佐证
grep -n "stop_hook_active" scripts/test-hooks.mjs → :214 已断言 stop_hook_active:true 应放行

# MAJOR-3（含阳性对照）
git check-ignore -v .claude/.session-obligation-abc123 → 无输出（未忽略）
git check-ignore -v .claude/.session-project-abc123    → .gitignore:97（阳性对照命中）

# §5.3「已更正的前提」复核
node -e "canEmitControlVerb({}/codex/CODEX_SANDBOX/claude)" → 四种 env 均 true（计划属实）
```

**关于"空结果正是我想要的答案"的对照纪律**：本轮唯一的阴性结论是 B1 的
「全文再无同从句残留」，我没有靠 grep 空结果下结论——`从句` 实际命中 9 次，我逐条读过
判定其性质。NB1 的统计结论则跑了阳性对照（计划自引文件检出 22 个锚点）**并两次推翻自己**
（68.4% → 43.3% → 27.6%，每次都是发现分类器把系统注入当成了真人 prompt）。

---

## 读了什么 / 没读到什么

**通读**：`EXECUTION-PLAN-CORE.md` 全部 450 行；`REDTEAM-FINAL-CORE.md` 全部 410 行。

**读了并用于取证**：`route-guard.mjs`（`buildDecision` 全函数 :726–790、dry-run 入口、stdin 解析）、
`session-sync.mjs`（`buildReason` :119–139、主决策 :140–200、sid/project 派生 :24–56）、
`test-hooks.mjs`（HOOK-007 :281–299、runNode :78–92、三重防循环 :201–217）、
`lib/harness.mjs`（`canEmitControlVerb`）、`.gitignore`、`~/.codex/sessions` 全部 640 个 rollout（只读）。

**没读到 / 未验证**：

- `FINAL-EXECUTION-PLAN.md`（5890 行原稿）——按预算未读；**未**核对 §附「与原稿的关系」是否忠实。
- **§3.1 别名 manifest 整节仍未验证**（限额/规范化/拒绝规则/`O_NOFOLLOW`/dev-ino-size 复核/NFKC）
  ——无实现可测，纸面审查，与 R1 相同。
- **未实跑 Codex**（本 session 是 Claude 档）。NB1 的结论全部基于**磁盘上的真实 rollout 文件**，
  不是 Codex 进程实测；`stop_hook_active` 在 Codex 侧是否存在**仍无证据**。
- **未跑变异测试**（不得改 runtime）。对变异体 11/12/13/14/15 是否"咬得住"的判断，是
  **咬合面推理 + 夹具核对 + 路径实跑复现**，不是变异实证。
- §6.1 `REQ-SCOPE-NULL-FIRST`、§5.1 载荷校验、§7.1 `A-GATE-SUPPRESS` 的推导控制例
  ——本轮**未复核**（R1 已核且作者未改动该部分，聚焦复核不重复）。

---

## 收尾自核

```
$ shasum -a 256 EXECUTION-PLAN-CORE.md
24c81ec52a15b79ce8a5b8f3ea28c0464aecf4ba9790e072b29321d34bedd444  EXECUTION-PLAN-CORE.md
$ wc -l < EXECUTION-PLAN-CORE.md
450
$ git -C /Users/luca/Desktop/项目/muse/lucagstack rev-parse HEAD
4658595ac20ce544cb406657c70ba3259eb1f842
```

与开审前、写报告前**三次一致** → 本裁决对 SHA
`24c81ec52a15b79ce8a5b8f3ea28c0464aecf4ba9790e072b29321d34bedd444` 有效。
K2 全程未触发，无豁免举证需求。

**裁决：NO_GO — 1 BLOCKER / 3 MAJOR / 7 MINOR。**

> 补完 NB1（改一行判据 + 改写变异体 16 + 一条无锚点回归夹具）即可重新握手。
> 四条原 BLOCKER 已闭合，架构无需重开。三条 MAJOR 建议一并补，但**不用于阻断**——
> 若 luca 认为 NB1 的一行修复可在实施第一步就地完成，本报告不反对以"带条件 GO"放行。

<!-- FILE_END: REDTEAM-FINAL-CORE-R2.md -->
