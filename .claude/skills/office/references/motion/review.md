# Motion review — 独立验实际候选

本次最终候选存在动态目标或相关实现风险时，独立 QG 于验收前完整读取。
实现者的 findings、自报 PASS 和静态规则不能代替独立运行；caller 提供当前 exact 候选、
完整真实源期待、预冻 required 行为集及实际运行范围。身份校验由 prototype-delivery owner 处理。

## 先固定验收对象

核本次候选 path/hash、入口/获准闭包和 spec，对照全部原 D/STATE/AC、用户动态目标与 KEEP。
没有正式 Brief 就用真实用户期待，不补造 ID；有真实 source handoff 才启用其源合规检查。
PREACCEPT 验当前候选，不要求先存在 accepted 证书，也不查旧 final 替代本次输入。
候选变化返回 caller 重新冻结，不将旧失败改成当前通过。

## 静态与运行两类证据

| 维度 | 静态复核 | 实际运行要反证什么 |
|---|---|---|
| 功能结果 | 事件到产品 state、提交/取消、资源清理 | 操作得到源要求结果；动画结束不丢提交/取消 |
| 动态目标 | 属性、触发、序列、延迟、退出路径 | 开始/中间/终止真的发生，不瞬移或仅终态正确 |
| 重复/中断/反向 | 当前实例、呈现续接、旧回调保护 | 本次适用新输入不中断任务、不跳旧端点、不被旧结果覆盖 |
| reduced-motion | CSS 与 JS/WAAPI 偏好分支 | 浏览器偏好驱动后任务仍可完成，状态/反馈/焦点可感知 |
| 输入与恢复 | hover/pointer/键盘、隐藏态与焦点策略 | 相关触摸/键盘操作、Escape/重试/reset/焦点恢复仍符合源 |
| 保持范围 | 实际 diff 与显式 KEEP | 原业务、权限、输入和保持项没有被微交互修复改变 |
| 性能症状 | 高成本属性、读取/写入、重复 timer/handler 风险 | 有症状时用相应 trace/测量验证；没有测量不报 FPS/GPU 保证 |

操作预先固定的行为集，保存开始、至少一个有效中间观察及终止结果；时间线 trace、driver
采样或可核时间轴录像可以支持过程。截图支持可见终态，不证明时序或连续性。
需要慢放才能定位问题时使用观察工具；若临时改候选参数，恢复并重验冻结最终字节。
真机与性能测量只针对本次依赖的声明；相关设备不可达就保留该声明 UNKNOWN。

## 反例与判决

对实际可重复/反向交互，尝试前一动作尚未结束就输入下一动作；对 timer/退出尝试旧回调
晚到、取消或重建。检查 reduced-motion 在实际浏览器媒体偏好下仍可用。
重要新增 guard 的 known-bad/删除 guard 对照只在已授权隔离副本执行，并保留同操作证据；
fixture 常量、自写 PASS 字段或检查到了 CSS 不算运行 oracle。

每条结果写 `ID | expected | observed | PASS/FAIL/UNKNOWN/N/A | evidence`：

- PASS：同一候选上有适当证据，源结果和过程均符合。
- FAIL：可复现反例违背 required 期待，返回实现者修复；原票保留。
- UNKNOWN：运行、设备、来源或测量不足，说明具体缺口；required UNKNOWN 不能接受最终交付。
- N/A：输入/作用域表明确无此行为；不能把本次明确动态目标写成 generic N/A。

所有 required 项必须逐项出现且通过；可选项未知只限制相关声明。报告使用 QG 已有输出合同，
绑定当前候选/最终字节与实际证据；本文件不建第二报告格式或认证模型身份。
可读性、响应速度与一致性按真实任务判断；作者 taste 可以成为有理由的建议，不能自动阻断
纯 fade、键盘触发、特定 easing、非 GPU 属性或超某一固定时长的合法实现。

完成：完整 required 集有独立实际判决，失败/未知未被省略；最终接受由 caller 完成。

## 来源与许可

本地方法适配自 Emil Kowalski，`emilkowalski/skills` 固定提交
[`d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128`](https://github.com/emilkowalski/skills/tree/d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128)：
完整读取 `skills/review-animations/SKILL.md`、`skills/review-animations/STANDARDS.md`。
采用反证、复核和运行方法；作者绝对偏好与固定参数没有成为本地科学阈值。
MIT，Copyright (c) 2026 Emil Kowalski；[保留的完整许可](intent.md#上游许可)。无上游认证或背书声明。

<!-- FILE_END: references/motion/review.md -->
