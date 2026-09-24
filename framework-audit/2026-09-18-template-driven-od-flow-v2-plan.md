# 模板驱动 OD 设计链 V2 — 专家审查后的握手计划

**状态：** `NEEDS_CONTEXT · HANDSHAKE_READY`。三轮默认-`REFUTE` 红队、最终委员会闭环复核和独立质量门均已通过；仍未提供新模板包、exact-file manifest 或任何 OD/`framework/` 写入授权，因此本文件只授权下一步的确认，不授权修改 `framework/`、写入 OD、删除旧模板或发布 Git。

**已锁定的人类决策：** 被采用的 HTML 模板只作为不可变输入载体进入 OD，文件名为 `base-template.html`；OD 必须生成一份新的衍生 `index.html`，绝不回写 `framework/` 中的模板。

## 1. 先纠正目标：不是换文件，而是建立可验证的设计链

目标不是“把新 HTML 放进 `framework/` 后让 OD 参考截图”，而是：

```text
用户诉求
→ 已整理的需求 / 设计事实
→ 语义模板候选发现
→ design-brief 锁定 D / STATE，并引用不可变上游 R / AE / 保留边界
→ 最终模板/模块绑定后生成 TAC 草案
→ 用户确认“模板 + TAC hash + 模块变更/保持表”
→ OD 接收不可变模板载体并生成新的 index.html
→ 读回、验证、回收衍生产物
→ 后续开发 / 交付
```

**当前系统的事实：** 现有 OD 包仅运输 `brief.md`、`page-reference.json` 和可选 `reference.png`；它不运输 HTML/CSS/assets，页面参考只是结构与位置证据。因此，当前系统不能声称“OD 基于模板输出衍生 HTML”。本方案要明确建立这一新能力，而不是把截图路径误称为模板派生。

## 2. 两阶段模板匹配：既满足早发现，也不让模板反过来决定需求

| 阶段 | 输入 | 结果 | 不允许做的事 |
|---|---|---|---|
| A. 非绑定候选发现 | 已整理的用户诉求、页面用途、目标动作 | `page-context` 所属的新只读 Phase-A `template-discovery` 内部模式输出 `CandidateHint`，最多三个候选或 `no-match` | 调用最终绑定模式、按关键词自动选模板、写 OD、把提示放入 Packet 当事实 |
| B. 最终模板与模块绑定 | 已通过门禁的 Design Generation Packet、页面与交互位置映射、D/STATE 和引用的上游 R/AE、保留边界 | 经 `page-context` 完整验证的模板/区域，随后由已有 Packet 机械投影出 TAC 草案 | 用旧模板臆造新需求、静默替换用户已确认的模板、无确认继续 carrier 模式 |
| C. TAC 确认与外部授权 | 预览版本、最终模板/区域、TAC 草案、TAC hash、完整 `handoff-manifest`/bundle hash、准确 OD 项目 | 用户可在同一条明确消息中分别确认模板采用、TAC 内容和 OD 写入范围 | 把任一确认默认推断为另一个 |

最终模板选择的正式节点仍是 `page-context`，位于 `design-brief` 之后、OD 编译之前。Stage A 不是新 skill、没有独立 route/catalog/Claude slash/Codex selector：它是 `runtime/page-context.md` 和 `scripts/page-context.mjs` 所有的内部 `phase_a_discovery` mode，只能由 `design-brief` 的已整理需求入口调用。Claude 与 Codex 均调用同一个声明式输入/输出 contract；不可用时返回受控 `NO_HINT` 并继续 design-brief，绝不伪造候选或阻断最终 Stage B。Phase 1 必须为“发现、调用、不可用 primitive、降级、行为 probe”五项建立双 harness 断言。Stage A 只产生短期 `CandidateHint`，不影响最终匹配。`design-brief` 始终是需求、决策、状态和验收的真相源；模板只能告诉 OD “在何处实现”，不能决定“要实现什么”。

无模板高置信命中、用户拒绝候选、或用户选择不用模板时，进入互斥的 `reference_only` bundle：完整设计包仍可进入 OD，但它没有 carrier、TAC 或派生承诺，绝不得伪称为模板衍生模式。

## 3. 目标状态机与职责边界

```text
上游设计链（按场景可选 idea / brainstorm / ux-audit / ux-research / ux-brainstorm）
                         │
                         ▼
                 design-brief
       Design Generation Packet + 页面与交互位置映射
                         │
                         ▼
              page-context（最终候选、预览、真人采用）
                         │
                         ▼
          TAC 草案（从冻结 Packet 机械投影）
                         │
                         ▼
       用户确认模板 + TAC hash → bundle_kind 分支
                         │
                         ▼
     carrier handoff / reference_only handoff → OD 生成
                         │
                         ▼
 carrier：recover → 新的衍生 index.html
 reference_only：recover → 常规 OD 产物（不承诺模板衍生）
```

| 层 | 负责什么 | 明确不负责什么 |
|---|---|---|
| 上游需求/研究/UX 节点 | 问题、研究证据、产品约束、交互候选 | 选择或改写 HTML 模板 |
| `design-brief` | D/STATE、页面与交互位置映射、生成包、Tool Consumption Contract，并引用上游不可变 R/AE | 用旧 UI 样式覆盖设计系统；直接选择/复制模板；重编 R/AE |
| `page-context` | Phase-A 只读发现；Phase-B 高置信语义匹配、预览、模板/区域/模块采用、版本失效；只暴露 live + carrier-eligible 条目 | 自动采用、授予 OD 写权限、创造产品需求、从 legacy fixture 选择模板 |
| Template Adaptation Contract | 从冻结 Packet 的精确片段把已有事实映射到经登记的模块与闭合动作枚举 | 新增没有来源的产品事实、重编号/别名化 R/AE、任意 CSS selector 或文件路径 |
| OD | 在受控副本上生成 `index.html` | 改写 `framework/`、用上传成功代替生成成功 |
| recover | 验证并回收实际衍生产物 | 把输入的 `base-template.html` 当作生成输出 |

`html-prototype` 和 `figma-demo` 是后续兼容消费者，不是这条进入 OD 的 P0 主链。

## 4. OD 交付包：单一需求真相 + 受控模板覆盖层

每轮先确定 `bundle_kind`：`carrier` 或 `reference_only`，两者互斥。每轮必须使用一个新、不可复用、路径安全的 `<handoff-id>`（P0 限 ASCII 字母、数字、`-`、`_`；不可含路径分隔符、空段或 Unicode 归一化歧义）。同一 OD 项目不得共享控制文件；整轮只存在于 `handoffs/<handoff-id>/` 这一命名空间。stage 前该命名空间必须不存在，或经目录枚举证明为空且无平台注入的未知文件；否则本轮阻断、换新 handoff ID。

**carrier：**

```text
handoffs/<handoff-id>/
  input/
    base-template.html            # 不可变输入
    assets/...                    # 该 HTML 实际引用的本地资源闭包
  control/
    handoff-manifest.json         # 规范化输入文件清单、hash 与输出规则
    brief.md                      # 完整 Design Generation Packet，需求真相
    template-adaptation.json      # 机器可验的模块映射覆盖层
    template-adaptation.md        # JSON 的生成式可读投影，不是第二真相
    page-reference.json           # 采用、版本、位置元数据
    reference.png                 # 可选，仅定位
  output/
    index.html                    # 仅 output_profile=single 时的唯一主输出
    assets/...                    # single 输出实际依赖的资源闭包
    candidates/<safe-name>.html   # 仅 output_profile=candidate_set 时允许
    candidates/assets/<safe-name>/... # 对应候选的隔离资源闭包
    implementation-manifest.json  # OD 声明，仅作不可信辅助证据
```

本地 recover 会在 OD 项目外按同一 handoff ID 写 `recovery-receipt.json`；它从不作为可由 OD 修改的输入或证据源。

**reference_only：** 同样位于 `handoffs/<handoff-id>/`，但只有 `control/brief.md`、`control/page-reference.json`、可选 `control/reference.png`、该轮 `handoff-manifest.json` 与独立 `output/`。它不得含 `carrier_content_hash`、base/assets、TAC 或模板派生收据。其 recover 一律以 handoff ID、输出根和 expected-files manifest 为界，禁止项目级 HTML 枚举。

### 4.1 `brief.md`

仍是完整需求真相：需求、AC、D-series、状态、页面/交互位置、改/保留边界。它不得被模板覆盖层缩写、替代或追加无来源产品事实。

### 4.2 `handoff-manifest.json` 与可复算 hash

每次交接的 manifest 必须版本化，且包含 `handoff_id`、`bundle_kind`、绑定 OD `project_id`、`page_id`、模块目录版本 hash、Packet hash、输入根、输出根、总文件数/总字节数上限及完整 staged 输入文件表。carrier 必须包含用户已看见的 `carrier_output_profile=single|candidate_set`；reference_only 必须声明自己的受控 `reference_output_profile`，但它不产生模板衍生承诺。文件表对每一项记录规范化 POSIX 相对路径、MIME、字节数和 SHA-256；carrier 额外记录 source HTML 与资产闭包。

为避免“HTML 没变但 brief/TAC 被换掉”的漏洞，P0 固定如下算法，而不是笼统写一个 hash：

- `carrier_content_hash`（仅 carrier）：`input/base-template.html`、递归资产闭包和 `module_contract_hash` 的排序文件记录；
- `handoff_bundle_hash`（两种 bundle 都有）：**所有**将被 stage 的 immutable 输入——base/assets（如有）、brief、TAC JSON/Markdown（如有）、page reference、可选图片以及 manifest 的规范主体；
- manifest 自身使用 UTF-8、JCS/RFC 8785 canonical JSON；计算时删除自引用的 `*_hash`、签名和派生显示字段，再以 `luca-template-handoff/v1\0 + canonical-manifest-body + canonical-sorted-file-records` 为 SHA-256 preimage。实现必须拒绝重复 JSON key、非规范数字与无法 round-trip 的文本；
- template/TAC 采用确认、OD 写入授权、stage readback、recover receipt 都绑定 `handoff_bundle_hash`；仅 carrier 的派生收据另外绑定 `carrier_content_hash`。hash 变化一律使确认和授权失效。

输入根与输出根绝对不可重叠。输入中不允许预置 `output/index.html` 或任何 output 文件；不允许以复制/改名输入文件冒充 OD 生成。

### 4.2a P0 资产 profile（fail closed）

P0 不是“复制 `framework/assets/`”。closure resolver 必须从 `input/base-template.html` 递归检测实际静态依赖：HTML 的 `src`、`href`、`srcset`、`source`/媒体元素、SVG 引用、内联 style，以及本地 CSS 的 `url()`/import。若 resolver 尚未实现并验证某一语法，该语法在 P0 必须拒绝，不能静默复制整树或降级到截图。

默认 P0 profile 是无脚本、无远程 URL、无动态 import、无 data URL、无 CSS `@import`、无 CSS `url()`；仅允许经模板包审计后声明的静态 HTML、无外部引用 CSS、图片和字体 MIME/大小上限。所有资源路径必须是 ASCII、POSIX、无空段、`.`、`..`、反斜杠、NUL、百分号歧义、保留名、symlink 或大小写/规范化碰撞，并经 realpath 验证位于批准的模板根内。任何不在 profile 的 JS、CSS import/URL、嵌入对象或协议都 fail closed；后续想支持它们必须新增 profile 版本、专用递归 resolver 和负例测试。

输出也用等价 profile 重新解析闭包：每个被 `output/index.html` 使用的本地文件必须位于 `output/` 内并列入输出收据；任何逃逸、远程或未知资源都会使回收失败。

### 4.3 `template-adaptation.json`

这是新能力的核心，但只机械映射已有事实。每条变更必须绑定已登记模块，不接受模型临时编造的 selector、任意路径、像素值、技术组件命令或自由新增的需求文案：

```json
{
  "template": {"page_id":"list", "carrier_content_hash":"…", "module_contract_hash":"…"},
  "source_packet_sha256":"…",
  "changes":[
    {
      "change_id":"C-01",
      "module_id":"filters",
      "action":"modify",
      "source_projections":[
        {"kind":"decision","id":"D-001","packet_span_hash":"…"},
        {"kind":"requirement","id":"R-001","origin":"upstream","packet_span_hash":"…"},
        {"kind":"state","id":"STATE-001","packet_span_hash":"…"},
        {"kind":"acceptance","id":"AE-001","origin":"upstream","packet_span_hash":"…"}
      ]
    },
    {"module_id":"top-nav", "action":"preserve"}
  ],
  "coverage":[
    {"source_kind":"requirement","id":"R-001","packet_span_hash":"…","disposition":{"kind":"change","change_id":"C-01"}},
    {"source_kind":"decision","id":"D-004","packet_span_hash":"…","disposition":{"kind":"non_template_effect","scope_span_hash":"…"}}
  ],
  "output":{"entry":"output/index.html", "base_must_remain_unchanged":true}
}
```

动作枚举冻结为 `add | modify | remove | preserve`；不得使用未定义的 `extend` 或同义枚举。TAC 只能携带 `page_id + module_id + module_contract_hash`，绝不接受 selector、DOM 路径或可执行定位字串；本地验证器从登记的模块表解析唯一锚点。给 OD 的 `template-adaptation.md` 可显示验证器生成的不可执行 `anchor_descriptor`（例如“列表工具栏／筛选插槽”），但它不能反向成为定位输入。

`template-adaptation.md` 是对同一 JSON 及其冻结 Packet 片段的字节/哈希绑定可读投影：它展示模块的人类可读 descriptor、闭合 action、精确来源 ID 及逐字复制的冻结 source excerpt，使用户和 OD 能看见“哪个模块增加/修改/移除/保持什么”；其内容不得独立漂移、改写或新增语义。每一项必须使用精确 `source_kind/id/packet_span_hash` 投影，`add` 只能落在登记的可添加 slot，且 carrier TAC 至少有一项 `add|modify|remove`；否则不启动“新衍生版本”生成。

仅有“每项 change 有来源”不够。Packet 的页面/交互位置映射必须先生成 hash-bound **applicability set**；TAC 的 `coverage` 表要求其中每个 R/D/STATE/AE/AC 恰有一个 disposition：关联一个 `change_id`、显式 `non_template_effect`（引用同 Packet 的 scope span），或用户已确认的 `out_of_scope`（带确认记录和 span）。缺项、重复、冲突、无来源理由都拒绝 stage。每个 `preserve` 模块还必须列出其登记不变量；没有不变量的模块不能声称 preserve 通过。coverage 与 applicability set 的 hash 均纳入 TAC 和 `handoff_bundle_hash`。

模块不是平面列表：module inventory 必须登记唯一 anchor 的 ancestor graph、必需根/锚点与可添加 slot。P0 默认只接受互不重叠的 action target：重复 target、祖先/后代同时操作、`remove` 父模块却含 `preserve|add|modify` 后代、`modify` 祖先吞没 preserve 子树、删除根/必需锚点，全部在 stage 前拒绝。`add` 只可落在独立登记的 slot；每个 preserve 的 canonical-DOM/invariant 范围也必须与所有 change target 不相交。需要嵌套编辑时，先合并为单个登记模块，或等待未来有单独冲突规则的 contract 版本。

### 4.4 `implementation-manifest.json` 与生成收据

carrier 的状态不再把“看到新文件”夸大为“已证明由 OD 生成”。固定转换为：

```text
EXPORTED → STAGED                  # 所有 immutable 输入逐字节读回，output/ 不存在

STAGED → USER_GENERATION_REPORTED  # 桌面端真人报告已点击生成
      → GENERATED_OBSERVED         # 指定 output/ 出现且通过机械读回

STAGED → OD_RUN_OBSERVED           # 平台可读 run ID / prompt_hash / handoff_id 证据
      → GENERATED_OBSERVED         # 指定 output/ 出现且通过机械读回

USER_GENERATION_REPORTED → OD_RUN_OBSERVED  # 可选：事后取得 run 证据，只提高 provenance
GENERATED_OBSERVED → RECOVERED
GENERATED_OBSERVED_UNRESOLVED       # output/ 中存在多个候选，等待真人选择
```

桌面端只允许用户自行点击生成；没有 run ID 时收据只能标为“观察到指定输出”，不可称密码学或因果证明。headless 生成还必须有独立 `run=true + prompt_hash + handoff_id` 的真人授权。只有可验证的 run 证据才可提高 provenance 等级，不能改变输出完整性或语义验收要求。

生成后必须有一个由本地 recover 基于真实 OD 读回写出的 `recovery-receipt.json`，至少绑定：

- 已 stage 的 `handoff_bundle_hash`、carrier 的 `carrier_content_hash`、Packet hash、OD 项目和 handoff ID；
- provenance 等级及 OD 生成/回收证据引用（若 OD 暴露 run ID 则记录；桌面端无 run ID 时只记录用户报告与项目实际读回，不能夸大为密码学证明）；
- 输出 `index.html` 和输出 asset 闭包的路径、SHA-256、字节数；
- 被 `preserve` 的模块 canonical-DOM/登记不变量验证结果、每一 `add|modify|remove` 对应的 D/STATE/R/AE/AC 追踪完整性；
- 机械可证结论与“需求是否真正实现”的独立人工/审查待确认项，二者绝不混写；
- 未实现项与失败原因。

OD 写出的 `implementation-manifest.json` 是不可信的辅助证据，不能单独证明生成或语义完成。输入阶段的读回只能得到 `STAGED`，绝不可以声称已生成。recover 前后重验**所有 immutable 输入**，不只是 base/assets；`output/index.html` 对有非 preserve action 的 carrier 必须与 base 字节不同、路径正确、锚点唯一、闭包完整。`base-template.html` 被上传、重命名或复制均不构成“衍生输出”；recover 只读取本 handoff 的 `output/`，从不枚举项目或输入根。

输出 profile 必须在 stage 前由用户确认并写入 manifest，不能根据 OD 实际结果偷偷切换：

- `single`（默认）只允许一个 `output/index.html`、其闭包 `output/assets/` 与可选不可信 implementation manifest；出现任何候选 HTML 或额外文件即 `BLOCKED`。
- `candidate_set` 只允许 `output/candidates/<safe-name>.html`、对应的 `output/candidates/assets/<safe-name>/` 闭包与可选不可信 implementation manifest；该 profile 下**不允许**预先存在或覆盖 `output/index.html`。

candidate_set 出现一个或多个合规候选时进入 `GENERATED_OBSERVED_UNRESOLVED`：recover 从实际 inventory 在 OD 项目外生成候选清单（不能信任 OD manifest），等待用户明确选择。选择后才可执行单独可追溯的本地 canonicalization，在回收目录建立 `index.html` 和 receipt，记录候选原路径/hash、用户选择、复制 hash 与 provenance；它必须标为“用户选定的 OD 候选衍生物”，不可伪称为 OD 在 `single` profile 中直接写出的唯一主输出。若用户要求严格的 OD 直接 `output/index.html`，必须以已选方向新开一轮 `single` handoff，不能覆盖本轮 candidate_set。

每次 stage 前还要对**整个 OD 项目**建立规范化、带内容 hash 的 project inventory。stage 只允许新建当前 handoff 的 immutable `input/` 与 `control/` 集合；run/recover 后必须证明：(a) 当前 `handoffs/<id>/` 的完整文件集合严格等于 immutable manifest 加已确认的 allowlisted `single` 或 `candidate_set` output profile；(b) 其他项目路径和其他 handoff 的内容 hash 无新增或变更。output 内只允许 profile 所列 HTML、其实际引用且通过 closure profile 的 assets、以及不可信的 implementation manifest；未引用/未知文件也不允许存在。任何额外或越界改动都 `BLOCKED`、报告并保留证据，绝不自动删除。Phase 0 capability probe 必须先证明平台能支持该 inventory 边界；否则 carrier 不可用。

## 5. P0 不可跳过的授权与安全门

| 门 | 必须验证 | 失败行为 |
|---|---|---|
| handoff 命名空间门 | 新、路径安全的 handoff ID；stage 前 `handoffs/<id>/` 不存在/为空；输入、控制、输出根严格分离；本轮文件集合只可来自 manifest | 换新 ID；不得覆盖旧轮次 |
| 模板采用/TAC 确认门 | 高置信候选 + 真实用户确认当前模板/区域/预览版本，并看见/确认 TAC hash、`handoff_bundle_hash` 与模块变更/保持表；或明确 `reference_only` | 不生成 carrier |
| 载体新鲜度门 | HTML、资产闭包、模块目录、Packet、TAC、brief、参考材料或 manifest 任一 hash 改变，旧确认和授权都失效 | 重新匹配、重建 bundle、重新确认 |
| 资产闭包/profile 门 | 只复制 resolver 证明被静态引用的本地文件，且完全满足 4.2a profile、路径和大小边界 | 不打包、不写 OD |
| OD 能力门 | 受独立测试项目授权的 probe 已验证：嵌套路径、二进制资源、URL 编码读回、目录隔离、output 根写入/读回，以及桌面/可选 headless 的可观察性 | carrier `BLOCKED`；不得降级为截图后仍称模板衍生 |
| OD stage 写入门 | 用户真实授权覆盖 OD 项目、handoff ID、`handoff_bundle_hash`、完整 staged 文件表、指定 namespace、stage 与 recover 范围；`reference_only` 同样绑定本轮 bundle/输出根 | 禁止任何外部写入 |
| OD run 门 | 桌面端由用户自行点击；headless 必须另有 `run=true + prompt_hash + handoff_id` 的真实授权 | 不触发生成 |
| 输入读回门 | 两种 bundle 均逐字节读回 manifest 声明的**全部** immutable 输入，且 output 根仍不存在；无额外输入文件 | 不进入 `STAGED` |
| 项目范围完整性门 | pre-stage / post-stage / post-run 三份全项目 content-hash inventory 只允许 manifest 声明的当前 handoff 输入与 allowlisted output profile 发生变化；其他路径、其他 handoff、当前 namespace 的未知文件均禁止 | `BLOCKED`，报告但不自动删除 |
| 生成/回收门 | 所有输入再次不变；指定 output 根有合规新产物；carrier-single 的 `index.html` 与 base 不同，carrier-candidate_set 的每个候选闭包/锚点/机械 trace 均通过；reference_only 只按自身 profile 回收 | `BLOCKED`，不声称衍生成功 |
| 输出 profile / 多产物门 | stage 前用户确认 `single` 或 `candidate_set`；single 只允许 `output/index.html`，candidate_set 只允许隔离候选目录；候选须真人选择和 local canonicalization receipt 才可形成回收入口 | 不自动挑选、复制、覆盖或切换 profile |
| 语义验收门 | 机械 trace 完整不等于需求已经实现；每项 TAC 仍需独立人工/审查确认 | 收据标待确认，不能报完成 |
| 视觉权限门 | 人类明确选择 `structural_carrier`（默认：DOM/模块/内容结构可继承，模板 CSS/token 不构成视觉验收标准）或 `visual_carrier`（明确授权模板 CSS/assets 为视觉绑定输入，并提供 viewport/基线/差异阈值） | 不注入旧 token/CRM 样式，也不含混使用 CSS/assets |
| framework 维护门 | 新模板 exact-file manifest、旧模板删除清单、维护窗口、目标 consumer 和回滚/保留路径均经用户明确批准 | 不写/删 `framework/` |

模板采用/TAC 确认、OD stage 写入、OD run、视觉权限和 `framework/` 维护权限是五个独立的人类授权；任何一项均不得由另一项推断。

在 `structural_carrier` 中，HTML/CSS/assets 只用于读取 DOM、已登记模块和内容结构；OD 的视觉权威仍是当前项目已确认的设计系统，模板 CSS/token 不得成为视觉验收标准或静默覆盖它。只有 `visual_carrier` 才允许模板的 CSS/assets 作为视觉绑定输入，并且必须同时冻结 viewport、截图基线、可访问性检查和差异阈值；没有这些输入就只能走 structural，不可“默认继承旧视觉”。

## 6. 实施计划

### Phase 0 — 只读基线、输入和 OD 能力探针

1. 接收新模板 HTML、实际 assets、来源/许可、截图、页面角色、模块语义、允许增改/必须保留边界。
2. 建立 old→new 页面/模块/asset 清单：仅语义等价者保留 stable ID；不等价者先退休旧 ID、再建新 ID，绝不复用。
3. 静态审计每个候选：唯一登记模块/slot、模块不变量、预览兼容性、P0 asset profile、无未批准动态依赖和可见区域层级。
4. 仅在用户给出**测试** OD 项目与精确写入授权后，运行非交付 capability probe，实测嵌套路径、二进制 assets、URL 编码逐字节读回、namespace 隔离、指定 output 根、桌面观察和可选 headless run 证据；probe 产物独立且不进入用户交付。
5. 冻结本次 `structural_carrier` 或 `visual_carrier` profile，以及本地回收物的带 handoff ID 输出位置；没有这些决定不可进入真实 stage。

**阻断：** 未提供模板包；没有模块/old→new 映射；OD 无法实现安全资产/目录/output 能力；或没有测试项目的明确写入授权。

### Phase 1 — 先实现 P0 合同和拒绝性测试

1. 定义 page library 的稳定模块合同、ancestor graph、必需锚点、可添加 slot、`preserve` 的 canonical-DOM/登记不变量与 schema/module inventory 版本；新增机器强制的 `lifecycle=live|legacy_fixture|retired` 与 `carrier_eligible` registry。最终候选、TAC、carrier manifest 和 OD stage 都必须拒绝非 `live && carrier_eligible` 的 page/source/alias 或任何模块树动作冲突。
2. 定义只读、非绑定的 `page-context:phase_a_discovery` / `CandidateHint` 内部合同；为 `page-context` 增加最终模块采用、TAC 与 bundle hash 失效校验；固定它在 Claude/Codex 的发现、调用、不可用 primitive、降级、行为 probe；保留互斥 `reference_only`。
3. 实现版本化 P0 asset profile 和递归 closure resolver；任何未支持语法保持 fail closed。
4. 扩展 `design-flow-handoff`：按 `bundle_kind` 建立每轮 namespace、canonical manifest/hash、全项目 pre/post inventory、精确授权、逐字节 stage/readback、output 新鲜度和本地 recovery receipt。
5. 扩展 `open-design`：明确 stage/run/recover 证据等级、禁止项目级 HTML 枚举、只从允许 output 根回收。
6. 让 `design-brief` 的 Packet/Tool Consumption Contract 生成 applicability set，并让 TAC 接受完全溯源且正反双向覆盖的模块级语义覆盖层，但保持 Packet 为唯一需求真相。

**阻断：** 合同没有拒绝路径、不能区分 `EXPORTED`/`STAGED`/`GENERATED_OBSERVED`/`RECOVERED`、任何测试允许截图回退被标为模板衍生，或把 OD 自报当作语义验收。

### Phase 2 — 新模板影子入库与双向兼容（不删除）

1. 获得你对新增 exact-file manifest、维护窗口和模块迁移表的明确 `framework/` 写入批准。
2. 建立旧/新**各自**的 asset-closure manifest。只有同一相对路径且 SHA-256 相同的 asset 可共享；否则必须使用版本化、互不重叠的 asset 根，并在新 HTML 中改为该新根。禁止用同名新 asset 覆盖仍被旧 HTML 引用的文件。
3. 添加新 HTML/assets，登记 page/region/module/slot、hash、viewports、aliases、结构边界、asset profile 与 `live/carrier_eligible` 状态。语义等价且保留 page ID 时，执行原子 source/hash 切换：catalog 的 live ID 同时指向新 source/hash，旧 source 迁到非 live 的 `legacy_fixture`；不等价时退休旧 ID、建立新 live ID。旧 live alias 必须移除，不能暗指向旧源。
4. 更新 `framework/README.md`、页面库、HTML baseline、`verify.sh`、CI 和消费者选择映射，使新旧闭包均可受控验证、legacy fixture 仅用于回归、且只有新 live 条目可参与新 carrier 试验。
5. 对新模板运行预览、候选发现、最终采用、TAC 生成、carrier 组包和所有拒绝性测试；冻结“旧 page_id/source_ref/alias 无法生成 TAC、carrier manifest 或 OD stage”的负例。

**阻断：** 任一新模板无唯一模块/slot、asset closure 发生同名漂移、registry/alias 仍可选择旧源、consumer 不兼容或任何新链测试失败；此时禁止删除旧模板。

### Phase 3 — 真实端到端 OD 验证

1. 用一条最小但真实的已对齐需求跑“命中模板 → 用户确认 TAC → carrier stage → 用户/授权 headless 生成 → observed recover → 独立语义审查”。
2. 验证所有 immutable 输入未变、OD 项目/handoff ID/namespace 正确；carrier-single 的 `output/index.html` 或 carrier-candidate_set 的每个候选均为新文件，并通过输出闭包与 module/trace 断言；按 provenance 等级诚实记录。
3. 验证无命中、用户拒绝、过期任一 hash、asset 解析遗漏/路径逃逸、非空 namespace、无 stage/run 授权、只有 stage、base 改名、多个候选、OD 自报语义完成等负例均被拒绝或正确停住。
4. 分别在 Claude 与 Codex 验证发现、调用、不可用降级/拒绝和行为探针；两者不能只共享文字承诺。

### Phase 4 — 消费者迁移后才受控退休旧模板

1. 更新 `html-prototype`、`figma-demo` 与所有实际受文件名/模块边界影响的 consumer；验证它们不再选择、复制或解释旧模板。
2. 提交一份精确旧模板删除 manifest（每个 HTML、asset、catalog/alias/baseline/fixture/文档入口）和保留清单；旧 asset 只有在 live、legacy fixture、baseline 与所有 consumer 的反向引用均为零后才可列入删除。获得你对这一次不可逆删除的明确批准。
3. 先复跑 Phase 2/3 的新模板链和完整 consumer 回归，再按 manifest 删除；不得 wildcard、delete-then-copy 或碰未批准文件。
4. 用 git diff、hash、catalog 反向搜索、CI 和双 harness 证明旧模板不再可选择/复制、批准外文件未动。已 stage/已生成 OD 包与历史审计默认只读保留；任何回迁另列精确目标。

### Phase 5 — 收口与独立验收

1. 独立红队复验最终实现、负例和退休证据；user acceptance 以一次真实新需求为准。
2. 未通过任一 P0 门、任何语义待确认或任一 consumer 回归失败即 `BLOCKED`，不作“带风险完成”。

## 7. 预期变更面（实际清单必须等模板包后冻结）

**核心设计链 / Phase 1：**

- `.claude/skill-os/runtime/page-context.md`
- `.claude/skill-os/page-library/schema.json`、`catalog.json`
- `scripts/page-context.mjs`、`scripts/page-context-preview.mjs`
- `scripts/design-flow-handoff.mjs` 与对应测试
- `.claude/skills/office/open-design/SKILL.md`
- `design-brief` 的 Packet/Tool Consumption Contract 合同面
- 相关 CI/双 harness/负例测试

**影子模板迁移 / Phase 2–4：**

- `framework/<new-template>.html`、所需本地 assets、`framework/README.md`
- 框架 HTML baseline、`scripts/verify.sh`、CI、page library 数据

**消费者兼容：**

- `html-prototype`、`figma-demo` 及其真正受新文件名/模块边界影响的说明或选择逻辑

## 8. 阻断验证矩阵

至少要新增或扩展以下真实负例；具体命令在 Phase 1 落入 exact-file delta plan 后冻结：

1. 未整理需求时不能进行最终模板绑定；Stage A 的 CandidateHint 不得写入 Packet 或成为最终选择。
2. 低置信候选、未确认候选、`reference=none` 不生成 carrier；`reference_only` 也不得被称为模板衍生。
3. 重复/不安全 handoff ID、非空 namespace、输入/输出根重叠、额外未知文件全部拒绝。
4. HTML、assets、模块目录、Packet、brief、TAC、参考材料或 manifest 任一 hash 改变，旧确认和授权均失效。
5. 非唯一锚点、未登记模块/slot、任意 selector、非法动作枚举、无来源 source projection 被拒绝；applicability set 中每项没有恰一 disposition、重复/冲突 disposition 或 preserve 无登记不变量都拒绝。
6. 重复 module target、祖先/后代重叠、删除父模块并保留/修改子模块、修改祖先吞没 preserve 子树、删除根/必需锚点、在非 slot 上 add 都在 stage 前拒绝。
7. 对 `srcset`、SVG、内联 style、CSS `url()`/import、data URL、动态脚本、路径穿越、symlink、远程/未批准资源、大小/路径规范化碰撞逐项证明 fail closed。
8. OD 授权未覆盖完整 `handoff_bundle_hash`、项目、handoff ID、namespace、stage/recover/run 范围时拒绝；headless 缺 `run=true + prompt_hash + handoff_id` 也拒绝。
9. OD 只接受部分输入、读回字节不一致、output 根在 stage 前已存在或出现额外输入时，不标 `STAGED`。
10. pre/post project inventory 中当前 namespace 有未知文件、其他 handoff 或项目根有新增/改动、output 内有未引用/未允许文件时 `BLOCKED`；绝不自动删除证据。
11. 输入包中伪造 `index.html`、只有上传、仅桌面端报告、将 base 改名/复制为 output、OD self-report 均不能标为“已证明生成”；只允许诚实的 evidence/provenance 状态。
12. 输出 assets 缺失、逃逸/远程资源、base 与有变更 TAC 的 output 字节相同、注册锚点不唯一、`preserve` 不变量被破坏或 `add|modify|remove` 无 D/STATE/R/AE/AC trace 时回收失败。
13. single profile 出现候选/额外 HTML 必须阻断；candidate_set 不得预置或覆盖 `output/index.html`，未经用户选择和 local canonicalization receipt 不得形成回收入口；两种 bundle 都不得全项目枚举 HTML。
14. structural 不能静默继承旧视觉；visual 缺 viewport/基线/阈值不得进入视觉 carrier。
15. 影子期旧/新 asset closure 的同相对路径不同 hash、跨根覆盖、旧 asset 仍有任一反向引用时拒绝迁移/删除。
16. 只有 `live && carrier_eligible` 条目可被最终 page-context、TAC、carrier manifest 或 OD stage 使用；old page_id/source_ref/alias 和 legacy fixture 必须被拒绝，保留 ID 的原子 source/hash 切换也必须使旧选择失效。
17. 新模板在影子阶段可发现、预览、采用、carrier 交接；在所有 P0/consumer/E2E 通过并获删除批准前，旧模板仍不得删除；删除后旧模板不能再被选择/复制。
18. `page-context:phase_a_discovery` 在 Claude/Codex 的发现、调用、不可用 primitive、降级和行为 probe 分别通过；CandidateHint 绝不成为最终绑定事实。
19. Claude 与 Codex 在全部正负例上各自验证契约。

## 9. 已完成审查与下一步审查

| 审查 | 结论 | 对计划的影响 |
|---|---|---|
| 模板合同审计 | 页面库、预览、guard、CI、可选消费者存在强耦合 | 模板替换必须与 catalog/hash/anchor/baseline/CI 同步 |
| 设计流架构审计 | 现有主链是“设计事实→页面参考→OD”，模板匹配在 `page-context` | 新目标必须新增 carrier 模式，不能将 html-prototype/Figma 当作 P0 |
| OD 载体合同审计 | 当前 bundle 不传 HTML/assets，recover 会误把 base HTML 当输出 | 必须隔离输入输出根、加入资产闭包、读回与 output receipt |
| 红队对旧补丁 | `REFUTED`：缺 OD 载体写入授权、资产边界和真实派生证明 | 本 V2 把三项设为不可跳过的 P0 门 |
| R1：设计流/真相源红队 | 初审 `REFUTED`：确认顺序、CandidateHint、reference_only、TAC 真相源、状态机与视觉权限有漏洞；最终委员会复核 `PASS` | 已改为“先出 TAC 草案、再确认 hash”；新增只读 discovery、双 bundle、精确 source projection、evidence 状态与视觉 profile |
| R2：OD 载体/安全红队 | 初审 `REFUTED`：handoff 根文件冲突、自由 selector、hash 覆盖不足、资产解析不闭合、生成证据夸大、reference_only 回收混淆；追加复核发现项目范围/模块树/多候选冲突，最终 `PASS` | 已改为单 handoff namespace、不可执行 module ID、双层 canonical hash、P0 asset profile、observed provenance、全项目 inventory、模块 ancestor gate 与预确认 output profile |
| R3：生成/退休/双 harness 红队 | 初审 `REFUTED`：影子期旧源仍可选择、旧/新 asset 可同名漂移、TAC 无正向覆盖、discovery 缺跨 harness 入口；闭环复核 `PASS` | 已加入 live/carrier registry、原子 source/hash 切换与 closure 隔离、applicability coverage table，以及 page-context 所属的双 harness 内部 mode |
| 独立质量门 | 初检 `FAIL`：桌面端无 run ID 时缺少进入 observed 输出状态的合法路径；修复后复检 `PASS (5/5)` | 状态机明确分成 USER_GENERATION_REPORTED 与 OD_RUN_OBSERVED 两条进入 GENERATED_OBSERVED 的路径，run 证据只提高 provenance |

**委员会结论：** R1、R2、R3 已分别在修订后 `PASS`，独立质量门复检 `PASS (5/5)`。这表示计划的已知逻辑缺口已被明确合同、状态机和负例测试要求封住；它不等于尚未实施的 OD API、用户模板或外部权限已通过。

**下一步：** 进入第 10 节的用户握手输入收集。收到后先做 Phase 0，只读审计与获授权的 capability probe；每个后续副作用仍需对应的人类授权。

## 10. 最终握手所需输入（R3 通过后才发起）

这份计划本身不是删除或外部写入授权。真正实施前，握手必须逐项拿到：

1. **新模板包：** 每个 HTML、实际 assets、许可/来源、截图、页面角色；不能只给压缩包名或截图。
2. **迁移映射：** 旧 page/module/asset → 新 page/module/asset，旧/新 asset closure 与共享 SHA-256 证明，哪些 stable ID 延续、哪些退休、每个模块可 `add|modify|remove|preserve` 的边界和可添加 slot。
3. **视觉决策：** 对每种模板选择 `structural_carrier` 或 `visual_carrier`；后者附 viewport、基线与可接受差异阈值。
4. **发布范围与输出 profile：** 前向生效（默认）还是精确列出的历史回迁目标；carrier 选 `single`（默认）或 `candidate_set`，以及新衍生 `index.html` 的本地回收位置与命名规则。
5. **分离授权：** 测试 OD 项目的 capability-probe 写入范围；实际 OD 的 stage/run/recover 范围；以及之后另一份精确 `framework/` 新增/删除 manifest 的维护授权。

任一项缺失时，计划停在相应 phase，而不是猜测、降级或删除。每轮真实 carrier 成功的最小可交付物是：冻结 Packet、用户确认的 TAC/hash、不可变输入清单、诚实 provenance 的 `recovery-receipt.json`，以及位于该 handoff 输出根的新的 `index.html`。

<!-- FILE_END: template-driven-od-flow-v2-plan.md -->
