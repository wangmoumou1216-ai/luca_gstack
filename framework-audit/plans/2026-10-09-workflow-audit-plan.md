# 其他 Workflow 横向排查：有限修复与发布计划

plan_id: WORKFLOW-AUDIT-20261009-01
source_identity: user-workflow-audit-20261009
scope: NO_PIN-framework-workflow-audit
status: PLANNED
baseline: 1322121d473fcf733808e65125903202d8683e66

来源（原话）：
> 另外，我需要你针对其他workflow也做一下排查，有没有场景和细节没有考虑清楚的地方。你要自行从多维度排查，尤其明确以前没有考虑的点去排查，发现问题。然后专家会审，给出明确问题和专家级别的建议。针对最后的握手建议，去执行。然后提交推送拉回本地

## 0 前提与边界

1. 该解：真实脚本已复现不完整结果被标完整、目标替换、非法评分/裁决及消费计数错位；两名冷专家另查出恢复、工程入口与 handoff 合同冲突。证据在 `framework-audit/workflow-audit-20261009/findings.md` 和 `baseline-probe.jsonl`。
2. 更小替代：修现有工作流函数/输入边界/消费校验与三处 owner 合同。不建通用状态机，不新加项目选择、流程选择词法、审批收据 primitive、模型路由或自动重试系统。
3. 默认产出：有限源修订和回归证据。此默认可能使所有发现都被当成需要代码；独立方案判官须默认 REFUTE，允许不采纳并核现有机制已足够的条目。
4. KILL-1：如果现有调用者合法依赖“部分返回但 COMPLETE”、目标替换或非法数值，不能直接保留这种行为；先交原 owner 澄清兼容接口，停止受影响修订。
5. 已知限制：本次确定执行证据来自真实 JS/CLI/临时文件系统与运行时 fixture；不将它们当成 Claude/Codex 真实产品多轮行为。源文档修订的 native A/B、真实产品恢复与 OS沙箱效果若无票，明确 UNKNOWN。旧轮 Claude OAuth 问题不伪装成本轮重新测试结果。
6. 保留 Codex 项目选择钩子关闭；框架无项目 pin，不读写共享 docs/workflow-state/current-topic，不改 framework/ 模板。

## 1 复杂度与执行方式

Sequential 外层 + Supervisor 独立验收；Git 发布属于不可逆效果，Tier=Deep。
主 Agent 唯一实施 owner；专家仅只读。已完成两次规划输入审查，后续关键判官严格串行、冷启动（quality-gate/MR-004），同次真实完成后再派下一位。
模型：主控继承 anchor/core-execution；关键语义裁决为登记 MR-004/peak；不硬编码账户模型或改变 effort。
没有产品 task-plan，DEV/ASSERT 反向覆盖表 N/A；下表十个 WF 问题为需求分母，不随测试返回数量改变。

### 需要绑定的授权

用户已表达修复与 commit/push/pull 的目标授权。仓库 K3 的具体计划后批准与 native receipt 能力缺口仍存在；上一轮11文件的临时例外不自动扩展到本次。
本计划只在获得本次 scope-matched 真实确认及必要的一次性收据例外后实施；不把手写 JSON、专家握手或静态 checker 当作人类批准。任何例外只作用于本计划，不修改永久审批规则。
如果允许在明确保留 native 行为 UNKNOWN 的情况下发布有限修复，须与上述确认同次明示；否则缺票阻断发布，不声称完整跨端验收。

## 2 有限文件范围（12 个行为/测试文件）

1. `.claude/workflows/framework-evolution-scout.js`
2. `.claude/workflows/external-skill-scout.js`
3. `.codex/workflow-runner.mjs`
4. `scripts/evolution-bookkeep.mjs`
5. `.claude/agents/orchestrator.md`
6. `.claude/skill-os/optional-workflow-graph.yaml`
7. `.claude/skills/office/research-kit/SKILL.md`
8. `scripts/test-scout-workflows.mjs`（新增）
9. `scripts/test-evolution-bookkeep.mjs`（新增）
10. `scripts/test-workflow-runner.mjs`
11. `scripts/test-design-workflow-contract.mjs`
12. `scripts/verify.sh`

任务证据仅写本计划和 `framework-audit/workflow-audit-20261009/`；测试临时数据仅 OS temp 本任务自建目录。已有日志与主检出未提交修改不进入提交。研究 skill 的 name/tools/context-cost/preamble/路径/必需 handoff 字段/阶段顺序保持。

## 3 U-block / Wave

所有单元 phase_type=task_execution，Source 均为上方真实用户原话及映射 WF-ID，Status=PLANNED。
修订采用主 Agent 实施→定向验证→最终独立评审；不派执行 worker，避免共享文件竞争。

### U-001：关闭共享交接矛盾（WF-07/08/09）
- Dependencies: None；model_tier=core-execution；Owner=main。
- Files: 5/6/7/11。
- Approach: 所选路径内先恢复精确 IN_PROGRESS（只补未完成门/工作），再找依赖就绪 PENDING；旧状态不激活未选流程。给 code-recon 工程推荐附 tech-spec 真正输入资格，缺来源回需求 owner。research-kit 各模式按共享实际豁免条件判定，不虚降 metadata。
- Read List: 上述四文件，R3、workflow-mode、handoff-protocol、code-recon/tech-spec 实际输入合同、skill-authoring/invariants 与 writing-for-agents 方法（已由规划审查/主控按适用范围读取，改前主控重读具体待改区）。
- Test scenarios: 仅 IN_PROGRESS 无 PENDING；前置待验+后继待开始；有效票复用/失效票重验；未选历史PENDING；只有代码/已具正式源/合法CONV；普通四模式及 decision-questionnaire 终端/有下游。
- Verification: A1 + 冷专家 C3；静态合同证据与 native 行为分列。

### U-002：修复两个 scout 的输入、身份与完整性（WF-01/02/03/10）
- Dependencies: U-001；model_tier=core-execution；Owner=main。
- Files: 1/2/8/12（verify.sh 仅新增该 suite 接线）。
- Approach: 保留 runtime 注入 agent/phase/parallel/log API，无 import 改造。派发前绑定 target/source/shortlist 原集合；区分有效空返回与失败；验证数值/枚举/身份，null 可选字段不覆盖已有事实，未知 gap 不通过；不完整返回保留失败项、隔离建议；替换过时产品/宿主假设。
- Read List: 两份 workflow 全文、runner 的 agent 返回与 strict schema、现有 runner 测试、bookkeep 消费形状。
- Test scenarios: 完整/有效零候选；Load/Discover/Adoption/Intake/Verify/Redteam 缺失；两目标少一、多一、替换；null/未知 gap；评分0/3/99/字符串；stands/downgraded/killed/UNKNOWN；无 open gap；上限截断和去重不误判。两份 scout 的实际 schema 必须经 runner 现有 strict 转换后作为组合 fixture，验证合法 nullable 响应不抹除已有候选事实；通用 schema 单测不替代该组合正例。
- Verification: A2。新 suite 执行真实完整 workflow 脚本，只有 agent 网络/模型边界是 mock；保留候选身份及未知项原分母，不能复制生产算法当 oracle。

### U-003：验证消费与来源更新（WF-05/06）
- Dependencies: U-002；model_tier=core-execution；Owner=main。
- Files: 4/9/12（在 U-002 的实际 verify.sh 字节上追加，重新绑定 preimage）。
- Approach: bookkeep 只接纳形状/分母/计数一致的 COMPLETE 结果；白名单计数阻止元数据覆盖；来源 ID 精确匹配本块，数值类型明确，任何缺来源/错误在全部写前拒绝。保留原 propose-only、同 run 去重与 --dry-run；不新增通用事务/恢复系统或篡改既有日志。
- Read List: scripts/evolution-bookkeep.mjs 全文、U-002 输出合同、sources-registry 实际 YAML 形状（只读必要 shape）。
- Test scenarios: 合法 sweep/punctual、INCOMPLETE、候选漏项/重复/计数矛盾、未知 mode、stats 元数据键、S1/S10前缀、缺本块yield、未知source、字符串计数；所有拒绝检查真实临时 log/registry 字节不变；dry-run无写、同run不重复。
- Verification: A3，实际 OS temp fixture，不写生产治理数据。

### U-004：CLI 参数拒绝与回归闭合（WF-04）
- Dependencies: U-003；model_tier=core-execution；Owner=main。
- Files: 3/10；根据新契约补 8 的参数用例。
- Approach: --args 缺值/坏 JSON 立即明确报错退出，不能退回 {}；workflow 层处理原生注入的非法 args/空 targets/focus，首个 agent 前拒绝。真实省略仍允许原默认。
- Read List: runner 参数解析与 CLI tests 全文、两 workflow 参数合同。
- Test scenarios: 省略、合法配置对象/外部scout合法focus字符串；evolution 的 `target_repos: "owner/repo"` 与非空字符串数组都是既有合法入口，均须保留；缺--args值、坏JSON、明确空字符串/空数组/null targets、对象targets、含非法类型或空字符串的数组均拒绝，不能扩大为默认sweep；异常时 agent 调用数为0；既有排序、取消、critical latch不变。
- Verification: A2/A4/A5。

### U-005：专家握手与最终验收
- Dependencies: U-001/002/003/004；model_tier=reasoning-heavy（登记原生 MR-004）；Owner=独立 quality-gate。
- Files: 只读冻结12文件及测试证据；主控落 audit 报告。
- Approach: 冻结各源 SHA、完整问题/场景分母、真实 main_phase 完成记录，冷专家重放断言，核反例和保护项；源码变化后原票失效。默认≤2轮修订；仍有BLOCKER/MAJOR交人，不宣称握手。
- Verification: A1–A5+C1–C7；原始失败证据保留。脚本行为与文档静态证据不可互相替代。

### U-006：提交、推送、同步主检出
- Dependencies: U-005 通过、具体计划和发布权限有效；model_tier=core-execution；Owner=main。进入后先执行正常commit的A6，A6成功才继续push。
- Effects: 仅 stage 本12文件及任务证据；正常 commit；正常 push HEAD:main 到现有 origin；主检出 `/Users/luca/Desktop/luca_gstack` 仅 `git -c pull.rebase=false pull --ff-only origin main`。
- Read List: 本次冻结清单、实际 git diff/status、远端分支、长会话 owner、pre-commit/commit-msg；必要时仅正常 fetch。
- Test scenarios: 远端未变/前进分歧；主检出脏文件内容和index指纹保存；任一拒绝不 force/reset/stash覆盖。冲突时停止发布，保留修改待裁。
- Verification: A6完整repo gate通过后才push；A7确认源/远端/主检出一致且原脏文件逐字节/index不变。远端CI状态单独报告，不能由本地通过推定。

Wave 严格顺序：U-001→U-002→U-003→U-004→U-005→U-006。没有环，无后向测试依赖。

## 4 断言与证据

每条在独立 bash 进程执行、保留真实 stdout/stderr/exit；默认 BLOCKING，失败不由末尾echo吞码。
新增测试的完整场景矩阵在首次测试前冻结；源/driver/fixture SHA、命令、时刻、PID、结果与清理后仍可读证据在任务目录保存。所有 fixture 是 NO_PIN，本次授权内 OS temp，外部 agent mock 明示。

| ID | 命令/精确验收 | 类型 |
|---|---|---|
| A1 | `node scripts/test-design-workflow-contract.mjs` | 共享合同/正反分支静态证据，非 native |
| A2 | `node scripts/test-scout-workflows.mjs` | 真脚本执行；外部模型边界确定fixture；含关键 guard-removal mutation |
| A3 | `node scripts/test-evolution-bookkeep.mjs` | 真 CLI 与临时真实文件系统；拒绝零写+正常落账+mutation |
| A4 | `node scripts/test-workflow-runner.mjs` | 真CLI参数拒绝/dry-run，非真实模型 |
| A5 | `node scripts/test-workflow-runner-runtime.mjs`、`node scripts/check-routing-map.mjs`、`python3 scripts/build-agent-context.py check`、`node scripts/check-agents-parity.mjs` 各自独立运行 | 已有运行时边界/路由/生成/跨端投影，不声称端到端parity |
| A6 | 正常 `git commit` 的 `.githooks/pre-commit`→`bash scripts/verify.sh` 和 commit-msg 门；保存退出码；不得 skip hook | 完整仓库门；失败修复重验后才能push |
| A7 | 实际 `git rev-parse` 与 `git ls-remote origin refs/heads/main` 精确相等；主检出原dirty路径working/index指纹一致 | 发布后真实证据 |

以下每一块是独立 bash 断言；A5a–d保留各自退出码，不能只取最后一项。A7 的 task-owned 检查脚本只读取本轮冻结的 primary-dirty-snapshot.json、Git refs和精确dirty路径；在发布前先审查该脚本并保存快照，不从发布后状态倒推保护分母。

```bash
# [BLOCKING] A1 — 共享合同
if ( set -o pipefail; node scripts/test-design-workflow-contract.mjs ); then echo 'PASS A1'; else check_rc=$?; echo 'FAIL A1'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] A2 — scout 真脚本与mutation
if ( set -o pipefail; node scripts/test-scout-workflows.mjs ); then echo 'PASS A2'; else check_rc=$?; echo 'FAIL A2'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] A3 — bookkeep 真CLI与零写拒绝
if ( set -o pipefail; node scripts/test-evolution-bookkeep.mjs ); then echo 'PASS A3'; else check_rc=$?; echo 'FAIL A3'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] A4 — runner入口
if ( set -o pipefail; node scripts/test-workflow-runner.mjs ); then echo 'PASS A4'; else check_rc=$?; echo 'FAIL A4'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] A5a — runner运行时fixture
if ( set -o pipefail; node scripts/test-workflow-runner-runtime.mjs ); then echo 'PASS A5a'; else check_rc=$?; echo 'FAIL A5a'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] A5b — 路由兼容
if ( set -o pipefail; node scripts/check-routing-map.mjs ); then echo 'PASS A5b'; else check_rc=$?; echo 'FAIL A5b'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] A5c — 生成一致
if ( set -o pipefail; python3 scripts/build-agent-context.py check ); then echo 'PASS A5c'; else check_rc=$?; echo 'FAIL A5c'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] A5d — 两端共享投影
if ( set -o pipefail; node scripts/check-agents-parity.mjs ); then echo 'PASS A5d'; else check_rc=$?; echo 'FAIL A5d'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] A6 — 正常提交内的完整仓库门；仅U-006有权运行
if ( set -o pipefail; git commit -m 'fix(workflows): validate completeness and resume unfinished gates' ); then echo 'PASS A6'; else check_rc=$?; echo 'FAIL A6'; exit "$check_rc"; fi
```
```bash
# [BLOCKING] A7 — 发布与主检出保护；仅U-006完成正常push/pull后运行
if ( set -o pipefail; python3 framework-audit/workflow-audit-20261009/verify-publication.py ); then echo 'PASS A7'; else check_rc=$?; echo 'FAIL A7'; exit "$check_rc"; fi
```

criteria（独立语义判官）：
- C1 十个 WF 问题各有原证据、处置、正/反例及原始分母；没有无据扩大结论。
- C2 每个 required 脚本失败分支保留身份/缺口，不能被过滤成完整成功；有效空结果可以完成。
- C3 恢复、工程输入与研究交接三个合同闭合且保持真实Human Gate；静态成立不冒充产品实跑。
- C4 不完整/非法结果和错误来源更新在任何 bookkeeping 写入前拒绝；正常结果及元数据保持。
- C5 Codex项目选择关闭、NO_PIN、只读模板、原生模型/取消/沙箱、skill保护区不改变。
- C6 只改冻结范围；原有用户脏文件与旧证据保留；所有补丁经终版复审。
- C7 Claude/Codex shared逻辑、adapter fixture、native行为三种证据分别报告；未知仍未知，不把mock数当模型成功率。

## 5 失败与退出

required断言失败停止其依赖，授权内返修；未知真人决定才询问。两轮仍有重大问题按R4交人，三次同类执行失败停止盲重试。
Plan/范围变化按原U-ID追加delta，新增effect/推翻已确认决定重新确认。不把未来测试/收据写成已完成。
发布失败不回滚用户工作；主检出非快进或保护指纹变化时停止。有限修订完成与真实双端产品行为闭环分列，不宣称此次消除了所有workflow风险。
