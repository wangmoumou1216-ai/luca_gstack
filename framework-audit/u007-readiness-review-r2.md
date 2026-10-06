# J06 实际独立审查返回

作者：/root/a_gate（quality-gate）；由 root 按实际最终回复保存，不改写为 root 自签票。原 envelope 的 output_paths=[] 保留。

**J06：两处离线修复 PASS；正式比较仍不放行。** 七文件审前、审后摘要一致。

- **R1 PASS**：正式运行缺权限对象已在启动前拒绝；引擎 `INVALID_RUN` 状态或标志均传到顶层及 CLI 非零。亲自执行定向测试 **7/7，exit 0**；候选漏交仍保留为可评分失败。
- **R2 FAIL**：真实模型命令边界未证；B/S 的 active-rule 加载依赖仍缺失。P05 超预算保留，但不足以认定全部简单任务不可测。
- **R3 UNKNOWN**：当前没有可直接执行、能避免重复 P05 的新版 P06 配置；MCP 元数据不足以证明节省或运行隔离。
- **R4 FAIL**：本票只接受两处修复，不能释放正式比较、生产替换或宣称用户全目标完成。

**唯一优先下一步：root 明确批准一次有界准备工作，补齐并冻结 B/S 的 `get_rules.py` 必要只读依赖与相关规则输入，验证副本和源入口输出一致。** 先保留 P06；不得把缺材料造成的失败计成 B 的真实劣势。原三个模块的实施、验收及最终提交推送责任继续保留。

## 原始 findings

1. R1 PASS — driver.mjs:182–184现在对所有非probe阶段要求native_command_permissions.effective_probe非null；development/hidden缺整个对象会在创建run目录及spawn之前抛出NATIVE_EFFECTIVE_PROOF_REQUIRED。后续validateNativePermissions仍校验对象、profile、证明结构和hash。driver.mjs:589–591对engine.status=INVALID_RUN或engine.invalid_run=true任一条件传递顶层INVALID_RUN；CLI:662据顶层返回exit1，嵌套engine原始错误保留。

2. R1 亲自验证 — node --test --test-name-pattern=W22 scripts/tri-system-eval/driver.test.mjs，工具1ec69a及2d49bd，7 pass、0 fail、exit0，8414.611125ms。覆盖development/hidden对象整体缺失且spawn次数0、两种引擎无效表示、两种公共CLI非零路径及候选失败仍有效记录。CLI通过临时fake-bin/codex与临时模块执行，未调用真实Codex模型。测试验证公开结果与退出码，不是字符串匹配。

3. R1 跨模块证据 — u007-w23-backup-6cd0udmw/red.json、red.tap绑定旧driver 8b6152…和当前integration测试fa583c…，三个反例真实失败：两次Missing expected rejection，以及engine INVALID_RUN而顶层COMPLETED。green.json、green.tap绑定修复driver ce5372…，同反例通过；真实case_read在临时文件chmod000后产生EACCES，原错误及工具失败回执保留。green同时证明候选未交产物、INCOMPLETE_PROTOCOL仍为RECORDED/COMPLETED，非语义PASS。该GREEN使用旧conditions 211c7d…；R4当前conditions只新增缺失能力声明，实际差异已核，不将作者日志冒称最终全版本重跑。

4. R1 未扩大通过范围 — 引擎status和flag的纯driver/CLI路径亲测，真实EACCES跨模块路径采用已核原始日志；没有新模型边界、全部异常组合或原生协作证明。offlineProof及permissionFixture只生成假证据供fake transport，当前测试不会将其交真实模型。证明消费者仍依赖root/J对实际内容的信任审核，hash与ACCEPTED字段不是行为认证；不得把本次离线PASS当effective_probe。

5. R2 FAIL（正式可比性仍欠条件）— 两处已知实现缺陷已闭合，但隔离未证与基线材料缺口尚在。P05没有commandExecution或产物，P02仅命令沙箱证据，当前不能接受模型原生命令硬读取边界，也不能以独立command/exec替代。真实子Agent权限、全链遥测、fresh恢复及另一Codex入口的结论仍须按用途限域，不要求为了放行一个无该依赖的用途先跑完整宿主矩阵。

6. R2 材料不忠实的具体范围 — conditions.mjs缺失声明是披露而非修复。源office/SKILL.md:23以get_rules.py office '*'加载；140–145规定每个skill核心逻辑前加载规则；179–190要求通过get_rules.py过滤当前skill/scene并遵守active rules。当前B/S副本缺这个脚本及其未冻结读取依赖：进入office/skill执行、领域owner要求相关规则加载的用途不具忠实基线。preamble的||true可以掩盖进程错误，不能把无输出等同源环境确实无规则。纯有界任务未触发skill执行时，不应仅因这个缺口宣布整题无效；须依据实际轨迹判适用性。现有证据未给出源入口相关规则为空的证明，不能假设全部保护用途已覆盖。

7. R2 候选失败与设施失败 — 漏交、答错、正常自检成本、合法慢执行或超过预先统一上限，本来可以成为比较结果，不要求所有候选先成功。driver仍会对预算触顶使用INVALID_RUN顶层标签；下游必须按原始原因保留全体尝试分母，不能仅筛COMPLETED删除合法预算失败。EACCES等试件I/O故障、错误阶段投放、缺失基线资料、未证隔离则属于设施/有效性问题。恢复性依赖失败和被拒绝候选动作必须继续保留，设施代为挡住错误不等于候选控制通过。

8. R2 对J05方法判断的收窄 — P05首次input19100，累计59541，五次动态工具后到work_ready；这说明该次探针在执行目标命令前已触顶，不能证明所有简单任务不可测，也不能证明原生T或框架必然劣于其他条件。公共握手、模型选择的额外读取、原生提示/工具开销和传输重试可能共同影响；现证不能分离归因。J05原FAIL保留，但不以一次成本失败作为永久阻断所有合法比较的充分理由。不得重新贴heavy、减掉共同开销或调整失败分母。

9. R3 UNKNOWN（当前P06可执行资格）— MCP三份安全JSON显示codex mcp list --json在进程参数关闭context7/pencil/shadcn时只有三项enabled改变，退出后恢复原默认；node_repl/cua_repl仍启用。该证据支持具体配置可被CLI列表解析，未证明app-server工具列表、网络/文件边界、保持T所需能力或节省多少token。R4 driver并未接入该配置，也未改变重复读取或mandatory_checkpoints。现在直接重复P05缺乏新的判别因素；本票不建议立即消耗P06，不把未实现配置写成可启动run。

10. R3 唯一最小前置动作 — 先修B/S active-rule材料闭包，而不是再加握手或放宽预算。root应明确授权一个限定准备调用给原路由owner：仅核get_rules.py的直接只读依赖及被选case实际涉及skill/scene的相关规则输入，补充版本化源冻结与条件复制；不导入observations长历史或未授权私人状态，不改生产规则、不激活停用hooks。用源入口和隔离副本在相同相关输入上的规则输出/退出/依赖身份比对验收，确保脚本缺失不会静默变成空规则。旧U002和R4留存，新source manifest/material hash重新绑定。该工作可以揭示规则确实为空、存在实质规则或依赖越界；不能预先保证一次调用足够。

11. R3 后续真实验证的唯一目标 — 在上述前置闭合并明确冻结可执行配置后，P06仍应只检验模型实际commandExecution是否在相同profile下执行合成脚本、合法读成功且越界读/符号链接/直接写/OS子进程拒绝，并由动态工具保存真实结果、核终态和全链资源。绑定当时driver/conditions/protocol/case/源清单/material、Codex二进制版本、精确profile/runtime roots及有效配置；资源不超过原simple上限。若采用三项MCP排除，必须先有root明确的实现/冻结决定并在该次实际app-server回执核生效，不能由此关闭文件/计算/获准协作、全局规则或技能。一次成功只能改变命令边界决定，不能同时证明B完整、真实子Agent或净收益；再次超限则保留该配置/输入下失败，边界仍未知；越界成功则该入口边界失败，不靠扩权重试。

12. R4 FAIL — 正式development/hidden release不通过，生产替换不通过；R1两项修复可单独接受，J05票及全部失败原样保留。仍欠适用用途的合格B、真实模型命令边界、最终版本/配置冻结及独立实际证据验收；涉及协作/恢复/迁移的用途还欠其对应证据。不能把静态测试通过、维持现状或不可测报告替代三模块实际落地、测试、独立验收及最终统一commit/push目标。

13. R4 资源与实施责任 — 补充6是现行root资源决策，当前work23/23、review/advice本次8/29、总31/52、行为5/144、探针5/6，正式0；不能继续用旧20上限作为当前阻断。建议的有界B修复不是本票授权：root需明确解决准备调用余额，例如在总52不增前提下再从剩余review/advice重排1次为准备，并登记修订及删减代价；不得自动挪用或无限由root代写。准备后独立复核仍扣review。原三owner继续承担路由/编排/Context实际落地责任，root负责单一集成、释放与最终提交推送。

14. 审查完整性 — r2任务卡/manifest及全部列明输入身份一致。旧R3七文件摘要与J05冻结一致；完整冻结diff已读。不同diff算法对重复括号的匹配位置不同，直接字符串比较不相等；在内存逐hunk应用冻结diff可精确重现当前五份变更文件，两个case-protocol文件未变，无隐藏额外差异。审后七文件hash再次全部一致。一次组合输出发生截断，受影响当前integration函数段198–284及335–378已补读；未将截断当完整读证。旧要求按J05已验版本复用，没有重新全量加载。

15. 实际成本与限制 — 开始2026-10-02 20:26:24 UTC，结束2026-10-02 20:28:45 UTC。7次functions封装、7次exec_command、1次write_stdin、2次时钟，保守17动作；一次定向离线测试调用，0新模型/探针/网络/Agent。工具报告原始输出合计约30.3k token，包含截断未显示部分；模型实际总usage/金额UNKNOWN，未将工具输出估计当计费遥测。除获准测试自动生成并清理的临时fixture外，未写产物、实现、eval-log或recorder；本报告交root保存。

完整原始结构见同目录 u007-readiness-review-r2-envelope.json。

