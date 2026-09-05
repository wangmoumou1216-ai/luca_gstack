# P6 独立 Spec 轴审查

结论：**FAIL — 1 个 Important，0 个 Critical。** 冻结源码中的根入口与设计流程保留合同基本成立；候选 A/B 评分器漏检一项明确适用的必读 owner，不能作为 K5/K10 条件加载完成的充分证据。外部与最终收尾门未闭合，本报告不构成发布通过。

## 对象、隔离与方法

- 基线：`94f086233affb3bd08ad8fe33063bcfedb330edf`；审查模式：`git diff HEAD -- <精确 tracked paths>` 加显式 untracked 文件读取。
- 对象：`framework-audit/2026-09-05-agent-context-p6-review-scope.json` 的 **131 个 path/hash**。审查开始及报告前均逐项核对一致；报告前 HEAD 仍为上述基线。
- Scope 文件 SHA-256：`3ad729547ee62d83d1a1a4718f53446b37903b2f9c5d9c9e87e8048e0a4add83`。冻结源码副本 `/private/tmp/p6-spec-frozen`；原始 diff `/private/tmp/p6-spec-frozen/review.diff`。
- 独立冷启动、默认 REFUTE。读取本仓 AGENTS、CONTEXT、catalog、manifest、适用 owner、office/code-review/code-hygiene 与 R4 合同。CLAUDE 仅作为被审对象，独立与 AGENTS 的 K 块作比较，没有作为本 reviewer 的运行入口。
- 只检查 Spec 遗漏、部分实现、未要求扩量及行为错误；未读取另一轴结论，不以既有 review verdict 或旧自检 PASS 形成结论。历史 observations/evals/reviews 不作为独立行为证据。
- NO_PIN；未读项目别名、下游或另一 checkout；未执行 CLI 模型、OD、网络或浏览器；未修改、暂存或提交源码。所有探针改动限 `/private/tmp`。未重复 full verify。

## Spec 依据与明确例外

1. `framework-audit/2026-09-04-agent-doc-lightweight-baseline.md:69` 的 K1–K10，以及 `:88` 的 reader/writer/validator/injector 迁移合同。根义务必须 inline，详则转直接 owner，不能只靠缩小文件或旧测试完成验收。
2. `framework-audit/2026-09-05-page-library-design-flow-branch-plan.md:36` 的 S1–S9、`:68` 的入口行为、`:111` 的中立同包与实际接收、`:186` 的分层验证；`:292` 至 `:310` 的 P-01–P-19 是保留清单。
3. 后续用户决策允许退役本地 token 强制与 figma-layer；页面只推荐高置信候选，无匹配/低置信不阻塞。B1 已 **USER_WAIVED**（branch plan `:377`）；本审查不重开页库验收，已知混合 SVG/HTML concern 不列新 blocker。
4. `framework-audit/2026-09-05-agent-context-p6-preparation.md:82` 至 `:86` 规定剩余 16 票的原配额、失败保留、无校准/挑优/自动重跑、冻结后实测再收紧预算并完成最终审查。父随后传达的新用户授权与首票停止状态，只作为后续调度边界，不作为本轴实测证据。

## Finding SPEC-I1：候选评分器把必读 project-session 缺读判为 PASS

**级别：Important。位置：`scripts/run-agent-context-ab.mjs:841`，特别是 `:845`。**

**Spec：** K5/K10 不能因根文件瘦身失去条件加载（baseline `:79`、`:84`）。当前 AGENTS `:130` 明确要求对每个匹配 manifest entry 直接读 target 至 EOF，引用未读文件不合规。manifest `:43` 的 project-session condition 明列 “or is framework/meta work”，target 为 `:45` 的 `.claude/skill-os/runtime/project-session.md`，`:48` 要求 `read_to_end=true`。

**触发确定性：** runner `:53` 为全部票附加 `This is NO_PIN framework/meta work`；`:770` 的调用提示还明说必需 startup/routing/conditional owner reads 继续适用。因此所有 candidate 非 trivial、非 isolated-root 票都触发这个 owner。F1 与 root-only 探针已有明确例外；无需把它们改成全仓读取。

**实际实现：** `evaluate()` 在 `:841`–`:845` 只把 startup 三文件和 `fixture.targets` 合并为 requiredTargets。`reachableContextTargets()`（`:667`）将 manifest owners 加入允许读的集合，但不把匹配 owner 变成必须完成的读取；允许读不能证明读过。F13 targets（`scripts/agent-context-branch-fixtures.mjs:34`）、F14 targets（`:146` 附近）及 F10-v2 targets 均未列 project-session。影响不局限这三票：其它没有主动列该 owner 的非 trivial/non-isolated candidate 票同样漏检。

**新反例：** `/private/tmp/p6-spec-matcher-probe.mjs` 从冻结 runner 截取 CLI 主执行前的原函数并只加 export，直接调用生产 `evaluate()`；未另写评分逻辑。输入为明确标为 synthetic 的正常化 Codex trace，每个已声明 target 的输出均为该版本实际完整文件内容，并提供 fixture 的精确预期字段。

| 本地合成 trace | project-session 完整读取 | 原生产 evaluate PASS | 对照：删除已列明 OD target 后 PASS |
|---|---:|---:|---:|
| F13-page-handoff | false，零 evidence | true | false |
| F14-flow-preservation | false，零 evidence | true | false |
| F10-v2 | false，零 evidence | true | false |

完整逐 target 结果：`/private/tmp/p6-spec-matcher-probe.json`。这是确定性评分器反例，**不代表发生过真实模型缺读，也不代表真实 CLI 通过**。它证明评分函数确实在检查已列目标，却漏检适用的 project-session 条件义务。

**影响：** 若模型仅凭 inline 根规则或猜中字段，仍可得到 candidate PASS；这票不能证明完整 K5/K10 迁移。根文本本身未删掉义务，缺口在验收实现，不能用“回答正确”抵消。

**最小修复：** 对 runner 明确标 NO_PIN framework/meta 的 candidate 非 trivial、非 isolated-root 分支，把这个精确 owner 加入必读集合并去重；继续使用现有 `targetReadEvidence()` 的实际输出/完整覆盖检查。增加生产 matcher 的缺读、部分读、完整读对照，至少覆盖两种正常化 harness trace；不必扩成新的自然语言条件引擎。`framework-maintenance` 的条件更窄（changes/audits/benchmarks/evolves lucagstack），本报告不把其对每个合成请求的触发当成已证明事实，因此不建议无依据加入所有票的必读清单。

修复会改变 scorer 身份，须重新冻结新版本并做 delta 审查；保留历史评分和原始尝试，不能倒改旧票或自动重跑已失败首票。

## 根入口与迁移合同核对

| Spec | 源码证据与判断 |
|---|---|
| K1 | AGENTS `:12`、CONTEXT 的项目中性身份与已确认项目边界保留；CLAUDE 被审对象对应 K1 等义。PASS（源码）。 |
| K2 | AGENTS `:22` 的六级顺序；`scripts/check-routing-map.mjs:39` 对两根 K2 顺序；route-guard 保留 Project Gate 与 STOP 发现分离。PASS（源码）。 |
| K3 | AGENTS `:37` 五触发与真实 approval；plan-agent 为直接 owner，独立工具选择授权未替代原 Plan/HITL。PASS（源码）。 |
| K4 | AGENTS `:49` 在 STOP 也先读 generated catalog；catalog 由 `scripts/build-agent-context.py` 从 local SKILL/路由/visibility 生成，不依赖 matchedSkills。PASS（源码）；真实 STOP 票待闭合。 |
| K5 | AGENTS `:61` 和 project-session `:7` 保留 session pin、NO_PIN、事务 switch 和别名边界。PASS（源码）；评分证据 FAIL，见 SPEC-I1。 |
| K6 | AGENTS `:72` 保留 framework 只读、用户改动、精确授权；preflight-agent `:44` 和 quality-gate `:115` 避免 NO_PIN 自动读项目状态。PASS（源码）。 |
| K7 | AGENTS `:83` 保留实际人类答复；page-context 与 open-design `:141` 分开页面采用、平台、目标和写入权限，已有有效授权不重复索取。PASS（源码）。 |
| K8 | 两根六条 inline fallback 内容等义、受 allowlist 与 promoted facts 控制；`build-agent-context.py` 为双根 canonical writer；consolidate、daily governance、memory health、session restore 已迁移；后续授权替换 SF-002 未恢复本地母版强制。PASS（源码）；隔离根真实 runtime 票待闭合。 |
| K9 | AGENTS `:113` 四项 inline；checker 保留 bounded K9 与四原则。PASS（源码）。 |
| K10 | AGENTS `:124` 最小启动、`:130` 按条件完整读取、`:138` 独立 harness 使用；CLAUDE 仅保留自身入口区别。PASS（合同文本）；评分器充分性 FAIL。 |
| 生成/验证接线 | canonical catalog/fallback、两根投影和 parity、旧 appendix 留存但从根/manifest 断开、CI/verify/staged commit gate 的迁移均有对应实现。未发现另一项确定的 Spec 遗漏。当前 30 KiB 宽阈值仍属预算收紧前对象，不认作最终预算通过。 |

## S9 / P-01–P-19 保留核对

以下 PASS 仅表示相对基线的**源码合同保留或等义迁移**，不是一轮 synthetic F14 替代完整产品执行。P 编号的 Spec 行为定义在 branch plan `:292`–`:310`。

| 项 | 当前 owner / 精确落点 | 源码判断 |
|---|---|---|
| P-01 | design-brief/SKILL.md `:102`、`:116`、`:184` | 六字段来源、B/C 基线与 change-map、改/保留、超范围裁决未被页选取代。PASS。 |
| P-02 | design-brief/SKILL.md `:566`、`:578`、`:597`、`:608`；tech-spec/SKILL.md `:100`；task-plan/SKILL.md `:138` | R/AE/D/STATE/AC 与 patch 去向/原因保留；旧技术映射改成语义列，历史只读兼容。PASS。 |
| P-03 | design-brief/SKILL.md `:484`；references/output-templates.md `:34` | 每条核心交互八字段及依据/否决/取舍保留。PASS。 |
| P-04 | design-brief/SKILL.md `:85`、`:397`、`:422`；output-templates.md `:164` | 12 状态与非 N/A 传递、场景 C 延至 Phase 5 保留。PASS。 |
| P-05 | design-brief/SKILL.md `:320`、`:328`、`:371`；references/html-prototype-tokens.md `:31` | 代理可见/暂停/接管/撤销、信任/fallback 与七个 AI 状态的控制语义保留；仅撤掉固定视觉技术值。PASS。 |
| P-06 | design-brief/SKILL.md `:280`、`:291`、`:300`；output-templates.md `:173` | 上游方案与 voice、独立推导、冲突与 REMOVED 边界保留。PASS。 |
| P-07 | design-brief/SKILL.md `:648`、`:692`；open-design/SKILL.md `:89`；design-flow-handoff.mjs `:44`、`:85` | Packet 为单一主输入；原文 body 与 reference metadata 分开，同包传递，无品牌词粗暴清洗。PASS。 |
| P-08 | design-brief/SKILL.md `:106`、`:589`、`:636`；input-modes.yaml `:48`、`:137`；workflow graph `:141` | standalone/workflow、无 PRD 不伪造追踪、adhoc 不强补全流程保留。PASS。 |
| P-09 | open-design/SKILL.md `:57`、`:206`；design-flow-handoff.mjs `:45`、`:117` | chain/adhoc/recover，缺源停止，recover 绑定目标并跳过重编译/推荐/生成。PASS。 |
| P-10 | open-design/SKILL.md `:147`、`:151`、`:182`、`:186`、`:278` | 桌面默认、headless opt-in、同 slug、STAGED 非 DONE。PASS。 |
| P-11 | open-design/SKILL.md `:136`、`:153` | 外部 DS 由用户设置，仅明确委托时按准确 ID 绑定核验，不能默选或扩建数量。PASS。 |
| P-12 | open-design/SKILL.md `:199`；auto/SKILL.md `:184`；muse-loop-orchestrate/SKILL.md `:175` | 原样一次 retry 后同项目桌面恢复；上层不能重启 WA 重置计数；跨工具必须已选或已授权备用路径。PASS。 |
| P-13 | open-design/SKILL.md `:153`、`:218`、`:229`、`:236` | 多目标独立绑定、全相关 HTML 同目录、导航≠原型、未收敛与非空真原型门保留。PASS；真实产物回收未由本地测试证明。 |
| P-14 | open-design/SKILL.md `:241`、`:253`、`:268`、`:294` | 用户主导迭代、首版/迭代同 recover、best-effort、slug/路径/风险和 pinned handoff 保留。PASS。 |
| P-15 | ux-audit/SKILL.md `:38`、`:104`、`:123`、`:152`、`:183`、`:323` | 截图、用户模块选择、串行、失败 retry/skip/stop 人裁、总结后继续保留。PASS。 |
| P-16 | ux-audit/SKILL.md `:208`、`:242`、`:250`；module-b-interaction.md `:111`；quality-gate.md `:127` | A/B/C 35/40/25、组内 25/30/45、部分评分/跳过原因、严重性/位置证据、同范围 C 基线与 P0 保留；静态图不能证明行为，UNKNOWN 不伪造 PASS/0 分。PASS（源码规则）；真实评分路径待适用证据。 |
| P-17 | optional-workflow-graph.yaml `:19`、`:41`、`:91`、`:159`；orchestrator.md `:273` | 研究选择、一手数据、工程/HITL 路径的相应差分只裁 figma-layer 与已授权的旧视觉门；未删整条通用链。PASS（源码）。 |
| P-18 | html-prototype/SKILL.md、SCHEMA.md `:70`、`:104`；figma-demo 的 blueprint/schema/builder；magicpath；muse-proto-gen/SKILL.md `:52`、`:65`；muse-loop-orchestrate/SKILL.md `:137`、`:183` | source/LOCKED/STATE/DECISION、QA、独立 AC 判官与 Loop 人类卡点保留；共享视觉值撤除后状态反馈、事件真实执行与 reduced-motion 仍有 owner。PASS（源码）；未以 skill 名称存活代替行为核对。 |
| P-19 | 删除的 figma-layer body/command/alias；路由/visibility/graph 差分；test-design-tool-retirement.mjs `:35`、`:57` | 仅退役本仓重建写入链，普通 Figma 话题和历史产物不被删除；不声称 OD Figma 已验证。PASS（源码）。 |

S1/S2/S4/S5/S6/S8/S9 的其余对照未发现确定性缺失：外部 DS 权限保留，中立包不注入旧技术映射，只有高置信推荐且待真实选择，低/无匹配可直接 none，页面/区域/框选带当前版本 PNG 与位置，UX 业务模块仍保留。S3 页库资产 B1 为 USER_WAIVED；S7 发布与最终门尚未闭合。

## 新做的窄验证

1. `node /private/tmp/p6-spec-frozen/scripts/test-design-flow-handoff.mjs --mutation`，exit 0。覆盖完整源 body、none/confirmed 边界、独立调用方确认 witness、截图版本和坐标、精确授权目标、实际 readback 每个文件字节；确认 guard、none 附件排除、准确目标授权、缺附件读回和导入入口变异均失败，恢复后通过。这是冻结脚本的本地证明，不是 B1 重验或外部接通证明。
2. `node /private/tmp/p6-spec-matcher-probe.mjs`，exit 0，得到上方生产评分器缺读 PASS 反例和删除 declared target 的 FAIL 对照。完整结果见 probe JSON。
3. 精确 131 path/hash 在报告前再核一致；未把更晚的 OD 收据或预算 delta 混入当前对象。

## 尚未闭合的门

- **SPEC-I1：未修复。** 必须修复并以新 scorer/context 身份冻结；旧票不改分，失败保留。
- **真实 CLI：未完成。** 本 reviewer 未读父 live 结果；不能从字段模拟或本地 trace 得到 harness 成功。原 16 票配额与后续用户对剩余票的授权须由父按真实尝试逐格核验，不能重跑 first/best-of 抹掉失败。
- **真实 OD：本报告未核验。** 父已通知存在新 receipt 与原始 HTTP 材料，留待源码报告后的明确 external closure；不在此预先判 PASS。即使确认 STAGED，也只证明新测试目标收到材料，不证明生成、回收、Figma 或外部 DS 合规。
- **最终预算与发布：未完成。** 当前对象是收紧前版本；须最终预算 delta、对应 mutation/full verify、独立闭合和精确 staged snapshot。此时不能据当前报告 commit/push。
- **B1：USER_WAIVED。** 不是 PASS，不恢复为阻断，也不追加其已知 concern 为新 finding。

审查执行状态：**DONE_WITH_CONCERNS**。源码 Spec verdict：**FAIL（仅 SPEC-I1 为新增源码阻断项）**；其余外部/预算/发布门维持明确未闭合。
