# G1 原生事件证据边界审计与窄重构 delta（待实施确认）

状态：`PLAN_ONLY / G1 BLOCKED`。这是 v3.2 的 G1 受影响部分的补充方案，不修改原计划或放行 P2。源自用户同意“先对 G1 原生事件投影与失败状态做整体审计，再给一份窄重构 delta 计划”；该同意仅授权审计和计划，不授权本方案的代码实施。框架 `NO_PIN`，不碰下游项目、共享 `docs` 别名和只读 `framework/`；不提交、推送、发布或运行付费 56 会话实验。

## 0. 前提与冻结身份

- 真问题：第五轮独立验收 `FAIL (7/9)`，健康索引下非布尔 `tool_result.is_error` 被真值化为失败，完整 manifest 后误报 `pass=true / RECOVERED`。这直接违反 v3.2 P2/T2 的“真实读取失败”资格门，不能作为一次自检绿灯忽略。
- 更薄替代：只把 `Boolean(block.is_error)` 改为严格比较能挡住已知四个值，但同一信任边界上的冲突状态、重复回执和未知事件尚未被判明；先完成事件证据域的窄审计与反例，不预设大重构。默认产出形态“重构”会偏向扩大改动；独立 Standards/Spec 两轴以默认 REFUTE 审视，只有可证伪的同源漏洞进入实现清单。
- `KILL-1`：若独立证据表明原生事件没有稳定可核验的状态/配对字段，或必须改 v3.2 U1 以外文件才能可信判分，则本 delta 作废，停止 G1 并请求新范围/判据，不臆造兼容事件。
- 批准计划 SHA-256 `2ca0cd4d696ae86a72bdabb9e7fc29960b1df42b57fead7605d4390888d4ba0a`；发布 `HEAD=05aa78adc431231455dabbfae94cccf362eb4339`、tree `d8e4c6b46b56e2a2738f4aa22f8b97169cbec9c0`。独立 B 候选 `/private/tmp/context-lightening-p1.kHzsIW/candidate` 仅改 `scripts/run-agent-context-ab.mjs`，文件 SHA-256 `837930f660f6fef98e398c4119323b6262a46c8eddbf3777b01545bd2bd9b908`；原补丁 `g1-r5-candidate.patch` SHA-256 `2b157a87a47fb18e72ba56536ecaf14920c01ad1aef26d7b23e56e43bc4ebbec`。七份旧试验和未跟踪索引保留在主工作树及已核验备份，不作为候选源。
- 来源：v3.2 P1→G1→P2、P2 回退定案、T2/A2、U1 精确文件范围及第五轮失败记录；未改 U1–U4、P1–P5 稳定编号。当前整体仅 P1 基线/保全完成（五阶段中 1/5，约 20%）；G1 未通过。

## 1. 审计结论与证据级别

### Standards 轴（只审代码证据边界，不替代 Spec 票）

- `Important / FAIL`：候选第 394 行把原生 `block.is_error` 用 `Boolean(...)` 投影为布尔。`"false"`、`"true"`、`1`、`{}` 均投影成 `true`；第 638/639、767–783、811–844 行随后把它当作真实索引读取失败，健康索引未完整读取而回退完整 manifest 仍得 `RECOVERED`。第五轮独立 32 项检查/6 项 mutation 中此项失败；本轮冷启动 Standards 复现 `"false"`、`[]` 通过而布尔 `false` 被拒。原样 A2 自检未取得独立执行票，记 `UNKNOWN`，不能从生产者绿灯补票。
- `Important / FAIL`：候选第 627–628、767–773、832–843 行的无验证 `Map` 对相同 ID 最后覆盖。冷启动 Standards 在健康索引的内存 fixture 中证实重复结果 ID、结果先于调用、调用/回执双方缺 ID 均可产出 `pass=true / RECOVERED`。这是配对证据伪造，不仅是潜在的代码 smell；真实原生客户端是否发出这些异常仍未知。
- `PASS`：Codex `null`、负数、字符串退出码目前未被当成失败；正整数 1 可证失败。改投影时不得退化。Standards 本轮最坏级别 `Important`、2 项发现；不是 G1 验收票。

### Spec 轴（只核 v3.2 P2/T2/A2/G1，不用 Standards 结论代票）

- `MAJOR / FAIL`：第 973–982 行只在 `parseAnswer` 成功时标记回答边界；第 503–507 行贪婪地从首个 `{` 截到最后一个 `}`。冷启动 Spec 在缺失索引根下用两端原生事件证实：决策前完整 JSON 答案后再附 `Additional detail: {"note":"done"}`，会让早答被漏认；之后补读 manifest 与其他启动文件，最终干净答案竟得 `pass=true / RECOVERED`。单独早答 JSON 可被拒，故不能只补同类单 JSON 测试。纯文本早答也被该解析式边界忽略。此项直接违背回退必须早于受保护决策/动作。
- `MAJOR / FAIL`：精确索引路径模拟 `EACCES` 时，第 755–762 行将不可读归为 `INVALID`，第 777→648 行在求读证据时再次抛出，完整 manifest 也没有恢复机会；与 P2/T2 明示的“真实不可读可回退”冲突。已证函数行为；未实际更改文件权限，也未完成整条 CLI 行为票。
- `MEDIUM / FAIL`：两端真实索引失败→完整 manifest→成功完整重读索引，全部在决策前；第 781 行把已成立的失败历史改判 `INDEX`，第 794–795、813 行又将此前合法失败和 manifest 读当违规，最终 `FAIL`。这是误拒而非安全放行，仍违反保留原始失败/`RECOVERED` 的合同。
- `PASS`：两端对健康完整索引、真实失败并完整回退的基础路径正确；部分索引、伪造失败文字、其他文件失败、部分 manifest 均拒绝。Spec 最坏级别 `MAJOR`，3 项发现、2 项通过、完整 A2 仍 `UNKNOWN`；不是 G1 验收票。

两轴 findings 分列，不合并、跨轴重新排名或用任一轴 PASS 抵消另一轴失败。

同一证据链需逐项证伪的风险（未有独立行为复现前不称“已证实绕过”）：

1. Codex `item.completed` 的 `exit_code`、`status` 与 `item.started` 的 `id`/命令对应关系：当前仅靠整数 `exit_code===0` 或 `>0` 分类，状态冲突/重复完成/同命令未完成是否形成错误放行须实测；缺码、负码、字符串和小数已由第五轮拒绝，不得回归。
2. Claude 顶层 `result.is_error`、未知 IO-capable 事件/块与终态：当前投影有选择地保留事件；核对原生有效样本和异常形态，不将一般文字或已识别 transport notice 误作工具失败，也不把未知活动静默当安全空 trace。

以上风险只允许在同一评分器原生证据边界内处理；若没有可证实的绕过，记录为测试覆盖/剩余风险而非扩大代码修改。已证实的索引不可读/恢复历史须作为 P2/T2 正反例修复，不借未知风险扩大实现。

## 2. 目标证据合同与最小实现缝

候选实现仅可改隔离 B 树的 `scripts/run-agent-context-ab.mjs`（v3.2 U1 已批准路径）；计划和验收记录写本主题 `framework-audit/`。不引入第二评分入口、运行时 CLI、新依赖或模型输出文字启发式。先用捕获的原生 envelope 和两端现有 fixture 定义输入，再在一个集中投影缝上形成以下互斥状态：

| 证据状态 | Claude Read/Bash | Codex command_execution | G1 处理 |
|---|---|---|---|
| 已证成功 | 完整可信 `tool_result`；错误标记为原生允许的 `false`/合法缺省，且可核对真实内容 | 已完成、可信整数退出码 `0`，状态不矛盾，内容确实交付 | 才参与 EOF/来源匹配；健康索引完整读为 `INDEX` |
| 已证失败 | 匹配的可信 `tool_result` 且 **原始布尔** `is_error === true` | 已完成、可信正整数非零退出码，状态不矛盾 | 仅索引读允许在决策前完整 manifest 后 `RECOVERED`；后续成功重读不能抹掉原失败 |
| 未知/冲突 | 无回执、非布尔值、重复/错配/矛盾回执 | 无码、异常类型/值、启动未完成、同 ID 矛盾终态 | 不授予失败回退或成功 EOF；候选不得 `pass=true`；保存原始证据与原因 |

冻结文件索引状态与事件状态分离：确证路径缺失为 `MISSING`、确证索引不可读为可审计的 `UNREADABLE`、机器投影字段不等为 `STALE`、manifest 无效为 `INVALID`。只有前三者或已证工具失败可引出完整 manifest 回退；源本身无效不得回退。评分器读证据遇到已确证的索引 `EACCES` 不应再抛成无票，也不能把其他文件不可读当索引失败。

“合法缺省”和状态字段可接受值必须由原生样本/已冻结 fixture 证明；不能为方便通过把未知值列为合法。失败回退资格只取同一决策前的可信失败或冻结文件的 `MISSING`/机器字段证实的 `STALE`，不取错误文字、模型自述或输出截断。对用户可见的早期回答/决策不能以 JSON 可解析性作为唯一门槛：单 JSON、带第二 JSON 的混合回答、跨 Claude 文本块与纯文本早答均须在其首次出现时截断后补证；若临时说明与决策不可机械区分，应保守拒绝，不以迟到读取洗白。迟到 summary/manifest、其他文件失败、部分源及越界读取一律拒绝。`RECOVERED` 是保留失败的恢复态，不回写成 `INDEX`。

## 3. 计划块与断言（尚未执行）

模式：Sequential + 独立 Supervisor 验收；Lightweight（一个实现文件、一份本主题记录），`model_tier=core-execution`，独立判官按现行 MR-004。无外部知识研究节点：目标是仓库已知评分器与本地原生事件证据，先用已捕获事件和原生 CLI 只读能力预检；不调用付费会话。各块 Source 均为 `inline: 用户同意 G1 原生事件投影与失败状态整体审计及窄 delta 计划`，同时追溯 v3.2 T2/A2/G1。

- `R-G1-2a`（只读，已在本轮进行）：冻结候选字节/diff，双轴隔离审查并建立“已证/待证”清单。门：两轴独立报告、相同精确文件身份；发现范围外根因停止修复计划。
- `R-G1-2b`（待另行批准）：先在健康/过期的真实临时索引根里加入红色反例；Claude 非布尔值、真实布尔失败、缺回执、重复/缺失/倒序 ID，Codex 缺码、异常码、状态冲突/ID 错配；另以缺失索引根加入单 JSON、混合双 JSON、纯文本与跨块早答后补 manifest；用可控读错误注入验证准确索引 `EACCES`，并在两端验证真实失败→完整 manifest→成功重读索引仍为 `RECOVERED`。已证实者修前必须红；其余先证伪再决定是否进入同一投影、文件状态与状态消费缝修复。保留正常 INDEX、合法 MISSING/STALE/UNREADABLE/真实失败 RECOVERED。门：新增反例修后绿，原有正反例不退化；不能把真实失败一律改判 FAIL。
- `R-G1-2c`（依赖 b，待另行批准）：Claude/Codex 双端离线 A2、T2 决策前后、EOF 内容与源路径、原生异常/unknown 分区；做有针对性的 mutation（把严格判断改回真值化、把未知码改成失败、绕开先决策时序，测试应转红）。独立只读验收拿冻结候选、原字节/逆补丁和独立构造反例回验，不复用生产者自检为独立票。门：全部 BLOCKING 过关才重开 G1，任何关键失败维持阻断，不推进 P2。

拟执行断言（实际实施时记录完整 stdout/exit code 与样本 hash）：

```sh
# [BLOCKING] G1-D1 — 两端离线自检含正反例与真实临时根（不调用付费模型）
node scripts/run-agent-context-ab.mjs --root . --arm candidate --harness codex --fixture F1 --trials 1 --concurrency 1 --self-test
node scripts/run-agent-context-ab.mjs --root . --arm candidate --harness claude --fixture F1 --trials 1 --concurrency 1 --self-test
# [BLOCKING] G1-D2 — 语法及精确差异
node --check scripts/run-agent-context-ab.mjs
git diff --check
```

`G1-D1` 必须在精确候选树执行；独立判官如受只读合同不能运行会写临时根的原样命令，只可记录 `UNKNOWN` 并另用不改候选的等价行为探针补证，不能把自检计为独立。`G1-D3 [BLOCKING]` 为独立验收的行为矩阵和 mutation 明细（五类已证问题：真值化、配对、混合早答、索引不可读、恢复历史；以及每个实际修复的同源漏洞）；`G1-D4 [BLOCKING]` 为计划/HEAD、候选 SHA、正逆 patch 与双端证据身份的重核。质量 criteria：C1 假失败/无配对不获 `RECOVERED`；C2 索引不可读/真实失败可恢复、重读不抹历史且原失败可见；C3 混合答案/纯文本早答、EOF、时序、作用域无退化；C4 两端同一合同而原生差异分别举证；C5 未把离线/字节证据冒充性能或 56 会话。

失败策略：任一 BLOCKING 失败即停止 G1 依赖批，保留每轮失败票、样本 hash 与候选字节；不 reset、覆盖主工作树或默认采纳旧试验。范围外改动、新原生能力不可验证或配置/费用未知，先报告并请求用户裁决。56 会话仍须事先展示两端模型/版本/工具、费用估计及精确 8 校准+56 上限参数并单独获批；本 delta 未授予该实验或发布权。

出门自检：来源与精确文件范围已绑；U1 的 G1 阻断不被改名绕过；无新增不可逆操作；研究省略理由、两端证据、独立票与停损门均明示。实施需用户对本 delta 再明确确认。
