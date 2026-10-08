# AIHub Direct 补充检查

用户截图对应“修复新会话点击报错”会话，原记录在诊断/测试后中断，没有授信完成或真实启动通过证据。此次重新检查实际状态，保留独立证据。

## 检查与修复

母仓和 Muse 副本的完整注册协议、当前源码摘要、受保护 JavaScript/格式、Python/策略快照及 Stop 恢复文件全部通过只读 health。

| 实际启动组合 | 修复前官方信任 | 当前结果 |
|---|---|---|
| 母仓 + 系统 `/Users/luca/.codex` | 11 trusted | 原状态通过 |
| Muse副本 + 系统 `/Users/luca/.codex` | 11 trusted | 原状态通过 |
| Muse副本 + `/Users/luca/.luca/codex/aihub-direct` | 11 modified；App门禁失败 | 11 trusted；App新会话实际启动通过 |

使用 Muse副本已有官方 `codex-trust-hooks.mjs --host-launch` 入口，在明确 Direct目录中执行dry-run、精确CAS写入与读回。源码、受保护安装、账号、provider设置及系统目录信任保持原有范围。私有0600配置备份在 `/Users/luca/.luca/codex/aihub-direct/config.toml.bak-2026-09-30T08-53-07-476Z`。复核配置差异仅有11个目标trusted_hash，以及新TUI启动后新增的`tui.model_availability_nux`；没有其他配置值差异。

GUI实际点击“新会话”后错误消失，Codex v0.159.2进入输入界面。F2核对唯一启动警告：命令行覆盖参数要求embedded mode，与Hook无关。验证会话保留在应用中，没有发送提示；该会话的真实工具/子任务及项目绑定验收仍为UNVERIFIED。

## 覆盖范围修正

副本同步源码不能完成各配置目录的独立信任更新。原维护执行器会继承调用者CODEX_HOME，允许在错误目录尝试维护；新增红测试复现后，将它锁定到母仓/系统目录这一受审组合，并在预检与结果中明确输出范围。未经补审的组合在任何子进程或修改前拒绝。七文件候选和补丁SHA没有变化；执行器补充修复另按SCOPE-03冷启动双轴复核。

母仓/Direct官方未加载母仓11条注册，它不是当前App启动组合；不据此扩量授信或修改项目授权。新增配置目录时需要明确列入维护清单，逐组合检查。未来更新的完整步骤是审核/同步源根、更新受保护安装、逐实际配置目录授信、刷新旧会话及真实运行验收。

证据：direct-profile-readback.json、direct-trust-dry-run.log、direct-trust-apply.log、direct-trust-readback.log、direct-repair-proof.json，以及本会话CUA实际界面记录。母仓候选启用和Git发布尚未执行。
