# Prototype Spec

生成时间：YYYY-MM-DD HH:MM
purpose: {ui / logic-validation；无历史字段默认为 ui}
ui_variant_count: {0 / 2 / 3 / 4 / 5；只有已确认 UI 对比才非零，显式对比未指定数量默认3}
输入来源 source_kind：{实际来源，与 purpose 正交}
本地 HTML/精确原型目录授权：{真实指令/批准范围；不推导 Git/发送/生产权限}
场景：{新功能设计 A / 优化现有 B / 评审改版 C}
框架来源：{framework/xxx.html / 无框架}
对应文件：docs/prototype/YYYY-MM-DD-{topic}/index.html

---

## 设计意图（Step 0 输出）

用户处境：{1-2 句话}
空间结构：{几个区域 + 视线路径}
视觉重心：{L1 元素是什么}

---

## 当前审美校准

Current Aesthetic Score：{NN}/30（UI 必须 ≥24；logic-validation 写 N/A — 逻辑验证并保留可读性/反馈核对；UI 每变体分别评分）
参考坐标：{Linear / Attio / Notion AI / Granola / Cursor / Atlassian / Vercel / Salesforce Agentforce}
采用原则：{Calm Density / Invisible AI / Progressive Disclosure / Role Awareness / Trust Before Delight}
拒绝方向：{不做卡片墙 / 不做聊天框 / 不做大面积渐变 / 不做 Hero 化后台页面 / ...}
角色语境：{销售 / 销售管理者 / 运营 / 管理员}
本次最需要建立的用户信心：{更快判断 / 更少误操作 / 更清楚 AI 来源 / 更容易接管 Agent}

---

## Dynamic Reference Scan

Dynamic Reference Status：{COMPLETED / SKIPPED_TOOL_UNAVAILABLE / NOT_REQUIRED}

### 查询目标

{本次要解决的 1-3 个 UI / 动效 / AI pattern 问题}

### 入选参考

| 产品 | 来源 | 证据类型 | 借鉴点 | 采用/不采用 |
|---|---|---|---|---|
| {产品} | {URL 或说明} | official docs / product page / changelog / screenshot / video / article | {借鉴点} | {采用/不采用 + 原因} |

### 共性提取

- 布局：{共性}
- 信息层级：{共性}
- AI/Agent 表达：{共性}
- 动效：{共性}
- 状态反馈：{共性}
- 信任/控制：{共性}

### 转译为本原型的设计决定

- {决定 1}
- {决定 2}
- {决定 3}

---

场景B：
改动区：{design-brief 要求改动的具体区域}
保持区：{无对应决策，保持与截图一致的区域}

---

## 页面列表

| 页面/状态 | 触发方式 | 描述 |
|---------|--------|------|
| 默认态 | 直接访问 | |
| 空态 | index.html#empty | |
| 加载态 | index.html#loading | |
| 错误态 | index.html#error | |

---

## 状态覆盖矩阵

| State ID | 状态名 | data-prototype-state | 触发方式 | 实现状态 |
|---------|--------|------------|---------|---------|
| default | 默认态 | `data-prototype-state="default"` | 直接访问 / 状态切换器 | ✅ |
| empty | 空态 | `data-prototype-state="empty"` | 状态切换器 | ✅ |
| loading | 加载态 | `data-prototype-state="loading"` | 状态切换器 | ✅ |
| error | 错误态 | `data-prototype-state="error"` | 状态切换器 | ✅ |
| success | 成功态 | `data-prototype-state="success"` | 状态切换器 | ✅ |
| ai-thinking | 思考中态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |
| ai-low-confidence | 低置信态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |
| ai-decline | 拒答态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |
| ai-partial | 部分完成态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |
| ai-steer | 待 Steer 态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |
| ai-feedback | 幻觉兜底态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |
| agent-running | Agent 执行中态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |

---

## Design Decision Coverage

| Decision ID | HTML 注释 | 位置/区域 | 实现状态 | 说明 |
|-------------|-----------|----------|----------|------|
| D-001 | `<!-- DECISION: D-001 | source: design-brief | status: implemented -->` | {区域} | ✅ | {说明} |

---

## 页面与交互位置映射

对应 design-brief §7，gate：`page_interaction_mapping`。逐项保留语义与来源，补充实际 HTML 定位。

| 页面/语义位置 | 交互职责 | D-ID | 适用 STATE | 需求/真实来源与 AC | 约束/保持区 | 下游目标与实现位置 | 已确认页库引用（可选） |
|------|------|------|------|------|------|------|------|
| {页面/区域} | {任务、触发与反馈} | {真实 D-ID 或无上游决策及原因} | {适用状态} | {R/AE 或 brief/截图/UX 来源，及对应 AC} | {约束} | {目标 + HTML 锚点/注释} | {已确认 page_id/region_id 或 reference=none} |

Standalone 缺上游映射时记录本次语义区域计划和追踪缺口，不伪造 D/R/AE；
`reference=none` 仍须保留位置、职责、状态、来源和验收。历史旧组件映射只读提取语义列，
不补 variant/classes 或旧技术资产，不重写历史文件。

---

## 场景C：FIX-ID 实现记录

| FIX-ID | 问题描述 | 实现状态 |
|--------|---------|---------|
| UX-A-P0-001 | {描述} | ✅ 已实现 |

---

## Observable QA

QA 结果：{PASS / DONE_WITH_CONCERNS / FAIL}
QA 报告：docs/prototype/YYYY-MM-DD-{topic}/prototype-qa-report.md
QA JSON：docs/prototype/YYYY-MM-DD-{topic}/qa-results.json
截图：
- docs/prototype/YYYY-MM-DD-{topic}/screenshots/desktop.png
- docs/prototype/YYYY-MM-DD-{topic}/screenshots/tablet.png
- docs/prototype/YYYY-MM-DD-{topic}/screenshots/mobile.png

| 检查项 | 结果 | 说明 |
|--------|------|------|
| console errors = 0 | {PASS/FAIL/N/A} | |
| design decisions mapped = N/N | {PASS/FAIL} | |
| states implemented | {PASS/FAIL} | |
| supplied design rules | {PASS/FAIL/N/A} | {实际来源/版本与静态检验范围；无规范不宣称合规} |
| no external CDN | {PASS/FAIL} | |
| no emoji icons | {PASS/FAIL} | |

---

## 未实现项

| 项目 | 原因 |
|------|------|
| {功能} | {技术限制/需要后端数据} |
（无则写「无」）

---

## 交接块（下游 skill 必读）

**本步决定了什么：**
{信息架构、页面与交互位置、关键交互职责和路径、状态覆盖策略}

**下游交付审查与实现 需要知道：**
{设计范围、框架来源、页面与交互位置映射所在节、D/STATE/AC 与实际实现位置的对应关系}

**下游交付审查与实现 不应该做：**
{不应重新设计已决定的信息架构}


---

## Logic Validation Coverage（仅 purpose=logic-validation）

Question source: {真实用户 brief/已确认材料路径与位置，不伪造上游 D-ID}
可见业务问题：{页面顶部真实文本及定位；问题不清等待用户}
已确认模型/边界：{领域数据、初态、动作、合法/非法转换、全部状态/错误/reset}
单自包含 HTML 与单 script：{离线打开证据；资源/存储/真实DB均无依赖}
Portable logic module：{PROTOTYPE LOGIC START/END、PrototypeLogic 的纯接口及实际提取证据路径}
方向：{薄 UI 调模块，动作后重绘全部相关状态；模块无 DOM/document/页面反向 callback}
固定五态：N/A — 逻辑验证（真实需求状态仍全覆盖）
审美24/30门：N/A — 逻辑验证（字体/层级/错误与反馈可读性仍核对）

| 需求状态/转换/错误 | 来源/AC | 自由动作按钮 | 当前状态面板反馈 | 已执行序列/结果/证据 |
|---|---|---|---|---|
| {真实名称} | {真实来源} | {data-logic-action} | {可读领域字段} | {实际浏览器与提取模块同结果；未运行写NOT_RUN} |

| Walkthrough tab | 已知初态/reset按钮 | 真实步骤按钮及预期推进 | 实际操作与 reset 证据 |
|---|---|---|---|
| happy | {初态/data-walkthrough-reset} | {data-walkthrough-step + data-logic-action} | {实际证据} |
| edge | {同一模型的边界初态} | {步骤/反馈} | {实际证据} |
| illegal | {非法操作前初态} | {非法动作/错误/状态保持} | {实际证据} |

独立便携性 fixture：{原型外的提取结果、同初态/动作对比；不在 HTML 内建测试框架}
问题回答/真实反馈：{已回答或待决；不把模拟反馈称为用户反馈}

---

## UI Variant Coverage（仅 ui_variant_count>0）

稳定 keys：{A…E 的前 N 个，顺序不变；单 index.html，只切 rendering 子树}
common_content_ids: ["{从真实来源枚举的角色/场景/模块/指标/表项/动作/详情子页ID}"]
required_state_ids: ["{从真实来源逐项枚举的全部适用状态ID，包括基础五态与实际AI/需求状态}"]
宿主来源：{已授权页面/截图、header/sidebar/密度/只读数据；无宿主时真实确认独立页面原因}
共同 D/STATE/AC：{全部已确认项及其真实来源；所有变体都实现}
Packet/骨架确认：{每 key 与共同约束/对比假设的真实确认；冲突回原 owner}

| key/名称 | 布局差异 | 信息层级差异 | 主操作差异 | 宿主保持区/只读数据 | 假设及真实来源 | 共同 D/STATE/AC 与内容清单 |
|---|---|---|---|---|---|---|
| {A…前N} | {结构，不是颜色} | {结构} | {操作} | {可枚举角色/场景/模块/指标/表项/动作/详情子页} | {真实来源/显式假设} | {逐项对应定位} |

每 key 写独立可机读分数字段，例如 `Variant A Current Aesthetic Score: 24/30`；实际评分证据
按当前 rubric 逐维列出，checker 读取声明不替代独立评分。每 key 独立基础五态和全部适用
状态/错误/恢复；共同数据/内容完整，按真实源抽查，不以 marker 自证。

| key | state/action | D/STATE/AC | 截图/操作序列 | console/error | 分数及评分依据 | 内容守恒/来源抽查 |
|---|---|---|---|---|---|---|
| {A…前N} | {逐项} | {全部适用} | {真实路径；未运行NOT_RUN} | {真实结果} | {≥24/30，每key} | {真实源与内容} |

Switcher QA：{共享浮动底栏key/名称、左右箭头及键盘环绕、input/textarea/contenteditable焦点不拦截、
其它query/hash保留、deep link/reload、未知key可恢复错误；实际证据路径}
真实选择/理由：{用户选key或组合部件；未选保留待决，不代选}
回流 owner：{原设计/实现 owner，原型不自动晋升}
原型声明/权限：{只在批准目录，真实route/auth/数据写入/生产未被验证；另行实现须真实build环境
production guard并移除底栏，Git归档/发送/发布需另获原生授权}

## Exact derived delivery identity（仅实际启用 motion/notes 后处理时）

身份真值由 `.claude/skill-os/runtime/prototype-delivery.md` 和其 schema/helper 拥有；在写本节或
消费 `final_artifact_ref` 前完整读取。这里仅记录实际入口，不改变普通原型的既有 QA/用途门。

generation.source: {实际 open-design/html-prototype/用户原件来源}
raw entry/spec/recovery receipt: {原始精确 path+sha256；保持原件，不重写旧 FAIL}
postprocess.source: {motion-polish / prototype-notes；以实际解析 processor 为准}
processor_id: {实际 candidate/report/certificate 的 processor；旧无字段票按 motion 默认，旧票字节不改}
parent_accepted_ref: {仅 accepted motion→notes 的 exact parent path+sha256；raw/用户完整HTML不伪造parent}
delivery kind: {adequate-original / adequate-copy / enhanced-copy}
candidate_ref: {验收前冻结的精确 path+sha256}
final entry/spec: {实际被验的精确 path+sha256；不得默认 raw/index.html}
required behavior refs: {原 source D/STATE/AC/KEEP 全分母 ∪ parent motion required ∪ 适用 NOTES:<case-id>；AI scope 不缩源分母}
patch/methods: {实际变更与适用参考的版本/hash；充分分支 patch 为空}
runtime evidence: {同 finalhash 的实际 DOM/时间轨迹、required 逐项结果}
independent acceptance: {caller 核验的真实独立 invocation/output/report refs；自检不冒充独立票}
final_artifact_ref: {仅最终接受后由普通 handoff 运输的 accepted-delivery.json path+sha256}
notes_final_ref: {notes 分支最新 accepted ref，与 final_artifact_ref 同 path+sha256；raw/旧motion仅来源}
notes_manifest_ref: {notes 必填；metadata/content外且不同于spec，绑定scope/data/runtime/guideline/hash/version与完整映射/required实例}
notes current spec: {final/data/runtime/guideline/scope/source→behavior→annotation、实际表现/未演示/差异/证据；raw/parent spec原样保留}
guideline generation/review: {同版同hash .claude/skills/office/references/prototype-notes/content-guidelines.md，按§2.1有源大模块/连续fill语义核验；非regex PASS}

复制内容与原同名 spec/QA 资产位于 attempt/content，观察 spec/QA metadata 位于 attempt 根，
不覆盖原文件。内部 OD 未完成分支使用真实 raw recovery receipt 与源期待，不要求未来的
Phase6 DONE handoff；完整 final 独立 PASS 后才由 OD completion owner 完成一次。
notes 共享字段/内容/生成合同由 `.claude/skills/office/references/prototype-notes/contract.md`、
`.claude/skills/office/references/prototype-notes/content-guidelines.md`、
`.claude/skills/office/references/prototype-notes/generation.md` 拥有。
OD Phase4–6 固定 caller 真实调用公开 notes/delivery APIs；当前 host 确认与权限不能从这些身份字段产生。
接受前冷 QG 消费 candidate，接受后所有下游实际 resolve 最新 notes_final_ref；失效不退 raw/旧motion。
raw_gate 仅当前精确输入机械资格；raw semantic FAIL 保留，不是加工前 PASS 前置。最终完整原
source 行为仍 FAIL/UNKNOWN 时不能接受或完成。
本节仅扩展 exact identity；不改变 html-prototype 平台、生成器启用、用途门或普通输出政策，也不默认接线该生成器。

<!-- FILE_END: html-prototype/SCHEMA.md -->
