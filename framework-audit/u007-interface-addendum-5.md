# U007 接口补充 5：按实际入口构建基线，区分访问边界与读取计量

本补充是原 U007 的实现修正，不新增阶段、审批或实验池。正式比较仍需原独立就绪复核。三个原会话继续承担代码；主协调只持有共同接口、事实冻结、集成和释放。

## 1. 新观察及其有限结论

主协调只读原生 `config/read` 与 `hooks/list`，未启动 thread/turn/hooks、未写全局配置。原始选择性元数据在 `u007-hook-layer-root-cause.json`：当前生产 R 的项目配置层可见，11 个项目 hook 均为 trusted、enabled=false；5 个 user hook 为 enabled=true。全文读取 `/Users/luca/.codex/hooks.json` 显示这些 user hook 是宠物通知器和 Adrafinil，不是框架的项目/路由/模型控制。该观察是本次元数据事实，不能回填为历史会话、桌面全部入口或 U002 冻结时的运行证据。

隔离仓库的项目配置层被禁用。前置/后置 `-c projects...trust_level` 及根 `--no-daemon` 的有界元数据诊断都没有改变所返回的配置层。保存的相关文件为 `u007-hook-config-layer-diagnostic.json`、`u007-hook-layer-subcommand-config.json`、`u007-hook-layer-no-daemon.json`。不要再盲试同一组开关，不运行授信脚本、不写全局配置、不使用 bypass。

因此，W14 的 11-hook 激活/局部化方案保留为 review-only，不能作为已实现 B，也不能为了让比较开始而开启用户当前停用的功能。B 的评估主张必须绑定具体入口及当时真实可见/可用的机制。若当前入口不启用项目 hooks，不能以“完整框架原生控制已验证”作结论；同样不能把该入口凭空变成一个启用了全部 hooks 的理想基线。构建器可补齐原字节规则、必要只读依赖和原生技能材料；实际加载仍由后续真实入口证据及 J 判定。旧计划对 B 的忠实性要求不降低；不能等价复现的保护用途保留 UNKNOWN，禁止对应替换建议。

## 2. 原生命令的具体权限接口

P01 失败、P02 成功均保留并已计入 2/6 探针与 2/144 总行为池。P02 只证明本机 `codex sandbox -P` 对合成文件、逃逸链接与子进程的命令级文件隔离；不证明 app-server、MCP/Apps、网络尝试、模型采用或真实读取范围。

在 `runtime_release` 可加入以下具体对象，probe 登记必须完整等值绑定它，正式运行也必须写入证据：

```json
{
  "native_command_permissions": {
    "profile_id": "本次唯一的安全标识",
    "profile": {
      "filesystem": {
        ":root": "deny",
        ":minimal": "read",
        "本次 condition 的规范绝对路径": "read",
        "逐个已核实的运行时依赖绝对路径": "read"
      },
      "network": {"enabled": false}
    },
    "runtime_read_roots": ["与 profile 完全一致的只读运行时根"],
    "effective_probe": null
  }
}
```

上述只是字段说明，真实记录不能使用占位。profile 不允许 extends、write、额外 network 键、宽泛 home/用户目录/生产源/审计根。只读路径集合必须恰为 condition.root 与逐项 runtime_read_roots；拒绝不存在、非规范、链接漂移及危险宽泛根。`:minimal` 是原生运行最小系统许可，实际范围及其限制由 native probe 记录，不能宣称完整 syscall 审计。case 写操作继续只由四工具协议控制。

driver 将 profile 同时作为本次进程配置/本次 thread config 的明确值，thread/start 与 turn/start 都用 `permissions: profile_id`，不得再并列 `sandbox`/`sandboxPolicy`。记录发出的精确配置、RPC、activePermissionProfile.id/extends、实际安全响应；缺失或错配即失败。响应 id/extends 不等于完整有效策略证据。

`effective_probe` 为 null 时，仅允许已单独登记的 stage=probe 进行取证，返回状态要保留 `NATIVE_BOUNDARY_UNVERIFIED`，不能变成正式就绪。正式 development/hidden 必须引用主协调冻结、J 接受的证据 `{path, sha256}`；证据须绑定当前 driver、Codex 版本、同一 profile 结构及运行时根、有效配置、所测试的实际命令/子进程/越界结果和未测范围。可使用同结构不同独占 condition 目录，但不能放宽读取集合。具体证据尚未产生，worker 不得伪造批准记录或自行签发。

## 3. 避免误判，也不隐藏未知

当前 driver 把每个 commandExecution 自动判 `INVALID_RUN`，连只做计算或合法读文件都会失效。应分开两件事：

1. 是否有经验证的硬访问边界，阻止候选读取未来题/答案/别的 run 或修改非授权文件。
2. 在该边界内，候选到底读了哪些字节、是否完整消费。

第 1 项经实际 app-server 探针及 J 接受后，合法原生命令可以进入质量比较，不因第 2 项未知自动判污染。第 2 项仍保留 `UNKNOWN_NATIVE_READ_SCOPE`，不得计成实际访问/完整采用证明，也不能据此声称 Context 读取效率收益。未验证的边界仍不合格。imageView/MCP/Apps/网络等其他面不能继承命令沙箱证明；不属于本地命令边界者继续 fail closed 或保留不可测范围。不得把所有原生工具关掉来让 T 变弱，也不得删除真实失败记录。

## 4. 资源与责任

当前准备 17/20，review 4/32，真实行为 2/144，其中能力探针 2/6、模型调用 0。余下 3 次准备工作给原三个 owner 各一次具体实现/核验，单次仍 45 分钟、90 动作、120000 可观察 token；不另开 Agent、不做通用平台。若这三次后关键能力仍不可测，按原计划报告缺证范围并停止依赖该证据的替换，不能暗加预算或将未验证方案推为最终改造。

<!-- FILE_END: u007-interface-addendum-5.md -->
