# Hook 发布前审查

**DONE：本任务受审修复已启用、重启实测、提交并推送；同一提交的六项远端 CI 全部通过。**

## 最新发布状态（2026-09-30）

用户直接授权启用、提交与推送后，既有受审批次成功应用准确七文件、更新本根受保护安装并精确刷新11条官方信任，保留其余3根记录。旧会话下一次真实调用曾被摘要门拒绝，未改用其他工具绕过；用户重启后，本会话真实工具调用成功，磁盘健康与官方11/11信任读回均通过。

完整正常Git提交门PASS=107、FAIL=0、WARN=0、DELEGATED=1；commit-msg的完整暂存快照合同检查成功。提交1ea5d2364cb2b706e8183b3a51ea079b6a1c71da，仅含七个受审文件，各blob逐字节匹配候选后镜像。普通push origin main成功，独立ls-remote读回远端main等于此SHA，索引为空。推送时GitHub报告Required Checks尚待运行；随后独立API读回本SHA的CI 36698317713已completed/success，六项检查（含Required Checks）全部success，并非仅服务器接收推送。

[已发布提交](https://github.com/wangmoumou1216-ai/luca_gstack/commit/1ea5d2364cb2b706e8183b3a51ea079b6a1c71da)；[六项CI](https://github.com/wangmoumou1216-ai/luca_gstack/actions/runs/36698317713)。当前已核验范围无剩余已确认Hook缺陷或阻断；不作未来零缺陷保证。

最终协调通知分别向“等待通知”和“继续完成 Skill 仓库更新”发送，但两者均已归档，工具明确返回未送达；未恢复归档或启动新会话。此前联合排查证据已保留，本轮最终结论在此报告交付用户。

母仓/系统目录的重启真实工具检查已通过；Muse/AIHub Direct的11条信任和真实GUI新会话启动已通过。重启后未另派原生子任务，也未向Direct空白会话发送工具请求；相应面仍不作真实执行声明。隔离子代理源码保护回归已通过。未来源码更新仍须维护窗口、单根安装、逐实际配置目录信任读回及会话重载；本修复不热替换在途会话。

本任务七个源文件已发布。审计备份与冻结证据保持本地；其他会话的日志、.workbuddy和兄弟审计未暂存。机器证据见publication-result.json、publication-commit.log、post-restart-health.json、post-restart-trust-readback.log。下文保留候选审查时的历史状态与原始判决，旧“待批准/未启用/未发布”描述不再表示当前状态。

本轮两轴初审发现5项Important，均已在隔离候选修复并由独立判官复核关闭。
最佳方案是：保留完整性保护，在隔离副本修改和审查；冻结源码后协调维护窗口；
同一批次更新准确7个源目标、单根安装与11条官方精确信任；刷新旧会话并实测后再放行发布。

## Standards

**终版PASS5/5，无残留actionable finding。**

- Python优化会移除启用安全断言：改成显式异常，正常及优化模式均验证有效。
- 损坏注册命令仍报健康：独立固定完整注册协议，核对事件、matcher、加载/恢复命令、超时和上下文限制；只允许源码摘要更新。

原判：[standards-01.md](release-review/standards-01.md)。终版：[standards-02.md](release-review/standards-02.md)。

## Spec

**终版PASS8/8，无confirmed defect。**

- 安装清单的错误模块格式仍报健康：按扩展名和最近package规则重算格式。
- 官方查询时注册漂移漏过已授信/dry-run早返回：查询后检查冻结注册字节。
- 不受绑定的清单目标和new标记可能误删无关文件：固定清单核心与准确七目标，验证新文件前镜像；只有补丁明确应用成功后才回退，并保留并发编辑和已变安装状态。

另外补上Node同步加载能力检查，缺少registerHooks时拒绝安装健康。
原判：[spec-01.md](release-review/spec-01.md)。终版：[spec-02.md](release-review/spec-02.md)。

## Axis summary

| 审查轴 | 初审 | 终版候选 |
|---|---|---|
| Standards | 2项Important，FAIL3/6 | PASS5/5，2项关闭 |
| Spec | 3项Important，FAIL1/8 | PASS8/8，3项关闭 |

43文件前后SHA一致；两轴独立，无源码自动修复。终版Spec原生调用真实accepted，peak/codex-native，当前根无pending或critical_failure；该回执只证明审查调用完成。

## 行为证据

- 体检/授信回归32/32，单根保留及原生源码保护4/4，11条摘要门禁变异/恢复通过。
- 四项新门禁移除后均触发真实回归失败；未只检查报表文字。
- 启用脚本内存失败注入3/3；判官另验默认不写、安装改变不回退、并发编辑保留。
- 实际默认及优化预检，66文件字节/mtime不变。生产基线仍0c56460e5a0761b7caaa7b628a1bf22fd57a2c09。
- 隔离实际Stop恢复和恢复缺失两种路径均continue:false。npm check:hooks通过，已退役read-grants保持SKIP。

上述覆盖候选/隔离运行；当前生产源码、保护清单和信任未由本任务修改。没有提交或推送。

## 冻结与剩余条件

revision3补丁SHA：3d90329de723ab5720769576e66f9a2c92ec0568a7920f8658a8da7ce8504729。
源码摘要：e2ca1945db477cc2f1cf073c80e34c8cb58c4f25d9ac2fb5a1d48d0982f59691。
范围：[SCOPE-02.json](release-review/SCOPE-02.json)；准确前后镜像：[candidate-manifest.json](candidate-manifest.json)。

本地启用确认仍待用户回应。启用还须重新确认共享根队列暂停和实际agent完成；空状态快照不能证明锁。
受审批次执行后，必须官方读回新11条信任、刷新旧会话并通过真实工具及子任务验收。
生产release acceptance保持UNKNOWN；本审查不作未来零缺陷保证。
具体范围及回退见[ACTIVATION.md](ACTIVATION.md)，默认执行器仍为只读预检。
