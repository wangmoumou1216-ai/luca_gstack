# DESIGN-SYSTEM-CONTRACT.md
# 设计系统执行合约 v1.0
# 适用范围：design-implementation-agent
# 本文件为硬性约束，所有实现必须严格遵守

---

## 执行原则

**双轨约束**：
1. **结构框架**：保持现有页面布局框架（有卡片用卡片，有侧栏用侧栏，
   未经用户确认不得更改）
2. **组件实现**：使用 shadcn/ui 实现框架内元素
3. **视觉节奏**：完整执行 `UI-DESIGN-SYSTEM.md` 数值，覆盖 shadcn 默认值
4. **品牌色**：`#FF8000` 替换所有 shadcn primary 位置

**冲突原则**：你们规范 > shadcn 默认（以下例外项已明确声明）

---

## 一、组件库

```yaml
name: shadcn/ui
version: latest
init: "npx shadcn@latest init"
import: "@/components/ui/{component}"
tailwind: css-variables 模式
```

---

## 二、品牌色（写入 globals.css）

```css
:root {
  --primary: 30 100% 50%;           /* #FF8000 */
  --primary-foreground: #FFFFFF;

  --background: #EFF1F3;
  --card: #FFFFFF;
  --card-foreground: #181C25;
  --foreground: #181C25;
  --muted: #F5F7FA;
  --muted-foreground: #91959E;
  --border: #DEE1E8;
  --input: #DEE1E8;

  --destructive: #FF522A;
  --destructive-foreground: #FFFFFF;

  --success: #30C776;
  --success-foreground: #FFFFFF;
  --warning: #FF7C19;
  --warning-foreground: #FFFFFF;
  --info: #0C6CFF;
  --info-foreground: #FFFFFF;
}
```

---

## 三、字体系统（完整执行 UI-DESIGN-SYSTEM.md §一）

```css
.text-l1 { font-size:15px; font-weight:500; color:#181C25; line-height:18px; }
.text-l2 { font-size:13px; font-weight:400; color:#181C25; line-height:1.5; }
.text-l3 { font-size:13px; font-weight:400; color:#91959E; line-height:1.5; }
.text-l4 { font-size:12px; font-weight:400; color:#91959E; line-height:18px; }
```

强制规则：
- L1～L4 必须同时出现，缺任何一级即错误
- 字段名（L3）颜色必须比字段值（L2）浅，同色即错误
- 正文/表格/字段值禁用 font-weight 500 或 700
- 数字强调（KPI）可用 20px/24px + 700，全页 ≤ 2 处

---

## 四、间距系统（完整执行 UI-DESIGN-SYSTEM.md §三）

合法间距值：`4 / 8 / 12 / 16 / 24 / 32 / 40` px

禁止值：5、10、15、18、20、22、25、30（任何表外数值）

语义映射：
| 值 | 场景 |
|----|------|
| 4px | 图标与文字之间 |
| 8px | 按钮组内间距、筛选条件之间 |
| 12px | 卡片内边距（最大 16px） |
| 16px | 不同信息组之间 |
| 24px | 表单字段垂直间距 |
| 32px | 页面功能区块之间 |
| 40px | 大节之间（少用） |

---

## 五、组件高度（已确认）

| 组件 | 高度 |
|------|------|
| 按钮 / 输入框 | 36px（shadcn 默认，已确认） |
| 表格行高 | 36px |
| 工具栏 | 36px |
| 分页区 | 40px |
| 顶栏 | 48px |
| 弹窗 body 最大高度 | 70vh |

---

## 六、颜色规范

主色 `#FF8000` 约束：每页 ≤ 3 处，仅用于主操作按钮/激活 Tab/选中菜单

按钮 variant 映射：
| 类型 | variant | 表现 |
|------|---------|------|
| 主操作（每区域唯一） | default | bg #FF8000 / text #FFF |
| 次操作 | outline | bg #FFF / text #181C25 / border #DEE1E8 |
| 文字操作 | ghost | text #0C6CFF，无背景 |
| 危险操作 | destructive | bg #FF522A / text #FFF |

状态标签（扩展 Badge）：
```tsx
const statusVariants = {
  success: "bg-[#F0FFF4] text-[#30C776] border border-[#ABEDC3]",
  danger:  "bg-[#FFF5F0] text-[#FF522A] border border-[#FFBDA3]",
  warning: "bg-[#FFF5E6] text-[#FF7C19] border border-[#FFE2BD]",
  neutral: "bg-[#F2F4FB] text-[#545861] border border-[#DEE1E8]",
}
```

卡片区分规则（二选一，不叠加）：
- `box-shadow: 0 8px 24px rgba(24,28,37,0.06)`
- `border: 1px solid #DEE1E8`

---

## 七、弹窗规范

宽度：400px（确认）/ 560px（中型）/ 760px（大型）/ 禁止百分比
结构：header(15px/500/#181C25) → body(padding:24px, max-h:70vh) → footer(12px 24px,
取消靠左主操作靠右，固定不滚动)

---

## 八、布局框架约束

必须保留现有布局框架，变更前询问用户：
- 有顶栏 → 保留，shadcn 实现
- 有侧栏 → 保留，shadcn 实现
- 有卡片 → 保留，shadcn Card 实现
- 有背景底色 → 保留 #EFF1F3
- 有 Tab → 保留，shadcn Tabs 实现

---

## 九、Icon 库（本地资产）

```yaml
library: framework/assets/icons + framework/assets/figma-icons + framework/assets/ai-notes
default_size: 16px
```

使用流程（必须按顺序执行）：
```bash
# 1. 搜索
find framework/assets/icons framework/assets/figma-icons framework/assets/ai-notes -type f | rg -i "{关键词}"
# 2. 验证
ls "{asset-path}"
# 3. 在 HTML 原型里引用
<img src="./assets/icons/{name}.svg" alt="" class="h-4 w-4" />
```

禁止：lucide-react / heroicons / emoji / 未经本地存在性验证的 asset path

---

## 十、禁止事项

```
原型层：
  ✗ 内联样式 style={{}}
  ✗ 硬编码颜色值（用 CSS 变量）
  ✗ shadcn/ui 以外的 UI 组件库
  ✗ 弹窗百分比宽度
  ✗ 表外间距数值

设计层：
  ✗ 改动报告未提及的内容
  ✗ 未询问用户擅自更改布局框架
  ✗ 主色超过 3 处
  ✗ 卡片同时有阴影和边框
  ✗ 同区域超过 1 个主操作按钮
  ✗ 正文/表格/字段值使用 500/700 字重
```

---

## 十一、交付前自检清单

```
字体
  [ ] L1～L4 四级全部出现？
  [ ] 字段名（L3）比字段值（L2）颜色浅？
  [ ] 正文/表格无 500/700 字重？

颜色
  [ ] #FF8000 ≤ 3 处？
  [ ] 功能色只用于状态？
  [ ] 卡片与背景有区分？

间距
  [ ] 所有间距在 [4,8,12,16,24,32,40]px 内？
  [ ] 表格行高 36px？
  [ ] 卡片内边距 12～16px？

一致性
  [ ] 同类容器圆角统一？
  [ ] 有阴影的容器无边框？
  [ ] 无超出框架的新元素（或已声明来源）？

可追溯
  [ ] 每处改动有 <!-- FIX: {ISSUE_ID} --> 注释？
  [ ] 所有改动对应报告 issue？
  [ ] 无改动报告未提及的内容？
```
