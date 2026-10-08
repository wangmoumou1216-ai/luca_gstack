# Handoff Protocol v3.0

> **目的：** 每个 skill 完成时写一份决策摘要，供下游 skill 启动时加载。
> 用文件系统传递状态，不依赖 context window 的连续性。

---

## 写入时机

Workflow 模式（workflow-state 有本 skill 节点）的 skill 标记 `status: DONE` 之前，
必须先写 handoff summary 文件。

## 受管节点提交

Orchestrator 管理的 workflow 节点，唯一完成提交者为 Orchestrator（completion_owner=Orchestrator）。执行前明确真实 mode、精确 node、原输出字段与本次证据槽；skill/WA 完成原产物、自检、适用证书和 handoff 校验后，只回交完成记录与提交请求，替代内部 writer/YAML/host 完成动作。报告 DONE 表示生产工作完成，不是节点已验收；独立门前节点保持 IN_PROGRESS。

回交在既有 handoff 证据槽/outputs 中保存精确当前 artifact path/hash、原节点输出字段、适用独立票/recorder 引用及尚待当前 Human Gate；不另建状态机。作者自报不作为独立票。Orchestrator 核当前身份、真实独立 QG 判决及冻结 required 全分母，完成适用 recorder 与当前节点必需 Human Gate 后，才执行原完成 seam 一次；未来节点 Human Gate 不阻断当前完成。CONDITIONAL_PASS 仅在原合同允许且 required 全通过时有效，原 exact PASS 门不降级。

提交前核既有 writer 的合并后有效状态（含默认 status、extra 覆盖），保护 node/status/提交 owner，保留 baseline_score、blueprint、certificate 等原字段；回交 payload 不能自行覆盖这些控制字段。普通节点使用原 writer；prototype-notes 必须由同一可信 host binding 执行原 completeOnce，不用普通 writer 绕过 exact accepted_ref。standalone 保留原完成合同及豁免，不新增 O/QG/state 依赖；无节点不制造节点。

记录失败/冲突或 required FAIL/UNKNOWN 保持待验/既有失败语义，只重试缺失门，不重跑已完成产物及外部效果。恢复旧 DONE 缺本节点有效票/当前对象身份时，先停止精确节点的依赖消费，再把该节点转 IN_PROGRESS 并补验；转换前后中断都不能凭旧 DONE 放行，不批改历史节点。

## 豁免规则

standalone 模式 + 轻量 skill（frontmatter `context-cost: lightweight`
或 `runtime-estimate ≤ 5000`）+ 产出为终端交付（无下游 skill 消费）→ 免写 handoff，
DONE 合法。compare / status 即此规则的既有实例。standalone 重型 skill 仍须写
（跨 session 恢复依赖 handoff）。

## 文件路径

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

**写入时机：** 新建议写 PROPOSED；本次已有真实用户采纳/否决的决定，继承 ADOPTED/REJECTED 及来源，不重置或重复确认。
最新有效更正优先；历史采纳仅作参考，不授予本次执行权。尚未决定或超出当前权限的事项仍须真实用户决定。

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
node scripts/check-quality-gates.mjs --handoff "docs/handoff/<filename>-handoff.md"
```

命令失败时不得标记 DONE；先补齐 `gate_result`、`criteria`、决策/约束/风险标题与产出路径。

## 为什么 ≤2000 tokens？

**量化依据：**
- 下游 skill 启动加载量 = 自身 SKILL.md (~10K) + 上游 handoff (~2K) + 共享规范摘要 (~3K) = ~15K tokens
- 对比改造前：上游 SKILL.md (~10K) + 上游完整产出 (~40K+) = ~50K+ tokens
- **降幅：70%**，为 runtime (search/subagent/dialog) 留出充足空间

## 下游 skill 的读取协议

当交接选择了 motion-polish/prototype-notes/OD composite 最终原型时，在 intake/完成前完整读取
`.claude/skill-os/runtime/prototype-delivery.md`，传递并实际 resolve 精确
`final_artifact_ref{path,sha256}` 和返回的 final/spec/source/raw provenance；当前 caller 读界限
必须真实获准，handoff 不授读权。standalone 按当前 processor 写普通 motion-polish 或 prototype-notes handoff；内部子单元在既有
outputs 返回 certificate，由同一 OD caller 最终交接一次，不要求未来 raw OD DONE handoff。
承诺原型引用无效时不按时间或旧 raw 路径回退；下列摘要读取纪律不免除该精确证据重验。

notes-enabled OD 的唯一固定 caller 位于 open-design Phase 4–6；原 owner 在真实精确版本确认、
独立 PREACCEPT 与 seal 后，以 `resolveODNotesFinal` 返回的最新 exact
`notes_final_ref = final_artifact_ref{path,sha256}` 完成一次父级 handoff。下游必须消费同一证书的
processor=`prototype-notes`、current final HTML/new spec/patch、hash-bound notes_manifest_ref、
required_behavior_refs（原 source 全分母 ∪ parent motion ∪ 适用 NOTES 实例）、generation scope
及同版同 hash 的 content-guidelines/runtime 引用；accepted motion→notes 还重验 exact 当前
parent 链。raw/spec/recovery receipt/parent 是 provenance，不是权限或成功回退。AI scope 不得
缩减 source 分母，人工全原型及合并历史保留。PREACCEPT 不要求尚未产生的父 DONE handoff；
未确认、stale、STAGED、缺来源、机械 raw gate FAIL/processing FAIL、最终原行为仍 FAIL 或失效引用
阻断本次交接；保留 raw semantic FAIL，不能要求加工前 raw semantic PASS。不另写
NODE/STATUS/handoff，不重开历史 OD/motion DONE；关闭/只回收分支保留原消费合同。

skill 启动时，Orchestrator（或 skill 自身在 standalone 模式下）按以下顺序读取：

1. **自己的 SKILL.md** → 完整读取当前输入合同，确认本次所需来源与权限
2. **本次全部必需上游** → 在已验证项目根的 workflow-state 中取精确 handoff_path；不以最近 DONE 代替依赖集合，standalone 不补 workflow state
3. **精确 handoff 及必需来源** → 在本次读权限内核版本、真实 gate/证据；缺失、失败或未知的必需依赖不作为成功消费
4. 如需要 → 共享 references 中的特定文件（按 context-cost.shared-refs 声明加载）

不以交接为由批量加载上游完整 SKILL.md 或全部产出。当前 owner 输入合同明确要求的来源或片段，
仍须在本次真实读权限内完整读取并核验；摘要不能替代必要来源，也不授予额外读权。

## 写入脚本

在 skill 的产出写入完成后，在 SKILL.md 的 completion 步骤中添加：

```bash
# 写入 handoff summary
DATE=$(date +%Y-%m-%d)
TOPIC=$(grep "^topic:" .claude/workflow-state.yaml | awk '{print $2}' | tr -d '"')
SKILL_NAME="<当前skill名>"
mkdir -p docs/handoff
cat > "docs/handoff/${DATE}-${TOPIC}-${SKILL_NAME}-handoff.md" << 'HANDOFF_EOF'
# Handoff: <skill-name> → downstream
...（按格式填写）
HANDOFF_EOF
node scripts/check-quality-gates.mjs --handoff "docs/handoff/${DATE}-${TOPIC}-${SKILL_NAME}-handoff.md"
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
2. **手动 checkpoint**（`<date>-<topic>-checkpoint.md`）：格式真值源是 CLAUDE.md
   「Context 工程协议 → Checkpoint 写法」的五段结构（已完成✅/进行中/待执行/关键决策/恢复指令），
   此处不复制全文，防双源漂移。

命名约定：checkpoint 文件名必须以 `-checkpoint.md` 结尾——误用 `-handoff.md` 后缀会被
check-quality-gates 按 handoff 校验 `gate_result` 而假红。

## 变更日志

- v3.2 (2026-07-09): gate_result 扩展为必带 criteria 逐条判定块（评估主绑定点，final-plan E1；
  方法论见 skill-os/eval-methodology.md；存量 handoff 不回溯）
- v3.1 (2026-07-04): 补 Checkpoint 格式定义（auto/manual 两种），明确与 handoff 的校验边界
- v3.0 (2026-05-08): 首次创建，作为 Context 存活工程的核心协议

<!-- FILE_END: handoff-protocol.md -->
