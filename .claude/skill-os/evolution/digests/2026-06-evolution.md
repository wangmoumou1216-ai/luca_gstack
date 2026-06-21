# 月度演进 digest — 2026-06

> 模式: **propose-only**（零自动编辑 luca_gstack；不走 consolidate_memory 晋升门）
> 运行: framework-evolution-scout（24 agents / 278 tool-uses / ~12min；2026-06-21）
> 红线: 热度≠适配——star 只是发现先验，录取要 fit-to-gap + 跨源收敛 + 过硬门

## 🔁 公平复跑(v2，2026-06-21)——修源+双层 gap 后

> 触发:独立审计纠正(4/6 gap 自关→首轮 0 是数学必然) + 用户点破源洞(superpowers 234k/codegraph 52k 首轮全漏)。
> 改:源扩面+skill 合集 hub、4 open gap(含应用作业层 GAP-design-methodology-review + 框架自维护 GAP-fusion-impact-automation)、opportunities 不静默丢、provenance 前置门、持久化结构化裁决。

**发现层已修好(你的质疑被实证回应)**:跨**两层**都打中——
| 候选 | 层 | gap | star/fork | license | 复用 | 临时裁决(主 agent 内联,非对抗 verify) |
|---|---|---|---|---|---|---|
| **CodeGraph** colbymchenry/codegraph | 框架 | fusion-impact-automation | 52486 / 3197 | MIT | install(MCP) | **采纳-下游/自仓可选**:真采纳,自动代码图谱>手写 fusion-preflight;但自仓小(md/yaml)边际,下游代码项目强 |
| **pm-skills** phuryn/pm-skills | **应用作业** | design-methodology-review | 20230 / 2055 | MIT | adapt-idea | **借鉴(作业层赢点)**:SKILL.md 合集(create-prd/OST/assumption-testing),吸收方法论进 /brainstorm /idea /ux-audit;与现有 Socratic 流水线部分冗余→挑着吸,不整装 |
| **cupcake** eqtylab/cupcake | 框架 | soft-enforcement | 271 / 23 | Apache-2.0 | port-pattern | **仅借范式**:policy-as-code 对口,但重(Rust+Rego)+采纳低+Rego 编码不了语义规则(Plan-Agent/research-default 需 LLM 判断) |
| **agent-starter** raintree-technology/agent-starter | 框架 | routing-fragmentation | 80 / 9 | MIT | port-pattern | **仅借范式**:agent.json 单清单→生成各 config 是 routing-frag 的对症解,但 80★ 低采纳→搬范式不依赖 |

**verify 层基础设施失败(诚实)**:12 个 verify agent 全因 Claude session limit 阵亡(resets 21:10 Asia/Shanghai)→ `verified:0` 是基础设施失败**不是**"没料"信号。上表是主 agent 内联临时裁决(gh 元数据+license+结构+fit),**完整对抗 verify(逐脚本 base64 安全扫 + 推荐红队)待 limit 重置后 resume**(发现 agent 已缓存,resume 便宜)。

**结论**:扩面+公平棋盘后,前沿对你这几个 gap **真有料**。**首轮的"0"既是 rigged 棋盘也是源洞,现已证伪。**

### 定论 verify（2026-06b resume，verify 真跑完，含纠偏）

12 verified → 0 approved / **3 CONDITIONAL** / 1 opportunity / 9 rejected。
- **3 CONDITIONAL 全在应用作业层**（GAP-design-methodology-review，全 adapt-idea/port-pattern）:DESIGN.md（Google 设计哲学,w90,port）、**pm-skills OST**（w90,adapt——已融合进 /ux-brainstorm）、agent-starter HCI/GOMS（w77,adapt）。
- opportunity:**DGM 自进化回路**（agent 改自己代码 + 基准每个变体）→ 建议开 `self-evolution-hardening` gap。
- strict 好 catch:**supermodeltools 真 exfil（safety 拦下,把整个 repo 上传外发）**、SocratiCode AGPL copyleft、cupcake/sem Rust 重二进制。
- **纠偏 CodeGraph**:scout 定论 **REJECTED**（compatibility:非可落 skill/无 SKILL.md）。这暴露 **scout 兼容门 skill-centric 真 bug**——系统性误拒所有 MCP/工具候选（CodeGraph/cupcake/sem）。**已修**（verifyPrompt 加 install-as-MCP/tool 分支）。CodeGraph 重定性 = 下游推荐,非核心采纳。
- 闭环价值:严格门拒 CodeGraph（skill-centric）→ 人工透明 override（它是 MCP）→ 分歧逼出真 gate bug 并当场修复——**human-in-the-loop 应有的样子**。

---

## 首轮(v1)结论：本期 0 录取（APPROVED 0 / CONDITIONAL 0）—— 门禁严格的体现，非发现失败

发现 21 → 去重 19 → 核验 19 → **全部 REJECTED**（0 红队击杀：无候选达 APPROVED）。原因分两类：

### A. 3 个种子缺口已被本 session 自身 Phase 0-4 工作填补 → 外部候选判"冗余于我们刚建的更优方案"
| 缺口 | 已有解 | 被拒的外部候选（理由摘要） |
|---|---|---|
| behavioral-verification | `behavioral_ab.py`（Sonnet A/B + no-op/回归判定） | promptfoo（79-dep 不可作 skill 落地；解的是 output-vs-rubric 非 prose-delta）、evalite、cookbook tool_evaluation（均冗余且更弱） |
| no-rollback | FUSION-RUNBOOK git-tag 回滚 + worktree + adoption-log | managed-settings 版本钉（越权 + bogus 映射 + 冗余） |
| no-feedback-loop | `adoption-log.jsonl` + digest 采纳复盘 | （无对位候选） |

### B. 3 个缺口仍 open，但本期无"非冗余且不带重框架"的外部候选
- **GAP-promotion-deadend**：是**一行级 plumbing bug**（候选从不被置 `proposed_stable=True`），非记忆范式问题。A-MEM/Letta/TencentDB 全被拒（太重/解错问题）。**TencentDB 被验证击穿**：S1 发现通道称其有"count-triggered promotion"，验证 agent 实查发现它根本无 promotion/consolidation/proposed_stable 逻辑（发现乐观→验证证伪），且 2.5 月新仓 5947★ 速度异常 → provenance lean FAIL。→ **建议内部修复**（给 propose_semantic/consolidate 加 batch set-stable 入口），不在自进化 scout 的外部采纳范围。
- **GAP-routing-fragmentation**：发现多为零星 solo 仓 / SaaS；gh 多词查询 AND 合并致空（通道已用单词循环补偿，仍无非冗余优质项）。→ 下期用单关键词深挖一轮。
- **GAP-soft-enforcement**：hookwise（Go 二进制不可移植入 Node hook 层 + 无法编码 Plan-Agent/research-default 的语义规则 + **供应链风险：自动跑 `npx openlore` + 请求 Google Calendar OAuth**）被拒；apca-w3（色彩对比算法，bogus 映射 + 非许可 license）被拒。→ 需内部解或更深一轮。

## 门禁有效性证据（首跑 = 验证机制严格度，正是"我不信任你自己做"的回应）
- 抓发现层 over-claim：TencentDB「有 promotion」实为无 → 验证证伪
- 抓供应链风险：hookwise 自动 `npx openlore` + OAuth 外联
- 抓 star 灌水嫌疑：TencentDB 2.5 月新仓 5947★ 速度异常 → lean FAIL
- 抓重框架不可移植：A-MEM(chromadb/transformers)、promptfoo(79 deps)、Letta runtime
- 识别自有更优：behavioral_ab.py > cookbook-eval；FUSION-RUNBOOK > 版本钉
- 多信号非唯 star：各通道按 forks/真采纳/近期/fit 排序，丢弃零星长尾

## source yield（本期）
| 源 | surfaced | approved | 备注 |
|---|---|---|---|
| S1-github-stars | 5 | 0 | 强候选(promptfoo)均冗余/不可落地 |
| S2-anthropic-platform | 8 | 0 | building_evals 冗余于 behavioral_ab |
| S3-agent-frameworks | 5 | 0 | 重框架不可单模式 port |
| S4-design-craft | 3 | 0 | 自报对当前 open 缺口偏题（缺口多在 testing/memory/routing 非设计交付） |

> 连续零产出会触发 yield 剪枝；本期为首跑，全源保留观察。

## 待裁决（人工）/ 行动项
1. gaps-register：behavioral-verification / no-rollback / no-feedback-loop 已被本 session 填补 → 标 `addressed`（已更新，附 evidence）。如不认可可改回 open。
2. **GAP-promotion-deadend 建议内部 plumbing 修复**（scout 范围外）：consolidate/propose_semantic 加 batch set-stable 入口，解 SC-20260615-001。
3. 发现层 gh 多词查询 AND 合并致空 → sources-registry S1 查询可改单关键词；scout loader 已加读 candidate-log 防再现已拒项。

## v4 (2026-06-21b) — 融合执行 + 红队批量裁决 + OpenSpec 评估（人工触发轮，非 scout propose-only）

**新采纳 — code-hygiene skill（GAP-code-layer-constraint → addressed）:** port agent-starter cleanup-* 8 算子 + superpowers verification Iron Law，by-property luca 护栏，routed 工程 skill。全门禁过 + 红队 **FIX_THEN_STANDS**（4 fix 已落）+ **可达性实测**（route-guard active-project surface /code-hygiene + M3 框架自维护无 project 豁免；下游清理仍 gate）。详见 ADOPTED.md。

**红队批量裁决（6 项 · 2 轮对抗 + 主 agent 裁决 · user-mandated）:**
- 4 semantic 候选：**SC-001 REJECT**（A/B 跑 skill 档主张与已提交 behavioral_ab.py Sonnet-pin 硬冲突＝未实现愿望非事实；红队跑 selftest 实证 → 改进留 `GAP-behavioral-ab-tier`）；**SC-002/003/004 REFINE→PROMOTE**（过 promotion_ready 门晋升 promoted-facts.yaml）；**SC-005**（by-property guards）新候选 pending。
- SC-003 衍生修复：`external-skill-scout.js` sibling compatibility 门补 reuse_mode 分支（**闭环**，两 scout 均已修）。
- FUSION-RUNBOOK 硬化：**FM-10**（deletion-type WIP 落地陷阱）+ **FM-11**（采纳后可达性验收门）。

**OpenSpec 借鉴评估（user 追加）:** Fission-AI/OpenSpec 55.8k★ → 红队 **NARROW_BORROW / 下游级**。仅借「archive-merge→living capability truth」一念作下游 adapt-idea；**拒** install / per-change-proposal / 「fluid 非 phase-gated」哲学（冲突 luca gate-heavy 核心）。新 gap `GAP-no-living-capability-truth`（proposed，待 luca open）。

**DGM 自硬化（GAP-self-evolution-hardening）:** 本轮**显式不追**（已融样本仅 3 条，benchmark 无意义）；重访条件 adoption-log ≥5 条。

## 采纳复盘（上 N 次融合）
本期 **3 融合落地**（live-uncommitted，随用户 skill-refactor WIP 一起提交）：OST→`/ux-brainstorm` · GOMS→`/ux-audit` · **code-hygiene（新 routed skill）**。CodeGraph/OpenSpec = 下游推荐（非 luca 核心采纳）。下期 digest 首节用 `adoption-log.jsonl` 对这 3 条复盘 keep/watch/revert。
<!-- FILE_END: 2026-06-evolution -->
