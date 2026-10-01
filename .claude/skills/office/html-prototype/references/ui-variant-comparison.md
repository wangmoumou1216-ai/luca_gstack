# UI variant comparison — 比较结构，再让用户选择

只在 Phase 0 已明确本地 HTML、用户要求对比和精确原型目录授权时消费。普通 UI
`ui_variant_count=0` 完全保持原流程。显式对比未指定数量默认3，非零只允许2–5；keys 固定为
A…E 的前 N 个，不重排。用途必须 `ui`，数量与 HTML/spec/CLI 同值；逻辑用途+N>0 或非法值
exit2。问题/数量/Packet 冲突回真实用户或原决策 owner，不代选、不以 standalone 绕过。

## 1. 相同宿主和数据，结构不同

优先读取已授权现有页面/截图，在同一静态 `index.html` 保持真实宿主的 header/sidebar/
密度与批准的只读数据，只交换 rendering 子树。新功能自然属于现有页面时仍用该宿主语境。
没有合适宿主才由用户确认独立页面，并写具体原因。来源不授予真实应用 route/auth/数据获取
或 mutation 权限；local HTML 不声称验证真实集成。用户另要真实 route 由 implement/Plan
owner 在真实 build 环境重新批准，不能在此偷偷改生产代码。

每个 key 的布局、信息层级和主操作显著不同；颜色或文案换皮、三份相似卡片网格失败。
共用 header/数据可以，共用同一 layout 后只调颜色不算结构对比。各变体都符合已确认平台/
规范、共同 D/STATE/AC 和内容守恒。保持区按 R-20260826-001 枚举角色/场景/模块/指标/
表项/动作/详情子页，独立 Gate 对真实源抽查，不以“整体不变”或 marker 自证。

## 2. 先确认全部骨架

Phase 2.75 逐 key 展示结构/层级/主操作差异、共同约束/保持区与对比假设，取得真实用户
确认再写 HTML。既有 Packet 布局与对比方向冲突时回原 owner，不用这个模式重做已冻结决策。
SCHEMA 的 UI Variant Coverage 保存每 key/name、差异、宿主保持区、共同 D/STATE/AC/
内容清单、假设及真实来源、骨架确认和以后真实选择/理由。

## 3. 一个 index，稳定 key

HTML 根写 `data-prototype-purpose="ui" data-ui-variant-count="N"`，spec 写同值
`purpose: ui` / `ui_variant_count: N`。各 variant 用下列边界隔离静态检查/浏览器定位：

```html
<!-- PROTOTYPE VARIANT START: A -->
<section data-prototype-variant="A" data-variant-name="真实名称">
  <!-- 该key独立状态harness、D/STATE/AC、真实内容与只读动作 -->
</section>
<!-- PROTOTYPE VARIANT END: A -->
```

每 key 写 `Variant A Current Aesthetic Score: NN/30` 并给逐维真实评分依据。
`required_state_ids: ["default", "empty", "loading", "error", "success", "..."]` 从实际需求
列全部适用状态，静态 checker 逐 key 核对，真实来源表的完整性仍由独立 Gate 抽查。
`common_content_ids: ["..."]` 是从真实源枚举的稳定内容 IDs，各 key 对应元素标
`data-prototype-content-id="..."`。这些声明供诊断；真实字段/动作/详情和来源抽查才证明守恒。
需求动作按钮标 `data-prototype-action="稳定动作ID"`，便于实际遍历；不连接真实写接口。

只替换 rendering 子树；共用外壳与一个浮动底栏不在 variant 子树内。`?variant=A` 直接链接/
reload 稳定；缺 variant 时可显示 A，未知或空 key 显示可恢复错误，不冒充正确 A。
页面与 spec 显著标“原型”，全部资产只放批准目录，不自动进入真实 route/main。

## 4. 共享浮动底栏

唯一 `data-prototype-variant-switcher` 固定在底部中央，包含
`button[data-variant-prev]`、`[data-prototype-variant-label]`（当前 key 与名称）、
`button[data-variant-next]`；prev/next 以固定 key 顺序首尾环绕。键盘 ArrowLeft/ArrowRight
同样切换，但 input/textarea/contenteditable 聚焦时不拦截，包括 contenteditable 后代。
用 `new URL(location.href)` 的 searchParams.set 只改 variant query，再 replaceState；
保留其它 query/hash。popstate 重新渲染 key，history/reload 不漂移。
未知 key 用 `[data-prototype-variant-error]` 可见错误和真
`button[data-variant-recover="A"]` 返回已知 key；未知时有效 variants 全部隐藏。
底栏明显是原型控制，不伪装产品导航。以后生产实现由原 owner 在真实 build 环境加 production
guard 并移除底栏；此静态 skill 不声称具备应用生产构建能力。

## 5. 逐 key QA 与真实选择

保持 Phase0→1→2→2.1→2.25→2.5→2.75→3→4→4.5→5。每 key 完整 UI 审美≥24/30、
默认/空/加载/错误/成功五基础状态及所有适用 AI/需求状态，共同已确认 D/AC/内容均实现。
无外部规范可记规范项 N/A；不是审美/五态 N/A。每 key 独立 `data-prototype-state` 与
`data-show-state` harness，不能把 A 的状态数量借给 B。

QA 先 key 再各自 state/action，逐 key 保存截图、真实操作、D/STATE/AC覆盖、分数/依据、
错误和内容守恒；用真实浏览器核对 deep link/reload、箭头/键盘环绕、编辑焦点、保留 query/
hash、未知 key 错误与恢复。checker 自动检查有限的 marker/声明及机械操作，真实布局差异、
评分、需求动作结果与源内容抽查仍按实际来源验收；不能用静态 PASS 或 screenshot 存在代替。
实际选择只由真实用户给出，可选一 key 或组合部件；记录选择/理由后回原设计/实现 owner。
未选就保留待决，不自动晋升或宣布最终生产方案。

## 来源与权限适配

方法来自 S=d81f3a183412e71a5b1e84ca21bc1a35eea03a60 的
`skills/engineering/prototype/UI.md`，blob 3977951663490882c2632b40695d9f59a2fe2408，
SHA256 723211e878acbc7b6ff09755263f3295cde724ba902ff0064da41eed51d45ad3；绑定 F09-U/M09.P02。
保留同宿主优先、结构差异、稳定 query、共享底栏和真实选择；真实 route/data/auth、Git
throwaway 归档、issue 发送及 winner生产实现均转各自真实原生授权门。原型完成不执行这些动作。

## Phase 2.75 骨架

`purpose=ui` 且 `ui_variant_count>0`：本 Phase 前完整读
`references/ui-variant-comparison.md` 到 FILE_END；按稳定 A…E 前 N 个 key 分别输出骨架、
布局/层级/主操作差异，列共同 D/STATE/AC、保持区、同一只读数据和每个对比假设。用户确认
每个骨架及共用约束后才进入 Phase 3；上游 Packet 冲突回原 owner。数量 0 沿用原单骨架。


## Phase 3 实现

**UI 对比：** 按 `references/ui-variant-comparison.md` 在同一个 `index.html` 中保持同一
批准外壳/只读数据，仅 rendering 子树不同。优先已有授权页面/截图的 header/sidebar/密度；
无合适宿主才采用已批准独立页面并写原因。每个 key 结构、信息层级、主操作显著不同；颜色
或文案换皮失败。共享浮动底栏显示 key/名称、箭头与键盘首尾环绕，编辑焦点不拦截，保留
其它 query/hash、deep link/reload 稳定，未知 key 显示可恢复错误。显著标原型，禁止自动晋升。




## Phase 4 覆盖记录

UI 非零变体记录 `UI Variant Coverage`，
逐 key 的布局/层级/主操作差异、宿主保持区、共同 D/STATE/AC/内容清单、假设与真实来源。
保持区按 R-20260826-001 可枚举角色/场景/模块/指标/表项/动作/详情子页；独立 Gate 对源抽查，
不得用“整体不变”或共同内容 marker 代替真实守恒核对。



## Phase 4.5 浏览器 QA

UI 对比浏览器 QA 先遍历每个 key，再各自全部适用 state/action；逐 key 记录截图、
状态/决策覆盖、审美分、内容守恒与错误，真实检查 URL、箭头、键盘焦点、reload 和未知 key
恢复。

## Phase 5 真实结果与回流

非零 UI 对比先请真实用户选某 key 或组合部件，记录选择与理由，再交回原设计/实现
owner；未选择时保留候选和待决状态，不自动定稿。

<!-- FILE_END: html-prototype/references/ui-variant-comparison.md -->
