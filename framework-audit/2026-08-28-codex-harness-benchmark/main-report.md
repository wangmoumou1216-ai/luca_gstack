# OpenAI Codex 开源 Harness × luca_gstack 系统级对标深评

状态：**DONE_WITH_CONCERNS / PENDING_HUMAN_GATE**
评估日期：**2026-08-28**
顶层流程：**framework-evolution Mode 2**
本地姿态：**NO_PIN / pure meta**

## 一、核心结论

### 1. 最优架构不是替换，而是分层

OpenAI Codex 的强项是原生运行时与控制平面：typed tools、unified exec、OS sandbox、approval、配置分层、hooks、thread/app-server、multi-agent、SDK、trace 与大规模工程验证。luca_gstack 的强项是运行时之上的治理目标：意图路由、Plan 条件、artifact/handoff、候选晋升、framework evolution、人类采纳所有权与跨 harness 语义一致性。

因此，值得借鉴的方向是让 Codex 做底座、luca 保持治理权威；不应把 Codex 运行时重新造一遍，也不应让 Codex-only 状态替代 luca 的跨 harness 契约。

### 2. Codex 的运行时领先有证据；luca 的治理“覆盖领先”不等于机械成熟度领先

红队推翻了初稿的双权重总分，因为 C14/C17/C21 等行比较的是不同构念。最终保留的数字只是**同一 rubric 内部画像**：Codex 是原生 substrate，luca 是跨 harness overlay，二者并非独立替代品，均值不能被解释为总体优劣或有效组合栈能力。

| Profile | OpenAI Codex | luca_gstack | 可允许的解释 |
|---|---:|---:|---|
| 14 项 runtime/extension 自有实现证据画像 | **4.36 / 5** | **2.89 / 5** | 仅支持“Codex 原生 runtime/control-plane 证据更强”的定性结论；不代表组合栈差值 |
| 7 项 luca 治理目标内部证据画像 | N/A | **3.14 / 5** | luca 覆盖 Codex 不负责的治理问题；当前证据混合机械机制与契约/模型执行 |

不能再引用初稿的 88.8/68.9 或 74.6/80.4 作为最终结论；它们仅保留在红队审计轨迹中。

### 3. 本次最重要的新事实：本地 judge 并非机械只读

三个本地 Codex agent TOML 声明了 read-only，但 pinned Codex 的 AgentRoleOverrides 不接管 sandbox/approval，测试明确验证子角色保留父会话权限。也就是说：

- “只读”目前是角色指令意图，不是 runtime 强制；
- 父会话可写时，judge 子 agent 仍继承可写权限；
- 直接扩张 native planner/work/oracle 注册会放大错误安全假设。

这项发现已写入 inventory、C09、机会裁决和红队报告。任何修复或角色改造都未执行，必须另过人类 GATE。

### 4. 两项 Codex 借鉴候选之外，还出现四项本地自托管缺口

最终值得人类审议的集合分两类：

1. 跨 harness 语义与义务证据闭环；
2. 显式、隔离的最小权限 profile 评估；
3. route polarity 与 scope-guard 自托管 conformance；
4. judge verdict 与 eval recorder 的权限分离；
5. observability writer 的并发唯一性与原子性；
6. CI severity、projection portability 与 negative-control closure。

前两项是 Codex-derived adaptation；后四项是本次对标反向创造的 luca 本地 gap 候选。execpolicy command-prefix 投影仍有价值，但尚未覆盖 Ask/用户 override、approval-policy 矩阵与 projection SSOT，因此降为 DEFER，不进入当前 GATE。没有任何候选意味着直接复制整个 Codex 子系统。

## 二、范围与证据

### OpenAI 侧

- 官方仓库：[openai/codex](https://github.com/openai/codex)
- 固定 commit：[7d6f808b97e424da80271be8cc539e8c5437a229](https://github.com/openai/codex/commit/7d6f808b97e424da80271be8cc539e8c5437a229)
- commit 时间：2026-08-28T06:18:20Z
- 下载 archive SHA-256：cfc6c2ea55bf55b17b59333d6dce1517733c30943e8dfa135e2f1611674c09b4
- 官方公共指引以 2026-08-28 访问的 [Hooks](https://learn.chatgpt.com/codex/hooks)、[Skills](https://learn.chatgpt.com/codex/build-skills)、[Subagents](https://learn.chatgpt.com/codex/agent-configuration/subagents)、[Memories](https://learn.chatgpt.com/codex/customization/memories)、[Auto-review](https://learn.chatgpt.com/codex/sandboxing/auto-review)、[App server](https://learn.chatgpt.com/codex/app-server) 等为准；完整链接与哈希见 evidence-index.md 和 source-manifest.md。
- 开源边界不含闭源 IDE extension 与 Codex cloud。

### luca_gstack 侧

- HEAD：b438c92b1d1dbb28f5252396181f1cb9ab806900
- 评估的是 current pure-meta worktree，不是仅 HEAD；已有 dirty 文件被保留，具体路径与 hash 已登记。
- 只读取框架契约、skill-os evolution、framework-audit、hooks、scripts、memory、Codex/agent/skill meta 面。
- 未读取产品态上下文、共享项目产物或工作流项目状态；未调用任何 identity transaction。

### 验证动作

- local static wiring：`--static` 为 PASS=18、FAIL=0、BLOCKED=1；随后在获准越过外层嵌套沙箱后，完整只读活体 verifier 为 **PASS=21、FAIL=0、BLOCKED=0**。外层沙箱内直接启动嵌套 Codex 会在 app-server 初始化前报 `Operation not permitted`，这不是 hook wiring 失败。
- viability 时间线：初始 inventory lane PASS=33/FAIL=0；`handoff` 并发出现但尚未进 registry 时，2026-08-28T15:44:25+0800 为 PASS=32/FAIL=1；另一条并发流程补齐 projection 后，最终验证为 PASS=34/FAIL=0（32 skills）。本 benchmark 没有修改 skill 或 registry，只记录三个时点。
- capability parity：anchors present，但这不证明行为/语义等价。
- project-scope fixtures：PASS=88、FAIL=0；与此同时源码硬编码 fallback 与命令字符串误报未被这些 fixtures 覆盖，因此绿色不等于闭合。
- 上游源码未执行，完整上游 test suite 未运行；698 来自 `find codex-rs -path '*/tests/*' -type f`，1,135 来自 `find codex-rs -type f \( -name '*_tests.rs' -o -path '*/tests/*.rs' \)`；这两个精确 predicate 仅表示验证面广，不代表覆盖率。
- 官方联网证据全部来自 OpenAI 一手资料，访问日期均为 2026-08-28。

## 三、OpenAI Codex 值得重视的原生能力

### 已确认原生存在

- Hooks：12 类 lifecycle 事件、定义 hash trust、command/MCP handler、不同事件的 fail-open/fail-closed 语义与 output spill。
- Skills：分层发现、渐进加载、显式/隐式调用、初始 context budget、symlink 支持与 MCP dependency。
- Subagents/custom roles：native lineage、capacity/depth、spawn/message/wait；但 live parent permission 优先。
- Local memories：stable 但 default-off 的异步本地 recall；可跳过，不能当强一致规则库。
- Guardian auto-review：`guardian_approval` feature gate 是 stable/default-on，但默认 reviewer 仍是 **user**；auto-review 必须显式 opt-in，且只审 sandbox-boundary escalation，不是通用质量评审。
- App-server/SDK：typed thread/turn/permission/skill/plugin/MCP control plane；Python 客户端比 TypeScript wrapper 更完整。
- Sandbox/approval/config trust：OS enforcement 与人类/模型审批分离，且有 layer provenance。
- Rollout/trace/OTEL：事件与执行证据丰富，但不能证明治理决策合法。

### 不能过度解读的边界

- multi-agent v1 stable/on，不代表 v2 工具全部默认开启。
- Guardian base stable/on，不代表 Guardian v2 或所有账户/组织均可用。
- hooks 的部分 handler/source 仍 skipped 或 first-only。
- skill policy 有已解析但未 enforcement 的字段。
- execpolicy 语言仍是 preview。
- runtime trace 证明发生了什么，不证明应该发生或人类授权了什么。

## 四、luca_gstack 的优势、差距与目标差异

### 已有优势或覆盖领先

- candidate→review→promote 的记忆治理，以及 extraction/attribution 纪律；
- framework-evolution Mode 2、fusion/quarantine 与 propose-only；
- Project→Plan→Framework→Skill 的路由意图与复杂度分流；
- artifact/handoff/eval 的工作流语义；
- 人类拥有产品、架构、采纳与发布裁决；
- session identity、CAS、lease 与 confinement 的特定问题建模；
- 明确追求 Claude/Codex 双 harness 语义一致。

这些是覆盖与目标优势，不等于每项都已机械 enforcement。Plan、graph、human gate、eval、handoff 的一部分仍依赖契约和模型遵循。

### 关键差距

1. **权限假设错误**：native judge 的 read-only TOML 不产生机械隔离。
2. **parity blind spot**：MagicPath intentional delegation 已被源文件证实，但当前 checker 不能表达/验证这一 source-owned reason，也不能识别具有相同 anchors 的未来误替换。
3. **obligation receipt 缺口**：文件/anchor 出现不证明必做步骤真实执行。
4. **host dependence**：hooks、agent lifecycle、exec、SDK/state 依赖宿主或 wrapper。
5. **权限 blast radius**：宽 writable roots 有真实历史原因，但普通会话失误影响面仍大。
6. **route negation failure**：只读 dry-run 复现了“明确不要 Project Gate / 不要做 benchmark”仍被词面规则反向命中的情况；正向 fixture 不能覆盖 polarity。
7. **scope self-hosting gap**：scope guard 对整段 Bash 字符串做 regex 扫描，NO_PIN 下无法区分只读与写入；源码另含一个本机绝对路径 fallback，88 条测试没有覆盖 display link 缺失/跨机路径。
8. **judge/eval 冲突**：判官宣称只读，却又被共享合同要求自己写 eval-log；继承可写父权限时不再机械只读，真正 read-only 时必达落账会 fail-open。
9. **observability 并发风险**：ID 由无锁计数生成，`rules.yaml` 是无锁 read-modify-write，observation 与 rule 非事务更新；多 agent 下可能重复 ID、丢规则或半提交。
10. **CI false-green / portability**：HTML 与若干 quality-contract 检查只 warning；远端 CI 未覆盖全部本地 verify；多处绝对路径与未 pin 的工具依赖削弱复现性。
11. **证据可复现性**：本地是 dirty worktree snapshot；官方 web 页面可变，已用 hash 与 access date 降低歧义。

### 目标不同、不应强行同化

- Codex 的 CLI/TUI/cloud-facing runtime/SDK 是基础设施责任；
- luca 的产品中性工作流、采纳治理与 artifact semantics 是应用治理责任；
- project trust 不等于 session identity；
- goal/thread outcome 不等于 handoff/eval；
- system permission approval 不等于 product-decision human gate。

## 五、借鉴分类

### 直接借鉴的仅是模式

- behavior/mutation/negative-control test idiom；
- 事件级 failure taxonomy 与明确的失败语义。
- append-only raw evidence + offline projection/reducer；
- 同版本 schema generation、stable/experimental capability gate 与 CI gatherer 模式。

没有整个 Codex 子系统适合无适配直接采纳。

### 适配后才值得审议

- 显式隔离的 least-authority profile；
- 把 rollout/app-server 事件作为跨 harness 证据源之一，而非权威；
- 窄范围 execpolicy prefix safety 仅保留为延期研究项；Ask/override、approval-policy matrix 与生成式投影 SSOT 未闭合前不得进入 GATE。

### 已由宿主继承，不应重复建设

- native hook trust 与 output spill；
- skill loader；
- subagent lifecycle。

### 不应借鉴

- generated memory 取代 governed memory；
- auto-review 取代人类产品/架构/采纳门；
- project trust 取代 identity/CAS；
- Goal 取代 artifact/handoff/eval；
- 独立第二套 feature/governance registry；
- 把 Guardian breaker 泛化为通用 workflow breaker；
- 假设 role TOML 可机械设置只读；
- Codex-only SSOT；
- 仅为便利扩大权限。

## 六、最终机会清单

| 顺序 | 机会 | 价值/成本/风险 | 最小方案 | 验证 | 回滚 |
|---:|---|---|---|---|---|
| 1 | route polarity 与 scope-guard conformance | High / Low-Medium / Medium | 只加 dry-run/fixture：否定句、quoted pattern、dynamic shell、display-link-missing、fail-open 分支 | 明确 NO_PIN/meta 语句不触发项目动作；只读 pattern 不误阻断；危险路径仍拒绝 | false negative、需要第二 router 或 fixture 无法跨 harness 复用时撤回实验 |
| 2 | observability 原子 writer | High / Low-Medium / Medium | 在 tmp fixture 中引入唯一 ID、锁/原子替换与 observation-rule commit receipt | 并发 writer 无重复 ID/丢规则；中断后可恢复；reader 不把损坏静默当空规则 | 锁错误扩大 fail-open、吞吐显著退化或出现第二日志真值时撤回 |
| 3 | 跨 harness 语义与义务证据闭环 | High / Medium / Medium | 从现有 SSOT 派生；加入 intentional-delegate 与 swapped-target negative controls；trace 仅为证据输入 | 两 harness 同 verdict；误接线与缺义务必失败；intentional delegate 有 source-owned reason | 出现第二 catalog、Codex-only truth 或不可解 false positive 时移除实验 checker |
| 4 | CI severity 与 projection portability closure | High / Medium / Medium | 明确 blocker/warning；把现有本地关键 checks 接入远端 gatherer；加入绝对路径和版本漂移负控 | HTML/contract 真失败能阻断；跨用户路径 fixture 通过；TOCTOU 输入变化显式报告 | CI 不稳定、外部工具无法 pin 或 gate 误阻合法变更时降级/撤回 |
| 5 | 显式隔离 least-authority profile 评估 | High / Medium / High | 在 benchmark-only opt-in profile 回放固定 corpus；不自动绑定 route/identity | 合法写成功、越界写机械失败、memory/IPC/CAS 不断链、child 继承预期 profile | 合法 workflow 受损、profile 选择不确定或形成第二 identity router 时删除实验 profile |
| 6 | judge verdict / eval recorder 权限分离 | High / Medium / High | 先证明 parent/child 权限矩阵；把 verdict 生成与受信落账作为两个可验证责任，不改判官结果 | 判官不能改被审对象；合法 verdict 必达记录；失败显式而非 `skipped` 静默放行 | 记录者可篡改 verdict、权限扩大或 Claude/Codex 语义分叉时撤回 |

延期项：确定性 command-prefix safety 投影。重访前必须明确权威规则来源、生成式投影而非第二真值、Ask/Allow/Forbidden 三态，以及 interactive/non-interactive/never approval-policy 矩阵。

详细证据、收益、最小方案、验证与回滚条件见 opportunities.md。

## 七、红队后的翻案

本次红队不是盖章：

- 推翻双权重 winner totals；
- 推翻“same granularity”；
- 推翻“三个 native judge 机械只读”；
- 将 4.36/2.89 与 3.14 降级为 rubric 内部画像，不再当跨体系总体证据；
- 将 MagicPath 从“功能缺陷”改为“intentional delegation 已证实，但 checker 无法验证 source-owned reason”；
- 拒绝 standalone feature registry、通用 Guardian breaker、native planner/work/oracle 扩张、重复 hook spill；
- 推迟 hook expansion、app-server backend、memory exclusion、plugin packaging；
- 将 execpolicy prefix safety 从 gate-ready 降为 DEFER，并保留六条 non-opportunity 与 human adoption gate。

完整质疑、证据与 STANDS/MODIFIED/OVERTURNED 裁决见 redteam-review.md。

## 八、限制

- 上游是单一 commit snapshot，不代表后续 main。
- 未执行上游代码或完整测试。
- live verifier 在获准的外层环境中通过，但它只证明脚本声明的 bundle/探针，不证明六事件所有 allow/deny/rewrite/fail-open 分支。
- NO_PIN 使产品项目路径、真实 handoff 与 identity transaction 不在本次验证面，这是用户明确边界，不是 blocker。
- 本地 dirty worktree 在研究期间仍有并发 meta 变化；最终关键文件 hash 采样于 2026-08-28T15:59:54+0800，无法由 HEAD 单独复现，也不应被误读为全仓冻结。
- 价值/成本/风险仍是研究判断；只有实验数据才能升级为事实。

## 九、人类 GATE

研究评估到此完成；采纳仍未开始。任何下一步都必须由人类对 FINAL-OPP-01 至 FINAL-OPP-06 分别选择：

- OPEN_GAP
- AUTHORIZE_SPIKE
- DEFER
- REJECT

当前六项全部是 **UNDECIDED**。本次没有修改 code、hook、config、skill、memory rule、gap register、benchmark registry、adoption log 或 release。

## 十、产物索引

- main-report.md — 主报告
- inventory.md — 双侧 coverage inventory
- capability-matrix.md — 22 项最终矩阵与分层 profile
- rubric-scorecard.md — rubric、dossier 与红队后评分
- evidence-index.md — 官方/源码/本地证据索引
- source-manifest.md — 上游 pin、web hash、本地 dirty/hash 清单
- focused-source-check.md — 五项官方一手单点核验
- opportunities.md — 最终机会、延期、拒绝与 GATE
- redteam-review.md — 正向红队、反向红队、reasoning-heavy 终审、Socratic 修订与残余风险
- final-review.md — 独立终审、终态哈希与残余风险

<!-- FILE_END: main-report.md -->
