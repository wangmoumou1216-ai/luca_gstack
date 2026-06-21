# CONTEXT.md — 项目长期记忆

> 此文件跨 session 持久化。Claude Code 每次启动时自动读取。
> 由 /retro 和各 skill 在复盘或发现重要洞察时写入。

---

## 项目基本信息

**产品：** 纷享销客 CRM
**技术栈：** FxUI Vue 2.0（生产）/ 纯 HTML + Tailwind CDN（原型）
**设计体系：** shadcn 组件映射 → FxUI（见 component-map.md）
**品牌色：** #FF8000（主色），全页 ≤3 处

---

## 红线（所有 session 强制遵守）

> 以下为项目级硬约束，违反即停。每条指向权威源；新增红线追加一行并注明来源。
> （quality-gate 的约束合规维度 grep 本节，故本节不得空置。）

1. **framework/ 母版只读**：不得直接修改 `framework/` 任何文件（SF-002）。原型须复制母版，不在原地改。
2. **品牌主色 #FF8000 全页 ≤3 处**（CONTEXT 项目基本信息 / SF-001）。
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
