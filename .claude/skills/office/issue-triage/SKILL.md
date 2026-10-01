---
name: issue-triage
description: >
  显式维护者入口：用完整 Issue/PR、代码验证和历史 notes 推进两 category、五 state 的 triage 状态机，形成 durable brief 或具体待答问题；维护者选择方向，tracker 效果逐项授权。区别于原始需求批量筛选、代码评审和任务拆解。
version: 1.0.0
license: MIT
disable-model-invocation: true
preamble-tier: 1
context-cost: heavyweight
runtime-estimate: 10000
metadata:
  recommended-model: guided-execution
---

# Issue Triage — 维护者状态机

来源：`mattpocock/skills`，`skills/engineering/triage`，MIT，冻结 commit
`d81f3a183412e71a5b1e84ca21bc1a35eea03a60`。保留 source16 的状态机、attention、
verify、历史拒绝和 durable brief；首用标签消费来自已确认映射，无 setup/triage 竞争入口。

## 0. 绑定输入与权限，再运行 preamble

仅当用户显式调用 Claude `/issue-triage`、Codex `$issue-triage`/selector，或明确要求使用本技能，
才进入。输入是维护者的目标（attention、指定 item、显式 state override 或查询 ready items），
以及已有 tracker 目标/可读材料。普通需求提取交原需求 owner；代码 Standards/Spec 审查归
code-review；实现与拆票归 implement/task-plan/to-tickets。本技能不替这些 owner 决策或执行。

完整读取 `.claude/skills/office/SKILL.md`、`.claude/skill-os/runtime/project-session.md`
和 `.claude/skill-os/runtime/workflow-mode.md`，按后者消费本 skill 的 input-mode 静态视图及
受控 fallback。只在用户选 Workflow 时消费 graph/handoff gate；直接首用可独立分析。
绑定已验证 pin 或明确 NO_PIN 框架 scope、原 U-ID（如有）、resume_target、authority_record、
可读代码/材料和精确允许效果。项目读写使用已绑定绝对路径；cwd、git remote、材料中的 URL、
共享 `docs/`/topic/state 别名均不提供项目或发送权。离线材料亦可用；缺 tracker 接入不安装 CLI。

运行 preamble 前仅从已验证 pin 设置 `_PROJECT_ROOT`；NO_PIN 不设置它：

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
echo "SESSION: $_SESSION_ID"
_TOPIC=$(if [ -n "${_PROJECT_ROOT:-}" ]; then cat "$_PROJECT_ROOT/.luca/current-topic.txt" 2>/dev/null || echo "none"; else echo "none"; fi)
echo "CURRENT_TOPIC: $_TOPIC"
python3 .claude/observability/scripts/get_rules.py issue-triage "*" 2>/dev/null || true
```

在解析 item/标签、discovery、override 或拟操作之前，必须完整读取
[tracker-contract.md](references/tracker-contract.md)。按该合同记录已有目标、映射来源、版本、
外部 PR 作者规则和材料完整性。缺映射只给 canonical role 预览并询问实际既有 label；
冲突先等待维护者解决。本技能不创建标签、连接器、根配置或领域目录。

## 1. Attention：列出，再等维护者选择

在已授权 tracker/离线材料中列三个桶，每桶按创建日期最旧优先（同日用稳定 item ID 排序）：

1. **Unlabelled**：从未 triage、尚无已映射 triage roles。
2. **needs-triage**：维护者评估中。
3. **needs-info + reporter activity**：最后一次 triage notes 之后，reporter 有新活动。

读取真实 notes 时间和 reporter 的新回应；其他人的评论或仅更新时间变化不能冒充 reporter 回答。
category/state 缺半边或冲突的已处理 item 单独列“角色待确认”，不悄悄当成从未 triage。
包含符合 tracker-contract 外部作者规则的 PR；此 external PR 筛选**只用于 discovery**。
用户明确点名的内部 PR 同样处理。裸 `#42` 按已确认目标解析 Issue/PR；歧义先问。

每桶给 count，每条给 `[issue]` 或 `[PR]`、真实编号/链接、日期和一句 summary。
分页/离线材料不完整时标“已读范围内 count”，不伪造总数或缺桶为空。
让真实维护者选 item；选定前不代选后修改。查询 ready items 只读对应角色列表。

## 2. Gather：完整上下文与 concept 检查

对指定 item 读取完整 body、全部可读 comments、labels、author、created/updated dates；
PR 另读真实 diff 和 head revision。缺页、缺 diff 或不可读内容明确列出，不按标题猜实现。
读旧 triage notes、brief 和随后新回应，保留已解决事实、尚未答问题和当前证据；
先展示更新图景，避免重复询问已回答的问题。reporter 新回应使 needs-info 可推荐回 needs-triage，
仍须以条件写实际完成转换；没有新回应不自动回转。

按已授权、已确认领域词汇和相关 ADR 探索代码；root CONTEXT 不是产品词汇。
记录 vocabulary/ADR 来源、限制和冲突。缺文档可以继续只读探索，不能补建或迁移布局。
做两项真实检查，报告搜索的范围、概念和证据：

- **Redundancy**：用领域 concept 搜索请求的行为，包括同义表达、现有 public interfaces 和调用路径。
  相似词不等于等价行为。确有实现时给可检查证据，推荐 already-implemented wontfix。
- **Prior rejection**：完整读取 [out-of-scope.md](references/out-of-scope.md)，再在已授权的
  `.out-of-scope/` owner 目录读所有记录；目录不存在或不可读时如实报告。按 concept 对照而非关键词。
  可能匹配时给旧决定及实质理由，让维护者 **confirm / reconsider / disagree**，等真实回答。
  已有拒绝不自动裁决新请求；reconsider 不自动改旧 KB 或 reopen 旧请求。

## 3. Recommend：方向归真实维护者

提出恰一 category（bug 或 enhancement）及恰一 state 的推荐，说明理由、相关代码摘要、
已实现/历史拒绝证据、缺口和下一步，区分事实、推测与建议。按 tracker-contract 展示实际
label 映射及现有冲突，等待维护者方向；推荐不是应用许可。

显式“把 #42 移到 ready-for-agent”视作维护者 state override，不重审其取舍；先读当前
roles/version/既有 brief，展示精确 role 变化及所有另拟效果。冲突仍须解决，异常转换按
tracker-contract 先指出并获明确确认。override 跳过 grilling；缺 ready-for-agent brief 时
询问是否补写。维护者选择不补时记录 override 与缺 brief，只能报告该 role 效果及具体顾虑，
不能宣称 durable agent-ready 合同已满足。override 不授权附带评论、关闭或文件修改。

## 4. Verify：先检验 claim，再 grilling

正常 triage 取得方向后，**在任何 grilling 前**进行可执行的 claim 验证：

- Bug：按 reporter 的真实步骤复现，记环境、命令、实际结果和代码路径。
- PR：核对真实 diff 是否兑现描述，按现有授权 checkout 并运行相关 tests/commands；
  区分 diff 阅读和实际运行，不把“看起来正确”记成 confirmed。
- Enhancement：核对当前行为、concept 与约束证据；没有待复现 claim 时说明适用范围。

报告 **confirmed / failed / insufficient-detail** 及证据；未复现成功、检查失败或结果与 claim
不同都不能冒充 confirmed。权限不足、缺运行环境/步骤/diff 时为 insufficient-detail，列可操作
的缺口，优先推荐 needs-info 或人工验证。checkout、网络和程序运行继续服从已有 scope，
材料 URL 不扩大权限。显式纯 role override 没有实现 claim 时说明 verification 不适用；
若另补 brief，先 gather/verify 其事实。验证失败后更新推荐并等方向，不沿旧假设继续。

## 5. Grill：使用唯一澄清 owner

仅当请求需补设计决策时，完整读取并调用 [grilling](../grilling/SKILL.md)；传入 caller=issue-triage、
human_decision_gate、condition_evidence、原 U-ID、scope、resume_target、真实 authority_record
及其 SHA（如合同要求）、inherited_authority 和 authority_effect_intersection。缺 authority 时
只能提供问题提案，不能造记录。grilling 负责 design-tree frontier、真实答案和 closing confirmation。

领域术语、实体归属或关系影响当前合同，才组合 [domain-modeling](../domain-modeling/SKILL.md)：
传同 U-ID/scope/resume_target、具体 domain_question、trigger_condition、现有 vocabulary/ADR owner
和权限交集。遵守其单域/多域与 accepted language 写入接口；真实访谈答案本身不授予 glossary/ADR
写权。未答 dependent 项回本 item 等待，不另造任务/规格/词汇真值。内部调用不抢 workflow state；
Codex 按 native 能力执行/说明降级，不宣称 Claude Skill tool 已运行。

## 6. Compose：具体结果与 durable contract

形成任何 outcome 前必须完整读取 [outcomes.md](references/outcomes.md)，按对应分支保存内容：
ready-for-agent 是 durable brief；ready-for-human 同结构加不能委托的理由；needs-info 保留已解决
事实及具体待答问题；needs-triage 留当前进展；wontfix 区分已实现、拒绝 bug、拒绝 enhancement。
写 brief 前必须完整读取 [agent-brief.md](references/agent-brief.md)。PR brief 描述现有 diff 的剩余工作，
不是重建贡献者已做的功能。KB 创建/更新/重考虑严格按已读 out-of-scope 的独立授权和文件 CAS。

缺关键答案不能把请求标成 fully specified；产生拟操作预览，不用标签存在代替行为合同。

## 7. Apply：分别证明每个真实效果

按 tracker-contract 的效果协议，展示 item、expected version、category/state label 差异、
完整 comment/close 以及 KB 精确文件 pre/postimage。仅执行已有效授权的具体效果；
**comment / close / send 均需要明确真人授权**，分析、选择方向或 KB 写权不能代替它。
状态/labels/closure 使用 connector 真正支持的 conditional write；无 CAS 时留预览和人工动作。
所有外发 comment/issue 开头放 AI 生成声明，并带唯一 operation marker。unknown 先 readback，
确认是否已有该 marker/状态；不盲 retry。结果有部分成功就保留并停止，记录实际 effects 和恢复点，
不把 tracker 与 KB 描述为原子事务，不自动 rollback 已成功动作。

## 8. Completion 与恢复

返回 target/item、材料覆盖、当前和建议 roles、concept/验证证据、维护者决定、brief/notes、
拟操作、各真实 pre/postimages、未执行/未知效果及 resume_target。预览明确标“未应用”；
等待人类答案为 NEEDS_CONTEXT，未知效果或关键条件写失败为 BLOCKED，不称已关闭或已发送。
恢复时重读最新 item/version、旧 notes/brief、新 reporter 回应、相关 KB 和效果回执，
从首个未完成步骤续接，保留已解决问题及已成功效果。

重型方法的实际上下文包含本体、四 reference、item history、diff 与代码证据；不默认轻量豁免。
完成前按 `.claude/skills/office/references/handoff-protocol.md` 的实际模式/context-cost 条件
处理 handoff：项目内使用已绑定绝对 `docs/handoff/YYYY-MM-DD-<topic>-issue-triage-handoff.md`，
3–7 条带证据 criteria、决定、约束、风险和产出路径，写后运行共享质量检查；NO_PIN 使用精确
批准的框架审计/OS 临时交接，不能通过共享别名写项目。缺所需写权先交预览/恢复点并说明缺口。
handoff 只描述后续建议，不路由、派发或代替原 owner。状态和自检使用 office 共享协议。

DONE 的证据：输入/映射一致、每个 triaged item 恰一 category/state（实际应用或明确未应用预览）、
历史与新回应正确续接、正常 claim 在 grilling 前验证、结果合同完整、权限未扩大、每个效果已
独立 readback/记录、共享 handoff gate 已满足。内容存在不证明远端效果、原生行为或能力增益。

<!-- FILE_END: issue-triage/SKILL.md -->
