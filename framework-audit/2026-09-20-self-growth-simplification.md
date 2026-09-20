# 自我成长：保留与退出清单

日期：2026-09-20。范围：当前 luca_gstack 检出的框架自成长，NO_PIN。
来源：用户要求“有些好像没用到，少即是多，应该进行干净化处理”，批准先盘点、再确认具体清理项。
基线 HEAD：77a99dde974508b9026d57055510c309ab6c99d6。

## 状态与边界

- P1 链路盘点已完成；P2 本地证据核对已完成；P3 清单已形成，独立反证已返回，两项撤防风险保留未决，不是实施放行。
- 本轮只新增本报告；未删除机制、执行治理、启动扫描、读取下游项目或发布 Git。
- 开始时工作区已有页面库、design-brief、open-design、CI、CHANGELOG、package.json、verify及相关脚本等用户改动，另有多份未跟踪计划；全部保持原状。
- 使用现有源码、登记和本检出日志；不是全历史使用率审计，不证明宿主调度器实际运行健康或双运行时等价。
- 顺序：核实触发/消费者 → 候选分级 → 人裁 → 另行批准实现与行为验证。外部对标不在本轮范围。

## 结论

优先退出已冻结采集支路的运行说明与代码。定期扫描和全量复盘只列讨论项：独立反证发现其附带检测职责，当前不足以支持直接退出。保留纠正、检索、受控晋升和确定性验证。没有证据支持把整个记忆或反馈系统删除。

| ID | 处置提议 | 证据与理由 | 影响、边界与恢复 |
|---|---|---|---|
| SG-01 | 移除候选：冻结的 GEPA 采集支路 | `memory/README.md:92-99` 明确 FREEZE；本检出 `memory/evals/html-prototype/pairs.jsonl` 为0字节；但 `memory/evals/README.md` 仍要求每批session追加，`memory/evals/scripts/collect_eval.py` 和 schema 仍保留使用命令。冻结状态与操作说明矛盾。 | 只针对 collector、该空pair文件和专属schema/过时说明；不删除整个evals目录，不碰eval-log、routing fixtures、behavioral_ab。保留一条历史退役说明；未来有真实优化实验再明确恢复。收益主要是维护清晰度，不声称省下实际采集耗时。 |
| SG-02 | 移除候选：冻结 run-log writer 与常规说明 | 本检出 `.claude/observability/run-log.jsonl` 不存在；office `SKILL.md:226-240` 写“冻结勿执行”却仍携带完整命令；observability README称每次skill运行一行；evals skill仍有 `Run log written` 指标。 | 移除writer前清掉所有调用/指标引用，以一条冻结历史说明收口；保留observations、短规则、eval-log。不是补采集，也不伪造零字节文件；不删除其他检出可能存在的历史日志。 |
| SG-03 | 待裁且有前置缺口：月度广域scout改按需 | `session-restore.mjs:643-673` 以当月digest缺失判到期；9月合并补跑，13个发现/4个核验/0通过，历史曾有CONDITIONAL，不能说从未有用。独立反证：666-668还搭载场景覆盖报告，且注释记录没有机械触发的既往风险。 | 必须将“找外部能力”与“检测现有能力可达性”分开裁决；不能连配套检查一并退出，也不能称保留失败提醒就等价。先明确场景覆盖的独立触发或显式接受损失。Q4/10-02既有待办保留；本轮不放行。 |
| SG-04 | 待裁且有前置缺口：采纳复盘改增量 | `framework-evolution-scout.js:295-325` 对EACH fused entry复盘；9月38条中28条watch，但也实际发现两项未登记在位性变化，9月14日完成追认/替代登记。当前39条；成本增长与检测收益同时存在。 | 修改前必须说明怎样发现未登记变化。仅保留人工全量入口不等于存在触发者，当前未证明替代等价，不放行关闭全量复盘；也不为替代新建重型监控。 |
| SG-05 | 合并候选：采纳事实只维护一处，ADOPTED退为索引/必要叙述 | `ADOPTED.md:3-5` 自称人读速查、明细归adoption-log；BENCHMARK出口要求更新多个记录。但ADOPTED也存有MIT署名、供应链和回滚等信息，不能按“重复文件”直接删。 | 先逐字段核对唯一内容，再让结构化采纳事实只改adoption-log；保留唯一证据和署名链接，不新建生成器除非明显比短索引更简单。candidate-log管发现/拒绝，pins管安装path，benchmark registry管repo复审，三者不是相同台账，不一并合并。 |
| SG-06 | 待查，不进入首批删除：两个scout是否可合并 | `external-skill-scout.js` 有focus/extraExisting、3硬门和4软分；framework scout以gap/source为基准，还含单点评估和复盘。两者有重叠但非同一合同。runner及测试仍引用external scout。 | 未查完整真实调用历史；仅入口重叠不足以证明可替代。若继续调查，先做参数/门禁/输出映射，再决定是否退出，不为合并另造通用平台。 |

## 保留与暂不扩大

| 内容 | 当前依据 | 判断 |
|---|---|---|
| 经验提取门槛、纠正归因、pending证据和晋升门 | extraction-bar / correction-attribution / memory README；将捕获、裁决、存储分开，防止直接把经验变稳定规则 | 保留。积压不等于候选无价值；本轮不清历史待办、不取消人工门。 |
| observations → 按skill过滤的短规则 | `office/SKILL.md:179-185` 明确消费者get_rules；本检出observations有28条 | 有实际存储和读取接线，不判为孤儿。实际预防效果未逐条归因。 |
| 每日治理核心 | daily_governance `FORCE_WEEKLY_DAYS=7`；1590后已实现变化/异常或周心跳才写digest | 已有降频，不再提“加一个降频系统”。不运行其主入口，因为会晋升/归档/写digest并可能联网。 |
| eval-log与检索记录 | 本地eval-log有35条，daily_governance 1673后消费；检索筛source=live且排除e2e后有262条search、51条mattered标注 | 不是零数据管道；mattered只是主观标注，不等于51次独立效果。保留，不凭旧报告0条的叙述关闭。 |
| 窄效果反馈通道 | adoption-log当前39条、6条feedback_history，3条helped=yes；9月14日digest裁决明确其中两条同一任务 | 近期已使用，不新建反馈平台，不把3行当3个独立样本。 |
| 源登记和对标/版本基线 | sources S4/S5当前off；benchmark与installed pins分别repo/path域 | 已停来源无需再报一次“清掉”；保留差异语义，不把两种版本比较硬揉成一个。 |
| 安全门、确定性测试、受控写入 | 现有运行合同 | 不在本批撤除范围。需要改动时另做历史风险及替代防护反证。 |

## 本地核对记录

2026-09-20，直接只读解析当前文件，不运行写入入口：

- pairs：0字节/0行；run-log：不存在（不是声称文件0字节）。
- eval-log：35条JSON，解析错误0；记录日期最晚2026-09-05，不能据此宣称近期写入链健康。
- observations：28条JSON；adoption-log：39条JSON；candidate-log：82条JSON，均解析错误0。
- retrieval-log：当前500条；按digest近似过滤口径（source=live，排除query含e2e、cwd含agent-e2e-test）得到262条search、51条mattered；这不是最近30天、不是全部历史，日志还在被其他会话写入。
- candidate run_summary：2026-06b-verify-resume有3 conditional；2026-07有1 conditional；2026-09有4 verified/4 rejected。未把infra-blocked的verify=0计作无收益。
- 最新人工处置以9月digest末尾2026-09-14表为准，不用开头9月10日的待裁建议代替当前状态。
- 未读取个人记忆候选、下游产出、全量transcript；未验证launchd模板是否实际安装。

## 验收与下一步

本轮判据：每项有定位；零使用与无需求分开；明确副作用/恢复；不删除运行机制；保存既有WIP。

建议首批只批准SG-01/02的具体退役设计；SG-03/04有实质检测职责，先补替代/损失说明再交人裁，不能当纯提醒偏好；SG-05先做字段迁移清单，SG-06暂不动。批准清单不等于允许Git发布或删除历史证据。

独立反证：`simplification_refute`，冷启动、只读、default-REFUTE。SG-01/02/05/06及保留项stands；SG-03/04 modified，依据已纳入上表。终版文字回验已确认忠实纳入两项限制；不构成实施放行、行为验证或双运行时验证。

机械核对：只读JSON解析与上述计数成功；报告6个候选ID及基线/证据/恢复字段均已用rg读回。一次组合断言命令被路径守卫拒绝，未执行；后续仅以精确报告路径rg读回，不记该失败命令为PASS。未运行工程回归，因为没有工程变更。

恢复入口：读本报告及独立审查结论，核对最新HEAD/WIP；仅对用户批准ID另列精确文件、调用引用清理、回归断言与回退方案，再实施。无需重跑广域扫描或全量历史治理。

## 首批实施计划（用户于 2026-09-20 回复“按照你的报告执行”）

复杂度：Sequential，外层两阶段；授权范围仅 SG-01 / SG-02。SG-03～06、Git 提交与发布不在授权内。

Phase 1 — 退役冻结支路：

- 删除 `memory/evals/scripts/collect_eval.py`、空的 `memory/evals/html-prototype/pairs.jsonl`、其专属 `eval-schema.md`，以及 `.claude/observability/scripts/append_run_log.py`。
- 收紧其直接说明和消费者：`memory/{README.md,eval-schema.yaml}`、`memory/evals/README.md`、`memory/scripts/{record_eval.py,eval_routing.py}`、`.claude/observability/README.md`、`.claude/skill-os/eval-methodology.md`、`.claude/skills/office/{SKILL.md,evals/SKILL.md}`。
- 保留 `eval-log.jsonl`、routing fixtures、behavioral A/B、observations/rules、全部历史 Git 证据。

Phase 2 — 回归验证：

- BLOCKING：活动代码/说明中没有 `collect_eval.py`、`append_run_log.py`、`pairs.jsonl` 或 `Run log written` 的可执行引用；本报告的历史说明不计。
- BLOCKING：删除目标不存在，保留目标仍存在；所有被改 SKILL.md 保留 frontmatter、preamble 和 FILE_END。
- BLOCKING：`python3 memory/tests/test_memory_system.py`、skill/registration/quality/self-model 窄门通过。
- BLOCKING：运行 `bash scripts/verify.sh` 并如实记录全仓结果；既有脏工作树造成的无关失败不改写为本批通过。

失败策略：任一首批相关 BLOCKING 失败则停在当前阶段，不扩大修复范围；通过 `git diff -- <精确文件集>` 可恢复本批，绝不 reset 用户工作。

## 首批实施结果

状态：`DONE_WITH_CONCERNS`。SG-01 / SG-02 已按授权完成；SG-03～06 未实施。实施收口时未创建 Git 提交或推送；用户随后另行明确授权发布本批精确文件集。

实际退出 4 个冻结路径：

- `.claude/observability/scripts/append_run_log.py`
- `memory/evals/scripts/collect_eval.py`
- `memory/evals/html-prototype/eval-schema.md`
- `memory/evals/html-prototype/pairs.jsonl`

同步收紧 10 个直接说明或消费者：`.claude/observability/README.md`、`.claude/skill-os/eval-methodology.md`、`.claude/skills/office/{SKILL.md,evals/SKILL.md,redteam/SKILL.md}`、`memory/{README.md,eval-schema.yaml}`、`memory/evals/README.md`、`memory/scripts/{eval_routing.py,record_eval.py}`。目标差异合计 14 个文件，26 行新增、297 行删除；新增行用于保留必要的退役边界和当前权威入口，不声称带来可测运行时节省。

保留项已读回存在：`memory/evals/eval-log.jsonl`、`memory/evals/routing/fixtures.jsonl`、`memory/scripts/behavioral_ab.py`、`.claude/observability/observations.jsonl`、`.claude/observability/rules.yaml`。活动代码和当前操作说明中已无 `collect_eval.py`、`append_run_log.py` 或 `Run log written`；`pairs.jsonl` / `run-log.jsonl` 仅剩退役说明及历史审计文字。被改的 3 个 `SKILL.md` 均保留 frontmatter、Preamble 与 `FILE_END`，redteam 保护区未动。

窄门结果：

- `npm run test:memory --silent`：81 项通过。
- `npm run validate:skills --silent`、`check:registration`、`check:quality-gates`、`check:coding-discipline`、`check:self-model`：全部通过；skill 校验仅保留原有 handoff 声明警告。
- Python 编译与 YAML 解析通过；`git diff --check` 通过。
- 独立质量门禁：`CONDITIONAL_PASS`，5/6；唯一警告是当前快照不能独立证明其他既有脏改动的时间归属，非本批功能阻塞。结果已通过 `record_eval.py` 记录，run id 为 `eval-sg0102-20260920-01`。

全仓 `bash scripts/verify.sh` 如实为 `PASS=94 FAIL=4 WARN=0`，因此不记为全绿：C9/C10 受既有 muse-loop 退役元数据与 catalog WIP 影响；S41 受既有 Codex hook trust bytes 漂移影响；C10b 在全仓并发运行中失败，随后独立重跑通过。以上失败面均不属于本批目标文件，本轮没有借机修复。

发布前复验：其他会话的既有 WIP 稳定后，于同日重新完整运行 `bash scripts/verify.sh`，结果为 `PASS=98 FAIL=0 WARN=0`。此结果作为当前发布门证据；上一段保留首次运行的真实历史，不回写伪装为当时已通过。

恢复：4 个删除目标均为 Git 已跟踪内容，可从基线提交恢复；其余变更可用本节列出的精确文件集反向恢复。当前工作区原有大量无关 WIP，发布阶段只暂存本报告列出的 15 个目标文件，未 reset 或纳入其他改动。

会话恢复机制另行裁决了一条 2026-09-18 待处理记录：用户曾明确纠正“框架识别耗费过多 token、后台治理干扰当前请求”。该记录按 L4 归因写为待人工复核候选 `SC-20260920-001`，并以 `QUALIFIED` 归档；它不是 SG-01 / SG-02 的实现差异。
