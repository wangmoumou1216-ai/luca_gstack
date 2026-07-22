---
name: open-design
preamble-tier: 3
argument-hint: "[design-brief 路径 | 要给 OD 的方案 md(单点交接) | 'recover/拉回来' 回收产物]"
version: 3.1.0
description: |
  Open Design (OD) 连接器（**默认桌面端生成；headless 为 opt-in**）：把设计产出（design-brief 交互文档，
  或你单点指定的方案 md）编译成干净 OD 指令；先评估并让你选 Target platform + Design system，再建项目绑定它、
  写 brief.md（=stage）；**默认让你在 OD 桌面端按生成（走订阅会话，可靠），完成说「拉回来」回收**；headless
  一次性出图为显式 opt-in（实测不稳/慢，失败即降级桌面端）。回收落盘 docs/prototype/ 供
  /figma-layer。design 产出首选。**FxUI 只叠品牌色 #FF8000 + 文字色 #181C25/#91959E；其余配色/字体/字号/布局
  全走所选 OD design system，不指定、不覆盖、不冲突。** 两种进入：chain（默认取最新 design-brief）/ adhoc
  （语义识别的单点交接）。不接受 PRD 当设计源、不接受已生成 HTML。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
  - WebFetch
context-cost:
  self: 18364  # 实测字节数 wc -c，统一口径 2026-07-04（G5）
  runtime-estimate: 9000
  shared-refs: [brand-tokens, handoff-protocol]
  recommended-model: core-execution  # 2026-07-10 用户点名：OD/Claude Design外部设计工具编排用opus
---

## Preamble (run first)

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

> **模型（核心）：** luca_gstack 负责「编译指令 → 评估并让你选 platform/Design system → 建项目绑定 + 写 brief.md
> （=stage）→ **默认交你在 OD 桌面端按生成**（走订阅会话，可靠）→ 你说「拉回来」回收落盘」。headless 一次性出图
> （经 daemon /api/chat）为 **opt-in**：仅你显式要求"让 agent 自动出/用 headless"才走（实测不稳/慢，失败即回落桌面端）。
> **人工判断后置**：落盘后展示即止，迭代你在 OD 桌面端自行做（回收/下游由你点名）。与 magicpath/html-prototype 关系：
> 三者同为 design_output 生成器，open-design 主力，后两者仅 OD daemon 真不可达 / 要本地纯 HTML 时备选。
> **连接走 daemon HTTP（动态端口）；`od mcp` 已注册时也可用其工具，二选一即可。**

---

## Phase 0：判定输入源 + 前置检查

**0a. input_source：**
- **chain（默认）**：用户没点名产物 → 取最新 `docs/decisions/*-design-brief.md`。
- **adhoc（单点交接，语义识别非词表）**：用户自然语言表达「把某产物交给 OD 生成」（"把刚才那个 md 给 OD"／
  "让 OD 基于这个出图"／"丢进 OD" 等都算）。三要素：①有明确源产物 ②目标是 OD ③意图是交给它生成 → adhoc，源=该产物。
- **recover（回收）**：用户说「拉回来/落盘/我在 OD 弄好了」→ 直接跳 Phase 4 回收落盘，不重新编译（**不论 headless 还是桌面端生成的产物，首版与迭代都走此回收**）。
- 源指代不明 → 一句话确认；尚未落盘的对话内容 → 先写盘再用，不静默重构。

**0b. 前置检查：**
```
□ [chain] 最新 design-brief 存在 + 含「Design Generation Packet」节？ 否→BLOCKED（先 /design-brief，或改单点交接）。
□ [adhoc] 用户点名产物存在、非空、可读？ 否→BLOCKED 明确报错（不静默建空项目）。
□ OD daemon 可达（Preamble OD_DAEMON=UP）？ DOWN→真·daemon-down，告知「请打开 OD 桌面端」，停（可退 magicpath/html-prototype）。
□ 出图路径：**默认走 Phase 3D（OD 桌面端生成，可靠）**。仅当用户显式 opt-in headless（"让 agent 自动出图/用 headless"）
   才走 Phase 3H（headless 不稳的具体表现权威见 Phase 3H；失败 retry 1 后回落 Phase 3D，daemon 既 UP 不退 magicpath）。
```

> **headless 失败处理（可执行规则）：** retry 上限 1 后回落 Phase 3D 桌面端（不稳的具体表现权威见 Phase 3H）；不为它再造 auth/credit 探测。
> **鉴权前置（正面约束）：** OD spawn 的本机 claude env 的 `USER` 须为真实用户名（如 `luca`）才走订阅；`USER` 缺失/为空/错值会回退 API-credit 账户报「Credit balance is too low」，`LOGNAME` 不顶用。

---

## Phase 1：编译 OD 指令（luca_gstack 核心活；一次性产出，桌面端/headless 通用）

把输入源编译成一份干净、可直接 headless 发给 OD 的指令：
- **chain**：抽交互文档的 **Design Generation Packet** 作主体；只用已定设计事实，不倒 PRD/research 原文。
- **adhoc**：以用户点名产物**原文**为主体，忠实传递，不替它发散/编造。
- 用户对话里**额外强调的需求点**（如「突出今日待跟进」）按原意编进去作重点；真实中文 B2B 文案，不要 Lorem。

**FxUI Token 块（只叠这两类，其余全交所选 design system，不指定、不覆盖、不冲突）：**
```
## FxUI 品牌叠加（仅两类；其余配色/字体/字号/布局沿用本项目所选 design system，不要指定、不要覆盖它）
- 品牌色：#FF8000（主按钮/主操作/激活/品牌强调；替代 design system 原强调色；全页≤3处）
  **其上文字色必须显式声明，不得留空、不得默认白色**（白字实测 2.52:1，不满足 WCAG AA 正文 4.5:1，
  连非文本 3:1 都不过）。二选一，按项目市场取：
  · **近黑 `#181C25`（6.77:1 ✓）** — 面向欧美 / 受 EAA·ADA 影响 / 客户合同写明无障碍要求时**必须**用这条；
    品牌色值零改动，与 Carbon `warning #F1C21B`、Polaris `caution #FFE600` 处理亮暖色的做法一致
  · 白色 `#FFFFFF`（2.52:1 ✗ 不合规） — 仅国内市场且项目显式接受该风险时可用，**必须在 brief 里写明是有意选择**
  （上游 design-brief 的 Packet 若已声明前景色，以它为准，不在此二选）
- 文字颜色：主文字 #181C25；次要文字 #91959E
（不指定字体 family、不指定字号、不用 FxUI 的语义色/分割线/页面底/卡片底——这些一律交给所选 design system 默认）
```

**一次性产出 tag（桌面端/headless 两条路径都加）：** 指令末尾必须加（让 OD 一次出、不反问）：
`【本次为一次性产出：以上细节已确认，请直接生成完整自包含 index.html，不必反问/不要 question-form。】`

把整段指令写到 `/tmp/od_brief.txt` 备用。

---

## Phase 2：评估 + 让用户选 Target platform + Design system（唯一交互门，选好再进 OD）

**2a. 评估 platform / fidelity（按需求给推荐）：**
- 设备/场景：移动/手机/390 → `mobile-standard`（密集可 `mobile-compact`，大屏 `mobile-large`）；
  后台/管理/web → `responsive-web`（或 desktop-web/desktop-app）。
- fidelity：高保真原型 → `high`；线框 → `wireframe`。默认 `high`。

**2b. 评估 Design system 候选（拉 OD 实时目录，按"产品域 + 不与 FxUI 橙撞色"选 3-4 个）：**
```bash
curl -s "$_OD_URL/api/design-systems" | python3 -c "import sys,json;[print(s.get('id'),'|',s.get('title'),'—',(s.get('summary') or '')[:60]) for s in json.load(sys.stdin).get('designSystems',[])]" | head -60
```
评估准则：① 产品域匹配（B2B/CRM→企业/中性类；消费→Apple 类；数据→dashboard 类）
② **因为叠了 FxUI 橙品牌色，优先色彩中性的 DS**（避免它自带强品牌色与橙撞，如 Ant 蓝/Linear 紫）。

**2c. 让用户选（AskUserQuestion，不替用户定）：** 一个问题列 Target platform（带推荐），一个问题列 3-4 个 Design system
候选（每个写清调性 + 与 FxUI 橙是否撞色的权衡）。**用户选定 platform + designSystem 后才进 Phase 3。**

---

## Phase 3D：建项目绑定 + 写 brief.md → 交 OD 桌面端生成（**默认路径**）

把一切 staged 好，只把"按生成键"交给你在桌面端（走本机已登录订阅会话，可靠，不受 headless 子进程不稳影响）。

**先定标识（贯穿 建项目→落盘→recover 同一 slug）：** `_TOPIC`=主题展示名（取 `.claude/current-topic.txt` 或本次主题）；`_SLUG`=ASCII 安全短名（如 `suji-biz-insight`，从主题罗马化/英译，≤64 字符）。下面 `<slug>`=`$_SLUG`、`<topic>`=`$_TOPIC`；建完务必把 `$_SLUG` 记进 Phase 6 handoff，供日后 recover 定位。

```bash
# 1) 建项目并绑定所选 designSystem（designSystemId 是可绑字段；platform/fidelity 写进 brief 文本兜底）
curl -s -X POST "$_OD_URL/api/projects" -H 'content-type: application/json' \
  -d '{"id":"<slug>","name":"<topic>","designSystemId":"<选定DS>","platform":"<选定platform>","fidelity":"high"}'
# 2) 验证绑定（必须看到 designSystemId=<选定DS>，否则 OD 用不到所选规范）
curl -s "$_OD_URL/api/projects/<slug>" | python3 -c "import sys,json;p=json.load(sys.stdin).get('project',{});print('designSystemId=',p.get('designSystemId'))"
# 3) 写 brief.md（= /tmp/od_brief.txt 全文，供桌面端 @ 引用）；**不触发 /api/chat**
curl -s -X POST "$_OD_URL/api/projects/<slug>/files" -H 'content-type: application/json' \
  -d @<(python3 -c "import json;print(json.dumps({'name':'brief.md','content':open('/tmp/od_brief.txt').read(),'encoding':'utf8'}))")
```
staged 后一句话告知（不 AskUserQuestion、不阻塞）：
1. 已在 OD 建好项目 `<slug>`、绑定 `<选定DS>`、写入 `brief.md`；
2. 请在 OD 桌面端打开项目 `<slug>`、`@brief.md` 让它生成；
3. 生成完成后说「拉回来」，我走 recover（Phase 4）回收最新 index.html 落盘。

> daemon UP 且你要 OD 产出 → 降级/默认目标就是桌面端 OD，**不退** magicpath/html-prototype（那是 daemon 真不可达才退）。

---

## Phase 3H：headless 一次性触发生成（**opt-in**；仅你显式要求）

> 你未显式要 headless → 跳过本节，走 Phase 3D。本路径本 session 实测不稳（生成慢 >2.5-3min + daemon SIGTERM 重启）。

```bash
# step 1-3 同 Phase 3D（建项目 + 验证绑定 + 写 brief.md；conversationId 取『建项目 POST /api/projects 响应顶层的 conversationId』），随后：
# 4) headless 触发：/api/chat 必须带 agentId（漏了→AGENT_UNAVAILABLE）；body 用文件避免转义
python3 -c "import json;json.dump({'projectId':'<slug>','conversationId':'<建项目返回的cid>','message':open('/tmp/od_brief.txt').read(),'skillId':'web-artifacts-builder','agentId':'claude'},open('/tmp/od_chat.json','w'),ensure_ascii=False)"
curl -sN --max-time 1800 -X POST "$_OD_URL/api/chat" -H 'content-type: application/json' --data @/tmp/od_chat.json > /tmp/od_stream.log 2>&1
```
- 生成耗时几分钟，建议后台任务跑 + 轮询 `/api/projects/<slug>/files` 直到出 `index.html`。
- daemon 可能中途重启（端口变）→ 轮询/回收前**重新探测 `$_OD_URL`**。
- 失败处理（**重试上限 1**）：首次 /api/chat 若立即 canceled（SIGTERM）或只出 brief.md 无 index.html → 确认无产物后**原样重试一次**；再次失败（failed/canceled/narrate-but-no-file）→ **不再硬重试**；项目+brief.md+DS 已在 step1-3 建好，**不要重建**，直接跳到 Phase 3D 的「告知用户在桌面端生成」那步（绕开不稳的 headless 子进程）。
- `od mcp` 工具可用时，等价用 `create_project`/`write_file`/`start_run`/`get_run`/`get_artifact`。

---

## Phase 4：回收落盘 + 写 prototype-spec.md

```bash
# 0) recover 前重探端口（daemon 可能重启换端口）
_PID=$(pgrep -f "prebundled/daemon/daemon-sidecar"|head -1); _P=$(lsof -nP -p "$_PID" 2>/dev/null|grep -oE '127.0.0.1:[0-9]+ \(LISTEN\)'|grep -oE ':[0-9]+'|tr -d ':'|head -1); [ -n "$_P" ] && _OD_URL="http://127.0.0.1:$_P"
# 1) _SLUG 未知（跨 session recover）→ 优先用 handoff 记的 slug；否则按最近更新解析
[ -z "$_SLUG" ] && _SLUG=$(curl -s "$_OD_URL/api/projects" | python3 -c "import sys,json;ps=json.load(sys.stdin).get('projects',[]);ps.sort(key=lambda p:p.get('updatedAt',0),reverse=True);print(ps[0]['id'] if ps else '')")
[ -z "$_TOPIC" ] && _TOPIC=$(cat .claude/current-topic.txt 2>/dev/null)
# 2) 列出全部 html 产物（OD 可能一次出多个方案 + 一个导航页，别假设只有一个）
curl -s "$_OD_URL/api/projects/$_SLUG/files" | python3 -c "import sys,json;fs=json.load(sys.stdin).get('files',[]);[print(f\"{f['name']}\t{f.get('size',0)}\") for f in fs if f.get('name','').endswith('.html')]"
# 3) 全部回收到同一目录（保住彼此的同级相对链接），不要只取 index.html
_DIR="docs/prototype/$(date +%Y-%m-%d)-${_TOPIC}"; mkdir -p "$_DIR"; _N=0
for _f in $(curl -s "$_OD_URL/api/projects/$_SLUG/files" | python3 -c "import sys,json;[print(f['name']) for f in json.load(sys.stdin).get('files',[]) if f.get('name','').endswith('.html')]"); do
  curl -sf "$_OD_URL/api/projects/$_SLUG/raw/$_f" -o "$_DIR/$_f" && [ -s "$_DIR/$_f" ] && { echo "回收 $_f"; _N=$((_N+1)); }
done
[ "$_N" = "0" ] && echo "OD 项目 $_SLUG 还没出 HTML 产物——请桌面端生成完再说『拉回来』；不落盘、不标 DONE"
# 4) 判形态：STATE 注释数/体积区分「导航页」与「原型本体」，据此定谁是 index.html
grep -c "STATE:" "$_DIR"/*.html 2>/dev/null
```
> **多产物处置（2026-07-22 实证补入，SC-20260722-004）：** OD **会**一次产出多个设计方向 + 一个导航页
> （实测：`index.html` 8KB 导航页 + 两个 ~55KB 方案，STATE 注释数 1 / 8 / 8）。旧脚本「优先 index.html」
> 只会落盘那个导航页，**两个真原型留在 OD 里丢失，且落盘后导航页的同级相对链接全断，还会标 DONE**。
> 规则：① **全部回收、同目录放置**（保住相对链接）② 用 STATE 注释数/体积**判形态**，别按文件名假设
> ③ 多方案时 prototype-spec 与 handoff **必须显式写「未收敛，进 figma-layer 或工程前须先定方案」**
> ④ 用户选定后，把选定方案 **`mv`（不是 `cp`）到 `index.html`**（下游按此固定路径发现），
> 原导航页改名保留并修正其链接——`mv` 是为了避免两份副本日后漂移。
> **守卫：** 只有真·HTML 入口被回收且文件非空，才进 Phase 5/6 标 DONE；否则告知用户产物还没出、不落盘、不写 handoff。
**校验 FxUI 收窄口径**（可执行门，非目测）：品牌橙 #FF8000 与文字色 #181C25/#91959E 允许出现；**FxUI 语义色（success/info/warning/danger/link 的 FxUI 专有 hex）应为 0**（其余颜色/字体来自所选 DS=预期，不算违规）：
```bash
[ -z "$_TOPIC" ] && _TOPIC=$(cat .claude/current-topic.txt 2>/dev/null)
_P="docs/prototype/$(date +%Y-%m-%d)-${_TOPIC}/index.html"
_LEAK=$(grep -ioE '#(87cc3b|189dff|ff7c19|ff4a66|0c6cff)' "$_P" | sort -u | tr '\n' ' ')
[ -z "$_LEAK" ] && echo "FxUI 语义色泄漏检查: 0 ✓" || echo "FxUI 语义色泄漏: $_LEAK — 需回查（应来自所选 DS 而非 FxUI 注入），未清零不标 DONE"
```

**写 prototype-spec.md**（读 `html-prototype/SCHEMA.md`，框架来源填 `open-design`）：设计意图（迁移自交互文档）；
Design Decision Coverage 标 best-effort（chain）/「源=<产物>无决策矩阵」（adhoc），**不伪装 100% 可追踪**；
组件清单从实际 HTML 归纳；记录所选 design system + platform；交接块：figma-layer 须知 source=open-design、
FxUI 仅品牌色+文字色、必须读 index.html 实际代码。

**开发交接补全（仅下游=开发/场景1 时追加）**：若本原型将进自家开发链（tech-spec/task-plan），
在 prototype-spec.md 追加"开发交接补全"节，补 **组件 props / 响应式断点 / design token 清单 / 动效**
四维（从已产出 HTML 抽取，逐维方法见 `.claude/skills/office/references/dev-handoff-dimensions.md`）；
下游=Figma（场景2）路径**不触发**，figma-layer 产出不变。

---

## Phase 5：落盘交付 → 迭代主体在用户（OD 桌面端）

落盘后 `open` 产物给用户，一句话告知（**不阻塞提问、不 AskUserQuestion**）：
1. 产物已落盘 `docs/prototype/YYYY-MM-DD-<topic>/index.html`；
2. 要迭代请直接在 OD 桌面端继续改，改完说「拉回来」走 recover 入口回收最新版；
3. 要推 Figma（`/figma-layer`）或回这里改字段布局时，点名即可。

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
用户判断结论、token 偏差）；约束（≤5：figma-layer 必读 index.html 路径、source=open-design、FxUI 仅品牌色+文字色）；
风险（≤3：traceability best-effort、OD beta/动态端口、未还原项）；产出路径 + **OD 项目 slug=`$_SLUG`（供日后 recover 定位）**。

---

## ⚠️ 末尾核心约束

1. **默认桌面端生成；headless 为 opt-in**（权威见 Phase 0b / 3D / 3H）：默认 stage 后交你在桌面端按生成→「拉回来」回收；headless 为显式 opt-in，其重试上限与回落规则以 Phase 3H 为准。
2. **人工判断后置，迭代主体=用户在 OD**：落盘后展示即止、不阻塞提问；用户在 OD 桌面端
   自行迭代，回收（recover）/推 figma-layer 由用户点名触发（2026-06-10 luca 指示）。
3. **FxUI 收窄口径**：口径与具体色值权威见 Phase 1「FxUI Token 块」，本处不复述色值（避免与 Phase 1 漂移）。
4. **必须先评估并让用户选 Target platform + Design system**（Phase 2 AskUserQuestion），选定后**建项目时绑 `designSystemId`**
   （建后验证真的绑上）；platform/fidelity 写进 brief 文本兜底。
5. **输入是设计产出**（交互文档 或 单点方案 md），不是 PRD、不是已生成 HTML；源缺失不静默建空项目。
6. **桌面端动态端口**：每段都用 pgrep+lsof 重测 `$_OD_URL`，不写死；daemon 重启端口会变。
7. **/api/chat 必须带 `agentId`**（如 "claude"），否则 AGENT_UNAVAILABLE。
8. **落盘路径固定** `docs/prototype/YYYY-MM-DD-<topic>/index.html` + `prototype-spec.md`，供 figma-layer 发现。
9. **traceability 诚实标注**；**handoff + workflow-state 不可省略**。

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
