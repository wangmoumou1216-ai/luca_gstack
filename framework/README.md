# framework/ — 原型框架文件使用说明

> 本目录是 `/html-prototype` skill 的核心输入。
> **所有原型生成必须先读本文件，再操作框架 HTML。**

---

## 文件清单（5个可用母版）

| 文件名 | 母版类型 | 适用场景 |
|-------|---------|---------|
| `list-page.html` | 列表页 | 筛选+列表+操作+分页，如客户列表、商机列表 |
| `detail-page-2col.html` | 详情页（两列）| 基本信息+Tab+右侧关联，较简单的详情页 |
| `detail-page-3col.html` | 详情页（三列）| 左摘要+中Tab+右动态流，完整客户/商机详情页 |
| `form-page.html` | 表单页 | 全屏新建/编辑表单，无顶栏侧栏 |
| `home-page.html` | 首页/仪表盘 | 统计卡片+快捷入口+动态流 |
| `ai notes.html` | AI速记入口页 | 当前包未提供该文件；如需使用，先补齐母版 |
| `ai note template.html` | 录音工作页 | 当前包未提供该文件；如需使用，先补齐母版 |

> `tokens.css`（已废弃）— 旧 `--fx-*` 命名体系的历史参考，当前不被任何模板引用。现行 token 体系定义在各模板的 `<style>` 内联块中。
> `assets/`：图标、图片、本地 Tailwind CDN。

---

## 母版选择速查

```
需求描述包含                    → 使用母版
「列表」「筛选」「分页」「表格」  → list-page.html
「详情」「Tab」「关联」（简版）  → detail-page-2col.html
「客户详情」「商机详情」「三栏」 → detail-page-3col.html
「新建」「创建」「编辑」「表单」 → form-page.html
「首页」「仪表盘」「概览」「统计」→ home-page.html
「AI速记」「录音入口」「会议入口」→ 当前无整页母版，使用局部改动/独立组件，或先补齐 ai notes.html
「录音中」「会议进行中」「语料」「洞察」→ 当前无整页母版，使用局部改动/独立组件，或先补齐 ai note template.html
```

---

## 技术规范

### CSS Variables（shadcn HSL 体系，定义在 shared-head.html）

所有母版统一使用 `shared-head.html` 中的 `:root` CSS 变量。品牌色 `#FF8000` 的唯一定义点是 `--primary: 30 100% 50%`。

```css
/* 品牌色 */
--primary: 30 100% 50%;              /* #FF8000 */
--primary-foreground: 0 0% 100%;
--accent: 37 100% 94%;               /* #FFF7E6 品牌浅色 */
--ring: 30 100% 50%;                 /* focus ring */

/* 语义色 */
--foreground: 222.2 84% 4.9%;        /* 主要文字 */
--muted-foreground: 215.4 16.3% 46.9%;  /* 次要文字 */
--border: 220 13% 88%;               /* 分割线 */
--page-bg: 220 14% 94%;              /* 页面背景 #EFF1F3 */
--destructive: 353 100% 64%;         /* #ff4a66 危险 */
--info: 207 100% 55%;                /* #189dff 信息 */
--success: 90 57% 51%;               /* #87cc3b 成功 */
--warning: 24 100% 55%;              /* #ff7c19 警告 */
```

### Tailwind class（在 HTML class 中使用）

```
bg-primary / text-primary    → #FF8000（品牌主色）
text-foreground              → 主要文字
text-muted-foreground        → 次要文字
border-border                → 分割线
bg-page-bg                   → 页面背景
bg-accent                    → 品牌浅色背景
bg-destructive               → 危险
bg-info / bg-success         → 信息/成功状态
```

### 字号（framework 自定义，不用 text-sm/base）

```
text-11  → 11px/14px
text-12  → 12px/18px
text-13  → 13px/18px（正文/字段值）
text-14  → 14px/20px
text-15  → 15px/24px（区块标题）
text-18  → 18px/28px
```

### Tailwind CDN（本地离线版，不用外部 CDN）

```html
<script src="./assets/vendor/tailwindcss.com.js"></script>
```

### 图标

```
assets/icons/       → 通用功能图标（SVG）
assets/ai-notes/    → AI速记专属图标
assets/figma-icons/ → Figma 专用图标（录音工作页用）
用法：<img src="./assets/icons/search.svg" class="w-[18px] h-[18px]" alt="" />
找不到：显式调用隐藏图标检索 skill `fx-icon-search` 查找 fx-icon-xxx class
```

---

## MODULE 体系（data-module 属性）

list/detail/home 三个母版使用 `data-module` 标注所有可操作区域，对话时用 module 名指代区域。

### 所有母版共用的 module（不修改）

| data-module | 说明 |
|------------|------|
| `page-root` | 页面根容器 |
| `mod-top-nav` | 顶栏（48px） |
| `mod-channel-bar` | 左侧频道栏（64px） |
| `mod-crm-sidebar` | CRM 二级侧边栏（220px，仅 list/detail）|

### 主内容区（替换目标）

| 母版 | 替换区域 | data-module |
|------|---------|-------------|
| list-page | 主列表卡片区 | `mod-main-canvas` → `mod-list-card` |
| detail-2col | 主内容区 | `mod-main-canvas` |
| detail-3col | 三栏主内容区 | `mod-main-canvas` → `mod-col-left` / `mod-col-center` / `mod-col-right` |
| home-page | 主内容区 | 直接替换 `#sub-tpl` 内容区 |

### detail-page-3col 的完整 MODULE 索引

```
mod-col-left              左栏 400px
  mod-left-toolbar            工具条（关/刷新/钉/锁/翻页）
  mod-left-customer-header    客户标题区（LOGO/主标题/快捷图标）
  mod-left-tags               客户标签行
  mod-left-action-buttons     主操作按钮区
  mod-left-related-team       相关团队
  mod-left-summary-fields     摘要字段列表

mod-col-center            中栏（自适应宽）
  mod-center-opportunity-stage    商机阶段推进 Card
  mod-center-detail-tabs          详情 Tab Card
  mod-center-detail-tabs-nav      Tab 导航条
  mod-center-detail-scroll        可滚动内容区
  mod-center-collapsible-basic    折叠区·基本信息
  mod-center-collapsible-tag-data 折叠区·客户标签数据
  mod-center-collapsible-system   折叠区·系统信息

mod-col-right             右栏 400px
  mod-right-tabs              Tab（动态/审批/销售助手）
  mod-right-quick-actions     快捷操作行
  mod-right-filter-bar        筛选栏
  mod-right-activity-feed     动态时间轴
```

### AI速记母版的区域（当前包未提供文件）

以下是保留的目标结构说明，不代表当前 `framework/` 目录里已有对应 HTML 文件。使用前必须先补齐母版；未补齐时，`/html-prototype` 应走「局部改动/独立组件」。

**ai notes.html（入口页）**
```
.topbar           顶栏
.sidebar          左侧频道栏（64px）
.main-shell       主内容白色容器
  .hero-title     AI速记标题区（图标 + H1）
  .action-grid    录音/会议两列功能卡片
    .action-card.recording    现场录音卡
    .action-card.meeting      线上会议卡
  .upload-bar     上传录音文件栏
  .history-card   历史记录表格
```

**ai note template.html（录音工作页）**
```
.header           标题栏（60px，显示功能名称）
.content          主内容区
  .layout         左右两栏布局
    .card.left    语料区（语音转文字实时显示 + 底部音频控制条）
      .speech-wrap    语料滚动区
      .audio-bar      录音控制栏（orb + 波形 + 暂停/结束）
    .card.right   洞察区（AI实时分析结果）
```

---

## 使用方法

### 全新页面（场景A）

```
1. 选定母版（参考上方选择速查）
2. 复制目标 HTML → docs/prototype/YYYY-MM-DD-<topic>/index.html
3. 复制 assets/ → docs/prototype/YYYY-MM-DD-<topic>/assets/
4. 定位替换区（见上方 MODULE 索引）
5. 只替换主内容区内容
6. 顶栏/频道栏/侧边栏 直接沿用，不修改
7. 激活侧边栏对应菜单项的高亮样式
```

### 局部改动（场景A）

不复制框架文件，只生成改动区 HTML 片段。
文件头注释：`<!-- 挂载位置：[页面名] 的 data-module="[module名]" -->`

### 独立组件（弹窗/抽屉）

完整 `<html>` 骨架，引入本地 Tailwind CDN 和 tokens。不使用任何母版页面结构。

### 优化现有（场景B）

复制对应母版 → 区分改动区/保持区：

```html
<!-- ===== 改动区 START — 对应决策 D-001: [决策名] ===== -->
{新内容}
<!-- ===== 改动区 END ===== -->

<!-- ===== 保持区 START — 无对应决策，保持原样 ===== -->
{原内容}
<!-- ===== 保持区 END ===== -->
```

### 评审改版（场景C）

每处改动加 FIX-ID 注释：
`<!-- FIX: UX-A-P0-001 — [原因描述] -->`

---

## 关键约束

1. **不用外部 CDN** — tailwind 用 `./assets/vendor/tailwindcss.com.js`
2. **颜色用 alias** — 优先 `text-n19`、`bg-primary`，不手写 `#181c25`
3. **字号用自定义尺寸** — 用 `text-13`、`text-15`，不用 `text-sm`
4. **不修改顶栏/频道栏** — 超出原型范围
5. **图标来源顺序** — 先查 `assets/icons/`（或 `assets/ai-notes/`），找不到再显式调用隐藏图标检索 skill `fx-icon-search`
