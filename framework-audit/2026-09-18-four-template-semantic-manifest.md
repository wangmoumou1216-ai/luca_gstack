# 四模板结构语义预检 manifest

> **2026-09-20 用户纠正：本文件的静态影子方案整体作废。** 用户要的是原模板一比一副本，不是结构重写。
> 下列影子 hash 和测试只保留为错误实现的历史证据，不得作为原模板验收。现行源已改到
> `.claude/skill-os/page-library/sources/originals/`，四份与原件逐字节一致；原件执行适配未完成，不能宣称 carrier-ready。

状态：`BLOCKED — REVIEW REMEDIATION`。用户已于 2026-09-18 明确确认：四个模板登记为四个新 `page_id`，保留现有五个模板，不替换、不删除。该确认授权生成并登记非破坏性的静态影子源；`framework/` 继续只读，原始模板字节不改。下列 hash/测试为历史基线证据，不能充当整改后版本的验收。2026-09-20 独立深审发现需求追踪、机械恢复与状态物化证明缺口，撤回发布就绪结论；整改真值见 `2026-09-20-template-flow-review-remediation-plan.md`。

## 冻结输入

| 源文件 | bytes | SHA-256 | 结构证据 | Phase 0 判定 |
|---|---:|---|---|---|
| `/Users/luca/Desktop/模版/后台设置.html` | 4,061,244 | `4bfd4b31b2bc738881507061e5b394de7984ccb93b799a0a1c1824dc673284e0` | `#app-portal` / `#sub-tpl` / `#crmmanage`；8 个 template state；无 `data-od-id` / `data-slot` | 需生成静态影子源并补语义锚点 |
| `/Users/luca/Desktop/模版/客户列表到详情页.html` | 4,485,792 | `05921e7ad5340df93c28637118b1599eaefb4a4827a1b8d351afa7868808e58b` | `#app-portal` / `#sub-tpl`；4,895 个 `data-source-node`；14 个 template state；无 `data-slot` | 需生成静态影子源；不得把 capture node ID 冒充语义 ID |
| `/Users/luca/Desktop/模版/工作台首页.html` | 219,396 | `7a30a15978929ede4177e213f1090cb4d3860e5b2ef33509434cfff7879631e5` | 89 个 `data-od-id`；`#appRoot` / `#workspaceCard` / `#agentPanel` 等唯一 ID | 可建立 shell/navigation/workspace/agent 模块合同；需明确 add slot |
| `/Users/luca/Desktop/模版/销售记录列表到详情页单.html` | 283,609 | `1c2f45816993f022e13322757cc87b03b77d66d0be2971397d82b3cb1fad544f` | 44 个 `data-od-id`；7 个 `data-slot`；列表/详情/页签均有唯一 ID | 四份中最接近直接 carrier-ready；仍需入库源、模块 hash 和完整回归 |

源路径由用户提供；本轮只把结构语义转录为仓库内静态影子源，不复制或改写原始文件。用户对上述四模板身份映射的明确确认是本次引入决定。

## 建议的非破坏性身份

不复用现有 `list` / `detail-2col` / `detail-3col` / `form` / `home` ID，不删除旧源；先以四个新 live 影子页验证：

| 建议 page_id | 页面意图 | 建议 states | 核心 modules | 候选 slots |
|---|---|---|---|---|
| `settings-lead-pool` | 配置线索池、转换、保有量、跟进规则与基础设置 | `pool`, `conversion`, `ownership`, `followup`, `basic`, `detail`, `edit`, `new`, `department` | app shell、管理导航、配置 workspace、状态页签、线索池表格 | 配置内容区、编辑/新建内容区 |
| `customer-list-detail` | 浏览客户列表并进入客户详情的资料、动态、地址、财务、联系人和商机 | `list`, `details`, `activities`, `address`, `financial`, `contacts`, `opportunities`, `contacts-expanded` | app shell、左导航、客户列表 workspace、表格、详情 shell、详情页签 | 列表工具区、详情内容区 |
| `crm-workbench-home` | CRM 首页/工作台，含全局导航、CRM 菜单、主工作区与 Agent 面板 | `default`, `agent-open`, `session-drawer`, `menu-config` | `#appRoot`、global navigation、CRM navigation、workspace、Agent panel | `#workspaceCard`、`#chatLog` |
| `sales-record-list-detail` | 销售记录列表和详情侧滑/全屏阅读 | `list`, `detail`, `summary`, `insight`, `tasks`, `transcript`, `basic` | app shell、global topbar、app rail、CRM sidebar、sales workspace、list view、detail layer、detail tabs | `#tab-content-slot`、`#detail-meta-slot`、五个 detail panel slot |

## 不可跳过的实施门

1. **PASS** — 人工确认“四个新 page ID 影子登记，旧五页保留”；没有 old→new 替换、删除或 ID 复用。
2. **WITHDRAWN** — 原“全部状态已转录”的 PASS 缺少逐状态结构证据。名称方块/摘要不证明完整物化；整改以 catalog 的 state_support 及来源审计为准，unsupported 状态不得进入 carrier。
3. **PASS** — carrier 合同只使用有限 `id|data-module` 词汇；原 `data-od-id` 仅作来源证据，`data-source-node` 未进入任何稳定身份。
4. **PASS** — 四页均通过唯一锚点、ancestor containment、module/slot 不重叠、module contract hash、严格 P0 asset profile、隔离预览与 carrier 正反例。
5. **BLOCKED** — 原四页固定 page/slot 的验证文本试验仅证明指定路径可运行，不证明自然需求匹配/定位或原状态完整性。整改后须重新验证；未经新证据不得宣称“四个模板结构语义已做好”。

## 实施与验证证据

| page_id | shadow SHA-256 | module contract SHA-256 | modules / slots | 本地结果 |
|---|---|---|---:|---|
| `settings-lead-pool` | `b2916d7bac12315872bec8bd553374b4ba66ed4cbb7265f4d774cc0cf1dd9652` | `468924402b5c2dd692c6a87af022b40e54ff9b12744a4030cee38d3006f45d0f` | 7 / 2 | PASS |
| `customer-list-detail` | `7b06edcfdec9bcba0d68e13e6cd2bf8267550c15b6c8a4c6ed5111fdeea721b6` | `8774b4adeb9de32b6f1fb8afe013e467ee4b2d6e2e43c4eb1ca20c312b4fa179` | 9 / 3 | PASS |
| `crm-workbench-home` | `860b6e7b655b5c7e622ab8ab5d7a396c651026658dadae1a3dee925c76392af0` | `e63a5a2d14306f9caa53b8766d75fc26004c0e48bc52ff8e3425b76e4390a19e` | 9 / 2 | PASS |
| `sales-record-list-detail` | `c24c2169aacc682a2c7d124734797d2567b7672b0e21dd74f0ea2e3944aa421c` | `b2a9de57c4b4c09862178a187770f6930ab199c3b6967928c6de3015c64d100f` | 11 / 8 | PASS |

- `node scripts/page-context.mjs validate`：`pages=9`、`regions=54`，PASS。
- 四个影子源均为 `p0-static-v1`、零外部 asset、零脚本、零事件处理器、零潜在执行；带脚本伪 carrier 在浏览器前以 `ACTIVE_CONTENT_FORBIDDEN` 拒绝。
- Playwright 真实截图逐页显示全部登记区域可见；四个新页面的普通 preview 与 `carrier-only` 截图 SHA 一致，后者额外证明严格 P0 closure。
- `bash scripts/verify.sh`：`PASS=98 FAIL=0 WARN=0`。
- 原始四文件 SHA 与字节数再次读回一致；`framework/` diff 为空；旧五个 page ID 顺序、source 与 `carrier_eligible=false` 保持不变。
- 机器可读 raw→shadow 绑定：`.claude/skill-os/page-library/source-manifest.json`。

## 发布前 checkpoint

- baseline：`cbbbcbc461153849a6783eec21071e747e3401f5`；`git fetch upstream main` 后本地/远端同 SHA，分叉计数 `0/0`，允许普通发布。
- 本轮精确提交面：页面库 catalog/source manifest/四个 shadow，页面库与资产 profile 测试，carrier-only preview 修复，`package.json`、`scripts/verify.sh`、CI、CHANGELOG，以及本文和既有 OD V2 live validation 补证。
- 明确保护、不进入本轮：`memory/retrieval-log.jsonl`，所有 `2026-09-17-model-routing-*`，`2026-09-18-framework-template-migration-handshake-plan.md`、`2026-09-18-interaction-notes-review-handshake.md`、`2026-09-18-template-driven-od-flow-v2-plan.md`。
- 剩余顺序：精确 stage → 提交 → 普通 push → 用发布提交逐页执行四个真实 OD TAC/stage/run/recover/语义读回 → 补发布后证据并再次提交/推送。
- 恢复入口：先读本文与 `git status --short --branch`，确认 protected dirty files 未被 staged，再从首个未完成阶段继续；代码漂移则重跑 `bash scripts/verify.sh`。

<!-- FILE_END: 2026-09-18-four-template-semantic-manifest.md -->
