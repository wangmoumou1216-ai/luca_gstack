# Component cases — 按真实局部症状修复

仅在 OD 后实际 HTML 存在 tooltip 群延迟、timer、pointer/hover/焦点相关症状时，
于对应修复前完整读取。它不前置锁定组件细节，不要求加载上游 persona 或整篇 UI/布局规则。
先复现具体组件和输入路径，再选下表适用项；无症状不加载。

| 症状与定位 | 最小方法 | 必须复验 |
|---|---|---|
| 在 toolbar 相邻 tooltip 间每次等待或残留旧提示 | 读现有 group/open 状态与 delay，统一群状态与 timer 身份；已授权体验范围可调后续延迟 | 首次、移到邻项、移出群、再进入；旧 timer 不开错对象 |
| 从触发区移到浮层时提示闪退 | 查 hover gap、命中区域和 pointerleave 条件；在授权局部维持有效交互路径 | 穿越间隙、进入浮层、真正离开；键盘 focus/blur 与 Escape 仍有效 |
| toast/timer 提前消失、反复开关后双触发 | 一对象一 timer 身份；用剩余时间/截止点维护实际计时；重定目标先收回旧 timer | 暂停/恢复、重复打开、关闭再重建、卸载；旧回调不能移除新对象 |
| 页面隐藏时 toast 计时结果不符合源 | 按现有/已确认规则处理 visibility pause/resume，避免重置完整时长或重复监听 | hidden→visible 的剩余计时和状态；源未要求暂停时保留其语义 |
| 拖动离开组件后停止或第二触点让其跳变 | 定位当前 pointerId、capture 和 cancel，相关连续过程读 [continuous-motion.md](continuous-motion.md) | 越界拖动、捕获丢失、取消/多触点；只一个有效驱动 |
| 触摸后 hover 粘住，键盘没有对应反馈 | 核 hover/pointer 能力与 focus/active 路径，局部修复媒体条件和反馈 | 实际相关输入、focus 可见、离开/取消后复位 |
| 快速切换后动画或焦点落到旧对象 | 绑定当前对象/目标与回调代次，核退出生命周期与恢复目标 | 新输入在旧动画期间发生；只当前结果生效，焦点去向符合源 |

## 实现核对

每条修复绑定具体 selector/稳定对象与文件，读实际引用代码确认不是推测。
timer、listener、帧回调、Animation 实例用稳定身份持有，退出清理只清当前对象资源；
重建不能把旧对象的延迟副作用带过来。把剩余计时、展示序列和业务结果分开。

产品语义已有来源时沿用；曲线、延迟与呈现连续性在已授权范围内调校。
新增 hold-to-confirm、dismiss、取消提交等业务动作或权限变化回真实设计源，
不能因为 tooltip/toast 的名称套入上游模式。显式 KEEP 仍有效，样式/组件变化没有自动 KEEP。
既有 headless/原生组件能力可复用；本参考不自动选库、安装、改全局 CSS 或重绘页面。

验证记录症状操作、原结果、修复后的实际过程/终态、相关键盘/焦点与 reduced-motion。
仅代码看似正确时标静态风险处理，不能宣称症状运行已消失；无真实输入设备就限制相应声明。
完成：每个本次症状在同一最终候选上复验，timer/输入/恢复收敛，产品结果及保持范围不变。

## 来源与许可

本地方法适配自 Emil Kowalski，`emilkowalski/skills` 固定提交
[`d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128`](https://github.com/emilkowalski/skills/blob/d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128/skills/emil-design-eng/SKILL.md)，
完整读取 `skills/emil-design-eng/SKILL.md`；采用 tooltip 群、timer/visibility、hover gap、pointer 方法。
不继承其全局组件规范、固定 toast 时间、persona 或科学性能保证。
MIT，Copyright (c) 2026 Emil Kowalski；[保留的完整许可](intent.md#上游许可)。无上游认证或背书声明。

<!-- FILE_END: references/motion/component-cases.md -->
