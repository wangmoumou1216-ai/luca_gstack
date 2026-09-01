## 追加发现（静态交叉表 + 实测，草案后补）

### F10 长触发词属低权条目时被泛词吃掉（可达性｜中）
shadow 规则只保护「短词属低权」方向；反方向无保护：某 skill 自己的**长而具体**的触发词，
若其条目权重低于持有短泛词的条目，则该长词永远无法让自己胜出。
实测：`agent_browser`(w7) 的 `访问网页`/`打开网页` 内含 `网页`(web_access w9)
→ "帮我打开网页看看这个竞品" = SINGLE `web-access`（agent_browser 被丢弃，7 < 9-1）。
即 agent_browser 7 个触发词里有 2 个是死信。CLAUDE.md:352 明写「看看竞品/截图 → agent-browser」，
且 appendix「侧栏交付面」以 `agent_browser SINGLE 命中`为前提做语义分流——前提在这两条词上不成立。
候选修法实测：agent_browser w7→9 ⇒ 转 `MULTI web-access|agent-browser`（安全歧义），
且 web_access 自身词（搜索一下/上网查资料）与 agent_browser 其他词（截图）零影响。
这与 route-guard 源码自述的设计意图一致：「never silently drop an equal/higher-weight candidate,
else a safe ambiguity (tie → MULTI/STOP) collapses into a confident WRONG route」。

### F11 superpowers-brainstorming 永远无法单独胜出（可达性｜低-中）
`轻量prd` ⊃ `prd`(brainstorm w6)、`简单需求梳理` ⊃ `需求梳理`(brainstorm w6)，等权 ⇒ 恒 MULTI。
实测："轻量PRD就行" / "简单需求梳理一下" → `MULTI /brainstorm|superpowers:brainstorming`。
CLAUDE.md 明写「快速梳理/轻量PRD」→ superpowers:brainstorming，该映射在路由层从未解析成功。
候选修法实测：superpowers-brainstorming w6→7 ⇒ 两句均转 SINGLE `superpowers:brainstorming`，
brainstorm 自身（写PRD/帮我梳理需求）零影响。

### 自我证伪记录（防 over-claim）
静态交叉表提示 `自进化`(framework_evolution w10) ⊂ `muse自进化循环`(muse_loop_orchestrate w7)，
我据此推断 muse-loop 的自有触发词会被 framework-evolution 劫持 —— **实测证伪**：
framework_evolution 带 `scope: framework_meta`，非 pure_framework_meta 语境下被前置 filter 剔除，
"跑一下 muse自进化循环" 正确落 `PLAN_CHECK /muse-loop-orchestrate`。静态包含关系 ≠ 实际劫持。

### D5 门禁层级交互（查过且健康）
10 条门禁语料全部符合 CLAUDE.md 优先级表：复杂需求→PLAN_MODE(6/8 分)；`/brainstorm` 直呼→归还 SINGLE
（不被复杂度吞）；「继续上次那个项目」→PROJECT_STOP+select_existing_project；「新项目」→confirm_new_project_name；
框架 meta 问题（route-guard 路由规则）→NONE，不触发 Project Gate（meta session 不切项目，符合红线）；
「不要启用engineering-delivery preset」→ 否定语境未被字面选中；研究钉/评审钉分别在 score=2/评审词命中时挂出。

### careful 的可达性（陈账，非新发现）
`careful` 声明 `hooks.PreToolUse` 执行 `bin/check-careful.sh`（脚本存在且可执行），但该 hook
**未接进** `.claude/settings.json` 或 `.codex/hooks.json`（两文件 grep careful 零命中）；同时它无斜杠命令、
无路由触发词、CLAUDE.md 隐藏名单里也没给它任何场景/提示钉 ⇒ 无已验证的 opt-in 路径。
**注意这是陈账不是新账**：`framework-audit/2026-07-20-DECIDE-36-post-redteam-for-luca.md:92-98`
已记录其 hook 的死锁(exit 2 无覆盖旁路)与假阳性，红队当时的处置建议是改 `permissionDecision:"ask"`
或「按 opt-in 显式模式接受现状」，列在**须 luca 手动**那堆里，至今未见裁决落地。
本次不重开设计，只把「它现在没有可达的 opt-in 入口」这一事实补进台账。
