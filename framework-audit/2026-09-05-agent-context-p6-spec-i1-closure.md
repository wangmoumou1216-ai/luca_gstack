# P6 SPEC-I1 独立 delta 闭合

**PASS — SPEC-I1 已闭合。** 本次只审两文件相对原 131-path 冻结对象的新增差分，不重评旧票、不改原源码报告的历史结论。

## 精确对象

- `scripts/run-agent-context-ab.mjs` SHA-256：`15c689040272b06142a50c354e18bf7e58436e56c967bc968f377d6b53be80bb`
- `scripts/test-agent-context-branch-fixtures.mjs` SHA-256：`ef4c9d38ed3d2a67a2e40484a7289690cae0b8a14cb0d76e45a477f0e5c4ea78`
- 不变 fixture `scripts/agent-context-branch-fixtures.mjs` SHA-256：`49d95e6cbad360c34a79bae5a567cf276ab8f7c3c7410e0e4d06df6ef0566b9a`
- protocol v23，revision `v23-required-no-pin-project-session-eof`；联合 scoring SHA-256：`e392065e637e883008c58443eaf1c9d028c47990e1b231e6715e67b8aba7501a`。

## 源码判断

`run-agent-context-ab.mjs:841`–`:847` 仅为 candidate 非 trivial/非 isolated-root 的 startupTargets 加入精确 `.claude/skill-os/runtime/project-session.md`，仍以原 Set 去重、原 `targetReadEvidence()` 逐项要求完整读取。该 owner 的 NO_PIN framework/meta 条件由 runner 共同前缀明确触发；未新增 `framework-maintenance` 全票必读或自然语言规则引擎。

补测 `:1072` 起覆盖两个真实事件投影格式，并让答案 source 不依赖 owner 是否列入引用，断言缺读时 claims/source 仍通过但总体拒绝，避免被另一错误掩盖。已有 F2 同 owner 只检查一次；baseline 和 trivial/root-only 的特殊规则维持原分支。新测试模块 `:62` 只返回原固定阳性样本的深拷贝，没有修改 fixture prompt、claims 或既有样本值。协议版本升级与 scorer 变更匹配，差分未接触旧录制证据或评分记录。

## 独立新反证

从上述准确 runner 复制 CLI 主执行前的原函数并只加 export，直接调用 production evaluate、claudeProjection、codexProjection。独立探针 `/private/tmp/p6-spec-i1-closure/probe.mjs` 使用当前准确目标文件内容构造本地原始事件，执行 exit 0。

| harness | fixture | 未读 owner | 只读首行 | 完整读 EOF |
|---|---|---|---|---|
| Claude | F13 / F14 / F10-v2 / F4-stop / F2 | 全部拒绝 | 全部拒绝 | 全部通过 |
| Codex | F13 / F14 / F10-v2 / F4-stop / F2 | 全部拒绝 | 全部拒绝 | 全部通过 |

10 组中缺读/部分读的 claims_pass、source_pass 都为 true，因此失败准确来自新增 required-owner 义务。每组 owner target check 仅一个；baseline 缺读对照仍通过，F1 无读取仍通过。

在另一个 `/private/tmp` 副本只移除新增 owner，F13 缺读在两个 harness 投影下均重新变成 PASS；恢复调用原 guard 后均回到 FAIL。结果 `/private/tmp/p6-spec-i1-closure/results.json`。此反证验证生产评分约束确实起效，没有执行模型 CLI、技能、OD、浏览器或网络，也没有重复 full verify。

## 闭合范围

此 delta 修复原报告 `/private/tmp/p6-spec-review.md` 唯一新增源码 Important，当前 **源码 Spec 合同可判 PASS**（原报告其余保留判断继续适用）。OD 材料 STAGED 的独立闭合另见 `/private/tmp/p6-spec-od-closure.md`。

这不把 synthetic matcher trace 当真实 CLI 成功，也不倒改 v22/首票失败；后续候选必须使用新冻结身份。真实剩余 CLI、最终预算 delta、最终验证/精确 staged 快照及发布门仍待父按各自证据闭合。B1 仍 USER_WAIVED。

## v23 冻结资料补核

独立读取新 `release-v23.json`、`identities-v23.json`、`commands-v23.json`，未执行任何 live command，也未读另一 checkout。release 文件 SHA-256 为 `53b37670277548de701e69d7435c1741239ee0df2061dec7a27294d917bdc1c2`，与指定冻结一致；四个 arm/harness identity 的协议、revision、联合 scorer 与 evaluator hash 均与上述源码相符，context hashes 与 release 中对应 arm 精确一致。

commands 为连续且唯一的 **cell 2–16，共 15 条**，精确保留原授权剩余组合，未包含失败 cell 1；各 argv 与展示 command 经 shlex 对比一致，trials/concurrency 均 1，全部指向 v23 manifest 与独立 v23 output，candidate 全部 require-pass，Claude 显式指定原批准模型；没有 resume-valid。调度文本明确串行逐票检查与无自动重跑。

identities 文件是 release 绑定前的描述快照，状态诚实保留 `RELEASE_REQUIRED` / null manifest；不能把该字段当成已绑定实际调用。父另行报告四组带 manifest 的 describe 均已 `RELEASE_BOUND`；本补核只声明已审文件及代码的冻结一致性，不伪称重复执行了父的 preflight。实际执行仍由 runner 校验当前 context/scorer/release 身份，漂移应停止。

**源码及本次冻结合同闭合 PASS；无新增 blocker。** 可在现有用户授权及父已完成的真实 preflight 下继续原 cell 2；不得由此重跑 cell 1、增加票数或宣称整个 P6 完成。
