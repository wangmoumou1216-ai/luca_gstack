# Rule Execution Closure — Round 1 Red Team

日期：2026-08-11  
被审对象：`2026-08-11-rule-execution-repair-plan.md`  
冻结 SHA-256：`6690c1251ad3fd844a3b4c8511dedad04f3372c16f530a48c75a109bb40229cb`  
裁决：**REFUTE**

本文件只保留攻击问题与“成立时的影响”，不提供修复方案。三条攻击线相互独立；任一 BLOCKER
成立即使旧 SHA 失效。

## A. 路由、纠错与项目状态

1. 为什么 correction receipt 要求 observation、candidate、fixture 三者齐全，而 L1/L2、非路由 L3/L4
   按现行归因协议并不产生这些全部实体？如果成立，合法纠正会永久阻塞或被迫制造假证据。
2. pending 自报实体 ID 和校验命令，再由同一仓库脚本据此签发 receipt，如何避免循环自证？如果成立，
   marker 假闭环只是升级成 JSON 假闭环。
3. receipt 未绑定 correction event、session、prompt hash、nonce、证据时间边界与一次性消费，如何拒绝旧
   receipt 重放？如果成立，一次纠正可以替任意后续纠正解锁。
4. 无 pin 的普通 Read/Grep/Glob 仍可穿共享项目软链，为什么 DEV-103 只改 session restore 与 route guard？
   如果成立，启动注入虽干净，后续工具读取仍跨 session 污染。
5. PreToolUse 在项目命令真正执行前写 pin，而 DEV-103 未覆盖该 guard 与项目脚本，如何保证失败切换不留新 pin？
   如果成立，计划的 switch transaction 无法落到真实强制点。
6. 同一轮在 route 时读到 pin=A、工具时读到 pin=B，计划用什么 turn-level 不变量阻止 A→B TOCTOU？
   如果成立，单 hook 正确但组合行为仍会写错项目。
7. “审计 muse 项目的 hook”同时包含 meta 与具名项目时谁优先？如果成立，meta-first 会绕过项目绑定，
   project-first 又会复发本次误截。
8. 项目目录在 validate 后被替换为 symlink 或新 inode 时，绝对路径本身如何证明身份稳定？如果成立，
   pin 文本没变但实际对象已换。

## B. Obligation、治理与 Git

1. “每条关键规则”由谁定义，怎样从现存 MUST/红线反向证明没有漏登记？如果成立，注册表可内部全绿却
   完全遗漏最危险的规则。
2. schema 没有 receipt 与 machine-critical 字段，checker 却依赖这些分类，如何避免通过不声明字段逃逸？
   如果成立，多数义务无需回执即可 PASS。
3. executor 文件存在，如何证明它在真实 hook matcher、Codex trust state 和当前 harness 中可达？如果成立，
   静态存在继续被误报成运行时执行。
4. mutation test 的生产入口、mutant 集、kill matrix 与独立验证者在哪里冻结？如果成立，mutation 仍可只咬
   测试 fixture 或 anchor 文本。
5. `degradation` 为什么不能成为 machine-critical 规则跳过双端执行的万能出口？如果成立，核心安全行为可被
   一句 degraded 静默删除。
6. 稳定记忆 direct-write 红线为什么没有对应执行任务？如果成立，字段合法的直接写入仍能绕过
   candidate→review→promote。
7. 现有 sync 脚本会 stage 稳定记忆、跳过完整 verify 并推送，为什么 Git policy 没覆盖它？如果成立，旧可执行
   策略会绕过新散文策略。
8. 路径 allowlist 如何区分同一文件中的用户 WIP 与本任务 hunk？如果成立，精确 path staging 仍会提交用户工作。
9. 当前分支已经 ahead 1，push 如何限制只发布获批 commit set？如果成立，新 commit 的精确性不能约束远端实际变化。
10. “例行 push 不重进 Plan”和“任何改变远端都要人工门”如何同时成立？如果成立，执行者必须自行裁决授权。
11. 当前没有 origin，receipt 又没绑定 remote URL/refspec/before/after SHA，push 到底证明了什么？如果成立，可能推错
    remote、错 ref 或只记录了命令自报。
12. unsafe resolver 在 E3 要隔离，却要等 E4 的 G-CONTAIN，哪一个优先？如果成立，要么越权，要么安全洞在
    阶段 PASS 时仍开放。

## C. Cycle 2、跨 harness 与最终握手

1. 旧计划声称接续 Cycle 2，却遗漏 G-PACKAGE 和合法执行入口，怎样证明 E4 可复现？如果成立，E4 起点不存在。
2. G-PLAN 没绑定 plan SHA、proposal SHA、nonce、expiry、session 与新的顶层 user turn，怎样拒绝模糊确认和旧批准？
   如果成立，人工门可重放或冒认。
3. 17 条断言如何覆盖 Cycle 2 的 package identity、patch body、native trace、secret scan、共享真身、DEFER、
   321/2,568 与 live read-back？如果成立，T4 只是空标签。
4. 角色文件存在和删除负例，如何证明两端真的产生了 plan/work/oracle/quality-gate native child edge？如果成立，
   TOML/Markdown 仍能冒充 parity。
5. 哪些差异是真正 native-impossible，哪些只是 missing-wiring；依据、禁止降级项和验证面在哪里？如果成立，
   未接线能力可被错误包装成平台限制。
6. correction/completion receipt 与 Cycle 2 native receipt 的信任域、schema 和验证关系是什么？如果成立，
   两套回执会互相绕过。

## Round 1 终局

三条攻击线均为 `REFUTE`。旧 SHA 永久降为 source-only，不允许通过局部补丁恢复其握手资格；任何新计划
必须重新冻结 SHA，并由未参与编写的冷上下文判官重新裁决。

<!-- FILE_END: ROUND-1-REDTEAM.md -->
