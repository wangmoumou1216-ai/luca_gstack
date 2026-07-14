# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **维护约定（2026-07-12，源 mattpocock changesets 叙事内核，MIT）：** skill/能力的生命周期
> 变更（新增采纳/重命名/reframe/降级隐藏/删除）在本文件记一条「变更 + 为什么」（一行式）。
> 与 adoption-log 互补：那边是采纳审计记录，这边是面向使用者的演进叙事。

## [Unreleased]

### Added
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
