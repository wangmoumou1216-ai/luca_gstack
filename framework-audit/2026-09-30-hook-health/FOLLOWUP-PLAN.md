# 两项 Hook 问题的增量修复计划

执行模式：Sequential Chain，主 Agent 执行；独立审查按原生关键调用串行闭合。
人类授权：此前完整修复、review、提交推送授权，以及本次“你把这两个问题解决掉”；最新范围包含 system / sidecar / direct 三模式。
框架维护保持 NO_PIN；生产源码基线为 1ea5d2364cb2b706e8183b3a51ea079b6a1c71da。既有无关 dirty 文件不进入提交。

## U-PROFILES

读取安装版实际连接配置，逐模式核对当前实际根、binary、CODEX_HOME 和官方项目 / Hook 授信。
已完成母仓 / Direct 的官方 CAS 项目授信 + 11 项 Hook 精确授信，进程门禁 PASS；system 11 项仍 trusted。
发现 canonical v2 与 legacy 均遗留失效的 E2E Sidecar 路径，正式 ~/.local/bin/codex-luca-aihub 和 ~/.codex-aihub-test 存在；须通过应用合法设置事务恢复实际 Sidecar 路径，不能直接改活动 settings 控制面。
不得读取 / 输出凭据值，不改连接凭据，不扩大到未使用 root/home 组合。
断言 P01：三模式实际配置与读回一致，失效测试路径被修复。
断言 P02：三模式各自实际使用组合的 11 条官方 Hook 精确 trusted，宿主门禁通过。
断言 P03：安装版应用分别实际新建空白会话通过；Mac 锁屏时保持 GUI 未验证，需真实解锁。

## U-TEXT

在隔离候选根修改正文 / 目标判断，不热改当前运行中的受保护 Hook 源码。
最小方案：只识别完全静态、带引号 heredoc 的 Python 单次 pathlib 文本写入语法；只遮罩 write_text 的字面内容，真实 Path 目标仍交给原有路径隔离逻辑。动态目标、f-string、附加语句、非静态路径和任意解释器代码均不享受豁免。
原 handoff 契约已规定结构化文件写入，继续保留。
候选源范围：.claude/hooks/project-scope-guard.mjs、scripts/test-project-scope-guard.mjs、.codex/hooks.json、README.md；若实际需要扩量，先记录具名 delta。
具名 delta（独立 Standards 初审发现）：新增 scripts/test-project-gate-v34-mutations.mjs，仅为隔离执行树复制新正式用例必需的真实 Codex adapter；不改变变异判据。最终源范围为这五个文件。
断言 T01：临时目标 + 正文引用 docs/state/topic，在 Claude 与 Codex 适配入口均保持正文原字节并放行。
断言 T02：真实共享目录 / sidecar / framework 目标仍拒绝；有 pin 时只重写目标，正文原字节不变。
断言 T03：动态 / 多语句 / 未解析的解释器代码不遮罩，保护负例拒绝。
断言 T04：新行为先红后绿；遗漏遮罩 mutation 应红、恢复绿。

## U-REVIEW-RELEASE

冻结精确候选文件 / 基线 / digest / patch；运行全部对应回归与仓库验证。
用 code-review 的独立 Standards / Spec 两轴冷启动审查，不给实现过程；一轴失败不得启用或发布。
通过后才安排一次性受审启用：源码、注册摘要、保护安装、实际三 profile 信任必须一致；保留其他 root 与配置。
用户既有发布授权适用于聚焦普通提交 / 普通推送；不 force、不清理用户 dirty 文件。
断言 R01：同一候选的代码、测试、注册与安装健康通过，独立审查闭合。
断言 R02：正常提交 / 推送且 exact commit CI 通过；启用后磁盘 / 官方信任 / 实际会话的证据独立记录。

当前执行：U-PROFILES 配置取证与 U-TEXT 隔离准备。Mac 锁屏是 GUI 验证的明确阻塞，不能把配置 PASS 外推为界面 PASS。


## Replan R-CODEX-CACHE-1（2026-09-30，旧注册缓存使源码完整性门禁复发）

Source：用户“评估分层智能路由又被 hook 给阻挡了”及“这个是在 codex 里面的”；继承完整修复、独立 review、普通提交推送和本地发布授权。执行保持 NO_PIN，原 U-TEXT 已于 54ef203 闭合，U-PROFILES 的 Sidecar 和真实三模式验收保持未闭合，不重做已通过项。

前提门：当前磁盘源码、安装和三 profile 授信 PASS；旧 1ea5d236 的 UserPromptSubmit 注册在 54ef203 上三次退出 2，stderr 与截图逐字一致。只刷新 trust 或检查新 app-server 无法证明旧桌面注册已刷新。有限摘要列表、移除测试文件、跳过 Python/shell、解除 integrity gate 均不能满足根因修复。杀死前提：固定注册在明确批准安装更新后仍阻断，则不得宣称根因解决。初次迁移旧 literal 注册仍需要宿主重载。

U-CACHE-PLAN / phase_type: task_execution / mode: Sequential Chain / model_tier: core-execution：冻结稳定入口合同与反例，独立 MR-004/peak quality-gate 先审方案。源码不热改母仓。当前有一项已完成 explorer 仍缺可信 SubagentStart agent-id 关联；不能伪造关联或清空审批状态，故关键派发在宿主真实重载前未开始。

U-CACHE-GATE / phase_type: task_execution / mode: Sequential Chain / model_tier: core-execution：复用 /Users/luca/.codex/worktrees/hook-text-data/luca_gstack（已附着，54ef203）。新增 builtins-only .codex/hook-source-integrity.mjs，共享固定四目录完整扫描；既有 protected loader 先认证辅助入口字节。installer 仅为更新 root 的新 snapshot 写 .codex/hook-source-approval.json（精确 schema_version/kind/root/algorithm/sha256），原 manifest、bootstrap、loader 字节及格式不变。批准 JSON 路径必须从受保护 manifest 的 canonical root/snapshot 再确认；私有目录/owner/mode、无 symlink、O_NOFOLLOW、inode/device、大小限制和精确 schema 全失败关闭。注册命令不含源码版本摘要，helper 不消费 stdin，原 launch suffix、Stop recovery 和 payload replay 保留。installer 发布 manifest 前二次扫描，防止扫描与发布之间源码漂移。health 同步固定完整协议 pin、明确 source-only 不代表批准安装，trust 提示加 --host-launch。源范围：新增辅助入口；.codex/hooks.json；scripts/install-codex-source-guard.mjs；scripts/codex-hook-health.mjs；必要的 scripts/test-hook-source-digests.mjs、test-codex-hook-health.mjs、test-codex-trust-hooks.mjs、test-source-guard-preserve.mjs、test-codex-child-hook-integrity.mjs、test-controlled-change.mjs；README.md。需要其他源文件时先具名 delta，禁止无关 refactor。

U-CACHE-COMPAT / phase_type: task_execution / mode: Sequential Chain / model_tier: core-execution：Luca App 现有 host-hook-ready.js 的旧 literal parser 必然拒绝稳定协议；在已授权 Hook 消费者范围同步 legacy/stable 双协议校验，三条唯一目标与完整 command 精确官方 trusted 匹配保留。源范围：/Users/luca/Desktop/项目/muse/app/host-hook-ready.js 及其对应测试（读取前验证既有 cross-project read authority；没有授权则明确等待，不擅自扩大）。部署前冻结源与安装版一致性，不能用源码 PASS 外推存活应用已更新。

U-CACHE-RELEASE / phase_type: task_execution / mode: Sequential Chain / model_tier: core-execution：冻结双仓准确 FILE_SET/base/diff/digest，由无父历史的独立 Standards 与 Spec 两轴 MR-004/peak 串行闭合；运行对应回归、mutation 和仓库 gate。全部通过后普通聚焦提交/推送、exact head CI，再一次性受审本地 source install preserving other roots、全部 11 Hook exact trust 三 homes、应用合法发布。不得 force、raw 改 settings/私有 approvals、强制清 lease 或触碰 U001-P。原有审查票只适用原 SHA，不能用于新协议。

行为断言（均 BLOCKING，具体测试命令在实现产生后绑定，禁止用存在性替代）：
- C01：缓存同一完整命令；初始批准版本 PASS；未批准 .mjs/.js/.py/.sh 或新增测试变更 DENY；明确安装新批准 snapshot 后原命令不变且 PASS；原 trusted command hash 不变。
- C02：错误/缺失/宽权限/符号链接/未知字段 approval、root/snapshot 错配、假 env 路径、全 scan upstream 错误均 DENY，invalid 不能互相比对通过。
- C03：Stop drift 和 adapter failure 仍终止 turn 并 replay 原始 payload；helper 零 stdin 消费，其他事件非零映射 2。
- C04：single-root preserve-other-roots 不重批其他源码、保留其他 snapshot，bootstrap/loader 字节不变；并发源码/manifest 变更拒绝发布。
- C05：完整 health 不能把未批准更新报 PASS；source-only 明示 approval 未核对，不能用来授信；exact 11 trust 正负例保留。
- C06：Luca legacy/stable 两协议和缺信任负例真实测试通过；新协议不使当前三条 Host Launch 变成 not registered。
- C07：新协议真实 Codex UserPromptSubmit 成功且现有命名会话不再出现截图阻断；缓存命令回归与桌面实证分开记录。未实际重载/提交提示，不判 PASS。
- C08：独立终版两轴闭合、普通 push exact head 和本地启用读回成功；三模式实际空白启动及 Sidecar 合法事务证据仍独立闭合。

criteria：Q1 所有 MUST 均有行为证据；Q2 完整性与隔离防线未弱化；Q3 未超出冻结范围或包含无关 dirty；Q4 新旧宿主协议兼容可复现；Q5 磁盘、新进程、旧缓存和桌面 live 证据不混称通过。unknown 按未闭合处理。
失败策略：任意 BLOCKING 失败只修受影响单元；关键路由/可信关联失败不伪造或降级。发布前 checkpoint，保留既有未完成义务。


### R-CODEX-CACHE-1 可执行断言绑定

下列命令须在候选根执行；实现阶段必须将上列新增行为并入对应测试后再运行。现有测试 PASS 不证明尚未新增的 C01 行为。

```bash
# [BLOCKING] C01/C02/C03 — 同一缓存命令及源码/审批失败关闭、Stop 恢复
node scripts/test-hook-source-digests.mjs && node scripts/test-codex-child-hook-integrity.mjs
# [BLOCKING] C04 — 单 root 保留与发布漂移
node scripts/test-source-guard-preserve.mjs
# [BLOCKING] C05 — 完整 health、source-only 边界与 exact trust
node scripts/test-codex-hook-health.mjs && node scripts/test-codex-trust-hooks.mjs
# [BLOCKING] C06 — Luca 消费者 legacy/stable 与未授信负例
node /Users/luca/Desktop/项目/muse/app/test-host-hook-ready.mjs
# [BLOCKING] C08 — 仓库组合门禁
bash scripts/verify.sh
```

C07 手动证据入口：Codex 正常重载后，用户在原“评估分层智能路由”会话提交正常提示；只读核对官方 Hook/turn 状态，记录精确 native thread/turn 及 UserPromptSubmit 成功证据。没有用户跨会话发消息授权时，不代发测试提示。C08 publication: 源/审查/CI exact SHA 与本地 receipt 逐字一致的机器比对；首次迁移 GUI/source/信任分别记录，不互相替代。

## Replan R-CODEX-CACHE-2（2026-10-01，冻结实现与安装事务合同）

此 delta 取代 R1 的 U-CACHE-PLAN/GATE/COMPAT/RELEASE 做法；其他 U-ID、已完成成果、未闭合三模式验收不变。Source 仍是用户要求解决 Codex 内部完整性复发并完成 review、普通 push、本地发布。执行为 Sequential Chain，anchor 实施，MR-004/peak 独立审查；不改私有模型绑定、不降低关键审查。R1 实际接受的质量审查 FAIL 1/9 已原样记录，不能用作通过凭据。当前母仓与候选基线均 54ef203；不热改母仓、不触碰 framework/、项目 pin、共享别名或无关 dirty。

### 1. 固定注册协议与入口

完整 11 条精确 command、event/group 顺序、matcher、context limit、timeout 均冻结在同目录 `stable-hooks-r2.json`，文件 SHA256 `896a89a62f3d68ee40bd96280fb8766aca02d7c8ecbb69545cb0015527f375b9`。按 recursively sorted JSON keys / UTF-8 compact serialization 的 hooks-only 协议 pin 为 `3a12be94f24bc20115de45f70b12d6b14df7bf4d76aec40fdbafa525bd39966b`。实现必须逐字使用此命令产物；任何协议变化须具名 delta 再审。

普通事件依次：canonical git root `cd`，导出 LUCA_CHILD_SOURCE_ROOT 与固定 protected bootstrap NODE_OPTIONS，运行固定 `.codex/hook-source-integrity.mjs --verify`；任何失败输出原 mismatch 文案并 exit 2；成功才运行原有 launch suffix。移除注册内 literal 版本 digest，保留整个四目录扫描和已批准 JS loader。辅助入口仅 Node builtins，入口本身先由未修改的 protected loader 核验，再读批准记录。CLI 仅接受一个 `--verify`：不读 stdin，不写文件，不自动批准；成功无 stdout/exit 0，参数/扫描/批准失败 stderr/exit 2。导出只读 `sourceDigest(root)` 与 `readSourceApproval(root,{guardRoot})` 供诊断，不以环境变量自报批准。

Stop 首先读取原 payload；根解析失败输出冻结终止 JSON / exit 0。有效根下 helper/bootstrap/scan/adapter 任一失败都将同一 payload replay 到已有 protected recovery；recovery 自身失败输出同一冻结终止 JSON / exit 0。没有根时不执行 workspace recovery。不造 continue、不吞 stdin、不用失败输出与失败 sentinel 相等来批准。

### 2. 完整摘要与保护记录

算法 ID `shell-source-scan-v2`。四目录精确为 `.codex .claude/hooks scripts memory/scripts`；任一缺失、不正规目录、任意符号链接/特殊文件、读取或任一 pipeline 命令失败均拒绝。全部正规 `.mjs .js .py .sh` 文件（含测试）以 find `-print0` / `LC_ALL=C sort -z` / `xargs -0 /usr/bin/shasum -a 256` 产生逐文件行；保持 shasum 的文件名转义。shell command substitution 去掉尾换行后 `printf '%s\n' "$lines" | /usr/bin/shasum -a 256` 得最终小写 64 hex；先验证格式才能比较。添加、删除、任一内容变动均改变摘要。JS loader 的 per-load 字节认证、Python/规则的 snapshot 执行继续保留。并发扫描只有观测值精确等于受审值才放行；不宣称防御任意恶意同 UID 进程，本框架原有边界不变。

target 新 snapshot 下 `.codex/hook-source-approval.json` 精确六字段 `{schema_version:1,kind:"luca-hook-source-approval",root:<canonical>,algorithm:"shell-source-scan-v2",sha256:<source>,artifact_sha256:<approved artifact bytes SHA>}`。另保存该 approved artifact 原字节为 `.codex/reviewed-install.json`。helper 从固定默认 guardRoot（或仅 NODE_ENV=test + OS-temp 的显式测试选项）读取 protected manifest，核验精确 schema、唯一 canonical root、snapshot basename/root-hash，无 traversal；snapshot 路径与 bootstrap 设置的 LUCA_PROTECTED_CODE_ROOT 必须一致。所有 protected 目录/文件 owner 私有、canonical、无 symlink，文件 O_NOFOLLOW + pre/open inode/device、文件上限，未知字段/错 root/算法/摘要/关联 artifact 均拒绝。不能把 workspace JSON、假 env 或 source-only 扫描当批准。全局 manifest 格式仍 v1，bootstrap/loader 字节不变；manifest 的目标 row/pointer 必然更新，其他 row 逐字数据不变。R1 所称 manifest 字节不变撤回。

### 3. 受审内容绑定与安装接口

installer `--print-review --root <source> [--as-root <canonical deployment root>]` 只读，输出 schema v1 的确定性 artifact，包含 bootstrap/loader bytes SHA、每个目标 canonical root、完整 approved JS relative-path/sha256/format map、copySnapshot 将复制的全部 relative-path/sha256 map、four-dir source SHA（仅有 Hook 注册的 root 必须完整扫描，否则 null）、hooks.json bytes SHA（不存在为 null）。确定性路径按 UTF-8 byte order 排序，不含随机 snapshot ID。`--as-root` 只允许 print-review 单 root，不能安装；candidate→mother 以同一完整内容映射审查，不能审批另一个根的不同内容。审查 gate 冻结此 artifact SHA；release controller 比对 verdict 对应 FILE_SET/diff/source/artifact SHA 后才调用安装。

实际写入必须显式 `--reviewed-file <artifact> --reviewed-sha <64hex> --expected-manifest-sha <64hex|ABSENT>`。参数缺失或 artifact 原字节 SHA 不符拒绝。roots 顺序、bootstrap/loader SHA、JS map、snapshot map、source digest、config bytes SHA 必须与实际源逐项相等；不支持生产自动 capture-and-approve。复制后重新核对完整 snapshot map 与冻结值，发布前再算实际 source inventory 与 artifact 全等。新增 approval/artifact 文件是 installer 生成的明确 metadata，单独核验，不混进源 snapshot map。测试通过一个具名 helper 显式 capture→冻结 SHA→调用安装，不给生产隐含豁免。--dry-run 不写任何 protected 状态；完整验证可打印 diff，不能称已安装。

### 4. 序列化、CAS、中断与回退

protected destination 中以 O_CREAT|O_EXCL|O_NOFOLLOW /0600 创建 `.install.lock`，记录精确 schema、PID、nonce、requested roots 和 expected manifest SHA。先取锁，才读 previous manifest/创建 staged snapshots；持有直到 manifest rename、directory fsync、读回和结果输出。忙/不可信锁拒绝且不创建 snapshot、不改原 manifest/runtime。锁内读到的 manifest SHA 必须等于调用者的 frozen expected 值，ABSENT 只允许真的无 manifest。preserve-other-roots 继续核验原 runtime 与其他 snapshot，不重扫其他活源码。发布前仍做 installed manifest/runtime CAS；只允许本修订 installer 协作写，部署前检查没有旧 installer 活动。此锁不是任意同 UID 直接写入的 OS 隔离承诺。

只发布 manifest 一次、且最后发布；新 snapshot 全部校验及 fsync 完成后 atomic rename。正常提交前失败保留旧 manifest/runtime，移除自己持有且 inode/nonce 一致的锁，未引用 stage 可保留。真实 crash 可保留锁，禁止按时间自动夺锁。提供显式 `--recover-lock-sha <exact lock bytes SHA> --expected-manifest-sha <current exact SHA|ABSENT>`：严格 private/noFollow 校验锁、精确 SHA、PID kill(0) 只接受 ESRCH（EPERM/活/未知拒绝），当前 manifest CAS 成功才移除同一 inode/nonce 锁；仅回收锁，不安装/批准/变更 manifest。发布后异常先读回 authoritative manifest，记录是否已提交；不盲重跑。再次执行需新 exact CAS 与原受审 artifact，语义幂等（内容批准一致，snapshot ID 不作等价要求）。

不新增盲恢复 manifest 的 CLI。回退走同一受审安装事务：恢复精确已审源备份、冻结旧版本完整 artifact、以当前 manifest SHA CAS 安装，preserve-other-roots；CAS 不符拒绝。回退不得覆盖后来更新、丢其他 rows 或还原用户 dirty。初装 runtime 如存在不同字节拒绝，本修订只接受同一 bootstrap/loader；不承诺 runtime-wide 升级。

### 5. 诊断、信任与消费者

health 的完整协议 hash 必须等于冻结 pin（legacy literal 仍按既有 pin 独立解析）；stable full health 比对批准 source digest、完整安装 JS/format/inventory、snapshot map 和批准关联 artifact。source-only 只报告 scan + registration，approval/installation 明示 NOT_CHECKED；不能用于授信。trust --host-launch 核对完整 health 才对全部 11 精确 command 走官方 trust API 与读回。未来受审源码更新不改同一注册 command/trusted command hash；初次 legacy→stable 仍须一次真实 reload + official trust。

Luca host-hook-ready 保持同步 pure-fs 注册识别：三个固定 Host Launch target / MEMORY_ROOT / 原 suffix 精确且唯一，preTool matcher仍仅 `^(Bash|apply_patch)$` 或 `.*`，三个前缀一致。legacy 用既有完整 prefix+digest 格式；stable 仅接受冻结普通事件 exact prefix，不能 regex 泛化。stable 读取同一 canonical protected manifest/snapshot/approval/artifact 并核验 helper/host target JS approved bytes、全四目录 digest；不执行任意 hooks.json 命令、不自动相信 metadata、不新增 Electron 的不可靠 Node 子进程。官方 exact command trusted 检查仍保留。source digest serializer补齐 shasum 特殊文件名行为/特殊文件拒绝，与固定 scan一致。

### 6. 明确行为门与范围

以下均 BLOCKING，测试必须实现后实际运行，不用原测试 PASS 代替：

- C1/C2：同一 frozen command/hash 初装 PASS；未批准 mjs/js/py/sh/测试添加、删除、修改逐项 DENY；新的明确受审安装后原 command/hash PASS。symlink、FIFO/special、缺失/不可读目录、上游输出似合法但非零均 DENY；approval缺失/坏JSON/宽权限/symlink/字段/根/算法/关联artifact/假env/改helper均 DENY。命令：`node scripts/test-hook-source-digests.mjs` 与 `node scripts/test-codex-child-hook-integrity.mjs`。
- C3：root resolution/helper/bootstrap/scan/adapter/recovery failure下 Stop均终止、payload replay正确；其他事件失败2、helper不消费stdin。并入上两测试。
- C4：reviewartifact source/JS/snapshot/config 任一错配或复制前后漂移拒绝；A暂停发布前B争锁拒绝且状态不变，A提交后B旧CAS拒绝；子进程实际中断于发布前保持旧，发布后保持完整新，dead lock精确回收、live/malformed拒绝；回退 stale CAS拒绝、合法回退保留其他root与 runtime。命令：`node scripts/test-source-guard-preserve.mjs`。
- C5：stable fullhealth未批准source失败，source-only明确未核对approval，legacy仍识别，全部11 exacttrust正反例。`node scripts/test-codex-hook-health.mjs && node scripts/test-codex-trust-hooks.mjs`。
- C6：Luca legacy/stable正常、错误prefix/suffix/matcher/duplicate/approval/未信任拒绝，连跑避免 lucky pass；`node /Users/luca/Desktop/项目/muse/app/test-host-hook-ready.mjs`。
- C7/C8：候选 `bash scripts/verify.sh`、关联mutation、独立终版两轴 exact SHA闭合，正常commit/push exact CI、本地受审启用读回；真实 Codex UserPromptSubmit 与三模式空白会话仍是独立live证据，无代发命名会话授权不发消息。配置/source/test PASS不能代替live。

源范围在 R1 上的必要具名 delta：新增 scripts/source-guard-review.mjs（source/snapshot inventory 和私有字节共享实现）及 scripts/source-guard-test-fixture.mjs（仅测试显式批准封装），修改 scripts/test-prompt-attestation.mjs 的安装调用，更新 .claude/skill-os/runtime/project-session.md 的安装命令合同。App只改 host-hook-ready.js / test-host-hook-ready.mjs。其他 R1 文件不扩大；若实施发现新调用者必须先具名记录。plan-review criteria仍9项：implementability / fullintegrity / reviewed-bytebinding / atomic-preservation / Stop / CLI-trust / compatibility / executableacceptance / scope。UNKNOWN仍未闭合。

## Replan R-CODEX-CACHE-3（2026-10-01，关闭空 root shell 反例）

R2 的九项合同保留；本节仅覆盖精确注册与 root-resolution 分支，并明确 artifact 字段名。此前真实方案审查 FAIL 7/9 的冻结 R2 仍保存，不修改其命令产物。继续补审的原因是一个已有三 shell 反例能以确定的小改动关闭，不扩大能力/权限/发布范围；不是无界评审循环。

本修订完整 11 条 command 冻结为 `stable-hooks-r3.json`，SHA256 `9945d170a1163417bdd0807cae9e7f84e4c8434d5ffb056292f094ab6e503c17`，hooks-only canonical protocol pin `217d8a0116f375282aa67e0b59415e3ca742b42bc24685082c2b17fcb7635189`；取代 R2 的 command 文件与 pin。普通事件精确起始为 `luca_hook_root=$(git rev-parse --show-toplevel) && [ -n "$luca_hook_root" ] && cd "$luca_hook_root" || exit 2;`；Stop 同一 resolve/非空/cd 检查失败进入固定 JSON 终止分支，完全不执行 helper/recovery。随后 protected bootstrap canonical-root 校验继续保留。验收必须用三个 shell 实际运行冻结命令，git 非零空输出、git 零但空输出、无效非空目录逐项断言 node/helper/recovery 零调用，Stop continue:false/exit0，普通事件exit2。

受审 artifact 精确顶层键为 `{schema_version:1,kind:"luca-source-guard-review",bootstrap_sha256,loader_sha256,roots}`。每行精确 `{root,files,snapshot_files,source_files,source_sha256,hooks_sha256}`；files是现有 JS相对路径 `{sha256,format}` map，snapshot_files/source_files是相对路径→sha256 map，source_files是完整四目录目标文件 inventory。Hook root 的 source_sha256 与 hooks_sha256 均64hex且 source_files非null；无 hooks.json 的通用 source-guard root 这三项均null，不能调用 Hook --verify。路径无空/./../反斜杠/绝对路径，sorted canonical maps；artifact JSON原字节 SHA仍由受审控制器冻结，installer需实际全文与现场逐项全等。跨root映射只变canonical root值，不变内容摘要。manifest roots 中 files 必须全等 artifact的对应行，approval.sha256与对应source_sha256一致，artifact/bootstrap/loader/hookhelper bytes关系在诊断中核验。不新增隐含自动批准。

其余九项 criteria、源码范围、三 profile trust、live验收、发布/回退边界及审批来源与 R2 一致。静态 PASS 只允许开始候选实现，不表示未运行测试通过。
