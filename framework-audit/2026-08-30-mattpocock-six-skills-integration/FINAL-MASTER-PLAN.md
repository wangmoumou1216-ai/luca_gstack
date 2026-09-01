# LucaGStack 受控变更基础层 + Matt Pocock 六项 Skill 接入主计划

日期：2026-08-30  
状态：`READY_FOR_GATE_A_PLAN`  
仓库基线：`4658595ac20ce544cb406657c70ba3259eb1f842`  
上游冻结：`mattpocock/skills@6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`  
发布目标：literal URL `https://github.com/wangmoumou1216-ai/luca_gstack.git`，destination `refs/heads/main`；source 在 U-008 固定为 approved immutable commit OID

计划证据根：`framework-audit/2026-08-30-mattpocock-six-skills-integration/`

> 本文取代同目录此前过度设计的 `FINAL-EXECUTION-PLAN.md`，是唯一待批准执行计划。
> 用户批准本文 SHA 前，不安装 Skill、不生成 bootstrap 实现、不改 personal adapter、不 commit、不 push；批准本文只先授权 scratch bootstrap preparation。首次仓库 mutation 仍须 Gate A-bootstrap 批准 exact patch；同一门同时批准 fresh bootstrap PASS 后才生效的 U-003～U-007 repo allowlist 与 U-006 条件性 personal paths。

## 0. 前提门

### 0.1 该不该做

应该做两件事，但必须分层：

1. 六项 Skill 确有净新增价值，应进入 LucaGStack；
2. “任何计划修改 LucaGStack 时，如何限制越界、保护他人 WIP、核对 commit/push”是框架级共性问题，应建设一次最小共享能力，六项安装只消费它。

### 0.2 更小替代

只靠提示词、人工 `git diff` 和 `careful` 能覆盖低风险单次修改，但不能稳定约束 Claude/Codex 的计划执行、精确路径与 stale preimage。最薄完整方案不是 daemon/authority OS，而是：

- 一个 `change-manifest` 合同与 CAS 校验器；
- 一个仅在 manifest 激活时工作的双 harness PreToolUse guard；
- scratch 产 patch、可信主 Agent核验后应用；
- Git effect 默认禁止，发布前再走独立人类门。

### 0.3 默认形态偏差

默认把“受控变更基础层”纳入本计划，会让方案偏向新增基础设施。独立 safety reviewer 以“现有能力已足够、默认 REFUTED”立场复核；只有跨 Skill/跨未来框架任务仍成立的合同进入基础层，diagnosing/resolver/personal cutover 的专用逻辑不得上升为通用平台。

### 0.4 现实 threat boundary

受控变更层：

- 机械约束 fresh Claude/Codex 当前工作树内、经已注册工具/hook 发起的改动；
- 机械拒绝未授权路径/effect、stale preimage、隐式 stage/commit/push；
- 对终端、IDE、旧 linked worktree、已在运行的同用户进程只做 baseline/CAS 检测，发现漂移立即停下；
- 不承诺防恶意 trusted main、被攻破的 hook/CLI/凭据或任意本机进程；
- 不尝试用 `session_id` 区分同 session 的主 Agent 与 subagent。

### 0.5 Kill assumptions

- `KILL-1`：Claude/Codex fresh session 均能加载新增 change-control guard，且 active manifest 下 hook 异常可 fail-closed；否则基础层不得上线。
- `KILL-2`：active controlled mode 可拒绝任意 Bash 写，只允许结构化文件操作或精确 patch；若当前 harness 无法表达，退回“scratch + 主 Agent apply”并重规划，不假装已机械强制。
- `KILL-3`：项目级 canonical skill 在 Claude/Codex 的实际解析优先级高于 personal/plugin 同名项；fresh loader 若否定，先停下解决 collision。
- `KILL-4`：`tech-spec`、Plan Agent、task-plan、Orchestrator 可分别拥有 synthesis、planning、task truth 与 execution，不需新增第二套 spec/plan/state。
- `KILL-5`：optional graph 能表达建议边、条件 gate 与异常回路而不保存运行状态；否则只保留 standalone 接线。
- `KILL-6`：上游六份 source SHA 与 MIT lineage 可复验；任一漂移先重新冻结。
- `KILL-7`：发布前 upstream `main` 必须精确等于 Gate B 的 expected-old OID；否则不 rebase、不做 non-fast-forward overwrite，返回 `NEEDS_CONTEXT`。`--force-with-lease=<ref>:<expected-old>` 只允许作为该精确 old-OID 的 CAS，且 new commit 必须是 old 的单亲 fast-forward。

## 1. 复杂度与研究裁决

```text
复杂度模式: Hierarchical
理由: 同时包含框架基础层、六项 Skill/路由/Flow、personal collision、双 harness 活体验收与不可逆 Git 发布。
模式可组合: Sequential 外层 + 能力正文 Parallel Fan-out + 每阶段 Supervisor
需要用户确认: 是
任务规模 Tier: Deep（8 个 U-block，含 personal 写入与 commit/push）
```

研究裁决：不新增外部研究 Phase。上游已冻结到 commit/source hash，本仓 hook、router、Plan Agent、Orchestrator 与 loader 已完成多轮源码审查；当前缺口是本地架构与执行合同，不是外部事实。执行开始时只重验 bytes、collision、dirty owner 与 harness 活体能力。

本任务无产品设计链 task-plan，块 1.5/1.6 N/A。

## 2. 用户溯源

| ID | 用户原话 | 计划含义 |
|---|---|---|
| `USR-001` | “如果对方确实做得好，从价值角度来看，我需要将它们纳入到我的开发流程中。” | 六项逐项保留净新增价值，不因已有相近能力直接拒绝 |
| `USR-002` | “它要安装的话，那是替换关系还是新增关系，以及它是否应该进入我的一个代码流程” | 明确 facade/新增/替换与 Flow 身份 |
| `USR-003` | “claude和codex必须都能用” | 双 harness fresh loader 是硬门 |
| `USR-004` | “当我使用自然语言时，可能会触发到这些 Skill；以及当你在执行一些流程时，你也会自主触发到这些 Skill” | 六项必须 direct、semantic、internal 三层可达 |
| `USR-005` | “继续安装，完成后commit并push” | 计划获批且最终发布门确认后，精确 commit/push |
| `USR-006` | “如果是lucagstack考虑的。那你纳入计划。统一调整吧” | 共性受控变更能力作为共享基础层纳入，不做 skill-specific 临时补丁 |
| `USR-007` | “你的计划做的太慢了。能不能快一些” | 主计划限制为 8 个 U-block；同一 SHA 一轮终审，不因非硬风险继续扩建 |

## 3. 第一性架构裁决

### 3.1 共享基础层

名称：`controlled-change`（内部基础能力，不是用户点名 Skill）。

触发：Plan Agent / Orchestrator 准备修改 LucaGStack 时自动进入；问答、只读审查和下游项目工作不激活。

最小合同：

1. manifest 固定 repo realpath、baseline HEAD、plan SHA、session、精确 repo-relative paths、另行批准的 external absolute paths、mutation classes 与 Git/external effects；
2. 首次安装 controller/guard 的 U-001/U-002 走一次性 exact-bootstrap 门：只在 scratch 产 patch，经独立审查后，用户同一 payload 批准 patch SHA/preimage、U-003～U-007 repo allowlist 与 U-006 条件性 personal paths；可信主 Agent精确应用 bootstrap，fresh 双 harness 验收通过前后续授权保持 dormant、不派发 U-003；
3. 执行前记录 target preimage 和现有 dirty owner，执行时每次 apply 前做 CAS；
4. worker 默认只写 scratch，可信主 Agent只应用 manifest 范围内 exact patch；
5. U-003 起只能由 one-shot controller 先持久化独立 non-terminal required witness，再写 active marker，二者 fsync 后才派发 writer；required witness 存在时 marker 缺失、畸形、过期或 plan/manifest SHA 不匹配一律 fail-closed；真正未进入受控执行的只读/普通任务保持 inactive；
6. active manifest 下 Git stage/commit/push/ref 默认拒绝，只有发布 U-block + 人类门放行；
7. durable receipt 区分 `PREPARED / APPLIED / VERIFIED / EFFECT_UNKNOWN / COMPLETED / ABORTED`。

明确不做：daemon、capability FD、签名 authority registry、OS 级 repo-global lease、恶意主 Agent 防护、通用两阶段远端发布协议。

### 3.2 六项 Skill 身份

| Skill | 安装关系 | Luca owner | Flow 身份 |
|---|---|---|---|
| `to-spec` | 新增同名薄 facade | `tech-spec(conversation_synthesis)` | 投影到既有 tech-spec 节点 |
| `implement` | 新增同名薄 facade | Plan Agent 编译；Orchestrator 执行 | 用户可见代码节点，不拥有第二份状态 |
| `wayfinder` | 新增 planning facade | Plan Agent `wayfinder` mode | 仅 `huge AND multi-session AND fog` 的条件前置 |
| `grilling` | 新增独立方法 primitive | 当前调用方 | 按需 HITL gate；一次一个问题 |
| `diagnosing-bugs` | 新增 canonical，替换自然语言主路由 | Orchestrator | unexpected failure/regression 异常回路，回原 U-ID |
| `resolving-merge-conflicts` | 新增 canonical，替换 personal containment stub 的解析目标 | Orchestrator | 真实 Git conflict 异常回路，回原 U-ID |

### 3.3 最小代码流程

```text
[wayfinder → grilling，仅条件满足时]
        ↓
tech-spec(synthesis) → task-plan → implement
                                   ↓
                           Plan Agent compile
                                   ↓
                         人类确认 approved U-ID
                                   ↓
                          Orchestrator execute
                           ├─ diagnosing → 原 U-ID
                           └─ resolver   → 原 U-ID
                                   ↓
                              code-review
```

这是可选 `engineering-delivery` preset。未选择 preset 时，六项 standalone 可用，graph 不得成为运行依赖或新状态真值。

### 3.4 三层触发合同

每项必须同时通过：

- `direct`：Claude 名称/command 与 Codex `$skill` fresh-load 项目 canonical；
- `semantic`：不含 skill 名的自然语言正例命中，邻接负例不误触；Project Gate 与 Plan Agent complexity 仍优先；
- `internal`：Plan Agent/Orchestrator 在可观测条件成立时自主选择方法，但只继承父任务 authority，不扩大写入、Git 或 external effect。

## 4. Phase 与 U-block

### 4.0 Phase 执行合同

| Phase | 编排 / phase_type / model_tier | Agent 分工 | 执行顺序 | 产出物 | 阶段门控 | skills_needed |
|---|---|---|---|---|---|---|
| 1 | Sequential + Supervisor / `task_execution` / `core-execution` | `WA-1` 只在 scratch 依次产 U-001/U-002 exact bootstrap patch；`EA-1` 独立复验 patch/preimage/controller/双 hook；Gate A-bootstrap 后可信主 Agent只应用已批 patch并启动 fresh harness | `scratch U-001 → scratch U-002 → EA-1 → Gate A-bootstrap → exact apply → fresh verify` | bootstrap patch+manifest、controlled-change schema/controller/guard、共享测试 runner/validator | patch SHA/preimage 获批且应用后逐 blob 相等；M6-A01、M6-A02 全 PASS；fresh required-context 绕过和任一 harness fail-open mutant 均非零；未过门不得进 U-003 | — |
| 2 | Parallel Fan-out + Supervisor / `task_execution` / `core-execution` | `WA-2A` 独占 U-003 文件；`WA-2B` 独占 U-004 文件；`EA-2` 独立复验六项 defining constraint、owner 与 authoring invariants | `U-003 ∥ U-004 → EA-2` | 六个 canonical skill tree、tech-spec/task-plan/Plan Agent/Orchestrator 最小适配 | 六次 quick_validate、independent-methods、facade-owner-candidate 全 PASS | `/Users/luca/.codex/skills/.system/skill-creator/SKILL.md` |
| 3 | Sequential + Supervisor / `task_execution` / `core-execution` | `WA-3` 完成 U-005；`EA-3` 独立复验 route 优先级、三层触发、graph 可删除性与 fresh loaders | `U-005 → EA-3` | commands/aliases、routing/input/graph/governance 注册面 | M6-A04～A06 与 trigger-and-flow-contract 全 PASS | — |
| 4 | Sequential + Supervisor / `task_execution` / `core-execution` | `WA-4` 依次完成 U-006、U-007；`EA-4` 对冻结 candidate 同 SHA 做 flow/safety/quality 终审 | `U-006 → U-007 → EA-4` | personal 可恢复切换、runtime candidate manifest、最终 receipt/ledger | personal rollback 通过；M6-A07 PASS；三路 reviewer 同 manifest SHA 明示 PASS | — |
| 5 | Sequential + Human Gate + Supervisor / `task_execution` / `core-execution`；不可逆操作前 EA 使用 `P0_出门前裁决/不可逆操作前复审` | `WA-5` 只执行 U-008；`EA-5` 在 Gate B 前独立核对 exact tree/OID/remote identity，不执行发布 | `EA-5 → Gate B → U-008` | 独立 index/tree、任务私有 ref、immutable commit OID、publish receipt | Gate B 精确批准；当前 `HEAD/main` 与共享 index 不变；M6-A08 PASS；remote OID 可证明等于 approved commit | — |

### Phase 1 — 共享受控变更基础层

编排：Sequential + Supervisor  
phase_type：`task_execution`  
model_tier：`core-execution`

#### U-001 — 固定 controlled-change 合同、baseline 与 receipt

- Goal：建立所有 LucaGStack 改仓计划可复用的 exact manifest、preimage/CAS 与 receipt 合同。
- Source：`USR-006`
- Dependencies：`external: Gate A-plan 批准本文 SHA（只授权 scratch bootstrap preparation，不授权仓库 mutation）`
- Files：`.claude/skill-os/controlled-change.yaml`、`scripts/controlled-change.mjs`、`scripts/controlled-change-controller.mjs`、`scripts/test-controlled-change.mjs`、`package.json`；`framework-audit/2026-08-30-mattpocock-six-skills-integration/SOURCE-MANIFEST.tsv`、`framework-audit/2026-08-30-mattpocock-six-skills-integration/DECISION-MATRIX.md`、`framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-ALLOWLIST.txt`、`framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-RECEIPT.md`；外部 `/private/tmp/luca-controlled-bootstrap-<first16-approved-plan-sha>/BOOTSTRAP.patch` 与 `BOOTSTRAP-MANIFEST.tsv`；外部 `<git-common-dir-realpath>/luca-controlled-change/matt-six-<first16-approved-plan-sha>/required-witness.json`、`active-context.json` 与 `receipt.json`（均不提交）。
- Approach：本任务的 `task-id` 唯一公式为 ASCII `matt-six-` 加 Gate A-plan 批准 plan SHA-256 的前 16 个小写 hex；`<git-common-dir-realpath>` 由 `/usr/bin/git rev-parse --path-format=absolute --git-common-dir` 解析后 realpath 固定。`IMPLEMENTATION-ALLOWLIST.txt` 是 U-001～U-007 每个 `Files` 字段中**仓库内 exact path**的 UTF-8/LF、C-locale 排序去重并集（包括该 allowlist 自身；排除 external absolute paths、U-008 Git effects 与不在 Files 中的旧草稿）；controller 每次只激活当前 U-ID 对应子集，不能把总并集当成单次权限。首次 bootstrap 例外只在上述确定性 `/private/tmp` 目录生成覆盖 U-001/U-002 repo-local Files 的 exact patch 与 path/type/mode/preimage/postimage manifest；EA-1 审查后 Gate A-bootstrap 的单一 payload 同时批准 plan SHA、patch SHA、全部 bootstrap preimage/postimage、U-003～U-007 的上述确定性 repo allowlist，以及 U-006 `Files` 已列出的条件性 personal external paths。可信主 Agent只在 preimage 仍相等时应用 bootstrap patch；其余 authority 标记为 `dormant_until=fresh_bootstrap_pass`，逐 blob 回读和 fresh Claude/Codex 验收全 PASS 后才可激活。之后 U-003 起 controller 先原子写 non-terminal `required-witness.json`（`state=REQUIRED`，含 plan/manifest/generation/expiry）并 fsync 文件和父目录，再同样写 `active-context.json`，两者都可回读且互相 hash 绑定后才派发；guard 先读 witness，非终态 witness 下 active 缺失/畸形/stale 一律 deny。`check` 在 apply 前后做 path/type/mode/blob CAS；`authorize-effect` 只能在对应人类门后写一次性 effect；`finish/abort` 先写 durable receipt，再以 CAS 把 witness 改为终态并移除同 generation active marker；终态 witness+匹配 receipt 才可恢复 inactive。任何外部并发漂移只检测并停下，不覆盖、不 stash、不 reset。
- Read List：本文全篇；`.claude/hooks/project-scope-guard.mjs`、`.claude/hooks/lib/harness.mjs`、`.codex/codex-hook-adapter.mjs`、`.claude/agents/plan-agent.md` 的用户确认/Completion Status 段、`.claude/agents/orchestrator.md` 的 authority/effect 段；`/usr/bin/git rev-parse --show-toplevel --path-format=absolute --git-common-dir HEAD`、`/usr/bin/git status --porcelain=v2 --untracked-files=all`、`/usr/bin/git ls-files --stage` 的冻结输出。
- Test scenarios：bootstrap patch 多/少 path、wrong preimage、partial apply 与 fresh loader；clean baseline；untracked/tracked/staged owner；path traversal/glob/absolute path；stale preimage；同路径并发 edit；extra path/effect；witness/active 各 crash point；non-terminal witness + active missing/malformed/stale/wrong generation；terminal witness + matching/missing receipt；inactive 普通任务；crash 后 receipt read-back。
- Verification：Gate A-bootstrap receipt 证明 exact patch/preimage/postimage；fresh session 中 `node scripts/test-controlled-change.mjs --case manifest-cas-receipt` 与 `node scripts/test-controlled-change.mjs --case controller-required-active-crash` 全部具名 PASS。
- Status：`PLANNED`

#### U-002 — 接入 Claude/Codex controlled mode guard

- Goal：让 active manifest 在双 harness 的真实 PreToolUse 上阻止未授权写入与隐式 Git effect。
- Source：`USR-003,USR-006`
- Dependencies：`U-001`
- Files：`.claude/hooks/controlled-change-guard.mjs`、`.claude/settings.json`、`.codex/hooks.json`、`.codex/codex-hook-adapter.mjs`、`scripts/verify-codex-wiring.mjs`、`scripts/test-engineering-delivery-skills.mjs`、`scripts/validate-skill-integration-receipt.mjs`、`scripts/candidate-manifest.mjs`、`scripts/verify.sh`、`package.json`。
- Approach：U-002 与 U-001 同属一次 exact-bootstrap patch：先建立共享 runner/receipt/candidate validators，并登记 U-003～U-008 的具名 `RED_NOT_IMPLEMENTED` case inventory；后续 U-block 只把对应 case 变绿，不得等 U-007 才首次创建 runner。fresh guard 先读独立 required witness：不存在 witness 且不存在 active 才是 inactive；witness 终态时还必须匹配 durable receipt；任何非终态 witness 都表示 controlled mode required，此时 active 缺失、畸形、过期、generation/plan/manifest SHA 不符均 deny。valid active 时只允许 exact structured file action 或 manifest 内 patch，任意 Bash 写和 stage/commit/push/ref/external effect 默认 deny。Claude/Codex 注册命令都必须保留 deliberate deny 的 exit 2；若 hook/Node 自身异常，shell wrapper 对非终态 witness 一律 exit 2，仅严格 inactive 才允许 fail-open。worker 只在 scratch 生成 patch，可信主 Agent在 apply 前调用 U-001 CAS；当前 harness 外的终端/IDE/旧 worktree只靠 CAS 检测，不做虚假强制承诺。
- Read List：本文 U-001；scratch candidate 中 `.claude/skill-os/controlled-change.yaml`、`scripts/controlled-change.mjs`、`scripts/controlled-change-controller.mjs`、`scripts/test-controlled-change.mjs`；当前 `.claude/settings.json`、`.codex/hooks.json`、`.codex/codex-hook-adapter.mjs`、`scripts/test-project-scope-guard.mjs`。
- Test scenarios：Claude/Codex direct edit；Codex apply_patch；extra path；arbitrary Bash；git add/commit/push/update-ref；required marker missing/malformed/stale；controller 激活后 writer 试图清 marker 再写；hook error/timeout；inactive regression；外部进程先改目标后 CAS 阻断。
- Verification：`node scripts/test-controlled-change.mjs --case dual-harness-active-guard`、`node scripts/test-controlled-change.mjs --case required-context-bypass`、`node scripts/verify-codex-wiring.mjs`、`npm run check:hooks`、`npm run test:project-scope` 全部 PASS。
- Status：`PLANNED`

### Phase 2 — 六项能力正文

编排：Parallel Fan-out（U-003/U-004 文件所有权互斥）+ Supervisor  
phase_type：`task_execution`  
model_tier：`core-execution`

两位 writer 可调用的唯一 `skills_needed` 是 `/Users/luca/.codex/skills/.system/skill-creator/SKILL.md`；此外必须作为普通 Read List 完整读取 `/Users/luca/.codex/skills/.system/skill-creator/references/openai_yaml.md`、`.claude/skill-os/skill-authoring.md` 与 `.claude/skill-os/skill-invariants.md`。

#### U-003 — 安装三个独立方法体

- Goal：安装 `grilling`、`diagnosing-bugs`、`resolving-merge-conflicts` 的 Luca 原生方法体。
- Source：`USR-001,USR-002,USR-004`
- Dependencies：`U-002`
- Files：`.claude/skills/office/grilling/SKILL.md`、`.claude/skills/office/grilling/LICENSE`、`.claude/skills/office/grilling/agents/openai.yaml`；`.claude/skills/office/diagnosing-bugs/SKILL.md`、`.claude/skills/office/diagnosing-bugs/LICENSE`、`.claude/skills/office/diagnosing-bugs/PROVENANCE.md`、`.claude/skills/office/diagnosing-bugs/agents/openai.yaml`、`.claude/skills/office/diagnosing-bugs/references/root-cause-tracing.md`、`.claude/skills/office/diagnosing-bugs/references/defense-in-depth.md`、`.claude/skills/office/diagnosing-bugs/references/condition-based-waiting.md`、`.claude/skills/office/diagnosing-bugs/references/condition-based-waiting-example.ts`、`.claude/skills/office/diagnosing-bugs/scripts/find-polluter.sh`、`.claude/skills/office/diagnosing-bugs/scripts/hitl-loop.template.sh`、`.claude/skills/office/diagnosing-bugs/scripts/safe-diagnostic-runner.mjs`、`.claude/skills/office/diagnosing-bugs/scripts/safe-snapshot-copy.py`；`.claude/skills/office/resolving-merge-conflicts/SKILL.md`、`.claude/skills/office/resolving-merge-conflicts/LICENSE`、`.claude/skills/office/resolving-merge-conflicts/agents/openai.yaml`、`.claude/skills/office/resolving-merge-conflicts/scripts/conflict-transaction.mjs`。
- Approach：保留上游净新增方法，重写危险默认：grilling 一次一个问题；diagnosing 先建命中症状的 red loop、默认 diagnose-only；resolver 先恢复双方 intent，inspect/propose 默认只读，edit/stage/advance/abort 分门，绝不自动 commit/push。
- Read List：`framework-audit/2026-08-30-mattpocock-six-skills-integration/SOURCE-MANIFEST.tsv` 中 `source_skill=grilling|diagnosing-bugs|resolving-merge-conflicts` 的每个冻结 source path（commit `6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`）；`/Users/luca/.codex/skills/.system/skill-creator/SKILL.md`、`/Users/luca/.codex/skills/.system/skill-creator/references/openai_yaml.md`、`.claude/skill-os/skill-authoring.md`、`.claude/skill-os/skill-invariants.md`；`.claude/skills/office/brainstorm/SKILL.md`；`.claude/skills/office/careful/SKILL.md`；同一 SOURCE-MANIFEST 中 `legacy_root=/Users/luca/.agents/skills/systematic-debugging` 的每个 row；`/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md`。
- Test scenarios：direct/semantic/internal；expected TDD red 不误入 diagnosis；diagnose-only 无写/网；无真实 conflict 不触发 resolver；resolver 不自动 stage/continue；grilling 不批量提问。
- Verification：`python3 /Users/luca/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/office/grilling`、`python3 /Users/luca/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/office/diagnosing-bugs`、`python3 /Users/luca/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/office/resolving-merge-conflicts`、`node scripts/test-engineering-delivery-skills.mjs --case independent-methods` 均 PASS。
- Status：`PLANNED`

#### U-004 — 安装三个 facade 并绑定既有 owner

- Goal：安装 `to-spec`、`wayfinder`、`implement`，不制造第二套 spec/plan/execution state。
- Source：`USR-001,USR-002,USR-004`
- Dependencies：`U-002`
- Files：`.claude/skills/office/to-spec/SKILL.md`、`.claude/skills/office/to-spec/LICENSE`、`.claude/skills/office/to-spec/agents/openai.yaml`、`.claude/skills/office/wayfinder/SKILL.md`、`.claude/skills/office/wayfinder/LICENSE`、`.claude/skills/office/wayfinder/agents/openai.yaml`、`.claude/skills/office/implement/SKILL.md`、`.claude/skills/office/implement/LICENSE`、`.claude/skills/office/implement/agents/openai.yaml`、`.claude/skills/office/tech-spec/SKILL.md`、`.claude/skills/office/task-plan/SKILL.md`、`.claude/agents/plan-agent.md`、`.claude/agents/orchestrator.md`。
- Approach：to-spec 只进入 tech-spec synthesis；wayfinder 只进入 Plan Agent mode；implement 只把已批准 task-plan/spec 编译为 U-ID 并交 Orchestrator。standalone implement 不读 optional graph；selected preset 在 task-plan SHA 冻结后再编译并请求确认，禁止 placeholder authority。
- Read List：`framework-audit/2026-08-30-mattpocock-six-skills-integration/SOURCE-MANIFEST.tsv` 中 `source_skill=to-spec|wayfinder|implement` 的三个冻结 `SKILL.md` row（commit `6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`）；`/Users/luca/.codex/skills/.system/skill-creator/SKILL.md`、`/Users/luca/.codex/skills/.system/skill-creator/references/openai_yaml.md`、`.claude/skill-os/skill-authoring.md`、`.claude/skill-os/skill-invariants.md`；`.claude/skills/office/tech-spec/SKILL.md`、`.claude/skills/office/task-plan/SKILL.md`、`.claude/agents/plan-agent.md`、`.claude/agents/orchestrator.md`；本文 §3.2、§3.3。
- Test scenarios：conversation synthesis traceability；UI/design gate negative；wayfinder 三谓词与普通任务 negative；standalone implement graph-absent；selected preset compile-after-task-plan；旧 authority/placeholder 拒绝。
- Verification：`python3 /Users/luca/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/office/to-spec`、`python3 /Users/luca/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/office/wayfinder`、`python3 /Users/luca/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/office/implement`、`node scripts/test-engineering-delivery-skills.mjs --case facade-owner-candidate` 全部 PASS；该 case 必须同时覆盖 standalone 与 selected compile barrier。
- Status：`PLANNED`

### Phase 3 — 路由、Flow 与双端 loader

编排：Sequential + Supervisor  
phase_type：`task_execution`  
model_tier：`core-execution`

#### U-005 — 接通 direct/semantic/internal 与 optional preset

- Goal：让六项在 Claude/Codex、自然语言和流程内都可达，并保持 Skill-first/Graph-optional。
- Source：`USR-002,USR-003,USR-004`
- Dependencies：`U-003,U-004`
- Files：`.claude/commands/grilling.md`、`.claude/commands/diagnosing-bugs.md`、`.claude/commands/resolving-merge-conflicts.md`、`.claude/commands/to-spec.md`、`.claude/commands/wayfinder.md`、`.claude/commands/implement.md`；`.claude/skills/grilling`、`.claude/skills/diagnosing-bugs`、`.claude/skills/resolving-merge-conflicts`、`.claude/skills/to-spec`、`.claude/skills/wayfinder`、`.claude/skills/implement`；`.agents/skills/grilling`、`.agents/skills/diagnosing-bugs`、`.agents/skills/resolving-merge-conflicts`、`.agents/skills/to-spec`、`.agents/skills/wayfinder`、`.agents/skills/implement`；`.claude/hooks/route-guard.mjs`、`.claude/skill-os/skill-routing-map.yaml`、`.claude/skill-os/input-modes.yaml`、`.claude/skill-os/optional-workflow-graph.yaml`、`.claude/skill-os/routing-chain-check.md`、`.claude/skill-os/model-routing.yaml`、`.claude/skill-os/codex-viability.yaml`、`.claude/skill-os/external-skills/installed-pins.yaml`、`.claude/skill-os/evolution/adoption-log.jsonl`、`.claude/skill-os/evolution/self-model.generated.yaml`、`.claude/skills/office/references/office-wizard.md`、`scripts/check-skill-scene-coverage.py`、`CLAUDE.md`、`AGENTS.md`。
- Approach：routing map 是 semantic SSOT；route-guard 仅实现 loader 无法表达的 `huge AND multi-session AND fog` 和显式 preset 选择。Project Gate → Plan complexity → multi/single skill 顺序不变。graph 只存建议边/条件，不存运行状态；commands/aliases 都是 canonical tree 的薄指针。
- Read List：`.claude/skills/office/grilling/SKILL.md`、`.claude/skills/office/diagnosing-bugs/SKILL.md`、`.claude/skills/office/resolving-merge-conflicts/SKILL.md`、`.claude/skills/office/to-spec/SKILL.md`、`.claude/skills/office/wayfinder/SKILL.md`、`.claude/skills/office/implement/SKILL.md`；`.claude/hooks/route-guard.mjs`、`.claude/skill-os/skill-routing-map.yaml`、`.claude/skill-os/input-modes.yaml`、`.claude/skill-os/optional-workflow-graph.yaml`、`.claude/skill-os/routing-chain-check.md`、`.claude/skill-os/model-routing.yaml`、`.claude/skill-os/codex-viability.yaml`；`scripts/check-routing-map.mjs`、`scripts/check-registration-sync.mjs`、`scripts/check-codex-viability.mjs`、`scripts/build-self-model.mjs`、`scripts/check-skill-scene-coverage.py`；`.claude/commands/codebase-design.md`、`.claude/skills/codebase-design`、`.agents/skills/codebase-design`、`.claude/commands/code-review.md`、`.claude/skills/code-review`、`.agents/skills/code-review`。
- Test scenarios：六项 direct/semantic/internal；相邻负例；Project Gate 优先；复杂请求先 Plan；多候选 STOP；未选 preset 时 standalone；异常回原 U-ID；删除 graph 后 standalone 仍通过。
- Verification：`npm run test:routes`、`npm run check:routing-map`、`npm run check:registration`、`npm run check:self-model`、`node scripts/check-codex-viability.mjs`、`python3 scripts/check-skill-scene-coverage.py`、`node scripts/test-engineering-delivery-skills.mjs --case trigger-and-flow-contract`、`node scripts/test-engineering-delivery-skills.mjs --case dual-loader-parity` 全部 PASS。
- Status：`PLANNED`

### Phase 4 — 兼容迁移与总验收

编排：Sequential + Supervisor  
phase_type：`task_execution`  
model_tier：`core-execution`

#### U-006 — 可恢复迁移已知 personal collision

- Goal：确保项目 canonical 真正生效，同时保留 personal 旧内容的可恢复备份。
- Source：`USR-003`
- Dependencies：`U-005`
- Files：`.claude/skill-os/compat/resolving-merge-conflicts/SKILL.md`、`.claude/skill-os/compat/systematic-debugging/SKILL.md`、`scripts/skill-cutover-transaction.mjs`；若 U-001 已把它们列入 `external_paths`，外部只允许 `/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md`、`/Users/luca/.agents/skills/systematic-debugging/SKILL.md`、`/Users/luca/.claude/skills/.luca-backups/<approved-plan-sha>/resolving-merge-conflicts.SKILL.md`、`/Users/luca/.agents/skills/.luca-backups/<approved-plan-sha>/systematic-debugging.SKILL.md` 与 `/Users/luca/.luca/audit/matt-six-skill-personal-cutover-<approved-plan-sha>.json`；其中 `<approved-plan-sha>` 唯一等于 Gate A 批准的本文 SHA-256。
- Approach：先 fresh-load 证明项目 precedence；若项目 canonical 已稳定胜出则本 U-block 对 personal 路径为 no-op。只有确认 personal shadow 会覆盖时才切换：每个目标先 hash+备份，再用相邻 temp+atomic rename 写薄兼容 adapter；两个文件允许短暂混合态且必须兼容。任一后续验收失败，按 receipt 恢复原 tuple；不改 personal 目录的其他资产。
- Read List：`framework-audit/2026-08-30-mattpocock-six-skills-integration/SOURCE-MANIFEST.tsv` 与 `IMPLEMENTATION-RECEIPT.md` 的 personal preimage rows；`/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md`、`/Users/luca/.agents/skills/systematic-debugging/SKILL.md`、`/Users/luca/.claude/skills/systematic-debugging` 的 lstat/readlink；`.claude/skills/office/resolving-merge-conflicts/SKILL.md`、`.claude/skills/office/diagnosing-bugs/SKILL.md`、`.claude/skill-os/compat/resolving-merge-conflicts/SKILL.md`、`.claude/skill-os/compat/systematic-debugging/SKILL.md`。
- Test scenarios：无 collision 时 no-op；resolver shadow；debug legacy shadow；首/次文件间 crash；backup 已存在；rollback 幂等；project/personal fresh load。
- Verification：`node scripts/test-engineering-delivery-skills.mjs --case personal-collision-cutover` 与 `node scripts/validate-skill-integration-receipt.mjs --case personal-cutover` 全部 PASS，并输出 personal pre/post/backup tuple、fresh loader 与 crash/rollback receipt。
- Status：`PLANNED`

#### U-007 — 冻结 candidate 并做同 SHA 终审

- Goal：用同一 candidate manifest 完成 flow、safety、quality 与双 harness 活体验收。
- Source：`USR-001..USR-007`
- Dependencies：`U-006`
- Files：`framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-MANIFEST.tsv`、`framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-RECEIPT.md`、`framework-audit/2026-08-30-mattpocock-six-skills-integration/REVIEW-LEDGER.md`；U-002 已创建的三个 shared validators 在本 U-block 只执行，不首次创建或扩大 case inventory。
- Approach：`CANDIDATE-MANIFEST.tsv` 的 denominator 精确定义为 U-001～U-006 `Files` 中所有**仓库内 runtime 路径**（含 tests、hooks、aliases、治理注册面与 generated self-model），逐 path/mode/blob 记录；它排除整个计划证据根，因此不包含自身，也不包含任何 receipt/ledger/计划。固定 evidence policy `final-master-v1` 恰含七个提交路径：`FINAL-MASTER-PLAN.md`、`SOURCE-MANIFEST.tsv`、`DECISION-MATRIX.md`、`IMPLEMENTATION-ALLOWLIST.txt`、`CANDIDATE-MANIFEST.tsv`、`IMPLEMENTATION-RECEIPT.md`、`REVIEW-LEDGER.md`；此前 `FINAL-EXECUTION-PLAN.md`、其他草稿和外部 durable receipt 明确排除。先冻结 runtime bytes 并生成 manifest，再完成三路评审并写 ledger/VERIFIED receipt，最后冻结七个 evidence blob；Gate B 展示的 publish set 唯一等于 `runtime manifest rows ∪ final-master-v1`。三位 reviewer 必须引用同一 candidate manifest SHA；任何 FAIL 只回对应 U-block，一次修复后重审。
- Read List：`framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-RECEIPT.md` 的 U-001～U-006 分段；本文 §4、§5；由 `scripts/candidate-manifest.mjs` 按本 U-block denominator 枚举出的每个 runtime path；`framework-audit/2026-08-30-mattpocock-six-skills-integration/FINAL-MASTER-PLAN.md`、`SOURCE-MANIFEST.tsv`、`DECISION-MATRIX.md`、`IMPLEMENTATION-ALLOWLIST.txt`、`CANDIDATE-MANIFEST.tsv`、`IMPLEMENTATION-RECEIPT.md`、`REVIEW-LEDGER.md`；`scripts/verify.sh` 与 `package.json` 的 `verify` script。
- Test scenarios：controlled-change active/inactive；六项三触发；optional graph；facade owner；personal rollback；mutation tests（屏蔽 semantic/internal、越权 path、stale preimage、隐式 Git、graph dependency、自动 resolver/push）。
- Verification：`npm run verify`、`node scripts/test-controlled-change.mjs --all`、`node scripts/test-engineering-delivery-skills.mjs --all`、`node scripts/candidate-manifest.mjs --verify framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-MANIFEST.tsv`、`node scripts/validate-skill-integration-receipt.mjs --final` 全部 PASS；flow/safety/quality 同一 candidate manifest SHA 明示 PASS。
- Status：`PLANNED`

### Phase 5 — 精确 commit/push

编排：Sequential + Human Gate + Supervisor  
phase_type：`task_execution`  
model_tier：`core-execution`；发布前独立复审使用 model-routing 白名单 `P0_出门前裁决/不可逆操作前复审`

#### U-008 — 只提交 candidate manifest 并发布到 upstream/main

- Goal：不夹带其他 session WIP、不移动当前检出的本地 `main`，以 immutable commit OID 发布已验 candidate，且绝不产生 non-fast-forward overwrite。
- Source：`USR-005`
- Dependencies：`U-007`, `external: 用户确认最终 candidate manifest SHA、commit message、remote URL/refspec`
- Files：`<git-common-dir-realpath>/luca-controlled-change/matt-six-<first16-approved-plan-sha>/publish.index`、同目录 `push.git/` scratch bare context、commit object、任务私有 `refs/luca-controlled-change/matt-six-<first16-approved-plan-sha>/candidate`、远端 `refs/heads/main` effect，以及 U-001 已定义的同目录 `required-witness.json`、`active-context.json`、`receipt.json` 更新；不新增运行时代码，不读写共享 index，不更新本地 `HEAD` 或 `refs/heads/main`。
- Approach：发布门前重验 HEAD、runtime candidate manifest、七个 `final-master-v1` evidence blob、personal postimage、controlled-change receipt 与 remote old OID；Gate B 后由可信主 Agent写入一次性 `approved_effects=[build-tree,commit-object,create-private-ref,push-fixed-oid]`，绑定 publish set、literal URL `https://github.com/wangmoumou1216-ai/luca_gstack.git`、目标 `refs/heads/main`、expected-old OID 与批准 message。使用任务专属 `publish.index` 作为 `GIT_INDEX_FILE`，先 `read-tree <approved-baseline>`，再只向该 isolated index 加入 `runtime manifest rows ∪ final-master-v1`；shared index 即使被其他 session 同时 stage 也不被读取、改写或清空。校验 isolated tree 的 path/mode/blob 后用 `git commit-tree` 生成唯一 commit，要求其单一 parent 精确等于 approved baseline；禁止普通 `git add`、`git commit` 和可变 branch source。只用 `git update-ref refs/luca-controlled-change/matt-six-<first16-approved-plan-sha>/candidate <approved-commit-oid> <zero-oid>` 创建任务私有 ref；若该 ref 已存在，只能在 receipt 证明同 generation、同 OID 时只读复用，否则停止。整个 U-008 都断言当前 symbolic HEAD、`refs/heads/main` 与共享 index pre/post byte tuple 不变。push/reconcile 在新建 scratch bare Git context 中运行：`env -i`（不重定义 `HOME`）、`GIT_CONFIG_NOSYSTEM=1`、`GIT_CONFIG_GLOBAL=/dev/null`、`GIT_CONFIG_COUNT=0`；scratch local config 的精确 allowlist 仅为 `core.repositoryformatversion`、`core.bare`、`credential.helper`、`credential.useHttpPath`、`http.followRedirects=false`，credential 两项的实际值须在 Gate B 展示，无法提供安全 helper 就 `NEEDS_CONTEXT`。任何 `include*`、`url.*.insteadOf`、`url.*.pushInsteadOf`、remote alias 或额外 config key 都拒绝；对象只通过只读 alternate 暴露。source 固定为 `<approved-commit-oid>:refs/heads/main`；`--force-with-lease=refs/heads/main:<approved-old-oid>` 仅提供批准 old-OID 的服务端 CAS，refspec 不带 `+`，且在调用前机械验证 commit 是 old 的单亲 fast-forward，因此不具备 non-fast-forward overwrite 路径；任一不符即拒绝。若响应丢失，只用同一 sanitized scratch context 对同一批准 URL 做 `ls-remote`：remote=commit 才 DONE，remote=old/other/不可读均 `NEEDS_CONTEXT`，不自动重试、不回滚 personal。
- Read List：`framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-MANIFEST.tsv`、`framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-RECEIPT.md`、`framework-audit/2026-08-30-mattpocock-six-skills-integration/REVIEW-LEDGER.md`、`framework-audit/2026-08-30-mattpocock-six-skills-integration/FINAL-MASTER-PLAN.md`；`<git-common-dir-realpath>/luca-controlled-change/matt-six-<first16-approved-plan-sha>/required-witness.json`、`active-context.json`、`receipt.json`；`/usr/bin/git symbolic-ref -q HEAD`、`/usr/bin/git rev-parse HEAD refs/heads/main`、`/usr/bin/git status --porcelain=v2 --untracked-files=all`、`/usr/bin/git rev-parse --git-path index` 后对该 path 做 type/mode/SHA；`/usr/bin/git config --show-origin --get-regexp '^(remote\.|url\.|include|credential\.|http\.followRedirects)'` 的只读输出；Gate B 用户批准原文。
- Test scenarios：pre-existing/concurrent shared stage；manifest 多/少 path；tree verify→commit 间 shared-index race；private-ref preexist/race；断言尝试移动 checked-out `main` 必须失败；remote expected-old/race/non-fast-forward；恶意 system/global/local `insteadOf`/`pushInsteadOf`；push success；response lost + remote new/old/other/unreadable。
- Verification：`node scripts/candidate-manifest.mjs --verify-publish-receipt framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-MANIFEST.tsv --plan framework-audit/2026-08-30-mattpocock-six-skills-integration/FINAL-MASTER-PLAN.md` PASS；receipt 证明 isolated commit tree 等于 `runtime manifest rows ∪ final-master-v1`、parent 等批准 baseline、共享 index/HEAD/local-main pre/post tuple 不变、private ref CAS 成功、sanitized literal-URL `ls-remote refs/heads/main` 等于 immutable commit OID。
- Status：`PLANNED`

### 4.1 Wave

```text
Gate A-plan 后 Wave 1a（scratch only）: U-001 → U-002 candidate
Wave 1b: EA-1 → Gate A-bootstrap（批准 exact bootstrap + dormant U-003～U-007 repo/personal allowlists）→ exact bootstrap apply → fresh dual-harness verify → 激活后续 authority
Wave 2（并行）: U-003, U-004
Wave 3: U-005
Wave 4: U-006
Wave 5: U-007
Wave 6: U-008（Gate B 后）
```

## 5. BLOCKING 断言

```bash
# [BLOCKING] M6-A01 — controlled-change schema/CAS/controller/receipt
node scripts/test-controlled-change.mjs --all && echo "PASS M6-A01" || exit 1

# [BLOCKING] M6-A02 — active 双 harness guard + inactive regression
npm run check:hooks --silent && node scripts/verify-codex-wiring.mjs && echo "PASS M6-A02" || exit 1

# [BLOCKING] M6-A03 — 六个 canonical skill 均通过 authoring validator
for s in grilling diagnosing-bugs resolving-merge-conflicts to-spec wayfinder implement; do
  python3 /Users/luca/.codex/skills/.system/skill-creator/scripts/quick_validate.py ".claude/skills/office/$s" || exit 1
done

# [BLOCKING] M6-A04 — Claude/Codex aliases 指向同一 canonical tree
node scripts/test-engineering-delivery-skills.mjs --case dual-loader-parity || exit 1

# [BLOCKING] M6-A05 — direct/semantic/internal 与 route 优先级
node scripts/test-route-guard.mjs && node scripts/test-engineering-delivery-skills.mjs --case trigger-contract || exit 1

# [BLOCKING] M6-A06 — optional flow、facade owner、standalone independence
node scripts/test-engineering-delivery-skills.mjs --case flow-and-owner-contract || exit 1

# [BLOCKING] M6-A07 — candidate manifest/receipt 与 full verify
node scripts/candidate-manifest.mjs --verify framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-MANIFEST.tsv && node scripts/validate-skill-integration-receipt.mjs --final && npm run verify || exit 1

# [BLOCKING] M6-A08 — isolated publish tree、immutable OID 与 sanitized remote identity
node scripts/candidate-manifest.mjs --verify-publish-receipt framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-MANIFEST.tsv --plan framework-audit/2026-08-30-mattpocock-six-skills-integration/FINAL-MASTER-PLAN.md && echo "PASS M6-A08" || exit 1
```

```yaml
criteria:
  - id: C1
    failure_mode: controlled mode 只写在文档里，Claude/Codex 仍可越权改 path 或隐式 Git。
    pass_if: U-001/U-002 只通过获批 exact bootstrap patch 安装并经 fresh 双端验收；U-003 起 controller 在派发前先持久化独立 non-terminal witness 再建立 active context；required witness 下 marker 缺失/畸形/stale 也 fail-closed；active manifest 下双 harness 在 byte/index/ref 变化前拒绝未授权 tool action；外部并发漂移由 CAS 检出并停止。
    evidence_required: bootstrap patch/preimage/postimage、fresh loader、witness/active crash/bypass、required-marker mutants、active/inactive、extra-path、Bash、Git-effect、hook-error、stale-preimage receipts。
  - id: C2
    failure_mode: 六项只能点名调用，或 semantic/internal 误路由、扩权。
    pass_if: 六项逐项 direct/semantic/internal 通过，Project Gate/Plan complexity/多候选优先级不退化。
    evidence_required: 6×触发矩阵、相邻负例、caller/condition/authority trace。
  - id: C3
    failure_mode: facade 建立第二套 spec/plan/execution state。
    pass_if: to-spec、wayfinder、implement 分别由 tech-spec、Plan Agent、Orchestrator 拥有真值；无重复产物路径或状态。
    evidence_required: owner map、standalone/selected trace、duplicate-state negative。
  - id: C4
    failure_mode: optional graph 变成 standalone 的强制依赖或主链死路。
    pass_if: 删除 graph 后六项 standalone 仍可达；selected preset 从 task-plan 后编译到 approved U-ID，异常回原 U-ID。
    evidence_required: graph-absent、selected full-chain、exception identity receipts。
  - id: C5
    failure_mode: diagnosing/resolver/grilling 保留上游危险默认。
    pass_if: diagnosis 默认只读且 expected red 不误触；resolver 不自动 stage/continue/commit；grilling 一次一个用户决策。
    evidence_required: negative/mutation fixtures 与 Git/external tuple。
  - id: C6
    failure_mode: personal migration 覆盖旧资产或失败后不可恢复。
    pass_if: 仅两个已确认 SKILL.md 被原子切换，backup/hash/receipt 完整，任何失败可恢复原 tuple。
    evidence_required: pre/post/backup manifest、crash matrix、fresh loader、rollback receipt。
  - id: C7
    failure_mode: commit/push 夹带他人 WIP、推错目标或在不确定状态自动重试/回滚。
    pass_if: 独立 index/tree 精确等于 runtime manifest 加固定 evidence policy；commit source 为 immutable OID；只创建任务私有 ref且本地 HEAD/main/index 不变；remote 以 approved old-OID 做 lease CAS且机械限制为 fast-forward；sanitized scratch Git context 禁止 URL rewrite；未知 push 状态停人类裁决。
    evidence_required: concurrent staged/private-ref race、HEAD/main/index unchanged tuple、tree/parent proof、恶意 insteadOf fixtures、literal URL/ref/old/new OID、sanitized ls-remote 与 publish receipt。
```

## 6. 失败策略

- 任一 BLOCKING FAIL：停在当前 U-block，不进入下一 Wave。
- 同一根因两次失败：只对该 U-block做 delta replan；不得把未受影响 U-ID 推倒重来。
- bootstrap patch 后 controlled-change guard 无法在任一 fresh harness fail-closed：按 Gate A-bootstrap 已批准的 reverse manifest 恢复全部 bootstrap preimage并记录 receipt，基础层 `BLOCKED`，U-003 与六项安装不开始。
- 外部/其他 session 改动造成 target preimage 漂移：`NEEDS_CONTEXT`；不 overwrite、stash、reset 或夺取 owner。
- personal migration 后 U-007 FAIL：先按 receipt 恢复两个 personal SKILL.md，再修对应项目 U-block。
- staged WIP 不影响 isolated publish index但必须在 Gate B 披露；remote drift、non-fast-forward 或超出批准 expected-old lease 的需求：U-008 `NEEDS_CONTEXT`，不自动处理。
- push 结果不确定：只读 reconcile；不能证明 remote=新 commit 就保持 `NEEDS_CONTEXT`。

### 6.1 Completion Status 与升级格式

U-block 与 Phase 只允许六个状态：

| Status | 含义 | 后续动作 |
|---|---|---|
| `PLANNED` | 已计划、未执行 | 等待对应 Wave |
| `IN_PROGRESS` | WA 正在执行 | 等待同 U-block completion report |
| `DONE` | BLOCKING/WARNING 验证均满足 | 进入下一 Wave |
| `DONE_WITH_CONCERNS` | 功能完成，仅 WARNING 或明确 defer | 记录 notes 后继续 |
| `BLOCKED` | 外部条件无法解冻或同根因三次失败 | 用下列四段格式停下 |
| `NEEDS_CONTEXT` | 缺少用户/外部事实，机器不可代选 | 用下列四段格式停下 |

```text
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: <具体到文件、接口、依赖或远端状态的 1–2 句原因>
ATTEMPTED: <已执行的只读检查、验证或恢复动作>
RECOMMENDATION: <下一步建议；若需用户决定，列出精确待确认内容>
```

## 7. 用户确认门

1. `Gate A-plan`：三路终审和 quality gate 对本文同一 SHA 全 PASS 后，用户批准该 SHA；该批准只允许只读复验与在 `/private/tmp/luca-controlled-bootstrap-<first16-approved-plan-sha>/` 生成 U-001/U-002 candidate patch，不授权任何仓库、personal 或 Git mutation。
2. `Gate A-bootstrap`：展示 plan SHA、`BOOTSTRAP.patch` SHA、全部 exact path/type/mode/preimage/postimage、reverse manifest、U-003～U-007 确定性 repo allowlist、U-006 条件性 personal external paths 与 EA-1 verdict；用户明确批准该完整 payload 后，可信主 Agent才可应用 bootstrap 一次，后续 authority 先保持 dormant。应用后必须 fresh Claude/Codex 验收；全 PASS 才激活后续 authority并由 controller 调度 U-003，失败则精确恢复 bootstrap preimage、后续 authority 永不生效并停下。
3. `Gate B`：U-007 冻结最终 candidate manifest 后，展示 exact publish set、personal postimage、commit message、literal remote/refspec、expected old OID、immutable candidate commit OID、任务私有 ref、credential-only config；用户确认后才执行 U-008。本地 `HEAD/main` 与共享 index 明示保持不变。

任何改变 threat boundary、六项身份、personal target 或发布目标的要求都先改计划并重新确认，不能边执行边扩大。

## 8. 出门自检

- [x] 已回答该不该做、更小替代、默认偏差与 kill assumptions。
- [x] 8 个 U-block 均有用户 Source、9 个必填字段与无环依赖。
- [x] 共享基础层与六项专用逻辑分离；删除六项后 controlled-change 仍有独立价值。
- [x] Skill-first / Graph-optional、双 harness、自然语言与内部 dispatch 均有机械验收。
- [x] 首次 bootstrap、personal 写入和 commit/push 均有明确批准边界与 BLOCKING 断言。
- [x] 跳过外部研究有明确理由；本任务非设计产出，OD-first N/A。
- [x] 未承诺 OS 级绝对隔离、恶意主 Agent 防护或通用远端两阶段提交。

<!-- FILE_END: FINAL-MASTER-PLAN.md -->
