# 记忆执行核验与 harness 对标进化计划

Status: DONE_WITH_CONCERNS — 已按用户批准执行，最终独立红队及两轴复审 PASS；Claude 在线验证 UNKNOWN。
Scope: NO_PIN，luca_gstack 框架；不通过共享 docs/ 或项目别名读写下游。
Baseline: e608c51e00541eb9c30a8e00c62e0c9f490ff4d9；2026-09-08 工作树已有 33 个 tracked dirty 文件，另有未跟踪制品。执行前重新核对 diff，保留并发工作。

## 目标与前提

来源：用户要求“查看一下我的记忆框架是否正常执行”“项目级别落库和选举级别落库”“深度调研……官方、专业……制定并落实计划，解决问题”；选举级别暂按全局级别理解。追加授权：研究可使用较低版本模型；有价值的未提交改动可提交或衔接本计划。

问题真实：首次检查有 46 项 pending、episodic 热索引最新 2026-08-26、入口 Static Fallback 漂移及跨检出候选 ID 冲突。上述只是观测，不能据此断言所有写入停摆。
更小替代：先复用现有未提交修复；尚无证据证明单一配置或一次队列清理能解决完整诉求，故先核验再决定增量。
不预选新数据库、向量检索、后台 LLM 服务或整套外部框架；独立 reviewer 要同时检验新增复杂度是否有价值。
KILL-1：如未提交改动已修复某缺口，该缺口取消重复实现，转为验证与整合。
KILL-2：如历史 pending 无法恢复证据，保留 UNRESOLVED；不得为清空队列编造经验。

## 编排

模式：Sequential 外层，研究内部按运行时槽位分批 Parallel；工程收口使用独立评审。多阶段 Supervisor 计划需用户确认。
规模：Standard；任务来源均为上述用户原话，无产品 PRD/task-plan，DEV/ASSERT 反向覆盖 N/A。
研究深度：deep，已由用户明确指定；研究采集使用运行时可用较低版本模型，最终综合/独立审查用较强档。模型覆盖仅限本任务，不改全局模型配置。

### Phase 1：现状、WIP 价值与根因

- phase_type: task_execution；model_tier: core-execution；先主 Agent 核验，独立 reviewer 复查风险。
- 输入：当前工作树 diff、memory/README.md、提取/归因规则、两套 harness hooks 配置与 adapter、实际记忆根。
- 审核现有改动：pending 来源与裁决/认领；ID 锁与冲突阻断；sync 跟踪分支及账本覆盖；历史状态勘误；office/agent-context 独立改动批。
- 验证链：捕获→归因→项目/个人/框架候选→评审晋升→检索→下一会话使用→归档/失效；分别标明规范、接线、实际运行证据。
- 重点：现有冲突阻断是否把新候选写入整体停掉；marker 是否被错当提取完成；项目检索是否隔离；两检出是否读取不同规则。
- 产物：同目录 memory-evolution-audit.md（逐批价值、风险、已有测试、需修复/保留/可提交结论）。
- gate：每个故障有代码与可执行复现；不能恢复的历史证据明确列缺口，不将旧日志无新增直接解释为整体停机。

### Phase 2：官方深度研究与本地映射

- phase_type: skill_execution；skill: deepresearch；model_tier: guided-execution（用户授权资料采集降档）；研究综合由主 Agent 承担。
- 使用 `.claude/skills/office/deepresearch/SKILL.md`；框架对标以 BENCHMARK-RUNBOOK 的来源固定、逐项映射、反证与采纳边界执行；NO_PIN 产物放 framework-audit/。
- 五个角度：① Claude Code/Anthropic 的项目与个人记忆、生命周期；② Codex/OpenAI 的上下文、会话与持久化（先查本地实现，再官方资料）；③ LangGraph/LangMem 的 scope、store、后台写入；④ Letta 与 Hermes 的记忆维护/检索/技能边界；⑤ 实证评估、失败恢复、冲突与遗忘，检查官方代码和原始论文。
- 每角三轮：发现→至少三份原文深读→针对薄弱结论验证；每项结论留 URL、读取日期、版本/commit（源码可得时）、证据强度和适配限制。产品自身能力与性能营销分开，不将同源材料当独立验证。
- 产物：memory-evolution-research.md，包含来源日志、对标矩阵、反方证据、事实/推断区分、采用/不采用理由。
- gate：关键建议能映射到本地实证缺口；没有独立证据的收益不写成事实。研究维持完整角度，最多三个并行 child，分波次适配槽位。

### Phase 3：增量修复与整合

- phase_type: task_execution；model_tier: core-execution；依赖 Phase 1 和 2。
- 在既有记忆 hooks/scripts/tests 中实现有证据支持的最小改进。按实际审查结果接入已有 WIP，不丢弃、不重复制造。
- 行为目标：重大信号有来源和可追踪落点；一般问答不乱存；项目专属知识不升级为全局；晋升保留人工门；写入失败可见；恢复/重试不重写 ID、不丢证据、不重复记账。
- 先写失败回归，再改代码；不得通过关闭原有保护让检查变绿。
- 数据修复按证据逐项处理；不可恢复 pending 记录缺口。新外部能力如涉及改变人工晋升政策、外发记忆或服务费用，提供具体取舍后再采纳。
- 产物：聚焦 diff、回归用例、研究建议落地/拒绝映射；每阶段更新本文件 checkpoint。
- gate：已修复缺口原复现转绿，故意破坏保护时测试转红，恢复后再绿。

### Phase 4：双 harness 终验、提交与交付

- phase_type: task_execution；model_tier: core-execution；独立 reviewer 采用 reasoning-heavy 判定档。
- code-review 两轴隔离：Standards 审护栏/工程质量；Spec 审本计划与行为目标；不给修复过程。审后改动返回 reviewer 闭合。
- Claude/Codex 分别验证触发、运行、降级；临时隔离 store 运行持久写入→独立新进程检索，真实库只记录本任务有价值且符合门槛的经验，不写测试垃圾。
- 将有价值、通过验证且依赖完整的 WIP 拆成聚焦 Git commit（用户已授权）；提交前重新核对各文件指纹与 index，防吸入并发改动。运行时锁文件不提交。
- 不把 Git push 当成本地提交同义词；发布范围或仓库门禁另按实际证据处理。
- 产物：memory-evolution-results.md，含两轴 review、变更映射、测试与限制、commit IDs、未决项。

## 验证断言

```bash
# [BLOCKING] A1 — 记忆行为回归
python3 -m unittest memory.tests.test_memory_system -v
# [BLOCKING] A2 — hooks 与 Codex adapter 行为
npm run check:hooks
# [BLOCKING] A3 — sync 分支和账本行为
npm run test:sync
# [BLOCKING] A4 — 权威记忆与当前入口投影一致
python3 memory/scripts/check_memory_health.py
# [BLOCKING] A5 — 框架集成验收（失败需归因，禁止假绿）
bash scripts/verify.sh
# [BLOCKING] A6 — diff 基础完整性
git diff --check
```

新增缺口的定向测试命令在 Phase 1 确定复现后追加；不能用上述旧测试替代新行为验证。
质量 criteria：C1 每项采纳有官方原文和本地需求证据；C2 项目与全局 scope 有正反用例；C3 捕获/裁决/落库/使用均可区分，不以 marker 冒充内容；C4 两 harness 实测证据分开，未知如实标注；C5 WIP 保留且提交只覆盖已审查字节；C6 没有新增未经授权的外发、付费服务或自动晋升。

BLOCKING 失败停止依赖阶段，先修复；外部能力不可验证则标 UNKNOWN，不列为已经生效。现有脏改动并非自动通过审查。

## Checkpoint

完成：Phase 1 独立审计；Phase 2 五角度官方深调研及 Socratic PASS；Phase 3 修复与已审真实数据迁移；Phase 4 真实 EP-20260908-150 写入／独立进程召回、Standards/Spec 与追加红队逐项闭合。最终 v4：81 项 memory PASS，94 项框架验收 PASS，双轴与红队均无未关闭 Important。

交付限制：Claude 原生 API403 保留 UNKNOWN；历史证据不足 pending 保留 UNRESOLVED；新语义候选仍待人工审批。发布授权以以下追加阶段为准，Git 提交/发布证据见 memory-release-receipt；不重复迁移或写入同一 episode。office/agent-context、E3 及运行时日志是其他工作批，不纳入本次提交。

追加定向断言：`python3 -m unittest memory.tests.test_memory_recall_scope memory.tests.test_pending_disposition_recovery -v`；`node scripts/test-sync-real.mjs`。仅临时 store/本地 bare Git remote，不向外网推送。

## 用户追加的发布阶段（2026-09-08）

用户明确要求“执行完，由红队做一次review。发现问题解决。没有任何问题了，提交发布”。据此追加 redteam 独立对抗审查→问题修复与闭合→聚焦提交→普通 push 到当前已验证 tracking upstream。此前的“不推送”授权边界由本条替代；不授权 force push、覆盖并发 WIP 或绕过门禁。红队显式 target 为最终记忆制品/代码冻结清单；框架 NO_PIN，不读共享项目别名。发布前核对完整 fetch/push URL 列表、远端新进展和待发布提交范围。

最终发布 checkpoint：v4 manifest 83/83 SHA 校验；生产代码未漂移；正常 precommit 和远端最终读回由主线执行。三个最小数据镜像已独立核验，另外四项保留当前原批准历史。待发布范围包含既有未发布祖先 e608c51、14cf47d，其补丁已纳入红队检查；本次不改写它们。fetch/push upstream URL 各一条且均为 `https://github.com/wangmoumou1216-ai/luca_gstack.git`的检查会在实际发布前再次执行（实际精确 URL 以发布回执为准）。
