# 五方向改进：执行计划

plan_id: FIVE-DIRECTION-20261027
scope: five-direction-framework-improvement
status: PLANNED
source_identity: handoff-20261027-172556 + five-direction-plan-f48556e943feefe485d831829d4a8d6fe179b85c7d048dac0d6423a6482fc4fa
baseline: /Users/luca/.codex/worktrees/14c3/luca_gstack at a0a145ee1b45cf0467895eb529e64eae811836bb (detached)

## 前提与选择

用户要求完成交接所列五方向的评估、必要实施、验证、独立验证和 review，通过后提交、推送 main、同步本地。证据尚不证明五项都需变更；逐项允许有行为证据的 no-op。更薄的替代是复用现有 owner 和交接，已纳入逐项评估，不预设新 skill。KILL-1：当前真实入口或消费者与假设不符时，不修改影子副本；重定目标并按适用门处理。KILL-2：测试无法证明正确实例或行为时，不宣称通过。不得将已有对标审查票当作本轮实现票。

模式：Sequential + Supervisor，Deep，串行独立审查。产品设计链 task-plan/DEV 反向覆盖 N/A；唯一需求源是用户请求、指定 handoff 和其绑定的五方向方案。关键方案先由独立 quality-gate 冷审；实际原生身份和执行/完成证据不足则不宣称通过。所有 U-ID 固定，结果与失败保留在报告，不覆盖用户其他工作。

## 精确范围及效果

当前 checkout 内允许按证据必要性修改以下既有文件：

1. `.claude/skills/office/diagnosing-bugs/SKILL.md`。
2. `framework-audit/2026-09-30-matt-adaptation/global-candidates/tdd/SKILL.md`。
3. `.claude/skills/office/handoff/SKILL.md`。
4. `.claude/skills/office/to-tickets/SKILL.md`。
5. `.claude/skills/office/wayfinder/SKILL.md` 和 `.claude/agents/plan-agent.md`（仅若长期视图评估证明该 owner 必须修改）。

为验证及证据允许创建 `scripts/test-five-direction-improvements.mjs` 和 `framework-audit/2026-10-27-five-direction-evaluation.md`，及本计划在 `framework-audit/plans/` 的文件。只在现有消费者确实需要而且该有限文件范围足够时实施；发现其他必需目标，停下按合同增量重规划，不以此清单为扩权。必要测试以真实入口、隔离 fixture 和已批准的 OS 临时目录进行；不得假称模拟器是实际 tracker 或原生 loader。允许修改 `/Users/luca/.agents/skills/tdd/SKILL.md` 同一 seam 说明，前提是确认其 preimage 未漂移并证明确为需要更新的个人入口；仓库内候选和该文件分别核验、回读，个人文件不属于 Git 提交。不得把这一步称为 M13 正式安装或两个宿主的已验收发布。

允许为独立评估及最终审查按原生接口串行派发审查 agent；允许仅本任务创建的临时 fixture、必要测试、stage 本计划和本任务结果、commit、向 `origin/main` 正常 fast-forward push、再将本地 `/Users/luca/Desktop/luca_gstack` 的 main 以 fast-forward 同步，前提是独立门与测试通过、远端和本地基线检查安全且不覆盖其现有 `memory/evals/eval-log.jsonl`、`memory/retrieval-log.jsonl` 用户改动。任何冲突、非 fast-forward、远端漂移或用户文件受影响则停止，报告具体状态；不 force、reset、stash、清理或修改其他 worktree。禁止真实 tracker 写入、安装或配置、持久记忆、定时任务、发送消息、修改 `framework/`、项目共享 alias 及计划范围外文件。

## 单元与门（均 Source：指定 handoff 的五方向及用户本轮请求）

按顺序逐项先证据、后候选、再实际验证，彼此不依赖的事实收集可在同一只读阶段完成；依赖图为 U001→U002→U003→U004→U005→U006→U007。所有 status 初始 PLANNED；本计划不写入运行状态来冒充完成。

| ID | 目标、文件 | 检验正例 / 边界 / 失败，验收 |
|---|---|---|
| U001 | 证明人为变异链；诊断 skill | baseline、无效替换、错误文件/实例、无关错误、正确目标 red 和恢复 green；仅合法且实际采用变异时适用，自然 red 不额外要求变异。记录变异及恢复前后身份和输出。 |
| U002 | 测试 seam 说明；仓库候选和必要时个人 tdd | 同一功能的不同边界，逐项记录可观察、已知盲区及未知；已确认 seam 续接不重复询问；不虚构覆盖。区分 Codex 当前 catalog、Claude 入口与实际加载证据。 |
| U003 | 交接与接收；handoff | 正常接续、文件缺失、版本漂移、未授权动作四例，接收方识别第一步并保持真实授权；验证现有路径再决定 no-op 或修复。 |
| U004 | 工单关系与恢复；to-tickets | 隔离 mock 目标冲突、创建成功但关系失败、未知结果及恢复；验证原生关系/不支持时的降级，防重复创建；无真实平台证据标 UNKNOWN。 |
| U005 | 长期目标连续视图；handoff/wayfinder/plan owner | 对照跨两次受控会话目标、进展、下一步、阻塞与有来源判断；变化、未决选择与未授权动作为负例；复用足够则 no-op，不预先新增 skill。 |
| U006 | 冻结全部改动、执行必要检查并独立验收/审查；报告及测试文件 | 新版需求覆盖、指令消费者、实际运行时分区、失败处理、保留行为和变异抽查；Standards 与 Spec 串行隔离，修后对最终字节重新闭合。无法取得票据或行为证据时保留 UNKNOWN/BLOCKED，不进入 U007。 |
| U007 | 提交、推送并同步 main | 仅在 U001–U006 通过及发布前新鲜检查后执行；验证提交文件集合、远端 main 和本地 main 指向同一提交，原有脏文件不变。失败停止且不强制覆盖。 |

## 可复核的执行和断言

每个单元先记录精确 source、preimage SHA、消费入口、预期与实际输出、时间、命令/exit、对照和保留行为。可执行行为检查复用现有 suite；缺失时新增上列单一测试文件或 OS-temp fixture，建立独立预期并提供真实红/绿，避免文字 grep 冒充行为。冻结受测源码与 fixture hash、实际入口和运行结果；隔离 mock 的作用及未覆盖真实平台列明。native 两宿主 discovery / invocation / failure 分开；未运行即 UNKNOWN。

BLOCKING R1：每方向都完成上述正例与反例的证据记录；无证据的 no-op 不是完成。R2：人工变异必须确认目标对象、实际差异、预期错误与恢复；错误红灯不能通过。R3：每个已变更文件运行相关现有检查和实际消费者行为；fixture 不替代宿主真实消费。R4：U006 冷审有 native 完成及同次 accepted，缺票或重大 finding 阻止发布。R5：本任务提交集合与获批范围相符，远端/本地 fast-forward 和脏文件保全先决；完成后读回验证。R1–R4 不可满足则 U007 不执行。

criteria: C1 每方向有可追溯的现状、对照、结果与风险；C2 未决选择与未知授权被保留；C3 所有已改真实消费者或明确 UNKNOWN；C4 不把模拟平台或静态文本当现场行为；C5 双轴独立审查和最终版本一致；C6 原有用户工作及只读边界保全。

## 可复演步骤与验收命令

主 Agent 担任 U001–U005 的执行者；单次只处理一个 U-ID。验收 Agent 为独立 `quality-gate`，按 R4 冷输入串行审查；未有真实完成及同次 accepted 不计票。固定工作根 `/Users/luca/.codex/worktrees/14c3/luca_gstack`；初始来源和 preimage SHA 在修改前重算，非本任务漂移即停止。每次修改都读目标全文，针对已有消费者实现最小补丁；每个 U-ID 的证据写在 `framework-audit/2026-10-27-five-direction-evaluation.md` 对应小节，保留命令、输入、真实结果、退出码、来源哈希和未覆盖范围。独立验收直接读取原始证据，不能仅依赖报告中的自报。

- U001：从现有测试中选择真正调用的目标，先跑绿，再在隔离副本做唯一命中变异，核对 preimage、diff 和执行实例身份；依次执行无替换、错文件、错错误和正确变异，检查每个失败是否与期望症状一致，恢复后重跑绿。原路径不受临时变异影响。若没有合适消费者或合法变异权限，该测试记 UNKNOWN 而不编造通过。
- U002：以固定两种可观察的跨层缺陷及 fixture 为输入，分别用原规则和候选规则执行冷消费，逐项记录 seam 能观测的行为、已知缺口与未知；再提供已确认 seam 的历史，验证不重问。实际 Codex 和 Claude 分别记录调用入口、加载的文件及未支持/失败处理；无法建立原生实例则该宿主 UNKNOWN。
- U003：提供完整 handoff 给独立接收者，逐次替换为缺文件、漂移内容和未授权效果的受控输入，记录识别的第一步、是否读取正确文件和是否停止越权；对正常及三类异常分别运行原版和改后版，比较结果。不产生外部效果。
- U004：先检查具体已有 tracker 消费入口及能力；在隔离 mock 边界进行目标不一致、关系失败、结果未知、恢复和最终读回的操作，记录请求次数及状态，断言未知时没有盲重试，部分成功后不重建已存在对象。mock 无法证明真实平台行为，真实平台未授权/不可用保留 UNKNOWN。
- U005：以两次受控消费完成目标、进展、下一步、阻塞和带版本来源的判断恢复；再分别使引用内容变化、保留真人选择和撤销效果权限，观察是否正确停下。对比现有计划与 handoff 的组合；足够则不新设机制，不足才在已列 owner 内修改。
- U006：先冻结工作树 diff、每个新增文件、个人文件前后哈希及源方案哈希；主 Agent 跑下列发布前 A0–A3，输出和退出码写入证据。独立验证者以固定数据和行为预期重复必要运行，按 Standards/Spec 独立串行冷审，检查改动前后及被测入口的实际身份。若修改发生在审查之后，重新冻结并审终版。
- U007：发布前读取 `git status --short --branch`、远端实际 main、`git diff --cached --name-only`，核对有限集合、先前票据和两个脏文件当前哈希；仅允许远端 main 与待推提交的祖先关系成立且本地 fast-forward 不覆盖脏文件。提交、推送后分别读回提交树、远端 main 和本地 main，比较 SHA 及两处脏文件哈希；任何不匹配停止并保留状态。

`scripts/test-five-direction-improvements.mjs` 若新增，必须驱动真实被测入口或明示隔离的外部边界，报告 U001–U005 每个正例和反例的独立预期、实际结果、调用的源文件与 hash、exit；任何缺失、失败或 UNKNOWN 返回非零。若真实行为无法通过脚本直接驱动，脚本只能检查证据文件的完整性，语义结果仍由独立验收者判定，绝不能以脚本通过替代行为证据。既有 suite 足以覆盖时可不创建该文件，但必须给出精确运行命令及原始输出供验收者复跑。

```bash
# [BLOCKING] A0 — 计划身份；必须等于批准绑定的 SHA
if ( set -o pipefail; test "$(shasum -a 256 /Users/luca/.codex/worktrees/14c3/luca_gstack/framework-audit/plans/2026-10-27-five-direction-execution-plan.md | awk '{print $1}')" = "$APPROVED_PLAN_SHA256" ); then echo 'PASS A0'; else rc=$?; echo 'FAIL A0'; exit "$rc"; fi

# [BLOCKING] A1 — 当前版本的实际行为驱动；仅新增且确认该文件为实际驱动时执行
if ( set -o pipefail; node /Users/luca/.codex/worktrees/14c3/luca_gstack/scripts/test-five-direction-improvements.mjs ); then echo 'PASS A1'; else rc=$?; echo 'FAIL A1'; exit "$rc"; fi

# [BLOCKING] A2 — 独立票及逐项证据须存在；此检查不代替独立验收判断
if ( set -o pipefail; test -s /Users/luca/.codex/worktrees/14c3/luca_gstack/framework-audit/2026-10-27-five-direction-evaluation.md ); then echo 'PASS A2'; else rc=$?; echo 'FAIL A2'; exit "$rc"; fi

# [BLOCKING] A3 — 差异无空白错误；该检查不代替行为验证
if ( set -o pipefail; git -C /Users/luca/.codex/worktrees/14c3/luca_gstack diff --check ); then echo 'PASS A3'; else rc=$?; echo 'FAIL A3'; exit "$rc"; fi

# [BLOCKING] A4 — 发布前远端必须为待推提交的祖先；REMOTE_MAIN_SHA 为刚刚核验的远端 SHA
if ( set -o pipefail; git -C /Users/luca/.codex/worktrees/14c3/luca_gstack merge-base --is-ancestor "$REMOTE_MAIN_SHA" "$RELEASE_SHA" ); then echo 'PASS A4'; else rc=$?; echo 'FAIL A4'; exit "$rc"; fi

# [BLOCKING] A5 — 推送及本地同步后的三个实际 SHA 一致
if ( set -o pipefail; test "$RELEASE_SHA" = "$READBACK_REMOTE_SHA" && test "$RELEASE_SHA" = "$(git -C /Users/luca/Desktop/luca_gstack rev-parse HEAD)" ); then echo 'PASS A5'; else rc=$?; echo 'FAIL A5'; exit "$rc"; fi
```

A0–A3 是 U006 发布前集合，支持 R1–R4；A1 在复用现有 suite 而未创建脚本时由证据报告内具名现有命令替代，该替代命令和非零退出传播须在执行前冻结。A4 在 U007 提交后、推送前执行；A5 在 U007 推送和本地同步后执行，两者支持 R5，不作为 U006 的前置。A4/A5 的变量均来自本轮实际只读查询，不以缓存远端或人工输入冒充；本地脏文件安全检查是额外阻塞门。计划内容改变时重新计算 SHA，并按 Plan 合同绑定实际用户确认。

回退：修改前保存精确 preimage 和 hash；只撤回本任务自身的差异，个人文件只在与本任务写后字节匹配时恢复，绝不覆盖后续用户编辑。提交或推送失败保留当前真实状态、输出与下一步，不强行重试。阶段及发布前按 long-session owner 保存可追溯 checkpoint。

<!-- FILE_END: five-direction-execution-plan -->
