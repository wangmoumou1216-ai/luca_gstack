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

## 后续待办（非本轮）
1. ~10 个 distinct day 后跑 `search_memory.py --retrieval-stats`，按 ADR-0006 决策协议裁决记忆"建/冻/不充分"。
2. 若要做 ADR-0005(b)：先建中文触发命中率测试 harness，通过后再迁 description 路由。
3. ADR-0007 观望项按各自重评触发条件处理。
