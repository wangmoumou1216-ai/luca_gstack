# 研究输入摘要：PreToolUse 工具调用级拦截——todo-capsule 触发的解冻请求

> **⚠️ 状态：已终止，不产出 PRD（2026-07-03）**
> 本 brainstorm 在 Phase 1（3 个提取 agent）完成后即暂停——Agent B（隐含假设）的 A4/A7/A8 三条发现直接质疑了本 brainstorm 的起手前提：todo-capsule 尚未上线、没有真实事件发生过，"硬性阻塞需求"与 BACKLOG #4/#18 当初被暂缓时拥有的证据是同一种形态（纸面担忧，非观测事件）；且 A8 指出跳过了 CLAUDE.md 的研究默认门，很可能漏掉关键先例。
>
> 补做的快查证实了 A8：**Anthropic 官方文档确认存在现成方案** `@anthropic-ai/sandbox-runtime`（npm 包，Claude Code CLI 与 Agent SDK 通用）——Linux 用 bubblewrap、macOS 用 sandbox-exec(Seatbelt) 做真正的 OS 级文件系统/网络隔离，官方复杂度评级 Low、开销 Very Low，且明确覆盖子进程继承同一边界。这直接、完整地满足 todo-capsule R19 的要求，且比本文档设想的"自建 PreToolUse hook 基础设施"简单得多。
>
> **本 brainstorm 不再继续，不产出独立 PRD。** 解决方案已写回 `todo-capsule` 项目的 `docs/prd/2026-07-03-todo-capsule-claude-tag-prd.md` R19。本文件保留作为过程记录（含 §3 对本仓库 hook 现状的真实代码核查，仍有参考价值），不代表最终技术方案。

---

**原用途**：作为 `brainstorm` skill 的 research input（cold-start 邻近型：无正式 deepresearch 报告，但有充分的、来自真实代码核查的证据，不是凭空开始）
**原收窄声明**：本需求**不做通用安全平台**，范围锁定为"刚好满足 todo-capsule @claude tag PRD 的 R19 所需的最小机制"，与本框架 measure-first 纪律一致（见下）

---

## 1. 触发事件（为什么现在提，不是投机建设）

`todo-capsule` 项目的 `@claude tag` PRD（`docs/prd/2026-07-03-todo-capsule-claude-tag-prd.md`，todo-capsule 项目内）里，Requirement R19 明确写着：

> "本条边界必须有可验证的进程级/文件系统级隔离实现（非仅 cwd 约定）...验证不通过则不允许上线——这是产品层面明确设定的风险门槛"

这是该 PRD 唯一悬而未决的 Resolve-Before-Planning blocking 项，经 4 轮 Oracle 对抗审查（含一轮专门尝试用 worktree 隔离 + headless CLAUDE.md 变体 + hook 层强制审批三项技术缓解，均被用真实代码核实证伪）确认：**当前框架不存在可验证的工具调用级强制拦截机制**。

## 2. 与既有 BACKLOG 的关系（关键：这不是新缺口，是已知缺口的解冻请求）

`framework-audit/BACKLOG.md` 已经记录了同类缺口，且明确处于"延后，带触发条件"状态：

### #4 — framework/ PreToolUse 硬阻断
- 真实缺口：`framework/` 只读目前只有 PostToolUse 警告（事后），无 PreToolUse deny（事前硬阻断）
- 为何延后：被防事件全历史 0 次命中；防的是从未发生的事
- **触发条件**：`post-edit 警告首次出现 framework/ 误写命中` → 再升级为 PreToolUse deny
- 落地点：新增 PreToolUse hook（原估~30 行）

### #18 — IN_PROGRESS 崩溃恢复路径无 writer（reader/writer 失配）
- 真实缺口：三个 reader 消费 `status: IN_PROGRESS`，但全仓无 writer；曾设想的修法是"在 orchestrator/入口一处写"，但**"无 PreToolUse/Task hook 强制单写点"**导致该修法不成立
- 为何延后：orchestrator 是 prompt 行为 prose 非进程，无法那样 hook；真实 4/4 项目均 standalone mode，非 workflow-mode
- **触发条件**：`真实 workflow-mode 运行中出现一次崩溃恢复需求` → 二选一：各 skill 加 entry/exit 写接通 reader，或删掉 orphan reader 分支

**关键判断**：#4/#18 的"未命中过、暂缓"逻辑，在 todo-capsule 场景下不成立——todo-capsule 的 @claude agent 是**系统性无人值守执行**（不是"理论上可能发生的误操作"），R19 要求的隔离是产品设计的必要条件，不是尚未发生的边缘风险。这是本 brainstorm 的 demand evidence：**不是预判，是已经写进另一份 PRD 的硬性阻塞需求**。

## 3. Round 4 Oracle 审查已确认的具体技术现状（真实代码核查，非假设）

以下是 todo-capsule brainstorm 过程中 Oracle round 4（聚焦审查）对本仓库的实测发现，直接决定本 brainstorm 的技术边界：

- **`.claude/settings.json` 全局 hooks 只注册 4 类事件**：SessionStart（session-restore.mjs）、UserPromptSubmit（route-guard.mjs）、PostToolUse（post-edit.mjs，仅计数+警告，从不 deny）、Stop（session-sync.mjs）。**零 PreToolUse 配置**。
- **仓库内唯一真实存在的 PreToolUse 实例**：`careful` skill 的 `check-careful.sh`，只匹配 5 种字面正则（`rm -rf`、`git reset --hard`、`git push --force`、`DROP TABLE`、`kubectl delete`），未覆盖 `git branch -D`、`git clean -fd`、写脚本再执行等间接手法。
- **`memory/episodic/index.jsonl` 是 git 追踪的明文文件**（`git ls-files` 确认），可被 Read/cat/grep 等任意方式直接读取，不经过任何"可拦截的脚本入口"——这意味着任何"只拦截特定命令名"的 hook 方案，对"直接读文件"这类绕过路径无效。
- **`route-guard.mjs` 在多处独立读取项目 symlink 状态**（`readCurrentProject` 直接 `readlinkSync`，不经过 `project.sh switch`），`projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd()` ——worktree 隔离方案是否真的隔离取决于这个环境变量在隔离上下文里是否被正确重新指向，未经验证。
- **git worktree 强制分支互斥**：同一分支不能在两个 worktree 同时 checkout（除非 `--force`，且后果是两个工作目录互不感知对方提交）。若为隔离新建分支，该 worktree 是"创建时刻的快照"，之后主 session 的提交/未提交改动对其不可见。
- **`memory/semantic/candidates.jsonl` / `reviews.jsonl` 是 gitignored**（未追踪），worktree checkout 不会带出这两个文件——若隔离方案基于 worktree，semantic memory 检索会得到不完整视图。
- **Agent SDK（todo-capsule 实际运行时）的 hook 挂接方式（`options.hooks` 编程式回调）与这里 Claude Code CLI 的 settings.json 文件式 hook 是两套不同机制**——Claude Code CLI 内部的验证经验不能直接套用到 Agent SDK 运行时。

## 4. 本 brainstorm 的收窄边界（与 R19 精确对齐，不做通用平台）

todo-capsule R19 实际需要的最小机制，只是：

1. 让一个**无人值守的 Claude Agent SDK 子进程**，被限定在**单一目标项目目录**内工作，且这个限定是**可验证的**（不是靠 agent 自觉遵守 cwd 约定）
2. 覆盖该子进程自身发起的文件操作 **以及** 它执行的命令（R11 允许列表内的诊断命令）所产生的子进程

**明确不做**（避免 scope creep 回到"通用安全平台"）：
- 不解决 #4（framework/ 保护）——那是另一个不同的资产边界，todo-capsule 不需要
- 不解决 #18（workflow-mode 崩溃恢复）——那是编排状态一致性问题，与 agent 执行沙箱是两个维度
- 不构建面向 Claude Code CLI 交互式 session 的通用 PreToolUse hook 框架——只需要覆盖 Agent SDK 子进程这一种运行时

<!-- FILE_END: 2026-07-03-pretooluse-gate-research-digest.md -->
