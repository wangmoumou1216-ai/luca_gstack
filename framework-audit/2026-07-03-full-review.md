# luca_gstack 全量搭建 Review — 2026-07-03

> 触发：luca「用高模型走查一遍整体的建设思路——偏离/诉求偏差/调研/skill搭建」。
> 方法：Fable 主审 + 5 个独立评审员并行（架构哲学/诉求偏差/调研质量/skill接线/治理复杂度）
> + 对抗核实层（廉价项内联实证、重锤项独立 refuter）。所有 findings 带 file:line 或运转数据证据。
> 历史校准：过往三次红队翻掉自审发现的 4/9、6/11、5/7——本次重大结论未经核实不出报告；
> 本次核实又翻掉/收窄了 2 条（R1-F1 幅度、砍 skill 之争），机制再次证明必要。

---

## 四轴直接回答（luca 的原问题）

### ① 整体建设思路有没有偏离？——方向没偏，重心偏了

**方向（by-design 确认）**：6-28 体检后的三项新建设（记忆三分类 / muse-loop / design-brief B-0）
全部服务真实诉求（多项目个人环境），muse-loop 守住零母版回污纪律，B-0 是从个人 app
实战（REQ-008 三条映射失败）反哺母版的场景通用修复。「环境/项目剥离」哲学执行到位
（git log 与 episodic project 分布交叉验证一致）。

**重心（真缺口，独立判断：已偏离）**：
- episodic 严格口径 17/50（34%）～宽口径 21/50（42%）session 是框架自建；git 近 30 commits
  ~29 个是框架基建。
- **元层在复利自增**：月度自进化→治理积压清算→健康度体检→体检收口→两轮演进 digest——
  「维护维护系统」的 session 链每建一个子系统就制造下一批 session 义务。
- 活证据：两天内两次多 agent 扇出撞订阅限额（7-02 演进 scout 13 agent 阵亡、7-03 本 review
  3 评审员阵亡）——框架的重多-agent 文化已经顶到配额天花板。
- 评审员原话：「刀已经比砍的柴多了。」

### ② 有没有诉求偏差？——有一个明确的：身份声明滞后于行为

- CONTEXT.md 第一行仍是「产品：纷享销客 CRM」；50 个 session **零**纯 CRM 设计任务
  （muse 11 / todo-capsule 5 / roam-cards 2 / ax-cowork-ux 4 / 框架自建 21）。
- 6-28 体检 §3-L3 明确「是否收窄 CRM 专属层留你拍板」——此后框架用三分类、fork 隔离在
  **行为上**完成了转型，声明层原封未动，拍板悬了 5 天。
- 税额实测：CRM 专属注入 ≈600-900 tokens/session（CLAUDE.md 4.3% + CONTEXT.md 26.2%），
  **税小、误导大**（design-brief Phase 6 默认 FxUI 映射；CONTEXT 内 6-12 洞察已自己写了
  解药「个人项目品牌不绑 FxUI」——框架一直在绕过错误声明而非修正它）。
- **「全删 CRM」是错解法**（核实裁定）：muse fork constitution.md 显式依赖 FxUI token 规则，
  sync-upstream 会把母版删除传导进 fork。正解 = **休眠层/缴税层二分**：framework/ 母版、
  brand-tokens、fx 系 skill 磁盘原地保留（零 per-session 成本），只收窄注入面。
- 场景 A/B/C/D 分类**保留**（by-design）：route-guard 本就 scene-agnostic，A/B/D 语义产品无关，
  muse REQ-008 正是走场景 B 跑通的；仅 SF-005 措辞改产品中性。
- 附：我 Phase A 的「设计主链缺席」初判**被复核推翻**——skills_used 记账不全，设计链至少
  3 次端到端跑通（todo-capsule、研究情报官），全部服务个人 app。真冬眠的是 auto/figma-demo/
  compare 等 CRM 编排器与专属件。

### ③ 调研有没有不对？——基本干净，这是框架最健康的轴

抽查三份（muse-loop 外部引用 / 演进击杀理由 / deepresearch 降级传导）：
- **4 项验证通过**：BMAD document-project（机制/原话/规模规则逐字印证）、Kiro Bugfix 三段式
  （Unchanged Behavior 逐字存在）、rulesync 击杀前提（README 输入面证实只吃已知工具格式）、
  15×/90.2%/80% 数字全仓零处剥降级标注引用。
- **1 项诚实自创确认**：「改造类 PRD 必须带现状截图无业界命名」自标准确。
- **1 处轻度失真**：Kiro steering「机器生成→人工校正→**才**可用」把推荐性 Refine 说成强制
  门禁（原文 immediately available，review 是最佳实践建议）——周边引用，不承载核心决策。
- 另有一处轻微压缩：BMAD 对大库实际推荐 PRD-first（文档化范围由 PRD 引导），muse 引用只取了
  Approach B 顺序；两路径都支持 muse 的修复结论，传导不失真。
- 演进 digest 四条击杀理由的仓内事实（#14 注释 / parseHiddenSkills 真值向 / 代码图谱为空）
  已另行抽查属实。

### ④ skill 新增与逻辑搭建有没有问题？——接线基本正确，1 真缺口 + 3 低危

**接线正确面（逐项确认）**：fork 路由词条与母版全表零碰撞；muse-loop-orchestrate 已正确注册
HEAVY_ORCHESTRATOR；verify-prototype allowedModes 接线正确；code-hygiene「不另造 reviewer」
声明属实、触发词全表唯一；proto-gen 绕门禁边界由三重结构性机制圈住（隐藏+仅 OD-down dispatch+
上游双 GATE）；proto-judge 无 Edit/Write 权限与只读承诺一致。

**问题面**：
- **[P1·真缺口] GATE-1 双规格不一致**（内联核实确认）：muse-req-triage Phase 3 规定呈现四件套，
  muse-loop-orchestrate GATE-1 又强制附加 EARS linter + design_reference + brownfield 问法，
  同时声称「共用同一套逻辑」——按 triage 文本执行会漏三个强制项。
  修复：单一所有权——triage Phase 3 收编为权威规格，orchestrate 只引用不复述。
- [P3·真缺口低危] 入口 B 文本自相矛盾：`:54`「跳过语料读取直接进 Phase 1」vs `:58` design_reference
  抽取（Phase 0）「两个入口都做」。一句话修复。
- [P3·真缺口低危] 发现性脱同步：code-hygiene 不在 /office 向导列表；fork 的 muse 两个一级
  skill 在 fork CLAUDE.md 零提及（词表不中时无语义兜底）。
- [P3·by-design 加固] B-0 与「执行顺序锁死」节非实质冲突（C-1 同样先于 Phase A），但锁死节的
  A 级威胁语言留下误判空间——加一行「场景专属前置 Step 先于 Phase A 属合法顺序」。
  proto-judge 的 Bash 软边界加一句「仅用于渲染/截图取证」。

---

## 补充轴：治理复杂度（评审员 + 内联核实）

- **采集侧是干净核心**（保）：四信号门槛真实生效（最近 15 条 episodic 全带非显而易见 decision，
  1.1 条/天克制）；hook 链 fail-open 完备（session-sync 全程 try/catch + kill-switch + 三重防
  循环）；开销实测可忽略（route-guard 0.04s/消息）；懒加载启动协议合规。
- **治理侧是单人用户的委员会流程**（过度工程，内联核实坐实）：reviews.jsonl 实查——31 条晋升
  里 23 条集中在 6-21 一天的手工清算；每日治理近 4 周自动产出 2 条状态变化，**空转率 >90%**；
  晋升通道曾停摆 3 周（05-23→06-14 空档）而日常工作无感知。1383 行治理代码（consolidate/
  daily_governance/review_candidates/behavioral_ab）服务日均 ~0.07 条晋升。
- **告警疲劳实锤**（解法错）：同一条候选连续 9 天逐字复读才被采纳；MEMORY.md 超限告警连报
  2 天未动——这是 luca 6-24「已 flag 信号被放过」教训的系统侧根源：看门狗在叫，呈现方式推不动
  裁决。
- 「自造自抓」：管线抓到的重复 ID 候选，正是管线自己的读-算-写竞态制造的（本 session 已修
  append_episode 序号单调化）。

## 补充：架构哲学轴其余核实结论

- **[NARROWED] CLAUDE.md 瘦身**：「94% 非宪法级/瘦到 <200 行」被 refuter 推翻——桶 A 程序化
  锚定 ~240 行（7 个 checker 硬锚 + session-sync/HOOK-007 指针契约 + 启动协议自举问题 +
  AGENTS.md 双面镜像），且 37/45KB 预算内非紧迫。**安全幅度 594→约 450 行**：只动目录树
  （~40 行）、bash 命令示例（~35 行）、Checkpoint/PROGRESS 格式模板、自动化描述、skill 表格
  重复消歧语义；动模型路由表须同步 daily_governance.py:113；瘦身后必须全绿
  verify.sh + check:routing-map + check:coding-discipline + check:hooks（注意两个静默失效陷阱：
  SF sync 三脚本 marker 找不到不报错、check_memory_health 空集真空通过）。
- **[解法错·附因果 caveat] /auto 结构性失活**：route-guard 把 /auto 硬编码进 HEAVY_ORCHESTRATOR
  →命中即强制出计划等确认，「全自动」入口结构上永远不自动，50 session 零使用。caveat：零使用
  也可能是无需求（/auto 的「CRM+设计词」组合触发场景在个人 app 时代不存在）——修门之前先答
  「还要不要 /auto」。
- **[时机错] 四道 plan 门重叠**：PLAN_MODE/PLAN_CHECK/5条件人工复查/研究默认门回答同一个问题；
  连本 review 对话自身 route-guard 都连续输出 PLAN MODE/MULTI/STOP 噪音 hint（活证据）。
  合并为单一 plan 判定点是对的，但属结构改动，须 luca 拍板。
- **[真缺口·合成裁决] skill 面收窄**：46% 近 30 天零调用、10/26 从未记录使用。R1「砍」与
  R2「休眠」实为同一动作的两半：**移出路由词表和 /office 列表（收输入面），磁盘原地保留
  （零成本休眠）**。首批候选：auto、compare、figma-demo、magicpath、taste-review、retro、
  challenge、design-review（fx 系因 muse fork 依赖保留）。

---

## 修复清单（分级，全部待 luca 拍板后执行）

**P1（真缺口，值得现在修，机械性）**
1. GATE-1 单一所有权（fork 两个 SKILL.md）
2. muse-req-triage :54 入口 B 一句话修正（fork）

**P2（结构决策，需要你拍板方向）**
3. **身份声明落地**（6-28 体检遗留）：CONTEXT.md 改写为「多项目个人环境，CRM=可选休眠 profile」；
   SF-001/004 移出白名单转 search-only；SF-005 措辞产品中性；CRM 组合规则与 framework 检查清单
   块随之收窄。磁盘资产（framework//brand-tokens/fx 系）原地保留。
4. **治理降频**：每日治理→「有状态变化才生成 digest + 周度强制一跑」；超期项升级呈现
   （生成合并稿/一键命令）替代逐日复读；behavioral_ab 无调用记录则归档。
5. **plan 门合并**：PLAN_MODE/PLAN_CHECK/5条件复查合并为单一判定点；/auto 去留先决策。
6. **skill 输入面收窄**：零用 skill 移出路由词表与 /office 列表，磁盘保留；引入「使用即留任」
   （60 天零调用降级归档）。
7. **CLAUDE.md 瘦身 ~100-150 行**（桶 C + 桶 B 去重，按 refuter 验证协议执行）。
8. **框架建设预算**：给元层 session 设上限（如每月 ≤2），演进/治理产出攒批季度裁决。

**P3（一句话级，随手修）**
9. B-0 锁死节澄清行；10. /office 向导补 code-hygiene；11. fork CLAUDE.md 补 muse 条目；
12. proto-judge Bash 用途注释；13. Kiro steering 措辞修正 + BMAD PRD-first 半句（fork ARCHITECTURE.md）。

---

## 总评

这套框架**最忠实执行的哲学是「剥离」，最背叛的哲学是「懒加载」和「最小」**——且背叛方式
不是违规，是用 594 行宪法、多道同质门、26 个 skill 和一个会自我复制的治理层，把
「Graph-optional」建成了「Graph-mandatory-by-default」。但三个关键面是真健康的：调研引用
文化（降级标注真实在工作）、采集侧记忆管线（值回票价）、新 skill 接线纪律（零碰撞、
承诺与权限一致）。核心处方一句话：**保采集与检索，收注入与门禁，冻元层扩张，把 session
预算逼回真实设计任务。**
