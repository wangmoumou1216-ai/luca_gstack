# luca_gstack — AI Design Workflow OS

> 一个基于 Claude Code 的 AI 设计工作流编排系统，专为纷享销客 CRM 产品设计而构建。

## Overview

luca_gstack 是一个 **Skill OS**，通过斜杠命令驱动从需求到原型的全链路设计工作流。

适用场景：
- **场景 A** — 新功能设计（从 0 到原型）
- **场景 B** — 已有功能优化（评审驱动改版）
- **场景C** — 线上页面评审与改版
- **场景 D** — Agent 化改造（把手动操作变为 AI 监督执行）

## Quick Start

### 先决条件

- [Claude Code](https://claude.ai/code) CLI 已安装
- macOS / Linux
- Git ≥ 2.x

### 安装

```bash
git clone https://github.com/wangmoumou1216-ai/luca_gstack.git luca_gstack
cd luca_gstack
git config core.hooksPath .githooks
```

### 使用

在项目目录下打开 Claude Code，输入 `/office` 查看所有可用 skill。

## Skill 索引

| 命令 | 场景 | 用途 |
|------|------|------|
| `/office` | — | 显示所有一级 skill |
| `/auto` | A B C D | 全自动多 Agent 编排 |
| `/idea` | A B | 需求方向确认 |
| `/brainstorm` | A B D | 苏格拉底式 PRD 拷问 |
| `superpowers:brainstorming` | A B | 轻量设计文档 |
| `/deepresearch` | A B D | 多 Agent 深度研究报告 |
| `/ux-research` | A B D | 多维度 UX 深度研究（5+1 并行 agent）|
| `/ux-brainstorm` | A B D | UX 设计方案编排（7 个 UX 逼问，2-3 方案）|
| `/design-brief` | A B C D | 轻量交互文档与原型决策 |
| `magicpath` | A B C D | React canvas 组件产出（设计产出首选）|
| `/html-prototype` | A B C | HTML 原型生成 |
| `/figma-demo` | A B C D | 口述 + Figma → HTML 演示 Demo |
| `/ux-audit` | B C | UX 评审（多选模块）|
| `/compare` | A B C D | 方案/版本/截图对比 |
| `/figma-layer` | A C | Figma 保险层 |
| `/tech-spec` | A B D | 工程规格文档 |
| `/task-plan` | A B D | 任务编排计划 |

## 目录结构

```
luca_gstack/
  CLAUDE.md               ← Claude Code 配置与 skill 路由规则
  CONTEXT.md              ← 跨 session 长期记忆
  brand-tokens.md         ← 品牌色 token
  framework/              ← HTML 原型母版（只读）
  memory/                 ← 三层记忆系统（episodic/semantic/procedural）
  scripts/                ← 验证与维护脚本
  .claude/
    skills/office/        ← Skill 定义文件
    hooks/                ← Session 生命周期钩子
    workflow-state.yaml   ← symlink 到当前项目 .luca/workflow-state.yaml
  docs/                   ← symlink 到 /Users/luca/Desktop/项目/<项目名>/docs
    handoff/              ← 当前项目 Skill 交接摘要
```

`luca_gstack` 是运行环境，不保存项目产出。项目产出和项目状态放在
`/Users/luca/Desktop/项目/<项目名>/`；本仓只通过 `docs` 和
`.claude/workflow-state.yaml` symlink 暴露当前激活项目。

## Contributing

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

## Security

详见 [SECURITY.md](./SECURITY.md)

## License

MIT © 2025-2026 luca
