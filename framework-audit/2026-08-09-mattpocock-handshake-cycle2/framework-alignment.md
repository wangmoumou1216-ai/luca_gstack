# Cycle 2 Phase 1 — framework alignment

> 状态：`BLOCKED — DIFFERENCE REVIEW COMPLETE`
> 边界：只读 Git 与现状审计；未 fetch/pull/checkout/merge/commit/push，未改 route、global skill 或 activation。
> 对象：冻结 Plan `b90042f41ff969877150ce70d9de2a5c55b5ef38abf8df596fe86b0303fa267c`、基线 `ef8eadf19b9bd98801aed4446b80816a1727f66f`、两个 `main` 检出。

## 1. 先给结论

两个检出不是分叉，而是同一条 `main` 历史上的严格线性滞后：

```text
3f2caad (Desktop checkout HEAD = origin/main)
  → 2cf3c92
  → ef8eadf (冻结 Plan 指定 baseline)
  → a8dfa53
  → 0a77b34
  → aa98422
  → 55b17da
  → dce92e6 (Runtime checkout HEAD = upstream/main)
```

- `git merge-base dce92e6 3f2caad` = `3f2caad`；`3f2caad` 是 `dce92e6` 的祖先；距离 7 commits，反向独占 0。
- 两边 remote 名不同，但 `origin` 与 `upstream` 都指向 `https://github.com/wangmoumou1216-ai/luca_gstack.git`。
- 两个 HEAD 都精确等于各自**本地缓存**的 tracking ref（均 `+0/-0`）。runtime 的 `upstream/main` reflog 是 2026-08-08 `update by push`；desktop 的 `origin/main` reflog 停在 2026-08-06 `update by push`。未 fetch，所以不把本地 tracking ref 冒充“此刻服务器状态”。
- Desktop checkout 的 object database 连 `ef8eadf` 与 `dce92e6` 都无法解析；指定 baseline 位于 desktop HEAD 之后 2 commits、runtime HEAD 之前 5 commits。

因此冻结门按字面同时触发：

- `KILL-1 = NEEDS_CONTEXT`：`ef8eadf` 不是两个**当前 HEAD** 的共同祖先；它是线性历史中的中间点，desktop checkout 还没到它。证据：`audit-execution-plan.md:26-28` 与上述 ancestry/object checks。
- `KILL-2 = BLOCKED`：两个 HEAD 不相同，尽管它们严格线性。证据：`audit-execution-plan.md:29-30`。
- dirty 的路径级交集为 0：两份 owned outputs 在取证时都不存在；两仓 tracked dirty 与 `baseline..dce92e6` 的 7 个 changed paths 无交集。未跟踪的 audit 文件是本轮明确要求读取且已 hash 的只读输入，不会被覆盖。KILL-2 仍由“HEAD 不同”这一独立分支触发。
- `KILL-3` 未被最终树触发：`baseline..dce92e6` 没改 external-skill route、project-scope-guard、Codex adapter、agent roster 或 FUSION activation。`a8dfa53` 曾加 sidebar-focus hook，`0a77b34` 撤注册，`aa98422` 删除脚本；最终树不保留该根架构。

Phase 2 不得开始。本文件完成的是 KILL-2 允许的“差异报告”，不是替 Luca 同步或选择 writable truth。

## 2. 裁决口径

- `SATISFIED`：当前冻结 Plan 或现行可执行机制已经完整关闭该 blocker，且有可复放证据。
- `PARTIAL`：结构或一部分机制已明确，但承重 artifact / fixture / receipt 尚缺。
- `CONFLICT`：现行 live 机制与冻结 Plan 的唯一候选不变量直接相反。
- `UNAFFECTED`：更新没有改变该 blocker，所需实物仍完全不存在。
- `NEW_RISK`：`baseline..dce92e6` 新增了独立风险。本轮为 0 项。

汇总：`SATISFIED 1 / PARTIAL 5 / CONFLICT 5 / UNAFFECTED 2 / NEW_RISK 0`。

## 3. B01–B13 逐项裁决

### B01 — PARTIAL — 复合原子 / 错误分母

- Blocker 原证据：`round2-findings.md:16-29` 证明 57 分母仍含 MP-021/MP-017 复合项。
- 当前进展：冻结 Plan 已把原子判据改成“一 trigger、一 observable effect、一独立 degrade/verify”，ID 改为来源哈希，且 N 只能由 source/live/independent 三路 join 后得出（`audit-execution-plan.md:199-211,228-241,258`）。这修正了**方法**，尚未生成分母。
- Commit / file：`ef8eadf..dce92e6` 的 7 个 changed paths 没有 census/manifest 文件；没有 post-baseline commit 落地 B01。
- Test：只读 artifact existence audit 显示 `source-census.json=false`、`live-census.json=false`、`independent-census.json=false`、`atomic-manifest.yaml=false`。
- 裁决理由：拆分规则与独立 join 已清楚，实际原子集合和 N 仍不存在，因此不是 SATISFIED。

### B02 — UNAFFECTED — 漏 5 个来源对象

- Blocker 原证据：`round2-findings.md:31-46` 点名 `setup-ts-deep-modules/SKILL.md`、`git-guardrails-claude-code/SKILL.md`、`CLAUDE.md`、`.claude-plugin/plugin.json`、`scripts/link-skills.sh` 五个遗漏对象。
- 当前进展：冻结 Plan 只在未来 U-204 规定 transitive closure 与 missing-origin fixture（`audit-execution-plan.md:244-255`）；当前没有 ledger。
- Commit / file：`ef8eadf..dce92e6` 无 origin/lineage 文件变化。
- Test：artifact audit `origin-ledger.json=false`、`tools/audit.mjs=false`、`fixtures/census/missing-origin.yaml=false`（fixture 目录尚未创建）。
- 裁决理由：没有任何持久化闭包可核；旧漏项原样开放。

### B03 — UNAFFECTED — HEAD identity 未持久化

- Blocker 原证据：`round2-findings.md:48-53` 指出 20 个 HEAD 对象只有 transient receipt，没有逐对象 SHA/OID/bytes/EOF 自包含记录。
- 当前进展：U-204 已写明未来逐对象 ledger 字段（`audit-execution-plan.md:244-255`），但没有生成 `head-ledger.json`。
- Commit / file：post-baseline 7 个 changed paths 仅含 session hook、两份运行时契约、self-model 与 verifier；无 HEAD ledger。
- Test：artifact audit `head-ledger.json=false`。
- 裁决理由：计划描述不等于持久化 identity receipt，故更新未影响 blocker。

### B04 — CONFLICT — patch 全文被路径扫描 / 改写

- Blocker 原证据：`round2-findings.md:55-65`；冻结候选要求只解析 `Add/Update/Delete File` header、正文逐字节保持、malformed patch fail-closed（`audit-execution-plan.md:309-324`）。
- Commit / file：
  - `56500daa` 在 `.codex/codex-hook-adapter.mjs:60-62` 把送往 project-scope-guard 的 `apply_patch` 映射成 `Bash`。
  - baseline `ef8eadf` 的 `.codex/codex-hook-adapter.mjs:70-93` 只给 **post-edit** 解析 patch header，并在 `:78-79` 明说 guard 继续吃整个 command。
  - `04a5faf8` 的 `.claude/hooks/project-scope-guard.mjs:128-145` 对整个 command 做 project-document token 正则检测与 replace；不是 header parser。
- Test：实际 probe 的 patch target 是 `README.md`，只有新增 prose 含 project-document token；adapter→guard 仍返回 `permissionDecision=deny`。B04 可复现。
- 双检出影响：该 bug 的核心映射早于两个 HEAD；desktop 还缺 baseline 的 post-edit header 归一化，但这不关闭 guard 的全文扫描。
- 裁决理由：现行机制与 U-401 的 body-preservation 不变量相反。

### B05 — PARTIAL — 验收不可执行

- Blocker 原证据：`round2-findings.md:69-74`。
- 当前进展：冻结 Plan 已为各 U-block 写 command、input/fixture、expected exit/status；U-501 又要求 owner/files/input/command/expected/receipt/rollback 全字段（`audit-execution-plan.md:380-388`）。这是对旧“只有 fixture 名”的实质改进。
- Commit / file：这是冻结 audit plan 的计划级改进；`ef8eadf..dce92e6` 没有对应 runner commit。
- Test：artifact audit `tools/run-fixtures.mjs=false`、`tools/verify-receipt.mjs=false`、`schemas/receipt.schema.json=false`；所以 Plan 中命令当前不可运行。
- 裁决理由：调用合同已具体化，但执行体和 schema 不存在，只能 PARTIAL。

### B06 — SATISFIED — 无 accountable owner

- Blocker 原证据：`round2-findings.md:76-80`。
- Commit / file：冻结 Plan 的 owner roster 在 `audit-execution-plan.md:61-76`；7 个执行 phase 分别在 `:132,157,196,266,306,377,407` 声明 owner(s)，并明确独立性与失败责任。
- Test：`rg '^owner:|^owners:' audit-execution-plan.md` 返回上述 7 个 phase owner declarations；owner table 返回 MAIN、WA-SNAPSHOT、EA-SNAPSHOT、WA-SOURCE、WA-LIVE、EA-CENSUS、WA-LEDGER、WA-HARNESS、WA-ARCH、EA-ARCH、EA-R1/EA-R2、FINAL-JUDGE。
- 边界：SATISFIED 只表示**本周期审计执行 ownership** 已闭合，不表示 B01–B13 的未来实现已完成。

### B07 — PARTIAL — track 级 T/E/D/V

- Blocker 原证据：`round2-findings.md:82-87`。
- 当前进展：U-301 改成每个 `MATT-*` 分别填写 Claude/Codex 的 Trigger、Execute、Degrade、Verify，适用格必须指向 route/command/target/fixture/receipt（`audit-execution-plan.md:269-280`）；U-302 定义 native-log-backed receipt 字段（`:283-297`）。
- Commit / file：没有 post-baseline framework commit 生成 matrix。
- Test：artifact audit `harness-matrix.yaml=false`、`schemas/receipt.schema.json=false`。
- 裁决理由：粒度合同已修正，逐 atom 的双端矩阵仍未产生。

### B08 — PARTIAL — manifest / validator 可共同漏项

- Blocker 原证据：`round2-findings.md:89-93`。
- 当前进展：U-201/U-202 强制 source-first 与 live-first 相互不可见；U-203 用禁止 import `audit.mjs` 的第三路 replay join（`audit-execution-plan.md:199-241`）。这是正确的独立性设计。
- Commit / file：`a8dfa539` 只把 `scripts/verify-codex-wiring.mjs:47-56` 从检查首个 hook group 改为检查全部 group；它减少一个局部 validator 漏项，但不是独立 census，也不能关闭 B08。
- Test：artifact audit `tools/replay-census.mjs=false`、三份 census 全 false；`baseline..dce92e6` changed paths 不含任何 census parser。
- 裁决理由：反自证架构已写进 Plan，但独立实现尚不存在。

### B09 — CONFLICT — quarantine / activation 死锁

- Blocker 原证据：`round2-findings.md:95-100`；冻结 Plan 把即时 containment 独立放到 H1，并与 activation H4 分开（`audit-execution-plan.md:49-59,342-359`）。
- Commit / file：`bfd469cd` 的 `.claude/skill-os/skill-routing-map.yaml:313-324` 仍主动 surface `codebase-design` 与 `resolving-merge-conflicts`，没有 `NEEDS_ADAPTATION`/quarantine 状态。
- Live target evidence：`/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md:10` 写 `Always resolve; never --abort`，`:14` 写 `Stage everything and commit`；Codex `.agents/skills` 的两个目标均不存在。
- Test：target audit = `{claude_codebase:true, claude_resolving:true, codex_codebase:false, codex_resolving:false}`。
- 裁决理由：危险 Claude target 仍可达、Codex route 仍 dangling；这与 H1 containment 目标直接冲突。若 MAIN 要继续，必须停在人类 H1；本 agent 未改 route。

### B10 — CONFLICT — post-success pin transaction

- Blocker 原证据：`round2-findings.md:102-107`；冻结唯一候选要求 compound deny、guard 不提前写 pin、`project.sh` 成功后 atomic rename（`audit-execution-plan.md:309-324`）。
- Commit / file：`e4a9002b/04a5faf8` 的 `.claude/hooks/project-scope-guard.mjs:216-229` 在 PreToolUse 检出 switch/new 后立刻 `writeFileSync(.session-project-<sid>)`，并用新 pin 重写**同一个 compound command**；命令是否成功尚未知。
- Test：`node scripts/test-project-scope-guard.mjs` = `PASS=40 FAIL=0`，其中现有用例明确把 `project.sh switch X → claims pin` 和 `echo start && project.sh switch X → claims pin` 当 PASS（测试源 `scripts/test-project-scope-guard.mjs:109-116,163-169`）。这不是闭合证据，而是把旧风险钉成回归行为。
- Post-baseline delta：`dce92e6` 的 `.claude/hooks/session-restore.mjs:36-60` 只把精确 session id 投到 app spool，不参与 switch 成功判断或 pin CAS。
- 裁决理由：live code 和 live tests 都与 U-401 相反。

### B11 — CONFLICT — logical roles / runner 未决

- Blocker 原证据：`round2-findings.md:109-114`；冻结唯一候选要求 repository-level `.codex/agents/{plan-agent,work-agent,oracle}.toml`，且 workflow runner 不承担一级 role dispatch（`audit-execution-plan.md:327-339`）。
- Commit / file：`ef8eadf..dce92e6` 没有 `.codex/agents` 变化。当前目录只有 `muse-proto-judge.toml`、`preflight-agent.toml`、`quality-gate.toml`；`.codex/workflow-runner.mjs` 仍存在。
- Test：role audit = `{plan-agent:false, work-agent:false, oracle:false}`，current roster 为上述 3 个非目标角色。
- 裁决理由：冻结 Plan 选定的三角色架构没有落地，现状仍只能靠模板/runner/同线程解释，故 CONFLICT。

### B12 — CONFLICT — activation / ledger / rollback ordering

- Blocker 原证据：`round2-findings.md:116-122`；冻结候选要求 journal 状态机、CAS、逆 DAG 补偿，且 defer/reject ledger 与 activation 分离（`audit-execution-plan.md:342-359`）。
- Commit / file：
  - `.claude/skill-os/evolution/FUSION-RUNBOOK.md:23-24` 仍是 step ⑧ merge/commit 后 step ⑨ append adoption log + pins，没有跨 surface journal/CAS。
  - 同文件 `:42-44` 仍把 `git reset --hard pre-fuse-<id>` 写成首选 rollback，与冻结 Plan `:483` 的禁令相反。
  - 这些行分别来自 `ac0ce4f6/5683fd12`，post-baseline 无修订。
- Test：artifact audit `schemas/activation-journal.schema.json=false`、`tools/verify-journal.mjs=false`；静态 grep 命中 `reset --hard`。
- 裁决理由：现行 activation/rollback 顺序和安全语义直接冲突。

### B13 — PARTIAL — live gate 无可运行双 harness 合同

- Blocker 原证据：`round2-findings.md:124-130`。
- 当前可复用部分：
  - `scripts/verify-codex-wiring.mjs:273-335` 有真实 Codex session probe，能把 unavailable 标 `BLOCKED`；但它只覆盖 Codex hook wiring，不是 atomic capability 的 Claude+Codex gate。
  - post-baseline `dce92e6` 在 `.claude/hooks/session-restore.mjs:36-60` 增加 exact session id spool，改善 app 页签↔session 对应。
- 缺口 / test：没有 Claude launch、isolated-home candidate injection、nonce、parent/child distinctness、role uniqueness、native log hash、artifact hash、expiry 或 mechanical restoration；artifact audit 中 receipt schema/verifier/runner 全 false。
- 额外证据风险：现 verifier `scripts/verify-codex-wiring.mjs:325-326` 仍带“仓库 hooks 不加载、须并入全局”的过期失败文案，和同文件 `:183-205` 的现行 S11 架构自相矛盾；不能拿其输出当 U-302 receipt。
- 裁决理由：已有单端 live probe 与 exact sid 是可复用积木，但离 runnable two-harness contract 很远。

## 4. `baseline..dce92e6` 的实际影响

最终净 changed paths 只有 7 个：

```text
.claude/hooks/session-restore.mjs
.claude/settings.json
.claude/skill-os/claude-md-appendix.md
.claude/skill-os/evolution/self-model.generated.yaml
AGENTS.md
CLAUDE.md
scripts/verify-codex-wiring.mjs
```

其含义：新增 exact session-id spool、登记 sidebar_selection、补 Codex 一级 skill 路由表、把 S4 verifier 改为遍历所有 hook group。它们没有生成 census/ledger/matrix/receipt/journal，也没有改变 pin、external route、agent roster 或 activation 根架构。因此 B04/B09/B10/B11/B12 的 live 冲突仍在；B13 只得到一个可复用 session-id 积木。

Desktop checkout 额外缺少 baseline 前两 commits 涉及的 4 个路径：`.codex/config.toml`、`.codex/codex-hook-adapter.mjs`、`scripts/test-codex-adapter.mjs`、`scripts/verify-codex-wiring.mjs`。这证明是 checkout lag，不授权本轮同步。

## 5. Execution addendum 候选（未应用）

冻结 KILL-2 的安全目标是避免在分叉或重叠 WIP 中替用户选真值；仓库契约同时声明 `main` 单真值源、双检出。本轮一手事实证明是严格线性滞后，不是 fork。候选补充如下：

> 仅对只读 Phase 1：若两检出 canonical remote URL 相同、HEAD 严格线性、各自 HEAD 等于其本地 tracking ref，且 dirty manifest 与 framework delta / owned outputs 无路径交集，则记为 `LINEAR_CHECKOUT_LAG`。允许用唯一后继做 provisional `baseline..descendant` 对齐，但不得把它声明为 writable truth、不得同步。Phase 2 与所有 mutation 继续 BLOCKED，直到 Luca 明确对齐/选择。若 lagging checkout 早于指定 baseline，KILL-1 记 `STALE_CHECKOUT_NEEDS_CONTEXT`，不得静默换 baseline。

本 addendum 当前 `applied=false`。它只解释为什么本只读差异审计仍有价值，不豁免当前 KILL-1/KILL-2，也不授权任何 Git 状态变化。

## 6. 后续门

1. Phase 2：`BLOCKED`，等待 Luca 处理双检出状态或明确批准上面的 addendum。
2. H1：B09 证明危险 Claude target 仍可达且 Codex route dangling；若要做最小 quarantine，须由 MAIN 单独向 Luca 请求 H1，不能借本审计直接改 route。
3. 本轮没有写入 framework、route、agent、skill、global directory，也没有触碰两仓现有 dirty 内容。

<!-- FILE_END: framework-alignment.md -->
