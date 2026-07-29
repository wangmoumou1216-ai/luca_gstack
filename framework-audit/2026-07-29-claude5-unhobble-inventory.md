# claude5-unhobble Phase 0 Inventory（执行权威工件）

> 源计划：~/.claude/plans/graph-engineering-lucagastack-https-x-c-silly-kahn.md v7.4 终版
> （9 轮红队握手，luca 2026-07-29 批准执行）。基线：HEAD d6ab8ab、CLAUDE.md 46,076B
> （B1 帽 46,080 余 4B）、verify.sh 全绿、分支 framework/claude5-unhobble。
> 本文件同时是 diff 台账：每个被动 span 一行，处置∈{harness-native 删, moved→path,
> merged, 保留}；执行中逐项打勾并记 verifier。

## A. Q4 纯删清单（commit 2a，~1.45K，九轮裁决终版）

| # | span | bytes | 裁决依据 | 状态 |
|---|---|---|---|---|
| A1 | L21 并发原则 | 117 | harness 原生并发指令在场；零机器耦合（R2-①⑤ 三面核） | ☐ |
| A2 | L25 读前先写 | 107 | Edit/Write/NotebookEdit 三工具硬强制；**conditional on D2**（红线#4 引文同步） | ☐ |
| A3 | L27 最小注释 | 104 | 与 harness "match density" 冲突=博客字面示例对；零事故（B1 警示适用，P4 已实证可自推导） | ☐ |
| A4 | L107-111 Agent Context 预算 | 193 | appendix:25 已有全表+指针预存在；零事故 | ☐ |
| A5 | L112-115+117 Compact 启发式 | 195 | harness 原生自动摘要；保留 L116"Compact 前先写 Checkpoint"句（移至 checkpoint 规则处，防孤行归档错位 R4-②WATCH） | ☐ |
| A6 | L221 SF-003 独立粗体行 | 50 | :194 SF 节条目是机器锚，:221 是自由重复（health check 只扫节内，R1/R2 双核） | ☐ |
| A7 | L368-369 route-guard 自述 | ~400 | **压缩非删**：留一句自含（route-guard 每 prompt 注入路由提示，应遵守）——L368-369 有 07-28 提示钉投递背书（R3-②F8）；:370 自含改写保留（兜底条款 R2-②M6 关联） | ☐ |
| A8 | L509-512 块尾 SC-003 重述 | 367 | SF 节+CONTEXT 红线#5 双重冗余在场（含"或本文件"条款唯 #5 保有，R4-② 攻击后幸存） | ☐ |
| — | ~~路由层级表 PG 行~~ | — | **恢复保留**（R2-②M6：route-guard 失效指定兜底 :370 引用+SC-002 事故背书） | 保留 |

## B. 压缩迁移清单（commit 2b 按节 2-3 个主题 commit；每项双 hunk 同 commit）

| 节 | 实测 | 锁定（零改动） | 目标省 | 全文落点 | 保留锚/条款 |
|---|---|---|---|---|---|
| Session 启动 L377-461 | 6,081 | PG 全块 L420-458=3,131（含总原则 blockquote never-switch）；软链 blockquote L379-386=903 | ~0.6K | 步骤叙述→appendix 既有节 | 命名即切换×2 站点不动（在锁定块内） |
| 三层记忆 L130-208 | 6,979 | SF 节 2,074；三分表 892；读取协议骨架（自标不可反推）；归因阶梯 455B 加锁（R4-②WATCH） | ~1.1K | 结构表/auto-grow 段→memory/README.md+appendix:49 | correction-attribution 锚：压缩行须保 A/B 归因判据语义（可数条款：A 判复现/B 判根因归属+L1-L5 档名） |
| Context 工程 L83-129 | 2,136 | 触发条件 403（Q3b 主动义务留强命令）；恢复协议 208 | ~0.85K | 写法模板已在 appendix:6/:15 | checkpoint 触发一行强命令 |
| luca app L523-545 | 2,062 | 4 条主动义务一行强命令 ~800 | ~0.9K | 细节已在 appendix:157/:180/:188 | 侧栏当前页感知 锚+HTML 推送/Figma 开侧栏/如实报告三义务句 |
| Orch+Standalone L462-489 | 1,601 | handoff 分级活 gate L486-488=280 | ~0.55K | orchestrator.md/handoff-protocol.md 既有 | — |
| 模型路由 L567-587 | 2,937 | 档表 4 行（dg f-string 尾空格解析）+fable 白名单 | ~0.8K | bullets→model-routing.yaml 头注 | Fable 手术刀 锚（节题） |
| 路由/skill 表 L217-376 | 15,163 | REG-1 每行 `/name`；隐藏 skill 声明段（`。`终止解析）；低置信兜底行:311；语义路由契约 3 站点 :311/:315/:366；平凡任务豁免 2 站点 :322/:364；Brownfield 正门 :274；:272/:274 prose 注册段 | ~1.2K | 消歧 prose→routing-map hint 字段+appendix:148 | 逐站点条款清单（见 C3） |

## C. 检查器工程（Phase 3 同 PR）

- C1 **appendix 指针奇偶校验**（新建）：指针命名约定 `appendix「<节题>」`；5 条泛指针改造
  :101(双节题)/:110/:126/:184/:257，弃路径换反引号 appendix 变体（+239B）；:380 挂 Session
  启动节硬编码例外；映射表=string-anchor 键+出现次数（:536/:542 同串计 2）+多对一合法
  （PG 附则两节→:428）；孤儿修复（harness 注入边界→正文一行指针）**同一 commit**；
  mutation 双向（删指针→红；append 新 ##→红）；FAST_COMMIT 收容如实注明；读工作树。
- C2 **CONTEXT 门**（新建，verify.sh 一行）：红线节定界内计数 ≥6 + id 断言
  SF-002/SC-20260523-002/SC-20260523-003 + 内容断言（#4 含 Surgical、#2 无「见上」）。
- C3 **parity 锚站点清单**：编辑节内 9 锚逐站点可数条款（Phase 1 时逐锚填列）。
- C4 **REG-1 定界化**：表行 + 具名 prose 注册段（`：**` 后首 token 为反引号 /name），
  :283 名点不计；与路由表压缩共设计。
- C5 **档表在场检查**（verify.sh 新行）：4 tier 行含当前 alias 强断言。
- C6 **commit-msg 验值 hook**（新建 ~15 行）：CLAUDE.md 字节增长→message 须含 `B1-余量:`
  且值与实算匹配；基线=HEAD（index 侧 git show :CLAUDE.md）；merge 判别
  --git-path MERGE_HEAD；根 commit 特判；旁路清单=--amend/--no-verify/rebase/
  cherry-pick/revert（选择接受）；G5' 存在+可执行门入 verify.sh。
- C7 **GitHub CI 补线**：B1+S18+S19 入 ci.yml；前置=CI 慢性红双修（markdownlint
  CHANGELOG.md [~07-12 起] + session-restore.mjs:272 分类正则加 `not found`
  [dash 无"command"字样，修 hook 非放松断言]）；13 个未行使步骤首跑可能带新红，如实预警。
- C8 **Phase 5 收尾 commit**（最后一个改 CLAUDE.md 字节的 commit 之后）：B1=实测+3KiB；
  dg 软预算=实测+1.5KiB（//1024 格式化同改；:639 注释 1KB/42.8KB/45KB 三处陈旧同改；
  :689/690/697/701 文案；verify.sh:136 描述；appendix:204 陈旧"余 4 字节"）；总 7 处+
  排除 verify.sh:137(B2)+4 历史审计文档；mutation=in-process monkeypatch（路径哨兵）。

## D. 决策项（随计划已批）

- **D1 执行**：CONTEXT.md 红线#2 自含改写（消「见上」悬空）。
- **D2 执行**：红线#4 引文拆分（读前先写→harness 硬强制[Edit/Write/NotebookEdit，bash 写
  在外]；最小文件/Surgical 引文不动）；A2 与之联动。
- **D3 不做**（可选项，留 follow-up：MEMORY.md 45 条无字节门+重复对，另立批次呈 luca）。

## E. G1 + Graph 落档（Phase 7）

- scout 脚本：两 fallback 站点（:263/:470）加替换计数器；return 增 run_status+
  phases_completed（sweep 分母 shortlist.length；punctual 分母 targets.length）；
  INCOMPLETE→approved+approved_overflow 入 quarantine；bookkeep：parse 后、:134
  appendFileSync 前，`run_status !== 'COMPLETE'` 整脚本 abort（两模式统一）；
  ~16-21 行总量；mutation=模拟部分阵亡断言 quarantine+abort 真触发。
- Graph 评估文档：编排层已达标结论+G2 DEFER 判据+07-02 事故记录。

## F. Phase 1 门记录（执行时填）

- P1 mutation 套件：appendix 奇偶双向 / SF 标题+条目格式 / parity 锚 / SSOT-10 /
  维护规则(白名单 fixture) / 隐藏 skill 解析段 / commit-msg hook / CONTEXT 门 / 软预算门 ☐
- P2 溯源：pre-baseline→provenance-unreachable→P4；post-baseline git log ☐
- P3 仓外 claude -p 双臂（8 fixture×2×8+8 对照+16 批判≈152；逐 fixture 触发率差 <75% 打回；
  canary 双向；MEMORY.md 盲区已披露——Q4 项靠 P4 非 P3）☐
- P4 对抗（20 prompt+provenance-unreachable 实证）☐


## G. CLAUDE.md 机器消费者权威清单（MAJOR-1 修复；正文「非显然坑」指针的落点）

| 消费者 | 读什么 |
|---|---|
| scripts/check-routing-map.mjs | TL;DR 前 40 行 6 断言；隐藏 skill 声明段（`。`终止解析）；SSOT-7 五短语；SSOT-10 600 字符窗口 |
| scripts/check-registration-sync.mjs | REG-1 注册行（表行+具名 prose 段） |
| scripts/check-coding-discipline.mjs | 6 正则（5 原则名+skill-routing-map 字面） |
| scripts/check-capability-parity.mjs (+capability-parity.json) | 10 字面锚 |
| scripts/check-appendix-pointers.mjs | appendix「节题」witness ×12 行 |
| scripts/verify.sh | C9/C10 grep；B1 字节帽；S32/S33 |
| memory/scripts/check_memory_health.py | SF 节定界+条目格式双向 |
| memory/scripts/consolidate_memory.py | 「维护规则」插入锚（fail-soft） |
| memory/scripts/daily_governance.py | 档表 4 行 f-string 尾空格解析+字节软预算（读母版检出） |
| .githooks/commit-msg | 字节增长验值（帽从 verify.sh check B1 行解析） |
| hooks（route-guard/session-restore/session-sync/scope-guard） | 节名引用与逐字引 |
| scripts/check-agents-parity.mjs | AGENTS.md 镜像面（SF id 集合等值） |
| tests（test-route-guard/test-hooks/test-project-scope-guard） | fixture 断言 |
| skill-os/optional-workflow-graph.yaml + observability/rules.yaml | research_default 引用/路由表一致性 |

## 执行核销（MINOR-5：台账打勾+verifier）

§A A1-A8 done（verifier：P4 20 探针+双臂门 GATE-PASS+知识保全盲审 CONTRACT-VERIFIED）；
§B 7 节 done（verifier：知识保全盲审逐 hunk+16 锁定块字节比对+10 锚站点数=基线）；
§C C1/C2/C4/C5/C6 done（活体 mutation+工程盲审独立复现）；C7/C8 done；§D D1/D2 done、
D3 不做；§E done（G1 双态 mutation）；§F P1 done（mutation 全套）P2 done（九轮红队溯源，
pre-baseline 走 P4 实证）P3/P4 done（GATE-PASS，334 文件落盘）。
