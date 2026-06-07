# 外部 Skill 节点映射与打通记录 — 2026-06-07

已安装 5 个外部 skill（1/3/4/5/6，#2 impeccable 未装）。本文件是它们在 luca_gstack 工作流/plan-agent 中**用在什么场景、什么节点、带什么护栏**的权威记录，以及"打通"改了哪些点。

## 红队结论（是否真打通）

- **5/6（systematic-debugging / tdd）= 已真打通**：无路由冲突、无 hook 注入、与 verify/careful/redteam 互补；经 Skill tool 直接触发。
- **1/3/4 = 能跑但 brand-blind，必须加护栏**：实证风险 ①ui-ux-pro-max `--persist` 写出 #2563EB 蓝、零 #FF8000 意识；②design-system-architect 全局 PROACTIVE + 品牌盲；③extract-design-system 的 `audit` 会建议用竞品 token 覆盖 #FF8000/framework，且输出污染 repo。
- 关键事实：**route-guard 只路由 `skill-routing-map.yaml` 里登记的 skill**；故 1/3/4 故意**不进** route-guard（其触发词会劫持设计管线），改用 observability `rules.yaml` 在对应节点注入"绑定+护栏"。

## 映射表（1/3/4/5/6 → 场景 + plan-agent 节点）

| # | Skill | 场景 | plan-agent 节点 | 角色 | 护栏 |
|---|---|---|---|---|---|
| 1 | ui-ux-pro-max | A/B/C/D 全设计 | [设计]ux-brainstorm·[规格]design-brief·[原型]open-design/magicpath/html-prototype·[评审]ux-audit | 只读"设计知识神谕"，`search.py` 查 UX/字体/图表/a11y 喂决策（非节点，是工具） | 只查询；**弃其配色**(#FF8000 权威)；**禁 --persist/--design-system**；**不进 route-guard** |
| 3 | design-system-architect (+visual-design-foundations, design-system-patterns) | A 新功能 / D Agent化（需 token 体系时） | [规格]design-brief ↔ [工程链]tech-spec | token 架构思维：把 brand-tokens.md 工程化成下游可消费 token | **#FF8000 固定输入**；禁多品牌/暗色/白标；framework/ 只读；从属 open-design |
| 4 | extract-design-system | B/C/D 竞品相关 | [研究]ux-research / 竞品分析（截图之后） | 抽竞品站 token 作研究输入（参考非真值） | 回源对账 brand-tokens；**禁 audit 扫 repo/framework**；输出 gitignore；仅项目目录内跑；需 chromium |
| 5 | systematic-debugging | 跨场景·工程尾段+OS自维护 | [技术实现]task_execution（WA 遇 bug/断言 FAIL） | 根因优先调试闸"改前先定位"，配 quality-gate | 无（无品牌面） |
| 6 | tdd | 跨场景·工程尾段 | [技术实现]task_execution（WA 写有逻辑的 DEV U-block） | 红绿重构，补 verify 之外的"测试先行" | 无；注意非交互 WA 里"求用户确认测试计划"会落空 |

口诀：**5/6 在管线末端（写代码时自冒出）；1/3/4 在管线中段（研究/设计/规格），是 brand-blind 外部知识源，按节点绑定 + 上品牌锁。**

## 2026-06-07 追加：ux-brainstorm ↔ design-brief 解耦 + #1 phase 级嵌入

**定位锁定**：ux-brainstorm = **发散引擎**（2-3方案+Oracle对抗+交互架构+AI-Native判定）；design-brief = **收敛引擎**（规格契约：决策卡/状态/组件映射/Generation Packet）。design-brief **可独立**；检测到 ux-brainstorm 产出即**继承**不重做。

**解耦改动**（均在 invariant 可改区——description / phase 内容 / 模板 / rules，未动 phase 顺序/产出路径/FILE_END）：
- `design-brief/SKILL.md`：Phase 1 加「Step 1.0 上游继承检查」（有上游→承接 §5 AI-Native 判定、仅交互层复核、保留否决；无上游→全四层）；Phase 2 加 checkpoint 分支（有上游→核对 §10 已验证假设，不重挑战）；description 改「收敛引擎 + 继承」。
- `ux-brainstorm/SKILL.md`：description 改「发散引擎」。
- `ux-brainstorm/references/design-proposal-template.md` §13：交接清单标注源章节（§5/§10/§9）+「design-brief 直接继承不重做」红线。
- `CLAUDE.md`：skill 表两条改发散/收敛措辞 + 加 3 行决策规则。
- `optional-workflow-graph.yaml` `ux_brainstorm_to_design_brief` gate：加 consume-aware note。

**#1 嵌入升级**：rules.yaml R-20260607-001 由泛泛「可用」sharpen 成 **phase 级取数 recipe**——ux-brainstorm Phase4 每方案取 UX/图表/字体依据；design-brief Phase3 取状态规则 + Phase6 取 `--stack shadcn` 组件映射；ux-audit 取规范当标尺。品牌锁不变。

## 打通改了哪些点（全套护栏，2026-06-07）

| 触点 | 改动 | 状态 |
|---|---|---|
| `.claude/skill-os/skill-routing-map.yaml` | builtin_skills 加 systematic-debugging（调试/报错/根因/debug…）+ tdd（tdd/测试驱动/写测试…），窄词、weight 7 | ✅ 已改 |
| `.claude/observability/rules.yaml` | 加 R-20260607-001/002/003：把 #1/#3/#4 绑到设计·规格·研究节点并带品牌锁，经 get_rules.py 注入（不动受保护 SKILL.md 正文） | ✅ 已改 |
| `.gitignore` | 加 `.extract-design-system/` `design-system/`，防竞品 token 污染 env repo | ✅ 已改 |
| `~/.claude/agents/design-system-architect.md` | 品牌锁段（blockquote 置于 frontmatter 后，CRM 场景必读；非 luca/CRM 项目可忽略） | ✅ 已贴（2026-06-07，全局 subagent，repo 外不入 git） |
| 本文件 | 落盘映射 | ✅ |

**未碰**：1/3/4 不进 route-guard；office 各 SKILL.md 正文（invariants P1–P7）；framework/（只读）。

## #3 全局 subagent 品牌锁片段（已贴 2026-06-07，留档）

下面这段**已加到** `~/.claude/agents/design-system-architect.md` frontmatter 之后（blockquote 形式）：

```md
## ⛔ luca_gstack brand-lock (CRM 场景必读)
为纷享销客 CRM 产品做设计系统时：brand-tokens.md 的 #FF8000 是**固定输入，不是可设计项**——
绝不发明/覆盖主色板；**不做多品牌、暗色、白标**主题层；`framework/` 母版**只读**，绝不改。
输出只在所选 design system 上叠**品牌色 + 文字色**。本 skill 的蓝/暗色示例仅为通用范式，落到本项目一律以 brand-tokens.md 为准。
```

## 2026-06-07 地毯式审计 + 修复（4 subagent 并行：场景 / 绑定 / 冲突 / 解耦）

审计发现并已修复（全部复验通过）：
- **3 orphan 注入**：ux-audit / tech-spec 的 preamble 缺 `get_rules` → 已补（现 ux-audit 注入 R-001/003/523，tech-spec 注入 R-002）；magicpath 是外部插件委托无法消费 → 从 R-001 scope 移除（design-brief 上游已带 #1 进 packet）。
- **§编号全错**：design-brief 继承分支 + 模板「对下游交接」块引用的 §5/§9/§10 与实际章节错位（模板标题本就无编号）→ 全改**按章节名引用**（已验 5 个章节名真实存在）。
- **场景覆盖洞**：#4 加 `ux-audit` 进 R-003（scene C / 评审可达竞品 token 抽取）；#1 加 `figma-demo` 进 R-001。
- **冲突**：RECOMMENDATIONS 示例 `--design-system`（R-001 已禁）→ 改 `--domain`；R-001 文本消歧（禁的是 search.py 的 flag，与 OD designSystemId 无关）。
- **latent**：rules.yaml `scenes: [*]` 非法 YAML → 全部 `["*"]`（现标准 safe_load 通过）。
- **R-001 scope 终值**：[ux-brainstorm, design-brief, open-design, html-prototype, ux-audit, figma-demo]。

审计判定 **clean（无需改）**：routing 5/6 无 substring 冲突（w7 平局 = intended MULTI）；解耦 standalone 路径完整；运行可行性全 pass；品牌锁 guard 在位。
**有意保留（LOW，已评估可接受）**：design-system-architect 正文仍含通用蓝/多品牌范式——guard 已声明「优先于下文一切通用范式」+「非 CRM 可忽略」+ R-002 双重注入，不重写上游 ~150 行；Phase A 仍自行推 AI 方向——Phase 1 继承四层 + NEEDS_CONTEXT 兜底已覆盖主要风险。

## 再跑/再扫机制

```
Workflow({ name:'external-skill-scout', args:'<focus 领域>' })   # 对 vetting-registry 去重，只报新东西
```
配套文件：`RECOMMENDATIONS-2026-06-07.md`（推荐报告）、`vetting-registry.yaml`（已审清单）。
