# /design-brief — 轻量交互文档与原型决策节点

> luca_gstack 的轻量交互文档节点。当不需要运行重型 `/ux-brainstorm` 时，基于
> PRD、UX 研究、UX 评审或用户直接粘贴的方案，
> 产出**可以直接做原型**的交互决策文档，含 12 状态覆盖、8
> 字段决策清单和 shadcn 组件映射表。

## 这个 skill 是什么

`/design-brief` 是 `/ux-brainstorm` 的轻量收敛替代路径，而不是代码交付节点。
它产出的是"原型前交互文档"——每一个交互点、每一个组件、
每一个状态，都有明确的决策 + 理由 + 排除的备选 + 接受的 tradeoff。

这份决策清单是 `/html-prototype` 生成原型的直接输入。

## 它解决的问题

- 方案太虚，做原型时还在"这个组件用什么好"阶段
- 决策只有结论没有 rationale，别人看不懂为什么这么做
- 没有"排除的备选"和"接受的 tradeoff"——这种决策叫偏好，不叫决策
- AI Native 功能的状态覆盖漏掉（思考中 / 低置信 / 拒答 / 部分完成 / 幻觉兜底 …）
- Agent 产品设计没有代理层（可见 / 可暂停 / 可接管 / 可撤销）

## 核心机制

### Phase A · 设计坐标系（新增，必须第一步）
开始任何决策之前，先明确四件事：
- 必须解决的问题
- 可借鉴的范式
- 不能碰的范围
- AI Native 方向（全局结论，每条决策必须引用）

### Phase 1 · 原生 AI 四层深度思考（升级）
从原来的两层（产品 + 交互）扩展到四层：
- **Layer A · 产品层**：AI 是否重构了决策路径？（N → N'）
- **Layer B · 交互层**：AI 原生路径长什么样？（N → M 步）
- **Layer C · 信任层**：用户凭什么相信 AI？（来源 / 置信度 / hedging）
- **Layer D · 代理层**：用户对 AI 动作的控制权（可见 / 可暂停 / 可接管 / 可撤销）

### Phase 2 · 假设挑战
识别方案核心假设，质疑最脆弱的假设，给出 fallback 设计。

场景 D 强制包含"用户信任 agent"的假设挑战。

### Phase 3 · 体验验证 + 12 状态覆盖
状态覆盖从 5 个传统状态（默认/空/加载/错误/成功）扩展到 **12 个**，新增
7 个 AI 专有状态：
- 思考中态 / 低置信态 / 拒答态 / 部分完成态 / 待 Steer 态 / 幻觉兜底态 / Agent 执行中态

### Phase 4 · 品味检查（4 锚点升级为 8 锚点）

**效率维度（保留原有 5 个）：**
- Ryo Lu / Linear / Attio / Notion / Raycast

**信任维度（新增 2 个）：**
- Perplexity（可追溯）
- Granola（诚实表达不确定性）

**代理维度（新增 1 个，场景 D / agent 功能强制）：**
- Cursor（动作可见 / 可暂停 / 可接管 / 可撤销）

### Phase 5 · 每条决策 8 字段完整化（新增）
每条决策必须包含：
1. 决策 ID
2. 组件/模式名称
3. 决策内容
4. 设计理由（必须引用具体来源）
5. **排除的备选方案**（≥ 1 条）
6. **接受的 tradeoff**（不为"无"）
7. 状态覆盖
8. PRD 约束引用

缺任一项，该决策不输出。

### Phase 6 · shadcn 组件映射表
每个交互区域映射到 shadcn 组件或自绘，附加对应决策 ID。

## 场景覆盖

- **场景 A** — 新功能设计
- **场景 B** — 已有功能优化（每条决策立即检查是否超出 prd-constraints）
- **场景 C** — 评审改版（基于 ux-audit 报告，轻量改版方向推导，超范围必须 AskUserQuestion）
- **场景 D** — Agent 化改造（**新增**，Layer D / Cursor 锚点 / 12 状态全部强制）

## 输入

- `docs/prd/*-prd.md`
- `docs/research/ux-research-*.md`（可选，提供研究和竞品维度）
- `docs/decisions/*-ux-brainstorm.md`（可选，若已运行重型 UX 方案）
- 用户直接粘贴的方案描述（可选，适合轻量模式）
- `docs/evaluation/*-ux-audit.md`（场景 C）
- `docs/prd/*-prd-constraints.md`（场景 B / D）

## 输出

`docs/decisions/YYYY-MM-DD-<topic>-design-brief.md`

## 示例产出

完整的端到端示例见 `examples/2026-04-23-ai-followup-design-brief.md`。

> 注：该示例顶部「前置依赖：native-design/… 与 inspired-design/…」是旧「原生推导 + 竞品启发」
> 双阶段管线的残留，当前 design-brief 已是单阶段收敛流程、无此两道上游产物（对应文件全仓不存在）；
> 阅读时忽略该前置块与正文里的 native-design/inspired-design 引用，只看 design-brief 本身的结构即可。

场景："AI 智能跟进建议"。这是 3 份示例里最全面的一份，展示了：
- Phase A 设计坐标系（必须解决的问题 / 可借鉴的范式 / 不能碰的范围 / AI 方向）
- 四层深度思考（Layer A/B/C 全填，Layer D 写 N/A + 原因）
- 假设挑战的 2 个核心假设 + 对应 fallback 方案
- **12 状态覆盖表的真实填充**（5 传统 + 7 AI 专有，9 个非 N/A）
- **8 锚点品味检查的具体判断**（每个锚点给出通过/不通过的详细理由）
- **5 条决策 × 8 字段完整化**（D-001 到 D-005，每条都有排除的备选 + 接受的 tradeoff）
- shadcn 组件映射表（含"对应决策 ID"字段，让下游 html-prototype 追溯）
- 交接块的命令式指示（确保 html-prototype 不漏 AI 专有状态）

**这是本 skill 集最重要的参考样本。**
新用户或外部设计师想理解"什么叫专业的 AI Native 设计决策文档"，
看这一份就够了。

**产出文件必须包含 12 节**（第 2/3/4/5/7 节名锁死，下游高级审查依赖；节清单唯一真值源 = SKILL.md Phase 7）：
1. 设计坐标系
2. 原生AI深度思考小结（节名锁死）
3. 假设挑战结论（节名锁死）
4. 体验验证结论（节名锁死，含 12 状态覆盖表）
5. 品味检查四锚点（节名锁死，内部扩展为 8 锚点）
6. 设计决策清单（每条 8 字段）
7. shadcn 组件映射表（节名锁死）
8. 可追踪完整矩阵（Phase 6.5）
9. Design Generation Packet（Phase 6.75）
10. Tool Consumption Contract（Phase 6.75）
11. REMOVED 记录
12. 交接块

## 引用的共享 reference

- `.claude/skills/office/references/ai-native-design-framework.md`（方法论）
- `.claude/skills/office/references/ai-native-taste-anchors.md`（8 锚点）
- `.claude/skills/office/references/ai-native-state-coverage.md`（12 状态）
- `.claude/skills/office/references/design-system-contract.md`（品牌/间距/字体硬约束）

## 下游

- `/html-prototype` — 读组件映射表和 12 状态，生成 HTML 原型
- `/figma-layer` — 基于原型还原 Figma
- 高级 design-review — 前置审查检查 12 节完整性，后置验收对照实现
- 高级 taste-review — 可在任意阶段重新跑 8 锚点品味检查
- 高级 redteam — 质疑本次决策的最脆弱假设

## 这个 skill 的立场

**没有 rationale 和 tradeoff 的设计决策不是决策，是偏好。** 本 skill 用 8
字段硬约束强制每条决策经得起"为什么"的追问。

**AI Native ≠ 加 AI 按钮。** 本 skill 用四层深度思考 + 四范式 + 8 锚点 + 12
状态构建 AI Native 设计的完整方法论。

**B2B 销售用户需要信息密度，但不能是意外的密度。** 本 skill
的品味标准参照 Attio / Linear / Superhuman，不是 consumer 产品的审美。

<!-- FILE_END: design-brief/README.md -->
