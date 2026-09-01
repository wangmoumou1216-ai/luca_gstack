# REDTEAM-C1-FINAL — 窄终审：§4.2a 每轮注入 + C1 删减一致性

范围：**只审 A（§4.2a 新机制）与 B（C1 删减后的残留/一致性）**。
不审 E1/E3 主体、§3/§5/§6、KILL 条件、`REQ-SCOPE-NULL-FIRST`（C1 改动未波及，见 §B.4）。

---

## 裁决

```
NO_GO  3 BLOCKER / 5 MAJOR / 5 MINOR
```

三条 BLOCKER 全部有可执行答案（无一条是"机制本身不可行"）。B **有残留**（BLOCKER-3 / MINOR-1 / MINOR-2），
按本轮判据"若 A 的问题都有可执行答案、B 无残留，就给 GO"——B 未满足，故 NO_GO。
预计补完这 3 条 BLOCKER + 5 条 MAJOR 是**文字工作**，不需要重开设计。

---

## 三次自核

| 时点 | HEAD | 计划 SHA-256 | 行数 | 那两个未提交文件 |
|---|---|---|---|---|
| 开审 | `72bd1f25a8f969e56ab0133dc6ec5f11b3b1236c` | `73fce4cc…9bb17ce` | 490 | ` M` 两者均未提交 |
| 写前 | `72bd1f25a8f969e56ab0133dc6ec5f11b3b1236c` | `73fce4cc…9bb17ce` | 490 | ` M` 两者均未提交 |
| 写后 | 见文末「写后自核」 | | | |

**基线未移动**，无需触发"新提交内容是否等于开审工作树"的举证分支，不判 stale。
`git diff --stat HEAD` 全程为 `route-guard.mjs +71 / codex-hook-adapter.mjs +158`（209 insertions, 20 deletions），
与任务书给出的实测环境一致——本报告引用的所有 runtime 行号均取自**含这两个未提交改动**的工作树。

---

## A. §4.2a「每轮注入」

### A-1 摘要从哪来？ —— 裁决：**计划要补（MAJOR）**，不是机制不可行

计划只在 line 179 给了一行格式串，`<≤40 字摘要>` 的生成方式全文零定义。四个必须定死的点：

1. **在哪一层生成**。`exact_task_text` 上限 262,144 B（§4.2 line 410），义务状态文件与注入串是两个东西。
   计划从未写明"摘要只在**渲染时**从 `exact_task_text` 派生、不落盘、不回写"——不写明就与
   §4.2「不截断、不丢任何 UX 约束」和变异体 7 正面对撞：实现者完全可能把截断结果存回状态文件。
2. **「字」是什么单位**。码位 / UTF-16 code unit / UTF-8 字节三者对中文差 3 倍。
3. **多字节切半**。Node 里 `str.slice(0,40)` 按 **UTF-16 code unit** 切，对 BMP 内中日韩安全，
   但对 emoji / 增补平面字符会切出**孤立代理项**。实测下游不会崩：route-guard 走
   `process.stdout.write`（utf8 编码时孤立代理项转 U+FFFD），Codex 侧走
   `codex-hook-adapter.mjs:162` 的 `JSON.stringify`（well-formed stringify，输出 `\udXXX` 转义，合法 JSON）。
   **结论：是显示问题不是崩溃问题**——但仍要定死，否则每个实现者切法不同。
4. **控制字符与换行**。`exact_task_text` 是原始 prompt 字节，含 `\n` 的任务会把"一行"注入
   炸成多行，直接毁掉 line 178「注入**一行**」这个承重措辞。

**建议改法（一句话可落）**：
> 摘要 = 取 `exact_task_text`，先 NFC 规范化、把 `\r?\n`/`\t`/C0 控制字符折叠为单个空格并 trim，
> 再按**码位**取前 40（`[...s].slice(0,40).join('')`，天然不切代理项），超长补 `…`。
> 摘要**只在 route-guard 渲染时派生，不落盘、不回写状态文件**（守卫：变异体 7 + A-OBLIG-SCOPE 的
> "保留完整原始任务字节"）。

### A-2 会不会变成新噪音？ —— 裁决：**机制类别不撞同一条诉求；当前写法无界（缺陷归 BLOCKER-1）**

不凭感觉，三条依据：

1. **`72bd1f2` 反对的是"多出回合"，不是"多出文字"。** 该提交自述理由是「Stop 是回合边界不是
   SessionEnd，默认强制续跑会把正常中间对话变成**额外回合**」。一行 hint 不产生回合，
   不进入 Stop 通道，不触发续跑。两者是不同机制类，不撞。
2. **同通道已有 luca 亲自点名的"每条消息提醒"先例。** `route-guard.mjs:1200`
   的 `⬇️ 本检出落后 <upstream> N 条` 注释写着「2026-07-16 luca 点名……**即每条消息提醒**，
   pull 后自动消失」。所以"每轮一行"这个形态本身**已被用户认可过一次**。
3. **但那个先例带自清条件，本机制没有。** behind 提醒 `git pull` 后消失；checkpoint 提醒
   `100 轮封顶`（`:1185`）；`⚠️ 当前有未完成节点` 随 workflow-state 变化消失。
   `PENDING` 义务**没有任何终止生产者、也没有轮次上限**（见 BLOCKER-1）。
   照现在写法实施，注入会持续到 session 结束，**包括任务早已做完之后的每一轮**。

**综合裁决**：注入本身不是噪音；**无界**才是。补上 BLOCKER-1 的终态生产者 + 一个轮次上限后，
本机制在噪音维度可接受，且与 `feedback_dont-silence-what-user-asked-to-surface`（"核心诉求是
让我知道 X 时默认不加自动消音"）一致——**不要**为了省事给它加静默/折叠，要给它加**清除条件**。

### A-3 会不会污染 route-guard 的输出契约？ —— 裁决：**不污染（MINOR 附注）**

实读 `route-guard.mjs` 后，输出面是**两条互斥通道**：

| 通道 | 位置 | 形态 | 消费者 |
|---|---|---|---|
| dry-run JSON | `:1093` `process.stdout.write(JSON.stringify(decision,null,2))` **随即 `:1094 process.exit(0)`** | 严格 JSON | `test-route-guard.mjs:30 JSON.parse`（139 例）、`memory/scripts/eval_routing.py:64,92`（`ROUTE_GUARD_DRY_RUN=1` + `json.loads`） |
| 真实 hint | `:1204` `process.stdout.write(hints.join('\n')+'\n')` | 自由多行纯文本 | Claude Code additionalContext；Codex 经 `codex-hook-adapter.mjs:155-162` 包成 `hookSpecificOutput.additionalContext` |

三点实测结论：

1. **dry-run 通道天然免疫**：`:1094` 的 `process.exit(0)` 在 hints 写出**之前**，只要注入走 `hints`
   数组，139 条既有 dry-run 用例与 `eval_routing.py` 一行都碰不到。
2. **hint 通道本来就是自由文本，且已经在推巨型多行内容**：`:1152` 推整份项目 `MEMORY.md`、
   `:1157` 推 `CONTEXT.md` 前 100 行。多一行 40 字在体量上可忽略（`codex-hook-adapter.mjs:16`
   记的 macOS 64KiB 管道风险与本行无关，且 route-guard 末行写完是自然退出、不是 `exit()`）。
3. **Codex 适配器不会误判**：`adapt()` 先 `JSON.parse(text)` 试探，失败即当纯文本包
   `additionalContext`（`:155-162`）。多一行 hint 只会让它**更确定**不是 JSON。
   `UserPromptSubmit` 在 `SUPPORTS_ADDITIONAL_CONTEXT` 集合内（`:124-126`），
   且 `.codex/hooks.json` 的 UserPromptSubmit 条目带 `additionalContextLimit: 0`（=完整直传），无截断。

**MINOR 附注**：计划必须写明注入落在**非 dry-run 的 `hints` 通道**、不进 `decision` 对象。
不写明的话，实现者把义务字段塞进 `decision` 会让 dry-run JSON 契约发生变化（139 例虽不会红，
但 `eval_routing.py` 的 `classify()` 面被悄悄改宽）。

### A-4（自找第四个）**`SATISFIED` / `CANCELLED` / `SUPERSEDED` 全文没有生产者** — **BLOCKER-1**

全文搜三个终态（`grep -n "SATISFIED\|CANCELLED\|SUPERSEDED"`），只有 **3 处命中**：

- `:150-151` 状态图里出现；
- `:346` `A-OBLIG-VISIBLE` 断言"义务被 `SATISFIED`/`CANCELLED` 后停止注入"；
- `:347` `A-OBLIG-SCOPE` 一句含糊的"取消/新任务可 tombstone"。

**没有任何一处规定什么事件把 `PENDING` 推进到这三个状态。** §4.2 的转移规则只写了两条：
`SIGNAL_UNCONFIRMED → PENDING`（下一个经认证人类事件带肯定式任务指令）、
`PENDING → DEFERRED_BY_PROJECT_CHANGE`（项目切换）。**进得去，出不来。**

这是 C1 的**直接后果，不是原有缺陷**：删掉 Stop 拦截 = 删掉了"模型想结束 → 必须交代任务是否完成"
这个**唯一能观测到'任务做完了'的事件**。C1 把 `SATISFIED` 留在状态图和断言里，却把它的生产者一起删了。
（对照 `feedback_inventory-before-rewriting-own-artifacts`：改写自己的规则前先盘点它当前承担的
全部功能并逐项声明去向。Stop 承担的"完成声明点"这一维被静默丢掉。）

**照此实施的实际结果**（这是判 BLOCKER 的理由，不是措辞问题）：
- 义务一旦升 `PENDING`，📌 行**每轮注入直到 session 结束**，任务做完之后照样注入；
- `A-OBLIG-VISIBLE` 的"停止注入"分句**无法被真实驱动**——实现者只能手写一个 `SATISFIED` 的
  fixture 文件塞进去测读取分支，那测的是 reader 不是 transition，属于
  `feedback_assertion-never-ran-is-not-assertion-passed` 的恒真形态；
- 直接回落到 A-2 判定的"无界"，撞上 luca 刚用 `72bd1f2` 表达的同一诉求的**另一半**。

**建议改法（三选一或叠加，都可执行）**：
1. **`SUPERSEDED`**：下一个经认证人类事件携带新的肯定式任务指令 → 旧义务转 `SUPERSEDED`（与升
   `PENDING` 同一判据，零新机制）；
2. **`CANCELLED`**：用户显式取消语义 → 由 LLM 层写状态文件（义务本来就是"任务载体"，
   载体由使用者销账是自洽的）；
3. **硬上限**：`PENDING` 注入满 N 轮（建议 20，与既有 checkpoint 提醒同节拍）自动转
   `EXPIRED` 并停止注入——**这一条是承重不变量，即便 1/2 都实现也要留**，理由与
   Loop 宪法第 5 条「iteration 上限是承重不变量，永不默认无限」同源。

`SATISFIED` 若确实无法在无 Stop 的前提下观测，**可以直接从状态图里删掉**并在 §4.2a 写明
"本设计不观测完成，只观测被取代/被取消/超期"——那是诚实的收窄，比留一个没有生产者的状态好。

### A-5（自找第五个）**「每轮」的注入点位未指定，而所有自然邻位都是条件分支** — **MAJOR-2**

§8 给 `project-scope-guard` 写了两条**接线硬约束**（必须在 `main()` 首位、必须自带 try/catch），
理由是"违反即静默失效"。**`route-guard` 侧的注入没有任何等价约束**——而它的条件嵌套更深。
实测 `route-guard.mjs`（含未提交改动）里与之最相似的既有 hint（`:1145` `⚠️ 当前有未完成节点`）
被压在**四层条件 + 一个 catch-all** 之下：

```
:1096  if (hookSessionId) {
:1097    try {
:1133      } else {                       ← 本回合没有 PROJECT_SWITCH 才进
:1140        if (opened.state === 'TURN_ACTIVE') {
:1145          hints.push(`… ⚠️  当前有未完成节点 …`)
:1162    } catch (error) { hints.push(`⛔ PROJECT STATE …`) }   ← 出错时整块被替换
```

实现者最省事的做法就是把 📌 行贴在 `:1145` 旁边。后果：

- **`PROJECT_SWITCH` 回合不注入**（走 `:1112` 的 `if` 分支，`else` 整块跳过）——
  而 §4.2 恰恰规定义务要跨项目切换存活（`DEFERRED_BY_PROJECT_CHANGE` → 事务后恢复）。
  义务在它最该露面的那一轮消失。
- **`opened.state !== 'TURN_ACTIVE'` 不注入**。
- **project-state 抛错时不注入**（被 `:1162` 的 catch 换成 ⛔ 行）。

**建议改法**：给 §8 补一条与 project-scope-guard 对称的硬约束：
> `route-guard` 的义务注入必须放在**顶层**（`:1096` 的 `if (hookSessionId)` 块**之外**、
> `:1204` 最终 `hints.join` **之前**），只受 `!dryRun && prompt && hookSessionId` 约束，
> **自带 try/catch**，不依赖 `topLevelProjectState` / `beginProjectTurn` 的任何返回值。

### A-6（附加）**注入串与既有 hint 一字之差，同通道同 emoji** — **MINOR-4**

- 提议串：`[route-guard] 📌 当前有未完成任务：…`（`:179`）
- 既有串：`[route-guard] ⚠️  当前有未完成节点: …`（`route-guard.mjs:1145`）
- 既有 `📌` 占用：`route-guard.mjs:1157` 的 `📌 项目 CONTEXT（…）`、`scripts/project-pin.mjs:291`

`当前有未完成` 是两串的公共前缀。`A-OBLIG-VISIBLE` 的**负向**分句（"`SIGNAL_UNCONFIRMED` 不注入"）
若写成 `assert.doesNotMatch(stdout, /当前有未完成/)`，会被一个恰好 `IN_PROGRESS` 的 workflow 节点
打成**假红**。建议换一个不与既有串共前缀的措辞（如 `📎 未销账任务`），
或强制断言钉**完整字面串含 emoji**。

### A-7（附加）**谁把 `SIGNAL_UNCONFIRMED` 升 `PENDING`，跨 hook 未指定** — **MAJOR-5**

升 `PENDING` 的判据是"下一个**经认证的**人类事件"（`:155`），而认证按 §5.2 发生在
**第一个 PreToolUse / Stop**——和注入所在的 `UserPromptSubmit` 是**不同的 hook 进程**。
计划从未指定由谁执行这次状态推进。两个实测过的后果面：

1. **Codex 纯读回合根本没有 PreToolUse**。实测 `.codex/hooks.json` 的 PreToolUse matcher 是
   `^(Bash|apply_patch)$`（§5.3 自己也点了这个缺口）。该回合只剩 Stop 能认证。
2. 但 `A-OBLIG-VISIBLE` 写的是"**任何状态下 Stop 路径均无义务相关输出**"。
   这句只约束 **stdout**，不约束**状态写入**——可计划没说清。实现者把它读成
   "Stop 不得碰义务"是完全合理的读法，届时 Codex 纯读回合**永远升不到 `PENDING`**，
   E2 在该路径静默不修，且没有任何断言会红。

**建议改法**：在 §4.2 一句话定死——
> `SIGNAL_UNCONFIRMED → PENDING` 的推进由**执行惰性认证的那一侧**（PreToolUse 或 Stop，先到先得）
> 完成；Stop 侧**允许且必须**推进状态，`A-OBLIG-VISIBLE` 的 Stop 约束**仅针对 stdout**，
> 与状态写入无关。

---

## B. C1 删减后的一致性

### 判定方法（先交代方法，再交代结论）

1. **按语义搜，不只搜被删符号**：`blocked_at_turn` / `stop_hook_active` / `session-sync` /
   `test-hooks` / `独占` / `拦截` / `挡` / `advisory` / `900` / `义务`，逐条人读命中上下文，
   区分"作废声明"（合法）与"仍在指挥实现"（残留）。
2. **导入式措辞全扫**：`见 §` / `同 §` / `per §` / `如上` / `上文` / `前述` / `原 §` /
   `第 N 条` / `下方` / `上方` / `该条` / `这条` / `那条` —— 逐条解析引用目标是否还存在。
3. **阳性对照**（空结果正是想要的答案时必跑）：同一 grep 循环形式下
   `test-hooks → 0`、`test-route-guard → 4`、`blocked_at_turn → 1`、`冻结 → 4`。
   非零命中证明管道确实在读这个文件，`test-hooks` 的 0 是真缺席。
4. **§8 七文件清单**逐个回查正文引用点，并反查"正文提到但清单没有"的方向。

**结论：不是零残留。找到 3 条（1 BLOCKER + 2 MINOR）。**

### B-1（残留）§5.3 `:289-291` 三重残留，且带 "必须" 祈使 — **BLOCKER-3**

```
289  2. **`stop_hook_active` 只在 Claude 侧有证据**——Codex 侧是否提供同等的重入标记，全仓无证据。
290     §4.2a 第 3 条的共存方案依赖它防循环；若 Codex 无此标记，义务拦截在 Codex 上可能自环，
291     必须另设一次性标记（按 sid + 义务 id）兜底。
```

一段里三个已删对象：

| 残留 | 与哪一处冲突 |
|---|---|
| `stop_hook_active` **依赖** | `:186` 明写"对 `stop_hook_active` 的依赖"**已作废** |
| `§4.2a 第 3 条` | 新 §4.2a **没有任何编号条目**（结构是 裁决/依据/为什么更强/引用块/零打断/一并作废/一致性/代价），是**悬空引用** |
| "义务拦截在 Codex 上可能自环" + "**必须**另设一次性标记" | `:164` "义务是任务载体，**不是拦截器**"；`:156` "任何状态都不拦截 Stop" |

判 BLOCKER 而非 MINOR 的理由：它不是一句陈迹，是一条**仍在生效的 `必须` 指令**，
且被 `:285` 归入"同样在 L0 探针里专门测"。实现者照 §5.3 干，会为一个**不存在的拦截**
建 sid+义务 id 防循环标记；更糟的读法是据此认定"Codex 上义务确实会拦截"，
于是**把 2026-08-31 裁决刚删掉的拦截重新实现出来**——同一文档对 E2 是否拦截给出两套相反指令。

**建议改法**：整条删除；若 Codex 侧重入标记的缺口对 §5.2 惰性认证本身仍有意义，
改写成只讲**认证**、不讲义务/拦截/防循环，并去掉 `§4.2a 第 3 条` 引用。

### B-2（残留同族）`:296` "E2 在 Codex 上是硬拦截，不是 advisory" — 归入 BLOCKER-3

`:293-296` 这段的**前提**仍然有效（`f8024a8` 后 `canEmitControlVerb` 三种 env 均为 true，
这对 §4.2 的**义务拒 scope**仍然要紧），但**结论句**是 Stop 语境下写的，现已与 §4.2a 直接矛盾。
建议改写为：「**scope 轴**的义务拒绝在 Codex 上是硬拒绝、不是 advisory；**Stop 轴**按 §4.2a
不产生任何义务输出」。

### B-3（C1 未收口的承重项）`义务对 scope 的拒绝` 规则**全文未定义**，且与"零打断"冲突 — **BLOCKER-2**

C1 只处理了 Stop 轴，但义务的**另一条拦截通道原封不动地留着**，而它的规则**在 §4 里根本不存在**：

| 出现处 | 原文 |
|---|---|
| `:154` | `SIGNAL_UNCONFIRMED`……"不注入、**不拒 scope**、不给 capability" ← 反读即 `PENDING` **拒 scope** |
| `:347` | `A-OBLIG-SCOPE`：「**义务对 scope 的拒绝**」 |
| `:402` | §8：`project-scope-guard.mjs # 义务拒 scope（仅 scope，不含 Stop）` |
| `:377/385/389` | 变异体 13 / 17 / 19 全部围绕这条拒绝 |
| `:417-421` | §8 两条接线硬约束，专为它而写 |

**§4 全文没有一句说清它拒绝什么**：哪些 scope 操作被拒、拒绝时输出什么、用户怎么解除。
一个断言 + 三个变异体 + 两条接线硬约束，共同指向一条**规则不存在**的行为。

同时它把 §4.2a 的 `:181`「**零打断**，但全程可见」变成**不成立的措辞**——
`project-scope-guard` 跑在 PreToolUse 上（`.codex/hooks.json` matcher `^(Bash|apply_patch)$`；
`.claude/settings.json` 同名条目），义务在那里拒绝一次就是一次**回合中途的硬打断**,
比 Stop 拦截更早、更频繁。

判 BLOCKER 的理由（严格对判据）：照此实施，实现者只有两条路——
（a）**自己发明**一条从未被评审的拒绝规则，装进一个对全机所有并发 session 生效的 PreToolUse 热路径；
（b）跳过不做，则 `A-OBLIG-SCOPE` + 变异体 13/17/19 + §8 两条硬约束**同时悬空**。
两条都产出错误结果。

**建议改法（二选一，都可执行）**：
1. **收窄**：把义务对 scope 的作用从"拒绝"降为"**在 PreToolUse 的 additionalContext 里带同一行
   📌 提示**"——与 §4.2a 的"载体不是拦截器 / 零打断"完全一致，变异体 13/19（死代码位置）
   和 17（try/catch）原样保留仍然有效，只是被守卫的对象从"拒绝"变成"提示"；或
2. **保留拒绝但写全**：在 §4.2 用一段定死拒绝面（拒什么、不拒什么、解除条件、
   与 `NO_PIN`/framework 豁免的优先级），并把 `:181` 的"零打断"改写为
   "**不打断回合边界**，scope 轴仍有硬拒绝"。

### B-4 `A-OBLIG-VISIBLE` 与 §4.2a 的一致性 — **两处不一致**

| # | 分句 | 判定 |
|---|---|---|
| 1 | "`PENDING` 义务存在时**每轮**注入 📌" | 与 `:178` 一致；但**可测性不足**，见 B-5 变异体 14 |
| 2 | "`SIGNAL_UNCONFIRMED` 不注入" | 与 `:154` 一致 ✅ |
| 3 | "义务被 `SATISFIED`/`CANCELLED` 后停止注入" | ❌ **不可驱动**——两个状态无生产者（BLOCKER-1） |
| 4 | "任何状态下 Stop 路径均无义务相关输出（`session-sync.mjs` 的 stdout 不因义务改变）" | ❌ **挂错了文件**，见 B-5 变异体 15 |
| 5 | 表头"**挂 `scripts/test-route-guard.mjs`（UserPromptSubmit 侧）**" | 与分句 4 自相矛盾：分句 4 的被测对象是 Stop hook `session-sync.mjs`，不在 UserPromptSubmit 侧 |

补充（正面）：`A-OBLIG-VISIBLE` **挂 `test-route-guard.mjs` 这个落点本身是成立的**——
该文件 `:1081-1103` 已有一段 "Real hint surface (not dry-run JSON)" 的既成范式
（`ROUTE_GUARD_DRY_RUN: '0'` + 直接 `assert.match(result.stdout, …)`），
`:1107-1143` 还有一段用 `mkdtempSync` 造隔离 gstack root 跑有状态分支的范式。
**注入侧完全可测，不需要新建测试文件**。问题只在分句 3/4/5。

### B-5 变异体 14 / 15 改写后是否真的咬得住 — **两条都咬不住（MAJOR-3 / MAJOR-4）**

**变异体 14**（"只在某个边界注入一次"）— **咬不住**。
`A-OBLIG-VISIBLE` 没有要求"**同一 sid 连续 ≥2 次调用、状态不变、两次都出现**"。
实现者写一个**单次调用**的用例（PENDING 存在 → stdout 含 📌）完全满足字面断言，
而变异体 14 恰好保留"某一次会注入"——单次用例照绿。这是
`feedback_assertion-never-ran-is-not-assertion-passed` 的标准形态。
**改法**：断言里写死"以同一 `session_id` 连续 spawn route-guard **三次**（复用
`test-route-guard.mjs:1107` 的 tmpdir 范式），三次 stdout **均**含完整 📌 字面串"。
顺带这条也能咬住 A-5 的点位缺陷（第 2、3 次里制造一次 `PROJECT_SWITCH` 回合）。

**变异体 15**（"让义务在 Stop 路径产生任何输出 / 恢复挡 Stop"）— **咬不住，且断言从第一天起恒绿**。
三条实测理由：
1. 被变异对象是 `session-sync.mjs`，它**不在 §8 的 7 文件清单里**（C1 已删）——
   计划全程不改它，那条负向断言在实现前后**都是绿的**，属于"影子守卫"：
   过不去的不是断言，是根本没有阳性对照。
2. 承载它的 `test-route-guard.mjs` 被标为"（UserPromptSubmit 侧）"，
   而它必须 spawn 的是 Stop hook。
3. `§9` 的验证命令列表**不含任何会真跑 Stop hook 的东西**；
   C1 同时删掉的 `scripts/test-hooks.mjs`（本轮实测 ALL PASSED）是全仓唯一跑 hook 集成的入口，
   删掉后 Stop 侧彻底无人值守。

**改法**：把分句 4 拆成一条独立断言，明确写「以 `PENDING` 义务状态文件在场的条件下
spawn `.claude/hooks/session-sync.mjs`（Stop 事件负载），断言 stdout 中**不含**义务字面串，
且退出码/decision 与无义务时**逐字节相同**」，并在 §8 把 `scripts/test-hooks.mjs`
**加回测试清单**（只加测试文件，不改 `session-sync.mjs` 本身，不违反"不动 Stop"）。
否则 2026-08-31 裁决**没有任何守卫**——这正是它自称要守的东西。

### B-6 §8 七文件清单与正文引用 — **1 处不符（MINOR-1）+ 1 处建议（MINOR-5）**

七个文件本身**齐全且都有正文对应点**（`.gitignore`↔变异体 18 与隐私段；`route-guard.mjs`↔§3.2/§4/§6.1；
`project-scope-guard.mjs`↔A-OBLIG-SCOPE/变异体 13,17,19；`codex-hook-adapter.mjs`↔§5；
三个测试↔各自断言）。两点问题：

- **MINOR-1（C1 漏改）**：`:404` 行内注释写
  `scripts/test-route-guard.mjs   # A-ALIAS / A-SIGNAL / A-SCOPE-NULL / A-GATE-SUPPRESS`，
  **漏了 `A-OBLIG-VISIBLE`**——而 `:346` 明写它就挂在这个文件上。
  这正是 C1 把该断言从 `test-hooks.mjs` 迁过来时"改一处漏一处"的第四次复发（前三次：
  §4.1 "该从句"、§7.1 "跨从句"、§5.3 `cli_version`）。
- **MINOR-5（非 C1 引入，顺带提）**：§8 要改 `.codex/codex-hook-adapter.mjs`，
  但 §9 的验证命令**不含 `node scripts/test-codex-adapter.mjs`**（本轮实测 23/0），
  且该脚本不在 `package.json` 也不在 `verify.sh` 的 84 项里——改动它的既有回归底线无人跑。
  建议加进 §9。

### B-7 其余被删项：**零残留**（附判定依据）

| 被删项 | 命中 | 判定 |
|---|---|---|
| `blocked_at_turn` | 仅 `:186`（"一并作废"清单内） | ✅ 纯作废声明，非残留 |
| Stop 通道 stdout 独占 | 仅 `:186` | ✅ 同上 |
| ≤900 字符复合 reason 预算 | 仅 `:185` | ✅ 同上（且明写 R2 曾判 BLOCKER 的算术依据，保留有价值） |
| §4.2a 原三条挡 Stop 硬约束 | `:162/164/175/181/182/192` 全部是**新**的"不挡"论证；`:184` 声明作废 | ✅ 无幸存的祈使句 |
| `scripts/test-hooks.mjs` | **0 命中**（阳性对照见方法 3） | ✅ 符号零残留——但见 B-5，这个"干净"恰恰是变异体 15 失守的原因 |
| 原变异体 14/15 | 已被新 14/15 覆写，无旧文残片 | ✅ 符号层干净；语义层见 B-5 |
| `session-sync.mjs` 从 §8 移除 | `:184` 作废声明 ✅ / `:293` 历史陈迹说明 ✅ / `:346`+`:381` **作为被测对象**引用 ⚠️ | 见 B-5 |

### B-8 C1 是否波及"不审"的四块 — **未波及，维持不审**

- `REQ-SCOPE-NULL-FIRST`（§6.1）：C1 只动 §4.2a/§8/§7.2，`:313-334` 字节不受影响；
  本轮实测复现仍在（`不涉及项目的route-guard` → `PROJECT_SWITCH / create_new_project`），
  与前三轮结论一致，不重开。
- E1/E3 主体、§3/§5/§6、§10 KILL：C1 的删除面全部落在 E2 义务/Stop 相关段，
  唯一越界的是 §5.3 里那段（已按 B-1 报为 BLOCKER-3）。
- 顺带记账（MINOR）：`:446` §10 标题写"精简到 **4** 条"，实列 **6** 条（K1/K2/K5/K3/K4/K6），
  且顺序为 K1,K2,K5,K3,K4,K6。**MINOR-3**。
- 顺带记账（MINOR）：`:166` 写"依据（**§0.1** 逐字诉求链）"，但本文件从 §1 起、**没有 §0.1**
  （§0.1 在原稿 `FINAL-EXECUTION-PLAN.md:11` "Verbatim requirement chain"）。
  同段 `:169` 就正确写成"原稿 §0.1"。属 §4.2a 新写入的悬空引用。**MINOR-2**。

---

## 缺陷汇总

| # | 级别 | 位置 | 一句话 |
|---|---|---|---|
| BLOCKER-1 | BLOCKER | §4.2 `:150-160` / §7.1 `:346` | `SATISFIED`/`CANCELLED`/`SUPERSEDED` 无生产者 → 每轮注入永不停止；"停止注入"断言不可驱动 |
| BLOCKER-2 | BLOCKER | §4.2 `:154` / §7.1 `:347` / §8 `:402,417-421` / §7.2 `:377,385,389` | 「义务对 scope 的拒绝」规则全文未定义，且与 `:181`"零打断"冲突 |
| BLOCKER-3 | BLOCKER | §5.3 `:289-291`（+ `:296`） | 依赖已作废的 `stop_hook_active`、悬空引用「§4.2a 第 3 条」、命令为不存在的"义务拦截"另建防循环标记 |
| MAJOR-1 | MAJOR | §4.2a `:179` | ≤40 字摘要的生成层/单位/切分/控制字符/是否落盘全未定义 |
| MAJOR-2 | MAJOR | §8（缺项） | route-guard 侧注入无接线硬约束；自然邻位在 `:1096/:1097/:1133/:1140/:1162` 五重条件内，切项目回合会静默不注入 |
| MAJOR-3 | MAJOR | §7.2 变异体 14 | 断言未要求多轮，单次用例即绿，变异体咬不住 |
| MAJOR-4 | MAJOR | §7.2 变异体 15 / §7.1 `:346` | Stop 侧负向断言挂错文件且无阳性对照，恒绿；裁决实际无守卫 |
| MAJOR-5 | MAJOR | §4.2 `:155` / §7.1 `:346` | 谁把 `SIGNAL_UNCONFIRMED` 升 `PENDING` 未指定；Codex 纯读回合无 PreToolUse，易致 E2 静默不修 |
| MINOR-1 | MINOR | §8 `:404` | 行内注释漏列 `A-OBLIG-VISIBLE` |
| MINOR-2 | MINOR | §4.2a `:166` | `§0.1` 在本文件不存在，应作"原稿 §0.1" |
| MINOR-3 | MINOR | §10 `:446` | 标题"4 条"实列 6 条 |
| MINOR-4 | MINOR | §4.2a `:179` | 注入串与既有 `当前有未完成节点` 共前缀、与 `📌 项目 CONTEXT` 撞 emoji |
| MINOR-5 | MINOR | §9 | 未跑 `scripts/test-codex-adapter.mjs`（23/0），而 §8 要改该适配器 |

---

## 实跑命令摘要（全部只读；无 git 写命令，未碰那两个未提交文件）

```bash
git -C <root> rev-parse HEAD                       # 72bd1f2…（开审/写前/写后三次一致）
git -C <root> status --porcelain -- .claude/hooks/route-guard.mjs .codex/codex-hook-adapter.mjs
git -C <root> diff --stat HEAD -- <那两个文件>       # +71 / +158，209 insertions(+), 20 deletions(-)
shasum -a 256 …/EXECUTION-PLAN-CORE.md             # 73fce4cc…（三次一致）
wc -l …/EXECUTION-PLAN-CORE.md                     # 490
cat -n …/EXECUTION-PLAN-CORE.md                    # 全文 1→490 读完，含 <!-- FILE_END --> 标记

node scripts/test-route-guard.mjs                  # PASS=139 FAIL=0  exit 0
node scripts/test-project-scope-guard.mjs          # PASS=97  FAIL=0
node scripts/test-codex-adapter.mjs                # PASS=23  FAIL=0

grep -n "console.log|stdout.write|additionalContext" .claude/hooks/route-guard.mjs
sed -n '1060,1204p' .claude/hooks/route-guard.mjs  # 输出契约 + hint 嵌套
sed -n '115,180p'  .codex/codex-hook-adapter.mjs   # adapt() 纯文本→additionalContext
sed -n '1075,1163p' scripts/test-route-guard.mjs   # 既有 real-hint-surface 测试范式
grep -n "route-guard|stdout|json.loads" memory/scripts/eval_routing.py   # dry-run 消费者
python3 -c "json…" .claude/settings.json / .codex/hooks.json             # hook 接线与 matcher
grep -rn "当前有未完成" / "📌" --include=*.mjs .                          # 串冲突
# 残留扫描（含阳性对照）
for pat in blocked_at_turn stop_hook_active session-sync test-hooks 独占 拦截 挡 advisory 900 义务; do grep -n -- "$pat" …; done
grep -n "见 §|同 §|per §|如上|上文|前述|原 §|第 N 条|下方|上方|该条|这条|那条" …
for pat in test-hooks test-route-guard blocked_at_turn 冻结; do grep -c …; done   # 0/4/1/4 阳性对照
```

**未跑**：`scripts/verify.sh`（84 项，含仓外/网络类检查，本轮无需）、`npm run check:hooks`
（会跑 `test-hooks.mjs`，与本轮结论无关且耗时）。任务书给出的 `test-hooks ALL PASSED` 未复跑，
本报告不以它为任何结论的依据。

---

## 写后自核

| 项 | 值 |
|---|---|
| HEAD | `72bd1f25a8f969e56ab0133dc6ec5f11b3b1236c` — 与开审/写前逐字节一致，**基线全程未移动，不判 stale** |
| 计划 SHA-256 | `73fce4ccb920b902252ebe33d0a561cfa700ab230c095919283151fdbb9b17ce`（未被本报告触碰） |
| 本报告是否改过任何既有文件 | 否。全程只读 + 只新建本文件 |
| 那两个未提交改动 | 未 add、未 commit、未编辑 |

<!-- FILE_END: REDTEAM-C1-FINAL.md -->
