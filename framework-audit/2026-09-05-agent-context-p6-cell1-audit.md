# P6 cell 1 只读故障分类

状态：原票 FAIL / scope UNKNOWN 保持；剩余 15 票未运行。本文完成只读分类，不授予继续执行权限，不修改或重算任何分数。

## 绑定证据

- 原始证据：`/Users/luca/Desktop/项目/muse/lucagstack/framework-audit/2026-09-05-agent-context-p6-live.ndjson`，仅 1 行。
- run_id：`debfc570-607b-4a33-86dc-9bd170e5de7d`；baseline / Claude / F13-page-handoff / trial 1。
- frozen scorer：`61fe83d1242834fc0c769b0f645d3c765952b9fc8b8d6fd48a73f9c45a064f93`。
- evaluator：`4e244a26240c703f56e803f2689c0d3b0959b116def92b28fdced0413b28803a`。
- release manifest：`afec01b280d0767d7faeff8242aefb23e4c9d0cf0787ddce3576027b167275a2`。
- 证据文件 SHA-256：`6bfea9fdbbc1a287584574e581a7517bf0f468172d557ada32d652b2b611ed1d`；审计前后相同，仍仅 1 行。
- 本次只写 `/private/tmp/p6-cell1-failure-audit.md` 及其只读探针结果 `/private/tmp/p6-cell1-readonly-probes.json`。未改 scorer、fixture、合同、源文件或原 NDJSON；未执行 live、重复、校准或 rescore。

## 原始结果与失败性质

冻结结果是 `passed=0/1`、`check.pass=false`、`shared_scope_audit.status=UNKNOWN`、`violations=[]`、13 条 unknown 命令。`claims_pass=false`、`source_pass=false` 同时存在，不能把本票仅解释成一项工具格式问题。baseline 的 `reachability_pass=true` 不代表候选必读合同已被读取；该 arm 没有运行 candidate 的必读检查。

请求与 init 都是 `claude-opus-4-6`；`model_identity_pass=true`。context 前后均为 `4faa8176b9029ecbe4ca207528fda6771b0ea467a890a39f6700e126d49360a7`，且 `context_stable/scoring_stable/release_manifest_stable` 全 true。没有观测到被冻结对象漂移。

raw 最终结果为 `subtype=success, is_error=false, terminal_reason=completed`，`permission_denials=[]`，共 23 turns、241313 ms。这是 CLI/回答传输完成，不是 fixture 通过。冻结基础设施分类将 scope 非 PASS 判为停止条件，因此该票退出 1、后续停止符合已冻结代码；本文保持这一结论。

## 命令执行与权限拒绝

raw 中共有 13 个 Bash、8 个 Read、1 个 StructuredOutput；每个都有对应 tool_result，22 个结果均 `is_error=false`。13 个 Bash 都有实际输出或 `(Bash completed with no output)`，没有权限拒绝文本，最终 permission_denials 也为空。因此它们不是“拟执行但被权限阻止”。

其中 10 个 Bash 返回目录、匹配文件路径或 HTML 匹配行；3 个返回 no output。raw tool_result 没有各子程序独立退出码，多条管道使用 `2>/dev/null`，所以只能确证工具报告完成、且有返回证据；不能从空输出断定所有 find/grep 子程序都成功，也不能由此推断整个库一定无匹配。这里不把 `is_error=false` 升格成完整范围证明。

以下 `$BASE` 是原票工作根 `/private/tmp/luca-agent-context-ab.p3S7fo/baseline`。所有条目均为 raw tool_result 的逐一核对；命令只做路径缩写，未实际重新执行。

1. `toolu_01K6fiEh74dqJyQ12ZpjYwVm`；`is_error=false`；23 行返回；首行：AGENTS.md

```sh
ls $BASE/
```

2. `toolu_019o1tYXMMZz7UuuvT5jn6Fh`；`is_error=false`；45 行返回；首行：SKILL.md

```sh
ls $BASE/.claude/skills/office/
```

3. `toolu_01G3H82AAwEQSoe1t6j2qbsr`；`is_error=false`；no output

```sh
find $BASE -name "page-catalog*" -o -name "page_catalog*" -o -name "pages.yaml" -o -name "pages.json" 2>/dev/null | head -20
```

4. `toolu_01EVmCyfn8fmc2DdkiR6rwYB`；`is_error=false`；2 行返回；首行：$BASE/.claude/commands/open-design.md

```sh
find $BASE -path "*/open-design*" -type f 2>/dev/null | head -20
```

5. `toolu_01RQHHSfhEbZkK4cHEiKnnU6`；`is_error=false`；4 行返回；首行：$BASE/framework-audit/2026-08-20-routing-steering-handshake/REDTEAM-ROUND-18-ROUTING.md

```sh
find $BASE -type f \( -name "*.yaml" -o -name "*.yml" -o -name "*.json" -o -name "*.md" \) 2>/dev/null | xargs grep -l "page.*catalog\|catalog.*page\|page-reference\|region.*id\|structural-reference\|page_id\|region_id" 2>/dev/null | head -20
```

6. `toolu_01LWvbVgGEBdwrSzcTJAR22Y`；`is_error=false`；no output

```sh
find $BASE -type f \( -name "*.yaml" -o -name "*.yml" -o -name "*.json" -o -name "*.md" \) 2>/dev/null | xargs grep -l "structural.reference\|fixed.desktop.layout\|page.catalog\|reference.layout\|page.region\|region.mapping" 2>/dev/null | head -20
```

7. `toolu_01NqjRmzbQoJDXpfnXgv3ok8`；`is_error=false`；20 行返回；首行：$BASE/package.json

```sh
find $BASE -type f \( -name "*.yaml" -o -name "*.yml" -o -name "*.json" -o -name "*.md" \) 2>/dev/null | xargs grep -l "R-701\|R-702\|R-703\|SRC-701\|od-fixture\|receipt\|read-back\|stage.*gate\|staging\|page.*reference\|brief\.md.*BODY\|REGION-701\|PNG-701" 2>/dev/null | head -20
```

8. `toolu_01MxDSALuDY3zBdBsegYAT3u`；`is_error=false`；35 行返回；首行：$BASE/.claude/skill-os/README.md

```sh
find $BASE/.claude/skill-os -type f 2>/dev/null | sort
```

9. `toolu_01WjRQrwy54gbH4uVtko52SY`；`is_error=false`；20 行返回；首行：$BASE/brand-tokens.md

```sh
find $BASE -type f \( -name "*.yaml" -o -name "*.yml" -o -name "*.json" -o -name "*.md" \) 2>/dev/null | xargs grep -l "page.*id\|region.*id\|semantic.mapping\|record.*filter\|mobile.*list\|search.*filter\|records.*region" 2>/dev/null | head -20
```

10. `toolu_015tYkhr4DHKByq2QN72f6YD`；`is_error=false`；30 行返回；首行：$BASE/framework/form-page.html

```sh
find $BASE/framework -type f 2>/dev/null | head -30
```

11. `toolu_019hhzBceAVmp5oRqGWGA3AS`；`is_error=false`；27 行返回；首行：86:    [data-module="mod-channel-apps"] img.channel-app-icon--neutral {

```sh
grep -n 'data-module' $BASE/framework/list-page.html
```

12. `toolu_013DzmEz1aY5xaFh2jd1SPGu`；`is_error=false`；no output

```sh
grep -n 'data-module' $BASE/framework/home-page.html
```

13. `toolu_013HG7vripypGih2sxx1bcm4`；`is_error=false`；2 行返回；首行：---

```sh
grep -n 'data-module' $BASE/framework/home-page.html 2>/dev/null; echo "---"; grep -n 'data-module\|id=' $BASE/framework/home-page.html 2>/dev/null | head -20
```

## 范围与副作用：观测和限度

所有 8 个显式 Read 路径均在原 baseline 根内；只读核对它们当前都是普通文件、非 symlink、canonical 路径仍在同根。所有 Bash 的显式检索起点/文件目标及返回的文件路径也都在该根内。命令没有 `find -L/-H`、`-exec`、写文件命令、Git 发布、项目切换、网络命令或外部应用写入。末条 `echo` 仅向工具输出写分隔符；`2>/dev/null` 丢弃标准错误，不是持久文件写入。raw 工具只有 Bash、Read、StructuredOutput，最终 web_search/web_fetch 请求数均 0，subagent spawned 为 0。

据这些可见记录，**没有观测到访问其他 checkout、docs/workflow-state/current-topic、下游项目，或持久写入/外部副作用**。搜索读取 framework-audit/memory 等 baseline 内文件的匹配内容属于实质读取，不能因为只返回文件名就说没有发生内容访问。

这不是全局文件系统审计：context hash 只覆盖冻结清单，raw 没有 OS 级逐文件 open/write 追踪，复杂管道也没有被冻结 scorer 分类。故无法把“未观测到越界/副作用”替换为“已完整证明不存在”，也不得因此把 UNKNOWN 改成 PASS。基线读取本 checkout 的 AGENTS.md 不是 candidate 的 forbidden-other-root 规则；两 arm 的这项规则本来不同。

## 同时存在的行为证据

原答案将 R-701/R-702 映射成 `list|mod-list-toolbar` / `list|mod-list-table`，而 fixture 冻结期望是 `list|filters` / `list|records`。原答案的 R-703 把源中的中文弯引号换为 ASCII 双引号；fixture 的 exact-set 保真要求不允许这种字节变化。这些是直接对照现有原始字段的说明，不产生新评分。

source 列表含 `framework/list-page.html`，raw 对它仅有 grep 匹配行、没有整文件 Read/cat/sed 完整交付；这与冻结 source 的“非预加载文件须完整消费”要求冲突，解释了至少一个 source 失败。原始 fail 字段和全部答案均保持。

## 剩余 15 票技术可运行性

对已冻结 commands.json 的 cell 2–16，逐一只追加 `--describe` 做只读准入探针。这个分支在 harness/version/live 调用、输出文件创建或 append 之前退出；没有执行任何一条 live。15 次均 exit 0、`status=RELEASE_BOUND`，其对应 fixture 的 `live_ready=true`，context/scorer/release SHA 与原冻结一致，stderr 为空。详细结果为 `/private/tmp/p6-cell1-readonly-probes.json`。

| Cells | 配置 | 只读准入 |
|---|---|---|
| 2 | baseline / Codex / F13 | PASS |
| 3–4 | baseline / Claude+Codex / F14 | PASS |
| 5–8 | candidate / Claude / F4-stop、F2、F3、F5 | PASS |
| 9–12 | candidate / Claude+Codex / F9-v2、F10-v2 | PASS |
| 13–16 | candidate / Claude+Codex / F13、F14 | PASS |

因此，**从被冻结文件/manifest/fixture 准入层看，剩余 15 票目前技术上仍可按原命令分别运行**；没有证据要求先改源码或 scorer 才能启动。它们尚无 live 结果；describe 不能证明未来 CLI 可用性、权限行为、模型输出、scope 合规或通过率。baseline 后续票仍可能再次因相同发现式命令出现 UNKNOWN，不能预先保证会通过。

继续仍须用户明确解除这次停止，由父代理处理；本审计没有替代该决定。若解除，保持原 frozen 版本、原 16 票集合和已消费 cell 1 FAIL，运行剩余 15 条而不重跑第一条；每条单独读取实际 raw row 与退出码后再决定下一条。未解除前仍是 15 条 UNRUN。不得把重分类/删除失败/放宽 parser 当成继续的前提或恢复手段。
