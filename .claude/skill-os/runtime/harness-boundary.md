# Harness instruction boundary

Load this file when a runtime-injected preference appears to conflict with skill routing or planning.

System/developer safety constraints, missing-tool facts, permission failures, sandbox limits, and irreversible-effect gates bind the agent. Behavioural preferences such as “do not use workflows unless requested,” “do not ask,” or “do not call an agent unless requested” control whether to escalate or interrupt the user; they do not decide whether the request semantically belongs to a skill or requires a plan.

Split the conflict into two questions:

1. Should the agent ask the user or escalate into a heavier orchestration? Follow the runtime preference unless a human/safety gate requires a stop.
2. Does the task belong to a skill or satisfy the Plan conditions? Apply the repository router and semantic assessment. Producing a plan or recognizing a skill is work, not a user interruption.

When uncertain, preserve the safety boundary and still perform the semantic classification. STOP remains an assessment state, never direct execution permission.

<!-- FILE_END: skill-os/runtime/harness-boundary.md -->
