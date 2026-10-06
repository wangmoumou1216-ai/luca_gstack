# 有源交互说明生成与共享核心调用

版本 `1.0.0`。本文只拥有生成过程；文字规则见同版 [content-guidelines.md](content-guidelines.md)，
数据与人工保护见 [contract.md](contract.md)，机器结构见 [notes.schema.json](notes.schema.json)。
生成是框架端操作；离线 HTML 只有人工功能。没有在线模型、密钥或第二套 UI/算法。

## 1. 冻结输入，继承真实确认

caller 在实际权限内取得最新完整 HTML，核本次输入 SHA、来源与当前业务闭包。
用户确认必须绑定该业务 revision；回收、浏览器测试、motion PASS 都不能推导确认。
旧确认确实有效则继承，不重复询问。internal 返回本次结果，由父 caller 完成一次；
standalone 不修改历史 OD/motion DONE。注册、确认、恢复和最终 candidate 接线归 U-009/U-006，
本核心不拥有这些批准和状态。

生成前先完整读 content-guidelines，再冻结 E1 的 notes-input：document_id、实际 base、
user_confirmation、scope、来源登记、全部适用 behaviors 和最新 existing_notes。
已有包静态 extract；不执行它来提取，不用本机旧缓存替代最新文件。
输入完整 SHA、无说明 snapshot SHA、业务闭包 revision 是三种身份，分别保留。

scope 仅含本次新增/明确授权变化的 unit、跨页面/状态 context 和实际允许根。
behaviors 在写文案前冻结，列明正常/禁用/加载/异常/取消/键盘/UI 的实际适用项，
一条 behavior 含 action、expected、source_refs、critical、unit_id、context_id。
required_behavior_ids 必须与 behaviors 完整对应；不能以模型生成条数缩分母。

冻结 behaviors 前按 content-guidelines §2.1 先判布局/宽高适配是否适用：按主要内容区域或独立容器职责识别大模块，
再查来源/实际观察是否证明可用宽高会导致布局、可见性、溢出滚动变化，或连续伸缩/填满剩余空间。
仅将本次授权范围内、有源且实际适用的模块行为纳入 behaviors/required_behavior_ids；小控件继承尺寸归父模块一次，
不为所有模板或旧模块增加 AI 分母。适用说明写入现有 details.visual（“布局：……／适配：……”）或 UI 主要正文，
交代可用空间、占位/分栏/固定/滚动区与实际宽高变化；参数来源和 confirmed/observed/proposed 保持可追。
没有需求不生成空段或“待确认是否适配”，不猜尺寸/断点、不设计移动版，不加字段或第六模板。
公开核心校验该有源分母和现有文本的往返/保护；是否属大模块以及自然语言是否准确仍由独立内容审阅核原始来源，机器结构通过不替代该新增审阅。

## 2. 只生成声明式候选

AI 输出 NotesDocument 候选中的说明文字、来源、观察差异、行为引用及锚点候选；
不得返回运行代码、可执行选择器、点击脚本、第二份 JS/CSS/HTML。
已有 annotation ID、显示编号、人工标记、删除记录与历史从输入带入；
AI 不能声称新增项来自 manual 来跳过范围检查，不能清理 human_touched 或已处理历史。
范围外的既有人工/AI 项可以原样携带，不能改文案、编号或存在性。
同 scope unit/context 中行为重叠的新 ID 被拒绝，包含已有删除项，不能用换 ID 复活。

每个 behavior 映射到一条或多条说明；缺项必须失败，或有设计师明确的待定处置：
`{behavior_id,disposition:"deferred",reason,confirmation_ref}`。
confirmation_ref 只能解析为真实用户确认登记；模型或规格 ID 不能代替该处置。
无源补充标 proposed；已定但未演示和观察差异分别记录，采用建议不升级事实或实现状态。

## 3. 实际核对范围和绑定

Node adapter 的 validateGenerationScope 消费 `{source,before,proposed,scope,bindings,behaviors,sources,dispositions?,assisted_ids?}`。
source 是实际 snapshot 字节；bindings 的作用是声明要核验的定位映射，不能凭 verified/contained 标记授信。
adapter 先实算 source SHA 并与 scope/base 对照，漂移直接拒绝；再用 parse5 原文节点与受控 selector 重算真实根、唯一目标、祖先包含关系、指纹和实例。
共享纯 core 只消费上述核验后的事实表，浏览器 caller 须从实际 DOM 生成同口径事实。
来源登记/映射不是读取源文件的权限。动态 DOM 状态必须由真实浏览器 caller 核验，
静态 adapter 无法证明运行时才创建的对象，不对它伪称支持。

定位映射格式：

```json
{
  "version": 1,
  "roots": [{
    "anchor_id": "scope.units.root_anchor_ids 中的 UUID",
    "unit_id": "C", "context_id": "page",
    "root_identity": "#actual-flow-root", "evidence_refs": ["精确实际证据引用"]
  }],
  "targets": [{
    "anchor_id": "annotation.anchor.id", "unit_id": "C", "context_id": "page",
    "root_anchor_id": "上面实际根的 UUID", "root_identity": "#actual-flow-root",
    "locator": "#actual-target", "instance_key": "实际 data-instance-key/data-row-key 或 null",
    "fingerprint": {"tag":"button", "role":null, "semantic_name":"保存"},
    "evidence_refs": ["精确实际证据引用"]
  }]
}
```

portal 根另附 `portal{trigger_locator,evidence_refs}`：必须具体、唯一的真实触发元素，
以及在来源/实际浏览器中核对的触发归属证据。根仍列入该 unit/context 的允许根集合。
不能把 body 当允许根。A/C 同名实例不代表相同归属；实目标在 A、声明来自 C 时拒绝。
当前静态实现支持标签/ID/class/精确属性的组合及 descendant/child 关系，
不支持伪类、逗号、可执行表达式或选择器逃逸；不取第一个歧义目标。

`injected` 绑定另带 `strategy:"injected"`、实际 `source_locator` 与 fingerprint，
builder 在已验证 start-tag 原文位置插入 data-luca-note-anchor；不序列化业务树。
snapshot 保留原始字节，注入映射独立保存；重绑后的新状态仍须实际核验。

## 4. 校验、合并、逐字段处置

公开五 seam 由 scripts/prototype-notes.mjs 暴露，Result 为 `{ok:true,value}` 或
`{ok:false,code,message,details}`。validateNotes 的 value 仍是完整 NotesDocument。
不传来源上下文只证明结构和文档语义；传来源登记才核引用和 evidence kind。
validateGenerationScope 返回 coverage、violations、static_valid/source_valid/generation_valid，
delivery_acceptance 固定 NOT_RUN，不是独立交付票。

mergeNotes 消费 previous/current/proposed/scope 和同一 source/bindings/behaviors/sources。
它先拒绝跨文档、同 revision 不同分支、历史编号或分配器回退，再做实际范围核验。
范围外和人工项先保护；文本叶子采用人工优先三方规则。
C≠last_ai_value 即使人工标记为 false 也保护；AI 的 history/marker 不覆盖 current。
遗漏旧项不自动删除。source/target 变化仅提出比较建议，不自动换锚点/kind/scope。
重绑/context/base改变时，旧目标的 last_ai_value 置 null，human_touched=true，S 清空；
旧人工文字和旧建议/meta 保留，旧 meta 仍因版本不匹配禁止采用。这样导出回流只以 current
作为 previous 时，相同 N1 也必须对新目标生成新的比较建议，不会被旧 N=B 早返回压住。
旧 tombstone 候选不计 coverage，必须有有效覆盖或真实待定处置，不能借 AI 的复活影子过门。

建议 key 按合同固定数组 UTF-8 SHA-256，来源 revision 非时间戳；S 持久化、排序去重、无淘汰。
新 key 替换未处理建议时，merge 返回 `superseded_suggestions`，caller 把它们留在构建证据。
命中已处理 key 不改当前值或 AI 基线。HTML 导出/提取完整保留 S。

唯一人工事务 seam 是 `core.applyManualTransaction`（adapter 同名暴露），接受
`{document,action,annotation_id?,field_path?,changes?,annotation?,anchor?,context?,base_revision?,undo_token?}`
及来源登记。action：add/edit/delete/undelete/rebind/rebase/keep/adopt/defer/undo。
人工操作没有 generation scope 许可条件；全原型受支持区域与无锚点整体规则共用此入口。
keep/adopt 只处置一个叶子；defer 不变修订；采用保留实际 implementation_status，
混合 proposed 仍为 proposed；建议来源仅并入依据，不能变成真实用户确认。
undo token 只对最后一次建议处置且当前文档摘要完全匹配有效；后续人工事务使其失效。
所有提交是原子更新，修订递增，根置 unreviewed；超限不提交，不删旧 key、不截断 buffer。
人工 UI 的 buffer、缓存分支、展示和浏览器定位由 runtime owner 实现，不能在 UI 复制合并算法。

## 5. 确定性组包与资源闭包

buildAnnotatedHtml 消费 source、notes、sources、bindings；有 AI 项时须传 generation 证据，
不能省略范围/coverage 核验。纯 core.assemble 从不可变 snapshot 与最新 notes/bindings 重建，
离线下载使用同一函数，禁止序列化 live DOM。
真正 script 节点中的版本块、长度和 SHA 校验失败、重复 JSON key、未知版本或源漂移均拒绝。
额外业务修改导致完整 bytes 与重建不符时返回 CORRUPT_EMBEDDING，保留上传原件；
完整 standalone rebase 和业务确认属 U-009，不能用旧 snapshot 恢复来吞修改。

普通本地 CSS、classic JS、图像和字体须显式 `inline_assets:true`，且 closure 中逐项绑定
`{path,sha256,bytes,content?}`。content 已在内存时不读文件；读取本地资产时另须 canonical
asset_root 和当前 read_context 的确切 read_paths/read_roots。路径或 manifest 不扩权限，
symlink、逃逸、未选入闭包、SHA/长度漂移拒绝。原资产不删除。
内联保留 script/link 的原节点与属性，资源 URL 确定性转换成 data URI，CSS 的 url/import
闭包递归处理；转换证据区分 input SHA、snapshot SHA、业务 revision。
输入本身的 data JS/CSS/SVG 也解码检查；表面 data 不证明没有嵌套远程依赖。
module/dynamic/network、缺失资产、未知 MIME、不可检查 SVG/CSS 形式等具体拒绝。
静态闭包不能证明任意 JavaScript 运行行为；转换后的实际业务回归仍须独立浏览器验收。

read-only CLI：`node scripts/prototype-notes.mjs extract <获准精确绝对 HTML 路径>`。
它静态返回 Result，失败非零；不建立 delivery、不自动找项目、不 publish、不 seal。
调用本身仍须实际权限，命令参数不是授权。

## 6. 必需证据与完成边界

执行 `node scripts/test-prototype-notes.mjs` 的 EV-01，覆盖 A-04/05/07/08/12 的机器子项；
`--mutation` 在自身临时目录生成两类生产 guard 变体，确切行为测试 RED、原版 GREEN。
测试分母单独冻结，失败/退出码/期望/实测和源码 SHA 留在 run.json。
VM 同源码检查仅证明 factory 可在无 Node I/O 的 JS global 消费，不能冒称真实浏览器。
真实浏览器、OS IME、原生 zoom、A-11 内容语义、用户 UI 采用、接收者及两 harness 门，
都使用各自实际证据；EV-01 或旧 P1 通过不代替这些门。

完整封装的 safe JSON 编码后 HTML 上限为 96 MiB，shared factory 的 assemble 与 extract 共用 `maxPackageBytes`。即使合法输入快照低于 32 MiB，编码膨胀超过重新打开上限也返回 `EXPORT_FAILED`，不返回成功且无法重开的 HTML，不修改当前说明。既有 data 资源和 data srcset 逐项解码并检查类型、可执行内容和依赖，不能以 data 前缀代替闭包检查。

修复02收紧实际范围核验：portal 的入口必须由同一 unit 已批准且非 portal 的实际唯一根包含，不能用自身触发入口自证；当前不支持 portal-to-portal 链，发现入口落在任何已登记 portal 根时明确拒绝，保留原数据，不循环扩权。

来源状态或实现状态变化视作来源语义变化，现有文字和实际观察状态保持，候选转为带自身 states/source refs 的逐字段建议。merge 返回的 coverage states 来自实际 merged 条目；候选 states 留在 suggestion_meta。采用建议仅修改该文本字段、保守合并来源状态，保持实际 implementation_status 并置 unreviewed，不能把候选“已演示”当实际观察。

`assisted_ids` 是实际 caller 绑定的明确单条人工协助授权，仅接受一个已存在 manual ID；不是 AI 候选自报的许可。该条可以 scope_unit_id=null，已有唯一绑定目标从 source 实际核验，已有无锚点整体规则保持其 null anchor。候选只可提出文本/依据建议，不换身份、目标、scope、kind 或删除状态；其它条目须完全保持，不能新增 AI/人工条目。此协助项不充当 AI required behavior coverage，缺项仍拒绝。无授权时原人工项保持。该条原文本和人工历史受保护，建议可随同 HTML 完整往返。

本版本静态资源检查不支持 CSS 转义 token，任何 CSS 中的反斜杠均以 UNSUPPORTED_ASSET 具体拒绝，包括 style 属性、本地或 data CSS；不删除资源来通过，也不声称这些输入已离线自包含。含 image-set/-webkit-image-set/image/src/cross-fade/-webkit-cross-fade/paint 的资源函数同样具体拒绝；不能只检查 url()/@import 而将引号型依赖当作闭包。普通未转义且无这些不支持资源函数的 CSS 仍按原闭包规则支持。

修复03：同一 scope/merge seam 的内存参数 `request_kind` 可为 assist-only / generation / mixed，不增加持久字段。assist-only 只绑定一个旧且未删除的 manual ID，null generation_scope 可用，返回独立 assistance_coverage；普通 coverage 为空，generation_valid=false，assistance_valid=true，合并保留 current 的 generation_scope，不要求假AI条目或暂缓。generation 走原完整 scope/behaviors 分母且无 assisted_ids。mixed 明确允许已批准 scope 内 AI 更新并另协助该 manual ID，但普通 coverage 完整核验，assisted item 不填普通分母。缺省的纯人工原输入识别为单条协助；旧含AI的缺省 assisted 输入保持原严格单条保护及原完整 scope 分母兼容。许可只来自冻结caller参数，不来自候选字段。

资源检查先枚举 parse5 识别的 script、全部 on* 属性、javascript 可执行URI及 data 入口，经实体/URI解码后统一用同一JS/资源闭包检查器。直接网络、动态加载/执行入口明确拒绝；普通本地脚本、事件属性和本地javascript URI保留原文。被拒绝HTML不执行，数据/来源元信息不产生权限。

历史修复04（JS有限词法路线由修复05替代）：assisted_ids 分母在候选遍历之前独立核验；唯一当前人工条目、唯一候选和真实唯一当前目标缺一即拒绝，遗漏候选不能返回 target_verified=true。普通人工事务入口保持独立。

修复05采用构建端 acorn@8.15.0 标准 AST 取代手写 JS 扫描，不进 core 或离线包。classic script/URI 与 handler 分类解析（handler 支持 return），坏语法/module/直接动态与网络依赖拒绝；注释、字符串、正则不当代码，除法与模板插值按真实 AST 查验。不闭合的计算型可执行成员、全局别名上的计算型属性访问具体拒绝；普通数据索引保留。静态检查不自称覆盖所有运行时行为。

Node scope/merge/build 均明确 await，第二参数 callerContext 承载可信调用方的实际 Page/Frame 或 provider 函数。AI 候选/input.bindings/JSON verified 不创建观察能力；许可在 callerContext.permission.browser_read，来源 ref 在实际 read_context 内当前核对，实际载入 data URL 原bytes或真实 Response.body 必须同 source SHA，导航亦保持。实际 Browser→Context→Page→Frame 成员关系核对后，原生只读 DOM 查询重算唯一目标/可见性/context/祖先/完整FP/实例/portal；context_locator 或 contexts 对应真实当前状态，不能自动运行 entry_steps 或业务 click。scope/根定义须同可信 callerContext.approved_scope/approved_roots 冻结许可一致。没有能力、许可或载入版本证据具体拒绝，纯静态路径仍可用。provider 仅返回实际浏览器成员，不接收候选 JSON 函数或自报事实。

动态 semantic 锚点定位表嵌入同一个不可变源码包，不把 live DOM 序列化为业务 HTML。injected 动态目标无法映回 source 时仍具体拒绝。人工单条协助不继承 AI scope：仅已有该条的实际目标、文字建议和历史；既有人工 body 根不授予 AI 全域生成，普通 AI/portal 仍禁止 body 根。观察凭据留在 Result 的机器元数据，不把浏览器能力/授权写入 NotesDocument 或 HTML。

修复06：统一 AST 也拒绝直接全局 location 导航及其赋值/解构/调用引用、全局 open 和全局别名导航；普通本地事件处理器和 URL 文字保留。所有 script/handler/URI/data 入口共用该检查，不删业务源码，不声称静态检查证明任意程序运行。

互斥状态使用既有五 seam，新增的仅是可信 Node callerContext 临时调用选项：

```js
const observation_session = {}; // 身份 token；不填写事实，不序列化
const actualCaller = { ...approvedActualCaller, observation_session,
  contexts: { page: '#actual-page-state', modal: '#actual-modal-state' } };
// caller 以其已有权限正常进入 page；collector 只读，不执行 entry_steps。
await validateGenerationScope(fullInput, { ...actualCaller, observe_context: 'page' });
// 分母尚缺 modal 时返回 SCOPE_VIOLATION + collected/missing context 信息，未宣称 generation_valid。
// caller 正常进入 modal 后：
await validateGenerationScope(fullInput, { ...actualCaller, observe_context: 'modal' });
const merged = await mergeNotes(fullMergeInput, actualCaller);
const built = await buildAnnotatedHtml(fullBuildInput, actualCaller);
// finally：沿用同输入/许可显式结束；返回拒绝信息，释放资源，不执行一次新生成。
await validateGenerationScope(fullInput, { ...actualCaller, end_observation_session: true });
```

只有 adapter 私有 WeakMap 保存实际观察，AI/input.bindings/JSON verified/复制的 Result 都不能填入 token 事实。
token 绑定同一活 Page/Frame/Document、源 bytes/base/ref 和当前读许可、document_id、冻结 scope/roots/目标映射、context 定位及完整 behaviors。
实际 DOM Node 的身份只在该临时 session 的独立 Map/JSHandle 中编号，带唯一身份空间；不把各次 querySelectorAll 数组下标混为同一元素，也不向业务 DOM/window 写标号。
正常进入的每个 context 必须实际唯一可见；核目标全指纹/实例/根/祖先/portal 归属，缺状态/入口时完整分母拒绝，不能缩分母或猜静态 DOM。
消费时实际重新核当前可见状态；正常离开后隐藏或条件渲染暂不存在的状态保留先前实际观察，明确属于历史状态事实，不能冒称仍同时可见。
再次进入时重新核验当前目标与归属，支持同文档 DOM 重绘，不要求过去 Node 永远连接。当前状态缺失、歧义、越界、指纹/实例不符则拒绝并失效。
portal 入口在打开前实际可见且由同 unit 已批准非 portal 根包含时收集；打开后核真实 portal 目标，入口隐藏/inert 不要求再可见；自身/跨 portal 链仍拒绝。入口与所有者关系改变时须正常重进入口状态重新核对。

session 默认且最多 120000ms，可信 caller 可用 observation_max_age_ms 缩短，不可延长或从候选提供期限。
这只是机器观察生命周期，不是业务文案参数。源/许可/scope/context/目标定义漂移、导航（含同 URL 重载）、Document/Frame 改变、到期、浏览器/context/page 关闭、显式结束或异常失败都会失效；复用旧 token 拒绝，重新正常观察须新 token。
结束/失效释放 JSHandle/Map、timer 与生命周期事件监听；不安装常驻 DOM 观察器，不保存浏览器能力或 token 到 NotesDocument/HTML。只有缺状态的正常收集中间结果保留未完成 session 供下一状态。
Result 机器元数据区分当前 context、各状态实际收集时间和到期时间；实际行为断言只取正常观察证据。单次同时可见的旧调用和静态路径保持；仍不自动点击业务入口、不执行 AI 代码、不操作用户原 tab。

<!-- FILE_END: prototype-notes/generation.md -->
