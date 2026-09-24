# 双端根合同单源化握手计划：独立红队记录

评审对象：`framework-audit/2026-09-21-cross-harness-root-handshake-final.md`，终版 SHA-256 `521d5373a3bd67b445761ac2881ae7efc20461f45c3185f890799b70db1920c8`。框架 NO_PIN，只评计划，未执行 U5、Claude CLI 或付费 A/B。

## 对抗问题与影响

1. 如果 Claude 的 `@AGENTS.md` 导入静默失效，K1–K10/Static Fallback 会不会全无？影响是项目隔离与 Human Gate 降级；终版选双完整生成根，不采用运行时导入。
2. 如果作者源的端别模板不能表达标题后的多行序言或未来 B 差异，是否会在迁移时悄改根？影响是“维护重构”偷变语义；首轮 FAIL 后改成可表达全部差异的有序 COMMON/CLAUDE_ONLY/CODEX_ONLY 片段，并以两条逐字节 `cmp` 阻断。
3. 如果旧 `sync_projections()` 的 fallback-only 循环覆盖新生成结果，检查器和同步器是否自相矛盾？影响是双根继续有第二手写权威；首轮 FAIL 后要求改掉该循环，增加 COMMON 单点变更→双根同变且 `check` 通过的正例及负例。
4. 如果同步在部分文件写入时崩溃，计划是否误称跨文件原子？影响是半成品被当作已发布；首轮 FAIL 后收窄为逐文件原子、同步错误回滚、崩溃后 `check` 拒绝半成品。
5. 如果新增源落在 `.claude/skill-os`，是否即使根逐字节相同也改变 evaluator 的 context SHA 与 release manifest？影响是拿 B 的冻结票冒充 C；首轮 FAIL 后要求单独 C digest/manifest，以原 CLI `--describe --release-manifest` 验证，禁止跨 hash rescore 和重用 B manifest。
6. 如果 C 还修改 builder/test、增审计文件，或者 `rg --files`/`git status` 暴露变化，只检查 source 是否被读取够不够？影响是全任务行为/成本票被错误转移；第二轮 FAIL 后改为逐 T1–T7 排除**全部 C 相对 B 的可观察差分**，不确定即 UNKNOWN、不发布，新增活体需另批费用授权。
7. 如果财务价值仍 UNKNOWN，用户明确愿意为确定性单源付费是否被误当成收益已证？影响是机器替用户拍板；第二轮 FAIL 后明示 `GO_VALUE_OVERRIDE` 是独立 Human Gate，仅准试做，不改财务 UNKNOWN，也不豁免 G5/G6/发布。
8. 如果 G1 仍缺 C3，却因握手计划存在进入 P2 或重写 A/B 评分器，是否污染主线？影响是轻量化候选与 MD 收敛无法归因；终版仅在 G4 后/G5 前预留 G4.5 条件门，当前 P1 回去先补 G1，U1–U4 不混写。

## 票据与边界

| 轮次 | 被审 SHA | 结果 | 处置 |
|---|---|---|---|
| 首轮 | `7d07f23533e428de31f2e50c88b1dcb212872234d8a58b5227c772ad4a7675b0` | FAIL | 模板序言、context identity、原子措辞及旧同步循环 |
| 第二轮 | `f0fd6b329eb8d9ad6aaa45a13b77a1eb2664e2a2230f29396b556b59cfacd5d6` | FAIL | 全 C\B 可观察差分和价值覆盖票仍不闭合 |
| 终版 | `521d5373a3bd67b445761ac2881ae7efc20461f45c3185f890799b70db1920c8` | **PASS（计划层），0 BLOCKER/MAJOR** | 未实施；价值仍 UNKNOWN，默认 SKIP_U5 |

终版 PASS 只表明计划把失败姿态与授权边界说清并可执行，不代表 C 已通过、Claude 活体已验证或轻量化 G1/G5 已放行。

<!-- FILE_END: framework-audit/2026-09-21-cross-harness-root-handshake-redteam.md -->
