# 治理执行日志（Governance Log）

> 把 DEBATE-CONCLUSION 的行动表落地。每项闭环：**fix-agent → 质量门禁 subagent（强制提问）→ 2 轮辩论 → 判定 → verify.sh → 提交**。
> 全程工具验证，不空辩。本日志是实施层的权威记录（优先级高于 DEBATE-CONCLUSION 的历史措辞）。

执行范围（用户确认）：P0 四项 + ADR-0005(a) SSOT 派生 + ADR-0006 度量先行。
回退基线：`7295ec2`（改动前全 untracked，零 commit）。

## 闭环结果总览

| 项 | fix | 门禁提出的问题 | 辩论裁决 | 判定 | commit | verify |
|---|---|---|---|---|---|---|
| ADR-0001 死代码 | 删 orphan 脚本 + hermes 死目录 + 修悬空片段 + 同步 office/.agents | ①CHANGELOG:26 悬空引用 ②office/.agents 标题分叉 | ①**辩护**（0.2.0 是不可变历史，改加 Unreleased 条目）②**接受**（同步标题/触发列表） | REASONABLE | `1dc1475` | PASS=45 |
| ADR-0004 一致性 | compare 补 input-modes、superpowers 统一、品牌色、docs 路径、episodic 计数 | ①Fix3 删了 framework 在用的 #EFF1F3/#181c25（信息丢失，HIGH-ish）②直改 promoted-facts 触红线 | ①**接受**（恢复在用值，#F5F5F5/#333333 确属无用保持删除）②**接受**（记为授权 override） | REASONABLE | `6e3683a` | PASS=45 |
| ADR-0003 路由契约 | AGENTS.md 路由语义同步到 CLAUDE.md（canonical） | 反向漂移：AGENTS.md 比 canonical 更精确（reverse drift, LOW） | **接受**（把"4条件"回填 canonical CLAUDE.md，两侧 lockstep） | REASONABLE | `414e6dc` | PASS=45 |
| ADR-0002 route-guard | 长词优先消歧（非 \b）+ 负例测试 | **HIGH**：generic 长词优先把 `多维表格[lark_base]` 误 shadow 给 `飞书多维表格[lark_sheets]` → 安全 STOP 变确信错路由 | **接受**（加严格权重护栏：仅当更长触发词的 route 权重严格更高才 shadow；等权 tie 保持安全 STOP） | REASONABLE | `57aa76c` | PASS=45 |
| ADR-0005(a) SSOT | 扩展 check-routing-map.mjs 加 6 项 SSOT 一致性检查 | ①S17 与 S10 跑同一脚本（冗余，MED）②硬编码 HIDDEN_SKILLS（新漂移面，LOW） | **接受**（①删 S17+alias 折进 S10 ②HIDDEN_SKILLS 改从 CLAUDE.md 解析，fail-loud） | REASONABLE | `4115b5b` | PASS=45 |
| ADR-0006 度量先行 | search_memory fail-safe 检索埋点 + --mattered + --retrieval-stats | **HIGH**：session 恒为 "unknown" → distinct-sessions 失效，10-session 检查点无法应用；MED：mattered 难记 → 0 会误触自动冻结 | **接受**（①session 无真实 id 时回退 date 桶 ②裁决规则改：0-mattered=不充分≠自动冻结，冻结需客观证据） | REASONABLE | `135d928` | PASS=45 |

## 关键过程亮点（门禁真的拦住了问题）
- **ADR-0002 HIGH 拦截**：fix-agent 的通用方案会把一个 routing-map 数据缺陷（飞书多维表格 误挂 lark_sheets）武器化成确信错路由。门禁实测复现，权重护栏修复后 18/18 测试通过、等权 tie 回到安全 STOP。
- **ADR-0004 信息丢失拦截**：fix-agent 误判 #EFF1F3/#181c25 为"无来源"删除；门禁 grep 证明它们在 framework 模板用了 30+ 次。改为"保留在用值 + 记录 brand-tokens.md 意图与 as-built 现实"。
- **ADR-0006 度量目的拦截**：埋点本身没坏，但 session 恒 unknown 会让"10 session"度量名存实亡；且 mattered 缺信号会误触删 7 个脚本。两者都修。

## 授权 override / 历史说明
- **promoted-facts.yaml 直改（SC-20260523-003 红线）**：SF-001 品牌色是对**既有错误事实**的更正（#F5F5F5/#333333 在 framework 零引用），非新增 stable fact。记为授权 governance override。
- **CHANGELOG 0.2.0 不可变**：ADR-0001 未改 0.2.0 历史条目（Keep-a-Changelog 惯例），改加 `[Unreleased]` 条目记录删除。
- **DEBATE-CONCLUSION 历史措辞保留**：其中"命中≈0→冻结"是辩论当时结论；治理阶段细化为"0-mattered=不充分"。以本日志 + ADR-0006 决策协议为准。

## 未做（明确边界）
- ADR-0005(b) description 路由迁移：**未做**，门禁通过中文命中率测试前不迁。
- ADR-0006 记忆重建 / hook 内 LLM / session-sync print→execute：**未做**，待 ~10 session 度量后裁决。
- ADR-0007 观望项（编排瘦身 / token 计量 / GEPA / 官方 skill 替换）：未动。

## 验证总账
- 6 项全部 verify.sh **PASS=45 FAIL=0 WARN=1**（WARN=I4 ADR 目录，non-blocking，本就存在）。
- route-guard 测试 18/18 PASS。SSOT 漂移检测经注入实测会 FAIL（非纸面检查）。
- 检索埋点 fail-safe 经 chmod 000 实测：search 仍 exit 0、输出字节不变。
- 每项均为独立 commit，可单独 `git revert`。回退基线 `7295ec2`。

## 治理续轮 — Tier-4 缺口（2026-05-27）

> 审计发现但首轮未做的 Tier-4 项。每项同样走 fix→门禁→2轮辩论→判定→commit。

| 项 | 结果 | commit / 处置 |
|---|---|---|
| T-CI 接 CI 执行测试/检查 | ✅ 完成 | `c1e5d9d`：8 项 CI-safe 检查接入；附带守住 check-quality-gates 的 unguarded readFileSync（CI dangling symlink 会崩） |
| T-SPAWNED 清 LUCA_SPAWNED 死代码 | ✅ 完成 | `7115a0e`：30 探针 + 3 doc 节，0 残留；worktree 排除 |
| T-ORPHAN orphan 记忆脚本 | ✅ 完成 | `deb2ef4`：删 mine_blockers（0-ref）；record_eval/collect_eval 是 deferred GEPA infra，保留+文档化，不 pre-empt gated 决策 |
| T-VERIFY 对齐 verify.sh S2/S16 | ✅ 完成 | `6d2cbc5`：tri-state（deactivated=PASS / active+consistent=PASS / active+broken=FAIL）适配并行 auto-deactivate feature |
| T-SYNCNOISE session-sync 噪声 | ✅ 完成 | `f954c08`：idempotent 写 + gitignore/untrack pending-extraction.md |
| T-DUP 规则重复收敛 | ⏭️ 跳过（mirage） | 真重复已在 ADR-0003/0004 解决；剩余 #FF8000(50)/项目门禁(7) 绝大多数是功能性使用（HTML 色值、路由关键词、spec）。广泛 dedup 低值高险、反 subtract-first |
| T-TIEBREAK route-guard ±1 窗口 | ⏭️ 跳过（counterproductive） | ±1 窗口是 intended MULTI-ask 的承载逻辑（figma 测试要求 MULTI[magicpath,html-prototype]）；收紧会破坏故意的 ask 并制造 confident-wrong-single，违反 ADR-0002 教训。A1 over-flagged |
| T-PREFLIGHT preflight/quality-gate 重叠 | ⏸️ 推迟到 ADR-0007 W1 | 合并是 orchestration contract 的结构性改动 = 已 gated 的"编排瘦身"决策；piecemeal 做会 pre-empt 并打磨可能被整体瘦身的层 |
| T-DECISION 固化 ADR-0006 度量→裁决 | ✅ 完成 | `a13b1f3`：`--retrieval-stats` 自算裁决（STILL-ACCUMULATING/BUILD/FREEZE/INCONCLUSIVE）+「⏰ DECISION DUE」；review window=max(distinct sessions, distinct days) 防 stable-session-id 卡死 |

**续轮验证（用户要求，独立复跑）：** 5 项已提交修复全部复验通过——不仅 happy-path，失败路径也确认会正确 FAIL（dangling workflow-state→S2 FAIL、active+broken→check-project-links FAIL、quality-gates 在 dangling 下 exit 0 守卫成立、session-sync idempotent md5 不变、LUCA_SPAWNED 0 残留、mine_blockers 0 live ref）。verify.sh PASS=45 FAIL=0；route 测试 18/18；CI 8 检查独立跑通；git tree 干净。

环境事件：续轮中并行落地了 `feat(session-restore): auto-deactivate project on every startup`（外部 merge，移除项目 symlink + 改 hooksPath）。经用户确认为有意特性。已授权恢复 `core.hooksPath .githooks`（重启密钥扫描）。verify.sh S2/S16 已由 T-VERIFY 适配该特性。

续轮元发现：审计 A1-A5 存在 over-flagging——T-DUP 与 T-TIEBREAK 经 scrutiny 不成立（功能性使用误判为重复 / 安全 MULTI-ask 误判为噪声）。剩余"仍开着"的项主要落在 deferred 的 ADR-0007 编排层 + A5 context bloat，非零散漏网。

## 后续待办（非本轮）
1. ~10 个 distinct day 后跑 `search_memory.py --retrieval-stats`——现已**自算裁决**并标「⏰ DECISION DUE」（T-DECISION 完成）；到期时按其输出的 BUILD/FREEZE/INCONCLUSIVE 处置记忆写侧。此为解锁 ADR-0007 编排层的前置 gate。
2. 若要做 ADR-0005(b)：先建中文触发命中率测试 harness，通过后再迁 description 路由。
3. ADR-0007 观望项（编排瘦身 W1，含 T-PREFLIGHT 合并 / turn-count→真实计量 / handoff 单一来源 / GEPA / 官方 skill 替换）按各自重评触发条件处理。
4. A5 context bloat（CLAUDE.md/AGENTS.md ~5.8K + 仍在增长、启动 vs 懒加载矛盾）：与 ADR-0007 编排瘦身一并评估；注意 CLAUDE.md/AGENTS.md 正被并行特性改动，避免冲突。
5. A3 hook 手写 YAML 正则脆弱：低优先；若做需避开并行改动的 session-restore.mjs。
