# Multica × luca_gstack 零侵入自动同步最终实施计划

> 修订：R3 / 2026-08-30  
> 状态：`AWAITING_PLAN_PERSISTENCE_APPROVAL`  
> 最终会审：Security `PASS` / Git & Publication `PASS` / Quality Gate `PASS (5/5)`  
> 当前 Multica 基线：`v0.4.36 / c1a61e1e8`  
> 取代：R2，已批准 SHA `a16c759353d16043143409c5de2382a238ee598578335debb2b64db7c0199f39`  
> R2 失效原因：Phase 1 推翻了“现有接口可机械关闭非人工 Issue 入口”和“注入后的 wrapper 足以保护真实副本”两个 kill-assumption  
> 本轮授权范围：只修订、会审并冻结计划；不创建运行副本，不安装服务，不修改 Multica Agent

## 0. 前提门与最终裁决

### 0.1 该不该解

应该解。这不是体验优化，而是整个集成是否有意义的安全前提：如果 Multica 能从私聊、Autopilot 或注入内容绕过 lucagstack 的真实规则，或者能把 skill/sidecar 写入框架目录，那么“自动同步”只会自动放大污染。

### 0.2 更小方案能否达到 80%

不能。下列轻方案都只能提供行为约定，不能提供机械保证：

- 在 Agent 描述中写“只处理 Issue”；
- 把权限设为 Only me；
- 只配置 custom args / custom env；
- 用 wrapper 先检查 task，再 `cd` 到 lucagstack；
- 任务结束后删除 Multica 注入文件。

### 0.3 默认形态偏差

本案默认产出是“上游来源凭证 + 本地隔离桥”，会把秤压向更强隔离。相反立场由独立质量门复核：如果 carrier 本身已足够，或上游改造没有必要，必须用负向 canary 证明，而不是以实现更简单为理由删除硬门。

### 0.4 四个 kill-assumption

- `KILL-1`：Multica 上游愿意合入并部署服务端来源分类、Agent 入口策略、daemon/gateway 分用途的两阶段 admission grant，以及 fencing/publication/completion 协议。若不成立，严格目标整体 `BLOCKED`，不启用降级生产模式。
- `KILL-2`：Codex/Claude 的真实协议可以在不丢失取消、流式输出和终态语义的前提下被白名单代理。若任一端失败，只关闭该 provider，不伪装 parity。
- `KILL-3`：生产默认能把 Multica execution daemon、gateway/controller 与 provider 放进不挂载 host HOME/真实检出的隔离执行平面，并把 provider 再隔离于 controller authority；只换用户、只改 cwd 或同 UID sandbox 都不算。若做不到，严格目标整体 `BLOCKED`。
- `KILL-4`：经人工冻结的 canonical repository URL + `refs/heads/main` 是自动同步输入。未提交或未 push 的本地 dirty 不参与同步，也不被自动搬运；任一 checkout 的 `origin`/`upstream` 别名都不是真值源。

## 1. 复杂度与编排

```text
复杂度模式: Hierarchical（阶段串行，阶段内 Supervisor）
理由: 同时跨 Multica 服务端、custom runtime 协议、OS 隔离、Git 发布与双 provider 验收
需要用户确认: 是；本文件新 SHA 批准后才进入实施
任务规模 Tier: Deep
研究状态: 已完成一手源码调查；本轮只补做 v0.4.36 差分复核，不重复启动广域研究
Source: inline: “我只维护一个 lucagstack，它自动同步；Multica skill 不能污染我的框架；三个问题解决不了项目就没有意义”
```

## 2. v0.4.36 已验证事实

### 2.1 custom runtime 仍然启动得太晚

当前真实顺序是：

```text
prepareExecutionEnvironment
→ StartTask
→ InjectRuntimeConfig（AGENTS / CLAUDE / skills / sidecars）
→ 组装 task env 与 task-scoped CODEX_HOME
→ ResolveBackend(custom executable)
→ backend.Execute
→ custom runtime gateway 才真正启动
```

一手证据：

- [Prepare](https://github.com/multica-ai/multica/blob/c1a61e1e8/server/internal/daemon/daemon.go#L7145-L7154)
- [StartTask](https://github.com/multica-ai/multica/blob/c1a61e1e8/server/internal/daemon/daemon.go#L7306-L7317)
- [InjectRuntimeConfig](https://github.com/multica-ai/multica/blob/c1a61e1e8/server/internal/daemon/daemon.go#L7336-L7340)
- [custom executable 解析](https://github.com/multica-ai/multica/blob/c1a61e1e8/server/internal/daemon/daemon.go#L7480-L7491)
- [backend.Execute](https://github.com/multica-ai/multica/blob/c1a61e1e8/server/internal/daemon/daemon.go#L8162-L8176)

结论：真实 lucagstack 目录绝不能再作为 Multica local-directory；wrapper 无法撤销已经发生的污染。

### 2.2 人工 Issue 与手动 Autopilot 仍不可区分

手动 Autopilot 的 `create_issue` 最终走普通 Issue enqueue，并携带点击者 `actorUserID`。因此它与人工分配 Issue 都可能呈现：

```text
kind = direct
issue_id != empty
autopilot_run_id = empty
attribution.source = direct_human
attribution.evidence.kind = issue_assignment
```

一手证据：

- [Autopilot create_issue 普通 enqueue](https://github.com/multica-ai/multica/blob/c1a61e1e8/server/internal/service/autopilot.go#L794-L819)
- [direct_human / issue_assignment 分类](https://github.com/multica-ai/multica/blob/c1a61e1e8/server/internal/attribution/attribution.go#L281-L323)
- [公开 IssueResponse 不暴露 OriginType/OriginID](https://github.com/multica-ai/multica/blob/c1a61e1e8/server/internal/handler/issue.go#L35-L95)

结论：本地 gateway 不能从现有 API 推导“这是人工显式分配，而不是手动 Autopilot”。必须让 enqueue 源头写入不可歧义的来源枚举。

### 2.3 当前配置没有隐藏解法

- Agent trigger 配置已被删除，assign/comment/mention 默认始终启用。
- invocation permission 只限制“谁能调用”，不限制“从哪个入口调用”；owner 永远可以调用自己的 Agent。
- custom runtime profile 支持 protocol family、command/fixed args 与 executable path，不支持 pre-Prepare hook 或 external skill root。
- 用户截图显示 luca Agent 仍是内置 Codex，命令预览为 `codex app-server`；当前没有 gateway。

## 3. 最终架构

```text
                       Multica Server（必须上游改造）
       central source authorizer + agent policy + two-stage grants
                                      │
                         非人工 Issue：队列前拒绝
                                      │
                                      ▼
Isolated Execution Plane（默认 VM，无 host HOME/真实检出挂载）
Multica daemon ──pre-Prepare grant──> Per-attempt Disposable Carrier
                                      │
                                      │ runtime nonce + custom runtime stdio
                                      ▼
                       Hermetic Luca Runtime Gateway
                 runtime grant 兑换 + 协议终止器（非字段透传）
                                      │
                                      ▼
                 Controller compartment: BridgeSupervisor
              durable lease / journal / terminal hold / crash recovery
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
       Approved lucagstack Capsule               External Skill Store
     独立完整 clone + task-local HOME          ID + SHA allowlist，仓库外
                 │
                 ▼
      Worker compartment: Claude / Codex
                 │
                 ▼
   remote PublicationAuthority + atomic ref gate + ACK receipt

Canonical SourceRef ──> staging canary ──> approved generation ──> next task capsule
Host trusted StateExportBroker ──signed snapshot/proposal seam──> StateProjection
```

只有一个人工维护源：canonical lucagstack `refs/heads/main`。host 上两个 lucagstack 检出和 luca HOME 不挂载进隔离执行平面；同步只通过冻结的远端 SourceRef 与最小凭证 broker。Carrier、staging 与 capsule 是可重建运行状态；ledger、approved refs、journal、skill approvals 和 receipts 是集成安全权威，只能在完整卸载时删除，不能当缓存清理。它们都不是第二套人工维护框架。

## 4. Module / Interface / Seam 设计

### 4.1 `AdmissionAuthority` Module（Multica 上游拥有）

**Caller**：所有 task enqueue 路径与 daemon claim。

**Interface**：

```text
classify(dispatch_context) -> invocation_class
authorize(agent_id, invocation_class) -> allow | deny
claim(task_id, daemon_id) -> pre_prepare_grant
consume_pre_prepare(pre_prepare_grant) -> runtime_nonce
redeem_runtime(runtime_nonce, execution_manifest) -> execution_grant
```

**Implementation 隐藏**：人工 assign、rerun、comment、mention、chat、quick-create、manual/schedule/webhook Autopilot 的来源差异；调用者只看稳定枚举。所有 enqueue 路径必须经过同一个无 default 分支的 central authorizer；`cause + root_cause + policy_version + task` 在同一事务写入且之后不可修改。

**Seam**：来源由服务端执行路径的 typed constructor 机械产生，不能由 HTTP/CLI 调用方传任意字符串，也不能从 task 字段或 prompt 反推。生产 Adapter 是 Multica DB/queue；测试 Adapter 是穷尽来源矩阵。

### 4.2 `LucaRuntimeGateway` Module

**Caller**：Multica custom runtime profile。

**Interface**：保持 provider 原生启动外形：

```text
luca-multica-codex app-server --listen stdio://
luca-multica-claude <claude stream-json argv>
```

它是固定摘要、自包含、不开语言运行时自动加载的 hermetic bootstrap。启动时不读取当前 cwd、Carrier、用户 HOME 或继承配置；清除动态加载与语言启动变量。它只做四件事：把 runtime nonce 交给 supervisor 兑换 execution grant、建立 supervisor 会话、终止 Multica 协议并生成受控 provider 协议、转发已审核终态。它不执行 Git 同步、不持有长期 lease、不直接操作 lucagstack。

**Seam**：Multica 只认识原生 provider protocol；真实 provider 位于另一侧。gateway 不是字段重写代理：Multica 侧只可驱动启动、取消和流控，所有 prompt、cwd、config、thread/resume ID、tools、MCP、skills 和 settings 都被忽略；真实请求由 execution grant 绑定的不可变任务快照构造。生产 Adapter 是 Codex JSON-RPC / Claude stream-json；测试 Adapter 是记录原始 argv/env/cwd/协议输入的 instrumented fake provider 与 record/replay fixture。

`--version`、runtime probe 与 model discovery 没有 task grant，必须走独立 sterile discovery 路径：固定空 cwd/HOME、无 lucagstack、无 provider auth 写权限，且绝不能退化成任务执行。

### 4.3 `BridgeSupervisor` Module

**Caller**：gateway 与本机 release scheduler。

**Interface**：

```text
prepare-generation <sha>
run-task <runtime-nonce> <provider> <profile-hash>
publish <execution-attempt-id>
recover <logical-dispatch-id>
status --json
rollback-generation <approved-sha>
```

**Implementation 隐藏**：runtime grant 兑换、mirror、staging、approved ledger、独立 clone、worker 启动、lease、进程树、journal、审计、terminal hold、publication outbox、fencing 与 server completion reconcile。supervisor 在启动 worker 前把 `approved_sha + capsule_manifest + skill_inventory + provider/schema digests` 作为 execution manifest 交给服务端签入 grant；这些字段必须作为一个原子快照使用。supervisor/controller 不持有远端 Git ref 写凭证，只向 PublicationAuthority 提交验证过的对象包与 result manifest。

任务状态机：

```text
ADMITTED → LEASED → CAPSULE_READY → RUNNING → TERMINAL_HELD
→ QUIESCED → VERIFIED → PUBLISH_INTENT → PUBLISH_AUTHORIZED
→ PUBLICATION_RECEIPT → COMPLETION_COMMIT_ACK
→ TERMINAL_RELEASED → REPORT_DELIVERY_ACK → SEALED
```

gateway、daemon 或 provider 任一死亡，supervisor 仍能根据 journal 恢复或隔离现场。若 publication 已完成但 `completion_commit_ack` 尚未取得，状态是 `PUBLISHED_UNRECONCILED`，恢复先按稳定 publication key 回读并补交 receipt；若 commit ACK 已取得但 terminal 尚未送达，状态是 `COMPLETED_UNREPORTED`，恢复只重送同一终态，绝不二次执行或发布。

### 4.4 `ReleaseChannel` + `RemotePublicationAuthority` Modules

**Caller**：仅 supervisor；provider、worker 与本地 controller 均无远端 ref 写权限。

**Interface**：

```text
observe-main
validate-candidate <sha>
promote <sha> --expected-generation <n>
current
submit-publication <attempt> <result-manifest> <object-bundle>
reconcile-publication <logical-dispatch-id>
```

`observe-main` 只读取冻结的 `canonical_url + refs/heads/main`，不用任何 checkout 的 remote alias。普通 lucagstack 更新通过静态检查和 Claude/Codex canary 后自动晋升。控制面、协议 schema、hook/trust 文件变化时停在 `TRUST_REVIEW_REQUIRED`，不能由候选版本批准自己。

每代 ledger 原子包含 `generation/source_url/source_ref/approved_sha/manifest_sha/supervisor_bundle_sha/protocol_schema_hashes/canary_receipts/previous_generation`。持久化顺序固定为 temp file → fsync file → rename → fsync parent dir；promotion 用 expected-generation CAS。controller-owned mirror 用本地 LKG refs 固定所有 approved objects；remote URL/ref 变化或 non-fast-forward 产生 `SOURCE_HISTORY_REWRITE`。

`RemotePublicationAuthority` 与 claim/fence authority 共用线性一致的 per-publication-key 状态，持有 agent ref namespace 的唯一远端写凭证。它把 `advance_fence`、publish-grant JTI 消费和 Git `ref-transaction/pre-receive` gate 串行化：ref 真正落地时，远端 gate 原子核验 repo identity、target ref、old/new SHA、grant JTI、attempt、current fence 与 manifest digest；旧 fence 在检查早、push 晚的场景仍会在 ref update 当刻被拒绝。若 canonical Git host 不能提供该远端 gate，必须使用具备等价线性化语义的受控 Git publication service；两者都不可用则 production `BLOCKED`，本地 pre-push 检查不能替代。

### 4.5 `Projection` 是 supervisor 内部 seam

不把每种投影做成对外 shallow service。supervisor 内部保留三个可替换 Adapter：

- `SkillProjection`：controller 创建、worker 只读的 approved lucagstack skills + 仓库外 Multica skill allowlist；
- `StateProjection`：task-local HOME、最小 provider auth broker、允许的 person/project memory 快照与 CAS 写回提案；
- `ProviderAdapter`：Codex 与 Claude 两个真实 Adapter，证明这个 seam 不是假抽象。

`StateProjection` 不通过 host mount 实现。host 上独立、固定摘要的 `StateExportBroker` 只接受有效 execution grant 和本地 allowlist，返回任务绑定的 schema 化只读快照与 digest，不暴露任意路径、目录枚举、原始配置或 credential。反向只接收 typed proposal：项目产物仍走任务 Git ref；person/semantic/observability 写入只能进入现有 candidate/quarantine 治理入口，不能直写 core skills/hooks/AGENTS/CLAUDE、promoted memory 或 host 配置。未激活/未签入的 project pin 不投影。

## 5. 三个已知风险如何机械关闭

### RISK-1：非人工 Issue 触发

必须同时有三层：

1. Multica server 在 enqueue 前依据 `agent.allowed_invocation_classes` 拒绝非 `human_issue_assignment`；
2. daemon claim 只获得 `pre_prepare_grant`；在 Prepare 前消费成功后，服务端才返回同 attempt 的 `runtime_nonce`；
3. gateway 把用途不同、尚未消费的 runtime nonce 交给 supervisor；supervisor 绑定本地 execution manifest 后一次性兑换 execution grant。两个凭证不能复用或双消费。

policy 在 queue insert 与 daemon claim 两处复核。agent owner、内部 API、delegation、rerun、reclaim/fresh retry 都必须有独立测试；chat、comment、mention、quick-create、manual/schedule/webhook/API Autopilot 必须负向通过。不存在“识别不了就当 Issue 放行”的降级。

### RISK-2：Cleanup、空闲误判与自动同步竞态

- 首选由上游为每个 `task_id + execution_attempt_id` 创建独立 Carrier；若必须使用 local-directory，它也必须解析到 per-attempt 路径。Carrier 从创建起永远视为已污染，gateway/supervisor/provider 均不可读；不声称 supervisor 能看见或修复 Multica 的 cleanup callback。
- provider 运行、lease、clone、进程树和发布均由持久 supervisor 持有，不由短命 wrapper 持有。
- supervisor 在 `QUIESCED + VERIFIED + PUBLICATION_RECEIPT + COMPLETION_COMMIT_ACK` 前扣住协议终态；commit ACK 是独立于 provider stdio 的上游幂等协议，先把本次逻辑 dispatch 永久裁成完成，再允许 gateway 发送终态。
- 每个逻辑 dispatch 有跨 retry 稳定的 `publication_idempotency_key`，每个 attempt 有服务端单调递增的 `fencing_token`。本地 controller 没有远端写凭证；RemotePublicationAuthority 在 Git ref 真正落地的原子 gate 内消费绑定 exact repo/ref/SHA 的一次性 publish grant，旧 attempt 即使已经提前通过本地检查、请求仍在途，也不能在 fence 变化后迟到发布。
- 服务端在旧 attempt 为 `RUNNING/COMPLETING/PUBLISHING/PUBLISHED_UNRECONCILED` 时禁止签发新 claim。超时后先以稳定 publication key 与远端 gate 的 in-flight record 对账：远端 ref 存在则完成旧 attempt；只有 ref transaction 已终止、ref 不存在且 grant 已原子撤销，才可裁成 `ABORTED`、递增 fence 并 retry。
- main 更新只在无运行任务的 generation 边界晋升；任务中绝不 fetch/pull/switch。
- cleanup 失败只影响已污染的 per-attempt Carrier；capsule 从 sealed SHA 重建，不在 dirty clone 上 reset/clean。
- `terminal_hold_timeout` 必须小于 daemon completion-lease/watchdog 安全余量；capsule 预热，publish 超时即失败并 quarantine。keepalive 只能使用 Multica/provider 明确定义的协议事件。真实 canary 通过前，idle/timeout 状态保持 `UNKNOWN`。

成功 commit point 的唯一顺序：

```text
provider terminal held
→ kill/wait worker process namespace
→ verify capsule/result class
→ write PUBLISH_INTENT + fsync
→ submit exact result manifest + object bundle to RemotePublicationAuthority
→ authority lock publication key and persist PUBLISH_AUTHORIZED
→ remote ref-transaction gate atomically validate/consume fence + grant and create/read-back stable ref（或 NO_CHANGE receipt）
→ write PUBLICATION_RECEIPT + fsync
→ submit receipt and persist signed completion_commit_ack
→ release provider terminal
→ receive/persist report_delivery_ack
→ release lease and seal
```

### RISK-3：Multica skill 与指令污染

- Multica 的 AGENTS/CLAUDE/skills/sidecars 只写隔离平面内的 Carrier；host 的两个真实检出、luca HOME 与全局配置根本不挂载进该平面。daemon 启动 custom runtime 前再创建 sterile mount namespace：Carrier 只留给 daemon，gateway/controller/worker 对其不可见。
- hermetic gateway 不加载 Carrier cwd 或继承环境，并终止而非透传 Multica 拼装的 `baseInstructions`、`developerInstructions`、`additionalContext`、system prompt、cwd/config、resume/thread、tools、MCP 或 skill 字段。
- 任务正文只来自 execution grant 绑定的不可变 Issue 快照、明确的 assignment event 与附件 manifest。comment 入口被禁止，因此不能在运行时读取“最新评论集合”作为隐式输入；后续若开放 comment，必须新增独立 invocation class 与签名 comment revision。
- provider 不继承 Multica 注入的 `CODEX_HOME`、HOME、MCP 或 token；它只拿 task-local allowlist 环境。
- Multica token 留在 supervisor；provider 通过 task-bound local broker 执行有限的评论/状态操作。
- Multica skill 只能进入 controller-owned、worker 只读的仓库外 skill store，并以 `skill_id + content_sha256` allowlist 投影；禁止写入或 symlink 到 `.claude/skills`、`.agents/skills`。来源与物理隔离可以保证，但用户批准的外部 skill 本来就会影响模型语义，不能宣称“语义零影响”。

## 6. Multica 上游最小改造合同

### 6.1 来源枚举必须在调用点产生

至少包含：

```text
human_issue_assignment
human_issue_rerun
comment
mention
chat
quick_create
delegation
manual_autopilot
scheduled_autopilot
webhook_autopilot
api_autopilot
```

`manual_autopilot` 即使携带 `actorUserID`，也不得被分类成 `human_issue_assignment`。

每个来源只能由对应服务端执行路径的 typed constructor 创建；central authorizer 必须穷尽枚举且无 default allow。`dispatch_cause_id`、`root_cause_id`、`policy_digest`、任务和不可变任务快照在同一事务写入。内部 API、owner、rerun、delegation 与 retry 不得绕过 central authorizer。

### 6.2 Agent 入口策略

为 agent 增加服务端强制字段：

```json
{"allowed_invocation_classes":["human_issue_assignment"]}
```

默认值保持现有行为，只有 luca Agent 使用严格策略。策略在 queue insert 前执行，owner 也不能绕过。

### 6.3 两阶段 admission grant

不能让 daemon 与 gateway 双消费同一 ticket。协议固定为：

```text
server claim credential
→ pre_prepare_grant（daemon 在 Prepare 前消费一次）
→ server 返回同 attempt 的 runtime_nonce
→ Prepare / Inject
→ gateway 将 runtime_nonce 交给 supervisor
→ supervisor 提交 execution manifest，一次性兑换 execution_grant
→ gateway 重连只使用 supervisor session capability，不重兑 grant
```

daemon crash 后必须先 reconcile；只有旧 attempt 已被权威裁成 `ABORTED`，fresh-session retry 或重新派发才创建新的 `execution_attempt_id`、递增 fence，并使旧 grant/nonce 失效。未对账时不得 reclaim。

`pre_prepare_grant` 至少绑定：

```json
{
  "v": 1,
  "jti": "uuid",
  "claim_id": "uuid",
  "logical_dispatch_id": "uuid-stable-across-retry",
  "execution_attempt_id": "uuid",
  "fencing_token": 42,
  "publication_idempotency_key": "uuid-stable-across-retry",
  "daemon_id": "uuid",
  "task_id": "uuid",
  "agent_id": "uuid",
  "workspace_id": "uuid",
  "runtime_id": "uuid",
  "invocation_class": "human_issue_assignment",
  "dispatch_cause_id": "uuid",
  "root_cause_id": "uuid",
  "policy_digest": "sha256",
  "iss": "multica",
  "aud": "multica-daemon-pre-prepare",
  "kid": "key-id",
  "nbf": "RFC3339",
  "exp": "RFC3339"
}
```

`execution_grant` 在 supervisor 提交 execution manifest 后签发，至少绑定：

```json
{
  "v": 1,
  "jti": "uuid",
  "claim_id": "uuid",
  "logical_dispatch_id": "uuid-stable-across-retry",
  "execution_attempt_id": "uuid",
  "fencing_token": 42,
  "publication_idempotency_key": "uuid-stable-across-retry",
  "daemon_id": "uuid",
  "task_id": "uuid",
  "agent_id": "uuid",
  "workspace_id": "uuid",
  "runtime_id": "uuid",
  "issue_id": "uuid",
  "invocation_class": "human_issue_assignment",
  "initiator_type": "member",
  "initiator_id": "uuid",
  "dispatch_cause_id": "uuid",
  "root_cause_id": "uuid",
  "policy_digest": "sha256",
  "issue_snapshot_id": "uuid",
  "issue_revision": 1,
  "canonical_payload_digest": "sha256",
  "attachment_manifest_digest": "sha256",
  "approved_sha": "git-sha",
  "capsule_manifest_digest": "sha256",
  "skill_inventory_digest": "sha256-of-empty-or-approved-set",
  "provider_protocol": "codex",
  "provider_version": "exact-version",
  "protocol_schema_digest": "sha256",
  "runtime_profile_version": 1,
  "gateway_digest": "sha256",
  "supervisor_bundle_digest": "sha256",
  "capabilities": ["run_provider", "request_publish_authorization", "report_current_task"],
  "iss": "multica",
  "aud": "luca-bridge-supervisor",
  "kid": "key-id",
  "nbf": "RFC3339",
  "exp": "RFC3339"
}
```

要求：服务端签名、短时有效、用途隔离、单次兑换；来源身份从 claim/runtime nonce 推导，客户端不能提交另一个 task ID。`logical_dispatch_id + publication_idempotency_key` 在同一显式 dispatch 的 retry/reclaim 间稳定，`fencing_token` 每次新 attempt 单调增加；显式 rerun 才创建新的 logical dispatch 与 publication key。服务端对 `gateway_digest + supervisor_bundle_digest` 采用已注册 allowlist，并定义 `kid` 轮换/撤销。daemon 对实际 executable 做 descriptor-based hash 后立即 exec，关闭 hash→path 替换窗口；runtime nonce 通过只读一次 pipe/FD 交给 hermetic gateway，不写 custom env 或磁盘。

缺字段、重复消费、未知版本、时钟漂移、签票后 issue/policy/skill/capsule/provider 变化、网络失败全部拒绝。execution grant 绑定的 canonical snapshot 是 provider 唯一任务正文。

### 6.4 发布 fencing 与 completion ACK

admission grant 只允许运行 provider，不直接授权 Git 副作用。本地 supervisor/controller 没有远端 ref 写凭证。Multica 上游与 RemotePublicationAuthority 必须提供三个强类型、mTLS 或 attempt-session capability 鉴权的幂等接口：

```text
submit-publication(attempt, fence, publication_key, result_manifest, object_bundle_digest)
  -> publication_handle | deny
complete-execution(attempt, fence, publication_key, publication_receipt, terminal_digest)
  -> signed completion_commit_ack
reconcile-execution(logical_dispatch_id, publication_key)
  -> authoritative state + existing handle/receipt/ack
```

`result_manifest` 至少绑定 canonical repo identity、互斥 result class、base SHA、exact output SHA 或 patch digest、稳定 target ref、provider terminal digest、object bundle digest 与本地 intent digest。PublicationAuthority 验证 bundle/commit 后在内部签发独立 `jti/aud` 的一次性、短时 publish grant；该 grant 不返回不受信任的 controller，只经 server-to-gate 通道送到远端 `ref-transaction/pre-receive` gate。

远端 gate 在 ref 锁/事务内原子核验并消费：repo identity、`refs/heads/agent/multica/<publication_idempotency_key>`、expected old SHA、exact new SHA、grant JTI、logical dispatch、attempt、current fence 与 manifest digest。claim issuer 的 `advance_fence` 与 gate 的 grant consume 使用同一线性一致 authority；只要 publication request/remote ref transaction 仍为 in-flight，fence 不得前进、新 claim 不得签发。这样“旧 attempt 先检查、网络 push 晚到”会在 ref 落地时被拒绝，而不是只在事后变成冲突。canonical forge 无此 gate 时，只能把 agent namespace 放到具备等价语义的受控 publication service；不允许用本地 `git push` + pre-push check 降级。

服务端原子状态至少覆盖 `CLAIMED/RUNNING/COMPLETING/PUBLISHING/COMPLETED/ABORTED`。进入 `COMPLETING/PUBLISHING` 后，普通 daemon watchdog、reclaim 和 retry 都不得产生新 attempt；只能由 supervisor completion heartbeat 续约，或在 gate 明确结束、grant 到期后先走 `reconcile-execution`。远端稳定 ref 已存在时必须按旧 attempt 完成；gate 的 in-flight 记录已终止、确认 ref 不存在且旧 grant 已原子撤销后，服务端才可写 `ABORTED`、递增 fence并签发新 claim。PublicationAuthority crash 后不能凭一次“ref 暂不存在”就前进 fence，必须先恢复/终止同一 ref transaction。

`publication_receipt` 至少含 logical dispatch、attempt、fence、publication key、result class、target ref、remote read-back SHA/NO_CHANGE base SHA、intent/manifest digest 与时间；`completion_commit_ack` 额外绑定 receipt digest、server state version、`kid` 和 ack timestamp。重复 complete 返回 byte-equivalent ACK，冲突 payload 拒绝。receipt/ACK 的保留期不得短于 task、audit 与 rollback/LKG 的最长存续期；缺失或被清理时 fail closed，不能自动 retry。gateway 终态送达另有幂等 `report_delivery_ack`，它只影响 UI/报告补送，不再改变已经 commit 的执行结果。

### 6.5 上游硬门

以下四项都未在 Multica 官方生产版本部署前，本地实现最多运行 fixture/staging，禁止切换用户截图中的 luca Agent：

1. central enqueue 来源策略与不可变快照；
2. 两阶段 grant 签发、兑换、重试与撤销；
3. daemon pre-Prepare grant gate、sterile runtime mount namespace、runtime nonce FD 和 executable hash→exec 保证；
4. monotonic fencing、stable publication key、RemotePublicationAuthority/ref-transaction gate、completion/reconcile/ACK 与“未对账不得 reclaim”规则。

若 Multica 不接受上游 PR，唯一严格替代是自托管已打补丁的 Multica server+daemon；若两者都不可行，项目终止，不启用弱化方案。

## 7. 自动同步合同

```text
用户日常动作：修改 lucagstack → commit → push canonical refs/heads/main
自动动作：observe → staging → static checks → provider canary → promote
任务动作：下一任务从 approved_sha 创建 capsule
```

- `SourceRef = canonical repository identity + canonical remote URL + refs/heads/main` 是唯一 candidate feed；隔离平面通过只读 deploy capability 拉取，host 两个现有检出及其 tracking refs 不挂载，也永远不被 observer、Multica 或 supervisor 读取为真值或改写。
- staging 与 execution capsule 都是独立 full clone：本地来源使用 `--no-local`（至少 `--no-hardlinks`）；禁止 `--shared`、`--reference`、alternates、linked worktree、外部 gitfile，以及指向 root 外的 symlink/hardlink/device。
- 所有 Git 子进程清除 `GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE/GIT_OBJECT_DIRECTORY/GIT_ALTERNATE_OBJECT_DIRECTORIES`、全局/system config 与 credential/helper/hook/fsmonitor/includePath 影响。
- installed supervisor N 验证 candidate N+1；candidate 中的新 controller/tests 不能参与批准自己。
- normal skill/framework 变化：双 provider canary 通过后自动晋升。
- trust-sensitive 变化：自动验证后暂停，用户批准新 manifest/hash 才晋升。
- Multica、Codex、Claude 任一版本或协议 schema 改变：`VERSION_DRIFT`，停止新任务并重跑 canary。
- rollback 通过新增 ledger generation 指向旧 approved SHA；不改写历史，不 reset 用户检出。
- task admission 一次性快照整个 approved generation；运行中不分别重读可漂移字段。
- worker 与本地 controller 都没有 Git push/SSH/Keychain/credential helper 权限。worker 只产生对象包或 patch；controller 在 hooks/config 固定的 clean bare outbox 中导入、验证后，把 exact object bundle + manifest 提交给 RemotePublicationAuthority。只有远端 authority 持有 agent namespace 写凭证。
- Publication 只有三个互斥终态：`NO_CHANGE`（base SHA + authority receipt）、`COMMIT_BRANCH`（远端 gate 原子创建 `agent/multica/<publication_idempotency_key>` 并回读 exact SHA + receipt）、`DIRTY`（任务失败并 quarantine，可附 patch artifact，但不得称发布成功）。同一 key 已存在不同 SHA 是安全冲突，禁止另建 retry ref 绕过。

## 8. Multica Skill 独立安装模式

### Core 模式

Multica workspace skill binding 为空，只使用 approved lucagstack 自带 skills。先用此模式完成安全验收。

### External Skill 模式

用户可以在 Multica 安装 skill，但启用链路为：

```text
Multica skill bundle
→ supervisor 读取服务端 bundle manifest
→ 用户首次批准 ID + SHA
→ <isolated-control-root>/skills/<id>/<sha>/
→ controller 构建不可变、worker 只读的 task projection
→ task-local extra root / plugin dir（provider canary 通过后）
→ effective inventory 验证
```

- Codex external root 当前状态保持 `UNKNOWN`，只有 pinned provider 真实 canary 证明接口与 inventory 后才启用；
- Claude `--plugin-dir` 同样必须按 pinned version 证明只加载批准内容后才启用；
- 两端均不向 lucagstack 写文件或软链；
- skill 更新产生新 SHA，重新批准，不静默覆盖；
- gateway 仍丢弃 Multica 内联的 skill 文本，只认可外部 store 中的批准 bundle；
- bundle 默认只允许 skill-only schema；hooks、MCP、agents、commands、scripts、settings、native executable 是不同 capability，不能借 skill 批准夹带；
- 拒绝路径穿越、symlink、hardlink、设备文件、解压炸弹、重名与 namespace 抢占；luca_gstack core 名称与优先级不可覆盖；
- ticket 签入 exact inventory digest；默认不 ambient auto-discover，仅任务显式选择时加载；effective inventory 同时审计 skills/hooks/MCP/agents/commands/scripts。

这里保证的是来源、能力边界与物理隔离，不保证用户明确启用的外部 skill 对模型行为“零影响”。任何语义冲突由用户审批与任务级选择承担，不能写成技术上消除了语义影响。

## 9. OS 与文件边界

### 9.1 默认生产拓扑与必须保护的真实路径

```text
/Users/luca/Desktop/luca_gstack
/Users/luca/Desktop/项目/muse/lucagstack
```

生产默认不是在 luca 登录用户的 host session 内执行。Multica UI、execution daemon、gateway/controller 与 provider 必须全部位于专用 VM/等价硬隔离平面，且关闭 host folder sharing、clipboard/file drag、SSH agent、Keychain、Unix socket 与用户 HOME 映射。若桌面 UI 无法证明自身受 OS sandbox 限制且不可读 host 路径，UI 也进入 VM，host 只使用浏览器/远程显示；不能以“UI 不会主动读”代替机械边界。

隔离平面只开放四类窄接口：Multica server 协议、canonical Git remote、显式 credential broker、schema-limited StateExportBroker。上面的两个 host 路径、整个 host luca HOME 与全局 Claude/Codex 配置不得出现在 guest mount/share manifest。来自 UI、daemon、gateway、supervisor、publisher、provider 的绝对路径、symlink、hardlink、rename、socket、进程环境和 host sentinel 读写 canary 必须全部返回 `ENOENT/EPERM` 且 host 审计为 0 次成功；仅改变 cwd、挂成只读、换本机 UID 或同 UID sandbox 都不算通过。被明确批准并签入 task 的 memory snapshot 是有审计的语义输入，不等于获得 host 路径读取权。

### 9.2 推荐实现

- daemon compartment 只拥有 per-attempt Carrier；上游 daemon 在 exec custom runtime 前建立 sterile mount namespace，只传入 pinned gateway executable、supervisor socket、stdio 与 read-once nonce FD，Carrier 不进入 gateway namespace；
- controller compartment 拥有 ledger、journal、approved bundles、read-only SourceRef capability 与 task-bound publication submission capability；不拥有任何远端 Git 写 credential、host mount，也不能直接 push/delete/force 任一 ref；
- provider 位于 controller 内再隔离的 worker VM/container/身份，只写 capsule 与 task-local HOME；controller state、Carrier、publication capability、skill store 原目录均不可读，approved skill projection 与 provider executable 只读；
- Multica server/daemon 若无法把 custom runtime 放进上述隔离拓扑，或 provider 登录只能靠 worker 可读的长期 secret，production `BLOCKED`。`sandbox-exec` 只有在真实 nested-sandbox canary 证明等价后才可替代内层 worker 隔离，不能替代外层 VM。

gateway/controller/worker 环境都由空环境构建，不从 Multica/host 用户 shell 继承。allowlist 至少逐项决定：`HOME`、`CODEX_HOME`、`CLAUDE_CONFIG_DIR`、`XDG_*`、`PATH`、locale、证书路径；明确删除全部 `GIT_*`、`SSH_AUTH_SOCK`、`GIT_ASKPASS`、MCP/config/settings sources、`NODE_OPTIONS`、`PYTHONPATH/PYTHONSTARTUP`、Ruby/Perl/Java/dynamic-loader 注入变量。provider 登录凭证不得以普通可读文件暴露给任务代码；一次性登录只写入 controller broker/guest OS credential capability，provider 获得任务绑定的短期句柄。远端 publication credential 只存在于 PublicationAuthority，并由 ref gate/branch protection 限制为原子创建 `agent/multica/*`。

外层 VM 默认把 Multica UI/daemon 被注入或被攻陷也纳入 host 文件保护；内层 worker 边界再保护 controller authority。对 canonical Git remote 的剩余风险由最小凭证和 server-side branch protection 收口。若这两层任一缺失，只能做 fixture/staging，不得声称达到用户的零污染目标。

## 10. 改动范围

### 10.1 lucagstack：只新增可删除的集成目录

```text
integrations/multica/README.md
integrations/multica/contracts/*.json
integrations/multica/contracts/*.txt
integrations/multica/src/gateway/**
integrations/multica/src/supervisor/**
integrations/multica/src/projections/**
integrations/multica/tests/**
integrations/multica/fixtures/**
```

第一批不修改现有 `framework/`、skills、hooks、AGENTS.md、CLAUDE.md、memory 或 project pin 逻辑。真实 canary 证明现有 hook 有缺陷时，另立最小补丁并重新批准。

### 10.2 仓库外、隔离平面内的运行状态

```text
<isolated-daemon-root>/carriers/<task-id>/<attempt-id>/
<isolated-control-root>/bin/luca-multica-codex
<isolated-control-root>/bin/luca-multica-claude
<isolated-control-root>/releases/<bundle-sha>/
<isolated-control-root>/mirror.git/
<isolated-control-root>/ledger/
<isolated-control-root>/outbox.git/
<isolated-control-root>/journals/
<isolated-control-root>/audit/
<isolated-control-root>/quarantine/
<isolated-control-root>/skills/<id>/<sha>/
<isolated-worker-root>/staging/
<isolated-worker-root>/capsule/
<host-trusted-broker-root>/state-export-broker
```

这些路径位于专用 VM/隔离卷，不是 host 的 `~/.luca`，也不通过 folder sharing 映射到 host HOME。

### 10.3 Multica

- 新建 Codex-compatible custom runtime profile，executable 指向 `luca-multica-codex`；
- Claude 另建独立 profile，通过后再启用；
- `protocol_family=codex`、`fixed_args=[]`、agent custom args/env 为空，`set-path` 使用隔离平面内 gateway 绝对路径；预期命令必须是 `luca-multica-codex app-server ...`，若 preview/log 仍为 `codex app-server` 即未接线；
- daemon 使用上游新增的 per-attempt Carrier；若 UI 必须绑定 local-directory，它只能指向受上游 attempt resolver 管理的 Carrier 根，绝不能指向任何 lucagstack clone；
- 并发固定为 1，直到并发故障矩阵另行通过；
- 凭证不存 Multica UI；gateway 兼容 sterile `--version`、runtime probe 与 model discovery；
- Agent 设置 `allowed_invocation_classes=[human_issue_assignment]`；
- Core 模式 workspace skills 为空。
- 部署 RemotePublicationAuthority，并在 canonical Git agent namespace 启用与 fence authority 同源的 ref-transaction/pre-receive gate；canonical forge 不支持时必须改用等价受控 publication service，不能本地直推。

## 11. U-block 与 Wave

执行合同：四个 Wave 的 `phase_type` 均为 `task_execution`。Wave 1 的上游协议与安全架构先由 `reasoning-heavy` 冻结合同，再由 `core-execution` 实现；Wave 2–4 使用 `core-execution`，每个阶段门由独立 `reasoning-heavy` reviewer 裁决，纯文档/脚本断言可用 `mechanical`。任何 reviewer 不得与被审实现共享结论上下文。

Source mapping：全部 U-block 共同追溯到 §1 的用户原话；`U-001..U-002` 另追溯 §2.2/§6，`U-003..U-007` 追溯 §2.1/§3–§7，`U-008..U-011` 追溯 §4.2/§5/§8–§9，`U-012..U-014` 追溯用户提供的当前 Multica 配置截图与 §2.3/§10。这里没有可继承的 task-plan `DEV-*` ID。

### Wave 1 — 外部硬前提

| ID | Goal | Dependencies | Files / Output | Verification |
|---|---|---|---|---|
| U-001 | 为 Multica 增加无旁路 central authorizer、不可变 dispatch/root cause、Agent policy 与 task snapshot | None | 上游 PR/patch + DB/API schema | 全入口来源矩阵测试 |
| U-002 | 实现两阶段 admission、单调 fence、stable publication key、publish grant 与 completion/reconcile ACK | U-001 | 上游 server/daemon patch | 双消费、stale writer、reclaim/retry、hash→exec、ACK 幂等负测 |
| U-003 | 固定 R3 contracts 与威胁模型 | None | `integrations/multica/contracts/**` | schema/manifest 测试 |

### Wave 2 — 本地隔离控制面

| ID | Goal | Dependencies | Files / Output | Verification |
|---|---|---|---|---|
| U-004 | 实现 hermetic gateway 与协议终止器 | U-003 | gateway source/tests | fake provider raw-input + record/replay |
| U-005 | 实现持久 supervisor、lease、journal、terminal hold、fencing、ACK/reconcile | U-002,U-003 | supervisor source/tests | 逐副作用窗口 crash recovery |
| U-006 | 建立外层 VM、daemon/controller/worker compartments、per-attempt Carrier 与无 hardlink/alternate 的 full clone | U-005 | isolated execution plane + staging/capsule | UI/daemon/gateway/controller/worker 对 host 检出/HOME 均 ENOENT/EPERM |
| U-007 | 实现 canonical SourceRef、LKG ledger、local outbox、RemotePublicationAuthority/ref gate 与自动晋升 | U-002,U-005,U-006 | release channel + remote publication service | late stale push/candidate fail/remote rewrite/publish crash 矩阵 |

### Wave 3 — Provider 与投影

| ID | Goal | Dependencies | Files / Output | Verification |
|---|---|---|---|---|
| U-008 | 完成 Codex app-server 严格 schema firewall | U-001,U-004,U-006 | Codex Adapter | cwd/config/prompt 全旁路负测 |
| U-009 | 完成 Claude stream-json 严格 firewall | U-001,U-004,U-006 | Claude Adapter | system/stdin/resume 负测 |
| U-010 | 实现 controller-owned、skill-only、worker 只读的 Multica skill projection | U-005,U-008,U-009 | external skill store | capability + effective inventory 精确匹配 |
| U-011 | 实现 task-local memory/project state projection、最小 auth broker 与 CAS 写回提案 | U-005,U-006 | StateProjection | 五层 memory + project pin + credential leak 矩阵 |

### Wave 4 — 接线与生产验收

| ID | Goal | Dependencies | Files / Output | Verification |
|---|---|---|---|---|
| U-012 | 配置专用执行 VM，安装 hash-pinned bundle 与持久 supervisor service | U-004,U-005,U-006,U-007,U-008,U-009,U-010,U-011 | isolated daemon/control/worker volumes | installed hash、mount manifest 与 ledger 一致 |
| U-013 | 创建 custom profiles，并把 luca Agent 从 built-in Codex 切到 bridge | U-001,U-002,U-012 | Multica config | UI/CLI 显示 custom executable |
| U-014 | 跑真实 Issue、故障注入和连续任务试运行 | U-013 | audit receipts | 全部硬门通过 |

U-ID 一旦冻结不重编；拆分使用 `U-NNN-a/b`。所有实现先写失败测试，再写最小实现。

## 12. 阶段门与验收断言

### GATE-A — 上游来源真实性

- 人工分配 Issue：唯一 PASS；
- 私聊、comment、mention、quick-create、delegation：queue 前 DENY；
- manual/schedule/webhook/API Autopilot：queue 前 DENY；
- pre-Prepare grant 与 execution grant 不同 `jti/aud`，各只能消费一次；
- reclaim/retry 使用新 attempt；重放、过期、错 agent/runtime/daemon/gateway、未知版本：对应阶段 DENY；
- ticket 后修改 issue revision、payload/attachment、policy、skills、capsule、provider/schema 任一项：provider 前 DENY。

### GATE-B — 零框架污染

- 向 Carrier 注入唯一 marker 字符串；它可以存在于 Carrier；
- VM/share manifest 必须证明 host HOME 与两个真实检出从未挂载；UI、daemon、gateway、supervisor、local outbox、fake/real provider 对 host sentinel/路径与全局配置的读写/链接/socket 尝试全部 `ENOENT/EPERM`，RemotePublicationAuthority 也没有到 host 文件面的路由；只有 daemon 可见本 attempt Carrier，gateway/controller/worker 对 Carrier 均拒绝；只有 controller 可见 ledger/outbox authority，daemon/worker 均拒绝。host/guest 原始访问审计必须为 0 次越权成功；
- 同一 marker 在 capsule、task branch、provider HOME、两个真实检出中必须为 0，作为补充末态检查而非“从未读取”的唯一证据；
- 强制 Multica cleanup 失败或完全跳过，两个真实检出和 approved generation 必须 byte-exact 不变；下一 attempt 使用全新 Carrier。

### GATE-C — 协议与 prompt 防火墙

- gateway 必须是协议终止器：Codex 覆盖 `thread/start`、resume、fork、settings update、turn start、nested cwd、runtime workspace roots、config path；Claude 覆盖 argv、stdin/stdout、system prompt、resume、cancel、signal、exit code；未知 method/field/事件顺序 DENY；
- resume/fork 只能引用 gateway 自建映射；Multica 提供的 prompt/cwd/config/thread/tools/MCP/skill/settings 不进入 provider request；
- instrumented fake provider 记录原始 argv/env/cwd/协议输入，注入的 `baseInstructions/developerInstructions/additionalContext` marker 必须为 0；真实 provider transcript marker=0 仅为补充；
- provider 实际 `pwd` 必须是 capsule，实际规则/skills/hook hash 必须来自 approved SHA。

### GATE-D — 生命周期与 Git

- gateway、supervisor、provider、daemon 在状态机每一态分别 kill；恢复后不得提前释放 lease 或丢审计；
- RemotePublicationAuthority 不得早于当前 fence 的 exact `PUBLISH_AUTHORIZED` 接受对象包，远端 ref gate 必须在落地当刻原子消费 grant；provider terminal 不得早于 signed `COMPLETION_COMMIT_ACK` 释放；lease 不得早于幂等 `REPORT_DELIVERY_ACK` 释放；
- 旧 attempt 未完成对账或存在 in-flight ref transaction 时 server 不得签发新 claim；故意让旧 publication 请求跨越 fence advance 后迟到，远端 gate 必须在任何 ref 副作用前 DENY；
- `NO_CHANGE/COMMIT_BRANCH/DIRTY` 三终态互斥；DIRTY 必须失败且 quarantine；
- linked worktree 数量为 0；
- RemotePublicationAuthority 只可通过 ref-transaction gate create-only/CAS 更新 `agent/multica/<publication_idempotency_key>` 并回读 exact SHA；worker/controller 无 push 凭证，canonical main/delete/force 永远禁止；
- dirty 未 commit 时保留 capsule/patch，不由 supervisor 擅自 commit。
- `terminal_hold_timeout < daemon completion-lease/watchdog margin`；分别覆盖 Claude result hold、Codex `turn/completed` hold、daemon cancel、gateway reconnect、network stall、publish grant 到期，以及“已发布但 completion commit ACK 失败”。

### GATE-E — 自动同步

- canonical SourceRef 的普通 main commit 通过双 canary后，下一安全任务边界使用新 SHA；
- 任一 canary 失败，approved generation 与运行 capsule不变；
- trust-sensitive delta 停在 `TRUST_REVIEW_REQUIRED`；
- Multica/provider/schema 自动更新触发 `VERSION_DRIFT`，不启动新任务。
- non-fast-forward、remote URL/ref 变化触发 `SOURCE_HISTORY_REWRITE`；LKG refs 和旧 supervisor bundle 必须仍能回滚。

### GATE-F — Skill 与状态 parity

- Core 模式 effective inventory 只含 approved lucagstack skills 与 pinned provider builtins；
- External Skill 模式只有 provider capability canary PASS 后才开放；只多出任务显式选择的 skill-only ID/SHA，所有路径 controller-owned、仓库外、worker 只读；
- effective inventory 同时覆盖 skills/hooks/MCP/agents/commands/scripts，禁止 namespace 抢占；
- episodic、semantic、observability、person、project memory 分层验证，不能用单一计数冒充；
- StateExportBroker 对未签入 layer/project/path、目录枚举与原始 config 请求全部 DENY；worker 读取的 snapshot digest 必须与 task inventory 相同，所有反向 memory 写入只形成 typed candidate/quarantine proposal，不能直接改 host 权威状态；
- framework/meta 无 pin 可运行但不得写下游；project task 无真实 session binding 必须 `PROJECT_BINDING_REQUIRED`。

### GATE-G — Crash recovery 与外部副作用

| 崩溃窗口 | 唯一允许的恢复 |
|---|---|
| `LEASED` 前 | 无外部副作用，安全重试 |
| `RUNNING` | 销毁 worker namespace，quarantine capsule，不发布 |
| provider terminal 后、`PUBLISH_INTENT` 前 | 不发布，任务失败 |
| intent 已 fsync、publication handle 未创建 | 按当前 fence 重新提交；stale fence DENY，无 Git 副作用 |
| authority 已进入 `PUBLISHING`、remote ref 未创建 | server 禁止新 claim；远端 gate/in-flight record 结束前 fence 不前进，恢复只按 exact manifest 重试/reconcile |
| 旧 ref request 在本地检查后跨 fence 迟到 | 远端 ref-transaction gate 以当前 fence/JTI 原子拒绝，ref 不落地 |
| remote ref 已创建、receipt 未写 | 按稳定 publication key 从 RemotePublicationAuthority 回读 exact SHA，补写 receipt，不二次更新 ref |
| receipt 已写、completion commit ACK 未取得 | `PUBLISHED_UNRECONCILED`；幂等补交同一 receipt，禁止新 claim |
| completion commit ACK 已写、terminal 未释放 | gateway 重连到 supervisor session，重送同一终态，不二次执行 |
| terminal 已释放、report delivery ACK 未取得 | `COMPLETED_UNREPORTED`；只补送报告，不改变已 commit 结果 |
| report delivery ACK 后、lease 未释放 | 证明 worker/process namespace 已死亡后释放 |
| stale writer 在任一 publish 窗口复活 | authority/ref gate 因旧 fence/非当前 grant 在 ref transaction 内拒绝 |
| supervisor bundle/schema 不兼容 | 停机并保留 journal，禁止新版本猜测恢复 |

lease 不按 mtime 抢占；必须绑定 owner handle、PID + boot identity、execution attempt 与进程 namespace。每个外部副作用前先写 intent+fsync，完成后写 receipt+fsync。

### 文档冻结断言

```bash
# [BLOCKING] PLAN-001 — R3 必须声明 v0.4.36 和上游硬前提
rg -q 'v0\.4\.36 / c1a61e1e8' framework-audit/2026-08-30-multica-gstack-final-plan.md \
  && rg -q '上游硬门' framework-audit/2026-08-30-multica-gstack-final-plan.md

# [BLOCKING] PLAN-002 — 真实检出不得成为 Multica local-directory
rg -q '真实 lucagstack 目录绝不能再作为 Multica local-directory' framework-audit/2026-08-30-multica-gstack-final-plan.md

# [BLOCKING] PLAN-003 — 三个风险均有机械门
rg -q 'RISK-1' framework-audit/2026-08-30-multica-gstack-final-plan.md \
  && rg -q 'RISK-2' framework-audit/2026-08-30-multica-gstack-final-plan.md \
  && rg -q 'RISK-3' framework-audit/2026-08-30-multica-gstack-final-plan.md

# [BLOCKING] PLAN-004 — 文件读到终止标记
tail -n 1 framework-audit/2026-08-30-multica-gstack-final-plan.md \
  | rg -q 'FILE_END: 2026-08-30-multica-gstack-final-plan.md'

# [BLOCKING] PLAN-005 — 两阶段 grant、per-attempt Carrier、读隔离和 ACK commit point 均存在
rg -q '两阶段 admission grant' framework-audit/2026-08-30-multica-gstack-final-plan.md \
  && rg -q 'Per-attempt Disposable Carrier' framework-audit/2026-08-30-multica-gstack-final-plan.md \
  && rg -q '全部 `ENOENT/EPERM`' framework-audit/2026-08-30-multica-gstack-final-plan.md \
  && rg -q 'completion_commit_ack' framework-audit/2026-08-30-multica-gstack-final-plan.md \
  && rg -q 'publication_idempotency_key' framework-audit/2026-08-30-multica-gstack-final-plan.md
```

### 产出质量 criteria

- `[C1]` 方案没有把当前 Multica API 无法证明的来源写成已解决；
- `[C2]` 三个已知风险分别有独立的预防门、负向 canary 与 fail-closed 结果；
- `[C3]` 用户只维护 canonical repository 的 `refs/heads/main`，所有其他 clone/store/ledger 都是自动状态；
- `[C4]` Multica skill 可以外置安装，但不存在进入 lucagstack skill roots 的路径；
- `[C5]` 外层 VM 与内层 worker 是生产默认硬门；UI/daemon、controller 与 provider 的 capability/mount 边界被分别验证；
- `[C6]` 所有不可逆配置动作都晚于新 SHA 批准和上游部署；
- `[C7]` 删除集成后，原 lucagstack 在 Claude、Codex、luca app 中行为不变。

## 13. 失败、回滚与停止规则

- 任一 BLOCKING gate 失败：当前 Wave 停止，不改 hook 兜底，不降低入口策略。
- 同一问题连续 3 次失败：状态 `BLOCKED`，保留日志、ticket hash、版本、capsule 与审计。
- candidate 失败：隔离 staging；approved generation 与 production 不变。
- provider 前失败：销毁或隔离 capsule；不触碰用户检出。
- provider 后失败：保留任务分支/patch/capsule；不自动回滚或提交。
- cleanup 失败：隔离 Carrier；不把 cleanup 结果用作真实仓库安全判断。
- gateway/supervisor 升级失败：继续使用上一批准 bundle；不自动替换运行版本。
- 上游 ticket 能力被移除或 schema 漂移：立即关闭 Agent runtime，不退回 built-in Codex。

## 14. 实施完成后用户要做什么

### 一次性动作

1. 确认 Multica 上游补丁与 RemotePublicationAuthority/ref gate 已部署，或批准使用自托管 patched server/daemon + 受控 publication service；
2. 批准创建专用执行 VM 与内层 worker compartment，并通过 controller credential broker 完成一次 Claude/Codex 登录与 trust；长期 secret 不进入 provider HOME；
3. 审核 custom runtime profile、Carrier 路径、Agent origin policy 与 StateExportBroker 的 memory allowlist；
4. 批准后由实施方切换 luca Agent；用户不需要填写截图中的 custom args/env。

### 日常动作

- 只维护 lucagstack：修改、commit、push canonical `refs/heads/main`；
- 普通更新自动 canary 和晋升；
- 只有 trust-sensitive 更新、全新 Multica skill SHA 或 provider 大版本变化需要确认；
- Multica 任务成果进入 task branch/patch，用户按正常 review 合入 main。

## 15. 被否决的方案

| 方案 | 否决原因 |
|---|---|
| 继续使用内置 `codex app-server` | 没有 admission、cwd/prompt firewall 或 supervisor |
| 在 custom args/env 中塞脚本 | 入口太晚，且无法覆盖协议内 cwd/system fields |
| 真实 clone 作为 local-directory | Prepare 已经先污染，cleanup 失败直接落真实目录 |
| carrier + 简单 wrapper `cd` | Codex JSON-RPC 与 resume/settings 内还有显式 cwd/config 旁路 |
| task API 只检查 `issue_assignment` | manual Autopilot 与人工 Issue 可信形状碰撞 |
| Only me / 私有 Agent | owner 仍可 chat、mention、Autopilot 调用 |
| `.gitignore` 或任务后删除 skill | 只隐藏/擦除证据，不阻止模型读取污染内容 |
| linked worktree | 共享 Git common dir，不能形成独立安全边界 |
| provider 自己判断 idle/cleanup | provider/gateway 可被 daemon timeout 杀死，不能持久持 lease |
| 无上游改造先做“受控 pilot” | 违反用户的三个硬前提，项目意义不成立 |

## 16. Deletion Test

删除以下内容：

```text
integrations/multica/**
isolated daemon/control/worker volumes
controller credential capabilities
host trusted StateExportBroker
RemotePublicationAuthority/ref-gate state and credential
Multica custom runtime profile 与 Carrier resource
```

这是完整卸载操作，不是日常 cleanup。执行前必须先停用 profile、确认无 lease/`PUBLISHED_UNRECONCILED`/`COMPLETED_UNREPORTED`、导出审计与任务成果，并由用户单独确认；ledger/journal/receipts 在集成存续期间不可删除。

删除后：

- 两个现有 lucagstack 检出不需要恢复或清理；
- Claude、Codex、luca app 的 hooks、skills、memory、project pin 行为不变；
- 不残留全局 skill、全局 hook 或对 Multica 的运行依赖。

这证明 Multica 集成是可删除的 Adapter/Seam 层，而不是第二套 lucagstack。

## 17. 授权与终态

本计划完成三方复审后先计算文件 SHA-256。由于当前两个检出存在无关 dirty，计划持久化必须在从 `canonical_url + refs/heads/main` 新建的 clean 临时 clone 中、从用户批准的 exact `base_sha` detached 起步；不得从当前 checkout 建 commit，也不得携带其 ahead/dirty。

入库前生成 canonical `plan_persistence_manifest_v1`，至少包含：

```json
{
  "schema": "plan_persistence_manifest_v1",
  "repo_url": "exact canonical URL",
  "canonical_ref": "refs/heads/main",
  "base_sha": "full Git SHA resolved from canonical remote",
  "plan_ref": "refs/heads/plan/multica-gstack-r3-20260830",
  "plan_path": "framework-audit/2026-08-30-multica-gstack-final-plan.md",
  "plan_file_sha256": "64 hex",
  "expected_parent_count": 1,
  "expected_diff_paths": ["framework-audit/2026-08-30-multica-gstack-final-plan.md"],
  "expected_mode": "100644"
}
```

用户批准的是该 canonical JSON 的 SHA-256，而不只是文件 hash：

```text
批准计划入库 <plan_persistence_manifest_v1 的完整 64 位 sha256>
```

批准后创建的 commit 必须恰有一个 parent 且 `parent == base_sha`；相对 parent 的 tree diff 必须只含 `plan_path`，文件 mode 与 SHA-256 必须一致，禁止 merge parent、额外文件、submodule 或 mode 夹带。固定 `plan_ref` 只能以 expected-absent create-only/CAS 推送；远端回读必须等于 exact commit SHA。任一断言失败即作废，不改用当前 dirty checkout 补救。

入库后生成 `implementation_approval_manifest_v1`：完整继承上述 repo/ref/base/path/file 字段，并加入 `plan_commit_sha`、`plan_blob_oid`、`remote_readback_sha` 与“single parent / exact one-path diff”验证 receipt。用户的实施授权为：

```text
批准实施 <implementation_approval_manifest_v1 的完整 64 位 sha256>
```

只有 manifest 展示给用户的全部字段、manifest SHA、远端 commit/tree/blob 和本地文件 SHA 全部一致时才有效。即使实施已批准，Wave 4 接线仍受 `GATE-A` 上游部署结果约束；在此之前，用户截图中的 Agent 保持 built-in Codex，不做半成品切换。

<!-- FILE_END: 2026-08-30-multica-gstack-final-plan.md -->
