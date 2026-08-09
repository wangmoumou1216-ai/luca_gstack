# mattpocock 自进化 Cycle 2 — 审计执行 Plan

> 状态：`PLANNED / WAITING_FOR_LUCA`  
> 本文件只定义怎么审、怎么收敛成可握手方案；不执行框架 review，不修改 skill、hook、route、
> registry 或全局目录。Luca 确认本 Plan 后，才读取并评审他刚更新的 luca_gstack。

## 0. 前提门

### 0.1 该不该解

该解。上一周期的独立终审确认：原 57 项清单仍含复合原子、来源账本漏项、验收不可执行，且 pin、
Codex agent、route 隔离、激活事务均未收敛成唯一方案；继续沿用会产生假绿握手。

### 0.2 更小替代

不能只补旧 Plan 的几段文字。旧分母与证据边界已经被证伪，局部修补无法达到 80% 效果；必须从
source-first 与 live-first 两个独立方向重建清单，再生成候选握手 Plan。

### 0.3 默认形态偏差

本案默认产出是“新的候选握手 Plan”，会天然把秤压向“最终应当融合”。相反默认立场由两轮独立
红队承担：默认 `NO_HANDSHAKE`，只有逐原子证据、唯一架构和可运行验收都闭合才放行。

### 0.4 Kill assumptions

- `KILL-1`：2026-08-07 审计时的框架基线暂定为
  `ef8eadf19b9bd98801aed4446b80816a1727f66f`。若时间线或双检出证明它不是共同基线，Phase 1
  立即 `NEEDS_CONTEXT`，不得自行换基线。
- `KILL-2`：若两个 luca_gstack 检出不是同一 HEAD，或任一存在与本任务重叠的未提交用户改动，
  只产差异报告并 `BLOCKED`，不替用户合并或选择真值。
- `KILL-3`：若更新后的框架改变了 external-skill、hook、agent 或 activation 的根架构，使本 Plan
  的审计对象不再成立，触发增量重规划；不得把新架构硬塞进旧分类。
- `KILL-4`：若无法获得某一适用 harness 的真实运行环境，允许完成静态审计，但候选计划只能标
  `UNKNOWN-LIVE`，不可进入 `PLAN_HANDSHAKE_READY`。

## 1. 复杂度与研究裁决

```text
复杂度模式: Hierarchical
模式组合: Sequential 外层 + Parallel Fan-out census + Supervisor 验证
需要用户确认: 是
任务规模 Tier: Deep
```

跳过外部 deepresearch。理由：本轮问题不是寻找行业知识，而是复放本地 Git 历史、框架当前实现、
mattpocock 上游 Git blobs 与既有 adoption dossiers；这些是一手真值。上游最新状态通过精确 Git
commit/OID 快照获取，不用研究型二手资料。

## 2. 不变量与人类门

| Gate | 发生时点 | 允许的动作 | 禁止的动作 |
|---|---|---|---|
| H0 Plan 握手 | 现在 | Luca 只批准本审计流程 | 读取/裁决更新后框架、改 live 行为 |
| H1 安全隔离 | Phase 1 后，仅发现仍存即时危险时 | Luca 可单独批准最小 route quarantine | 借“安全”为名激活新能力 |
| H2 架构决策 | Phase 4 | Luca 对唯一 pin/agent/activation 方案拍板 | 带“或/二选一”进入候选 Plan |
| H3 Plan 握手 | 独立终审 PASS 后 | Luca 批准未来实施 Plan | 自动实施或全局激活 |
| H4 Activation | 未来实现和双活体验收后 | Luca 另行批准 live/global 切换 | 把 H3 当 activation 授权 |

硬顺序：`H0 → 框架 review → census/ledger → architecture H2 → candidate Plan → 最多两轮红队 → 独立终审 → H3`。

## 3. Owner 与隔离

| Owner | 责任 | 独立性 |
|---|---|---|
| `MAIN` | 守人类门、综合证据、写候选 Plan | 不给自己投终审票 |
| `WA-SNAPSHOT` | 冻结更新后框架与双检出差异 | 只读 |
| `EA-SNAPSHOT` | 独立复核 snapshot/hash/diff 边界 | 不读 WA 推理过程 |
| `WA-SOURCE` | 从上游+dossiers 做 source-first census | 不读 live census |
| `WA-LIVE` | 从安装目标/route/pin/reference 做 live-first census | 不读 source census |
| `EA-CENSUS` | 冷上下文第三路 replay 与 join 证伪 | 两份 census 冻结前不可读 |
| `WA-LEDGER` | 生成完整 origin/HEAD blob ledger | 不裁 adoption |
| `WA-HARNESS` | 逐原子 Claude/Codex T/E/D/V 与 receipt 合同 | 不生成 census |
| `WA-ARCH` | 把 pin/agent/activation 各收敛成唯一方案 | 只读现状，产决策稿 |
| `EA-ARCH` | 默认 REFUTE 攻击三项架构 | 不参与设计 |
| `EA-R1` / `EA-R2` | 两轮计划红队 | 每轮新冷上下文 |
| `FINAL-JUDGE` | 终审 frozen artifacts | 不参与生产或修订 |

## 4. 计划产物与工具位置

本周期只在以下隔离目录产审计资产：

```text
framework-audit/2026-08-09-mattpocock-handshake-cycle2/
  audit-execution-plan.md
  plan-freeze.sha256
  framework-snapshot.json
  framework-alignment.md
  source-census.json
  live-census.json
  independent-census.json
  atomic-manifest.yaml
  origin-ledger.json
  head-ledger.json
  harness-matrix.yaml
  architecture-decisions.md
  candidate-handshake-plan.md
  round1-redteam.md
  round2-redteam.md
  judge-verdict.md
  schemas/
    atomic-capability.schema.json
    receipt.schema.json
    activation-journal.schema.json
  fixtures/
    census/composite-atom.yaml
    census/missing-origin.yaml
    harness/missing-role.json
    harness/patch-literal.patch
    project/invalid-names.json
    project/compound-switch.json
    security/secret-canaries.json
    activation/cas-mismatch.json
    activation/partial-failure.json
  tools/
    audit.mjs
    replay-census.mjs
    run-fixtures.mjs
    verify-receipt.mjs
    verify-journal.mjs
```

审计工具不进入 core `scripts/`；只有本轮证实长期复用价值并经 H3 批准后，才另提迁移。

## 5. Phase 与 U-blocks

### Phase 0 — 冻结本 Plan 并停在人类门

```yaml
phase_type: task_execution
model_tier: reasoning-heavy
编排模式: Solo
owner: MAIN
```

#### U-000 — 冻结 Plan

- Goal：保存本文件哈希并停止，不读取更新后框架的内容差异。
- Source：`inline: "我只看你最终的方案"`
- Dependencies：None
- Files：`audit-execution-plan.md`、`plan-freeze.sha256`
- Approach：只对 Plan 自身做结构/覆盖检查；写哈希后等待 Luca。
- Read List：上一周期 `independent-judge-verdict.md`、`round2-findings.md`。
- Test scenarios：happy=Plan 含全部 U-block；edge=发现遗漏前周期 blocker；error=框架 review 已先行。
- Verification：
  `shasum -a 256 audit-execution-plan.md > plan-freeze.sha256`；
  `node tools/run-fixtures.mjs plan-contract --plan audit-execution-plan.md`，预期 exit `0`、status `PASS`。
- Status：`PLANNED`

阶段门控：H0 未收到 Luca 确认前，U-101 及以后不得开始。

### Phase 1 — Plan 后 review 更新框架

```yaml
phase_type: task_execution
model_tier: core-execution
编排模式: Supervisor
owners: [WA-SNAPSHOT, EA-SNAPSHOT]
```

#### U-101 — 双检出与基线 snapshot

- Goal：冻结两个检出的 HEAD、dirty manifest、共同祖先和审计基线。
- Source：`inline: "等你做出来计划以后review框架"`
- Dependencies：U-000 + H0
- Files：`framework-snapshot.json`
- Approach：只读比较 `/Users/luca/Desktop/luca_gstack` 与当前检出；不 pull、不 checkout、不清理。
- Read List：两仓 Git metadata；上一周期 freeze 时间与 `KILL-1`。
- Test scenarios：happy=双 HEAD 一致；edge=只有无关 untracked；error=HEAD 分叉或重叠 dirty change。
- Verification：
  `node tools/audit.mjs snapshot --baseline ef8eadf19b9bd98801aed4446b80816a1727f66f --repo-a /Users/luca/Desktop/luca_gstack --repo-b /Users/luca/Desktop/项目/muse/lucagstack --out framework-snapshot.json`；
  预期 exit `0`；分叉/基线不成立 exit `20` + status `NEEDS_CONTEXT`。
- Status：`PLANNED`

#### U-102 — 更新框架与旧 Plan 对齐审查

- Goal：逐个复核上一周期 B01–B13 在更新后框架中的 `SATISFIED/PARTIAL/CONFLICT/UNAFFECTED/NEW_RISK`。
- Source：同 U-101
- Dependencies：U-101
- Files：`framework-alignment.md`
- Approach：只读 `baseline..snapshot_head` 及重叠 dirty diff；每项必须给 commit/file/line/test 证据。
- Read List：`round2-findings.md`、`revised-handshake-plan.md`、snapshot 中的 changed paths。
- Test scenarios：happy=更新直接关闭某项；edge=实现不同但行为等价；error=更新制造新原子或破坏安全门。
- Verification：
  `node tools/run-fixtures.mjs alignment --input framework-alignment.md --required B01,B02,B03,B04,B05,B06,B07,B08,B09,B10,B11,B12,B13`；
  预期 exit `0`；漏项/无精确证据 exit `21`。
- Status：`PLANNED`

阶段门控：若仍有即时危险能力且需要 live route quarantine，MAIN 停在 H1；未经批准不改 route。

### Phase 2 — 双路独立 census 与完整 blob ledger

```yaml
phase_type: task_execution
model_tier: core-execution
编排模式: Parallel Fan-out → Supervisor
owners: [WA-SOURCE, WA-LIVE, EA-CENSUS, WA-LEDGER]
```

#### U-201 — Source-first census

- Goal：从全部 adoption records、verdict dossiers、pins 与上游 blobs 枚举可独立失败行为。
- Source：`inline: "开多个红队确认是不是只读了一半"`
- Dependencies：U-102
- Files：`source-census.json`
- Approach：一 atom 只允许一个 trigger、一个可观察 effect、一个独立 degrade/verify；能独立失败即拆分。
  ID 使用 `MATT-<sha256(origin_commit|path|source_range|behavior_slug) 前12位>`，不靠顺序编号。
- Read List：所有 mattpocock adoption rows、其引用 dossiers、origin commits；不得读取 `live-census.json`。
- Test scenarios：happy=单行为一 atom；edge=多来源支持同一行为；error=MP-017/MP-021 型复合项未拆。
- Verification：
  `node tools/audit.mjs source-census --repo /Users/luca/Desktop/项目/muse/lucagstack --upstream-ref <resolved-head> --out source-census.json`；
  `node tools/run-fixtures.mjs census --case fixtures/census/composite-atom.yaml --expect-exit 31`。
- Status：`PLANNED`

#### U-202 — Live-first census

- Goal：从 live targets、route、catalog、pins、nested references 和治理消费者反向枚举原子。
- Source：同 U-201
- Dependencies：U-102
- Files：`live-census.json`
- Approach：从磁盘与注册入口反推，不读取 source census；任何 orphan、单端例外、脚本/reference 都单列。
- Read List：更新后框架的 route/pin/agent/hook/skill targets；全局 skill 只读快照。
- Test scenarios：happy=route→target→refs 完整；edge=有意 personal single-harness；error=target 缺失或 patch literal 被改写。
- Verification：
  `node tools/audit.mjs live-census --repo /Users/luca/Desktop/项目/muse/lucagstack --home-snapshot framework-snapshot.json --out live-census.json`；
  任何 orphan exit `32`，但仍写完整报告。
- Status：`PLANNED`

#### U-203 — 独立 replay 与原子 manifest 冻结

- Goal：用不共享 parser 的第三路方法重放来源边界，join 后才得到最终分母 `N`。
- Source：同 U-201
- Dependencies：[U-201, U-202]
- Files：`independent-census.json`、`atomic-manifest.yaml`
- Approach：`replay-census.mjs` 禁止 import `audit.mjs`；EA-CENSUS 冷启动且在两份 census 冻结前不可见。
  三方 join 出现 unmatched/composite/collision 即 BLOCK，不预写 N。
- Read List：精确 upstream commit、dossiers、live root；不读生产者推理。
- Test scenarios：happy=三方集合相等；edge=同能力多消费者；error=共同漏掉来源或 ID collision。
- Verification：
  `node tools/replay-census.mjs --upstream <commit> --repo /Users/luca/Desktop/项目/muse/lucagstack --out independent-census.json`；
  `node tools/audit.mjs join --source source-census.json --live live-census.json --independent independent-census.json --schema schemas/atomic-capability.schema.json --out atomic-manifest.yaml`；
  预期 exit `0`，任一集合差异 exit `33`。
- Status：`PLANNED`

#### U-204 — Origin 与 HEAD ledger

- Goal：持久化所有依赖对象与最新窗口对象的 path/commit/OID/SHA/lines/bytes/EOF receipt。
- Source：上一周期 B02/B03
- Dependencies：U-203
- Files：`origin-ledger.json`、`head-ledger.json`
- Approach：从 manifest 的所有 transitive refs 反向闭包，不用固定“38/20”；HEAD 逐对象落盘，不引用会话回执。
- Read List：atomic manifest 的 origin_refs、当前 upstream diff。
- Test scenarios：happy=闭包完整；edge=同 blob 多 atom；error=遗漏 setup-ts、git-guardrails、plugin contract 任一类。
- Verification：
  `node tools/audit.mjs ledger --manifest atomic-manifest.yaml --origin-out origin-ledger.json --head-out head-ledger.json`；
  `node tools/run-fixtures.mjs ledger --case fixtures/census/missing-origin.yaml --expect-exit 34`。
- Status：`PLANNED`

阶段门控：`N` 只取 `atomic-manifest.yaml` 实际行数；三路集合与 ledger 闭包全部 PASS 才进入 Phase 3。

### Phase 3 — 逐原子双 harness 合同

```yaml
phase_type: task_execution
model_tier: core-execution
编排模式: Supervisor
owners: [WA-HARNESS, EA-CENSUS]
```

#### U-301 — Claude/Codex T/E/D/V matrix

- Goal：每个 `MATT-*` 分别填写 Claude 与 Codex 的 Trigger、Execute、Degrade、Verify。
- Source：`inline: "更新都需要准确适配codex和claude"`
- Dependencies：U-204
- Files：`harness-matrix.yaml`、`schemas/receipt.schema.json`
- Approach：每个适用格必须指向 route/command/target/fixture/receipt；`N/A` 只允许显式 non-routed scope exception。
- Read List：atomic manifest、AGENTS/CLAUDE harness contract、current tool catalogs。
- Test scenarios：happy=两端 live；edge=有意 single-harness；error=静态 presence 冒充 live 或一行覆盖多 atom。
- Verification：
  `node tools/audit.mjs harness-matrix --manifest atomic-manifest.yaml --matrix harness-matrix.yaml --receipt-schema schemas/receipt.schema.json`；
  缺格/伪 N/A exit `41`。
- Status：`PLANNED`

#### U-302 — Harness-issued receipt contract

- Goal：让独立 agent/live 执行回执不可由同线程写几个字符串冒充。
- Source：上一周期 B05/B07/B11/B13
- Dependencies：U-301
- Files：`schemas/receipt.schema.json`、`tools/verify-receipt.mjs`、`fixtures/harness/missing-role.json`
- Approach：receipt 必填 `schema_version, issuer, harness, run_id, nonce, parent_session_id,
  child_session_id, role, target_commit, input_sha256, output_sha256, started_at, finished_at,
  expires_at, status, source_log_path, source_log_sha256`。nonce 在派发前由 orchestrator 生成；验证器必须
  回查原生 harness log，父子 ID 不同、role 唯一、日志 hash 匹配且未过期。
- Read List：Claude/Codex 原生 agent/tool log 契约；不采信模型自述 ID。
- Test scenarios：happy=真实 child receipt；edge=重试同 role 新 run；error=伪造、重放、同 parent/child、过期。
- Verification：
  `node tools/verify-receipt.mjs --schema schemas/receipt.schema.json --receipt <receipt.json> --native-log <log>`；
  真实回执 exit `0`；fixture 伪回执 exit `42`。
- Status：`PLANNED`

### Phase 4 — 三项架构收敛为唯一方案

```yaml
phase_type: task_execution
model_tier: reasoning-heavy
编排模式: Supervisor
owners: [WA-ARCH, EA-ARCH, MAIN]
```

#### U-401 — Project pin 与 patch 隔离方案

- Goal：输出唯一 pin transaction；禁止“post-success mechanism 待定”。
- Source：上一周期 B04/B10
- Dependencies：[U-102, U-301]
- Files：`architecture-decisions.md`、project fixtures
- Approach（预定候选，review 可证明已等价实现）：
  1. PreToolUse 拒绝把 switch/new 与项目作用域操作放在同一 compound command；必须拆成两个 tool call。
  2. guard 只验证项目名并把 session id 传给独立的 `project.sh` 调用，不提前写 pin。
  3. `project.sh` 在所有 link/state 操作成功后，以 temp+atomic rename 最后提交 pin；失败保持旧 pin。
  4. Codex patch adapter 只解析并重写 `Add/Update/Delete File` header，正文逐字节保持；malformed patch fail-closed。
- Read List：更新后 project substrate/guard/adapter/tests。
- Test scenarios：happy=独立 switch 后写；edge=中文项目名；error=dot segment、compound、失败 switch、patch 正文含路径字面量。
- Verification：
  `node tools/run-fixtures.mjs project --invalid fixtures/project/invalid-names.json --compound fixtures/project/compound-switch.json --patch fixtures/harness/patch-literal.patch`；
  预期合法 case exit `0`，攻击 case 被拒且正文 hash 不变。
- Status：`PLANNED`

#### U-402 — Logical agent 唯一 dispatch

- Goal：Claude/Codex 都有真实 plan/work/oracle；不再写 roles 或 runner。
- Source：上一周期 B06/B11/B13
- Dependencies：U-302
- Files：`architecture-decisions.md`、harness fixture
- Approach：Codex 固定采用仓库级 `.codex/agents/{plan-agent,work-agent,oracle}.toml`；workflow runner
  不承担一级 role dispatch。Claude 使用对应原生 agent；两端都必须产 U-302 的 native-log-backed receipt。
- Read List：更新后 Codex agents、Claude agents、model-routing、native logs。
- Test scenarios：happy=3 workers+独立 oracle；edge=单 role 不可用；error=同线程 self-review 或 receipt replay。
- Verification：
  `node tools/run-fixtures.mjs agents --roles plan-agent,work-agent,oracle --matrix harness-matrix.yaml --receipt-check tools/verify-receipt.mjs`；
  两端各四个 distinct child receipts 才 exit `0`；缺 role exit `43`。
- Status：`PLANNED`

#### U-403 — Route containment 与 activation 两阶段事务

- Goal：消除 route quarantine 与“激活后才准改 route”的死锁。
- Source：上一周期 B09/B12
- Dependencies：[U-401, U-402]
- Files：`architecture-decisions.md`、`schemas/activation-journal.schema.json`、activation fixtures
- Approach：
  - 若 Phase 1 证实即时危险，H1 单独授权最小 quarantine；它不激活候选。
  - 非采纳项的 defer/reject ledger 在 H2 后独立提交，不等待 activation。
  - 采纳项走两阶段 journal：`PREPARED → GLOBAL_STAGED → REPO_COMMITTED → GLOBAL_SWAPPED →
    LEDGER_COMMITTED → VERIFIED`；每步 CAS old hash/HEAD/symlink target，失败按逆 DAG 补偿。
  - H4 前只可在 isolated HOME 验证，不碰 live/global target。
- Read List：更新后 FUSION、installed pins、route registry、global target topology。
- Test scenarios：happy=完整切换；edge=非采纳 ledger；error=CAS mismatch、repo commit 后 global swap 失败、ledger 半写。
- Verification：
  `node tools/verify-journal.mjs --schema schemas/activation-journal.schema.json --fixture fixtures/activation/cas-mismatch.json --expect BLOCKED`；
  `node tools/verify-journal.mjs --fixture fixtures/activation/partial-failure.json --expect ROLLED_BACK`。
- Status：`PLANNED`

#### U-404 — H2 架构拍板

- Goal：将三项决策以单选卡交 Luca；候选 Plan 不得保留 “or”。
- Source：`inline: "最终一个握手的plan"`
- Dependencies：[U-401, U-402, U-403, EA-ARCH PASS]
- Files：`architecture-decisions.md`
- Approach：EA-ARCH default-REFUTE 后，MAIN 只呈现每项一个推荐方案、反例、回滚；Luca 拍板。
- Verification：`node tools/run-fixtures.mjs architecture --input architecture-decisions.md --forbid-unresolved-alternatives`；预期 exit `0`。
- Status：`PLANNED`

### Phase 5 — 生成可执行候选握手 Plan

```yaml
phase_type: task_execution
model_tier: reasoning-heavy
编排模式: Supervisor
owners: [MAIN, WA-HARNESS]
```

#### U-501 — Fixture 与 rollback DAG 封口

- Goal：每个 active work package 都有 owner/files/input/command/expected/receipt/rollback。
- Source：上一周期 B05/B06/B07/B12/B13
- Dependencies：U-404
- Files：全部 schemas/fixtures/tools、`candidate-handshake-plan.md`
- Approach：一项缺字段即 schema FAIL；rollback 必须按依赖逆拓扑，禁止 broad reset。
- Test scenarios：happy=全字段；edge=single-harness N/A；error=无 owner、无 exit code、无回滚、共享漏项。
- Verification：`node tools/run-fixtures.mjs candidate-plan --plan candidate-handshake-plan.md --manifest atomic-manifest.yaml --matrix harness-matrix.yaml --architecture architecture-decisions.md`；预期 exit `0`。
- Status：`PLANNED`

#### U-502 — 候选 Plan 冻结

- Goal：生成并哈希一份逐 `MATT-*` 映射、无未决架构、可运行的候选 Plan。
- Source：同 U-501
- Dependencies：U-501
- Files：`candidate-handshake-plan.md`、freeze hash
- Approach：候选 Plan 明确仍不是 implementation authorization；冻结后红队只提 findings，不边审边改。
- Verification：`shasum -a 256 candidate-handshake-plan.md`；`node tools/run-fixtures.mjs freeze --plan candidate-handshake-plan.md --manifest atomic-manifest.yaml`。
- Status：`PLANNED`

### Phase 6 — 两轮红队上限与终审

```yaml
phase_type: task_execution
model_tier: reasoning-heavy
编排模式: Sequential + Parallel Fan-out
owners: [EA-R1, EA-R2, FINAL-JUDGE]
```

#### U-601 — Round 1 红队与一次修订

- Goal：至少三路攻击 inventory/lineage、harness/security、architecture/transaction。
- Source：`inline: "开多个红队形成loop"`
- Dependencies：U-502
- Files：`round1-redteam.md`、候选 Plan 的 `Replan R-1` 追加节
- Approach：union findings，不投票平均；修订后必须换 hash 并回发同组闭合。
- Verification：`node tools/run-fixtures.mjs redteam-round --round 1 --findings round1-redteam.md --plan candidate-handshake-plan.md`。
- Status：`PLANNED`

#### U-602 — Round 2 fresh redteam

- Goal：新冷上下文攻击 R1 修订后的冻结对象。
- Source：同 U-601
- Dependencies：U-601 closure PASS
- Files：`round2-redteam.md`
- Approach：Round 2 发现 material BLOCKER/MAJOR 即 `NO_HANDSHAKE`；不得第三轮静默修补。
- Verification：`node tools/run-fixtures.mjs redteam-round --round 2 --findings round2-redteam.md --plan candidate-handshake-plan.md --require-fresh-receipts`。
- Status：`PLANNED`

#### U-603 — 独立终审

- Goal：FINAL-JUDGE 只在所有 frozen hash、manifest coverage、两端 receipts、架构和 rollback 全闭合时输出 `PLAN_HANDSHAKE_READY`。
- Source：同 U-601
- Dependencies：U-602
- Files：`judge-verdict.md`
- Approach：终审不修文件；合法输出仅 `PLAN_HANDSHAKE_READY` 或 `NO_HANDSHAKE`。
- Verification：`node tools/run-fixtures.mjs judge --verdict judge-verdict.md --allow PLAN_HANDSHAKE_READY,NO_HANDSHAKE`。
- Status：`PLANNED`

### Phase 7 — H3 Luca 握手

MAIN 只呈现通过终审的候选 Plan、精确改动面、残余风险和 H4 激活边界。没有
`PLAN_HANDSHAKE_READY` 时明确报告 `NO_HANDSHAKE`，不使用“最终方案”措辞。

## 6. 上一周期 13 个 blocker 的反向覆盖

| Blocker | 本 Plan closure |
|---|---|
| B01 复合原子/错误分母 | U-201/U-203；hash ID；N 后算 |
| B02 漏 5 个来源对象 | U-204 transitive closure fixture |
| B03 HEAD identity 未持久化 | U-204 逐对象 ledger |
| B04 patch 全文被路径扫描 | U-401 header-only parse + body hash fixture |
| B05 验收不可执行 | U-501 exact command/input/exit/schema |
| B06 无 owner | §3 + 每个 U-block owner |
| B07 track 级 T/E/D/V | U-301 逐 `MATT-*` 两端矩阵 |
| B08 manifest/validator 共漏 | U-201/U-202/U-203 三路独立、禁止共享 parser |
| B09 quarantine/activation 死锁 | H1 独立 containment + U-403 |
| B10 post-success pin 未选方案 | U-401 atomic script commit + compound deny |
| B11 roles/runner 未决 | U-402 固定 repository agents |
| B12 activation/ledger/rollback 冲突 | U-403 journal/CAS/逆 DAG，非采纳 ledger 分离 |
| B13 live gate 不可运行 | U-302 receipts + U-501 fixture runner |

覆盖率：`13/13`。任何表项对应 U-block 缺失或验证命令不可运行，Plan Contract exit 非零。

## 7. 产出质量 criteria

```yaml
criteria:
  - "[C1] 框架 review 的第一条证据发生在 H0 之后（防顺序反转）"
  - "[C2] atomic manifest 的 N 由三路 census join 得出，计划中没有预写数量（防假分母）"
  - "[C3] 每个 MATT-* 都有 Claude/Codex 各自 T/E/D/V 或证据充分的 N/A（防单端冒充双端）"
  - "[C4] 每个 active work package 都有 owner、文件、输入、命令、预期状态、receipt 和回滚（防散文计划）"
  - "[C5] pin、agent、activation 在候选 Plan 中各只有一个已拍板架构（防未决分支）"
  - "[C6] census validator 与独立 replay 不共享 parser/生产上下文（防自证循环）"
  - "[C7] 两轮上限真实生效；Round 2 material finding 必须 NO_HANDSHAKE（防无限修靶）"
```

## 8. 失败策略

- 任一 BLOCKING command 非零：当前 U-block `BLOCKED`，停止其下游。
- 缺用户决策：`NEEDS_CONTEXT`，只问一个门。
- 基础设施不可用：标真实 `BLOCKED/UNKNOWN-LIVE`，不改写成 capability FAIL。
- 不执行 `git reset --hard`、stage everything、自动 commit/push、全局 skill overwrite。
- 本 Plan 获批只授权审计，不授权实现、route quarantine、global activation；后两者分别走 H1/H4。

## 9. 当前确认门

请 Luca 只裁一件事：是否批准按本 Plan 开始 **Phase 1 的只读框架对齐 review**。

批准后第一步才会读取你更新后的框架差异；未批准前，状态保持 `PLANNED`。

<!-- FILE_END: audit-execution-plan.md -->
