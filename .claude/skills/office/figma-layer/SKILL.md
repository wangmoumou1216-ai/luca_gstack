---
name: figma-layer
preamble-tier: 2
argument-hint: "[HTML prototype index.html 路径 + Figma file URL]"
version: 1.2.0
description: |
  Figma 保险层搭建。一比一还原 HTML 原型（来源：html-prototype / figma-demo /
  open-design 三选一），不是独立设计。必须读 index.html 实际代码，不能只读 spec。
  三层处理规则：shadcn → shadcn+Variables → HTML 自绘。Auto Layout 强制规范。
  通过新版 Figma MCP（use_figma）搭建；只叠 FxUI 品牌色 + 文字色 token（品牌色
  #FF8000 硬约束），其余配色/字体/字号沿用上游 HTML 实际值不覆盖；本期不绑 FxUI 组件库。
  场景A（新功能）和场景C（评审改版）适用。
  (luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - Skill
  - AskUserQuestion
  - mcp__plugin_figma_figma__whoami
  - mcp__plugin_figma_figma__use_figma
  - mcp__plugin_figma_figma__get_design_context
  - mcp__plugin_figma_figma__get_screenshot
  - mcp__plugin_figma_figma__search_design_system
  - mcp__plugin_figma_figma__create_new_file
  - mcp__plugin_figma_figma__generate_figma_design
context-cost:
  self: 14787  # 实测字节数 wc -c，统一口径 2026-07-04（G5）
  runtime-estimate: 5000
  shared-refs: [none]
  recommended-model: mechanical  # 图层命名+ID复制
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
_PROTOTYPE=$(ls -t docs/prototype/*/index.html 2>/dev/null | head -1)
_SPEC=$(ls -t docs/prototype/*/prototype-spec.md 2>/dev/null | head -1)
_BLUEPRINT=$(ls -t docs/prototype/*/blueprint.yaml 2>/dev/null | head -1)
_DECISION=$(ls -t docs/decisions/*-design-brief.md 2>/dev/null | head -1)
echo "PROTOTYPE: ${_PROTOTYPE:-none}"
echo "PROTOTYPE_SPEC: ${_SPEC:-none}"
echo "BLUEPRINT: ${_BLUEPRINT:-none}"
echo "DECISION: ${_DECISION:-none}"
_TOPIC=$(cat .claude/current-topic.txt 2>/dev/null || echo "none")
echo "CURRENT_TOPIC: $_TOPIC"
python3 .claude/observability/scripts/get_rules.py figma-layer "*" 2>/dev/null || true
```

---

## Phase 0：前置检查（全部通过才能继续）

```
□ Figma MCP 已连接且身份/席位就绪？
  → 调用 mcp__plugin_figma_figma__whoami 确认登录身份与席位（draft 任意席位可用；draft 外正式
    文件需 Full seat + 编辑权限，席位不足必须在动手前提示，而非半途失败）
  → 写入前必须先加载 /figma-use skill（新版 use_figma 的强制前置）
  → 工具不可用：
    【H-05 修复】不直接 BLOCKED，提供降级路径：
    「Figma MCP 当前不可用。你有以下选择：
     A）配置 Figma MCP 后重试
     B）跳过 /figma-layer，停在 HTML 原型
     C）暂时搁置，下次 session 再做 Figma 层」
    等用户选择后按选择执行，不强制 BLOCKED。

□ ⛔ 已读取 HTML 原型实际代码（index.html）？
  → 必须读 docs/prototype/{date}-{topic}/index.html 的实际代码
  → 不能只读 prototype-spec.md
  → 否：BLOCKED — 未读 HTML 原型实际内容，无法一比一还原

□ 已读取 prototype-spec.md？
  → 必读「设计意图」节（用户处境/空间结构/视觉重心）
  → 如果 source=html-prototype：必读「shadcn 组件清单」节
  → 如果 source=figma-demo：必读「节点清单 / 节点间过渡 / Builder 调度记录」节
  → 必读「交接块」节
  → 否：BLOCKED — prototype-spec.md 缺失

□ 确认上游来源（三选一）：
  → 存在 docs/prototype/YYYY-MM-DD-<topic>/blueprint.yaml → source=figma-demo
  → 否则读 prototype-spec.md 的「框架来源」或上游 handoff：
    - 框架来源 = open-design（或存在 *-open-design-handoff.md）→ source=open-design
    - 其它 → source=html-prototype

□ source=html-prototype 时：design-brief.md 存在 → 已读取并确认 shadcn 组件映射表存在？
  → 否（design-brief.md 存在但缺映射表）：BLOCKED — 映射表缺失
  → design-brief.md 不存在（html-prototype 独立跑/场景C，无上游 design-brief）→ 降级：从 prototype-spec.md +
    index.html 实际结构归纳组件清单（同 open-design 来源逻辑），不 BLOCKED

□ source=figma-demo 时：已读取 blueprint.yaml，确认 nodes / design_system / viewport_targets 存在？
  → 否：BLOCKED — blueprint.yaml 缺失或不完整
  → 注意：figma-demo 上游不要求 design-brief.md，也不要求 shadcn 组件映射表；组件清单来自 blueprint.yaml 和 prototype-spec.md 的节点清单。

□ source=open-design 时：已读取 index.html 实际代码 + prototype-spec.md？
  → 否：BLOCKED — open-design 来源必须读实际 HTML 和 spec
  → 注意：open-design 上游不要求 design-brief 的 shadcn 组件映射表（OD 产出为 token-only/
    自绘）；组件清单从 index.html 实际结构归纳，按三层规则还原；FxUI 只叠品牌色+文字色 token，不绑组件库。

□ shadcn Figma UI Kit file key 已配置？
  → 否：BLOCKED — shadcn Figma UI Kit key 未配置
```

---

## Phase 1：Step 0 认知门禁

**这一步全部是思考，不调用任何工具。**

如果 prototype-spec.md 的「设计意图」节已完整记录，直接读取并声明：
「Step 0 已通过，来源：prototype-spec.md」

否则执行四阶段：

### 阶段一：理解用户处境
（同 html-prototype 的阶段一，来自 prototype-spec.md 用户处境节）

### 阶段二：规划空间结构
（来自 prototype-spec.md 空间结构节）

### 阶段三：建立信息层次（L1/L2/L3）
（来自 prototype-spec.md 视觉重心节）

### 阶段四：规划自绘区域
（对映射表里「自绘」的区域，规划 Figma 样式）

**Step 0 验证：**
```
移除所有组件后：
✓ 空间规划仍有清晰区域划分？
✓ 视线路径仍然清晰？
✓ L1/L2/L3 仍然可识别？
全部「是」→ 通过，进入 Phase 2
```

---

## Phase 2：Figma 组件清单

根据上游来源整理所有 Figma 层组件：

- **source=html-prototype**：从 design-brief.md 映射表整理。
- **source=figma-demo**：从 blueprint.yaml 的节点清单、design_system、各节点
  spec/interface，以及 prototype-spec.md 的节点清单整理；不要要求 design-brief.md。
- **source=open-design**：从落盘的 index.html 实际结构归纳组件清单（多为「自绘区域」，
  因本期不绑 FxUI 组件库）；不要求 design-brief.md 映射表。FxUI 只叠品牌色+文字色 token。

```markdown
## Figma 层组件清单

| 页面/状态 | shadcn 组件名 | variant | Figma UI Kit 对应名 | 用途 |
|---------|--------------|---------|-------------------|----|
| {页面名} | Button | default | Button/Default | 主操作按钮 |
| {页面名} | Table | — | Table | 数据列表 |
| {页面名} | 自绘区域 | — | — | {Figma 样式规划} |
| {Demo Node} | 自绘区域 | — | — | 来自 figma-demo blueprint 的节点片段 |
```

**清单自检：**
```
□ 每个 shadcn 组件在 Figma UI Kit 里有对应 Frame？
□ 品牌色 Variables 覆盖规则已确认（#FF8000）？
□ 自绘区域的 Figma 样式规划完成？
□ 如果 source=figma-demo：每个 blueprint node 都有对应 Frame 规划？
```

---

## Phase 3：搭建 Figma 画布

**搭建机制（新版 Figma MCP）：** 先加载 `/figma-use` skill，再用 `mcp__plugin_figma_figma__use_figma`
在目标 draft / 文件内建图层；用 `mcp__plugin_figma_figma__get_design_context` / `get_screenshot` 读现状校验。
不再使用旧的 create_frame / update_node 接口。

**骨架先行（首个写入调用，2026-06-10 经验）：** 第一个 use_figma 调用只建根 frame +
各区块 placeholder shimmer（不含文本节点、无字体依赖），让用户立刻看到进度；字体侦察
（listAvailableFontsAsync）与 HTML 精读随后续逐段填充推进。强制前置（/figma-use 加载、
whoami、读 index.html 实际代码）仍不可跳过，只是把「可见进度」提前。

**捕获快路径分流（generate_figma_design，2026-06-10 实验验证）：** 源是本地 HTML 时，
可先用 `generate_figma_design` 捕获（本地 http.server + 副本注入 capture.js + hash URL 打开，
全程 ~1 分钟）得到像素级帧——文本/字体真实可编辑（捕获的是浏览器实际渲染栈）。按需求分流：
- **评审/预览级**：捕获帧直接交付，跳过手搭（省 ~15 分钟）；
- **保险层级**（本 skill 的 Auto Layout 强制规范）：捕获帧只作对照参考，仍走手搭三层规则
  ——实测捕获结构约 4 成容器为绝对定位、带视口外壳与捕获工具条残留，重构成本不低于重建；
- 交付保险层前删除或明确标注捕获帧，避免两版混淆。

**三层处理规则（硬约束）：**

| 层级 | 规则 | 以谁为准 |
|------|------|---------| 
| 第一层 | shadcn 组件能直接覆盖 | shadcn |
| 第二层 | shadcn + Variables 覆盖 | shadcn + Variables |
| 第三层 | 前两层满足不了 | HTML 自绘，像素级一致 |

**冲突处理：**
- 组件内部冲突（圆角、内间距）→ 以 shadcn + Variables 为准
- 跳出组件的部分（布局、间距）→ 以 HTML 为准，像素级一致

**Auto Layout 强制规范（每个 Frame 必须遵守）：**

```
布局模式优先级：
1. Auto Layout（layoutMode = "VERTICAL" / "HORIZONTAL"）— 默认
2. Fixed 定位 — 仅限 Icon 等固定尺寸元素

子元素尺寸规则：
- 文字元素 → textAutoResize = "WIDTH_AND_HEIGHT"（HUG内容）
- 容器元素 → layoutSizingHorizontal/Vertical = "HUG" 或 "FILL"
- 需要撑满父容器 → layoutGrow = 1 或 layoutAlign = "STRETCH"

验证：
□ 修改文字内容后布局自动调整？
□ 增删子元素后间距保持一致？
```

**Figma Variables 覆盖（搭建前完成；FxUI 仅叠 品牌色 + 文字色 两类）：**
```
品牌色 Variables：--primary #FF8000 · --primary-foreground #FFFFFF · --ring #FF8000
文字色 Variables：主文字 #181C25 · 次要文字 #91959E
（分割线/页面底/卡片底/字体/字号/语义色 一律不注入：沿用上游 index.html 实际值 / shadcn 默认，不覆盖）
```
> 本期只叠品牌色 + 文字色两类 token，不搜 FxUI 组件库、不建组件映射（完整组件库绑定为远期 D4）。

**搭建策略：**

```
设计范围 = 全新页面：
  创建完整页面 Frame（shadcn Figma UI Kit 框架模板）
  搭建 Header + Sidebar + Content Area 三层结构
  按映射表逐区域填入组件

设计范围 = 局部改动：
  只创建新增区域的 Frame
  Frame 头注释：挂载位置：[页面名] 的 [区域]

设计范围 = 独立组件：
  创建独立 Frame，包含所有状态变体（默认/Hover/Active/Disabled）
```

**每个页面搭建完后，UX 一致性自检：**

```
对照 index.html 实际代码：
□ 信息区域划分与 HTML 原型一致？
□ Tab 结构和顺序与 HTML 原型一致？
□ L1 元素（视觉重心）位置与 HTML 原型一致？
□ 主操作按钮使用了 #FF8000 品牌色？
任意「否」→ 修正后继续，不得跳过
```

---

## Phase 4：产出文件

```bash
mkdir -p docs/figma/YYYY-MM-DD-<topic>
```

读取 SCHEMA.md 作为模版，写入：
`docs/figma/YYYY-MM-DD-<topic>/figma-spec.md`

产出文件必须包含：
1. 生成信息（时间、设计范围、对应 HTML 原型路径）
2. 设计意图（Step 0 输出，与 prototype-spec.md 一致）
3. Figma 文件（Frame 名 + Node ID）
4. 组件清单（shadcn → Figma UI Kit 映射）
5. **UX 一致性确认节**（与 HTML 原型的对比结果）
6. **差异说明节**（记录 shadcn 组件与 HTML 的差异，分类：可接受/需修正）
7. 未实现项
8. 交接块（下游高级交付审查可读）

---

## Phase 5：告知下一步

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/figma-layer 完成
产出：docs/figma/YYYY-MM-DD-<topic>/figma-spec.md
页面数：{N} 个 + {N} 个状态变体
组件：{N} 个 shadcn，{N} 个自绘
品牌色：已应用
UX 一致性：{一致 / 差异说明：{描述}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

本 skill 是设计链末端节点，无强制下游。产出 figma-spec.md 后默认停在此处交给下游高级交付审查读取；
如需修订某个 Frame，说明要改的 Frame 与改动，即可重新进入 Phase 3 局部重搭。

---

**workflow-state 写入：**

Claude 在执行前必须确定实际 `_TOPIC`（从 `current-topic.txt` 读取，
或根据当前功能名推断 topic slug），然后执行：

```bash
export _TOPIC=$(cat .claude/current-topic.txt 2>/dev/null)
# 如果 _TOPIC 为空或是占位符，从最新 idea 文件名推断
[ -z "$_TOPIC" ] || [ "$_TOPIC" = "<topic>" ] && \
  _TOPIC=$(ls -t docs/idea/*.md 2>/dev/null | head -1 | \
           xargs basename 2>/dev/null | \
           sed 's/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-//' | \
           sed 's/-idea\.md$//' || echo "unknown")
export _NODE="figma-layer"
export _STATUS="DONE"
export _OUTPUT="docs/figma/$(date +%Y-%m-%d)-${_TOPIC}/figma-spec.md"
python3 .claude/skills/office/references/write_state.py 2>/dev/null || echo "workflow-state 写入跳过"
```

## ⚠️ 末尾核心约束

> 本节是 Phase 0/1/3 关键门禁的**速查 recap**；**权威以各 Phase 正文为准**（三层规则/Auto Layout/
> F-0/Step 0 门的单一真值源在对应 Phase）。规则变更改 Phase 正文，本节须同步；两处不一致时以 Phase 正文管辖。

1. **本项目只使用 Figma MCP**（`mcp__plugin_figma_figma__*`，新版 use_figma；写入前先加载 /figma-use）
2. **保险层 = 一比一还原，不是独立设计** — 必须读 index.html 实际代码
3. **不能只读 prototype-spec.md** — 必须看到实际视觉效果
4. **三层处理规则必须严格执行**
5. **Auto Layout 全面应用** — 每个容器必须是 Auto Layout，禁止绝对定位布局容器
6. **F-0 前置检查不可跳过**
7. **Step 0 门禁不可跳过**
8. **Figma Variables 品牌色覆盖必须在搭建前完成**
9. **差异必须记录** — 组件内部差异（可接受）和跳出组件差异（需修正）都要记录
10. **UX 一致性确认节和差异说明节不可省略**
11. **交接块不可省略**

---

## 完成协议（Handoff Summary）

**标记 DONE 之前必须执行，无 handoff 的 DONE 视为不完整。**

**Step 1 — 写入 handoff summary：**
```
路径：docs/handoff/YYYY-MM-DD-<topic>-figma-layer-handoff.md
格式：见 .claude/skills/office/references/handoff-protocol.md（≤2000 tokens）
```

必须包含：
- **决策列表**（≤8条）：组件内部差异（可接受）、跳出组件差异（已修正/待修正）
- **下游约束**（≤5条）：Figma 文件链接、Variables 覆盖状态、UX 一致性结论
- **风险**（≤3条）：未还原的视觉效果、Figma MCP 局限导致的差异
- **产出路径**：docs/figma/ 文件路径 + Figma 文件 URL

**Step 2 — 更新 workflow-state.yaml：**

workflow-state 写入以上文「**workflow-state 写入**」节的 `write_state.py` 为唯一真值源（写
`nodes.figma-layer`：status / output=docs/figma/<topic>/figma-spec.md / completed_at）。脚本已完成写入，
**不要在此另手写一套顶层 `figma-layer:` YAML 字段**——手写顶层键会与脚本产物（`nodes.figma-layer`）
结构漂移，而 session-restore 只读 `nodes.*`，手写的顶层块永不被读到。

<!-- FILE_END: figma-layer/SKILL.md -->
