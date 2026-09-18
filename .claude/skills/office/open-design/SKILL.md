---
name: open-design
preamble-tier: 3
argument-hint: "[design-brief 路径 | 要给 OD 的方案 md(单点交接) | 'recover/拉回来' 回收产物]"
version: 4.0.0
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

> **模型（核心）：** luca_gstack 负责「已整理需求 → Phase-A 非绑定 CandidateHint → design-brief 冻结 Packet
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

**0c. Phase-A 与最终 binding 的边界：** design-brief 里的 `CandidateHint` 是已整理需求阶段的内部、短期
发现结果，不能作为 page adoption、module binding、TAC、Packet 字段或 OD 写入依据。先完成 Phase 1
并冻结 Packet；只有随后完整读取 `.claude/skill-os/runtime/page-context.md`，运行其最终
`carrier-binding` 验证、隔离预览和真人 adoption，才可进入 `carrier`。`NO_HINT`、无合格候选、
用户拒绝或明确不用模板均不阻塞 Packet 交接，但只能走互斥 `reference_only`，绝不得称模板衍生。
页面/模板采用不授予 OD stage；stage、run、recover 各自独立授权。recover 跳过本步骤。

---

## Phase 1：编译 OD 指令（luca_gstack 核心活；一次性产出，桌面端/headless 通用）

把输入源编译成一份可交接的指令；这一步不授予生成或外部写入权限：
- **chain**：把已通过门禁的**冻结 Design Generation Packet**逐字节作为唯一需求主体；不倒 PRD/research 原文。
- **adhoc**：以用户点名产物**原文**为主体，忠实传递，不替它发散/编造；adhoc 不具备冻结 Packet 时只能是 `reference_only`，不得临时伪造 carrier/TAC。
- 用户在冻结前额外强调的需求必须回到 design-brief 整理并冻结新 Packet；冻结后不得把对话补充悄悄追加为
  carrier 需求。真实中文 B2B 文案，不要 Lorem。

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

1. `page-context` 已返回有效的最终 `carrier-binding`，其 frozen Packet/source/module hashes 仍与当前
   输入一致；`CandidateHint` 不能替代此结果。
2. `prepareCarrierHandoff` 形成 immutable `input/`、`control/`、空 `output/` 及 canonical manifest。
   `input/base-template.html` 和其通过 profile 的 assets 只能作为输入；不能把 framework 文件或输入重命名为输出。
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
output 字节之前完成：`authorizeCarrierRecover` / `authorizeReferenceRecover` 仅绑定已验证的
STAGED 收据，然后才能调用各自的 `observe*Output`。

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

---

## Phase 5：落盘交付 → 迭代主体在用户（OD 桌面端）

只有 Phase 4 的 scoped recover receipt 通过、且独立语义验收不再待确认时才可标 DONE。落盘后 `open`
产物给用户，一句话告知（**不阻塞提问、不 AskUserQuestion**）：
1. 产物已从 `<handoff-id>/output/index.html` 回收至 `docs/prototype/YYYY-MM-DD-<topic>/index.html`；
2. 要迭代请直接在 OD 桌面端继续改，改完说「拉回来」走 recover 入口回收最新版；
3. 要回这里改字段布局时，点名即可；外部 Figma 交付由用户现有工具操作完成。

> （若本次走 Phase 3D 桌面端生成：你首次说「拉回来」就是**首版回收**，同 Phase 4 逻辑，不是迭代；
> 只有 `reference_only` 时不得把该首版称为模板衍生。）

> 依据 2026-06-10 luca 指示：「要迭代我会在 od 里面去迭代。如果真的需要回到这里改字段
> 布局，我会在这里跟你说。」agent 不代理迭代轮、不替用户判断符合与否。
> （recover 入口照旧汇入 Phase 4 回收逻辑。）

---

## Phase 6：handoff + 更新 workflow-state（落盘后）

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

---

## ⚠️ 末尾核心约束

1. **Packet 是唯一需求事实，先冻结再绑定**：Phase-A `CandidateHint` 只是内部短期发现，绝不写入 Packet、
   绑定或 TAC。最终 `carrier-binding` 必须在冻结 Packet 后重新验证，且真人 adoption + TAC/hash 确认不可省略。
2. **carrier 与 `reference_only` 互斥**：无最终绑定、用户拒绝或明确不用模板就走 `reference_only`；它不含
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
8. **输入是设计产出**（冻结交互 Packet 或单点方案 md），不是 PRD、不是已生成 HTML；源缺失不静默建空项目。
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
