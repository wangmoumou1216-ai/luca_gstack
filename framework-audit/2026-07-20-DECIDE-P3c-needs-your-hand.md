# DECIDE P3c — 我已全权裁决 36 条，剩 14 条须你的手

> 2026-07-20 · luca「所有裁决交给你，认真裁决」→ 我逐条决断。**14 落地 + 8 判为不改(KNOWN-BOUNDARY) + 14 须你亲自动手**（安全分类器拦下，或本就该你点头的类别）。
> 已落地/已判不改的全部进 ledger(`decide_apply`/`held_reason`) + commit d324203。下面只列**须你动手的 14 条**。

---

## A. 删 6 个孤儿文件（我已逐个 grep 核实**零外部引用**；被安全分类器拦下删除）

全部 git-reversible。确认后你在本会话直接跑（`!` 前缀）：

```
git rm .claude/skills/office/references/workflow-state-writer.sh \
       .claude/skills/office/figma-demo/references/assembly-constitution.md \
       .claude/skills/office/tech-spec/SCHEMA.md \
       .claude/skills/office/task-plan/SCHEMA.md \
       .claude/skills/office/ux-research/SCHEMA.md \
       .claude/skills/office/evals/SCHEMA.md
```

| 文件 | 证据 |
|---|---|
| workflow-state-writer.sh | 全库零引用（唯一命中=自身注释）|
| figma-demo/references/assembly-constitution.md | 294 行死文件，零引用，与 assembly-agent.md 双权威 |
| tech-spec/SCHEMA.md · task-plan/SCHEMA.md | SKILL.md 从不读 SCHEMA（tech-spec 有 9 处内联结构、task-plan 37 处）|
| ux-research/SCHEMA.md | report-template.md 才是被加载的真值源；SCHEMA 是孤儿副本（我上一 commit 给它补的 FILE_END 随删作废）|
| evals/SCHEMA.md | evals/SKILL.md 有自己内联指标表(L53-130)，从不读 SCHEMA |

> retro/SCHEMA.md **不在**删除单——它被 retro/SKILL.md 读 2 次，是模版真值源（对照组，证明逐文件核实有效）。

## B. 3 处 allowed-tools 权限拓宽（安全分类器拦下；retro/taste-review/figma-layer+Skill/ux-research 已过）

| fid | 文件 | 改动 | 依据 |
|---|---|---|---|
| FW4-151 | compare/SKILL.md | `allowed-tools: Read, Bash` → `Read, Bash, Write` | Phase 4 要写 docs/decisions/ 报告(自己的 P2 契约)，当前白名单让契约不可达 |
| FW9-r9-47 | redteam/SKILL.md | 加 `- Bash` | 其 Preamble 有 bash 块，当前白名单缺 Bash 跑不了(retro/taste 已修) |
| FW4-091 | figma-layer/SKILL.md | 加捕获快路径工具 | 正文 L181 用 `generate_figma_design`；**加前先核实确切工具名**(bare vs `mcp__figma__` 前缀) |

## C. careful 安全 hook（软化安全网 → 须你显式点头，我不自改安全 hook）

**FW9-r1-05 + FW9-r4-18（合并解决）**：`check-careful.sh` 现对匹配命令一律 `exit 2` 硬拦、无覆盖通道，
但 SKILL.md 承诺「警告+等待确认+可覆盖」——**死锁**；且对命令里字符串字面量(`echo "rm -rf"`)**误杀**。
红队建议：把 `exit 2` 改为输出 PreToolUse JSON `permissionDecision:"ask"`（Claude Code 原生）→ 兑现「警告+确认+可覆盖」承诺，
误杀代价降为「多确认一次」。**这是改安全机制，要你拍。**

## D. 3 个产品/治理 fork（须你的产品判断）

| fid | 问题 | 我的建议 |
|---|---|---|
| FW4-111 | muse-x-digest 磁盘存在但 routing/office/slash 三面失联 | 注册为 on-demand 内部 skill（同 muse-proto-gen 模式）；改 CLAUDE.md=你的域 |
| FW9-r7-37 | html-prototype 场景B 硬要 prd-constraints.md，但全 skill 集无生产者→场景B 恒 BLOCK | 二选一：让 brainstorm 场景B 产出它(建生产者) / 把硬门降为软警告 |
| FW9-r4-23 | muse-loop 把 design.md(L2) 列必产但 AC 推导不产出 | 二选一：补落盘步骤 / 从必产清单删掉 design.md |
| FW6-sim-html-prototype-03 | P2-V(序号规则) 与目录型产出(有意覆盖)冲突 | 在 skill-invariants P2-V 加一条目录型产出豁免(改治理文档，要你点头) |

---

## 我判为「不改」的 8 条（KNOWN-BOUNDARY，理由已入 ledger，供你复核可翻案）

deepresearch 省略 allowed-tools(=继承全集，非错) · evals 的 docs/idea 回退(流程级评估者合理) ·
FW4-127 给 5 skill 加 preamble(未请求脚手架) · muse-req-triage EARS 补 Phase0(增强非修复) ·
质量判据 3-reviewer 冗余(可接受自包含) · design-brief 继承 interaction-arch(已经 Packet 消费) ·
office-wizard 自包含 skill 清单(有意) · open-design shared-refs brand-tokens(cosmetic 无 active bug)

**要我翻其中任何一条 → 说 fid 即可。**
