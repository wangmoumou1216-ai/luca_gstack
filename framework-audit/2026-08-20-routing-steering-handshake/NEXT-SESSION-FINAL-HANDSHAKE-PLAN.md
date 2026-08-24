# 下一 Session Handoff：只完成最终握手计划

> 交接时间：2026-08-21 10:08:06 +0800
>
> 唯一目标：把 `FINAL-EXECUTION-PLAN.md` 修到同一 SHA 通过 Plan Agent 与两路独立红队，并取得用户对该 exact SHA 的明确批准。
>
> 终点：用户完成 exact-SHA 握手后立即停止；不得进入实现。

## 1. 为什么开启这个计划

本计划由同一条真实失败链触发：

1. 用户说“进入 luca app 项目”时，框架没有把产品别名 `luca app` 唯一解析为 canonical 项目 `muse`，反而再次询问用户。
2. 用户要求优化设置页的交互结构、功能堆砌与 UI 体验时，route score 为零，agent 将其误当成“不需要 skill / flow”，随后多次停下。
3. Codex steering 的多个真实用户消息可共享一个 top-level `turn_id`；旧 anti-replay 把 transport parent 当 event identity，导致后续纠正或“继续”被拒绝，原任务无法自动续接。
4. 用户明确要求先修框架，并按“需求 → 方案 review → 计划 → 红队对抗 → 握手”的顺序完成计划；握手前不得实现。

因此，这不是设置页设计计划，而是修复“项目识别、语义路由、steering 身份与任务续接”框架根因的执行计划。

## 2. 当前计划结论

- 计划文件：`framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
- 当前计划 SHA-256：`b291db5b45a6110b62ead18f550d82966d4ff8c7c8c3847f27981a698758942b`
- 当前长度：5,375 行
- 最新独立审查：`PLAN-AGENT-REVIEW-R16.md`
- R16 报告 SHA-256：`c4b8e62b4c4b8bdffa3fb2c2c350a043e33adf8b8db062b7eeb05c1998800127`
- R16 裁决：`NOT_READY_FOR_REDTEAM — 2 BLOCKER / 0 MAJOR / 0 MINOR`
- R15 的“ordinary ledger 已满时 transfer event 无第 257 条合法落点”已经闭合，不要重做该架构。

### BLOCKER 1 — Git ref 基线已漂移

计划仍把 framework `HEAD/upstream` 与 `A0` parent 写死为 `8e9726d…`。R16 最终审查时 refs 已变为 `c9d4185f…`；交接时又变为：

- framework `HEAD`：`8e1c46d56d431d54ada9d30a3bb34d010f3e8466`
- framework upstream：`8e1c46d56d431d54ada9d30a3bb34d010f3e8466`
- 原冻结 ancestor：`8e9726d8477f8a287722c09345f07182cc86d1d5`

三笔新增提交仅改变 `framework-audit/2026-08-20-recovery-handoff-review/` 下的审计文件，但计划的 KILL-02 约束是 commit-ref identity，不能自行降级成“runtime tree 相同”。R16 报告是不可修改的失败收据；它记录的 `c9d4185f…` actual tuple 已因随后 ref 前移而过时，但 B1 结论仍成立。

### BLOCKER 2 — transfer recovery 缺少 event-bearing / no-new-event 总表

当前计划同时要求：

- 每次 security hook 都先追加一个 `TransferSecurityEvent`；
- 同一 human event 不得二写，`last_event` replay 必须拒绝；
- recovery controller、notice Stop、terminal Stop 必须在没有新 `UserPromptSubmit` 时消费或验证已持久化能力；
- scan 最后一条被 drain 的同一调用不得立即消费刚铸造的能力，但下一次无新用户消息重试必须成功。

这些要求没有输入分型，导致 controller/Stop 无合法 transition。另一个可达死锁是：E1-bound ISSUED capability 遇到 fresh E2 时，现有 `RECOVERY_CAPABILITY_BUSY` 保留 E1 能力却把 current event 推进到 E2；允许 E1 会越过用户新指令，拒绝 E1 又永远无法恢复。`RECOVERY_OWNER_BUSY/NOT_APPLICABLE` 也与 recovery owner 的 LIVE/UNPROVABLE/PROVEN_DEAD recensus 冲突。

## 3. 下一 Session 只需完成的项目

严格按以下顺序执行；任一内容编辑都会使旧 SHA 的审查无效。

1. **冻结新的真实基线**
   - 启动时重新读取 framework `HEAD/upstream`；不得把本 handoff 的 `8e1c46d…` 当作未来仍成立的事实。
   - 若审查期间 ref 再变，当前轮直接判 stale，重新冻结；不得推断 path-filtered 例外。
   - 在计划中同步 KILL-02、preflight receipt、§13 DAG、`A0` parent/ancestry、rollback ancestry，并绑定从 `8e9726d…` 到新 baseline 的 exact audit-only delta/tree。
   - 保留所有既有 worktree dirt；禁止 reset、stash、clean 或覆盖。

2. **修复 transfer 输入状态机**
   - 在 journal outcome 前增加唯一、严格、可生成的输入 discriminator，总表至少包含：
     - `NEWLY_ATTESTED_EVENT`
     - `SCAN_DRAIN_EVENT`
     - `NO_NEW_EVENT_RECOVER_CONTROLLER`
     - `NO_NEW_EVENT_STOP_PROJECTION`
     - `NO_NEW_EVENT_COMMITTED_TARGET_CLEANUP`
     - `NO_NEW_EVENT_DENY`
   - 前两类必须且只允许追加一个新 `TransferSecurityEvent`；所有 no-new-event 类禁止推进 cursor/current-event/transfer chain。
   - 非空 `transfer_scan` 始终先 drain 一条并拒绝当前 controller/Stop；scan 清空后，同一持久化 controller/display 无需新的 `UserPromptSubmit` 即可重试一次。
   - Fresh E2 必须原子 invalidates E1 capability，并以单调 sequence 铸造 E2-bound replacement；不得保留可越过 E2 的旧能力。
   - IN_PROGRESS recovery owner 的 fresh-event 分支必须按 LIVE→BUSY、UNPROVABLE→notice、PROVEN_DEAD→higher-sequence E2 capability 唯一分流。
   - 删除或重新定义作为 event outcome 的 `RECOVERY_CAPABILITY_BUSY`、`RECOVERY_OWNER_BUSY/NOT_APPLICABLE`；same-event controller retry 只能属于 no-new-event controller arm。
   - 同步 §5.3、§6.1–6.3、§7、§8.2、Stop、controller roots、schema/H-LP identities、required/forbidden fields。
   - 增加完整生成积与 biting tests：input kind × scan × journal arm × side × ledger admission × capability state × owner/liveness × current-event relation × PreTool/PostTool/Stop；必须覆盖 E1→E2、owner death、final drain→no-event retry、notice/terminal Stop、dual-write/replay 与 crash barriers。

3. **把审查周期推进到新编号**
   - 将 `PLAN-AGENT-REVIEW-R16.md` 加入 immutable failed inputs。
   - 把状态、literal required-new paths、evidence manifest、§13 DAG 与 §17 handshake 全部推进到下一未使用轮次（起始为 R17）；R17 文件若已存在则继续递增，绝不覆盖。
   - 修订后计算新的 plan SHA，并复验计划、冻结证据、agent contracts、refs 与 required-new 路径均未漂移。

4. **重新过 Plan Agent Gate**
   - 独立 Plan Agent 必须对新 SHA 从 byte 0 到 EOF fresh 审查，不继承 R16 verdict。
   - 只有 `READY_FOR_REDTEAM` 且 `0 BLOCKER / 0 MAJOR` 才能进入红队。
   - 若失败：修计划、递增轮次、重新从 Plan Agent 开始；不得先跑红队。

5. **对同一 SHA 做两路独立红队**
   - 路由红队：alias/semantic signal/route obligation/Stop/steering continuity/Plan-Skill dispatch。
   - 事务红队：attestation/anti-replay/project isolation/transfer recovery/capacity/activation/rollback。
   - 两份报告都必须明确核验同一个 plan SHA，并达到 `PASS — 0 BLOCKER / 0 MAJOR`。
   - 任一报告失败或计划字节变化：Plan Agent 与两份红队全部失效，修订并进入下一轮。

6. **提交最终握手**
   - 最后一次复验 plan SHA、Plan Agent receipt SHA、两份红队 receipt SHA、framework/downstream refs 与计划字节均未漂移。
   - 向用户只提交：计划结论、关键边界、三份 PASS 证据、exact plan SHA，并请求明确批准该 SHA。
   - `继续`、旧 SHA 或未点名当前 SHA 的同意都不算握手。
   - 用户明确批准 exact SHA 后，本 session 目标完成并立即停止；不得开始实现。

## 4. 明确禁止夹带的工作

下一 session 不得：

- 修改任何 runtime、hook、test、Luca App 或 downstream alias 文件；
- 执行 bridge、activation、migration、实现后测试或 UI/UX 优化；
- 执行任何不直接服务于本次最终握手计划的治理、审计或 cleanup；
- 修改任何既有 Plan Agent / red-team 失败收据；
- push、reset、stash、clean，或处理不属于本计划的用户改动。

最终握手之后的框架实现与设置页任务，不属于这个下一 session。

<!-- FILE_END: NEXT-SESSION-FINAL-HANDSHAKE-PLAN.md -->
