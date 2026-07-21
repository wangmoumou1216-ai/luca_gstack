# Skill Authoring — 写好 skill 的正面手艺

> 与 `skill-invariants.md` 互为表里：**那边守"哪些不能改"（保护区），这边教"怎么写好"（手艺）。**
> 写/改任何 SKILL.md 或框架文档前读本文件；创建新 skill 的流程走全局 `skill-creator`，质量标准查这里。
> 源：mattpocock/skills writing-great-skills 体系（MIT，pin 391a2701），经 2026-07 对标全评估
> 适配我方语境（评估链：framework-audit/mattpocock-benchmark-2026-07/）。

## 0. 根德性：Predictability（可预测性）

**skill 存在的目的，是从随机系统里拧出确定性——同样的触发走同一个 process，不是产同一个 output。**
下面每一条手艺都服务于它；成本与可维护性是它的症状，不是与它竞争的目标。
判断任何一处写法好坏，先问：这让 agent 每次跑得更一致了，还是更飘了？

## 1. 调用成本模型（何时切分/隐藏/暴露）

每个 skill 沿"谁能够到"付两种成本之一：
- **context load**：一级可见/被模型可达的 skill，description 每轮驻上下文——花 token 与注意力；
- **cognitive load**：隐藏/仅按名调用的 skill，luca（或 CLAUDE.md 语义规则）是记住它存在的索引。

**Granularity 原则：每切一刀（拆一个新 skill/新入口）花掉两种 load 之一——值回票价才切。**
这是"使用即留任"（运行期治理）的设计期前置问：新建前先论证这刀的 load 由谁付、为什么值。
我方既有形态对照：一级可见=付 context load；隐藏 skill=付 cognitive load（CLAUDE.md 语义兜底
承担索引）；references/ 资产=零入口零 load，被动引用——**组合优于重复**：几行引用一个厚
primitive，胜过复制它（例：muse-proto-gen 复用 html-prototype 防 slop 规则）。

## 2. Leading word（先导词）技法

**把一片行为锚在一个模型预训练里已有的压缩概念上，作为裸 token 反复出现（不是成句解释），
让它在全文累积出分布式定义。** 例：对方 wayfinder 的 fog-of-war、diagnosing-bugs 的
red-capable loop；我方已在非正式使用的：红线、护栏、薄壳、承重墙——本文件把这个手法显式化。
- **预训练词 > 自造词**：自造词招募不到先验，要用定义 token 偿付预训练词免费给的东西。我方
  自造词（命名即切换/读前先写/双仓一致）能活，靠的是 CLAUDE.md 每 session 注入反复曝光——
  新写作时先找现成词，确无再自造并接受其注入成本。
- **双锚定**：同一个词写进正文锚 execution，写进 description/触发词锚 invocation。我方
  invocation 主要靠 route-guard 词表（确定性，承重不动），leading word 补的是语义兜底层
  与正文行为锚定的质量。

## 3. 信息层级三阶梯（SKILL.md 内容怎么排布）

按"agent 多快需要这份材料"分层：
1. **in-file steps**——执行必经的步骤，写在正文；
2. **in-file reference**——同文件内的参考节（表格/清单），步骤指过去；
3. **disclosed reference**——独立文件（references/ 或 skill 目录内），经 context pointer 按需读。
**context pointer 的措辞决定 agent 何时、多可靠地够到材料**——"见 X"弱于"做 Y 前必须读 X 到
FILE_END"。co-location：材料放在离用它的步骤最近的一层；顶部保持可读（the top stays legible）。
我方懒加载协议是 runtime 面的同构物；本条管的是**单个 SKILL.md 自身的排布**。

## 4. 六个失败模式（诊断 skill 问题用，各配解药）

| failure mode | 症状 | 解药 |
|---|---|---|
| **premature completion** | agent 半途宣告完成 | 锐化完成判据（可执行/可观察）；后续步骤藏进拆分，不让"看起来做完了" |
| **duplication** | 同一行为写在两处 | 单一真值源；一处权威 + 他处指针（改行为=改一处） |
| **sediment** | 陈年层层堆积（加安全、删危险） | 定期逐层问"这层还承重吗"；敢删（我方对应：使用即留任 + 框架建设预算的响应式优先） |
| **sprawl** | 一个 skill 越长越什么都管 | 按 granularity 原则拆或砍 scope；一个 skill 一个 defining constraint |
| **no-op** | 某句话不改变模型默认行为 | 逐句问"删了它输出会变吗"；不变→删（行为 A/B 是机器版本档） |
| **negation** | 靠"不要 X"堆砌 | 改写为正面指令 + 一个反例；禁令只留真红线 |

## 5. 修剪纪律（Pruning）

- **每个含义一个权威落点**——改行为是一处编辑（我方 SSOT 惯例的 skill 文本版）。
- **逐行 relevance 检验**：这行对"agent 下一步做对"有贡献吗？
- **逐句猎杀 no-op，激进删**：该删的整句删掉，不是裁词重写（most prose that fails should go）。
- **anti-cargo-cult**：指针/依赖声明只放在承重处——某步骤真需要某配置/文件才写"先做 X"，
  不要因为别的 skill 写了就照抄。
- **defining constraint 必点**：每个 skill 的 description/用途行必须能读出**它区别于默认行为
  的那一个事实**（例：/idea="忠实结构化，不延展不推断"；design-brief="收敛引擎"）。易混对
  （ux-brainstorm vs design-brief 类）的消歧注记是它的显式形态——新 skill 登记进 CLAUDE.md
  表时，用途列写不出 defining constraint = 还没想清楚这个 skill 是什么。

## 6. 与我方治理面的接线（写完之后）

写好只是一半；skill 要**可达**才存在：routing 词条（skill-routing-map.yaml）→ /office 登记
（如一级）→ input-modes → workflow-graph（如入流程）→ model-routing 三问 → parity 锚点
（双仓）→ FM-11 可达性实测。保护区红线查 `skill-invariants.md`（P1-P7）；行为改动过
FUSION 行为 A/B。编排层可达契约见 ORCHESTRATION-INTEGRATION（对标产物，模式可复用）。

**登记 ≠ 生效——还要接"消费面"（2026-07-21 补：登记齐全但决策逻辑没提它，等于没加）。**
上面是**曝光面**；曝光面登记完，再逐条问"**谁会读这条登记、它的真值逻辑提到这个 skill 了吗**"：
- **`.claude/agents/plan-agent.md` 块 2「研究方向编排」**——研究类 skill 必查。graph 的
  `research_default.tool_choice` 只是登记，Plan Agent 排研究 Phase 时是按块 2 的角度枚举做判断的；
  块 2 没写进去，它永远不会被推荐（实证：research-kit 曾登记齐全但块 2 漏列，靠用户提问才发现）。
- **`CLAUDE.md` 语义兜底段**——触发词覆盖不到的意图（词表是粗网），语义描述里要能读出该 skill。
- **相邻 skill 的正文指引**——上下游关系要在对方 SKILL.md 可改区落一句（如"还没数据？先跑 X"），
  否则跨 skill 转介只存在于图里、不存在于运行中。
自检一句：**"如果用户不说出触发词，这个 skill 会在什么判断路径上被想起来？"** 答不出=消费面没接。

<!-- FILE_END: skill-authoring.md -->
