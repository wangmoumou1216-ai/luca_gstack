# W42 路由模块候选交付（继承 W39，含 J15/J17 修复）

**DONE_WITH_CONCERNS**。模块内已知实现、消费者闭环及直接回归完成；J15 已指出的阻断已修复。root 已冻结/集成 r3，J17 已确认 F1 窄动作 owner 入口在根/kernel 闭合；UNKNOWN 新 delta 的独立复核与真实模型/联合验收仍由 root 继续，未生产采用。

工作树：`/Users/luca/.codex/worktrees/8812/luca_gstack`；HEAD：`05120197073144c0f46b6fb30a192733d529cc4f`。原消耗和失败沿用，最新用户撤销普通开发时长、动作和报告长度停点。

## 最终改变与覆盖

1. 显式选中且适用的方法直接读 authority 至 EOF；真实发现/选择未决仍读 catalog，命名准确 skill/authority，并保留真人选择。入口、manifest、kernel、生成索引一致。
2. 有界无关任务跳过其他 startup。J15 反例“当前页是什么”原先会漏掉 luca-app：现 K2 在 app/content 引用或工具动作前调用 K10 step 3，语义发现 owner、按 load_before 读完；无需恢复记忆/CONTEXT/Workflow 全启动。luca-app 保留回答引用前的时点，并关联 K2；索引已从现有生成器重新生成。
3. STOP 提示通过既有 actualHarness() 显式区分 Codex、Claude、UNKNOWN：前两者引用各自 K2/K4；UNKNOWN 不指派根文件，明确当前宿主入口未确定，先确认适用入口，并保留 STOP/Plan/真人门。既有 CLI adapter 和 host-launch adapter 均明确声明 Codex 身份，未新增宿主适配层。
4. resolver 可按词给出多余候选，但没有真实加载冲突：在 scripts/.codex/.claude/根入口/CONTEXT 中，只有其直接测试调用它；根/index 明确要求语义判条件。代码保持 HEAD 字节；已有测试增加“当前页是什么”的 owner 可达性。没有另造分类器或输出协议。
5. K1/K3/K5—K9、Static Fallback、Claude 根及 R9 原件逐字/哈希保护；未改领域技能、global、framework/ 或 source 生产。AGENTS 为 **11242 bytes**，11 KiB 门未放宽。

共同用途覆盖：简单有界任务、框架维护、App 工作、设计 Workflow、工程 Workflow、需求到落地/长链更正均有保留或修复路径，逐项在包内 requirements/common_use_coverage。原 14 用途行为分母不减少；本轮程序回归不冒充 14 个真实任务通过。

## 实际验证

- `node scripts/test-agent-context.mjs`：exit 0，**120/120** mutations，58.416 秒；保留原 107 项，含投影回滚及 staged-index/merge 门。新增回归拒绝 coherent manifest/index 政策倒退、owner 不可达/晚加载、K2/K10/kernel 冲突。
- `node scripts/test-route-guard.mjs`：在隔离文件/项目/记忆 fixture 完整执行，exit 0，**PASS=257 FAIL=0**，26.379 秒（J17 最终回归；r3 原 255/0 日志保留）。包含 Codex/Claude 各三类及清空识别字段的两条 UNKNOWN 实际 STOP 提示、Plan 提醒、真人选择及原有中性项目事件、alias/义务/损坏状态/取消/终态测试。
- `python3 scripts/build-agent-context.py check`、`node scripts/check-agent-context.mjs`、`node scripts/test-agent-context-resolution.mjs`、限定九文件 `git diff --check`：均 exit 0。
- 红灯与失败未删：原 STOP 错宿主、J15 owner-discovery 删除 mutant 旧 checker 误通过；隔离 fixture 缺少静态依赖与首个不适用的 STOP 测试输入均按实际源码修正，旧输出保留；此前 W39 RED/报告长度失败也保留。

这些是字节、结构和程序输出证据。UNKNOWN 的实际未删节 stdout 另存 `j17/unknown-outputs.json`，显示无 AGENTS/CLAUDE 指派且 Plan 五条件提醒仍在。没有启动模型、能力探针或真实 app/SessionStart 操作；不声称模型实际加载、效率收益、所有门的端到端成立或全部跨端一致。

## 精确最终候选

九个修改文件必须按同一候选收件；三份共享元数据已在 W39 采用 root 字节，此轮因 J15 有进一步授权变更。resolver、session-restore、luca-app runtime 为已核查且未改文件。

| 文件 | SHA-256 |
|---|---|
| `AGENTS.md` | `86581149518b00445a8e4abc5e3bb701b5b2f88d19a97379054cdbe59c6a1d1f` |
| `.claude/skill-os/agent-context-manifest.json` | `16f0d4aad8ca4dfabc278094db90a2e57b1b8b716a185ec7b50ac01995d586eb` |
| `.claude/skill-os/agent-root-kernel.json` | `ef213983722c200cc0ba968b43d832e11016fbd85d4414b5ed4fb8714fef5760` |
| `.claude/skill-os/generated/context-index.md` | `2b3f24a246f9730db5f14c5655eccc610ecaec33906da3464dff2824f758caee` |
| `scripts/check-agent-context.mjs` | `80de955c256440a7fe165d665b4f5b833be015afdb1b5a3f4866136063545a97` |
| `scripts/test-agent-context.mjs` | `5610e8613b0fda90042ab78b4f29bf4231605f19ad34fdde3a3d52fa2b894bdd` |
| `.claude/hooks/route-guard.mjs` | `1da1fb9097d72415a300475b8514205bd597404313c9a64678397afb68f9ee7a` |
| `scripts/test-route-guard.mjs` | `a7f695c06c1048ca44e411ad7b599b1a98f1a5516f88c24f77d88ae41c35c144` |
| `scripts/test-agent-context-resolution.mjs` | `5b7478e73ba0fcf35bc4dc7cc6554a90146229c7ff6f23779704c50768568cf5` |

r3 基线完整 diff SHA-256（本轮按两文件 delta 收取）：`78c98f25e89370bd52626fd3afa0107dbd4a3aaec1d7b25a85bb07f46a811f20`。

完整包：[review-package.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/review-package.json)；包 SHA-256：`c29eec31c682043b122ea8b5ca2b517e028bcef6ccf7e8c2d33791cd85c41b6e`。
同目录 `final/` 是冻结候选；`module-final.patch` 是相对共同 HEAD 的精确 diff；`before/`、`before-j15/` 保留前像；每个命令的 argv/cwd/exit/stdout/stderr 与覆盖/原失败索引均在包中。

## 真正剩余依赖

- root/独立 reviewer：对最终九文件及 J15 修复做非作者复核；完整 J15 票未在此模块到达，后续具体 findings 仍由原 owner 定向修复。
- root/统一行为验收：绑定这些最终 hash 执行原用途 ledger、真实 Human/Project/Plan 门、必要正常/失败恢复与未完结果不消费；本模块禁止另起模型 run。
- session-restore.mjs:427—438 仍自动注入记忆摘要，失败仍走 Static Fallback。该机制在请求路由前运行；它不是重复 catalog/全量手动 startup 的消费冲突，不能从 K2 精简推出其已被取消。如要取消成本，应由 root 的 memory owner 另作用途判断。

资源：原 W39 起点 1790987723.074684，累计至本次交付 156 保守工具动作；实际 turn/token usage unknown。0 新 Agent、0 模型 run、0 能力探针；无 commit/push。

## J17 精确增量（root r3 之后）

只修改 `.claude/hooks/route-guard.mjs` 与 `scripts/test-route-guard.mjs`。现有 harness helper、其余七个候选文件、resolver/SessionStart 均保持 r3 字节。未知宿主环境用子进程局部 env 清空识别字段，未改 global/HOME/CODEX_HOME 配置。

收件包：[/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/j17/review-package.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/j17/review-package.json)，SHA-256：`39f972e82443c6c1a6bc27eead692d43f336e1f1088ca1930f0a46d159350c6d`。

相对 r3 的 `delta.patch` SHA-256：`ec34fa3bff9930c841255658ced4c97984d6fac6dc33a85be138a2e4a96eed48`；`git apply --reverse --check` 与两文件 `diff --check` 均 exit 0。该包列两个精确前像/最终 hash 和全九文件最终快照，RED/257项 GREEN/UNKNOWN原始输出齐全；120项 context 回归绑定的文件未再变化，按 root 要求未重复已通过测试。

J17 给出的具体 finding 已修复；等待 root 对该 delta 的非作者接受结论及统一行为验收，不以脚本 PASS 代整体用途通过。

## F4 两文件与 257 项原生程序证据的对应

root 收取的 route-guard SHA `1da1fb9097d72415a300475b8514205bd597404313c9a64678397afb68f9ee7a` 与 test SHA `a7f695c06c1048ca44e411ad7b599b1a98f1a5516f88c24f77d88ae41c35c144`，均与本次执行 fixture 中对应文件及冻结 final/ 字节一致。测试时已复制同一候选，后续未改这些 fixture 文件；本次只补报告追溯，不重跑已通过测试。

实际 argv：`node scripts/test-route-guard.mjs`；cwd：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/regression-sandbox`；exit **0**；26.379 秒；原始末行 **PASS=257 FAIL=0**。

- [命令/cwd/exit记录](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/j17/unknown-green.json)
- [未删节 stdout](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/j17/unknown-green.stdout)
- [原始 stderr](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/j17/unknown-green.stderr)
- [UNKNOWN 两条实际输出](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/j17/unknown-outputs.json)

此处“原生程序证据”指已有 Node 测试直接启动实际 hook 的记录，不是模型、真实宿主 launch 或正式能力探针。责任继续至 root 的 J18 独立复核返修及联合验收；报告不宣称模块完成。
