# 深度框架审计 — 母版 + muse 层全量（2026-07-07 → 07-09）

> 范围：母版（~/Desktop/luca_gstack，main）+ muse fork（本仓，muse 分支）全量；6 维度。
> 方法：3 Explore（探索）→ Workflow 6 finder（深挖，each effort=high）→ 67 条发现逐条对抗验证
> （每条独立 skeptic，默认立场=驳倒；两次撞订阅限额后验证层降级为 6 个按维批量 skeptic）→
> 高置信项当场修 + 两仓全量回归。完备性批评环**主动砍掉**（F6-07 确认审计成本本身已是问题）。
> 成本：~74 workflow agents（1.76M subagent tokens，两次限额中断重跑）+ 6 批量验证 + 2 修复 agent。
> 树演化说明：审计进行期间并行 session 在两仓落了「会话级项目隔离方案A」等 4 个新 commit
> （04a5faf/e4a9002 + 母版 def1fc0/b46c8bf），个别发现的状态已随之更新（见 F1-04、F5-05、F5-06）。
> 二次树演化（2026-07-09 下午补注）：同日另一并行 session 落了 memory-eval final-plan 三个 commit
> （08e1fb2/86827eb/11bd188：项目 context 套装 / 绑定即注入 / handoff criteria 评估绑定层，
> 见 `framework-audit/proposals/2026-07-09-memory-eval-final-plan.md`）。两套改动经独立红队逐项
> 对抗验证：文件级零踩踏、语义 5/6 兼容，唯一冲突（绑定即注入 vs never-switch 记忆的 meta-session
> 灰区）已加边界条款收口；F1-05/F2-07 的 person canonical 裁决已被其 M1 先行定案（见下）。

## 总裁决

**67 条发现：66 CONFIRMED / 1 REFUTED（F4-08）/ 0 PLAUSIBLE。**
分类：FIX-NOW 37（已修 34，余 3 见「待 luca 动作」）· DECIDE 23 · KNOWN-BOUNDARY 6。
finder 引用精度很高；验证层的主要贡献是 5 处降级、2 处升级（F2-01→P0）、1 条驳倒、多处数字勘误
（F6-02 commit 数 20→15、F6-06 45+→22）。

## 一、最重的一簇：运行环境残留 + 记忆层脑裂（P0/P1，四维交叉命中）

**F2-01 (P0)** MEMORY_ROOT 残留使 fork 记忆治理静默饿死：session-restore 用 fork 路径认领
`.checked-<date>`，daily_governance 继承 env 跑在母版——审计当天（07-08 16:07）实测 fork 只落
0 字节标记、母版同分钟生成真 digest。**已修**：session-restore 治理触发/digest 展示统一走
`MEMORY_ROOT||projectRoot`，redirect 生效时 SessionStart 打印 canary。
**F1-01/F4-01 (P1, DECIDE)** 残留本体：本机进程树同时残留 `MEMORY_ROOT=母版`、`SESSION_SYNC_BLOCK=0`、
`GLOBAL_MEMORY_DIR=母版`（不在任何 rc 文件/launchctl）。它还**掩盖告警**（残留下 check_model_routing
报 0 条失配，清残留报 4 条）。代码侧 canary 已加；**残留源头（muse app 注入链）需 luca 处置**。
**F5-02/F6-03 (P1)** 实害已发生：EP-20260706-057 同 ID 在两仓是两条不同记录（母版=真实
todo-capsule session，fork=SWIFT_DIAG 测试空壳）。**fork 侧已修**（空壳条目+session md 已清）；
母版记录保留（是真实 session）。
**F1-05/F2-07 (P2/P3, DECIDE → 已定案 2026-07-09)** person 层 split-brain：harness 给 fork session
实际注入 fork 自己的全局目录，而 hook/治理/文档四处硬编码母版目录。**同日 memory-eval final-plan
的 M1 已定案并落地：母版目录 = canonical**——fork 存量 4 条已 union 迁入母版（人格级 2 条原文迁移、
fork 语境 2 条双存），fork 目录留 `reference_person-memory-canonical-dir.md` 收口写入指向（harness
注入面无法改，写入侧由该 reference 每 session 约束）。4 处硬编码本就指向母版目录，与定案一致、
无需改动；「统一为单一真值源常量」降级为可选清洁项。

## 二、hooks 运行时（F1，11 条全 CONFIRMED）

已修（both repos，test-hooks 21 用例全绿）：
- **F1-02** kill-switch 零可见性 → killSwitch 命中时 stderr 留痕（EP-057 当事记录自认曾被静默压制 79 编辑/219 工具调用）
- **F1-03** pending-extraction 无限堆积（7 天 11 个）→ 三处收口：trivial session 不再写 stub（对齐
  CLAUDE.md「不拦截、不提醒」）；marker 命中时回收本 sid stub；session-restore 对 pending 文件 7 天 TTL GC。
  test-hooks 的 3 处旧契约断言同步更新（HOOK-001反面/HOOK-006/CONC-006 + 新增 kill-switch 正面用例）
- **F1-06** sid sanitize slice(0,32) 截断 36 位 UUID（母版磁盘双 marker 铁证：同 session 被二次拦截）→ 全部 6 hook 统一 slice(0,36)
- **F1-09** fork CLAUDE.md/AGENTS.md 谎称 HEAVY set 空 → 如实声明 settings.json 注入 auto,muse-loop-orchestrate（种子「与母版决策抵触」不成立——母版 fcaccd2 明文保留扩展点）
- **F1-11** 两仓混写同一 /tmp 日志 → fork settings.json 分流到 hooks.muse.log，size-cap 双文件

DECIDE（4 条）：
- **F1-04 (P2)** 命名即切换 pin 预写（凭意图非观察，可复现假漂移告警）——**状态更新：07-08 方案A
  （project-scope-guard.mjs PreToolUse 重定向）已重构该层**，本发现按旧代码验证，需在方案A 之上复核是否仍存在
- **F1-07 (P3)** project.sh 三链切换非事务（SIGKILL 窗口留部分切换态，启动侧只判悬空不判不一致）——建议 session-restore 悬空 gate 扩展为「三链指向项目一致性」检查
- **F1-10 (P2)** Stop 按回合触发 + marker 一次性永久豁免：跨日 session 首回合裁决后数小时工作零裁决点，与 CLAUDE.md「session 结束统一裁决一次」漂移——两个修法：文档如实化（便宜）或 marker 加时效（重）
- **F1-08 (P3, KNOWN-BOUNDARY)** toolCount≥8 只读 session 被拦一次——post-edit.mjs 自标注的 V3 设计，解锁便宜，维持

## 三、记忆系统（F2，9 条全 CONFIRMED）

**好消息（种子被证伪的部分）**：06-28 体检的 P0「晋升门禁不强制」已真实修复——proposed_stable
硬置 False、翻转只有人工 --set-stable 一条路、无人值守 --promote-ready 无旁路（两仓 dry-run 实测）。

已修（both）：
- **F2-03** consolidate 无锁 read→rewrite vs append 加锁追加的丢行竞态 → episodic_index_lock（与 append 争同一把 .index.lock），锁内重读再归档重写
- **F2-04** 三处裸 write_text（promoted-facts ×2、CLAUDE.md sync、rotate_index）→ 全部 atomic_write_text
- **F2-08** sync_claude_fallback 静默 no-op → 白名单事实镜像通道断裂时 stderr 告警（反向校验挂 BACKLOG）
- **F2-02** fork index 空壳条目已清（见一）

DECIDE（4 条）：**F2-05** 治理降频被持续待决态击穿（验证降级 P3：digest 有 marker 只展示一次，是局部回归非失效）；**F2-06** 现存 stub 队列清偿（F1-03 修复后 7 天内自然排干，可不动）；**F2-07** person 层 canonical 目录（见一）；**F2-09** archive 后的 episode 从检索面静默消失（append 扫 archive 分配 seq，检索却不看 archive——建议 search_memory 加 --include-archive 或默认并入）。

## 四、muse loop 链（F3，16 条：15 CONFIRMED + 1 降级修正）

验证员总评：「文档极诚实、缝隙在接缝」。n=1 的真实 REQ 产物恰好为多条发现提供实据（accept 落盘值、
scorecard 双缺失、[AUTO-SIM] ad-hoc 回填）——这些不是理论缺口，是已发生的行为。

已修 11 条（fork，check-muse-loop-sync 5 锚点 PASS + EARS stdin 实测过）：
- **F3-04 (P1)** scorecard.md（L4 交付物）无写入者无格式无实例 → 编排器被指派落盘 + schema.md 定义 L4 格式 + judge 注明「由调度方落盘」
- **F3-03** human_decision 写 accept 读 approved → schema 定义枚举 accept/defer/reject，orchestrate 统一 accept
- **F3-11** 「Reviewer Concerns」终局无合法 status 值 → 枚举补 reviewer_concerns（schema v0.6）
- **F3-12** OD 默认路径 L3 落点断裂 → 回收后复制 index.html 回 REQ 目录 + requirement.md 记 prototype_source
- **F3-13** GATE-1 答案回填无人指派 → 编排器作答后立即回填 design_reference/captured_at
- **F3-08** 入口 A/B 判定改为以调用方身份为准（形态降为辅助提示）
- **F3-07** constitution §1 拓扑更新到 OD 改造后现实；**F3-02** GATE-1 人工语义质量提示补回 triage Phase 3；
  **F3-09** EARS stdin 调用形态写明 + 脚本 ENOENT 友好报错；**F3-06** Loop 下禁用 open-design 自有备选链；
  **F3-01** HEAVY 注册点表述如实化
- 附带：**F3-05/F3-10 的轮次落盘位**随 F3-04 的 scorecard rounds 字段有了着落，但 plateau 判定归属（judge 冷启动隔离 vs 编排器持有记忆）仍需裁决

DECIDE（3 条）：**F3-05 (P2)** plateau SSOT（推荐：移入编排器，judge 只做单轮判定）；**F3-10 (P3)** fallback 内循环轮次持久化；**F3-16 (P3)** derived-fallback「打折」机械化（推荐：derived-fallback 的 PASS 不计入 flip-verified，需人工确认）。
KNOWN-BOUNDARY：F3-14（打分名实）、F3-15（sync 脚本子串锚点）。

## 五、契约一致性（F4，11 CONFIRMED + 1 REFUTED）

已修（W2 agent，两仓 check:routing-map 双 PASS）：
- **F4-02** AGENTS.md 零 muse 内容 → 补 muse 专属段（违反 CLAUDE.md 自宣的同步契约）
- **F4-03** orchestrator.md 通篇 magicpath 为主力、零 open-design → 三处对齐 optional-workflow-graph 真值（open-design=primary）
- **F4-04/05** self-model 双文件过期且 checker 无接线 → 两仓 regen + 手工面回填（含 session-end/project-scope-guard/muse-proto-judge）+ **check:self-model 接入 verify.sh（新 C16）**
- **F4-06** model-routing.yaml 补登记 code-recon + 3 muse skill（修后 check_model_routing 失配 4→0）
- **F4-07** /office 向导补 muse 展示；**F4-09** figma-demo 斜杠收口（隐藏名单 5→12 对齐）；**F4-10** plan-agent 豁免理由如实化
- **F4-11** check:hooks/verify.sh 补 session-end.mjs（新 C15）

**F4-08 REFUTED**：muse-loop-orchestrate 不豁免条件 2 是有记录的刻意设计（SKILL.md:174 自述），非遗漏。
KNOWN-BOUNDARY：F4-12（quality-gate model pin 无 agent 面校验——已在 yaml 注释登记备查）。

## 六、双仓漂移（F5，10 条全 CONFIRMED）

已修：**F5-01 (P1)** sync-upstream.sh 默认合并死分支恒报「已是最新」→ 默认改 main；**F5-08** upstream/HEAD 本地缓存过期 → set-head main；**F5-09** fork 诊断残留已清。
种子被证伪的部分：C11 双写 verbatim 一致 merge 可干净收敛；两仓 .gitignore 逐字相同；feat/memory-3way-taxonomy 已全量并入 main。

DECIDE（5 条，这是**结构性最重的一组**）：
- **F5-02/F5-03 (P1)** 记忆层三头分裂（fork 工作区/本地母版 clone/GitHub）+ append-only jsonl 的 git 追踪保证每次上游合并都冲突。推荐裁决：**记忆单一权威 store**——要么承认「母版 clone 是活的写入端」改文档，要么 fork 记忆走自己的一套并从 sync-upstream 排除 memory/**
- **F5-04 (P2)** fork 的 session 收尾提醒指向必然失败的 sync.sh（无 origin、muse 分支）——fork 记忆状态没有任何同步收尾路径
- **F5-06/F5-07 (P2/P3)** 「fork 先修、人肉 port 回母版」流程——**审计期间当场复发第二例**（方案A：fork 04a5faf/e4a9002 → 母版 def1fc0/b46c8bf 再抄一遍）。推荐：框架级 feature 一律先落母版、fork 走 sync-upstream 继承
- **F5-05 (P2)** 母版未 push 漂移，审计期间从 2 个 commit 涨到 4 个（a7161ec/1f5f757/def1fc0/b46c8bf）——**待 luca push**（顺序无碍：fork 侧撞号空壳已清）

## 七、系统级健康（F6，9 条全 CONFIRMED）— 高维综合评估

**这个框架在「诚实度」和「工程质量」维度异常健康**：hooks 的并发处理、原子操作、fail-open 纪律
高于常见水平；历史审计自我批判尖锐且收口率高（06-28 的 13 条 UPHELD 次日修 ~11 条）；muse-loop
文档对自身证据强度的自标注极诚实。「审计→propose→不落地→复发」的循环指控**不成立**。

真正的系统病灶是三个，全部是**结构问题而非质量问题**：

**1. 元层自增没有刹车在数数（F6-01/F6-07, P1）。** 「每月 ≤2 次纯框架 session」软上限在设立后
72 小时内被 ≥5 个框架 session / 两仓 57-59 个框架 commit 碾过，且没有任何机制在统计这个数。
5 周 5 轮全量多 agent 审计（含本次，本次两天撞三次订阅限额）——审计本身已是最大自重源。
07-04/05 两仓 22 个 commit 的重框架日 episodic 恰好零记录（kill-switch 压制），预算度量的数据源
在其目标场景上失明。**推荐**：把「框架 commit 计数」加进 daily_governance（机械可数），月度 digest
呈现；审计降频到「真实使用暴露问题时做针对性小审计」，全量审计季度一次封顶。

**2. muse-loop 建设超前于需求（F6-02, P1）。** 输入语料不存在（EP-054 自认「用户明确说明当前
手头没有现成语料」）的情况下，投入 ~15/25 commit 建成并三轮打磨；docs/loop/specs 自 07-02 后零新增。
这不是能力问题——链路、schema、判官、门禁都是认真做的——是**顺序反了**。**推荐**：冻结 muse-loop
的一切进一步建设（本次修的是契约正确性，不是新能力），直到用一批真实需求语料完整跑一次 GATE-1→
verified；跑不动的地方再修。第一批语料来源建议：todo-capsule/roam-cards 的真实迭代需求。

**3. 双仓拓扑进入不可持续区（F6-04, P1）。** fork 25+ commit 领先且**无任何远程可推**（muse-loop
全部资产单盘单点）；母版 4 commit 未 push；同一修复已两次在两仓各打一遍；append-only 记忆文件
git 追踪 = 每次合并必冲突。**推荐**（按优先级）：① luca 给 fork 建一个私有远程（哪怕只是 GitHub
private repo 的 muse 分支），消掉单盘丢失面；② push 母版 4 commit；③ 裁决 F5-02/03 的记忆单一
权威 store；④ 确立「框架级 feature 先母版后 fork」纪律。

其余：**F6-05 (P2, DECIDE)** 路由契约 5 镜像面 2728 行、同型漂移修过两轮——本次 F4 修复又同步了
一轮，长期解是收窄镜像面（CLAUDE.md 瘦身与 07-03 悬空的 P2 结构决策一并裁决）；**F6-08
(KNOWN-BOUNDARY)** 39 条 promoted facts 零可证明检索命中——ADR-0006 measure-first 管线已在位，
等数据；**F6-09 已修**（proposals/ 纳入 git）。

## 待 luca 动作（按优先级）

1. **清环境残留**：在启动 muse app / 终端的进程链里找到并移除 `MEMORY_ROOT`、`SESSION_SYNC_BLOCK=0`、
   `GLOBAL_MEMORY_DIR` 的注入源，或确认它们是有意的（若有意 → 把 F1-05/F2-07 的 canonical 目录裁决
   反向定案）。现在 SessionStart 会打 canary，能看见它何时生效。
2. **push 母版 4 个 commit**（`git -C ~/Desktop/luca_gstack push origin main`）。
3. **给 fork 建远程备份**（消单盘丢失面）。
4. **裁决 DECIDE 23 项**——最重的三个：记忆单一权威 store（F5-02/03）、person 层 canonical 目录
   （F1-05/F2-07）、框架 feature 落点纪律（F5-06/07）。其余见上文各节推荐。
5. **muse-loop 第一次真跑**：拿一批真实需求语料完整走一遍 Loop（这是唯一能证明 2000+ 行建设值不值的方式）。

## 修复验证记录

- fork：`verify.sh` **53 PASS / 0 FAIL / 1 WARN**（新增 C15 session-end 语法、C16 self-model 一致性）；
  test-hooks 全绿（含 3 处契约更新 + 1 新用例）；check:routing-map 双 PASS；check-muse-loop-sync
  5 锚点 PASS；EARS stdin 实测；consolidate --json dry-run OK；check_model_routing 失配 4→0
- 母版：`verify.sh` **52 PASS / 0 FAIL / 1 WARN**；test-hooks 全绿；check:self-model OK；
  consolidate dry-run OK
- 所有验证均在 `env -u MEMORY_ROOT -u SESSION_SYNC_BLOCK -u GLOBAL_MEMORY_DIR` 下执行（绕开残留）

<!-- FILE_END: 2026-07-07-deep-framework-audit.md -->
