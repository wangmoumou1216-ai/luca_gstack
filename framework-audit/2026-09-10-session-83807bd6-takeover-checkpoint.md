# Checkpoint — 接手 83807bd6 待办 + 兄弟 session 移交的锁死缺陷

> NO_PIN 框架/meta 工作。接手 session d291bde9-7011-48f6-a1fe-aba09461424c。
> 基线 HEAD: 0284578。工作树受保护脏文件: memory/retrieval-log.jsonl（永不暂存）。

## 已完成

1. **定位丢失 session**：83807bd6-bf52-45f0-a439-640c2e6d0280，2026-09-10T03:24Z 撞 session limit
   （`resets 2:10pm Asia/Shanghai`），进程已死，transcript 完整。
2. **F14 根因（单变量对照，已锁死）**：`scripts/run-agent-context-ab.mjs:827` 传 `--ignore-user-config`，
   而 codex 现在靠 `~/.codex/config.toml` 的自定义 provider `codex_local_access`
   （localhost:54134 本地代理）认证。该 flag 只丢 config.toml、auth 仍读 CODEX_HOME →
   codex 回落官方 endpoint 并把 `auth.json` 里的 agt_code 令牌当 OpenAI key 发出 → 401。
   - 对照 A（无该 flag）：成功。对照 B（有该 flag）：401。对照 C（`-c` 补 provider 表）：codex 挂起。
     对照 D（最小 CODEX_HOME）：同样挂起。→ `-c` 与最小 home 两条路均作废，夹具修法待定。
   - **那次授权调用在传输层 401，从未到达模型**：行为票未被消耗，luca 的单次授权实质仍在。
     不可变记录：`framework-audit/2026-09-10-agent-context-p6-live-v26-single.ndjson`。
   - 发射前实测 `RELEASE_BOUND`，context_sha256 = 43b6625…5b04b5，与冻结值逐字相同。

## 当前工作（队首）

**兄弟 session 移交的锁死缺陷**（`framework-audit/2026-09-10-project-event-attestation-lockout.md`）。
判定：与本轮三项均不同文件不同机制，但与 pending-extraction 产生端**同一病根**——
控制面分不清 harness 合成的伪事件与真实用户回合。故做成共用识别，不各补各的词表。

选定修法 **B + C**：
- B：`attestPendingProjectEvent` 的候选循环，对**非最后一条**且抛 `SOURCE_NOT_VISIBLE` 的候选，
  按 append-only 序argument 判定其结构上不可兑现 → 记入 ledger 后跳过；
  **跳过只在最后一条候选成功 attest 时才提交**，否则整体仍 fail-closed。
  判据不依赖识别合成 prompt 的形态（避开封闭集合枚举陷阱）。
- C：`deactivate` 会话中途销毁 fence 形成单向门 → 拒绝执行并说明。
- 反向断言必须有：所有候选均不可见时仍整体拒绝（防改出 fail-open）。
- **B 动的是安全不变量，我既是作者又是执行者 → 必须外部冷启动红队**，不得自审结案。

## 剩余（按序）

- P1 锁死缺陷 B+C + 五套回归 + verify.sh + 双 harness 对账 + 独立红队
- P2 F14 夹具修法（provider 传递）→ 跑那一格 → 更新 closure
- P3 pending-extraction：产生端修复（共用 P1 的识别器）+ 58 条批量 NO_SIGNAL + 10 条逐条读
- P4 evolution scan 2026-08/09 双月合并一轮 + digest + bookkeep

## 已知不作为的坑

- 共享 hook 日志 `/tmp/luca-gstack-hooks.log` 无时间戳无 session id，多 session 无法归因（兄弟 session 记录）。
- 任何 Bash 超 120s 转后台 → 投递 `<task-notification>` 伪 prompt → 正是本缺陷触发器。
  本 session 已因此造出 4 条毒候选；作业期间一律前台加硬超时。

---

## 2026-09-10 续：B 的判据定稿（比初版收紧，非放宽）

初版 B 只 catch `SOURCE_NOT_VISIBLE`。lucagstack-40 实证补充：cross-session 消息是同一病根的
第二形态，但错误码是 `MISMATCH`——它确实落进 transcript，只是 harness 加了包装说明，逐字节
比对对不上。初版对该形态完全无效。

但按错误码跳过是**过宽**的：`MISMATCH` 在 event-attestation.mjs 有 6 个抛出点，其中
383/386/816/828 是内部一致性损坏（anchor 出处不符、source 与 anchor 文本不一致、current 事件
身份不一致），按码跳过会吞掉真正的损坏信号。

**定稿判据：钉四个调用点，不钉错误码。** 共同语义＝「在该位置读 source，无法佐证该候选」：

| 站点 | 语义 |
|---|---|
| `event-attestation.mjs:505` | 下一条 Codex 原生用户事件与候选不匹配 |
| `event-attestation.mjs:721` | 下一条 Claude 原生用户事件与候选不匹配 |
| `event-attestation.mjs:529` | 候选 Codex 事件在 source 中不可见 |
| `event-attestation.mjs:743` | 候选 Claude 事件在 source 中不可见 |

实现：这四处附加可区分标记（如 `error.candidate_unwitnessed = true`），
`attestPendingProjectEvent` 只对**非最后一条**且带该标记的候选记账跳过。其余 16 个码 +
4 个损坏型 MISMATCH 一律整体拒绝。

**用例必须双码双向覆盖**（原计划只测 SOURCE_NOT_VISIBLE，不够）：
1. 毒候选 SOURCE_NOT_VISIBLE + 其后真实候选可兑 → 跳过，第二条正常 attest
2. 毒候选 MISMATCH（cross-session 形态）+ 其后真实候选可兑 → 同上
3. 反向：全部候选均不可兑 → 仍整体拒绝（防 fail-open）
4. 反向：队尾是毒候选 → 仍整体拒绝，下一个真实回合后自愈
5. 反向：损坏型 MISMATCH（383/386/816/828）→ 必须仍然整体拒绝，不得被跳过
6. 反向：EVENT_REPLAY / CANDIDATE_SCHEMA / BOOTSTRAP_UNATTESTED → 必须仍然整体拒绝
每条写完变异一次，确认断言会转红。

## 已产生的真实损害（记录在案）

本 session 给 lucagstack-40 发的 cross-session 消息**把它的候选队列毒死了第二次**，
它现在锁在 TURN_CLOSED。缺陷修好前不再发任何 cross-session 消息。
这条同时是形态二的活体证据来源。

## 阻塞（只有 luca 能解）

1. 写 `.claude/hooks/**` 被 classifier 拒（B/C/T4/T6 全在这几个文件里）。
   luca 说「按你的结论执行」后又试了一次，仍被拒；不试第三次、不换写法绕行。
2. `git push upstream main` 被 classifier 拒。两个提交在等：`dddf8e2`（本轮）
   与 `0284578`（丢失 session 的成果，从未推送过）。
