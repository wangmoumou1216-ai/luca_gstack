---
name: fx-icon-search
preamble-tier: 1
description: >
  Search, validate, and generate Fx icon usage snippets from the official Fx icon source. Use when
  producing HTML prototypes or Figma handoff and you need to find icon class names, validate
  existing icon usage, generate HTML snippets, inventory icon usage in files, or refresh local icon
  cache.
context-cost:
  self: 475
  runtime-estimate: 5000
  shared-refs: [none]
  recommended-model: haiku  # 图标搜索
---

# Fx Icon Search

## Overview

Use this skill to look up existing local icon assets for HTML prototypes and Figma handoff.
This project does not include the old fx-icon CLI launcher scripts, so lookup is local-file based.

## Quick Start

Search local icon assets:

```bash
find framework/assets/icons framework/assets/figma-icons framework/assets/ai-notes -type f -iname '*keyword*'
```

## Core Tasks

### 1) Search icon candidates

```bash
find framework/assets/icons framework/assets/figma-icons framework/assets/ai-notes -type f | rg -i 'user|settings|calendar|todo|crm|search'
```

### 2) Validate icon classes

For this project, validation means verifying the referenced asset path exists and renders as an SVG or PNG.
Use `ls` or `file` on the chosen asset before referencing it.

### 3) Generate icon snippets

```html
<img src="./assets/icons/search.svg" alt="" class="h-4 w-4" />
```

### 4) Inventory icon usage

```bash
rg -n 'assets/(icons|figma-icons|ai-notes)/|<img[^>]+\\.svg|\\.png' docs/prototype framework
```

### 5) Fallback

If no local icon fits, use a text placeholder during planning:

```text
[icon: 含义]
```

Then resolve it during `/html-prototype` or `/figma-layer`.

## Reliability Rules

- Prefer existing local assets over inventing inline SVG.
- Do not use emoji as functional icons.
- If copying framework assets into a prototype folder, update paths to `./assets/...`.
- If an icon cannot be found, leave `[icon: 含义]` instead of drawing decorative SVG.

<!-- FILE_END: .claude/skills/office/fx-icon-search/SKILL.md -->
