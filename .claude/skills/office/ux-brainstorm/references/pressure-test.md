# UX Design Pressure Test — Reference Document

> Loaded by UX Brainstorm skill at Phase 2. Do NOT load at Phase 0.

---

## Part 1: Seven Forcing Questions (Raw Versions — for cold-start mode)

These are the raw versions used when no ux-research report is available.

### Q1 — Evaluability（可判断性）

**Core question**: 如果这个设计给用户一个输出（AI输出/系统推荐/自动填充）
，用户能在多快时间内判断它对不对？凭什么判断？

**Push Until You Hear**: 能说出具体的判断依据（哪些信息帮助用户判断）+ 能估算判断时间

**Red Flags**:
- 「AI准确率很高，用户不需要判断」
- 「用户可以学习判断」
- 「我们会做引导教程」

**Bonus Push**:
「如果用户判断错了——接受了一个错误的AI输出——后果是什么？
多久才会发现？」

---

### Q2 — Behavior Change（行为改变代价）

**Core question**: 这个设计要求用户改变什么现有行为？改变的代价是什么？

**Push Until You Hear**: 能指出具体的旧行为 + 新行为 + 切换成本

**Red Flags**:
- 「用户会自然接受的」
- 「比现在好所以用户会切换」
- 「我们的竞品已经验证了」

**Bonus Push**: 「如果这个产品明天消失，用户会退回到什么状态？还是已经回不去了？」

---

### Q3 — System Effect + Scope Boundary（系统性后果 + 场景边界）

**Core question**: 这个设计在用户的整个工作流里会产生什么连锁反应？
会不会在一个地方优化了，在另一个地方制造了新问题？

**Push Until You Hear**: 能说出至少一个可能的负面连锁反应 + 评估过影响

**Red Flags**:
- 「这个改动很局部，不影响其他地方」
- 「我们只改了这一个模块」

**Bonus Push**: 「如果AI替用户做了这件事，
用户自己做这件事的能力会不会退化？这重要吗？」

**Scope Boundary sub-question（场景边界——必问）：**

**Core question**: 这个设计覆盖用户工作流的哪些场景？
用户的标准作业流程里有多少种？
其中多少是纯结构化操作（填表/改字段/批量更新）？
多少涉及判断（评估/决策）？多少涉及对外沟通（邮件/电话/拜访）？

**Push Until You Hear**: 能给出场景的分类和大致数量 +
能区分「从这个入口进入」和「在这个入口里闭环完成」

**Red Flags**:
- 「全场景覆盖」（没有任何场景不覆盖 = 没想清楚边界）
- 「后面再考虑哪些不做」

---

### Q4 — Form Honesty（形式诚实性）

**Core question**: 这个设计的交互形式，有没有诚实地表达它真正做的事情？

**Push Until You Hear**: 能解释交互形式和功能本质之间的对应关系

**Red Flags**:
- 「这是行业惯例」
- 「用户习惯了这种形式」
- 「我们加了tooltip解释」

**Bonus Push**: 「如果一个从没用过你产品的人看到这个界面，
他3秒内能理解这是做什么的吗？他会把它类比成什么？」

---

### Q5 — Trust（信任建立与修复）

**Core question**: 用户第一次看到AI/系统的输出，凭什么信任它？出错之后，信任怎么修复？

**Push Until You Hear**: 能描述首次信任建立路径 + 错误后修复机制

**Red Flags**:
- 「AI不会出错」
- 「错误率很低」
- 「用户可以事后检查」

**Bonus Push**: 「一次AI错误需要多少次正确输出才能恢复信任？你设计了这个恢复路径吗？」

**仅AI/Agent场景触发。非AI场景跳过。**

---

### Q6 — Control（控制感与边界）

**Core question**: 如果AI/Agent代替用户执行了某个动作，
用户怎么知道执行了什么？怎么暂停？怎么撤销？

**Push Until You Hear**: 能描述可见/暂停/接管/撤销的具体机制

**Red Flags**:
- 「Agent不会做错事」
- 「用户可以在结果页看到」
- 「我们会加日志」

**Bonus Push**: 「用户在Agent执行到一半的时候想改主意，GUI上他看到什么？他能做什么？」

**仅Agent场景触发。非Agent场景跳过。**

---

### Q7 — Modal Collaboration（模态协作）

**Core question**: 用户现在在AI模态和GUI模态之间的真实切换模式是什么？
一个典型任务里，在两种模态之间切换几次？当前这个切换顺畅吗，
还是本身就是痛点？

**Push Until You Hear**: 能描述一个具体任务的模态切换路径 + 切换频率 +
当前切换的触发条件（是用户遇到问题才切、还是AI主动提醒才切）

**Red Flags**:
- 「用户不需要切换，全在Agent里完成」
- 「切换很自然，不需要特别设计」
- 「用户会习惯的」

**Bonus Push**: 「用户在GUI里改了AI刚才做的事情，AI知道吗？
两边的数据现在是怎么同步的？」

**仅AI+GUI共存场景触发。纯AI或纯GUI场景跳过。**

---

## Part 2: Grounded Versions (when ux-research report is available)

When a ux-research report exists, each question should be grounded with specific findings from the
report. The grounding pattern:

```
Instead of: "用户能在多快时间内判断对不对？"
Ground with: "ux-research D1发现[具体发现]。基于这个发现，
             在你设计的[具体交互]里，用户判断对错的依据是什么？"
```

Rules:
- Cite specific dimension and finding ID from the ux-research report
- Use the report's language/terminology, not generic phrasing
- If a finding already answers the question → convert to confirmation-only: 
  "研究报告D2发现[具体范式]有效。你打算在这个场景里怎么应用？"

---

## Part 3: Question Routing by Scope Tier

| Tier | Required Questions | Conditional |
|------|-------------------|-------------|
| Lightweight | Q1, Q4 | Q5* Q6* Q7* |
| Standard | Q1, Q2, Q4 | Q3, Q5* Q6* Q7* |
| Deep-feature | Q1, Q2, Q3, Q4 | Q5* Q6* Q7* |
| Deep-product | Q1, Q2, Q3, Q4 | Q5* Q6* Q7*（全部触发如适用） |

*Q5 only if AI involved. Q6 only if Agent involved. Q7 only if AI+GUI coexistence scenario.

---

## Part 4: Pushback Patterns

### Pattern: Vague Evaluation
**Trigger**: User says "users will figure it out" / "it's intuitive"
**GOOD response**: 「"用户会搞明白的"不是可判断性。我需要你告诉我：
用户看到AI输出后，他看哪条信息来判断对不对？是看来源引用、置信度、
还是和自己已知信息的对比？」
**BAD response**: 「That's an interesting point, maybe we could explore how users evaluate...」

### Pattern: Feature as Solution
**Trigger**: User describes a feature instead of answering the design question
**GOOD response**: 「你描述的是一个功能。我的问题是：用这个功能的时候，
用户在做执行还是在做判断？如果是执行，为什么不让AI做？」
**BAD response**: 「That feature sounds promising! Have you thought about...」

### Pattern: Competitor Copy
**Trigger**: User says "X product does it this way"
**GOOD response**: 「竞品这么做，不代表这么做是对的。ux-research
D3有没有找到这个范式的失败案例？如果没找到，
那说明我们缺少反向证据，不是说这个方向是对的。」
**BAD response**: 「Great benchmark! We could adapt their approach...」

### Pattern: AI Optimism
**Trigger**: User assumes AI will be accurate / fast / trusted
**GOOD response**: 「AI准确率高不等于用户信任它。ux-research
D4有没有关于用户接受度的研究？第一次用的用户，凭什么信？」
**BAD response**: 「AI accuracy is indeed impressive, and users will likely...」

### Pattern: Scope Creep via AI
**Trigger**: User wants to add AI to everything
**GOOD response**: 「你想让AI介入这个节点。但Phase
2.5的AI评估显示这个场景的Evaluability是{等级}。
如果用户需要30秒才能判断AI输出对不对，加AI反而增加了认知负担。」
**BAD response**: 「AI could definitely enhance that! Let's explore how...」

---

## Part 5: Banned Phrases (ABSOLUTE — applies to Phase 3 and Phase 4)

Never say:
- 「这个想法很好」/ "That's a great idea"
- 「有意思」/ "Interesting"
- 「这是个好问题」/ "Great question"
- 「你可以考虑」/ "You might want to consider"
- 「也许可以」/ "Maybe you could"
- 「确实」without evidence / "Indeed" without evidence
- 「用户体验会很好」/ "The UX will be great"
- 「这个设计很流畅」/ "This design flows well"
- 「符合行业惯例」without naming which convention and why it applies
- 「参考业界做法」without citing specific product + specific practice

Replace with: state a position, cite evidence (from ux-research or Phase 3 answers), defend it.

---

## Part 6: Escape Hatch

If the user pushes back on the interrogation process itself (not on a specific question):

- **First pushback**: narrow to the 2 highest-leverage questions (Q1 Evaluability is always one of
  them). Say: 「我缩到2个问题。这两个不回答，
  设计方案的方向判断会缺关键信息。」
- **Second pushback**: respect it. Say: 「好，我用现有信息推导方案。
  标注信息不足的部分为"未验证假设"。」 Then proceed to Phase 4 with explicit
  caveats.

---

## Part 7: Internal Pressure Test Protocol (Phase 2 use only — NOT surfaced to user)

Run the following against Phase 1 output + ux-research report (if available):

### Step 1: For each Q1-Q7, check if research already answers it

```xml
<pressure_test_findings>
  <preanswered_questions>
    <q id="Q{N}">{question} — answered by D{X} finding {ID}: {summary}</q>
  </preanswered_questions>
```

### Step 2: For unanswered questions, ground them with research evidence

```xml
  <sharpened_questions>
    <q id="Q{N}">Grounded version: {cite specific finding + ask the gap}</q>
  </sharpened_questions>
```

### Step 3: Identify the weakest design assumption

```xml
  <weakest_assumption>
    <assumption>{the single weakest assumption about user behavior or AI feasibility}</assumption>
    <source>{which Phase 1 agent or research finding surfaced it}</source>
    <must_test_in_phase3>true</must_test_in_phase3>
  </weakest_assumption>
```

### Step 4: AI时代范式透镜检查（新增）

对每个ux-research的CONSENSUS发现，检查：

```xml
  <paradigm_lens_check>
    <finding id="{N}" claim="{主张}">
      <user_action_type>execution | judgment | mixed</user_action_type>
      <if_ai_replaces_execution>Does this finding still hold? {yes/no + reason}</if_ai_replaces_execution>
      <paradigm_shift_flag>{true if finding assumes traditional GUI interaction}</paradigm_shift_flag>
    </finding>
  </paradigm_lens_check>
```

### Step 5: Route final question set

```xml
  <routed_question_set>
    Questions for Phase 3: [Q1, Q3, Q4, ...] based on tier + gaps + pressure test
  </routed_question_set>
</pressure_test_findings>
```
