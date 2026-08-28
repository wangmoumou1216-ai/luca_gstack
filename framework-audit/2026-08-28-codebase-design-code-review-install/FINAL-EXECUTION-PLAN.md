# codebase-design + code-review 安装与 Luca 适配执行计划

日期：2026-08-28
状态：FROZEN — 用户已授权“从第一性原理判断；应加则安装；Claude 与 Codex 都能用；完成后 commit + push”

## 1. 第一性裁决

### codebase-design：安装

它提供的是跨任务稳定的工程词汇与判断原语：Module / Interface / Depth / Seam / Adapter，解决“模块是否足够深、复杂度藏在哪里、测试面放在哪里”的问题。当前路由表已经会推荐它，但 Codex 的项目 skill 面没有对应入口，因此存在“能路由、不能执行”的真实断链。

落地形态：保留上游核心方法与两个参考文件，增加 Luca 的触发边界、并行降级、来源与许可证说明；项目内单一真值源同时供 Claude 与 Codex 使用。

### code-review：安装为 Luca 入口，不复制第二套审查制度

用户需要一个明确、可触发的 `code-review` 入口；上游最有价值的能力是“固定比较点 + Standards/Spec 两轴隔离”。但 Luca 已在 `code-hygiene` Mode D 中拥有固定范围、Fowler smell、证据与验证纪律。完整复制会形成两套会漂移的规范。

落地形态：新建轻量 facade，保留两轴与固定点合同；底层权威明确指向 `code-hygiene` Mode D 和 routing-chain-check R4；只读报告，不自动修复、不跨轴重排。支持并行 agent；无并行能力时串行执行但保持上下文与报告分离。

### Flow：不新增主链节点

- `codebase-design` 是工程设计原语，不是有独立状态、产物和人类门的 workflow 阶段。
- `code-review` 是按需质量门，适合 standalone，或在“执行 → 验收”之间被推荐；不应阻塞所有工作流。
- 因此不改场景主路径、不新增 mandatory node。当前 `optional-workflow-graph.yaml` 的并发脏改也不纳入本次提交；审查入口通过 routing-chain-check、技能注册和路由表达。

## 2. 唯一实现方案

### 共享 skill 真值源

- `.claude/skills/office/codebase-design/`
- `.claude/skills/office/code-review/`
- `.agents/skills/codebase-design -> ../../.claude/skills/office/codebase-design`
- `.agents/skills/code-review -> ../../.claude/skills/office/code-review`
- Claude 命令薄包装：`.claude/commands/codebase-design.md`、`.claude/commands/code-review.md`

Claude 读取 `.claude/skills/office/*`；Codex 通过 `.agents/skills/*` 软链读取同一份 `SKILL.md`，不复制正文。

### 注册与路由

- 把 `codebase-design` 从 external/builtin 路由迁入 project skill。
- 新增对象绑定的 `code-review` 路由；从 `code-hygiene` 移出 review 触发词，避免等权冲突。
- 补齐 input modes、model routing、Codex viability、installed pins、adoption log、自模型、Claude/Codex 入口文档与 office wizard。
- 更新 routing-chain-check R4：代码/改动批/正式 PR 统一从 `code-review` 进入；`code-hygiene` Mode D 保持底层权威。
- 更新 `tech-spec`、`code-recon` 的旧“全局 codebase-design”措辞为项目共享入口。

## 3. 来源冻结

- 上游：`mattpocock/skills`
- 上游 main：`6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`
- `codebase-design` 路径最后变更：`321658273cb1d20b76026717d027d505790106d4`
- `code-review` 路径最后变更：`5c89081d4bbeb3d039a42093653f90bb698d780e`
- 许可证：MIT，Copyright (c) 2026 Matt Pocock
- 原始 `SKILL.md` SHA-256：
  - codebase-design：`2c20617f87ec8af6a434859f381b2f061a69b530444e74eb39e78bb016a6d1e2`
  - code-review：`47f4e52c21694def9c7c11cbfbf891ca35eac7a93e395797515be3c8a409ae50`

## 4. 文件边界

允许新增/修改：两项 skill 本体及 references、两条 command、两条 `.agents` 软链，以及本计划直接列出的注册/路由/测试/来源记录文件。

明确排除：当前工作树中其他 session 的 hook、agent、CI、observability、benchmark、package、framework HTML 等改动；不使用 `git add -A`，不 stash/reset/清理。

`optional-workflow-graph.yaml` 当前已有其他 session 修改，本次不编辑、不暂存。

## 5. 验收断言

1. Claude：两条 command 存在且指向项目内 skill；一级注册面能发现。
2. Codex：两条 `.agents/skills` 软链存在、目标正确，skill catalog 静态门通过。
3. 路由：明确 codebase-design/code-review 意图单命中；`preview`、页面评审、泛“接口设计”等负例不误触。
4. 双轴合同：固定范围可解析、非空 diff；Standards/Spec 分离；缺 spec 明示降级；不自动修改代码。
5. 无强制 Flow 节点：不改变 scene path 与 mandatory gate。
6. 运行 registration sync、routing map、capability parity、Codex viability、route-guard、skill validation 与仓库 pre-commit；若并发脏改导致全量门失败，必须区分本次失败与外部 WIP。
7. 独立质量复审覆盖：单一真值源、路由冲突、Claude/Codex 对称性、无 workflow 过度建模。

## 6. 回滚

整批变更以一个独立 commit 提交；回滚方式为 `git revert <commit>`。不删除或覆盖用户全局 `~/.claude/skills/codebase-design` 的旧副本；项目级入口是本仓真值源。

<!-- FILE_END: FINAL-EXECUTION-PLAN.md -->
