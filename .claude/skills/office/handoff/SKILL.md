---
name: handoff
preamble-tier: 1
version: 1.0.0
description: |
  会话级交接工具：把当前对话压缩成一份可供下一个 agent 或 session 直接接手的 Markdown，
  保存到操作系统临时目录。仅在用户显式要求会话交接时使用，不替代项目级流程交接。(luca_gstack)
argument-hint: "What will the next session be used for?"
# Luca 用窄语义路由承接明确的会话转移表达；允许模型在命中该显式意图后调用。
disable-model-invocation: false
allowed-tools:
  - Read
  - Write
  - Bash
context-cost:
  self: 1600
  runtime-estimate: 5000
  shared-refs: [none]
  recommended-model: guided-execution
---

## Preamble (run first)

```bash
git branch --show-current 2>/dev/null || true
python3 .claude/observability/scripts/get_rules.py handoff "*" 2>/dev/null || true
```

不要读取当前项目话题，也不要要求项目 pin。本 skill 是项目无关的会话转移工具，必须能在
框架/meta session 和未激活项目的 session 中工作。

## 定位与边界

**Defining constraint：显式会话转移 → OS 临时 Markdown。**

- 只在用户显式调用 Claude `/handoff`、Codex 的 `$` 前缀 `handoff`、裸首 token `handoff`，或明确说“会话交接 / 生成交接文档 / 交给下一个 agent/session”时执行。
- 输出必须位于操作系统临时目录，绝不写入当前 workspace。
- 不创建或修改项目级流程交接目录、项目工作流记录、当前话题、checkpoint 或任何项目 pin。
- 项目级 workflow handoff 是 luca workflow 的节点交接面；本 skill 是跨 session 的一次性上下文包，两者不可互相替代。
- 不把对话逐字转录成文档；目标是让新 agent 用最少上下文可靠续接。

来源：`mattpocock/skills` 的 `skills/productivity/handoff`（MIT），安装锚
`6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`；本地增加了 Luca 路由、项目隔离与验收约束。

## 执行流程

### 1. 确定下个 session 的任务

如果用户传了参数，把参数视为“下个 session 将聚焦什么”，据此裁剪内容。没有参数时，从当前
对话中提炼尚未完成的目标；只有当目标无法从上下文判断时，才问一个阻塞问题。

### 2. 收集最小充分上下文

只保留下个 agent 真正需要的信息：

1. 当前目标与完成定义。
2. 已完成到哪里，以及当场可验证的状态。
3. 已作出的关键决策、约束和明确不做的事。
4. 剩余步骤、首个建议动作、已知阻塞与风险。
5. 已存在的权威制品：spec、plan、ADR、issue、commit、diff、报告等。

已有内容一律引用路径、commit 或 URL，不复制长段正文。引用本地路径时使用绝对路径，方便新
session 直接定位；不要为了交接而额外改写那些制品。

### 3. 脱敏

写入前检查并替换敏感信息，包括 API key、access token、cookie、密码、私钥、授权 header、
个人身份信息和不必要的本机隐私。统一替换为 `<REDACTED>`。保留“需要什么凭据/从哪里重新取得”
的说明，但绝不保留凭据值。

### 4. 选择 suggested skills

文档必须包含 `## Suggested skills`。只列当前环境中真实存在、且与下一步直接相关的 skill 名：

- Claude 写 `/skill-name`；Codex 使用 `$` 前缀的 `skill-name`。
- 可先检查 `.claude/skills/office/`、`.agents/skills/` 或当前 skill catalog。
- 不确定是否存在就不列，禁止编造名字。
- 每个 skill 用一句话说明“为什么下一步需要它”；没有合适 skill 时写 `None`。

### 5. 写入 OS 临时目录

用 Node 获取真实临时目录，不猜 `/tmp`：

```bash
node -p 'require("os").tmpdir()'
```

在该目录内生成唯一文件名 `luca-handoff-YYYYMMDD-HHMMSS.md`（同秒冲突时追加短随机后缀），
再用 `Write` 写入。结构至少包含：

```markdown
# Session handoff
## Next-session focus
## Current state
## Decisions and constraints
## Authoritative artifacts
## Remaining work and first action
## Suggested skills
## Verification, blockers, and risks
```

### 6. 验证后交付

完成前必须当场验证：

1. 文件存在，且其规范化绝对路径位于 `os.tmpdir()` 下。
2. 上述七个标题全部存在。
3. 权威制品以路径/URL 引用，没有重复粘贴大段内容。
4. 没有明显 secret、token、password、cookie、私钥或未脱敏 PII。
5. `Suggested skills` 中的每个名字都能在当前环境找到。
6. `git status --short` 没有因为本次 handoff 新增 workspace 文件。

最后只需告诉用户：交接文档已生成、绝对路径、为下个 session 聚焦的任务，以及必要时的脱敏提醒。
本 skill 自身是轻量终端交付，完成后不再生成第二份 framework handoff。

<!-- FILE_END: handoff/SKILL.md -->
