# Long-session and checkpoint contract

Load this file for multi-phase work, context pressure, resume/handoff, or before a Git/external effect.

## Checkpoint triggers

Write a checkpoint after each phase of a multi-phase task, after two heavy agents, when the conversation approaches context pressure, and immediately before an irreversible Git or external effect. A checkpoint records:

1. completed work with exact files and verification evidence;
2. current work and any live agent ownership;
3. remaining phases in approved order;
4. decisions that cannot be reconstructed from code;
5. the exact resume command or read list.

For a project-pinned workflow, use its declared handoff/checkpoint path. For `NO_PIN` framework/meta work, use `framework-audit/` or an OS temporary handoff; never write through `docs/`.

## Context bounds

Give explorers only the search question, workers the exact task and owned files, and reviewers only the frozen diff, requirements, and assertions. Do not give reviewers implementation history. Read long files progressively but always reach the final line when a governing file is selected.

## Resume

On resume, verify the repository SHA and worktree first, re-run the narrow phase gate, and continue from the first unfinished phase. Never repeat a completed mutation or stage the protected dirty files named by the checkpoint.

<!-- FILE_END: skill-os/runtime/long-session.md -->
