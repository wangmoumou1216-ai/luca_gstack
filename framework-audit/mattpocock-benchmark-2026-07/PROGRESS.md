# PROGRESS — mattpocock/skills 对标

> 计划: ~/.claude/plans/lucagstack-fork-https-github-com-mattpo-lively-island.md（v1.0，已批准）
> 模式: Hierarchical / ultracode（Opus 4.8 1M）
> 对方 commit: 391a2701（2026-07-10）

## 已完成 ✅

- ✅ 侦察 A：对方全量盘点（39 skill / 6 bucket / ~12 机制）
- ✅ 侦察 B：我方能力底账（32 SKILL.md + skill-os + hooks + 记忆）
- ✅ 设计压测（独立 Plan agent，7 断裂点全吸收）
- ✅ 计划 v1.0 经 ExitPlanMode 批准；用户拍板：全量深评 + 裁决包+首批高置信落地
- ✅ P0 inventory freeze：51 单元，A1 PASS（find=39 == inv=39）；机器确认 22u/17m/21promoted，
  独立捕获 resolving-merge-conflicts promoted 契约缺口

- ✅ P1 映射矩阵：51 单元全覆盖 A2 PASS（20A+6B+13C skill + 12 机制），4 翻案单元已标
- ✅ P1 rubric.md：透镜文本 + 头对头 D/I/C/E + 三桶判据 + 3 校准锚（grilling 采纳/grill-me 不动/handoff 边界）

- ✅ GATE-1 用户批准（2026-07-11）：全 32 深评（含 4 薄壳）；机制层胜出项全提案、GATE-2 逐条裁
- ✅ check-coverage.py：7 断言 + --dossier 单档自验模式；防伪已冒烟（真引文 PASS/假引文 FAIL）
- ✅ verdicts/SCHEMA.md 冻结（P2.5 judge 格式）

- ✅ P2 采证 workflow：39/39 agent 零失败，51 dossier 全自验 PASS（quote grep 回验）
- ✅ P2.5 单 judge 串行打分：51 verdict 全量落盘，门断言全绿（ids/complete/evidence/
  absence/reconciliation/hash）。桶分布：17 merge + 6 adopt + 28 leave + 0 replace。
  锚 A 重校准（grilling D 8→5，桶不变）已记录；tdd"批而未装"被实地核验推翻（已装但 stale）；
  promoted-contract 侦察假设反转（对方散文契约弱于我方 tripwire）

- ✅ 用户强化（2026-07-12）：采纳雄心——新增框架/场景/skill + 替换老 skill 都合法，
  高价值高置信即执行不打折（落 rubric §3.5 + 计划 Context③）
- 🔄 P3 对抗红队（opus，luca 指令）：分 3 批（限额多次触顶）。已完成 24/30，红队做实事：
  **1 killed**（prototype→leave，变体模式落地即空壳撞审美门）+ **10 downgraded**（收 scope）
  + stands 若干。关键降级：grilling 砍②抽 primitive（无真消费者，过早抽象）；handoff D→2
  需 P4 复核阈值；domain-modeling D→3（与 avoid-alias 双重计分修正）；tdd D→2 + refresh_caveat
  （刷新会删 deep-modules/interface-design 真实内容，须用户闸门）；to-spec/improve/codebase-design/
  resolving 均收 scope。当前桶：15 merge + 6 adopt + 30 leave

- ✅ P3 红队全 30 APPROVE 级完成，A5 PASS（1 killed + 12 downgraded + 9 stands）。
  **重大捕获**：diagnosing-bugs 原判 adopt-空缺口，红队查出已装 systematic-debugging（obra/
  superpowers，vetting 90，routing weight-7 已接线）——实为头对头，降级为 GATE-2 replace-or-port。
  这暴露 P2 采证做机制级 grep、漏查 skill 级 counterpart 存在性的系统风险。
- ✅ adopt 尽调补查（对齐上教训）：codebase-design/resolving 无已装同类✓；writing-great-skills
  有 skill-creator 相邻（流程 vs doctrine，grep 元词汇 0，互补不冗余，P4 须向用户披露）；tdd 已知刷新。

- ✅ P3 全收官：APPROVE 级红队完成（**2 killed**：prototype + git-guardrails〔其块经复审官
  核出缺失后按证据重建〕/12 downgraded/14 stands），反向 7/7
  （**2 revive**：research 轻量研究缺口为真 + promoted-contract① 登记面 checker 该升 gap 提案；
  5 stands 前提逐条核实）。check-coverage --assert all 七断言 PASS。
- ✅ P4 组装：FINAL-VERDICT-PACK.md 落盘（6 adopt/15 merge/30 leave + 1 替换候选上桌 +
  4 gap 提案 + 对账 4 条 + 成本标价单 + 首批①②③建议 + §8 拍板清单 7 项）

- ✅ P4 fable 出门前复审：**SHIP-WITH-FIXES**——捕获 git-guardrails kill 未传播进包（击杀
  agent 限额阵亡致块缺失+落在 a_redteam 的 leave 桶盲区）。4 必修全落实：①包三处对齐 kill
  ②战绩改 2 killed ③verdict 重建击杀块（标明重建来源+prove-it-bites 交叉佐证）④handoff 脚注
  改诚实措辞（有效 D=2<阈值，例外主张交 GATE-2）。附带：新增 a_killed_integrity 断言
  （已证会咬+无误报），八断言全绿。

- ✅ **GATE-2 已裁（2026-07-12，七项全落）**：① 三桶整包批准；② diagnosing-bugs 走 **port**
  （4 机制搬入 systematic-debugging，强制 A/B）；③ 四 gap **全开**（skill-authoring/
  registration-sync/issue-tracker/轻量研究 skill）；④ 首批=**①②③+诊断 port**（WIP=4 用户
  显式授权）；⑤ tdd **直接刷新不留副本**；⑥ handoff **接受例外 merge**（用户例外权）；
  ⑦ teach **装**（全局零耦合）。
- ⚑ **用户附加指令（编排层）**：新增 skill 必须深度规划进复杂/简单任务 workflow——"不能新增了
  就完了，要完美落入使用场景和流程"→ P5.0 交付 ORCHESTRATION-INTEGRATION.md（可达性从路由层
  扩展到编排层），每个能力给：简单任务触达/复杂任务位置/场景适用/登记动作/可达性验收。

- ✅ P5.0 编排集成规划：ORCHESTRATION-INTEGRATION.md（每能力五件套 + 后续批次编排位 +
  研究门三档设计 + 编排层 FM-11 验收总则）
- ✅ P5.1 installs：codebase-design/resolving-merge-conflicts/teach 装 + tdd 刷新（不留副本）；
  routing 词条双仓 + FM-11 双实测 PASS + 三登记面 + RUNBOOK 指针 + self-model 重建 +
  双仓 verify 54/53 全绿 + 批①双仓已提交（tag pre-fuse-mattpocock-batch1）
- ✅ P5.2 skill-authoring.md：新建（六机制一文件）+ CLAUDE.md 指针 + RUNBOOK 步③ + parity 锚
  双仓绿；**行为 A/B PASS delta=0.9112**
- ✅ P5.3 code-hygiene v1.1.0：会咬三段证据条款（fail-open 兼容）+ 双轴分派 + Fowler 基线，
  双仓；**行为 A/B PASS delta=0.6534（护栏场景 + must-hold 无回归）**
- ✅ P5.4 诊断 port：4 机制入 systematic-debugging + hitl 脚本 + CREATION-LOG 溯源，
  routing 零新词条（去重原则）；**行为 A/B PASS delta=0.8344**
- ✅ P6 SSOT：vetting-registry 对标总记录（append，双仓）+ gaps-register 四条（1 addressed +
  3 open，双仓）+ adoption-log ×7（双仓）+ CHANGELOG 条目（双仓）

## 进行中 🔄

- 🔄 收尾：批②③④双仓提交 + push + episodic --meta 写回

## P4 组装须携带的要点（防遗漏）

- diagnosing-bugs → GATE-2 replace(过支配测试) or port(4 机制) 二选一 + routing 去重
- handoff D→2 须复核是否仍达 merge 阈值（redact 单机制守？）
- tdd 刷新会删 deep-modules/interface-design 两份真实内容 → 用户闸门
- writing-great-skills 相邻 skill-creator（已装）→ 披露，skill-authoring.md 是第三条腿（doctrine）
- 多机制共用 skill-authoring.md 落地（leading-word/invocation-cost/avoid-alias/metavocab）→
  A/B 记一次、touched_files 不重复计
- capability_type 标注 + 高 D merge 的"为什么不是 replace"回检（rubric §3.5）

## 待执行

- P2 并行采证（Tier A/B 每单元一 dossier agent，只采证不打分）
- P2.5 单 judge 串行打分 → P3 红队 → P4 裁决包 + fable 复审 → GATE-2
- P5 首批落地（FUSION 九步 + 治理轨道 + 双仓，WIP≤3）→ P6 收尾

## 关键决策

- Tier 化解"全量 vs 成本"：A 头对头深评 / B 标准 7 维 / C 快裁（仍读全文+双侧证据）
- 采证并行、打分串行单 judge（评分漂移的结构性修复）
- 替换桶 = Pareto 支配 + 红队存活 + 回归证明（门槛结构性高于补强）
- 机制层候选无 open gap → 提案新 gap，GATE-2 用户先裁 gap（不绕过人工拥有权）

## 恢复指令

`ls framework-audit/mattpocock-benchmark-2026-07/` → 读 PROGRESS + manifest 续点
