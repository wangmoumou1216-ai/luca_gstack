# 融合运行手册（FUSION RUNBOOK）— 人工触发，每候选

> 演进 digest 是 **propose-only**。用户选定候选后按已批准的有限合同执行。
> 内容改动、真实能力验收、发布分别留证；静态绿灯不能替代原生行为证据。

## 红线与权威

- 框架维护保持 **NO_PIN**；`framework/` 为只读参考。产品设计约束只来自已确认项目和用户。
- 当前已确认项目的品牌敏感外部材料仍按 `observability/rules.yaml` 注入并用 blockquote 标明，不能写进 route-guard；SKILL.md P1-P7 不变量继续保护。
- 候选 worktree 是编辑对象。Htest 前从已授信正式框架启动，不把候选当作原生运行根。
- 来源/方法 ID、gain/preservation 口径和独立 oracle 在实施前冻结。失败后不能把 gain 改成 preservation。
- `model-routing.yaml` 顶层 common 政策是当前原生模型选择权威。使用当前 common native type/角色，禁止以固定模型别名或 model/effort 等价推定采用。
- 同一时刻最多一个运行中 subagent。前一位真实 completed 且**同次调用 accepted** 后再派下一位；producer 自报不构成真实采用证据。角色由当前 adapter 解析，effort 属于用户，不改私有 binding。
- `behavioral_ab.py extract/judge` 只作 **mechanical-only** 投影：文本差异仅称 **text delta**，regex 保持也只是文本检查。机械 PASS 不证明技能能力提升；最终行为判定由独立判官依据真实原生轨迹作出。
- 其他手册的历史模型、并发或提取配方不能覆盖当前 model-routing、个人串行及原生批准权威。

## 九步管线

| # | 阶段与步骤 | 工具或证据 | 通过条件 |
|---|---|---|---|
| ① | 内容：审批前只读取证 | 影响分析、实际 HEAD/远端、有限路径与 preimages、保护例外、资源所有者 | 仓库外 H0 清单可审阅；尚不建 worktree、不改源码或安装 |
| ② | 内容：真实 H0 后隔离 | 核验并复用适合的受管理 worktree；不存在才按合同调用 `create_worktree` | 真实 H0 覆盖具体编辑、局部验证、候选提交/推送及草稿 PR；精确仓库身份已绑定 |
| ③ | 内容：串行实施 | 当前 U 的受控 manifest、精确 patch/preimages/postimages；reuse_mode 对应唯一 owner | 只写有限目标，保存用户及其他会话工作；不扩大来源/方法口径 |
| ④ | 内容：局部静态与契约门 | 当前 U 声明的离线检查；本评估器 `unittest` 和 `selftest` | 静态/机械证据与未来原生行为 PENDING 分开；H0 不包含正式安装或全量运行副作用 |
| ⑤ | 内容：冻结同一候选 | 单一候选提交 C、tree T、digest D；普通候选分支 push、面向 main 的草稿 PR、该 C 的 Required Checks | 基线未漂移、批准范围匹配；安装和真实行为尚未宣称 PASS |
| ⑥ | 能力：真实 Htest 后原生 A/B | 精确 C/T/D、基线对齐/安装/fixture/全量门副作用与恢复清单、维护窗口；独立行为 oracle | baseline 与 candidate 分阶段真实运行；逐目标证据齐全、无 UNKNOWN、gain/preservation 按冻结口径判定 |
| ⑦ | 能力：独立实现专家与红队 | 完整冻结 diff 与真实回执；当前角色政策，逐位完成并核实同次 accepted | 最终合同要求的实现审查完成；不把制作、自审或机械 PASS 当独立实现验收 |
| ⑧ | 发布：真实 Hpublish 后落地 | 同一已验收 C/T、当前 PR/CI、恢复验证、资源窗口、远端基线读回 | 对具体普通快进发布取得批准，`git push origin <C>:refs/heads/main`；不生成未验收的新提交 |
| ⑨ | 发布：反馈与可达性 | 本批来源 pin/consumer、真实发布/安装回执、FM-11 原生 smoke | 已采用能力实际可达；仅按授权写追踪记录，不提前写收益或 PASS |

写 skill prose 前读取 `skill-authoring.md` 与 `skill-invariants.md`。项目 gate、长会话、受控变更、原生 harness 和当前最终合同持续有效。

### Htest 的两 arm 与全量门

1. 冻结实际已发布基线 M、旧个人安装和候选 C。基线漂移须记录具体 delta 并取得对应批准；本批原封版 M0 仅作历史计划基线，已批准实施 delta 的实际基线为 M1。
2. Htest 单独批准运行根的基线对齐、候选安装、官方 guard/trust、测试项目/fixture、本机依赖或缓存及 `npm run verify` 的副作用。H0 清单/批准不代替这项授权。
3. 用健康、已授信基线启动**全新原生 baseline sessions**；baseline 只读实际 M/旧安装。允许正常文件读取以执行真实技能，不再使用“baseline 禁文件读”的旧配方。
4. 结束全部 baseline sessions，按合同正常停机并切到候选，再启动**全新原生 candidate sessions**；candidate 读实际 C/候选安装。两 arm 不共享 live 编辑，固定输入、来源身份及 oracle，保留各自真实轨迹。
5. 原生 evidence 必须绑定实际来源 C/M、运行根、调用和真实采用/完成。缺回执、工具缺失、原生调用失败或任何第三态记 **UNKNOWN/BLOCKED** 并阻断比较，不能计作 baseline FAIL 或 candidate PASS。
6. `extract` 的 JSON fixtures 可作为输入材料；`judge --skill-tier <当前定义的 tier>` 支持 `core-execution`，校验非空唯一 ID、相等集合、有效 regex 和 text delta。`--model` 是调用者元数据，不能校验真实采用。不同字节、等价行为不构成 gain。
7. 全量 verify 的依赖缺失不是 PASS；先列明准确安装/缓存影响，按 Htest 范围处理。保留其他运行根、个人学习记录及维护者工作。

## 落地陷阱与采纳验收（FM-10 / FM-11）

**FM-10（deletion-type WIP）**：抽离前先核对目标文件的 WIP 性质与 owner。删除/精简型 WIP 中，整文件恢复再 reapply 会复活已删行；只对本批已批准、可验证的 hunk 作外部备份和精确抽离。发现用户或其他会话 WIP 时保留它，另用隔离候选；不默认 stash、覆盖或清理。

**FM-11**：「记录采纳 ≠ 能力可达」。每个能力须在 Htest/Hpublish 授权的原生运行根验证对应场景能否实际路由/调用：

- skill：路由 `invoke` 接线、真实 route-guard surface 和实际调用证据；框架维护会话仍保持 NO_PIN，不伪造项目 pin。
- MCP/tool：真实 session-connect、引用和调用证据。
- 缺证据标 orphan/NOT-DONE；by-design 不可独立调用者显式登记唯一 consumer 和豁免理由，不能伪造独立安装包。
- install/refresh 的来源追踪按合同更新 `external-skills/installed-pins.yaml`，watch_sha 来自 source directory 的实际最后变更；原生状态在真实验收前保持 PENDING。

## 恢复与发布边界

- **禁止 `git reset`、强推或重写 main 历史。** 未提交的本批候选改动只能依据 manifest、外部 preimage 备份和第三态检查精确恢复；不触碰其他工作。
- 已发布改动只用用户批准的普通 `git revert <commit>`，保留历史；dirty tree 先核对并保存各 owner 工作，不默认 stash 或整树清理。
- 安装恢复按 Htest 精确文件合同/官方 guard-trust 流程；永久基线对齐后的恢复目标仍是已批准 M，不能退回旧 E0 重写历史。不得回放整份全局配置。
- Hpublish 前读回远端仍为批准基线，发布只能是同一已验收 C 的普通快进。远端前进、分叉、保护规则拒绝或权限不足时停止，不能 force/admin/bypass，也不能换成产生未验收提交的合并方式。
- 采纳后真实质量回归，保留原证据并提交有范围的复盘/恢复请求；历史失败票不改判。

## 隐式耦合清单（FM-6，每次检查实际范围）

- 当前 common model_routing、native_agent_types、公共角色与同次真实采用回执；不以历史 alias 或 effort 快照替代。
- `observability/rules.yaml` 的 skill scope 与调用接线；改名不能造成孤儿。
- 路由、input-modes、workflow graph、目录/入口与当前 root adapter 的适用合同，生成面按有限清单同步。
- `framework/` 只读、SKILL.md P1-P7、当前已确认项目的设计约束、保护例外与其他会话占用。

<!-- FILE_END: FUSION-RUNBOOK -->
