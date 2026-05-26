# Figma Spec

生成时间：YYYY-MM-DD HH:MM
设计范围：{全新页面/局部改动/独立组件}
上游来源：{html-prototype / figma-demo}
对应 HTML 原型：docs/prototype/YYYY-MM-DD-{topic}/index.html
对应 Blueprint（figma-demo 时）：docs/prototype/YYYY-MM-DD-{topic}/blueprint.yaml / N/A

---

## 设计意图（来自 prototype-spec.md）

用户处境：{1-2 句话}
空间结构：{区域 + 视线路径}
视觉重心：{L1 元素}

---

## Figma 文件

| 页面/状态 | Frame 名 | Node ID | 描述 |
|---------|---------|---------|------|
| {名称} | {frame名} | {node_id} | {一句话} |

---

## 组件清单

| 页面 | shadcn 组件名 | variant | Figma UI Kit 对应名 | 品牌色覆盖 |
|------|------------|---------|-------------------|---------| 
| {页} | Button | default | Button/Default | 已覆盖 |
| {Demo Node} | 自绘区域 | — | — | 已按 blueprint token 还原 |

---

## UX 一致性确认

- 与 HTML 原型信息架构：{一致/差异：描述}
- 与 HTML 原型交互路径：{一致/差异：描述}

---

## 差异说明

| 差异类型 | 描述 | 分类 |
|---------|------|------|
| {描述} | {细节} | ⚠️ 可接受（组件内部）/ ❌ 需修正（跳出组件）|

---

## 未实现项

| 项目 | 原因 |
|------|------|
| {功能} | {Figma MCP 不支持/shadcn UI Kit 无对应} |
（无则写「无」）

---

## 交接块

**本步决定了什么：** {Frame 结构、组件映射、关键 Node ID}
**下游高级交付审查需要知道：** {比对 HTML 原型时关注哪些 Frame}
**下游高级交付审查不应该做：** {不应重新设计已定的信息架构}
