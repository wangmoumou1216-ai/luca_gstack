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
`d81f3a183412e71a5b1e84ca21bc1a35eea03a60`；本地增加了 Luca 路由、项目隔离与验收约束。

## 执行流程

### 1. 确定下个 session 的任务

如果用户传了参数，把参数视为“下个 session 将聚焦什么”，据此裁剪内容。没有参数时，从当前
对话中提炼尚未完成的目标；目标仍未知时写 UNKNOWN；若缺失会妨碍可靠续接才问一个阻塞问题，绝不编造下一任务。
参数只收窄续接重点；除非用户明确取消或替换，原目标、完成定义及未完成责任仍需保留。

### 2. 收集最小充分上下文

只保留下个 agent 真正需要的信息：

1. 原目标与完成定义，以及与其区分的下个 session focus。
2. 实际已完成的工作与效果、对应证据及当场可验证的状态；未完成或仅已确认接收的工作不写成完成。
3. 最新真实用户授权、更正及来源，关键决策、约束和明确不做的事；被更正的旧决策不再视为授权。
4. 剩余责任与依赖、首个建议动作、原始失败/取消与剩余在途；保留实际任务/Agent/进程句柄及已知终态或未知状态、原证据和已知阻塞与风险。
5. 已存在的权威制品：spec、plan、ADR、issue、commit、diff、报告等。
6. 当前批准的 scope/U-ID、owner、权限、未决真人门及未批效果、实际仓库/分支/HEAD、dirty 文件与保护边界；
   哪些内容实际读/验证过，哪些只是引用或未知；引用不等于已读或已验证。
7. 可执行的恢复读列表/命令与首个未完成点；先核当前 HEAD、preimage、真实授权/更正、句柄、效果与证据，再续未完成点。timeout、idle、ACK不表示完成或取消、不授权重派；失去可观察性如实报告。失败/未知/在途阻断对应依赖，不重复已完成效果。

已有权威制品用路径、commit 或 URL 定位；只摘录续接必需的事实与验证结论，不复制长段正文。
引用本地路径时使用绝对路径，方便新 session 直接定位；不要为了交接而额外改写那些制品。

### 3. 脱敏

写入前检查并替换敏感信息，包括 API key、access token、cookie、密码、私钥、授权 header、
个人身份信息和不必要的本机隐私。统一替换为 `<REDACTED>`。保留“需要什么凭据/从哪里重新取得”
的说明，但绝不保留凭据值。

### 4. 选择 suggested skills

文档必须包含 `## Suggested skills`。只列当前环境中真实存在、且与下一步直接相关的 skill 名：

- Claude 写 `/skill-name`；Codex 使用 `$` 前缀的 `skill-name`。
- 可先检查 `.claude/skills/office/`、`.agents/skills/` 或当前 skill catalog。
- 不确定是否存在就不列，禁止编造名字。
- 每个 skill 用一句话说明“为什么下一步需要它”，附可核验的 SKILL.md authority 路径。
- 建议是描述性索引，不表示已经调用、授予执行权或自动转发；没有合适 skill 时写 `None`。

### 5. 写入 OS 临时目录

用 Node 获取真实临时目录，不猜 `/tmp`：

```bash
node -p 'require("os").tmpdir()'
```

在该目录内生成唯一文件名 `luca-handoff-YYYYMMDD-HHMMSS.md`（同秒冲突时追加短随机后缀），
冻结真实规范化绝对路径并确认与 workspace 不相交后，再用 `Write` 写入。不得覆盖现有文件。结构至少包含：

```markdown
# Session handoff
## Next-session focus
## Current state
## Decisions and constraints
## Authoritative artifacts
## Remaining work and first action
## Suggested skills
## Verification, blockers, and risks
## Authority and resume instructions
```

将原目标与完成定义保留在 `Current state`，将续接重点放在 `Next-session focus`；不因聚焦下一步而丢掉剩余责任。

### 6. 验证后交付

完成前必须当场验证：

1. 文件存在，且其规范化绝对路径位于 `os.tmpdir()` 下。
2. 上述标题全部存在，原目标与续接重点区分，恢复命令与已知/未知、原始失败、剩余依赖及最新权限边界一致。
3. 权威制品以路径/URL 引用，没有重复粘贴大段内容。
4. 没有明显 secret、token、password、cookie、私钥或未脱敏 PII。
5. `Suggested skills` 中的每个名字都能在当前环境找到。
6. `git status --short` 没有因为本次 handoff 新增 workspace 文件。

读回实际字节后给出绝对文件链接、下个 session focus 和真实限制；不得声称恢复已运行。
交付后不自动创建/打开新 chat，不向其他 chat 发消息，不把路径引用当作对未读制品的验证。
本 skill 自身是轻量终端交付，完成后不再生成第二份 framework handoff。

<!-- FILE_END: handoff/SKILL.md -->
