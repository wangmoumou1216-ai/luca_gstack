# Skill Invariants — Protected Zones

> 定义 SKILL.md 中**不得修改**的区域，适用于人工编辑和自动优化（如 GEPA）。
> 本文件未列出的区域视为**可进化区（Evolvable Zone）**。

---

## 通用保护区（所有 SKILL.md）

### P1 — Frontmatter（严格保护）

不得修改：
- `name:` — skill 标识符，下游路由依赖
- `allowed-tools:` — 权限边界，修改可导致工具调用失败
- `context-cost:` — 上游调度依赖此估算
- `preamble-tier:` — 影响加载顺序

**可改：** `description:` 的措辞、`argument-hint:` 的提示文案

---

### P2 — 输出文件路径（严格保护）

形如 `docs/<dir>/YYYY-MM-DD-<topic>-<name>.<ext>` 的路径不得改动。

原因：下游 skill 通过 glob 模式（如 `ls docs/idea/*.md`）发现上游产物，路径变化会导致静默失败。

受保护的路径：
- `docs/idea/YYYY-MM-DD-<topic>-idea.md`
- `docs/prd/YYYY-MM-DD-<slug>-prd.md`
- `docs/research/deepresearch-{topic-slug}-{date}.md`
- `docs/prototype/YYYY-MM-DD-<topic>/index.html`
- `docs/decisions/YYYY-MM-DD-<topic>-design-brief.md`
- `docs/evaluation/YYYY-MM-DD-<topic>-ux-audit.md`
- `docs/engineering/YYYY-MM-DD-<topic>-tech-spec.md`
- `docs/engineering/YYYY-MM-DD-<topic>-task-plan.md`
- `docs/handoff/YYYY-MM-DD-<topic>-<skill>-handoff.md`
- `docs/research/research-kit-<topic>-<YYYY-MM-DD>.md`（2026-07-21 新增；docs/research 沿用 name-first 约定）
- `docs/decisions/YYYY-MM-DD-<topic>-voice-copy-spec.md`（2026-07-21 新增；design-brief Step 1.0b 以 `*-voice-copy-spec.md` 后缀 glob 探测）
- `docs/evaluation/YYYY-MM-DD-<topic>-ux-writing-review.md`（2026-07-21 新增；不与 ux-audit 产出模式冲突）

#### P2-V — 版本管理规则（同日多次运行）

同一天同一 skill 运行多次时，文件名加递增三位序号（`-001-`、`-002-`），避免覆盖：

```
docs/prd/2026-05-20-001-crm-prd.md      ← 第一次
docs/prd/2026-05-20-002-crm-prd.md      ← 第二次（不覆盖第一次）
docs/handoff/2026-05-20-001-crm-brainstorm-handoff.md
```

**判断是否需要序号：**
```bash
# 检查当日是否已有同名 skill 产出
ls docs/prd/$(date +%Y-%m-%d)-*-prd.md 2>/dev/null | grep -q . && echo "需要序号" || echo "无需序号"
```

**序号分配：** 取当日已有文件的最大序号 +1，从 001 开始。
**目录型产出豁免：** 形如 `docs/<dir>/YYYY-MM-DD-<topic>/`（如 open-design/figma-demo 的 `docs/prototype/<date>-<topic>/`）**有意就地覆盖、不加序号**——P2-V 序号规则只适用于**单文件**产出；目录型产出的版本对比走 `history.sh` 或 OD 端迭代，不靠文件名序号。
**查看历史版本：** `bash scripts/history.sh <skill-name>`
**采纳标记：** 在 handoff 文件的 `gate_result` 行后加 `adopted: true/false` 字段，表示该版本是否被最终采用。

---

### P3 — Preamble bash block（严格保护）

每个 skill 开头的 bash 代码块（git branch 读取、topic 读取、rules 加载）不得删除或修改。

关键命令（不得删除）：
```bash
python3 .claude/observability/scripts/get_rules.py <skill> "*"
cat .claude/current-topic.txt
```

---

### P4 — Handoff 写入协议（严格保护）

Handoff 写入节的以下内容受保护：
- 路径模式：`docs/handoff/YYYY-MM-DD-<topic>-<skill>-handoff.md`
- 格式引用：`.claude/skills/office/references/handoff-protocol.md`
- `mkdir -p docs/handoff` 命令

**Handoff 必须包含**中的项目列表不得减少（可以增加）。

---

### P5 — FILE_END 标记（严格保护）

```
<!-- FILE_END: <skill>/SKILL.md -->
```

必须存在于文件末尾。validate-skills.sh 检查此标记。

---

### P6 — Phase 顺序锁定（严格保护）

明确声明"不允许跳过"或"必须按顺序执行"的 Phase 编号和顺序不得改变。

受保护的顺序：
- html-prototype: Phase 0 → 1 → 2 → 2.1 → 2.25 → 2.5 → 2.75 → 3 → 4 → 4.5 → 5
- tech-spec: Phase 0 → 1 → 2 → 3 → 4 → 5（门禁）→ 6
- task-plan: Phase 0 → 1 → ... → 7（门禁）→ 8
- ux-audit: Phase 0（三个询问必须按顺序）→ 1 → 2 → 3

---

### P7 — workflow-state 写入（严格保护）

写入 `.claude/workflow-state.yaml` 的代码不得删除，`_NODE`、`_STATUS`、`_OUTPUT` 变量赋值不得改变含义。

---

## 各 Skill 的可进化区

### html-prototype（最高优先级）

| 节 | 可进化内容 |
|---|---|
| Phase 2.25 审美校准 | 参考坐标列表（可增减产品）、原则描述措辞 |
| Phase 2.1 Dynamic Reference Scan | 查询目标示例、轮次描述措辞 |
| Phase 2.5 设计系统宣告 | 宣告模板的示例值（如"具体位置，如..."） |
| Phase 3 HTML 生成 | 注释说明文案、检查项措辞 |
| Phase 4.5 QA 检查项说明 | 每个检查项的 detail 文案 |

**不可进化：** 审美分 ≥24/30 门槛、QA 检查项列表本身、Phase 4.5 的 `verify-prototype.mjs` 调用。

---

### brainstorm

| 节 | 可进化内容 |
|---|---|
| Phase 3 Interrogation | 强迫问题的措辞（不得减少问题数量） |
| Phase 4 Approach Exploration | 方案探索的引导语 |
| Phase 5 Oracle prompt | Oracle 审查的提示词 |

**不可进化：** 必须等待用户回答才能继续的约束、PRD 输出路径、Outstanding Questions 分类规则。

---

### deepresearch

| 节 | 可进化内容 |
|---|---|
| Phase 1 Research Agents | 每个 agent 的 prompt 措辞 |
| Phase 2 Consensus Matrix | 判断标准描述 |
| Phase 3 Socratic | 苏格拉底问题的措辞 |

**不可进化：** agent 数量下限（≥5）、每 agent ≥3 轮搜索约束、输出路径。

---

### ux-audit

| 节 | 可进化内容 |
|---|---|
| Phase 0 询问 | 询问措辞（不得删除任一询问） |
| Module A/B/C | 评分维度的描述文案 |

**不可进化：** 截图强制输入约束、场景C baseline 记录节、权重分配（A=35%/B=40%/C=25%）。

---

### idea

| 节 | 可进化内容 |
|---|---|
| Phase 1 提取规则 | 情况 A/B/C/D 的说明文案 |
| Phase 3 模糊项格式 | 询问格式的措辞 |

**不可进化：** 三条铁律（原文依据/不推断/不判断）、输出路径、Handoff 协议。

---

## 边界案例判断准则

**如果不确定某内容是否受保护，问这三个问题：**

1. 下游 skill 会从这里读取数据吗？（路径、节名、变量名）→ 受保护
2. validate-skills.sh / verify-prototype.mjs 会检查这里吗？→ 受保护
3. 这是执行流程控制（不是内容描述）吗？→ 受保护

三个都否 → 可以进化。

<!-- FILE_END: skill-os/skill-invariants.md -->
