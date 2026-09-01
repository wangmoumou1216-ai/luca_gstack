# luca routing / steering 修复 — 核心执行计划

> 状态：`PROPOSED_ONLY`。未经 luca 对**确切 SHA** 的点名批准，不做任何 git 写操作、不改任何 runtime 文件。
>
> 本文替代 `FINAL-EXECUTION-PLAN.md` 作为**执行依据**。原稿 5890 行保留在同目录，作为附录与后续选题，
> 不删除、不作为实现输入。拆分依据：原稿中约 3000 行（§5.3 plan-execution 状态机、§8 完整转移矩阵、
> §9–§11 bridge/activation/rollback）与下述三个故障无关，是 31 轮未收敛的主因。

---

## 1. 三个真实故障（不扩张，不合并）

| ID | 现象 | 根因 |
|---|---|---|
| **E1** | `进入 luca app 项目` 没被解析成 canonical `muse`，模型无据可依、反复追问 | 框架内没有任何"产品名 → 目录名"的真值；guard 只认真实目录名 |
| **E2** | 设置页交互结构请求 route score = 0 → `STOP`，被当成"不需要 skill/flow"，反复停下 | 只有模型侧的软提醒，没有任何**durable** 的东西承接这个任务，一旦跑偏就丢 |
| **E3** | Codex 连续多条真实用户消息共用一个 `turn_id`，anti-replay 把第二条起全拒 | `UserPromptSubmit` 拿不到 Codex 的**持久消息 ID**，却在这一层就做了身份判定——判在了错的边界上 |

E3 的原始证据（rollout 60/63 行）：两条不同的 `msg_01a01e8d-4cfe-…` / `msg_01a01e8d-4d7a-…`
挂在同一个 parent `01a01e8c-c476-…`；旧 hook 把 parent 当事件身份消费了两次，于是两条都拒。

**三条共同的教训**：判定被放在了拿不到证据的那一层（E1 没有真值、E2 没有载体、E3 没有 ID）。
修复方向统一为：**在拿得到证据的那一层再判定，拿不到的那一层只记录、不裁决。**

---

## 2. 修复架构（一句话版）

- **E1** → hook 只做 `RESOLVE`：扫描 prompt，记录"哪些产品名出现在哪里"，**不授权、不拒绝**。
  切不切项目由 LLM 层按语义路由契约决定。
- **E2** → 三段证据命中即置 `semanticRouteAxis`，**不计分、不派 skill**；只有 LLM 层确认是肯定式请求后，
  才升级成一条**每轮可见**的任务义务（不拦截 Stop，见 §4.2a）。
- **E3** → `UserPromptSubmit` 降级为 **revoke-and-queue**：只入队、不判身份；到第一个 PreToolUse/Stop
  时再用**持久记录**做惰性认证（那时 Codex 的 `msg_*` 已经落盘）。

三者都不引入新的状态机、不引入 plan 执行/转移/回滚机制。

---

## 3. E1 — 项目别名契约

### 3.1 真值来源

别名真值放在**下游项目自己**的 `<PROJECTS_ROOT>/<canonical>/.luca/project.json`：

```json
{"schema_version":1,"canonical_project":"muse","aliases":["luca app"]}
```

**框架内不出现任何 `luca app → muse` 字面量。** 缺该文件 = 只有 canonical 名可用，合法且不报错。

限额（越界即 `INCOMPLETE`，此时非 canonical 名不解析、canonical 名照常可用）：
根目录条目 512 / 有效项目 256 / 单 manifest 8,192 B / 总计 262,144 B / 每项目 16 别名 / 全局 2,048 别名 /
单别名 2–80 码位且 ≤256 UTF-8 B。规范化：NFKC → 小写 → 空白折叠 → trim。
拒绝：空串、Cc/Cf（含双向与零宽）、斜杠反斜杠、重复键、未知键、非字符串成员、规范化后重名、
别名等于某 canonical ID、一名多主。保留词（别名不得取这些）：
`app, application, project, product, system, software, 项目, 工程, 应用, 产品, 系统, 软件, 页面, 界面, 功能`。

读取要求：`.luca` 与 manifest 均非符号链接、canonical 包含性检查、`O_NOFOLLOW`、regular-file fstat、
limit+1 读取、重复键感知解析、dev/ino/size 复核。

### 3.2 `RESOLVE` — hook 唯一的别名操作

扫描**原始 prompt 字节**，对每个出现的 canonical 目录名或已注册别名，记录一条候选：

```text
alias_resolution = { schema_version:1, candidates:[ {surface, canonical, span_start, span_end, marker_present} ] }
```

- 去重，**最多 8 条**；第 9 条触发 cap 拒绝 fixture。
- `项目|工程` 相邻与否只**记录**为 `marker_present`，**绝不**决定一条候选成不成立。
- 零候选 → 该对象缺席。多个不同 canonical 目标 → 全部记录，**不选**。
- 引号、反引号、否定、疑问、转述、从句结构 **一律不看**。

**`RESOLVE` 永不授权**：不发命令、不改绑定、不建事务、不给 capability。

**求值顺序（终审实测更正，不写必成死代码）**：`buildDecision` 里有**三个**排在
`skillDecision`（`:772`）之前的早返，`RESOLVE` 与 §4 信号必须穿过**全部三个**：

| 早返 | 触发 | 形态 |
|---|---|---|
| `:737` `mixed_ambiguous` | 框架词与下游词共现 | 对象字面量，可 spread |
| `:757` `gate` 短路 | Project Gate 命中 | 对象字面量，可 spread |
| `:770` `return complexity` | 复杂度 ≥6 且非直呼 → `PLAN_MODE` | **裸 return，没有可 spread 的对象** |

第三个是终审新发现且最危险：实测
`重构设置页面的信息架构，新增权限、通知、导出三个分组，层级太深很难找`（三腿齐全）→ `PLAN_MODE`，
信号被**静默丢弃**。也就是说 E2 恰好在**复杂多阶段请求**上仍然失效——而那正是最需要它的场合。
`complexity` 对象必须先被扩展成可携带信号的形状，三处 return 一起带出。
另：E2 界面腿的 `页面|功能` 与 `DOWNSTREAM_SCOPE_RULES` 的 product 正则**字面重叠**，
框架词共现即 `NEEDS_CONTEXT` 早返——这也是必须携带而非在 `skillDecision` 内计算的原因。

**两回合交付（会审 R-B）**：E1 修完后，`进入 luca app 项目` 仍**不会**在同一回合切项目——
`RESOLVE` 永不授权，事务只在 `PROJECT_SWITCH` 决策时生成，且 project-scope-guard `:706`
拒绝非 `SWITCH_ONLY` 的 switch。真实交付是：本回合给出候选证据 → 下一回合由 LLM 层决定并切。
这是设计意图不是缺陷；**必须写明**，否则实现者最省事的"修复"恰好就是变异体 1 或 2。

### 3.3 为什么不做否定判断（六轮红队的结论，不要重开）

R18–R26 每一轮都有一个新否定词击穿"完整词表"：`别` → 裸 `不` → `没/没有` → `莫` + 邻接间隙 →
过度拒绝洞 → `不想/更别说/免得`。外加"token"对未分词中文无定义，两个合规实现可以对同一输入得出不同结果。

结论不是"再补一个词"，而是：**确定性 hook 判不了中文否定；语义判定属于 LLM 层，hook 只能做粗产品名网。**
因此 `NEG`、`ADV`、`NEG_SUSPECT`、豁免复合词、邻接窗口、引号抑制臂**全部不存在**；
在**授权轴**上重新引入任何一个，都是命名变异体（§7）。

冻结 fixture（每条产出**恰好一条** `muse` 候选，且无项目变更、无命令、无 capability）：

```text
进入luca app项目 / 进入「luca app」项目 / 进入 luca app 项目页面看看 / 切到 luca app 项目功能
打开 luca app（marker_present:false） / 继续 luca app 的登录流程（marker_present:false）
不进入… / 别切到… / 不想进入… / 更别说进入… / 免得又要进入… / 难道现在要进入… /
无论如何都要进入… / 不妨进入… / 进不进入 luca app 项目
```

`从 luca app 切换到 crm 项目` → 两条候选都记录、**都不选**（"哪个是目标"是语义判断）。
`进入 luca ap 项目`（注册表完整）→ `alias_not_found`，命令为空。

---

## 4. E2 — 非计分信号与最小义务

### 4.1 信号

prompt 中出现三段**互不重叠**的证据时，置 `semanticRouteAxis=interface_structure_change`：

1. **变更**：`优化/重组/重构/改版/重新设计/拆分/归组/调整` 或 optimize/reorganize/redesign/restructure/refactor/split/regroup
2. **界面**：`页面/界面/设置/偏好设置/交互/布局/侧栏/导航` 或 page/screen/settings/preferences/UI/interface/interaction/layout/sidebar/navigation
3. **结构**：`功能堆砌/层级/信息架构/分组/拥挤/很难找/难找/找不到/结构` 或 feature pile-up/hierarchy/information architecture/grouping/crowded/hard to find

一段证据不能兼任两腿。**三腿不要求同从句**——这是 2026-08-30 会审推翻的原设计：

- 原写「三腿须在同一从句」，实测会杀掉 E2 自己的复现串：
  `帮我优化下设置页面，功能堆砌太严重了很难找` 的结构腿落在第二个从句 → **不产信号**。
  一条把自己要修的 bug 判为阴性的规则，不能作为该 bug 的修复。
- 更根本：**「从句」对未分词中文没有定义**。§3.3 正是用这条论据删掉整套否定判定的
  （"token 对未分词中文无定义，两个合规实现可以对同一输入得出不同结果"）。
  在授权轴否掉、在信号轴引回，是同一份文档里的自相矛盾。
- 代价可承受：信号**不计分、不派 skill/flow**，误报的唯一后果是 LLM 多读一句原文；
  漏报的后果才是 E2 复发。两边不对称，取宽。

因此：三腿在整个 prompt 内命中即可，`negation_context` 记录**整条 prompt 的原始字节**
（而非某个从句），让 LLM 层自己读。

该信号**不计分、不派 scene/skill/flow、不改 Plan Agent 五条件**。此处**同样不做**否定判定。

### 4.2 最小义务（任务载体，**不拦截**）

```text
SIGNAL_UNCONFIRMED → PENDING → DEFERRED_BY_PROJECT_CHANGE → SATISFIED
                                                          ↘ CANCELLED / SUPERSEDED
```

- **`SIGNAL_UNCONFIRMED`**（惰性）：光有信号只落这个状态，**不注入、不给 capability**。
- 升 `PENDING` 的**唯一**途径：下一个经认证的人类事件带着**肯定式任务指令**。任何其它事件直接删除它。
- **`PENDING` 起每轮注入**（见 §4.2a）。**任何状态都不拦截任何东西**（不拦 Stop、不拒 scope）。
- **终态的生产者（终审 BLOCKER-1 补，必须有，否则义务进得去出不来）**。删掉 Stop 拦截同时
  删掉了原本唯一"任务做完了"的观测点，三个终态会没有驱动源，注入就变成永久唠叨。故明确：
  | 终态 | 由什么事件产生 |
  |---|---|
  | `SATISFIED` | 观测到该义务对应的 skill/flow 被 dispatch（`skillDecision` 命中且非 `NONE`），或用户事件含完成语义 |
  | `SUPERSEDED` | 下一个经认证的人类事件带来**新的**肯定式任务指令 |
  | `CANCELLED` | 用户事件含取消语义，或项目被 deactivate |
  **外加硬封顶**：同一义务累计注入 **20 轮**后自动转 `CANCELLED` 并停止注入
  （对齐 route-guard checkpoint 提醒的 100 轮封顶惯例——**无界提醒本身就是缺陷**）。
  封顶计数与 `PENDING` 同存于状态文件。
- 项目切换时转 `DEFERRED_BY_PROJECT_CHANGE`，**保留原始任务字节**，事务提交后恢复。
- 存 `exact_task_text` / `exact_task_sha256`：**完整原始字节**，不截断、不丢任何 UX 约束。
  存在**独立的 sid 状态文件**里；文件名**不得**以 `.session-project-` 开头
  （`scripts/check-project-links.mjs:59` 会把它当项目 pin 误解析）。
- **≤40 字摘要的生成方式（终审 MAJOR 补，原先完全未定义）**：从 `exact_task_text` **渲染时派生、
  不落盘**（避免第二份可能与原文不一致的副本）。步骤固定：NFC 规范化 → 把控制字符与换行折叠为单空格
  → 按**码位**取前 40（不是字节，避免切出半个多字节字符）→ 截断时补 `…`。
  实测切半字符不会崩（Claude 侧 `stdout.write` 转 U+FFFD，Codex 侧 `JSON.stringify` 输出合法转义），
  但那是显示劣化，仍按上述规则避免。

### 4.2a 每轮注入，而不是 Stop 拦截（2026-08-31 luca 裁决，取代原「挡 Stop」设计）

**裁决**：E2 **不挡 Stop**。义务是**任务载体**，不是拦截器。

**依据（§0.1 逐字诉求链）**：luca 的原话是 `这个你还需要问我？` 与 `继续啊，你总停干什么`——
痛点是**停太多、不认路**（第 6 条 `我这个项目不需要触发什么skill吗？不需要走什么flow吗？`），
**不是任务丢了**（他在原话里反复重述同一需求，说明任务没丢、是 agent 没干）。
原稿 §0.1 那句 "blocks mutation and **Stop**" 是前任 session 的**推导**，不是用户要求；
推导链「任务不能被静默丢弃 → durable obligation → block Stop」的第三步没有依据。
2026-08-30 `72bd1f2 fix(hooks): stop interrupting ongoing conversations` 把自成长提取的 Stop 强制
降级为 `SESSION_SYNC_FORCE_ON_STOP=1` 兼容开关，理由是「Stop 是回合边界不是 SessionEnd，
默认强制续跑会把正常中间对话变成额外回合」——同一立场。

**为什么替代方案更强，而不只是更轻**：Stop 拦截只在「模型想结束时」生效，是最晚的一道；
而 `UserPromptSubmit` **每轮都跑**。故：

> `PENDING` 义务存在时，`route-guard` 每轮注入一行
> `[route-guard] 📌 当前有未完成任务：<≤40 字摘要>（完整字节见 <状态文件路径>）`

**零打断，但全程可见**——覆盖面比拦截更大、更早，正对「不认路」这个根因。
拦截是「你想跑我拦你」，注入是「你一直看得见」。

**一并作废的约束**（原 §4.2a 三条 + 相关）：Stop 落点 `session-sync.mjs`、
≤900 字符复合 reason 预算（R2 曾判 BLOCKER：实测 604/737/785 + 义务段 168 = 算术上塞不进）、
Stop 通道 stdout 独占、`blocked_at_turn` 防循环、对 `stop_hook_active` 的依赖。
**一个要挤占别人预算才装得下的机制，本身就是它不该在那里的信号。**

**一致性论证**：自成长提取是框架自我改进的核心机制，它的 Stop 强制都已降级为默认关闭；
E2 没有理由享受比它更高的强制等级。

**代价（明写，不含糊）**：E2 的保证从「挡得住」退成「全程看得见 + 记得住」。
模型收到注入证据仍然摆烂时，框架对 E2 不再有硬手段（Plan Agent 门、scope 拒绝、handoff 协议仍在）。
这是 luca 2026-08-31 明确认可的取舍。

> **这是相对原稿的主要削减**：原 §5.2 列了 30+ 状态（`PLAN_EXECUTION_DELTA_APPROVAL`、
> `PLAN_EXECUTION_FAILURE_DRAIN`、`PLAN_EXECUTION_TRANSFER_READY` 等），那是一套完整的计划执行与转移引擎，
> 与 E2「别把任务弄丢」无关。若将来确需，另行立项。

### 4.3 冻结 fixture

`调整设置里的颜色但结构不变`、`别调整设置结构`、`结构别改`、`我们优化了设置页面，结构没变`、
`没改结构，只动了配色`、`帮我优化下设置页面，别动结构，其他随便你改`、`颜色不改，重组设置分组`
—— 每条都产出信号 + 原样 `negation_context`，且**都不产生义务**（hook 不区分它们）。

**已定案（2026-08-30，取代 R31 的待裁项）**：R31 只怀疑"腿数不够"，会审实测发现真正的杀手是
"同从句"约束，且它会连 E2 自己的复现串一起杀掉。删掉该约束后需逐条重测：仍缺腿的（如 `别动结构`
只有变更腿+结构腿、无界面腿）**移出**本 fixture 集，不得为迁就它们再放宽腿规则——那等于把
§3.3 删掉的机制从另一个门引回来。实现第一步就是把这 7 条逐条跑一遍并把实测结果钉进测试。

**必须新增的 E2 直接回归串**（原始故障复现，删"同从句"后应产信号，实现时实测确认）：
`帮我优化下设置页面，功能堆砌太严重了很难找`

---

## 5. E3 — 队列化提交与惰性认证

### 5.1 `UserPromptSubmit` 只做撤销与入队

**载荷校验**（严格、非破坏性）：limit+1 流式读取，信封 ≤524,288 B；`cwd` 为规范字符串 ≤4,096 B 且等于
本次调用的仓库根；未知/重复键拒绝；raw sid 等于其 1–36 位 `[A-Za-z0-9_-]` 形式；prompt 为精确 UTF-8、
≤262,144 B。
Claude 候选：**必须**有 canonical UUID 的 `prompt_id`，且**没有** `turn_id`。
Codex 候选：**必须**有 1–128 位安全 ASCII 的 `turn_id`，且**没有** `prompt_id`。
两者都有/都没有、截断、删除、兜底 ID、未知 schema → **一律 fail closed**。
`actualHarness()` 只作诊断与解析器选择，**永不**作为授权证据。

拿到合法 sid 与可解析文档后，只取 session 锁并原子地：

1. `prompt_gate.phase = ATTESTATION_PENDING`——**之前所有写入授权立即失效**；
2. 快照会话源，**不解读任何用户记录**。存在则记 `{kind:PRESENT,path,dev,ino,size,tail_hash}`；
   Codex 为 `null` 时，在真实 sessions 根下做有界不跟随后缀普查，要么找到唯一 `-<sid>.jsonl` 并快照，
   要么记 `{kind:UNPUBLISHED,root_dev,root_ino,census_digest}` 证明当时确无此文件；超限/歧义 fail closed；
3. 追加一条**不受信**候选到**最多 8 条**队列（原始 prompt 合计 ≤524,288 B）；
4. **不改**任何项目绑定/epoch，**不建**任何 ledger 事件、义务、事务或命令。

第 9 条无法表示 → `ROTATION_REQUIRED(PENDING_CAPACITY_UNREPRESENTED_DELIVERY)`，保留最后可信游标与项目，
拒绝该 sid 的一切普通路由/项目动作。**不是**可恢复的 AUTH_BLOCKED。

### 5.2 惰性认证（判定挪到拿得到证据的那一层）

到**第一个 PreToolUse / Stop** 时，持久记录已经落盘，此时才把队列里每个候选绑定到**恰好一条**原生记录：

- **Claude**：精确匹配 `sessionId + cwd + promptId + record.uuid + origin.kind=human +
  promptSource(typed|queued) + non-meta + role=user + canonical text`。
- **Codex**：匹配**相邻对** `response_item/message/role=user/msg_*` 紧跟
  `event_msg/item_completed/UserMessage`；文件名、`session_meta` 的 id/session_id/cwd、thread id、turn id
  与两种 canonical 文本投影都必须与候选一致。
  → **`msg_*` 才是事件身份，`turn_id` 只是传输层 parent。** 这是 E3 的正解：同一个 `turn_id` 下的
  两条消息拥有不同 `msg_*`，各自认证、各自消费，不再互相顶掉。

未按序一一映射、跨 session 重放、早于游标的记录、伪造 stdin、假 `LUCA_ACTUAL_HARNESS` → **不得认证**。

### 5.3 KILL 条件（仅此一条属于本节）

若任一 harness 在被测的首个 PreToolUse/Stop 观察点**无法**把队列候选绑定到当时的持久原生记录，
则本架构不成立 → 停止实现并回到架构评审。模型认证不可用**不构成**豁免。

**Codex rollout schema 版本依赖（终审实测，最危险的一条）**：§5.2 的相邻对锚点
（`response_item/message/role=user/msg_*` 紧跟 `event_msg/item_completed/UserMessage`）**只存在于
带锚点的那一类 rollout**——注意这与 `cli_version` **不对应**（下段有 640 文件实测）。
终审在真实文件上核过：当前 schema 文件里 502 条人类记录
**0 条**缺锚点、`msg_*` 在 486 个文件中**0 重复**——方案对新版是成立的。但 486 个 rollout 里
**只有 38 个**是当前 schema，4–7 月的**全部**走 `event_msg/user_message`，**根本没有锚点记录**。

在无锚点的 rollout 上，§5.2 会对**每一条**消息 fail closed，而此时 `ATTESTATION_PENDING` 已经撤销了
全部写授权 → **session 完全卡死，比 E3 本身更糟**。降级路径绝不能再依赖那个失败的东西。

**判据必须基于内容，绝不可基于版本号（R2 实测，本条曾是 BLOCKER）**：早期文稿把判据写成
「`cli_version 0.148.0` 及以后有锚点」。复核扫了 **640** 个真实 rollout，**版本不是判据**——
`0.148.0` 有 6/11 个文件无锚点，`0.150.1` 有 12/19。按版本闸会误分类 25 个文件，
在**luca 今天正在跑的版本上**触发它本要防止的卡死。
正确判据：**该文件内是否存在 `event_msg/item_completed` 且 `item.type=UserMessage` 的记录**。
该判据在 640 个 rollout 上**零反例**（无任何文件混合两种记录），且是 per-file 判定、不跨文件推断。
（另两条正面实测：锚点相邻距离 489/489 恰为 1；K6 依赖的 per-file 前提成立。）

- **`K6`**：实现必须在入队前**按内容**探测该 rollout 有无锚点记录。检出**无锚点**时，
  **不进入 `ATTESTATION_PENDING`**、不撤销写授权、保持改造前的旧行为（E3 在老版上不修），
  并在 stderr 给一行说明。**不得** fail closed，**不得**用"兜底再解析一次锚点"——
  那是拿坏掉的那个东西去兜它自己。
- 回归用例三条：①有锚点文件走完整惰性认证；②无锚点文件走旁路且**写授权不被撤销**；
  ③**同一 `cli_version` 下一个有锚点、一个无锚点**两个文件分别走对分支——这条专门钉死
  「版本不是判据」，防止实现者又把探测退化成版本比较。

**另两个已知的 Codex 侧缺口（会审 Q3 补，同样在 L0 探针里专门测）：**
1. **纯读回合没有观察点**——Codex 的 PreToolUse matcher 只有 `Bash|apply_patch`。
   一个只读文件、不执行命令的回合，`PreToolUse` 根本不触发，惰性认证要一直拖到 Stop。
   L0 必须实测"纯读回合 + Stop"这条路径能否完成绑定。
2. **（原「`stop_hook_active` 防循环」条已随 2026-08-31 裁决删除）**——E2 不再在 Stop 拦截，
   因此不存在自环风险，也不需要任何重入标记。§4.2a 的 20 轮封顶是注入的唯一界限。
   本节此前关于「E2 在 Codex 上是硬拦截」的论述同样作废：E2 在两个 harness 上**都不拦截**。

---

## 6. 作用域否定 —— 与已落地能力的接口（luca 2026-08-28 裁决）

`BASELINE` 的 `route-guard.mjs` 已有 `NEGATED_DOWNSTREAM_SCOPE_RULES`（`b2762c7` 落地），
在 `DOWNSTREAM_SCOPE_RULES` 之前剥掉 `不是项目任务` / `不涉及项目` 一类短语。**保留，本计划不动它。**

否定判定按**轴**区分合法性：

| | 授权轴（§3.3 已删） | 作用域轴（保留） |
|---|---|---|
| 判什么 | 是不是在要求切项目 | 这是框架活还是下游项目活 |
| 判错的代价 | **切错项目**，回合内不可逆 | 多问一句 `NEEDS_CONTEXT` |
| 遇到不认识的否定词 | 静默授权 | 退回追问 |

### 6.1 `REQ-SCOPE-NULL-FIRST`（必须修，实测可触发）

作用域轴**目前并不安全**。实测最小对：

```text
new project: 涉及项目的route-guard    → NEEDS_CONTEXT
new project: 不涉及项目的route-guard  → PROJECT_SWITCH / create_new_project   ← 真的建了新项目
                                        （属于/不属于、项目/非项目 同样翻转）
```

危险方向是否定词**命中**而非漏掉：命中 → 下游信号被剥掉 → `mixed_ambiguous` 短路消失 →
`projectGate` 继续往下走 → 撞上 `explicitNewProjectName`，而它排在 `pure_framework_meta` 空臂**之前**
→ `project.sh new`：建新项目、解绑当前、三条软链重指。

**要求**：`projectGate` 必须在 `explicitNewProjectName` **之前**评估 `pure_framework_meta` 空臂，
使任何作用域否定结果都到不了会改绑定的分支。

两个推论：
- **不得**扩充该否定词表——扩得越全越危险（在修好之前）；
- 当前漏网的 `跟项目没关系` 是这个措辞下唯一的护栏，**同样不得**去"补上"。

修好之后，该词表不完整只costs 可用性，可以一直不完整。

---

## 7. 断言与变异体

### 7.1 断言

| ID | 内容 |
|---|---|
| `A-ALIAS` | §3.3 全部冻结 fixture；两目标不选；`marker_present` 只记录不 gate；第 9 条 cap 拒绝；`alias_not_found`；保留词/限额/普查越界全部按 §3.1 失败，而 canonical 名始终可用 |
| `A-SIGNAL` | 三腿在**整条 prompt 内**命中即可产信号（§4.1 已删「同从句」约束）；**跨从句是正例不是反例**——`帮我优化下设置页面，功能堆砌太严重了很难找`（E2 原始复现串，结构腿在第二从句）**必须产信号**，这是 E2 的直接回归断言；反例只有：缺腿（2/3）与同段兼任两腿。信号不计分、不派 skill/flow、不改 Plan 五条件；光有信号只得 `SIGNAL_UNCONFIRMED` 且不挡 Stop |
| `A-OBLIG-VISIBLE` | **挂 `scripts/test-route-guard.mjs`（UserPromptSubmit 侧）**——`PENDING` 义务存在时**每轮**注入 `📌 当前有未完成任务`；`SIGNAL_UNCONFIRMED` 不注入；义务被 `SATISFIED`/`CANCELLED` 后停止注入。**并断言任何状态下 Stop 路径均无义务相关输出**（`session-sync.mjs` 的 stdout 不因义务改变），这条是 2026-08-31 裁决的守卫 |
| `A-OBLIG-LIFECYCLE` | 挂 `scripts/test-route-guard.mjs`——三个终态各由其生产者事件驱动（skill dispatch→`SATISFIED`／新任务→`SUPERSEDED`／取消或 deactivate→`CANCELLED`）；20 轮封顶后自动 `CANCELLED` 且停止注入；项目切换转 `DEFERRED` 并保留**完整**原始任务字节、事务后恢复。**并断言 E2 在 PreToolUse 与 Stop 两条路径均无任何义务相关输出**（`project-scope-guard.mjs`／`session-sync.mjs` 的行为不因义务改变）——这是「E2 不拦截任何东西」的守卫 |
| `A-IDENTITY` | 同一 `turn_id` 下的两条 Codex 消息各自绑定到不同 `msg_*`，**两条都能被消费**（E3 直接回归）；Claude 侧按 `prompt_id`+`record.uuid` 绑定；跨 session 重放、伪造 stdin、假 harness 变量均不得认证 |
| `A-SCOPE-NULL` | §6.1 四组最小对：否定式与其肯定式孪生必须返回**相同**决策，且都不得返回任何会改绑定的 `projectAction`。**基线为红**——它编码的是待修缺陷，不是既有性质 |
| `A-GATE-SUPPRESS` | `route-guard 在 luca app 工程里怎么走` → `pure_framework_meta` + gate 空臂 + **`decision:NONE`**（现可测；2026-08-31 实测——`72bd1f2` 放宽 `isContinuation`/新增 `hasProjectWorkIntent` 后由 `STOP` 变为 `NONE`，**语义未变**：仍走 gate 空臂、不 gate。断言应钉「不产生任何 `projectAction`」而非钉具体 decision 名，避免下次路由微调再次误红），且 `RESOLVE` 产出一条 `muse` 候选、`marker_present:true`（实现后可测，**两半分开断言**）。反向控制：`route-guard 在 muse 里怎么走` 必须继续 gate（SC-20260523-002）；`…luca app 项目里怎么走` 必须继续 `NEEDS_CONTEXT` |

> **控制例子必须是"推导"出来的，不能是"挑"出来的**（R29/R30/R31 连栽三轮的教训）：
> 属性若是合取，就逐个合取项写出它对输入的约束、取交集再造字符串，并**逐项单独实测**。
> `A-GATE-SUPPRESS` 的三条约束：①不含 canonical 目录名（否则 `namedProject` 先认领）
> ②带 `项目|工程` marker ③marker 必须是 `工程` 不是 `项目`（否则下游规则在 `projectGate` 之前就返回）。

### 7.2 变异体（每条必须让其所属测试变红）

1. 让任何 `alias_resolution` 字段产生授权效力；
2. 让别名候选**以 marker 为条件**（`iff`/"requires"/fail-closed 臂/记录后过滤）——这会让
   `打开 luca app` 退回零证据，重开 E1；
3. 在**授权轴**重新引入机械否定（读否定词来决定是否发出了项目指令，或据此授权/拒绝/择一候选）
   —— **不得**对保留的作用域否定开火；
4. 反向：删掉保留的 `NEGATED_DOWNSTREAM_SCOPE_RULES`（把 `不是项目任务` 重新算作正向下游证据）；
5. 把 `explicitNewProjectName`（或任何建项目/改绑定分支）挪回 `pure_framework_meta` 空臂**之前**；
6. 让光有信号就直接建 `PENDING` 义务（绕过 `SIGNAL_UNCONFIRMED` 确认门）；
7. 把义务的 `exact_task_text` 截断到三腿从句，或在字节往返中丢掉任何原始 UX 约束；
8. 用 `turn_id`（传输层 parent）而非 `msg_*` 作为 Codex 事件身份 —— 直接重现 E3；
9. 在 `UserPromptSubmit` 层做身份判定（即在拿得到持久记录之前就裁决）；
10. 让 `actualHarness()` 参与授权；
11. **恢复"三腿须同从句"约束** —— `帮我优化下设置页面，功能堆砌太严重了很难找`（E2 原始复现串）
    必须由产信号变为不产信号，该回归用例转红；
12. **把信号/`RESOLVE` 的计算挪进 `skillDecision` 内部**（不走 §3.2 的携带模式）——
    `PROJECT_STOP` / `NEEDS_CONTEXT` / **`PLAN_MODE`** 三个早返下两者均静默失效；
    三条对应回归用例（含 `重构设置页面的信息架构，新增权限、通知、导出三个分组，层级太深很难找`
    这条走 `:770` 裸 return 的）**必须各自转红**——只覆盖前两个不算数；
13. **把注入放在 `buildDecision` 的早返之后**（不走 §3.2 携带模式）——
    `PROJECT_SWITCH` 回合的注入用例转红（那正是义务必须存活转 `DEFERRED` 的一轮）；
14. **让 `PENDING` 义务停止每轮注入**（只在某个边界注入一次）——用例必须是**同一 sid 连续 ≥3 轮**，
    断言每轮都有注入；单轮用例判不出这条，会恒绿；
15. **去掉 20 轮封顶或任一终态生产者** —— 构造「义务创建后连续 25 轮无相关事件」，
    断言第 21 轮起不再注入且状态为 `CANCELLED`；去掉封顶则转红。
    （原第 15 条要变异 `session-sync.mjs`，但该文件已被 2026-08-31 裁决移出 §8、本计划全程不改它，
    那条断言从第一天起恒绿、无阳性对照——已作废替换。）
16. **把 K6 的锚点探测从内容判定换成 `cli_version` 比较** —— §5.3 第③条回归用例
    （同版本下有锚点/无锚点两个文件）必须转红；去掉 K6 旁路同样转红；
17. **在 `route-guard` 的义务读取上去掉 try/catch** —— 构造一个损坏的义务状态文件，
    route-guard 必须照常完成路由（只是不注入），不得整体失败或吞掉本轮路由提示；
18. **让义务状态文件不被 `.gitignore` 覆盖** —— `git check-ignore` 用例转红
    （防止含完整 prompt 原文的文件被 `git add -A` 提交进仓库）；
19. **变异体 13 的 `apply_patch` 分支** —— 义务检查移到 `:683` 之后时，
    以 `tool_name='Bash'` + `tool_input.command` 为 `*** Begin Patch …` 的用例必须转红
    （只测普通 Bash 不算数，Codex 的编辑走的正是这条）。

---

## 8. 改动清单

**运行时（实现阶段才动，握手前一律不动）：**

```text
.gitignore                             # 【R2 补】忽略义务状态文件（见下方隐私约束）
.claude/hooks/route-guard.mjs          # RESOLVE、信号（须按 §3.2 携带模式）、projectGate 臂序
.codex/codex-hook-adapter.mjs          # Codex msg_* 身份与 null 源
scripts/test-route-guard.mjs           # A-ALIAS / A-SIGNAL / A-SCOPE-NULL / A-GATE-SUPPRESS
                                       #   + A-OBLIG-VISIBLE / A-OBLIG-LIFECYCLE
scripts/test-prompt-attestation.mjs    # A-IDENTITY（新建）
```

**义务状态文件的隐私约束（R2 MAJOR-3 补，实施第一步就要做）：**
义务状态文件含 §4.2 规定的 `exact_task_text` = **完整原始 prompt 字节**（上限 262,144 B）。
实测 `.claude/.session-obligation-<sid>` **不被现有 `.gitignore` 覆盖**
（阳性对照：`.session-project-<sid>` 命中 `.gitignore:97`）。不处理的话每个产生义务的 session
都会留下一个含用户 prompt 原文的未跟踪文件，`git status` 永久变脏，一次 `git add -A`
就把用户原话提交进仓库。**先加 `.gitignore` 条目、再写义务落盘代码**，顺序不可颠倒；
并加 `git check-ignore` 断言（变异体 18 守护）。

**注入点位的接线硬约束（终审 MAJOR-2 补，违反即在最需要的那一轮静默失效）：**
1. 注入必须**穿过 `buildDecision` 的全部早返**，与 §3.2 的信号/`RESOLVE` 同一携带模式。
   最自然的邻位（`route-guard.mjs:1145` 一带）压在 `:1096`/`:1097`/`:1133`/`:1140` 四层条件
   与 `:1162` catch-all 之下——naive 放在那里会在 **`PROJECT_SWITCH` 回合静默不注入**，
   而那正是 §4.2 要求义务必须存活（转 `DEFERRED`）的那一轮。
2. 注入写 **`hints` 通道，不写 `decision`**：dry-run JSON 由 `:1094` 的 `process.exit(0)` 天然隔离
   （139 条用例与 `eval_routing.py` 都碰不到），Codex adapter 会把非 JSON 包成 `additionalContext`
   且 `additionalContextLimit: 0`。只要不碰 `decision`，输出契约不受污染（终审已验证）。
3. 义务读取**自带 try/catch**，异常一律静默跳过注入——注入是提醒，不得因它让 route-guard 失败。

**下游（非框架仓）**：`<PROJECTS_ROOT>/muse/.luca/project.json`（新增别名 manifest）。

**不动**：`CLAUDE.md`、`AGENTS.md`、`skill-routing-map.yaml`、observability、memory、
以及原稿 §9–§11 涉及的 bridge/activation/rollback 全部资产。

---

## 9. 验证

```bash
node scripts/test-route-guard.mjs            # 含 139 条既有回归底线，不得下降
node scripts/test-project-scope-guard.mjs   # 回归底线：E2 不再碰此 hook，97/0 必须不变
node scripts/test-prompt-attestation.mjs
node scripts/check-routing-map.mjs
node scripts/check-project-links.mjs
bash scripts/verify.sh
```

改 `route-guard.mjs` **之前**先跑一遍记录基线（当前 `test-route-guard.mjs` = 139/0，2026-08-31 实测），改完再跑；
任何既有用例转红即停。E1/E2/E3 各自必须有一条**直接复现原始故障**的回归用例。

---

## 10. KILL 条件（精简到 4 条）

- `K1` 计划字节在评审通过后发生任何改动 → 全部评审作废，重算 SHA。
- `K2` 框架 `HEAD`/`upstream` 在一轮评审期间移动**且**该提交触及 `framework-audit/**` 之外的路径或
  §8 清单中的任一文件 → 该轮作废。**纯 audit 提交**（非 audit 路径为 0 且 §8 清单文件字节不变，
  须用命令举证并跑阳性对照）→ 重钉基线、记录豁免、继续。
  **当前基线 `HEAD=BASELINE=72bd1f25a8f969e56ab0133dc6ec5f11b3b1236c`**（2026-08-31 重钉：
  `72bd1f2 fix(hooks): stop interrupting ongoing conversations` 触及 §8 清单 6 个文件，
  且其语义直接引发 §4.2a 的裁决，旧基线 `4658595` 已失效）。
- `K5` §8 声明"不动 memory/observability"，但这两处会被运行时 hook **自动追加**。
  KILL-03 的判据只看 §8 清单内的路径；`memory/**`、`.claude/observability/**` 的运行时追加
  **不构成** `BLOCKED_DIRTY_OVERLAP`，否则本计划会被自己的运行时卡死。
- `K3` §8 清单中的任一路径在实现开始前带有未提交改动 → `BLOCKED_DIRTY_OVERLAP`，
  不得 stash/reset/clean 绕过。
- `K4` §5.3 的惰性认证前置不成立 → 停止实现，回架构评审。
- `K6` Codex rollout **无锚点**时未走 §5.3 的旁路（而是 fail closed 或撤销了写授权）→ 停止实现。
  无锚点 rollout 上「不修 E3」是可接受结果，「把 session 卡死」不是。
  探测**一旦基于 `cli_version` 而非文件内容**，本条即视为未满足。

---

## 11. 执行顺序与握手

1. **握手**：本文冻结 → 独立评审（按 §3/§4、§5、§6–§7 三段分工，避免单人通读）→
   全绿后向 luca 提交**确切 SHA** 请求批准。**只有 luca 点名该 SHA 说批准才算**；
   「继续」「可以」「go」、对旧 SHA 的批准均不算。
2. 批准后：下游 `project.json` → `RESOLVE` + 信号 → `REQ-SCOPE-NULL-FIRST` 臂序 →
   最小义务 → Codex `msg_*` 身份。每步先加断言、后改实现。
3. 实现后：开独立 reviewer 深审 + 跑 §7.2 全部变异体，逐条确认变红。
4. 交付时报告：E1/E2/E3 三条回归用例的实际输出、变异体红/绿证据、以及**没做什么**
   （plan-execution 状态机、bridge/activation 均不在本次范围）。

---

## 附：与原稿的关系

`FINAL-EXECUTION-PLAN.md`（5890 行）保留不删。本文承接了它经 31 轮红队验证过、且与 E1/E2/E3 相关的全部结论：
六轮否定词证伪链与由此删除的授权轴判定（§3.3）、`SIGNAL_UNCONFIRMED` 确认门（§4.2，原 R27 BLOCKER）、
marker 只记录不 gate（§3.2，原 R30 BLOCKER）、控制例子必须推导（§7.1，原 R29–R31）、
轴分表与 `REQ-SCOPE-NULL-FIRST`（§6，原 R31 F1）。

未承接的部分——原 §5.3（1696 行 plan-execution 状态机）、§8 完整转移矩阵、§9–§11
bridge/activation/rollback——**不是被否决，是被移出本次范围**，需要时另行立项。

<!-- FILE_END: EXECUTION-PLAN-CORE.md -->
