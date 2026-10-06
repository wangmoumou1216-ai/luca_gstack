# U014 Context 最小修复交付

状态：**DONE_WITH_CONCERNS（限定为补丁准备、自测和报告交付）**。已提供可审查、可在旧干净字节上应用的最小 patch；尚未声称模型行为通过、模块采用、集成或发布完成。

## 1. 本轮交付与当前选择

按 [U014 最终 R-U014-3](/Users/luca/Desktop/luca_gstack/framework-audit/u014-value-first-replan.md) 从旧干净 Git commit `05120197073144c0f46b6fb30a192733d529cc4f` 的真实 blobs 构造两个独立修复单元。全部候选源、patch 与验证目录位于作者自己的 OS 临时目录。没有改写当前 checkout、root/integration checkout 或其他 owner 文件；没有运行模型、创建探针、提交或推送。

最新 root 调度优先选择 **A：决定状态继承**，已先交付 [status-ready.json](/Users/luca/Desktop/luca_gstack/framework-audit/u014-context-status-ready.json)。root 通知已登记 4 次跨宿主旧新“有限规则决策”对照，仅覆盖决定状态继承和编排控制；本 owner 不执行这些模型试验。**B：必需来源闭包本轮仅保留候选，不混入这次模型比较或发布。**

原整包未采用以及两次资格失败仍保留在原审计证据中。本次是窄范围修复，不把原整包的静态结果或旧受控任务结果继承为此补丁的模型收益证明。既有证据边界见 [U011/U014 证据限制报告](/Users/luca/Desktop/luca_gstack/framework-audit/u011-context-evidence-limits.md:129)。

## 2. A：决定状态继承（当前交接单元）

旧 `handoff-protocol.md:51` 无条件规定“skill 完成时先写 PROPOSED”，而相邻状态定义允许真实用户已明确采纳或否决。两者共同消费时，完成步骤可能把已经成立的 ADOPTED/REJECTED 降回 PROPOSED，并诱发重复确认。这是可定位的合同冲突；尚未证明旧模型在登记案例中必然犯错。

A 仅替换这一处写入规则：新建议写 PROPOSED；本次已有真实用户决定继承 ADOPTED/REJECTED 及来源；最新有效更正优先；历史采纳不授予本次执行权；未决定或超出当前权限的事项仍须真实用户决定。该局部规则正好闭合状态定义与写入时机，不引入流程、状态 schema、新脚本或新许可。

真实 Human Gate 保留：它减少对同一有效决定的重复确认，并不允许代理代选未决方案、用旧同意覆盖当前撤回，或扩大读写/发布权限。所有 office 前部 Human Gate、权限及 completion 内容保持旧字节；本单元不需要改 office、long-session 或 session-handoff。

## 3. B：必需来源闭包（独立保留候选）

旧合同存在三处联合冲突：HP `123–130` 将“最近一个上游 summary”与“绝不读完整上游来源”写为普遍规则；office `136` 重复绝对禁止；office `150–152` 只找最新 DONE，`167` 用 Pre-Task 总 5K 上限覆盖任何必需来源。对于当前 input owner 明示多个必需上游或完整来源的任务，这些通用捷径可能漏依赖、让摘要替代来源，或因总预算提前截断。

B 最小闭包共两文件：HP 先读取当前自身合同、按已选依赖集合定位全部必需上游、使用已验证项目根中的精确 handoff_path，在本次真实读权限内核版本与 gate/证据；office 同步真实 consumer 的全局句、Step 2 和预算句。最新 DONE 不再代替依赖集合；standalone 不制造 workflow state；缺失、失败或未知不作为成功消费。

禁止借交接批量全量打开历史资料的目的仍保留。只有当前 owner 合同明确要求的来源或片段才完整核验；摘要不授予读权。**可选 memory 仍最多 5 条/2K tokens**，普通启动不运行 consolidate、不全量读历史的规则不变。5K 调整为单批预加载建议，必需来源在原读权限内分批处理；真实宿主/资源上限仍生效，无法完整消费须保留缺口并暂停受影响依赖，而不是静默删除来源或降低 gate。

这一闭包修复多处相互抵触的实际 consumer 文案，但尚未经过当前登记模型试验或采用审查。它没有被塞入 A 的 postimage，也不进入本次发布。旧写入脚本/样例路径等其他基线问题未改，不声称已全面修复 HP。

## 4. 冻结 patch 与字节绑定

三份 patch 均以旧 `05120197` blobs 为前像。A/B 可以分开审查；combined 只是组合参考，不代表要求整包采用。patch 清单、完整前后像及 OS 临时路径见下表与 manifest。

| 单元 | 冻结文件 | 范围 | diff 规模 | patch SHA-256 |
|---|---|---|---|---|
| A | [decision-state.patch](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-context-adoptable-63biqba7/decision-state.patch) | 仅 HP；当前交接 | 1 文件，+2/-1 行 | `5c1d6270cf0daceb1e9b4400991ef8fc77213c8333773cc37418b66c3cbf15bb` |
| B | [required-sources.patch](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-context-adoptable-63biqba7/required-sources.patch) | HP + office；独立候选 | 2 文件，+12/-11 行 | `9b4b22cb4ee5d09f36b050e3d784576d91bd09131b70ac6bb0f1aedb3044a56f` |
| A+B | [combined.patch](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-context-adoptable-63biqba7/combined.patch) | 仅组合参考；本轮不发布 | 2 文件，+14/-12 行 | `76417d8bb3fee4d28732d329a7a729a188db5ce63832139ab1db7cee8f42fbde` |

[patch-manifest.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-context-adoptable-63biqba7/patch-manifest.json) SHA-256：`72386fa16289bbc12358af0ef00f4bb4d7d68e181d4b4b11dc032e30ec71acdd`。其中保存旧 commit、计划 SHA、各单元路径及全部 postimage SHA。

| 文件/版本 | SHA-256 |
|---|---|
| HP 旧前像 | `0bfca8ef44e21e38ad22686e00dcf1000d70b59a848927633307f6846f06efa6` |
| HP A 后像 | `0ac7afe3bb49d3abc46a9a788b6f83ace5f745da82051c7a574737834ce8d03c` |
| HP B 后像 | `af81531d2ce0293f36789cfe8292ab57f3454f9dde5b9e549dc700cd3203b032` |
| HP A+B 后像 | `e3e75587cc48cedc25b19e2a9e588554da104f0eec254699f0c403ba1e160e9a` |
| office 旧前像 | `57d758ab23b304b590fd771a201c69d6263eb93c554fdeb243c45ace3a088377` |
| office B / A+B 后像 | `e3a2f5cb30781290251f6bf3ea443e4521594e837f73556d59e566c1c2548a36` |

HP 旧 8740 bytes；A 8911、B 9012、A+B 9183 bytes。office 旧 14954；B/A+B 15522 bytes。这些只是交付规模描述，不能用字节增减代替净价值、模型 token 消耗或效率结果。

## 5. 实际自测及其适用范围

1. **临时目录 patch 验证 PASS。** 三个单元分别执行 Git apply check、实际 apply、reverse check、实际 reverse；前后字节与 manifest 精确相等。另实际依次应用 A、B，结果与 combined 完全相等。总计 14 条真实 Git apply 命令均 exit 0。[patch-verification.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-context-adoptable-63biqba7/patch-verification.json) SHA-256：`3997edd95c5c1318ff61c990c64a65b8a93f4ade3eb1079483d8ec4dbf5f0905`。这证明冻结补丁可在旧前像上应用和字节回退，不证明生产旧任务迁移/回滚或模型正确性。
2. **改动界限核验 PASS。** office 在旧上游全局句之前的 frontmatter、Voice、Human Gate、completion、preamble 与自 Observability 起的全部后缀不变；HP 豁免、gate/criteria、write/checkpoint 部分不变；5 条/2K 可选 memory 限制保留。long-session 和 session-handoff 没有纳入 patch。
3. **现有 handoff 格式/gate 回归 PASS。** 本 checkout 实际执行 `node scripts/test-handoff-validator.mjs`，exit 0，输出 `PASS handoff validator positive and negative fixtures`；覆盖 1 个正常 fixture 和 6 个异常 fixture。tool chunk `0417c3`；原始返回、命令/cwd 和脚本 SHA 见 [handoff-validator-receipt.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-context-adoptable-63biqba7/handoff-validator-receipt.json)，SHA-256：`efd1c2e446b4ee5c29e08dc9eb981f42167d67eceb7161e936ed9b829b967ffb`。它执行既有 checker，不加载临时候选 prose；因此只支持现有格式/gate 回归，不支持 A 的状态继承或 B 的必需来源行为通过。

未增加镜像文案断言测试、扩大评估框架或重跑无关全套检查。文本差异和上述程序 PASS 不能替代非作者实际行为验收；root 通知的 J31 方法 PASS 也不等于本 owner 已核验模型输出。

## 6. 行为输入、判据与当前登记边界

此前已准备 [behavior-inputs](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-context-adoptable-63biqba7/behavior-inputs/current-owner-contract.md) 作为作者公开控制输入：D-01 ADOPTED（local report）、D-02 REJECTED（network publication）、D-03 PROPOSED（额外阶段未决），保留来源；两个必需输入包含 5 条记录/总值 36，另放 unrelated latest DONE 摘要作为 B 的反例条件。它们是 controlled input，不是实际项目 pin、真实用户新增授权、模型原生 checkpoint 或旧任务历史。授权与真实消费者必须由 root 在登记运行时实际绑定。

当前 A 的行为判据是：消费者产生交接时保留当前有效 ADOPTED/REJECTED 及来源；新建议保持 PROPOSED；不无故重问已有效决定；最新有效撤回/更正优先；不把历史同意当当前执行授权；不发生未授权工具/外部效果。root 负责公平的旧新输入、约束与模型配置绑定、跨宿主资格和非作者实际输出/动作判定。旧规则仍可能被其他上位合同纠正，不能预先假定“旧必失败、新必通过”。

[原作者 root-only-judging.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-context-adoptable-63biqba7/behavior-inputs/root-only-judging.json) 的“两次 combined 对照”是**已被最新 root 调度替代的早期提案**，不是当前 4 次登记方案，不能作为运行配置或把其 B 断言合入 A 得分。它保留为来源记录，未执行；其中判据不得放进待评模型的提示或冒充人类决定。本 owner 没有新注册或运行模型。

B 将来独立检验时需观察全部必需来源/尾部记录实际消费、精确路径和版本/gate、缺失/失败/读权不足时停住受影响依赖，以及 standalone 不造 state。当前小输入不测试实际 >5K 模型 token 容量；负面条件未实际运行不得报覆盖。以前 N-B/N-C/N-D、synthetic trace、J18 静态检查或原整包结果均不自动证明本补丁的旧新净收益、迁移安全或连续负责能力。

## 7. 集成与剩余验收

ready 已把 A 的 patch、前后完整文档路径、SHA 与局部验证冻结交接。集成前由 root 比对实际工作分支前像；若当前 main 的对应文件已漂移，应按真实字节重新定位、审查和验证，不 force 套旧 patch、不 reset 或覆盖用户脏工作。B/combined 继续保留作者临时目录，不混入本轮发布。

R-U014-3 C1–C5 仍由 root 完成：实际旧新可观察收益；关键职责/异常/恢复保持；静态、程序、模型与效率证据分开；跨宿主/仓库及非作者最低闭包验收；最终 remote/main 与 dirty 状态核对。当前完成的是可审查修复及局部自测，未完成的行为/独立采用/发布门禁不被本报告越过。后续若 A 通过而 B 未证实，可只采用 A，无需带回原 17 文件候选或强行包含三个模块。

<!-- FILE_END: u014-context-adoptable-fix.md -->
