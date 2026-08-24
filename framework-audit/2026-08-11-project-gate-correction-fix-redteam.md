# Project Gate 与纠错闭环修复终审 — 2026-08-11

## 评审对象

- `.claude/hooks/route-guard.mjs`：session 项目决策真值与用户纠错识别。
- `.claude/hooks/session-sync.mjs`：Stop 阶段项目归因、checkpoint 与纠错票据状态机。
- Claude 直调测试、Codex adapter 测试及项目身份/能力锚点守卫。

## 修复后的不变量

1. 有真实 `session_id` 时，路由、Stop 归因和 checkpoint 只认 `.session-project-<sid>`；无/失效 pin 就是无项目。
2. 共享 `docs` symlink 只用于展示、显式绑定提示及无 sid legacy 兼容，不得冒充真实 session 项目。
3. `ROUTE_GUARD_CURRENT_PROJECT` 只在 dry-run 生效，生产态不能覆盖 pin。
4. 明确用户纠错会写 per-sid 类型票据并注入 `CORRECTION GATE`；Stop 不依赖 edit/tool 工作量即可阻塞未闭环纠错。
5. marker 必须晚于票据记录的基线才解锁；同 session 新纠错会重入。损坏/明显未来基线 fail-open。
6. 普通术语和产品问句不触发纠错门；票据不保存原始用户 prompt。
7. Claude 与 Codex 使用同一份业务 hook；Codex adapter 只做 `additionalContext` 包装与控制动词原样透传。

## 独立审查闭环

第一轮 cold-context quality gate 为 **FAIL**，发现：

- Critical：真实 sid 无有效 pin 时 session-sync 仍会向 shared 项目写 checkpoint。
- Important：生产环境变量可覆盖 pin；普通问句误触纠错；未来时间戳票据会永久阻塞。
- Minor：Codex 测试标题仍描述已废弃的 `continue:false` 翻译。

上述发现全部修复并增加反担保。第二轮同一独立审查者终版复审为 **PASS**，4/4 findings closed；另一名快速 reviewer 独立命中 sole-truth 两处漏洞，结论与第一轮一致。

## 运行时与变异证据

- `node scripts/test-hooks.mjs`：通过；覆盖 no-pin/shared split-brain、pin/shared 交叉、env 覆盖、纠错 block/解锁/重入、误触发、损坏票据、Stop 跨项目零写入。
- `node scripts/test-codex-adapter.mjs`：30/30 通过；覆盖 Codex `additionalContext`、纯对话纠错 `decision:block`、无 pin Project Gate、Stop 不归因到 shared 项目。
- `node scripts/test-route-guard.mjs`：69/69 通过。
- `npm run test:project-scope --silent`：40/40 通过。
- `npm run check:substrate --silent`：项目身份 JS/Python parity 与四站 canonical 探针通过；真实 sid sole-truth 由 SYNC-PIN-002/003 独立守护。
- `bash scripts/verify.sh`：PASS=73 / FAIL=0 / WARN=1（WARN 为非阻塞 ADR 目录提示）。
- `git diff --check`：通过。
- mutation 1：把 route 决策改回 shared symlink，`STICKY-008d` 立即失败。
- mutation 2：关闭 `correctionOpen`，纯对话纠错测试立即失败。

## 残余验证说明

`verify-codex-wiring.mjs` 静态 19 项与离线真实 adapter 测试均通过；另起嵌套 `codex exec` 的 L1–L3 活体探针在当前执行环境停在启动阶段，未形成通过或失败结论，因此未把它计入端到端通过证据。当前修复不修改 `.codex/hooks.json` 或 adapter 注册面。

## 终审结论

**PASS**。原始两个问题已从“文档要求 + 模型自觉”收口为可执行状态机，并由 Claude/Codex 两条入口共同守护；未发现存活 Critical/Important finding。

<!-- FILE_END: framework-audit/2026-08-11-project-gate-correction-fix-redteam.md -->
