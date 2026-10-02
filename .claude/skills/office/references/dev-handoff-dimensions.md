# 开发交接维度清单（dev-handoff dimensions）

> **横切能力，非节点非流程。** 织进已存在的 design→dev 接缝：`open-design` / `html-prototype`
> 的 `prototype-spec.md` 产出（当下游=开发，即场景1）与 `tech-spec` 的 intake。
> 源：Anthropic 官方 design-handoff skill 的 7 维（成品视觉 → 反向抽取 dev spec），
> 采其**维度清单**，不采其独立产物形态（luca 无外部开发团队场景，见集成报告 §3）。

## 为什么只补 4 维（不做整套 handoff 产物）

现有交付按已确认的下游目标处理：需要开发时进入工程链，其他外部设计交付按各自合同完成。
复用既有 prototype-spec 与 tech-spec intake，避免新增重复交接文档。但 7 维里有 **4 维真实咬场景1（→开发）**——它们是
原型已隐含、但 `tech-spec` 接不住的实现细节，须在原型产出时显式补齐：

| 维度 | 场景1 处置 | 理由 |
|---|---|---|
| 交互状态 | 已覆盖（design-brief 12 状态 + 原型渲染态） | tech-spec 已从 design-brief 读到 |
| 布局 | 已覆盖（HTML 本身就是布局） | 原型即代码，无需反抽 |
| 边缘情况 | 已覆盖（brainstorm/design-brief Outstanding + 原型空/错/загруз态） | 上游已产 |
| **组件 props** | **补** | 原型里是具体实例，开发要的是可复用组件的**入参契约** |
| **响应式断点** | **补** | 原型常单宽度出图，断点行为须显式声明 |
| **design token 清单** | **补** | 原型内联了色值/间距，开发要的是**命名 token 表** |
| **动效** | **补** | CSS/JS/WAAPI/手势里的触发、过程、取消与 reduced-motion 尚需形成可复验规格 |

## 4 维：从实际最终产物抽取每维

抽取是**从实际最终产物及获准资产闭包读取和观察**，不是重新设计。
有 `final_artifact_ref` 或本次承诺 accepted motion 交付时，intake 前完整读取
`.claude/skill-os/runtime/prototype-delivery.md`，按唯一身份 owner 解析本次明确引用的 final/spec；
引用缺失/失效不能改读 raw 或猜最新文件。其他既有任务按原交付合同消费精确产物。
每项保留实际文件/节点、版本/hash、来源与观察证据；spec 声明和运行观察分列，未知不补默认值。

1. **组件 props**：读最终 HTML/JS/既有组件定义中重复出现的 UI 单元（卡片/按钮/行/标签）→ 每类列出**可变入参**
   （文案/状态/尺寸/图标/禁用态/数量）+ 类型 + 必填/默认，保留 design-brief 的 D/STATE/来源与位置映射。
   已有 tech-spec 的 `CMP-NNN` 时复用；否则保留原型单元的稳定标识，由 tech-spec 分配并绑定技术组件合同，不向 design-brief 索取或伪造 CMP。
2. **响应式断点**：读最终 CSS 的媒体/容器查询、实际宽度及 JS 相关响应逻辑 → 列出实际断点值与**每断点的可测
   响应式行为契约**（写成可断言的 reflow 规则，如 `<768px→单列`、`≥768px→双列/侧栏展开`）——是**行为
   契约**（Phase 4 可执行测试准则），不是静态 UI 布局复述。原型若只出一个宽度，显式标注"其余断点行为=待定"，不猜。
3. **design token 清单**：读最终 CSS/JS 的实际变量与色值/字号/间距/圆角/阴影 → 归成**命名 token 表**
   （实际名称、值、用途与来源），标出哪些来自当前项目/外部设计系统、哪些是原型局部值。
   局部值须开发决定是否升为 token，不静默硬编码。
4. **动效**：逐个相关交互读取 CSS transition/animation/keyframes、JS 事件/state/timer、
   WAAPI Animation/effect 与既有 gesture/spring 驱动；不能只扫 CSS 就声明完整。
   每条记录 `{ 来源/对象 → 输入与触发 → 起点/当前呈现/目标 → 属性与实际参数 → 序列/延迟/循环
   → 中断/反向/重复/退出/取消 → 产品终态与恢复 → reduced-motion → 验证动作与实际证据 }`。
   参数依机制提取实际时长/曲线/播放或 spring/速度/边界配置；没有固定时长就注明实际控制方式。
   CSS 媒体偏好与 JS/WAAPI 分支都要核，并记录相关键盘/焦点和 timer/handler 清理。
   spec 的行为必须在同一 final 上可复验；实现尚未运行写“未验证”，不存在写“无”，未知写“待定”。
   不添加默认动效、固定阈值或新产品结果，不把作者建议当已实现参数。

## 落点

- **原型产出（open-design / html-prototype）**：**仅当下游=开发（场景1）**时，在 `prototype-spec.md`
  追加一节"开发交接补全"，按上表补 4 维；纯外部设计交付且下游不进入开发时**不触发**。
- **tech-spec intake**：这 4 维是**实现规格**（绑到 `CMP-NNN` 组件合同的附加字段），非"UI 布局描述"——
  **不破坏** tech-spec"不是设计文档、不含 UI 布局"的 defining constraint。

<!-- FILE_END: references/dev-handoff-dimensions.md -->
