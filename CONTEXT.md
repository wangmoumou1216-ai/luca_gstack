# CONTEXT.md — 项目长期记忆

> 此文件跨 session 持久化。Claude Code 每次启动时自动读取。
> 由 /retro 和各 skill 在复盘或发现重要洞察时写入。

---

## 项目基本信息

**luca_gstack 是多项目个人开发环境**，不绑定单一"产品"（2026-07-03 修正，见下方"身份声明落地"）。
下游项目各自在 `~/Desktop/项目/<name>/` 独立记忆与约束，本文件只记跨项目的框架层约束。

**CRM（纷享销客）是可选业务 profile**：用户任务明确涉及 CRM 业务或专项 UX 评审时，先完整读取
`.claude/skill-os/crm-profile.md`。仅引用 `framework/` 页面不激活品牌约束；视觉规范由当前项目或外部设计工具提供。

---

## 红线（所有 session 强制遵守）

> 以下为项目级硬约束，违反即停。每条指向权威源；新增红线追加一行并注明来源。
> （quality-gate 的约束合规维度 grep 本节，故本节不得空置。）

1. **framework/ 参考资产只读**：不得直接修改 `framework/` 任何文件（SC-20260905-001，取代 SF-002）。HTML 原型不再强制基于本地母版；视觉与组件约束来自当前已确认项目或用户在外部工具配置的设计系统。只读保护不因 CRM profile 是否激活而失效。
2. **当前设计规范有明确来源**：设计系统由用户在外部工具配置，或由当前项目明确提供；不从 CRM 名称或旧页面参考推导品牌、token、字体或组件技术映射强制。
3. **稳定 ID 永不重编/复用**：R-/AE-/IF-/CMP-/DEC-/DEV- 等已分配编号（前缀为代表，非穷尽）不得改号或回收（brainstorm「Renumbering stable IDs」CRITICAL / quality-gate ID 稳定性维度）。
4. **最小文件 + 读前先写 + Surgical Changes**：不创建非任务必要文件，优先编辑已有文件；编辑前必先 Read（harness Edit/Write/NotebookEdit 工具层硬强制；bash 写在其外仍须遵守）；只改与目标直接相关的行（最小文件/Surgical：CLAUDE.md 核心行为原则 / Coding Discipline）。
5. **稳定事实走受控晋升**：不得直接写 `promoted-facts.yaml` 或本文件；先 `propose_semantic.py` 写 candidate，经 review/consolidate 门禁才晋升（SC-20260523-003）。
6. **老项目/已有项目/继续项目先过 Project Gate**：不得直接解释为场景 B 或进入单个 skill（SC-20260523-002）。

---

## 累积洞察

（由 /retro 自动追加。）

历史案例叙事已冷置到
`framework-audit/2026-09-21-context-case-extract.md`；常规启动不读取该归档。现行品牌中性、
外部设计系统来源和 `framework/` 只读边界仍以上方项目基本信息与红线为准。

## 来自 2026-08-04 能力可达性治理复盘的洞察

- 归因前先拉满样本矩阵：任何「X 导致失败」的归纳出口前，成功/失败样本同口径数一遍 X 的
  分布（本轮两套判据被证伪、两轮握手白走的根因——对照组数据一直在盘上，只是没去验）；
  否定性断言配定向 grep 拿到 0 才算数。
- 基于使用数据的治理调查：取数之前先问 luca 近期工作分布——先定分母再数分子
  （「我都在修框架所以用得少」一句揭穿整个零使用统计；已固化进场景计数规则，对话层习惯仍要养）。
来源：能力可达性治理（框架治理轮）复盘，全records 见 framework-audit/2026-08-04-capability-reachability-retro.md
