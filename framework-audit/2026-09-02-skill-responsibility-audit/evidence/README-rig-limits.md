# 路由探针装置 —— 已知盲区（复用前必读）

`probe.mjs` 用 `ROUTE_GUARD_DRY_RUN=1` 喂 prompt 给 route-guard，采集决策 JSON。无副作用
（dry-run 分支在轮次计数、义务状态、项目事务等所有写入之前 `process.exit(0)`）。

## 盲区 1：看不到实际注入的 hint 文本 ⚠️ 最重要

`route-guard.mjs` 的 dry-run 在 `decisionToHints()` **之前**就 `process.exit(0)`
（exit 在 :1504，`hints.push(...decisionToHints(decision))` 在 :1576）。

后果：这套装置**只能测 `decision` 字段**，永远看不到 reviewAxisHint、STOP 分支的 candidateHint、
复杂度提醒等真正注入给 LLM 的文本。

**任何关于「有没有提示钉 / 提示说了什么」的结论都不能算实测**，必须单独读源码或另建装置验证。
2026-09-02 审计草案就栽在这里：断言「代码/冲突类 STOP 无提示钉」，实际 `softCandidates`
（**在 decision JSON 里，探针本来就采到了**）精确点名了正确 skill，STOP 分支会渲染它们。

## 盲区 2：fixture root 必须软链 `.claude/commands`

`visibleSlashlessAlias()` 用 `existsSync(projectRoot/.claude/commands/<首token>.md)` 判断裸首 token 直呼。
fixture 只拷 `.claude/skill-os/` 会让该通路静默失效 → 产生**假 NONE**。
实测栽过一次：变异后 `auto` 从 SINGLE 变 NONE，误以为是修法造成的召回损失，实为夹具缺件。

## 盲区 3：fixture root 没有项目状态 → Project Gate 行为不同

Project Gate 跑在 skillDecision **之前**。fixture 无激活项目时，带「项目工作意图」的 prompt
（做个原型 / 页面 / PRD…）会短路成 `PROJECT_STOP`，与活体结果不可比 → 产生**假「变坏」**。
实测栽过一次（4 条）。

**对策**：要么把量程限定到「YAML 差异实际触及的条目」（先 `diff` 证明改动面，
不涉及的条目出现差异即判为夹具伪影），要么让 fixture 携带等价项目状态
（注意：NO_PIN 的框架 session 会被 project-scope-guard 挡住对共享 docs/state 的操作，这是正确行为）。

## 用法

```bash
# 单条
echo '{"prompt":"写PRD"}' | ROUTE_GUARD_DRY_RUN=1 node .claude/hooks/route-guard.mjs --dry-run

# 批量（tsv 三列：id / expect / prompt，制表符分隔）
node probe.mjs corpus.tsv

# 换路由表做变异实验（fixture 需含 .claude/skill-os/ + 软链 .claude/commands）
node probe.mjs corpus.tsv --root /path/to/fixture

# 换被测 route-guard（必须整个 .claude/hooks 目录一起拷——单文件拷会让 ./lib/*.mjs 相对 import 失败）
PROBE_GUARD=/path/to/hooksfx/route-guard.mjs node probe.mjs corpus.tsv
```

## 变异纪律

活体 route-guard 是所有并发 session 的 PreToolUse/UserPromptSubmit 热路径，
**永远拷出去测，不在原地降级**。每次变异都要先自证生效（改完 assert 锚点确实不在了），
再看决策是否翻转——变异没生效而结果"没变化"会被误读成"修法无效"。
