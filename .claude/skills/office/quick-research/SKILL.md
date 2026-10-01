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

# Quick Research

一个明确问题 → 一个真实 native 后台执行者 → 一份逐 claim 可追溯 Markdown。

## 升降级链（研究任务深度）

单点即时事实可直接查；广域交叉共识需求返回用户建议 deepresearch，不静默启动多路。
来源：source10 research，MIT，pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`。

## 1. 固定问题、证据与落点

压成一句可判定问题；目标含混才澄清。按 project-session 验证授权根，冻结绝对 output_path、
只读来源范围、网络许可及 caller/U-ID/resume_target。已存在研究约定优先；项目默认路径保留
`docs/research/quick-research-<slug>-<YYYY-MM-DD>.md`，同日重跑递增 -001，不覆盖。
NO_PIN 只写已批准 framework/audit 或 OS-temp 精确路径，不碰项目 docs/交接/共享 alias。
没有落盘权先准备报告或返回具体 NEEDS_CONTEXT，不靠目录存在推断权限。

## 2. 派一个后台 executor

先读 model-routing，按已登记 native 身份和角色派发一名事实执行者；Codex 使用真实
collaboration/native async primitive，Claude 仅在其实际工具支持时使用后台能力。
不把 Claude `run_in_background` 字段复制到 Codex，也不以内联研究假称后台。
传入问题、primary-source 纪律、有限范围、冻结 output_path 与权限交集；全程最多这一名。
记录真实 agent/invocation ID、启动和完成状态；主线可继续独立工作，但报告需真实返回后回收。
若当前 harness 无后台能力，诚实报告并取得替代执行选择，不宣称原方法已执行。

## 3. executor 的完整纪律

- 官方文档、源码、规范、第一方 API、论文等 owning primary source 才支持事实。
  二手博客/教程只用于定位一手材料，不能成为结论依据。
- 每条 claim 附实际读到的 URL 或绝对 repo path/行/版本。追到 owning source；无法查证写
  UNVERIFIED 并说明缺口，不从参数记忆补事实。来源过期或互相冲突须显式标注。
- 一份 Markdown：研究题、先行结论、逐条 findings/citations、未证实项、边界和实际来源。
  可给事实对方案的含义，但用户取舍仍回原 owner。
- 只用已有授权读取/网络；不安装依赖、开其他研究 agent、发消息、改变 Git 或写别处。

## 4. 回收与真实 handoff

等待同次 executor 真实完成，读取单文件全文核验 citations 和范围，向用户给结论与绝对路径。
可用的来源不足时报告 DONE_WITH_CONCERNS/NEEDS_CONTEXT，不伪造引文。
按 office/references/handoff-protocol 的实际 context-cost、模式和消费关系判断 handoff。
现有 runtime-estimate=8000 属重型，不能承诺“轻量免交接”；已绑定且获授权项目交接按共享
格式写验。NO_PIN 不执行项目 handoff，使用已批准审计/临时恢复材料。后续切项目不能改变后台落点。

完成门：唯一 native 后台执行者真实返回、每 claim owning source 可达、单文件实际读回、
未证实项诚实、实际 handoff 条件已处理。内容文本通过不等于后台行为已验证。

<!-- FILE_END: quick-research/SKILL.md -->
