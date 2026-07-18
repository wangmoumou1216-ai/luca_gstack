# Office Skills 本体内容质量深审 — 2026-07-17（进行中，每波增量追加）

> 计划：`~/.claude/plans/p0-p1-reviw-revew-plan-reviw-reviw-goal-dreamy-dolphin.md`（luca 已批）。
> Goal：一次深审捞干 skills 内容缺陷（根德性/六失败模式/修剪纪律/P1-P7/登记接线），八项完备性指标全达标才算完成。
> 方法：W0 机械预扫 → W1-W2 召回率标定（K=12 注入盲跑 gate ≥11/12）→ W3-W4 垂直 finder×16 →
> W5-W6 水平 lens×6 + 消费者模拟×8 → W7-8.5 fable skeptic 对抗验证（0 未裁决）→ W9-10 饱和轮
> （连续 2 轮零新发现）→ W11 集中修复 → W12 delta 复审 → W13 组装。单波 ≤8 并发。
> **基底冻结**：SHA `5de3c749cbc862a43decee572237bb4ae74db3f6`（本台账文件自身不属冻结面）。

---

## W0 — 机械预扫（2026-07-17，脚本 + 主循环人工修正）

**语料面**：31 个 skill 目录 + 共享 office/SKILL.md（338 行）+ references/ 池 13 文件。
覆盖矩阵行 = 31 skill + 2 共享面；列 = 9 lens 组（六失败模式×6 / 修剪纪律 / invariant-violation / 语义死指针·矛盾·歧义）。

**扫描器自校正（防假阳性输入污染 finder）**：
- routing-map 键用下划线（`design_brief`）、磁盘用连字符——归一化后重比。
- `framework/xxx.html`、`docs/engineering/...-tech-spec.md` 等占位符样式已从死指针候选滤除。

**机械线索（待 W3+ finder 人工核实，非已定 finding）**：

1. **死指针候选 18 条**（滤占位符后），最重一簇：
   - `evals/SKILL.md:39-40`、`redteam/SKILL.md:36-37` → `.claude/observability/run-log.json` 与 `observations.json`；**实际目录只有 `observations.jsonl`，run-log 任何后缀都不存在**。
   - CRM 时代产物引用：`brainstorm:685,721`→offline-mode-prd、`ux-brainstorm:682,728,734`、`ux-research:537`、`references/handoff-protocol.md:26`、design-brief examples×6 → 均指向 docs/（项目软链）下不存在的 2026-04/05 CRM 文件。
   - `muse-loop-orchestrate:179` → docs/loop/traceability.md：文内声明 lazy 创建，**非死指针**（预判 REFUTED）。
2. **FILE_END 缺失 ×3**：muse-loop-orchestrate / muse-proto-gen / muse-req-triage（P5 候选；validate-skills.sh:31 对缺失只 ⚠ warn 不 fail，故 S5 门禁一直绿——检查器强度问题一并待核）。
3. **frontmatter 8 项**：auto（缺 description/allowed-tools/context-cost）、brainstorm/deepresearch/ux-brainstorm（缺 allowed-tools）、magicpath（缺 allowed-tools/context-cost）+ 上述 3 个 FILE_END。是否必填以 P1 保护区语义为准，待核。
4. **登记五面（归一化后）**：
   - 一级 18 个三面齐（CLAUDE.md 表 × commands/ × routing-map），零缺口。
   - 不在 routing-map 的 13 个 = 11 隐藏 skill + muse-proto-gen（内部，by design）+ **muse-x-digest**。
   - **F0-01（预置 DECIDE）**：muse-x-digest 磁盘存在（114 行 + 3 子文件），一级表/隐藏清单/routing-map 三处登记皆无。
5. **shingle 重复对 ×3**（12-gram ≥3 块）：figma-demo/SCHEMA ↔ html-prototype/SCHEMA（5 块）；task-plan ↔ tech-spec SKILL.md（4 块）；design-brief 两个 examples 互重（4 块）。交 W5 duplication lens 裁真伪。

原始数据：scratchpad `w0/w0_report.json`。

---

## W1 — 标定注入（2026-07-17，注入器 + 独立伪装复核，各 1 opus agent）

- 标定集：scratchpad `calib/setA/` = 5 个 skill 副本（tech-spec/ux-audit/idea/figma-layer 注入 + open-design 对照组零改动）。
- **K=12 注入**：六失败模式各 1 + P2 显性 + P6 隐性 + 登记漂移 + 跨文件矛盾 + 精致 no-op + 语义死指针；**hard 4 条**（P6/登记漂移/跨文件矛盾/精致 no-op），12 条分布 6 文件（2 条在子文件）。
- 伪装复核第一轮：11/12 通过；INJ-08（P6）被判难度虚标（表面编号断裂太显眼）→ 注入器返工为语义层违反（表面编号完好）→ 单条复验 **PASS**（A 风格 OK / B 公平 FAIR / C hard 成立；ux-audit 恢复零残迹，与真仓 diff 仅余既定注入）。
- **答案钥匙 SHA256（判卷前锁定，防事后合理化）**：`89c797d033e7b27ab8a48daee2e7b1ae5674da79ffe9b7a4c944752f2a3f043c`（钥匙本体在 scratchpad `calib/answer_key.json`，审计结束后归档）。
- 盲性设计：标定 finder 与生产 finder 用同一 prompt 模板（scratchpad `finder_prompt_template.md`），仅路径参数不同；对照副本混入；机械 excerpt 与生产同构生成（标定测的是「机械层+finder」整套部署系统）。

## W2-R1 — 标定盲跑第一轮（run wf_0e755d6d-cf5，6 agent 全票有效）

**召回 10/12 = 未过 ≥11/12 门禁 → 按计划 RCA + 修模板 + 换全新注入重跑。**

- 判卷明细：detected-located 10（含 4 hard 中的 3：INJ-08 门禁绕过/INJ-09 name 漂移/INJ-10 跨文件矛盾/INJ-11 精致 no-op 全中，其中 INJ-08/10/11 是 hard）；detected-mislocated 1（INJ-02 duplication——finder 报了同文件同 lens 但没枚举到注入实例）；missed 1（INJ-06 negation——finder **看见并逐字引用**后自判"真红线"压下不报）。
- **RCA→模板 v2 修补**：①duplication lens 加"逐实例枚举全部副本"硬要求；②negation 真红线例外收窄（单条+明确后果+无正面等价才豁免）；③新增"边界项处理"节——两可缺陷必须报出标注边界+低 severity，交 skeptic 层杀误报，finder 不得自行压下（高召回原则，与对抗验证层的架构分工对齐）。
- 精度基线（对照组 open-design）：5 条 finding 全部有真实引文、无幻觉，多为真实 P2/P3 小缺陷——假阳率低，倾向低 severity 高产出，符合"finder 捞全+skeptic 过滤"分工。
- 先导情报（不喂生产 finder，留作交叉核对）：标定副本上挖出真实既有缺陷若干——ux-audit Module B 评分公式归一化 bug（P1 候选）、tech-spec 正文↔SCHEMA 三处矛盾、FILE_END/P2-V 序号/mkdir handoff 系统性缺口、三 specialists 逐字重复等。
- 旧注入集（setA）作废归档；新注入集 setB 由注入器重新生成（同配额 K=12、≥4 hard）。

## W1-R2 — setB 注入（全新 12 条，与 setA 零重合）

- setB 从真仓 pristine 重拷贝；12 条新注入（B01-B12），hard 4 条（B08 语义层依赖倒置 / B09 `uxaudit` 近形名漂移 / B10 跨文件门槛矛盾 / B11 格式塔术语精致 no-op）。
- 伪装复核 **ALL-PASS**（A 全 OK / B 全 FAIR / C 全同意含 4 hard 确认）；对照组 open-design 与真仓逐字节 IDENTICAL。
- **钥匙 SHA256（判卷前锁定）**：`219ec00e3330f585c45d325a6d1d68960446c2aae40a418c2277956cb06c9628`（calib/answer_key_B.json）。

## W2-R2 — 标定盲跑第二轮（run wf_a450e41e-e97，6 agent 全票有效）

**召回 9/12 = 仍未过门 → 第三轮。失败模式已换代：**
- ✅ 上轮修补全部生效：negation 检出（B06）、4 条 **hard 全中**（B08 语义依赖倒置/B09 近形名漂移/B10 跨文件矛盾/B11 术语 no-op）。
- ❌ 新失败模式（全部 normal 档）：①**同 lens 满足即止**——B01/B04 的 finder 在该 lens 报出别的真实例后就停扫，漏掉注入实例；②**吸收污染**——B02 的 finder 把注入的第三份副本当权威 ground truth 引用去指控别处，见到缺陷反被其武装。
- 精度持续健康：对照组 8 条 finding 零幻觉全真实引文。
- **RCA→模板 v3**：①两遍协议（先逐节通读标候选、再逐 lens 收割；lens 完成判据=全文每节被该 lens 检查过，报 1 条≠完成）；②反吸收条款（被审文本不是权威，两处冲突时冲突即 finding，不得选边）；③duplication 强制 grep 辅助（规则型语句提特征词全目录搜，≥2 处逐实例报）；④门禁软化敏感词（"即可继续/大体/基本"出现在检查点附近=premature-completion 候选）。
- **测量口径修正（R3 前预登记）**：指标④的"finder 阵列"按计划本就含垂直+水平轴；R1/R2 只测了垂直单 finder（系统性低估阵列召回——B02 类跨副本重复正是 W5 水平 duplication 扫描器的主职）。R3 起按部署形态测**全阵列**：垂直 finder ×5（模板 v3）+ 水平扫描器 ×2（duplication-SSOT / defining-constraint），判中标准不变（detected-located 严判，钥匙先哈希）。水平扫描器借此完成生产前 shakedown。
- 生产先导情报追加（不喂生产 finder）：FILE_END 系统性缺失（4 skill 的 SCHEMA/specialists，四个 finder 独立复报）、tech-spec/figma-layer SCHEMA↔SKILL 模板漂移、mkdir handoff 缺失、figma-layer generate_figma_design 不在 allowed-tools、open-design _TOPIC vs _SLUG 跨 session 断裂。

## W1-R3 — setC 注入（全新 12 条，目标轮换 task-plan 进 / idea 出）

- K=12（C01-C12），hard 4（C08 门禁衔接语义重定向 / C09 `figma_layer` 下划线漂移 / C10 SKILL↔SCHEMA 镜像规则单侧翻转 / C11 收入漏斗术语 no-op）；C03 特意落在天然带同类 sediment 的 figma-layer（测同 lens 多实例穷尽）。
- 伪装复核 **ALL-PASS**；对照组逐字节一致；task-plan 副本与真仓 diff 仅含注入。
- **钥匙 SHA256（判卷前锁定）**：`70a83a51c195572015e24ea7ef91c4109c72da20f980828a917553e2ddb9e501`（calib/answer_key_C.json）。

## W2-R3 — 全阵列标定盲跑（run wf_f15d6756-79e，8 agent 全票有效）

**召回 12/12 = 指标④ 通过（门槛 ≥11/12）。标定关闭，模板 v3 + 垂直/水平双轴阵列定版为生产配置。**

- 4 条 hard 全中：C08 门禁衔接语义重定向（task-plan finder 引 P6 顺序锁对撞）/ C09 下划线 name 漂移 / C10 SKILL↔SCHEMA 镜像规则单侧翻转（垂直+水平双命中）/ C11 收入漏斗术语精致 no-op（未被术语权威感迷惑）。
- R2 三个失败模式全部被 v3 修补治愈：同 lens 多实例（C03 注入与天然 sediment 分别报出）、吸收污染（C10 冲突即 finding 不选边）、跨副本重复（C02 grep 辅助命中三份副本）。
- 水平轴价值实证：C04 三重覆盖、C10 双轴命中、C09 def-constraint 扫描器 near-miss 但垂直兜住——union 架构冗余按设计生效。
- 对照组：9 条 finding 零幻觉，全部为真仓天然缺陷（open-design 与真仓逐字节一致）→ **open-design 的垂直生产票据此直接采认**（v3 模板 + 同构输入 + 干净副本，evidence 路径合并时映射回真仓）。
- **统计诚实**：12/12 对 12 类植入缺陷零漏检；按 rule of three，同分布真实召回率 95% 置信下界 ≈75%。完备性主张由 标定×正交饱和×覆盖矩阵 三角互证支撑，不构成"零遗漏"数学证明。
- **三轮标定成本与自重上限触发**：标定累计 ≈3.3M subagent tokens（注入 0.77M + 复核 0.71M + 三轮盲跑 1.78M）。全程预算投影超 6M 上限 → **按计划砍序提前触发 ①②**：饱和轮正交 lens 3→0（保 2 自由狩猎 + novelty 判官）、消费者模拟 8→4（保 brainstorm/design-brief/html-prototype/figma-demo）。skeptic 层/覆盖矩阵/机械预扫/基底冻结按"永不砍"条款全额保留。
- 标定副本上验出的真实缺陷清单（tech-spec 追踪矩阵冲突、ux-audit 评分公式 175≠100、task-plan preamble 缺 get_rules、figma-layer shadcn BLOCK 自相矛盾等）留作生产轮交叉核对，不喂生产 finder。

---

## W3+W4 — 生产垂直深审（run wf_a9eeac60-615，16/16 全票有效，1.82M tokens，零缺票零限额中断）

**产出 161 条 findings + 采认 open-design 对照组垂直票 9 条 = 台账 170 条（`2026-07-17-skills-findings.jsonl`）。**

- 分布：P0×0 / P1×8 / P2×93 / P3×69；lens 前三 = semantic-integrity 41 / invariant-violation 41 / sediment 30。
- **P1 八条（待 skeptic 对抗验证，未定罪）**：①design-brief 全程钉 MagicPath 为默认主路径（与 2026-07-03 OD-first 裁定相悖，系统性 sediment）②design-brief SCHEMA 缺 Phase 6.5/6.75 三节（模板漂移）③figma-layer allowed-tools 缺 Skill 工具但正文强制「先加载 /figma-use」④auto 整套 Pipeline 以 magicpath/figma-demo 为终端、零提及 open-design（同①同族，系统性）⑤taste-review 死指针（引用锚点文件不存在的"第 9 节"）⑥taste-review 双判据矛盾（AI 模式 1/2/3 vs 场景 A/B/C 门控同一锚点）⑦retro 双 FILE_END 且 P7 workflow-state 块落在第一个 FILE_END 之后⑧compare allowed-tools 无 Write 但 Phase 4 要求写文件。
- 系统性主题（跨多 unit 复现）：OD-first 政策漂移（design-brief/auto/figma-demo 链）、SCHEMA/子文件 FILE_END 缺失面广、CRM 时代 sediment（references 池 + ux-audit module-c + 各 examples）、brainstorm↔ux-brainstorm 与 deepresearch↔ux-research 的 references 同名重复（SSOT 待 W5 裁）。
- 单位票细节与 clean_cells/coverage 存证：scratchpad `clean_cells_w3w4.json` / `coverage_w3w4.json`。

## W5+W6 — 水平扫描 + 消费者模拟（run wf_6ffe861f-7df，5/8 有效票 + 3 缺票补跑中）

- **有效 5 票入账 25 条 → 台账 195 条**（P1×3）：sim-html-prototype 抓到 Tailwind CDN 相对路径较输出目录深度少一级（原型裸奔无样式，P1）；sim-design-brief 抓到 Phase 0 Step 0 死指针（PRD「📌 设计师关注摘要」节不存在于 brainstorm 模板产出）+ Layer A/B 对「AI 不介入」结论无 N/A 逃生口；dup-A 实证 prototype-spec 契约分叉重复（两 SCHEMA 权威漂移）+ 五母版清单四处复述违反共享规范自身「不重复写」声明。
- **缺票 3（诚实自报未读全 → 票作废、findings 不入账）**：w5:dup-B（锚定面 30 文件过大）/ w5:dc-设计链（8 skill 全文 ~13k 行过大）/ w6:sim-figma-demo（3.9k 行语料）。按指标⑤ fresh 补跑：dup-B 拆两半、dc-设计链 拆两半（必读收窄为 SKILL.md 全文+子文件抽查、如实申报）、sim-figma-demo 读全判定收窄为执行路径上被指令要求读的文件（与真实消费者语义一致）。
- 恢复指令（checkpoint）：若中断，从 `framework-audit/2026-07-17-skills-findings.jsonl` + 本台账继续。

## W5+W6 关闭（2026-07-18，补票两轮后缺票清零）

- 补票轮 1（wf_5399b693-35c）：4/5 有效入账 15 条；dup-B1 仍读不全再拆。
- 补票轮 2（wf_433ecbb4-012）：首跑撞订阅限额双阵亡（**限额中断计数 1**，22 点重置后 resume 补跑）→ **2/2 有效入账 6 条**。
- 拆分教训（方法论，入终报告）：水平扫描器单 agent 「读全」上限实测 ≈15-20 文件/5-6k 行——超过必诚实自报 read_to_file_end=false；锚定面要按此预算切。
- **W5-W6 最终态：13/13 有效槽位（8 原始中 5 有效 + 8 张拆分补票全有效），缺票=0（指标⑤ 达标）。**
- 亮点新 findings：FxUI line-height 分叉重复实锤（design-system-contract L1=18px vs html-prototype-tokens L1=24px，生成侧与评审侧互判不合规）；redteam/retro 双 FILE_END 且 P7 workflow-state 块夹在两标记之间（读到第一个标记即停的 agent 会跳过 P7 写入）；muse-x-digest SKILL↔recovery.md 近全量重述。

## 台账现状（W0-W6 全部发现层完成，暂停点）

**216 条 findings：P0×0 / P1×12 / P2×119 / P3×85**；lens 分布 semantic-integrity 59 / duplication 45 / invariant-violation 43 / sediment 37 / 其余 32；39 个 unit（skill/共享面/references 文件）有 finding。全部 status=open，**未经对抗验证，尚不足采信**（历史校准：自审翻车率 4/9~6/11）。
下一步（等 luca 指令）：W7-8 fable skeptic 按 skill/主题批量对抗验证（默认立场=驳倒、当场 grep 核真引文）→ W8.5 定向取证 → 饱和轮 → 集中修复。

## W7 — 对抗验证（进行中，2026-07-18 凌晨）

**编排**：13 主题批（负载全部 ≤15 文件/≤5.8k 行，吸收 W5W6 拆分教训）；skeptic=fable effort=high，默认立场=驳倒，强制流程 = grep 逐字核真每条引文 → 读上下文防断章取义 → 穷尽 7 条驳倒路径 → 三态判决；批次文件 scratchpad `w7/batch_*.json` + `batches_meta.json`；run `wf_ba8b55cd-cbb`（首次发射 args 序列化错 0 agent 即败已弃，改 manifest 内嵌脚本）。

**首轮结果（1.81M tokens）：6 批 VALID 86 verdict 已回写台账（commit de2aa5b）**：
- **CONFIRMED 68（FIX-NOW 48 / DECIDE 19 / KNOWN-BOUNDARY 1）/ REFUTED 18 / PLAUSIBLE 0**；severity 修正 15 条（全部降级，P1→P2 ×4、P2→P3 ×11）；grep 未核真 0。
- 抽查 REFUTED 质量过硬（行级反证：双 0-4 标度自带消歧定义、FILE_END 保护区只锁 SKILL.md 非 SCHEMA、「四锚点」节名是显式锁死的兼容契约非陈旧引用、双 AI-Slop 清单是正交仪器非重复实现）——对抗层在真杀误报，非橡皮图章。
- **B01-figma-demo 残票**（5 个 fid 被缩写 FW6-sim-01≠FW6-sim-figma-demo-01，FID_MISMATCH 整票作废按⑤重跑）；**6 批撞订阅限额阵亡**（B03/B04/B08/B11/B12/B13，resets 5:30；**限额中断计数 2**）。
- 复跑批 prompt 已加 fid 逐字纪律条款（有效 6 批 prompt 逐字节不变，resume 走缓存回放）。

**恢复指令（冷启动兜底；会话内已排 5:36 一次性 cron 自动触发）**：
1. `Workflow({scriptPath: "~/.claude/projects/-Users-luca-Desktop----muse-lucagstack/3bd9eeb7-b7ce-4bfc-90c7-79c9b7b3df01/workflows/scripts/w7-skeptic-verify-wf_3944ae14-e15.js", resumeFromRunId: "wf_ba8b55cd-cbb"})`
2. 完成后 `python3 <scratchpad>/w7_writeback.py <新 journal> --write` 验票回写（13/13 VALID 才关 W7），commit+push。
3. PLAUSIBLE>0 → W8.5 定向取证至 0 悬置 → W9-10 饱和轮（照计划文件）。

**授权升级（2026-07-18 01:2x，luca 原话）**：「到了限额以后恢复以后把中断所有的没完成的事情完成就好了。不要有任何的遗漏。」——恢复后 W7 补跑→W8.5→W9-10 饱和→W11 修复→W12 delta→W13 组装验收全链自主完成，不再等确认；DECIDE 项攒清单不阻塞；再撞限额则状态落盘+按新重置时间接力，直至八指标全部达标。

## W7 第二轮（2026-07-18 08:01-08:14，resume wf_ba8b55cd-cbb，+1.98M tokens）

- **B01（fid 纪律生效后全票有效）+ B08 入账 34 verdict**（commit 2aa7a15）；台账累计 **93 CONFIRMED / 24 REFUTED / 3 PLAUSIBLE / 96 open**。
- **意外双票 → 白捡信度指标**：resume 缓存未命中，首轮 6 张有效票全部原样重跑（原因未明，记为 harness 观察）。逐 fid diff：86 条双票判决 **test-retest 稳定率 96.5%**（B05/B07/B09/B10 逐条全一致；3 条翻转 FW4-155/FW3-031/FW3-037 均 CONFIRMED→REFUTED，按分歧即悬置转 W8.5，双方 rationale 已存 skeptic.conflict）。
- 5 批再撞限额（B03/B04/B11/B12/B13，resets 12pm；**限额中断计数 3**，砍序①②③已用尽，成本控制改由 luca 新指令承担）。

**luca 两条新指令（2026-07-18 上午，覆盖计划默认）**：
1. **subagent 串行**：此后所有 subagent 一个一个跑、不并行（限额撞死时最多损失 1 个在飞 agent）。
2. **模型分配**：剩余 5 批按判断杠杆×错判代价选 3 批留 fable——B04 界面产出链（34 条、多 P1、SSOT/OD-first 系统性）、B03 需求侧（23 条、主链入口）、B11 评审治理类（17 条、invariant/保护区交界）；B13/B12 降为 opus。
- 第三轮脚本：scratchpad `w7_round3_serial.js`（串行 for-await + 每批 model 字段，顺序 B13→B12→B11→B03→B04 小票先行做金丝雀）；12:03 一次性 cron 已排（会话态；冷启动照本节执行同样步骤）。
