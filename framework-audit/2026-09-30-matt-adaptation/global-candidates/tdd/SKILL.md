---
name: tdd
description: "Test-first vertical red→green cycles at real user-confirmed public seams, with independent outcomes and boundary-only mocks."
license: MIT
metadata:
  recommended-model: core-execution
---

# Local candidate contract

Repository candidate only: this content does not install or migrate a personal skill. Use only when
the actual user has chosen test-first implementation or a parent authorized plan includes it.
Bind verified target scope, exact writes/effects, original U-ID and resume target; framework cwd and
installation directories are not target authority. Read the real domain vocabulary owner and ADRs
when authorized, preserving terminology and prior decisions.

Public seam agreement must be a real human answer or already valid explicit agreement before any
test is written. When interface shape is unresolved, consult the authorized codebase-design reference
through its actual path; do not assume a sibling global installation. Missing runner or dependencies
return NEEDS_CONTEXT; no dependency auto-install or unrun “green”.

# Test-Driven Development

TDD is the red → green loop. This skill is the reference that makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle: consult them before and during the loop, not after.

When exploring, follow the authorized project vocabulary owner/map and relevant ADRs; absent files do not authorize setup.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification: "user can checkout with valid cart" tells you exactly what capability exists, and it survives refactors because it doesn't care about internal structure.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Seams: where tests go

A **seam** is the public boundary you test at: the interface where you observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at pre-agreed seams.** Before writing any test, write down the seams under test and confirm them with the user. No test is written at an unconfirmed seam. You can't test everything, so agreeing the seams up front is how testing effort lands on the critical paths and complex logic instead of every edge case.

Ask: "What's the public interface, and which seams should we test?"

When the shape of that interface is itself in question (how deep the module is, where the seam belongs, what the interface should expose), read the actual authorized codebase-design SKILL.md through EOF for the vocabulary; this reference lookup does not run a design session. It is the shared source of the module, interface, depth, seam, adapter, leverage and locality terms, and it is a reference to consult, not a session to run.

## Anti-patterns

- **Implementation-coupled**: mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.
- **Tautological**: the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth: a known-good literal, a worked example, the spec.
- **Horizontal slicing**: writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation. Work in **vertical slices** instead: one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code to pass it. Don't anticipate future tests or add speculative features.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle.
- **Refactoring is not part of the loop.** It belongs to the review stage (see the `code-review` skill), not the red → green implementation cycle.


## Verification and review

Before and during every cycle apply tests.md and mocking.md through EOF: one confirmed seam,
one behavior test with independently known expected value, actual symptom red, only minimal code,
actual green. Record command/exit/output for red and green. No bulk imagined tests before code;
no future feature speculation inside the loop. Run typechecking and focused files regularly, then
the relevant full suite at the end. Preserve other user changes and tests.

After green cycles, review is the refactoring stage: use the existing code-review → code-hygiene
Mode D owner where callable and authorized, or the target's actual review contract. Refactor only
under approved scope and re-run relevant tests. No automatic Git commit/push, tracker/comment,
network, global-memory or installation effect. Return evidence/unknowns to the original caller.
Source13, MIT, copyright Matt Pocock, pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`.

## Partial or intentionally invalid TypeScript test data

When the actual request involves replacing test-fixture `as` assertions or large partial objects,
read [references/shoehorn-test-data.md](references/shoehorn-test-data.md) through EOF before editing.
Use `fromPartial` for valid partial data, `fromAny` for deliberately invalid input, and `fromExact`
when a full shape is required. This is test data only, never production casts. Preserve the original
assertion/error semantics and run the real typecheck and target tests; missing dependency/scope
means proposal or NEEDS_CONTEXT, not automatic installation or an unrun green.

<!-- FILE_END: tdd/SKILL.md -->
