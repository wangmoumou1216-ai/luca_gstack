# Post-GATE Remediation Report

状态：**DONE_WITH_CONCERNS / NECESSARY_GAPS_REMEDIATED_REMOTE_VERIFIED**
日期：**2026-08-28**
授权：用户先在研究终审后明确回复“你发现的，解决了”，随后要求对尚未完成项按计划审查，“如果需要，就完成”。
范围：先处理 `FINAL-OPP-03..06` 暴露的本地缺陷，再对 `FINAL-OPP-01/02`、remote CI、branch protection、native judge residual 与 execpolicy 做 need-first 裁决。全程保持 `NO_PIN`，未读取或切换下游项目，未调用 identity transaction，未发布。

## 1. Gate 裁决

| Opportunity | 人类裁决 | 执行结果 | 剩余边界 |
|---|---|---|---|
| FINAL-OPP-03 | AUTHORIZE_FIX | **IMPLEMENTED / VERIFIED** | 搜索参数识别是显式 `rg/grep/egrep/fgrep` 子集；未知选项仍保守处理 |
| FINAL-OPP-04 | AUTHORIZE_FIX | **IMPLEMENTED / VERIFIED_WITH_RESIDUAL** | verdict/recorder 职责已分离；Codex native child 仍继承父权限，不能宣称机械 read-only |
| FINAL-OPP-05 | AUTHORIZE_FIX | **IMPLEMENTED / VERIFIED** | writer 已串行化、journal 化并可崩溃恢复；不宣称对不持锁 reader 提供跨文件 snapshot isolation |
| FINAL-OPP-06 | AUTHORIZE_FIX + 条件式完成授权 | **IMPLEMENTED / REMOTE_VERIFIED / PROTECTED** | `Required Checks` 已在精确 SHA 上成功并成为 `main` 唯一 required context；历史 HTML 债务仍被锁定而非清零 |
| FINAL-OPP-01 | 条件式 need-first 授权 | **IMPLEMENTED / VERIFIED_WITH_RESIDUAL** | source-derived static projection 已闭合；不宣称 runtime 模型遵循被机械强制 |
| FINAL-OPP-02 | 条件式 need-first 审查 | **NOT_NEEDED_AS_NEW_PROFILE** | 现有 workflow runner 已提供显式 scratch-CWD 机械隔离；不新增第二 profile/router。native child role 隔离仍是单独 residual |

`execpolicy` prefix 投影继续 `DEFER / NOT_GATE_READY`；本轮没有把 Ask/Allow/Forbidden 语义压成 allow/deny 第二真值。

## 2. 已完成修复

### 2.1 FINAL-OPP-03 — route polarity 与 scope conformance

- `route-guard` 在项目正向信号计算前剥离“不是下游项目”“不要激活/确认/切换下游项目”等显式否定范围；真正的框架+产品混合请求仍保持 `NEEDS_CONTEXT`。
- 显式 `framework-evolution` 与 `Mode 2` 进入顶层 benchmark 流程，不被内部 research skill 替代。
- `project-scope-guard` 不再把 `rg/grep` 的 pattern 数据当成项目路径；真实 path operand 仍 deny/rewrite。
- Codex `apply_patch` 只检查 `Add/Update/Delete/Move` 文件头，补丁正文不再被当作 shell；`docs/` 与 `framework/` 真目标仍受保护。
- 删除开发机绝对路径 fallback，改为 checkout-root 相对解析。
- 路由修复进入 commit `b2762c7`；scope wrapper 与其余主要 remediation 进入 commit `e399f45`。

### 2.2 FINAL-OPP-04 — judge verdict / recorder authority separation

- quality-gate 只产生人类报告和严格 `EVAL_ENVELOPE_JSON`，不得改产物、写 eval-log 或调用 recorder。
- 父级生成 `eval_run_id`、逐字转交 envelope，并调用 `record_eval.py --verdict-file`。
- recorder 严格校验键、类型、状态/计数一致性；对完整规范化 envelope 计算 SHA-256。
- 同一 run ID + 同一 digest 幂等成功；同一 run ID + 不同 digest 明确冲突；并发 replay 由 `flock` 串行化。
- 缺 `eval_run_id` 时输出 `EVAL_ENVELOPE_ERROR`，不伪造 schema 不接受的 UNKNOWN status。
- Codex role 文件删除虚假的 role-level `sandbox_mode` 声明，明确 native child 权限继承父会话。

### 2.3 FINAL-OPP-05 — observability 并发与崩溃恢复

- 一个 POSIX `flock` 覆盖恢复、ID 分配和完整 commit；不支持锁的平台 fail closed。
- ID 在锁内按当日最大序号分配，避免 count-derived 并发碰撞。
- observation/rule 的完整新内容先同目录 staging、`fsync`，再发布含 SHA-256 的 durable journal。
- 进程在第一份目标替换后崩溃时，下一 writer 会校验 digest 并完成剩余事务；缺失/损坏 staging 会明确失败。
- 既有 JSONL 损坏时拒绝覆盖证据，不把坏数据静默当空日志。
- 未改动本轮开始前已经 dirty 的真实 `observations.jsonl` / `rules.yaml` 内容；回归测试使用临时副本。

### 2.4 FINAL-OPP-06 — CI severity、projection portability 与负控

- Codex/Claude capability projection 依据已验证现实统一：两侧均支持 block、deny 和 input mutation；修复已进入 commit `f8024a8`。
- 远端 CI 补齐 scope/transaction、observability、verdict recorder、agent contracts、Codex static wiring、evolution adjudication 等本地关键门。
- 新增稳定 `required-checks` gatherer，任何依赖 job 非 success 均失败。
- Codex static verifier 新增 `--ci`：CI 只验证仓库结构，不伪验某个开发者的本机 trust state。
- framework HTML 从 warning-only 改为阻断式精确债务快照：固定 `html-validate@11.10.0`，登记 6 个文件、317 条历史 finding。新增/减少/新规则/解析错误/文件集变化都会要求显式处理；没有修改 SF-002 只读的 `framework/`。
- 下游 prototype 仍明确为 warning-only，不与 framework mandatory gate 混淆。
- CI 合同有 mutation test：删除一个关键命令时 checker 必须失败。

首次包含上述门的远端 run `33163664368` 揭示了一个真实集成缺口：CI 固定 Node 20，而 `html-validate@11.10.0` 的 package engine 要求 `^22.22.0 || >=24.8.0`；验证器在 Node 20 调用 `fs.globSync` 时退出且未生成报告，检查器又用后续 `ENOENT` 遮蔽原始 stderr。follow-up commit `6449180`：

- 将 `validate-html` 对齐到 Node 24；
- CI contract 明确拒绝 Node 20 变体；
- checker 在 exit 1 但报告缺失时保留原始 stdout/stderr 并 fail closed；
- 新增对应 regression fixture。

精确 SHA `644918028f75fd9c1c8c33107d808814fd198272` 的 [GitHub Actions run 33165797050](https://github.com/wangmoumou1216-ai/luca_gstack/actions/runs/33165797050) 全部成功。随后 `main` protection API read-back 为：只要求 `Required Checks`、`strict=true`、`enforce_admins=false`，无 PR review/restrictions 或额外强制项。

### 2.5 FINAL-OPP-01 — source-derived semantic / obligation projection

- 默认形态为 `.agents/skills/<name>` 解析回 `.claude/skills/office/<name>` 同一 repo-owned source；source/target/root 逃逸、symlink 与 dangling shape 均拒绝。
- intentional external delegation 必须由 source skill 声明 target、reason、authority pointer 与 canonical digest；MagicPath 是当前唯一例外。
- canonical gate projection纳入 `applies_when`、standalone override、parallel-start、order-significant 与 `block_if`，并拒绝 duplicate-key/invalid YAML、negated receipt 与 reverse orphan。
- 实盘在另一 session 安装两个 skill 后仍通过：**141 anchors / 35 shared / 1 delegated**；proof-it-bites **31/31 PASS**。
- 残余：静态 canonical receipt 不等于 runtime obligation execution；external plugin 的非治理实现正文不纳入全量哈希。

### 2.6 FINAL-OPP-02 — 不新增通用 profile

- 现有 `.codex/workflow-runner.mjs` 已以 `-C <scratch> + workspace-write + network_access` 隔离 opt-in workflow agent。
- 静态 runner fixture **18/18 PASS**、runtime fixture **21/21 PASS**；live probe 允许 scratch 写，机械拒绝仓库、framework memory、person memory 与 IPC 四类越界写。
- 因此新增 profile/router 没有增量 need，且会制造第二 permission-selection truth。native role-level sandbox 若未来出现一次真实 judge mutation，或上游提供独立 role sandbox，再单独重访。

## 3. 验证证据

| 验证 | 结果 |
|---|---|
| `npm run test:routes --silent` | **PASS 132 / FAIL 0**（当前 combined tree；其中 3 条来自另一 session 的 skill 安装） |
| `npm run test:project-scope --silent` | **PASS 96 / FAIL 0** |
| `npm run test:observability --silent` | **3 / 3 PASS**（24-way concurrency、崩溃恢复、坏日志 fail-closed） |
| `npm run test:gate-verdict --silent` | **4 / 4 PASS**（schema、冲突、幂等、12-way replay） |
| `npm run check:agent-contracts --silent` | **53 / 53 PASS** |
| `npm run check:harness --silent` | **harness 13 / 13；viability 36 / 0（34 skills）**（当前 combined tree；新增 2 skills 属于 `3d94271`） |
| `node scripts/verify-codex-wiring.mjs --static --ci` | **PASS 18 / FAIL 0 / BLOCKED 1**；BLOCKED 是按参数跳过 live probe |
| `npm run test:semantic-parity --silent` | **31 / 31 PASS**；实盘 **141 anchors / 35 shared / 1 delegated** |
| `node scripts/test-workflow-runner.mjs` | **18 / 18 PASS**；既有 scratch isolation 保持 |
| `npm run test:framework-html-baseline --silent` | **5 / 5 PASS**，包含新增问题、parser error 与“validator 无报告”诊断负控 |
| `npm exec --yes --cache <temp-cache> --package=html-validate@11.10.0 -- node scripts/check-framework-html.mjs` | **PASS：6 files / 317 known findings**；直接运行 checker 需 `html-validate` 已在 `PATH`，否则会按设计 fail closed；CI 显式全局安装 pinned version |
| `npm run test:ci-contract --silent` | **3 / 3 PASS**，缺关键 gate 与 Node 20 变体均被拒绝 |
| `bash scripts/verify.sh` | **PASS 81 / FAIL 0 / WARN 1**；唯一 warning 是既有 ADR 目录无记录 |
| CI YAML parse + `git diff --check` | **PASS** |
| Remote GitHub Actions | **SUCCESS**：run `33165797050`，head `644918028f75fd9c1c8c33107d808814fd198272` |
| Branch protection API read-back | **PASS**：仅 `Required Checks`，strict；无 PR review/admin enforcement/restrictions |

## 4. 回滚条件

- Route/scope：若否定处理吞掉真实混合项目意图、搜索 parser 放过真实跨项目 operand，或 patch header 绕过 `docs/framework` 保护，回滚对应 parser，保留既有 pin/CAS 核心。
- Verdict/recorder：若 recorder 能改写 verdict、run conflict 未阻断或 envelope 丢失被静默视为成功，回滚 bridge 并恢复显式人工记录；不得恢复 judge 自写。
- Observability：若锁产生可复现死锁/显著延迟、journal 恢复会覆盖 digest 不匹配数据，停用新 writer 并从事务前快照恢复；不得删除未裁决 journal。
- CI：若 pinned validator 无法在 clean runner 复现、required gatherer 出现假绿或 mandatory/optional 严重度混淆，回滚对应 CI 接线；不要把 framework gate 降回无条件 warning-only。

## 5. 残余风险与未做事项

1. Native Codex quality-gate 仍没有 role-level mechanical read-only；当前解决的是责任和记录权分离、诚实能力声明与篡改可见性。新增通用 profile 已判 `NOT_NEEDED`；重访要由真实 judge mutation 或原生 role sandbox 触发。
2. Static semantic projection 证明 source/target/authority/receipt 一致，不证明模型在 runtime 执行了全部义务。
3. 317 条 framework HTML 历史债务被锁定而非清零；SF-002 禁止本轮直接编辑母版。
4. Remote CI 已运行并成功；Codex live L1–L3 沿用同日 21/0/0 与 runner isolation probe，没有因本轮静态 projection 再做无增量重跑。
5. Execpolicy 延期项、semantic promotion、gap/benchmark registry adoption、发布与版本发布均未执行。

<!-- FILE_END: remediation-report.md -->
