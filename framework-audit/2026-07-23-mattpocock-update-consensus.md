# mattpocock/skills 更新对标 — 终审共识稿 + 执行计划（2026-07-23）

> 链路：靶子（`2026-07-23-mattpocock-update-review.md`）→ 红队 R1-R4（`…-redteam-findings.md`）→
> fable 判官终裁（本文件 §A）→ 执行计划（§B）→ 落地记录（§C，执行后补）。
> luca 授权链：「红队从源头梳理→达成一致→思考改动方向→认真出规划→没问题再执行」（本 session 原话，
> 覆盖 propose-first 门的显式预授权）；唯一保留人裁项：gaps-register 写入（§A-D4，SSOT 头部规定）。

## §A 终审裁决（fable 判官，全文要点）

| 项 | VERDICT | 状态 | 一句话理由 |
|---|---|---|---|
| D1 batch-grill-me→brainstorm 批轮 | **KILL**（Part-6 升档也不采） | ADJUDICATED | 判官亲裁对质1：06-12 实跑时 SKILL.md 已是「2-6 问 ONE AT A TIME」（git 历史证实），「10 轮」大头不在 Rule 3 管辖内——改教义压不掉那个延迟；串行是 Phase 2 sharpening 承重件；上游作者 A/B 后把逐题版转正 |
| D2 plan-agent 毕业判准类型闸 | **ADOPT** | CONSENSUS | U-block 系统内确无决策型毕业落点（:315 task_execution 专用），HITL 确认海拔在计划层非逐项；零新机器一句扩展 |
| D3 brainstorm 事实源扩工具 | **ADOPT** | CONSENSUS | 「代码库/文档/已有研究」是静态制品闭枚举，工具可确立事实落在外；一行同步 |
| D4 to-questionnaire | **记 gap 提案，不动手** | 结论 CONSENSUS / 理由 ADJUDICATED | 「收件人不存在」腿剔除（EP-20260722-098 四项待决挂具名他人处=近似实例）；正确理由=场景消费零实发+判据②前置不满足+三不产定位稀释 |
| D5 code-recon churn | **不采 branch(b)+修撤回理由+churn 富化一行 ADOPT** | CONSENSUS | 强腿（Phase 0 强制意图）保留；「2 次使用=无需求」废腿剔除（过度泛化教训）；churn=零行为风险只读富化信号 |
| D6 plugin 化 | **渠道不切；roster gap 不开** | 渠道 CONSENSUS / gap ADJUDICATED | check-routing-map.mjs（ADR-0005a SSOT 一致性）+ check-registration-sync.mjs（REG-1/2/3）已覆盖 R4 拟议校验器；UNVERIFIED 核销 |
| D7 流程项 | 三件分裁 | ADJUDICATED | ①ack 必须用 path 域 SHA 非 repo HEAD（watcher 比较语义 `daily_governance.py:450` current=path 域）②靶子 §1 修正 ③透镜盲点注记落 BENCHMARK-RUNBOOK 步①（不引 implement 实例——见 NF1） |

**NEW FINDINGS（判官独立发现）：**
- NF1：R1 的 F4 实例错误——implement 转正**早于**窗口（391a2701 时已在 engineering 桶），窗口内仅补 README 接线；透镜盲点作为一般性流程改进仍成立，但不得记载该实例。
- NF2：编排者拟议「ack=ed37663c」在 watcher path 域比较语义下无效（repo HEAD 永不等于 path 域 current）——正确做法=逐 unit path 域当前 SHA。撞 `feedback_verify-params-before-offering-choices` 同族教训。
- NF3：EP-20260722-098 是 to-questionnaire 场景近似实例（四项待决挂具名他人处），gap 从纯前瞻升级为「有近似形态实证」。

**编排者调研缺陷自认（五条，入档）：** ①穷尽性声明先于逐文件直读 ②「10 轮」引用未与当前版 skill 上限交叉验证 ③「HITL 兜底」未直读机制海拔即背书 ④「收件人」争点两侧均单侧取证 ⑤拟议参数（ack=HEAD）未验机制后果。

**D1 重启触发器（拒绝档案）：** 真实 Phase 3 跑出 ≥2 次「用户不耐烦且 Part-6 narrow-to-2 未解痛」实录 → 重审 R3 的 Part-6 升档最小版（四护栏：默认教义不动/用户 consent 触发/不预填推荐/高杠杆强制单抛）。

**D4 gap 提案文本（待 luca 批准后写入 gaps-register.yaml）：**
```yaml
- id: GAP-decision-questionnaire
  layer: application
  statement: "PRD 逼问/规划产生的待决问题挂在具名他人处时，无第三出口（决策问卷制品）；
    近似实例 EP-20260722-098（品牌方接受度/欧美销售可用性测试两项待决挂具名他人）"
  status: open
  trigger: "第一次真实出现「luca 要把待决递给具名知识持有者」→ 取上游 to-questionnaire
    （mattpocock/skills, in-progress）做 merge 吸收，届时按 SC-20260721-002 判据②裁
    卡型进正文 vs references 底料"
  source: framework-audit/2026-07-23-mattpocock-update-consensus.md
```

## §B 执行计划（Plan Agent 格式）

**块 0 前提门：** ①该不该解：是——每项落地均溯源到红队确证缺陷+判官终裁，非批量默认采纳。②更薄替代：本批已是最薄形态（全部一句/一行级增量、零新机器；更薄=不做，已被逐项裁决否定）。③默认产出形态偏差：不适用——无预声明默认形态，逐项对抗裁决，且无任何关闭/删除防护类提案（D1 恰是拒改护住既有教义）。KILL-assumption：无（网络依赖仅剩 ack 核验查询，失败降级为 defer+note）。

**块 1 复杂度：** Sequential / Solo（主线程 surgical edits，无需 subagent）/ 需要用户确认：否（luca 已预授权端到端）/ Tier: Lightweight（≈8 文件、全部行级）。块 1.5/1.6：无 task-plan.md 输入，跳过（如实声明）。

**块 2 Phase 分解（全部 phase_type: task_execution，model_tier: core-execution 主循环）：**

| Phase | 内容 | 产出 |
|---|---|---|
| P1 内容采纳 | E1 plan-agent.md :326 类型闸一句；E2 brainstorm :134-136 事实源+判据；E3 code-recon 深化透镜旁 churn 一行 | 3 文件 |
| P2 流程/登记 | E4 installed-pins ack 核验（先查 4 unit path 域当前 SHA；若==既有 ack 697d4ce9 则零编辑只记核验）；E5 BENCHMARK-RUNBOOK 步①补注；E6 靶子 §1 修正（5 docs 入 noise/计数 7 与 3/直读范围降级/F4 注记） | ≤3 文件 |
| P3 SSOT 回写 | vetting-registry 追加 window-update-review 记录；ADOPTED.md 追加第二批节；adoption-log 3 条（D2/D3/D5，A/B 豁免显式记录：一句级增量以断言 grep+回归门替代）；CHANGELOG [Unreleased] 一行式（采纳 3+拒绝 2+渠道 1） | 4 文件 |
| P4 验证+固化 | 块 3 断言全跑；两个 checker 回归；git add 具体文件 commit+push | 提交 |

**块 3 断言列表：**
```bash
# [BLOCKING] A1 类型闸落地
grep -q "决策还是执行" .claude/agents/plan-agent.md
# [BLOCKING] A2 事实源扩展落地
grep -q "用工具当场确立" .claude/skills/office/brainstorm/SKILL.md
# [BLOCKING] A3 churn 富化落地
grep -q "churn" .claude/skills/office/code-recon/SKILL.md
# [BLOCKING] A4 未误伤教义：Rule 3 逐题与 2-6 上限原样
grep -q "One question at a time" .claude/skills/office/brainstorm/SKILL.md && grep -q "2-6 forcing" .claude/skills/office/brainstorm/SKILL.md
# [BLOCKING] A5 路由/登记回归绿
node scripts/check-routing-map.mjs && node scripts/check-registration-sync.mjs
# [BLOCKING] A6 SSOT 三处追加存在
grep -q "update-review-2026-07-23" .claude/skill-os/external-skills/vetting-registry.yaml && grep -q "2026-07-23" .claude/skill-os/evolution/ADOPTED.md && tail -3 .claude/skill-os/evolution/adoption-log.jsonl | grep -q "2026-07-23"
# [BLOCKING] A7 YAML/JSONL 合法
python3 -c "import yaml;yaml.safe_load(open('.claude/skill-os/external-skills/installed-pins.yaml'))" && tail -3 .claude/skill-os/evolution/adoption-log.jsonl | python3 -c "import sys,json;[json.loads(l) for l in sys.stdin]"
# [BLOCKING] A8 工作区固化
git push && test -z "$(git status --porcelain)"
```

**块 4 失败策略：** 任一 BLOCKING 失败→修复后重跑，不带病提交；gh 网络失败→ack 核验降级为「defer+consensus 注记」，不阻塞其余；invariants 冲突发现→停下改走人裁。Completion Status：全绿=DONE；ack defer=DONE_WITH_CONCERNS（defer 项显式列出）。

**块 5 出门自检：** 每编辑先 Read 后 Edit ✓ / 只改目标行（Surgical）✓ / invariants P1-P7 对照（E2 不触「等待回答」约束与问题数量；E3 不触 preamble/路径/FILE_END；P6 不涉）✓ / 断言可执行 ✓ / 溯源：每编辑指向 §A 具体 verdict ✓。

## §C 落地记录（2026-07-23 执行完毕）

- P1：plan-agent.md 类型闸 / brainstorm Rule 3 事实源+判据 / code-recon churn 一行——三处落地。
- P2：BENCHMARK-RUNBOOK 步①补注；靶子 §1 修正（5 docs 入 noise、计数 7/3、直读降级、F4 注记）。
  **installed-pins 零编辑**：4 单元 path 域当前 SHA 实测全部 == 既有 ack 697d4ce9（watcher 同款查询），
  已正确静音，无需推进——判官 D7-1 的推进指令以实测证据豁免。
- P3：vetting-registry `manual_vetting_2026_07_23` 追加；ADOPTED.md 第二批节；adoption-log 3 条；
  CHANGELOG [Unreleased] 一行式。
- P4：断言 A1-A7 全 PASS（含 check-routing-map / check-registration-sync 回归绿、教义未误伤 grep）。
- Completion Status：**DONE**——原 defer 项 GAP-decision-questionnaire 已经 luca 批准
  （「按照计划执行」）写入 gaps-register.yaml（status: open，触发条件与落法裁决内联），
  本轮采纳闭环无剩余挂起项。

<!-- FILE_END: 2026-07-23-mattpocock-update-consensus.md -->
