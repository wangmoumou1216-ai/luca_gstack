---
name: open-design
preamble-tier: 3
argument-hint: "[design-brief 路径 | 要给 OD 的方案 md(单点交接) | 'recover/拉回来' 回收产物]"
version: 3.0.0
description: |
  Open Design (OD) 连接器（**headless 一次性出图**）：把设计产出（design-brief 交互文档，或你单点指定
  的方案 md）编译成干净 OD 指令；先评估并让你选 Target platform + Design system，再建项目绑定它，由本
  skill 经 daemon 触发 OD headless 生成 HTML（不反问、一次出），回收落盘 docs/prototype/ 供 /figma-layer。
  design 产出首选。**FxUI 只叠品牌色 #FF8000 + 文字色 #181C25/#91959E；其余配色/字体/字号/布局全走所选
  OD design system，不指定、不覆盖、不冲突。** 两种进入：chain（默认取最新 design-brief）/ adhoc（语义识别
  的单点交接）。不接受 PRD 当设计源、不接受已生成 HTML。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
  - WebFetch
context-cost:
  self: 6500
  runtime-estimate: 9000
  shared-refs: [brand-tokens, handoff-protocol]
  recommended-model: sonnet
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

> **模型（核心，headless）：** luca_gstack 负责「编译指令 → 评估并让你选 platform/Design system → 建项目绑定 →
> headless 触发 OD 一次性生成 → 回收落盘」；OD 内层 agent **一次出图、不反问**（option ②）。**人工判断后置**：
> 落盘后展示给你判断（符合/迭代/停）。与 magicpath/html-prototype 关系：三者同为 design_output 生成器，
> open-design 主力，后两者备选（OD 不可用 / 要本地纯 HTML 时）。
> **连接走 daemon HTTP（动态端口）；`od mcp` 已注册时也可用其工具，二选一即可。**

---

## Phase 0：判定输入源 + 前置检查

**0a. input_source：**
- **chain（默认）**：用户没点名产物 → 取最新 `docs/decisions/*-design-brief.md`。
- **adhoc（单点交接，语义识别非词表）**：用户自然语言表达「把某产物交给 OD 生成」（"把刚才那个 md 给 OD"／
  "让 OD 基于这个出图"／"丢进 OD" 等都算）。三要素：①有明确源产物 ②目标是 OD ③意图是交给它生成 → adhoc，源=该产物。
- **recover（回收）**：用户说「拉回来/落盘/我在 OD 弄好了」→ 直接跳 Phase 5 回收，不重新编译。
- 源指代不明 → 一句话确认；尚未落盘的对话内容 → 先写盘再用，不静默重构。

**0b. 前置检查：**
```
□ [chain] 最新 design-brief 存在 + 含「Design Generation Packet」节？ 否→BLOCKED（先 /design-brief，或改单点交接）。
□ [adhoc] 用户点名产物存在、非空、可读？ 否→BLOCKED 明确报错（不静默建空项目）。
□ OD daemon 可达（Preamble OD_DAEMON=UP）？ DOWN→告知「请打开 OD 桌面端」，停。
```

---

## Phase 1：编译 OD 指令（luca_gstack 核心活；headless 一次性）

把输入源编译成一份干净、可直接 headless 发给 OD 的指令：
- **chain**：抽交互文档的 **Design Generation Packet** 作主体；只用已定设计事实，不倒 PRD/research 原文。
- **adhoc**：以用户点名产物**原文**为主体，忠实传递，不替它发散/编造。
- 用户对话里**额外强调的需求点**（如「突出今日待跟进」）按原意编进去作重点；真实中文 B2B 文案，不要 Lorem。

**FxUI Token 块（只叠这两类，其余全交所选 design system，不指定、不覆盖、不冲突）：**
```
## FxUI 品牌叠加（仅两类；其余配色/字体/字号/布局沿用本项目所选 design system，不要指定、不要覆盖它）
- 品牌色：#FF8000（主按钮/主操作/激活/品牌强调，其上文字白色；替代 design system 原强调色；全页≤3处）
- 文字颜色：主文字 #181C25；次要文字 #91959E
（不指定字体 family、不指定字号、不用 FxUI 的语义色/分割线/页面底/卡片底——这些一律交给所选 design system 默认）
```

**headless 一次性（option ②）：** 指令末尾必须加：
`【本次为 headless 一次性产出：以上细节已确认，请直接生成完整自包含 index.html，不必反问/不要 question-form。】`

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

## Phase 3：建项目绑定 + headless 触发生成

```bash
# 1) 建项目并绑定所选 designSystem（designSystemId 是可绑字段；platform/fidelity 不是项目字段→已写进 brief 文本兜底）
curl -s -X POST "$_OD_URL/api/projects" -H 'content-type: application/json' \
  -d '{"id":"<slug>","name":"<topic>","designSystemId":"<选定DS>","platform":"<选定platform>","fidelity":"high"}'
# 2) 验证绑定（必须看到 designSystemId=<选定DS>，否则 OD 用不到所选规范）
curl -s "$_OD_URL/api/projects/<slug>" | python3 -c "import sys,json;p=json.load(sys.stdin).get('project',{});print('designSystemId=',p.get('designSystemId'))"
# 3) 写 brief.md（= /tmp/od_brief.txt 全文，供 OD 内 @ 引用）
curl -s -X POST "$_OD_URL/api/projects/<slug>/files" -H 'content-type: application/json' \
  -d @<(python3 -c "import json;print(json.dumps({'name':'brief.md','content':open('/tmp/od_brief.txt').read(),'encoding':'utf8'}))")
# 4) headless 触发：/api/chat 必须带 agentId（漏了→AGENT_UNAVAILABLE）；body 用文件避免转义
python3 -c "import json;json.dump({'projectId':'<slug>','conversationId':'<建项目返回的cid>','message':open('/tmp/od_brief.txt').read(),'skillId':'web-artifacts-builder','agentId':'claude'},open('/tmp/od_chat.json','w'),ensure_ascii=False)"
curl -sN --max-time 1800 -X POST "$_OD_URL/api/chat" -H 'content-type: application/json' --data @/tmp/od_chat.json > /tmp/od_stream.log 2>&1
```
- 生成耗时几分钟，建议用后台任务跑 + 轮询 `/api/projects/<slug>/files` 直到出 `index.html`。
- daemon 可能中途重启（端口变）→ 轮询/回收前**重新探测 `$_OD_URL`**。
- `od mcp` 工具可用时，等价用 `create_project`/`write_file`/`start_run`/`get_run`/`get_artifact`。

---

## Phase 4：回收落盘 + 写 prototype-spec.md

```bash
mkdir -p "docs/prototype/$(date +%Y-%m-%d)-${_TOPIC}"
curl -s "$_OD_URL/api/projects/<slug>/files"   # 确认入口名
curl -s "$_OD_URL/api/projects/<slug>/raw/index.html" -o "docs/prototype/$(date +%Y-%m-%d)-${_TOPIC}/index.html"
```
**校验 FxUI 收窄口径**（抽查产物）：品牌橙 #FF8000 在（主操作）、文字色 #181C25/#91959E 在；
**FxUI 语义色应为 0**（其余颜色/字体来自所选 DS=预期，不算违规）。

**写 prototype-spec.md**（读 `html-prototype/SCHEMA.md`，框架来源填 `open-design`）：设计意图（迁移自交互文档）；
Design Decision Coverage 标 best-effort（chain）/「源=<产物>无决策矩阵」（adhoc），**不伪装 100% 可追踪**；
组件清单从实际 HTML 归纳；记录所选 design system + platform；交接块：figma-layer 须知 source=open-design、
FxUI 仅品牌色+文字色、必须读 index.html 实际代码。

---

## Phase 5：后置人工判断 → 下一步

落盘后 `open` 产物给用户看，然后 AskUserQuestion：
> OD 产出符合需求吗？ A）符合 → `/figma-layer`（推成带 Auto Layout + FxUI 品牌色/文字色的 Figma 图层）
> B）要迭代 → 你说改哪，我改指令重跑 Phase 3（headless 再出一版） C）先停这里

（recover 入口也汇入此处。选 B 回 Phase 1/3 重编译重跑。）

---

## Phase 6：handoff + 更新 workflow-state（落盘后）

```bash
export _NODE="open-design"; export _STATUS="DONE"
export _OUTPUT="docs/prototype/$(date +%Y-%m-%d)-${_TOPIC}/index.html"
python3 .claude/skills/office/references/write_state.py 2>/dev/null || echo "workflow-state 写入跳过"
```
**Handoff**（`docs/handoff/YYYY-MM-DD-<topic>-open-design-handoff.md` ≤2000 tokens）：决策（≤8：选的 platform/DS、
用户判断结论、token 偏差）；约束（≤5：figma-layer 必读 index.html 路径、source=open-design、FxUI 仅品牌色+文字色）；
风险（≤3：traceability best-effort、OD beta/动态端口、未还原项）；产出路径。

---

## ⚠️ 末尾核心约束

1. **headless 一次性出图（option ②）**：经 daemon `/api/chat` 触发 OD 直接生成；指令末尾写明「不必反问/不要 question-form」。
2. **人工判断后置**：落盘后展示给用户判断（符合/迭代/停），不在生成中途要用户输入。
3. **FxUI 只叠 品牌色 #FF8000 + 文字色 #181C25/#91959E**；其余配色/字体/字号/布局全交所选 design system，
   **不指定、不覆盖、不与 OD 规范冲突**；FxUI 语义色/分割线/背景一律不注入。
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

**Step 2 — 更新 workflow-state.yaml：**
```yaml
open-design:
  status: DONE
  output: "docs/prototype/<filename>"
  completed_at: "<YYYY-MM-DD>"
  gate_result: PASS
  handoff_path: "docs/handoff/<filename>"
```

<!-- FILE_END: open-design/SKILL.md -->
