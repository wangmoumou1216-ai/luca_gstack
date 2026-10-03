# 三模块执行逻辑整改与交付

日期：2026-10-03。当前状态：IN_PROGRESS。框架维护，NO_PIN。

## 授权与范围

来源：用户对《三模块改造整体逻辑独立审查》明确要求「发现了问题以后，你来帮我去解决验证，然后再提交发布，拉到文档」。本文件承接该整改安排和此前“范围外事项及结论验证先不做”的限制。

本次解决已证实的指令冲突、持续执行、完成判定和验收口径；使用已有最小补丁。整体效率、真实多 Agent 净收益、compact/旧在途迁移等比较仍暂缓，不作为本次维护修复的前置。历史失败、未采用状态与原评审成绩保留。

不重写根适配器、模型配置或 memory；不写项目共享 aliases、framework/。旧主会话与原三模块会话不被本次自动恢复或代发消息。本会话承担这批整改的实现、验证、发布和文档责任。

## 执行计划与门

前提：问题由实际返工和原文冲突支撑，应修；最小方案是修订原 owner 和直接消费面，不重造调度器或评估系统。KILL-1：若具体冲突在当前基线已消失，则该项仅核对，不重复修改。模式：Sequential，主会话实施，独立 quality-gate 冷审。执行继承 anchor；审查使用登记的 MR-004 身份。最新用户授权覆盖本批修复、验证、普通提交/发布和本地同步；范围外变更仍不执行。

基线：`95d463c17e1a39a2e5d26c4bc18c5e69f330546c`。隔离检出：`/Users/luca/.codex/worktrees/tri-system-review-fixes/luca_gstack`。日用检出：`/Users/luca/Desktop/luca_gstack`。发布只允许普通快进至已审查提交；保留日用检出的三份 dirty 日志和其他 untracked 工作。

| 单元 | 来源 | 具体工作与文件 | 依赖 / 验证 / 状态 |
|---|---|---|---|
| RF-001 | 审查 P1-1/P1-2 | orchestrator.md 完整责任、继续执行、失败返修、整体完成；quality-gate.md 对齐直接消费者 | 无；冷审正反场景；DONE |
| RF-002 | 审查 P1-2/P2-1 | auto/SKILL.md 区分等待与终态、重试不重放；office/SKILL.md 与 handoff-protocol.md 继承真实决定、必需来源 | RF-001；保护门与来源场景；DONE |
| RF-003 | 审查 P1-3/P1-4/P2-1/P2-2 | eval-methodology.md 区分一致性/行为/整体收益，绑定精确对象及前置必要性；本文件逐项处置 | RF-002；语义审查，不跑收益实验；DONE |
| RF-004 | 用户“解决验证” | 既有 scripts/check-agent-contracts.mjs 增加有限静态防回退断言；检查当前双端入口、消费者、mutation与独立审查 | RF-003；下面断言与criteria；DONE |
| RF-005 | 用户“提交发布，拉到文档” | 本文件记录核查和剩余项；候选提交/普通push/CI，快进main与日用检出，发布读回 | RF-004；提交门、CI、SHA一致且保护文件hash不变；IN_PROGRESS |

所有单元 phase_type=task_execution。先修当前范围内问题，再检查并发布；阶段报告不作为退出点。需要新实验的项目单列为暂缓，不标整体三模块收益已实现。

阻断断言：`git diff --check`；`node scripts/check-agent-contracts.mjs`；`node scripts/check-capability-parity.mjs`；`python3 scripts/build-agent-context.py check`；提交时 `.githooks/pre-commit` 的完整 `scripts/verify.sh`。检查失败先修本范围问题；真实缺权限或范围外阻塞只暂停对应依赖，保留已有结果。

冷审 criteria（逐项给实际文件/行及场景证据，不能用静态关键词当模型能力增益）：

- C1：已授权普通工作和返修持续推进；缺授权/未决Human Gate仍停。
- C2：等待超时不重启仍运行的任务；真实终态才可有限重试，保留已完成效果。
- C3：保留已有采纳/否决与来源；历史决定不授新权；必需上游不能被最近DONE或摘要替代。
- C4：局部通过不关闭整体；每个未完必需项有去向，暂缓实验不伪标完成。
- C5：验收对象绑定准确版本，证据只支持对应主张；失败证据与保护区不被删除。

## 模块与剩余项

| 模块/事项 | 已有产物 | 本次处置 | 完成边界 |
|---|---|---|---|
| 路由 | 95d463c含宿主入口修复及回归 | 保留已发布结果，运行现有回归 | 不宣称选路算法或自动hook整体增益 |
| 编排 | u014-preserved-orchestration-minimum.patch | 本次采用并补齐直接消费者 | 验证一致性、权限和终态；整体效率暂缓 |
| Context | u014-preserved-context-decision-state.patch、u014-preserved-context-required-sources.patch | 本次采用并补齐恢复入口 | 验证来源闭包与决定继承；真实compact/迁移暂缓 |
| 主控完成状态 | 审查P1-1 | 本文件作为整改当前状态，改通用完成规则 | 不把旧历史complete改写成当时正确；不操作旧自动化 |
| 17文件整体候选 | cd0cff15 | 保存既有资产，不整包采用 | 正式比较与整体净收益未验收；本次不继续实验 |
| 预算/成本 | 既有调用账本及未知费用 | 停止重建评估设施；每项检查绑定具体修复决定 | 不回填猜测费用、不计算ROI |

## 检查点与恢复

已完成：审查问题和三个补丁对照当前95d463c；隔离检出；日用dirty日志的hash保存于 `/tmp/tri-system-review-protected.json`。
进行中：RF-001—RF-003由本会话唯一写入；preflight只读。
待执行：RF-004独立检查 → RF-005发布与同步。发布前重新核远端main和日用HEAD未漂移。
恢复：读本文件，核隔离检出和日用HEAD、实际diff及验证回执；从首个未完成RF继续，不重跑已完成修改，不stage无关文件。


## 实施与局部验证（发布前检查点）

RF-001—RF-003已写入隔离检出：三份保留patch已应用，额外修正quality-gate直接消费者、workflow失败返修、恢复时全部必需来源、auto存在性与验收区别，以及整体完成边界。未改路由算法、模型配置、权限边界或历史失败结果。

RF-PLAN冷审 `/root/plan_check` 已完成，PASS 5/5，C1—C5原分母保留；修正其指出的build-agent-context命令笔误。preflight已完成，无缺项。

局部命令全部exit 0：`git diff --check`、`node scripts/check-agent-contracts.mjs`（94/94）、`node scripts/check-capability-parity.mjs`（133 anchors，47 shared projections，1 delegated）、`python3 scripts/build-agent-context.py check`。

Mutation：分别把orchestrator、auto、handoff-protocol、eval-methodology暂时恢复95d463c正文，新增检查对应失败4/2/3/1项，全部exit 1；恢复候选后94/94、exit 0。该证据只证明静态防回退检查会拦截原冲突，不证明模型收益。

双端发现入口核对：Claude `.claude/commands/auto.md`指向同一auto合同；Codex `.agents/skills/auto`及office aliases解析到同一权威源。两端根入口均要求office共享合同，context manifest指向orchestrator；没有新增原生primitive。缺授权、未知终态、缺必需来源仍停止对应依赖。本次不宣称Claude实时运行、自动hook、模型A/B或compact已验证。

下一步：冻结上述实现diff，独立核对C1—C5正反场景；通过后提交门与候选CI，最后发布和日用同步。此处尚未声称发布完成。


## 独立验收结果

`/root/fix_acceptance` 冷启动、只读复核已完成，C1—C5为PASS 5/5，无BLOCKER/MAJOR。实现diff SHA-256：`eee9a1bf1bd3225a737098424e50c0bb6d01321b676ca69bd5ab67921c9c340b`；仅覆盖上述七个tracked实现/检查文件，不包含审查日志。

| 判据 | 结果 | 终版证据 |
|---|---|---|
| C1 持续执行及人类门 | PASS | orchestrator §2.2、§3.4，quality-gate §5 |
| C2 等待、终态和重试 | PASS | auto W9；单次重试上限、原结果收取和已完成效果保护 |
| C3 决定与来源 | PASS | handoff写入/读取协议，office检索规则，orchestrator恢复入口 |
| C4 局部与整体完成 | PASS | orchestrator持续责任与完成边界，auto汇总消费入口 |
| C5 对象与主张一致 | PASS | eval-methodology Step 1；历史结果不改判 |

额外实跑：路由回归257/257、宿主适配17/17、独立根入口parity通过。计划与终版判官原envelope由parent调用record_eval记录在隔离检出，不随本批提交；没有改写日用检出的既有日志。

本次维护修复的内容验收已完成；RF-005须等待完整提交门、远端CI和发布读回，不能由本节PASS代替。整体候选的比较结论保持未验收，暂缓事项仍按前表保留。
