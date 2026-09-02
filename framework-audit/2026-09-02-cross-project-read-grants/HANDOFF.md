---
topic: cross-project-read-grants
scene: N/A (framework-meta)
completed_at: 2026-09-02T19:48:13+08:00
gate_result: PASS
implementation_result: DONE_WITH_CONCERNS
criteria:
  - "[C1] 所有 MUST 对话需求都有架构、接口与可执行测试映射 → PASS（证据: TECH-SPEC.md §5-6，11/11）"
  - "[C2] 唯一写 binding 未被 read grant 扩展或替换 → PASS（证据: TECH-SPEC.md §3.2、§7）"
  - "[C3] Claude/Codex 两个真实 adapter 均有接口和负例 → PASS（证据: TECH-SPEC.md IF-004/005；EXECUTION-STANDARD.md U-005/006）"
  - "[C4] 执行范围具有稳定 U-ID、依赖图、BLOCKING 断言和 rollback → PASS（证据: EXECUTION-STANDARD.md §2-6）"
  - "[C5] 未把非文本/MCP 本地路径入口伪装成已覆盖 → PASS（证据: TECH-SPEC.md CONV-012、§8）"
---

# Handoff: tech-spec → implementation

## 决策（做了什么）

- [D-001] 单一写项目 + 显式临时只读引用 | 理由：分离归属与依赖 | 否决：全开跨项目读 | 状态：[ADOPTED]
- [D-002] grant 使用独立 sidecar | 理由：不污染 project identity | 否决：修改 binding schema | 状态：[ADOPTED]
- [D-003] turn 默认、session 明示 opt-in | 理由：最小权限 | 否决：永久白名单 | 状态：[ADOPTED]
- [D-004] Claude 用 native path tools，Codex 用 typed broker | 理由：不猜 Bash 副作用 | 否决：cat/rg allowlist | 状态：[ADOPTED]
- [D-005] 本期只承诺文本文件/目录 | 理由：未 hook 的二进制/MCP seam 尚未证明 | 否决：泛化宣称 | 状态：[ADOPTED]
- [D-006] runtime 执行绑定 U-001..U-008 | 理由：多 Phase 守卫改动需 exact authority | 否决：直接散改 | 状态：[ADOPTED]

## 约束（下游必须遵守）

- `.session-project-*` schema、唯一写 binding 和共享 docs/state/topic 重定向不得改变。
- grant issuer 只能是 UserPromptSubmit；agent shell 不能创建、续期或扩权。
- grant 不允许 Write/Edit/apply_patch/raw Bash、PROJECTS_ROOT 宽搜或控制平面路径。
- 任何 grant/broker 异常只关闭跨项目读，不影响当前项目旧路径。
- 不在未授权情况下 commit、push、部署、切换项目或修改计划外文件。

## 风险（下游需要注意）

- 自然语言路径提取可能误把“提及”当“授权”；必须使用严格指令和负例。
- Codex broker exact argv 若被 adapter 改写，不能退回 raw Bash，须 delta replan。
- 图片/PDF/MCP local-path 工具不在文本 MVP，rollout 文案不得 over-claim。

## 待澄清（Deferred，下游须追踪）

- 是否在后续版本为图片、PDF 和 MCP referenced paths 增加受控 projection/broker adapter。

## 产出路径

- 主产出：`framework-audit/2026-09-02-cross-project-read-grants/TECH-SPEC.md`
- 附属产出：`framework-audit/2026-09-02-cross-project-read-grants/EXECUTION-STANDARD.md`

## AI Native 判断（如适用）

- 范式：无；这是本地 harness 权限与项目身份能力。
- 影响的状态：session read-grant sidecar，不进入 workflow state。

## Runtime acceptance

- Grant module: `14/14` PASS，包括 delayed Stop generation CAS、lexical traversal 与残留事务锁 fail-closed。
- Project scope: `102/102` PASS；kill-switch 模式同为 `102/102` PASS。
- Codex adapter: `29/29` PASS；route guard: `212/212` PASS；project transaction: `28/28` PASS。
- `npm run check:hooks`、`npm run check:agents-parity`、Codex static wiring 全部通过。
- 全仓 `scripts/verify.sh`: `85 PASS / 1 FAIL / 1 WARN`；唯一 FAIL 是范围外 ShareDev handoff
  缺 `gate_result`，本任务未修改该下游项目文件。
- 独立规格与 Standards 实施复审结果记录于本次会话 eval ledger；提交前必须为 PASS。
