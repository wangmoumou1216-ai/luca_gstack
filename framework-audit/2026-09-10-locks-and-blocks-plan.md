# 挡与锁 · 全量清单与执行计划

> 2026-09-10 · goal（luca 原话）：「各种挡各种锁，你都给我解决了并且要以非常严谨的方式解决……把所有的问题都解决。并验证后发布推送。我给你最大权限，去解决，不要询问我。」
> NO_PIN 框架工作。执行 session：d291bde9（lucagstack-0c）。**上下文不足时，新 session 以本文件为唯一交接真值源续跑。**
> 前置交接物：`2026-09-10-project-event-attestation-lockout.md`（缺陷原始证据）、`2026-09-10-session-83807bd6-takeover-checkpoint.md`（B 判据定稿）。

## 块 0 前提门

1. **该不该解**：是。L1 已把 lucagstack-40 实际锁死两次（半天损失 + 一次被诱导的破坏性 deactivate），机器上任何 session 都可能中招，含 Claude 与 Codex。
2. **更小替代**：无。应急手段（重开 session）不是修复，下一个后台任务或 cross-session 消息就复发。
3. **默认产出偏差**：本计划的默认产出是「让闸少挡」，天然把秤压向放宽。反制：
   - L1–L6 是**纠错**：不使任何在旧代码下不会被授予的权限变得可授予。仍送独立红队，立场是**找 fail-open**。
   - L7 是**放宽既有防护姿态**：由独立冷启动红队以**默认 REFUTED** 立场审，且须评估「是否只是让本轮收口更干净」。不被驳倒才实现。
4. **KILL-1**：若任一测试或红队给出反例——真实用户回合可在其后续候选**之后**才落进 transcript——则 B 的 append-only 序判据整体作废，退回入队侧（修法 A）重设计。

## 全量清单

| ID | 挡 / 锁 | 位置 | 性质 | 处置 |
|---|---|---|---|---|
| L0 | codex `--ignore-user-config` 丢自定义 provider → 401 | `scripts/run-agent-context-ab.mjs` | 纠错 | ✅ 已修 `dddf8e2`，已推送 |
| **L1** | 合成伪事件毒化候选队列 → 永久 TURN_CLOSED。形态一 `<task-notification>` = `SOURCE_NOT_VISIBLE`；形态二 cross-session 消息 = `MISMATCH` | `project-substrate.mjs` 候选循环；`event-attestation.mjs:505/529/721/743` | 纠错 | 修 |
| **L2** | `deactivate` 连 fence 一起删 → 会话中途单向门，之后连 switch 都做不了 | `scripts/project-pin.mjs:334` | 纠错 | 修 |
| **L3** | 锁死后除重启进程外**无任何恢复路径**（prepare/begin-turn/close-turn 已退役） | `scripts/project-pin.mjs` | 缺失能力 | 修：恢复口**只能由用户开，agent 不可自开** |
| L4 | route-guard 在无法兑现的状态下仍每轮打印必被拒的 switch 事务；框架 session 因消息里出现项目名就被发 SWITCH_ONLY | `.claude/hooks/route-guard.mjs` | 误导 | 评估后修 |
| L5 | 共享 hook 日志 `/tmp/luca-gstack-hooks.log` 行内无时间戳、无 session id，并发时无法归因 | `.claude/settings.json` 7 处 + `.codex/hooks.json` 3 处 `2>>` | 可诊断性 | 修（双端） |
| L6 | pending-extraction 产生端写入不可裁决条目（`Transcript-Path: unavailable`），队列只增不减 | `.claude/hooks/session-sync.mjs:337` | 纠错 | 修：确定性推导 transcript 路径 |
| L7 | 认证失败连**读**都拒（兄弟 session 第十节：失败方向配反） | `project-scope-guard.mjs` | **放宽姿态** | L1–L3 验证后，默认 REFUTED 红队审 |
| L8 | auto-mode classifier 拦 hooks 编辑 / 配置 skill | harness | 外部 | luca 已显式给最大授权 → 以新授权重试一次；仍拒则为结构性，仅剩一条用户动作 |
| L9 | 共享检出 index 碰撞（`git add` 卷入他人暂存；并发写 index 失败） | git | 协作 | 已下发纪律：只用 `git commit <路径>`；不改代码 |
| — | F14 票卡在 `aihub.firstshare.cn` 上游 502 | 网络 | **非框架** | 不在本计划 |

## Phase

- **P1 · L1**（先红后绿）：在 `scripts/test-prompt-attestation.mjs` 加用例（沿用其 lifecycle 夹具，C20 自动覆盖，不造孤儿测试）→ 对**现代码**跑，确认正例红、反例绿 → 落 B → 全绿 → 三种变异各至少一条转红 → 五套回归。
- **P2 · L2 + L3**：deactivate 保留 fence；设计用户可开的恢复口 + 测试。
- **P3 · L6 + L5**：产生端确定性推导 transcript 路径；日志行加时间戳与 session id（Claude / Codex 双端）。
- **P4 · L4**：route-guard 的无效事务提示。
- **P5 · 独立冷启动红队（串行）**：只给冻结 diff + 本清单 + 断言，不给实现过程。立场：找 fail-open、找 agent 自开恢复口的路径。
- **P6 · L7**：独立红队默认 REFUTED；不被驳倒才实现并测试。
- **P7 · 发布**：`verify.sh` + 双 harness 对账 → `git commit <路径>` → 单条 `git push upstream main` → 远端 SHA 与 CI 核验。

## 断言

```bash
# [BLOCKING] A1 — 新增毒化用例全部通过（含双码双向）
node scripts/test-prompt-attestation.mjs && echo "PASS A1" || echo "FAIL A1"
# [BLOCKING] A2 — B 的三种变异（去掉 final 判定 / 去掉站点标记判定 / 扩到全部 MISMATCH）各使 ≥1 条用例转红
# [BLOCKING] A3 — 五套回归
for t in test-prompt-attestation test-project-transaction test-event-transaction-faults test-event-switch-e2e test-project-identity-wiring; do node scripts/$t.mjs >/dev/null 2>&1 || echo "FAIL A3 $t"; done
# [BLOCKING] A4 — 全量门
bash scripts/verify.sh | grep -q "FAIL=0" && echo "PASS A4" || echo "FAIL A4"
# [BLOCKING] A5 — 远端 SHA 等于本地提交，Required Checks success
```

### 产出质量 criteria

- [C1] 任何在旧代码下会被拒绝授予的项目权限，在新代码下仍被拒绝（防 fail-open）
- [C2] 恢复口在无用户参与时不可被 agent 触发（防门自己发钥匙）
- [C3] 损坏型 MISMATCH（383/386/816/828）与 EVENT_REPLAY / CANDIDATE_SCHEMA / BOOTSTRAP_UNATTESTED 仍整体拒绝
- [C4] Claude 与 Codex 两侧各自独立验证，不以单侧成功宣称 parity
- [C5] 每条用例写完经变异确认会咬，无恒绿断言

## 执行记录

（按 Phase 追加）

### 2026-09-10 执行记录

- **L0 发布核验**：`dddf8e2` 的 CI（Required Checks）success。丢失 session 的 `0284578` 同批发布。
- **L8 定性更新（结构性）**：对 `event-attestation.mjs` 的**纯附加、行为中性**改动（error 增 details 参数）同样被 classifier 拒绝 → 拦截按控制面路径生效，与改动内容无关。已在 luca 显式给出最大授权后重试一次并失败，不再以任何形式重试。由备用 session 代改＝跨 session 权限洗白，不做。唯一解：luca 在 `.claude/settings.local.json` 加入 `Edit(//Users/luca/Desktop/项目/muse/lucagstack/.claude/hooks/**)`。交付给 luca 的命令已在副本上验证：两次执行幂等、只新增该规则、其余内容语义完全一致。
- **L1 判据修正（取证于真实 transcript，取代 checkpoint 中「四站点」表述）**：task-notification 与 cross-session 消息在 Claude 源里只落成 `queue-operation`(enqueue/remove) 与 `attachment`(queued_command) 记录；task-notification 另以 `tool_result` 块出现在工具结果里。二者**从不成为 root human 行**。所以毒候选之后若有真实回合，扫描到的首条人类行就是那条真实回合 → `MISMATCH`。可跳过站点收窄为 **505（Codex）/ 721（Claude）两处**。529/743（not yet visible）不纳入：非队尾候选在游标后找不到人类行时，队尾候选扫描同一段必然同样失败，纳入只扩大面、永远不会带来恢复。
- **安全不变量（B 的核心论证）**：跳过不推进游标，因此授权只可能来自「游标后首条人类行」与队尾候选逐字节一致。被跳过的候选在 source 中没有属于自己的回合，偷不走任何真实回合。
- **红测试已写入** `scripts/test-prompt-attestation.mjs`（8 条，沿用其 lifecycle 夹具，C20 自动覆盖，不造孤儿测试）：Codex 毒候选跳过；Claude cross-session 形态跳过；连续两条合成 prompt 跳过；队尾是合成 prompt 仍 fail-closed 且下一条真实回合自愈；只有合成 prompt 时整体拒绝且不发布状态；早先候选的完整性失败不得跳过；畸形候选不得跳过；已消费回合的重排副本被跳过时不产生任何重复消费。Claude 行形状全部抄自真实 transcript。
- **同族锁 L1b（待评估）**：「人类行有、候选没有」——route-guard 未入队、候选队列满、或 deactivate 清掉了待处理候选——会让其后每条候选都 `MISMATCH`，同样永久锁死。不在 B 的范围内，且修法必然涉及放宽，走 P5 独立红队。
- **L2 设计修正（待 P5 红队确认）**：deactivate 不能只「保留 fence」——若清掉待处理候选而游标不前移，被清候选对应的人类行会变成孤儿，恰好落入 L1b 重新锁死。正确形态是保留 `consumed_events`（防重放），并在 source 尾部**重建** fence。该动作只会让调用方失去全部项目权限、不可能授予权限（新权限仍须一条真实人类行才能产生），因此 agent 自调也安全，不需要另设「仅用户可开」的恢复口。
- **L5 暂缓**：修复需改 `.claude/settings.json` 7 处与 `.codex/hooks.json` 3 处 hook 命令行，爆炸半径大于其诊断价值；它所诊断的锁已在根上修。

### 2026-09-11 执行记录（中途快照，供压缩/交接续跑）

**B（候选队列毒化）— 在隔离 worktree 验证完毕，等放行落活体**
- 修复树：`test-prompt-attestation` 29/0；五套点名回归 + attestation-negatives 全绿；`verify.sh` 94/0/0。
- 变异：M1 去队尾闸 → 第 9 条抓住（该用例是变异测试暴露的缺口后补的）；M2 跳过任意错误 → 完整性用例抓住；M3/M4 删站点标记 → 2/4 条抓住；M6 标记加宽到 529/743 → 等价（全绿），运行时证实「not-yet-visible 标记永远不会带来恢复」。
- 活体 md5 自始至终与基线一致（worktree：`scratchpad/wt-attest`，变异专用：`scratchpad/wt-mut`）。

**L2（deactivate 单向门）— 已实现于 worktree，最终设计**
- 有 fence 的状态：丢弃绑定、在 source 尾部重建 fence、**重置** consumed-event 账本；无 fence（旧迁移产物，迁移代码不写 fence，生产可达）：沿用原删除路径。重建失败 → 拒绝、恢复链接、不发布任何状态。
- 账本重置的理由：被消费的行全部落在绑定了 source 身份与前缀哈希的游标之后，重放由游标阻止；stop-witness 检查只扫当前行之后。携带账本不承重，反而会让耗尽的账本在 deactivate 后仍然耗尽。
- 变异：保留旧游标 → 孤儿锁用例抓住；总是删除 → 5 条抓住；吞掉重建失败 → 2 条抓住；去掉 source-absent 守卫 → 专用用例抓住；**重置账本 + 复用启动 fence（重放洞）→ 重放用例抓住**。
- **未决**：账本耗尽用例的夹具无效（`ledger schema is invalid`），在所有树上都红在夹具而非断言——「携带账本」变异的"存活"因此作废，修夹具后重测。

**新发现的锁 L10**：`PROJECT_EVENT_HISTORY_LIMIT = 256`，全代码无裁剪；超过后每次认证都抛 `EVENT_LEDGER_FULL`，会话永久失去项目权限。本轮缓解：L2 的 deactivate 重置账本 = 可由 agent 自调的恢复口。根治（在认证时按游标安全裁剪账本）涉及安全核心，走 P5 红队后另评。

**我自己的错误与纠正（pending-extraction 处置）**
- 2026-09-10 我对 luca 称那 58 条「没有可定位的 transcript」，并把这句写进只追加 manifest。复核：文件名自带 session id，按 id 可在 `~/.codex` / `~/.claude/projects` 定位 **28 条**；另 **30 条**扩大到整个 `~/.codex` 后确实不存在。我当时只看了文件内 `Transcript-Path` 字段。
- 28 条已按全部记录形状重新读原文（第一次重扫时提取器漏了 Codex `response_item` 形状，21 条整齐显示 0 条消息——判为装置故障后修正）。结论：24 条维持 NO_SIGNAL 但证据需更正；`01a07145`、`01a07147`、`e4043a93` → QUALIFIED；`01a05fc3` → UNRESOLVED（sharedev 知识库两条规则的落点只能在 sharedev 绑定会话内核验），需回到 active。30 条的核心结论成立，但共享证据里「58 条同此形态」的数字错误，同样补更正。
- 处置 CLI 没有纠错通道，且被恢复到 active 的文件会被旧决定永久挡住无法再处置（治理层的一把锁）。方案：新增只追加的 `pending-correction`（`DISPOSITION_CORRECTED`，UNRESOLVED 时 `ACTIVE_RESTORED` 恢复原字节），并让旧决定被纠正后不再阻挡正常处置；健康检查把纠正计为近期动作并单独计数；测试并入 `scripts/test-hooks.mjs`。

**阻塞**：`.claude/hooks/**` 写入放行仍未落地（本地规则计数 0）。B 与 L2 的活体落地、L6、L4 均依赖它。

### 2026-09-11 执行记录（续）

- **L2 全部变异已咬**：账本夹具改为真实回合填满后，「携带账本」变异被抓住（此前的"存活"确属夹具无效造成的无效测量）。L2 全部 6 个变异均被抓住。修复树 `test-project-transaction` 34/0。
- **`pending-correction` 已在修复树实现**：只追加 `DISPOSITION_CORRECTED`；更正为 UNRESOLVED 时校验归档哈希后恢复原字节并追加 `ACTIVE_RESTORED`，崩溃后同参数重跑可续；被恢复的旧决定不再阻挡正常处置；健康检查把更正计为近期动作并单独计数 `CORRECTED`。PENDING-005 用例：修复树通过、未修复活体红在「更正必须记录为独立事件」。5 个变异（旧决定仍阻挡 / 先追加后校验归档 / 去幂等 / 健康不计数 / 跳过字节恢复）全部被抓住。
- **修复树全量 `verify.sh`：PASS=94 FAIL=0 WARN=0**（含全部新测试）。
- **更正计划已生成**（`scratchpad/corrections-58.json`）：54 NO_SIGNAL（24 条可定位原文、证据改为真实读取结果；30 条确实不存在、计数更正）、3 QUALIFIED、1 UNRESOLVED。落地前先在真实 manifest 的副本上预演。
- **P5 独立红队已派发**（冷启动、fable、默认驳倒），审冻结补丁：代码 `f23ecd78…`、测试 `da80bcc3…`；报告落 `framework-audit/2026-09-11-b-l2-redteam.md`。红队↔修订 ≤2 轮，仍有存活 BLOCKER/MAJOR 则不宣称握手、交 luca 裁决。
- **旁注（不扩范围）**：`daily_governance.py` 遇到未知子命令会静默落入整套每日调度并 exit 0。

### 2026-09-11 执行记录（更正已落地）

- **58 条错误处置记录已在活体 manifest 上更正**：先在真实 manifest 副本上预演（首次预演 0/58，原因是装置未处理 macOS `/var`→`/private/var` 真实路径，CLI 严格拒绝、未写入任何东西；修正装置后 58/58），再落地 `pending-correction` 到活体并执行。结果：58/58 成功；原记录逐字保留（只追加）；新增 58 条 `DISPOSITION_CORRECTED` 与 1 条 `ACTIVE_RESTORED`；`01a05fc3` 以原字节恢复为 active（UNRESOLVED，须在 sharedev 绑定会话内核验知识库规则落点）；其余归档未动；同参数重跑全部 already_complete 且 manifest 字节不变；健康检查 `CORRECTED=58`。
- **L6 已在修复树验证**：Stop 捕获在 payload 缺 `transcript_path` 时按 session id 定位（Claude projects 布局 / Codex 日期 rollout 布局，按目录类型遍历、零散文件不打断），定位不到仍显式 `unavailable`。PENDING-006：修复树通过；3 个变异（去掉定位 / 遇零散文件整体中止的朴素遍历 / 定位不到时猜路径）全部被抓住。活体落地依赖 hooks 放行。
- **活体未提交改动**：`memory/scripts/daily_governance.py`（更正 CLI，活体已在用）与 `scripts/test-hooks.mjs`（PENDING-005/006）、`scripts/test-prompt-attestation.mjs`、`scripts/test-project-transaction.mjs`。其中 PENDING-006 与 B/L2 用例在 hooks 落地前于活体为红，因此不能单独提交；待 hooks 放行落地后连同终版闭合复审一并提交。

### 2026-09-11 我造成的附带阻塞与处置

- **现象**：我把 TDD 红测试（B/L2 用例、PENDING-006）直接写进共享活体检出。修复在 hooks 放行前无法落地，这些用例在活体上必然为红，于是活体 `verify.sh` 对所有 session 都是 92/2（C20 `test:project-transaction`、C11 `check:hooks`）。接手演进扫描的 `lucagstack-63` 因此以 DONE_WITH_CONCERNS 收尾，已本地提交 `e80bbc1` 但**没有推送**——它把这两项红判为邻居 session 的在途改动，这个判断是对的。
- **根因**：先红后绿的「红」只应存在于隔离副本；共享检出里的红测试等于给每个并行 session 的提交门挂了一把锁。
- **处置**：确认修复树副本与活体逐字节一致后，把 `scripts/test-prompt-attestation.mjs`、`scripts/test-project-transaction.mjs` 还原为 HEAD；从活体 `scripts/test-hooks.mjs` 移除 PENDING-006（PENDING-005 保留——其 CLI 已在活体，用例为绿）。全部新用例完整保留在 `scratchpad/wt-attest`，随 hooks 落地一并回到活体。
- **`e80bbc1` 的发布**：在其干净检出上独立跑 `verify.sh`（该提交走了 `FAST_COMMIT=1`，门禁实际未跑），通过后再推送。

### 2026-09-11 P5 红队裁决（第 1 轮）与修订决定

报告全文：`framework-audit/2026-09-11-b-l2-redteam.md`（冷启动、确认运行在 fable、默认驳倒；冻结补丁哈希校验通过；隔离副本实跑 219/219，verify 94/0）。

- **C1 不 fail-open / C2 标记范围 / C3 append-only / C4 防滥用 / C5 deactivate 只降权 / C7 测试可信：均 NOT REFUTED**。C6 双 harness NOT REFUTED 但有覆盖缺口。
- **F1（MAJOR，基线既有，我判定成立并修）**：斜杠命令产生的人类行（`origin.kind:'human'`、无 `promptSource`）按设计不可认证，但 Claude 扫描循环先对"游标后首条人类行"做来源校验，于是抛出不带标记的 `PROVENANCE_MISMATCH`——排在它之后的**每一条**候选都被挡死，会话永久失去项目权限。修法：该行不参与候选匹配（它本就不能授权），`assertNoNewNativeUser` 仍把它计为用户介入。安全不变量随之精确化为：授权只来自「游标后首条**可认证形态**的人类行」与队尾候选逐字节一致；队尾之后出现任何人类行（含斜杠行）仍 fail-closed。
- **F2（MAJOR，覆盖缺口，修）**：deactivate 的 CLI 端到端测试全部硬编码 Claude，Codex 重建路径只有红队探针验证。补 Codex 端到端用例（经 `project.sh` 真实走 CODEX_HOME 环境管线）。
- **F3（MINOR，修）**：生产调用方丢弃 `result.unwitnessed`，审计只剩匿名 stderr 一行。修法：substrate 的 stderr 行带上 session id（与 L5 的日志归属缺口同源，最小补丁）。
- **F4（MINOR，不可达，记档不改）**：重建时两个 transcript_path 皆空的分支在当前调用路径下不可达；若可达会抛错拒绝，方向安全。
- **F5（信息）**：红队自身一次 cwd 遗漏与一次命令超时转后台——后者在实况中复现了缺陷报告的触发器。
- **下一步**：修订完成后，把「冻结补丁之后的全部改动」（F1/F2/F3、更正 CLI、L6、L4）打成新冻结补丁，派发终版闭合复审（第 2 轮，也是契约上限）。仍有存活 BLOCKER/MAJOR 则不宣称握手，交 luca 裁决。

### 2026-09-11 第 1 轮修订结果与残留裁决

- **F1 是实况中的锁，不只是红队的合成夹具**：扫描全部 142 个会话 transcript，运行时 2.1.259 与 2.1.261 确实把 `/wait-what`、`/loop` 记为 `origin.kind:'human'`、**无 `promptSource`**、内容为 `<command-message>…<command-name>/…` 的用户行（本地命令如 `/login` 不带 origin，本就被跳过）。已修：该行不参与候选匹配、不授予任何权限，`assertNoNewNativeUser` 仍把它计为用户介入。用例使用真实行形状：斜杠行排在真实回合前 → 真实回合认证、斜杠候选记为 unwitnessed；斜杠命令出现在队尾回合之后 → 仍 `INTERVENING_USER`、不发布状态；队列只有斜杠回合 → fail-closed。
- **F2 已补并闭环**：Codex 端到端用例经 `project.sh` 绑定 → deactivate → 断言重建 fence 仍在 Codex 源上 → 已消费回合在账本重置后仍 `EVENT_REPLAY` → 被拒的重放候选留在队首、B 跳过它、下一条真实回合认证并重新绑定。修复树 35/0；未修复 `e80bbc1` 上红在「重建的 fence 不在」；变异「去掉 CODEX_HOME 管线」使其转红（报 source 不可见），证明环境管线确被执行。
- **F3 已修**：跳过记录的 stderr 行带 session id。
- **L4 已在修复树验证**：harness 合成消息得到显式 `HARNESS_MESSAGE` 决策——不打印切换事务、不产别名候选、只排队 turn 意图。dry-run 用例带对照组（同一句话由人说出仍路由为 PROJECT_SWITCH）；hook 用例 STICKY-008h 以紧随其后的 STICKY-008c 为对照。未修复代码上两条均红；3 个变异（去掉该决策 / 对合成消息仍计算具名项目 / 只识别跨 session 消息）全部被抓住。
- **残留裁决（明示，不隐藏）**：
  - **L1b**（真实人类行没有对应候选，如 route-guard 崩溃或队列满）仍会让队尾候选 MISMATCH。本轮不重构队尾扫描语义：B 让队列满几乎不再发生，且 L2 使 deactivate 成为 agent 可自调、只降权的恢复口；重构会显著扩大合同允许的最后一轮评审面。列为下一轮候选。
  - **L10**（账本 256 上限）同上，deactivate 重置账本即恢复。
  - **L7**（认证失败是否应降级为只读）交终版闭合复审独立判断，默认立场反对削弱——我是被该闸约束的一方，不自裁。

### 2026-09-11 第 2 轮终版闭合复审已派发 · 落地方式决定

- **冻结补丁（显式参数列表生成，含阳性对照）**：代码 `round2-code.diff` 541 行 sha256 `42a137f3…`（6 文件全覆盖）；测试 `round2-tests.diff` 886 行 `f2663163…`（4 文件全覆盖）；合计 10 文件 +1130/−31，基线 `e80bbc1`。
  - 过程中一次装置故障如实记录：首次生成时 zsh 不对未加引号变量做词分割，整串路径被当成一个不存在的 pathspec，得到**空 diff（sha256 为空输入的 `e3b0c442…`）**，同一脚本的"活体未被他人改动"检查也因此全部误报一致——而我自己改过的两个文件本应被检出。改用显式列表并以这两个文件为阳性对照后结果可信。
- **落地就绪**：除我已落地的 `daily_governance.py`（与修复树逐字节一致）和 `test-hooks.mjs`（仅含我的 PENDING-005，84 行，全部包含在修复树版本中）外，其余 8 个文件活体与上游一致——落地不会覆盖任何其他会话的在途改动。
- **第 2 轮复审**：冷启动、fable、默认驳倒；重点复验 F1 改变后的核心不变量；并独立裁决残留 L1b/L10 是否可接受（Q1）与"认证失败降级为只读"主张（Q2，默认反对削弱）。报告落 `framework-audit/2026-09-11-round2-closure-review.md`。这是契约允许的最后一轮：仍有存活 BLOCKER/MAJOR 则不宣称闭合，交 luca 裁决。
- **落地方式（不走旁路）**：luca 的本地设置里已有 `Bash(git *)`，一条 `git apply` 在技术上会被预批准并直接写入 `.claude/hooks/**`。**我不这样做**——classifier 拒绝我修改这层控制面，是为了让人签字；换一个恰好在白名单里的工具写同样的文件，就是绕过这道闸的意图。落地只在 luca 放行 `Edit(…/.claude/hooks/**)` 之后进行：按冻结补丁的 hunk 用文件编辑工具逐处改，改完逐文件核对活体与修复树逐字节一致，再同步测试、跑 verify、按路径提交、推送、核 CI。

### 2026-09-11 第 2 轮复审缺票与补票

- 第一次派发的第 2 轮终版闭合复审在中途因账户额度上限终止（`rate_limit` 429，重置 10:10 Asia/Shanghai），停在"接着跑剩下的测试"，**未产出任何报告**。报错显示实际发给 API 的模型是 `claude-sonnet-5`，而派发指定的是 fable——被静默降档，且低于 fable 白名单 P0/P1 与降级链（fable→opus）的要求。
- 按评审契约证据标准④（基建故障导致的缺票轮不算完成轮）与档位要求，**这一次不算完成的第 2 轮**，不计入 ≤2 轮的轮次上限。缺票期间冻结补丁与修复树均未改动（哈希复核一致），也未落地任何东西。
- 额度重置后：防御性停止被打断的旧 agent（防止其在低档位自行续跑产出结论），重新派发同一份冻结补丁的复审，新增第 0 步档位自检——非 Fable/Opus 立即停止并只回一行 `TIER_MISMATCH`，不再白跑一轮低档位审查。

### 2026-09-11 L1c：队尾是 harness 注入的候选 → 纳入第 2 轮

- **来源**：lucagstack-40 第 4 次锁死的现场证据（它明确要求不回复，未回复）。luca 发「muse 继续」时恰逢额度重置，harness 同一轮注入 "Your claude.ai usage limit has reset…"，两次 UserPromptSubmit 排出两条候选；注入那条在 transcript 里是 `isMeta` 记录，认证器不视为人类回合 → 队尾候选 SOURCE_NOT_VISIBLE → 前面那条真话也一起不发布。
- **本地核实（本 session transcript）**：三次额度重置注入均为 `type:user`、`isMeta: true`、`origin.kind: 'auto-continuation'`、`promptSource: 'system'`、148 字节；`/goal` 的 Stop hook 注入也是一条 `isMeta` 行。`auto-continuation` 本就在认证器的非人类 origin 清单里（同列 `task-notification`、`peer`）。
- **影响评估**：B 落地后此形态可自愈，但要等用户再发一条真话；而这类注入恰好发生在用户正发恢复指令的时刻，体验上仍是卡一轮。本 session 已多次遇到额度重置。值得修。
- **判据（结构性，非文案枚举）**：队尾候选的字节在游标后**只**以正向非人类行（`isMeta === true` 或 origin 属非人类清单）出现、且**没有**任何可认证人类行与之匹配 → 按定义不是人类回合，在循环前剔除；剩余候选按原有语义认证（有效队尾照常要求其后无人类行）。全部被剔除 → 走现有零候选分支（观察当前事件）。「没有匹配的人类行」这一条防止他方回显一条真实提示的字节来让真话被剔除。
- **为什么并入第 2 轮而不是另起一轮**：它改的是复审正在评判的同一个候选循环（证据标准⑤：复审后的改动必须回到终版闭合），且落地本就卡在 luca 放行上。已停止刚启动的第 2 轮复审以节省 fable 配额；实现、测试、变异、verify 通过后重新冻结并重新派发第 2 轮。

### 2026-09-11 L1c 实现结果与 L1d 残留

- **实现**：`event-attestation.mjs` 新增 `candidateRecordedOnlyAsNonHuman`——游标后存在与候选字节一致、且带正向非人类标记（`isMeta` 或非人类 origin）的 user 行，并且**没有**任何 human 类行与之字节一致，才判为 harness 注入；无游标、源不可读、游标不匹配一律视为"无证据"。`attestPendingProjectEvent` 在循环前只剔除**队尾**的此类候选，剩余队列按原语义认证（有效队尾照常要求其后无人类行）。
- **实现中发现并纠正的一处设计错误**：我原本加了"只剩注入时保留当前回合"的分支。首轮测试该用例失败，查代码确认 `queueProjectEventCandidate` 每次入队都会把当前回合置为 closed——注入入队时上一回合已经结束，那个分支永远走不到，是死代码，已删除。现行为：只剩注入 → 不授予任何权限，抛 `NO_PENDING_EVENT`；同时把这些可证明非人类的候选**从队列清除**（清除本身不授权），防止每次额度重置或 hook 催促都往队列里塞一条、塞满 32 格后让下一条真实提示根本进不了队列（那会退化成 L1b 锁）。
- **测试（行形状取自真实 transcript）**：注入排在真实提示之后 → 真实提示认证；回合结束后单独来的注入 → 不授权、被清除、下一条真实提示正常认证；注入之后用户又说话 → 仍 `INTERVENING_USER`；他方把真实提示的字节以非人类行回显 → 真实提示不被剔除；无回合时的注入 → 不授权并清除；注入尚未落盘 → 不凭猜测剔除（`SOURCE_NOT_VISIBLE`）。修复树 38/0。
- **变异**：去掉"有人类行就不剔除"的保护 → 回显用例转红；把"无证据"当成注入 → 未落盘用例等转红；跳过清除 → 两条"被清除"断言转红；剩零候选时放行 → 两条"不授权"用例转红。四个全部被抓住。
- **残留 L1d（明示）**：长会话在额度重置后被 harness **单独**自动续跑（队列里没有用户的真话）时，上一回合已在入队时结束，续跑的这一轮仍无项目权限，直到用户再发一条消息（B 保证那时自愈）。真正消除它需要"由源证据重新激活已结束回合"或"推迟到认证时才结束回合"——两者都会新增授予权限的路径、改动回合生命周期，本轮是评审契约的最后一轮，不塞进来。列为下一轮首位候选，附设计方向：结束回合的时机从入队推迟到 PreToolUse 认证时判定，仅当认证发现真实人类行才结束旧回合。
- **重新冻结并重新派发第 2 轮（2026-09-11）**：修复树全量 verify 94/0/0 后，从该状态冻结——代码 `round2-code.diff` 629 行 sha256 `c35d7850…`（6/6 文件），测试 `round2-tests.diff` 1006 行 `2ecb56e5…`（4/4 文件），合计 +1316/−32，上游仍为 `e80bbc1` 且冻结范围未被改动。复审新增 L1c 作为独立待驳倒声称，并把 L1d 并入残留裁决。先前 `42a137f3…/f2663163…` 冻结作废。

## Checkpoint 2026-09-11 15:40 — 全部任务清单（会话恢复后重建）

基线：upstream/main = `6f2d79d`（兄弟 session 的纯文档提交，不碰 10 个修复文件）；hooks 放行仍未给（`settings.local.json` 计数 0）；本 session 自己的候选队列已满 32。

1. **认证锁修复（B/F1/L1c/L2/F2/F3/L4/L6 + 更正 CLI）**：修复树 verify 94/0，冻结 `c35d7850…`/`2ecb56e5…`。第 2 轮闭合复审三次派发均无有效裁决（#1、#3 指定 fable 实际跑在 sonnet-5 且撞限额；#2 因并入 L1c 主动停止）。15:25 限额已恢复，改派 opus，并加 Q3（满队恢复路径）。落地前置：CLOSED + luca 放行 hooks 编辑。
2. **pre-commit 索引泄漏（lucagstack-63 报告）**：实测注入形态——普通提交相对 `.git/index`；按路径提交与 `commit -a` 绝对路径；链接 worktree 任何提交另加绝对 `GIT_DIR`。边界修法：pre-commit 在 exec verify.sh 前剥离位置类 GIT_*；新增 `scripts/test-pre-commit-env.mjs`（4 场景 × 对照/被测 + 密钥扫描顺序，共 9 项）+ verify `G5c`。未修代码 4 红；修后 9/0；M2（留 GIT_DIR）两项 worktree 红、M3（剥离挪到扫描前）4 红、M5（丢掉 verify）4 红，均与预测一致。同类站点普查：其余建 fixture 的测试（test-controlled-change、test-sync-real、test-hooks、test-project-transaction）已自行剥离，只有 test-agent-context 漏。剩：克隆内端到端（按路径提交、worktree 提交跑完整 verify）→ 修 `test-controlled-change.mjs` 注释里被本次修复改掉前提的两句 → 报告追加处置 → 落活体 → 完整门提交（不用 FAST_COMMIT）→ 推送 → CI。不需要放行。
3. **候选队列满 32 锁（本 session 正在中）**：入队满即拒；e80bbc1 下认证失败的候选永不出队，注入类提示累积到上限后真实提示无法入队。B+L1c 阻止累积；修复树里 L2 的 deactivate 重建写 `candidates: []` 并把游标移到源尾部，所以已满的 session 可经 deactivate + 下一条真实提示恢复。待复审 Q3 判定是否还需满队提示/策略。
4. **作用域守卫误拦（本 session 实测 4 种）**：G1 `cd` 到变量路径被判相对路径越界；G2 变量间接引用项目根被拒；G3 heredoc 正文（写入文件的内容）里的 `'..'` 被当成路径；G4 一次同时 grep `.github/workflows` 与 `.claude/skill-os` 的命令被判为操作共享 docs/state/topic。待隔离触发词，分清设计内 fail-closed 与真误报；真误报修 hooks → 放行 + 复审。
5. **既有残留**：L1b、L10、L1d、L5、L7(Q2)。
6. **83807bd6 遗留**：F14 投票等 aihub 上游，manifest 需在 hooks 落地后重冻；人类门 01a05fc3（需 sharedev 绑定 session）、digest 两条发现。
7. **待裁决经验**：10c85d30（lucagstack-63）、4e90e61d（lucagstack-40，本次启动认领）、本 session d291bde9 → 落地后带提交证据裁决；01a05fc3 保持 UNRESOLVED。
8. **收尾**：清理 worktree（wt-attest、wt-mut、wt-push、复审残留 r2base/r2c/r2control/round2review 与 /private/var 下一个）和 gitenv-clone/gitenv-probe；提交本 session 活体改动（daily_governance.py、test-hooks.mjs PENDING-005、checkpoint/plan/红队报告），永不暂存 `memory/retrieval-log.jsonl`。

约束：NO_PIN 不切项目；B 上线前不给 lucagstack-40 发消息；hooks 只用 Edit 落地、不用 git apply 或 Bash 写入；subagent 串行；不改全局配置；命令里用字面绝对路径，写文件内容用 Write 工具。

## Replan R-3（2026-09-11 15:50，触发：兄弟 session 报告 pre-commit 索引泄漏；本 session 候选队列满 32；作用域守卫 4 种误拦）

### 块 0 — 前提门

1. **该不该解**：pre-commit 泄漏必须解——共享检出规定的按路径提交走完整门必失败，只能 `FAST_COMMIT` 空转，本 session 的落地提交同样会撞上。队列满 32 与守卫误拦属于"挡/锁体验差"，先评估分级再定改法。
2. **更小替代**：报告建议逐个补 `test-agent-context.mjs` 的三处调用点——行数相近但只堵一个站点，同类站点已被逐个补过多次；边界一行（pre-commit 在 exec verify 前剥离位置类 GIT_*）覆盖全部现有与以后的测试，选它。
3. **KILL-1**：verify.sh 不依赖钩子注入的位置变量。若不成立，钩子内 verify 结果会与手动运行不同——以活体提交里的 verify 输出对照手动运行即可证伪。

### 块 1 — 复杂度

- 复杂度模式：Sequential（主 Agent 执行；独立复审 subagent 串行）
- 需要用户确认：否（luca 目标已授权"验证后发布推送，不要询问"；hooks 编辑权仍按权限闸等放行）
- Tier：Standard

### 块 2 — Phase

- **Phase R3-1 · pre-commit 泄漏修复**（task_execution，model_tier: core-execution；Source: `framework-audit/2026-09-11-precommit-verify-leaks-git-index-file.md` + inline "发现的问题就是要解决的问题"）
  - 产出物：`.githooks/pre-commit`、`scripts/test-pre-commit-env.mjs`、`scripts/verify.sh`（G5c）、`scripts/test-controlled-change.mjs`（注释）、`CHANGELOG.md`、报告处置节
  - 阶段门控：活体按路径提交、完整门禁通过（不设 FAST_COMMIT）→ 推送 upstream main → CI success
  - 状态：复现 / 注入实测 / 红绿 / 三变异 DONE；落地 IN_PROGRESS
- **Phase R3-2 · 候选队列满 32**（task_execution；Source: route-guard 实报 "project event candidate capacity 32 reached"）
  - 产出物：第 2 轮复审 Q3 裁决；若判需改，则满队恢复提示或策略改动（hooks → 需放行）
  - 阶段门控：Q3 有明确分级；需改则同样过红绿 + 变异 + 复审
  - 状态：PLANNED（分析 DONE：e80bbc1 下认证失败候选永不出队；B+L1c 防累积；修复树 L2 的 deactivate 重建写 `candidates: []`）
- **Phase R3-3 · 作用域守卫误拦**（task_execution；Source: 本 session 4 次实拦原文，见 checkpoint 第 4 项）
  - 产出物：每种形态的隔离复现与分级；真误报修复（hooks → 需放行）或"设计内拒绝"的判定理由
  - 阶段门控：修复须双向攻击（误拦消失 / 真越界仍拦）
  - 状态：PLANNED
- **Phase 1 主线（B/F1/L1c/L2/F2/F3/L4/L6）**：不变——opus 复审 CLOSED + 放行 → Edit 逐块落地 → md5 → verify → 提交 → 推送 → CI。

### 块 3 — 断言（R3-1）

```bash
# [BLOCKING] R3-A1 — 四个代码/测试文件与隔离克隆逐字节一致
# [BLOCKING] R3-A2 — 活体回归测试 9/0
node scripts/test-pre-commit-env.mjs && echo "PASS R3-A2" || echo "FAIL R3-A2"
# [BLOCKING] R3-A3 — 按路径提交走完整门成功：env -u FAST_COMMIT git commit -- 路径 退出 0，verify FAIL=0
# [BLOCKING] R3-A4 — 提交只含预期 6 个路径
# [BLOCKING] R3-A5 — upstream/main 等于本地 HEAD，且该 SHA 的 CI 结论为 success
```

```yaml
criteria:
  - "[C1] 提交未使用 FAST_COMMIT 或 --no-verify"
  - "[C2] 提交不含 memory/retrieval-log.jsonl 或他人在途文件"
  - "[C3] 报告与 CHANGELOG 的每条事实都能由本 session 的工具输出复核，没有未验证的影响声称"
```

### R-3 执行记录（2026-09-11 下午，额度告急时的收口点）

- **R3-1 DONE**：`97eb65a` 以按路径提交、完整门禁落地（verify 95/0，未设 FAST_COMMIT），推送 upstream main，CI 6/6 success（run 34576373446）。R3-A1…A5 全 PASS。
- **第 2 轮复审（opus 重派）**：luca 因额度要求叫停、已 TaskStop；随后 luca 在 transcript 视图里亲自恢复了它，复审继续运行，不重派、不再打断。回报前主线落地前置（CLOSED + hooks 放行）均未满足。
- **R3-2 队列满 32**：分析 DONE（e80bbc1 下认证失败候选永不出队；B+L1c 防累积；修复树 L2 的 deactivate 重建写 `candidates: []`）。等复审 Q3 分级。
- **R3-3 作用域守卫误拦定性**（隔离夹具 + 活体守卫代码，3 轮探针，脚本 `scratchpad/psg-probe*.mjs`）：
  - 根因 1（G2/G4 同源）：`rewriteBash` 的 `docs` 词正则不区分路径与数据——echo/printf 文字、带 `-r`/`-E` 的 grep 模式串（`maskSearchPatternArguments` 的无值参数表缺 r/R/E/P/o/x 等，遇到即放弃屏蔽）、写文件的 heredoc 正文里出现 `docs` 就命中；变量展开后命中时报"变量间接引用"，原因误导。
  - 根因 2（G3）：`relativeProjectReference` 扫整条命令含 heredoc 正文，`..` 被当成路径。
  - 根因 3（G1）：`cd` 目标含 `$` 一律判动态，同一命令内单次静态赋值也不解析。
  - **更严重的实证（probe3，已绑定项目的 TURN_ACTIVE session）**：同一正则会**静默改写数据文字**——`echo "=== docs mentioning"` 的文字被改成项目 docs 绝对路径；`git commit -m "update docs"` 的提交信息被改；`grep -rn "docs/handoff"` 的模式串被改，搜索结果变错；`cat > 文件 <<'EOF'` 正文被改后写进文件；printf 同。NO_PIN 下同样文字则被拒。
  - 必须继续拦截（现状全拦，修复后须保持）：python/bash heredoc 访问 `..`、`echo … | bash`、真实 docs 读写、`cd ..`、目标未知的 `cd "$P"`、变量重赋值到项目、`read R` 后 cd。
  - 现有测试约束：IDENTITY-PATH-019（动态 cd 必须拒）、023c（普通变量不误伤）、024a/b（rg 模式是数据、路径操作数仍受保护）。
  - 修法方向（**未实施**）：把"数据位"屏蔽从 grep/rg 扩到 echo/printf 参数（非重定向目标、未管道进解释器）、`git commit -m`/`tag -m` 消息、引号定界且消费者为 cat/tee 的 heredoc 正文；grep 与 rg 分表补无值参数（grep 的 -r/-R/-E/-P/-o/-x 等；rg 的 -r/-E 取值）；`cd "$R"` 仅在同命令单次静态赋值、赋值在前、名字无其他出现时解析。改 `.claude/hooks/**` → 需 luca 放行 + 独立红队（削弱防护类，默认 REFUTED，并双向攻击）。
- **未动的待办**：主线落地；R3-2 分级；R3-3 实施；待裁决经验 10c85d30 / 4e90e61d / d291bde9；提交活体里本 session 的 daily_governance.py、test-hooks.mjs（PENDING-005）与 plan/checkpoint/红队报告；清理 worktree 与克隆。

## Checkpoint 2026-09-14 — Codex 接收 d291bde9，恢复核查与发布暂停

本节追加事实，不覆盖此前历史，也不把旧会话的指令文本当成本会话工具权限。
来源：luca 本轮要求「了解全貌和所有内容以及待办，再执行」。本轮保持 framework / NO_PIN。

### 来源与恢复边界

- 原会话：`/Users/luca/.claude/projects/-Users-luca-Desktop----muse-lucagstack/d291bde9-7011-48f6-a1fe-aba09461424c.jsonl`，2571 行、7752774 bytes；截图短 ID 唯一命中。
- 已恢复主对话、排队的人类补充、兄弟会话移交、AskUserQuestion 的原始答案、压缩摘要及其后的续办、两轮评审报告；原会话 L2259 的图片已解码查看，确为演进扫描收尾截图，明确有 12 项待裁决。
- 上游 83807bd6 的原始目标与后续真人指示、演进子会话 10c85d30 的收尾、原始锁死缺陷报告和演进 digest 已用于交叉核对。没有重跑演进研究，也没有读取下游项目文件或任何真实会话的 pin/control sidecar。
- 最后有效工作停在 2026-09-11 20:14（上海）：收到 NOT CLOSED 报告后，主会话只读取修复位置和探针，随后撞 weekly limit。不能把 09-14 的 UI 时间当作执行进度时间。
- 本轮未重新向网络核对远端/CI，也未重新跑完整 verify；下列“历史发布”由本地提交与旧工具记录支持，不声称是今日远端检查。

### 今日直接核实的地面状态

- 主检出 HEAD：`97eb65a10873a661d7881ac513885a19f85a859a`，main。
- 接管前受保护改动：checkpoint、`memory/retrieval-log.jsonl`、`memory/scripts/daily_governance.py`、`scripts/test-hooks.mjs`；未跟踪的本计划、第一轮红队报告、第二轮闭合报告。没有替任何人提交、重置、清理或暂存。
- 历史提交链：`0284578`（当…时实验结果记录，不是上线守卫改法）→ `dddf8e2`（Codex 传输）→ `e80bbc1`（双月演进扫描）→ `6f2d79d`（digest 发布状态更正）→ `97eb65a`（pre-commit 环境隔离）。
- 今日 `node scripts/test-pre-commit-env.mjs`：**9 passed / 0 failed**，包括泄漏阳性对照和密钥扫描顺序；不重做该修复。
- 修复树与第二轮审查树均还在，10 个冻结文件逐字节相同。冻结 code SHA256=`c35d7850b364b0afaeb62a189f2b3e916ce6b2ef6803d17e653c87761a0f7fe6`；tests SHA256=`2ecb56e5ca93069e5691b0734eea643ad8f27a47ba8dcc42c6e220a63c05821d`，均与历史报告匹配。
- `git diff --name-only e80bbc1 HEAD -- <冻结10路径>` 无输出：提交后的基线没有改这10个路径。工作区中的更正 CLI 与修复树相同，但尚未提交；其余 hooks 主线仍未落地。
- 存量更正账本确有 **58** 条 DISPOSITION_CORRECTED：54 NO_SIGNAL / 3 QUALIFIED / 1 UNRESOLVED。此数字是更正记录数，不是新增知识数。

### 第二轮报告已返回，替代旧“等待复审”状态

权威：`framework-audit/2026-09-11-round2-closure-review.md`，结论 **NOT CLOSED**，不是缺票。
本轮在其保留的隔离副本上重跑原 `probe_scen.mjs`，未改探针或被测代码：

- PATCHED `orphan-race`：deactivate exit 0 后，新真实消息持续 MISMATCH；再次 deactivate 因 NO_PIN 拒绝；SessionStart resume 后仍 MISMATCH。BASELINE 同场景 resume 后 OK:SWITCH_ONLY。**MAJOR-1 回归复现。**
- PATCHED `nopin-orphan`：NO_PIN 有孤儿人类行时，切换 MISMATCH、deactivate 拒绝、resume 仍不恢复。
- PATCHED `accumulate`：tn_attachment_only / peer_attachment_only / slash_command 均 maxQueue=32，第33次满，新真话 MISMATCH、Read DENY，错误提示不含恢复操作。字节相同的非人类 user-row 三类对照则 maxQueue=0、真话正常。**MAJOR-2 复现。**
- PATCHED `collision-misstrip`：真实话尚未落盘、相同字节先见于非人类行时，候选被清零，之后持续 MISMATCH；BASELINE 保留候选，随后两条真话均 OK:TURN_ACTIVE。**MINOR-1 的实际回归也复现，不能漏掉。**
- 探针 exit 0 只表示探针跑完，不表示修复通过；上述失败输出才是语义判据。本轮仅复验 Claude 场景，不宣称今日 Codex 模糊测试或完整验收已通过。

### 全量剩余工作（不以旧百分比充当验收）

| 工作项 | 当前状态 / 下一步 |
|---|---|
| L1/B、F1、L1c、L2、F2/F3、L4、L6 | 隔离实现与历史回归存在，但第二轮 NOT CLOSED；先修 MAJOR-1/2 与碰撞回归，重新冻结，不能直接上线 |
| 第二轮 MINOR-2..6 | 分别是未知来源否决缺口、合成消息识别过宽/窄、斜杠回合不可授权、locator 无界/首个命中、更正恢复失败的中间态；逐条验证与定级，不把静态猜测当复现 |
| R3-3 作用域守卫 | 已有探针和根因记录，未实施；不仅误拦，还会改写 echo/printf、grep 模式、commit 消息、数据 heredoc；须区分数据与可执行路径并保留真越界负例 |
| L7 失败降级、L1d 自动续跑 | 仍是独立设计决策，不能借修锁偷改授权生命周期；读权限也需明确定义边界 |
| L1b 孤儿行、L10 账本上限 | 原“都可 deactivate 恢复”已被推翻；与恢复协议一起重新验证，不能照旧记为解决 |
| L5 日志 | F3 只补特定 stderr 的 session ID，不等于全局时间戳/双端日志归属均已完成 |
| F14 v26 行为票 | 仍空票；旧 manifest 已漂移。重新冻结与单次调用预算须按其合同确认，不能因旧调用失败无限重试；今日未探测外部 provider |
| 演进扫描 | 扫描与簿记已完成，digest **12 项**人工裁决未完成；采用/删除/新对标立项不在机器自动执行权内 |
| pending 更正 CLI | 已在工作区使用，未提交；补终版验证及 MINOR-6 中间态检查后再随批准范围提交 |
| pending 01a05fc3 | **新发现账本冲突**：09-10 更正为 UNRESOLVED 并恢复后，09-11 07:39Z 被 4e90e61d 再以“空模板”NO_SIGNAL 归档。旧计划“仍 active”已失实；该理由未回应已定位 rollout 中的两条规则，须核对裁决，不能视为 sharedev 规则已核实；本轮不跨项目读取或自动翻案 |
| 其他 pending / 清理 | 4e90e61d、d291bde9 保留；仅处理本轮启动认领的 10c85d30，不展开其他启动队列。冻结 worktree / 克隆保留到验收后再按归属清理 |

### 增量执行提议（待用户确认；未开始修订）

前提：需要解决真实阻挡，不是拆掉项目隔离。复用现有补丁和探针比重写整个认证系统更小；不新增外部研究。
模式：Sequential 主执行 + 有界独立终版复审（Supervisor）；各阶段 core-execution，评审档位派发前按当前 model-routing 核定。
Source：本轮接管请求、原计划 L1–L10/R3、第二轮报告 MAJOR/MINOR 及其真跑结果。

1. **修订门**：隔离修复 MAJOR-1/2 与碰撞；补 Claude/Codex 的未落盘、满队、NO_PIN、重放、来源损坏、未知来源测试。断言：原复审失败场景恢复可用，非法权限仍被拒；每个承重保护做能转红的变异。
2. **误拦门**：R3-3 单独补丁，数据字节保持不变；真实路径、解释器 heredoc、未知动态 cd、重赋值仍按边界拒绝。L7 不暗中并入。
3. **闭合门**：对新的 exact diff/hash 做一次有界冷启动终版复审，补齐缺失变异与双端分区；存活重大问题则停，不循环加轮。
4. **发布门**：前述门通过且本运行时写权限明确后，才用正常编辑工具落入主检出；保留脏文件；完整 verify、精确路径提交、普通推上游与 CI 核对。历史 Claude classifier 的拒绝不可通过换工具/换 harness 洗白；也不要求 Codex 伪用 Claude 的 Edit 语法。
5. **收尾门**：F14、pending 冲突与人工裁决单列；低价值治理不抢主线，未裁决不冒充已完成。

额外评审需说明的理由：R4 默认两轮已用完，而第二轮仍有两条 MAJOR；原会话 L2552 打算修后不再独立复审，不能满足“评审后改动须终版闭合”的发布合同。本轮因此先向 luca 请求批准上述增量修订及这一次有界独立复审，**不发布 NOT CLOSED 补丁**。

### 2026-09-14 授权与执行进展

- luca 明确批准：「追加复审，然后继续」，随后再次指示「你继续」。进入上述增量计划；追加一轮独立终版复审，不是无界重审。
- code-hygiene mode A preflight PASS；无清理算子，不要求清空脏树。主agent负责隔离树的 `project-scope-guard.mjs` / `test-project-scope-guard.mjs`；WA-1仅负责认证/恢复核心5文件，未触碰主检出hooks。
- 主agent scope测试：新增病例对旧守卫 **124/8**（5种数据误拦、数据静默改写、静态cd误拦、grep命令替换被遮蔽）；修订后 **132/0**。将 literalWord 故意恒置true的隔离变异 **129/3**，准确抓住2种glob泄漏及grep命令替换；还原后主修复树重跑132/0。
- scope缩窄：只遮罩可证明为字面量的数据位；不遮罩命令替换、glob、管道、printf -v、未引用heredoc或解释器heredoc。grep与rg分表处理-r/-E，未知选项保守不遮罩。仅解析紧邻cd、单次赋值单次引用的绝对字面路径，不放行未知动态cd。真实路径重写时原始数据字节必须恢复不变。
- 测试装置纠正：首版解释器heredoc负例的fixture不在嵌套项目路径，`../x`不属于受保护项目，失败不是守卫漏拦；改为nestedFramework夹具后旧/新均正确拒绝。未把该无效首测当回归证据。
- 恢复语义明确收窄：取消不可靠L1c文本匹配eager strip；注入本身不授权，后续真话可自愈。S1延迟落盘允许一次明确的再次降权恢复，不宣称第一次deactivate后无缝自动恢复；恢复后旧switch意图不保留。
- 新截图：luca报告另一Codex session中turn_id一致但PreToolUse未激活。只确认属于同一认证症状面，缺session ID不能断言同根因；不操作该活体会话状态，不把截图当新增授权。
- 发布仍待终版复审与完整门；旧副本/证据均保留，未提交推送。

### 2026-09-14 追加轮：Standards finding 已修订，delta闭合中

- 实现者WA-1最终报告在隔离树 `auth-repair-evidence.md`。主agent删除其临时 `PROJECT_TX_TEST_FILTER` 跳过开关，避免过滤不命中时0测试假绿；随后完整事务套件49/0。
- 追加Standards冷启动审查报告：`/private/tmp/d291-standards-review.md`。冻结 `takeover-final-review.diff` SHA256=`499db08844fd72b0c7c03a87f2b2ce5994c8f7b44f3bbcecb319b81dee785295`。该轴实际跑verify **94/0/0**、scope132/0、prompt43/0、transaction49/0、negatives47/0，仍判 **FAIL**：STD-01新Important，Git `--` 后或 `--file` 的值 `-m` 被误识别为消息参数，遮罩了真实docs路径；STD-02基线Minor，`git -C` 的消息仍被误改。独立Git dry-run确认`-- -m docs/x`及`--file -m docs/x`有效；`--pathspec-from-file -m docs/x`被Git自身拒绝，不把后者当成功越界证据。
- 接受并精确修STD-01/02：仅识别Git全局`-C`之后、子命令开头的连续`-m/--message`；遇未知选项/`--`/positional停止识别，真实路径保留检查。另修heredoc终止符必须整行精确匹配（尾空格不是终止），以及直接路径拒绝漏掉恢复提示。
- 新scope套件在修订前副本 **131/5**，修订后 **136/0**。标准轴的literalWord独立变异此前准确抓住2条glob负例，恢复132/0；主agent另一个恒true变异抓3条（含grep命令替换）。
- 当前冻结：`/private/tmp/claude-501/-Users-luca-Desktop----muse-lucagstack/d291bde9-7011-48f6-a1fe-aba09461424c/scratchpad/takeover-final-review-r1.diff` SHA256=`f119a0b167cc9ce570911d4dfcd2ea7843d6133da89b7cf67923f021b6f604f2`。12路径不变；相对499db源码只改scope-guard，另加scope测试与一条transaction测试。Standards正在同追加轮内delta闭合；Spec轴尚未派发，不能读Standards报告。
- 上游只读 `git ls-remote upstream refs/heads/main` 今日仍为 `97eb65a10873a661d7881ac513885a19f85a859a`。暂存区空；主检出hooks未修改，未授信/提交/推送。

### 新截图真实会话的只读核对（diagnosing-bugs）

- 已按原文唯一定位 `/Users/luca/.codex/sessions/2026/09/14/rollout-2026-09-14T09-47-49-01a09d99-6124-79c1-9342-f026346a49cd.jsonl`，L365就是截图原句。没有读实际pin；输入取L339历史工具结果里已有的状态快照。
- 纯 `attestNativeUserEvent` 回放2次均为 `MISMATCH: next Codex native user event does not match the pending candidate`；只读、无substrate状态提交。历史cursor停在record114；队列仅一条当前候选（boundary=`01a09db3-0e26-70f0-87b1-fdaa62fd641b`），其前方L230存在文字相同但turn不同的旧真实人类行（boundary=`01a09daf-11fd-7422-a312-6963edfba0b9`）。
- 对照仅在内存里把candidate boundary改成该旧行的真实boundary，校验返回该旧native row有效；原source/cursor未变。当前turn的UserMessage anchor也已存在1条。故本次阻塞点不是游标前缀损坏或单纯当前anchor未落盘，而是旧人类回合未被消费；不能因“当前turn_id=候选turn_id”就越过它。
- 归属既有L1b孤儿回合族；已补 `Codex identical prompt text with an older unqueued turn still needs explicit recovery` 回归，完整事务套件 **50/0**。只验证隔离恢复路径，不宣称真实会话已修好；真实会话的解除状态操作未执行。
- 尚未确定最初漏队的全部上游成因（日志可见此前有状态锁恢复）；不把“存在过锁”直接写成漏队的唯一原因。核心修复提供显式只降权恢复，禁止自动跳过未知旧真实行。

### Checkpoint 2026-09-14 — 追加轮未闭合，停止落地

- luca 再次强调「你的解决要兼顾codex和claude」。两端独立验证继续作为硬验收；临时夹具通过不等于已在两端部署。
- Standards 对 r1=`f119a0…604f2` delta 给 **PASS**，STD-01/02均关闭；scope136/0，回退旧guard的mutation131/5，再回生产136/0。报告 `/private/tmp/d291-standards-review.md`。该票绑定r1，不冒充后续r2票。
- Spec 对r1：R1/R2/R3/R5/R6 PASS，R4 FAIL（S-1 Important，quoted `|` 被全串正则误认成管道，文字在有pin时被改写）。四指定测试实际通过，R2独立旧cursor重放变异被捕获。报告 `/private/tmp/d291-spec-review.md`。
- 主agent只修上述词法问题：引入quote/escape识别，区分真正管道/求值与引号数据；printf -v只在option位识别；字面量先于重定向判断。冻结r2=`82363ef019606ad8d77cf95ab71351d00ac9cda5e75e98265243da783ebf0b34`，文件 `scratchpad/takeover-final-review-r2.diff`。scope137/0。
- **Spec对r2的定向闭合仍FAIL**：S-1已关闭，但S-2 Important仍在 `!command.includes('<<')` 的全串判断；`echo 'docs/x<<message'` / printf / git -m 都是已知字面量，却在NO_PIN被拒、有pin时被改写。不是未知shell语法，不可用现有137/0覆盖。按有界停止条件，双方停止继续修/审；r2没有Standards终版票，不能发布。
- **下一步需要新的用户决定**：不要继续单个字符补丁；把同一命令的quote/escape/operator识别收敛成共同判定，再做一次定向闭合。保持12路径范围、不引入shell执行或新依赖；任何新增实现/审查须用户明确允许后继续。
- 主检出HEAD仍97eb65a；生产hooks、暂存区、Git提交与远端均未改。已有daily_governance/test-hooks WIP保持，`memory/retrieval-log.jsonl`始终不暂存。旧部署patch缓存已作废；续跑必须从r2重新生成主检出→目标的差异，不能用r1缓存。

### 双端生效检查的额外人类门（不是代码测试PASS）

- 现有 `node scripts/codex-trust-hooks.mjs --dry-run` 返回“本仓条目0、第三方5”，却打印“全部已授信”。这不是本仓授信证据；本轮没有改这个脚本或第三方hooks。
- 根据 [官方App Server说明](https://learn.chatgpt.com/docs/app-server) 的版本对应schema生成能力，使用本机 `codex app-server generate-json-schema --experimental` 到 `/private/tmp/d291-codex-schema.TWKph4`；HooksListParams明确支持`cwds`。
- 显式`hooks/list {cwds:[本仓绝对路径]}`只读核对脚本：`/private/tmp/d291-hook-readback.mjs`。沙盒内CLI因无法初始化自身SQLite运行时失败；已经工具审批在沙盒外只读重跑，未做config write。
- 默认新CLI进程明确报：本仓`.codex`下的项目配置/hooks/exec policies因项目未trusted而disabled，需在`/Users/luca/.codex/config.toml`信任本仓。显式cwd仍只列5个全局hook，本仓6项adapter条目为0。只读披露的全局调用路径为hook-write.sh等，不据此改写/授权它们。
- **边界**：这证明当前默认新CLI进程的仓库级加载未通过，不证明所有已有Codex会话都无hook（截图会话历史确有PreToolUse拒绝）。不静默加`-c trusted`覆盖、不改全局信任、不据静态S12键存在宣称生效。
- 若用户批准继续部署，还须单独明确允许仅将本仓路径登记为Codex可信项目，并在读回实际本仓条目后处理必要授信；Claude端配置不因此改变。此权限决定不能由被约束agent自行替用户做。
- 两轴报告已原文保存在本仓：`framework-audit/2026-09-14-locks-standards-review.md`、`framework-audit/2026-09-14-locks-spec-review.md`。保留各自不同版本的票据，不跨轴合并或把r1 PASS当r2 PASS。

### 2026-09-14 再次批准后的收敛执行

- luca 回复「批准」：授权统一Shell操作符识别与一次定向闭合；验收后仅配置本仓必要的Codex信任，不改Claude或其他目录/第三方hooks权限。
- r3将管道/求值/heredoc原始子串分支统一为同一quote/escape-aware `shellSyntax`输出；搜索模式、echo/printf/git消息与quoted heredoc头消费同一判定，不再`command.includes('<<')`。新增single/double quoted `<<`及grep/rg模式覆盖。
- 冻结r3=`eebfb0c96d4d144e80d6201b03050aad97ee755e626ac75e19d2365a37cc87b1`（`scratchpad/takeover-final-review-r3.diff`），12路径不变。Spec对r3 PASS，S-1/S-2关闭；scope137/0，旧判据mutation136/1。Standards终版核对中，生产尚未落地。
- 精确配置helper `/private/tmp/d291-trust-repo.mjs` 默认只读`--check`；`--project`只写本仓projects路径的trust_level；`--hooks`只接本仓sourcePath与6个adapter条目。写前使用API expectedVersion/CAS、0600备份，写后对整个user layer作语义diff（只允许已授权字段变化）。只读--check当前正确exit2，projectTrust=null、repoHookCount=0。
- Standards发现helper的退出判据未要求projectTrust本身为trusted，已在执行前补齐：所有模式最后核对projectTrust；--hooks写前也核对；已trusted的--project不重复写。helper哈希`5efabba41d0219e9c21a6068969d1da967da35f15239b77251fc1208acf15174`，待独立delta确认，不计入发布代码的12路径冻结。

### 落地前检查点 — r3 双轴闭合

- Spec与Standards均对r3=`eebfb0c96d4d144e80d6201b03050aad97ee755e626ac75e19d2365a37cc87b1`给PASS，无存活finding。Standards另对helper=`5efabba…5174`给PASS，10项假RPC检查通过；真实配置尚未写。
- 当前阶段：把已审12路径落入主检出（daily_governance已相同、无需重写），逐文件比对，完整verify；之后仅执行用户批准的本仓Codex project/hook trust，并以最终`--check`确认，不能以单步`--project`成功代替全部就绪。
- 原在途文件与遥测保持；暂存区为空；HEAD/upstream均97eb65a。未做真实项目pin恢复；所有旧证据副本保留。

### 主检出验证通过，进入已批准的配置步骤

- 12个源码/测试文件已落入主检出并逐字节等于r3。首次apply补丁将一个测试段落匹配到较早的重复上下文，字节校验立即截停；仅该测试文件按完整原文与EOF约束修正后，12/12一致。未在不一致状态下继续验证或发布。
- 主检出 `bash scripts/verify.sh` 新鲜结果：**PASS=95 FAIL=0 WARN=0**，exit0。含Claude hooks副作用、Codex adapter/接线、原生事件/事务、scope、memory及跨harness检查。不是把隔离树94票改成95票。
- 下一步仅执行用户已批准的本仓project trust与必要hook trust，helper先备份/CAS、后核完整user-layer语义差异；其他目录/第三方hooks/Claude设置不在写入范围。
- self-reflection已记O-20260914-001（无新增active rule）。

### 配置信任未持久化 — 发布门暂停（不是缺用户批准）

- 用户已批准本仓信任；`--project`经工具授权执行，native API CAS写成功、完整user-layer语义差异只有目标trust_level一项。该进程读回projectTrust=trusted、本仓6hooks均enabled/trusted。
- 首次备份：`/Users/luca/.codex/config.toml.d291-backup-1789357705777`（0600）。随后独立工具调用的`--check`却exit2：projectTrust=null、repoHookCount=0。磁盘当前config SHA256与该备份完全相同（`8bc3781d40a428cdd1a62d0010315f4ada53fa3184392fbffc6965ce7c078af6`），mtime比备份晚约46秒。
- 第二次是受控对照，不是盲重试：在同一次exec中运行已审helper的`--project`后立即以新CLI进程运行`--check`，两者均exit0、6hooks就绪。下一次独立exec只读`--check`再次exit2/未信任/0条目。第二备份：`/Users/luca/.codex/config.toml.d291-backup-1789357867294`。
- 结论边界：已证实能真实写入并被另一个CLI进程读取，但跨后续工具调用不能持续；尚未区分工具边界触发与后台定时回写，未识别写入者，不能指认Luca或ChatGPT。不再循环写入、不加周期覆盖、不禁用其他guard。
- 安全只读排查：全局hook-write.sh和Codex Node启动器未命中config.toml/trust写入逻辑；进程名观测显示ChatGPT与Luca及多个Codex进程存在，这不构成任何一个是回写者的证据。未读其他项目源码、未修改Claude设置/第三方hooks。
- **当前完整状态**：主检出12文件与r3一致；本地完整verify95/0/0，双轴r3 PASS；本仓原有更正CLI/test WIP已包含在已审范围中。暂存区为空，没有新commit/push，HEAD/upstream仍97eb65a。不是“源码尚在隔离目录”，也不是“双端部署已完成”。
- **下一步**：定位配置回写控制者；若需读muse/app源码，须取得NO_PIN的精确只读引用授权，不切项目、不自行扩大作用域。信任持久化门未PASS之前暂停原计划的发布阶段；不自行以“代码先发布”替换已确认门控。

### 配置回写来源已定位为 Cockpit Tools（用户移交结果并核对）

- 用户移交：Cockpit Tools 1.3.48（com.jlcodes.cockpit-tools），不是muse/lucagstack；12:09:20那次Codex自身写入仅为项目trust_level，须与周期性恢复区别。
- 本会话只读核对Cockpit日志：`/Users/luca/.antigravity_cockpit/logs/app.log.2026-09-14` 的11:49:11.704、11:51:10.180、11:53:15.910均明确记录 `[Codex Config] 已规范化 config.toml`，目标为`/Users/luca/.codex/config.toml`，`sanitized=true`，紧跟Codex配额响应。配置`codex_auto_restore_takeover_on_launch`确为true。
- 用户另提供二进制源码路径/恢复与normalize符号。本会话未独立复核二进制；也尚未证明`on_launch`控制项会禁止配额刷新后的周期写入，不按字段名猜修法。
- 归因更新：Codex信任不能持久化的排查重点落在第三方配置管理，撤销“需要先查muse/app写回源码”的下一步要求；不切muse、不改框架去循环覆盖第三方配置、不改变现有pin。
- 此前仅获本仓Codex信任修改授权，未获Cockpit配置修改/退出应用/停止代理授权。下一步需确定最小可控项并由用户批准第三方设置变更；账号数据、其他提供商与代理运行不自动纳入。

### Cockpit 兼容处理与发布前最终检查点

- 用户随后授权「按照你认为对的去处理」。实际未改Cockpit开关、账号或代理，也未退出/停止应用。
- 根因进一步由官方源码锁定：[`v1.3.48/codex_config_format.rs`](https://github.com/jlcodes99/cockpit-tools/blob/v1.3.48/src-tauri/src/modules/codex_config_format.rs) 的`is_unsafe_projects_header`无条件把非ASCII或Unicode转义的`[projects.*]`表头判为待删，`normalize_codex_config_input`每次load执行。源码还有删除中文项目节的测试；1.3.50同处仍存在，不能靠升级假定修好。
- 原生API叶子/对象写入均生成该表头。采用合法等价TOML：ASCII父表`[projects]`下用精确项目路径的inline table表示原`trust_level="trusted"`。只改两行，前后整份配置经tomllib解析完全相同（**零语义/权限变化**）。独立复核4组合成TOML等价、已有显式父表的负例、官方删除分支，PASS。
- 写前校验完整文件hash、项目只有trust_level、无已有显式`[projects]`；备份`/Users/luca/.codex/config.toml.d291-inline-backup-20260914`（0600）。等价写后hash=`c756da11b088af9491256008c5f1509c7a1ce7237ef05d18a7349304777ea9e9`，值与备份完全等价。
- 原生Codex只读`--check`在后续独立调用中持续exit0：projectTrust=trusted，本仓6项hook均enabled/trusted。Claude权限配置与仓内`.codex/hooks.json`均未改；框架源码r3两轴PASS、本地完整verify95/0/0保持。
- 验证边界：Cockpit进程仍在，但观测期没有新的Codex配额日志，故**不伪称已做跨刷新周期黑盒测试**；兼容依据为真实原生Codex读取、完整配置语义等价及官方sanitize分支直接校验。其他工具未来若重新展开为旧表头，第三方原缺陷仍可能重现。
- 发布白名单：12个已审源码/测试文件、CHANGELOG、本任务checkpoint/plan/四份审查记录、O-20260914-001观察记录；不含memory/retrieval-log.jsonl，不含全局配置或备份。当前暂存区空，upstream/main仍97eb65a；使用精确路径提交与完整pre-commit，不设FAST_COMMIT/--no-verify，不force push。
- **本节是发布前快照**。恢复时先查`git log --all --oneline --grep='recover closed sessions'`与该提交CI，不把快照里的尚未执行误读为当前仍未发布。最终commit/push/CI证据由Git远端及会话完成报告承载，避免在提交正文里硬编码自己的SHA。
