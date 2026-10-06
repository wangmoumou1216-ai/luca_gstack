# 问题复核裁决

2026-10-06；目标 `/Users/luca/Desktop/luca_gstack` @ `d211bd3c1479720836219b035ec9963d278efa49`。本报告依据真实源文件、E1 独立运行和 E2 独立合同审查；专家为原生独立 AI 子代理，不是外部真人专家。

## 结论

确认或收窄为 **7 项可修复问题：3 项 P1、4 项 P2**。其中 F1/F2 有真实 writer 的独立运行证据；其余为指令/交接契约问题，没有宣称已在生产运行中发生。另有 R6 一项 P3 方法论张力，作为明确的设计取舍提案，暂不自动修改。

| ID | 最终判定与优先级 | 具体成立范围 | 主会话处置 |
|---|---|---|---|
| F1 | CONFIRMED · P1 | 已有 YAML 损坏，中央 writer 吞异常后把状态当空对象写回，CLI 仍成功；节点、topic、组合入口均复现 | 接受；U-001-a/b |
| F2 | NARROWED · P2 | 两进程读同一项目旧快照再先后提交，前一节点丢失；未观察到当前原生编排并发事故 | 从上一轮 P1 降为 P2；与 F1 同批修复，不能只加 rename |
| F3 | CONFIRMED · P1 | 没有名为 task() 的 API 时允许把内部推理当 Oracle，与独立审查要求矛盾；是否真的发生旁路未实跑 | 接受；U-002 使用现有独立 draft-review 职责，缺能力停门 |
| F4 | NARROWED · P2 | auto 为每个 WA 建子任务并启动，包含交互技能；canonical Plan/orchestrator 的 main_agent 分支能保护正确执行 | 从上一轮 P1 降为 P2；U-003 对齐执行上下文，不称已观察用户决定丢失 |
| F5 | CONFIRMED · P1 | tech-spec 接受纯工程 CONV 来源并建议 task-plan；task-plan 无条件要求 PRD/Brief，合法工程链因此缺接入合同 | 接受；U-004 补显式来源分支，保留 MUST 和普通设计门 |
| R6 | NARROWED · P3 | 步骤不减少就否定的措辞，与决策增强和有理由例外存在张力；无产品失败证明 | D-001 最小措辞提案，保留收益/风险举证和用户选择；不当运行 bug |
| R7 | NARROWED · P2 | 原件不支持桌面回收是有意保护，Phase 1 已有前置指针；真正冲突是通用桌面默认/失败回落仍覆盖该分支 | 撤回“无早期披露”的推断；U-005 只对齐入口和恢复分支，不开发桌面原件能力 |
| F8 | CONFIRMED · P2，新发现 | QG 一律 ≥3 方案，会与合法轻量/标准档位冲突；不是已经实跑的误拒事故 | U-002 一起按 producer 的 scope matrix 对齐，防修 F3 时引入新阻塞 |

## 运行证据与反证

E1 实际运行未修改的 `write_state.py`，SHA `2c1caf…f2ad` 的完整值保留在 `E1-tool-evidence.json`：

- 损坏 YAML：node-only、topic-only、两者一起调用，均 exit 0 且历史 iteration/custom/seed/节点消失；有效 YAML、缺文件初始化的对照成立。
- 并发：仅在实际 `yaml.safe_load` 读取完成后用事件控制调度，两个真实写入进程拿到同一快照；idea 先提交、redteam 后提交，最终只有 redteam。两进程均 exit 0。顺序对照保留两节点。这证明该合法交错有缺陷，不等于观测到原生并行调度事故。
- 调用方：redteam 原始命令在 writer 失败时仍 exit 0、stderr 被隐藏，仅打印跳过。共八个可执行 caller 存在相同吞错；ux-audit 还有独立内嵌 writer，不参加中央事务。
- 既有 `test-workflow-state-guard.py` 仍 ALL PASS，因为当前 TARGETS 只有 ux-audit，不覆盖中央 writer。测试通过不能否定 F1/F2。
- 项目选择的锁保护 session sidecar，不保护此读改写文件。串行使用可避开 F2，不能修复 F1。

E1 独立票 `wf-20261006-e1-facts-v1`，审查完整性 PASS 3/3；原生 invocation `7a1101e1-85d9-4d6d-b149-5fbb4f152d26`，role=peak，accepted。完整命令、结果、临时清理与源 hash 在 E1-tool-evidence.json；最终报告与同次收据在 E1-review.md / E1-native-receipt.json。

## 静态合同证据与反证

以下路径相对上述目标根；具体原文和读证据见 E2-tool-evidence.json。

- F3：brainstorm/SKILL.md:538–541、ux-brainstorm/SKILL.md:499–502；反向约束为 routing-chain-check.md:60–64、model-routing.yaml:49–56,98–100；codex-viability.yaml:53 仍允许 inline Oracle。foreground 标签、后续 QG 都不能把作者自检变成独立票。
- F4：auto/SKILL.md:120–129,143–193 真正启动 WA；保护为 plan-design-guidance.md:33–48,125–126、orchestrator.md:140–148。修 auto 的 source，不建立第二套调度。
- F5：tech-spec/SKILL.md:69–78,137,349；task-plan/SKILL.md:76–100；input-modes.yaml:280–288 和生成视图；implement/SKILL.md:48–54,88 继续要求 canonical TS+TP，不能绕过 TP。TP 的拒绝有保护目的，但缺合法 CONV 分支。
- R6：ai-native-design-framework.md:168–178；反证在该文件:102–115,125–140 及 ai-native-taste-anchors.md:131–132,641。不是整套方法只看步骤，也不是所有等步数方案都会被程序自动拒绝。
- R7：open-design/SKILL.md:94–98 已指向 page-context §7；该 owner:244–249 明确限制，helper:120–131 拒绝桌面。冲突在 OD:75–79,216,223–234 的普通默认/回落。不得删除 helper 防护换取表面通路。
- F8：quality-gate.md:201–206 与 brainstorm/SKILL.md:462–466、ux-brainstorm/SKILL.md:408–410。合法两案与轻量缺书面方案节应按各自 tier 验证；UX Standard/Deep-feature 的三案要求不能随修复被放宽。

E2 独立票 `wf-20261006-e2-facts-v1`，审查完整性 PASS 6/6；37 个已冻结文件 hash 与目标 HEAD 一致，原生调用 accepted。无 audited skill/preamble 执行、无 live OD/network 验证。最终报告与同次收据在 E2-review.md / E2-native-receipt.json。

## 专家共同支持的修复边界

1. 状态完整性必须覆盖读取错误、锁、原子提交、topic 投影、调用方退出码及旁路 writer。
2. 独立票必须独立；在正确阶段使用原审查维度，按真实 scope 验收，不用更多空壳方案凑数。
3. 来源模式可以不同，MUST 的可追踪性、独立测试、人类决定与执行批准不能减少。
4. 原件模式按已有能力提前分流；不支持的路径保留拒绝，不默默切工具。
5. 完整修复计划见 PLAN.md；“问题专家同意”与“终版方案专家同意”分别留证，后者尚须对冻结版本完成冷审。

本轮没有修改任何生产逻辑或这些 skill。尚未运行的 dispatch、端到端工程链、OD 桌面、Claude runtime 不能标为 PASS。此前原型说明功能的已完成发布不因本轮新计划而重开。
