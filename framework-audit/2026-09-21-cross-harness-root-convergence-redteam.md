# 双端根合同收敛计划：独立红队质疑

对象：`2026-09-21-cross-harness-root-convergence-insertion-plan.md`；NO_PIN。仅审计划，未验证 Claude 活体、未实施或发布。

1. 双根合并是否真的减少**单次会话**上下文，还是只把约 21 KB 的仓库存储变成一处约 11 KB 的人工维护？若误计，轻量化 30% 收益与投资回报会虚高。
2. 当前共享规则是否有可追溯的双根漂移/返工和足以覆盖迁移、测试长期维护税的工时证据？若没有，U5 可能是为消灭视觉重复而制造更昂贵的验证链。
3. 当 `@AGENTS.md` 在某个 Claude 版本/配置静默不展开，薄 shim 是否还能保住 K1–K10、Static Fallback、Project Gate 和 HITL？若不能，原“各根独立内联”的安全底线被删除，不能以上游文档或一句停止提示替代行为证据。
4. AGENTS 当前的 Codex-only K5/K10 语句被 Claude 导入后，会不会让 Claude 执行错误端的项目读取、模型分派或 workflow 路径？若会，单语义源反而制造隐性串端。
5. 根读取检查器、生成器、路由检查、coding-discipline、model-table、writing-for-agents、评分器及 verify/CI 是否都按**有效展开指令**重审，而不是只改两个 Markdown？若漏一个消费者，旧绿灯或新假红都会歪曲安全结论。
6. 原评分器把“读另一根”判违规，隔离 fixture 又只带 ownRoot；换成合法 import 后，其 F1 `--self-test` 还能证明正确加载吗？若不能，自测通过并不是 shim 兼容证据。
7. 若在 P1→P2 或 U1–U3 中途插入根合并，原 A→B 的差异是否还能归因于 C1–C10？若不能，56 会话与 G5 的收益判定将失真。
8. B 仅工程冻结而未过 G5 时，C 的离线绿灯会不会被误作整合版可发布？若会，原 v3.2 的两端安全/收益未知被遮盖。
9. B→C 比较若跨模型版本、工具配置、fixture 或评分器变化，旧 B 的中位数是否还可用？若不能，须明确新费用而不能偷用旧票。
10. 用户本次同意“插入计划”是否可能被误读为批准未来 U5 精确文件修改、付费实验与发布？若会，跨 session 授权被概念计划放大。

R1 只读专家/红队指出上述问题；R2 针对 v1 草案给出 shim 失效安全 BLOCKER 和价值门、双端成本、消费者覆盖等 MAJOR。v1.1 增加 90 天观察/12 月回本门、D0 只到 GO_TO_DESIGN、B-G5 与 C-G6 双门、二次精确授权、专项 import fixture 和失效 mutation。独立红队对 SHA-256 `146b214a6bb715c2bf4796770bd0143bba5d361733a2a76495f7fa8516270fa9` 给出**计划层 PASS，无存活 BLOCKER/MAJOR**；之后一处仅澄清“获批隔离原型可开发、正式根切换/发布仍须 Claude 活体”，对终版 SHA-256 `624da208d56a97447b23d379bc6e43c5fcbfc047b8127d12c0504a1eb5a21330` 的精确复核确认原 PASS 不变。这不是 U5 工程或双端验收票。

残余未知：维护节省尚未按 D0 门取证；Claude 当前没有额度，原生 import、降级和全任务成本不能给活体票；G1 仍有 C3 UNKNOWN。上述任何 UNKNOWN 不得被转述为已合并、已通过 G5/G6 或已经获得发布授权。

<!-- FILE_END: framework-audit/2026-09-21-cross-harness-root-convergence-redteam.md -->
