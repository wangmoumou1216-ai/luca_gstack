# 交互说明能力：执行 Agent 手册

日期：2026-10-04。作用域：luca_gstack 框架，NO_PIN。状态：v5 执行细化候选，尚未实施；整包最终票见同目录 review.md。

## E0. 入口、权威与开工方式

这份手册与 [主计划](./2026-10-04-prototype-notes-plan.md) 共同构成 v5 执行包，精确文件 SHA 见 review.md 整包终审节；v4 的旧票不代表这份新增手册。主计划的原有 ID 不改编号，追加 R-14、U-009 和 A-13；[节点与形式决策复审](./2026-10-04-prototype-notes-decision.md) 是同包执行依据；本手册把其中的设计选择落实为字段、步骤和验收证据，不缩小需求。遇到实测推翻方案，应按主计划 §12 做受影响部分的增量重规划，不自行删除需求。

执行前按顺序：

1. 读当前 AGENTS.md 及其适用 owner，核 HEAD/dirty；本计划所依赖的框架基线是 `d704734e53cc24096242b8595d4514d38831c83d`。HEAD 改变不一概阻塞，只比较 E7 接入函数/合同是否变化；差异未解决不得直接套旧接口。
2. 读取本手册、主计划、最新整包会审结论。实施授权须来自用户对该计划的批准；当前目标只授权完善计划。没有批准时不写功能文件。
3. 批准后从 U-001 开始，同一时刻一个实施 owner；评审只读。U-002 的薄纵切在 U-003/004 的正式文件中做最小实现，再扩展，不在 test 内复制一套假的生产逻辑。它是正式功能的第一块，不是完成全部 UI 后才回头验证。
4. 保持 NO_PIN 框架身份；真实 OD 样本由用户已授权来源绑定。读取业务项目材料须遵守 project-session owner，不能从共享 docs/ 或“最新文件”猜样本。尚无样本时可以完成 U-001 和合成夹具，但 U-002 不能 DONE。
5. 每个 U 结束追加 `framework-audit/<执行日期>-prototype-notes-implementation/progress.md`：U-ID、源码 hash、实际测试、独立票、未决项。不要修改本次冻结规划包来记录代码进度。

只有两类非工程输入不能由 Agent 冒充：精确且获准的真实样本/来源，以及用户确认最终原型和固定工具 UI 的设计判断。已有确认直接继承。其它已在本包定下的选择不重新抛给用户。

## E1. 输入合同与 AI 生成过程

开始说明加工前形成机器侧 `notes-input.json`，它是项目内构建证据，不是另一个用户交付文件。字段如下：

| 字段 | 类型/必需性 | 不变量 |
|---|---|---|
| `input_version` | 整数，固定 1 | 未知版本拒绝加工 |
| `document_id` | UUID 字符串 | 同一原型的说明迭代沿用；克隆成独立交付时明确创建新身份 |
| `base` | `{entry_path,entry_sha256,source_ref,accepted_ref?}` | 路径获准，SHA 实读；原始回收、已 accepted 前序或用户交回的完整文件（E7.2）；不接受未验 candidate 冒充 final |
| `user_confirmation` | `{source_ref,confirmed_prototype_revision,input_artifact_sha256}` | 来自真实用户消息/已存在确认记录；prototype revision 绑定调整后的业务版本，input SHA记录当时看到的文件；不从 PASS 推导用户确认 |
| `scope` | E2 定义 | 仅本次新增/明确授权变化的流程、模块、组件及其状态 |
| `source_refs` | `[{id,title,kind,locator,sha256?}]` | kind=用户确认/设计规格/原型观察；精确 locator，不能把模型结论当来源 |
| `behaviors` | `[{id,unit_id,context_id,action,expected,source_refs,critical}]` | scope 内适用交互原分母；normal/disabled/loading/error/cancel/keyboard/UI 分支按实情列出；每项都可追溯 |
| `existing_notes` | 当前完整 HTML 提取结果或 null | 最新用户文件优先；不从本机旧缓存代选最新版 |

生成协议固定落在共享目录 `generation.md`：

1. 先读取 content-guidelines，再读输入清单；冻结 scope 与 behaviors，AI 开始写文案前不再任意扩分母。
2. 按流程/模块组织，一条说明可关联多条 behavior，但必须逐条可追踪；所有 behavior 均对应说明或有设计师明确的待定处置。装饰元素不变成额外交互分母。
3. AI 只返回声明式说明 JSON，不返回 JS/CSS/HTML、可执行选择器代码或点击脚本；提供标题、主说明、适用细节、来源、实现差异及锚点候选。
4. 代码验证结构、scope 和引用；实际原型验证锚点与行为，内容判官核对自然语言是否忠实。仅同名文字或同组件名不能证明归属。
5. 执行 E3 合并。输出 coverage 表：每个 behavior ID → annotation ID → 来源 → 已演示/未演示/差异；另列越界候选和缺项。关键未决规则回源，不靠 AI 补值过门。
6. 生成失败或越界：保留原 HTML、旧说明和可读错误，修复当前候选；不删除范围外说明、不改业务实现、不扩大 scope 来通过检查。

## E2. 数据合同（U-001 直接按此转成 schema）

共享数据使用 JSON，不包含函数/HTML。根对象如下；所有未声明字段拒绝写入，旧版本经显式迁移后才改写。

```text
NotesDocument = {
  schema_version: 1,
  runtime_version: string, content_guideline_version: string,
  document_id: UUID, base_revision: SHA256,
  notes_revision: integer >= 0, next_display_number: integer >= 1,
  generation_scope: Scope | null,
  annotations: Annotation[],
  provenance: { source_title: string, source_revision: string, business_revision: SHA256 },
  validation_status: "unreviewed" | "reviewed_at_source"
}
Scope = {
  id: UUID, base_revision: SHA256, source_refs: string[],
  units: [{ id: string, title: string, contexts: string[], root_anchor_ids: string[] }],
  required_behavior_ids: string[]
}
Annotation = {
  id: UUID, display_number: positive integer, revision: integer >= 1,
  binding_revision: integer >= 0,
  title: string, kind: "interaction" | "ui" | "rule", body: string,
  details: { conditions?: string, feedback?: string, exceptions?: string,
             recovery?: string, visual?: string, keyboard?: string },
  source_refs: string[], behavior_ids: string[],
  evidence_status: "confirmed" | "observed" | "proposed",
  implementation_status: "demonstrated" | "not_demonstrated" | "differs" | "not_applicable",
  creation_origin: "ai" | "manual", generation_scope_id: UUID | null,
  scope_unit_id: string | null, page_or_state_context: Context,
  anchor: Anchor | null,
  field_origins: { [editableFieldPath]: { last_ai_value: string | null,
                   human_touched: boolean, suggested_value: string | null,
                   suggestion_meta: { key: SHA256, base_revision: SHA256, binding_revision: integer, source_refs: string[],
                     evidence_status: string, implementation_status: string } | null,
                   resolved_suggestion_keys: SHA256[] } },
  tombstone: null | { deleted_revision: integer, deleted_by: "manual" }
}
Context = { id: string, title: string, entry_steps: string[] }
Anchor = { id: UUID, base_revision: SHA256, strategy: "semantic" | "injected" | "scoped",
           root_identity: string, locator: string, context_id: string,
           instance_key: string | null, fingerprint: { tag: string, role: string | null,
           semantic_name: string | null }, requires_rebind: boolean }
```

`Anchor.locator` 只允许受控 selector/已验证 ID，不能 eval；state context 是查找的约束与人工进入说明，不是自动操作脚本。另有构建绑定表（E4），AI 不因自行写 root_identity 就获得范围授权。代码以实际 DOM 包含关系/语义实例证据校验。

字段级合并只用于 title/body/details 的文本叶子；kind、anchor、scope 变更是独立显式操作，不走文本覆盖。`human_touched` 只能由人工 UI 修改或可信导入推导，AI 无权清除。display_number 与 id 跨排序/过滤稳定，next_display_number 永远大于包括 tombstone 在内的历史最大序号。

身份分三层：delivery.base.sha256 是本次完整输入文件；notes.base_revision 是未经说明注入的自包含原型源快照；confirmed_prototype_revision/business_revision 是用户确认时原型业务文件闭包的规范清单 hash（相对路径排序+各原文件SHA，自包含输入只有一个文件）。三者不强行相等。确定性资产内联若改变 source bytes，构建证据必须记录从已确认业务闭包到快照的转换与行为回归，不视作新的设计确认。重新导入时静态重建验证快照及映射未变，单纯改说明无需重做 UI/动效确认；业务代码/资产变化则重新确认。任何说明变化仍使当前交付字节需新验收。

人工全局规则可 `anchor=null` 且无 scope；AI 流程规则虽可不画标号，仍须 scope_unit_id 与 behavior_ids。手工新建项 `generation_scope_id=null`，不得因此无法保存。新建规则与模块说明共用 ID 分配规则；非画布规则显示稳定引用号但不伪造坐标。

长度限制是防止失控输入的实现上限，非 UX 文案长度指标：标题 200 字符、每个正文/细节字段 20,000 字符、每文档最多 2,000 条、notes JSON 16 MiB；超限保留编辑内容并明确失败，绝不截断。用户界面可以提示精简，不能凭字数判说明质量。

## E3. 合并与修订算法

同 document_id 的上轮基线 B、当前用户值 C、新 AI 值 N，按条目 ID + 文本字段路径执行：

| 条件 | 结果 |
|---|---|
| 当前项 tombstone 非空 | 保留删除记录；忽略 AI 重建，不复活 |
| 项目不属于本轮 scope | 原内容/编号/存在性保持；只可另附锚点健康提示 |
| 人工新建，AI 未获单条协助授权 | 原文保持，不匹配到“看起来相同”的 AI 条目 |
| 未人工修改且 C=B，来源语义/目标未变 | 可接受 N；更新 last_ai_value |
| 已人工修改，N=B | 保留 C，不产生无意义冲突 |
| 已人工修改，N≠B 且 N≠C | 保留 C；suggested_value=N，在侧栏更新建议中提供逐字段比较，框架摘要只汇总 |
| 人工与 AI 改成相同内容 C=N | 保留 C 和人工标记，更新基线，无冲突 |
| 来源语义改变/锚点歧义/新旧 ID 不能稳定对应 | 保留旧项；新内容只能作为待复核建议，不自动替换 |
| AI 本轮没返回原有项 | 不自动删除；coverage 检查指出缺项 |

**冲突处置合同**：每个 suggestion 的 key 按固定顺序 JSON `[document_id,base_revision,annotation_id,binding_revision,field_path,N,source_revision,sorted_source_refs,context_id]` 的 UTF-8 SHA-256 计算；source_revision 来自已绑定来源而非生成时间。相同 key 已被当前字段明确处理时不再次弹出；来源/语义/目标改变按新建议审查。suggestion_meta 的两项状态必须使用 Annotation 同名枚举，不接受任意字符串。

`binding_revision` 是条目目标版本：无锚点整体规则初值0，首次区域绑定初值1；任何显式重新绑定、anchor语义目标/实例变化、适用context改变或业务base rebase均递增（即使annotation ID/context名字/N相同）。仅滚动/尺寸变化/同一语义目标DOM重绘不递增。该事务清空所有字段 resolved_suggestion_keys，并将条目设unreviewed；当前人工文字、ID/序号、tombstone保持。旧 suggested_value/meta仍可查看，但meta的base/binding revision与当前不一致时显示“目标已改变，请检查说明”，禁止直接采用旧建议；用户可继续手动改文，或回框架对当前目标重新生成。新建议记录当前base/binding revision，因此旧去重结果不能压住对新目标的审查。整体规则由整页切换为另一流程也适用同一规则。

| 用户动作 | 当前字段／AI基线／建议记录 | 呈现及后果 |
|---|---|---|
| 保留我的版本 | C保持；last_ai_value=N；human_touched=true；把本key并入 resolved_suggestion_keys，清空 suggested_value/meta | 本次建议已处理；不改当前内容的来源或实现状态 |
| 采用建议 | C=N；last_ai_value=N；human_touched=true；把本key并入 resolved_suggestion_keys，清空建议 | 仅替换这个文字字段；建议来源并入依据；若建议是 proposed，条目仍显示待确认，不自动提升事实或实现状态 |
| 稍后处理／关闭比较 | C/B/建议均不变 | 保留未处理数量；下次打开继续，下载保留当前文字和待处理建议 |
| 撤销本次处理 | 恢复处理前该字段、基线、来源、状态、已处理key集合及建议快照 | 只允许撤销最近一次建议处置且此后无其它人工事务；新事务到来撤销入口即失效；按一次新事务递增revision，不倒退版本 |

**多轮历史不变量（代码与往返测试均遵守）**：每个文本字段持久化当前base/目标版本下的已处理key集合S（默认空数组，唯一且排序），不能只保留最近一个，也不能按时间淘汰旧key。先执行tombstone/范围/人工项保护，再检查新key是否在S；命中时保持当前文字、last_ai_value和S，不产生建议，也不把文字恢复成历史N。保留/采用使S变为排序去重后的S∪{key}；暂缓不改S；撤销恢复上一事务前的S；重新绑定/context改变/rebase使binding_revision递增且S清空。S随HTML导出、缓存恢复、静态导入和合并完整保留；达到文档总大小上限时事务不提交并说明原因，保留此前数据和当前buffer，不丢旧key来“通过”限制。建议处置撤销是单步撤销，后续任何人工事务完成后不能再恢复更早快照从而抹掉后来修改。

| 固定来源/base/目标下的顺序 | 必须结果 |
|---|---|
| 保留N1 → 保留N2 → 导出重开 → 再生成N1 | S含k1/k2；人工C不变；N1不再次弹出 |
| 保留N1 → 采用N2 → 再生成N1 | C仍为N2且人工受保护；不得因旧建议重现回滚为N1 |
| 保留N1 → 保留N2 → 立即撤销 → 再生成N2 | S恢复只含k1；N2仍需处置，revision继续递增 |
| 保留N1 → 同context重绑A到B → 再生成相同文字N1 | binding revision改变且S清空；产生新key并要求重新审查 |
| 保留N1 → 只滚动/同目标DOM重绘 → 再生成N1 | binding revision不变；S保留，不重复提示 |

保留/采用都是人工事务，validation_status=unreviewed；不隐式修改 anchor、kind、scope、business_revision。采用建议后 implementation_status 保持实际观察状态，若与建议描述冲突显式待复核，不称已实现。条目混合了待确认内容时 evidence_status 保守显示 proposed，不能因为设计师点了采用就变成 confirmed。无内容变化的“稍后/关闭”仅是查看动作，不增加revision。再次生成不得覆盖未处理建议：相同key复用；新key将旧建议保存在当前加工证据中，只在文档给出最新建议并提示已更新，当前人工文本保持。下载不锁住人工交付，但关键业务事实冲突未解决时不得通过框架最终内容验收。

AI 不能通过改变 id 绕过人工保护：生成器必须带入输入中的已有 ID；新的 AI 条目按 scope unit + 行为 ID 集 + context 与现有条目去重，重叠候选须人工/判官核对，不按文本相似度自动另建。

即使 human_touched 标记缺失，只要 C≠B 且无可信生成记录解释差异，也按人工修改保护；迁移旧数据时宁可产生待比较建议，不能默认覆盖。

每次确认一项编辑/删除/撤销/重绑为一次事务：annotation.revision 与 notes_revision 递增；任何人工事务将 validation_status 置 unreviewed。下载/换边/过滤不增加内容版本。删除可撤销，撤销恢复同一 ID/序号。跨 document_id 的文件不自动合并；同 revision 不同内容视作冲突，不能靠时间戳取“较新”。

本机缓存恢复必须同时匹配 document_id、base_revision、文件自带 notes_revision 和内容摘要基线；缓存比文件旧则忽略，不同分支提示“发现另一份本机草稿”，用户选择恢复才替换；不静默覆盖收到的新文件。缓存失败仅损失尽力备份，不影响内存编辑与下载。

## E4. 锚点、范围与定位

构建绑定表 `bindings.json` 包含 `anchor_id/context_id/root_identity/locator/instance_key/fingerprint`、实际验证的 scope unit 归属及证据引用；机器旁车随构建留存，必要定位数据内嵌 HTML。它由实际元素核对产生，不能只相信 AI 自报。

查找顺序固定：当前 context 的稳定语义 ID → 验证通过的注入 anchor → 同一 base 的 scoped locator + 完整指纹。必须恰好一项且语义/实例相符。零项为隐藏或失效（有可靠状态上下文才区分），多项为歧义；不取 querySelectorAll 第一项。base 变更后 scoped fallback 不跨版自动使用。

AI 范围守卫：目标必须处于该 scope unit 当前 context 的真实 root 内或属于已验证跨 portal 的实例；不以相同 CSS class、文案或组件类型代替归属。portal 的弹窗不在父 DOM 子树时，将其真实根与触发流程的证据加入同一 unit 的允许根集合；不得为方便允许整个 body。

人工 picker 忽略 generation_scope，只筛除工具节点、不可操作背景、不可见及不支持的内部区域。纯键盘树与鼠标同用此候选集。人工整体规则从独立入口直接写，不需要 picker 候选或 anchor；查看时不尝试定位无锚点规则。canvas、跨域 frame、closed ShadowRoot 只选宿主；新状态应先由用户正常进入后再选，不自动执行业务操作。

标号坐标由真实元素 rect 与可见滚动裁剪计算；离开视口不贴假边缘位置。多个标号碰撞时按 display_number 稳定聚合，展开可逐条选择。定位刷新合并到一次 rAF；关闭时停 DOM/resize/scroll 观察，常驻 bootstrap 仅作无操作的事件直通。选区期间暂时隐藏命中层做只读 elementsFromPoint，再立即恢复；不把点击转发给原元素。

## E5. 固定 UI 规格与状态机

以下为工具本身的首版设计参数，不是对业务原型的视觉约束。一次确认后固化版本：桌面面板 360px、最大宽 `calc(100vw - 16px)`；视口小于 640px 使用底部抽屉，最大高 75dvh；内边距16px、区块间距16px、行间距8px；正文14px/1.55、标题16px/1.4；系统字体；面板白底、主文#20242C、次文#5B6472、边框#D8DDE5、强调#2457E6。代码检查实际对比度与缩放后可读性，失败调整工具 token，不能改原型配色。按钮和标号命中区44px，视觉标号24px。缩小/动态字号时内容换行，不截断关键规则。

面板结构固定：标题/关闭 → 当前状态或全部/类型/显示标号 → 说明列表 → 编辑说明/下载 HTML。选中卡片展开细节，其它显示标题和首条规则；来源与技术补充默认折叠。无说明显示“这里还没有说明”和编辑入口；过滤无结果显示“没有符合筛选条件的说明”。

| 当前状态/事件 | 下一状态与数据动作 | 焦点/业务页面 |
|---|---|---|
| CLOSED → 打开说明 | VIEW，默认显示可见标号 | 聚焦标题后的第一个操作；不移动业务布局 |
| VIEW → 编辑说明 | EDIT_LIST | 焦点到“新增说明” |
| EDIT_LIST → 新增说明 | CREATE_KIND：选择区域说明/整体规则 | 两个有名称的按钮，Tab可达，Esc回新增 |
| CREATE_KIND → 区域说明，或 EDIT_LIST → 重绑 | PICK_POINTER，可随时进入 PICK_TREE | pointer 命中层仅选择；键盘默认目标树 |
| CREATE_KIND → 整体规则 | EDIT_FORM；anchor=null，人工scope=null；选择整份原型或已知页面/流程context | 直接聚焦标题，不经过目标树；完成后放整体规则列表、无画面pin |
| EDIT_LIST → 有更新建议 | COMPARE_FIELD；依次显示当前文字/建议/依据和三动作 | 聚焦比较标题；如已有buffer，先完成或取消编辑，未选前保留buffer |
| COMPARE_FIELD → 保留/采用/暂缓/撤销 | 按E3精确事务执行；处理后回该卡片或下一未处理字段 | 回发起按钮或下一字段，不能重置整份说明 |
| PICK → 确认目标 | EDIT_FORM；新增分配不复用序号，重绑保留原 ID，按E3递增binding_revision并使旧建议失效 | 不调用业务 click；聚焦标题或主说明 |
| PICK → Esc | EDIT_LIST，不改数据 | 回新增/重绑按钮 |
| EDIT_FORM → 完成编辑 | 验证必需标题/主说明；成功提交事务，回 EDIT_LIST | 选中刚编辑卡片；无效则保留输入并聚焦错误处 |
| EDIT_FORM → 取消编辑 | 丢弃本次 buffer；不撤销先前已完成编辑 | 回原卡片；取消新建留下序号空隙 |
| 任意打开态 → 关闭侧栏 | CLOSED；未完成 buffer 保留在本页，再开恢复 | 回原触发控件；不存在则回说明入口 |
| 任意态 → 删除 | 写 tombstone、显示“已删除／撤销” | 保留其它项编号 |
| 任意态 → 下载 | 有 buffer 时先验证并应用；不通过则停止下载 | 提示“已发起下载”；不伪称覆盖原文件 |
| modal 打开/关闭 | 保存状态后按主计划 §7 迁移自有 host | 不关闭业务 modal、不取消 inert、不丢 buffer |

桌面查看态非模态，业务页仍可操作。窄屏抽屉打开时工具自己管理焦点与背景命中；关闭恢复业务操作。工具的 Escape 先退出选区/编辑子状态，再关闭工具；原型区域的 Escape 继续交给业务。细节实现必须通过 E8 组合测试，不能仅照状态表声称可用。

## E6. 构建、导出与公开函数

实施新增共享 `core.js`（纯逻辑工厂，Node 可 import、浏览器内联同一源码）、`generation.md`；与主计划列明的 contract/schema/content-guidelines/runtime.js/panel.css 一起归 U-001/003/004 唯一 owner。公开 prototype-notes skill 只按 E7.4 调用该唯一核心，不复制实现，也不建在线服务。

core 不访问 DOM/文件/网络；runtime 管交互；`scripts/prototype-notes.mjs` 管授权后的本地 I/O 和原 helper 调用。公开接口应遵守以下结果约定：成功 `{ok:true,value}`；失败 `{ok:false,code,message,details}`；边界 CLI 非零退出，不返回半个有效交付。

这个 Result 约定只用于新增 notes 接口。现有 delivery helper 继续返回普通对象/抛 `Error("CODE: detail")`；notes adapter 捕获并映射，不能为了统一外观破坏旧调用方。

| 函数 | 输入 → 输出/职责 |
|---|---|
| `validateNotes` | document → 规范化 document 或字段错误；不改文案 |
| `validateGenerationScope` | before/proposed/scope/bindings/behaviors → coverage + violations；AI 范围守卫不用于人工 UI |
| `mergeNotes` | previous/current/proposed/scope → merged + conflicts；按 E3，输入对象不可变 |
| `extractNotes` | HTML bytes → notes + source snapshot + runtime package；惰性读取，不执行 HTML |
| `buildAnnotatedHtml` | source bytes + notes + bindings +固定 runtime package → HTML bytes + build metadata |

组包保留未经说明注入的原型源码快照、固定运行时代码及最新说明数据，以惰性编码保存在最终文件；自有区块带版本标识与长度/完整性校验。解析多重区块、损坏快照或未知版本均拒绝，不能回退成“普通原型”重复套壳。

解析路线固定：构建侧新增 `parse5@8.0.1` 精确依赖并更新 package.json/package-lock.json；使用 `sourceCodeLocationInfo:true` 取得真实节点位置，仅计算注入与资产替换区间，**不把解析树重新序列化成业务 HTML**。隐式纠错节点无位置时不能猜插入点；验证可用的安全原文区间，无法确定则报不支持。source offset 单位与 JS 字符串索引保持一致，并验证 Unicode/BOM/换行不改变原始快照。首次构建保存已验证插入位置，离线手工再导出只使用同一不可变快照及这些位置，不在浏览器内引入 parser。提取已有包也用真正的 script 节点识别版本区块，拒绝多重或伪造块。U-003 覆盖注释/属性/script 文本里含同名标签、隐式 head、非ASCII 等反例。

本次仅核对了 [parse5 官方 source location 说明](https://parse5.js.org/interfaces/parse5.ParserOptions.html) 与 [8.0.1 发布](https://github.com/inikulin/parse5/releases/tag/v8.0.1)，没有安装。它是构建时解析依赖，不进入离线 HTML；批准执行包后才安装锁定依赖，不安装全局工具、不自行升级其它包。

下载由同一个 core 装配函数从源码快照重建，不序列化 live DOM；新建注入锚点及动态重绑记录来自 bindings。固定 runtime package 只一份；无编辑的再次导出内容应相同，编辑后只改变说明/定位数据与必要版本，源码快照保持同 hash。源文件编码/结构无法无损解析则拒绝该输入并给原因，不自动重写业务 HTML 修好再当原件。

导入受支持版本时，以提取的快照/说明/定位/runtime package 确定性重建并与上传完整 bytes 对照（自描述区块无自引用 final SHA）。不一致表示运行部分或快照有额外编辑，报 CORRUPT_EMBEDDING 并保留原件；绝不无声恢复旧快照从而丢掉用户真实产品改动。若用户确需把外部改过的业务 HTML 作为新基线，必须走以下明确 rebase 路径后再继承说明。

**业务源码回流 rebase（prototype-notes standalone 负责）**：

1. 在获准证据位置原样保留上传完整 bytes/hash。先静态提取仍完整可识别的旧说明数据；不执行上传脚本来提取内容。
2. 仅支持本工具已知版本且区块边界、唯一标识、原注入区间和源映射均可验证的外部改动。按构建 manifest 定位并移除工具自有插入区块，保留区块之间实际最新业务 bytes；不能用内嵌旧 snapshot 代替实际业务 bytes。原本由工具内联过的业务资产保留当前内联结果，作为新自包含源。若工具与业务内容混写、标识重复/移动导致区间不唯一、外部依赖无法闭合，停止自动 rebase，保留原件和可提取说明，由用户提供准确业务 HTML 后继续；无需再次 OD 生成。
3. 输出一个未注入工具的新业务源候选及逐区间提取记录，用 parse5 复核无工具重复块、闭包完整，比较当前上传的业务行为与提取源；任何不确定或变化不得宣布等价。向用户展示此源，绑定其新的业务 revision；等待或继承对**该业务版本**的真实确认。
4. 沿用 document_id、原说明 ID/编号、human_touched 和 tombstones；更新 base_revision。所有旧 scoped/injected 锚点置 requires_rebind，语义 ID 也须在新 context 实际唯一核验后才能重新生效。人工文本不自动改写，改变的来源只生成建议。
5. 重新冻结当前新增 scope 和 behaviors，执行 AI 局部生成/人工优先合并、组包和完整新候选验收。delivery.base 仍绑定用户上传完整文件，patch.before 也是完整输入 hash；新 snapshot 及提取转换另记 build metadata。失败保留原输入，不能发布半完成 HTML。

仅改说明的合法工具导出不走 rebase；静态重建一致即可保留旧业务确认。未知版本不能“剥壳试试”，按 UNKNOWN_VERSION 保留原件。

错误码至少包括：`INVALID_NOTES`、`UNKNOWN_VERSION`、`SCOPE_VIOLATION`、`COVERAGE_GAP`、`ANCHOR_AMBIGUOUS`、`SOURCE_CHANGED`、`CORRUPT_EMBEDDING`、`UNSUPPORTED_ASSET`、`UNSUPPORTED_MODAL`、`EXPORT_FAILED`。用户界面显示可理解的短中文和下一步，代码只在开发补充/证据中出现。

## E7. 框架接线合同

### E7.1 当前真实 API 与调用顺序

已由只读 explorer 核对当前实现。现有公共 API（不是虚构 CLI）：

| 顺序 | 现有接口 | notes 调用规则 |
|---|---|---|
| 1 | `bindBase(input, context)` | 传真实 source/base/scope/methods/authority_ref，当前读取 context 从宿主取得，不能从 metadata 生成权限 |
| 2 | `prepareCopy(bound, {delivery_root,attempt_id,kind}, context)` | 建独占 attempt、复制全部 base 闭包；按 E7.2 增 processor 选项，不改旧分支 |
| 3 | caller 写 final HTML、新 observation spec、patch | patch 列每个实际改动文件 before/after hash；保留 raw/spec/receipt，不删机器闭包资产 |
| 4 | `checkCandidate(candidate, context)` | 该 API 会写 methods.json 与 candidate-subject.json，并非纯校验；source/scope/methods/required set 均在此前冻结 |
| 5 | `resolveCandidateSubject({path,sha256,delivery_root}, context)` | 冷 QG 用实际 context 解析精确候选，再运行独立行为/内容审查 |
| 6 | caller 记录 exact QG 原票为 report | 判官不写报告文件/证书；caller 验证独立身份、候选 SHA、完整 required set，不能自行造 PASS |
| 7 | `sealAccepted({candidate_ref,report_ref,delivery_root}, context)` | 原子 no-replace 发布；失败不回退 raw、不得绕过 seal |
| 8 | `resolveFinal(exactRef, context)` | OD 用返回的 final_entry 完成一次；报告与 spec 指向 notes 最终版本 |

现有 CLI 只有 candidate-check/validate/resolve，后两者都走 resolveFinal；没有 prepare/create/seal CLI。涉及 allowed_urls 或原生消息 source_refs/scope_refs 时走 API 保留完整 context，不编造 shell flags 丢掉来源。

### E7.2 三类输入与向后兼容

**普通 OD raw → notes（包括没有动效加工的主路径）**：从真实 recover 得到 raw asset_root；使用同一已授权项目下、与 raw asset_root 实路径互不包含的 notes delivery_root，关系为相邻目录，不在 raw 内新建子目录。生产路径固定为 `P/docs/prototype/YYYY-MM-DD-<topic>`（raw）与 `P/docs/prototype/YYYY-MM-DD-<topic>-notes`（notes），P 是当前已验证项目的 canonical root，日期/topic 来自该任务。notes 根须先在真实授权内创建为无 symlink 的 canonical 目录，是 prototype 的直接子目录；helper 不代建该根。不能把 base.asset_root 扩成整个 prototype 父目录。

继续使用 bindBase + prepareCopy，普通 SOURCE_OUTPUT_OVERLAP 不作例外。effects 的 canonical_project_root=P、authorized_delivery_root=notes 根，raw/spec/recovery 在根外的必要读取仍须显式获准。OD Phase6 解析 caller 已验证的 notes 根并绑定返回 final_entry，允许与 raw 根不同。若新根不被原授权覆盖，先解决真实权限，不能靠 metadata 放行。复跑同一 attempt 返回已存在错误；重试生成新 attempt_id，不覆盖前次。

**已 accepted motion → notes**：新增 API `deriveFromAccepted({accepted_ref,delivery_root,attempt_id,processor_id:'prototype-notes',scope,methods,authority_ref},context)`，返回 `{bound,attempt,parent_accepted_ref}`。helper 自行 resolveFinal 并以返回的精确 final/content 构造 base，caller 不可另传任意 base 声称 accepted。candidate 绑定 parent_accepted_ref；check/resolve/seal 每次重验父链和 base 一致性。普通 overlap guard 保留；只有此入口可在同根下建立与前序 content 互不重叠的新 attempt。

允许的转换矩阵固定为 raw→notes（普通非重叠入口）及 accepted motion-polish→prototype-notes（专用派生）；其它 processor 转换、未 accepted candidate、伪造 accepted raw 均拒绝。再次给已带说明的 HTML 更新内容时按 extract/merge/rebuild 输出新的 notes 修订，经新的候选验收，不能假装走 motion 派生。

**用户手工编辑导出的完整 notes HTML → 新 notes 修订**：使用现有 `base.origin=external-html`、`delivery.kind=enhanced-copy`；base.entry/hash/closure 绑定用户最新完整文件，不填假的 recovery_ref、不默认沿用旧 raw spec。source 仍指当前真实任务/规范消息，不能把输入 HTML 的所有文本当新需求。先静态 extract 并验证确定性结构，再复制完整文件到不重叠的获准根，组包在副本同名 entry 内更新。patch.before 是完整用户文件 hash、after 是新完整文件 hash；写新 spec 和票。内嵌旧 OD receipt/accepted 信息只作历史，不当本轮许可或验收。无需再次 OD 生成/回收、不改写历史 OD DONE，由 prototype-notes standalone caller 交付新 final ref。若没有字节变化，按既有 adequate-copy 条件验证，不能用 enhanced-copy 接受零改动。

candidate 新增可选 `processor_id`，仅 motion-polish/prototype-notes；缺字段按旧 motion 解释，resolver 不把默认值写回旧证书。prepareCopy 与 attemptPath 共用唯一 processor 路径函数；report/certificate 沿 candidate 所在 attempt，不各自猜目录。保持 schema 既有版本兼容；跨字段条件用显式代码验证，当前内置 validator 不支持的 if/then/allOf 不能作为唯一门禁。

完整闭包规则保持：candidate 仍保留全部 base 文件、patch 仍不允许删原资产。单 HTML 内联后未再引用的 base 文件留在机器证据目录里，**交给用户的仅是自包含 final_entry**；A-04 必须复制这一个文件到空目录、断网重开，不能以同目录资产帮它通过。

旧票兼容夹具：在 U-005 修改前将基线 commit 的原 helper/schema 逐字节冻结到 `scripts/fixtures/prototype-delivery-v1/prototype-delivery.mjs` 和 `prototype-delivery.schema.json`，测试记录预期 SHA。运行时在临时 legacy-runtime 重建旧 helper 的 scripts/ 与 `.claude/skill-os/` 相对布局；用现有 createDeliveryFixture(root,{helper:legacy,kind}) 与 createLocalIntegrityReport(fixture,{helper:legacy}) 生成三种旧 kind 的完整合法票。再在同一绝对 fixture 路径用新 resolver 读同一 certificate path+SHA，前后清单/hash 不变，不编辑路径、不重签票。保留旧链依赖漂移拒绝测试。当前 helper 新生成的 fixture 不能自证旧版本兼容；这些 synthetic 票只证明 integrity，不是生产独立验收，不向生产引入 fixture bypass。

### E7.3 required set、spec 与现有 owner

原型行为验收分母与 AI 文案生成 scope 分开。AI 只说明新增 C 流程，不意味着原型 A/B 的既有交互可以不验。

`required_behavior_refs = source D/STATE/AC/KEEP ∪ parent motion required ∪ notes-instance required`。原始及父级集合不得缩减。新增 `notes_manifest_ref{path,sha256}`（仅 processor=prototype-notes 必填）绑定 scope、输入数据/运行时/规范版本、完整行为映射与 notes-instance IDs；它位于 metadata 目录，不在用户 HTML 中暴露本地绝对路径。

实例 ID 使用 `NOTES:<case-id>`，避免与产品自己的 A-01 冲突。A-01–09、A-11–12 中与这次实际原型有关的行为进入实例清单；A-10 的双 harness、框架错误分支，以及 guard mutation 属框架能力验收，不伪写成每个用户 HTML 都运行过。适用性必须在运行前标明；源码/父级 required ID 不得用“不适用”减掉。

helper 的 exact set 只能防候选与报告不一致，不能判断候选是否缩减了源分母。因此 QG 必须对照源和 parent 集合核验；notes helper 另显式校验 parent required 为子集、notes_manifest 与 candidate 集一致。缺字段/漂移/遗漏任一 required 为 FAIL。

最终 observation spec 必须新写：final_entry/hash、数据/runtime/guideline 版本、scope、source→behavior→annotation 映射、实际可见/未演示/差异、测试证据；raw spec 和 parent spec 原样保留，只作来源。不能让 delivery.spec 默默继续指向 raw spec。

| owner 文件 | 精确修改职责 |
|---|---|
| open-design/SKILL.md Phase 4–6 | recover 后完成 UI/交互/动效迭代及精确用户确认；调用 generation/notes；最终 output 消费 notes accepted ref；默认主路径和关闭分支皆保留 |
| quality-gate.md 模式判断/PREACCEPT | 按 candidate.processor 选 motion review 或 notes contract/content-guidelines；notes 仍继承适用 motion/source 行为，不要求未来 DONE handoff 才能验候选 |
| orchestrator.md postprocess 分支 | 识别 notes 以及 motion→用户确认→notes；父级完成一次；加工失败不提前 DONE；保留 raw FAIL 及作用域检查 |
| html-prototype/SCHEMA.md 的 Exact derived delivery identity 节 | 只把既有 motion-only 身份字段拓展为 processor-aware，并引用 notes contract 的扩展字段；不改变 html-prototype 生成器启用策略，也不把它纳入本期默认加工 |
| `.claude/skill-os/skill-invariants.md` P2/P7 | 精确增加 notes 输出模式及 OD 完成前 notes / motion→notes 的有限例外；保留_NODE/_STATUS含义、单次父完成、无效ref不退raw，不变成任意后处理特权 |
| `references/handoff-protocol.md` 最终原型消费段 | 加 notes standalone handoff/内部子调用的精确final_ref消费，禁止以历史raw或旧motion结果替代最新说明版 |

以上路径按表中精确位置定位（含 `.claude/skill-os/`），相对 skill 的 references 路径展开至 `.claude/skills/office/references/`；详细来源位置已纳入本轮接线调查。新增 core.js、generation.md、上述 SCHEMA 局部修改及 notes_manifest 字段是执行细化的有限文件增量，随整包批准，不是实现时临时扩范围。

### E7.4 公开入口、注册与恢复（U-009）

公开名称 `prototype-notes`。唯一 authority `.claude/skills/office/prototype-notes/SKILL.md`，只持有以下六步：①按标准 preamble/preflight 和 project/session 合同读取精确输入；②展示/继承确认并冻结当前 scope；③读共享 contract/content-guidelines/generation；④调用共享函数生成/绑定/合并/组包；⑤由 caller 独立派发 PREACCEPT 并 seal；⑥按下表 return 或普通完成。不把共享规范复制到 skill，不要求执行 Agent重新决定形态。

| 模式 | intake / 执行门 | 完成责任 |
|---|---|---|
| standalone | required: actual_html_artifact、requested_notes_scope；optional: existing_notes、confirmed_product_source、source_handoff、exact_accepted_ref、confirmed_prototype_revision、authorized_delivery_root。缺最终确认可先检查输入和展示，E1 的真实确认及 generation_scope 在生成/注入前必须成立 | 本次 notes caller 验收后写自己的普通 handoff；不写历史 OD/motion 状态。无项目权限不得从路径猜项目 |
| workflow | standalone 输入 + 本次真实已绑定 source_handoff/节点上下文；不得要求未来 notes DONE handoff | 只完成当前明确选择的 notes 节点，不改其它节点；本期不自动插入 optional graph |
| internal | caller、actual_html_artifact、requested_notes_scope、condition_evidence、inherited_authority、authority_effect_intersection 必填；原始 U-ID/来源/已有确认可继承 | 当前父 caller 持有确认与完成权，child 返回 candidate/accepted ref/证据；无独立 handoff/state。没有真实确认引用不能从权限推导确认 |

requested_notes_scope 是本次用户意图（例如新增流程 C），并不是允许 AI任意扩展的选择器。skill 先以实际来源与 DOM 将其冻结为 E2 Scope；含混到无法分清新增范围时是必要输入缺失，不猜全页。已含说明的 HTML 必须走 extract/import，不重新初始化 ID。正式 Brief、远端 OD receipt、workflow graph 均非 standalone 普遍前置；仅当 source 宣称 open-design/recover 时核对真实回收 provenance。用户只请求手工编辑入口、无需 AI 新生成时 scope 可以为空，保留人工全域编辑；不能因为没有 AI scope 阻止人工功能。

**接入登记（有限文件，不重复 authority）**：

| 文件 | 实施内容 |
|---|---|
| `prototype-notes/SKILL.md` 与 `agents/openai.yaml` | frontmatter 推荐角色 `core-execution`，声明本地 HTML 加说明/编辑/再次加工；标准 preamble 取当前 motion 先例的结构，仅替换合法 skill 名，不删保护区；输入与完成遵守上表 |
| `.claude/commands/prototype-notes.md` | 薄 Claude 入口，只加载唯一 skill authority；Codex 不执行此 wrapper |
| `.claude/skills/prototype-notes`、`.agents/skills/prototype-notes` | 两个 symlink 都解析至唯一 authority 目录；Codex 用 `$prototype-notes`/selector |
| `.claude/skill-os/skill-routing-map.yaml` | 新条目 prototype_notes，invoke=/prototype-notes、weight=8；精确意图如“给这个HTML补交互说明”“给已有原型加标注”“更新原型中的说明”；泛词“说明/侧栏/交互”不单独触发 |
| `.claude/skill-os/routing-chain-check.md` | 在既有 R2 OD-first 前加入“对明确已有 HTML 增改交互说明”例外；Project Gate/Plan 优先级不变。画一个新页面/改业务侧栏仍走原生成/设计路由 |
| `.claude/skill-os/input-modes.yaml` | 登记上述三模式及 preflight/input/semantic/source-scope/HTML-behavior/final-identity/completion 七门，静态视图只由生成器写 |
| `.claude/skill-os/model-routing.yaml` | core-execution.skills 增 prototype-notes；较大生成上下文/有规格执行、中等判断杠杆；关键独立裁决按现有 MR-004，不增账户模型名 |
| `.claude/skill-os/codex-viability.yaml` | tier 1：单本地 executor + caller 独立 review；若缺实际 browser 则按能力失败，不把 tier 当运行证据 |
| `.claude/skills/office/references/office-wizard.md` | 一级 skill 列表仅加一次，位于原型交付类别；说明可单独调用，不新增必经链 |
| `scripts/check-skill-scene-coverage.py` | 登记覆盖检查；产品中性，不能把它强行绑定某个 A/B/C/D 场景 |
| `skill-visibility.json`（只读核对）及 generated/ | 默认目录发现已可见就不加冗余 visible_additions；执行 `python3 scripts/build-agent-context.py sync` 后审核实际生成 catalog/input view/context index 差异，随后 check；不手改生成文件 |

若实际生成器并未发现新技能，应修复准确登记源再生成，不手工补 catalog。`agent-context-manifest.json` 本期不新增根层 notes owner，skill 一跳读共享合同即可；扩展现有 prototype-delivery owner 文义时只同步其既有真实投影。生成差异不得夹带无关治理内容。

**本次调用 checkpoint**：`notes-checkpoint.json` 存于当前已授权 metadata/attempt 外的调用证据位置，字段 `version,call_id,mode,parent_call_ref,stage,input_ref,confirmed_business_revision,notes_input_ref,scope_ref,candidate_ref?,accepted_ref?,completion_receipt?`。所有文件 ref 带 SHA；不含授权凭证，恢复从当前 runtime 重取权限。stage 仅取 decision.md D5 五个本地子阶段。ITERATING/AWAITING_CONFIRMATION 没有有效 candidate；CONFIRMED_READY 才能生成；CANDIDATE_REVIEW 只能接受该精确 candidate；ACCEPTED_AWAITING_PARENT 可重验并返回 ref，不重复父完成。父端以当前调用完成记录核对同 call_id 的已写 handoff/state；已完成只返回已有结果。失败不换成其它调用/旧票接着走。standalone seal 后使用普通完成出口，并记录其自身 completion_receipt。

**注册验收脚本** `scripts/test-prototype-notes-registration.mjs`：用当前 motion 注册测试的真实 consumer seam，不能新造与路由实现不同的假 matcher。至少覆盖 direct/semantic 命中、泛词与新建页面反例、生成视图/alias/输入门、缺确认和确认漂移拒绝、internal 不写第二完成、standalone 不要求 OD recover、不修改历史节点、checkpoint恢复只完成一次、E6 rebase 三分支（合法说明编辑/可分离业务编辑/不可分离拒绝）。机器脚本覆盖可执行消费者及结构边界；自然语言合同的执行由 U-008 两端真实调用证据补全，不用 grep 代替运行。

将 `test:prototype-notes-registration` 登记到 package.json、verify.sh、既有 CI job 和 check-ci-contract 的 blocking 数组；test-ci-contract 增缺此门的负例，与 E8.4 的另两门一致。实施后独立执行 `node scripts/test-prototype-notes-registration.mjs`。A-13 同时要求两端实际三入口证据，脚本 GREEN 不能代替。

## E8. 测试与证据合同

### E8.1 真实样本 manifest

U-002 先生成并冻结 `sample-manifest.json`：`version=1`、`sample{entry_path,sha256,recovery_ref}`、`confirmation_ref`、`notes_input_ref`、`scope_ref`、`baseline_required_ref`、`driver{path,sha256}`、`engines=['chromium','firefox']`、`expected_assertions`（列原分母和适用原因）、`evidence_root`。所有 ref 都有 path+SHA；执行权限来自当前 runtime，不来自 manifest。默认第二独立引擎采用 Firefox；缺失则明确阻塞这一项，不用两个 Chromium 品牌替代。修改样本或 driver 后重新冻结。

样本 adapter 是新浏览器脚本的受控执行输入，由实施 Agent 编写并审核，公开 `runBaseline({page,record})` 和 `enterContext({page,contextId,record})`；只做该原型已授权操作。它不从说明 JSON eval 代码，不能用真实服务提交替代纯原型测试。通用 notes 动作由生产 UI 按钮和真实输入触发，不调用内部状态 setter 冒充点击测试。

### E8.2 夹具/真实样本与断言映射

| 夹具/情形 | 必须实际观察的结果 | ASSERT |
|---|---|---|
| 基础页面、global capture handlers | 关闭时业务任务照常；工具按钮/输入/IME 可用，工具操作不增业务计数 | A-01/03 |
| 20/200 条密集标号 | 双向唯一选中、可展开聚合、无永久重编号 | A-02/09 |
| 鼠标和全键盘的非 focusable 模块、无目标整体规则 | 区域路径从新增到定位、填文、重绑、取消、删除/撤销闭合；整体规则跳过选区直接创建/编辑/删除/撤销/下载，重开无假pin | A-03/04 |
| 编辑后两轮下载 | 只复制 HTML，换目录/新 profile/断网重开；文本/锚点完整且原型初始可用，组件一份 | A-04 |
| AI 与人工三方冲突/删除/缓存分支 | 按 E3 每行逐一核对；逐字段保留/采用/暂缓/撤销、导出重开、N1→N2→N1经导出回流仍不重复提示、撤销恢复正确集合、新来源建议可再出现；已处理后同context由目标A重绑B产生新key，旧建议不可直接采用且新建议不被抑制；不丢人工或复活删除 | A-05 |
| Tab/portal/modal/重复行/滚动/重新渲染 | 隐藏不假定位；同名不同实例不混绑；跨 base 不用旧 fallback | A-06/09 |
| 禁用存储/超限/损坏 payload/脚本结束串 | 输入不执行、损坏拒绝、内存编辑和合法下载可用、错误可理解 | A-07 |
| 旧 raw/accepted motion/说明新修订 | 原票只代表原 bytes；新 spec/new required；未确认不加工 | A-08/10 |
| modal transform/overflow、2个同时原生modal | 单 modal 工具与业务焦点均正确；不支持态清晰，必要状态不假 PASS | A-09 |
| 三种调用与恢复 | OD internal单父完成、motion已DONE后独立进入、用户业务回流不丢改动；确认版本和stage正确 | A-13 |
| 五类说明内容 | 独立读者复述触发/结果/例外/待定，与源核对；没来源的数字不出现 | A-11 |
| A/B旧模板 + C跨页流程 + 同名实例 | AI只在C全覆盖；人可在A增改删重绑；再生成C保持A/B | A-12 |

性能先建立同机/同浏览器基线：200 条说明、持续滚动10秒，记录长任务、frame 时间与监听器/observer 数；关闭后 observer 为0，重复开关20次无累计节点/监听器增长。性能不能只凭“感觉流畅”；首版警戒阈值为相同基线下新增 p95 frame 时间不超过8ms，超出需定位/优化或记录不能支持的密度，不能少画说明假通过。数字是本工具实施验收建议，由 P1 同机基线确认适用性，不是产品规则。

### E8.3 未来命令接口（本轮不执行）

执行 Agent 实现新增脚本时必须支持这些参数；现有命令已核对 package.json。`NOTES_MANIFEST` 与 `NOTES_EVIDENCE` 由 U-002 的真实获准路径赋值，不能保留占位路径开跑。每条独立 bash 执行，非零退出原样保留。

```bash
# [BLOCKING] EV-01 — 数据、范围、合并、幂等组包与字符串/解析负例
node scripts/test-prototype-notes.mjs

# [BLOCKING] EV-02 — 两引擎通用行为夹具和保护失效反例
node scripts/test-prototype-notes-browser.mjs --fixtures --engines chromium,firefox --mutation

# [BLOCKING] EV-03 — 精确真实样本，不允许只运行 fixture
node scripts/test-prototype-notes-browser.mjs --manifest "${NOTES_MANIFEST:?bind verified manifest}" --engines chromium,firefox --output "${NOTES_EVIDENCE:?bind evidence root}"

# [BLOCKING] EV-04 — 原 delivery 边界、旧producer票和 notes新路径
npm run test:prototype-delivery

# [BLOCKING] EV-05 — 现有 motion 消费合同无回归
npm run test:motion-polish-registration

# [BLOCKING] EV-06 — motion 实际浏览器行为保留
npm run test:motion-polish-browser

# [BLOCKING] EV-07 — 原设计回收链与 mutation
npm run test:design-flow-handoff

# [BLOCKING] EV-08 — authority与生成投影一致
npm run check:agent-context
```

A-11 内容语义及 A-10/13 双端真实接入不可由这些脚本单独证明。另留独立语义票和 Claude/Codex 两端调用证据：正常路径、明确关闭、缺来源/未确认、候选失败；禁止模拟工具返回冒充实际 harness 执行。无法取得一端能力时这项不能 DONE。

### E8.4 持续验证登记（U-007）

只在 package.json 写命令不代表进入持续验证；本仓本地 verify.sh 与 GitHub CI 是两条独立调用链。本期将以下确定性门同时接入，完整双引擎/真实OD/真人采用保留发布前专项，不扩大CI浏览器安装范围：

- package.json 增 `test:prototype-notes`、`test:prototype-notes-browser`，以及 `test:prototype-notes-browser:ci`=`node scripts/test-prototype-notes-browser.mjs --fixtures --engines chromium --suite ci`；新driver明确实现这些flags，不引第二套参数别名。
- scripts/verify.sh 在现有 motion S51–53 之后增加新未占用ID的blocking check（实施时核占用，保留全部原ID）。数据suite与Chromium确定性fixtures均必跑。
- `.github/workflows/ci.yml` 的既有 validate-framework-logic job 同段显式执行以上数据suite、browser:ci及E7.4的registration；不新建job、不改gatherer，不在CI访问真实项目。
- `scripts/check-ci-contract.mjs` 的blocking命令列表加入这三条新CI命令；`scripts/test-ci-contract.mjs` 加“删任一新门就失败”的负例。`scripts/test-verify-composition.mjs` 的既有顺序约束不改，只回归。

实施后加跑 `npm run check:ci-contract`、`npm run test:ci-contract`、`npm run test:verify-composition`、`bash -n scripts/verify.sh`。browser:ci 至少覆盖开关/选区/人工输入/保存重开/scope区别，不得只检查元素存在。CI子集GREEN不关闭EV-02/03或语义门。

mutation 最少：关闭人工保护、关闭唯一匹配、保留旧验收标记、关闭 scope 守卫、让人工 picker 只限 scope、移除早期事件闸门。每项都要证明变体 RED、原实现 GREEN；使用隔离临时变体，不覆写用户源码，记录原/变体 hash。现有 synthetic integrity report 只能测 helper，不得拿来当生产 QG 票。

每次 evidence 输出 `run.json`（输入/driver/源码/浏览器版本、实例before/after、完整expected/observed、stdout/stderr/exit）、下载文件及 hash、必要截图/DOM和焦点证据、console/network、逐项语义/专家票。cleanup 后证据仍可读；截图不替代动作日志，hash不替代行为。执行结束检验 expected 与结果一一对应，无漏项或被改分母。

## E9. 逐需求完成矩阵

此表是执行包必须覆盖的原始目标，最后一列指实施后所需证据；当前不存在的实现不得写成已通过。

| 原需求 | 已定设计/执行落点 | 执行后证据 |
|---|---|---|
| R-01 专业交互细节交付 | 主§3/3.1；E1生成/E5呈现 | A-11原文/原型对照及接收者复述 |
| R-02 侧栏开关与数字联动 | 主§4；E4/5 | A-01/02/09真实点击、焦点与定位 |
| R-03 全局和模块UI/交互细节 | 主§3；E2规则/模块模型 | A-11类型与适用分支覆盖 |
| R-04 AI自动生成 | 主§5；E1/2/3 | scope/coverage/有源初稿及独立语义票 |
| R-05 人工增改删绑 | 主§4/6；E3/4/5 | A-03/04/05全操作及导出后保留 |
| R-06 固定通用UI | 主§7；E5 token/state，E6唯一源码 | UI采用记录、重复生成同版组件、A-01/09 |
| R-07 适配框架并可执行 | 主§1/2/9；E0/7/8 | 默认raw和motion派生、旧票、双端实际消费 |
| R-08 专家与红队 | 主§11；整包review | 同版本文件hash、独立真实原票、问题关闭 |
| R-09 同一离线HTML | 主§6；E6/7闭包 | A-04只拿一个HTML断网双轮重开 |
| R-10 动效后用户确认再说明 | 主§2；E1确认版本/E7顺序 | A-10未确认/版本漂移拒绝与正常路径 |
| R-11 UX产品研究 | 主§1.1；research AX/FG/ZE/UX | 来源事实/采用与不采用/未知边界可追踪 |
| R-12 人对人写作规范 | 主§3.1；research WR；E1/2/5 | 五类说明的自然表达、常用术语、无伪数值，A-11 |
| R-13 AI局部/人工全域 | 主§5.1；E1/2/3/4 | A-12完整覆盖、越界零生成、外部人工往返不变 |
| R-14 深审最佳节点与形式 | decision.md D1–7；主§2；E7.4；U-009 | 独立反证及同版定案票；A-13三种生命周期真实证据 |

规划 DONE 条件：上表每行在当前文本中有可实施定义；不存在待作者补齐的产品/接口决定；一手研究、现有框架接点与完整执行证据合同可读；整包独立专家和红队均无存活 MAJOR/BLOCKER，最终 fingerprint 一致。实现期样本和运行结果是明确的后续执行输入/产物，不能用它们尚未产生而伪造计划证据，也不能将规划票冒充功能完成。

本次准备阶段不执行 EV-01..08，不部署、不安装、不改 feature 源码。实施完成才按主计划 U-008 交付最终 HTML、用户使用说明、来源和验收记录；只发用户需要的 HTML，机器侧证据保留在框架授权位置。
