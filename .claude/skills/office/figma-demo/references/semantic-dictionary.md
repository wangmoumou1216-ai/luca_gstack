# 设计语义词典 — Semantic Dictionary

> 共享 reference。被 `/figma-demo` Phase 1 引用。
> 设计师口语 → 技术动效参数的映射表。
> 本文件持续生长：每次设计师用了新的表达方式，翻译确认后追加。

---

## 0. 使用规则

1. **精确匹配优先**：设计师的原话能在词典中找到完全匹配的词条 → 直接使用
2. **组合匹配**：一句话包含多个词条 →
   分别翻译后组合（如"丝滑地滑上来" = 丝滑 + 滑上来）
3. **近似匹配**：没有精确词条 → 找语义最接近的词条，在 requirement.md
   标注「词典近似匹配」
4. **未知词**：完全没有匹配 → 用 gstack 标准动效（--ease-standard,
   --duration-std），标注「词典无匹配，使用默认值」
5. **矛盾处理**：设计师口述的参数和词典定义冲突 → 以设计师口述为准，词典只是默认值

---

## 1. 动效感受词（整体动效的感受描述）

| 设计师口语 | duration | easing | 补充说明 |
|-----------|----------|--------|---------|
| 丝滑 | 400ms | cubic-bezier(0.25, 0.1, 0.25, 1) | 平滑流畅，无顿挫感 |
| 流畅 | 350ms | cubic-bezier(0.25, 0.1, 0.25, 1) | 与"丝滑"接近，略快 |
| 利落 / 干脆 | 200ms | cubic-bezier(0.4, 0, 0.2, 1) | 快速到位，不拖泥带水 |
| 轻柔 / 柔和 | 450ms | cubic-bezier(0.25, 0.46, 0.45, 0.94) | 慢入慢出，温和 |
| Q弹 / 有弹性 | 500ms | cubic-bezier(0.34, 1.56, 0.64, 1) | spring 效果，有回弹 |
| 果冻感 | 600ms | cubic-bezier(0.25, 1.5, 0.5, 1) | 更强的弹性，明显弹跳 |
| 呼吸感 | 2000ms | ease-in-out | opacity 0.4↔1 循环，infinite |
| 自然 | 300ms | cubic-bezier(0.4, 0, 0.2, 1) | Material Design 标准缓动 |
| 快 / 迅速 | 150ms | cubic-bezier(0.4, 0, 1, 1) | 最快响应，几乎瞬间 |
| 慢一点 | +150ms | 不变 | 在当前时长基础上加 150ms |
| 再快一点 | -100ms | 不变 | 在当前时长基础上减 100ms（不低于 100ms） |

---

## 2. 动效动作词（具体的运动方式）

### 出现类

| 设计师口语 | transform | opacity | 方向 |
|-----------|-----------|---------|------|
| 弹出 / 弹出来 | scale: 0.85→1 | 0→1 | 中心向外 |
| 轻轻弹出 | scale: 0.95→1 | 0→1 | 中心向外，幅度小 |
| 淡入 / 渐入 / 渐显 | 无 | 0→1 | — |
| 滑进来 / 滑入 | translateX: 100%→0 | 无 | 右→左 |
| 从左滑进来 | translateX: -100%→0 | 无 | 左→右 |
| 从上滑下来 / 掉下来 | translateY: -100%→0 | 无 | 上→下 |
| 滑上来 / 从底部出来 | translateY: 100%→0 | 无 | 下→上 |
| 升起来 / 浮起来 | translateY: 20px→0 | 0→1 | 下→上，幅度小 |
| 展开 | height: 0→auto 或 scaleY: 0→1 | 无 | 垂直展开 |
| 铺开 | width: 0→auto 或 scaleX: 0→1 | 无 | 水平展开 |
| 翻转出来 | rotateY: -90deg→0 | 无 | 3D 翻转 |
| 放大进入 | scale: 0→1 | 0→1 | 中心放大 |

### 消失类

| 设计师口语 | transform | opacity | 方向 |
|-----------|-----------|---------|------|
| 消失 / 隐藏 | 无 | 1→0 | — |
| 自然消失 / 渐隐 | 无 | 1→0 | duration 250ms |
| 滑走 / 滑出去 | translateX: 0→-100% | 无 | 当前→左 |
| 滑回去 | translateX: 0→100% | 无 | 当前→右 |
| 缩回去 | scale: 1→0.85 | 1→0 | 中心收缩 |
| 掉下去 / 沉下去 | translateY: 0→100% | 无 | 当前→下 |
| 收起来 | height: auto→0 或 scaleY: 1→0 | 无 | 垂直收起 |
| 折叠 | height: auto→0 | 无 | 垂直收起，同"收起来" |

### 切换类（页面间过渡）

| 设计师口语 | 动画描述 | 典型使用 |
|-----------|---------|---------|
| 推进去 / 翻到下一页 | 当前页 translateX→-100%，新页 translateX: 100%→0 | 前进导航 |
| 退回来 / 返回 | 当前页 translateX→100%，新页 translateX: -100%→0 | 后退导航 |
| 盖上来 / 覆盖 | 新层 translateY: 100%→0，z-index 升层 | 弹窗/抽屉 |
| 掀开 / 揭开 | 当前层 translateY: 0→100%，露出下层 | 关闭弹窗 |
| 淡入淡出 / 渐变切换 | 当前页 opacity→0，新页 opacity: 0→1 | 平级导航 |
| 无缝切换 | crossfade 200ms，几乎感知不到 | Tab 切换 |

---

## 3. 交互触发词

| 设计师口语 | 技术事件 | 说明 |
|-----------|---------|------|
| 点一下 / 点击 / 按 | click / tap | — |
| 长按 | longpress (touchstart 500ms) | 移动端 |
| 双击 | dblclick | — |
| 滑 / 滑动 / 往上滑 / 往下滑 | scroll | 方向从口述推断 |
| 拖 / 拖拽 | drag | — |
| hover / 鼠标放上去 / 划过去 | mouseenter | 桌面端 |
| 获焦 / 点进输入框 | focus | — |
| 失焦 / 点到别处 | blur | — |
| 松手 / 放开 | mouseup / touchend | — |
| 下拉刷新 | pull-to-refresh | 移动端 |

---

## 4. 视觉感受词

| 设计师口语 | 翻译 | 实现方式 |
|-----------|------|---------|
| 简洁 / 干净 | 大量留白，元素少 | 间距用 p-6/p-8，颜色用中性色 |
| 密集 / 紧凑 | 信息密度高 | 间距用 p-2/p-3，行高紧凑 |
| 有层次 / 层次分明 | 视觉层级清晰 | L1/L2/L3 字号+颜色差异明显 |
| 高级感 | 克制用色+精致间距 | 主色≤2处，阴影≤1处，圆角统一 |
| 透气 / 呼吸空间 | 元素间留白充足 | 间距≥p-6，section间≥p-8 |
| 扁平 | 无阴影无渐变 | shadow:none，bg纯色 |
| 毛玻璃 / 磨砂 | 背景模糊 | backdrop-filter: blur(12px)，bg rgba白70% |
| 悬浮感 | 有阴影+微偏移 | shadow-lg + translateY(-2px) on hover |
| 沉浸式 | 全屏无边框 | 隐藏顶栏侧栏，全屏背景 |

---

## 5. 布局描述词

| 设计师口语 | 翻译 | CSS 实现 |
|-----------|------|---------|
| 并排 / 横着排 | 水平排列 | flex-row / grid-cols-N |
| 竖着排 / 上下排 | 垂直排列 | flex-col |
| 居中 | 水平+垂直居中 | flex items-center justify-center |
| 靠左 / 靠右 | 对齐方向 | justify-start / justify-end |
| 吸底 / 固定在底部 | 底部固定 | fixed bottom-0 / sticky bottom-0 |
| 吸顶 | 顶部固定 | sticky top-0 |
| 铺满 / 全宽 | 宽度100% | w-full |
| 卡片 / 卡片式 | 有边框+圆角+padding | border rounded-lg p-4 bg-white |
| 网格 / 九宫格 | 等分网格 | grid grid-cols-3 gap-N |
| 两栏 / 左右分栏 | 左右布局 | grid grid-cols-[Wpx_1fr] 或 flex |
| 三栏 | 三栏布局 | grid grid-cols-[W_1fr_W] |
| 瀑布流 | 不等高网格 | columns-N 或 masonry |

---

## 6. 组件描述词

| 设计师口语 | 组件类型 | 默认行为 |
|-----------|---------|---------|
| 大按钮 / 主按钮 | Button primary | bg-primary text-primary-foreground rounded-md py-2 px-4 ⚠️见下注 |
| 小按钮 / 次要按钮 | Button outline | border border-n05 text-n19 rounded-md py-1.5 px-3 |
| 文字按钮 / 链接按钮 | Button ghost | text-primary hover:underline |
| 输入框 / 搜索框 | Input | border border-n05 rounded-md p-2 text-13 |
| 下拉 / 下拉选择 | Select / Dropdown | 同 Input + 下拉箭头 |
| 开关 / 切换 | Toggle / Switch | — |
| 标签 / Tag | Badge | bg-page-bg text-n15 rounded px-2 py-0.5 text-12 |
| 头像 | Avatar | rounded-full overflow-hidden |
| 分割线 / 横线 | Divider | border-t border-n05 |

> **⚠️ 主按钮前景色注记（2026-07-22）：** 原值 `text-white` 已改为 `text-primary-foreground`（走 token，不再写死白）。
> 注意 token 默认仍是白色，而 `#FF8000` + 白字实测 **2.52:1**，不满足 WCAG AA。
> **面向欧美 / 受 EAA·ADA 影响的项目必须覆盖为近黑 `#181C25`（6.77:1）**。
> 完整实测表与两条合规解见 `brand-tokens.md` §无障碍合规注记。
| 卡片 | Card | bg-white rounded-lg border border-n05 p-4 |
| 弹窗 / 模态框 | Modal | fixed inset-0 + 遮罩 + 居中卡片 |
| 抽屉 / 侧边抽屉 | Drawer | fixed right-0 top-0 h-full + 遮罩 |
| 底部面板 / 底部弹出 | Bottom Sheet | fixed bottom-0 + 遮罩 + 上圆角 |
| Toast / 提示 | Toast | fixed top-4 right-4 auto-dismiss 3s |
| 进度条 | Progress | h-1 bg-primary rounded-full |
| 骨架屏 / loading | Skeleton | animate-pulse bg-special01 |
| Tab / 标签页 | Tabs | 底部下划线切换 |
| 面包屑 | Breadcrumb | text-n11 + separator |
| 表格 | Table | border-collapse + 行分割线 |
| 时间线 / 动态 | Timeline | 左侧竖线 + 节点 |

---

## 7. 维护规则

### 新增词条

当设计师使用了词典中不存在的表达方式时：

1. Translator 用近似匹配或默认值完成本次翻译
2. 在 requirement.md 中标注「词典无精确匹配」
3. Demo 完成后，如果设计师确认效果满意：
   - 追加词条到本文件对应分类
   - 格式：`| {设计师原话} | {翻译参数} | {说明} |`
4. 如果设计师说"不对，我要的是…"：
   - 按设计师描述的效果确定参数
   - 追加词条，标注"由设计师校正"

### 个性化词条

不同设计师对同一个词的理解可能不同。如果发现某个设计师有独特的用词习惯：

```markdown
## 个性化词条 — {设计师名}

| 口语 | 标准词典翻译 | 该设计师的实际含义 | 确认时间 |
|------|------------|------------------|---------|
| "弹一下" | scale 弹出 | 指 translateY 抖动提醒 | 2026-05-03 |
```

---

## 8. 禁用词（不翻译为动效，而是触发追问）

| 设计师口语 | 为什么不直接翻译 | 应该追问 |
|-----------|----------------|---------|
| "炫酷" | 太模糊，可能指任何东西 | "具体什么效果让你觉得炫酷？" |
| "高大上" | 主观审美，无法映射参数 | "你觉得哪个产品的效果是高大上的？" |
| "像XX一样" | 需要知道XX是什么 | "你说的XX是哪个产品/页面？" |
| "动起来" | 不知道动什么、怎么动 | "哪个元素需要动？动的方式是？" |
| "酷炫一点" | 同"炫酷" | 同上 |

**注意：禁用词触发追问不在 Phase 2 Socratic 验证中，而是在 Phase 1
翻译时立即追问。这是"设计师友好的打扰"——立刻问清楚比事后做错好。**

<!-- FILE_END: semantic-dictionary.md -->
