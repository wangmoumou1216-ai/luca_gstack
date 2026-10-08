# Hook 体检与更新链路修复

## 最新收尾状态（2026-09-30）

DONE：受审revision3七文件已启用，单根安装与11项精确信任更新成功，其他3根记录保留。旧会话曾被摘要门真实拒绝；重启后当前会话真实工具、健康检查、官方11/11信任读回成功。正常Git提交门107 PASS、0 FAIL、0 WARN、1 DELEGATED，完整暂存快照检查通过。七文件逐字节匹配受审版本，提交1ea5d2364cb2b706e8183b3a51ea079b6a1c71da已普通推送到main，独立远端SHA核对一致。同SHA的CI 36698317713已completed/success，全部6项含Required Checks通过。

本节覆盖下文历史阶段中的“未授权/未启用/不提交推送”；最新直接人类指令已授权本任务发布。完整审查与当前运行/发布证据见PRE-RELEASE-REVIEW.md和publication-result.json；历史原票、冻结范围及备份不改写。Direct问题已在实际Muse/Direct组合精确刷新11条信任并通过GUI启动；不由同步母仓推断任何独立配置目录已授信。

状态：发布前专项review追加后，两轴初审FAIL发现的问题均已在隔离候选revision3修复；终版Standards复核PASS5/5，Spec冷审PASS8/8。生产启用尚未获准，真实会话仍待验；生产源、安装和信任未由本任务修改。无下游项目绑定。此前revision2的8/8不代表新包放行。

## 问题与证据

1. 截图的 `hook source integrity mismatch` 来自注册命令的源码总摘要门。取旧 HEAD 注册的 PreToolUse shell gate 对当前源执行：exit 2、目标错误原文；当前注册执行：exit 0。`node scripts/test-hook-source-digests.mjs` 的 11 条注册全部通过变异/恢复验证。它涵盖测试文件，正常维护也会使旧命令失效。
2. 当前生产注册摘要为 `a229918d10266b91b6205ec46efb8ab65e3d612b3bd5458762caad617cecebf3`；安装 manifest 的 JS 差异为空，bootstrap/loader 一致；官方新进程 11/11 trusted。单凭这些只证明当前磁盘/新进程一致，不能证明旧会话已刷新。
3. 新发现并红测：原 `scripts/codex-trust-hooks.mjs` 在任何源健康检查前即可写入 trust，或因全部已授信直接成功。隔离测试在源码失配时仍获 exit 0，失败信息为 `source drift was accepted and trusted`。这会把授信状态误当成运行准备状态。
4. 用户要求联合跟进的「排查自动审批阻断」会话为 `01a0f05f-e05c-7693-b844-326c9eb66b75`。已读取并同步证据。对方的 13 文件模型路由修复已启用；它报告重新加载后真实 cold review 4/4 通过，未再出现模型关系未知、候选边界或源码摘要错误。对方负责其发布；2026-09-30 原生进度回执报告六项远端 CI（含 Required Checks）全部通过。本任务仅处理源健康与授信前置检查。不存在互相接管或共享发布授权。
5. 用户补充的“红队启动后被阻断”已有独立原始记录：`/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/reviews/R10-review-aggregation.md`。红队 actual ID 为 `01a0f0f6-b8ab-79c1-83c7-546334da55ee`；3 PASS、4 UNKNOWN，turn interrupted，无 accepted 回执。恢复记录显示 HEAD 仍为 M0，但工作树模型路由/Hook和 runtime activation 已变化。与共享源维护窗口相符；缺少逐文件时间证据，不能断言某个文件或某个写入者导致这张票中断。现有源码摘要门的行为已直接复现。
6. 独立终审第一轮发现本任务 health 草稿自身两个假健康缺口：未枚举 `.claude/workflows` 等摘要目录之外的新增 JS、未核对受保护 Stop 恢复的五个文件。已分别以实际 loader 拒绝和恢复文件丢失/篡改红测复现，现已修复；原 FAIL 7/8 票及初版冻结包保存在 round1，不改写旧票。

## 历史验证与边界（revision 2，不是当前候选）

基线已由兄弟会话提交为 `0c56460e5a0761b7caaa7b628a1bf22fd57a2c09`；七个目标逐字节前镜像仍匹配，本任务未应用生产源变更。
`health-tests.log` 28/28 PASS；`source-tests.log` 4/4 PASS；`digest-tests.log` 11 条门禁变异/恢复 PASS；`hooks-tests.log` PASS（退役 read-grants SKIP）。新增两类回归先红后绿，红测保存在 `health-review-red.log`。
补丁 revision 2 SHA 为 `faa9282bb2aacf2a9da738fa358632d400170fdeb10da8215921bedc3a644b19`，最终源码摘要为 `40a3fec4f9a68166a52cc52464ec3f4a18977fcd4c04e41b645d6f1b2f7a23f1`。
对当前生产源执行新版只读检查结果为 PASS：11 条摘要一致、全仓已审 JS无漂移/漏项、Python/规则快照一致、5个恢复文件一致。该结果不证明已有会话缓存已刷新。

最小完整方案：只读分层诊断 + 授信前拒绝不健康源 + 隔离开发/受审维护窗口 + 更新后真实会话验证。
README 与 ACTIVATION 明确了共享根在途审查的协调条件：完成或明确暂停后才启用，维护期间不派新审查。
这是一项操作先决条件，不是自动锁：本补丁不会检测所有 CLI 会话、热替换正在执行的 Hook 或实现不中断更新。
若未来必须支持共享根任意时刻更新而不影响在途会话，需要另行设计每会话不可变运行时版本；本次不以临时绕过摘要门代替该架构。

## 最小方案与执行计划

前提：保留 fail-closed。重启只可能刷新旧会话，不能修复磁盘失配。删除校验或自动批准当前源都不可取。
模式：Sequential，主执行继承 anchor；独立方案/终审使用已登记 quality-gate。无产品设计场景，无上游 task-plan。
Source：用户“检查问题，明确问题，拓展 hook 是否还有其他问题。体检，给出最佳方案，然后解决”。

- Phase 1：复现与邻接体检。完成：源码保护/精确授信/多根保留 18 tests PASS；`check:hooks` PASS（退役 read-grants 明确 SKIP）；Codex 静态接线 21 PASS、0 FAIL，真实启动项未由此脚本执行。当前生产会话启动证据由上述兄弟会话另行报告。
- Phase 2：隔离副本新增只读 health，核对注册摘要、JS manifest、受保护 runtime、Python/policy snapshot。在 trust 的查询前、已授信早返回前、写前和完成前核验。回归与 mutation 先在隔离副本执行。
- Phase 3：独立审查最终包；列出每个 live 文件前后 SHA、最终摘要、11 个 trust 变更和回退副本。获得精确启用权限前包留在隔离副本。落地拒绝任何基线漂移；新文件必须原先不存在；部分失败只回退仍匹配本次写入 SHA 的文件。

可执行 BLOCKING（隔离根）：
```sh
node --test scripts/test-codex-hook-health.mjs scripts/test-codex-trust-hooks.mjs
node --test scripts/test-source-guard-preserve.mjs scripts/test-codex-child-hook-integrity.mjs
node scripts/test-hook-source-digests.mjs
npm run check:hooks --silent
```
criteria：C1 每个发现有直接行为证据；C2 保护不弱化且无自动授信；C3 既有修改完整保留；C4 区分磁盘、新进程、真实会话及未验证面。BLOCKING 失败先修复，不发布。

## 续点与所有权

隔离根：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-hook-health-2xlmvokq`。
基线：隔离根 `baseline.json`；读取了原始每个目标文件再编辑。
目标：`scripts/codex-hook-health.mjs`（新）、`scripts/codex-trust-hooks.mjs`、`scripts/test-codex-hook-health.mjs`（新）、`scripts/test-codex-trust-hooks.mjs`、`scripts/verify.sh`、`README.md`、`.codex/hooks.json`（仅摘要）。
本任务不改既有模型路由源码，不改 `framework/`，不读写共享项目别名，不提交或推送。兄弟会话可能提交现有源；最终启用前按文件内容重新核对，不以旧 HEAD 代替工作树前镜像。

方案初审要求修正激活顺序；delta 已 PASS 5/5。隔离验证已完成；终审第一轮 FAIL 已修复，revision 2 独立终审 PASS 8/8，原始判决保存在 FINAL-REVIEW.md 和 hook-health-final-20260930-02.json。之后仅剩精确受审启用与活体验证；启用前先协调所有共享根审查。

## 后续推进

用户追问停止原因后已继续推进：核实原始人类跨会话沟通授权，协调当前专家正常完成、accepted落盘后暂停后续派发；其调用现已实读accepted，四个相关根零pending。启用执行器默认成功/失败路径均为只读，独立复核PASS 5/5；补丁/归档/前镜像及生产安装预检通过。精确启用问题已通过交互卡片提出，尚未收到回答。仍未运行--apply、未改生产源码/安装/信任。

## 发布前专项review（revision3，当前候选）

### Standards

初审FAIL3/6：Python优化剥除启用安全assert；完整注册命令损坏仍假健康。两个问题已独立复核闭合，终版候选PASS5/5，完整报告release-review/standards-02.md。

### Spec

初审FAIL1/8：模块格式错误仍假健康；官方查询中注册漂移未被已授信/dry-run早返回发现；清单目标/新文件标记未绑定导致失败回退可误删无关文件。三项在候选中修复，终版Spec冷审PASS8/8，三项独立闭合于release-review/spec-02.md。报告release-review/spec-01.md保留原判，不能改成PASS。

### Axis summary

Standards初审2项Important，终版无残留actionable finding；Spec初审3项Important，终版无残留confirmed defect。生产release readiness保留待验。

完整注册协议指纹固定事件、matcher、完整加载/Stop恢复、超时与上下文上限，只随摘要更新；模块格式按安装器的源扩展/最近package规则重算。额外检测Node同步加载能力，缺失registerHooks拒绝安装健康。

终版SHA：scope f3271a935f013b987d2577ecaa8eb0def22040a8686c9be51f40ec941018d3ff；patch3d90329de723ab5720769576e66f9a2c92ec0568a7920f8658a8da7ce8504729；源码摘要e2ca1945db477cc2f1cf073c80e34c8cb58c4f25d9ac2fb5a1d48d0982f59691。只应用准确7个源目标，audithelper独立绑定清单核心与目标allowlist。

行为证据：体检/授信32/32；单根安装与原生摘要保护4/4；11门禁变异/恢复；npm check:hooks通过（退役read-grants仍SKIP）。四种新门禁移除后均被真实回归捕获。启用真实默认/优化只读预检66文件字节和mtime不变；内存失败注入3/3。Stop恢复正常/缺失文件两种隔离实际执行均continue:false。

这些证明候选与隔离运行，不证明旧会话缓存、官方新11条trust或实际原生工具已运行该候选。维护前须协调暂停、无真实在途agent、人工授信批准；启用后fresh官方读回与旧会话实际工具验证均通过，才可称部署闭环。无Git发布授权，本任务不提交/推送。
