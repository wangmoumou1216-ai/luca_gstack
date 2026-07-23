# 已采纳外部能力（ADOPTED）

> 演进 scout 发现 → 门禁通过 → 经 FUSION-RUNBOOK 落地/采纳的外部能力登记。
> propose-only：每条均人工裁决；记录复用方式、落点、钉版本、供应链结论、回滚。
> 明细见 `adoption-log.jsonl`；本文件是人读速查。

## CodeGraph（框架自维护 / 下游代码项目）
- repo: `colbymchenry/codegraph` · MIT · 52k★ / 3197 fork · 活跃（2026-06-21 仍推）
- gap: `GAP-fusion-impact-automation` · layer: **framework** · reuse_mode: **install(MCP/CLI)**
- **scope: 下游代码项目**（luca 设计产出的实现工程）；luca 自身小仓（md/yaml）价值边际，**不强装进设计环境**
- 钉版本: **v1.0.1 @ a1489f77a6d69538bfe29020b8366ee034f90860**（2026-06-13）
- 安全/供应链: install.sh 实读 = 下载 release tarball + 解压，`rm -rf` 仅作用自身 INSTALL_DIR/tmp，无 sudo / 远程 eval / 密钥读 / 数据外发；deps 干净（tree-sitter 系）
- **安全安装（不盲 curl|sh）**: `npm i -g @colbymchenry/codegraph@1.0.1`
- 落点: **不进 office/route-guard**（非设计 skill）；下游代码项目按需装为 MCP；可选喂 `fusion-preflight` 替手写耦合检测
- 行为 A/B: N/A（工具非 skill-prose）
- ⚠️ **顶层可达性: NOT reachable** —— 除本记录外零接线；luca 顶层不声明 repo 级 MCP（现有 figma/open-design 走 session 连接 + skill body 引用）。CodeGraph 是**下游代码项目级推荐**，由下游项目自行 session-connect + 引用，**luca 设计环境本就调不到（by design）**。要在 luca 自身代码维护里用，须显式 session-connect MCP + 在 fusion-preflight/相关脚本引用。
- 采纳状态: **下游推荐，非 luca 核心采纳**。⚠️ 严格 scout（定论 verify, run 2026-06b）将其 **REJECTED** —— compatibility「非可落 skill、无 SKILL.md」（因它是 MCP/CLI 工具，非 Claude skill）。这是 **scout 兼容门的局限**（只判"可落 skill"，缺 install-as-MCP/tool 分支 → 系统性误拒 MCP 候选，待修）。人工裁定:它是合法 npm-MCP，但**对 luca 自身小仓边际**，价值在下游代码项目。实际 `npm i -g` 由用户按下游项目需要触发（未自动装）。

## OST（pm-skills opportunity-solution-tree → /ux-brainstorm Phase 3.6）
- repo: `phuryn/pm-skills` · MIT · 20k★ / 2055 fork · gap: `GAP-design-methodology-review` · layer: **application** · reuse_mode: **adapt-idea**
- 落点: `/ux-brainstorm` 新增 Phase 3.6 机会映射（OST）+ Phase 4.1 锚定
- 门禁: 静态 45/0 · **行为 A/B PASS**（Opus 回退；非 no-op + 无回归 保守/理想/非显+范式转变+守卫）· 红队清白
- 落地状态: 编辑 **live in 工作树**（随 /ux-brainstorm 精简重构一起提交）；回滚 ref `tag pre-fuse-ost-uxb`
- 弃用部分: pm-skills 的 `create-prd`（冗余于 /brainstorm 苏格拉底式 + Oracle，更弱）

## GOMS/KLM（agent-starter goms-klm-analysis → /ux-audit Module B）
- repo: `raintree-technology/agent-starter` · MIT · gap: `GAP-design-methodology-review` · layer: **application** · reuse_mode: **adapt-idea**
- 落点: `/ux-audit` Module B 派发指令新增 GOMS/KLM 操作子计数（K/P/M/H/R/V，当前 N → 建议 N'，移除操作子）
- 为什么非冗余: Module B 原为定性交互评审；GOMS 加**可测的交互成本量化**（操作子计数），互补
- 门禁: 静态 45/0 · **行为 A/B PASS**（Sonnet；候选产出 KLM 表 22→13 + 保留交互/a11y 评审无回归）· 红队清白
- 落地状态: 编辑 **live in 工作树**（随 /ux-audit 精简重构一起提交）；回滚 = 撤该未提交编辑
- 同源弃用: agent-starter 的 hig-*（HIG 组件库，非设计方法论）。**注：cleanup-* 套件后由 code-hygiene fusion 采纳**（见下，GAP-code-layer-constraint）——对 design-methodology gap 不相关，但对代码层约束相关

## code-hygiene skill（agent-starter cleanup-* + superpowers verification → 新建 /code-hygiene）
- repos: `raintree-technology/agent-starter`(MIT) cleanup-* 套件 + `obra/superpowers` verification-before-completion · gap: `GAP-code-layer-constraint` · layer: **framework** · reuse_mode: **port-pattern + adapt-idea**
- 落点: 新建 `.claude/skills/office/code-hygiene/SKILL.md`（routed 工程 skill）+ `commands/code-hygiene.md` + routing-map `code_hygiene` 项 + input-modes 项 + CLAUDE.md「工程/质量 skill」行
- 内容: 8 清理算子（unused/cycles/dedupe/types/weak-types/defensive/legacy/slop，port agent-starter）+ **完成前验证 Iron Law**（port superpowers，接 luca `verify.sh`/`check:*`/bats/pytest 真值表）+ 代码审查**复用** quality-gate/redteam（不另造 reviewer）
- **luca 护栏（by-property 非 by-name，红队 GUARD_HOLE 修复后）**: fail-open catch（含 `memory/scripts/*.py` 治理脚本）/ Static Fallback / 兼容语义 / framework/ 只读 / WHY 注释 一律按结构属性保护
- 门禁: 静态 `check:routing-map`/`coding-discipline`/`verify.sh 45/0` 全过 · **红队 FIX_THEN_STANDS**（4 fix 已落：.gitignore / tool-probe 不静默降级 / by-property guards / route-guard M3 框架自维护豁免）
- **顶层可达性: REACHABLE（实测，非 CodeGraph 式 orphan）** — route-guard 在 active project surface `/code-hygiene`；框架自维护（无 project）走 M3 路径豁免后可达；下游清理（无框架路径）仍正常 PROJECT GATE
- 同源弃用: agent-starter hig-*（HIG 组件库）；superpowers requesting/receiving-code-review（luca 已有 quality-gate/redteam 覆盖）
- 落地状态: **live in 工作树**（routing-map/CLAUDE.md/input-modes 已含用户 skill-refactor WIP，随其一起提交，勿单独抽离=SC-20260621-002）；回滚 tag `pre-fuse-code-hygiene`

## OpenSpec（Fission-AI/OpenSpec → NARROW_BORROW / 下游级，非 luca 核心采纳）
- repo: `Fission-AI/OpenSpec` · MIT · **55.8k★** · 活跃（pushed 2026-06-13，未归档，gh 核实）· gap: `GAP-no-living-capability-truth`（proposed，待 luca open）· layer: **application/downstream** · reuse_mode: **adapt-idea**
- 模型: `openspec/specs/`=按 capability 的活真值；`changes/`=每变更一 folder（proposal+spec delta+tasks），archive 时 merge 进 specs/；brownfield delta；哲学「fluid 非 phase-gated」
- 红队定论（FOR/AGAINST 双 lens + 综合）: **NARROW_BORROW** — 唯一值得借的是「**archive-merge → living capability truth**」一念（luca 链结构性 forward-only，缺『能力当前(已合并)如何工作』活真值闭环），作**下游项目级** adapt-idea/propose-only
- **明确拒**: ① 不 install OpenSpec（TS CLI+/opsx+openspec/ 会与 docs/ 软链真值源打架）② 不采 per-change proposal 机制（冗余于 tech-spec RTM+task-plan+ADR+CONTEXT+propose_semantic 治理，且 luca 的更严）③ **显式拒「fluid 非 phase-gated」哲学**（与 luca 刻意的 Plan-Agent/handoff/coverage/traceability gate 核心冲突；GAP-soft-enforcement 要 gate 更硬不更软）
- ⚠️ 顶层可达性: **N/A by design** — 下游推荐，非 luca 核心采纳（同 CodeGraph 模式）。可选 in-harness hook（终端 optional 节点写 `docs/specs/<capability>/spec.md` 活真值）**留给 luca 裁决**，未自动实现

## mattpocock/skills 对标首批（2026-07-12，全量深评 51 单元后 GATE-2 批准）
- repo: `mattpocock/skills` · MIT · pin `391a2701`（2026-07-10）· 全流程：framework-audit/mattpocock-benchmark-2026-07/（inventory→matrix→rubric→51 dossier→51 verdict→红队→fable 复审→GATE-2 七项裁决）
- **install**: codebase-design（深模块词汇 primitive，3 文件）+ resolving-merge-conflicts（按意图解冲突，1 文件）→ ~/.claude/skills/；routing 词条双仓 + FM-11 实测 PASS（seam 类/冲突类输入均 surface）
- **refresh**: tdd → 391a2701（+seam 门 +tautological；-3 旧文件，用户拍板不留副本）
- **personal**: teach（5 文件，user-invoked 零框架触面，不进 routing/office/治理轨道）
- MIT 署名：本条即署名记录（内容原样拷贝自 pin commit，未改动）
- 回滚：双仓 tag `pre-fuse-mattpocock-batch1`；编排集成契约见 benchmark 目录 ORCHESTRATION-INTEGRATION.md

## mattpocock/skills 更新对标第二批（2026-07-23，窗口 391a2701→ed37663c）
- 流程：靶子→红队 R1-R4 并行 refute→fable 终审逐项 verdict，全档 framework-audit/2026-07-23-mattpocock-update-{review,redteam-findings,consensus}.md
- **merge ×3**：wayfinder decision-ticket 正名→`plan-agent.md` 毕业判准类型闸（决策型永不毕业成自主执行 U-block）；grilling environment 放宽→`brainstorm` Rule 3 事实源扩「跑命令/调工具/web 检索」；improve-codebase-architecture churn→`code-recon` 有方向富化信号一行
- **reject ×2**：batch-grill-me（KILL 含 Part-6 升档，重启触发器在 consensus D1）；improve-codebase-architecture branch(b) 无方向 fallback（Phase 0 结构性预置）
- **gap 提案（待 luca 落笔）**：GAP-decision-questionnaire（to-questionnaire 延迟采纳，触发=首次真实递出需求，近似实例 EP-20260722-098）
- MIT 署名：三处 merge 均为概念级吸收并在落点注明源与日期；行为 A/B 豁免显式记录（一句级增量，以断言 grep + check-routing-map/check-registration-sync 回归替代）

<!-- FILE_END: ADOPTED -->
