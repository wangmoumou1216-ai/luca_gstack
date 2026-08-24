# luca_gstack 规则执行系统审计

日期：2026-08-11  
状态：**BLOCKING**  
范围：Claude Code 与 Codex 共用的路由、规则加载、执行门禁、校验、纠错闭环与 Git 收口

## 1. 结论

当前不能声称“规则已被可靠执行”。仓库已经有大量规则、hook 和 checker，但尚未形成统一的
“规则声明 → 运行时加载 → 行为执行 → 结果验证 → 完成回执”闭环。部分规则只停留在提示词或文档层，
部分 checker 只验证文件或字符串存在，另有几处规则互相冲突。因此，绿灯目前不能等价为行为正确。

这次遗漏不是单点失误：主 agent 没有先完成项目识别、复杂度路由与纠错闭环；框架又没有机械地阻止
这条错误路径，并且若干校验产生了假绿。

## 2. 主 agent 本次违反的规则

1. 在接到 CRM Agent UX 研究需求后，没有先执行项目路由与复杂度判断。
2. 需求同时包含竞品研究、AX 规范、交互方案和透明度设计，已满足 Plan Agent 条件，却直接进入回答倾向。
3. 用户第一次纠正后，没有立即按归因阶梯定位“agent 失误还是框架失效”，导致同形问题连续复发。
4. 在声称“已解决、已 review”前，没有给出可复验的证据、提交状态和未完成边界。
5. 框架修改的 Git 收口规则没有执行，也没有说明为何未执行。

归因：这是 **L4 框架级复合故障**。agent 行为是直接原因；路由误截、规则未闭环和 checker 假绿是放大器。

## 3. 可复现实证

### E-01：框架元审计被项目门错误截获

对用户原句“那我需要你看看你为什么没有执行，我现在很多规则你都没有执行。我需要你系统的review一下，还有什么执行不了，为什么”执行 route-guard dry-run，且不给项目身份，实际结果为：

```json
{
  "decision": "PROJECT_STOP",
  "projectAction": "choose_new_or_existing",
  "projects": ["muse", "crm"],
  "complexityScore": 0,
  "signals": [],
  "planHint": false
}
```

期望结果应为框架 meta 任务，并进入 `PLAN_MODE`。根因是 meta 免检依赖有限前缀，未命中后又被
“长度大于 5 的陈述”兜底规则截成 Project Gate。

### E-02：Codex 接线校验可以假绿

`node scripts/verify-codex-wiring.mjs --static` 返回 `PASS=18, FAIL=0, BLOCKED=1`，但仓库当前只有：

- `preflight-agent`
- `quality-gate`
- `muse-proto-judge`

Plan Agent、work-agent、oracle 等角色没有 Codex 原生定义。S8 只验证 TOML 数量不小于 3，不能证明
路由所需角色真的存在。

### E-03：写入守卫扫描补丁正文而非真实目标

本审计第一次写报告时，补丁目标位于 `framework-audit`，但正文仅出现项目文档路径字面量，仍被
Codex PreToolUse 拒绝。恢复建议要求使用 Claude 的 Read 工具，而当前 Codex 工具面没有该工具。
这证明守卫把命令或补丁正文当作目标路径扫描，会误杀合法框架写入。

### E-04：执行包完成不等于实现完成

既有 Cycle 2 包的最终 handoff 校验为 PASS，但包内状态仍是 `READY_FOR_EXECUTION_SESSION`，且
`harness-findings.md` 仍有 10 项 BLOCKING 发现。当前校验只证明计划包闭合，不能证明框架实现已经落地。

### E-05：本会话自动注入的 AGENTS 内容不完整

本会话实际可见的自动注入在 first-class skill table 的第一行后结束，而磁盘文件仍有后续内容与
FILE_END。磁盘 checker 只能验证文件内容，不能证明运行时真正注入完整。该项是
`LIVE-OBSERVED`，尚缺平台级注入回执，因此不能继续把“全文注入”当成已证事实。

## 4. 规则执行矩阵

| 规则面 | 声明/来源 | 当前执行 | 当前验证 | 判定 |
|---|---|---|---|---|
| Project Gate | AGENTS、CLAUDE、route map | hook 可执行，但 meta 误截 | route fixture 不覆盖本句 | BLOCKING |
| Plan Agent 五条件 | CLAUDE、routing map | 主要依赖模型遵守 | 无统一完成回执 | BLOCKING |
| 项目写隔离 | session pin、scope guard | 写侧较强；切换前置写 pin | 有局部测试 | PARTIAL |
| 项目读隔离 | session restore、route guard | 无 pin 时仍读共享状态和进度 | 缺跨会话污染断言 | BLOCKING |
| 纠错归因 | correction-attribution | Stop hook 能提示 | 空 marker + mtime 即可关闭 | BLOCKING |
| 研究默认路由 | route map、skill rule | 有语义提示，仍可被前序错误截获 | fixture 局部覆盖 | PARTIAL |
| Human Gate | 各 skill | Claude 有结构化工具；Codex 只能文本停下 | 无跨 harness 回执 | PARTIAL |
| Skill 质量门 | skill invariants | 多为模型义务 | 大量 checker 只查 anchor | PARTIAL |
| 稳定记忆晋升 | memory governance | 有候选流程 | 未机械拒绝直接改 promoted 文件 | BLOCKING |
| Git 收口 | CLAUDE、correction-attribution | 主要依赖模型 | 无统一 closeout receipt | BLOCKING |
| Codex agent parity | model routing、agent TOML | 只有 3 个原生角色 | 数量检查假绿 | BLOCKING |
| Codex skill parity | 32 条软链 | `$skill` 可用 | 不具备 Claude slash 语法 | DEGRADED |
| Workflow parity | workflow runner | 可模拟调用 | 不是原生 Workflow | DEGRADED |
| PostToolUse 覆盖 | hooks、adapter | Codex 只覆盖 Bash 和 patch 主路径 | 与 Claude 事件面不等价 | PARTIAL |
| 规则完成性 | 多处散布 | 没有统一 obligation registry | 无端到端证明 | BLOCKING |

## 5. 什么是真的执行不了

以下是 harness 原生能力差异，不能靠文档宣称完全等价：

1. Codex 没有 Claude 的原生 slash-command 语法；只能通过 `$skill`、skill 选择器或手动仿真。
2. Codex 没有 Claude 的原生 Workflow 工具；当前 runner 是兼容实现。
3. Codex 没有等价的结构化 AskUserQuestion widget；Human Gate 只能降级为纯文本停下等待。
4. 两个 harness 的沙箱、事件类型和 PostToolUse 覆盖不同，不能宣称字节级或事件级平价。

这些差异可以做“语义平价”：同一决策不变量、同一停止条件、同一产出和可验证回执；不能包装成原生能力平价。

## 6. 什么不是执行不了，而是尚未接上

1. meta 任务正确绕过 Project Gate。
2. Plan Agent、work-agent、oracle 的 Codex 原生角色定义与精确校验。
3. 纠错关闭使用真实 receipt，而不是空 marker。
4. 无 pin 会话禁止读取共享项目状态。
5. 规则完成义务注册表与端到端 checker。
6. 稳定记忆文件直接写入的机械拒绝。
7. 正式 PR review 在 Codex 的 fallback。
8. Git closeout 的统一真值源、例外和回执。

这些均可修复，不应归因于 Codex 天生做不到。

## 7. 冲突与陈旧声明

1. 一般框架修改要求 `pull → edit → verify → commit + push`，同时“任何 Git 操作”又触发 Plan；
   纠错 fast path 也要求立即提交推送。缺少“已批准范围内的例行 closeout”例外。
2. Cycle 2 执行包明确禁止自动 push，这是局部覆盖；当前规则没有把局部覆盖和一般规则统一表示。
3. `model-routing.yaml` 一处仍写 `minimal`，另一处又明确拒绝 `minimal`、改用 `low`。
4. harness 与 Codex adapter 的注释仍保留“仓库 hook 不加载、需全局注册”等已过期建议。
5. `open-design` 把用户 design-system 偏好和 FxUI 色值写进通用 skill，违反产品中性与个人偏好归属。
6. 一个外部 resolver skill 带有“永不 abort、stage everything 并 commit”的高风险默认；融合 runbook 还偏好硬重置。

## 8. 根因树

```text
规则未执行
├── 路由层：meta 识别不完整，前序 Project Gate 抢占 Plan
├── 加载层：磁盘文件存在，不等于运行时完整注入
├── 执行层：大量义务依赖模型自律，没有统一强制器
├── 验证层：presence/anchor checker 可在行为缺失时假绿
├── 状态层：写侧 pin 较强，读侧仍可跨 session 污染
├── 纠错层：空 marker 可伪造完成
└── 收口层：Git 规则冲突且没有可验证 receipt
```

## 9. 审计裁决

**REFUTED：当前框架不能证明自己的规则被完整执行，也不能证明 Claude/Codex 已达语义平价。**

下一步必须先修“执行闭环”，再继续扩充规则。分阶段方案见
`framework-audit/2026-08-11-rule-execution-repair-plan.md`。该方案当前等待用户确认，不应静默执行。

<!-- FILE_END: 2026-08-11-rule-execution-system-review.md -->
