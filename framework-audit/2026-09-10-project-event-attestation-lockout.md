# 缺陷 · 2026-09-10 · 合成 prompt 毒化事件候选队列 → session 永久失去项目权限

> 发现于：muse app CLI 更新器改造 session（4e90e61d-2c37-4f64-b1df-eb968dc494c9）
> 状态：**未修**。本文件是交接物，不是修复记录。
> 影响面：这台机器上任何 session；不限 harness（Claude / Codex 同一条控制面）。

---

## 一、症状

某一刻起，该 session 对**所有**项目作用域路径的读写全部被拒，且不再恢复：

```
Bash 直接项目路径不属于当前可验证 binding（/Users/luca/Desktop/项目/muse/app/xxx）；禁止 no-pin/跨项目/失效 identity 访问。
项目状态 TURN_CLOSED 没有可验证的 TURN_ACTIVE identity/epoch，不能访问共享路径「…」。
```

用户后续发多少条消息都无效——每条新消息只会再往队列里排一条候选。

## 二、触发器（已定位，可复现）

**Bash 命令超过 120s 被 harness 自动转入后台 → 完成时投递一条 `<task-notification>` 伪 prompt → 它走了 UserPromptSubmit → 被 `queueProjectEventCandidate` 当成一次用户回合排进候选队列。**

本次的具体触发命令：`node test-cli-providers.mjs`（因为被测代码里新接的下载器真的开始下 66MB，跑过了 120s）。

## 三、证据（观测到的，非推断）

1. `project.sh status <sid>` 输出里 `event_control.candidates[0].prompt_integrity.bytes_base64`
   解码后**就是那条 `<task-notification>` XML**（含 task-id `bf4c51a2p`），`intent.kind = "turn"`。
2. 在 transcript（`~/.claude/projects/…/<sid>.jsonl`）里 grep `bf4c51a2p` 命中 17 次，
   **全部**落在 `tool_result` / `queue-operation` / `attachment` 记录里；
   逐条遍历所有 `type=="user"` 记录，没有任何一条的 prompt 文本是这段 XML。
   → 这条候选**在结构上永远兑不出证据**。
3. `/tmp/luca-gstack-hooks.log`（PreToolUse 的 stderr 落点）里能看到两类码：
   - `SOURCE_NOT_VISIBLE: candidate Claude event is not yet visible`
   - `BOOTSTRAP_UNATTESTED: native event requires a pre-input SessionStart fence; resume or start a new session`
4. `attestPendingProjectEvent`（`project-substrate.mjs:712`）对 `candidates` **逐条 attest、任一条抛就整体抛**，
   且没有任何剪枝/降级路径 → 队列一旦含一条不可兑现的候选，此后每一次 PreToolUse 都失败。

## 四、根因（两张面孔）

### 面孔 1 —— 认证层分不开「还没到」和「根本不会到」

`SOURCE_NOT_VISIBLE` 同时承担两种语义：

| 情形 | 正确处置 | 现状 |
|------|---------|------|
| 用户 prompt 还没 flush 进 transcript（每回合第一次工具调用**常态**发生，稍后自愈） | fail-closed 重试 | fail-closed ✅ |
| 合成 prompt（后台任务通知等）**永远**不会以 user 记录落进 transcript | 识别并剔除 | 同样 fail-closed，于是**永久卡死** ❌ |

fail-closed 在第一种情形下是对的，在第二种情形下变成了 fail-dead。二者在当前实现里无法区分。

### 面孔 2 —— `deactivate` 在会话中途是一扇单向门

试图用 `project.sh deactivate <sid>` 清掉毒候选（成功，`state=NO_PIN`、`candidates=[]`），
但它**连 fence 一起删了**，而：

- `attestNativeUserEvent`（`event-attestation.mjs:922-925`）：`cursor` 与合法 `bootstrapFence` 两者皆无 → 抛 `BOOTSTRAP_UNATTESTED`；
- `initializeProjectEventFence` **只有** `session-restore.mjs:51` 调用，且只在 SessionStart 且 `source ∈ {startup, resume}` 时；
- 会话中途没有任何东西能再铸 fence。

→ 解绑之后该 session **连 switch 都做不了**（`project.sh switch` 的 `--tx` 要先过认证才铸得出）；
route-guard 仍会在每轮打印一条 tx 命令，但它必然被 `NO_PIN 不允许直接 switch/new` 拒绝。**误导性很强**。

## 五、应急处置（给撞上的人）

1. **别再解绑**（面孔 2）。
2. 直接 **`claude --continue`（或 `--resume` 选中该会话）重开**——上下文保留，SessionStart 会铸出新 fence；
   重开后说一句带项目名的话，route-guard 铸的 tx 就能落地。
3. 预防：别让 Bash 命令进后台（>120s 会自动转后台）。显式给足 `timeout`（上限 600000ms）跑前台。

## 六、修法候选（未选定，交给修复方裁决）

**A. queue 侧拒绝入队。** 在 `queueProjectEventCandidate` 判定「这不是人类回合」就不排。
- 优点：不动安全不变量，改动面最小。
- 风险：要枚举 harness 合成 prompt 的**封闭集合**（`<task-notification>` 只是其中一种，还有 hook 注入、queue-operation 等）。
  按 bug 逐个补词 = 保证还有下一次（见 `feedback_enumerate-the-domain-not-the-bug`）。

**B. attest 侧标记 unwitnessed。** 一条候选在 source 中兑不出、**且**其后存在能兑出的候选 → 判定它不可能是真实用户回合，
记进 ledger 后跳过，而不是让整队列失败。
- 优点：不依赖识别合成 prompt 的形态，通用。
- 风险：动的是安全不变量本身。必须**双向攻**：既不能让真实用户 prompt 被静默丢弃（顺序保证），
  也不能让伪造候选借此绕过。这条改动的裁决者不应只有被它约束的一方（见 `feedback_permission-gate-design-blind-spots`）。

**C.（正交，且不论选 A 还是 B 都该做）把单向门堵上，并补一条受控恢复口。** 两件事：
- `deactivate` 在无法同时保证 fence 可重建时应当**拒绝执行并说明**，而不是留下一个连 switch 都做不了的状态；
- 更根本的是：**目前撞上之后除重启进程外没有任何恢复路径**。`prepare` / `begin-turn` / `close-turn`
  已被主动废弃（`project-pin.mjs:389` 抛 "raw turn-id authority is retired"）——堵最后一条 bypass 的同时
  把最后一条 escape hatch 也堵了。恢复口必须存在，且**只能由用户开、不能由被约束的 agent 自开**
  （重铸 fence 等于宣称「有一次 pre-input 边界」，agent 自行调用就是伪造控制面）。

## 七、必须保持绿的回归

`scripts/test-prompt-attestation.mjs`、`scripts/test-project-transaction.mjs`、
`scripts/test-event-transaction-faults.mjs`、`scripts/test-event-switch-e2e.mjs`、
`scripts/test-project-identity-wiring.mjs`，以及 `verify.sh` 全量。
双 harness 对账：`.claude/settings.json` ↔ `.codex/hooks.json`（见 `feedback_dual-harness-parity`）。

## 八、复现配方（合成——活体证据已被销毁）

**诚实交代：** 发现方为了解困跑了 `deactivate`，那份带毒候选的状态文件已随之消失。
下面是用现成夹具重造的配方，不依赖那份现场：

1. 用 `test-prompt-attestation.mjs` 的夹具建一个临时 gstack root + 假 transcript + fence。
2. `queueProjectEventCandidate` 排入一条 prompt bytes **不存在于 transcript** 的候选（模拟合成通知）。
3. 再排一条**存在于** transcript 的真实候选。
4. 调 `attestPendingProjectEvent` → 观察：整体抛 `SOURCE_NOT_VISIBLE`，第二条永远轮不到。
5. 修复后同一配方应当：第一条记为 unwitnessed（或压根没入队），第二条正常 attest。
6. 反向断言（防 B 改出 fail-open）：把第二条也改成 transcript 里没有的 → 必须仍然整体拒绝。

## 九、尚未证实的部分

- 面孔 1 抛出的**具体错误码**没有当场截到（hook stderr 是**机器级共享**的 `/tmp/luca-gstack-hooks.log`，
  行内既无时间戳也无 session id，无法把某一行归到某个 session）。
  从代码路径推断是 `SOURCE_NOT_VISIBLE`（`event-attestation.mjs:743`），机制链完整，但这一环是**推断不是观测**。
- 顺带一条独立小缺陷：**共享 hook 日志缺 session 归属**，多 session 并发时无法归因。

---

## 十、设计层诉求（luca 2026-09-10 当面提出，优先级高于上面任一条具体修法）

上面第六节是「怎么补这两个洞」。luca 追问的是更上一层：**这道闸的价值还在不在，失效或转负时怎么办。**
逐条记下他的判断与由此产生的设计要求——修复方不要只修洞，先答这一层。

**1. 目标仍然成立，不要拆闸。** 要防的是「agent 自己决定它在动哪个项目」。
激活项目是全局共享软链，一个 session 随手 switch 就踩掉并行 session 的指针（luca 2026-07-08 定性为严重问题）。
这个目标值得守，重放保护也值得留。

**2. 但严苛度与威胁模型错配。** 这道闸挡得住漂移和手滑，挡不住蓄意——它自身的历史就是一部补绕行洞的编年史
（变量拼接、`..` 词法穿越、软链绕过，逐个补上）。用「逐字节比对 transcript + 全队列 all-or-nothing + 永不放行」
这种量级去守一个防手滑的目标，量程用错了。

**3. 失败方向配反了（本条是设计要害）。**
- 误放行的代价：在错目录改了几个文件，`git status` 可见，回滚以秒计。
- 误拦截的代价：跑到一半的会话彻底锁死、无内部恢复、并**诱导**操作者做出破坏性动作（本次即 `deactivate`）。
- 两侧代价相差一个数量级，而严苛度全压在代价小的那一侧。

→ **要求：误判时降级，不要断电。** 认证失败应退到「只读 + 停下来问用户」，而不是连读都拒。
需要严守的是**写入**那一侧；读跟着一起死是纯损失，也是本次半天成本的主要来源。

**4. 给闸记账（可复用的判据，不限本闸）。**
一道约束要记：拦住过几次真实事故 / 误伤过几次 / 每次误伤的成本。
本次这笔账是「误伤 1 次 ≈ 半天 + 一次破坏性误操作，拦截真实事故 0 次」。
账连续为负 → 改失败姿态或降级机制，而不是继续加固。
（母原则见 `feedback-adoption-ambition`：手段性约束是服务价值的手段，不是否决价值的目的；
撞上时分离两问——这事值不值得防 / 怎么防才不反噬。别让「它是安全机制」冒充「所以不能碰」。）

**5. 立场声明。** 以上诉求由**被这道闸约束的一方**（发现方 agent）转述。
「这闸太重了」出自被约束方之口天然可疑，请打折听并独立复核
（见 `feedback_permission-gate-design-blind-spots`：裁决约束自己的规则时必须外部红队）。
发现方拒绝自行调用 `initializeProjectEventFence` 解困，正是基于同一条纪律。
