# luca_gstack — AI Design Workflow OS

> 一个基于 Claude Code 的 AI 产品设计工作流编排系统：斜杠命令驱动，从需求到原型再到工程规格的全链路。

## Overview

luca_gstack 是一个 **Skill OS**，通过斜杠命令驱动从需求到原型、再到工程规格的全链路工作流。

架构原则是 **Skill-first, Graph-optional**：每个一级 skill 默认可独立使用，流程编排只在你主动选择时启用。

产品中性，四类场景跨项目适用：

- **场景 A** — 新功能设计（从 0 到原型）
- **场景 B** — 已有功能优化（评审驱动改版）
- **场景 C** — 线上页面评审与改版
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

在项目目录下打开 Claude Code，输入 `/office` 查看所有可用 skill 及推荐工作流。

## Skill 索引

一级可见 skill（斜杠命令）：

| 命令 | 场景 | 用途 |
|------|------|------|
| `/office` | — | 显示所有一级可见 skill |
| `/auto` | A B C D | 全自动多 Agent 编排：自然语言 → Skill Pipeline → 并行执行 → 聚合产出 |
| `/idea` | A B | 已有原始语料忠实结构化（会议纪要/语音稿转需求，不延展不推断）|
| `/deepresearch` | A B D | 多 Agent 深度研究报告 |
| `/quick-research` | A B D | 轻量研究（单 agent 查 primary source，三档研究的中档）|
| `/brainstorm` | A B D | 苏格拉底拷问式 PRD |
| `superpowers:brainstorming` | A B | 轻量设计文档 |
| `/ux-research` | A B D | 多维度 UX 深度研究（5+1 并行 agent，共识矩阵）|
| `/ux-brainstorm` | A B D | 发散引擎：2-3 方案 + Oracle 对抗 + AI-Native 判定 |
| `/design-brief` | A B C D | 收敛引擎：方向 → 规格契约（决策卡/状态/组件映射）|
| `/open-design` | A B C D | Open Design 产出（设计产出首选）：需求 → HTML →（可选）Figma |
| `/html-prototype` | A B C | HTML 原型生成（备选，OD 不可用时）|
| `/ux-audit` | B C | UX 评审（多选模块）|
| `/figma-layer` | A C | Figma 保险层 |
| `/tech-spec` | A B D | 工程规格节点：PRD + design-brief → 技术合同，强制覆盖率验证 |
| `/task-plan` | A B D | 任务编排计划：断言矩阵 + 开发/测试任务卡 |

工程/质量 skill：

| 命令 | 用途 |
|------|------|
| `/code-hygiene` | 代码层工程约束：完成前验证铁律 + 清理算子（死代码/重复/弱类型等，仅自动应用高置信项）|

> 完整触发词与路由规则见 `.claude/skill-os/skill-routing-map.yaml` 与 `CLAUDE.md`。
> 高级/隐藏 skill（challenge、redteam、evals、retro 等）不作一级入口，需要时按名调用。

## 目录结构

```
luca_gstack/
  CLAUDE.md               ← Claude Code 配置与 skill 路由规则
  CONTEXT.md              ← 跨 session 长期项目约束
  brand-tokens.md         ← 品牌色 token
  framework/              ← HTML 原型母版（只读保护区）
  memory/                 ← 三层记忆系统（episodic / semantic；procedural 已并入 semantic domain:skill-rule）
  scripts/                ← 验证与维护脚本
  .claude/
    skills/office/        ← Skill 定义文件
    skill-os/             ← 路由表 / 编排图 / 输入模式 / 契约配置
    observability/        ← skill 观察记录与短规则
    agents/               ← Orchestrator / Plan / Work / Quality-gate 等 agent 定义
    hooks/                ← Session 生命周期钩子
    workflow-state.yaml   ← symlink 到当前项目 .luca/workflow-state.yaml
  docs/                   ← symlink 到 /Users/luca/Desktop/项目/<项目名>/docs
    handoff/              ← 当前项目 Skill 交接摘要
```

`luca_gstack` 是运行环境，不保存项目产出。项目产出和项目状态放在
`/Users/luca/Desktop/项目/<项目名>/`；本仓只通过 `docs/` 和
`.claude/workflow-state.yaml` 等 symlink 暴露当前激活项目。

## Contributing

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

## Security

详见 [SECURITY.md](./SECURITY.md)

## License

MIT © 2025-2026 luca
