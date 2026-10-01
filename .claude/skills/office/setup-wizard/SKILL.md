---
name: setup-wizard
description: 为只能由人完成的服务配置、凭据获取或迁移步骤生成分阶段 Bash 向导；先确认完整人工合同，再交付脚本供人运行。
version: 1.0.0
license: MIT
disable-model-invocation: true
preamble-tier: 1
context-cost: heavyweight
runtime-estimate: 10000
metadata:
  recommended-model: guided-execution
---

# Setup Wizard — 人工步骤向导

来源：`mattpocock/skills`，`skills/engineering/wizard`，MIT，冻结 commit
`d81f3a183412e71a5b1e84ca21bc1a35eea03a60`。向导把已确认的人工流程变成有阶段进度、
隐藏输入、确认门与完成摘要的 Bash 脚本。Agent 的工作是厘清流程和写 STAGES；人掌握浏览器、
凭据和运行时选择。完整 helper 库的唯一所有者为 [template.sh](template.sh)。

## 0. 显式选择、绑定权限，再运行 preamble

仅当用户显式调用 Claude `/setup-wizard`、Codex `$setup-wizard`/skill selector，或明确要求
使用本技能时进入。普通“配置服务”、CLI 自动化、环境排错、写代码不自动启用本技能；
Agent 可直接完成的步骤归实际实现 owner，跨阶段工程任务归 Plan/implement。`office` 可介绍
此入口，不能代替用户选择。只有服务目标而没有人工步骤时先厘清，不能套默认服务样例。

完整读取 `.claude/skills/office/SKILL.md`、`.claude/skill-os/runtime/project-session.md`
和 `.claude/skill-os/runtime/workflow-mode.md`，按后者消费 `setup-wizard` 的完整静态 input-mode
投影；缺失、不可读或已证实过期时完整读取源表作受控 fallback。源表没有该 key 时沿本正文
与共享合同，明确“无专用 input-mode override”，不能伪造空投影。只有用户选择 Workflow 时
读取 graph 与真实上游 handoff；standalone 不要求虚构上游节点。

绑定已验证项目 pin 或明确的 NO_PIN 框架 scope、原 U-ID（如有）、可读材料、精确
`output_path`、当前 preimage 与批准效果。cwd、git remote、来源 URL、共享 `docs/`/topic/state
别名都不是权限。项目内绝对路径来自已验证 binding；框架维护保持 NO_PIN。生成合同确认
授权该路径内的脚本制作，不授予浏览器、服务写入、凭据读取、安装、Git 或执行脚本的权限。

运行 preamble 前仅从已验证 pin 设置 `_PROJECT_ROOT`；NO_PIN 不设置它：

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
echo "SESSION: $_SESSION_ID"
_TOPIC=$(if [ -n "${_PROJECT_ROOT:-}" ]; then cat "$_PROJECT_ROOT/.luca/current-topic.txt" 2>/dev/null || echo "none"; else echo "none"; fi)
echo "CURRENT_TOPIC: $_TOPIC"
python3 .claude/observability/scripts/get_rules.py setup-wizard "*" 2>/dev/null || true
```

开始收集或生成前，完整读取
[manual-step-contract.md](references/manual-step-contract.md) 到 FILE_END。它定义阶段字段、
实际目标、secret 与 helper 用法、模板边界和静态验收。流程长或跨 session 时按
`.claude/skill-os/runtime/long-session.md` 保存已授权、脱敏的恢复信息。

## 1. Scope：先查材料，再确认完整人工合同

输入必须说明服务目标、当前/目标状态、只能由人完成的阶段和精确脚本 `output_path`。
先查看已授权 README、服务说明、迁移约束、配置 schema、脱敏键名清单，以及 CI 中的
`secrets.*`/`vars.*` 名称和引用位置。`.env.example` 仅在来源确认是无真实 secret 的 schema 时
可读。生成时不读真实 `.env`/`.env.*`、凭据存储、secret 值、token 或环境 dump；请用户给
键名/类型/来源说明而非实际 secret。确认 repo/host/environment 等公开目标，不能从 remote
或当前 gh 默认仓库推导服务写入目标。

列出所有阶段，按依赖排序，为每个 captured value 填来源、名称、public/secret 分类、
精确落点、CI 是否需要、动作、验证与失败恢复；纯动作阶段显式写“无值”。列出所有服务端、
本地持久化及不可逆动作，标明哪项只能由人操作、哪里有运行时 `confirm`。遗漏的 CI 引用
必须补齐或由用户明确确认不在本流程内，不能把空缺当完成。

向真实用户展示整份阶段合同及脚本路径，等待其确认添加、删除、顺序和效果范围。缺阶段、
值分类、来源、目标或路径时，一次问一个阻塞问题并等回答；记录已回答事实，不重复问，
没有回应不默认选服务/路径/secret 分类。新决定推翻已确认合同则回此步确认受影响部分。

**Done when：** 全部阶段及值都有 manual-step-contract 的必填字段，服务目标、精确输出
路径、写入效果和顺序由用户真实确认，无会改变生成结果的未决问题。

## 2. Journey：每一步有真实来源、验证和恢复

逐阶段写清打开的具体 URL、所在账号/项目/环境、点击路径或准确命令、复制位置及填入的
变量名。URL 和 UI 路径来自用户材料、实际已授权资料或获准核查的官方文档；不确定当前 UI
或命令时指出缺口，问用户或在已有权限内核查，核实前等待。不能编造 dashboard 页面、按钮
或默认 Stripe 流程；URL 不能含 secret 或 token。

每个阶段只承担一个聚焦任务，确保 `stage` 清屏后所需说明都在本阶段内。配置获取阶段
先 `open_url`、给具体 `step`，再 `ask`/`ask_secret`；纯动作阶段给指令与人工确认，不凭空
要求凭据。定义成功的可观察状态和检查步骤；输出名称/是否设置/脱敏状态，不显示 secret。
定义失败后保留什么、重试哪些阶段、恢复是否另需授权；不可逆动作不能许诺自动回滚。

**Done when：** 每个阶段有可跟随的真实 journey、准确变量映射、运行时确认、可观察验证
和明确恢复；未知 UI、来源和写入目标都已由真实材料或用户解答。

## 3. Author：复制模板，只写确认后的 STAGES

把本地 [template.sh](template.sh) 完整复制到用户批准的精确 `output_path`，写前重读现存
文件并核对 preimage，保留用户编辑。默认临时/scratch 或用户指定 `scripts/` 路径；重复
使用、README 接线、Git 提交及删除脚本是另行明确的效果，不随生成自动执行。

保持 STAGES marker 前的库区逐字节一致，包含 `TOTAL_STAGES=0` 的库区默认值；仅在
STAGES 区设置实际 `TOTAL_STAGES`，替换整个空壳及其 `exit 2`，按确认依赖写恰一 `stage`
对应一人工阶段，最后调用 `finish`。使用全部所需 helper：`banner`、`stage`、`say`/`step`、
`open_url`、`ask`/`ask_secret`、`write_env`、`set_secret`/`set_var`、`pause`/`confirm`。
不得重写库函数、把库修复塞进生成脚本或留下默认示例。唯一库适配已在本地模板的 `finish`
中固定；详见 reference 的来源与 diff，不在单次向导再改。

在 STAGES 中绑定已批准的绝对 `ENV_FILE`（有 .env 落点时）；有 GitHub 写入时绑定已确认的
`GH_HOST` 和 `GH_REPO`，不依赖 cwd 或默认账号目标。变量键名合法性、CI exact name、环境与
每次写入目标都对照已确认合同。secret 用 `ask_secret` 隐藏输入并以 stdin 交 `set_secret`；
公开值用 `ask`，确属 CI public variable 才用 `set_var`。值不进脚本文本、命令日志、提示语、
交接、URL 或 argv；`set_var --body` 只接已分类为 public 的值。禁止 `set -x`/echo secret。

每次持久化/服务写入都置于已批准阶段，先展示键名、公开目标和动作，再 `confirm`；拒绝
立即停止该效果且返回非零，不调用写 helper。浏览器内不可逆动作也先确认再让人点击。
值按合同检查非空/格式及目标文件兼容性，不把 secret 打印出来。只有已确认本地 env 落点
的值才在确认后调用 `write_env`；仅 CI 落点只调用对应 `set_secret`/`set_var`，`both` 则分别
确认本地与 CI 效果并执行，`nowhere` 不持久化。`set_secret` 仅写 CI 实际需要的 exact name。
生成时不调用这些 helper。
库不支持的编码/目标需求先澄清或交真实实现 owner，不能借此扩大库区改动。

**Done when：** 已确认合同的全部阶段和值都有脚本落点与确认门，TOTAL 等于实际 stage 数，
库区与本地模板逐字节一致，脚本仅写入批准路径；尚未运行。

## 4. Verify and hand off：静态追踪，交给人运行

对生成脚本执行 `bash -n <精确 output_path>`；已安装 `shellcheck` 时运行并处理相关问题，
不可用如实记未运行，不为此自动安装。静态核对全部阶段、TOTAL、来源→变量→目的地、
secret 分类、CI exact name、confirm 拒绝路径、失败恢复及库区 hash。对批准的生成脚本
执行 `chmod +x <精确 output_path>`，不改变源模板的 100644；元数据效果需在该路径授权内。
检查失败先修 STAGES 或补齐合同，不能通过第二项库改动“修绿”。

Agent 不端到端运行向导、不 source 脚本测试 helper、不自动打开浏览器、不读取真实 secret、
不改环境或写 CI secret；人获得脚本和精确运行命令后自行运行。报告人工尚需完成的阶段，
已有静态检查与未执行的服务验证。执行过程中任何 skipped、拒绝、失败或未验证动作都不能
称配置完成；`finish` 的 skipped 非空会提示人工核对/完成并返回非零。

完成制作前按共享 Completion Status Protocol 做自反思；学习/记忆动作仍需其授权，不自动
落长期规则。本 skill 为 heavyweight：standalone 及 Workflow 的共享交接要求按实际合同
执行，不能借“只生成脚本”默认免交接。有已验证项目时，完整读取
`.claude/skills/office/references/handoff-protocol.md`，在批准路径
`<_PROJECT_ROOT>/docs/handoff/YYYY-MM-DD-<topic>-setup-wizard-handoff.md` 写 ≤2000 tokens
脱敏摘要；同日多次按 P2-V 序号，`mkdir -p "$_PROJECT_ROOT/docs/handoff"` 只在绑定/授权
项目内执行。包含 `gate_result`、3–7 条有证据的 `criteria`、决策≤8、下游约束≤5、风险≤3、
主产物及恢复信息。写完运行 `node scripts/check-quality-gates.mjs --handoff
"<已验证项目内 handoff 的绝对路径>"`，失败先修，不更新 state 或报 DONE。

NO_PIN 框架制作不写项目 handoff 或共享 aliases；按 long-session 合同只用已批准的外部
审计/临时 checkpoint 落点，缺必要落点先取得精确范围。交接保存服务/目标、阶段合同、
路径/pre/postimage/SHA、已确认/待答决定、静态命令结果、NOT_RUN 的执行/服务验证与人如何
续接；不保存凭据值，不重建第二份环境真值。Workflow state 仅由已有 owner 在真实 gate
通过后处理，本技能不建立节点或调度器。

**Done when：** 精确脚本已落盘、批准的 executable mode 与静态检查通过、全部值/阶段静态
追踪完整、所需共享交接已验，并已告知路径和人工运行方式。报告 `DONE` 指脚本制作完成，
服务配置/原生行为仍 `NOT_RUN`/待人工验证；有真实非阻塞顾虑用 `DONE_WITH_CONCERNS`，
缺信息 `NEEDS_CONTEXT`，权限或关键检查失败 `BLOCKED`。内容 DONE 不等于 capability PASS。

<!-- FILE_END: setup-wizard/SKILL.md -->
