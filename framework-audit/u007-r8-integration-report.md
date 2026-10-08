# W32 R8 集成回放

状态：DONE_WITH_CONCERNS。限定离线建设完成；整体资格仍FAIL，待root收取与非作者验收。

只改9a9a工作树 `scripts/tri-system-eval/integration.test.mjs`，另交 `u007-r8-runtime-obligations.md`。原protocol pair及root R7七文件字节未变。

同一最终测试字节：R7 RED 0/3、退出1；冻结W31定向GREEN 3/3、退出0；唯一一次完整集成回归38/38、退出0。耗时分别6.199、6.196、46.036秒；每次前后依赖hash一致。

测试SHA256 `80bed880d8f71d14cd77b411f29d872e3d6bf091693d53983d2b3b37e435e658`。
W31 driver SHA256 `1bf9c49969f5ca91591d82c18b29b117c39b6925598b4142ce61b67508144a82`。

断言覆盖wrapper exit1完整输出、两个dynamic去重、hook不强配、nullable/UNKNOWN/formal=false、累计61934与driver实际发起并确认interrupt、缺产物不完成；伪造JSON不提升认证或权限、非结构化输出保留、重复不双记、外来/过期transport身份拒绝。

首次GREEN 2/3：测试过早注入外来事件，driver正确fail-fast，后续合法callback被拒。仅调整异常注入到两合法操作之后，并增加两种拒绝错误断言；未放松字段或计数要求。随后以最终字节重跑RED再GREEN，首次日志保留为*-first。最终RED三项均由R7缺少新增raw字段产生。

真driver+conditions+case-protocol，仅stdio peer为fake。回放只映射transport身份和case_read路径，dynamic响应来自真engine；不执行任何日志字符串，不重跑P07。61934是回放用量，不是本会话实际usage。

缺证表覆盖公开D01—D06和共同合同，逐项区分child身份/权限/资源/返回/停止、fresh状态/最新更正/已完成写账连续、普通原生边界；区分U007必要运行资格与U008效果、U012迁移回退。未删必要用途，未新增runner/协议/检查项。

证据目录：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w32-evidence-x1k4e5ba`。`evidence-index.json`含全部输入、代码diff、每次tap/json精确hash与命令/环境/真实退出；`red.tap`、`green-targeted.tap`、`green-regression.tap`为最终证据。定向命令为 `node --test --test-name-pattern=W32: scripts/tri-system-eval/integration.test.mjs`；回归去掉pattern；module root精确值见各json。

资源：23:31:02 UTC开始，23:45:25 UTC结束，14.38分钟；保守工具动作约60/60（含恢复读取、封装及一次shell引号错误）。实际模型usage未知；工具长输出有截断，未伪报精确token。0新模型/原生app-server/网络/Agent/提交推送。作者离线成功不证明原生权限、整链覆盖或正式可比较；不释放P08或生产切换。

<!-- FILE_END: u007-r8-integration-report.md -->
