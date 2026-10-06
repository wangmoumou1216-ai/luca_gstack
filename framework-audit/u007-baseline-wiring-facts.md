# W11 原生基线接线事实摘要

这是主协调对 /root/baseline_wiring 已返回结果的压缩保存，不冒称完整逐字原始工具回执。结论是当前 B/S 只有材料，尚不能认定完整原生基线；没有执行模型、hooks、安装、授信或网络。W11 指定源HEAD为05120197073144c0f46b6fb30a192733d529cc4f。

- .codex/hooks.json 有11个原生hook入口，涉及SessionStart、UserPromptSubmit、PreToolUse、PostToolUse、Stop、SubagentStart/Stop及SessionEnd。当前conditions构建排除.codex和.agents，未做trust或skill发现接线。dry-run会跳过实际session/child/unfinished状态效果，不能称完整B。
- .codex/config.toml含原4个外部writable root及network=true。hooks命令强制MEMORY_ROOT=/Users/luca/Desktop/luca_gstack并重定向公共/tmp日志。session-restore内部还会处理日志、每日治理；约654行起在有upstream时后台git fetch。只改外层cwd不足以隔离。
- 既有可用路径入口包括LUCA_PROJECTS_ROOT（lib/project-substrate.mjs）、GLOBAL_MEMORY_DIR（session-restore约592）和MEMORY_ROOT解析器，但hook内联MEMORY_ROOT会覆盖外层值。
- .codex/model-route-hook.mjs约25—34：policy/binding/state/transcript路径override仅在NODE_ENV=test生效，默认绑定文件在/Users/luca/.luca/model-routing-bindings.json；scripts/model-route-host.mjs默认状态位于用户.luca。生产身份验证还绑定默认Codex home和真实事件来源，不能设测试attestation来伪称同等验证。
- event-attestation.mjs与codex-child-project.mjs实际位于.claude/hooks/lib/；model-route-host.mjs在scripts/。初始任务两个猜测路径scripts/project-substrate.mjs、scripts/host-launch.mjs不存在，已记录；不要继续用错路径扩扫。
- scripts/codex-trust-hooks.mjs通过官方hooks/list取得key/currentHash，写hooks.state.<key>.trusted_hash；但该脚本会备份并config/batchWrite到用户全局配置，不能直接运行。其三个host hook命令匹配固定MEMORY_ROOT和日志路径。现有健康脚本成功不等于实际原生trust已经生效。
- linked worktree可能使用primary checkout的hook注册；隔离测试若依赖独立注册，需要独立Git目录，不能仅把工作树当独立repo。原生sourceguard安装不是native-trust-v1必需条件；不要自动安装。
- .agents/skills symlink文本可见，但不在U002源清单。MagicPath目标不在冻结范围，必须保留缺口，不读取外部目标。

W11建议：当前B/S运行资格保持未通过，下一步只做必要原生接线与路径闭合，真实效果用获准最小探针验证。若只有模拟可用，明确不等于当前原生B，不用它证明替代胜出。

主协调后续定向源核实：10a32d完整读trust脚本225行，395a79读原config/hooks/MODEL_ROUTING；331bcd读model-route-hook前70行确认真实imports及test-only路径；11bcad定向检索确认session-restore公共日志/后台fetch，三个误拼的.codex/lib路径不存在已保留exit2。未访问全局配置/私人绑定正文。

尚未验证的具体可行方向：官方-c进程配置能否表达hooks/list返回的原生currentHash从而避免写全局配置；以及严格只改环境路径的隔离副本是否可保持原控制逻辑并通过等价审查。它们是待查假设，绝不是已经可用的建议。禁止重定义HOME/home/CODEX_HOME，禁止伪造原生事件/关闭验真。

W11自报25命令、保守30文件/检查动作，无文件写、hooks/trust/model/network/hidden；墙钟/token未完整可观察，unknown。主协调另行保存本摘要。

<!-- FILE_END: u007-baseline-wiring-facts.md -->
