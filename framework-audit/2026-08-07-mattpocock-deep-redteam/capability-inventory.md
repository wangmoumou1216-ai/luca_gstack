# mattpocock-derived live capability inventory — freeze R1

> 状态：`ROUND-1 CANDIDATE`，不是握手结论。分母从 21 条 adoption-log 记录向外展开；
> 复合记录拆成 47 个可独立失败的行为单元。任何红队发现漏项，必须扩分母并重新冻结。
>
> 基线来源：`mattpocock/skills@391a2701dd948f94f56a39f7533f8eea9a859c87`；
> MP-032、MP-036、MP-045 的增量来源为 `ed37663cc5fbef691ddfecd080dff42f7e7e350d`。

## A. 原样安装 / refresh（12）

| ID | 原子行为 | 上游真值 | 当前落点 | Round-1 前置状态 |
|---|---|---|---|---|
| MP-001 | TDD red→green 与 vertical slice 主循环 | `tdd/SKILL.md` | `~/.agents/skills/tdd/SKILL.md`；Claude 软链 | 双端 catalog 可见；本轮未做行为 mutation，`UNKNOWN-LIVE` |
| MP-002 | 写测试前与用户确认 seam | `tdd/SKILL.md` | 同上 | 静态存在；Codex/Claude 人类门行为待复核 |
| MP-003 | 行为测试、独立 expected value、反 tautological | `tdd/tests.md` | `~/.agents/skills/tdd/tests.md` | 内容与 pin blob 一致；行为采用待复核 |
| MP-004 | 只在系统边界 mock、DI 与 SDK-style interface | `tdd/mocking.md` | `~/.agents/skills/tdd/mocking.md` | 内容与 pin blob 一致；行为采用待复核 |
| MP-005 | deep-module 八词词汇与 deletion test | `codebase-design/SKILL.md` | `~/.claude/skills/codebase-design/SKILL.md` | **BLOCK**：route 同时面向 Codex，但 Codex catalog 无该 skill |
| MP-006 | deepening 的 dependency taxonomy 与 replace-don't-layer tests | `codebase-design/DEEPENING.md` | `~/.claude/skills/codebase-design/DEEPENING.md` | **BLOCK**：与 MP-005 同一 dangling 入口 |
| MP-007 | Design It Twice：3+ 并行 subagents | `codebase-design/DESIGN-IT-TWICE.md` | `~/.claude/skills/codebase-design/DESIGN-IT-TWICE.md` | **BLOCK**：本地仍写死 `Agent tool`；Codex 未适配 |
| MP-008 | merge/rebase 冲突按 primary-source intent 解每个 hunk | `resolving-merge-conflicts/SKILL.md` | `~/.claude/skills/resolving-merge-conflicts/SKILL.md` | **BLOCK**：route 面向 Codex、catalog 缺失 |
| MP-009 | 冲突后检查、stage、commit/continue；永不 abort | 同上 | 同上 | **BLOCK**：自动 stage/commit 与 `never --abort` 越过用户工作保护/逃生权 |
| MP-010 | 多 session 教学工作区：MISSION/ZPD/learning records | `teach/SKILL.md` + formats | `~/.claude/skills/teach/**` | personal 单端豁免有记录，但 Codex 适用边界未明确；`MAJOR` |
| MP-011 | primary-source 资源、知识/技能/智慧分层 | 同上 | 同上 | 内容精确；网络/社区建议与来源校验行为 `UNKNOWN-LIVE` |
| MP-012 | 自包含 HTML lesson + reusable assets | 同上 | 同上 | 会向当前目录写多文件/打开 GUI；无项目 pin 适配，`MAJOR` |

## B. `writing-great-skills` → 本地 authoring doctrine（6）

当前落点均为 `.claude/skill-os/skill-authoring.md`，并由 CLAUDE/AGENTS/RUNBOOK 指针消费。

| ID | 原子行为 | Round-1 前置状态 |
|---|---|---|
| MP-013 | Predictability 作为根德性 | 静态存在；A/B 历史票存在 |
| MP-014 | context load / cognitive load 与 invocation 取舍 | 静态存在；Codex frontmatter 语义不能照搬，待双端复核 |
| MP-015 | information hierarchy / progressive disclosure / co-location / sprawl | 静态存在；pointer 可达性待 mutation |
| MP-016 | completion criterion / premature completion | 静态存在；行为 adoption 待 replay |
| MP-017 | leading word + `_Avoid_` 语言收敛 | 静态存在；行为 adoption 待 replay |
| MP-018 | SSOT / relevance / pruning / no-op / negation | 静态存在；当前仅 skill 范围，新增 G3a 正攻击其扩域必要性 |

## C. `code-review` + prove-it-bites → code-hygiene（3）

当前落点 `.claude/skills/office/code-hygiene/SKILL.md`。

| ID | 原子行为 | Round-1 前置状态 |
|---|---|---|
| MP-019 | Standards / Spec 两轴隔离审查 | 双端同一 skill body 可见；Claude `Agent` 语义与 Codex dispatch 待行为复核 |
| MP-020 | Fowler smell baseline 且 repo rule 覆盖 | 静态存在；judgement-call 约束待样例复核 |
| MP-021 | 护栏必须展示 fail→pass→exit/output 的“会咬”证据 | 历史 A/B PASS；本轮 verifier 自身已出现假 FAIL，机制执行一致性待复核 |

## D. `diagnosing-bugs` → systematic-debugging（4）

当前落点 `~/.agents/skills/systematic-debugging/**`，Claude 由软链消费。

| ID | 原子行为 | Round-1 前置状态 |
|---|---|---|
| MP-022 | 3–5 条排序、可证伪假设 | 双端可见；历史 A/B PASS |
| MP-023 | `[DEBUG-*]` 探针纪律与 hypothesis↔probe 映射 | 双端可见；静态存在 |
| MP-024 | 正确 test seam；无 seam 本身是 finding | 双端可见；静态存在 |
| MP-025 | HITL reproduction loop | **BLOCK**：脚本原样回显 `ERROR_MSG`；正文 `env | grep IDENTITY` 与 `${IDENTITY:+SET}${IDENTITY:-UNSET}` 可泄值 |

## E. 其余 merge / port（22）

| ID | 原子行为 | 当前落点 | Round-1 前置状态 |
|---|---|---|---|
| MP-026 | registration-sync：route/command/skill 三面同步 tripwire | `scripts/check-registration-sync.mjs` + verify S19 | 当前 21 skills 全绿；只证明登记一致，不证明执行 |
| MP-027 | tracer-bullet vertical slices | `task-plan/SKILL.md` | 静态存在；双端行为待 replay |
| MP-028 | wide refactor expand→migrate batches→contract | 同上 | 静态存在；宽面 fixture 待 replay |
| MP-029 | blockers/frontier 与 fork-only 来源节点豁免 | 同上 | 静态存在；并行语义待双端复核 |
| MP-030 | fog-of-war / frontier / destination 规划词汇 | `.claude/agents/plan-agent.md` | 计划代理本体仍含 Claude model/Agent 语义；Codex 由 TOML adapter 代偿程度待复核 |
| MP-031 | fog 毕业判准 + output-contract guard | 同上 | 历史 A/B PASS；双端结构化输出待复核 |
| MP-032 | decision ticket 不得毕业为 autonomous execution | 同上 | 07-23 merge；静态存在 |
| MP-033 | spec-time seam 前置确认门 | `tech-spec/SKILL.md` | Ask/headless 分支存在；Codex widget 降级待复核 |
| MP-034 | facts 自查、decisions 留给人 | `brainstorm/SKILL.md` | 静态存在；human gate 承重 |
| MP-035 | 术语定案即持久化 | `brainstorm/SKILL.md` + `CLAUDE.md` | 项目 pin/候选门边界待复核 |
| MP-036 | 事实源含 filesystem/tools/web，不只静态文档 | `brainstorm/SKILL.md` | 07-23 merge；Codex 仍以 `task()` 缺失降级成内部顺序推理，未利用真实 subagents |
| MP-037 | handoff 文档源头脱敏 | `references/handoff-protocol.md` | 只保护持久 handoff，不保护 raw debug transcript |
| MP-038 | handoff 不复制既有产物 + suggested skills | 同上 | 模板存在；写法仍示例 `cat >`，与 Codex apply_patch 约束冲突 |
| MP-039 | 领域术语定案当场写入项目 CONTEXT | `CLAUDE.md` | 项目 pin 守卫是前置条件；Codex 等价强制待活测 |
| MP-040 | 三条件满足时主动提议 ADR/decision | `extraction-bar.md` | 静态存在；human gate 不得自动落笔 |
| MP-041 | triage 先验证 claim 再 grill | `muse-req-triage/SKILL.md` | fork-only，行为待场景复核 |
| MP-042 | redundancy scan：已实现请求单独处理 | 同上 | 静态存在；语义检索覆盖待复核 |
| MP-043 | prior-rejection ledger 防重议 | 同上 | 静态存在；与 gaps/vetting 边界待复核 |
| MP-044 | deletion test / deepening 透镜 | `code-recon/SKILL.md` | 依赖 MP-005 词汇但 Codex 无对应 catalog；`MAJOR` |
| MP-045 | 有方向面以 churn 富化候选 | 同上 | 07-23 merge；静态存在 |
| MP-046 | right-sized primary-source quick research | `quick-research/SKILL.md` + 七登记面 | 当前 routing/registration 绿；联网/落盘行为待双端复核 |
| MP-047 | lifecycle change 同时记录“变更 + 为什么” | `CHANGELOG.md` 头部约定 | 文档约定；A/B 豁免，执行一致性只能审计历史条目 |

## 外联孤儿与范围裁决

- `codebase-design`、`resolving-merge-conflicts`：治理记录 + route 存在，Codex 执行目标缺失，属于确定 orphan。
- `teach`：不能因“personal”从分母消失；需要明确“Claude-only personal install”是否是有意豁免，以及它是否允许在任意 cwd 写教学工作区。
- `systematic-debugging`：installed-pins 标为 local mods；任何 refresh 都必须做 source-aware merge，不能覆盖。
- 历史明确 REJECT/DEFER 且当前无 live 行为的上游单元不纳入 MP 分母，进入最终计划的 exclusion ledger；上游成熟度变化不自动重开本地需求门。

<!-- FILE_END: capability-inventory.md -->
