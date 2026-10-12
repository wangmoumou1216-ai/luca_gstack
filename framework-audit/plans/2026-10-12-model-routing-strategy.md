# Codex / Claude 模型路由改造决策计划

日期：2026-10-12。plan_id：`routing-native-first-20261012`。
范围：`NO_PIN/framework/model-routing-strategy`。源码基线：`b9b96d48cf389997949310d45c5e774c7aeddeb1`。
来源：用户原话「从价值和第一性原理出发。你思考清楚了，codex和claude 的建设思路。告诉我一个你经过专家会审，和双相钢人的一个改造计划。」
状态：**计划文档已形成；全部实施单元 PLANNED，未获实施批准。** 本文不是可无人值守执行的授权票。计划身份、咨询原报告、最终独立审查结果存于同目录 `2026-10-12-model-routing-strategy.evidence.json`，以文件 SHA 绑定。

## 1. 决策与第一性原理

推荐：**两端都以原生模型配置为默认；框架重点建设验收与可追责的执行。迁移先不对称：Claude 退役重复的中央档位规则；Codex 冻结扩张，保留已证明必要的验收核心，再凭对照结果决定进一步收缩。**

「只对 Codex 路由，Claude 释放」适合作为过渡，不宜写成长期信仰。Codex 有已部署的保护值得暂留，不能据此推出动态换模型净收益很大。Claude 释放的是重复选模义务，不是独立审查、用户决策和失败阻断。

目标不是每个任务都选到理论最强模型，而是以更低的总负担完成合格任务：

> 净价值 = 合格完成的收益 − 模型用量成本 − 等待 − 返工 − 人工打断 − 框架维护与恢复成本。

这是决策框架，不是可把未测量项塞入权重的打分公式。先比较验收质量，再在质量可接受的方案中比较成本；不同量纲不随意相加。当前缺少代表性任务分布、对照结果、维护工时和准确用量计费，因此**不能声称任何路线已经证明大幅省钱、提质或提高 ROI**。

三种机制必须分别判断：①模型/推理强度选择；②拆分、委派和上下文组织；③独立验收、真实完成核验与失败阻断。即使模型完全相同，冷启动审查仍可有价值；不能把③的收益全归给①。

更小替代：不建第二个 adapter、不重写状态系统、不加新评估平台，先保留当前关键验收，删除被证实重复的选模要求。若原生无法保持关键保证，保留最小框架补充；若动态选模没有独立收益，停止扩张。已投入工程量不是保留理由。

## 2. 当前事实、能力边界与不确定项

| 证据 | 能支持的判断 | 不能支持的判断 |
|---|---|---|
| `model-routing.yaml`、Codex hook/runner/host 与 9 月 30 日 DEPLOYMENT | Codex 路由及证据核验确已部署；Claude common adapter 延期，旧档位约束仍有消费者 | 今天所有入口仍全量无故障；Claude 完全没有原生选模能力 |
| hook 强制关键审查 `fork_turns=none`；host 核对同次采用/完成 | 独立性和实际执行证据有明确实现 | 更强模型本身一定提升审查效果 |
| resolver 按用户批准的相对顺序选 anchor/peak/light | 约束批准范围与相对关系 | 任务级能力排名、实际价格预算或最优动态决策 |
| 历史 REPORT 记录污染、关系不明、锁与恢复问题 | 有真实保护需求，也有框架自身引入的复杂度 | 全部修复都算路由创造的收益 |
| 原生配置文档 | 能做配置、继承、部分覆盖 | 已实现你需要的强制证据闭环，或会自动按任务最优选模 |

Codex 原生已提供子代理的模型、推理强度和继承配置；本框架无需再复制一份通用模型目录。原生配置与实际采用的证明仍是两件事。[Codex 子代理](https://learn.chatgpt.com/docs/agent-configuration/subagents)

Claude 原生有子代理模型配置与优先级、skill 的 `model` 字段，`opusplan` 提供指定场景下的规划/执行切换；adaptive reasoning 是推理计算调整，不等同任意任务的智能换模。`recommended-model` 自定义元数据不能当作原生执行保证。[Claude 子代理](https://code.claude.com/docs/en/sub-agents)、[Skill](https://code.claude.com/docs/en/skills)、[模型配置](https://code.claude.com/docs/en/model-config)

Advisor 是实验性咨询能力，采用完整对话输入且由主模型决定咨询时机；它不能直接替代冷启动、独立、强制的质量门。本机 CLI 为 2.1.296，当前账户 Advisor 可用性未实测；本计划不依赖它。[Advisor](https://code.claude.com/docs/en/advisor)

## 3. 双向钢人及专家结论

两位专家分别以空白上下文审查同一个冻结 brief；第二位未收到第一位意见。两位都是同一已批准 peak 模型的独立调用，**这证明上下文独立，不代表跨模型或真人专家共识**。

| 立场 | 最强主张 | 对方最强反驳 | 什么证据会推翻它 |
|---|---|---|---|
| 保留框架控制 | 高损失决策值得较小额外审查成本；配置不能证明真实执行；关键失败后应阻断依赖工作 | 多数理由支持的是验收；相对排名、状态锁、同步矩阵也引入维护和故障，动态换模收益尚未证明 | 更简单实现保留同等保证，实际结果不差且总负担更低；或选模没有独立增益 |
| 原生优先 | 原生不断提供配置、继承和委派；删除重复规则能减少协调负担；把复杂度用于可验收结果 | 原生接口存在不等于已安装且覆盖全部入口；一次错误完成或上下文污染可能抵消节省 | 关键保证无法实现，出现质量退化、用户选择被覆盖，或节省被返工和恢复成本吃掉 |

控制派建议 D（最小折中）；原生派建议 C（长期原生优先）+ D（先小试验）。共同否定「看到 API 就立即撤防」，也不支持「已投入所以永久保留」。本计划采纳这一交集，同时保留可被结果推翻的条件。

审查原票完整保留：控制派咨询为 **FAIL 1/4**，因为输入还没有终版计划，迁移与撤防证据 UNKNOWN；不能重写为通过。原生派为**咨询输入 PASS 3/3**，也不构成实施验收。另由第三次全新冷审验证本文的计划完整性；最终状态只在 evidence 文件记录，不把未来测试写成已通过。

## 4. 建设边界与保护迁移表

| 对象/保证 | 近期动作 | 删除或替代前提 |
|---|---|---|
| 用户选择主模型、effort 与获批模型范围 | 两端保留；不以任务复杂度擅自覆盖主模型/effort | 未获用户明确改变，永不作为优化对象 |
| 冷启动审查、冻结输入、独立验收 | 两端保留；允许同模型冷审 | 相同输入污染/身份错配反例通过，才可更换承载机制 |
| Codex 同次采用/完成与关键失败阻断 | 冻结扩张、保留当前实现 | 等价替代验证通过且独立审查后，另提最小撤除范围 |
| Codex 相对 model order / peak / light | 暂留现有已批准配置；不扩新档位/新入口 | 分离审查因素的对照显示选模有净收益，才扩；无证据则维持或收缩 |
| Claude 旧 Fable/档位白名单、强制传参、推荐元数据同步 | 列全消费者后退役重复义务，按同一批次修改相应检查规则 | 逐项证明是过期选模约束，而非仍有效的质量、权限或预算保护 |
| Claude 关键 judge 的原生 model 默认、普通代理 inherit | 先保留有意设置的 judge 默认；普通任务默认继承；逐例审查例外 | “释放”不等于一键清空所有原生模型 pin；按用户许可及实际替换行为验证 |
| 项目隔离、source trust、既有 hooks/runner 其他职责 | 全部保持；不因路由瘦身一起删 | 不在本计划的优化范围；尤其 hook 兼有项目关联逻辑 |
| common v2 schema、generated context | 初期不改 `scope: common`，不为命名整齐搬文件；生成文件从 owner 重建 | 真要改 schema/路径需单独协调全部 parser/consumer 与迁移测试 |

建设重心：Claude 采用轻量原生适配，保留任务合同与验收；Codex 重点是让现有证据、失败原因和恢复路径更少打断。不能把“共享验收原则”膨胀成另一个跨平台大引擎。

## 5. 分阶段改造单元（全部未执行）

复杂度：Standard，Sequential Chain + 关键阶段 Supervisor。每个执行单元一个主责执行者，独立 peak 负责检查；在 Codex 语境 `model_tier` 为 common role（anchor/peak），不恢复 Claude 旧 Fable 白名单。用户 effort 独立。两端运行能力和角色映射在实施时重新核验。

所有单元 Source 均为本文顶部用户原话。单元关系是规划顺序，**不是 ready 队列**；精确文件清单、外部效果与真实批准完成前不派发实施。DEV/task-plan coverage 不适用：这是框架策略改造，不是产品开发卡编译。

### U001 — 冻结消费者、保证与执行范围

- Dependencies：None；Owner/model_tier：主控 anchor。Status：PLANNED。
- Goal/Approach：将旧 Claude 每条选模义务映射到消费者、保护理由和替代方案，区分需要保留的安全保证，列出精确修改文件与 preimage SHA。
- Files：只创建后续约定的审计清单；生产候选读取下表，不修改生产。Read List：下表所有候选、当前 model-routing/cross-harness 合同、project-verification。
- Test scenarios：正常消费者闭合；生成文件 owner 不明；发现新的安全依赖。
- Verification：定向 `rg` 逐条追溯旧 tier/recommended-model 强制消费者，人工核对每条义务有落点；新安全依赖留存并缩小改造，禁止为了清单闭合删除检查。
- Output/Gate：有限且精确的文件、修改目的、测试/外部效果清单和差异草稿。批准 U001 不授权未知后继文件；U002 前对具体 patch 范围取得批准。

候选集合（调查范围，**不是批量写入授权**）：

| 类别 | 已知入口 |
|---|---|
| 策略与操作合同 | `.claude/skill-os/model-routing.yaml`、`.claude/agents/plan-agent.md`、`.claude/agents/orchestrator.md`、`.claude/agents/quality-gate.md`、`.claude/skill-os/runtime/cross-harness.md` |
| 检查消费者 | `scripts/check-model-table.mjs`、`scripts/check-registration-sync.mjs`、`scripts/fusion-preflight.py`、`memory/scripts/daily_governance.py` |
| 派生登记 | `.claude/skill-os/agent-context-manifest.json`、`scripts/build-agent-context.py` 的产出；受影响 skill/agent 精确名单由 U001 冻结，不能以目录通配符授权 |
| Codex 保持基线 | `.codex/model-route-hook.mjs`、`.codex/workflow-runner.mjs`、`scripts/model-route.mjs`、`scripts/model-route-host.mjs`、`.codex/MODEL_ROUTING.md` |

### U002 — 制作 Claude 最小解耦 patch

- Dependencies：U001 PASS + 精确范围批准；Owner/model_tier：执行者 anchor，冷审 peak。Status：PLANNED。
- Goal/Approach：按冻结清单退役重复强制规则，同时替换旧检查预期；保留原生 judge 默认、项目隔离和全部有效保护。先制作可 review 的本地 patch，不直接改用户全局配置、trust 或运行中绑定。
- Files/Read List：只允许 U001 明列且获批的策略/合同/检查文件与对应测试；generated 文件从 owner 生成；若新增消费者，回 U001 增量冻结。
- Test scenarios：正常 inherit/显式 pin；旧推荐元数据缺省；失配配置、不可用模型与 allowlist 替换；检查器仍发现有效保护缺失。
- Verification：执行 A01–A04，逐项审查保护迁移表；完整冻结实际运行断言后方可称工程计划可执行。
- Output/Gate：最小 patch + 更新后的合同与检查证据；禁止用删除整个 checker 或放宽 source trust 获得通过。

### U003 — 验证两端真实行为与回退

- Dependencies：U002 PASS + 当前实例/驱动/fixture/外部运行预算获准；Owner/model_tier：执行者 anchor，独立验收 peak。Status：PLANNED。
- Goal/Approach：现有自动测试验证机制，再用获准账户/入口的最小真实调用验证模型采用与完成；native 与 runner 分开，不以模拟测试替代生产证据。
- Files/Read List：U001 冻结的现有测试文件及最小新增 fixture；project-verification、实际 hook/runner/host 与验收合同。
- Test scenarios：同模型冷审与换模型；普通继承与显式选择；用户 effort/权限不变；未知关系拒绝、light 退回 anchor；缺失完成/旧票/跨调用冒认/未决关键失败继续执行均被拒绝；Claude 实际替换可见；清理后证据可读。
- Verification：A01–A04 及按实际驱动冻结的 A05；在每条 live TEST 前记录版本、实例身份、before/after、实际采用、退出/完成事件与 cleanup 范围。任何必需场景缺证据为 GAP，禁止通过。
- Output/Gate：全部必要保证 PASS + 回退演练；原生未覆盖的保护保持旧实现，不以测试成本大为由撤除。

### U004 — 小规模比较净收益，分离模型与验收的贡献

- Dependencies：U003 PASS + 用户认可代表性任务样本与时间/用量上限；Owner/model_tier：主控 anchor，结果冷审 peak。Status：PLANNED。
- Goal/Approach：先比较原调度与简化调度，保持模型、effort、任务输入、工具、验收标准和审查次数相同。若普通继承改变了模型，则归为另一实验，不能混入“只测调度”结论。
- Files：使用普通审计表和原始结果文件，确切路径冻结于 U001；不创建新评估系统。Read List：本节、eval-methodology、U003 原证据。
- Test scenarios：每端选择有限事实检索、常规执行、高风险审查各 1 个真实代表任务；最多 **6 个配对任务（12 次执行）**，最多补 **2 个歧义配对**；这些是建议上限，不是统计显著性或现已批准预算。
- Verification：事先冻结输入/质量 rubric；交替运行顺序，隔离输出，记录版本和缓存条件，盲审结果。记录完成质量、墙钟时间、人工打断、返工、维护/恢复分钟及可得用量；价格未知则留空。两端分别报告，不混合算平均胜率。
- Output/Gate：无关键保证失败，简化方案质量不劣且至少一项实际负担下降、其他代价可接受，才建议推进；结果相当时偏向更少规则。结果不确定不扩样成无底洞，停止扩张、保留现状。小样本只筛方向，不能证明稀有安全事故不存在。
- 若仍怀疑模型选择有价值：另列最多 2 个配对任务，只改变模型、固定审查流程和 effort，确认可用模型及用量上限后再执行；不借模型提升为更复杂的调度背书。

### U005 — 独立决策并分端启用最小结果

- Dependencies：U003/U004 原始证据 PASS + 当前 patch 冷审 + 生效范围真实批准；Owner/model_tier：主控 anchor，冷审 peak。Status：PLANNED。
- Goal/Approach：先决定 Claude 解耦是否成立；Codex 单独判断保持、收缩或提出后续试验。不要求两端同一天迁移。
- Files/Read List：仅最终获批 patch、冻结测试证据与精确生效/回退清单。无 Git commit/push、全局账号修改、绕过 trust 或自动清锁授权。
- Verification：A05–A06；检查无在途 critical invocation，保存当前策略/合法绑定/trust 版本及历史票；source guard 变更走既有精确 review/retrust，不能将整仓加入免检。激活后再验证必需真实入口。
- Output/Gate：行为验证通过才能宣布迁移 DONE；否则旧保证继续有效。关键审查适用范围的缩减不是此轮附带动作，需单列决策与反例证据。

## 6. 断言、停止条件与回退

以下 A01–A04 是已存在的可执行回归入口，**本轮未运行，也不声称它们已覆盖全部新要求**。U001/U002 冻结缺口 fixture 与每条 MUST 的对应测试；不能只靠语法、grep、文件变小或历史 PASS 验收。

```bash
# [BLOCKING] A01 — 选模、证据绑定、关键失败与冷审回归
node scripts/test-model-route.mjs && node scripts/test-model-route-host.mjs && node scripts/test-codex-model-route-hook.mjs
# [BLOCKING] A02 — runner 与 harness 边界回归；模型模拟不代表真实账户执行
node scripts/test-workflow-runner-runtime.mjs && node scripts/test-harness.mjs
# [BLOCKING] A03 — 策略、登记与派生上下文一致性
node scripts/check-model-table.mjs && node scripts/check-registration-sync.mjs && node scripts/check-agent-context.mjs
# [BLOCKING] A04 — 当前仓库要求的集成校验
bash scripts/verify.sh --ci
```

- **A05（BLOCKING，当前未冻结为可执行断言）**：U003 的所有真实行为场景须由已批准 current-instance driver 执行。当前没有最终 patch、精确 fixture 或账户预算，不能编造命令/receipt；这阻断 U003 实施，不阻断本策略计划交付。
- **A06（BLOCKING，当前未冻结为可执行断言）**：按精确回退清单演练恢复原策略，验证正常任务可继续、未决关键失败仍阻断、旧票不会成为新票、source guard 不被绕过。批准激活前补齐命令与真实证据。

停止：任何冷审污染、错认完成、权限/effort 漂移、关键失败后继续、必要证据缺失，立即停止候选生效；质量退化或预算用尽停止试验；连续两轮关键验收失败只重规划受影响单元，不能无限修到“通过”。

回退：暂停新派发，保留失败现场与原始票据；恢复精确批准版本的策略、配置与对应 source-trust 记录，并通过原有合法恢复路径处理状态。**不清空锁、不删除未决关键失败、不手填模型相对顺序、不用旧 accepted 票冒充新调用。** 活跃调用不能安全处理则先停在原状态，由现有恢复合同解决，不强行切版本。

## 7. 本计划的独立审查标准与授权边界

计划完整性审查 C1–C6（均 BLOCKING）：

1. C1：区分原生已提供的能力、本框架已部署的保证、尚未测量的净收益；不虚构当前账户能力。
2. C2：两方强论据、相互反驳、自我推翻条件真实存在；不把旧咨询票改写为本计划通过。
3. C3：每项拟退役约束有迁移门；关键验收、用户选择、项目/source-trust 保证保留；不偷渡扩大或缩小范围。
4. C4：先冻结有限文件/效果/输入身份再批准实施；当前只交付计划，不假称 U001–U005 或 A01–A06 已完成。
5. C5：对照试验有固定验收、有界数量、质量优先和未知项处置；不混淆模型与调度因素，不建设额外平台。
6. C6：失败、回退、历史票与在途调用处理可操作；缺 live 断言与预算明确阻断实施，不被当成计划已证明安全。

最终冷审 PASS 仅表示该策略计划可供用户决策；**不表示实现已通过，也不自动授权实施**。后续以 U001 形成的具体范围补齐 A05/A06、计划身份和批准记录；用户无需为同一已批准范围重复确认。计划本文未触碰生产路由、私有绑定、用户 effort、项目或全局模型配置。
