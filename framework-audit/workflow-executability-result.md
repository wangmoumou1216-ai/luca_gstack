# 框架执行能力：问题裁决、源头修复与验证

2026-10-09 · NO_PIN · 当前 worktree：`/Users/luca/.codex/worktrees/4614/luca_gstack`。基线：`8ec9b848fa874d2dff6c9d1fb95789808bd5d298`。
原修复状态：**DONE_WITH_CONCERNS**。下文保留原 4614 本地修复验收记录；2026-10-09 发布接续进展见本文末尾。真实外部设计及原产品验收另列范围。

## 真问题

**框架接受了“在选定原始模板内集成已有交互原型”的任务，但从规划授权、设计准备、生成到回收，各环节没有共同可执行的合同。** 上游认可的任务，进入下游后会遇到能力缺口；静态材料校验又不能说明交互已经实现。

| 根因 | 证据与影响 | 已执行的修复 |
|---|---|---|
| 审批适用范围与审批证据混淆 | 一条规则把缺少自动审批适配器扩成普遍禁止派发；调用方自己写的 JSON 又只能证明路径、字节和范围一致，不能证明用户同意。 | Plan、Orchestrator、implement 统一区分真人批准与绑定校验；checker 明确返回 `BINDING_VALID / authorization=NOT_VERIFIED`。真实批准、变更范围、撤销都由可信会话证据核对；无人值守自动执行仍须可信适配器。 |
| 原始模板确实缺交互组合能力 | 实际 CRM 原件新增菜单能通过静态检查，但点击只改标题；旧配置拒绝新增脚本，也拒绝结构修改与视觉精修混用。连续准备两次又各自重读原件，不能累积组合结果。 | 新增明确选择的 `original-composition-v1`：在同一原件上组合不重叠的结构与视觉编辑，运输经审查的固定交互代码，并在回收时逐字节校验。旧默认配置保持原义。 |
| 上下游表达不一致 | 草稿“可准备”、模板“已有状态”、生成合同、回收成功容易被当作同一种完成；第一轮需求审查还发现组合合同遗漏具体编辑动作语义。 | 贯通 draft → Brief → prepare → 生成指令 → 不可变运输包 → recover；明确计划中的 `extension`、具体编辑动作和待完成的业务验收。草稿就绪与回收校验均不授予执行许可。 |

审批专家推翻了初稿“必须新建审批引擎”的预设；现有可信会话证据足以支持受监督、范围明确的真实用户批准。模板专家用真实原件复现了交互缺口。原事件更早发生的子会话来源信任问题已经修过，不归入本次根因。

## 整条链路如何工作

1. 主代理核对真实用户授权与当前范围，列清实际交互、代码来源、挂载位置和验收项。
2. 在已授权的本地范围准备最小交互代码，先独立代码审查，再冻结准确字节。prepare 不代写业务代码，也不认证来源、审查或许可。
3. 运输包携带原件身份、明确配置、源/验收/挂载映射、固定脚本和完整 add/modify/remove/preserve/refine 规则。生成端只能使用这些已冻结内容。
4. 外部采用、置入、运行、回收仍分别遵守原有真实授权门；缺工具能力不能伪报已运行。
5. recover 校验固定脚本及唯一 body-end 插入位置，再使用原有结构/视觉检查证明原脚本、全局 CSS 和未声明区域字节未变。业务交互与视觉仍需实际验收。

该接口限制代码运输和完整性，**不是 JavaScript 沙箱**。代码仍在页面环境运行；计算生成的网络请求或 DOM 效果须经代码审查与运行验证。首版只接收自包含 classic JavaScript，不接外部模块依赖。生成片段不能自行带脚本、事件或新增外部静态资源。

## 专家会审与返修记录

原始报告、机器判决与来源位置保存在 [reviews](workflow-exec-validation/reviews/)。未通过的历史票保持原样，不被最终结果覆盖。

| 审查 | 原票及处理 |
|---|---|
| 审批根因，独立冷上下文 | 旧机制 FAIL 1/4；修正全局禁止规则、JSON 的含义及真实批准证据要求。 |
| 模板根因，独立冷上下文 | 诊断 CONDITIONAL_PASS 3/4；能力缺口已复现，真实业务和外部工具验收保持 UNKNOWN。 |
| 方案审查与定点复审 | FAIL 3/6 → FAIL 5/6；最后两项为合法阶段枚举和前阶段门通过后才能启动后阶段，均按原票修正。 |
| 第一轮 Standards | PASS 5/5，零 finding。 |
| 第一轮 Spec | FAIL 8/11；发现一项 Important：组合运输合同遗漏完整编辑动作语义。已补齐并加入运输包回归。两项 UNKNOWN 分别为最终双轴 provenance 和历史阶段顺序，后者已有真实工具事件补证。 |
| 最终 Standards | PASS 5/5；当前 17 文件与 diff 审前审后精确一致，独立重跑组合/回收通过，十二类 smell 已检查，零 finding；同 invocation accepted 已核验。 |
| 最终 Spec | 实现要求 10/10 通过，零实现 finding；原票保留 FAIL 10/11，唯一 UNKNOWN 是本次调用的完成/接收来源，已由主控用同次 `accepted` 记录与真实原生消息核实。未读取另一轴判决意见。 |

第一轮之后只改了 `original-copy-handoff.mjs` 的指令合同与 `test-original-composition.mjs` 的对应回归。初次回归断言误用原始字符串匹配嵌入 JSON，导致测试失败；改为解析真实 Markdown 代码块后比较解码 policy，失败日志保留。未放松生产校验。

最终冻结范围：[round-2/review-scope.json](workflow-exec-validation/round-2/review-scope.json)，17 个源文件；diff SHA-256：`d5675e680dd2822a51679c3cc9c3fc7c5369b266a0b608059897a7eb4b15848f`。两轴审查对应这些字节；原生 invocation、输入 SHA 和 accepted 已由父级核验，见 [closure.json](workflow-exec-validation/closure.json)。接续会话再次核验 17/17 源文件、准确计划、两份原票及 15 次测试日志 SHA，并新跑批准绑定回归和 `git diff --check`，均通过。原始 FAIL/UNKNOWN 票保持原样，主控补证单独记录。

## 行为验证与回归

[初轮 runs.json](workflow-exec-validation/runs.json) 保留 12 个命令的 argv、cwd、PID、时间、退出码、日志 SHA 及前后源文件一致性；全部 exit 0。[最终变更后 runs.json](workflow-exec-validation/round-2/runs.json) 的组合、回收、diff-check 均 exit 0。

真实 Chromium 使用注册 CRM 原件（SHA `7a30a15978929ede4177e213f1090cb4d3860e5b2ef33509434cfff7879631e5`）和**六个合成框架模块**，验证：

- 六个菜单各自显示且只显示对应面板；重复切换与返回。
- 输入、操作状态跨导航保留，键盘激活可用。
- 原有搜索、原菜单/标题行为保持；没有页面错误、意外请求或弹窗。
- 删除交互桥接、调错导航映射会触发真实交互失败；篡改固定脚本会触发完整性失败。
- 缺代码/manifest、未知来源或配置、原件过期、取消回收、额外脚本/事件、外部资源、HTML 边界逃逸等负例被拒绝。

另有六个注册原件的保存/精修/草稿检查通过；agent contracts 137/137、设计流程静态合同 221/221、harness 适配器 17/17、Codex viability 49/49，以及 CI 和生成上下文检查通过。新测试已接入现有 `test:original-adapter`，由现有验证与 CI 调用。计数不替代行为或真实外部运行。

历史执行顺序由 [phase-order-evidence.json](workflow-exec-validation/phase-order-evidence.json) 绑定实际父会话工具事件；U-001 门通过后启动 U-002，U-002 门通过后开始 U-003。

## 与另一个会话的关系和交付边界

已通过 read_thread 读取 **“排查设计流程模板检索问题”**（`01a11f4c-29d5-7c20-81e9-9f83e5a40be6`），并只读跟进。它修复流程入口、模板发现、会话延续及后续工作流完成判定；本次修复审批适用性和原始模板的交互执行合同。两者位于同一链路的不同环节，需要将来对合并版本做完整验收，不能用本次结果宣称已集成。最新快照显示该会话仍在独立终审，尚未提交/推送。未修改其 worktree，也未给它发送消息。

**NOT_RUN：真实 OD 生成/回收、Luca 与 Codex 宿主联调、真实 Claude/Codex 原生批准、用户原始六个业务模块及最终视觉验收。** 测试中 `runtime=codex/claude` 只代表模拟运输边界。本次修复在当前 worktree 生效；完整原产品交付须使用其自己的准确需求、项目身份、真实授权与业务/视觉验收。

[初始诊断](2026-10-09-workflow-executability-diagnosis.md) 保留为历史推理，以本裁决和 [实施计划](workflow-executability-plan.md) 为准。

## 接续完成记录 — 2026-10-09

用户在新会话明确要求继续本任务。实现与准确计划仍位于原工作区 `/Users/luca/.codex/worktrees/4614/luca_gstack`；接续会话工作区 `/Users/luca/.codex/worktrees/4841/luca_gstack` 未复制源改动、未集成另一会话提交。原计划基线和全部 17 个冻结源文件均未漂移。

- 本地 required gates：CLOSED；`closure.json` 的原始票、来源、原件与运行记录均已重新核实。
- 最终 Standards：PASS 5/5，零 finding。最终 Spec：10 项实现要求 PASS、零实现 finding；父级持有的第 11 项 provenance 已 VERIFIED，原票 FAIL 10/11 不改判。
- 新鲜恢复门：`node scripts/test-plan-approval.mjs`、`git diff --check` 均 exit 0。复用当前字节的独立浏览器和 mutation 证据。
- 原会话已提出 `SC-20261009-001`，状态 pending_review；本次不重复写入或晋升。
- 原产品业务/视觉、真实 OD 生成回收及宿主联调仍为明确缺口；另一会话的发布不代表本改动已合并。

本轮有限框架修复已交付；后续发布、合并版本整链验收及原产品交付各自保留准确范围和真实授权门。

## 发布接续 — 4841 集成版本

已在 4841 工作区集成 5c4de8f 的完成判定/恢复提交，16 个原修复文件精确复用；orchestrator 保留其完整增量。真实原始 WorkBuddy 源与注册 CRM 原件的本地回归 12/12 通过，六模块导航、业务弹窗、搜索、状态、键盘和原菜单返回均有浏览器证据；外部 OD 与产品视觉验收仍未运行。

现场还修复 runner 的 thread/start SandboxMode 枚举兼容，既有运行时回归 85/85。完整 verify 首轮 122 PASS/1 FAIL，失败为 OD SKILL 文件预算；重复合同改为强制读取 page-context §7 后已回到 45KiB 内。正常提交 hook 继续重验。

独立 CLI 发布审查未产票：适配器强制 openai provider，绕过当前 codex_local_access 网关，官方端返回 401。用户明确要求 API 相关时跳过该验证并继续，发布审查如实记 SKIPPED_BY_USER；原独立票不改判，也不代表新 delta 获得复审。当前精确源与例外分别见 workflow-exec-release/release-scope.json、review-exception.json。Git 发布和日常目录同步以接续会话的实际操作回执为准。
