---
name: claude-design
preamble-tier: 3
description: |
  Claude Design 独立适配器：冻结 Packet → Luca app 专用 Design 上传/预填 → 用户手动生成与迭代
  → 用户正式导出 HTML、Agent 精确本地回收 → 独立验收与交付。支持新界面、原模板植入、视觉精修；
  stage 零发送，缺可信宿主停门，不能用 OD 收据冒充 CD provenance。(luca_gstack)
allowed-tools: [Read, Write, Bash, AskUserQuestion]
context-cost:
  runtime-estimate: 9000
  recommended-model: core-execution
---

## Preamble

```bash
python3 .claude/observability/scripts/get_rules.py claude-design "*"
```

## 0. 输入、选择与能力

按 office、当前 input-mode 和 design-output 的冻结选择合同读取精确材料。
直接 `/claude-design` 或 `$claude-design` 是工具选择，已有有效选择不重问。
chain 消费完整冻结 Packet、Brief 来源/位置/状态/AC/保持边界与附件；成熟需求/HTML 回 Brief
归一化。recover 消费冻结交接和用户选定的准确 HTML，跳过重新编译、选型与生成。
硬绑定 OD 的冻结包不得静默改正文或抹来源，回 Brief 重冻；工具未选用 hash-bound sidecar。

材料交接使用专用 Muse host 能力 `claude_design_stage`、`claude_design_status`；
真实已 STAGED 的交接用 `claude_design_recover` 确认本地收据并释放自己的 lease。
调用前核当下实际能力、挂载源码和参数合同，源码/fixture 不证明安装版或全链完成。
stage 只接准确 manifest path + SHA，绑定 handoff、Packet、附件版本与已确认范围；
真实 session 来自 host 可信 caller/token，工具参数不能指定 session、授权或 WebView。
外部 Codex 缺 Muse caller 时仅上传预填/host 查询与收尾为 NEEDS_CONTEXT，不借 token/Chrome。
用户下载后的本地导入使用 `scripts/claude-design-recover.mjs`，不依赖 Muse caller。
旧 exploratory 材料只有诚实的 local binding 时不补造 host STAGED，也不确认其他 row。
Claude/Codex 分别取得真实运行证据后才报告相应能力。

## 1. 冻结材料与原件准备

Packet 是唯一需求事实，完整原文及全部 D/STATE/AC/KEEP 分母不可缩减。
实际附件 bytes、MIME、purpose、source_ids、hash 进入 immutable manifest；本机路径不是上传。
用户采纳的 Mobbin 设计参考图（`interaction-reference`）只作结构与交互参考，不覆盖 D/STATE/AC、用户描述与设计系统。
设计系统由用户在目标工具配置，原型/模板不是隐含视觉授权。
有模板先完整读取 page-context 的中立模板/采用合同；有效模板/位置选择继承，最终 binding、
TAC、原件及完整 bundle 的真实采用与传输授权分别核依据。CD 使用自身收据和执行合同，
不得调用 OD 的 stage/run/recover 授权包装或伪造 OD_RUN；OD original_copy HEADLESS_ONLY 保持。

原件路径必须保留原 HTML/CSS/脚本/资源/隐藏状态；只支持已验证运输/保真的完整形式。
组合植入前 framework owner 从已确认行为提取、准备组合行为代码，经过独立代码审查与隔离
行为验证后冻结 exact bytes/hash/位置/顺序及适用 D/STATE/AC。缺审查、行为冻结或实际资源
就 BLOCKED，不让 CD 临场重写业务行为。CD 只能按指定位置/顺序/字节植入；视觉精修保留原行为。
中立纯校验可以复用，CD transport/人工生成/回收 provenance 独立。

## 1.5 共用参数策略

先读取 `scripts/design-execution-defaults.mjs` 实现，再调用 `resolveDesignExecutionDefaults`，传已核
`selectedTool=claude-design`、topic/handoffId、真实已有 target、冻结 platform/fidelity 与同工具
designSystem 确认。已选工具由 design-output owner 处理，本 helper 不再创建选择状态。
已有目标使用 `target={tool:'claude-design',workspaceId:<实际 host 返回 ID>,...当前 artifact/revision}`；
不能直接传缺 tool 的 host 对象或 OD transport target。
参数已有确认直接继承；缺平台/保真采用 responsive-web/high，真实设计冲突回 Brief。
仅设计系统未确认时询问“沿用 CD 当前设计系统，还是指定另一套？”并等真实回答；
OD 的 DS 确认不自动迁移。新任务自动产生 name 显示名，workspace/artifact/revision 必须由
host 实际返回，不能用名字猜 ID，也不覆盖已有草稿。已有准确绑定直接继承；recover 不命名、
不创建、不再询问 DS。纯本地导入不调用依赖远端 target 的命名分支；
真实 host 收尾仍核准确 row/材料/已存 target 与当前 owner，不要求用户填写机器 ID/hash。
CD generationMode 固定 manual；默认参数不授予外部效果权限。传输授权已有真实同包/hash/
范围依据时直接复用，不重复询问；缺依据只停受影响动作。stage 预填后发送次数仍为零。
生成前读取 `scripts/claude-design-handoff.mjs`，将已核 designSystem、designSystemRef 与
实际 designSystemAssets 交给 `buildClaudeDesignHandoff`；真人来源由 authenticateDesignSystem 核准。
v2 把规范与确认来源写入实际材料、inventory、manifest 和生成指令。缺确认/OD 跨工具确认
停门；legacy v1 只能标记未登记规范，不改旧 Packet/材料或倒填已上传。

## 2. 专用 stage（零发送）

仅在当前可信 session、guest、Design workspace、handoff、包和附件版本全部绑定时上传并预填。
同面板唯一 lease，其他会话 busy；只复用未绑定的空 Design。有内容时仅按已授权新任务新建，
绝不覆盖草稿。实际核 Design 模式，URL `/chat` 不能证明模式；登录、普通聊天、切页或页面漂移
暂停并保存结果。沿用 generic claude.ai sensitive guard，没有任意 JS/selector/URL 或其他聊天/凭据读取口。
实际上传完整附件并核正文、附件名/数量/大小/接受状态；不得声称远端逐字节读回。
stage 的发送次数必须为零，不点击发送、不按 Enter 触发发送。成功仅 STAGED，用户自己生成和迭代。
调用未知结果先用 exact status 核已完成效果与终态，不盲重试、不重建任务、不重放上传。
仅 host 明确证明 locating、无绑定/上传/预填/回收、无进行中动作时，才可显式
`claude_design_abandon` 保留失败和原 owner、持久化退休后释放 lease；它不接触网页或材料。
普通工具 ownership 不变；仅此本地入口允许重启后同 canonical 原生 key 且同 browser workspace。
旧记录缺存储历史时，先鉴权返回 `RECONCILIATION_REQUIRED` 与精确 snapshot digest，不写入；
明确确认该 UNKNOWN 历史后带 digest 与 `acknowledgeLegacyHistoryUnknown=true` 再提交。
存储未知与远端派发未知分开：后者或部分效果一律拒绝；落盘失败保留 lease/失败记录。
启动见 COMMITTED 也须重新 durable 确认；PENDING 等原 owner 显式续接。旧 ID 永不重放，
页面就绪后另行显式创建新交接。该退休不等于生成、回收或设计完成。


## 3. “拉回来”：用户下载，Agent 精确回收

共同操作顺序：选工具 → 确认该工具设计规范 → 材料就位 → 用户生成/迭代 → 回收验收。
CD 由用户在同一件作品正式 Export HTML，下载后说“可以回收了”或“拉回来”。
继承有效工具/规范/模板确认；准确路径和作品归属已确认不重问。未给路径时只在授权范围
找候选并请用户选准，不从 filename、mtime、最近文件自动采用，不要求用户填 hash/UUID。
回收用户正式导出的单个 HTML，或官方 HTML 导出 ZIP 中的准确 HTML 入口与完整依赖。
先只读列出 ZIP 成员，核用户对准确下载包的采用；唯一 HTML 可机械定位，多入口须请用户选准。
由 `scripts/claude-design-export-archive.mjs` 校验已支持的官方包结构，再用回收 API 隔离保存；
路径逃逸、符号链接、重名、损坏、超限或未支持的 ZIP 结构停止，不以通用解压命令兜底。
资源检查共用纯 owner `scripts/material-dependencies.mjs`，每次回收和消费都检查完整成员与依赖。
已识别的 DC 导出只有已审运行库字节、顺序和受限模板/业务语法可进入专用检查；未知版本或
不支持语法直接拒绝，不回落通用检查。通用材料保留原严格分析，预算耗尽不是成功。

先完整读取 `scripts/claude-design-recover.mjs`。已有 stage manifest 直接继承；旧实际材料缺
host stage 时 `createClaudeDesignManualBinding` 绑定真实 Packet/全部材料/原指令/观察目标，
明确 hostStageVerified=false，不补造新的 DS、上传或生成记录。
`recoverClaudeDesignDownload` 接准确 requestId/manifestRef/handoffId/downloadRef/selectionRef/
directory；ZIP 另绑定已选 `exportEntryPath`。Agent 计算 refs，caller 的 authenticateSelection
核真实人选下载包、包内入口与成员集合、作品及范围来源，
authorizeRead 在每个依赖读取前核当前许可。文本 actor=user、可读 JSON 或 hash 不证明采用。
单 HTML 保留原件，独占落点写 immutable index.html/recovery.json；ZIP 保留原包与全部成员的
原字节、文件名和相对路径，入口绑定实际包内 HTML，不内联或重写其业务代码。
同次重试继承 Agent 保存的 existingReceiptRef，不重下、不覆盖未知输出。
`verifyClaudeDesignRecovery` 重验完整材料和原件；ZIP 另重验原包、保留包及全部成员，资源缺失、
新增或漂移拒绝。完整包回收不等于原 Packet 的单文件内嵌要求通过，独立语义验收仍按全部来源判断。
source=claude-design、provenance=manual-download，artifact assurance=user-attested，
revisionKind=export-content、remoteRevisionVerified=false；不宣称服务器版本或原生下载事件证明。
不执行脚本、不安装依赖、不重做 CD 输出；漂移/损坏保留证据并停止依赖后继。

本次确有可信 host STAGED row 时，以 handoffId/requestId/receiptPath/receiptSha256 调用
`claude_design_recover`，同 owner 核本 row 材料后 durable 确认并释放本 lease；无 Export/网页操作。
主机仅核本地完整性，不独立认证真人或标记设计完成。缺模块/身份不借其他会话或自动导出兜底。

原件回收必须 actual HTML + implementation-manifest；清单不算证明，实际核局部修改、保持区、
原脚本/样式/资源以及冻结行为代码完整字节/位置/顺序。PENDING_FIDELITY 不等于通过；
缺实际保真核验停门，不降为截图或 reference_only。

## 4. 语义验收、加工与交付

source=claude-design；raw、用户下载/回收收据、prototype-spec 和原分母全部保留。
交付 helper 的 base.origin=claude-design、recovery_ref=typed receipt，source 绑定同一 Packet。
按 prototype-delivery owner 在当前读许可内调用 bindBase/prepareCopy/checkCandidate，独立
PREACCEPT 后 sealAccepted；每次消费传 authenticateClaudeDesignSelection，核已确认真人来源
而不重问。原件另传已实际核保真的 verifyClaudeDesignFidelity；不得用常量 true 伪造证明。
accepted motion→notes 使用 deriveFromAccepted 绑定父 final，仍重验同一 raw 收据和采用依据；
不调用 OD 专用授权包装。CLI 缺上述真实 API 上下文时 NEEDS_CONTEXT，不走 raw/旧证书兜底。
独立浏览器验全部原 D/STATE/AC/KEEP；机械 PASS、用户生成报告和下载均不等于 DONE。
未通过项只修这些项并复测，至多两轮（同 design-output），仍未过的列为剩余项交用户。
支持的 DC 运行库额外冻结 `RUNTIME:DC_EXPORT_V1`：独立核真实顶层环境、本地运行库加载、
自重取请求/响应的同入口字节、无重定向/外部请求与配置覆写。缺该项或 FAIL/UNKNOWN 不 seal；
运行库 hash 只标识审过版本，不能代替环境证明。不注入配置或改 raw 来跳过自重取。
有已授权 motion 时按 motion-polish 的 internal 合同在同一未完成父 Phase 内处理；
交互 HTML 按 prototype-notes 合同继承/等待精确当前业务版本真人确认，再执行适用 notes。
缺真实 processor/独立 review seam 时 BLOCKED，不能借 OD caller 伪造 CD 完成。
独立 PREACCEPT、当前 Human Gate、exact final resolution 全通过才交付；required FAIL/UNKNOWN
保持未完成，失败不能回退 raw/旧 final 掩盖。完整引用以 prototype-delivery runtime 为权威，
在消费前完整读取；下游 tech-spec/task-plan/compile 必须重新 resolve exact final_artifact_ref，
仍要求实际 PRD 工程来源，不将 design_source 冒充工程 ready。

## 5. 单次完成

写实际 `docs/prototype/YYYY-MM-DD-<topic>/index.html` 与 `prototype-spec.md`（原始回收）；仅下游=开发时，按
`.claude/skills/office/references/dev-handoff-dimensions.md` 从已回收 HTML 事后补“开发交接补全”，另存为独立文件，不覆盖 raw 回收的 prototype-spec 及其 SHA（与 open-design 同口径，不改产出）。
有 processor 则交已 resolve 的 exact final entry/spec，保留 raw 来源，不按 latest 猜。
handoff=`docs/handoff/YYYY-MM-DD-<topic>-claude-design-handoff.md`，按共享 handoff-protocol
完整核验；含 source=claude-design、Packet/selection/manifest path+SHA、真实 host/handoff/
workspace/artifact/revision（缺 host/远端版本时如实标记边界）、download/recovery receipts、
用户采用来源、manual provenance/保真检查、完整分母、独立票及 final refs。
受管 workflow 保持 `nodes.claude-design` IN_PROGRESS，completion_owner=Orchestrator；
回交原输出字段、当前身份和提交请求，经独立质量/记录/当前人类门后仅由 Orchestrator 一次提交。
不创建 design-output DONE、不重开历史 OD 节点。standalone 无节点不写 state。
缺能力 NEEDS_CONTEXT，证据失败 BLOCKED；EXPORTED/STAGED/下载/机械验收绝不提前完成。

<!-- FILE_END: claude-design/SKILL.md -->
