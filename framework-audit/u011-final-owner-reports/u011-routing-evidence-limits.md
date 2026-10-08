# U011 路由模块：九文件候选、保护用途与采用建议（J18 后更新）

**DONE_WITH_CONCERNS，仅指本次建议更新。** 建议将下列九文件作为一个完整候选交给主协调继续集成和行为验收：显式适用方法直接读权威正文；有界任务减少无关启动读，同时保留动作/内容引用前的必要 owner；STOP 按实际宿主指向入口，未知宿主先确认。候选开发和原始程序回归已完成，J18 对最终修复及联合消费者兼容作出静态 PASS 4/4，关闭 F3/F4。它们不等于生产采用、全部用途实测通过或 B/S 净收益成立。本模块仍承担后续具体验收 finding 的修复责任。

旧版 N01 的完整原字节已保存在 [历史快照](/Users/luca/Desktop/luca_gstack/framework-audit/u011-routing-evidence-limits-history-pre-J18-e276a1ac7c82.md)，SHA-256 `e276a1ac7c82ecb1aee013e28f056622fdb31ea967e98b35922e584038ae7ef2`。旧文的 NO_IMPLEMENTATION、J05 时点余额和“当前无可交候选”已过时；它们留作历史，不再作为当前阻断。原失败和证据限制继续有效，不将历史意见覆盖为成功。

## 1. 当前事实及结论边界

开发工作树是 `/Users/luca/.codex/worktrees/8812/luca_gstack`，共同 HEAD 为 `05120197073144c0f46b6fb30a192733d529cc4f`；框架维护为 NO_PIN。生产框架与集成工作树没有由本模块写入、提交或推送。本次只更新本报告并保存旧版，不改源文件。

最终九文件、前像和实际命令记录见 [J17 模块收件包](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/j17/review-package.json)，包 SHA-256 `39f972e82443c6c1a6bc27eead692d43f336e1f1088ca1930f0a46d159350c6d`。较早的 [U012 开发交付](/Users/luca/Desktop/luca_gstack/framework-audit/u012-routing-module-delivery.md) 提供实现与原始日志链接，其“等待 UNKNOWN 独立复核”等状态由本报告的 J18 结论更新。

主协调提供的 [r4 冻结清单](/Users/luca/Desktop/luca_gstack/framework-audit/u012-joint-review-r4-final-repairs/manifest.json) 中 route-guard 与其测试的最终 hash，与本模块工作树及测试快照一致。[J18 主协调裁决摘要](/Users/luca/Desktop/luca_gstack/framework-audit/u012-joint-review-r4-final-repairs/root-adjudication.json) 明示 PASS 4/4、关闭 F3/F4，范围仅为静态最终修复和联合消费者兼容；原票在主协调的原生审查记录，本报告未冒充重跑或独立签票，也不将四项扩大为九文件逐项模型验收。

**已证明**的是明确的入口/消费者修复、跨层约束回归与 hook 实际程序输出。**预期**是减少重复发现和无关启动读，使 STOP 提示符合宿主。**尚未知**的是模型实际选路、正文消费、返工/等待、token/金额差、长期维护和迁移成本。P08 仍 INVALID，能力探针 **8/8 已用尽**；本模块没有合格的 B/S 配对净收益证据，不新增模型/探针，不借用主协调 N-A/N-D 模型测试作路由证据。Claude、SDK、app-server、托管 API 与桌面/CLI 的实际运行分别需要对应证据，不能互代。

## 2. 实际改动、原生最小替代与框架增量

| 实际改动及原用途 | 原生最小替代 | 本候选的框架增量与保留控制原因 | 已证结果、预期收益和未知成本 |
|---|---|---|---|
| 明确选中且适用的方法不重复整本 catalog 发现（USE-02/04/08） | 理解完整请求，读被选方法的权威正文，缺口必要时澄清。 | K2/K4/K10、manifest、kernel、index 共同区分已选方法与真实发现。正文至 EOF、准确 skill/authority、未决选择的真人回答继续保留，避免把点名当成无条件适用或执行授权。 | checker 拒绝 coherent manifest/index 回退及入口矛盾，原回归通过。减少重复读只是预期；模型是否跳过、选错率、节省资源尚无配对实测。 |
| 有界且无关任务跳过其他启动读，同时可达必要动作 owner（USE-08，交叉 USE-01/10） | 对当前任务只读必要指令与事实，在操作前核实对应权限和能力。 | K2 在 app/content 引用或工具动作前进入 K10 step 3；按语义条件发现并在 load_before 前读 owner 至 EOF。索引缺失/不可读/过期仍完整读 manifest 回退。J15 的“当前页是什么”反例说明仅“给定 owner + 通用权限”不足以发现 luca-app。 | 原漏读入口已修，root/kernel 闭合经 J17 转达；120 mutations 和当前页候选测试提供结构证据。部分有界工具任务增加索引读取成本；不能称所有简单任务更便宜，实际 owner 消费仍待验。 |
| STOP 消费者按宿主引用入口，UNKNOWN 先确认（USE-02/10/11） | 依据真实宿主读当前入口；不明时取得必要事实，再处理未决意图。 | 复用 actualHarness()，Codex 引用 AGENTS K2/K4，Claude 引用 CLAUDE K2/K4；其他值提示当前入口未确定，不指派两者。保留 STOP 不授执行权、候选证据、Plan 和真人选择。 | 真实 hook 子进程的已知宿主各三类、UNKNOWN 两类输出及完整 257 项回归通过；J18 关闭相关最终修复/证据对应 finding。没有宿主 launch 或模型实测；helper 身份与真实注入是否一致仍有部署风险。 |
| 同步契约及增加防倒退检查（USE-06/07/08） | 保存明确规则、检查具体改动，核实实际输出与退出。 | 既有 manifest/kernel/index/checker 增加消费位置、条件及时点的一致性检查；保留原 107 mutations，增至 120；route 测试直接启动实际 hook。没有新分类器、加载器、协议或宿主适配层。 | 原 checker 曾接受一致地写错的 manifest/index；新反例拒绝该回退。测试证明受覆盖的结构/输出，无法概括任意自然语言或所有模型行为。新增规则和 fixtures 有维护成本，频率、总人时与金额未知。 |

K3 五个真实 Plan 条件、Project Gate、K6/K7 权限和 Human Gate 未删；九个路由近似信号仍不能充当五个真条件的等价证明。standalone 默认、用户已选 workflow 的输入/交接、领域方法与既有失败停止仍有效。原生工具与正常授权绝对路径不因这次精简被剥夺；旧 read-grants broker、已停用项目 hooks 不被重新激活。

## 3. 原十四项保护用途：分母不变

原 USE-01—USE-14 均保留；本表不是十四次真实任务通过。来源编号沿用旧版已读证据：A＝u006-routing-use-evidence（S01—S23/G01—G06），U2＝u002-baseline-and-protected-uses，M6＝u006-current-use-evidence。精确旧文件指纹仍在历史快照。本次不重读其他 owner 输出，不以未再实测为由判原用途无价值。

| 原用途及责任 | 原用处和既有依据 | 当前建议、保留证据与未证边界 |
|---|---|---|
| USE-01 任务/项目边界；路由入口，身份与 Context owner 主状态 | AGENTS K1/K5、project-session；A S08/S20/S22、G04，M6 USE01。 | **保留既有机制**：可信 pin/child 关联、授权撤销与正常受控绝对路径读；不从 docs/cwd 猜权。K1/K5 在候选中未变。原生文件权限仅部分替代，真实 pin/切换/跨读仍须身份 owner 验收；不启用禁用 broker。 |
| USE-02 请求理解、显式方法、隐式选择/澄清；路由主责 | K2/K4、routing-map/chain；A S14—16、G01/G02，旧版技能发现证据。 | **采用候选进入行为验收**：显式且适用方法直接读 authority，发现/未决/STOP 保留 catalog 与真人选择；STOP 修正宿主引用。结构和 hook 输出已证，元数据发现不等于正确选择、完整交付或净收益。 |
| USE-03 五真 Plan 升级；路由识别，编排管计划/批准，Context 存范围 | K3、plan-agent；A S05/S15、G01，M6 USE03。 | **保留既有机制**：真条件、真实批准、依赖/不可逆/关键失败停止。K3 字节不变，程序 Plan 提醒保留；九近似信号不替代真判定，不为触发新增 Agent。首次效果前是否消费实际批准仍待行为验收。 |
| USE-04 standalone/所选 workflow；路由选模式，编排和领域 owner 管交接 | workflow-mode、office、K2/K10；A S11/S13/S16。 | **保留既有机制并使用明确方法入口**：默认 standalone，已选流程按合法输入与 owner 合同继续，缺失/过期视图原回退。候选不实现新 backend 或领域流程；完整 workflow/领域端到端仍由对应 owner 验收。 |
| USE-05 独立并行/强依赖有序；编排主责 | orchestrator §2.2/2.3、evidence-receipts；U2/M6。 | **保留既有机制**：分工、依赖与结果回收，不从 MULTI 命中推导并行；终态与失败由编排负责。路由不扩大派发授权；原生父子回收/取消及同预算收益未由本候选证明。 |
| USE-06 独立验证/真实完成；编排/QG 主责，路由交正确对象 | plan-agent 退出合同、quality-gate；A S05/S06/S19。 | **保留并消费真实审查**：J15/J17 finding 已定向修复，J18 为真实非作者静态接受。非零/缺片仍不可算成功；J18 不代模型产物质量或整用途验收。J05 driver findings 是当时历史结论，不冒充当前未修缺陷。 |
| USE-07 当前实例/来源/真实退出；三模块交叉 | evidence-receipts、project-verification；A S06/S07，既有 J05/R3。 | **保留并补最终对象绑定**：九文件 hash、argv/cwd/exit/raw logs、前像、原失败与 cleanup 证据相连；两文件与 r4 冻结一致。hash/validator 不能证明模型读了正文或所有实际工具边界；原 required 分母不减少。 |
| USE-08 及时足量规则/事实；Context 主供给，路由消费 | K10、index/manifest；A S03/S11/S15，M6/W18。 | **采用有界入口候选进入行为验收**：跳过不相关全启动，动作/引用前仍通过 index 找 owner、按时完整读，失效 index 回退。J15 修复和跨层 mutations 已证；实际消费/干扰/效率仍未知。不能用词提示或目录替代语义条件。 |
| USE-09 更正/授权/证据连续；Context/编排主完整恢复 | long-session、orchestrator；A S09/S15、G03，M6 USE09。 | **保留既有机制**：检查点、最新有效决定、失败续点和恢复责任。本模块未改该 owner；提醒 SATISFIED 不作任务 DONE。真实 compact、原生父子恢复和收益未由本候选证明，不借公共 fresh fixture 冒充。 |
| USE-10 人类决定、合理继续/必要停止；各效果 owner 管权限 | K6/K7、project-session；A S01/S08/S16，M6。 | **保留并修 STOP 消费者**：真实回答、既有授权继承、撤销优先；UNKNOWN 先确认入口，STOP 仍无执行权。K6/K7 未变，程序提示已验；完整线程/工具效果授权仍需实际边界证据，不一律停也不伪造选择。 |
| USE-11 模型/能力真相；编排/F 主责，路由消费限制 | model-routing/cross-harness；A S10/S12/S21、G05。 | **保留既有机制**：不把 capabilities=true 或配置回显当服务端采用，不偷降档或混算模型收益。已知/未知宿主提示输出已证，helper 与两类 adapter 仅源码接线检查；没有 Claude/API 验证或自动宿主接入证明。 |
| USE-12 稳定记忆/临时信息；Context/memory 主责 | K8/CONTEXT/extraction-bar；A S01/S02，M6/W18。 | **保留既有机制**：summary/search、默认不写、候选晋升门及 inline fallback；K8/Static Fallback 未变。session-restore 仍在请求前自动注入摘要，源码未改，不能宣称所有启动成本消失；无治理写或私人历史复制。 |
| USE-13 准确消费已验收交付；prototype 领域主交付身份，三模块交叉 | prototype-delivery/exact final；A S18/S19、G06，M6 USE13。 | **保留既有机制**：accepted ref/hash/required IDs，原失败与重验，latest/raw 不代 final。领域 owner 未改；真实 consumer/PREACCEPT/final 链仍需领域验收，通用 hash 测试不补资格。 |
| USE-14 原样/复制/改进分支；路由选支，领域方法和编排衔接 | prototype caller branches、motion routing；A S14/S16/S18/S19，M6。 | **保留既有机制**：adequate-original/adequate-copy/enhanced-copy，各自授权与平台/设计 Human Gate；D04 完整 copy tokens 不缩项。无 OD/motion 重构或新平台默认；真实三支交付质量仍未知。 |

## 4. 最终九文件：必要行为验收与迁移风险

以下 hash 于本次更新重新核对，与 J17 final_files 一致。每项“需验”指实际消费者行为，程序检查不能自动补齐；本模块此次不重跑绿测试或开启耗尽的探针。九项共同构成一个候选，禁止只换根文字或只换生成视图。

| 文件 / SHA-256 | 现有证据与仍需的行为验收 | 迁移风险及控制 |
|---|---|---|
| [AGENTS.md](/Users/luca/.codex/worktrees/8812/luca_gstack/AGENTS.md)；`86581149518b00445a8e4abc5e3bb701b5b2f88d19a97379054cdbe59c6a1d1f` | 仅 K2/K4/K10 改，其他段及 Static Fallback 原字节保留，11242 B 未超 11 KiB。需验：有界无关文本、动作/引用、显式适用方法、真实发现/歧义各走正确路径；五真 Plan、项目和真人门均继续消费。 | 过宽“无关/有界/适用”解释会漏 owner 或误免 gate。以 J15 当前页反例及有/无 Plan/项目事实区分；不将所有简单任务固定免启动。 |
| [agent-context-manifest.json](/Users/luca/.codex/worktrees/8812/luca_gstack/.claude/skill-os/agent-context-manifest.json)；`16f0d4aad8ca4dfabc278094db90a2e57b1b8b716a185ec7b50ac01995d586eb` | per-harness catalog 条件/时点及 luca-app K2 关联通过一致性检查。需验：Codex 已选方法不重复发现，未决选择仍发现；当前页 owner 在回答引用前消费。 | Codex 精简误传给 Claude 或时点推迟。保留各宿主不同条款及 app 原回答前 deadline；共享 metadata 与入口同批更新。 |
| [agent-root-kernel.json](/Users/luca/.codex/worktrees/8812/luca_gstack/.claude/skill-os/agent-root-kernel.json)；`ef213983722c200cc0ba968b43d832e11016fbd85d4414b5ed4fb8714fef5760` | K2/K4/K10 与根/manifest 对齐，J17 转达 F1 根/kernel 闭合。需验：实际读根与读取 kernel 的消费者形成同一行为，不把摘要当全文 owner。 | 独立替换会恢复旧解释或制造冲突；保留精确共同候选与消费者位置检查。 |
| [context-index.md](/Users/luca/.codex/worktrees/8812/luca_gstack/.claude/skill-os/generated/context-index.md)；`2b3f24a246f9730db5f14c5655eccc610ecaec33906da3464dff2824f758caee` | 由现有 generator 输出，builder check 通过。需验：语义匹配/非匹配、缺失/不可读/过期回退、app 引用前找 owner；不是 leading_words 一命中就加载。 | 旧生成物、手工修视图、把词提示当加载器会错选或漏读；只从对应 manifest 生成，保留完整回退。 |
| [check-agent-context.mjs](/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/check-agent-context.mjs)；`80de955c256440a7fe165d665b4f5b833be015afdb1b5a3f4866136063545a97` | 新检查拒绝 coherent 政策回退、detached 词匹配及 owner 不可达/晚加载；既有 builder/checker/投影门通过。需验：对后续合法措辞接受、真实控制倒退拒绝，不把退出 0 当实际正文消费。 | 文字形状约束可能误拒合法改写，也无法证明任意语义；合同变更须同步消费位置和反例，禁止为绿灯删除保护。 |
| [test-agent-context.mjs](/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/test-agent-context.mjs)；`5610e8613b0fda90042ab78b4f29bf4231605f19ad34fdde3a3d52fa2b894bdd` | 120/120 mutations，原 107 项不删，含回滚及 staged-index/merge；绑定的源文件未再变。需验：新增反例确实捕获政策/时点损失，原有效合同仍通过。 | 仅复述实现或减原分母会给假信心；保留 RED、前像和原样本，模型行为仍单列。 |
| [route-guard.mjs](/Users/luca/.codex/worktrees/8812/luca_gstack/.claude/hooks/route-guard.mjs)；`1da1fb9097d72415a300475b8514205bd597404313c9a64678397afb68f9ee7a` | 只修 STOP 入口消费者；Codex/Claude/UNKNOWN 实际 hook 输出、257/0 和 r4 hash 对应，J18 关闭 F3/F4。需验：实际宿主传入身份准确，UNKNOWN 先确认；候选、Plan/真人门保持。 | helper 身份缺失/错误或提示未实际送达；不能把源码 adapter 声明当宿主自动接入，未知不得回落 CLAUDE。原 classifier/项目事件机制保持。 |
| [test-route-guard.mjs](/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/test-route-guard.mjs)；`a7f695c06c1048ca44e411ad7b599b1a98f1a5516f88c24f77d88ae41c35c144` | 完整 257 项实际子进程测试；两条 UNKNOWN 清空身份字段于局部 env，无 global/HOME/CODEX_HOME 更改。需验：fixture 字节等于交付，原项目/取消/义务/终态样本保留，环境隔离不借宿主残留。 | fixture 漏依赖、错误输入类别或与交付不同会伪测；原两次此类失败保留、源码闭包和最终 hash 已绑定。测试不是模型/launch/能力探针。 |
| [test-agent-context-resolution.mjs](/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/test-agent-context-resolution.mjs)；`5b7478e73ba0fcf35bc4dc7cc6554a90146229c7ff6f23779704c50768568cf5` | exit 0，增加“当前页是什么”的 luca-app 候选可达性；resolver 源码不变。需验：真实入口按语义条件及时读正文，多余词候选不会变强制加载。 | 直接测试 resolver 不代表 runtime 自动调用；搜索范围内只有测试消费它，不另造 classifier 或声称解决了所有选择问题。 |

未改而核过的 resolver、session-restore、luca-app runtime 前像与 hash 在 J17 收件包；CLAUDE 根、领域技能和 R9 原件未改。本模块保持原职责，不为其他 owner 的迁移签字。

## 5. 原始验证、修复历史和成本

| 验证对象 | 实际结果与原件 | 可证明/不能证明 |
|---|---|---|
| context 合同与倒退 | `node scripts/test-agent-context.mjs`，exit 0，120/120，58.416 秒；[J15 命令记录](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/j15-green.json)、[完整 stdout](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/j15-green.stdout)。 | 原 107 与新增控制反例在该对象通过；不是 120 模型任务或全域语义证明。 |
| 实际 hook 程序回归 | `node scripts/test-route-guard.mjs`，隔离 cwd `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/regression-sandbox`；exit 0，257/0，26.379 秒；[命令/cwd/exit](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/j17/unknown-green.json)、[完整 stdout](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/j17/unknown-green.stdout)、[stderr](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/j17/unknown-green.stderr)、[UNKNOWN 实际输出](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/j17/unknown-outputs.json)。 | 真实 Node hook 输出及受覆盖状态，最终两文件与 r4 相同；不是模型、实际 app/SessionStart 或正式能力运行。 |
| 一致性和交付适用性 | `python3 scripts/build-agent-context.py check`、`node scripts/check-agent-context.mjs`、`node scripts/test-agent-context-resolution.mjs`、限定九文件 `git diff --check` 均 exit 0；[原检查记录](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w39-routing-m7rf79yu/continuation/checks.json)。J17 两文件 delta SHA `ec34fa3bff9930c841255658ced4c97984d6fac6dc33a85be138a2e4a96eed48`，reverse apply check 和 diff check exit 0。 | 生成物/契约/patch 对象一致，不证明生产已部署；本次 hash 未变，按要求不重复绿测试。 |
| 非作者最后修复复核 | J18 静态 PASS 4/4，F3/F4 closed，原件路径及限界见第 1 节。 | 消费者兼容及最终修复接受；不替代真实模型行为、公平 B/S 或生产采用。 |

历史失败保持原性质：旧 checker 接受 coherent catalog 回退；J15 删除窄 owner-discovery 分支仍被旧 checker 接受；UNKNOWN 曾错指 CLAUDE，均有 RED 与后续修复。隔离 route fixture 曾漏静态依赖，首个测试输入因 explicit REQUEST_MARKER 不属 STOP；修正闭包/输入后才有效。生成索引格式不符、两次原子 patch 上下文失败与后已撤销的人为报告长度断言失败不抹掉，也不作当前源码仍失败。r3 255/0 日志保留，最终应引用 J17 257/0。

旧 J05 的 driver 权限缺省/INVALID_RUN 传播 finding 只绑定当时版本；本次未读新 driver，不判断其他 owner 当前修复状况，更不把它们当本候选仍受阻的事实。P03/P04 未启动线程、P05 仅 5 次 dynamic 工具/0 命令/无产物且累计 59541 token 的 INVALID 历史仍在快照；它们不是当前路由试次成绩，也不证明原框架整体失败。P08 INVALID 和 8/8 探针耗尽则为主协调明确保持的当前限制，不能换名重试。

可核的 58.416/26.379 秒是两项程序回归时间，非模块总开发或任务运行时间；九个文件大小、测试数与 hash 不能换算收益。较早 U012 保守开发动作计数为 156，后续 F4 对应与本次报告操作还需计入；完整累计工具、审查人时、模型计费 token/金额仍 UNKNOWN，不把历史账清零。本次没有测试、网络、额外 Agent/聊天、模型、能力探针或源代码修改，仅定向读取旧/己方报告、给定 r4 裁决、核 hash 和写两份报告文件。自动摘要成本仍存在；有界动作新增 index 读的成本也不能遗漏。原框架维护触点与新检查维护成本分别存在，没有年化或净值数据。

## 6. 当前具体交接、采用条件与回退

本模块交付的是可审的九文件候选，主协调可沿现有授权集成，不再以旧 N01 “无实施”结论阻止开发。采用建议只覆盖第 2 节的真实改动，不扩展为删除原路由层、记忆/恢复、领域输入或所有项目 hooks。其他用途保留原 owner 与机制，未知价值不自动判零。

迁移时按 J17 最终 hash 收取全部九文件，核对共同 HEAD/前像与已有集成差异；r4 两文件须与本表一致。AGENTS、manifest、kernel、index、checker 作为同一合同更新，测试随同候选收件；index 由对应 manifest 生成。保留 CLAIM 范围：源码中的 `.codex/hooks.json`、CLI/host-launch adapter 有 Codex 身份声明，只是源码连接证据，配置未改，不能写成自动宿主接入成功。

行为接受必须绑定实际候选和消费者，覆盖显式适用/不适用、真正未决发现、有界文本/动作/当前页引用、index 正常/失效回退、五真 Plan/项目/权限/真人控制，以及已知/未知宿主 STOP 的首次后续动作。原十四用途 ledger 继续由各 owner 依实际影响提供验收；不将本模块静态票代替 Context、编排或领域整体验收。这里只声明欠证行为，不新建试验计划、预算或测试系统；能力探针额度已尽，本模块不开新 run。若主协调已有合格同对象证据，应复用，不能借不同模块分数填空。

在正式采用前保留旧生产路径和冻结前像；拒绝/撤回候选时恢复九文件的各自前像及同版本生成 index，不用覆盖其他 owner 或用户脏文件。已验证 J17 delta 可 reverse check，不声称完整生产回退/在途恢复已执行。现有流程/项目状态不迁移、不猜 pin；在途工作按原有效授权、最新检查点和失败终态继续，旧/新入口不得混用。真实正常切换、拒绝切换、回退及必要在途恢复证据仍归主协调联合接受，未发生的部署不记 DONE。

剩余模块义务是消费后续具体验收 finding、在原九文件内定向修复并验证受影响行为；联合行为/迁移接受和生产采用由主协调及独立审查继续。当前没有另一个已知独立路由源码缺陷可据此再改，也没有必要重跑绿测试。本建议更新可交付，整个模块与总体目标未宣布完成。

<!-- FILE_END: u011-routing-evidence-limits.md -->
