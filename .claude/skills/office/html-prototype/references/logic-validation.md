# Logic validation — 用按钮检验一个状态问题

仅在 Phase 0 已确认 `purpose=logic-validation`、本地 HTML 与精确原型目录授权后消费。
保持 html-prototype 的 Phase 顺序，尤其 Step 0、Phase 2.75 真实骨架确认与 Phase 4.5。
输入来源/QA `--mode` 与 purpose 正交；已有 Packet 和 D/STATE/AC 继续约束结果。问题不清
先向真实用户确认并等待，不从代码邻接、用户不在场或框架 cwd 代选。

## 1. 把问题放在页面上

先写一段业务语言：验证哪个状态模型、具体疑问和边界。顶部可见标题/说明承载
`data-prototype-problem`；不是只有注释。读取真实 brief，枚举数据/初态/动作、全部状态/
转换/错误/reset 与来源/AC，缺事实如实追问。原型只回答这一个问题，不为未来功能泛化。

## 2. 逻辑可提取，页面是薄壳

产物仍是批准目录的单 `index.html`：HTML/CSS/JS 全内联、无框架/打包器/服务端/外部资源，
双击可离线运行；全部状态只在内存，不接真实数据库、持久化或真实写接口。
在唯一 `<script>` 中用以下边界包住实际逻辑；外侧才写 DOM 与按钮 wiring：

```js
// PROTOTYPE LOGIC START
const PrototypeLogic = (() => {
  // 根据问题选择 pure reducer/state-machine/纯函数集合；plain data 输入与输出。
  // 初态、动作/合法性、转换及错误是完整模型；不依赖页面、DOM/document或反向callback。
  return { /* 真实纯接口 */ };
})();
// PROTOTYPE LOGIC END
// 薄 UI 调用 PrototypeLogic；每次动作后重绘全部相关领域状态。
```

模块不可访问 DOM、document、window、页面 handler 或回调页面；按钮也不能越过公开接口
直接改模块内部状态。逻辑 shape 服务问题，标记边界便于实际提取，不强造生产抽象或在
HTML 内建测试框架。独立验收 fixture 在原型外：提取块后用同初态/动作序列，核对与页面
相同的全部结果、非法动作和错误/reset。静态 marker 与禁词检查只是诊断，不证明纯度或
语义正确；实际提取/运行和独立审查仍必需。

## 3. 非开发者可以操作

布局自上而下：可见问题；`data-prototype-state-panel` 可读领域字段（不是原始 JSON dump）；
至少一个实际领域状态加 `data-prototype-state="真实状态ID"` 供静态定位，不强造 UI 五态，
marker 不证明状态/转换已运行；全部真实领域状态、转换、错误/reset 仍须实际观察。
`data-prototype-freeplay` 内每动作一个真实 `<button data-logic-action="...">`；最后是
`data-prototype-walkthrough-tabs` 的 tabbed guided walkthrough。操作用领域语言，错误有
解释/恢复，显示全部相关状态以及变化；任意自由顺序遵守同一状态模型。

至少 happy、edge、illegal 三个独立 tab/面板，标
`data-prototype-walkthrough="happy|edge|illegal"`，对应真实 tab 按钮标
`data-show-walkthrough="happy|edge|illegal"`。每个说明设定和观察点，含
`<button data-walkthrough-reset>`（重置到该 walkthrough 的已知初态），各步骤是
`<button data-walkthrough-step="..." data-logic-action="...">`，点击执行同一模型动作并
显式推进到下一步。选择/开始 walkthrough 先 reset；切回来可重新 reset，不继承偶然
freeplay 状态。若另有全局 reset，它与 walkthrough reset 同样真操作，不只是换文案。
面板结束加 `<!-- WALKTHROUGH END: happy -->` 等对应标记供静态边界核对；行为由浏览器证明。

## 4. 阶段与证据

- Phase 2/2.5 保留空间、信息层次、实际规范来源/可读性/错误与反馈；Phase 2.25 只将审美
  24/30 分门记 `N/A — 逻辑验证`。固定五态 N/A，不替代真实模型的全部状态/错误/reset。
- Phase 2.75 给问题、完整状态与动作清单、三个 walkthrough/reset 骨架，等待真实确认。
- Phase 4 在 SCHEMA 的 Logic Validation Coverage 写来源、纯接口/提取路径、需求状态/
  转换和三 walkthrough 表，未运行写 NOT_RUN。D映射及 source-kind 的 FIX/保持区等适用门保留。
- Phase 4.5 用同一 checker 加 `--purpose=logic-validation`，保持现有 `--mode` 的来源 gate。
  实际浏览器执行每个自由动作、每 tab 的全部步骤及 reset，记录前后完整状态、错误与截图；
  对原型外提取模块同输入同结果，不能用 STATE 注释、截图存在或静态 PASS 代替这些证据。
- 问题真实回答/用户反馈写 spec/handoff；尚未得到反馈保留待决，不模拟用户接受。

## 来源与权限适配

方法来自冻结 S=d81f3a183412e71a5b1e84ca21bc1a35eea03a60 的
`skills/engineering/prototype/LOGIC.md`，blob 32be86a0a5d9928db84b3988e55f9debe476ab40，
SHA256 f61c7d249e786a79ef289018901c348271e1798dd0b0bc5607b5c6f4d4a01ab9；绑定 F09-L/M09.P01。
上游“捕获到 throwaway Git 分支、折入真实模块、issue 指针”改为独立原生 Git/实现/发送门。
交付只在批准目录，`framework/` 源只读；不自动改产品代码/主分支、归档、提交、推送或发消息。
真实生产实现由原 owner 重新验证并批准，不把可提取模块直接当生产可发布代码。

## Phase 2.75 骨架

`purpose=logic-validation`：本 Phase 前完整读
`references/logic-validation.md` 到 FILE_END；骨架列可见问题、领域状态面板、自由动作、
happy/edge/illegal 三个 tabbed walkthrough 的已知初态/reset/步骤，以及全部真实需求状态、
转换和错误。仍等待真实用户确认。



## Phase 3 实现

**逻辑验证：** 按 `references/logic-validation.md` 实现单自包含 HTML、单 script 中的
pure reducer/state-machine/函数模块及薄页面。逻辑块无 DOM/document、页面反向 callback
或真实数据库/持久化；页面调用模块，动作后重绘全部相关领域状态。自由操作与三个 guided
walkthrough 共用同一模型和 reset，每一步是真按钮。独立验收 fixture 放在原型外，不在
原型内引入测试框架、生产抽象或未来泛化。



## Phase 4 覆盖记录

按 SCHEMA 追加对应用途的覆盖节：逻辑记录问题来源、可提取 pure 模块、真实状态/转换、
freeplay 与三 walkthrough/reset 的浏览器证据；

## Phase 4.5 浏览器 QA

逻辑 QA 实际点击 freeplay/三 walkthrough 的步骤与 reset，提取 pure 模块在独立
fixture 对同初态/动作序列核对同结果。checker 的自动截图不能代替这些具体语义证明。



## Phase 5 真实结果与回流

逻辑记录问题的实际回答及用户反馈；尚未
回答则如实保留。后续归档、发送和生产实现各有独立权限门，原型完成不授权执行。



<!-- FILE_END: html-prototype/references/logic-validation.md -->
