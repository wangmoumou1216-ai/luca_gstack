# Contributing to luca_gstack

感谢你的贡献！本文档说明如何参与 luca_gstack 的开发与维护。

## 先决条件

- Claude Code 或 Codex；两者使用共享 skill 契约及各自入口
- Git ≥ 2.x
- macOS / Linux
- Node.js ≥ 20.19.0 与 npm；完整验证建议 Node.js 22，与 CI 一致
- Python 3、PyYAML、zsh、ripgrep；浏览器依赖准备见 [README 健康检查](README.md#健康检查)

## 本地设置

```bash
# 1. Clone 仓库
git clone https://github.com/wangmoumou1216-ai/luca_gstack.git luca_gstack
cd luca_gstack

# 2. 安装锁定的 Node 依赖
npm ci

# 3. 激活 Git hooks（必须）
git config core.hooksPath .githooks

# 4. 完成 README 中的完整检查环境准备后验证
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

1. **定义与注册**：按 [Skill 编写合同](.claude/skill-os/skill-authoring.md) 创建 `.claude/skills/office/<skill-name>/SKILL.md`，维护适用的输入模式、路由与注册源。
2. **宿主发现**：按入口可见性同步 Claude 命令入口和 Codex `.agents/skills/` 别名；隐藏/internal skill 不应自动变成一级入口。由源配置重建生成视图，并运行注册与上下文一致性检查。
3. **交接与状态**：遵循 skill 自身及 [office 合同](.claude/skills/office/SKILL.md)；standalone 不补 workflow-state；handoff 遵循具体 skill 合同，office 仅豁免轻量且无下游消费的终端交付，重型 standalone 仍须交接记录。只有已选择 workflow 且项目绑定已验证时，才按对应节点合同更新项目状态。框架维护保持 `NO_PIN`，不写共享 `docs/` 或 workflow-state 别名。
4. **CHANGELOG 更新**：在 `## [Unreleased]` 下记录新增能力及其原因。

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
- [ ] 输入、注册与生成视图检查通过；涉及项目 workflow 时按已验证绑定核验状态
- [ ] 无 API key 或敏感信息（pre-commit 会检测）
- [ ] CHANGELOG 已更新

## 问题反馈

- Bug 报告：使用 GitHub Issue 的 `bug_report` 模板
- 新 skill 请求：使用 `skill_request` 模板
- 安全漏洞：**不要**公开提 Issue，直接发邮件至 <wangzixuan0828@gmail.com>
