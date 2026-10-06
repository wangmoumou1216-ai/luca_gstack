# 更新后的母仓 / Direct 配置修复

本次是应用更新后的新增运行组合，接续此前已发布的 Hook 修复；此前发布记录保持原样。

## 目标与执行范围

原始用户授权：排查并修复 Hook 阻断、完成 review 和收尾。本次执行为顺序的小范围配置修复：
1. 复现宿主门禁并核对实际根 / CODEX_HOME。
2. 在健康且已经审查的母仓上，以官方版本 CAS 补齐 Direct 配置中的精确项目 trust；再由官方授信脚本核对并授信 11 项当前 Hook。
3. 重新验证宿主门禁、三个既有运行组合、源码/安装健康；实际点击新会话。

不重新启用源代码包，不更改其他项目、凭据、Hook 命令或安全门禁。

## 根因与修复证据

- 应用更新把新会话根从 Muse 副本 `/Users/luca/Desktop/项目/muse/lucagstack` 改为母仓 `/Users/luca/Desktop/luca_gstack`。
- 工作树 main.js 的 GSTACK 和安装版应用文件树所显示的 `luca_gstack` 一致；没有声称安装包与工作树逐字节一致。
- Direct CODEX_HOME 为 `/Users/luca/.luca/codex/aihub-direct`。原先只配置了 Muse 副本的 project trust 和 11 项 Hook trust。
- 修复前：母仓 / Direct 无精确 Hook 条目；应用的 verifyHostHooks 复现 `Codex host hooks are not trusted`。
- 官方 config/read 取得基准版本，config/batchWrite expectedVersion 只新增母仓项目的 trust_level=trusted；备份权限为 0600，回读整个用户层与预期深比较一致。
- 补齐项目 trust 后官方列表加载了 11 项母仓 Hook，均为 untrusted；源码/受保护安装健康通过后由 `codex-trust-hooks.mjs --host-launch` 精确授信和回读 11 项。
- 修复后同一 verifyHostHooks 调用返回 `APP_HOST_GATE_PASS`。
- 母仓 / Direct、母仓 / 系统配置、Muse 副本 / Direct 三组各 11/11 trusted、pending 0；旧副本授权保持可用。
- 母仓源码摘要保持 `e2ca1945db477cc2f1cf073c80e34c8cb58c4f25d9ac2fb5a1d48d0982f59691`，注册和安装体检均 PASS。

## 发布检查的补充结论

“副本同步母仓”只能同步代码，不能同步各 CODEX_HOME 的官方项目 / Hook 信任记录。
更新若改变实际框架根或配置目录，必须在实际使用的 `(root, CODEX_HOME)` 下验证项目可加载、精确 11 条官方 Hook trust、宿主门禁及新会话。禁止据此对未使用组合做批量或通配授信。
此次为本机配置修复，无源码变更，不需要新增代码提交；此前源码提交 `1ea5d2364cb2b706e8183b3a51ea079b6a1c71da` 及其 CI 通过记录仍有效。

## 尚待验证

Mac 锁屏使 CUA 无法点击“新会话”，已请求用户手动解锁。配置和进程检查通过不等同于 GUI 验证完成。
安装包字节读取曾被项目门禁以 UNKNOWN_SCHEMA 拒绝；未绕过。定位和修复使用独立的实际 UI 根目录证据、配置官方回读和宿主门禁复现。

证据：`mother-direct-project-repair.json`、`mother-direct-hook-repair.log`、`mother-direct-trust-readback.json`。
