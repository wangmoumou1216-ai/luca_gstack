/goal 执行 luca_gstack routing-steering 修复：按 `EXECUTION-PLAN-CORE.md` 修 E1/E2/E3 三个真实故障。计划已经过四轮独立评审（架构会审 + 三轮红队），luca 已批准执行。**先读计划全文再动手**，它是唯一执行依据。

---

## 唯一终态

`.claude/hooks/route-guard.mjs`、`.codex/codex-hook-adapter.mjs`、`.gitignore` 三个 runtime 文件按计划改完，且：

1. **E1/E2/E3 各有一条直接复现原始故障的回归用例**，改前红、改后绿；
2. 计划 §7.2 的 **16 条变异体逐条跑过**，每条都能让其所属断言转红（跑完留证据，不是自称）；
3. 既有回归底线不下降：`test-route-guard` ≥139/0、`test-project-scope-guard` 97/0、`test-codex-adapter` 23/0、`test-hooks` ALL PASSED；
4. 实现后开**独立 reviewer 冷启动深审**（不能 fork，会继承你的结论）。

---

## 权威读序（按此顺序，别跳）

1. `framework-audit/2026-08-20-routing-steering-handshake/EXECUTION-PLAN-CORE.md` —— **505 行，执行依据**
2. 同目录 `REDTEAM-C1-FINAL.md` —— 最近一轮终审，它的 3 BLOCKER 已修进计划，但**其 5 MAJOR / 5 MINOR 未全部处理**，动手前自己核一遍还剩什么
3. 同目录 `EXPERT-REVIEW-CORE-01.md` —— 架构可行性会审，§8 接线约束的由来
4. `FINAL-EXECUTION-PLAN.md`（5890 行）**只作背景**，不是执行依据。它被拆分正是因为 31 轮未收敛。

---

## 开工前必须先解决的四个阻碍（不解决就开工必踩空）

| # | 阻碍 | 现状 | 处置 |
|---|---|---|---|
| **A1** | 本检出落后 upstream **1 条** | 本地 `72bd1f2` / upstream `6aaa1c6` | 先 `git pull`。`6aaa1c6` 是 luca 的六项 engineering-delivery 集成（88 文件/+8027 行） |
| **A2** | `verify.sh` 的 **S44 FAIL** | `六项集成终态 receipt 与三路同 SHA 评审闭合` 未闭合 | **全仓 pre-commit 会失败，任何提交都过不去**。不是本计划引入的，不得用 `--no-verify` 绕过；需 luca 或另一 session 先闭合 |
| **A3** | 工作树有 **93 个文件**在途（28 改 + 65 未跟踪） | luca 的六项集成改造残留 | 其中 `route-guard.mjs`、`codex-hook-adapter.mjs` **正是本计划的目标文件** → 触发计划 `K3 BLOCKED_DIRTY_OVERLAP`。**不得 stash/reset/clean 绕过**，须等这批收口 |
| **A4** | 本 session 的 27 个 audit 产物**未提交** | 因 A2 被卡在工作树 | 含 `EXECUTION-PLAN-CORE.md` 本身。A2 解除后一并提交，别弄丢 |

**A2 + A3 是硬阻断。** 在它们解除前，只能读和规划，不能改 runtime。

---

## 三个故障与修法（一句话版，细节看计划）

- **E1** `进入 luca app 项目` 没解析成 canonical `muse` → hook 只做 `RESOLVE`：记录候选、**永不授权**，切换决策交 LLM 层。别名真值在下游 `.luca/project.json`，框架内零字面量。
- **E2** 界面结构请求 score=0 被当成"不需要 skill" → 三腿证据命中置 `semanticRouteAxis`；义务是**任务载体不是拦截器**，`PENDING` 时每轮注入一行提醒，**不拦 Stop、不拒 scope**。
- **E3** Codex 多消息共用 `turn_id` 被 anti-replay 拒 → `UserPromptSubmit` 降级为 revoke-and-queue，到第一个 PreToolUse/Stop 再用持久记录惰性认证。**`msg_*` 才是事件身份，`turn_id` 只是传输层 parent**。

---

## 执行顺序（每步先加断言、后改实现）

```
0. 解除 A1–A3，跑基线并记录（改 route-guard 前必须有 before 数）
1. .gitignore 条目（义务状态文件含完整 prompt 原文，先 ignore 再写落盘代码，顺序不可颠倒）
2. RESOLVE + 信号（必须按 §3.2 携带模式穿过 buildDecision 的三个早返）
3. projectGate 臂序：REQ-SCOPE-NULL-FIRST
4. 义务载体 + 每轮注入（注入落 hints 不落 decision）
5. Codex msg_* 身份 + K6 内容探测旁路
6. 跑 16 条变异体 + 开独立 reviewer 深审
```

---

## 四条必须守住的纪律（历轮血债）

1. **`git` 一律 `git -C /Users/luca/Desktop/项目/muse/lucagstack`** —— pathspec 相对 cwd 解析，`cd` 链会静默缩小量程给假阴性。本计划史上真实发生过。
2. **zsh 循环变量勿用 `path`/`status`/`argv`** —— 会冲掉 `$PATH`，循环内所有命令静默返空、吐出整齐的假失败。
3. **空结果正是你想要的答案时，跑阳性对照** —— 否则分不清"真的没有"和"检查坏了"。
4. **改完做语义消费者普查，且逐条判定每个命中** —— 别只 grep 被删符号名，要按语义和导入式措辞（`同 §`、`per §`、`见 §`）搜。本计划已 6 次栽在"改一处漏一处"，其中数次是搜索命中了但整体扫一眼放过去。

---

## Git 纪律

- 只改 §8 清单里的 5 个文件 + 新建测试。**禁止** push、reset、stash、clean、`--no-verify`。
- 不碰 luca 在途的 93 个文件，不替它做提交决策。
- 提交前 `verify.sh` 必须绿（S44 除外，那是 A2，不是你引入的）。

---

## BLOCKED —— 停下来问 luca，别自行决定

- 需要降级任何 KILL 条件（尤其 `K4` 惰性认证前置、`K6` 老 schema 旁路）；
- A2/A3 迟迟不解除而你想绕过；
- 实施中发现计划与 runtime 有新的语义冲突（本计划已因此被 luca 裁决过两次：作用域否定轴分、E2 不挡 Stop）；
- 独立 reviewer 深审出 BLOCKER 而修法需要改架构。

---

## 一句话背景

三个故障的共同根因是**判定被放在了拿不到证据的那一层**（E1 没有真值、E2 没有载体、E3 没有 ID）。整份计划的修复方向统一为：**在拿得到证据的那一层再判定，拿不到的那一层只记录、不裁决。** 任何让 hook 去"聪明地判断"的改法，都是在往回走。

<!-- FILE_END: HANDOFF-TO-EXECUTOR.md -->
