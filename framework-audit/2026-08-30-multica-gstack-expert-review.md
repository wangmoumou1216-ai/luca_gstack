# Multica × luca_gstack 三席专家会审裁决

> 日期：2026-08-30
>
> 评审对象：`/Users/luca/.claude/plans/multica-agent-multica-multica-luca-app-fluffy-penguin.md`
>
> 范围：只评审方案，不创建 clone，不修改 Multica 配置，不改信任状态。

## 总裁决

**`REVISE × 3`。现有三个风险解决方案都不是最佳方案，原计划当前不可批准实施。**

| 专家席 | 裁决 | 核心反证 |
|---|---|---|
| 运行时架构 | REVISE | custom runtime wrapper 在 Multica `Prepare/InjectRuntimeConfig` 之后才启动，不是干净的 pre-prepare seam |
| 安全与隔离 | REVISE | M1/M3 的检查晚于注入；chat 可能绕过 local-directory mutex；自动 checkout/reset 会毁证 |
| Git/SRE | REVISE | 单副本直接消费 main 没有严格 LKG、持久 lease、候选晋级和安全任务回流 |

原方向中可以保留的只有：

- 一个固定的 production provider cwd，以保留 Claude/Codex 的绝对路径 trust。
- Claude 与 Codex 各自的 custom runtime profile。
- 专用运行副本与权威 luca_gstack 隔离。
- 任务边界同步、运行中不更新、异常 fail-closed。

必须删除或改写的结论：

- 删除“wrapper 启动前目录必然 clean”。
- 删除“直接在 wrapper 中 `fetch + ff-only` 即可安全同步”。
- 删除“空 workdir 有 AGENTS.md ⇒ 当前 in-place 必然覆盖 tracked AGENTS.md”。
- 删除“NO_PIN 影响有限”。
- 删除“用 `.gitignore` 隐藏 Multica skill 是兜底”。
- 删除“MEMORY_ROOT 已证明所有 memory/observability 完全共享”。
- 删除“技术可行性无悬念”和“完美复用”这类超出证据的表述。

## 决定性生命周期证据

本机 Multica `v0.4.32 / d60775aa9` 的 issue worker 顺序为：

```text
取得 local-directory path lock
→ Prepare
→ InjectRuntimeConfig：AGENTS/CLAUDE/skills/sidecars
→ 启动 custom runtime wrapper
→ provider
→ Multica cleanup
→ 释放 path lock
```

因此 wrapper 是“**注入后、provider 前验证点**”，不是“同步前准备点”。chat task 还可能跳过同一 path mutex。

一手源码：

- path lock: https://github.com/multica-ai/multica/blob/d60775aa9/server/internal/daemon/daemon.go#L4756-L4772
- Prepare/injection: https://github.com/multica-ai/multica/blob/d60775aa9/server/internal/daemon/daemon.go#L6757-L6844
- custom profile launch: https://github.com/multica-ai/multica/blob/d60775aa9/server/internal/daemon/daemon.go#L7145-L7160
- chat bypass: https://github.com/multica-ai/multica/blob/d60775aa9/server/internal/daemon/daemon.go#L5037-L5046

## 最佳目标与当前可实施方案

### 长期最佳解

由 Multica 提供正式 lifecycle seam：

```text
取得真实路径锁
→ after-lock / before-Prepare admission hook
→ 同步并批准 exact SHA
→ Multica 基于该 SHA 做 injection
→ provider-launch verification
→ provider
→ cleanup verification
```

没有这个 seam 时，任何“完全无竞态、完全零注入”的承诺都不成立。长期动作应是向 Multica 上游提出/实现受支持的 pre-Prepare hook，而不是在 luca_gstack 内长期维护一套 Multica 私有注入协议。

### 当前版本下的最佳实用架构

```text
origin/main（唯一人工维护源、candidate feed）
              ↓
固定 staging replica（自动维护、非任务执行槽）
              ↓ Claude + Codex host-local canary
仓库外 approved-SHA ledger + LKG ref + CAS generation
              ↓
固定 production replica（唯一 provider cwd）
              ↓
外置 TaskAdmissionGateway
  · 任务内 gateway 版本快照
  · 持久 lease
  · Multica 注入 delta 验真
  · 将已批准 SHA 与注入 delta 做精确事务重基
  · provider-launch assertions
              ↓
agent/multica/<run-id> 任务分支
```

这里有两个**自动副本**，但仍只有一个维护源。当前是单机、单 daemon、私有 runtime，因此 approved ledger 放在本机仓库外即可；出现第二台 daemon/主机、多个 production consumer 或远程审计要求时，必须升级为受保护的远端 release manifest / `multica/stable`。

外置 gateway 的运行代码不能直接从正在更新的 production clone 延迟加载。当前任务先快照 gateway 自身；新 gateway 只能原子安装给下一任务使用。

### 当前可实施方案的硬限制

1. 初期只开放 Issue worker；关闭 chat/direct-chat/mention/autopilot，并发设为 1，直到跨入口锁行为全部实测。
2. Multica daemon 版本必须固定；升级后重新跑 injection、cleanup、锁、resume 全套 canary。
3. workspace/runtime Skill 先全部禁用。Skill 隔离属于后续独立方案，不进入第一阶段。
4. 若注入 delta 无法被 marker/manifest 精确识别或无法无冲突重基，任务在 provider 前失败；不得 stash、reset、checkout 或隐藏。
5. provider 一旦启动，任何失败都不得自动切回 LKG。

## 三个风险的最终裁决

### M1：AGENTS.md / CLAUDE.md

**原方案：REJECT。** 任务后 `git checkout AGENTS.md` 太晚，也会毁掉取证。

最佳实用门禁：

```text
user_projection(AGENTS.md) == blob(launch_sha:AGENTS.md)
AND user_projection(CLAUDE.md) == blob(launch_sha:CLAUDE.md)
AND exactly_one_valid_multica_managed_block
AND managed_block_hash == approved_agent_profile_hash
AND protected_manifest == approved_manifest
```

`user_projection` 是移除一个合法、完整、非嵌套的 Multica managed block 后的用户字节；不能直接拿注入后的全文件和 Git blob 比较。symlink、非普通文件、重复/未知 marker、未知 tracked delta 全部阻断。

恢复方式：隔离副本并保留 diff/manifest/log，从 sealed SHA 恢复服务；不在原 session 上恢复后继续。

### M2：NO_PIN

**原方案：REJECT。** `scope/project` 文本不是 session pin，wrapper 也不能预造真实 session ID/turn epoch。

- framework/meta task：`NO_PIN` 是正确状态，继续禁止下游 `docs`/workflow/current-topic 写入。
- project task：必须由首个真实 `UserPromptSubmit` 使用 session ID 走现有 binding transaction；保护写入只在以下条件成立时放行：

```text
declared_project == TURN_ACTIVE.pin == canonical(target_path)
```

在 Multica issue comment resume 能稳定复用 session、pin 与 turn transaction 之前，下游 project task 不进入 production；失败返回 `NEEDS_CONTEXT`，不猜项目、不从 symlink 反推。

### M3：Multica Skill 污染

**原方案：REJECT。** `.gitignore` 只会隐藏证据；清空 workspace binding 也不等于 effective skill set 为空。

第一阶段裁决：

- Claude/Codex 专用 agent 不绑定 workspace skills。
- 禁用所有可关闭的 runtime-local skills。
- 不可关闭的 builtin 必须用 ID + 内容 SHA 白名单。
- 检查实际 effective skill set，而不是只看 UI 列表。
- 未知 skill、symlink 逃逸、未知 sidecar、cleanup 残留全部阻断并留证。

严格的“任何 luca_gstack 工作树从未出现 Multica Skill”在当前 Claude `in_place` 路径不可实现；Codex 的 per-task `CODEX_HOME` 能实现更强隔离，但两端不能被当成相同机制。该目标需要 Multica external skill root/overlay/container 或上游 lifecycle 支持。

## M4：Stop hook 观察项

当前不改源代码。现有 `session-sync.mjs` 已有 `stop_hook_active + marker + kill-switch` 三重防循环；真正未验证的是 Multica 是否稳定传递 stop payload 与 resume 语义。

门禁：

```text
terminal_within_watchdog
AND block_count(session, same_baseline) <= 1
AND no_unbounded_resume
AND SESSION_SYNC_BLOCK absent by default
```

只有真实多轮 canary 失败后才修 hook；`SESSION_SYNC_BLOCK=0` 只能作为单任务、留痕的应急熔断。

## 自动同步、LKG 与 Git 回流

### approved ledger

ledger 必须位于 candidate 仓库外，由外置 controller 独占写入，至少记录：

```text
generation
observed_main_sha
approved_sha
previous_sha
claude_canary
codex_canary
gateway_hash
trust_contract_hash
previous_record_hash
approved_at
```

批准使用 expected-old/CAS、临时文件、fsync、atomic rename，并用本地 Git ref 固定 LKG object。rollback 生成新的 generation，不倒写旧记录。

### 任务状态

每个任务报告：

```text
observed_main_sha
approved_sha
launch_sha
final_head
task_branch
dirty_state
gateway/profile/daemon version
```

只能保证 `launch_sha` 是批准基线；任务本身可能产生 commit，所以不能宣称整个任务 HEAD 永远不变。

### Git 回流

修改任务从批准 SHA 创建 `agent/multica/<run-id>`，只允许普通 non-force push 到该任务分支。禁止 wrapper 自动 commit 任意 dirty、push main、rebase、merge、force-push 或删除分支。

任务分支经过检查/评审进入 main 后，才作为下一轮 candidate 重新走 staging 双端 canary。

## 新发现的非三项风险

1. **Memory parity 过度声明：** `MEMORY_ROOT` 主要统一 episodic/semantic；observability 仍仓内解析，person/native memory 可能随 cwd/harness 分裂，Codex Multica 还会隔离 native auto-memory。
2. **OS 隔离不足：** 同一 daemon OS 用户仍可访问权威 lucagstack；若把 Multica task 视作不可信代码，最终边界必须是专用 Unix 用户、容器或 VM。
3. **Trust 供应链：** hooks/adapter/AGENTS/CLAUDE 等安全文件变化可自动获取，但不得自动授信；任务必须暂停等待明确批准。
4. **版本漂移：** 当前本机为 v0.4.32，而官方已有更新版本；确定生产版本后必须重新核验源码顺序与 canary，不能把 v0.4.32 的内部实现当永久 API。
5. **cleanup 在 wrapper 之后：** provider wrapper 无法独自证明 Multica cleanup 的最终结果，需要仓库外 post-run auditor 或下一 admission 的强制核查。

## 上线门

以下全部通过前，状态只能是 `DONE_WITH_CONCERNS`：

1. 明确并冻结 Multica daemon/profile/provider 版本。
2. staging candidate 失败时 production byte-exact 零变化。
3. FF 后/provider 前失败可在充分前提下恢复 LKG；provider 启动后不自动回滚。
4. M1、M2、M3、M4 正负用例全部通过。
5. Claude/Codex 的 argv/stdin/stdout/signal/cancel/exit code 透明。
6. issue task 串行，chat/direct-chat/mention/autopilot 被机械禁用。
7. daemon crash、cancel、stale lease、network failure、remote rewrite、dirty/ahead/diverged 全部 fail-closed 且不丢现场。
8. episodic、semantic、observability、person、project memory 五层逐端验证，不再用单一计数替代。
9. 三次连续真实任务无需人工修副本；每次都有完整 SHA/版本/门禁审计。
10. 原计划按本裁决重写、冻结 SHA，并由用户重新批准。

## 会审资料

- 红队质疑：`framework-audit/2026-08-30-multica-gstack-integration-redteam.md`
- Multica Project resources: https://multica.ai/docs/project-resources
- Multica Daemon/runtime profiles: https://multica.ai/docs/daemon-runtimes
- Multica Skills: https://multica.ai/docs/skills
- Multica Security model: https://multica.ai/docs/security-model
- Multica Changelog: https://multica.ai/changelog

<!-- FILE_END: framework-audit/2026-08-30-multica-gstack-expert-review.md -->
