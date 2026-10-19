# U-REGISTER — 未核验（[U]）声称登记册

> 全生命周期审计 Round 1（2026-07-27）产出。这些声称的决定性核验都需要**真 Codex 安装 / 真云端 /
> 第二台机器**，本仓无法定论。**五条规则**（见计划 Part II Phase 5）：① [U] 永不计入已验证，计数
> 永远报 `verified/total (+k 不可验)`；② [U] 不阻塞干轮；③ **产物如何呈现 [U] 在范围内且阻塞**
> ——凡以既成事实出现即 CONFIRMED 假声称（已在 Round1 修：AGENTS.md model dispatch、open-design
> Codex-断 已加 hedge）；④ 绿灯依赖 [U] 事实的门须标 u_dependent；⑤ 每条带重开触发器。

**共 13 条**。每条真 Codex spike 时按 settling_experiment 逐一定论。

> **状态以文末「2026-10-19 复核结案」为准。** 上面的表格与五条规则保留为 2026-07-27 的历史记录，不改写。
> 复核结果：**5/13 已由运行记录定论**（U-02 U-03 U-04 U-10 U-12），**2 条部分定论**（U-09 U-11），**6 条仍不可验**（U-01 U-05 U-06 U-07 U-08 U-13）。

| uid | 声称（[U] 内核） | 缺什么能力 | 定论实验 | 产物中当前呈现 | 重开触发器 |
|-----|------|-----------|----------|--------------|-----------|
| U-01 | [keystone] Codex fan-out（max_concurrent_threads_per_session~6、GA 默认开、TOML/AGENTS.md delegation） | 真 Codex 装机跑并发子线程 | 在真 Codex 上跑 deepresearch/auto，观察是否真并行 spawn ≥2 子 agent；`codex --version` + 并发 delegation 配置探测 | HEDGED | Codex fan-out GA 发布/文档更新 |
| U-02 | Codex 对 Bash 触发 PreToolUse + 能 deny | 真 Codex hook 事件模型 | Codex 上挂 PreToolUse(Bash) hook，跑 careful 的 check-careful.sh，看 deny 是否生效（退出码/拦截字符串） | HEDGED | Codex 暴露 Bash-PreToolUse deny |
| U-03 | Codex 无 SessionEnd（事件） | 真 Codex 生命周期事件清单 | Codex 上注册 SessionEnd hook，结束会话看是否触发 | HEDGED | Codex 加 SessionEnd |
| U-04 | Codex updatedInput 不能变异（无 input mutation） | 真 Codex PreToolUse 返回契约 | Codex PreToolUse 返回 updatedInput，验证工具入参是否被改写 | HEDGED | Codex 加 input mutation |
| U-05 | Codex 可挂 MCP + figma server 名一致（挂同一 figma MCP 即恢复） | 真 Codex MCP 挂载 + server 命名 | Codex 上挂 figma MCP，调 mcp__plugin_figma_figma__whoami 看工具名/命名空间是否一致 | HEDGED（即恢复=条件性） | Codex MCP 命名空间文档 |
| U-06 | Codex harness 提供可探测的 env 名（harness.mjs 据以判 codex） | 真 Codex 运行时环境变量 | Codex 会话内 `env \| grep -i codex`，确认存在稳定判别变量 | HEDGED（明标须核验） | Codex env 契约公布 |
| U-07 | Codex Web 工具名（WebSearch/WebFetch 等价） | 真 Codex web 工具命名 | Codex 上跑 html-prototype Phase2.1 / muse-x-digest FxTwitter，看 web 工具是否可调 | HEDGED | Codex web 工具文档 |
| U-08 | Codex hook 成熟度 / Workflow 等价（auto 恢复触发器） | 真 Codex 编排/Workflow 原语 | Codex 上尝试等价 Workflow + 子 dispatch，观察是否成熟 | HEDGED（恢复触发器=IF 框架） | Codex Workflow GA |
| U-09 | Codex 读哪棵 skill 树（.claude vs .agents） | 真 Codex skill 加载根 | Codex 会话内触发 magicpath，看它读 .agents/skills/magicpath(576行) 还是 .claude/skills/office/magicpath(49行) | HEDGED（P4 首查点名） | P4 Codex spike 首查 .agents 分叉 |
| U-10 | Codex 对 apply_patch 不触发 PreToolUse，只 Bash（native-edit 臂真 T3） | 真 Codex apply_patch 事件行为（有外部证据未 spike） | Codex 上 native-edit 一个文件，看 PreToolUse 是否触发；对照追踪三 issue 状态 | HEDGED（§2b′ 块内，明标'未 spike 前不当既成事实'） | 追踪 openai/codex #16732/#17794/#20204 |
| U-11 | Codex 侧无法传 per-agent model 参数 / Codex 上 frontmatter inert（故 model-tier 分档不可移植 LOCKS） | 真 Codex 是否暴露 per-agent model dispatch 参数 / 是否消费 SKILL.md frontmatter | Codex 上 spawn 子 agent 尝试传 model 参数；确认 recommended-model frontmatter 是否被读取 | HEDGED（H6-001 已由 db1128e 修复：§4.8.2+§11 加"尚未核验/pending spike"，并由 check-agents-parity ⑤ 门守护）| Codex 暴露 per-agent model 参数 / frontmatter 消费 |
| U-12 | Codex 真消费 AGENTS.md（AGENTS.md↔CLAUDE.md 平价被 Codex 读取，意图路由据此 PORTS） | 真 Codex 是否读 AGENTS.md 作操作手册 | Codex 会话给一个路由歧义 prompt，看它是否按 AGENTS.md §4.8 意图路由/model 意图选档 | HEDGED（§0.5c-2 明列为 P4 待核验项） | P4 Codex spike 验 AGENTS.md 消费 |
| U-13 | careful 的 deny hook 在 Codex 上不可自动注册（Codex 无 SKILL.md-frontmatter hook 加载器） | 真 Codex 是否有等价 skill-frontmatter hook 注册器 | Codex 上放置 careful/SKILL.md（frontmatter 内含 hooks 块），验证 check-careful.sh 是否被自动挂载 | HEDGED（同句含'若 Codex 提供等价 skill-hook 注册则可恢复'） | Codex 提供 skill-hook 注册 |

## 承重 caveat
所有 Codex 侧结论在真 Codex spike 前均为**假设**。仓内已有反证：`.agents/skills/magicpath/SKILL.md`
（576 行）与 `.claude/skills/office/magicpath/SKILL.md`（49 行）是两份 git-tracked、内容分叉的副本
——「Codex 读同一棵树」未必成立。真 Codex spike 的**第一项检查**须厘清 `.agents/skills/` 分叉。

> **2026-10-19 更正：上面「分叉、反证」的定性不成立。** 两份 magicpath 是受门控的**有意投影**（external-delegation），不是漂移；
> 现行行数为 587 与 72，不是 576 与 49。「Codex 触发时读哪份」仍无运行记录。详见文末 U-09。

## harness 门加固覆盖面（审计 Round5 登记）
CC 专有强制动词的 harness 降级门只加固了 **2/3** 个 emitter：`session-sync`（decision:block）与
`project-scope-guard`（deny/updatedInput）——两个 .mjs 已按 `detectHarness` 降级为纯文本 advisory。
**第 3 个 emitter `.claude/skills/office/careful/bin/check-careful.sh`**（经 careful SKILL.md
frontmatter 注册为 PreToolUse hook、吐 `permissionDecision:"ask"` CC-JSON）**未做 harness 降级**。
是否构成真实故障取决于 [U-02]（Codex 是否 Bash-PreToolUse deny）+ [U-13]（careful hook 在 Codex
上能否自动注册）——二者未核验，故此项 UNVERIFIABLE_U。若 U-13 证实不能注册则不触发、无输出（间接安全）；
若能注册则 check-careful.sh 需读 `CODEX_*` env 做同款纯文本降级。真 Codex spike 时按 U-13 先验证。

## 计数纪律
本审计的最终计数永远写成 `verified/total (+k 不可验)` 形式，绝不把这 13 条 [U] 折进 verified 或 total 的任一数。

## 2026-10-19 复核结案

**判定规则。** 只有「运行记录」才能把一条从 [U] 移出：真实启动 codex 二进制跑出的原始产物、会真起 codex 的测试及其断言、
框架或测试的实际运行输出、提交说明里写明的真机实测。代码里写了某个字段、文档或注释的断言、官方文档，都只算旁证，不够结案。
状态取值：**CONFIRMED**（声称为真）、**REFUTED**（声称为假）、**STALE**（无运行证据，需要真机 spike 重验，复核日 2026-10-19）。

**证据来源与强度（请先读）。**
- 决定性证据主要来自 `scripts/test-codex-native-lifecycle.mjs` 用**真实 codex 0.163.0**（离线 stub 模型）跑出的原始产物，
  来自**两次不同的运行**：`/private/tmp/luca-native-lifecycle.H5uIrY/` 是 2026-10-19 13:57（本机时间）的一次，有 `result.json`，
  `pass: true`；`/private/tmp/luca-native-lifecycle.IQv4vy/` 是同一天更早（rollout 时间戳约 09:57）的另一次，没有 `result.json`，
  只有 `critical-recovery-result.json`。下面每条都写明引用的是哪一次。**该脚本自身没有逐事件断言**：它把每个 hook 的载荷与输出写入
  `hook-payloads.jsonl`，只断言「11 个注册项全部触发」（第 650 行）与若干 deny 围栏（第 587–599 行）。所以下面的证据是**原始记录**，不是脚本断言。
- `/tmp` 目录随时可能被清理（`framework-audit/2026-10-01-hook-lifecycle/REVIEW.md:20` 引用的 `…TXhr2e` 目录已经不存在），
  因此决定性字段**在下面逐条摘录**，不依赖 `/tmp` 还在。
- 标 **〔已复核〕** 的是本次我亲自打开原始记录核对过的；标 **〔取证报告〕** 的是只读取证 agent 报告的、我没有逐条复核。

| uid | 状态 | 证据 |
|---|---|---|
| U-01 | **STALE** | 无「≥2 个子 agent 同时运行」的记录。仅有文档旁证：`framework-audit/u004-native-capability-facts.json` 的 F02 自述「CLI 委派未测，4 槽不外推」。〔取证报告〕 |
| U-02 | **CONFIRMED**（Bash 会触发 PreToolUse，且 deny 被执行） | `…IQv4vy/hook-payloads.jsonl` 第 19 行：`hook_event_name=PreToolUse`、`tool_name=Bash`，hook 输出 `permissionDecision:"deny"`、原因 `model-route recovery refused: UNSAFE_SESSION_ID`；同目录 `responses-requests.jsonl` 里 Codex 回给模型的工具输出是 `Command blocked by PreToolUse hook: model-route recovery refused: UNSAFE_SESSION_ID`。〔已复核〕**范围限定：** 这只证明 Bash 的 PreToolUse deny 可用；`careful/bin/check-careful.sh` 本身从未在 Codex 上运行过，仍取决于 U-13。 |
| U-03 | **REFUTED**（Codex 有 SessionEnd） | `…H5uIrY/hook-payloads.jsonl` 第 21、22、43、44 行：`hook_event_name=SessionEnd`，`reason=other`，两个 SessionEnd 注册项（entry 9、10）都被执行；测试第 650 行断言 11 个注册项全部触发。〔已复核〕 |
| U-04 | **REFUTED**（updatedInput 能改写工具入参） | `…H5uIrY/hook-payloads.jsonl` 第 11 行：模型发的命令是 `cat incident-probe.txt`，hook 输出 `updatedInput.command = "'/bin/cat' 'incident-probe.txt'"`；同目录 `result.json` 的 `command_execution` 记录里，Codex 实际启动的命令是 `/bin/zsh -lc "'/bin/cat' 'incident-probe.txt'"`。〔已复核〕 |
| U-05 | **STALE** | Codex 能挂载 MCP 有旁证（`framework-audit/u007-mcp-special-server-config-diagnostic.json` 里 `mcp list` 列出了 context7、pencil、shadcn），但 `figma` 在其中是 `enabled:false`，也没有任何 figma MCP 调用记录，`mcp__plugin_figma_figma__whoami` 是否可达没有验证。〔取证报告〕 |
| U-06 | **STALE** | 没有 Codex 会话内导出 `env` 的记录；测试里的 `CODEX_*` 都是测试自己注入的。`.claude/hooks/lib/harness.mjs:18-19` 的注释自承 Codex 侧 env 名未核验，判据在 `:22`（`CODEX_HOME`/`CODEX_SANDBOX`/`CODEX_SESSION_ID`）。〔取证报告；harness.mjs 行已复核〕 |
| U-07 | **STALE** | 没有 Codex 实际调用 web 工具的记录；A/B 评测还主动禁用了 `web_search`（`scripts/run-agent-context-ab.mjs`）。〔取证报告〕 |
| U-08 | **STALE** | 「auto 在 Codex 上恢复」从未跑过。最近的旁证只说明 `.codex/workflow-runner.mjs` 能对真实 Codex 接口跑通结构化调用（提交 `1a14fdd`、`5a1aeb4` 的说明），`framework-audit/workflow-audit-20261009/baseline-scout.stdout.txt` 首行标 `FIXTURE_NOT_NATIVE`，`scripts/test-workflow-runner-runtime.mjs` 用的是假 codex。这些都不等于验证了这条声称。〔取证报告〕 |
| U-09 | **拆为两半** | **(a) 分叉还是投影 → REFUTED（有意投影）。** 运行记录：本次复跑 `node scripts/check-capability-parity.mjs`，输出 `PASS capability parity: anchors=133, shared-projections=50, delegated-projections=1`〔已复核〕。该检查要求 `.agents/skills/*` 默认必须是共享软链，只有源文件声明 `codex-projection-mode: external-delegation` 才允许真实目录，并校验 digest；`.claude/skills/office/magicpath/SKILL.md` 声明了该模式，`scripts/sync-magicpath-projection.mjs` 维护它。magicpath 现为 587 行（`.agents`）与 72 行（`office`）。 **(b) Codex 触发 magicpath 时实际读哪份 SKILL.md → STALE。** 没有「显式触发后 Codex 打开了哪份」的记录。只有部分旁证：一份真实 Codex 会话的 skill 目录里同时列出三份同名条目（`.agents/skills/magicpath`、经 `office` 软链进入的 `office/magicpath`、全局 `~/.codex/skills/magicpath`），所以「读 `.claude` 还是 `.agents`」本身是个伪二分。〔(b) 取证报告〕 |
| U-10 | **REFUTED**（Codex 对 apply_patch 触发 PreToolUse） | `…H5uIrY/hook-payloads.jsonl` 第 13、35 行：`hook_event_name=PreToolUse`、`tool_name=apply_patch`；第 14、36 行是对应的 `PostToolUse`（`tool_name=apply_patch`）。codex 0.163.0。〔已复核〕登记册里追踪的三个 issue（#16732/#17794/#20204）仓内没有后续处置记录，可以关闭追踪。 |
| U-11 | **拆为两半** | **前半「Codex 侧无法传 per-agent model 参数」→ REFUTED。** 运行记录是路由状态文件 `~/.luca/state/model-routing/codex/*.json`（含 `*.json.history/`；仓外但持久，不在 `/tmp`）：按 `invocation_id` 去重后（2026-10-19 统计，数字会继续增长）有 687 条已被接受的调用，其中 390 条的 `requested_model` 不等于 `root_anchor.model`。**同一个根模型 `gpt-6.1-sol` 下，anchor 角色多数拿到 `gpt-6.1-sol`（77 次，等于根；另有 13 次拿到 `gpt-6-astra`）、peak 角色拿到 `gpt-6-astra`（229 次）、light 角色拿到 `gpt-6-luna`（43 次）。** 「已接受」由 `scripts/model-route-host.mjs:585-599` 判定，要求 `adopted_model === requested_model`、`status === 'completed'`、`same_invocation_success === true`、`rerouted === false`、`fallback === false`，所以这些子会话**实际采纳**了与根不同的模型。同一个根下不同角色拿到三个不同的模型，纯继承或单一的全局默认值都产生不出这种分布；`.codex/agents/` 下四个 TOML 都没有 `model` 键，所以只剩「每次调用各自传入」。〔已复核：我亲自统计了状态文件并读了判据代码〕**仍属推断的部分：** 传入通道就是 `.codex/model-route-hook.mjs:335-337` 的 `updated.model`，这是排除法的结论，没有直接抓到那条 spawn 载荷。`framework-audit/2026-09-30-model-routing/native-adoption-evidence.json` 里 quality-gate 子会话 turn 的 `model: gpt-6-astra` 只是同方向的旁证，它本身没有记录根模型，不能单独区分继承与写入。**后半「frontmatter inert」→ STALE。** 没有 Codex 是否读取 `recommended-model` 的记录。 |
| U-12 | **CONFIRMED**（Codex 消费 AGENTS.md） | 真实 Codex 会话 rollout `~/.codex/sessions/2026/10/10/rollout-2026-10-10T09-16-24-01a12361-f4d3-7900-80a5-5ae6c3103f50.jsonl`（**该文件现已被 Codex 压缩为同名的 `.jsonl.zst`**，我解压后核对了第 4 行与此处引用一致；原 `.jsonl` 已不存在，其余行无法再对照）第 4 行：`role=user`，文本以 `# AGENTS.md instructions for /Users/luca/.codex/worktrees/d7f1/luca_gstack` 开头，即 Codex 把 AGENTS.md 作为用户消息注入了。〔已复核〕**范围限定：** 登记册里的「按 AGENTS.md §4.8 意图路由选档」这一后半命题已经没有对象：现行 `AGENTS.md` 是 K1–K10 结构，没有 §4.8、§0.5c-2、§2b′。 |
| U-13 | **STALE** | 没有「careful 在 Codex 上被触发或挂载」的记录。`careful` 刻意没有注册进 `.codex/hooks.json`；原生测试里 `hooks/list` 恰好返回 11 条，只是间接旁证，因为它没有触发 skill。〔取证报告〕 |

**复核中发现的、与登记册不一致的现状（仅记录，本轮不改）。**
1. U-02、U-03、U-04、U-10 在登记册里写成「Codex 缺失/不能」，而现行产物已经把它们当作成立：`harness.mjs:103` 的 `denyVerb: true`、`:110` 的 `inputMutation: true`、`.codex/hooks.json` 注册了 SessionEnd。现在运行记录证实了产物的做法。
2. `harness.mjs` 内部仍有自相矛盾的注释：`:19` 与 `:115`/`:117` 写着 Codex env 名、工具名「未核验」，而 `:103-116` 对 deny、输入改写、fan-out 又当作已确定的事实。建议下一轮清理，本轮不在范围内。
3. 登记册第 6 行「AGENTS.md model dispatch 已加 hedge」和 U-11 引用的 §4.8.2/§11 在现行 `AGENTS.md` 里都找不到对应内容，该说明已经过时。
4. 上文「harness 门加固覆盖面」一节里，把 U-02 当作未决：U-02 现在有运行证据，该节剩下的真正未决项只有 U-13。

<!-- 生成源：审计 Round1 H6 agent 的 h6-result.json；重跑 scratchpad/audit/gen_uregister.py -->
<!-- 2026-10-19 复核结案一节由人工与只读取证写入，不由生成脚本产出；重跑生成脚本会丢掉它。 -->
