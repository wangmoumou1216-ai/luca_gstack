# A3 — Hooks & 自动化/脚本层 诊断

## Hooks & 自动化 诊断

### 现状摘要

luca_gstack 的自动化层由 4 个生命周期 hook（`session-restore` SessionStart、`route-guard`
UserPromptSubmit、`post-edit` PostToolUse、`session-sync` Stop，均为 `.mjs`，零依赖纯 Node）
+ 13 个脚本（4 个 shell、6 个 .mjs 合同检查、1 个 dry-run 测试、2 个 Python MD 修复工具）
组成。所有 hook 在 `settings.json` 中以 `node … 2>> /tmp/…log || true` 方式 wire，stderr
重定向到日志、退出码用 `|| true` 吞掉，因此 hook 抛错不会中断 session（fail-soft）。整体工程
质量高于一般个人项目：有 dry-run 模式、golden test、合同检查、CI。但 route-guard 的关键词匹配
用的是裸 `String.includes` 子串匹配，存在系统性的误命中（false positive），这是本层最高价值的
缺陷，已用 dry-run 实证复现。

### 优点（公允）

1. **fail-soft 设计到位**：4 个 hook 全部 `|| true` + `2>>` 日志兜底（settings.json:17/27/38/48）；
   每个 hook 内部对 stdin、文件读取、execSync 都包了 try/catch，单点失败只跳过该功能而非崩溃。
   session-restore 对 memory 脚本设了 4s 超时并有 CLAUDE.md 静态回退提示（session-restore.mjs:70-77）。
2. **route-guard 有 dry-run + golden test**：`ROUTE_GUARD_DRY_RUN=1` 输出纯 JSON 决策
   （route-guard.mjs:15,347-350），test-route-guard.mjs 用 `ROUTE_GUARD_PROJECTS` /
   `ROUTE_GUARD_CURRENT_PROJECT` 注入隔离环境，覆盖 13 条 golden case，可重复、无副作用。
3. **副作用隔离测试**：check-project-routing.mjs:6-25 断言 dry-run 不改 docs symlink、不改
   turn-count 计数器，是真正在验证"只读"契约而非走过场。
4. **project.sh symlink 切换很严谨**：切换前 `cleanup_stale_docs_aliases` 检测非 symlink 的
   docs 别名并硬失败（project.sh:19-36,61-66），避免误删真实目录；check-project-links.mjs
   交叉验证 docs/state/topic 三个 symlink 指向同一项目。
5. **pre-commit secret 扫描覆盖面广**：Anthropic/OpenAI/GitHub PAT/AWS/私钥 7 类（.githooks/pre-commit:18-63），
   不依赖任何编译产物，纯 grep，可靠。

### 问题清单

- **[严重度:高] [类型:健壮性/一致性]** route-guard 用裸子串匹配，产生 false positive。
  `text.includes(normalize(trigger))`（route-guard.mjs:227）对中英文 trigger 一律做子串包含判断，
  无词边界/无意图判定。实证（dry-run）：
  - `"我需要做一些市场调研背景的整理"` → 命中 `调研` → **PLAN_CHECK /deepresearch**（误判为重型编排器）
  - `"please research-proof this sentence"` → 命中 `research` → **PLAN_CHECK /deepresearch**
  - `"这两个数字对比一下哪个大"` → 命中 `对比` → **SINGLE_SKILL /compare**
  这正是本 session 启动时 PLAN CHECK /deepresearch 误报的根因：trigger 列表里
  `调研`/`research`（skill-routing-map.yaml:39）被任意含该子串的 prompt 命中，叠加
  HEAVY_ORCHESTRATOR_SKILLS（route-guard.mjs:261-266）升级为 PLAN_CHECK。短英文 trigger（`auto`、
  `api`、`research`、`compare`）尤其危险，会嵌入正常英文单词。

- **[严重度:中] [类型:健壮性]** projectGate 的"无激活项目"兜底过于激进（route-guard.mjs:176-183）：
  只要 `!currentProject && prompt.length > 5 && 不以问号结尾`，任何陈述句都被判 PROJECT_STOP，
  阻断后续路由。新环境/symlink 未建时，几乎所有正常指令都会先被项目门禁拦截。

- **[严重度:中] [类型:健壮性]** YAML 解析是手写正则行扫描（route-guard.mjs:36-89、session-sync.mjs:24
  、session-restore.mjs:13），不是真正的 YAML parser。trigger 必须写成单行
  `triggers: [a, b]`（:74 的 `\[(.+)\]` 不支持多行块数组）；status 节点匹配依赖严格的两行缩进格式
  `^  name:\n  status:`（:341）。一旦有人把 workflow-state.yaml 改成块状写法或多行数组，hook 会静默
  漏读，无任何告警。

- **[严重度:中] [类型:context成本]** session-restore 每次 SessionStart 注入约 938 bytes（实测，
  约 250–320 token），含项目列表全量枚举（session-restore.mjs:33-37，项目越多越长）+ PROGRESS.md
  前 25 行 + memory summary。route-guard 在 PLAN_CHECK/PLAN_MODE 时每轮注入 298–361 bytes
  （约 90–110 token）。SINGLE_SKILL 命中仅 80 bytes（合理）。问题在于误命中的 PLAN_CHECK
  会在每个误触轮重复注入 ~110 token 的劝阻文案，成本与误报率正相关。

- **[严重度:低] [类型:死代码]** `scripts/fix_long_lines.py`、`scripts/repair_backticks.py`
  （共 ~17KB）是孤立的 MD 修复工具：仅互相 import（repair_backticks.py:21），无 npm script、
  无 CI、无任何 SKILL/doc 引用（已 grep 全仓确认）。一次性维护脚本，应移出常驻 scripts/ 或归档。

- **[严重度:低] [类型:一致性]** CI（.github/workflows/ci.yml）只跑 yaml/markdown/skill/html 检查，
  **不运行** `check:hooks` 与 `test:routes`。hook 语法/副作用/路由 golden test 只在本地 `verify.sh`
  里跑（verify.sh:74,86），PR 不会拦截 route-guard 回归。test-route-guard 的 13 条 case 全是
  正向断言，缺少 false-positive 负向用例（如"调研背景整理"不应触发 deepresearch），故现有测试无法
  捕捉到上面的高危误判。

- **[严重度:低] [类型:重叠]** status.sh 与 session-restore.mjs 功能部分重叠：都读 workflow-state +
  PROGRESS.md + handoff 并展示进度。两份各自手写 YAML 读取逻辑（status.sh 用 python+yaml.safe_load，
  session-restore 用正则），同一信息两套实现、两种解析器，存在不一致风险。

- **[严重度:低] [类型:健壮性]** session-sync 在 Stop 时无条件写
  `.claude/observability/pending-extraction.md`（session-sync.mjs:114），即使本 session 没跑任何
  skill。每次正常对话结束都会留一个"待提取 skill-rule"提醒文件，下次启动被 session-restore
  报出（session-restore.mjs:57-65），制造噪音/狼来了效应。

### 量化指标

| 指标 | 值 |
|------|----|
| Hook 数 | 4（SessionStart / UserPromptSubmit / PostToolUse / Stop） |
| Hook 运行时依赖 | 0（纯 Node 内建 + python3 仅 memory summary，超时 4s 回退） |
| 每轮注入（route-guard） | SINGLE_SKILL ~80B（~25tok）；PLAN_CHECK/MODE ~300–360B（~90–110tok）；STOP ~330B |
| 每 session 启动注入（session-restore） | ~938B（~250–320tok），随项目数 / PROGRESS.md 增长 |
| 脚本数 | 13（shell×4 + .mjs 检查×6 + 测试×1 + Python×2）；另有 ci.yml |
| 测试覆盖 | route-guard：13 正向 golden case（0 负向/false-positive 用例）；hooks：3 集成 case（session-sync×2、session-restore×1）；post-edit：0 测试 |
| CI 覆盖 hook/route 测试 | 否（仅 yaml/md/skill/html；check:hooks 与 test:routes 仅本地 verify.sh） |
| 死代码 | 2 个 Python 脚本（fix_long_lines / repair_backticks），无引用 |

### 优化机会（候选方向）

1. **route-guard 精度（最高 ROI）**：给 trigger 匹配加约束 —— 短英文 trigger 用词边界
   `\b…\b` 匹配；中文 trigger 考虑要求出现在动词/意图位置或要求 ≥2 个 trigger 共现再升 PLAN_CHECK；
   或对 HEAVY_ORCHESTRATOR_SKILLS 的升级加一道"复杂度分 > 0 或多 trigger"门槛，避免单个弱子串就升级。
2. **加负向测试**：在 test-route-guard.mjs 增补 false-positive case（"调研背景整理"→ 不应 deepresearch、
   "数字对比"→ 应 STOP 或不升级），把 route-guard 回归纳入 CI（在 ci.yml 增 `npm run check:hooks` +
   `npm run test:routes`）。
3. **统一 YAML 读取**：把 status.sh 与 hooks 的状态解析收敛到一个共享小工具（或都走 python yaml），
   消除两套解析器和块状/单行格式的脆弱性。
4. **pending-extraction 条件化**：仅当本 session 实际运行过 skill（可借 turn-count 或 observability
   run-log 判定）才写提醒，消除每次结束的噪音文件。
5. **归档死代码**：将 fix_long_lines.py / repair_backticks.py 移至 scripts/archive/ 或仓库外。
6. **projectGate 兜底降级**：把 :176-183 的"任何陈述句即 STOP"改为更窄条件（如仅当含项目/需求类
   关键词时才触发），减少正常指令被门禁误拦。

<!-- FILE_END: A3-hooks-scripts -->
