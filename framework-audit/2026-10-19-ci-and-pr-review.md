# CI 失败复盘与 PR #14 / #15 处置建议（只读调查，2026-10-19）

范围：只读调查，不改 CI 配置，不对 PR 评论、关闭或合并。证据全部来自 `gh` 只读查询与本仓 git 历史。
证据强度分三档：**实证**（直接读到的运行记录/日志/树）、**报告级**（别的会话写在提交说明里的结论，我没有复现）、**推断**。

## 1. CI：`Validate Framework Logic` 的失败

### 结论（一句话）
「自 2026-09-29 起持续失败、根因未定」这个说法不成立。失败是**两件不同的事**：09-26 到 10-06 是一波跨 10 个不同步骤的失败，随开发提交逐个被修掉，10-06 之后恢复稳定；10-16 的那一次是一个独立的偶发失败，根因已在别的会话找到并修复。

### 1.1 失败波（09-26 → 10-06）：10 个不同步骤，不是一个故障（实证）
自 2026-09-25 起共 105 次 CI 运行（`gh api .../actions/runs`）：89 次成功、16 次失败。16 次失败全部发生在 `Validate Framework Logic` 这一个 job 里，其余检查（Markdown / YAML / HTML / Skill Definitions）始终通过。把每次失败的**失败步骤**取出来（`.../runs/<id>/jobs` 的 steps）：

| 日期 | 次数 | 失败步骤 |
|---|---:|---|
| 09-26 | 1 | Hook runtime side-effect tests |
| 09-28 · 10-01 · 10-01 · 10-03 | 4 | Codex projection static wiring (CI-safe host checks) |
| 09-29 · 09-29 | 2 | Host Launch broker and control-plane regression |
| 09-29 | 1 | Project identity transaction conformance |
| 09-29 | 1 | Project identity single-adjudication |
| 10-01 | 1 | Matt38 offline fixture and synthetic oracle contracts |
| 10-01 | 1 | Verify composition contract and mutation counterexamples |
| 10-02 · 10-03 | 2 | Current-instance, source receipts and assertion exit contracts |
| 10-06 · 10-06 | 2 | Motion registration, exact delivery and actual browser gates |
| 10-06 | 1 | Design workflow core contracts |

这个 job 是一个约 60 步的聚合 job，所以只看「Validate Framework Logic 红了」会把互不相干的失败误读成同一个故障。它们对应的是同一时期正在进行的多条开发线（Host Launch、项目身份、Matt 技能适配、动效门），属于**在途提交带来的真实回归被逐个修好**，不是一个长期未知的根因。

### 1.2 失败波是怎么结束的（实证）
- 最后一次失败：2026-10-06 08:06Z，提交 `c8471dc`（一个 PR 运行）。
- 之后第一次成功：08:34Z，提交 `a7a0d53`（`fix(ci): avoid persisting checkout credentials in diagnostic checks`）。
- 从那之后到 10-16，**连续 46 次成功**。

我只能说 `a7a0d53` 是波后第一个绿的提交，不能说它「修了」某个具体失败；这些失败各自对应不同的步骤，由各自的修复提交处理。

### 1.3 10-16 的单次失败：根因已有人找到并修复（实证 + 报告级）
- 运行 `38866662951`（提交 `a3528ff`）：**第 1 次尝试失败，耗时 7 分 04 秒**（正常 13–18 分钟）；**第 2 次尝试成功**（10-19 01:52Z–02:10Z，同一提交）。同一提交重跑就过，是偶发失败的典型特征。（实证）
- 第 1 次尝试的失败步骤：`A/B evaluator adversarial self-test`。日志里的报错原文（节选）：
  `G5_RESULT cell=g5-05-t3-claude-candidate-r1 status=FAIL record=BLOCKED … native session ended before all fixture turns … turn 1 unobserved or incomplete source .claude/agents/plan-agent.md`。（实证，日志来自 `gh run view 38866662951 --attempt 1 --log-failed`）
- 根因：提交 `9ea6f22`（2026-10-19，`fix(ab-evaluator): decode child output as UTF-8 streams`）的提交说明写明：管道读取可能把一个多字节 UTF-8 字符切在两个 chunk 之间，用 `+=` 拼接原始 Buffer 会把被切开的字节变成 U+FFFD；G5 离线自测因此把中文的 `plan-agent.md` 读取判为不完整，**只有 chunk 边界恰好落在某个字符内部时才会发生**，所以本地通过而 CI 偶发失败；作者称强制 8191 字节读取可以复现，`setEncoding` 修复后通过。**（报告级：我没有复现这个根因，只核对了它与失败日志里的 cell、文件名一致。）**
- 修复之后：`9ea6f22` 自己的推送运行（39189816436）与随后的合并运行（39195188786）都成功。（实证）

### 1.4 对评审结论的含义
- 评审里的 A1 主张「CI 诊断排第一，因为根因决定探针集的探测面」：**前提被证伪**。10-16 的根因是 G5 评估器读管道时的 UTF-8 分块解码，与 attestation 的取证字段、版本漂移都无关；它不影响版本哨兵该探测什么。09-26 的失败波则是 10 个不同的在途回归，同样不是一个「根因待定」的故障。
- 这与评审启动指令里预期的「F-R25 一页根因报告」是同一个结论：根因已定，且不在字段漂移上。
- 无需再做 CI 诊断。CI 配置我没有改动；我只在 `Validate Framework Logic` job 末尾新增了一步运行两个夹具测试（见执行报告）。

## 2. PR #14 与 PR #15

### 2.1 现状（实证）
| | PR #14 | PR #15 |
|---|---|---|
| 标题 | feat: adapt Matt Pocock methods to luca_gstack | Adapt Matt skill methods and fix setup diagnostics on current framework |
| 状态 | OPEN，**draft** | OPEN，**draft** |
| 分支 | `codex/matt-skills-adaptation` | `codex/matt-skills-adaptation-ci-fix-v1` |
| 创建 / 最后更新 | 2026-10-01 / 2026-10-01 | 2026-10-01 / 2026-10-01 |
| 规模 | +69,436 / −1,828，186 个文件，1 个提交 | +71,931 / −1,817，185 个文件，1 个提交 |
| CI | `Validate Framework Logic` **失败**（其余通过） | 全部通过 |
| 关系 | — | #14 的 CI 修复后继版（正文写明 #14 的 Shell 检查失败） |
| 与 main 的距离 | main 比其基线多 95 个提交 | main 比其基线多 93 个提交 |

### 2.2 内容是否已进入 main（实证）
- 这两个 PR 引入的四个技能 `writing-workshop`、`loop-me`、`issue-triage`、`setup-wizard`，已经在 **10-02** 随提交 `5ab9360`（`feat(skills): integrate reviewed Matt adaptations`）进入 main，比 PR 开出来晚一天。
- 逐文件对比 PR 头与当前 `origin/main`（只看 PR 相对其合并基点改动的文件）：
  - PR #14：90 个文件与 main **逐字节相同**；96 个不同；0 个在 main 上缺失。
  - PR #15：93 个文件逐字节相同；92 个不同；0 个在 main 上缺失。
- 对「不同」的文件再查：PR 的那个版本是否曾经出现在 main 对应路径的历史里：
  - PR #14：32 个曾在 main 上、后来被超越；64 个**从未以 PR 的形态出现在 main**。
  - PR #15：33 个曾在 main 上、后来被超越；59 个从未以 PR 的形态出现。
- 「从未出现」的文件里，样本包括 `.claude/skill-os/generated/input-modes/*.json`（这类文件由源文件重新生成，PR 当时的版本本来就不会原样留在 main）和 `.claude/agents/orchestrator.md`（main 之后继续演进）。

**我能下的判断：** 这两个 PR 的意图已经通过 `5ab9360` 的「审阅后集成」进入 main，并且 main 此后又演进了 93–95 个提交。PR 本身不再是一个可以直接合并的单元：合并会与 main 上约 90 个已演进的文件冲突，而且会把已演进的版本改回去。
**我不能下的判断：** 那 59–64 个「从未以 PR 形态出现」的文件里，有没有 PR 独有、而 main 没有吸收的内容。逐文件做语义比对超出本次范围（推断：大部分是再生成文件与已演进文件，但我没有逐个确认）。

### 2.3 处置建议（建议，不执行）
1. **PR #14：建议关闭。** 理由：它是被 #15 取代的前一版，CI 本身是红的，且内容已通过 `5ab9360` 进入 main。关闭时可附一句「superseded by #15 and integrated via 5ab9360」。
2. **PR #15：建议关闭，前提是你确认 `5ab9360` 吸收的内容就是你要的。** 理由：仍是 draft，CI 虽绿但基于 93 个提交之前的 main，已无法干净合并。如果你担心有独有内容，先做一次针对 59 个「从未出现」文件的抽查，再关闭；不要直接合并。
3. 不要 merge 其中任何一个。

这些都只是建议；是否关闭由你决定。我没有评论、关闭或修改任何 PR。
