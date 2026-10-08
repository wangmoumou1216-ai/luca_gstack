# Agent 编排体系评审执行计划 v3
Date: 2026-10-07
Plan ID: AOR-20261007
Scope: NO_PIN；只读审计六个 Agent 合同，交付问题、证据和落地方案，不实施修复。
Source: 原会话 01a11575-70e6-77a1-85b4-4a38b368b743；用户明确要求六角色深评、方案本身会审与红队；允许本次 Sol，当前 session 为编排者。续接用户明确要求完成此目标。
Repo: /Users/luca/.codex/worktrees/a65e/luca_gstack
Baseline: 5956da6be6997326e2cb0eb14e65bc8099e8c7fe（源会话 a6e9 同 SHA；当前工作树开始干净）

## 前提与范围
审计是否有必要须由证据决定，允许零 confirmed finding；不预设重构或增加规则。
最小完整交付是评审与修复设计，不是直接修改运行合同。更薄的主会话自评不满足用户要求的独立会审。
本案不是 implement compile，不伪造 native approval receipt；已有真实用户审查授权继续有效，不新增工程写入或 Git/external effect。
按 R4 自建跨合同评审编排：目录中 code-review 是代码 findings facade、redteam 只质疑决策，均不完整覆盖此任务。无需调用整条研究 workflow。
Plan owner 用作执行纪律，明确不将其内容/问题纳入评审结论。

目标正文仅：
- .claude/agents/orchestrator.md
- .claude/agents/work-agent-template.md
- .claude/agents/preflight-agent.md
- .claude/agents/quality-gate.md
- .claude/agents/fact-collector.md
- .claude/agents/muse-proto-judge.md

直接依赖的 adapter、脚本、测试、one-hop 合同仅作为解释/证伪上述正文的证据；发现范围外缺陷单列，不计正文问题。
禁止修改上述六文件、Plan Agent、framework/、项目 aliases/state、memory。唯一持久写入范围为本次 framework-audit 报告、计划和证据；测试仅使用 OS 临时目录。
不发送其他用户聊天消息，不再新建侧栏聊天。通过当前会话原生 subagent 派发，冷启动 fork_turns=none。
本次模型为用户允许的 Sol 例外；不声称获得 peak 或跨模型一致性。专业视角是任务分工，不代表真人认证或统计独立采样。

## Phase / 稳定单元
模式：Sequential 外层 + 独立评审；默认一个活跃子 Agent；每个角色都在当前 session 内派发。
U-01: 计划审查。五个冷启动专家（架构、安全可靠性、评估科学、人机协作、框架治理）及独立红队审本文件。保留原票；合议修订；修订版回审，最多两轮。门：计划范围/证据/执行能力无未处置 MAJOR；轮次耗尽仍有阻断则交付未闭合项、owner及下一动作，不无限追加门禁。
U-02: 正文与接口评审。冻结六正文 path/hash/line；每位专家按本视角审全部六角色及八接口，直接读源；主控负责对照与证据收集。门：六角色×十二维度和八接口均有结论或显式证据缺口。
U-03: 真问题筛选。候选卡含不变量、精确位置、最小触发、已有防护、反例、证据层级、影响、分类。五专家独立判断；严重度取决于不变量和影响，两独立视角是复核义务而非事实否决权。已有直接反例的潜在 MAJOR 未完成复核时保留严重度并阻断相关握手，直到明确反证、确认或真人裁决，不因票数降级。红队可攻击所有候选（包括少数报告）。门：每项 confirmed 至少当前原文合同矛盾或真实可复现证据；测试证据和合同推演分别标明。
U-04: 最小方案。每个 confirmed 项给修改 owner/位置、新旧行为、权责边界、兼容迁移、正负失败/接口验证、残余风险。独立专家与红队审方案及误阻断。最多两轮修订闭合；新证据可使问题降级/撤回。不得把设计方案写成已修复。
U-05: 终版。汇总两层状态、12维矩阵、8接口、原始票据与反证/测试/哈希；核六正文未变；终版独立审核；交付报告。

上述任务 Source 均为原始需求和续接授权。没有产品 spec/task-plan 输入要求。

## 覆盖矩阵与接口
十二维度：职责专业性、合同严谨性、科学性、独立性、权限安全、证据链、失败语义、完成判定、重试恢复、模型适配、框架适配、可测试性。
八接口：Orchestrator→WA、Orchestrator→Preflight、Orchestrator→QG、Parent→Fact Collector、AC source→Proto Judge、QG→Orchestrator、WA→QG、Claude↔Codex。
每格以 ADEQUATE / FINDING / UNVERIFIED / N/A + evidence 判断，不做无校准总分、模型排名或百分比质量保证。

## 证据与票据
候选分类 CONFIRMED_BUG / CONFIRMED_DESIGN_GAP / RISK_ONLY / DUPLICATE_COVERED / REFUTED。
行为 bug 要当前真实命令+输入+输出+退出码；合同矛盾可由两处互斥规则和明确场景证明 design gap，不伪称模型行为复现。
测试仅作适用分区：静态合同、脚本行为、负向/故障、隔离 mutation、原生 live。涉及 Plan Agent 的测试只作背景，不计六角色通过。
不能把 prompt-only 禁令当 sandbox、原生 fork 当操作系统隔离、仓内 fixture 当 Claude/Codex 全链实测。
宣称测试可捕获具体故障时对对应临时副本作 mutation；未真跑 mutation 必须标未验证。
每票包含 reviewer/native id、对象 revision/hash、lens、verdict(AGREE/DISAGREE/NEEDS_EVIDENCE)、severity、evidence、counterexample、required correction、coverage/exception。
只向 reviewer 提供冻结范围、原文与证据，不传作者推理、会话历史或其他 reviewer 结论。
审查候选/方案时提供被审主张属于必要输入；票据仅适用本次对象。相关实质变动须终版回验，不要求无关排版变化让所有已核源证据作废。
原始票不得主控改写；另表记录采纳/反证/待证据。缺票不算完成轮。
默认 REFUTE；失败/UNKNOWN/超时不当 PASS；三次相同基础设施失败不盲试。

## 两层完成状态（纠正旧计划自相矛盾）
REVIEW_DELIVERY: DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT。
本次 DONE 表示评审和方案交付完成，不表示生产体系无缺陷或已经修复。
PLAN_HANDSHAKE、SOLUTION_DESIGN_HANDSHAKE：PASS / CONDITIONAL / BLOCKED；只表示计划/方案在明确证据边界通过独立审查。
IMPLEMENTATION_ACCEPTANCE: NOT_EXECUTED（本轮不修改生产正文）。
SYSTEM_READINESS: 若确认的 MAJOR 未实施验证，或有直接反例的潜在 MAJOR 尚未复核/裁决，保持 BLOCKED，绝不被报告 DONE 覆盖。
方案通过：原始反例有闭合设计，未出现未解安全/正确性/证据缺陷；尚未实施/双端 live 的条目列为落地验收义务，不能宣称已通过。
范围内关键材料缺失或独立审查失败：交付降级或阻断，明确 owner/下一动作，不虚造握手。

## 最小验证
- 重跑 check-agent-contracts、check-model-table、check-routing-map，保留完整退出码；测试统计只作基线。
- 运行与实际候选有关的现有脚本测试/临时负向；不为凑数量启动无关 suite。
- 最后比较六正文 SHA256 与冻结清单、git diff scope。
- [C1] 每个 confirmed 结论有对象身份、原文或行为反例，且不存在未处理的直接反证。
- [C2] 六角色×十二维及八接口有覆盖，未测状态如实标明。
- [C3] 问题和方案有独立专家及红队原票，终版关联变更闭合。
- [C4] 未混入 Plan Agent 问题，未声称修复/peak/双端运行验收完成。
- [C5] 方案为可定位最小修改和可执行验收，不增加无证据防护或新调度体系。
Phase gate、两名专家后及时写同一报告 checkpoint，记录完成/活跃 ownership/未完/关键决策/恢复读取指针。
