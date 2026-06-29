# 2026-06-11 框架耗时与文件卫生审计 — 被测结论清单（红队输入）

> 本文档是 main agent 在 2026-06-11 session 中产出的审计结论，作为红队评估的唯一输入源。
> 仓库根：`/Users/luca/Desktop/luca_gstack`。所有证据命令均可在该目录重跑。
> 红队规则：verdict 必须有可复现证据（命令+输出）；无证据的怀疑标 SPECULATION，不计入 verdict。

---

## C1 — Hook 链路不影响回复时长

**结论原文：** route-guard（UserPromptSubmit，每条消息跑）实测 30ms；session-restore 内
`get_memory.py --summary` 实测 50ms（每 session 一次）；post-edit（PostToolUse）仅做计数器
自增。整条 hook 链路 < 0.1s，对回复时长无感。

**原始证据：**
```bash
echo '{"prompt":"帮我做一个商机管理的列表页设计"}' | /usr/bin/time -p node .claude/hooks/route-guard.mjs
# real 0.03 (×3 runs)
/usr/bin/time -p python3 memory/scripts/get_memory.py --summary
# real 0.05
```

**证伪标准：** 找到任一 hook 在真实路径下（非我测的快路径）耗时 > 500ms 的可复现场景；
或 session-restore 的同步部分（execSync get_memory + symlink 清理 + digest 展示）合计明显超时；
或 Stop hook（session-sync）有未测量的慢路径。

---

## C2 — 真耗时排序：额外轮次/强制产物 > 强制读完×巨型SKILL.md > CLAUDE.md 体积 > hooks

**结论原文：** 用户感知的"回复慢"主要来自：①每 session Project Gate 一来一回 + 启动协议
~5 个工具调用 + 每 skill 尾部强制产物链（handoff summary + §2c-obs 观察提取 + episodic write，
都是输出 token，生成最慢）；②强制读完规则 × 45KB 级 SKILL.md 的 prefill；③38KB CLAUDE.md
每 session 注入（有 prompt cache 缓解）；④hooks 无感。典型"Plan+两skill"任务吞 150-180KB 指令文本。

**弱点自报：** 排序本身是推理，未实测各环节的真实 token/时间占比。

**证伪标准：** 给出量化证据证明排序错误（如：实测 CLAUDE.md 注入对每条回复的边际影响
大于强制产物链的输出 token 成本；或 150-180KB 估算严重失真）。

---

## C3 — CLAUDE.md 路由触发词大表是纯冗余，可砍约 25%，零功能损失

**结论原文：** 路由语义存了 4-5 份：①Routing Contract TL;DR ②路由层级表 ③「Skill 调用规则」
触发词大表（~80 行）④skill-routing-map.yaml（真值源，route-guard 每条消息读取并注入路由判定）
⑤AGENTS.md（24KB，双运行时适配）。route-guard 运行时已注入判定，CLAUDE.md 里的词表只在
hook 失效时有兜底价值，平时纯重复，约占 38KB 的 1/4。建议收缩成「语义规则+指向 yaml」，
词表匹配完全交给 route-guard，"零功能损失（STOP 兜底逻辑仍在）"。

**弱点自报：** "25%"和"零功能损失"均为估算；未验证 route-guard 失效场景下 Claude 是否
依赖 CLAUDE.md 词表完成路由；未验证 STOP 兜底 hint 的软匹配是否引用 CLAUDE.md 词表。

**证伪标准：** ①实测词表占比远低于 25%；②route-guard.mjs 代码证明 STOP/软匹配依赖
CLAUDE.md 内词表（删了会断）；③存在 route-guard 不触发但 CLAUDE.md 词表承担路由的真实路径
（如 hook 超时/异常时的 fail-open 行为）；④CLAUDE.md 词表中存在 yaml 没有的语义性规则混杂，
无法"干净切分"。

---

## C4 — 巨型 SKILL.md 应拆「主流程（必读）+ references（按需）」，强制读完只约束主文件

**结论原文：** 强制读完规则（CLAUDE.md L268：被指定文件必须读到最后一行）与懒加载原则
（>200 行先读 50 行）直接冲突，且 skill 文件总是赢在前者。brainstorm 45KB、ux-brainstorm 45KB、
design-brief 39KB、office/SKILL.md 28KB（任何 skill 操作前必读）、plan-agent.md 26KB。
建议拆分，主文件控制在 ~15KB；office/SKILL.md 的 /office 向导段（L328 起）只在敲 /office 时
才需要，可拆出。

**弱点自报：** 未评估拆分风险；未查强制读完规则的起源（可能为修复真实事故而生）。

**证伪标准：** ①git log / memory/episodic 证明强制读完规则源于某次"跳读漏掉质量 gate"的
真实事故，且拆分会重新打开该伤口；②证明 SKILL.md 内部结构高度耦合（前后交叉引用密集），
拆 references 会导致执行时漏读关键约束；③已有 references/ 机制实测形同虚设（agent 不会主动读）。

---

## C5 — 垃圾文件 = 5 个过期 .digest-shown + 6 个 .DS_Store；session-restore 缺 digest-shown 清理

**结论原文：** `.claude/.digest-shown-2026-06-{05,07,08,09,10}` 已死（代码只查最新 digest 的
marker），`.digest-shown-2026-06-11` 仍在用。6 个 .DS_Store（根、memory/、.agents/、.claude/、
.github/、.git/）纯垃圾。`session-restore.mjs:33-34` 启动时清理 `.episode-written-*`，
但 `.digest-shown-*`（:131-135 写入）漏了对等清理逻辑。其余未跟踪文件（episodic sessions、
digests、run-log.jsonl、worktrees 空目录）均判定"不是垃圾"。

**原始证据：**
```bash
ls .claude/.digest-shown-* ; # 6 files, 0 bytes each
grep -n 'episode-written' .claude/hooks/session-restore.mjs  # :33-34 unlinkSync 清理
grep -n 'digest-shown' .claude/hooks/session-restore.mjs     # :131 只写不清
```
建议清理命令：
```bash
rm .claude/.digest-shown-2026-06-0{5,7,8,9} .claude/.digest-shown-2026-06-10 && \
find . -name '.DS_Store' -not -path './.git/*' -delete
```

**证伪标准：** ①修复必要性不成立（积累速率 ~365 个 0 字节文件/年，时机错）；②清理命令有边界
错误；③漏报：存在我未识别的真垃圾/无界增长文件（run-log.jsonl、pending-extraction.md、
/tmp/luca-gstack-hooks.log、memory/ 孤儿文件等）；④"不是垃圾"清单中有误判。

---

## C6 — lark-* 等全局 skill 描述是更大的系统提示负担，禁用不常用 skill 收益可能大于改框架

**结论原文：** 每 session 注入的可用 skill 列表里，lark-* 全家桶约 30 个 skill 的长中文描述
占系统提示相当大体积，不归 luca_gstack 管；用户若觉得"每次回复都慢"，禁用全局 skill 收益
可能大于改框架。

**弱点自报：** 仅目测，未量化字节数，也未与 luca_gstack 自身注入量对比。

**证伪标准：** 量化后 lark-*/全局 skill 描述总量明显小于 luca_gstack 自身注入
（CLAUDE.md 38KB + MEMORY.md 5KB），则"收益更大"不成立。
（注：skill 描述源文件位置需自行定位，如 ~/.claude/skills/ 或 plugin 目录；若无法定位
源文件，可用本 session 系统提示中的描述文本长度为下界估算。）

---

## C7 — 不动项：Project Gate、Stop hook 记忆裁决、全部 hooks 保持现状

**结论原文：** Project Gate 防跨 session 污染收益大于每 session 一轮成本，且已有 Meta/审计
例外分支；Stop hook 已有四信号速记 + ≤900 字符锁定 + fail-open，算优化过；hooks 实测无感。

**弱点自报：** 纯设计意图推断，未量化 Project Gate 例外分支的实际命中率、Stop hook 拦截
在长 session 的真实 token 成本。

**证伪标准：** ①Project Gate 例外分支实际很少命中、大量纯咨询 session 仍被迫走门禁
（route-guard.mjs 代码 + 使用数据）；②Stop hook 拦截产生的额外轮次成本显著且可廉价削减；
③hooks 存在慢路径（同 C1）。

---

## 红队输出 schema

每条结论输出：
```
{claim: C#, verdict: REFUTED | WEAKENED | UPHELD, evidence: [命令+关键输出], new_findings: [...]}
```
WEAKENED = 结论方向对但量级/表述/建议有实质错误。new_findings = 攻击过程中发现的、
claims 未覆盖的新问题（须同样带证据）。
