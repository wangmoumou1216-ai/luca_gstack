# Checkpoint：三 session 合并统筹 + 记忆单一权威 + 三 repo 备份（2026-07-09）

> 用途：记录 2026-07-09 一整串跨 session 收口工作，供未来追溯/接续。
> 涉及三个 repo、三个并行 session（memory-eval / 深度审计 / muse-app）。

## 一句话
把「memory-eval session」「深度审计 session」「muse-app UI 重构 session」三方的产出全部对账、合并、备份，
执行了记忆单一权威 store，给三个 repo 都建/补了远程备份。全部实测验证、无互相踩踏。

---

## 已完成 ✅

### 1. 双 session 合并对账（memory-eval × 深度审计）
- 两套改动线性叠加、文件级零踩踏（只共同碰 CLAUDE.md/plan-agent.md，非重叠段）。
- 唯一语义冲突（绑定即注入 vs never-switch 记忆的 meta-session 灰区）→ CLAUDE.md 加边界条款修复（`0f2be54`）。
- 独立红队逐项对抗验证：6 项 5 兼容、1 冲突已修。我的 12 项 memory-eval 改动在 fork HEAD 全存活、审计零触碰机制文件。

### 2. memory-eval 母版 port（框架 feature 落点纪律扶正）
- 审计 session 用 `git apply delta`（非逐字覆盖）把我的改动叠到母版、保住母版独有内容（README EVAL-DEFERRED 冻结）。
- 母版 `b3a7f07`，已推 origin/main。中性化到位（muse-proto-judge/code-recon=0）。

### 3. 记忆单一权威 store 执行（decide-ledger F5-02/03，收窄范围）
- `.gitattributes` 给 append-only 流水（episodic index/archive、semantic archive）标 `merge=ours` + sync-upstream.sh 注册驱动（`266b5b1`）。
- **关键：收窄范围**——决策原文「memory/semantic/** 整体」过宽会让 fork 停继承母版策展框架事实=知识漂移；改为仅纯流水 merge=ours，策展文件（promoted-facts/allowlist/README）仍正常继承母版。
- 真实 3-way merge 测试验证：流水保 fork 版（零冲突）、策展继承母版。

### 4. person 层 never-switch 记忆迁移（M1 一致性）
- `feedback_never-switch-parallel-session-projects.md` 从 fork auto-memory 目录迁入母版 canonical 目录 + 索引，fork 留指针。

### 5. 三 repo 远程备份（消单盘丢失面）
- **gstack fork**：backup/muse + upstream/muse 双远程，均 `e78b00a`。
- **母版**：origin/main `b660593`（含 EP-20260709-058 episodic）。
- **muse app**：新建私有仓 `wangmoumou1216-ai/muse`，origin main + refactor 分支，`6b339f3`。

### 6. muse app main.js + UI WIP 收口
- main.js 环境残留修复（删 SESSION_SYNC_BLOCK:'0' + shell-wrap 重构）由审计 session `git add -p` 单独提交（`33ae32f`）。
- UI 重构 WIP：UI 验证通过后，A 组（renderer/终端/图标）`f81c44b`、B-memory `55d6747`、B-docs `d0a6e1c` 提交；D 组垃圾 agent-report-*.html 删除+gitignore（`6b339f3`）；C 组空骨架（CONTEXT.md/decisions.md）留待填。

## 关键决策（不可从代码推导的）
- **排除记忆合并面必须区分 append-only 流水 vs 策展知识**——一刀切 semantic/** 是错的（会漂移框架知识）。同理母版 port 用 delta 而非覆盖，别踩对方独有内容。
- **非破坏性 WIP 备份**：用 git 底层 `commit-tree`+临时索引快照未提交 WIP，不碰工作树——保命备份 ≠ 替 owner finalize。
- **不盲提别人的活**：UI 未验证前只快照不提交；验证通过后按 A/B/C/D 分类提交（B 安全先提、A 验证后提、C 空骨架跳过、D 垃圾删）。
- **提交纪律**：全程 env -u 规避 SESSION_SYNC_BLOCK/MEMORY_ROOT 残留；触碰母版同 session commit + push；跨仓用 git -C 不用 cd 链。

## 待执行
1. **重启 muse app** —— 清 SESSION_SYNC_BLOCK 残留（代码已修 `33ae32f`，只差重启激活；只有 luca 能做）。
2. **C 组空骨架**（muse app 的 CONTEXT.md / .luca/memory/decisions.md）—— 可选填内容，不填不碍事。
3. **押后在 BACKLOG（决策，非未完成）**：muse-loop 真跑（冻结待真实语料）、13 项 adopt-pending DECIDE（decide-ledger）、审计 BACKLOG 各带触发条件项。

## 恢复指令（新 session 接续时）
1. 读本文件 + `framework-audit/2026-07-07-deep-framework-audit.md` + `2026-07-09-decide-ledger.md`。
2. 三 repo HEAD 对照：fork `e78b00a`、母版 `b660593`、muse-app `6b339f3`（各自远端应同步）。
3. 若要动母版/muse-app 记忆：注意记忆单一权威=母版；fork 的 episodic/semantic 流水已 merge=ours 冻结。
4. env 残留：重启 app 前所有 git commit 用 `env -u SESSION_SYNC_BLOCK -u MEMORY_ROOT -u GLOBAL_MEMORY_DIR`。

<!-- FILE_END: 2026-07-09-merge-coordination-checkpoint -->
