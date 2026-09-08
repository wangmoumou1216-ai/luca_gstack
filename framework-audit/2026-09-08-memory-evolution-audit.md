# Memory WIP Phase 1 独立价值审计

结论：现有 WIP 有实质价值，应保留整合；当前不能按“内容闭环已恢复”或“可原样提交”验收。

Scope：NO_PIN。冻结对象 /private/tmp/luca-memory-evolution-baseline/worktree.patch + manifest.json，含 scripts/test-sync.mjs。八个核心文件重算 SHA-256 全部符合冻结 manifest。未改仓库、未写真实 candidate/项目数据、未真实提交或外网发布；Git 复现仅在临时 checkout + 本地 bare remote。未审 office/agent-context v26。此为 Phase 1 定向调查，不替代 Phase 4 双轴终验，不声称双 harness live parity。

已加载适用 framework/project-session/extraction/attribution/memory/review/cross-harness/plan 合同。目录匹配的审查资产是 code-review（权威 .claude/skills/office/code-review/SKILL.md）；本次按已批准 Phase 1 调查指令执行，未另行调用 skill。

## 批次价值

| 批次 | 应保留 | 未完整/危险 | 处理 |
|---|---|---|---|
| session-sync/restore pending | 中性 locator 包含 session/time/project/harness/transcript；marker 不再删 active；老证据不再 TTL 删除；每次一项 LRU | marker 增量仍不触发软捕获；orphan claim lock 可永久静默停止消费者；locator 不等于跨项目读取授权 | 补生命周期恢复后整合 |
| pending disposition/health | 先 fsync 裁决后归档，source SHA+原 bytes，UNRESOLVED 保留 active | rename 后事件失败无法重试；claim 时间刷新可掩盖真实零裁决；QUALIFIED 自由文本不证明内容落地 | 保留 manifest，补幂等恢复，拆分展示/裁决/落地证据 |
| semantic ID 写入 | 两 checkout 共享 flock；candidate/archive/promoted/review 全域占号；分配+append 同锁且 fsync；两晋升入口受控 | 一个旧碰撞阻断所有新 fact 和无关 reject/archive；没有精确冲突处置动词；本机锁不覆盖未知第三检出/多设备 | 保留 ID 不复用和锁，补可审计处置与局部可用性 |
| sync upstream + 两账本 | upstream 替代硬编码；reviews/retrieval 纳入 stage、提醒、README；slash branch 测试有用 | push 没指 HEAD，真实 Git 可成功假报；既有 index 无关 WIP 被发布 | 必须修复再提交 |
| 测试 | 并发 ID、锁失败、碰撞拒写、pending 前事件/rename 失败、claim RMW、push hardcode mutation | fake Git 证明不了 ref 更新；普通 finally 证明不了进程死亡；漏 rename 成功后的失败；未证明真实内容消费 | 保留，并补下列运行时分区 |

## 缺口与证据

**F1/P1 — 项目检索在过滤前读遍所有项目。** search_memory.py:397-419 只用权威 MEMORY_ROOT 启用项目层；:477-497 遍历全部项目 Markdown 并实际读取；:536-544 先 load_layer 再 passes_filters。临时 store 中检索 project=alpha，结果仅 alpha，但 Path.read_text 记录 alpha、beta 两份文件均被读；不传 project 时两项目均返回。MEMORY_PROJECTS_DIR 只是替代真实资产位置，运行的是生产 loader/filter。生产权威 store 默认启用同路径。旧缺口，非本 WIP 新增。修复须在打开文件前限定 session pin/grant 可读集合，NO_PIN 不默认枚举项目内容。

**F2/P1 — append_episode 默认项目归属仍来自共享展示 alias。** append_episode.py:96-119 的 active_project() 用共享软链推导；:131-136 未传 project 且无 meta 时调用，不读 session pin、不核当前 turn。session-sync.mjs:144-147 无 pin 提示“不带 --project”，正好激活旧 fallback；:280 手动提示同样不带 meta/project。MEMORY_ROOT 可能又指另一 checkout，使归属错位更严重。--meta 只是人工逃生阀。该项静态证据确定；临时 alias 复现被 PreToolUse 保守拦截，本审计未绕过，故不算 runtime 票据。旧缺口，非 WIP 新增。

**F3/P1 — sync 成功返回但没有发布新提交。** scripts/sync.sh:17-22 解析 upstream，:46 的 push 使用 tracking branch 作为单个 ref 参数；Git 由此推本地同名分支，不自动推当前 HEAD。真实临时 repo：memory-fix 跟踪 origin/main，保留旧 local main。脚本在 memory-fix 创建 07827c48100d16d945b16a922fdfc0ee70a989fa，exit 0 并称已同步；remote main 仍是 9ae78f85e0b6c63dc2463de0aa03b92dc34838e3，stderr Everything up-to-date。须明确 HEAD→已验证 upstream ref，并验远端 SHA。test-sync.mjs 用 fake git，只验证命令字符串，漏掉真实 ref 语义。

**F4/P1 — sync 吸入已暂存无关 WIP。** scripts/sync.sh:40-46 检查整个 index 后普通 commit，无隔离。临时真实 Git：预先 stage unrelated.txt，再让 retrieval-log 变脏，脚本成功 commit+push 两文件。这是继承风险，但违反脚本“只同步状态”承诺与计划 C5。应拒绝非目标已 staged 字节或隔离聚焦提交；不能 discard 用户 index。

**F5/P1 — 默认 Stop marker 增量重捕获无效。** session-sync.mjs:188-219 算 rearm 并刷新 marker，:224 只有 force 模式利用 rearm，:260-271 默认模式 alreadyExtracted 直接 exit。真实临时 hook：marker 1 1，edit21/tool61，FORCE=0/REARM=1；exit0，marker变21 61，没有新 pending，却称经验已沉淀。若前一 pending 已归档，新增大量工作没有入口；若仍存在，旧 pending 也没有增量边界。须让软模式 rearm 产生可追踪新增裁决窗口。不能用计数刷新证明新内容消费。既有逻辑与 WIP 的组合缺口。

**F6/P1-P2 — orphan claim lock 永久静默卡住消费者。** session-restore.mjs:349-374 wx 排它锁，EEXIST 只超时不核 owner liveness；:495 空 catch。finally 只能覆盖正常抛错，不保证 SIGKILL。临时 fixture 放 pid99999999/2020年 acquired_at 的遗留锁，5ms timeout；连续两次 startup 均 exit0、无 pending advisory、无 lock warning、无 claim。active evidence 未丢，但消费者停摆。PENDING-002D 测 JS throw，未覆盖死亡分区。应 crash-safe 锁或有 ownership 校验的恢复，至少可见失败与恢复入口。

**F7/P2 — pending rename 后完成事件失败不可幂等续跑。** daily_governance.py:154-171 顺序为 DISPOSITION_RECORDED→rename→ACTIVE_REMOVED。仅在第三步注入 OSError：第一次2，active已无、archive bytes仍在、manifest却active_retained=true/move_state=PENDING；第二次相同命令2，因:86 strict路径校验 ENOENT。不是丢失原 bytes，但状态矛盾且不可按原入口续跑。既有测试只覆盖首次事件失败和 rename 失败。应 source SHA+archive 对账后补完成事件，不重复裁决、不要求人工搬回原件。

**F8/P2 — 一个旧 ID 碰撞冻结全部新候选。** propose_semantic.py:119-143 对任意 collision 拒所有 proposal；consolidate_memory.py:1151-1175 set-stable/reject/promote/archive 全停；review_candidates.py:177-201 相同。临时双 root 存同 ID 不同 identity，再提无关新 fact：exit2，未追加。现 test_cross_root_collision_is_reported_and_blocks_every_candidate_mutation 明确把全停作为通过条件，保护价值真实但可用性未闭合。有旧冲突时 L4 正常 proposal 落点整体不可达，又无 source/identity 精确处置入口。不能忽略碰撞或重编旧 ID；应保全两份证据、确定权威、可审计处置，再限定冻结范围。全域 ID reservation 可以继续存在，不等于必须拒绝无关新 ID。

**F9/P2 — health 将展示提醒当真实消费。** restore:458-475 每次启动刷新 claim；daily_governance:1028-1040 将 claim 与 disposition 同列 recent_actions，所以每天只展示、从不裁决的旧 pending 可以长期没有 consumer anomaly。临时29天老 pending+今日claim，pending_anomalies=[]。notes 仍有age/count，这是部分可见性，但 recent claim 不足以证明消费。已补全新独立 fixture：manifest 不存在、QUALIFIED/NO_SIGNAL/UNRESOLVED 全为0，29天旧active+今日claim仍无pending anomaly。补票结果 /private/tmp/luca-health-claim-only-qij7wgxc/result.json。QUALIFIED 也只有长度≥8的自由 evidence，无结构化落点ID/验证结果，不能拿其计数当内容产出。

## 运行证据

- /private/tmp/luca-memory-audit-probes.py：项目读取边界、候选全停、pending post-move failure、health、真实本地 Git 两种失败。
- /private/tmp/luca-memory-hook-audit-probes.py：orphan lock 连续 startup、默认 Stop rearm。
- 结果：/private/tmp/luca-memory-audit-y11c7i4k/result.json；/private/tmp/luca-memory-hook-audit-p5gtbxe8/result.json。

只写新 temp store；Git remote 是本地 bare 目录，无外网。没有改坏生产 WIP 的 mutation；仅 monkeypatch/合成状态故障注入。全量 unittest/check:hooks/test:sync/verify 由主 Agent 核验，本报告不冒称执行过。F2 runtime 受 guard 拦截并停止；纯文报告第一次 shell 写入也因提及共享 alias 被同 guard 误判，当前报告去掉该路径文字，不存在项目资产操作。

## 最小整合方向

保留现 WIP；先修项目读取/归属与 sync 发布正确性；补 pending 增量、死亡锁、post-move 对账；让 health 区分展示与裁决；在保全稳定 ID 下恢复候选管道可用性。最终须独立新进程实测捕获→有权限的来源读取→门槛/归因→正确层落地→检索→下一会话行动。历史无来源 pending 保持 UNRESOLVED。当前证据支持修现有边界和恢复机制，不支持新增向量库、后台LLM或重写整套记忆框架。
