# 框架轻盈化 v3.2 — P1 基线与现场保全

状态：P1 基线/保全完成；G1 评分器第十轮独立验收为 `CONDITIONAL_PASS`，仍有缺证项目，P2–P4 依赖链阻断。P5 与加载链独立，单独隔离实施/验收，不借 G1 条件票放行。范围 `NO_PIN`，不读取或修改下游项目、共享 `docs` 别名、`framework/`，不提交/推送。执行授权绑定计划 SHA-256 `2ca0cd4d696ae86a72bdabb9e7fc29960b1df42b57fead7605d4390888d4ba0a`；计划会审专家 3/3、独立红队 14/14 仅为计划票。

## 发布基线与混合现场

- 发布 `HEAD=05aa78adc431231455dabbfae94cccf362eb4339`，tree=`d8e4c6b46b56e2a2738f4aa22f8b97169cbec9c0`，均与计划一致。暂存区为空。`/private/tmp/context-lightening-p1.kHzsIW/baseline` 是从该 HEAD 创建的 detached linked worktree，初始 `git status --porcelain` 为空；它是 A 臂，后续 B 臂只能叠加 U1–U4 获批改动。
- 真实主工作区为混合 WIP；U4 的 `.github/workflows/ci.yml`、`package.json`、`scripts/verify.sh` 已有无关未提交改动。不得直接在此工作区实施或用其测试冒充候选树证据。其余脏文件与未跟踪文件原样保留；创建 linked worktree 未清理既有 prunable 记录。
- 七份暂停试验逐字节保全在 `/private/tmp/context-lightening-p1.kHzsIW/frozen-seven.tar`（SHA-256 `8b2d7ffb522995f38f88c77af1a4fee82e279409b1fe5469d77bfc3f032d8dea`），六份跟踪文件的二进制差异另存在同目录 `frozen-six.patch`（SHA-256 `b0087dfe771cff6802e59ae2e567a4e8d1f4157bb25ccbd79178b5cf8f9d2702`）。tar 清单已核对恰为下表七项；其中 `context-index.md` 在发布 HEAD 中不存在，系未跟踪文件。备份在 OS 临时目录，不等于持久发布资产；不能以它为候选源，也不得删改原工作区。

| 冻结文件 | 主工作区 SHA-256 |
|---|---|
| `AGENTS.md` | `7fdf69f5b74f736626c62027d850d62360467a1974c88eeda03334d3988699db` |
| `CLAUDE.md` | `3408ffea85b479b81152a420afec35019352dca2165b668dbfca96ea67e1fbdc` |
| `.claude/skill-os/generated/context-index.md` | `9607902657342e8c5cabd013fa3a8ede9d8508928b90350e32eb53a8fa580e17` |
| `scripts/build-agent-context.py` | `05339b022a4bbd7c69fec4db7d735eab060015ea0b40aef9345bf67e9b87d136` |
| `scripts/check-agent-context.mjs` | `e963ab0bebccc6a98a24eca371415f269c185a190b04ac8a4ba6d295b638ee28` |
| `scripts/test-agent-context.mjs` | `0ce290cf55c0fb43ca4b08113ddac5a7b7c723cf43b863ce043af834c3fd9ef7` |
| `scripts/run-agent-context-ab.mjs` | `6166183a08ebc4f075d2743b2e579b77a50805c17cc5308bd6a58790558ff324` |

## 环境与旧证据

- Node `v22.23.1`、Python `3.14.5`；`claude`、`codex` CLI 可定位。仓库 hooks path 为 `.githooks`，`pre-commit` 可执行。隔离基线未带 `node_modules`，真实工作区有；全量验证前须确定隔离依赖及实际浏览器启动权限，不能假装预检已全过。未运行 56 会话、未调用付费 live 模型。
- 发布基线 `build-agent-context.py check`、`check-agent-context.mjs` 通过（10 kernel、16 pointers、43 catalog、6 fallback）；`test-agent-context.mjs` 的 60/60 既有 mutation 通过。发布评分器在 `--self-test` 且 `--harness codex` 与 `claude` 下各拒绝 385 个离线反例；原输出明确为 `local-production-claim-contract-only`、`model_behaviour_verified=false`，不能外推两端真实行为。
- 旧试验自述 68 mutation，独立审查仍指出索引回退评分缺口；这组旧试验结果只保留为历史失败线索，不采纳为正式通过票。已知路径/EOF 合规失败与安全语义失败分列；旧样本、失败、原始 hash 和未来离线复评身份不得被新分数覆盖。

## 冻结的行为口径与阶段门

16 个入口各自按 `触发→权威 target/truth_owner→最晚加载点→消费者→缺失姿态` 逐项对账；健康索引必须完整读到 EOF。缺失、真实读取失败或机器字段对账证明的语义过期才允许在保护动作之前完整读 manifest 恢复，并把原失败标为 `RECOVERED`；口头声称过期、截断当不可读、部分源、其他文件失败、越界/符号链接逃逸、伪造错误消息均拒绝。启动前与全任务成本分开；外部注入不可测标 `UNKNOWN`。Static Fallback、语义 STOP 发现、Project Gate 首次项目读、Plan 纯读/修改边界、HITL、handoff、正向首次发现、两端降级路径仍为行为反例，不以字节减少或静态绿灯抵消。

G1 余项：在隔离树中先落实并验证上述索引回退/时序/失败分类的离线正反例，固定评分身份，再生成 P2 正式投影。每批须留精确 diff/逆补丁与独立只读验收；关键失败停止依赖阶段。56 会话的配置、费用和精确参数须另呈请批准，未获批不运行；G5/发布更不在本次授权内。

独立 P1 quality-gate（`context-lightening-v32-p1-20260921-01a0c2a8`）对基线身份、七份 tar 逐字节、补丁、隔离树、环境披露、NO_PIN 边界给出 6/6 PASS；历史 60 mutation／两端 385 反例因当时未留完整可独立核验回执，标 `UNKNOWN`，故总票 `CONDITIONAL_PASS (6/7)`。这是保全验收，不是 G1 或行为验收。G1 用另一棵从同一 HEAD 建立的干净 detached worktree `/private/tmp/context-lightening-p1.kHzsIW/candidate`；不在 A 臂或原工作区改实现。

恢复：先核验计划 SHA、`HEAD`/tree、七份主工作区 SHA、隔离树状态；从 G1 余项开始，不默认应用 `frozen-six.patch`。若隔离路径或用户 WIP 漂移，停止覆盖并报告。

## G1 隔离候选与阻断记录

候选树仍在 `/private/tmp/context-lightening-p1.kHzsIW/candidate`，仅修改 `scripts/run-agent-context-ab.mjs`；当前文件 SHA-256 `28bf4263e62a811bdc5a7aff540398bef490c514c1642c07e0dfada27b5669a7`，相对发布基线为 285 行新增、39 行删除。精确正向补丁 `/private/tmp/context-lightening-p1.kHzsIW/g1-candidate.patch` SHA-256 `8c96cfdbd5547ed7ab033597d9df274d2db58473aee2da88b315a2934c863ae6`，逆补丁 `g1-candidate-inverse.patch` SHA-256 `f47db8631afc8e32946696317f07215188d954346028634936a2a5e0af01115b`。未将它移入主工作区，也未将七份旧试验或其未跟踪索引默认并入。候选 `node --check`、`git diff --check` 通过；两端离线 self-test 各拒绝 385 个既有反例并退出 0，但输出明确 `model_behaviour_verified=false`，不是独立验收或真实性能票。健康索引的临时实盘测试在 self-test 中执行过，但原始 stdout 未单独持久化，最终验收将其独立复核状态记为 `UNKNOWN`。

- G1 第一票 `FAIL (5/7)`：回答先于完整 manifest 回退仍被判 `RECOVERED`；健康索引真实 EOF 缺可核验正例。账本记录 SHA-256 `3f5f983bc214115d2c37d8c6b668cc5d290def64e963a441189588d42c15dfe8`。
- 第二票 `FAIL (6/8)`：Claude 单块文本提前答复被投影丢弃；memory summary 答复后执行仍满足启动条件。账本记录 SHA-256 `0de4b2550f768a1f9b1ae4dc4b5e866f3fb714f94aaa3e02f34360b28f008705`。
- 第三票 `FAIL (6/8)`：Claude 同一 assistant 消息的两块文本拼接为完整 JSON 答案，各块单独不能解析，故提前决策被漏判；随后读取 manifest/owner 与 StructuredOutput 竟返回 `pass=true / RECOVERED`。健康索引 EOF 的独立持久回执仍 `UNKNOWN`。账本记录 SHA-256 `4e1e3eab4981d51393065562abfb9b0cd10f87e71c779ec3104df534764042e9`。

前三轮都由独立只读验收返回，失败票未被后续修复覆盖。按关键门与三次重复失败规则，停止继续修补和 P2/P3/P4；P5 虽逻辑独立，本次也不越过当前裁决点另开批次。P2–P5、U1–U4 没有作为正式候选完成，A/B 真实模型和 56 会话均未运行。任何继续都需保留失败票和精确候选身份，不得宣称已达 30% 收益。

## G1 第四轮（用户追加批准的一轮）

用户仅批准在现有范围再做一轮 G1 修复与独立验收。本轮仍只修改隔离候选的 `scripts/run-agent-context-ab.mjs`，未触碰主树七份旧试验。修复前新增 Claude 同一 assistant 消息内双文本块的红色断言，`claude/F13-page-handoff` 实际 `pass=true`、self-test exit 1；将同一消息文本累积用于决策边界后，Claude/Codex 离线 self-test 各退出 0、各报告 385 个反例，`node --check` 和 `git diff --check` 退出 0。这些是生产者自检，不替代验收。

冻结候选文件 SHA-256 `c1397a07be7deb00e409065418f1a71b635fb5c6c37a0b0921b1ea7866cd0996`；正向补丁 `/private/tmp/context-lightening-p1.kHzsIW/g1-r4-candidate.patch` SHA-256 `95fdaffb6e05e786fc0f1db158ed5b45dccd873797760575990d29215952876d`，逆补丁 `g1-r4-candidate-inverse.patch` SHA-256 `fb80403d9e15d4f648eacede286ac3e9a52508fad8e99a3f8439b4c001740e1e`。独立验收用的两棵临时实盘索引根在 `/private/tmp/context-lightening-p1.kHzsIW/g1-r4-realindex-jmUEvE/{healthy,stale}`，除索引首条 condition 外文件一致；均不属于正式候选树。

第四轮独立只读票 `FAIL (7/9)`：多文本块早答、迟到 summary、健康索引完整 EOF/部分拒绝、缺失/真实失败/过期恢复及四项 mutation 检出均通过；但 Claude Bash 只有 `tool_use`、没有 `tool_result`，或 Codex 已完成命令缺 `exit_code` 时，评分器仍把“缺少回执”当作真实索引失败，在后续读完整 manifest 后误报 `pass=true / RECOVERED`。原样 A2 self-test 判官未运行，记 `UNKNOWN`；生产者运行过不充独立票。第四票账本记录 SHA-256 `305e798b2c21df8d0b93527b72a2c0528f640e37ab35e1342282c64a918ab3eb`。本轮一次修复＋一次独立验收已用尽，继续修补须用户另行裁决；P2 仍阻断。

## Replan R-G1-1 — 缺证失败分类（用户回复「继续」）

只重规划 G1 评分器的失败证据判定，不修改原 v3.2 计划（锁定 SHA-256 保持不变），不提前生成 P2。源头：第四轮独立票的 T2 阻断。实现文件仍仅隔离候选 `scripts/run-agent-context-ab.mjs`；本报告记录断言和结果。先在健康索引真实临时根构造 Claude Bash 缺 `tool_result` 与 Codex command_execution 缺 `exit_code`，各自完整读 manifest 后仍必须 `FAIL`，观察现状红灯；明确非零退出码和 `is_error=true` 的真实失败应保持 `RECOVERED`，完整健康索引为 `INDEX`，部分读和答复后补证仍拒绝。修复只允许把“未知/缺证”与“已证失败”分开，不能用错误文字、模型声称或缺失字段证明失败。执行双端离线 A2、语法/差异检查、独立只读质量门；关键失败立即停止 P2，56 会话仍单独审批。本 delta 未新增 U1 文件、外部效果或 Git 发布权限。

第五轮结果：新增缺回执反例先在健康实盘根重现红灯（Codex `pass=true`、断言期望 false，self-test exit 1）；`shellAttempts` 区分成功、显式失败与未知后，Claude/Codex 离线 self-test 各 exit 0，语法与 diff 检查 exit 0。冻结文件 SHA-256 `837930f660f6fef98e398c4119323b6262a46c8eddbf3777b01545bd2bd9b908`；正向补丁 `/private/tmp/context-lightening-p1.kHzsIW/g1-r5-candidate.patch` SHA-256 `2b157a87a47fb18e72ba56536ecaf14920c01ad1aef26d7b23e56e43bc4ebbec`，逆补丁 `g1-r5-candidate-inverse.patch` SHA-256 `a3105e3601c29c4c8f542db94e1ee6bccb1ed308b3d41d90e8430669476e75a3`。

第五轮独立只读票 `FAIL (7/9)`：32 项独立原生事件/实盘根检查及 6 项内存 mutation 中，缺回执/异常退出码拒绝、健康索引、真实失败、过期、部分/截断和时序反例通过；但 `claudeProjection` 将 `tool_result.is_error` 的非布尔值以 `Boolean(...)` 强制转为 true。健康索引下字符串 `"false"`、`"true"`、数字 1 或对象 `{}` 均可伪造失败，完整 manifest 后误报 `pass=true / RECOVERED`。判官因只读合同未运行会写删临时文件的原样 A2，将其记 `UNKNOWN`，生产者自检不充票。第五票账本记录 SHA-256 `5a891c2470f9289b28551ebaaf7d7730f66a3a6b0d8fe3a14f7e6d374073993f`。这说明失败证据的原生事件投影边界仍有结构性缺口；本次 delta 的一轮修复和一轮验收已结束，不叠加下一补丁。G1 未通过，P2–P5 均未开展，56 会话未运行。

## G1 第六轮（原生事件 delta，用户回复「继续」）

仅在发布基线 `05aa78adc431231455dabbfae94cccf362eb4339` 的 detached 候选修改评分器，未默认采纳七份旧试验。获批 delta 计划 SHA-256 `845fddb8aad5c9c4f0b34f5ee55ca77390c6d78accb9a12916a6a551eacd2ff3`，原 v3.2 计划未改。实施前发现主工作区 HEAD 已前进到 `c07330db1c56dff20f63cc078e957147d599a806`（tree `23513fa92c87b9228db97e4b4a196b8bc62841a2`），其 Open Design 提交不触及本轮评分器或根适配，但涉及后续 U4 的 `package.json`、CI 和 `scripts/verify.sh`。已先向用户报告漂移；本轮不在新 HEAD 合并，也不推进依赖阶段。

红灯先确认：索引 EACCES 错分、Codex 相互矛盾状态、Claude `is_error=true` 终局、早答混合文本均曾被现状误接纳或抛异常。局部修复增加原生工具调用/回执 ID 与顺序校验、严格布尔失败标记、不可读索引状态、已成立恢复历史保留及首条可见答复边界。执行者的 Claude/Codex 离线 `--self-test` 各 exit 0（既有 385 反例），`node --check`、`git diff --check` exit 0；`model_behaviour_verified=false`，不作真实模型或性能达成声明。

冻结候选只有 `scripts/run-agent-context-ab.mjs` 修改，文件 SHA-256 `0a8189425725e5dbbc132e644e296255ac582db25c0ca1bb7582142b005f64fc`；正向补丁 `/private/tmp/context-lightening-p1.kHzsIW/g1-r6-candidate.patch` SHA-256 `9d9c8bb334c7aba822193ba600217cb15020ee30a8afb74e729d5e3a7452bd9c`，逆补丁 `g1-r6-candidate-inverse.patch` SHA-256 `9adee4f455f4c6b0215785865e09b045f3f5e618ddee5f6e033c399eaa50a6d9`。独立验收前后身份一致，补丁正逆 `git apply --check` 通过。评分身份 `aa019e08cf163fda62f0783e39939d9e150a6e161bfd91dd08ebd400384e9f81` 绑定完整源码及 fixture；版本标签未递增不单独阻断，但旧 hash 的 release manifest 已实测拒绝，不能混批。

第六轮独立只读票 `FAIL (5/9)`，原生事件虚拟文件系统矩阵 48/54、五项定向 mutation 全检出；原样 A2 和真实临时根因判官只读合同记 `UNKNOWN`，不能借执行者结果补票。三个关键反例：两端在索引缺失且 manifest 为合法 JSON 空对象 `{}` 时，完整读取仍误报 `pass=true / RECOVERED`（源有效性未核验）；Codex 同 ID 的失败 completion 后出现较晚 started，或 started 无 ID，也可凭 manifest 误报恢复；Claude 未知 `server_tool_use` 块或未知顶层事件静默丢弃，使带未知活动的正常链仍 PASS。后者是合成原生 envelope 反例，不宣称客户端实际发出。严格布尔/配对、EACCES、失败后重读、部分源与提前答复等检查通过，仍不抵消关键失败。第六票账本记录 SHA-256 `99bb64925f010a8f8313e571391039eee9ff60eb2f02b4f285517f1a13ba4ad4`。本批准轮次已结束，不叠加新补丁；G1 阻断 P2–P5。56 会话未展示配置/费用/精确参数，也未获单独批准或运行；没有提交、推送或发布。

## G1 第七轮与第八轮隔离续修（用户要求自行判断继续）

用户纠正重复请示后，在原 U1 评分器单文件、可逆、离线验证范围内继续处理已证失败；不新增实验预算或发布权限。第七轮先加红测，依次观察 `indexProjectionState(null,{})` 错判 `MISSING`、未知 Claude 活动静默通过、Codex completion 后同 ID started 误获恢复。局部修复将源资格检查移到缺索引状态之前、未知 Claude envelope/block 投影为 `unclassified_activity`、Codex 命令 ID 生命周期及缺 ID start 归为冲突。两端执行者离线自测各 exit 0，语法/diff 检查退出 0，但仍仅是 `model_behaviour_verified=false` 的自检。

R7 冻结文件 SHA-256 `47eb69744d72c08939a07f5c56f3056a711c8462c8440d1b203ceb944ce009c4`，正向补丁 `g1-r7-candidate.patch` SHA-256 `40aa5f0765a2f8512fa7390114bf88d1750fbd6ad4888bdadf2e027a661e2124`，逆补丁 `g1-r7-candidate-inverse.patch` SHA-256 `71fb6ac8ee99e427560db3eb282bac57e51904b5eaf22950267f965bb1629cc5`，均在 `/private/tmp/context-lightening-p1.kHzsIW/`。独立只读票 `FAIL (2/9)`：内存 VFS 的两端原生事件 4/4 复现“索引读取 EACCES + 无效 manifest `{}` 或空 entries”仍得 `pass=true / RECOVERED`；`frozenIndexState` 在源结构校验前先返回 `UNREADABLE`。判官按关键门停止，其他矩阵、mutation 和逆补丁重核记 `UNKNOWN`，原样 A2 不充独立票。R7 账本 SHA-256 `b676e92aabd429406673eeb134bb3ddc4a05ca80a02784374a5d9397d473fb8c`，失败不由后续候选覆盖。

第八轮只在同一源资格门增加 EACCES+无效源红测（修前实际 `UNREADABLE`，期望 `INVALID`），并让冻结状态先校验 manifest，再授予索引 `UNREADABLE`；修后 Claude/Codex 离线自测各 exit 0，各报告既有 385 反例，语法和差异检查 exit 0。R8 候选文件 SHA-256 `fe26f519d68c8b7eb13b7e7eda738692e6c983fa9e0ef3dd07ce7ea6a315dd65`；正向补丁 `g1-r8-candidate.patch` SHA-256 `d526c9f993193f29ecad9a4029d2d05f3f16f7d75806dde9ef57cb11284fb3c3`，逆补丁 `g1-r8-candidate-inverse.patch` SHA-256 `f20f1d886f6b754c1a2e3dd3a803fe01ca3faec10b21d96f6da03b82a8b58a3e`。该冻结候选的独立结果见下，G1 未放行，P2–P5 未启动。

R8 独立只读票 `FAIL (3/9)`：在两端原生事件/VFS 下，索引缺失且完整 manifest 的 entry 字段齐全、但 `condition:null` 或 `runtime:null` 时，仍 `MISSING → RECOVERED` 且 `pass=true`。有效源对照通过，空对象/空 entries/缺字段正确拒绝；第 796–802 行仅检查字段存在，不验证值的类型与形状。阻断后判官停下，其余配对、真实失败历史、早答、EOF、作用域和 mutation 均为 `UNKNOWN`；原样 A2 因只读判官不能写临时根也为 `UNKNOWN`。身份与正逆补丁精确一致，语法/差异检查通过。第八票账本 SHA-256 `4260e8cfe90c7256ed59bbe27556764699531294c384bd0c41348098e9d11765`。

停损判断：R6 的 `{}`、R7 的 EACCES+无效源、R8 的字段值 null 都属于“未完整验证 manifest 源却授予回退资格”的同根失效；不再叠加第九个局部 if。发布基线的 `scripts/build-agent-context.py` 尚无索引生成逻辑，现有 `scripts/check-agent-context.mjs` 主要核字段存在和部分数组条件，尚不是可供评分器复用的完整源值 schema。下一步应在 U1 获批文件边界内先定义并穷举 manifest 源类型/字段/路径/重复 ID 的机读契约及跨生成器、检查器、评分器一致性反例，再整体修复资格门；在该设计和新一轮完整独立验收之前，G1/P2–P5 保持阻断。此为技术建议，不扩大计划文件、实验预算、外部效果或发布授权。

## G1 第九轮（集中源资格校验，用户回复「继续】」）

R8 失败后不再追加零散条件分支，先以发布 manifest 和现有 checker 核对顶层及每条 entry 的完整字段、类型、非空、枚举、ID 唯一性和相对 target 约束。隔离候选仅修改 `scripts/run-agent-context-ab.mjs`：新增同一 `manifestSourceValid` 资格门，在缺索引、不可读索引与机器投影对账之前验证源；不要求 target 在 G1 的缺索引根里已经存在。新增矩阵先在旧候选得到 `unknown top-level field: missing index recovered`（实际 `MISSING`，预期 `INVALID`，exit 1），再在 Claude/Codex 两端完整离线自测转绿，均 exit 0、报告既有 `rejected_counterexamples:385` 和 `model_behaviour_verified:false`。两端真实临时根的无效 manifest/原生事件反例亦在生产者自测内执行；语法和 `git diff --check` exit 0，不把自测、静态检查或字节变化当独立行为或性能票。

R9 候选继续固定在发布 `HEAD=05aa78adc431231455dabbfae94cccf362eb4339`、tree=`d8e4c6b46b56e2a2738f4aa22f8b97169cbec9c0` 的 detached B 树；仅评分器修改，文件 SHA-256 `ed64b88848661974aa331dcff34286f88eccbb16a5fabceaef1edb30ef61b3b3`。正向补丁 `/private/tmp/context-lightening-p1.kHzsIW/g1-r9-candidate.patch` SHA-256 `c5dbcbb0b6125dbcbd51d3809f2ec61b8f89010f79747558dab901ed66dc5eaa`，逆补丁 `g1-r9-candidate-inverse.patch` SHA-256 `b3bbc2eb821863aa415e7a1317fe9ea6e143dfb40c1d0dfe18cba4c525e1588a`；前向在 A 树、逆向在 B 树 `git apply --check` 均通过。原 v3.2 和 G1 delta 计划 SHA 分别保持 `2ca0cd4d696ae86a72bdabb9e7fc29960b1df42b57fead7605d4390888d4ba0a`、`845fddb8aad5c9c4f0b34f5ee55ca77390c6d78accb9a12916a6a551eacd2ff3`。主工作区另有用户 WIP 与前进的 HEAD `c07330db1c56dff20f63cc078e957147d599a806`，未与隔离候选混合。

第九轮独立只读 quality-gate `FAIL (6/10)`，eval_run_id=`context-lightening-v32-g1-r9-20260921-ed64b888`，记录 SHA-256 `038e45d28c14cc1d231ad81d1d0fbc095097832b2ad5b7512258f84ad74767ce`。判官从冻结候选原函数构造双端原生 envelope 和内存 VFS，不运行生产者自测或 live 会话。无效源 187 类×两端×缺索引/不可读共 748/748 通过；另综合 822/822 的合法回退、16×12 字段漂移、EOF、部分/截断、早答、summary、作用域检查通过；原生异常矩阵 45/47。两项关键失败均在 Codex：合法失败→完整 manifest 回退链中插入同 command、新 ID `pending-late` 的 `item.started` 而不结束，或插入 `command:null` 的启动事件，均误得 `pass=true / RECOVERED`、无 policy violation。源定位为 `codexCommandEvidence` 只核对某 completion 与已有 start 冲突，未要求所有 start 闭合；`sharedScopeAudit` 按 command 字符串集合而非 ID 结案；空 command 启动未归为未知活动。它们是独立合成事件反例，不声称真实客户端必然产生。路径穿越动态探针被项目 scope hook 阻止，记 `UNKNOWN`，静态路径门不充动态票；首次 BLOCKING 失败后 C8 mutation 按判官协议停跑，原样 A2 因只读约束均记 `UNKNOWN`，生产者自检不补票。

G1 继续 `FAIL`，不启动 P2/P3/P4 或把 P5 混入当前批次；R1–R8 失败票和 R9 身份各自保留，不在冻结 R9 上叠加修补。七份旧试验、未跟踪索引及其备份未采纳/覆盖；没有 56 付费会话、提交、推送或发布。总体只有 P1 基线/现场保全完成（五阶段约 20%），没有 30% 收益或真实双端性能结论。

## G1 第十轮（用户要求继续，原生命令生命周期修复）

第九轮阻断是 Codex 新 ID 的未完成 `item.started` 被旧同命令 completion 洗白，以及空/非字符串命令被忽略；它不是 P2 代码问题。隔离 B 候选先加入真实临时索引根的双端评估反例：同命令新 ID 未闭合修前实际 `pass=true`，断言期望 false、self-test exit 1；另以空命令启动拒绝和合法新 ID 配对继续回退为正反对照。随后仅在原 U1 评分器 `codexProjection`、`codexCommandEvidence`、`sharedScopeAudit` 的事件边界修复：不合法 command 明示未知、未闭合 start 留 issue、按 ID 而非 command 字符串判断。修后 Claude/Codex 离线原样自测各 exit 0（各报告既有 385 个反例，`model_behaviour_verified:false`），`node --check`、`git diff --check` exit 0；仍不是 live/性能票。

R10 冻结候选文件 SHA-256 `602a87dba05a31ae48b2483a587b6e843e597750ca5e4bfccb0fbc0f14c5a922`，仍仅评分器修改，发布 HEAD/tree 同 P1；正向补丁 `/private/tmp/context-lightening-p1.kHzsIW/g1-r10-candidate.patch` SHA-256 `a4778e78dd5c3c549f9b2d2d8c624b0d164dfd99e609938df015c599ea604bd7`，逆补丁 `g1-r10-candidate-inverse.patch` SHA-256 `c5c73ecef13031cc7eb1aff3e5fdea1a3a2f0dee897a183b7fa8506a284b2dd3`，双向 `git apply --check` 通过。主工作区 HEAD 已前进到 `c07330db1c56dff20f63cc078e957147d599a806`，未混入候选。

独立只读 quality-gate `CONDITIONAL_PASS (7/9)`，eval_run_id=`context-lightening-v32-g1-r10-20260921-602a87db`，记录 SHA-256 `1776024a1d386f7ef913b24e7bb9f312f9af5413dd5059d210e21e86f63cb6fc`。正式 delta C1/C2/C4/C5、G1-D2/D3/D4 通过：独立原生 envelope + 内存 VFS 的 106/106 原版行为探针符合预期；包括同命令新 ID 未闭合、空/非字符串 command 拒绝及合法配对恢复；6 类定向 mutation（真值化、未知退出码、时序、未闭合 ID、EOF、源验证）被检出。首次“空 entries”源验证 mutation 被另一层可达性防线挡住，判官保留该未隔离实验，并用保留 entries 的额外顶层字段重新隔离、两端检出。C3 的 EOF/早答/时序通过，但越界路径动态探针被 PreToolUse 作用域钩子拒绝，记 `UNKNOWN`，不绕过；判官只读合同无法运行写临时根的原样 A2，G1-D1 独立复跑记 `UNKNOWN`，生产者自测不补独立票。判官的 7/9 不是全部 BLOCKING 通过，G1 不能放行 P2–P4；没有 56 会话、提交、推送或发布。P5 是无 G1 依赖的独立批次，单独候选和门票，不用它抵消 G1 未知。

## G1 R10 补充独立验收与 P2 入口状态

用户明确要求当前会话只补齐 P2 前置条件，在 G1 明确通过时停在 P2 入口并交接新 session；本会话不继续 P2–P5。R10 候选保持原字节，SHA-256 `602a87dba05a31ae48b2483a587b6e843e597750ca5e4bfccb0fbc0f14c5a922`，隔离 HEAD/tree 仍为 `05aa78adc431231455dabbfae94cccf362eb4339`／`d8e4c6b46b56e2a2738f4aa22f8b97169cbec9c0`。

两端原样 A2 自检在冻结候选各 exit 0、各报告 385 个离线反例且 `model_behaviour_verified:false`。独立执行回执 `/private/tmp/context-lightening-p1.kHzsIW/g1-r10-a2-independent-receipt.md`（SHA-256 `8e23f8f69343bbab8c775a9814c46ec4dabdb77bc859798804212b8490c15dc1`）记录完整命令、stdout、前后身份，并用内存断言翻转验证健康索引正例与部分索引反例会转红；它关闭 G1-D1 独立执行缺票，但不代替 D3 的独立设计行为矩阵。作用域回执 `/private/tmp/context-lightening-p1.kHzsIW/g1-r10-scope-independent-receipt.md`（SHA-256 `f8b351a3fc666dd38b11271f7763b52571ede519250159ea45ab150f79be877f`）仅有执行成功的范围内正控；Claude/Codex 越界动态负例仍在执行前被 PreToolUse hook 阻断，未绕过，故 C3 仍 `UNKNOWN`。

独立 quality-gate 补充票 `context-lightening-v32-g1-r10-supp-20260921-602a87db` 为 `CONDITIONAL_PASS (8/9)`：C1/C2/C4/C5、G1-D1/D2/D3/D4 `PASS`，C3 `UNKNOWN`。原 7/9 票保留，不覆盖。v3.2 G1 要求全部 BLOCKING 通过；当前没有可核验的同一候选动态越界负例，因此 **G1 尚未通过，P2 入口未开放，不生成 P2–P5 的执行交接**。解除该缺口需要在项目作用域规则允许的受控环境获得独立、绑定精确 R10 字节的原生输入与评分结果回执；不得把 hook 拒绝、静态检查或生产者自测改记为 PASS。未运行 56 会话、未提交/推送/发布，未修改候选或用户主工作区 WIP。

补充票之后按 hook 首次提示，仅用已验证的显式绝对候选路径透明复试一次合成原生事件探针；它不执行事件中的文件命令，但工具钩子仍在 Node 启动前将合成 `../outside-probe` 识别为离开框架的未绑定路径并拒绝。精确调用、拒绝消息和无 stdout/exit 的事实见 `/private/tmp/context-lightening-p1.kHzsIW/g1-r10-scope-literal-retry-receipt.md`（SHA-256 `ab27faa243bb5022feb8617f54ba33753dc1c1d43a2706c2f142de1e93b6edc6`）；未编码、改写或绕过再试。此票不改变 C3 `UNKNOWN` 或 G1 阻断结论。
