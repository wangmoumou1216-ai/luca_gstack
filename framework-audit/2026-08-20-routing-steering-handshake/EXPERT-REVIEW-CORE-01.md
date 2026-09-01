# EXPERT-REVIEW-CORE-01 — `EXECUTION-PLAN-CORE.md` 架构可行性会审

> 评审对象：`framework-audit/2026-08-20-routing-steering-handshake/EXECUTION-PLAN-CORE.md`（334 行）
> 评审基准：仓库 `HEAD = 4658595`（`git -C /Users/luca/Desktop/项目/muse/lucagstack log --oneline -1`）
> 性质：**只读**架构会审。本 session 未修改任何 runtime 文件、未执行任何 git 写命令。
> 基线实测：`node scripts/test-route-guard.mjs` → **PASS=132 FAIL=0**；
> `node scripts/test-project-scope-guard.mjs` → **PASS=96 FAIL=0**；`node scripts/test-hooks.mjs` HOOK-007 PASS。

---

## 结论速查

| # | 问题 | 结论 |
|---|---|---|
| Q1 | E2 义务落点 | **CORE §8 写错了**。挡 Stop 只能在 `session-sync.mjs`（§8 未列此文件）；拒 scope 归 `project-scope-guard.mjs`；状态必须是三进程共享的独立 sid 文件 |
| Q2 | Stop 通道独占 | 可共存，但**只能单 JSON 复合 reason**，而 `HOOK-007` 的 900 字符硬闸只剩 **37 字符**余量 → 必须同时改 `scripts/test-hooks.mjs`（§8 也未列）。序列化方案会被 `stop_hook_active` 吃掉一次拦截 |
| Q3 | Codex 强制力 | **任务给出的前提已过期**。`f8024a8`（08-28）把 `blockVerb: notCodex` 改成 `blockVerb: true`；`canEmitControlVerb` 现在恒 true。E2 在 Codex 上是**硬的**。但另有两个真实的 Codex 缺口（防循环环 1 缺失、PreToolUse 分发面只覆盖 2 个工具），CORE 未讨论，**是缺陷** |
| Q4 | 与 08-20 四修复相容性 | 路径维度上正交、不削弱。但有两个**接线级**杀手：①义务检查若不放在 `main()` 最顶，对 Codex 的 `apply_patch` 与所有框架豁免路径是死代码 ②义务读取若不自带 try/catch，会把良性错误升级成整条路径隔离的 fail-open 旁路 |
| Q5 | `b438c92` 后的结构变化 | **会撞，而且撞在 E2 的主路径上**。`buildDecision` 的 `mixed_ambiguous` 早返与 `gate` 短路都排在 `skillDecision` 之前；E2 信号若落在 `skillDecision` 里，在「无激活项目」和「框架词共现」两条最常见路径上恒不触发。已实测复现 |
| 总评 | 可实现性 | **当前形态不可实现**，但差距是**接线与清单**，不是架构。改动清单补 2 个文件 + 4 处口径澄清即可实现。另有 1 条**架构级**风险（§4.1 的「同从句」规则会杀掉 E2 自己的复现串），必须在冻结前裁决 |

---

## Q1 — E2 的义务机制应该落在哪个 hook？

### 结论

**CORE §8 的落点是错的。** `project-scope-guard.mjs` 是 PreToolUse，物理上收不到 Stop 事件；
「挡 Stop」只能在 `session-sync.mjs`，而 §8 的改动清单里**根本没有这个文件**。
正确分工是三处而非一处：**route-guard 置信号 → 独立 sid 状态文件 → session-sync 挡 Stop + project-scope-guard 拒 scope**。

### 证据

`.claude/settings.json` 的 hook 注册（原文）：

```
"PreToolUse": [{ "matcher": "^(Write|Edit|MultiEdit|NotebookEdit|Read|Grep|Glob|Bash)$",
                 "command": "node ...
/.claude/hooks/project-scope-guard.mjs ..." }],
"Stop":       [{ "command": "node ...
/.claude/hooks/session-sync.mjs ..." }]
```

`.codex/hooks.json` 同构（`PreToolUse` matcher = `^(Bash|apply_patch)$` → project-scope-guard；
`Stop` → session-sync）。两套 harness 一致：**Stop 通道的唯一占有者是 `session-sync.mjs`**。

`project-scope-guard.mjs:29-33` 的文件头契约也只声明 PreToolUse 的三种输出
（`updatedInput` / `permissionDecision:deny` / 不输出），没有任何 Stop 语义。

状态载体方面，三个消费者是三个独立进程（route-guard 写、project-scope-guard 读、session-sync 读），
不能靠内存传递。仓内已有成熟的 per-sid 文件族与原子 CAS 原语：

- `.claude/hooks/lib/project-substrate.mjs:142-145` `projectStatePath()` → `.claude/.session-project-<sid>`
- 同文件 `:519` `atomicProjectStateCas()` / `:238-245` 写-临时-`renameSync` 原子落盘
- `.gitignore:90-106` 对每个 `.session-*` 前缀**逐条**列举（不是通配 `.session-*`）

### 对 CORE 的具体修改建议

1. **§8 改动清单增加两个文件**（缺一不可）：
   ```
   .claude/hooks/session-sync.mjs      # 义务对 Stop 的拦截（唯一可能的落点）
   scripts/test-hooks.mjs              # HOOK-007 reason 长度闸，见 Q2
   ```
2. **§8 现有条目改写**：`project-scope-guard.mjs # 义务对 scope 的拒绝（PreToolUse 侧），不含 Stop`。
3. **§4.2 增加「状态载体」小节**，钉死三点：
   - 文件名 `.claude/.session-obligation-<sid>`，**不得**以 `.session-project-` 开头 —— `scripts/check-project-links.mjs:59` 的 `/^\.session-project-[\w-]{1,36}$/` 会把它当项目状态解析。
   - 写入必须复用 `project-substrate.mjs` 的 `atomicProjectStateCas` / 临时文件 + `renameSync`，不得裸 `writeFileSync`（三进程并发）。
   - **`.gitignore` 增加 `.claude/.session-obligation-*`**（以及 §5 队列若落盘则同办）。`.gitignore` 当前不在 §8 的「动」也不在「不动」清单里，会变成每 session 脏一次工作树，直接与 `K3 BLOCKED_DIRTY_OVERLAP` 打架。
4. **§7.1 `A-OBLIG` 拆成两条断言**：`A-OBLIG-STOP`（测 `session-sync.mjs`，落 `scripts/test-hooks.mjs`）与 `A-OBLIG-SCOPE`（测 `project-scope-guard.mjs`，落 `scripts/test-project-scope-guard.mjs`）。当前 §8 把 `A-OBLIG` 单独挂在 `test-project-scope-guard.mjs` 下，等于**永远测不到 Stop 那一半**——这正是 `feedback_assertion-never-ran-is-not-assertion-passed` 的第一形态。

---

## Q2 — Stop 通道独占冲突

### 结论

**可以共存，但只有一种可实现形态：单次 `decision:block`、复合 reason、义务段在前。**
序列化（先挡义务、下个 Stop 再挡提取）在 CC 上**做不到**，会被 `stop_hook_active` 吃掉。
而复合 reason 会立刻撞上 `HOOK-007` 的 900 字符硬闸——**当前实测余量只有 37 个字符**。

### 证据

**(a) 通道是独占的。** `session-sync.mjs:10` 文件头契约：

> `· 拦截路径 stdout 只能是「纯 JSON」，不能混任何文本（否则 CC 解析 decision 失败）。`

`session-sync.mjs:198` 只有一处写出：`process.stdout.write(JSON.stringify({ decision: 'block', reason }))`，
紧跟 `:202 process.exit(0)`。两个 block 理由**不可能**是两个 JSON 对象。

**(b) 序列化方案被防循环环 1 否掉。** `session-sync.mjs:190`：

```js
if (!killSwitch && !stopHookActive && ((!alreadyExtracted && substantive) || rearm)) {
```

`stopHookActive` 来自 `:32 payload.stop_hook_active === true`。若义务在 Stop#1 拦截，模型续跑后
再次 Stop 时 CC 置 `stop_hook_active=true` → 该条件为假 → **自成长提取那一次拦截直接不发生**。
它会落到 `:246-278` 的软兜底（写 `pending-extraction-<sid>.md`，下次 session 启动才提醒）。
所以「义务挡住时自成长提取还挡不挡」的诚实答案是：**当轮不挡了，降级为跨 session 软提醒**。
这是可接受的降级（不是丢失），但 CORE 必须写出来，不能默认它还在。

**(c) 复合 reason 撞 900 字符闸。** `scripts/test-hooks.mjs:290-291`：

```js
assert.ok(parsed.reason.length <= 900,
  `reason 必须保持短指针（≤900 字符，实际 ${parsed.reason.length}）——勿回归成全文注入`);
```

实测当前 `buildReason()` 的字面量总长 **≈863 字符**（命令：对 `session_sync.mjs` 的 `buildReason` 体内
>60 字符字面量求和），**余量约 37 字符**。而 CORE §4.2 要求「挡住并**复述原始任务字节**」，
且 `exact_task_text` 是「**完整原始字节**，不截断到三腿从句」——§5.1 给 prompt 的上限是 262,144 B。
**900 字符的 reason 里放不下一个可能 26 万字节的原始任务**。这是硬冲突，不是调参。

### 可实现方案（建议 CORE 采纳）

单 JSON、复合 reason、**义务优先**（任务丢失是 luca 报的故障；自成长提取有软兜底，义务没有）：

```
reason = [义务段: ≤300 字符 —— 状态 + 任务指针 + 解锁条件] +
         [提取段: 现有 buildReason，但仅在无义务时全量注入；有义务时压成一行指针]
```

配套三条：

1. **`exact_task_text` 不进 reason，进状态文件**；reason 里只放 `sha256` 前 12 位 + 首 80 码位摘要 +
   「完整原文见 `.claude/.session-obligation-<sid>`，Read 它」的指针。这与 HOOK-007 的立意
   （`extraction-bar.md:39` “拦截 reason 只放速记与指针，不得回归整段复制”）**同向**，不是破例。
2. **`test-hooks.mjs` 的 900 闸保留**，新增一条 `HOOK-00x：义务+提取复合 reason 仍 ≤900`。
   若确需上调上限，必须在 §8 显式声明并给出新数字，不得实现时静默改测试。
3. **义务拦截必须有自己的防循环环**。CORE §4.2 的 5 个状态里**没有任何一个能表示「已因该义务挡过一次」**。
   `PENDING` 起挡 Stop、直到「有工具调用」才 `SATISFIED`——如果模型被挡后仍只输出文字，
   下一次 Stop 又是 `PENDING`。CC 靠 `stop_hook_active` 兜住第二次，**Codex 侧没有该字段的任何证据**（见 Q3）。
   建议：义务状态增加 `blocked_at_turn` 字段，同一 turn 至多挡一次，跨 turn 重新武装
   ——与 `session-sync.mjs:163-187` 的「增量重拦 / 基线自刷新」同款范式，不是新机器。

---

## Q3 — Codex 下 E2 的强制力

### 结论

**任务给出的前提（「`decision:block` 是 CC 专有动词，Codex 降级 advisory」）已经过期，代码里那行注释是陈迹。**
`f8024a8`（08-28）把能力表改成两家共享，`canEmitControlVerb()` 现在**恒返回 true**。
E2 的 Stop gate 在 Codex 上是**硬的**，不是软的。
**但**：另有两个真实的 Codex 缺口 CORE 完全没讨论，**这是缺陷，不可接受**。

### 证据

**(a) 注释陈旧、行为已变。** `session-sync.mjs:193-194` 仍写着：

```
// harness 门（P0/WS-A0 接线，2026-07-25）：decision:block 是 CC 专有动词，正向确定是 Codex
// 时降级为纯文本 advisory（claude/unknown 照常 block……）
```

但 `git show f8024a8 -- .claude/hooks/lib/harness.mjs` 的关键差分是：

```
-    blockVerb: notCodex,        // Stop hook 的 decision:block（自成长强制捕获）
+    blockVerb: true,            // Stop hook 的 decision:block（两家原生接受）
```

实跑探针（本 session 执行）：

```
claude env: true    codex env : true    unknown   : true
caps codex: {"blockVerb":true,"denyVerb":true,"stopVerbDialect":"shared","inputMutation":true,
             "preToolScope":["Bash","apply_patch"],"workflow":false,"askUserWidget":false}
```

`harness.mjs` 的推翻依据是二进制校验串
（`"Stop hook returned decision:block without a non-empty reason"`、
`"Stop hook requested continuation without a prompt; ignoring the block"`），
且 `.codex/codex-hook-adapter.mjs` 的 `adapt()` 对 `decision:block` **刻意不翻译**（文件头 B3）——
初版译成 `continue:false` 是语义反转，已修。
另有第三重保险：adapter 向子 hook 注入 `childEnv.CLAUDE_PROJECT_DIR = REPO_ROOT`，
所以 `detectHarness()` 在 Codex 下也返回 `claude`，即便能力表回退也走不到降级臂。

**结论：E2 的 Stop 强制在 Codex 上成立。** 但下面两条不成立。

**(b) 缺口 1 —— 防循环环 1 在 Codex 上无证据。**
`stop_hook_active` 在全仓的出现全部指向 Claude Code
（`session-sync.mjs:9,32`；`memory/semantic/promoted-facts.yaml:200` 明写「Claude Code Stop hook …
三重防循环」）。`framework-audit/2026-08-28-codex-harness-benchmark/inventory.md:37`（OAI-018）
只说 Codex 的 `hooks/src/events/stop.rs` 有 fail-open/fail-closed 分级，**没有任何一条证据说它注入
`stop_hook_active`**。结合 Q2(c) 的第 3 点：E2 的义务拦截在 Codex 上**没有任何防循环环**。

**(c) 缺口 2 —— PreToolUse 分发面只有 2 个工具。**
`.codex/hooks.json` 的 matcher 是 `^(Bash|apply_patch)$`；
`harness.mjs` 的 `CODEX_PRE_TOOL_SCOPE = ['Bash', 'apply_patch']` 与 `isPreToolDispatched()` 同源。
Claude 侧是 8 个工具（含 `Read|Grep|Glob`）。后果有两层：

- §5.2 的**惰性认证观察点**在 Codex 上更稀疏：一个纯读的回合在 Codex 下**根本没有 PreToolUse**，
  认证只能等到 Stop。这直接抬高了 §5.3 KILL 条件的风险面。
- §4.2 的「义务拒 scope」在 Codex 上只覆盖 shell 与补丁，读类工具够不到。

### 对 CORE 的具体修改建议

1. **§5 增加一段「harness 能力基线（钉 SHA）」**，写明依据是 `f8024a8` 之后的 `harness.mjs`，
   并把「`session-sync.mjs:193-194` 注释与代码不一致」列为实现阶段必须顺手更正的一行
   （**只改注释、不改行为**，属 Surgical Change 允许范围；不改会让下一个人照着注释重新降级）。
2. **§4.2 增加「防循环」不变量**（Q2 第 3 点的 `blocked_at_turn`），并在 §7.1 加断言
   `A-OBLIG-NOLOOP`：**在不提供 `stop_hook_active` 的 payload 下**，同一 turn 的第二次 Stop 不得再挡。
   这条断言必须以「payload 里没有 `stop_hook_active`」为夹具，否则它在 CC 夹具下恒绿。
3. **§5.3 KILL 条件加一句**：Codex 侧的观察点必须**分别**在
   ①首个 `Bash`/`apply_patch` PreToolUse 与 ②纯读回合的 Stop 两种情形下各验一次。
   只验其一 = 只验了 Claude 那一半的等价物。

---

## Q4 — 与 08-20 四个红队修复的相容性

### 结论

**在「路径分类」这一维上正交，不削弱、不绕过那四个修复。**
但接线上有两个真实杀手，都不在 CORE 的视野里：**放错位置 = 死代码；不包 try/catch = 把 fail-open 面扩大到整条路径隔离。**

### 证据

**(a) 四个修复都在 `classifyPath` / 命令文本展开这一层，与「任务义务」不共享判据。**

| 提交 | 修的是 | 触及函数 |
|---|---|---|
| `ee812b7` | 框架豁免补进 `classifyPath`（嵌套检出绝对路径被误拒） | `classifyPath` |
| `7b05466` | `..` 穿越洞（豁免必须判归一化路径） | `classifyPath` + `resolve()` |
| `bc08674` | 软链绕过（豁免改判**真实目标**） | 新增 `realTargetOf()` `:153-168`，`classifyPath:203-213` |
| `8ae3d91` | 变量拼接绕过字面匹配 | 新增 `localAssignments()` `:465-475`，`variableProjectReference:477-501` |

义务维度不读路径、不改 `classifyPath` 的返回、不改 `binding`。加一条**独立的 deny 出口**不会让上述任何
一条判据变松。**前提是它是「多一个 deny」而不是「把某个 deny 换成 allow」**——CORE §4.2 的措辞
（「不给 capability」）方向是对的，建议在 §7.2 变异体里加一条固化：
**11. 让义务状态成为任何路径类 deny 的豁免条件（即义务满足 ⇒ 放行某条本该 deny 的路径）。**

**(b) 杀手 1 —— 位置错 = 死代码，且恰好死在 Codex 的主编辑通道上。**
`main()` `:669-767` 有 **5 处提前 `passThrough()`**：

```
:683  apply_patch 已处理且未改动 → passThrough()      ← Codex 的全部文件编辑走这里
:741  Bash 分支收尾            → passThrough()
:754  无 path 字段             → passThrough()
:757  classifyPath 判 !scoped   → passThrough()        ← 全部框架豁免路径走这里
```

义务检查若插在 `:687`（framework 保护）之后或 Bash 分支之内，则：
**Codex 的 `apply_patch`、以及所有被 `ee812b7`~`bc08674` 判为「框架作用域」的调用，义务拒绝恒不触发。**
`inspectApplyPatch` `:639-667` 与 `maskSearchPatternArguments` `:311-393` 本身**不受影响**
（它们只处理 patch header 与检索模式参数，不读义务状态），但它们的**早退出**会遮蔽义务检查。

**正确位置：`main()` 第一行，在 `readSessionState()` 之后、`inspectApplyPatch` 之前。**

**(c) 杀手 2 —— 共享的 fail-open 外壳。**
`:769-773`：

```js
try { main(); } catch (e) {
  try { process.stderr.write(`[project-scope-guard] fail-open: ${e && e.message}\n`); } catch { }
  passThrough();
}
```

对比 `readSessionState()` `:86-93`：它**自己**捕获异常并返回 `{state:'INVALID'}`（fail-**closed**，
下游按无 binding 处理）。若新增的义务读取沿用裸 `readFileSync` 而不自带 try/catch，
一个损坏的义务文件会把异常抛到 `:770`，**整个 hook fail-open** ——
路径隔离、`framework/` 保护、`..` 穿越拦截**同时消失**。
这与 `feedback_fallback-must-not-touch-what-broke` 是同一族缺陷：一个良性故障穿透成全线放行。
更隐蔽的是它在隔离环境里不报错，只给出「错误的正确形状」（`feedback_broken-rig-diagnosis-is-not-root-cause`）。

### 对 CORE 的具体修改建议

1. **§8 的 `project-scope-guard.mjs` 条目补上位置约束**：
   「义务检查必须是 `main()` 的第一个决策点（`readSessionState()` 之后、`inspectApplyPatch` 之前）；
   义务读取自带 try/catch，失败按**无义务**处理（fail-open 到义务维度，**绝不**冒泡到 `:770` 的全局 fail-open）。」
2. **§7.1 `A-OBLIG-SCOPE` 必须含一条 Codex 形状用例**：`tool_name='Bash'` + `tool_input.command` 为
   `*** Begin Patch …` 的 apply_patch 载荷，义务生效时应被拒。缺这条，杀手 1 测不出来。
3. **§7.2 变异体增加两条**：
   - **12.** 把义务检查挪到 `frameworkWriteDeny` 之后 —— `apply_patch` 与框架豁免用例必须转红。
   - **13.** 让义务读取的异常冒泡到 `:770` —— 路径隔离的既有保护面断言必须转红。

---

## Q5 — `b438c92` 之后 route-guard 的结构变化对 E1/E2 实现的影响

### 结论

**会撞，而且撞在 E2 的两条最常见路径上（无激活项目 / 框架词共现），已实测复现。**
根因不是 `FRAMEWORK_FLOW` 分支本身，而是 `buildDecision` 的**求值顺序**：
`mixed_ambiguous` 早返与 `gate` 短路都排在 `skillDecision` 之前。
CORE §3/§4 从头到尾没说 `RESOLVE` 与信号在 `buildDecision` 的**哪一步**求值 —— 这个空白会直接产出一个假绿实现。

### 证据（全部为本 session 的 dry-run 实跑输出）

**(1) E2 信号若落在 `skillDecision` 里，在无激活项目时恒不触发。**

```
$ echo '{"prompt":"帮我优化下设置页面，功能堆砌太严重了很难找","session_id":"probe"}' \
  | ROUTE_GUARD_DRY_RUN=1 ROUTE_GUARD_PROJECTS="muse,crm,luca-dev" \
    ROUTE_GUARD_CURRENT_PROJECT="" node .claude/hooks/route-guard.mjs

{'decision': 'PROJECT_STOP', 'projectAction': 'choose_new_or_existing', 'complexityScore': 0, 'signals': []}
```

`route-guard.mjs:757-764`：`if (gate) { return {...gate, complexityScore, signals, planHint} }`
—— gate 命中即返回，`skillDecision`（`:772`）**根本不执行**。
注意 `complexity` 是**特意**在 `:751` 于 gate 之前求值、再穿过 gate 携带的
（`:753-756` 的注释明写这个理由）。**E2 信号必须复制这个模式，CORE 没写。**

有激活项目时才复现 CORE §1 描述的原始故障：

```
ROUTE_GUARD_CURRENT_PROJECT="muse" → {'decision': 'STOP', 'reason': 'no_keyword_match',
                                      'complexityScore': 0, 'signals': []}
```

**(2) E2 的「界面腿」词表与 `DOWNSTREAM_SCOPE_RULES` 字面重叠 → `mixed_ambiguous` 更早返回。**
`route-guard.mjs:210`：

```js
{ id: 'product', pattern: /产品|业务|页面|功能|需求|客户|订单|原型|用户|接口|数据库|应用|网站|代码库|仓库|模块|\bcrm\b/i },
```

CORE §4.1 的界面腿含 `页面`，结构腿含 `功能堆砌`——两者都落在上面这条正则里。
于是任何同时含框架信号的界面结构请求会走 `:737-748` 的 `mixed_ambiguous` 早返：

```
$ prompt="new project: 涉及项目的route-guard"
{'decision': 'NEEDS_CONTEXT', 'projectAction': 'clarify_framework_or_project_scope'}
```

该分支**排在 `projectGate` 与 `skillDecision` 双双之前**，是 `buildDecision` 的第一个出口。

**(3) `A-SCOPE-NULL` 的基线红确认成立（CORE §6.1 描述准确）。** 实测四组最小对：

```
new project: 涉及项目的route-guard     → NEEDS_CONTEXT
new project: 不涉及项目的route-guard   → PROJECT_SWITCH / create_new_project / project='不涉及项目的route-guard'
new project: 属于项目的route-guard     → NEEDS_CONTEXT
new project: 不属于项目的route-guard   → PROJECT_SWITCH / create_new_project / project='不属于项目的route-guard'
```

否定臂真的会走到 `explicitNewProjectName`（`:248-267`）→ `:340-347` 返回 `create_new_project`。
`REQ-SCOPE-NULL-FIRST` 是真缺陷，不是纸面推演。**这一条 CORE 是对的。**

**(4) `A-GATE-SUPPRESS` 的「现可测」半边成立。**

```
route-guard 在 luca app 工程里怎么走   cur=''     → STOP / no_keyword_match
route-guard 在 luca app 工程里怎么走   cur='muse' → STOP / no_keyword_match
route-guard 在 muse 里怎么走           cur=''     → PROJECT_SWITCH / switch_existing_project (muse)   ← 反向控制成立
```

§7.1 推导出的三条约束（不含 canonical 目录名 / 带 marker / marker 必须是 `工程`）经实测**全部成立**。

**(5) `FRAMEWORK_FLOW` 与 `scope: framework_meta` 的两处真实接口。**

- `:634-635` `skillDecision` 的路由过滤：
  `.filter(route => route.scope !== 'framework_meta' || routingScope.kind === 'pure_framework_meta')`
  —— 若 E1 的别名让 `classifyRoutingScope` 认出 `namedProject`，`kind` 会从 `pure_framework_meta`
  翻成 `named_downstream`（`:283-285`），**同时**打开 framework_meta 路由过滤 **并**触发切项目
  （`:353-360`）。这正是 §7.2 变异体 1「让 alias_resolution 产生授权效力」的具体形态，
  但 CORE 只在**断言**层说了，没在**实现约束**层说。
- `:834-843` `FRAMEWORK_FLOW` 是 `decisionToHints` 的一个新 case，**不含** `reviewAxisHint`、
  不含 `planHint` 携带。`decisionToHints` 是 per-decision 的 switch：
  E1 的 `RESOLVE` 与 E2 的信号若在这里逐分支追加，会在
  `FRAMEWORK_FLOW` / `NEEDS_CONTEXT` / `PLAN_MODE` / `PLAN_CHECK` 四个分支上**静默缺席**。

### 对 CORE 的具体修改建议（§3/§4 必须补的四条）

1. **§3.2 增加求值位置**：`RESOLVE` 在 `buildDecision` 开头、`classifyRoutingScope` **之前**求值，
   结果**只随 decision 对象携带**，`classifyRoutingScope` / `projectGate` / `skillDecision`
   **三者的输入均不得包含 alias_resolution**。（这句是变异体 1 的实现侧对偶，必须写在实现指令里，
   不能只写在断言里 —— `feedback_coherent-at-my-layer-is-not-execution-truth`。）
2. **§4.1 增加求值位置**：`semanticRouteAxis` 与 `complexity` **同一位置**求值
   （`route-guard.mjs:751` 附近），并**穿过 `mixed_ambiguous` 早返与 `gate` 短路**携带
   —— 即 `:737-748` 与 `:757-764` 两个 return 都要带上它。
   否则 E2 在「无激活项目」与「框架词共现」两条路径上恒不生效（证据 1、2）。
3. **§4.1 明确「不改 routingScope」**：现文只说「不计分、不派 scene/skill/flow、不改 Plan Agent 五条件」，
   必须补 **「不改 `routingScope.kind`、不改 `scope: framework_meta` 的路由过滤、不改 `FRAMEWORK_FLOW` 判定」**。
4. **§7.1 增加输出通道断言**：`RESOLVE` 与信号必须在 `route-guard.mjs:1074` 那一层
   （`hints.push(...decisionToHints(decision))` **之后**、与 decision 类型无关）注入，
   并逐一断言在 `STOP / PROJECT_STOP / PROJECT_SWITCH / NEEDS_CONTEXT / PLAN_MODE / PLAN_CHECK /
   SINGLE_SKILL / MULTI_SKILL / FRAMEWORK_FLOW` **九种** decision 下都出现。
   当前 §7.1 只在 `A-GATE-SUPPRESS` 里测了 `STOP` 一种。

---

## 计划之外的重大风险（单列）

### R-A（架构级，冻结前必须裁决）：§4.1 的「三腿同从句」会杀掉 E2 自己的复现串

CORE §4.1 规定「三腿不得跨从句拼凑」。把这条规则套到 E2 自己的故障描述上：

| 输入 | 变更腿 | 界面腿 | 结构腿 | 同从句？ | 是否产信号 |
|---|---|---|---|---|---|
| `帮我优化下设置页面，功能堆砌太严重了很难找` | 优化(句1) | 设置/页面(句1) | 功能堆砌/难找(**句2**) | ❌ | **否** |
| `帮我优化下设置页面，别动结构，其他随便你改`（§4.3 列为必产信号） | 优化(句1) | 设置页面(句1) | 结构(**句2**) | ❌ | **否** |
| `结构别改`（§4.3 列为必产信号） | — | — | 结构 | — | **否**（只有 1 腿） |
| `没改结构，只动了配色`（§4.3 列为必产信号） | —（`改` 不在词表） | —（`配色` 不在词表） | 结构 | — | **否** |
| `重构一下侧栏导航的信息架构，层级太深了` | 重构 | 侧栏/导航 | 信息架构 | ✅ | 是 |

也就是说：**§4.3 的「每条都产出信号」对其中至少 3 条为假**，而 §4.3 的待裁项只提到「后 5 条存疑」、
且只怀疑腿数、**没意识到跨从句这条规则本身**才是主要杀手。
更严重的是第一行 —— 那是 E2 故障最自然的复现措辞，也正是本评审用来实测复现 `STOP score=0` 的那一串。
若按 §4.3 的默认裁决 (a)「把不满足的移出 fixture 集」，**E2 修完之后，E2 自己的复现串仍然不产信号**。

**并且**，「从句」对未分词中文**没有定义**——这与 §3.3 判定「确定性 hook 判不了中文否定」时
使用的完全是同一条论据（「token 对未分词中文无定义，两个合规实现可以对同一输入得出不同结果」）。
CORE 在授权轴上接受了这条论据并据此删掉整套机制，却在信号轴上**原样重新引入了它**。这是内部不一致。

**建议**（三选一，必须由 luca 裁）：
- **(A) 删掉「同从句」约束**，只保留「三腿互不重叠」+ 「原样记录 `negation_context`（整条 prompt 而非从句）」。
  信号本就**不计分不派 skill**，误报代价是「LLM 多读一句话」，与授权轴的「切错项目、回合内不可逆」
  完全不同量级 —— §6 的轴分表本身就支持这个不对称。**推荐此项。**
- (B) 保留约束，但把「从句」定义为**确定性可实现的形态**（如「相邻两个 `，。；！？\n` 之间」），
  并把 §4.3 fixture 按该定义逐条实测重写。代价：仍会杀掉上表前两行。
- (C) 保留约束，接受 E2 只覆盖单从句表述。**必须在 §1 的 E2 行里显式写明覆盖面缩小**，
  否则交付时会出现「三条回归用例全绿、原始故障照旧」。

### R-B（交付预期）：E1 修完之后，`进入 luca app 项目` 仍然切不了项目

§3.2 规定 `RESOLVE` **永不授权**——不发命令、不建事务。但切项目的**唯一合法通道**要求
route-guard 本轮产出带 `--tx` / `--expected-epoch` 的完整事务命令
（`route-guard.mjs:1022-1038` 只在 `decision.decision === 'PROJECT_SWITCH'` 时调 `prepareProjectSwitch`），
而 `project-scope-guard.mjs:706-708` 会拒绝任何非 `SWITCH_ONLY` 状态下的 `project.sh switch/new`：

```js
} else if (mentionsProjectMutation(cmd)) {
  return out({ ... permissionDecisionReason:
    `当前项目状态 ${state.state} 不允许直接 switch/new；必须由显式切换 prompt 创建 SWITCH_ONLY 事务。` } });
```

实测：`进入 luca app 项目` 在 `cur=''` 下是 `PROJECT_STOP/choose_new_or_existing`，
在 `cur='muse'` 下是 `STOP`——两种都**没有** tx。

所以 E1 的真实交付是：**模型不再「无据可依、反复追问」，但仍需要多一个回合**
（模型据 `alias_resolution` 回一句「luca app = muse 项目，切过去？」→ 用户确认 → 下一轮
route-guard 见到 canonical 名才产出 `PROJECT_SWITCH` + tx）。

这本身是**正确**的设计（把授权留给 LLM 层符合 §2 的统一修复方向），但 CORE 没写出来。
不写的后果是可预见的：实现者看到「修完还是切不了」，最省事的「修复」就是把 alias 接进
`classifyRoutingScope` 的 `namedProject` 或 `:1009` 的 `named` —— **那恰好就是 §7.2 变异体 1/2**。
**建议**：§3 增加「E1 的验收形态是两回合」，并把 E1 的回归用例期望值写成
「产出一条 `muse` 候选 **且** `projectAction` 为空 / `tx` 不存在」，把这条封死。

### R-C（流程级）：K2/K3 的基线已经移动，且 §8 清单与工作树现状需重钉

- CORE 写作时的参照点是 `b438c92`，**当前 `HEAD = 4658595`**，其间 4 个提交触及 §8 清单文件：
  `3d94271`、`e399f45`、`b2762c7`、`60dd0ce`（命令：
  `git log --oneline b438c92..HEAD -- <§8 五个文件>`）。按 `K2` 的字面，这些都不是「纯 audit 提交」，
  **上一轮评审若基于 `b438c92` 应已作废**。本评审已按 `4658595` 重钉基线。
- **`K3` 当前通过**：`git status --porcelain -- <§8 五个文件>` 输出为空。
  但工作树有 `memory/evals/routing/fixtures.jsonl` 与 `.claude/observability/{observations.jsonl,rules.yaml}`
  未提交改动，而 §8 的「不动」清单点名了 `observability`、`memory` —— 建议 §8 的「不动」
  改为「不**新增/修改**」并说明这些是运行时自动追加文件，不构成 `BLOCKED_DIRTY_OVERLAP`，
  否则实现开始时会被自己的闸卡住。

---

## 总评：CORE 计划在当前 runtime 上是否可实现

**当前形态：不可实现。** 三处是硬阻断，不是风格问题：

1. **§8 的改动清单里没有 `session-sync.mjs`** —— E2 的「挡 Stop」在被授权改动的文件里**无处安放**（Q1）。
2. **`HOOK-007` 的 900 字符闸只剩 37 字符余量，而 §4.2 要求 reason 复述完整原始任务字节** ——
   §9 的「任何既有用例转红即停」会在第一次实现时就把自己停掉（Q2）。
3. **§3/§4 没有规定求值位置**，而 `buildDecision` 的两处早返排在 `skillDecision` 之前 ——
   照 §4 字面实现出来的 E2，在「无激活项目」路径上恒不生效，且**测试可以全绿**（Q5，已实测复现）。

**最小改动（不改架构，只补接线与口径）：**

| # | 改哪 | 改什么 |
|---|---|---|
| 1 | §8 | 增加 `.claude/hooks/session-sync.mjs`、`scripts/test-hooks.mjs`、`.gitignore` 三项；现有 `project-scope-guard.mjs` 条目改注「仅 scope，不含 Stop」 |
| 2 | §4.2 | reason 只放指针 + sha256 前 12 位 + 首 80 码位；`exact_task_text` 落状态文件；状态文件名不得以 `.session-project-` 开头；写入走 `project-substrate` 原子 CAS |
| 3 | §4.2 | 增加 `blocked_at_turn` 防循环不变量（不依赖 `stop_hook_active`），并声明「义务挡住时自成长提取当轮降级为 pending 软兜底」 |
| 4 | §3.2 / §4.1 | 各加一句求值位置：与 `complexityDecision` 同点求值、穿过 `mixed_ambiguous` 与 `gate` 两个早返携带；三个下游函数的输入不含 alias_resolution |
| 5 | §4.1 | 补「不改 `routingScope.kind` / 不改 `scope: framework_meta` 过滤 / 不改 `FRAMEWORK_FLOW` 判定」 |
| 6 | §8 `project-scope-guard.mjs` | 补位置约束（`main()` 首个决策点）+ 义务读取自带 try/catch |
| 7 | §7.1 | `A-OBLIG` 拆成 `-STOP` / `-SCOPE` 两条并各指定测试文件；`A-SCOPE`/`A-SIGNAL` 各补一条 Codex `apply_patch` 形状与九种 decision 的输出通道断言 |
| 8 | §7.2 | 增加变异体 11（义务成为路径 deny 的豁免）、12（义务检查挪到 framework 保护之后）、13（义务读取异常冒泡到全局 fail-open） |
| 9 | §5 | 钉 `f8024a8` 后的 harness 能力基线；顺手更正 `session-sync.mjs:193-194` 的陈旧注释（只改注释） |
| 10 | §10 | 按 `HEAD=4658595` 重钉 `K2` 基线；`K3` 的「不动」口径澄清运行时自动追加文件 |
| 11 | §4.1 / §4.3 | **裁决 R-A**（建议取 (A)：删「同从句」约束），并按裁决结果逐条重写 §4.3 fixture 的期望值 |
| 12 | §3 | 写明 R-B：E1 的验收形态是两回合；回归用例期望值含「无 `projectAction` / 无 `tx`」 |

补完 1–12 之后，**架构本身成立**：三个故障的修复方向（判定挪到拿得到证据的那一层）与当前 runtime
不冲突，`REQ-SCOPE-NULL-FIRST` 是经实测确认的真缺陷，六轮否定词证伪链的结论（授权轴不做机械否定）
经得住检验。唯一仍属**架构级**未决的是 R-A —— 它决定 E2 到底覆盖多少真实输入，
必须在冻结 SHA **之前**裁决，而不是留给实现阶段。

---

## 本评审的自身局限（诚实声明）

- **未实跑 Codex**。Q3 关于 `blockVerb` 的结论来自 `harness.mjs` 源码 + `f8024a8` 差分 + 探针实跑；
  关于 Codex 是否注入 `stop_hook_active` 的结论是**全仓无证据**，不等于**确定不注入**。
  实现前应做一次最小探针（Codex 下让 session-sync 拦一次、看第二次 Stop 的 payload），
  这属于 `verify-runtime-not-spec`：`hooks/src/events/stop.rs` 的存在不保证字段存在。
- **未跑变异测试**。本评审对既有测试的判断（如 `A-OBLIG` 挂错文件会恒绿）是**位置推理**，
  不是变异实证。CORE §7.2 的逐条变异仍须在实现阶段真跑。
- **§5（E3 惰性认证）只做了接口面审查**，未逐条核对 §5.1 的载荷校验限额与 §5.2 的
  Codex `msg_*` 相邻对匹配规则against 真实 rollout 文件。§5.3 的 KILL 条件本身是正确的护栏，
  但它的成立与否本评审**没有验证**，仍是 CORE 的最大单点未知。

<!-- FILE_END: EXPERT-REVIEW-CORE-01.md -->
