# 五方向改进：最终验收与发布收尾

记录日期：2026-10-28（Asia/Shanghai）。作用域：luca_gstack 框架，NO_PIN。

## 当前结论与阅读顺序

原五方向实现已验收并发布：`7788f4ac950818ccaa218daee39237b50d674b56`。
U001–U005 在记录的受控实验范围内完成，保留局限；U006 最终独立验收完成；U007 提交、推送 main、同步本地完成。
整体为 **DONE_WITH_CONCERNS**：真实外部 provider、完整跨宿主等价和长期收益仍未证明。

接手者先读本记录，再按需读[冻结评估报告](2026-10-27-five-direction-evaluation.md)与[原执行计划](plans/2026-10-27-five-direction-execution-plan.md)。
旧报告第89行的整体 Spec FAIL 和第103–105行的“U007 待执行”是发布前快照；它们不是当前任务状态。
历史失败仍有效地描述各自当时对象，不被后续 PASS 回填或删除。
不要因旧报告的“待执行”重复实施、提交或推送原发布。

本记录及[持久化证据附件](evidence/2026-10-28-five-direction-closeout.json)补齐终态索引，不修改原报告、计划或实现。
附件保存必要原票正文、原生 completion/accepted 身份摘录、批准原文及发布输出；恢复最终结论不再必须先找到临时目录。
它不是所有行为实验的完整可移植归档。完整 fixture、旧失败、私有原生记录仍保留在原位置；若要重新验证其全部细节，应按原报告定位并核 hash，缺失不能推定通过。

## 固定身份

| 对象 | 身份 |
|---|---|
| 原需求方案 SHA-256 | `f48556e943feefe485d831829d4a8d6fe179b85c7d048dac0d6423a6482fc4fa` |
| 计划 ID | `FIVE-DIRECTION-20261027` |
| 原计划 SHA-256 | `c00049c2be3c5b1ab551728f2020dacd5b4509981b3852d5b63ececea40f3e98` |
| 冻结报告 SHA-256 | `6a8bb6ca1e2bff904afcf16f805ffd9aa8b03498f422e43c9f082701ab8c581f` |
| 实现基线 | `a0a145ee1b45cf0467895eb529e64eae811836bb` |
| 已发布实现 | `7788f4ac950818ccaa218daee39237b50d674b56` |
| 本记录证据附件 SHA-256 | `682c23869c66ca104e3911cd04fc73675d1d45b2fc8ee16327d999bba9143524` |

附件 `release_blobs` 保存原发布全部七个文件的精确路径与 SHA-256。
其中个人 `/Users/luca/.agents/skills/tdd/SKILL.md` 不属于 Git 发布树；它与仓库候选的验收身份均为 `c11a0a218dd09f71614d0f94cbf69d277d7352b9a0d2debea896c3305af4ae82`。

## 从需求到结果

| 单元 | 实际结果 | 证据及保留边界 |
|---|---|---|
| U001 diagnosing-bugs | 补充人为变异的对象、diff、预期失败因果与恢复要求 | 六类正反例及恢复；自然 red 不强制变异；不证明全部诊断场景 |
| U002 tdd | 说明 seam 可观察行为、遗漏和未知，复用有效确认 | 固定输入原版/候选对照有具体说明增量；单样本不证明稳定收益或 M13 正式验收 |
| U003 handoff | 检查接续必需引用及必要 hash，标明缺口和恢复首步 | 生成与接收覆盖正常、缺失、hash/版本漂移及权限；共享案例、串行接收、额外只读及 preamble NOT_RUN 限制因果结论 |
| U004 to-tickets | 缺 gate 时先停止；部分失败按对象和每条关系读回恢复 | 四例恢复、三例门禁、正文及关系通过模拟验证；未知结果仅覆盖实际已落地的故障，不证明真实 provider 或原生 Phase 7 |
| U005 长期目标 | 复用 Plan/wayfinder/handoff，无新增平行机制 | 双原生会话和异常续接支持本次 no-op；保留未决人类选择；不证明真实项目中途撤权或长期体验 |

## 最终独立验收链

以下均是原票，正文和原生来源定位保存在附件 `original_verdicts`；本记录不重新裁决历史实验。
前三票绑定同一冻结报告及实现对象；后续三票只增加 self-model 修复的验收，不改变原五方向分母。

| 票据 eval_run_id | 结果 | 原生完成 turn |
|---|---|---|
| `five-direction-standards-release-20261027` | PASS 5/5 | `01a17d80-24bb-7e01-833d-0f9451f4903b` |
| `five-direction-spec-release-20261027` | PASS 8/8 | `01a17d81-75cb-7ca1-82df-4c6168650475` |
| `five-direction-final-release-aggregate-20261027` | PASS 14/14，U001–U005 | `01a17d84-829a-7772-95a1-b4855a7cd67c` |
| `five-direction-self-model-standards-20261028` | PASS 4/4 | `01a18043-5a8a-7bb0-bb6f-43767d74a161` |
| `five-direction-self-model-spec-20261028` | PASS 4/4 | `01a18044-6595-7012-b4ef-23d6afc44920` |
| `five-direction-self-model-aggregate-20261028` | PASS 4/4 | `01a18045-7c27-7ae1-b94d-496527ccf363` |

附件 `native_review_bindings` 分别保留 Standards、Spec、aggregate 三个 accepted invocation 与上述六个实际 `task_complete` 事件。
原生 invocation 分别为 `c540f84f-b66a-4406-b93a-142ff55f855e`、`c72c1528-0c52-42c4-a098-c482547b80cf`、`c326105c-b0b4-4a81-8b3b-3cc9f606ea4f`。
这些是既有原生记录的摘录，hash 只证明内容完整性，不是权限签名或新验收。

2026-10-28 独立端到端复核 `five-direction-end-to-end-expert-audit-20261028` 返回 **CONDITIONAL_PASS 5/6**：E1–E5 通过，E6 指出缺持久化终态索引。
该原票也完整保存在附件；本次新增两份文件针对 E6，不把原 5/6 改写为 6/6。
本收尾文件自身的后续复核与发布是另一交付；不能引用上述历史票冒充本文件已审或已推送。

## 增量授权及范围

用户原生消息明确批准修订计划、独立验证后提交/推送/同步，随后分别允许：

- 启用 Claude tdd 并验证：仅移除个人配置的 `skillOverrides.tdd: off`，其他配置语义和 0600 权限保留。
- 在候选工作树执行 `npm ci --ignore-scripts`，通过门禁后继续发布；安装不改 lockfile。
- 在具体预览后回复“允许”，将 self-model 生成快照加入本次提交。

最后一项预览明确限定生成时间、global 数量 `42→43`、加入 `sharedev-init`。
附件 `authorization_excerpts` 保留原生主会话第8504行的具体预览和第8514行用户“允许”，以及其他相关用户消息。
生成器未变；原生成器产生的新快照 SHA-256 为 `e12cbecee85033edf48feccc7fed1518ca6c387e61d5a94c87988bc4c34a69a9`。
这只证明磁盘清单更新，不代表 `sharedev-init` 安装或宿主消费已验收。

本次用户另行要求补齐持久化收尾记录，保留原报告和历史证据，独立复核通过后提交、推送 main 并同步本地，保留现有未提交改动；原文亦在附件。

## 原实现发布与保全读回

[原实现提交](https://github.com/wangmoumou1216-ai/luca_gstack/commit/7788f4ac950818ccaa218daee39237b50d674b56)仅包含七个文件。
原提交门禁 **PASS=129 / FAIL=0 / WARN=0 / DELEGATED=1**；附件保存完整门禁 stdout 及源文件 hash。
原生 `git push origin HEAD:main` 和本地 `pull --ff-only origin main` 均 exit 0，输出保存于 `original_release_operations`。
push 输出曾提示 Required Checks 尚未产生、规则被旁路；不能据 push 成功宣称 CI 通过。随后 [CI run 40621909251](https://github.com/wangmoumou1216-ai/luca_gstack/actions/runs/40621909251)的六个任务均实际成功，包括 Required Checks；本次通过 GitHub connector 再次读回，保存在 `fresh_readback.ci`。

收尾归档时重新执行远端 `git ls-remote origin refs/heads/main`，远端 main、候选 HEAD、本地 main 均为原实现提交 `7788f4ac950818ccaa218daee39237b50d674b56`。
这是记录时点的事实，不承诺 main 永远停在该提交；新增本收尾文档会产生后继提交。
本地 `/Users/luca/Desktop/luca_gstack` 原有两处未提交日志仍保留：

| 文件 | 保全 SHA-256 |
|---|---|
| `memory/evals/eval-log.jsonl` | `e53ca594b73523b6f101609ef0033f83d7df3103b760d593752f83f6bb80ceac` |
| `memory/retrieval-log.jsonl` | `4c9aef23cbf1cb7ff3cc6936ff812f56be989458fd1ccd2ed173029a39fb946b` |

本次未重写原报告、原计划、实现、历史失败或实验目录；未将个人配置、完整会话、私有模型绑定复制进仓库。
接续只需检查当前真实 Git 状态与本次收尾交付结果；未来真实 provider 验证、长期收益研究或其他实现应作为单独任务确定范围，不能从本记录获得新执行权。
