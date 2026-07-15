# luca_gstack 记忆系统

渐进式记忆架构，模仿 Hermes 自成长机制的 Observe → Evaluate → Commit 管道。

## 分层架构

| 层 | 目录 | 功能 | 管道 |
|---|---|---|---|
| Episodic | `episodic/` | 会话事件记录 | append-first → index 结构化 |
| Semantic | `semantic/` | CRM/FxUI 领域知识 | Hermes-lite：候选 → 评审 → 晋升 |
| Procedural | ~~已并入 Semantic domain:skill-rule~~ | Skill 操作模式 | 读取 semantic layer 的 domain:skill-rule |
| Working | 每项目 `.luca/workflow-state.yaml` + `docs/PROGRESS.md` + `.luca/current-topic.txt` | session/任务内短期状态（流程节点、实时进度、当前主题） | 项目本地，随 skill/任务写入；**不治理、不进检索、不跨项目**（2026-07-09 命名收口，仅概念命名——IN_PROGRESS 恢复路径维持 BACKLOG #18 现状） |

## 懒加载（节省 context）

推荐调用顺序：

1. `get_memory.py --summary`：session 启动只看全层摘要。
2. `search_memory.py "<task/skill/topic>" --limit 5`：任务明确后优先精细检索。
3. `get_memory.py --layer ...`：search 命中特定层后再按需展开。
4. `consolidate_memory.py --json`：治理、复盘或记忆健康度检查；默认只读 dry-run。

```bash
# 全层摘要（session 启动时用）
python3 memory/scripts/get_memory.py --summary

# 任务相关精细检索（普通任务优先使用）
python3 memory/scripts/search_memory.py "<task/skill/topic>" --limit 5

# 最近 3 次 session 摘要
python3 memory/scripts/get_memory.py --layer episodic --limit 3

# 指定领域的稳定事实
python3 memory/scripts/get_memory.py --layer semantic --domain crm

# 指定 skill 的程序规则（读取 semantic domain:skill-rule）
python3 memory/scripts/get_memory.py --layer semantic --domain skill-rule

# 记忆治理队列（普通启动不运行）
python3 memory/scripts/consolidate_memory.py --json
```

## 关键词统一检索

> 关键词+子串匹配引擎（含中文 bigram），**非语义检索**——query 拆成关键词效果最好，
> 整句自然语言靠 bigram 兜底（2026-07-15 记忆层评审：旧称"自然语言检索"名不副实，
> 曾直接导致整句 query 十连 miss）。

```bash
python3 memory/scripts/search_memory.py "Project Gate route guard"
python3 memory/scripts/search_memory.py "Project Gate" --limit 5 --layer all
python3 memory/scripts/search_memory.py "framework templates" --layer semantic --skill html-prototype
python3 memory/scripts/search_memory.py "quality gate fail" --layer eval --topic prototype --json
python3 memory/scripts/search_memory.py "路由 触发词" --project muse   # 中文按词拆开 + 项目过滤
```

`search_memory.py` 同时检索：

- `episodic/index.jsonl`（热窗口；归档层 `episodic/archive/` 不在检索面，miss 时会提示条数）
- `semantic/promoted-facts.yaml`
- `evals/eval-log.jsonl`

支持参数：

```text
python3 memory/scripts/search_memory.py "query" [--limit N] [--layer episodic|semantic|eval|all] [--skill X] [--topic X] [--project X] [--json]
```

输出字段包含 `layer`、`id`、`title` 或 `fact`、`score`、`reasons`、`source`、`path`。评分理由会展示关键词命中、skill/topic 过滤、semantic stable/confidence、eval gate_status 和 recency。默认输出人类可读文本；`--json` 输出 JSON list。脚本兼容 `MEMORY_ROOT`，并对 `promoted-facts.yaml` 做轻量容错解析，单条 YAML 异常不会导致整层检索为空。

**ADR-0006 度量闭环（2026-07-15 接线）：** 每次检索自动埋点进 `memory/retrieval-log.jsonl`
（含检索参数与 source 标记；测试环境请设 `MEMORY_SEARCH_SOURCE=test` 免污染决策数据）。
**检索结果实际改变了你的行动时，补跑一次
`python3 memory/scripts/search_memory.py --mattered "<query>"`**——这是 BUILD/FREEZE 裁决的
唯一主观信号，没有它裁决永远 INCONCLUSIVE。裁决入口：`--retrieval-stats`（每日 digest 也会
呈现一行摘要）。

> **EVAL 子系统状态（2026-07-15 记忆层评审裁决，BUILD-lite）。** `record_eval.py`（写
> `evals/eval-log.jsonl`）已接确定性触发：quality-gate agent 定义 §4b 内置落账步骤（此前靠
> orchestrator prose 约定、实证 2026-06-28 起失守——冻结是对既成断链的追认而非原因）；消费侧
> 走每日 digest「🧪 Skill 评估消费」节。历史勘误与旧制分值语义见 git 历史。GEPA pairs 管线
> （`collect_eval.py` → `pairs.jsonl`，0 条）与 `run-log.jsonl`（0 字节）仍 **FREEZE**——
> 后者的持续零写入本身就是裁决票据，勿新建采集。ADR-0006 检索度量是独立路径
> （`search_memory.py` → `retrieval-log.jsonl`），见上节。

## 记忆合并与 review queue

```bash
# 默认只生成 review queue，不写文件
python3 memory/scripts/consolidate_memory.py

# 结构化输出，便于主 agent 或 CI 消费
python3 memory/scripts/consolidate_memory.py --json

# 晋升满足条件的 stable 候选；加 --dry-run 时仍不写文件
python3 memory/scripts/consolidate_memory.py --promote-ready
python3 memory/scripts/consolidate_memory.py --promote-ready --dry-run --json

# 归档已 promoted/rejected 的候选到 semantic/archive/candidates-YYYY.jsonl
python3 memory/scripts/consolidate_memory.py --archive-reviewed

# 归档低价值 episodic 热索引记录到 episodic/archive/noisy-YYYY.jsonl
python3 memory/scripts/consolidate_memory.py --archive-noisy
```

`consolidate_memory.py` 读取：

- `semantic/candidates.jsonl`
- `semantic/promoted-facts.yaml`
- `semantic/reviews.jsonl`
- `episodic/index.jsonl`
- `evals/eval-log.jsonl`

review queue 包含：

- `duplicate_candidates`：同 domain 下 normalized fact 相同，或一方明显包含另一方。
- `conflicts`：同 domain 下候选或稳定事实出现轻量相反规则，例如 `不得/not/must not` 与 `必须/must/should` 指向相同事实核心。
- `stale_candidates`：超过 14 天仍未 promoted/rejected 的 candidate。
- `promotion_ready`：`proposed_stable=true`、`confidence=high`、`evidence/scope/reviewer` 完整，且未重复、未冲突。
- `noisy_episodes`：缺少 `decision`、缺少 `next_risk` 且 `outcomes` 为空的 episodic 记录。
- `failing_eval_patterns`：同一 skill 下 `quality_gate_status=FAIL` 且 findings 重复出现。

治理流程（仅在记忆治理、复盘、健康检查或用户明确询问时执行；普通 session 启动不运行）：

1. 治理时先运行 `python3 memory/scripts/consolidate_memory.py --json` 查看队列。
2. 人工确认 `promotion_ready` 后运行 `--promote-ready`，脚本会追加到 `promoted-facts.yaml` 并写入 `reviews.jsonl`。
3. 确认 reviewed 候选不再需要留在工作队列后运行 `--archive-reviewed`，脚本会把已 promoted 或 rejected 的候选移动到年度 archive。
4. 确认 `noisy_episodes` 是占位或低价值记录后运行 `--archive-noisy`，脚本会把它们移出热索引并保留到年度 archive。
5. 对 `conflicts` 和 `duplicate_candidates`，优先补充 review 结论；不要直接删除候选，避免丢失证据链。

## 写入协议

| 层 | 写入命令 |
|---|---|
| Episodic | `python3 memory/scripts/append_episode.py --topic "..." --summary "..." --skills "..." --outcomes "..." --decision "..." --next-risk "..." --project "..." --meta` |
| Semantic | `python3 memory/scripts/propose_semantic.py --domain crm --fact "..." --confidence high --evidence "..." --scope "..." --reviewer "..."` |
| Procedural | `python3 memory/scripts/propose_semantic.py --domain skill-rule --fact "..." --confidence high --evidence "..." --scope "<skill>" --reviewer "..." --tags "<skill>,rule"` |

## 文件版本控制

| 路径 | 入库 |
|------|------|
| `episodic/index.jsonl` | ✓ 滚动索引（默认保留最近 50 条 session 记录；超出后自动归档至 episodic/archive/） |
| `episodic/sessions/*.md` | ✗ 原始文件，忽略 |
| `semantic/promoted-facts.yaml` | ✓ 稳定事实 |
| `semantic/candidates.jsonl` | ✗ 运行时工作文件 |
| `semantic/reviews.jsonl` | ✗ 运行时工作文件 |
| `procedural/README.md` | ✓ 说明文档 |
| `scripts/` | ✓ 全部入库 |
