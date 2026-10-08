# W12 Context 线程登记定向修复

**DONE_WITH_CONCERNS：代码及离线反例完成，BUILD_ONLY；原生委派、活动终止与完整driver接线仍待验证。**

## 共同目的与边界

保持一个跨 Codex 桌面/CLI、Claude Code CLI 的框架，以任务理解、协作、信息连续性与必要人控衡量净价值。Codex 桌面/CLI优先；不以实现缺口削弱T的原生能力，不分裂平台架构，不扩写领域技能。完整继承本次任务卡零节及原共同合同。W12是新的准备池1次修复；W10历史交付20测试及其单thread限制描述保持原样，不改写成当时已支持。

授权文件：`u007-context-thread-fix-task.md`，以及SHA256 `a73d065a3169231f48e0cac954f109b377f4fa206b748358f72b52103f2dbee6` 的 `u007-interface-addendum-3.md`；均已完整读取（c06c03 / c2c6aa）。原共同合同与接口补充1、2继续生效。工作树仍为 `/Users/luca/.codex/worktrees/9a9a/luca_gstack`，只改原两份模块文件及新增本文；不改driver、conditions、manifest或原W10报告。没有private/hidden/archive读取、网络、模型、额外Agent、提交推送。

## 修复结果

- 新增driver专用同步接口 `registerThread({threadId,parentThreadId})`，不加入候选的四工具定义。根必须显式传null；工具调用不会隐式登记根，模型调用同名工具被拒。
- 初始只允许一个根。登记父必须属于当前已登记家族；支持子孙多层关系，相同ID/parent重复登记幂等且留日志。拒未知parent、第二根、同ID改parent/改根角色、旧家族复活。
- `handleTool` 接受当前登记根及全部后代。子孙读写沿用原阶段、路径、事件确认、失败依赖、撤销及写前像控制；读写账保留实际child threadId/turnId。登记不是任务分工或语义写权限的授权。
- case_checkpoint与case_question仅当前根可调用，所以子线程不能推进阶段、确认事件、请求retry或触发fresh。拒绝保留原child请求和错误，未洗成合规。
- fresh请求后暂停该runtime工具调用；driver停止/等原家族真实终态后调用resumeMessage。恢复时提升family generation并退役全部旧关系，旧根/child/grandchild均被拒；新thread/start产生不同ID并显式登记新根后才可续接。旧失败、原子线程写回执、checkpoint和事件历史不清空。
- snapshot增加 `thread_family`（generation/root/registration_required/完整历史registrations）；登记/拒绝/幂等重复/退役写入原journal。`native_identity_verified_by_runtime=false`，退役记录的实际终止为 `DRIVER_RESPONSIBILITY`，不把ID更换称后台已停止。

这次只修登记与消费边界，不再把比较统一限制为单执行者。条件自身的组织上限/运行时并发能力仍由其合同、实际driver与原生证据约束。

## 必须遵守的driver调用顺序

```text
initial thread/start真实响应 → registerThread(root,null) → turn/start
已登记parent的真实native child证据 → registerThread(child,parent) → 原ID工具/usage/终态
fresh请求 → 旧家族全部活动真实终态 → resumeMessage
→ 新thread/start → registerThread(newRoot,null) → 下一turn
```

initialMessage可在根登记前生成，但此时handleTool拒绝；根必须在turn/start前登记。registerThread成功返回登记记录及idempotent，失败抛带code的错误并写入protocol_errors/journal。driver应保留自己的原始native关系证据，不从模型文本或fixture_worker登记。Context没有读取或修改driver；其离线测试必须使用此真实API，随后集成/J核验，不能依赖无约束stub。补充3的probe/development/hidden释放字段属于主协调/driver职责，本卡不签发或消耗run。

## 实际验证

```text
cwd=/Users/luca/.codex/worktrees/9a9a/luca_gstack
U007_PUBLIC_CASES=/Users/luca/Desktop/luca_gstack/framework-audit/u004-cases/public/developer-cases.json node --test scripts/tri-system-eval/case-protocol.test.mjs
exit=0
# tests 25
# pass 25
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 170.390167
```

完整输出 `5e66b7`。原20项行为保留，测试setup明确登记根，原fresh测试明确登记新根；没有放宽旧的拒绝/权限/历史断言。新加5个有意义测试：

1. 未登记根不能调用工具，候选不能调用registerThread；真driver登记后合法读取成功。
2. 登记child及grandchild合法读写并保留原thread/turn ID，仍拒未来资料和无关输出路径。
3. 伪parent、多根、缺parent字段、换parent/根角色拒绝；相同登记幂等且不增加关系，失败原样留账。
4. child阶段推进、确认、retry、人类问答/fresh请求全部ROOT_CONTROL_ONLY，阶段与pendingFresh不变。
5. 旧根、child及grandchild在fresh后均STALE_THREAD；不能复活，也不能用旧parent登记新child；未登记新根仍拒绝，登记后新根推进/新child读取成功，原exit9失败、child checkpoint写与事件顺序保留。

均是调用公开运行边界并核对实际文件/状态/错误，不是检查实现字符串。无模型、无正式案例run；公开六题检查仍仅验证结构初始化。测试一次运行通过，无隐藏失败重跑。code-hygiene Mode A的当场验证要求继续采用；独立review由主协调收口，不由作者自报PASS。

## 字节身份与历史保护

- `/Users/luca/.codex/worktrees/9a9a/luca_gstack/scripts/tri-system-eval/case-protocol.mjs`：W10 `a461f843521e8e35bf2499680adc8c99aa067011632897779cc5b52168d79046` → W12 `ce9a1b6c40d435a34813538f27deca5468f5a9ee38f35c2a165dd0f9e84a86e8`；31446 bytes，467行。
- `/Users/luca/.codex/worktrees/9a9a/luca_gstack/scripts/tri-system-eval/case-protocol.test.mjs`：W10 `55af0427efecd399cd9fb7fcb36da9dfcde5b4260777f6939441601d75a39d8a` → W12 `b668c47cfb89cf92b820b3c46cc8574b71c555f2565963a10040fa7f33f966af`；30229 bytes，414行。
- W10报告未改：`d17d0076b4139f509cf3ecded1d673fbb0c9d96e22df72321a45d862edf4beef`（bf210c）。

开工两个preimage与W10冻结hash一致；终态status仍只有原两份未跟踪源码（f869f9），无其它仓库改动。主体变更是一个登记表、一个family代际和一个公共方法；阶段/材料/语义撤销协议未重构。新失败面为漏登记、错误native parent传播、旧家族未实际停止；均需driver证据定位，不可归为模型或T能力不足。

## 资源与剩余限制

W12占准备池1次；当次按底层调用统计10次exec_command（含本文写入与最后读回）、3次apply_patch、1次clock，共14动作，functions封装不替代批量中的各操作计数。无新增Agent/真实模型/网络。实际token usage不可观测，记unknown。原生委派、child终态/usage汇总、跨模块接线和fresh前全家族停止仍未验证；同UID并发安全等W10限制继续有效。此报告不宣称U007就绪或净收益已证。

开始UTC `2026-10-02T18:02:08Z`，冻结UTC `2026-10-02T18:05:09.037284+00:00`，至报告冻结 181.0秒，预算45分钟/90动作内。主协调主动收集本报告及新hash；不跨chat自行发送。

<!-- FILE_END: u007-context-thread-fix-report.md -->
