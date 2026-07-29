# CRM（纷享销客）休眠 Profile — 全文（自 CONTEXT.md 外移，2026-07-29 claude5-unhobble Phase 3）

> 激活条件见 CONTEXT.md「项目基本信息」；本文件按需 Read，不随 session 注入。

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
注入面（不删除，"全删"会断供对 FxUI token 规则的依赖——注：该依赖实际真值源是
constitution.md §2「FxUI Token 规则」，本句保留为历史语境，2026-07-29 审计注）。
