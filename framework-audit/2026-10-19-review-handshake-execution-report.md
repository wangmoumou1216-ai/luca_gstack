# 评审握手方案 · 执行报告（2026-10-19）

**完成状态：DONE_WITH_CONCERNS。** 方案 P0–P4 全部执行完毕，每个 Phase 都过了独立 quality-gate 冷审，没有使用 `FAST_COMMIT`，没有绕过任何 hook。「concerns」是 §7 里如实记录的几项，其中最重要的一条是探针在真机上给出了 RED（见 §5）。

执行者：Claude Code 会话。原方案按 Codex 执行写，luca 改为由本会话执行；Codex 专属项按宿主说明替换：启动命令忽略、`apply_patch` 用 Edit、P0 的写探针记 N/A。

**关于本报告的定稿时点：** 本报告是最后一次整体冷审的审查对象之一，所以它在那次审查之前定稿，**不含那次审查的裁决，也不含推送结果**。那次审查的 run id 前缀是 `handshake-20261019-p4`，裁决写在 `memory/evals/eval-log.jsonl`，提交与推送情况以 `git log` 为准。

## 1. 提交与门票

| Phase | 提交 | 质量门 run id | 裁决 | 提交时的完整 verify（数字取自提交时的终端输出，未随仓库留存，别人无法复核） |
|---|---|---|---|---|
| P1 证据清账 | `ad2b333` | `handshake-20261019-p1-f7cd8e1c13ec` | FAIL 12/13（C1：U-11 前半的证据无法区分「继承」与「hook 写入」） | — |
| | | `handshake-20261019-p1b-21f3e957bbef` | **PASS 13/13**（证据换成路由状态文件统计后重审） | PASS=123 FAIL=0 WARN=1 |
| P2 调查与统计 | `1834ace` | `handshake-20261019-p2-647f9802a202` | **PASS 11/11** | PASS=124 FAIL=0 |
| P3 探针 | `a3e69bd` | `handshake-20261019-p3-e1704fd28754` | **CONDITIONAL_PASS 12/13** | PASS=124 FAIL=0 |
| P4 设计稿、修正与收尾 | 见 `git log` | `handshake-20261019-p4-6cad5f4f7c7e`（最后一次整体冷审，第一次） | **CONDITIONAL_PASS 12/13**（无 BLOCKER/MAJOR；7 条硬断言全过；C3 有 4 条 MINOR，已在提交前修正） | 见提交 |
| | | `handshake-20261019-p4b-5ef091242946`（修正后的第一次重审） | **CONDITIONAL_PASS 13/14**（无 BLOCKER/MAJOR；8 条硬断言全过；1 条 MINOR 与 1 条 NIT，已修正） | |
| | | 前缀 `handshake-20261019-p4c-`（对最终字节的重审） | 见 eval-log（本报告在这次重审之前定稿，不含它的裁决） | |

- 每次审查的裁决都**逐字**写入 `memory/evals/eval-log.jsonl`，包括 P1 的那条 FAIL，没有隐去。
- `3f17050` 不是我的提交：另一个会话把 origin/main 合并进了本地 main。我核实过它相对上游只多了 P1 的 9 个文件，没有夹带别人的内容，所以把它列为已知外来提交；推送清单按「我的提交加它」校验，其余任何提交即 BLOCKED。
- 每个 Phase 一个提交，逐文件路径提交（`git commit -- <路径>`）。从未使用 `git add -A`、`--no-verify`、stash、reset、rebase。三次提交的完整 pre-commit verify 都是 `FAIL=0`。

## 2. 每个 U 的状态

| U | 状态 | 证据与说明 |
|---|---|---|
| U-000a 基线 | DONE | 基线 verify 当时 `PASS=121 FAIL=2`，失败项 C27、S34，原因是另一个会话半部署的 `.codex/hooks.json`（`REGISTRATION_CONTRACT_MISMATCH`）。该会话提交同步后，P1 提交时的完整 verify 全绿，**因此没有使用 `FAST_COMMIT`**。 |
| U-000b KILL-1 spike | DONE（结论：不可判） | 用尽 2 次尝试：嵌套 `codex exec` 加离线 stub 可以跑通，父会话写文件成功（对照 A），但 `spawn_agent` 在该配置下返回 `unsupported call`，对照 B 与实验组都没跑起来。按方案转用官方 subagents 文档加 LG-011 作判据。**这不是实测。** |
| U-001 假只读声明 | DONE | 3 个 TOML 去掉 `sandbox_mode` 并改为如实注释；检查器改为遍历全部 `.codex/agents/*.toml`；变异自证两次（普通键、带引号加缩进的键）均变红，撤销后文件哈希与变异前一致。 |
| U-002 judge 文档 | DONE | 两处不实表述改为如实。 |
| U-004 登记册结案 | DONE | 5/13 已由运行记录定论，2 条部分定论，6 条仍不可验。P1 首次审查 FAIL 后，U-11 的依据换成路由状态文件统计。 |
| U-005 CI/PR 调查 | DONE | 见 §4。 |
| U-007 统计脚本 | DONE | 变异验证均变红（去重优先级、cwd 过滤、月份计算，以及 P4 补上的「两份 history 快照之间较晚者胜出」）。 |
| U-011 探针 | DONE | 真机运行 RED，见 §5。 |
| U-014 设计稿 | DONE | PROPOSED，不实现。 |
| U-015 收尾 | DONE | 本报告、方案正文入仓、最后一次整体冷审。 |

## 3. U-REGISTER 结案摘要

- **CONFIRMED：** U-02（Bash 的 PreToolUse 触发且 deny 被执行）、U-12（Codex 消费 AGENTS.md）。
- **REFUTED：** U-03（有 SessionEnd）、U-04（updatedInput 改写入参生效）、U-10（apply_patch 触发 PreToolUse）。
- **部分定论：** U-09（分叉还是投影：有意投影；触发时读哪份：仍不可验）、U-11（前半：REFUTED；后半 frontmatter：仍不可验）。
- **仍不可验：** U-01、U-05、U-06、U-07、U-08、U-13。

U-11 前半的依据：路由状态文件里已被接受的调用，去重后 687 条（首次统计）中 390 条的请求模型不等于根模型；同一根模型 `gpt-6.1-sol` 下 anchor/peak/light 三个角色拿到不同的模型；「已接受」要求 `adopted_model === requested_model` 且未重路由、未回退（`scripts/model-route-host.mjs:585-599`），质量门还确认 `adopted_model` 取自子会话原生 transcript 的 `turn_context.model`，不是自报值。**传入通道就是 hook 的 `updatedInput.model`，仍是排除法推断，没有直接抓到 spawn 载荷。**

## 4. CI 与 PR（U-005）

- 「`Validate Framework Logic` 自 09-29 起持续失败、根因未定」**不成立**。09-26 到 10-06 的 16 次失败分布在 **10 个不同步骤**上，是在途开发提交带来的回归被逐个修掉；10-06 之后连续 46 次成功；10-16 的那一次失败是独立的偶发失败，失败步骤是 `A/B evaluator adversarial self-test`，同一提交重跑通过。
- 10-16 失败的根因：管道读取把多字节 UTF-8 字符切在 chunk 边界，已由 `9ea6f22` 修复。**该根因我没有复现，属报告级。**
- 因此评审里的 A1「CI 诊断排第一，因为根因决定探针集的探测面」**前提被证伪**：这个根因与 attestation 的字段漂移无关。
- PR #14/#15：均为 draft。内容已通过 `5ab9360`（10-02）进入 main 并继续演进。只给了处置建议，**没有评论、关闭或合并任何 PR**。

## 5. 探针真机结果：RED（需要你看）

对本机 Claude Code 2.1.303 / Codex 0.163.0 的真实会话，用 HEAD 版 attestation 模块运行：

- **Claude 侧：** 有效会话通过（16–17 份，随本机会话增长），字段（`origin.kind` / `promptSource` / `isMeta`）没有漂移。主机已超出仓内核验过的 2.1.266 上限。另有 1 份会话报 `CWD_MISMATCH`（会话中途 cwd 变了，是探针按首行取 cwd 的局限，不是字段漂移）。
- **Codex 侧：** 框架根下的根用户线程只有 `codex exec` 无头会话。**按形状和版本分组后：`codex exec` 的 0.162.1 通过 1 份，0.163.0 失败 1 份**（`UNKNOWN_SCHEMA`：用户记录没有 UserMessage 锚）。
- **根因（读代码定位）：** `codexRecordIsUnanchoredContext` 在「注入的上下文用户记录」之后最多往前看 4 条记录找下一条同 turn 的真实用户记录。0.163.0 的 exec 会话里多了一个 `thread_settings_applied` 事件和一条 developer 消息，距离变成 5，超出窗口。
- **版本趋势（`~/.codex/sessions` 全部根线程，只用元数据）：** 0.153–0.161 exec 为 3；0.162.1 为 3–4；0.162.0-alpha vscode 为 4–5；0.163.0 exec 为 5（3/3）；0.163.0 vscode（交互式）只有 1 个样本，距离 4，恰好贴在窗口上限，没有余量。
- **边界：** 探针用「从偏移 0 重新校验整份历史」这条路径，可能比运行时按游标逐回合的检查更严，**运行时路径是否同样失败没有验证**；交互式 Codex 根线程在**未压缩的**会话里（本仓 cwd 下）没有可用样本。探针和统计脚本都**不读** `.jsonl.zst` 压缩会话：`~/.codex/sessions` 里有 174 份 `.jsonl`、1170 份 `.jsonl.zst`，我只覆盖了较新的约 13%；质量门抽查到压缩件里有 8 份 0.130–0.159.3 的 codex-tui 根线程，都比 0.163.0 旧（这个数字我没有复核）。所以「交互会话是否受影响」**未核验**。
- 我没有修改 attestation（本轮禁止）。候选修法与取舍写在设计稿 §3，由你决定。

## 6. 路由与使用情况（E1 最新数字，统计时刻 2026-10-19T08:38Z，会继续增长）

- Codex 路由：662 份快照，去重后 801 条调用；7 个 activation 记录过 critical_failure。已接受调用：quality-gate（peak/critical）约 403 次、preflight-agent（light）约 73 次、fact-collector（light）21 次、muse-proto-judge 4 次，另有 explorer/worker/default 等 anchor 角色调用。**这推翻了评审里「Codex 路由没有生产数据」和「preflight 可退役」的前提。**
- quality-gate 落账：204 条，`user_adopted` **204/204 全部 unknown**。本轮没有做采纳落账（见 §9）。
- route-guard 注入：对会话文件 `[route-guard]` 字样的子串计数，置信度低，只作量级参考，不是注入次数的精确值。

## 7. 如实记录的偏差与遗留

1. KILL-1 的 spike 不可判，结论依据官方文档加 LG-011，**未实测**。
2. 探针真机结果为 RED，且 Codex 侧只有无头 exec 会话的样本（§5）。
3. 质量门的票绑定它审过的字节，所以 P1/P2/P3 各自提交的是审过的版本，它们的 MINOR 项统一在 P4 修正，并由 P4 的整体冷审覆盖最终字节（处理情况见 §9）。
4. P2 审查时，质量门用 `git fetch` 带 refspec 临时创建了 `refs/qg/pr14`、`refs/qg/pr15` 并立刻删除，我核对过无残留。
5. P2 的断言 A6 是我写错的（gh 的 `@csv` 给字符串加引号），质量门按更正版执行并注明。
6. P3 审查时我给质量门的「已知情况」漏提了那份 Claude 的 `CWD_MISMATCH`，质量门指出，已在设计稿和本报告里补上。
7. 三条线程同时在这个检出里提交和推送；另一个会话在我提交 P1 之后把 origin/main 合并进了本地 main（`3f17050`）。
8. 最后一次整体冷审第一次是 CONDITIONAL_PASS，指出 4 条 MINOR：设计稿 §5 把别人的 attestation 改动写成「未提交、本轮没有依赖」，实际上它已作为基线 `5fc27ad` 提交，探针的 HEAD 版本就包含它（已改正）；探针与统计脚本不读 `.jsonl.zst`，且「没有交互样本」说过头（已补限定）；U-12 引用的 rollout 现已被压缩（已注明并解压核对）；本报告把 `harness.mjs` 的矛盾归到了登记册名下（已改正）。我逐条核实后才修改，没有凭它的话改。第一次重审（p4b）又指出两处：设计稿 §3 里一句引用 §5 的话没跟着改，与改后的 §5 矛盾；U-12 写的「内容不变」其实只能核对第 4 行。我这次把四份文档里所有「在途」「未提交」类表述一次查全后一并修正，而不是只改被点名的那一处。
9. 会话中途撞到 5 小时使用限额，重置后接着做。进度全部在磁盘上（已提交的 3 个 Phase、工作树修改、scratchpad 里的续接便条），没有只存在于对话记忆里的状态；恢复后我先重新核对了仓库的真实状态（HEAD、与 origin 的差距、工作树）再继续。

## 8. 推送与同步规则

推送在本报告定稿之后进行，结果不记录在本报告里。规则：推送前先 fetch 并核对；待推送清单只允许是「我的提交」加已核实的外来合并提交 `3f17050`，出现其他任何提交即 BLOCKED，不推送；只做快进推送，不 rebase、不 merge、不 force；origin 在此期间前进导致分叉时停下来问 luca。

## 9. P4 修正与遗留

**已在 P4 修正：**
- U-REGISTER：U-11 补上同一根模型下 anchor 另有 13 次拿到 `gpt-6-astra`；把「`H5uIrY` 与 `IQv4vy` 是同一次运行」改成两次不同的运行，并写明各自的时间和文件差异。
- 调查页：自相矛盾的一句（CI 配置没改动 vs 新增了一步）改为在任何时点都成立的说法；各处快照数字加了取数边界。
- 统计脚本的测试缺口：补上「两份 history 快照之间较晚的 `archived_at` 胜出」的夹具和断言；「先看到者胜出」这个变异此前能存活，现在会让测试变红。
- 探针：Codex 的形状标签加上会话自己的 `cli_version`，使 0.162.1 通过、0.163.0 失败分成两行；文件头写明已知局限；测试相应加强。
- 设计稿：写入探针的已知局限。

**仍然存在（不是缺陷修复范围，已记录）：**
- 检查器的正则 `^\s*["']?sandbox_mode["']?\s*=` 对 TOML 多行字符串里恰好以 `sandbox_mode =` 开头的行会误报，也抓不到 `agents.sandbox_mode` 这类点号键。目前没有任何文件命中这两种情况。
- 探针的裁决跨两个宿主合并，Codex 侧没有有证据的会话时也可能出 GREEN；有效行是存在性代理。这两点已在探针头注释和设计稿里写明，没有改行为。
- `harness.mjs` 里自相矛盾的注释（`:19`、`:115`、`:117` 写着「未核验」，而 `:103-116` 把同类能力当作已确定；矛盾在 `harness.mjs` 本身，登记册只是引用了它）：建议下一轮清理，本轮不在范围。
- 探针与统计脚本不读 `.jsonl.zst` 压缩会话（见 §5），已在探针头注释、统计脚本的置信度说明和设计稿里写明；若要覆盖它们，需要先解压（本机有 `zstd`），本轮没做。

**下一轮候选（本轮明确没做）：**
- attestation 的窗口问题与分级姿态实现，据设计稿由 luca 决定。
- quality-gate 采纳落账：需要确定性触发入口，复用现有 `user_adopted` 与 `memory/eval-schema.yaml`；`CHANGELOG` 里有靠文字约定触发而失守的先例。
- 版本哨兵接入 SessionStart；route-guard 瘦身；preflight 去留（据本轮统计数据，现在不该退役）；新测试接入 `verify.sh`。
