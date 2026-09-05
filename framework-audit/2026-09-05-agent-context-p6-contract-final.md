# P6 最终合同冻结准入复审

**Verdict: PASS — 可按已授权的 16 单元命令表开始串行实测。** 本票只关闭四文件的合同准备/冻结准入，不是 P6 实测通过、S9 全量完成、OD 外部接通或最终发布 PASS。独立 default-REFUTE，只读源码；没有付费 Harness、网络、Git 或下游项目操作。

## 冻结对象

| 文件/身份 | SHA-256 |
|---|---|
| scripts/run-agent-context-ab.mjs | 4e244a26240c703f56e803f2689c0d3b0959b116def92b28fdced0413b28803a |
| scripts/agent-context-branch-fixtures.mjs | 49d95e6cbad360c34a79bae5a567cf276ab8f7c3c7410e0e4d06df6ef0566b9a |
| scripts/test-agent-context-branch-fixtures.mjs | bd2c4dec8d2869830eab077c798e5bb0011328e9a35451654e00d96ac1b9dd7e |
| .claude/skills/office/open-design/SKILL.md 3.3.1 | 84a9cd31d86f6239fe3fec4879ac08c46fb8e2bcad85359d915c53966f568459 |
| v22 完整 scorer | 61fe83d1242834fc0c769b0f645d3c765952b9fc8b8d6fd48a73f9c45a064f93 |
| framework-audit/2026-09-05-agent-context-p6-release.json | afec01b280d0767d7faeff8242aefb23e4c9d0cf0787ddce3576027b167275a2 |
| candidate context | cd37bd91699ce4f2ab98302722bc31588cf92f9bed6bb07f436c22481c11d73a |
| baseline context | 4faa8176b9029ecbe4ca207528fda6771b0ea467a890a39f6700e126d49360a7 |

两端/两臂各实际执行了一次 `--describe --release-manifest`，四项均返回 RELEASE_BOUND，context/scorer 与上述值一致。baseline F9-v2 显示不可执行。身份辅助文件实际名为 `2026-09-05-agent-context-p6-identities.json`；其 RELEASE_REQUIRED/null manifest 状态是生成 manifest 前的描述快照，不应误称已绑定读回；本次四项实际读回补齐该证据。

## 逐项裁决

1. **PASS：manifest 确实在调用前拒绝不匹配。** Runner:236–250 校验 schema、版本、两臂 hash 格式、当前臂 context、scoring revision/全依赖 hash、显式 fallback 与实际候选 allowlist；baseline F9-v2 拒绝。分支 fixture 没有 manifest 时在 :191–199 以 exit 2 停止，`all` 仍仅含历史 fixture。实际 `--describe` 正例及 schema/version/context/scorer/governed-ID/显式-ID 反例分别观察到 PASS→exit 2→恢复 PASS；这些调用没有进入真实 Harness。最终 self-test 再次覆盖同一验证函数。

2. **PASS：冻结漂移不会变成 baseline 的普通失败而继续。** Runner 的 currentStability 与 executeTask 在调用前、结果返回后重核 context、scorer、manifest；成功/异常记录保留原始轨迹与冻结身份。最终 :1599–1601 将 model identity、scope FAIL/UNKNOWN 和三类漂移均判为 infrastructureError。本轮初查发现模型不符尚未触发 baseline 停止，修复后已独立读回并重跑最终 self-test；真实 executeTask→NDJSON→queue→exit 的本地 transport stub 覆盖两臂：正常三行、违规仅一行且 exit 1/两格未分派、恢复三行。该临时 stub 不是真实模型证据。

3. **PASS：contractEdges 修复没有放宽评分。** :645–663 只接受规范化、真实同根普通文件；source 已可达、target 明确被选中、精确链接实际存在，才按声明顺序加入。:690–692 不递归走邻居。F13 (:35–36) 明确 OD→page-context→catalog；F14 (:135–136)、F10-v2 (:213–214) 明确 OD→page-context。缺边、反序、未选中间 owner、无链接、符号链接及父目录 symlink、路径越界、目录/不存在对象均有拒绝断言。旧 claim matcher/schema/source/EOF/scope 规则未下调；新增目标仍需完整读取，缺读仍失败。

4. **PASS：F13 收据与真实运输包一致。** Fixture:55–62 现使用 brief.md、page-reference.json、reference.png；与 open-design:116–125 的实际 helper 合同一致。C-LOCAL/C-UPLOAD/C-WRONG/C-MISSING/C-CHANGED 仍全部拒绝，唯一正例为 C-VALID；STAGED 与 generated 分开且 evidence_scope 固定 synthetic-only。测试:76–81 核验真实名称及唯一正例，原 320 条反例仍被生产 matcher 拒绝。

5. **PASS：fallback 绑定真实六项，未猜 ID。** Manifest 六项与实际 allowlist 相同；此前独立检查两根每行 ID/domain/text 与 promoted facts 的六条 stable 记录完全相同。SC-20260905-001 取代 SF-002；R5 的 -002/-003/-004 不加入 fallback。Factory 的测试用虚构 ID 不获得 live 权限；候选 live manifest 必须等于实际 allowlist。

6. **PASS：OD 3.3.1 两项修改有本地一手源码支持。** 本次独立读取安装版 OD 0.21.1 的 `server-ZAIBKNCW.mjs`：:192731 的 create 解构接受 metadata、:192812 将 clientMetadata 合入项目，:193358 返回完整 project，支持 skill:159–160 的 metadata.platform/fidelity 及读回核对。:194909–194928 的 `/files/<name>` 直接发送存储 buffer；:194615、:194634–194665 的 `/raw` 会走 HTML 预览转换/bridge，支持 skill:223、:239 改用 files 回收 HTML。非 HTML 路径保留 buffer，因此现阶段 md/json/png 的 raw 读回合同不矛盾。此为接口源码核验，不冒充真实 OD 接收/回收测试。

7. **PASS：基线比较边界清楚。** baseline 仍是原导出，缺新 page-context/catalog；没有复制新 owner 到旧版本，也没有更改期待答案给旧版让分。F13/F14 baseline 只能作为“新目标政策/新增能力表现”的描述测量；不能解释成同能力回归或根瘦身的因果收益。候选缺读/错误权限/UNKNOWN 仍失败。F14 的 partial S9 声明和 P16/P17/P18 deferred 项保留，不允许用字段答对顶替真实生命周期与全量保留验收。

8. **PASS：16 条命令与授权范围一致。** 已完整核对 `2026-09-05-agent-context-p6-commands.json`：4 baseline + 12 candidate，顺序与前次建议一致；每项 trials=1/concurrency=1，全部绑定同 manifest/output/batch，Claude 全部显式 claude-opus-4-6，candidate 有 require-pass。无 all/resume/retry/calibration。父逐条检查 raw 行与退出码后才执行下一项；基础设施、模型/范围/冻结失败停两臂，candidate 首个 non-PASS 停后继。纯 baseline 行为 FAIL 保留测量意义。

## 新鲜验证与边界

最终 runner hash 上，独立运行 candidate/Claude `--self-test` exit 0，输出四 fixture、320 rejected counterexamples、EOF/read/scorer 自测 PASS；该测试内部还实际跑了上述两臂的本地 transport 停止/恢复路径。此前对两端/两臂当前 root 自测均执行通过；最后仅模型/范围停止的局部 delta 由本轮终版自测重新关闭。没有把当前 root 上的 baseline 标签自测冒充旧 baseline 行为实测。

没有存活的本轮 Important/Critical finding。可进入已经批准的 16 单元执行，不能借本票多跑失败格、删除历史失败或重开 USER_WAIVED 页库验收。完整仓库 verify、真实 OD、剩余 P6 行为、预算和最终冷审/发布仍由主线分别关闭；本票不覆盖那些未完成门。
