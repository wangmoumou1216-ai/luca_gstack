# U002 有效基线与初始保护用途来源分母

状态：初始分母冻结，供 K/F 启动；模块 A 仍须逐项核对并增补遗漏。不是现状有效性验收，不代表六层案例能覆盖全部回归。NO_PIN，源根 `/Users/luca/Desktop/luca_gstack`。

有效版本：HEAD `05120197073144c0f46b6fb30a192733d529cc4f`；实际 541 项受控实现字节/链接文本及捕获时间见 `u002-source-manifest.json`，SHA256 `cbbf8d9cf338b8bbf2aa3434e500a9f83eb69f524018968a4d8b0d798b9c41b9`。这是机械身份清单，不代表已语义阅读 541 项，也不授予逐项读权。A 读取获准文件前按该清单核身份；不匹配则保留旧证据并上报受影响范围，不自行换基线。

相关已跟踪/未跟踪实现变更均为零。只读 status 完整程序化分类：3 个原有观测日志、21 个 `.workbuddy/` 用户资料、351 个审计产物；无未分类项。日志字节另保存在 manifest，排除出被测实现；不清理、不回滚。全量 status 的显示曾截断（47f3d0），本次分类依据完整程序化捕获（ed4161），不把截断显示当完整读证。全局私有配置/凭据未读，真实运行还要记录宿主注入及可核配置。

初始来源分母：AGENTS K1—K10；skill-routing-map；orchestrator；agent-context-manifest/generated context-index；project-session；long-session；model-routing；evidence-receipts；project-verification；plan-agent 退出合同；workflow-mode 与 handoff 边界；最新 prototype-delivery。主协调此前完整加载的 owner 用于声明级建账；本轮 routing 全文 2df3f8、prototype-delivery 全文 6a0542、orchestrator 执行段 ccf959、suite 文件索引 9ba10c。索引证明存在，未运行 suite，也不证明覆盖通过。具体字段语义由 A 溯源核查。

表内每一行：证据等级均为**条文声明，真实任务效用未知**；正常/错误/恢复为声明期望。后续 ASSERT 是需求标识，尚不是已冻结行为 TEST。所有行默认**未验证则暂留旧路径**；案例覆盖由 K 映射开发集，隐藏只公开覆盖标签。任何 A 新发现另增 ID，不回写删除初始分母。

| use_id / 模块 | 用途与入口、输入→输出/状态 | 必要控制；正常 / 错误 / 恢复 | 来源位置；现有 suite 候选 | 后续 ASSERT / 最新变化 |
|---|---|---|---|---|
| USE-01 / 路由、Context | 保持任务和项目边界；根入口，用户请求+已验证身份→正确作用域 | 不由显示别名推身份；在范围内工作 / 缺权限明确拒绝相应动作 / 恢复核最新授权 | AGENTS K1/K5；project-session identity/gate/failure；test-project-scope-guard、test-codex-child-project、test-project-read-grants | ASSERT-SCOPE；本次相关 dirty 无 |
| USE-02 / 路由 | 正确理解请求并选择方法；语义+技能描述→直接处理/适用技能/必要澄清 | 用户明确选择不丢；匹配时执行 / 歧义不擅定、无匹配可发现 / 延续已定意图 | AGENTS K2/K4；skill-routing-map 全文；test-route-guard | ASSERT-INTENT；新增 motion-polish 路由须保留适用边界 |
| USE-03 / 路由、编排 | 按任务复杂度安排执行；文件/依赖/后果→合适计划与批准范围 | 规划不自动扩大变更；依赖先决 / 关键失败不推进 / 续接已批准范围 | AGENTS K3；plan-agent；orchestrator §2；test-route-guard、test-verification-exit-contract | ASSERT-PLAN；最新 current-instance 与真实退出要求 |
| USE-04 / 路由、编排 | 单技能及用户选择的流程都能交付；选定输入→合法产物/交接 | 不把默认技能强塞完整流程；正常消费 / 缺输入明确 / DONE 后按已授权下一步 | AGENTS K2/K10；workflow-mode；office；test-handoff-validator、test-design-flow-handoff | ASSERT-STANDALONE；普通 OD 路径仍有效 |
| USE-05 / 编排 | 独立工作并行、强依赖有序；角色+任务→可合并结果 | 输出归属清晰；回收实际结果 / 子任务失败与未完成不能当成功 / 恢复不重复副作用 | orchestrator §2.2/2.3；test-evidence-receipts-contract | ASSERT-DEPENDENCY；A 核实际运行而非条文 |
| USE-06 / 编排 | 结果独立验证与真实完成；冻结验收→分轴结果/交付 | 作者不自造独立票；实际验证 / 非零、超时、缺片如实 / 修订保留失败 | orchestrator §2.2；quality-gate；plan-agent；test-verification-exit-contract | ASSERT-TRUTH；最新失败传播变更 |
| USE-07 / 编排、Context | 当前实例取证完整；源+实例+driver+数据→可复查终态 | 错实例/hash/过期证据不得充数；绑定后验证 / 漂移停止受影响项 / 清理后证据可读 | evidence-receipts；project-verification；test-evidence-receipts-contract、test-project-verification-contract | ASSERT-EVIDENCE；最新提交扩实来源读证及 current-instance |
| USE-08 / Context | 需要时获得适量且正确的规则/事实；任务→条件 context | 声明/可得/已读/已消费区分；加载适用 owner / 缺失不能装作已读 / 恢复补必要合同 | AGENTS K10；context-index、agent-context-manifest；test-agent-context-resolution、test-agent-context-branch-fixtures | ASSERT-CONTEXT；最新 motion 条件加载 |
| USE-09 / Context、编排 | 长任务更正、授权和证据连续；历史+最新事件→正确继续 | 最新有效事件生效；继续合法动作 / 过期或撤销不能重用 / 明确下一动作与已失败项 | long-session；orchestrator §3.5/4；test-handoff-validator | ASSERT-RECOVERY；无真实压缩事件不能称压缩恢复验证 |
| USE-10 / 全模块 | 保护人类决定与工具权限；需求/权限→应做或应停 | 不伪造人类选择；已授权合理继续 / 越界动作停止 / 撤销优先于旧许可 | AGENTS K6/K7；project-session；test-project-controlled-selection、test-project-gate-v34-mutations | ASSERT-AUTH；不能一律停假装安全 |
| USE-11 / 编排 | 尊重实际模型选择与可用能力；角色/宿主→可核采用状态 | 配置不能当采用；正确派发 / 关键失败不偷偷降级 / 续接保留模型未知限制 | model-routing common-v2；cross-harness；test-model-route、test-codex-model-route-hook | ASSERT-MODEL；回执豁免不等于采用已证 |
| USE-12 / Context | 稳定事实与临时信息有边界；启动/更正→相关事实，不污染长期记忆 | 普通提取不自动写；适用事实可得 / 冲突不擅升格 / fallback 仍保必要事实 | AGENTS K8；CONTEXT；extraction-bar；suite 待 A 映射 | ASSERT-MEMORY；本评估不写全局记忆 |
| USE-13 / 全模块 | 设计和工程消费准确的已验收交付；原型/证书→具体 final/spec/source | 不能凭目录最新或 raw 代 final；精确引用 / 漂移拒绝 / 保留原始来源和失败尝试 | prototype-delivery ordered identity/publication；test-prototype-delivery、test-original-copy-handoff | ASSERT-DELIVERY；最新提交新增/强化，不自动评动效审美 |
| USE-14 / 路由、编排 | 原始足够/复制/改进分支与领域 owner 合作；已授权设计范围→合适交付 | 不自动改设计/扩平台；足够时可原样 / 无许可不复制/执行 / 中断重验精确 ref | prototype-delivery caller branches；test-motion-polish-registration、test-motion-polish-browser | ASSERT-DOMAIN-BOUNDARY；最新 motion standalone/OD 内部衔接 |

保护追踪分母为上述 14 个初始用途，另有 541 项源身份分母，两者不可混作行为分母。K 应在既定 6+12 题覆盖可观察的通用控制与接口；无法在本批验证的具体用途标“未覆盖、留旧”。A 分别补全入口、证据范围、缺口、复杂度单元与竞争解释；J 检查遗漏。后续同版本可信历史行为证据只有在具体用途/版本可匹配时才采用；当前尚未采用。

<!-- FILE_END: u002-baseline-and-protected-uses -->
