# U007 orchestration / W09 构建交付

状态：DONE_WITH_CONCERNS。限定代码与离线单测已交付；真实模型、正式案例run、联网、额外Agent均为0。真实入口继续BUILD_ONLY，未声称运行就绪、跨宿主等价或净收益通过。主协调负责三模块集成、独立review和后续释放，本会话不提交/推送。

目标保持一个通用框架：按任务理解、协作、信息连续性和人类控制的共同用途衡量增量价值；优先Codex桌面/CLI，Claude只核可能改变共同判断的兼容，API表面单列。没有增加平台工程、领域技能方法或新的审批体系。

## 文件与身份

基线工作树 `/Users/luca/.codex/worktrees/71f8/luca_gstack`；HEAD `05120197073144c0f46b6fb30a192733d529cc4f`。开工git status干净（bb72bc），HEAD回执ffc2f1。代码只新增以下两文件；另写本报告，未改公共manifest/合同/其他模块/源根生产文件。

- `/Users/luca/.codex/worktrees/71f8/luca_gstack/scripts/tri-system-eval/driver.mjs` — SHA256 `f38bbed89b79f345a5a12ee7c4ee27cff0bbbc1a313e428a60d0b1ac77b3fe94`；493行。
- `/Users/luca/.codex/worktrees/71f8/luca_gstack/scripts/tri-system-eval/driver.test.mjs` — SHA256 `8f44d23052274f70933d0138675ed5210620b244e1e20f85363fc6e8c300a4c4`；347行。

完整读取并采用的任务绑定：
- `u007-orchestration-build-task.md`：`8548db9251f26c6746ee1f854838c5006f8ad0031926d9fc701cfa24944b2312`。
- `u007-implementation-contract.md`：`74c43c98dd2fc88df66c84d660c0f044deae35d7223e9a6c17b05ace22ec04a6`。
- `u007-comparison-manifest.json`：`aeb3f7391c991f9df48ef5f6fa178464124177c2fad390121beceb2adeca553f`。
- `u007-interface-addendum-1.md`：`953caf31e773b35bfc05c8993141f5d5f543b6202c30c8d6ccf7d1340073f70f`。
- `u007-interface-addendum-2.md`：`1a308a1e849f67e10f5acb9ecae5a130b93c99d069b5a8bd0d15d1ff9e7a7830`。

## 实现与接口

- 公共 `runTrial({manifestPath,caseFile,caseId,conditionId,trial,outputRoot,codexCommand='codex'})` 和必填CLI参数已实现。补充1的run/model/resources/bindings字段逐项校验，静态摘要和run请求一致、资源不超过案例simple/heavy上限，才新建独占run目录。BUILD_ONLY、空/异物/漂移身份在模型派发前拒绝。输出目录不覆盖；目标symlink拒绝，系统父路径规范化为realpath。
- 动态导入真实相邻conditions/case-protocol；离线测试通过 `createTrialRunner` 注入独立stub和本地JSON-RPC模拟进程，没有写其他owner文件。条件材料摘要按补充1全部普通文件、POSIX相对路径排序重算；源码/案例在派发前再次核身份。case正文仅交给case runtime做阶段投放，没有从answers/expected取信息或输出评分正文。
- `await createCaseRuntime`，engine收到专属空 `evidence/case-engine`，原始transport日志在父evidence目录。四个DynamicToolSpec直接取Context模块；参数不复制、不猜测、不按D编号分支。回调返回原text/isError；失败、重试、被拒请求保留。补充2的语义授权关系由候选及J判断，driver不解析revokes来猜许可。
- 唯一入口为stdio app-server，initialize→thread/start→turn/start，记录完整双向RPC、stdout/stderr、原生工具、同线程终态、实际模型/provider/effort/沙箱回显。没有baseInstructions覆盖，没有multiAgentMode假并发声明，没有关闭hooks或枚举关闭所有MCP。所有条件共同 `apps` disabled、web_search disabled、read-only/native networkAccess=false、approval never；实际工具限制效果仍须主协调probe。
- **单次规则投放**：cwd是条件根，由原生发现AGENTS；turn仅列明确规则路径和case消息，不再次复制AGENTS全文。fresh沿用同一方式。自动加载是否发生、全局规则是否仍注入，只记录回显与UNKNOWN，不凭cwd证明已采用。
- 普通checkpoint不重开线程；fresh_context须发真实turn/interrupt并同时取得RPC响应及interrupted终态，才创建新thread并调用resumeMessage。仅ack无终态拒绝恢复，原线程/失败/usage不删除；这不是compact实验。
- 整链绝对截止从runTrial入口计，fresh/RPC不重置。工具按父子线程归属，动态RPC call与native item双重投影按thread/turn/tool去重计数。token取每thread最后累计值，cache不重复相加；缺usage为null/unknown，未报道的在途token不假装可硬实时封顶。
- 超时/取消先请求interrupt并记录确认情况，再对整个进程组TERM/KILL；即使leader先退也保留最终group KILL。清理不删除证据；真实非零、未完turn、子失败、原错误均保留。异步case callback未返回时额外记UNFINISHED_CASE_CALLBACK，不把模型进程清理说成文件操作撤销。
- `COMPLETED`仅表示观察到根turn正常结束且finalize返回，不是质量/权限PASS；candidate_tool_errors、engine结果和快照交J评。未知原生shell/MCP读取范围标污染INVALID_RUN，不用文件可见替代实际读取证据。

## 实际离线验证

最终命令（工作目录为本工作树）：

```text
node --test scripts/tri-system-eval/driver.test.mjs
```

补充3后的最终回执af56ba + c5284e：exit **0**，**21 tests / 21 pass / 0 fail / 0 skipped**，约8131ms。已读全部分段输出。模拟器是Node本地子进程，不启动codex或模型；fixture为结构自造中性数据，未运行任何公共/隐藏正式题。

关键反例及真实结果：

|保护点|反例/正例|观察|
|---|---|---|
|默认释放门|BUILD_ONLY经public API及CLI调用|抛明确BUILD_ONLY；CLI exit1；未派模型|
|身份/预算|driver hash篡改、外来case、超过simple资源上限|派发前拒绝，模拟进程启动数0|
|材料/目录|材料hash漂移、输出symlink、复用run目录|漂移INVALID_RUN且有result；symlink拒绝；重复EEXIST且旧证据未覆盖|
|累计usage|同thread累计10→15→15、cached input=3|最终15，非40或43；缺usage为null|
|动态回调|错误read后合法write，native item ID与RPC call ID不同|原failure保留、success=false返回、两次动作不重复计4次|
|恢复|fresh、普通checkpoint、仅interrupt ack无终态|fresh新thread且resume一次；普通保持一个thread；无终态INVALID_RUN且不resume|
|异物/失败|重复callId、foreign turn、failed turn、错误model、transport exit7|不会二次写/假成功；非零与原stderr保留|
|子Agent与读取|子thread失败/usage、native shell读取无法核范围|独立归属；子失败不吞；未知读取污染INVALID_RUN|
|预算|超工具、超已观测token、跨fresh的1秒绝对截止|停止链，错误和未完成项保留|
|后代清理|leader在TERM后exit0，后代忽略TERM并尝试延迟写marker|最终group KILL；marker未出现；原stderr及result在cleanup后可读|
|产物≠完成|预先存在partial.json但turn超时|finalize未调用，INVALID_RUN|
|回调未完|case_write Promise未返回且deadline到达|pending client operation和UNFINISHED_CASE_CALLBACK保留|

前序测试历史没有抹去：第一次bec96b exit1，3pass/11fail，共同原因是macOS `/var`与`/private/var`的canonical路径差异（显示截断，未将其当完整单项诊断）；改为拒绝目标symlink并规范化父路径。随后523e5e+26dd6b为14/14；补动态计数后52b5f3+924640为14/14；补恢复反例后890e85+077316为15/15；补未完callback后最终16/16。正常→违规拒绝→恢复正常均通过真实边界调用，不是源码字符串测试。

`node --check`两文件曾exit0（6bcc8d、dc27e2）；最终16项测试重新加载最终两文件。`git diff --check` exit0只覆盖tracked面，不能证明新增文件；对两新增文件 `git diff --no-index --check /dev/null <file>` 无whitespace诊断，exit1来自存在新增diff（515962、0c3b28），不把1伪称0。没有跑全仓suite，也不宣称全框架未受损。

## 复用、读取边界与未证能力

- 方法参考 `scripts/run-agent-context-ab.mjs` L546–605、4070–4122、4757–4953，回执91296b；仅移用绝对截止/进程组清理/真实RPC和未知usage原则，未导入或执行旧G5矩阵。该源码SHA `195d4c18707a37f256bd855e6e7ee7502658b0972c48d54b742b6679568d4b42`，595d5f核U002一致。
- 复用上轮已读且hash未变的workflow-runner、runtime测试方法；本轮595d5f核两者与U002一致。没有运行它们、读取私有配置或安装依赖。既有plan退出、evidence-receipts、project-verification、long-session合同读证继承上轮，不伪造本轮重新全文读。
- 本机冻结schema目录按任务所给路径读取DynamicToolCall params/response、TokenUsage、ThreadStart/TurnStart、TurnInterrupt。45d9fe大输出在ThreadStartResponse定义中截断；a1e71a补所用response字段、child source/status及RPC方法。仅所需schema结构阅读，不称整个schema目录全文读；无schema生成/模型操作。public developer-cases仅补读id/complexity元数据（595d5f）。
- 使用code-hygiene模式A完成前验证；共享owner和输入合同沿用，读取该skill全文及input-mode/framework-maintenance（9a4055），运行短规则查询242dbd。没有调用Mode D独立评审，无新Agent。独立review由主协调接手。

**仍待集成/就绪复核**：真实conditions/case-protocol未在本工作树接线，本轮用stub证明接口消费；完整阶段/语义权限/产物校验归Context与J。全局/原生AGENTS注入、read-only真实边界、MCP等外部效果、子线程事件是否全回传、子usage是否已包含于parent、真实停止延迟均未获实测。未知不能记0或PASS。driver可记录/拒绝观测到的越界工具，但不能倒推已经发生的工具效果被撤销；严格运行资格须先通过原计划能力probe。异步engine API没有取消参数，在途callback只可记未完，不能承诺强撤销。跨平台Windows只调用leader kill，不声称已证明后代停止；本轮进程组反例运行于当前macOS。

**新增维护单元**：1个精确释放/材料身份边界、1个stdio RPC生命周期、1组原生/动态计量规则、1个中断/清理边界；测试stub不是第四套生产框架。共两个工程文件，无依赖新增；字数/行数不作净价值证据。新失败面是协议版本、事件先后、身份/材料漂移和不完整遥测，均需主协调真实probe及独立review。

## 资源与恢复点

本次W09一个工作调用。计时点1790962881.2765172到报告写入约19.64分钟（此前任务卡读取约几十秒），45分钟内。至报告写入40个底层工具动作（含每个批量命令、apply_patch、测试poll；不是按functions批处理算1）；连包装约61个工具消息，90以内。最终读回预计再1底层动作，实际数随交付说明。真实推理/输入输出token与金额不可观测，unknown；不声称120000预算有精确账单。没有新Agent、真实模型、正式run、网络或安装；测试只有本模块离线临时fixture，结束后清理其自有目录。

恢复点：首批两文件16/16；其后补充3修订以末节及当前文件身份为准。主协调可按上述hash收集代码，换真实上游模块做跨模块离线集成，再按原预算最小probe→独立就绪复核。当前不改变BUILD_ONLY，不提交推送，不触碰别人文件。

冻结补记：f6d27f确认工作树仅两项上述新增文件；daa40d读回报告并核两份代码hash一致、无行尾空白。当前文档恢复点已从待读回推进为已冻结待集成。含本补记共43个底层工具动作，约66个含包装工具消息；计时约20.22分钟，token/金额仍unknown。独立review及真实运行未执行。

## 同一W09续修：接口补充3

线程登记已接线：根thread/start实际响应→await registerThread→turn/start；child只由当前家族可信native thread/started source或spawnAgent receiver关系登记。登记排在动态工具调用前，支持异步返回并留pending/registered/refused及原事件依据。同ID换parent、未知parent、旧家族复活拒绝；模型文本和fixture_worker不登记。send/wait的已知peer保留原parent，不因接收消息被错误重绑。

fresh会中断并确认全部当前家族活动turn；任何child仍无终态则不resume。随后resumeMessage→新thread/start→新根登记，清除旧家族操作资格，历史线程、失败、usage保留。I条件组织限制按当前家族计，不将前次fresh已结束的child误算作新家族名额。

stub已加严格家族和登记守卫，未登记即调用会使测试失败，不再用无约束stub掩盖接线。新增五组真实边界测试：stage缺失/非法及保留、两种native child传播且合法write、child控制拒绝保留为candidate error、未知/模型自报child及伪parent/rebind拒绝、fresh全家族终止/旧child拒绝/新根继续/原失败保留。前16项继续通过，共21/21。首次补充3测试575e7f+e7068c为21/21；补原失败跨fresh断言后af56ba+c5284e再次21/21。仍没有真实模型、正式run或新增Agent。

**具体未闭合接口**：补充3明确stage=probe/development/hidden及probe_id，但“本次登记路径”的字段名和登记记录验证结构未给出。stage枚举已校验并写入report；development/hidden仍走精确binding。probe缺probe_id拒绝；有probe_id但未取得冻结登记合同则明确PROBE_REGISTRATION_CONTRACT_REQUIRED，绝不由worker发明签发/授权。该缺口已在当前会话报告主协调，需其冻结字段后补接线；不能把目前代码称probe运行就绪。此限制来自补充3的“probe必须带probe_id、本次登记路径、明确实际输入和小预算”，不是新请求用户开工批准。

补充3全文读证cc3101，SHA256 `a73d065a3169231f48e0cac954f109b377f4fa206b748358f72b52103f2dbee6`。本轮续修仍只两代码和同一报告；当前累计墙钟约25.09分钟（包含交付后等待协调期间），未增加45分钟/90动作预算。累计底层动作至本报告更新约55，含包装约86；保留少量末次读回余量。实际token/金额unknown。原报告43动作是首批冻结点，不覆盖本追加工作。
