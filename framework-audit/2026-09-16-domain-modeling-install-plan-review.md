# domain-modeling 安装计划复核票据与发布 checkpoint

Status: DONE_WITH_CONCERNS

本报告归档完成的独立静态方案复核及真实执行限制。最终方案 readiness PASS，可向用户请求 exact payload 批准；它不授予安装 authority，不声称技能已安装或双 harness 行为已验证。Claude 认证前提仍未通过，文档发布不包含运行物。

## 冻结对象

- 计划：`framework-audit/2026-09-16-domain-modeling-install-plan.md`。
- 最终计划 SHA-256：`fce6beeebd271e91e1ab4b9e18341e36a6dc58710b1fc64e5bbbbd1e24a1ad6f`。
- 首次发布计划 SHA-256：`4763b00612c1307cf13bbdbf54b616e645f3ef24559817d39d8d74d93925bf30`；后续发现及修订单独记录，不用旧票覆盖新字节。
- 既有评审报告 SHA-256：`206726b0eeaadda71bfdcca52a40d62a75f3d1d0a3c2e13ef97debe79acfa4f6`，保留当前用户编辑。
- 源实现 HEAD：`0e07efd17e5740aa2a6ceef4a4423281ebc906b4`。
- 源候选：`mattpocock/skills/skills/engineering/domain-modeling`，固定 commit `321658273cb1d20b76026717d027d505790106d4`；安装阶段仍须核验固定源包。

## 独立复核实际结果

1. 冷启动 Codex `domain_modeling_install_plan_gate` 未提供评审结论，返回 `You've hit your usage limit`。其任务绑定此前版本 `969ce213367f8ae4b10119260275262ce77715e936de88b68f743dc817158247`，不能用于本次新增发布效果后的最终计划。
2. 对当前计划尝试独立 Claude CLI 只读复核：`--safe-mode`、无工具、无 MCP、不持久化 session；按 model-routing P1 使用 `fable`，声明 `opus` fallback。最初空 MCP 配置缺少 `mcpServers` 字段，在本地解析阶段失败；更正为合法空配置后才实际尝试认证，没有重复错误配置。
3. 更正后的调用退出码 1，`terminal_reason=api_error`，`duration_api_ms=0`、输入/输出 tokens 均为 0、`modelUsage={}`，实际错误：`Failed to authenticate: OAuth session expired and could not be refreshed`。未发生模型评审，不能声称运行于 fable 或 opus，更不能把缺票记 PASS。

以上是首轮基础设施缺票，不算完成评审轮。2026-09-17 环境日期越过此前 quota 错误给出的恢复时点后，仅对恢复通道重试一次，Codex reviewer 正常完成以下内容复核；没有用自审替代独立票据。审查输入是用户需求、框架约束与冻结计划，没有实施历史；本任务没有运行登录、改全局认证或配置，也没有启动安装 worker。

### 恢复后的两轮独立内容复核

- Reviewer：冷启动 `/root/domain_modeling_install_plan_gate`，default-REFUTE，按 model-routing P1 使用 inherited model / xhigh effort，独立于计划修订主线。
- 第 1 轮实际绑定 `4763b006…bf30`：BLOCKER 无，MAJOR 2，MINOR 无；方向 PASS、安装批准 readiness FAIL。MAJOR-1 为未来 A/B 仅 guided，未绑定被改 brainstorm/tech-spec core prose 的按档行为门；MAJOR-2 为新 `docs/domain/glossary.md` 未把 P2 owner 纳入精确 Files。两项均为计划合同缺口，不是当前运行行为失败。
- 修订只更新计划：四个 skill prose targets 的双端 tier/effort、positive/control、raw arms、no-op/回归/缺票/错档 guard 与必做命令；P2 additive 登记与 P2-V glossary 就地更新特例、旧保护合同、ADR 不引入默认新路径及 HIGH-INTEGRATION-RISK 审查。
- 第 2 轮终版实际绑定 `fce6beeebd271e91e1ab4b9e18341e36a6dc58710b1fc64e5bbbbd1e24a1ad6f`：**PASS；BLOCKER/MAJOR/MINOR 均无。** MAJOR-1 CLOSED，证据为最终计划第 153、215、220、252 行；MAJOR-2 CLOSED，证据为第 76、119、123、267 行。Reviewer 只读确认现有 `behavioral_ab.py` library 的 `TIER_MODELS` 与 `judge()` 支持 core，不假称其 CLI 接受 core。
- 最终独立结论：方向 PASS；可向用户展示并请求 exact 安装 payload 批准的就绪度 PASS。未来 live、mutation、A/B 与终版运行 review 全部 NOT_RUN；此票不授予安装权限。两轮内容复核至此闭合，不再追加无界循环。

### Claude 安装前提复查

2026-09-17 只做一次无工具/无 MCP/无 session persistence 的 `READY` 前提 probe，requested alias 为 opus（不是实际已执行模型声明）；退出码 1，`duration_api_ms=0`、input/output tokens 0、`modelUsage={}`，仍为 `OAuth session expired and could not be refreshed`。KILL-3 未通过；不能补造 Claude 行为票或改全局账号配置修复它。用户须先恢复 Claude 登录。

## 只读确定性核对（非独立语义评审）

- PASS：稳定 U-001–U-008 唯一且完整；Source、Dependencies、Files、Approach、Read List、Test scenarios、Verification、phase_type、model_tier、Status 字段存在；两份任务文档 FILE_END 完整。
- PASS：固定上游 SHA、exact checkout、NO_PIN、文档与安装的批准边界、普通推送 remote/ref 在计划中明确。
- PASS：`python3 scripts/build-agent-context.py check`：`generated agent context is current`。
- PASS：`node scripts/check-agent-context.mjs`：`phase=projected K=10 pointers=16 catalog=44 fallback=6`。
- PASS（仅 synthetic guard-only）：复用现有 library `judge()` 时 core + sonnet 为 BLOCK、core + opus 为 PASS，证明既有档位 guard 可调用；这不是 actual A/B 或领域结局证据。
- PASS（仅计划结构）：四 target 的双端 mandatory A/B 命令与 tier/effort 矩阵、P2 owner/例外进入精确 U-block；未来语义效果仍未测试。
- NOT_RUN：安装、技能创建/登记、Flow/宿主改动、双 harness 发现/调用行为、F01–F11、A/B、mutation、安装终版复审及运行物发布。
- PASS（独立静态 readiness）：本最终计划两项 MAJOR 已闭合，绑定最终 SHA；不得将它升级为运行验收 PASS。

## 文档提交/推送前 checkpoint

- 用户已明确要求本次任务所有执行成果提交和普通推送。第一次文档提交 `68dc9403f53c234274a17a84e0e3e4ff81112229` 已发布且只有三个任务文档，远端 main 经 `git ls-remote` 核对一致。随后复核恢复，本次 delta 仅修订安装计划和本报告，第二个聚焦文档提交/普通推送，不 amend 或重写已发布历史；既有 redteam 报告保持原字节，没有待发布的安装运行物。
- 仓库分支 `main`；第二次发布前重新检查 index 原为空。精确 fetch/push remote `upstream`：`https://github.com/wangmoumou1216-ai/luca_gstack.git`；目标 `refs/heads/main`。第二次 push 前远端 SHA 必须仍等于 `68dc9403f53c234274a17a84e0e3e4ff81112229`，前进或分叉时停止，不自动整合。
- 首次 push 是普通命令，无 force/bypass 参数；服务端提示 `Bypassed rule violations / Required status check "Required Checks" is expected`，当时不标 CI PASS。后续只读 GitHub commit check-runs 核对：Required Checks、Validate YAML Files、Validate HTML Prototypes、Validate Framework Logic、Validate Skill Definitions、Validate Markdown 六项均 completed/success。本次 delta 的 CI 收据须独立查最终提交，不借用首次提交的票。
- 保护 unrelated 用户 dirty，不 stage、不覆盖、不 stash：

| 文件 | 核对时 SHA-256 |
|---|---|
| `.claude/observability/observations.jsonl` | `290beadb4ef1f1e45bcfce0002be2963e10e797f6cf260b5f027406f2208150e` |
| `.claude/observability/rules.yaml` | `6633be1e135357e666b4cbbb3ea04d141e6af16fc8a06399f95f1ada0efceb15` |
| `memory/retrieval-log.jsonl` | `d9c74a8fc2ba2485dbfa3b4ab7c91d7a987d4c50cc87028d1deb52722e3f7fbc` |

- hook owner `.githooks/pre-commit` 明确允许仅 audit notes/docs、无框架运行逻辑变化时 `FAST_COMMIT=1`；本次仅三文档适用。仍执行密钥扫描与 commit-msg 完整 staged-index agent-context gate，不用 `--no-verify`；此豁免不能用于未来技能安装提交。
- 发布前后断言：首次 three-file tree、本次 exact two-file stage/tree；保护集未被本任务改写；最终计划 hash 不漂移；普通推送无 force；远端 main 最终精确等于最终文档提交 SHA。新提交/推送/CI 收据在实际命令结果与最终用户回复给出，不在本待提交文件中预填成功或循环引用自己的 commit SHA。

## 剩余工作与恢复

1. 展示最终 exact 安装计划、SHA、checkout、U-001–U-008 与普通发布效果，获得真实批准。用户另须恢复 Claude 登录通过 KILL-3；不扩大本任务为全局账号修复。
2. 重新读取 HEAD/status、本计划/本报告/既有评审与 project-session/framework-maintenance/long-session、routing-chain-check；确认源基线之后仅三个任务文档的预期 delta，最终计划 SHA 保持匹配。若发生内容/效果漂移，旧票失效，不自动继续。
3. 批准与前提 gate 均通过后按 U-001–U-008 顺序执行；运行物须全部关键验收及终版独立 review 闭合后聚焦提交并普通推送。

结论：**建议安装薄适配 skill，不增加必经 Flow 节点；最终 exact 计划静态复核 PASS。** 安装批准尚未取得，Claude 认证未恢复，安装/live gates 尚未执行；当前发布的是评审、计划与真实票据，不以文档提交冒充安装完成。

<!-- FILE_END: domain-modeling-install-plan-review -->
