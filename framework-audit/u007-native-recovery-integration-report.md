# W29：启动恢复设置的跨模块验证

状态：DONE_WITH_CONCERNS，仅限本次W29有界交付。R6的3通过/13失败RED保留；root冻结W28后，**同一最终测试字节定向GREEN16/16通过、随后唯一一次完整集成回归35/35通过，真实Node退出均0**，冻结七文件前后无漂移。本次不是P07登记/运行、原生权限证明、独立审查或框架主体落地。

## 合同与范围

完整读取任务 `u007-native-recovery-integration-task.md`（SHA256 `f354adc69a377fff1f581c6f4a7a6652ba96ad00557b82910c8dea4c96726b60`）、补充9（`1e884bb8f68d0f615bb790384e426cfe6ba3fe680354fce388ba3c13bea3a3ca`）、在途澄清1、R6身份、native-launch-metadata-r1和routing-native-launch-advice。复用未变启动/方法合同；未重开P06全日志或全局配置。本轮首次时钟2026-10-02 22:17:51 UTC，独立实际turn，25分钟/60保守动作/80000观察token，不重置在途澄清前成本。

共同新字段只有entry.native_launch={allow_login_shell:false,shell_snapshot:false,experimental_raw_events:true}。新字段精确合法时登记限额7，省略旧路径仍6；错配和8拒绝。P07专用60000预算不改正式simple40000；本轮只用小型离线fixture，不签发任何真实probe。J09对R6局部修复接受与root进程元数据两个false均不是启动成功或边界证明。

仅编辑 `/Users/luca/.codex/worktrees/9a9a/luca_gstack/scripts/tri-system-eval/integration.test.mjs`。自有integration原hash与R6的 `537ab63bf691b994f01768340caab4e242b31933495206be6783d93cbebeffc8`一致；原字节备份 `integration.r6.test.mjs`。case-protocol pair不改；W28 driver/其他owner/f351均只读。只注入fake stdio transport，driver/conditions/case-protocol为真实模块，没有复制observer/runtime，没有新模型、app-server、原生命令probe、联网、Agent、全局权限/配置、生产修改或提交推送。

## 验证内容

- 合法、明确登记的unverified fake probe必须仅增加两个本进程设置，argv无额外键/权限/环境覆盖；原profile精确相等且仍deny根、network=false。shell_snapshot接受官方等价的`--disable shell_snapshot`或`-c features.shell_snapshot=false`，不接受两者重复；allow_login_shell必须false。每次thread/start必须experimentalRawEvents=true；旧路径仍无此字段，不能调用config/read。
- raw function_call重复与code-mode外层custom_tool_call原样保存在RPC；对应hook/item/dynamic callback混合时只记可见逻辑操作，不把raw或wrapper加作收费动作。缺native item时，raw事件不能补成成功结果或消除未映射缺口。
- mapped/unmapped/预算中断三条路径分别保留native exit2候选失败、INCOMPLETE_PROTOCOL、UNKNOWN边界、nullable总计数、原OBSERVED_TOKEN_BUDGET和确认中断。已交付输入原字节可见，未完成阶段和无产物保持真实。
- 七类非法shape（null/空/缺字段/login true/snapshot true/raw false/额外permission字段）必须在spawn和case目录创建前拒绝。负例登记保留6以暴露R6忽略shape，不能让R6因新额度7偶然提前失败掩盖问题。
- 登记entry漂移、新设置配6、旧路径配7、新旧配8均拒绝；旧合法6由原集成probe覆盖，新合法7由本轮合成probe覆盖。
- 对原fresh回归再增加新launch变体，核初始与恢复新根的raw开关，旧root/child终态、保存checkpoint、失败历史和权限相同；不改任何case stage协议。

raw envelope只定向读取已有0.160.0生成的 `RawResponseItemCompletedNotification.json` 顶层及ResponseItem的function_call/custom_tool_call分支；没有启动app-server生成新schema，也不把schema声明当本机raw实际覆盖证明。测试sourcePath与命令内容均为合成标记，不执行对应hook或命令。

## RED版本、命令与结果

证据目录：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w29-evidence-4c20_1e6`。

|R6真实模块|SHA256|
|---|---|
|driver.mjs|67c76f86f5614d8c79ec49f4007391eebf94a6d932003036c997223c95ea8d66|
|conditions.mjs|216d21cdb7d52b57914c8cdefa2a338f7ed62fe721546f61225ea10698be84bc|
|case-protocol.mjs|ce9a1b6c40d435a34813538f27deca5468f5a9ee38f35c2a165dd0f9e84a86e8|

执行前后R6全部七文件身份一致。当前测试SHA256 `4e0852c69944bcc869f666d306801bcc6cb479f2e4e434425abe802855ee6475`。

在9a9a执行：

```sh
U007_MODULE_ROOT=/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval U007_SOURCE_MANIFEST=/Users/luca/Desktop/luca_gstack/framework-audit/u002-source-manifest-active-rules-v1.json node --test --test-name-pattern=W29: scripts/tri-system-eval/integration.test.mjs
```

22:22:20.438767—22:22:22.661999 UTC，宿主2.222182秒、TAP2186.601375ms；真实Node退出1，16项=3通过/13失败/0跳过。合法新7路径被旧硬编码6拒绝；七类非法shape及新设置配6未在入口reject；漂移用例在R6先遭旧限额检查而非目标entry检查。三个已支持的拒绝（旧7、新8、旧8）通过。新launch的argv/raw/fresh尚未在R6走通，不能把它们记通过；这是启动接口尚未支持的RED，不是实际模型能力失败。

`red.tap` SHA256 `d8fd1f164ff64c8188e3f452ba96fc776ebca6444b92b1ef05aef6e04508e48b`；`red.json`记录命令/环境/实际退出、时钟、源前后hash及测试hash。Python捕获包装退出0不是Node通过。原备份和失败日志不覆盖。等待root稳定W28交接，不读/改他人正在写的版本；同一最终测试字节先RED再GREEN，若需接口调整将保留理由并复验旧R6。

## GREEN、一次回归与最终交接

root提供 `u007-w28-integration-candidate.json`（SHA256 `0005306225d5f0c77f2a0d9b46475a92c40cf0944d2fde4f1b66d919de9ec017`），本轮完整读记录并核全部七文件及source manifest。测试组合为专属临时目录：

`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w28-frozen-candidate-lal_26gp`

driver SHA256 `c6db8f7d4612db1ce764159b5f8630dd9eebb9882906d4f3c66c66059d16abe0`，driver.test `b85bc427ebd9d7b8a29e248ee0c3520db946ae42bb4a8047a8c68136c5ace90e`，conditions/protocol pair仍为R6。源清单SHA256 `53cf8e61a3a1e0232ed3a3f638dc5698651fa0dad5d39f62629573ffc294f136`。临时目录自带integration是旧R6；实际执行的是9a9a最终integration，SHA256 **`4e0852c69944bcc869f666d306801bcc6cb479f2e4e434425abe802855ee6475`**。二者不混称，也没有将文件复制进root。

两次GREEN均将上述命令的U007_MODULE_ROOT改为该专属目录，source manifest不变，cwd仍9a9a：

|执行|结果|实际时钟/耗时|日志SHA256|
|---|---|---|---|
|`node --test --test-name-pattern=W29: scripts/tri-system-eval/integration.test.mjs`|16通过、0失败、0跳过；Node退出0|22:25:23.288277—22:25:31.516412 UTC；宿主8.227134秒、TAP8192.030167ms|`green-targeted.tap`：`380a2a8b255e507368b45ccbad3a41fecf6baeee3c4b7a774ff59229d149e2e7`|
|`node --test scripts/tri-system-eval/integration.test.mjs`|35通过、0失败、0跳过；Node退出0；只跑这一次完整回归|22:25:31.517139—22:26:11.428585 UTC；宿主39.910270秒、TAP39873.906916ms|`green-regression.tap`：`e4120374e1b6e1cccaab960b59a72dff3d7f49919b849520d241724ad7e7f9b2`|

相应同名json保存完整命令、env、实际Node退出、开始/结束、全部七文件前后hash及test/log身份；全部前后相等。原RED、定向GREEN、回归三个记录的test hash完全相同，未为配合W28修改或放松断言。完整TAP保留，工具展示仅略去重复的大JSON诊断，未删除原日志。W28作者定向6项只是主协调交接信息，未相加作本模块或独立验收样本。

结果限定：有限启动argv和原profile、初始/恢复thread的raw开关、非法shape/登记漂移/新旧额度错配启动前拒绝均通过；raw重复及外层wrapper被保留但不计作额外操作，raw函数调用不能补成native item或消除未映射缺口。mapped可见2、unmapped可见1且总数null；所有新launch试件effective_probe仍null，boundary保持NATIVE_BOUNDARY_UNVERIFIED、formal_comparison_eligible=false。raw覆盖真实内层调用的完整性没有被测试证明。

原19项回归保持通过，包括R6漏记与正常晚到/重复、J05权限整段缺失和真实临时I/O invalid传播、预算/取消、候选漏交、B/S材料、T/I阶段、失败重试、child控制及fresh连续性。新增fresh只是fake原生事件驱动真实三模块，不称本机真实恢复通过。新设置没有新增accepted proof；原回归沿用既有明确fake权限fixture，不签发真实批准。

## 成本与剩余边界

本turn共3次离线Node测试，宿主累计50.359586秒；为等待交接/回归两次sleep合计43.5578秒，成本保留。约36个保守工具动作（functions包装和底层调用均计，另列3个Node进程），低于60；观察token/真实usage/金额精确值UNKNOWN。首时钟至末次完整测试约8分20秒，最终报告核查时间见下，未重置25分钟上限。没有重开turn、子Agent、模型或新app-server，不利用剩余额度追加泛测试。

剩余由root单一收取本次integration与W28 pair，联合非作者检查具体P07草案后，才可机械登记一次运行。P07未由本owner登记、启动或判定通过；真实open_session恢复、既定八项控制/loader、原生读取/恢复及框架净收益仍待真实证据。whole lifecycle的生产三模块实施、统一验收及正常提交推送未完成。若一次真实恢复仍失败，按补充9精确记录并作方法裁决，不从本报告推导再试、扩权或新增预算。

最终核查：2026-10-02T22:28:37.177980+00:00，上海时间2026-10-03T06:28:37.177980+08:00。本报告中的UTC为证据时钟。原始差异 `integration.diff` SHA256 `a5618d29b6a32206350d7ada0413bd3131410f9359f06cce835b1daea3c13490`，同证据目录保存；自有protocol pair原字节核验通过。

补充输入身份：

- u007-interface-addendum-9-clarification-1.md：`b4b86825249d76c870b5dece3283223bf293982f802ada736defd34bcac0d4bf`
- u007-root-integration-r6.json：`b79ad202691866422421c9255df424d6082cca9d3a542800837bc7d8d7479156`
- u007-native-launch-metadata-r1.json：`9b8b217eabaf687f722402e6b2d6388bb11f8b6f7156dd714d7ae9870cbfab1d`
- u007-routing-native-launch-advice.md：`f262a9c21c714857e561a1cdcab6b715feb964b61424b38c3eb01d70a31693b3`

<!-- FILE_END: u007-native-recovery-integration-report.md -->
