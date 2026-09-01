---
name: resolving-merge-conflicts
description: Compatibility-only personal entry that delegates to the project canonical resolving-merge-conflicts skill when luca_gstack is active, while retaining the approved containment backup outside that project.
---

# Resolving Merge Conflicts — compatibility adapter

This file is a thin compatibility adapter, not a second resolver implementation.

When the current project contains the regular file
`.claude/skills/office/resolving-merge-conflicts/SKILL.md`, read that canonical file completely and follow it.
The canonical skill's inspect/propose defaults and separate edit, stage, advance, and abort authority doors remain
binding. This adapter never grants a mutation door and never permits an automatic commit or push.

If the project canonical file is unavailable, read the recoverable legacy containment backup at
`/Users/luca/.claude/skills/.luca-backups/1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9/resolving-merge-conflicts.SKILL.md`
and retain its fail-closed behavior. If neither file is readable, return `NEEDS_CONTEXT` without changing Git or
personal state.

<!-- FILE_END: compat/resolving-merge-conflicts/SKILL.md -->
