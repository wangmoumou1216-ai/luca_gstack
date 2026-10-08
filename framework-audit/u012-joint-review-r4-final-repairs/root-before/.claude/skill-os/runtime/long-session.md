# Long-session and checkpoint contract

Load this file for multi-phase work, context pressure, resume/handoff, or before a Git/external effect.

## Checkpoint triggers

Write a checkpoint after each phase of a multi-phase task, after two heavy agents, when the conversation approaches context pressure, and immediately before an irreversible Git or external effect. A simple, bounded task with one executor needs no separate state record unless one of these triggers applies. A checkpoint records:

1. the original goal and completion criteria, distinct from the next-step focus;
2. completed work and effects with exact files and verification evidence; original failure evidence and whether each failure remains unresolved;
3. current work, any live agent ownership, and unfinished dependencies and phases in approved order;
4. the latest actual user authorization and corrections with their sources, plus decisions that cannot be reconstructed from code;
5. the first unfinished action and exact resume command or read list, distinguishing sources actually read or verified from references and unknowns.

For a project-pinned workflow, use its declared handoff/checkpoint path. For `NO_PIN` framework/meta work, use `framework-audit/` or an OS temporary handoff; never write through `docs/`.

## Context bounds

Give explorers only the search question, workers the exact task and owned files, and reviewers only the frozen diff, requirements, and assertions. Do not give reviewers implementation history. A narrowed next-step focus must retain the original goal, approved scope, and unfinished responsibilities unless the user explicitly cancels or replaces them. Read long files progressively but always reach the final line when a governing file is selected.

## Resume

On resume, verify the repository SHA and worktree first, reconcile the current authorization, corrections, relevant file preimages, and evidence with the checkpoint, then re-run the narrow phase gate and continue from the first unfinished point. A reference alone proves neither a read nor verification; keep recorded results tied to their source and do not claim they were rechecked. An unresolved failure blocks its dependent work. Never repeat a completed effect or stage the protected dirty files named by the checkpoint.

<!-- FILE_END: skill-os/runtime/long-session.md -->
