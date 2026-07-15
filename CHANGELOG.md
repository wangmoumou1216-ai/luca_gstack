# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **维护约定（2026-07-12，源 mattpocock changesets 叙事内核，MIT）：** skill/能力的生命周期
> 变更（新增采纳/重命名/reframe/降级隐藏/删除）在本文件记一条「变更 + 为什么」（一行式）。
> 与 adoption-log 互补：那边是采纳审计记录，这边是面向使用者的演进叙事。

## [Unreleased]

### Added
- 记忆决策通道三件套 + 拒绝动词（2026-07-15 记忆+自成长层评审）：consolidate 新增 `--reviewer`
  （--set-stable/--reject 必填署名）、`--reject ID --reason`（写 rejected review + 同次可归档）、
  set-stable 落 approved_stable 审计记录；digest「待你裁决」新增 awaiting_approval 桶渲染（放行/
  拒绝双命令就地给出）——为什么：31 条 review 全 promoted 是结构必然（拒绝无机器动词、只能手工改
  jsonl）、待批候选 0-14 天窗口对人完全不可见、人工闸门零留痕不可审计，三者叠加把晋升吞吐掐死
  （13 天零晋升、21 条积压）。回归钉 test_memory_system MemoryReviewRound2026_07_15（含「digest
  生成的命令必须过目标 argparse」契约钉——一键晋升命令带未定义 --reviewer 是同类命令级错误第二次）。
- 检索中文分词 + 度量闭环接线（同评审）：tokenize 拉丁/CJK 分离 + 中文 bigram + 虚词过滤（旧
  `[\w#-]+` 把整句中文吞成巨 token，整句 query 必然零命中，26 条 miss 尸检实证真实流量漏检 ~15%）；
  同批调权重（同义组多命中折叠计一、bigram 半权、exact-phrase ≥2 字符、7 天内 recency 5→10）；
  retrieval-log 增记检索参数 + source 打标（MEMORY_SEARCH_SOURCE=test 免污染，legacy 行排除出
  决策统计——历史 158 条中 54% 是 e2e 测试流量）；--mattered 接线（CLAUDE.md 读取协议 + digest
  「🔎 检索度量」节，ADR-0006 裁决从此有 owner）；reviews.jsonl/retrieval-log.jsonl 移出 gitignore
  入库（审计轨迹不再单机孤本）。
- eval-log BUILD-lite（同评审三台账裁决）：record_eval 触发从 orchestrator prose 迁入 quality-gate
  agent 定义 §4b（确定性自落账 + fail-open）——为什么：prose 约定实证 2026-06-28 起失守（其后 3 个
  quality-gate session 零记录），「有意冻结」是对既成断链的追认；run-log 维持 FREEZE（0 字节本身即
  裁决票据）；retrieval 走修采集。record_eval 顺修 ROOT 默认 cwd→仓根 + 本地时区→UTC。
- hooks 布线契约回归 SETTINGS-002（2026-07-14 hooks 层评审，S22 手法延伸）：settings.json 六 hook
  挂对事件 + PreToolUse matcher 覆盖面 + fork HEAVY set 注入（条件化，两仓同文件）+ README §8 表
  与真实布线一致；capability-parity 补 project-scope-guard/post-edit/session-end/test-hooks 四文件
  锚点与 route-guard「命名即切换」锚——为什么：README 手写表把 project-scope-guard 写成 PostToolUse
  （重定向必须在工具执行**前**，语义级误导）、session-end 写成 Stop，零机检漂移无人察觉；且三个
  hook 文件此前完全不在 parity 锚点内，「命名即切换」漂移 8 天 S18 抓不到。

### Fixed
- 自成长闭环「异常→人看见」最后一公里四断点（2026-07-15 记忆+自成长层评审，先实证复现再修）：
  ① check_loop_health 的 pending 积压检测只查权威库而捕获侧写在 fork（事故最可能发生的仓失明；
  fork_home 参数 07-10 出生即悬空）——改查两仓并集 + spawn 显式传 GOVERNANCE_CALLER_ROOT；
  ② 异常可见性三层串联断（skip 降频压制/预览 14 行截断/stdout 丢弃，最坏 8 天盲窗）——loop 检查
  前移到降频判定前且异常构成写 digest 理由、标题行带异常计数、spawn stdout 接 governance.log；
  ③ .checked 认领痕双语义掩蔽崩溃日——治理完成写结果 JSON 进 marker（空=崩溃痕）、方向一检测只认
  非空、session-restore 对陈旧空 marker 提示补跑；④ 🌱 通知等"给人看的"信号全走 stderr 死信——迁
  stdout 用户可见通道（test-hooks CONC-005 契约随行更新）。回归钉 2 条（fork 积压/空 marker）。
- 记忆管道数据完整性三暗坑（同评审）：畸形 jsonl 行整文件重写静默蒸发（实证 22 行变 21 行零告警；
  read_jsonl_with_raw 保留 (None, raw) 原样带走）；promoted-facts source 裸写含冒号毒化 YAML 严格
  解析（yaml_scalar 引号化）；review_candidates --promote 把缺元数据候选自动写 rejected 终审并
  静默归档（可补救状态改只 skip 不落 review）。另删 review_candidates 死代码 promote()（从未被
  调用且已与主实现漂移：丢元数据/漏 source 字段/自带第二份 SF-sync 实现）。
- Session 生命周期 hooks 五处真问题（2026-07-14 hooks 层评审，全部先实证复现再修）：①「命名即切换」
  route-guard 实现 2026-07-06 起只落 fork，母版 hint 仍发「确认后执行」与母版 CLAUDE.md 自相矛盾
  （补齐母版 + STICKY-008c 回归随行）；② Stop 链（session-sync）项目真值仍读共享软链——pin=projA
  时拦截归因/checkpoint/topic 全指向软链的 projB（方案A 补全：pin 优先、失效 pin 回退不复活幽灵
  目录，SYNC-PIN-001/002 回归）；③ MEMORY_ROOT 重定向下 fork session 写脏母版记忆无人提醒（前日
  A11 WARN 即此症；改两仓都查并点名脏仓，SYNC-MEM-001 回归）；④ README §8 表两处布线张冠李戴（见
  Added 条）；⑤ route-guard pin 绑定用裸子串——"amusement" 实证误绑 pin=muse（改与 projectGate 同源
  的词边界匹配 nameMatchesIn，STICKY-011 回归）。另 project-scope-guard Bash 保守重写把字符串字面量
  当路径位（本 session 三次实证 deny/静默改写 grep 模式）裁决为接受的安全侧权衡：不改重写逻辑，
  deny 文案给出字面量误伤自救指引 + 头注补记。会咬证据链：新测试×母版旧状态按序精准红
  （SETTINGS-002→STICKY-008c→SYNC-PIN-001），逐项修复逐项转绿。
- Agent 编排体系能力升级（2026-07-14 编排层评审）：Plan Agent 三新增——块 0 前提门（先判「该不该解/
  更小替代」+ kill-assumption，premise-first 两次纠正升格为结构化步骤）、增量重规划协议（gate 连败/
  NEEDS_CONTEXT/前提翻车 → delta 只重规划受影响 U-block，U-ID 冻结照守，不推倒全案）、块 5 出门自检
  （六条机械核对，散落 MUST 收拢成出门动作）；verify S22 agent 契约常驻回归（45 断言守护 OD-first
  三处锚/六值状态枚举同步/触发边界/双重身份/orchestrator 路径映射逐行落盘/模型档快照；会咬证据：
  故意退化恰好 1 条红 exit=1→还原绿）；daily_governance 增 eval-log 消费节（record_eval 台账此前
  零读取，又一个写而不读的台账；fail-open、不改 digest 写入门槛）——为什么：编排层评审发现五份
  agent 文件是手写散文互相引用、无机器守护跨文件契约，7 月路由大改三处漏同步三周无人察觉。
- 对标深评制度化为演进模式 2（BENCHMARK-RUNBOOK.md：目标取自 opportunities 池/高信号 hub，六步流程
  复用 mattpocock 先例结构）+ scout 增 AdoptionReview phase（读 adoption-log 出 keep/watch/revert）
  + digest 首节三件套强制（采纳复盘 / 上期 opportunities 逐条裁决 / addressed 满 90 天复核窗）——
  为什么：深度评审实证 scout 主管线 APPROVED 转化率为 0、最高价值采纳全来自体系外对标（其 gap 是
  对标反向创造的），且采纳复盘在首个到期周期即漏执行（adoption-log helped 全 unknown）。
- 演进簿记确定性脚本 scripts/evolution-bookkeep.mjs（candidate-log 追加 + yield_stats/
  zero_yield_streak 机械更新 + N=3 连续零录取剪枝告警；幂等守卫/--dry-run/--force，fixture 8 断言
  实测）——为什么：propose-only 曾把安全簿记也推给人工（2026-07 漏追加 candidate-log 致跨月去重
  失效）；红线精确化为「行为面零编辑，簿记走人触发脚本」。

### Fixed
- Agent 编排体系六处真问题（2026-07-14 编排层评审）：plan-agent 设计产出路由整体 OD-first 重写
  （原文 0 次提及 open-design、25 次提及已降级的 magicpath——规划器与执行面两套真值打架；Gap 2 改
  OD daemon→MagicPath→html-prototype 三级降级检测）；preflight 检查表补 open-design/quick-research/
  code-recon/code-hygiene 行 + 「未列出 skill 报 WARN」防新 skill 前置检查静默裸奔；quality-gate
  品牌合规/Brief 合规触发补 open-design（OD 拉回的主产物恰好绕过两组检查）；WA 完成报告补
  NEEDS_CONTEXT 状态（plan-agent 要求 WA 触发、WA 合同只有两值发不出——契约裂缝）；plan-agent
  上游 tech-spec 硬门限定产品设计链任务（原字面覆盖一切任务被常态忽略，失信规则比没有更糟）；
  orchestrator/work-agent-template 撤 frontmatter（行为模式文档/未填模板被注册为可 spawn subagent
  的双重身份）。gate FAIL 状态回滚 IN_PROGRESS、2/3 文件触发边界对齐 CLAUDE.md、品牌色 grep -o
  计数（-c 数行低估同行多次）一并修。
- 母版 code-recon 整体缺失漂移（S22 首跑即咬到）：adoption-log 记了采纳、gaps-register 标了
  addressed，但 skill 本体/CLAUDE.md 段落/routing 词条/model-routing/input-modes/office-wizard
  六件套从未落母版——「装完就完不算数」红线在母版真实发生；以 fork 为准全量补齐，并纠正母版
  model-routing 双仓注记（曾把 code-recon 误记为 fork 专属）。
- 演进 scout 五处机制缺陷（2026-07-14 评审加固轮）：硬门改 default-deny（schema enum PASS/FAIL +
  非规范串一律 FAIL——原 ==='FAIL' 判定可被 "FAIL (…)"/"UNKNOWN" 静默绕过）；redteam agent 未返回
  由默认 stands 改保守 downgraded（2026-07 实证红队是唯一砍掉全部幸存者的决定层，静默失败≠无异议）；
  评分权重按 reuse_mode 分档（port-pattern/adapt-idea 免 adoption/maintenance 重罚——历史最高价值
  采纳全是小仓借想法，原权重令其结构性够不到 APPROVED 线）；candidate-log 永久拉黑改分级
  （REJECTED 183 天 TTL 后可重浮、opportunities 永不拉黑——原机制与 digest「可重新提案」承诺直接
  矛盾）；external-skill-scout 非冗余硬门改读 self-model 活真值（硬编码清单已漂移，缺 code-hygiene/
  quick-research/muse-* 等 2026-06 后新增能力）。演进面文件同步登记 capability-parity 锚点，
  顺带治愈母版 gaps-register 缺 GAP-brownfield-design-entry 的既有漂移。
- Stop 提取增量重拦（session-sync：marker 记录裁决时计数基线，后续增量超阈值→再拦一次，拦前刷新
  基线防循环，SESSION_SYNC_REARM=0 关断）——为什么：马拉松 session 首次裁决后 marker 曾使后续
  实质工作零兑底（既不拦也不写 pending，实证靠用户点破），SC-20260713-001 经用户裁决落地。
- 路由链路检查（routing-chain-check.md：dispatch 前三规则——R1 研究前置仅两裸奔点 brainstorm/
  ux-brainstorm、R2 设计产出 OD-first 执行面、R3 端到端意图确认门 + Ask 纪律防双重打扰）——为什么：
  用户指出单 skill 命中会坍缩链路意图；逐 skill 输入契约调查证实其余 skill 自带硬门禁，路由层只补
  skill 管不到的 dispatch 前 junction；semantic fixture +5 度量（ask:/flow:od-design 形态）。
- 语义路由契约（CLAUDE.md/AGENTS.md 通用反射：route-guard STOP/漏命中不豁免模型语义评估，甲类能力
  按含义路由 + 乙类过程纪律显式排除）+ 路由命中率度量基建（eval_routing.py keyword 层回归门进
  verify S20 / semantic 层 judge 工作单 / fixtures 按仓分叉）+ route-guard 多功能需求信号（已有项目
  多功能口语需求 → PLAN_MODE，直呼优先不劫持斜杠命令）——为什么：用户实测"项目里自然语言描述需求
  经常不命中 skill/流程"，深度评估判定真问题是"甲类语义路由的统一与可度量"；经 fable 两轮对抗审查
  （4 独立审查官 20+ 发现全部实证修复/登记）后落地，golden 52 例 + keyword fixture 24 例守护。
- mattpocock/skills 对标（51 单元全量深评，评估链在 muse fork framework-audit/mattpocock-benchmark-2026-07/）
  首批落地：install codebase-design + resolving-merge-conflicts（routing 词条+FM-11 实测）、tdd 刷新
  391a2701、新建 .claude/skill-os/skill-authoring.md（写 skill 手艺 doctrine）、code-hygiene v1.1.0
  （双轴审查+护栏会咬条款）、diagnosing-bugs 四机制 port 进 systematic-debugging——为什么：对方在
  工程纪律线（调试反馈环/竖切/写作元词汇）上有我方可验证缺席的机制，全部经红队+行为 A/B 后按 GATE-2
  裁决落地；四个 gap 开启（skill-authoring=addressed / registration-sync / lightweight-research /
  issue-tracker=open）

## [0.2.1] - 2026-07-05

### Added

- 一条命令把本机的记忆和自进化状态推回 GitHub：跑 `bash scripts/sync.sh` 就能把 episodic 索引、语义事实、演进 digest、观察记录等自变更文件同步上去，干净时会直接告诉你"无需同步"。
- 收尾更省心：session 结束时如果还有没推的记忆/演进状态，会看到一句 🔔 提醒你跑 `scripts/sync.sh`，不再需要自己记着。

### Removed

- 死代码清理（ADR-0001）：删除 orphan 脚本 `scripts/fix_long_lines.py`、`scripts/repair_backticks.py`；删除已废弃的 `.claude/hermes/` 目录（Procedural 记忆层已并入 semantic `domain:skill-rule`，不再委托 hermes）。

### Fixed

- 清理 `.claude/skills/office/SKILL.md` 与 `.agents/skills/office/SKILL.md` 中指向已删除 hermes 脚本的悬空引用、残留命令片段，并统一两侧"成长记录协议"小节的标题与触发列表。

## [0.2.0] - 2026-05-17

### Added

**Phase 1-3（标准开发规范基础设施）**

- Git 仓库、`.gitignore`、pre-commit 安全钩子（硬失败模式，内联 API key 扫描）
- CI/CD 工作流（`.github/workflows/ci.yml`）：YAML 校验、Markdown 校验、Skill 完整性检查
- Session 生命周期 hooks：SessionStart、UserPromptSubmit、PostToolUse、Stop
- 项目文档：README、CHANGELOG、SECURITY、CONTRIBUTING、LICENSE
- 验证脚本：`scripts/verify.sh`（26项）、`scripts/validate-skills.sh`
- 架构决策记录：`docs/adr/ADR-001-skill-first-graph-optional.md`
- Context 工程协议（CLAUDE.md）：Checkpoint 机制、懒加载原则、Agent context 预算

**Phase 4（三层记忆系统）**

- Episodic 记忆层：`memory/episodic/index.jsonl`（滚动索引）+ `append_episode.py`
- Semantic 记忆层：`memory/semantic/promoted-facts.yaml`（Hermes-lite 管道）+ `propose_semantic.py`
- Procedural 记忆层：委托 `.claude/hermes/promoted-rules.yaml`（零新增存储）
- 统一懒加载入口：`memory/scripts/get_memory.py --summary / --layer / --domain / --skill`
- session-restore.mjs 集成记忆摘要（SessionStart 自动加载）
- session-sync.mjs 集成记忆写入提示（Stop 时提示记录当次 session）
- 初始语义事实：5 条稳定 CRM/FxUI 事实预置

**Agent 体系重设计**

- Orchestrator v4.0：双模式（Free Task Mode + Skill Workflow Mode），Free Task Mode 支持任意复杂任务编排
- Plan Agent v2.0：定位重梳理，明确"规划器"角色，输出是 Orchestrator Free Task Mode 的输入
- Work Agent Template（`.claude/agents/work-agent-template.md`）：13 变量实例化，含 Input/Output Contract、执行协议、硬性约束、Done Criteria、Failure Protocol
- Quality Gate v4.0：双模式（Free Task Mode 执行任意断言 + Skill Mode 审查 skill 产出），测试层与执行层正式分离

## [0.1.0] - 2026-05-16

### Added

- luca_gstack Skill OS 初始版本
- 核心 skill 体系：idea / brainstorm / deepresearch / ux-research / ux-brainstorm / design-brief / html-prototype / figma-layer / figma-demo / ux-audit
- Skill 编排框架（Skill-first, Graph-optional 架构）
- 可选 workflow graph（4 个场景路径：A/B/C/D）
- HTML 原型母版（framework/）：list、detail-2col、detail-3col、form、home
- 品牌 token 体系（brand-tokens.md）
- 跨 session 长期记忆（CONTEXT.md）
- Hermes 规则自成长机制（.claude/hermes/）
- Observability 体系（.claude/observability/）
