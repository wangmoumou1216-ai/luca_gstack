# U007 routing build report — W08

状态：DONE_WITH_CONCERNS / BUILD_ONLY。代码和离线单测已交付；独立review、三模块集成及真实运行资格由主协调继续。本轮没有真实模型/正式案例run，也不声称B代表原生完整运行或净收益已证。

## 零、所有后续 Session 必须继承的背景

**luca_gstack 是在 Codex 桌面、Codex CLI、Claude Code CLI 中通用使用的一个框架。评估按三体系及其协同作用组织，最终产出一份统一的评估执行计划。** 本文将用户口述的“Cloud Code”按 Claude Code 理解；该名称不改变通用框架这一评估对象。

用户本次明确要求：“按照它们的通用价值，然后去考虑我的框架上面的这几大模块的问题以及计划的输出。”据此，以下约束适用于目的整理、研究、独立规划、设计、审计、比较、裁决和迁移：

- **以共同用途定义价值。** 从理解任务、组织执行、保持信息连续性和必要的人类控制出发，研究框架在当前模型与实际运行环境能力之上增加了什么价值；这些价值是否值得其规则、协调和维护成本。
- **保持一个框架的规划对象。** 不按三个使用端拆成三套方案、三组模块或平台专项 Session，不预设需要新增适配层、平台分支或配置体系。若证据表明统一目标存在无法消除的能力冲突，记录影响并回到共同用途裁决，不由执行者自行扩大架构。
- **区分能力事实与架构选择。** 模型本身的能力、环境实际提供的执行能力、框架增加的机制，分别作为归因依据。环境名称不充当方案分组依据；必要的能力核实服务于同一方案的可行性判断。
- **通用性不等于采用最弱能力。** 不要求实现方式完全相同，也不凭空假设各处都有同一能力。无法取得必要能力时，先检验现有能力能否以更简单方式达到同一结果；仍不能满足必要控制或用途时明确限制，不静默削弱目标。特有增强的收益不能冒充通用收益。
- **以证据控制复杂度。** 每个保留或新增机制都要说明服务的共同用途、必要能力前提、最小替代及净价值。确需核实环境差异时，只检查可能改变结论的行为与控制点，复用同一任务和判据；不得以此自动扩成全端、全组合的独立评估工程。
- **按模块职责限定范围。** 三体系评估负责通用的任务分流、Agent 协作、Context 提供及其交接；技能内部领域方法、动效或其他具体交付流程仍由技能 owner 负责。技能作为真实任务的消费方或案例时，只检查与三体系有关的输入、输出和控制衔接。发现技能内部问题，记录具体责任边界，不自动扩大为技能重构或新增评估模块。
- **允许高价值交集优先进入。** 主协调者可将直接改善共同用途或评估可信度、且能保留最新提交有效行为的交集列为优先项。先复用现有 owner；确有额外收益才设计最小增补实验，并记录收益依据、责任边界和回归要求。优先项使用既有任务卡，不新增阶段或审批体系，也不扩大实施授权。

本节是共同输入合同，必须随最小任务包和跨 Session 交接传递。执行者不能只读某一阶段而丢失本节约束。

**最新用户侧重（2026-10-02）：Codex 桌面与 Codex CLI 是主要研究、开发校准和收益验证环境。** 先查这两者可用的原生能力及框架增量；Claude Code 仅做可能改变共同用途判断的兼容/必要控制检查。API 是单列的能力表面，区分本地 Codex SDK/app-server、托管 Agents API、应用内 Agents SDK 和 Responses；不自动新增平台工程。保持一个框架，不按三个宿主平分实验、不凭空编造用户使用比例。此优先级随全部派发传递。




## 交付与权限

工作树 /Users/luca/.codex/worktrees/8812/luca_gstack，开始HEAD 05120197073144c0f46b6fb30a192733d529cc4f且干净（a32c72）。只新增两个代码文件及本报告：
- scripts/tri-system-eval/conditions.mjs
- scripts/tri-system-eval/conditions.test.mjs
- /Users/luca/Desktop/luca_gstack/framework-audit/u007-routing-build-report.md

没有修改其他模块、共享合同/manifest、案例、生产源、全局配置或记忆；没有创建分支、提交、推送。获准离线fixture仅在本次拥有的OS临时目录创建与清理。实际源根 /Users/luca/Desktop/luca_gstack 只读。

公共API：CONDITION_IDS冻结为B/T/S/I；await materializeCondition({conditionId,sourceRoot,sourceManifestPath,destination})返回共同合同七字段及补充1的materialSha256。全部JSON可序列化，只有Node内置模块，无新依赖。

## 实现

B按U002校验源kind、字节长度、SHA并复制当前root、owner/skill、运行辅助源。普通源字节不变；内部alias只从已选普通文件展开，不跟随link读取清单外目标。sourceBindings绑定源文件、源SHA、副本SHA、manifest SHA与有意patch。现有hooks只作为源材料，不安装、不启用、不配置trust。

T只编译自己的AGENTS，不读取B manifest或规则；保留原生理解、计算、自检、交付列表、失败记录、恢复引用和授权协作。完整请求与同一domain owner由共同case engine送达，没有固定五步路由或M1—M3强制格式。

S与B使用同一源集合，仅patch副本AGENTS的K2、K4、K10启动段。简单且无framework/skill/project/memory/跨会话恢复语义时直读任务owner；实际相关语义加载原owner/catalog/index；显式方法不重复发现。K1、K3、K5—K9及K10第4步以后的字节保持。真Plan触发、批准范围、权限、人类决定、失败/证据/恢复、记忆控制仍在。complexity.patches及sourceBindings.patch逐项列removed、trigger、use IDs、retainedVia；未以删行数宣称收益。

I从D通用§§2—4和共同合同编译：多交付/显式流程/摘要遗漏风险触发M1；跨执行者/阶段消费触发M2；更正/授权变化/漂移/恢复触发M3。简单任务不要求新表；最多主执行者+一名实际获准子执行者，未证委派则顺序并说明限制。提示没有案例ID分支、答案、数字/对象示例或未来事件；构建不读取任何案例包。没有新增driver、状态服务或额外文件许可。

allowedReadPaths只列真实规则/方法文本相对路径（含alias展开文件），不包含脚本、案例或答案。脚本源存在不代表case_read许可或执行授权。四条件不覆盖baseInstructions、不关闭原生工具；必要人类决定保持真实，材料不能提高用户权限。补充2的事件投放/semantic_review_required/动作留证归Context及driver，J仍判断候选是否遵守语义权限。

destination须为绝对新路径、父目录已存在；拒绝与source包含/被包含。exclusive mkdir保护已有文件、目录、link。拒绝traversal、source父级link、kind不符、重复记录、漂移及外部link。只清理本调用成功创建后失败的构建目录。此合作进程内边界不宣称抵抗恶意同UID并发替换。

materialSha256严格按补充1：全部普通文件的POSIX相对路径排序→各文件原字节SHA→JSON.stringify([{path,sha256},...])无换行UTF-8→SHA；没有symlink残留、绝对临时路径、mtime、自引用metadata参与。摘要证明材料身份，不证明已读或公平。

## 实际验证

当场命令：node --test scripts/tri-system-eval/conditions.test.mjs。

- d653f4：exit0，首次12/12。
- b02bbd：exit0，增加absolute alias/kind与startup边界反例后14/14。
- **5e9248：exit0，最终代码14/14，0失败/跳过**；收紧文件名形式的private/answers/developer-cases排除后执行。未运行全仓suite。

测试覆盖实际文件效果与精确拒绝，不是只匹配实现字符串：
1. B源字节相同、内部alias变普通文件、返回身份可复算。
2. 临时位置改变不影响摘要；改一个副本字节改变摘要且源不变。
3. S只改AGENTS及三个登记义务，保护block和K10尾部字节相同。
4. B manifest故意损坏时T/I仍成功，且仅自身入口，无baseline泄漏。
5. 构造但不创建answers/private/archive/case/fixture文件记录，B仍成功且不读不复制（目录和文件名形态）。
6. 干净成功→故意改源→SOURCE_DRIFT、无destination→还原原字节后成功，验证护栏会拒绝。
7. 已有destination目录/文件/link拒绝，原用户字节保留。
8. traversal/absolute/反斜杠、重复记录拒绝UNSAFE_PATH/DUPLICATE_SOURCE。
9. external/absolute alias拒绝SYMLINK_ESCAPE；源父级link拒绝SOURCE_PARENT；regular记录被换link拒绝SOURCE_KIND。
10. 未表示alias列omittedLinks，不读取目标、不伪造成功binding。
11. source/destination重合和manifest.root错位拒绝，源不变。
12. 缺必要owner拒绝MISSING_BASELINE；S patch形状漂移拒绝PATCH_CONTEXT，无半成品；未知条件拒绝CONDITION_ID。
13. 同目标并发构建只一个成功，后者不覆盖，ID和摘要保持。
以上按断言组描述，对应Node共14项test。

真实U002源构建：95ca38 exit0；过滤修订后**66c9b4 exit0**再次构建全部四条件，并复核源普通文件/副本SHA。它是离线构建，不是正式案例run；临时目录由该调用清理，原始输出留在本chat。

两新文件分别执行 git diff --no-index --check /dev/null <file>（c0035e）：exit1，stdout/stderr均空。no-index的1表示新文件有diff，无空白错误文本；不冒充测试exit0。未用普通git diff漏掉未跟踪代码。

## 构建与代码身份

| 条件 | materialSha256 | 普通材料文件 | 规则/方法readPaths | root patch |
|---|---|---:|---:|---|
| B | 92fbaa16e2aea9f100f2bf00d27acd0b90f7a46fc44917f9500506d7c61a47a6 | 478 | 335 | 无 |
| T | 66bee6476856dc260e2425e8b4785522db699e066d49fa8fd6d3f7ffba77d2e5 | 1 | 1 | 无 |
| S | db52ad31a7210f669b6ec4090f32b7aaee1067a6031d41f7f481c3eea1f57efd | 478 | 335 | AGENTS.md |
| I | ee9c612cb8231cd02fdec25b958cc5d95d96458aeb63d75e9734bda89a75b0a8 | 1 | 1 | 无 |

478是alias展开后的材料文件数，不是541源分母或技能数。B/S各排除119项非必要测试/评估/配置等记录，另遗漏1个清单外目标link，返回对象逐项公开；不据文件数声称收益。

| 代码 | SHA256 |
|---|---|
| /Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/conditions.mjs | 0337ed8b1d78805de5b2a3658623de00db87cd5c29aac29a3aa760c1dec63dc4 |
| /Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/conditions.test.mjs | 9146af4df873a5a29028305a3a313d231e10ebed6b7c3cd9509bd738b5d4f1cd |

## 限制、复杂度和续点

- MagicPath：.claude/skills/magicpath指向清单外.agents/skills/magicpath，link文本SHA beca6f544b7e4344135af332ae2ef3007a4a6982b829f163c3e9b2615b0e648e。依补充2保留限制，不读目标、不安装；由集成/J按实际case入口判断影响，不能声称全框架完整复制。
- B有真实root/owner字节，但原生hooks、trust、.agents发现alias与全局数据未接线。条件startup与helper可能还缺清单外传递依赖/数据，未在条件目录运行它们。相对比较前须验证所需B入口，不能用不合格B证明替代胜出。主协调已确认另作有界只读来源检查，本作者不擅自接线或等待该检查。
- 文件复制不建立OS读隔离；原生shell/child读取、实际能力和注入公平性仍需driver及就绪核验。instructionFiles只含AGENTS入口，driver须按补充1核materialSha256，并由case engine同等送达owner/完整请求。
- S/I提示是否正确遵从、质量和净成本未知；静态字节/范围测试不证明真实语义效果。取消/模型采用/恢复/usage也未证。补充2没有由条件代码代判事件权限。
- 复杂度独立单位：1入口；B/S展开后源记录；S的3个入口义务patch；I的3类条件性交接机制。实际询问/交接/token/维护时间均null，不填0或合成分数。维护触点是源选择/身份、S patch边界、T/I通用指令、摘要算法；失败面为漂移、源缺失、alias缺目标、patch形状不符、目标冲突。
- 下一步主协调集成真实三模块并离线核对，再按门释放最小原生探针/J-U007。当前BUILD_ONLY不变、正式run=0，没有新增池或生产切换。

## 读证与权限边界

db6e3a：task及implementation contract全文。a32c72：comparison manifest、first-unblind、工作树身份、framework-maintenance/catalog全文。b44792：code-hygiene和writing-for-agents全文，采用模式A当场验证/通用指令写法；没有独立review、额外Agent、日志或记忆写入。

8c953f的大输出截断，不声称D或checker全文读完；e47f26定向显示D通用§§2—4，后部混合索引截断；c5e3f0补读§4。候选只编译通用机制，没有从案例章节反推答案。checker scripts/check-agent-context.mjs的入口/import前65行定向补读用于判断复用边界；它要求双root及广域仓库资产，不适合作为本模块唯一验证，未执行它或从其引用递归扩读未授权源。

AGENTS、CONTEXT、context-index、project-session、Plan及evidence-receipts/project-verification/long-session为同chat已全文读且同基线复用。正常startup summary 49abd6实际exit0。1518c4/a2d861分别是补充1/2全文。B/S材料按U002机械校验/复制，不称语义读过541项；本批未读public cases、private/hidden、archive或别的run答案来生成条件。

输入身份：

- u007-routing-build-task.md：0bbad55c71209ecbb366ea2d3c996db809cb2eb8d1bab64483e0b6abc45b9139
- u007-implementation-contract.md：74c43c98dd2fc88df66c84d660c0f044deae35d7223e9a6c17b05ace22ec04a6
- u007-interface-addendum-1.md：953caf31e773b35bfc05c8993141f5d5f543b6202c30c8d6ccf7d1340073f70f
- u007-interface-addendum-2.md：1a308a1e849f67e10f5acb9ecae5a130b93c99d069b5a8bd0d15d1ff9e7a7830
- u007-comparison-manifest.json：aeb3f7391c991f9df48ef5f6fa178464124177c2fad390121beceb2adeca553f
- u007-first-unblind.json：1da434665d35af7c3eccaf64dd50c1a7aaa6cca39b42c56f831cc0c85ca5f8c9
- u005-independent-design.md：27831bcf48b9d935bb2718024344f2904064aaca7f5086964445ecda865c06c0
- u002-source-manifest.json：cbbf8d9cf338b8bbf2aa3434e500a9f83eb69f524018968a4d8b0d798b9c41b9

## 资源与检查点

W08准备调用1。起点epoch1790962874.853104（首工具后a32c72；首读取耗时未单独保留），报告UTC 2026-10-02T17:59:41.645640+00:00，已用约18.45分钟，45分钟内。

截至写报告：17次exec_command、5次apply_patch；Python内4次git子命令另计，共26项底层/子命令动作。functions包装18次（含一次btoa不存在的编排错误；该次未执行底层工具或写入，随后改用安全JSON传值），保守44次，小于90。未把多个命令包装后只算1。最终只读核对另记。整次模型token不可观察，UNKNOWN，不据此宣称精确120000内的usage证明。

3次单测、2次真实源构建均为获准离线验证；真实模型/正式run=0、新增Agent=0、网络/安装=0。源码未改生产，独立review未由作者自判PASS。

交接检查点：已完成两个代码文件和真实验证；无在途子任务；剩余M集成/J复核；不可丢决定为BUILD_ONLY、同源同权限、MagicPath及B接线限制；续接读本报告、两代码、共同合同及补充1/2并核SHA，从具体集成反馈继续，不重写泛计划。

最终只读核对：工作树只出现上述两个获准新代码文件；git status exit0，两代码SHA与冻结表相同。报告写入后核对新增1次exec_command、1次内部git、1次functions；最终保守工具/子命令/包装合计47，小于90。未追加运行或改代码。
