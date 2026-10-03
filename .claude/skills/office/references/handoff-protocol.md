# Handoff Protocol v3.0

> **目的：** 每个 skill 完成时写一份决策摘要，供下游 skill 启动时加载。
> 用文件系统传递状态，不依赖 context window 的连续性。

---

## 写入时机

Workflow 模式（workflow-state 有本 skill 节点）的 skill 标记 `status: DONE` 之前，
必须先写 handoff summary 文件。

## 豁免规则

standalone 模式 + 轻量 skill（frontmatter `context-cost: lightweight`
或 `runtime-estimate ≤ 5000`）+ 产出为终端交付（无下游 skill 消费）→ 免写 handoff，
DONE 合法。compare / status 即此规则的既有实例。standalone 重型 skill 仍须写
（跨 session 恢复依赖 handoff）。

## 文件路径

以下是已验证项目根内的路径，必须相对当前 pin 绑定的 `<WORK_ROOT>` 解析；不得经共享
`docs/` 或 workflow-state 显示别名推断项目。`NO_PIN` 框架/meta 交接用获准的
`framework-audit/` 或 OS 临时路径，不写项目 handoff；显式会话交接由 `.claude/skills/office/handoff/SKILL.md`
规定的 OS 临时产物承接，不套用本协议的项目路径。

```
docs/handoff/YYYY-MM-DD-<topic>-<skill-name>-handoff.md
```

示例：`docs/handoff/2026-05-08-crm-lead-pool-brainstorm-handoff.md`

## 格式规范（硬约束 ≤2000 tokens ≈ 8000 chars）

```markdown
# Handoff: <skill-name> → downstream
topic: <topic-slug>
scene: <A/B/C/D>
completed_at: <ISO timestamp>
gate_result: PASS | FAIL | CONDITIONAL_PASS
criteria:
  - "[C1] <二元判定句> → PASS（证据: <引用/行号/输出>）"
  - "[C2] <二元判定句> → FAIL（证据: ...）"
  - "[C3] <二元判定句> → UNKNOWN（原因: ...）"

## 决策（做了什么）
- [D-001] <一句话决策> | 理由：<一句话> | 否决：<被否决的方向> | 状态：PROPOSED
- [D-002] ...
（最多 8 条，每条 ≤100 字）

**决策状态标记：**
- `PROPOSED`：skill 产出的决策建议（默认值）
- `[ADOPTED]`：用户明确采纳的决策（用户说"就这个"/"方案A"/"同意"时标记）
- `[REJECTED]`：用户明确否决的决策（用户说"不要这个"/"换一个"时标记）

**写入时机：** 新建议写 PROPOSED；已有真实用户采纳/否决及最新更正直接继承其状态和来源，
不退回建议或重复索取确认。后续真实决定由 Orchestrator 或下一个 skill 更新为 ADOPTED/REJECTED；
历史采纳只作参考，不授予当前执行权，被更正的旧决定不再当作授权。

**脱敏（2026-07-12 增，源 mattpocock handoff，GATE-2 例外批准）：** 交接/checkpoint 文档不得含
API key/密码/PII——发现即替换为 `<REDACTED>` 占位符（本目录 git-tracked，泄露面真实）。

**「下游建议」可选节（描述性，不担路由职能）：** standalone 交接可在文档尾附 `## suggested skills`
——描述性列出下游可能用到的 skill 与一句理由；**路由仍由 route-guard/词表承担**，本节只随文档携带上下文。

**为什么标记很重要？** 未来遇到类似 topic 时，Pre-Task Context Retrieval 会检索历史 handoff 中 [ADOPTED] 的决策作为参考起点，避免重复探索被否决的方向。这是 Ruflo SONA 学习系统的轻量等价物。

## 约束（下游必须遵守）
- <约束1>
- <约束2>
（最多 5 条）

## 风险（下游需要注意）
- <风险1>
（最多 3 条）

## 待澄清（Deferred，下游须追踪）
- <开放问题1>（上游合法放行但延后未答；下游在解决或显式继续延后前，不得据此做隐式假设）
（可空；非空则下游必须追踪、不得静默丢弃。对应 PRD 的 `Outstanding Questions → Deferred to Planning`。）

## 产出路径
- 主产出：<相对路径>
- 附属产出：<相对路径>（如有）

## AI Native 判断（如适用）
- 范式：<A/B/C/D/无>
- 影响的状态：<列出受影响的 AI 专有状态>
```

## 质量评估块（gate_result + criteria，2026-07-09 E1）

在既有决策、约束、风险、待澄清和产出节保留原目标/完成定义与当前 focus、最新有效授权与
更正的来源/范围/owner、未决真人门与效果批准、已完成效果、原始失败/取消、剩余在途的实际
句柄与已知/未知状态、未完依赖及首个续点；不得因摘要限额把未完成责任裁掉。
文件引用与实际读/验证状态分开，证据绑定其真实源和版本，不把路径存在或上游自报当验收。

`gate_result` 不再是孤立单值——**新写的 handoff 必须带 `criteria:` 逐条判定块**（存量不回溯）：

- **3-7 条**，每条是可 true/false 判定的一句话，绑一个真实 failure mode；
- 每条**附证据**（引用/行号/命令输出），judge 不确定时判 `UNKNOWN`（合法，不许硬判）；
- `gate_result` 总判可附通过率（如 `PASS (5/6)`）；
- criteria 从哪来、grader 怎么选（code / llm-judge / human）：见
  `.claude/skill-os/eval-methodology.md`（方法论参考；触发保证在本协议 + check-quality-gates）。

这是评估体系的**主绑定点**：handoff 是重型 skill 完成的唯一强制产物（workflow 必写 +
standalone 重型必写，见「写入时机/豁免规则」），`scripts/check-quality-gates.mjs`
（verify.sh S14 / CI）对新 handoff 校验 criteria 存在性（WARN 起步）。

**写完即验（任何 DONE / workflow-state 更新之前）：**

```bash
node scripts/check-quality-gates.mjs --handoff "<已核验项目内 handoff 的绝对路径>"
```

命令失败时不得标记 DONE；先补齐 `gate_result`、`criteria`、决策/约束/风险标题与产出路径。

## 为什么 ≤2000 tokens？

**量化依据：**
- 下游 skill 启动加载量 = 自身 SKILL.md (~10K) + 上游 handoff (~2K) + 共享规范摘要 (~3K) = ~15K tokens
- 对比改造前：上游 SKILL.md (~10K) + 上游完整产出 (~40K+) = ~50K+ tokens
- **降幅：70%**，为 runtime (search/subagent/dialog) 留出充足空间

## 下游 skill 的读取协议

当交接选择了 motion-polish/OD composite 最终原型时，在 intake/完成前完整读取
`.claude/skill-os/runtime/prototype-delivery.md`，传递并实际 resolve 精确
`final_artifact_ref{path,sha256}` 和返回的 final/spec/source/raw provenance；当前 caller 读界限
必须真实获准，handoff 不授读权。standalone 写普通 motion-polish handoff；内部子单元在既有
outputs 返回 certificate，由同一 OD caller 最终交接一次，不要求未来 raw OD DONE handoff。
承诺原型引用无效时不按时间或旧 raw 路径回退；下列摘要读取纪律不免除该精确证据重验。

skill 启动时，Orchestrator（或 skill 自身在 standalone 模式下）按以下顺序读取：

1. **自己的 SKILL.md** → 完整读取当前执行合同，先确认本次输入、owner 与权限边界
2. **本次已选路径及输入** → workflow 只读已验证 `<WORK_ROOT>/.luca/workflow-state.yaml` 中本次选定的全部必需上游；standalone 用明确输入，不补 workflow state 或伪造上游 DONE
3. **精确上游 handoff 与产出引用** → 对全部必需依赖获权实读、核路径与版本/摘要、真实 gate/证据及适用的 eval 回执，保留最新授权与更正、原失败和 required 缺片；不得按时间、“最近 DONE”、glob 存在或旧 raw 路径回退。缺失、漂移、失败/未知/在途阻断对应依赖，不成功合并缺片；独立任务只在原权限、无冲突及既有 implement/model 关键门允许时继续
4. 如需要 → 共享 references 中的特定文件（按 context-cost.shared-refs 声明加载）

不以交接为由批量加载上游完整 SKILL.md 或全部产出。当前 owner 合同明确要求的产出或片段，
仍在真实读权限内按需读取并验证；摘要不能替代必要的源核验，也不扩大读权。
恢复时按 `.claude/skill-os/runtime/long-session.md` 核对当前事实，从首个未完成点继续，不重复已完成效果。
保留原实际句柄；timeout、idle、ACK不证明完成或取消，也不授权再次派发；失去可观察性明确报告。

## 写入脚本

在 skill 的产出写入完成后，在 SKILL.md 的 completion 步骤中添加：

```bash
# 写入 handoff summary
# _PROJECT_ROOT 必须来自当前已验证 pin；NO_PIN 不运行此项目写入示例。
: "${_PROJECT_ROOT:?需要已验证的项目根}"
DATE=$(date +%Y-%m-%d)
TOPIC=$(rg "^topic:" "${_PROJECT_ROOT}/.luca/workflow-state.yaml" | awk '{print $2}' | tr -d '"')
SKILL_NAME="<当前skill名>"
HANDOFF_DIR="${_PROJECT_ROOT}/docs/handoff"
mkdir -p "$HANDOFF_DIR"
cat > "${HANDOFF_DIR}/${DATE}-${TOPIC}-${SKILL_NAME}-handoff.md" << 'HANDOFF_EOF'
# Handoff: <skill-name> → downstream
...（按格式填写）
HANDOFF_EOF
node scripts/check-quality-gates.mjs --handoff "${HANDOFF_DIR}/${DATE}-${TOPIC}-${SKILL_NAME}-handoff.md"
```

## 在 SKILL.md 共享规范中的嵌入位置

在 `.claude/skills/office/SKILL.md` 的 `### Completion Status Protocol` 章节末尾添加 handoff 写入要求
（该文件已无「共通 completion 步骤」节，Completion 规范即此节；Handoff 要求本体在其后的
`### Handoff Summary Protocol` 节）。

---

## Checkpoint 格式（与 handoff 并存的第二种交接产物，2026-07-04 补定义）

`docs/handoff/` 下同时存放两类文件——`*-handoff.md`（本协议管辖，须带 `gate_result`）与
`*-checkpoint.md`（跨-session 恢复用，**不受** ≤2000 tokens 约束、**不进** check-quality-gates
的 `gate_result` 校验——该 checker 只扫 `*-handoff.md` 后缀）。checkpoint 分两种：

1. **自动 checkpoint**（`session-sync.mjs` 在 Stop 时写 `<date>-auto-checkpoint.md`）：
   四段固定结构——标题（Auto Checkpoint + 时间）/ `**Topic:**` / `## 节点状态`（workflow-state
   各节点 status 列表）/ `## 恢复指令`（读 state → verify.sh → 继续 IN_PROGRESS 节点 → 读
   PROGRESS.md）。仅当存在 IN_PROGRESS 节点且有激活项目时写入（HOOK-005）。
2. **手动 checkpoint**（`<date>-<topic>-checkpoint.md`）：内容、触发和恢复真值源是
   `.claude/skill-os/runtime/long-session.md`，在既有记录中保留目标、真实授权、完成效果、
   原始失败、未完依赖和恢复读列表；此处不复制另一份固定格式。

上述项目路径仍须已验证 pin；`NO_PIN` 不穿 `docs/` 别名。自动状态快照或 DONE 条目不证明
真实完成或验收，恢复前仍按 long-session 核当前来源、授权与证据，保留未决项。

命名约定：checkpoint 文件名必须以 `-checkpoint.md` 结尾——误用 `-handoff.md` 后缀会被
check-quality-gates 按 handoff 校验 `gate_result` 而假红。

## 变更日志

- v3.2 (2026-07-09): gate_result 扩展为必带 criteria 逐条判定块（评估主绑定点，final-plan E1；
  方法论见 skill-os/eval-methodology.md；存量 handoff 不回溯）
- v3.1 (2026-07-04): 补 Checkpoint 格式定义（auto/manual 两种），明确与 handoff 的校验边界
- v3.0 (2026-05-08): 首次创建，作为 Context 存活工程的核心协议

<!-- FILE_END: handoff-protocol.md -->
