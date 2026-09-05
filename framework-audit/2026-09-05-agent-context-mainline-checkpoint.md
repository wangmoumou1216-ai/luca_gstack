# 主线 checkpoint — Agent 根上下文轻量化

记录时间：2026-09-05 17:04 Asia/Shanghai；后续用户收口指示见下方 R-2。状态：PAUSED_FOR_APPROVED_BRANCH；主线 P6 尚未通过。
消费方：在本会话或后续恢复执行的 agent。本文件只固定恢复点，不替代原始验收记录、不改变计划或授权。

## 1. 恢复位置与范围

主线目标仍是两个独立薄根入口、K1–K10 不退化、一跳条件加载、真实双 Harness A/B、mutation 和独立反证；最终门禁全部通过后按用户授权 commit、普通 push。

主线第一个未关闭门：**P6 / F10 真实失效指针与行为验收**。其失败引出已批准的 `BR-PAGE-HANDOFF` 分支，当前为 B1 实现；B0 独立 PASS 6/6。先完成分支 B1→B5，B6 回到本 checkpoint 的 §5，不重新开始 P0。

- 仓库：`/Users/luca/Desktop/项目/muse/lucagstack`，分支 `main`，NO_PIN。
- HEAD：`94f086233affb3bd08ad8fe33063bcfedb330edf`；本次读回 index 为空。未 commit、未 push。
- `framework/` 只读；不访问 `docs/`、workflow-state、current-topic 别名或下游项目。不读取另一个 Harness 的根入口来补当前根的行为。
- 现有脏树全部保留，不 stash/reset/checkout，不按整仓暂存。
- 原始 handoff：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-handoff-20260904-132432.md`（已读至 FILE_END）。其最初禁止发布的条款由用户后来明确的 commit/push 授权覆盖；其旧五次重复样本要求由后续减法决定覆盖。

## 2. 已完成实现与历史验证（不是终版验收）

| 阶段 | 保留成果及证据 owner | 状态边界 |
|---|---|---|
| P0 | `2026-09-04-agent-doc-lightweight-baseline.md`：根/CLI 基线、K1–K10、消费者与内容分类矩阵 | 历史 PASS；不重做基线 |
| P1–P3 | `.claude/skill-os/agent-root-kernel.json`、`agent-context-manifest.json`、`skill-visibility.json`、`generated/`、`runtime/`；`scripts/build-agent-context.py`、`check-agent-context.mjs`、`resolve-agent-context.mjs` | SSOT、catalog、投影、一跳解析与消费者迁移已实现 |
| P4a–P4c | `AGENTS.md`、`CLAUDE.md` 分别独立 cutover，不再互读 | 历史窄门 PASS；当前实测体积为 9,922 / 9,517 bytes，体积不证明行为正确 |
| P5 | `memory/scripts/{consolidate_memory,check_memory_health,daily_governance}.py`、session-restore、相关 checker、verify/CI/commit-msg | 双根 SF 投影、CODE_ROOT/MEMORY_ROOT 分离、同步失败回滚、index-only 校验已实现 |
| P6 局部 | `scripts/test-agent-context.mjs`、`test-agent-context-resolution.mjs`、`run-agent-context-ab.mjs` 与原 A/B 报告 | 历史 19 项语义 mutation、投影/暂存/解析及 evaluator 自测通过；F10 后局部指针补丁不能替代新分支验收 |

旧大 appendix 仍物理保留（30,086 bytes），已退出运行时；不要在 P6 完成前删除。最近原主线完整 verify 的历史结果为 91 PASS / 0 FAIL / 1 既有 ADR 警告；这不是 B1 或后续修改后的新鲜全仓验证。本 checkpoint 只新跑了身份/index/哈希/字节数及 `git diff --check`，不借机宣称主线完成。

## 3. 行为证据与冻结口径

历史验收选择是 **26 格**：Codex candidate 14 + baseline 4，Claude candidate 4 + baseline 4；不是 168 或 56，且不是统计稳定性保证。

- 已有 18 格：candidate Codex 13 PASS / 1 FAIL；baseline Codex 3 PASS / 1 FAIL。合计 16 PASS / 2 FAIL，不能写成 18 PASS。
- Claude 的 F2/F3/F5/F9 双臂 8 格仍缺。历史登录/额度故障不代表当前仍不可用，实际运行前再查；不得假造 Claude 证据或拿 Codex 代替。
- 原 STOP 反例 `738e28f1-9b01-4a4c-8482-b14dc840a631` 和 F10 反例 `64993364-8698-42a1-8ccf-b047e50254ea` 都保留原分。F10 是权威指向缺失 component-map 的真实失败，不是 scorer 误判。
- baseline F5 的 alias 兼容性失败保留，不能为了总绿删行。保留的旧 candidate F9：`787d2430-af09-4537-9688-5293b0b9b283`。
- 原轨迹共 494 行；校准、旧协议、未选行不是当前验收分母。不得 best-of、重标旧 FAIL 或以成功重跑替换首次失败。

分支预算 owner 是分支计划的“行为票单 v1”：B3 两票、B5 十二票，加上述主线缺票且只允许一格版本化重叠，**后续上限 21 个独立 CLI 进程**。这是待执行上限，不是完成计数或 21 次同题重复。F13/F14/F9-v2/F10-v2 尚未实现，不可用虚构旗标提前启动。先冻结 fixture/schema/scorer 并独立审查，再运行；关键失败停止后续分派。

F9/F10 新语义来自用户明确取消旧母版实现强制、保留 framework 只读的要求。将来用版本化新义务证明替代，不追溯修改旧期望。其他历史票只有在 owner/语义未变且有书面复用依据时才能复用。

| 证据 | 本次只读核对 SHA-256 / 定位 |
|---|---|
| 原始 A/B 轨迹 `framework-audit/2026-09-04-agent-context-ab.ndjson` | `c5ebd6141c3c045ae4a34528d395385cd67fcbbd2efd8ea9715f1caaeb728a20` |
| 原 evaluator `scripts/run-agent-context-ab.mjs`，protocol 20 | `031d3aeea98c839dd1975081805d2c4834b42e36ba51f90b8b6966ec5f3fddfd` |
| 原 scoring revision | `v19-shared-read-evidence-and-observed-baseline-root-source`；SHA `edc69626f8a13937d9abdb29134251b1122af97df5f13ce3b84812b36fbf857d` |
| 历史 candidate context（不是当前终版身份） | `7f0b250d036f1e56808d469111b562524c0f0db7263d322bdf7619d0ee6900fe` |
| baseline 导出 | `/private/tmp/luca-agent-context-ab.p3S7fo/baseline`；历史 context `4faa8176b9029ecbe4ca207528fda6771b0ea467a890a39f6700e126d49360a7` |
| 旧 26 格 auditor | `/private/tmp/luca-agent-context-formal-audit.mjs`；遇现存 F10 应拒绝，不准放松它使旧批次变绿 |

原报告 `framework-audit/2026-09-04-agent-context-ab-report.md` 保留全部历史，包括较后位置仍存在的旧 168 叙述；按其当前结论和本 checkpoint 的后续范围解释，不能按文件最后一个旧数字执行。

## 4. 用户工作保护与分支断点

本次核对的 `memory/retrieval-log.jsonl` SHA：`bbfdea3971688338f05ef9a334de79e55f0f596732d56d4c57b8c5a27f6d9605`。它是用户/运行时既有改动，永不回退、截断或随本任务提交；旧 P0 哈希不同不授权“恢复”。

分支修改前 45 文件及五页源哈希在 `framework-audit/2026-09-05-page-library-b0-baseline.json`。本次 tracked binary diff SHA 是 `87ca6f64640e9403dbf8abd6e4a7f3d0b3b562b936678906d7efe3c59d950759`；它不包含 untracked 文件，也不是可恢复备份。`memory/evals/eval-log.jsonl` 的本分支增量只有已授权 B0 独立裁决记录，与 retrieval-log 分开处理。

分支唯一计划/细则：`framework-audit/2026-09-05-page-library-design-flow-branch-plan.md`，含 B0–B6、K1–K10 delta、S9 通用行为保留矩阵 P-01–P-19。B0 verdict 为 `2026-09-05-page-library-b0-verdict.json`，eval_run_id=`br-page-b0-20260905-01`，PASS 6/6。

当前 B1：catalog 五页/27 区域、schema 与核心选择验证已实现；preview 与交互测试待收口，尚无独立 B1 PASS。主 Agent 负责 catalog/runtime/audit；page_context_core 已完成 schema/core/test；external_design_plan_refute 负责 preview/test，因参与实现不得担当自己产出的独立终审。尚未接入实际 flow、删除 figma-layer、写入 OD/Figma。

不可从代码重建的用户决定：保留并可扩展五类页库；对齐后语义推荐、真人确认采用页面/位置，再连同需求交给 OD；设计系统由用户在 OD 或 Claude Design 配置；UX 与其他通用需求/交互/状态逻辑保留；figma-layer 明确退役。用户另授权 B2 新建一个独立移动端列表 OD 测试项目并写入本次材料，不授权触碰现有项目、headless 生成、Figma 写入或代签页面采用。

## 5. 分支完成后的主线恢复顺序

1. 先读本文件与分支计划至 FILE_END，核对 HEAD、dirty/index、受保护哈希以及 B5 独立裁决。B5 未过只继续分支，不切回主线宣布完成。
2. 在 B6 绑定分支 context/fixture/evaluator/证据身份与 K delta，关闭版本化 F10 的失效消费链义务；旧 F10 FAIL 留档。复用清单先审查，不能把原 18 格默认当成终版证据。
3. 补齐仍缺的真实双 Harness 票，严格按冻结票单；已有分支票只按版本化义务映射计一次。记录实际 CLI/model、完整读取和执行轨迹，失败即停。
4. A/B 通过后，按实际安全体积加小幅余量收紧根 hard cap。既有建议为 11 KiB（11,264 bytes），**尚未实施/通过**；以终版安全落点核定，不先靠预算删除承重内容。执行两项预算违规/恢复验证，并核对行为 context/scorer 未被意外改变。
5. 跑终版完整 verify、相关语义/投影/解析/退役/交接 mutation，拿独立冷启动反证终审；UNKNOWN、Critical/Important 未关闭均不能宣布 DONE。验证轮数不再自行扩张。
6. 读回最终精确 diff，显式排除用户 retrieval-log 与其他无关改动，选择性暂存并核验 staged snapshot。正常发布前核对远端；远端前进/分叉/权限不足即停，不自动合并或 force。按原授权 commit 后普通 push，记录提交与推送结果。

最小只读恢复命令（不是重新跑历史批次）：

```bash
git rev-parse HEAD
git status --short
git diff --cached --name-only
shasum -a 256 memory/retrieval-log.jsonl
git diff --check
```

现在的下一动作：本 checkpoint 读回无误后恢复 B1 preview 实现；终版文件冻结后跑 core/preview 窄门、查看实际五页截图，再独立 B1 裁决。完成一个阶段就更新分支 checkpoint，不覆盖本文件的主线未完成门。

## R-2 返回顺序更新（用户明确批准）

用户现要求分支“大逻辑没问题、逻辑细节没丢”后即可回主线；小交互后续调整。分支计划 R-2 是该调整的唯一细则：B1–B4 必要接入/保留/安全门仍执行，B5 本地与独立逻辑收口后即 B6 返回，不在分支等待终版重型 A/B。

原 B5 终版双 Harness 12 票、最终 mutation/冷启动反证移入本文件 §5 的主线 P6 待办，不能丢失。B3 两票过渡版探针取消；上方“21”是调整前口径，**当前剩余上限为 19 个独立 CLI 进程**（12 终版分支票 + 8 缺失主线票 − 1 明确版本化重叠），均未运行。

未完成的真人页面采用或实际 OD 接收证据可明确带回主线；没有实测就不能声明“已置入”。逻辑收口不代表部署/生成完成，不授权把实质反例算作小细节跳过。

## R-3 当前分支停点

页面策略已按用户改为“仅高置信推荐；低置信/无匹配以 reference=none 直接需求交接，可非阻塞问自带参考”。规则 owner 是分支计划 R-3 与 `runtime/page-context.md`；尚未接入 design-brief/open-design 的 B2 消费面，不宣称全 flow 已生效。

独立 B1-core 局部复审 FAIL（7/9，1 Important 父子包含漏检、1 调用方真人证据 UNKNOWN）；停在 B1，未进入 B2 或退役阶段。UNKNOWN 的实际人类来源不由 core 测试承担，须按调用方范围处理；父子包含反例不能据此忽略。原主线恢复点仍是 P6。

## R-4 用户验收豁免与恢复

用户明确“页面库不用验收了，继续下面”：B1 剩余页库验收以 USER_WAIVED / DONE_WITH_CONCERNS 结束，原 9/10 FAIL 留存，当前进入 B2 消费链接入。已知新增 SVG/HTML 混合结构父子误判尚未修复，现有五页未受影响；不宣称任意新增页面已全验。该豁免不覆盖高置信采用确认、OD 写入权、NO_PIN、framework 只读或其他通用流程保留。

原主线仍暂停在 P6；分支按 R-2 完成大逻辑接通和 S9 保留后立即返回，未完成外部/双 Harness/最终反证证据必须随本 checkpoint 继续，不被此次页库豁免抹去。

## R-5 分支已返回（2026-09-05；当前恢复点）

BR-PAGE-HANDOFF 已完成 B4/B5 本地收口并执行 B6，状态 DONE_WITH_CONCERNS。上方 B1/B2/停点均为历史；
本节只更新依赖释放，不改主线证据或关闭 P6。分支不再占用根、路由、skill、登记和受控事实的写所有权。

先读 `2026-09-05-page-library-design-flow-branch-plan.md` 最新“B4–B6 接续收口”及
`2026-09-05-page-library-b5-validation.json`。最终独立消费者票 9/10 CONDITIONAL_PASS、共享 refs 7/7 PASS、
keyword delta 1/1 PASS；两张初次 B4 FAIL 原文保留。唯一 UNKNOWN 是已移交主线的真实 OD/双 Harness。
全量 verify 原 90/1/0，唯一失败是旧退休路由样例；版本化后定向 S20 为 70/70 PASS，未再次全量重跑。

当前承重变化：figma-layer 全入口退役且显式 /$ 有真实拒绝 guard；design-brief 使用语义位置/D/STATE/来源/AC，
CMP 合同归 tech-spec；具体 DS 来自当前项目或外部工具，缺本地 token 不再阻断；SF-002 已经受控替代为
`SC-20260905-001` 并归档旧事实，六项 allowlist 与双根投影同步。framework 只读、NO_PIN、Human Gate 和其他 K1–K10 保留。
F9-v2/F10-v2 必须针对新事实/实际 CRM 输入边界冻结，不恢复旧 component_mapping 期望。

HEAD 仍 `94f086233affb3bd08ad8fe33063bcfedb330edf`，index 空；受保护 retrieval-log、五页源、主线 runner/fixture 与接续前哈希一致。
分支没有执行 OD 接收/生成、重型 Harness、commit 或 push。当前哈希清单含继承主线文件，不是分支提交清单；发布前仍需选择性核验。

下一步由主线 session 按 §5/R-2 继续 P6：冻结终版与复用证据→剩余双 Harness 和实际 OD 读回→预算/最终反证与 verify→原授权下选择性发布。
仍受原 19 个后续独立 CLI 进程上限约束，不重新跑 P0，不重启已被用户豁免的页库验收；已授权的独立 OD 测试不授予 headless/Figma 权限。

## R-6 整体复核修复已闭合（2026-09-05；最新分支交接）

用户要求整体 review 后修完再交主 session 提交。原复核发现的 1 Important、1 Minor，及终版发现
的同源 SF-001 旧品牌权威遗漏已全部修复。先读 `2026-09-05-page-library-r5-closure.md` 和
`2026-09-05-page-library-r5-validation.json`；它们是本次最终修复/版本依据，原 B5 hash 不再代表当前候选。

- helper 标准输入导入正常，直接 CLI 语义保留；Node 20/22 行为与旧 guard 反证通过。
- 旧母版 rule 由 R-20260905-001 取代；旧两条 skill-rule 及 SF-001 通过受控链替换为
  SC-20260905-002/003/004，旧证据逐字归档。Static Fallback allowlist 与六项根投影不变。
- 两项回归已接入 package/verify/CI；最新全量 93 PASS / 0 FAIL / 0 WARN。
  独立 Standards 0 findings、Spec 10/10 PASS；最终 12 文件 hash 由两轴核对。
- R5 validation 的 132 项 checkout snapshot 含继承主线工作，不能照单全暂存。
  新候选为 ignored runtime 数据，精确提案/批准/晋升记录已存该 validation；保留原文件版本控制策略。

本 session 已释放修复写所有权，未暂存/提交/推送。主线仍按 §5/R-2 完成 P6 的真实双 Harness、OD
接收读回、最终预算/反证与选择性发布；既有外部授权和进程预算不扩大，页库豁免不重开。
本段只交付已闭合的本地修复，不把延期 UNKNOWN 伪称整体框架发布 DONE。

## R-7 发布后续办清单（2026-09-06）

本轮按用户最终决定发布为 `DONE_WITH_CONCERNS`。下次进入本仓库时先读本节，再决定是否
新开版本化补证；不得把下列缺口静默改成 PASS：

1. v25 原计划 11 条 fresh candidate 行为票只执行两条 Codex：F13 PASS；F14 的 42 项
   claims/source/scope PASS，但因读取仅供 `/office` 入口使用的 `references/office-wizard.md`
   而整体 FAIL。该 raw 行永久保留；只有先产生新的行为合同/版本与 manifest、再获用户授权，
   才能作为新版本测试，禁止在原 v25 上重复到通过。
2. 其余九条由用户明确 `USER_WAIVED`：Claude
   F9-v2、F4-stop、F3、F5、F2、F10-v2、F13、F14，以及 Codex F10-v2。若用户以后要求
   补齐，先重新冻结当时 context/scorer/manifest，再按单票、零 best-of、失败即停执行。
3. v25 没有同 scorer 的完整 A/B；旧 baseline 仅是 v22-v24 历史/额度背景，不能充当
   v25 baseline PASS。若未来需要因果 A/B，须另立预算和冻结矩阵。
4. session-restore 仍报告 43 个 pending-extraction 文件；它们没有在本次发布中自动写入长期
   memory。下次治理按 extraction-bar 与 correction-attribution 逐项处理。
5. 2026-09 framework evolution scan 及配套 scene coverage、bookkeep、digest 仍是既有治理待办；
   本次发布不借机执行或伪称完成。

明确不列为自动续办：页库 B1 验收已由用户 USER_WAIVED；OD 生成/Figma/DS 写入从未授权或
请求。除非用户重新提出，不得重开这些事项。

<!-- FILE_END: AGENT-CONTEXT-MAINLINE-CHECKPOINT -->
