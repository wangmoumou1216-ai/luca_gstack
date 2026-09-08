# 记忆执行核验与进化结果

Status: DONE_WITH_CONCERNS（实现、独立复审与验收完成；Claude 原生在线验证保留 UNKNOWN）。日期：2026-09-08。
范围：luca_gstack 框架 NO_PIN；用户已批准执行、有价值改动的提交，并追加授权红队闭合后普通发布。没有切换或扫描下游真实项目，Git 提交与发布信息见同目录 memory-release-receipt。

## 结论与正式运行边界

记忆体系仍在运行，但原来存在“提醒被当作落库完成”、来源不足、召回与归属错误等断点，不能回答成“遇到任何问题都自动记住”。默认 Stop 捕获的是待裁决线索；重大信号经提取门槛和归因后才落对应层。项目知识由已核验的 session pin/grant 限定；框架稳定事实继续走 candidate→review→promotion，人类晋升门未放宽。

当前正式执行入口是本检出，权威数据仍是 MEMORY_ROOT 指定的 Desktop/luca_gstack/memory。治理脚本及框架规则检查现在取当前代码目录，数据读写仍取 MEMORY_ROOT。此次没有把旧数据仓库升级成第二套正式执行入口；从旧仓手动运行旧脚本不等于运行本次修复。

默认每日治理由 SessionStart 在当天首次启动时后台触发，不是全天常驻守护进程。本机 LaunchAgents 未安装可选 memory-governance 任务。Codex 实际会话启动、工具和 Stop 证据已获得；Claude 直接 hook/adapter 回归通过，但原生模型探针返回 API 403，在线完整链路 UNKNOWN。

## 已实现的价值

| 原问题 | 现在的行为与证据 |
|---|---|
| 摘要未入检索索引、同主题源文件覆盖 | 摘要可被独立新进程检索；源文件名绑定唯一 episode ID，两次写入保留两份证据。 |
| 项目层先读全部内容才过滤、默认归属取共享展示指针 | 只打开显式范围的项目目录，拒绝逃逸/软链；不推断默认项目；NO_PIN 不返回带明确项目归属的 episodic，归档同样过滤。 |
| marker 后的新工作没有再次捕获 | 默认软模式为新增工作窗口另建 pending，保留旧线索，不把 marker 叫“内容已入库”。 |
| 遗留 claim 锁让提醒静默消失 | 锁失败有警告和一项明确标为未认领的只读提醒；保留锁和证据，不自动抢锁。 |
| 裁决日志损坏、软链、归档中断 | 先校验账本再写；拒绝越界软链；rename 前后中断均可按原输入恢复，复用裁决 ID，不重复计账。 |
| 认领被当成真实消费 | 健康检查区分展示、裁决、内容落地；不断刷新 claim 不再掩盖旧待裁决证据。 |
| 两检出历史候选撞号、已批准规则不同步 | 保留原身份与历史证据，定向归档冲突副本并重提；根据既有人工批准记录通过原晋升门同步。 |
| sync 推错分支或夹带已有暂存 | 显式 HEAD→tracking upstream；已有 index 内容时拒绝操作。真实临时 bare Git 回归通过。 |

## 真实数据处置

两份冲突候选原文保存在 `memory/semantic/archive/candidates-memory-collision-reproposal-20260908.jsonl`，原 ID 不被改写或复用。新提议 SC-20260908-001/002 仍待人工审批，没有自动晋升。迁移 receipt 与独立读回报告见同目录 collision/reconciliation 文件。

四条已于 9 月 5 日批准的 SC-20260905-001…004 经原门禁同步至权威 store，四条被明确取代的旧事实保留归档；健康检查 PASS。应用日期为 9 月 8 日，来源创建/审批日期仍保留；不宣称两库字节完全一致。

本次有价值经验已落库 EP-20260908-150，独立新进程以 MEMORY-EVOLUTION-20260908 检索，首条命中同 ID。L4 候选 SC-20260908-003 请求替代旧硬拦截排障表述，仍为待审；queue 无 ID 冲突、promotion_ready 为空。写后治理 new_episodes=1、loop_anomalies=0、promoted=0。这证明本次实际读写链路，不代表历史积压已全部解决。

三份本任务启动认领的历史占位 pending 均保留 UNRESOLVED：无原会话或具体事实，不能编造经验。最新一次裁决 ID 为 PD-20260908T034223791028Z-83811-58db78f4。其余历史队列未批量清空。

## 研究与取舍

[研究报告](2026-09-08-memory-evolution-research.md)覆盖 Claude Code、Codex、LangGraph/LangMem、Letta/Letta Code、Hermes Agent，并阅读 LongMemEval、LoCoMo 原始资料及明确标为预印本的研究。五角度、三轮采集记录已永久保存于 `2026-09-08-memory-evidence/`；研究独立 Socratic PASS。

采用范围先限定、来源追踪、阶段状态分离、失败恢复、按需加载和有治理的更新。没有增加向量数据库、后台 LLM 或收费服务：它们不能替代本次已复现的确定性故障修复。这里的收益是经过测试的正确性与可追溯性改善，不宣称记忆准确率提升某个百分比。

## 验证与审查

- 记忆测试：81 项 PASS，包含临时真实文件故障、新进程召回、并发候选、撞号阻断、晋升和归档门。
- 权威 stable facts 健康：PASS。
- 双轴独立首审：Standards 2 项 Important、Spec 2 项 Important；均已复现并修复。两个独立闭合复审均 PASS；Standards 的一项 Minor 测试缺口已用合法 JSONL 与移除保护的 mutation 闭合，最终两项测试增量另获独立 PASS。
- hooks 全套与 Codex adapter PASS；v4 最终全框架 verify 94/94 PASS。红队与 Standards/Spec 最终复审均 PASS，未关闭 Important 为 0。
- Codex 原生证据及 Claude API 403 原始结果保存于 `2026-09-08-memory-evidence/`，不能用通用 hook 日志冒充本会话证据。

## 保留的限制

项目选择参数不是授权系统；调用方必须核验 session 范围。旧的无 project 字段记录没有被批量重新归类。候选 ID 锁覆盖已知本机检出，不能当作多设备共识协议；遇到新冲突仍保守拒写。claim 降级不修复遗留锁，也不保证不同启动看到不同待办。QUALIFIED 裁决文字本身不能证明内容已正确落库，必须结合实际 ID、文件与读回证据。

并发的 office/agent-context、route-guard 及其测试/报告和运行时 retrieval/eval 日志不属于本次提交；既有有价值的 memory WIP 与历史状态勘误纳入评审整合，未覆盖他人改动。

## 数据与代码提交边界

权威数据改动已经应用并读回。旧数据检出的 pre-commit 强制调用旧 verify，其中 S2/S16/I4 仍读取共享项目别名，与本次 NO_PIN 边界冲突；没有执行该旧门禁、绕过 hook 或顺带升级旧框架。其七份相关数据变更保留在原库工作树，精确补丁及文件哈希以 `2026-09-08-memory-evidence/authoritative-data.patch` 和 manifest 纳入当前框架交付，候选快照也保留。未纳入原有 eval/retrieval 日志。未来对旧仓同步前，须先把其提交验证入口对齐 NO_PIN 或在获准范围内执行；本次不把此事冒称已完成 Git 同步。

发布补充：独立数据复核确认当前正式仓的 episodic/index.jsonl、episodic/archive/2026.jsonl、semantic/archive/candidates-2026.jsonl 三项与权威变更基线逐 byte 一致，故写前重验全部基线与源 SHA 后只镜像三项，写后目标 SHA 全部匹配。EP-150 随正式索引发布，EP-102 仅按原轮转进入归档，均无重复；四条已批准候选补齐档案。其他四项保持当前原 9/5 批准历史、事实日期及等价 allowlist，不混入 9/8 重放事件。receipt：2026-09-08-memory-evidence/release-data-mirror.json。旧库本身仍保留其工作数据，本次通过当前正式仓发布，不绕过旧库 hooks。

## 用户追加红队的闭合

红队先后复现并关闭：首次 push 失败后无新改动的重试被跳过；事实持久化而晋升审计中断后的恢复缺口；治理 writer 失败未显式呈现及跨 UTC 日期漏告警；UNRESOLVED 裁决持久化后重试重复计账。来源转义身份、nullable 元数据和历史 scope 序列化边界也经故障注入与负对照闭合。

最终红队复用六个真实失败现场，在两种解析器下补齐且仅补齐一次审计；不同来源、不同 scope、撤回批准仍拒绝恢复，证据在持久化审计前保留。新增测试 v4 PASS→恢复旧缺陷后六项失败→v4 PASS。完整记录见 [红队最终报告](2026-09-08-memory-evidence/redteam-final-v4.md)、[Standards](2026-09-08-memory-evidence/standards-final-v4.md)、[Spec](2026-09-08-memory-evidence/spec-final-v4.md)。

v4 冻结清单 SHA-256 为 `9269f657c59deea4ec0a15466e67d7bb9d3740798440d0bdcdbc93e4c9ae5dc6`。之后仅更新交付状态、证据与发布回执；代码不得漂移。81 项专项、94 项框架验收日志已永久保存。旧失败报告和夹具失败日志保留为过程证据，不冒称从未发现问题。最终提交仍执行正常 precommit 与 index 合同检查，不绕过门禁。

审计制品完整性：原始 reviewer Markdown、故障日志和 patch 保留字节，其中 Markdown 硬换行与 patch 空白上下文会触发 Git 行尾空白提示。工程／交付正文使用标准 `git diff --cached --check`；仅原文证据目录的检查关闭 `blank-at-eol`，仍检查其余空白错误，且逐文件 SHA 保全。没有改写原始审查证据以制造空白检查通过。
