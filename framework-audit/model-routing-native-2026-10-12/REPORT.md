# 模型路由改造执行记录

当前状态：**DONE_WITH_CONCERNS（本地补丁）**；整项迁移尚未完成。用户批准「按照你的计划，改造，执行」，并确认代码改造、产品/设计、框架维护三类任务都有。范围为 NO_PIN 框架维护。

## 已落实的改造

- Claude 普通委派使用原生继承；删除中央档位、Fable 白名单、强制 model 参数和自动降级义务。
- 保留有意的原生模型默认：quality-gate / muse-proto-judge 为 opus，fact-collector 为 sonnet，preflight-agent 为 haiku。用户明确选择、独立审查、关键失败阻断继续有效。
- 旧 `recommended-model` / `model_tier` 仅为历史元数据；不再要求新 skill 登记或同步，不参与派发。行为对照工具的 `--skill-tier` 兼容保留为可选元数据。
- Codex 的 `model_routing`、`codex`、`agents` 解析对象与基线完全相等；未修改 hook/runner、私有 binding、source trust、项目隔离或用户 effort。
- 更新所有本次识别的强制消费者、派生指针与检查；新增 31 项反例测试，接入 `verify.sh` 的 S33。

## 当前验收

冻结基线 `b9b96d48cf389997949310d45c5e774c7aeddeb1`，本地候选 30 个文件。冻结差异 SHA-256：`f4235acb63361d118e3d8219ce073785f602643bf027ad469d8ade8b9e584eac`。具体路径及内容哈希见 [review-input.json](review-input.json)，原始差异见 [implementation.diff](implementation.diff)。

| 检查 | 结果 | 证据范围 |
|---|---|---|
| A01 路由 / host / Codex hook | PASS：26 组 / 138 / 379 | 真实测试代码与合成运行输入，不代替所有生产入口 |
| A02 runner / harness | PASS：85 / 17 | 包含模拟模型的运行回归 |
| A03 策略 / 登记 / 上下文 | PASS | 父级和独立 Spec 均执行 |
| Claude 原生策略反例 | PASS：31 项 | 真实 checker / governance 在隔离 fixture 中拒绝违规并恢复通过 |
| behavioral_ab | PASS：18 单测 + 8 selftest | 机械判定合同；不证明模型能力提高 |
| agent contracts / generated context | PASS：134 断言 / 派生一致 | 对应当前补丁 |
| Standards 终版冷审 | PASS：7/7，0 findings | 原始报告与同次 accepted 证据已保存 |
| Spec 终版冷审 | PASS：7/7，0 findings | 独立上下文，未收到 Standards 意见 |
| A04 全仓检查 | FAIL：119 PASS / 4 FAIL / 1 DELEGATED | 其中 3 项已修正并定向复测 PASS；C16 环境漂移未消除，未宣称全绿 |
| Claude 原生实际调用 | GAP | 403 认证失败、0 模型执行、0 子代理；candidate 臂未运行 |
| 净收益 / 分端启用 / 回退演练 | NOT_RUN | 上游实际调用未通过，不声称完成 |

两位判官为 Codex 原生独立调用，父级读回同 invocation `accepted`。这证明本次审查采用与完成；不表示 Claude 端执行成功，也不代表所有 Codex 入口验收完成。原始判决及 runtime 记录见本目录。第一轮 25 文件审查票为 Standards 5/5、Spec 8/8，仅代表旧差异；全仓检查发现五个遗漏的旧档位测试消费者后，补丁扩为 30 文件并重新冷审。终版以 `*-r2-*` 为准，原票保留，判决经独立 recorder 落账。

## 未完成项与使用边界

U001 范围冻结完成，U002 本地补丁完成，终版双轴审查状态见上表。U003 的离线回归已完成相应检查，但 Claude live 入口返回 `Failed to authenticate. API Error: 403 Request not allowed`；没有模型采用证据。U004 三类真实任务的质量、时间、用量对照，以及 U005 分端启用均未执行。

不能据此声称“大幅省钱”“质量提升”或“已正式生效”。当前只有工作区候选变更；没有提交、推送、部署，也未改账户认证、全局配置、trust 或清除失败状态。

后续先恢复现有 Claude 账户的可用认证，再执行原计划的当前实例行为验证及有界任务对照。保持已批准模型与 effort、冻结输入与验收规则，区分调度收益和换模型收益；成功后才进入正式启用。原计划及其历史审查记录保持原字节，执行状态由本记录承接。

全仓 C16 发现本机 `~/.claude/skills` 比提交的目录快照多出 `synced`。生成器和快照均与 HEAD 完全相同，本次没有改变它扫描的技能/agent/hook 名单；保留该环境漂移，不把它归为本补丁回归，也不为了全绿改全局目录。

## 回退边界

本轮未激活新部署。候选差异和逐文件 preimage 哈希已保存；本会话原文件副本保留于 `/tmp/luca-routing-review-20261012-ag6QvS/preimages/`。如撤销本地候选，先核对当前文件仍与已审版本相同，再逐项恢复；禁止整仓 reset、清锁或把旧验收票作为新调用证据。正式启用前仍须完成原计划 A05/A06 的实际行为及回退演练。

## 最终全仓结果与补测

`bash scripts/verify.sh --ci` 完整结束，exit 1，原始结果 **PASS=119 / FAIL=4 / WARN=0 / DELEGATED=1**，见 [verify-ci.log](verify-ci.log)。不重写原始失败记录：

| 原失败 | 原因与最终处置 |
|---|---|
| C16 | 与 HEAD 相同的生成器/快照检测到本机额外 `synced` 技能目录；未改，全仓仍不能标 PASS |
| S46 | wait-what 测试仍要求 guided-execution 中央登记；替换为原生继承合同，定向复测 PASS |
| S48 | writing-for-agents 测试仍要求 guided-execution 中央登记；同类修复，定向复测 PASS |
| S51 | motion-polish 测试仍读取退役 tiers；替换为原生合同，完整定向 CLI/反例回归 PASS |

同类消费者 prototype-notes、domain-modeling 一并修复并运行：prototype-notes 11/11（48 个子进程均结束），domain-modeling 全量合同 PASS。S59 在本轮全仓执行时已使用修正版并通过。相应 `*-final.log` 是当前版本实跑输出。没有重复整轮全仓测试，也没有用补测覆盖原始 FAIL 计数。

首次全仓尝试因工作区没有 node_modules 而在 P0e 停止；按现有 lockfile 执行 `npm ci --ignore-scripts --no-audit --no-fund` 后环境预检通过，未修改 lockfile 或安装全局依赖。

最终 30 文件输入经两轮独立轴分别重验：Standards **7/7**，Spec **7/7**，均为真实 completed 且父级读回同次 accepted。第一版 25 文件票保留但不代表终版。已审实现字节在交付时未漂移，`git diff --check` 通过。

## 2026-10-12 发布前续接（取代上文当前状态，不改写历史结果）

用户后续明确要求「review一遍。没任何问题，提交发布，推送远端」，并提供终端 Claude 登录成功的截图。此次发布范围是本仓源代码与审计证据；不修改账户、全局配置、私有绑定、source trust，也不声称已完成 U004 净收益实验或全局部署。

最终源代码扩为 32 个文件：补齐远端 CI 的 S33 原生路由反例测试，并通过 canonical `build-self-model.mjs` 重建本机目录快照，消除原 C16 漂移。冻结输入与 diff 见 `publication-validation/review-input.json`。独立 Standards **6/6 PASS、0 findings**；独立 Spec **8/8 PASS、0 findings**，同次原生调用均已 accepted，原票与收据保留于该目录。

Claude 的 403 已定位到入口网络差异：正在使用的终端经本机代理，自动执行入口此前未继承代理。只为当前测试进程沿用终端已有代理后，认证 smoke 成功，实际模型为用户当前默认 `claude-sonnet-5-5`；没有修改全局网络、模型或 effort。

真实原生委派成功：两次 Agent 调用串行、省略 model 参数，普通无 pin 代理采用 `claude-sonnet-5-5`；配置 opus 的原生测试代理采用 `claude-opus-5-5`。两个 agent ID、独立子会话模型记录、完成事件和返回标记均已保留；不是依据代理自报推断模型。测试代理定义通过本次 CLI 的原生 `--agents` 传入，未替换仓库 agent 文件。该测试证明继承和显式默认的原生行为，不等于所有角色和入口全量验收。

三类合成调度题在同一用户根模型/effort 下完成基线和候选两次调用；候选保留普通继承、独立审查、显式 sonnet 选择与失败阻断。基线也给出部分相同行为，因此不能据此声称净收益。完整真实任务 A/B、所有 U003 场景与 U005 全局启用仍未完成；本次 Git 发布不把它们标成 PASS。

最终全仓验证、提交与远端状态由后续发布回执记录；本文不预先宣布成功。原 403、旧全仓 FAIL 及其修复历史全部保留。
