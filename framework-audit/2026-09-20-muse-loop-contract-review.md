# Muse Loop retirement — independent contract/scope review

日期：2026-09-20。范围：NO_PIN，当前 checkout。立场：default-REFUTE。

## 判定

**PASS（本报告限定的合同、范围与引用审查）。** BLOCKER 0 / MAJOR 0 / MINOR 0。

未发现为了“删干净”而删除独立 triage、独立原型 judge 或共享设计/工程门禁的证据。该结论不是整项退役的运行时验收通过：本审查真实执行了 EARS stdin 分区和历史对象恢复核对，没有重新调用完整 triage/judge 模型流程，也没有对 hook/trust/QA 运行时做全套复验。

审查依据为 `framework-audit/2026-09-20-muse-loop-retirement-plan.md` 的 R-1/R-2 及其保留/删除边界；比较源固定为 `/private/tmp/muse-loop-retirement.GUKnA2/baseline/` 的同路径文件，**不是 HEAD diff**。未读取历史 redteam 报告或其他评审者结论。使用 `writing-for-agents` 的指针、消费者、完成条件与权限归属审查方法；未执行被审 skill 的生产 preamble。

## 精确审查集

- `.claude/skills/office/muse-req-triage/SKILL.md`
- `.claude/agents/muse-proto-judge.md`、`.codex/agents/muse-proto-judge.toml`
- `.claude/agents/plan-agent.md`、`.claude/agents/preflight-agent.md`
- `.claude/skill-os/routing-chain-check.md`、`skill-authoring.md`
- `.claude/skill-os/input-modes.yaml`、`skill-routing-map.yaml`、`skill-visibility.json`、`model-routing.yaml`、`codex-viability.yaml`
- `.claude/skill-os/generated/skill-catalog.md`、`.claude/skill-os/evolution/self-model.generated.yaml`、`self-model.yaml`
- `.claude/skills/office/references/office-wizard.md`、`html-prototype-tokens.md`
- `.claude/skills/office/{auto,code-recon,tech-spec}/SKILL.md` 中的 Loop 例子
- `U-REGISTER.md`、`scripts/launchd/com.luca.memory-governance.plist` 的文档指针
- 已删除的 `muse-loop/`、`constitution.md`、`traceability.md`、`specs/README.md`、`corpus/README.md`、两个 Loop skill/aliases/command、`scripts/check-muse-loop-sync.mjs`

补充只读核对：`eval-methodology.md` 的存活 judge 引用、`scripts/check-ears-syntax.mjs`、退役回归脚本中的共享锚点覆盖。`eval-methodology.md` 的 GEPA 行变化以及其他 self-growth/template 并发变化不归入本次退役，不作本任务 finding。

22 个现存主审文件，按上列顺序（auto、code-recon、tech-spec 分别展开）将每个 `path + NUL + sha256(content) + LF` 串接后的摘要：

`c098751cbdbf0b60d6fe997571a821e728ce95e71b73225f159db2476a72127c`

该摘要绑定审查时版本；后续对这些目标的实质改动需重新闭合。

## 承重语义反证结果

| 攻击点 | 判定 | 证据与边界 |
|---|---|---|
| 删除 constitution 导致 triage 丢失真伪/排序边界 | PASS | triage:32–43、70–77 保留“可回溯为必要非充分”、未知不补造、人类裁定、不得伪造 RICE/单一排序分数；对照 baseline constitution §4/§5 无独立语义遗失。 |
| 删除 extraction/schema 导致结构化候选绕门 | PASS | triage:54–66 明确原始/结构化输入都走来源核查、信号与人工门；三铁律、来源定位、requirement/open_question、design_reference 与 source_trace 的区别、greenfield 人裁及真实采集时间均保留。:40–43 保留历史需求/同场陈述/已上线行为/none 及比较结果，不把历史 PRD 当实现证据。 |
| 去掉 Loop GATE-1 时误删人类裁定 | PASS | triage:92–104 逐项呈现与真实等待仍是硬门，defer/reject 也不能由机器终局；无结构化工具改用普通问题。plan-agent:556 保留不可跳过 triage 人类裁决门。删除的是 Loop 调用身份/状态机，而非该门。 |
| 产出简化绕过 brainstorm 信任边界 | PASS | triage:108 仅人类接受的 requirement 输出“陈述+来源”，不自动启动；:112 保留 proxy→confidence 防火墙；:116–126 保留 verified pin、无 pin 不读写台账、人裁拒绝、概念去重与已实现需求不得污染 rejected-reqs。 |
| judge 被删或退化为通用 UX 评审 | PASS | 两 harness 文件、model-routing 的 Claude/Codex 档位、self-model agents 项均保留。judge:18–36 保留冷启动、只接原型+AC、只读/不自动修复及不替代 ux-audit；:44–70 保留来源强弱、当前 deterministic 证据核对、逐条覆盖、PARTIAL 与四类偏见控制。去掉的仅是 Loop 轮次/状态/专属落盘。 |
| 删除 constitution 破坏 judge 的 AX 标尺 | PASS | judge:19 直接指向仍存在的 AI framework/state/taste 三份共享参考与 html-prototype-tokens；与 baseline constitution §2/§3 指向一致，未新造标准。未提供实际 DS 时不伪造合规。 |
| 删除 Loop 同时削弱共享 Plan/Human/工具选择门 | PASS | plan-agent 相对 baseline 仅删 Loop 条件2豁免及解释，其他四项名单与主门未变；routing-chain-check:62 保留两轮停止上限，:85 保留 headless seam 原则；tech-spec:184 只去示例，条件化 seam 确认仍在；office-wizard 的工具选择/不可自动 fallback 合同未变。 |
| 退役登记变成自动接班流程 | PASS | visibility:25–36 两 tombstone 的 replacement 为 JSON null，明确不得自动替代；catalog:68–69 输出 none 且位于 retired/unavailable，不再给可调用 authority 链接。preflight:96–97 明确 FAIL、不可跳过且 judge 不在名单。input-modes/routing/model/viability 中只删除两个专属能力与 triage 的 Loop workflow 入口；独立 triage 保留。 |
| 删 checker 等于删共享 QA 门 | PASS（静态范围） | baseline checker 混有 Loop 同步与共享状态锚点；当前 tokens 相对 baseline 只删消费者名，AI 七态/reduced-motion 完整保留，html-prototype 本体不属本次修改。`test-muse-loop-retirement.mjs:184–191` 接回 AI Slop、DECISION、七态与 reduced-motion 锚点。这证明覆盖声明迁移，不证明浏览器行为已通过。 |

## 删除范围与悬空引用

对以下 11 个目标使用 `lstatSync`（不跟随 symlink）逐项确认 ENOENT：`muse-loop/`、`constitution.md`、`traceability.md`、`specs/README.md`、`corpus/README.md`、`scripts/check-muse-loop-sync.mjs`、两个 `.claude/skills/office/` 专属目录、`.claude/commands/muse-loop-orchestrate.md`、两个 `.agents/skills/` aliases。独立 triage alias 仍可解析。

baseline 根 `traceability.md` 明确只定义格式，真实矩阵在项目内；两个 README 明确根 specs/corpus 非实际落点。删除这些定义/说明不等于删除项目实例。本审查未遍历 `docs/` 或任何真实 corpus/project 内容，因此不以此宣称已审计所有项目数据；只确认获审目标没有要求删除项目实例的新增行为。

在 `.claude/`、`.codex/`、`.agents/`、`scripts/` 及相关根入口扫描旧 capability/owner 名称后，存活命中为：退役拒绝/tombstone/回归反例、固定 Git 历史指针、日期化 evolution digest。未发现仍作为当前必读 owner 的已删路径。`figma-demo/references/builder-constitution.md` 是不同的存活文件，不误算为被删根 constitution。README/self-model 的原生 loop、schedule 和通用迭代概念未被误删。

launchd 仅把 obsolete architecture 文档指针改为 `memory/README.md`；ProgramArguments、调度与安装示例未发生本任务改变。`U-08` 只去掉 muse-loop 恢复触发器，auto 的不确定性登记保留。auto/code-recon/tech-spec 的 diff 只删除旧 Loop 类比/例子。

## 历史校准证据实测

judge:74–78 明确历史是弱 sanity check，**不代表当前版本重校准**，且仅按需用于审计。实际用 `git show <SHA>:<path>` 取回 blob，在内存与 baseline 字节比较（未展开真实历史样本内容）：

| 固定对象 | 可取回 | 与 baseline 字节一致 | SHA-256 |
|---|---|---|---|
| `77a99dde974508b9026d57055510c309ab6c99d6:muse-loop/phase1-calibration-samples.md` | PASS | PASS | `27f5d758153430d994307d2e272b2e85f482119f612b115504ba48232204f370` |
| `77a99dde974508b9026d57055510c309ab6c99d6:muse-loop/ARCHITECTURE.md` | PASS | PASS | `2589eafab25c99d55fceccde52f1793c98691c64250f364c8c758ebb6564d723` |

## 实际执行证据：EARS stdin

通过 Node `spawnSync(process.execPath, ['scripts/check-ears-syntax.mjs', '-'], {input: fixture})` 传纯文本，未把用户内容拼进 shell，九例与预期一致：

| 分区/输入 | 实际结果 |
|---|---|
| `当点击保存时，系统应当显示成功提示` | exit 0，事件驱动 PASS |
| `处于离线状态期间，系统应当禁用同步按钮` | exit 0，状态驱动 PASS |
| `如果来源缺失，那么系统应当显示待确认` | exit 0，条件驱动 PASS |
| `系统应当记录来源引用` | exit 0，通用型 PASS |
| `点击保存显示成功` | exit 1，缺“应当” FAIL |
| `系统应当` | exit 1，无响应内容 FAIL |
| `系统应当优化` | exit 0，但发出模糊动词 WARN |
| 空字符串 | exit 0，保留 open_question 兼容性；triage:99 明确 requirement 缺失先 FAIL，不能借此过关 |
| 包含字面 `$(whoami)` 的事件陈述 | exit 0，按文本通过，无 shell 执行 |

上述只是机械子能力实测。来源忠实度、人类等待、reject/defer 分支、NO_PIN 台账约束及 judge stale-QA/PARTIAL/derived-fallback 行为，本报告审了现行合同与 baseline 差异，**没有伪装成完整 LLM 行为实测**。

## 收口限制

- 本范围无应修 finding，故未提出或自动应用任何实现改动。
- 整体 A1/A2/A6/A7 的 hook/adapter、QA mode、mutation、真实双 harness 行为与 trust 收口由主任务的独立运行时证据负责；此票不能替代它们。
- 不评判或修复并发 self-growth/template 变更；无 commit/push、网络、项目切换、真实用户数据访问或生产文件写入。唯一写入是本报告。

<!-- FILE_END: muse-loop-contract-review -->
