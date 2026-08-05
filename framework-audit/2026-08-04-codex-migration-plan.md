# luca_gstack → Codex 迁移计划（2026-08-04）

> 模式：Sequential Chain + Phase 内 Parallel｜Tier：Standard｜model_tier：core-execution
> 溯源：`inline: "我要全面的转战codex；你看看我的luca gastack现在的框架是能直接全面的用codex吗"`
> + `inline: "系统全面的评估，以及解决…刚才你的方案，是不是有缺陷"`

---

## 块 0 — 前提门

### 1. 该不该解

**部分该解，且必须分层。** 诉求本身成立（Codex 侧生态已成熟：hooks/subagents/skills 全 stable），
但**硬前提不在本计划控制内**：luca 的 ChatGPT 订阅已于 2026-05-16 到期，账户现为 `free`，
Codex 跑不了任何主力模型（实测三个历史可用模型名全被服务端拒）。

处置：**做配置层接线（不依赖订阅、可离线验证），不做需要真实 session 才能验证的改动。**
接线是纯新增，订阅恢复当天即可用；订阅不恢复也不影响 Claude Code 现状。

### 2. 更小的替代（已采纳为主方案）

全量迁移（重写 33 个 skill、复制到 Codex 目录）**不做**。改用**薄接线**：
- 软链而非复制 → 一次性规避 31 个 SKILL.md 里 70 处 `.claude/skills/` 路径引用失效
- 软链而非复制 → 规避 2026-06-30 `b2b83d3` 已实证失败的副本漂移（58 ⊂ 96，冻结于 5/27）
- 关键洞察：**Codex 与 Claude Code 跑同一个仓库**，`.claude/` 在 Codex 下可读，缺的只是发现机制

预计达成 ≥80% 效果，改动面从 ~40 文件降到 ~10。

### 3. 默认产出形态的偏差

本计划默认产出是「新增接线文件」，不含任何删除/关闭防护 → 不触发默认-REFUTED 红队条款。
秤压向「多建」而非「多删」，风险是接线冗余而非防护丢失，可接受。

### KILL-ASSUMPTION

- **KILL-1（未解决）**：ChatGPT 订阅恢复。不恢复 → Phase 1-3 产物无法被真实使用，
  但不产生负债（纯新增）。**本计划不等待此项，但所有端到端验证挂 BLOCKED。**
- **KILL-2（已证伪，据此调整）**：~~Codex 无 hook 强制能力~~ → 实测 `hooks`/`multi_agent`
  feature 均为 stable+enabled，`permissionDecision:deny` 可用。harness.mjs 原假设错误。

---

## 上一轮方案的缺陷（红队自审，逐条已验证）

| # | 缺陷 | 性质 | 本计划处置 |
|---|---|---|---|
| D1 | 称 hooks「只差搬运」 | **硬伤** | 错。Codex `tool_name` 是 `shell`/`apply_patch`，settings.json 的 `^(Write\|Edit\|...\|Bash)$` 一个都不匹配 → 搬过去静默不触发。Phase 3 专门做 matcher 映射 |
| D2 | 未发现 hook trust 机制 | 漏项 | Codex 有 persisted hook trust + `--dangerously-bypass-hook-trust`。仓库级 hooks 首次需授信，写进交付说明 |
| D3 | 未发现订阅/模型阻塞 | **致命** | 整个前提未验。已补测并升为块 0 KILL-1 |
| D4 | 只读 AGENTS.md 前 60 行就断言「已经通了」 | 违反自有纪律 | 违反「承重结论须直读一手文件」。已读全 730 行结构：实为 11 节完整契约，含 §4.8 Governance Parity、§6 Cross-Model、§11 Non-Goals，且已诚实标注 unverified 点 |
| D5 | 未测 additionalContext 长度 | 漏项 | 已测：route-guard 339B（安全）、session-restore 4160B/resume（**逼近 Codex ~2500 token 上限**，startup 模式更长）。列入 Phase 3 |
| D6 | 结尾把判断推回用户（问句） | 违反 no-confirmation-loops | 本次先给唯一方案再执行 |
| D7 | 未考虑双检出下 Codex 配置放哪 | 漏项 | 决策：接线文件进仓库（`main` 单真值源，双检出自动同步），不进 `~/.codex`（那是机器级、不随仓库走） |

---

## 块 1 — 复杂度

```
复杂度模式: Sequential Chain（Phase 内 Parallel Fan-out）
理由: Phase 2/3 依赖 Phase 1 建立的落点；Phase 内多文件互不干扰
需要用户确认: 否（纯新增 + 可离线验证；用户已授权「计划没问题就执行」）
任务规模 Tier: Standard（U-block 7 个，文件改动 ~10）
```

---

## 块 2 — Phase 分解

### Phase 1 — Codex 发现层接线（task_execution，model_tier: core-execution）

纯新增，零现有行为改动。

```
U-001: .agents/skills/ 建软链指向 .claude/skills/office/ 各 skill
  Source: inline「全面的用codex」
  Dependencies: None
  Files: .agents/skills/<name> ×33（symlink）
  Approach: 逐 skill 建相对软链；保留既有 magicpath 实体目录不动
  Verification: 每条软链 readlink 可解析且目标含 SKILL.md
  Status: PLANNED

U-002: .codex/hooks.json 正式版（替换探针版）
  Source: inline「全面的用codex」
  Dependencies: None
  Files: .codex/hooks.json
  Approach: 按 Codex 事件名注册 6 个现有 hook 脚本；matcher 用 Codex 真实 tool_name
  Verification: node -e JSON.parse 合法 + 每个 command 指向的脚本存在
  Status: PLANNED

U-003: .codex/config.toml 注入仓库级 env
  Source: .claude/settings.json 的 env 段（Codex 不读该文件）
  Dependencies: None
  Files: .codex/config.toml
  Approach: MEMORY_ROOT / ROUTE_GUARD_HEAVY_SKILLS 写入 shell_environment_policy
  Verification: TOML 合法 + 键名与 settings.json 一致
  Status: PLANNED
```

阶段门控：三个 U-block 的 Verification 全 PASS。

### Phase 2 — harness.mjs 能力表按实测重写（依赖 Phase 1 无）

```
U-004: capabilities() 按实测修正
  Source: inline「是不是有考虑不周的地方」+ 实测证据
  Dependencies: None
  Files: .claude/hooks/lib/harness.mjs
  Approach: blockVerb/writeHook 对 Codex 改判可用（实测 deny 可用）；
            inputMutation 保持不可用（openai/codex#18491 OPEN，运行时显式拒）；
            新增 preToolScope 表达「仅 shell+apply_patch 有分发」
  Verification: 纯函数，写离线单测喂 3 种 env 断言输出
  Status: PLANNED
```

### Phase 3 — hook 脚本 Codex 适配（依赖 Phase 2 能力表）

```
U-005: session-sync 的 Stop 强制动词适配
  Files: .claude/hooks/session-sync.mjs
  Approach: Codex 下 decision:block → continue:false + stopReason（能力存在，字段名不同）
  Verification: 构造 Codex 形 stdin，断言 stdout JSON 含 continue:false
  Status: PLANNED

U-006: project-scope-guard 的 matcher/动词适配
  Files: .claude/hooks/project-scope-guard.mjs
  Approach: 识别 tool_name=shell/apply_patch；updatedInput 不可用时降级为 deny（非静默 advisory）
  Verification: 构造 Codex 形 stdin，断言未绑定时输出 deny 而非静默放行
  Status: PLANNED

U-007: session-restore 输出预算控制
  Files: .claude/hooks/session-restore.mjs
  Approach: Codex 下按 additionalContext 上限裁剪（保留启动协议关键项，截断 PROGRESS 明细）
  Verification: Codex 形调用输出 < 2500 token 等值字节数
  Status: PLANNED
```

### Phase 4 — 端到端验证（**BLOCKED on KILL-1**）

真实 `codex exec` 跑通 → 探针确认 hook 触发/env/tool_name。
订阅恢复前无法执行，**不得以离线验证冒充**。

---

## 块 3 — 断言列表

```bash
# [BLOCKING] A-001 — .agents/skills 软链数 ≥ 30 且全部可解析
find .agents/skills -maxdepth 1 -type l | while read l; do [ -f "$l/SKILL.md" ] || exit 1; done \
  && [ $(find .agents/skills -maxdepth 1 -type l | wc -l) -ge 30 ] \
  && echo "PASS A-001" || echo "FAIL A-001"

# [BLOCKING] A-002 — .codex/hooks.json 是合法 JSON
node -e "JSON.parse(require('fs').readFileSync('.codex/hooks.json'))" && echo "PASS A-002" || echo "FAIL A-002"

# [BLOCKING] A-003 — hooks.json 引用的每个脚本都存在
node -e "
const h=JSON.parse(require('fs').readFileSync('.codex/hooks.json')).hooks;
const fs=require('fs');let bad=[];
for(const ev of Object.keys(h))for(const g of h[ev])for(const k of g.hooks){
  const m=k.command.match(/([^ ]+\.mjs)/); if(m&&!fs.existsSync(m[1]))bad.push(m[1]);}
if(bad.length){console.error(bad);process.exit(1)}
" && echo "PASS A-003" || echo "FAIL A-003"

# [BLOCKING] A-004 — .codex/config.toml 合法且含 MEMORY_ROOT
python3 -c "import tomllib;d=tomllib.load(open('.codex/config.toml','rb'));import sys;sys.exit(0 if 'MEMORY_ROOT' in str(d) else 1)" \
  && echo "PASS A-004" || echo "FAIL A-004"

# [BLOCKING] A-005 — harness 能力表离线单测通过
node scripts/test-harness-codex.mjs && echo "PASS A-005" || echo "FAIL A-005"

# [BLOCKING] A-006 — 既有 hook 回归未破（Claude 路径不受影响）
node scripts/test-hooks.mjs && echo "PASS A-006" || echo "FAIL A-006"

# [BLOCKING] A-007 — project-scope-guard 回归
node scripts/test-project-scope-guard.mjs && echo "PASS A-007" || echo "FAIL A-007"

# [WARNING] A-008 — 未新增 .claude/skills 的复制副本（防重蹈 b2b83d3）
[ $(find .agents/skills -maxdepth 1 -type d ! -name skills ! -name magicpath | wc -l) -eq 0 ] \
  && echo "PASS A-008" || echo "WARN A-008"
```

### criteria（完成后逐条判定）

- `[C1]` 每条 Codex 侧能力断言都有实测或一手源支撑，无凭记忆断言（防 D3 复发）
- `[C2]` 未改动任何 Claude Code 现有行为——既有 hook 测试全绿（防迁移伤主力）
- `[C3]` 无法验证的项明确标 BLOCKED，未以离线验证冒充端到端（防「自陈缺陷≠处理缺陷」）
- `[C4]` 未新建任何与 `.claude/skills` 并存的副本（防 b2b83d3 漂移复发）

---

## 块 4 — 失败策略

BLOCKING FAIL → 该 Phase 停止修复后继续。
Phase 4 恒为 BLOCKED（KILL-1），收尾状态最高为 `DONE_WITH_CONCERNS`，不得报 DONE。

---

## 执行结果与计划偏差对账（2026-08-04 收尾）

计划 ≠ 实际的三处，均为执行中发现更优解后的**主动收敛**，逐条记录：

| 计划项 | 实际 | 原因 |
|---|---|---|
| Phase 3 逐个改 5 个 hook 的输入判断与输出格式 | **改为单一 adapter**（`.codex/codex-hook-adapter.mjs`），6 个 hook 脚本零改动 | luca 明确要求「不要缩减现有框架的任何逻辑」。逐个改 = 在 6 个文件各插 harness 分支，6 处回归风险且 Codex 分支缺测；adapter 把差异收敛到 1 个文件，回退只需从 hooks.json 摘掉包装 |
| U-007 session-restore 输出预算裁剪 | **取消，未做任何裁剪** | 实测 `additionalContextLimit` 可per-hook配置且 `0 = 完整直传不截断`；超限也非丢弃而是存盘+预览。原计划的「裁剪」属缩减，问题实际不存在 |
| U-003 建 `.codex/config.toml` | **未建** | env 已由 hooks.json 内联注入（更可靠，不依赖 Codex 的 env 策略）；再建一份会与 `~/.codex/config.toml` 产生优先级混淆。属简化，未削减任何功能 |

### 执行中发现的、计划未预见的问题

1. **连锁失效（最严重）**：`post-edit.mjs` 用 `/^(Write|Edit|MultiEdit|NotebookEdit)$/` 写
   `.session-edit-count`，而 `session-sync.mjs` 靠该计数判断「本 session 有无实质工作」。
   Codex 传 `apply_patch` → 计数恒 0 → **Stop 自成长捕获永不触发**。单修任一端无效。
   已由 adapter 的入向 tool_name 归一化解决，测试 B1/B2 覆盖。
2. **hook trust**：Codex 对仓库级 hooks 有 persisted trust 机制，首次需授信
   （`--dangerously-bypass-hook-trust` 可绕过）。交付说明须包含。
3. **账户阻塞**：ChatGPT 订阅 2026-05-16 到期、现为 free，主力模型全部被服务端拒绝。
   活体验证因此 BLOCKED（非本计划可解）。

### 验收状态

| 断言 | 结果 |
|---|---|
| A-001~A-004（接线完整性） | 并入 `verify-codex-wiring.mjs` S1-S8，10/10 PASS |
| A-005（harness 离线单测） | `test-harness.mjs` 13/13 PASS（旧断言全保留，零语义改动） |
| A-006/A-007（既有 hook 回归） | `check:hooks` 全绿 + `test-auto-open` 7/7 |
| A-008（无副本漂移） | PASS：`.agents/skills` 下 32 条软链 + 1 实体，零复制副本 |
| 全仓 verify.sh | PASS=73 FAIL=0 WARN=1（WARN 为 non-blocking ADR 目录，与本次无关） |
| **Phase 4 活体验证** | **BLOCKED**（KILL-1）。已做成 `verify-codex-wiring.mjs` 活体段，订阅恢复后一键跑 |

**收尾状态：`DONE_WITH_CONCERNS`** —— 静态与行为验收全绿，但端到端未验证，按块 4 规定不得报 DONE。

### criteria 判定

- `[C1]` 每条 Codex 能力断言有实测/一手源支撑 → **pass**（`codex features list`、`codex doctor`、
  openai/codex#18491、官方 hooks 文档；三个模型名的拒绝为本机实测）
- `[C2]` 未改动 Claude 现有行为 → **pass**（harness.mjs 只增字段不改旧值；6 个 hook 零改动；
  回归全绿含 E1/E2 零回归对照）
- `[C3]` 无法验证的项明确标 BLOCKED，未以离线冒充端到端 → **pass**（脚本硬编码
  「BLOCKED ≠ 通过」提示）
- `[C4]` 未新建与 `.claude/skills` 并存的副本 → **pass**（全部软链）

---

## 块 5 — 出门自检

- [x] 块 0 前提门已答（该不该做 / 更小替代 / kill-assumption 已列）
- [x] 每个 U-block 有 Source 溯源
- [x] 不可逆操作：无（纯新增 + 可 git 回滚的脚本改动）
- [x] 复杂且新颖 → 研究已完成（Codex 一手文档 + openai/codex issue + 本机实测探针）
- [x] 每个 Phase 的 model_tier 已填
- [x] 设计产出 Phase：N/A（框架工程任务）
