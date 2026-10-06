# W23 Context：有界集成反例、fixture 迁移与共同开销分析

状态：DONE_WITH_CONCERNS，仅限本次W23有界交付。原RED已保留；收到root指定W22 driver后，真实三模块加fake transport的完整GREEN为15/15、退出0，运行前后身份无漂移。本文是同一实际turn的N03→W23接续记录，未重置资源。J05 FAIL永久保留，不能据作者离线测试声称正式就绪；原框架全生命周期目标未完成。

## 授权、范围与已交付内容

主协调任务 `u007-context-bounded-repair-task.md` SHA256 `793a9be020d0be4616a3f7c19d8f5d62ea7a067ea025489a2ad377fd53c27002`，绑定补充6 `4238376c4138210fd992af1fc98447cae18e16fece78abc6aabda5f4c4e1ab9a`。已全文读取任务、补充1—6及R3；J05真实票/envelope、共同合同和v4/Context pack沿用N03同版本完整读取。总工作人员上限52不增，准备/建议分配23+29；行为144、探针6、预留8与各run上限不变。本次不启动模型、探针、Agent、网络或发布，不改global/生产/framework/冻结案例/private。

只编辑自有 `/Users/luca/.codex/worktrees/9a9a/luca_gstack/scripts/tri-system-eval/integration.test.mjs`。case-protocol pair与当前R3一致，没有本模块实现原因需要改动，保持原字节。driver由W22负责，conditions由W21负责，root工作树只读；没有代改他人实现。

本地三个自有文件原身份与R3相同，目录原为untracked，未覆盖陌生变更。本地没有driver/conditions；通过测试现有 `U007_MODULE_ROOT` 选择当前真实相邻三模块，仅注入 fake stdio transport，没有runtime、conditions或loadModules stub。修改前integration原字节备份为：

`/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w23-backup-6cd0udmw/integration.test.mjs`

原SHA256 `cf43047b371b8cecfa7646d3069d3807a4f86c7d912afa5a021245e82068105e`；当前自有integration SHA256 `fa583ca373a60d32e7172baec7690402e67e7e9d4ae3720a13a371dacabd3b57`。

主要变更：

- 正式development fixtures默认显式绑定 fake 权限/profile、版本、driver hash及proof证据。proof文件逐条标记 `FAKE-ONLY`、`fake_transport_only/no_live_authority`，仅由注入的fake transport消费；ACCEPTED形状仅测试消费者绑定，绝非真实J或root批准。
- fake initialize明确回显 `tri_system_eval/0.0.0-offline`。原来的未验证probe改为显式 `permissions:'unverified', stage:'probe'`，保留不合格状态。
- 新增development/hidden各一条“整段权限对象缺失”的启动前拒绝反例；不是通过让fake回调主动报错冒充入口拒绝。
- 新增真实临时文件OS权限反例：先完成合法copy，再由测试宿主将自己的临时input chmod000；真实case_read得到EACCES，finally恢复0600，正常终态不能冲掉engine INVALID。未伪造engine返回值；不在用户文件或生产目录改权限。
- 新增候选漏交反例：早到terminal产生INCOMPLETE_PROTOCOL、无产物但engine非invalid；质量失败仍保留为可评分的RECORDED，不能一律算基础设施无效。已有越权读、错误retry、child越权控制同样不升级为INVALID。
- 新增已登记但无有效proof的fake probe依然INVALID_RUN。保留D05失败/重试、事件/更正接缝、精确checkpoint、receipt、child/fresh及旧family终态语义。

## RED 与限定检查的真实结果

测试运行基线为root R3真实三模块：

|模块|当前RED基线SHA256|
|---|---|
|driver.mjs|8b6152faeaf1cb29db7e9e32493939f37d7a022ec4eb34f3d2f06fd9e0a25dee|
|conditions.mjs|211c7d3530ccff80b589cb8f152e2f916c0a21d95c54d24755d26b5bde2cdf2f|
|case-protocol.mjs|ce9a1b6c40d435a34813538f27deca5468f5a9ee38f35c2a165dd0f9e84a86e8|
|case-protocol.test.mjs（未改、未重跑）|b668c47cfb89cf92b820b3c46cc8574b71c555f2565963a10040fa7f33f966af|

两次命令均在9a9a工作树，环境为：

```sh
U007_MODULE_ROOT=/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval
U007_SOURCE_MANIFEST=/Users/luca/Desktop/luca_gstack/framework-audit/u002-source-manifest.json
```

1. `node --test --test-name-pattern=J05: scripts/tri-system-eval/integration.test.mjs`
   - 真实Node退出1，0通过/3失败，TAP 6151.490083ms，宿主计时6.189368秒。
   - development/hidden均为 `Missing expected rejection`；底层实际运行了合法fake脚本，不是fixture错误。
   - EACCES：engine.status=INVALID_RUN、invalid_run=true、protocol_errors含EACCES、错误receipt存在，而top=COMPLETED；断言精确失败于状态传播。
2. `node --test '--test-name-pattern=^(?!J05:)' scripts/tri-system-eval/integration.test.mjs`
   - 真实Node退出1，12通过/3失败，0跳过，TAP 27636.864625ms，宿主计时27.675278秒。
   - 这个负向pattern没有达到排除J05的意图，实际跑了全部15项；据实际TAP记完整结果，不称“12/12独立调用通过”。额外重复的三条RED成本保留，不再重试筛选。
   - 其余12项真实通过，包括B/S原字节依赖可达、T/I材料、未来/证据拒绝、无proof拒绝、无效probe、候选漏交、依赖失败重试、child控制和fresh终态/历史保留。均是离线fake transport，B/S通过不证明真实模型启动或技能消费。

上述命令由Python捕获输出并落证，Python包装进程退出0不等于Node通过；以记录的Node退出1为准。证据目录与备份同目录：

|证据|SHA256 / 用途|
|---|---|
|red.tap|3b53f966505ae2ad6a3d07cccfaa7fc011f4f678642a3efd0eaa13fb993788e3|
|red.json|实际命令、环境、Node退出、耗时、source/test/log身份；未把包装退出混成测试通过|
|baseline-controls.tap|cfd17b08e07a01ef5eeb484420d73721ce142ceb459ea7a0b7c16e44dfee0e6a|
|baseline-controls.json|第二次实际命令、退出、耗时及log身份|

**GREEN已执行。** root在同turn明确提供W22 driver身份 `ce5372b72266a8c99edd2c1b0a91f555cf34e99e04033ff7918a9d022550659f`，收取到同一f351模块目录；conditions/protocol仍为上表身份。按相同环境运行 `node --test scripts/tri-system-eval/integration.test.mjs`，2026-10-02 20:12:26.010545—20:12:49.719972 UTC，宿主23.708533秒，TAP23672.606875ms：**15通过、0失败、0跳过，Node退出0**。运行前后全部三个模块SHA均等于root提供值；自有integration仍为fa583ca…，RED→GREEN未改测试断言。

- development/hidden缺整个对象时在fake transport启动前拒绝，transcript长度0。
- 真实case_read EACCES留下protocol错误和错误receipt，engine与top均INVALID_RUN；engine final证据及result.json与返回对象一致。
- 候选漏交仍INCOMPLETE_PROTOCOL/RECORDED且invalid_run=false、无artifact；既有被拒请求、错误retry与child越权不被洗成基础设施无效。
- 其余材料、事件、依赖失败及恢复检查全部保留通过；这是当前条件版本下的离线交接证据，非W21未来变更的预先验收。

同一证据目录中 `green.tap` SHA256为 `bc8bd5c5bfada966218eb8d36acc9e432a95f47ad6832582d99025e18c99bdb0`，`green.json`记录命令、实际退出、开始/结束、前后身份与test/log hash。CLI真实非零路径仍由W22的driver范围负责；本模块验证真实engine→driver及落盘result，不以静态CLI谓词冒充CLI执行。root转述W22模块42/42不并入本模块15项样本，也不代替独立复审。

## 共同开销：限定分析，不实施合并

只读解析公开开发包 `u004-cases/public/developer-cases.json`，SHA256 `8b0d8fd82591ce7f479c17f283a686af109452436c2e61e3a39c7e27d845953c` 的checkpoint/material-release/events/recovery字段，没有读取答案或hidden/private。协议 `initialMessage()`先enter(request_delivered)，checkpoint推进会释放材料、投放事件，并在下一动作前要求ack。四工具schema、公共状态和回执由共同设施提供，不是I独有能力或成本。

|可供root/非作者审查的最小候选|即使将来减少握手仍须保留的内容|不能合并/删读的反例与限制|
|---|---|---|
|已由原生root发现加载的同一AGENTS，避免再次case_read全文|规范路径与原字节hash；本次实际原生加载证据、适用范围和生效顺序；完整读取义务或等价实际交付证据；每条件对称处理，保留实际read/transport/semantic未知的层级。|只有instruction path或文件可达不证明加载。不同/嵌套owner、陈旧版本、完整读合同尚未履行、source drift、fresh后交付不确定时不能删读。driver现有conditionMessage已仅传路径，没有再次拼正文；本测试begin再读AGENTS是fake脚本选择，不代表driver强迫真实候选重复读，更不能归因全部19100输入。|
|request_delivered与inputs_delivered之间的纯只读往返有可能减少|两个逻辑节点、顺序、初始外层权限、各材料stage/hash、事件source/object/scope/effective_from、失败/回执和在首次效果前的确认。任何transport打包都不能把未来材料提前或把ack当权限。|D03在inputs有capability_fact；D04在inputs有untrusted_reference。合并成无ack的一包并直接进入工作会丢失能力限制/不可信来源边界。D01/02此处无事件仅支持“候选可分析”，不是允许修改冻结四节点。|
|inputs_delivered与work_ready减少空往返的可能性|输入阶段完成、所有待ack事件消耗点、work_ready的事件触发、写阶段及依赖barrier；原始首次效果与失败请求必须可区分。|D05的失败依赖在work_ready投放，错误写即使被barrier拦截仍应记候选错误。提前当作有效依赖、隐藏failed exit2、跳retry令牌/次数/结果节点均不合法。不能为减少RPC删掉评分所需的候选判断。|
|重复publicState/receipt文本的传输开销可供量化|事件ID与原文权威关系、当前权限与revokes/supersedes、stage/next checkpoint、可用材料、实际响应hash/字节/完整范围、失败及未知。|state随事件/写入/恢复变化，不能以旧state替代；合成试验也必须保留语义撤销待独立判定，不能将机器无法解析的撤销当无效题或全局停工。本次无token归因，不设计压缩协议。|
|恢复阶段不作为握手合并对象|saved artifact实际path+hash、不可变checkpoint、旧root/child真实终态、失败历史、新root登记、resume payload、最新更正及人类选择。|D06在resume_start释放v2与未验证副本，并投放E1更正/E2漂移；E3只在decision_resolved解决选择。把request/resume/choice折成默认回答会提前权限或混淆版本。公开D06没有撤销，不能据此宣称所有撤销无风险。|

本次不修改任何mandatory checkpoint、评分判据、case/事件时序或协议合并，不关原生能力、不改MCP配置、不抵扣公共开销。P05首次19100输入与累计59541不是可直接减掉的“握手成本”；精确prompt/token分摊和总成本改进UNKNOWN。root与非作者审阅若认为某项值得推进，仍须其明确的后续决定及现有预算/公平门禁，不由本报告签发。

## 成本、时钟与未完成义务

N03证据建议已经完成并保留：`u011-context-evidence-limits.md` 全14 USE表；摘要885字符。收到W23后只加授权时点注记，未继续扩写泛报告。其既有19次左右底层调用和全部token/协调成本纳入当前turn。首读前精确时钟缺失，首读后首次为2026-10-02 19:49:23 UTC；W23卡读后20:02:35 UTC，RED/限定检查收齐20:07:41 UTC。当前会话未结束后另开turn；平台未向模型提供可独立核验的当前turn ID，任务预期 `01a0fe29-df24-7b43-848e-7aeadf375c4a` 仅作预期，由root核实，不能冒充实际读取值。

本次共三次离线Node调用，宿主累计约57.573秒；不是行为池run，真实模型调用/探针均0。为等待root精确交接，另一次60秒等待被消息在51.6238秒中断，等待成本保留。单轮45分钟/90保守动作/120000观察token不清零；前段精确计数在压缩接续记录中不完备，完整token/金额UNKNOWN，不能伪造精确余量。交付收尾预计累计约86个保守动作（底层调用和functions包装均计，早段为重建近似），停止扩展检查；不是可独立核验的精确总账。未以shell复合输出掩盖Node失败。

已闭合本卡两项离线跨模块缺陷反例和fixture迁移；未改case-protocol pair、未改协议语义。剩余：root收取自有integration、合并W21最终条件版本并按实际变更做必要联测、非作者复审；真实命令读边界、父子全账/清理、入口成本资格与B可用性；U008比较、U009反驳、U010裁决/终版复验、U011统一价值结论、任何拟变路径的U012迁移/回退；然后三个原模块实施、统一验收、正常提交推送。当前离线测试不能放行P06、正式比较或生产替换，不能称整个用户目标完成。

最终落盘核查：2026-10-02T20:14:28.182628+00:00。原始备份对比patch保存在上述证据目录 `integration.diff`，SHA256 `c2462c02ba258b7a64727b55b96f1270cae65320f02fb4e2237b2c6a3558113e`；当前integration及未改protocol pair身份复核通过。

<!-- FILE_END: u007-context-bounded-repair-report.md -->
