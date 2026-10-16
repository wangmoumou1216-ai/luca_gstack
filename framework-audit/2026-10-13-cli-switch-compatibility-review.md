# Claude Codex Muse CLI 切换与 luca gstack 兼容性评估

评估日期：2026-10-13。对象是当前源码工作树，不是已安装的 luca.app。用户目标是「我可以切 claude codex 和 muse，然后就可以打开他们的 cli」，同时需要了解其他模型能否顺利使用 luca gstack。Grok 是未来扩展比较，不是本期三家切换的交付前置。

**结论：三家原生 CLI 切换可行，现有 PTY 和标签架构可以复用。第一版应围绕选择、新建、启动和生命周期做小范围扩展。Muse 在同一母仓启动后，完整 gstack 能力仍需单独适配和真机验收。** 共享 Skills 与记忆数据有复用基础；当前代码没有第三个受支持的框架运行时。此次交付是评估与实施建议，没有实现、安装或发布。

## 1. 评估范围与证据

App 源码根是 `/Users/luca/Desktop/项目/muse`，基线提交 `3dfea6b09a252e6d6549b60cea23e4fab5daa99e`；实际挂载框架是 `/Users/luca/Desktop/luca_gstack`，基线提交 `807775c5762da07807c1a9fccdca7c4976a4723f`。两处都有既有未提交文件；结论绑定所读文件的当前字节，完整路径、SHA256 与日志见相邻 evidence JSON。历史 `muse/lucagstack` 未被当成实际运行框架。

本轮把证据分成四类：生产函数和隔离运行的实测；当前源码合同；官方文档事实；需要真实 Muse CLI 或模型验证的未知项。文档支持和现有测试通过不能替代第三家模型的真实任务结果。

三个独立视角分别检查桌面启动链、Muse 官方协议、共享框架门禁；再对整份建议进行冷启动反证。它们均使用当前模型，属于独立上下文审查，不是多厂商模型跑分，也不冒称仓库正式 peak quality-gate 已通过。

## 2. 三种能力分开交付

| 层级 | 用户得到什么 | 必需工作 | 可后补的能力 |
|---|---|---|---|
| A 原生终端 | 选 Claude/Codex/Muse，打开相应 TUI，可输入、resize、退出和关闭 | 正确 provider、命令、参数、cwd、环境；新建路由；三家菜单和偏好；未知 ID 拒绝；不支持服务的隔离 | 历史解析、native SID、resume、MCP、自动命名、定时发送、完整 gstack |
| B 桌面增强 | Muse 会话进入历史列表，可恢复，按能力调用 app 工具 | Muse SID 和日志合同、source/profile、解析器、恢复验证、MCP 身份及配置转换 | 自动模型分档、跨 CLI 委派、完整受管 Workflow |
| C 框架运行时 | Muse 能按共享方法工作，并保留承诺的项目隔离、审批和完成证据 | Muse 入口、native 事件证明、项目事务、工具控制、子 agent、实际模型采用、故障与完成门逐项适配 | 未被产品承诺的扩展可以保持未支持 |

A 可以使用 `ptyId` 与稳定 `paneKey` 管理进程，原生 `sessionKey/nativeSessionId` 暂时为空。临时终端不应伪装成可恢复历史会话。隔离未实现的服务属于 A 的正确性工作，实现那些服务属于 B/C。

**切换默认值只影响之后的新会话。** 已有 Claude、Codex、Muse 标签保留自己的运行时；恢复历史会话必须按该历史的 provider 走。不能在现有进程上改一个 provider 字段就声称完成 CLI 切换。[当前新会话语义](/Users/luca/Desktop/项目/muse/app/main.js:116)

## 3. 原生启动链的真实接点

| 接点 | 当前行为及证据 | 本期处理 |
|---|---|---|
| Provider 查询 | `getProvider('muse')` 实测返回 Claude。[实现](/Users/luca/Desktop/项目/muse/app/cli-providers.js:1141) | 新增独立 Muse launcher；显式未知 ID 必须报错。缺偏好可以默认，显式未知选择不能回退 |
| 偏好与菜单 | 设置只接受两家；会话菜单和页签切换有二选一分支。[设置](/Users/luca/Desktop/项目/muse/app/settings-store.js:144)、[菜单](/Users/luca/Desktop/项目/muse/app/renderer/app.js:4431) | 三家选项由同一注册信息生成，保存选择、显示可用状态 |
| 真实新建入口 | 新建按钮走 `createDraftTerminal`；`resolveDraft` 把非 Codex 映射到 `claude:master`，且要求会话 source。[renderer](/Users/luca/Desktop/项目/muse/app/renderer/app.js:485)、[main](/Users/luca/Desktop/项目/muse/app/main.js:2803) | 给仅终端启动提供明确分支，避免为了启动 Muse 伪造 Claude source 或历史 SID |
| PTY 启动 | 现有代码已能以 OS argv 传参数；shell 与直接启动分开。[启动](/Users/luca/Desktop/项目/muse/app/main.js:455) | 复用 PTY，Muse 参数由自己的 adapter 提供。cwd 与 CLI workspace 参数分别核验 |
| SID 认领 | 所有不预置 SID 的 provider 都被交给 Codex 认领器。[认领](/Users/luca/Desktop/项目/muse/app/main.js:517) | 第一版不做 Muse SID 认领时显式禁用；后续用 Muse 原生证据，不能扫 Codex 日志代替 |
| 后台服务 | 会话 parser、活动、命名、浏览器 MCP 和 scheduler 各有两家分支；scheduler 可以针对无 SID 的活 PTY | 未支持时不接入这些服务，尤其不自动发送 TUI 文本或替用户提交选择框。终端启动不自动授予 MCP 调用身份 |

最小修改接点主要是 `cli-providers.js`、`settings-store.js`、`main.js`、`renderer/app.js`、`renderer/index.html`；只有现有协议不能表达仅终端分支时才增加 preload IPC。这是文件接点估计，不是已冻结的工程改动清单。UI 主题与原生终端颜色还需真实 Muse TUI 检查。

不必在 A 把 `session-source/session-index/session-catalog` 全部扩成第三家。保留它们对已实现会话适配器的验证，给新 launcher 一条不依赖历史目录的创建路径，范围更清楚。若 B 同时纳入本期，再补 source/profile、消息解析和 resume 的完整闭环。

## 4. 共享母仓中的框架障碍

| 能力 | 复用基础 | 当前障碍 |
|---|---|---|
| Skill 方法 | Markdown 权威体、schema、质量标准 | 发现文件、执行方法、遵守人工门、完成交接是不同验收。支持 SKILL.md 不等于这些都成功 |
| 记忆读侧 | Python 与 JSONL/YAML 数据，脚本相对仓根 fallback | 可复用数据读取，不等于自动启动加载、项目过滤、提取和晋升生命周期已适配 |
| 根入口 | 通用安全纪律、NO_PIN、稳定 ID | [AGENTS.md](/Users/luca/Desktop/luca_gstack/AGENTS.md:1) 明确是 Codex root adapter；Muse 会优先读它，产生运行时入口歧义 |
| 项目授权 | canonical 项目文件与现有事务原则 | [project-substrate](/Users/luca/Desktop/luca_gstack/.claude/hooks/lib/project-substrate.mjs:663) 与 [event-attestation](/Users/luca/Desktop/luca_gstack/.claude/hooks/lib/event-attestation.mjs:265) 仅接受 Claude/Codex 原生事件。相同 cwd 不产生 pin 或真人执行授权 |
| 模型选路 | anchor/peak/light 的抽象与独立评审原则 | `muse-native` 实测 `REFUSE/UNSUPPORTED_HARNESS`。[resolver](/Users/luca/Desktop/luca_gstack/scripts/model-route.mjs:35) 显式换模型和自动档位路由需分别验证 |
| 工作流执行 | 阶段、输入和 handoff 合同 | [.codex/workflow-runner.mjs](/Users/luca/Desktop/luca_gstack/.codex/workflow-runner.mjs:445) 固定启动 Codex app-server，不会因 UI 选择 Muse 自动改变 |
| Hook 强制面 | guard 内的规则与部分输出格式 | 必须适配原生工具名、payload、env、异常、超限和真实控制结果；不能只验证返回 JSON 合法 |

设置 `LUCA_ACTUAL_HARNESS=muse` 不能完成适配：当前 [harness 检测](/Users/luca/Desktop/luca_gstack/.claude/hooks/lib/harness.mjs:35) 仍返回 unknown；unknown 的静态能力表却仍把多项能力写成 true。不能把该声明当作部署证明。直接套用 Codex adapter 也会注入 Codex 身份，并沿 Codex 参数和日志解释事件。

启动 Muse 时应只处理它的子进程环境，避免继承另一家的身份标记导致误分类；不能全局删除或覆盖其他 CLI 的用户配置。真正的项目权限仍需要原生事件验证，环境变量或启动器选择只能用于路由与展示。

当前材料可以作为共享方法来源。若产品承诺“在母仓打开 Muse 就能按 gstack 工作”，应把根入口改成共享内核加运行时专属入口，或提供经实际验证的 Muse 入口选择机制。保留一份 Skill 权威体，避免复制三套内容。未经适配的项目事务、子会话关联、模型证据和受管 DONE 应明确拒绝或标为未支持；提示词约束不能被描述为已经强制执行的工具边界。

## 5. Muse 官方合同与版本限制

Muse 的原生交互命令是 `muse`；恢复交互会话用 `muse resume <uuid>`。它支持 `--workspace`，但文档没有保证该参数改变 OS cwd，因此 Electron 的 spawn cwd 仍需明确。SDK 的 `session/start.sessionId` 不能直接当作 TUI 支持预置 SID 的证据。[手册](https://dev.meta.ai/docs/muse-code)、[配置](https://dev.meta.ai/docs/muse-code/configuration)、[恢复](https://dev.meta.ai/docs/muse-code/extending)

每层规则优先顺序是 AGENTS、CLAUDE、`.agents/AGENTS`、`.claude/CLAUDE`，该层首个文件胜出。当前没找到可依赖的 CLI instruction-root override；追加 prompt 或 hook 上下文不等于禁读根 AGENTS。Skills 项目目录发现有官方支持，但现有软链布局的遍历、去重和边界仍需实际验证。[规则配置](https://dev.meta.ai/docs/muse-code/configuration)、[Skills 1.4 文档](https://meta-models.github.io/muse-code-sdk/1.4/guides/extend/skills/)

Muse 官方 hook 发现来源是 managed、Muse settings、`.muse/hooks.json`，没有自动加载现有 `.claude/settings.json` 或 `.codex/hooks.json` 的承诺。它可以注入 context、拒绝工具输入、改写输入和请求 Stop 续跑；自定义 LUCA 环境变量不会普遍继承。超时、异常输出等可能继续会话，Stop 续跑默认有八次上限。适配器可把受控错误转成显式拒绝，但 handler 根本没运行或超时仍需另验。[Hooks 1.4](https://meta-models.github.io/muse-code-sdk/1.4/guides/extend/hooks/)、[事件合同](https://meta-models.github.io/muse-code-sdk/1.4/guides/plugins/reference/hook-events/)

公开日志 cookbook 的示例不能证明当前 CLI 的固定事件 schema。未来项目授权验证必须识别真实用户事件、会话与工作目录，区分 SDK 生成的 userMessage、后台事件和用户输入；仅有 role=user 不足以证明真人授权。[会话审计](https://dev.meta.ai/docs/cookbook/audit-agent-sessions)

本轮 `/latest/` 指向 `/1.4/`；网页、GitHub schema 快照及 SDK 包版本各有自己的身份，不能互换成 CLI 安装版本。部分 1.4 页面仍注明 1.3.0 实测基线。MCP 默认 required/optional 和插值范围在官方手册与扩展页之间存在冲突；关键 server 应显式配置并验证，不能依赖默认值。这不阻塞无 MCP 的原生 launcher，但阻塞对应增强能力的支持声明。[1.4 首页](https://meta-models.github.io/muse-code-sdk/1.4/)、[MCP 1.4](https://meta-models.github.io/muse-code-sdk/1.4/guides/extend/mcp-servers/)

## 6. 建议的实现顺序

**第一步交付三家原生终端切换。** 复用当前 PTY 和标签，扩大新会话 launcher 的选择；修真实新建链、显式未知 provider 回退、错误 SID 认领和未支持服务入口。登录由各原生 CLI 承担，App 准确提示是否找到二进制，不用为 launcher 建立新账号系统。

**第二步补 Muse 的已选能力。** 若主要用 gstack，先做 Muse 入口和共享 Skills 可达性，再把所需的项目门、记忆与交接补成可验证合同。若先需要历史/恢复，就先做可靠 native SID 和 transcript adapter。两者可独立排期；完整框架不能靠通用 parser 或变量伪装得到。

注册表应明确区分 `terminal`、`history`、`resume`、`activity`、`browserMcp`、`scheduler` 和 framework 支持状态。注册信息驱动菜单与服务选择；未经实现的能力默认不提供。用小接口隐藏每家差异即可，A 无需将 TUI 改成统一聊天引擎，也无需先迁移到 MSP/ACP。

通过现有 CLI 换 Meta 模型可以作为模型行为测试的一条路径，但不能替代用户明确要的 Muse CLI 选项。未来 Grok 复用 launcher 接口，再逐项适配；其被动 hooks 与 Stop 能力差异需要独立补偿，不纳入本期必需。[Meta coding-agent 接入](https://dev.meta.ai/docs/coding-agents)、[Grok Hooks](https://docs.x.ai/build/features/hooks)

## 7. 验收矩阵

| 验收对象 | 必需正例 | 必需反例 | 支持声明边界 |
|---|---|---|---|
| 三家选择与并存 | 三个新终端命令正确，切默认不影响已开进程 | 未知 ID、缺 binary、启动失败 | 只能证明 launcher |
| 启动与生命周期 | 完整 argv、cwd、输入输出、resize、退出、关闭；真实 Muse TUI 显示正常 | 空格/引号/长参数、慢 shell、早退出 | 假 CLI 通过不能证明原生 TUI/登录 |
| 服务隔离 | Muse 无 SID 时仍可操作终端 | Codex 误认领、错误 provider 事件、自动命名/发送、越权 MCP | 不产生伪造历史与调用身份 |
| Muse 规则与 Skills | 信任后读取正确入口、发现现有 softlink Skills、按完整合同做任务 | 读错 root adapter、漏读方法、替用户默认决策 | 不等于完整项目门和 Workflow |
| 项目与 hook | 原生 startup/user/tool/Stop 路径有可信证据，拒绝越界 | 假用户事件、错 cwd/SID、child 漂移、hook 未运行/超时/超限、续跑达上限 | 硬门需要 host 实际控制结果 |
| 恢复与完成 | 正确 family 的 SID 恢复，产物、交接与采用证据一致 | 跨 family resume、空日志、合成事件、旧成功票 | 只有完整原生证明才可宣称对应能力 |
| 模型行为 | 用同一中文任务验证资料忠实性、路由、人工门和多步交接 | 缺资料编造、越过门、遗漏约束、伪造子 agent 成功 | 未实际运行模型前，质量仍未知 |

模型行为试跑应在隔离目录先做少量任务，关键用例重复后再扩大；不要先设一个没有样本依据的兼容率或总分。App 支持某个 CLI 和该模型能稳定完成长任务是两个独立问题。

## 8. 本轮实际验证与未决项

- 19 条生产公共函数观察：包含 Claude/Codex 正对照，以及 Muse/Grok/拼错 ID 的错误映射、设置拒绝、source/resume/进程验证拒绝、第三 harness 模型路由拒绝和静态能力声明。
- 终端登录 shell、session source、settings store 测试合计 **29/29**，没有跳过；其中真实 node-pty 配惰性 Node CLI 验证完整长参数、慢登录和 CLI 退出后可用 shell。
- 框架 harness 测试 **21/21**。已有两家测试及 unknown 兜底是当前行为证据，不是第三家支持证据。
- 临时副本把 argv 转发从 `"$@"` 改为 `"$1"`，现有行为测试因收不到完整参数而失败，原生产源码未改。这证明该测试能检出实际丢参，不能扩张为整个测试矩阵都做了 mutation。
- 审查所冻结的 16 个关键源文件在探针和测试后 SHA256 无漂移；评估的 raw 证据和官方摘录身份见 evidence JSON。

未决项：实际 Muse 二进制版本与 TUI、登录、软链发现、workspace/cwd、native SID/日志、工具参数、hook 控制和故障分区，以及真实模型的指令遵循表现。本轮没有安装 CLI、调用模型、读取凭据、修改用户配置或启动安装版 App。

## 9. 会审收敛

桌面架构视角认为，最低交付可以是一条诚实的仅终端新建路径，完整会话源不应成为所有 launcher 的前置。框架视角认为，共用 cwd 与共享方法可行，但当前原生门禁不能迁移为第三家已支持。协议视角确认 Muse 有所需的大部分接口，同时保留根规则优先级、hooks 环境和版本差异的条件。

据此修正初轮宽泛判断：**新增 CLI 并不必然要求本期重写整个历史/会话层；本期必需的是正确启动路径和未支持功能隔离。** 若要承诺“打开即可完整用 gstack”，则必须把 Muse 入口和相应原生运行时验收加入交付范围。尚未完成的真机验证保持未知，不用专家意见替代。

独立冷启动反证结果：待附加最终审查裁决。
