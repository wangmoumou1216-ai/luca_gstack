# Contributing to luca_gstack

感谢你的贡献！本文档说明如何参与 luca_gstack 的开发与维护。

## 先决条件

- [Claude Code](https://claude.ai/code) CLI（最新版本）
- Git ≥ 2.x
- macOS / Linux
- Node.js ≥ 20.0.0（用于运行 session hooks 和验证脚本）

## 本地设置

```bash
# 1. Clone 仓库
git clone https://github.com/wangmoumou1216-ai/luca_gstack.git luca_gstack
cd luca_gstack

# 2. 激活 Git hooks（必须）
git config core.hooksPath .githooks

# 3. 验证环境
bash scripts/verify.sh
```

## 分支命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 新 skill | `skill/<skill-name>` | `skill/competitor-analysis` |
| 功能优化 | `feature/<description>` | `feature/memory-system` |
| Bug 修复 | `fix/<description>` | `fix/workflow-state-recovery` |
| 文档更新 | `docs/<description>` | `docs/update-contributing` |
| 配置变更 | `config/<description>` | `config/add-ci-workflow` |

## Commit 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <description>

类型：feat / fix / docs / config / skill / refactor / test
范围（可选）：skill 名称、模块名
```

**示例：**

```
feat(skill): add competitor-analysis skill
fix(workflow): correct state recovery on session restart
docs: update CONTRIBUTING with branch naming rules
```

## Skill 开发规范

新增 skill 必须满足以下要求：

1. **SKILL.md**：在 `.claude/skills/office/<skill-name>/SKILL.md` 创建完整定义文件
2. **斜杠命令入口**：在 `.claude/commands/<skill-name>.md` 创建入口文件
3. **Handoff 协议**：skill 完成后必须写 `docs/handoff/` 摘要
4. **workflow-state 节点**：在 `.claude/workflow-state.yaml` 添加对应节点
5. **CHANGELOG 更新**：在 `## [Unreleased]` 下记录新增 skill

## PR 流程

1. 从最新 `main` 分支创建功能分支
2. 完成开发后确保 `bash scripts/verify.sh` 通过
3. 更新 `CHANGELOG.md` 的 `[Unreleased]` 部分
4. 创建 Pull Request，填写 PR 模板
5. PR 必须关联至少一个 Issue（除非是 docs 类型）
6. CI 检查全部通过后方可合并

## 代码审查标准

- [ ] Skill 有完整的 SKILL.md 定义
- [ ] 不向 `framework/` 只读目录写入内容
- [ ] `workflow-state.yaml` 格式合法
- [ ] 无 API key 或敏感信息（pre-commit 会检测）
- [ ] CHANGELOG 已更新

## 问题反馈

- Bug 报告：使用 GitHub Issue 的 `bug_report` 模板
- 新 skill 请求：使用 `skill_request` 模板
- 安全漏洞：**不要**公开提 Issue，直接发邮件至 <wangzixuan0828@gmail.com>
