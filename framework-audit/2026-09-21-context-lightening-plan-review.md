# 完整轻盈化计划会审记录

状态：DONE／v3.2计划会审通过，待用户确认是否实施。专家3/3、独立红队14/14；这不是实现、实验或性能验收。早期缺票与FAIL保留为历史。

## 已完成

### C10专家只读取证

- 首期应限定为同一轮完整验证的组合与环境预检；跨命令证据缓存、按依赖跳测应另立提案。
- 现有verify.sh已经通过覆盖变量省掉Codex子检查中的两套Claude回归，不能将旧去重当新增收益。
- 当前S30排在S34之后，而子检查提前写“本轮已运行”，需改为真实消费者归属和DELEGATED，不把尚未取得的结果标PASS。
- 不改两个Git hooks，不取消全量，不改个人授信；预检应先分清实际部署面、linked worktree、CI参数和浏览器权限。

### 完整计划v2专家审查

独立quality-gate结果：FAIL（2/5），三项Important：

1. C4仅定义选择器输出，没定义替代manifest/office完整YAML读取义务的接线，会导致双读或违反合同。
2. 范围只有文件类别，缺精确路径、分工和可执行断言，实施者仍需自行设计批准范围。
3. 全任务字节不得增加与增重后人工裁决的表述冲突，1%增重、无30%收益及INCONCLUSIVE的去留不明确。

v2中已通过的两项：候选取舍/阶段依赖；暂停/发布/回退边界。此审查未执行实现或测试。

## v3主线修订（不是独立闭合结论）

- C4改为从唯一YAML机器生成39个静态视图；manifest指向具名workflow-mode owner，office/双根及评分器同步替代，复用Read/EOF证据，不增加执行型选择器通道。
- 列出U1–U4准确允许路径、39项生成闭集、顺序/分工及A1–A5命令；范围外改动须delta审批。
- 统一收益判定与FAIL／NO_BENEFIT／REGRESSION／INCONCLUSIVE去留，全部非PASS均不自动发布；30%是待用户确认的计划目标，不是已实现收益。
- 补充T6正向自省的真实对照，限定56会话包含8个校准；成本未知时须先确认，不默认消耗。

## 缺票与停止线

另一条冷启动独立红队分派返回 `collab spawn failed: agent thread limit reached`，没有创建成功，因此没有红队结果。原生模型路由存在该未启动调用的待关联记录；本轮没有清理/重置它，也没有改调度代码或绕过它。

v3仍须在具备正常受信任调度的会话完成：

1. 专家对v2三个Important的限界复核；
2. 独立红队对完整v3及新增C4/C10设计的对抗审查；
3. 将存活问题交用户，明确确认最终计划后再解除实施暂停。

不得把本文件当通过票，不得将v3称为最终可执行方案。新会话使用新的合法根激活，不复用旧实例成功回执、不删除本次失败证据。

## 恢复所需材料

只读入口：`framework-audit/2026-09-21-context-lightening-execution-plan.md`、本文件，以及计划列出的直接源文件。不要读取项目docs别名。

恢复指令：**只完成计划专家复审与独立红队，不改七份冻结实现，不运行候选或发布；只有用户明确批准最终计划后才进入实施。**

本轮已按SHA-256检查七份冻结实现文件均未改变；本轮新增/修改内容仅为计划和会审记录。

## 2026-09-21 续审 checkpoint（01a0c286）

- 范围：仅计划完善；NO_PIN。不实施 U1–U4，不运行 A1–A5、候选或56会话实验，不提交/推送，不回滚七份试验。
- 基线：HEAD=`05aa78adc431231455dabbfae94cccf362eb4339`；输入v3计划 SHA-256=`6116db0e1f5a9be09cc2286e468b7e7b184f9c0fea1f698abe6b984546737249`。工作区既有大量无关WIP，不当正式基线。
- 本轮顺序：入口核对 → 专家限界复核与独立红队 → 仅修计划 → 必要时同一终版复核 → 交用户确认。这是规划内会审，不启动实施编排。
- 入口preflight：`/root/review_preflight` 返回 PASS；两份明示target可读、standalone输入充分、NO_PIN边界清楚。
- 当前评审：`/root/v3_expert` 负责C4替代接线、精确范围/断言、成本裁决三项；`/root/v3_redteam` 独立质疑完整计划。两者冷启动，不共享对方结论，不改文件。主agent只负责证据核对与计划修订。
- 判据：C1 三个旧Important逐项闭合；C2 红队无存活BLOCKER/MAJOR；C3 两票绑定同一终版字节且调度成功证据可核；C4 七份冻结实现哈希不变；C5 计划通过不冒充实现通过，不扩大授权。
- 恢复：先读本记录与同名execution-plan，核验HEAD/计划哈希；有活跃评审先收票，不重复派发；只有计划需要修订。规划文件以外仅发生启动要求的pending-disposition `UNRESOLVED`留痕，旧pending未归档、未晋升任何记忆。

七份冻结实现的本轮入口SHA-256：

```text
7fdf69f5b74f736626c62027d850d62360467a1974c88eeda03334d3988699db  AGENTS.md
3408ffea85b479b81152a420afec35019352dca2165b668dbfca96ea67e1fbdc  CLAUDE.md
9607902657342e8c5cabd013fa3a8ede9d8508928b90350e32eb53a8fa580e17  .claude/skill-os/generated/context-index.md
05339b022a4bbd7c69fec4db7d735eab060015ea0b40aef9345bf67e9b87d136  scripts/build-agent-context.py
e963ab0bebccc6a98a24eca371415f269c185a190b04ac8a4ba6d295b638ee28  scripts/check-agent-context.mjs
0ce290cf55c0fb43ca4b08113ddac5a7b7c723cf43b863ce043af834c3fd9ef7  scripts/test-agent-context.mjs
6166183a08ebc4f075d2743b2e579b77a50805c17cc5308bd6a58790558ff324  scripts/run-agent-context-ab.mjs
```

## 本轮会审结果与停止点

| 轮次 / 对象 | 专家（三项） | 独立红队（十四项） | 总门 |
|---|---|---|---|
| R1 / v3 `6116db0e…737249` | FAIL 2/3：U2未明示双根与索引同批路径 | PASS 14/14，仅计划充分性 | FAIL |
| R2 / v3.1 `b790308b…6da79c` | FAIL 2/3：U2已闭合，U3仍漏同步索引路径 | PASS 14/14，仅计划充分性 | FAIL，不取多数票 |

冻结终版SHA-256：`b790308b5bd109fb7851dec5e36b49b6f796f78ab824ce52981bea1ed86da79c`。两位均已完整重读该版本；之后不再修改计划正文。v3.1标题“待用户确认”不表示计划已通过，状态以本节总门为准。

### 已完善

1. U2显式列出双根、生成索引及相关生成/检查/评分/fixture路径，串行复用且同批验收，不把C4入口推迟到U3。
2. 收益判定展开为 `FAIL → REGRESSION → INCONCLUSIVE → NO_BENEFIT → PASS` 的优先级；所有非PASS都阻断G5，仍保留每条底层失败/未知，不改变30%目标或56会话预算。

### 唯一存活专家项（Important，范围授权）

计划169行U3要修改manifest的加载期限，但没有明确列出 `.claude/skill-os/generated/context-index.md`。计划82–88行又要求索引无损反映运行字段：该修改必然要求同步生成索引。“复用生成器”不等于某一U-ID已取得生成输出的写权，不能由实施者自行推定。

建议交用户裁决的精确delta：**仅把 `.claude/skill-os/generated/context-index.md` 补入U3同批允许路径，并明确其只同步获批的P4期限；不扩大U1–U4总文件并集，不实施。** 本轮未应用此第二次修订。用户允许后才能补计划并再审；不能拿红队的总范围PASS抵消专家的逐U-ID FAIL。

红队残余风险仅两项：原生恢复/全任务指标是否可完整取证、30%实际收益能否达到；均已有拒绝姿态，仍待实施验证。详细原始质疑见 `framework-audit/2026-09-21-context-lightening-redteam.md`。

### 调度与票据证据

Root session：`01a0c286-f4eb-7180-bff7-5080c4b50b22`；activation：`e6d95257-2698-4caa-b5f6-dc4524150007`。读取当前activation确认active、critical_failure=false。

- 专家R1 invocation=`56d49ab9-4114-49eb-ad51-3544bae50ed4`，agent=`01a0c28a-4b59-7b10-97b6-96724fc79584`，requested_role=peak，accepted。
- 红队R1 invocation=`ff31e187-a7db-4e37-8c5b-74035c24ee95`，agent=`01a0c28d-1fe0-7540-9dc1-cc0f6c34e86c`，requested_role=peak，accepted。
- R2为同一隔离评审agent的followup，不伪称新的dispatch票。原生transcript分别确认最新turn_context仍与已请求模型一致、final_answer含完整终版SHA及本轮envelope、同turn的task_complete成功：专家turn=`01a0c294-6c63-75d0-8370-39d9ea661c59`（06:09:24Z）；红队turn=`01a0c294-94bb-7b81-84d4-c6927b5acd05`（06:09:20Z）。不是用R1 accepted冒充R2完成。
- transcript精确来源：`/Users/luca/.codex/sessions/2026/09/21/rollout-2026-09-21T13-57-18-01a0c28a-4b59-7b10-97b6-96724fc79584.jsonl` 与 `rollout-2026-09-21T14-00-23-01a0c28d-1fe0-7540-9dc1-cc0f6c34e86c.jsonl`（同目录）。

四份原样envelope已由独立recorder落入其解析的权威store `/Users/luca/Desktop/luca_gstack/memory/evals/eval-log.jsonl`，不自行重定向记忆根：

| eval_run_id | 原始结论 | recorder SHA-256 |
|---|---|---|
| context-lightening-v3-expert-20260921-01a0c286-r1 | FAIL 2/3 | `9625a2e83402127cdbaf51330e5d61fb199820915295c7e4f3ed1cbb32e1202b` |
| context-lightening-v3-redteam-20260921-01a0c286-r1 | PASS 14/14 | `dccbbdd17cd21419a64156f6b66c5869f8f219204185bec229c611575b1e89ef` |
| context-lightening-v31-expert-20260921-01a0c286-r2 | FAIL 2/3 | `7732d520e602e8e64d107e4c3a870cc1b0e7a24cfdb730d46e680ffceb3fab8c` |
| context-lightening-v31-redteam-20260921-01a0c286-r2 | PASS 14/14 | `ed6ef43a79b9d2b19d0e352a6e12c1e64d6d7d8274d3ad8179beac73c7648438` |

### 收尾判定与恢复

- C1 旧Important全部闭合：FAIL（U3的逐阶段范围仍不确定）。
- C2 红队无存活BLOCKER/MAJOR：PASS，但不抵消C1。
- C3 同一终版与独立身份/原生成功证据：PASS，R1/R2证据分开。
- C4/C5：PASS。收尾逐文件SHA核对入口66项工作区快照，变化仅execution-plan、plan-review及新增redteam三份规划/评审文档；七份冻结实现逐字节不变、未删除文件。另有已披露的运行时待裁/eval审计留痕，不属于实现修改。未运行实现/实验/发布。
- 两轮上限已到，依routing-chain-check R4及计划自身停止线，不再自动修订或追加评审；用户裁决上述唯一delta后再续。G0保持关闭，U1–U4未开始。
- 精确恢复入口仍是本文件与execution-plan；无活跃评审。不复用旧FAIL作通过票，也不把本次对计划的确认当成实施/实验/发布批准。

## R3：用户授权的单次追加复核（v3.2）

授权来源：主线询问“是否同意仅补齐这个计划漏项，再做一次终版复核？”，用户回答“可以”。该回答不批准实施、实验或发布，也不授权继续循环。

- 唯一实质delta：U3明示 `.claude/skill-os/generated/context-index.md`，仅同批同步获批P4加载期限，与manifest一起验收；不扩大U1–U4总路径并集。另更新版本号及会审历史说明。
- 冻结计划SHA-256：`2ca0cd4d696ae86a72bdabb9e7fc29960b1df42b57fead7605d4390888d4ba0a`。
- 当前入口：HEAD仍为`05aa78adc431231455dabbfae94cccf362eb4339`；记录67项工作区文件哈希，保留全部既有WIP。
- 复核者仍为彼此隔离的`/root/v3_expert`与`/root/v3_redteam`，分别完整复核原3项/14项，不互读外部评审记录。主线负责范围、冻结哈希和原生回执核验。
- 恢复顺序：先收本次两票 → 核对同一SHA与本回合成功证据 → 只更新会审报告 → 交用户确认；任一FAIL直接停止，不再自行修订加轮。A1–A5及56会话均不得运行。

### R3终版结论：PASS（计划层）

两位评审均完整重读同一v3.2，SHA为上列 `2ca0cd4d…8d4ba0a`，此后未改计划正文：

- 专家 **PASS 3/3**：C4完整静态合同接线及回退（106–110）；U2/U3逐阶段范围与索引同批验收（168–169），依赖/断言/回退（167–206）；非PASS穷尽性能裁决（150–155）。原U3 Important已闭合，总文件并集未扩大。
- 独立红队 **PASS 14/14**：C1–C10、验证顺序、性能裁决、精确范围、独立性均通过计划充分性检查；无存活BLOCKER/MAJOR。完整指标可得性与30%实际收益仍为两项MINOR待证风险，必须留待获批后的实施验证。
- C1–C3会审判据全部PASS；C4七份冻结实现入口/收尾哈希一致；C5只完善计划、不实施/实验/发布的授权边界保持。阶段G0仍关闭，不能将本次“可以”解释为实施批准。

R3原生完成证据（同一隔离agent的续回合，不把R1 accepted当作R3成功）：

- 专家turn `01a0c29c-e33f-7e90-860d-fa6f7dffc2ca`：latest turn_context模型与原受信任peak请求一致，final_answer含完整v3.2 SHA与本轮envelope，task_complete=`2026-09-21T06:18:11.568Z`。
- 红队turn `01a0c29d-1f60-7b43-9ed1-45f3e8e1e4ba`：同样核验模型、终版SHA、envelope及同turn task_complete=`2026-09-21T06:18:40.062Z`。
- 来源为前节两份精确transcript；不伪造新的dispatch/accepted票。

原样envelope通过独立recorder写入同一权威eval store：

| eval_run_id | 结论 | recorder SHA-256 |
|---|---|---|
| context-lightening-v32-expert-20260921-01a0c286-r3 | PASS 3/3 | `e6e271fbca11fd2d23362a4f96e080ec11f4621309d59885a3651ac6afb328fe` |
| context-lightening-v32-redteam-20260921-01a0c286-r3 | PASS 14/14 | `b441bf4c999aee42ceffc8f7347fbe519b5f1a13422577983178fa435b7a0ca3` |

交付：计划v3.2及本会审记录、同主题redteam报告；只改三份规划/评审文档，另有两笔例行eval审计留痕。没有运行候选/实验、修改冻结实现或Git发布。下一步仅等待用户对该版本实施范围的明确确认；56会话仍保留单独实验授权门，发布另行授权。

工作区并发旁注：收尾快照另发现 `scripts/original-template-resources.mjs`、`scripts/test-original-copy-handoff.mjs` 相对本轮入口发生变化；本agent及两位评审未编辑这两文件，来源未归因，作为外部并发WIP原样保留、不纳入本次交付。不得据此声称整个工作区只有本任务三份变化；七份冻结实现仍独立校验无漂移。
