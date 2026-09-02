# Tech Spec — Cross-project read grants

> Status: `IMPLEMENTED`（task-specific gates PASS；acceptance 见 `HANDOFF.md`）
> SHIPPED: 2026-09-02 / acceptance: `HANDOFF.md`
> Input mode: `conversation_synthesis`
> Repository baseline: `a7d5fe35caa43a235e0f364ba1db1ad8517eaca8`
> Scope: luca_gstack framework/meta；不使用下游项目 `docs/`，不改变当前项目写入身份

## 1. Spec Purpose

本规格为 luca_gstack 增加一个受控能力：会话仍只有一个可写项目，但用户可以显式授权当前
turn 或当前 session 只读引用另一个项目中的精确文本文件或目录。

它解决的是“合法只读依赖没有入口”，不是现有隔离器失效。现有
`project-scope-guard` 的跨 session 写隔离、共享 `docs/state/topic` 重定向、路径穿越防护和
项目根宽搜拒绝全部保留。

### 1.1 Conversation Source Register

| ID | 级别 | 已定案事实 | 来源 |
|---|---|---|---|
| CONV-001 | MUST | 一个 session 只能有一个写入项目，read grant 不得成为第二个 binding | 用户确认的“单一写项目 + 临时只读引用”方案 |
| CONV-002 | MUST | 用户明确授权后，可读取另一个项目中的精确来源 | 用户要求解决跨项目资料访问问题 |
| CONV-003 | MUST | 默认授权精确文件；目录授权必须明确表达 | 用户批准的方案边界 |
| CONV-004 | MUST | 默认 grant 仅本 turn；只有明确说“本会话”才可跨 turn | 最小权限裁决 |
| CONV-005 | MUST | grant 绑定 session、turn generation、prompt hash 和当前 binding epoch | 会话隔离目标与现有 pin 合同 |
| CONV-006 | MUST | grant 永不允许跨项目写入、全项目根扫描、路径穿越或 symlink 逃逸 | 现有守卫安全边界 |
| CONV-007 | MUST | Claude 与 Codex 必须具有同一授权语义 | 仓库双 harness 合同 |
| CONV-008 | MUST | Codex 不通过猜测 Bash 是否只读来授权，只能使用 typed broker | Bash 可组合读写，静态判定不可靠 |
| CONV-009 | MUST | 不使用永久白名单、自动复制、自动切项目作为解决方案 | 用户批准的架构裁决 |
| CONV-010 | MUST | 当前项目外、但不在 `PROJECTS_ROOT` 下的既有读取行为本期不改变 | 本问题只修复跨项目引用能力 |
| CONV-011 | MUST | grant 机制异常时，只让跨项目读取 fail-closed，不影响当前项目正常读写 | 守卫可用性约束 |
| CONV-012 | DEFERRED | 图片、二进制、PDF 及未经过本地 path hook 的 MCP 文件入口 | 本期聚焦文本文件与文本目录 |

### 1.2 Eligibility Gate

- 工程目标和边界已明确：PASS。
- 无待定产品、UI、交互或品牌决策：PASS。
- 每条 MUST 均有用户对话或仓库证据来源：PASS。
- 每条 MUST 均可落为行为级验收：PASS。

## 2. Upstream Conflict Register

| 冲突编号 | 冲突描述 | 来源 A | 来源 B | MVP 裁决 | 理由 |
|---|---|---|---|---|---|
| C-001 | “给绝对路径即可跨项目读”与当前行为冲突 | 旧口头说明 | `project-scope-guard.mjs` direct path deny | 以代码事实为准 | 当前 guard 对另一个项目的绝对路径仍拒绝 |
| C-002 | grant 放进 binding state，还是保持正交 | 单状态文件更少 | binding 是唯一写身份 | 独立 sidecar | 不制造第二项目身份，也能服务 `NO_PIN` meta 会话 |
| C-003 | 直接允许只读 Bash，还是 typed broker | 命令更自然 | Bash 可含管道、重定向、解释器和复合副作用 | typed broker | 接口小、可测、失败时不回退 raw Bash |
| C-004 | turn 与 session 生命周期 | session 更方便 | turn 权限更小 | turn 默认，session 显式 opt-in | 权限时长由用户措辞决定，不静默扩大 |

## 3. Architecture View

### 3.1 技术栈约束

| 约束 | 状态 |
|---|---|
| Node.js ESM，与现有 hooks/scripts 同栈 | MUST |
| `.session-project-*` schema 与唯一写 binding 语义不变 | MUST |
| UserPromptSubmit 是唯一 grant issuer | MUST |
| PreToolUse 是 grant consumer/enforcement point | MUST |
| 状态原子写入、权限 `0600`、缺失或损坏时 fail-closed | MUST |
| 不新增网络依赖、数据库、daemon 或永久配置 | MUST |
| 现有 Claude/Codex hook 注册尽量不变 | SHOULD；只有工具覆盖实证不足时才修改 |

### 3.2 数据模型

```ts
type ReadGrantSetV1 = {
  schema_version: 1;
  session_id: string;
  generation: number;
  binding: null | {
    project: string;
    epoch: number;
    realpath: string;
    dev: number;
    ino: number;
  };
  grants: ReadGrantV1[];
};

type ReadGrantV1 = {
  id: string;                    // 不可猜测的随机 ID
  authority: {
    turn_id: string;
    turn_generation: number;
    prompt_sha256: string;       // 每条 grant 独立溯源；不保存原始 prompt
  };
  lifetime: "turn" | "session";
  kind: "file" | "directory";
  operations: ("read" | "list" | "search")[];
  requested_path: string;
  canonical_realpath: string;
  project: { name: string; realpath: string; dev: number; ino: number };
  created_at: string;
};

type ReadTurnWitnessV1 = {
  schema_version: 1;
  session_id: string;
  turn_id: string;
  generation: number;
  open: boolean;
};

type ReadDenyLatchV1 = {
  schema_version: 1;
  session_id: string;
  reason: "witness-publish-failed" | "witness-close-failed";
  created_at: string;
};
```

Sidecar 固定为：

```text
.claude/.session-read-grants-<sid>
.claude/.session-read-turn-<sid>
.claude/.session-read-deny-<sid>
```

约束：

- 不进入 `.session-project-*`，不增加新的 project state。
- sidecar 路径加入 `.gitignore`，不得被提交。
- sidecar 每条 grant 保存自己的签发 turn 与 prompt hash，不保存完整用户原话；session grants
  跨 prompt 合并时不得丢失或覆盖各自 authority。
- 当前 turn 变化时删除 turn grant；project/epoch 变化时全部 grant 立即失效。
- read-turn witness 与 grant sidecar 独立：每次新 prompt 先原子发布新的 `turn_id + generation + open`，
  grant 逐条引用该 generation。它是 `NO_PIN` meta session 的独立 turn-lifecycle 真值。
- deny latch 是机械 fail-closed 状态：publish/close 事务开始前必须先原子创建；consumer 先查
  latch，存在即拒绝全部 grant。只有新状态全部成功发布后才可删除 latch；
  latch 删除失败继续 deny，不得为可用性绕过。
- session grant 只在用户明确要求时产生；SessionEnd 清除。
- 过期 grant sidecar 即使物理残留，也必须因 read-turn witness 已关闭、generation 不符或
  session/turn/binding 校验失败而不可用。

### 3.3 Module Tree

```text
GrantAuthority
└── route-guard.mjs
    ├── 识别显式只读指令与精确路径
    ├── 确定 file/directory、operations、lifetime
    └── 发布 prompt-bound grant

ProjectReadGrants Module
└── .claude/hooks/lib/project-read-grants.mjs
    ├── grant sidecar + 独立 read-turn witness + deny latch 原子生命周期
    ├── binding/project identity 校验
    ├── canonical path confinement
    └── authorizeRead 公共 seam

ScopeEnforcer Adapter
└── project-scope-guard.mjs
    ├── Claude Read/Grep/Glob 消费 grant
    └── Write/Edit/apply_patch/raw Bash 始终不消费 grant

CodexReadBroker Adapter
└── scripts/project-read.mjs
    └── bounded read/list/search；不接受 shell 组合语义

Lifecycle Adapters
├── session-sync.mjs（非阻塞 Stop 关闭 turn 时：撤销 turn grants）
└── session-end.mjs（SessionEnd：撤销全部 grants）
```

### 3.4 Service Boundaries

1. `route-guard` 只在 UserPromptSubmit 中签发 grant。agent 生成的 Bash、补丁或环境变量不能创建、
   延长或扩大 grant。
2. MVP 只接受四种严格指令：`只读引用:`、`只读引用目录:`、`本会话只读引用:`、
   `本会话只读引用目录:`（半角/全角冒号均可），后接一个明确绝对路径。含空格路径必须置于
   反引号或引号内；普通的“读取/参考/搜索”提及不等价于授权。无法唯一解析时不签发并返回提示。
3. 文件 grant 固定 `operations=[read]`、`lifetime=turn`。目录 grant 必须明确说“目录”，并固定为
   `operations=[read,list,search]`；这些操作仍受同一目录 confinement 和输出上限约束。
   `lifetime=session` 必须明确出现“本会话”。
4. grant 目标必须位于 `PROJECTS_ROOT/<other-project>/...`。当前 binding 内路径不需要 grant；
   framework root 沿用既有例外；`PROJECTS_ROOT` 和单个 project root 本身永远不可授权。
5. `.git/**`、`.luca/**`、`.claude/.session-*` 与共享 display aliases 属于控制平面，read grant 不得覆盖。
6. 每次消费都重新验证项目 identity、canonical realpath、symlink/traversal 和 grant 生命周期。
7. 任一验证失败均只返回 deny；不得改走 copy、switch、raw Bash 或共享软链。

## 4. Interface Contracts

### 测试 seam 清单

- Seam S-1：`ProjectReadGrants.authorizeRead`，调用者和测试共享同一策略接口。
- Seam S-2：UserPromptSubmit issuer，验证“谁能签发、签发什么”。
- Seam S-3：Claude native path adapter 与 Codex broker adapter，证明同一 policy 有两个真实 adapter。
- Seam S-4：Stop/SessionEnd lifecycle，验证权限不会跨边界残留。

### IF-001 — reconcilePromptGrants

```ts
reconcilePromptGrants(input: {
  sessionId: string;
  turnId: string;
  prompt: string;
  binding: ProjectBinding | null;
}): { generation: number; issued: GrantSummary[]; hints: string[] }
```

- 调用者：`route-guard.mjs`。
- 行为：清除旧 turn grants、验证仍合法的 session grants、解析并发布本 prompt 新 grants。
- 错误：路径缺失、歧义、不存在、控制平面、root grant、symlink 或身份异常时不签发；返回可读 hint。
- 非副作用合同：不得 switch/create project、复制目标、写永久 allowlist 或修改 project binding。
- 来源：CONV-003/004/005/006。

### IF-002 — authorizeRead

```ts
authorizeRead(input: {
  sessionId: string;
  turnId?: string;
  binding: ProjectBinding | null;
  operation: "read" | "list" | "search";
  toolName: string;
  targetPath: string;
}): { allowed: true; grantId: string; canonicalPath: string }
 | { allowed: false; reason: string };
```

- 调用者：`project-scope-guard.mjs`、`project-read.mjs`。
- 行为：同一公共 interface 负责 grant、lifetime、binding、identity 和 confinement。
- 错误：sidecar 缺失/损坏、错误 session/turn/epoch、operation 不匹配、file sibling、目录逃逸均 deny。
- 来源：CONV-001/005/006/007/011。

### IF-003 — closeGrants

```ts
closeGrants(input: {
  sessionId: string;
  scope: "turn" | "session";
  generation?: number;
}): { revoked: number; remaining: number }
```

- 只有 `session-sync` 已判定本次 Stop 为“非阻塞且真正关闭 TURN_ACTIVE”的边界时才撤销 turn grants；
  被 Stop hook 阻塞的回合保持 `TURN_ACTIVE`，同时保留 turn grants。SessionEnd 撤销全部 grants。
- 关闭顺序固定为：先原子创建 deny latch，再关闭独立 read-turn witness，再清理 grant sidecar，
  最后删除 latch。grant sidecar 清理失败时，
  stale grant 仍因 witness `open=false`/generation 不符而不可用；witness 关闭失败则不得声称回合授权已关闭，
  必须保留预置 deny latch、留诊断并拒绝进入“清理成功”状态。
- 新 prompt 发布顺序为“预置 deny latch → 写新 grant set → 写新 witness → 清 deny latch”；任一步失败
  或进程中止都保留 latch。
- `authorizeRead` 每次先查 deny latch，再读取独立 witness；不接受 grant sidecar 内的自证 lifecycle 字段。
- 来源：CONV-004/005/011。

### IF-004 — Codex typed broker

```text
node scripts/project-read.mjs read   --cap <sid:grant-id> [--relative <safe-path>]
node scripts/project-read.mjs list   --cap <sid:grant-id> [--relative <safe-path>]
node scripts/project-read.mjs search --cap <sid:grant-id> --pattern <data>
```

- 整条 Bash 必须是一个 argv 命令；禁止管道、重定向、控制操作符、命令替换和复合命令。
- `read` 只读 regular UTF-8 text file；file grant 不接受 `--relative`，directory grant 必须用安全的
  `--relative` 指定 descendant，语义与 Claude `Read` directory descendant 一致。
- `list/search` 只适用于带对应 operation 的 directory grant；不跟随 symlink。
- 输出必须有集中式大小/条目上限；超限返回非零并说明，不静默截成成功。
- broker 失败不得回退 `cat/rg/find/cp`。
- 来源：CONV-007/008/011/012。

### IF-005 — Scope guard consumption

- Claude `Read` 可消费 file/directory 的 `read` grant。
- Claude `Grep` 只消费 directory `search` grant，且必须有明确 path。
- Claude `Glob` 只消费 directory `list` grant，且必须有明确 path。
- `Write/Edit/MultiEdit/NotebookEdit/apply_patch` 永不消费 grant。
- 普通 Bash 即使看起来是 `cat` 或 `rg` 也不消费 grant；只认 IF-004 exact broker grammar。
- 来源：CONV-001/006/007/008。

## 5. Requirement Traceability Matrix

| 需求 | Tech Section | Interface | MVP | 可执行测试准则 |
|---|---|---|---|---|
| CONV-001 | 3.2/3.3 | IF-002/005 | MUST | grant 存在时跨项目 Write/Edit/apply_patch/raw Bash 仍 deny |
| CONV-002 | 3.4 | IF-001/002 | MUST | 显式 file grant 后，授权 path 的 Read PASS |
| CONV-003 | 3.4 | IF-001/002 | MUST | file grant 不能读 sibling；目录 grant 只读 descendant |
| CONV-004 | 3.2/3.4 | IF-001/003 | MUST | turn grant 在 Stop/next prompt 后失效；session grant 同 epoch 可跨 turn |
| CONV-005 | 3.2 | IF-001/002/003 | MUST | sid/turn/generation/binding epoch 任一不符即 deny |
| CONV-006 | 3.4 | IF-002/005 | MUST | traversal、root grant、nested symlink、control-plane path 全 deny |
| CONV-007 | 3.3 | IF-004/005 | MUST | Claude native 与 Codex broker 对同一 fixture 得到相同 verdict |
| CONV-008 | 3.4 | IF-004/005 | MUST | raw `cat/rg/find` 与带 `|/>/&&` broker 调用均 deny |
| CONV-009 | 3.4/IF-001 | IF-001 | MUST | issuer 行为测试证明不创建 copy、不 switch、不写永久 allowlist、不修改 binding |
| CONV-010 | 3.4 | IF-005 | MUST | `PROJECTS_ROOT` 外现有 non-project read 仍 pass-through |
| CONV-011 | 3.2/3.4 | IF-002/003/004 | MUST | malformed sidecar 只拒绝 grant path；当前项目回归继续 PASS |
| CONV-012 | 1.1/7 | N/A | DEFERRED | 明确标记非文本入口不在 MVP，不宣称已覆盖 |

## 6. Coverage Gate Result

```text
✅ COVERAGE GATE PASS
MUST: 11/11
Architecture mapping: 11/11
Interface mapping: 11/11
Executable acceptance mapping: 11/11
DEFERRED: 1（非文本/MCP 本地路径入口，明确不计入 MVP）
```

## 7. Failure, Migration, and Rollback Contract

- feature flag：`LUCA_READ_GRANTS_DISABLE=1` 时 issuer 不签发、consumer 不消费，立即恢复现有行为。
- 无历史数据迁移；sidecar 缺失就是旧行为。
- schema 不兼容或 sidecar 损坏时，不自动修复，不沿用部分字段；只关闭跨项目读并给诊断。
- rollback 删除 grant module/broker 及其接线即可；`.session-project-*` 从未改变，无 pin 迁移。
- 部署前后必须保持原 project-scope、project transaction、route、hook 和 Codex wiring 回归全绿。

## 8. Explicit Non-goals

- 不允许跨项目写入。
- 不建立项目依赖图、共享项目或第二 binding。
- 不改变 `/Users/luca/Documents/...` 等 `PROJECTS_ROOT` 外路径的现行权限。
- 不把图片、二进制、PDF、MCP `referenced_image_paths` 宣称为已受 grant 保护。
- 不提交、不推送、不修改运行时，除非用户后续批准 Execution Standard 中的 exact U-ID 集。
