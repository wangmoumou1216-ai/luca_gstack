# 原型交互说明：两个会话的深度复核

日期：2026-10-06。范围：源会话「实现原型交互说明能力」`01a105fc-f0d9-76c3-9317-c396321dd49c` 的全部 60 个 turn（六页，hasMore=false），本接手会话的全部已完成/中断 turn、原冻结规划六件套及 PR #24 的 111 文件改动。只读框架范围 NO_PIN。会话原文摘录及运行详细证据保留本目录本地文件，不发布私人会话原文。

## 结论

存在真实交付与功能缺陷，不能用此前全量门禁通过推导“没有问题”。我上一轮选错了最终 HTML：原会话最后报告 compact-03，我发布了 compact-02；共享代码与下载产物不一致。独立浏览器检查还发现取消编辑没有取消重绑。两项已修复并通过定向回归；最终独立闭合与 Git 回执见本文末尾。

用户在本会话表示产品工作已完成，并授权提交、发布、推送和拉回。应继承该决定，避免反复索取相同确认；它不构成原计划所有测试已运行的证据，也不自动生成 exact-SHA 的原生验收票。

## 发现与处置

| ID / 严重性 | 实证问题 | 归属与处置 |
|---|---|---|
| F1 / Important | 最后源汇报 turn `01a10e43-fa07-7820-8b76-e9745da050a3` 指向 compact-03 / `20b2ba07…`；PR #24 和本会话上一条最终答复指向 compact-02 / `0efa5a9f…`。生产 `extractNotes` 对 02 返回 `UNKNOWN_VERSION`，对 03 返回成功。 | 本接手会话选版错误。保留旧件作为历史；以 03 的同业务源和说明为基础生成修复版 04。新增 release.json 与直接驱动交付 HTML 的检查。 |
| F2 / Important | `runtime.js` 的 `confirmTarget` 提前执行 rebind 事务；随后取消编辑只清空草稿。独立 Chromium 实测 anchor 从 `#tab-projects` 变为 `body > div.app`，revision 6→7。原核心 63/63 全绿仍漏掉此路径。 | 原实现缺陷。重绑只修改 buffer，已有 save 通过唯一核心事务提交。回归先 RED，修后 Chromium/Firefox 取消、非法编辑+Esc、保存、离线重开均 GREEN。 |
| F3 / Important | 原 current-state 的当前 HTML 为 02、专业审查为 deep-audit-04；最新实际报告为 03/deep-audit-08。accepted_percent=89 与 progress_percent=78 并存；progress.md 顶部仍写 33%；publication 仍写未开始。 | 原会话状态漂移，本接手会话未及时对照最新消息。原状态完整备份，建立简明当前记录与历史指针，更新 progress 顶部；发布身份由 release.json 和可运行检查绑定。 |
| F4 / Important / 未闭合 | U008 在源会话最终报告仍为 UNKNOWN；真实接收者复述、OS 中文 IME、浏览器原生缩放、三种真正 Codex 生命周期、同版四角色冷审未齐。上一轮虽披露缺口，却称“最终原型已获确认”，没明确具体版本判断失败。 | 修正完成口径：用户产品采用与发布授权有效；原冻结计划整体 DONE 不成立。不能把当前两轴代码评审计作原四角色或三种宿主调用。 |
| F5 / Minor | deep-audit-08 的 Markdown “真实业务源”SHA 写错；其 current-artifact.json 与实际源文件为 `ca2748d4bd3f36788940067134b49fa707696b5aefd49d84bb94c977990ce7f3`。 | 保留原历史报告，本文与 release.json 使用实算值，后续不从历史 prose 抄指纹。 |
| F6 / 流程问题 | 用户已明确“将近15个小时，必须收紧执行”；源会话有大量重复阶段汇报、状态反复和当前/历史记录混杂。本接手会话发布前还出现缺测试样本、缺 Firefox 的两次 CI 失败。 | 前者不能简单断言所有返修冗余（有真实反例）；后者已在 PR #24 修复。当前沿用有限范围、已有测试和两个冷审轴，只对实证缺陷补回归；不另建产品方案或重做已接受单元。 |

### 用户变更必须覆盖旧计划

- 用户明确排除 Claude 验证；状态为 NOT_RUN_BY_USER_INSTRUCTION，不继续消耗 Claude token。
- 项目管理为 AI 唯一生成范围；原两条人工说明保留。
- 仅确需适配浏览器宽高的大模块写有来源的布局/适配；不逐控件猜断点。
- 平铺列表、逐条编辑、底部新增/下载；删除筛选、删除列表、编号开关、全局编辑、重复标题/分割线、持续长失效说明。
- 用户三张截图中第三张明确指向“原型观察/原型已演示”徽章和“来源与区域”折叠区，要求删除。不能因冻结计划旧文要求说明依据而恢复这部分 UI。待确认、未演示和实际差异的风险语义需另行保持准确。

## 原九单元真实状态

以下为历史接受记录，不表示本次重新完整验收每一个单元。原冻结主计划中的 PLANNED 是当时计划，不修改为伪造历史 DONE。

| 顺序 | 单元 | 实际落点和证据 | 当前判断 |
|---|---|---|---|
| 1 | U001 内容/数据合同 | contract、schema、content-guidelines；progress 历史原判官复审 6/6 | 历史已接受 |
| 2 | U002 真实样本薄纵切 | 真实 OD 部门工作台、离线双轮、事件隔离；历史 68/68 与 6/6 | 历史已接受 |
| 3 | U003 校验/合并/组包 | core.js、prototype-notes.mjs；repair08 原判官 10/10，核心/双引擎证据 | 历史已接受；当前核心另跑 |
| 4 | U004 面板/定位/编辑 | runtime.js/panel.css；progress 的 U004 DONE 原 8/8，真实样本 80 操作 | 历史已接受；本次 F2 重新打开受影响的取消/保存路径 |
| 5 | U005 交付身份与派生链 | prototype-delivery helper/schema/runtime；cap-repair 原 6/6 | 历史已接受；不将旧票升级 |
| 6 | U006 OD/说明处理接线 | 原独立终票 6/6，caller 现由独立模块承接 | 历史已接受；PR #24 抽取后的 scoped 审查与测试另列 |
| 7 | U009 独立入口/注册 | canonical skill、aliases、input mode、注册测试；原 7/7 | 历史已接受；当前 11/11 注册合同只证明工程边界 |
| 8 | U007 持续验证/CI | verify、CI、browser/data/registration；原 8/8；PR #24 CI 修复 | 历史已接受；本次增加实际交付回归 |
| 9 | U008 最终真实使用/专家验收 | 当前 HTML、使用说明、专业报告有产物；真实人类/原生宿主/四角色最终证据不齐 | 原计划完整验收仍未完成 |

按原单元计为 8/9 历史接受（约 89%）；该百分比不代表剩余工时，也不能代表当前新版的全项验收率。

## 原需求 R01–R14 核对

| 需求 | 实现/证据落点 | 边界 |
|---|---|---|
| R01 专业交互细节 | content-guidelines、当前说明正文 | 真接收者五项复述未取得 |
| R02 侧栏/数字双向定位 | runtime、原浏览器定位用例 | 当前新增回归限编辑与交付路径 |
| R03 模块/UI 细节 | 有源内容与适用类型、布局规范 | 不能伪造未演示业务分支 |
| R04 AI 生成 | generation、scope/coverage/merge seam | 生成范围保持 project-management |
| R05 人工增改删绑 | 唯一核心事务与 runtime | F2 修复；既有历史/范围外人工测试保留 |
| R06 固定通用 UI | 唯一 runtime/CSS；后续用户精简意见 | 旧 UI 规范被用户指定变更覆盖 |
| R07 框架可执行 | skill/OD caller/注册/交付 helper | 自动工程测试不等同真实宿主消费 |
| R08 专家/红队 | 历史票、本次两轴冷审 | 原计划同最终版四角色尚未闭合 |
| R09 同一离线 HTML | release.json、extract、浏览器下载重开 | F1 已证实原发布错误并修复候选 |
| R10 调整完成后真实确认 | caller 的确认/阶段/来源门 | 用户已有业务基线确认；不可合成宿主票 |
| R11 UX 产品研究 | 原 research/review/decision 冻结材料 | 本次未重做无新疑点的调研 |
| R12 人对人写作 | 唯一规范与表单提示、短风险状态 | 语义接收者验证缺口如实保留 |
| R13 AI 局部/人工全域 | scope、merge、保留两条人工、范围拒绝 | 新版 notes 与业务源均不变 |
| R14 节点与形式 | 独立薄 skill、共享 core/runtime、OD 内部调用 | 三种真正 Codex 生命周期缺口仍存在 |

## 本次验证与独立审查

- 原冻结 diff：`d704734e…` → `6ec4559…`，111 files；manifest SHA `48c8b56ab97c5504e0da3c55effee08d4d9e4bb4df834de9b3cca050e6010242`。
- Standards 冷审：原生 quality-gate `01a10f3e-2a87-7d32-a115-a23c3df976ac`，invocation `30ee23b3-b594-480e-bd1d-0e1bd0a2ac54`，实际 completed/accepted。原票 FAIL 2/4；1 个 Important（F2），穷尽资源解析/全浏览器范围 UNKNOWN。真实核心 63/63 PASS 没阻止它发现 F2。
- 新发布回归：compact-03 取消重绑断言 exit 1；修复候选 compact-04 两引擎各五条行为均通过，且实际生产 reimport 成功。过期 runtime 反例返回 UNKNOWN_VERSION，恢复正确包后 PASS。
- 当前额外实跑：核心含 mutation 64/64；注册 11/11（48 个真实子进程）；既有双引擎 draft-context 用例 2/2；CI contract 含缺新 gate 反例 8/8。
- 详细命令、stdout/exit、浏览器下载与来源指纹在本地 `rebind-red.log`、`rebind-green.log`、`core/`、`registration.log`、`draft-context/` 等。全部浏览器使用测试自有实例并关闭；日志不充当原生 OS IME/zoom 证据。

## 当前检查点

R1/R2 已完成。Spec 原冻结票 CONDITIONAL_PASS 8/23，15 UNKNOWN，0 个确认缺陷。来源折叠区删除由用户截图授权；`differs` 风险提示是否显示仍未收到具体选择，未据“继续”默认新增 UI。

R3：Standards 原判官修后复核已实际 completed，eval `notes-session-standards-20261006-03`，6/7 CONDITIONAL_PASS。原 Important 取消缺陷闭合，11 文件前后指纹一致；真实 Chromium/Firefox 回归及 CI contract 8/8 通过。判官在自有隔离副本还原旧 runtime，现有测试准确失败于取消断言，再恢复新版 PASS。当前增量缺陷为 0；原完整审查/验收的 UNKNOWN 仍保留。新终票来自 native turn `01a10f63-7723-7ce0-b75e-e327bb007ddd`（2026-10-06T04:07:23.467Z），没有把原 invocation 的旧 accepted 冒充修后票。

Spec 修后原生独立票已完成，eval `notes-session-spec-20261006-02`，增量 PASS 8/8，确认 findings 0；11 文件前后指纹一致。13 条说明、2 条人工、AI 范围、原子保存、取消、双引擎离线重开及生产包一致性全部通过。按既定 R4 发布。先前账户额度中断属于历史停止，不再作为当前停止结论。当前修复尚未提交、推送、合并或拉回；最终 Git 与 CI 回执另保留本地 publication-receipt.json，并在用户完成汇报给出真实链接。

## 续点与保护

- 工作根 `/Users/luca/.codex/worktrees/ec43/luca_gstack`；分支 `codex/prototype-notes-review-fixes`；基线 `6ec4559f206445a5fccf3fdc9eac88d99b6f0658`。
- 冻结生产增量：fix-input.json SHA `566cc068828d32238a6b580b76981ea52a55e630332905fd3c33a5e0b35e8c89`，11 文件；当前交付 compact-04 SHA `d79346d7ef104a5e757f03cd7d3459e293e29955dc71952155e42435878e738e`。
- 剩余顺序：两轴修后票均已完成 → 精确暂存 → 正常提交完整钩子 → 隔离提交树验证 → push/PR/CI/合并 → Desktop main 快进拉回并核对保护日志。
- 不重新询问已有产品采用/发布授权。未答状态提示问题保留，原 U008 未验证项不伪造关闭。
- ec43 的 memory/evals/eval-log.jsonl 不提交；Desktop main 三份脏日志已记录发布前 SHA，其它无关文件不动。会话原文、截图、下载、native 票保持本地。

归因：F1 为本次选版错误（L1），上游状态混杂促成误判；F2 为自有共享 runtime 的确定性缺陷，已修源头；交付检查遗漏在现有 verify/CI 中补齐。原历史记录与验收缺口均保留。
