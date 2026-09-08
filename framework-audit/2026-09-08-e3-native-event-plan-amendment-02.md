# E3 native event identity — user waiver amendment 02

Parent plan: `E3-NATIVE-EVENT-20260908-01`

Parent plan SHA-256:
`b95ad7aa07cc955e4cf6d6f99ed37e410a15827ed31e6783f0386fdf810224b1`

Authority: the user explicitly instructed `claude cli相关的不要验证了`, then said `继续` after
the assistant confirmed the resulting boundary.

Status: `APPROVED_USER_WAIVER`

## Scope change

1. Run no further Claude CLI command, authentication check, model call, hook probe, resume, or live
   validation in this E3 execution.
2. Preserve the existing Claude Code 2.1.263 attempt evidence as `USER_WAIVED / UNKNOWN`; it is not
   a failure of E3 code and is never counted as PASS.
3. Claude-facing implementation compatibility remains in scope through preserved historical native
   schema evidence, strict synthetic fixtures, static hook/config checks, and non-CLI unit tests.
4. Without current Claude live evidence, the strongest permitted final completion language is
   `DONE_WITH_CONCERNS`. It must name the Claude live-validation waiver.

## Unchanged gates

- Codex must still provide adequate current native evidence and explicit Hook payload evidence, or
  receive a separate user-approved evidence substitution.
- Evidence amendment 01 remains active for safe-distance-2 and identical-text fixtures.
- The concurrent Memory governance session retains ownership of overlapping hook/test files until
  the user explicitly reports release; E3 implementation may not modify those files beforehand.
- No persistent hook trust, restart, activation, E3 commit, push, Memory mutation, v26 A/B call, or
  downstream-project access is authorized.

This amendment supersedes only the parent plan's Claude CLI live-probe requirements. It does not
weaken event-vs-boundary semantics, replay rejection, atomicity, provenance, or fail-closed
assertions.

<!-- FILE_END: E3-NATIVE-EVENT-PLAN-AMENDMENT-02 -->
