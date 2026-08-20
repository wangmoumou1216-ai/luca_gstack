# 2026-08-11 rule-execution WIP —— 逐 hunk 裁决台账

> 载体：muse 检出 `stash@{0}` = `7ab2b0fd5ab39b75c69c077c3812d46481cce4b2`
> 永久回溯口：`refs/backup/pre-pull-20260819` = `b9418032`
> 底稿：HEAD = `6edcabd`（已 ff-only 拉入 upstream/main 18 条）
> 三轮红队握手后执行（v4 计划）。**stash 未 drop，随时可复查。**

## 背景更正

初判「7 个代码文件已被 PR #8 取代、可整体丢弃」——**该结论已被红队第一轮推翻**。
PR #8 的 freeze 提交 `4ef6bd6` 一行代码没碰（只加审计文档），真正改码的
`47929a7`(15:08) / `a864d54`(18:03) 晚于本地 WIP mtime(10:23–11:51) 3–6.5 小时，
且无一个 numstat 吻合。行级实测进一步证实：**28 个 hunk 无一个在 HEAD 中重合度 ≥90%，最高 66%。**

## 已处置（无需再裁）

| 文件 | 处置 | 依据 |
|---|---|---|
| `.claude/observability/observations.jsonl` | **已恢复** | 上游零改动；恢复后 verify.sh 无新增 FAIL |
| `memory/episodic/index.jsonl` | **只补 EP-20260819-124** | 本地另 8 条独有 id（EP-20260714-075…082）**已被上游轮转归档**（在 `archive/2026.jsonl` 中确认），补回去等于撤销归档 |
| `memory/retrieval-log.jsonl` | **union 补 2 行** | 纯追加型，上游 +126/-0 全部保留 |
| `.claude/skill-os/capability-parity.json` | **判②丢弃，不恢复** | A/B 实测：恢复它令 `verify.sh` 的 **S18 能力锚点自检**由绿转红；退掉即恢复。该 +1/-1 相对当前 HEAD 的锚点集合已过期 |

## 待裁决：7 个代码文件共 28 个 hunk（一个都未自动应用）

| 文件 | hunk | 新增行 | HEAD 已含 | 线索 |
|---|---|---|---|---|
| route-guard.mjs | 6 | 66 | 0–50% | h5 部分重合需拆 |
| session-sync.mjs | 9 | 62 | 0–50% | h7/h8 部分重合需拆 |
| test-codex-adapter.mjs | 4 | 40 | 0–36% | 见下方样本分析 |
| test-hooks.mjs | 5 | 125 | 0–18% | — |
| test-project-identity-wiring.mjs | 2 | 8 | 0% | — |
| test-route-guard.mjs | 1 | 9 | 66% | 需拆 |
| fixtures.jsonl | 1 | 3 | 0% | — |

### 样本分析（test-codex-adapter.mjs，红队指认的分叉最硬处）

- **h1** 扩展 `cleanup()` 清理 `.episode-written-<SID>` 与 `observability/pending-extraction-<SID>.md`
  → 两个机制在 HEAD 中**仍然存在**（session-sync.mjs / session-restore.mjs 均引用）
  → **桶③仍成立**：HEAD 的 cleanup 走了另一条路（加 `.session-consumed-turns-`/`DIRECT_SID`），这个清理缺口还在
- **h2** 新增 A4–A9 测试块 → **内部混装，必须拆**：
  - A4/A5 依赖 `CORRECTION GATE` —— 该字符串**已从全仓消失** → 桶②
  - A6/A7/A8/A9 依赖 `pending-extraction` / `episode-written` / PROJECT GATE —— **均仍存在** → 桶③
- **h3** 注释由「decision:block → continue:false 翻译」改为「原样透传（禁止语义反转）」
  → HEAD 中「原样透传」出现 5 次，**语义已取代** → 桶①（注：行级比对显示 0%，因字面不同；此为行级判据低估语义取代的实例）
- **h4** 新增断言 C4（无 pin 时 Stop 不把 shared symlink 归因为当前项目）
  → `当前无激活项目` 仍在 session-sync.mjs 中 → **桶③仍成立**

## 为什么不自动应用

红队实测：对 `route-guard.mjs` 取三种 hunk 做 `git apply --3way`，**三种全部冲突**（上游 +290/-75 近乎重写）。
且 `git apply --3way --check` 在真冲突时**返回 exit 0**，冲突标记会写进文件本体，
而 `git add` / `git commit` 对含冲突标记的文件**一律静默成功**。
在这种底稿上批量自动叠加陈旧 hunk，风险高于收益。

## 建议

这 28 个 hunk 里确实存在**当前 HEAD 缺失、且机制仍然存在**的真实测试覆盖（如上例 h1/h4、A6–A9）。
建议按文件逐个人工过一遍，把仍成立的部分**重新按当前 HEAD 的写法实现**（而不是叠加 8 天前的补丁）。
patch 原文在 `stash@{0}`，取法：`git diff 7ab2b0fd^1 7ab2b0fd -- <file>`。
