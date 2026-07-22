# luca_gstack 标杆对标 — 延后项 BACKLOG

> 来源：2026-06-01 标杆对标报告（`luca_gstack-标杆对标报告.md`）。
> 这些是经红队 + 对抗辩论确认 **gap 真实、但现在做会变死代码/虚假信心/低价值** 的项。
> 不是否决，是 measure-first 延后。**每条带触发条件——条件满足即应执行，别忘。**
>
> **⚠️ 触发器纪律（2026-07-21 收口 Pass 立）：** 上面那句「条件满足即应执行」只有在**触发器真会响**时才成立。
> 本轮体检发现多条触发条件挂在无人读的面上（冻结文件、只写 stdout 的 hook、循环自锁的信号），
> 于是「延后」事实上退化成「遗忘」。**今后新增延后项，触发条件必须同时写明 `观察者：<谁在哪个必经界面看得见>`**；
> 写不出观察者的，就不是延后项，是待裁决项。（同源纪律：`SC-20260715-001` 新建信号面须同改动接通消费端。）

## 已落地（本轮已做，不在此列）
#16 复杂度回归哨兵、#6 Phase5.1 反向 PRD 源、#3' 红线节填实、#7 不确定性跨链承载、#14 TL;DR 漂移哨兵。
（全部经行为级 A/B 验证真改变 LLM 执行行为；#16/#14 实跑脚本，#7/#6 双臂 A/B 旧丢新带。）

## 已回退（行为级证伪）

### #1 — tech-spec Phase 2.5 反抽象自检
- **为何回退**：行为级 A/B（opus + 默认 Sonnet 各 2 试）显示，**不加 2.5 的旧版也 2/2 把无 MUST 支撑的投机模块标了**——旧 Phase 2.2/2.3 本就要求「每个组件标注来源（哪条 PRD 需求驱动）」，模型已在反向溯源。2.5 唯一可测的额外效果是过度标记一个合理的观测组件（LatencyMonitor），偏负面。违背 Simplicity-First（不加不 demonstrably 改变行为的指令）。
- **🔔 触发条件**：若未来 skill 默认下沉到更弱模型（haiku 级）且观测到投机模块漏标，再重测 2.5 是否有价值。
- **未测维度**：本次只测「抓已存在的投机模块」，未测「阻止模型从零生成投机模块」（难测）；如该路径出现膨胀问题再评估。

---

## 延后项（带触发条件）

### #2 — Bi-temporal supersedes 读侧一致性过滤
- **真实缺口**：写侧 `consolidate_memory.py:388` 已解析 `valid_until` / `supersedes`，读侧 `get_memory.py` / `search_memory.py` 的 `parse_semantic_facts()` 不消费 → 已作废/过期的旧事实仍会被检索出来污染当前判断。
- **为何延后**：当前 `promoted-facts.yaml` 里 **0 条** 事实带这两个字段。现在加 ~20 行读侧过滤 = 未经测试的死代码，无法验证真生效。
- **🔔 触发条件**：晋升流程**第一次真正写入** `supersedes` 或 `valid_until`（即出现第一条被取代的事实）→ 立即补读侧过滤 + 用该真实数据做一次过滤回归测试。
- **✅ 已闭合（2026-07-22，luca「一并解决」授权）**：读侧过滤已落地——`get_memory.py` / `search_memory.py`（两处 parse_semantic_facts + fallback）加 `filter_superseded_expired`：剔除被取代（id 在任一活跃 fact 的 supersedes 集）与过期（`valid_until < today`）的事实。悬空 supersedes（目标不在 store）容错——集合判定只影响真实存在的旧事实。
  会咬（临时 promoted-facts 造 NEW(supersedes OLD)+OLD+EXPIRED+DANGLING）：get_memory 与 search_memory 均只返回 NEW+DANGLING，OLD/EXPIRED 被过滤。回归钉 `test_bitemporal_readside_filters_superseded_and_expired`（46/46）。
  `check_memory_health.py` 原「带 supersedes 即 FAIL」绊线**已解除**，改为轻校验（supersedes 目标若仍作为 stable 留在 promoted-facts → 提示归档，不阻断）。
  **结果**：放行 `SC-20260715-006`/`SC-20260716-001` 后 verify **不再转红**，且被取代的旧事实真退场（此前只是绊线提示，未真过滤）。

### #4 — framework/ PreToolUse 硬阻断
- **真实缺口**：`framework/` 只读目前只有 PostToolUse 警告（事后），无 PreToolUse deny（事前硬阻断）。
- **为何延后**：被防事件 **全历史 0 次命中**（git log 显示 framework/ 仅 1 次 baseline commit，0 次只读警告触发；html-prototype 复制母版而非原地改）。verify.sh + git 已是真正兜底层。防的是从未发生的事。
- **🔔 触发条件（2026-07-21 修订，原文两臂均不可用）**：
  - ~~`run-log.jsonl` 出现命中~~ —— **永不可能成立**：该文件被 `memory/README.md` 显式 FREEZE 且明令勿新建采集，本检出磁盘上根本不存在。此臂作废。
  - post-edit 警告首次命中 —— **可回查但无自动观察者**：`post-edit.mjs:54-55` 只 `process.stdout.write`、仓内零落盘，但该警告以 `hookEvent:PostToolUse` **持久落在 harness transcript**（`~/.claude/projects/**/*.jsonl`，实测可 grep 到 framework/ 相关 PostToolUse 记录）。即"有痕迹、但只有人做取证才看得见"。
- **✅ 2026-07-21 裁决（D3，luca 授权收口）：两个候选方案都不做，理由如下。触发条件改为人可报告判据。**
  - **不做 append observations（红队①方案）—— 因为它是假解决**：`post-edit.mjs:54` 只在 Write/Edit（有 `tool_input.file_path`）时执行。而真正漏的是 **Bash 向量**（`sed -i`/重定向写 framework/，`file_path` 为空，该行根本不执行）——那时 append 也不会发生。所以①方案只覆盖**已经有 transcript 痕迹**的 Write/Edit 向量，对真正漏的 Bash 向量照样漏。它盖不住红队②自己指出的缺口，是冗余 + 无自动消费者（本 Pass 反复批判的"写了没人读"模式）。
  - **不做 PreToolUse deny —— 撞硬闸 + measure-first**：deny 是唯一能盖 Bash 向量的设计，但 = 新 hook = 新机器（本 Pass 硬闸：默认不新建机器），且被防事件在 luca_gstack 历史 **0 次真实命中**（红队找到的 2 次 PostToolUse 命中归属存疑、且在 todo-capsule/muse-gstack 别的项目）。防从未发生的事 = 死代码。
  - **触发条件（最终）**：「luca 报告一次 framework/ 误写」**或**「首次在 transcript grep 到本仓 framework/ 的真实误写命中」。观察者=luca（人）+ harness transcript（可回查）。
- **🔓 决定权交回 luca**：真实缺口（Bash 向量全盲）是真的，盖住它需要放开硬闸加 PreToolUse deny。若你认为该防患于未然（哪怕 0 历史命中），说一声我加（~30 行 hook + 显式 escape 保护母版正当维护）。默认按 measure-first 不加。
- **落地点**：新增 PreToolUse hook（~30 行）。

### #8 — 失败 Phase 重跑前产物归档
- **真实缺口**：P2-V 序号化是**纯文档约定、零代码实现**（全仓 grep P2-V 只命中 skill-invariants 定义自身）；brainstorm 等 file-name 型 skill 写固定路径，同日重跑直接覆盖上一版产物。
- **为何延后**：git working tree 已兜底实际损失（外部项目均 git 仓，失败产物可 stash/diff 找回）。新增 `phase-N.attempt-N` 目录约定会与 history.sh 扫描产生命名歧义。
- **🔔 触发条件**：真出现一次「重跑覆盖了想对比的失败产物、git 也没兜住」→ 再做最小版：orchestrator 重试前对失败产物 `git stash` 或加 `-attempt-N` 后缀（复用已有机制，不新建目录树）。
- **观察者：none —— 按构造不可观测**（2026-07-21）。覆盖写不留痕；失败产物若从未 commit，git 里既无旧版可 diff 也无东西可 stash。系统在损失发生时不发任何信号，只有人事后想比对才发现"没了"。
  暴露面比原文写的更小：`skill-invariants.md` 的 P2-V 目录型产出豁免已把 open-design / figma-demo 类排除，实际只剩单文件型 skill 的同日重跑。
  **红队否决「就地关闭」**（风险仍在，只是观测不到）。**处置**：维持延后，触发条件改写为人可报告的判据——「luca 报告一次『想比对失败产物却找不回』」。不为此建监视机制（成本远超风险）。

### #17 — 记忆治理积压低频自动提醒
- **真实缺口**：candidates/review 队列积压无主动提醒，靠人记得手动跑脚本。
- **为何延后**：队列实测近空（1 stale / 0 其余）；session-restore 已发 5 个启动 stdout 块，第 6 个会饱和提醒通道、淹没承重的 Project Gate 提醒。且原方案依赖**已否决的 #12**（自动抽取候选记忆）。
- **🔔 触发条件**：治理队列积压 **≥ 某非空阈值（如 ≥5 条 pending）** 且持续 → 再加**单行**提醒，并设非空阈值（队列 0 项时静默，不占提醒通道）。
- **落地点**：`scripts/session-restore.mjs`。effort ~1 行 + 阈值判断。
- **2026-07-09 审计更新（F1-03/F2-06）**：触发条件曾被确定性满足（pending-extraction 积压 11 个）而无提醒——但根因是 trivial session 也写 stub + 无 GC，已修（trivial 不写 + marker 回收 + 7 天 TTL GC），存量 7 天内自然排干。本条降级为观察项：修复生效后若队列仍复积压再启用。
- **🔴 2026-07-21：触发条件当前确定性满足，且送达链实测断开** —— 实跑 `consolidate_memory.py --json`（只读 dry-run，权威 store）：`stale=7 / awaiting_approval=2`，共 **9 条 pending ≫ 阈值 5**，最老 `SC-20260630-001` 已 21 天。
  「已被每日 digest 覆盖」**不成立**：`session-restore.mjs:375` 的 digest 预览是 `slice(0, 14)`，而 07-21 digest 的「超期候选」节标题在第 14 行、条目在**第 15-20 行**——正好切在窗外；且 digest 送达是每检出每天一次给任意先到 session。
  pending-extraction 那一支确已修好（两检出均 0 个 stub），积压**转移**到了 candidates 队列本身。
  **红队否决「就地关闭」**：在触发器正响的那一刻关掉条目，是本 Pass 自我服务偏差最重的一条。
- **✅ 送达链已修（2026-07-21，luca 裁决 D1）**：`session-restore.mjs` 的 digest 预览不再是固定 `slice(0,14)`，改为**按「待你裁决」整节收尾**（找不到该节时退回 14 行，硬上限 40 行防刷屏）。
  实测对 07-21 digest：窗口 14 → 23 行，可见候选 id 从 7 → 13，此前被切掉的 6 条超期候选（`SC-20260630-001` 等）现已进入启动提示。**未新增第 6 个 stdout 块**（正是本条当初担心的通道饱和）。
  仍开着的是本体：「提醒到了也没人裁」属人工节奏，不是机制缺口。

### #20 — sync_claude_fallback 反向校验（audit 2026-07-07 F2-08）
- **缺口**：`fact_id in content` 全文匹配会把 CLAUDE.md prose 引用误判为「已镜像」（路由节确实引用 SC-20260523-002/003 这类写法）；check_memory_health 只做两个单向差集，缺「白名单已晋升事实必须出现在 SF 节」的反向校验。
- **已做**：镜像通道断裂（marker 缺失）时不再静默、有 stderr 告警。
- **✅ 已完成（2026-07-21 收口 Pass）**：`check_memory_health.py` 的 SF 一致性段现为**双向**——新增「白名单 ⊆ CLAUDE.md SF 节」反向断言，且匹配**限定 SF 小节切片**（按 `Static Fallback` 标题定位到下一个标题为止），不再全文匹配。
  会咬三段证据：①现状 PASS ②从 SF 节删掉 `SF-003` → FAIL 指名该 id ③还原 → PASS；另测**关键区分性用例**：把 `SF-003` 从 SF 节删除但在文末留一句 prose 引用（旧的全文匹配会误判"已镜像"）→ 仍 FAIL。
  `consolidate_memory.py:513` 的 `fact_id in content` 全文匹配仍在（写侧），但读侧已有硬门兜住，不再是静默失效。

### #21 — archive 后 episode 检索不可见（audit F2-09，DECIDE）
- **缺口**：search_memory/get_memory 只读热 index（50 条满），archive/2026.jsonl 的 7 条真实决策记录对任务检索不可见；而 append_episode 分配 seq 时扫 archive——archive 被视为数据但检索层未跟上。
- **候选修法**：search_memory 默认并入 archive，或加 `--include-archive`。待 luca 裁决（涉及检索性能与噪音权衡）。
- **观察者**：`search_memory.py:547-553` 的 miss 提示行（"另有 N 条已归档不在检索面"）——只在检索发生时提示，属弱观察者。
- **📈 2026-07-21 实测：问题在放大** —— archive 从本条写就时的 **7 条 → 46 条**（+`noisy-2026.jsonl` 4 条），而热窗 `index.jsonl` 恰好 50 条已满：**不可检索面已与可检索面等量**。
- **✅ 已裁决并落地（2026-07-21，luca 裁决 D2）**：加 `--include-archive` 开关，**不默认并入**（零默认噪音、零性能回归）。
  `search_memory.py` 新增 `load_archive_episodes()`（逐行标 `_src` 真实来源）+ `--include-archive` 参数；`search()` 按行溯源，归档命中的 `source/path` 指向 `archive/2026.jsonl` 而非 index（防指错文件）。开关开启时不再打印「不在检索面」提示。
  会咬双向：归档独有条目 `EP-20260516-001`「标准开发规范升级」——不带 flag 检索不到（只返回噪音），带 flag 命中 score 51（exact query phrase）。`npm run test:memory` 41/41 通过，默认行为零变化。

### #18 — IN_PROGRESS 崩溃恢复路径无 writer（reader/writer 失配）
- **真实缺口**：三个 reader 消费 `status: IN_PROGRESS`（`session-restore.mjs:13` / `route-guard.mjs:477` / `session-sync.mjs:24,31`，后者据此写 `docs/handoff` checkpoint），但全仓**无 writer**——11 个含状态导出的 SKILL.md 一律 `export _STATUS="DONE"`，`write_state.py:76` 默认 DONE，无任何路径写 IN_PROGRESS。recovery 分支永不触发。`plan-agent.md:317` 又把 IN_PROGRESS 记为合法 Work-Agent 状态，故不是纯死代码而是**半接线 scaffold**。
- **为何延后**：原"在 orchestrator/入口一处写"修法**不成立**——orchestrator 是 prompt 行为 prose 非进程（`orchestrator.md:4-7`），只管 workflow mode，而真实 4/4 项目均 `mode:"standalone"`；无 PreToolUse/Task hook 强制单写点。唯一可写点仍是 per-skill prose，且崩溃发生在 entry-write 之前仍丢状态。DONE-only 不写 handoff 是**有意设计且 test-locked**（`session-sync.mjs:30` + `test-hooks.mjs:79-81`）。
- **🔔 触发条件**：真实 **workflow-mode** 运行中出现一次崩溃恢复需求（被打断后需从 IN_PROGRESS 节点续）→ 再**决断二选一**：要么各 skill 加 entry/exit 两段写接通 reader，要么删掉 orphan reader 分支（Simplicity-First）。在此之前不动。
- **落地点**：各 SKILL.md 状态导出段 **或** 删 `session-restore.mjs:13` / `route-guard.mjs:477` 的 IN_PROGRESS 读取分支。来源：2026-06-02 红队对抗（plan `agnet-mutable-tarjan`，C4）。
- **🔴 2026-07-21：触发条件循环自锁，但「删 reader」提案被红队明确否决——不可删**：
  判定「出现过崩溃恢复需求」的唯一通道是 `session-restore.mjs` 读 IN_PROGRESS，而它需要一个不存在的 writer 先写过 → 真崩溃时系统零信号，此触发器结构上到不了。
  但 reader **不是孤枝**：`scripts/test-hooks.mjs:96-98` 的 HOOK-001 断言锁住 `session-sync.mjs` 的崩溃 checkpoint 安全网，且 `makeFixture` 默认 `['IN_PROGRESS','DONE']` 被约 20 个回归块复用——删 reader 要么拆 test-locked 断言、要么重写整张测试网。`session-restore.mjs` 那段还是 CLAUDE.md 启动协议第 2 步的逐字实现。
  **处置**：维持现状，口径改为「**半接线 scaffold，reader 分支已知永不触发**」，不再挂在一个到不了的触发条件上。真要动须等 workflow-mode 实际投产，届时作为独立议题决断（本 Pass 不翻 `BACKLOG:59` 与 `memory/README.md:12` 两道既有冻结裁决）。

### #19 — failing_eval_patterns 无源与无失败不可分（并入 eval 冻结）
- **真实缺口**：`consolidate_memory.py:533` `failing_eval_patterns(read_jsonl(EVAL_LOG))`，EVAL_LOG=不存在的 `eval-log.jsonl`，`read_jsonl` 缺文件返回 `[]`（32-34）→ 人看的 review 队列里"无 eval 源"与"无失败模式"**不可分**。
- **为何延后/不是 bug**：**非 false-green**——grep 跨 `settings.json`/`hooks`/`scripts`/`package.json` **零自动消费者**，该 bucket 仅供 `print_human`/`--json` 给人看，不喂任何自动 gate。且 `eval-log.jsonl` 在 `memory/README.md:65` 冻结范围，明令"勿删除或修复"；现在加 source_absent 哨兵会触碰冻结面 + 破坏 `test_memory_system.py:777-778` 的 populated-path 契约。
- **🔔 触发条件**：`README:65` eval 冻结**解冻**（ADR-0006 ~10-session 检索度量 + ADR-0007 W3 出结论）时，与"统一两个 eval writer"一并处理：让"无源"与"空结果"可区分。绑定 **#10**（解冻 eval，现否决）。
- **落地点**：`consolidate_memory.py` `failing_eval_patterns` / `read_jsonl` 调用点。来源：2026-06-02 红队对抗（plan `agnet-mutable-tarjan`，C3）。
- **🔔 2026-07-21：触发条件已成立，且本条正文有两处已过期（`SC-20260622-001` 型）**：
  ①「EVAL_LOG=**不存在的** eval-log.jsonl」**现在是错的**——`memory/evals/eval-log.jsonl` 实存 2648 B / 6 行（两检出一致）。
  ②「eval 冻结」**已解**——`memory/README.md` 2026-07-15 记忆层评审裁决（BUILD-lite）写明 `record_eval.py` 已接确定性触发（quality-gate agent 定义 §4b 内置落账），只有 GEPA pairs 与 `run-log.jsonl` 仍 FREEZE，eval-log 被显式排除在冻结外。原「会触碰冻结面」的阻塞理由随之消失。
  歧义本体仍未修：缺文件与空结果仍同为 `[]`。附带发现：6 条记录全是 06-12/06-14，07-15 接线后 **0 新增** → 写侧是否真跑通未经实证。**已列入 DECIDE 清单**（修 source_absent 哨兵 + 顺带验证写侧）。

### #22 — luca app 集成层复审（P5，2026-07-21 收口 Pass 转入）
- **缺口**：`scripts/luca-open.sh` / `scripts/luca-sidebar.sh` + CLAUDE.md:526-538 三条使用约定 + appendix 侧栏感知，是活跃演进中的集成层，从未做过专项复审。
- **为何延后（理由现仍成立，有硬数据）**：被审对象每周在变形——muse app 近 14 天 33 个 commit，侧栏面 7 月内 ≥3 次改动直接影响 `luca-sidebar.sh` 返回语义。现在审很快过时；框架侧两脚本反而稳（11 天未动）。
- **🔔 触发条件（人可报告判据，不设跨项目自动监控）**：`luca-open`/`luca-sidebar` 行为异常被 luca 报告一次，**或**下次真在该集成层做实质工作时顺带复审。**刻意不设「muse 侧栏面连续 30 天无 commit 即审」**——那需要 luca_gstack 治理去监控下游 muse app 的 commit 历史，是又一个无自动观察者的假触发器（本 Pass 正在消除的模式）；跨项目、low severity，不值得建监控。
- **观察者**：luca（人）。已顺手收的两个小尾巴：`luca-open.sh` 补 capability-parity 锚点（本 Pass，`open-spool`，防误删）；`reference_claude-artifact-content-retrieval.md` 的「2d3c683 待重启验证」仍开着，属一次性动作（app 已在该 HEAD，重启验一次即降为指针）。

---

## 否决项（确认不做，仅备查）
#5 delta-spec（8 项目 tech-spec 仅 1 次产出、re-spec 0 次，roam-cards 20+ 场景B commit 全零 spec）、#9 路由准确率虚荣指标、#10 解冻 eval（git 显式冻结 deb2ef4）、#11 失败自动回灌（违 human-in-the-loop）、#12 自动抽取候选记忆（无抽取源）、#13 矩阵↔断言闸（双写漂移前提假）、#15 OnFailAction（删人工控制点）。详见报告 §3.3。

---

## 🔔 记忆 candidate 复核提醒

- **≥ 2026-06-08**（满 7 天冷却）复核两条 skill-rule candidate：`SC-20260601-001`（红队 over-kill → 多轮对抗辩论）、`SC-20260601-002`（改 skill 指令须行为级 A/B）。
- 复核动作：跑 `python3 memory/scripts/consolidate_memory.py --json --dry-run` 看是否进 promotion_ready；若这两个模式在后续 session 已被复用确认且仍成立，标 stable + `review_candidates.py --promote --reviewer luca` 晋升；否则继续留候选或剔除。
- 现状：两条均 `pending_review`，被 7 天冷却门正确挡住（不绕过）。

<!-- FILE_END: BACKLOG -->
