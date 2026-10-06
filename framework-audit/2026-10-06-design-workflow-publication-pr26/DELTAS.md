# 原计划内的直接消费者同步

以下是实施前读取实际入口发现的局部同步，保留原 U-ID、依赖和用户已批准目标；不改变设计取舍或能力边界。

## U-001-b

`idea` 状态块在中央 writer 前直接覆写共享 current-topic 别名。将该显示投影交给中央 topic 事务；调用方只使用已经验证项目的绝对路径及已确认 topic/scene，不从共享别名建立 pin。九个状态调用块的非零失败均停止依赖后继，产物保留。

## U-002

QG 的 ID 行固定写 R01/A01/F01/D01，但两个实际 skill 的稳定编号是 R1/A1/F1/D1。按对应 owner 格式核唯一性，不让合法编号被通用行误拒。原 Oracle 的 AI-spec 文件存在性属于未来 Phase 6；草稿审查核内存中的应有架构内容/生成承诺，不要求提前写最终文件。 第二次 pre-write 自检同样先核当前内容/承诺，实际文件义务在生成后、handoff/DONE 前读回验收，避免相同前置时序死结。

## U-004

`.claude/agents/preflight-agent.md` 的 tech-spec/task-plan 两个入口仍无条件要求 PRD/Brief。同步这两行到 canonical source-mode 分支；纯工程必须核真实 register，不豁免普通 PRD 输入。

## U-005

`.claude/agents/references/plan-design-guidance.md` 的 headless 失败段也无条件要求桌面恢复。加上同一 original_copy 能力例外并指向 OD owner；普通 carrier/reference 桌面恢复保持原规则。R2 已写“按 OD 合同执行”，无需重复规则。

## U006 release notes
CONTRIBUTING requires an Unreleased changelog entry. Root adds two finite user-facing bullets for these approved repairs, no new capability claims. CI adds four existing/core commands in one fail-closed step; checker rejects omissions, swallowed failures and continue-on-error. Baseline CI rejects added contract; real14/14 proof-it-bites passes.

## U006 actual release preflight delta
First complete verify retained PASS118 FAIL3: C9/C10 current plan-design-guidance source SHA guard still pins old approved body; B2 OD46514/HTML47191 exceed existing find +45k gate (46080 bytes), baseline42663/45993. Fix only current checker pin and semantically equivalent prose compression in already-owned OD/HTML files; preserve execution/preamble/state Bash bytes, every gate and historical immutable receipts. Follow with C9/C10, current state128/design221 and budget gate, then cold final axes. First FAIL and source freeze remain retained; final precommit must supply actual fullgreen, no skip/FAST override.

## Actual remote CI credential surface repair
PR26 actual head CI reproduced diagnostic refusal for checkout extraheader. Only delta: validate-framework-logic checkout persist-credentials:false; no safety/test bypass. Original security gate unchanged. Frozen77 set updated only ci.yml hash. Fresh independent final axes required; prior votes retained as previous-candidate evidence.
