# LucaGStack controlled-change 受控变更全量能力方案

> 状态：`READY_FOR_APPROVAL`（R25，2026-09-04：R24 五项 closure requirement 已收尾，见
> REVIEW-LEDGER.md §8；无架构/U-block/Files/Verification 改动，R23 四类签名原样成立，不需重签）
> 方案日期：2026-08-30；按近期提交审计重基线：2026-09-02；post-seal review 重新打开：2026-09-03；
> post-seal 增量审计闭合：2026-09-04（Asia/Shanghai）
> 任务类型：Deep / framework-meta / plan-only / `NO_PIN`  
> 推荐目标档：**Standard**  
> 当前终点：等待用户对本 SHA 的独立、未来显式 `Gate P APPROVED`（与 09-02 handoff 同款协议）；
> 本状态更新本身不构成、不暗示该批准
> 实施授权：**无**（`READY_FOR_APPROVAL` 在本文档内从未等价于已获批准，见 §5 R21/R23 各处同款声明）

## 0. 执行摘要

本方案把 controlled-change 定义为 LucaGStack 的**变更执行内核**：Plan Agent 决定“做什么”，Orchestrator 决定“按什么依赖顺序调度”，Skill/Work Agent 决定“怎样产出候选”，controlled-change 只负责把已经批准的候选限制成**精确目标、精确 effect、精确前置状态、可恢复状态转换和可核验 receipt**。它既不是 Skill，也不是新 workflow 状态机，更不是第二个项目真值源。

2026-09-02 对 `72bd1f2..0f8cf14` 的 18 个近期提交及随后 `83468c1`、`91ba95a`、`a98d97a`、`516bf6b`、`893d476`、merge `2059ee4` 与 docs-only 报告 `c98f3b9` 完成增量审计。六 Skill MVP 已作为 **controlled-change/v1** 发布于 commit `6aaa1c6511af6845042e9dc541524934ed57bfe9`；这些规划事实绑定不可变 commit/diff 与审查记录，而不绑定会继续移动的 checkout HEAD。81-row 发布 manifest 中已有 8 个 runtime 路径发生合法的发布后漂移，不能再声称 live runtime bytes 等于 `6aaa1c6`。更重要的是，v1 guard 对复合 Bash 命令只分类第一个 Git verb，可使一次 `git-stage` 授权连带放行未批准的 `git push`；并发 one-use effect 消费也不是线性化的。因此 v1 只作为**已安装的兼容/恢复基线**，不是可继续扩展的安全下限：在 Foundation containment 测试杀死这些 mutant 前，禁止新的 v1 Git effect 授权；U-001 containment 只用零 Git/任意 shell effect 的 exact repo subset，Gate N 放行后的迁移也只能经已批准 operation 的 public `prepare/advance`。控制根的规划期只读观测为 `inactive`，两组 terminal witness/receipt 有效；任何实现都必须重做现场 census，不得原地改写 v1 state、receipt 或已发布证据。`83468c1` 的 proposal scanner、`91ba95a`/`516bf6b` 的 route/graph 变更、`a98d97a` 的 self-model复核与 `893d476` 的 memory promotion 都不改 controlled-change state，但审计均 FAIL：scanner存在门控失明/`KILL`子串误报；route生产STOP renderer仍崩溃、礼貌词仍可误派、`.docx`修复测试是假绿且workflow路径未证明输入合同；self-model用局部复核重置全局freshness且不防人工清单漂移；memory batch虽结构闭合，却以agent自报用户代裁跨越人工门，最终promoted reviewer又显示候选自填的`luca`，无法充当可独立验证的批准。`c98f3b9` 只修改审查报告，却把这些未闭合问题宣称为已修；双轴复核均 FAIL。本计划只把上述材料作为不可信现场输入，不把scanner、route verdict/soft candidate/workflow recommendation、self-model freshness、promoted-memory reviewer或该报告当authority、完成证据或implementation依赖。

目标架构选择 **Standard**：

- one-shot transaction kernel，而不是常驻 daemon；
- v1 compatibility reader + v2 append-only durable journal；v2 journal 是 v2 状态、authority、receipt 的唯一事实来源，v1 文件保持原格式只读/原 owner 恢复；
- Claude/Codex 共用同一 schema、policy、manifest、journal 与 projection，仅在 harness adapter 层处理工具协议差异；
- scratch worker 只产候选 bundle，trusted applier 依据 preimage CAS 应用；
- 以短时、资源粒度 claim + CAS 管并发，不用覆盖整个任务生命周期的 repo-global OS lease；
- effect host 使用封闭静态 adapter 表；`repo-files`、`external-files`、`git-publisher` 都是同一 DAG 下的 adapter，kernel 是唯一状态推进者；
- 网络/API/GUI 默认拒绝，直到存在具备 identity、idempotency、readback、reconcile/compensate 合同的具体 adapter；
- 已安装 v1 是 Foundation 的历史兼容/恢复输入；Foundation containment 先关闭已证实的 effect bypass 与证据错绑，v2 Standard 再于兼容门、受保护表面 admission、多 effect、并发或外部 effect 证据达标后逐面启用；High-assurance 只有真实威胁证据达到进入条件后才另立计划。

六 Skill 主计划里的 controlled-change MVP 已成为第一位真实消费者和 Foundation v1，不是全量结论；旧重型方案只作为机制候选库，daemon、签名 capability、全局 authority registry、repo-global whole-task lease、通用 two-phase publisher 均不恢复为默认架构。

2026-09-03 post-seal review 发现，R23 冻结后落地的 `a16d47bc09e8b10ea19cade6d54881b03286239c` 与 `62b6e4f32feb850ba4f8286a7cb9609202b88f6b` 触及本计划的 workflow/route/project-scope/session 只读接口，并新增 `to-tickets` 发布面与 `project-read-grants.mjs` / `project-read.mjs` 传递信任面；现有 R-001–R-017 尚未对这些 delta 作固定范围裁决。与此同时，`REVIEW-LEDGER.md` 的 canonical SHA 声明复算不一致，且输入 handoff bytes 未在仓库中持久化。按 §24.9–§24.10，R23 的历史 verdict 保留但不再构成当前 Gate P 入口；在增量审计明确这些变化只是 Gate M 可吸收的 baseline drift，或更新受影响的架构/锚点/U-block 并完成新 SHA 四类复签前，本计划保持 `CANDIDATE_UNDER_REVIEW`。是否把第七个工程交付能力和 read-grant 链纳入 controlled-change 保护范围属于架构范围裁决，本轮不代替用户或计划 owner 选择。

**2026-09-04 R25 闭合**（完整记录见 `REVIEW-LEDGER.md` §8）：对上述 delta 的固定范围增量审计
独立复现全部线索，额外发现并修复一个更晚出现的生产路径崩溃（route-guard.mjs soft-candidate
渲染，与本节描述的 delta 无关，是后续加固提交引入）。修复落在 commit `46cb0f1`、`9ff30c6`，
均含独立对抗评审与 `verify.sh` 88/0/1(无关) 为证据。用户在本 Session 内明确把 `to-tickets` 与
read-grant 链的 controlled-change 边界裁决权交给本 Session 的技术判断，裁决结果：`to-tickets`
维持在六 Skill v1 保护面之外（未被本轮任何发现触及，与 hook/guard 层无交集）；read-grant 链
维持 orthogonal 定位不纳入保护范围，且已被完全隔离（`READ_GRANTS_ENABLED = false`，三处独立
短路），当前贡献零活跃能力。两项裁决均未触及本计划的目标架构、只读锚点、U-block、Files、
Read List、Verification 或 Gate 顺序，故不生成新 plan SHA，不触发四类独立复签。ledger 自身
完整性（canonical SHA 声明）与原始 handoff bytes 可复算性问题也已在 §8 独立收尾。

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
| 已发布 MVP commit `6aaa1c6511af6845042e9dc541524934ed57bfe9`；tree `c1f7b2f43a1c048852415475eb43be26c377d942` | 历史 commit 含 manifest/CAS、required/active、双端 guard、crash recovery、one-use Git effect与发布结果证据；不含可复用通用 publisher | v1 是不可跳过的兼容/恢复 baseline，不是当前安全证明 |
| 本地 `IMPLEMENTATION-RECEIPT.md` SHA-256 `d2969ad74c47977e29102db1d043d4f035ea1f290163ce9ad14ee8eed9ad5aea` | `state:PUBLISHED`；remote observed commit 与 published commit 一致；shared index/HEAD/local main 未变 | 发布后本地补充事实；不回写已发布 commit |
| `npm run test:controlled-change --silent`（2026-09-02） | 11/11 PASS；现有 suite 没有杀死 compound-Git 与 concurrent one-use 两个 mutant | 保留为回归输入，不得用“11/11”推导无 bypass |
| `verify-codex-wiring --static`（2026-09-02） | static 19 PASS；live L1–L3 因 `--static` 未运行 | 静态接线成立；不得声称 fresh/live parity |
| `controlled-change.mjs inspect`（2026-09-02） | control root `inactive`；两组 valid terminal，无 nonterminal operation | 仅作规划 snapshot；实现时必须重新 census |
| `check:skill-integration-receipt`（2026-09-02） | PASS；但 `PUBLISHED` admission 只检查 40-hex 形状、remote==commit、固定 URL/ref 与 pre==post tuple | 旧 FAIL 已消失，新 gap 是结果欠绑；需证明 commit 存在、single parent/baseline 与 exact path-set |
| `candidate-manifest --verify-at 6aaa1c6`（2026-09-02） | 发布 commit 内 81-row 历史 manifest 可复算；当前 live 有 8/81 drift | 历史 lineage 只从发布 commit blob 核验，不把 live drift 伪装成发布失败 |
| 近期提交审计 `72bd1f2..0f8cf14` | Standards/Spec 两轴均 FAIL：Critical compound-Git bypass；non-linear one-use；Git read probe 可触发 repo-local `core.fsmonitor`；PUBLISHED 结果欠绑；E2 提示被当成 dispatch、二次事件覆盖原任务文本；E1 alias 依赖未 tracked 下游身份 | 所有问题进 Foundation containment / Gate M；不在本 Session 修 runtime |
| 增量提交审计 `0f8cf14..83468c1` | Standards/Spec 两轴均 FAIL：proposal scanner 被不存在的个人记忆目录错误门控；裸 `KILL` 子串误报 `SKILL.md`；新增行为零持久化回归；30 日展示常量重复 | 无 controlled-change 文件/状态变化；由 memory/governance owner 另行修复，本计划不依赖该 scanner、不扩写 U-block |
| 增量提交审计 `83468c1..91ba95a` | Standards `FAIL 1/6`、Spec `FAIL 5/7`：新STOP soft candidate缺`tokens`而生产renderer调用`.join()`导致hook exit 1；`请问/麻烦/帮我`绕过meta抑制；code-recon两条workflow链未证明下游input合同；133-corpus/adversarial证据环境与scorer未冻结 | route/graph原owner另修；Gate M必须重做production-shape与workflow-interface census；U-006只消费attested E3/current request，所有route verdict/hint均非authority且四个anchor保持只读 |
| 增量提交审计 `91ba95a..a98d97a` | Standards `FAIL 4/6`、Spec `FAIL 5/7`：第7个hook补录与7 hooks/6 agents/11 npm/4 truth files/model mirror均复算正确；但局部复核重置全局唯一`updated`，使明确未复核的already-have/gaps/sources过期提醒被压35天；`check:self-model`只比live/generated、不比较人工hooks清单，不能防同类漂移复发 | 只影响治理inventory/fusion-preflight范围，不改controlled-change runtime/state/authority；由evolution owner修复freshness与manual↔generated guard，本计划不依赖其freshness或PASS |
| 增量提交审计 `a98d97a..516bf6b` | Standards `FAIL 1/6`、Spec `FAIL 1/7`：`PRD是啥`仅dry-run STOP，production因`{skill,why}`对`tokens.join()`仍exit 1；`readme.docx.bak`仍误命中docx，而新增“.docx”fixture实际只含pdf、杀不死mutant；礼貌/否定meta与`然后cleanup`仍不闭合 | route owner继续修复；206/206与commit message不得解除Gate M，U-006只隔离消费且不改route/graph anchors |
| 增量提交审计 `a98d97a..893d476` + merge `2059ee4` | Standards `FAIL 2/6`、Spec `FAIL 2/7`：10 promoted+1 rejected及health/谱系结构成立；但人工授权仅由agent reviewer字符串自报，promoted记录把候选reviewer`luca`呈现为最终reviewer；证据有过期/失配，5条无关retrieval telemetry改变统计，revert也不能恢复被gitignore的hot candidates | 两条controlled-change原则只作佐证；promoted memory/reviewer/mattered记录一律非approval/effect authority，memory owner另行取得直接人签与角色闭合，本计划不接管或回滚该commit |
| docs-only 报告审计 `2059ee4..c98f3b9` | Standards `FAIL 1/6`、Spec `FAIL 1/7`：报告宣称route与memory问题已闭合，但production renderer、`.docx.bak`、`然后 cleanup`、礼貌meta与人门归因仍失败/UNKNOWN | 该commit只改另一审查目录的`REPORT.md`，不改controlled-change或其消费接口；报告为non-authority，不触发目标架构重做 |
| `bash scripts/verify.sh`（2026-09-02） | PASS=86, FAIL=0, WARN=1，耗时约 112s | 仅余约 8s/120s agent 预算；U-012 必须先建验证预算门，不能继续串行堆 suite |
| 规划证据冻结策略 | 事实绑定 R-001–R-017 的不可变commit/diff/eval与最终plan SHA；live HEAD/dirty状态只作时间点观测，不是plan签名输入 | 仅当相关接口的新delta推翻已写架构事实时修plan；无关commit/报告/WIP不再导致重签。未来实现仍须在Gate M选择clean isolated baseline并冻结exact preimage |
| project transaction primitives | 已有 proposal/epoch CAS、mkdir lease、O_EXCL、fsync、no-age-steal、恢复测试 | 复用算法，不混同为 controlled-change 状态真值 |
| observability writer / eval recorder | 已有 journal/flock/idempotent audit 的局部实现 | 提取模式，不侵入其现有 owner transaction |
| linked worktree 事实 | 11 个 worktree 共享 object/ref/config，index/worktree bytes 各自独立 | ref/remote claim 必须 common-dir 级；文件 claim 含 worktree identity |
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
| R-011 | 2026-09-02 近期提交固定范围审计 `72bd1f2..0f8cf14` | Standards eval `recent-commits-standards-20260902-72bd1f2-0f8cf14`；Spec eval `recent-commits-spec-20260902-72bd1f2-0f8cf14`；两轴 FAIL 及 scratch mutant/reproduction 必须进入 Foundation/Gate M/U-block 验收 |
| R-012 | 2026-09-02 增量提交审计 `0f8cf14..83468c1` | Standards eval `recent-commit-standards-20260902-83468c1`；Spec eval `recent-commit-spec-20260902-83468c1`；两轴 FAIL，但 diff 不触及 controlled-change runtime/state，故只更新现场基线并明确 scanner 为非 authority/非依赖 |
| R-013 | 2026-09-02 增量提交审计 `83468c1..91ba95a` | Standards eval `recent-commit-standards-20260902-91ba95a`；Spec eval `recent-commit-spec-20260902-91ba95a`；两轴 FAIL；route/graph anchors已变且存在production crash/误派/输入合同/证据复算缺口，U-006只加消费端隔离与外部修复门，不接管原owner修复 |
| R-014 | 2026-09-02 增量提交审计 `91ba95a..a98d97a` | Standards eval `recent-commit-standards-20260902-a98d97a`；Spec eval `recent-commit-spec-20260902-a98d97a`；两轴 FAIL；self-model正确补录guard但全局freshness与manual-inventory回归欠绑，只作non-authority checkout/governance evidence，不成为implementation dependency |
| R-015 | 2026-09-02 增量提交审计 `a98d97a..516bf6b` | Standards eval `recent-commit-standards-20260902-516bf6b`；Spec eval `recent-commit-spec-20260902-516bf6b`；两轴 FAIL；三项route修复仅compound case成立，production renderer/礼貌meta/.docx mutant仍失败，不能解除R-013 quarantine或成为dispatch/authority证据 |
| R-016 | 2026-09-02 增量提交审计 `a98d97a..893d476` 及 merge `2059ee4` | Standards eval `recent-commit-standards-20260902-893d476`；Spec eval `recent-commit-spec-20260902-893d476`；两轴 FAIL；memory谱系结构PASS但人门真实性UNKNOWN、角色归因混淆且稳定事实立即被消费，只能佐证“caller/memory自报非authority”；merge无额外冲突delta，不成为implementation dependency |
| R-017 | 2026-09-02 docs-only 报告审计 `2059ee4..c98f3b9` | Standards eval `recent-commit-standards-20260902-c98f3b9`；Spec eval `recent-commit-spec-20260902-c98f3b9`；两轴均 FAIL；commit只改`framework-audit/2026-09-02-skill-responsibility-audit/REPORT.md`且过度宣称修复，不是runtime、dispatch、approval或completion authority |

所有后续 U-block 的 `Source` 只能引用本表，不得由 implementation agent 自行扩权。若 source 与现场代码冲突，U-block 必须返回 `NEEDS_CONTEXT`。

R-014–R-017不要求 controlled-change 接管 evolution、route、memory 或审查报告 owner 的修复，也不扩大任何 U-block Files；它们只冻结“这些材料不得作为freshness/dispatch/approval/authority证明”的接口约束。后续修复只有在改变controlled-change消费者合同或受保护表面时，才由未来Session做相关路径增量审计；无关HEAD前进不再使本计划失效。

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

更小替代是：**不建设 v2**，只做 Foundation containment：禁止/修复 v1 compound-Git effect 授权，使 one-use 消费线性化，将发布 receipt 与 historical attestation 绑定到真实 commit/parent/path-set，然后保留 v1 只做单操作 repo 变更与 legacy recovery。若 containment 后 20 次真实操作没有出现跨任务恢复、并发或多 adapter 需求，这就是正确停止点。只有出现本节 premise 的真实证据，才进入 Standard；“已有计划”本身不是扩建理由。

这不是文档性建议，而是 **Gate N — Standard Capability Need Evidence**。U-001 完成最小 Foundation containment 并真实运行至少 20 次 repo-only operation 后，Gate N 必须输出一份可复算的 capability vector；门前除 U-001 exact Foundation subset、其 RED fixtures 与只读 evidence 外，**不得生成任何 v2 schema、policy、compat reader、journal、launcher、effect host、adapter 或 v2 test bytes，即使只放在 scratch 也不允许**：

- `N0 CORE=ENTER_STANDARD`：至少命中以下一项且更小 skill-local 修复不足——两次可证明 disjoint 的工作被 repo-global single-flight 阻断；一次真实 operation 需要多 effect/reconcile；或一次 crash/recovery 无法由 v1 给出唯一下一动作。否则 `CORE=STOP_AT_CONTAINED_FOUNDATION`。
- `N-C CONCURRENCY=BUILD`：只在至少两次可证明 disjoint 的真实工作被 single-flight 阻断时成立；否则 `SKIP_DARK`，U-005 不产生 source bytes。
- `N-D DAG=BUILD`：只在至少一次真实 operation 需要两个以上有序 effect/recovery node 时成立；`N-E` 或 `N-G` 为 BUILD 时自动蕴含 `N-D=BUILD`，除此之外不得反向传播。
- `N-E EXTERNAL=BUILD`：只在真实 operation 需要 exact external/personal file effect，且现有 task-specific owner 无法以更小修复安全完成时成立；否则 `SKIP_DARK`，U-008 两个文件均不存在。
- `N-G GIT=BUILD`：只在至少两个不同任务需要相同 publication primitive，或一次真实 publication 出现 response-loss/parent/lease 无法唯一 reconcile、且 task-local publisher 不足时成立；否则 `SKIP_DARK`，U-009 adapter/test 不产生 bytes。

Gate N 的证据面包括 20 次 contained-Foundation operation，以及被 Foundation 明确拒绝或仍由既有 task-local owner 处理的 adjacent request；只记录脱敏 tuple，不为“收集证据”执行 external/Git effect。任何 `N-C/N-D/N-E/N-G=BUILD` 都蕴含 `N0=ENTER_STANDARD`，但 `N0` 不会反向解锁未证明的 capability。所有样本同时要求 median 额外交互 ≤1、运行时间增幅 ≤30%、零 confirmed bypass。若 `N0=STOP_AT_CONTAINED_FOUNDATION`，保留 U-001 修复和 legacy recovery，U-002–U-013 全部不启动；样本不足为 `NEEDS_EVIDENCE`。若 `N0=ENTER_STANDARD` 而子能力为 `SKIP_DARK`，只执行 base U-block；该项只记录为 `gate_disposition=SKIP_DARK`，对应 U-block 根本不实例化、不产生 completion status、不计 PASS、也不进入下游 wait set，不能用 deny stub 或“以后可能需要”偷建代码。

Capability source isolation 是机械合同，不靠命名约定：N-C 只拥有 `resource-claims.mjs`、`concurrency-scheduler.mjs`、`claim-cases.json`、`test-controlled-change-claims.mjs`；N-D 只拥有 `effect-dag.mjs`、`effect-dag-cases.json`、`test-controlled-change-effect-dag.mjs`；N-E 只拥有 `external-files.mjs` 与其 test；N-G 只拥有 `git-publisher.mjs` 与其 test。四者不得修改 base `kernel/state-store/effect-host/policy/git-object-reader/capsule-composer`。Gate F 冻结 base digest 与这些独占路径的 absence map；U-010 是唯一 composition owner，且只生成 operational capsule profile，不接管这些 source owner。

**默认形态偏差**：本案把 `Standard` 写成推荐目标，会把裁决的秤压向“建设通用 transaction kernel”，从而系统性低估只停在 Foundation/no-v2 的价值。相反默认由 architecture reviewer 以“Foundation 已足够、Standard 不应建设”复核，safety reviewer 继续从 `REFUTED` 起步；Gate N 若拿不出逐能力真实证据，反方自动胜出并停止扩建。

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
| K-08 | v1 能安全承载新 Git effect | compound command 或并发消费 mutant 任一未被唯一 selector 杀死 | 禁止所有新 v1 Git effect；U-001仅zero-Git/arbitrary-shell exact subset；后续迁移只准operation-bound public prepare/advance |
| K-09 | 现有 `PUBLISHED` validator 足以证明发布 | 任意 40-hex OID/错 parent/错 path-set 仍 PASS | 只将 S44 当 shape check；历史结论必须从 published commit blobs 复算并绑定 receipt |
| K-10 | route reminder 能代表真实批准/派发 | E2 仅观察 recommendedSkills/hint，或第二事件覆盖原任务 | obligation 文件永不进 authority chain；只接受 top-level request/gate 或 E3 attested event |
| K-11 | 新验证可继续串行加入 120s 链路 | 重复全量运行 p95 > 102s（85%）或可用 headroom < 15s | 停止接线；先优化或做经 mutation 证明的安全分片，保留显式 full suite |

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

semantic memory、review log、`promoted-facts.yaml`、retrieval `mattered` 与其中的 reviewer 字符串都只能提供上下文/审计证据，不能证明当前用户批准。即使事实标为 stable，若其人门仅由 agent 自报“用户已授权”，也不得进入 authority chain；唯一可接受的批准仍是当前 top-level request/gate evidence 与其 exact digest。proposer、approver、promoter 三种角色若在上游展示中混淆，controlled-change 直接视为 `NON_AUTHORITY_EVIDENCE`，不尝试替 memory owner 猜测或修复。

近期 E1/E2 route-obligation 文件只是**提示性证据**，既不是批准、也不是已派发的证明，不得进入上述 authority chain。`recommendedSkills`/PLAN_MODE hint 不等于 dispatch，二次 route event 不得覆盖第一事件绑定的 exact task text。如未来 E3 产生具有 event ID、task digest、actor/harness 和不可变 payload 的 attestation，controlled-change 只消费该上游接口，不在内部重新解析 transcript，也不依赖“相邻消息”启发式；E3-L0 已记录的 distance-2 counterexample 必须成为接口 fixture。Gate M 若发现 E3 或 route contract 在本 plan 冻结后改变，必须重做 interface census，不允许复制一套第二真值。

---

## 5. Read-only capability-gap map

| 能力域 | 当前可复用 primitive | 当前 failure / gap | Standard owner |
|---|---|---|---|
| v1 contract/manifest | `.claude/skill-os/controlled-change.yaml` + `controlled-change.mjs` strict exact-path schema、repo/common-dir/HEAD/pre/post tuple | schema v1 面向单任务；action/effect DAG、resource key、version negotiation 尚未统一 | v1 compatibility reader + v2 compiler |
| v1 durable state | task-local witness/active/receipt，atomic temp+fsync+rename、expected SHA CAS | `discoverControlState` 把多于一个 nonterminal 判 invalid；receipt 与 journal 尚非一份 canonical projection | v1 recovery owner；v2 state store |
| prepare concurrency | control-root inode 上 advisory `flock`，竞争 prepare 在写 witness 前被拒；不建 lease 文件 | repo-global single active；不能表达 disjoint operations；外部进程不遵守 | v2 resource claims + CAS |
| Claude enforcement | `.claude/settings.json` 直接注册 guard；异常经 `hook-failure-decision` 查询 durable witness | v1 inactive 时不做 pre-entry admission；受保护面仍可能绕过 `prepare` | stable admission classifier + shared evaluator |
| Codex enforcement | 已授信 project-scope hook 在 adapter 中串行调用 v1 guard；apply_patch/Bash 映射与异常路径有回归 | 依赖既有 trust entry bytes；新增注册需 fresh trust Gate G | 同一 stable entry 下版本化 launcher |
| active authorization | structured target/preimage；Codex exact patch SHA；shell default deny；one-use effect 绑定 command SHA/cwd/gate/token | Critical：compound Bash只分类首个Git verb，可借stage授权执行push；one-use check-hash→rename非线性；guard只能服务唯一active | Foundation containment + v2 exact controller operation/generation dispatch + effect host |
| pre-entry coverage | Plan Agent/Orchestrator 合同触发 + v1 `prepare` | ordinary inactive write本身不会自动建立 witness；“所有 runtime mutation mandatory”目前不是机械事实 | protected-surface admission；其余先 shadow/explicit |
| repo file apply | manifest 支持 add/modify/delete/symlink tuple、pre/post check；scratch/repo disjoint | 没有统一 rename/mode/delta-denominator adapter；repo apply 与 effect 状态尚未同一 DAG | repo-files adapter |
| crash recovery | prepare 与 terminal crash points、same generation resume、foreign active CAS 拒绝均有测试 | 仅 v1 state machine；无多 adapter partial/unknown 的唯一 next-action model | v1 reader + v2 kernel |
| bootstrap | fresh bootstrap receipt 绑定 exact patch/manifest、postimage和双门输出；已真实安装 | 这是已完成的 v1 bootstrap，不能再执行“首次安装”；v2 必须 side-by-side dormant | migration/lifecycle |
| isolated publication | 六Skill receipt/terminal history证明曾用私有 index、`commit-tree`、private ref、expected-old lease、literal URL 与 remote readback完成发布；`candidate-manifest.mjs`只读核验lineage | 通用publisher代码/外部journal不在当前tracked runtime；不能从terminal state重放；本地post-publication receipt使旧validator变红 | Git publisher adapter + evidence schema v2 |
| external/personal | 六 Skill 已完成两处 exact personal cutover并有 restricted backup/receipt | 真实路径流程是 task-specific，不能在本规划读取/修改；尚无通用 default-deny adapter | external-files adapter |
| evidence closure | v1 core 11/11、hooks/wiring静态、engineering-delivery tests PASS | validator现已接受 `PUBLISHED`，但伪40-hex OID/错parent/错path-set仍可PASS；stronger verifier误用live bytes；同源状态/lineage仍缺失 | published-commit historical verifier + versioned receipt schema |
| common-dir topology | v1 已绑定 realpath/common-dir/HEAD；published flow 保持 shared index/HEAD/local main | v2 多 worktree 的 file/ref/remote resource identity 尚未形成统一 key | repo identity + claims |
| network/API/GUI | 无通用 primitive | identity/idempotency/readback/compensation 不可泛化 | default-deny；未来具体 adapter另立 U-block |
| self-upgrade | v1 guard/controller 是 live source bytes | active session/runtime upgrade、previous reader、旧 nonterminal compatibility 未闭合 | content-addressed v2 bundle + stable launcher |
| audit/privacy | v1 receipt 不含 file bodies；effect auth/发布事实可追踪 | schema/retention/redaction、发布后 supplemental receipt、terminal verifier 漂移未统一 | receipt policy |
| Plan/Orchestrator integration | 六 Skill 已有真实 v1 consumer 和角色接线 | 全量触发仍以合同纪律为主；protected-surface pre-entry 未机械覆盖 | orchestration + admission integration |

结论：仓库已经有一套**可运行但 effect 面必须先 containment 的 Foundation v1**，不是只有零散算法原语。全量方案的价值在于先关闭已知 bypass，再补齐多操作归属、统一 effect lifecycle、版本迁移、预激活 admission 和证据同源；不是重写 v1。既有 project transaction、observability writer、eval recorder 继续拥有各自 operational data，controlled-change 只控制“修改这些 owner 实现”的变更。

### 5.1 2026-09-02 提交审计增量 gap

| Finding | 独立证据 | 本方案裁决 |
|---|---|---|
| v1 复合 Git effect bypass | scratch fixture 对 `git add target.txt && git push ...` 仅绑定 `git-stage` 即 PASS | Critical；Gate M0 起禁止新 v1 Git effect；U-001先以zero-Git/arbitrary-shell exact subset完成containment；Gate N后U-003只经public prepare/advance迁移 |
| v1 one-use 非线性化 | `atomicWriteJson` 是 check-hash 后无锁 rename，并发消费可重用 token/丢更新 | Standard 不继承该 store；U-002 使用 lock/O_EXCL sequence + previous-event hash，Foundation mutant 未杀死前 effect dark |
| read-only Git probe 可执行 repo-local program | scratch repo 的 `core.fsmonitor` 在 NOT_APPLICABLE inspect 前已执行 | 不把现有 conflict helper 当 trusted oracle；Gate M/U-009 使用中和 program surfaces 的 plumbing 和恶意 config matrix |
| `PUBLISHED` 校验欠绑 | 伪造全 `a` commit/全 `b` parent 仍通过 final validator | S44 只是 shape check；U-001 建 historical verifier，从 published commit blob 绑定 OID、single parent/baseline、plan SHA 和 path-set |
| E2 reminder 被误当 dispatch；task text 被二次事件覆盖 | route-guard 将 recommendedSkills 视为 SATISFIED；SIGNAL_A/B test 没守 first payload | U-006 只读消费 E3 attestation（若存在），永不使用 obligation 文件作 authority；route 本体修复属独立 owner |
| E1 alias 身份不可携带 | delivery report 确认依赖未 tracked 下游 `.luca/project.json` | Gate M 不从 alias 推导 authority；需 exact tracked/attested identity，否则 `NEEDS_CONTEXT` |
| route STOP production shape 崩溃 | `91ba95a` 新分支产 `{skill,why}`，renderer仍执行`c.tokens.join()`；dry-run 203/203未覆盖真实输出，独立审查复现exit 1 | Gate M将production renderer/adapter schema视为外部前置；未由route owner修复并加non-dry-run回归前，U-006不得开始；controlled-change不改route文件 |
| meta-question仍可高置信误派 | `请问/麻烦/帮我`触发宽泛request-marker豁免；纯文件位置/翻译问题仍SINGLE skill | 所有STOP/SINGLE/MULTI/FRAMEWORK_FLOW/soft candidate仅作不可信hint；U-006绑定top-level request或attested E3，不从route verdict推导approval/dispatch |
| code-recon workflow链未证明可执行 | scene B新增两条path，但architecture_brief未进入ux-brainstorm workflow输入，tech-spec workflow仍要求PRD+design-brief | graph保持Graph-optional且为只读anchor；U-006不新增/修补node/path，Gate M要求原owner给出下游input-contract proof，否则这些推荐不进入受控调度 |
| routing evidence不可精确复算 | corpus probe继承未冻结env造成committed final两行漂移，98→106无持久化scorer | 不把报告分数当Gate evidence；U-012 evidence manifest必须冻结argv/env/input/output/scorer SHA，fresh结果不能由静态artifact自证 |

因此，上文“可工作”只表示 v1 有已发布的运行形态与可读 legacy evidence，**不表示已经安全到可继续发放 effect authority**。

---

## 6. 三种架构档位比较与目标选择

| 维度 | Foundation / v1（已安装，待 containment） | Standard / v2（推荐演进目标） | High-assurance |
|---|---|---|---|
| 主要目标 | 先关闭已知 effect bypass/欠绑证据，再保留精确 repo 变更与 legacy recovery | 完整 cooperative transaction、恢复、effect adapter、双 harness 平价 | 对抗恶意/被攻破组件、多用户隔离 |
| 核心机制 | manifest、required/active、scratch bundle、preimage CAS、receipt | Foundation + durable journal/generation、resource claims、static effect host、self-upgrade、reconcile | daemon/broker、签名 capability、进程/OS sandbox、远端 attestation |
| concurrency | 每 Git common-dir 仅一个 nonterminal；prepare flock + tuple CAS | 每 operation 一份 immutable manifest；排序 resource claim + CAS；仅 disjoint action 并行 | 系统服务仲裁、强隔离 |
| effects | harness 直接写 exact repo bytes；已有 one-use Git 授权暂停新发；task-specific personal/publish 只作历史证据 | kernel 统一调度 repo/external/Git adapter；其他默认拒绝 | 经签名/隔离 broker 的多方 effect |
| trust | trusted main/kernel/hook | 同左，边界明确 | 缩小 TCB，main/worker 也可能不可信 |
| UX 成本 | 低 | 低风险走 Foundation，风险升级 Standard | 高，常驻服务/凭证/部署/故障面大 |
| 运维成本 | 低中 | 中等，可由仓库维护 | 高，需服务生命周期和跨平台运维 |
| 适配当前证据 | 已真实发布且原 11 项 core 回归通过；新审计证明 compound-Git、linearizability、publication binding 未闭合 | 只在 Foundation containment、v1 迁移、pre-entry、并发、effect unknown 证据达标后进入 | 目前缺真实攻击证据/多用户需求 |
| 停止线 | 无法可靠恢复多 effect 时停止 | 满足当前目标后停止；不默认平台化 | 仅 Gate H 新计划可进入 |

选择 Standard 的理由不是“功能最多”，而是它覆盖 v1 已明确暴露的边界：Git effect 类型混淆、one-use 非线性化、repo-global single-flight、直接 writer、descriptive policy、非冻结 `EFFECT_UNKNOWN`、task-specific publication 与无版本迁移。它仍是**有条件目标**：Gate M0/M 或 Foundation shadow 证伪需求时，正确结论是停在 containment 后的 v1。High-assurance 的复杂度没有当前证据支持。

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
│ prepare(request,[approval]) │ advance(op,generation,[approval]) │ status │
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
scratch worker ─────► ├─ repo-files adapter (base)
 candidate bundle     ├─ concurrency / effect-DAG module [Gate N BUILD only]
                      ├─ external-files adapter [N-E BUILD only]
                      └─ git-publisher adapter [N-G BUILD only]
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
| lifecycle | exact bootstrap、runtime capsule、active pointer、rollback | internal stageCapsule/verifyCapsule/activateCAS；仅由kernel的public advance调用 | 可独立替换版本，不把 effect policy 放进来；无独立activate CLI |
| capsule composer | 将Gate N vector与exact module SHA编译成带literal imports的immutable runtime entry | pure compose/verifyProfile | 删除后可回base repo-only capsule；运行时不得靠目录扫描或dynamic import补回 |
| candidate pipeline | scratch bundle census、pre/post/reverse，自己不写 live | build/inspect | worker 无 live 写权；repo adapter 不解析 prompt |
| enforcement gateway | 适配 Claude/Codex hook 协议 | `decide(tool,input,projection)` | 删除某 adapter 不改变核心语义；该 harness 失去 mandatory 能力 |
| effect host | 接收capsule composer生成的封闭registry/scheduler；base只含repo-files | prepare/apply/readback/compensate | 删除任一可选模块不影响base adapter/kernel |
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
- adapter/scheduler 表由 capsule composer 在bundle构建期封闭、版本化并写 literal import + module SHA；runtime 不扫描目录、不按文件存在性发现、不 dynamic import。未知或未选 adapter 永远 `POLICY_DENIED`；
- recovery 不是“任意选择一个状态”，而是 `advance` 根据 state/readback 计算的受限动作。

---

## 8. 对外合同、触发与角色边界

### 8.1 三个公开入口

```text
controlled-change prepare --request <request.json> [--approval-evidence <evidence.json>]
controlled-change advance --operation <id> --expected-generation <n> [--approval-evidence <evidence.json>]
controlled-change status --operation <id> [--json]
```

`prepare`：

- strict schema 验证、repo common-dir/worktree identity、canonical path、preimage、effect DAG、风险档和 gate；
- 若携带 approval evidence，验证 trusted top-level main 绑定的 request/plan/U-block/session-turn 并直接进入已批准 projection；若不携带，只写 PREPARED journal 并返回 immutable manifest digest + 人类可读 approval payload，后续由 `advance --approval-evidence` 绑定；
- 可在 Git common-dir 的 operational state root 写 PREPARED journal，但绝不写 live target；
- 不接受自由 shell、glob 扩权或 caller 自带 authority。

`advance`：

- **唯一推进 live/effect 的 public entry**；`prepare` 虽可写 PREPARED journal，但不得获取 target claim 或产生 effect；
- caller 只能给 operation ID、expected generation，以及**仅当当前 next action 需要新 human gate 时**的 approval evidence；kernel 自行计算唯一 next action；
- apply 前重验 approval/digest/expiry/preimage、获取短 claim、写 durable intent；
- recovery 使用同一入口，但任一 durable snapshot 只映射一个机械动作，不返回动作集合：仅当approval current时，`REQUIRED`已durable但active缺失才允许重建同digest active，partial repo apply在“已写资源全为owned postimage且其余资源全为old preimage”时才允许roll-forward，Git-local postimage才允许补receipt；上述任一snapshot的approval过期都只进入`AWAIT_GATE_X`。external/remote unknown只允许`reconcile-readonly`。`abort-owned`/reverse绝不与resume共享同一generation：只有确定性resume不成立且kernel先durable写入绑定snapshot/generation/resource digest的`RECOVERY_REQUIRED(selector=AWAIT_GATE_X)`后，top-level用户才可在Gate X用fresh approval选择exact recovery mode；`advance`先追加`RECOVERY_CHOICE`并递增generation，后续snapshot才唯一执行所选动作。旧generation、同一snapshot同时接受resume/abort/reverse、worker自选mode全部拒绝。

`status`：

- 严格只读；输出 state、generation、blocked reason、claims、effect readback、next human action；
- 默认脱敏，不展示 file body、token、credential、完整 remote URL query/userinfo。

`approval-evidence` 是 journal 中的审计绑定，不是 secret capability。它至少绑定 plan SHA、U-ID、request digest、manifest digest、gate ID、harness/session/turn identity（若 harness 可提供）与明确裁决；不得保存整段对话。Standard 的威胁模型信任 top-level main，不声称防恶意 main 伪造批准。worker 不得调用这三个入口的机械依据是其 sandbox writable roots 不包含 live repo、Git common-dir 与 external target；某 harness 无法证明该隔离时，不得把 controller 委托给 worker。

#### 私有兼容 ABI（不是第四个公开入口）

未改动的 Claude/Codex wrapper 已依赖 `scripts/controlled-change.mjs hook-failure-decision`，因此 migration 必须冻结该 private ABI：

- 同时支持 `hook-failure-decision` 与 `hook-failure-decision --repo <realpath>` 两种形式；其他未知参数 exit 2；
- stdout 永远为空；仅在 strict inactive（v1/v2 都无 required/invalid/nonterminal）时 exit 0；
- required、invalid、nonterminal、launcher/projection 不可读时 exit 2，stderr 保持有界、脱敏、可诊断；
- fixture 必须覆盖两种 wrapper 形式与 raw v1/v2 state。Codex adapter 在 Node 启动前已发生的 syntax-byte corruption 仍是 TCB/fail-open 边界，除非 Gate G 显式改动 trusted wrapper bytes。

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

Gate N 的 capability disposition 与完成状态正交：`BUILD | SKIP_DARK` 只存在于带 SHA 的 Gate N vector，不写入 kernel/Plan 的 completion enum。Orchestrator 在任何 U-block 实例化前用同一 canonical vector digest裁剪 DAG：`BUILD` 才创建该 U-ID 的 lifecycle record，`SKIP_DARK` 没有 U-block instance、没有 `Status`、不计 PASS/FAIL、也不进入 dependency wait set。Claude direct path 与 Codex trusted-entry path都只消费 U-002 contract compiler输出的 canonical projection/digest，不各自解析文本；vector 不可读、digest不同或条件依赖无法投影时统一 `NEEDS_CONTEXT`，不得把 skip 降级成成功。

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

route-guard 的 E1/E2 obligation state 不参与此触发的权限裁决：`recommendedSkills` 或 PLAN_MODE hint 只能作 observability reminder，不能证明已 dispatch、已 prepare 或已 approval。Gate M 必须重新 census 当时的 E3 产物：若 E3 已提供冻结的 attested event interface，U-006 仅通过该接口适配；若仍未提供，就继续绑定当前 top-level request digest。两种情况都禁止 controlled-change 重新解析 transcript 或把 `.session-obligation-*` 当 authority。

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
  ├─ readback proves old/preimage AND approval current AND semantics/ownership exact → RECOVERY_REQUIRED(selector=RESUME_EXACT)
  ├─ approval expired OR readback foreign/diverged OR semantics/ownership ambiguous → RECOVERY_REQUIRED(selector=AWAIT_GATE_X) / NEEDS_CONTEXT
  └─ readback cannot decide             → EFFECT_UNKNOWN（冻结本节点与全部后继）

selector优先级是机械且互斥的：readback不可判定先进入`EFFECT_UNKNOWN`；否则任一approval过期/foreign/语义或ownership不唯一都选`AWAIT_GATE_X`；只有余下的current-approval + exact old/owned snapshot才选`RESUME_EXACT`。`RECONCILE_READONLY`是`EFFECT_UNKNOWN`的唯一动作，不是recovery selector。
任何非终态 crash/不一致/expiry（已进入`EFFECT_UNKNOWN`者除外）→ kernel按snapshot digest写入恰好一个selector：`RESUME_EXACT | AWAIT_GATE_X`。
RECOVERY_REQUIRED(selector=RESUME_EXACT) → 只允许同generation exact resume
RECOVERY_REQUIRED(selector=AWAIT_GATE_X) → 只等待Gate X；不得resume/abort/reverse
Gate X fresh approval → durable `RECOVERY_CHOICE(snapshot_digest, mode, owned_set, approval_hash)`并递增generation
RECOVERY_CHOICE(mode=ABORT_OWNED) → ABORTING → ABORTED；mode=RESUME_EXACT → 只恢复绑定的exact action
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

下表先应用 §10.1 的selector优先级：任何approval过期/foreign/语义或ownership不唯一都不匹配resume/apply行，而唯一落到`AWAIT_GATE_X`；表中所有重建/补写/roll-forward行均隐含并在证据列要求`approval current`。read-only status/reconcile不计为live/effect推进动作。

| Crash 点 | 重启后证据 | 唯一合法动作 |
|---|---|---|
| v1 drain 前发现 required/invalid | raw v1 witness/active/receipt | 禁止 v2 prepare；只用冻结 v1 runtime exact recover 或 Legacy Gate |
| PREPARED 前 | 无 operation | 重跑 prepare |
| PREPARED 后、批准前 | manifest，无 approval | status / abort-pre-effect |
| REQUIRED durable、active 前；approval current | required witness + approval digest/expiry | 只重建相同digest active；本snapshot不接受abort/reverse |
| active 后、claim 前；approval current | required+active + approval digest/expiry | advance重验并获取claims |
| intent 后、repo-files apply 前；approval current | intent + old preimage + approval digest/expiry | 若仍old，idempotent apply；否则按selector进入recovery |
| 部分 repo-files apply；approval current，已写资源均为owned postimage且其余均为old preimage | per-resource old/owned readback + journal + approval digest/expiry | 只幂等补仍old的资源；本generation不接受reverse |
| 部分 repo-files apply；任一资源foreign/unclassifiable | per-resource readback + journal | 只durable进入绑定exact snapshot的`RECOVERY_REQUIRED`并停；不得补写或reverse |
| `RECOVERY_CHOICE(mode=ABORT_OWNED)` durable 的新generation | prior snapshot digest + top-level approval hash + exact owned set | 只reverse仍等于owned postimage的资源；任一漂移则停，不改foreign |
| effect intent 后、响应前 | intent，无 readback | `EFFECT_UNKNOWN`，只读 reconcile |
| confirmed 后、receipt 前 | readback confirms | 补写 receipt，不重复 effect |
| receipt 后、active cleanup 前 | terminal receipt | idempotent cleanup projection |
| fresh proof + Gate F receipt durable 后、activation CAS 前 | pointer=`DRAIN_V1` + M current generation + fresh/Gate F evidence | 只允许同一M与expected generation的public `advance`执行activation；门证据缺失则保持DRAIN |
| activation pointer CAS 后、receipt 前 | pointer=exact owned new bundle + Gate F evidence + generation journal，无activation receipt | pointer仍等于owned postimage时只幂等补activation event/receipt；任何foreign/unknown值立即停，不重做activation |

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

1. 在可执行程序面被中和的 Git envelope 内解析并固定 common-dir、worktree identity、base commit、full destination ref；优先用 plumbing，不调用现有 conflict helper 作 trusted oracle；
2. 使用 operation 专属临时 index，不触碰共享/当前 index；
3. 将已核验 repo bundle 写入临时 index，逐 path 核验 mode/blob/tree；
4. 用 `git write-tree` + `git commit-tree` 生成 immutable commit OID；
5. 以 expected-old CAS 更新 operation 私有 ref；
6. 不移动 local HEAD/main/current branch；
7. receipt 记录 base/tree/commit/private-ref OID，不记录 credential。

### 13.2 Remote descriptor 与发布

- remote 使用 literal canonical URL identity + exact destination full ref，禁止依赖 `origin`、`push.default`、URL rewrite、include config 或当前 branch；
- 所有发布前只读 probe 和 local build 都必须中和 repo-local/system/global 可执行程序面，至少包括 `core.fsmonitor`、hooks、pager/editor、external diff/textconv、config include、URL rewrite 与 protocol helper；设置 `GIT_NO_REPLACE_OBJECTS=1`，枚举并拒绝非空 `refs/replace/**` 与 `<common-dir>/info/grafts`，使 parent/ancestor 证明基于 raw object graph；
- 设置 `GIT_NO_LAZY_FETCH=1` 与 `GIT_TERMINAL_PROMPT=0`，在 network-denied sandbox 内验证所有 base/parent/tree/blob 本地存在；若仓库声明 partial-clone/promisor 或任一必需 object 缺失，返回 `NEEDS_CONTEXT`，不得由 `cat-file`/revision walk/status 隐式 fetch；
- 只使用冻结的 plumbing argv/env/config allowlist，不能先跑未消毒的 `git status`再判定 NOT_APPLICABLE；historical PUBLISHED verifier 与 Gate R FF proof 必须复用同一 safe object-reader，不得各自实现较弱版本；
- 真实 remote effect 只在 Gate R 后为精确 transport 开放必需的 credential helper/protocol，其余 alias/hooks/pager/rewrite 仍保持 deny；
- source 是 immutable commit OID；
- 发布前机械证明 `expected-old` 是 source 的 ancestor，禁止 backward/non-FF；
- 执行 exact `--force-with-lease=<dst>:<expected-old>` 仅作为**expected-old CAS 协议原语**，不得用于非 FF 覆盖，不允许空 lease、`+refspec` 或无 FF 证明；因 CLI 形态含 force-like 语义，每次真实执行仍需 Gate R 显式授权，不能依赖通用命令白名单；
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

其中 `harness-cases.json` 必须逐个复用 state vectors 的 approval-selector 交叉积 fixture ID：`required-missing-active | partial-owned | git-local` × `current | expired`；Claude 与 Codex 的 fresh-session run 都必须执行这六个相同 fixture，current 只接受 `RESUME_EXACT`，expired 只接受 `AWAIT_GATE_X`，不能用共享 evaluator 的单元测试代替 adapter 端到端证明。

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
- **migration bridge / DRAIN_V1**：U-001 containment guard可观察Gate B绑定的唯一migration operation M；M创建后及DRAIN期间拒绝所有新prepare/普通writer，只允许M当前generation的canonical `advance`与只读status。该桥不执行activation，只把调用交给fixed candidate/capsule；
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

v1 既有 fixtures 只证明 required/invalid、missing-active、malformed、timeout、adapter-error 等已覆盖路径会查询 durable witness 并 fail closed；它们没有证明复合命令分类或并发one-use正确。R-011已经用mutant推翻“这些回归足以构成effect安全下限”的外推，因此新v1 Git effect保持disabled。仍明确排除 Codex adapter 在 Node 运行前 syntax-byte corruption 的场景，这是 v1/Standard TCB boundary，不虚称解决。v2 必须保留既有负面路径、杀死compound/concurrent mutants，并新增 pre-entry、exact argv、direct-writer deny、private ABI 与共享 verdict corpus，才能 promotion。

### 14.3 Current/new session 边界

- 修改 registration/trust 后，当前 session 不能作为唯一验收；必须启动 fresh Claude 与 fresh Codex session；
- v1→v2 先由contained v1 exact repo operation安装依赖（不改最终live guard），再由新CLI的public `prepare`创建唯一migration operation；该operation经public `advance`按 capsule→durable `DRAIN_V1`→final guard-last→fresh tests→Gate F→pointer CAS 推进；
- active runtime pointer 内容寻址，guard 加载固定 bundle SHA，不从可变工作树直接执行新版本；
- 纯 JS guard 每次 tool call 都会 process-fresh load；只有 registration/trust/launcher path 变化必须 fresh session。当前静态 wiring 已通过，但本规划没有重新证明 fresh controlled-mode verdict digest，Gate M/F 必须补证；
- 若任一 harness fresh test 失败，active pointer 以 expected-current CAS 回 `DRAIN_V1`/previous，required witness 保持可诊断，禁止半启用。

---

## 15. v1 迁移、bootstrap、自升级与损坏恢复

### 15.1 已安装 v1 → v2 migration bootstrap

“guard 尚不存在的首次 bootstrap”已经在六 Skill MVP 中完成，不能重演。Gate N 只有明确返回 `N0=ENTER_STANDARD` 后，v2 才能通过下列 side-by-side migration；整个流程保持三个 public entry，不暴露 lifecycle `activate` 命令：

1. **Re-census**：重跑 Gate M，要求 v1 zero `required`/`invalid`、零 active、terminal witness↔receipt SHA 有效；冻结 HEAD/main/index/common-dir/worktree/locks/session/open-writer。Git probe 使用 §13.2 safe envelope；route/E3 interface 变化先回计划。
2. **Freeze inputs**：冻结 contained-v1 core/controller/guard/settings bytes、81-row historical manifest + live drift、raw legacy evidence、personal baseline、published commit blobs与Gate N evidence。legacy evidence/backup不改写、不接管。
3. **Scratch candidate**：构建 immutable v1 compatibility、stable launcher、v2 bundle与U-004 minimal repo-only effect host；Gate B 冻结 source Files 及以下 operational targets 的 pre/post/reverse/owner：
   - repo source targets：除最终 `.claude/hooks/controlled-change-guard.mjs` 外的U-003 exact Files；
   - `<common-dir>/luca-controlled-change-v2/runtime/{v1-compat,v2}/<bundle-sha>/`，其中v2 bundle含由U-004 composer生成的base-only `runtime-entry.mjs`与`capability-profile.json`；
   - `legacy-index/<snapshot-sha>.json`、migration operation journal/projection；
   - `launcher-state.json`；
   - final live guard path（必须是最后一个live repo target）。
4. **Dependency install under contained v1**：建立一个effect-empty的v1 exact repo operation，只按 dependency-first 顺序安装/更新 source dependencies，`scripts/controlled-change.mjs` entry在其依赖之后写，最终live guard保持U-001 containment版本。每个文件后均process-fresh调用private ABI；crash只允许resume该v1 operation或owned reverse，不能开放Git effect。
5. **Create the one migration operation**：dependency operation terminal 后，contained guard只允许新CLI的canonical public `prepare --request <migration-request> --approval-evidence <Gate-B-evidence>`。prepare写入唯一 v2 migration operation `M` 与generation 0，不写capsule/live target；从此guard观察到M后拒绝任何新prepare和普通protected writer，只允许exact `advance M <generation>`/status。
6. **Advance M — capsule first**：public `advance`将content-addressed runtime写到common-dir同文件系统staging，逐文件hash/mode验证、fsync，最后以no-replace目录rename发布；legacy index和journal event随后durable。partial staging不进入launcher，恢复只清理exact-owned staging或幂等resume。
7. **Advance M — DRAIN durable**：以expected-empty/current CAS写 `launcher-state.json=DRAIN_V1` 并fsync directory。U-001 containment guard必须dual-read M/DRAIN：拒绝所有新prepare，只允许M的下一generation advance/status；legacy nonterminal若意外出现则冻结M并进入Legacy Recovery Gate。
8. **Advance M — final guard last**：从已发布capsule加载minimal host，以repo-files adapter对最终live guard做exact pre/post CAS；final guard只从fixed bundle SHA读取DRAIN/M。不得在capsule或DRAIN之前改final guard。
9. **Fresh proof while DRAIN**：fresh Claude/Codex覆盖inactive/pre-entry/v1-drain/v2-active/malformed/private-ABI及逐边界crash corpus；legacy reader再次证明zero required/invalid；compound/concurrent/publication mutants全被杀死。失败保持DRAIN，existing M仍可status/recover。
10. **Advance M — activation**：只有Gate F后，caller再次使用同一个operation ID与expected generation调用public `advance`；kernel内部lifecycle primitive以expected-`DRAIN_V1` CAS把pointer设为fixed v2 bundle并写activation event/receipt。没有第四public/private activate入口。
11. **Post-activation**：v2只建path+raw SHA derived legacy index，不重建terminal manifest、不导入旧gate/token/authority。任一失败回DRAIN/previous；reverse只对owned postimage。v1 reader至少保留到首笔成功transaction + recovery drill，旧receipts永不删除。

逐边界 crash matrix 必须至少覆盖：dependency写前/后、CLI entry写前/后、M PREPARED前/后、capsule staging每文件、bundle rename前/后、legacy-index event、DRAIN CAS前/后、final guard rename前/后、fresh proof后/activation CAS前、activation CAS后/receipt前。每一格只能有一个合法next action；尤其“v1 terminal + M PREPARED + 尚无capsule”和“DRAIN + containment guard + final guard未写”都必须由exact `advance M`恢复。

当前 2026-09-02 snapshot 满足“两个 valid terminal、全局 inactive”，但这只是规划证据；未来 implementation 必须从第 1 步重新证明，不得沿用快照授权。

### 15.2 Content-addressed runtime

建议 operational root（未来实现前仍需 identity fixture 验证）：

```text
<git-common-dir>/luca-controlled-change/          # raw v1，immutable legacy owner
└── <task-id>/{required-witness,active-context,receipt}.json

<git-common-dir>/luca-controlled-change-v2/       # new namespace
├── runtime/v1-compat/<bundle-sha256>/...
├── runtime/v2/<bundle-sha256>/{runtime-entry.mjs,capability-profile.json,...}
├── launcher-state.json                           # DRAIN_V1/current/previous CAS
├── legacy-index/<snapshot-sha256>.json            # path + raw SHA only
├── operations/<operation-id>/events/<seq>-<sha>.json
├── projections/<operation-id>.json
├── claims/...
└── receipts/private/<operation-id>.json
```

`launcher-state.json` 只存 mode、current/previous bundle SHA、schema compatibility、activated_at，并以 expected-old CAS 更新。runtime bundle immutable；launcher 必须最小且稳定。v2 event append 使用 per-operation lock/O_EXCL sequence + previous-event hash，不能用会丢更新的无锁 read-check-rename。

这些 common-dir 路径是 **operational targets**，不是 repository source `Files`；但绝不是未声明写入。Gate B 必须把migration的每个目录/文件的canonical identity、filesystem device、pre/post、staging、owner operation M与reverse规则写入manifest。migration阶段唯一写 owner 是public `advance M`内部的lifecycle/state-store primitive；它不接受caller传任意路径，也不暴露独立install/activate CLI。U-003的 `Files` 只列将被版本控制的source bytes，§15.1第3项列的是同一U-block在运行时获批的精确operational write set。后续U-010 composition使用另一个经Gate G批准、绑定Gate N vector与module SHA的upgrade operation；其public `advance`拥有新bundle/pointer operational targets，但不得回写M或旧bundle。

### 15.3 自升级

- v1 migration 完成后，N 版本 controller 编译 N+1 bundle，N+1 dormant；
- U-004 的 pure capsule composer 只接受 canonical Gate N vector、base digest与selected module path/blob SHA，生成literal-import `runtime-entry.mjs` + `capability-profile.json`；`SKIP_DARK` module存在、BUILD module缺失、base digest漂移或entry含未选import均拒绝；
- U-005/U-007/U-008/U-009先产各自独占scratch module，验收后经base repo-files安装dormant source且不改active bundle；U-011再安装最终CLI/kernel/state/receipt postimage；U-010是唯一composition/activation owner，用一次upgrade operation把U-011与全部selected modules静态链接进N+1；
- N 验证 N+1 schema can-read-old / can-recover-old 与双 harness fresh fixture；
- Gate F 后 CAS pointer N→N+1；
- previous N 至少保留到 N+1 完成第一笔真实 transaction 与 recovery drill；
- N+1 失败时由稳定 launcher 切回 N，不能要求损坏的 N+1 自救；
- stable launcher/registration/trust 自身变更重新走 Gate M + Gate G，不把它当普通 self-upgrade；
- 没有签名链：Standard 依赖已批准 bundle SHA + cooperative local TCB，绝不夸大为 supply-chain security。

---

## 16. 恢复、审计与隐私

### 16.1 Recovery decision table

| 现场（互斥selector） | 当前snapshot唯一动作 | 必须人工 | 禁止 |
|---|---|---|---|
| v1 required/invalid during drain | frozen v1 exact inspect/diagnostics | Legacy Recovery Gate 下 exact recover | v2 prepare、改写/删除 legacy state |
| 未产生 effect、所有preimage仍旧且既有approval仍有效（`RESUME_EXACT`） | idempotent resume | 无；该selector下不提供abort/reverse选择 | 改manifest、同generation abort/reverse或改selector |
| approval已过期或语义/ownership无法唯一决定（`AWAIT_GATE_X`） | durable等待，无live effect | Gate X只批准一个mode并生成新generation | 旧generation resume/abort/reverse |
| approval current、部分repo postimage均owned且其余均old（`RESUME_EXACT`） | 只补未应用资源 | 无 | 同generation reverse、覆盖foreign；approval过期时误走本行 |
| 部分repo apply含foreign/unclassifiable（`AWAIT_GATE_X`） | 只进入/保持`RECOVERY_REQUIRED` | Gate X可绑定exact owned set选择`ABORT_OWNED`；不能选择覆盖foreign | 自动补写或reverse、修改foreign |
| personal postimage owned但无可自动resume（`AWAIT_GATE_X`） | 只等待Gate X，无live effect | Gate X可绑定Gate E原证据生成`RECOVERY_CHOICE(mode=ABORT_OWNED)`新generation | 直接reverse、current漂移时强回滚 |
| personal `RECOVERY_CHOICE(mode=ABORT_OWNED)` durable | 只reverse仍等于exact owned postimage的target | 无；choice已绑定fresh approval | 改mode、触碰foreign或复用旧generation |
| approval current、Git local commit/private ref 已建且未push（`RESUME_EXACT`） | 只补local receipt并等待Gate R | Gate R只决定后续remote publish；approval过期则只匹配上方`AWAIT_GATE_X`行 | 同snapshot删除private ref、移动main/HEAD；approval过期时误走本行 |
| push 结果 unknown | read-only remote reconcile | retry/接受 diverged | 自动 retry/remote rollback |
| approval current、active projection 缺失但required digest有效（`RESUME_EXACT`） | 只重建同digest active | 无 | abort/reverse、ordinary mutation；approval过期时误走本行 |
| active/runtime证据冲突或bundle损坏（`AWAIT_GATE_X`） | stable launcher保持previous并只诊断 | Gate X绑定Gate B/G原证据后选择exact repair或owned rollback之一 | 从mutable worktree偷载代码、同generation双动作 |

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
- review ownership：architecture=codebase-design reviewer，safety=独立 redteam reviewer（默认 REFUTED），parity=harness reviewer，contract=Plan Agent reviewer，release=quality gate；`careful` 只提供危险命令的人工约束，在没有 opt-in 机械接线时不被声称为 authority 或 enforcement。不能由实现者单方签发。

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
memory 中的 stable/promoted/mattered 状态也不计入 Gate N/S 的用户授权或完成证据；只有绑定 exact operation 的当前 journal event 与独立可复算指标才能进入 gate payload。

---

## 18. 十六问题域闭合矩阵

| # | 问题域 | 方案答案 | 机械证据 |
|---|---|---|---|
| 1 | 第一性价值 | 防范围扩大、stale、并发/partial/unknown；对抗性威胁明示边界 | failure fixtures + obligation census |
| 2 | 使用面与触发 | Plan/Orchestrator writer 前 prepare；inactive protected surface 机械 admission；route reminder非authority；E3有则消费attestation；其余逐面 shadow/explicit；只读/plan/owner data exempt | policy + pre-entry/route-authority bypass tests |
| 3 | 威胁与信任 | cooperative TCB；不防恶意 main、被攻破 runtime、任意同 UID process | threat matrix + negative claims audit |
| 4 | 能力分层 | Foundation containment后Gate N以20次真实证据先判N0，再逐项判N-C/N-D/N-E/N-G；未获证能力零bytes；High-assurance仍仅Gate H | Gate N capability-vector/absence/H branch |
| 5 | 核心架构 | stable launcher + immutable v1 compatibility + v2 deep kernel/journal/static adapters | module interface/deletion tests |
| 6 | 状态机 | generation CAS、required-before-active、per-effect unknown freeze、owned abort；v1 raw semantics不重解释 | model/property + crash/migration matrix |
| 7 | bootstrap/升级 | v1 effect先contain；Gate N后由operation-bound repo apply安装minimal host与DRAIN；side-by-side dormant v2；fresh dual harness/private ABI；previous rollback | containment + v1 drain + bootstrap/upgrade fixtures |
| 8 | 多 session 并发 | v1 single-flight；v2 one-manifest-per-op、disjoint ACTIVE、sorted claims + linearizable append + CAS | scheduler/linked-worktree/lost-update/no-age-steal tests |
| 9 | Claude/Codex 平价 | preserve trusted Codex piggyback；semantic event projection、fresh controlled-mode digest、active fail-closed | conformance corpus + fresh sessions |
| 10 | effect 模型 | static adapter + DAG；repo/personal/Git；network/API/GUI default deny | adapter contract/mutation tests |
| 11 | Git 发布 | program-surface-safe plumbing、isolated index/commit-tree/private ref/immutable OID/exact old CAS/reconcile | local bare remote + fsmonitor/config mutation + response-loss fixtures |
| 12 | 恢复与审计 | v1 evidence immutable；private receipt/public attestation 分离；owned-only rollback；unknown readback | crash injection + schema/lineage/privacy scan |
| 13 | 可用性 | Foundation fast path、delta-only gates、typed errors、read-only status | shadow UX metrics / error snapshots |
| 14 | 治理演进 | version freeze、Gate G、old-reader/recovery compatibility、deprecation | compatibility matrix + policy diff review |
| 15 | 验证体系 | unit/integration/fresh/concurrency/crash/mutation/config/worktree/publication + 120s预算/安全分片/full-suite保留 | assertion matrix U-012 + Gate V |
| 16 | 实施路线 | v1 census→containment→Gate N core/capability vector→base v2 migration→仅获证 concurrency/DAG/external/Git→shadow；明确 rollback/kill | U-block/Wave/Gates |

没有把“文档里回答”当成实现承诺；每一域都在后续 U-block 中至少有一个可执行 verification。

---

## 19. 实施合同总览（未来 Session，当前未授权）

### 19.1 Complexity、执行角色与成本带

- 复杂度模式：**Hierarchical**。
- 理由：13 个稳定 U-ID 跨 v1 migration、受保护 hooks、事务/并发、personal/Git effect 与双 harness fresh verification，且含多个人类不可代选 gate。
- 模式可组合：**Hierarchical 顶层 + Sequential 外层 + 各 Wave 内 Parallel Fan-out + 每阶段 Supervisor（WA/EA）**。
- 需要用户确认：**是**；当前先停 Gate P，未来每个不可逆 effect 仍分别停 Gate E/R/G/S。
- 任务规模 Tier：**Deep**。
- Plan tier：**Deep**（13 个稳定 U-ID、v1 migration、受保护 hooks、personal/Git 不可逆 effect、双 harness fresh 验证）。
- Model routing：规划/翻案/安全裁决用 reasoning-heavy；内核/adapter 实现用 core-execution；fixture/文档/清单检查用 guided-execution；preflight/格式/hash 用 mechanical。只指定 capability tier，不写死模型名。
- WA（Work Agent）：每个 U-block 独占 Files；不在 live checkout 直接生成，先写 operation scratch bundle。
- EA（Eval Agent）：与 WA 隔离、严格只读，不修代码、不推进 generation。
- trusted applier：只能是 top-level main 通过 `advance` 调用；WA/EA 均不持有 authority。
- 粗成本：v1 census/compat/migration 3–5 个专注工程日；Standard core + repo adapter 5–8 日；external/Git adapters 5–9 日；full verification/rollout 4–6 日，另加至少 20 次真实 shadow operation 的观察窗口。任一 kill assumption 命中即停止扩展，成本不是继续平台化的授权。
- Plan Agent 块 1.5（DEV-NNN 反向覆盖）：**N/A**；输入没有产品实现 `task-plan.md`，U-block 来源改由 R-001–R-017 冻结。
- Plan Agent 块 1.6（ASSERT/TEST-NNN 反向覆盖）：**N/A**；不存在 task-plan ASSERT/TEST 卡，16 域覆盖改由 §18→§21 的 obligation/assertion census 机械验证。

### 19.2 Future source file inventory

未来实现的拟议最小文件面分为“计划修改”与“只读不变锨点”；不代表当前写入授权。

**Planned mutation set**（仅能由对应 U-block 写）：

```text
.claude/skill-os/controlled-change.schema.json
.claude/skill-os/controlled-change.yaml
.claude/hooks/controlled-change-guard.mjs
.claude/agents/plan-agent.md
.claude/agents/orchestrator.md
scripts/controlled-change.mjs
scripts/controlled-change-controller.mjs
scripts/candidate-manifest.mjs
scripts/lib/controlled-change/admission.mjs
scripts/lib/controlled-change/launcher.mjs
scripts/lib/controlled-change/contract.mjs
scripts/lib/controlled-change/kernel.mjs
scripts/lib/controlled-change/state-store.mjs
scripts/lib/controlled-change/receipt-schema.mjs
scripts/lib/controlled-change/git-object-reader.mjs
scripts/lib/controlled-change/resource-claims.mjs
scripts/lib/controlled-change/concurrency-scheduler.mjs
scripts/lib/controlled-change/patch-pipeline.mjs
scripts/lib/controlled-change/effect-host.mjs
scripts/lib/controlled-change/effect-dag.mjs
scripts/lib/controlled-change/lifecycle.mjs
scripts/lib/controlled-change/capsule-composer.mjs
scripts/lib/controlled-change/compat/v1/core.mjs
scripts/lib/controlled-change/compat/v1/controller.mjs
scripts/lib/controlled-change/compat/v1/guard.mjs
scripts/lib/controlled-change/adapters/repo-files.mjs
scripts/lib/controlled-change/adapters/external-files.mjs
scripts/lib/controlled-change/adapters/git-publisher.mjs
scripts/fixtures/controlled-change/contract-cases.json
scripts/fixtures/controlled-change/state-cases.json
scripts/fixtures/controlled-change/claim-cases.json
scripts/fixtures/controlled-change/harness-cases.json
scripts/fixtures/controlled-change/effect-cases.json
scripts/fixtures/controlled-change/effect-dag-cases.json
scripts/fixtures/controlled-change/capsule-profile-cases.json
scripts/fixtures/controlled-change/v1-compat-cases.json
scripts/fixtures/controlled-change/v1-containment-cases.json
scripts/test-controlled-change.mjs
scripts/test-controlled-change-contract.mjs
scripts/test-controlled-change-state.mjs
scripts/test-controlled-change-migration.mjs
scripts/test-controlled-change-admission.mjs
scripts/test-controlled-change-repo-files.mjs
scripts/test-controlled-change-harness.mjs
scripts/test-controlled-change-claims.mjs
scripts/test-controlled-change-effects.mjs
scripts/test-controlled-change-effect-dag.mjs
scripts/test-controlled-change-capsule-composer.mjs
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
```

**Read-only invariant anchors**（默认必须 byte-identical，不在 U-block `Files`）：

```text
.claude/settings.json
.codex/hooks.json
.codex/codex-hook-adapter.mjs
.claude/hooks/project-scope-guard.mjs
.claude/hooks/route-guard.mjs
.claude/hooks/session-end.mjs
.claude/skill-os/optional-workflow-graph.yaml
.claude/skills/office/resolving-merge-conflicts/scripts/conflict-transaction.mjs
scripts/test-route-guard.mjs
framework-audit/2026-08-20-routing-steering-handshake/E3-L0-PROBE.md
framework-audit/2026-08-20-routing-steering-handshake/EXEC-DELIVERY-E1E2.md
framework-audit/2026-08-30-mattpocock-six-skills-integration/FINAL-MASTER-PLAN.md
framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-RECEIPT.md
framework-audit/2026-08-30-mattpocock-six-skills-integration/REVIEW-LEDGER.md
framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-MANIFEST.tsv
framework-audit/2026-08-30-mattpocock-six-skills-integration/PUBLISH-ATTESTATION.json
```

只有 Gate G 先产生新 plan SHA、精确说明为何 trusted wrapper/registration/route owner 必须变更，并获得新批准，这些 anchor 才能转入 planned mutation set。E1/E2/E3 与 conflict helper 的本体缺陷由各自 owner 修复；controlled-change 只在 Gate M 验证安全接口/不依赖它们，不做驱动式修补。

约束：不新增 daemon、authority registry、dynamic plugin 目录或 repo-global lease 服务。若 implementation 发现必须新增未列文件，返回 `NEEDS_CONTEXT`，更新计划与 approval digest，不能现场扩写。

### 19.3 Wave 拓扑

```text
Gate P（当前停点：批准整份 implementation plan）
  ↓
Gate M0（立即 containment：新 v1 Git effect 保持禁用；冻结 RED mutants）
  ↓
Gate M（v1 read-only census / evidence split / clean implementation baseline）
  ↓
Wave 1A: U-001 scratch RED/candidate
  ↓
Gate C（Foundation containment exact live subset）
  ↓
Wave 1B: U-001 live containment（tests → linear store → guard last）
  ↓
Gate N（至少20次contained-Foundation真实operation；冻结 capability vector）
  ├─ N0=STOP → STOP_AT_CONTAINED_FOUNDATION
  └─ N0=ENTER；N-C/N-D/N-E/N-G 各自 BUILD 或 SKIP_DARK
  ↓
Wave 2（base scratch，可并行）: U-002 | U-004（含 minimal repo-only effect host）
  ↓
Gate B（v1-protected exact migration bundle + reverse + fresh-test plan）
  ↓
Wave 3A: U-003 pre-activation segment（既有migration operation经public advance安装capsule/minimal host，停在DRAIN并完成fresh proof；U-003仍IN_PROGRESS）
  ↓
Gate F（DRAIN_V1 → v2；fresh Claude/Codex promotion）
  ↓
Wave 3B: 同一U-003 / operation M经public advance执行activation CAS并验证receipt；此后U-003才DONE
  ↓
Wave 4（独占scratch build可并行；repo source install按U-ID串行）: U-006 | [N-C BUILD→U-005] | [N-D BUILD→U-007]
  ↓
Wave 5（独占adapter scratch build可并行；repo source install按U-ID串行）: [N-E BUILD且U-007完成→U-008] | [N-G BUILD且U-007完成→U-009]
  ↓
Wave 6: U-011（安装最后一组dormant runtime UX/evidence source；不从worktree执行）
  ↓
Wave 7: U-010（唯一composer；包含U-011 postimage，一次静态组合/fresh-proof/activate）
  ↓
Wave 8: U-012
  ↓
Wave 9: U-013（disabled → shadow/explicit）
  ↓
Gate S（按 surface shadow → mandatory；U-013 closeout）
  ↓
Standard 停止线；Gate H 只允许开启一份新的 High-assurance plan
```

循环检测结果：无环。U-001 只安装最小 Foundation live subset，且 Gate N 前没有 v2 scratch candidate；`N0=ENTER` 是 U-002/U-004 的外部硬依赖，无证据分支直接停止。U-004 首建 minimal repo-only host与唯一pure composer，U-003串行安装base capsule并独占stable launcher/guard migration。U-005/U-007/U-008/U-009分别受N-C/N-D/N-E/N-G约束，各自先在scratch构建/测试，再用base repo-files经public prepare/advance按U-ID串行安装其独占dormant source；active capsule仍只读fixed common-dir bundle，不从worktree加载。U-011随后以同样方式安装最后一组CLI/kernel/state/receipt source。只有所有selected source postimage冻结后，U-010才以一个upgrade operation静态生成包含U-011与全部selected modules的runtime entry，fresh-proof后CAS activation。U-010不修改stable launcher，因此不触发普通升级之外的Gate M；`gate_disposition=SKIP_DARK`的U-block不实例化。若实际ownership冲突，先串行化，不由WA自行合并。

### 19.4 Human gates

| Gate | 何时 | 必须展示 | 通过者 | 失败/撤回 |
|---|---|---|---|---|
| **Gate P** | 现在 | 最终 plan SHA、全 review ledger、推荐档、成本/停止线 | 用户 | 不实施；本 Session 结束 |
| **Gate M0** | Gate P 后的第一个 implementation gate | 明示新 v1 Git effect 为 disabled；compound-command/concurrent-consume/false-publish/route-non-authority RED evidence；migration禁止Git/任意shell effect，只允许Gate C exact repo subset及containment后canonical public prepare/advance | 用户 + safety reviewer | 停在 legacy read-only；不得用脆弱v1 effect实施迁移 |
| **Gate M** | 任一 Foundation/v2 repo write 前 | v1 zero required/invalid；raw state/receipt/index SHA；81-row historical + 8/81 live drift；pre/post-publish evidence split；program-safe Git census；E3/route interface；route non-dry-run renderer/schema PASS、四类verdict均非authority、workflow推荐具下游input proof；personal只读 tuple verdict；clean/isolated baseline | 用户 + safety reviewer | route owner缺陷未修或input proof缺失则保持v1 read-only；不得安装/清理/重放，也不得由controlled-change越界修route/graph |
| **Gate C** | U-001 Foundation live subset 前 | exact live subset/pre/post/reverse；tests→linear-store→guard-last顺序；逐边界crash结果；Git effect default-deny | 用户 + safety reviewer | 丢弃scratch candidate；现有v1 effect继续禁用 |
| **Gate N** | U-001 containment后、任何v2 byte前 | ≥20次repo-only operation及adjacent denied/task-local tuple；摩擦/时延/零bypass；N0与N-C/N-D/N-E/N-G逐项证据、BUILD/SKIP及蕴含关系 | 用户 + architecture reviewer | N0无证据即STOP；子能力无证据即SKIP_DARK且对应文件不得创建；样本不足则NEEDS_EVIDENCE |
| **Legacy Recovery Gate** | Gate M 发现 v1 required/invalid | exact raw state、frozen v1唯一 recovery、禁止项 | 用户 + safety reviewer | v2 全停；legacy fail closed |
| **Gate B** | migration bootstrap 前 | exact source files与common-dir operational targets；已批准migration operation/generation；dependency/capsule→DRAIN→final guard-last顺序；逐边界crash/reverse；v1 compat SHA与fresh-test计划 | 用户 | 保持contained v1；scratch bundle可丢弃，v2 operation不推进 |
| **Gate F** | v2 激活前 | zero legacy required/invalid、M唯一/current generation、完整install crash matrix与mutants、Claude/Codex fresh/private ABI、pre-entry/direct-writer/reverse、base source digest + optional独占path absence map | 用户 | 不调用下一次advance M；pointer保持DRAIN_V1/previous |
| **Gate X** | v2 snapshot 的确定性恢复不成立，且`RECOVERY_REQUIRED(selector=AWAIT_GATE_X)`已durable | exact snapshot/generation、per-resource old/owned/foreign readback、允许的单一`RESUME_EXACT`或`ABORT_OWNED`模式、owned set、原gate与新approval digest | 用户 + safety reviewer | 不写`RECOVERY_CHOICE`；原generation冻结，只允许status/read-only reconcile |
| **Gate E** | 每个 personal/external operation | exact target、pre/post hash、backup/reverse、不可逆点 | 用户 | adapter 不执行 |
| **Gate R** | 每次真实 remote publication | literal remote/dst/expected-old/new OID；raw object graph无replace/graft；完整local object closure/no-lazy-fetch；FF证明与force-like CAS摘要 | 用户 | 保留 local private ref；不 push |
| **Gate G** | policy/schema/privacy/launcher或selected capsule权限面扩大 | Gate N vector digest、base digest、selected独占module path/SHA、literal import profile、semantic diff、兼容/审计/隐私影响 | owner + 用户 | current base capsule继续；U-010不compose/activate，新 prepare拒绝未选能力 |
| **Gate V** | 新 verifier 接入 precommit/agent 时 | 重复 p50/p95、120s cap、最少 15s headroom；分片 mapping 的 mutation-kill 证据；显式 full-suite 路径 | quality gate + CI owner | 不接入新串行 suite；先优化/安全分片 |
| **Gate S** | shadow 转 mandatory | 每申请surface至少20次数据、3次recovery drill、false positive、双 harness parity | 用户 | 继续shadow/explicit或退v1-only |
| **Gate H** | High-assurance 进入条件命中 | 事故证据、TCB 改变、daemon/OS 成本 | 用户，新计划 | Standard 保持，不偷加重型机制 |

### 19.5 Phase ownership

| Phase | U-block / Gate | 编排模式 | phase_type | model_tier | Agent 分工 | 执行顺序 | 具体产出 | 阶段门控 | 写入边界 |
|---|---|---|---|---|---|---|---|---|---|
| P1 Foundation containment | Gate M0 + Gate M + Gate C + U-001 | Sequential Chain + Supervisor | task_execution | core-execution | WA-001独占U-001 Files；EA-001做safety+contract冷审 | M0→M→scratch RED→Gate C→live subset | U-001 exact 7 Files、raw-v1 digest、mutant/crash evidence | U-001全验证PASS且Gate N输入可复算 | Gate C前scratch only；之后仅Foundation subset；无v2 bytes |
| P2 Standard need evidence | Gate N | Supervisor | task_execution | core-execution | top-level owner汇总只读脱敏样本；EA-002独立判architecture+safety；无writer WA | 严格等待P1；20次operation后一次裁决 | canonical N0/N-C/N-D/N-E/N-G vector、digest与BUILD/SKIP/STOP证据 | 用户+architecture reviewer签署Gate N；不足即NEEDS_EVIDENCE/STOP | 零repo/runtime写；不得为取证生成v2 bytes |
| P3 Base v2 candidate | U-002 + U-004 | Parallel Fan-out + Supervisor | task_execution | core-execution | WA-002/WA-004各自独占Files并行；EA-003做state/patch ownership审查 | Gate N N0=ENTER后并行，汇聚后进Gate B | U-002/U-004 exact Files的两个scratch bundles与digest | 两块DONE、ownership无交集、Gate B payload完整 | scratch only |
| P4 Side-by-side bootstrap | U-003 + Gate B/F | Sequential Chain + Supervisor | task_execution | core-execution | WA-003独占U-003 Files；EA-004做architecture/safety/parity/quality | Gate B→dependency source→M→capsule→DRAIN→guard-last→fresh→Gate F→advance activation | U-003 exact Files、content-addressed base capsule、M/activation receipt | Gate F所需fresh/crash/private-ABI断言先PASS；随后activation receipt验证通过，U-003才DONE | 仅既有migration operation经public advance写source/capsule/pointer |
| P5 Base orchestration + selected core capabilities | U-006 + [U-005] + [U-007] | Parallel Fan-out内建 + Serial install + Supervisor | task_execution | core-execution | WA-006及Gate N选中的WA-005/WA-007独占modules；对应EA审role/concurrency/DAG | scratch build可并行；repo dormant source install按U-ID串行 | U-006 Files及selected U-005/U-007 Files、各自source postimage receipt | 所有实例化U-block DONE；SKIP_DARK无instance/PASS/wait | 不改active capsule；optional不得改base Files |
| P6 Selected external/Git adapters | [U-008] + [U-009] | Parallel Fan-out内建 + Serial install + Supervisor | task_execution | core-execution | selected WA-008/WA-009独占adapter；EA分别审personal/Git | 严格等待P5/U-007；scratch可并行，repo install按U-ID串行 | selected U-008/U-009 exact Files与dormant source receipts | BUILD分支suite PASS；SKIP分支module absence/base digest不变 | fixture/temp/bare-local；无真实personal/remote effect |
| P7 Final runtime source | U-011 | Sequential Chain + Supervisor | task_execution | core-execution | WA-011独占CLI/kernel/state/receipt Files；EA-007审UX/evidence/parity | 等待P5/P6全部selected receipts后单独安装 | U-011 exact Files与dormant postimage receipt | active capsule SHA不变、worktree-load mutant被杀 | 只装dormant source；不执行mutable worktree source |
| P8 Selected capsule composition/lifecycle | U-010 + Gate G | Sequential Chain + Supervisor | task_execution | core-execution | WA-010独占U-010 Files；EA-008审architecture/parity/lifecycle | 等待U-011与全部selected postimages→Gate G→compose→fresh→public advance | U-010 exact Files、literal-import profile、active capsule SHA与activation receipt | launcher byte-identical；双harness fresh PASS；U-010 DONE | 唯一composer/activation owner；stable launcher只读 |
| P9 Full verification | U-012 + Gate V | Supervisor | task_execution | core-execution | WA-012只写verifier/CI owned Files；独立quality EA复算全部evidence | 严格等待U-010 receipt；contract→mutation→budget→full matrix | U-012 exact Files、assertion/evidence manifest与budget report | 全BLOCKING PASS、criteria PASS、Gate V预算PASS | repo/CI only；fixtures/temp/bare-local；不使用hidden skip |
| P10 Per-surface rollout/closeout | U-013 + Gate S | Sequential Chain + Supervisor | task_execution | guided-execution（只执行已冻结metrics/docs/policy投影，不做新架构裁决） | WA-013独占三份治理Files；EA-010审quality+governance | disabled→shadow→explicit；每surface证据独立；Gate S后才mandatory | U-013 exact Files、per-surface metrics/recovery ledger与Gate S verdict | 每surface≥20次、3次recovery、parity=100%；到Standard停止线 | 仅policy/docs；Git/personal仍逐operation Gate R/E |

---

## 20. U-blocks（九字段合同）

### U-001

```yaml
U-001:
  Goal: 只以最小Foundation live patch关闭v1 compound-Git/one-use/publication证据缺口并保留legacy recovery；Gate N前不生成任何v2 bytes
  Source: R-001, R-003, R-005, R-006, R-007, R-009, R-011
  Dependencies: external: Gate P, Gate M0, Gate M; live containment phase: Gate C
  Files: .claude/hooks/controlled-change-guard.mjs; scripts/controlled-change.mjs; scripts/candidate-manifest.mjs; scripts/lib/controlled-change/git-object-reader.mjs; scripts/fixtures/controlled-change/v1-containment-cases.json; scripts/test-controlled-change.mjs; scripts/validate-skill-integration-receipt.mjs
  Approach: 先在scratch冻结v1 raw bytes/SHA与8/81 live drift，并只写能唯一杀死compound-Git、parallel one-use与false PUBLISHED OID/parent/path-set的Foundation RED selectors；Gate C批准后按fixtures/tests/validator→linear store→guard-last应用全部且仅有本块Files。全过程不mint/consume任何Git或任意shell effect，每一边界process-fresh复验，guard失败即保持Git effect dark。historical verifier从6aaa1c6 commit blobs证明OID/single-parent/baseline/path-set，不对live 8/81 drift报假失败；历史receipt/attestation不改写。v2 schema/policy/compat/contract/journal/launcher/host/adapter及其tests在Gate N前既不安装也不在scratch创建
  Read List: FINAL-MASTER-PLAN.md sections 1–6、8–10、15–18、19.4；scripts/controlled-change.mjs 与 scripts/controlled-change-controller.mjs 全部 v1 schema/state/atomic-write 段；.claude/hooks/controlled-change-guard.mjs 全文；.claude/skill-os/controlled-change.yaml；六 Skill FINAL-MASTER-PLAN.md、IMPLEMENTATION-RECEIPT.md、REVIEW-LEDGER.md、CANDIDATE-MANIFEST.tsv、PUBLISH-ATTESTATION.json；scripts/candidate-manifest.mjs；scripts/validate-skill-integration-receipt.mjs；R-011两轴finding/reproduction；Gate M evidence manifest
  Test scenarios: happy=Foundation subset按tests→linear-store→guard-last应用且20次repo-only operation可运行、v1 terminal raw bytes/SHA不变、published commit blob lineage成立；edge=crash在每个live subset边界、8/81合法live drift、aggregated history、缺terminal manifest、typed NOT_LOADED；error=guard先于线性store、partial apply后effect重新开放、compound Git只分类首verb、parallel one-use重用、伪40-hex OID/错parent/错path-set/replace-graft ancestry仍PASS、promisor缺对象触发lazy network、改写legacy evidence、Gate N前出现任一v2文件
  Verification: node scripts/test-controlled-change.mjs --containment --compound-git-effects --parallel-one-use=32 --apply-order=tests,linear-store,guard-last --crash-every-containment-boundary --git-effects-remain-dark --raw-v1-evidence-immutable --assert-no-v2-bytes && GIT_NO_REPLACE_OBJECTS=1 GIT_NO_LAZY_FETCH=1 node scripts/candidate-manifest.mjs --verify-publish-receipt --published-commit 6aaa1c6511af6845042e9dc541524934ed57bfe9 --require-single-parent --require-exact-path-set --reject-replace-graft --reject-promisor-missing && node scripts/validate-skill-integration-receipt.mjs --prepublish-and-attestation --require-object-existence
  Status: PLANNED
```

Gate C 的 Foundation live subset 精确为 U-001 的全部 Files，应用顺序是：`scripts/fixtures/controlled-change/v1-containment-cases.json` → `scripts/lib/controlled-change/git-object-reader.mjs` → `scripts/candidate-manifest.mjs` / `scripts/validate-skill-integration-receipt.mjs` / `scripts/test-controlled-change.mjs` → `scripts/controlled-change.mjs` → `.claude/hooks/controlled-change-guard.mjs`。Gate N 前除这些 Foundation bytes 与其只读 evidence 外没有第二组候选。

完成门：上述 subset 必须按依赖顺序完成且每个 crash boundary 唯一可恢复；EA 逐条证明没有未知放行，raw v1 evidence digest 零变化，并扫描未来 v2 inventory 全部不存在。任何允许式 fallback、把 PUBLISHED 写回 committed receipt、把 legacy history 当新 authority、或门前预建 v2 均为 BLOCKING。Rollback：scratch RED candidate可丢弃；live subset只按 exact owned postimage reverse，但绝不恢复已知脆弱的Git effect开放状态——失败时保留default deny并进入人工恢复。U-001 完成后必须先过 Gate N；未过不得启动 U-002。

### U-002

```yaml
U-002:
  Goal: 在N0进入Standard后于scratch首次构建v2 strict schema/policy、raw-v1 compatibility/receipt contract、prepare/advance/status内核、线性化journal与唯一next-action投影
  Source: R-001, R-003, R-006, R-008, R-009, R-011, R-016
  Dependencies: U-001, external: Gate N N0=ENTER_STANDARD
  Files: .claude/skill-os/controlled-change.schema.json; .claude/skill-os/controlled-change.yaml; scripts/controlled-change.mjs; scripts/lib/controlled-change/contract.mjs; scripts/lib/controlled-change/receipt-schema.mjs; scripts/lib/controlled-change/compat/v1/core.mjs; scripts/lib/controlled-change/compat/v1/controller.mjs; scripts/lib/controlled-change/compat/v1/guard.mjs; scripts/lib/controlled-change/kernel.mjs; scripts/lib/controlled-change/state-store.mjs; scripts/fixtures/controlled-change/contract-cases.json; scripts/fixtures/controlled-change/v1-compat-cases.json; scripts/fixtures/controlled-change/state-cases.json; scripts/test-controlled-change-contract.mjs; scripts/test-controlled-change-migration.mjs; scripts/test-controlled-change-state.mjs
  Approach: 先验证Gate N evidence digest与U-001 inventory absence proof，再首次生成v2 bytes；strict contract拒绝未知字段/隐式target/effect，compat只读raw v1且不导入旧authority，receipt状态与writer同源。三个public entry隐藏全部状态转换；prepare可先无approval写PREPARED+摘要，advance是唯一live/effect推进口；caller只能提交request+可选approval evidence或operation+expected-generation+必要的新gate evidence；per-operation append lock/O_EXCL sequence + previous-event hash串行写入，authority/active/receipt全由journal投影
  Read List: FINAL-MASTER-PLAN.md sections 4.4、7–11、15–17；Gate N完整capability vector与U-001 raw-v1/evidence digest；scripts/project-pin.mjs proposal/epoch CAS；scripts/project-lease.mjs no-age-steal/recovery；.claude/hooks/lib/project-substrate.mjs atomic write/fsync/identity；.claude/observability/scripts/write_observation.py journal recovery；memory/scripts/consolidate_memory.py proposer/approver/promoter字段与R-016两轴finding；v1 atomicWriteJson lost-update review finding；R-011 route reminder/first-task-text findings
  Test scenarios: happy=Gate N后首次生成v2 contract/compat、prepare无evidence→PREPARED/approval payload→advance绑定→required→active→repo-effect→verify→complete；edge=raw v1 terminal byte-identical可读、原始显式低风险请求随prepare绑定、duplicate attempt、approval gate、expiry、approval-current required-without-active只resume、approval-current partial repo apply全owned/old只roll-forward、approval-current Git-local只补receipt、required-missing-active/partial-owned/Git-local任一+approval-expired都只选AWAIT_GATE_X、foreign先进入RECOVERY_REQUIRED再由Gate X fresh approval形成新generation choice、receipt-before-cleanup、两个disjoint operations；error=Gate N digest缺失或门前已有v2 bytes、unknown schema/glob/path escape/free shell/dynamic adapter、obligation reminder或promoted-memory/reviewer/mattered记录作approval、旧authority导入、prepare产生live effect、stale generation、malformed projection、partial journal、同一snapshot同时接受resume/abort/reverse、required-missing-active/partial-owned/Git-local+expired错误选RESUME_EXACT、`RECONCILE_READONLY`被当selector、未知`REVERSE_OWNED` mode被接受、choice未绑定snapshot/generation/owned-set、worker自选recovery mode、simultaneous append/one-use lost update、two legal next actions、unknown retry、caller自带next_state/authority
  Verification: node scripts/test-controlled-change-contract.mjs --all --obligation-census --route-reminder-non-authority --memory-review-non-authority --require-exact-selectors --require-gate-n-first-write && node scripts/test-controlled-change-migration.mjs --raw-v1-fixtures --assert-byte-identical --zero-authority-import && node scripts/test-controlled-change-state.mjs --model-all-transitions && node scripts/test-controlled-change-state.mjs --crash-every-journal-boundary --assert-single-next-action --selector-precedence=unknown,gate-x,resume --reject-expired-resume=required-missing-active,partial-owned,git-local --reject-dual-recovery-snapshot --reject-unknown-recovery-mode --require-approval-bound-recovery-choice && node scripts/test-controlled-change-state.mjs --parallel-append=32 --assert-no-lost-update && node scripts/test-controlled-change-state.mjs --replay
  Status: PLANNED
```

BLOCKING：任何 projection 可独立改写、approval 可由 worker/caller任意伪造、expiry 自动清理、`EFFECT_UNKNOWN` 可重试、并发 append 丢事件或 crash 后存在两个合法动作。Rollback：scratch-only；state schema 未经 Gate B 不进入 live。

### U-003

```yaml
U-003:
  Goal: 由contained v1安装source dependencies，再创建唯一v2 migration operation M，并只经public advance按capsule→durable DRAIN→final guard-last→fresh proof→Gate F→activation CAS完成side-by-side迁移
  Source: R-001, R-003, R-005, R-008, R-009, R-011
  Dependencies: U-001, U-002, U-004, external: Gate B
  Files: .claude/skill-os/controlled-change.schema.json; .claude/skill-os/controlled-change.yaml; .claude/hooks/controlled-change-guard.mjs; scripts/controlled-change.mjs; scripts/controlled-change-controller.mjs; scripts/lib/controlled-change/admission.mjs; scripts/lib/controlled-change/launcher.mjs; scripts/lib/controlled-change/lifecycle.mjs; scripts/lib/controlled-change/capsule-composer.mjs; scripts/lib/controlled-change/contract.mjs; scripts/lib/controlled-change/kernel.mjs; scripts/lib/controlled-change/state-store.mjs; scripts/lib/controlled-change/receipt-schema.mjs; scripts/lib/controlled-change/git-object-reader.mjs; scripts/lib/controlled-change/effect-host.mjs; scripts/lib/controlled-change/compat/v1/core.mjs; scripts/lib/controlled-change/compat/v1/controller.mjs; scripts/lib/controlled-change/compat/v1/guard.mjs; scripts/lib/controlled-change/patch-pipeline.mjs; scripts/lib/controlled-change/adapters/repo-files.mjs; scripts/fixtures/controlled-change/contract-cases.json; scripts/fixtures/controlled-change/state-cases.json; scripts/fixtures/controlled-change/harness-cases.json; scripts/fixtures/controlled-change/effect-cases.json; scripts/fixtures/controlled-change/capsule-profile-cases.json; scripts/fixtures/controlled-change/v1-compat-cases.json; scripts/fixtures/controlled-change/v1-containment-cases.json; scripts/test-controlled-change.mjs; scripts/test-controlled-change-contract.mjs; scripts/test-controlled-change-state.mjs; scripts/test-controlled-change-migration.mjs; scripts/test-controlled-change-admission.mjs; scripts/test-controlled-change-repo-files.mjs; scripts/test-controlled-change-harness.mjs; scripts/test-controlled-change-effects.mjs; scripts/test-controlled-change-capsule-composer.mjs; scripts/verify-codex-wiring.mjs
  Approach: Gate B冻结repo source与§15.1 operational targets；contained-v1 effect-empty operation dependency-first安装除final guard外的source，CLI entry在依赖后；新CLI的public prepare创建M，contained guard随即只准M的exact advance/status；advance以same-filesystem staging/no-replace/fsync发布content-addressed base-only capsule，写legacy index，再durable DRAIN，随后由minimal repo-files host原子替换final guard；fresh双端证明后停在DRAIN且U-003保持IN_PROGRESS，只有用户通过Gate F后才由同一advance M内部CAS activation并产receipt，随后U-003转DONE。Gate F receipt同时冻结base kernel/state-store/effect-host/policy/git-object-reader/composer digest与四组optional独占path的absence map，作为后续capability mutation boundary。保持settings/codex hook/adapter anchors byte-identical，不暴露lifecycle activate或任意install path
  Read List: FINAL-MASTER-PLAN.md sections 8.1、14–16、19.2–19.4；Gate M0/M/C/N/B evidence；§15.1完整operational target与crash matrix；.claude/settings.json PreToolUse registration；.codex/hooks.json合法顶层/已授信entry；.codex/codex-hook-adapter.mjs project-scope piggyback、hook-failure-decision两种调用与failure fallback；.claude/hooks/project-scope-guard.mjs deny/updatedInput/exception；E1/E2 delivery与E3-L0接口证据；scripts/verify-codex-wiring.mjs S5b/S11/S11b/S12；U-001 containment与U-002 contract/compat/core cases；U-004 minimal host evidence
  Test scenarios: happy=contained v1 dependency install→public prepare M→base capsule→DRAIN→guard-last→fresh proof→Gate F PASS→public advance activation+base/absence digest；edge=private ABI有/无--repo、M PREPARED但无capsule、DRAIN且final guard未写、Gate F等待期间status/exact recovery、activation CAS后receipt前、fresh loader、Codex trust unchanged、fresh Claude/Codex各执行同一六个approval-selector fixture（required-missing-active/partial-owned/git-local × current/expired）；error=Gate F前activation可发生、Gate F未冻结base/optional absence、base含N-C/D/E/G代码、operational target无owner、dependency前写CLI、DRAIN前写final guard、M之外operation推进、DRAIN后新prepare、第四activate/install入口、cross-device rename、partial capsule可被pointer选择、legacy nonterminal出现仍激活、direct target writer、wrapper/operator/redirect/substitution、private ABI stdout/错exit、任一harness省略六fixture之一、current不唯一RESUME_EXACT或expired不唯一AWAIT_GATE_X
  Verification: node scripts/test-controlled-change.mjs --containment --compound-git-effects --parallel-one-use=32 && node scripts/test-controlled-change-migration.mjs --public-entry-only --operation=M --ordered=dependencies,capsule,drain,guard-last,fresh,gate-f,activate --deny-activation-before-gate-f --crash-every-install-boundary --assert-single-next-action --operational-target-owner --zero-legacy-authority-import --freeze-base-capability-boundary --reverse && node scripts/test-controlled-change-admission.mjs --pre-witness --controller-argv-only --deny-direct-writer --drain-allows-existing-operation-only && node scripts/test-controlled-change-harness.mjs --semantic-conformance-both --private-hook-failure-abi --raw-v1-v2 --approval-selector-cross-product=required-missing-active,partial-owned,git-local --approval-states=current,expired --require-identical-fixture-ids && node scripts/test-controlled-change-effects.mjs --repo-only-bootstrap --external-git-unselectable && node scripts/test-controlled-change-capsule-composer.mjs --base-profile-only --literal-imports --no-runtime-discovery && node scripts/verify-codex-wiring.mjs；随后 fresh Claude 与 fresh Codex 各跑同一 harness-cases corpus中的六个approval-selector fixture ID，并逐项比较 verdict/reason digest完全相等；缺任一fixture或任一端未执行均FAIL
  Status: PLANNED
```

Gate F 只有在 legacy zero required/invalid、M是唯一非终态migration operation、完整install crash matrix、compound/concurrent/publication mutants、private `hook-failure-decision` ABI、fresh 双端 controlled-mode digest、trusted Codex entry bytes unchanged、launcher expected-old CAS/reverse drill，以及base source digest + optional独占path absence map全过后才能通过。fresh proof 完成但 Gate F 未通过时，U-003保持`IN_PROGRESS`且pointer保持`DRAIN_V1`；Gate F PASS后才允许同一M的activation generation，receipt验证通过后U-003才`DONE`。失败：保持/回 `DRAIN_V1` 或 previous，只允许 `status`/exact `advance M`恢复；不得删 required evidence来“解锁”。

### U-004

```yaml
U-004:
  Goal: 在scratch建立candidate census、最小repo-only effect host/repo-files CAS adapter与唯一pure capsule composer，精确支持base profile及后续静态模块组合
  Source: R-001, R-003, R-006, R-008, R-009, R-011
  Dependencies: U-001, external: Gate N N0=ENTER_STANDARD
  Files: scripts/lib/controlled-change/patch-pipeline.mjs; scripts/lib/controlled-change/effect-host.mjs; scripts/lib/controlled-change/capsule-composer.mjs; scripts/lib/controlled-change/adapters/repo-files.mjs; scripts/fixtures/controlled-change/effect-cases.json; scripts/fixtures/controlled-change/capsule-profile-cases.json; scripts/test-controlled-change-repo-files.mjs; scripts/test-controlled-change-effects.mjs; scripts/test-controlled-change-capsule-composer.mjs
  Approach: worker只在证明writable roots不含live/common-dir的scratch生成logical destinations；candidate pipeline只做census；minimal host接收composer生成的封闭registry/scheduler，base profile只有repo-files+sequential scheduler，external/Git/unknown都不可选。composer只接受canonical Gate N vector、base digest与literal module path/blob SHA，生成静态runtime entry，不做runtime discovery。repo-files adapter对exact path/kind/mode/pre/post/reverse逐资源CAS，自己不能推进kernel state，也不暴露第二direct apply CLI
  Read List: FINAL-MASTER-PLAN.md sections 7、12.2、16；六 Skill FINAL-MASTER-PLAN.md 的 scratch worker/trusted apply/allowlist formulas；.codex/workflow-runner.mjs 的 scratch workspace isolation；scripts/test-project-transaction.mjs 的 staging/no-replace/byte-exact CAS cases
  Test scenarios: happy=minimal host经base profile调用update/create/rename、composer输出literal repo import；edge=dirty unrelated WIP byte-identical、symlink/type/mode/unicode/linked-worktree、partial readback、任意Gate N BUILD/SKIP vector；error=bootstrap无host、base profile含未选module、runtime扫描/动态import、external/Git可选、direct CLI调用、undeclared file、path traversal、preimage drift、harness direct writer、partial crash、reverse时current非owned postimage
  Verification: node scripts/test-controlled-change-effects.mjs --repo-only-bootstrap --external-git-unselectable --single-mutation-owner && node scripts/test-controlled-change-capsule-composer.mjs --base-profile-only --literal-imports --module-sha-bound --reject-runtime-discovery && node scripts/test-controlled-change-repo-files.mjs --all-kinds --effect-host-only && node scripts/test-controlled-change-repo-files.mjs --preserve-unrelated-dirty-wip && node scripts/test-controlled-change-repo-files.mjs --crash-and-owned-reverse --classify-old-owned-foreign
  Status: PLANNED
```

BLOCKING：delta census 分母必须来自 candidate 与 live identity 的完整集合，不能只检查 manifest 中已知文件。Rollback：Wave 2 scratch-only；bootstrap 后 reverse 仍只对 owned postimage 生效。

---

### U-005

```yaml
U-005:
  Goal: 增加 common-dir 身份下 one-manifest-per-operation、有序资源 claim、disjoint ACTIVE、线性化 generation推进与精确 recovery/no-age-steal
  Source: R-001, R-005, R-006, R-008, R-009
  Dependencies: U-002, U-003, U-004, external: Gate F, Gate N N-C=BUILD
  Files: scripts/lib/controlled-change/resource-claims.mjs; scripts/lib/controlled-change/concurrency-scheduler.mjs; scripts/fixtures/controlled-change/claim-cases.json; scripts/test-controlled-change-claims.mjs
  Approach: 只实现符合U-002 stable scheduler interface的独占module，不改kernel/state-store/base host；对repo-path ancestor overlap、external path、local-ref、remote-ref、runtime生成canonical key，完整resource set不相交才允许多operation ACTIVE，action按序短时获取；claim只改善合作式调度，journal append和资源apply仍各自CAS。module先scratch验收，再由base repo-files通过本U-block的public prepare/advance exact operation安装dormant source；active bundle SHA必须不变，最终仅U-010 composer可静态链接
  Read List: FINAL-MASTER-PLAN.md sections 4.3、10–11、16；scripts/project-lease.mjs 的 acquire/release/owner/recover 段；.claude/hooks/lib/project-substrate.mjs 的 common-dir/worktree identity 段；scripts/test-project-transaction.mjs 的 concurrency/PID-reuse/no-age-steal cases
  Test scenarios: happy=disjoint manifests并行、overlap后到保持RESOURCE_BUSY；edge=ancestor/descendant path、linked-worktree file独立而ref共享、多资源排序、owner crash/PID reuse；error=N-C为SKIP时任一U-005独占file存在、修改kernel/state-store/base host、manifest union、guard猜owner、age steal、stale generation、lost journal update、partial claim leak、external process漂移
  Verification: node scripts/test-controlled-change-claims.mjs --scheduler --workers=16 --one-manifest-per-op --require-gate=N-C --assert-base-digests-unchanged --install-dormant-source --assert-active-bundle-unchanged && node scripts/test-controlled-change-claims.mjs --overlap=ancestor,descendant,ref --linked-worktrees && node scripts/test-controlled-change-claims.mjs --no-age-steal --pid-reuse --no-lost-update --crash-every-boundary
  Status: PLANNED
```

BLOCKING：死锁、claim 泄漏、按时间偷锁、将 claim 误写成外部进程强保证。Rollback：scratch module丢弃；若已组合则U-010以expected-current pointer CAS回previous，释放仅由exact owner且journal允许的claims；不改base state code。

### U-006

```yaml
U-006:
  Goal: 把 writer前compile/prepare、approval evidence、risk/effect触发、三入口与六值completion映射接入Plan Agent/Orchestrator，同时明确隔离 route reminder 与可绑定的 E3 attestation
  Source: R-001, R-003, R-005, R-007, R-010, R-011, R-013, R-015, R-016, R-017
  Dependencies: U-003, U-004, external: Gate F
  Files: .claude/agents/plan-agent.md; .claude/agents/orchestrator.md; scripts/fixtures/controlled-change/contract-cases.json; scripts/test-controlled-change-orchestration.mjs
  Approach: 角色合同要求派发writer前prepare；低风险显式原请求可直接绑定，其他先返回PREPARED/approval payload再由advance绑定；Orchestrator只能调用入口；worker/EA必须在机械隔离scratch；.session-obligation/recommendedSkills/PLAN_MODE hint以及semantic-memory stable/promoted/reviewer/mattered均永不作批准或dispatch authority。Gate N vector只由U-002 canonical contract编译，Plan/Orchestrator与Claude/Codex只消费同一digest projection；BUILD才实例化U-block，SKIP_DARK只是gate annotation且不进入六值completion、不计PASS、不等待。Gate M时E3若存在则只适配其attested event interface，若不存在则绑定当前top-level request digest，绝不重解transcript；STOP/SINGLE/MULTI/FRAMEWORK_FLOW/soft candidate无论正确、误派或renderer失败均只能作为不可信提示，不能mint approval、满足obligation或触发writer；route/graph由原owner修复，本块只冻结其通过Gate M后的production schema与bytes，不改workflow graph、不把controlled-change暴露成Skill
  Read List: FINAL-MASTER-PLAN.md sections 0、4.4、5.1、8、17–20；.claude/agents/plan-agent.md 的 U-block/Source/Status/Research Gate 段；.claude/agents/orchestrator.md 的 supervisor/human gate/escalation 段；六 Skill FINAL-MASTER-PLAN.md 的 controlled-change U-block、files、publisher、non-goals；.claude/skill-os/optional-workflow-graph.yaml 的状态真值边界与scene B code-recon paths；.claude/hooks/route-guard.mjs E1/E2、skillDecision与production STOP renderer；framework-audit/2026-08-20-routing-steering-handshake/EXEC-DELIVERY-E1E2.md；framework-audit/2026-08-20-routing-steering-handshake/E3-L0-PROBE.md；framework-audit/2026-09-02-skill-responsibility-audit/REPORT.md及R-013/R-015/R-017两轴finding；memory/semantic/reviews.jsonl与memory/scripts/consolidate_memory.py的R-016角色归因finding；scripts/test-route-guard.mjs对应fixtures
  Test scenarios: happy=低风险repo U-block在首个writer前prepare且原请求绑定approval、两harness对同Gate N digest裁出同一BUILD graph、E3 attested event若存在则绑定exact event/task digest、route四类verdict/soft-candidate与memory stable/promoted projection均保持non-authority；edge=16种N-C/D/E/G组合、SKIP无instance/status/PASS/wait、无E3时当前request digest、E3 distance-2 event、礼貌词meta-question误派SINGLE、`.docx`假绿/production soft-candidate崩溃、framework-flow提及、code-recon path recommendation、promoted reviewer与真实approver不一致、protected/multi-effect升Standard、plan/readonly/owner-data-writer exempt、无sandbox则不委托worker；error=route/graph或memory原owner缺陷仍在却越门、任一路由verdict/hint/recommendation或memory fact/reviewer/mattered被当approval/dispatch、workflow path无下游input proof却进入受控调度、SKIP伪装DONE或卡依赖、两端独立解析vector产生不同graph、digest漂移仍执行、第二route event覆盖first exact task text、相邻消息启发式或内部重解transcript、未tracked alias identity被接受、prepare发生在writer后、worker mint/call controller、EA advance、Orchestrator改manifest/代批、controlled-change修改workflow graph或memory store
  Verification: node scripts/test-controlled-change-orchestration.mjs --role-matrix --prepare-before-writer && node scripts/test-controlled-change-orchestration.mjs --capability-vector-matrix=all --both-harnesses --same-digest-same-graph --gate-disposition-not-completion --skip-no-pass-no-wait && node scripts/test-controlled-change-orchestration.mjs --trigger-table --approval-binding --route-reminder-non-authority --memory-review-non-authority --all-route-verdicts --preserve-first-task-text && node scripts/test-controlled-change-orchestration.mjs --route-production-schema --non-dry-run --renderer-no-crash --soft-candidate-shapes=legacy,meta-question --route-defect-never-authority && node scripts/test-controlled-change-orchestration.mjs --workflow-recommendation-non-authority --require-downstream-input-proof && node scripts/test-controlled-change-orchestration.mjs --e3-interface=auto --no-transcript-parser && node scripts/test-controlled-change-orchestration.mjs --six-skill-v1-lineage && git diff --exit-code -- .claude/hooks/route-guard.mjs .claude/hooks/session-end.mjs scripts/test-route-guard.mjs .claude/skill-os/optional-workflow-graph.yaml
  Status: PLANNED
```

六 Skill v1 的准确位置：raw manifest/witness/receipt与回归输入 U-001–U-003；发布事实只输入 U-009 的failure/fixture要求，不代表有可复用publisher代码；它不得反向冻结v2 schema或授权重放。Rollback：恢复两份agent contract exact preimage；不改workflow state或graph。

### U-007

```yaml
U-007:
  Goal: 仅在N-D有真实多effect证据时提供可被base host静态组合的独占DAG scheduler，并让kernel继续成为唯一状态推进者
  Source: R-001, R-004, R-008, R-009, R-011
  Dependencies: U-002, U-003, U-004, external: Gate F, Gate N N-D=BUILD
  Files: scripts/lib/controlled-change/effect-dag.mjs; scripts/fixtures/controlled-change/effect-dag-cases.json; scripts/test-controlled-change-effect-dag.mjs
  Approach: 只实现符合U-004 stable scheduler interface的独占effect-DAG module，不改base effect-host/policy/effect fixtures；module只暴露拓扑计划与prepare/apply/readback/compensate顺序，kernel仍拥有全部state，任何node UNKNOWN立即冻结后继。先scratch验收，再由base repo-files通过本U-block的public prepare/advance exact operation安装dormant source；active bundle SHA不变，最终仅U-010 composer可静态链接。禁止预建external/Git adapter或第二repo mutation owner
  Read List: FINAL-MASTER-PLAN.md sections 6.1、7、9、12–13、16；U-004 effect-host/composer stable interface与base digest；旧重型方案的 effect broker/personal/publisher 候选段；scripts/check-capability-parity.mjs 的 static projection 模式
  Test scenarios: happy=独占module规划获证repo DAG；edge=多个disjoint repo effects、compensable node、policy freeze、N-E/N-G蕴含N-D；error=N-D为SKIP仍创建本块bytes、修改base host/policy/effect fixtures、预建external/Git、第二repo mutation owner、unknown adapter/dynamic path、adapter自推state、cycle、undeclared target、UNKNOWN后执行尾节点、跨adapter自动补偿
  Verification: node scripts/test-controlled-change-effect-dag.mjs --contract --all-topologies --require-gate=N-D --assert-base-digests-unchanged --install-dormant-source --assert-active-bundle-unchanged && node scripts/test-controlled-change-effect-dag.mjs --unknown-freezes-tail --no-dynamic-loading --no-adapter-code
  Status: PLANNED
```

删除测试：整个U-007 module不存在时 base sequential repo-files仍完整工作；若 kernel/base host import具体业务语义即FAIL。Rollback：不把module加入下一capsule profile；已激活版本按U-010 pointer CAS回previous。

### U-008

```yaml
U-008:
  Goal: 从六 Skill task-specific cutover提取通用external/personal exact-path durable adapter，同时继承当前postimage baseline而不接管v1 backup ownership
  Source: R-001, R-003, R-004, R-006, R-008, R-009, R-011
  Dependencies: U-003, U-007, external: Gate N N-E=BUILD
  Files: scripts/lib/controlled-change/adapters/external-files.mjs; scripts/test-controlled-change-external-files.mjs
  Approach: N-E证据与N-D蕴含关系验证后只在scratch首次创建独占external adapter，不改base host/policy；canonical absolute target、same-dir temp/fsync/rename、0600 private receipt/restricted backup pointer、owned-postimage reverse；Gate M verified v1 adapter postimage成为preimage，但旧backup/audit保持legacy owner。scratch tests后只用base repo-files经本U-block public prepare/advance安装dormant source，绝不触发真实external effect且active bundle SHA不变；最终注册仅由U-010 composer以literal import+SHA完成
  Read List: FINAL-MASTER-PLAN.md sections 9、12.3、15–16、19.4；scripts/skill-cutover-transaction.mjs 的targetSummary/apply/verify/rollback/self-test段；scripts/validate-skill-integration-receipt.mjs personal schema；六Skill IMPLEMENTATION-RECEIPT personal boundary；Gate M个人target/backup/audit/residue只读tuple report；.claude/observability/scripts/write_observation.py staging/journal/recovery；旧重型personal候选
  Test scenarios: happy=N-E后temp exact file create/update+confirmed private receipt；edge=existing adapter postimage baseline、typed PASS_WITH_RECORDED_BOUNDARY/NOT_LOADED、mode/unicode/concurrent edit/crash/duplicate；error=N-E为SKIP仍存在adapter/test bytes、未先完成N-D/U-007、重跑legacy cutover/复用旧backup、transaction state推导loader PASS、home/env晚展开、glob/symlink escape、0644 private audit、journal content leak、foreign current reverse
  Verification: node scripts/test-controlled-change-external-files.mjs --require-gate=N-E --require-implied-gate=N-D --temp-root-only --crash-every-boundary --assert-base-digests-unchanged --install-dormant-source --assert-active-bundle-unchanged --forbid-real-external-effect && node scripts/test-controlled-change-external-files.mjs --concurrency=16 --owned-reverse --preserve-legacy-owner && node scripts/test-controlled-change-external-files.mjs --privacy-scan --private-mode=0600 --typed-loader-evidence
  Status: PLANNED
```

测试只能使用 `mktemp` 根，不得读取/写真实个人目录。完成 U-008 只代表 adapter 可用；任何真实 target 仍逐 operation Gate E。Rollback：若 current==owned postimage，使用 durable reverse；否则冻结为 `NEEDS_CONTEXT`。

### U-009

```yaml
U-009:
  Goal: 实现 isolated-index Git publisher adapter，以 immutable commit/private-ref/expected-old CAS 发布并对响应丢失只读 reconcile
  Source: R-001, R-003, R-004, R-006, R-008, R-009, R-011
  Dependencies: U-003, U-004, U-007, external: Gate N N-G=BUILD
  Files: scripts/lib/controlled-change/adapters/git-publisher.mjs; scripts/test-controlled-change-git-publisher.mjs
  Approach: N-G证据与N-D蕴含关系验证后只在scratch首次创建独占Git adapter，不改U-001 safe object-reader/base host/policy；从v1发布证据重建算法而非复用不存在的通用publisher。所有identity/discovery/build/readback只读复用safe object-reader，显式中和fsmonitor/hooks/pager/editor/external-diff/textconv/include/url-rewrite/protocol helper，设置GIT_NO_REPLACE_OBJECTS/GIT_NO_LAZY_FETCH/GIT_TERMINAL_PROMPT并拒绝replace refs、grafts、promisor缺对象。local fixtures后只用base repo-files经本U-block public prepare/advance安装dormant source，不调用真实remote且active bundle SHA不变；最终注册仅由U-010 composer以literal import+SHA完成。operation私有index/ref构造commit，Gate R后最小credential transport+expected-old lease，intent后不自动retry；任何v1 terminal auth均不可重放
  Read List: FINAL-MASTER-PLAN.md sections 11、13、15–16、19.4；六Skill IMPLEMENTATION-RECEIPT 的published tree/commit/remote/ref/index/head facts；CANDIDATE-MANIFEST.tsv；scripts/candidate-manifest.mjs 的published-commit blob lineage验证；v1 U-008 witness/receipt EFFECT_UNKNOWN历史；.claude/skills/office/resolving-merge-conflicts/scripts/conflict-transaction.mjs 的Git env与R-011 fsmonitor reproduction；旧重型publisher候选；历史rule-execution recovery publisher段；scripts/sync.sh assumptions
  Test scenarios: happy=N-G后sanitized complete-object local bare remote FF publish confirmed；edge=linked worktree/shared refs、private ref CAS、response loss→new/old/other/unreadable、prepublish receipt+postpublish attestation、credential helper仅Gate R transport阶段开放；error=N-G为SKIP仍存在adapter/test bytes、未先完成N-D/U-007、NOT_APPLICABLE probe执行程序面、replace ref/graft伪造parent或ancestor、partial-clone/promisor缺对象触发lazy fetch/credential、historical verifier与publisher object-reader分叉、从v1 COMPLETED重放、dirty index、HEAD/main moved、wrong remote/ref、non-FF、empty lease/+refspec、automatic retry
  Verification: GIT_NO_REPLACE_OBJECTS=1 GIT_NO_LAZY_FETCH=1 GIT_TERMINAL_PROMPT=0 node scripts/test-controlled-change-git-publisher.mjs --require-gate=N-G --require-implied-gate=N-D --local-bare-fixture --linked-worktrees --program-surface-safe-plumbing --require-complete-object-closure --assert-base-digests-unchanged --install-dormant-source --assert-active-bundle-unchanged --forbid-real-remote && node scripts/test-controlled-change-git-publisher.mjs --malicious-config-matrix=fsmonitor,hooks,pager,editor,external-diff,textconv,include,url-rewrite,protocol,replace-ref,graft,promisor-lazy-fetch --network-denied --shared-object-reader && node scripts/test-controlled-change-git-publisher.mjs --response-loss-all-readbacks --assert-no-retry && git diff --exit-code --cached
  Status: PLANNED
```

真实网络/远端不属于 U-009 自动验证；每次真实 publish 需 Gate R。Rollback：push 前可删除 owned private ref/临时 index；push 后只 reconcile，绝不自动 remote rollback。publisher 失败不能让 kernel/本地 repo-files adapter 失效。

---

### U-010

```yaml
U-010:
  Goal: 作为唯一composition owner把Gate N选中的独占modules静态链接成content-addressed N+1 capsule，并完成兼容、previous回退与损坏guard恢复
  Source: R-001, R-003, R-005, R-008, R-009
  Dependencies: U-003, U-006, U-011; conditional: U-005 if N-C=BUILD, U-007 if N-D=BUILD, U-008 if N-E=BUILD, U-009 if N-G=BUILD; external: Gate F, Gate G for selected composition
  Files: scripts/lib/controlled-change/lifecycle.mjs; scripts/test-controlled-change-lifecycle.mjs
  Approach: 读取U-004 composer、Gate F base digest、U-011 exact postimage与所有selected dormant module SHA，拒绝optional block修改base files；用一个upgrade operation先安装本块owned lifecycle source，再把当前base + U-011 + Gate N BUILD modules写入profile并生成literal-import runtime entry，SKIP module存在/被import、BUILD/U-011 postimage缺失或hash错均fail。本块不得修改stable launcher/kernel/state-store/effect-host/policy/object-reader/composer；`.claude/hooks`与launcher持续从fixed bundle运行。N+1 dormant通过can-read/recover current/previous、private ABI、U-011 status/evidence与fresh双端后才由public advance CAS pointer；previous保留到首笔成功+recovery drill
  Read List: FINAL-MASTER-PLAN.md sections 10、14–17；Gate N vector/digest；Gate M/U-001 legacy evidence与U-002 compat contract；U-003 base bundle/composer/launcher digest；U-011 completion与CLI/kernel/state/receipt postimage；所有selected U-005/U-007/U-008/U-009 module SHA与tests；scripts/codex-trust-hooks.mjs trust dry-run边界；scripts/verify-codex-wiring.mjs registration/trust assertions
  Test scenarios: happy=U-011+selected modules一次静态composition、N→N+1 dormant/fresh/activate/first-operation；edge=四个capability任意BUILD/SKIP组合、source写后capsule前crash、v1 raw terminal reader、v2 previous nonterminal recovery、minor schema、previous retention；error=遗漏U-011 postimage、SKIP module存在/import、BUILD module缺失/hash错、base file含capability delta、runtime discovery/dynamic import、两个U-block各自注册、stable launcher有delta、删除v1 compat、unknown major、N+1 corrupt、pointer CAS conflict、session verdict divergence
  Verification: node scripts/test-controlled-change-lifecycle.mjs --selected-capability-vector <Gate-N-digest> --include-source=U-011 --single-composition-owner --literal-import-profile --verify-precompose-base-digests --allow-owned-base-delta=lifecycle --reject-unselected-module-or-import --crash-every-source-compose-activate-boundary && node scripts/test-controlled-change-ux.mjs --active-capsule-only --capability-vector-matrix=all --both-harnesses --require-u011-postimage && node scripts/test-controlled-change-evidence.mjs --active-capsule-only --private-public-split --typed-loader --privacy-scan && node scripts/test-controlled-change-lifecycle.mjs --upgrade-matrix=v1-compat,current,previous && node scripts/test-controlled-change-lifecycle.mjs --corrupt-new-bundle --rollback-previous && node scripts/test-controlled-change-lifecycle.mjs --unknown-major-fail-closed --retain-legacy && git diff --exit-code -- scripts/lib/controlled-change/launcher.mjs；fresh Claude/Codex 对current/previous各跑harness digest parity
  Status: PLANNED
```

stable launcher、hook registration 或 trust 变化仍回 Gate M/Gate G，不能由普通 N→N+1 自动授权。Rollback：active pointer expected-old CAS 回 previous；不删除新bundle、v2 journal或v1 raw state，先留证。

### U-011

```yaml
U-011:
  Goal: 在最终composition前完成并安装dormant的低仪式prepare/status/recovery/typed-error与private receipt/public attestation runtime source
  Source: R-001, R-006, R-007, R-008, R-009
  Dependencies: U-003, U-006, external: Gate F
  Files: scripts/controlled-change.mjs; scripts/lib/controlled-change/kernel.mjs; scripts/lib/controlled-change/state-store.mjs; scripts/lib/controlled-change/receipt-schema.mjs; scripts/test-controlled-change-ux.mjs; scripts/test-controlled-change-evidence.mjs
  Approach: 先在scratch对canonical projection做纯fixture测试；文本/JSON合并legacy raw validity、v2与Gate N vector digest而不改写，BUILD/SKIP_DARK另列annotation且SKIP无instance/PASS/wait。通过后只由base repo-files经本U-block public prepare/advance安装exact dormant CLI/kernel/state/receipt source；active bundle SHA必须不变，运行时不得从mutable worktree加载，只有U-010可把这些postimage组合并激活。只展示唯一合法next action；Foundation不重复问已绑定原请求，Standard只展示risk delta；public输出默认redacted
  Read List: FINAL-MASTER-PLAN.md sections 8.2、15–17、19.4；U-002 receipt/attestation schema；Gate N capability vector与SKIP_DARK annotation；U-003 active base bundle digest；.claude/agents/orchestrator.md escalation；memory/scripts/record_eval.py digest/idempotent audit；现有CLI JSON/text约定；六Skill human receipt中PASS_WITH_RECORDED_BOUNDARY文本
  Test scenarios: happy=scratch fixture产Foundation五行摘要+single advance、两harness对同vector投影同selected graph，随后dormant source install且active SHA不变；edge=16种BUILD/SKIP组合、DRAIN_V1/legacy terminal/resource busy/stale/expiry/recovery/unknown、JSON stability、redacted public+0600 private、typed loader boundary；error=install后从worktree直接生效、active bundle改变、SKIP计DONE/PASS或被加入wait、两端vector/digest/status不同、stack trace替代行动、非法retry、PUBLISHED/VERIFIED混层、transaction state自动推loader PASS、secret/token/URL query/path/body泄漏、status写state
  Verification: node scripts/test-controlled-change-ux.mjs --fixture-only --golden-errors --all-typed-codes --include-drain-v1 && node scripts/test-controlled-change-ux.mjs --fixture-only --capability-vector-matrix=all --both-harnesses --gate-disposition-not-completion --skip-no-pass-no-wait && node scripts/test-controlled-change-evidence.mjs --fixture-only --private-public-split --typed-loader --privacy-scan && node scripts/test-controlled-change-migration.mjs --install-dormant-source=U-011 --assert-active-bundle-unchanged --forbid-worktree-runtime-load
  Status: PLANNED
```

UX 指标不降低 safety gate：若低仪式只能靠隐式扩大 authority，则触发 K-01，保持 shadow 而非弱化 contract。Rollback：U-010前只reverse exact owned dormant source，active bundle不变；U-010后先expected-current CAS回previous，再在current仍等于owned postimage时reverse source；receipt/journal不重写。

### U-012

```yaml
U-012:
  Goal: 建立全承诺 assertion matrix、unit/integration/fresh/concurrency/crash/mutation/config/worktree/publication 总验证与证据冻结
  Source: R-001, R-003, R-005, R-006, R-007, R-009, R-011
  Dependencies: U-010
  Files: scripts/verify-controlled-change.mjs; scripts/verify.sh; package.json; .github/workflows/ci.yml
  Approach: 聚合但不隐藏各 U-block verifier；对每项承诺绑定 exact test selector 和证据 digest，并提供稳定的 `--assert <CC-ID>` 单断言入口与 `--list-assertions` 完整枚举，未知/重复/未覆盖ID一律非零退出；加入 mutation/obligation census，fresh harness 不能被 in-process mock 替代；先测量现有约112s基线，precommit只接入由mutation证明不会漏掉相关控制的deterministic smoke/mapping，full matrix保留独立显式命令与CI evidence；禁止用FAST_COMMIT或隐式skip换取过线
  Read List: FINAL-MASTER-PLAN.md sections 1.1、4.1、18、21；Gate N capability vector、U-001–U-011中所有selected completion、SKIP_DARK annotation/独占module absence、U-010 profile/base digest与对应selectors；scripts/verify.sh 的现有分层；package.json scripts；.github/workflows/ci.yml 现有 job/OS；scripts/verify-codex-wiring.mjs 输出合同
  Test scenarios: happy=clean isolated clone按冻结capability vector跑完整selected matrix与v1 regression、未选独占module不存在且base digests不变、precommit selector在预算内且相关mutant全被杀；edge=dirty/diverged main、linked worktrees、raw v1 terminal/nonterminal recovery、N-C/D/E/G任意BUILD/SKIP组合、不同CI机器预算分类；error=SKIP独占module仍存在、capability代码偷塞入base/profile import或被hidden skip伪装、SKIP计PASS/wait、BUILD能力未跑suite/未组合、新增suite直接串行塞进112s链路、p95>102s或headroom<15s、FAST_COMMIT伪装通过、impact mapping漏杀任一控制、删除pre-entry/direct-writer-deny/legacy-drain/CAS/hash/gate/unknown-freeze任一控制后仍绿、恶意Git config、fresh parity被mock、receipt validator与writer状态词分叉、routing/corpus证据未冻结argv/env/input/output/scorer或重跑漂移
  Verification: node scripts/verify-controlled-change.mjs --contract-smoke --require-mutation-covered-mapping --require-route-evidence-reproducible=argv,env,input,output,scorer && node scripts/verify-controlled-change.mjs --selected-capability-vector <Gate-N-digest> --require-built-tests --require-skipped-module-absence --verify-source-digest-chain=Gate-F,selected-modules,U-011,U-010 --require-exact-owned-deltas --require-active-capsule-matches-final-postimages --reject-capability-in-base --reject-unselected-profile-import --gate-disposition-not-completion --evidence-dir <operation-scratch>/evidence && node scripts/verify-controlled-change.mjs --mutation --require-kill-each-control --require-kill-each-shard-map --mutants=capability-in-base,unselected-import,skip-as-pass,skip-as-wait,omit-u011-from-capsule,worktree-runtime-load && node scripts/verify-controlled-change.mjs --budget --runs=5 --cap-ms=120000 --max-ratio=0.85 --min-headroom-ms=15000 --forbid-fast-commit --forbid-hidden-skip && npm run verify:controlled-change:full -- --selected-capability-vector <Gate-N-digest>；fresh Claude/Codex分别跑semantic parity selector，并由独立EA复算evidence manifest SHA；Gate V通过后才可把contract-smoke接入现有verify/precommit
  Status: PLANNED
```

CI 只跑无 secret、无个人目录、无真实远端的 deterministic matrix；publication 的 mandatory local bare fixture 在 CI，真实 disposable remote 只在 U-013/Gate R shadow。full matrix与precommit smoke是两个显式命名的入口，前者永不因impact mapping消失；Gate V不通过则不修改现有precommit链。Rollback：验证接线失败只撤回 verify/CI 文件的 owned delta，不撤回实现证据或篡改失败记录。

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
| [BLOCKING] CC-000 Legacy containment/drain | v1 raw evidence immutable；新v1 Git effect保持dark；U-001 live subset零Git/任意shell effect；U-003仅既有M的public advance；required/invalid拒绝v2；terminal只建path/SHA index；旧authority不导入 | containment mutants + migration raw-v1/drain/zero-authority-import |
| [BLOCKING] CC-001 Contract closure | schema 拒绝未知字段/隐式 target/effect；obligation census 覆盖 R-001 全 16 域 | `test-controlled-change-contract --all --obligation-census` |
| [BLOCKING] CC-002 One truth | v2 journal 是v2唯一可写truth；projection独改不可推进；v1 raw evidence不被吸收/改写 | state projection-tamper + migration byte-identity |
| [BLOCKING] CC-003 Admission/required ordering | protected surface无witness也需PREPARE_REQUIRED；required未durable不可active；required异常两端deny | admission pre-witness + state/harness |
| [BLOCKING] CC-004 Generation/idempotency | stale generation、replay、duplicate attempt 不重复 effect | state replay selector |
| [BLOCKING] CC-005 Scratch-only worker | worker writable root 不含 live/common-dir/external；不能证明则禁止委托/controller | repo-files sandbox + orchestration role fixture |
| [BLOCKING] CC-006 Exact delta | create/update/delete/rename/symlink/mode 全 census；unrelated dirty WIP byte-identical | repo-files all-kinds/WIP |
| [BLOCKING] CC-007 Dual parity | Claude/Codex语义事件projection verdict/reason digest 100%一致；registration/trust变化用fresh sessions | fresh semantic harness-cases |
| [BLOCKING] CC-008 Fail closed / one writer | compound command逐effect分类且不能借首verb扩权；one-use消费线性化；v1异常保持deny；v2 parse/read/timeout/malformed deny；direct target writer永拒，只有advance adapter写 | containment/harness negative + single-owner mutation |
| [BLOCKING] CC-009 Concurrency | base v2保持single-operation correctness；仅N-C BUILD时才要求one manifest/op、disjoint ACTIVE、overlap busy、无lost append/deadlock/leak/age-steal；SKIP则scheduler module absent | selected claims scheduler + parallel append/crash / absence |
| [BLOCKING] CC-010 Recovery uniqueness | selector按`EFFECT_UNKNOWN/read-only > AWAIT_GATE_X > RESUME_EXACT`互斥优先级裁决；每一durable crash snapshot只有一个合法机械next action，同generation不得同时接受resume/abort/reverse；非确定性recovery须先写snapshot-bound `RECOVERY_REQUIRED(selector=AWAIT_GATE_X)`，再由Gate X fresh top-level approval形成新generation且mode只允许`RESUME_EXACT | ABORT_OWNED` | state crash model + precedence/dual-recovery/unknown-mode mutants |
| [BLOCKING] CC-011 Unknown freeze | base单effectunknown无retry；N-D BUILD时DAG tail同样冻结；N-G BUILD时response-loss只读reconcile | selected effect-DAG/Git response-loss / base deny |
| [BLOCKING] CC-012 Personal ownership | 仅N-E BUILD：exact path、reverse仅current==owned postimage、receipt无content/secret；SKIP则external module absent且base deny | selected external-files matrix / absence |
| [BLOCKING] CC-013 Git isolation | 仅N-G BUILD：shared index/HEAD/main不变、commit OID/private ref exact；SKIP则publisher module absent且base deny | selected Git local fixture / absence |
| [BLOCKING] CC-014 Git remote CAS/object truth | 仅N-G BUILD：literal identity/full ref/FF/exact expected-old、raw graph拒replace/graft、no-lazy-fetch/object closure、禁+/empty lease/default origin；SKIP则不产publisher | selected Git malicious config/object matrix / absence |
| [BLOCKING] CC-015 Migration reversibility/bootstrap closure | Gate B绑定source+common-dir operational targets与owner M；dependencies→capsule→durable DRAIN→final guard-last→fresh→Gate F→advance M activation；Gate F前activation必须被拒；每边界唯一恢复；失败回drain/previous | migration install-boundary/lifecycle drill |
| [BLOCKING] CC-016 Version compatibility | raw v1 reader + v2 current/previous receipt/非终态可读恢复；unknown major deny | v1-compat + lifecycle matrix |
| [BLOCKING] CC-017 Role/approval separation | worker/EA不能call/mint/advance；Orchestrator不能widen/代批；top-level request+gate evidence单向绑定；route obligation/verdict/hint/soft-candidate/recommendation及memory stable/promoted/reviewer/mattered永不成为authority | orchestration approval/role/E3/route/memory-non-authority matrix |
| [BLOCKING] CC-018 Trigger containment | protected pre-entry bites；readonly/plan/downstream/owner data exempt；graph无controlled-change新node；workflow推荐无下游input proof不得调度；E3有则只消费attested interface、无则绑定当前request，均不解析transcript | admission + orchestration trigger/workflow-input/git diff |
| [BLOCKING] CC-019 Privacy/evidence split | secret/body/URL query不入证据；private 0600；public redacted；prepublish receipt与postpublish attestation分离 | evidence schema/privacy scanners |
| [BLOCKING] CC-020 Mutation strength | 删除legacy-drain/pre-entry/direct-writer-deny/CAS/hash/gate/unknown-freeze任一控制使唯一test红 | verifier mutation mode |
| [BLOCKING] CC-021 Freshness | registration/trust/runtime 变更必须 fresh Claude+Codex，不接受同进程 mock | fresh evidence manifest |
| [BLOCKING] CC-022 Rollout evidence | 每surface至少20次shadow、3次recovery、false-positive阈值、parity满足Gate S | rollout verifier + human ledger |
| [BLOCKING] CC-023 Evidence vocabulary/lineage | writer/renderer/validator共享状态词；PUBLISHED只属attestation；historical verifier从published commit blob绑定OID/single-parent/baseline/path-set；loader boundary不由transaction state推导 | receipt-schema + historical-lineage mutation tests |
| [BLOCKING] CC-024 Verification budget integrity | repeated p95≤102s且headroom≥15s；precommit shard/impact mapping逐项被mutation证明；full suite显式保留；FAST_COMMIT/hidden skip不得计PASS | verifier budget/mapping mutation |
| [BLOCKING] CC-025 Private hook ABI | `hook-failure-decision`两种wrapper form、raw v1/v2状态、空stdout与0/2 exit contract完全冻结；unknown args/launcher unreadable fail closed | harness private-ABI corpus |
| [BLOCKING] CC-026 Standard need evidence | contained Foundation ≥20次；N0无证据必须STOP且Gate N前无任何v2 bytes；N0进入也不能反向解锁子能力 | Gate N core evidence/absence/negative branch |
| [BLOCKING] CC-027 Capability build gates | N-C/N-D/N-E/N-G逐项BUILD或SKIP_DARK；N-E/N-G蕴含N-D；optional blocks只拥有独占modules，SKIP时module不存在且base digest/profile无能力delta，BUILD时suite必跑并仅由U-010一次静态组合 | capability-vector + unique-module/base-hash/profile-import mutation matrix |
| [BLOCKING] CC-028 Gate disposition parity | SKIP_DARK是非completion注解：无U-block instance/status/PASS/wait；Claude/Codex及Plan/Orchestrator对同vector digest裁出同graph；U-010等待U-011与selected postimages，下游只等U-010 receipt | orchestration/UX all-vector dual-harness matrix |
| [BLOCKING] CC-029 Route anchor quarantine | Gate M时route non-dry-run所有输出shape/renderer PASS；四类verdict与soft candidate全为non-authority；workflow path有下游input proof；evidence冻结argv/env/input/output/scorer SHA；U-006后四个anchor bytes不变 | route-production-schema + non-authority + workflow-input + reproducibility + anchor-diff matrix |
| [WARNING] CC-W01 Performance | Foundation 中位时延/交互满足 K-01 | shadow metrics |
| [WARNING] CC-W02 Optional adapter dark | personal/Git 未获 surface Gate S 时保持 deny，不阻塞 repo Foundation | policy projection |

上表是人读覆盖索引；以下是 Orchestrator/quality-gate 使用的 authoritative 单断言命令。U-012 必须保证 `--list-assertions` 精确枚举这些 ID，且每个 `--assert` 只验证该 ID、生成独立 evidence digest；BLOCKING 失败保持非零退出，WARNING 只记录而不阻断后续命令。

```bash
# [BLOCKING] CC-000 — Legacy containment/drain
node scripts/verify-controlled-change.mjs --assert CC-000 && echo "PASS CC-000" || { echo "FAIL CC-000"; exit 1; }

# [BLOCKING] CC-001 — Contract closure
node scripts/verify-controlled-change.mjs --assert CC-001 && echo "PASS CC-001" || { echo "FAIL CC-001"; exit 1; }

# [BLOCKING] CC-002 — One truth
node scripts/verify-controlled-change.mjs --assert CC-002 && echo "PASS CC-002" || { echo "FAIL CC-002"; exit 1; }

# [BLOCKING] CC-003 — Admission/required ordering
node scripts/verify-controlled-change.mjs --assert CC-003 && echo "PASS CC-003" || { echo "FAIL CC-003"; exit 1; }

# [BLOCKING] CC-004 — Generation/idempotency
node scripts/verify-controlled-change.mjs --assert CC-004 && echo "PASS CC-004" || { echo "FAIL CC-004"; exit 1; }

# [BLOCKING] CC-005 — Scratch-only worker
node scripts/verify-controlled-change.mjs --assert CC-005 && echo "PASS CC-005" || { echo "FAIL CC-005"; exit 1; }

# [BLOCKING] CC-006 — Exact delta
node scripts/verify-controlled-change.mjs --assert CC-006 && echo "PASS CC-006" || { echo "FAIL CC-006"; exit 1; }

# [BLOCKING] CC-007 — Dual parity
node scripts/verify-controlled-change.mjs --assert CC-007 && echo "PASS CC-007" || { echo "FAIL CC-007"; exit 1; }

# [BLOCKING] CC-008 — Fail closed / one writer
node scripts/verify-controlled-change.mjs --assert CC-008 && echo "PASS CC-008" || { echo "FAIL CC-008"; exit 1; }

# [BLOCKING] CC-009 — Concurrency
node scripts/verify-controlled-change.mjs --assert CC-009 && echo "PASS CC-009" || { echo "FAIL CC-009"; exit 1; }

# [BLOCKING] CC-010 — Recovery uniqueness
node scripts/verify-controlled-change.mjs --assert CC-010 && echo "PASS CC-010" || { echo "FAIL CC-010"; exit 1; }

# [BLOCKING] CC-011 — Unknown freeze
node scripts/verify-controlled-change.mjs --assert CC-011 && echo "PASS CC-011" || { echo "FAIL CC-011"; exit 1; }

# [BLOCKING] CC-012 — Personal ownership
node scripts/verify-controlled-change.mjs --assert CC-012 && echo "PASS CC-012" || { echo "FAIL CC-012"; exit 1; }

# [BLOCKING] CC-013 — Git isolation
node scripts/verify-controlled-change.mjs --assert CC-013 && echo "PASS CC-013" || { echo "FAIL CC-013"; exit 1; }

# [BLOCKING] CC-014 — Git remote CAS/object truth
node scripts/verify-controlled-change.mjs --assert CC-014 && echo "PASS CC-014" || { echo "FAIL CC-014"; exit 1; }

# [BLOCKING] CC-015 — Migration reversibility/bootstrap closure
node scripts/verify-controlled-change.mjs --assert CC-015 && echo "PASS CC-015" || { echo "FAIL CC-015"; exit 1; }

# [BLOCKING] CC-016 — Version compatibility
node scripts/verify-controlled-change.mjs --assert CC-016 && echo "PASS CC-016" || { echo "FAIL CC-016"; exit 1; }

# [BLOCKING] CC-017 — Role/approval separation
node scripts/verify-controlled-change.mjs --assert CC-017 && echo "PASS CC-017" || { echo "FAIL CC-017"; exit 1; }

# [BLOCKING] CC-018 — Trigger containment
node scripts/verify-controlled-change.mjs --assert CC-018 && echo "PASS CC-018" || { echo "FAIL CC-018"; exit 1; }

# [BLOCKING] CC-019 — Privacy/evidence split
node scripts/verify-controlled-change.mjs --assert CC-019 && echo "PASS CC-019" || { echo "FAIL CC-019"; exit 1; }

# [BLOCKING] CC-020 — Mutation strength
node scripts/verify-controlled-change.mjs --assert CC-020 && echo "PASS CC-020" || { echo "FAIL CC-020"; exit 1; }

# [BLOCKING] CC-021 — Freshness
node scripts/verify-controlled-change.mjs --assert CC-021 && echo "PASS CC-021" || { echo "FAIL CC-021"; exit 1; }

# [BLOCKING] CC-022 — Rollout evidence
node scripts/verify-controlled-change.mjs --assert CC-022 && echo "PASS CC-022" || { echo "FAIL CC-022"; exit 1; }

# [BLOCKING] CC-023 — Evidence vocabulary/lineage
node scripts/verify-controlled-change.mjs --assert CC-023 && echo "PASS CC-023" || { echo "FAIL CC-023"; exit 1; }

# [BLOCKING] CC-024 — Verification budget integrity
node scripts/verify-controlled-change.mjs --assert CC-024 && echo "PASS CC-024" || { echo "FAIL CC-024"; exit 1; }

# [BLOCKING] CC-025 — Private hook ABI
node scripts/verify-controlled-change.mjs --assert CC-025 && echo "PASS CC-025" || { echo "FAIL CC-025"; exit 1; }

# [BLOCKING] CC-026 — Standard need evidence
node scripts/verify-controlled-change.mjs --assert CC-026 && echo "PASS CC-026" || { echo "FAIL CC-026"; exit 1; }

# [BLOCKING] CC-027 — Capability build gates
node scripts/verify-controlled-change.mjs --assert CC-027 && echo "PASS CC-027" || { echo "FAIL CC-027"; exit 1; }

# [BLOCKING] CC-028 — Gate disposition parity
node scripts/verify-controlled-change.mjs --assert CC-028 && echo "PASS CC-028" || { echo "FAIL CC-028"; exit 1; }

# [BLOCKING] CC-029 — Route anchor quarantine
node scripts/verify-controlled-change.mjs --assert CC-029 && echo "PASS CC-029" || { echo "FAIL CC-029"; exit 1; }

# [WARNING] CC-W01 — Performance
node scripts/verify-controlled-change.mjs --assert CC-W01 && echo "PASS CC-W01" || echo "FAIL CC-W01"

# [WARNING] CC-W02 — Optional adapter dark
node scripts/verify-controlled-change.mjs --assert CC-W02 && echo "PASS CC-W02" || echo "FAIL CC-W02"
```

### 21.1 Verification layers

1. **Pure unit**：contract canonicalization、policy、state model、resource key、receipt redaction。
2. **Filesystem integration**：temp root、file kinds、fsync/rename/crash、dirty WIP、linked worktree。
3. **Containment/migration/legacy**：compound-Git、parallel one-use、false-PUBLISHED mutants；raw v1 terminal/nonterminal/invalid fixture、DRAIN、operation-bound migration、零 authority import、byte identity、evidence split。
4. **Harness conformance**：同一 semantic corpus经真实 Claude/Codex adapter；pre-entry/direct-writer/active负面路径fail closed。
5. **Concurrency scheduler（N-C BUILD only）**：16 workers、random order、parallel append lost-update、kill-at-boundary、PID reuse、no-age-steal；SKIP分支只验独占module absence与base digest。
6. **Mutation**：逐个移除legacy drain/pre-entry/direct-writer deny/CAS/hash/gate/unknown freeze，必须有唯一test杀死。
7. **Git fixture（N-G BUILD only）**：operation index、`commit-tree`、private ref、local bare remote、恶意 config、replace ref/graft、partial-clone/promisor missing object、network-denied lazy-fetch、response-loss readback；SKIP分支只验publisher absence/base deny。
8. **Lifecycle**：contained-v1 source install、M prepare、capsule staging、DRAIN、guard-last、fresh proof、Gate F、advance activation的逐边界crash与Gate F前activation deny；N→N+1、corrupt bundle、previous recovery。
9. **Need evidence**：20次contained-Foundation样本与Gate N capability vector，证明门前无v2产物、N0无需求时U-002+不存在、任一子能力SKIP时独占module不存在、base digest与capsule profile无该能力delta，且skip不形成completion/PASS/wait。
10. **Verification budget**：repeated p50/p95/headroom、impact/shard mapping mutation、显式 full suite、FAST_COMMIT/hidden skip 负面用例。
11. **Shadow**：每个申请promotion的surface至少20次真实低风险framework mutation；至少3次故障注入恢复。
12. **Publication shadow**：只有 Gate R 后，在 dedicated non-production remote/ref 做一次真实 fixture；不能使用当前业务 remote/ref。
13. **Independent quality gate**：复算 source/evidence SHA、全 BLOCKING assertions 和范围，不能静默应用修复。

### 21.2 Quality criteria

```yaml
criteria:
  - "[C1] 16/16问题域均映射到至少一个已执行且PASS的CC断言，并且每个crash state只有一个合法下一动作；failure=任一域无证据或恢复多义；evidence=obligation census+crash matrix。"
  - "[C2] safety reviewer从REFUTED出发逐项翻案，EFFECT_UNKNOWN从未被计为成功/失败或自动retry；failure=默认放行或unknown推进；evidence=safety envelope+unknown/reconcile selectors。"
  - "[C3] 对外面严格只有prepare/advance/status，未引入daemon/global registry/dynamic plugin/Git-core coupling，且每个optional adapter可单独删除；failure=第四入口、隐性TCB或删除后base失效；evidence=public-ABI census+source inventory+deletion tests。"
  - "[C4] Claude与Codex对完整semantic corpus的verdict/reason/vector digest达到100%一致，差异只在协议adapter；failure=任一fixture分叉或同进程mock冒充fresh；evidence=双端fresh evidence manifest。"
  - "[C5] implementation diff的create/update/delete/rename/symlink/mode全集恰好落在实例化U-block Files，且每项结论可从command/readback/receipt复算；failure=计划外文件或仅agent自报；evidence=exact-delta census+evidence manifest SHA。"
  - "[C6] Foundation不重复询问已绑定低风险请求，Standard只展示risk delta，且20次样本的中位额外交互≤1、运行时间增幅≤30%；failure=仪式超阈或靠扩大authority降摩擦；evidence=U-011 UX fixtures+Gate N/S metrics。"
  - "[C7] 每个live/crash/publication边界都有满足ownership/CAS的唯一恢复或明确NEEDS_CONTEXT，且不会覆盖foreign current state；failure=自动重试未知effect、清证据或反向覆盖他人变化；evidence=recovery matrix+boundary drills+remote readback。"
```

### 21.3 Plan Agent failure strategy 与 escalation

| 断言级别 | 统一处理 |
|---|---|
| `BLOCKING` | 当前 U-block/Phase 立即停止，不调度任何下游；能由已批准 Files 内局部修复则按同一 Verification 重跑，否则置 `BLOCKED` 或 `NEEDS_CONTEXT` 并走增量重规划。不得降级为 WARNING。 |
| `WARNING` | 记录 exact ID、证据与影响，当前块只可成为 `DONE_WITH_CONCERNS`；不阻断不依赖该保证的下游，但不得用 WARNING 证明 Gate PASS。 |

Completion status 只允许 §8.2 的六值：`PLANNED | IN_PROGRESS | DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`。所有阻塞升级必须原样使用以下四段，不能用自由文本掩盖 authority 或现场漂移：

```text
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: <具体到U-ID、文件/接口/依赖及失败的CC断言>
ATTEMPTED: <已执行的只读检查、Verification或安全局部尝试>
RECOMMENDATION: <下一步可选动作；涉及新Files/authority/不可逆effect时必须回用户Gate>
```

---

## 22. 回滚、恢复与发布分层

| 失败阶段 | 回滚单位 | 机械条件 | 保留证据 |
|---|---|---|---|
| Gate M0/M | 无写入可回滚 | containment承诺或read-only census失败 | raw v1/evidence digest、RED mutants与blocking verdict |
| Wave 1–2 scratch | 整个 candidate bundle | 尚未 live apply | compiler/test failure log + bundle digest |
| U-001 Foundation subset | exact owned source reverse或保持default-deny | tests→linear-store→guard-last；不得恢复脆弱Git effect开放 | containment crash event与mutant结果 |
| v1-protected migration apply | exact file reverse | current==owned postimage | Gate B、v1 manifest、pre/post/reverse、fresh verdict |
| Runtime capsule staging | exact M-owned staging cleanup/resume | bundle未no-replace rename/未入launcher | per-file hash、fsync与journal intent |
| Launcher pointer | v2→DRAIN_V1/previous CAS | expected current bundle SHA | corrupt bundle与切换 journal |
| Raw v1 state/evidence | **不回滚、不改写** | legacy owner保留 | witness/receipt/index/pre/post publish SHA |
| Repo apply | safe snapshot默认roll-forward；reverse只来自Gate X后的`ABORT_OWNED`新generation | exact pre/post ownership + selector/choice digest | partial journal + verification |
| Resource claim | exact owner release | owner dead + generation/Gate X choice | claim owner/attempt/start identity |
| External file | manifest-bound same-dir reverse；否则Gate X新generation | current==owned postimage + exact choice | redacted target + backup pointer |
| Local Git publisher | 正常流只补receipt；cleanup只来自Gate X后的owned choice | exact owned index/ref OID + selector/choice digest | tree/commit/ref receipt |
| Remote Git | **不自动回滚** | 只 readback/reconcile | intent、expected-old/new、remote observation |
| Policy rollout | mandatory→explicit→shadow | Gate S rollback decision | metrics与触发原因 |
| High-assurance | 不在本计划 | Gate H 新 plan | incident/TCB evidence |

恢复永不通过清日志、改 generation、删 required witness 或覆盖外部漂移来“恢复可写”。当系统不能证明 ownership 或唯一下一动作时，正确结果是 `NEEDS_CONTEXT` / `BLOCKED`。

---

## 23. 实施迁移路线与停止线

### 23.1 从六 Skill MVP 到全量蓝图

| Installed v1 输入 | v2 归属 | 迁移动作 |
|---|---|---|
| strict manifest/tuple/CAS | U-002 + U-004 | U-001先完成compound/concurrent containment与raw legacy freeze；Gate N后v2才泛化kind/identity并保留exact denominator |
| raw required/active/aggregated receipt | U-001 + U-002 + U-003 | U-001冻结raw digest；Gate N后U-002建只读compat；U-003安装新namespace/journal，不原地转换 |
| v1 repo-global single-flight | U-003；N-C BUILD时U-005 | drain期间维持；base v2仍可串行；仅获证后启用disjoint ACTIVE + linearizable append |
| harness direct Write/Edit/apply_patch | U-003 + U-004 | v1 drain保留；v2 activation撤销，base repo adapter成为唯一writer；optional modules不另获direct写权 |
| descriptive YAML policy | U-002 + U-003 | Gate N后才生成并在migration中变为runtime实际加载且digest-bound executable policy |
| v1 compound/one-use Git effect + non-frozen EFFECT_UNKNOWN history | Gate M0 + U-001–U-003；N-D BUILD时另含U-007 | 新v1 Git effect保持禁用；U-001 containment零Git/任意shell effect；v2 migration只经public prepare/advance；历史authority不重放；base kernel冻结UNKNOWN，获证DAG再冻结tail |
| exact bootstrap/fresh gates | U-003 | 继承算法，改为dependency-first、operation-bound capsule→DRAIN→guard-last→activation migration |
| task-specific personal cutover | U-008 | postimage作baseline、旧backup owner保留；提取通用算法，不重跑 |
| publication result/evidence | U-009 | 作为failure/fixture要求；重新实现adapter，不重放completed authority |
| VERIFIED receipt→local PUBLISHED supplemental artifact | U-001 + U-002 + U-011 | 保留两份历史artifact；Gate N后v2拆成immutable prepublish receipt + referencing postpublish attestation |
| validator已接受PUBLISHED但只做shape/tuple check；loader overclaim | U-001 + U-002 + U-011 | historical verifier从published commit blob绑定OID/parent/baseline/path-set；Gate N后再建同源状态词 + typed loader evidence；Gate F前闭合 |
| E1/E2 route obligation + E3 L0前置证据 | Gate M + U-006 | obligation只作提醒、不进authority；按Gate M时真实E3 attested interface适配，禁止内部transcript parser |
| non-goal daemon/capability/global lease | Standard 继续不采用 | 只有 Gate H 新 plan 可重开 |

v1 已通过 review 的结论只在其 frozen selector/hash/failure evidence范围内继续有效；新审计已经推翻“effect面可作为安全下限”的外推，且不能自动证明v2。规划证据由R-001–R-017的不可变commit/diff/eval冻结，不要求之后整个仓库HEAD或其他Session WIP静止；governance scanner、route/graph anchors、self-model freshness、memory promotion与其docs-only报告均不能提供 authority 或 completion evidence，route/graph还必须先由原owner闭合production renderer与workflow input合同，memory的stable/reviewer/mattered只作上下文。implementation必须在Gate M重新选择干净隔离checkout并绑定exact baseline；若相关接口已变化，只重审受影响的消费合同，不沿用本Session snapshot授权，也不因无关commit重做架构。

### 23.2 Promotion sequence

1. **Current v1 contained**：保留inspect/legacy recovery与exact repo变更能力；新v1 Git effect authorization立即保持disabled，compound/concurrent mutant未杀死前不得恢复。
2. **Gate N evidence/stop**：contained Foundation真实运行≥20次；先判N0，再冻结N-C/N-D/N-E/N-G BUILD/SKIP。门前无v2 bytes；N0无证据即STOP，子能力无证据即对应U-block零bytes。
3. **Operation-bound migration → DRAIN_V1 + v2 dormant**：N0进入Standard后才首次构建base v2；contained v1 dependency-first安装source；public prepare创建M；public advance按capsule→DRAIN→guard-last推进。
4. **v2 explicit**：Gate F后仍由advance M激活；首笔是低风险repo fixture；v1 reader持续可用，旧effect authority永不导入/重放。
5. **v2 shadow per surface**：记录pre-entry/policy verdict，不阻断尚未mandatory的surface。
6. **Evidence-gated dormant source**：Gate F后只实例化Gate N标为BUILD的U-005/U-007/U-008/U-009；SKIP只留非completion gate annotation。selected modules与U-011先以exact repo operation安装dormant source，active bundle保持不变。
7. **Final composition**：U-010等待U-011与全部selected postimages，以唯一upgrade operation静态组合、fresh-proof并激活；stable launcher byte-identical，下游只等待U-010 receipt。
8. **Protected-surface mandatory**：至少20次v2 shadow+3次recovery后，Gate S只提升controlled-change自身stable entry/policy/controller/bootstrap；这批rollout evidence不能替代更早的Gate N需求证据。
9. **Standard explicit adapters**：已获证的并发/external/Git各自启用；personal/Git始终逐operation Gate E/R，不自动mandatory。
10. **Broader runtime surfaces**：每个surface重新累计证据/Gate S；不继承首批promotion。
11. **Stop**：Standard稳定后不继续daemon/capability/OS service/network platform。
12. **Gate H**：真实进入条件命中才开新的High-assurance plan；本计划不得被解释为预批准。

### 23.3 Implementation approval gate

本文件及其 review ledger 全通过后，状态只能到：

```text
READY_FOR_APPROVAL
Gate P: WAITING_FOR_EXPLICIT_USER_APPROVAL
Authorized effects: NONE
Next legal action: user approves/rejects/requests plan revision
```

即使 Gate P 通过，未来 implementation session 仍必须先重新 preflight：核验最终 plan SHA、选择clean isolated checkout、common-dir/worktree identity、Files preimages、current harness versions 和 Gate M/B 输入。任何漂移都 `NEEDS_CONTEXT`，不依赖本规划时的现场快照继续执行。

### 23.4 新 implementation Session 的平稳入口

1. 新 Session 的首条用户消息必须同时给出最终 plan SHA、handoff SHA 与明确的 `Gate P APPROVED`；缺一项只允许只读核验，不允许写实现。
2. 首个动作是复算 plan/handoff SHA、读取 final ledger verdict，并对 Gate M0/M 的相关路径做只读 census；不要先 pull、merge、建分支、stage 或修旁支问题。
3. 选择 clean isolated checkout 后冻结 common-dir/worktree identity、U-001 exact Files preimage 与现有 v1 raw evidence；其他项目、其他 worktree 与非 U-001 文件全部视为 foreign WIP。
4. 第一批写入只能是 U-001 的 RED fixtures；只有 Gate C 明确通过后，才按 `tests → linear store → guard-last` 应用 Foundation containment。不得提前创建任一 v2 byte。
5. U-001 完成后必须真实观察至少 20 次 contained Foundation operation，并在人门 Gate N 输出 capability vector；`N0=STOP_AT_CONTAINED_FOUNDATION` 时立即收尾，不能因为本计划描述了 Standard 就继续建设。
6. 只有 `N0=ENTER_STANDARD` 才按 Wave DAG继续；每个optional capability仍各自要求BUILD证据，SKIP_DARK不创建文件、不计PASS、不进入等待链。
7. 任一相关接口漂移只使受影响 U-block 返回`NEEDS_CONTEXT`并精确列出path/delta；无关commit、报告或其他owner WIP不得扩大本次Files，也不得触发全计划重做。

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
9. plan reviewer 的签名对象是本文件 SHA 与 R-001–R-017 的不可变来源；live checkout 只用于识别“是否存在推翻已写事实的相关delta”。无关commit、docs-only报告、其他owner WIP或单纯HEAD前进不得使已冻结plan失效。
10. 若冻结后出现相关路径delta，reviewer必须指出被推翻的确切plan句子/接口/断言；能由未来Gate M preflight吸收的baseline漂移留给implementation，只有改变目标架构或U-block可实施性时才修plan并重签。

### 24.1 Plan Agent 出门自检

- [x] 块 0 已回答该不该做、更小替代、默认形态偏差与 K-00–K-11 kill assumptions。
- [x] 每个 Phase/U-block 均可追溯到 R-001–R-017；无 task-plan 输入，块 1.5/1.6 已显式标 N/A。
- [x] 每个不可逆 external/Git/policy/launcher action 都有 BLOCKING assertion 与 Gate E/R/G/S 用户确认；当前 Gate P 之前 authority 为 NONE。
- [x] 复杂且新颖的外部研究已在 §1.3 显式说明跳过理由，并作为 Gate P 计划整体的一部分等待用户确认；后续仅在出现 Git/hook 单点 fact-gap 时查 primary source。
- [x] P1–P10 均填写单一 `model_tier`；唯一降档 P10 已写明只做冻结后的 metrics/docs/policy 投影。
- [x] 本任务是 framework/meta 工程规划，不含设计产出 Phase，OD-first / MagicPath / html-prototype 路由为 N/A。

## 25. 当前状态

本方案曾于 `CANDIDATE_UNDER_REVIEW`，因 2026-09-03 post-seal review 暂停 `Gate P`。2026-09-04
R25 增量审计（详见 `REVIEW-LEDGER.md` §8）已完成 post-seal review 要求的全部五项 closure
requirement：对 `a7d5fe3..62b6e4f`（实际执行范围扩至 `a7d5fe35..5f57da2`，含后续两轮加固提交）
做了固定范围双轴审计并独立复现修复；裁决 `to-tickets` 发布面与 `project-read-grants.mjs` /
`project-read.mjs` / grant lifecycle 均未改变目标保护面、只读锚点或 U-block 可实施性（read-grant
链已被完全隔离，`to-tickets` 未被任何发现触及）；ledger 自身完整性与原始 handoff bytes 可复算性
均已收尾。因无架构改动，本文件当前内容意义上与 R23 冻结时一致，四类签名（architecture 9/9、
safety 13/13、parity 12/12、Plan Agent 17/17）原样成立，不触发重签。implementation authority
仍为 `NONE`。恢复 `Gate P` 是与本次审计闭合独立的另一动作，须由用户在未来某个 Session 用
09-02 handoff 同款协议显式给出（首条消息写明 `Gate P APPROVED` 并绑定本文件当时的 SHA）；
在此之前不得启动 U-001。

<!-- FILE_END: FINAL-MASTER-PLAN.md -->
