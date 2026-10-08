# 三模块改造：已验证路由修复的正式采用

状态：DONE_WITH_CONCERNS——本次有限修复已采用、发布、同步并验收；整体三模块改造仍未完成。远端六项 CI job 全部成功。

## 本次可证明的价值

路由仍负责判断请求应该交给谁、何时规划、何时需要用户决定。本次保留这些用途，只修正 STOP 提示引用错误宿主规则的问题：Codex 应指向 AGENTS.md K2/K4，Claude 指向 CLAUDE.md K2/K4；宿主不明时先确认入口，不擅自选择或获得执行权。

28 次旧新版显式入口调用中，旧版 8 条规则指向错误，新版对应输出全部纠正；Claude 原有正确输出保持。实际公共 Codex wrapper 链也包含在调用证据中。新增 8 条回归断言让旧实现失败、修复后通过；完整路由测试 257/257，语义路由 31/31。这里只证明显式入口输出正确，不代表自动 hook 派发、全任务提速、成本下降或完整跨宿主模型一致性。

原基线 05120197073144c0f46b6fb30a192733d529cc4f。功能修复只有 route-guard.mjs、test-route-guard.mjs 和 capability-parity.json 三个文件，+66/-7；其中54行是回归测试。随后远端 CI 暴露既有工具依赖缺失，另补 .github/workflows/ci.yml 的 ripgrep 安装及可用性检查；最终共四文件 +70/-9。未改路由选档算法，未减少agent分工、Plan、人类门禁或上下文职责。精确范围见 u014-route-release-manifest.json。

## 编排与上下文成果如何处理

原三个模块会话都交付了最小补丁。编排补丁消除已有批准后再询问的合同冲突，并区别等待超时与任务实际失败；上下文补丁保留当前用户已采纳/否决的决定。这些具有可解释的规则一致性价值，但本次登记的行为采用标准要求实际旧失败、新通过。

Codex F01/F02 在相同七个合成决策案例上均语义正确，因此没有观察到这两部分的行为提升。分别用时163.402秒、162.540秒，观测35432、35663 tokens；两次均含连接重试，不能将这点时差当性能收益。Claude F03因本机OAuth过期且刷新失败退出，未取得模型判断；同凭据F04未启动。其缺口保持未验证。原P09/P10资格失败及原整包采用失败记录不修改。

独立评审要求保留冻结标准，root接受：本次不发布这三份prose，不用静态文字修正替换行为改善，也不将局部发布称为整体升级完成。最小patch已持久保存为 u014-preserved-orchestration-minimum.patch、u014-preserved-context-decision-state.patch、u014-preserved-context-required-sources.patch；原17文件完整候选仍在 codex/tri-system-evaluation 的cd0cff15提交中。评估工具修复另存 u014-evaluation-tool-fixes.patch。没有推倒重来或覆盖这些成果。

## 发布闭环

- 最终正常 pre-commit 完整检查：114 PASS、0 FAIL、0 WARN、1 DELEGATED，exit 0；见 u014-route-release-commit-gate.log。旧六文件候选的中止检查不作通过证据。
- J32：非作者最终 C1–C5 全部 PASS（5/5），包括实际发布后读回。确切原文与机器票见 u014-minimal-release-final-review.md / u014-minimal-release-final-envelope.json；非盲审，复用非作者上下文。
- remote main、本地 Desktop 主仓 HEAD、验收 worktree 均为 `95d463c17e1a39a2e5d26c4bc18c5e69f330546c`；正常非强制推送、本地 fetch + merge --ff-only 成功。
- 主仓原有三份 dirty 日志 hash 全部不变；无关未跟踪文件未清除、未暂存。验收 worktree 干净。
- 推送时服务器接受更新并报告 Required Checks 尚待运行；没有使用 bypass/force 参数。首次远端 CI 因 assertion-exit 测试缺 python3/rg 前提失败；workflow 已设置 Python、遗漏 ripgrep。补齐依赖后，本地补充提交仍走正常完整门，114 PASS/0 FAIL/0 WARN/1 DELEGATED；相关测试单独70/70通过。首次失败保留于 u014-route-first-ci-failure.json 和失败日志。新的远端 [CI](https://github.com/wangmoumou1216-ai/luca_gstack/actions/runs/37112632596) 已 completed/success，六个 job（包括 Validate Framework Logic 和 Required Checks）全部成功，headSha 与发布提交一致。

这次采用的结论是一个实证支持的兼容性修复。整体三模块改造的净质量、效率、上下文恢复及原生能力提升仍未证明；不能据此宣布大计划完成。

最终发布提交：[95d463c](https://github.com/wangmoumou1216-ai/luca_gstack/commit/95d463c17e1a39a2e5d26c4bc18c5e69f330546c)。收尾时间：2026-10-03T09:35:49.057384+00:00。
