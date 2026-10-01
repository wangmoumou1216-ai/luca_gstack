---
name: code-review
preamble-tier: 1
version: 1.0.0
description: "固定代码改动范围和需求输入，委托 code-hygiene Mode D 唯一方法权威，只返回分轴 findings。"
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

# Code Review — 固定输入门面

本入口只负责固定审查范围与输入；完整方法的唯一执行权威是
`../code-hygiene/SKILL.md` 的 Mode D「代码审查环节」。进入执行前完整读取该文件和
`.claude/skill-os/routing-chain-check.md` 到 EOF，随后把下述固定输入交给 Mode D。
本文件不派另一组 reviewer，也不保存第二份 smell、两轴流程或报告模板。

## 1. 固定范围

先按 `.claude/skill-os/runtime/project-session.md` 验证项目身份，冻结规范化绝对
`REVIEW_ROOT`。框架审查使用明确的框架检出；preamble 的 cwd 输出不决定目标。
仅选择一个主输入，并保留用户给出的比较语义：

- `WORKTREE_DIFF`：当前未提交改动默认使用 `git -C '<REVIEW_ROOT_ABS>' diff HEAD`。
  同时读取 status；diff 不含 untracked，只把已确认属于任务的文件列为附加绝对 `FILE_SET`。
- `BASE_SHA + HEAD_SHA`：先把 commit/branch/tag 解析为 commit，固定解析后的 SHA、
  `git -C '<REVIEW_ROOT_ABS>' diff <BASE_SHA>...<HEAD_SHA>` 及对应 commit list。
  三点比较以 merge-base 为准。没有可唯一确定的比较点时请求真实用户选择。
- `FILE_SET`：把明确路径或目录展开为有限、存在、可读的规范化绝对文件清单。

命令中的绝对根和 SHA 必须在派发前替换为字面且正确引用的值；冷 reviewer 不依赖父 cwd、
共享 alias 或父 SID。坏 ref、空范围、空 diff 且无附加改动时停止，不派空审查。

## 2. 固定需求输入

把用户已给出的 spec/issue/plan、当前任务或 PR 说明作为来源指针；尚无来源时把明确的
commit 引用与已授权可读制品线索交给 Mode D 的来源查找步骤。
通常审查无 spec 可显式 `NOT RUN — no spec source found`；用户要求核对某份需求却缺正文时，
真实追问并等待，用户明确不存在 spec 后才允许跳过。不得用想象的需求补齐。

交给 Mode D 的输入为：绝对仓库根、固定 baseline/diff 命令与 commit list、精确文件集、
需求来源或无来源状态、当前有效标准的绝对路径线索、DESCRIPTION、父 scope/U-ID/resume_target
以及已有权限交集。来源读取、隔离审查、实际 native 票与分轴报告均由 Mode D 完成。

## 3. 委托与返回

调用 Mode D，原样保留其 Standards/Spec 结论、每轴 count/worst 与未运行/未知状态。
结果返回原调用者；本轮只读 findings，不编辑代码、不 stage/commit，也不推进 workflow。
修复需要已有精确实现授权，修后闭合仍按 Mode D/R4。
调用者把报告与闭合证据带入自己的验收或收尾 handoff，本 facade 不制造空节点。

Claude 的明确 `/review` 仍按其原生入口处理，不静默重定向到本 facade。
来源：mattpocock/skills source02，MIT，pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`。
本地消除重复方法；Mode D 的完整 source02 适配归其执行所有者。

完成条件：范围可读且固定、需求状态真实、Mode D 返回已取得、只读边界守住。执行权威不可读或
回执未完成时报告 BLOCKED/UNKNOWN，不以门面输入整理称完整审查通过。

<!-- FILE_END: code-review/SKILL.md -->
