# W36 routing 交付

DONE_WITH_CONCERNS：候选已改，共享加载条件待root集成，未生产采用。

文件：/Users/luca/.codex/worktrees/8812/luca_gstack/AGENTS.md
SHA256：6f603c20c0350045eb1c29ba6e0bdf9b29281e15d09479b19f8191fee46e9526
仅改K2/K4/K10，前后均11253字节。

|分支|之前|候选意图|
|---|---|---|
|无关有界任务|全启动/路由|直接读owner，真实门仍适用|
|显式选中适用方法|重复catalog|直接读authority至EOF|
|真实发现/选择未决|读catalog|保留，并明确skill/authority|

K1/K3/K5—K9、Static Fallback及其他文本逐字不变；checker/test和R9未改。实际行为、效率、质量和Claude行为未测。

生成器check、agent-context checker、现有测试及diff --check均exit0，完整命令见证据。107/107 mutation通过，含projection rollback及staged-index/merge门，32.29秒。生成器参数为check。两次11KiB超限日志保留，压缩后通过，未放宽断言。

共享owner最小修复（root实施）：
1. .claude/skill-os/agent-context-manifest.json的id=skill-catalog：condition替换为“需要真实技能发现或适用方法选择未决，包括无匹配/语义歧义的STOP；显式选中且适用的方法直接读authority，不重复目录发现”；load_before替换为“该发现或未决技能选择完成之前”。其他字段保留。
2. 受影响生成文件仅.claude/skill-os/generated/context-index.md；重建并核diff，catalog内容无需变化。未修此处时K10会重新引入旧前置，新K4例外尚不能称生效。
3. .claude/skill-os/agent-root-kernel.json：K4.statement改述上述条件与例外；K2.statement加框架/技能/项目/记忆/跨会话恢复条件，无关有界任务走owner且保留真实门；K10.statement将startup限定同类语义，保留load_before、EOF及宿主真实性。保护pattern无需删除。Claude根未改，仍沿原规则，不宣称跨端同步实测。

证据目录：
/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w36-routing-fs8ttlm5/
routing.diff为精确diff；evidence.json含前后hash/日志索引；final-checks.json和diff-check.json含命令/exit；final-3.stdout为测试日志。

起点epoch1790986931.3885992，至报告35保守动作；turn ID/usage/完整观察token unknown。0新Agent/行为run，无提交推送。实际验证及独立review交root。
