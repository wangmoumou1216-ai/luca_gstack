# W37 第一批 orchestration 开发

DONE_WITH_CONCERNS：两个限定authority已修改，供root联合验收；不表示采用/生产切换。HEAD与任务卡前像匹配，原R9 pair哈希未变，无未知dirty覆盖。

修改及语义前后（最终行号）：
- orchestrator.md:198（§2d）：原每阶段无条件再确认；现前置验证/eval通过、后续已批准且无未决Human Gate/未授权effect时继续。缺项仍等真实响应。§6同步取消笼统“自动继续”绕过真人决定的例外。
- :223、240：原只等报告、fanout有BLOCKED即可能误判全部结束；现沿实际原生句柄观察，wait超时/idle/ACK不算完成，不因此重派；失败保留，依赖暂停，其余在途单独处理。
- :278与work-agent-template.md:56、151：原背景/约束未明确承载授权；现两种MODE用既有TASK_CONTEXT/INHERITED_CONSTRAINTS传原目标、当前focus、最新有效授权来源、scope/唯一owner/effect及未决门，保留原产物和验收。缺终态不报DONE，原失败保留。
- orchestrator.md:116、408、442：原31轮推算>80%并强停；现轮数仅提醒。真实压力/交接/既有必要边界仍读long-session并checkpoint，实际资源上限仍有效。:430恢复先核事实，已有继续授权则续首个未完点，不重跑已完成效果。

最终SHA256：
- orchestrator.md：68c83777974edbf8e9416c18b512192bc68a7a8e437f30498046bb4af6a31c8b
- work-agent-template.md：a156e2340a8ec212ba7174635a7ca444582c1de3202a8f99057be7590b2ad7dc

验证（均exit0）：node scripts/check-agent-contracts.mjs 86/86；check-model-table.mjs、check-coding-discipline.mjs通过；test-verification-exit-contract.mjs --evidence <证据目录>/exit-contract.json 70/70、21模板；git diff --check通过。先读检查源码，只有本地静态/隔离shell执行，无模型/网络。另核implement §2.1a–b、eval原件保存、模型路由逐字不变；模板变量集合及完成JSON不变。未新增匹配新句子的测试。

[证据](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w37-evidence-xsz8mgcf/evidence.json)含精确diff、前后字节、命令/exit/log哈希及6个语义案例。案例是作者语义读回，不是模型行为证明。Codex桌面/CLI及Claude/API实际行为、收益、独立review均待root，不宣称跨端等价。保持当前模型/effort，无新Agent、commit/push或全局/生产修改。资源上界45/60动作，耗时见证据；usage/金额unknown。

<!-- FILE_END: u012-first-orchestration-report.md -->
