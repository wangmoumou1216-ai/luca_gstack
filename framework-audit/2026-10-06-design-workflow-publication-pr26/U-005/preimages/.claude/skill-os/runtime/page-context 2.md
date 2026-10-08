# Page context — 页面参考与位置交接

**用户提供原模板时，先验证一比一复制。** 原始 HTML/CSS/脚本/资源/隐藏状态完整保留，定位信息放旁车；
只在后续明确授权的副本区域实施增删改，不能简化、重画或改色作为入库步骤。无法安全适配时返回
`ORIGINAL_ADAPTER_REQUIRED`，不以静态替身、截图或 reference_only 偷换用户已指定的原件。原件路径按 §7，
不绕回旧静态 carrier-binding 或截图交接。

**设计源已对齐、即将交给 OD 或 Claude Design** 时，完整读取本合同。它是现有
design-brief / open-design 的一个交接步骤，不是新 workflow，也不改变 Project Gate。
design-brief 冻结前执行 §2 非绑定检索、§3模板/位置选择与 §2.5语义适配草稿；不提前采用最终bundle或改变需求。冻结后按§6/§7核验正式binding/TAC/adoption。
只判断该交接的输入、采用、授权或完成规则时也读取本合同，但不运行预览、stage 或 skill preamble。
仅框架维护、仅 UX 评审或 recover 不执行本步骤。目录和区域真值是
`.claude/skill-os/page-library/catalog.json`；结构合同是同目录 `schema.json`。

## 1. 绑定来源和范围

先固定已对齐的设计源及用户补充要求：chain 用 Design Generation Packet，adhoc 用用户
明确点名的方案，UX 改版用已确认的问题及位置。缺源或需求尚未对齐时停在原入口，不建空项目。
需求正文、稳定 ID、决策依据、被否决方向、全部非 N/A 状态和改/保留边界继续由原 skill 管理。

本库的 `scope=framework` 表示框架自有参考资产，不代表活跃项目属于 CRM，也不授权访问
项目资料。仅解析目录允许的源根；不跟随 symlink、共享别名或目录中的跨项目路径。
项目私有源必须另走已验证 Project Gate，不能改一个 scope 字段绕过授权。

完成条件：来源明确、原需求门已过、读取范围已验证；不能从旧页面反推当前产品或视觉规范。

## 2. 语义推荐

运行目录验证，再根据需求检索：

```bash
node scripts/page-context.mjs validate --catalog .claude/skill-os/page-library/catalog.json
node scripts/page-context.mjs candidates --query '<已对齐需求中的页面用途和位置>'
```

命令只给内部词面线索，不替 agent 做语义判断，也不输出采用授权或精确置信概率。
完整读取 `catalog.json`，结合已对齐需求判断页面用途、信息结构和要改区域；词面命中不是推荐资格。
Phase-A `phase-a-discovery` 返回最多三条临时线索或 `NO_HINT`，不作相关性排序保证；否定词、
同义表达与目录顺序都可能影响词面召回。最终判断仍读取完整目录，不将三条线索当搜索全集。
`NO_HINT` 不是最终 no-match，更不是需求已经澄清的证明。
**仅高置信度才推荐**：核心用途和目标区域都有明确来源依据、源版本有效，且与需求的重要约束
没有未解决冲突。桌面源可作移动端信息结构参考，但必须说明对应关系，不能仅凭“列表”同词命中。
最多推荐三个满足该条件的页面/区域，逐项说明对应需求；高置信度仍不等于用户已采用。

**分开判断页面与动作位置。** 对每个增删改、refine和preserve，展示“原始需求 ID/原文 → 页面用途/支持状态 →
module 或 slot → 动作 → 对应证据/冲突”。页面用途吻合而目标位置有两个合理解释时，位置仍未决。
不把锚点唯一、hash 有效或模型自报 high 当语义正确的证据，不编造成功率。没有自然语言样本的
独立实测时，不能宣称已校准的匹配准确率或速度保证。

**低置信度不推荐**：不展示弱候选、不默认取最高分、不编造百分比。没有足够依据时明确
“暂无高置信度参考页”，记录 `status=no-match, reference=none`，直接沿原授权把已对齐需求交给 OD。
可非阻塞询问“你有没有想参考的页面？”，但没有回复不阻止无参考交接，也不隐式采用任何页面。
这里的 no-match 表示本次没有可推荐匹配，不宣称整个页面库绝对不存在相关页。

已有用户指定页优先：验证其 ID、源版本与位置，不让推荐覆盖有效选择。明确指定的源失效时
只请求补充/重选，不静默换页。新增库记录在通过验证后能被同一过程发现，不另改路由词表。

完成条件：展示的候选全部高置信且理由可追溯；否则不展示候选、以 reference=none 继续。

## 2.5 Brief 内的非绑定语义适配（冻结前）

三入口统一由 Brief 把原话/实际文档/原型观察归一化为完整来源索引：任务、对象、动作、语义区域职责、
修改/保持范围和AC。用户已有模板/位置有效时继承；需要补问时只问会改变意图的歧义。
语义判断由设计agent完成，page-context拥有目录、实际源、位置与能力校验，不能把职责藏在OD自由生成中。

用 `computeDesignSourceRevision(sourceItems)` 与 `validateAdaptationDraft(catalog, record, {root,sourceItems})`，
CLI 为 `node scripts/page-context.mjs adaptation-draft --record <草稿.json> --sources <当前来源索引.json>`。
`sourceItems` 为独立权威输入，每项 `{id,text,required_states:[实际状态ID]}`；不是从草稿反推事实。
草稿使用 schema.json 的 `adaptation_draft`：源revision、目录hash、模板实际hash、全量source IDs，
每一source/state的完整原文、动作、用途原文、静态target_excerpt完整职责原文、位置、状态/位置依据、置信与替代。来源状态ID按语义核对，
无现成支持记unknown/unsupported并列扩展/更换/裁定，不仅靠名字；设计方案支持扩展须在冻结后合同中验证。

静态定位使用真实module/slot/region ID；原件使用实际inert索引scope/locator/label，含隐藏template。
原件动作按scope/locator/action去重后联合核对范围兼容性，重复来源/状态不构造重复动作，不同动作/重叠保持区不能报告ready；另过实际源字节范围/禁止目标/void兼容门：void add/modify拒绝，refine允许经原件专用检查。静态carrier动作按action/target去重后，以正式binding的同一module/slot图联合检查重复目标与祖先重叠；合法冲突只能记needs_context，不存在或非法目标仍拒绝。草稿preserve-only只验证定位，不授予最终无变化衍生。静态state_support必须证明位置支持；原件目录状态名不是交互证明，依据须设计/用户复核。
validator校验原文、全量source/state覆盖、实际源/定位、允许动作及已知状态支持；不会证明语义判断或原交互。
ready不能含未知/不支持、低置信或替代位置；refine不得与结构动作混用同一profile；返回ADAPTATION_READY仍 `binding_allowed=false`、
`execution_allowed=false`。closed schema不接受frozen_packet/adoption/TAC/bundle hash，草稿不是最终binding。
输入、模板或位置变更时草稿失效，Brief修订后重新适配。草稿旁车不进入Packet；Packet保留语义位置/保持事实。

完成：模板选择有真人依据，全部源/状态有位置或冲突，关键冲突处理，再完成Brief其余状态/决策并冻结。
未指定模板时可明确无参考；指定原件或未决适配冲突不能以reference_only绕过。

静态 structural_carrier 的 refine 是受限声明检查：除scope/class守卫外，必须至少一项可判定的有效inline CSS声明变化；class-only拒绝为REFINE_NO_VALID_CSS_CHANGE。支持颜色（基本named/hex）、物理margin/padding、尺寸、font-size/weight/style、line-height、letter-spacing、opacity、gap及border-radius；具体值子集以helper为准。同一变更style内的未知声明必须原segment保持且仅font-family/box-shadow可与支持属性变化共存；其余未知声明含custom、逻辑尺寸与shorthand默认可能覆盖，一律拒绝。未改style不影响其他目标的合法精修。原件路线用inert浏览器解析合法声明/类token。两者均不计算像素或证明行为，实际交互/视觉仍待独立验收。

## 3. 预览与真实确认

用 `scripts/page-context-preview.mjs` 的隔离预览展示所选页。预览只用于定位：源页脚本、
文字指令和外部资源不能取得执行/联网/文件权限。不能安全渲染时报告具体缺口，采用有来源
和版本绑定的截图；不把缺少样式的页面称为准确预览。

用户可选整页、已登记区域或框选。选区表示“改哪里”，默认不锁定桌面宽度、像素位置或旧视觉；
比如移动端列表可以参考记录/筛选结构，但不强套桌面表格。原位不动等要求须单独记录为用户约束。

| 用户状态 | 页面上下文 | 下一步 |
|---|---|---|
| 明确采用页面/位置 | 验证 confirmed 记录 | 沿原工具目标与写入授权继续。 |
| 明确拒绝参考 | reference=none | 不附被拒页；不重复索要已经有的工具写入授权。 |
| 无高置信匹配，包括低置信或无匹配 | status=no-match, reference=none | 需求包继续；可非阻塞问自带参考页，不回复也不附页。 |
| 已展示高置信推荐，但采用尚未决定 | pending | 等待采用/拒绝的真实回复，不默认选择；用户要求不用参考时继续。 |
| 用户指定页失效或坐标过期 | 需要重新确认 | 保留需求正文，重新预览/定位后再采用。 |
| 需求范围、修改动作或位置仍有歧义 | NEEDS_CONTEXT | 提出一个能区分候选解释的问题，等待回答；不借 no-match 跳过未决需求。 |
| 模板包含状态名称但该状态未获结构支持 | 不能绑定该状态 | 告知缺少哪一状态/位置证据；已指定模板保持 NEEDS_CONTEXT/BLOCKED，先处理冲突。仅未指定模板，或真人明确撤回模板约束且完整需求仍对齐，才可转 reference_only；不自动删状态。 |

记录中的 `confirmation.actor=user` 和 evidence 字符串只是索引，不是签名，也不能证明
真人回复。调用方必须核对本轮真实用户消息或用户在选择器中的确认；自动化测试的点击和
agent 填写的 JSON 均不代签 Human Gate。没有结构化提问工具时用普通文本问并等待。

框选必须绑定生成的预览 manifest、实际截图 hash/原始尺寸、源 hash 与视口，使用正确的
缩放、图片原点和滚动换算。校验器独立核对预览依据，不只检查用户记录中的 hash 格式。
源/截图/视口有变化时旧选区失效；同一有效确认不反复询问。

完成条件：confirmed 有真实确认且版本/位置校验通过，或明确 reference=none；pending 不越门。

## 4. 交接边界

把验证后的页面上下文附到同一份 Generation Packet / adhoc 方案，不建立第二份需求真值。
传递需求正文、page_id、区域/选区说明、源版本、确认来源、改与保留范围、流程和非 N/A 状态。
接收方必须实际能访问页面参考；本机绝对路径不是可达附件。默认传受控截图与结构说明，
不把源页 HTML/CSS、旧 token 或组件技术映射作为外部实现规范。
以上是 reference_only 的参考运输；通过 §6 的 carrier 分支另外运输不可变 base-template 与
静态资产闭包，但其 CSS 仍不是设计系统或视觉验收规范。

页面确认只授权采用参考。写 OD 还要有明确目标及写入权限：两者任一缺失，无论是否采用
参考都不能写入。通过后由 open-design 执行 stage 并读回指定项目 ID、正文及实际采用的
参考材料；本地导出、mock、上传成功码不能单独证明置入成功。stage 也不是生成完成。

设计系统由用户在 OD / Claude Design 中配置。本地 token/组件映射不是交接前提；只在用户
明确提供或委托绑定时核验对应外部 DS，不擅自覆盖它。用户指定 Claude Design 时可导出同包
供人工附加，不探测或强制转去 OD，不声称 CLI Claude 就是 Claude Design。

完成条件：本步骤只产出验证后的交接上下文；外部接收状态由真实 read-back 判定，不能越权标 DONE。

## 5. 增补页面

**新增模板前**先读 [页面库短指南](../page-library/README.md) 到末尾；按其中登记、状态证据、
hash 和验证顺序实施。字段真值为 schema，算法真值为脚本；不要为每个新增模板改路由词表。

新增稳定 page_id、源引用/内容 hash、视口、用途/别名、状态和有证据的区域锚点后运行 validate。
标题锚点仅用于定位文本；区域代表整组字段/卡片时，按实际源登记 `ancestor_levels`，由预览
核验并测量对应容器，不能把一行标题的边界冒充整个区域。
框架新增源可放 `.claude/skill-os/page-library/sources/`，不要求修改只读 `framework/`。
用户原件使用 sources/originals/ 与 source-manifest.json 的同字节证明；原件副本的 pending 状态不代表
原模板缺少那些状态，只代表本工具尚未完成原样执行/验证适配。不得把原模板已有内容宣称为不存在。
ID 不重编、不复用；退休 ID 进入 retired_page_ids。区域父子关系须真实，不靠猜坐标造锚点。
一次框选只属于本次交接，未经用户确认不自动晋升为长期目录/记忆。

完成条件：新页与既有页均通过验证，能用原命令和语义过程发现；旧页/源及路由代码不必改动。

## 6. 最终 carrier 绑定与人类门

只有已冻结的完整 Packet、已验证的目录源和已对齐的需求可以进入本节。

1. **冻结事实**：`scripts/carrier-packet.mjs` 的 `inspectCarrierPacket(body)` 返回全量事实与
   applicability、Packet hash。来源不符合格式时回 design-brief 重新冻结，或在来源已对齐且
   用户接受无模板交接时走 reference_only；不要现场编造一个只有“要改的那条”的 Packet。
2. **读源定位**：读取完整目录及所选页实际源/预览，检查 `live && carrier_eligible`，逐项核对
   目标状态的 `state_support`。填写需求到动作的位置依据；歧义/冲突/不支持状态先处理，不能
   因某个 slot 名字近似就选它。新增用登记 slot，修改/删除/保持用登记 module。
3. **验证草案**：运行 `validateCarrierBindingDraft`，提供真实 Packet body。该检查只证明依据
   记录、版本、登记状态、锚点、动作权限和冲突满足合同，不证明模型解释必然正确。预览展示所有
   拟改区域及保持边界；需求原文与目标职责不一致时回上一步，不用用户一次“选模板”覆盖所有动作。
4. **生成 TAC**：所有 Packet 条目都进入 applicability；每项 coverage 必须有唯一去向。JSON
   只投影冻结事实；使用 `renderTacMarkdown` 生成含原文的可读投影，禁止另写一份摘要替代。
   Packet 中的保持约束可以投影到 preserve 动作：填写真实 `source_projections`、登记不变量，
   并用 coverage 指向该动作；不要把保持要求假挂到修改动作或标成非模板影响。没有来源的
   纯结构保护动作仍可 preserve，但不能用它冒充某条事实的覆盖。所有投影必须与已核对的
   assessment 事实—动作配对一致，scope 排除不能同时成为实施动作。
   `prepareCarrierHandoff` 形成完整 bundle 后才取得最终 TAC/carrier/bundle hashes。
5. **真人采用**：用户看到模板/预览、逐动作改与保留表、全部覆盖去向及版本后，明确确认最终
   binding 与 TAC/hash；未回复仍 pending。`confirmCarrierBundle` 检查版本一致；填写 actor=user
   不是真实确认，调用者须核对消息/选择器事件。内容变化重新确认，不用旧“同意”批准新动作。
6. **交给 OD**：本节到有效采用记录为止。stage/run/recover 各走 open-design 的独立授权与
   读回；不自动写入、生成、回收或把任何阶段标为 DONE。

### 可执行接口与记录

字段真值为 `page-library/schema.json` 的 `match_assessment`、`match_judgment`、
`carrier_binding_draft`；执行前读这三项，不从过期示例猜字段。记录中：

- `frozen_packet` 用 inspector 结果，`catalog_sha256` 用 `computeCatalogHash(catalog)`；
- `reviewed_fact_ids` 枚举所有冻结条目，`candidate_evidence` 记录候选取舍及原因；
- 每条 `judgments` 逐字引用 Packet `excerpt` 与当前目录 `purpose_excerpt/target_excerpt`，
  再填写用途/位置的推理依据。分别指出 state_id、target_id、action_id；存在合理替代位置时
  填入 `alternative_target_ids` 并留在 needs_context，不把数组清空假装问题消失；
- 只有已解决冲突、有实际来源的判断可以填 high；这不是统计概率，也不是用户采用。

```js
import { loadCatalog, computeCatalogHash, validateMatchAssessment,
  validateCarrierBindingDraft } from './scripts/page-context.mjs';
// body 是真实冻结 Packet；assessment/draft 按 schema 形成，不含虚构确认。
const catalog = await loadCatalog();
const gate = validateMatchAssessment(catalog, assessment, { packetBody: body, binding: draft.binding });
// NEEDS_CONTEXT → 问清楚；REFERENCE_ONLY → 无载体交接；AWAITING_ADOPTION → 仅草案可验证。
if (gate.status === 'AWAITING_ADOPTION') {
  await validateCarrierBindingDraft(catalog, draft, { packetBody: body });
}
```

CLI 最终绑定需同时给 `--record <draft.json> --packet <frozen-packet.md>`，只有 hash 而无实际
Packet 不受理。scope 的非模板/排除项仍保留在完整覆盖表，不凭其没有 UI 位置将需求从分母删除。

**验收分层**：输出用真实结构校验操作范围、目标变化、保护区与 inventory；随后独立审核每条
需求、状态与 AC 的可观察实现。RECOVERED/mechanical PASS 不等于语义验收 PASS，hash 也不证明
影子源忠实保留原模板。任何未实现、未知或待确认项都不能被测试总数掩盖。

## 7. 原件保真执行路径（original_copy）

原件的 `carrier_eligible=false` 表示禁止走旧静态校验器，不代表允许重写或丢弃原模板。使用以下
独立适配器；所有 scope/locator 来自同 hash 的 original-index，存在歧义时继续询问，不默认选第一个。

```js
import {
  prepareOriginalCopyHandoff, confirmOriginalCopyHandoff,
  authorizeOriginalOperation, verifyOriginalStage,
  reportOriginalGeneration, recoverOriginalOutput
} from './scripts/original-copy-handoff.mjs';
// actions 每项的固定字段：
// {action_id, action, scope, locator, source_ids, confidence, rationale, alternatives}
// scope/locator 复制实际原件索引的位置记录；source_ids 引用完整冻结 Packet。
const draft = await prepareOriginalCopyHandoff({
  pageId, packetBody, target: {tool:'od', projectId}, handoffId, actions, prototypeEvidence
});
```

原型证据使用可选 `prototypeEvidence`（safe相对path、media_type、purpose、既有source_ids、实际Buffer bytes）；helper纳入不可变manifest及全量读回。附件不是需求事实、不执行HTML、不以路径代替运输，source_ids来自冻结Packet。

1. **逐项匹配**：对每个事实核对原件用途、实际节点和状态作用域，保留原文与理由。`confidence=high`
   只表示有依据且无未决替代位置，不是概率；`alternatives` 非空或存在未决需求就停在澄清。
2. **原件组包**：helper 从正式原件副本读取完整字节，而非接受调用方另写的 base。冻结 Packet
   全部事实自动进入覆盖表；缺项、假 ID、scope 排除同时参与动作都会拒绝。原件/TAC/bundle hashes
   出来后展示可读契约及原件预览，由真人采用；不得把惰性预览冒充完整交互运行。当前 v1 仅支持
   自包含原件；若原 CSP 未阻断的静态外置依赖没有随包交付，`ORIGINAL_ASSETS_REQUIRED` 必须阻断，
   不能静默漏资源或重写 URL。资源扫描只证明静态闭包，不代表脚本已经执行或交互已验收。
3. **局部动作**：add 向真实节点内部末尾追加片段；modify 仅替换节点内部；remove 删除完整节点；
   preserve 不写编辑。refine 使用 original-ui-refinement-v1，edit.html为目标完整outerHTML；该profile只能refine+preserve，只准节点内class/style有效变化，业务DOM/行为属性、脚本、全局CSS及所有资产保持。混合结构变更、无效/空白变化、越界、新资产均拒绝，视觉和交互验收仍PENDING。原件隐藏 `<template>` 的内部位置必须带完整作用域路径，不能当普通可见DOM猜测。
   目标重叠、歧义、不可证明的原始字节边界、void元素属性修改、文档头/脚本/样式目标均拒绝。
4. **保留原件**：原输入永不重排/格式化；输出必须保持未授权区域所有字节，原脚本/样式也逐字节保持。
   新片段使用受限静态HTML，不能偷加脚本、事件、外部资源、文档控制或模板。需求确需这些能力时
   明示限制并另审精确范围，绝不以删除原交互或改写整页来绕过。
5. **OD 产出**：要求 OD 用代码读取完整原件，仅按上述节点局部修改，输出 `output/index.html`，并用
   `JSON.stringify` 写 `output/implementation-manifest.json`：
   `{"schema_version":1,"edits":[{"action_id":"C-01","html":"新增或替换的片段"}]}`。
   remove 的 html 为空串；preserve 不列 edit。该文件只是待核验声明，不能据其自报通过。
6. **分离授权与读回**：`confirmOriginalCopyHandoff` 的采用须绑定 original_sha256、tac_sha256、
   handoff_bundle_hash；`authorizeOriginalOperation` 分别接受 stage/run/recover grants，run 另绑
   prompt_hash。平台能力及原件 inert-storage 必须有真实本运行时依据。先 `verifyOriginalStage`
   全字节读回；原件 v1 仅支持 headless 路径，以本轮 `OD_RUN_AUTHORIZED` 收据和成功 run 读回进入 recover。
   桌面报告无法证明不存在后续取消的 headless 尝试，`reportOriginalGeneration` 明确拒绝，旧的裸 `STAGED`
   或历史 `USER_GENERATION_REPORTED` 收据也不能授权/执行 recover；再由 `recoverOriginalOutput` 校验实际输出、编辑声明、项目inventory、
   原生DOM与原件差异。
7. **完成门**：机械 PASS 只证明改动范围与来源保真，语义仍 PENDING。实际浏览器检查本轮全部需求、
   原有关键交互与相关状态后，才能报告本轮已验收；不把一个局部样例外推成所有模板/状态都验证过。

<!-- FILE_END: skill-os/runtime/page-context.md -->
