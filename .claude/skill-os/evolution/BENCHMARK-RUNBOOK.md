# 对标深评运行手册（BENCHMARK RUNBOOK）— 演进模式 2，人工触发

> 月度 scout（模式 1）按 gaps-register 匹配候选，**结构上只能发现已知未知**；本模式承接
> **未知的未知**：选一个高信号目标做全量对标，让对标**反向创造新 gap**，而不是消费既有 gap。
> 实证依据：mattpocock 对标（framework-audit/mattpocock-benchmark-2026-07/，51 单元深评）
> 一轮产出 5 skill 采纳 + 4 个新 gap——是迄今**产出最高的进化路径**，故制度化为第一类模式。

## 何时跑（人工发起，非定时）

- 月度 digest 的 opportunities / prior_opportunities_to_adjudicate 出现**高信号 hub**（裁决=「开 gap」但一个 gap 装不下它的价值面）
- 用户点名某仓库/体系「全面对一对」
- daily digest「🧭 对标基线到期」行 → 走下方「更新对标（窗口复审）」节（轻量，不占季度全量预算）
- 建议节奏：每季度 ≤1 次（对标是重活，框架建设预算内计）

## 目标选择

优先级：上期 opportunities 池 > 月度 scout 反复出现的同源 hub > 用户点名。
候选源另含 **vetting-registry rejected 池**（weighted_score≥80 且 non_redundancy FAIL——
「与自有 skill 重叠但质量信号高」正是对标的最佳素材，mattpocock 首批即人工从此池挖出；
2026-07-15 记忆层评审 B2 裁决：不改 scout 采集，这里补消费入口即可）。
选型标准：对方是**成体系**的实践（skill 集 / 框架 / 方法论），且与 luca_gstack 有可比面——
单点工具走**模式 1b 单点评估**（Workflow `framework-evolution-scout`，args `{target_repos:["owner/repo"], date}`：
跳过发现段，同门禁 Verify 五硬门 + 推荐级红队，簿记 `evolution-bookkeep.mjs` 落 candidate-log），不值得对标。

### Scout 簿记与恢复边界

- sweep **启动前由 main/caller** 在已授权、已核验的框架根实际运行只读
  `node scripts/evolution-adoption-snapshot.mjs --workflow-args [--date RUN_DATE]`，读回完整 stdout，
  保留本次调用时间、cwd/root、argv、退出码及原始 JSON 的授权证据路径与 SHA256，紧接着派发。
  CLI 实际读取并验证权限/文件身份，冻结实际
  adoption-log **原始字节 SHA256、字节数、原始 1-based 行号 + fused_candidate_id**。
  同 ID 的多次采纳是独立实例，不去重。将 CLI 返回 JSON **原样作为 workflow args**；
  原始分母由调用方持有，不能由 Load 或其他 agent 填写、重建或添加 `trusted` 标记。
  workflow 在首个 agent 前复制调用方快照；Load 返回必须与它逐字节 hash/长度和逐行身份完全一致，
  AdoptionReview 必须逐实例返回结果并绑定同一 hash。缺少调用方 freeze 在派发任何 agent 前拒绝。
  缺失、不可读、解析失败、账本变动、漏项、重复项或额外项均不能 COMPLETE；只有实际空账本
  允许空 review。无收益证据保持 `watch / unknown / helped_update=unknown`。
  punctual 明确排除 adoption review，不要求读取 adoption-log。
- 人工触发 `node scripts/evolution-bookkeep.mjs <return.json> [--dry-run] [--root DIR]`。
  Node 在提交前重新读取实际 adoption-log，对照原始 hash、行实例和 review 完整集，同时保留
  candidate 分数、硬门、红队和数量守恒校验。`--dry-run` 零写入，包含不创建锁或事务日志。
- POSIX Python helper 用 evolution 目录中的稳定 `.evolution-bookkeep.lock` 串行化全部 run，
  锁覆盖读取、Node 计划、持久提交和恢复。`.evolution-bookkeep-journal.json` 保留每次 run 的
  input hash、精确 before/after 字节及 hash、`PREPARED → COMMITTED` 状态；两个文件先各自
  atomic replace + file/directory fsync，之后才持久化 COMMITTED 并报告成功。punctual 不重写 registry。
- 相同输入字节重试是成功的 no-op；同 run 不同输入冲突，`--force` 保留为兼容参数但不能绕过
  幂等、覆盖或冲突门。不同 run 并发串行计数，不丢日志或累加值。PREPARED 必须用原输入重试，
  只接受每个目标精确匹配记录的 before/after；第三状态漂移、账本漂移、旧目录 journal、异常
  链接或锁身份变化都拒绝覆盖。先人工核实这些差异，勿删除锁/journal 或猜测 legacy 半写入 run。
  旧版已记账且无事务证据的同 run 不自动迁移。journal 是恢复证据，随治理数据保留。

Claude 与 Codex 共享该 workflow 和 CLI；Load 的 Bash 调用依赖各自真实 agent runtime。
本地 fixture 可验证 schema/控制流，不能代替任一宿主的真实 agent 成功证据。

调用入口（已授权框架根内；日期是调用方已确定的 run_date，不由模型推测）：

```sh
node .codex/workflow-runner.mjs framework-evolution-scout --args "$(node scripts/evolution-adoption-snapshot.mjs --workflow-args --date 'YYYY-MM')"
```

Claude 调用方先执行同一 `--workflow-args --date 'YYYY-MM'` CLI 并读回/保留输出，随后用
`Workflow({name:'framework-evolution-scout', args:<该次 CLI 返回 JSON>})`；可在调用方明确选择后
添加 `focus_gaps`，不得修改返回的 `adoption_snapshot`。如果 CLI 失败，停止，不派发 workflow。
两端均把实际 CLI 输出及其路径/hash/时刻绑定到本次派发证据。只有调用方确实执行并读回 CLI 才
满足前置条件；workflow DSL 无文件原语，不能仅凭 JSON 字段证明 root 输入的来源。此边界信任
获授权调用方的冻结输入，不能机械认证恶意替换该输入的调用方；Load/review 回复无此权威。
consumer 仍独立重读实际 ledger，在簿记写入前验证当前字节与原始分母。

## 流程（六步，复用 mattpocock 先例的结构）

| # | 步骤 | 产物 |
|---|---|---|
| ① | inventory：枚举对方全部单元（skill/机制/文档），pin commit | 清单 + pin SHA |
| ② | 对标矩阵：逐单元映射到我方对应物（有/无/弱） | matrix |
| ③ | rubric 深评：逐单元 dossier（价值/冗余/借鉴面/证据） | N 份 dossier |
| ④ | 红队：含**反向红队**（用对方的失败反证我方机制，如 registration-sync 案例） | 红队定论 |
| ⑤ | 独立冷启动复审（按 model-routing 当前 harness 合同；保留用户模型选择） | 复审意见 |
| ⑥ | GATE 逐项裁决（luca 人裁）：install / refresh / adapt-idea / 开新 gap / 拒 | 裁决记录 |

产物统一落 `framework-audit/<target>-benchmark-YYYY-MM/`。

## 更新对标（窗口复审）——模式 2 的增量形态

> 触发：daily digest「🧭 对标基线到期」行 / 用户点名看某已对标仓的更新。窗口起点 =
> `evolution/benchmark-registry.yaml` 该 repo 的 `last_review.reviewed_commit`——**必须来自
> registry，不凭记忆或叙事文档**；registry 无该 repo 记录 = 不存在窗口，走上面六步全量。
> 实证先例（含各条教训出处）：`framework-audit/2026-07-23-mattpocock-update-{review,redteam-findings,consensus}.md`。

| # | 步骤 | 硬性要求（教训固化） |
|---|---|---|
| W① 基线读取 | registry 读 last_review，窗口 = reviewed_commit → 上游 HEAD | 顺带核对 evidence 指针可达 |
| W② 窗口全量枚举 | gh compare 拉完整文件清单，分桶：实质改动 / 净新增 / 发行接线 / noise | **穷尽断言：各桶逐文件列名且计数和 == compare 总数**——总数核对≠穷尽，两处计数错会相抵互掩（R1 实证）；SKILL.md 之外必 diff bucket 成员资格/promotion 状态——转正可能只表现为 README/manifest 接线、SKILL.md 路径零变动（R1 透镜盲点） |
| W③ 逐文件直读 | 实质桶+净新增桶逐文件读 patch/全文真身 | 穷尽性与任何结论声明**只准在直读之后**落笔；红线「内容实查」的窗口版 |
| W④ 血统对标 | 上游改动 ↔ 我方历史吸收落点逐条映射，判 no-op/需同步/被推翻 | **直读我方落点原文（file:line）**，禁凭 ADOPTED.md 摘要判 no-op——摘要会漏吸收劣化（R2 曾据此 OVERTURNED 一条 no-op） |
| W⑤ need-first 门 | 每个净新增候选先答三问：我们框架**哪里**要处理 / **为什么**要处理（实证痛点指针，n=1 需注明）/ **价值是什么** | 「成本低」不得冒充「有需求」；场景零实发 → 最多记 gap 提案不动手；收益量化一律标 [CLAIM] 交红队（先验：07-23 轮 3 候选红队后仅 0.5 存活） |
| W⑥ 靶子落盘 | 全部结论按 **FACT / INFERENCE / CLAIM** 三级标注写成红队靶子：§0 带外写入台账 / §1 源头定义 / §2 问题定义 / §3 逐项裁决 / §4 红队分工 | 靶子落盘后编排者冻结对证据基底的写入 |
| W⑦ 红队+终审 | 按当前 harness 模型合同派发 refute 分工（枚举完整性 / 血统 no-op / 逐候选）→ 独立终审逐项 verdict（stands/overturned/modified）；串并行遵守当前原生关键门与用户约束 | 红队独立取证、不接受靶子转述；判官必须亲裁编排者-红队对质点，允许 NEW FINDINGS |
| W⑧ 规划执行 | 共识稿附 Plan 格式执行计划（前提门/断言列表/失败策略），人批后执行 | propose-only 不破：无显式预授权不动手 |
| W⑨ SSOT 回写+基线推进 | vetting-registry 追加 window-update-review → ADOPTED.md / adoption-log / CHANGELOG（复用下方出口接线）→ **registry 基线推进（出口「基线推进」条）** | installed-pins 的 ack 核验用**逐 unit path 域当前 SHA，永不用 repo HEAD**；registry 的 ack_commit 才是 repo 域 |

产物命名：`framework-audit/YYYY-MM-DD-<target>-update-{review,redteam-findings,consensus}.md`。
目标选择、红线与六步全量同源，不复述。

## 出口接线（对标不是终点）

- **开新 gap** → gaps-register（人裁落笔，带证据锚）
- **采纳批次** → 逐候选走 FUSION-RUNBOOK 九步管线（含 FM-11 可达性验收）+ ADOPTED.md 登记
- **拒绝/借鉴记录** → digest 叙事 + CHANGELOG 一行式
- **基线推进** → `evolution/benchmark-registry.yaml`（全量/窗口两模式共用）：旧 `last_review` 压入
  `history` 头部，写入新 `last_review`（reviewed_commit / reviewed_at / **upstream_commit_date
  =对方更新日期** / **adopted+evidence=我们更新了什么**）。**漏写 = 下次成长无增量起点 =
  重蹈 inventory.yaml 无消费者的覆辙**，与 FUSION 步⑨「漏更 pins = watcher 烂掉」同级维护义务。

## 红线（与模式 1 同源）

- propose-only：对标全程零自动编辑行为面；GATE 逐项人裁，不存在批量默认采纳。
- 热度 ≠ 适配：对标目标的名气只买"值得对标"的票，逐单元仍过 rubric + 红队。
- 内容实查：逐单元读真身（pin commit），不引用训练记忆。

<!-- FILE_END: BENCHMARK-RUNBOOK -->
