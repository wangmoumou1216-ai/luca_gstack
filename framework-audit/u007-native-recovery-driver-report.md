# W28 — 绑定的最小启动设置与原始事件请求

状态：DONE_WITH_CONCERNS。代码与离线验证完成，稳定 pair 可供 W29 联测；等待 root 收取和非作者验收。本次不运行 P07，也不宣称原生命令启动恢复成功或生产框架已落地。

## 稳定版本与接口（供 W29）

工作树 `/Users/luca/.codex/worktrees/71f8/luca_gstack`，只改 `scripts/tri-system-eval/driver.mjs`、`driver.test.mjs` 和本报告。修改前已确认本地 pair 与 R6/root pair 完全一致，不需要同步、覆盖或回滚其他 owner 文件。

| 文件 | R6 / 修改前 SHA256 | 最终 SHA256 | 最终 bytes |
|---|---|---|---|
| driver.mjs | 67c76f86f5614d8c79ec49f4007391eebf94a6d932003036c997223c95ea8d66 | c6db8f7d4612db1ce764159b5f8630dd9eebb9882906d4f3c66c66059d16abe0 | 49209 |
| driver.test.mjs | 8338cba9c2dd3eced9798635076243a50f6e75ca12ff221083eaba962bf256d6 | b85bc427ebd9d7b8a29e248ee0c3520db946ae42bb4a8047a8c68136c5ace90e | 60487 |

`runTrial` 公共参数未改。唯一新增可选合同：
```json
{"entry":{"native_launch":{"allow_login_shell":false,"shell_snapshot":false,"experimental_raw_events":true}}}
```
这里仅展示 entry 内新增字段，既有 transport 仍必需。出现 native_launch 时三个字段和值必须精确相等；null、数组、缺键、额外键、错误类型/值均在 mkdir/spawn 前拒绝。省略时没有新参数或报告子字段注入，维持 R6 路径。

按主协调补充9澄清1，新精确启动对象存在时 probe registration 的 capability_probe_limit 必须为7；旧省略路径必须为6，其它值及交叉组合拒绝。既有完整 entry 深比较保持注册与 release 绑定，不能用正确额度绕过 entry 错配。原40k正式简单任务预算不改，P07专用manifest准备归W27，本文件没有创建它。

启用时仅给自有 app-server argv 增加 `-c allow_login_shell=false --disable shell_snapshot`，每个 driver 发起的 thread/start（含 fresh 根）增加 `experimentalRawEvents:true`。不向 turn/start 或泛型 config 发明参数；权限 profile、模型/effort、环境继承及现有安全参数保持。

报告新增 `invocation.native_launch={requested:<精确三字段>,behavior_verified:false,limitations:[...]}`。这记录请求及限制，不把 argv 请求写成行为证明。没有追加 config/read，也没有记录全局配置。

## 方法与限制

已完整读取任务卡、补充9、澄清1、R6、native-launch-metadata-r1、routing-native-launch-advice。复用未变上游方法和隔离合同，不重开框架规划。元数据的两个 false 回显支持参数入口，不能证明命令启动、shell具体选择或权限八项成功。既有ThreadStartParams的experimentalRawEvents字段注明内部用途；原始通知顶层形状也定向核实。一次 cat raw schema 中间被截断，未声称完整读取其全部嵌套定义；随后只投影本任务需要的顶层属性。

现有 stdout 处理先将每条通知原文写入 rpc.jsonl，再交给 observe；未知通知已经完整留存，因此没有新建遥测解析器。fake raw function_call/外层 exec 不参与计数，不生成原生 commandExecution，不补造缺失内层输出。R6 的 nullable tool_actions、mapping_complete、whole_chain_coverage、hard_limit_compliance 和 formal_comparison_eligible 语义保持。原生 child 是否继承设置、raw 是否覆盖内层调用、全链费用和控制仍 UNKNOWN。

## RED / GREEN 与回归

命令均在原工作树执行，只使用 fake transport/临时离线 fixture。

| 阶段 | 命令 | 实际结果 | 工具输出 |
|---|---|---|---|
| 原任务首轮 RED | `node --test --test-name-pattern=W28 scripts/tri-system-eval/driver.test.mjs` | exit1；2 pass / 3 fail；732.562042ms | ed7757 |
| 收到澄清1、增加额度矩阵后 RED（driver未改） | 同上 | exit1；2 pass / 4 fail；876.636083ms | bef2bd |
| 实现后定向 GREEN | 同上 | exit0；6 pass / 0 fail；888.899167ms | 1ef6be |
| 完整 driver 模块 | `node --test scripts/tri-system-eval/driver.test.mjs` | exit0；55 pass / 0 fail；20867.163917ms | 806fd5 → eab56d |

RED 实际暴露：缺启动 argv、错误形状未拒绝、没有新 invocation 记录、新额度路径仍按6验证；旧默认和 raw 留存两个对照在未修改driver时已通过。澄清1导致的预期注册额度变化单独保留第二轮RED，未掩去首次结果。

最终6组覆盖：
- 缺对象时 argv 精确保留旧值、thread 无 experimentalRawEvents、无 config/read。
- 合法配置 argv 精确匹配，fresh 两个根均请求 raw，模型/effort和权限配置相同。
- 10种错误形状/值均在输出目录创建和 spawn 前拒绝。
- 新配置与登记 entry 不一致先拒绝；一致后成功。
- 新/旧路径分别测试0、6、7、8、100、字符串7、null，只有新7/旧6通过；不合法组合无目录/进程副作用。
- raw 外层通知原文字段可从RPC恢复；可见计数仍1、完整计数仍null、未映射hook仍保留、engine EIO原错不丢，INVALID与UNKNOWN/false均保持。

改动涉及公共试次启动和注册，故运行本模块全量回归；原49项全部保留并通过，含取消/终态、工具预算、进程组清理、fresh家庭、权限门禁、基础设施INVALID与合法候选失败区别。未重跑其它模块或全仓。直接与root R6比较的diff退出1表示预期差异（3d388a），不是验证失败。

## 授权、时间与成本

实际thread `01a0fcca-6e8c-7833-ba45-f39e6992f11b`；新实际turn `01a0feb1-d106-73b0-825e-8e77ba116c2d`；read_thread startedAt=1790979461，首shell观察1790979472.378474。报告写入 1790979835.540377（2026-10-03T06:23:55.540377+08:00），距起点 374.540 秒。澄清1在同turn内执行，没有重置时间或资源。保守调用人工计数（functions wrapper+内部tools及写后核验）约30，连同shell内程序计数上界40，低于60；不是平台认证账单。模型usage/金额未提供，UNKNOWN，不报0。未到25分钟或80k观察token上限；精确token计费由root按实际turn收取。

0真实模型/探针/新app-server会话/网络/新Agent/新thread/全局修改/权限扩张/commit/push；离线fake进程不冒充原生行为。没有读取private/archives、全局凭据、环境变量值或shell快照。现有源代码的原始环境继承保持，不输出其内容。工作29/review26/总55按补充9，不自行续加建设。

## 输入身份与待办

- W28卡：2ba578c42bfa17685935133f82ba0127d37263b6ca866653e97fb9c1920b03f1
- 补充9：1e884bb8f68d0f615bb790384e426cfe6ba3fe680354fce388ba3c13bea3a3ca
- 澄清1：b4b86825249d76c870b5dece3283223bf293982f802ada736defd34bcac0d4bf
- R6：b79ad202691866422421c9255df424d6082cca9d3a542800837bc7d8d7479156
- metadata-r1：9b8b217eabaf687f722402e6b2d6388bb11f8b6f7156dd714d7ae9870cbfab1d
- N04 advice：f262a9c21c714857e561a1cdcab6b715feb964b61424b38c3eb01d70a31693b3

已解决本轮发现的6/7接入冲突，没有擅自降低判据。root按最终hash收取，W29联测，再按补充9执行就绪非作者检查和机械登记；本报告不能代替这些门禁。P01—P06失败与成本保留，P07尚未由本owner写入/运行，生产框架实施及统一净价值裁决仍未完成。

<!-- FILE_END: u007-native-recovery-driver-report.md -->
