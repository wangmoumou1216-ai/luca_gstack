# 框架修复发布与真实来源回归

plan_id: WORKFLOW-EXEC-20261009-RELEASE
mode: Sequential Chain，主控完成本地集成、验证及发布；终审使用独立冷上下文。
scope: NO_PIN framework；当前 4841 工作区集成，日常主检出 /Users/luca/Desktop/luca_gstack 快进同步。
source: 用户已要求继续原任务，最新明确要求“那你继续啊，做到闭环”，承接上一回复列明的集成发布与真实流程验收。

## 前提与权限

修复仍只在旧工作区，日常主检出尚无该能力，必须集成才能解决实际使用问题。复用原17文件修复和双轴独立票；保留另一会话的入口/完成治理提交，不重复诊断。默认交付是已验证提交、远端main与日常主检出一致；真实产品UI重新设计与新外部OD项目采用仍由产品流程自己的真实人门负责，框架回归不伪称产品交付。

用户已要求完成上文明确的发布与验收工作；允许本任务有限源文件与audit修改、normal git branch/stage/commit/push、主检出快进与本地隔离浏览器回归。禁止force/reset/覆盖他人工作、主动发送其他会话消息、更改工具/账户配置、修改framework/原件、读写共享项目别名。保留主检出观测日志和原工作区未提交内容。

KILL: 若源身份漂移、他人提交发生重叠且无法有据合并、远端身份不符或必需终审失败，则停对应发布步骤并保留证据。

## 单元

U-004：源集成。依赖原U001–003闭合。main/anchor；Files=原最终scope17文件，源root4614 baseline8ec9b84及冻结sha，audit仅精确原报告与证据。以git apply检查旧补丁与当前HEAD、新增文件显式复制，吸收另一会话最新已发布commit后再核验。门：17文件语义一致、原件hash不变、他人工作保存。
U-005：发布版本功能验收。依赖U004；main/anchor；在audit复用现有真实浏览器suite，另用原始WorkBuddy HTML SHA068f140011273ddadaa8b4c90f824814c20309b0a5b537ea9c41f180f75e4b5c与已确认CRM模板验证实际六菜单内容与关键交互；测试数据NO_PIN实际来源回归，外部OD运输沿明确模拟边界，不认证真人收据。门：原测试+真实来源行为及负例通过，独立对当前终版集成裁决。
U-005 现场兼容修复：真实 codex-cli 0.161.0 的 thread/start SandboxMode 为 workspace-write/read-only，旧 runner 错用 turn sandboxPolicy 的 workspaceWrite/readOnly。只改 .codex/workflow-runner.mjs 一行，并在既有 scripts/test-workflow-runner-runtime.mjs 的假服务准入拒绝错误枚举、补真实协议断言。生成的本机接口 schema 为诊断证据，独立 CLI 审查成功才证明实际运行。首次失败 invocation 与锁定完整保留；重激活须取得用户实际授权，不删除锁或降档。
U-006：发布及使用位置验收。依赖U005；normal branch/stage/commit（正常pre-commit全量verify，不跳门）、git push origin HEAD:main、主检出merge --ff-only。门：正常完整verify通过、远端main/本地主检出同sha、改动存在且核心功能新鲜回归；保留主检出原脏文件与index。不创建产品文件，不自动启动OD生成。

## 断言与完成

BLOCKING：node scripts/test-plan-approval.mjs；node scripts/test-original-composition.mjs；node scripts/test-original-copy-handoff.mjs；node scripts/test-page-context.mjs；node scripts/test-design-tool-routing.mjs；git diff --check；完整bash scripts/verify.sh（normal commit hook）；准确源/远端/主检出读回。真实来源驱动固定原源HTML、模板、driver和输出hash，真实导航/搜索/业务模态与状态；缺证据保持缺口。

终审：原双轴票对应未变源字节可复用；合并delta、发布范围与真实回归由独立冷审。原生子代理工具已实际返回unsupported，采用既有Codex app-server adapter的独立codex-cli调用，按当前common MR004/peak、同次模型采用/完成证据；不称原生子代理、缺票不自审补票。

DONE：有限框架改动已发布同步且真实来源回归通过。NOT_RUN仍列外部OD生成与原产品全量视觉/设计交付，不能混成框架发布已完成或未完成。

## 当前门禁处置 — 用户确认

独立 CLI 审查实际返回官方 Responses API 401；用户环境为 codex_local_access 本地网关，审计适配器强制 openai 导致服务端不匹配。用户明确要求相关时不要验证、继续下一流程；该有限外部独立审查标记 SKIPPED_BY_USER，保留失败票，不伪报 PASS，不改私有服务配置。其他本地与正常 Git 检查继续。完整 verify 首轮 122 PASS/1 FAIL：本次 OD SKILL 超过 45KiB；已将重复合同压缩为强制全文加载 page-context §7 的引用，最终 46064 bytes，待正常提交 hook 重验全仓。
