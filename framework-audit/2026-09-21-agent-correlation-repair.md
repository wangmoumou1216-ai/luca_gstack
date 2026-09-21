# Agent correlation repair and context-review checkpoint

Scope: NO_PIN framework maintenance. User authorized the correlation fix, then continuation of the context-loading investigation. No commit/push or context-loading policy change is authorized by this repair.

## Reproduction and patch

- Two distinct invocations with unique tool IDs but `agent_type=explorer` produced `EXTERNAL_IDENTITY_DUPLICATE`.
- The host treated repeatable role metadata as a unique identity. A failed binding also left its prepared ticket pending.
- Changed only `scripts/model-route-host.mjs` and its two focused test suites: type reuse is allowed, identity conflicts terminate their ticket, and instance IDs remain unique.
- Added explicit CAS-bound recovery for legacy native tickets containing only a tool ID; fully prepared/live, critical, terminal or changed tickets are excluded. History is retained, never promoted to accepted.
- Fresh checks: host 54 PASS; host mutation 13/13 killed; native hook 29 PASS; model policy/resolver 24 groups PASS; app-server runner runtime 32 PASS / 0 FAIL (fake model transport, real routing/lifecycle code). Diff check and agent-context checker PASS.
- Independent quality-gate: no Critical/Important/Minor findings; 5/6 CONDITIONAL_PASS because full dual-harness live compatibility was not measured. The reviewer additionally checked critical rebind, both host harness states and recovery exclusions in private scratch. Main subsequently closed its runner-test gap with the 32-check isolated suite above; Claude native live remains untested.
- Live Codex evidence: a second explorer invocation and a second quality-gate invocation were allowed despite earlier same-type calls. The repair-review and dependency-expert calls have trusted accepted completion evidence; redteam is still in progress.

## Exact legacy recovery target

- Root session: `01a0c206-b994-7613-ab75-7e7c5262d915`
- Activation: `7ad04a4d-dbd1-4d2d-951b-3681698e3987`
- Invocation: `601e9252-8b3d-43fb-b67d-8ba7821c8f17`
- Tool call: `call_VfXdj3aB6j0xV4ikggama1CN`
- Expected call SHA-256: `74f817a4ab955f6e52fc15f3b7a54474f6b99273e150cb8f60d0fca07e9ea3e5`
- Evidence: this conversation records the PreToolUse denial `model-route correlation failed: EXTERNAL_IDENTITY_DUPLICATE`; no child was created for that call. Current state has only tool_use_id, no agent_type or agent_id. Critical failure is false. The two earlier calls are accepted and must remain unchanged.

## Progress and remaining work

1. Legacy ticket above was invalidated using exact activation/call-hash CAS; both prior accepted records were retained and the critical failure flag stayed false.
2. A later native spawn hit the runtime thread cap, after preparation. Its exact native function_call/function_call_output pair was verified against session, tool ID, turn, normalized input hash and literal failure response. Existing acceptInvocationEvidence recorded failed evidence as refused, not accepted; no new recovery privilege was added. Automatic transport-failure ingestion is not implemented by this patch.
3. Read-only context-loading research: dependency and test-evidence investigations completed. Independent redteam round 1 rejected two omissions; round 2 passed 3/3 checks on the revised text. Next: exact implementation scope approval and behavioral validation. No loading-rule implementation yet.
4. Preserve all unrelated dirty files; baseline checkout HEAD at investigation was `b92beba0462d5c4750cb322c0df95f5bd6187c2c`, with substantial unrelated uncommitted design/template work.

Do not infer full framework health, Claude live parity, or a final lightweight architecture from these focused checks.

中文结论：同类型 agent 误判与绑定失败留下 pending 的已知缺陷已修复，并通过针对性测试、破坏性变异检查、独立审查及真实 Codex 调度。线程上限造成的另一条已知失败已用精确原生回执收尾；并未新增自动处理所有 transport failure 的能力。未提交或推送，也未修改任何启动加载规则。

## Publication gate (subsequent user authorization)

User explicitly requested commit and push, then continuation of the main context-lightening task. Publication scope is exactly the three model-route host/test files and these three 2026-09-21 audit reports. Current branch tracks `upstream/main`; fresh fetch found HEAD and upstream equal before staging. Existing unrelated template/design/observability changes remain excluded. Validate the exact staged tree in an isolated snapshot before publishing; no force push or bypass of failed gates.
