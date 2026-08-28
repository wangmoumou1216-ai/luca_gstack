# Completion Review — Previously Unfinished Items

状态：`DONE_WITH_CONCERNS / NEED_FIRST_COMPLETION_VERIFIED`
日期：2026-08-28
原始执行前计划 SHA-256：`13b7b9e841cb063a3e843dad89414527aa22cad52604f938e96c6b43075bfde8`
终局计划 SHA-256：`234c1bbeed9b6bfd85e62c095831a15691f51915b015fe1423a2e7153ae007c7`
范围：framework meta / `NO_PIN`。

## 1. Need-first 裁决

| 项 | 当前事实 | need 裁决 | 本轮处置 |
|---|---|---|---|
| `FINAL-OPP-01` cross-harness semantic / obligation evidence | 当前实盘为 35 个同源 projection + 1 个 source-declared MagicPath delegation；增强 checker 与 31 个 mutation/negative-control fixture 已落地 | **NEED（收窄）** | **IMPLEMENTED / VERIFIED_WITH_RESIDUAL**：从现有 skill/graph 权威源派生 canonical projection；不新建第二 catalog。证明静态指令与 gate 语义闭合，不宣称 runtime 模型执行被机械强制 |
| `FINAL-OPP-02` 通用 least-authority profile | `.codex/workflow-runner.mjs` 已实现 opt-in `-C <scratch> + workspace-write`；静态 18/18、runtime 21/21；真实 Codex probe 显示 scratch 写成功，仓库/母版 memory/person memory/IPC 四处写均 `Operation not permitted` | **NOT_NEEDED_AS_NEW_PROFILE** | 不新增 profile/router。保留现有 runner 隔离；profile 选择不绑定 route/identity |
| Native quality-gate mechanical read-only | role TOML 明确继承 parent permission；verdict/recorder 已分权，但 native child 仍可获得父写面 | **DEFER** | 当前没有 judge 改写产物的实证；通用隔离 wrapper 会让需要运行测试的 Free Task assertions 产生写入假阴性。重访条件：出现一次 judge 写入/污染，或 Codex 提供 role-level sandbox |
| GitHub branch protection | 设置前 `main` 为 `404 Branch not protected`、rulesets 为 `[]`；精确 SHA 的 `Required Checks` 随后成功 | **NEED** | **COMPLETED / READ_BACK_VERIFIED**：只要求 `Required Checks`，`strict=true`；`enforce_admins=false`，无 PR review、restrictions、linear-history 或 conversation-resolution 要求 |
| Remote CI actual run | `644918028f75fd9c1c8c33107d808814fd198272` 的 run `33165797050` 全部成功，含稳定 gatherer `Required Checks` | **NEED** | **COMPLETED**：失败 run `33163664368` 暴露 Node 20 与 `html-validate@11.10.0` engine 不兼容；`6449180` 对齐 Node 24 并增加无报告诊断与负控后远端转绿 |
| Execpolicy projection | 仓内无 execpolicy；`careful` 权威行为是 `permissionDecision:"ask"` + 人类 override；never/noninteractive 会改变 Prompt 语义，且上游语言仍 preview | **DEFER / NOT_GATE_READY** | 不实施。重访仍要求 source-generated Ask/Allow/Forbidden × approval-policy matrix |

## 2. 关键证据

### 2.1 `FINAL-OPP-01` 是真问题，已闭合到静态证据边界

- `scripts/lib/semantic-projection.mjs` 从 source skill 与现有 graph authority 派生 canonical projection；source/target/root/authority 的 symlink、escape、duplicate-key、invalid-YAML 与 orphan 形状均 fail closed。
- `.agents/skills` 当前为 35 个同源 symlink + 1 个 source-declared `magicpath` delegation；并发安装的两个 skill 进入同一规则，无需新增例外。
- `npm run test:semantic-parity --silent` 为 **31/31 PASS**；target swap、义务删除、scope/override/parallel/order mutation、negated receipt、root/authority escape 等负控均被拒绝。
- 边界：canonical instruction projection 只证明静态一致性；external plugin 的非治理执行正文有意不全量哈希，runtime 是否遵循仍需执行证据。

### 2.2 `FINAL-OPP-02` 不需要再造通用 profile

执行：

- `node scripts/test-workflow-runner.mjs` → `18/18 PASS`
- `node scripts/test-workflow-runner-runtime.mjs` → `21/21 PASS`
- live `codex exec -C /private/tmp/<scratch> -s workspace-write`：
  - `ALLOWED_SCRATCH=PASS`
  - `DENIED_MUSE=PASS`
  - `DENIED_LUCA_GSTACK=PASS`
  - `DENIED_CLAUDE_MEMORY=PASS`
  - `DENIED_LUCA_HOME=PASS`

专属 probe 文件事后均不存在，scratch 临时目录已清理。该结果证明已有 opt-in task class 的机械隔离，不证明 native Agent role 拥有独立 sandbox。

### 2.3 外部状态

- Repository：<https://github.com/wangmoumou1216-ai/luca_gstack>
- 远端验证提交链：`e399f45`（本任务主要 harness closure）→ `3d94271`（另一 session 的 skill 安装）→ `6449180`（本任务 HTML runtime follow-up）。run 验证 combined tree；本任务归属的精确 path commits 只有 `e399f45` 与 `6449180`，未回退或吸收另一 session 的未提交文件。
- Remote CI：<https://github.com/wangmoumou1216-ai/luca_gstack/actions/runs/33165797050>，`success`；五个基础 job 与 `Required Checks` gatherer 全绿。
- Branch protection read-back：`contexts=["Required Checks"]`、`checks=[{context:"Required Checks", app_id:15368}]`、`strict=true`、`enforce_admins=false`；PR review/restrictions 为 `null`，其余附加保护均为 false。

### 2.4 本地与远端验证

- `bash scripts/verify.sh`：**PASS=81 / FAIL=0 / WARN=1**；唯一 warning 是既有 ADR 目录无记录。
- `npm run test:semantic-parity --silent`：**31/31 PASS**；实盘 checker 为 **141 anchors / 35 shared / 1 delegated**。
- `node scripts/test-workflow-runner.mjs`：**18/18 PASS**；既有 `-C <scratch> + workspace-write` 仍是显式任务隔离路径。
- `node scripts/test-framework-html-baseline.mjs`：**5/5 PASS**；`node scripts/test-ci-contract.mjs`：**3/3 PASS**。

## 3. 授权边界

用户最新指令构成条件式 GATE：判为 NEED 的本地闭环与最小 GitHub required-check 设置可执行。仍不包含版本发布、release、下游项目操作、identity transaction、semantic promotion 或扩大 branch policy。

## 4. 完成清单

- [x] source-derived semantic/obligation projection checker
- [x] mutation proof-it-bites
- [x] local full verification
- [x] exact commit/push + matching remote CI
- [x] minimal branch protection + API read-back
- [x] benchmark reports terminal update and independent review

独立终局 reviewer `/root/mode2_terminal_review` 的裁决为 **PASS_WITH_RESIDUAL**，未发现阻断性矛盾。其指出的计划哈希、研究基线路径、当前测试计数、HTML validator 前置条件、未跟踪文档扫描、遗漏提交与并发提交链等精度问题均已在终局文档中修正。

## 5. 终局残余

1. Native Codex quality-gate child 仍继承 parent permission；当前只闭合 verdict/recorder 职责与篡改可见性，不宣称 role-level mechanical read-only。
2. Semantic projection 是静态证据，不是 runtime obligation enforcement。
3. 317 条 framework HTML 历史 finding 被精确锁定而未清零；`framework/` 仍保持 SF-002 只读。
4. `actions/checkout@v4` / `setup-node@v4` 的 Node 20 deprecation annotation 与 relaxed yamllint line-length warning 不阻断本次 required checks；若升级 action major，需独立兼容验证。
5. Execpolicy 继续 `DEFER / NOT_GATE_READY`；没有 release、版本发布、下游项目或 identity transaction。

<!-- FILE_END: completion-review.md -->
