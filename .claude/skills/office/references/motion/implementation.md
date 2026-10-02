# Motion implementation — 在实际 HTML 上解决缺口

motion-polish 已绑定 exact HTML/获准资产、真实源期待、具体缺口与本地实现效果范围后，
实现前完整读取。本文件拥有观察→复现→最小改动的方法；候选/接受身份由
`.claude/skill-os/runtime/prototype-delivery.md` 拥有，独立验收由 [review.md](review.md) 拥有。

## 观察与复现

1. 读实际入口和获准 CSS/JS 闭包。按 DOM 选择器/稳定节点、state/class/attribute、事件、
   transition/keyframes、WAAPI、timer 与卸载处理画出本次交互链；核实际栈和有来源的 motion token。
   只扫描获准范围，不用资产根或共用目录扩大读取。
2. 用源期待驱动现有产物，记录起始状态、输入、可观察响应、终态与恢复。
   每个缺口引用自己复核过的文件/节点和实际操作；代码风险与已复现失败分列。
   已充分就返回观察证据，不无故重做；本次必需动态不足就继续实现，不能用审计建议替代成品。
3. 实现前固定本次所需行为：全部原源 AC/STATE、动态目标、真实缺口、KEEP 和适用输入。
   反向/重复/中断、退出/取消、reduced-motion、键盘/焦点按实际相关性进入验证；无手势可记有据 N/A。

完成：每个待修项有复现、真实源结果、受影响文件/状态和可观察验收；未知产品结果回来源 owner。

## 最小实现的选择

| 实际需求 | 先检查的已有能力 | 要核的行为 |
|---|---|---|
| class/attribute 控制的状态切换 | CSS transition，列出具体属性 | 新目标能从当前呈现值续接；不误动画无关属性 |
| 已有对象进入/退出 | 现有渲染生命周期与 CSS/WAAPI | 首帧、退出期间可操作性、最终移除与焦点恢复 |
| 固定序列或一次播放 | 现有 keyframes/动画机制 | 重播、取消、fill 与完成后样式；不是见 keyframes 就拒绝 |
| 程序控制、取消或反向 | 原生 WAAPI 或既有 JS 机制 | effect 实例、当前值、完成/取消路径；验证实际浏览器能力 |
| 连续拖动/反向 | 既有 gesture/spring 或可用原生能力 | 实现前完整读取 [continuous-motion.md](continuous-motion.md) |
| tooltip 群、timer、pointer/hover/焦点症状 | 具体组件局部代码 | 修复前完整读取 [component-cases.md](component-cases.md) |
| 本次移动/键盘/viewport/scroll 症状 | 实际 support matrix | 修复前完整读取 [mobile-cases.md](mobile-cases.md) |

选当前环境里能完成任务的最小机制。复用确有来源且适用的 token；局部试值标明用途和验证，
不得偷偷升为全局 DS。时长、曲线和 spring 参数按实际任务调校，不把作者表值当科学定律。
transform/opacity 可先作为降低布局成本的候选；height、clip-path 或其他属性依据实际需要及测量，
不建立 GPU-only 禁令，也不只由 API 名称保证性能。库/API 配方按实际版本核验，缺能力如实返回。

## 生命周期与可操作性

- 把产品逻辑状态和呈现过程分开：提交/取消结果按源发生；动画结束回调不能成为唯一业务提交入口。
  业务确需等待的情况引用真实来源，并提供退出/恢复结果。
- 每个对象保留当前动画/timer 的稳定身份。新输入重定向或取消旧实例；完成回调校验仍属当前目标，
  防止旧回调覆盖新状态。事件、帧回调、timer 和 `finished` 的取消处理在退出/卸载时收敛。
- 退出保留可见性、命中区域、焦点与可访问状态的一致关系。隐藏后的对象不能残留可操作层，
  移除动画不能丢失已要求的输入/恢复，也不能机械等 `animationend` 才允许新输入。
- reduced-motion 同时覆盖 CSS 与 JS/WAAPI 分支；可用即时状态、静态提示、颜色或轻量淡化满足反馈。
  偏好在运行中变化时收敛当前呈现与真实终态。不是必须保留非零动画；反馈和任务可用性必须保留。
- hover 效果按真实输入能力处理，并保留键盘/触摸反馈；手势捕获和相关取消由连续运动参考细化。

## 实现交付

在已授权副本上实施，保留原件及真实 patch。patch 能对应实际 CSS/JS/状态处理改动，
spec 记录所用机制、实际参数、触发/序列、取消与偏好分支；不复制上游计划作为“已实现”。
对同一最终字节重放修复前操作和相关反例，观察开始/中间/终止、反向/重复及恢复。
静态检查与运行证据分开；无法运行必需行为就不报已解决。冻结候选后交给真正独立 QG。

完成：适用缺口在最终 HTML 上真实解决、全部源结果/KEEP 保留、patch/spec 与实际字节一致；
独立最终接受仍由 caller 的 gate 决定。本文件不自动开 worktree、选 top 3–5、安装库或调用 OD 迭代。

## 来源与许可

本地方法适配自 Emil Kowalski，`emilkowalski/skills` 固定提交
[`d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128`](https://github.com/emilkowalski/skills/tree/d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128)：
`skills/animate/SKILL.md`、`skills/animate/RECIPES.md`、`skills/improve-animations/SKILL.md`、
`skills/improve-animations/AUDIT.md`、`skills/improve-animations/PLAN-TEMPLATE.md`，均完整读取。
上游 improve 主体是审计/计划；实际写入由本地授权执行者承担，不继承默认执行/工作区语义。
MIT，Copyright (c) 2026 Emil Kowalski；[保留的完整许可](intent.md#上游许可)。无上游认证或背书声明。

<!-- FILE_END: references/motion/implementation.md -->
