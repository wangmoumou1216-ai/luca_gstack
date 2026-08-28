# Plan Addendum 1 — Claude 同名优先级

日期：2026-08-28
状态：FROZEN ADDENDUM（实现中发现的 kill-assumption，必须修复后才能满足“Claude 与 Codex 都能用”）

## 新证据

Claude Code 2.1.250 官方文档明确：

- personal skill 覆盖 project skill；
- 任一层级 skill 覆盖同名 command；
- project skill 可以覆盖 bundled skill，但 bundled alias 不受影响。

来源：<https://code.claude.com/docs/en/slash-commands#where-skills-live>、
<https://code.claude.com/docs/en/commands>。

本机存在旧 personal skill：`/Users/luca/.claude/skills/codebase-design`。若只提交
`.claude/commands/codebase-design.md`，Claude 的 `/codebase-design` 会继续执行旧 personal skill，原计划
的 Claude 可达性断言为假。Claude 2.1.250 还自带 bundled `/code-review`；仅有 legacy command 也不足以
机械证明 Luca facade 覆盖它。

## 必要修正

1. 增加项目原生 skill alias：
   - `.claude/skills/codebase-design -> office/codebase-design`
   - `.claude/skills/code-review -> office/code-review`
2. 保留 `.claude/commands/*` 薄包装，兼容 Luca 现有 checker/旧入口；Claude 实际同名解析以 native skill 为先。
3. 把旧 personal `codebase-design` 目录移动到可恢复备份：
   `/Users/luca/.luca/backups/skill-overrides/codebase-design-pre-luca-20260828.btSzZ3/codebase-design`
4. 在原 personal 路径建立绝对软链，指向本仓 `.claude/skills/office/codebase-design`。这样 personal 优先级仍然
   成立，但它解析到项目单一真值源；其它项目调用时也不会落回旧副本。
5. `code-review` 无 personal 同名副本；项目原生 alias 会覆盖 bundled `/code-review`。bundled `/review`
   alias 仍保留原生行为，符合官方规则，也给用户留出原生逃生口。

## 不变项

- Codex 仍通过 `.agents/skills/*` 软链读取同一真值源。
- 不新增 mandatory flow node，不修改当前其他 session 正在编辑的 `optional-workflow-graph.yaml`。
- 不删除旧 personal 内容；回滚时移除软链并把备份目录移回原位。

<!-- FILE_END: PLAN-ADDENDUM-1-CLAUDE-PRECEDENCE.md -->
