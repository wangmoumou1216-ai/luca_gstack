# U001 维护协调与实际 H0 回执

状态：H0 已由真人批准；旧准备窗口已释放/撤回，当前没有 peer 停写承诺。

历史窗口：`matt-H0-20260930-M1-01a0f1b4`。两份回执在各自原生 chat 的真实 completed turn 中返回；以下原文按官方 wait/read 快照保存。Hook 会话没有收到暂停回执，最新真人豁免仅免等待，不代表对方同意。

## 历史两份真实维护回执

### 维护会话 `01a0ebdb-a018-7093-b7fb-e803d4d07880`

真实 turn `01a0f1f1-9762-7302-bf5f-92747f0f621d`，message `msg_007cc90b50ef72e3016abceab2e0a887d0875143dfe6b03367`；读回 `2026-09-30 10:57:56 UTC`；当次完成状态 `completed`。

> 维护窗口回执：matt-H0-20260930-M1-01a0f1b4 当前状态：本会话无在途源码写入、安装、发布或子 agent，无新增效果所有者。R 的 HEAD/main/origin/main及远端 main 均为 1ea5d2364cb2b706e8183b3a51ea079b6a1c71da；E 的 HEAD/main仍为 eddae51c01a07794227954b7ca87492ffe5f8c0a，工作区清洁。R 相对 E 新增 0c56460 模型路由修复、1ea5d23 Hook health，共涉及19个文件。R 另有三份运行日志修改和既有审计文件未提交，应保留。 我方窗口明确同意：从 2026-09-30 18:55:20（北京时间） 起，本会话暂停 R/E 源码、main 发布、E 同步，以及 source-guard、Hook trust、模型绑定和配置写入，直到请求方明确释放或重新协商。人工明确覆盖或紧急修复需要重新通知协调；不会自行启动。此承诺仅覆盖本会话，其他维护者须分别回执。 候选冻结期间可用：我方可保持上述停写承诺，支持后续候选在独立受管 worktree 基于 M1 实施至冻结。此回执不替代 H0/Htest，不授予提交、推送、PR或安装权限。H0-PAYLOAD.md SHA已核实为 c0e7945b5a3ae13df34cb0feac3b7197ab9564666fa32eeb63cde4beaae17388。 本次仅另按启动要求追加一条 UNRESOLVED 待裁决记录；未改源码、安装或配置。

此停写承诺随后随用户暂停而释放；不得复用成当前实施、Htest 或 Hpublish 窗口。

### 维护会话 `01a0f05f-e05c-7693-b844-326c9eb66b75`

真实 turn `01a0f1f1-9f60-7812-bbd1-d22e836a2e61`，message `msg_0021721bb74acc77016abceb395ab087d0a060e9415e5a9d73`；读回 `2026-09-30 10:59:07 UTC`；当次完成状态 `completed`。

> 窗口 matt-H0-20260930-M1-01a0f1b4 回执：本会话维护范围可用。开始时间为 2026-09-30 18:57:36（北京时间）。 实际状态：R 的 HEAD 与本地 origin/main 均为 1ea5d2364cb2b706e8183b3a51ea079b6a1c71da；E 为 eddae51c01a07794227954b7ca87492ffe5f8c0a，工作区干净。M1 七项修改均保留。本会话没有活跃子代理、pending invocation/preparation、在途源码写入或发布，也没有新增效果所有者。 从上述时间起，本会话暂停 R/E 中模型路由、原生 broker、Hook 注册与相关验证源码的修改或发布，以及全局 source-guard、trust、私有模型绑定、默认和 Direct profile 配置的安装或写入；不新增判官派发。持续至你明确释放窗口或重新协商。宿主正常运行产生的日志和原生票据不在冻结范围内。 我可以保持上述自身维护范围稳定，覆盖你在独立受管 worktree 基于 M1 实施、检查、候选提交、普通分支推送和草稿 PR，直至候选冻结及窗口释放。本回执不授予这些操作的 H0，也不能保证其他维护者或宿主的资源稳定；仍需他们各自确认。 本次只读检查显示 R 的注册与安装健康通过，11 条注册匹配，保护清单 SHA 为 c5d6fb2fd710993e175e942e18e41795fe93bd824182d4f9800abc8fee4b6c0b。默认与 Direct 配置均未改动；现存会话缓存及当前官方授信状态未由此次文件快照核验。

此停写承诺随后随用户暂停而释放；不得复用成当前实施、Htest 或 Hpublish 窗口。

## 未收到的 Hook 回执及真人豁免

Hook 维护会话：`01a0f0fe-e6fa-7660-beb5-181b1a9b6444`。请求已真实派发，但当前归档中没有窗口停写回执；其自身 Hook/Direct trust 授权不能转移到 Matt。

真人 H0：`2026-09-30T10:59:09.313Z`，消息 `msg_01a0f1f7-e181-7a43-8964-63a51c85d9b0`，原文“你直接执行就行，不用管他们了”。

Latest human instruction waives waiting for remaining peer pause receipt; existing real receipts retained, missing Hook receipt not fabricated. Actual preimage/repo/baseline protection remains required.

## 暂停释放与继续

暂停回执：`/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/implementation/PAUSE-CHECKPOINT.json`；时间 `2026-09-30T11:07:38.899365+00:00`；窗口记录：All outstanding Matt H0 stop-write requests released/withdrawn by authorized messaging cleanup。

恢复回执：`/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/implementation/RESUME-CHECKPOINT.json`；时间 `2026-09-30T12:48:53.204531+00:00`；真实用户消息“继续”；保留 H0 和等待豁免。

当前以已批准 M1 的独立候选编辑范围推进。历史维护者停写已结束，不能把旧 completed/idle 状态称为当前资源空闲。每个实际效果仍须复核 repo/preimage；新 baseline、第三态、用户/同范围 peer 变化立即停止受影响阶段。

## 已批准范围及后续门

H0：188 项有限候选路径；candidate base `1ea5d2364cb2b706e8183b3a51ea079b6a1c71da`；单一 C、普通候选分支推送、面向 main 的 draft PR。原 H0 展示 SHA `c0e7945b5a3ae13df34cb0feac3b7197ab9564666fa32eeb63cde4beaae17388`；真实批准档案 `/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/preapproval/H0-APPROVAL.json`。

Htest 未批准：E0→M1 对齐、R/E/个人安装、source-guard/trust/config、真实项目和 fixture、原生两 arm 行为、全量验证及其副作用均须展示具体候选与精确效果后单独批准；按实际资源重新发现维护所有者及窗口。

Hpublish 未批准：同一已验收 C/T 的普通 main 发布与新原生 smoke，需实际 CI/PR/资源/恢复读回和独立真实批准。

本文件不替对方启用候选，不变更 R/E 或全局资源，不扩张 pin/发送/安装权限；内容制品制作不等于行为 PASS。


## M2 实施 delta：已由真人批准

用户 2026-09-30T15:03:49.694Z，消息 `msg_01a0f2d7-e2be-74d1-ac2a-a554a89c0767`，原文“批准基线调整”。当前候选/远端基线 `54ef203b4dd77e23564d0cba22f773346d30dfec`，parent=M1；实际受控普通快进已读回，U001/U002 及其余187个Matt目标保持原字节。完整批准与读回见 A/preapproval/M2-BASELINE-APPROVAL.json 和 A/implementation/M2-FF-READBACK.json。

M2上游五路径完整保留；适配仅与 U013 的11条Hook摘要相交，不修改注册协议。现有188个路径及来源/方法/203断言/17G不变，原M0/M1审批、原审查票和历史快照均保留。当前候选parent/PR基线/恢复基线改为M2。E仍E0，未来 E0→M2 的22条对齐仅为Htest清单，未执行；Htest/Hpublish及原生行为仍未批准/NOT_RUN。原等待维护者回执豁免保留；不声称取得新的停写回执。

## M4 当前实施对齐（仅在真人技术委托及作者判断绑定后应用）

远端主版本新增 d6acaf21e89e4c662289c716f7dcd4d3102751e0，parent 为 M3 `689444174a9a32b1a3fcf92e492cf446e284e4b0`。本候选的新唯一 parent 改为 M4，最新 CI 的 zsh 前置和原 Matt38 检查均保留；15 项框架更新及 `.codex/hooks.json` 的稳定命令机制完整保留。其余原 190 有限范围中的 189 路径从旧候选接入；已批准的四项 H0c 功能修复保持相同 postimage。没有新增技能、修改成功口径或重开计划评审。

本次实际批准的不可变回执引用：`/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/preapproval/M4-baseline-alignment/v2/M4-APPROVAL-RECEIPT.json`；应用前外部执行 manifest 必须绑定它的真实 SHA。本文不是批准回执，也不证明维护窗口空闲。旧 M2 批准、候选、失败 PR/CI 与回执全部保留。

替代分支 `codex/matt-skills-adaptation-ci-fix-v1` 使用同一 W，不另建 worktree、不重写旧提交。新 draft PR 的主版本须核验仍为 M4，全部检查需绑定同一新候选。主版本再次变化即停受影响效果。

本次只允许候选源码、常规提交、分支推送和 draft PR；R/E 母仓、个人安装、trust/guard/config、P、原生试验、main 发布均需后续原计划授权。Htest 重新发现相关维护所有者并获得窗口；未来 E 对齐 M4 的 33 路径须重新读取实际 preimage。

M4 保护机制的 review 文件 SHA、manifest CAS、`.install.lock`、snapshot 元数据和 exact trust 必须在后续 Htest 清单中明确绑定；不能照搬 M2 的安装命令。行为验收仍按原顺序完成统一 baseline，再候选，再独立复审和发布。


## N 验收前置有限候选临时草案（不可执行、未批准、未应用）

旧候选 `f0c7d1d9e7d06e682fb4ab4de9e42b674213d305`、旧分支、PR15、旧六项 CI 和 M4 `d6acaf21e89e4c662289c716f7dcd4d3102751e0` 的真实批准记录完整保留为历史。N `64d763ebbf254e0b5dbd33c0782f88a8350317c0` 是精确待批准静态对象基线，CI 仍 PENDING；实际最终批准基线、新 C/T 全为 UNBOUND。后续有效有限提案仍仅使用同一 W `/Users/luca/.codex/worktrees/matt-skills-adaptation/luca_gstack` 和新分支 `codex/matt-skills-adaptation-acceptance-fix-v1`，不创建新 worktree。

从 N 完整树开始，仅携带 C 相对 M4 的原 185 条 Matt 路径；N 的 19 条底层更新与该集合交集为 0，N 的全部 19 条更新及旧 15 条保护路径均保持 N 最新完整 bytes/type/mode。源修复仅 F04.E/F12.E 缺材料定义、Codex completed-review 严格轮次/文本绑定，以及 method-coverage 的官方 host SHA 重新绑定。其余方法、203 断言、输入、programs、原 compiled projection、G 与分类保持；host SHA 绑定不是行为 PASS。

两份 8/8 静态审票只证明各自有限 source delta；v1/v2 失败票保留。后续真实 Codex 判官必须从 authenticated completed result 提取真实 provider_turn_id 并绑定精确 provider/completion/message 证据；该 Htest 前置仍为 UNBOUND。

真实 H0d 批准的未来引用为 `/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/preapproval/acceptance-repair-current-main-v2/H0d-APPROVAL-RECEIPT.json`，当前不存在批准回执、授权或实际新提交。H0d 前必须重新核对实时远端 main、N 六项 same-C CI、remote M4→N 和 R/E 实际根状态及效果 owner；origin/main tracking 不代表实时远端事实，旧维护回执不授予当前 owner 权限。普通完整提交 Hook、新分支推送、新 main-base draft PR/attach 和新 C 的六项 CI 都须重新冻结，旧 PASS 不迁移。

本 N 草案状态为 NOT_EXECUTABLE_UNTIL_SAME_N_CI_PASS_AND_REAL_H0d_APPROVAL；N CI PENDING 禁止全部 source/ref/commit/push/PR/metadata 效果，不能展示为 H0d ready。同一 N 六项 CI 必须真实全绿，精确完整 packet 必须先独立复核，再取得真实 H0d；N 如再次前进则必须停止并重新计算有限增量及所有 hash，不得把其他最终基线直接 runtime 替入本 N scope。

仅将六个确切官方 JSON GET 与 root 拥有的 fetch script 纳入同一 H0d 待批准清单；未执行请求。无安装、cache、tarball、browser/CDP 效果。此提案是 source-only；R/E、个人安装、P、trust/guard/config、真实试验、Htest 与 Hpublish 均未批准且 NOT_RUN，不重新评审原始计划。


## Frozen L finite convergence (source preparation only)

Earlier v2 N proposal stays historical and unapproved. Current static subject is L `6bc51362b1457bea3cba97c098377bd93c1e19fa`, preserving its published framework behavior while integrating the original M4→C Matt delta. Seven authorities merge semantically; generated contracts come from merged authority; the three reviewed fixes and optional five inert lifecycle postimages are carried. Exact current payload is external `/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/preapproval/latest-baseline-convergence-v1/SCOPE.json`. Actual approval/live baseline/new C/T/Htest/Hpublish remain UNBOUND; all runtime/source/Git effects NOT_RUN. Later tracking movement only makes this subject historical and non-executable; it does not silently substitute another baseline or grant authority. Source-first/Htest-later plan order and all 38/203/16/22/17 success requirements remain frozen.


## Current joint-release baseline proposal

This finite external proposal uses B `595499e8a2146d2eedca7dad8958fcf3ab6c8bce`, including OD release M `facf361f8bfe29aff3153d5e4f85ccc85806b336`. Earlier L proposals and their approvals remain historical; old PASS is not a review of B. Current source digest `4fda0733f9bdbc498fcb63073168acda3b2a9991e54e308484b583bbe83e76a2`; current authoritative finite pre/post scope is `/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/preapproval/joint-release-convergence-595-v1/SCOPE.json`. Source/test/Git/install effects NOT_RUN. H0d, Htest, Hpublish and new C/T are UNBOUND. Optional normal roots are prepare/claim-and-retain only; capture/retire is outside this phase.

## C24 fixture compatibility repair — 2026-10-02

The joint-release proposal above is preserved as historical evidence. The actual candidate parent is b39493ff54bfd06f878d268e2d7bee831aada0f7. One isolated test controller call now explicitly selects legacy checkout-exclusive mode; production admission remains unchanged. Current source digest: ebbaff809e5674bb4d9cee71442cb9229be915f393f43e6bff7eaf36ccd59266. Revalidation is pending; actual test, approval and later commit/tree evidence stays outside this repository at /Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/preapproval/joint-release-convergence-595-v1/execution-preparation-v1.
