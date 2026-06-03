# Checkpoint — open-design 集成 (PRD/设计产出 → OD → Figma)  2026-06-03

> 框架级工作（修改 luca_gstack 本体）。无激活项目，故放 `.claude/audit/` 而非 docs/handoff/。

## 1. 做了什么（已完成 ✅）

把「设计产出 → Open Design 生成 HTML → Figma」打通并嵌入 luca_gstack。

**新增/改动文件（均未 commit，working tree）：**
- 🆕 `.claude/skills/office/open-design/SKILL.md`（**v3.0 headless 模型**）+ `.claude/commands/open-design.md`
- 🔧 `.claude/skills/office/figma-layer/SKILL.md`：加 `open-design` source_kind + MCP 现代化(use_figma/whoami) + FxUI token 收窄到品牌色+文字色
- ⚙️ `.claude/skill-os/optional-workflow-graph.yaml`（design_output.primary→open-design，scene 路径降级不删，新 gate）、`skill-routing-map.yaml`（open_design 仅产品名触发）、`input-modes.yaml`
- 📄 `CLAUDE.md` / `.claude/skills/office/SKILL.md` / `AGENTS.md` 路由三件套同步
- MCP：`claude mcp add open-design`（local scope，✓ Connected，桌面端 daemon-cli.mjs + 命名空间 IPC 发现）

**验证套件全绿**：`npm run verify` PASS=45 FAIL=0；check-routing-map 双 PASS；validate:skills OK。

## 2. 实测确认的 OD 连接机制（关键参考，写进了 skill）

- OD 桌面端 = `/Applications/Open Design.app`，自带 node + `prebundled/daemon/daemon-cli.mjs`，daemon 走 **IPC socket + 动态 TCP 端口**（49153→61622→62280→63179 一路在变）。**每段用 `pgrep -f daemon-sidecar` + `lsof` 重测端口，不写死 7456/7457。**
- 权威安装信息：`curl $OD/api/mcp/install-info` 返回 command/args/env。
- 建项目：`POST /api/projects {id,name,designSystemId}` —— **designSystemId 可绑（建后 GET 验证）**；platform/fidelity **不是项目字段**，写进 brief 文本兜底。platform slug 如 `mobile-standard`；fidelity `high`。
- 写文件：`POST /api/projects/:id/files {name,content,encoding}`（覆盖写）。
- **headless 触发 = `POST /api/chat {projectId,conversationId,message,skillId,agentId}`** —— **必须带 `agentId`（如 "claude"），漏了报 AGENT_UNAVAILABLE**。SSE 流，几分钟，轮询 `/files` 出 index.html。
- 回收：`GET /api/projects/:id/raw/index.html`。
- design-systems 目录：`GET /api/design-systems`（**149 个**，带 summary 可评估）。
- 可用 agent：claude/codex/cursor-agent。skills：本 OD 装的是 web-artifacts-builder 等（无 mobile-app/web-prototype）。
- ⚠️ `/api/runs`（headless 委托）和 UI 会话**脱节**：UI 只渲染自己发起的 session；外部 API 触发的 run 不在 OD 左侧露出；`POST .../messages` 是 **404 只读**。→ 见 §4 决策。

## 3. 最终 skill 模型（open-design v3.0，与用户最新需求对齐）

`需求/交互文档 → 编译 OD 指令 → 评估并让用户选 Target platform + Design system → 建项目绑 designSystemId → headless /api/chat(带 agentId) 一次性出图(不反问) → 回收落盘 docs/prototype/ → 人工判断后置(符合/迭代/停) → /figma-layer`

- **FxUI 只叠 品牌色 #FF8000 + 文字色 #181C25/#91959E**；其余配色/字体/字号/布局全走所选 design system，不指定、不覆盖、不冲突。
- 两入口：chain（默认取 design-brief）/ adhoc（语义识别单点交接，不写死关键词）。

## 4. 关键决策（不可从代码推导）

- **D1** OD 输入是设计产出(交互文档/单点 md)，不是 PRD/HTML。
- **D2** OD 取代 magicpath 成 design_output 主力（降级不删）。
- **D3** 流程二复用升级 figma-layer，不新建命令。
- **D4** 单点交接 = **语义识别**，route-guard 只放产品名粗网，不写死交接措辞。
- **D5** FxUI 收窄到**仅品牌色+文字色**，不与 OD 规范冲突。
- **D6** 交互式"注入 OD UI session + 它问你"**技术做不到**（API 不在 UI 露出）→ 用户最终选 **headless 一次性(option ②)**，人工判断后置。
- **D7** OD 不绑具名 design system 时用 agent 通用判断；绑了(designSystemId)才用它的 DESIGN.md（实测 Claude DS 生效：暖纸底/serif/terracotta）。

## 5. 全链路端到端验证 ✅

实测产物：`crm-list-claude` 项目 headless 出 25KB index.html（Claude DS + FxUI 橙，语义色 0，符合收窄口径）→ 经 figma-layer/use_figma 写入 Figma 文件 `BWTRRJ2PdM1T6LmNacnTjv` Page 5(node 7028:48140)，原生 Auto Layout 图层 + FxUI 橙/文字色（root frame 7033:428）。

## 6. 待办 / 下次

- [ ] 框架改动 **未 commit**（用户没要求；要 commit 需先建分支，当前在 main）。
- [ ] figma-layer 实写为**代表性还原**（4/8 卡、无手机壳、统一衬线）；如需逐像素/全卡再补。
- [ ] Phase 4「完整 FxUI 组件库绑定」仍 deferred（需 D4：FxUI 已是 Figma 库）。
- [ ] MCP 工具 `mcp__open-design__*` 重启 session 后才加载；当前 session 走的是 daemon HTTP。
- [ ] 测试残留：OD 项目 crm-mobile-list-test/crm-list-demo/crm-list-claude + /tmp/od* 已在本次收尾清理。

## 7. 恢复指令

1. 读本文件 + `git status`（看未 commit 改动）。
2. `npm run verify` 确认仍绿。
3. 跑 `/open-design`：按 v3.0 SKILL.md（先确保 OD 桌面端开着 → Preamble 探到动态端口）。
