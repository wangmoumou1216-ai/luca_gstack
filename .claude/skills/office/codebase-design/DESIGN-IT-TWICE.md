# Design It Twice

仅当用户明确要求为选定 deepening candidate 探索替代 interface 时执行。普通深度诊断继续由
SKILL.md 处理。这里产生设计建议与真实选择，不直接实现。

## 1. 框定并批准只读设计 Phase

完整读取 SKILL.md 词汇与 DEEPENING.md。先向用户展示 candidate 的约束、每项依赖分类和证据、
seam 后应隐藏的行为，以及非提案性质的粗代码示意。
至少三名独立设计者意味着命中 ≥2 subagent Plan 条件：在派发前完整读取
`.claude/agents/plan-agent.md`、`.claude/agents/orchestrator.md` 与
`.claude/skill-os/routing-chain-check.md`，按现有 Plan/Orchestrator 取得具体只读设计 Phase、
有限读范围、设计输出落点和成本的真实人类批准。未批不派发；既有同一 payload 的有效批准可复用。

## 2. 至少三名真实独立设计者，严格串行

派发前读取 `.claude/skill-os/model-routing.yaml`，使用已登记 native 身份和角色，不写死模型。
每位 `fork_turns: none`，峰值运行数为 1；前一位真实完成且同次 invocation 的 accepted
回执闭合后才派下一位。准备中、pending、关键失败或缺票均暂停，不以作者扮演三个角色补票。
后者不读取前者方案或作者结论。

每位收到同一套冻结技术事实：绝对文件路径、耦合证据、依赖分类、当前 interface/caller、
所需行为、不变量、SKILL.md 的八词词汇及已授权项目词汇。共享事实不得随设计者偏好改变。
另给各自不同设计约束：

1. 最小 interface：1–3 入口，最大化每入口 leverage。
2. 最大灵活性：支持需求中真实存在的多种用例与替换点，列明成本，拒绝无证据扩展。
3. 最常见调用者：默认路径最简单，把罕见复杂度藏进 implementation。
4. 可选：仅存在真实 cross-seam 变化时增加 ports/adapters 方向。

每案必须产出：types/methods/params；完整 invariants、ordering、error modes、配置/性能约束；
调用例；隐藏 implementation；依赖/adapter 与测试策略；高/低 leverage 及 trade-offs。
三案需要不同 interface 形状，改名的同构方案不足以完成。

## 3. 逐案展示、比较和真实选择

逐案展示后，按 depth/leverage、locality、seam placement 比较，明确推荐最强方案和理由；
必要时提出有来源、无无证据扩量的 hybrid。等待用户选择，不能把推荐当采纳。
保留冻结 briefs、实际 native IDs、起止时间、完成/accepted 回执、峰值 1、比较与用户选择。
用户未选时返回 NEEDS_CONTEXT。设计选择只关闭设计门；实现仍需原工程 owner 的精确授权。

来源：mattpocock/skills source03 DESIGN-IT-TWICE，MIT，当前 pin 同 SKILL.md；上游并行/展示后
立即派发被本地真实批准、独立冷启动和严格串行合同替代。

<!-- FILE_END: codebase-design/DESIGN-IT-TWICE.md -->
