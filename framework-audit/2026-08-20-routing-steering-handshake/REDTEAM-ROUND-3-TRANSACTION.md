Round-3 独立事务/安全红队结论：**FAIL**

已只读核验：

- Plan：`b12f06e9786593313add0c33533041f46840ee0e306d7f19168a38fee24aaf04`，2500 行
- Plan Agent：`fc6084b94b6a08c9033f3194be20bac85f6326c18f820ac8015dea324ab5bdf9`
- Payload census：`e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`
- Transcript evidence：`386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`
- Framework/downstream baseline：`8e9726d…d1d5` / `69f1a94…d4f8a`
- 未修改任何文件。

## BLOCKER

### B-1 — route controller 的 JSON 输入在真实 Claude/Codex 工具面上不可传递

证据：

- Plan `:394-399` 要求四个 controller 接受单个 strict JSON。
- `:532-540` 把 `finalize-plan` argv 固定为无载荷的 `node <route-receipt> finalize-plan`，JSON 只能走 stdin。
- `:823-831` 禁止 pipe、heredoc、重定向、环境赋值、命令替换。
- 当前真实 Codex 载荷只有 `.codex/codex-hook-adapter.mjs:48-55` 的 `tool_input={command}`，无调用方 stdin 字段；Claude Bash 同样没有独立 stdin 字段。

反例：主 agent 已得到 Plan result，调用精确 argv 时子进程只能读到 EOF；`echo ... |`、heredoc、临时文件和 env 均违反冻结语法。于是 `classify/begin/complete/finalize` 无法消费任何合法对象，Stop 永久阻塞。

必须修改：

- 选择并冻结一个真实存在的跨 harness carrier，例如单一 canonical base64url argv：  
  `node ... <verb> --request-b64 <bounded-safe-ascii>`。
- controller 必须 cap+1 解码、canonical re-encode、校验唯一参数和精确 decoded SHA；stdin 必须 EOF。
- §3 L0 必须通过原生 Claude/Codex 工具真实执行全部四个 verb，并冻结 Pre/Post 原始载荷与成功 state CAS。若 argv 上限不通过，必须改成另一个经 L0 实证的单一架构，不能保留抽象“strict stdin”。

### B-2 — invocation fence 挡不住已加载旧 hook config、尚未调用 shim 的 CLI

证据：

- Plan `:1723-1730` 明确 C1 才扩大 Pre/Post matcher 并改 fail-closed。
- `:1853-1856` fence 只覆盖 shim invocation lease。
- `:1882-1896` 扫描 session/lock/invocation 后直接 B2→C1→pointer→unfence。
- `:1905-1910` 因而过度声称不会加载 mixed bundle。
- 现有 `.claude/settings.json:21,31,42,53,63,73` 命令带 `|| true`；旧进程会把 G3 的 exit-2 阻断吞掉。现有 `.codex/hooks.json:28-48` matcher 也比计划中的 C1 完整 matcher 窄。

反例：

1. 进程 P 在 fence 前读取 B2 hook config，但尚未触发 SessionStart/shim，因此没有 invocation lease 或 v3 session state。
2. activator 发布 fence、扫描为空、切到 C1/G3 并 unfence。
3. P 此后才运行其已缓存的旧命令。Claude 的 `|| true` 吞掉 G3 deny；旧 matcher 还完全漏掉 C1 新增的工具类别。
4. P 成为“G3 payload + B2 registration/exit policy”的混代 session，可绕过 v3 gate。

必须修改：

- activation fence 必须覆盖“CLI 读取配置之前”的启动 rendezvous，而非仅 hook invocation。
- 必须加入 PID/start-token 绑定的 Claude/Codex 进程 census 与机械 launch inhibition；fence 期间任何 pre-C1 config consumer 都必须终止或使 activation 失败。
- 增加阻断 fixture：进程在 B2 读取 config 后暂停，待 C1/pointer/unfence 后再发 SessionStart/Agent/未知 mutation tool；它必须仍被拒绝。
- 若无法机械禁止原生 CLI 启动，则不能声称原子在线激活，必须改成可证明的完整宿主停机/重启协议。

## MAJOR

### M-1 — ordinary execution PostTool 未纳入 lazy attestation，且单 in-flight 状态没有发行 CAS

证据：Plan `:144-147,468-471,567-580,692-704,723-724,888-890,1198,1725-1727`。

`attestPending()` 仅明确覆盖 PreTool、Plan-Agent PostTool 和 Stop；普通 execution PostTool 却会写 outcome/推进 step。执行 snapshot 又只能表示一个 `EXECUTION_IN_FLIGHT_STEP/native_tool_call_id`，但没有定义 execution tool capability 的 `ISSUED→IN_FLIGHT→CONSUMED` CAS 或第二个并行 PreTool 的 BUSY 结果。

反例：同一 assistant 输出两个并行工具调用；二者从同一 step 通过 PreTool。随后 steering prompt 将 gate 置 pending，第一个普通 PostTool仍可在未 attestation 下推进 successor；第二个调用无法被 singular tombstone 表达。

必须修改：

- 定义严格的 `execution_tool_capability` 和 session-lock CAS；一次只能有一个 native call，第二个 PreTool 必须 BUSY/deny 且不消费 capability。
- 每个会改变 session state 的 PostTool 都须先 `attestPending()`；若它属于已释放旧调用，只能写 completion tombstone/outcome，禁止签发 successor。
- 增加双 PreTool 并发、两 PostTool 之间 steering、PostTool 与 D/Stop 交叉 fault tests。

### M-2 — pending queue overflow 留下无人可认领的 native delivery，AUTH_BLOCKED 实际不可恢复

证据：Plan `:853-866,954-977,1031-1035,1134-1140,2240-2242`。

第九个 genuine human delivery 在 max-8 时没有 candidate 表示，却只进入 `AUTH_BLOCKED(PENDING_CAPACITY)`。处理完前八个后，第九个 native group 留在 cursor 前；第十个 candidate 只能与第九组 mismatch，并按规则被消费且 cursor 不前进。以后每个 candidate 都重复此结果。

必须修改：

- cap+1 必须直接进入明确的 `ROTATION_REQUIRED(PENDING_CAPACITY_UNREPRESENTED_DELIVERY)`，或持久化足以唯一消费该第九组的 overflow tombstone。
- 不得把这个状态称为可恢复 AUTH_BLOCKED。
- 增加“八个 pending + 第九个真人 + 第十个真人”的 live/fault fixture。

### M-3 — recovery ledger 的 16 条硬上限可永久封死唯一恢复通道

证据：Plan `:1056-1059,1134-1135,1326-1334,1601-1615`。

16 次合法 reissue/BUSY/dead-owner reauthorization 后，第 17 次控制 fail-closed。旧 sid 的 mutation core 又不能由新 sid 接管，导致 RECOVERY_REQUIRED 永久无终态；这不是安全降级，而是恢复协议自身耗尽。

必须修改：

- 定义可验证的 terminal-attempt checkpoint/哈希链压缩，同时保留 native cursor anti-replay与 monotonic `attempt_seq`；或定义精确的 recovery-only 新 sid transfer capability。
- 加入“第 16 次后 controller 死亡，第 17 次人类 reauthorize”测试，必须得到唯一恢复结果，不能只返回 capacity deny。

### M-4 — persistent NO_PIN 没有持久化单调 epoch，deactivate 后下一次 switch/new 无法形成精确命令

证据：

- v3 shape `:1044-1068` 的 NO_PIN 没有必填 epoch counter。
- N 可产生 fresh S：`:1348-1354,1371-1374`。
- public switch/new 必须带 `--expected-epoch`：`:1514-1527`。
- deactivate 又保留 persistent NO_PIN：`:1690-1692`。
- 2026-08-11 冻结不变量要求 identity/epoch 绑定及 commit `epoch+1`：`SESSION-CHANGE-DECLARATION.md:54-64`、旧 plan `:383-395`。

反例：BOUND epoch 7 → DEACTIVATE → NO_PIN → NEW。计划既没有状态字段可提供 expected epoch，也禁止 synthesized epoch。重置为 0 会破坏单调性；从未定义的 `last_committed_tx` 推导则没有 schema/hash/CAS 合同。

必须修改：

- `project.epoch_counter` 必须在 NO_PIN/BOUND/所有 transient 中必填，初始为 0，每次成功 commit 单调加一。
- `S.expected_epoch` 只能复制当前 counter；NO_PIN identity、H/LP、recovery core 与 rollback 都须绑定它。
- 增加 epoch 7→deactivate epoch 8→new expected 8→BOUND epoch 9，以及 stale 0/7 deny fixture。

### M-5 — project-only same-parent D 没有可验证的 presentation 对象

证据：

- D schema `:654-677` 只有 status/wait_event，无 display bytes/SHA/challenge。
- same-parent matrix `:1348-1355` 可在没有 route obligation 时直接 store/replace D。
- exact scope-drain display 流程 `:1406-1412` 只定义在“live route subphase”上。
- `:1510-1511` 却允许 project-only D 仅按 creating-event rule Stop。

反例：纯项目 switch/new/deactivate 在当前轮创建 D，assistant 没展示继续语法或展示错误文本，Stop 仍无机械 display 条件可核对；下一轮 bare continue 可消费 D。

必须修改：

- 新增独立严格 `project_presentation`，或扩展 D，持久化 canonical-base64 display、SHA、challenge、creating event/boundary、UNVERIFIED/VERIFIED。
- project-only D 也必须先 exact Stop projection，再进入 WAITING_CONFIRMATION；下一事件不得解决未验证 display。
- 三种 operation × missing/wrong/right display 均需 live fixture。

### M-6 — evidence manifest 的“four census files”遗漏真实 Codex capture 配置

证据：

- Plan `:2072-2075` 仅写“the four census files”。
- `PAYLOAD-CENSUS.md:14-23` 明列 3 个 reproducible inputs + 2 个 receipts，共 5 个：
  `collector.mjs`、`claude-settings.json`、`workspace/.codex/hooks.json`、两份 events。
- 隐藏配置当前 SHA 为  
  `00c65bc7c79e78b415c6f0db2dcd65f7cc5a967fbafaa1b5a631fc44f30d1728`。

Codex hook command/trust/capture设置可在 review 后漂移而不触发 KILL-04，原始 receipt 的 provenance 因而未闭合。

必须修改：

- §12.3 必须逐路径枚举并 hash 上述五个文件，不能写计数。
- `workspace/README.md` 也须明确“manifest-listed”或明确排除。
- 对五个规范文件逐个做 one-byte drift→KILL-04 测试。

未另列 MINOR；其余已攻击面中，D(NEW) 双 recensus、commit 后不回滚、state+ledger 单 rename、placeholder `command:null`、旧 schema deny/new-sid rollout 等未发现独立于上述问题的新 BLOCKER/MAJOR。由于存在 **2 BLOCKER + 6 MAJOR**，该未改 SHA 不得进入握手或实现。
