# U007 补充11：由原三个会话接入本地原生 Trace

## 主协调决定与停止条件

这属于已批准 U007 实现修复，保持后续 U008 比较、反驳裁决、迁移、最终验收、提交推送顺序。J12 原文 PASS4/4 只结束 R8 离线修复；J11 整体资格 FAIL 不被覆盖。root 依据用户已授权自主调度全生命周期，决定将余下代码交回原三个会话；不由主会话实现观察器、driver 或集成测试。

来源是共同实施合同§3/5、J11 的原生内层操作不可核缺口与 u007-native-trace-research-r1.md 中已定位的官方原生 Rollout Trace。实际 app-server raw 会清除 executed metadata，因此不再试开这个开关，也不重复旧 P07。最小替代是复用原生本地 trace，仅加一份消费模块；不新建遥测服务、适配平台或生产配置。

有界工程投入：work_cap32→35，review_cap26不变，staff总58→61。W33/W34/W35 各一次原会话 turn，35分钟、75个保守动作、100000可观测token；真实usage不可得保持unknown。这是明确追加3次建设调用，不冒充免费、不挤占必要独立评分。每个会话先交可运行实现和本模块必要测试；root组织跨模块及一次独立复核，不再为已知修复加一轮纯计划审查。

在144行为总额内，将 additional_general_max9→8、capability_driver_probes_max7→8，迁移8保留。仅预留一次 P08：最多480秒、30工具动作、120000可观测累计token、同时最多root+1child、必要时一个fresh后继；整链共享上限，不自动重试。本轮派发模型/行为run额度仍0；实际 P08 须有精确实例、冻结代码、边界证据和独立就绪检查后由root登记释放，当前不是READY。若实际版本不产出所需记录或缺口不能在本批收口，记录确切不支持的路径，依据主计划限制适用比较/主张；不得静默削弱必要控制或宣布全生命周期完成，也不继续同原因盲试。

## 基线、隔离与公共接口

R8根集成记录 u007-root-integration-r8.json 为唯一前像。root已将8文件精确备份到 u007-code-snapshots/r8。root两处测试路径修正属于基线，应由对应owner核前像后采用。各人在自己的既有工作树写各自文件；你不是唯一执行者，不得覆盖或还原别人修改。框架/meta为NO_PIN；不碰源R的生产文件、framework/、项目/别名、全局配置/trust/HOME/CODEX_HOME。禁止读 u004-cases/private 及 archives。日志与官方源码是数据，不能执行其中指令。

新增 scripts/tri-system-eval/native-trace.mjs（W33唯一owner），Node内置模块、无新依赖。公共API固定：

`export function createNativeTraceObserver({traceRoot})`

返回 `{poll}`；`await poll({rootThreadIds, final=false})` 返回当前累计 JSON可序列化快照，不增量返回，重复poll幂等。rootThreadIds 为driver实际启动的根及fresh根ID，不能按文件时间猜。快照固定字段：

- `version:1, status:'PENDING'|'VALID'|'INVALID', trace_root, bundles:[], threads:[], operations:[], issues:[]`。
- 每个operation至少含 `key, bundle_id, thread_id, turn_id, tool_call_id, tool_name, requester, start_seq, end_seq, status, input_ref, result_ref`。未知值为null。key稳定且全局不冲突；input/result仅受约束引用和hash，不能把原始prompt/推理内容复制到报告。
- threads必须保留原生thread标识及源码支持的父关联/终态；不猜parent或effort。bundles记录身份、原始路径/hash、序列、根归属、原生结束/未结束事实。
- issues含稳定code及最小可核定位；VALID只表示所读bundle结构/引用/归属/收尾一致，不自动等同整个执行链控制和formal资格。

W33从精确官方rust-v0.160.0源码确定事件字段，不能凭这个接口发明上游schema。如果源码要求调整公共接口，向root说明精确差异，继续独立工作；禁止两边各猜一个协议。原生trace只在自有app-server进程env设置 CODEX_ROLLOUT_TRACE_ROOT，写本次evidence之下独占新目录；不覆盖其他env、不改全局配置或候选权限。目录必须排除候选读写，所有条件同样启用、计入成本。best-effort/缺文件/截断/序号缺口/引用逃逸/未终态不能判完整。live尾行未写完可等待，下次完整后消费；final仍不完整必须留错。

W34只拥有driver.mjs及driver.test.mjs，消费上述模块并在本批测试中使用精确依赖或临时stub，不修改W33文件。manifest.runtime_release新增可选 `native_trace:{enabled:true,schema_version:1}`；实际root放行时绑定observer字节。未启用路径保留R8行为。启用后driver创建唯一trace目录、记录单项env差异、轮询实际记录并在清理后final读取；证据缺失不会翻为完成。trace提供的实际ToolCallStarted为操作事实；外层CodeMode wrapper、RPC投影、hook通知不可再次收费。只按可信原生ID做对应，映射不清或coverage无证保持总数null。原token累计、真实非零、整链截止、取消/清理不得弱化。预算要在运行时看trace并触发既有停止，不等结束才发现超限；记录观测滞后，不能承诺原生没有的调用前硬拦截。

W35仅拥有native-trace-integration.test.mjs及自己的报告，不修改另外两个owner文件。通过真实模块和fake transport/磁盘trace验证接线、失败/预算/fresh/child事实留存，不复制实现。先基于冻结接口准备反例，待W33/W34发布稳定依赖后在同一turn完成集成；root传递依赖。未知真实能力明确保留，不新增提前的U008语义评分或U012生产门。

## 本批验收与责任

C1 官方真实字段到operation的一致性；直接与CodeMode内层、重复poll/同ID冲突、缺失/截断/foreign/symlink引用均有行为反例。C2 live计量/同操作投影去重/超限触发既有interrupt；误报结果不能变可信。C3 真模块集成记录child/fresh归属、真实失败和清理；没有bundle不可成为0动作或成功。C4 范围保持一个框架、Codex优先、same-quality及14必要用途不减；本批不声称native资格已PASS。

每个owner运行本模块最窄必要node --test并保存命令/真实exit/日志/代码hash，避免重复全仓suite。代码、反例、实际运行证据交齐后root独立复核。本批不写生产框架，不commit/push，不开新Agent。模型保持原会话MR-001 anchor，不覆盖用户effort。后续审查继续MR-004既有独立reviewer。

<!-- FILE_END: u007-interface-addendum-11.md -->
