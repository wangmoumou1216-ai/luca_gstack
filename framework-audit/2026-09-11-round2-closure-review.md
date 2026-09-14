You are powered by the model named Opus 5. The exact model ID is claude-opus-5.

# 第 2 轮终版闭合复审 · 2026-09-11

立场 default-REFUTE。协调方要求立即收尾（额度将尽），本报告只使用已实际跑过的命令和已观察到的输出。没跑的一律标 NOT VERIFIED，不推定成任何一边。

路径缩写：`<S>` = `/private/tmp/claude-501/-Users-luca-Desktop----muse-lucagstack/d291bde9-7011-48f6-a1fe-aba09461424c/scratchpad`，`<R>` = `<S>/r2final.Z15OBc`。
隔离副本共三份：`<R>/rt`（e80bbc1 加两个冻结补丁）、`<R>/base`（纯 e80bbc1）、`<R>/mut`（同 rt，留给变异用，本轮未用）。
操作约束：活体 `.claude/hooks/**` 未改动；未读 `.session-project-*`；所有命令前台运行且显式给 timeout；未发 cross-session 消息。
三个 worktree 保留供复现，清理命令为 `git -C /Users/luca/Desktop/项目/muse/lucagstack worktree remove --force <路径>`。

## 0. 哈希与基线

- `shasum -a 256 <S>/round2-code.diff` = `c35d7850b364b0afaeb62a189f2b3e916ce6b2ef6803d17e653c87761a0f7fe6`，一致。
- `shasum -a 256 <S>/round2-tests.diff` = `2ecb56e5ca93069e5691b0734eea643ad8f27a47ba8dcc42c6e220a63c05821d`，一致。
- `git -C <live> diff --stat e80bbc1 6f2d79d` 只改了 2 个文档（`2026-09-evolution.md`、`2026-09-11-precommit-verify-leaks-git-index-file.md`），与补丁的 10 个文件无交集。
- `git -C <R>/rt apply` 两个补丁均成功，`diff --stat` 为 10 files, +1316/-32。

## 1. 运行时分区

在 `<R>/rt` 上跑。每条命令都经 `python3 <R>/run.py <R>/rt <秒> <cmd>` 执行，cwd 设为副本根。

| 命令 | 结果 |
|---|---|
| `node scripts/test-prompt-attestation.mjs` | rc=0，PASS 行 38，FAIL 0 |
| `node scripts/test-project-transaction.mjs` | `PASS=35 FAIL=0` |
| `node scripts/test-event-attestation-negatives.mjs` | rc=0，PASS 47，FAIL 0 |
| `node scripts/test-event-transaction-faults.mjs` | rc=0，PASS 6，FAIL 0 |
| `node scripts/test-event-switch-e2e.mjs` | rc=0，PASS 1 |
| `node scripts/test-project-identity-wiring.mjs` | PASS 7，`ALL PASS` |
| `node scripts/test-hooks.mjs` | rc=0，PASS 72 行，`ALL HOOK/MEMORY REGRESSION TESTS PASSED`；READ-GRANT-LIFECYCLE 3 条 SKIP（READ_GRANTS_ENABLED=false） |
| `node scripts/test-route-guard.mjs` | `PASS=243 FAIL=0` |
| `bash scripts/verify.sh` | `PASS=94 FAIL=0 WARN=0`，耗时 254.6s |

纯 e80bbc1 副本上没有跑整套测试，只跑了 2.1 节的场景探针。

## 2. 自建探针（已实跑）

### 2.1 场景探针

命令：`node <R>/probe_scen.mjs <R>/rt PATCHED` 和 `node <R>/probe_scen.mjs <R>/base BASE`。
夹具：Claude harness，走真实 `project.sh`，project-scope-guard 与 route-guard 都以子进程方式运行。

| 场景 | PATCHED | BASE |
|---|---|---|
| S1 已绑定；用户 prompt P 已排队但行未落盘；PreToolUse 对 `bash scripts/project.sh deactivate <sid>` 的判定 | ALLOW，状态 TURN_CLOSED | 同左 |
| S1 执行 deactivate | exit=0，保留 fence | exit=0，无 fence |
| S1 P 行随后落盘；下一条真实切换 prompt | **FAIL:MISMATCH** | FAIL:BOOTSTRAP_UNATTESTED |
| S1 再下一条真实 prompt | **FAIL:MISMATCH**（队列 2） | FAIL:BOOTSTRAP_UNATTESTED |
| S1 第二次 deactivate | exit=1：requires a closed binding, got NO_PIN | 同左 |
| S1 SessionStart resume（`initializeProjectEventFence`）后发真实切换 prompt | **FAIL:MISMATCH** | OK:SWITCH_ONLY |
| S1c 对照组：P 行先落盘再 deactivate | guard 放行，但 PreToolUse 发布了 TURN_ACTIVE；deactivate exit=1：got TURN_ACTIVE | 同左 |
| S2 NO_PIN；一条人类行没有对应候选；再发切换 prompt | FAIL:MISMATCH；deactivate 被拒（NO_PIN）；resume 后仍 MISMATCH | 同左 |
| S3 已认证回合后注入 40 次：tn_user_row（type:user，origin task-notification，字节与候选一致） | maxQueue 0，下一条真实 prompt P2 OK:TURN_ACTIVE | maxQueue 32，第 33 次满，P2 MISMATCH |
| S3 auto_continuation（isMeta，字节一致） | maxQueue 0，P2 OK | 32 / 33 / MISMATCH |
| S3 peer_meta_row（字节一致） | maxQueue 0，P2 OK | 32 / 33 / MISMATCH |
| S3 tn_attachment_only（只有 queue-operation 和 attachment 行） | **maxQueue 32，第 33 次满，P2 MISMATCH，Read DENY** | 同左 |
| S3 peer_attachment_only | **32 / 33 / MISMATCH** | 同左 |
| S3 slash_command | **32 / 33 / MISMATCH** | 32 / 33 / PROVENANCE_MISMATCH |
| S3 满队时 route-guard 的提示 | 「project event candidate capacity 32 reached。本轮不得访问项目路径。」，**不提 deactivate** | 同左 |
| S3 满队后已绑定 session 执行 deactivate，再发真实切换 prompt | exit=0，然后 OK:SWITCH_ONLY | exit=0，然后 BOOTSTRAP_UNATTESTED |
| S4 真实 prompt 的字节已出现在一条非人类行里，而它自己的人类行未落盘 | NO_PENDING_EVENT，队列清零；人类行落盘后后续 prompt 连续 **MISMATCH**；deactivate exit=0 可救 | SOURCE_NOT_VISIBLE，随后两次 OK:TURN_ACTIVE |
| S5 注入行先于真实 prompt 行落盘 | SOURCE_NOT_VISIBLE，状态字节不变；真实行和 assistant 行落盘后 Stop 为 OK:TURN_ACTIVE，dropped=[recorded-as-harness-injection] | SOURCE_NOT_VISIBLE；Stop 为 SOURCE_NOT_VISIBLE |
| S6 队列里只剩注入时的清除写入 | NO_PENDING_EVENT；只有 candidates 变化；状态 TURN_CLOSED，current 为 closed | 不清除 |
| S7 已绑定 alpha，对 alpha/CONTEXT.md 发 Read：打字回合 / 斜杠命令回合 / task-notification 回合 / 额度重置续跑回合 / 首个工具调用早于落盘 / 同回合落盘后 | ALLOW_REWRITE / DENY / DENY / DENY / DENY / ALLOW_REWRITE | 最后一项为 DENY（队列已被斜杠行卡死），其余同左 |
| S8 用户自己粘贴以 `<task-notification>` 开头、正文含「切换到 beta 项目」的文本 | 显示 harness 提示，无切换事务，排队 turn 意图；认证为 OK:TURN_ACTIVE，binding 仍为 alpha | 产出切换事务，认证为 SWITCH_ONLY |

### 2.2 差分模糊（攻击 R7）

命令：`node <R>/probe_fuzz.mjs <R>/base <R>/rt 1500 20260911`。
范围：Claude harness；每例 1–5 个候选、0–8 行随机记录，行种类含 typed human / 斜杠 / auto-continuation / task-notification / peer / isMeta / attachment / assistant，并注入字节碰撞；绑定与未绑定两种状态；85% pre-tool，15% stop。

结果：BOTH_REFUSE 1352，SAME_GRANT 41，BOTH_NO_AUTH_OK 31，NEW_GRANT_DECLARED 76。76 条按原因分：marker-skip 41、marker-skip+slash 11、strip 9、marker+strip+slash 2、strip+slash 1、slash 6、marker+strip 6。另外 PATCHED_CLEAR_PUBLISHED 43（叠加计数，不计入 1500 的总和）。
以下各项均为 **0**：`INVARIANT:*`、`NEW_GRANT_UNDECLARED`、`DIVERGENT_GRANT`、`BASE_ONLY_GRANT`、`BASE_OK_PATCHED_FAIL`。

对补丁输出逐例检查的不变量：
- 授权所依据的原生行，必须是游标后最后一条人类行（斜杠行也算人类行）。
- 该行字节必须等于剔除后剩下的最后一个候选；若为切换，tx 也必须一致。
- 每个按注入剔除的候选，游标后都有字节一致的非人类 user 行，且没有字节一致的人类行。
- 失败时发生写入，只允许 NO_PENDING_EVENT 这一种，且只能改 candidates。

### 2.3 真实 transcript 形状普查

只输出计数和前缀类别，不输出任何内容。命令：`python3 <R>/shape_scan.py 21` 和 `python3 <R>/shape_scan2.py 21 4e90e61d`。

- 扫描近 21 天的 136 个 transcript。user 行分布：typed 332、queued 63、suggestion_accepted 1、**无 promptSource 的 human 行 3 条，全部是 `<command-message>`**（版本 2.1.259 / 2.1.261 / 2.1.267）、origin task-notification（promptSource system）72、auto-continuation（isMeta）11、peer（isMeta）5、无 origin 的 isMeta 行 100、unknown-kind 0。
- 同一文件内，非人类行与人类行字节完全一致的情况：**0**。
- task-notification 行见于 2.1.237 至 2.1.267。queued_command attachment 的 prompt 字节与 TN 行、peer 行都不相等。peer 行的 `<cross-session-message` 标签不在偏移 0，而在内部偏移处（5/5）。
- 缺陷报告对应的会话 4e90e61d：含 1 条 TN 类型的 type:user 行（2.1.267）和 1 条 queued_command(task-notification) attachment。
- 初步推断：缺陷报告实测候选字节就是 TN XML，且没有任何 user 行文本等于它；而这份 transcript 里确有 TN user 行。二者合起来说明，真实 TN 行的字节不等于 UserPromptSubmit 收到的字节，R2 的剔除对原始触发器很可能不生效。hook 侧的 prompt 字节需要读 hook 状态才能直接观测，而这被禁止，所以 **NOT VERIFIED**。

## 3. R1–R9 逐条

**R1 斜杠行跳过：NOT REFUTED。**
- 证据：斜杠行在前 / 队尾之后出现斜杠行（INTERVENING_USER）/ 队列只有斜杠行，三条测试均通过。模糊测试中 20 条涉及斜杠行的新授权全部满足不变量。普查中无 promptSource 的 human 行只有 `<command-message>` 一种。
- 尝试过：寻找其他无 promptSource 的人类行形态（普查未见）；队尾之后的斜杠行（测试和模糊均判 INTERVENING_USER）。
- 残留见 MINOR-4。

**R2 队尾注入剔除：**
- 权限侧 NOT REFUTED。模糊测试 0 次 bad-injection-drop。S5 认证失败时不写入，Stop 路径正确。S6 与模糊中 43 次清除写入都只改 candidates。
- 可用性侧部分 REFUTED。「真实提示不会被剔除」在字节碰撞下不成立（S4），会留下孤儿人类行，后续全部 MISMATCH，见 MINOR-1。普查中碰撞为 0。
- 对真实 TN/peer 是否生效：NOT VERIFIED，初步倾向否。

**R3 HARNESS_MESSAGE：权限侧 NOT REFUTED。**
- S8：用户粘贴这类文本不产切换事务，只排队 turn 意图，认证落在原 binding，没有扩权。
- 功能侧：粘贴文本失去了原有的切换路由；正则锚定偏移 0，而真实 peer 行的标签在内部偏移处，可能漏识别（初步）。见 MINOR-3。

**R4 按 session id 定位 transcript：**
- 测试层 NOT REFUTED（test-hooks 中 PENDING-006 通过）。
- 「开销有界」NOT VERIFIED。读代码（`session-sync.mjs:43-68`）：遍历全部 `~/.claude/projects/*` 或 Codex 的年/月/日目录，没有显式上限；Claude 分支取第一个命中的目录，不做歧义检查。该路径只在新写 pending 时触发（`:369-370`）。见 MINOR-5。

**R5 处置更正 CLI：** NOT VERIFIED，除套件内 PENDING-005 外没有自建探针。
- PENDING-005 已通过的内容：只追加；同参数重跑不再追加；UNRESOLVED 恢复原字节；被取代的决定不阻挡再处置；未知目标被拒；篡改归档被拒且不追加；健康检查计 CORRECTED=2。
- 读代码判断（未执行）：ACTIVE_RESTORED 只有在恰好存在一条 ACTIVE_REMOVED 时才会写出，所以一次真正没做完的归档移动无法借「被取代」豁免。
- 另见 MINOR-6。

**R6 第 1 轮修订：NOT REFUTED。**
- Codex 端到端 deactivate 用例真实调用 `bash scripts/project.sh deactivate`，环境带 CODEX_HOME 和 LUCA_ACTUAL_HARNESS=codex；用例已读、已跑且通过。
- 实际 stderr 中观察到 `session <uuid>`。但没有任何断言检查这一点，也未做变异验证。

**R7 不 fail-open：**
- Claude 侧 NOT REFUTED（2.2 节模糊测试：0 条未声明的新授权，0 条不变量违反）。
- Codex 侧 NOT VERIFIED，没做模糊，只有既有套件；读代码可见剔除对 codex 直接返回 false（`event-attestation.mjs:934`）。

**R8 deactivate 只降权：**
- 「只降权」NOT REFUTED：没有任何探针从 deactivate 得到授权；S1c 被拒；无法重建时拒绝且不发布（测试）；无 fence 的旧状态走原删除路径（测试）。
- 「不是单向门、可恢复」**REFUTED**：S1 竞态，见 MAJOR-1。

**R9 双 harness 与测试可信：**
- Claude 和 Codex 两侧套件均通过。
- 变异：**NOT VERIFIED，本轮 0 个变异**（协调方叫停，`<R>/mut` 已备好未用）。恒真断言审计：NOT VERIFIED。
- 已确认的覆盖缺口：新测试没有覆盖 S1 竞态、NO_PIN 无恢复路径、attachment-only 形态的累积，也没有检查满队提示。两条 MAJOR 在全绿套件下存活。

## 4. 发现清单

**BLOCKER：未发现。** 覆盖范围：九项运行时分区全绿、场景探针 S1–S8、1500 例 Claude 差分模糊，均未出现 fail-open。Codex 未做模糊，未做变异。

**MAJOR-1 · deactivate 重建 fence 的竞态会造成 session 终生锁死**
- 位置：
  - `scripts/project-pin.mjs:316`：只允许 BOUND / TURN_CLOSED。
  - `scripts/project-pin.mjs:337-340`：调用重建 fence。
  - `.claude/hooks/lib/project-substrate.mjs:656-686`：fence 设在当前源尾部，候选全部丢弃。
  - `.claude/hooks/lib/project-substrate.mjs:625`：fence 已存在时 SessionStart resume 不做任何事。
  - `.claude/hooks/project-scope-guard.mjs:907-913`：`project.sh deactivate` 不受拦截。
- 失败场景：
  1. 已绑定 session，用户 prompt 已排队但行尚未落盘。
  2. agent 的第一个工具调用就是 `bash scripts/project.sh deactivate <sid>`，guard 放行，exit 0，fence 重建在 prompt 行之前。
  3. prompt 行随后落盘，成为游标后的孤儿人类行，此后每个队尾候选都 MISMATCH。
  4. 再次 deactivate 被拒（NO_PIN），同 sid resume 也不重建 fence。
  5. 基线在同一序列下 resume 后可以恢复。
- 加重因素：S1c 表明 prompt 行一旦落盘，PreToolUse 就发布 TURN_ACTIVE，deactivate 被拒。也就是说，agent 自己调用的 deactivate 只能在认证失败的窗口里成功，而这个窗口恰好包含「行未落盘」。
- 前提与未核实部分：「首个工具调用时 prompt 常未落盘」引自缺陷报告第四节，我没有自测；resume 是否保持同一 sid 未核实。

**MAJOR-2 · attachment-only 的 TN/peer 与斜杠命令仍会累积到 32，满队后的恢复路径不可发现，且对 NO_PIN 不存在**
- 位置：
  - `.claude/hooks/lib/project-substrate.mjs:591-592`：容量上限。
  - `.claude/hooks/lib/event-attestation.mjs:932-951`：剔除要求存在字节一致的 type:user 行。
  - `.claude/hooks/route-guard.mjs:1684-1685`：满队提示。
  - `scripts/project-pin.mjs:316`：NO_PIN 不能 deactivate。
- 失败场景（S3）：40 次注入后队列到 32；下一条真实 prompt 进不了队，认证 MISMATCH，Read 被拒；提示不提 deactivate。已绑定 session 可以靠 deactivate 恢复；NO_PIN 不能（S2）。
- 现实相关性（初步）：原始触发器 TN 很可能字节不一致（2.3 节），所以补丁的防累积对它可能不生效；累积上限实际只取决于「32 次注入之前有没有一条真实 prompt 认证成功」。
- 不是回归：基线在六种形态下全部累积。

**MINOR-1 · 字节碰撞导致误剔真实 prompt，留下孤儿行**
`event-attestation.mjs:932-951` 配合 `project-substrate.mjs:833-843`。S4 实测复现；deactivate 可救；普查中碰撞为 0。

**MINOR-2 · 剔除只让 human 行一票否决（读代码，未执行）**
`event-attestation.mjs:947`：字节一致的 unknown-kind 行不会否决剔除，清除路径因此可能清掉一个只以未识别来源形态记录的候选。不产生授权，因为 attestClaude 遇到 unknown 行会 UNKNOWN_SCHEMA。普查中 unknown 行为 0。

**MINOR-3 · HARNESS_MESSAGE 识别过宽与过窄**
`route-guard.mjs:49`、`:1609-1623`。
- 过宽：用户粘贴以标签开头的文本会失去切换路由（S8）。
- 过窄：真实 peer 行的标签在内部偏移，正则锚定偏移 0，可能漏识别（初步）。
- 只影响展示，不涉及授权。

**MINOR-4 · 斜杠命令回合永远拿不到项目权限**
S7 实测 DENY，基线相同。写在斜杠命令参数里的切换意图无法落地；后续有真实回合时，这条候选被静默跳过（`event-attestation.mjs:735`、`project-substrate.mjs:883`）。

**MINOR-5 · transcript 定位器无显式上限、取首个命中（读代码）**
`session-sync.mjs:43-68`。

**MINOR-6 · 更正 CLI 在恢复失败前已追加更正事件（读代码，未执行）**
`daily_governance.py` 中 `pending_correction_cli`（起于 `:1191`）先在 `:1278` 追加 DISPOSITION_CORRECTED（RESTORE_PENDING），再在 `:1281` 调用恢复。若 active 路径被无关文件占用，`_restore_corrected_pending` 在 `:1166-1168` 抛错，CLI 返回 1，但更正事件已经写入。路径腾出后同参数重跑可以续上。

## 5. 变异

**NOT VERIFIED，本轮 0 个。** 计划中、未执行的变异：
- 删除 `event-attestation.mjs:735` 的斜杠跳过行。
- 删除 `:947` 的 human 否决。
- 去掉清除写入。
- 删除 `daily_governance.py` 中 `not in restored` 过滤。
- 让定位器恒返回空串。
- 在重建 fence 时沿用旧账本。

## 6. Q1 / Q2 / Q3

**Q1 残留是否可接受**
- (a) 人类行无对应候选：初步判断为，对已绑定 session 可以作为残留接受，前提是恢复路径可发现，且不被 MAJOR-1 的竞态吞掉。「残留都可通过 deactivate 恢复」对 NO_PIN 不成立：S2 实测 deactivate 被拒，resume 后仍 MISMATCH。
- (b) 账本 256 上限：可接受。测试「deactivate resets an exhausted event ledger」通过。
- (c) L1d：可接受。S7 实测续跑回合没有权限；要消除它就得新增授权路径，按「默认反对削弱」不应放进本补丁。

**Q2 失败方向**
- 修复后正常运行中仍然存在读被拒的证据（S7）：斜杠命令回合、task-notification 回合、额度重置续跑回合、首个工具调用早于落盘，这几种情况下读取本 session 已绑定项目自己的文件，全部 DENY。所以这个主张不是单纯为了让收口好看，被拒的代价是真实的。
- 但「认证失败降级为只读」本身是一次削弱。它需要单独的威胁模型（读的是哪个 binding、TURN_CLOSED 的 binding 是否仍可信、共享展示软链）和独立红队，不应并入本轮，也不应作为本补丁的闭合条件。

**Q3 候选队列上限 32**
- (a) 补丁只对「type:user 非人类行且字节一致」的形态阻止累积（S3 中三种形态 maxQueue 为 0）。attachment-only 的 TN/peer 和斜杠命令仍会累积到 32。真实 TN/peer 是否字节一致：初步倾向否。
- (b) 已绑定 session：deactivate 会清空队列，下一条真实切换 prompt 能拿到 SWITCH_ONLY（S3 恢复行），路径真实可用。但满队提示和 scope-guard 的拒绝文案都不提 deactivate；NO_PIN session 没有这条路；且受 MAJOR-1 竞态影响。「派发本复审的 session 此刻处于满队」这一说法：读其状态被禁止，**未核实**。
- (c) 分级：落地前必须补的 MAJOR（即 MAJOR-2）。不是回归。

## 7. 闭合结论

**NOT CLOSED。**

存活项：MAJOR-1（deactivate 竞态造成终生锁死，R8 被驳倒）、MAJOR-2（满队累积与恢复路径不可达）。

另有未验证项：R9 变异（0 个）、R5 自建探针、R4 有界性、Codex 侧模糊、真实 TN/peer 的 UserPromptSubmit 字节是否等于 transcript 行字节。

下一位复审最该先跑的 3 条：
1. `node <R>/probe_scen.mjs <R>/rt PATCHED orphan-race nopin-orphan accumulate`：复现两条 MAJOR；修复后应转为可恢复。
2. 在 `<R>/mut` 删除 `.claude/hooks/lib/event-attestation.mjs:735` 的斜杠跳过行，先用 grep 自证该行已不在，再跑 `python3 <R>/run.py <R>/mut 280 node scripts/test-prompt-attestation.mjs`，确认 slash 用例转红。同法对 `:947` 和 `daily_governance.py` 的 `not in restored` 各做一次，完成后从 `<R>/rt` 用 cp 还原并核对哈希。
3. `python3 <R>/shape_scan3.py 21`（已写未跑）；并在一次真实后台任务通知时抓取 UserPromptSubmit 的 payload 字节，与 transcript 行比对。

## 8. 一句判断

有两条被审方的声称会让收口显得比证据更干净：Q1 的「残留都可通过 deactivate 恢复」在 NO_PIN 下不成立，竞态下 deactivate 反而造成终生锁死；R2 的「剔除注入防止队列累积」对 attachment-only 通知和斜杠命令不生效，对真实 TN 也很可能不生效。本报告没有为了收口软化任何一条。
