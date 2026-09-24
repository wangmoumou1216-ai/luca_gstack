# 交互注解层：评审与执行握手

> 日期：2026-09-18  
> 范围：luca_gstack framework/meta，`NO_PIN`  
> 状态：`HANDOFF_READY`  
> 来源：`/Users/luca/Desktop/交互注解层-执行交接方案.md`  
> 基线 HEAD：`cbbbcbc461153849a6783eec21071e747e3401f5`

## 1. 评审结论

原执行交接方案**不能原样执行**，需要以本文件的修订计划替代。

阻断证据：

1. 原方案声明 `open-design >= 3.4.0` 即失效；当前
   `.claude/skills/office/open-design/SKILL.md` 为 `4.0.0`。
2. 当前 `AGENTS.md` / `CLAUDE.md` 是精简 root adapter，技能发现真值已经迁移到
   `skill-visibility.json`、生成 catalog、input modes、model routing 与 native aliases；
   原方案要求维护旧隐藏名单会产生第二真值。
3. `figma-layer` 已是 `retired-unavailable`，不能作为 clean HTML 的消费方或验证 owner。
4. 原薄壳缺少所有 skill 必须保留的 `FILE_END`。
5. 原方案把 runtime 与注入逻辑留给每次运行临时生成，无法稳定证明幂等、区块外零 diff、
   XSS/CSP 安全、revision 冲突与 strip round-trip。
6. 当前 worktree 有用户/并行任务的无关修改，不能创建吞入这些修改的基线提交，也不能要求
   `git status` 全局干净。

当前只读基线：

- `node scripts/controlled-change.mjs inspect` → `kind: inactive`
- `node scripts/check-registration-sync.mjs` → PASS
- `node scripts/check-routing-map.mjs` → PASS
- `node scripts/check-agent-contracts.mjs` → PASS（52/52）

## 2. 架构裁决

采用独立的隐藏/on-demand `interaction-notes` skill；`open-design` 只增加条件指针，不承载
注入流程。

理由：

- 能力作用于**已选定、已落盘的 HTML 原型**，来源可以是 Open Design、html-prototype 或其他
  合法生成器，不属于 OD stage/run/recover 本身。
- 它有独立的注入、编辑、重锚、校验、剥离生命周期，塞进 open-design 会造成 sprawl。
- 用户必须明确表达“加交互说明 / badge / 标注交互逻辑”才匹配；不得主动推荐或自动注入。
- Hidden/on-demand 通过生成 catalog + native alias 被两端发现，不新增一级 command，
  不修改 root adapter，也不写 routing-map 关键词入口。

保持 M1 边界：不实现 Shadow DOM、侧栏内新增/删除、锚点拾取器、指纹自动重定位和精细视觉。

### 2.1 固定模板复核结论

模板采用**一个统一的 runtime + 一个统一的中性 UI**；每个新 HTML 只提供注解数据与锚点，
不重新设计侧边栏。经逐条复核，原规格需要以下修正后才满足“跨原型一致、宿主布局零位移、
浏览器可编辑、可剥离”的要求：

1. 原规格的“badge `appendChild` 到锚点并强制 `position:relative`”会修改运行中的宿主布局，
   对 flex/grid/table/SVG/替换元素不安全。M1 改为 body 末尾的独立 overlay root；badge 根据
   `getBoundingClientRect()` 投影到锚点附近，绝不修改锚点 class、style 或子节点。
2. 原规格只有“侧栏 + badge”，没有定义二者联动。固定为：badge 点击后打开侧栏、激活并聚焦
   对应条目；侧栏条目点击后滚动到锚点并做一次短暂中性描边。编辑态点击不触发导航。
3. 原规格没有窄屏行为。固定为：桌面是右侧 overlay panel，宽度
   `clamp(320px, 28vw, 420px)`；窄屏（≤768px）变为底部/右侧 drawer，默认收起，只保留总开关，
   不永久遮住主内容。
4. 原规格缺少可访问性与焦点合同。模板必须有 `aside`/`aria-label`、原生 `button`、可见焦点、
   键盘 Enter/Space、Escape 退出编辑或收起面板、状态文字而非仅靠颜色；遵守
   `prefers-reduced-motion`。
5. 原规格没有多 badge 与失效锚点的确定行为。同一锚点按稳定 ID 排序并错位排列；
   `invalid/drifted` 条目置顶、显示状态文字且不渲染漂浮 badge；`visible:false` 数据保留但
   badge 和条目都不渲染。

### 2.2 IA Template v1（执行真值）

固定结构：

- `overlay root`：唯一、带 `data-ia-root="1"`，位于 `body` 末尾；所有 class/id 以 `ia-` 前缀命名。
- `global toggle`：始终可发现；控制 panel 与全部 badge；`?notes=off` 初始为关闭。
- `panel header`：标题“交互说明”、条目计数、总开关/收起按钮。
- `conflict banner`：仅 revision 冲突时出现，操作固定为“复制草稿 / 丢弃草稿”；没有自动合并。
- `items list`：失效项在前，其余按稳定 ID；每项包含编号、title、note、状态文字、编辑按钮。
- `badge layer`：独立于宿主 DOM；badge 点击与对应条目双向联动。
- `draft actions`：编辑态只有“保存草稿 / 取消”；保存只进 localStorage 或内存降级，标记“未落盘”。
- `export action`：“复制改动 JSON”；clipboard 不可用时展示可选择的 JSON 文本，不虚报成功。

固定视觉：

- 中性色，不读取或覆盖宿主设计 token，不出现品牌橙；使用一套 `--ia-*` 私有变量。
- panel、badge、焦点、警告、草稿五类状态视觉固定；不得按每个原型重新生成 CSS。
- 不使用 Shadow DOM（M2）；通过 `ia-` 命名空间、元素级选择器和 overlay 隔离。
- 所有文案使用 `textContent`；runtime 不产生网络请求，不加载字体、图标库或其他依赖。

每个 HTML 唯一需要重新生成的内容：

- `schema`、`revision`
- 每条 `id / concept / title / note / anchor / visible`
- selector 的唯一命中验证与 badge 的实时坐标

完成判据：同一份 runtime asset 在两份结构完全不同的合成 HTML 上，侧栏结构和视觉 token
字节一致；仅投影 JSON 与运行时 badge 坐标不同。

## 3. 前提门与 kill assumptions

- **该不该解**：该解。真实缺口是给已交付 HTML 叠加可回收、可验证的交互说明，不是扩张
  OD 生成能力。
- **更小替代**：只在 open-design 增加一段 prose 不足以保证跨生成器复用，也不能给注入/剥离
  提供确定性与安全边界。
- **默认形态偏差**：独立 skill 偏向复用；独立终验必须反向检查“是否其实只需 OD 内一条指针”。

Kill assumptions：

- `KILL-1`：日常目标必须是用户已选定的、可写的本地 `index.html`；多方案未选时停止。
- `KILL-2`：能力需要跨生成器复用；若用户裁定 OD-only，则撤销独立注册方案。
- `KILL-3`：严格 CSP 不允许被自动删除、放宽或加入 `unsafe-inline`；探针确认不兼容时 BLOCKED。
- `KILL-4`：执行前冻结目标文件与既有 dirty 文件 preimage；发生重叠或无关 preimage 漂移即停止。

## 4. 执行范围

允许新增或修改：

1. `.claude/skills/office/interaction-notes/SKILL.md`
2. `.claude/skills/office/interaction-notes/REFERENCE.md`
3. `.claude/skills/office/interaction-notes/assets/interaction-notes-runtime.js`
4. `.claude/skills/office/interaction-notes/scripts/interaction-notes.mjs`
5. `scripts/test-interaction-notes-skill.mjs`
6. `.claude/skill-os/skill-visibility.json`
7. `.claude/skill-os/input-modes.yaml`
8. `.claude/skill-os/model-routing.yaml`
9. `.claude/skill-os/codex-viability.yaml`
10. `.claude/skill-os/generated/skill-catalog.md`（仅生成器写）
11. `.claude/skill-os/evolution/self-model.generated.yaml`（仅生成器写）
12. `.claude/skills/interaction-notes`（指向 canonical skill 的 symlink）
13. `.agents/skills/interaction-notes`（指向 canonical skill 的 symlink）
14. `.claude/skills/office/open-design/SKILL.md`（`4.0.0 → 4.1.0`，仅条件指针）
15. `package.json`（增加窄测试入口）
16. `scripts/verify.sh`（接入阻断测试）
17. 本文件的状态与验证回填。

明确禁止修改：

- `AGENTS.md`、`CLAUDE.md`
- `.claude/skill-os/optional-workflow-graph.yaml`
- `.claude/skill-os/skill-routing-map.yaml`
- 任何 `figma-layer` 路径
- 现有 `memory/retrieval-log.jsonl`
- 其他既有 `framework-audit/*`
- 任意下游项目、共享 `docs/`、workflow-state、current-topic

本握手不授权 Git stage、commit、push、reset、revert 或外部发布。

## 5. Phase 计划

复杂度：`Supervisor`；外层 Sequential，末端独立 Quality Gate。用户批准后才可进入 Phase 0。

### Phase 0 — 冻结范围与前像

- 重跑 controlled-change inspect。
- 记录 HEAD、目标文件 preimage、既有 dirty 文件清单与 SHA；不要求全局干净。
- 若目标文件与既有 dirty 集重叠，或出现非 inactive witness，停止并报告。
- 不创建基线 commit。

### Phase 1 — Canonical skill 与确定性实现

- 写短薄壳；description 明确“用户显式意图才调用”，正文指向同目录 `REFERENCE.md`，末尾带
  `FILE_END`。
- reference 固定数据合同、概念锚确认、双轨编辑、重锚、strip、失败姿态与完成条件。
- runtime 为固定 asset，严格实现 §2.2 `IA Template v1`；所有用户文案只走 `textContent`，
  不使用 `innerHTML`，且不得修改锚点元素的 style/class/children。
- CLI 实现 `inject / validate / merge / strip`：
  - 最多 5 条；exactly-one bounded marker；canonical JSON；危险字符转义；
  - 重复 inject 字节级幂等；区块外逐字节不变；
  - revision 冲突拒绝自动覆盖；
  - localStorage/clipboard 异常诚实降级；
  - CSP 不兼容只报告 BLOCKED；
  - strip 生成明确的 clean 副本，round-trip 恢复原 HTML。

### Phase 2 — 行为测试与安全变异

- 全部 fixture 位于系统临时目录，不访问任何项目产物。
- 覆盖首次/重复注入、合并、删除、显隐、strip、坏 marker、缺 `</body>`、第 6 条、恶意
  `</script>`、错误 selector、旧 revision、storage/clipboard 失败和严格 CSP。
- 用 Playwright 跑两份 DOM/CSS 结构不同的合成页：固定模板一致性、badge overlay 与双向联动、
  宿主节点零属性/子节点变化、响应式 drawer、键盘/focus、总开关、编辑草稿、复制降级、刷新后
  revision 行为。
- 变异删除转义、放宽 badge 上限、关闭 revision 检查后，测试必须转红。

### Phase 3 — 当前注册面与 OD 窄集成

- 把 skill 登记为 `Hidden/on-demand`，增加 standalone input mode、`guided-execution` 档位和
  Codex viability；不加 routing-map 项或一级 command。
- 建 Claude/Codex aliases，运行生成器更新 catalog 与 self-model projection。
- open-design 只在回收交付后的提示处增加条件指针并升 `4.1.0`；未点名时 Phase 0–6、
  stage/run/recover 权限和完成语义保持不变。

### Phase 4 — 回归与独立终验

- 运行新增测试、registration/routing/agent-contracts、agent-context、model/codex viability、
  alias parity 与全量 `npm run verify`。
- 分别给出 Claude 与 Codex 的 discovery、invocation、degradation 证据；一侧只有 prose 时不得
  声称 parity。
- 独立 reviewer 以默认 REFUTE 检查：独立 skill 是否过度、未点名路径是否变化、是否触碰
  禁止范围、是否有伪安全/伪完成。
- 回填本文件状态与证据；用户侧新会话/桌面浏览器人工半场未做时，只能
  `DONE_WITH_CONCERNS`，不能写整体 DONE。

## 6. 阻断断言

```bash
# [BLOCKING] IA-01 — canonical skill 与 FILE_END
test -f .claude/skills/office/interaction-notes/SKILL.md &&
grep -q 'FILE_END: interaction-notes/SKILL.md' .claude/skills/office/interaction-notes/SKILL.md

# [BLOCKING] IA-02 — runtime、CLI 与行为测试
node --check .claude/skills/office/interaction-notes/assets/interaction-notes-runtime.js &&
node --check .claude/skills/office/interaction-notes/scripts/interaction-notes.mjs &&
node scripts/test-interaction-notes-skill.mjs --all

# [BLOCKING] IA-03 — 当前三项基线不得回归
node scripts/check-registration-sync.mjs &&
node scripts/check-routing-map.mjs &&
node scripts/check-agent-contracts.mjs

# [BLOCKING] IA-04 — 生成投影与双 harness registry
python3 scripts/build-agent-context.py check &&
node scripts/build-self-model.mjs --check &&
node scripts/check-codex-viability.mjs &&
node scripts/check-agents-parity.mjs

# [BLOCKING] IA-05 — root/graph/routing/退休入口零改动
git diff --exit-code -- AGENTS.md CLAUDE.md \
  .claude/skill-os/optional-workflow-graph.yaml \
  .claude/skill-os/skill-routing-map.yaml &&
! git diff --name-only | grep -q 'figma-layer'

# [BLOCKING] IA-06 — 全量框架回归
npm run verify
```

质量 criteria：

- `[C1]` canonical skill 唯一；open-design 只含条件指针，无复制流程。
- `[C2]` 重复 inject 字节不变，strip round-trip 恢复原 HTML，区块外零 diff。
- `[C3]` 恶意文案不执行；CSP/storage/clipboard/revision 失败均诚实阻断或降级。
- `[C4]` Claude 与 Codex 有独立证据，不借用另一端成功记录。
- `[C5]` 未触碰 root adapter、workflow graph、routing map、figma-layer 和既有 dirty 文件。
- `[C6]` 未点名交互说明时 open-design 原流程行为不变。
- `[C7]` 两个异构 HTML 复用同一模板资产，UI 结构/token 一致且宿主锚点 DOM 零修改。

## 7. 失败策略

- 任一 BLOCKING 失败：停止当前 Phase，不进入下一 Phase。
- 行为测试连续两轮仍失败：只对原 U-block 做 delta replan，不扩大文件面。
- CSP 阻断：不删 CSP、不加 `unsafe-inline`、不伪造兼容。
- localStorage 不可用：降级为当前页内存草稿 + JSON 导出，不宣称持久化。
- clipboard 全路径失败：展示可选择 JSON，不宣称复制成功。
- 任一 harness 无独立 live evidence：最多 `DONE_WITH_CONCERNS`。
- 既有 dirty 文件 preimage 变化或出现 allowlist 外写入：立即停止。

## 8. 握手载荷

批准语：

> **批准按 `framework-audit/2026-09-18-interaction-notes-review-handshake.md` 的精确范围执行；不授权 Git stage/commit/push 或外部发布。**

收到这句批准后，才进入 Phase 0；任何旧方案中的批准不自动迁移到本修订方案。
