# 收口 Pass 终态 — 延后项触发器 + 活性体检（2026-07-21）

> 范围：`2026-07-17-review-coverage-checkpoint.md` 队列的 P2 / P3 / P4 / P5 + 5 个 open gap。
> 形态：luca 拍板「薄」（一次触发器 + 活性体检，非逐模块深审）+ **硬闸：默认不新建任何机器**。
> 台账：`2026-07-21-consolidation-findings.jsonl`（111 行，全部带 evidence + verdict）。
> 回归：`verify.sh` PASS=60 / FAIL=0 / WARN=1（I4 ADR，既有非阻断）。硬闸实测：scripts 26→26、hooks 6→6、office skill 35→35，**零净增**。

---

## 一、最重要的一件事：本 Pass 的核心论证被自己的红队推翻了一半

**原命题**：这些延后项的触发器不可触发 → 所以它们等于被遗忘 → 就地关闭。

前半段成立，**后半段是错的**。fable 红队对 6 条关闭类提案的判决是 **5 REFUTED / 1 UPHELD**，理由一句话就能说清：

> **触发器坏掉 ≠ 被防的风险消失。**

而且它指出了本 Pass 自己的**自我服务偏差**：关掉延后项会让审计显得收口干净，而计划里写的默认产出恰恰包含"关闭"——诱因是我自己埋的。

红队还击穿了两条事实前提：

1. **`post-edit` 的 framework/ 警告不是瞬时 stdout**——它以 `hookEvent:PostToolUse` 持久落在 harness transcript（`~/.claude/projects/**/*.jsonl`）。#4 的正确判定是「**可回查，但无自动观察者**」，不是 UNFIREABLE。
2. **P4 行为面不是零数据源**——transcript 里有 `"model"` 字段，实测 `claude-opus-4-8` 40055 / `claude-fable-5` 13476 / `claude-sonnet-5` 9774。「必然 INCONCLUSIVE」是错的。

**最终裁决：本 Pass 一条延后项都没关。** 处置从"关闭"改为**接通观察者 / 改写为可查判据 / 转 DECIDE**。

**留下的新纪律**（已写进 `BACKLOG.md` 抬头）：今后新增延后项，触发条件必须同时写明 `观察者：<谁在哪个必经界面看得见>`；写不出观察者的，就不是延后项，是待裁决项。

---

## 二、已落地（4 项，全部有会咬的证据）

| # | 改动 | 证据 |
|---|---|---|
| **BACKLOG #20** | `check_memory_health.py` SF 一致性段补**反向**断言（白名单 ⊆ CLAUDE.md SF 节），且匹配**限定 SF 小节切片**不再全文 | 三段咬：现状 PASS → 删 `SF-003` → FAIL 指名 → 还原 PASS。**关键区分性用例**：删出 SF 节但文末留 prose 引用（旧全文匹配会误判"已镜像"）→ 仍 FAIL |
| **BACKLOG #2** | 同文件加 `supersedes`/`valid_until` 看门断言——触发器从**零观察者**变为硬门 | 注入带 `supersedes` 的测试 fact → FAIL 并指名要补读侧过滤 |
| **P3 / lint:yaml** | 接入 `verify.sh` 新增 `S24`。此前 `model-routing` / `self-model` / `gaps-register` / `sources-registry` 四个真值源**零自动 YAML 语法门**（CI 只覆盖 2 个），而能力早已写好、只是无人调用 | 破坏 `model-routing.yaml` → FAIL；`git checkout` 还原 → PASS。2026-06-28 体检 HC-21/HC-25 已两次点名 |
| **GAP-self-evolution** | 重访条件从 YAML `#` 注释**提升为结构化字段** `revisit_when` / `revisit_status`，并接进 `framework-evolution-scout.js` loader 抽取清单 + 「`MET` 开头必须在 digest 首节单列」 | 原条件写在注释里 → `yaml.safe_load` 丢弃、loader 只抽 5 字段 → **结构上无人可能发现它已满足**（实测 23 条 ≫ 阈值 5，超 4.6 倍） |

另：`office/SKILL.md` 的 `append_run_log.py` 收尾块已标注「⛔ 已冻结，勿执行」——该脚本会 `mkdir + open("a")` 创建文件，而 run-log 的 FREEZE 裁决把「持续零写入」本身当作票据，照做即抹掉冻结依据。（红队唯一 UPHELD 的一条。）

---

## 三、⚠️ 一个你必须知道的副作用

**你放行那两条候选后，`verify.sh` 会转红。**

`candidates.jsonl` 里带非空 `supersedes` 的恰好是今日 digest 贴出 `--set-stable` 命令的那两条（`SC-20260715-006` → `004`、`SC-20260716-001` → `005`）。晋升后 promoted-facts 就带上该字段，新加的看门断言会 FAIL，指名要先补读侧过滤（`get_memory.py` / `search_memory.py` 的 `parse_semantic_facts()`，~20 行）。

**这是有意的门，不是 bug。** 在此之前，那次写入会**完全静默**——新旧两版事实并列被检索，无任何通道提示。嫌它挡路的话告诉我，我改成 WARNING。
（另注：被取代的 `SC-20260715-004/005` 既不在 promoted 也不在 candidates，读侧过滤须容错悬空引用。）

---

## 四、D1–D8 终态（luca 2026-07-22「这两件都解决」授权后处置）

**5 条落地（纯接线/无新机器）+ 3 条裁不做（真解决须放开硬闸，决定权交回）。** 分野原则：不撞硬闸的直接做；真解决须新建机器或触 propose-only 红线的，裁不做并把决定权交回 luca——**不替他免掉工，也不为收口好看而硬做撞硬闸的东西**。

| # | 处置 | 落地/裁决 |
|---|---|---|
| **D1** | ✅ **做了** | `session-restore.mjs` 预览从 `slice(0,14)` 改为按「待你裁决」整节收尾（上限 40、截断可见）。窗口 14→23，6 条超期候选进入启动提示。未加第 6 个 stdout 块。补 `DIGEST-001` 回归断言咬住生产端↔消费端 |
| **D2** | ✅ **做了** | `search_memory.py --include-archive`，不默认并入。含溯源修正 + noisy 排除 + 同 id 去重。补 2 个回归用例 |
| **D3** | 🔻 **裁不做（两方案都不选）** | ①append observations 是**假解决**——`post-edit.mjs:54` 只在 Write/Edit 执行，真正漏的 Bash 向量（`sed -i`/重定向）时 `file_path` 为空、该行不跑、append 也不发生，盖不住红队②自己指出的缺口，且无自动消费者；②PreToolUse deny 撞硬闸 + 被防事件 0 历史命中。触发条件改为人可报告判据。**🔓 决定权交回**：真缺口（Bash 向量全盲）是真的，要盖住须放开硬闸加 deny，你说一声我加 |
| **D4** | 🔻 **裁不做（不用「永久」）** | 一致性面已自动化到位（`daily_governance` 7 类检查 + 超期提醒），无需动作。行为面**当前不接**：唯一数据源是 harness transcript（仓外、格式非契约、可能轮转），接它是架构承诺 + 撞硬闸；当前一致性面 0 issue、无真实误配案例。**留待有真实 dispatch 误配时重估**（回应红队「别用永久免做工」——这是 measure-first 延后，不是永久放弃）。**🔓 决定权交回**：要不要让框架依赖 harness 内部存储 |
| **D5** | ✅ **做了** | `consolidate_memory.py` 加 `eval_source_present`，print 区分「无源」vs「有源无失败」。三情形验过，45 测试不破。**未决观察**：07-15 接线后 eval-log 0 新增，写侧是否真跑通须下次真跑 quality-gate 时验 |
| **D6** | ✅ **做了**（上一轮，luca 已批 D6） | `daily_governance.check_gap_recheck()` 把 90 天算术从 LLM prompt 挪进确定性脚本，接已有 digest 消费面。三分支实测互不遮蔽 |
| **D7** | 🔻 **裁不做基准，根因定位** | 不建 DGM 基准——样本无输入（helped 5 占位符/18 缺键、landing_status 19 空）。**根因已定位**：AdoptionReview（scout）读 adoption-log 出复盘但**不回写 helped**（propose-only 架构）。真「修回填纪律」= 加人确认后回填通道，触 propose-only 红线、是独立工程。gaps-register 该项转 `ADJUDICATED`（不再每日刷告警）。**🔓 决定权交回**：要不要立项做回填通道 |
| **D8** | ✅ **做了** | FUSION-RUNBOOK 指针补进 `framework-evolution-scout.js` 落地注释（采纳流程入口→融合门）；`luca-open.sh` 补 capability-parity 锚点（`open-spool`，会咬）；P5 转入 BACKLOG #22，触发条件=**人可报告判据**（刻意不设「muse 30 天无 commit 即审」——那是又一个无自动观察者的跨项目假触发器，正是本 Pass 消除的模式） |

**三条「裁不做」的共性**：真解决都要放开 luca 在本 Pass 拍板的硬闸（新 hook / 读 harness 存储 / 触 propose-only）。按硬闸裁不做 + 把真缺口和决定权显性交回，不是自我服务偏差——决定权在你，任一条你说「放开硬闸做」我即做。

---

## 五、判为无需动作（不是没查，是查完确认健康）

- **P3 脚本层整体健康**：59 单元 / 53 LIVE / 6 HALF-WIRED / **0 ORPHAN**；`verify.sh` 经 `.githooks/pre-commit` 每次提交真跑。**KILL-2 触发**，未升级为深审。
  - 诚实标注：6 条 HALF-WIRED 里 4 条是纯便利别名（保留零成本）；但 `lint:yaml` 那条别名 == 唯一能力载体，别名死 = 能力死 —— 已修。
  - 独立复核另发现 **8 个脚本零 verify/CI 覆盖**（`evolution-bookkeep` / `fusion-preflight` / `project.sh` / `status.sh` / `sync.sh` / `history.sh` / `luca-open.sh` / `luca-sidebar.sh`），且与 WA1 自己的一条 finding 互相矛盾——原批次内部未对账。要不要接 smoke 属 D8 延伸。
- **observability 的 rules 注入是活的**，不可连坐删：`route-guard.mjs` 有确定性 JS 原生注入（不依赖模型记性），实测三条规则被真注入。休眠的只是写入侧。
- **4 个 open gap 健康延后**（routing-fragmentation / soft-enforcement / fusion-impact-automation / issue-tracker）：scout 通道活、本月实测覆盖，且有实证级红队挡板（如「本仓代码图谱切片实测为空」）。
- **#18 维持现状**，口径改为「半接线 scaffold，reader 已知永不触发」——删 reader 被红队明确否决（`test-hooks.mjs:96-98` HOOK-001 锁住崩溃 checkpoint 安全网，`makeFixture` 默认值被约 20 个回归块复用）。

---

## 六、遗留与诚实标注

- **A-06 字面未过**：`BACKLOG.md` 里 `run-log.jsonl` 仍出现 2 次，但均已标注为「此臂作废」，非活触发条件。按实况记，不粉饰成 PASS。
- **一处待澄清**：红队把 transcript 里的 `framework/README.md` 编辑归给 commit `5aa61a7`，但我实查到的两条 PostToolUse 命中落在 **todo-capsule / muse-gstack 两个别的项目**的 transcript 里，未必是本仓的 `framework/`。**机制成立**（警告确实持久落盘），**那两次具体命中的归属存疑**——不作为"已触发"证据。
- **一条新缺口（复核员捞出，Wave 1 未发现）**：`SC-20260721-001/002` 已晋升进 `promoted-facts.yaml`，但 `candidates.jsonl` 里 status 仍是 `CANDIDATE` → 每次 `consolidate` 都把它们报成 duplicate。疑为 `--set-stable` 未回写候选 status 的残留。未修（不在本 Pass 范围，且需先确认是不是有意设计）。
- **Wave 2 复核员自身留了痕迹**：`settings.local.json` 多一行（harness 自动追加 permissions）。该文件行数不适合作为稳定计数证据。
- **待办（本 Pass 收尾清单，不靠记性）**：本轮核心发现（「延后项的触发器从未被验证是否可观测」）是 `SC-20260715-001` 在延后决定上的复发，属**适用面扩展**。源头已修（BACKLOG 抬头新纪律），故不新增 semantic 事实；若后续再复发一次，走 `propose_semantic.py` 提候选。

---

## 七、Wave 4 独立复审结果（复审者不知修复过程，只拿原始问题描述验现状）

判决：**2 RESOLVED / 2 PARTIALLY_RESOLVED / 1 NOT_RESOLVED**。已按结果补修，补修后复测全绿。

### 抓到的两个真问题（已修，均有双向咬合证据）

1. **NOT_RESOLVED → 已真接线**：GAP 重访条件字段化那步是**假修复**——我给 loader prompt 加了抽取指令，但 `LOADER_SCHEMA.gaps.items.properties` 没声明 `revisit_when`/`revisit_status`，结构化输出会被 schema 剥掉；且下游 `gapsText`/`openGapIds`/`gapsCovered` 全不读它，工作流 return 里也没有。
   **这正是 `SC-20260715-001`（只建采集端不接消费端）在我自己手上复发一次，而本 Pass 的主题就是修它。**
   补修：schema 声明两字段 + 计算 `revisitDue` + 落进 `return.revisit_due` + `session-restore` 的 digest 强制项从「三件套」升为「四件套」。用代码同款过滤逻辑对真实 `gaps-register.yaml` 跑通，`GAP-self-evolution-hardening` 正确浮出。
2. **误报 bug（真 bug）**：`supersedes` 判空写成 `str(fact.get(field, "")).strip()`，YAML 里 `supersedes:`（空值）解析为 `None` → `str(None) == "None"` → 判非空 → **合法状态下误 FAIL**。改为 `str(fact.get(field) or "").strip()`（与 `consolidate_memory.py` 同款）。双向咬合：空值 → PASS（不再误报）；真值 → 仍 FAIL（绊线未失效）。

### 复审指出的遗留（未修，如实记）

- **#1 后半段未修**：`consolidate_memory.py:510-511` 的 `fact_id in content` 全文匹配仍在（写侧误判"已镜像"）。净效果是「静默消失」这一危害已被读侧硬门堵住，**源头 bug 未修**。
- **⚠️ 新增的工作流摩擦（值得你知道）**：`sync_claude_fallback` 只在晋升那一刻被调用。对一条**已晋升**的事实往白名单里加 id，会立刻让 verify/pre-commit/CI 变红，且没有工具能补做镜像，只能手改 CLAUDE.md。**白名单编辑从此必须与 CLAUDE.md 同一次改动**（原子操作）。
- **#2 核心症状未变**：读侧仍不消费 `supersedes`，新旧事实照样并列返回。本 Pass 加的是**绊线**（发生即硬失败），不是过滤器。写侧 `--supersedes` 能力事实上被封，直到读侧补齐。
- **#3 只覆盖本地**：CI 显式排除 `verify.sh`（依赖本地软链），CI 的 yaml job 仍只覆盖 2 个文件 → 那 4 个真值源的语法门只存在于**本地 pre-commit**，且 `FAST_COMMIT=1` 可绕过。按原问题字面（"无任何自动调用者"）已解决，按"CI 覆盖"未解决。
- **#5 无回归护栏**：`append_run_log.py` 本体零改动零守卫，谁跑了都照样建文件；且将来谁把那段 ⛔ 说明删回原样，没有检查会发现。要真闭合，最省事是脚本入口加 FREEZE 拒绝执行 + 一条能力锚点断言。
- **环境事实**：`.claude/settings.json` 的 `env` 写死 `MEMORY_ROOT=/Users/luca/Desktop/luca_gstack` → 本检出跑 `check:memory-health` 用的是**本检出的脚本 + 母版的数据/CLAUDE.md**。两处 CLAUDE.md 当前一致故无害，但**母版检出尚未 pull**，它自己跑 verify.sh 时用的还是旧脚本——建议在母版跑一次 `git pull`。

<!-- FILE_END: 2026-07-21-consolidation-close -->
