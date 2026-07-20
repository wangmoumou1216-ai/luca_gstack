# 开发交接维度清单（dev-handoff dimensions）

> **横切能力，非节点非流程。** 织进已存在的 design→dev 接缝：`open-design` / `html-prototype`
> 的 `prototype-spec.md` 产出（当下游=开发，即场景1）与 `tech-spec` 的 intake。
> 源：Anthropic 官方 design-handoff skill 的 7 维（成品视觉 → 反向抽取 dev spec），
> 采其**维度清单**，不采其独立产物形态（luca 无外部开发团队场景，见集成报告 §3）。

## 为什么只补 4 维（不做整套 handoff 产物）

luca 的两个 design 终点都无"交外部人类开发团队"：HTML → 自家开发链直接跑，或 HTML → Figma 结束。
故 design-handoff 的独立交接文档大部分冗余。但 7 维里有 **4 维真实咬场景1（→开发）**——它们是
原型已隐含、但 `tech-spec` 接不住的实现细节，须在原型产出时显式补齐：

| 维度 | 场景1 处置 | 理由 |
|---|---|---|
| 交互状态 | 已覆盖（design-brief 12 状态 + 原型渲染态） | tech-spec 已从 design-brief 读到 |
| 布局 | 已覆盖（HTML 本身就是布局） | 原型即代码，无需反抽 |
| 边缘情况 | 已覆盖（brainstorm/design-brief Outstanding + 原型空/错/загруз态） | 上游已产 |
| **组件 props** | **补** | 原型里是具体实例，开发要的是可复用组件的**入参契约** |
| **响应式断点** | **补** | 原型常单宽度出图，断点行为须显式声明 |
| **design token 清单** | **补** | 原型内联了色值/间距，开发要的是**命名 token 表** |
| **动效** | **补** | 时长/缓动/触发/序列——原型 CSS 里有但未成规格 |

## 4 维：从产出 HTML 如何抽取每维

原型是 HTML（=代码），抽取是**从已产出物读取**，不是重新设计：

1. **组件 props**：识别原型里重复出现的 UI 单元（卡片/按钮/行/标签）→ 每类列出**可变入参**
   （文案/状态/尺寸/图标/禁用态/数量）+ 类型 + 必填/默认。命名对齐 design-brief 的 `CMP-NNN`。
2. **响应式断点**：读 HTML 的媒体查询 / 容器宽度 → 列出断点值（如 `sm/md/lg`）与**每断点的可测
   响应式行为契约**（写成可断言的 reflow 规则，如 `<768px→单列`、`≥768px→双列/侧栏展开`）——是**行为
   契约**（Phase 4 可执行测试准则），不是静态 UI 布局复述。原型若只出一个宽度，显式标注"其余断点行为=待定"，不猜。
3. **design token 清单**：扫原型 CSS 的色值/字号/间距/圆角/阴影 → 归成**命名 token 表**
   （`--color-primary: #...` / `space-2: 8px`），标出哪些来自 FxUI 品牌 token、哪些是原型局部值。
   局部值须开发决定是否升为 token，不静默硬编码。
4. **动效**：读 transition/animation/keyframes → 每条列 `{ 触发 → 属性 → 时长 → 缓动 → 序列/延迟 }`；
   无动效的交互显式写"无"，不补默认动效。

## 落点

- **原型产出（open-design / html-prototype）**：**仅当下游=开发（场景1）**时，在 `prototype-spec.md`
  追加一节"开发交接补全"，按上表补 4 维；场景2（→Figma）路径**不触发**，figma-layer 产出不变。
- **tech-spec intake**：这 4 维是**实现规格**（绑到 `CMP-NNN` 组件合同的附加字段），非"UI 布局描述"——
  **不破坏** tech-spec"不是设计文档、不含 UI 布局"的 defining constraint。

<!-- FILE_END: references/dev-handoff-dimensions.md -->
