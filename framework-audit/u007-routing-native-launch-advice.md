# N04：原生命令启动的最小依赖建议

**DONE_WITH_CONCERNS，仅只读建议交付。** 原生exec_command存在且已实际尝试；P06失败在unified_exec.open_session，拒绝路径未知。不能给出已验证可启动的配置，也不能认定bundled zsh或shell snapshot是根因。建议先保持当前硬权限边界，冻结“明确非登录shell、进程内关闭snapshot”的候选，再按真实参数与回执决定是否具备后续验证条件。本卡不授权或运行P07，不是独立J票，也不是三模块主体落地。

## 已证事实及证据等级

完整读取N04任务卡（9190b3eb299ea15d68c53f4c66126da44234af9a95e09a42f9c1e4ab607ff1ec）、补充8（93b425c87b76ec8bb8ed63aca862fef361ddcf72e3eea4fc526badeaa5056a0d）、诊断md/json、dispatch-window-safe、J08及R5。复用未变前置合同；没有读取全局config.toml、凭据、环境变量值、其他会话或项目。

1. 日志54477836将call ID `exec-7b6a3da4-df07-44c5-9fe3-b30d991ab9d4`绑定到code-mode broker → exec_command → unified_exec.open_session，记录`filesystem / seatbelt / operation_not_permitted / path=unknown`。54477839/40记录外层exec中断、handler已开始，发生在预算中断之前。拒绝不能全部归因后来token上限；但没有命令argv、子进程stdout或八项权限检查结果。
2. 本试次feature日志明确shell_tool/unified_exec/unified_exec_tty/unified_exec_zsh_fork/shell_snapshot/code_mode_host=true。后取缓存只能佐证元数据，不替代当时的参数或工具注册证据。
3. P06记录仅checkpoint被driver计为1；真实至少还有一次native尝试。外层exec包装不能再当作独立成功命令重复计数。W25/W26负责修复这个观测缺口；本建议不改它们的文件，也不代签其完成。
4. R5中的W24离线材料忠实性仍有效，不因原生启动失败回滚。本人8812的conditions.mjs仍为216d21cdb7d52b57914c8cdefa2a338f7ed62fe721546f61225ea10698be84bc，test仍为4decae0bac8a40d87cde6d67457cbdac0f55b89bfa1febac31d8ed7832258920；本轮不修改代码。

## 当前允许根与候选依赖

从P06 registration精确读取native_command_permissions：`:root=deny`、`:minimal=read`、network=false，无写根；除该次condition目录外，显式只读根为：

- `/opt/homebrew/Cellar/python@3.14/3.14.5/Frameworks/Python.framework/Versions/3.14`
- `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-u007-p06-vjfi0jng/probe-runtime`
- `/Users/luca/.codex/packages/standalone/releases/0.160.0-aarch64-apple-darwin/bin`
- `/Users/luca/Library/Python/3.14/lib/python/site-packages`

`effective_probe=null`。这些是已登记权限，不是有效边界的行为证明。特别是`:minimal`的具体展开不能从本次读取的schema确认，不能因此宣称/bin/sh、动态加载器或系统库在此profile中必然可启动。

只读检查canonical包的codex-package.json：version0.160.0、target aarch64-apple-darwin、entrypoint bin/codex、resourcesDir codex-resources。实际binary与登记hash一致。

| 文件 | SHA256 | 仅元数据观察 |
|---|---|---|
| canonical包/bin/codex | 112fae7a5a1223e673c8a1791d32338f37df8b527ff1159bb8adac6c4dbf1b4b | 241555024 bytes，可执行，非symlink跳转 |
| canonical包/codex-resources/zsh/bin/zsh | d715e06edcf1661edb2e7767d65fbd1b44af505edfb217281b701f0a6ae93b15 | 754208 bytes，可执行；不在上述显式bin子树内 |
| /bin/sh | 0746cc2c2be0103c84b73eba5c6ce5e31a66fc6d8e2babd472194834880dfc49 | 101040 bytes，可执行；实际sandbox准入未知 |

`otool -L`只读元数据：bundled zsh声明/usr/lib/libiconv.2.dylib、libSystem.B.dylib、libncurses.5.4.dylib；/bin/sh声明libSystem.B.dylib。这不是动态运行完整依赖闭包，不能据此跳过dyld、PTY/管道、启动器与其它session资源的验证。未启动这些shell做实验。

root诊断还指出该次shell_snapshot路径在允许根以外；本轮没有打开快照或其正文，也没有扩大该目录权限。bundled zsh与snapshot是两个可检验候选，当前日志没有把拒绝绑定到任何一个。尤其不能把“未显式授权路径”直接写成“这就是被拒绝路径”。

## 一个可审阅的最小候选，尚非可启动登记

目标是绕开探针不需要的交互式/登录初始化及快照读取，保持同一个模型原生命令路径和当前硬读写/网络边界。下列内容仅供root冻结和审阅，本轮未应用：

**进程设置：** 原canonical app-server命令其它参数不变，仅考虑增加：
```text
--disable shell_snapshot
```
等价表达为`-c features.shell_snapshot=false`，两种只选一种。证据：该版本`app-server --help`明确--disable等价于features.<name>=false；P06实际feature记录有shell_snapshot=true。帮助只证明参数入口与声明语法；本轮没有启动app-server验证该覆盖的有效元数据或行为。不要同时关闭unified_exec、code_mode、shell_tool、全局规则/技能，也不要替换HOME/CODEX_HOME或增大token。

**原生调用形状：** 若该次原生工具的实际可用参数支持并可按原方法约束，候选为：
```json
{
  "cmd": "<冻结P06检查程序的原命令；由原argv正确shell引用生成>",
  "workdir": "<该次已登记condition绝对目录>",
  "shell": "/bin/sh",
  "login": false,
  "tty": false
}
```
不改检查脚本、目标或八项判据；绝对Python路径减少对shell配置/PATH搜索的依赖。这里的`cmd`是工具接受的命令字符串，不能误把JSON argv数组直接当shell代码。此处有意不输出一个可直接启动的新试次命令。

shell/login/tty字段来自本会话现有exec_command接口声明：shell可选binary、login控制登录模式、tty控制PTY。**这不是P06保存的native工具schema**，它在P06的具体解析、shell类型支持、是否仍由unified_exec_zsh_fork启动bundled zsh，以及login=false是否足以跳过snapshot，均未证。关闭snapshot和明确shell是一个联合候选；即使后来通过，也不能单凭联合变化认定哪个因素是唯一根因。

**关键可实施性缺口：** 既有ThreadStartParams.json与TurnStartParams.json没有专门shell/login顶层字段；ThreadStartParams.config仅为additionalProperties泛型，不能凭它发明`config.shell`、`default_shell`或其它配置键。现有材料也没有证实driver能在不改任务方法/不靠再次催促模型的前提下强制这个native调用参数。因此root应把它保留为“待核实的调用合同”，不能直接写READY。若无法取得参数支持和生效约束的准确证据，本轮最小方案即止于这项缺口；不靠新增提示反复重试。

若非登录/bin/sh仍无法避开bundled zsh，这不证明需要整个HOME：必须先取得具体拒绝路径/操作。如果未来确证仅bundled zsh本体必需，才有理由审阅对那个精确文件及被实际证实的必要依赖的只读授权；当前不提出或应用目录扩权。未知path不能作为增加runtime roots的根据。

## 观察与失败判据

任何后续行为仍需root明确方法/资源决定及非作者检查；capability已6/6，本卡没有第7次额度。当前先收取W25/W26漏记修复，再决定，而非把下面判据理解为立即运行授权。

| 后续可观察结果 | 能支持的结论 / 停止条件 |
|---|---|
| 明确报告不支持shell/login参数，或实际调用未采用约定参数 | 该候选不具可控性；不能按已采用候选解释结果，不重复催模型 |
| snapshot仍启用、选择shell/flags与冻结值不符 | 配置未生效；记录原始差异，不把失败计成冻结候选的检验 |
| 相同open_session拒绝且path仍unknown | 候选未解决启动问题；保存失败，精确依赖继续UNKNOWN，不自动扩权/加预算 |
| 得到具体被拒绝path/操作但脚本未开始 | 更新最小依赖假设；仍不是八项权限检查通过 |
| native脚本stdout/exit可核验、八项均符合原判据，产物与终态完整 | 仅支持该配置下启动及相应检查；不能推出全场景、协作/恢复或框架净收益 |
| 越界读/符号链接/写/子进程/网络检查出现未经允许的成功 | 边界FAIL；不得以“终于能执行”替代控制通过 |
| 再次token触顶或取消、参数/子调用/成本回执不全 | 保留实际失败及原分母；能力/控制仍UNKNOWN，不补造proof |

可考虑既有`ThreadStartParams.experimentalRawEvents=true`作为观察候选，但schema注明内部用途；没有证据保证它覆盖嵌套exec_command参数或缺失的item。它不是启动修复，也不能恢复P06未保存的结果。不得将外层exec与内层尝试双计为两个独立业务命令。

`CommandExecParams`是独立command/exec接口，提供argv/cwd/env/tty/permissionProfile或sandboxPolicy；它没有与native工具相同的shell/login字段。不能把它的成功当模型路径的替代证据。`ThreadShellCommandParams.command`明确注明unsandboxed/full access，更不能拿来绕过本次拒绝。本轮只读schema，未调用二者。

## 对B/T/S/I公平性与控制的影响

- 此候选是共同运行环境的启动调整，不属于B/S规则机制优化。若以后用于比较，必须按同一精确配置、binary/profile与计费口径应用于所有条件，保留全部P01—P06失败，不与旧环境结果混作无差异对照。
- /bin/sh非登录且关闭snapshot可能失去登录脚本提供的PATH、变量、别名/函数。这是候选的实质环境变化，不能宣称“原生能力完全无损”。绝对Python的有界P06脚本较适合检验该变化，但不能据此保证B/S其它skill命令仍忠实或所有正式任务都适用。
- 全局规则/技能的加载配置不主动关闭，不修改其内容；然而没有真实验证，不能断言其最终消费不受运行环境影响。若正式用途依赖登录初始化，须按同一用途检查现有能力，不能为了隔离省事弱化T或悄悄改B/S方法。
- 现有文件/网络拒绝、原始错误、取消及费用记录全部保留。先确认可观察性，再谈命令控制；离线构造/计数修复不能充当模型行为proof。

## 来源、成本与结束边界

核心文件均在`/Users/luca/Desktop/luca_gstack/framework-audit/`：
- u007-p06-dispatch-diagnosis.md：42ba61a21dde9affc282ac80b7bdcb2f35c9faf8744b6e87f352517da09282c8
- u007-p06-dispatch-diagnosis.json：562f5c3ab4b9fc437c82eee994c188907b901ebf523fd286c521412e16ba50c6
- u007-p06-dispatch-window-safe.json：7229aa71bf680caae650cc687fdde075ee63ce66487b8e7a8c20dd9519f7cb98
- u007-readiness-review-r4.md（J08）：88944193bf1e1fcea7c6ea45330e2a9cb6dedfdda9743435b61de156a9de931d
- u007-root-integration-r5.json：5c0f67466637b74e95f337ca2a1dd922b7902c2bd688f6de63db18fc1ee6de50
- u007-p06-registration.json：dd236e2f20fd843dd88f22282b9f7598c11efa02005b1eb811a6000afc88d45e
- u007-p06-tool-config-safe.json：4d46cf002661fa4df0a0a2b3d22a7eb0f636d913426724cd030fe4d66d0bfd0d

schema根：`/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-u007-protocol-eh1f4k95/v2/`。
ThreadStartParams SHA80a40a7fac15b4bf70efb7f893fb353acc0a0d30c68f54aee4f01923deca85de；TurnStartParams SHA07771223642e1b61bd9aac0069fc0f98143a1c047724ca02c7ceb13653442738。schema属性按相关字段读取，不宣称全协议实现已读。检查metadata/help/otool退出均0；一次相关schema定义搜索无结果不构成支持证据。

工具证据：de2924授权、baa1f6诊断窗口、0c1299 J08/R5、b8b090允许根、3500af包/库metadata、749c89 help、04484c/d8c0d9 schema、42e242摘要。一次cat既有脱敏logs-safe输出过大并截断，含本次已公开probe任务的重复正文；未将截断当完整语义读取证明，也未扩读原始全局config或其它会话。后续只取白名单字段；本报告不复制大段提示或日志正文。主要结论依据完整短诊断窗口和明确metadata。

N04是原owner只读建议，不自称独立J。只新增本报告；无代码/配置修改、测试/RED-GREEN、sandbox/native-command实验、模型、probe、网络、新Agent或app-server会话（仅--help退出）。首观察epoch1790977455.60909；报告写入前epoch 1790977917.343518，已观察461.734秒。保守工具动作上界40，包含functions包装与最终报告/读回；已有工具报告original_token_count合计约5.33万（包括截断未显示），不是模型计费usage，总usage/金额UNKNOWN，未声称成本为零。当前turn ID未由可用工具提供，记UNKNOWN，由root按真实聊天记录单独计N04建议调用。

补充8总额52、work26/review-advice26及capability6/6保持；本报告不扩大范围/预算。停止于已给出最小可证伪候选及精确待证点，不继续搜索全盘、模型指令、快照或敏感配置。主体模块实现、联合验收及最终提交推送仍由原三owner/root按后续有效证据收口，未宣称完成。

<!-- FILE_END: u007-routing-native-launch-advice.md -->
