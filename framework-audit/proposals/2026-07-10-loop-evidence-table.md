# Loop-Architecture Evidence Table (CUT gate)

Read-only measurement, 2026-07-10. Gates CUT decisions in the loop-architecture plan.
Corpus mined: `memory/episodic/index.jsonl` (50 records), `.claude/observability/observations.jsonl`
(3 records), `memory/digests/` (0 `*.md` — only `.checked-*` markers, by design). No per-gate
telemetry exists; §1 is qualitative text-mining, not counts.

---

## §1 — Gate-friction qualitative mining (CUT candidates)

| Item | Measurement | Verdict | Evidence (line/byte) |
|------|-------------|---------|----------------------|
| **C1** — plan-agent "≥3 files ⇒ forced plan" too eager (fires on trivial multi-file edits) | No episodic/observation line reports the ≥3-file trigger firing on a trivial task and causing a detour. Multi-file sessions ran **without** any plan-agent friction; the one time plan-agent overhead was formally studied, the proposed change was rejected on other grounds. | **NO-DATA** | `EP-20260628-049` touched ≥3 files (`index.html`,`app.js`,`sources.mjs`,`main.js`,`preload.cjs`,`CHECKPOINT.md`) with `skills_used:[]` and no plan-agent, zero reported friction — gate either not enforced or silently fine, not measurable as "too eager". `EP-20260612-029`: latency red-team looked at plan-agent, candidate② "plan-agent 拆分被否…拆分零收益" — studied plan overhead, found no win to changing it; does **not** touch the ≥3-file trigger. No line = the pain C1 asserts. |
| **C2** — "强制读完整个文件" over-broad (hurts trivial tasks) | No line names the mandatory-full-read rule (scoped to *designated skill/context files*) as friction. Agents already skeleton-read large **source** files by choice, but that is outside the rule's scope, so it does not speak to C2. | **NO-DATA** | `EP-20260611-028` "框架验证用骨架提取+跨文件 diff 而非通读 18 万行" — chose skeleton extraction over full read, but of **source** (shareclawdemo), which 强制读完 does not govern. Same pattern `EP-20260709-059` / `EP-20260628-050` (audit skeleton reads). No record of a skill/context-file full-read hurting a trivial task. |
| **C3** — "不得绕过 skill 直接回答" over-broad | One explicit, reasoned case where bypassing the design-skill pipeline was the correct call; corroborated by multiple substantive coding sessions run with `skills_used:[]` and no harm. A blanket "never bypass" rule would have been wrong in each. No counter-evidence (no session where skill-bypass caused a problem). | **SUPPORTED** | `EP-20260703-056` decision: "改动范围判定为单文件 5 处渲染点、无阶段依赖、非新交互范式→直接实现不走 brainstorm/design-brief 管线", `skills_used:["none(direct-coding, no-skill-routing)"]` — direct bypass reasoned and correct. Corroboration: `EP-20260626-048`,`EP-20260628-049`,`EP-20260629-051`,`EP-20260701-053` all substantive edits, `skills_used:[]`, no friction. No NOT-SUPPORTED line (observations O-2026052x are project-gate / list-sync corrections, not skill-bypass failures). |

---

## §2 — Loop health audit (7 loops)

| Item | Measurement | Verdict | Evidence (mechanism / backlog) |
|------|-------------|---------|-------------------------------|
| **1. auto-grow capture** (session-sync Stop hook) | `.claude/hooks/session-sync.mjs` exists (11907 B). `decision:'block'` at line 114; `SESSION_SYNC_BLOCK==='0'` kill-switch at line 90 + visible warning line 122; fail-open line 184; triple anti-loop (`stop_hook_active` / per-session marker / env kill-switch) line 9. **17** `pending-extraction-*.md` files present (soft-fallback backlog). | **ALIVE** (backlog) | session-sync.mjs:90/114/122/184; `ls pending-extraction-*.md` = 17 files, Jul 6 → Jul 10 accumulation = un-promoted soft-fallback extractions. |
| **2. daily governance** | `memory/scripts/daily_governance.py` exists (17154 B). No `memory/digests/*.md` (by design — writes only on real change; else `.checked-` marker). Latest marker `.checked-2026-07-08`. Staleness = 2026-07-10 − 2026-07-08 = **2 days** (< 7-day heartbeat). | **ALIVE** (caveat) | Caveat: no `.checked-2026-07-09`/`-07-10` despite 07-09 sessions (`EP-…-058`,`-059`), which ran with `MEMORY_ROOT=母版` / `SESSION_SYNC_BLOCK=0` residual (stated in both records) — governance likely wrote to master root, not fork, on 07-09. |
| **3. monthly evolution scout** | Latest `.claude/skill-os/evolution/digests/2026-07-evolution.md` (mtime Jul 6, 5852 B). Current month present. | **ALIVE** | evolution/digests: `2026-06-evolution.md`, `2026-07-evolution.md`. |
| **4. gen↔judge inner loop** | `.claude/agents/muse-proto-judge.md` exists (6948 B); round-cap present: line 70 "轮数上限 3 轮；同一发现连续两轮不变→强制退出" (plateau detection). `muse-loop-orchestrate/SKILL.md` has bounded loop (line 46/57 "只有 gen↔judge 是循环") + GATE-1/GATE-2. **But zero real executions.** | **DORMANT** | Fully built + round-capped, never run: `EP-20260709-059` next_risk "muse-loop 仍零真实运行——下一步应是真跑而非再建设"; `EP-20260701-054` still validation-phase. Mechanism healthy; no live invocation. |
| **5. handoff-review auto-revise-once** | `.claude/skills/office/handoff-review/SKILL.md` Phase 2.5 "auto-revise-once, oracle-gated" (line 193); gated to fire only when all failures are oracle-type (line 206), taste-type → escalate to human (line 211 table). | **ALIVE** | SKILL.md:9-10,188,193,206,211-217. |
| **6. task-plan Phase 7 self-correction** | `.claude/skills/office/task-plan/SKILL.md` Phase 7 coverage gate (line 240); FAIL → "返回 Phase 4/5/6 修正，然后重新执行 Phase 7" (line 292) = correction loop; "Phase 7 门禁未通过不允许进入 Phase 8" (line 66). | **ALIVE** | SKILL.md:66,240,292,356. |
| **7. orchestrator phase loop** | `.claude/agents/orchestrator.md` "Phase 执行循环（WHILE 有 PENDING Phase）" line 67; "WHILE 有 PENDING 节点" line 292 (skill loop). | **ALIVE** | orchestrator.md:67,292. |

---

## §3 — Context-tax breakdown (CLAUDE.md = 45067 B, injected every session)

Split on `^## `. Tag ESSENTIAL (routing contract / red-lines / project-gate / session-start protocol)
vs LAZY (detailed script usage, budget rationale, historical revision notes movable to referenced files).

| Item (## section) | Measurement (bytes) | Verdict | Evidence / note |
|-------------------|--------------------|---------|-----------------|
| (preamble) | 112 | ESSENTIAL | — |
| Routing Contract TL;DR | 754 | ESSENTIAL | routing contract |
| 核心行为原则 | 2945 | ESSENTIAL (trim rationale) | principles + Plan-Agent 5 conditions essential; Karpathy Coding-Discipline prose partly reference |
| **Context 工程协议** | 3920 | **LAZY** | checkpoint format / PROGRESS template / agent-budget table / compact rules / 框架建设预算 rationale → movable to ops doc |
| **三层记忆系统** | 8628 | **LAZY** (keep SF subset) | 读取/写入协议 + auto-grow mechanics duplicate `memory/README.md` (already referenced); only 关键约束速查 (Static Fallback, ~2000 B) is every-session-essential |
| 强制读完规则 | 324 | ESSENTIAL | short behavioral rule |
| luca_gstack | 7689 | LAZY (keep skill table) | skill routing table used, but muse-fork descriptions / 语义兜底 / 输入面收窄 rationale duplicate `skill-routing-map.yaml` |
| 路由层级 | 1974 | ESSENTIAL | routing hierarchy table |
| Skill 调用规则 | 3592 | LAZY (keep semantic rules) | verbose; core semantic routing rules stay, examples/rationale movable |
| **Session 启动协议** | 9475 | **LAZY** (keep Project-Gate tree) | Project-Gate ①-⑤ decision tree ESSENTIAL (~2500 B); 2026-07-04 会话粘性 + 2026-07-08 方案A 真隔离 revision-rationale prose (~6000 B) → movable to referenced doc |
| Orchestrator 模式 | 872 | ESSENTIAL | short, points to orchestrator.md |
| Standalone/Workflow 执行模式 | 2316 | LAZY | execution-mode detail + handoff grading |
| 产出目录结构 | 673 | LAZY | self-declares "现查不必记" |
| 规则优先级体系 | 613 | ESSENTIAL | conflict resolution |
| 模型路由 | 1181 | LAZY | snapshot of `model-routing.yaml` truth source |

### Top-3 slimming candidates (by clean byte savings)

| Rank | Section | Current | Keep (essential) | Est. savings | What moves |
|------|---------|---------|------------------|-------------|-----------|
| 1 | 三层记忆系统 | 8628 | Static Fallback 速查 (~2000) | **~6000 B** | 读取/写入协议 + auto-grow 三环节 → `memory/README.md` (already referenced) |
| 2 | Session 启动协议 | 9475 | Project-Gate ①-⑤ tree (~2500) | **~6000 B** | 2026-07-04/07-08/07-09 revision-rationale (会话粘性 / 方案A 真隔离 prose) → `docs/handoff/` or a referenced protocol doc |
| 3 | Context 工程协议 | 3920 | short trigger list (~800) | **~3000 B** | checkpoint format / PROGRESS template / budget table / compact rules → ops-reference doc |

Combined top-3 ≈ **15 KB** of 45 KB injected every session recoverable without touching red-lines,
routing contract, Project-Gate, or session-start protocol. (Honorable mention: `luca_gstack` 7689 B —
skill descriptions largely duplicate `skill-routing-map.yaml`; another ~4 KB if that table is thinned.)
Measurement only — **CLAUDE.md not edited.**
```

<!-- FILE_END: 2026-07-10-loop-evidence-table -->
```
