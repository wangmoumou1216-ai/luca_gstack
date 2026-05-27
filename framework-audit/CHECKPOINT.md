# Framework Audit + 治理 — Checkpoint

Last updated: 2026-05-27（治理 6 项完成，准备继续 Tier-4 缺口）

## 已完成 ✅
**审计 + 辩论**（产出在 framework-audit/）：
- diagnostics/A1-A5、research/B1-B3、CROSSWALK.md、DEBATE-CONCLUSION.md（3 critic × 4 轮对抗，工具验证）

**治理 6 项**（每项 fix-agent → 质量门禁 → 2 轮辩论 → 判定 → verify.sh → 独立 commit）：
- ✅ ADR-0001 死代码 `1dc1475`
- ✅ ADR-0004 一致性 `6e3683a`
- ✅ ADR-0003 路由契约 `414e6dc`
- ✅ ADR-0002 route-guard 权重护栏 `57aa76c`
- ✅ ADR-0005a SSOT 漂移检测 `4115b5b`
- ✅ ADR-0006 度量埋点 `135d928`
- ✅ 治理日志 `e6fc2a3`
- 回退基线 `7295ec2`；全程 verify.sh PASS=45 FAIL=0 WARN=1
- 详见 framework-audit/GOVERNANCE-LOG.md

## 关键决策（不可从代码推导）
- promoted-facts.yaml SF-001 直改记为**授权 override**（更正错误事实，非新增）
- CHANGELOG 0.2.0 不可变 → 改加 [Unreleased]
- route-guard 用**严格权重护栏**（仅更高权重的更长触发词才 shadow），等权 tie 保持安全 STOP
- ADR-0006 裁决规则：0-mattered = **不充分≠自动冻结**；冻结需客观证据（searches≈0）

## 待执行 🔄 —— Tier-4 缺口（审计发现但从未进入治理），按优先级
> 用同样的治理闭环（fix-agent → 门禁强制提问 → 2 轮辩论 → 判定 → verify → commit）逐项做。

1. **[最高] CI 缺口**：`.github/workflows/*.yml` 不跑 `check:hooks`/`test:routes`/`verify.sh`
   → 本轮 route-guard 护栏 + SSOT 检测的测试在 CI 层**失效**。先补 CI 接线。
2. **[高·纯减法] LUCA_SPAWNED/SPAWNED_SESSION 死代码**：仍在 **32 个文件**（grep 确认），从不触发。清理（含 18+ skill preamble bash 块 + 协议说明）。注意：SPAWNED_SESSION 有"未来预留"标注部分属设计取舍，需区分"误导性活引用"vs"明确预留"。
3. **[中·减法] orphan 记忆脚本**：`mine_blockers.py`、`record_eval.py`、`collect_eval.py` 仍是未接线死脚本。删或接线——但与 ADR-0006 度量/eval 决策耦合，需先确认不影响 0006 度量路径。
4. **[中] preflight + quality-gate 重叠**：两 agent md 都在，合并评估。
5. **[中] 规则重复**：`#FF8000` 散落 **50 处**、Project Gate `老项目/已有项目` 在 **7 文件**。收敛到单一源（brand-tokens.md / routing 契约）。
6. **[低] 其余**：hook 手写 YAML 正则脆弱、projectGate 过激 STOP、session-sync 每次写 pending-extraction 噪声、status.sh 重复渲染、tie-break ±1 窗口、skill 重叠（idea/brainstorm、deepresearch/ux-research、原型界面重复触发）。

## 推迟（用户已确认 scope 外，勿动）
- ADR-0005b description 路由迁移（待中文命中率测试）
- ADR-0006 记忆重建/hook 内 LLM（待 ~10 session 度量）
- ADR-0007 观望项（编排瘦身/token 计量/GEPA/官方 skill 替换）

## 恢复指令（compaction / 新 session 后）
1. 读本 checkpoint + framework-audit/GOVERNANCE-LOG.md
2. `git log --oneline -8` 确认到 `e6fc2a3`；`bash scripts/verify.sh` 应 PASS=45
3. 从"待执行 Tier-4"第 1 项（CI 缺口）继续，逐项走治理闭环
4. 每项：stage 指定路径提交（勿 `git add -A`——会触发 .githooks 自身的 secret-scan 误报；`.env.example`/`.githooks/` 保持 untracked）
