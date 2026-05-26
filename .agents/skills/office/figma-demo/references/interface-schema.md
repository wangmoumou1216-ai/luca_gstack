# Interface Schema — 节点间接口定义规范

> 共享 reference。被 `/figma-demo` Phase 3 和 Phase 4 引用。
> 定义 interface.yaml 的结构、校验规则、衔接标准。

---

## 接口的本质

interface.yaml 是两个相邻节点之间的**合约**。

它定义了：
- 前一个节点退出时，页面长什么样（DOM 状态、动画终态）
- 后一个节点进入时，从什么状态开始（动画起始态、初始 DOM）

两者必须无缝衔接。如果前节点退出后页面是空白的，
后节点进入动画就必须从空白状态开始。

---

## interface.yaml 完整格式

```yaml
# 由 Builder SubAgent 产出，每个节点一份
node_id: "node-{NN}-{name}"

interface_in:
  from: "node-{NN}-{name}"          # 来源节点 ID（首节点写 "entry"）
  transition: ""                     # 进入动画类型
  duration: ""                       # 动画时长
  easing: ""                         # 缓动函数（完整 CSS 值）
  dom_precondition: ""               # 进入前的 DOM 状态要求
                                     # 描述：上一节点退出后页面应该是什么状态
                                     # 例："页面空白，无可见元素"
                                     # 例："前页已滑出屏幕左侧，当前内容在屏幕右侧待入"

interface_out:
  to: "node-{NN}-{name}"            # 目标节点 ID（末节点写 "exit"）
  transition: ""                     # 退出动画类型
  duration: ""                       # 动画时长
  easing: ""                         # 缓动函数
  dom_postcondition: ""              # 退出后的 DOM 状态
                                     # 描述：本节点退出后页面应该是什么状态
                                     # 这个状态 = 下一节点的 dom_precondition
```

---

## 过渡动画类型标准化

| 类型关键词 | 描述 | 正向 | 反向 |
|-----------|------|------|------|
| slide-left | 水平左滑（前进） | 当前→左, 新→右入 | slide-right |
| slide-right | 水平右滑（后退） | 当前→右, 新→左入 | slide-left |
| slide-up / modal-up | 从底部上滑 | 新层从底部升起 | slide-down / modal-down |
| slide-down / modal-down | 向底部下滑 | 当前层向底部沉降 | slide-up / modal-up |
| fade-in | 淡入 | opacity 0→1 | fade-out |
| fade-out | 淡出 | opacity 1→0 | fade-in |
| crossfade | 交叉淡入淡出 | 当前 fade-out 同时新 fade-in | crossfade（对称） |
| scale-in | 缩放进入 | scale 0.85→1 + opacity 0→1 | scale-out |
| scale-out | 缩放退出 | scale 1→0.85 + opacity 1→0 | scale-in |
| none | 无过渡 | 直接切换 | none |

**过渡动画的正反必须配对。** 如果前节点的 interface_out.transition 是
slide-left，后节点的 interface_in.transition 也必须是
slide-left（描述同一个动画的两个角色）。

---

## 衔接校验规则

Orchestrator 在调度每个节点的 Builder 之前，执行以下校验：

### 校验 1：过渡类型一致

```
前节点 interface_out.transition === 当前节点 interface_in.transition
或：是正反配对关系（slide-left ↔ slide-left, modal-up ↔ modal-up）

不一致 → 以前节点（已 LOCKED）的 interface_out 为准，
         修正当前节点 spec 中的 interface_in
```

### 校验 2：时长匹配

```
|前节点 interface_out.duration - 当前节点 interface_in.duration| ≤ 50ms

差异 > 50ms → 以前节点为准，修正当前节点

特殊情况：前节点是 fade-out 300ms，当前节点是 fade-in 400ms
→ 允许，因为淡出和淡入可以是不同时长（crossfade 场景）
```

### 校验 3：DOM 状态衔接

```
前节点 interface_out.dom_postcondition ≈ 当前节点 interface_in.dom_precondition

"≈"意味着语义一致，不要求文字完全相同。
例：
  前节点说"页面所有元素已淡出，屏幕空白"
  当前节点说"进入前页面为空"
  → 语义一致，通过

不一致 → 修正当前节点 spec 中的起始状态描述
```

### 校验 4：缓动函数一致

```
同一个过渡动画的两端应该使用同一个缓动函数。
例：slide-left 的退出和进入应该用同一个 easing。

如果不一致 → 以前节点为准。
```

---

## 特殊节点的接口规则

### 首节点

```yaml
interface_in:
  from: "entry"
  transition: "fade-in"          # 默认淡入
  duration: "300ms"
  easing: "cubic-bezier(0, 0, 0.2, 1)"
  dom_precondition: "页面空白"    # 从空白开始
```

### 末节点

```yaml
interface_out:
  to: "exit"
  transition: "fade-out"         # 默认淡出
  duration: "300ms"
  easing: "cubic-bezier(0.4, 0, 1, 1)"
  dom_postcondition: "页面空白"   # 回到空白
```

### 弹窗/浮层节点

弹窗节点的接口比较特殊——它不替换前一个节点，而是叠加在前节点之上。

```yaml
# 弹窗节点的 interface_in
interface_in:
  from: "node-03-detail"
  transition: "modal-up"         # 从底部滑入
  duration: "400ms"
  easing: "cubic-bezier(0.25, 0.1, 0.25, 1)"
  dom_precondition: "前节点保持可见，遮罩层淡入"
                                 # 关键：前节点不消失

# 弹窗节点的 interface_out
interface_out:
  to: "node-03-detail"           # 回到触发弹窗的节点
  transition: "modal-down"
  duration: "350ms"
  easing: "cubic-bezier(0.4, 0, 1, 1)"
  dom_postcondition: "弹窗消失，遮罩淡出，前节点完全可见"
```

### 分支节点

如果一个节点可以跳转到多个目标（分支流程）：

```yaml
interface_out:
  to: "node-04-confirm"          # 写主路径的目标
  transition: "slide-left"
  duration: "350ms"
  easing: "..."
  
  # 分支路径在 spec.md 中描述，不在 interface.yaml 中
  # Assembly 阶段统一处理分支逻辑
```

---

## Assembly 阶段的接口使用

Assembly SubAgent 读取所有节点的 interface.yaml，实现：

1. **节点容器管理**：每个节点包裹在一个容器中，通过 CSS class 控制显隐
2. **过渡动画实现**：根据 interface 定义的过渡类型，在节点切换时播放动画
3. **演示模式绑定**：键盘事件触发节点切换时，调用对应的过渡动画
4. **弹窗叠加**：弹窗节点不替换前节点，而是在前节点之上叠加

```javascript
// Assembly 生成的过渡控制逻辑伪代码
function transitionTo(fromNodeId, toNodeId) {
  const fromInterface = interfaces[fromNodeId].interface_out;
  const toInterface = interfaces[toNodeId].interface_in;
  
  // 播放退出动画
  animateOut(fromNode, fromInterface.transition, fromInterface.duration, fromInterface.easing);
  
  // 播放进入动画
  animateIn(toNode, toInterface.transition, toInterface.duration, toInterface.easing);
}
```

<!-- FILE_END: interface-schema.md -->
