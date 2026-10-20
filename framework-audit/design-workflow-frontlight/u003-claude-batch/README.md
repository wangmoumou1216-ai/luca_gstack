# U-003 补测（Claude 端）：meeting-assistant，新链 C0 对直达 B

2026-10-19/20，用户授权补跑 U-003 后，因 token 有限只跑了最小对照。结论与限度见
`framework-audit/2026-10-19-frontlight-plan-to-delivery-review.md` §3.1，本目录只放可核对的原始证据。

- 案例条件与验收：`shared-input.md`、`criteria.md`（Codex 预注册，合成场景，无真实用户数据）。
- 两组：C0 = 候选规则 a1d3078 的 brainstorm(focused) → ux-brainstorm(focused) → design-brief，全程不检索；
  B = 旧 design-brief(d0c33fa) 直接吃原始需求。渲染合同相同，渲染和盲评都不知道组别。
- 盲评编号与组别：he330f2 = C0，h5a2a83 = B。盲评报告：`judge-he330f2-C0.md`、`judge-h5a2a83-B.md`。
- 结果：两组关键任务均为 7 通过 / 1 部分 / 0 失败。C0 的不完整项是 T5（检索失败后产品内无可点重试），
  B 的是 T8（桌面端展开依据后"主问题"卡被压成细条并重叠，手机端录音状态条随页面滚走）。

| 步骤（Claude 子 agent token 口径） | C0 | B |
|---|---:|---:|
| brainstorm | 197,140 | — |
| ux-brainstorm | 248,234 | — |
| design-brief | 212,270 | 127,221 |
| 前段合计 | 657,644 | 127,221 |
| 渲染 | 130,436 | 95,704 |
| 盲评 | 106,346 | 87,182 |
| 前段耗时 | 约 62 分钟 | 约 4 分钟 |

限度：每组 1 份生成；两组由不同评审实例打分；C0 的嵌套 Oracle token 可能未计入（UNKNOWN）；B 没有独立评审；
未测研究增量（C 组）与旧完整链（A 组）；HTML、Brief、Packet 与截图只在本机，未入库。

追加（2026-10-20）：`judge-hfix01-B-fix1.md` 是对 B 原型做 2 行 CSS 定点修（B-fix1）后，另一位独立评审者的盲评复测（T8 全测、T1–T7 快速回归、Q/V 略）。它确认两个目标缺陷已修，同时报出新的 T8 项（每次整页重渲染后焦点回到 BODY；触控目标 20/24px），所以定点修一轮并不保证全过，这与评估报告 §9.1 的结论一致。
