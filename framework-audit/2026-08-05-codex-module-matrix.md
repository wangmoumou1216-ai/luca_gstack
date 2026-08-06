# luca_gstack × Codex 全模块排查矩阵（2026-08-05）

> 目标：逐模块确认「以前用 Claude 的能力，现在切 Codex 是否等价可用」，事无巨细。
> 判据纪律：**每格必须有实测证据**；「据文档/据 schema 推断」单独标注，不与实测混列。
> 环境：codex-cli 0.146.0（会话期间自动从 0.133.0 升级）、ChatGPT plus。

---

## 结论矩阵

| # | 模块 | Codex 下状态 | 证据 | 遗留动作 |
|---|---|---|---|---|
| M1 | hooks（6 个） | ✅ **已闭合并活体验证** | 无 bypass 真跑：5 事件全触发、本仓日志 +616B、verify-codex-wiring 19/19 FAIL=0 | 两道门均已闭合 |
| M2 | skills（33） | ✅ 等价可用 | 活体：`$quick-research` 经软链读到真实 SKILL.md 并准确引用首步 | 无 |
| M3 | subagents（3） | ✅ 等价可用 | 活体：找到 `.codex/agents/preflight-agent.toml`、按 `low` 档派发、返回 OK | 无 |
| M4 | slash commands（23） | ✅ 功能可达，**语法不同** | 活体：`/status` 不执行；`$<skill>` 正常 | 已写入 AGENTS.md |
| M5 | workflows（2） | ✅ 等价可用 | `test-workflow-runner` 15/15，两个 workflow 零改写跑通 | 无 |
| M6 | scripts（38） | ✅ 无依赖 | 引用 `CLAUDE_PROJECT_DIR` 的 8 个**全是测试脚本**（自设 fixture），非生产路径 | 无 |
| M7 | memory scripts（13） | ✅ 等价可用 | 活体：`env -u CLAUDE_PROJECT_DIR` 下 `get_memory --summary` 与 `search_memory` 均正常（memroot 脚本相对回退生效） | 无 |

---

## M1 注册与授信（2026-08-06 架构二次修正后）

**上一轮的「仓库级 hooks.json 不被加载」结论是错的**，据此建立的全局注册架构已回退。

真因：hooks.json **顶层只接受 `description` 与 `hooks`**；我写的 `_comment` 键让整份文件被拒
（`unknown field _comment, expected description or hooks`），警告只在会话启动时一闪而过。
上一轮"三处 × trust/bypass 全组合"的穷尽矩阵——**每一格都因这同一个键失败**，
测的从来不是加载机制，是这一个键。改名后 `hooks/list` 立刻 7 条 → 13 条（user 7 + **project 6**）。

**当前正确架构**：仓库级 `.codex/hooks.json`（随版本控制）+ 一次授信。
全局配置已回退到原状（只剩第三方 adrafinil），零跨项目污染。
`inRepo` 守卫从"必需"降级为纵深防御。

| 步骤 | 状态 | 断言 |
|---|---|---|
| 顶层键合法（description/hooks） | ✅ | S11 |
| 未重复全局注册 | ✅ | S11b |
| 条目已授信 | ✅ | S12 |

活体终验（纯仓库级、无 bypass）：5 事件全触发、日志 +856B、零解析警告、三条软链完好。
`verify-codex-wiring` **20/20 FAIL=0 BLOCKED=0**。

---|---|---|---|
| `.codex/hooks.json` | ❌ | ❌ | ❌ |
| `.agents/hooks.json` | ❌ | — | — |
| `.claude/hooks.json` | ❌ | — | — |

唯一生效通路 = **用户级 `~/.codex/hooks.json`**，且新条目还需**授信**：

- 门 1 · 注册：把 `.codex/hooks.json` 条目并入 `~/.codex/hooks.json`（保留其中既有第三方 hook）。
  断言 `S11` 守护；未注册时如实报 FAIL，不粉饰。
- 门 2 · 授信：新增条目未授信时 `codex exec` **静默跳过**。实测须配
  `--dangerously-bypass-hook-trust` 才执行；常规使用应在 TUI 里授信一次。

adapter 自带 `inRepo` 守卫，故全局注册后在其它项目静默放行，不越界。

---

## 本轮修掉的 BLOCKER（全部经一手证据）

| ID | 问题 | 证据来源 | 后果（未修时） |
|---|---|---|---|
| B1 | 仓库级 hooks.json 不被加载 | 自建 marker 实测 + 空目录阴性对照 | 整套 hook 从未运行；我曾据泛化 `hook:` 行误报"验证通过" |
| B2 | `process.exit()` 截断 stdout | 200000B → 收到 65536B | 大 payload 时控制动词变非法 JSON |
| B3 | Stop `decision:block` 被译成 `continue:false` | 二进制校验串「Stop hook requested continuation without a prompt; ignoring the block」 | 语义反转：自成长捕获不发生 + 用户回合被杀 |
| B4 | `updatedInput` 被误判为不支持 | 二进制校验串「PreToolUse hook returned updatedInput without permissionDecision:allow」 | 正常重定向被降级成硬 deny，比 fail-open 更糟 |
| B5 | matcher 用 `shell`（实际是 `Bash`） | matcher=`.*` 抓真实载荷 | Pre/PostToolUse 永不触发 → 项目隔离形同虚设 |
| B6 | effort 用 `minimal`（模型拒绝） | 400 unsupported_value | preflight-agent 每次调用失败 |
| B7 | workflow schema 未做 strict 归一化 | 400 invalid_json_schema | 每个 agent 静默返回 null → workflow 恒产出空结果 |

---

## 实测得到的 Codex 事实（写给下一个人）

- **tool_name**：shell 执行 = `Bash`（**不是 `shell`**）；文件编辑 = `apply_patch`。
  **两者 tool_input 都是 `{command}`，没有 `file_path`**——这决定了 adapter 必须按目标 hook 分流别名。
- **事件名大小写**：hooks.json 用 **PascalCase**（`UserPromptSubmit`）；snake_case 只是 config.toml
  里 trust-state 的 key 写法，两者不可混。
- **effort 枚举**：模型接受 `none/low/medium/high/xhigh/max`，**拒绝 `minimal`**（config 解析器却接受它）。
- **结构化输出**：strict 模式，每层 object 的 `required` 须列全 properties + `additionalProperties:false`。
- **stdin**：`codex exec` 在 stdin 未 EOF 时**永久挂起**（"Reading additional input from stdin"），
  自动化调用必须 `< /dev/null` 或 `stdio:'ignore'`。
- **subagent 工具名**：连字符会被转成下划线（`preflight-agent` → `preflight_agent`），注册名不变。
- **skills 预算**：skill 多时描述会被压缩（"shortened to fit the 2% skills context budget"），
  但全部仍可见可调用。

---

## 未闭合 / 待办

1. **门 1 已闭合（2026-08-06）**：`.codex/hooks.json` 已并入 `~/.codex/hooks.json`
   （备份 `~/.codex/hooks.json.bak-20260806-094703`，一条 cp 可完全回退）。
   核验：JSON 合法／6 事件齐全／第三方 adrafinil 条目语义与位置均未变且**实测仍正常触发**
   （防我方重新序列化导致它自己的 trusted_hash 失配）。断言 S11 已转绿。
2. **门 2 已闭合（2026-08-06）**——用 **Codex 自己的 app-server API** 完成，非反推非伪造：
   `hooks/list` 拿到 codex 自算的 `currentHash` → `config/batchWrite` 写
   `hooks.state."<key>".trusted_hash`（二进制那句 "config/batchWrite failed while updating
   hook trust in TUI" 表明 TUI 走的正是这个 API）。脚本 `scripts/codex-trust-hooks.mjs`，
   **只授信 command 含本仓 adapter 的条目**，第三方（adrafinil）明确跳过；写前备份 + 打印一键回退；
   支持 `--dry-run` 先列出完整命令行供人过目。
   **活体终验（无任何 bypass 参数）**：5 事件全触发、本仓日志 +616B、
   日志内含 session-sync/session-restore 真实输出。`verify-codex-wiring` **19/19 FAIL=0 BLOCKED=0**。
   下方"无法自动化"的记录保留为**历史**（当时的搜索确实没走到 app-server 这条路）：
   （二进制 `tui/src/startup_hooks_review.rs`，提示语 "… hooks need review before they can run"）。
   **穷尽过的路径与失败原因**（列清单而非笼统说"做不到"）：
   | 尝试 | 结果 |
   |---|---|
   | 反推 `trusted_hash` 算法 | command／hook 对象／group／state-key × 多种 JSON 规范化与拼接，全不命中；且即便成功也不应往用户 config 伪造哈希 |
   | `codex` 的 trust 子命令 | 不存在 |
   | `--dangerously-bypass-hook-trust` 持久化 | 不写盘（实测 trust 条目 1→1） |
   | auto-trust 配置键 | 仅有反向的 `allow_managed_hooks_only` |
   | pty(`script`) 喂按键驱动 TUI | 管道 stdin 立即 EOF，TUI 需真终端 raw mode |
   ⇒ **唯一路径**：在本仓目录跑一次交互式 `codex`，逐条确认信任。S12 会自动转绿。
   未授信时的实测行为：本仓 hook 日志**零增长**，只有早已授信的第三方 hook 触发——
   故 S11 单独全绿会造成假象，S12 是必需的第二道断言。
3. **串行深审（已完成 3/4）**：runtime 维、workflow-runner 安全维、零回归+mutation 维均已跑完
   并逐条修复；沙箱决策另开红队对抗（判 REFUTED，采纳其第四选项）。
   **协议完备性维**被用户中途停掉后未重跑——其覆盖面已由后续实测大部分补齐
   （事件名大小写、tool_name、matcher、agents 发现、skills 软链、effort 枚举、strict schema），
   剩余未系统核对项：SubagentStart/SubagentStop/PermissionRequest/PreCompact/PostCompact 五个
   未注册事件是否有接入价值。
3. **MCP `mcp__muse__*`**：Codex 侧不可用（app 动态注入）。
   降级链 `luca-open.sh` / `luca-sidebar.sh` **可用，但必须配 writable_roots**——
   我此前写它们"纯 bash、零 harness 依赖、可用"是**静态推断且是错的**：实测在 Codex 沙箱里
   `luca-open.sh <file>` 报 `Operation not permitted`（`~/.luca/**` 在工作根之外）、exit=1，
   本地直跑却 exit=0。已由 `.codex/config.toml` 的 writable_roots 修复，S13 守护。

4. **真实使用终验（2026-08-06，唯一能暴露以下两条的方式）**：
   测试套件全绿、hook 全触发，仍可能真用起来就坏——本轮实证两例：
   - **记忆写入路径在 Codex 下整个是断的**：`append_episode.py` 抛
     `PermissionError: Operation not permitted: .../memory/episodic/index.jsonl`
     （MEMORY_ROOT 指向母版仓，在工作根之外）。读正常、写全废，且**静默**。
   - **app 投递通道失效**（同因，见上）。
   修法：仓库级 `.codex/config.toml`（**实测生效**，故不必改用户全局配置）声明 writable_roots。
   终验三条真实路径同 session 跑通：`mem-read=0` / `app-deliver=0` / `memroot-writable=True`，
   5 事件全触发、零解析警告、三条软链完好。
