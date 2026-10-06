# U014 路由最小可采用修复

2026-10-03；来源：[Replan R-U014-3](/Users/luca/Desktop/luca_gstack/framework-audit/u014-value-first-replan.md)、root明确的三文件职责派发。**建议把此三文件闭包纳入首次修复版**：真实公开CLI的STOP提示已从“Codex误指Claude根／未知宿主擅选根”变为按实际宿主提示、身份不明先确认。改善是具体入口正确性和必要边界保全，已观察到程序输出；不包装为全量三模块重构成功或相对效率收益。

本owner的最小实现、旧反例、新版自测、接缝检查和回退交付已完成。root仍须对实际current main重绑preimage、集成repo gate及非作者逐项验收，并独立负责获批发布。本报告不是非作者接受票、不是已经发布。此前整体未采用、P系列失败、H首回应时点FAIL及全部未证范围保留，不能由本切片的成功冲销。

## 1. 为什么修、原用途如何保全

旧基线为 `05120197073144c0f46b6fb30a192733d529cc4f`。旧`.claude/hooks/route-guard.mjs`的STOP渲染四条指引固定写`CLAUDE.md「语义路由契约」`。既有Codex包装器会注入`CLAUDE_PROJECT_DIR`供协议兼容，同时通过`LUCA_ACTUAL_HARNESS=codex`声明实际宿主；旧提示不消费这一现成事实，导致Codex被引到另一个runtime根。没有已知宿主时旧提示也指Claude，越过“先确认适用入口”。这不是要求删发现/升级的机会。

原机制目的来自旧STOP正文及旧根K2/K4：低置信词表结果仅给语义候选、未决选择交人、重任务按五真条件规划，研究按任务选档；STOP不生成项目授权。更薄方案就是在同一消费者复用**旧版已有**`actualHarness()`，不加识别平台、不修改项目pin/授权机制、不调用额外Agent。

| 用途 | 此次保全及可观察证据 |
|---|---|
| 语义路由与真实发现 | 仍给原softCandidates及参考依据；明确语义/未决真人确认的原分支保留。只改应读取的根引用；目录、startup、catalog政策一字不进入此补丁。 |
| 复杂任务升级 | 构建轴仍给`Plan Agent 5 条件`；研究轴仍给三档及避免把宿主偏好当研究豁免的提醒；评审helper不变。 |
| 不能把STOP当权限 | 未决确认／补充原句不删；unknown新增“入口未确定、先确认、STOP不授予执行权限”，不指定AGENTS或CLAUDE。无project.sh／--tx／PROJECT_SWITCH指令。 |
| 正常、异常和恢复 | 已知Codex/Claude正常、未知身份降级；retired STOP、其他决策、项目event、权限、义务/checkpoint及Stop生命周期代码保持原字节。原249回归完整保留，最终257含8个宿主反例。真实Agent恢复/原生compact不在此代码变动中，不靠小题删除其职责。 |

反证/撤回条件：已知实际身份仍输出外来根、unknown猜任一根、候选/研究/Plan提醒丢失、公开包装器丢context/错误退出、或集成中实际根无相应K2/K4权威。遇到这些回本owner修复；不靠再贴规则洗绿。维护成本是旧消费者里5行身份/通知选择、四处引用和返回拼接，以及现有suite的8个进程级反例、1处必要anchor同步；不引入常驻审计、driver平台或每任务新表。用户少误入外国根的机会有具体输出证据；用户耗时/返工、生产发生频率、金额与总体净收益未知。

## 2. 精确组成与基线

在本owner OS临时目录按旧git blobs重建所需测试材料；其余材料全部来自05120197，没有复制cd0的root/startup/catalog精简。复用当前已验证的STOP局部delta，程序**STOP分支之外前后字节均与旧版一致**；原route suite除插入8个宿主反例之外逐字相同。仅三文件进入发布建议，所有临时验证器/fixture/日志及199项登记测试依赖副本仅是此次证据，不捆绑进生产。

| 发布路径 | 精确旧SHA-256 | 精确新SHA-256 |
|---|---|---|
| `.claude/hooks/route-guard.mjs` | `ca233766d7f97e4cb7733ed901b7f43b6069fb12c70e7b0eb18fc2bb5575315c` | `1da1fb9097d72415a300475b8514205bd597404313c9a64678397afb68f9ee7a` |
| `scripts/test-route-guard.mjs` | `bf09e333cac5a87ef497574b6a6081f606957ec91cf0e414db76691be306f082` | `a7f695c06c1048ca44e411ad7b599b1a98f1a5516f88c24f77d88ae41c35c144` |
| `.claude/skill-os/capability-parity.json` | `3a243586557d3d5166eac9b6bf91219c3ea71656c84ba1e238639ac38f35e49f` | `1dc798a266c4ff78ee3a97036a9a7e9d5f28ce4b0c140af1ae1b4470d2adb317` |

[minimal.patch](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/minimal.patch) SHA-256 `44c14615e876f8f32274492ab9875964cff7a0089bc323a7204bfcc490ec2aab`；[handoff.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/handoff.json) SHA-256 `2916148966bdf50c15a9a36b52be6aa9cbc1036bc4526061f5debe8d3ca27518`，其中包含精确preimage/candidate位置、每条原始日志hash及旧依赖来源。[source-manifest.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/source-manifest.json)绑定旧blob；[scope-validation.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/scope-validation.json)证明本工作树HEAD/status及已有tracked dirty摘要原样保持。未写root/集成WT、其他owner源码、项目alias/状态、全局hook配置；无stage/commit/push。

`capability-parity.json`是确实必须的第三文件：旧133-anchor检查要求`语义路由契约」路由`，恰是被修正的旧指引片段；新STOP已不含它，保旧anchor会拒绝正确修复。只把这一项换成实际新消费者中的`语义映射清晰可按 ${routingOwner} 路由`；其余锚点、shared/delegated技能投影和原31项语义断言完全保留。不新增整源码快照或平行合同。

## 3. 同输入旧失败／新通过与原始记录

实际调用非dry-run stdin→hook→stdout；固定原prompt及权限/fixture事实，条件之间仅根路径必需归一。没有session_id，避免碰真实项目身份；项目/记忆根均为各自临时fixture。旧源码配新增宿主断言在首个Codex反例准确exit1，完整旧suite仍249/0，说明原测试缺少此反例，而非把旧历史改写为失败。

| 当前实例检查 | 真结果 | argv/cwd/exit及完整stdout/stderr |
|---|---|---|
| 旧route + 现有新宿主反例 | exit1，0.267秒；`PRD是啥`固定prompt，声明codex但旧输出CLAUDE根 | [receipt](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/old-red.json)、[stdout](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/old-red.stdout)、[stderr](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/old-red.stderr) |
| 干净旧版原route suite | exit0，249/249，26.967秒 | [receipt](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/old-original.json)、[stdout](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/old-original.stdout)、[stderr](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/old-original.stderr) |
| 最小新版既有route suite | exit0，257/257，26.438秒；Codex/Claude各候选、构建、研究3种，unknown候选/构建2种 | [receipt](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/candidate-routes.json)、[stdout](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/candidate-routes.stdout)、[stderr](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/candidate-routes.stderr) |
| 现有capability parity gate | exit0，2.021秒；anchors133、shared47、delegated1 | [receipt](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/candidate-parity.json)、[stdout](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/candidate-parity.stdout)、[stderr](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/candidate-parity.stderr) |
| 原semantic parity suite | exit0，31/31，7.583秒 | [receipt](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/candidate-semantic.json)、[stdout](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/candidate-semantic.stdout)、[stderr](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/candidate-semantic.stderr) |
| exact patch正向／逆向检查 | 两者exit0，各0.018秒；旧preimage→候选及反向 | [forward receipt](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/old-forward.json)、[reverse receipt](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/candidate-reverse.json) |

另做28次**本地显式CLI**操作，全部保原候选确认和禁止造项目权限：16次直接hook为旧/新×(Codex3+Claude3+unknown2)，12次既有公开包装链为旧/新×(Codex3+Claude3)。新版14次身份均正确；旧版8次错身份=直接Codex3+unknown2+公开Codex3，旧Claude6次本来就用正确根。[entry-results.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/entry-results.json)逐条指到input、实际argv/environment覆盖、exit、UTC时间、stdout/stderr原件；它们不是28次模型试验或总体可靠性样本。root无需重跑模型以确认这次可复查的程序输出，但若采纳自动触发或模型实际消费主张，须取对应独立证据。

公开Codex的精确旧新原件：[旧additionalContext](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/public-old-codex-0.stdout) → [新additionalContext](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/public-candidate-codex-0.stdout)；相同`PRD是啥`，旧`语义映射清晰可按 CLAUDE.md「语义路由契约」直接路由`，新`语义映射清晰可按 AGENTS.md K2/K4 路由`，原brainstorm候选/依据/确认仍在。unknown的[旧输出](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/old-unknown-0.stdout) → [新输出](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-routing-adoptable-i4y88s01/candidate-unknown-0.stdout)保留先确认、不选外国根。

## 4. 接缝、实际宿主触发和诚实降级

| 宿主/入口 | 注册与实际执行 | 本轮能证／不能证 |
|---|---|---|
| Claude | 旧`.claude/settings.json`的原生`UserPromptSubmit`命令指向route-guard；在Claude Code真正调用该注册时由宿主自动hook。此次直接执行注册指向的同一Node脚本，未启动Claude模型会话；没有实际原生用户回合自动分发记录。`CLAUDE_PROJECT_DIR`且无explicit声明时按旧helper检测claude。 | 正常提示及原控制已由程序验证；自动注册是配置事实，**当前native自动分发实测UNKNOWN**。不拿设置文件存在当活体自动加载。 |
| Codex | 旧`.codex/hooks.json`注册的同一公开入口：`host-launch-hook.mjs`→既有`codex-hook-adapter.mjs`→route-guard；本轮使用正常非Host Launch分支，实际包装器注入`LUCA_ACTUAL_HARNESS=codex`并把纯文本包为UserPromptSubmit additionalContext。未修改/授信/安装hooks，未调用model或Host Launch claim服务。 | **此次仅显式消费与包装输出已证**；配置存在不证明此桌面实例原生自动hook。专用Host Launch分支、native trust/自动dispatch和模型是否实际遵守均未证，不冒称Codex原生自动hook已经参与。 |
| 未知宿主 | 直接公共hook，去除已知身份环境，输入保留协议prompt_id。hint仍用actualHarness而不把prompt_id/Claude协议字段当实际CLI。 | 先确认当前入口、保STOP无授权且不指任一根已证；不发明未知平台适配。 |

这条修复复用旧helper/包装器；没有改“发现/执行/降级”之外的路由算法。本次临时candidate树的AGENTS来自旧基线，所指Codex入口有原K2/K4权威；实际模型仍须按对应根原合同消费；不把共享Claude协议字段视为读Claude根的授权。解析project-state用的hookHarness与显示实际CLI用actualHarness是旧架构两个问题，未改它们的权责或事务。缺native自动载入、界面/页面或模型消费证据时，只报告本地CLI范围；不会建议偷偷安装/全局授信来放大效果。

## 5. 根集成、可采纳建议与回退

**建议采用范围**：上述三文件host-specific STOP正确性修复，原因是同输入旧指错误权威、新公开包装输出正确且必要控制/原suite保全。可以独立于全量startup/catalog候选纳入首次bugfix；不是默认认为简单快就取消框架。H晚读发生在模型首次回应而非这个STOP指引，未修、未复验、未混进此范围；其他模块和cd0/C素材保留供后续原目标推进。

root交接顺序：先核当前main三文件是否等于本表preimage；若漂移，按实际字节做局部整合、重新冻结最终三文件并跑受影响验证，禁止force/reset用户dirty。不跨用本候选的测试票到漂移后文件。匹配时可在已获批隔离集成树执行`git apply --check <精确minimal.patch>`后正常apply；原deps是旧基线，不要求root导入临时fixture。

root沿R-U014-3做非作者审查、当前repo gate和适用跨宿主接入确认；这是真实发布依赖，不是要求用户重复确认。若要声明native自动hook触发/模型消费已闭合，应读取当前独立原生回合的真实记录，不能由本28次显式CLI或旧注释代答。此处提交的是可审的通过切片，不仅给“暂不采用”，也不强迫三个模块凑数。

回退可执行性：此精确candidate的`git apply --reverse --check <minimal.patch>`已exit0。尚未合并时只放弃root自身隔离树中这三文件delta、留全部证据；已发布时按最终接受commit做正常revert并验证，不能reset主仓/强推/逆应用到不匹配字节。回退恢复旧三文件，旧Codex错误会恢复，须明确记录，不能装成无损方案。若未来只替换修复实现，仍保这些原用途及新反例。

criteria（作者自检，非独立票）：C1旧错误→新public程序输出 **PASS**；C2原路由、升级、确认/权限、异常/义务职责保全 **PASS**（精确delta＋249/257回归）；C3当前版本/退出/原失败及实际宿主证据层次清楚 **PASS**；C4current-main集成、非作者验收和发布 **PENDING root**，本owner不代签；C5远端/本地主仓同步 **PENDING root**。没有发布SHA就不宣称修复已上线。

本轮0新Agent、0model/probe、0网络、0production/root mutation、0commit/push。临时目录自身的空git init仅供既有ignore断言，不是新集成worktree，未建remote/commit。实现/协调全程资源及维护频率未有完整ledger，仍UNKNOWN；测试时间不换算等待净收益。原工作树保护核对见scope-validation。若root独立验收指出本三文件具体finding，本owner继续同范围返修，不向人类转嫁普通步骤。

<!-- FILE_END: u014-routing-adoptable-fix.md -->
