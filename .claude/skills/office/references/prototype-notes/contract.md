# Prototype notes：内容、数据与同文件交付合同

合同版本 `1.0.0`；数据 `schema_version=1`；首版运行时及写作规范版本均为 `1.0.0`。
本合同将 2026-10-04 v5 第四轮冻结计划 §3–8、执行手册 E1–6 与 decision D1–7 转为共享消费规范。
它不证明 runtime、组包器或浏览器兼容性已经实现，也不替代之后的独立验收。

## 1. 权威与生命周期

- [content-guidelines.md](content-guidelines.md) 唯一拥有交付文字、术语、五类模板及内容审阅规则。
  自动生成、人工表单模板和独立审阅必须消费同一版本。OD 不另写一套文案规则。
- [notes.schema.json](notes.schema.json) 拥有有限机器结构；本合同 §3 的语义校验也是必需门。
- 后续 `core.js` 唯一拥有纯校验/合并/组包，`runtime.js` / `panel.css` 唯一拥有浏览器交互/样式，
  `generation.md` 拥有有源生成步骤；薄 skill 与 OD 仅负责调用，不复制实现。这些是实施责任，非存在性声明。
- Brief 的来源、D/STATE/位置/AC 与冻结 Packet 继续拥有设计事实；不新增 Packet 字段，不从最终像素反推业务要求。
  12 状态按 Brief 的适用性继承，不因本工具使用 AI 就给业务原型虚构 AI 状态。
- 原型回收 → UI/交互/可选动效调整 → **真实用户确认当前业务版本** → 生成/绑定/组包 → 组合验收 → 完成。
  已有有效确认直接继承；回收、motion PASS 或自动 QA 均不替代用户确认。只读技术检查可以提前。

| 调用场景 | 接单、确认与完成责任 |
|---|---|
| 未完成 OD 的 internal | OD 保持当前 Phase、继承/取得确认；notes 返回 exact 结果，不另写 handoff/state；OD 完成一次 |
| 已完成 motion 后追加说明、直接已有 HTML | prototype-notes standalone 接单并完成；不重开历史 OD/motion DONE，不伪造 recover 或 Brief |
| 只改说明后回流 | 最新完整 HTML 静态重建一致则继承业务确认；新说明及完整字节需新验收 |
| 业务代码/资产改过后回流 | standalone 保留上传原件，按 §8 提取实际新业务源并重新确认、重绑；不恢复旧快照吞掉修改 |
| 仅要 motion、明确关闭说明或仅回收归档 | 维持原 owner 路径，不自动追加说明 |

internal 的 caller 调度真实独立 QG、记录原票、seal；核心不授予文件权限、不认证判官、不拥有 Human Gate。
冻结后的最终引用继续遵守 `.claude/skill-os/runtime/prototype-delivery.md`。旧 raw/spec/receipt 和 accepted
motion 来源保留；旧票不代表新字节。独立入口不强制 workflow graph，其他生成器默认接线不在首版范围。
恢复子阶段仅为 ITERATING、AWAITING_CONFIRMATION、CONFIRMED_READY、CANDIDATE_REVIEW、
ACCEPTED_AWAITING_PARENT；不新增 Completion Status。恢复核输入权限、业务确认、scope/修订和 exact ref，
只重做失效部分，不重复父完成。

## 2. 输入、版本与身份

生成前冻结构建证据 `notes-input.json`（不是必须随用户交付的文件）：

| 字段 | 必需结构／边界 |
|---|---|
| input_version | `1`；未知值拒绝 |
| document_id | UUID；同一原型迭代沿用，独立克隆明确创建新身份 |
| base | `{entry_path,entry_sha256,source_ref,accepted_ref?}`；实读获准文件，不收未验 candidate 冒 final |
| user_confirmation | `{source_ref,confirmed_prototype_revision,input_artifact_sha256}`；真实消息或已有确认记录 |
| scope | §4 的 Scope；本轮新增或明确授权变化对象 |
| source_refs | `[{id,title,kind,locator,sha256?}]`；kind 仅 `用户确认`、`设计规格`、`原型观察`，locator 精确，SHA 如有须实核 |
| behaviors | `[{id,unit_id,context_id,action,expected,source_refs,critical}]`；全部适用正常/禁用/加载/异常/取消/键盘/UI 分支 |
| existing_notes | 最新完整 HTML 的静态提取结果或 null；本机旧缓存不能代选最新版 |

身份不可混为一个 hash：

1. delivery.base.sha256：本次完整输入 HTML/文件，含用户交回的说明版本。
2. notes.base_revision：未经说明注入的自包含原型源快照 SHA-256。
3. provenance.business_revision / confirmed_prototype_revision：确认时业务文件闭包的规范清单 hash；
   相对路径排序并绑定各原文件 SHA，自包含输入只有一个文件。源内联改变 bytes 时另留转换及行为回归证据。

provenance.source_revision 是已绑定来源的稳定版本，不取 AI 生成时间。provenance.source_title 是人可读来源标题。
说明变化不重置 UI 确认，但使当前交付需要新的验收。业务变化必须重核确认。任何元数据都不授予读取、运行或写入权限。

### 2.1 嵌入数据

NotesDocument 的**全部必需字段**：schema_version、runtime_version、content_guideline_version、document_id、
base_revision、notes_revision、next_display_number、generation_scope、annotations、provenance、validation_status。
顶层及所有子对象拒绝未声明字段，不自动剥掉陌生字段后覆盖原件。版本 1 仅支持已登记的 runtime/guideline
`1.0.0`；新版本须显式支持或迁移，不做“尽力降级”写回。允许读取失败后原文件原样保留。

| 对象 | 字段及作用 |
|---|---|
| Annotation | `id/display_number/revision/binding_revision/title/kind/body/details/source_refs/behavior_ids/evidence_status/implementation_status/creation_origin/generation_scope_id/scope_unit_id/page_or_state_context/anchor/field_origins/tombstone` 均必需 |
| Context | `id/title/entry_steps`；约束当前状态查找，entry_steps 是人工进入说明，不是脚本 |
| Anchor | `id/base_revision/strategy/root_identity/locator/context_id/instance_key/fingerprint/requires_rebind`；fingerprint 只有 `tag/role/semantic_name` |
| Scope | `id/base_revision/source_refs/units/required_behavior_ids`；每个 unit 为 `id/title/contexts/root_anchor_ids` |
| FieldOrigin | `last_ai_value/human_touched/suggested_value/suggestion_meta/resolved_suggestion_keys`；只用于文本叶子 |
| SuggestionMeta | `key/base_revision/binding_revision/source_refs/evidence_status/implementation_status`；状态严格复用条目枚举 |
| tombstone | null 或 `{deleted_revision,deleted_by:"manual"}`；人工删除历史保留 |

枚举：kind=`interaction/ui/rule`；evidence_status=`confirmed/observed/proposed`；implementation_status=
`demonstrated/not_demonstrated/differs/not_applicable`；creation_origin=`ai/manual`；anchor.strategy=`semantic/injected/scoped`；
根 validation_status=`unreviewed/reviewed_at_source`。reviewed_at_source 仅记来源版本审查，不能作为当前 HTML 的独立验收票。

title 必须非空且最多 200 Unicode 字符；body 非空、每个 body/details 文本最多 20,000 字符；details 可为 `{}`，
仅允许 conditions/feedback/exceptions/recovery/visual/keyboard。不适用键省略；可选细节空串不强造内容。
last_ai_value/suggested_value 按对应文本字段的上限。每文档最多 2,000 条（含 tombstone），UTF-8 notes JSON
最多 16 MiB（16,777,216 bytes）。超限事务不提交，保留原数据及编辑 buffer，不截断、不删历史 key。
所有数字采用可精确表示的非负安全整数；编号 ≥1、条目 revision ≥1、binding_revision ≥0、notes_revision ≥0。

field_origins 的路径仅有 `title`、`body`、`details.conditions`、`details.feedback`、`details.exceptions`、
`details.recovery`、`details.visual`、`details.keyboard`；title/body 必须登记，实际存在的每个 details 叶子均须有来源记录。
可保留暂时清空/省略的细节路径的历史，防止删字段绕过人工保护；kind/anchor/scope 不能走文本覆盖。
人工项允许 scope=null 和空 source_refs/behavior_ids；无源内容必须标 proposed，不伪造来源以通过 schema。
人工整体规则 `kind=rule,anchor=null,generation_scope_id=null,scope_unit_id=null` 合法，稳定引用号照常分配。
AI 项须有非空生成批次、scope unit 和 behavior_ids；AI 整体规则也不能免除范围归属，虽可 anchor=null 且不画 pin。

## 3. 两级机器校验（不可只跑 JSON Schema）

**完整通过 = 结构通过 + 全部适用语义校验通过。** JSON Schema 的 uniqueItems 不能证明对象数组按 ID/序号唯一，
也不能证明 DOM 范围、来源存在、事务历史正确。schema 的 `x-luca-semantic-validation` 是必须执行的机器可读
伴随合同；不认识该 profile/rule 的消费者拒绝写入，不能忽略扩展后宣称 validateNotes 成功。

| Rule ID | 层级与必须检查的行为 |
|---|---|
| PN-S01 | document：annotations 按 id、display_number 分别唯一（含 tombstone）；Scope.units 按 id 唯一。重复不能靠重编号修复 |
| PN-S02 | document：next_display_number 大于全部历史条目编号；分配即消耗，取消新建可留空号，不复用 |
| PN-S03 | document：每个 resolved_suggestion_keys 集合唯一、按字典序排序；不淘汰历史，suggestion 的值和 meta 同时 null 或同时非 null |
| PN-S04 | document：绑定 anchor 的 context_id 等于条目 context.id；非 null anchor 的 binding_revision ≥1；base 不同的 anchor 必须 requires_rebind=true，不可定位 |
| PN-S05 | document：删除修订 >0 且不大于当前 annotation.revision；title/body 与已存在 details 叶子都有 field_origins；对应历史/建议文本长度合规 |
| PN-S06 | document：generation_scope 非 null 时 base_revision 等于当前 snapshot；AI 历史项不因 scope 换轮而非法或消失；旧 scope 归属从已有证据保留 |
| PN-S07 | source-context：所有 source_refs（scope、条目、建议）都能在当前获准来源登记或保留的历史登记中精确解析；未知 ID、错误 kind/locator 拒绝 |
| PN-S08 | source-context：confirmed 须有用户确认/设计规格，observed 须有原型观察；proposed 可无来源；建议 meta 同样校验。实际文字是否忠实仍须语义审阅 |
| PN-S09 | scope-context：当前 AI 新增/更新必须属于当前 scope 的 unit/context、真实根/portal 实例与行为分母；全部 required_behavior_ids 有覆盖或设计师明确待定处置。人工 UI 不调用此许可门 |
| PN-S10 | transition：已有 ID/编号不可变，分配器不倒退，tombstone 不由 AI 复活；范围外原文/存在性不变，C≠B 的无解释差异按人工保护 |
| PN-S11 | transition：重绑/context改变/rebase 递增 binding_revision、清空各字段已处理 key，置根 unreviewed；旧 meta 可保留但禁止采用；同目标重绘/滚动不递增 |
| PN-S12 | transition：按 §5 保留/采用/暂缓/单步撤销更新 S，跨导出/提取不丢历史；相同 key 不改当前文本或基线。人工事务递增内容修订并置 unreviewed |
| PN-S13 | package：原始输入字节上限、未知版本/重复 JSON key/非 JSON 数值/损坏区块拒绝；新业务源/说明/运行时身份逐项核验，不执行 HTML 来提取 |

结构/schema 及 S01–08 的静态部分可在无浏览器的合成夹具中验证；S09 的真实绑定、S10–12 的合并事务与 S13
的 HTML 完整性需要后续 core/runtime 实现证据。不能把本合同或审计原型当作这些生产门已实现。
源码门必须 fail closed：只有有记录的结构/文档语义检查可以标 static_valid；没有来源上下文不能标 source_valid，
缺 DOM/coverage 证据不能标 generation_valid，缺浏览器/独立审阅不能标交付 PASS。

**来源登记的单文件落点解释**：E1 已验证的来源登记随 E6 惰性构建 metadata 同包保留，供离线导出与静态回流
解析 source_refs；不新增 NotesDocument 字段。该登记只证明引用结构及历史 provenance，不授予原文件读取权限，
也不替代当前来源语义复核。历史源未实读时不能声称规则已重新验证。人工新条目可无来源并标 proposed，
登记缺少某业务依据不能阻止这种人工编辑；未知的非空 source ID 仍拒绝作为有效引用写入。

## 4. AI 范围、来源与锚点

生成前依次读同版内容规范 → 任务与 scope → 有则读取 Brief/Packet/AC → 实际操作/DOM → 最新已有说明。
按流程组织全部适用 behavior，覆盖分母不以生成条数或模板全页计算。无上游时从明确任务和实际行为建立清单。
AI 只输出声明式 JSON，不输出 JS/CSS/HTML、点击脚本或可执行选择器代码。
每项行为对应说明或设计师明确的待定处置，输出 behavior→annotation→来源→演示/未演示/差异覆盖表。
范围越界、歧义或缺项使本轮自动生成失败；保留原件、旧说明、草稿和问题列表，不扩大 scope 过门。

AI 范围只限本轮新增/明确授权变化的流程、模块、组件及其所有页面/状态。模板重建整个 DOM 不意味着全页授权。
同名共享组件按本轮实例判归属。依赖范围外模块时可引用名称描述关系，不自动给它另加标号。
范围外已有人工或 AI 说明的内容、编号、存在性和删除历史保持。全局健康检查可提示失效，不能借此改写旧文字。
人工的新增/编辑/删除/撤销/重绑/下载覆盖整份支持区域；不按 generation_scope 裁剪鼠标或键盘目标树。
人工请 AI 帮写单条时只扩到该目标，不扩到模板全页。离线 HTML 没有模型密钥或 AI 重新生成能力。

绑定表 `bindings.json` 保留 `anchor_id/context_id/root_identity/locator/instance_key/fingerprint`、
实际验证的 scope unit 归属及证据引用；必要定位数据内嵌 HTML。AI 自填 root_identity 不是范围凭证。
范围检查用实际 DOM 包含关系或已验证跨 portal 实例：portal 实际根与流程触发证据加入 unit 允许根，
不能为方便允许整个 body。

定位优先：当前 context 的实际稳定语义 ID → 验证过的 `data-luca-note-anchor` → 同 base scoped selector + 完整指纹。
locator 只能是受控 selector/已验证 ID，不 eval、不执行脚本；零匹配显式隐藏/失效，有可靠状态上下文才区分，
多匹配标歧义，绝不取第一项。实例、语义、context 必须一致，DOM ID 存在不证明原业务语义未变。
屏幕 x/y 仅渲染，不持久定位；重复列表用稳定行 key 和区域，没有稳定 key 则绑列表模块。
注入属性重绘丢失时只在同 base、同 context、完整指纹严验通过后恢复；scoped fallback 不跨 base 自动复用。
业务 rebase 使旧 scoped/injected 锚点待重绑；semantic ID 也须新版本实际唯一核验后才能恢复有效。
canvas 内部、跨域 iframe 内部和 closed Shadow DOM 内部只支持宿主/模块，不声称精确内部定位。

隐藏 Tab/弹窗/逻辑页的说明仍在平铺列表显示。列表不展示定位告警；目标不可核实时不画标号、不滚向替代目标，说明内容和编辑入口保留。
不自动点击业务按钮、切路由、提交或复位。用户进入后标号随真实可见状态出现。
坐标按真实 rect 与滚动裁剪；离屏不画假边缘 pin。碰撞按稳定 display_number 聚合，可展开逐条选。
只在说明开启时观察 DOM/resize/滚动，用一次 rAF 合并；关闭卸载观察。数据与 UI 状态分离。

## 5. 字段合并、历史与修订

同 document_id，以条目 ID + 文本路径合并上次 AI 基线 B、当前值 C、新值 N。

| 条件（保护条件优先） | 结果 |
|---|---|
| tombstone 非 null | 保留人工删除，不因 AI 改 ID 或重建而复活 |
| 非本轮 scope、或人工项未获单条协助授权 | 原内容/编号/存在性保持；不以相似文字自动匹配 |
| 无人工修改且 C=B，来源语义/目标未变 | 可接受 N，更新 last_ai_value |
| 人工已改，N=B | 保留 C，不制造冲突 |
| 人工已改，N≠B 且 N≠C | 保留 C，给出 suggested_value=N 及 meta |
| C=N | 保留 C 及人工标记，更新 AI 基线，无冲突 |
| 来源语义变化、锚点歧义、ID 不能稳定对应 | 保留旧项，新内容仅待复核建议 |
| AI 漏掉原项 | 不自动删除，由 coverage 指出缺项 |

human_touched 只能由人工 UI 或可信导入产生/恢复，AI 不得清除。即使标记缺失，C≠B 且无可信生成记录解释
也按人工修改保护。生成器必须带入已有 ID；新条目按 scope unit + behavior ID 集 + context 去重，重叠候选需审阅，
不按文本相似度另建以绕过保护。

建议 key 是固定顺序 JSON 数组的 UTF-8 SHA-256：
`[document_id,base_revision,annotation_id,binding_revision,field_path,N,source_revision,sorted_source_refs,context_id]`。
JSON 使用紧凑无空格编码，字符串不做 Unicode 归一化，source_refs 排序且去重；来源版本非时间戳。
同一字段持久化当前 base/目标版的完整集合 S=`resolved_suggestion_keys`，唯一且排序、不按时间淘汰。
先执行删除/范围/人工项保护，再查 key 是否在 S；命中则 C、last_ai_value、S 都保持且不弹建议，不能回滚到历史 N。

| 逐字段动作 | 原子事务 |
|---|---|
| 保留我的版本 | C 不变，B=N，human_touched=true，S=sorted(unique(S∪key))，清空建议；来源/实现状态不变 |
| 采用建议 | C=N，B=N，人工标记=true，S 加 key 并清建议；建议来源并入依据；不自动升 confirmed 或 demonstrated |
| 稍后处理／关闭比较 | C/B/建议/S 均不变，不增加内容修订；允许下载当前文字和待处理建议 |
| 撤销本次处理 | 仅最近一次建议处置且此后无人工事务时有效；恢复该字段、B、来源、状态、S 和建议的事务前快照；作为新事务递增版本 |

采用 proposed 或混合待定内容后 evidence_status 保守为 proposed；implementation_status 保持实际观察，冲突显式待复核。
采用不改 anchor/kind/scope/business_revision。旧 meta 的 base/binding_revision 不匹配时保持采用按钮禁用，
不在列表或比较面板追加定位告警文案；允许手动编辑或框架对当前目标重新生成。相同待处理 key 复用；新 key 替换展示前把旧建议保留在构建证据，
显示建议已更新，当前人工文字不变。下载不锁人工交付，关键事实冲突仍阻止框架最终内容验收。

binding_revision：无锚点规则初值 0；首次区域绑定初值 1。显式重绑、语义目标/实例变化、适用 context 改变或
业务 base rebase 必须递增，清空所有字段 S。仅滚动/尺寸/同语义目标 DOM 重绘不递增。ID/序号/文字/tombstone 保持。
**E2/E3 字段映射说明**：E2 仅有根 validation_status，故不新增 Annotation.validation_status。E3 的“条目设 unreviewed”
在呈现与验收中由 binding_revision、必要的 anchor.requires_rebind 和旧 meta 版本不匹配表达；根置 unreviewed。
这只是字段落点解释，未更改冻结模型，也不改变文字、来源状态或人工权利。

必须验证的历史轨迹：

| 顺序 | 结果 |
|---|---|
| 保留 N1 → 保留 N2 → 导出重开 → 再生成 N1 | S 有 k1/k2，C 不变，不重复提示 |
| 保留 N1 → 采用 N2 → 再生成 N1 | C 保持 N2，不恢复 N1 |
| 保留 N1 → 保留 N2 → 立即撤销 → 再生成 N2 | S 只含 k1，N2 再次待处理，revision 不倒退 |
| 保留 N1 → 同 context 重绑 A 到 B → 相同 N1 | binding_revision 增且 S 清空，产生新 key，须重新审查 |
| 保留 N1 → 只滚动/同目标重绘 → 相同 N1 | binding_revision/S 保持，不重复提示 |

每次完成编辑/删除/撤销/重绑是一次事务，annotation.revision 与 notes_revision 递增；人工事务置根 unreviewed。
删除可撤销并恢复同 ID/序号。下载/换边不增内容版本。跨 document_id 不自动合并；同 revision 不同内容视作分支冲突，
不能按时间戳取“新”。缓存、静态提取、合并与导出都保留 S；超 16 MiB 拒绝整个新事务，不能删旧 key 过门。

## 6. 固定界面与操作状态

以下是工具首版参数，来自冻结 E5，**不约束业务原型视觉**；首个真实样本仍需用户一次 UI 采用及实际对比度/缩放核验。
桌面覆盖面板宽 360px、最大 `calc(100vw - 16px)`；视口 <640px 底部抽屉、最大 75dvh；padding/区块间距16px、
行间距8px；正文14px/1.55、标题16px/1.4；系统字体、白底、主文#20242C、次文#5B6472、边框#D8DDE5、强调#2457E6。
按钮/标号命中区44px，视觉标号24px。内容随缩放换行，不截断关键规则；校验失败调整工具 token，不改业务配色。

关闭态只有“交互说明”入口：无标号、轮廓、遮罩、全局快捷键或拦截层；入口外业务布局/滚动/键盘/URL 原样。
打开默认同时显示面板和当前可见标号。依据 2026-10-05 用户对真实样本的界面修正，面板固定顺序：标题/关闭与面板位置操作 → 平铺说明列表 → 底部新增说明/下载 HTML。
列表直接显示全部未删除说明的标题、完整正文与适用细节，不按类型或当前可见状态筛选，不提供标号开关、已删除列表或全局编辑按钮。
每条右侧直接“编辑”；选择卡片只改变高亮与定位，不折叠正文。依据2026-10-05用户截图修正，不展示状态徽标、状态前缀或“来源与区域”折叠；source/status/history继续随文件保留。状态仍写入数据与交付包，但不在列表正文前追加机器状态标签。编辑页从标题字段开始，不显示重复标题和其分割线。无说明显示“这里还没有说明”，底部新增入口保持可用。
桌面覆盖、不挤压/缩放业务页；可换左右或收起，被遮挡时提示换边/收起。窄屏查看和操作原型可切换。

| 状态／事件 | 下一状态、数据与焦点 |
|---|---|
| CLOSED → 打开 | VIEW；默认标号开，焦点到标题后首个操作 |
| VIEW／EDIT_LIST → 条目编辑 | EDIT_FORM；焦点到标题，无全局模式切换 |
| VIEW／EDIT_LIST → 底部新增 | CREATE_KIND；区域说明/整体规则两个可键盘操作按钮，Esc 回底部新增 |
| 选区域或重绑 | PICK_POINTER，可进 PICK_TREE；键盘默认焦点目标树 |
| 选整体规则 | EDIT_FORM；anchor/scope=null，可选整份原型或已知页/流程 context，直达标题、不经选区，无画面 pin |
| PICK → 确认 | EDIT_FORM；新增消耗新编号，重绑保留 ID/序号并按 §5 改 binding revision；不调用业务 click |
| PICK → Esc | EDIT_LIST，不改条目；焦点回新增/重绑按钮 |
| EDIT_FORM → 完成 | 校验必需标题/主说明；成功原子提交并选中卡片，失败留 buffer 并聚焦错误 |
| EDIT_FORM → 取消 | 丢本次 buffer，不撤销之前事务；新建取消可留序号空隙，回原卡片 |
| VIEW／EDIT_LIST → 更新建议 | COMPARE_FIELD；当前文字/建议/依据/三动作；已有 buffer 先完成或取消，选择前保留 |
| COMPARE_FIELD → 处置/撤销 | 按 §5 字段事务，回该卡片或下个未处理字段，不重置全文 |
| 打开态 → 关闭侧栏 | CLOSED；本页未完 buffer 保留，再开恢复；焦点回来源，不存在则入口 |
| 删除/撤销删除 | 写/清 tombstone；删除后底部提供“撤销删除”，恢复同 ID/编号，其他编号不动；不显示已删除列表 |
| 下载 | 有 buffer 先验证应用，失败停止下载；成功只提示“已发起下载” |
| modal 开关 | 保留状态/buffer 后迁移自有 host；不改业务 modal/inert |

标号点击只选相应卡片并滚入面板；卡片点击仅在目标真实可见时高亮/滚动。标号独立命中，不把整模块变说明按钮。
人工选区一次性，不触发业务操作。键盘树从当前有效页面根（有 modal 则 modal）开始，包含可见可标注模块，即使不可获业务焦点。
上下同级移动、左右展开/收起父子、Enter 确认、Esc 取消并还焦点；可搜索、有名称/类型/层级与轮廓提示。
无名称目标用类型与相邻文字作只读提示，不猜语义。排除工具、自身不可见/inert/不支持区域，不按 AI scope 过滤。

桌面非模态侧栏不困焦点，窄屏工具抽屉管理自身焦点与背景命中；工具 Esc 先退出选区/编辑子状态再关面板，
业务区域 Esc 保留原义。颜色不作唯一状态提示；焦点可见、名称可访问、尊重 reduced-motion。

### 6.1 事件与原生 modal 边界

最小同步 bootstrap 必须在所有原业务脚本前注册 window capture 控制器。按 composedPath 识别工具事件，
阻止业务全局监听接收，同时由这个早期控制器直接处理工具命令/input/composition；不依赖已被阻断的目标/冒泡监听，
不重新派发模拟事件。文本输入、选择、IME 和 Tab 的浏览器默认行为需保留并实测。关闭态直接放行所有事件。
选区透明命中层阻断 pointer/mouse/touch/click/contextmenu 及选区键盘事件、取消业务默认行为；短暂隐藏命中层只读
elementsFromPoint 后恢复，不重放点击。CSP/加载器不允许前置时不能假称编辑通用支持；必要路径失败阻塞交付。

首版只承诺待验证的单个原生 modal 路径：无 modal host 在 body；开启后仅把自有 host 移到 dialog 后代并用 manual popover
进入 top layer；不移动业务节点、不移除 inert、不关闭业务弹窗。model 与 host 分开，迁移不丢 buffer。选区只命中有效 modal，
不可穿透背景。退出后回 body；来源仍连接且可聚焦则还焦点，否则说明入口。多个同时存在 modal、缺 popover、业务移除 host
或焦点合同不能保留，显示状态限制并保留数据；涉及必要目标时验收 FAIL。Shadow Root 只隔离样式，不是事件/安全沙箱。

## 7. 保存、离线包与导出

主流程：编辑 → “未导出修改” → 下载 HTML → 最新数据与完整原型同文件 → 发出新文件。
打开默认说明关闭、原型自身初始状态；保留说明与锚点。下载不证明文件已落到指定位置，也不表示覆盖原文件。
不以原地写文件 API 为必经路径。依据2026-10-05用户明确取消草稿恢复能力，本工具不读写localStorage，不提供缓存恢复入口，旧本机缓存不参与当前文件。编辑事务在当前页面内保留，需下载HTML保存；关闭说明再打开保留当前页面编辑，刷新或重开读取所打开文件。不得删除旧缓存或改写浏览器中其它业务数据。

绝不导出 live `document.documentElement.outerHTML`。同一纯组包函数用不可变原型源快照 + 最新 notes/bindings +
固定 runtime package 重建，host/runtime/惰性快照各一份。原业务输入/弹窗临时状态不混入，不承诺保存现场业务数据。
无修改重复导出字节相同，编辑只改变说明/定位及必要版本，快照 hash 不变。人工修改导出形成新说明修订，
不再暗示当前版本已独立验收；保留历史 provenance，用户仍可正常编辑交付，进入工程链时重验新版。

文本只作惰性 JSON 数据，安全转义 `<` 与脚本结束串；以文本节点渲染，不接受任意 HTML/脚本/可执行链接。
notes 超限或版本不支持保留原件/buffer并明确失败。导入静态校验 schema、语义、大小、身份、区块长度/完整性，绝不执行输入 HTML。

构建側确定性原文区间路线：parse5@8.0.1 + sourceCodeLocationInfo:true 只找真实节点与注入/内联区间，
不重新序列化业务树。隐式节点无位置不能猜；Unicode/BOM/换行和 offset 必须验证无损。
首次保存安全插入位置；离线再次导出只用同一快照与这些位置，不给浏览器加 parser。
只从真实 script 节点识别版本区块；重复、伪造、损坏或未知区块拒绝，不降级为普通 HTML 再套壳。

| 输入／状态 | 首版处理边界与证据要求 |
|---|---|
| 已自包含单 HTML | 保留业务源码，确定性组包；仍需真实样本回归 |
| 常规本地 CSS/经典 JS/图片/字体 | 获准后检查完整闭包、确定性内联并留转换/行为证据；原资产保留机器证据闭包 |
| 模块图、动态 import/fetch、服务端路由、缺资产、不可合法内联资产 | 给具体依赖清单，停止不支持输入；不删依赖过关 |
| 多 HTML 跨文件站点 | 不宣称已支持单 HTML，需另行界定 |
| canvas/跨域 frame/closed Shadow DOM | 仅整体模块；必要内部目标无法实现则失败 |
| 桌面编辑、窄屏查看、单文档多状态 | 本期目标，须实际键盘/缩放/滚动/模态与双引擎证据；非已测支持列表 |

单文件验收必须只复制 final_entry 到空目录，改名/换目录/清缓存/新 profile、断网两轮重开。
不借机器目录其它资产帮助通过。原交互和 notes 都须验；没有真实 OD 样本，合成夹具不能关闭 U-002。

## 8. 提取、回流与公开 seam

已带说明的输入先静态提取 snapshot/notes/bindings/runtime，用确定性重建与完整上传 bytes 对照。
自描述块不含自引用 final SHA。不一致返回 CORRUPT_EMBEDDING，保留上传原件，不恢复旧 snapshot 覆盖用户业务修改。
用户要把外部改过的业务 HTML 作为新基线时，standalone 执行明确 rebase：

1. 原样保留上传 bytes/hash；静态提取仍完整可识别的旧 notes。
2. 仅已知版本且边界/唯一标识/原插入区间/源映射可验证时，移除工具自有区块，保留区块间**实际最新业务 bytes**；
   已内联业务资产保留当前结果。混写、重复/移动导致区间不唯一、依赖无法闭合时暂停，取得准确业务 HTML。
3. 产生未注入工具的新源候选与逐区间记录，复核闭包、无重复块及行为等价；展示并等待/继承这个业务版本的真实确认。
4. 沿用 document_id、原 ID/序号/人工标记/tombstone，更新 base_revision；按 §4–5 失效旧绑定与建议历史，不自动改写人工文字。
5. 冻结当前 scope/behaviors，生成/合并/组包并新候选验收。delivery.base 与 patch.before 仍绑上传完整文件；
   新快照/转换另记构建证据。失败保留输入，不交付半个有效包。

合法的仅说明导出不走 rebase；未知版本不剥壳试错。

| 新增接口（后续唯一 core） | 输入 → 结果 |
|---|---|
| validateNotes | document → 规范化 document/字段错误；不改文案，必须落实 §3 文档级语义 |
| validateGenerationScope | before/proposed/scope/bindings/behaviors → coverage+violations；不作人工许可门 |
| mergeNotes | previous/current/proposed/scope → merged+conflicts；输入不可变，落实 §5 |
| extractNotes | HTML bytes → notes+source snapshot+runtime package；静态读取 |
| buildAnnotatedHtml | source bytes+notes+bindings+固定 runtime → HTML bytes+build metadata |

新增接口统一 Result：成功 `{ok:true,value}`；失败 `{ok:false,code,message,details}`；CLI 失败非零，不返回半份有效交付。
core 无 DOM/文件/网络；runtime 管浏览器；CLI 仅执行已授权本地 I/O。旧 delivery helper 仍返回对象/抛命名 Error，
adapter 映射其错误，不为统一外观改旧调用方。
最少错误码：INVALID_NOTES、UNKNOWN_VERSION、SCOPE_VIOLATION、COVERAGE_GAP、ANCHOR_AMBIGUOUS、
SOURCE_CHANGED、CORRUPT_EMBEDDING、UNSUPPORTED_ASSET、UNSUPPORTED_MODAL、EXPORT_FAILED。
UI 显示短中文原因及下一步，代码留在开发补充/证据。新字节需要 exact candidate/独立原票及 accepted ref；
默认分母保留原型源/父 motion 全部 required 行为，并加入适用 notes 行为，不能以 AI 局部 scope 缩掉原型验收。

## 9. 验证责任与未实现边界

U-001 的 schema 合成验证只覆盖结构和明确声明的静态语义，独立内容审阅仍须对真实五类样本运行。
之后须证明：人工保护/历史集合/重绑失效、完整单文件两轮往返、最早业务 capture 计数不变且工具输入可用、
单 modal/焦点、范围内全覆盖与范围外人工自由、原交互保持、旧票失效、两个独立浏览器引擎及两端真实调用。
移除人工保护/唯一匹配/旧验收失效/范围守卫必须测到 RED，再恢复 GREEN。
Claude slash 与 Codex skill selector 是各自入口、共同消费本合同；本文件不证明两端触发/执行/降级已经实测。
固定 UI 采用、真实 OD 兼容性、A-11 人对人复述不能由静态或合成校验替代。多人协作、账户、云存储、
评论审批、任意页面设计编辑、在线 AI 与 PDF/Word 规格书不在首版范围。

## 10. 当前固定界面用法

用浏览器打开交付的 HTML，点击“交互说明”开启侧栏。说明直接平铺；点击画面标号选中对应说明，点击说明标题定位当前可见目标。关闭侧栏回到普通原型交互，标号自动消失；关闭不会删除本页未完成的编辑。

底部“新增说明”可选“区域说明”或“整体规则”：前者通过鼠标或键盘目标树选择当前可见区域，再“确认区域”；后者不选区域、不显示标号。填写标题与主说明，点击“完成编辑”提交，“取消编辑／取消选区”退出当前操作。人工可在整个支持原型上操作，不受本次 AI 新增范围限制。
每条右侧“编辑”直接打开表单；选择条目后可“删除说明”，底部“撤销删除”恢复同 ID 和编号，不提供已删除列表。待处理建议可逐字段保留、采用或暂缓；“撤销上一步建议处理”只撤销仍可撤销的最近一次处置，不覆盖后续人工修改。

隐藏页面或弹窗中的说明一直保留在列表。需由你进入对应业务状态，工具不会自动提交、切页或打开弹窗；未核实的目标不显示画面标号，也不会跳到相似区域。需要换区域时在编辑表单点击“重选区域”，选择真实区域并确认；编号和文字保留，旧目标的建议需重新检查。整体规则无需重选。不显示“目标已改变，请重新绑定”或“当前不可定位”等持续定位提示。

点击“下载 HTML”保存最新完整原型；有编辑 buffer 时先校验并应用，失败则留在表单修改。“已发起下载”表示浏览器开始下载，
请核实文件实际保存位置。用新文件重开，说明和人工历史随文件保留，业务原型回到自身初始状态。浏览器草稿缓存不等于交付，
旧原文件也不会自动被覆盖。交给前端的是这份新下载的单个 HTML；一起指出仍待确认、未演示或存在差异的条目。
手改业务 HTML 后需重新核业务版本并重绑，不能沿用旧票宣称新字节已验收。

<!-- FILE_END: prototype-notes/contract.md -->
