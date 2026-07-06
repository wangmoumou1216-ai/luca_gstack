# 2026-07-06 · muse fork 换母版后逻辑/冲突审计

> 触发：`upstream` 远程从本地 clone `/Users/luca/Desktop/luca_gstack` 切到 GitHub
> `wangmoumou1216-ai/luca_gstack.git`（云端）。用户担心引用错、逻辑冲突。
> 方法：5 维度并行 find（路径完整性 / 运行时冲突 / 配置冲突 / skill文档冲突 / muse独有自洽）
> → 每条 finding 独立对抗式 verify（重跑证据、试图证伪）。33 agent，27 原始 → 24 存活、3 证伪。

## 结论

**换母版这个动作本身没弄坏任何东西**——`git remote set-url` 只改 `.git/config`，
`sync-upstream.sh` 逻辑走 `upstream` 远程（不硬编码路径），切换后当前运行时零破坏。
真正的问题分两类：① 合并母版那一刻才会爆的冲突（1 个危险，未处理，见下）；
② muse 自身新代码里预存的内部不一致（与切换无关，本轮已修完）。

fork 无 `origin` 远程；本轮全部为本地 `muse` 分支提交，未 push、未碰母版。
经核，24 条 finding 无一条是"母版也有的通用 bug"（均为 fork 独有文件或母版已修好），
故无任何东西需回流母版。

---

## ✅ 已修复并验证（9 commit，本地 muse 分支）

| Commit | Finding | 问题 | 验证 |
|--------|---------|------|------|
| `799b173` | D5-1 | muse-req-triage 要跑 node 但 allowed-tools 无 Bash（EARS 校验跑不了）→ 加 Bash，v2.3.0 | 权限就位 |
| `799b173` | D5-8 | check-ears-syntax 把裸"应当"判 PASS → 加"应当后必须有响应"硬门 | 裸"应当"→FAIL，合规仍 PASS，无回归 |
| `a80e491` | D4-1 | tech-spec design-brief handoff 告警死子路径（topic 非空但无匹配→静默取错且不告警）→ 告警改绑 `_FILTERED` | 4 情形夹具全过 |
| `5413436` | D5-3 | 状态机 `approved_design` 越界 schema 枚举 → 按红队 A2 归位为 GATE-2 子步骤 | 7 节点全在枚举内 |
| `7889741` | D5-2 | `qualitative_signal` 字段名 3 处打架、`requester_role` 无落盘 → 统一到 schema SSOT + 补落盘位 | 三文件四信号名一致，旧名残留=0 |
| `d6ec8ef` | D5-5 | check-muse-loop-sync 从未接入 verify.sh → 接为 S17（fork 无 origin，pre-commit 是唯一自动落点） | verify 48/0/1，S17 绿 |
| `d6ec8ef` | D5-6 | 该守卫过度声明"改清单也响"（实际只查子串存在）→ 注释诚实化 | — |
| `92cf86a` | D1-2/3/4 | sync-upstream.sh / ARCHITECTURE.md 仍把母版写成本地路径、默认分支说法误导 → 标注 GitHub/落后 main 24 条/可选 clone | bash -n 通过 |
| `a235a0d` | D5-4 | GATE-1 索引"6 个条目名"却 / 分隔出 7 → 第1项内部 / 改 + | 计数=6 |
| `a235a0d` | D5-7 | frontmatter 触发短语列 3/4 → 补 'muse自进化循环' | == yaml triggers |
| `94c875d` | D3-2 | route-guard PLAN CHECK 提示"4条件"漏第5条 → 补为 5条件 | node --check + PLAN CHECK 行为不变 |
| `6134936` | D1-1 | launchd plist 硬编码母版路径（opt-in）→ 记忆拓扑是刻意设计，不擅改路径，加安装 caveat | — |

每次提交均经 pre-commit 全量 `verify.sh`（47→48 PASS / 0 FAIL）。

---

## ⏳ 留待"合并母版"时处理（未改，本轮刻意不动）

> 用户暂缓合并母版（把母版 30 条拉进 muse）。以下几项**只在合并那一刻发生**，
> 当前 muse 跑得正常，故记录在此，待决定合并时按此清单处理。

### 🔴 D2-1 / D3-1（HIGH，最要紧）——route-guard HEAVY 合并冲突会静默阉割 muse-loop 的 PLAN 门

- 母版 flow-optimization G4 把 `HEAVY_ORCHESTRATOR_SKILLS` 改成 env 驱动、**默认空**
  （`new Set(envList('ROUTE_GUARD_HEAVY_SKILLS')...)`），设计成 fork 靠环境变量注入的扩展点；
  muse 仍是静态数组含 `/muse-loop-orchestrate`。两边改同一段 → **UU 硬冲突**（全仓唯一冲突文件）。
- **陷阱**：唯一能保住母版 G2/G3/G6 逻辑、且让合并后 test 全绿的解法是取母版 env 块；
  但 muse **全仓没设 `ROUTE_GUARD_HEAVY_SKILLS`** → 那样 muse-loop-orchestrate 从 PLAN_CHECK
  **静默降级为 SINGLE_SKILL 直接执行**，违反 CLAUDE.md 铁律，且自测零覆盖不会报警。
- **正确解法**：解冲突取母版 env 块 + 在 `.claude/settings.json` 的 route-guard hook env 注入
  `ROUTE_GUARD_HEAVY_SKILLS=muse-loop-orchestrate`（要保 /auto 一并加）。母版注释已明确点名
  `/muse-loop-orchestrate` 是合法 fork 成员——这不是理念冲突，只是接线未做。
- 同时把本轮 `94c875d` 的 5条件 hint 取母版更优版（指向 plan-agent.md）。

### 其余（LOW，合并即自愈或无当前缺陷）

- **D3-4**：muse 的 HEAVY 集里 deepresearch/ux-research/figma-demo 是 pre-G4 陈旧成员（母版已迁 plan-agent.md 豁免名单）；随 route-guard 冲突一并按母版方向解。
- **D3-5**：figma-demo/compare/magicpath 在 muse 仍一级路由，母版已降级隐藏 → 合并自动自愈（路由表/CLAUDE.md 两侧改动正交）。
- **D2-3**：test-hooks 干净合并，但合并后 CONC-006/STICKY-008 会实跑母版 session/pin 逻辑 → 解 D2-1 后跑 `node scripts/test-hooks.mjs` 作回归闸。
- **D2-4**：合并后 package.json version=0.2.1 而 lock 仍 0.1.0（母版升版未带 lock）→ 合并后 `npm install --package-lock-only` 消除告警。当前 muse 两者均 0.1.0，无缺陷。

---

## 证伪 / 无缺陷（存档完整性）

- **证伪 3 条**：D3-3（AGENTS.md 未登记 muse skill——它是委托型适配器，本就不列，指向 routing-map SSOT）；D4-4（tech-spec 的 "muse-loop" 是正规子系统命名，非坏别名）；D4-5（changelog 完整性——非问题，context-cost 改动 inline 自注日期+G5）。
- **info/无缺陷 3 条**：D3-6（muse 新词条无路由碰撞、YAML 合法、plan-agent +1 行插入点成立）；D4-2/D4-3（brainstorm/task-plan/tech-spec 三件套 muse↔母版改动正交，可干净 auto-merge 成无损并集，母版未对其做 gate 重编号）。

<!-- FILE_END: 2026-07-06-post-upstream-switch-audit.md -->
