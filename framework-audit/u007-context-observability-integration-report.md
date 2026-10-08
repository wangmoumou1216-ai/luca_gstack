# W26：Context 可观测性跨模块验证

状态：DONE_WITH_CONCERNS，仅限W26有界交付。R5原RED保留；root冻结W25后，新增4项与既有15项集成回归合并运行 **19/19通过、Node退出0**，运行前后冻结七文件无漂移。本报告不是原生能力证明、独立复审票或框架主体落地，J08 FAIL不被作者测试改写。

## 范围与当前交付

完整读取W26任务（SHA256 `d4aa065e5c3c02a420ead766af22299e5a5599810555110797a1e1e2252af1ce`）、补充8（`93b425c87b76ec8bb8ed63aca862fef361ddcf72e3eea4fc526badeaa5056a0d`）、P06脱敏dispatch diagnosis md/json/window-safe、J08票/envelope与R5身份。复用未变共同合同；仅修改9a9a自有 `scripts/tri-system-eval/integration.test.mjs`。case-protocol pair未改；driver由W25负责、conditions由其owner负责；f351只读。未读全局配置/凭据、无关项目、private或archives，没有模型/P07/联网/权限变更/子Agent/提交推送。

首次时钟2026-10-02 21:44:18 UTC，处于上次W23已最终回复之后的新实际turn，W23成本保留、不把它并成免费接续。当前turn ID未由工具提供，不猜测。单turn45分钟/90保守动作/120000观察token，未增总52或行为144/能力6及预留8。

P06证据纠正：原生exec_command确实通过code-mode分发，unified_exec.open_session遭filesystem/seatbelt/operation_not_permitted、path unknown。此事实来自root已有脱敏诊断，未据此伪造RPC缺失的命令item、stdout、八项检查成功或有效proof。hook handler完成只能证明hook记录，不是底层命令成功。模型总体能力、当前有效读边界和框架净价值仍未知，J08 FAIL保留。

## 反例与对照

使用当前真实driver、conditions、case-protocol，仅注入明确fake stdio transport；不复制observer、不注入runtime/loadModules替身。按P06实际hook envelope构造pre/post、started/completed，synthetic sourcePath为 `/offline/fixture-hooks.json`，不执行或读取该路径。动态checkpoint有独立call ID，native调用只有hook没有item/result。

1. **正常terminal的反事实路径**：额外hook调用后交付inputs checkpoint，候选直接terminal。R5返回COMPLETED、tool_actions=1，未记录观察缺口。断言应INVALID_RUN失败；未完成protocol是普通候选问题，但缺失观测是另一层基础设施问题。
2. **P06式预算中断路径**：同样事件后超合成token上限，由真实driver发interrupt，fake异步返回interrupted终态。R5仍只计1；断言额外hook调用与checkpoint至少对应2个动作失败。原OBSERVED_TOKEN_BUDGET、取消确认、已交付输入、未完成阶段及无产物均保留验证。重复累计usage不回退，测试不靠伪造计量错误制造失败。
3. **正常映射对照**：hook、native item、dynamic callback/item正确映射，动作应2；native exit2及候选漏交保持可评分RECORDED/COMPLETED，不抹成observer基础设施错误。
4. **晚到/重复对照**：hook先到，native/dynamic item在callback后、turn终态前到达，并重复hook及item通知；仍只计2。保留原始重复通知和失败，并非要求删除原始事件。没有测试终态后跨turn的非法迟到。

每条路径都核result.json等于返回report。缺口路径额外核engine_snapshot停于inputs_delivered、只有request/inputs两个checkpoint、输入字节等于冻结fixture、writes=0且output不存在、necessary_controls=NOT_EVALUATED、无commandExecution记录；原始rpc保留两组不同call ID。测试不把已交付输入称实际语义消费，也不从hook推断未知的工具参数或权限结果。

## 精确版本与RED

原integration与R5相同，SHA256 `fa583ca373a60d32e7172baec7690402e67e7e9d4ae3720a13a371dacabd3b57`。修改前备份、测试日志及本轮证据目录：

`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w26-evidence-vgwoq97p`

原备份 `integration.r5.test.mjs`；初版RED测试SHA256 `4415941c912751fe3c1658b977edea40c7761929d2300dc5d5c32d557da3014b`；最终交付测试SHA256 **`537ab63bf691b994f01768340caab4e242b31933495206be6783d93cbebeffc8`**。

|R5真实模块|SHA256|
|---|---|
|driver.mjs|ce5372b72266a8c99edd2c1b0a91f555cf34e99e04033ff7918a9d022550659f|
|conditions.mjs|216d21cdb7d52b57914c8cdefa2a338f7ed62fe721546f61225ea10698be84bc|
|case-protocol.mjs|ce9a1b6c40d435a34813538f27deca5468f5a9ee38f35c2a165dd0f9e84a86e8|

执行前后哈希一致。R5记录自身SHA256 `5c0f67466637b74e95f337ca2a1dd922b7902c2bd688f6de63db18fc1ee6de50`；当前source manifest为R5指定的 `u002-source-manifest-active-rules-v1.json`，不是原旧清单。

在9a9a运行：

```sh
U007_MODULE_ROOT=/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval U007_SOURCE_MANIFEST=/Users/luca/Desktop/luca_gstack/framework-audit/u002-source-manifest-active-rules-v1.json node --test --test-name-pattern=W26: scripts/tri-system-eval/integration.test.mjs
```

2026-10-02 21:48:38.362478—21:48:46.562524 UTC；真实Node退出1，4项=2通过/2失败/0跳过，TAP8163.769625ms，宿主8.199907秒。Python捕获包装返回0不表示Node通过。`red.tap` SHA256 `c0dd24ca4f3a856cc2dbed1d207abc361d57ccd6f2cd43a6407db9a5da4138aa`；`red.json`保存实际命令、环境、时钟、退出和前后源/test/log身份。原失败留存，不重写为提示。

## 冻结接口后的最终RED与GREEN

root明确交接 `u007-w25-integration-candidate.json`（SHA256 `9f9e0f048fe0d980652161a564f5683c1fa721b70338df9179f2943691c90d00`），全部七文件逐个核对一致；这只是临时冻结候选，不是root最终收取或发布。GREEN module root为：

`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w25-frozen-candidate-14vqcrzd`

其中driver SHA256 `67c76f86f5614d8c79ec49f4007391eebf94a6d932003036c997223c95ea8d66`，driver.test `8338cba9c2dd3eced9798635076243a50f6e75ca12ff221083eaba962bf256d6`；conditions/protocol pair保持R5。实际运行的integration是9a9a最终文件，临时组合中原integration仍为R5备份身份，不混淆两者。W25作者49项模块检查仅为root转述，不并入本次19项，也未代替独立审查。

**计数断言校正有明确方法理由，非削弱缺口检测：** 初版将“额外hook关联活动+checkpoint”直接断为总数2。root冻结接口明确：缺少item时不可擅自判定code-mode包装与内层操作的等价关系或完整账，应保留visible=1而把总数置null。最终断言改为tool_actions=null、visible_tool_actions=1、mapping_complete=false、whole_chain_coverage与hard_limit_compliance均UNKNOWN、formal_comparison_eligible=false；精确核唯一unmapped call的thread/turn/call ID、两条pre/post hook-run ID、全部8个原始hook事件及错误/limitation。原INVALID_RUN、取消、失败和输入/产物断言保留。正常对照增加对应可见计数2、mapping_complete=true、无unmapped、8/16原始事件保留，以及即使映射完整也不宣称全链/硬上限/正式可比。

|调用|真实结果|时钟/耗时|原始证据SHA256|
|---|---|---|---|
|最终断言在R5：同上`--test-name-pattern=W26:`|退出1，0/4通过。前两条仍为实际漏记终态/计数失败；后两条因R5没有新增visible/observability字段失败，不宣称原正常映射行为退化。|21:54:17.486431—21:54:25.706960 UTC；宿主8.219411秒，TAP8183.491667ms|`red-final.tap` = `ad93c0cd86d5898c51ca9f5f4f7ad8fc5181b2c77d8932d242f29ece95b51cc7`|
|冻结W25完整集成：`node --test scripts/tri-system-eval/integration.test.mjs`，module root改为上述候选目录，source manifest不变|退出0，19/19通过，0失败/0跳过。4项W26与15项原回归均实际运行；没有额外独立的4项GREEN调用。|21:54:25.707859—21:54:57.496933 UTC；宿主31.788170秒，TAP31749.707583ms|`green.tap` = `5f3a04627e71c32494b457662bc6fc055b5d78be9d114a1a0aa2d1a609c29177`|

`red-final.json`、`green.json`记录全部七文件前后身份、实际test hash、环境、退出及耗时；前后无漂移。同一最终测试字节先RED后GREEN，GREEN之后未再改变断言。完整TAP保存在证据目录；模型展示省略逐测试大段JSON诊断，原日志未截断或删改。

GREEN的限定意义：观察缺口被明确保留，不再把已观察1次称完整动作成本；正常item/callback和hook晚到/重复不双计；native exit2、候选漏交、预算中断原错误不被清洗。原J05权限缺对象拒绝/EACCES状态传播、B/S材料、T/I阶段、越权读、失败重试、child控制及fresh历史仍通过。没有真实命令、模型、全局hook或八项边界检查被执行；临时accepted fake proof仅服务离线消费者测试。真实seatbelt路径unknown没有因此消除。

## 读取限制与后续

J08 md SHA256 `88944193bf1e1fcea7c6ea45330e2a9cb6dedfdda9743435b61de156a9de931d`，envelope `984a72947fd877ee7197c8ac8937379abaa60604706e66aae838abd177fbcd97`。一次并行聚合显示截断；以1c2e75完整补读envelope及输入清单、390071重读driver必要区段。J08 md中的完整票与单独envelope内容一致，未声称聚合截断输出完整。

另只读已授权P06 rpc.jsonl指定61—64、67—72行核hook及dynamic形状；不输出模型指令正文、环境值或其他会话。P06 rpc身份来自J08清单 `bb34fb7c1dcaa1077d6444da9c0215d1ac448d5acd4a35a2c7b7059d7b496be2`，本次未声称重审其余全部80行。该既有RPC不能单独重建seatbelt具体路径和结果；诊断与测试各自证据边界保留。

本turn共3次离线Node测试，宿主累计48.207488秒；两次等待共68.0998秒，均保留成本；行为池run、模型、probe均0。约50个保守工具动作（含functions包装及底层调用，测试进程数另列），未到90；真实token、隐藏开销和金额UNKNOWN，不把字符数或日志bytes换算成精确token。执行范围只增加integration测试和本报告/自有临时证据，未改模型/effort、协议、他人代码或生产主体。

剩余由root单一收取本次integration和W25 driver，按实际版本做必要统一检查及非作者复审；真实原生边界和读取/恢复/成本资格、正式比较及全生命周期实施/验收/提交推送继续未完成。能力6/6已用尽，本报告不释放P07、正式比较或任何权限扩大。N04最小启动依赖建议归路由owner，本模块不重复诊断或增配。

最终落盘核查：2026-10-02T21:57:18.468606+00:00（上海时间为UTC+8）。自有integration及未改protocol pair身份复核通过。原始备份到最终文件的 `integration.diff` SHA256 `5e584469c127e5bb562786c2caa52351a92a2dfd12278ead3f9f35a201fe8ca0`，同目录保存。

<!-- FILE_END: u007-context-observability-integration-report.md -->
