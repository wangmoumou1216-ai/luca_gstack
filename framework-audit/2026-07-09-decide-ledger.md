# DECIDE 裁决台账 — 2026-07-07 深度审计的 23 项 DECIDE 项

> 审计（`2026-07-07-deep-framework-audit.md`）产出 66 条 CONFIRMED，其中 23 条标 DECIDE（需 luca 裁决）。
> 本台账逐条定案。状态：**已解决**（本轮已修/已定案）/ **采纳-已执行** / **采纳-待办**（决策已定，执行留 BACKLOG）/ **观察项**（暂不动）。
> 裁决人：luca（授权本 session 执行 #2/#3/#4）。执行：2026-07-09。

## 三个最重项（用户点名）

### 1. 框架 feature 落点纪律（F5-06 / F5-07）— **采纳-已执行**
**决策**：框架级 feature **先落母版、fork 走 sync-upstream 继承**（审计自身结论）。fork-first 的
memory-eval 已**追溯扶正**：其 delta（`08e1fb2^..11bd188`）经 `git apply` 干净落母版，母版 commit
`b3a7f07`、verify 52 PASS。今后框架级改动（非 muse fork 专属）默认落母版。
**遗留**：命名即切换/方案A 等已发生的 fork-first 项不追溯（成本>收益）；只约束今后。

### 2. person 层 canonical 目录（F1-05 / F2-07）— **已解决（M1 定案）**
**决策**：person 层 canonical = **母版编码目录**（`-Users-luca-Desktop-luca-gstack/memory/`）。
memory-eval M1 已定案并执行：fork 4 条 union 迁入母版、fork 留 `reference_person-memory-canonical-dir.md`
收口写入指向。本 session 写的 `never-switch-parallel-session-projects` 也已迁母版 canonical + 索引。
**遗留**：harness auto-memory 实际注入面（`GLOBAL_MEMORY_DIR`）已指母版，与定案一致。

### 3. 记忆单一权威 store（F5-02 / F5-03）— **采纳（原则）+ 已执行（2026-07-09，commit 266b5b1）**
**决策**：**母版 = 全部记忆层（episodic/semantic/person）的单一权威**。muse app 注入
`MEMORY_ROOT=母版` 已让 fork session 的记忆读写落母版，实践上即单 store；三头分裂只在「裸 CLI 跑
fork（无 MEMORY_ROOT）」时出现。
**执行（已落地 266b5b1）**：`.gitattributes` 给 append-only 流水标 `merge=ours`（sync-upstream 时
保 fork 版、不与母版冲突）+ sync-upstream.sh 幂等注册 `merge.ours.driver=true`。**收窄范围**（评估
发现决策原文「memory/semantic/** 整体」过宽会踩坑）：仅 `episodic/index.jsonl`、`episodic/archive/**`、
`semantic/archive/**`（纯流水）设 merge=ours；策展文件 `promoted-facts.yaml`/`static-fallback-allowlist.txt`/
README **不排除、仍正常继承母版**，避免 fork 静默漂移继承不到母版新晋升的框架事实。真实 3-way merge
测试验证：流水保 fork 版（零冲突）、策展继承母版。未动 .gitignore（文件仍 git 追踪，备份安全）。

## 其余 20 项逐条

| 项 | 定性 | 裁决 |
|---|---|---|
| **F1-01/F4-01** 环境残留本体 | 已解决 | 源头=muse app `main.js:75`，`SESSION_SYNC_BLOCK:'0'` 已删（旧 headless 遗留）；`MEMORY_ROOT`/`GLOBAL_MEMORY_DIR` 有意保留。待 luca 重启 app 生效（见审计「待动作 #1」） |
| **F1-04** 命名即切换 pin 预写假漂移 | 观察项 | 07-08 方案A（project-scope-guard PreToolUse 重定向）已重构该层，本发现按旧代码验证。**待办**：在方案A 之上复核假漂移告警是否仍存在，存在再修 |
| **F1-07** project.sh 三链非事务 | 采纳-待办 | SIGKILL 窗口留部分切换态、启动侧只判悬空。**待办**：session-restore 悬空 gate 扩展为「三链指向项目一致性」检查。低频，非紧急 |
| **F1-10** Stop 按回合触发 vs 文档「session 结束统一裁决」 | 采纳-待办（文档） | 采纳「文档如实化」（便宜）而非「marker 加时效」（重）。**待办**：CLAUDE.md 写入协议措辞改「首个达阈值回合末拦截一次」。批量文档修一起做 |
| **F2-05** 治理降频 has_change 被待决态击穿 | 观察项 | digest 经 marker 只展示一次、部分触发含合法增量——「实质失效」言重，是局部回归。暂不动，随治理链下次改动一并收 |
| **F2-06** pending stub 积压 | 已解决 | F1-03 修复（trivial 不写 + marker 回收 + 7 天 TTL GC）后 7 天内自然排干。无需额外动作 |
| **F2-09** archive 后 episode 检索不可见 | 采纳-待办 | **待办**：search_memory/get_memory 加 `--include-archive`（或默认并入 + 降权）。涉及检索性能/噪音权衡，留独立任务 |
| **F3-05** plateau 判定 SSOT（judge vs 编排器） | 采纳-待办 | 决策：plateau 判定移入**编排器**（judge 冷启动隔离只做单轮判定）。随 muse-loop 冻结解冻时一并做（见 F6-02） |
| **F3-10** gen⇄judge 轮次无持久化 | 采纳-待办 | 决策：轮次落 scorecard 的 rounds 字段（F3-04 已定义）。随 muse-loop 冻结解冻做 |
| **F3-16** derived-fallback「打折」不可执行 | 采纳-待办 | 决策：derived-fallback 的 PASS **不计入 flip-verified**，需人工确认。随 muse-loop 冻结解冻做 |
| **F5-04** fork session-sync 指向必然失败的 sync.sh | 观察项 | 母版=单权威后，fork session 记忆经 MEMORY_ROOT 写母版、母版有 origin，sync.sh 在母版上下文正确。裸 fork CLI 才失败——低频，暂不动 |
| **F6-01/F6-07** 元层自增无刹车在数数 / 审计频率自我复制 | 采纳-待办 | 决策：① daily_governance 加「框架 commit 计数」（机械可数）月度 digest 呈现；② 全量多 agent 审计**季度封顶**，日常改「真实使用暴露问题时针对性小审计」。机制留 BACKLOG，纪律即刻生效 |
| **F6-02** muse-loop 建而未用 | 采纳-已执行（冻结） | 决策：**冻结 muse-loop 一切新建设**，直到用一批真实需求语料完整跑一次 GATE-1→verified。本轮只修契约正确性（F3 ×11），未加新能力——符合冻结。F3-05/10/16 的执行也挂在解冻后 |
| **F6-04** 双仓拓扑不可持续 | 采纳-部分执行 | 决策：① fork 远程备份（**待 luca 跑 #3 命令**，auto-mode 拦了 agent 建仓）；② 母版已 push（#2 完成）；③ 母版-first 纪律（本台账项 1） |
| **F6-05** 路由契约 5 镜像面 2728 行 | 采纳-待办 | 决策：长期收窄镜像面（CLAUDE.md 瘦身 + 07-03 悬空 P2 结构决策一并裁）。需独立 effort，非本轮 |

## 本轮已执行动作汇总

- **#2 母版 push**：`64b6a68`（审计修复）+ `b3a7f07`（memory-eval port）已推 origin/main ✅
- **#4 框架落点纪律**：memory-eval 扶正到母版（`b3a7f07`，verify 52 PASS）✅
- **#4 person canonical**：M1 定案 + never-switch 记忆迁母版 ✅（并行 session 已完成）
- **#1 环境残留**：muse app `main.js:75` 删 `SESSION_SYNC_BLOCK:'0'`（待重启生效）✅
- **#3 fork 备份**：auto-mode 数据外泄防护拦了 agent 建仓，**命令交 luca 亲跑**（见报告）⏳

## 需 luca 亲自执行

**#3 fork 远程备份**（agent 在 auto-mode 无法建新仓 + 推全树，这是正确的安全拦截）。在终端跑：
```bash
gh repo create wangmoumou1216-ai/luca-gstack-muse --private -d "Private backup of muse fork of luca_gstack"
git -C ~/Desktop/项目/muse/gstack remote add backup https://github.com/wangmoumou1216-ai/luca-gstack-muse.git
git -C ~/Desktop/项目/muse/gstack push -u backup muse
```
（仓名/私有可自定；这消掉 F6-04 的 fork 单盘零远程丢失面。）

<!-- FILE_END: 2026-07-09-decide-ledger -->
