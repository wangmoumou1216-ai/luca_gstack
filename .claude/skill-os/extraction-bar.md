# Extraction Bar — 经验提取门槛（唯一真值源）

> 本文件是「要不要提取经验」门槛的**唯一全文真值源**。
> CLAUDE.md / orchestrator.md / pending-extraction 模板只放指针，不复制全文。
> `.claude/hooks/session-sync.mjs` 在 Stop 拦截时只注入「四信号速记 + 本文件路径」短指针
> （HOOK-007 锁定 reason ≤900 字符，不复制全文）；裁决细则以本文件为准，被拦截的 Agent 按需 Read。
> 改信号名必须同步 session-sync.mjs 的速记行并跑 `npm run check:hooks`。
> 背景：2026-06-10 luca 纠正「不是每个问答+解决方案都值得提取，只提取重大经验」。

【提取门槛 · 默认不存】先过门槛再谈归属——四强信号全不中 → 什么都不写，直接落 marker 结束：
①用户明确纠正我的行为，或对未来行为给出明确指示（最强信号）
②同类问题复发：写前用 2-3 组不同措辞 search_memory 查 episodic+全局前科（best-effort 非硬门）；查到→升级写入；查不到→按首次只记 episodic，topic 必须带规范关键词（skill 名/错误类别）留检索钩子
③造成真实返工的坑，或触及不可逆操作红线的险情（near-miss 也算）
④重新获得成本高（深调研/多轮试错才得到）且确定复用的事实
【按层分级】越贵的层门槛越高，拿不准就降级写更便宜的层：
- 全局个人记忆（每 session 全量注入，最贵）：仅信号①当场直写 feedback_<slug>.md + MEMORY.md 索引行；信号②③④只写 candidate_feedback_<slug>.md（同目录、带 frontmatter、不进 MEMORY.md 索引、零 context 成本），由每日治理列入 digest 待 luca 裁决，点头后才改名入册
- 项目本地 MEMORY.md：同四信号门槛；Stop 裁决时若 episodic `--decision` 非空且项目归属明确 →
  同一来源同步一行到该项目 `.luca/memory/decisions.md`（`[D-YYYYMMDD-N] 决策 — why`，一源两视图，不另行裁决）
- 框架 semantic 候选（propose_semantic.py）：维持宽进严出（orchestrator §2c-obs 照旧），晋升另有 promotion_ready 门禁
- episodic：低门槛日志层，session 流水照常
【时机】person/项目层只在 Stop 拦截时统一裁决一次；对话中途仅信号①允许即写；semantic 候选提议不受此限

## Cooling-off 协议（person 层候选）

- 命名：`candidate_feedback_<slug>.md`，与正式 feedback 同目录
  （`~/.claude/projects/-Users-luca-Desktop-luca-gstack/memory/`），frontmatter 格式相同。
- 不进 MEMORY.md 索引 → 零 context 成本；漏掉的真重大经验会复发，复发即信号②重新浮上来（系统对漏存自愈）。
- `daily_governance.py` 只读扫描该目录，把候选（含 ≥14 天超期标记）和现成采纳命令列入 digest「待你裁决」；
  `session-restore.mjs` 启动时独立提示候选数量。治理绝不自动写/改名/归档全局目录任何文件
  （红线：feedback_no-auto-edit-global-claude-config）。
- 采纳 = `mv candidate_feedback_<slug>.md feedback_<slug>.md` + MEMORY.md 追加索引行；丢弃 = 直接删除。

## 维护规则

- session-sync 拦截 reason 只放四信号速记与本文件指针（≤900 字符，HOOK-007 锁定），不得回归整段复制。
- 改动四信号定义后同步 `session-sync.mjs` 的速记行，并运行 `npm run check:hooks` 确认 HOOK-007 通过。
