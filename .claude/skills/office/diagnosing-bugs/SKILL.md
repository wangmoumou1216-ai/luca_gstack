---
name: diagnosing-bugs
description: Diagnose an unexpected failure, regression, flaky behavior, or performance regression by first building a tight loop that reproduces the user's exact symptom, then tracing a falsifiable root cause. Default to diagnose-only with no writes or network; do not invoke for an expected TDD red, a planned failing test, or a known implementation gap.
license: MIT
metadata:
  recommended-model: core-execution
---

# Diagnosing Bugs

先建立实际运行过、命中用户 exact symptom 的 tight red loop，再以可证伪证据定位根因。
默认 diagnose-only：只读和已经授权的本地诊断；不改产品、测试、配置、Git 或外部状态，
不联网。诊断请求不等于修复许可；已有父 U-ID 精确实现授权可以继承，不能扩大。

## Trigger and safety

unexpected failure、regression、flaky behavior、性能退化进入本方法。expected TDD red、
计划中的 failing acceptance、已知未实现需求留在原实现循环；真实 Git conflict 归
resolving-merge-conflicts。含混时检查当前任务与测试意图，不因看到红就调用。

输出前 secrets、credentials、auth headers、PII 一律 `<REDACTED>`，只引用信号行，凭据通过
已有环境变量读取。需要未脱敏内容才能分析时说明缺口并等待，不输出密钥。
测试/build/browser/app startup 可能写入，只有 task-owned scratch overlay 或已批精确效果
才运行。优先既有 `scripts/safe-diagnostic-runner.mjs` 支持的只读观察；可选
`scripts/safe-snapshot-copy.py` 的 CAS copy 只在 exact OS-temp scratch 已授权时用，
flag 不是人类批准。未批 network/production instrumentation/package fetch/Git ref 效果不执行。
读取已授权词汇 owner 和相关 ADR，以真实域词提出 hypotheses，不重开已接受决定。

## Phase 1 — Build a tight feedback loop

本阶段花最多 effort。按可行性选择能命中 exact symptom 的方式，并分别核对其权限：

1. 正确 seam 的 failing unit/integration/e2e test。
2. 已授权 dev server 的 curl/HTTP script。
3. fixture CLI invocation，对照独立 known-good stdout snapshot。
4. 已批准 headless browser，断言 DOM/console/network 的具体症状。
5. 脱敏真实 request/payload/event trace 的本地 replay。
6. scratch throwaway harness，以最小系统和真实触发路径调用。
7. property/fuzz loop，固定 seed，寻找具体错误而非泛异常。
8. 两个 known states 的 bisection harness；涉及 checkout/ref 必须另有对应授权。
9. 相同 input 的旧新版本/config differential loop。
10. 最后才是 `scripts/hitl-loop.template.sh` 的结构化人类步骤，用户自行登录，agent 只收观察。

把 loop 当成产品继续缩紧：缓存 setup/省无关初始化、断言精确 message/value/ordering/timing、
固定时钟/RNG/filesystem/network fixture。Flaky bug 以实测高复现率替代绝对 deterministic；
在批准隔离范围循环触发/受控 stress/缩时间窗，每次记 seed、次数与率，不把一次幸运 pass 当修好。

Phase 1 完成需给一个已实际运行的命令、脱敏输出及退出/症状值：实际走 bug code path、
已观察 red、exact symptom 可在修复后 green、稳定或高复现率、seconds 级、可无人运行
（HITL 有结构化步骤）。没有 loop 不建理论；列已试办法并请求环境/脱敏 HAR/log/trace 或
另行批准的临时 instrumentation。不可复现返回 NEEDS_CONTEXT，不猜根因。

## Phase 2 — Reproduce and minimise

重复原 loop 确认是用户描述的 bug，记录真实错误、输出、时序或性能阈值。每次只 cut 一个
input/caller/config/data/步骤，cut 后实际重跑，保留仍使 loop red 的最小场景；剩余每个
元素都应 load-bearing（再删一个即 green）。不在未最小化时推进。
异步 race 在需要时完整读 `references/condition-based-waiting.md` 与示例，等待真实条件；
只有时间本身是被测行为时才用有依据的延时。量化复现率而非藏起 flake。

## Phase 3 — Ranked falsifiable hypotheses

读完整 error/stack、最近相关 changes 和 working comparison，沿数据/控制流追到 origin；
做 root tracing 前完整读 `references/root-cause-tracing.md`。
先展示 3–5 ranked hypotheses，每项有独立 prediction：

```text
If <X> is the cause, then <one change to Y / observation Z> should remove or worsen <exact symptom>.
```

不能说出 prediction 就丢弃/锐化。展示 ranking 是事实调查 checkpoint，不是新实施批准；
可在已有权限内继续 probes。用户提供已排除原因时重新 rank，不能只护第一理论。

## Phase 4 — Instrument and conclude diagnosis

每次 probe 对应一项 prediction，一次一变量。优先 debugger/REPL breakpoint，其次区分
hypotheses 的 targeted logs；写-producing instrumentation 只能在批准范围。每条 debug
带唯一 `[DEBUG-<id>]` tag，绝不 log everything。性能先给数值 baseline/profile/query plan
再 bisect，不用海量日志替测量。

当证据指出 earliest actionable cause 且区分有意义的 alternatives，报告 loop/output、
因果链、排除证据、最小 fix seam、correct regression seam 或其缺失、remaining uncertainty。
diagnose-only 到此停止并清理已授权 scratch 中本次 probes；不暗中进入修复。

## Phase 5 — Authorized fix and regression

仅已有 user/parent 明确实现 scope 时继续。correct seam 必须重现实际 call-site pattern；
需要多 caller/链路的 bug 不能以 shallow single-caller test 假锁定。若没有 correct seam，
把架构限制作为 finding 交 owner，不以假测试宣称回归保障。
有 seam 时：最小复现变 regression test → 实际 red → 一个 root-cause fix → 实际 green →
重跑原 unminimised loop → 适度相邻 checks。先修后补假 red 不合法。
在已确认数据边界需要额外保护时读 `references/defense-in-depth.md`；源头修复先成立，
再以独立路径/信任变化证明每层必要性，不堆重复或改变既有 fail-open 等保护语义。
三次修复尝试失败停止并与 owner/user 质疑假设或 architecture，不做第四个盲 patch。

## Phase 6 — Cleanup and evidence

完成前重跑原 loop，regression green 或明确无 seam；查本次所有 `[DEBUG-<id>]` 都已移除，
throwaway prototype 在获批 scratch 清理/明确保留位置，用户原文件保持。说明真正支持的
root cause 与相关证据，授权存在时供 commit/PR 描述使用；本 skill 不自动提交。
debug reference 的历史数字不是本次结果；不可复制为 fresh pass。

## Return to the caller

direct/semantic/internal 使用同一方法。internal 保留 original U-ID、scope、authority/effect
intersection 和 resume_target，返回 evidence/open_questions/blocking dependencies，再由
原 owner 恢复验证。共享 completion 按真实阶段和证据报告；未知即 UNKNOWN，不宣称修好。
来源和保留的 legacy references 见 PROVENANCE.md，LICENSE 与安全脚本保持原样。

<!-- FILE_END: diagnosing-bugs/SKILL.md -->
