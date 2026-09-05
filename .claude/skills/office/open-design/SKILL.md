---
name: open-design
preamble-tier: 3
argument-hint: "[design-brief 路径 | 要给 OD 的方案 md(单点交接) | 'recover/拉回来' 回收产物]"
version: 3.3.1
description: |
  Open Design (OD) 连接器：已对齐设计源 → 高置信页面推荐与采用确认（或无参考）→ 指定 OD 项目交接与读回。
  chain 消费 design-brief Packet；adhoc 忠实交接用户指定方案；recover 只回收已绑定项目，不重新编译。
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

> **模型（核心）：** luca_gstack 负责「设计源对齐 → 页面参考确认/无参考 → 编译指令 → 确认 platform 与工具目标 → 建项目 + 写 brief.md
> （=stage）→ **默认交你在 OD 桌面端按生成**（走订阅会话，可靠）→ 你说「拉回来」回收落盘」。headless 一次性出图
> （经 daemon /api/chat）为 **opt-in**：仅你显式要求"让 agent 自动出/用 headless"才走（实测不稳/慢，失败即回落桌面端）。
> **人工判断后置**：落盘后展示即止，迭代你在 OD 桌面端自行做（回收/下游由你点名）。与 magicpath/html-prototype 关系：
> 三者的独立能力保留；本 OD flow 不因 daemon 故障自动换工具。用户明确改选本地 HTML 或 MagicPath 时才转交。
> **连接走 daemon HTTP（动态端口）；`od mcp` 已注册时也可用其工具，二选一即可。**

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
□ [chain] 最新 design-brief 存在 + 含「Design Generation Packet」节？ 否→BLOCKED（先 /design-brief，或改单点交接）。
□ [adhoc] 用户点名产物存在、非空、可读？ 否→BLOCKED 明确报错（不静默建空项目）。
□ [目标=OD] daemon 可达（Preamble OD_DAEMON=UP）？ DOWN→告知「请打开 OD 桌面端」，停在连接，不自动改选工具。
□ 出图路径：**默认走 Phase 3D（OD 桌面端生成，可靠）**。仅当用户显式 opt-in headless（"让 agent 自动出图/用 headless"）
   才走 Phase 3H（headless 不稳的具体表现权威见 Phase 3H；失败 retry 1 后回落 Phase 3D，daemon 既 UP 不退 magicpath）。
```

> **headless 失败处理（可执行规则）：** retry 上限 1 后回落 Phase 3D 桌面端（不稳的具体表现权威见 Phase 3H）；不为它再造 auth/credit 探测。
> **鉴权前置（正面约束）：** OD spawn 的本机 claude env 的 `USER` 须为真实用户名（如 `luca`）才走订阅；`USER` 缺失/为空/错值会回退 API-credit 账户报「Credit balance is too low」，`LOGNAME` 不顶用。

**0c. 页面参考门（源就绪后、编译前的唯一执行点）：** 完整读取
`.claude/skill-os/runtime/page-context.md`，执行目录语义判断、隔离预览和选择验证。
DB 中的“页面与交互位置映射”描述设计职责，不表示用户采用了库页；不能凭映射存在默认附页。
高置信推荐待用户真实采用/拒绝；低置信不展示，`reference=none` 直接继续，可选询问不阻塞。
已确认且版本有效的选择复用，源失效则重确认。recover 跳过本步骤。页面确认与工具目标/写入权分开检查。

---

## Phase 1：编译 OD 指令（luca_gstack 核心活；一次性产出，桌面端/headless 通用）

把输入源编译成一份可交接的指令；这一步不授予生成或外部写入权限：
- **chain**：抽交互文档的 **Design Generation Packet** 作主体；只用已定设计事实，不倒 PRD/research 原文。
- **adhoc**：以用户点名产物**原文**为主体，忠实传递，不替它发散/编造。
- 用户对话里**额外强调的需求点**（如「突出今日待跟进」）按原意编进去作重点；真实中文 B2B 文案，不要 Lorem。

**正文与参考：** 完整保留已对齐源中的需求/AC、D 决策及依据、非 N/A 状态、被否决方向、改/保留边界。
每条稳定 ID 必须与其完整原文一起传递；只有 ID 的清单不是需求正文。交接前逐项核对需求、AC 与 KEEP 边界。
附已验证的 page_id、区域或框选说明、源/截图版本及真人确认索引；无参考明确写 `reference=none`。
不附旧 token 表、技术组件映射或旧 HTML/CSS 实现命令，也不按品牌词正则清洗合法业务正文。
旧技术规范若仍混在上游 Packet，返回其 owner 更正，不静默删掉相邻产品约束。

**设计系统：** 用户在目标工具中配置。本仓不注入品牌叠加、不覆盖外部设置；缺本地 token 不阻塞。
页面截图只用于结构/位置参考，不能暗示继承其桌面宽度、像素布局或视觉系统。

**生成要求：** 仅在用户明确要求一次性完整生成、且源没有未决设计问题时附对应生成指令；
仅 stage 或人工导出不添加“已确认一切/不必反问”的授权断言，不吞掉仍需人决定的问题。

运输包装复用 `scripts/design-flow-handoff.mjs`，不另建需求真值。正文、受控 PNG 与位置说明
组成同一个中立包；本机路径不算接收方可达材料。每次使用唯一临时目录保存包，避免共享
`/tmp/od_brief.txt` 被并行任务覆盖。Claude Design 只导出该包及附件清单，明确“已导出，尚未导入/生成”，到此交付；不调用 OD。

**helper 调用合同（从仓库根导入；调用方先读实现，不把示例当已执行）：**

```js
import { buildDesignHandoff, authorizeStage, verifyReadback, recoverTarget } from './scripts/design-flow-handoff.mjs';
const bundle = await buildDesignHandoff({
  source: { mode: inputMode, id: verifiedSourceId, body: alignedSourceBody },
  target: { tool: targetTool, projectId: authorizedProjectId },
  selection: pageSelection,
}, { catalog, root, preview, verifiedUserDecision });
// bundle.files 始终含 brief.md + page-reference.json；confirmed 时另含 reference.png。
// 每个文件有 name/mediaType/bytes/sha256；只在已授权目录写这些精确文件，不再找项目别名。
```

`inputMode=chain|adhoc|ux`；body 是已对齐的完整 Packet/方案/UX 问题正文，不是新写的摘要。
`verifiedUserDecision` 由调用方核对实际用户消息后提供，包含 messageRef、evidence、confirmedAt、
selection 及 previewSha256；该对象本身不是人类签名，测试夹具不能代替真实确认。
selection 的无参考/未决语义以 page-context 为准；confirmed 必须配当前预览 manifest 与 PNG 字节。

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

---

## Phase 3D：建项目绑定 + 写 brief.md → 交 OD 桌面端生成（**默认路径**）

把一切 staged 好，只把"按生成键"交给你在桌面端（走本机已登录订阅会话，可靠，不受 headless 子进程不稳影响）。

**先定标识（贯穿 建项目→落盘→recover 同一 slug）：** `_TOPIC` 来自已验证任务；`_SLUG` 为明确授权的
ASCII 安全短名（小写字母/数字/连字符，≤64 字符）。新建时使用唯一 slug，已有同名目标则停下确认，
不能把碰撞当更新授权。建完核对响应实际 ID 与该 slug 相同，记入交接记录。多方案逐个保存目标绑定和
读回结果；用户确实委托 DS 时才写 `designSystemId` 并逐目标核对，其他情况不覆盖外部设置。

```bash
# 1) 明确新建授权后建项目；仅用户委托绑定 DS 时向 body 增加已确认 designSystemId
curl -s -X POST "$_OD_URL/api/projects" -H 'content-type: application/json' \
  -d '{"id":"<slug>","name":"<topic>","metadata":{"platform":"<选定platform>","fidelity":"high"}}'
# 2) 读回并核对 project.id 和 project.metadata.platform/fidelity；若用户委托 DS，同时核对 designSystemId
curl -sf "$_OD_URL/api/projects/<slug>"
# 3) 将中立包内 brief.md 和每个已采用参考 PNG 分别写入该项目 files API；不触发 /api/chat。
# 文件 encoding/content 按实际 OD 接口支持的格式传入；不把本机路径当附件内容。
# 4) GET /api/projects/<slug>/raw/<file> 逐个读回实际字节，与包的正文/附件核对。
```
**读回门：** 使用 `scripts/design-flow-handoff.mjs` 核对准确项目、brief 全文和全部附件字节。
采用区域/框选时包内必须有整页受控截图及对应位置说明；缺附件、错项目、源版本变更或只有上传
成功码均不能标 STAGED。接口不支持附件或不能读回时停在该项，报告“仅本地导出/接收未验证”，
保留需求和已确认选择，不谎称已置入。模拟收据只证明本地逻辑，不证明真实 OD 接通。

写入前调用 `authorizeStage(bundle, {tool:'od', projectId, write:true, messageRef})`，其中授权
来自真实用户且覆盖本次源/附件和新建或更新范围；失败不发任何写请求。逐文件真实读回后调用
`verifyReadback(bundle, {tool:'od', projectId, files:[{name,bytes}], readRef})`，`projectId` 来自
已核对 API 项目响应，files 的 bytes 来自该项目 raw 响应，不可用本地原包冒充读回。
只有该步骤返回 STAGED 且调用方有真实响应证据才报告接收成功。Claude Design 不调用这两个 OD 步骤。

完整读回后一句话告知（不 AskUserQuestion、不阻塞）：
1. 已在 OD 项目 `<slug>` 写入并读回 `brief.md` 与 `<实际附件清单/无参考>`；设计系统由你在 OD 配置（已委托绑定则报告实际 ID）；
2. 请在 OD 桌面端打开项目 `<slug>`、引用 `brief.md` 及页面附件让它生成；
3. 生成完成后说「拉回来」，我走 recover（Phase 4）回收最新 index.html 落盘。

> STAGED 只表示材料接收，不等于生成完成或项目节点 DONE；daemon 不可达也不自动转去本地生成器。

---

## Phase 3H：headless 一次性触发生成（**opt-in**；仅你显式要求）

> 你未显式要 headless → 跳过本节，走 Phase 3D。本路径本 session 实测不稳（生成慢 >2.5-3min + daemon SIGTERM 重启）。

```bash
# 先完成 Phase 3D 的目标授权与全部材料读回；conversationId 取建项目响应，不重建目标。
# 4) headless 触发：/api/chat 必须带 agentId（漏了→AGENT_UNAVAILABLE）；body 用文件避免转义
# 在本次唯一临时目录内创建请求文件：projectId、conversationId、完整 message（含附件引用）、
# skillId=web-artifacts-builder、agentId=claude；_OD_CHAT_FILE/_OD_STREAM_FILE 指向同一目录。
curl -sN --max-time 1800 -X POST "$_OD_URL/api/chat" -H 'content-type: application/json' --data @"$_OD_CHAT_FILE" > "$_OD_STREAM_FILE" 2>&1
```
- 生成耗时几分钟，建议后台任务跑 + 轮询 `/api/projects/<slug>/files` 直到出 `index.html`。
- daemon 可能中途重启（端口变）→ 轮询/回收前**重新探测 `$_OD_URL`**。
- 失败处理（**重试上限 1**）：首次 /api/chat 若立即 canceled（SIGTERM）或只出交接材料无原型 → 确认无产物后**原样重试一次**；再次失败（failed/canceled/narrate-but-no-file）→ **不再硬重试**；项目与材料已 stage，**不要重建**，直接跳到 Phase 3D 的「告知用户在桌面端生成」那步。
- `od mcp` 工具可用时，等价用 `create_project`/`write_file`/`start_run`/`get_run`/`get_artifact`。

---

## Phase 4：回收落盘 + 写 prototype-spec.md

**recover 先核对已绑定项目：** slug 来自本次用户明确指定或已核验交接记录；未知/多目标未决
则询问并等待。禁止按最近更新时间猜项目，不重新匹配页面、编译需求、创建项目或触发生成。
回收仅在当前已验证项目范围落盘；NO_PIN 独立测试只记录显式临时输出，不执行下方 docs 命令。
先调用 `recoverTarget({tool:'od', projectId:boundProjectId})`；此函数只验证目标标识，不推断授权，
随后核对真实项目响应 ID 再列取该项目产物。

```bash
# 0) recover 前重探端口（daemon 可能重启换端口）
_PID=$(pgrep -f "prebundled/daemon/daemon-sidecar"|head -1); _P=$(lsof -nP -p "$_PID" 2>/dev/null|grep -oE '127.0.0.1:[0-9]+ \(LISTEN\)'|grep -oE ':[0-9]+'|tr -d ':'|head -1); [ -n "$_P" ] && _OD_URL="http://127.0.0.1:$_P"
# 1) _SLUG 必须已由用户或准确交接记录绑定；缺失即停止本段，询问用户，不列最近项目猜测
[ -n "$_SLUG" ] || { echo "NEEDS_CONTEXT: 缺少已绑定 OD 项目 slug"; exit 1; }
[ -z "$_TOPIC" ] && _TOPIC=$(cat .claude/current-topic.txt 2>/dev/null)
# 2) 列出全部 html 产物（OD 可能一次出多个方案 + 一个导航页，别假设只有一个）
curl -s "$_OD_URL/api/projects/$_SLUG/files" | python3 -c "import sys,json;fs=json.load(sys.stdin).get('files',[]);[print(f\"{f['name']}\t{f.get('size',0)}\") for f in fs if f.get('name','').endswith('.html')]"
# 3) 全部回收到同一目录（保住彼此的同级相对链接），不要只取 index.html
_DIR="docs/prototype/$(date +%Y-%m-%d)-${_TOPIC}"; mkdir -p "$_DIR"; _N=0
for _f in $(curl -s "$_OD_URL/api/projects/$_SLUG/files" | python3 -c "import sys,json;[print(f['name']) for f in json.load(sys.stdin).get('files',[]) if f.get('name','').endswith('.html')]"); do
  curl -sf "$_OD_URL/api/projects/$_SLUG/files/$_f" -o "$_DIR/$_f" && [ -s "$_DIR/$_f" ] && { echo "回收 $_f"; _N=$((_N+1)); }
done
[ "$_N" = "0" ] && echo "OD 项目 $_SLUG 还没出 HTML 产物——请桌面端生成完再说『拉回来』；不落盘、不标 DONE"
# 4) 判形态：STATE 注释数/体积区分「导航页」与「原型本体」，据此定谁是 index.html
grep -c "STATE:" "$_DIR"/*.html 2>/dev/null
```
> **多产物处置（2026-07-22 实证补入，SC-20260722-004）：** OD **会**一次产出多个设计方向 + 一个导航页
> （实测：`index.html` 8KB 导航页 + 两个 ~55KB 方案，STATE 注释数 1 / 8 / 8）。旧脚本「优先 index.html」
> 只会落盘那个导航页，**两个真原型留在 OD 里丢失，且落盘后导航页的同级相对链接全断，还会标 DONE**。
> 规则：① **全部回收、同目录放置**（保住相对链接）② 用 STATE 注释数/体积**判形态**，别按文件名假设
> ③ 多方案时 prototype-spec 与 handoff **必须显式写「未收敛，进入正式交付或工程前须先定方案」**
> ④ 用户选定后，把选定方案 **`mv`（不是 `cp`）到 `index.html`**（下游按此固定路径发现），
> 原导航页改名保留并修正其链接——`mv` 是为了避免两份副本日后漂移。
> **守卫：** 只有真·HTML 入口被回收且文件非空，才进 Phase 5/6 标 DONE；否则告知用户产物还没出、不落盘、不写 handoff。
**回收保真门：** 核对目标、文件清单、实际非空原型、相对链接和需求/状态覆盖，不按旧 FxUI 色值
黑名单验收外部设计。不掌握目标工具的实际设计规范时，不声称其规范合规；一般 UX 问题仍可记录。
HTML 使用 `/files/<name>` 取存储原文；`/raw/<name>` 是预览路径，可能注入 bridge 或转换 HTML，不能据此声称字节保真。

**写 prototype-spec.md**（读 `html-prototype/SCHEMA.md`，框架来源填 `open-design`）：设计意图（迁移自交互文档）；
Design Decision Coverage 标 best-effort（chain）/「源=<产物>无决策矩阵」（adhoc），**不伪装 100% 可追踪**；
语义位置与实现清单从实际 HTML 归纳，保留 D/STATE/AC 与已确认参考索引；记录实际外部 design system
（未核验则 UNKNOWN）+ platform；交接块说明 source=open-design、准确 OD slug、未实现项及实际入口。

**开发交接补全（仅下游=开发/场景1 时追加）**：若本原型将进自家开发链（tech-spec/task-plan），
在 prototype-spec.md 追加"开发交接补全"节，补 **组件 props / 响应式断点 / design token 清单 / 动效**
四维（从已产出 HTML 抽取，逐维方法见 `.claude/skills/office/references/dev-handoff-dimensions.md`）；
未进入开发链时**不触发**；保留当前交付规格与来源记录。

---

## Phase 5：落盘交付 → 迭代主体在用户（OD 桌面端）

落盘后 `open` 产物给用户，一句话告知（**不阻塞提问、不 AskUserQuestion**）：
1. 产物已落盘 `docs/prototype/YYYY-MM-DD-<topic>/index.html`；
2. 要迭代请直接在 OD 桌面端继续改，改完说「拉回来」走 recover 入口回收最新版；
3. 要回这里改字段布局时，点名即可；外部 Figma 交付由用户现有工具操作完成。

> （若本次走 Phase 3D 桌面端生成：你首次说「拉回来」就是**首版回收**，同 Phase 4 逻辑，不是迭代。）

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
风险（≤3：traceability best-effort、OD beta/动态端口、未还原项）；产出路径 + **OD 项目 slug=`$_SLUG`（供日后 recover 定位）**。

---

## ⚠️ 末尾核心约束

1. **默认桌面端生成；headless 为 opt-in**（权威见 Phase 0b / 3D / 3H）：默认 stage 后交你在桌面端按生成→「拉回来」回收；headless 为显式 opt-in，其重试上限与回落规则以 Phase 3H 为准。
2. **人工判断后置，迭代主体=用户在 OD**：落盘后展示即止、不阻塞提问；用户在 OD 桌面端
   自行迭代，回收（recover）由用户点名触发（2026-06-10 luca 指示）。
3. **本地 token/技术组件映射不注入交接包**；设计系统由用户在外部工具配置，缺本地资产不阻塞。
4. **先确认平台、准确目标与写入权再建项目**；设计系统仅在用户明确委托时绑定并核验。
   页面确认不是外部写入授权；低置信不推荐，reference=none 仍须保留全部需求与状态。
5. **输入是设计产出**（交互文档 或 单点方案 md），不是 PRD、不是已生成 HTML；源缺失不静默建空项目。
6. **桌面端动态端口**：每段都用 pgrep+lsof 重测 `$_OD_URL`，不写死；daemon 重启端口会变。
7. **/api/chat 必须带 `agentId`**（如 "claude"），否则 AGENT_UNAVAILABLE。
8. **落盘路径固定** `docs/prototype/YYYY-MM-DD-<topic>/index.html` + `prototype-spec.md`，供交付审查与后续实现恢复。
9. **traceability 诚实标注**；已 pin 的产品回收 **handoff + workflow-state 不可省略**。
   纯导出/阶段STAGED不提前写节点DONE；NO_PIN维护/独立测试不触碰项目状态。

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
