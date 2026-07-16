# Checkpoint — person 记忆层共识循环 + muse app 左栏修复（2026-07-16，compact 前落盘）

> session 72da83e0。本文件是 compact 后的恢复锚点。
> **真值文件**（比本文更全，恢复时优先读）：同目录
> `2026-07-16-person-memory-consensus-report.md`（问题全史+共识核+残余）
> `2026-07-16-person-memory-plan-v3.md`（当前最佳方案）/ `2026-07-16-person-memory-unification-REDTEAM.md`
> `2026-07-15-person-memory-fragmentation.md`（含 §8 07-16 追加登记）

## 问题是什么（一句）

person（全局个人）记忆层按 git 仓根派生分裂成 19 个互不可见目录，读写指向不同库已实质分叉；
修法方向 = harness 官方 key `autoMemoryDirectory` + v3 三级阶梯（M3-0 止血 / M3-a 无损并库 / M3-b fork localSettings key），
经 3+1 轮对抗红队打磨，**全程零执行（拍板未解除）**。

## 已完成 ✅

- muse app 左栏「当前会话不可见」修复：根因=启动竞态（app.js:935 async 不 await + syncSessDots 只装饰不建行）；
  `015bf28` 已推 origin/refactor/claude-code-kernel；新包已装 /Applications/luca.app（.bak=7-15 版，luca 选的轮换）。
  **集成层验证 = luca 重启 app 看左栏出现本会话**（未做）。
- 记忆晋升：`feedback_symptom-first-before-acting.md` 双 store + 双索引；ant_profile 候选消费删除。
- 3 条新候选双写（verify-params-before-offering-choices / verify-in-the-deploy-scope / disclosure-is-not-remediation）。
- Episodes：EP-20260716-084（muse app，--project muse）/ 085 / 086（框架，--meta）。
- 共识循环 wf_a502ee79-182：3 轮触顶未收敛（阻塞 20→14→14；R3 两致命=编排 session 污染实验基底——
  当日 10 个 store 写入全是本 session 所写而清洁作者不知）。REDTEAM + consensus-report 落盘。
- A 类污染已修：前作 §8 追加登记块（07-16 双写台账 + ant_profile=晋升重命名非蒸发）。
- `SC-20260716-001` 已入队（--supersedes SC-20260715-005 修正版：repo 根派生非 cwd / 官方 key 存在 / scope=A 证伪）。

## 进行中 ⏳

- **R4 终审轮 Workflow `wf_24f561a1-902`（后台）**：作者内联台账+B 类四修法出 v4-final → 5 视角终审。
  journal：`~/.claude/projects/-Users-luca-Desktop----muse-lucagstack/72da83e0-fa7a-4ab2-b756-ee92592ae820/subagents/workflows/wf_24f561a1-902/journal.jsonl`
  产出：同目录 `2026-07-16-person-memory-plan-v4-final.md`
  **所有 agent 显式 model:opus**（主循环现为 Fable，继承会烧尽配额——R1 的 fable Agent 调用已经烧尽过一次）。

## 待执行 ▢

1. R4 完成通知到达 → 读结果：converged=true → v4 即共识终稿交 luca；false → blocking 如实交 luca，**不再迭代**（上限 1 已用尽）。
2. **luca 亲手 reject SC-20260715-005**（命令见「关键决策」3，已验真实接口）。
3. luca 重启 muse app 验证左栏修复（点该会话 --resume 即验收；回滚 = mv /Applications/luca.app.bak 回去）。
4. 母版脏文件未提交（EP-083..086 + archive 轮转 + SC 归档 + 前作 §8 编辑 + 新提案文件）——
   **EP-083 是别的 session 的，混在 index.jsonl，别单方面替它提交。**

## 关键决策（luca 已拍板，不得重问）

1. **R4 = 最后一轮**（luca 授权延长；不收敛即止，不假装共识）。
2. **范围拍板不解除**：一切停留提案，M3 任何一级都不执行；v4 必须保持「执行了 0 步」为真。
3. **SC-005 由 luca 亲手 reject**（人工闸门语义；reject 在 consolidate_memory.py，**不在** review_candidates.py——
   AskUserQuestion 预览里给错过一次，已当场纠正，属 verify-params-before-offering-choices 同款复发）：
   ```
   cd ~/Desktop/luca_gstack && python3 memory/scripts/consolidate_memory.py \
     --reject SC-20260715-005 --reviewer luca \
     --reason "前提证伪：slug 派生自 git 仓根非 cwd，且存在官方 settings key autoMemoryDirectory；由 SC-20260716-001 取代"
   ```
4. scope=A（全机塌缩）已死；per-repo 库（code-*）是 harness 正确行为，不并。
5. 验证纪律：**验证 scope 必须 = 部署 scope**（flagSettings 探针对 user/local scope 零证明力）——本 session 三次踩同款。

## 恢复指令

1. 先查 R4：TaskList 或读上面 journal 路径（**勿重跑**；需续用 resumeFromRunId=wf_24f561a1-902）。
2. 读 consensus-report（三轮全史、共识核、R3 残余解剖、写入台账都在那）。
3. 背景深读：v3 §5 七卡点 / §6 不治清单；REDTEAM §一（sync watcher 绑 key / iCloud Desktop / archive 绕穿 gitignore）。
4. 记忆治理背景：muse store 还剩 grep-cjk 候选待裁；「MEMORY.md >20 条」flag 与解药 SC-20260630-001 stale 的互锁 = v3 卡点 3。
5. 本 session 未绑定项目（guard 已确认）；muse app 相关操作当时经 project.sh switch muse 完成，现态勿再 switch。
