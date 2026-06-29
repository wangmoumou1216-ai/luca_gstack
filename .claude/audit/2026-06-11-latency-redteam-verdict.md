# 2026-06-11 框架耗时与文件卫生审计 — 红队终局裁决

> 流程：main 产出 C1–C7（见 2026-06-11-latency-audit-claims.md）→ Round 1 攻击（A1 耗时线 / A2 文件卫生线，并行）
> → Round 1 防守（D1/D2，独立 agent，"攻击成立就认"纪律）→ main 收敛判定 → Round 2 交叉质证（X1 裁 C4 / X2 裁 C6，
> 亲自重跑全部关键实验）→ main 终局裁决。全程证据纪律：无可复现证据的论点按 SPECULATION 弃权。
> 烟雾测试通过：攻击方对 C1/C2 主动 UPHELD（构造 210KB 最坏路径仍 30-40ms），防守方对 C5 全面 CONCEDE——双方均无放水迹象。

## 终局 verdict 表

| ID | 原结论 | 终局 | 三分类 | 关键修正 |
|----|--------|------|--------|---------|
| C1 | hooks 不影响回复时长 | **UPHELD** | 缺口判断正确 | 攻击方构造 10/50/210KB 对抗 prompt 全部 30-40ms；session-restore execSync 有 4s 上界 |
| C2 | 耗时排序：轮次/产物 > 强制读完×SKILL.md > CLAUDE.md > hooks | **UPHELD** | 缺口真 | 182KB 实测为保守下界（未计运行中 lazy-load 的 references 42KB） |
| C3 | CLAUDE.md 词表纯冗余，砍25%零损失 | **WEAKENED** | 缺口真，量级错+表述错 | 可砍 ~4.3KB≈**11%**（非25%）；前置条件：先回填 4 条漂移规则进 yaml；"零功能损失"→"仅 fail-open 尾部场景的关键词精度损失（日志期内 route-guard 仅 1 次 fail-open）" |
| C4 | 巨型 SKILL.md 拆 main+references，主文件~15KB | **WEAKENED** | 缺口真，解法目标错 | 五文件**已是** main+references 架构；但主文件仍残留 30-59% fenced 模板/可压缩图（X1 逐块抽查证实为执行时物，且发现同文件内 Phase 1/Phase 5 模板双标存放）；现实目标 **~20-35KB/文件**，15KB 作废；plan-agent 暂缓（agents/ 无 references 机制） |
| C5 | 垃圾=5 marker+6 DS_Store；缺 digest-shown 清理 | **WEAKENED** | 缺口真，清单不穷尽 | 补：4 个孤儿测试残渣（episodic/sessions/2026-05-23-session-{0..3}.md，index 已归档 noisy，检索不可达）+ /tmp/luca-gstack-hooks.log 无轮转（~27KB/天，dirhelper 3 天 mtime 规则对活跃追加文件永不命中）。表述修两处：digest-shown 清理须**保留 newest**（照抄 episode-written 全删会致当日 digest 每 session 重展示）；.DS_Store 为"5 个可自动删 + .git 内 1 个" |
| C6 | lark-* 全局 skill 是更大负担，禁用收益>改框架 | **REFUTED（撤回）** | 方向错 | lark-* 实为 **19 个、6.2KB**（非"约30个/相当大体积"）；全局+plugin 可禁面合计 26.8KB = 自身注入 43KB 的 0.62×，按自设证伪标准每种口径都"明显小于"。修正：禁用确实不用的子集（现实 ~6-12KB）是与改框架**同量级的次级优化**，无"收益更大"依据 |
| C7 | 不动项：Project Gate / Stop hook / hooks | **WEAKENED** | 部分真 | Stop hook 与 hooks 维持成立；但 projectGate 例外分支不属"保持现状"：例外 regex 锚定句首 15 动词，祈使式咨询系统性漏网（5-6/8 实测撞门禁，含"今天天气怎么样"），缺寒暄过滤。Gate 机制本身的权衡（防污染 > 109B hint + ≤1 轮）未被推翻 |

战绩：存活 2 / 修正 4 / 撤回 1 —— 与既有记忆「框架自审系统性 over-claim」一致（历史 4/9、6/11，本次 5/7 被改动）。

## 经验证的新发现（claims 未覆盖，全部带可复现证据）

1. **[高] hooks 相对路径注册 → cwd 漂移整链失效**：settings.json 以 `node .claude/hooks/...` 注册，
   /tmp 日志实证 post-edit 196 次、session-sync 9 次、route-guard 1 次 "Cannot find module"（cwd 错误）。
   比"坏 JSON"现实得多的 fail-open 向量；post-edit 高频失败意味着工具计数被低估，影响 Stop hook 实质工作判定。（D1）
2. **[高] skill-routing-map.yaml 真值源漂移**：「状态/进度→状态工具意图」「本地原型」「CRM+设计组合」只存在于
   CLAUDE.md，yaml 缺失，与 L424"与 hook 保持同步"承诺矛盾；yaml L92-93 反向把 OD 单点交接委托给 CLAUDE.md。（A1+D1）
3. **[中] 4 个孤儿测试残渣**：memory/episodic/sessions/2026-05-23-session-{0,1,2,3}.md，占位数据
   （"summary 1"/"outcome-1"），index 条目已归档 archive/noisy-2026.jsonl（EP-20260523-006..009），
   search/get 脚本只读 index 永不可达，未入 git。（A2，D2 全链路复现）
4. **[中] /tmp/luca-gstack-hooks.log 无轮转**：4 hook 共写 2>>，~27KB/天；macOS dirhelper 按 mtime 判老，
   活跃追加文件永不过期；最坏 ~10MB/年（低危但属 C5 自报证伪标准点名项）。（A2+D2 反向加强）
5. **[中] digest-shown 修复设计陷阱**：正确修法 = 删 newest 之外的过期 marker；同进程先清后查的执行顺序
   （session-restore.mjs L30-38 vs L124-139）决定不能照抄 episode-written 全删。（A2，D2 复核）
6. **[中] projectGate 缺寒暄/非任务过滤**：route-guard.mjs:343-345 的 你好/谢谢 过滤只作用于 skill 路由层，
   gate 层裸奔；例外白名单硬编码撞 feedback_semantic-not-hardcoded-keywords 既有教训。（A1+D1）
7. **[低] route-guard 坏 stdin 时 turn counter 仍自增**（:552-565）。（A1）
8. **[低] CLAUDE.md 内置 Skill 路由表 1,501B 可砍**：yaml builtin_skills 节已含全部触发词。（D1）
9. **[低] post-edit 每次工具调用付 ~25-30ms node 启动**，长 session 累计数秒，分摊无感，不修。（A1）
10. **[注记] 强制读完规则起源早于 git 历史**（首 commit 2026-05-26 即含），考古类行动项永不可达成，
    后续审计不应再列。（A1）
11. **[注记] X1 诚实 nuance**：外移"每次必跑 phase"的模板只降低强制读完的前置 prefill、惠及早退/轻量分支，
    完整跑通时总 token 基本不变；ASCII 流程图压缩（载荷实测 2.1KB，非 1KB）才是真删减。

## 修订后的行动清单（按优先级；执行状态见文末）

| # | 行动 | 来源 | 风险 |
|---|------|------|------|
| F1 | 垃圾清理：5 过期 digest-shown + 6 .DS_Store + 4 孤儿测试残渣 | C5 | 无（全部 0 字节/占位/已归档） |
| F2 | session-restore.mjs 加 digest-shown 过期清理（保留 newest 对应 marker） | C5+发现5 | 低 |
| F3 | /tmp hooks 日志加 size-cap 轮转（SessionStart 检查） | 发现4 | 低 |
| F4 | settings.json hooks 改 $CLAUDE_PROJECT_DIR 绝对路径（修 196 次 cwd 失效） | 发现1 | 低 |
| F5 | yaml 回填 3 条漂移规则 → 再砍 CLAUDE.md 词表 ~4.3KB（保留语义规则/TL;DR/层级表） | C3+发现2/8 | 中（需 dry-run 验证路由） |
| F6 | projectGate 加寒暄过滤 + 例外动词补漏（不动 SC-20260523-002 红线） | C7+发现6 | 中（需 dry-run 矩阵） |
| F7 | route-guard 坏 stdin 不计轮次 | 发现7 | 低 |
| F8 | SKILL.md 拆分（X1 方案）：brainstorm/ux-brainstorm 外移 Phase1 模板+压缩流程图；design-brief 外移输出模板；office 拆向导段；plan-agent 暂缓 | C4 | 中高（每文件需完整性验证） |
| R1 | 【建议，不代执行】用户自行禁用确实不用的全局 skill 子集（~6-12KB；perspective 4 个 2.9KB 是精准候选）；改全局配置须用户自己动手 | C6 修正 | — |

> scope 注记：原计划"只评估不修复"；用户在 Round 1 进行中追加明确指令「解决，解决以后开启 subagent 验证，
> 循环直到解决完全」——F1-F8 据此进入执行，每批修复后由独立 subagent 验证。

## 执行状态（2026-06-11 同日完成）

| # | 状态 | 结果与验证 |
|---|------|-----------|
| F1 | ✅（隔离非删除） | 15 个文件移入 /tmp/luca-gstack-quarantine-2026-06-11/（5 marker + 6 DS_Store + 4 孤儿残渣，可恢复）；V1 逐一复点 |
| F2 | ✅ | session-restore.mjs 保留-newest 清理；V1 沙箱三轮行为级验证（过期删/当日留/不重展示） |
| F3 | ✅ | >512KB 截尾至 64KB；V1 用 626KB 假日志行为级验证后恢复原日志 |
| F4 | ⚠️ 部分 | 4 个 hook 内部 CLAUDE_PROJECT_DIR 兜底 ✅（V1 cwd 漂移对照组实证救回）；settings.json 仅 SessionStart 行更新成功，其余 3 行被权限分类器拒绝（自我修改启动配置需用户明确授权），**待 luca 手动粘贴**（片段见会话终局汇报） |
| F5 | ✅ | yaml 回填（本地原型 + status_tool 词条）+ CLAUDE.md 词表收缩；V1 全量核对被删 143 词丢失=0，11 词 dry-run 路由正确；CLAUDE.md 37,913→35,948B（净省 1,965B，低于毛估 4.3KB——语义规则按裁决保留在 CLAUDE.md） |
| F6 | ✅ | gate 寒暄过滤 + 例外动词补漏 + M2 加「翻译」+ CLAUDE.md 语义豁免行；V1 矩阵：红线（老项目/新项目信号）全部仍触发，5 类误伤全部豁免 |
| F7 | ✅ | 坏 stdin 不计轮次；V1 行为级验证（不变/+1/恢复） |
| F8 | ✅ | office 27,855→13,418B（向导段外移）；brainstorm 45,485→37,372B；ux-brainstorm 44,983→35,194B；design-brief 38,637→32,802B（4 块输出模板外移）；plan-agent 按 X1 暂缓。V2 程序化验证：内容无损（design-brief 用 .bak 三方比对零差异；ASCII 图 62/62 bullet verbatim）、指针齐全、frontmatter self 校准 ✅、test-hooks 12/12、悬空引用 0（另修掉 1 条 HEAD 既有死引用 handoff-protocol.md:101） |
| R1 | ⏸ 待 luca | 全局 skill 禁用是用户级配置，不代执行；候选：4 个 perspective（2.9KB）+ 确实不用的 lark-* 子集 |

合计每 session 固定注入减少 ~2KB（CLAUDE.md）；skill 调用路径减少：office 共享规范 -14.4KB（所有 skill 受益）、brainstorm -8.1KB、ux-brainstorm -9.8KB、design-brief -5.8KB（其中外移模板按 phase 懒加载，早退/轻量分支收益最大——X1 nuance #11 如实记录）。
