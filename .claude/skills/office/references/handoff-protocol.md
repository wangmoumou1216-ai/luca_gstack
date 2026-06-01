# Handoff Protocol v3.0

> **目的：** 每个 skill 完成时写一份决策摘要，供下游 skill 启动时加载。
> 用文件系统传递状态，不依赖 context window 的连续性。

---

## 写入时机

每个 skill 标记 `status: DONE` 之前，必须先写 handoff summary 文件。

## 文件路径

```
docs/handoff/YYYY-MM-DD-<topic>-<skill-name>-handoff.md
```

示例：`docs/handoff/2026-05-08-crm-lead-pool-brainstorm-handoff.md`

## 格式规范（硬约束 ≤2000 tokens ≈ 8000 chars）

```markdown
# Handoff: <skill-name> → downstream
topic: <topic-slug>
scene: <A/B/C/D>
completed_at: <ISO timestamp>

## 决策（做了什么）
- [D-001] <一句话决策> | 理由：<一句话> | 否决：<被否决的方向> | 状态：PROPOSED
- [D-002] ...
（最多 8 条，每条 ≤100 字）

**决策状态标记：**
- `PROPOSED`：skill 产出的决策建议（默认值）
- `[ADOPTED]`：用户明确采纳的决策（用户说"就这个"/"方案A"/"同意"时标记）
- `[REJECTED]`：用户明确否决的决策（用户说"不要这个"/"换一个"时标记）

**写入时机：** skill 完成时先写 PROPOSED。用户确认后，由 Orchestrator 或下一个 skill 更新为 ADOPTED/REJECTED。

**为什么标记很重要？** 未来遇到类似 topic 时，Pre-Task Context Retrieval 会检索历史 handoff 中 [ADOPTED] 的决策作为参考起点，避免重复探索被否决的方向。这是 Ruflo SONA 学习系统的轻量等价物。

## 约束（下游必须遵守）
- <约束1>
- <约束2>
（最多 5 条）

## 风险（下游需要注意）
- <风险1>
（最多 3 条）

## 待澄清（Deferred，下游须追踪）
- <开放问题1>（上游合法放行但延后未答；下游在解决或显式继续延后前，不得据此做隐式假设）
（可空；非空则下游必须追踪、不得静默丢弃。对应 PRD 的 `Outstanding Questions → Deferred to Planning`。）

## 产出路径
- 主产出：<相对路径>
- 附属产出：<相对路径>（如有）

## AI Native 判断（如适用）
- 范式：<A/B/C/D/无>
- 影响的状态：<列出受影响的 AI 专有状态>
```

## 为什么 ≤2000 tokens？

**量化依据：**
- 下游 skill 启动加载量 = 自身 SKILL.md (~10K) + 上游 handoff (~2K) + 共享规范摘要 (~3K) = ~15K tokens
- 对比改造前：上游 SKILL.md (~10K) + 上游完整产出 (~40K+) = ~50K+ tokens
- **降幅：70%**，为 runtime (search/subagent/dialog) 留出充足空间

## 下游 skill 的读取协议

skill 启动时，Orchestrator（或 skill 自身在 standalone 模式下）按以下顺序读取：

1. **workflow-state.yaml** → 确认上游哪些 skill 已 DONE
2. **最近一个上游 handoff summary** → 获取决策、约束、风险
3. **自己的 SKILL.md** → 执行指令
4. 如需要 → 共享 references 中的特定文件（按 context-cost.shared-refs 声明加载）

**绝不读取上游 skill 的完整 SKILL.md 或完整产出文件。**
如果需要上游产出的具体细节，handoff summary 应该包含足够的摘要，或者
skill 在执行过程中按需读取特定段落。

## 写入脚本

在 skill 的产出写入完成后，在 SKILL.md 的 completion 步骤中添加：

```bash
# 写入 handoff summary
DATE=$(date +%Y-%m-%d)
TOPIC=$(grep "^topic:" .claude/workflow-state.yaml | awk '{print $2}' | tr -d '"')
SKILL_NAME="<当前skill名>"
cat > "docs/handoff/${DATE}-${TOPIC}-${SKILL_NAME}-handoff.md" << 'HANDOFF_EOF'
# Handoff: <skill-name> → downstream
...（按格式填写）
HANDOFF_EOF
```

## 在 SKILL.md 共享规范中的嵌入位置

在 `.claude/skills/office/SKILL.md` 的 `## 共通 completion 步骤` 章节末尾添加 handoff 写入要求。

---

## 变更日志

- v3.0 (2026-05-08): 首次创建，作为 Context 存活工程的核心协议

<!-- FILE_END: handoff-protocol.md -->
