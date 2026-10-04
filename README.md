# luca_gstack — 产品中性的 AI 设计与工程 Skill OS

> 运行在 **Claude Code 与 Codex** 上的个人开发环境，覆盖需求、研究、设计、原型、工程交付与治理。
> 共享的 skill 契约连接自动路由、受控记忆、Agent 编排、模型角色调度和会话级项目隔离；
> 每个 skill 默认独立使用，工作流由你主动选择。

---

## Overview — 这是什么

luca_gstack 把设计与工程工作拆成一组可独立调用的 skill，再提供共享的输入、输出、验证与授权契约。
你可以直接描述目标，也可以按名调用 skill；系统先检查项目上下文与任务复杂度，再选择执行入口。
产品、品牌、业务词汇和实现约束来自已确认项目及其 `CONTEXT.md`。

五条设计公理（`.claude/skill-os/README.md` 为真值源）：

```text
Skill-first        每个 skill 默认能单独用，不依赖流程
Graph-optional     流程编排是可选项，只在你主动选择时启用
Memory-light       启动只加载摘要与短规则，长历史是冷存储、按需检索
Growth-gated       记忆/规则的成长走候选 → 评审 → 晋升门禁，绝不自动写长期上下文
Governance-callable 治理（评审/评估/复盘/自进化）随时可调，但只提议、不擅自改
```

**产品设计采用四类场景，跨项目适用：** 工程、文档和框架维护任务不强行套用场景。

| 场景 | 名称 | 说明 |
|------|------|------|
| **A** | 新功能设计 | 从 0 到原型 |
| **B** | 已有功能优化 | 评审驱动改版 |
| **C** | 线上评审改版 | 对现网页面做审计与重设计 |
| **D** | Agent 化改造 | 把"用户手动操作"改成"用户监督 AI 执行" |

当前入口与状态以 [Skill 目录](.claude/skill-os/generated/skill-catalog.md) 为准，
演进记录见 [CHANGELOG.md](CHANGELOG.md)。近期变化包括：

- **设计收敛**：Design Brief 统一承接全流程已选方案、已有需求/口述与已有原型精修，冻结前完成模板语义适配。
- **工程交付**：补齐 `wayfinder`、`grilling`、`to-spec`、`to-tickets`、`implement` 与 `code-review` 等入口，复用既有规格和任务计划。
- **动效与验收**：`motion-polish` 处理现有 HTML 的动效与微交互，交付绑定精确候选、独立验收报告和最终产物引用。
- **事实采集**：`fact-collector` 用轻量模型摘录有限来源中的显式事实，主模型核验后才采用；解释、综合与关键裁决保持各自分工。

新入口的内容适配、离线回归和原生活体验收分别记录；新增入口不代表所有运行时的采用与收益均已验证。

---

## 它和一般 AI Agent 框架有什么不同

大多数"AI workflow"要么是一条写死的流水线（你只能顺着走），要么是一个放养的 agent（你只能祈祷它别跑偏）。
luca_gstack 的取舍在两者之间，靠的是下面这几条刻意的选择：

- **不是强制流水线，而是 Skill-first / Graph-optional。** 每个 skill 单独就能用；流程图只在你说"按流程走"
  时才接管。流程 gate 不会拦截 standalone 调用，除非它同时是质量或安全 gate。
- **记忆会自成长，但受门禁治理。** 不是"聊过就记"，也不是"全靠人工维护"。稳定事实必须先落候选，经
  consolidate/review 的晋升门禁才进长期记忆——杜绝把一次性巧合固化成"规律"。这是它和"无记忆"或
  "盲目追加记忆"两类系统的根本分野。
- **机器提议，人类裁定。** 真伪判断、优先级、方向选择这类需要人拍板的节点，机器只做可回溯性检查、
  打分和分类，绝不代替人下结论。关键流程里的人类卡点是硬约束，不是可跳过的礼节。
- **环境与项目彻底分离。** 这个仓是"运行环境"，本身不存任何项目产出；项目产出与状态放在独立目录，
  会话级项目绑定决定实际读写目标，symlink 只用于兼容展示。框架维护保持 `NO_PIN`，经验层不随项目切换而丢失。
- **原生优先（native-first）。** 优先使用各宿主的 hooks、subagent 等原生能力；缺少原语时提供明确适配或降级。
  Codex 的共享 Workflow 脚本由 `.codex/workflow-runner.mjs` 执行，不声称具有 Claude 的原生 Workflow 工具。
- **不臆造是硬性质量门。** "没有数据支撑就不编"在所有 skill 里恒定生效——宁可标注"信息缺口"也不
  产出看起来合理的假事实。
- **框架自己会进化，但只提议。** 内置的自进化侦察会定期扫描外部生态、比对自身能力缺口、给出采纳建议，
  但零自动编辑——所有演进都以 digest 形式等人裁决。
- **模型按角色调度。** Codex 普通执行保持用户当前主模型，关键裁决使用已批准的高档模型，
  有界事实采集与低风险机械任务使用已批准的轻量模型；reasoning effort 保持独立。

Codex 模型的私有绑定、示例及缺失关系修复见 [模型路由配置说明](.codex/MODEL_ROUTING.md)。

---

## 系统架构

```text
Claude Code / Codex Runtime（各自的模型、hooks 与 subagent）
        ↓
luca_gstack Skill OS
   · standalone skills          每个 skill 自带输入契约与质量 gate
   · input / output contracts   skill 之间通过 docs/** artifacts + 稳定 ID 协作
   · skill-level quality gates
        ↓
Optional Workflow Graph（可选，主动启用）
   · recommended paths          4 场景推荐路径
   · handoff validation         节点间交接门禁 + 可追溯性覆盖
   · state recovery             跨 session 断点恢复
   · downstream suggestions
        ↓
经验与治理层（跨项目，常驻）
   · Observability   记录反馈 → 蒸馏可立即生效的短规则
   · Memory          三层记忆 + 自成长闭环
   · Evolution       框架自进化侦察（propose-only）
   · Evals / Redteam / Retro   评估、对抗审计、复盘
```

配套还有一层**会话生命周期编织**（hooks）贯穿始终：进场恢复状态、每条消息自动路由、
编辑后校验、收尾沉淀记忆。

---

## 核心能力

### 1. 分层智能路由（route-guard）

`route-guard` 提供触发词打分与路由提示，主 Agent 根据语义和权威目录判定实际入口。
路由按以下顺序检查，复杂度门先于 skill 命中：

| 层级 | 触发 | 行为 |
|------|------|------|
| **项目上下文门禁** | "老项目/已有项目/继续项目" | 先确认或切换项目，不得直接进入某个 skill |
| **Plan Agent 层** | 满足五个复杂度条件之一 | 先出结构化计划；Supervisor / Hierarchical 按合同等待真实批准 |
| **Framework Flow 层** | 框架演进、对标或治理 | 在 `NO_PIN` 范围选择对应维护流程 |
| **Multi-Skill 层** | 多个独立且高置信的 skill 匹配 | 按实际依赖组合，不默认启用工作流 |
| **Single-Skill 层** | 单一高置信命中且不触发 Plan Agent | 直接调用对应 skill |
| **STOP / NONE 兜底** | 意图有歧义，或没有匹配入口 | 歧义等你选择；无匹配先查目录，再作语义判断 |

关键词真值源是 `.claude/skill-os/skill-routing-map.yaml`。route-guard 还顺带追踪对话轮数，
到点自动提醒你写 Checkpoint 或 compact。

**Plan Agent 五个条件**（满足任一即先规划）：涉及 ≥3 文件改动 / 需 ≥2 独立 subagent
协作 / 有明确阶段依赖 / 涉及不可逆操作 / 你明确要求"先做个计划"。
内部 HITL 编排的计数例外和批准边界见 [Plan Agent 合同](.claude/agents/plan-agent.md)；规划本身不授予执行权。

### 2. 三层记忆 + 自成长

| 层 | 存什么 | 何时写 |
|----|--------|--------|
| **Episodic** | 单次 session 的经历与决策 | 命中提取门槛并完成裁决后记录 |
| **Semantic** | 跨 session 的稳定事实 | 候选通过评审后晋升 |
| **Procedural** | skill 规则（已并入 Semantic `domain:skill-rule`）| 同上 |

记忆不是"想记就记"，而是三环自动闭环：

```text
捕获（Stop 默认留下 pending-extraction，按门槛裁决后才落库）
   ↓
治理 + 晋升（每日首 session 后台跑：只晋升门禁内候选、降频写 digest、Loop 健康自检）
   ↓
回看（下次启动提示最新 digest）
```

两道纪律确保记忆不膨胀：**提取门槛**（`extraction-bar.md` 四强信号——明确纠正/二次复发/真实返工/
高重获成本，全不中就什么都不存）和**归属三分**（这条经验是关于"人怎么工作"、"框架规则"、还是
"某个具体项目"？分别落不同位置，避免跨项目上下文污染）。启动只用 `get_memory.py --summary`
加载摘要，具体任务用 `search_memory.py` 做相关检索——长历史永远是冷存储。
pending 与裁决 marker 只表示工作窗口的处理状态，不证明记忆已落库。
旧强制提取模式需显式设置 `SESSION_SYNC_FORCE_ON_STOP=1`；Claude 可 block，Codex 对该控制动词降级为提示。

### 3. Observability — 从反馈蒸馏短规则

`observations.jsonl` 记录原始用户反馈（冷存储）；`get_rules.py <skill> [scene]` 把其中明确、可复用的
反馈蒸馏成**短规则**，只在跑对应 skill 时按需加载。它和记忆自成长互补：Observability 的明确规则可立即
生效，记忆候选则必须经评审才晋升——两条速度不同的成长通道。

### 4. Agent 编排体系

主 session 不是一个人在战斗，而是一套分工明确的 agent 角色：

| Agent | 定位 | 关键约束 |
|-------|------|----------|
| **Orchestrator** | 主 session 的执行行为模式（双模式：自由任务 / skill 流程）| 不是 subagent dispatcher；skill 内部自管 subagent |
| **Plan Agent** | 规划器 | 输出阶段计划 + 编排模式 + 断言，供 Orchestrator 执行 |
| **Preflight Agent** | 前置校验 | skill 启动前验证前置条件，返回 PASS/FAIL |
| **Quality Gate** | 测试层 | 独立 context 跑断言、审查产出质量，不污染主 session |
| **Work Agent** | 单阶段执行器 | 只做一件有界的事，返回结构化完成报告，不规划、不再派 subagent |
| **Fact Collector** | 有界原文采集 | 只读授权快照；出处校验后仍需主模型逐题核验，不承担综合或裁决 |

编排模式借鉴 Anthropic *Building Effective Agents*：能画出决策树的任务就用确定性编排，不交给 agent
自由探索。按职责控制上下文：探索者接收查询问题，执行者接收任务与文件所有权，
审查者接收冻结改动、需求与断言。具体预算由编排合同约束。

事实采集结果先由 `scripts/verify-fact-candidates.mjs` 校验出处与逐字内容，再由主模型逐题记录
接受、接手或未解决。模型采用回执与内容验收分开，校验器退出成功也不等于事实已获认可。

### 5. Context 工程协议

Context 窗口被当作有限资源主动管理，防止溢出丢状态：

- **Checkpoint**：启动 ≥2 个重型 Agent、完成一个 Phase、或不可逆操作前，写五要素交接
  （已完成 / 进行中 / 待执行 / 关键决策 / 恢复指令）。
- **PROGRESS.md**：≥3 Phase 的长任务开场初始化，每 Phase 更新，启动时自动显示。
- **条件加载**：从各宿主独立的根契约进入，按 context index 加载匹配的一跳 owner；
  已选中的治理文件必须在规定边界前读到末尾，长历史按需检索。
- **Compact 触发**：完成 Phase 且后面还有 ≥2 Phase、或超 30 轮对话，在下个 Phase 前 compact（compact 前必先写 Checkpoint）。
- **断点恢复**：先核对仓库 SHA 与工作树，再读 checkpoint 并重跑当前阶段的最小验证，从未完成项继续。
  `NO_PIN` 框架任务的 checkpoint 放在 `framework-audit/` 或系统临时目录。

### 6. 模型角色路由

真值源是 [.claude/skill-os/model-routing.yaml](.claude/skill-os/model-routing.yaml) 的顶层
`model_routing`。当前公共角色政策在 **Codex native subagent 与 workflow runner** 接线；Claude 的新 adapter 延后。

| 角色 | 用途 | 选择依据 |
|------|------|----------|
| **anchor** | 普通对话、实现、解释与综合 | 根会话实际生效的用户模型 |
| **peak** | 独立语义评审、对抗与关键裁决 | 用户批准的较高模型；anchor 已达该档则保留 |
| **light** | 低风险机械任务、有界显式事实采集 | 用户批准且明确低于 anchor 的模型 |

账户模型名与顺序保存在权限为 `0600` 的私有 binding，不写入公共政策。
`fact-collector` 对应 MR-009/light，一般探索 MR-006 保持 anchor；选模不调整用户的 reasoning effort。
关键调用要求同一次调用的可信采用与完成证据，未知模型关系或关键失败会拒绝继续，不自动降档。
Claude 现有 tier/alias 作为兼容合同保留，不能用来推导 Codex 行为。

### 7. 环境 / 项目隔离

这个仓保存运行时、skills、参考资产、记忆和框架评审证据；项目产出放在独立项目目录。

- `docs/`、`.claude/workflow-state.yaml`、`.claude/current-topic.txt` 的 **symlink 是展示兼容层**，不决定会话项目。
- 会话级项目绑定（`project-scope-guard`）：根 pin 或已验证的 Codex 子关联决定目标，
  把本 session 对 docs/state 的访问重定向到项目绝对路径；未绑定 session 不能访问共享项目别名。
- 明确绝对路径的跨项目读取遵循宿主文件系统与受控变更权限，不会自动切换项目；共享别名仍需已验证绑定。
- **明确选择才切换**：具名且唯一的已有项目无需重复确认；明确新建请求可创建，推断的新项目意图需确认。
  主会话只调用一次 `project.sh switch/new <canonical-name>`，由 PreToolUse 注入原生事务数据并核验收据。
- Codex 子 Agent 通过可信原生父子调用关联冻结的项目范围；父会话后来切换项目不会改写既有子 Agent 的目标。
- `memory/**` 与 `.claude/observability/**` 是跨项目经验层，**不随项目切换**——经验不因换项目而丢。

选择、子关联与跨项目读取的详细边界见 [项目会话合同](.claude/skill-os/runtime/project-session.md)。

### 8. Session 生命周期 hooks

共享 hooks 覆盖六个主要生命周期事件，Claude 与 Codex 通过各自入口接入：

| 时机 | hook | 做什么 |
|------|------|--------|
| **SessionStart** | session-restore | 加载记忆摘要；仅从已验证绑定读取流程与 PROGRESS，不读取或清理共享展示链接 |
| **UserPromptSubmit** | route-guard | 路由提示、项目上下文门禁与轮数追踪；不自行选择项目或签发选择事务 |
| **PreToolUse** | project-scope-guard | 执行前检查会话作用域，重定向绑定项目路径，并守护选择事务与受控变更 |
| **PostToolUse** | post-edit | 累计活动信号（edit/tool 计数，供 Stop 判"实质工作"）+ framework/ 只读警告 |
| **Stop** | session-sync | 默认保留待裁决 pending，按需写 checkpoint；真正关闭回合时撤销事件与 turn grant |
| **SessionEnd** | session-end | 会话真正结束时清理本 session 的计数和全部 read grants（僵尸窗口归零） |

Codex 另用原生 `SubagentStart` / `SubagentStop` 关联子 Agent 身份、项目范围与模型采用证据。
注册文件分别为 `.claude/settings.json` 和 `.codex/hooks.json`；注册、授信、启用状态与真实会话执行需分别核验。

交接正文提到 `docs/` 或共享状态路径时，优先用文件工具的明确目标路径写入。
项目守卫也识别带引号 heredoc 中的单次静态 Python 文本写入：
`from pathlib import Path` 后接 `Path('字面目标').write_text('字面正文')`，可指定 `encoding='utf-8'`。
正文保持原字节，只有真实目标参与拒绝或 pin 重定向；真实共享状态、会话控制文件与只读母版仍受保护。
目标按完整字面路径检查，包括含空格的软链目录；模板检查同时核对归一化与真实目标，路径穿越不放行。
动态目标、f-string、附加语句、无引号 heredoc 和其他解释器代码继续按保守路径检查。

Codex Hook 更新后，先运行只读体检 `node scripts/codex-hook-health.mjs`。
体检独立固定已审注册协议：事件、matcher、完整加载/恢复命令、超时和上下文限制；
主动改变注册协议时，须同审并更新体检中的协议指纹。
默认 `native-trust-v1` 的 11 条命令由 Codex 原生 Hook 授信执行当前 Git 工作区代码，
不再要求每个 worktree 单独安装源码审批，也不再因正常脚本修改或新增测试导致整个会话被拦截。
原生授信绑定完整命令文本，**不冻结源码文件字节**。命令清除继承的旧 source-guard 环境，
用独立的 `LUCA_NATIVE_HOOK_STRICT=1` 保留项目隔离、受控变更和 Host Launch 的异常拒绝。
Stop 失败时保留原始输入供恢复处理；无法恢复则安全停止，不伪造事件关闭。
`--source-only` 仅检查仓内注册，不代表官方授信、开启状态或端到端通过。
`node scripts/codex-trust-hooks.mjs --host-launch --dry-run` 再检查官方进程中的精确授信状态；
授信脚本在读取官方状态后、写入前和完成前重查注册健康，失配时拒绝授信。
它保留用户的关闭设置。Luca App 要求三个 Host Launch 条目同时精确匹配、已授信且
`enabled === true`；已授信但已关闭的钩子不会再被误报为就绪。

从旧注册升级时，正常重载受影响会话并授信新的完整命令。新进程可用不代表旧会话已刷新。
如果启动钩子曾失败而缺少模型激活记录，模型路由仅能从同一会话、工作区和当前回合的真实
Codex transcript 恢复身份；不会采用工具输入自报的模型，也不会清除未完成审查或 critical failure。
这项自动恢复覆盖默认原生 home 的子 Agent 路径；非默认 provider 的缺失/暂停激活仍需正常
SessionStart，workflow-runner 的已有激活检查保持原合同。App 的受保护 source grant 可用于
核验已激活会话的 Stop 模型证据，但不会扩大 provider 的子会话项目关联权限。

旧 `legacy-literal` / `stable-v3` 源码防护仍可选择使用，以下安装约束只适用于这些旧注册。
体检核对其 bootstrap/loader、JavaScript 清单、Python/规则和 Stop 恢复快照，
并要求 Node 支持 `node:module.registerHooks`。默认 native-trust 注册不受这些安装检查约束。

遇到 `hook source integrity mismatch`，先区分**当前磁盘失配**与**旧会话命令缓存**。
重启不会修复错误的摘要或安装清单。修改 `.codex`、`.claude/hooks`、`scripts`、
`memory/scripts` 下脚本（包括测试）都会改变摘要，因此在隔离副本完成修改、测试和审查后，
再按精确的文件基线、最终摘要和回退副本安排一次受审启用。
启用前先协调所有共享此物理根的在途会话和子审查：保存检查点，等它们完成或明确暂停，
维护期间不启动新的审查。只检查 Git HEAD 不够，工作树、注册和安装版本也必须冻结；
旧会话即使已开始审查，也会在后续调用遇到新的源码摘要而阻断。
体检不探测会话是否空闲；安装事务的锁只串行化合作安装器，不能把体检通过当成可以随时热更新的许可。
先用 `node scripts/install-codex-source-guard.mjs --print-review --root <候选根>` 冻结完整受审 artifact
及其原字节 SHA；单 root 的候选→正式根审查可加 `--as-root <canonical正式根>`，内容映射必须一致。
启用调用 `node scripts/install-codex-source-guard.mjs --root <已审根> --preserve-other-roots --reviewed-file <artifact文件> --reviewed-sha <原字节SHA256> --expected-manifest-sha <当前manifest原字节SHA256>`。
初装改用 `--expected-manifest-sha ABSENT`；缺少审阅文件或精确 CAS 会拒绝，生产不会现场捕获后自动批准。
事务校验完整源、JS、配置和复制快照，持有私有独占锁直到 manifest 最后原子发布、fsync 和读回。
`--dry-run` 不写保护安装；发布后异常回执明确是否已经提交，再次安装需要新的精确 CAS。
真实进程中断遗留的锁只可用 `--recover-lock-sha <精确锁原字节SHA256> --expected-manifest-sha <当前SHA256或ABSENT>`
回收；仅 ESRCH 死进程和完整私有锁可通过，不按时间夺锁。回退同样恢复受审源并使用当前 CAS 安装。
稳定注册的源码更新保留原命令与 trust hash；首次 legacy→stable 迁移需要重载和 11 条精确 Hook 授信。
这些是旧源码防护模式下的维护动作；体检不会自动执行它们。
若当前会话已经被旧命令阻断，应从人工维护终端执行已审启用步骤，不在被拒会话内换入口绕行。
全部检查通过后重新加载受影响会话，并用一次真实工具调用/审查验证；新进程的检查不能证明旧会话已刷新。
审查中途若被门禁打断，保留原票的 UNKNOWN/未完成状态和实际回执；稳定运行时及工作树后，
对最终冻结稿重新审查。恢复可调用工具不会使旧票自动变成 PASS。

### 9. 框架自进化（propose-only）

框架不靠人记着去优化，而是内置一套自进化侦察（`.claude/skill-os/evolution/`）：

- **月度侦察**：从 `sources-registry.yaml` 生成发现通道，按 `gaps-register.yaml` 做 fit-to-gap 门禁，
  用 `gh` 做证据核验 + 供应链 + 红队，产出演进 digest。
- **外部 skill 侦察**：在 GitHub 上找有用的 skill/subagent，过 7 维门禁、逐个证据核验、给排序推荐。
- **采纳台账**：`adoption-log.jsonl` / `ADOPTED.md` 记录采纳审计；`CHANGELOG.md` 记面向使用者的演进叙事。
- **红线**：所有侦察**只提议、零自动编辑框架**——采纳与否人裁；采纳后必须走完编排层集成（触达 + 登记 +
  场景 + 验收）才算落地，"装完就完"不算数。

### 10. 质量纪律与不可协商项

- **Loop 宪法（四原则）**：① inner loop 不重造（gather→act→verify 是原生资产）；② outer loop 默认薄，
  只用四原语（停止条件 / spec 信号 / 人类卡点 / 记忆写回）；③ 复杂度双向自证（新增须可测地改善结果，
  既有结构定期用数据复核，不划算就砍）；④ 优先接 harness 原生原语。
- **Coding Discipline（Karpathy-inspired）**：Think Before Coding（不替用户静默选高影响解释）、
  Simplicity First（只实现所需的最小方案）、Surgical Changes（只改相关行，不顺手重构）、
  Goal-Driven Execution（每个改动可追溯到请求或验证标准）。
- **完成前验证铁律**：声明"做完了"之前，必须有当场跑出的证据（测试 / 脚本 / 读回文件 / 可观察检查）。
- **保护区**：`framework/` 参考资产只读、`docs/evaluation/` 受保护、`skill-invariants.md` P1-P7 保护区、
  记忆红线（稳定事实不得直接写长期上下文）。
- **单真值源、多检出协作**：`main` 是框架真值分支，检出与 worktree 共享版本化契约；开工核对工作树和上游状态，
  保护其他会话改动。发布依照实际批准范围和仓库验证门执行，不把同步脚本或计划当作发布授权。

---

## 端到端流程

### 设计链与工程链

```text
设计链     idea → deepresearch → brainstorm → ux-research → ux-brainstorm
                → design-brief → open-design

已有需求   需求/口述 ───────────────→ design-brief → open-design
原型精修   已有原型 + 修改/保持范围 → design-brief → open-design

动效交付   选定的现有 HTML → motion-polish → 独立候选验收 → 精确最终引用

一手研究环  brainstorm（假设）→ research-kit（采集工具）→ [你亲自采集]
                → insight-synthesis（洞察）→ 回到设计链

内容维度   ux-writing（语义规范产在 design-brief 之前、被其继承进 Packet；
                逐字文案只喂 html-prototype 本地路径——OD 的生成自由度不被锁）

工程链     brainstorm → design-brief → tech-spec → task-plan → implement → code-review
工程补充   已解决的工程讨论 → to-spec；获批任务计划 → to-tickets（显式发布入口）
现有代码   code-recon → tech-spec → task-plan
```

**发散 vs 收敛的分工**：`ux-brainstorm` 是发散引擎（出 2-3 方案 + Oracle 对抗 + 交互架构 + AI-Native 判定）；
`design-brief` 是收敛节点，继承已确认事实，完成页面/交互位置映射、状态与保持范围覆盖、模板语义适配及 Generation Packet。
已有需求或原型精修无需伪造 PRD 或重跑发散。`design_source` 的设计生成追踪与 `prd_end_to_end`
的工程追踪分别验证，设计生成 PASS 不等于工程已就绪。

`open-design` 是推荐的设计产出路径；本地 HTML 与 MagicPath 仅在你明确选择，或已批准的具名备用计划
满足触发条件时使用。OD 故障本身不授权换工具；已退役的 `figma-layer` 不再参与设计链。
设计系统来自当前项目或外部工具配置，`framework/` 只作为可选只读参考。

动效验收绑定候选与报告的路径、SHA 和全部必需行为；下游消费明确的 `final_artifact_ref` 时重新核验。
缺失或漂移的最终引用返回对应 owner 处理，不自动使用原始 HTML 代替。
完整协议见 [原型交付合同](.claude/skill-os/runtime/prototype-delivery.md)。

### 4 场景推荐路径（可选，主动启用）

真值源 `.claude/skill-os/optional-workflow-graph.yaml`。每个场景都有从轻到重的多条推荐路径，
外加"研究默认门"：**任务同时复杂且新颖时，研究阶段是默认步骤而非可选**，跳过必须显式声明理由并经你确认。

工程交付另有可选 `engineering-delivery` preset，只提供推荐边和进入条件。
它不授予执行权；`implement` 仍将通过门禁的精确 task-plan、SHA、U-ID、基线与效果范围交给 Plan Agent 编译并等你批准。
执行时按依赖 frontier 逐个派发已批准单元；任务图和 Wave 不代表并发许可。

### Handoff gate 与可追溯性

流程模式下，节点之间有交接门禁，核心是**可追溯性覆盖**——例如 `tech-spec → task-plan` 会检查每条 MUST
需求是否都有开发任务、每个设计决策是否都有覆盖，coverage gate 不 PASS 就不许启动下游。
standalone 不强制启动整条流程，但仍遵守 skill 自身的输入、来源、质量与安全合同；工程消费者所需的
上游 PASS 和覆盖范围不能用 standalone 绕过。始终强制的质量 gate 包括不臆造、真实人类决策、
已确认项目/外部设计系统约束，以及 Agent 执行的可见、暂停、接管和撤销能力。

### 记忆生命周期

```text
做事 → 命中提取门槛（四强信号）→ 裁决归属（人 / 框架 / 项目）
     → 落候选 → 每日治理评审 → 晋升长期记忆 → 下次启动回看
```

---

## Skill 索引

以下为当前一级可见入口。**Claude Code 用 `/名称`，Codex 用 `$名称` 或 skill selector**；
两者读取同一份 `.claude/skills/office/` 契约，Codex 的 `.agents/skills/` 提供发现别名。

### 入口与编排

| Skill | 用途 |
|-------|------|
| `office` | 展示可见 skill、输入模式与推荐工作流 |
| `auto` | 将目标映射为多 skill 执行方案并聚合产出，保留确认与质量门 |

### 需求、研究与设计

| Skill | 用途 |
|-------|------|
| `idea` | 忠实结构化已有会议纪要、语音稿等原始语料 |
| `brainstorm` | 通过逼问形成范围适当、可追溯的 PRD |
| `deepresearch` | 多来源、多 Agent 深度研究 |
| `quick-research` | 单 Agent 后台查一手资料，产出带来源的研究文档 |
| `insight-synthesis` | 综合用户提供的一手定性资料，区分观察与解释 |
| `research-kit` | 设计访谈、问卷、测试计划等采集工具；实际采集由人完成 |
| `muse-req-triage` | 对候选需求打分与独立分类，最终真伪及优先级由人裁定 |
| `ux-research` | 多维 UX 研究与共识验证 |
| `ux-brainstorm` | 发散设计方案，形成交互架构与对抗判定 |
| `design-brief` | 三类入口统一收敛，冻结可追溯的设计 Packet |
| `ux-writing` | 内容语义、voice/tone、微文案与文案评审 |
| `open-design` | 冻结 Packet 与模板绑定后交接到指定 OD 项目，执行获批的生成与回收 |
| `html-prototype` | 用户明确选择的本地 HTML 原型与可观测 QA |
| `motion-polish` | 检查或改善现有 HTML 的动效、微交互及交付质量 |
| `ux-audit` | 按选定模块评审页面 UX |

### 工程、诊断与质量

| Skill | 用途 |
|-------|------|
| `code-recon` | 将现有代码库逆向为可供设计与工程消费的架构 brief |
| `domain-modeling` | 澄清术语、对象归属与关系边界 |
| `codebase-design` | 评估模块深度、接口和测试 seam |
| `wayfinder` | 为规模大、跨 session 且路径模糊的任务提供规划入口 |
| `grilling` | 按设计决策树追问尚未解决的关键选择 |
| `to-spec` | 将已解决的工程讨论交给 canonical tech-spec 合同整理 |
| `tech-spec` | 形成技术合同，验证 MUST 需求与设计覆盖 |
| `task-plan` | 形成断言矩阵、开发/测试卡与依赖关系 |
| `to-tickets` | 对精确门禁通过的任务计划预览并获批发布票据，仅显式调用 |
| `implement` | 编译精确规格与任务计划，获批后按依赖执行并验证 |
| `diagnosing-bugs` | 从失败证据与因果模型定位根因 |
| `resolving-merge-conflicts` | 处理真实进行中的 Git 冲突，恢复双方意图并验证 |
| `code-review` | 固定范围与需求，复用 code-hygiene Mode D 输出分轴 findings |
| `code-hygiene` | 代码清理与完成前验证 |

### 写作、人工配置与会话工具

| Skill | 用途 |
|-------|------|
| `writing-for-agents` | 编写与评审 skill、AGENTS.md 等 Agent 指令 |
| `writing-workshop` | 显式选择的写作工作坊：fragments、shape、beats |
| `loop-me` | 从实际工作设计重复流程，澄清后保存规格 |
| `issue-triage` | 显式维护者入口，基于 Issue/PR 与代码形成诊断 brief |
| `setup-wizard` | 为人工服务配置或迁移交付分阶段 Bash 向导，供人运行 |
| `wait-what` | 显式要求补足上下文并用自然中文重讲上一条说明 |
| `handoff` | 显式要求时生成跨 session 交接文档 |

触发规则见 [路由表](.claude/skill-os/skill-routing-map.yaml)；各宿主根契约分别为
[CLAUDE.md](CLAUDE.md) 与 [AGENTS.md](AGENTS.md)。
隐藏入口包括 `careful`、`challenge`、`compare`、`evals`、`figma-demo`、`magicpath`、`muse-x-digest`、
`redteam`、`retro`，按各自合同按需使用；`references` 只供内部读取。
`figma-layer`、`muse-loop-orchestrate` 和 `muse-proto-gen` 已退役，不可调用。

---

## Quick Start

### 先决条件

- Claude Code 或 Codex 已安装并可访问此工作区
- macOS / Linux
- Git、Node.js ≥ 20、npm 与 Python 3；完整检查还需 PyYAML 等环境依赖

### 安装

```bash
git clone https://github.com/wangmoumou1216-ai/luca_gstack.git luca_gstack
cd luca_gstack
npm ci
git config core.hooksPath .githooks
```

这是个人环境仓库；迁移到其他机器时，先核对 `.codex/config.toml` 中的绝对路径、项目目录与记忆 store。
安装依赖不等于 hooks 已授信或账户模型绑定已就绪，分别按当前宿主检查。

### 使用

在此工作区打开对应宿主：

- **Claude Code**：输入 `/office` 查看入口，或直接调用 `/design-brief` 等 skill。
- **Codex**：输入 `$office` 或使用 skill selector；直接调用使用 `$design-brief` 等名称。
- **自然语言**：描述目标；已有项目先过 Project Gate，复杂任务先规划，框架维护保持 `NO_PIN`。

共享 Workflow 脚本在 `.claude/workflows/`；Codex 通过 `.codex/workflow-runner.mjs` 适配执行。

### 健康检查

```bash
bash scripts/verify.sh                         # NO_PIN 框架完整检查
node scripts/codex-hook-health.mjs --source-only # 只查仓内 Codex 注册
```

`--source-only` 不证明官方授信、启用或端到端通过；完整 hook 体检与旧注册维护步骤见上方生命周期说明。
`scripts/sync.sh` 含 Git 同步效果，按实际授权使用，不能作为只读健康检查。

---

## 目录结构

```text
luca_gstack/                  ← 运行环境（不存项目产出）
  CLAUDE.md                   ← Claude Code 配置、路由契约、记忆/context 协议
  AGENTS.md                   ← Codex 独立根契约
  CONTEXT.md                  ← 框架跨 session 约束（含红线）
  framework/                  ← 可选只读参考资产，不强制采用其视觉规范
  framework-audit/            ← 框架维护、评审与验证证据
  .agents/skills/             ← Codex skill 发现别名
  .codex/
    config.toml               ← 仓库级 Codex 配置
    hooks.json                ← Codex 原生 hooks 注册
    agents/                   ← Codex Agent 定义
    workflow-runner.mjs       ← 共享 Workflow 脚本的 Codex 执行后端
    MODEL_ROUTING.md          ← 私有模型绑定配置说明
  memory/                     ← 三层记忆系统 + 治理脚本
    episodic/ semantic/ digests/ scripts/
  scripts/                    ← 验证、同步、项目切换等维护脚本
  .claude/
    skills/office/            ← Skill 定义文件
    commands/                 ← 斜杠命令入口
    skill-os/                 ← 路由 / 可选图 / 输入模式 / 模型角色 / 自进化 / 一跳契约
      generated/              ← context index、skill catalog 与单 skill 输入视图
    observability/            ← skill 观察记录与短规则
    agents/                   ← Orchestrator / Plan / Preflight / Quality-gate / Work agent 定义
    hooks/                    ← Session 生命周期钩子（restore / route-guard / post-edit / sync 等）
    workflow-state.yaml       ← symlink → 当前项目 .luca/workflow-state.yaml
  docs/                       ← 共享展示 symlink → 项目 docs（不是会话绑定真值）
    handoff/                  ← 当前项目 Skill 交接摘要
```

项目产出与状态放在独立项目目录，当前个人配置使用 `~/Desktop/项目/<项目名>/`。
根会话 pin 或已验证的 Codex 子关联决定访问目标；共享别名不能用来推导、修复或切换绑定。
明确切换/新建使用公共单调用事务 `./scripts/project.sh switch/new <canonical-name>`，
PreToolUse 注入身份、事务与 epoch，route-guard 只记录中立证据。选择不启动 workflow、不恢复项目历史、
不改共享展示链接；下一步工作仍按路由、输入和授权合同执行。

---

## Contributing

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

## Security

详见 [SECURITY.md](./SECURITY.md)

## License

MIT © 2025-2026 luca
