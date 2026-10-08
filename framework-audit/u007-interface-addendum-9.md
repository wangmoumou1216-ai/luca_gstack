# U007 补充9：一次有界原生启动恢复

## 主协调决定与依据

这是root依据用户后续“全生命周期由你管理、原三个session完成实现测试review、最终验收提交推送、期间不要询问我”的授权作出的操作决定。不是J09代授权限，也不声称用户逐项批准下列技术数字。原三模块和一个通用框架不变，Codex桌面/CLI优先，必要控制、评分、隐藏隔离、保护用途及迁移责任不减。

J09已接受R6局部漏记修复；它没有修复P06的native open_session拒绝。N04对启动合同的不确定性部分由新证据消除：官方 https://learn.chatgpt.com/docs/config-file/config-reference 的 allow_login_shell 支持 false，省略login默认非登录、显式true拒绝；features.shell_snapshot也是文档化开关。本机canonical0.160.0在仅initialize/config/read的元数据会话中实际回显两个false，证据 u007-native-launch-metadata-r1.json SHA9b8b217eabaf687f722402e6b2d6388bb11f8b6f7156dd714d7ae9870cbfab1d。未启动thread/turn/命令，不能称行为成功，也没证实bundled zsh是拒绝根因。

## 唯一新增恢复范围

增加W27/W28/W29一批三owner建设：模块一准备精确一次P07合成检查包；模块二支持绑定的启动设置及原始事件请求；模块三验跨模块与旧路径。仍只评估工具，不修改生产框架。每个owner最多25分钟/60保守动作/80000观察token，无模型、原生命令探针、联网、新Agent、全局配置/trust修改。不得读private/archives、环境变量值或shell快照。三个owner不单独登记/运行P07。

共同可选entry字段为 native_launch，唯一允许值：
```json
{"allow_login_shell":false,"shell_snapshot":false,"experimental_raw_events":true}
```
缺字段保持R6原路径；出现该字段必须精确验证、绑定probe registration中的entry，禁止任意额外键、配置或permission override。仅将前两者传给自有app-server进程argv，并在各thread/start传experimentalRawEvents:true；不改全局文件、HOME/CODEX_HOME、模型/effort、权限根。初始化已声明experimentalApi。原始事件在现有RPC记录中留存；只加观测，不推断它一定包含内层call，也不把raw/hook/外层包装当额外收费或成功proof。仍保留R6的UNKNOWN/INVALID/nullable语义。驱动本身不得查询或记录完整config/read响应，避免写出无关配置秘密。

## 数量与资源的显式修订

- 工作调用26→29，review/advice26保持，总工作人员52→55，仅新增本批3个实际turn；不再从必需评分余量挪。全部旧调用和失败成本保留。本批用完后不得继续隐式追加建设。
- 额外池仍24、全计划144、开发24、隐藏96、迁移/恢复/终版保留8不变。能力上限6→7，未分配诊断最多10→9，正好为**一次**P07留位置，P01—P06仍全计。
- P07草案单次300秒/20可见动作/60000可观测累计token，外包装最多325秒后整组清理。P06首次请求已约20k、两次累计40936，40k在恢复步骤中不足；本次20k增量仅给一次能力验证，同时已有具体启动设置变化，不是只加token重试。此处不改正式简单/重任务额度、模型或quality标准，也不保证完整动作硬限；全链未知必须继续如实报告。
- review当前实际12/26（J01—09与N01/N02/N04），剩14不声称必然足够覆盖全开发/隐藏及最终阶段。A真实结果回顾时必须重算剩余必要工作、可合批阅读容量及资源；本补充不自动扩未来池或删必需评分。最终生产实施另按已确认具体方案派发，不用这批评估代码冒称落地。

## 释放及失败边界

这次决定立即允许上述代码/静态准备/离线验证，**不是P07已登记或已启动**。三owner交付→root精确收取→既有U007就绪非作者检查具体草案→root机械登记一次才可运行。新配置和原始事件观察一起改变时，仅作复合恢复验证，不宣称单因素根因。所有条件未来采用同一冻结启动设置才可配对；正式使用影响仍需行为证据。

若此次真实尝试仍无法取得绑定的命令输出、既定八项控制/规则loader、协议与终态证据，不自动再试或放宽文件/网络权限。保持精确失败，并作方法可行性裁决；不得把运行环境失败算成框架或T能力低下。若成功，同样只证明该配置与适用检查，不直接放行全部正式任务。原始事件并不预先解决全链计数或child/fresh的适用证明。

<!-- FILE_END: u007-interface-addendum-9.md -->
