# ORCHESTRATION-INTEGRATION — 新能力编排集成规划

> GATE-2 附加指令（2026-07-12）：「新增的 skill 要深度规划进复杂任务/简单任务的 workflow，
> 不能新增了就完了，要完美落入使用场景和流程。」
> 本文件把 FM-11 的"采纳≠可达"从**路由层**扩展到**编排层**：每个获批能力给五件套——
> **简单任务触达**（平凡任务/单点诉求怎么到它）/ **复杂任务位置**（Plan Agent→Orchestrator→
> workflow-graph 的哪个节点）/ **场景适用**（A/B/C/D）/ **登记动作**（治理轨道六动作的哪几动）/
> **可达性验收**（落地后怎么实测"真的会被用到"）。
> 编排原则不变：Skill-first Graph-optional——所有集成是"推荐路径上的可达"，不是强制 gate。

---

## 0. 一张图：新能力落进现有使用流的位置

```
【简单任务流】用户一句话 → route-guard 词表/语义兜底 → 单 skill 直达
   ├─ "调试/报错/复现" ────→ systematic-debugging（诊断 port 后含 4 新机制）
   ├─ "深模块/seam/模块边界" → codebase-design（新词条）
   ├─ "merge 冲突/rebase 冲突" → resolving-merge-conflicts（新词条）
   ├─ "tdd/测试驱动/红绿" ──→ tdd（既有词条，刷新后含 seam 门+tautological）
   ├─ "代码体检/清理" ─────→ code-hygiene（增强后含双轴审查+会咬条款）
   └─ "查一下X/帮我调研Y(轻)" → 轻量研究 skill（下批新建，词条+语义兜底）

【复杂任务流】Plan Agent（5条件）→ Orchestrator → Phase/WA
   ├─ 研究阶段：研究默认门三档位 —— spike < **轻量研究(新)** < deepresearch/ux-research
   ├─ 工程规格：tech-spec 增 seam 前置步（后批）—— 词汇由 codebase-design 供
   ├─ 任务编排：task-plan 增竖切判准+宽面卡型（后批）；plan-agent 增 fog 区（后批）
   ├─ 实现 Phase：WA 遇 bug → systematic-debugging（多假设排序+[DEBUG-]纪律，port 后）
   │              WA 写测试 → tdd（seam 确认门）；WA 改护栏/checker → code-hygiene 会咬条款
   ├─ 质量 Phase：code-hygiene 双轴分派（有 spec 上游时 Standards/Spec 并发）
   └─ 收尾：handoff 脱敏行（后批）；FUSION worktree 冲突 → resolving-merge-conflicts

【框架建设流】（meta session）
   ├─ 写/改 SKILL.md → **skill-authoring.md(新)**（正面手艺）+ skill-invariants（保护区）
   ├─ verify 门 → check-registration-sync（下批新 checker）+ 既有 parity/routing tripwire
   └─ 采纳/演进 → FUSION-RUNBOOK（步③引 skill-authoring；步⑧冲突引 resolving-merge-conflicts）
```

---

## 1. 首批四项的编排集成（本轮落地）

### 1.1 codebase-design（install）
| 维度 | 集成 |
|---|---|
| 简单任务触达 | routing 词条：`深模块/模块边界/seam/接口可测性`（纯工程词——红队裁定不收设计词，防劫持设计管线）；语义兜底：用户谈"模块怎么切/接口怎么设计"且语境是代码 → 建议读它 |
| 复杂任务位置 | ① 它是**词汇 primitive**，被动被引：tech-spec seam 步（后批）、code-recon deletion-test（后批）、tdd seam 门（同批）、systematic-debugging port 的 seam 诚实度（同批）都引用其词汇——**同批两个消费者即时成立**；② 技术实现 Phase 的 WA 做接口设计时按 routing hint 读取 |
| 场景 | 工程执行线（A/B/D 的实现段）+ 框架自建 |
| 登记 | routing-map 词条（双仓）+ external-skills/INTEGRATION-MAP.md 行 + ADOPTED.md/adoption-log；不进 /office（非设计管线一级 skill，对齐 tdd 先例）；model-routing 免（被动引用型，无 dispatch 节点） |
| 可达性验收 | FM-11：route-guard 对「帮我看看这个模块的 seam 放哪」能 surface 词条；grep INTEGRATION-MAP 有行 |

### 1.2 resolving-merge-conflicts（install）
| 维度 | 集成 |
|---|---|
| 简单任务触达 | routing 词条：`merge 冲突/rebase 冲突/解决冲突/冲突了` |
| 复杂任务位置 | 框架自身运维的两个固定摩擦点显式接线：① FUSION-RUNBOOK 步⑧（squash-merge 遇冲突→一行指针）② sync-upstream 双仓合并说明（一行指针）。Orchestrator 的 WA 遇 git 冲突时经 routing hint 触达 |
| 场景 | 框架自建 + 工程执行线 |
| 登记 | routing-map 词条（双仓）+ INTEGRATION-MAP 行 + FUSION-RUNBOOK/相关文档各一行指针 + adoption-log |
| 可达性验收 | FM-11 词条实测 + FUSION-RUNBOOK grep 到指针 |

### 1.3 tdd（刷新，不留副本——用户拍板）
| 维度 | 集成 |
|---|---|
| 触达 | 既有词条不动（tdd/测试驱动/写测试/红绿重构…）；刷新后新增 seam 门与 tautological 反模式自动生效 |
| 复杂任务位置 | 既有：code-hygiene 显式让位"测试先行"；WA 实现 Phase 写测试时触达。新增有效性：seam 门与 tech-spec seam 步（后批）形成 spec-time/test-time 互补对 |
| 登记 | 仅 vetting-registry 追加备注（刷新+integration_note 漂移更正，append-only）；无新词条 |
| 可达性验收 | 刷新后 grep 安装目录含 seam/tautological 内容；旧 3 文件确认按用户裁决删除 |

### 1.4 诊断 port（4 机制 → systematic-debugging）
| 维度 | 集成 |
|---|---|
| 触达 | **零新面**：systematic-debugging 既有 weight-7 词条（调试/报错/根因/debug/排查/找bug/复现…）原样；port 后同一入口能力变强——这正是选 port 而非并装的编排优势（无双 skill 抢词） |
| 复杂任务位置 | 既有接线全保留：code-hygiene/code-recon/optional-workflow-graph 三处引用不动；WA 实现 Phase 遇 bug 的推荐路径不变 |
| port 内容 | M2 多假设排序（3-5 条可证伪+测前给用户）反其单假设锚定 / M3 [DEBUG-]打标+grep 清理 / M4 seam 诚实度（引 codebase-design 词汇）/ M6 hitl-loop.template.sh |
| 登记 | 全局 skill 文件改动 + vetting-registry 追加 port 记录 + adoption-log；**强制行为 A/B**（改的是全局 skill prose——A/B 场景=同一 bug 描述，验证 port 后模型产出多假设排序而非单假设直奔） |
| 可达性验收 | A/B 差分证实新行为 + 既有触发词回归不破 |

### 1.5 skill-authoring.md（新框架资产，gap① 已开）
| 维度 | 集成 |
|---|---|
| 触达 | **非任务 skill，是框架建设的 doctrine**。触达时刻=写/改 SKILL.md 或框架文档时：CLAUDE.md「Coding Discipline」节尾加一行指针（"写/改 skill 先读 skill-authoring（手艺）+ skill-invariants（保护区）"）——session 注入面一行，代价已在 GATE-2 批准的落地内 |
| 复杂任务位置 | ① FUSION-RUNBOOK 步③（实施/port prose 时）一行指针；② 与已装 skill-creator 的分工成文：创建流程走 skill-creator，质量标准查 skill-authoring，边界守 skill-invariants——三条腿在文件头互指 |
| 场景 | 框架自建专属 |
| 登记 | 新文件 + CLAUDE.md 一行 + parity 锚点（capability-parity.json）+ gaps-register 把 GAP-skill-authoring-craft 记 addressed + adoption-log；1 次 whole-file A/B（六机制共用） |
| 可达性验收 | parity 双仓锚点绿 + CLAUDE.md grep 到指针行 |

### 1.6 code-hygiene 增强（双轴+Fowler+会咬条款）
| 维度 | 集成 |
|---|---|
| 触达 | 既有词条不动；增强自动生效 |
| 复杂任务位置 | 双轴分派的激活条件成文进 SKILL.md：**diff 审查存在 spec 上游（tech-spec/PRD）→ 同消息并发 Standards+Spec 两 agent；无 spec 上游 → 现行单轴不变**——简单清理任务零感知，复杂管线任务自动获得抗偏见结构。会咬条款挂在 Iron Law：凡 WA/主线程改 hook/checker/拦截脚本，完成判据升级（fail→pass 三段证据） |
| 场景 | 工程执行线 + 框架自建（改 hooks 时） |
| 登记 | skill prose 改动（双仓）+ A/B 一次且必须含护栏场景（红队交接约束）+ adoption-log |
| 可达性验收 | A/B 差分 + 改一个 checker 的真实场景实测模型索要 fail 观察 |

## 2. 已批后续批次的编排位置（落地时照此接线，防"新增了就完了"）

| 批 | 能力 | 编排位置（关键一条） |
|---|---|---|
| ④ | task-plan 竖切+宽面卡型 | 竖切判准直接改拆卡逻辑；frontier 注记供 Orchestrator Wave 调度参考——复杂任务的任务卡质量升级，简单任务不触 |
| ⑤ | plan-agent fog 区 | Deep tier 探索型长任务专用：PROGRESS.md 增可选 fog 节；与④frontier 共用语义；CLAUDE.md 指针行+parity 锚（红队指出的落地补全） |
| ⑥ | tech-spec seam 步 | 交互运行 AskUserQuestion 确认 / **headless（muse-loop dispatch）写清单不阻塞**——红队条件化设计保住编排器节点无计划外卡点 |
| ⑦ | brainstorm facts/decisions 行 | 逼问环居中规则，A/B/D 场景的 PRD 质量升级 |
| ⑧ | handoff 脱敏+suggested-skills | handoff-protocol（P4 只增）+CLAUDE.md checkpoint 面；workflow 模式必写 handoff 的场景自动获益 |
| ⑨ | CHANGELOG 约定 | 治理轨道第七动作（软）：生命周期变更记"变更+为什么"；daily_governance 复盘时人工遵守 |
| ⑩ | muse-triage 簇（fork） | verify-before-grill 证据呈给 GATE-1 裁决面；rejected-reqs 台账挂 `.luca/memory/`——muse-loop 入口 B 与独立入口 A 同获益 |
| ⑪ | domain-modeling 三点 | CLAUDE.md 写入时机+Oracle 行+decisions 三条件门——跨 A/B/D 的术语治理常驻 |
| ⑫ | code-recon deletion-test | brownfield 正门的架构 brief 增深化透镜（依赖 1.1 已装）|
| next | **轻量研究 skill（新建）** | **编排槽位=研究默认门第三档**：plan-agent「研究强度自适应」从两档改三档——`web spike（单点事实）< 轻量研究（单 agent+primary-source 纪律+落盘）< deepresearch/ux-research（多源共识）`；routing 词条（"查一下/快速调研"类）+ 语义兜底；deepresearch 降级链反向入口（重研究判定过重时降到它）。建 skill 本身用 skill-authoring doctrine + skill-creator 流程——**吃自己狗粮的第一个实例**。model-routing 三问：guided-execution 档（轻检索执行） |
| next | check-registration-sync | verify 门新 tripwire：接 package.json `check:registration` + verify.sh；每个一级 skill 在 7 登记面一致性校验——治理轨道从"六动作靠自觉"变"六动作有守门" |
| 归档待启 | GAP-issue-tracker-integration | 已开 gap 进 gaps-register open；下轮 evolution 周期 tracker 簇（to-spec publish/to-tickets blocking/wayfinder map/setup adapters/triage labels）按 fit-to-gap 重入 |

## 3. 验收总则（编排层 FM-11）

每批落地的 DONE 判据在 FUSION 九步之上增加一条：**编排可达性实测**——
1. 简单路径：用一句自然语言任务实测 route-guard/语义兜底能把用户带到新能力；
2. 复杂路径：该能力声明的 Phase/节点位置在对应权威文件（plan-agent/orchestrator/
   workflow-graph/SKILL.md）grep 得到；
3. 登记面：check-capability-parity + check-routing-map 全绿（registration-sync 上线后并入）。
不满足任一 → 该项 NOT-DONE（FM-11 语义扩展）。

<!-- FILE_END: ORCHESTRATION-INTEGRATION.md -->
