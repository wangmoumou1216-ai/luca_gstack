# ADR-0007: 观望清单（P2）

状态: 提议 (P2 — 暂不做，设触发条件后重评)

理念正确或方向有吸引力，但当前 ROI 不足 / 可行性存疑 / 依赖前置成果。各列重评触发条件。

## W1 — 重型编排层瘦身或重构
- **背景**：A2 实证编排 5-agent 系统 22-30% paper-only；hierarchical 模式因"WA 禁套娃"规则空转；turn-count 当 token 代理不可靠。B1 显示 CrewAI 把 delegation 实现为一次 tool 调用（=Claude Code 的 Task 工具）——即"不能套娃"才是与设计矛盾的那条规则，而非 hierarchical 设计本身错。
- **为何观望**：到底是"修好让它真能套娃"还是"砍掉空转层保留单层"，是战略取舍；单用户低使用强度下，**先减法（默认砍空转）可能比修复更划算**。需先观察 ADR-0005/0006 落地后编排层的实际使用频率。
- **重评触发**：当出现真实的多 subagent 协作高频需求，或决定保留编排层时——届时按 B1 的 delegation=tool call + reducer 单状态 + RetryPolicy 字段重构。

## W2 — 真实 token/usage 计量替代轮数代理
- **背景**：A2 指出 orchestrator.md:317 自认"无法测 token"，退而用轮数。B1: CrewAI `TokenProcess` 从每次 LLM response.usage 累加真实 token。
- **为何观望**：Claude Code 主 session 能否读到自身 transcript 的 usage 尚不确定——可行性存疑。
- **重评触发**：确认 harness 暴露 usage 接口后，做"真实 token 估算"替代轮数 checkpoint 触发。

> ⚠️ 辩论修订：W3 GEPA 撤销 1.6 评分，改为"阻塞中"（不独立计分）——依赖 ADR-0006 产出 eval 数据，现 eval pairs.jsonl = 0 字节。详见 `../DEBATE-CONCLUSION.md`。

## W3 — GEPA 接入
- **背景**：延续上轮决策——GEPA 需 eval 数据，但 A4 实证 eval 系统全 skill 0 字节。
- **为何观望**：前置依赖（eval 数据）不存在。
- **重评触发**：**ADR-0006 落地、eval 文件被自动写入且累积 ≥ N 条（建议 N≥30）后**，重新评估接 GEPA。

## W4 — 采用官方 skills 替换自维护
- **背景**：B3 指出 anthropics 官方 pdf/docx/xlsx/pptx/skill-creator 可替换自维护同名 skill；本环境已内置这些官方 skill。
- **为何观望**：低危但非紧急；需逐个比对自维护版本是否有定制逻辑会丢失。
- **重评触发**：维护某个自有同名 skill 的成本浮现时，逐个评估迁移到官方版。

## W5 — reducer 单状态 / Command 对象（编排理念）
- **背景**：B1: LangGraph 用 `Annotated[type, reducer]` 自动合并状态、`Command(update,goto,graph=PARENT)` 单对象携带状态+路由+handoff。可解 A2 的"3 文件 handoff 矛盾"。
- **为何观望**：markdown-spec 单 session 无法真正自动 merge typed reducer，停留概念层；与 W1 编排决策绑定。
- **重评触发**：随 W1 一并评估。
