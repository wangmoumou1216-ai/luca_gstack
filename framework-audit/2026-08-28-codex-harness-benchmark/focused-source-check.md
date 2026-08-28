# OpenAI Codex 开源 harness 五类原生能力单点核验

状态：**RESEARCH_COMPLETE / OFFICIAL_SOURCES_ONLY**

- 研究题：截至 2026-08-28，OpenAI Codex 开源 harness 是否已原生提供 hooks、skills、subagents/custom agents、local memories、auto-review？
- 访问日期：2026-08-28
- 源码 pin：[`openai/codex@7d6f808b97e424da80271be8cc539e8c5437a229`](https://github.com/openai/codex/tree/7d6f808b97e424da80271be8cc539e8c5437a229)
- 证据口径：只用 OpenAI 官方文档与 `openai/codex` 官方仓库/源码；二手来源不作为断言依据。

## 结论先行

| 能力 | 裁定 | 稳定性/默认态 | 主要边界 |
|---|---|---|---|
| Hooks | **Yes** | `Stable`，default-on | 非托管 hook 需按定义 hash 授信；`prompt`/`agent` handler 尚只解析不执行。 |
| Skills | **Yes** | 官方正式扩展面 | 是 `SKILL.md` 指令/资源/可选脚本包，非硬状态机；初始 skill 列表有 context budget。 |
| Subagents / custom agents | **Yes** | `multi_agent` 为 `Stable`，default-on | 子 agent 继承 sandbox/权限；非交互流程中需新授权的操作会失败并回传父流程。 |
| Local memories | **Yes** | `Stable`，default-off | 是本地 recall layer，非必达规则库；后台生成可延迟或跳过。 |
| Auto-review | **Yes** | `guardian_approval` 基础 feature 为 `Stable`，default-on；默认 `ApprovalsReviewer` 仍是 `USER` | 模型 auto-review 需显式 opt-in，仅替换 sandbox-boundary 审批人，不扩权；never-approval 时无审批可审。 |

**总裁定：五类能力都已原生存在。** Hooks、multi-agent 和基础 Guardian approval feature 在 pin 中是 stable/default-on；memories 是 stable/default-off；skills 是官方文档化的正式扩展面。这不意味 auto-review 默认接管审批：默认 reviewer 仍为 `USER`，模型 reviewer 需显式选择。Auto-review 不是通用的任务结果质量复审，而是 sandbox 边界审批的 reviewer swap。[源：[Hooks](https://learn.chatgpt.com/codex/hooks)、[Build skills](https://learn.chatgpt.com/codex/build-skills)、[Subagents](https://learn.chatgpt.com/codex/agent-configuration/subagents)、[Memories](https://learn.chatgpt.com/codex/customization/memories)、[Auto-review](https://learn.chatgpt.com/codex/sandboxing/auto-review)，均访问于 2026-08-28；[feature registry](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/features/src/lib.rs#L1053-L1058)]

## 逐项发现

### 1. Hooks — Yes（Stable，default-on）

Codex 有原生 lifecycle hook engine，支持命令和 MCP tool handler。Pin 注册了 12 个事件：`PreToolUse`、`PermissionRequest`、`PostToolUse`、`PreCompact`、`PostCompact`、`SessionStart`、`SessionEnd`、`UserPromptSubmit`、`SubagentStart`、`SubagentStop`、`Stop`、`Interrupt`。[源：[Hooks 官方文档](https://learn.chatgpt.com/codex/hooks)，访问于 2026-08-28；[`codex-rs/hooks/src/lib.rs#L22-L53`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/hooks/src/lib.rs#L22-L53)]

Hook 可从用户或仓库的 `hooks.json` / `config.toml` 配置层发现，plugin 也可打包 hooks。Pin 将 `hooks` 标为 `Stage::Stable` 且 `default_enabled: true`。[源：[Hooks 发现面](https://learn.chatgpt.com/codex/hooks#where-codex-looks-for-hooks)，访问于 2026-08-28；[`features/src/lib.rs#L1113-L1118`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/features/src/lib.rs#L1113-L1118)]

**边界/失败语义：**

- 非托管 hook 在执行前必须按定义 hash 审阅/授信；新增或改动后会重新变为待审并被跳过。仓库 hooks 仅在项目配置层已受信时加载。[源：[Review and trust hooks](https://learn.chatgpt.com/codex/hooks#review-and-trust-hooks)，访问于 2026-08-28]
- 同一事件的多个 command hook 并发启动；一个 hook 不能阻止另一个已匹配 hook 开始。`prompt` 和 `agent` handler 当前“parsed but skipped”。[源：[Hooks](https://learn.chatgpt.com/codex/hooks)，访问于 2026-08-28]
- `PreToolUse` 可用 deny 决策或 exit code 2 在执行前阻断，也可用 allow + `updatedInput` 改写支持的输入。`PostToolUse` 的 block 不能撤销已发生的副作用，只能替换模型可见结果/反馈。[源：[PreToolUse / PostToolUse](https://learn.chatgpt.com/codex/hooks#pretooluse)，访问于 2026-08-28]

### 2. Skills — Yes

Codex 原生识别以 `SKILL.md` 为必需入口的 skill 目录，可携带可选 `scripts/`、`references/`、`assets/` 和 `agents/openai.yaml`。Codex 先加载 name/description/path，选中后再读全量 `SKILL.md`，支持显式 mention/选择器与基于 description 的隐式选择。[源：[Build skills](https://learn.chatgpt.com/codex/build-skills)，访问于 2026-08-28；[`skills/src/parser.rs#L22-L91`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/skills/src/parser.rs#L22-L91)]

本地发现面包含从工作目录向上到仓库根的 `.agents/skills`、用户 home 下的 `.agents/skills`、`/etc/codex/skills` 和系统内置 skills；官方明确支持 symlinked skill folders。[源：[Where Codex loads local skills](https://learn.chatgpt.com/codex/build-skills#where-codex-loads-local-skills)，访问于 2026-08-28]

**边界/失败语义：**

- 初始 skills 列表最多占 context window 的 2%（窗口不明时为 8,000 字符）；skill 过多时先截短 description，仍过多时可省略部分 skill 并告警。选中后的完整 `SKILL.md` 不受该列表预算限制。[源：[Build skills](https://learn.chatgpt.com/codex/build-skills)，访问于 2026-08-28]
- Skill 是“指令 + 资源 + 可选脚本”的可复用工作流作者格式；官方材料未将其定义为 runtime 硬状态机。[源：[Build skills](https://learn.chatgpt.com/codex/build-skills)，访问于 2026-08-28]
- Pin parser 对无 frontmatter、YAML 不合法、缺 description 或 name 过长显式报错；name 最长 64。[源：[`skills/src/parser.rs#L4-L91`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/skills/src/parser.rs#L4-L91)]

### 3. Subagents / custom agents — Yes（Stable，default-on）

当前 Codex 版本默认开启 subagent workflows，支持生成专用 agent 并聚合结果；CLI 可检查/切换运行中的 agent thread。Pin 的 `multi_agent` 为 `Stage::Stable` 且 `default_enabled: true`，工具 schema 原生定义 `spawn_agent`。[源：[Subagents](https://learn.chatgpt.com/codex/agent-configuration/subagents)，访问于 2026-08-28；[`features/src/lib.rs#L1189-L1194`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/features/src/lib.rs#L1189-L1194)；[`multi_agents_spec.rs#L14-L145`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/core/src/tools/handlers/multi_agents_spec.rs#L14-L145)]

Custom agents 可放在用户 Codex home 的 `agents/` 或项目 `.codex/agents/` 下，每个 TOML 定义一个 agent；必需 `name`、`description`、`developer_instructions`。配置 schema/loader 可解析 model、effort、sandbox、MCP、skills 等字段，但在本次 pin 的 spawn role 投影中，sandbox/approval 不属于允许的 role override，live 子 agent 仍保留父会话权限。[源：[Custom agents](https://learn.chatgpt.com/codex/agent-configuration/subagents#custom-agents)，访问于 2026-08-28；[`agent-roles/src/loader.rs`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/agent-roles/src/loader.rs)；[`agent_role_config.rs#L20-L88`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/agent-roles/src/agent_role_config.rs#L20-L88)；[`core/src/agent/role.rs#L36`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/core/src/agent/role.rs#L36)]

**边界/失败语义：**

- 子 agent 继承父会话 sandbox policy 与当前权限模式；生成时会重新应用父 turn 的 live runtime overrides，即使 custom-agent file 有不同默认值。[源：[Approvals and sandbox controls](https://learn.chatgpt.com/codex/agent-configuration/subagents#approvals-and-sandbox-controls)，访问于 2026-08-28]
- 非交互运行或无法弹出新授权时，需要新授权的动作失败，错误返回父 workflow。[源：[Approvals and sandbox controls](https://learn.chatgpt.com/codex/agent-configuration/subagents#approvals-and-sandbox-controls)，访问于 2026-08-28]
- 每个 subagent 独立消耗模型和工具 token。Pin loader 对坏的 agent role fail-soft：告警并忽略；缺 description 或 standalone file 缺/blank `developer_instructions` 为无效。[源：[Subagents](https://learn.chatgpt.com/codex/agent-configuration/subagents)，访问于 2026-08-28；[`loader.rs#L15-L98`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/agent-roles/src/loader.rs#L15-L98)]

### 4. Local memories — Yes（Stable，default-off）

本地 Codex clients 有独立本地 memory store 和控制面。启用后，Codex 可把符合条件的旧会话生成本地 memory files；主文件在 Codex home 的 `memories/` 下，包含 summaries、durable entries、recent inputs 和 supporting evidence。[源：[Memories](https://learn.chatgpt.com/codex/customization/memories)，访问于 2026-08-28]

Pin 中 `memories` 为 `Stage::Stable` 但 `default_enabled: false`，与官方文档“local Codex memories are off by default”一致。[源：[Configure local memories](https://learn.chatgpt.com/codex/customization/memories#configure-local-memories)，访问于 2026-08-28；[`features/src/lib.rs#L1053-L1058`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/features/src/lib.rs#L1053-L1058)]

Pin 实现异步 startup memory pipeline，并明确跳过 ephemeral sessions、feature disabled 和 non-root/subagent sessions；本地索引库不可用或 rate-limit 条件不满足时也跳过。[源：[`memories/write/src/start.rs#L20-L80`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/memories/write/src/start.rs#L20-L80)]

**边界/失败语义：**

- 官方定位是 helpful recall layer；必须每次生效的团队指导应放在 `AGENTS.md` 或版控文档，不应只放 memory。[源：[Memories](https://learn.chatgpt.com/codex/customization/memories)，访问于 2026-08-28]
- Memory 不保证会话结束立即更新；Codex 会等待会话闲置，且可因剩余 rate-limit 比例低于门槛跳过后台 pass。[源：[How local Codex memories work](https://learn.chatgpt.com/codex/customization/memories#how-local-codex-memories-work)，访问于 2026-08-28]
- Memory files 是生成态资料，官方不建议把手改文件作为主控制面；分享 Codex home 前应人工复核。清理实现拒绝操作 symlinked memory root。[源：[Local storage / review](https://learn.chatgpt.com/codex/customization/memories#local-memory-storage)，访问于 2026-08-28；[`control.rs#L3-L43`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/memories/write/src/control.rs#L3-L43)]

### 5. Auto-review — Yes（Stable core，但可用性受约束）

Codex Auto-review 用独立 reviewer agent 代替人对 sandbox-boundary 升级请求做审批。设为 `approvals_reviewer = "auto_review"` 后，审批请求转给 reviewer，它返回允许/拒绝与理由。[源：[Auto-review](https://learn.chatgpt.com/codex/sandboxing/auto-review)，访问于 2026-08-28]

Pin 的 `guardian_approval` 为 `Stage::Stable` 且 `default_enabled: true`。另一套 `guardianv2` 是 `UnderDevelopment/default-off`；不应用 Guardian V2 的实验态否定基础 Auto-review/Guardian approval。[源：[`features/src/lib.rs#L1465-L1493`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/features/src/lib.rs#L1465-L1493)]

这里的 default-on 仅指基础 capability gate；默认 `ApprovalsReviewer` 仍是 `USER`。只有显式配置 `approvals_reviewer = "auto_review"` 才会把适用的审批交给模型 reviewer。[源：[Auto-review](https://learn.chatgpt.com/codex/sandboxing/auto-review)，访问于 2026-08-28；[`protocol/src/config_types.rs#L183`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/protocol/src/config_types.rs#L183)；[`core/src/config/mod.rs#L3651`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/core/src/config/mod.rs#L3651)]

Auto-review 审查原本需人工的 shell/exec 升级、被 sandbox/policy 阻止的网络请求、越出 writable roots 的文件编辑、需审批的 MCP/app calls 与 Computer Use 新站点/域名访问；对 sandbox 内已允许的常规动作不触发。[源：[When it triggers](https://learn.chatgpt.com/codex/sandboxing/auto-review#when-it-triggers)，访问于 2026-08-28]

**边界/失败语义：**

- 仅在审批本来是交互式时生效，如 on-request 或仍会弹出相应类别的 granular policy；never-approval 时没有审批可审。[源：[Auto-review](https://learn.chatgpt.com/codex/sandboxing/auto-review)，访问于 2026-08-28]
- 它是 reviewer swap，不是 permission grant；不扩大 writable roots、不开网、不放宽 protected paths。[源：[How auto-review works](https://learn.chatgpt.com/codex/sandboxing/auto-review#how-auto-review-works)，访问于 2026-08-28]
- Desktop 仅在账户可用、组织策略允许时提供对应模式；模型选择不覆盖托管组织要求。Computer Use 的 app-level approvals 仍直接给用户。[源：[Auto-review](https://learn.chatgpt.com/codex/sandboxing/auto-review)，访问于 2026-08-28]
- 显式拒绝会要求主 agent 不得绕过，只能换实质更安全方案，否则停下询问。当前实现在同 turn 连续 3 次拒绝，或最近 50 次 review 窗口内达 10 次拒绝时触发 circuit breaker，以 interrupt 终止当前 turn。Timeout 与拒绝分开表达，timeout 本身不证明动作不安全。[源：[Denials and failure behavior](https://learn.chatgpt.com/codex/sandboxing/auto-review#denials-and-failure-behavior)，访问于 2026-08-28]

## 未证实 / 口径边界

1. **未把 Auto-review 解读为通用的“自动代码质量复审”。** 官方定义是 sandbox-boundary approval reviewer。Codex 另有 code review 工作流，不属于本题语义。[源：[Auto-review](https://learn.chatgpt.com/codex/sandboxing/auto-review)，访问于 2026-08-28]
2. **未证实 skills 把 `SKILL.md` 每一步作为 runtime-level 硬约束。** 官方证实的是指令/资源/可选脚本包，由模型选择后读取。[源：[Build skills](https://learn.chatgpt.com/codex/build-skills)，访问于 2026-08-28]
3. **未证实 local memories 能替代版控契约、强一致定时写回，或每个会话必然产生 memory。** 官方明言它是 recall layer，后台生成可延迟/跳过。[源：[Memories](https://learn.chatgpt.com/codex/customization/memories)，访问于 2026-08-28]
4. **未把 Guardian V2 的开发中状态外推为整个 Auto-review 实验性。** Pin 同时把基础 `guardian_approval` 标成 stable/default-on，把 `guardianv2` 标成 under-development/default-off。[源：[`features/src/lib.rs#L1465-L1493`](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/features/src/lib.rs#L1465-L1493)]
5. **本核验只判定开源 harness 原生面是否存在，不证实任意账户、模型、组织策略或产品表面必然暴露全部 UI/开关。** [源：[Subagents](https://learn.chatgpt.com/codex/agent-configuration/subagents)、[Memories](https://learn.chatgpt.com/codex/customization/memories)、[Auto-review](https://learn.chatgpt.com/codex/sandboxing/auto-review)，均访问于 2026-08-28]

## Search log

| 时间 | 动作 | 范围 | 结果 / 用途 |
|---|---|---|---|
| 2026-08-28 | 完整读取 `quick-research` 与 `web-access` skill，运行 CDP 依赖检查 | 本地 skill 契约 | Node/Chrome/proxy 通过；本任务未操作登录态。 |
| 2026-08-28 | 官方域限定查询 hooks / skills / subagents / memories / review | OpenAI 官方文档域 | 新文档路径的搜索命中不稳定，改从官方 Advanced Configuration / Customization 索引导航。 |
| 2026-08-28 | 访问官方 Advanced Configuration / Customization | OpenAI 官方文档 | 官方重定向到新域，导航获得 Hooks、Build skills、Subagents、Memories、Auto-review 五页。 |
| 2026-08-28 | 定向读取 Hooks | [Hooks](https://learn.chatgpt.com/codex/hooks) | 确认事件面、发现、trust、并发与阻断/续跑语义。 |
| 2026-08-28 | 定向读取 Skills | [Build skills](https://learn.chatgpt.com/codex/build-skills) | 确认 `SKILL.md`、`.agents/skills`、symlink、显式/隐式调用与列表截断。 |
| 2026-08-28 | 定向读取 Subagents | [Subagents](https://learn.chatgpt.com/codex/agent-configuration/subagents) | 确认当前默认开启、custom TOML、继承与非交互授权失败。 |
| 2026-08-28 | 定向读取 Memories | [Memories](https://learn.chatgpt.com/codex/customization/memories) | 确认 local store、default-off、recall-layer 定位与后台跳过条件。 |
| 2026-08-28 | 定向读取 Auto-review | [Auto-review](https://learn.chatgpt.com/codex/sandboxing/auto-review) | 确认 sandbox-boundary reviewer swap、触发与拒绝/timeout/circuit-breaker 语义。 |
| 2026-08-28 | 从 GitHub 官方仓库下载 pin tarball 并本地只读检索 | [`openai/codex@7d6f808...`](https://github.com/openai/codex/tree/7d6f808b97e424da80271be8cc539e8c5437a229) | 定位 feature registry、hook 事件、skill parser、agent-role loader/spawn schema、memory pipeline、Guardian 实现。 |
| 2026-08-28 | 排除 issues/discussions/第三方转述作为断言源 | GitHub/Open Web | 仅官方文档与 pinned `openai/codex` 源码进入证据链；二手来源零引用。 |

<!-- FILE_END: focused-source-check.md -->
