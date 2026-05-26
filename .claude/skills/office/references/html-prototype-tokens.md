# HTML 原型 Token 速查手册

> 共享 reference。被 `/html-prototype` 引用。
> 这是给 Claude 写原型时用的"可直接复制"速查表。方法论借鉴
> ConardLi/web-design-skill 的 oklch 色彩系统和 token 分层思想。

---

## 0. 这份文件是干什么的

`framework/tokens.css` 定义了完整的品牌 token（页面底色 / 中性色阶 / 品牌色）
。但写原型时有两个痛点：

1. Claude 每次都要从品牌 hex 值手动推算哪个 Tailwind class 对应——容易出错
2. AI 专有状态（思考中 / 低置信 / 拒答）在 framework 里**没有定义**——每次都要重新想

这份文件解决这两件事：
- 把 framework 的 hex token 映射到 Tailwind 类，**速查不查算**
- 为 AI 专有 7 个状态定义**语义 token**，并给 oklch 派生值

**原则：** 本文件是 framework/tokens.css 的**使用说明**，不是替代。
所有硬值以 framework/tokens.css 为准。

---

## 1. 速查表：hex → Tailwind class

### 颜色（直接从品牌色派生）

| 语义 | Hex | oklch | Tailwind class（framework 已定义） | 使用场景 |
|------|-----|-------|--------------------------------|---------|
| 品牌主色 | `#FF8000` | `oklch(0.72 0.177 50)` | `bg-primary` / `text-primary` / `border-primary` | 主 CTA、激活态、链接强调（全页 ≤ 3 处） |
| 主色浅底 | `#FFF7E6` | `oklch(0.97 0.025 78)` | `bg-primary/10` 或自定义 | 主色功能的浅底卡片 |
| 主色边框 | `#FFCA7A` | `oklch(0.85 0.11 70)` | `border-primary/50` | 主色功能的边框 |
| 主文字 L1/L2 | `#181C25` | `oklch(0.21 0.014 260)` | `text-n19` | 主标题、字段值、正文 |
| 次要文字 L3/L4 | `#91959E` | `oklch(0.65 0.011 260)` | `text-n11` | 标签、说明、时间戳 |
| 中灰文字 | `#545861` | `oklch(0.43 0.012 260)` | `text-n15` | 次要但非弱化的文字 |
| 占位文字 | `#C1C5CE` | `oklch(0.78 0.009 260)` | `text-n07` | placeholder、disabled |
| 分割线 | `#DEE1E8` | `oklch(0.89 0.006 260)` | `border-n05` | 表格分隔、卡片分隔 |
| 表格行分割 | `#EAEBEE` | `oklch(0.93 0.004 260)` | `border-row-line` | 表格行之间 |
| 页面底色 | `#EFF1F3` | `oklch(0.95 0.004 260)` | `bg-page-bg` | body 背景 |
| 卡片底色 | `#FFFFFF` | `oklch(1 0 0)` | `bg-surface` / `bg-white` | 内容区卡片 |
| 特殊浅蓝 | `#F2F4FB` | `oklch(0.96 0.01 260)` | `bg-special01` | 特殊信息区 |

### 功能语义色（警告 / 成功 / 信息）

| 语义 | 主色 | 浅底 | 边框 | Tailwind class |
|------|-----|------|-----|--------------|
| 危险 / 错误 | `#FF4A66` | `#FFF0F0` | `#FFC4C7` | `text-magenta` / `bg-magenta-bg` / `border-magenta-border` |
| 警告 | `#FF7C19` | `#FFF5E6` | `#FFCD94` | `text-warning` / `bg-warning-bg` / `border-warning-border` |
| 成功 | `#87CC3B` | `#FAFFF0` | `#DDF2BB` | `text-info-green` / `bg-info-green-bg` / `border-info-green-border` |
| 信息 | `#189DFF` | `#E6F9FF` | `#91DCFF` | `text-info-blue` / `bg-info-blue-bg` / `border-info-blue-border` |
| 链接 | `#0C6CFF` | — | — | `text-link` |

**禁用：** 不要用 `text-red-500` / `text-yellow-500` / `text-blue-500` 等 Tailwind
默认色。B2B 的危险色是 `#FF4A66`（带品牌温度），不是 Tailwind 的纯红。

---

## 2. 字号速查表

| 语义 | 字号 | 行高 | 字重 | Tailwind class | 使用场景 |
|------|-----|------|-----|--------------|---------|
| L1 区块标题 | 15px | 24px | 500 | `text-15 font-medium` | 页面主标题、卡片标题、Tab 标签 |
| L2 正文 / 字段值 | 13px | 18px | 400 | `text-13` | 表格值、描述文字、正文段落 |
| L3 字段标签 | 13px | 18px | 400 | `text-13 text-n11` | Form label、table header、次要说明 |
| L4 辅助 / 时间戳 | 12px | 18px | 400 | `text-12 text-n11` | 元数据、版权、footnote |

**禁用字号：**
- ❌ `text-xs` (12px)：不是 framework 规范
- ❌ `text-sm` (14px)：B2B 场景没有 14 这一档
- ❌ `text-base` (16px)：13 和 15 覆盖了所有需求
- ❌ `text-lg` 及以上：除非是着陆页 Hero，B2B 产品界面不需要

**等价关系：**
```
text-15 = 15px / 24px line-height / 500 weight
text-13 = 13px / 18px line-height / 400 weight
text-12 = 12px / 18px line-height / 400 weight
```

---

## 3. 间距速查表（严格 7 档）

| 值 | Tailwind class | 使用场景 |
|---|--------------|---------|
| 4px | `p-1` / `gap-1` / `space-y-1` | 紧密元素间（图标+文字、徽章内） |
| 8px | `p-2` / `gap-2` | 小组件内部 padding、按钮内距 |
| 12px | `p-3` / `gap-3` | 中等组件间距、表单字段之间 |
| 16px | `p-4` / `gap-4` | 标准组件 padding、卡片内距 |
| 24px | `p-6` / `gap-6` | 卡片与卡片之间、区块内部分组 |
| 32px | `p-8` / `gap-8` | 大区块之间 |
| 40px | `p-10` / `gap-10` | 页面大区块（Hero 与内容、主区与 footer） |

**禁用间距：**
- ❌ `p-5` (20px)、`p-7` (28px)、`p-9` (36px)：打破视觉节奏
- ❌ `p-[22px]` 任何方括号自定义值
- ❌ `m-5` 等 margin 版本的非标准档

**特殊行高规则（B2B 高密度场景）：**
- 表格行最小 py-3（40px 总行高 = 13px 文字 + 上下 13.5px padding + 5% 容差）
- 列表项最小 py-4
- 段落用 `leading-relaxed`（1.625）保证扫描节奏

---

## 4. AI 专有状态 Token（新增，framework 里没有）

**原因：** 传统的"默认/空/加载/错误/成功"不够用于 AI 功能。AI 专有 7
个状态（见 `ai-native-state-coverage.md`）需要独立的视觉 token。

### 4.1 状态色定义（CSS 变量）

**直接复制到 `<style>` 标签内：**

```css
:root {
  /* ========== AI 专有状态色 ========== */

  /* 思考中态 — 骨架屏 / streaming */
  --ai-thinking-bg: #F2F4FB;        /* bg-special01 同色 */
  --ai-thinking-shimmer: linear-gradient(
    90deg,
    #F2F4FB 0%,
    #E8EBF5 50%,
    #F2F4FB 100%
  );

  /* 低置信态 — 灰色降权 */
  --ai-low-confidence-text: #91959E;   /* text-n11，降权但仍可读 */
  --ai-low-confidence-bg: #F7F8FA;     /* 比 bg-page-bg 稍暖的灰 */
  --ai-low-confidence-border: #DEE1E8; /* border-n05 同色 */

  /* 拒答态 — 信息不足 / 超出能力 */
  --ai-decline-bg: #FFF5E6;            /* 用 warning-bg（温和警告，不是错误）*/
  --ai-decline-text: #FF7C19;          /* text-warning */
  --ai-decline-border: #FFCD94;        /* border-warning-border */

  /* 部分完成态 — Agent 中途失败 */
  --ai-partial-success: #87CC3B;       /* 已完成步骤 = 绿 */
  --ai-partial-failed: #FF4A66;        /* 失败步骤 = 危险红 */
  --ai-partial-pending: #91959E;       /* 未执行步骤 = 灰 */

  /* 待 Steer 态 — 多候选等用户选 */
  --ai-candidate-border: #DEE1E8;      /* 候选卡片默认边框 */
  --ai-candidate-hover: #FF8000;       /* hover 时变主色 */
  --ai-candidate-selected: #FFF7E6;    /* 已选候选的背景 */

  /* 幻觉兜底态 — 用户标记错误 */
  --ai-feedback-positive: #87CC3B;     /* 👍 */
  --ai-feedback-negative: #FF4A66;     /* 👎 */
  --ai-feedback-recorded: #91959E;     /* "已记录" 提示文字 */

  /* Agent 执行中态 — 长时间运行 */
  --ai-agent-running-bg: #F2F4FB;
  --ai-agent-running-border: #189DFF;  /* 用 info-blue 表示"进行中" */
  --ai-agent-running-text: #189DFF;
}
```

### 4.2 各状态的标准视觉规范

#### 思考中态（Thinking / Streaming）

```html
<!-- Skeleton 骨架屏 -->
<div class="animate-pulse">
  <div class="h-4 bg-special01 rounded w-3/4 mb-2"></div>
  <div class="h-4 bg-special01 rounded w-1/2 mb-2"></div>
  <div class="h-4 bg-special01 rounded w-5/6"></div>
</div>

<!-- 或：流式文字 + stop 按钮 -->
<div class="flex items-start gap-2">
  <div class="flex-1 text-13 text-n19 leading-relaxed">
    AI 正在分析...<span class="animate-pulse">▊</span>
  </div>
  <button class="text-12 text-n11 hover:text-n15">Stop</button>
</div>
```

**禁用：** 普通 loading spinner（无信息量），纯"加载中..."文字（缺少过程感）。

#### 低置信态（Low Confidence）

```html
<!-- 结果灰色降权 + 标注 -->
<div class="bg-[#F7F8FA] border border-n05 rounded-md p-4">
  <div class="flex items-center gap-2 mb-2">
    <span class="text-13 text-n11">AI 建议</span>
    <span class="text-12 text-n11 bg-n05 rounded px-2 py-0.5">置信度：中</span>
  </div>
  <div class="text-13 text-n15">
    {AI 结果内容，用 n15 而非 n19，视觉上降权}
  </div>
  <div class="mt-3 text-12 text-n11">
    基于有限数据（{具体说明}）。
    <a href="#" class="text-primary hover:underline">提供更多信息提高准确度 →</a>
  </div>
</div>
```

**关键语义：** 用 `text-n15` 而不是 `text-n19`——主文字看起来"没那么笃定"，但仍可读。

#### 拒答态（Decline）

```html
<div class="bg-warning-bg border border-warning-border rounded-md p-4">
  <div class="flex items-start gap-2">
    <!-- [icon: info] 或 framework 的 info 图标 -->
    <div class="flex-1">
      <div class="text-13 font-medium text-warning mb-1">
        AI 暂时无法给出可靠建议
      </div>
      <div class="text-13 text-n15 mb-3">
        {具体原因：数据不足 / 超出能力 / 需要人工判断}
      </div>
      <div class="flex gap-3">
        <button class="text-13 text-primary hover:underline">
          {替代操作 A，如"手动查看"}
        </button>
        <button class="text-13 text-primary hover:underline">
          {替代操作 B，如"联系支持"}
        </button>
      </div>
    </div>
  </div>
</div>
```

**禁用：** 冷冰冰的 "Error" / "Cannot process"，空白界面，红色警告色（拒答不是错误）。

#### 部分完成态（Partial Completion，agent 场景）

```html
<!-- 步骤清单视图 -->
<div class="space-y-2">
  <!-- 成功步骤 -->
  <div class="flex items-center gap-3 p-3 bg-info-green-bg rounded">
    <span class="w-5 h-5 rounded-full bg-info-green text-white text-12 flex items-center justify-center">✓</span>
    <span class="flex-1 text-13 text-n19">{步骤 1 描述}</span>
  </div>
  <!-- 失败步骤 -->
  <div class="flex items-center gap-3 p-3 bg-magenta-bg rounded">
    <span class="w-5 h-5 rounded-full bg-magenta text-white text-12 flex items-center justify-center">×</span>
    <span class="flex-1 text-13 text-n19">{步骤 2 描述}</span>
    <div class="flex gap-2">
      <button class="text-12 text-primary hover:underline">重试</button>
      <button class="text-12 text-n11 hover:text-n15">跳过</button>
      <button class="text-12 text-n11 hover:text-n15">手动完成</button>
    </div>
  </div>
  <!-- 未执行步骤 -->
  <div class="flex items-center gap-3 p-3 bg-page-bg rounded">
    <span class="w-5 h-5 rounded-full border-2 border-n07"></span>
    <span class="flex-1 text-13 text-n11">{步骤 3 描述}</span>
  </div>
</div>
```

#### 待 Steer 态（Multiple Candidates）

```html
<!-- 2-3 候选平铺 -->
<div class="grid grid-cols-3 gap-3">
  <button class="border border-n05 rounded-md p-4 hover:border-primary text-left">
    <div class="text-13 font-medium text-n19 mb-1">候选 A</div>
    <div class="text-13 text-n15">{简述特点}</div>
  </button>
  <!-- ... 候选 B、C -->
</div>
<div class="flex gap-3 mt-3">
  <button class="text-13 text-n11 hover:text-n15">都不满意，重新生成</button>
  <button class="text-13 text-n11 hover:text-n15">按我的来</button>
</div>
```

#### 幻觉兜底态（Hallucination Recovery）

```html
<!-- 反馈入口（不突兀） -->
<div class="flex items-center gap-2 text-12 text-n11">
  <span>这个建议有帮助吗？</span>
  <button class="hover:text-info-green">👍</button>
  <button class="hover:text-magenta">👎</button>
</div>

<!-- 反馈后的确认 -->
<div class="text-12 text-n11">
  已记录。感谢反馈，这类问题下次我们会改进。
</div>
```

#### Agent 执行中态（Running）

```html
<!-- 后台任务条（固定在底部或侧边） -->
<div class="bg-info-blue-bg border border-info-blue-border rounded-md p-3 flex items-center gap-3">
  <div class="w-2 h-2 bg-info-blue rounded-full animate-pulse"></div>
  <div class="flex-1">
    <div class="text-13 font-medium text-n19">{Agent 任务名}</div>
    <div class="text-12 text-n11">当前步骤：{具体步骤} · 已完成 {N}/{M}</div>
  </div>
  <button class="text-13 text-n15 hover:text-n19">暂停</button>
  <button class="text-13 text-primary hover:underline">查看详情</button>
</div>
```

---

## 5. 阴影速查（克制使用，≤ 3 处/页）

| 层级 | Tailwind class | 使用场景 |
|-----|--------------|---------|
| 微阴影 | `shadow-sm` | 悬浮微卡片、Tooltip |
| 标准阴影 | `shadow-md` | Dropdown、Popover |
| 大阴影 | `shadow-lg` | Modal、Drawer |

**禁用：**
- ❌ `shadow-xl` / `shadow-2xl`（B2B 不需要这种视觉强度）
- ❌ 给表格每一行加阴影
- ❌ 给每个卡片加阴影（用 border-n05 分隔即可）

---

## 6. 圆角速查

| Tailwind class | 值 | 使用场景 |
|--------------|---|---------|
| `rounded` | 4px | 小标签、徽章 |
| `rounded-md` | 6px | 按钮、输入框、小卡片 |
| `rounded-lg` | 8px | 标准卡片 |

**禁用：**
- ❌ `rounded-xl` (12px) 及以上 — B2B 要克制
- ❌ `rounded-full` 除非是头像/状态点
- ❌ 同页混用 rounded 和 rounded-lg — 选一种坚持用

---

## 7. 动效速查（含无障碍兼容）

```css
/* 标准缓动函数（复制到 <style>） */
:root {
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);  /* B2B 推荐 */
  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);  /* 进入动画 */
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);  /* 退出动画 */

  --duration-fast: 150ms;   /* 按钮 hover */
  --duration-std: 200ms;    /* 大部分状态切换 */
  --duration-slow: 300ms;   /* 弹窗、drawer */
  --duration-max: 400ms;    /* 最长不得超过 */
}

/* 无障碍：尊重用户"减少动效"偏好 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
```

**禁用：**
- ❌ > 400ms 的动效（销售高频操作会觉得慢）
- ❌ 视差滚动 / Ken Burns（B2B 不需要）
- ❌ 整页背景视频 / 自动播放动画
- ❌ 没有处理 `prefers-reduced-motion` 的 autoplay 动画

---

## 8. 引用本文件的 skill

- `/html-prototype` — 必读。Phase 2.5 设计系统宣告引用本文件的 token 速查；
  Phase 3 生成代码时从本文件复制 AI 专有状态的 HTML 模板。
- `/design-brief` — 参考（非必读）。Phase 6 shadcn
  组件映射表的"自绘"区域可引用本文件的 token 规范。
- `/figma-layer` — 参考（非必读）。Figma 保险层的颜色 token 和本文件保持一致。

---

## 9. 维护约定

**硬值来源：** 所有颜色 hex 值以 `framework/tokens.css` 为准。
本文件只提供"使用速查"和"AI 专有状态扩展"。

**如何扩展：**
- 新增品牌色 → 先加到 framework/tokens.css，再在本文件的"速查表"追加一行
- 新增 AI 状态色 → 加到本文件第 4 节，同步更新 `ai-native-state-coverage.md`
- 新增字号档位 → 强烈不建议。真的需要时先问"能不能用现有四级解决"

<!-- FILE_END: html-prototype-tokens.md -->
