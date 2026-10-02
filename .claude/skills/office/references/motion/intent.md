# Motion intent — 产品反馈与真实缺口

本文件只拥有动效目的判断。Design Brief 在必要产品反馈目的、取消/恢复结果或状态含混时，
于事实定稿前完整读取；motion-polish 在实际 HTML 的反馈缺口需要判断时读取。
没有相关动态信号时不加载；目标和结果已明确时直接继承，不重问产品问题。

## 从任务到可验结果

1. **绑定来源。** 保留用户原话、实际任务/对象/动作、已确认结果、修改范围和显式 KEEP。
   原型观察能说明今天发生了什么；只有真实需求或确认才能说明应发生什么。
2. **命名目的。** 对具体交互说明反馈价值：动作已被接收、状态变化可感知、空间关系可理解、
   突变有连续过渡、过程能解释或已要求的情绪表达。写出对应用户收益，不把动效本身当收益。
3. **核频率与代价。** 频率只引用用户信息或真实使用证据；未知就保留未知。
   键盘、pointer、移动设备和组件名称不能证明每天使用次数。观察等待、读数移动、重复输入
   或注意力争夺是否影响当前任务，再考虑缩短、减少、替换或保持动效。
4. **比较无动态替代。** 静态状态、文本、颜色或即时反馈是否能满足同一结果？
   已明确要求动态的任务，须实际满足该目标，或由真实来源修订；零建议不能替代完成。
5. **只处理改变意图的缺口。** 取消后是否提交、输入是否保留、用户能否继续操作等必要
   产品结果未决时，先查当前来源；仍含混才问一个会区分结果的问题，等待真实答案。
   “更灵动”等词有两种真实含义时，先完整读取 [vocabulary.md](vocabulary.md)，保留原话和候选。

完成时，每个适用交互都有「来源 → 动作/状态 → 反馈目的 → 可观察结果 → 验收」；
拒绝或暂缓建议注明原因，未知保持可见。只把必要产品事实写回既有 D/STATE/AC；
没有正式 Brief 的任务引用已确认用户期待，不伪造 D/R/AE。

## 产品与实现的分界

例如“抽屉关闭过程中再次打开，要响应新输入且最后保持打开”是结果；关闭中反向的过程
可写 Given/When/Then。具体位移、时长、曲线、动画工具、组件外观和布局留给授权实现者。
KEEP 只来自实际用户或项目合同，不能用此参考追加“组件细节全部保持”。

产品结果已有来源时，不为了动效方法重开方案选择。新业务动作、权限、提交/取消副作用
回设计源处理；已授权范围内的呈现时序调整由实现者完成。本文件不增加 Packet/TAC 字段，
不授予写入、运行、安装、工作区或外部工具效果。

## 来源与许可

本地方法适配自 Emil Kowalski 的 `emilkowalski/skills`，固定提交
[`d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128`](https://github.com/emilkowalski/skills/tree/d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128)：
`skills/find-animation-opportunities/SKILL.md`、`skills/animate/SKILL.md`。
读取的是冻结研究包中的完整源文件；目的/频率方法经本地范围调整，作者数值与绝对偏好未升为科学门槛。
七份 motion 参考的上游为 MIT；下方保留原许可全文。适配由本仓承担，不声称 Emil 或 Apple 认证/背书。

### 上游许可

MIT License

Copyright (c) 2026 Emil Kowalski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

<!-- FILE_END: references/motion/intent.md -->
