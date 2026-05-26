# brand-tokens.md — 品牌 Token 映射表 v3.0

> **用途：** 定义品牌色对 shadcn CSS 变量的覆盖。
> **原则：** 只覆盖有品牌化需求的 token，其余全部沿用 shadcn 默认值。
> **唯一配色体系：** shadcn HSL CSS Variables。不再使用 `--fx-*` 前缀。

---

## 品牌色覆盖（3 个变量）

| 用途 | shadcn CSS 变量 | HSL 值 | Hex 等价 |
|------|----------------|--------|---------|
| 主色（主按钮/主操作/激活态） | `--primary` | `30 100% 50%` | `#FF8000` |
| 主色前景（主按钮文字） | `--primary-foreground` | `0 0% 100%` | `#FFFFFF` |
| 焦点环 | `--ring` | `30 100% 50%` | `#FF8000` |

**品牌浅色（通过 accent 映射）：**
- `--accent: 37 100% 94%` (#FFF7E6)
- `--accent-foreground: 30 100% 50%` (#FF8000)

**其余 token 不覆盖，沿用 shadcn 默认值。**

---

## 纷享销客扩展语义色

| 用途 | CSS 变量 | HSL 值 | Hex 等价 |
|------|---------|--------|---------|
| 信息/链接 | `--info` | `207 100% 55%` | `#189dff` |
| 成功/在线 | `--success` | `90 57% 51%` | `#87cc3b` |
| 警告 | `--warning` | `24 100% 55%` | `#ff7c19` |
| 危险/删除 | `--destructive` | `353 100% 64%` | `#ff4a66` |

---

## HTML 原型使用方式

所有母版已统一使用 `framework/shared-head.html` 中的配置。品牌色通过 `:root` 变量自动生效。

**在组件里使用：**
- 主操作按钮：`class="btn-default"` 或 `bg-primary text-primary-foreground hover:bg-primary/90`
- 激活态文字：`text-primary`
- 品牌浅色背景：`bg-accent text-accent-foreground`

**全页品牌色限制：≤3 处可见使用。**

---

## Figma 保险层使用方式

在 Figma Variables 面板里：
1. `color/primary` → `#FF8000`
2. `color/primary-foreground` → `#FFFFFF`
3. `color/ring` → `#FF8000`

<!-- FILE_END: brand-tokens.md -->
