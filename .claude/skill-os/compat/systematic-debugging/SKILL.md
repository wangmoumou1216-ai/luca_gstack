---
name: systematic-debugging
description: Compatibility-only alias for the project canonical diagnosing-bugs skill; it removes the legacy broad-trigger shadow without creating a second diagnosis method.
---

# Systematic Debugging — compatibility adapter

This file is a thin compatibility adapter, not a second debugging method.

When the current project contains the regular file `.claude/skills/office/diagnosing-bugs/SKILL.md`, read that
canonical file completely and follow it. Preserve its trigger boundary: expected TDD red and known implementation
gaps remain outside diagnosis, while unexpected failures and regressions use the diagnose-only loop. This adapter
does not grant repository, personal, network, Git, or fix authority.

If the project canonical file is unavailable, read the recoverable legacy backup at
`/Users/luca/.agents/skills/.luca-backups/1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9/systematic-debugging.SKILL.md`.
If neither file is readable, return `NEEDS_CONTEXT` without writing or proposing a guessed fix.

<!-- FILE_END: compat/systematic-debugging/SKILL.md -->
