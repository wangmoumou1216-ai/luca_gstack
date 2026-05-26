# 对抗辩论最终结论

> 3 个 adversarial critic（C1 证据&严重度 / C2 ROI&解法 / C3 外部可迁移性&可行性）对审计产出做对抗问询。
> 4 轮收敛（R1 攻击 → R2 作者辩护+让步 → R3 工具验证 → R4 接受），未到 6 轮上限即达稳定均衡。
> 规则：每条论点必须工具验证（读真实代码 / 跑探针 / 查官方文档），不做空辩。
> 本文件为辩论后的权威结论，**优先级高于各 ADR 原文**；受影响 ADR 顶部已加修订横幅。

---

## 一、辩论后核心判断（强化版）

审计的**元判断"减法优先 / 机制复杂度已超过实际使用强度"经辩论被强化而非削弱**：
最大的一次修订是把记忆系统的建议从"自动化"推向"先度量、很可能冻结"——比原审计更激进地减法。
核心诊断（route-guard 误报、闭环不自转、无单一真相源、死代码）全部**经独立工具复核为真**，
但多处**严重度被高估、解法有技术错误**，已修正。

---

## 二、幸存（经验证为真，不变）

| 结论 | 验证证据 |
|---|---|
| route-guard substring 误报真实存在 | 探针：`research-proof`、`市场调研背景` 均触发 PLAN_CHECK（route-guard.mjs:227,261-266） |
| 学习闭环不自转 | session-sync.mjs:65-72 只 `stdout.write` 命令、读无 stdin、从不执行 |
| 无单一真相源 | skill 列表手维护在 5 个配置面，已分叉（C1/C2 复核） |
| 死代码真实 | orphan 脚本 fix_long_lines/repair_backticks 零外部引用（grep 确认）；hermes 目录空 |
| **ADR-0003 统一路由契约** | 维持 P0，sound（Codex/Claude 路由分叉真实） |
| **ADR-0004 一致性清理** | 维持 P0，sound；且其廉价一致性检查使 5-文件现状可接受（影响 ADR-0005 紧迫度） |

---

## 三、被修订（严重度/解法纠正）

| 项 | 原结论 | 辩论后 | 工具证据 |
|---|---|---|---|
| route-guard 严重度 | A3 高 / A1 中（自相矛盾） | **MEDIUM** | PLAN_CHECK 是 advisory hint（route-guard.mjs:308-311），~110 tok，模型可忽略；非硬门（对比 PLAN_MODE:299-304 "禁止直接路由"） |
| ADR-0001 hermes 引用 | HIGH "会 FileNotFound" | **LOW，假阳性** | SKILL.md:258/273 是"已废弃"注释，非待运行命令。保留两个真实小缺陷：orphan 脚本 + SKILL.md:263-264 悬空 arg 片段（`--context-risk`/`--rollback` 无命令头，已复核） |
| ADR-0002 修复机制 | `\b` 词边界 + 长词优先 | **`\b` 对 CJK 完全失效，降级为最小 stopgap** | 探针：`/\b调研\b/.test("设计调研")`=false 且 `/\b调研\b/.test("做调研")`=**false**（连真阳性都打掉）；`/\bresearch\b/.test("research-proof")`=true（英文也没修好）。唯一可行=长词优先+人工消歧对表（≈黑名单）。Score↓≈6，且与 ADR-0005 部分重叠 |
| projectGate STOP | 中 | **LOW** | route-guard.mjs:176 仅在 `!currentProject` 触发，瞬态 bootstrap；且只发 advisory 不杀进程 |
| get_memory.py:154 | 列为缺陷证据 | **排除出评分**（装饰性无害） | self-labeled 无害 |
| "22-30% paper-only" | 整体当缺陷 | **拆分** | 误导性活引用=缺陷（LUCA_SPAWNED 嵌在 18 文件可执行 preamble bash 块，active-looking）；明确标注预留=设计取舍低优先（SKILL.md:282-284 "未来扩展预留"，已复核） |
| ADR-0005 成本 | cost=4 | **cost=5，Score≈3.0，拆分+设门禁** | 多交付物（重写所有 description + 派生脚本 + 中文命中率测试 harness）。拆为 (a) 安全的 SSOT 派生脚本【做】+ (b) 风险的 description 路由迁移【迁移前必须先过中文命中率测试，且因 ADR-0004 已使现状可接受而降优先】 |

---

## 四、被推翻 / 重新设计

### ADR-0006 记忆自转 — 先重设计，再被降级为"先度量"

**4.1 原方案被证伪（C3-1，工具验证）：** "Stop hook 执行外部 LLM 抽取"**不可行**——
`ANTHROPIC_API_KEY` **ABSENT**、无 `.env`（Claude Code 用订阅 OAuth）；Stop hook 是同步 `node` 命令（settings.json:43-52），外部 LLM 调用无凭证、会阻塞退出、可能 re-entrant。

**4.2 重设计被验证可行（C3-2 → R3-A，查官方文档）：**
改为 Stop hook 返回 `{"decision":"block","reason":...}`，让**已在跑、持有 OAuth + 全部会话上下文的当前模型**自己执行确定性的 `append_episode.py`/`propose_semantic.py`——无需外部 LLM、无需 API key。
- 官方契约已验证：code.claude.com/docs/en/hooks 决策表列 Stop 支持 `decision:"block"`+`reason`（routed to Claude，不展示给用户）；`stop_hook_active` 防循环。
- 同时**砍掉**移植的 Mem0 ADD/UPDATE/DELETE + md5/0.95 去重（1 候选语料属过早优化）与 `turns % N` 触发器（`.session-turn-count` 是跨 session 单调全局计数，语义无意义）。
- **细化（R3-A 遗留洞）：** block 必须**有条件**——仅当存在可记录信号（in_progress 节点 / pending 标记）时 block，否则 `exit 0`；且 `stop_hook_active:true` 时早退。无条件 block 会每次结束都强加一轮，user-hostile。

**4.3 但最终被降级为"先度量，很可能冻结"（C2-3 → R3-B，未被驳倒的关键论点）：**
作者一度因"成本降了"把影响也拉高——**这是 axes 混淆**。记忆的**影响取决于是否被有用地读取**，而非写入是否便宜。证据：5 episode、数周 ~2 facts、eval 0 字节 → 检索价值接近噪声。
> **"Cheaper writes ≠ valuable reads."**

评分对比（R3-B，工具核对语料）：

| 方案 | 影响 | 可行 | 成本 | Score |
|---|---|---|---|---|
| 自动写（重设计 0006） | 3 | 4 | 2 | 6.0 |
| **冻结写侧 + 停维护脚本** | 2 | 5 | 1 | **10.0** |

**结论：当前证据下"冻结"胜出。** 最终建议：
1. **先做廉价可证伪度量**：10 个 session 内记录每次 `search_memory` 命中是否真的改变了某个动作。
2. 命中且有用 ≥ ~3 次 → 记忆值得喂，影响→4、Score 8 > 冻结，再建 4.2 的廉价重设计版。
3. 命中 ≈ 0 → **冻结写侧**：删/归档 7 个写脚本（append/propose/consolidate/review/mine/record/health），保留 2 个读脚本 + CLAUDE.md 内 SF-001~005 静态 fallback。

### GEPA（ADR-0007 W3）— 标记 blocked，不独立计分
依赖 ADR-0006 产出 eval 数据，而 eval pairs.jsonl = 0 字节（已验证）。撤掉其 1.6 评分，改"阻塞中"。

---

## 五、辩论后最终 ROI 行动表

| 档 | 行动 | 状态变化 |
|---|---|---|
| **P0 立即** | ADR-0001 删 orphan 脚本 + 修 SKILL.md:263-264 悬空片段（**不**提 FileNotFound） | 严重度 HIGH→LOW，仍做（纯减法） |
| **P0 立即** | ADR-0003 抽单一路由契约，AGENTS↔CLAUDE 同源 | 不变，sound |
| **P0 立即** | ADR-0004 一致性清理（compare/input-modes、superpowers 命名、品牌色、docs 路径） | 不变，sound |
| **P0 最小** | ADR-0002 route-guard 仅做"长词优先"≈5 行 stopgap + 负例测试（`\b` 不用） | 降级；负例测试并入 ADR-0005 harness，非废功 |
| **P1 分步** | ADR-0005(a) SSOT 派生脚本【安全，做】 | cost↑，拆分 |
| **P1 门禁** | ADR-0005(b) description 路由迁移【先过中文命中率测试再迁】 | 降优先（ADR-0004 已缓解） |
| **度量先行** | ADR-0006：先度量记忆检索价值（10 session）→ 命中有用则建廉价重设计版，否则**冻结写侧** | 从"自动化"翻为"度量/很可能冻结" |
| **阻塞** | GEPA：待 eval 数据 | 撤分 |

---

## 六、工具验证证据账（grounded ledger）

- `ANTHROPIC_API_KEY` ABSENT；无 `.env`（探针）→ 外部 LLM hook 不可行。
- Stop hook `decision:"block"`+`reason`+`stop_hook_active`：code.claude.com/docs/en/hooks（R3-A 引官方文档）→ 重设计可行。
- `\b` CJK 探针：`/\b调研\b/.test("设计调研")`=false、`/\b调研\b/.test("做调研")`=false、`/\bresearch\b/.test("research-proof")`=true。
- SKILL.md:258/273 hermes=废弃注释；:263-264 悬空 arg 片段；:282-284 SPAWNED_SESSION 明确标注预留（R3-C 复核）。
- 语料：5 episode / ~10 promoted facts / 1 candidate / eval 0 字节 / 9 memory 脚本（R3-B 核对）。
- settings.json:43-52 Stop hook 已配置且为同步 `node` 命令。

## 七、收敛声明
R3-A ACCEPT（+条件 block 细化）、R3-C CONVERGED、R3-B 关键论点被作者接受。
无剩余需靠继续辩论解决的争点——唯一开放项（记忆是否值得读）由第五节的廉价可证伪度量裁决。辩论结束。
