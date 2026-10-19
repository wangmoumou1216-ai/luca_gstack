# 关键独立审查的中断恢复

plan_id: CRITICAL-REVIEW-RECOVERY-20261016
status: PLANNED
scope: framework-no-pin/critical-review-interruption-recovery
source_identity: /Users/luca/.codex/worktrees/cf50/luca_gstack@45600d06e8a49b5df62db61e9a8236619f19c749
mode: Sequential + Supervisor（主控实施，独立方案与终版代码复审）
tier: Deep（多次独立评审，采用稳定 U-ID）
approval: 本文件最终 SHA 经独立方案复审后，需一次绑定范围的用户确认。

## 0. 前提与本次边界

这是实际恢复缺口：可信中断留下 pending；根模型代次变化又将其转成 invalidated + CRITICAL_FAILURE_LATCHED。当前保护没有错误地批准结果，但没有安全补审通路。禁用钩子、删除 pending、将中断标 accepted、清布尔值均不解决验收义务。

更薄的替代是在新会话补审。它能恢复本次评审工作，不能修复后续中断的恢复流程，因此本计划同时执行补审与有界源码修复。

用户最新决定：**封存旧锁定；本会话完成补审，并修复今后的中断恢复流程**。旧 root `01a13f8b-aac2-7750-a0f0-1f62dbfc476f` 及 c785 工作区只读，不执行解锁、迁移、消息发送、停止会话、设计实验或发布。封存的含义是保存证据并保留原锁定，不移动/删除正在使用的账本，不在 UI 归档旧聊天。

默认产出是有限恢复协议，可能高估新增状态的必要性；最终方案由冷启动独立判官默认 REFUTE 复核。真实模型/身份/证据异常仍为硬阻断。

KILL-1：不能证明新协议的原生恢复只会产生一个替代调用，则禁止启用恢复入口。
KILL-2：真实原生生命周期无法形成开始→中断→补审→完成证据链，则不能宣布修复 DONE。
KILL-3：旧 v1 锁存账本不具有完整失败审计；本计划没有恢复它的授权与技术承诺。禁止借 clean-upgrade 或 SessionStart 绕过这一点。

本任务没有 task-plan.md/DEV 输入。需求映射来自用户请求和本次 handoff，不把原设计计划的实现卡片混入钩子修复范围。

## 1. 冻结输入

- Handoff：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-handoff-20261016-142114.md`，SHA256 `45e8b70aa544b66b55914c22a4798dc8eadf1163bc66c5e0953af371844170b4`。
- 旧账本：`/Users/luca/.luca/state/model-routing/codex/cc0e916efaa7a904b12558d8db0adba380db7913e067426749e27b7c159faa04.json`，观测 SHA256 `2bcff2d58e1bbbf33f0b6fec0aa37e8ceccd44233f312c0aec996c06b2178b7e`。活状态仅重新读取，不覆盖。
- 新原设计补审：`/tmp/luca-critical-recovery-20261016.ZzVz2e/refrozen-review-input.json`，SHA256 `5a3f830405c00966e85c9029ad6b72d82f5bbf0e35a2d34afa3205d8e9563cce`。112 个复制文件 + spec，9 个文件相对旧审查变化；冻结 diff SHA256 `8ad6c9c189e6c19d0e8894f2675f65c4b5edeacc966989dbe4e37e74fa9f77f4`。
- 运行事实：原子消息参数为不透明加密内容。真实隔离 CLI 中将 updatedInput.message 改为明文后，provider 仍将它作为 encrypted_content 接收。因此禁止从该实验声称能重放明文或解密旧 prompt。
- 现有测试基线：host 138/138；native hook 388/388。这不是修复验收证据。

## 2. 目标协议与权威边界

### 2.1 共用状态与准入

在现有 `model-route-host.mjs` 中维护 schema v2、revision、追加式 failure_records、review_obligations、recovery_reservations、resume_intents 和 retired agent identity。所有状态变化沿用单 root 锁与原子替换；不建立第二个调度器。

硬失败与中断分开：可信中断记录为 interrupted，永不 accepted。模型、身份、无归属终止、损坏证据、意外恢复活动均留下有来源的硬失败，包含 activation/generation/invocation/ref；已有失败不吞掉新原因。

共享 `dispatchAdmission(state, context)` 是 host、native hook、runner 的唯一准入判断。普通派发要求没有未闭合关键准备/调用/补审义务/硬失败。唯一例外是当前 root、当前 release、当前 policy 下的一次精确恢复 reservation；runner 不获得恢复例外。native 的串行关键审查约束与 runner 原有内部调度边界分别保留。

义务状态：OPEN → RESERVED → RUNNING → COMPLETED。替代调用可信中断后回到 OPEN 并保留前次 attempt；坏证据进入 BLOCKED。原调用、替代调用、原生 tool/agent/turn 和 descriptor 各有独立身份与摘要，不挪用原 input_sha。

COMPLETED 表示**此审查完整执行并返回绑定到冻结范围的报告**。它不表示审查内容 PASS；报告可以 FAIL/UNKNOWN，父级既有质量/发布门继续按报告裁决。路由 host 不新建“语义 PASS 批准器”。

### 2.2 语义范围与不透明传输

恢复 descriptor 是冻结的有限文件清单（绝对规范路径+SHA）、完整 criteria ID/文本、只读效果、agent_type=quality-gate、cold fork、授权来源引用。恢复只允许这个 descriptor。它是语义范围承诺，不宣称等价于旧加密 prompt。

正常 native caller 使用工具发送新的 prompt，明确要求读取 descriptor、核验文件并输出含 descriptor SHA 和完整 criteria ID 的结构化报告。hook 不改写消息明文。task_name 中的 reservation ID 仅用于查找，不是授权；host 同时核 root、activation、generation、revision、descriptor、角色、冷启动、当前路由和单次消费。

无先前冻结范围的调用中断后，必须先有本次范围的明确重新冻结授权，才能登记新 descriptor；不能自动推断“相同任务”。授权来源由当前主控依据真实用户消息核对，JSON/哈希本身不创建用户授权。命令不接受 `--force`、`--clear-failure` 或伪造终止布尔值。

### 2.3 最小公开入口

新增 `scripts/codex-review-recovery.mjs`，只提供 `inspect`（只读）、`reserve --descriptor <path> --expected-state-sha <sha> --authorization <record>`。它调用 native adapter 的证据解析和共享 host 事务，不执行子 Agent。

`inspect` 返回精确阻断原因和所需证据。`reserve` 在父会话规范原生记录中验证当前 caller/root/workspace，读取原调用和原生父/子 transcript，验证原 spawn 参数的 opaque digest、父子身份、实际模型、原始 child turn 的可归属 turn_aborted，以及没有更晚运行/恢复记录。拒绝从用户 JSON 获得 terminal=true 等结论。

原生授权边界具体落在已注册的 Bash PreToolUse：只识别该脚本的单一、无复合 shell 效果的 reserve 命令，依实际 hook payload 执行上述事务，再把命令更新为读取该次 reservation receipt 的只读命令。CLI 的 reserve 在未经过这个 native seam 时拒绝，不能自行制造 hook payload。这样无需把环境变量、caller JSON 或新签名格式当作 native authority；inspect/receipt 展示本身不产生写权限。授权 record 的用户来源仍由主控根据真实消息核对，不能把此 native seam 等同用户批准。

host 事务核全量旧状态 SHA/revision、原调用、证据文件内容摘要、descriptor 所有文件摘要，持久化唯一 reservation 及旧 child retirement，返回新 task_name/调用要求。随后已有 beginCriticalPreparation/prepareInvocation 在同一套 host 中消费该 reservation；任何途中不确定性均保留已保留状态，不能因超时重用。

同一个 operation_id 和同一 payload 重入返回原结果；不同 payload、第二个调用或失效版本拒绝。路径只命名读取对象，root SID 必须来自可信 native caller 与账本关联，不能靠环境变量自报跨 root 恢复。

### 2.4 原生中断、恢复围栏与迟到事件

SubagentStop 与下一次 PreToolUse 的缺失回调对账使用同一个终止分类器；SessionStart/root-anchor 更新之前先尝试该分类器。未知证据维持阻断。

将 native hook 注册扩展至恢复/跟进旧 child 的相关工具。对 target 使用原生 tool result/child identity 确认的 agent ID/规范 task alias，不靠相似任务名。准许 followup/resume 前在 host 锁内登记 resume intent；尚未闭合的 intent 阻止 recovery reservation。reservation 先提交则旧 child 的后续 resume/followup/send 拒绝。child SessionStart 也检查 retirement。未知关联拒绝，避免 check→allow→resume 与 reservation 的竞争空窗。

已有旧 callback 只能引用原 invocation；相同已处理终止幂等，不能接受替代调用。观察到退休 child 的新活动时记录异常并阻断，不能当作普通迟到完成。真实原生 registration/启用状态与候选 hook 定义必须一致，缺少恢复围栏能力时 reserve 返回 NEEDS_CONTEXT。

### 2.5 激活、版本与写入

adapter contract/release identity 必须反映新语义。v1 有锁存失败或未完成关键工作时保持只读拒绝，明确 LEGACY_RECOVERY_NEEDS_CONTEXT；本计划不恢复旧事故 root。

仅当旧 activation 没有 pending 调用、未闭合准备、关键失败或义务时，可信 SessionStart/PreToolUse 可以建立当前 release 的干净 successor，完整保留旧历史。相同 SID 的 resume/compact 不得重置未完成义务。

对于完整审计的 v2，只有“根代次改变时尚未闭合”这一协调失败，且其对应调用均随后证明为可信中断、无其他失败，才允许恢复专用 successor。旧 activation 的失败标记不清除；新 activation 保留原未完成义务，仅准许恢复 reservation。硬失败不能走此分支。

跨 activation 的历史与 successor 提交在同一原子状态记录内保存，外部 history 文件只作副本，避免两个文件之间的提交缺口。原子写入 fsync 后提交、同步父目录；rename 后异常用 operation_id/读回区分已提交与未提交。锁忙保持拒绝，不按超时删除活锁。回滚只停止新派发并保留状态，不覆盖已产生的新调用。

## 3. 文件与效果范围

允许的工程文件（按需修改，不为凑范围创建）：

1. `scripts/model-route-host.mjs`
2. `.codex/model-route-hook.mjs`
3. `.codex/workflow-runner.mjs`
4. `.codex/hooks.json`
5. `scripts/codex-review-recovery.mjs`（新增）
6. `scripts/test-model-route-host.mjs`
7. `scripts/test-codex-model-route-hook.mjs`
8. `scripts/test-workflow-runner-runtime.mjs`
9. `scripts/test-codex-native-lifecycle.mjs`
10. `scripts/test-codex-review-recovery.mjs`（新增）
11. `.codex/MODEL_ROUTING.md`

允许本任务 `framework-audit/critical-review-recovery/` 证据、计划和自有 `/tmp/luca-critical-recovery-*` / 原生测试临时资源。不得修改 framework/、产品项目、模型私有绑定、原 c785 工作区和旧故障账本。

效果：本地源码与文档、拥有的隔离 repo/进程/loopback server、冷启动只读子 Agent、当前新会话与隔离原生测试的正常生命周期状态。必要时只核验当前 checkout 的 hook registration；若启用新 matcher 需要额外宿主/主 checkout 改动，则停在部署门报告精确差异，不扩写未批准位置。用户后续明确要求验证无问题后提交、推送 main、拉回本地；这些效果仅在 U-006 执行。没有外网模型配置、旧会话消息或设计实验。

## 4. U-block 与顺序

各 Phase 均为 `phase_type: task_execution`，串行执行，`max_active_subagents=1`。实施角色为当前主控 anchor（不另派 Work Agent）；独立评审入口为 `collaboration.spawn_agent(agent_type=quality-gate,fork_turns=none)`，由当前 model-routing 的 MR-004 解析 peak，effort 不覆盖。U-001 的只读补审是用户已经单独授权的准备工作，不产生 U-002 以后的实施授权。

以下 U-ID 同时作为 Phase ID；共用 Read List 为 §2 对应实现文件、§1 冻结输入和 `project-verification.md`，执行前按涉及的 API 定向复核。无外网研究阶段：本地事故 trace、源码、独立协议评议与真实 CLI 可行性实验已提供直接证据；若执行发现新的运行时能力未知，先做隔离 probe，再决定是否可实施，不预设能力存在。所有 U-block 初始 Status 均为 PLANNED，状态变化记入单独 checkpoint，不改写批准的计划字节。

### U-001 — 重新冻结与补审

Goal: 对同一冻结的112文件范围重新完成两个独立审查轴。
Source: 用户最新两次范围选择。
Dependencies: 无。
Owner: 主控冻结，独立 quality-gate 串行 Standards→Spec。
Output: 新 manifest 的两轴报告及各自 native completed+ledger accepted 票；旧锁定证据副本。
Assertions: 全部112文件+spec+diff哈希一致；同一manifest，不复用旧票；报告明确真实检查范围。补审可得 FAIL/UNKNOWN，不能把它计作原设计验收通过。本任务不实施原设计缺陷修复。
Files: §1 已冻结的 scratch 文件只读；两轴报告写入本任务证据目录。
Approach: 校验摘要后串行冷启动，收取真实报告和同次原生 accepted 票。
Test scenarios: 文件匹配；文件漂移；审查报告为 FAIL/UNKNOWN 时仍如实登记、不得充作验收 PASS。
Verification: 两轴前后逐项重新 hash，核对其 native final 与 ledger accepted 对应同一调用；报告引用同一 manifest SHA。

### U-002 — 方案门与红测试

Goal: 把本计划的失败边界转成在未改实现上能失败的测试。
Source: inline 用户要求“解决所有阻塞项后再实施并复验”。
Dependencies: 用户已选择旧账本封存；最终方案独立审查无未解决 Critical/Important；精确计划确认。
Owner: 主控。
Output: 当前源码 preimage 清单、隔离测试资源、能在未改实现上失败的恢复行为断言。
Assertions: C01–C12 覆盖映射完整；原生候选 overlay 完整，依赖缺失的 SKIP 不冒充 PASS。
Files: §3 的测试文件、自有隔离快照和证据目录。
Approach: 保留现有基线，新增针对恢复及负例的行为断言，记录 red。
Test scenarios: C02–C09 的成功、边界、故障分支均有独立 oracle。
Verification: 下文 TEST-RECOVERY 对未改实现必须非零；不能以缺文件/语法错误代替有意义的行为失败。

### U-003 — 最小实现

Goal: 在现有 host/hook/runner 接入单次受控恢复并保留失败审计。
Source: inline 用户要求“修复今后的中断恢复流程”。
Dependencies: U-002 PASS。
Owner: 主控，先在自有隔离快照完成实现与测试，防止未验证 host 半成品改变当前会话派发。
Output: 上述有限文件 diff、schema/版本/恢复入口说明。
Assertions: C01–C10；所有三处消费者使用同一 admission；不引入新调度器或人工清失败开关。
Files: §3 的实现、hook注册、文档及受影响测试。
Approach: 先共享状态与准入，再接 native 证据与 reservation，最后接 runner 和生命周期版本边界。
Test scenarios: C01–C10；未来 v2 跨代次中断可恢复，旧 v1 锁存拒绝。
Verification: TEST-HOST、TEST-HOOK、TEST-RUNNER、TEST-RECOVERY。

### U-004 — 原生闭环、故障与终版复审

Goal: 用候选字节取得真实原生中断恢复证据及独立终版审查。
Source: inline 用户要求“验证修复后能正常派发”。
Dependencies: U-003 通过聚焦测试。
Owner: 主控验证，独立 quality-gate 串行 Standards→Spec。
Output: 冻结最终 diff/spec、测试与 mutation、完整候选字节原生生命周期证据、两个独立票。
Assertions: C01–C12；真实 CLI 中断事件不得由测试写 JSONL 伪造；loopback 仅证明生命周期，真实 provider 冷启动补审证明实际 descriptor 读取/报告。复审如要求改动，只改责任范围并重新冻结最终版本。
Files: §3 测试与本任务证据目录；独立审查不改实现。
Approach: 完整 overlay/hash 后运行真实 CLI，核对生命周期与账本，再串行审查最终 diff。
Test scenarios: 正常闭环；中断与回调缺失；并发/迟到/写盘故障；guard mutation。
Verification: TEST-MUTATION、TEST-NATIVE 与 Q01–Q05 判定。

### U-005 — 当前 checkout 交付与复验

Goal: 在当前 checkout 交付已审字节并完成真实只读派发复验。
Source: inline 用户要求“本会话完成补审，并修复今后的中断恢复流程”。
Dependencies: U-004 PASS；运行部署门无额外未授权效果。
Owner: 主控。
Output: 原子/有序应用已审 diff到 cf50，当前真实原生只读 dispatch completed+accepted，干净升级或安全拒绝的明确证据。
Assertions: 当前 candidate SHA 与测试字节一致；旧 root 仍锁定且字节未被本任务改变；c785 未被修改；不声明旧会话已解锁。缺真实原生闭环时 BLOCKED，不用单元测试代替。
Files: §3 有限工程文件和证据目录；旧账本/c785只读。
Approach: 核 preimages 后应用已审 diff；以当前真实 root 的正常 native 路径复验。
Test scenarios: 干净 release 升级；存在义务则安全拒绝；真实 cold reviewer 完成并 accepted。
Verification: 重算候选 hash；读取同次 native evidence 与账本，核旧事故账本未被本任务写入。

### U-006 — 提交、推送 main 与本地同步

Goal: 已验证修复进入 origin/main，并在本地保留相同提交。
Source: 用户当前持久目标“没问题后，提交 推送main 拉回本地”。
Dependencies: U-005 PASS；实际最终 diff 的独立审查无未解决 Critical/Important；发布前核对当前远端 main。
Owner: 主控。
Output: 精确提交 SHA、远端 main SHA、fetch 后本地对应引用与验证结果。
Assertions: 只提交本任务修复及必要证据；不提交无关脏文件；不 force push；若 main 前进则在独立整合 checkout 合并并复验最终内容再发布。
Files: §3 范围及本任务计划/证据；主 checkout 若有用户脏文件，保留并通过独立 checkout 整合，不覆盖用户工作。
Approach: 检查 worktree/远端/分支状态，创建 codex/ 分支保留提交，fetch 并整合 origin/main；最终审查与测试绑定将推送的字节，普通 push 到 main，再 fetch 并核对远端与本地 SHA。
Test scenarios: main 未变的快进；远端前进导致拒推后重新整合；本地脏工作区保留。
Verification: 提交文件清单、实际 push 结果、远端 main 与 fetch 后本地引用相同；若仓库保护要求 PR，则走 PR 并保留其合并门，不绕过保护。

拓扑 Wave：1=[U-001,U-002]（实际串行；U-002还受方案审查/用户确认门约束），2=[U-003]，3=[U-004]，4=[U-005]，5=[U-006]。每个下游均以已完成上游及对应验收 PASS 为前提，U-005另外依赖U-001补审完成。机械 graph 只检查依赖，不授予执行权限。

## 5. 验收分母

| ID | BLOCKING 验收 |
|---|---|
| C01 | 既有正常完成、角色/model选择、cold fork、Claude shared-host 行为不回归 |
| C02 | 可信中断分别在 Stop 到达与缺失时归类 interrupted，原调用永不 accepted |
| C03 | 原生身份、原始 turn、model、opaque digest、descriptor文件与criteria不符时拒绝 |
| C04 | 普通 spawn/runner 在义务未闭合时拒绝，无 Agent 副作用；只放行一个精确恢复调用 |
| C05 | 新调用具有自己身份/opaque摘要，报告绑定descriptor及完整criteria；路由 ACCEPT 不冒充语义 PASS |
| C06 | 所有失败来源追加保存；真实模型/身份/证据异常继续阻断，包括先有协调失败再有真实失败 |
| C07 | 同 SID restart/resume/compact、代次与release变化保留义务；有问题的 v1不自动迁移 |
| C08 | 重复请求、两个reservation、resume竞争、迟到callback、再次中断满足单替代者与不可错认 |
| C09 | 锁忙、写入前/rename后故障、未知提交均不虚报可派发；读回/operation ID可判定结果 |
| C10 | mutation移除身份、输入、唯一性、失败、围栏、版本guard时对应断言变红，再还原为绿 |
| C11 | 完整候选字节真实CLI开始→中断→恢复→完成；loopback范围明确，并有真实provider补审票 |
| C12 | 最终diff独立Standards+Spec通过；原设计补审两个轴完成并分别报告，旧锁定不被更改 |

验证命令按实现后的确切入口绑定：现有 host/hook suite、host --mutation、隔离 runner suite、新 recovery suite、扩展真实 native lifecycle suite。每份结果保存命令、exit、候选SHA与证据路径。没有运行的项目标 NOT_RUN，不作为方案审查前就应存在的实现证据。

以下命令均从本任务自有、已绑定 candidate hash 的隔离源码根执行；具体绝对路径在 checkpoint 固定，不使用其他人的 checkout。各断言在独立 bash 进程运行。

```bash
# [BLOCKING] TEST-HOST — C01/C04/C06/C07/C08/C09
if ( set -o pipefail; node scripts/test-model-route-host.mjs ); then echo 'PASS TEST-HOST'; else check_rc=$?; echo 'FAIL TEST-HOST'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] TEST-HOOK — C01/C02/C03/C04/C05/C07/C08
if ( set -o pipefail; node scripts/test-codex-model-route-hook.mjs ); then echo 'PASS TEST-HOOK'; else check_rc=$?; echo 'FAIL TEST-HOOK'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] TEST-RUNNER — C01/C04/C07; suite 仅写拥有的隔离根
if ( set -o pipefail; node scripts/test-workflow-runner-runtime.mjs ); then echo 'PASS TEST-RUNNER'; else check_rc=$?; echo 'FAIL TEST-RUNNER'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] TEST-RECOVERY — C02–C09; 包含源码语法、descriptor、可执行入口与结果 oracle
if ( set -o pipefail; node scripts/test-codex-review-recovery.mjs ); then echo 'PASS TEST-RECOVERY'; else check_rc=$?; echo 'FAIL TEST-RECOVERY'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] TEST-MUTATION — C10; 变异仅发生在自有临时副本
if ( set -o pipefail; node scripts/test-model-route-host.mjs --mutation && node scripts/test-codex-review-recovery.mjs --mutation ); then echo 'PASS TEST-MUTATION'; else check_rc=$?; echo 'FAIL TEST-MUTATION'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] TEST-NATIVE — C11; 新增 required 标志使缺依赖返回非零，不能只看旧 suite exit 0
if ( set -o pipefail; node scripts/test-codex-native-lifecycle.mjs --critical-recovery --require-native ); then echo 'PASS TEST-NATIVE'; else check_rc=$?; echo 'FAIL TEST-NATIVE'; exit "$check_rc"; fi
```

产出质量 criteria（grader=独立 quality-gate；每条 pass/fail/unknown + 文件行号/命令输出；FAIL 回 U-003，方案前提失败回 U-002）：

- Q01：修复报告区分可信中断、硬失败与旧 v1 审计缺失，所有因果主张有原生或实现证据。防事故原因被“清标记”替代。
- Q02：恢复代码只放行已冻结的单次独立审查，普通派发无提前放行路径。防补审豁免扩大成普遍绕行。
- Q03：传输摘要与语义范围分别绑定，任何完成/通过主张都准确对应同一份输入与其真实报告。防9文件漂移、加密输入误认和旧票移用。
- Q04：实际运行候选就是最终交付候选；完整原生闭环、负例及 mutation 足以发现缺失的关键守卫。防旧 HEAD overlay 和 SKIP 假绿。
- Q05：旧 root/c785 保持本任务只读，所有变化可追溯到§3；最终验收没有扩大用户选定范围。防封存变成无证据解锁。

失败策略：任一 BLOCKING 或 quality criterion FAIL/UNKNOWN，停止其依赖阶段；修复后重验对应边界。三次相同工具故障保持 BLOCKED 并给精确证据，不盲重试。原设计补审中的业务 FAIL 记录到原设计审查报告，不被冒用为钩子实现失败，也不获得静默修复原设计的权限。

## 6. 交付标准

DONE 必须同时提供原因链、已审代码、原生恢复闭环与当前真实派发票；原设计补审按自身真实 verdict 报告。若 deployment/原生运行能力阻塞，交付已完成结果并精确标 BLOCKED。旧事故 root 按用户选择保持锁定，不计作修复后的已恢复会话。

## Replan R-1（2026-10-16，补齐当前原生调用的授权关联）

触发：最终方案独立审查 P2 指出“活动 transcript + 旧 spawn”不足以证明当前 reserve 命令实际被 native 发出。此节细化并约束 §2.3；文件/效果范围、U-ID 和旧锁定处置不变。

已完成的原生可行性证据：`/private/tmp/luca-native-lifecycle.pboQr5/pretool-native-call-proof.jsonl` 在真实 CLI 的 Bash PreToolUse 入口捕获当时已存在的 transcript 前缀，五个独立 wrapper 调用均可读到规范外层 `custom_tool_call` 和确切命令。Bash 的 `exec-*` ID 与外层 `call_*` ID不同；前者不能伪装成原生调用身份。只读核验报告位于 `/tmp/luca-critical-recovery-20261016.ZzVz2e/current-native-call-proof.json`。另一原生 probe `/private/tmp/luca-native-lifecycle.S0AVN7/interrupt-probe.json` 记录两个真实 child turn_aborted、零 SubagentStop；它是能力证据，不是修复通过票。

新增 binding 算法：

1. 写 ledger 前，按 `currentNativeRecords` 的根身份、checkout、当前 active turn校验读取规范原生 transcript 前缀；候选必须是本回合唯一最新、尚无原生结果的调用，且之后没有另一 tool call、turn终止或切换。
2. 直接 `exec_command`：原生 `function_call.call_id` 必须等于 hook tool_use_id，JSON arguments 的 cmd/working-directory 必须匹配实际 hook command/cwd，且唯一、无歧义。
3. `functions.exec` 包装：只支持完整源文本就是单个 `text(await tools.exec_command(<literal>));` 的受限形式。`literal` 只能为白名单键的 JSON对象，或 probe中已验证的单字面cmd+数字 max_output_tokens形式；字符串只用 JSON.parse解码，绝不 eval JS。变量、拼接、多工具、分支、循环、动态wrapper全部拒绝并要求独立一次调用。核外层 `custom_tool_call` 的 namespace/name、原生call_id和enclosing turn，精确比较解出的cmd/cwd与hook输入。synthetic Bash ID只作观测记录，不作为授权身份。
4. operation identity = 根SID + 当前turn + **规范原生外层call_id** + command/argv摘要 + descriptor摘要；在host锁内与全状态CAS一同一次消费。相同规范调用的重复hook只返回原receipt，不能产生第二个reservation；替换synthetic Bash ID不能换取新票。按原生外层ID消费也防同一wrapper的重放。命令内容仍须满足单一公开reserve argv与精确冻结来源/范围。
5. 提交前重读 native前缀身份/摘要及当前末端，若调用已完成、另有tool调用、原生文件被替换/截断、或当前turn改变，则拒绝。只允许原记录后的无关只读计量事件，不接受新的指令活动。
6. 如果当前工具记录在某宿主的 PreToolUse 时不可见、wrapper不在受限语法内、身份无法唯一归属，则 `NEEDS_CONTEXT`，没有退化到“只看活动会话”的分支。

新增 C03/C08/C10 负例：用真实活动 transcript 但没有 reserve调用的伪造hook；已存在其他命令却替换cmd；错root/turn/原生call_id；旧已完成call重放；多工具/dynamicwrapper；同一外层ID换synthetic Bash ID请求第二张票；原生前缀/尾部改变。所有负例都要求拒绝且不写reservation、不派发Agent。对照正例必须在真实CLI的直接调用和受限wrapper入口命中；回归只看JSON fixture不足以证明入口存在。

## Replan R-2 — 原生入口能力证据与最终发布范围

触发：方案独立复审的两个 Important UNKNOWN，以及用户追加最终提交/推送 main/本地同步目标。U-001–U-005 的工程范围与旧锁定处置不变；新增 U-006。

直接调用与跟进围栏的原生证据位于 `/private/tmp/luca-native-lifecycle.ZjHgkH/capability-probe.json` 和同目录 `pretool-capability-proof.jsonl`、`hook-payloads.jsonl`、`responses-requests.jsonl`。真实 CLI 在三次直接 exec_command 的 Bash PreToolUse 中已可见当前 function_call，call_id 与 hook tool_use_id 一致，命令相同且尚无该次结果。四次跟进调用均在 PreToolUse 被原生拒绝：followup_task 的规范 task path、相对 task name，以及 send_message 的规范 task path、原生 agent UUID。之后原 child 仍只有一次真实 turn_aborted，无新 turn/task_complete。该探针只验证宿主入口能力，不充当候选实现验收。

当前宿主实际提供的继续执行入口是 collaboration.followup_task；消息入口是 collaboration.send_message。它没有单独的 resume_agent 工具；文中 resume intent 指这些入口产生的继续执行意图，不承诺一个不存在的 API。生产 matcher 按实际原生名字覆盖 `collaborationfollowup_task` / `collaborationsend_message` 及适配器已支持的规范变体。只允许已验证的能力集合；其他 runtime/tool surface 缺原生证据时恢复拒绝 NEEDS_CONTEXT。

target 解析从同一根的规范原生 spawn function_call（task_name）、其 function_call_output（规范 task path）和同次 SubAgentActivity/child session_meta（原生 UUID）联结；不能用“当前某个名字看起来相同”猜测身份。原生 ID、规范 path、相对别名均须唯一关联同一个 invocation，否则拒绝。上述四种真实拒绝证据证明 hook 可在这些输入生效前执行；实现后的 C03/C08/C10 仍须验证实际解析和锁内围栏。

本次宿主重启的额外真实证据：当前 root 的 activation `684d6a31-f9e4-4811-9a1b-8fe0c86ba499` 留有未完成 Spec 审查，SessionStart 却创建了空 activation `89b3b6d1-b0f0-4eed-acbe-1d0bfb149e79`。原子历史副本仍在，但准入丢失未完成义务。这是 C07 必须阻止的行为；中断 Spec 不计完成，需重新取得完整票。不得将本次旧实现创建的空账本当作已完成审查证据。
