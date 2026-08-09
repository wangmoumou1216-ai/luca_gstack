# mattpocock/skills 自进化 Cycle 2 — 最终执行方案

> 状态：`FINAL`  
> 日期：2026-08-09  
> 性质：luca_gstack 框架/meta 任务，不是 muse 产品任务；因此产物固定在本 `framework-audit/` 目录，不写活动项目 `/Users/luca/Desktop/项目/X/docs/`。  
> 本文是唯一执行权威。`candidate-handshake-plan.md`、此前红队、审计稿与研究稿只作证据；冲突时以本文为准。  
> 用户终局指令：不再开新红队或 judge。本方案的终局由确定性 handoff gate 判定；实施阶段既有 quality/safety gate 与真实人类门仍保留。

## 0. 最终结论

这次不是把 mattpocock/skills 整包搬进 Luca，也不是新增一套平行 Skill OS。最终动作是：

1. 吸收 10 个经过适配裁决的上游行为；保留 18 个 Luca 已有且更成熟的能力；拒绝 27 个不适配行为。
2. 19 个 DEFER 经过价值与证据双门复判后，**当前晋升 0 个**。优先级为 P1 决策问卷、P2 逻辑原型、P3 TDD 接口词汇指针；三者进入现有 gap → scout → FUSION 管线，不新增平行状态机。
3. 更新两个现有共享 skills：`systematic-debugging`、`tdd`；把 `codebase-design` 和安全版 `resolving-merge-conflicts` 做成 Claude/Codex 共用真身；`teach` 保持 Claude 个人显式调用，不进入 Luca 项目路由。
4. 不新增产品 workflow 节点。调试、TDD、模块设计、冲突处理属于执行时语义命中或内部引用；Workflow 仍仅在用户主动选择流程时启用。
5. 补齐 Luca 自有运行层：项目 pin 事务、Codex patch target 解析、双 harness 原生 agent 角色、注册闭包、DEFER 重访消费者、可回滚激活。

HEAD 74 的最终决策保持：`ADAPT 10 / KEEP 18 / DEFER 19 / REJECT 27 / QUARANTINE 0`。总审计宇宙保持 `197 adopted + 50 controls + 74 HEAD = 321`，双 harness 验收分母为 `321 × 8 = 2,568`。

## 1. 权威、边界与冻结输入

### 1.1 权威顺序

1. 执行 Session 中用户最新的明确指令。
2. 当前仓库的 `AGENTS.md`、`CLAUDE.md`、安全/项目门。
3. 本文。
4. `final-execution-manifest.json` 与 `defer-promotion-register.json`。
5. `decision-map.json`、`harness-matrix.yaml`、`architecture-decisions.md` 等审计证据。
6. `candidate-handshake-plan.md` 及历史红队稿，只作源材料，不再拥有终局门。

### 1.2 冻结身份

| 对象 | 值 | 执行规则 |
|---|---|---|
| canonical repo | `/Users/luca/Desktop/项目/muse/lucagstack` | 唯一实施源仓。 |
| Luca HEAD | `dce92e6b8c91c617d086ac044e90187b68325fc6` | E0 重验；若相关面已变，生成 delta，不静默套旧计划。 |
| upstream HEAD | `84fdeffd12f2ee307994d1eb6feb48173b6e0502` | 本轮上游内容真值。 |
| stale checkout | `/Users/luca/Desktop/luca_gstack` @ `3f2caad60ec2aa085b87e01db98c852491b53edf` | 只读参考；不 pull、不对齐、不写。 |
| candidate Plan SHA | `1964e44d150001aa10604b9abd6763792269c24e4995fadd6d4df737c289052c` | 只作来路证据。 |
| atomic manifest SHA | `69af68294271995a4f130541698b87f65f10f59bd1f956212e69125dfa7afb48` | 321 宇宙一手清单。 |
| decision map SHA | `f76056e4a7d9c510d4c4a0e79fc8dea6e2b3c7dae312aa4a54d4ce17d9f4967b` | 每原子唯一决策。 |
| harness matrix SHA | `c0ddd7da94389ab20e50461abe8bcc8fd79c8164fef1cf71f6b17fe22dd548cc` | 2,568 格合同。 |
| architecture SHA | `4134996ac6c131f0b919b639537013406272ef91c3763bf24ec131187393a3db` | 架构证据；本文对过度 TCB/旧 checkout 对齐方案作比例化收敛。 |

### 1.3 不可越权项

- 不整包安装 mattpocock/skills，不让 upstream HEAD 自动覆盖 Luca 真身。
- 不改 `framework/`；不碰 muse 7 tools、产品 `/Users/luca/Desktop/项目/X/docs/`、当前用户 dirty/untracked 文件。
- 不自动修改 `/Users/luca/Desktop/luca_gstack`。
- 不使用 `git reset --hard`、`git clean`、广泛 `git add .`、自动 stash、自动 push。
- 不把 DEFER 的优先级误写成“已晋升”；不由脚本自动改变 gap status、创建 skill 或开放 route。
- 全局 skills 的交换必须在 G-ACTIVATE 后，按单一目录 CAS/备份/原子 rename 执行；失败先关 route，再逆序恢复。

## 2. 人话版：到底改哪里

### 2.1 会更新或迁移的能力

| 能力 | 最终动作 | 用户如何命中 | 是否进 Workflow | 原因 |
|---|---|---|---|---|
| `systematic-debugging` | 更新现有共享 skill，修复示例/日志可能暴露凭据和身份值；统一七输出面脱敏 | bug、报错、测试失败、异常行为的既有语义/关键词路由 | 否 | 横切调试纪律，应在出问题时命中，不是一个阶段节点。 |
| `tdd` | 更新现有共享 skill 的本地引用/评审出口；TDD→codebase-design 指针继续 DEFER | 写测试、测试先行、red-green-refactor 的既有 route | 否 | 是实现纪律；可由任务语义或宿主执行阶段触发。 |
| `codebase-design` | 把 Claude 现有目录迁到 `~/.agents/skills/codebase-design` 作为共享真身，Claude 目标改软链；补 Codex 可达性和嵌套引用测试 | 模块接口、seam、deep module、可测试性设计的现有 route；code-recon/tech-spec 可内部引用 | 否 | 这是词汇/设计 primitive，不拥有独立项目流程。 |
| `resolving-merge-conflicts` | 先隔离当前“永不 abort、自动 stage/commit/continue”的危险版本，再用安全适配版作为共享真身 | 只在真实 merge/rebase conflict 下直调 | 否 | 冲突处理是罕见执行态；每个 abort/stage/commit/continue 都是人类门。 |
| `teach` | 保留 Claude 个人显式调用；写根改为专用 `$LUCA_TEACH_ROOT`，不再默认当前目录 | 仅用户明确点名 `teach` | 否，Codex 也不自动注册 | 它是个人学习工作区，不是产品中立 Luca 流程，也无需强造双端对称。 |
| `skill-authoring` | 更新现有 doctrine 和 FUSION 指针/检查，不新建 skill | skill 创建/修改流程内部读取 | 否 | 它是治理真值，不是用户任务入口。 |

### 2.2 会更新的 Luca 运行层

- 项目 pin：`switch/new` 只有在 links/state 全部成功后才提交 session pin；失败保留旧 tuple。
- Codex patch：只解析 patch control header 的真实目标，不再扫描 body 字面量，也不把 `apply_patch` 冒充 Bash。
- Agent parity：Codex 增加 `plan-agent`、`work-agent`、`oracle` 原生定义；沿用现有 `quality-gate`，reasoning effort 从 `model-routing.yaml` 投影，不写死模型名。
- 路由闭包：只补现有 `skill-routing-map / input-modes / optional-workflow-graph / AGENTS / CLAUDE / registration checker` 的一致性；不另建路由器。
- 演进闭包：在现有 `gaps-register + scout + FUSION` 上增加 DEFER 的优先级与到期消费者；不另建晋升状态机。
- 融合/激活：把 FUSION 的破坏性 `reset --hard` 回滚改为“merge 前保留隔离分支，merge 后 clean-tree 精确 revert；dirty 时停下”；全局 skill 用用户级原子换入，无 root/launchd/broker 新基建。

## 3. DEFER 价值排序与晋升裁决

详细机器真值见 `defer-promotion-register.json`。

| 优先级 | 家族 | 原子 | 价值 | 当前证据 | 是否现在晋升 |
|---|---|---:|---|---|---|
| P1 | 决策问卷 | 8 | 高；把挂在他人处的待决转成异步回收制品 | 有邻近实例，但无实际具名收件人、无明确 needs-back | 否 |
| P2 | 逻辑原型 | 10 | 高潜力；把状态逻辑验证从视觉精修中拆出 | 只有“竞品缺真实逻辑”的研究反例，无具名 logic-only 任务 | 否 |
| P3 | TDD 接口词汇指针 | 1 | 中低；窄幅减少 seam 词汇歧义 | 无 seam 失败样本，且 codebase-design 尚未双端共真身 | 否 |

结论不是“这些能力没价值”，而是“现在还没有足够真实输入去永久增加框架表面积”。本 Plan 晋升的是**重访能力**：让高价值 DEFER 能按优先级被现有月度 scout 看见，在显式证据齐备时输出 `READY_FOR_HUMAN_ADJUDICATION`；最终仍由人决定是否做一次性 pilot。

## 4. L0 / L1 / L2 执行索引

### L0 — 阶段地图

| Phase | 目标 | 入口 | 出口 | 人类门 |
|---|---|---|---|---|
| E0 | 最终包与源身份预检 | 当前 canonical checkout | `PACKAGE_VERIFIED` | G-PACKAGE：只批准精确 allowlist package commit |
| E1 | 危险 resolver containment | package commit 的新隔离 worktree | `RESOLVER_CONTAINED` | G-CONTAIN：只批准全局旧 resolver 换 fail-closed stub |
| E2 | 双 harness 基座 | E1 PASS | `HARNESS_FOUNDATION_PASS` | 无新增门；只改隔离 worktree |
| E3 | 能力与治理适配 | E2 PASS | `CAPABILITY_GOVERNANCE_PASS` | teach 写根/DEFER 均不激活 |
| E4 | 注册、路由、Workflow 闭包 | E3 PASS | `ROUTING_CLOSED_PASS` | 无新 workflow 节点 |
| E5 | FUSION v2 与隔离激活演练 | E4 PASS | `REHEARSAL_PASS` | 不写 live global |
| E6 | 321/2,568 全量验收 | E5 PASS | `ACCEPTANCE_PASS` | G-ACTIVATE：展示 exact targets/hash/rollback |
| E7 | live cutover、复验、记录 | G-ACTIVATE | `EVOLUTION_VERIFIED` | 每个危险 Git/全局动作仍服从真实审批 |

### L1 — 依赖 DAG

```text
E0: DEV-001 → TST-001 → G-PACKAGE
G-PACKAGE → fresh worktree
E1: DEV-002 → TST-002 → G-CONTAIN → containment read-back
E2: DEV-003 → TST-003 → DEV-004 → TST-004
E3: DEV-005 → TST-005
    DEV-006 → TST-006
    DEV-007 → TST-007
    DEV-008 → TST-008
    DEV-009 → TST-009
E4: DEV-010 → TST-010
E5: DEV-011 → TST-011
E6: DEV-012 → TST-012 → G-ACTIVATE
G-ACTIVATE → E7 live swap → fresh-session read-back → adoption records
```

`TST-NNN` 必须由没有编写对应 DEV 变更的独立验证上下文运行。任何 BLOCKING assertion 失败时不进入下一任务；同一问题三次失败则 `BLOCKED`。

### L2 — 文件与 owner 总表

| Owner | 允许写的主要文件/目标 | 禁止面 |
|---|---|---|
| DEV-001 | 本 cycle audit package、exact allowlist package commit | 任何行为面、其它 untracked/dirty |
| DEV-002 | resolver stub/quarantine descriptor；G-CONTAIN 后两个 global resolver target | route 开放、安全版激活 |
| DEV-003 | project substrate/scope guard/project scripts/tests；Codex patch adapter/parser/lease | `framework/`、产品 docs |
| DEV-004 | Claude/Codex plan/work/oracle 定义、agent parity checker | 写死模型名、伪 native receipt |
| DEV-005 | shared systematic-debugging candidate、redaction verifier | 原始 secret/identity 落盘 |
| DEV-006 | shared codebase-design candidate、3 nested refs、parity tests | 新 workflow、第二份真身 |
| DEV-007 | safe resolver candidate与 adversarial fixtures | 自动 abort/stage/commit/continue |
| DEV-008 | Claude teach candidate与专用 write-root tests | Codex/project/global route |
| DEV-009 | skill-authoring、gaps/scout/defer checker、TDD本地引用、FUSION回滚 | 自动 status/自动晋升/新 DEFER skill |
| DEV-010 | routing/input/workflow /Users/luca/Desktop/项目/X/docs/checkers 的现有表面 | 平行 router、DEFER route、teach Codex route |
| DEV-011 | FUSION v2 journal/CAS/rehearsal scripts | root/launchd/broker/live targets |
| DEV-012 | acceptance runner、matrix receipts、landing manifests | 自签测试、缩小 321/2,568 分母 |

## 5. 断言矩阵

| ID | Given / When / Then | Proof |
|---|---|---|
| ASSERT-001 | 最终包进入 E0；逐成员核 hash；必须全部存在且 `verify-final-handoff.mjs` 输出唯一 PASS token。 | final bundle checker |
| ASSERT-002 | 当前 dirty/untracked 存在；准备 package commit；cached path 集必须与 manifest allowlist exact-set 相等。 | `git diff --cached --name-only` exact comparison |
| ASSERT-003 | stale checkout 存在；全流程运行；其 HEAD/tree/status 必须不变。 | pre/post read-only tuple |
| ASSERT-004 | resolver 当前含 `never --abort` 与自动 stage/commit；G-CONTAIN 执行后；Claude/Codex 直达都只能得到 fail-closed stub，旧真身仅在不可发现备份。 | direct invocation + target hash |
| ASSERT-005 | 项目 switch/new 在任一边界失败；执行事务；session pin 和 link/state tuple 必须完整保留旧值。 | fault-every-boundary + concurrency |
| ASSERT-006 | Codex patch body 含伪路径；adapter 处理；只对 control header target 调 guard，body byte hash不变，malformed/move/escape fail-closed。 | native event + byte comparison |
| ASSERT-007 | 四 logical roles；Claude/Codex 调用；每端都产生 native plan/work/oracle/quality-gate edge，定义与 effort 投影一致。 | fresh native traces |
| ASSERT-008 | debug canary 在 freeze 后由 tester 生成；运行调试流程；stdout/stderr/transcript/artifact/handoff/final/receipt 均零原值、编码或分片命中。 | seven-surface scan |
| ASSERT-009 | codebase-design 三处 nested refs；双端执行；均解析到同一共享真身 tree hash，不启动第二 workflow。 | inode/tree + invocation trace |
| ASSERT-010 | merge/rebase/rename/modify-delete 冲突；运行安全 resolver；任何 abort/stage/commit/continue 前均停下等待真实 user turn。 | adversarial repos + turn receipts |
| ASSERT-011 | teach 被显式调用；创建制品；只写 `$LUCA_TEACH_ROOT`，Codex 和项目路由均不存在。 | allowed-root scan + absence tests |
| ASSERT-012 | 19 个 DEFER；运行 readiness checker；未提供显式证据时 0 READY，MET 时按 P1/P2/P3 只输出待人裁，不改 status/route/skill。 | mutation tests + register exact set |
| ASSERT-013 | standalone/workflow 判据；运行 route checker；debug/TDD/design/conflict 都不成为 workflow 节点，现有 route 语义可达。 | routing/input/graph parity |
| ASSERT-014 | 任一注册面被删除；运行现有和新增 checker；必须非零。 | hermetic mutation suite |
| ASSERT-015 | FUSION 隔离演练在每个写边界注错；事务要么零写，要么逆序恢复 exact old hash；禁止 reset/clean。 | fault matrix + journal replay |
| ASSERT-016 | 321 原子矩阵；双端四相位验收；必须 321/321、2,568/2,568，DEFER/REJECT 没有新 surface。 | acceptance summary |
| ASSERT-017 | G-ACTIVATE 前；检查 live global/Git；除 G-CONTAIN stub 外无 candidate 激活或 canonical behavior commit。 | authority diff |
| ASSERT-018 | live cutover 完成；fresh Claude/Codex session 复验；所有 route/直调/nested ref 与 pins/adoption/benchmark 记录一致。 | fresh-session read-back |

## 6. DEV / TEST 任务卡

### DEV-001 — 最终包物化与隔离执行根

- Goal：让下一 Session 使用的所有计划、证据、fixture、checker 都进入可复现 Git 基线。
- Inputs：`final-execution-manifest.json` 的 `package_allowlist`、`final-source-bundle.sha256`、当前 repo tuple。
- Files：只允许本 cycle 目录内 manifest 列出的文件。
- Steps：运行 final checker；记录 canonical/stale checkout tuple；展示 exact allowlist；等待 G-PACKAGE；只 stage exact paths 并提交一个 package-only commit；从该 commit 创建新的临时 worktree 与独立临时 HOME。
- Output：`PACKAGE_COMMIT`、fresh worktree path、preflight receipt。
- Rollback：G-PACKAGE 前零 Git 写；commit 后如需撤销只创建新 revert commit，不能 reset。worktree 可保留待人工处理，不自动删除。

### TST-001 — 包完整性与污染隔离

- Assertions：ASSERT-001/002/003。
- Test：重跑 final checker；cached exact-set；从 package commit 的新 worktree 逐文件读回；确认 unrelated dirty/untracked 不在 commit；确认 stale checkout tuple 不变。
- PASS：`PACKAGE_VERIFIED` 且 `PACKAGE_ISOLATION_PASS`。

### DEV-002 — resolver 最小安全隔离

- Goal：在其它实现开始前切断当前危险 resolver 的直接可达面。
- Files：隔离 worktree 内 stub/descriptor/checker；G-CONTAIN 后仅 `~/.claude/skills/resolving-merge-conflicts` 与 `~/.agents/skills/resolving-merge-conflicts` 两目标及时间戳备份。
- Steps：冻结 old tree/hash、stub/hash、backup target、两端 target；独立 tester 先证明 stub 只报告状态和请求人工选择；等待 G-CONTAIN；逐目标 CAS 检查后原子 rename，旧真身移到不可发现备份。
- Output：containment journal、pre/post hashes。
- Rollback：首个 swap 前失败零写；开始后只 roll-forward 到两端 stub/absent。禁止重新开放旧危险真身。

### TST-002 — containment 穿透测试

- Assertions：ASSERT-004/017。
- Test：Claude/Codex 直接调用、route-guard、symlink/replace/race 负例；确认旧命令不能被执行。
- PASS：`RESOLVER_CONTAINED`。

### DEV-003 — 项目事务与 Codex patch 合同

- Goal：关闭 pin 预写与 patch body 误判两个框架基座缺口。
- Files：`.claude/hooks/lib/project-substrate.mjs`、project guards/scripts、`.codex/codex-hook-adapter.mjs`、新 patch-target parser/write lease、对应 tests/verifiers。
- Steps：先写失败 fixture；把 pin commit 放到 links/state read-back 之后；给同 session owner-token 加 lease；让 adapter 保留 `apply_patch` 真实语义并逐 header target 合成 Write 检查。
- Output：两个最小实现 commit，shared-file ownership 先 project 后 patch 串行交接。
- Rollback：只 revert 精确实现 commit；parser 失效时 patch fail-closed，Bash/read-only 不受影响。

### TST-003 — 项目/patch 故障矩阵

- Assertions：ASSERT-005/006。
- Test：现有 project tests + invalid/compound fixtures + boundary/concurrency；patch literal/multi-file/malformed/move/symlink/native Codex event。
- PASS：`PROJECT_TRANSACTION_PASS` 与 `CODEX_PATCH_PASS`。

### DEV-004 — 双 harness 原生 agents

- Goal：让 Plan/Work/Oracle/Quality Gate 在 Claude 与 Codex 都有可真实派发的逻辑角色。
- Files：`.codex/agents/plan-agent.toml`、`work-agent.toml`、`oracle.toml`，必要的 Claude logical-role指针、`scripts/check-agents-parity.mjs`、`scripts/verify-codex-wiring.mjs`。
- Steps：复用 Claude `plan-agent.md`、`work-agent-template.md` 和 oracle 判定合同；Codex definition 必须读取同一权威文档；effort 只从 `model-routing.yaml` 投影；stdin 明确 EOF。
- Output：四角色 parity 表与 native traces。
- Rollback：新增 definitions 先 dormant，无 route 指向；失败 revert 精确文件，保留现有 quality-gate。

### TST-004 — agent 活体与伪回执攻击

- Assertions：ASSERT-007。
- Test：每端四角色 fresh child；missing role、self-report、replay、伪事件、错误 effort、结构化输出 schema 负例。
- PASS：`HARNESS_FOUNDATION_PASS`。

### DEV-005 — systematic-debugging 脱敏适配

- Goal：保留根因优先流程，消除命令示例、env、HITL 文本与回执泄漏。
- Files：共享 candidate `systematic-debugging/**`、redactor/helper、security fixtures、verification script。
- Steps：删除/改写会打印身份值的示例；只显示键名+SET/UNSET/类别；所有自由文本在展示前经统一 redactor；未知 canary 只由 tester 持有。
- Output：双端同 tree 的 candidate。
- Rollback：live 激活前丢弃 candidate；激活后如旧版已证实泄漏，关闭 route而不是恢复泄漏版本。

### TST-005 — 七输出面 canary

- Assertions：ASSERT-008。
- Test：公开+tester 私有 canary；原值、base64/URL 编码、分片、跨字段重组；扫描七面。
- PASS：`DEBUG_REDACTION_PASS`。

### DEV-006 — codebase-design 共享真身

- Goal：消除 Claude-only 目录与 Codex dangling nested refs。
- Files：candidate shared tree；最终 `~/.agents/skills/codebase-design` 真身与 `~/.claude/skills/codebase-design` symlink；`code-recon`、`tech-spec`、未来 TDD pointer 三引用的验证合同。
- Steps：保持现有词汇/附录完整；只吸收 harness-neutral wording；先 candidate，再双端直调/嵌套测试，最后随 G-ACTIVATE 原子换入。
- Output：单一 tree hash、三 nested-ref traces。
- Rollback：恢复旧 Claude target并移除 Codex target；不留下两份可编辑真身。

### TST-006 — 共享真身与嵌套可达性

- Assertions：ASSERT-009。
- Test：Claude/Codex direct invoke；code-recon、tech-spec nested invoke；同 inode/tree；无第二 workflow；缺目标/错软链负例。
- PASS：`CODEBASE_DESIGN_PARITY_PASS`。

### DEV-007 — 安全版 resolving-merge-conflicts

- Goal：用“理解意图 + 每个危险动作人裁”替代当前自动完成冲突的危险合同。
- Files：shared resolver candidate、fixture repos、gate protocol、verification script。
- Steps：允许只读侦察与逐 hunk 提案；默认停在 proposal；`abort`、`stage`、`commit`、`continue` 必须分别展示 exact payload 并等待新的顶层 user turn；永不自动 push。
- Output：安全 candidate 与危险动作清单。
- Rollback：candidate失败继续保留 containment stub；绝不恢复旧真身。

### TST-007 — 冲突对抗仓

- Assertions：ASSERT-010。
- Test：merge/rebase、rename/delete、modify/delete、二进制、dirty tree、错分支、伪批准/replay；验证每个动作门。
- PASS：`SAFE_RESOLVER_PASS`。

### DEV-008 — teach 个人写根

- Goal：保留 teach 的个人价值，阻断它把当前项目目录误当教学工作区。
- Files：Claude teach candidate、write-root resolver、isolated HOME fixtures；不改项目 route。
- Steps：要求 `$LUCA_TEACH_ROOT` 为绝对路径且无 symlink escape；缺失时 NEEDS_CONTEXT；`disable-model-invocation` 保持 true。
- Output：Claude-only candidate。
- Rollback：不激活 candidate；原 teach 继续 dormant，不能开放项目 route。

### TST-008 — teach scope absence

- Assertions：ASSERT-011。
- Test：允许根/相对根/symlink/项目 cwd/Codex catalog/route mutation；确认只在用户显式调用后写专用根。
- PASS：`TEACH_SCOPE_PASS`。

### DEV-009 — authoring、TDD 与 DEFER 治理

- Goal：把 skill 手艺、TDD 本地引用、DEFER 重访真正接回 Luca 既有消费者。
- Files：`.claude/skill-os/skill-authoring.md`、`.claude/skill-os/evolution/gaps-register.yaml`、`.claude/workflows/framework-evolution-scout.js`、`scripts/check-defer-readiness.mjs`、`scripts/check-evolution-adjudication.mjs`、`FUSION-RUNBOOK.md`、shared TDD candidate、`package.json`。
- Steps：给三家族写 priority/evidence_required/revisit_when/revisit_status/promotion_target；scout 单独加载 deferred backlog，普通 candidate matching 仍只收 open gap；MET 只产 `deferred_revisit_due`；checker 只读显式 receipt，输出 READY_FOR_HUMAN_ADJUDICATION；修 FUSION destructive rollback；TDD 的悬空 `code-review` 改 Luca `code-hygiene`，codebase pointer继续不写入。
- Output：可消费的 P1/P2/P3 backlog、0 auto-promotion。
- Rollback：revert 精确 repo commit；不得删历史 gap；若 consumer 失败，保持 DEFER 且报警。

### TST-009 — DEFER 晋升负例/正例

- Assertions：ASSERT-012。
- Test：无证据、缺一门、伪 receipt、MET 三家族乱序、status mutation、route/skill mutation、open/deferred 混入 discovery；正例只到 READY_FOR_HUMAN_ADJUDICATION。
- PASS：`DEFER_GOVERNANCE_PASS`，且 `promoted_now=0`。

### DEV-010 — 路由/Workflow/注册闭包

- Goal：让每项能力明确落在 standalone、semantic/internal dispatch 或 explicit-only，不让 Skill/Workflow 漂移。
- Files：只在需要时修订 `skill-routing-map.yaml`、`input-modes.yaml`、`optional-workflow-graph.yaml`、`CLAUDE.md`、`AGENTS.md`、registration/routing/capability checkers。
- Steps：保留已有 debug/TDD/codebase/resolver route；无新增 workflow node；teach 无 Codex/project route；DEFER 三家族零 route/skill/mode；checker 验证六面 exact closure。
- Output：capability integration map 与 mutation suite。
- Rollback：revert 精确闭包 commit；route 缺失时能力标 NOT-DONE，不用散文豁免。

### TST-010 — 自主命中与 Workflow 边界

- Assertions：ASSERT-013/014。
- Test：每能力做 direct、semantic、internal nested、selected-workflow、STOP fallback 五种场景；逐个删除一面验证 checker 会咬。
- PASS：`ROUTING_CLOSED_PASS`。

### DEV-011 — FUSION v2 可回滚激活

- Goal：复用现有 FUSION 管线，增加用户级 skill swap 的 journal/CAS/原子 rename，不建 root broker。
- Files：FUSION runbook、最小 activation script/schema/tests、隔离临时 HOME；live targets 仅 G-ACTIVATE 后写。
- Steps：每个 target 记录 old/new hash、backup、intent、observed；先关闭 route再换 target，全部 fresh verify 后再开放；失败逆序 route-close → target restore → read-back。
- Output：隔离 rehearsal journal、rollback proof、exact cutover descriptor。
- Rollback：使用预留 backup + CAS/atomic rename；Git 用 clean-tree exact revert。禁止 reset/clean/stash 猜修。

### TST-011 — 激活边界故障注入

- Assertions：ASSERT-015。
- Test：CAS mismatch、partial failure、process kill、symlink swap、target drift、read-back fail、route-open fail、journal replay；确认零写或 exact恢复。
- PASS：`REHEARSAL_PASS`。

### DEV-012 — 全量验收与落地包

- Goal：把 321 原子和 Claude/Codex 四相位合同全部跑完，并准备人可审的 live payload。
- Files：acceptance runner、receipts、landing manifest、adoption/benchmark/pin proposed delta；G-ACTIVATE 前不写 live records。
- Steps：生成 321 exact-set；运行 2,568 cells；跑现有 `verify.sh`、项目/route/registration/agent/Codex wiring/evolution checks；保护 Luca 更新后的 baseline；产 exact cutover descriptor 和 rollback descriptor；等待 G-ACTIVATE。
- Output：acceptance summary、live descriptor、fresh-session verification checklist。
- Rollback：G-ACTIVATE 前丢弃 candidate；live 后按 DEV-011 journal逆序恢复，并新增纠正记录，不篡改原回执。

### TST-012 — 最终 acceptance 与 fresh-session 复验

- Assertions：ASSERT-016/017/018。
- Test：321/2,568 exact counts、DEFER/REJECT zero surface、protected paths、双端 route/direct/nested、global tree hash、pins/adoption/benchmark、stale checkout tuple。
- PASS：G-ACTIVATE 前为 `ACCEPTANCE_PASS`；live 后为唯一终态 `EVOLUTION_VERIFIED`。

## 7. 人类门

### G-PACKAGE

执行者必须展示：package allowlist、cached exact-set、commit parent、当前 unrelated dirty/untracked。用户只批准“把 exact cycle2 package 物化为一个 commit”。没有明确批准就停在 `PACKAGE_VERIFIED`。

### G-CONTAIN

执行者必须展示：当前危险 resolver 两端路径/old hash、stub hash、备份位置、只允许的两个 target、失败终态。批准只授权 containment，不授权安全 candidate 激活。

### G-ACTIVATE

执行者必须展示：每个 global target old/new tree hash、route 变更、Git commits、rehearsal/acceptance receipts、逆序恢复步骤。批准只绑定这份 exact descriptor；任何 drift 重新提案。

缺少结构化提问工具时，必须纯文本停下等待真实回复，不能由 agent 代批。

## 8. 实施 Session 的固定读序

1. `AGENTS.md`、`CLAUDE.md`、mandatory startup context。
2. `NEXT-SESSION-PROMPT.md`。
3. `FINAL-HANDOFF.md`。
4. 本文。
5. `final-execution-manifest.json`。
6. `defer-promotion-register.json`。
7. `decision-map.json`、`head-decision-map.json`、`harness-matrix.yaml`、`architecture-decisions.md`。
8. `quick-research-framework-routing-defer-2026-08-09.md`。
9. 只在相应任务前读对应 Luca 真值文件；不要重新 bulk-read 所有 skills。

首条确定性命令：

```bash
node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/verify-final-handoff.mjs
```

如果它不是零退出且不输出 `FINAL_HANDOFF_GATE_PASS`，不得开始实施。

## 9. 完成定义与停止条件

### Plan package DONE

- final docs、manifest、DEFER register、source bundle、verifier 全部存在并互相闭合。
- 19 个 DEFER exact-set、P1/P2/P3、0 current promotion 被机器断言。
- 12 DEV 与 12 TST 成对，18 条 assertion、3 个 human gate 均可枚举。
- 不要求新红队/judge；candidate Plan 被明确降为 source-only。

### Implementation DONE

- E0–E7 全部 PASS，终态只能是 `EVOLUTION_VERIFIED`。
- 321/321、2,568/2,568；ADAPT/KEEP/DEFER/REJECT 决策无漂移。
- Claude/Codex 对共享能力使用同一真身；所有 route、nested ref、explicit-only 边界可验证。
- DEFER 没有被提前激活，但具备按优先级的真实消费者和人裁出口。
- 任何未完成门必须报告 `BLOCKED`、已尝试、剩余人工动作；不得把 rehearsal 或 package PASS 冒充 live DONE。

<!-- FILE_END: FINAL-EXECUTION-PLAN.md -->
