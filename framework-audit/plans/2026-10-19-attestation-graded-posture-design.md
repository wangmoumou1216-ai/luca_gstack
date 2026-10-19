# attestation 分级失败姿态：设计稿

**Status: PROPOSED（不实现）。** 本文只提出设计与取舍，没有改动任何 attestation、project-scope-guard、route-guard、session-restore 代码，也没有改动任何 hook 注册。是否采纳、采纳哪一部分，由 luca 决定。
日期：2026-10-19。依据：评审复核（Q3/Q4/C3/T9）、本轮只读探针的真机结果、仓内代码阅读。证据强度标注：**实证**（读到的代码/运行记录）、**报告级**（别人写下的结论，未复现）、**推断**。

---

## 1. 威胁模型

**要防的是什么。** 自家自动化制造的「合成回合」被当成真人授权。Claude Code 的 `UserPromptSubmit` 在三种非真人输入上也会触发：定时任务/`/loop`、后台 subagent 回报、别的会话发来的消息；hook 输入里没有任何来源字段（官方 hooks 文档，2026-10-18 核；**实证**）。框架又把「切换项目」「写项目文件」这类权限绑定在「这一回合来自真人」上，所以需要在 hook 之外自己判断回合来源。

**不防什么。** 同一台机器上、同一用户身份运行的恶意进程。它能直接读写 transcript 与状态文件，attestation 不构成对它的安全边界。这是单人、单机、同一账户的场景，**不要把 attestation 当作安全边界宣传**。

**新增一个必须单列的子情形：外部内容经自家自动化注入。** 一个 subagent 读了网页、下载文件或第三方仓库内容，把其中「请切换到项目 X」「请发布」之类的话带回主会话。此时攻击者是外部的，但走的正是上面那条「权限语义混淆」通道。这是 attestation 最该发挥作用的场景，也是它与企业级威胁模型重合的地方（**推断**，仓内没有这类事件的记录；至今也没有「attestation 成功拦截真实冒充」的事件记录）。

**可逆性分层（决定姿态的唯一标尺）。**
- **R-irreversible：** 不可回滚，或影响仓外。例如 `git push`、对外发布、删除、向外部服务提交内容。
- **R-cross-project：** 写到别的项目目录，或切换/创建项目。出错会污染另一项目的状态，较难发现。
- **R-local-reversible：** 在当前框架仓内、git 可回滚的写入。
- **R-read：** 只读。

## 2. 分级姿态

**现状（实证）：** attestation 失败对项目权限一律 fail-closed（`project-scope-guard.mjs` 的 `attestForPreTool`，注释写明失败即拒绝）。后果是任何一次宿主格式变化都会让「所有需要项目权限的动作」同时停摆；仓内记录过两起：`isMeta` 出现语义变化导致真人 prompt 全盘 hard-fail；`passthrough.turn_id` 归属错误导致已完成的 quality-gate 被误判并闩锁。

**提议：按可逆性分级，把爆炸半径缩小到「只停危险动作」。**

| 动作类别 | attestation 通过 | attestation 失败/不可判 |
|---|---|---|
| R-irreversible | 放行 | **fail-closed**（拒绝，说明原因与自检命令） |
| R-cross-project（含切换/创建项目） | 放行 | **fail-closed** |
| R-local-reversible | 放行 | **fail-open，并写日志**（保持当前会话 pin，不放宽到别的项目） |
| R-read | 放行 | 放行 |

要点：
- **fail-open 只放宽「是否被识别为真人」，不放宽「写到哪里」。** 路径解析、会话 pin、无 pin 即拒绝等边界逻辑保持不变。
- **日志要能被人看到。** fail-open 的每一次都应进入一个只追加的记录，并在下次会话启动时汇总提示一行；否则它就是「静默失效」。
- **这不省掉取证管线本身。** 管线按回合运行，分级只缩小低风险调用的失败后果（对抗轮裁定 R2 的原话是「分级省不掉管线本身」，这一点成立；它省的是停机代价）。

**Codex 侧的硬约束（实证，已核实）。** `.codex/hooks.json` 的 SessionStart 命令写成「脚本退出码非 0 就 `exit 2`」，且 `LUCA_NATIVE_HOOK_STRICT=1` 下 PreToolUse 的运行时失败也返回 2（`.codex/codex-hook-adapter.mjs` 第 48–53、390 行）。所以**任何新增在这些 hook 里的逻辑只要抛异常，就会阻断 Codex 会话启动或工具调用**。凡是在 hook 里加的东西，必须整体 try/catch，保证退出码为 0，并有异常注入测试。

## 3. 降级模式与版本探针

**问题：** 现在没有「探针红时怎么办」的定义，attestation 失败时只有一种姿态（全部拒绝）。

**提议的降级语义：**
- **探针 GREEN：** 正常姿态（第 2 节）。
- **探针 RED 或宿主版本高于已核验版本：** 在会话启动提示一行「attestation 字段未在此版本核验」，指向探针命令；**不改变放行/拒绝逻辑**（先提示、不自动降级）。是否自动切换到更保守姿态，另行决定。
- **探针 INSUFFICIENT：** 同上，只提示。

**探针由谁、何时运行：** 本轮交付的是手动命令 `node scripts/probe-attestation-fields.mjs` 与两个 CI 夹具测试。是否接入 SessionStart 提示、是否记录「最后核验通过的版本」，留给 luca 批准后实现。**版本记录不要放在 `.claude/skill-os/runtime/`**（该目录全是受 FILE_END 与 agent-context 检查管辖的运行时协议文档，放数据文件会被误判）；建议放在 `.claude/skill-os/` 根下的独立 JSON，并在实现时同步检查器。

**本轮探针的真机结果与它暴露的一个具体问题（实证）。** 对本机 2.1.303 / 0.163.0 的真实会话运行（HEAD 版本的 attestation 模块）：
- **Claude 侧：** 16–17 份有证据的会话通过（取数时的数字，会随本机会话增长）；另有 2–3 份通过但没有被校验到的行（不计为证据），1 份报 `CWD_MISMATCH`（会话中途 cwd 变了，属于探针按首行取 cwd 的局限，不是字段漂移，也不算红）。主机已经高于仓内核验过的 2.1.266，`origin.kind`/`promptSource`/`isMeta` 的出现语义没有看到漂移。（这是好消息，直接回答了「36 个小版本没测过」的担忧。）
- **Codex 侧：** 在框架根下的根用户线程里，只有 `codex exec`（无头）会话，1 份通过、1 份失败（0.163.0）。失败原因是 `UNKNOWN_SCHEMA`：「a Codex user record without a UserMessage anchor」。读代码定位到根因：`codexRecordIsUnanchoredContext`（`event-attestation.mjs`）在「注入的上下文用户记录」之后，**最多往前看 4 条记录**去找下一条同 turn 的真实用户记录。0.163.0 的 exec 会话在两者之间多了一个 `thread_settings_applied` 事件和一条 developer 消息，距离变成 5，超出了写死的窗口，注入记录没被识别。
- **版本趋势（对 `~/.codex/sessions` 里全部根线程做的统计，只用元数据）：** 注入记录到第一条真实用户记录的距离，0.153–0.161 的 exec 为 3；0.162.1 的 exec 为 3–4；0.162.0-alpha 的 vscode 为 4–5；**0.163.0 的 exec 为 5（3/3）**；0.163.0 的 vscode（交互式）只有 1 个样本，距离为 4，**恰好贴在窗口上限，没有余量**。

**探针按形状（含会话自己的 `cli_version`）分组后，这条信号更清楚：** 同一类 `codex exec` 根会话，`0.162.1` 的 1 份通过，`0.163.0` 的 1 份失败（`UNKNOWN_SCHEMA`）。这把「某个版本引入的变化」和「这类会话本来就不被模块支持」区分开了（只看已安装的 CLI 版本区分不了）。

**探针自己的已知局限（读报告时要带着）：**
- 裁决跨两个宿主合并：Codex 一侧没有任何有证据的会话时，也可能出 GREEN；按形状的分解会显示这一点。
- `UNKNOWN_SCHEMA` 与 `PROVENANCE_MISMATCH` 之外的错误码（如 `CWD_MISMATCH`、`SESSION_MISMATCH`、`EXCEPTION:*`）会被列出，但不会让裁决变红：会话中途换目录不是字段漂移。
- 「有效行」是存在性计数（Claude：带 `promptSource` 的真人行；Codex：`UserMessage` 事件），是对「校验器实际检查了多少行」的近似，不是精确度量。
- 探针不读 `.jsonl.zst` 压缩会话（约 87% 的 Codex 会话文件，都是较旧的会话）：结论只覆盖未压缩的较新会话。
- 其余局限见下一条（全历史校验与运行时路径的差异）。

**这条发现的边界（必须一并读）：**
- 探针用的是 `captureNativeEventFence({recoveryCursor: null})`，即**从偏移 0 重新校验整份历史**，这条路径可能比运行时按游标逐回合检查更严。我**没有验证**运行时路径在 0.163.0 的 exec 或交互会话里是否同样失败。
- 交互式 Codex 根线程在**未压缩的**会话里（本仓 cwd 下）没有可用样本，它们通常在托管 worktree 里运行。探针和统计脚本都**不读** `~/.codex/sessions` 下的 `.jsonl.zst` 压缩会话：该目录里有 174 份 `.jsonl`、1170 份 `.jsonl.zst`，也就是我只覆盖了其中较新的约 13%。质量门抽查到压缩件里有 8 份 0.130–0.159.3 的 codex-tui 根线程，都比 0.163.0 旧（这个数字我没有复核）。所以「交互会话是否受影响」**未核验**；只能说 0.163.0 唯一的交互样本，距离已在窗口上限。
- 我没有修改 attestation（本轮禁止）。下面是候选修法，供你决定：
  1. 把写死的 4 改大（最小改动，但下次再多插一条记录又会失效）。
  2. 不按固定距离，而改为按结构识别「注入上下文」：同一 `turn_id` 的 `turn_context` 之后出现的第一条同 turn 用户记录，不论中间隔了多少条非用户记录（更稳，改动更大，需要重新证明不会放过真实合成回合）。
  3. 暂不改，仅靠探针在升级后提示（成本最低，但问题继续存在）。

  注意：任何修法都要与之后可能出现的其他 attestation 改动协调，并在改完后重新运行探针（见第 5 节）。

## 4. 回滚与验证矩阵

**回滚。** 本稿没有代码，无需回滚。若采纳其中某部分：每一部分单独一个提交；分级姿态的开关用单一常量/配置，默认回到「全部 fail-closed」；Codex 侧改动前先用 `node scripts/codex-trust-hooks.mjs --host-launch` 的流程核对信任要求，改动 hook 注册文本须重新授信，只改被调用脚本内容则不需要（`hooks.json` 说明里写明「不要求源码摘要」）。

**验证矩阵（采纳后需要的断言）。**

| 场景 | 期望 |
|---|---|
| 真人回合，attestation 通过，任意动作 | 放行 |
| 合成回合（后台回报/跨会话消息），R-irreversible | 拒绝 |
| 合成回合，R-cross-project（含切换项目） | 拒绝 |
| 合成回合，R-local-reversible | 放行并写日志（fail-open），且路径仍受会话 pin 约束 |
| attestation 失败（格式未知），R-local-reversible | fail-open + 日志；下一会话启动可见提示 |
| attestation 失败，R-irreversible / R-cross-project | fail-closed，错误含人话原因与自检命令 |
| hook 内逻辑抛异常（Codex strict） | 退出码仍为 0，不阻断启动 |
| 无 pin 状态下碰项目目录 | 仍拒绝（与分级无关） |
| 探针夹具：缺 `origin` 的样例 | RED（UNKNOWN_SCHEMA） |
| 探针夹具：`promptSource` 消失 | INSUFFICIENT，不得判 GREEN |
| 变异：把分级表某一行改反 | 对应断言必须变红 |

## 5. 与 attestation 其他改动的协调

本稿起草时，主工作树里曾有他人**未提交**的 attestation 改动（`.claude/hooks/lib/event-attestation.mjs`，把 `claudeTaskLaunchedAfter` 改为 `claudeTaskLaunchedBefore`，是合成续接判定的改动）。**这批改动随后已经提交，成为本轮的基线 `5fc27ad`**：探针加载的 HEAD 版本（blob `05b7b2c4…`）已经包含它，所以探针与本稿的结论针对的就是这个版本；本轮没有评估这批改动本身的正确性，只是在它之上运行探针。
之后 attestation 如果再变（无论是修上面的窗口问题，还是别的在途改动），应当重新运行探针，并记录当时的 blob id，才能区分「宿主漂移」与「框架自己的改动」。
