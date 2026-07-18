---
name: quick-research
preamble-tier: 1
version: 1.0.0
description: |
  轻量研究：把一个待查问题委托给**一个后台 agent**去读 **primary source**（官方文档/源码/
  规范/一手 API），主线不阻塞；产出单个带逐条溯源的 markdown。
  **Defining constraint：primary 纯度 + 单 agent 后台 + 单文件落盘**——它不是 deepresearch
  （多源共识、5-8 agent、重型），也不是裸 web spike（内联、无纪律、无落盘）。
  源：mattpocock/skills research（MIT，pin 391a2701，2026-07 对标反向红队复活采纳）。
allowed-tools:
  - Read
  - Write
  - Bash
  - Agent
  - WebFetch
  - WebSearch
context-cost:
  self: 1400
  runtime-estimate: 8000
  shared-refs: [none]
  recommended-model: guided-execution  # 三问：token 中低 × 判断杠杆低（检索纪律非裁决）× 错判代价低（产出可查证）
---

## Preamble (run first)

```bash
python3 .claude/observability/scripts/get_rules.py quick-research "*" 2>/dev/null || true
cat .claude/current-topic.txt 2>/dev/null || true
```

## 定位（研究三档的中档）

| 档 | 用它当 | 不用它当 |
|---|---|---|
| web spike（就地一查） | 单点事实，一条来源即答（"X 的默认端口是几"） | 答案要落盘复用 |
| **quick-research（本 skill）** | 一个明确问题，需要读文档/源码才能答实，答案值得落盘 | 题目发散、需多源交叉验证 |
| deepresearch | 广域多源/学术/可行性，需共识矩阵 | 单点问题（杀鸡用牛刀） |

**升降级链**：题目在研究中发散/需交叉验证 → 停下，建议升 `/deepresearch`；
反向：题目过窄（单点事实、一源即答）→ 用本 skill 而非 deepresearch（deepresearch 无内建降级出口，窄题应在入口/路由处直接选本 skill）。

## 流程

1. **收题**：把问题压成一句可判定的研究题（答完能回答"是/否/怎么做"）。模糊 → 先问一句澄清。
2. **派后台 agent（一个，不 fan-out）**：`Agent` tool、`run_in_background=true`，prompt 只含
   研究题 + 下方纪律 + 落盘路径。主线（你/用户）继续手头工作，完成通知后回收。
3. **后台 agent 纪律（写进其 prompt，逐条）**：
   - **只查 primary source**：官方文档、源码、规范、一手 API——**拒绝二手转述**（博客/教程只可
     作为找到一手源的线索，不得作为断言依据）；
   - **每条断言追回 owning source**：断言后随行标 `[源: <URL 或 repo 路径#行>]`，查不到源的
     写"未证实"，不得凭参数记忆断言；
   - 产出**单个 markdown**：题目 → 结论（先行）→ 逐条发现（各带源）→ 未证实/边界。
4. **落盘**：`docs/research/quick-research-<slug>-<YYYY-MM-DD>.md`（与 deepresearch 同目录，
   前缀区分；同日重跑加 -001 序号不覆盖）。
5. **回收**：主线读产出 → 一句话把结论回给用户（附文件路径）。**不写 handoff**（轻量 skill +
   终端交付，按 handoff 分级免写）。

## 末尾约束

1. 一个后台 agent，不并发多路——要多路就升 deepresearch。
2. primary 纯度不妥协：二手源只当路标。断言无源 = 撒谎（Iron Law 同宗）。
3. 本 skill 不做决策建议——它交付"查证的事实"，决策归用户/上游 skill。

<!-- FILE_END: quick-research/SKILL.md -->
