# luca_gstack 健康度体检 + 能力匹配评估 — 2026-06-28

> 基准（用户确认）：健康度（声明 vs 实测） + 能力匹配·对标最新 harness/模型 + 能力匹配·对标真实工作流。
> 方法：多 Agent Workflow（run `wf_2d4af56e-435`），15 探针单元各跑真实套件 → 每条候选独立对抗核验（不确定即证伪）→ 对账 BACKLOG/gaps/audit 去重。
> 机读清单见同目录 `2026-06-28-findings.jsonl`（HC-01…HC-53）。

## 0. 一句话结论

框架**结构健康、自带套件全绿（verify PASS=45 / FAIL=0 / WARN=1）**，无腐烂级硬伤；但"绿"主要由文件存在/字符串存在类检查构成，**行为级保证薄**。三轴定性：**健康度=良好但有 13 条真实新缺口（多为治理/失败恢复的静默风险）**；**对标 harness=不落后但刻意未用原生 subagent/workflow/多 hook 原语（prose 编排路线，可重估）**；**对标真实工作流=CRM 专属设计层（fxui/auto/figma-demo）近乎休眠，但通用方法论脊柱（research→UX→spec→OD）已迁移到个人 app——不是"死身份",是"专属层冬眠、通用层活跃"**。

## 1. 基线

- HEAD：`7ff2d47`（脏文件仅 `M memory/episodic/index.jsonl`，体检前既有；跑过 build:self-model 的探针均 `git checkout --` 还原，全程零改框架）。
- `npm run verify`：**PASS=45 FAIL=0 WARN=1**（唯一 WARN=I4 `docs/adr/` 目录，deactivated-state 预期）。
- `npm run test:memory`：**18 例 OK**（注：多处文档/brief 称"27 例"，全仓无 `27` 证据、git 无删测痕迹——实际 18，见 HC 已知缺口）。
- 全部套件 exit=0：test:routes(27)、check:routing-map、check:project-routing、check:hooks(12)、check:memory-health、check:quality-gates、check:coding-discipline、check:self-model、validate:skills(26)、lint:yaml、check:project-links（deactivated-state 正确返回 no-active-project）。
- 注：本 session 处"无激活项目"态（启动清三软链，设计行为），依赖 docs 软链的检查均为预期 dangling，非 bug。

## 2. 对抗记分板

| 裁决 | 数量 | 说明 |
|---|---|---|
| **UPHELD（真且新）** | **13** | 见 §4 |
| **WEAKENED（真但量级/范围被夸大，已修正）** | **14** | 见 §5 |
| **REFUTED（不成立/已知延后/有意设计）** | **26** | 见 §6 |
| 合计候选 | 53 | 撤回率 **49%**，落在历史自审先验 50–65% 带内偏下 → 对抗有效、未橡皮图章 |

**值得记一笔的自我纠偏**：体检最初的最强假设「纷享-CRM 设计身份与真实工作结构性错配」被红队**证伪**——其关键证据"49/49 零 CRM 关键词"经重跑 grep 为假，且部分属有意设计。真相是更细的 §3-L3。这正是对抗核验该拦下的 over-claim。

## 3. 三透镜定性

### L1 健康度 — 良好，但"绿"≈结构绿
件齐、套件全绿、声明与实现大体一致、无死代码级腐烂。真实缺口集中在**治理与失败恢复的静默风险**（晋升门禁、原子写、fail-open 缺口、Writer 零覆盖），见 §4。结构检查充分，**行为/语义层保证不足**（§3-T）。

### L2 对标最新 harness/模型 — 不落后，但路线性弃用原生原语
- **模型档**：`model-routing.yaml` known_lineup [fable/opus/sonnet/haiku] 与当前 GA 别名一致，**无漂移**（review 期 2026-09-08 未到）。✅
- **刻意未用**（均被判 by-design，非缺陷，但值得重估）：原生 subagent frontmatter（model/tools）、原生 agent teams/background workflow、SubagentStop/SubagentStart/Task* 等 hook 事件（~29 个事件框架只接 4 个）。框架走 **prose 编排**路线而非 CC 原生编排原语。
- **一个待查漂移**：`settings.json:34` PostToolUse matcher 仍列 `Task`（CC 已将该工具更名 `Agent`？）——若属实，post-edit hook 在 `Agent` spawn 时不触发 → 自成长计数漏记。**未行为级核验，列为 watch-item**（与 §4 post-edit 缺口交叉）。

### L3 对标真实工作流 — CRM 专属层冬眠 / 通用脊柱活跃
- episodic 49 条：23 框架自研、9 研究情报官/Muse(Electron)、4 ax-cowork、其余个人 app（todo-capsule/roam-cards/mobile-list…）；近期 skills_used 多为 `swiftui/native-macos/code-fix/careful/[]`。
- **零触发的 CRM 专属件**（按 skills_used 实测）：`fxui-source-to-html / fx-icon-search / magicpath / figma-demo / compare / auto` 全 0；framework/ 5 母版 + brand-tokens.md（#FF8000）`git log` 显示长期未动。
- 但通用方法论脊柱（deepresearch→ux→tech-spec→open-design）确有迁移到个人 app 的痕迹。
- **遥测缺口（显式标注、不据此下硬结论）**：`run-log.jsonl` = 0 字节，无 per-invocation 触发数据；adoption-log 5 条全 `helped:unknown`。"哪些 skill 哑火"基于 episodic + git，非器械级遥测。
- **结论**：不是"框架身份死了",而是 **CRM 专属设计层 + 旗舰 /auto 编排器处于冬眠**，每 session 仍注入 CRM 身份（SF-001/004/005 在 static-fallback-allowlist）。是否裁掉/收窄 CRM 专属层是**产品级取舍**，留你拍板（证据已备，不替你决定）。

## 4. UPHELD — 13 条真实新缺口

**治理/记忆完整性（最该看）**
- **[memory·中] 晋升门禁「review 必需」未被强制**：`promotion_ready()`（consolidate_memory.py:293-317）从不要求一条正向 review 决策，仅排除已 promoted/rejected，门禁余下为 `proposed_stable=True + confidence=='high' + evidence/scope/reviewer 非空`。提案者用 `propose_semantic --stable` 可**自认证**，再由每日无人值守治理**自动晋升**——且 `orchestrator.md §2c-obs` 主动指示 agent 发 `--stable`，故**可达、非纯理论**。**与红线 SC-20260523-003「必须经 review 晋升」相悖**。
- **[R·中] consolidate 全量重写候选/评审队列非原子，且 `candidates.jsonl`/`reviews.jsonl` 被 gitignore**：`memory/scripts/*.py` 无 `os.replace/tempfile/fsync` 原子原语、无 `flock`；:492/:518/:541 均 `write_text()` 截断重写，由 detached 无人值守每日 `daily_governance` 触发。崩溃命中 truncate→write 窗口 = **静默且 git 无法兜底地丢失整条 pending 队列**（promoted-facts.yaml 受 git 兜底，但工作队列不受）。
- **[memory·低] propose_semantic.py 死代码 `_promote`/`_sync_claude_md_fallback`**：143-180 定义了一条绕过门禁、直写 promoted-facts.yaml + 改写 CLAUDE.md SF 的休眠路径；main() 从不调用（全文 grep 仅定义处）。与模块"只产候选"声明相悖的潜在地雷。

**路由/守卫**
- **[routing·中] Project Gate meta-verb 豁免遮蔽具名项目切换**：prompt 以审计动词（查看/看看/评估/审计…）开头时 `route-guard.mjs:144` 短路 projectGate，**早于**具名已有项目切换判断 → 对"看看 luca-dev 的列表页 UX 问题"直接进 `/ux-audit` 而非先切项目。**与红线 SC-20260523-002 相悖**（dry-run 三探针复现）。
- **[routing·低] `workflow-state.yaml` 的 readFileSync 缺 try/catch**：route-guard.mjs:551-552 仅 existsSync 守护，无 try/catch（同文件 6 处同类读取均有）。state 文件不可读/被替换为目录 → **整个路由守卫对每条 prompt 崩溃失效**（仅 stderr）。真实触发概率近零，但与 fail-open 声明不符。

**自成长 hooks**
- **[hooks·中] post-edit.mjs（计数 Writer）零套件覆盖**：`check:hooks` 12 例只测 State+Reader+Clearer（session-sync/restore），不含 post-edit。自成长"实质工作"触发的**唯一生产者**仅在消费者侧用伪造状态间接验证，Writer 本体的 matcher/自增正确性无回归。

**失败可观测性**
- **[R·低] daily_governance 自身崩溃只留 ephemeral /tmp + 无"连续 N 天失败"升级**：consolidate 错误已落持久 digest（'/tmp silent' 疑点**基本证伪**，DG-02/DG-03/顶层 try/except 均验证有效）；残余是 governance 自身顶层崩溃细节仅在易失 /tmp，且月度演进扫描有"已跳过 N 次"升级、每日治理没有等价告警，陈旧 digest 仍被当"最新"展示。

**测试有效性 / 杂项**
- **[T·低] verify.sh S7 是实现细节 grep 而非真测**：:84 `grep -q 'replace.*\s'` 只证源里有正则形子串，与真正测归一化的 S9（test:routes）冗余。
- **[evolution·低] sources-registry 硬编码 office skill 数陈旧**：:50 写"25 office skill"，实际 26（self-model.generated.yaml + 实扫 + check:self-model 确认）。
- **[P·低] session-restore 启动 stdout 块=10（有界、无缺陷）**：仅为请求的测量；稳态典型注入 ~2-4 块，预览均/多有截断，非膨胀。

## 5. WEAKENED — 14 条（真但已修正量级，多降为低/信息级）

- **[SC] skills-lock.json 是孤儿且陈旧**：唯一 vendored skill magicpath 的 computedHash 与实文件**不匹配**，无任何 suite 重算 → 给出**虚假供应链保证**（修正：低severity，一次性快照无消费者）。
- **[SC] 无持续供应链门禁**：lock/vetting/vendored 代码被零 suite 校验，漂移对 `npm run verify` 不可见（修正：低，潜在卫生缺口非中级门禁）。
- **[T] 行为级 A/B 夹具是 episodic 摘要而非真实 prompt**：`behavioral_ab.extract()` 取 episodic `topic`（连 `summary` 字段都不存在），每 skill 仅 0-1 条 → 多数 skill 无法产出真 PASS。源被冻结/偏薄，限制了 GAP-behavioral-verification "已 addressed" 的实效。
- **[evolution] daily governance 无 registry 交叉一致性/self-model 漂移守护**：`check_self_model()` 只查 review-age + generated 存在，不跑 check:self-model 漂移、不校 adoption-log gap_id（修正：低）。
- **[framework-obs] verify.sh 漏检 shared-head.html**：F1-F5 只查 5 个页面母版；**承载全部品牌 token 的 shared-head.html 无存在性检查**（tokens.css 应从发现中剔除——已 by-design 弃用、零模板引用）。
- **[contract] Plan Agent 触发条件计数标签陈旧**：CLAUDE.md/AGENTS.md 标"4条件/4 conditions"，规范源 plan-agent.md 列 **5** 条且 SSOT-7 强制 5；AGENTS.md 自相矛盾（修正：低，cosmetic）。[known: GAP-routing-fragmentation]
- **[S] 外部 skill 经未钉版 npx 执行外部代码 + 一次性 LLM 判定安全**：vetting 是 scout 时刻的单次快照、装的是未钉 SHA 的 npx target → "approved" 不等于持续安全。
- **[S] git-tracked 记忆/observability 自由文本无写侧脱敏**：易失原始层已 gitignore，但 index.jsonl/observations.jsonl/promoted-facts.yaml 进 git，唯一闸是弱本地 secret-scan（修正：低/信息级，当前实扫无敏感内容）。
- **[P] CLAUDE.md/SKILL.md 无上界 context-budget 回归守护**：validate-skills 仅下界（<100B），verify.sh/CI 无上界断言 → F5/F8 的瘦身收益可静默回涨（CLAUDE.md 史上曾 36KB→50KB 尖峰无机器守护）。
- **[project-model] model-routing.yaml（路由 SoT）被 lint:yaml/verify.sh 排除**：9 个 skill-os yaml 中 lint:yaml 仅覆盖 6 个，路由真值源无硬 YAML 语法门。
- **[skills] validate:skills 只覆盖 26/28 SKILL.md**：父级 office/SKILL.md（启动必读）与 references/SKILL.md 不在循环内；references/SKILL.md 当前**违反 FILE_END 约定**且无门禁发现。
- **[hooks] session-restore 无顶层 try/catch**：fail-open 全靠 settings.json `|| true`；早抛会跳过计数/marker 重置。
- **[hooks] post-edit 计数是非原子 read-modify-write**：框架强制并行工具调用下可丢自增、压低 Stop 实质阈值（自我缓解，影响窄）。
- **[routing] MULTI_SKILL 决策以 `❓ STOP` 标签呈现**：与"低置信兜底 STOP"共用前缀，混淆两个声明层（cosmetic）。

## 6. 已知-延后对账（REFUTED 中命中账本者，复核仍延后/有意设计）

经核验**确认仍属已裁决、不重开**：`#2`（双时态读侧过滤，未触发）、`#4`（framework PreToolUse，0 命中）、`GAP-behavioral-verification`（×3：CI 绿无行为覆盖 / check-coding-discipline 同义反复 / A/B difflib 文本比对——均 addressed 范畴）、`GAP-soft-enforcement`（×4：单 skill 不查 Plan 条件 / run-log 遥测缺口 / agent 级模型钉 / 高价值 hook 未接——软约束已登记）、`GAP-routing-fragmentation`（路由契约三处重复但 SSOT-7 部分缓解）、`GAP-no-rollback`（vetting 无 pinned_sha）。

**被证伪的非缺陷（healthy）**：模型档无漂移；framework HTML **CI 确有** html-validate（ci.yml:98-103，本地不可装≠无验证）；tokens.css 弃用属有意且文档化；原生 subagent/workflow/MCP 未用属 by-design；test:memory "27 vs 18" 的 27 无任何证据支撑。

## 7. 补强维小结（S/P/R/SC/T）

- **S 安全**：本地 secret-scan **漏现代 key 格式**（`sk-ant-api03-...` 不匹配，UPHELD-类已并入 §4 watch + §5）、未接 CI；tracked 自由文本无写侧脱敏（当前实扫干净）。
- **P 延迟/预算**：启动注入有界（10 块、多截断）；**缺上界 context-budget 守护**是真缺口。
- **R 失败恢复**：最集中的真实风险区——非原子写丢队列、route-guard/session-restore fail-open 缺口、治理崩溃可观测性弱。
- **SC 供应链**：lock 孤儿+陈旧、无持续门禁、无 pinned_sha——一致指向"采纳后无持续完整性校验"。
- **T 测试有效性**：核心洞察——**verify 全绿主要是结构/字符串存在检查，行为级近零**；behavioral_ab 存在但夹具偏弱。

## 8. PROPOSE-ONLY 修复 backlog（不自动落地，待你逐项拍板）

> 沿用 BACKLOG.md 风格：每条带 落点 / effort / 🔔触发。**优先级 = severity × 红线相关性。**

**P0 — 触红线/静默不可逆（建议优先）**
1. **晋升门禁强制 review**：`promotion_ready()` 增"至少一条正向 review 决策"门，或禁止 `--stable` 自认证进无人值守晋升路径。落点 `consolidate_memory.py:293-317` + `propose_semantic.py:65`。effort ~15 行 + 1 测试。🔔 现在（已与 SC-20260523-003 冲突）。
2. **候选队列原子写 + 防丢**：`write_text` 改 tempfile+`os.replace`；或把 `candidates.jsonl`/`reviews.jsonl` 移出 .gitignore。落点 `consolidate_memory.py:492/518/541`。effort ~20 行。🔔 现在。
3. **Project Gate 顺序修正**：具名已有项目切换判断**前置**于 meta-verb 审计豁免。落点 `route-guard.mjs:144` 附近。effort ~10 行 + test:routes 用例。🔔 现在（已与 SC-20260523-002 冲突）。

**P1 — 真实缺口（低成本高确定）**
4. **post-edit.mjs 加测**：在 `test-hooks.mjs` 加 matcher+自增用例。落点 test-hooks.mjs。effort ~30 行。🔔 现在。
5. **secret-scan 修正则 + 接 CI**：`sk-ant-[A-Za-z0-9-]{40,}` 等覆盖现代格式；把 `.githooks/pre-commit` 逻辑加进 ci.yml。落点 `.githooks/pre-commit` + `.github/workflows/ci.yml`。effort ~15 行。🔔 现在。
6. **route-guard state 读取包 try/catch**：对齐其余 6 处。落点 `route-guard.mjs:551-552`。effort ~3 行。🔔 现在。
7. **fusion-preflight gate-6 去硬钉 Sonnet**：emit `--skill-tier` 提示。落点 `scripts/fusion-preflight.py:28`。effort ~2 行。🔔 现在。
8. **删/改 verify.sh S7**（冗余 grep）+ **sources-registry 数 25→26**（或动态）。effort 各 ~1-2 行。🔔 现在。

**P2 — 硬化（多为低，可批量或随手）**
9. context-budget 上界守护（CLAUDE.md/SKILL.md）｜10. model-routing.yaml 纳入 lint:yaml｜11. verify.sh 加 shared-head.html 检查｜12. skills-lock 重算或移除 + 供应链门禁｜13. "4条件"标签改 5 + 修 AGENTS.md 自相矛盾｜14. daily_governance 加"连续 N 天 digest 缺失"升级｜15. references/SKILL.md 补 FILE_END 或显式豁免｜16. MULTI_SKILL hint 换标签。

**watch-item（先查证再动）**：PostToolUse matcher `Task` vs CC 现 `Agent` 是否漂移（→ post-edit 是否在 Agent spawn 触发）。需行为级核验，未确认。

## 9. 证据缺口（受只读/环境约束未能核验，不当 PASS）

- 写盘路径未跑：`--promote-ready` 实写、`daily_governance` 端到端、build:self-model 写+还原（plan-mode 只读）——相关结论由门禁代码走查 + dry-run 推断。
- 行为级 A/B 是否真产出过 non-selftest 裁决：需 live 模型调用，未验。
- 多处崩溃窗口（truncate→write SIGKILL、并发 lost-update、route-guard:552 throw）为**机制级证明**，未做确定性窗口复现。
- 场景 A/B/C/D 真值：episodic 无 scene 字段，"四场景从未行使"是字段缺失的强推断（历史或在 workflow-state.yaml，已 deactivated）。
- run-log 遥测为空，L3 "哑火"结论非器械级；token 数为字节估算（无 tokenizer）；CI 行为/AGENTS.md 非注入为静态/惯例推断；全 git 历史 secret 扫描超时（仅核 tracked + 近 60 commit 干净）。

## 10. 方法与局限（重要）

- Workflow 跑了 ~70 agent / 3.6M token：**baseline + 15 探针 + 全部对抗核验已完成并缓存**；但**综合写报告 + 独立 quality-gate 两阶段三次未完成**（先撞 session 限额、后两次 hang 在那个"单大 agent 处理全部"的脆弱步）。
- **本报告由主 agent 从缓存的对抗核验转录手工组装**（Plan B），分析数据零损失；但**未经独立 quality-gate 跑 AR-* 断言**。已手工补做 AR-07 只读纯净校验：`git status` 仅多出本报告 + findings.jsonl（+既有 M index.jsonl）。
- 修复一律 propose-only，本次对框架**零行为/配置/skill 改动**。

<!-- FILE_END: 2026-06-28-health-checkup -->
