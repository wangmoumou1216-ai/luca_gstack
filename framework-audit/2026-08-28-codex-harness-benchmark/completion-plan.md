# Codex Harness Benchmark — Completion Review Plan

状态：`COMPLETE / EXECUTED_WITH_RESIDUALS`
日期：2026-08-28
范围：luca_gstack framework meta；`NO_PIN`；不读取、激活、确认或切换任何下游项目；不调用 identity transaction/project switch。
Source：`inline: "尚未完成的去验证，去看我luca的框架，按照计划模式去审查，是否需要完成。如果需要，就完成"`

## 块 0 — 前提门

1. **该不该解**：只处理经当前实现与反例验证仍成立的风险；“在清单上”不构成需要。
2. **更小替代**：优先增强现有 parity/runner/CI 真值与测试，不新增第二套路由、第二份义务目录或通用权限 profile。
3. **默认形态偏差**：本案不预设“全部实施”；默认是逐项 `NEED / NOT_NEEDED / DEFER / BLOCKED_EXTERNAL`。反向复核必须同时挑战“为了收口而实施”和“为了省事而维持残余”两种偏差。

Kill assumptions：

- `KILL-1`：`.agents/skills` 除 source-declared delegation 外都应解析回 `.claude/skills/office` 同一真值；若存在第二种合法形态，语义 parity 方案作废并重规划。
- `KILL-2`：workflow runner 的 `-C <scratch> + workspace-write` 已机械阻断仓库与外部 writable roots；若活体/既有独立证据推翻，`FINAL-OPP-02` 必须升级为 NEED。
- `KILL-3`：GitHub `main` 当前无 branch protection/ruleset；若只读 API 结果改变，停止外部设置动作。
- `KILL-4`：remote `Required Checks` context 必须先由包含新 workflow 的真实 CI run 产生；未产生前不得配置 required status check。

研究跳过理由：Codex 官方仓库/文档/源码已于同日按 Mode 2 固定证据完成；本轮问题是本地接线与外部仓库状态验证，重复 broad research 不增加裁决信息。

## 块 1 — 复杂度判断

```text
复杂度模式: Sequential Chain + terminal Supervisor review
理由: 必要性裁决先于实现，远端保护又依赖本地改动提交并产生真实 CI context。
模式可组合: 主 Agent 串行实施；最后使用独立质量复核或等价冷启动审查。
需要用户确认: 否——用户已给出条件式 GATE：“需要就完成”；不扩展到 release/version bump。
任务规模 Tier: Standard
```

无 task-plan.md 输入，块 1.5/1.6 为 N/A。

## 块 2 — Phase 分解

### Phase 1 — need-first 事实盘点

- phase_type: `task_execution`
- 编排模式: Sequential
- model_tier: `core-execution`
- 任务：核对 `FINAL-OPP-01/02`、native judge residual、execpolicy、branch protection、remote CI 的当前事实与既有能力。
- 产出物：本文件裁决区、`completion-review.md`。
- 阶段门控：每项有证据、反例与四值裁决；不得用“成本低”替代 need。

### Phase 2 — 必要的本地闭环

- phase_type: `task_execution`
- 编排模式: Sequential
- model_tier: `core-execution`
- 任务：只实施 Phase 1 判为 NEED 的最小改动；复用现有 checker/SSOT。
- 产出物：被修改的 checker、source-owned projection metadata、mutation tests、CI/verify 接线。
- 阶段门控：正向通过；swapped-target 与 obligation-removal 负控必须转红；无新 semantic catalog。

### Phase 3 — 外部 CI / branch protection

- phase_type: `task_execution`
- 编排模式: Sequential
- model_tier: `guided-execution`（机械查询、提交与状态验证；设置前仍由 BLOCKING 门控制）
- 任务：仅在本地全绿、精确 staging、真实 remote CI 产生 `Required Checks` 后，配置最小 branch protection；不启用强制 PR review、不阻断仓库管理员既有直推工作流。
- 产出物：commit SHA、Actions run URL、GitHub protection API read-back。
- 阶段门控：remote CI success；protection contexts 精确含 `Required Checks`；无额外规则。

### Phase 4 — 终审与耐久落盘

- phase_type: `task_execution`
- 编排模式: Supervisor
- model_tier: `reasoning-heavy`（model-routing 对抗判定/翻案复审白名单）
- 任务：复核是否 over-claim；更新 benchmark 主报告、机会表、remediation 与 completion review。
- 产出物：`completion-review.md` 及既有报告状态更新。
- 阶段门控：所有残余明确归类，外部状态有可核验 URL/时间，不宣称未机械验证的能力。

## 块 3 — 断言列表

```bash
# [BLOCKING] CR-01 — 语义 parity 正向与 mutation 负控全部通过
npm run test:semantic-parity --silent

# [BLOCKING] CR-02 — 既有 capability parity 使用增强后的真实 checker
node scripts/check-capability-parity.mjs

# [BLOCKING] CR-03 — Codex runner 的 scratch-CWD/权限档回归仍通过
node scripts/test-workflow-runner.mjs

# [BLOCKING] CR-04 — 当前框架完整验证无 FAIL
bash scripts/verify.sh

# [BLOCKING] CR-05 — tracked diff 与本轮 durable docs（含 untracked）无 whitespace/error marker
git diff --check
! rg -n '[[:blank:]]+$|^(<<<<<<<|=======|>>>>>>>)' \
  framework-audit/2026-08-28-codex-harness-benchmark/{main-report.md,inventory.md,capability-matrix.md,rubric-scorecard.md,opportunities.md,evidence-index.md,redteam-review.md,final-review.md,completion-plan.md,completion-review.md,remediation-report.md}

# [BLOCKING] CR-06 — 远端 CI 对本轮提交真实成功
gh run view <run-id> --repo wangmoumou1216-ai/luca_gstack --json conclusion,url

# [BLOCKING] CR-07 — main protection 只要求稳定 gatherer
gh api repos/wangmoumou1216-ai/luca_gstack/branches/main/protection/required_status_checks
```

criteria:

- `[C1]` 每个未完成项都有 NEED/NOT_NEEDED/DEFER/BLOCKED_EXTERNAL 之一及当前证据。
- `[C2]` 语义 parity 从现有 skill/graph 权威源派生，不新增手维护的 skill/obligation catalog。
- `[C3]` MagicPath intentional delegation 正向通过，target swap 与 obligation removal 确定失败。
- `[C4]` least-authority 裁决区分“已有 scratch 隔离”与“native child role 继承权限”，不冒充等价。
- `[C5]` execpolicy 未在 Ask/Allow/Forbidden 与 approval-policy 未闭合时进入生产。
- `[C6]` GitHub 设置只在 remote CI context 存在后修改，且 read-back 精确。
- `[C7]` 未触碰下游项目、identity transaction、framework/ 母版或无关 dirty 文件。

## 块 4 — 失败策略

- 任一 BLOCKING 断言失败：停止当前 Phase，修复后重跑；连续两次同类失败走 delta replan。
- remote CI 失败：不配置 branch protection；保留本地证据并标 `BLOCKED_EXTERNAL`。
- protection API 与最小预期不一致：不扩大规则，回读现状后回滚本轮新增 protection。
- 未测得真实 need 的实验：状态保持 `DEFER` 或 `NOT_NEEDED`，不为了“全完成”实现。

## 块 5 — 出门自检

- [x] 前提门、薄替代与 kill assumptions 已列。
- [x] 各 Phase 均溯源到用户原话和既有 FINAL-OPP 清单。
- [x] 外部设置有 BLOCKING 门与可回读回滚条件。
- [x] 研究跳过理由显式记录。
- [x] 每个 Phase 已填 model_tier。
- [x] 本案不是设计产出，OD-first 为 N/A。

## 块 6 — 执行结果

- Phase 1：完成。`FINAL-OPP-01=NEED`；`FINAL-OPP-02=NOT_NEEDED_AS_NEW_PROFILE`；native judge isolation 与 execpolicy 均 `DEFER`；remote CI/branch protection 为 `NEED`。
- Phase 2：完成。source-derived semantic projection 与 31/31 proof-it-bites 落地；未新增第二 skill/obligation catalog。
- Phase 3：完成。提交 `e399f45` 与 follow-up `6449180` 已推送；精确 SHA `644918028f75fd9c1c8c33107d808814fd198272` 的 [CI run 33165797050](https://github.com/wangmoumou1216-ai/luca_gstack/actions/runs/33165797050) 成功；`main` 只要求 `Required Checks` 且 API read-back 精确。
- Phase 4：完成。终局状态、残余和外部证据写入 `completion-review.md`、`remediation-report.md`、`evidence-index.md` 及主报告；独立 reviewer 复核记录见 `final-review.md`。
- CR-01/02/03/04/05/06/07：全部通过。全仓 `verify.sh` 为 **81/0/1**；warning 非阻断且已明确归类。

<!-- FILE_END: completion-plan.md -->
