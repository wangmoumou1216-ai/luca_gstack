---
name: code-review
preamble-tier: 1
version: 1.0.0
description: |
  代码改动双轴审查入口：先固定 WORKTREE_DIFF、commit/branch/tag 比较点或 FILE_SET，再把 Standards
  与 Spec 两轴隔离审查并分列报告。用于当前未提交改动、分支、PR 或“review since X”；不用于页面 UX、
  设计文档评审、代码清理或没有明确代码对象的泛 review。(luca_gstack)
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
context-cost:
  self: 3000
  runtime-estimate: 12000
  shared-refs: [code-hygiene-mode-d, routing-chain-check-r4]
  recommended-model: core-execution
---

## Preamble（先执行）

```bash
git branch --show-current 2>/dev/null || true
git status --short
python3 .claude/observability/scripts/get_rules.py code-review "*" 2>/dev/null || true
```

## 定位与权威边界

**Defining constraint：固定审查对象 × Standards/Spec 上下文隔离 × 只读 findings。**

本 skill 是用户可见入口，不建立第二套审查制度。执行前读取：

1. `../code-hygiene/SKILL.md` 中“代码审查环节”到“末尾核心约束”的完整内容——基线、Fowler smell、
   分级 findings 与不改代码纪律的唯一执行权威；
2. `.claude/skill-os/routing-chain-check.md` 的 R4——独立 reviewer、default-REFUTE、运行时分区、mutation
   抽查与终版闭合的唯一证据权威。

若两处规则与本文件的摘要冲突，以两处权威为准。本 facade 只负责：准确触发、固定范围、组织两轴、
给出一致输出。

来源：`mattpocock/skills` 的 `skills/engineering/code-review`（MIT），上游锚
`6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`。Luca 适配移除了上游专属 issue-tracker 前置，复用
现有 `code-hygiene` Mode D 与 R4，不形成规则副本。

Claude 的项目 native alias 会覆盖 bundled `/code-review`；bundled `/review` alias 不受覆盖。只有用户
明确点名 `/review` 时才走原生审查，不把它静默改道回本 facade。

## 1. 固定审查对象

只选一种基线，并把最终命令/文件集原样交给两个审查轴：

### WORKTREE_DIFF

用户说“当前改动/刚改完/未提交/WIP”且未给 ref 时默认使用：

```bash
git diff HEAD
git status --short
```

`git diff HEAD` 不包含 untracked 文件；从 `git status --short` 找到与本次任务相关的 untracked 文件，
把它们作为明确 `FILE_SET` 附加，禁止静默漏审或把所有陌生文件归入本次范围。

### BASE + HEAD

用户给 commit、branch、tag 或“since X”时：

```bash
git rev-parse --verify <fixed-point>^{commit}
git diff <fixed-point>...HEAD
git log <fixed-point>..HEAD --oneline
```

三点 diff 以 merge-base 为比较点。正式 PR/整分支若工具上下文已经提供 base，直接使用；没有 base 且
不能从明确 upstream/default branch 唯一确定时，只问一个阻塞问题，不猜。

### FILE_SET

用户明确给路径，或任务跨多次提交但能列出精确文件时使用。先确认每个路径存在；目录须展开成可审计
文件清单，不把整个仓库当隐式范围。

ref 无效、范围为空或没有任何可读改动时立即停止并报告；不要启动空审查。

## 2. 找到 Spec 与 Standards 来源

### Spec 来源顺序

1. 用户显式给出的 issue/spec/plan/requirements 路径或内容；
2. 当前 PR/任务上下文已提供的说明；
3. commit message 中明确引用的 issue，以及当前可用工具能只读取得的正文；
4. 与 branch/topic 匹配的 `docs/`、`specs/`、`framework-audit/` 制品。

一般代码审查找不到 spec 时不阻塞：Spec 轴写 `NOT RUN — no spec source found`。如果用户明确要求
“核对是否符合某份需求”却找不到该需求，只问一个阻塞问题。

### Standards 来源

读取当前 scope 生效的仓库规范，例如 `AGENTS.md`、`CLAUDE.md`、`CONTRIBUTING.md`、编码规范、邻近目录
规则和任务所指向的质量门。仓库规范覆盖 Fowler smell heuristic；自动工具已机械检查的格式问题不重复报。

## 3. 两轴隔离执行

优先在同一轮并行派发两个冷启动 reviewer，不给实现过程或本会话结论；只给相同的范围清单、diff 命令
和 commit list，再分别给各轴需要的资料。并行不可用时可串行，但第二轴不得读取第一轴报告，聚合前保持
上下文隔离。

### Standards 轴

只检查仓库文档标准、Luca 护栏和 `code-hygiene` Mode D 的 Fowler smell 基线。每条 finding 给出
`severity + file:line/hunk + rule/smell + evidence + impact`；明确区分硬违规与 judgement call。

### Spec 轴

只检查：遗漏/部分实现、未要求的扩量、表面实现但行为错误。每条 finding 引用 spec 条目与代码证据。
没有 spec 时不运行，不用 Standards 轴代替它。

## 4. 聚合，不重排

最终报告严格分列：

```markdown
## Standards
<findings or PASS>

## Spec
<findings, PASS, or NOT RUN — no spec source found>

## Axis summary
Standards: <count + worst within this axis>
Spec: <count/status + worst within this axis>
```

可以轻微清理重复措辞，但禁止 merge、跨轴 rerank 或挑一个“总冠军问题”。一轴 PASS 不能遮住另一轴失败。

## 5. 只读边界与闭合

- 本轮只报告 findings，不编辑代码、不暂存、不提交。
- 用户若同时授权“review 后修复”，先完成并展示两轴结果，再由工程执行阶段处理已接受 findings；修后必须
  交给独立 reviewer 做终版闭合。
- 没有当场 diff/read-back/test 证据，不宣称通过。能运行的行为变更按 R4 做运行时分区；声称测试覆盖时
  视风险做 mutation 抽查。
- 本 skill 是 standalone/optional quality gate，不新增或推进 workflow 节点。
- **Handoff 约定：** 本 skill 不拥有 workflow DONE 状态，不单独生成 handoff；调用方需要留痕时，把
  两轴报告及最终闭合 verdict 写入调用方自己的验收/收尾 handoff。

<!-- FILE_END: code-review/SKILL.md -->
