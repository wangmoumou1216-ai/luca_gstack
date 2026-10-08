# U007 Context 实现交付 — W10

状态：**DONE_WITH_CONCERNS — 限定代码与离线单测已交付，BUILD_ONLY；集成/独立review/真实模型未放行。**

## 共同目的与范围

luca_gstack 是 Codex 桌面、Codex CLI 与 Claude Code CLI 共用的一个框架。共同用途是理解任务、组织执行、信息连续性与必要人控；框架增量须对规则/协作/维护成本负责。Codex 桌面和 CLI 优先校准与验证；Claude 只做会改变共同判断的兼容检查。领域技能标准不由本模块扩写，也不拆成多套平台工程。完整继承 `u007-context-build-task.md` 与 `u007-implementation-contract.md` 的零节；本文是本次代码交付，不替代共同计划/授权。

独占工作树 `/Users/luca/.codex/worktrees/9a9a/luca_gstack`；实际HEAD `05120197073144c0f46b6fb30a192733d529cc4f`，开工时tracked/untracked clean。只新增下列两个文件及本文；最后status仅列两份新源码。未提交、推送、修改主协调或其他owner文件、生产源、全局配置、记忆、framework模板。无联网、安装、额外Agent、真实模型或正式run。

## 已实现

- `TOOL_DEFINITIONS` 为本机schema的function结构，四工具及参数唯一真值在源码；driver应直接透传 `{name,arguments,threadId,turnId}`。构造器同步返回对象，兼容补充1的 `await createCaseRuntime`。
- 冻结案例字段驱动阶段、材料和事件；无 D01—D06 ID 分支。request与inputs节点分别保留；未来文件不写入case sandbox。原case只保存于外部evidenceRoot，候选消息仅白名单公开字段、当前已到事件/材料路径与当前阶段操作。
- read/write严格路径白名单、regular file、无symlink/硬链接、精确条件文件身份；case_write记录每个版本的原始字节/摘要和替换前像。未到阶段、未确认事件、失败依赖、过期写前像、异物/过期checkpoint均拒绝并保留请求/错误。被拦住的错误不会变成候选合规。
- recovery steps只接受声明式已支持动作，不执行任何fixture shell。候选请求合法retry token后记录retry_requested节点并按脚本自动推进retry_result_delivered；不会让候选跳节点或反复重试。原失败持续保留。
- checkpoint使用本run实际写回执+当前磁盘摘要接受/封存；返回fresh_context后暂拒工具，driver真实中断确认后调用resumeMessage。恢复保留旧合法checkpoint、已到事件与账本；下一次工具必须来自不同thread。没有声称发生原生compact。
- 补充2已落地：确切路径撤销只屏蔽目标，语义撤销原样投放并标`semantic_review_required`，不因无法映射路径判整题INVALID_RUN、不自动新增许可或全局停止。候选/J负责对象、范围、授权的语义判断。
- initialMessage/resumeMessage/tool完整返回文本及字节hash在journal留存；read另有请求/返回行范围、完整文件返回标记。模块不截断字符串；RPC实际送达/模型消费为UNKNOWN，必须由driver原生记录闭合。
- snapshot/finalize返回阶段、访问/写入、事件、原失败、拒绝、产物身份和证据路径。文件存在与终态文字不是完成证明；`completion_claim_verified=false`，质量/必要控制均NOT_EVALUATED。case sandbox清理后，外部journal、final与每版产物仍可读取。

## 集成要点

1. `caseRoot`、`evidenceRoot`必须为新建或空目录，实际根互不包含；按主协调窄核对，driver传专属空 `evidence/case-engine`，不传已有transport日志的父目录。
2. 普通节点使用case_checkpoint的`checkpoint`；当期事件用`acknowledgements`确认，可在当前节点单独ack或随下一节点传入。checkpoint保存使用`artifact:{path,sha256}`；retry请求使用`retryToken`。工具schema禁止额外字段。
3. fresh_context只在脚本声明中断节点返回；driver必须先中断旧turn、确认实际终态，再调用resumeMessage并创建新thread。运行时不认证native线程，仅用driver所传ID防止误用旧thread；真实身份和取消/后代进程/资源由编排owner取证。
4. 一个runtime当前只接受一个活动thread，fresh恢复后换thread；未登记子thread会拒绝。真实多agent对共同case工具的委派尚未接线/未验证，不能以fixture_worker事件冒充原生子Agent。集成应如实限制为单执行者，不能因此宣称T已测到全部原生协作能力。
5. 语义撤销不在本模块作独立授权判定；早交付/遗漏copy tokens/用错授权等由J结合实际动作审查。D04完整请求不删减；本模块不复制答案、评分expected或D独立方案案例答案。

## 真实离线验证

最终执行：

```text
cwd=/Users/luca/.codex/worktrees/9a9a/luca_gstack
U007_PUBLIC_CASES=/Users/luca/Desktop/luca_gstack/framework-audit/u004-cases/public/developer-cases.json node --test scripts/tri-system-eval/case-protocol.test.mjs
exit=0
# tests 20
# pass 20
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

最终完整TAP工具输出 `079460`，duration_ms=151.500292。先前 `aa708f` 15通过/1公开包检查未启用；`a843f1`16通过；`8b6419`18通过，随后新增两个有意义边界检查后形成20通过。没有隐藏失败重试或将skip算pass。

关键反例：未来资料和private绝对路径拒读；提前/未ack写拒绝后合法写成功且原错误仍在；重复事件/错误token/越级retry被拒；failed+completed_claim=true不能消费；错误SHA/未实际保存的checkpoint被拒，合法回执可中断续接；同标签不同ID保留；原有checkpoint不可覆盖；确切撤销不阻塞status文件；语义撤销不被driver猜测；输出存在/口头DONE不证明完整；叶/父symlink和条件漂移拒绝；清理sandbox不丢外部证据。成功→预期拒绝→合法成功在多个场景中实跑，不是匹配实现字符串。

公开包测试仅初始化六个当前公开案例到inputs_delivered以核实际结构；其它行为反例为中性自造fixture。公开包原字节未改，未用answers确定输出，未读private/hidden/archive。此处所有执行均本地确定性unit fixture，不消费正式模型run。

`git diff --check` exit0（`6dc502`）只涵盖tracked差异，不能覆盖新文件。另对两个明确新增文件执行 `git diff --no-index --check /dev/null <path>`，实际exit1且无诊断（`6dea75`/`7a4d76`；no-index存在差异，未包装成exit0）；没有据此宣称全仓suite通过。终态status `4df85f` 仅两份新增源码。

## 方法、读取边界与限制

按catalog精确采用code-hygiene Mode A的完成前验证铁律；非清理、非本作者独立review。已读skill EOF和选中静态输入view、workflow-mode；input-modes源hash与view绑定一致。之前完整读过的root/CONTEXT/catalog/Plan/office/long-session与当前hash相同，复用真实读证；startup summary只读，get_rules只加载相关规则。本次授权不允许额外Agent，未派preflight/reviewer；独立review由主协调统一安排。

新增读取：任务卡/共同合同/比较manifest、两份接口补充全文；公开developer JSON中的协议字段、当前README相关说明、本机schema定位JSON及 `v2/ThreadStartParams.json` 的DynamicToolSpec function段。一次公开案例字段大输出截断（2da10d），未称案例全集语义已读；所需D05/D06字段此前A中已完整读取同版本，实际初始化另由公开包测试核验。没有遍历framework-audit目录。

实际源码方法参考：`scripts/run-agent-context-ab.mjs` L2562–2646的真实输出范围/截断/身份分层，以及L4757–4800的RPC调用边界。该脚本含顶层实验入口，故**未直接import或执行**；只复用读证原则，不复制旧G5矩阵、关闭工具策略或driver调度。除Node内置fs/crypto/path外无新增依赖、无必要外部import扩读。

当前限制：本地路径检查不是抵抗同UID并发攻击的OS隔离；原生shell/子Agent若绕开case_read，其真实读取范围由driver记录为UNKNOWN/污染。本模块只核机械receipt身份、不裁判checkpoint语义正确性。未支持的fixture动作/坏阶段/重复ID会在构建前拒绝；新事件中不可解释的权限关系仍交J。崩溃后重新加载运行时状态、跨进程恢复不是本API承诺；此次fresh仅同一driver/runtime中的新原生thread。原生RPC截断、资源账、有效模型、取消/后代清理、全链质量/净收益和生产迁移仍未验证。

## 复杂度与资源

新增一个case protocol模块和一个测试模块；4个动态工具、5个返回方法、5种声明式driver action、1份只追加journal及各产物版本。源/条件身份、阶段投放、事件确认、写前像、checkpoint与resume边界是维护点，不按行数判收益；公共driver设施四条件共享，不能算I独有增益。新失败面是fixture schema不支持、证据写失败、路径漂移和调用方thread接线不一致；均不默认为成功。

W10工作调用1；真实模型/正式run/额外agent/网络/安装=0；actual token usage未知，不填0。开始钟17:41:17 UTC；收尾时间见下。底层动作按exec/apply/clock逐次计，functions批量封装不将多命令合成1；截至最后身份核对已有22次exec_command、7次apply_patch和2次clock（报告写入及读回另计2次exec，合计33动作）。内部fixture文件操作为离线测试成本，不冒充只做1条案例或新模型run。45分钟/90动作内完成；不对不可观测120000token上限作伪精确声明。

## 文件身份与共同输入绑定

- `/Users/luca/.codex/worktrees/9a9a/luca_gstack/scripts/tri-system-eval/case-protocol.mjs`：SHA256 `a461f843521e8e35bf2499680adc8c99aa067011632897779cc5b52168d79046`；28861 bytes；430行。
- `/Users/luca/.codex/worktrees/9a9a/luca_gstack/scripts/tri-system-eval/case-protocol.test.mjs`：SHA256 `55af0427efecd399cd9fb7fcb36da9dfcde5b4260777f6939441601d75a39d8a`；22175 bytes；312行。
- `u007-context-build-task.md`：SHA256 `98bf364b4b30f85f6ba28ac2f1028642dacfdd7974294fbc563fc674c3a66ee8`。
- `u007-implementation-contract.md`：SHA256 `74c43c98dd2fc88df66c84d660c0f044deae35d7223e9a6c17b05ace22ec04a6`。
- `u007-comparison-manifest.json`：SHA256 `aeb3f7391c991f9df48ef5f6fa178464124177c2fad390121beceb2adeca553f`。
- `u007-interface-addendum-1.md`：SHA256 `953caf31e773b35bfc05c8993141f5d5f543b6202c30c8d6ccf7d1340073f70f`。
- `u007-interface-addendum-2.md`：SHA256 `1a308a1e849f67e10f5acb9ecae5a130b93c99d069b5a8bd0d15d1ff9e7a7830`。

报告生成UTC `2026-10-02T17:57:57.343138+00:00`。主协调下一步集成真实模块并安排独立review；本报告不放行真实run、不发消息到其他会话、不自行提交推送。

<!-- FILE_END: u007-context-build-report.md -->
