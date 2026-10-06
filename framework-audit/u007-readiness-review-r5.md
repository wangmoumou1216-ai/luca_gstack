J09：**PASS，仅接受 W25/W26 局部评估工具修复。**

四项断言均通过：未映射 hook 被保留，总计数置 `null`，试次判 `INVALID_RUN`；已有预算错误、候选失败和原始事件保留。正常、重复及乱序投影不重复计费。

最终 W26 测试在 R5 上 **0/4、退出 1**，在 R6 上连同回归 **19/19、退出 0**。将 `>=2` 改为 `null + visible=1 + unmapped` 有依据，仍能检出旧漏洞。

全链覆盖、硬上限保证及真实原生权限仍未证明。本票不放行正式比较、生产改造或新探针。

审查：22:03:36–22:05:04 UTC；12 个保守动作，约 2.85 万观察 token。0 模型、探针、测试重跑或写入；全部冻结身份前后匹配。

EVAL_ENVELOPE_JSON
```json
{
  "schema_version": 1,
  "producer": "quality-gate",
  "eval_run_id": "tri-system-u007-observability-20261003-r5",
  "subject": {
    "skill": "quality-gate",
    "topic": "J09 bounded R5-to-R6 observability repair review",
    "scene": "unknown",
    "input_summary": "Independent review of the exact three-file W25/W26 diff, final author reports, final W26 RED/GREEN metadata and raw TAP, relevant driver contexts and local consumers. Reused unchanged J07/J08 requirements.",
    "output_paths": [],
    "duration": "heavy"
  },
  "verdict": {
    "status": "PASS",
    "passed": 4,
    "total": 4,
    "findings": [
      {
        "id": "J09-1",
        "status": "PASS",
        "criterion": "Preserve the P06 hook-only gap, incomplete count and invalid status without erasing existing failures",
        "evidence": [
          "driver.mjs:368-379 records preToolUse/postToolUse notifications with thread, turn, original hook-run ID, event, source, status and extracted call ID. Extraction requires the observed event/displayOrder/sourcePath prefix; unrecognized formats retain null rather than guessing.",
          "driver.mjs:648-661 reconciles hook witnesses against recorded item/callback projections after cleanup and retains unmatched call identities and reasons.",
          "driver.mjs:664-678 preserves visible_tool_actions, exposes tool_actions=null for incomplete mapping, appends INCOMPLETE_TOOL_ACTION_OBSERVABILITY and invokes fail.",
          "driver.mjs:225-229 appends errors and preserves the first fatal reason; :689 retains INVALID_RUN whenever fatal exists. The repair does not delete prior budget errors, engine state or raw RPC.",
          "green.tap W26 normal-terminal gap case reports INVALID_RUN, tool_actions=null, visible_tool_actions=1, one unmapped exec-unmapped-native identity and eight preserved hook events.",
          "green.tap budget-interruption gap case retains OBSERVED_TOKEN_BUDGET and additionally records INCOMPLETE_TOOL_ACTION_OBSERVABILITY. Its final test verifies confirmed interruption, delivered inputs, unfinished stage and absent artifact."
        ],
        "limits": [
          "A completed hook is only an activity witness; the implementation does not treat it as a successful command or permission check.",
          "This review did not reopen or independently re-establish the later P06 native-dispatch diagnosis described in author reports."
        ]
      },
      {
        "id": "J09-2",
        "status": "PASS",
        "criterion": "Preserve projection counting, identity separation and nullable consumer semantics",
        "evidence": [
          "driver.mjs:272-279 keys projections by JSON-encoded thread/turn/call ID. Reconciliation uses the same tuple, so a matching call ID in another thread or turn cannot discharge a hook gap.",
          "Projection registration occurs after existing item/callback thread and turn checks. Those checks remain unchanged.",
          "Existing action deduplication and per-thread/turn/tool dynamic callback/item maximum remain intact. Hooks do not call action() and therefore add no synthetic charge.",
          "The diff's W25 tests cover normal, alias, duplicate, post-terminal hook and opaque-ID cases. W26 raw GREEN evidence verifies normal and late/duplicate native-plus-dynamic sequences remain visible count2 with mapping_complete=true.",
          "W26 mapped cases retain native exit2 and incomplete-protocol candidate evidence. They remain execution-record COMPLETED without claiming semantic or necessary-control success.",
          "A scoped non-test consumer search within scripts/tri-system-eval found tool_actions use only in driver initialization, live visible counting/enforcement and final observability projection. No comparison or zero-coercion consumes the nullable total after finalization.",
          "Persisted result status and CLI exit depend on status, not a coercion of null to zero. Added integration assertions require strict null and result.json equality with the returned report."
        ],
        "limits": [
          "mapping_complete means observed witnesses were associated, not that every real operation was visible.",
          "The per-tool maximum remains a projection-counting convention; this change does not prove general wrapper/child equivalence.",
          "Consumer review was limited to the authorized evaluation module, not hypothetical future or external consumers."
        ]
      },
      {
        "id": "J09-3",
        "status": "PASS",
        "criterion": "Final W26 assertions remain meaningful and exact RED-to-GREEN evidence supports the local claim",
        "evidence": [
          "Both red-final.json and green.json bind the identical final integration test SHA256537ab63bf691b994f01768340caab4e242b31933495206be6783d93cbebeffc8.",
          "RED metadata binds R5 driver ce5372b72266a8c99edd2c1b0a91f555cf34e99e04033ff7918a9d022550659f; actual Node exit1, four tests, zero pass.",
          "RED raw diagnostics expose the original defect: normal-terminal hook-only activity returned COMPLETED with tool_actions1; the interrupted case retained tool_actions1 rather than null.",
          "The two RED normal-mapping controls fail on absent new observation fields, not on a claimed regression of the old numeric count2.",
          "GREEN metadata binds R6 driver67c76f86f5614d8c79ec49f4007391eebf94a6d932003036c997223c95ea8d66, unchanged conditions/protocol, and the same final test bytes. Actual Node exit0; TAP records19 tests,19 pass,0 fail,0 skipped.",
          "The19 GREEN tests comprise four W26 cases and fifteen existing integration regressions, including proof omission rejection, engine EACCES propagation, candidate omission, staged reads, dependency retry, child controls and fresh-state retention.",
          "Changing the total-count assertion from >=2 to null is justified: distinct hook-associated activity proves a coverage gap but does not establish a universally billable second operation. The revised test requires visible1, exact unmatched identity, incomplete mapping, invalid status and retained errors, so it still kills R5's omission."
        ],
        "read_limits": [
          "Verified raw TAP identities, result counts and decisive diagnostic/assertion fields. Large rendered outputs were partly truncated; relevant source/error fields were subsequently inspected separately.",
          "W25 seven-test and49-test execution claims were read in the complete author report, not independently certified from separate raw W25 logs.",
          "No tests were rerun because exact final-version offline evidence and code inspection were sufficient for this bounded review."
        ]
      },
      {
        "id": "J09-4",
        "status": "PASS",
        "criterion": "Accept only the local evaluation-tool repair with explicit unresolved boundaries",
        "evidence": [
          "The exact diff changes only driver.mjs, driver.test.mjs and integration.test.mjs. The four other frozen implementation/test files retain their prior hashes.",
          "tool_action_observability always exposes whole_chain_coverage=UNKNOWN and formal_comparison_eligible=false.",
          "hard_limit_compliance is EXCEEDED only when the visible count exceeds the cap; otherwise it remains UNKNOWN. It does not claim hidden operations are hard-capped.",
          "The repair detects and retains the observed missing-item class. It does not repair native launch permissions, produce missing command output or synthesize an accepted effective proof."
        ],
        "remaining_limits": [
          "Operations that produce neither a supported hook witness nor an observable item/callback remain undetectable by this mechanism.",
          "Hook-ID parsing intentionally recognizes the observed P06 convention only; unfamiliar forms become unresolved gaps.",
          "Hook-only gaps are reconciled after cleanup. The change invalidates incomplete accounting but cannot enforce a hard limit on invisible activity while it happens.",
          "Real native permission behavior, launch dependency access, child telemetry and complete operation accounting remain unproved.",
          "formal_comparison_eligible=false is explicit result metadata, not an independent grant or proof. A COMPLETED execution record is not formal comparison eligibility."
        ],
        "scope_decision": "Accept R6 as a local observability repair. Preserve J08 FAIL and all P06 failures/costs. This ticket grants no model/probe, permission expansion, formal comparison, production-framework implementation or publication authorization.",
        "next_step": "Root records this local acceptance and carries the remaining native-runtime/qualification limits into its existing operational decision. Do not commission another gate or rerun completed offline suites solely because this ticket passed."
      },
      {
        "id": "J09-AUDIT",
        "status": "PASS",
        "started_at": "2026-10-02T22:03:36Z",
        "finished_at": "2026-10-02T22:05:04Z",
        "conservative_tool_actions": 12,
        "observable_tool_tokens_approx": 28500,
        "model_runs": 0,
        "probe_runs": 0,
        "test_runs": 0,
        "file_writes": 0,
        "input_manifest_sha256": "9c1f639925cde2e8c222473f20947d215117fccac0b393fbecb4f9926b0c1f9c",
        "integrity": "All sixteen listed file identities matched before and after review. Complete task, diff and both final author reports were read. Unchanged four source/test files were hash-checked only.",
        "scope_compliance": "No private/archive, global configuration, snapshots, other chats or product files were read. No network, implementation changes or new agents.",
        "cost_limitations": "Observable tool-token estimate is not a monetary bill or a claim about hidden platform costs; those remain UNKNOWN."
      }
    ]
  }
}
```

