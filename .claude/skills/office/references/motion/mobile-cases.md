# Mobile cases — 输入、键盘与可见视口

仅在本次真实移动目标，或 keyboard/viewport/safe-area/scroll/touch 症状适用时，
于对应修复前完整读取。按当前 support matrix、输入能力和获准运行范围选分支，
不是每个桌面任务都要真机，不因窄屏推断只有触摸。

## 症状到验证

| 实际症状 | 检查与局部候选 | 操作与可观察结果 |
|---|---|---|
| tap 后 hover 残留或反馈晚到 | hover/pointer 能力查询、`:active`/pointerdown 反馈与 click 提交分工 | 触摸/鼠标/键盘相关路径；取消后复位，提交仍按真实源 |
| 浏览器 chrome 展开后底部动作被挡 | 实际 viewport 与布局；根据任务选 dvh/svh 或现有方案，核 support matrix | chrome 展开/收起、旋转；动作可见可达，滚动位置合理 |
| 软件键盘打开后输入/提交不可见 | 布局与 visual viewport、滚动容器、fixed 元素、focus 与 resize 回调 | focus→键盘打开→输入→提交/关闭→恢复；输入与焦点保持 |
| focus 时自动放大或文本变形 | 核实际浏览器、输入字号与文本缩放；按项目可读性范围处理 | focus/blur、文本放大与页面缩放仍可用；不禁 zoom |
| notch/home indicator 挡住操作 | 现有 viewport 配置、safe-area inset 与边缘控件 padding | 本次设备/模式/方向；内容和触摸目标不被遮挡 |
| sheet/内列表边缘滚动带动背后页面 | 容器与页面 scroll 归属、overscroll behavior、已有锁滚动/释放 | 上下边界、关闭后滚动恢复；文档本来需要的滚动/刷新保留 |
| carousel 与纵向滚动互抢 | 原生 scroll/snap 或现有 gesture 轴归属；核局部 touch-action | 水平拖动与纵向滚动各得其所，取消可恢复，zoom 可用 |
| 控件 long press 误选、正文不能复制 | 只在实际控制表面核 selection/callout；保持正文语义 | 控件操作与正文复制同时可用，不在 body 禁复制 |
| 实际触摸目标难命中 | 已确认可访问性/平台要求、密度、命中范围 | 本次输入与缩放下可可靠操作，不偷偷改数据/动作 |

## 平台方法与范围

先登记 OS/browser/版本、输入能力、页面或 PWA 模式、方向和相关 preference；混合输入
设备要验证本次适用路径。用能力与实际事件判断，不按 user-agent 或宽度猜触摸。
CSS/meta 方案能解决时先核现有能力；确需 visualViewport/JS 时处理 resize/scroll、
卸载和恢复，不重复监听。不把“100dvh 已存在”当键盘行为通过。

viewport、safe-area、touch-action、scroll 锁和 tap highlight 的改动只落获授权区域。
根 meta/全局 CSS 需要当前范围允许；不能将局部症状变成 root 全局改版。
去除浏览器反馈时保留可感知的替代；禁止 zoom/正文选择不能作为动效修复方案。
具体版本/API 兼容按真实环境核验，不将上游某平台数字硬化为全部产品字号或尺寸规则。

## 证据边界

代码检查、浏览器模拟和真机结果分列。模拟可验证其实际驱动的 reflow、媒体偏好、输入与
滚动结果；真机相关 keyboard/chrome/safe-area/触感声明需要对应真实设备/模式证据。
缺真机就将依赖它的声明标 UNKNOWN；若它是当前必需结果，不能宣称已全部交付。
不因此否定已有桌面证据，也不默认增加设备、LAN 服务或远程调试效果权限。

完成：适用症状、输入/支持矩阵、操作、恢复结果与证据逐项对应；未验证设备声明明确可见。
实际连续拖动相关时再完整读取 [continuous-motion.md](continuous-motion.md)，其他方法不全量加载。

## 来源与许可

本地方法适配自 Emil Kowalski，`emilkowalski/skills` 固定提交
[`d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128`](https://github.com/emilkowalski/skills/blob/d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128/skills/mobile-native/SKILL.md)，
完整读取 `skills/mobile-native/SKILL.md`；平台症状与方法经当前范围/能力/证据边界调整。
不继承默认全局 baseline、每任务全套真机或未经核验的平台绝对说法。
MIT，Copyright (c) 2026 Emil Kowalski；[保留的完整许可](intent.md#上游许可)。无上游认证或背书声明。

<!-- FILE_END: references/motion/mobile-cases.md -->
