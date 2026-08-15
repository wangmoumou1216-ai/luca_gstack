/goal 在 `/Users/luca/Desktop/项目/muse/lucagstack` 完整执行 mattpocock/skills 自进化 Cycle 2，严格以最终交接包为唯一实施依据，直到 fresh Claude/Codex 复验后的 `EVOLUTION_VERIFIED`；不要重新研究、不要另写方案、不要再开红队或 judge，也不要把预演或局部 PASS 冒充完成。

【任务身份】这是 luca_gstack 框架/meta 任务，不是 muse 产品任务；产物留在 framework-audit 或 Plan 指定的框架路径，不写活动项目 docs。canonical repo 是 `/Users/luca/Desktop/项目/muse/lucagstack`；`/Users/luca/Desktop/luca_gstack` 是 stale read-only reference，绝不自动对齐、pull 或写入。

【唯一权威】主 Plan：`/Users/luca/Desktop/项目/muse/lucagstack/framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md`。同目录 `FINAL-HANDOFF.md`、`final-execution-manifest.json`、`defer-promotion-register.json` 是 handoff/机器真值；`candidate-handshake-plan.md` 和历史红队只作证据，冲突时不得覆盖 Final Plan。

【启动与阅读】
1. 先创建/保持这个 goal 为 active；不要把读取文档当作完成。
2. 完整读取 repo `AGENTS.md`、`CLAUDE.md` 和其中 mandatory startup context。
3. 完整读取同目录 `FINAL-HANDOFF.md`、`FINAL-EXECUTION-PLAN.md`、`final-execution-manifest.json`、`defer-promotion-register.json`，再严格按 manifest 的 `read_order` 读取其余证据。读有 FILE_END 的文件必须到末行；不要 bulk-read 与当前任务无关的 skills。
4. 第一条任务检查命令必须是：`node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/verify-final-handoff.mjs`。没有零退出和唯一 token `FINAL_HANDOFF_GATE_PASS`，不得实施。

【执行方法】
1. 先把 Final Plan 的 E0–E7、DEV-001..012、TST-001..012 和 ASSERT-001..018 原样登记为当前执行计划；不要重新解释成另一套工作包。
2. 立即执行 E0 的只读 preflight。只有 handoff gate PASS 才进入 DEV-001；每个 DEV 完成后，必须由没有编写该变更的独立验证上下文执行对应 TST，记录 assertion receipt 后才能进入下一依赖节点。
3. 严格按 E0→E7 和 Plan DAG 推进。能并行的仅限 Plan 明确无共享文件 ownership 的分支；shared file 必须按任务卡顺序交接。
4. 到 `G-PACKAGE`、`G-CONTAIN`、`G-ACTIVATE` 时，按 Final Plan 展示 exact allowlist/hash/target/rollback payload，然后停下等待我的新顶层明确批准；agent、子 agent、旧消息或模糊“继续”不得代批。获批只授权该 gate 的 exact payload，drift 后重新提案。
5. 当前用户 dirty/untracked 全部受保护。G-PACKAGE 只按 `final-source-bundle.sha256` 列出的 exact paths 加该 bundle 文件本身进行 stage；禁止 `git add .`、目录级广泛 stage、`git reset --hard`、`git clean`、自动 stash、自动 push。
6. 全局 skills 激活必须等 G-ACTIVATE，按 Plan 的 CAS + backup + atomic rename + read-back 执行；resolver 的危险旧真身在 G-CONTAIN 后只能进入不可发现备份，不能因 candidate 失败重新开放。

【不可漂移的裁决】HEAD 74 必须保持 `ADAPT 10 / KEEP 18 / DEFER 19 / REJECT 27 / QUARANTINE 0`，验收分母必须是 321/321、2,568/2,568。19 个 DEFER 当前晋升为 0：P1 questionnaire(8)、P2 logic-prototype(10)、P3 TDD→codebase-design pointer(1)。本次只把它们接入现有 `gaps-register → scout → FUSION` 的优先级/重访消费者；不得提前创建这三个 skills、routes、input modes 或 workflow nodes，不得自动改变 status。debug/TDD/codebase/resolver 不新增 workflow 节点；teach 保持 Claude 用户显式调用、无 Codex/project route。

【汇报与终态】除 commentary 中不超过 60 秒一次的简短进展外，只在到达人类门、出现真实 blocker 或最终完成时请求我处理。任一 BLOCKING assertion 失败立即停在当前节点；同一问题三次失败按仓库合同报告 `BLOCKED`，不得弱化门禁。只有 E0–E7、全部 DEV/TST/ASSERT、GATE、live cutover、adoption/pin/benchmark 记录和 fresh Claude/Codex 复验全部通过后，才能把 goal 标记 complete 并报告唯一终态 `EVOLUTION_VERIFIED`。

现在开始：读取权威文档，运行 final handoff gate，然后执行 E0；不要先给我另一份计划。

<!-- FILE_END: NEXT-SESSION-PROMPT.md -->
