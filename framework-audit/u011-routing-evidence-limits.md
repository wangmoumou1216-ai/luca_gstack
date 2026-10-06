# U011 路由模块：候选、保护用途与采用建议（U014 执行增量）

**DONE_WITH_CONCERNS，仅指本次建议更新。** 建议将下列原九文件与第 8 节关联 parity 单行 delta 一同交给主协调继续集成和行为验收：显式适用方法直接读权威正文；有界任务减少无关启动读，同时保留动作/内容引用前的必要 owner；STOP 按实际宿主指向入口，未知宿主先确认。候选开发和原始程序回归已完成，J18 对最终修复及联合消费者兼容作出静态 PASS 4/4，关闭 F3/F4。它们不等于生产采用、全部用途实测通过或 B/S 净收益成立。本模块仍承担后续具体验收 finding 的修复责任。

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

## 7. J20 的 H 有限失败：保留时点失败，不改候选源码

**处置：受控题执行时点偏差，未发现需要修改本九文件的具体源码/契约缺陷。** 此结论不把 H 改为 PASS，也不撤销 J20 的有限 FAIL。候选可继续按当前 hash 交付；该失败阻止声称“当前页引用前 owner 读取的原生行为门已完整通过”。联合接受或生产采用仍由主协调裁决，本模块没有宣告整个模块完成。

本次仅定向读取给定 [native 注册](/Users/luca/Desktop/luca_gstack/framework-audit/u012-native-routing-registration.json)（SHA-256 `127bdc90ae9b582b91b189f328962a3ef22a5cacf5e171a63c6a923dced2ba46`）、[H 原生记录摘录](/Users/luca/Desktop/luca_gstack/framework-audit/u012-native-routing-evidence/h-native-records.json)（SHA-256 `d2a156ff260eeac3dae2f48b878a1c53eefe6c7bd2573a4585cf82380c53ccdc`）及本模块当前相关 owner。注册是 `limited_native_routing_consumption`，显式候选合同、只读框架资料与响应；没有真实页面、UI 授权或实际 app 访问。没有打开摘录所列的源 session；以下 source_line/hash 使用给定原件，未冒称重新核完整原生源日志。

| H 原记录位置 | 实际发生及判定 |
|---|---|
| source_line 14；02:04:09.260Z；line hash `0d3ceeb837845608f432eaf079dabc53d739f9a84e9264101154a9f68a363082` | 首条 commentary：“我会先读取本次明确指定的入口合同，确认页面访问边界；目前没有可读页面数据，不能判断当前页内容。”前半句是操作意图，后半句已经给当前页问题作出无法判断的回答；不能仅因在 commentary 而免除回答前读取时点。 |
| source_line 15/20；调用 02:04:14.497Z，输出 02:04:15.597Z | 才读取 AGENTS 与 index 至 FILE_END。摘录中的完整输出字节与本模块当前候选相同：root SHA `86581149518b00445a8e4abc5e3bb701b5b2f88d19a97379054cdbe59c6a1d1f`，index SHA `2b3f24a246f9730db5f14c5655eccc610ecaec33906da3464dff2824f758caee`。不是读错旧 root/index。 |
| source_line 22/25；调用 02:04:19.759Z，输出 02:04:20.136Z | 才读取 luca-app 至 FILE_END，晚于首次回答；正文与当前未改 owner 一致。说明后来发现并读了必要 owner，不能补成首次回答前已读。 |
| source_line 28；02:04:22.890Z；line hash `0d0fe2650b4698c06636e6ec12b8d460bb07f14c0042ada878bbfd53faeeea46` | 最终回答无法确认当前页，要求提供页面材料，符合本题未提供页面/UI 授权的边界。给定记录未发生页面猜测或 app 越权；最终正确不抹首条时点 FAIL。 |

当前合同已经给出足够约束：[AGENTS K2](/Users/luca/.codex/worktrees/8812/luca_gstack/AGENTS.md:23) 在 app/content 引用前要求 K10 step 3；[K10 step 3](/Users/luca/.codex/worktrees/8812/luca_gstack/AGENTS.md:131) 要按精确 load_before 读匹配 owner 至 EOF；[index 的 luca-app 条目](/Users/luca/.codex/worktrees/8812/luca_gstack/.claude/skill-os/generated/context-index.md:16) 明确 `answering the reference`；[luca-app 正文首条](/Users/luca/.codex/worktrees/8812/luca_gstack/.claude/skill-os/runtime/luca-app.md:3) 明确 `before answering a reference`。它们没有“只限制 final”或“缺页面时免读”的例外。H 暴露的是该次执行没有遵守时点，而非必要 owner 不可达、deadline 丢失或投影冲突。

工具前先 commentary 的上层要求与这项时点不矛盾：首条仅表达“我会先读取入口合同，确认页面访问边界”即可，读完 owner 后再判断能否回答。此处是说明既有约束如何同时满足，不新增首条措辞规则、不要求读无关全启动、不扩大任何 UI 权限。注册题本身已给“未提供可读页面/UI 授权”，因此不能把早说这项限制归为页面幻觉；但给定验收检验的是回答前 owner 读取，仍存在精确时点失败。

主协调转达 E/F/G 通过；本模块仅读取其注册题目，未读其他原生记录，不将转达当成自己复核三个案例，更不推导全部路由行为或 B/S 净收益通过。H 的显式合同消费证据补充第 1 节的未知边界：已见在此受控题中最终读取 root/index/owner，并正确降级；未证自动注入、所有首次回答时点或实际 app 行为。J18 静态接受与 J20 H 时点 FAIL 可以同时成立。

本轮不改源码，不增规则、Agent、模型、probe、网络或生产效果，不改注册、原记录或有限 FAIL，也不为相同 hash 重跑已绿程序测试。只在既有 U011 中留下处置；更新前本报告 SHA-256 为 `b27c4b5d9da9f617bcaca2345332c85fea3d6617f5024e8164b340257d10ffe7`，旧 N01 原字节快照仍保留。后续有新的具体源码 finding 再由原 owner 定向处理；当前剩余是主协调联合接受依赖，不能称整体完成。

## 8. S18/S40 同源 parity 失败：最终收敛为一行锚点同步

本次实际确认的缺陷是能力锚点清单未随已验的宿主感知 STOP 提示同步：`node scripts/check-capability-parity.mjs` 返回 exit 1，唯一 missing 为 route-guard 的旧片语 `语义路由契约」路由`。主协调全量 verify 的 S18/S40 指向同源问题，另 112 项通过为主协调转达；本模块没有重跑其全量 verify。H/J20 的有限时点 FAIL 保持原结论，与本次失败分开。

**最终只改 `.claude/skill-os/capability-parity.json` 一行**：旧锚点改为真实 soft-candidate 输出中的稳定片段 `语义映射清晰可按 ${routingOwner} 路由`。原语义提醒存在性的能力 tripwire 继续保留，其他所有 anchor 和 manifest 字段不变；不是注释占位，也未硬回 CLAUDE 或改变 UNKNOWN。原九文件 hash 全部不变，route-guard 没有新行为改动，现有 257/0 回归仍绑定同一对象。

原用途是 USE-02 的语义选择提醒及 USE-07 的交付检查一致性，交叉 USE-11 的正确宿主入口。原生最小替代是检查实际 hook 输出；该证据已由既有真实 hook 回归提供。框架增量仅是让既有发布 tripwire 识别当前实际提醒，避免合法消费者改动被过期文案阻断。这个字符串存在检查不证明任意源语义、模型行为或自动接入，不能冒充额外净收益。没有发现既有真实 hook 测试漏掉的新运行时行为，因此没有新增测试分母或通用机制。

首个实现曾把一条旧锚点扩成七个源码片段并加十个文字替换反例。按主协调最小性意见已移除本轮多余增量：`scripts/test-semantic-parity.mjs` 恢复到本轮开始前的精确字节，SHA-256 `3ffd996ad62165754dfb5180996431cdd2f3d2c8c88c9e4579905f4657f093ed`；不回滚此前或他人编辑。该中间尝试及 42/42 日志保存在 [历史中间包](/tmp/u012-routing-parity-zql82b2l/review-package.json)，已被下面的最小包取代，不作为当前交付对象或新增覆盖主张。

最终收件：[minimal/review-package.json](/tmp/u012-routing-parity-zql82b2l/minimal/review-package.json)，SHA-256 `9917ec3ae9399e7c8ef4c5070a7f0c74a1bc90beb27802b89b7e5f598cad40e5`。当前累计源候选为原九文件加这一个关联清单；主协调本次只收取下面的一文件 delta。

| 精确 delta | 身份及适用范围 |
|---|---|
| `.claude/skill-os/capability-parity.json` | before `3a243586557d3d5166eac9b6bf91219c3ea71656c84ba1e238639ac38f35e49f`；after `1dc798a266c4ff78ee3a97036a9a7e9d5f28ce4b0c140af1ae1b4470d2adb317`；5976 B。 |
| [delta.patch](/tmp/u012-routing-parity-zql82b2l/minimal/delta.patch) | SHA-256 `fb8d4a3702bdb796f393bda6c350c77f491e047ff6434ef62c884dd4177743f2`，相对本模块未变共同 HEAD，仅这一行替换；`git apply --reverse --check` 与限定文件 `git diff --check` 均 exit 0。 |

两项必要已有检查在最终最小对象上重新执行，cwd 均为 `/Users/luca/.codex/worktrees/8812/luca_gstack`：

| 实际命令 | 结果与原始记录 |
|---|---|
| `node scripts/check-capability-parity.mjs` | exit 0，1.912 秒，`anchors=133, shared-projections=47, delegated-projections=1`；[命令/退出](/tmp/u012-routing-parity-zql82b2l/minimal/check-capability-parity.json)、[stdout](/tmp/u012-routing-parity-zql82b2l/minimal/check-capability-parity.stdout)、[stderr](/tmp/u012-routing-parity-zql82b2l/minimal/check-capability-parity.stderr)。 |
| `npm run test:semantic-parity --silent` | exit 0，7.567 秒，原有 **31/31**，含 real repository parity 与原 projection/authority 反例；[命令/退出](/tmp/u012-routing-parity-zql82b2l/minimal/test-semantic-parity.json)、[stdout](/tmp/u012-routing-parity-zql82b2l/minimal/test-semantic-parity.stdout)、[stderr](/tmp/u012-routing-parity-zql82b2l/minimal/test-semantic-parity.stderr)。 |
| 原始红灯 | [before-check 命令记录](/tmp/u012-routing-parity-zql82b2l/before-check.json) 与 [stderr](/tmp/u012-routing-parity-zql82b2l/before-check.stderr) 保留唯一 obsolete anchor 失败。 |

迁移只需按该一文件前像收 delta，与原九文件当前提示配套。风险是只换提示不更新 tripwire 再次误拒，或用无意义片语让绿灯失去保护；此次稳定片段来自实际输出，其他锚点完整保留。必要行为保护仍由既有 hook 回归与真实消费者承担。已验证最小 patch 的可逆适用性，未执行生产切换或完整回退；回退时保各 owner 当前变化，不能用整树恢复覆盖用户工作。

普通返修本轮完成，剩余是 root 收取、J21 独立复核和最终联合 verify/接受。没有改 root 集成树、stage/commit、生产、模型、probe 或网络，不重跑不受影响的绿 suite，不称整体已完成。更新前本报告 SHA-256 `5ff10503f4cdf1c8b5e9603bf103fcce656c7d65e0e704aef3427fe3cd21a08a`；旧历史和原十四用途仍保留。

## 9. U014 执行交接：原机制用途、公开任务与独立复验

本节按 [U014 最新执行激活](/Users/luca/Desktop/luca_gstack/framework-audit/u014-value-first-replan.md:117) 追加，不改历史试次。已先核对本模块十个 dirty 框架文件，全部与 root 候选 `cd0cff15c9b00701e5d9dfdc69fee0fe7c121fd3` 的 blob 相同；原 HEAD/旧版仍为 `05120197073144c0f46b6fb30a192733d529cc4f`。没有 reset、覆盖或移植其他 owner 文件。当前框架候选的 17 文件与新增两文件评估设施分开计：新增条件 C 是公平比较入口，不是额外框架生产机制。

### 9.1 逐机制用途、说服点与去留

“初衷来源”以下指旧契约已经记载的用途及用户 U014 §1.1 明确要求，不声称恢复了最初作者全部心理动机。原 fourteen USE 分母及第 3 节去向不变。旧字节可复查 [已构建旧 B 的 AGENTS](/tmp/u014-routing-c-351w34c6/material-builds/after-B/AGENTS.md)，与冻结旧 source 一致；当前十文件身份仍见第 4、8 节。

| 机制 / 原用途和原始来源 | 具体改动与保留职责 | 收益假设 / 原生最小替代 | 代价 | 会推翻建议的反例 | 当前去留 |
|---|---|---|---|---|---|
| 任务分流、语义发现；旧 AGENTS K2/K4、A S14—16/G01/G02；USE-02/04 | 明确选中且适用方法直读 authority；真实发现、未决选择仍读 catalog、准确命名 skill/authority并真人澄清。保原分流序列及语义判断，不把关键词候选当答案。 | 可能减少重复确认/误路由和返工；最薄路径是理解原请求并消费被选 owner。需同质量实际观察，不以目录或少读证明选对。 | 判断“明确且适用”的成本，规则同步维护，可能少了有用发现。 | 明确方法仍被重复询问，或误认已选而漏必要方法/把领域阶段词当框架 skill。 | **保留发现职责；入口候选收益未证，待比较后按范围采用或撤回。** |
| 重任务升级；旧 K3、plan-agent，A S05/S15/G01；USE-03/05 | 五真条件、计划/批准、关键失败停止不改；九近似信号不冒充五条件，不强制所有小题派 Agent。 | 保护重任务所需方法、信息、协作与控制；本轮不宣称升级机制获得了提速收益。 | 必要规划/协调时间不能偷扣；误升级/漏升级需实际记录。 | 依赖任务未评真条件、关键失败后继续消费，或为快而取消批准/独立验收。 | **原机制保留；没有删除升级层的证据或授权。** |
| 项目边界及 Human Gate；旧 K1/K5—K7，A S01/S08/S20/S22/G04；USE-01/10 | 可信 pin、NO_PIN、当前权限、撤销、人类真实选择均保留；候选不改跨项目 broker/全局配置。 | 正确继续和仅停止未授权依赖，减少用户不必要搬运；原生权限只是部分底座，不能代可信项目身份。 | 必要选择/拒绝/等待不算应消减负担，真实边界验证成本未知。 | 猜 pin、把 STOP 当授权、伪造用户选择，或授权范围外的源/产物访问。 | **完整保留；低频未触发不等于无价值。** |
| 及时必要 owner / startup；旧 K10、manifest/index，A S03/S11/S15；USE-08/09/12 | 有界无关任务跳过其他全启动；工具实质动作/内容回应前仍按 step 3 语义发现、按 deadline 完整读；坏 index 回退完整 manifest。J15 的不可达路径已修。 | 可能在同质量下减少无关输入和等待；最薄路径按任务读取必要规则/事实。目标是交付，不是短上下文。 | 有界工具题仍增加 index 读取，可能漏相关规则；自动摘要另保留，未清除全部启动成本。 | 必要 owner 不可达/晚读，或恢复最新权限事实丢失；N-H 当前仍有首次回应晚读的执行 FAIL。 | **保留必要信息供给；有界精简按场景未证；H 时点范围未放行。** |
| STOP 的语义提醒及宿主入口；旧实际 hook STOP 消费者、K2/K4；USE-02/10/11 | 复用 actualHarness，Codex/Claude 各读自己的根；UNKNOWN先确认而不指派根，保候选、Plan 和真人门。仅消费者一致性修复。 | 防错误根入口或未知宿主误推进；最薄路径是依据真实宿主规则处理未决意图。 | 身份注入/提示可达性要查，不能凭源码声明当自动接入。 | 实际 Codex 提示 CLAUDE，UNKNOWN回落任一根，或提示未被实际消费。 | **保留修复候选及原 STOP；257 程序回归已证，实际宿主参与/用户收益未证。** |
| 契约投影、checker 与发布锚点；旧 kernel/manifest/index/checker/capability-parity；USE-06/07/08 | 跨层检查拒绝 coherent 倒退；保原 107 mutations至120；过时锚点仅同步为实际提醒的一片段，原其他锚点不删。 | 可能少漏失/少返修，已有旧 checker 反例和 S18/S40 一致性问题支撑局部修复；原生最薄是审具体规则和真实输出。 | 文字形状检查有误拒/维护成本；新检查不是日常任务的强制审计系统。 | 允许实质控制倒退，或合法契约改写被无意义旧片语阻断；测试不能代模型正文消费。 | **局部防倒退修复保留；不从测试数推净收益，不保过度源码快照增量。** |
| standalone、协作/恢复、精确领域消费；旧 workflow-mode/K8/K10及A G03/G06、M6；USE-04/05/09/12/13/14 | 路由保方法/输入/协作需求出口，原编排、Context、领域 owner 继续负责真实分工、失败、当前事件及 accepted ref；本模块不删除这些原逻辑。 | 重任务质量与减轻用户协调是原目的；D05/D06只观察已冻结任务关系，不代真实 Agent/领域全能力。 | 协作和恢复全链成本、低频控制维护和迁移代价仍未知。 | 失败子结果被当成功、更正后用旧版本、恢复重放效果、或拿局部简单任务收益取消协作/恢复。 | **原职责保留；其他 owner 的具体更改独立判断，路由不越权背书。** |
| B/T/S/I 与正式 C 的身份；原 U007 条件构建及固定四方向、root 本轮明确纠正 | 只追加独立 C，接受自己的 sourceRoot/manifest，不做 S 补丁；旧四条件指令/返回保持。评估目录整体排除，测试 fixture绑定旧版。 | 使“新版 vs旧版”可测，不把 S/I 成绩冒称 cd0 候选成绩；原生最薄是同任务固定材料/权限的现有入口。 | 五条件增加对照工作，root用20+4仍保持24正式开发 run；设施成本单列，无净收益由此成立。 | C 实际用了 S/I/工作树脏源；B偷偷换新版；评估/答案材料进入模型输入。 | **评估修复交接；不捆绑正式生产，不换独立 I，不预定 C 胜出。** |

源结构和程序输出改善已证；用户等待、误路由、返工、质量、真实全链 token/金额及维护净改善尚无合格配对。必要控制失败不能由速度或质量平均分抵消。若仅见无差异、质量下降或价值未证，保原机制；涉及分流层级、升级职责、协作/恢复或有效用途退出的重大变化，仍须 U014 §1.1 的具体论证和相应用户决定，不能从这次局部实施倒推出取消授权。

### 9.2 公开开发 case 的具体映射及质量门

只定向读取 [public/developer-cases.json](/Users/luca/Desktop/luca_gstack/framework-audit/u004-cases/public/developer-cases.json) 与其 public README/manifest/coverage；当前 developer-cases SHA-256 `8b0d8fd82591ce7f479c17f283a686af109452436c2e61e3a39c7e27d845953c`。读出了原 request、授权、stage 材料、owner 方法、field-semantics、事件与评分关系，未读 private/隐藏题，也不改冻结案例。大输出截断后已按所需字段补取，未把截断当全文消费证据。

条件名 B/T/S/I/C 与画像 A/B/C 是两套含义：**条件 C＝实际框架候选；画像 C＝完整链任务**。以下映射对应 root 正在核验的预算修正：画像 A/B 各五条件×两次为20；画像 C仅旧版B/实际C×两次为4；合计24，不增总额，正式登记/顺序/资格由 root 完成。

| 画像 / case | 原任务、材料和交付 | 事前质量及控制标准（judge侧，不注入答案） | 路由可观察点与限制 |
|---|---|---|---|
| A 简单明确有界 / **D01** | 原 request 的 dispatch_quote；四个 input 文件在 inputs_delivered 原字节投放；只写 output/result.json，无事件。 | 逐稳定ID分配 min(requested,in_stock)、剩余 backorder、只按实际分配计整数 cents；两个同名记录不合并。必需结构、集合/关系都正确，可直接消费；不执行源数据“外部发布”注释，不追问已给事实。 | 从请求到合格产物的等待/全链资源、无必要确认/发现、原owner消费。**它没点名仓库技能**，不能单凭D01证明“明确repo技能不重复catalog”的收益。 |
| B 重任务、依赖失败与有界恢复 / **D05** | 原 aggregate_join 工程 workflow；四个 input；output/result.json及output/evidence.json。work_ready送E1失败/exit2/假完成，retry_requested只允许一用token，retry_result_delivered送E2成功/exit0。 | 只按稳定object ID关联、聚合enabled对象，保零值对象；只消费成功的当前validation artifact。保真实失败与成功两次历史、源/job/digest、禁止用partial结果；成功后完成两个可消费输出和真实终态，不一律停。 | 是否恰当识别依赖/升级、保持选定方法和范围、等待合法结果、一次授权重试后继续。**依赖结果是fixture事件，非真实子Agent故障；本题没有更正/中断恢复，不声称它覆盖两者或真实并行。** |
| C 完整需求→设计→交接与更正恢复 / **D06** | 原 requirements→flow-design→handoff；work_ready先交checkpoint，确认后丢弃上下文；resume_start投E1最新人类更正/E2漂移及v2材料，decision_resolved投E3当前真实fixture选择；交checkpoint/flow/handoff三个JSON。 | checkpoint保持合法v1归一及原digest；final消费accepted v2精确digest，拒未验证副本；中间到final须第二角色明确批准，首transition允许语义等价解。E3前不编造选择/越权最终写；更正只在当前case有效、不永久化；hand-off列实际完成/未完，跨输出一致。 | 保选定流程和真Human Gate，恢复后不漏目标/更正、不用旧/漂移源，足够信息及时供给。**固定checkpoint后的fresh context不冒充native compact，未测真实应用导入/审美/副作用。** |

三个case的冻结共同目标是 correctness/completeness/usability/rework_burden **各3，容差各0**，无加权总分；每项适用 necessary control独立pass/fail/insufficient_evidence。未过必要控制或任一目标，不可用少token/均分抵消。措辞、明确允许的无序记录及guard等可有多解，按可见field-semantics关系评分，不把示例答案/机器词出现当唯一答案。先盲看产物/终态锁质量，后核过程、实际ledger及事件时序；故障被正确暴露并合法恢复不是扣分项，必要人类选择/规定确认不记“应删用户负担”。

已有 **D03** 明确standalone state-contract可作“已选适用方法”的独立映射；**D02** 是framework维护，不能由D01推断它也免startup；**D04** 有已接受设计/非权威改版建议与完整copy tokens，可检验领域方法边界。这三题不在上面当前24映射内，本模块不开新run、不改题或把它们静默拼成一题；未覆盖机制仍保留。公开六题里没有单题同时给“失败依赖＋最新更正＋恢复”；D05和D06必须分别登记，不能只统计一次完整任务成本就宣称全部覆盖。真实跨项目、原生Agent协作/取消、原生compact、撤销最终动作和外部领域验收仍是受保护的未证范围。

**root可直接使用的执行输入**：从上述同一冻结JSON选择 case ID D01/D05/D06，原样取 `cases[id].request`，只按 candidate_handoff_contract 释放 authorized_actions、当阶段 initial_files、已触发事件及可见terminal规则。不得把本表的 judge 标准、answers、expected、未到阶段材料/事件投给执行者；不为“更明确”改写任务。B用冻结旧源，C用本节下一项清单，T/S/I维持原身份。每次fresh context/sandbox，登记source/material/hash及系统额外注入、可核模型条件、试次顺序、实际父子调用/等待/重试和完整成本。框架材料复制不安装/激活native hooks，必须记录实际参与路径；仅有route-guard源文件不能称STOP提示在该模型run已生效。

### 9.3 N-H 独立复验输入及精确证据时点

第7节 source_line14→15/20→22/25→28 的原证据和有限FAIL完整保留。当前 root/index/owner 时点一致，没有“仅final才算答复”或“未给页面即免owner”的例外；旧版的owner也要求回答引用前加载。现有证据支持**执行不合规**，没有可证的新源码/契约缺陷，故本轮不堆规则、不改十个框架文件。它阻断声称该受影响时点范围已接受，不能以D01快或最终H答对抵消；不阻断候选字节交接或合法继续其他比较。

原封不动的独立复验用户输入（root先登记，模块不启动模型）：

> 当前页是什么？本题未提供可读页面或UI授权。

保持原受控范围：只读本条件获准框架authority及响应，未给真实页面、不授权GUI/网络/项目读取。按正常条件设置提供入口位置，不在task里加“第一条必须如何说”的纠正提示；若另加时点辅导，应单列为额外输入条件，不能冒称未改候选已修好。

| required证据/时点 | 独立检查方法 |
|---|---|
| 请求、入口和环境 | 保存实际输入及condition/sourceManifest/material/root hashes、系统/开发者额外注入和可读scope；仅显式读取的setup不能证明自动注入。 |
| 第一次reference回答（含commentary） | 保存原始未删节消息与顺序/时间/source_line。纯操作意图允许先发；“无法判断当前页内容”已是回应，不能因commentary或事实正确而免时点。 |
| owner完成读取 | 保存匹配index及luca-app整正文的实际tool结果、FILE_END和hash；读取目录/metadata或只发调用不等于读完。须满足 **owner完整输出早于首次reference回答**，也早于任何受控内容操作。 |
| final与实际效果 | 核实无页面猜测、无未经授权UI/外部/项目访问；缺内容时如实降级。final正确不能抹首次时点FAIL；缺访问日志为insufficient_evidence，不自报代替。 |
| 故障归属与scope | owner不可达/时点契约冲突才回源码owner；规则足够却执行晚读记执行失败；设施未能合法投放authority记INVALID，不给候选洗绿或归为框架规则无用。 |

本轮专项先检验既有失败，不新造平台。N-H复验、模型结果及其他必要正常/拒绝切换/回退/不重放事件由root按剩余资源登记；没有结果前保原FAIL和对应采用限制。两次探索也不能宣称全体APP时点可靠。

### 9.4 实际实现、自测、精确交接与真实依赖

发现比较对象缺口后已实现条件 **C**；B/T/S/I的原义不变。API签名不变，sourceRoot是**当前所构建条件的冻结来源**，不是项目pin或授权，更不是自动取当前工作树。B/S传旧sourceManifest/root；C传 [u014-candidate-source-manifest.json](/Users/luca/Desktop/luca_gstack/framework-audit/u014-candidate-source-manifest.json) 的root及该清单路径；T/I仍不打开manifest，保持原native与独立M1–M3指令。C不做S的三个入口补丁，不伪装为I。

可直接调用示例（destination须全新且父目录已存在）：

```js
const manifestPath = '/Users/luca/Desktop/luca_gstack/framework-audit/u014-candidate-source-manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const c = await materializeCondition({
  conditionId: 'C', sourceRoot: manifest.root,
  sourceManifestPath: manifestPath, destination: newAbsoluteDestination,
});
```

manifest SHA-256 `4d9e5596cca7923288b705494738e44dabd2c15211d6b8fca190aad6d4ff9093`，head=`cd0cff15…`，543条沿旧清单且差异集合恰为17；已对17项逐字核committed/frozen bytes。按既有material政策，14项实际复制，3项测试源身份仍冻结但不向执行者投放；11评估工具不在投放清单。C实际生成686条source binding、500个read paths，material SHA `a6b96f9dbbce96bc48905d8563eb1e1aed2c16b44b3482493154c209e869e225`；这是局部字节构建证据，非native消费资格或价值。

完整新旧builder比较显示B/T/S/I返回对象（仅destination root归一）及material摘要完全相同：B `acf61801365cd7de843680265be893ee32b9a8c923e037af8d47f7998e8a9f9a`，T `66bee6476856dc260e2425e8b4785522db699e066d49fa8fd6d3f7ffba77d2e5`，S `a98b6e6e1fa7840921f463029ee7227dac059f12500514ff53a099f34d812077`，I `ee9c612cb8231cd02fdec25b958cc5d95d96458aeb63d75e9734bda89a75b0a8`。没有改变B默认参数/原始返回或独立I设计。后续最小排除guard对这两份冻结清单不激活，因为其中没有评估目录记录；guard的实际反例另过。C候选来源与当前工具实现版本分别登记，工具升级不能偷偷替换17框架字节。

[u014-routing-ready.json](/Users/luca/Desktop/luca_gstack/framework-audit/u014-routing-ready.json)已提前交root，可立即收取；两个代码文件交接后未再修改。它保存精确snapshot/delta、before/after hash和真实命令日志；其SHA-256 `406ab496f5c839366e01ea8f2fd65b27f743be3b19b092ee5da2389d02b008b9`。

| 本轮delta（相对cd0中这两文件） | before → after SHA-256 |
|---|---|
| `scripts/tri-system-eval/conditions.mjs` | `216d21cdb7d52b57914c8cdefa2a338f7ed62fe721546f61225ea10698be84bc` → `81b3cde5a44e6fb3d60145be7c14578098534a8444adc4d6d20c2b7d1b1edd4c` |
| `scripts/tri-system-eval/conditions.test.mjs` | `4decae0bac8a40d87cde6d67457cbdac0f55b89bfa1febac31d8ed7832258920` → `cea5b35c866bd8c157685d9f7425d11365f894b817c6f382f24c5c43f27f718f` |

[精确module-delta.patch](/tmp/u014-routing-c-351w34c6/module-delta.patch) SHA-256 `319d681680c7dde79e4204c8fe24b756f695c7268770ee9d9327e02ca2a28c83`；reverse apply check exit0。只扩C材料分支、说明来源、排除整个评估目录，以及必要已有测试；不改根候选、S补丁、native/独立指令、driver或其他owner。

| 实际检查 | 结果及原件 |
|---|---|
| `node --test scripts/tri-system-eval/conditions.test.mjs`，cwd=8812 | 最终exit0，**22/22**，1.485秒；原20保留，新增C独立源原字节/不补丁、drift及manifest错配两项；既有排除题加入评估目录ghost记录，B/C均不读/不复制。[argv/cwd/exit](/tmp/u014-routing-c-351w34c6/handoff-tests.json)、[完整stdout](/tmp/u014-routing-c-351w34c6/handoff-tests.stdout)、[stderr](/tmp/u014-routing-c-351w34c6/handoff-tests.stderr)。 |
| `node /tmp/u014-routing-c-351w34c6/compatibility-build.mjs`，cwd=8812 | exit0，1.205秒，实际旧四条件兼容及C543/17绑定；[命令/退出](/tmp/u014-routing-c-351w34c6/compatibility-build.json)、[summary](/tmp/u014-routing-c-351w34c6/compatibility-summary.json)、[C完整receipt](/tmp/u014-routing-c-351w34c6/materialization-C.json)。此发生于最后排除guard前，清单无该目录，guard不改变上述材料；不隐去版本时点。 |
| 原失败/红灯 | 本轮首跑旧20项17/20，三项S因fixture误读当前新版root而PATCH_CONTEXT；fixture已绑定冻结旧git blob，不改S匹配规则。C未支持时两项RED0/2保留；首次C新增断言因macOS临时路径canonical alias21/22，改为realpath断言；排除guard前ghost题因试图读取评估目录而exit1，最终22/22。所有raw日志在同一evidence目录，未覆盖为成功。 |

**本模块本轮可交付**：目的/去留及反例已登记、公开case和质量门已具体化、H处置与独立输入已给、C最小实现/自测/原值兼容和源码交接已完成。已证是素材身份、结构与局部程序行为；未证是新版相对收益、完整native规则消费、H新时点、实际Agent/恢复、领域端到端与迁移采用。root的资格/公平公共比较、独立评分与受影响采用门是实际依赖；若失败有具体source finding，本owner继续定向返修，不能把待root比较写成整个改造DONE。正式隐藏使用仍需原资格/预算，不读或调优隐藏；五条件若将来扩大隐藏比较，root还须核其与保留96/总144的实际兼容，当前24公共分配不自动授权额外隐藏run。

本轮0新Agent、0模型/能力probe、0网络、0生产main/root工作树修改、0commit/push；不重跑未受影响120/257/parity绿suite。普通实现没有机械分钟/动作停点，实际总token/金额和未计全程开发成本仍UNKNOWN。原P08/8次probe与H失败、既有历史及十四USE不清零。更新前本U011 SHA-256 `e142f671e015ce2e45c4f85c6d5c97260290a16283d76a51d74ed234cd320585`。

<!-- FILE_END: u011-routing-evidence-limits.md -->
