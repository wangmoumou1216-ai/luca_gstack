# Handoff：memory-eval session → 审计 session（收尾合并交接）

> 目的：把 memory-eval session 的产出、已修冲突、以及**待做的母版 port** 完整交给审计 session，
> 让所有收尾（母版 port + push + 备份 + DECIDE）在**一个 session** 里干完，不再并行互撞。
> 生成：2026-07-09 by memory-eval session（sid 尾号 …2e81a2）。
> **读完先跑一次 `git log --oneline -6` 对齐当前 HEAD。**

---

## A. 我（memory-eval session）已经做了什么——fork 侧全部落定

muse 分支上，我的工作是 **4 个 commit，已提交、verify 53 PASS / 0 FAIL**：

| commit | 内容 |
|---|---|
| `08e1fb2` | M1-M4：项目 context 套装（project.sh 生成 CONTEXT.md/decisions.md）+ 绑定即注入 + Working 层命名 + person 层割裂修复 |
| `86827eb` | E1-E5：handoff criteria 评估绑定层 + eval-methodology.md + plan-agent criteria 子类 + quality-gate 废止 N/10 |
| `11bd188` | final-plan 执行状态行 |
| `0f2be54` | **红队对账后的冲突修复**（绑定即注入 vs never-switch 记忆的边界条款） |

**person 层割裂（M1）已在仓外 `~/.claude/projects/` 落定**：fork 4 条 union 迁入母版权威目录，
fork 留 `reference_person-memory-canonical-dir.md` 收口写入指向。这一项**不涉及 git 仓、不需要你再动**。

---

## B. 【禁止覆盖】我的改动，port 时必须存活

这些是我在 fork 里已落定的，**审计 session 做任何操作都不得回退它们**（已核验全部存活于 HEAD）：

- **8 个机制文件**（审计 c0affc0 零触碰过，保持原样）：
  `.claude/skills/office/references/handoff-protocol.md`（v3.2 criteria 块）、
  `scripts/check-quality-gates.mjs`（CRITERIA_SINCE 校验）、
  `.claude/skill-os/eval-methodology.md`（新文件）、
  `.claude/agents/quality-gate.md`（废止 N/10）、
  `.claude/skill-os/extraction-bar.md`（decisions 一源两视图）、
  `scripts/project.sh`（CONTEXT.md/decisions.md 模板 + 注入扩展）、
  `memory/scripts/record_eval.py`（gate-score 语义切换）、
  `memory/README.md`（Working 层）。
- **CLAUDE.md 两处 hunk**：462 行区「绑定即注入 + 边界条款」、530 行区「每个下游项目根也有 CONTEXT.md / 入场认知落盘」。（审计只改过 337 行 PLAN CHECK，不冲突。）
- **plan-agent.md**：327 行区「产出质量 criteria 子类」。（审计只改过 58 行 figma-demo 措辞，不冲突。）

---

## C. 【待做】母版 port——把 memory-eval 迁到母版（红队断点清单）

**背景**：这属于审计"待你动作 #4"里的"框架 feature 落点纪律"决策。审计自己的结论（F5-06/07）就是
框架 feature 该先落母版；memory-eval 是 fork-first，port 过去正是扶正它。**做与不做由 luca 定**；
若做，按下面走。母版 = `~/Desktop/luca_gstack`（HEAD=`64b6a68`），跨仓操作一律 `git -C <绝对路径>`，
**不要用 `cd A && ...` 链**（记忆：verify-repo-with-git-c-not-cd-chains）。

### C1. 顺序（必须先 port 新文件，否则引用悬空）
1. 先 port `.claude/skill-os/eval-methodology.md`（新文件，其他文件引用它）
2. 再 port 其余

### C2. 7 个零漂移文件——可逐字照搬（母版 baseline == fork pre-image，已核验）
`scripts/project.sh`、`.claude/skill-os/extraction-bar.md`、`memory/README.md`、
`.claude/skills/office/references/handoff-protocol.md`、`scripts/check-quality-gates.mjs`、
`.claude/agents/quality-gate.md`、`memory/scripts/record_eval.py`。
取 fork 的 post-image（`git show 11bd188:<file>`）覆盖母版同名文件即可——**除了下面 C3 的两处措辞**。

### C3. 硬断点——母版没有的 fork 专属引用，port 时改中性措辞
母版**没有** `muse-proto-judge` agent、也**没有** `/code-recon` skill。两处引用要改：

| 文件 | fork 现措辞 | 母版用的中性措辞 |
|---|---|---|
| `scripts/project.sh`（CONTEXT.md 模板内） | `完整结构按需 /code-recon，不在此维护长清单` | `完整结构按需现场结构侦察（ls/grep 或专用侦察 skill），不在此维护长清单` |
| `eval-methodology.md`（2 处：grader 选型段 + 格式参考段） | `格式参考 muse-proto-judge 的评分卡…` | `格式参考「逐 AC 二元判定 + 证据 + 4 类偏见规避 + 冷启动隔离」的评分卡（见 handoff-protocol v3.2 / quality-gate Skill Mode 的 criteria 块）` |

**provenance**：eval-methodology / check-quality-gates 注释里的 `final-plan Ex/§4` 指向
`framework-audit/proposals/2026-07-09-memory-eval-final-plan.md`——母版没这个文件。两选一：
(a) 把该 proposal 也 port 进母版 `framework-audit/proposals/`（保留可跳转溯源，推荐）；
(b) 改成纯日期标签 `（2026-07-09 评估体系批次）`。

> **要不要两仓逐字一致？** 若想未来 fork↔母版 merge 干净收敛（审计已证 verbatim 双写可干净 merge），
> 上面的中性措辞**也要回写到 fork 的 project.sh / eval-methodology.md**（多一个小 fork commit）。
> 若接受两仓这俩文件略有差异（未来 merge 一个小冲突），则只改母版侧即可。**推荐两仓统一中性措辞。**

### C4. plan-agent.md——criteria 子类 hunk 干净落位，但别带 fork 专属基线
- port 的内容 = 「块 3 断言列表」末尾、`### 块 4` 之前的「产出质量 criteria 子类」段。
  锚点 `- 不应存在的内容是否已清除` + `### 块 4 — 失败策略` 在母版逐字存在，插入干净。
- **不要 port** plan-agent 的两处 fork 早期分叉（母版本就没有、非本次范围）：
  L61 隐藏-skill 措辞差异、以及 `muse-req-triage（muse fork 专属）` 表行。

### C5. CLAUDE.md——唯一要手工的文件（母版结构与 fork 已分叉）
母版的「项目上下文门禁」是**更早的简版**（没有 fork 的"命名即切换总原则"blockquote，①-⑤ 更简）。
不能逐字贴，要手工放：
- **Hunk 1「绑定即注入 + 边界条款」**：挂到母版 ①「继承态例外」段（约 L447-450）后。措辞适配母版——
  母版 route-guard 提示语是「本 session 继承了激活项目 X」（非 fork 的「当前激活 X（并行保留）」），
  母版切换流是「用户确认后执行 switch」，母版 ②/③ 分支本就跑 switch/new（注入天然覆盖），
  **只需给 ① 继承/点名路径补**「确认归属后幂等 `./scripts/project.sh switch {name}`（注入 MEMORY.md/CONTEXT.md）」
  + 我的**边界条款原文**（meta/框架/审计 session 不适用、只读不 switch——见 fork CLAUDE.md 465-475 行区，
  这段可逐字搬，它不依赖 fork 专属结构）。母版同样有方案A+pin 层，"共享软链纯展示"在母版成立。
- **Hunk 2/3「每个下游项目根也有 CONTEXT.md」+「入场认知落盘」**：锚点
  `项目根目录的 CONTEXT.md…search_memory.py。` 与 `**写入时机：**` 在母版逐字匹配，**干净追加**。

---

## D. 与"待你动作"其余项的关系

- **#2 push 母版**：母版当前 `64b6a68` **未推**（实测 origin/main 还在 `b46c8bf`）。若做 C 的母版 port，
  会新增一个母版 commit，**和 64b6a68 一起 push**（`env -u SESSION_SYNC_BLOCK -u MEMORY_ROOT -u GLOBAL_MEMORY_DIR git -C ~/Desktop/luca_gstack push origin main`）。
- **#3 fork 远程备份**：fork 当前只有 `upstream` remote。定个私有备份仓再推 muse 分支（消单盘丢失面）。
- **#1 环境残留**：代码已修（app/main.js:75 删 SESSION_SYNC_BLOCK:'0'），**待 luca 重启 muse app 生效**；
  MEMORY_ROOT/GLOBAL_MEMORY_DIR 有意保留。任何 session 清不掉自己的残留，重启后新 session 才干净。
- **#1 提交纪律**：port 触碰母版 → **同 session commit**（记忆：commit-muban-if-changed），
  用 `env -u ...` 清净提交、**不用 --no-verify**；母版 pre-commit 的 C11 在残留下会假失败，用 env -u 规避。

---

## E. port 后母版验证清单

1. `env -u SESSION_SYNC_BLOCK -u MEMORY_ROOT -u GLOBAL_MEMORY_DIR bash ~/Desktop/luca_gstack/scripts/verify.sh` → 预期 **52 PASS 维持**（criteria 新校验是 WARN-only + 母版 clean checkout 无 docs/ → 跳过，不新增失败）。
2. `grep -rn "muse-proto-judge\|code-recon\|final-plan E" ~/Desktop/luca_gstack/.claude ~/Desktop/luca_gstack/scripts` → 若采纳中性措辞应**归零**。
3. 母版 `docs/` 是 gitignored session 软链，clean checkout 无此目录——check-quality-gates 的 handoff 块整体跳过，正常。
4. 两仓共享文件（7 个 + eval-methodology）逐字比对，确认可 verbatim（若走 C3 两仓统一中性措辞）。

<!-- FILE_END: 2026-07-09-memory-eval-handoff-to-audit-session -->
