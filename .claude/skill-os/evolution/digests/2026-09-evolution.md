# 月度演进 digest — 2026-09（覆盖 2026-08 与 2026-09）

> 模式：**propose-only**（行为面零编辑；簿记走 `scripts/evolution-bookkeep.mjs`；不走 consolidate_memory 晋升门）
> 覆盖 2026-08 与 2026-09：8 月扫描未运行（session-restore 记为「已跳过 2 次」），本轮合并补跑。
> **合并理由**：发现通道本来就按近期活跃度取样——S1/S3/S4 按 pushed_at 18 个月窗过滤，hub 深挖以上轮 sweep 日 2026-07-02 为 compare 起点，S2 取上轮之后的 CHANGELOG 增量。拆成两轮只会对同一批仓库重复计数，并让 zero_yield_streak 虚增一轮。
> 运行：2026-09-10 起跑，2026-09-11 收口（中途撞一次 API session limit，恢复后续跑，见「执行偏差」）。
> 红线：热度 ≠ 适配；gaps-register 的 status 翻转与任何采纳都是 luca 的人类门，本文件只提议。

## 本轮统计（G1 相位完整性）

- run_status：**COMPLETE** · verify 4/4 · redteam fallback 0
- 发现 13 → gap 对口去重 4（dropped_existing 4，opportunities 5）→ 核验 4 → APPROVED **0** / CONDITIONAL **0** / REJECTED **4**（其中红队击杀 0）

| 源 | 本轮 surfaced | 本轮 approved | bookkeep 后 yield_stats |
|---|---|---|---|
| S1-github-stars | 8 | 0 | `runs: 3, surfaced: 27, approved: 0, zero_yield_streak: 1` |
| S2-anthropic-platform | 1 | 0 | `runs: 3, surfaced: 17, approved: 0, zero_yield_streak: 1` |
| S3-agent-frameworks | 2 | 0 | `runs: 3, surfaced: 17, approved: 0, zero_yield_streak: 1` |
| S4-design-craft | 2 | 0 | `runs: 3, surfaced: 13, approved: 0, zero_yield_streak: 1` |

gaps_covered（本轮 APPROVED 数）：GAP-routing-fragmentation=0 · GAP-soft-enforcement=0 · GAP-fusion-impact-automation=0 · GAP-self-evolution-hardening=0 · GAP-issue-tracker-integration=0 · GAP-decision-questionnaire=0

---

## 首节四件套（强制裁决项）

### 1. adoption_review — 采纳复盘（38/38 行，36 个不同 id）

检查面：目标文件存在 + 机制 grep；融合日之后的 git log（**38 行 revert 均为 0**）；episodic `skills_used`（索引仅覆盖 2026-07-23..09-08，之前的使用不可见）；场景覆盖报告。

| 建议 | 行数 | 条目 |
|---|---|---|
| keep | 10 | code-hygiene 清理套件+Iron Law · tdd refresh · prove-it-bites→code-hygiene · registration-sync · wayfinder→plan-agent · quick-research · changelog-rationale · OpenSpec（仅记录）· codebase-design / resolving-merge-conflicts 07-12 全局装（已被 08-28/08-31 项目内 SSOT 取代）|
| watch | 28 | 其余；其中 08-28..09-04 的 12 条落地 ≤14 天，属 too-early |
| revert | 0 | 无任何回归证据 |

**需要 luca 裁决的两条在位性发现：**

1. **row 19「domain-modeling 三点」有一半被删了，且没有留下处置记录。** CLAUDE.md 里那条「术语冲突当场收敛 → 定案即 inline 写入激活项目 CONTEXT.md 词汇节，不攒批」，在 commit `1a2d878`（2026-09-06，lightweight agent context）重构时被删除。
   - 现在没有任何 owner 承载它：CLAUDE.md / AGENTS.md / office SKILL.md / extraction-bar / runtime 全部 grep 为 0。
   - 该轮的 5 份 agent-context 报告里也没有处置记录（grep 为 0）。A/B 日志从 protocol 22 起只在 baseline 臂出现这条规则。
   - extraction-bar 那一半（三条件主动提议门）仍在位。
   - 这不是有害回归，而是**未经记录的采纳逻辑缩减** → 请裁：恢复到某个 one-hop owner，还是追认删除（追认需补 adoption-log 记录）。
2. **row 12「diagnosing-bugs port → systematic-debugging」的正文不在记录的落点里。** `/Users/luca/.claude/skills/systematic-debugging/SKILL.md` 中 `假设|埋点|hypothes|falsif|instrument|DEBUG-|seam` 均为 0 命中。四个机制只残留在 `CREATION-LOG.md:123-124` 和 `scripts/hitl-loop.template.sh`。功能上已被 2026-08-31 的项目内 canonical `diagnosing-bugs`（row 31）取代。→ 请裁：在 adoption-log 标注为 superseded，还是查清正文去向。

**helped 回填提议（propose-only，均需 luca 确认）：** 以下几行首次具备「非 too-early」的 helped 证据——
- code-hygiene：11 次 episodic 使用，是 code-review facade 的 authority
- tdd：seam 门在 EP-20260824-144 被实际触发
- quick-research：60 天内 3 份产出
- registration-sync：落地首跑即抓到真漂移
- changelog 约定：之后 30 次提交都在遵守

注意：使用证据 ≠ 效果证据，所以写成「yes（使用层）」。这条直接关系到下文 revisit_due。

<details><summary>逐行复盘明细（38 行，AdoptionReview 原始输出）</summary>

| # | fused_candidate_id | 建议 | helped 提议 | 证据 |
|---|---|---|---|---|
| 1 | phuryn/pm-skills::opportunity-solution-tree | watch | unknown | In place: ux-brainstorm/SKILL.md OST/机会映射 9 hits; 5 later commits, 0 reverts. ux-brainstorm ACTIVE in scene coverage (1 output / 60d); episodic skills_used 1 (EP-20260824-146). No outcome signal attributable to OST itself. |
| 2 | colbymchenry/codegraph | watch | unknown | Downstream-only recommendation still referenced (code-recon/SKILL.md codegraph 11 hits); 0 episodic uses; no observed install in any session. 2026-07-23 code-review-graph evaluation already recorded incumbent zero-usage (EP-20260723-103). |
| 3 | raintree-technology/agent-starter::goms-klm-analysis | watch | unknown | In place: ux-audit/SKILL.md GOMS/KLM 3 hits; 5 later commits, 0 reverts. ux-audit WATCH (2 scenes, 0 outputs / 60d); 0 episodic uses → no chance yet to observe effect. |
| 4 | raintree-technology/agent-starter::cleanup-suite + obra/superpowers::verification-before-completion | keep | yes (usage-level; needs luca confirmation) | In place: code-hygiene/SKILL.md Iron Law 6 hits; 7 later commits, 0 reverts. Sustained voluntary use: episodic skills_used 11 (2026-07-25..09-08, incl. audit loops EP-20260728-110 and review-entry work EP-20260803-119). Help is usage-level, outcome attribution not isolated. |
| 5 | Fission-AI/openspec | keep | n/a | Record-only NARROW_BORROW; nothing was fused into luca_gstack. GAP-no-living-capability-truth still proposed. Nothing to revert. |
| 6 | mattpocock/skills@codebase-design | keep | unknown | 07-12 global install superseded by the 2026-08-28 project-local SSOT (adoption row 28, personal shadow backed up and redirected). Global file still present; row 28 is the governing record. |
| 7 | mattpocock/skills@resolving-merge-conflicts | keep | unknown | 07-12 global install superseded by the 2026-08-31 project canonical entry (adoption row 32). Global file still present as compatibility entry; row 32 governs. |
| 8 | mattpocock/skills@tdd(refresh) | keep | yes (seam gate observed applied; needs luca confirmation) | In place: seam/tautolog 8 hits in the global tdd SKILL.md; episodic skills_used 4; the seam gate is visibly applied in EP-20260824-144 (blocker: 'TDD public seams … 需用户明确确认'). |
| 9 | mattpocock/skills@teach | watch | unknown | Personal install present; 0 episodic uses; zero framework surface by design. |
| 10 | mattpocock/skills@writing-great-skills(+5 mech 共用落地) | watch | unknown | In place: .claude/skill-os/skill-authoring.md present (1 later commit, 0 reverts); still the doctrine the 2026-09-04 writing-for-agents entry defers to. Doctrine doc has no usage telemetry. |
| 11 | mattpocock/skills@code-review+prove-it-bites(簇C) | keep | yes (usage-level; needs luca confirmation) | In place: code-hygiene/SKILL.md 会咬/双轴 3 hits; code-hygiene 11 episodic uses; the 2026-08-28 code-review facade (row 29) names code-hygiene Mode D as its authority, so this fusion is load-bearing. |
| 12 | mattpocock/skills@diagnosing-bugs(port,GATE-2裁决) | watch | unknown | Ported body not found at the recorded target: /Users/luca/.claude/skills/systematic-debugging/SKILL.md has 0 hits for falsifiab\|DEBUG-\|seam\|hitl-loop; the four mechanisms survive only in CREATION-LOG.md:123-124 and scripts/hitl-loop.template.sh. Functionally superseded by the 2026-08-31 canonical diagnosing-bugs entry (row 31). systematic-debugging had 8 episodic uses (08-11..08-19, before row 31). |
| 13 | mattpocock 队列#10 GAP-registration-sync | keep | yes (tripwire caught real drift at landing) | In place: scripts/check-registration-sync.mjs REG- 12 hits and wired into scripts/verify.sh; the adoption record itself documents a real catch on first run (code-recon missing office-wizard row). |
| 14 | mattpocock 队列#1 to-tickets→task-plan | watch | unknown | In place: task-plan/SKILL.md 竖切/expand-contract 4 hits; task-plan WATCH (1 scene, 0 outputs / 60d); 3 episodic uses, all framework planning sessions. |
| 15 | mattpocock 队列#2 wayfinder→plan-agent | keep | unknown | In place: plan-agent.md fog vocabulary 10 hits incl. the output-contract guard; the 2026-08-31 wayfinder facade (row 34) builds on it; 11 later commits, 0 reverts. |
| 16 | mattpocock 队列#3 to-spec→tech-spec | watch | unknown | In place: tech-spec/SKILL.md seam 6 hits; tech-spec ACTIVE (2 scenes / 1 output); 2 episodic uses. No outcome signal isolating the seam step. |
| 17 | mattpocock 队列#4 grilling+domain-modeling→brainstorm | watch | unknown | In place: brainstorm/SKILL.md facts/术语 5 hits; brainstorm UNMAPPED; 1 episodic use. |
| 18 | mattpocock 队列#5 handoff→handoff-protocol | watch | unknown | In place: references/handoff-protocol.md REDACTED 1 hit; 0 episodic uses. |
| 19 | mattpocock 队列#8 domain-modeling三点 | watch | unknown | PARTIAL REMOVAL. The CLAUDE.md half (术语冲突当场收敛 → inline 写入激活项目 CONTEXT.md 词汇节, 不攒批) was deleted by commit 1a2d878 (2026-09-06, lightweight agent context). No current owner carries it (rg 0 hits in CLAUDE.md/AGENTS.md/office SKILL.md/extraction-bar/runtime); no disposition record in the five agent-context reports (0 hits); A/B logs show the rule only in the baseline arm from protocol 22 on. The extraction-bar half (三条件主动提议门) is still in place (2 hits). Not a harm regression, but an unrecorded reduction of adopted behaviour: needs a human ruling (restore to a one-hop owner vs ratify removal). |
| 20 | mattpocock 队列#7 triage+out-of-scope→muse-req-triage(fork) | watch | unknown | In place: muse-req-triage/SKILL.md 4 hits; UNMAPPED; 0 episodic uses. |
| 21 | mattpocock 队列#9 improve→code-recon(fork-only,母版无此skill) | watch | unknown | In place: code-recon/SKILL.md deletion 1 hit; code-recon 3 episodic uses and 2 outputs / 60d; lens use not isolated. |
| 22 | mattpocock 队列#11 research(reverse-redteam revive)→/quick-research | keep | yes (usage + outputs; needs luca confirmation) | In place; 3 research outputs across projects in the 60d window and 3 episodic uses (07-30..08-11). The skill is in real use. |
| 23 | mattpocock 队列#6 changelog-rationale | keep | yes (convention observably followed) | Convention actively followed: CHANGELOG.md 为什么 19 hits, 30 commits touching CHANGELOG since 2026-07-12. |
| 24 | mattpocock 更新对标 D2 wayfinder decision-ticket 正名 | watch | unknown | In place: plan-agent.md 决策型永不毕业 1 hit; no usage signal for the type gate. |
| 25 | mattpocock 更新对标 D3 grilling environment 放宽 | watch | unknown | In place: brainstorm/SKILL.md Rule 3 tool-sources 3 hits; 1 brainstorm episodic use. |
| 26 | mattpocock 更新对标 D5 improve-codebase-architecture churn 碎片 | watch | unknown | In place: code-recon/SKILL.md churn 1 hit; code-recon 3 episodic uses. |
| 27 | mattpocock/skills@handoff | watch | unknown | Installed 2026-08-28 (13 days): office/handoff/SKILL.md present, installed-pins entry present; 0 episodic skills_used (6 mentions). Too early. |
| 28 | mattpocock/skills@codebase-design | watch | unknown | Installed 2026-08-28: project SSOT present, pin present; UNOBSERVABLE in scene coverage; 0 episodic uses. Too early. |
| 29 | mattpocock/skills@code-review | watch | unknown | Installed 2026-08-28: facade present, pin present; 1 episodic use (EP-20260908-150). Too early. |
| 30 | mattpocock/skills@grilling | watch | unknown | Installed 2026-08-31: present, pin present; 0 episodic uses. Too early. |
| 31 | mattpocock/skills@diagnosing-bugs | watch | unknown | Installed 2026-08-31: present, pin present; 0 episodic uses under this name. Too early. |
| 32 | mattpocock/skills@resolving-merge-conflicts | watch | unknown | Installed 2026-08-31: present, pin present; 0 episodic uses. Too early. |
| 33 | mattpocock/skills@to-spec | watch | unknown | Installed 2026-08-31: present, pin present; 0 episodic uses. Too early. |
| 34 | mattpocock/skills@wayfinder | watch | unknown | Installed 2026-08-31: present, pin present; 0 episodic uses. Too early. |
| 35 | mattpocock/skills@implement | watch | unknown | Installed 2026-08-31: present, pin present, 1 later commit; 0 episodic uses. Too early. |
| 36 | mattpocock/skills@to-tickets | watch | unknown | Installed 2026-09-02: present, pin present, 1 later commit; 0 episodic uses. Too early. Recorded against GAP-issue-tracker-integration as a user override. |
| 37 | mattpocock/skills@wait-what | watch | unknown | Installed 2026-09-03: present, pin present; 0 episodic uses. Too early. |
| 38 | mattpocock/skills@writing-for-agents | watch | unknown | Installed 2026-09-04: present, pin present; 0 episodic uses. Too early. |

review_notes：Coverage 38/38 adoption-log rows (36 distinct ids). Checks run: target existence + mechanism grep; git log on target files since fusion date (0 reverts across all rows); episodic skills_used (index covers only 2026-07-23..2026-09-08, so earlier usage is invisible); scene-coverage report. Uncheckable: outcome attribution (helped never back-filled for any row), usage of global skills outside episodic records, downstream codegraph installs. Two in-place findings need a human ruling: row 19 CLAUDE.md half removed by 1a2d878 without a disposition record; row 12 port body absent from its target SKILL.md (superseded by row 31). Rows 27-38 carry free-text gap_id values that are not gaps-register ids.

</details>

### 2. prior_opportunities_to_adjudicate — 上期（2026-07）opportunities 逐条裁决

证据均为 2026-09-10 gh 实测。

| 候选 | 现状 | 裁决提议 | 理由 |
|---|---|---|---|
| Medusa `Pantheon-Security/medusa` | ★979 / fork 153；默认分支自 07-02 起 0 提交；**AGPL-3.0** | **归档** | AGPL 过不了 permissive-license 安全硬门；「扫描 .claude/ 供应链」这个想法与 FUSION 步①安全扫描、verify 相位的供应链扫描重叠；无 open gap。重启条件：luca 想要自动化审查已装 skill 时，先开 gap |
| obsidian-skills `kepano/obsidian-skills` | ★48,105；最后 push 2026-06-08，**3 个月零提交**；MIT | **归档（框架面）** | 无框架 gap，且已停更。若要给 luca 个人的 Obsidian 知识库选装 → 走模式 1b 单点评估（个人安装，同 teach），不进框架 |
| ECC `affaan-m/ECC` | ★255,534 / fork 38,260；窗口内 ≥100 提交；MIT | **观察** | 与 luca_gstack 同量级的 harness 体系，很活跃；但 7 月标记的 star 异常仍在（8 个月 255k）。本季度对标预算已用完（mattpocock 07-12 全量 + 07-23 窗口复审），Q4 对标目标 gstack（血统上游）更优先。gstack 对标完再看是否值得对照 |
| oh-my-claudecode `Yeachan-Heo/oh-my-claudecode` | ★39,083；窗口内 ≥100 提交；MIT | **归档** | 核心是 teams-first 的并行多 agent 编排，与 luca 现行的「subagent 一律串行」规则正面冲突（本轮就有一个 agent 被 session limit 打断）；无 open 编排 gap |
| OpenViking `volcengine/OpenViking` | ★36,423；**AGPL-3.0** | **归档** | AGPL 过不了许可证门；向量/RAG context DB 与 Memory-light 架构冲突 |
| Hindsight `vectorize-io/hindsight` | ★23,379；窗口内 ≥100 提交；MIT | **观察**（与本轮新机会 claude-mem 配对） | 两个高信号记忆项目连续出现，但 luca 没有 open 的 memory gap。若两者下轮仍在 → 再考虑记忆效果对标或开 gap，本轮不动 |

### 3. addressed_recheck — addressed 复核

**本轮为空（严格按 .js）**：复核条件是 addressed_at 距 RUN_DATE 超过 90 天。最早一批 addressed_at=2026-06-21 的 6 条（behavioral-verification / promotion-deadend / no-rollback / no-feedback-loop / code-layer-constraint / behavioral-ab-tier），在 2026-09-10 时是 81 天。
→ **这 6 条在 2026-09-19 满 90 天，下轮（2026-10）必进复核窗。**

### 4. revisit_due — 重访到期

**本轮为空（严格按 .js）**：唯一带 revisit 条件的 open gap 是 GAP-self-evolution-hardening，其 revisit_status 以 `ADJUDICATED(2026-07-21)` 开头，不以 MET 开头。

**但 2026-07-21 裁决写下的触发条件①现在看起来已经满足，提议重开裁决：** 触发条件原文是「第一条采纳经足够使用周期、AdoptionReview 能给非 too-early 的 helped 判断时 → 落地回填通道」。本轮 AdoptionReview 已经对 5 行给出了非 too-early 的 helped 提议（见上文），2026-06-21 那批采纳也已运行 81 天。
→ 请 luca 裁：是否把 revisit_status 前缀改回 `MET`，并启动「人确认后回填 helped」的通道（复用 evolution-bookkeep + 在 digest 里贴确认命令，不破 propose-only）。本文件不改该字段。

---

## ✅ APPROVED（TOP_DIGEST=3 封顶）：0 条 —— 无

## ⚖️ CONDITIONAL：0 条 —— 无

## ❌ Verify 硬门拒绝：4 条（default-deny：任一硬门非 PASS 即 REJECTED，与 weighted 无关）

| 候选 | gap | weighted | scores (fit/qual/adopt/maint) | 硬门 FAIL | 首条拒因 | pin |
|---|---|---|---|---|---|---|
| Understand-Anything (code -> interactive knowledge graph) `Egonex-AI/Understand-Anything` | GAP-fusion-impact-automation | 73 | 1/3/2/3 | safety, compatibility, non_redundancy, gap_addressed, provenance | gap_addressed: The FM-6 checklist (scripts/fusion-preflight.py:19-24) is about keeping SKILL.md recommended-model in sync with model-routing.yaml and the CLAUDE.md/orchestrator.md snapshots, rules.yaml scoped by skill name, and 5-file routing sync. The candida… | `5feed1f2ce` |
| Graphify (codebase + docs + configs -> queryable knowledge graph) `Graphify-Labs/graphify` | GAP-fusion-impact-automation | 70 | 1/2/3/3 | safety, non_redundancy, gap_addressed | gap_addressed FAIL: scripts/fusion-preflight.py:19-24 lists the FM-6 couplings as string/config values across .md/.yaml files (4-way model consistency, rules.yaml skill-name scoping, 5-file routing sync). Graphify classes .md/.yaml/.yml as DOC (detect.py:45). … | `3f82bf7f83` |
| SkillEvaluator (multi-tier agent-skill evaluation with quality gates) `NVIDIA/SkillEvaluator` | GAP-self-evolution-hardening | 70 | 1/3/2/3 | non_redundancy, gap_addressed | gap_addressed FAIL: the gap is open, but its revisit_status (ADJUDICATED 2026-07-21) names missing input data as the blocker, not missing benchmark tooling. Live check: all 38 adoption-log.jsonl rows lack a real 'helped' value (33 missing, 4 unknown/unknown(ne… | `104ccb7013` |
| skill-eval-harness (paired-variant skill evaluation with trace artifacts) `adewale/skill-eval-harness` | GAP-self-evolution-hardening | 53 | 1/2/1/3 | gap_addressed | gap_addressed FAIL: gaps-register.yaml:106 revisit_status ADJUDICATED(2026-07-21) says the benchmark is deliberately not built because there is no outcome data to feed it: AdoptionReview never writes helped back. The live adoption-log.jsonl now has 38 rows and… | `2297000ffa` |

### Verify 相位的顺带发现（不是采纳项，供裁决与下轮使用）

1. **前提已漂移：07 月「代码图谱在本仓为空」的事实过时了。** 2026-07 digest 击杀 sem 时写的是「0 个 mjs 本地导入」；这次 Graphify 的 verify 实测，现在有 49 个 js/mjs 文件含相对导入（hooks/lib 链）。结论不变——GAP-fusion-impact-automation 真正要看的 FM-6 耦合仍是 md/yaml 里的字符串值，AST 图看不见——但这个 gap 下次评估必须以新事实为前提，不能再引用旧句。
2. **两个独立 verify agent 在不同候选上指向同一个改进点：`memory/scripts/behavioral_ab.py` 的 judge 只做一次判定，且没有噪声区**（difflib delta ≥ ε=0.02 即判）。
   - SkillEvaluator 用三带：≥ +0.05 过、≤ −0.10 败、中间要求加 attempts 重跑。
   - skill-eval-harness 用配对 sign-flip 显著性检验：至少 6 对一致，p=0.03125。
   - 这个改进归属 **GAP-behavioral-ab-tier**（addressed_at 2026-06-21，2026-09-19 满 90 天，下轮进 addressed_recheck），正好是那次复核需要的外部挑战材料。本轮不开 gap、不改文件。
3. **GAP-self-evolution-hardening 的卡点被两个 agent 独立复核，结论一致**：adoption-log 38 行里没有一条真实的 helped 值。外部评测工具再好，也没有数据可喂。这和首节 revisit_due 的提议同向：先落「人确认后回填 helped」的通道，基准以后再说。
4. **Graphify 供应链实证（留档，防下轮重评）**：
   - skill 一被调用就执行不钉版本的 `uv tool install --upgrade graphifyy`；
   - `graphify install` 会往全局 `~/.claude/CLAUDE.md` 追加注册块；
   - `graphify claude install` 会把 PreToolUse Read/Glob/Grep/Bash hooks 合并进 `.claude/settings.json`。
   - 结论：任何形态都不得装进 luca_gstack 或全局。下游代码项目确实需要时，只能用钉版本的 CLI/MCP（`graphifyy==0.9.57` @ `3f82bf7`）。
5. **GAP-fusion-impact-automation：外部代码图谱候选第 7 次被拒，理由每次都是同一个结构性问题。**
   - 历次被拒：CodeGraph（06b，兼容门拒，后仅作下游推荐）、sem 与 CoDD（07 红队击杀）、CodeGraphContext（07 拒）、code-review-graph（07-23 模式 1b 击杀）、Graphify 与 Understand-Anything（本轮拒）。
   - 这个 gap 点名的三类 FM-6 耦合，都已经有确定性检查（本轮只读核对了代码，不是只看文档）：
     - SKILL.md `recommended-model` ↔ model-routing.yaml：`memory/scripts/daily_governance.py:481-524 check_model_routing()`。注意它是每日 digest 探测器，不是阻断门；FUSION 步⑤会调用它。
     - rules.yaml 按 skill 名 scope：`scripts/check-routing-map.mjs:296-313` SSOT-9（verify S10）。
     - 路由登记面同步：`check-routing-map` + `check-registration-sync`（verify S10/S19）。
   - verify-4 建议「在 fusion-preflight 加一个 grep/yaml 值比对」，与上面这些既有检查重叠，不必另建。
   - 真正还开放的只有「未登记的隐式耦合发现」（07 月红队击杀 CoDD 时已点明）。外部代码图谱工具在结构上看不见这类耦合，继续按原表述每月搜索只会重复同一个拒绝理由。→ 见裁决第 12 项。

## 💡 opportunities（本轮新发现 5 条，无 gap 映射，下轮进 prior 裁决）

| 候选 | 信号 | 初步建议 |
|---|---|---|
| gstack `garrytan/gstack` | ★132,360 / fork 19,801；窗口内 66 提交；MIT | **对标深评（BENCHMARK-RUNBOOK 模式 2，Q4 候选）**。[INFERENCE] 很可能是 luca_gstack 的血统上游：careful 源注记写「gstack careful」，challenge 写「gstack plan-ceo-review」，repo 描述也含 CEO 角色工具。它不在 benchmark-registry，从未建过对标基线 |
| claude-mem `thedotmack/claude-mem` | ★93,604 / fork 8,230；Apache-2.0 | 观察（与 Hindsight 配对，是 governed episodic→semantic 记忆的对照点） |
| archify `tt-a1i/archify` | ★56,747；MIT；star 增速异常 | 观察（可验证的架构/时序图 skill，可能服务 tech-spec / code-recon 出图） |
| loop-engineering `cobusgreyling/loop-engineering` | ★11,136；创建于 06-09；MIT | 观察（与 Loop 宪法四原语对照；由 S4 的 design system 查询带出，属跨域命中） |
| Astryx `facebook/astryx` | ★12,878；MIT | 归档倾向（按契约，品牌/设计权威来自当前项目，无框架 gap） |

未重复登记：上期 6 条机会本轮又被搜到，已在首节裁决，不重复写 candidate-log，防止同一批仓库永远在循环里被重复裁决。

## 场景覆盖报告（`python3 scripts/check-skill-scene-coverage.py`，2026-09-10 原样）

```text
窗口 60 天 · 阈值 3（初始值待校准） · 项目 14 个

skill                     scene  output  判定
auto                          -       0  EXPERIMENT（截流实验观察中，output=窗口内 episodic 使用数；到期 2026-10-02 复盘，判据与混杂因素见 TABLE 注释）
brainstorm                    -       0  UNMAPPED（代理口径未定，不判）
code-hygiene                  -       0  UNMAPPED（代理口径未定，不判）
code-recon                    -       2  UNMAPPED（代理口径未定，不判）
code-review                   -       0  UNOBSERVABLE（场景不落盘；命中靠语义兜底 + session-restore kit→synthesis 接力提醒，不判）
codebase-design               -       0  UNOBSERVABLE（场景不落盘；命中靠语义兜底 + session-restore kit→synthesis 接力提醒，不判）
deepresearch                  -       4  UNMAPPED（代理口径未定，不判）
design-brief                  0       3  ACTIVE
diagnosing-bugs               -       0  UNOBSERVABLE（场景不落盘；命中靠语义兜底 + session-restore kit→synthesis 接力提醒，不判）
grilling                      -       0  UNOBSERVABLE（场景不落盘；命中靠语义兜底 + session-restore kit→synthesis 接力提醒，不判）
handoff                       -       0  SESSION-TOOL（项目无关、OS 临时产物不入库；output=窗口内 episodic 使用数）
html-prototype                3       2  ACTIVE
idea                          -       0  UNMAPPED（代理口径未定，不判）
implement                     -       0  UNOBSERVABLE（场景不落盘；命中靠语义兜底 + session-restore kit→synthesis 接力提醒，不判）
insight-synthesis             -       0  UNOBSERVABLE（场景不落盘；命中靠语义兜底 + session-restore kit→synthesis 接力提醒，不判）
muse-loop-orchestrate         0       0  NO-SIGNAL（窗口内场景未发生，不得处置）
muse-req-triage               -       0  UNMAPPED（代理口径未定，不判）
open-design                   3       2  ACTIVE
quick-research                -       3  UNMAPPED（代理口径未定，不判）
research-kit                  0       1  EXEMPT（低频声明豁免①，白名单+声明双确认）
resolving-merge-conflicts      -       0  UNOBSERVABLE（场景不落盘；命中靠语义兜底 + session-restore kit→synthesis 接力提醒，不判）
task-plan                     1       0  WATCH（窗口内场景仅 1 次，样本不足）
tech-spec                     2       1  ACTIVE
to-spec                       -       0  UNOBSERVABLE（场景不落盘；命中靠语义兜底 + session-restore kit→synthesis 接力提醒，不判）
to-tickets                    -       0  UNOBSERVABLE（场景不落盘；命中靠语义兜底 + session-restore kit→synthesis 接力提醒，不判）
ux-audit                      2       0  WATCH（窗口内场景仅 2 次，样本不足）
ux-brainstorm                 0       1  ACTIVE
ux-research                   -       1  UNMAPPED（代理口径未定，不判）
ux-writing                    3       1  EXEMPT（低频声明豁免①，白名单+声明双确认）
wait-what                     -       0  UNOBSERVABLE（场景不落盘；命中靠语义兜底 + session-restore kit→synthesis 接力提醒，不判）
wayfinder                     -       0  UNOBSERVABLE（场景不落盘；命中靠语义兜底 + session-restore kit→synthesis 接力提醒，不判）
writing-for-agents            -       0  UNOBSERVABLE（场景不落盘；命中靠语义兜底 + session-restore kit→synthesis 接力提醒，不判）

只报告不处置；任何 DORMANT 判定的处置（降级为隐藏）都须人工裁决。
```

判定汇总：**无 DORMANT-WITH-SCENES / DORMANT? 判定**，没有需要处置的条目。ux-audit（场景 2 次 / 产出 0）与 task-plan（场景 1 次 / 产出 0）为 WATCH，样本不足。auto 截流实验在 2026-10-02 到期复盘。

## 渠道备注（薄面如实）

- **S1-github-stars**：9 registry queries (<=2 words each, stars sort, 18-month push window) + 5 hub deep-dives with window compare since 2026-07-02 + 10 supplemental open-gap keyword queries. Hub deltas: obra/superpowers 63 commits, 14 SKILL.md modified (incl. verification-before-completion and systematic-debugging, both ported into luca units); anthropics/skills +academy-guide +discernment-nudge; wshobson/agents +36 skill/agent files; VoltAgent subagents +4; vercel-labs 39 commits. Six prior opportunities re-surfaced (ECC, oh-my-claudecode, OpenViking, Hindsight, Medusa, obsidian-skills): adjudicated in the prior-opportunities section, not re-logged. Dropped at discovery: andrej-karpathy-skills (same four principles already inline as K9), rules-sync class (ai-rules-sync, OpenPackage; rulesync kill precedent), AST code-graph class (codebase-memory-mcp, roam-code, gograph, SocratiCode AGPL; kill precedent x3), guardrail repos under 100 stars. Thin: soft-enforcement, routing-fragmentation, issue-tracker and decision-questionnaire returned nothing above noise.
- **S2-anthropic-platform**：Claude Code CHANGELOG diffed 2.1.199 -> 2.1.267 (58 versions). Built-in platform features are not adoptable candidates (proprietary); recorded as platform notes: /skill-doctor (unused skills + context cost) overlaps check-skill-scene-coverage -> native_precedence review; skill/command frontmatter model: and effort: now honored; Workflow agent({schema}) rejects unsatisfiable schemas; SubagentStart hook context; --permission-prompts none; managed skillOverrides and Skill() deny rules. MCP spec 2026-07-28 released final (closes the July digest's RC follow-up; no open gap maps). claude-cookbooks: dynamic workflows (08-03), Managed Agents budgets/advisor/repo skills (08-06), scheduled repository reviewer (09-03). New anthropics repos (commerce-agents, oncall-kit, k12-teacher-skills) map to no gap. anthropics/skills new members dropped as existing repo.
- **S3-agent-frameworks**：hubs langgraph 1.2.11 / promptfoo 0.123.0 / deepeval 4.2.0 released in window (prior rejections vs behavioral_ab.py still stand, not re-surfaced); letta no releases; openai/swarm stale (last push 2026-04-15). Searches (agent memory / llm eval / agent orchestration / self-improving agent, plus skill eval / agent benchmark supplement) produced two eval-harness pattern candidates for GAP-self-evolution-hardening; Human-Agent-Society/reef (905 stars, created 2026-08-31) not shortlisted: star anomaly.
- **S4-design-craft**：hubs active (style-dictionary v5.5.1-5.5.3, shadcn 4.19-4.21, tokens-studio figma-plugin). GAP-design-methodology-review was addressed 2026-07-21, so S4 feeds no open design gap (the only open skills-dimension gap is decision-questionnaire). Only off-domain opportunities surfaced (loop-engineering via 'design system', astryx). google-labs-code/design.md (06b CONDITIONAL) and awesome-design-md seen, not re-logged.

## 源门禁 / 登记表健康（提议，均为人裁）

1. **sources-registry 复核逾期**：`updated: 2026-07-14` + `review_after_days: 35` → 2026-08-18 已到期，逾期 23 天。建议按本轮渠道备注复核 queries 与 hubs。
2. **S4-design-craft 现已无对口 open gap**：GAP-design-methodology-review 已于 07-21 addressed，S4 只能靠 skills 维度挂在 GAP-decision-questionnaire 上，而那条与设计工艺无关。本轮 S4 只产出了跨域机会。建议裁：降权 / 暂停 / 合并进 S1，或者先为设计工艺开新 gap 再保留。streak 见统计节。
3. **GAP-issue-tracker-integration 两个结构问题**：
   - 它的维度是 `infrastructure`，没有任何 active 源 feeds 这个维度，发现通道对它是盲的。
   - 2026-09-02 已作为「user override」采纳了 to-tickets facade（本地 markdown 或经批准的 tracker）来对口这个 gap。
   → 建议裁：改 addressed（范围收窄为 facade）、保持 open，还是关闭。
4. **adoption-log 的 gap_id 口径漂移**：row 27-38 的 gap_id 是自由文本（如 `routing-to-unreachable-skill`），不是 gaps-register id，adoption→gap 的反查因此断开。建议规定：非 register id 统一写 `n/a(<理由>)`，与 07-12 批次口径一致。
5. **candidate-log 的 Graphify 行 repo=`unverified`**（2026-07-05 backfill）：本轮已解析出 `Graphify-Labs/graphify`，verify 证实就是同一个项目（`code-recon/SKILL.md:146` 早就把 Graphify 列为可选的更重的替代方案，`candidate-log.jsonl:60` 是当时的拒绝记录）。本轮 bookkeep 会追加一条带真实 repo id 的 REJECTED 行，此后 183 天的 TTL 拉黑可以正常生效。旧的 `unverified` 行作为历史保留，是否补注由 luca 决定，不是必须。
6. **平台原生能力对照（native_precedence）**：Claude Code 新增 `/skill-doctor`（显示未使用的 skill 及其 context 成本），与 `check-skill-scene-coverage.py` 的「使用即留任」信号部分重叠。建议下次场景覆盖复盘时并列对照：原生能力覆盖得了的部分退场，覆盖不了的（场景代理计数）保留。

## 执行偏差（如实记录）

- **没有 Workflow 工具**，六个 phase 内联执行：
  - Load / AdoptionReview / Discover / merge 由主循环跑确定性脚本完成。
  - merge/dedup、`adjudicate()`、红队应用层过滤和返回结构，都执行**从 .js 原文正则抽取的代码**（scratchpad `merge.js` / `assemble.js`），不是手抄，所以口径零漂移。抽取链路先用空 verdict 做了阳性对照：G1 正确判 INCOMPLETE，bookkeep 以 exit 3 拒登记。
- **Intake**：sweep 模式在 .js 里没有 Intake agent（Intake 只存在于 punctual 分支），merge/dedup 就是本轮的 intake。
- **Verify / Redteam**：冷启动 general-purpose subagent，**串行**、每个候选一个，prompt 由 `verifyPrompt()` / `redteamPrompt()` 原文生成；model 省略即继承（model-routing `dispatch_rules.workflow_tool`）。
- **Discover 的执行者只有一个**（串行规则下没开 4 个并行 channel agent）：共 23 次 gh search（9 条 registry 查询 + 4 条 S3 + 4 条 S4 + 10 条 gap 关键词补充）加 12 个 hub/官方面探针。发现者和各 verify agent 是不同上下文，verify 层的独立性保持不变。
- **loader 自查修正**：首次抽取 vetting-registry 只拿到 17/21 个 repo id（要求严格 owner/repo 形态），merge 前已按 owner/repo 归一化重抽，existing_repos 从 54 变成 58。
- **限额中断**：verify-1 agent 被 API session limit 打断，恢复后续跑。被打断的那次不计票（缺票轮不算完成轮）。
- project-scope hook 拦截了两类 Bash 调用：一类用 `$VAR` 间接引用路径（报错原文明示，属设计内防护）；另一次是内联候选数据的 node heredoc，被以「NO_PIN 不能操作共享 docs/state/topic」拦截（确切触发条件见下行）。之后数据一律先 Write 进 scratchpad，Bash 只跑绝对路径脚本，未再被拦。
  - 触发条件核对（只读）：拦截来自 `project-scope-guard.mjs:941-945` 的 `r.hasScoped && !binding` 分支，即路径改写器把命令里的某个 token 认成了共享 scoped 路径。按该处注释，这是有意的保守设计（shell 字符串里难以可靠区分读和写）。
  - 我先假设的「含 docs 字样就拦」已被证伪：纯文本 `echo 'its docs, SQL schemas'` 不会被拦。
  - 具体是哪个 token 触发的没有继续隔离——它不影响本任务，所在区域又是隔壁 session 在修的 hooks，所以不定性为缺陷、不另立 audit。

## 裁决状态（请 luca 裁）

**本轮 APPROVED 0 / CONDITIONAL 0 → 没有采纳提议，FUSION-RUNBOOK 不启动。** 4 个 gap 对口候选全部在 Verify 硬门被 default-deny 拒绝。weighted 分数在 53-73 之间，如果只看分数，有 3 条会过 70 线——拦下它们的是硬门，不是分数。红队池为空，Redteam 相位按 .js 语义派发 0、fallback 0；run_status=COMPLETE。

请 luca 裁决以下各项（全部 propose-only，本轮没有改动任何行为面或 register 判断字段）：

| # | 事项 | 选项 | 我的建议 |
|---|---|---|---|
| 1 | row 19：CLAUDE.md 的「术语冲突当场 inline 写入 CONTEXT.md 词汇节」规则，被 `1a2d878` 无记录删除 | A 恢复到某个 one-hop owner / B 追认删除（补 adoption-log 记录） | 先确认 1a2d878 是否有意为之；若无意，选 A（按「未经允许不缩减既有逻辑」原则） |
| 2 | row 12：systematic-debugging 的 port 正文不在落点 | A 在 adoption-log 标 superseded-by row 31 / B 查清正文去向 | A（功能已由 canonical diagnosing-bugs 承接） |
| 3 | GAP-self-evolution-hardening：revisit_status 前缀是否改回 `MET`，并启动 helped 人确认回填通道 | 是 / 否 | 是（触发条件①已可评估，两个 verify agent 也独立确认卡点就在这里） |
| 4 | helped 回填提议 6 行（code-hygiene×2 / tdd / quick-research / registration-sync / changelog） | 逐行确认 / 否 | 确认为「yes（使用层）」，并与第 3 项的通道一起落 |
| 5 | 上期 opportunities 6 条：归档 4（Medusa / obsidian-skills / oh-my-claudecode / OpenViking），观察 2（ECC / Hindsight） | 按提议 / 逐条改 | 按提议 |
| 6 | gstack（`garrytan/gstack`）立为 Q4 对标深评目标（BENCHMARK-RUNBOOK 模式 2，含 benchmark-registry 建行） | 立项 / 观察 / 否 | 立项（血统上游，从未建基线，窗口内 66 次提交） |
| 7 | S4-design-craft：已没有对口的 open 设计 gap（本轮后 zero_yield_streak=1） | 降权 / 暂停 / 合并进 S1 / 先开设计工艺新 gap | 暂停到出现新的设计类 gap 为止 |
| 8 | GAP-issue-tracker-integration：09-02 已用 to-tickets facade 对口（user override），且没有任何 source 喂 infrastructure 维度 | addressed（收窄为 facade）/ 保持 open / 关闭 | addressed（收窄），addressed_at=2026-09-02 |
| 9 | sources-registry 复核（逾期 23 天） | 本月做 / 下轮做 | 本月做，参考本轮渠道备注 |
| 10 | adoption-log 的 gap_id 口径：非 register id 统一写 `n/a(<理由>)` | 采纳 / 否 | 采纳（row 27-38 回填口径） |
| 11 | `/skill-doctor`（原生）与场景覆盖报告的 native_precedence 对照 | 下次场景覆盖复盘时做 / 否 | 与 auto 截流实验 10-02 复盘一起做 |
| 12 | GAP-fusion-impact-automation：第 7 次候选全灭，且点名的三类耦合都已有确定性检查 | A 收窄 statement 为「未登记的隐式耦合发现」，并写明已由哪些检查覆盖 / B 转 deferred / C 保持原样 | A——防止下轮继续按原表述去搜代码图谱工具 |
| 13 | 发布状态 | — | **push 暂缓，本地已提交。** 仓库门 `bash scripts/verify.sh` 结果 PASS 92 / FAIL 2，两项红灯都不是本任务造成的：① **C20** `test:project-transaction`：我改动任何文件之前的基线就是红的，被测代码最后改于 ba4764a / 9cb54cf（09-09）；② **C11** `check:hooks`：失败断言在 `scripts/test-hooks.mjs:1022`，正好落在隔壁 session 未提交的新增段 981-1064 里（该文件 05:16 被改，本 digest 05:21 才落盘）。两项都属于隔壁 lucagstack-0c 正在修的 attestation/hooks 区域，本任务禁碰。按 framework-maintenance「仓库门没闭合就不发布」，所以没有 push。本地 commit 用了 pre-commit 自带的 `FAST_COMMIT=1`（该钩子写明适用于「与框架逻辑无关的审计记录/文档」；本次三个文件是 digest + 簿记数值，没有任何逻辑；密钥扫描照常执行），没有用 `--no-verify`。**解锁条件**：隔壁修复落地 → verify.sh 全绿 → `git fetch upstream` 确认快进 → `git push upstream main`。**请裁**：A 等修复落地后再推 / B 现在就推（这两项红灯上游已经存在，推送不会让它变得更糟） |
