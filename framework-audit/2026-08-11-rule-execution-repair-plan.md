# luca_gstack 规则执行闭环修复计划

日期：2026-08-11  
状态：**AWAITING_USER_CONFIRMATION**  
计划类型：Hierarchical / 跨路由、hooks、checker、治理、Git  
关联审计：`framework-audit/2026-08-11-rule-execution-system-review.md`

## 1. 完成定义

只有同时满足以下条件，才可以声称“规则已执行”：

1. 每条关键规则有唯一 ID、真值源、适用 harness、触发条件、执行器、验证器和降级声明。
2. 路由器能把框架 meta 审计识别为 meta，并在复杂任务上输出 Plan，而不是 Project Stop。
3. 项目 pin 同时约束读和写；无 pin 不读取任何继承项目状态。
4. 纠错关闭需要结构化 receipt，不能用空文件或仅 mtime 证明完成。
5. checker 验证行为和负例，不再用“文件存在、数量够、字符串存在”代替能力证明。
6. Claude 与 Codex 的原生差异被显式标为 degraded，但核心停止条件与结果回执一致。
7. Git closeout 有单一规则、明确例外、精确 stage 和提交/推送回执。
8. 主验证、pre-commit 与 CI 的覆盖关系可读、可机检，任何一层不得暗示未运行的检查已通过。

## 2. 边界

- 本计划修 luca_gstack 自身，不切换或写入任何下游项目。
- 不直接改 `framework` 模板保护区。
- 不把用户偏好写进通用 skill。
- 不扩大到产品功能或 CRM 方案本身。
- 不自动跨越现有 Cycle 2 的 containment 与 activation 人工门。
- 不自动 push；先按本计划收敛 Git 规则，再在获批范围内执行精确 closeout。

## 3. 需要用户确认的三个决策

1. 采用 `execution-obligations.yaml` 作为关键规则的机器可读注册表，并要求每条义务绑定 runtime receipt。
2. Git 规则增加窄例外：用户已批准的计划内例行 closeout 不再二次触发 Plan；改变范围、历史或远端状态仍触发。
3. 对原生能力不一致只承诺“语义降级”，不再声称 slash、Workflow、widget、沙箱事件完全平价。

## 4. 执行 DAG

```text
G-PLAN 用户确认
  └─ E1 路由、纠错、读隔离的最小止血
       └─ T1 定向行为测试
            └─ E2 规则义务注册表与完成回执
                 └─ T2 mutation / negative tests
                      └─ E3 冲突与陈旧声明清理
                           └─ T3 Claude/Codex 双路验证
                                └─ E4 接续 Cycle 2 执行包
                                     ├─ G-CONTAIN
                                     └─ G-ACTIVATE
                                          └─ T4 全量验收
                                               └─ E5 精确 Git closeout
                                                    └─ 冷上下文复审
```

## 5. E1 — 三个最高优先级止血项

### DEV-101：meta 路由先于通用 Project Gate

修改：

- `.claude/hooks/route-guard.mjs`
- `memory/evals/routing/fixtures.jsonl`
- `scripts/test-route-guard.mjs`
- 必要时同步 routing map，但不得复制另一份散文规则

行为：

- 建立结构化 meta intent，而不是继续追加有限前缀。
- 框架自身的规则审计、hook 审计、Codex/Claude parity、Git 规则审计直接进入 meta 分支。
- meta 任务仍必须计算复杂度；满足任一 Plan 条件则输出 `PLAN_MODE`。
- 保留负例：真正的老项目、已有项目、继续项目仍先进入 Project Gate。

验收：精确用户原句返回 `PLAN_MODE`；语义近邻至少 8 条；项目 Gate 回归至少 8 条。

### DEV-102：纠错关闭使用真实 receipt

新增：

- `scripts/close-correction.mjs`
- `.claude/skill-os/correction-receipt.schema.json`
- 对应测试

修改 Stop hook：

- pending extraction 记录 observation ID、candidate ID、fixture ID、归因层级和校验命令。
- close 脚本读取这些实体，验证均真实存在且校验命令成功，再生成带内容哈希的 receipt。
- Stop hook 只接受合法 receipt；空 marker、只有 mtime、缺任一证据均拒绝。

迁移：保留旧 marker 读取期只用于提示，不用于判定已完成；提供一次性迁移说明，不静默伪造 receipt。

### DEV-103：project pin 覆盖读侧

修改 session restore 与 route guard：

- 无 session pin 时不得读取共享 workflow state、共享进度或从软链推导项目。
- 有 pin 时只读取 pin 指向的绝对项目路径。
- 项目切换采用 prepare → validate → commit pin；切换命令失败不得留下新 pin。

验收：两个并行 session 指向不同项目时，任一会话的 prompt 注入、路由和写入均不出现另一项目内容；无 pin 为中性状态。

## 6. E2 — 从“规则清单”升级为“执行义务”

新增 `.claude/skill-os/execution-obligations.yaml`，每条关键规则至少包含：

```yaml
- id: OBL-ROUTING-001
  source: canonical-source-pointer
  harnesses: [claude, codex]
  trigger: machine-readable-condition
  executor: hook-or-script
  verifier: test-or-receipt-checker
  failure_mode: fail-closed
  degradation: none-or-explicit
```

新增 `scripts/check-execution-obligations.mjs`：

- source、executor、verifier 必须真实存在。
- machine-critical 规则禁止 `executor: model-only`。
- 声称跨 harness 的规则必须有两端测试或显式 degradation。
- checker 必须含一个正例、一个负例和一个 mutation 断言。
- 未绑定 receipt 的 completion 规则不得声明 DONE。

接入主 verify、pre-commit 和 CI；三个入口分别报告实际运行集合，禁止上层把未执行项聚合成 PASS。

## 7. E3 — 冲突与陈旧声明收敛

### Git 单一真值源

建立一份 Git closeout policy，由 CLAUDE、AGENTS 和纠错协议只做指针引用：

- 框架修改默认：同步前检查 → 精确编辑 → 验证 → 精确 stage → commit → push。
- 计划已批准且 scope 未变的例行 closeout，不二次触发 Plan。
- pull/rebase、历史改写、冲突解析、force、改变远端或超出批准 scope，仍进入 Plan 或人工门。
- 局部计划可显式 `push: prohibited` 覆盖一般规则，并必须出现在 execution receipt。
- 工作树脏时禁止 `stage all`；只 stage 本任务清单。

### 其他清理

- 删除 `minimal` 与当前实测枚举的矛盾。
- 修正仓库 hooks 与全局注册的陈旧注释和失败建议。
- 修正 harness 对 Codex block、input mutation、Stop 方言的旧描述。
- 将 open-design 的个人 design-system 偏好迁出通用 skill；移除产品专属硬编码。
- 给 formal PR review 增加 Codex fallback 或明确 degraded，不允许路由到不存在的 skill。
- 隔离高风险 external resolver；禁止默认 stage all、自动 commit 和硬重置。

## 8. E4 — 复用既有 Cycle 2，不重写一套方案

接续：`framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md`。

复用其中：

- pin transaction
- patch parser 与正文保真
- native agents
- shared skill reachability
- unsafe resolver containment
- activation journal / CAS
- execution receipts

本计划不自动批准其中的 `G-CONTAIN` 与 `G-ACTIVATE`。E1–E3 完成并通过 T3 后，必须分别回来让用户拍板。

## 9. 验收断言

1. 精确 meta 审计原句命中 `PLAN_MODE`。
2. 至少 8 个 meta 近邻不命中 Project Stop。
3. 至少 8 个真实项目请求仍命中 Project Gate。
4. 空 correction marker 被拒绝。
5. 缺 observation、candidate、fixture 任一项的 receipt 被拒绝。
6. receipt 内容被修改后哈希校验失败。
7. 无 pin session 不读取共享项目状态。
8. 两个并行 session 的读写互不污染。
9. 切换验证失败后 pin 不改变。
10. Codex agent 校验按角色名和职责，不按文件数量。
11. 删除任一必需 agent 定义会使 checker 失败。
12. 删除任一 obligation executor 或 verifier 会使 checker 失败。
13. 只保留 checker anchor、移除实际行为会使 mutation test 失败。
14. Codex 不再收到“改用不存在的 Claude Read 工具”作为唯一恢复路径。
15. Git closeout 在脏工作树中只 stage allowlist。
16. `push: prohibited` 的计划不会推送，并在 receipt 中可见。
17. 主 verify、pre-commit、CI 各自报告真实执行集合。

## 10. 复审与 Git 收口

1. 本地执行定向测试、主验证和 CI 等价入口。
2. 使用冷上下文 reviewer 逐条尝试推翻 17 条断言。
3. 输出 modified/untracked allowlist，确认不含用户既有 WIP。
4. 只 stage allowlist；展示 staged diff。
5. 按最终 Git policy 决定 commit 与 push，并保存 receipt。
6. 提交后重新跑关键验收，报告 HEAD、远端状态和残余风险。

## 11. 当前人工门

用户确认本计划，只授权执行 **E1–E3**。E4 的两个高风险门仍需单独确认；任何 scope 变化都必须回来重规划。

<!-- FILE_END: 2026-08-11-rule-execution-repair-plan.md -->
