# Decision questionnaire — 向知情收件人补齐决策缺口

消费者：research-kit 的显式 `entry_mode=decision-questionnaire`。准备一份 Markdown
discovery questionnaire，让发送者交给一位知情者异步填写或在会中一起填写。发送者缺少背景，
收件人拥有它；问题瞄准双方知识差，而不是让发送者先假装知道答案。

## 1. 先确认发送合同

先向发送者确认收件人的 **role / expertise / relationship**，一次交流收齐这一组：
对方以什么身份回答，熟悉哪些事，与发送者有什么关系，哪些知识是对方独有而发送者欠缺的。
以真实回答决定语气、术语和需要携带的背景；已有信息不重复问，缺失信息不由名称或职位猜测。

再一次确认 **need-back decisions/facts**：发送者无法独自解开的具体决策或事实，回答回来后
必须能做什么决定/动作，以及原决策 owner 是谁。采访的是 send（对象与所需回报），
不审问发送者那些他不拥有的 subject knowledge。对方本身也不知道某事实时允许 unknown，
不能把 sender 或 recipient 的缺知识包装成数据支持。

起草前绑定以下输入；它们记录事实和许可，不新造一套状态真值：

| 输入 | 要确认的内容 |
|---|---|
| recipient | role、expertise、relationship 与独有知识范围 |
| need_back | 逐项具体决策/事实缺口、重要性及答案让原 owner 可做的决定/动作 |
| send_context | from/to、简短已知背景、purpose、答案用途；时限和愿意投入的 effort |
| return_contract | 原 owner、scope、resume_target；内部调用还保留原 U-ID/authority_record 与权限交集 |
| output_path | 命名约定下真实根的精确授权路径、add/修订边界与 preimage/CAS |

recipient、need-back 或精确授权 output_path 任一缺失时，真实追问并等待，NEEDS_CONTEXT，
不写问卷。deadline 尚未定就标明待确认，不能伪造承诺；effort 若是起草估计，明确标为估计并
由发送者确认。need-back、回流用途或范围有未决选择时，按 grilling 的 design-tree/frontier
程序逐轮取得发送者的真实答案，只处理 send；保持原 caller 的 UID/scope/resume_target。
不要求发送者在这个澄清过程中先答只有收件人能答的主题事实。

输出使用 research-kit 原有 `docs/research/research-kit-<topic>-<YYYY-MM-DD>.md` 约定；
同日重跑加 `-001` 序号不覆盖。先确认该约定下批准的真实根与精确 canonical path；
来源技能的 cwd/to-questionnaire 命名不移植。cwd、目录名、共享 docs/ 或软链接不是项目 pin
或写权。不得自动创建项目、目录树或新 Workflow；写前重读批准目标与 preimage，保护用户编辑，
不能用旧缓存覆盖已变化文件。没有目标或 handoff 写权就只问清，不扩大 scope。

## 2. 建立逐项覆盖再写题

把每个 need-back 项标成稳定 ID，并保留发送者实际说出的决策/事实与重要性。每个事实项也
说明它服务的原决策或动作。覆盖表至少有：

| need-back ID | 原决策/动作与 owner | 问题 ID | 期待的回答类型 | 收件人的回答依据 |
|---|---|---|---|---|
| <实际 item> | <实际决策，不编补> | <Q ID> | <具体事实/范围/约束/取舍依据等> | <已确认的知识范围> |

表中尖括号仅是结构说明；实际问卷须替换为已确认的 send 内容，不留下不存在的决策。
每个 item 至少对应一道题，每题都映射它真正服务的 decision/item；绑不上的删掉。
覆盖不代表已有答案或决策已解决。回答类型应让收件人知道需返回什么，不预填答案、选项结果
或范例回复，不暗示期望立场；需要依据时可在回答提示中让其注明来源、限制或不确定性。

按 **最重要的决策缺口优先** 排题，异步可能只得到一次机会。用 `##` 按主题组织，
主题顺序也优先服务最重要的 item，主题内仍按重要性排列。每题只有一个 idea；例如“预计负载
和预算是多少”要拆为两题，两题分别绑定所需决策。除确有必要防误解的题外，不堆解释；
需要时加一行 why-it-matters，说明这道题会影响什么真实决定，而不是说服对方接受某答案。

## 3. Markdown 文档结构

下面是结构模板，不是已生成的问卷、真实回答或研究结果。按已确认内容替换占位符；
每题题下的引用块是 **空 answer stub**，交给收件人填写。不得把模板示例当作用户事实。

```markdown
# <问卷标题>

**Purpose：** <为什么问、哪项真实决策依赖回答>

**From：** <发送者> · **To：** <收件人>
**How your answers will be used：** <原 owner 会怎样使用、回到哪个 scope/resume_target>

## Context

<一个简短段落；未参加前述讨论的人也能回答，只陈述已知背景>

## How to answer

<已确认 deadline，或明确待确认；预计 effort 并标明其性质>
可以只回答一部分；“不知道”也有用。请注明不确定性，不必猜答案。

## <最重要主题>

### Q-01 — <单个 idea 的问题>

对应决策/need-back：<实际 ID>；回答类型：<需要的事实、范围、约束或依据>
_Why this matters：<仅必要时，一句真实决定的关联>_

>

## <其余主题，按重要性>

### Q-02 — <另一个单独 idea>

对应决策/need-back：<实际 ID>；回答类型：<类型>

>

## Anything else?

有没有我们没问到、但原决策所有者应知道的事？

>
```

问题少时一个主题即可，不为凑数量增题。anything-else 是允许收件人补充的单独收尾题，
注明其回流用途；它不能替代 need-back 的逐项显式覆盖。目的、from/to/use、简短 context、
deadline/effort、partial/unknown 说明、主题、单题单 idea、空 stub 和补充题都要存在。

## 4. 质量门与反路由

- 每个实际 need-back item 都已被题目覆盖；每题有实际决策映射、回答类型、独立 idea 与空 stub。
- 问题针对收件人的知识差，重要的先问，语气与背景适合已确认 role/expertise/relation。
- 收件人无需猜发送者脑中的背景；unknown/partial 是合法回复，不把未答题补成默认答案。
- 不用引导、复合问题、不可理解的内部行话，也不编引用、回复、调研发现或决策结论。
- 这是面向特定知情人的 discovery questionnaire，不套 Likert/NPS/SUS 或群体样本统计；
  原四研究模式的量表、研究编码和样本门仍只属于原模式。量化分布用原 Survey；真实访谈、
  测试或卡片分类用原工具；已有真实一手资料并明确要解读时才另行进入 insight-synthesis。

全部检查通过只说明工具可交付；不能据此宣称数据已采集、决策已完成或方法产生增益。

## 5. 回原决策所有者

落盘后回读工具，确认逐题覆盖和真实路径；返回原 owner 的 questionnaire 路径、need-back/
question 映射及未决项。准备此文件不授予发送、催办、连接外部系统或采集权限；实际交付给
收件人及收答由人完成。本 skill 不自动发邮件/消息/问卷，不编回复，不隐式启动新研究循环。

若用户以后提供真实回答，保持原文、来源与不确定性，逐 item 返回原 owner 与同一
scope/resume_target；未答仍标未答，由原 owner 决定下一步，不代他做决定，不把答案自动
送到 insight-synthesis。若用户另行明确选择研究综合，应重新满足那个 skill 的输入、主题确认
和授权合同；问卷模式的完成不能冒充那套门禁。

需要共享 handoff 时记录 mode、实际路径/SHA、recipient、need-back 覆盖、原 owner/
scope/resume_target、已解决 send 决策与未答项。遵守共享 handoff-protocol 的实际
context-cost/终端与续接条件，沿用 research-kit handoff 命名并先确认精确写权；不把该技能
旧用途的轻量豁免自动延伸到此分支，不写 workflow-state 或 memory。

## 来源与验收绑定

移植来源：Matt Pocock，`skills/productivity/to-questionnaire/SKILL.md`，MIT；冻结
commit `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`，Git blob
`dadd0c00d6a350acaa15bb9ca1b96b20ead684ca`，SHA256
`b5eb929842ee0e93d867c5e906d183d350f2f2d149eaeaa86967d94d8eda1d3b`。
同目录 `agents/openai.yaml` blob `a58d14765beb4acb4c9708b516310558e1308a22`、SHA256
`9e8a06c38c8842eea8d4922cb9d1ead8e3ace647bab259b943c994a1b4742bc2`；其
`allow_implicit_invocation: false` 转为本地显式 mode 门，不增加独立 to-questionnaire 入口。
唯一方法绑定为 source 36 / M36 / F36；M36.P01/P02/N01/E01 与 M36.G01 的正式观察、
两 arm 比较及省略试验依冻结方法矩阵执行。当前内容阶段 native behavior = NOT_RUN，
capability adoption = PENDING；静态检查不构成 gain，UNKNOWN 不能作为 baseline FAIL。

<!-- FILE_END: research-kit/references/decision-questionnaire.md -->
