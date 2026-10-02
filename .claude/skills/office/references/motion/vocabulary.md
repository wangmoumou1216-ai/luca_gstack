# Motion vocabulary — 校准含混口述

仅由 [intent.md](intent.md) 在真实动效词义歧义时指向，澄清前完整读取。
已经清楚的产品结果直接继承；本文件是命名参考，不启动设计/生成流程。

## 命名步骤

保留原话及其对象、起止状态和可观察变化。给一个主候选，必要时最多给两个近义候选，
各用一句话说明如何区分；只有不同解释会改变产品结果时才需要用户选择。
匹配不充分就标“近似”或“未知”，继续用可观察行为描述，不把术语当确认。

| 用户描述的变化 | 主候选 | 易混点 |
|---|---|---|
| 渐渐出现/消失 | fade 淡入/淡出 | 只变透明度，不等于从一侧滑入 |
| 从边缘移动进来 | slide 滑入 | 指位置变化，不指定距离或方向 |
| 从小变大 | scale 缩放进入 | overshoot 过冲才额外涉及 pop/bounce |
| 出现时略过头再回落 | pop / bounce | pop 侧重进入，bounce 描述过冲回落 |
| 逐渐揭开一部分 | reveal 揭示 | clip-path 是裁切路径，mask 可含透明度过渡 |
| 多个对象依次出现 | stagger 错峰 | orchestration 还包含多步骤间的协调 |
| 同一位置旧内容换新内容 | crossfade 交叉淡化 | morph 指形状/形态连续变化 |
| 同一对象从一处到另一处 | shared element transition | layout animation 不一定跨视图保持同一对象 |
| 已有对象尺寸/位置变化 | layout animation | 说明变化类型，不决定布局实现 |
| 从触发按钮处长出 | origin-aware animation | transform-origin 是实现锚点，不是产品需求 |
| 进度随滚动位置变化 | scroll-driven animation | scroll reveal 可能只在进入视口时触发一次 |
| 手指带着对象移动 | drag 直接拖动 | momentum 是释放后的惯性，非拖动本身 |
| 拖离界面并关闭 | swipe to dismiss | 关闭/取消结果须有产品源，不由名称推导 |
| 越过边界后阻力增大并回去 | rubber-banding | 不是提交阈值，也不承诺平台原生物理参数 |
| 可在运动中抓住再转向 | interruptible animation | 是否保持速度连续须看实际实现与源期待 |
| 模拟弹性趋向目标 | spring | damping、stiffness、mass 的含义依所用 API |
| 速度随时间改变 | easing 缓动 | ease-in/out/in-out/linear 描述速度趋势，不是推荐曲线 |
| 一直重复或往返 | loop / alternate | 是否需要停止、暂停或只播一次须另有来源 |
| 数字滚动成新值 | number ticker | tabular numbers 是等宽数字排版，非动效 |
| 加载占位上有扫光 | skeleton / shimmer | 加载真实性、内容可用时机仍由实际状态决定 |

输出示例：原话“要有点弹” → 主候选“spring 弹性趋近”，近义“pop 进入时过冲”。
若原话未说明是进入还是拖动后的回落，保持这项未知；不得据此添加拖拽、关闭动作或安装库。

完成：原话、主候选、近义差异、近似/未知状态都明确，必要产品选择有真实答案。
命名不指定时长、曲线、技术栈、视觉风格，也不自动成为 MUST。

## 来源与许可

本地释义适配自 Emil Kowalski，`emilkowalski/skills` 固定提交
[`d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128`](https://github.com/emilkowalski/skills/blob/d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128/skills/animation-vocabulary/SKILL.md)，
完整读取 `skills/animation-vocabulary/SKILL.md`；中文描述和歧义步骤为本地适配。
MIT，Copyright (c) 2026 Emil Kowalski；[保留的完整许可](intent.md#上游许可)。无上游认证或背书声明。

<!-- FILE_END: references/motion/vocabulary.md -->
