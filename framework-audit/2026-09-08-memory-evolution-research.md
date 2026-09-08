# Harness 记忆机制研究与本地采纳

日期：2026-09-08。范围：NO_PIN 框架治理。状态：独立 Socratic 评审 PASS，见同目录 2026-09-08-memory-research-review.md。

## 方法和证据边界

五角度各完成发现、原文阅读、薄弱结论复核三轮。采集按用户授权使用较低版本模型；受线程总额限制，Claude、LangMem、Letta/Hermes 三角由同一研究 Agent 分批完成，OpenAI、评估角由主 Agent 完成。五角度不是五个独立投票。官方文档证明能力，不能独立证明收益；本地故障和回归决定是否采纳。未安装外部产品、未开启收费服务或外发记忆。Codex commit 为同次研究的版本定位线索，非对已读 main 字节的严格哈希绑定。

共识状态：分层/按需加载、来源可追溯、阶段状态分离为多机构机制共识（CONSENSUS，非效果共识）；各产品更新/自动删除政策为条件性差异（DISPUTED，不统一照搬）；任一万能架构或量化本地收益为 INSUFFICIENT；没有发现阻止本地确定性故障修复的 CONTRADICTED 证据。

原始检索日志已永久保存到同目录 `2026-09-08-memory-evidence/dr-*-memory.md`（五份）。分别含搜索词、三轮过程、URL、限制。永久报告的下列链接保留主要证据；临时日志不作为长期唯一真值。

## 官方机制与采纳判断

| 对象 | 原文支持的机制 | 本地采用与边界 |
|---|---|---|
| Claude Code | 人工指令与自动记忆分开；简短启动索引、主题按需加载；记忆是上下文，确定性控制属于 settings/hooks。 | 延续已有轻量索引与规则分层；不把记忆说明当强制接线。官方未公开完整选取算法，不能宣称其去重或正确率优于本框架。 |
| Codex | 单会话提取后统一整理；任务锁、退避；区分成功有输出、成功无输出、失败。 | 采用阶段结果与来源证据，修复 marker 假成功、恢复停摆。官方 main 机制不等于已安装 CLI 的启用状态。 |
| LangGraph/LangMem | 会话 checkpoint 与长期 store 分离；命名空间先限定存取；即时与后台写入各有时效/成本取舍；LLM 可提议增删改。 | 项目范围在打开文件前生效，保留人工晋升；不直接采用自动删改或引入后台 LLM。 |
| Letta / Letta Code | API 持久 memory blocks 与检索 passages；Code 的 Context Repositories 使用 Git 文件、逐步读取与反思流程。 | 复用现有文件和 Git，修复同步正确性；不为追随产品公告迁移数据库。两个产品面分别判断。 |
| Hermes Agent | 小型启动记忆与历史会话搜索分开；可选 provider 有生命周期钩子；技能承载可复用过程。 | 保留“事实/事件/技能”分层，避免整段聊天自动升级常驻记忆。Hermes 模型本身不等于 Hermes Agent 的持久层。 |

原文：
- Claude：[Memory](https://code.claude.com/docs/en/memory)、[Settings](https://code.claude.com/docs/en/settings)、[Subagents](https://code.claude.com/docs/en/sub-agents)、[Context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)。同一机构资料不计独立效果验证。
- OpenAI：[产品说明](https://learn.chatgpt.com/docs/customization/memories?surface=app)、[源码 README](https://github.com/openai/codex/blob/4b0d9669cc46ba97bf85fa6312431b630d80498d/codex-rs/memories/README.md)、[整理模板](https://github.com/openai/codex/blob/4b0d9669cc46ba97bf85fa6312431b630d80498d/codex-rs/memories/write/templates/memories/consolidation.md)。源码读取 main 后同次获取 commit：4b0d9669cc46ba97bf85fa6312431b630d80498d；本地 CLI 0.153.4，原生 writer 启用状态 UNKNOWN。
- LangChain：[Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)、[Memory concepts](https://docs.langchain.com/oss/python/concepts/memory)、[Dynamic namespaces](https://langchain-ai.github.io/langmem/guides/dynamically_configure_namespaces/)、[Delayed processing](https://langchain-ai.github.io/langmem/guides/delayed_processing/)、[Semantic extraction](https://langchain-ai.github.io/langmem/guides/extract_semantic_memories/)。背景线程不保证 serverless 持久性；命名空间也不能替代应用授权。
- Letta：[Memory blocks](https://docs.letta.com/guides/core-concepts/memory/memory-blocks/)、[Passages API](https://docs.letta.com/api/typescript/resources/agents/subresources/passages)、[Context repositories](https://www.letta.com/blog/context-repositories/)。Git 版本可追溯不等于事实自动正确。
- Hermes：[Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/)、[Providers](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers/)、[Skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills/)。未本地运行，不声称它们的写入可靠性已经验证。

## 专业语义记忆与评估

语义记忆是持久事实/规则，episodic 是带时间的事件，procedural 是可执行经验；语义相似检索是检索方法，不是事实真实性或授权证明。采用 LangMem 结构化更新的边界意识，维持本框架 candidate→review→promotion，不引入第二个无治理写者。

[LongMemEval](https://arxiv.org/html/2410.10813v2) 分辨提取、跨会话、时间、更新和拒答，并区分索引、检索、阅读失败。本次映射为新进程摘要召回、错误项目排除、证据不足保留 UNRESOLVED；不宣称完成整个基准。
[LoCoMo 官方数据](https://github.com/snap-research/locomo) 保留时间/对话位置/答案证据。采用来源定位思想；版本必须固定，不挪用论文收益到本地。
[Harness the Memory](https://arxiv.org/html/2608.15008) 为 2026 年预印本，证据强度 MODERATE；不同任务/模型结果不支持万能存储方案。本次不据此改架构。

## 故障→最小修复→验收

1. 摘要不进索引、同日同主题 raw 覆盖：索引保留 summary，源文件绑定唯一 episode ID；新进程只凭摘要关键词能找回，两次记录各保留原文。
2. 跨项目预读、共享 alias 归属：取消默认全项目枚举与 alias 推断；范围选择不等于授权，调用方仍必须有 session pin/grant；无范围无项目读，拒绝路径逃逸。
3. marker 后新增信号漏捕获：软模式增量窗口也进入待裁决，不把 marker 叫内容落库；旧 pending 不覆盖。
4. claim 死锁、归档中断：可见锁错误并提供一项明确标注未认领的只读提醒、不抢占遗留锁；归档按 hash 与账本补完成事件；不得为清队列丢原文。
5. 历史候选 ID 碰撞：保留占号和证据，先审精确影响范围；不得重编号或关闭冲突保护换假绿。
6. 静态投影漂移：以已批准事实 provenance 确认同步方向，不能让旧权威副本覆盖新规则。
7. sync 目标错误与既有暂存被吸入：显式 HEAD→upstream，起始 index 检查；真实临时 Git remote 验证，生产不运行自动 push。
8. 健康误判：展示/认领不等于裁决，裁决也不自动等于有效知识落地；按阶段报告。

## 反方与不采纳

更复杂的向量库不能修复摘要没索引、错 scope、死锁和错误 ref。全量自动提取增加噪音与费用，也不满足本框架人工晋升政策。保持当前文件存储与程序架构，只修可复现边界。缺少长期效果数据，不能承诺百分比收益；当前基线 62 个记忆测试、hooks、sync 旧回归通过，仍被独立故障复现击穿，新增行为验收不可省。
