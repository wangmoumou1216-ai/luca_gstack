# P6 v24 独立 Spec delta 审查

**PASS — 有界 delta，无新增 blocker。** v24 精确识别已观察的 Codex 启动 notice，没有降低真实读取、I/O、模型/冻结或 candidate 失败门。此结论只支持按授权收集 8 个尚未执行的独立诊断票，**不能把现有 candidate 失败洗成发布 PASS**。

## 对象与差分

对比 `framework-audit/2026-09-05-agent-context-p6-v23-scorer/run-agent-context-ab.mjs` 与当前 `scripts/run-agent-context-ab.mjs`。归档 v23 hash 为 `15c689040272b06142a50c354e18bf7e58436e56c967bc968f377d6b53be80bb`，与前次审查完全一致。

当前 runner hash：`6785d1fe7e6e5f4624ff0436cf7dddabd73b5d5ef5f2f40431efebad6baba779`；revision `v24-exact-codex-skill-budget-notice`；联合 scorer `f7adb4b1e1922e415c89824cf19e969a41334cd7ea616009d7a898cc47429cb5`。两个 fixture/test 样本文件与 v23 归档逐字节相同。

差分只涉及 protocol/revision、`:371` 起的精确 notice classifier、`:388` 的完整事件保留，以及 `:1148` 起的定向测试。`evaluate()`、requiredTargets/project-session EOF、candidateTracePolicy、sharedScopeAudit、claims/source、冻结检查、失败留证与 append 逻辑没有改变。

## 合同核对与新反证

- 仅 `item.completed` 且顶层 key 集精确为 `item,type`、item key 精确为 `id,message,type`、类型为 error、非空字符串 ID、消息逐字一致时，才归类 runtime_notice。不是所有 error 都忽略，也不是前缀/模糊匹配。
- 通过 `trace.push({type:'runtime_notice',event})` 保留完整原事件，未抹除 notice；其内容本身不执行 I/O，也不构成文件读取证据。
- 独立调用原生产 projection/audit/evaluate 的窄探针通过：8 种改形状/加字段/未知错误/空 ID 变体仍 UNKNOWN；notice 加独立越界读取仍 FAIL，叠加未知命令、file_change、web_search 仍 UNKNOWN。
- notice 加正确 STOP 字段和其它 startup 完整读取时，缺 project-session 或仅首行均 FAIL；完整读取后才 PASS。notice 不能满足/绕过新的 K5/K10 必读义务。
- 这些是纯本地 synthetic traces，结果 `/private/tmp/p6-v24-spec-probe/result.json`，探针 `node /private/tmp/p6-v24-spec-probe/probe.mjs` exit 0；没有执行模型 CLI、网络或完整 verify。

因此符合原 K5/K6/K10 与 P6 真实证据要求：已知无 I/O 提示有明确分类，实际读取和未知活动仍独立计入，未知不会被解释成已完成。旧 v23 candidate Claude F4-stop 的真实 project-session 缺读仍属于未闭合失败；Claude projection 与必读检查未变，不能利用本次 Codex notice 修改重评该票为 PASS。

## 新冻结与剩余票

新 release 的 context hashes 与 fallback IDs 与 v23 精确一致；scorer 与当前源码独立重算一致。release-v24 SHA-256：`9cbe0f34ca388e35abc172062be0375c6421caee9515ebda373a794b0971761a`。

最终 commands 的顺序是 **4、10、12、14、16（Codex 五票），然后 11、13、15（Claude 三票）**，符合用户在 Claude 限额期间先测其它票的要求。8 个组合唯一且与已有 v23 尝试集合无交集，未重跑 cell 1 或任何已执行票；trials/concurrency 都为 1，candidate 全保留 require-pass，Claude 保留批准模型，所有输出指向独立 live-v24 文件和 release-v24 manifest，argv 与显示 command 逐项一致，无 resume-valid。父报告真实 preflight 已通过；本 reviewer 没有另发 live 调用。

## 结论边界

允许在原授权范围继续剩余诊断收集；先前失败、超时、UNKNOWN 及原始流保持原版本意义，不能覆盖、倒改或挑优。任何新 candidate 失败仍不能报发布 PASS。最终预算、完整验证、发布以及先前未闭合的真实候选行为问题，不因本次分类器 delta 自动完成。

未修改冻结源码，未读取 Standards 报告，未重复 131-path 全审。B1 继续 USER_WAIVED。
