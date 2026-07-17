# CONTEXT.md — 项目长期记忆

> 此文件跨 session 持久化。Claude Code 每次启动时自动读取。
> 由 /retro 和各 skill 在复盘或发现重要洞察时写入。

---

## 项目基本信息

**luca_gstack 是多项目个人开发环境**，不绑定单一"产品"（2026-07-03 修正，见下方"身份声明落地"）。
下游项目各自在 `~/Desktop/项目/<name>/` 独立记忆与约束，本文件只记跨项目的框架层约束。

**CRM（纷享销客）是一个可选休眠 profile**，非当前默认场景：
- **技术栈：** FxUI Vue 2.0（生产）/ 纯 HTML + Tailwind CDN（原型）
- **设计体系：** shadcn 组件映射 → FxUI（见 component-map.md）
- **品牌色：** #FF8000（主色），全页 ≤3 处
- **磁盘资产原地保留、零 per-session 成本**：`framework/` 母版、`brand-tokens.md`——不删，
  只是不再默认注入每-session 上下文。`fxui-source-to-html`/`fx-icon-search` skill 已于
  2026-07-17 删除（skills_used 实测零使用；图标检索直接 find `framework/assets/` 三个图标目录）。
- **激活条件**：用户任务显式提及"纷享/CRM/FxUI"或指向 `framework/` 目录时，读取
  component-map.md 与 brand-tokens.md 生效；其余 session 视为不相关，不注入 CRM 专属约束。

**身份声明落地（2026-07-03，luca_gstack 全量搭建 review 的 P2 项，framework-audit/2026-07-03-full-review.md）：**
6-28 健康度体检已发现"CRM 专属层冬眠、通用脊柱已迁个人 app"（episodic 50 个 session 零纯
CRM 设计任务），当时留待人工拍板是否收窄声明；本次 review 确认磁盘资产保留、只收窄每-session
注入面（不删除，"全删"会断供 muse fork 对 FxUI token 规则的依赖）。

---

## 红线（所有 session 强制遵守）

> 以下为项目级硬约束，违反即停。每条指向权威源；新增红线追加一行并注明来源。
> （quality-gate 的约束合规维度 grep 本节，故本节不得空置。）

1. **framework/ 母版只读**：不得直接修改 `framework/` 任何文件（SF-002）。原型须复制母版，不在原地改。此条不因 CRM profile 是否激活而失效——它保护的是磁盘资产完整性，与场景无关。
2. **品牌主色 #FF8000 全页 ≤3 处**——**仅当 CRM profile 激活时生效**（见上「激活条件」）；非 CRM 任务不适用。
3. **稳定 ID 永不重编/复用**：R-/AE-/IF-/CMP-/DEC-/DEV- 等已分配编号（前缀为代表，非穷尽）不得改号或回收（brainstorm「Renumbering stable IDs」CRITICAL / quality-gate ID 稳定性维度）。
4. **最小文件 + 读前先写 + Surgical Changes**：不创建非任务必要文件，优先编辑已有文件；编辑前必先 Read；只改与目标直接相关的行（CLAUDE.md 核心行为原则 / Coding Discipline）。
5. **稳定事实走受控晋升**：不得直接写 `promoted-facts.yaml` 或本文件；先 `propose_semantic.py` 写 candidate，经 review/consolidate 门禁才晋升（SC-20260523-003）。
6. **老项目/已有项目/继续项目先过 Project Gate**：不得直接解释为场景 B 或进入单个 skill（SC-20260523-002）。

---

## 累积洞察

（由 /retro 自动追加。）

## 来自 2026-06-12 /design-brief 的洞察 — 研究情报官

**原生AI思维小结（四层，继承链路 PRD→ux-brainstorm→design-brief）：**
产品层 3判断+5执行→1+1；交互层 8步→3-4步；信任层=锚点引用+幕次置信分流+教它示弱；
代理层四项全有 UI 落点（标题栏停止/手动接管/沉淀撤销/校准回滚）。范式=代理式执行。

**假设风险：**
最脆弱假设：①跨语言锚点召回（M0 实验验证）②四幕仪式 30 分钟内产生完结感而非绑架感（open-design 原型走查验证）。

**品味检查结论（8 锚点）：** 全过含 5 个阻断锚点；关键设计语言=置信差异用幕次表达而非视觉标注、故障即教材、写操作权重区分。

**跨项目可复用发现：** 个人项目的 design-brief 需显式声明"品牌不绑 FxUI"适配（design-system-contract 的 #FF8000 是 CRM 项目锁，结构性规范可独立沿用）。
