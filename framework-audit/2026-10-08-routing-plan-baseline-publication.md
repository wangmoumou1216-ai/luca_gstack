# 路由与计划基线有限返修（U007-BASELINE-R1）

## 批准与范围

真人在主会话选择“采用有限范围：修复、核心验证、发布并同步（推荐）”。原始用户消息msg_01a118f7-2a0e-7733-bb7d-8d0112b3413e，2026-10-08T00:43:33.774Z，问题call_6b9a4aa065034d229eb2b7151247a4ca。有限范围为12个源码/测试/CHANGELOG路径及本案framework-audit元数据；批准复用不替代检查，不由普通JSON产生权限。

旧三笔8f01b5f、02ff7ce、5956da6保留，正常合入已发布AOR主线a0b8132。保护另一会话脏树及Desktop两文件部署；不使用reset、stash、force、历史改写或hook绕过。

## 源码与行为证据

- B1：统一Supervisor/Hierarchical摘要和表格批准要求；严格handoff只接受真实PASS，拒绝UNKNOWN/重复/非法字段、注释/围栏及证据中的伪PASS，保留非strict兼容。
- B2：兼容`--judge`入口但明确标签审查；全部23项校准和上下文进入实际队列；空白输入、非法/退役目标、零分母等实际CLI反例失败，历史成绩保留。
- B3：原12家族、24RP/3PO保留；新套件两臂公开提示和限制相同，实际production hook注入并保存源码与输入输出绑定；执行目录排除评分器和标准答案。PO要求真实计划正文、U-block、依赖、正反例断言，PO-02保留前版计划、变化scope及未决偏好。缺失/错误native模型证据拒绝。
- 合并后的五项核心检查均实际退出0；Agent合同135/135，production hint48项。严格handoff、eval输入、新suite对称性及计划产物有实际变异转红与恢复转绿记录；变异仅在owned临时副本执行。

独立phase票均有实际native completed与同次invocation accepted；它们只验有限源码与离线结构合同：

| Phase | 票 | Invocation | Receipt SHA-256 |
|---|---|---|---|
| B1/v2 | PASS 5/5 | `bf39fb3e-896a-4f2d-8503-f1506035b5b7` | `f389468a93dc8e8e2868fee35db0a3176d2420f2baf49bb8c6fbe535af8ee3b6` |
| B2/v1 | PASS 5/5 | `8768b048-f9e7-4125-ae82-684fe94ddb8f` | `25fc9b954cbebc591c5dc1ddbb2b7f94d2b40ac9f92fd346081c0cb4997f2fb1` |
| B3/v1 | PASS 5/5 | `7b34da42-5ef4-4ba3-9164-8fb2baed7ce3` | `b5f89079493248228677862d26d8c3ad8e01cff6aaf5f188e5ba13d4ab6216da` |

B1旧v1 FAIL、原Standards FAIL13/16、原Spec FAIL6/17及其UNKNOWN保留在独立审计证据目录，没有以成功票覆盖。最终发布还必须通过终版Standards→Spec冷审、正常pre-commit、immutable commit完整`--ci`、独立publication gate及exact-head六项远端CI。

## 历史与未完成项

原17项验收分母、A1/A2/A3/U5保持未完成/UNKNOWN。本次没有运行旧96RP/6PO原生矩阵，不宣称完整整改DONE、双harness行为一致、实际语义命中率或普遍性能提升。Claude adapter/live仍延期；普通可写票据不作为自动首次派发的可信native授权。

档案内容模式筛查实际读取2030 net blobs、37,612,579 bytes，以7类凭证模式查得零命中；这只是模式筛查，全面隐私验收仍UNKNOWN。实际敏感发现阻断发布，不把零命中当全面安全证明。

AOR24固定postimage保持已发布字节；Orchestrator/Office恢复已审旧基线投影。check-agent-contracts与CHANGELOG两处重叠由终版实际135检查及冷审闭合，不覆盖AOR完成、额度、取消或身份合同。

Desktop最终仅允许在远端包含5956与AOR祖先、发布门均通过，且HEAD/index/两份owned部署字节无漂移时，逆向精确v3补丁并ff-only到同一origin/main。任何漂移先停止，未授权其他本地工作均保留。

## 后续失败与完整字段返修

B4 Spec v1 FAIL6/8、受影响B3 v2 FAIL4/5均保留实际native completed/accepted原票，不按phase/version重置两轮计数。返修补RP04明确PRD/原型/Figma与评审对象判据；PO正文与结构字段采用公开规范投影，行为命令限定真实正反例suite。随后把failure_policy、自检、criteria及外部阻塞完整绑定公开source constraints，禁止在自由字段伪造批准、忽略失败或反转依赖。三个守卫均实际mutation转红、恢复转绿。

真人于2026-10-08T02:12:03.040Z，消息msg_01a11948-2d5f-7631-9f84-99f705720b8d明确授权“允许一次终版验收，通过后发布并同步”，对应call_66b5a8859ad14b17aaedc6c5f68c09a5。范围仍为原12与既定效果；新Important再次出现即停止，原17/完整native边界不变。

## 冻结终版有限12路径

| Path | SHA-256 |
|---|---|
| `.claude/agents/plan-agent.md` | `c365270a5f8c399bbc1013419f8467ee02f0cc252a85c4cadf860fd96cca3d08` |
| `scripts/check-quality-gates.mjs` | `a188758922c6a764a0d64fe9a1461e2f2e3edc9433ed8ff8b9ece1b1afaeaae8` |
| `scripts/test-quality-gates-scope.mjs` | `819d68139b7f09194b368b77b7e64d87ec12b290175088c6c8e0a969c70d34d7` |
| `scripts/check-agent-contracts.mjs` | `30c6b8c0fb0bd6ebaa81da3c5f3dc743b5531471022c9b38cd10b7fae334401e` |
| `memory/scripts/eval_routing.py` | `69d1c52ac4010b09c9ed9667b4070b81083530963b662ea252fe288710b567a3` |
| `memory/evals/routing/fixtures.jsonl` | `8c3b769a4578230a26a168a6c689dfc35102c93c063ec62fe1c6d5f2f56890a5` |
| `scripts/test-eval-routing-contract.mjs` | `1141d8b8876f39ec87fe1819951bd492fa9b9d6b32a5eaef9609cc3f7eb33f6d` |
| `scripts/routing-plan-v1-suite.mjs` | `f52ec610ea04e1d149acc5c1b683d0c3fdcd45036d3417e8043c8ed54055d53d` |
| `scripts/run-agent-context-ab.mjs` | `b3fb50f06f32f83be79219168dfe638613a8143d15c748c1aa3614fbe925dcf9` |
| `scripts/test-routing-plan-v1-suite.mjs` | `2bb40fdd27ebf403a9918b82029517a5118de714bd1ad4732a2433ca2460bc49` |
| `scripts/test-routing-candidate-hints.mjs` | `d57195a19a03cf6c22b1016554299fb10b8483bd2de972d3ce6a7d4fe584e14a` |
| `CHANGELOG.md` | `15ed88fa5d8c4447c9059ee811de6e01881f9887b1ec3dd78ad24e29cf6df8ff` |

## 两项最小补修恢复与当前版本

B3 v3 实际 FAIL3/5：DONE 单元 verification 仍可伪造批准；旧 v2 变异与当前 driver 不匹配，相关证据 UNKNOWN。失败票完整保留，未以旧 PASS 覆盖。随后真人在2026-10-08T02:28:50.153Z、原生msg_01a11957-8b69-7562-931e-621dba883374明确指令“那你解决啊”，在已呈现两文件具体提案后恢复原有限补修、必要验收及发布同步。

仅移除 DONE verification 豁免，并在现有完整产物反例中加入第一个单元的伪批准/跳依赖验证；DONE 状态与历史结果不变。正文投影、合法行为命令、DONE verification 三个守卫使用同一修复后 source/driver/public input，实际目标 AssertionError 红、恢复原版绿；日志和清理后哈希均保留，旧 v2 只作为历史。当前两个源码 SHA：

- `scripts/routing-plan-v1-suite.mjs`：`742684597e7d94f91a9e7da071f995d3d4111834320e77212813811571f98fdb`
- `scripts/test-routing-plan-v1-suite.mjs`：`1f10f44b6afba980569a234eca06055f44954641726a77d41cf9908bd79cf469`

其余十个源码 SHA 与上一冻结表相同。当前独立验收进行中，本条不预报 PASS 或发布完成。原17项、A1/A2/A3/U5及完整原生矩阵未完成边界不变。

## 终版需求核验新增 RP 反例与同范围修复

终版 Spec v4 原票 FAIL7/8：新套件合法 Codex model/effort 被旧 G5-only CLI 条件拒绝；旧 baseline 行为失败继续/candidate 停止规则用于新套件，违反两臂相同失败策略。原 B3 v4 PASS 保留其旧源码范围，不能替代修改后终版票。

当前只修既有 runner 和既有 driver：新套件允许所选 harness 的合法 pins，其独立校验仍拒绝非法/缺失 live pins；新套件两臂使用同一个真实队列停止谓词，legacy baseline 测量及 G5 原义不变。两臂 self-test 驱动生产 runTaskQueue 的同一已绑定策略，首个行为失败后1项执行、2项未派发；不会产生新原生会话。合法 Codex pins 的真实 describe 入口和两个精确守卫变异由当前版本独立检查，终版验收尚待实际结果。

当前受影响 runner/driver SHA（替代上一版本这两项，其他十项保留）：

- `scripts/run-agent-context-ab.mjs`：`e20ac5baf21132282e417e786b60c60de2d6caeb77e723f3a965ae442febc6f9`
- `scripts/test-routing-plan-v1-suite.mjs`：`6bbc6307aff55369d523fefa87eb3d33326e8c3bf53396fa367f99033efb73d7`

五个精确守卫均使用当前 source/driver/input，实际目标 AssertionError 红/恢复绿，源码前后未漂移。此前未正确等待的 pre-repair 观测尝试作为 UNKNOWN 保留，不作为转红证据；采用本轮隔离副本的实际日志。终版 Standards/Spec 待实际完成。

## 发布基线外部变化及精确迁移

Desktop 已由其他操作普通合并为 5edc74ac87c184d166e64320db1dc1e7cab91ebd（parents5956+06b1293），且工作区干净。远端06b1293继承AOR a0b8132，仅新增三处与有限12不重叠的host-launch/project-session/test-host-launch修改。旧Desktop5956+owned2的逆补丁前提已失效，本任务没有应用逆补丁。

保留旧pending候选原样，新的独占候选以5edc74a为base，仅精确传入终版12源码和本案3份元数据。独立Standards/Spec v5票仅绑定相同源码bytes，工作树和提交身份在迁移记录、完整normalhooks/immutableCI及独立publication gate重新核验。最终普通发布必须保留5ed及原三笔/AOR祖先，Desktop只作ff-only。原17/原生矩阵及全面隐私边界不变。

## 当前有限源码验收实际闭合

- U007-BASELINE-B4-standards-native-result-v5.json：PASS 6/6；native completed 与同次 accepted，invocation `6548a596-dd71-4ed3-9a0f-56e469e1971a`，receipt SHA `40aacc333d446d9bc50fed21ba63dc03b8daa98bc9098cdcda861ee865b90eae`。
- U007-BASELINE-B4-spec-native-result-v5.json：PASS 8/8；native completed 与同次 accepted，invocation `8bf86f8b-c403-4dda-9267-58d0ba9ef112`，receipt SHA `2e856b90e606d42c62672646c407570312e27c5e3a0544447a12e17e9134dc52`。

仅本有限源码与离线合同验收通过；原失败和 UNKNOWN 不改写。正常提交、immutable CI、发布门与远端六项 CI 尚待实际执行，本记录不预报成功。
