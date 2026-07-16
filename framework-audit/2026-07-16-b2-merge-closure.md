# F6-04 终裁闭环：B2 单真值源 + 双检出（2026-07-16）

> 上游裁决：`2026-07-09-decide-ledger.md` F6-04「双仓拓扑不可持续 | 采纳-部分执行」——当时处置
> 停在"备份 + 母版-first 纪律"，合并搁置。本文件记录终裁与执行。

## 终裁

**B2 = 单真值源 + 双检出**（luca 2026-07-16 拍板，评估全文见当日 session 计划文档）：

- muse 分支（81 独有 commit）与 main（56 独有 commit，分叉点 24d50f2）merge 为一套内容，
  union 保双方全部新增；此后 **`main` 是唯一真值源**。
- 两个目录都保留、都是 main 的检出：
  - `~/Desktop/luca_gstack` = 框架/meta session + 记忆权威 store（MEMORY_ROOT 目标）
  - `~/Desktop/项目/muse/lucagstack` = luca app 运行时 cwd（app/main.js:18 GSTACK，零改动）
- muse 产品线全量并入 main，不设 profile 开关（luca 拍板：muse 文件在母版检出惰性存在；
  luca-open/sidebar 走 `~/.luca` spool 握手不绑仓路径）。
- B1（单检出）不与本次手术绑定，留作 B2 跑稳后的可选第二步。

## 依据（三源交叉）

1. F6-04 已裁"不可持续"+ 同步税实锤：F5-06/07 同一修复两仓各打一遍复发两例、F6-01/07 72h
   双仓 57-59 框架 commit、parity 网 41 文件/127 锚点人力维护、合并当日仍有活漂移
   （person-memory 10 文件未下传）。
2. fork 沙盒使命已完成：诞生意图（首 commit f9555ca「隔离地基+上游同步+Loop 脚手架」，luca
   确认动机=怕 loop 弄脏母版）已随 muse-loop 成熟（路由词条+HITL 门+schema+基准+verify 门）兑现。
3. 运行时价值只需独立目录：双检出保留物理隔离（并行 session/app cwd），消灭内容分叉。

## 执行记录

- 回滚锚点：`pre-merge/master-20260716`（=e7df719，推 origin）、`pre-merge/fork-muse-20260716`
  （=042f750，推 backup）；muse 末代 tag `archive/muse-final-20260716`。
- 合并在独立 worktree（integrate-b2 分支）完成，两主检出 P6 切换前零扰动。
- 22 冲突文件逐 hunk union；记忆运行时流水显式取母版权威版（merge=ours 方向反，已覆盖）；
  route-guard.mjs 零变更（两仓字节相同，D2-1 未以冲突形式引爆）。
- settings.json 三键统一 tracked（MEMORY_ROOT + ROUTE_GUARD_HEAVY_SKILLS 入 env 块、日志
  统一 .log）——D2-1 静默降级面根治：HEAVY 门两检出一致生效，无本地配置可丢。
- 机制处置：capability-parity 降级仓内锚点自检（S18）；behind tripwire 新增（verify S23 +
  session-restore 软提醒）；`.gitattributes`/`sync-upstream.sh` 退役。
- 新纪律（CLAUDE.md「单真值源 + 双检出原则」）：框架改动初版定"只从母版检出 commit+push"，
  **同日 luca 拍板放宽为任一检出皆可做**（动手前先 pull、做完立即 commit+push、另一侧开工前
  pull）——自成长/经验修正常发生在 muse 检出现场，强制切母版会打断闭环；押注 git 非-FF 拒绝 +
  tripwire 兜住双端并发。风险实验用分支/worktree + 备份 remote，不再开永久 fork。

## 连带消解

- F5-02/03（记忆三头分裂/合并必冲突）：单分支 + 单权威 store 后无跨分支 merge，结构性消解。
- F5-04（裸 fork session-sync 指向 sync.sh 失败）：单真值源后 fork 检出与母版同内容，观察项关闭。
- F6-05（路由契约 5 镜像面）：双仓镜像维度消失，仓内镜像面收窄另案（CLAUDE.md 瘦身已过 B1 门）。
