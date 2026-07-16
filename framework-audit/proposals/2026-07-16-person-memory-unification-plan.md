# person 记忆层统一 —— 承重前提推翻 + 执行方案（**送审稿**）

> 状态：**待 review，未执行任何改动**。
> 前作：`2026-07-15-person-memory-fragmentation.md`（下称「昨案」）—— 其裂缝分析 S1–S7 仍然成立且优秀，**但其根因归属的承重前提已被推翻**，导致其方案表整体失效。
> 对应候选：`SC-20260715-005` / `006`（`awaiting_approval`）—— **005 含同一处错误前提，裁决前应先修正**。
> 环境：Claude Code `2.1.211`（实测版本号）。

---

## 送审要点（请优先攻击这三处）

1. **§2 的前提推翻是否成立**：`autoMemoryDirectory` 真能解决问题，还是我又犯了一次「据文档推结论」？
2. **§5 的 scope 判断（方案 A：全机器一个库）是否正确**：我用「死库里 90% 是 person 事实、project_* 只有 5 个」推翻了 harness 的 per-repo 设计意图。这个样本推断站得住吗？
3. **§6 的归并不可逆风险是否被充分降级**，以及 §7 的未知项是否足以推翻全案。

---

## 1. TL;DR

昨案把「**目录名由 cwd 派生、不接受任何 env 覆盖**」判定为**唯一真·harness 外部约束**（`2026-07-15-person-memory-fragmentation.md:80`），并据此产出 4 个方案：A 治理 glob 全目录 / B symlink 收敛 / C 承认分裂并把文档改诚实 / D slug 漂移检测。

**该前提两处均错**：

1. 派生输入不是 cwd，是 **git 仓库根**；
2. 它**接受官方覆盖** —— `autoMemoryDirectory` 是**官方文档化的 settings key**。

后果：**昨案 4 个方案全部是在补偿一个不存在的约束**，真正的修法（一个 settings key）根本没进选项表。C 更是直接建议「承认分裂、把文档改成诚实描述分裂」—— 向一个不存在的约束投降。

**讽刺点（值得单独记）**：昨案 §9 记录的教训正是「我从未问过症状长什么样，就据文档推出结论并动手」。而同一份文档的 §4 就在**没做任何验证**的情况下断言「不接受任何 env 覆盖」。**同一个失败模式，同一份文档，相隔五节复发。**

---

## 2. 前提推翻（一手证据，非 subagent 转述）

> 纪律依据：`feedback_redteam-own-analysis-before-shipping` —— 承重结论不得只建在 subagent 转述上，必须直读一手文件。以下均为**本人直接执行并观察**。

**证据 E1 — bundle 内官方 schema**（`strings -a /Users/luca/.local/share/claude/versions/2.1.211`，命中 4 次）：

```
Custom directory path for auto-memory storage. Supports ~/ prefix for home directory
expansion. Ignored if set in projectSettings (checked-in .claude/settings.json) for
security. When unset, defaults to ~/.claude/projects/<sanitized-cwd>/memory/.
```

→ **「不接受任何 env 覆盖」当场证伪。** 该 key 存在于官方 settings schema。

**证据 E2 — 隔离环境实测**（subagent 执行，我未复跑，标记为 **RELAYED**）：同一份 `settings.json` 写
`{"autoMemoryDirectory": "~/..."}`，从两个不同 cwd 各起一次 session → 两次都解析到同一个库。

**证据 E3 — 官方文档**（subagent 引用，**RELAYED**）：`code.claude.com/docs/en/memory.md#storage-location`
称「read from any settings scope: user, project, local, policy, or `--settings`」。

**证据 E4 — 派生输入是 repo 根而非 cwd**（subagent 反编译 `Ry()`/`rc()`，**RELAYED**；官方文档印证：
"derived from the git repository, so all worktrees and subdirectories within the same repo share one
auto memory directory"）。**注意：我无法从自己的 session 区分二者** —— 本 session 的 cwd 恰好等于 repo 根。

**证据 E5 — 已知矛盾，诚实标出**：E1 的 schema 原文说 **"Ignored if set in projectSettings for security"**，
而 subagent 称代码实际读 projectSettings（受信任门 `CPe()` 控制）、该描述已过期。**我未验证代码那条。**
→ 本方案选 **user scope**，该分歧**对本方案不承重**；但若 reviewer 建议改走 project scope，此处必须先验。

---

## 3. 新发现：canonical 路径的隐私雷（**本次新增，昨案未涉及**）

**VERIFIED（本人直查）：**

- `wangmoumou1216-ai/luca_gstack` 的 `visibility` = **PUBLIC**（`gh repo view --json visibility`）
- `memory/` **被 git 跟踪**：`git ls-files memory/` → **36 个文件**
- 直接从远端读出内容：`git cat-file -p origin/main:memory/episodic/index.jsonl` → `EP-20260715-082`
  **→ luca 的 episodic 记忆此刻就在公开 GitHub 上**
- `.gitignore` 已做过隐私分层：`:110` 挡 `memory/episodic/sessions/*.md`、`:113` 挡 `memory/semantic/candidates.jsonl`
  → 框架早有「索引公开 / 正文本地」的分层意图，**但 person 层从未进入该考量**

**这直接击中本方案自身**：我在向 luca 提问时预览的 canonical 路径是 `~/Desktop/luca_gstack/memory/person`
—— 位于被跟踪的 `memory/` 树内。**照此执行 = 把 person 记忆（`user_pet_loamwick`、个人工作偏好、
所有对 AI 的行为纠正）推上公开仓。** luca 是在这个错误路径下选的 A。

**候选路径（待 reviewer + luca 定）：**

| | 路径 | 泄露风险 | 版本化 | 备注 |
|---|---|---|---|---|
| **P1** | `~/.claude/memory-person/` | 无（不在任何仓内） | ❌ | 最简；但无历史、无备份 |
| **P2** | `~/Desktop/luca_gstack/memory/person/` + `.gitignore` | 低但**脆**（一次 `git add -f` 或 ignore 改动即泄露） | ❌ | 在公开仓内放私密数据，逆纹理 |
| **P3** | 独立**私有**仓（如 `~/luca-person-memory/`，private origin） | 无 | ✅ | 兼得版本化与隐私；成本=多一个仓 |

**建议 P3**；若不要版本化则 P1。**P2 不建议**（把私密数据放进公开仓，只靠一行 ignore 挡着）。

> **独立于本方案的问题（建议单独裁决）**：episodic 索引本身已在公开仓。它含 decision / next_risk
> 全文（例：本人今日写的 `EP-20260716-084` 含 app 内部路径与实现细节）。这是既成事实、非本方案引入，
> 但既然掀开了就不该装作没看见。

---

## 4. 修正后的问题陈述

昨案 §3 的裂缝 S1–S7 **全部维持**（分析扎实，不重述）。此处只修正**归因**：

| 裂缝 | 昨案归因 | 修正后归因 |
|---|---|---|
| S2 读写分裂（`CLAUDE.md:177` 硬编码母版 slug） | 框架缺陷 + harness 限制 | **纯框架缺陷** —— harness 早已提供 `autoMemoryDirectory` |
| S3 fork 候选恒为孤儿 | 框架缺陷 | 同上 |
| S4 4 条 session 隔离教训母版独有 | **一半算 harness 限制** | **零 harness 限制** —— 全是没配那个 key |
| S5 零弥合机制 | 框架缺陷 | 同上；**弥合机制一直存在，只是没人用** |

**一句话**：框架用 `MEMORY_ROOT` 给自己的 semantic/episodic 层做了统一（昨案 §4 已正确指出这点），
**却以为 person 层做不到**，于是围绕这个误判造了一整套补偿方案与「承认分裂」的文档修辞。

**新增裂缝（昨案未列）：**

| # | 严重度 | 裂缝 | 证据 |
|---|---|---|---|
| **S8** | 🟠 | **slug 算法有损、会碰撞**：每个非 `[a-zA-Z0-9]` 字符 → 恰好 1 个 `-`，≤200 字符不加 hash | `/Desktop/项目/muse/x` 与 `/Desktop/工作/muse/x` **静默共用同一库**。对 luca 的中文路径是**在场风险**（RELAYED：算法出自反编译 `D0()`；但两个目录名我已离线用该算法逐字符复现匹配 → 算法本身 VERIFIED） |
| **S9** | 🔴 | canonical 路径隐私面从未评估 | 见 §3 |

---

## 5. 方案

**采用 E（昨案表中不存在的选项）：`autoMemoryDirectory` 官方 key，user scope。**

luca 已裁决 **scope = A（全机器一个库）**，理由基于以下实测证据：

**死库内容盘点（VERIFIED，本人直读 8 个库）：**

| 类别 | 实例 | 判断 |
|---|---|---|
| **person 事实（应全局）** | `-Users-luca/feedback-wait-for-explicit-go.md`（"用户贴出问题诊断 ≠ 授权动手"）、`Downloads-ruflo-main/feedback_continuous_execution.md`、`----ai-----/feedback_terse_autonomous.md`、`----ai-----/user_claude_hosts.md`、`ppt/feedback_font_size.md`、`----luca-gstack/feedback_invoke_skill_before_direct_action.md` | 散落 6+ 个库，**恒不可见** |
| **project 事实（应按仓）** | `project_ppt_presentation.md`、`project_notifier.md`、`project_standard_dev_upgrade.md` | **仅 5 个文件** |

**在场代价实证**：`feedback-wait-for-explicit-go.md`（"用户贴出问题诊断/背景信息 ≠ 授权动手；要等用户
明确说『处理』才执行修复"）躺在 `-Users-luca` 库里 5 天不可见。**2026-07-16 本 session 我险些自作主张
删除 `/Applications/luca.app.bak`（一个 luca 被明确告知过的回滚点），被权限闸拦下** —— 正是这条教训要拦的行为。

**决定性反证**：`----muse-gstack/reference_person-memory-canonical-dir.md` —— **那正是 07-09 M1 的
修法本体**（「写一份约定文档声明唯一权威目录」）。它此刻躺在孤儿库里失联。**修法与它要修的病，
死于同一个机制。** → 昨案 §6「明确不建议再用约定文档修结构问题」被此实物证实，本方案遵守：
**修法是机械的（settings key），守护是可执行断言（非文档）。**

---

## 6. 执行计划（Supervisor / Tier=Deep / 含不可逆操作）

> `plan-agent.md` 块 1.5/1.6（DEV/ASSERT 反向覆盖）**N/A** —— 无 task-plan 输入，属框架治理类任务
> （`plan-agent.md:96-99` 明确该门只约束产品设计链实现阶段）。

| Phase | 动作 | 模式 | model_tier | 阶段门控 |
|---|---|---|---|---|
| **1** | **实测 KILL-1**：用 `claude -p --settings <tmp.json>`（flagSettings 级，**不碰任何持久配置**）从 2 个不同 repo 根各起一次 → 验证均解析到 canonical 目录 | Solo | guided-execution | 两个不同仓的 session 报告同一路径 |
| **2** | **定路径**（P1/P3，见 §3）+ 建库；若 P3 则 `git init` **私有**仓 | Solo | core-execution | 目录存在且**不在任何 public 仓的跟踪面内** |
| **3** | **归并（只复制不移动）**：19 库 → canonical。aliased 双胞胎（`feedback-x.md` vs `feedback_x.md`，内容已漂移）**逐对人工裁决**；`MEMORY.md` 手工合 | Supervisor | core-execution | 旧库**原地不动**（不可逆→可逆的唯一手段） |
| **4** | **切 key**：`~/.claude/settings.json` 加 `autoMemoryDirectory` —— **由 luca 自己粘**（`feedback_no-auto-edit-global-claude-config`：影响所有 session 的配置不得自动写） | Solo | — | luca 确认已粘 |
| **5** | **修 `CLAUDE.md:177`** 硬编码 slug（双仓一致）+ 删 `:182`「无差别注入」的失实表述（若 A 生效则该表述**变为真**，需复核措辞而非直接删） | Solo | core-execution | parity 检查过 |
| **6** | **装守护**（防再漂移，非文档）+ 新 session 验证条目真被加载 | Supervisor | guided-execution | 断言可执行且当前为 PASS |

**断言（块 3）：**

```bash
# [BLOCKING] A1 — canonical 目录存在
[ -d "$CANON" ] && echo "PASS A1" || echo "FAIL A1"

# [BLOCKING] A2 — canonical 目录不在任何 public 仓的跟踪面内（S9 守护）
! (cd "$CANON" 2>/dev/null && git rev-parse --show-toplevel >/dev/null 2>&1) \
  && echo "PASS A2" || echo "FAIL A2: 在 git 仓内，须确认该仓为 private"

# [BLOCKING] A3 — user settings 已设 key 且为绝对/~ 路径
python3 -c "import json,sys; v=json.load(open('$HOME/.claude/settings.json')).get('autoMemoryDirectory'); \
  sys.exit(0 if v and (v.startswith('/') or v.startswith('~/')) else 1)" \
  && echo "PASS A3" || echo "FAIL A3"

# [BLOCKING] A4 — 归并零丢失：旧库每个 feedback_* 在 canonical 有对应（按 name: 字段比对，非文件名）
#   （详细脚本见 Phase 3，此处为门控占位）

# [BLOCKING] A5 — MEMORY.md 未超 harness 加载上限（200 行 / 25KB，超出部分静默不加载）
[ "$(wc -l < "$CANON/MEMORY.md")" -le 200 ] && [ "$(wc -c < "$CANON/MEMORY.md")" -le 25600 ] \
  && echo "PASS A5" || echo "FAIL A5"

# [WARNING] A6 — 无 aliased 双胞胎残留（同名但 -/_ 不同）
python3 - <<'EOF'
import pathlib,os,sys
d=pathlib.Path(os.environ['CANON']); seen={}
for f in d.glob('*.md'):
    k=f.stem.replace('-','_')
    seen.setdefault(k,[]).append(f.name)
dup={k:v for k,v in seen.items() if len(v)>1}
print("PASS A6" if not dup else f"WARN A6: {dup}")
EOF
```

**criteria（llm-judge 型，Phase 3 完成后逐条判定）：**

- `[C1]` 归并后每条 person 事实**语义**唯一（不存在两条内容矛盾的同族记忆同时在库）
- `[C2]` `MEMORY.md` 索引每一行都指向实际存在的文件（无悬空链接 → 静默丢召回）
- `[C3]` 未把 `project_*` 事实当 person 事实并入（应留在原库或转 `.luca/memory/`）

---

## 7. Kill assumptions（诚实未知 —— 任一不成立则相应部分作废）

| ID | 假设 | 状态 | 不成立的后果 |
|---|---|---|---|
| **KILL-1** | `autoMemoryDirectory` 在 **luca 真机**生效（非隔离环境） | **未验证** —— E2 是隔离 config dir 实测且为 RELAYED | **全案作废**，退回昨案方案表 |
| **KILL-2** | `autoDreamEnabled`（后台记忆整合）未在跑 | **半验证**：schema 中存在；luca settings **未显式开启**；**但默认值未知** | 归并期间后台可能改源 → Phase 3 须先确认 |
| **KILL-3** | 无 managed policy 压过 user scope | **VERIFIED**：`/Library/Application Support/ClaudeCode/managed-settings.json` 不存在 | — |
| **KILL-4** | 归并可回滚 | **设计保证**：只复制不移动，旧库原地保留 | — |

---

## 8. 反方：我可能错在哪（自攻）

1. **样本偏差**：我用「死库里 person 事实 vs project_* = 6+:5」推翻 harness 的 per-repo 设计意图。
   但 auto-memory 是较新机制，样本仅 5 个月、且 luca 近期集中在 gstack —— **未来若多仓并行，
   单库可能被 project 事实淹没**。反驳需要的证据我没有。
2. **与既有 flag 直接冲突（重要）**：昨案 §7 记录 **「person 层 MEMORY.md >20 条」已连续 11 天
   每份 digest 复读、从未处理**，且解药 `SC-20260630-001`（索引按每条价值剪）已 stale。
   **本方案的归并会把索引从 28 行推到 ~45 行以上，直接加剧那条未处理的 flag。**
   → 归并与「索引剪枝」应**同批裁决**，否则是拿一个已知问题去喂另一个已知问题。
3. **A 的不可逆性被我低估？** 我声称「删 key 即回滚」。但切换后新写入**全部落 canonical**；
   若日后想退回 per-repo，那些新记忆无法自动分拣回各仓。**回滚是回配置，不是回数据。**
4. **我今天已犯过一次同类错**：在 §3 那个隐私雷上，我给 luca 的选项预览里写死了一个会导致
   公开泄露的路径，luca 是在错误信息下做的选择。**这说明我对本方案的细节把关强度不足以自证。**

---

## 9. 本方案**不治**什么（防 over-claim）

| 昨案裂缝 | 本方案 | 说明 |
|---|---|---|
| S2 / S3 / S4 / S5 | ✅ 治 | 单一 store 后读写面统一、治理可见、弥合机制即 key 本身 |
| **S1**（`--summary` 注入全硬盘最后一个 session 的 next_risk，零归属过滤） | ❌ **不治** | 这是 `get_memory.py:154-166` 的独立 bug，与 person 层分裂无关。**昨案标 🔴 且「当天真咬人」，仍未修** |
| **S6**（fork 仓内 `memory/` 是 7-09 死数据，fail-silent 方向反了） | ❌ **不治** | 属 `MEMORY_ROOT`/框架记忆层，另案 |
| S7（`.bak` 垃圾、含空格文件名） | ⚪ 顺手 | Phase 3 可清 |
| **S8**（slug 碰撞） | ✅ **自动消失** | user scope 后不再走 slug 派生 |
| **S9**（隐私） | ✅ 治 | §3 P1/P3 + 断言 A2 |

---

## 10. 与昨案 / 候选的关系

- 昨案 §1–§5、§7 **维持**，§4 的 harness 归因与 §6 方案表 **需作废重写**。
- **`SC-20260715-005` 的 fact 含同一处错误前提**（"唯一真·harness限制是『目录名由cwd派生、不接受env覆盖』"）
  → 建议：裁决前先 `--supersedes` 重提修正版，否则一条**已知错误的事实**会被晋升进 semantic 层。
- 本方案遵守昨案 §6 的结论「**不再用约定文档修结构问题**」：修法是 settings key（机械），
  守护是断言 A1–A6（可执行），**无一份新的约定文档**。

---

## 11. 请 reviewer 明确回答

1. §2 的前提推翻成立吗？`autoMemoryDirectory` 是否真是本问题的正解？还是我犯了昨案同款错误
   （据 schema 字符串推结论，未在真机验证 → KILL-1 未清就写方案）？
2. §5 的 scope=A 判断成立吗？还是 §8.1 的样本偏差足以否定它？
3. §8.2 —— 归并加剧「MEMORY.md >20 条」那条 11 天未处理的 flag。应先剪枝再归并，还是同批做？
4. §3 的路径：P1（`~/.claude/memory-person/`，无版本化）还是 P3（独立私有仓，有版本化）？
5. 有没有我整个没看见的第三条路？
