---
name: open-design
preamble-tier: 3
argument-hint: "[design-brief 路径 | 要给 OD 的方案 md(单点交接) | 'recover/拉回来' 回收产物]"
version: 4.0.1
description: |
  Open Design (OD) 连接器：冻结 Packet → 最终模板/模块 binding + TAC/hash 采用（或互斥 reference_only）
  → 指定 OD 项目交接与 handoff-id/output-root scoped 读回。chain 消费 design-brief Packet；adhoc 忠实交接用户指定方案。
  设计系统由用户在 OD 配置，不注入本地 token/技术组件映射。默认桌面端生成；headless 必须显式 opt-in。
  用户指定 Claude Design 时仅导出同一中立包供人工交接，不探测 OD、不宣称自动导入。
  回收落盘 docs/prototype/；不接受 PRD 或已生成 HTML 当设计源。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
  - WebFetch
context-cost:
  self: 18364  # 实测字节数 wc -c，统一口径 2026-07-04（G5）
  runtime-estimate: 9000
  shared-refs: [handoff-protocol]
  recommended-model: core-execution  # 2026-07-10 用户点名：OD/Claude Design外部设计工具编排用opus
---

## Preamble (run first)

**作用域先决条件：** 以下项目发现与落盘命令仅用于已通过 Project Gate 的产品任务，来源只在
已绑定项目内解析。NO_PIN 的技能维护不执行它们；授权的独立 OD 测试使用显式测试源/slug 和
临时交接包，不读取 docs/current-topic/workflow-state。用户指定 Claude Design 时跳过 OD 探测，
按 Phase 0–2 的来源/页面合同导出同包，不创建 OD 项目。

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown"); echo "BRANCH: $_BRANCH"
_DECISION=$(ls -t docs/decisions/*-design-brief.md 2>/dev/null | head -1); echo "DESIGN_BRIEF: ${_DECISION:-none}"
_TOPIC=$(cat .claude/current-topic.txt 2>/dev/null || echo "none"); echo "CURRENT_TOPIC: $_TOPIC"
# OD daemon 探测：桌面端是【动态端口】，从 sidecar 进程取（不要写死 7456/7457；daemon 重启会换端口，每段重测）
_OD_URL="${OD_DAEMON_URL:-}"
_PID=$(pgrep -f "prebundled/daemon/daemon-sidecar" 2>/dev/null | head -1)
[ -n "$_PID" ] && _P=$(lsof -nP -p "$_PID" 2>/dev/null | grep -oE '127.0.0.1:[0-9]+ \(LISTEN\)' | grep -oE ':[0-9]+' | tr -d ':' | head -1) && [ -n "$_P" ] && _OD_URL="http://127.0.0.1:$_P"
_OD_OK=""
for _u in "$_OD_URL" "http://127.0.0.1:7456" "http://127.0.0.1:7457"; do
  [ -z "$_u" ] && continue
  curl -s --max-time 2 "$_u/api/health" >/dev/null 2>&1 && { echo "OD_DAEMON: UP ($_u)"; export _OD_URL="$_u"; _OD_OK=1; break; }
done
[ -z "$_OD_OK" ] && echo "OD_DAEMON: DOWN（请打开 Open Design 桌面端再继续）"
python3 .claude/observability/scripts/get_rules.py open-design "*" 2>/dev/null || true
```

> **模型（核心）：** luca_gstack 负责「已就绪设计输入 → Brief内模板选择/非绑定语义适配 → design-brief 冻结 Packet
> → 最终页面/模块 binding → TAC 草案 → 真人确认 adoption + TAC/hash → stage immutable bundle
> （=STAGED，不是生成）→ **默认交你在 OD 桌面端按生成** → 你说「拉回来」按 handoff ID 的指定 output root 回收」。headless 一次性出图
> （经 daemon /api/chat）为 **opt-in**：仅你显式要求"让 agent 自动出/用 headless"且另有 run 授权才走。
> **人工判断后置**：落盘后展示即止，迭代你在 OD 桌面端自行做（回收/下游由你点名）。与 magicpath/html-prototype 关系：
> 三者的独立能力保留；本 OD flow 不因 daemon 故障自动换工具。用户明确改选本地 HTML 或 MagicPath 时才转交。
> **连接走 daemon HTTP（动态端口）；`od mcp` 已注册时也可用其工具，二选一即可。Codex 不因本 prose
> 声称与 Claude 有 OD carrier parity：在各项 capability probe 提供本 harness 的证据前，Codex 对 carrier
> stage/run/recover 必须拒绝或受控降级，不能执行或声称可达。**

---

## Phase 0：判定输入源 + 前置检查

**0a. input_source：**
- **chain（默认）**：从已绑定项目及当前任务定位 design-brief；仅在该范围取最新，多个来源无法消歧时先确认，不能靠共享别名选择项目。
- **adhoc（单点交接，语义识别非词表）**：用户自然语言表达「把某产物交给 OD 生成」（"把刚才那个 md 给 OD"／
  "让 OD 基于这个出图"／"丢进 OD" 等都算）。三要素：①有明确源产物 ②目标是 OD ③意图是交给它生成 → adhoc，源=该产物。
- **recover（回收）**：用户说「拉回来/落盘/我在 OD 弄好了」→ 直接跳 Phase 4 回收落盘，不重新编译（**不论 headless 还是桌面端生成的产物，首版与迭代都走此回收**）。
- 源指代不明 → 一句话确认；尚未落盘的对话内容 → 先写盘再用，不静默重构。

**0b. 前置检查：**
```
□ [chain] 最新 design-brief 存在 + 含「Design Generation Packet」节，且 Packet 已通过门禁并冻结？ 否→BLOCKED（先 /design-brief，或改单点交接）。
□ [adhoc] 用户点名产物存在、非空、可读？ 否→BLOCKED 明确报错（不静默建空项目）。
□ [目标=OD] daemon 可达（Preamble OD_DAEMON=UP）？ DOWN→告知「请打开 OD 桌面端」，停在连接，不自动改选工具。
□ 出图路径：**默认走 Phase 3D（OD 桌面端生成，可靠）**。仅当用户显式 opt-in headless（"让 agent 自动出图/用 headless"）
   才走 Phase 3H（headless 不稳的具体表现权威见 Phase 3H；失败 retry 1 后回落 Phase 3D，daemon 既 UP 不退 magicpath）。
```

> **headless 失败处理（可执行规则）：** retry 上限 1 后回落 Phase 3D 桌面端（不稳的具体表现权威见 Phase 3H）；不为它再造 auth/credit 探测。
> **鉴权前置（正面约束）：** OD spawn 的本机 claude env 的 `USER` 须为真实用户名（如 `luca`）才走订阅；`USER` 缺失/为空/错值会回退 API-credit 账户报「Credit balance is too low」，`LOGNAME` 不顶用。

**0c. Brief适配与最终 binding 的边界：** design-brief 里的 `CandidateHint` 是已整理需求阶段的内部、短期
发现结果；Brief内已确认模板/位置及非绑定适配草稿可继承并重核版本，不重新定义产品或逼用户重述。草稿不能作为 page adoption、module binding、TAC、Packet 字段或 OD 写入依据。先完成 Phase 1
并冻结 Packet；正式绑定时完整读取 `.claude/skill-os/runtime/page-context.md`，运行其最终
`carrier-binding` 验证、隔离预览和真人 adoption，才可进入 `carrier`。Phase-A `NO_HINT` 不替代
最终完整目录判断；未指定模板且最终无合格候选，或用户明确拒绝/撤回模板约束、明确不用模板，均不阻塞已对齐 Packet 交接，但只能走
互斥 `reference_only`，绝不得称模板衍生。已指定模板仍有动作/状态冲突时先 NEEDS_CONTEXT/BLOCKED，须有来源的解决或真人明确撤回模板约束；不能借降级越过人类门。
页面/模板采用不授予 OD stage；stage、run、recover 各自独立授权。recover 跳过本步骤。

---

## Phase 1：编译 OD 指令（luca_gstack 核心活；一次性产出，桌面端/headless 通用）

**用户指定原模板时**，交接的 base-template 必须与原件逐字节一致（含 CSS、脚本、资源、隐藏状态）；
按 page-context 的 original-copy 门核验。没有原样适配能力就停住，不能生成简化影子页后声称用了模板。
源复制不授权重设视觉或交互；用户要求保持的样式、结构和行为不得被 structural profile 或外部 DS 默认覆盖。
页面含 `original_copy` 时，使用 `scripts/original-copy-handoff.mjs` 的原件路径（参数及动作规则见
page-context §7），不调用只支持静态重排的 carrier helper。该路径保留整份原件，并逐字节验证局部差异。
精修用 original-ui-refinement-v1：refine+preserve、完整outerHTML、仅有效class/style改变，业务DOM/脚本/全局CSS/资产保持；嵌入仍add/modify独立合同，不混用。原型证据通过prototypeEvidence实际bytes/hash/既有source_ids进入不可变inventory，正文已含完整保持事实，附件不执行。
reference_only带实际结构化Packet时也核对附件source_ids存在，并在导出/fresh/readback重核；按Brief output-templates的文档声明边界识别结构化正文，识别后格式损坏不得降级。自由Markdown中的字段示例不算声明；无可机读索引时显式unverified-source-index，须设计/用户核对来源，不宣称机器完整覆盖。
当前原件适配器只支持自包含 HTML；若原 CSP 未阻断的外置 CSS/JS/图片/字体依赖没有经审计后一并运输，
组包必须以 `ORIGINAL_ASSETS_REQUIRED` 停住，不能只上传 HTML 或改写依赖来宣称原件完整。

把输入源编译成一份可交接的指令；这一步不授予生成或外部写入权限：
- **chain**：把已通过门禁的**冻结 Design Generation Packet**逐字节作为唯一需求主体；不倒 PRD/research 原文。
- **adhoc**：以用户点名产物**原文**为主体，忠实传递，不替它发散/编造；adhoc 不具备冻结 Packet 时只能是 `reference_only`，不得临时伪造 carrier/TAC。
- 用户在冻结前额外强调的需求必须回到 design-brief 整理并冻结新 Packet；冻结后不得把对话补充悄悄追加为
  carrier 需求。内容沿Brief已确认语言与术语，不填Lorem，不从模板推断产品或领域。

**正文与参考：** 完整保留已对齐源中的需求/AC、D 决策及依据、非 N/A 状态、被否决方向、改/保留边界。
每条稳定 ID 必须与其完整原文一起传递；只有 ID 的清单不是需求正文。交接前逐项核对需求、AC 与 KEEP 边界。
最终 binding 后才附已验证的 page_id、模块/slot、区域或框选说明、源/截图版本及真人确认索引；
无 carrier 明确写 `reference=none`/`bundle_kind=reference_only`。
不附旧 token 表、技术组件映射或旧 HTML/CSS 实现命令，也不按品牌词正则清洗合法业务正文。
旧技术规范若仍混在上游 Packet，返回其 owner 更正，不静默删掉相邻产品约束。

**设计系统：** 用户在目标工具中配置。本仓不注入品牌叠加、不覆盖外部设置；缺本地 token 不阻塞。
页面截图只用于结构/位置参考，不能暗示继承其桌面宽度、像素布局或视觉系统。`structural_carrier`
只允许继承 DOM、登记模块和内容结构；模板 CSS/token/assets 不构成视觉验收。只有人类明确选择
`visual_carrier` 且提供 viewport、截图基线和允许差异阈值，才可把视觉作为约束。

**生成要求：** 仅在用户明确要求一次性完整生成、且源没有未决设计问题时附对应生成指令；
仅 stage 或人工导出不添加“已确认一切/不必反问”的授权断言，不吞掉仍需人决定的问题。

运输包装复用 `scripts/design-flow-handoff.mjs`，不另建需求真值。carrier 必须在唯一、路径安全的
`handoffs/<handoff-id>/` namespace 中拥有不可变 `input/`、`control/` 与 `output/` 根；
`base-template.html` 只能在 carrier 的 `input/`，不允许回写 framework。`reference_only` 也使用独立
namespace/输出根，但没有 base/assets/TAC/carrier hash。正文、受控 PNG 与位置说明必须实际作为附件，
本机路径不算接收方可达材料。Claude Design 只导出相应包及附件清单，明确“已导出，尚未导入/生成”，
到此交付；不调用 OD。

**helper 调用合同（从仓库根导入；调用方先读实现，不把示例当已执行）：**

```js
import {
  buildDesignHandoff, buildReferenceOnlyHandoff,
  prepareCarrierHandoff, confirmCarrierBundle, authorizeCarrierStage, authorizeCarrierRun,
  verifyCarrierReadback, authorizeCarrierRecover, observeCarrierOutput, recoverCarrierOutput,
  authorizeReferenceStage, verifyReferenceReadback, authorizeReferenceRecover,
  observeReferenceOutput, recoverReferenceOutput,
} from './scripts/design-flow-handoff.mjs';
// carrier: page-context 已验证的 final binding → prepareCarrierHandoff →
// confirmCarrierBundle(真人 adoption + TAC/hash) → authorizeCarrierStage → verifyCarrierReadback.
// reference_only: buildReferenceOnlyHandoff → authorizeReferenceStage → verifyReferenceReadback →
// authorizeReferenceRecover → observeReferenceOutput → recoverReferenceOutput；它不能获得 carrier 语义。
// 调用前读取实现的精确参数合同；不要从本示例推断 selector、需求或额外写入权限。
```

`inputMode=chain|adhoc|ux`；body 是冻结完整 Packet/方案/UX 问题正文，不是新写的摘要。
carrier 的 final binding 必须使用 `validateCarrierBinding` 的通过结果：含 frozen Packet hash、
module contract hash、闭合 action、真人 adoption 的 binding/TAC/carrier/bundle hashes 与 output profile。
测试夹具、`confirmation.actor=user` 或 JSON evidence 不能代签 Human Gate。`single` 是当前确认的
carrier output profile；`candidate_set` 未另获人类决定不得切换。Codex 在没有其自身 probe 证据时拒绝或
降级 carrier，不拿 Claude 的成功记录代替能力验证。

---

## Phase 2：确认 Target platform 与工具目标（Design system 在外部配置）

**2a. 评估 platform / fidelity（按需求给推荐）：**
- 设备/场景：移动/手机/390 → `mobile-standard`（密集可 `mobile-compact`，大屏 `mobile-large`）；
  后台/管理/web → `responsive-web`（或 desktop-web/desktop-app）。
- fidelity：高保真原型 → `high`；线框 → `wireframe`。默认 `high`。

**2b. Design system 是外部设置，不是交接前置材料。** 默认留给用户在 OD 配置；不读取本地品牌文件、
不拉目录给用户做选择题、不在 skill 中回写个人口味。仅用户明确委托绑定时查 OD 当前目录，
按用户语义匹配并回显确认实际 ID；不能默选。多方案仍合法：用户明确要求 N 个方案才建 N 个独立目标，
同一来源包分别绑定，不能用多方案扩展原授权数量。未委托时建项目不发送 `designSystemId`。

**2c. 平台与目标：** 用户已明确“移动端”等平台时记录并采用，不重复问；尚不明确则带推荐询问，
不替用户定。固定目标工具、准确项目 slug、新建/更新范围和写入授权后才进入 Phase 3；
页面采用确认不替代这些权限。已有准确授权不反复索取。

**2d. carrier profile（独立于设计系统）：** `structural_carrier` 只把不可变 base template 的 DOM、
登记模块和内容结构作为实现载体；模板 CSS/token/assets 不构成视觉验收或 OD 设计系统输入。
`visual_carrier` 只有用户明确选择，并同时给出 viewport、截图基线和允许差异阈值时才合法。当前
Phase 1 合同默认/已确认的是 `structural_carrier + single`；实际每轮仍必须在 adoption/TAC hash 时
确认相同 profile，不能根据 OD 输出偷偷切换。

---

## Phase 3D：确认 namespace 后 stage immutable bundle（**默认桌面端路径的前半段**）

本 Phase 只把已确认材料 stage 到准确 OD 项目；它不触发生成。先固定贯穿 stage/run/recover 的
`project_id + handoff_id + output_root`：`handoff_id` 只允许 ASCII 字母、数字、`-`、`_`，本轮必须新且
路径安全；同一轮仅使用 `handoffs/<handoff-id>/`。不得从最近项目、最近文件或同名 slug 推断任一值。

**carrier 必经顺序：**

下面的 helper 名适用于原静态分支；original_copy 对应使用 `prepareOriginalCopyHandoff` →
`confirmOriginalCopyHandoff` → `authorizeOriginalOperation(stage)` → `verifyOriginalStage`。
授权、命名空间和完整读回要求相同；有脚本原件另须绑定原件 hash/handoff 的 inert-storage 收据。

1. `page-context` 已返回有效的最终 `carrier-binding`，其 frozen Packet/source/module hashes 仍与当前
   输入一致；`CandidateHint` 不能替代此结果。
2. `prepareCarrierHandoff` 形成 immutable `input/`、`control/`、空 `output/` 及 canonical manifest。
   `input/base-template.html` 和其通过 profile 的 assets 只能作为输入；不能把 framework 文件或输入重命名为输出。
   carrier Packet 先由 `inspectCarrierPacket` 提取完整事实，TAC Markdown 由 `renderTacMarkdown`
   确定性生成；scope 排除须有原 Packet 依据。helper 拒绝伪片段、漏分母和两份 TAC 语义漂移。
3. `confirmCarrierBundle` 验证真人 adoption 已覆盖最终 binding、TAC 内容/`tac_sha256`、
   `carrier_content_hash`、`handoff_bundle_hash` 和 `output_profile=single`。任何 hash 漂移使旧确认失效。
4. `authorizeCarrierStage` 只接受真实用户对准确 OD project、handoff ID、namespace、完整 staged 文件表、
   `handoff_bundle_hash` 及单独 `stage=true` 的授权；模板采用、TAC 确认或 recover 授权都不是 stage 授权。
5. stage 后由 `verifyCarrierReadback` 对 manifest 声明的**所有 immutable 输入**逐字节读回，同时验证
   output root 仍不存在且全项目 inventory 只有该 namespace 的 allowlisted 输入变化。

`reference_only` 不调用 carrier helpers：它走 `buildReferenceOnlyHandoff` 及独立的
`authorizeReferenceStage` / `verifyReferenceReadback`，仍绑定其 bundle hash、project、handoff ID 和
output root，但没有 base/assets/TAC/carrier hash，也不能报告“模板衍生”。两种 bundle
中出现未知文件、非空/重叠 output 根、错误项目、缺项或仅上传成功码均为 `BLOCKED`，不自动清理证据。

只有步骤 5 的真实读回能报告 `STAGED`。`STAGED` 只表示材料接收，不等于生成完成、需求验收或项目节点
DONE。Claude Design 仅可导出包，不能调用 OD stage。Codex 在独立 capability probe 没有成功证据前不得
执行或声称 carrier stage 可达；它必须给出受控拒绝/降级，而不是复用 Claude 的结果。

完整读回后一句话告知：已在指定 OD 项目和 `handoff_id` 写入并读回 immutable bundle；请在 OD 桌面端
从该 handoff namespace 生成。生成后说「拉回来」并给出或引用同一 handoff ID；回收只检查该 output root。

---

## Phase 3H：headless 一次性触发生成（**opt-in**；仅你显式要求）

> 你未显式要 headless → 跳过本节，走 Phase 3D 的桌面端生成。本路径本 session 实测不稳（生成慢 >2.5-3min + daemon SIGTERM 重启）。

```bash
# 先完成 Phase 3D 的 carrier stage/readback；headless 授权另行绑定 run=true、prompt_hash、
# project_id、handoff_id 和 output_root，绝不由 stage/adoption 推断。
# /api/chat 必须带 agentId（漏了→AGENT_UNAVAILABLE）；body 从唯一临时请求文件读取，
# 并只引用当前 handoff namespace 内的 immutable inputs。
curl -sN --max-time 1800 -X POST "$_OD_URL/api/chat" -H 'content-type: application/json' --data @"$_OD_CHAT_FILE" > "$_OD_STREAM_FILE" 2>&1
```
- 生成耗时几分钟；只观察 `handoffs/<handoff-id>/<output_root>`，不得扫项目的其他 HTML 或其他 handoff。
- daemon 可能中途重启（端口变）→ run/observe/recover 前**重新探测 `$_OD_URL`**。
- 失败处理（**重试上限 1**）：首次 /api/chat 若立即 canceled（SIGTERM）或指定 output root 没有产物，确认该 root 后原样重试一次；再次失败 → 不再硬重试、不重建，回到桌面端生成说明。
- `observeCarrierOutput` 只把带可读 run ID/prompt hash/handoff ID 的证据标为 `OD_RUN_OBSERVED`；
  桌面端用户报告只能是 `USER_GENERATION_REPORTED`。二者随后都还要真实 output readback 才能成为 `GENERATED_OBSERVED`。
- `od mcp` 工具可用时，等价调用也必须保留上述 namespace、独立 run 授权和证据边界。Codex 无本 harness probe 证据时拒绝本 Phase。

---

## Phase 4：按 handoff ID / output root 回收 + 写 prototype-spec.md

**recover 的唯一定位键：** 用户或已核验的 stage record 必须给出同一 `project_id + handoff_id + output_root`
和本轮 `handoff_bundle_hash`。缺任一项就询问并等待；禁止按最近更新时间、项目级目录、文件名或
“所有 HTML”猜目标。recover 不重新匹配页面、编译需求、创建项目、触发生成或枚举其他 handoff。
它有独立 recover 授权，不能由 adoption、stage 或 run 授权推断。
调用方必须把当前 harness runtime 显式传入 authorization helper；能力收据的 `runtime`
必须与之完全一致，Codex 不得复用 Claude 收据，反之亦然。recover 授权必须在读取
output 字节之前完成：`authorizeCarrierRecover` 只绑定从同一已验证 `STAGED` 收据产生的
`USER_GENERATION_REPORTED` 或 `OD_RUN_AUTHORIZED`；裸 `STAGED` 不能授权回收，headless 读回还必须
证明 run 终态为 succeeded。`authorizeReferenceRecover` 仍按其独立 reference_only 合同执行，
然后才能调用各自的 `observe*Output`。

```bash
# 仅在经授权的准确项目和 handoff namespace 内读取 manifest 声明的 output root。
# 不调用“列出项目所有 .html”的 API/命令；不读取 input/ 或另一个 handoff 的输出。
# carrier + single 只允许 handoffs/<handoff-id>/output/index.html 及其已解析的 output/assets 闭包。
# reference_only 只允许其 manifest 的 expected-files/output profile，不能套用 carrier 收据。
```

调用 `recoverCarrierOutput` 前后必须重验全部 immutable inputs、绑定的 Packet/TAC/carrier/bundle hashes、
精确 output inventory 和全项目 content-hash inventory。carrier `single` 的 `output/index.html` 必须是
新、非空、通过输出 asset closure 的文件；有非-`preserve` TAC action 时它必须与 `base-template.html`
字节不同。任何额外 HTML、candidate、未知文件、输入/输出重叠、逃逸资源、base 改名/复制、锚点或
preserve 不变量失败都 `BLOCKED`，保留证据但绝不自动删除。`implementation-manifest.json` 只是
不可信辅助信息，不能单独证明生成或语义完成。

机械验证必须使用与 immutable TAC/模块合同一致的数据；真实 DOM 中的目标、动作变化与非授权
结构保持均需通过，注释/空白差异不算实施动作。output 的路径、字节数、hash 必须与完整
post-inventory 一致。仅调用方填写的 `module_traces: PASS` 不是实施证据；独立语义验收仍逐项检查
实际页面中的需求、状态、AC 与操作结果。

original_copy v1 仅支持 headless 路径：保留本轮 `OD_RUN_AUTHORIZED` 收据与成功 run 读回，再使用
`authorizeOriginalOperation(recover)` 和异步 `recoverOriginalOutput`。桌面报告缺少独立尝试历史，
不能排除后续取消的 headless run；`reportOriginalGeneration` 明确拒绝，裸 `STAGED` 与历史
`USER_GENERATION_REPORTED` 均不能 recover。除实际
`output/index.html`，还要读回 `output/implementation-manifest.json` 的局部编辑声明。声明不是证据本身：
验证器重算原件中的真实节点范围，核对实际HTML恰为原始字节加这些编辑，并以原生DOM验证没有解析越界。
原脚本/样式保持逐字节一致。只有附带成功终态的 headless run 才能按成功运行回收；取消/未完成的输出
保留为证据，不直接宣称成功。界面语义与原交互保留仍需独立浏览器验收。

`observeCarrierOutput` 可把指定 root 的实际新产物标为 `GENERATED_OBSERVED`，但 provenance 必须诚实：
桌面端没有 run ID 时只能记录用户报告和实际 readback；可读 run ID/prompt hash/handoff ID 只提高
provenance，不能代替 output 完整性或人工语义验收。最终本地 `recovery-receipt.json` 由 recover 写在
OD 项目外，绑定 handoff ID、所有 hash、实际 output closure、module trace/invariant 结果、机械结论和
仍待人工确认项；它绝不作为 OD 可改写的输入。

`candidate_set` 是另一个预先确认的 profile；当前 `single` 发现候选或额外 HTML 时不得自动挑选、复制、
改名或切换 profile。`reference_only` 的正常回收不是模板衍生，也不能含 carrier receipt 字段。

**写 prototype-spec.md**（读 `html-prototype/SCHEMA.md`，框架来源填 `open-design`）：设计意图（迁移自交互文档）；
carrier 的 Design Decision Coverage 必须引用 recovery receipt 的 TAC/applicability trace；`reference_only`
标为「非模板衍生，源=<产物>，无 TAC」，adhoc 不伪装 100% 可追踪。语义位置与实现清单从实际
`output/index.html` 归纳，保留 D/STATE/AC、已确认 reference/binding 索引和本轮 handoff ID；记录实际
外部 design system（未核验则 UNKNOWN）+ platform。交接块说明 source=open-design、准确 OD project、
handoff ID、bundle kind、provenance、未实现项及实际入口。

**开发交接补全（仅下游=开发/场景1 时追加）**：若本原型将进自家开发链（tech-spec/task-plan），
在 prototype-spec.md 追加"开发交接补全"节，补 **组件 props / 响应式断点 / design token 清单 / 动效**
四维（从已产出 HTML 抽取，逐维方法见 `.claude/skills/office/references/dev-handoff-dimensions.md`）；
未进入开发链时**不触发**；保留当前交付规格与来源记录。

**已批准的完成前 motion 子单元（条件分支）：** 只有 caller 已真实批准本地 copy/edit/metadata/
browser 效果及精确交付根，且上述 scoped 机械回收成功，才在同一未完成 design-output Phase
调用 `motion-polish` internal。先完整读取其 SKILL 和
`.claude/skill-os/runtime/prototype-delivery.md`；输入 exact raw entry/完整闭包、raw spec、真实
recovery receipt、全部原源 D/STATE/AC/KEEP、已存在的真实 Brief handoff（如有）和当前权限交集。
不要求 raw semantic PASS 或未来 Phase 6 OD DONE handoff；原 raw FAIL 保留。缺 mechanical
receipt/效果或新产品事实未定返回原 owner，不以 recover/stage/profile 授本地编辑权。
local `postprocess_plan{skill:motion-polish,stage:pre_completion,required_behavior_refs,
local_effect_scope_ref}` 只记录已批准范围，不能写入 Packet/TAC/bundle 或作为授权。
child 只修已批准缺口，保留 raw index/spec/receipt、完整原分母和独立票历史；内部在既有
outputs 返回 candidate/certificate，不提前写第二份 handoff/state，不新增 Workflow 节点。
required FAIL/UNKNOWN 保持本 Phase 未完成，不进 TS；完整 final gate 后返回本 caller。
若将进开发链，以 accepted final 的实际 DOM/CSS/JS/WAAPI/gesture 重新抽取四维并绑定 final spec，
不从 raw spec 猜最终参数。

**完成前交互说明（同一父 Phase 内）：** 可交互 HTML 的本次交付默认启用 notes；用户明确关闭说明、
只回收归档或没有交互交付意图时沿原分支。默认启用只选择路径，不授予项目读取、copy/edit/metadata/
browser 或新 delivery root 权限。裸 STAGED、未回收、缺来源或局部效果授权停止依赖它的加工。
上述 motion internal 若适用先由其 owner 完成；只有当前 exact accepted motion 可派生 notes。

先展示 UI/交互/动效迭代后的当前业务版本，继承或等待真实用户确认。确认绑定
`user_confirmation{source_ref,confirmed_prototype_revision,input_artifact_sha256}` 与当前业务闭包；
recover、raw QA、motion PASS 不代签。业务字节变化回原 owner 重核确认；仅改说明不重置业务确认，
但新 notes 修订重新验收。只读技术检查可提前，实际文案/绑定/组包均在确认后。原 raw FAIL 保留，
不是加工先决 PASS，也不能借说明消除仍失败的原行为。

调用前完整读共享 `.claude/skills/office/references/prototype-notes/contract.md`、
`.claude/skills/office/references/prototype-notes/generation.md`、
`.claude/skills/office/references/prototype-notes/content-guidelines.md`
和 delivery runtime。生成与独立内容审阅绑定同一 guideline 版本和实读 SHA；同版本异字节拒绝。
从现有真实源/位置映射冻结本次新增或明确授权变化的 scope、全部适用 behaviors、来源登记和最新说明。
按规范 §2.1 判断有源大模块布局/宽高适配，含连续伸缩/填满剩余空间，不要求跨断点；小控件规则归父模块，
无需求不补空段，不猜尺寸/断点/移动版/业务规则。AI 不顺带标注旧模板；人工整份支持原型的编辑、删除、
撤销、重绑、合并与历史处置保持。独立 UX/前端按同 hash 规范与原始规则作语义审阅，机器或 regex 不作 A-11 PASS。

在 caller 当前真实读取/浏览器权限下调用公开 `validateGenerationScope`、`mergeNotes`、`buildAnnotatedHtml`，
生成前后重核 source/context/root/instance、来源与完整适用覆盖；动态/互斥状态沿 generation 的真实观察 session。
越界、漏项、stale 确认或加工失败保留原件/旧说明及问题，不扩大 scope、不交付半包。
普通 raw 按 E7.2 用已获准同项目日期/topic 的相邻 notes 根，实路径互不包含，以 `bindBase` +
`prepareCopy(...,processor_id:'prototype-notes')`；motion 用 `deriveFromAccepted`，helper 自己 resolve exact parent，
不传任意 base 进入例外，不扩大 raw.asset_root，不从 metadata 发权限。原资产/raw spec/receipt/parent 全保留。
caller 在独占 attempt 写当前 final HTML、新 observation spec、逐文件 before/after patch，以及 content 外、
不同于 spec 的 `notes_manifest_ref{path,sha256}`。manifest 绑定 scope、输入数据、runtime/guideline path+SHA+version、
完整行为映射与 NOTES 实例。新 spec 写 final/data/runtime/guideline/scope/mapping、实际表现/未演示/差异和证据；
raw/parent spec 只作 provenance。
`required_behavior_refs = 原 source D/STATE/AC/KEEP 全分母 ∪ parent motion required ∪ 适用 NOTES:<case-id>`；
AI scope、生成条数或不适用说明不能缩原源/父级分母。
`checkCandidate` 后 caller 派发真实独立 PREACCEPT，核原票身份、候选 SHA 和完整分母再记录 report、seal、resolve。
最新 notes accepted ref 为 `notes_final_ref{path,sha256}`，本分支 `final_artifact_ref` 必须等于它，不能选 raw/旧 motion。
缺浏览器/真人确认 NEEDS_CONTEXT，required FAIL/UNKNOWN 或引用漂移保持父 Phase 未完成。
internal 只经既有 outputs 返回候选/最终 ref/证据，无新 NODE/STATUS/handoff，不重开历史 OD/motion DONE；父完成一次。

**固定 caller（生产调用体，仓库根 Node ES module 直接执行）：** 以下是唯一有限接线，非示例或测试分支。
`host` 只由已核项目/session/native caller 提供当前 phase、recover receipt、真实确认来源、冻结分母与读/effect
context；不能从 `request.proposed`、candidate 或 metadata 构造。`confirmation.source_ref` 是 caller 已核原生
消息/记录的精确 ref，不能传 boolean 或 AI 自报。夹具传合成记录只证明消费逻辑，不能升级为真人/双 harness PASS。
host 的 `current_notes` 来自最新完整 HTML 提取（首次为 caller 建的空文档），bindings/scope/behaviors 在生成前冻结；
`source_required` 必须由原始源逐项取得，内容语义与完整源分母仍由冷 QG 独立核对。
`raw_gate.kind="mechanical-current-version"` 的 PASS 只证明该精确输入的机械恢复/当前版本资格；
它不要求 raw semantic PASS。`raw_semantic_status=FAIL` 原样进入 notes-input/返回证据，最终仍按
完整原 source 分母独立验收，原行为仍 FAIL 时不完成。同版本 guideline 的冻结 SHA 不得替换，
prepare→review→resolve 的 guideline/runtime refs 必须逐字节一致，返回 refs 是独立快照。
从以下唯一模块入口调用 `prepareODNotesCandidate(request,host)`；它只返回 PREACCEPT 候选。
owner 核真实独立原票并用 delivery helper 记录/seal 后，调用 `resolveODNotesFinal(exactNotesRef,prepared,host)`。
返回最终绑定后才进入 Phase 5/6 的单次父完成，不能用代码返回代替独立或人类验收。

<!-- OD_NOTES_CALLER:START -->
```javascript
import { prepareODNotesCandidate, resolveODNotesFinal } from './scripts/od-prototype-notes-caller.mjs';
```
<!-- OD_NOTES_CALLER:END -->

---

## Phase 5：落盘交付 → 迭代主体在用户（OD 桌面端）

只有 Phase 4 的 scoped recover receipt 通过、且独立语义验收不再待确认时才可标 DONE。
**notes-enabled 的唯一确认例外：** 原“不阻塞提问”不适用于尚待当前业务版本确认的说明分支。
先展示精确业务版本，继承/等待真实确认，再在 Phase 4 内加工；业务确认尚非 notes 最终接受。
确认后变化、仅 staged、缺来源、加工失败或原行为仍 FAIL/UNKNOWN 时不进 Phase 6。
notes PREACCEPT 核全部原源/parent motion/适用 notes 与内容语义；caller seal 后实际 resolve 最新
`notes_final_ref`，返回 processor 必须为 prototype-notes、`final_artifact_ref` 同 path+SHA，才可交付。
disabled/只回收分支保留原“不阻塞提问”与完成条件。
若触发已批准 postprocess 分支，独立 `MR-004` PREACCEPT 对当前 exact candidate 执行完整
原源语义与 motion required set；不是只测修改项。caller 验证原票 provenance 后 seal，再在
当前真实 `read_paths`/`read_roots` 下 `resolveFinal` 重验同一 `final_artifact_ref`。只有完整独立
PASS 才交付最终 accepted 入口并进入 Phase 6；保留 raw FAIL，不把机械回收冒充语义 PASS。
未触发分支继续交付原 raw；触发后缺失/漂移证书不回退 raw，所需浏览器不可用 NEEDS_CONTEXT。
落盘后 `open` 产物给用户，一句话告知（**除上述 notes-enabled 确认例外外，不阻塞提问、不 AskUserQuestion**）：
1. 普通分支：产物已从 `<handoff-id>/output/index.html` 回收至 `docs/prototype/YYYY-MM-DD-<topic>/index.html`；
   composite 分支：展示已 resolve 的实际 `final_entry` 和 `spec_path` 作为最终交付，另注明上述 raw
   recovery 路径及保留来源，不把 raw index.html 当本次最终入口；
2. 要迭代请直接在 OD 桌面端继续改，改完说「拉回来」走 recover 入口回收最新版；
3. 要回这里改字段布局时，点名即可；外部 Figma 交付由用户现有工具操作完成。

> （若本次走 Phase 3D 桌面端生成：你首次说「拉回来」就是**首版回收**，同 Phase 4 逻辑，不是迭代；
> 只有 `reference_only` 时不得把该首版称为模板衍生。）

> 依据 2026-06-10 luca 指示：「要迭代我会在 od 里面去迭代。如果真的需要回到这里改字段
> 布局，我会在这里跟你说。」agent 不代理迭代轮、不替用户判断符合与否。
> （recover 入口照旧汇入 Phase 4 回收逻辑。）

---

## Phase 6：handoff + 更新 workflow-state（落盘后）

两分支互斥，以真实已批准 postprocess 范围和完整独立 PASS 选择，环境变量不能选择或授权分支。
已批准 composite 分支先实际执行 exact ref resolution。仅本地文件来源且无 remote/message
context 时使用以下 CLI：

```text
node scripts/prototype-delivery.mjs resolve --accepted <final_artifact_ref.path> --sha256 <final_artifact_ref.sha256> --delivery-root <verified authorized delivery root> [--read-path <actual permitted file>] [--read-root <actual permitted root>]
```

当前已验证读上下文含已授权 `allowed_urls` 或原生消息 `source_refs`/`scope_refs` 时，从同一
`scripts/prototype-delivery.mjs` 导入 `resolveFinal`，实际调用：

```javascript
resolveFinal({ path: final_artifact_ref.path, sha256: final_artifact_ref.sha256, delivery_root: verified_delivery_root }, currentReadContext)
```

`currentReadContext` 必须是 caller 实际提供的完整获准上下文，不能从证书 metadata 构造授权或
丢掉 remote/message context 后强制 CLI。只有 CLI 能力且缺所需 API 上下文时返回 NEEDS_CONTEXT；
缺真实读取许可仍 BLOCKED。两入口返回相同 resolved final，均遵守下列 hash 核对及单次完成规则。

flags 可重复，仅编码 caller 当前获准读范围；JSON 不授读权。必须成功并核对返回的
`accepted_ref`、`final_entry/final_sha256`、`spec_path/spec_sha256`、`source_ref`、`acceptance_ref`
与原始 base/raw provenance 后，按 P7 唯一例外将 `_OUTPUT` 程序化绑定返回的 `final_entry`，
保留 `_NODE="open-design"`、`_STATUS="DONE"` 和同一 write_state.py 调用。不能先运行 raw
完成赋值再改输出，也不能按目录/latest/名字猜证书；父级 handoff/state 仅完成一次。
composite 分支完全跳过下列普通分支代码块：caller 按成功解析的 JSON 程序化设置这三个变量，
然后仅调用一次既有 `python3 .claude/skills/office/references/write_state.py`，不再执行 raw 赋值。
notes-enabled（含 motion→notes）只解析最新 `notes_final_ref`；`final_artifact_ref` 与之同 path+SHA，
返回 processor=prototype-notes、candidate/notes_manifest/parent（如有）及当前 source/base/raw provenance 均精确。
Phase 4 的固定 `resolveODNotesFinal` 返回这一绑定；caller 核真实独立原票后将 `_OUTPUT` 绑定返回 final_entry。
引用失败即停，不回退 raw/旧 motion；NODE/STATUS/writer 及 disabled/只回收原路径不变。

**仅普通回收分支执行以下原代码；composite 分支禁止执行：**
```bash
export _TOPIC="${_TOPIC:-$(cat .claude/current-topic.txt 2>/dev/null)}"
export _NODE="open-design"; export _STATUS="DONE"
export _OUTPUT="docs/prototype/$(date +%Y-%m-%d)-${_TOPIC}/index.html"
python3 .claude/skills/office/references/write_state.py 2>/dev/null || echo "workflow-state 写入跳过"
```
**Handoff**（`docs/handoff/YYYY-MM-DD-<topic>-open-design-handoff.md` ≤2000 tokens）：决策（≤8：选的 platform/DS、
用户判断结论、已确认参考/无参考）；约束（≤5：实际 index.html 路径、source=open-design、修改/保持边界与外部设置）；
风险（≤3：traceability/语义待确认、OD beta/动态端口、未还原项）；产出路径 + **OD 项目、handoff ID、
output root 与 bundle hash**（供日后 scoped recover 定位）。
composite handoff 另携带 exact `final_artifact_ref{path,sha256}`、accepted final entry/spec path+SHA
和独立 acceptance_ref；保留 raw entry/spec、recovery receipt path+SHA、OD project/handoff ID、
output root/bundle provenance。raw 与 postprocess 双来源不能相互替代；内部 certificate 由
父级这一份 handoff 运输，未完成 raw 无需先造 DONE handoff。
notes 分支在同一 handoff 携带 `notes_final_ref=final_artifact_ref`、processor、notes_manifest、完整
source/parent/NOTES required 集与同版同 hash guideline/data/runtime。raw/parent 仅为来源，不替代新 final。
以后仅改说明或人工新完整 HTML 由 standalone prototype-notes owner 接单，不改历史 OD/motion DONE。

---

## ⚠️ 末尾核心约束

1. **Packet 是唯一需求事实，先冻结再绑定**：Phase-A `CandidateHint` 只是内部短期发现，绝不写入 Packet、
   绑定或 TAC。最终 `carrier-binding` 必须在冻结 Packet 后重新验证，且真人 adoption + TAC/hash 确认不可省略。
2. **carrier 与 `reference_only` 互斥**：未指定模板且无最终绑定、用户拒绝或明确不用模板才走 `reference_only`；指定原件/未决冲突不能借此跳过；它不含
   base/assets/TAC/carrier hash，截图/参考也绝不能称为模板衍生。
3. **structural 与 visual 精确区分**：`structural_carrier` 只继承 DOM/登记模块/内容结构，不继承视觉验收；
   `visual_carrier` 需明确人类选择 + viewport/基线/差异阈值。不得静默使用模板 CSS/token 作为 OD 设计系统。
4. **stage、run、recover 权限彼此独立**：adoption/TAC 确认不是 stage 授权；stage 不是 run 授权；run 或
   用户报告不是 recover/完成授权。每项绑定准确 project、handoff ID、namespace、hash 与范围。
5. **默认桌面端生成；headless 为 opt-in**：stage 后交用户在 OD 桌面端生成→「拉回来」；headless 还需
   `run=true + prompt_hash + handoff_id` 的真实授权，重试上限与回落规则以 Phase 3H 为准。
6. **recovery 永远按 handoff ID/output root**：不全项目枚举 HTML、不猜最近产物、不从 input 复制/改名 base。
   `single` 只允许指定 `output/index.html` 及闭包；额外/未知文件一律 BLOCKED，不自动删除证据。
7. **本地 token/技术组件映射不注入交接包**；设计系统由用户在外部工具配置，缺本地资产不阻塞。
8. **输入是设计产出**（冻结交互 Packet 或单点方案 md），原始PRD/需求或已生成HTML先由Brief归一化为完整契约；已有原型可作不可变证据附件，不能以HTML替代需求事实。源缺失不静默建空项目。
9. **Codex 不假设 OD carrier parity**：仅在该 harness 的 capability probe 有成功证据后才可执行 carrier stage/run/recover；
   此前拒绝或受控降级。桌面端动态端口仍须每段重测，`/api/chat` 必须带 `agentId`。
10. **traceability 与状态诚实标注**：`EXPORTED → STAGED → USER_GENERATION_REPORTED|OD_RUN_OBSERVED → GENERATED_OBSERVED → RECOVERED`；
    已 pin 的产品回收 **handoff + workflow-state 不可省略**，纯导出/阶段 STAGED 不提前写节点 DONE。

---

## 完成协议（Handoff Summary）

**回收落盘并标 DONE 之前必须执行，无 handoff 的 DONE 视为不完整。**

**Step 1 — 写 handoff**：`docs/handoff/YYYY-MM-DD-<topic>-open-design-handoff.md`（见 Phase 6）

**Step 2 — 更新 workflow-state.yaml**（唯一写入路径＝Phase 6 的 write_state.py；以下 YAML 仅为其产出示例，勿手写、勿作为独立执行步骤重复写入）：
```yaml
open-design:
  status: DONE
  output: "docs/prototype/<filename>"
  completed_at: "<YYYY-MM-DD>"
  gate_result: PASS
  handoff_path: "docs/handoff/<filename>"
```

<!-- FILE_END: open-design/SKILL.md -->
