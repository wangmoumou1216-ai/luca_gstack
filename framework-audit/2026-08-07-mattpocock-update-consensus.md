# mattpocock/skills 更新对标 — 终审共识与握手 Plan（2026-08-07）

> 链路：窗口靶子 → R1/R2/R3 独立红队 → 独立终审 → 路径/治理补正。  
> 当前状态：**REVIEW DONE / HANDSHAKE REQUIRED / EXECUTION NOT STARTED**。  
> 未经 luca 批准，不执行融合、不替换全局 skill、不推进 registry/pins。

## A. 终审裁决

| 项 | Verdict | 最终处置 |
|---|---|---|
| SC-20260807-001 双 harness 硬门 | **ADOPT（治理源修复）** | 将 Claude/Codex 的 trigger/execute/degrade/verify 四格闭环写入 FUSION canonical gate；BENCHMARK、CLAUDE、AGENTS 只放指针。任一端未闭合即 BLOCK。 |
| C1-A tdd→codebase pointer | **MODIFIED / DEFER** | 禁止直接 refresh；没有本地 seam 失败样本。首次真实 seam 问题时才做双端 pilot，不改 tdd。 |
| C1-B codebase-design 可达性 | **ADOPT（现存缺陷修复）** | route map 已会向 Codex 提示该 skill，但 Codex catalog 不可达。完整目录迁到共享 `~/.agents/skills`，Claude 改软链；不得只迁两文件。 |
| C2 diagnosing redaction | **ADOPT（最高优先安全修复）** | 不新建 skill；在现有 systematic-debugging 修 source-side 泄漏命令与 HITL 输出，再加契约。单加 prose 或单次 canary 不算完成。 |
| C3 writing-for-agents | **MODIFIED / ADOPT 一句** | 不安装整 skill；在 skill-authoring SSOT 只加一句 environment/cache doctrine，CLAUDE/AGENTS 只放触发指针。 |
| C4 logic HTML prototype | **DEFER / NO GAP** | 不建入口、模式或 gap；首次真实“只验证状态机、非视觉”任务先做一次性 demo。 |
| C5 grilling rounds | **REJECT / KILL STANDS** | 上游转正不替代本地需求；原重启门“≥2 次真实不耐烦且 narrow-to-2 无效”不变。 |
| C6 to-questionnaire | **MODIFIED / DEFER** | 保留既有 gap；首次真实递给具名知识持有者时先做一次性问卷 pilot，不自动 merge/register。 |
| C7 wizard | **REJECT** | 外部写、部分状态、不可回滚、错误 repo/account 与用户终端控制断点未解决。 |
| C8 phase-boundary tree | **REJECT** | Claude slash/150k/compact/handoff 语义与本地双 harness、durable handoff 冲突。 |
| C9 wait-what | **REJECT** | “没懂/说人话”已经是充分自然语言 trigger；独立 skill 增加认知成本。 |
| C10 其余窗口 | **MODIFIED / NO INDEPENDENT ADOPTION** | 并非全是噪音；`.agents/writing-docs.md` 是真实行为变化，但可复用差值由 C3 吸收。ask-matt router、rounds 消费者、删除/发行变化只入本轮裁决记录。 |

### 终审 NEW FINDINGS

1. C1-B 与 C2 写入全局目录，repo worktree 无法隔离；必须先做 disposable candidate，再经第二道人裁
   原子替换。
2. S7 只验证仓库 office 软链，不覆盖全局 external skill、跨 skill nested reference 或行为。
3. 当前 systematic-debugging 已存在真实泄漏面：IDENTITY 参数展开、`env | grep IDENTITY`、HITL
   任意错误文本原样输出。
4. 判官初稿中的路径已纠正：
   - pins：`.claude/skill-os/external-skills/installed-pins.yaml`
   - benchmark：`.claude/skill-os/evolution/BENCHMARK-RUNBOOK.md`
   - vetting：`.claude/skill-os/external-skills/vetting-registry.yaml`
   - adopted：`.claude/skill-os/evolution/ADOPTED.md`

## B. 握手范围

### B1. 批准后会改的 repo 行为文件

**双 harness 治理源：**

- `.claude/skill-os/evolution/FUSION-RUNBOOK.md` — canonical 2×4 阻断门。
- `.claude/skill-os/evolution/BENCHMARK-RUNBOOK.md` — W⑤/W⑦/W⑧/W⑨ 指向 canonical gate。
- `CLAUDE.md` — Claude 框架改动触发指针，不复制规则正文。
- `AGENTS.md` — Codex 框架改动触发指针，不复制规则正文。

**agent 文档手艺：**

- `.claude/skill-os/skill-authoring.md` — 仅新增一句：
  “所有 agent-consumed docs 以 environment 为 SSOT；只缓存不能廉价重获的信息。”
- `CLAUDE.md` / `AGENTS.md` — 复用上面的 canonical pointer，不建立 `$skill-authoring` 假入口。

**defer 规则修正：**

- `.claude/skill-os/evolution/gaps-register.yaml` — 只改 `GAP-decision-questionnaire` 的 trigger 后动作：
  先一次性 pilot，复用或失败证据成立后才重审 merge/register。

### B2. 批准后会制作的全局 skill candidates

**C2 systematic-debugging（共享真身）：**

- `/Users/luca/.agents/skills/systematic-debugging/SKILL.md`
- `/Users/luca/.agents/skills/systematic-debugging/scripts/hitl-loop.template.sh`

先扫描全部 bundled references/scripts；若发现还需改第三个文件，立即 BLOCK，回到扩范围人裁，不静默扩写。

**C1-B codebase-design（完整目录迁移）：**

- `/Users/luca/.agents/skills/codebase-design/SKILL.md`
- `/Users/luca/.agents/skills/codebase-design/DESIGN-IT-TWICE.md`
- `/Users/luca/.agents/skills/codebase-design/DEEPENING.md`
- `/Users/luca/.claude/skills/codebase-design` — 从真实目录改为指向共享目录的软链。

明确不改：`/Users/luca/.agents/skills/tdd/**`。

### B3. W⑨ 完整回写面

- `framework-audit/2026-08-07-mattpocock-update-consensus.md`
- `.claude/skill-os/external-skills/vetting-registry.yaml`
- `.claude/skill-os/evolution/ADOPTED.md`
- `.claude/skill-os/evolution/adoption-log.jsonl`
- `CHANGELOG.md`
- `.claude/skill-os/evolution/benchmark-registry.yaml`
- `.claude/skill-os/external-skills/installed-pins.yaml`

Pins 精确规则：

- codebase-design：安装路径改共享真身；采用当前路径域 commit，记录 Claude 软链与 local adaptation。
- tdd：不 refresh；仅把本窗口路径变化裁决写入 path-domain ack，禁止用 repo HEAD 冒充 path SHA。
- systematic-debugging：保留 obra/superpowers 的源 watch 语义，在 note/adoption-log 记录本次 mattpocock
  redaction port，不伪装成上游 refresh。

记忆规则：

- `SC-20260807-001` 在治理源修复、双端验收与回滚条件齐备后，才走
  candidate→review→promote；不得直接编辑 `promoted-facts.yaml`。

## C. 执行 Phase（仅在握手后）

### Phase 0 — 范围与隔离

1. 分别批准四轨：G0 双端治理门、G1 C2 安全、G2 C1-B 可达性、G3 C3 一句 doctrine；
   C6 只批准 defer trigger 修正。
2. 每轨运行 fusion impact analysis，列出隐式耦合。
3. repo 改动在独立 worktree 完成；全局 skill 在 disposable directory 制作 candidate。
4. 当前 main 的用户未跟踪文件与本 session 审计文件一律不移动、不 stash、不覆盖；最终集成前若
   main 仍 dirty，停下由 luca 决定，不自行清理。

### Phase 1 — 先做最高优先安全轨 C2

1. 把敏感数据过滤放到命令/脚本源头，不允许“raw output 先泄漏、commentary 再遮”。
2. 修正 IDENTITY 检查为只输出 SET/UNSET，不输出值；删除/替换 `env | grep IDENTITY`。
3. HITL 捕获只接受明确的非敏感诊断字段；任何自由文本在输出前做 canary-aware redaction。
4. 补通用 Redact 契约，但契约只解释行为，不能替代上述机械修复。

### Phase 2 — 修 C1-B 现存双端可达性

1. 复制完整 codebase-design 三文件到 disposable shared candidate。
2. 同步 harness-neutral subagent 表述；保持内部 relative references 全闭合。
3. 不吸收 tdd pointer；不把 Claude slash 写进共享语义。
4. 候选通过后，等待全局原子替换人裁。

### Phase 3 — repo prose 与 defer 规则

1. 在 FUSION 写 canonical 2×4 gate：任一端 trigger/execute/degrade/verify 缺失即 BLOCK；
   catalog、route hint、静态 wiring 均不能单独充当行为验证。
2. BENCHMARK 与 CLAUDE/AGENTS 只写指针；不复制整段规则。
3. skill-authoring 只加一句 environment/cache doctrine。
4. questionnaire gap 改成“首次真实触发→一次性 pilot→有复用/失败证据再重审融合”。

### Phase 4 — 静态、A/B 与对抗门

1. repo 静态/契约/路由/model/hook/quality 全绿。
2. 所有 prose 改动跑 baseline/candidate A/B；baseline arm 禁止读取 candidate。
3. preflight-agent、quality-gate、redteam 均无 BLOCKING。
4. 所有结果落审计证据；未跑的 live test 只能标 Future Gate，不能写 PASS。

### Phase 5 — 第二道人裁与可恢复全局激活

1. 展示 repo diff、A/B、红队票、全局 candidate diff、明确备份路径与恢复命令。
2. luca 批准后才激活：旧全局目录先移动到具名备份，candidate 再原子换入；不删除旧目录。
3. 任一 live gate 失败立即恢复原目录与原 Claude link；不继续试错。

### Phase 6 — Claude/Codex 双活体阻断门

| 轨 | Claude Code BLOCKING | Codex BLOCKING |
|---|---|---|
| G0 parity gate | Claude-only slash/hook 案例必须被识别为 Codex 未闭环并 BLOCK；完整 2×4 才可继续 | Codex-only agent/hook 案例必须被识别为 Claude 未闭环并 BLOCK；静态 wiring 不能冒充 verify |
| G1 redaction | 真实 Claude 调试路径不得在 raw output/transcript/artifact 出现 AWS/GitHub/Bearer/cookie/IDENTITY sentinel，且诊断信号仍可用 | 同一组 sentinel 跑真实 Codex tool path，零泄漏且仍能定位问题 |
| G2 codebase | 语义触发能加载共享三文件；reference 模式不误启动无关 slash；subagent 不可用时明确 BLOCK | route 提示与 `$codebase-design` 实际可发现；nested references 可读；并行分支使用 Codex 原生协作，缺失则 BLOCK |
| G3a authoring | 编辑任意 agent-consumed doc 时从 canonical pointer 加载 doctrine；pointer 缺失即 BLOCK | AGENTS 指向同一 doctrine，不虚构 `$skill`；link/route fixture 与行为 A/B 均通过 |
| G3b questionnaire defer | 首次真实向具名知识持有者递交待决时，只产一次性问卷 pilot；收件人/要拿回什么的人裁缺一即 BLOCK；不得 merge/register | 同一真实场景走自然语义或纯文本人裁，不虚构 `$to-questionnaire`；只产一次性 pilot，route/registration 保持无新增，否则 BLOCK |

任何一格 FAIL：该轨不 merge、不写 pin/registry；允许其它已独立全绿轨单独请求人裁，禁止捆绑放行。

### Phase 7 — 最终人裁、落地与 W⑨

1. 第三道人裁确认每轨 PASS/DEFER/REJECT 与最终 diff。
2. repo 仅以单提交 squash 落地；全局 candidate 保持已验证版本。
3. 一次性完成 B3 全部 SSOT 回写；缺任一项不得标 DONE。
4. registry 基线推进到 `84fdeffd12f2ee307994d1eb6feb48173b6e0502`，记录 99 logical deltas、
   实际采纳、defer/reject 与双端验证结果。
5. 通过治理评审后再处理 `SC-20260807-001` promotion。

## D. 失败与回滚

- 任一静态门、A/B、红队、live gate 失败：**该轨**不 merge、不改该轨 pins/registry、不标 DONE；
  其他独立全绿轨仍按 Phase 6 的规则单独请求人裁，禁止捆绑放行。
- 同一问题连续失败三次：`BLOCKED`，停止继续试错。
- 全局写入：使用具名备份 + 原子换入；失败恢复旧目录和旧 symlink；不删除备份。
- repo：门禁前主分支不接收融合改动；门禁后如需回退，优先在干净树上经用户批准 `git revert`。
  本 Plan **不授权** `git reset --hard`，也不清理用户 dirty files。
- 任何 preflight 要求扩大 B1/B2 文件集：立即回到人裁，不以“顺手修”扩范围。

## E. 明确不做

- 不安装 mattpocock plugin，不切自动更新渠道。
- 不 refresh tdd，不采 `/codebase-design` literal pointer。
- 不建 logic-demo skill/mode/gap。
- 不采 whole-frontier rounds、wizard、phase-boundary tree、wait-what。
- 不把 questionnaire 触发直接等同 merge。
- 不把单 harness 绿、catalog 可见、S7 绿或 prose 存在写成“双端完成”。

## F. 人类握手门

等待 luca 对以下四轨逐项批准：

- **G0** 双 harness 治理硬门（推荐批准）
- **G1** systematic-debugging 安全修复（推荐批准，最高优先）
- **G2** codebase-design 现存双端可达性修复（推荐批准）
- **G3** environment/cache 一句 doctrine + questionnaire trigger 修正（推荐批准）

可回复“批准 G0–G3”或只批准其中部分。收到批准前，执行阶段保持未启动。

<!-- FILE_END: 2026-08-07-mattpocock-update-consensus.md -->
