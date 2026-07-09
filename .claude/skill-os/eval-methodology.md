# Eval Methodology — 统一评估方法论（认知层参考）

> **定位声明（必读）：** 本文件是被 `handoff-protocol.md`（criteria 块格式）与
> `plan-agent.md`（产出质量 criteria 子类）**引用**的方法论参考（how）；
> **触发保证不在本文件**——评估何时必须发生由三层绑定点保证：
> ① handoff 契约（重型 skill 完成必写，含 criteria 块）
> ② `scripts/check-quality-gates.mjs`（CI/verify.sh S14 硬校验 criteria 存在性）
> ③ Plan Agent 断言（复杂任务计划时定义产出质量 criteria）。
> 本文件不是触发点，不要给它接任何自动加载逻辑（防 prose 空转，2026-07-09 final-plan E4）。

---

## 1. 统一 Eval 定义（五要素，缺一不算 Eval）

```yaml
eval:
  task: 评估对象（某 skill 的一次产出 / 复杂任务的最终交付物）
  success_criteria:            # 3-7 条；每条二元可判定；每条绑一个真实 failure mode
    - id: C1
      criterion: <可 true/false 判定的一句话>
      failure_mode: <这条防的真实失败，来自失败归类（§2 Step 2），不许拍脑袋>
      evidence: <判定必须给出的证据形式：引用/行号/命令输出>
  grader: code | llm-judge | human   # 选型规则见 §2 Step 3
  verdict:
    per_criterion: pass | fail | unknown   # unknown 逃生口，防幻觉硬判
    overall: PASS | FAIL | CONDITIONAL_PASS # 沿用 quality-gate 现有三态
  iteration: <FAIL 处置（退回哪个 Phase）+ criteria 演进规则（漏网失败→新增 criterion）>
```

对照现状归类：tech-spec Phase 5 / task-plan Phase 7 / plan-agent shell 断言 =
`grader: code` 的 Eval（客观覆盖率，已达标，零改动只归类）；quality-gate Skill Mode
= `grader: llm-judge`；taste-review / ux-audit = `grader: human`（锚点法）。

## 2. 轻量四步法

**Step 1 — 定义无歧义成功标准。**
产出 = criteria 表（3-7 条，二元）。合格判据：**"两位领域专家能独立得出相同 pass/fail"**；
写不出二元判定句的标准（"功能正常""质量好"）退回重写——与 task-plan Phase 7
"模糊断言 FAIL" 同源，此处推广到所有产出类型。

**Step 2 — 轻量失败归类（criteria 的唯一合法来源）。**
禁止脱离数据拍脑袋写 rubric。做法：翻**已发生的真实失败**——episodic 记录、
`observations.jsonl`、门禁 FAIL 记录、handoff-review FAILED 项、redteam findings——
归类命名，**失败类别即 criteria 来源；有多少用多少，不凑数**（个人 OS 规模下不搞
20-50 case 仪式与 open/axial coding 全套编码流程——那是给有海量 trace 的团队设计的）。
归因约定：只记 **first upstream failure**（LLM 管线是因果系统，级联下游不重复记）。

**Step 3 — grader 选型（按优先级）。**
1. **code assertion**（最优先）：确定性 end-state——文件存在 / ID 覆盖率 / 语法 / 结构。
   便宜、可复现、无偏见。能用 code 判的绝不用 judge。
2. **llm-judge**（品质类：faithfulness / completeness / consistency——用业界标准指标名，
   不自造轮子）：**逐 criteria 二元判定 + 每条附证据 + unknown 逃生口 + 偏见规避**
   （位置/长度/自我偏好）。格式参考「逐 AC 二元判定 + 每条附证据 + 4 类偏见规避 + 冷启动隔离」
   的评分卡（见 handoff-protocol v3.2 criteria 块 / quality-gate Skill Mode——该格式的 judge 校准
   仍是 aspirational，只作**格式参考**，不当作已验证组件）。禁止无 rubric 的 1-10 整体打分（旧 `Score: N/10` 模式，2026-07-09 废止）。
3. **human + 锚点**（品味/主观域）：taste-review / ux-audit 保持现状，兼作 llm-judge 校准源。

**end-state 优先原则**：grade what the agent produced, not the path——评产出不评过程
（便宜、可复现、给创造性解法自由）。已知反方主张（Agent-as-a-Judge, arXiv 2410.10934：
多步 agent 应评轨迹）在个人 OS 规模下不采纳；仅保留一个 trajectory 例外：
**结果对但绕过治理门槛（红线/晋升门/only-through 路径）也判 FAIL**（anti-false-positive）。

**Step 4 — 迭代。**
FAIL 退回沿用现有机制（task-plan Phase 7 退回模式 / handoff gate FAIL 处置）。
**criteria 演进规则**：每次真实失败若未被现有 criterion 捕获 → 新增一条 criterion
（附 failure_mode 出处）；eval FAIL findings 是合法的 observation 写入源
（`observability/scripts/write_observation.py`，闭环机制不变，只是扩一个入口）。

## 3. criteria 块标准格式（handoff / quality-gate / Plan Agent 共用）

```yaml
gate_result: PASS | FAIL | CONDITIONAL_PASS
criteria:
  - "[C1] <二元判定句> → PASS（证据: <引用/行号/输出>）"
  - "[C2] <二元判定句> → FAIL（证据: ...）"
  - "[C3] <二元判定句> → UNKNOWN（原因: ...）"
```

规则速记：3-7 条；每条绑真实 failure mode；每条给证据；UNKNOWN 合法（judge 不确定时
不许硬判）；overall 可附通过率（如 `PASS (5/6)`）。

## 4. 不做清单（防 scope 蔓延，均带触发条件，见 final-plan §4）

- 不解冻 GEPA eval 数据层（GAP-eval-frozen）；不建 judge_eval.py；不写 pairs.jsonl。
- evals skill 维持 dormant；eval-log.jsonl 为唯一记录层。
- Solo Mode（不写 handoff 的轻任务）强制评估：measure-first 延后。

<!-- FILE_END: eval-methodology -->
