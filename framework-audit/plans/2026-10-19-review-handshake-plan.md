# luca_gstack 评审握手方案 v3 · 握手定稿

> 状态：HANDSHAKE。专家会审 1 次 + 红队对抗 2 轮已完成（上限），全部 BLOCKER/MAJOR 已按对抗方给出的修复文字并入；唯一残余分歧 RD-1 已裁决（见文末）。无未决项。

## Context
2026-10-19 本会话对 muse 的「luca_gstack 路由与 agent 适用性评估」做了两阶段独立复核：框架总体适用，问题集中在证据卫生（假声明、陈旧登记、过时 CI 认知）、未经营的 attestation 实现风险、价值无数据。本方案把这些落成一轮小范围改进，交 Codex 执行；luca 批准即授权下文范围。

### 计划阶段勘误（执行与汇报以此为准）
- E1 Codex 路由有生产数据（`~/.luca/state/model-routing/codex/`，含 `*.json.history/`）：642 activation、781 invocation（invocation_id 去重），peak/critical accepted 398、light accepted 91（preflight-agent 70、fact-collector 21）、critical_failure 7。→ 撤回评审中 Codex 路由「冻结」与 preflight「退役」建议。
- E2 workflow-runner 在 `.codex/workflow-runner.mjs`，luca 确认常用 → 不动。
- E3 `scripts/check-model-table.mjs:74` 断言 fact-collector `sandbox_mode == 'read-only'`（测试固化假声明）；e399f45 删过一次、f4b18cb 加回；LG-011（`framework-audit/2026-08-28-codex-harness-benchmark/inventory.md:79`）已记录不生效。
- E4 主工作树 `main` 暂存区有他人 WIP：`.claude/hooks/lib/event-attestation.mjs`、`scripts/test-project-transaction.mjs`。
- E5 Codex PreToolUse 跑 project-scope-guard：NO_PIN 下命令文本含项目软链目录名会被拒。
- E6 `.agents/skills/magicpath` 是 `scripts/sync-magicpath-projection.mjs` 维护、`check-capability-parity.mjs` 守护的有意投影。
- E7 `.githooks/pre-commit` 末尾 `exec bash scripts/verify.sh`，仅 `FAST_COMMIT=1` 跳过；`.githooks/commit-msg` 不受其影响。verify 中 S23 会 `git fetch`。
- E8 同级 worktree 不在 writable_roots、hook 信任按主仓路径登记 → 不用 worktree。
- E9 官方文档：workspace 档下工作根内 `.codex/`、`.git/` 为只读（`framework-audit/u007-permission-official-captures.json` L1227-1229）；0.163 未实测。

## 块 0 前提门
1. 该不该解：是。假只读声明已复发一次且被测试固化；U-REGISTER 失效；无统计则下一轮无法取舍。
2. 更小替代：已取最小——不新增运行时写入点、不改任何 hook、不改 verify.sh。
3. 默认形态偏差：唯一移除项是 3 行 `sandbox_mode`；红队以默认 REFUTED 审过，已攻未破（仓内无依赖）。
- KILL-1：Codex 0.163 下自定义 agent 的 `sandbox_mode` 不生效。判据：①U-000b 带对照组 spike；②spike 不可判时用官方 subagents 文档（“sandbox_mode … do not override the parent”“don't create a separate read-only sandbox”）+ LG-011，报告注明「未实测」。spike 判「生效」→ U-001 BLOCKED 上报。
- KILL-2：E4 两路径不进入本方案任何提交（A5 校验）。

## 块 1 复杂度
Sequential（P0→P4），每 Phase 末 quality-gate 冷审（Supervisor）。需用户确认：是。Tier：Standard。块 1.5/1.6：N/A。

## 授权范围（批准即授权，超出即停）
**启动**：按 RD-1 裁决（`codex -C /Users/luca/Desktop/luca_gstack -s workspace-write -a on-request`；`git commit`/`git push`/`gh`/改 `.codex/agents/*.toml` 按需申请提权，由 luca 逐次批准）。U-000a 写探针：apply_patch 给 `.codex/agents/preflight-agent.toml` 末尾加一行空注释再精确删除；被拒且无法申请提权 → 全案 BLOCKED，上报需改用的启动模式，不自行切换。

**位置**：主工作树 `/Users/luca/Desktop/luca_gstack`，分支 `main`；不切分支、不建 worktree、不 stash、不 reset、不 rebase、不 amend。

**提交（固定两步）**：①只对本 Phase **新建**的白名单文件 `git add -- <逐个具体路径>`（禁目录、通配、`-A`、`.`）；②`git commit -m "<msg>" -- <本 Phase 全部具体路径>`。提交前 `git diff --cached --name-only` 必须恰为「E4 两路径 + 第①步文件」。每次提交成功立即 `git rev-parse HEAD` 记入 MINE，并断言其唯一父提交 = 上一条记录（首条父提交 = BASE）。提交信息不得含项目软链目录名或项目名。

**pre-commit / commit-msg**：默认让 verify 跑。verify exit 2（预检失败）→ 记录预检 ID 与输出，全案 BLOCKED，不得 FAST_COMMIT。verify 检查失败时，对每个失败 ID 从 `scripts/verify.sh` 取其命令单独重跑取 stderr 首行；仅当 ID 与 stderr 首行都与 U-000a 基线一致，才允许该次 `FAST_COMMIT=1`，并写入报告。commit-msg 失败 → 停，禁止绕过。禁止 `--no-verify`。每次 verify 前后 `git status --porcelain` 必须一致（remote 引用更新除外）。

**推送**：全部 BLOCKING 通过后，先断言 `git rev-list --reverse origin/main..HEAD` 与 MINE 完全一致（集合与顺序），再 `git push origin main`；不一致或非 fast-forward → BLOCKED，不推送。

**允许**：修改白名单；运行仓内测试与只读命令；只读读取 `~/.luca/state/model-routing/`、`~/.codex/sessions`、`~/.claude/projects`（仅 cwd 为框架根的会话，报告只给计数不摘录内容）；`gh` 只读（run view/log/list、pr view/diff）。

**禁止**：改 `framework/`；碰项目软链与任何项目；切/建项目；改 `.codex/hooks.json`、`.claude/settings.json`、`.codex/config.toml`、全局 `~/.codex` `~/.claude`；改 `.claude/hooks/**`、`scripts/verify.sh`、`package.json`；删 agent/skill；改任何 TOML 的 `developer_instructions`；对 PR 评论/close/merge；`npm ci`/`npm install`。controlled-change 拒绝 Bash → BLOCKED 上报，不重试。

**Workflow 保护（luca 指示）**：不得修改 `.codex/workflow-runner.mjs`、`.claude/skill-os/optional-workflow-graph.yaml`、`.claude/skill-os/input-modes.yaml`、`.claude/skill-os/generated/**`、`.claude/skill-os/routing-chain-check.md`、`.claude/skill-os/skill-invariants.md`、`.claude/skills/**`、`.claude/agents/quality-gate.md`、`.claude/agents/references/**`，及提交 cda4d56、a9ed77d 触碰过的全部文件。唯一例外：`memory/evals/eval-log.jsonl` 仅允许追加本方案 quality-gate 落账行。

## Files 白名单
```
.codex/agents/fact-collector.toml
.codex/agents/preflight-agent.toml
.codex/agents/muse-proto-judge.toml
.claude/agents/muse-proto-judge.md
scripts/check-model-table.mjs
scripts/check-agent-contracts.mjs
U-REGISTER.md
RESIDUAL.md
scripts/report-usage.mjs
scripts/test-report-usage.mjs
scripts/fixtures/report-usage/**
scripts/probe-attestation-fields.mjs
scripts/test-probe-attestation-fields.mjs
scripts/fixtures/probe-attestation/**
.github/workflows/ci.yml
framework-audit/2026-10-19-ci-and-pr-review.md
framework-audit/plans/2026-10-19-attestation-graded-posture-design.md
framework-audit/plans/2026-10-19-review-handshake-plan.md
framework-audit/2026-10-19-review-handshake-execution-report.md
memory/evals/eval-log.jsonl   # 仅追加本方案 quality_gate_run_id 的行
```

## 每个 Phase 的固定顺序
改动 → 本 Phase 断言 → quality-gate 冷审本 Phase 未提交 diff（P4 审 `git diff BASE` + P4 未提交改动）→ 记录器追加 eval-log → 本 Phase 文件与 eval-log 同一提交。提交前 `git diff HEAD -- memory/evals/eval-log.jsonl` 只能新增本次 `quality_gate_run_id` 的行，否则 BLOCKED。quality-gate 因 critical 模型不可用被拒 → BLOCKED，不重试、不降级。共 4 个提交，无第 5 个。

## Phases

### P0 前置核验（只读，不提交）
- U-000a 记录 BASE（HEAD SHA）、`git status --porcelain`、`git diff --cached --name-only`、`claude --version`、`codex --version`、NO_PIN；写探针（见授权）；基线 `bash scripts/verify.sh`（shell 超时 ≥ 600s），逐个失败 ID 单独重跑取 stderr 首行——唯一对照组；`git show --name-only --format= cda4d56 a9ed77d` 与白名单交集必须恰为 `memory/evals/eval-log.jsonl`。
- U-000b KILL-1 spike（系统临时目录，不提交；上限 2 次尝试或 20 分钟，先到为止）：仿 `scripts/test-codex-native-lifecycle.mjs:212-231` 离线 stub provider + 独立 `CODEX_HOME`，在同一 stub 配置下依次让「父会话」「无 sandbox_mode 的测试 agent」「`sandbox_mode="read-only"` 的测试 agent」执行同一条写临时文件命令。前两者成功且后者被拒 → 判「生效」（U-001 BLOCKED）；前两者成功且后者也成功 → 判「不生效」；前两者任一失败 → 「spike 不可判（嵌套沙箱）」，转判据②。

### P1 证据清账（commit 1）
- U-001 从 `.codex/agents/{fact-collector,preflight-agent,muse-proto-judge}.toml` 删 `sandbox_mode` 行；原位注释：「Codex 自定义 agent 的 sandbox_mode 不生效，子 agent 继承父会话沙箱与审批（官方 subagents 文档 2026-10-18 核；LG-011；本轮 spike 结果见执行报告）。只读性由合同约束。」muse-proto-judge.toml「无 Edit/Write 权限」→「合同禁止写入；Codex 侧无机械只读」。preflight-agent.toml effort 注释补「依据 2026-08-05 实测，未对当前版本复验」。`scripts/check-agent-contracts.mjs:133` 改为遍历 `.codex/agents/*.toml`，每个断言无 `^sandbox_mode\s*=` 且含「继承父会话」，保留 `capability-parity.json:53-57` 锚定的既有字样；`scripts/check-model-table.mjs:74` 改为 `assert 'sandbox_mode' not in a`。不改 `developer_instructions`。
- U-002 `.claude/agents/muse-proto-judge.md`：头注改为如实（本仓存在并被路由引用，起源于 muse fork）；tools 注释改为「无 Edit/Write 工具；Bash 可写，只读由合同约束」。
- U-004 `U-REGISTER.md` U-01…U-13 逐条 REFUTED / CONFIRMED / STALE + 证据；只有运行记录（framework-audit 下 ndjson/log 具体行、测试名+断言、提交说明中的实测）才可判非 STALE。U-09 拆为「分叉还是投影」（以 E6 结案）与「运行时读哪棵树」（STALE）。其余无运行证据标 `STALE（2026-10-19 复核，需重新 spike）`。同步 `RESIDUAL.md` 中对 U-REGISTER 的计数与日期。

### P2 只读调查与统计（commit 2）
- U-005 `framework-audit/2026-10-19-ci-and-pr-review.md`：CI——`gh run view 38866662951 --attempt 1 --log-failed` 失败步骤与摘要；09-26→10-06 失败波由哪个提交终结（相邻失败/成功 run 的 headSha）；判定 flaky/超时/真缺陷并给证据。PR #14/#15——diff 摘要、冲突面、已被覆盖部分、处置建议与理由。不改 CI 配置、不评论/close/merge。
- U-007 `scripts/report-usage.mjs`（只读，markdown 到 stdout；参数 `--routing-root`、`--eval-log`、`--sessions-root`，默认真机路径；目录不存在 → 「不可得」exit 0）：Codex 路由读 `*.json` 与 `*.json.history/*.json`，invocation_id 去重；月份取 `root_session_id`（UUIDv7）时间部分，取不到归 `unknown` 并计数；agent_type 取 `external_identity.agent_type`，缺失计数；统计 月×requested_role×critical×status×agent_type 与 critical_failure；标注统计时刻；禁用 mtime。quality-gate：eval-log 按月×状态×skill 与 user_adopted 分布。route-guard 注入：尝试从会话记录识别计数，不可靠 → 「不可得+原因」。测试 `scripts/test-report-usage.mjs` + fixtures：.history 合并、去重、UUIDv7 分月、缺 agent_type、目录不存在。真机运行一次，输出入执行报告。

### P3 attestation 只读探针（commit 3）
- U-011 `scripts/probe-attestation-fields.mjs`：参数 `--attestation-module <path>`；真机运行时用 `git show HEAD:.claude/hooks/lib/event-attestation.mjs` 写到系统临时目录加载（该模块仅依赖 `node:` 内置），结束删除，报告记 `git rev-parse HEAD:.claude/hooks/lib/event-attestation.mjs`。对每份选中的 Claude transcript / Codex rollout **只调用一次** `captureNativeEventFence({sessionId, harness, cwd, transcriptPath|codexHome, recoveryCursor:null, allowTestSourceRoot:false})`（从 offset 0 校验整份历史的 provenance/schema）；sessionId、cwd 只取自该 transcript 自身会话元数据；不调用 attestNativeUserEvent，不另写字段判定。分类：成功 / UNKNOWN_SCHEMA / PROVENANCE_MISMATCH / 其他错误码；GREEN =「≥3 份成功 且 UNKNOWN_SCHEMA=PROVENANCE_MISMATCH=0」，样本不足 INSUFFICIENT，否则 RED；输出宿主版本。超 64MB 跳过计数。测试 `scripts/test-probe-attestation-fields.mjs` + fixtures（同样加载 HEAD 版模块，`allowTestSourceRoot:true`）：正常样例成功、缺 `origin` 样例 UNKNOWN_SCHEMA→RED、样本不足→INSUFFICIENT。真机运行一次，结果入报告；结论只对 HEAD 版有效。
- 接线：`.github/workflows/ci.yml` 在 Validate Framework Logic job 末尾加一步运行两个夹具测试。不改 verify.sh，不接任何 hook。

### P4 设计稿与收尾（commit 4，然后 push）
- U-014 `framework-audit/plans/2026-10-19-attestation-graded-posture-design.md`（Status: PROPOSED，不实现）：§1 威胁模型（原评估 S1 为草稿，补「外部内容经自家自动化注入」与可逆性分层）；§2 分级姿态（fail-closed 保留：不可逆/对外发布/跨项目写/切项目；其余 fail-open+日志；Codex `LUCA_NATIVE_HOOK_STRICT=1` 非零退出即阻断的约束）；§3 降级模式（探针 RED 时权限姿态、探针运行者与时机、版本记录位置，不得放 `.claude/skill-os/runtime/`）；§4 回滚与验证矩阵；§5 与 E4 在途改动协调。
- U-015 写入 `framework-audit/plans/2026-10-19-review-handshake-plan.md`（本方案全文）与 `framework-audit/2026-10-19-review-handshake-execution-report.md`（每个 U 状态/证据、KILL 判定与 spike 结果、E1 最新数字、探针结果、基线对照、FAST_COMMIT 使用及依据、偏差）；quality-gate 冷审 + 落账；A8；push；push 后 `gh run list --commit <HEAD>` 记录 CI 结论（WARNING）。

## 断言（主工作树执行；命令文本不含项目软链目录名；Codex 中「Edit」= apply_patch）
- [BLOCKING] A1 `node scripts/check-agent-contracts.mjs && node scripts/check-model-table.mjs && node scripts/test-claude-native-routing.mjs`
- [BLOCKING] A2 变异自证：apply_patch 在 preflight-agent.toml 加回 `sandbox_mode = "read-only"` → A1 非零；apply_patch 精确删除 → A1 绿，且该文件 diff 与变异前一致（禁 `git checkout` 整文件）
- [BLOCKING] A3 MINE 中每个提交只有一个父提交；各提交 `git show --name-only --format=` 并集中每条路径都匹配白名单
- [BLOCKING] A4 上述并集 ∩ `git show --name-only --format= cda4d56 a9ed77d` ⊆ {memory/evals/eval-log.jsonl}；对 MINE 逐个 `git show <sha> -- memory/evals/eval-log.jsonl` 只含新增行且均属本方案 quality_gate_run_id
- [BLOCKING] A5 并集不含 `.claude/hooks/` 前缀与 `scripts/test-project-transaction.mjs`；E4 两路径仍在 `git diff --cached --name-only` 中（若他人已自行提交则记录不判失败）
- [BLOCKING] A6 `node scripts/test-report-usage.mjs && node scripts/test-probe-attestation-fields.mjs`
- [BLOCKING] A7 `npm run check:hooks && npm run test:routes`
- [BLOCKING] A9 push 前 `git rev-list --reverse origin/main..HEAD` = MINE
- [WARNING] A8 `bash scripts/verify.sh`：每个失败 ID 归 NO_PIN/缺依赖/超时/真缺陷并附单独重跑的 stderr 首行；仅与基线一致者可判预期
- criteria：C1 U-REGISTER 非 STALE 结论均引用运行证据；C2 设计稿无实现代码、标 PROPOSED；C3 统计可由脚本对真机数据复算、月份不来自 mtime；C4 报告如实列出全部 BLOCKED/偏差/FAST_COMMIT。

## 失败策略
BLOCKING 失败 → 停在该 Phase，按 STATUS/REASON/ATTEMPTED/RECOMMENDATION 四段上报 luca；同一失败重试 3 次仍失败 → BLOCKED。不得为过断言扩大范围、改断言或改测试期望。

## 下一轮候选（本轮不做）
quality-gate 采纳落账（须确定性触发，复用 `user_adopted` 与 `memory/eval-schema.yaml`）；版本哨兵接 SessionStart；route-guard 瘦身；preflight 去留（据 U-007）；attestation 分级姿态实现（据 U-014 批准）；新测试接 verify.sh。

## 残余分歧（已裁决）
- **RD-1 已定（luca 2026-10-19 授权 Claude 裁决）：采用 `codex -C /Users/luca/Desktop/luca_gstack -s workspace-write -a on-request`。** 执行时 luca 需在场批准 git 提交/推送、gh 与改 `.codex/agents/*.toml` 的提权请求。
- 原分歧记录： 红队主张 `-s workspace-write -a on-request`：官方文档称 workspace 档 `.git/`、`.codex/` 只读，git 提交与改 TOML 需逐次提权批准，安全但要 luca 在场点批准（预计 10–20 次）。本机历史会话多用 `approval_policy=never` + `danger-full-access`：无打扰，但本方案的全部边界只靠提示词与断言约束、无沙箱兜底。**我的裁决：推荐 workspace-write + on-request**——本方案碰共享 main 并 push，值得一层机械兜底；若 luca 选 full-access，提示词中的禁止项与 A3–A9 断言仍全部有效。

## 会审与对抗处置（摘要）
- 专家会审 F1–F21：全部采纳（隔离他人 WIP、检查器遍历全部 TOML、采纳落账推迟、不建 runtime 数据文件、developer_instructions 禁改、KILL-1 改判据、白名单断言、不改 session-restore、U-09/U-04 证据规则、探针复用导出函数、统计含 .history、不新增每回合写入、范围收缩）。
- 红队第 1 轮 B1–B3、M1–M6、m1–m5：全部采纳（不改 verify.sh、基线对照、取消 worktree、spike、提交内容校验、UUIDv7 分月、探针协议、U-09 拆分、A8 归因）。
- 红队第 2 轮 N1–N8、M-a–M-f：全部采纳（两步提交、启动模式与写探针、探针改为单次 fence 校验、加载 HEAD 版模块、MINE 由执行时记录并校验父链、QG 落账并入同一提交、spike 对照组与上限、verify exit 2 与 stderr 规则、commit-msg、提交信息、controlled-change、apply_patch、会话读取限制、push 后记录 CI）。
- 已攻未破：删三行无仓内依赖；直接提交 main 符合仓库实际惯例且 luca 批准即授权；project-scope-guard 不拦框架根内路径；沙箱下读取 ~/.luca 与会话记录可行；event-attestation 无写操作。

---

## 附录 A · Codex 执行提示词（批准后另存为 `~/Downloads/2026-10-19-luca-gstack-codex-execution-prompt.md`）

```
你是本次 luca_gstack 改进方案的执行者。方案已经过专家会审与两轮红队对抗握手，luca 已批准。

1. 先完整读取方案：/Users/luca/Desktop/luca_gstack/framework-audit/plans/2026-10-19-review-handshake-plan.md
   该文件此时尚不存在，请读取 /Users/luca/Downloads/2026-10-19-luca-gstack-review-handshake-plan.md（同一内容）；P4 的 U-015 会把它原样提交入仓。
2. 严格按方案的 P0→P4 顺序执行，每个 Phase 内按「每个 Phase 的固定顺序」执行。方案就是你的授权范围：
   白名单之外的文件一律不改；「禁止」与「Workflow 保护」中的任何一项都不得触碰。
3. 本任务是框架任务，会话保持 NO_PIN：不切换、不创建、不读取任何项目，不碰项目软链；
   命令文本与提交信息中不要出现项目软链目录名或项目名。
4. 主工作树暂存区里有别人的在途改动（.claude/hooks/lib/event-attestation.mjs、scripts/test-project-transaction.mjs）。
   绝不 stash、reset、checkout、add 或提交它们；只用方案规定的两步 path-scoped 提交。
5. 每次提交成功后立即记录 `git rev-parse HEAD` 到 MINE 并校验父链；push 前校验 `git rev-list --reverse origin/main..HEAD` 与 MINE 完全一致。
6. 任何 BLOCKING 断言失败、KILL 条件触发、需要碰白名单外文件、提权被拒、quality-gate 被拒、或同一失败重试 3 次：
   立即停下，用四段格式上报：
   STATUS: BLOCKED | NEEDS_CONTEXT
   REASON: <卡在哪，具体到文件/命令>
   ATTEMPTED: <已尝试>
   RECOMMENDATION: <给 luca 的可选项>
   不得为了通过断言而扩大范围、修改断言或测试期望，不得用 --no-verify，FAST_COMMIT 只按方案规则使用。
7. 每个 Phase 结束时，用 3–5 行向 luca 汇报：完成的 U、断言结果、提交 SHA、偏差。
8. 全部完成后，交付：4 个提交 SHA、push 结果与 CI 结论、执行报告路径
   framework-audit/2026-10-19-review-handshake-execution-report.md，以及其中 KILL-1 判定、E1 最新统计、探针结论三项的一句话摘要。
完成状态只用 DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT。
```

启动命令（RD-1 裁决）：
`codex -C /Users/luca/Desktop/luca_gstack -s workspace-write -a on-request`
