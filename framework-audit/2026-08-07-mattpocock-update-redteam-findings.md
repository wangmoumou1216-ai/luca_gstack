# mattpocock/skills 更新对标 — 独立红队回票与对质（2026-08-07）

> 靶子：`framework-audit/2026-08-07-mattpocock-update-review.md`。R1-R3 均使用全新上下文、
> reasoning-heavy、只读回源；未修改靶子或证据基底。本文件保留会改变终审的 findings、证据与影响，
> §4 是编排者公开回应，§5 是独立终审待裁清单。

## 1. R1 — census / lifecycle / source quality

### R1-F1 — 99 项 census：**PASS**

- 独立复算：`M54 + A12 + D28 + R5 = 99`；shortstat 为
  `99 files changed, 2363 insertions, 1569 deletions`；五桶 `20+26+4+31+18=99`。
- base→HEAD ancestry、106 commits、28 first-parent、二进制 0 均复算一致。
- 限定：99 是 Git 的 99 个逻辑 delta entries；若 rename 两端都按 pathname 计是 104 个路径。
  靶子的 “99 unique files” 宜在终审改称 “99 logical delta entries”。

**影响：** 窗口分母成立。

### R1-F2 — “direct-read 99/99”：**NOT_PROVEN as artifact**

- 靶子没有为每个 delta 留 blob/hash/读取回执；A 无旧 blob、D 无新 blob，“A/D/R 均读新旧 blob”
  字面也不成立。
- 红队可独立证明所有 blob/diff 可达，不能证明编排者历史上逐份完成语义阅读。

**影响：** census 是可复算 FACT；direct-read 只能保留为过程声明，不得与 census 同证据强度。

### R1-F3 — 生命周期主事实：**PASS**

- promoted `22→25`、全仓 SKILL `41→35`、plugin `22→25` 成立。
- questionnaire R100/body 0 diff；wizard R078/R069/R091；wait-what 窗口内新增后转正；
  writing skill breaking replacement 无 alias；batch 行为进入 grilling，均成立。

### R1-F4 — deprecated 吸收关系：**PARTIAL FAIL（provenance）**

- 四条映射内容正确，但不是 `c66bdeee` commit body 逐条给出；真出处是该提交创建、随后 release
  删除的 `.changeset/remove-deprecated-and-personal.md`。

**影响：** 结论不变，证据归因必须在终审修正。

### R1-F5 — 上游三处页面漂移：**PASS**

- `docs/engineering/diagnosing-bugs.md:70-71` 称 redaction 未实现，而 SKILL 已实现。
- `docs/engineering/codebase-design.md:72` 称 reference 写死 Agent tool，而 reference 已中性化。
- `docs/engineering/wizard.md:44` 称有 time remaining，而 SKILL/template 已无时间估计。

**影响：** 本轮以 SKILL/reference/script 为行为真值有实证基础。

### R1-F6 — C10 blanket NO-OP：**PARTIAL FAIL / NEW FINDING**

- `.agents/writing-docs.md:48-56,75-95` 是 agent-consumed 根契约：新增先查个人 wiki、GitHub
  issues、CHANGELOG 的问题研究流程，以及去作者归因、Dictionary links、分支结构与 Done gate；
  不能只归为人类页面四段式。
- `ask-matt/SKILL.md` 除 phase tree 外还改写工作目录/ticket `/clear` 与多 skill router。
- `triage/SKILL.md:76`、`loop-me/SKILL.md:8` 的 one-question→round-at-a-time 是 grilling
  primitive 向消费者的行为传播，靶子只评 primitive、未显式评消费者。
- harness-neutral 三处、删除项无本地 counterpart 的判断仍成立。

**影响：** C10 的最终 NO ACTION 可能成立，但不能把这些上游行为变化称为纯噪音；终审须补 need-first
裁决，尤其判断 writing-docs 根契约是否被 C3 吸收。

## 2. R2 — lineage / need-first

| 候选 | 红队 verdict | 核心证据与影响 |
|---|---|---|
| C1 tdd↔codebase | **MODIFIED** | 直接 refresh BLOCK 成立；“成对适配后再采”不是当前动作。本地 tdd 已先确认 seam，靶子自认没有失败样本；共享迁移解决同步，不证明需求。改为 `BLOCK + demand-triggered pilot`，质量改善 NOT_PROVEN。 |
| C3 writing-for-agents | **MODIFIED** | 不装整 skill 成立；两条还能削成一句。现有 authoring 已覆盖 scope/pointer/SSOT/duplication/pruning；真正差值是“所有 agent-consumed docs 以 environment 为 SSOT，只缓存不能廉价重获的信息”。本仓漂移实证使需求成立。 |
| C4 logic HTML | **STANDS** | capability sliver 真新，本地重型 UI 链不覆盖；但无真实需求。继续 DEFER；首次触发先做一次性 logic demo，比新增模式/入口更薄。是否值得开 gap 在本证据内 NOT_PROVEN。 |
| C5 grilling rounds | **STANDS** | 上游转正使旧供应侧反证失效，但本地逐题、sharpening、escape hatch 仍承重；旧重启门（≥2 次真实不耐烦且 narrow-to-2 无效）零新增，未满足。 |
| C6 questionnaire | **MODIFIED** | DEFER 成立；graduation 不等于消费。首次真实触发时先按三步契约产一次性问卷，观察复用/失败，再决定是否 merge/register，而非 trigger 一到自动吸收。 |
| C8 phase tree | **STANDS** | 150k、slash、handoff 语义与本地 auto-summary/durable handoff/Codex 冲突；未见本地误判需求，更薄替代是零新增。 |
| C9 wait-what | **STANDS** | 自然反馈已是充分 trigger；单独入口增加认知成本；ASD-STE100 对中文增益 NOT_PROVEN。 |

**R2 总结：** C4/C5/C8/C9 stands；C1/C3/C6 modified；无 overturned。同步、转正与供应侧新增均不能
替代本地 need evidence。

## 3. R3 — dual harness / security

### R3-F1 — C1 直接 refresh：**STANDS / BLOCK**

- 上游 tdd 同时写 `/codebase-design` 与 “reference to consult, not a session to run”，入口与执行
  语义含歧义。
- 全局 tdd 共享可见；codebase-design 只在 `~/.claude/skills`；installed-pins 也钉 Claude-only。
- 上游 OpenAI metadata 仅展示，不提供 nested load/dispatch；S7 只查仓库 office 软链，不查全局
  external skill 或跨 skill closure。
- NEW FINDING：`skill-routing-map.yaml` 已可向 Codex 提示 codebase-design，但 Codex catalog
  不存在该 skill；提示成功会掩盖执行不可达。

**影响：** Claude 可能把只读 reference 误启动为 slash session，Codex 则悬空；发现性不等于行为闭合。

### R3-F2 — C2 redaction：**MODIFIED / 安全阻断扩大**

- 当前共享 systematic-debugging 的 IDENTITY 参数展开在变量已设置时会输出 `SET<真实值>`；
  `env | grep IDENTITY` 直接输出完整值。
- 本地 `scripts/hitl-loop.template.sh:35,39-44` 会原样打印任意错误文本；若错误携带 header/cookie/
  token，会先进入 raw tool output。
- 上游新增的是 prose 契约；其 HITL capture 仍原样打印。模型在 commentary 里事后清洗无法撤销已经
  进入 transcript 的 raw output。

**影响：** 移植方向成立，但“补原则 + 单次 canary”不足。握手 Plan 必须把现存命令、所有 bundled
references/scripts 的 source-side filtering 纳入改动与多类 canary；否则两个 harness 都仍有真实泄漏路径。

### R3-F3 — C7 wizard：**STANDS / REJECT 加强**

- `write_env` 无确认即 touch/rewrite/mv、无备份；GitHub secret/variable 直接写、无目标 repo/account/
  host 固定；无 trap/事务/rollback，Ctrl-C 会留部分状态。
- `set_var` 成功未入 WRITTEN 台账却可能显示完成；newline 可破坏 env；`gh auth status` 不证明目标
  repo/account/host。
- mock 不证明真实 scope/权限/部分成功/覆盖旧 secret 的不可恢复性。
- NEW FINDING：把脚本交给用户终端执行，会绕过 Claude/Codex 的 sandbox、hook、审批与 project pin；
  “只生成不代跑”不是双端安全闭环。

**影响：** 当前版本不得进入握手 Plan；未来重启除需求次数外，还必须先解决事务、范围绑定、取消/回滚
以及 harness→用户终端的控制断点。

### R3-F4 — §4 九项矩阵总裁决

| 候选 | Verdict | 红队判定 |
|---|---|---|
| C1 | STANDS | Claude T 有 slash/reference 歧义；Codex dependency 不可发现；V 未闭合。 |
| C2 | MODIFIED | 两端共享真实泄漏路径；raw-output 全路径未验。 |
| C3 | MODIFIED | 当前 trigger 只覆盖 skill 编辑；不存在可调用的 authoring `$skill`，两端主要靠手动 prose，T/E/D/V 未闭合。 |
| C4 | STANDS-DEFER | 两端都没有入口/执行体，矩阵只是未来验收描述。 |
| C5 | STANDS-REJECT | 两端都没有 rounds 行为或 A/B。 |
| C6 | STANDS-DEFER | future `$to-questionnaire` 不存在，S7 不证明行为。 |
| C7 | STANDS-REJECT | upstream 自动触发与本地显式门冲突，E/D/V 不安全。 |
| C8 | STANDS-REJECT | Claude 可用 slash 不等于本地采纳；Codex 无 slash；恢复演练未发生。 |
| C9 | STANDS-REJECT | 用户理解是唯一验收，不需要 discoverability。 |

## 4. 编排者公开回应（不改靶子）

### 接受

- 接受 R1 对 99 项措辞、direct-read 证据等级、deprecated provenance、C10 漏项的全部修正。
- 接受 R2 将 C3 压成一句 doctrine、C4 首次一次性试跑、C6 首次一次性问卷的更薄方案。
- 接受 R3 扩大 C2 范围：必须修现存 source-side 泄漏路径并多 canary，不能只补 prose。
- 接受 C5/C7/C8/C9 的拒绝/defer 与加强理由。

### 唯一对质：C1 要拆成两个问题

- **C1-A tdd 新 pointer 是否有本地需求：** 同意 R2——无失败样本，不能现在采；保持 BLOCK，
  首次真实 seam 问题再 pilot。
- **C1-B 现有 codebase-design 双端可达性是否已经是缺陷：** R3 发现 route map 已会向 Codex 提示
  codebase-design，而 Codex catalog 不存在；这不是未来 tdd 收益，而是当前“提示可用、实际不可达”的
  broken affordance。是否应在本轮独立修复，不能被 C1-A 的“无 tdd 痛点”一起否掉。

### R1-F6 的处置争点

- `.agents/writing-docs.md` 是真实上游行为增量；但其个人 wiki/GitHub issue/CHANGELOG 流程是上游
  仓特定流程，不能因“是行为”就原搬。本地可复用部分可能已被 C3 那一句 environment/cache doctrine
  完整吸收。请终审裁“独立候选 vs C3 supporting evidence vs no-op”。

## 5. 独立终审待裁清单

1. **J1：** C1-A 保持 BLOCK+demand pilot；C1-B 的现存 route→catalog broken affordance 是否单独纳入 Plan。
2. **J2：** C2 是否升级为本轮优先安全修复；精确改动面是否含 SKILL + bundled scripts/references +
   raw-output canary matrix。
3. **J3：** C3 是否只落一句 environment/cache doctrine；如何在 Claude/Codex 都可达且不虚构
   `$skill` trigger；R1 的 writing-docs 是否仅作支持证据。
4. **J4：** C4 是记 gap、只记 trigger，还是完全归档；首次出现是否只做一次性 demo。
5. **J5：** C6 保持旧 gap，但把 trigger 后动作改为一次性 pilot，还是维持旧“直接 merge”。
6. **J6：** C5/C7/C8/C9 与其余删除/发行/route 传播如何静音，避免下轮重复评审又不抹掉供应侧变化。
7. **J7：** 最终握手 Plan 的每项双端断言、失败策略、回滚与 SSOT 回写范围；必须停在人类裁决门。

<!-- FILE_END: 2026-08-07-mattpocock-update-redteam-findings.md -->
