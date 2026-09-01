# LucaGStack controlled-change 受控变更全量能力方案

> 状态：`CANDIDATE_UNDER_REVIEW`  
> 方案日期：2026-08-30；按已发布 MVP 现场重基线：2026-09-01（Asia/Shanghai）  
> 任务类型：Deep / framework-meta / plan-only / `NO_PIN`  
> 推荐目标档：**Standard**  
> 当前终点：冻结计划 SHA，经同一 SHA 的独立审查全部通过后停在 `Gate P — Implementation Approval`  
> 实施授权：**无**

## 0. 执行摘要

本方案把 controlled-change 定义为 LucaGStack 的**变更执行内核**：Plan Agent 决定“做什么”，Orchestrator 决定“按什么依赖顺序调度”，Skill/Work Agent 决定“怎样产出候选”，controlled-change 只负责把已经批准的候选限制成**精确目标、精确 effect、精确前置状态、可恢复状态转换和可核验 receipt**。它既不是 Skill，也不是新 workflow 状态机，更不是第二个项目真值源。

2026-09-01 现场侦察确认：六 Skill MVP 已作为 **controlled-change/v1** 发布到 `upstream/main` 的 commit `6aaa1c6511af6845042e9dc541524934ed57bfe9`，当前 checkout 中的 v1 runtime bytes 与 `upstream/main` 一致；控制根为 `inactive`，只留有可验证 terminal witness/receipt。故本计划不是“从零安装”，而是**保住 v1 安全下限、以 side-by-side v2 演进到 Standard**。任何实现都必须先让 v1 非终态恢复完毕，再允许 v2 激活；不得原地改写 v1 state、receipt 或已发布证据。

目标架构选择 **Standard**：

- one-shot transaction kernel，而不是常驻 daemon；
- v1 compatibility reader + v2 append-only durable journal；v2 journal 是 v2 状态、authority、receipt 的唯一事实来源，v1 文件保持原格式只读/原 owner 恢复；
- Claude/Codex 共用同一 schema、policy、manifest、journal 与 projection，仅在 harness adapter 层处理工具协议差异；
- scratch worker 只产候选 bundle，trusted applier 依据 preimage CAS 应用；
- 以短时、资源粒度 claim + CAS 管并发，不用覆盖整个任务生命周期的 repo-global OS lease；
- effect host 使用封闭静态 adapter 表；`repo-files`、`external-files`、`git-publisher` 都是同一 DAG 下的 adapter，kernel 是唯一状态推进者；
- 网络/API/GUI 默认拒绝，直到存在具备 identity、idempotency、readback、reconcile/compensate 合同的具体 adapter；
- 已安装 v1 是 Foundation 的安全下限；v2 Standard 只在 v1 兼容门、受保护表面 admission、多 effect、并发或外部 effect 证据达标后逐面启用；High-assurance 只有真实威胁证据达到进入条件后才另立计划。

六 Skill 主计划里的 controlled-change MVP 已成为第一位真实消费者和 Foundation v1，不是全量结论；旧重型方案只作为机制候选库，daemon、签名 capability、全局 authority registry、repo-global whole-task lease、通用 two-phase publisher 均不恢复为默认架构。

---

## 1. 任务边界、写入边界与证据纪律

### 1.1 本规划 Session 的完成定义

只有同时满足以下条件才算完成：

1. read-only code recon 与 capability-gap map 完成；
2. Foundation/MVP、Standard、High-assurance 三档完成逐项比较；
3. handoff 指定的 16 个问题域均有明确答案、边界、机械证据要求和停止线；
4. 目标架构、模块接口、信任模型、状态机、并发、effect、Git、bootstrap、恢复、审计、治理和验证闭合；
5. 编译成符合 Plan Agent 合同的九字段 U-block、拓扑 Wave、精确 Files / Read List / Verification / Gate / rollback；
6. 最终文件冻结 SHA 后，architecture、safety、flow/parity、Plan Agent、quality gate 对**同一 SHA**全部通过；
7. `REVIEW-LEDGER.md` 记录每轮 SHA、失败、局部修复和最终 verdict；
8. 停在 Gate P，不创建或修改任何 runtime 实现。

### 1.2 本 Session 唯一可写范围

```text
framework-audit/2026-08-30-controlled-change-full-capability/
├── FINAL-MASTER-PLAN.md
├── REVIEW-LEDGER.md
└── （仅在独立审查确有需要时）只读审查记录
```

以下全部禁止：

- 修改 `.claude/`、`.codex/`、`.agents/`、`scripts/`、`memory/`、`framework/`、个人目录或下游项目；
- 替换 `docs`、workflow-state 或任何 session/project pin；
- 写 runtime hooks、skills、schema、controller、tests；
- staging、commit、push、branch/ref/index 变更；
- 以验证为由执行真实 personal、external、network、GUI 或 publication effect；
- 清理、还原或覆盖现有 dirty worktree 中其他 session 的 WIP。

文中所有“Files”均是**未来获批 implementation session 的拟改文件**，不是本 Session 授权。

### 1.3 只读证据基线

| 证据 | 结论 | 本方案用法 |
|---|---|---|
| handoff，SHA-256 `51618e033c1ef5ec221a7a455fb743df07d103fde65c715d207f783cae8a221f` | 任务约束、16 域和审查合同已冻结 | 作为 R-001 主来源 |
| 六 Skill MVP plan，SHA-256 `1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9` | MVP 设计真值；不是全量 schema 结论 | 作为 v1 provenance 与迁移输入 |
| 已发布 MVP commit `6aaa1c6511af6845042e9dc541524934ed57bfe9`；tree `c1f7b2f43a1c048852415475eb43be26c377d942` | `upstream/main` 已含 manifest/CAS、required/active、双端 guard、crash recovery、one-use Git effect与发布结果证据；不含可复用通用publisher | v1 是不可跳过的 installed baseline |
| 本地 `IMPLEMENTATION-RECEIPT.md` SHA-256 `d2969ad74c47977e29102db1d043d4f035ea1f290163ce9ad14ee8eed9ad5aea` | `state:PUBLISHED`；remote observed commit 与 published commit 一致；shared index/HEAD/local main 未变 | 发布后本地补充事实；不回写已发布 commit |
| `npm run test:controlled-change --silent`（2026-09-01） | 11/11 PASS；含 exact patch/effect binding、bootstrap、crash、双 harness、required bypass | 继承已证明的 v1 controls，不重造 |
| `npm run check:hooks --silent`、`verify-codex-wiring` 静态段（2026-09-01） | Claude 直接 hook；Codex 经已授信 project-scope entry 串联；接线断言通过 | v2 必须保持同一入口 trust bytes 或显式过新 Gate G |
| `controlled-change.mjs inspect`（2026-09-01） | control root `inactive`；两组 terminal witness/receipt 可读，无 nonterminal operation | 当前可规划迁移；实现时必须重新 census |
| `check:skill-integration-receipt`（2026-09-01） | FAIL：校验器只接受 `VERIFIED`，本地发布回执为 `PUBLISHED` | 已知 v1 evidence-schema drift；Gate M 前必须修正或版本化校验 |
| 当前 checkout | `main` 相对 `upstream/main` ahead 1 / behind 2，且有其他 session dirty WIP；关键 MVP runtime bytes 与 upstream 相同 | 本 Session 不 pull；未来实现必须用干净隔离 checkout 或先人工裁决基线 |
| project transaction primitives | 已有 proposal/epoch CAS、mkdir lease、O_EXCL、fsync、no-age-steal、恢复测试 | 复用算法，不混同为 controlled-change 状态真值 |
| observability writer / eval recorder | 已有 journal/flock/idempotent audit 的局部实现 | 提取模式，不侵入其现有 owner transaction |
| linked worktree 事实 | 9 个 worktree 共享 object/ref/config，index/worktree bytes 各自独立 | ref/remote claim 必须 common-dir 级；文件 claim 含 worktree identity |
| 旧重型方案 | controller、authority、lease、publisher、journal 候选较完整 | 每项重新裁决，不整包恢复 |

外部研究在本轮不启动：核心问题是本仓 harness、Git topology、既有 primitive 与信任边界，最可靠 primary source 已在本地；引入通用业界框架不会替代对当前协议和失败面的实证。若 implementation 阶段遇到 Git/hook 未决语义，只允许针对官方文档或源码单点补证。

---

## 2. 来源登记与可追溯性

| Source ID | 来源 | 约束摘要 |
|---|---|---|
| R-001 | 用户请求 + 已核验 handoff | 全量 plan-only；16 域；三档；同 SHA 审查；止于 Gate P |
| R-002 | 用户写入红线 | 本 Session 只写本目录两份最终文档/必要审查记录，不实施、不 Git effect |
| R-003 | 六 Skill MVP plan + published commit + terminal receipts | v1 已安装；精确bootstrap、required witness、scratch/CAS、receipt是兼容下限；isolated publication只提供结果证据/需求，不代表通用实现 |
| R-004 | 旧重型方案 read-only recon | 重型机制必须逐项价值裁决，禁止整包恢复 |
| R-005 | 当前 Claude/Codex harness + v1 regression recon | Claude 直接注册、Codex trusted-entry 串联、required 时异常 fail-closed 已证明；inactive pre-entry 与新 trust bytes 仍是边界 |
| R-006 | 当前 v1 transaction/publication/audit recon | CAS、fsync、witness/receipt、one-use effect、isolated index/private-ref/expected-old publish 已有真实证据；状态/终态校验仍有漂移 |
| R-007 | Plan Agent 合同 | Deep tier；九字段 U-block；Wave；六值状态；精确 Verification 与人工 Gate |
| R-008 | codebase-design 三路独立推演 | deep kernel、窄接口、静态 adapter、Standard 目标与删除测试收敛 |
| R-009 | redteam / careful 约束 | safety 默认 REFUTED；危险 effect 必须人门、预像、恢复与最小授权 |
| R-010 | Skill-first / Graph-optional 宪法 | controlled-change 不得成为 workflow truth 或强迫只读/普通下游工作进入流程 |

所有后续 U-block 的 `Source` 只能引用本表，不得由 implementation agent 自行扩权。若 source 与现场代码冲突，U-block 必须返回 `NEEDS_CONTEXT`。

---

## 3. 前提门、最小替代与 kill assumptions

### 3.1 Premise Gate

controlled-change v2/Standard 只有在以下命题为真时才值得进入实现：

1. LucaGStack 的框架级 mutation 会跨多个文件、session 或 effect，单靠 prompt 纪律不能稳定保护 WIP；
2. Claude 与 Codex 的工具入口确有差异，但能够共享一个语义内核；
3. 大部分真实失败来自意外扩大范围、stale preimage、并发漂移、partial failure 和未知外部结果，而非恶意本机攻击者；
4. 可用的轻量路径能让普通低风险 repo edit 不承担 Standard 全仪式；
5. 每个强保证都能落到机械 assertion，而不是“主 Agent 会小心”。

任何一条经 v1/Foundation 实测为假，停止向 Standard 扩展，保留当前 v1 + project transaction + narrower skill-local safeguards。

### 3.2 更小替代

更小替代是：**不建设 v2**，只保留现有 v1，并把 `PUBLISHED` receipt/validator 漂移修到自洽；后续每个高风险 Skill 继续显式复用 v1 manifest/controller。若 20 次真实操作没有出现跨任务恢复、并发或多 adapter 需求，这就是正确停止点。只有出现本节 premise 的真实证据，才进入 Standard；“已有计划”本身不是扩建理由。

### 3.3 Kill assumptions 与停止线

| ID | 假设 | 证伪信号 | 动作 |
|---|---|---|---|
| K-00 | v1 可无缝作为 v2 迁移下限 | v1 nonterminal 无法由原 reader 唯一恢复，或 v2 激活需重写/删除 v1 证据 | 停在 v1；先做恢复/证据修正，不激活 v2 |
| K-01 | 低风险 repo change 可用 Foundation 在可接受摩擦内完成 | 连续 20 次 shadow 中位额外交互 > 1 次，或运行时间增幅 > 30% | 不进入 mandatory；先简化 prepare/approval UX |
| K-02 | 双 harness 能共享一个 policy 内核 | 同一 fixture 出现无法消除的 Claude/Codex 语义分叉 | 停止 rollout；不得复制两套 policy |
| K-03 | resource claim + CAS 足以处理合作式并发 | 真实事故显示同 UID 外部写经常在 action 内穿透 CAS 并造成高损 | 评估 High-assurance 新计划，不在 Standard 偷加 daemon |
| K-04 | durable journal 可把 crash 归类为唯一下一动作 | crash matrix 出现多于一个合法恢复动作 | 停止实现，修 state model 后重跑全部模型/恢复测试 |
| K-05 | Git remote readback 能判定 push 结果 | fixture 无法可靠区分 old/new/diverged/unreadable | publisher 保持 `EFFECT_UNKNOWN`，禁止自动 retry/rollback |
| K-06 | static adapter 表足够 | 两个以上真实 effect 因接口刚性需 fork kernel | 重审 adapter seam；仍不得直接上 dynamic plugin bus |
| K-07 | 审计可最小化敏感信息 | receipt 必须保存 secret/token/完整敏感文件才能恢复 | 拒绝该 adapter，重新设计 oracle/escrow 边界 |

High-assurance 的进入条件至少命中一项，且必须另起 plan：

- 90 天内出现 2 次经过确认的同 UID/外部进程绕过，且每次造成不可接受高损；
- 需要在多用户共享主机或不可信 CI runner 上强制隔离；
- 威胁模型正式纳入恶意 trusted main、compromised hook/CLI 或合规签名链；
- Standard 无法满足明确的审计/监管证据要求。

---

## 4. 第一性价值、失败分类与信任边界

### 4.1 唯一核心承诺

对每次进入 controlled-change 的 operation，系统只承诺五件事：

1. **范围不可扩大**：应用目标和 effect 不得超出已批准 manifest；
2. **陈旧即停止**：实际 preimage、ref、remote 或 external identity 与批准时不同则不应用；
3. **崩溃可判知**：任何 crash 后，durable state 能给出唯一合法下一动作，或明确要求人类裁决；
4. **活跃期机械约束**：当前 Claude/Codex 已登记写入口仅允许精确 controller 调用；
5. **结果可核验**：receipt 区分 confirmed、rejected、recoverable 与 unknown，不把“命令返回”当成“effect 已确认”。

它不承诺任意机器进程级安全、网络事务原子性或恶意本机管理员防御。

### 4.2 失败与优先级

| 失败 | 频率/损失判断 | 目标控制 |
|---|---|---|
| agent 改出批准路径/文件集 | 高频、中高损 | manifest allowlist + guard + delta census |
| stale preimage 覆盖他人 WIP | 高频、高损 | apply 前逐资源 CAS；不自动 rebase |
| 并行 session 操作同一路径/ref | 中高频、高损 | resource claim + generation CAS |
| worker 直接写 live checkout | 中频、高损 | scratch-only worker；trusted applier |
| hook/harness 两端语义漂移 | 中频、中高损 | single contract + shared conformance fixture + fresh harness test |
| crash 留下半应用或幽灵 active | 中频、高损 | journal-before-effect + witness/projection invariants + recover |
| personal 文件部分成功 | 低中频、高损 | same-dir durable transaction + owned postimage rollback |
| Git publish 到错 remote/ref | 低频、极高损 | literal descriptor + expected-old CAS + isolated index/private ref |
| push 响应丢失造成重复发布 | 低频、极高损 | `EFFECT_UNKNOWN` + read-only reconciliation |
| network/API/GUI 不可读回 | 视 adapter 而定、高损 | 默认拒绝；无 oracle 不宣称强保证 |
| 恶意 trusted main 或被攻破 hook | 当前假想、极高损 | Standard 明确不保证；High-assurance 才重划 TCB |
| 任意同 UID terminal/IDE 绕过 | 当前低证据、中高损 | 边界外；action CAS 尽力检测，不虚称阻断 |

### 4.3 信任矩阵

| 主体/故障源 | Standard 是否信任 | 能保证什么 | 明确不能保证什么 |
|---|---|---|---|
| 意外 agent / 错误 prompt | 不信任其范围判断 | guard + kernel 限制到已批准 manifest | 若其控制 trusted main 与 kernel 本身则不保证 |
| 并行 LucaGStack session | 合作式、不信任时序 | generation + resource claim + CAS 阻断冲突 | 不阻止绕过 controller 的任意 shell |
| linked worktree | 不信任共享 ref 时序 | 文件 key 含 worktree identity；ref/remote key 归 common-dir | 不把独立 index 误认为独立 refs |
| ordinary terminal / IDE | 边界外 | action 前后的 preimage CAS 可发现部分漂移 | action 窗口内同 UID 写入的绝对阻断 |
| 任意同用户进程 | 边界外 | no-age-steal；可在恢复时做精确 owner/pid 诊断 | OS 级隔离、可信锁遵守、秘密防窃 |
| trusted top-level main | TCB 内 | 绑定真实用户批准；只调用公开 controller | 恶意 main 可伪造意图的问题不在 Standard 解决 |
| worker / subagent | 不信任 live mutation | scratch 产 bundle，不持有 active authority | 只有 scratch 是其可写根时才是机械保证 |
| Eval / quality gate | 只读信任 | 独立验证 artifact/state/receipt | 不得 mint authority 或推进状态 |
| guard / controller / Node runtime | TCB 内 | 正确执行时提供机械约束 | 被攻破时 Standard 不提供密码学防御 |
| Git/credential helper | 外部 TCB | descriptor/config 收窄；readback reconcile | credential 被攻破后的远端安全 |

### 4.4 One-way trust chain

```text
真实用户批准
  ↓（top-level main 绑定 request digest，不可由 worker 自签）
approved request + exact manifest digest + generation + expiry
  ↓（kernel 编译，不接受 caller 自带 action registry）
task-local authority projection
  ↓（guard 只认当前 durable witness + exact controller invocation）
trusted applier / static effect adapter
  ↓（journal before/after + readback）
receipt projection
```

authority record 不是 secret、不是签名 capability，也不是全局 registry 条目。它只是 canonical journal 中由已批准 request 派生的 task-local projection；caller 不能提交任意 authority JSON、任意 shell 或动态 adapter 名来扩大权限。

---

## 5. Read-only capability-gap map

| 能力域 | 当前可复用 primitive | 当前 failure / gap | Standard owner |
|---|---|---|---|
| v1 contract/manifest | `.claude/skill-os/controlled-change.yaml` + `controlled-change.mjs` strict exact-path schema、repo/common-dir/HEAD/pre/post tuple | schema v1 面向单任务；action/effect DAG、resource key、version negotiation 尚未统一 | v1 compatibility reader + v2 compiler |
| v1 durable state | task-local witness/active/receipt，atomic temp+fsync+rename、expected SHA CAS | `discoverControlState` 把多于一个 nonterminal 判 invalid；receipt 与 journal 尚非一份 canonical projection | v1 recovery owner；v2 state store |
| prepare concurrency | control-root inode 上 advisory `flock`，竞争 prepare 在写 witness 前被拒；不建 lease 文件 | repo-global single active；不能表达 disjoint operations；外部进程不遵守 | v2 resource claims + CAS |
| Claude enforcement | `.claude/settings.json` 直接注册 guard；异常经 `hook-failure-decision` 查询 durable witness | v1 inactive 时不做 pre-entry admission；受保护面仍可能绕过 `prepare` | stable admission classifier + shared evaluator |
| Codex enforcement | 已授信 project-scope hook 在 adapter 中串行调用 v1 guard；apply_patch/Bash 映射与异常路径有回归 | 依赖既有 trust entry bytes；新增注册需 fresh trust Gate G | 同一 stable entry 下版本化 launcher |
| active authorization | structured target/preimage；Codex exact patch SHA；shell default deny；one-use effect 绑定 command SHA/cwd/gate/token | guard 只能服务唯一 active；多 operation 时无法安全选 owner；授权消费先记 `EFFECT_UNKNOWN` 但尚非通用 effect state | v2 exact controller operation/generation dispatch + effect host |
| pre-entry coverage | Plan Agent/Orchestrator 合同触发 + v1 `prepare` | ordinary inactive write本身不会自动建立 witness；“所有 runtime mutation mandatory”目前不是机械事实 | protected-surface admission；其余先 shadow/explicit |
| repo file apply | manifest 支持 add/modify/delete/symlink tuple、pre/post check；scratch/repo disjoint | 没有统一 rename/mode/delta-denominator adapter；repo apply 与 effect 状态尚未同一 DAG | repo-files adapter |
| crash recovery | prepare 与 terminal crash points、same generation resume、foreign active CAS 拒绝均有测试 | 仅 v1 state machine；无多 adapter partial/unknown 的唯一 next-action model | v1 reader + v2 kernel |
| bootstrap | fresh bootstrap receipt 绑定 exact patch/manifest、postimage和双门输出；已真实安装 | 这是已完成的 v1 bootstrap，不能再执行“首次安装”；v2 必须 side-by-side dormant | migration/lifecycle |
| isolated publication | 六Skill receipt/terminal history证明曾用私有 index、`commit-tree`、private ref、expected-old lease、literal URL 与 remote readback完成发布；`candidate-manifest.mjs`只读核验lineage | 通用publisher代码/外部journal不在当前tracked runtime；不能从terminal state重放；本地post-publication receipt使旧validator变红 | Git publisher adapter + evidence schema v2 |
| external/personal | 六 Skill 已完成两处 exact personal cutover并有 restricted backup/receipt | 真实路径流程是 task-specific，不能在本规划读取/修改；尚无通用 default-deny adapter | external-files adapter |
| evidence closure | v1 core 11/11、hooks、wiring、engineering-delivery tests PASS | final receipt validator 只接受 `VERIFIED`，不接受真实终态 `PUBLISHED`；同源状态枚举缺失 | versioned receipt schema + verifier |
| common-dir topology | v1 已绑定 realpath/common-dir/HEAD；published flow 保持 shared index/HEAD/local main | v2 多 worktree 的 file/ref/remote resource identity 尚未形成统一 key | repo identity + claims |
| network/API/GUI | 无通用 primitive | identity/idempotency/readback/compensation 不可泛化 | default-deny；未来具体 adapter另立 U-block |
| self-upgrade | v1 guard/controller 是 live source bytes | active session/runtime upgrade、previous reader、旧 nonterminal compatibility 未闭合 | content-addressed v2 bundle + stable launcher |
| audit/privacy | v1 receipt 不含 file bodies；effect auth/发布事实可追踪 | schema/retention/redaction、发布后 supplemental receipt、terminal verifier 漂移未统一 | receipt policy |
| Plan/Orchestrator integration | 六 Skill 已有真实 v1 consumer 和角色接线 | 全量触发仍以合同纪律为主；protected-surface pre-entry 未机械覆盖 | orchestration + admission integration |

结论：仓库已经有一套**可工作的 Foundation v1**，不是只有零散算法原语。全量方案的价值在于补齐它明确缺少的多操作归属、统一 effect lifecycle、版本迁移、预激活 admission 和证据同源；不是重写 v1。既有 project transaction、observability writer、eval recorder 继续拥有各自 operational data，controlled-change 只控制“修改这些 owner 实现”的变更。

---

## 6. 三种架构档位比较与目标选择

| 维度 | Foundation / v1（已安装） | Standard / v2（推荐演进目标） | High-assurance |
|---|---|---|---|
| 主要目标 | 防误改、stale overwrite、无 receipt | 完整 cooperative transaction、恢复、effect adapter、双 harness 平价 | 对抗恶意/被攻破组件、多用户隔离 |
| 核心机制 | manifest、required/active、scratch bundle、preimage CAS、receipt | Foundation + durable journal/generation、resource claims、static effect host、self-upgrade、reconcile | daemon/broker、签名 capability、进程/OS sandbox、远端 attestation |
| concurrency | 每 Git common-dir 仅一个 nonterminal；prepare flock + tuple CAS | 每 operation 一份 immutable manifest；排序 resource claim + CAS；仅 disjoint action 并行 | 系统服务仲裁、强隔离 |
| effects | harness 直接写 repo bytes；one-use Git command authorization；task-specific personal/publish | kernel 统一调度 repo/external/Git adapter；其他默认拒绝 | 经签名/隔离 broker 的多方 effect |
| trust | trusted main/kernel/hook | 同左，边界明确 | 缩小 TCB，main/worker 也可能不可信 |
| UX 成本 | 低 | 低风险走 Foundation，风险升级 Standard | 高，常驻服务/凭证/部署/故障面大 |
| 运维成本 | 低中 | 中等，可由仓库维护 | 高，需服务生命周期和跨平台运维 |
| 适配当前证据 | 已真实发布且 11 项 core 回归通过；终态 verifier 漂移待修 | 只在 v1 迁移、pre-entry、并发、effect unknown 证据达标后进入 | 目前缺真实攻击证据/多用户需求 |
| 停止线 | 无法可靠恢复多 effect 时停止 | 满足当前目标后停止；不默认平台化 | 仅 Gate H 新计划可进入 |

选择 Standard 的理由不是“功能最多”，而是它覆盖 v1 已明确暴露的边界：repo-global single-flight、直接 writer、descriptive policy、非冻结 `EFFECT_UNKNOWN`、task-specific publication 与无版本迁移。它仍是**有条件目标**：Gate M 或 Foundation shadow 证伪需求时，正确结论是停在修正后的 v1。High-assurance 的复杂度没有当前证据支持。

### 6.1 旧重型机制逐项裁决

| 机制 | 裁决 | 原因 / 替代 |
|---|---|---|
| one-shot controller | **采用** | v1 已证明 process-fresh 可用；v2 由 journal 保持连续性 |
| task-local authority record | **采用** | 精确绑定 request/digest/generation/expiry，无全局 registry 漂移 |
| durable required witness + active projection | **采用并版本化** | v1 pair 原样保留；v2 projection 由 journal 派生，不原地转换 |
| scratch worker + CAS applier | **采用** | 把生成能力与 live authority 分离 |
| resource-scoped short claims | **采用** | 允许 disjoint 并行；CAS 仍是最终正确性边界 |
| effect-specific adapter | **采用** | repo/personal/Git 失败语义不同，不能伪装成统一原子事务 |
| Git publisher | **作为 Standard adapter 重新实现** | v1 只有发布证据和冻结结果，没有可复用通用 publisher；不从 terminal receipt 重放 authority |
| personal/external transaction | **抽取为 Standard adapter** | 可从 task-specific cutover 提取同目录 durable write/reverse 算法，不继承硬编码 target/旧 authority |
| daemon | **默认拒绝** | 当前无恶意/多用户强协调需求；one-shot + journal 足够 |
| 签名 capability / FD bearer | **默认拒绝** | 同 UID TCB 内收益不足，密钥生命周期反增风险 |
| 全局 authority registry | **拒绝** | 易成为第二真值和扩权面；task-local projection 足够 |
| repo-global whole-task OS lease | **拒绝** | 过度串行；不能强迫外部进程遵守；用 resource claim + CAS |
| 通用 two-phase publisher | **拒绝** | 网络/GUI 不共享事务语义；只做 adapter-specific prepare/apply/reconcile |
| 正常路径 process census | **拒绝** | 脆弱且昂贵；只作为 bootstrap/recovery 诊断 |
| dynamic plugin bus | **拒绝** | 动态发现扩大权限；使用版本化静态 adapter 表 |
| 自动 retry / force / rollback unknown effect | **拒绝** | 可能重复不可逆 effect；unknown 只能只读 reconcile/人裁 |

---

## 7. Standard 目标架构

```text
Plan Agent ── exact U-block / effects / gates ─────────────┐
Orchestrator ─ prepare/advance/status + HITL ────────────┐ │
trusted top-level main ─ real approval binding ────────┐ │ │
                                                       ▼ ▼ ▼
┌────────────── stable admission / version launcher ──────────┐
│ protected-surface pre-entry │ v1 DRAIN/reader │ v2 dispatch │
└───────────────┬──────────────────────────────────────────────┘
                ▼
┌──────────────── controlled-change v2 CLI ───────────────────┐
│ prepare(request,approval) │ advance(op,generation) │ status  │
└───────────────┬──────────────────────────────────────────────┘
                ▼
┌──────────── transaction kernel / policy compiler ──────────┐
│ canonical contract · legal next action · typed error       │
└───────┬────────────┬──────────────┬────────────────────────┘
        ▼            ▼              ▼
 state store   resource claims   lifecycle/runtime capsule
 journal+CAS   short/sorted      bootstrap+upgrade+projection
        │            │              │
        └────────────┴───────┬──────┘
                             ▼
                  candidate pipeline / effect host
scratch worker ─────► ├─ repo-files adapter
 candidate bundle     ├─ external-files adapter
                      └─ git-publisher adapter
                             │
                             ▼
                  readback → durable receipt

Claude guard adapter ─┐
Codex trusted-entry ──┴─ consume same admission policy + version launcher
```

**Cardinality 决议**：v1 永远保持每 common-dir 一个 nonterminal，不能被解释成可并行。v2 每个 operation 恰有一份 immutable active manifest；多个 v2 operation 可以同时存在，但只有 canonical resource set disjoint 的 action 才能并行。manifest union 永远禁止。每次 controller command 显式绑定 operation/generation；guard 不从多个 manifest 拼权限，也不靠“猜中某一路径”选择 authority。

**Mutation owner 决议**：v1 drain 期间维持“harness 写 bytes、controller 记证据”的旧语义。v2 激活后，`advance`→effect host→`repo-files` 是 live repo target 的唯一 writer；Claude `Write/Edit`、Codex `apply_patch` 与任意 Bash 不再拥有 v2 target 写权。repo verification 是 kernel 的 DAG barrier，不是另一条硬编码 apply 流。

### 7.1 深模块与删除测试

| 模块 | 唯一职责 | 公开面 | 删除测试 |
|---|---|---|---|
| stable admission/version launcher | inactive protected-surface admission、v1 drain、v2 bundle dispatch | decide/dispatch/status | 删除后 pre-witness 与迁移出现空窗，故必须保持小而稳定 |
| v1 compatibility reader/runtime | 只读解释 v1 state；对既有非终态调用冻结 v1 recovery | inspect/recover-exact | 可在 v1 retention gate 后归档，但迁移期不能改写 v1 bytes |
| CLI/controller | 收敛所有合法入口与 typed errors | `prepare`、`advance`、`status` | 删除后 caller 会直接拼状态/扩权，因此必须存在 |
| contract/policy compiler | 把 request 编译为 canonical manifest/effect DAG/risk/gates | pure `compile/validate` | 可在不启动 effect 时独立测试；不能并入 guard |
| transaction kernel | 根据 journal 计算唯一 legal next action | internal `next/applyTransition` | 若 adapter 能绕过它推进状态，设计失败 |
| state store | journal、generation、attempt、projection、receipt durability | append/CAS/read projection | 若 authority/receipt 可独立改写，设计失败 |
| resource claims | 短时、多资源有序 claim/no-age-steal | acquire/release/inspect | 删除仅降低并发体验，不得破坏 CAS 正确性 |
| lifecycle | exact bootstrap、runtime capsule、active pointer、rollback | bootstrap/install/activate | 可独立替换版本，不把 effect policy 放进来 |
| candidate pipeline | scratch bundle census、pre/post/reverse，自己不写 live | build/inspect | worker 无 live 写权；repo adapter 不解析 prompt |
| enforcement gateway | 适配 Claude/Codex hook 协议 | `decide(tool,input,projection)` | 删除某 adapter 不改变核心语义；该 harness 失去 mandatory 能力 |
| effect host | 静态选择包括 repo-files 在内的 adapter、按 DAG 调度、unknown 冻结 | prepare/apply/readback/compensate | 删除任一 adapter 不影响其他 adapter/kernel |
| repo-files adapter | path/mode/blob/symlink/rename 精确变更 | adapter contract | 不含 Git publish/personal policy |
| external-files adapter | 绝对路径 same-dir durable transaction | adapter contract | 不存在时 personal/external 默认拒绝 |
| Git publisher adapter | isolated index/commit/private ref/remote CAS | adapter contract | 不存在时 local repo change 仍完整可用 |

### 7.2 模块深度约束

- public caller 不得传 `next_state`、任意 action registry、shell command、adapter filesystem path 或 authority object；
- guard 不拥有 policy，只把 tool event 标准化后调用同一 evaluator；
- state、authority、receipt 是一份 journal 的不同 projection，不建三张可独立写 registry；
- v1 witness/receipt 是 immutable legacy evidence，不导入 v2 journal、不重算 terminal manifest、不复用 gate/token；v2 只保存 legacy path + raw SHA 的 derived index；
- Git publisher 不进入 kernel；kernel 只理解 effect lifecycle 与 typed outcome；
- repo-files 与 Git/external 一样只通过 effect host；不得再建“先硬编码 repo apply、再进入 effects”的第二 mutation owner；
- adapter 表编译期封闭、版本化、显式 allowlist；未知 adapter 永远 `POLICY_DENIED`；
- recovery 不是“任意选择一个状态”，而是 `advance` 根据 state/readback 计算的受限动作。

---

## 8. 对外合同、触发与角色边界

### 8.1 三个公开入口

```text
controlled-change prepare --request <request.json> --approval-evidence <evidence.json>
controlled-change advance --operation <id> --expected-generation <n> [--approval-evidence <evidence.json>]
controlled-change status --operation <id> [--json]
```

`prepare`：

- strict schema 验证、repo common-dir/worktree identity、canonical path、preimage、effect DAG、风险档和 gate；
- 验证由 trusted top-level main 绑定的 request/plan/U-block/session-turn approval evidence，生成 immutable manifest digest 与人类可读 approval payload；
- 可在 Git common-dir 的 operational state root 写 PREPARED journal，但绝不写 live target；
- 不接受自由 shell、glob 扩权或 caller 自带 authority。

`advance`：

- **唯一 mutating public entry**；
- caller 只能给 operation ID、expected generation，以及**仅当当前 next action 需要新 human gate 时**的 approval evidence；kernel 自行计算唯一 next action；
- apply 前重验 approval/digest/expiry/preimage、获取短 claim、写 durable intent；
- recovery 使用同一入口：fresh approval 允许后，kernel 只能执行 `resume`、`abort-owned` 或 `reconcile-readonly` 中唯一合法动作。

`status`：

- 严格只读；输出 state、generation、blocked reason、claims、effect readback、next human action；
- 默认脱敏，不展示 file body、token、credential、完整 remote URL query/userinfo。

`approval-evidence` 是 journal 中的审计绑定，不是 secret capability。它至少绑定 plan SHA、U-ID、request digest、manifest digest、gate ID、harness/session/turn identity（若 harness 可提供）与明确裁决；不得保存整段对话。Standard 的威胁模型信任 top-level main，不声称防恶意 main 伪造批准。worker 不得调用这三个入口的机械依据是其 sandbox writable roots 不包含 live repo、Git common-dir 与 external target；某 harness 无法证明该隔离时，不得把 controller 委托给 worker。

### 8.2 Typed errors 与六值完成状态映射

| Kernel error | Orchestrator/Plan status | 意义 |
|---|---|---|
| `INVALID_SPEC` | `NEEDS_CONTEXT` | schema/identity/path/effect 不可精确陈述 |
| `APPROVAL_REQUIRED` | `NEEDS_CONTEXT` | HITL 未完成或 approval digest 不匹配 |
| `POLICY_DENIED` | `BLOCKED` | effect/adapter/target 超出当前档位或 policy |
| `GENERATION_CONFLICT` | `BLOCKED` | stale caller 或并行推进 |
| `STALE_PREIMAGE` | `NEEDS_CONTEXT` | 现场已变；必须重做计划/批准，不自动合并 |
| `RESOURCE_BUSY` | `BLOCKED` | 精确资源由另一 operation 持有 |
| `GUARD_UNAVAILABLE` | `BLOCKED` | mandatory harness 不能 fail closed |
| `VERIFY_FAILED` | `BLOCKED` | postcondition 未满足；进入 recovery |
| `RECOVERY_REQUIRED` | `BLOCKED` | 非终态 operation 需恢复 |
| `EFFECT_UNKNOWN` | `NEEDS_CONTEXT` | 只允许 read-only reconcile + 人裁 |
| 无错误、断言全过 | `DONE` 或有 WARNING 时 `DONE_WITH_CONCERNS` | 对应 U-block 完成 |

不得自造新的 Plan completion status。`IN_PROGRESS` 和 `PLANNED` 只由 Orchestrator 生命周期管理。

### 8.3 自动触发规则

#### Foundation 自动进入

Plan Agent/Orchestrator 在派发第一个 in-scope writer **之前**必须先 compile + `prepare`。机械强制按 surface 分阶段启用，不把尚未 rollout 的范围伪称 mandatory：

- Gate M/F 后首先保护 controlled-change 自身稳定入口、`controlled-change.yaml`、guard/controller/core、两端 hook registration/trust wiring；
- Gate S 后才可把 `.claude/hooks/**`、`.claude/skill-os/**`、`.claude/agents/**`、`.codex/**`、`.agents/skills/**`、runtime `scripts/**`、`AGENTS.md`、`CLAUDE.md`、`package.json`、`.github/workflows/**` 中已逐面审核的集合升为 mandatory；
- `framework-audit/**`、只读操作、scratch 和 owner transaction 的 operational data 不属于 pre-entry protected surface。

对已升为 mandatory 的 protected surface，即使当前没有 witness，stable admission guard 也必须对直接 writer 返回 `PREPARE_REQUIRED`；只允许经 argv parser 证明无 wrapper/operator/redirect/substitution 的 canonical `prepare/status`，以及已存在 operation 的 `advance`。因此“inactive”不再等于“所有写放行”。

admission 同时检查 lexical destination 与 existing-parent/symlink-resolved destination；任一落入 protected surface 即受控。不存在的新文件使用“最深已存在父目录 realpath + 剩余 lexical segments”判定，拒绝 `..`、case/Unicode alias 与 symlink escape。policy 中的 prefix 是静态 surface classifier，不是 manifest target glob，也不能给 operation 扩权。

所有未来 LucaGStack **工程 runtime mutation** 都是 Foundation 的 policy 目标，包括：

- 修改 hooks、skills、agent contracts、skill-os schema/policy、runtime scripts、wiring、CI/verifier；
- 修改由多个 session 共享的 Git common-dir state、runtime capsule 或 protection registration；
- 由 worker/subagent 生成再应用到 live repository 的代码变更。

低风险、单 repo、单 action可把用户原始显式变更请求绑定成 approval evidence，不额外制造二次问题；仍需 manifest、preimage CAS、receipt。尚未进入 mandatory 的 surface 先 shadow/explicit；shadow 只能产决策记录，不能暗中创建 authority 或阻断。

#### 升级到 Standard

任一条件触发：

- protected surface：hook/policy/controller/bootstrap/self-upgrade；
- 多文件 rename/delete、跨 worktree/common-dir 资源；
- 并行 operation 可能重叠；
- personal/external absolute path；
- Git ref/commit/push；
- network/API/GUI（若无可用 adapter 则直接 deny）；
- effect DAG 包含两个及以上不同 adapter；
- Foundation shadow 已发现 recovery/unknown 场景。

#### 保持普通模式

- 问答、解释、只读 recon/review/audit；
- 本类 plan-only artifact；
- 下游项目普通工作，除非其主动使用 LucaGStack runtime mutation 能力；
- 既有 owner transaction 已负责的 operational data append（例如 observability/eval/project substrate），除非改的是其实现代码；
- 临时 scratch 中不准备应用到 live target 的探索；
- framework-evolution 的只读发现阶段。

controlled-change 的触发是由**可执行 policy + static admission classifier**共同给出的可测试结果；v1 当前 YAML 只是 descriptive，v2 Gate F 必须证明 runtime 实际加载冻结 policy digest。不改 optional workflow graph，不成为 workflow state truth。

### 8.4 角色与权限

| 角色 | 可以 | 不可以 |
|---|---|---|
| Plan Agent | 定义 exact Files/effects/gates/U-block/verification | 写 runtime state、mint authority、执行 effect |
| Orchestrator | 在 writer 前调 `prepare`，随后调 `advance/status`、拓扑调度、呈现 HITL | 改 manifest、代替用户批准、直接写 live target |
| trusted top-level main | 把真实用户批准绑定到 digest；调用 controller | 手工绕过 active guard；给 worker bearer authority |
| worker/Skill agent | 只在已证明 writable-root 隔离的 scratch 产 candidate bundle/test evidence | 调 controller、写 live checkout/common-dir/ref/personal/external/network；不能证明隔离则禁止此委托 |
| Eval/quality gate | 独立只读验证 bundle、journal projection、receipt | 推进 generation、执行修复、自动批准 |
| guard adapter | 标准化工具输入；inactive protected admission；允许 exact parsed controller 或拒绝 | 解释业务意图、持久化第二份 policy/state、用 raw `allowed_commands.includes` 放行 |
| effect adapter | 对一个 effect type 做 prepare/apply/readback/compensate | 跨 adapter 改序、加载动态代码、扩大 target |

---

## 9. Canonical manifest、authority 与 policy

### 9.1 Manifest 最小字段

```yaml
schema_version: controlled-change/v2
operation_id: <random opaque id>
request_digest: sha256:...
plan_sha256: ...
u_id: U-...
repository:
  common_dir_realpath: ...
  worktree_id: ...
  worktree_root_realpath: ...
runtime_bundle_sha256: ...
generation: 0
expires_at: ...
legacy_lineage:
  v1_state_root: ...
  terminal_witness_sha256: ...
  terminal_receipt_sha256: ...
resources:
  - kind: repo-path | external-path | local-ref | remote-ref
    canonical_id: ...
    expected_preimage: ...
effects:
  - id: E-001
    adapter: repo-files | external-files | git-publisher
    depends_on: []
    target: ...
    expected_preimage: ...
    expected_postimage: ...
    rollback: owned-only | reconcile-only | none
verification:
  assertions: [...]
approval:
  risk_tier: foundation | standard
  required_gates: [...]
  evidence_kind: explicit-user-request | human-gate
  session_turn_binding: ...
  approval_digest: ...
```

`legacy_lineage` 只在 migration fixture 中使用，只能引用 raw v1 terminal bytes 的 path/SHA，不能承载旧 gate token、effect authorization 或 reconstructed manifest。生产 schema 必须禁止未知字段、相对逃逸、隐式 glob、默认 remote、默认 branch、任意 shell 与动态 adapter path。canonical digest 覆盖 schema version、identity、资源、effect DAG、verification、gate、approval evidence、expiry 与 runtime bundle。

### 9.2 Effect capability lattice

能力只能逐层**收窄**，不能继承后增广：

```text
request envelope
  └─ manifest exact resource/effect set
       └─ per-generation legal next action
            └─ adapter exact target + expected preimage
                 └─ one attempt nonce
```

父层没有的 adapter、path、ref、remote 或 action，子层无法添加。新的 target/effect 必须生成新 manifest digest，回到 `APPROVAL_REQUIRED`；不能修改 active manifest。

### 9.3 Policy evaluator

policy 输出只有：

- `ALLOW_FOUNDATION`
- `REQUIRE_STANDARD_GATE`
- `DENY_UNSUPPORTED_EFFECT`
- `DENY_SCOPE_OR_IDENTITY`

它是 pure function，输入 canonical request + repository/harness facts，输出 risk/effect/gate decision 与原因码。v2 runtime 必须实际加载 content-addressed policy bytes；配置文件不能只是描述性文档。policy version/digest 进入 manifest；active operation 继续使用创建时版本，除非该版本被安全撤销，此时只能 recovery/abort，不能静默迁移。

---

## 10. 状态机、generation、expiry 与 idempotency

### 10.1 合法状态

```text
PREPARED
  └─[approval digest persisted]→ REQUIRED
       └─[required witness durable, active projection CAS]→ ACTIVE
            └─[next DAG node + claims]→ EXECUTING
                 └─[all effect nodes confirmed]→ VERIFYING
                      └─[all assertions pass]→ COMPLETED

每个 effect node：
PENDING → PREPARED → INTENT_DURABLE → APPLYING
  ├─ readback confirms owned postimage → CONFIRMED
  ├─ readback proves old/preimage       → RECOVERY_REQUIRED（可 fresh-approved 新 attempt）
  ├─ readback proves foreign/diverged   → RECOVERY_REQUIRED / NEEDS_CONTEXT
  └─ readback cannot decide             → EFFECT_UNKNOWN（冻结本节点与全部后继）

任何非终态 crash/不一致/expiry → RECOVERY_REQUIRED
在没有不可逆/unknown effect 且所有 postimage 仍归本 operation 所有时：
RECOVERY_REQUIRED → ABORTING → ABORTED
否则：RECOVERY_REQUIRED → read-only reconcile / fresh approved resume
```

终态只有 `COMPLETED` 与 `ABORTED`。`EFFECT_UNKNOWN` 不是失败终态，而是冻结状态；它只允许 observe/reconcile，不允许 retry、补偿或清 active。v1 receipt 中既有的 `EFFECT_UNKNOWN → APPLIED → VERIFIED → COMPLETED` 只是历史 v1 语义，v2 不得把它重解释成符合本不变量。

### 10.2 强不变量

1. canonical append-only journal 是唯一状态真值；summary、authority、active、receipt 都是 hash-bound projection；
2. REQUIRED witness 必须先于 active projection 落盘并 fsync；
3. 任一 required/nonterminal witness 存在而 active 缺失、过期、malformed 或 digest 不符，guard 必须 deny；
4. generation 单调 +1，所有 mutation 使用 expected-generation CAS；
5. attempt ID 是防重放 nonce，不是 bearer secret；同一 attempt 的 duplicate call 返回已有结果；
6. expiry 不会自动解锁、清 witness 或偷 claim，只把下一动作变为 `RECOVERY_REQUIRED`；
7. receipt 在 terminal projection 与清理 active 之前 durable；
8. 每 operation 恰有一个 immutable active manifest；v2 只允许 resource sets disjoint 的 operations 同时 ACTIVE；v1 始终 repo-global single-flight；任何层都不允许 manifest union；
9. guard 只接受显式 operation/generation 的 canonical controller argv；它不从 target 在多 operation 间猜 owner；
10. adapter intent 总是 journal-before-effect，readback 总是 effect 后独立记录；repo-files 也遵守同一 DAG/状态合同；
11. journal append 由 per-operation linearizable append lock + expected last-event hash 串行；禁止复用 v1“读 expected SHA 后无锁 rename”作为 Standard 并发 CAS；
12. recovery 不得修改 approved target/effect/assertion，只能对已拥有 delta 恢复、回滚或 reconcile；
13. v1 raw witness/active/receipt 永不由 v2 改写；legacy derived index 只能追加 path/SHA/validity projection。

### 10.3 Crash point matrix

| Crash 点 | 重启后证据 | 唯一合法动作 |
|---|---|---|
| v1 drain 前发现 required/invalid | raw v1 witness/active/receipt | 禁止 v2 prepare；只用冻结 v1 runtime exact recover 或 Legacy Gate |
| PREPARED 前 | 无 operation | 重跑 prepare |
| PREPARED 后、批准前 | manifest，无 approval | status / abort-pre-effect |
| REQUIRED durable、active 前 | required witness | fail closed；重建相同 digest active 或 abort |
| active 后、claim 前 | required+active | advance 重验并获取 claims |
| intent 后、repo-files apply 前 | intent + old preimage | 若仍 old，idempotent apply；否则 stale/recovery |
| 部分 repo-files apply | per-resource old/owned/foreign readback + journal | 只补仍 old 的资源，或全量 owned reverse；foreign 则停 |
| effect intent 后、响应前 | intent，无 readback | `EFFECT_UNKNOWN`，只读 reconcile |
| confirmed 后、receipt 前 | readback confirms | 补写 receipt，不重复 effect |
| receipt 后、active cleanup 前 | terminal receipt | idempotent cleanup projection |
| v2 pointer CAS 后、fresh proof 前 | old/new bundle + pointer journal | launcher 保持 previous 可选；失败 expected-current CAS 回 `DRAIN_V1`/previous |

---

## 11. 并发与事务机制

### 11.1 Resource key

v2 claims 存于 Git common-dir 的 versioned v2 state root；一次 `advance` 按 canonical ID 排序后原子获取，失败则释放本次已获 claims。若 v1 reader发现任何 required/invalid，v2 对全 common-dir fail closed，不进入 claim 计算：

```text
repo-path:<common-dir-hash>:<worktree-id>:<canonical-relative-path>
external-path:<real-absolute-path-hash>
local-ref:<common-dir-hash>:<full-refname>
remote-ref:<remote-url-identity-hash>:<full-refname>
runtime:<common-dir-hash>:active-pointer
```

- repo/external path 的冲突按 canonical ancestor/descendant overlap 判定，不只比较字符串相等；同一 worktree 的重叠 path 串行，不同 worktree 文件 bytes 可并行；
- refs/objects/config/remote 因 linked worktree 共享，使用 common-dir 级 key；
- shared index 永不作为 publisher staging；每个 publisher 用专属临时 index；
- 每 operation 一份 manifest；只有完整 resource set disjoint 的 operations 才能同时 ACTIVE。overlap 的后到 operation 可保持 PREPARED/`RESOURCE_BUSY`，不得把两份 manifest 合并；
- disjoint resources 可并行，不要求 repo-global whole-task lease；
- claim 只覆盖一次短 action，不覆盖 worker 思考/生成时间；最终正确性依靠每资源 CAS。

### 11.2 Claim 恢复

- 不按年龄偷 claim；
- 必须匹配 exact owner handle、operation、generation、attempt；
- acquisition/release 与 journal append 使用同一线性化 owner protocol；两个 writer 不能同时读到旧 SHA 后各自无锁 rename 覆盖对方；
- 只有证明 owner process 已死、journal 指向 recovery、用户批准 recovery 后才能清理；
- pid 只能作为证据之一，必须同时匹配 start identity/owner token，避免 PID reuse；
- process census 不进入正常热路径，只用于 bootstrap/recovery 诊断。

### 11.3 外部进程边界

terminal、IDE 和任意同 UID 进程不会自动遵守 claims。Standard 只能在每次 action 前重验 preimage、应用时使用 no-replace/expected-old/atomic rename，并在 action 后读回；它不能诚实承诺阻止 action 窗口内所有旁路写。若这类事故达到 Gate H，才考虑 daemon/OS isolation。

---

## 12. Effect 模型与 adapter 合同

### 12.1 统一 seam，不统一失败语义

```ts
interface EffectAdapter {
  prepare(effect, context): PreparedEffect;
  apply(prepared, attempt): ApplyResult;
  readback(prepared): Confirmed | Old | Diverged | Unreadable;
  compensate?(prepared, ownedPostimage): Compensated | Refused;
}
```

adapter 不得自行推进 kernel state。effect host 把 prepare/apply/readback 的输入输出追加到 journal，按 manifest DAG 调度；顺序由业务依赖显式声明，不硬编码“先 repo 再 personal/publish”等全局顺序。`repo-files` 不是 effect host 之前的特殊 apply 阶段：v2 所有 live target bytes 都只有 adapter 这一条 mutation path。

### 12.2 Repo files

- candidate bundle 包含 canonical path、kind、mode、preimage blob/hash、postimage blob/hash、reverse entry；
- 支持 create/update/delete/rename/symlink 的显式类型，不从 patch 文本猜语义；
- apply 前重新 census 全 bundle，新增未批准 path 即拒绝；
- 写入使用同目录 staging/no-replace/rename/fsync 的适用模式；
- rollback 只在 current == owned postimage 时应用 reverse；否则 `STALE_PREIMAGE`/人工合并。
- v2 ACTIVE 后，guard 对目标 `Write/Edit/apply_patch` 一律拒绝；只有 `advance` 内部调用此 adapter。v1 drain 仍按冻结旧 guard 语义，不混用。

### 12.3 External/personal files

- target 必须是 manifest 中 exact canonical absolute path；禁止目录通配、home 别名、环境变量晚解析；
- 同目录 temp + fsync file + atomic rename + fsync directory；
- durable forward/reverse manifest 同时记录 target pre/post/backup identity；
- personal content 默认不进入 journal，只存 hash、mode、size、redacted label 与恢复所需受限 backup pointer；
- reverse 仅当 current equals owned postimage；有外部漂移则拒绝覆盖；
- 每个 personal/external effect 需要 Gate E 的逐 target 摘要批准。
- 六 Skill 已完成的两个 personal cutover 只作为 postimage baseline + v1 backup ownership；migration 先只读验证，不重跑 legacy cutover、不接管或删除旧 backup。

### 12.4 Network/API/GUI

默认 `POLICY_DENIED`。只有专用 adapter 能证明以下四项才可进入未来 Standard extension：

1. stable target identity；
2. idempotency key 或等价去重；
3. 独立 readback oracle；
4. 明确 reconcile/compensate 语义。

GUI 若没有机器可读回执，最多作为 human-operated external step，receipt 记 `MANUAL_UNVERIFIED`，不得宣称强事务保证。跨 adapter 不做通用 two-phase commit；遇不可逆或 unknown 边界立即冻结后续 effects。

---

## 13. Git publisher adapter

Git publication 是 Standard adapter，不是 kernel，也不是所有 operation 的必备步骤。六 Skill `PUBLISHED` receipt 与 terminal effect history只能作为历史证据；当前仓库没有可直接复用的通用 publisher implementation，v2 不得由 `COMPLETED` receipt 重放旧 token/gate/command。

### 13.1 Local build

1. 解析并固定 common-dir、worktree identity、base commit、full destination ref；
2. 使用 operation 专属临时 index，不触碰共享/当前 index；
3. 将已核验 repo bundle 写入临时 index，逐 path 核验 mode/blob/tree；
4. 用 `git write-tree` + `git commit-tree` 生成 immutable commit OID；
5. 以 expected-old CAS 更新 operation 私有 ref；
6. 不移动 local HEAD/main/current branch；
7. receipt 记录 base/tree/commit/private-ref OID，不记录 credential。

### 13.2 Remote descriptor 与发布

- remote 使用 literal canonical URL identity + exact destination full ref，禁止依赖 `origin`、`push.default`、URL rewrite、include config 或当前 branch；
- Git config 只保留 credential helper 所需最小项，恶意 alias/hooks/pager/protocol rewrite 必须被清空或显式拒绝；
- source 是 immutable commit OID；
- 发布前机械证明 `expected-old` 是 source 的 ancestor，禁止 backward/non-FF；
- 执行 exact `--force-with-lease=<dst>:<expected-old>` 仅作为**expected-old CAS**，不允许空 lease、`+refspec` 或无 FF 证明；
- Gate R 展示 remote identity、dst、expected-old、new OID、FF 证明摘要，由真实用户批准。

### 13.3 Unknown reconciliation

push 调用响应丢失或进程 crash 后禁止自动 retry：

- readback remote == new OID → `EFFECT_CONFIRMED`；
- remote == expected-old → 仍为 `EFFECT_UNKNOWN`，需人决定是否新 attempt；
- remote == other → `DIVERGED` / `NEEDS_CONTEXT`；
- remote unreadable → 保持 `EFFECT_UNKNOWN`；
- 任何路径都不得自动回滚 remote 或覆盖他人新提交。

Git adapter 可在 Standard phase 定义 seam，但只有 concrete local bare remote + linked-worktree + response-loss fixtures 全通过后才能启用；不得为了“通用”预建 plugin bus 或远端 2PC。

---

## 14. Claude/Codex 统一接线与 fail-closed 边界

### 14.1 Single semantics

两端共享：

- `controlled-change.schema.json` 与 policy；
- state/journal/active projection；
- evaluator 与 exact controller invocation matcher；
- conformance fixtures、state/crash vectors、receipt schema。

先把原生事件投影成四类语义事件：`READ_ONLY`、`LIVE_MUTATION`、`CONTROLLER_ARGV`、`UNKNOWN`。parity 比较的是相同语义事件的 verdict/reason digest，不要求两端拥有完全相同的原生工具集合；未能可靠归类的一律 `UNKNOWN`。

两端只在 adapter 层不同：

| 面 | Claude | Codex |
|---|---|---|
| registration | `.claude/settings.json` 已直接注册 controlled-change | 保留 `.codex/hooks.json` 已授信 project-scope entry，在 adapter 内串联；不默认新增 trust entry |
| shell tool | `Bash`，input 主要是 `command` | adapter 接到 `Bash` |
| file edit | Read/Write/Edit 等 broad matcher | 原生 `apply_patch` 映射为 scope-guard 所需 Bash/command，post-edit 仍映射 Write |
| deny/update | Claude hook contract | adapter 保留 `decision:block` 与 `updatedInput + permissionDecision:allow` 语义 |
| loader | 每次 hook process fresh-load；registration 变化需新 session 验证 | 同；hooks trust/registration 变化必须 fresh Codex session |

### 14.2 Active enforcement rule

stable admission 与 v2 active 使用两层规则：

- **无 operation**：对已经 rollout 为 mandatory 的 protected surface，直接 live writer 返回 `PREPARE_REQUIRED`；普通非保护面保持现有模式；
- **v1 nonterminal**：冻结 v1 guard 语义，拒绝任何新 v1/v2 prepare，只允许 exact legacy recovery；
- **v2 nonterminal**：按下列规则执行。

- 所有已登记 mutating tools 默认 deny；
- 只允许**结构化 argv 级匹配**受支持 CLI 入口、operation ID 与 expected generation；不得靠 shell 字符串前缀判断；
- controller 必须由 harness 直接 argv invocation 或等价无 shell 解析通道启动；如果现有 hook 只看到 shell `command`，则 matcher 只接受无 wrapper、无 operator、无 redirect、无 substitution 的 canonical command，并把无法无歧义解析的输入拒绝；
- 不允许通过 shell wrapper、interpreter、command substitution、redirect、alias 或不同 cwd 绕过；
- v2 target 的 `Write/Edit/MultiEdit/NotebookEdit/apply_patch` 即使 path/preimage 合法也拒绝；live bytes 只能由 `advance` 内的 adapter 写。v1 原有 direct-writer admission 只存在于冻结 compatibility runtime；
- guard 无法解析 input、无法读取 canonical projection、digest 不符、超时、adapter 抛错时均 `GUARD_UNAVAILABLE` 并 deny；
- read-only semantic events可按冻结 allowlist使用，status/reconcile 只读路径必须保持可用；Claude `Read/Grep/Glob` 与 Codex 对应读取编码必须进入同一 fixture projection；
- 不从多个 active manifests 取 union；controller argv 必须显式 operation/generation，resource owner 由 kernel 校验；
- 没有 required witness 时仅非保护面保持 ordinary mode，不能借 inactive 绕过 protected-surface admission。

v1 已证明可执行 adapter/guard bytes 在 required/invalid、missing-active、malformed、timeout、adapter-error 路径查询 durable witness 并 fail closed；“普遍 fail-open”旧假设作废。仍明确排除 Codex adapter 在 Node 运行前 syntax-byte corruption 的场景，这是 v1/Standard TCB boundary，不虚称解决。v2 必须在保留这些回归的同时新增 pre-entry、exact argv、direct-writer deny 与共享 verdict corpus，才能 promotion。

### 14.3 Current/new session 边界

- 修改 registration/trust 后，当前 session 不能作为唯一验收；必须启动 fresh Claude 与 fresh Codex session；
- v1→v2 transaction 由冻结 v1可信环境应用，先进入 `DRAIN_V1` 并安装新 bundle dormant；新 session 验证成功后才 CAS 激活；
- active runtime pointer 内容寻址，guard 加载固定 bundle SHA，不从可变工作树直接执行新版本；
- 纯 JS guard 每次 tool call 都会 process-fresh load；只有 registration/trust/launcher path 变化必须 fresh session。当前静态 wiring 已通过，但本规划没有重新证明 fresh controlled-mode verdict digest，Gate M/F 必须补证；
- 若任一 harness fresh test 失败，active pointer 以 expected-current CAS 回 `DRAIN_V1`/previous，required witness 保持可诊断，禁止半启用。

---

## 15. v1 迁移、bootstrap、自升级与损坏恢复

### 15.1 已安装 v1 → v2 migration bootstrap

“guard 尚不存在的首次 bootstrap”已经在六 Skill MVP 中完成，不能重演。v2 唯一合法入口是由现有 v1 保护的 side-by-side migration：

1. **Gate M read-only census**：重新运行 v1 `inspect`，要求零 `required`/`invalid`、零 active file、全部 terminal witness↔receipt SHA 有效；冻结 HEAD/main/index/common-dir/worktree/locks/session/open-writer 事实。
2. 分别冻结：现有 v1 core/controller/guard/adapter/settings bytes；81-row runtime freeze；raw terminal witness/receipt；committed pre-publish receipt SHA；local post-publish attestation SHA；`publish.index` tuple。两份 receipt 是不同生命周期 artifact，不互相覆盖。
3. 在 Gate M 内只读验证两处既有 personal adapter target、backup、private audit 与所有 deterministic residue；只把 current postimage 当 v2 baseline。不得 apply、rollback、重跑 legacy cutover、接管或删除 v1 backup；未来真实 external mutation 仍另过 Gate E。
4. 在 scratch 构建 immutable v1 compatibility bundle、stable launcher 与 v2 dormant bundle；architecture/safety/parity/quality 审查 exact migration manifest SHA。
5. 使用**现有 v1 controller/guard**保护的一次 exact operation 安装 stable launcher与 dormant bytes；launcher 初始只能是 `DRAIN_V1`，同时拒绝新的 v1/v2 `prepare`。
6. `DRAIN_V1` 对每个 valid v1 nonterminal 只按 raw task/manifest/generation 调冻结 v1 recovery；invalid/stale 保持 fail closed 并进入 Legacy Recovery Gate。绝不翻译、重写或删除 v1 witness/active/receipt。
7. v2 只建 derived legacy index（legacy path + raw witness/receipt SHA + validity）；terminal v1 已无 full active manifest，禁止重建、导入 authority 或复用 gate/token/`EFFECT_UNKNOWN`。
8. 只有 legacy reader再次证明 zero required/invalid，fresh Claude/Codex 对 inactive/pre-entry/v1-drain/v2-active/malformed/crash/reverse fixture verdict digest 一致，才可 expected-old CAS 激活 v2。
9. 任一失败回 `DRAIN_V1`/previous；reverse 只对 current==owned migration postimage。v1 bundle/reader至少保留到 v2 第一笔成功 transaction + recovery drill，旧 receipts 永不因迁移删除。

当前 2026-09-01 snapshot 满足“两个 valid terminal、全局 inactive”，但这只是规划证据；未来 implementation 必须从第 1 步重新证明，不得沿用快照授权。

### 15.2 Content-addressed runtime

建议 operational root（未来实现前仍需 identity fixture 验证）：

```text
<git-common-dir>/luca-controlled-change/          # raw v1，immutable legacy owner
└── <task-id>/{required-witness,active-context,receipt}.json

<git-common-dir>/luca-controlled-change-v2/       # new namespace
├── runtime/v1-compat/<bundle-sha256>/...
├── runtime/v2/<bundle-sha256>/...
├── launcher-state.json                           # DRAIN_V1/current/previous CAS
├── legacy-index/<snapshot-sha256>.json            # path + raw SHA only
├── operations/<operation-id>/events/<seq>-<sha>.json
├── projections/<operation-id>.json
├── claims/...
└── receipts/private/<operation-id>.json
```

`launcher-state.json` 只存 mode、current/previous bundle SHA、schema compatibility、activated_at，并以 expected-old CAS 更新。runtime bundle immutable；launcher 必须最小且稳定。v2 event append 使用 per-operation lock/O_EXCL sequence + previous-event hash，不能用会丢更新的无锁 read-check-rename。

### 15.3 自升级

- v1 migration 完成后，N 版本 controller 编译 N+1 bundle，N+1 dormant；
- N 验证 N+1 schema can-read-old / can-recover-old 与双 harness fresh fixture；
- Gate F 后 CAS pointer N→N+1；
- previous N 至少保留到 N+1 完成第一笔真实 transaction 与 recovery drill；
- N+1 失败时由稳定 launcher 切回 N，不能要求损坏的 N+1 自救；
- stable launcher/registration/trust 自身变更重新走 Gate M + Gate G，不把它当普通 self-upgrade；
- 没有签名链：Standard 依赖已批准 bundle SHA + cooperative local TCB，绝不夸大为 supply-chain security。

---

## 16. 恢复、审计与隐私

### 16.1 Recovery decision table

| 现场 | 自动允许 | 必须人工 | 禁止 |
|---|---|---|---|
| v1 required/invalid during drain | frozen v1 exact inspect/diagnostics | Legacy Recovery Gate 下 exact recover | v2 prepare、改写/删除 legacy state |
| 未产生 effect，所有 preimage 仍旧 | idempotent resume | 可选择 abort | 改 manifest |
| 部分 repo postimage 且均为 owned | 补未应用资源或 reverse-owned | verification 语义不明时 | 覆盖第三方新变更 |
| personal postimage owned | reverse-owned | Gate E 重新确认 | current 已漂移时强回滚 |
| Git local commit/private ref 已建，未 push | 补 receipt/可删除 private ref | 是否继续 Gate R | 移动 main/HEAD |
| push 结果 unknown | read-only remote reconcile | retry/接受 diverged | 自动 retry/remote rollback |
| active projection 缺失/损坏但 required 存在 | fail closed + stable launcher diagnostics | exact repair/rollback | ordinary mutation |
| runtime bundle 损坏 | previous bundle diagnostics | Gate B/G approved rollback | 从 mutable worktree 偷载代码 |

### 16.2 Receipt / attestation 最小字段

- operation/request/manifest/runtime/policy digest；
- generation/attempt、state transitions 与 timestamps；
- canonical resource labels 与 pre/post hash（默认不含 content）；
- adapter version、effect identity、readback class；
- verification assertion ID/result/evidence digest；
- human gate ID + approval digest，不存对话全文；
- recovery/compensation outcome；
- final result：`CONFIRMED`、`ABORTED`、`RECOVERY_REQUIRED`、`EFFECT_UNKNOWN`。

证据分两层且各自 immutable：

- **private operational receipt**（mode `0600`）：精确 recovery identity、必要 exact path/backup pointer；只在 TCB 内读取；
- **public redacted attestation**：只含 digest、redacted resource label、review/publish result；可随代码发布。

pre-publish candidate receipt 与 post-publish attestation 是两份 artifact，后者引用前者 SHA，不把 committed `VERIFIED` 文件原地改为 `PUBLISHED`。状态词由同一 schema module 导出给 writer、human renderer、validator；`PUBLISHED` 必须是合法 post-publish attestation state。loader evidence 使用 `PASS`、`PASS_WITH_RECORDED_BOUNDARY`、`NOT_LOADED` 等 typed value，不能因 transaction state 为 VERIFIED 就自动写 `fresh_loader: PASS`。

### 16.3 隐私与保留

- 永不写 token、credential、cookie、完整 secret、remote URL userinfo/query；
- personal/external path 对普通审计输出 hash/label，只有 recovery TCB 可解析 exact path；
- candidate file body 留在 content-addressed restricted bundle/backup，不复制进 JSONL receipt；
- operation journal 保留到 terminal + rollback window；terminal receipt 按治理周期保留；
- 删除/压缩必须保留 digest chain 与 recovery 已不再需要的机械证明；
- 审计导出默认脱敏，任何提高保留级别的 policy change 需 Gate G。
- v1 已发布 artifact 中的 `/Users/luca`、source roots、backup topology 与 literal remote URL 作为 immutable historical evidence 不回写；v2 新 public artifact 必须 redacted。现有 personal audit `0644` 只作 legacy 输入，v2 private audit 默认 `0600`。

---

## 17. 可用性、治理与演进

### 17.1 默认 UX

- 普通低风险工程修改：`prepare` 自动给出 5 行以内摘要，原始显式用户请求可满足 approval，不再重复问；
- Standard gate 只展示新增风险：目标、effect、preimage drift、不可逆点、recovery 选择；
- typed error 给“发生了什么 / 未发生什么 / 当前证据 / 唯一下一步”，不以泛化 stack trace 代替解释；
- `status --json` 给机器，默认文本给人；只读 emergency diagnostics 永远可用；
- recovery UI 不列无效选择；只有 kernel 判定合法的动作才展示；
- `EFFECT_UNKNOWN` 明确写“不可安全重试”，避免用户把 unknown 当 failure。

### 17.2 Schema 与 policy 治理

- schema 采用 major/minor compatibility：旧 reader 对未知 major fail closed；minor 只能增 optional、不可扩大权限；
- policy version 与 adapter set 进入 manifest digest；active operation 版本冻结；
- 新 effect/target class、默认触发扩大、保留期/隐私改变、launcher/guard 变化均需 Gate G governance review；
- 旧 receipt reader 至少覆盖当前 major 与前一 major；migration 产新 projection，不重写旧 journal；
- deprecated adapter 先拒绝新 prepare，再保留 recovery reader，直到所有非终态 operation 清零；
- review ownership：architecture=codebase-design owner，safety=redteam/careful owner，parity=harness owner，contract=Plan Agent owner，release=quality gate；不能由实现者单方签发。

### 17.3 Observability 与 rollout evidence

只记录聚合指标，不把敏感 payload 当 telemetry：

- Foundation/Standard operation 数；
- prepare→complete 时延与额外交互；
- policy false positive/false negative；
- stale preimage、resource busy、recovery、unknown 频率；
- Claude/Codex conformance drift；
- rollback/reconcile 成功率；
- bypass/incident 与损失等级。

controlled-change 不接管 observability/eval writer 自己的 operational transaction；它只消费脱敏指标。任何 memory/eval 写入继续走既有 governed owner path。

---

## 18. 十六问题域闭合矩阵

| # | 问题域 | 方案答案 | 机械证据 |
|---|---|---|---|
| 1 | 第一性价值 | 防范围扩大、stale、并发/partial/unknown；对抗性威胁明示边界 | failure fixtures + obligation census |
| 2 | 使用面与触发 | Plan/Orchestrator writer 前 prepare；inactive protected surface 机械 admission；其余逐面 shadow/explicit；只读/plan/owner data exempt | policy + pre-entry bypass table tests |
| 3 | 威胁与信任 | cooperative TCB；不防恶意 main、被攻破 runtime、任意同 UID process | threat matrix + negative claims audit |
| 4 | 能力分层 | Foundation/Standard/High-assurance；目标 Standard，Gate H 才升级 | tier acceptance/kill metrics |
| 5 | 核心架构 | stable launcher + immutable v1 compatibility + v2 deep kernel/journal/static adapters | module interface/deletion tests |
| 6 | 状态机 | generation CAS、required-before-active、per-effect unknown freeze、owned abort；v1 raw semantics不重解释 | model/property + crash/migration matrix |
| 7 | bootstrap/升级 | 已安装 v1 先 DRAIN；side-by-side dormant v2；fresh dual harness；previous rollback | v1 drain + bootstrap/upgrade fixtures |
| 8 | 多 session 并发 | v1 single-flight；v2 one-manifest-per-op、disjoint ACTIVE、sorted claims + linearizable append + CAS | scheduler/linked-worktree/lost-update/no-age-steal tests |
| 9 | Claude/Codex 平价 | preserve trusted Codex piggyback；semantic event projection、fresh controlled-mode digest、active fail-closed | conformance corpus + fresh sessions |
| 10 | effect 模型 | static adapter + DAG；repo/personal/Git；network/API/GUI default deny | adapter contract/mutation tests |
| 11 | Git 发布 | isolated index/commit-tree/private ref/immutable OID/exact old CAS/reconcile | local bare remote + malicious config + response-loss fixtures |
| 12 | 恢复与审计 | v1 evidence immutable；private receipt/public attestation 分离；owned-only rollback；unknown readback | crash injection + schema/lineage/privacy scan |
| 13 | 可用性 | Foundation fast path、delta-only gates、typed errors、read-only status | shadow UX metrics / error snapshots |
| 14 | 治理演进 | version freeze、Gate G、old-reader/recovery compatibility、deprecation | compatibility matrix + policy diff review |
| 15 | 验证体系 | unit/integration/fresh/concurrency/crash/mutation/config/worktree/publication | assertion matrix U-012 |
| 16 | 实施路线 | v1 census/drain→compat freeze→v2 core→side-by-side activate→adapters→shadow/mandatory；明确 rollback/kill | U-block/Wave/Gates |

没有把“文档里回答”当成实现承诺；每一域都在后续 U-block 中至少有一个可执行 verification。

---

## 19. 实施合同总览（未来 Session，当前未授权）

### 19.1 Complexity、执行角色与成本带

- Plan tier：**Deep**（13 个稳定 U-ID、v1 migration、受保护 hooks、personal/Git 不可逆 effect、双 harness fresh 验证）。
- Model routing：规划/翻案/安全裁决用 reasoning-heavy；内核/adapter 实现用 core-execution；fixture/文档/清单检查用 guided-execution；preflight/格式/hash 用 mechanical。只指定 capability tier，不写死模型名。
- WA（Work Agent）：每个 U-block 独占 Files；不在 live checkout 直接生成，先写 operation scratch bundle。
- EA（Eval Agent）：与 WA 隔离、严格只读，不修代码、不推进 generation。
- trusted applier：只能是 top-level main 通过 `advance` 调用；WA/EA 均不持有 authority。
- 粗成本：v1 census/compat/migration 3–5 个专注工程日；Standard core + repo adapter 5–8 日；external/Git adapters 5–9 日；full verification/rollout 4–6 日，另加至少 20 次真实 shadow operation 的观察窗口。任一 kill assumption 命中即停止扩展，成本不是继续平台化的授权。

### 19.2 Future source file inventory

未来实现的拟议最小文件面如下；不代表当前写入授权：

```text
.claude/skill-os/controlled-change.schema.json
.claude/skill-os/controlled-change.yaml
.claude/hooks/controlled-change-guard.mjs
.claude/settings.json
.codex/hooks.json
.codex/codex-hook-adapter.mjs
.claude/agents/plan-agent.md
.claude/agents/orchestrator.md
scripts/controlled-change.mjs
scripts/controlled-change-controller.mjs
scripts/lib/controlled-change/admission.mjs
scripts/lib/controlled-change/launcher.mjs
scripts/lib/controlled-change/contract.mjs
scripts/lib/controlled-change/kernel.mjs
scripts/lib/controlled-change/state-store.mjs
scripts/lib/controlled-change/receipt-schema.mjs
scripts/lib/controlled-change/resource-claims.mjs
scripts/lib/controlled-change/patch-pipeline.mjs
scripts/lib/controlled-change/effect-host.mjs
scripts/lib/controlled-change/lifecycle.mjs
scripts/lib/controlled-change/compat/v1/core.mjs
scripts/lib/controlled-change/compat/v1/controller.mjs
scripts/lib/controlled-change/compat/v1/guard.mjs
scripts/lib/controlled-change/adapters/repo-files.mjs
scripts/lib/controlled-change/adapters/external-files.mjs
scripts/lib/controlled-change/adapters/git-publisher.mjs
scripts/fixtures/controlled-change/contract-cases.json
scripts/fixtures/controlled-change/state-cases.json
scripts/fixtures/controlled-change/harness-cases.json
scripts/fixtures/controlled-change/effect-cases.json
scripts/fixtures/controlled-change/v1-compat-cases.json
scripts/test-controlled-change-contract.mjs
scripts/test-controlled-change-state.mjs
scripts/test-controlled-change-migration.mjs
scripts/test-controlled-change-admission.mjs
scripts/test-controlled-change-repo-files.mjs
scripts/test-controlled-change-harness.mjs
scripts/test-controlled-change-claims.mjs
scripts/test-controlled-change-effects.mjs
scripts/test-controlled-change-external-files.mjs
scripts/test-controlled-change-git-publisher.mjs
scripts/test-controlled-change-lifecycle.mjs
scripts/test-controlled-change-ux.mjs
scripts/test-controlled-change-orchestration.mjs
scripts/test-controlled-change-evidence.mjs
scripts/verify-controlled-change.mjs
scripts/validate-skill-integration-receipt.mjs
scripts/verify-codex-wiring.mjs
scripts/verify.sh
package.json
.github/workflows/ci.yml
AGENTS.md
CLAUDE.md
framework-audit/2026-08-30-mattpocock-six-skills-integration/PUBLISH-ATTESTATION.json
```

约束：不新增 daemon、authority registry、dynamic plugin 目录或 repo-global lease 服务。若 implementation 发现必须新增未列文件，返回 `NEEDS_CONTEXT`，更新计划与 approval digest，不能现场扩写。

### 19.3 Wave 拓扑

```text
Gate P（当前停点：批准整份 implementation plan）
  ↓
Gate M（v1 read-only census / evidence split / clean implementation baseline）
  ↓
Wave 1: U-001
  ↓
Wave 2（scratch，可并行）: U-002 | U-004
  ↓
Gate B（v1-protected exact migration bundle + reverse + fresh-test plan）
  ↓
Wave 3: U-003
  ↓
Gate F（DRAIN_V1 → v2；fresh Claude/Codex promotion）
  ↓
Wave 4（可并行）: U-005 | U-007
  ↓
Wave 5（可并行、文件所有权分离）: U-006 | U-008 | U-009 | U-010
  ↓
Wave 6: U-011
  ↓
Wave 7: U-012
  ↓
Wave 8: U-013（disabled → shadow/explicit）
  ↓
Gate S（按 surface shadow → mandatory；U-013 closeout）
  ↓
Standard 停止线；Gate H 只允许开启一份新的 High-assurance plan
```

循环检测结果：无环。U-001 冻结 v1 compat 与 evidence schema；U-003 独占 stable launcher/guard migration；U-008/U-009 并行时只修改 U-007 预建的各自 adapter stub 和各自 test，禁止共同改 `effect-host.mjs`；U-006 只拥有 agent contracts；U-010 只拥有 lifecycle/state compatibility。若实际 ownership 冲突，先串行化，不由 WA 自行合并。

### 19.4 Human gates

| Gate | 何时 | 必须展示 | 通过者 | 失败/撤回 |
|---|---|---|---|---|
| **Gate P** | 现在 | 最终 plan SHA、全 review ledger、推荐档、成本/停止线 | 用户 | 不实施；本 Session 结束 |
| **Gate M** | 任一 v2 repo write 前 | v1 zero required/invalid；raw state/receipt/index SHA；pre/post-publish evidence split；personal只读 tuple verdict；clean/isolated baseline | 用户 + safety reviewer | 保持 v1；不得安装/清理/重放 |
| **Legacy Recovery Gate** | Gate M 发现 v1 required/invalid | exact raw state、frozen v1唯一 recovery、禁止项 | 用户 + safety reviewer | v2 全停；legacy fail closed |
| **Gate B** | migration bootstrap 前 | exact files/pre/post/reverse、v1 compat SHA、DRAIN_V1 行为、fresh tests | 用户 | 保持 v1；scratch bundle 可丢弃 |
| **Gate F** | v2 激活前 | zero legacy required/invalid、Claude/Codex fresh controlled-mode digest、pre-entry/direct-writer/fail-closed/reverse drill | 用户 | pointer 不切或回 DRAIN_V1/previous |
| **Gate E** | 每个 personal/external operation | exact target、pre/post hash、backup/reverse、不可逆点 | 用户 | adapter 不执行 |
| **Gate R** | 每次真实 remote publication | literal remote/dst/expected-old/new OID/FF 证明 | 用户 | 保留 local private ref；不 push |
| **Gate G** | policy/schema/privacy/launcher 权限面扩大 | semantic diff、兼容性、审计/隐私影响 | owner + 用户 | 旧 policy 继续；新 prepare 拒绝 |
| **Gate S** | shadow 转 mandatory | 每申请surface至少20次数据、3次recovery drill、false positive、双 harness parity | 用户 | 继续shadow/explicit或退v1-only |
| **Gate H** | High-assurance 进入条件命中 | 事故证据、TCB 改变、daemon/OS 成本 | 用户，新计划 | Standard 保持，不偷加重型机制 |

### 19.5 Phase ownership

| Phase | U-block | WA 档位 | 独立 EA | 写入边界 |
|---|---|---|---|---|
| v1 census / contract / compat freeze | Gate M + U-001 | core-execution | safety + contract | census read-only；U-001 scratch only |
| Foundation candidate | U-002, U-004 | core-execution | state + patch EA | scratch only |
| Side-by-side migration bootstrap | U-003 | core-execution | architecture/safety/parity/quality | Gate B 后由 v1 exact live apply |
| Standard core | U-005, U-007 | core-execution | concurrency/effect EA | controlled-change self-hosted apply |
| Integrations/adapters | U-006, U-008, U-009, U-010 | core-execution | role/parity/personal/Git/lifecycle EA | exact owned Files；真实 external/remote 仍 gated |
| UX/verification | U-011, U-012 | guided + core | independent quality gate | repo only；fixtures/temp/bare-local only |
| Rollout | U-013 | guided-execution | quality + governance | policy/docs/CI；Gate S 后才 mandatory |

---

## 20. U-blocks（九字段合同）

### U-001

```yaml
U-001:
  Goal: 冻结 installed v1 compatibility/evidence lineage，并编译 controlled-change/v2 strict schema、executable policy、receipt/attestation 状态词与 obligation census
  Source: R-001, R-003, R-005, R-006, R-007, R-009
  Dependencies: external: Gate P, Gate M
  Files: .claude/skill-os/controlled-change.schema.json; .claude/skill-os/controlled-change.yaml; scripts/lib/controlled-change/contract.mjs; scripts/lib/controlled-change/receipt-schema.mjs; scripts/lib/controlled-change/compat/v1/core.mjs; scripts/lib/controlled-change/compat/v1/controller.mjs; scripts/lib/controlled-change/compat/v1/guard.mjs; scripts/fixtures/controlled-change/contract-cases.json; scripts/fixtures/controlled-change/v1-compat-cases.json; scripts/test-controlled-change-contract.mjs; scripts/test-controlled-change-migration.mjs; scripts/validate-skill-integration-receipt.mjs; framework-audit/2026-08-30-mattpocock-six-skills-integration/PUBLISH-ATTESTATION.json
  Approach: Gate M 先在 scratch 冻结 v1 raw bytes/SHA；compat runtime 保持原语义，v2 compiler 禁止未知字段和隐式扩权；把 committed pre-publish receipt 与 post-publish attestation 分成引用链，不原地覆写；policy bytes 必须由 runtime loader 消费
  Read List: FINAL-MASTER-PLAN.md sections 1–6、8–10、15–18、19.4；scripts/controlled-change.mjs 与 scripts/controlled-change-controller.mjs 全部 v1 schema/state/atomic-write 段；.claude/hooks/controlled-change-guard.mjs 全文；.claude/skill-os/controlled-change.yaml；六 Skill FINAL-MASTER-PLAN.md、IMPLEMENTATION-RECEIPT.md、REVIEW-LEDGER.md、CANDIDATE-MANIFEST.tsv；scripts/validate-skill-integration-receipt.mjs；Gate M evidence manifest
  Test scenarios: happy=v1 terminal raw fixture byte-identical可读、v2单 repo update稳定 digest、VERIFIED receipt+PUBLISHED attestation链；edge=arbitrary string v1 generation、aggregated history、缺 terminal manifest、typed NOT_LOADED、rename/symlink/full-ref/external path；error=改写v1、重建terminal manifest、复用旧token/gate、receipt状态枚举漂移、未知字段/glob/path escape/default remote/free shell/dynamic adapter
  Verification: npm run test:controlled-change --silent && node scripts/test-controlled-change-migration.mjs --raw-v1-fixtures --assert-byte-identical --zero-authority-import && node scripts/test-controlled-change-contract.mjs --all --obligation-census --require-exact-selectors && node scripts/validate-skill-integration-receipt.mjs --prepublish-and-attestation
  Status: PLANNED
```

完成门：EA 逐条证明“没有被允许的未知行为”，且 compat fixture 对 v1 raw bytes 零改写。任何允许式 schema fallback、把 PUBLISHED 写回 committed receipt、或把 legacy history 当新 authority 均为 BLOCKING。Rollback：scratch-only，失败即丢弃候选；不得产生 live/runtime state。

### U-002

```yaml
U-002:
  Goal: 实现 v2 prepare/advance/status 内核候选、线性化 append-only journal、approval binding、generation CAS 与 crash 后唯一 next-action 投影
  Source: R-001, R-003, R-006, R-008, R-009
  Dependencies: U-001
  Files: scripts/controlled-change.mjs; scripts/lib/controlled-change/kernel.mjs; scripts/lib/controlled-change/state-store.mjs; scripts/fixtures/controlled-change/state-cases.json; scripts/test-controlled-change-state.mjs
  Approach: 三个 public entry 隐藏全部状态转换；caller 只能提交 request+approval evidence 或 operation+expected-generation+必要的新 gate evidence；per-operation append lock/O_EXCL sequence + previous-event hash 串行写入，authority/active/receipt 全由 journal 投影
  Read List: FINAL-MASTER-PLAN.md sections 7–11、15–16；U-001 v1 compatibility/evidence contract；scripts/project-pin.mjs proposal/epoch CAS；scripts/project-lease.mjs no-age-steal/recovery；.claude/hooks/lib/project-substrate.mjs atomic write/fsync/identity；.claude/observability/scripts/write_observation.py journal recovery；v1 atomicWriteJson lost-update review finding
  Test scenarios: happy=prepare→required→active→repo-effect→verify→complete；edge=duplicate attempt、approval gate、expiry、required-without-active、receipt-before-cleanup、两个disjoint operations；error=stale generation、malformed projection、partial journal、simultaneous append lost update、two legal next actions、unknown retry、caller自带next_state/authority
  Verification: node scripts/test-controlled-change-state.mjs --model-all-transitions && node scripts/test-controlled-change-state.mjs --crash-every-journal-boundary --assert-single-next-action && node scripts/test-controlled-change-state.mjs --parallel-append=32 --assert-no-lost-update && node scripts/test-controlled-change-state.mjs --replay
  Status: PLANNED
```

BLOCKING：任何 projection 可独立改写、approval 可由 worker/caller任意伪造、expiry 自动清理、`EFFECT_UNKNOWN` 可重试、并发 append 丢事件或 crash 后存在两个合法动作。Rollback：scratch-only；state schema 未经 Gate B 不进入 live。

### U-003

```yaml
U-003:
  Goal: 由 installed v1 保护 exact side-by-side migration，安装 DRAIN_V1 stable launcher、v1 compatibility 与 v2 dormant runtime，并经 fresh Claude/Codex 验证后 CAS 激活
  Source: R-001, R-003, R-005, R-008, R-009
  Dependencies: U-001, U-002, U-004, external: Gate B
  Files: .claude/skill-os/controlled-change.schema.json; .claude/skill-os/controlled-change.yaml; .claude/hooks/controlled-change-guard.mjs; scripts/controlled-change.mjs; scripts/controlled-change-controller.mjs; scripts/lib/controlled-change/admission.mjs; scripts/lib/controlled-change/launcher.mjs; scripts/lib/controlled-change/lifecycle.mjs; scripts/lib/controlled-change/contract.mjs; scripts/lib/controlled-change/kernel.mjs; scripts/lib/controlled-change/state-store.mjs; scripts/lib/controlled-change/receipt-schema.mjs; scripts/lib/controlled-change/compat/v1/core.mjs; scripts/lib/controlled-change/compat/v1/controller.mjs; scripts/lib/controlled-change/compat/v1/guard.mjs; scripts/lib/controlled-change/patch-pipeline.mjs; scripts/lib/controlled-change/adapters/repo-files.mjs; scripts/fixtures/controlled-change/contract-cases.json; scripts/fixtures/controlled-change/state-cases.json; scripts/fixtures/controlled-change/harness-cases.json; scripts/fixtures/controlled-change/v1-compat-cases.json; scripts/test-controlled-change-contract.mjs; scripts/test-controlled-change-state.mjs; scripts/test-controlled-change-migration.mjs; scripts/test-controlled-change-admission.mjs; scripts/test-controlled-change-repo-files.mjs; scripts/test-controlled-change-harness.mjs; scripts/verify-codex-wiring.mjs; scripts/validate-skill-integration-receipt.mjs; framework-audit/2026-08-30-mattpocock-six-skills-integration/PUBLISH-ATTESTATION.json
  Approach: Gate B 冻结 exact pre/post/reverse；现有 v1 guard允许这一笔精确 mutation；stable guard path先进入DRAIN_V1、dual-read raw v1和v2 namespace；保持 .claude/settings.json 与 .codex/hooks.json trust entry bytes不变；zero legacy required/invalid与fresh parity后才CAS v2 pointer
  Read List: FINAL-MASTER-PLAN.md sections 14–16、19.2–19.4；Gate M/B evidence；.claude/settings.json PreToolUse registration；.codex/hooks.json合法顶层/已授信entry；.codex/codex-hook-adapter.mjs project-scope piggyback与failure fallback；.claude/hooks/project-scope-guard.mjs deny/updatedInput/exception；scripts/verify-codex-wiring.mjs S5b/S11/S11b/S12；全部v1 core 11 cases
  Test scenarios: happy=valid terminal v1→DRAIN_V1→v2 active、protected inactive write需prepare、active只准canonical controller；edge=v1 valid nonterminal exact recovery、fresh loader、Codex trust unchanged、semantic Read/Write/Bash/apply_patch projection；error=v1 invalid/stale、多v1 required、新prepare during drain、direct target writer、raw allowed_commands wrapper/operator/redirect/substitution、missing/malformed v2、timeout/throw、reverse drill
  Verification: npm run test:controlled-change --silent && node scripts/test-controlled-change-migration.mjs --drain-v1 --zero-legacy-authority-import --reverse && node scripts/test-controlled-change-admission.mjs --pre-witness --controller-argv-only --deny-direct-writer && node scripts/test-controlled-change-harness.mjs --semantic-conformance-both && node scripts/verify-codex-wiring.mjs；随后 fresh Claude 与 fresh Codex 各跑同一 harness-cases corpus并比较 verdict/reason digest完全相等
  Status: PLANNED
```

Gate F 只有在 legacy zero required/invalid、fresh 双端 controlled-mode verdict digest、trusted Codex entry bytes unchanged、launcher expected-old CAS、reverse drill全过后才能通过。失败：保持/回 `DRAIN_V1` 或 previous；reverse只覆盖 current==owned-postimage；不得删 v1/v2 required证据来“解锁”。

### U-004

```yaml
U-004:
  Goal: 建立 scratch candidate bundle census 与只能由 effect host 调用的 repo-files CAS adapter，精确支持 create/update/delete/rename/symlink/mode
  Source: R-001, R-003, R-006, R-008, R-009
  Dependencies: U-001
  Files: scripts/lib/controlled-change/patch-pipeline.mjs; scripts/lib/controlled-change/adapters/repo-files.mjs; scripts/test-controlled-change-repo-files.mjs
  Approach: worker 只在证明 writable roots不含 live/common-dir 的 scratch生成logical destinations；candidate pipeline只做census；repo-files adapter对exact path/kind/mode/pre/post/reverse做逐资源CAS，自己不能推进kernel state，也不暴露第二个direct apply CLI
  Read List: FINAL-MASTER-PLAN.md sections 7、12.2、16；六 Skill FINAL-MASTER-PLAN.md 的 scratch worker/trusted apply/allowlist formulas；.codex/workflow-runner.mjs 的 scratch workspace isolation；scripts/test-project-transaction.mjs 的 staging/no-replace/byte-exact CAS cases
  Test scenarios: happy=effect-host fixture调用update/create/rename；edge=dirty unrelated WIP byte-identical、symlink/type/mode/unicode/linked-worktree、partial资源readback；error=direct CLI调用、undeclared file、path traversal、preimage drift、harness direct writer、partial crash、reverse时current非owned postimage
  Verification: node scripts/test-controlled-change-repo-files.mjs --all-kinds --effect-host-only && node scripts/test-controlled-change-repo-files.mjs --preserve-unrelated-dirty-wip && node scripts/test-controlled-change-repo-files.mjs --crash-and-owned-reverse --classify-old-owned-foreign
  Status: PLANNED
```

BLOCKING：delta census 分母必须来自 candidate 与 live identity 的完整集合，不能只检查 manifest 中已知文件。Rollback：Wave 2 scratch-only；bootstrap 后 reverse 仍只对 owned postimage 生效。

---

### U-005

```yaml
U-005:
  Goal: 增加 common-dir 身份下 one-manifest-per-operation、有序资源 claim、disjoint ACTIVE、线性化 generation推进与精确 recovery/no-age-steal
  Source: R-001, R-005, R-006, R-008, R-009
  Dependencies: U-002, U-003, U-004, external: Gate F
  Files: scripts/lib/controlled-change/resource-claims.mjs; scripts/lib/controlled-change/kernel.mjs; scripts/lib/controlled-change/state-store.mjs; scripts/test-controlled-change-claims.mjs
  Approach: 对repo-path ancestor overlap、external path、local-ref、remote-ref、runtime生成canonical key；完整resource set不相交才允许多operation ACTIVE，action按序短时获取；claim只改善合作式调度，journal append和资源apply仍各自CAS
  Read List: FINAL-MASTER-PLAN.md sections 4.3、10–11、16；scripts/project-lease.mjs 的 acquire/release/owner/recover 段；.claude/hooks/lib/project-substrate.mjs 的 common-dir/worktree identity 段；scripts/test-project-transaction.mjs 的 concurrency/PID-reuse/no-age-steal cases
  Test scenarios: happy=disjoint manifests并行、overlap后到保持RESOURCE_BUSY；edge=ancestor/descendant path、linked-worktree file独立而ref共享、多资源排序、owner crash/PID reuse；error=manifest union、guard猜owner、age steal、stale generation、lost journal update、partial claim leak、external process漂移
  Verification: node scripts/test-controlled-change-claims.mjs --scheduler --workers=16 --one-manifest-per-op && node scripts/test-controlled-change-claims.mjs --overlap=ancestor,descendant,ref --linked-worktrees && node scripts/test-controlled-change-claims.mjs --no-age-steal --pid-reuse --no-lost-update --crash-every-boundary
  Status: PLANNED
```

BLOCKING：死锁、claim 泄漏、按时间偷锁、将 claim 误写成外部进程强保证。Rollback：释放仅由 exact owner 持有且 journal 允许的 claims；state code 更新按 runtime previous bundle 回退。

### U-006

```yaml
U-006:
  Goal: 把 writer前compile/prepare、approval evidence、risk/effect触发、三入口与六值completion映射接入Plan Agent/Orchestrator，并以六 Skill v1 lineage作为migration fixture
  Source: R-001, R-003, R-005, R-007, R-010
  Dependencies: U-003, U-004, U-005, U-007
  Files: .claude/agents/plan-agent.md; .claude/agents/orchestrator.md; scripts/fixtures/controlled-change/contract-cases.json; scripts/test-controlled-change-orchestration.mjs
  Approach: 角色合同要求派发writer前prepare并把真实用户裁决绑定为evidence；Orchestrator只能调用入口；worker/EA必须在机械隔离scratch；不改workflow graph、不把controlled-change暴露成Skill，六Skill只验证v1→v2 lineage与触发
  Read List: FINAL-MASTER-PLAN.md sections 0、8、18–20；.claude/agents/plan-agent.md 的 U-block/Source/Status/Research Gate 段；.claude/agents/orchestrator.md 的 supervisor/human gate/escalation 段；六 Skill FINAL-MASTER-PLAN.md 的 controlled-change U-block、files、publisher、non-goals；.claude/skill-os/optional-workflow-graph.yaml 的状态真值边界
  Test scenarios: happy=低风险repo U-block在首个writer前prepare且原请求绑定approval；edge=protected/multi-effect升Standard、plan/readonly/owner-data-writer exempt、无sandbox则不委托worker；error=prepare发生在writer后、worker mint/call controller、EA advance、Orchestrator改manifest/代批、workflow graph新增node
  Verification: node scripts/test-controlled-change-orchestration.mjs --role-matrix --prepare-before-writer && node scripts/test-controlled-change-orchestration.mjs --trigger-table --approval-binding && node scripts/test-controlled-change-orchestration.mjs --six-skill-v1-lineage && git diff --exit-code -- .claude/skill-os/optional-workflow-graph.yaml
  Status: PLANNED
```

六 Skill v1 的准确位置：raw manifest/witness/receipt与回归输入 U-001–U-003；发布事实只输入 U-009 的failure/fixture要求，不代表有可复用publisher代码；它不得反向冻结v2 schema或授权重放。Rollback：恢复两份agent contract exact preimage；不改workflow state或graph。

### U-007

```yaml
U-007:
  Goal: 建立封闭静态 effect host，统一调度repo/external/Git DAG并让kernel成为唯一状态推进者
  Source: R-001, R-004, R-008, R-009
  Dependencies: U-002, U-003, U-004
  Files: scripts/lib/controlled-change/effect-host.mjs; scripts/lib/controlled-change/adapters/external-files.mjs; scripts/lib/controlled-change/adapters/git-publisher.mjs; .claude/skill-os/controlled-change.yaml; scripts/fixtures/controlled-change/effect-cases.json; scripts/test-controlled-change-effects.mjs
  Approach: 编译期静态表只暴露prepare/apply/readback/compensate；repo-files从第一节点起就走host，external/Git先是deny stub；kernel拥有全部state，任何node UNKNOWN立即冻结后继，禁止hardcoded pre-effect repo apply
  Read List: FINAL-MASTER-PLAN.md sections 6.1、7、9、12–13、16；旧重型方案的 effect broker/personal/publisher 候选段；scripts/check-capability-parity.mjs 的 static projection 模式
  Test scenarios: happy=repo effect按DAG完成；edge=多个disjoint effects、compensable node、policy freeze；error=第二repo mutation owner、unknown adapter/dynamic path、adapter自推state、cycle、undeclared target、UNKNOWN后执行尾节点、跨adapter自动补偿
  Verification: node scripts/test-controlled-change-effects.mjs --contract --static-registry --single-mutation-owner && node scripts/test-controlled-change-effects.mjs --dag-all-topologies && node scripts/test-controlled-change-effects.mjs --unknown-freezes-tail --no-dynamic-loading
  Status: PLANNED
```

删除测试：删 external/Git stub 后 repo-files 仍完整工作；若 kernel import 具体业务语义即 FAIL。Rollback：policy 保持 repo-only，stub 永远 deny，不产生外部 effect。

### U-008

```yaml
U-008:
  Goal: 从六 Skill task-specific cutover提取通用external/personal exact-path durable adapter，同时继承当前postimage baseline而不接管v1 backup ownership
  Source: R-001, R-003, R-004, R-006, R-008, R-009
  Dependencies: U-005, U-007
  Files: scripts/lib/controlled-change/adapters/external-files.mjs; scripts/test-controlled-change-external-files.mjs
  Approach: 只替换U-007 external deny stub；canonical absolute target、same-dir temp/fsync/rename、0600 private receipt/restricted backup pointer、owned-postimage reverse；Gate M verified v1 adapter postimage成为preimage，但旧backup/audit保持legacy owner
  Read List: FINAL-MASTER-PLAN.md sections 9、12.3、15–16、19.4；scripts/skill-cutover-transaction.mjs 的targetSummary/apply/verify/rollback/self-test段；scripts/validate-skill-integration-receipt.mjs personal schema；六Skill IMPLEMENTATION-RECEIPT personal boundary；Gate M个人target/backup/audit/residue只读tuple report；.claude/observability/scripts/write_observation.py staging/journal/recovery；旧重型personal候选
  Test scenarios: happy=temp exact file create/update+confirmed private receipt；edge=existing adapter postimage baseline、typed PASS_WITH_RECORDED_BOUNDARY/NOT_LOADED、mode/unicode/concurrent edit/crash/duplicate；error=重跑legacy cutover/复用旧backup、transaction state推导loader PASS、home/env晚展开、glob/symlink escape、0644 private audit、journal content leak、foreign current reverse
  Verification: node scripts/test-controlled-change-external-files.mjs --temp-root-only --crash-every-boundary && node scripts/test-controlled-change-external-files.mjs --concurrency=16 --owned-reverse --preserve-legacy-owner && node scripts/test-controlled-change-external-files.mjs --privacy-scan --private-mode=0600 --typed-loader-evidence
  Status: PLANNED
```

测试只能使用 `mktemp` 根，不得读取/写真实个人目录。完成 U-008 只代表 adapter 可用；任何真实 target 仍逐 operation Gate E。Rollback：若 current==owned postimage，使用 durable reverse；否则冻结为 `NEEDS_CONTEXT`。

### U-009

```yaml
U-009:
  Goal: 实现 isolated-index Git publisher adapter，以 immutable commit/private-ref/expected-old CAS 发布并对响应丢失只读 reconcile
  Source: R-001, R-003, R-004, R-006, R-008, R-009
  Dependencies: U-004, U-005, U-007
  Files: scripts/lib/controlled-change/adapters/git-publisher.mjs; scripts/test-controlled-change-git-publisher.mjs
  Approach: 从v1发布证据重建算法而非复用不存在的通用publisher；只替换U-007 Git deny stub；operation私有index/ref构造commit，literal descriptor+credential-only config+expected-old lease，intent后不自动retry；任何v1 terminal auth均不可重放
  Read List: FINAL-MASTER-PLAN.md sections 11、13、15–16、19.4；六Skill IMPLEMENTATION-RECEIPT 的published tree/commit/remote/ref/index/head facts；CANDIDATE-MANIFEST.tsv；scripts/candidate-manifest.mjs 的只读published-lineage验证；v1 U-008 witness/receipt EFFECT_UNKNOWN历史；旧重型publisher候选；历史rule-execution recovery publisher段；scripts/sync.sh assumptions
  Test scenarios: happy=local bare remote FF publish confirmed；edge=linked worktree/shared refs、private ref CAS、response loss→new/old/other/unreadable、prepublish receipt+postpublish attestation；error=从v1 COMPLETED重放、dirty index、HEAD/main moved、malicious config/url rewrite/hook、wrong remote/ref、non-FF、empty lease/+refspec、automatic retry
  Verification: node scripts/test-controlled-change-git-publisher.mjs --local-bare-fixture --linked-worktrees && node scripts/test-controlled-change-git-publisher.mjs --malicious-config-matrix && node scripts/test-controlled-change-git-publisher.mjs --response-loss-all-readbacks --assert-no-retry && git diff --exit-code --cached
  Status: PLANNED
```

真实网络/远端不属于 U-009 自动验证；每次真实 publish 需 Gate R。Rollback：push 前可删除 owned private ref/临时 index；push 后只 reconcile，绝不自动 remote rollback。publisher 失败不能让 kernel/本地 repo-files adapter 失效。

---

### U-010

```yaml
U-010:
  Goal: 实现 content-addressed runtime capsule、自升级兼容矩阵、previous-bundle 回退与损坏 guard 的稳定 launcher 恢复
  Source: R-001, R-003, R-005, R-008, R-009
  Dependencies: U-003, U-005, U-007
  Files: scripts/lib/controlled-change/lifecycle.mjs; scripts/lib/controlled-change/launcher.mjs; scripts/lib/controlled-change/state-store.mjs; scripts/test-controlled-change-lifecycle.mjs
  Approach: v1 compat retention先作为不可删下限；v2 N安装N+1 dormant，验证can-read/recover current/previous与fresh harness后CAS pointer；previous保留到首笔成功+recovery drill，stable launcher变更永不混入普通升级
  Read List: FINAL-MASTER-PLAN.md sections 10、14–17；Gate M/U-001 legacy index/compat evidence；U-003 completion evidence；scripts/codex-trust-hooks.mjs trust dry-run边界；scripts/verify-codex-wiring.mjs registration/trust assertions
  Test scenarios: happy=v1 retained、N→N+1 dormant/test/activate/first-operation；edge=v1 raw terminal reader、v2 previous nonterminal recovery、minor schema、previous retention；error=删除v1 compat、unknown major、N+1 corrupt、pointer CAS conflict、session verdict divergence、stable launcher/trust change伪装self-upgrade
  Verification: node scripts/test-controlled-change-lifecycle.mjs --upgrade-matrix=v1-compat,current,previous && node scripts/test-controlled-change-lifecycle.mjs --corrupt-new-bundle --rollback-previous && node scripts/test-controlled-change-lifecycle.mjs --unknown-major-fail-closed --retain-legacy；fresh Claude/Codex 对current/previous各跑harness digest parity
  Status: PLANNED
```

stable launcher、hook registration 或 trust 变化仍回 Gate M/Gate G，不能由普通 N→N+1 自动授权。Rollback：active pointer expected-old CAS 回 previous；不删除新bundle、v2 journal或v1 raw state，先留证。

### U-011

```yaml
U-011:
  Goal: 完成低仪式prepare摘要、DRAIN/v1/v2只读status、合法recovery actions、typed error与private receipt/public attestation UX
  Source: R-001, R-006, R-007, R-008, R-009
  Dependencies: U-006, U-008, U-009, U-010
  Files: scripts/controlled-change.mjs; scripts/lib/controlled-change/kernel.mjs; scripts/lib/controlled-change/state-store.mjs; scripts/lib/controlled-change/receipt-schema.mjs; scripts/test-controlled-change-ux.mjs; scripts/test-controlled-change-evidence.mjs
  Approach: 文本/JSON从canonical projection生成；status合并展示legacy raw validity与v2而不改写；只展示唯一合法next action；Foundation不重复问已绑定的原请求，Standard只展示risk delta；public输出默认redacted
  Read List: FINAL-MASTER-PLAN.md sections 8.2、15–17、19.4；U-001 receipt/attestation schema；.claude/agents/orchestrator.md escalation；memory/scripts/record_eval.py digest/idempotent audit；现有CLI JSON/text约定；六Skill human receipt中PASS_WITH_RECORDED_BOUNDARY文本
  Test scenarios: happy=Foundation五行摘要+single advance；edge=DRAIN_V1/legacy terminal/resource busy/stale/expiry/recovery/unknown、JSON stability、redacted public+0600 private、typed loader boundary；error=stack trace替代行动、非法retry、PUBLISHED/VERIFIED混层、transaction state自动推loader PASS、secret/token/URL query/path/body泄漏、status写state
  Verification: node scripts/test-controlled-change-ux.mjs --golden-errors --all-typed-codes --include-drain-v1 && node scripts/test-controlled-change-ux.mjs --status-readonly --fs-snapshot && node scripts/test-controlled-change-evidence.mjs --private-public-split --typed-loader --privacy-scan
  Status: PLANNED
```

UX 指标不降低 safety gate：若低仪式只能靠隐式扩大 authority，则触发 K-01，保持 shadow 而非弱化 contract。Rollback：恢复 CLI/projection code previous bundle；receipt/journal 不重写。

### U-012

```yaml
U-012:
  Goal: 建立全承诺 assertion matrix、unit/integration/fresh/concurrency/crash/mutation/config/worktree/publication 总验证与证据冻结
  Source: R-001, R-003, R-005, R-006, R-007, R-009
  Dependencies: U-011
  Files: scripts/verify-controlled-change.mjs; scripts/verify.sh; package.json; .github/workflows/ci.yml
  Approach: 聚合但不隐藏各 U-block verifier；对每项承诺绑定 exact test selector 和证据 digest，加入 mutation/obligation census，fresh harness 不能被 in-process mock 替代
  Read List: FINAL-MASTER-PLAN.md sections 1.1、4.1、18、21；所有 U-001–U-011 completion report 与 test selector；scripts/verify.sh 的现有分层；package.json scripts；.github/workflows/ci.yml 现有 job/OS；scripts/verify-codex-wiring.mjs 输出合同
  Test scenarios: happy=clean isolated clone全矩阵与v1 regression通过；edge=dirty/diverged main、linked worktrees、raw v1 terminal/nonterminal recovery、parallel v2 schedule；error=删除pre-entry/direct-writer-deny/legacy-drain/CAS/hash/gate/unknown-freeze任一控制后仍绿、恶意Git config、fresh parity被mock、receipt validator与writer状态词分叉
  Verification: npm run test:controlled-change --silent && node scripts/verify-controlled-change.mjs --all --evidence-dir <operation-scratch>/evidence && node scripts/verify-controlled-change.mjs --mutation --require-kill-each-control && npm run verify；fresh Claude/Codex分别跑semantic parity selector，并由独立EA复算evidence manifest SHA
  Status: PLANNED
```

CI 只跑无 secret、无个人目录、无真实远端的 deterministic matrix；publication 的 mandatory local bare fixture 在 CI，真实 disposable remote 只在 U-013/Gate R shadow。Rollback：验证接线失败只撤回 verify/CI 文件的 owned delta，不撤回实现证据或篡改失败记录。

### U-013

```yaml
U-013:
  Goal: 以 per-surface shadow 指标和恢复演练把 Foundation/Standard 从 disabled 推到显式或 mandatory，并在 Standard 停止线冻结治理文档
  Source: R-001, R-002, R-007, R-009, R-010
  Dependencies: U-012, external: Gate S only for mandatory closeout
  Files: .claude/skill-os/controlled-change.yaml; AGENTS.md; CLAUDE.md
  Approach: 先disabled→shadow→explicit并收集证据，Gate S只批准逐surface mandatory尾段；首批仅controlled-change自身stable entry/policy/controller；Git/personal保持逐operation Gate R/E且不自动mandatory；不改workflow graph
  Read List: FINAL-MASTER-PLAN.md sections 3、8.3、13、17、19.4、21–23；U-012 evidence manifest；AGENTS.md 的 routing/governance/session isolation；CLAUDE.md 的 router/harness parity；controlled-change policy semantic diff
  Test scenarios: happy=20次repo shadow达标后仅首批protected surface mandatory；edge=其他runtime surface分开shadow、personal/Git独立dark/explicit、dedicated remote Gate R fixture、rollback；error=global big-bang、无数据mandatory、未过Gate E/R effect、把personal/Git设automatic mandatory、改workflow graph、混入High-assurance
  Verification: node scripts/verify-controlled-change.mjs --rollout-policy --require-per-surface --first-surface=self-protection && node scripts/test-controlled-change-orchestration.mjs --no-workflow-node && git diff --exit-code -- .claude/skill-os/optional-workflow-graph.yaml；Gate S审查至少20次operation脱敏evidence、至少3次crash/recovery drill、Claude/Codex semantic parity=100%；Git启用前另以Gate R在dedicated non-production remote/ref完成1次publish+response-loss reconcile fixture
  Status: PLANNED
```

若 repo Foundation 达标而 personal/Git 未达标，只提升 repo surface；未达标 adapter 保留 default deny。Gate S 可随时退回 shadow；退回不改旧 journal/receipt。完成 U-013 后**停止**：daemon、签名 capability、OS isolation、动态 plugin、通用网络/GUI 仍不实施；Gate H 只能开启新计划。

---

## 21. Blocking assertions 与验证矩阵

以下每条均为 implementation promotion 的机械门。未标 WARNING 的全部 BLOCKING。

| Assertion | 精确断言 | 主要 selector |
|---|---|---|
| [BLOCKING] CC-000 Legacy drain | v1 raw bytes/SHA immutable；required/invalid时拒绝v2；terminal只建path/SHA derived index；旧token/gate/effect不可导入 | migration raw-v1/drain/zero-authority-import |
| [BLOCKING] CC-001 Contract closure | schema 拒绝未知字段/隐式 target/effect；obligation census 覆盖 R-001 全 16 域 | `test-controlled-change-contract --all --obligation-census` |
| [BLOCKING] CC-002 One truth | v2 journal 是v2唯一可写truth；projection独改不可推进；v1 raw evidence不被吸收/改写 | state projection-tamper + migration byte-identity |
| [BLOCKING] CC-003 Admission/required ordering | protected surface无witness也需PREPARE_REQUIRED；required未durable不可active；required异常两端deny | admission pre-witness + state/harness |
| [BLOCKING] CC-004 Generation/idempotency | stale generation、replay、duplicate attempt 不重复 effect | state replay selector |
| [BLOCKING] CC-005 Scratch-only worker | worker writable root 不含 live/common-dir/external；不能证明则禁止委托/controller | repo-files sandbox + orchestration role fixture |
| [BLOCKING] CC-006 Exact delta | create/update/delete/rename/symlink/mode 全 census；unrelated dirty WIP byte-identical | repo-files all-kinds/WIP |
| [BLOCKING] CC-007 Dual parity | Claude/Codex语义事件projection verdict/reason digest 100%一致；registration/trust变化用fresh sessions | fresh semantic harness-cases |
| [BLOCKING] CC-008 Fail closed / one writer | v1异常保持既有deny；v2 parse/read/timeout/malformed deny；direct target writer永拒，只有advance adapter写 | harness negative + single-owner mutation |
| [BLOCKING] CC-009 Concurrency | v1 single-flight；v2 one manifest/op、disjoint ACTIVE、overlap busy、无lost append/deadlock/leak/age-steal | claims scheduler + parallel append/crash |
| [BLOCKING] CC-010 Recovery uniqueness | 每一 crash boundary 只有一个合法 next action | state crash model |
| [BLOCKING] CC-011 Unknown freeze | effect unknown 后无 retry/compensate/tail effect | effect-host + Git response loss |
| [BLOCKING] CC-012 Personal ownership | 只 exact path；reverse 仅 current==owned postimage；receipt 无 content/secret | external-files matrix |
| [BLOCKING] CC-013 Git isolation | shared index、HEAD、main 不变；commit OID/private ref exact | Git local fixture |
| [BLOCKING] CC-014 Git remote CAS | literal identity/full ref/FF proof/exact expected-old；禁止 +/empty lease/default origin | Git malicious config matrix |
| [BLOCKING] CC-015 Migration reversibility | exact v1-protected bundle/pre/post/reverse；DRAIN_V1→fresh→v2；失败回drain/previous | migration/lifecycle drill |
| [BLOCKING] CC-016 Version compatibility | raw v1 reader + v2 current/previous receipt/非终态可读恢复；unknown major deny | v1-compat + lifecycle matrix |
| [BLOCKING] CC-017 Role/approval separation | worker/EA不能call/mint/advance；Orchestrator不能widen/代批；top-level request+gate evidence单向绑定 | orchestration approval/role matrix |
| [BLOCKING] CC-018 Trigger containment | protected pre-entry bites；readonly/plan/downstream/owner data exempt；graph无新node | admission + orchestration trigger/git diff |
| [BLOCKING] CC-019 Privacy/evidence split | secret/body/URL query不入证据；private 0600；public redacted；prepublish receipt与postpublish attestation分离 | evidence schema/privacy scanners |
| [BLOCKING] CC-020 Mutation strength | 删除legacy-drain/pre-entry/direct-writer-deny/CAS/hash/gate/unknown-freeze任一控制使唯一test红 | verifier mutation mode |
| [BLOCKING] CC-021 Freshness | registration/trust/runtime 变更必须 fresh Claude+Codex，不接受同进程 mock | fresh evidence manifest |
| [BLOCKING] CC-022 Rollout evidence | 每surface至少20次shadow、3次recovery、false-positive阈值、parity满足Gate S | rollout verifier + human ledger |
| [BLOCKING] CC-023 Evidence vocabulary | writer/renderer/validator共享状态词；PUBLISHED只属attestation；loader boundary不由transaction state推导 | receipt-schema + validator mutation tests |
| [WARNING] CC-W01 Performance | Foundation 中位时延/交互满足 K-01 | shadow metrics |
| [WARNING] CC-W02 Optional adapter dark | personal/Git 未获 surface Gate S 时保持 deny，不阻塞 repo Foundation | policy projection |

### 21.1 Verification layers

1. **Pure unit**：contract canonicalization、policy、state model、resource key、receipt redaction。
2. **Filesystem integration**：temp root、file kinds、fsync/rename/crash、dirty WIP、linked worktree。
3. **Migration/legacy**：raw v1 terminal/nonterminal/invalid fixture、DRAIN、零 authority import、byte identity、evidence split。
4. **Harness conformance**：同一 semantic corpus经真实 Claude/Codex adapter；pre-entry/direct-writer/active负面路径fail closed。
5. **Concurrency scheduler**：16 workers、random order、parallel append lost-update、kill-at-boundary、PID reuse、no-age-steal。
6. **Mutation**：逐个移除legacy drain/pre-entry/direct-writer deny/CAS/hash/gate/unknown freeze，必须有唯一test杀死。
7. **Git fixture**：operation index、`commit-tree`、private ref、local bare remote、恶意 config、response-loss readback。
8. **Lifecycle**：v1→DRAIN→v2/reverse、N→N+1、corrupt bundle、previous recovery。
9. **Shadow**：每个申请promotion的surface至少20次真实低风险framework mutation；至少3次故障注入恢复。
10. **Publication shadow**：只有 Gate R 后，在 dedicated non-production remote/ref 做一次真实 fixture；不能使用当前业务 remote/ref。
11. **Independent quality gate**：复算 source/evidence SHA、全 BLOCKING assertions 和范围，不能静默应用修复。

### 21.2 Quality criteria

- Correctness：16 域每域至少一个 assertion；state/crash model 无歧义。
- Safety：safety review 从 `REFUTED` 起，以 exact tests/边界翻案；unknown 不伪装为 failure/success。
- Architecture：三个 public entry；没有 policy duplication、global registry、dynamic plugin 或 Git core coupling。
- Maintainability：每个adapter可删；v1 compat可被隔离但只有Gate G证明retention/recovery不再需要后才能归档，绝不随升级清理。
- Parity：Claude/Codex semantic verdict 100% 一致，差异只在 adapter。
- Scope：implementation diff 只能覆盖 U-block Files；新增文件必须回 `NEEDS_CONTEXT`。
- Usability：Foundation 不额外重复问；Standard gate 只呈现风险 delta。
- Evidence：所有结论可由 command/readback/receipt 复算，不以 agent 自报完成替代。

---

## 22. 回滚、恢复与发布分层

| 失败阶段 | 回滚单位 | 机械条件 | 保留证据 |
|---|---|---|---|
| Gate M | 无写入可回滚 | read-only census失败 | raw v1/evidence digest与blocking verdict |
| Wave 1–2 scratch | 整个 candidate bundle | 尚未 live apply | compiler/test failure log + bundle digest |
| v1-protected migration apply | exact file reverse | current==owned postimage | Gate B、v1 manifest、pre/post/reverse、fresh verdict |
| Launcher pointer | v2→DRAIN_V1/previous CAS | expected current bundle SHA | corrupt bundle与切换 journal |
| Raw v1 state/evidence | **不回滚、不改写** | legacy owner保留 | witness/receipt/index/pre/post publish SHA |
| Repo apply | per-resource reverse/roll-forward | exact pre/post ownership | partial journal + verification |
| Resource claim | exact owner release | owner dead + generation/recovery approval | claim owner/attempt/start identity |
| External file | same-dir reverse | current==owned postimage | redacted target + backup pointer |
| Local Git publisher | temp index/private ref cleanup | exact owned index/ref OID | tree/commit/ref receipt |
| Remote Git | **不自动回滚** | 只 readback/reconcile | intent、expected-old/new、remote observation |
| Policy rollout | mandatory→explicit→shadow | Gate S rollback decision | metrics与触发原因 |
| High-assurance | 不在本计划 | Gate H 新 plan | incident/TCB evidence |

恢复永不通过清日志、改 generation、删 required witness 或覆盖外部漂移来“恢复可写”。当系统不能证明 ownership 或唯一下一动作时，正确结果是 `NEEDS_CONTEXT` / `BLOCKED`。

---

## 23. 实施迁移路线与停止线

### 23.1 从六 Skill MVP 到全量蓝图

| Installed v1 输入 | v2 归属 | 迁移动作 |
|---|---|---|
| strict manifest/tuple/CAS | U-001 + U-004 | 冻结compat；v2泛化kind/identity并保留exact denominator |
| raw required/active/aggregated receipt | U-001 + U-003 | 原样保留给v1 reader；v2新namespace/journal，不原地转换 |
| v1 repo-global single-flight | U-003 + U-005 | drain期间维持；v2 only disjoint ACTIVE + linearizable append |
| harness direct Write/Edit/apply_patch | U-003 + U-004 + U-007 | v1 drain保留；v2 activation撤销，repo adapter成为唯一writer |
| descriptive YAML policy | U-001 + U-003 | 变为runtime实际加载且digest-bound executable policy |
| v1 non-frozen EFFECT_UNKNOWN history | U-002 + U-007 | 仅历史 evidence；v2 UNKNOWN冻结DAG tail |
| exact bootstrap/fresh gates | U-003 | 继承算法，改为v1-protected DRAIN/side-by-side migration |
| task-specific personal cutover | U-008 | postimage作baseline、旧backup owner保留；提取通用算法，不重跑 |
| publication result/evidence | U-009 | 作为failure/fixture要求；重新实现adapter，不重放completed authority |
| VERIFIED receipt→local PUBLISHED overwrite | U-001 + U-011 | 拆成immutable prepublish receipt + referencing postpublish attestation |
| validator只接受VERIFIED / loader overclaim | U-001 + U-011 | 同源状态词 + typed loader evidence；Gate F前闭合 |
| non-goal daemon/capability/global lease | Standard 继续不采用 | 只有 Gate H 新 plan 可重开 |

v1 已通过 review 的结论在其 frozen selector/hash/failure evidence范围内继续有效；不能自动证明v2。当前 dirty/diverged checkout只用于read-only recon：implementation必须在Gate M选择干净隔离checkout并绑定exact baseline，不能把本Session的“不pull”解释成未来可忽略upstream。

### 23.2 Promotion sequence

1. **Current v1 retained**：现有single-flight guard/controller继续工作，不先降级。
2. **DRAIN_V1 + v2 dormant**：拒绝新prepare；legacy exact recovery only；v2只跑fixtures。
3. **v2 explicit**：Gate F后只对明确operation启用，首笔是低风险repo fixture；v1 reader持续可用。
4. **v2 shadow per surface**：记录pre-entry/policy verdict，不阻断尚未mandatory的surface。
5. **Protected-surface mandatory**：至少20次shadow+3次recovery后，Gate S只提升controlled-change自身stable entry/policy/controller/bootstrap。
6. **Standard explicit adapters**：并发/external/Git各自启用；personal/Git始终逐operation Gate E/R，不自动mandatory。
7. **Broader runtime surfaces**：每个surface重新累计证据/Gate S；不继承首批promotion。
8. **Stop**：Standard稳定后不继续daemon/capability/OS service/network platform。
9. **Gate H**：真实进入条件命中才开新的High-assurance plan；本计划不得被解释为预批准。

### 23.3 Implementation approval gate

本文件及其 review ledger 全通过后，状态只能到：

```text
READY_FOR_APPROVAL
Gate P: WAITING_FOR_EXPLICIT_USER_APPROVAL
Authorized effects: NONE
Next legal action: user approves/rejects/requests plan revision
```

即使 Gate P 通过，未来 implementation session 仍必须先重新 preflight：核验最终 plan SHA、选择clean isolated checkout、common-dir/worktree identity、Files preimages、current harness versions 和 Gate M/B 输入。任何漂移都 `NEEDS_CONTEXT`，不依赖本规划时的现场快照继续执行。

---

## 24. 最终同 SHA 审查协议

1. 先冻结 `FINAL-MASTER-PLAN.md` 的 SHA-256。
2. architecture/maintainability、safety（默认 `REFUTED`）、flow/harness/Claude-Codex parity、Plan Agent contract 四个独立 reviewer 均复算并声明同一 SHA。
3. 任一 FAIL 只修对应问题块；保留 U-ID，不重编；生成新 SHA 后重跑所有受语义影响的 reviewer。若 plan 任意内容改变，保守视为四类 reviewer 均需重新签。
4. 四类 PASS 后把状态从 `CANDIDATE_UNDER_REVIEW` 改为 `READY_FOR_APPROVAL`；该改动产生最终 SHA，因此必须对最终 SHA 完成同样四类重签。
5. quality gate 最后读取最终 plan SHA 和 `REVIEW-LEDGER.md`，核验 9 字段、Wave DAG、16 域、scope、所有 verdict；它只出 PASS/FAIL，不修文件。
6. 本 Session 禁止写 memory/eval runtime，因此 quality envelope 在 ledger 标 `NOT_RECORDED_BY_SCOPE`，不得声称已写 `record_eval.py`。
7. ledger 可在 plan SHA 冻结后追加，因为它不是 plan 内容；但 ledger 必须自报自己的最终 SHA。
8. 全 PASS 后停在 Gate P，不启动 U-001。

## 25. 当前状态

本方案当前处于 `CANDIDATE_UNDER_REVIEW`。在 §24 的全部同 SHA 审查完成前，它没有 implementation authority；审查完成后只允许把状态改为 `READY_FOR_APPROVAL` 并停在 Gate P。

<!-- FILE_END: FINAL-MASTER-PLAN.md -->
