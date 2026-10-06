# U012 — 三模块实施收件、迁移边界与剩余责任

三包已经在原三个会话完成本轮候选实现、测试、审查返修并收取到集成工作树；本文件将真实实现、接口与剩余义务汇合，不另起规划。最终源文件身份见 `u012-final-candidate-manifest.json`，共同基线 `05120197073144c0f46b6fb30a192733d529cc4f`。当前为已交付的隔离候选：统一commit `cd0cff15c9b00701e5d9dfdc69fee0fe7c121fd3`，正常push至 `origin/codex/tri-system-evaluation`，远端SHA核对一致；没有生产切换或旧状态批量迁移。

原三个会话持续负责实现—本地测试—审查缺陷修复—联合验收响应。root 收到具体缺陷直接续派；报告/计划/单轮结束不解除责任。无独立待办时等真实联合依赖，不制造空 ACK 或无必要代码。普通开发的人为分钟/动作/字数停点已取消，平台硬限制和真实缺权/依赖失败仍保留。

## 1. 三个独占实施包

### 模块一：制定模块一计划

会话 `01a0fcca-4899-79f3-9094-c9a9ea2bd186`，工作树 `/Users/luca/.codex/worktrees/8812/luca_gstack`。

目标：明确适用方法直接读权威正文；有界任务跳过无关启动；相关动作前仍发现并消费必要 owner；STOP 不错指宿主。

独占文件：`AGENTS.md`、`.claude/skill-os/agent-context-manifest.json`、`.claude/skill-os/agent-root-kernel.json`、`.claude/skill-os/generated/context-index.md`、`.claude/hooks/route-guard.mjs`、`scripts/check-agent-context.mjs`、`scripts/test-agent-context.mjs`、`scripts/test-agent-context-resolution.mjs`、`scripts/test-route-guard.mjs`。正常提交门发现的关联旧锚点修复另由本包独占 `.claude/skill-os/capability-parity.json`，仅同步一条实际提示片段；其余清单值、运行时及既有semantic parity测试不变。

保五个 Plan 真触发、Project Gate、Human Gate、原权限/记忆/领域方法。正常输入是用户请求及已核宿主；输出仍是既有提示与规则消费，不增加协议。未知宿主不能当 Claude；索引失效沿原 manifest 回退。

已交：九文件、120/120 context 回归、257/0 hook 回归、生成/一致性/resolution 检查；J18 静态接缝通过。J20验收E/F/G通过，H首答时点FAIL；原owner W47已确认无必要源码修复，未重跑或抹掉失败。W48另修正常提交门S18/S40的同源旧锚点，当前单文件收件见u012-w48-minimal-anchor-collection。任何确切路由 finding 仅回此包；不以未测所有项目场景要求重建路由器。

### 模块二：制定模块2计划

会话 `01a0fcca-6e8c-7833-ba45-f39e6992f11b`，工作树 `/Users/luca/.codex/worktrees/71f8/luca_gstack`。

目标：沿已有授权持续执行，正确收取真实终态，失败阻断受影响依赖，所需产物与验收闭合后才称完成。

独占文件：`.claude/agents/orchestrator.md`、`.claude/agents/work-agent-template.md`、`.claude/skills/office/auto/SKILL.md`。

沿原输入/输出字段保原目标、scope、owner、依赖和验收；不建立新 scheduler。implement 的专用单活跃/确权与模型路由继续有效；待定真人决定不可用默认绕过。项目节点、显式临时会话和合法终端豁免交接分开消费。

已交：三文件及 86 合同/70 shell/84 模拟 runner 的各自证据；J18 静态通过，J19 N-A 与后续恢复链限定通过。真实两个 Agent、取消/失观测、实际项目节点/eval 失败全链未证明；process 样例不得冒充。具体编排或消费 finding 由本包修复，不写 Context 文件。

### 模块三：规划模块三

会话 `01a0fcca-8af9-7982-9d60-b49909a4b577`，工作树 `/Users/luca/.codex/worktrees/9a9a/luca_gstack`。

目标：交接保原目标、最新有效授权、更正、已完成效果、原失败和首个未完点；必需来源不得被总字数帽截断。

独占文件：`.claude/skill-os/runtime/long-session.md`、`.claude/skills/office/handoff/SKILL.md`、`.claude/skills/office/references/handoff-protocol.md`、`.claude/skills/office/SKILL.md`。

沿既有交接格式与 exact references，不新增状态 schema。OS 临时会话交接不自动造项目状态或消息授权；NO_PIN 不访问项目别名。required 输入分批完整消费；实际容量/权限不足保缺口并暂停对应依赖。

已交：四文件、原始检查与失败历史；J18 静态通过；J19 N-D 数据完整处理、N-B/C 不重复已完成效果并依最新事件恢复通过。真实 compact、旧在途迁移与旧路径回退未证。Context finding 回此包，不能用新增格式或缩减用途掩盖缺证。

## 2. 共享接口与集成责任

root 唯一维护集成分支、共同清单、审查账、评估公共接口和统一提交。三模块不互写；发生接口变化先明确唯一 owner，再只复验受影响消费者。28 文件分母含早期 R9 的 11 个评估工具文件，R9 最后 44/44 集成回归和原失败保留，不因 U012 文稿修复重新运行。

路由交已确认约束/权限/选择/缺口给编排；编排按真实依赖消费，失败不合并；Context 传 exact source/version、当前授权和状态。共同规则是不扩权、不丢 required、不将引用/hash/idle/ACK当已读/成功。没有修改项目、领域 schema 或生产工作流状态。

## 3. 风险组、进入条件、停止和回退

|风险组|允许变化与已有验证|进入与退出旧路径条件|触发停止/回退及实际证据边界|
|---|---|---|---|
|入口及生成投影|九文件作为一致合同更新；程序/静态检查通过，限定消费J20为3/4，H时点FAIL保留|只有最终字节一致、必要消费者通过才可审候选发布；自动宿主加载未证明，生产旧入口保留|漏 owner/误选/错误宿主即停受影响采用；恢复该组精确前像并匹配生成 index。局部 reverse apply check 不是生产回退实测。|
|授权续行、依赖终态、完成条件|三编排文件统一，J19 process/失败/交接链通过|真实 Agent/项目/eval 路径若纳入替换必须有对应证据；当前不建议这类生产切换|缺 required/无法观察终态/旧 DONE缺验收则不合并；保原句柄及失败，不能重复副作用。未测真实失对象/取消/旧运行回退。|
|会话恢复与更正|四Context文件，N-A/B/C真实跨chat消费当前状态|N链是当前规则受控任务，不是旧在途迁移；无可信旧在途试件，因此兼容性未知并保留旧生产路径|权限不明、来源不符、效果无法核实则暂停对应依赖；不得从旧标题盲重做。恢复规则正文不等于恢复真实在途状态，当前无迁移通过票。|
|必需输入及交接消费者|单批建议不删required；完整三源复算，静态接缝闭合|完整workflow/上游/容量回退采用仍需同版本实际证据，当前不退出旧路径|漏源、错版本、gate失效则不消费；保exact上游与失败，不补造项目handoff。未将CSV字节当模型压力。|
|其余用途及领域交付|U011全部14用途有保留去向，原领域方法不改|无替换建议，不迁项目/记忆/领域状态|此处没有新路径可宣布兼容；保持旧owner与既有必要验证，不为凑测试重跑未改变领域。|

生产当前保持原版，是基于比较和迁移欠证的保留决定；并非宣称“所有迁移 N/A”或三包为空。开发候选已经存在，可以保存供审；改变职责/交接/恢复语义的生产采用仍受 G-P6 限制。没有可信旧状态样本的范围不得杜撰冻结样本或把新造 fixture 叫旧状态。现有 8 次预留已分配 N-A—H，不能挪名继续试验。

## 4. root 最终交付与未来采用条件

J20路由与独立反证已收取；H finding由原owner W47处置，保留执行时点FAIL。W48关联锚点经J21核准，正常全量提交检查114通过/0失败；U010非作者最终PASS 5/5。root已执行获准的普通非force push并核对远端、tracking及本地SHA一致，28文件全部对应已审版本，工作树clean。原三模块当前没有本轮未完成的具体源码finding或测试/review任务，不因已完成而制造新轮次。原生产17条既有路径与基线一致。

正式净价值比较、生产迁移与旧状态回退如实保留为未证，构成未来生产采用的进入条件；本轮选择保留旧生产路径，依据原计划允许的受限出口完成候选交付，不能把提交成功说成这些能力已验证。原始失败和未知不删除。无需用户巡视、搬运材料或批准普通返修。
