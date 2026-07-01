# muse-loop · 隔离架构与加法纪律（决策文档）

> 本目录 `muse-loop/` 及下述脚手架是 **muse fork 专属新增**，只落 fork、绝不回污母版 luca_gstack。
> 母版 = `/Users/luca/Desktop/luca_gstack`（只读升级源）；本 fork = `~/Desktop/项目/muse/gstack`（muse 分支）。

## 隔离 + 继承机制（已落地）
- **隔离**：本 fork 是母版的独立 git 克隆。muse app 内嵌 claude 的 cwd = 本 fork，所有改动物理上到不了母版。
- **继承**：`upstream` 远程指母版；`./sync-upstream.sh [母版分支]` 把母版升级 merge 进来（未改文件干净合入 = 直接引用，仅 muse 改过的文件才冲突，在 fork 内解决）。
- **经验层共享**：muse app 给 pty 注入 `MEMORY_ROOT` + `GLOBAL_MEMORY_DIR` 指母版 → memory/semantic/全局个人记忆与母版一套，不分叉。
- **验证**：改 fork 任意文件 → `cd ~/Desktop/luca_gstack && git status` 母版零变化。

## 加法纪律（最小化 merge 冲突——关键约定）
母版升级最常改 3 个集中真值源：`skill-routing-map.yaml`、`CLAUDE.md`(+`AGENTS.md`)、`scripts/check-routing-map.mjs`。
muse 的"需求→原型 Loop"新增应**尽量少碰**它们，以让每次 `sync-upstream` 近乎零冲突：
1. **muse 命名空间**：新增 skill 目录用 `muse-*` 前缀（如 `.claude/skills/office/muse-req-extract/`），与母版 skill 隔开、便于识别与后续可能的独立注册。
2. **Loop 脚手架放 fork 根/本目录**：`constitution.md`、`specs/`、`corpus/`、`traceability.md` 全在 fork（不放母版），见下。
3. **驱动方式（待实现时定，倾向 A）**：
   - **A｜独立 orchestrator（加法，推荐）**：Loop 由 `muse-loop-orchestrate` skill 显式驱动状态机（draft→triaged→designed→built→verified），**不改母版 route-guard.mjs** → 零 SSOT 冲突。
   - B｜route-guard 当状态机（方案原设计）：改 **fork 的** route-guard.mjs 按 spec status 路由 → 母版该文件升级时 merge 冲突，但在 fork 内解决、不回污母版。
   - 结论：优先 A；仅当 A 表达力不足再退 B。

## 脚手架（本 Phase 只立目录与骨架，不实现 Loop 逻辑）
- `constitution.md`（fork 根）— 设计哲学 + FxUI token 规则 + AX 原则 + 真伪判据 + RICE/Kano 打分定义（骨架，待实现填充）
- `specs/REQ-*/`（fork 根）— 每需求 4 文件：requirement.md / design.md / prototype.html / scorecard.md（模板待建）
- `corpus/`（fork 根）— L0 语料（或软链 Obsidian vault）
- `traceability.md`（fork 根）— 全局可追溯矩阵（骨架）

## 落地顺序（后续独立大任务，非本次）
方案主张"先建判官(proto-judge)再向输入端倒着建"，Phase 0-4，判官校准一致率 <75% 则 Loop 不成立。
详见母版旁的 `~/Desktop/luca_gstack_需求到原型Loop_深度解决方案.md`。
