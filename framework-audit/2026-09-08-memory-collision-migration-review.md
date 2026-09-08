# 两条候选碰撞迁移：执行前独立安全审查

结论：PASS。仅针对下列已审字节与精确计划，允许主线程执行已授权迁移；不扩展为通用数据修复权限。

- 脚本：framework-audit/migrate-memory-collisions-20260908.py
- 脚本 SHA-256：0f6913368a5e5f37a6455774a26be064287a9a4cc4d439ee91fb8b866de9612c
- 计划：/private/tmp/memory-collision-migration-plan.json
- 计划 SHA-256：8755a0351548f2f20f8415c0c20b728e8701dad1ff4196c5b0f916161a5355d3

前版发现两个阻塞：resume未绑定目的store/锁；重提丢stable_requested/reviewer/tags导致待批队列不可见。当前版已修复，并在独立临时目录执行验证。未执行真实 --apply-plan；未写真实候选或任何工程文件。

## 关键检查

| 要求 | 证据 | 判定 |
|---|---|---|
| 范围固定 | 25-28/44/61-62 固定ROOT、CANDIDATES、known_roots、锁；每次apply含resume先核对 | PASS |
| 原bytes保留 | 34-38 原行含换行入计划；68-73 SHA/JSON核验；81先写识别为历史候选的archive；83仅移除这两条精确原行 | PASS |
| 共享锁与并发保护 | 63-91 同锁内重读SOURCE、核全文件SHA、核snapshot、归档与atomic rewrite；93后释放锁再调用proposal避免递归死锁 | PASS |
| promoted不变 | 47-48冻结两份fingerprint；78初次全snapshot检查；87-89及123-125重验；没有promoted写操作 | PASS |
| 新候选不晋升不supersedes | 109-117通过既有CLI保留请求意图与metadata；不传supersedes；CLI固定proposed_stable=false；101-105复用时核domain/status/nonstable/无supersedes | PASS |
| 可恢复与幂等 | 原archive/receipt先持久化；缺两原行后核durable evidence；source_key用事件+原SHA+archive；同key找回已写新记录 | PASS，见故障注入 |
| 原ID仍占号 | archive名符合candidates-*.jsonl，顶层原记录不包装；当前权威载体优先是既有census逻辑，未增加豁免 | PASS |

## 独立运行验证

在新temp store复制生产脚本运行，不使用真实候选内容：

1. 正常迁移：两原行archive bytes与原始完全相同；新候选reviewer=luca、stable_requested=true、tags保留、CANDIDATE、proposed_stable=false、supersedes空。
2. 完成后改MEMORY_ROOT/known_roots/lock重跑同plan：非零拒绝，第三store没有任何candidate文件。
3. SOURCE atomic rewrite完成后注入OSError：首次非零；同plan重试成功，恰好两个新候选；再次重跑所有JSON/JSONL/YAML bytes不变。
4. 第一proposal成功、第二proposal前注入失败：首次非零；重试复用第一条、补第二条，恰好两个；再次重跑bytes不变。
5. 两故障恢复用例均核原archive bytes、两promoted原bytes未变、全部新记录非晋升/无supersedes。

运行产物：

- /private/tmp/memory-migration-audit-o1gtqq87/result.json
- /private/tmp/memory-migration-recovery-audit-_ig2oeik/result.json
- 探针 /private/tmp/check-memory-migration-audit.py
- 探针 /private/tmp/check-memory-migration-recovery-audit.py

## 执行后仍须读回

PASS是执行前审查，不等于真实数据已迁移。主线程执行后需核：原两行SHA可从隔离archive恢复；两旧ID的权威载体和全部promoted不变；新候选进入待人工批准而非promotion_ready；仅预期candidate追加；census无冲突；receipt映射准确。执行期间若环境、计划、脚本或源证据漂移，按脚本拒绝并重新审查，不覆盖。
