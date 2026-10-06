# 原生启动恢复：新增证据

2026-10-02 root 有界补查，使用 OpenAI Docs 的官方来源路径；未改全局配置。官方页实际打开后定向读取，不把搜索摘要当证据。

[官方配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)明确：allow_login_shell=false使未指定login的调用使用非登录语义，并拒绝login=true；features.shell_snapshot是环境快照开关。它们说明候选可配置，不证明启动失败根因或实际权限行为。检索未找到统一exec内部zsh fork的官方合同，不凭开关列表推断可安全关闭。

本机canonical0.160.0仅initialize/config/read回显两个false，元数据 u007-native-launch-metadata-r1.json SHA9b8b217eabaf687f722402e6b2d6388bb11f8b6f7156dd714d7ae9870cbfab1d，transport exit0，无stderr。白名单投影只保留这两个值；不保存完整配置、环境或凭据。0 thread、turn、模型、命令探针及全局写。旧P06实际能力仍UNKNOWN。

CLI features list接受上述覆盖，shell_snapshot=false，unified_exec/shell_tool仍true。generated ThreadStartParams的experimentalRawEvents是内部原始事件开关，仅作观察候选；没有官方行为保证覆盖内层exec调用。查看RawResponseItem schema时输出被截断，只有相关字段结构可用，未声称全文语义审查。新raw事件不作为自动成功或完整计数证明。

新资料补足N04的控制入口缺口，足以准备一次复合恢复候选；不能追溯改变P06结论。补充9记录代价、全部原失败、唯一尝试和停止边界。正式环境效果与公平性仍由实际运行证明。

工具证据：web search turn33、实际open turn34与定向读取turn35；本机metadata dcf4c6、CLI help10e55b、features2df6ad。没有使用其他网站、未启动CDP浏览器或登录态操作。

<!-- FILE_END: u007-native-launch-recovery-evidence.md -->
