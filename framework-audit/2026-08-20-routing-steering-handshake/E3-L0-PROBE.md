# E3 L0 探针 —— `K4` / `K6` 前置实测

> 2026-09-01，`lucagstack-9d`。**只读**：未改任何 runtime，未起 Codex 会话。
> 目的：在写任何 E3 代码之前先证伪。计划 `K4` 明写「惰性认证前置不成立 → 停止实现，回架构评审」。

---

## 结论速览

| 前置 | 判定 | 依据 |
|---|---|---|
| `K4` Claude 侧：首个观察点时人类记录已落盘且可绑定 | ✅ **成立** | 本 session 实测，§5.2 要求的字段一个不缺 |
| `K6` per-file schema 判定（不跨文件推断） | ✅ **成立** | 708 个 rollout，**0 个混合** |
| 「版本不能当判据」 | ✅ **成立且比计划所述更强** | **9 个 cli_version 同时存在有/无锚点**；`0.149.1` 是 18/18 精确对半 |
| `msg_*` 文件内唯一 | ✅ **成立** | 3211 条记录，0 个文件内重复 |
| §5.2「**相邻**对」锚点 | ❌ **不成立（本次新发现）** | 677/678 距离为 1，**存在 1 个距离为 2 的真实反例** |
| `K4` Codex 侧：观察点触发时可绑定 | ✅ **成立** | 真实回合实测，user 记录早于首个工具调用 7 条 |

**总判定：`K4` / `K6` 全部成立，E3 的 L0 全绿——但 §5.2 的「相邻」写法必须先改，否则会在真实文件上死锁。**

---

## 1. Claude 侧 `K4`：成立

在**本轮的首个工具调用**时读自己的 transcript，本轮 prompt 已经在里面，且携带 §5.2 点名的全部字段：

```
uuid          = 7994396f-141e-48e5-81c9-b4c0a821b51b
promptId      = 8fc2b31b-4b04-47c1-9700-c1edaf25dce4
sessionId     = ee5e5ee0-a9a4-4418-b7a2-e2d0d779311b
cwd           = /Users/luca/Desktop/项目/muse/lucagstack/.claude/worktrees/…
message.role  = user     userType = external     isSidechain = false
origin        = {"kind": "human"}      ← §5.2 要求 origin.kind=human
promptSource  = "typed"                ← §5.2 要求 typed|queued
```

即：**Claude 侧的惰性认证有真实可绑定的锚**，不需要新造 ID。

## 2. `K6` 的三条前提：全部成立

扫全部 **708** 个 `~/.codex/sessions/**/rollout-*.jsonl`：

```
只有锚点(新 schema)   :  55
只有 user_message(旧) : 413
两者都有(混合)        :   0     ← per-file 判定成立的必要条件
两者都无              : 240     ← 无任何人类消息的会话（inter-agent / subagent），不是第三种 schema
msg_* 记录 3211 条，文件内重复 = 0 个文件
```

**含人类消息的分母其实是 468，其中只有 55（11.8%）是新 schema。**
也就是说 `K6` 的旁路不是边缘情况，**是主路径**——E3 对绝大多数历史会话「不修」。

## 3. 「版本不能当判据」：成立，而且比计划所述更严重

计划说按版本闸会误分类 25 个文件。本次全量实测：**9 个 `cli_version` 同时存在有锚点与无锚点的文件**。

```
0.147.0            有锚点=  2  无锚点=  5
0.148.0            有锚点=  5  无锚点= 21
0.149.0            有锚点=  2  无锚点=  2
0.149.1            有锚点= 18  无锚点= 18     ← 精确对半，版本零预测力
0.150.1            有锚点=  7  无锚点= 27
0.151.0            有锚点= 13  无锚点= 38
0.152.0            有锚点=  2  无锚点=  9
```

任何版本闸都会在**当前正在用的版本上**大面积误判。`K6` 的「必须按内容探测」是对的，且必须写死。

## 4. 新发现 —— §5.2 的「相邻对」锚点会在真实文件上死锁

§5.2 要求匹配 `response_item/message/role=user/msg_*` **紧跟** `event_msg/item_completed/UserMessage`。
计划记录的实测是「相邻距离 489/489 恰为 1」。**在更大的语料上不成立**：

```
msg→anchor 相邻对 = 678
距离分布          = { 1: 677,  2: 1 }
```

存在一个距离为 2 的真实反例。后果不是漏认证而是**死锁**：该文件是**新 schema**（有锚点），
所以 `K6` 的旁路不会接管它，`ATTESTATION_PENDING` 已经撤销全部写授权，而严格相邻匹配会
fail closed → **该 session 完全卡死，比 E3 本身更糟**（正是 §5.3 用来论证必须有 K6 旁路的那句话）。

**修法（进 E3 立项前必须定案）**：把「紧跟」放宽为「同一 `msg_*` 之后的**首个** UserMessage 锚点，
且中间不得出现另一条 `response_item/message/role=user`」。这保持一一对应、不引入歧义，
同时容忍中间夹一条无关记录。**并把这个距离-2 文件钉进回归 fixture**——否则下一个人照样按
「相邻」写，照样在这一个文件上死锁。

## 5. Codex 的 Stop 观察点确实存在

`.codex/hooks.json` 实测：

```
UserPromptSubmit  matcher=(无)              PreToolUse  matcher='^(Bash|apply_patch)$'
Stop              matcher=(无)   ← 无 matcher = 每轮都触发
```

所以 §5.3 点出的「纯读回合没有 PreToolUse」这个缺口，**Stop 是真实可用的兜底观察点**。

## 6. Codex 侧 `K4`：成立（真实回合实测）

在一次真实 Codex 回合里植入唯一标记 `E3L0PROBE-7F3A`，事后读该会话自己的 rollout
（`rollout-2026-09-01T15-45-42-01a05bee-…`，115 条记录）：

```
首条 user 记录（带 msg_01a05bee-a559-7040-b7db-fbef41fc34b7）  → #5
带标记的 user 记录                                              → #9
其 event_msg/item_completed/UserMessage 锚点                    → #10   （距离 1）
**首个工具调用（custom_tool_call）**                            → #16
schema：新(有锚点)=True  旧(user_message)=False                 ← 阳性对照满足
```

**用户消息在首个工具调用之前 7 条就已落盘。** 故 PreToolUse 时记录已可绑定；Stop 更晚，
必然也可绑定。结合第 5 节（Codex 的 Stop 无 matcher、每轮触发），**纯读回合那条路径同样被覆盖**。

**一处夹具教训（记下来防止后人复现）**：该回合中 Codex 自己跑 `rg` 找标记得到 `(no output)`，
一度像是「记录尚未落盘」的证据。实为**它搜错了文件**——搜的是同日更早的
`rollout-2026-09-01T13-58-21-…`，而本次会话是 `15-45-42-…`。
**空结果正合心意时必须验夹具**：若当时据此宣布 `K4` 不成立，会白白毙掉整个 E3 架构。

<!-- FILE_END: E3-L0-PROBE.md -->
