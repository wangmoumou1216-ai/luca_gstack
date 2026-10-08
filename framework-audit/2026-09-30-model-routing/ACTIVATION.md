# Reviewed activation scope (not executed)

冻结补丁：`9b2c53963b74f829af785b0167a0055fb35cad1fdf71668438f3bd8fdac54361`，13 文件及 pre/post SHA 见 candidate-manifest.json。完整测试与两份最终同版本冷审均已通过；此文档为最后人类启用确认的具体范围。

1. 核验生产 preimage、冻结 patch、source digest 和实际审查结论。生产 source 尚未改动。
2. 应用 13 文件补丁；只更新本 root 的已审 source manifest，使用公共 `install-codex-source-guard.mjs --root /Users/luca/Desktop/luca_gstack --preserve-other-roots`，保留其他 root。
3. 使用 `codex-trust-hooks.mjs --host-launch --dry-run` 读取官方 hooks/list 的精确 key/event/currentHash/full command。经此批准后只授信本仓 11 条；哈希必须由 Codex 提供，不自行推测。
4. 通过同一公共脚本写入授信（自动备份 user config、官方版本 CAS、第三方集合前后不变检查），核验 source guard、11 条注册及实际派发证据。
5. 更新 checkpoint 与状态；不提交、不推送。

信任键范围见 activation-scope.json；代码与已审 manifest 更新须在一个已授权的有序操作内完成，避免中途旧 digest 使后续工具拒绝。若源变化、root 集合或授信条目不匹配则停止，不跳过 guard。

重要权衡：原生关键调用在完成证据落盘前暂停新派发，需要顺序完成；非关键原生任务及一个准入 runner 内的关键任务仍可并行。

授权来源边界：project-session.md:30 要求新 reviewed manifest 和 changed-command trust。codex-trust-hooks.mjs:18–20 将此定义为人已审 hook 的判断，脚本只替代点击。此文件记录候选范围，不能替代真人批准。

<!-- FILE_END: ACTIVATION.md -->
