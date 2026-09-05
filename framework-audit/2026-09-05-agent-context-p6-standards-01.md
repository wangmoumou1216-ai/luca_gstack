# P6 independent Standards review

Verdict: **FAIL — 1 Important hard-correctness finding; 0 confirmed judgment-call findings.** This verdict applies to the source snapshot below. It is not a final release or live-model acceptance verdict.

## Object and independence

- Repository: `/Users/luca/Desktop/项目/muse/lucagstack`; framework/meta, NO_PIN.
- Baseline: `94f086233affb3bd08ad8fe33063bcfedb330edf`.
- Review object: `framework-audit/2026-09-05-agent-context-p6-review-scope.json`, SHA256 `3ad729547ee62d83d1a1a4718f53446b37903b2f9c5d9c9e87e8048e0a4add83`.
- Exact scope: 131 paths, 126 files and 5 deletions. Existing file bytes matched the scope manifest; deleted paths were absent. The precise scoped `git diff HEAD -- <explicit paths>` and existing file copies are preserved at `/private/tmp/p6-standards-frozen/`.
- Only Standards was reviewed. No Spec report, prior review verdict, or implementation history was used. `CLAUDE.md` was treated as a changed source object, not loaded as this reviewer's runtime adapter.
- Repository instructions, conditional owners, code-review, code-hygiene Mode D, and routing-chain-check R4 were read. No project aliases, downstream project, other checkout, network, browser, paid CLI, staging, or repository mutation was used.

## S-01 — Important: regex replacement corrupts valid canonical facts

**File/line:** `scripts/build-agent-context.py:190` (the replacement argument to `re.subn` in `sync_projections`).

**Rule:** AGENTS K8 requires the root Static Fallback to be the exact projection of the canonical allowlisted promoted facts. Code correctness requires canonical text to survive publication literally, including valid backslashes. This is a hard correctness finding, not a maintainability preference.

**Evidence:** The implementation passes `block` directly as the regular-expression replacement string. Python interprets replacement escapes in this argument. Two independently constructed valid promoted-fact inputs were run through the unmodified full `python3 scripts/build-agent-context.py sync` CLI, using genuine minimal routing/visibility/skill/YAML/allowlist/root files in `/private/tmp/p6-standards-real-writer-i8emsq3t`:

1. Literal fact text `Use regex \d+ for integer IDs` exits 1 with `FAIL build-agent-context: bad escape \d at position 66 (line 2, column 36)`.
2. Literal fact text `Keep literal \n in shell examples` exits 0 and reports `WROTE generated context and both root Static Fallback projections`. Generated `static-fallback.md` preserves the literal backslash and `n`, but both root adapters contain an actual newline instead. Direct byte/text checks returned `ROOT_CONTAINS_LITERAL False` and `GENERATED_CONTAINS_LITERAL True`.

The retained fixture contains the second input and its mismatched output. The full CLI reproduction does not monkeypatch source functions. Current repository facts do not contain the triggering text, which explains why current-projection checks pass.

**Impact:** A legitimate governed memory fact containing a regular expression can block projection/promotion; a fact documenting an escape such as `\n` can silently publish different root instructions from the canonical generated projection while the writer reports success.

**Minimal repair:** Pass a replacement callable, for example `lambda _match: block`, so the block is installed literally. Add a regression exercising the actual writer with both an unsupported replacement escape (`\d`) and a recognized escape (`\n`), asserting literal bytes in both roots and the generated file. No repair was applied by this reviewer.

## Coverage and fresh deterministic evidence

Reviewed the changed authority/consumer relationships and core runtime failure paths: context generation/resolution/checking; root projections and manifest; catalog/visibility retirement; routing and cross-harness entry points; page-context and design-flow handoff; scoped quality gates; memory projection integrations; index-snapshot commit gate; A/B command parsing, content/EOF evidence, branch claim matching, source/scope bindings, process cleanup, failure recording, and counterexample mutations. Design skill/schema/reference diffs were inspected for consumers of removed constraints and for preservation of confirmed-project/platform authority. Historical records and large removed bodies were treated as data/source boundaries, not independent proof of behavior or authorization.

Fresh checks performed by this reviewer:

| Check | Result and meaning |
| --- | --- |
| Node 20.20.1 `scripts/test-design-flow-handoff.mjs --mutation` | PASS. Exact source/readback/authentication/entry-point cases and five actual production-guard mutations failed at their expected assertions, followed by restored passes. |
| `scripts/run-agent-context-ab.mjs ... --self-test` with local output under `/private/tmp` | PASS: 4 fixtures, 320 rejected counterexamples; explicitly `local-production-claim-contract-only`, `model_behaviour_verified: false`. Source inspection established the self-test uses a local stub, not a paid model CLI. |
| `node scripts/test-quality-gates-scope.mjs` | PASS. Default and explicit framework alias-read isolation, exact and pinned handoff behavior, stale/escape/symlink/malformed cases, and mutation rejection/restoration. |
| `node scripts/check-agent-context.mjs` | PASS: `phase=projected K=10 pointers=16 catalog=44 fallback=6`. |
| `python3 scripts/build-agent-context.py check` | PASS for the current repository facts. This does not cover S-01's valid alternate fact content. |
| Full writer fixture with `\d` and `\n` | FAIL as described in S-01, including silent root/generated divergence for `\n`. |

No other suspected issue was promoted without concrete evidence. In particular, the installed Node 20.20.1 exposes `node:zlib.crc32`, and the relevant tests pass on that runtime; that suspicion was refuted.

## Boundaries and pending closure

- Live Claude/Codex model behavior and release-budget acceptance belong to the parent's still-running acceptance work. Deterministic fixtures and source review do not substitute for those results.
- User-waived B1 page-library acceptance, including SVG mixed containment, remains an explicit concern outside this verdict; no browser or page-library acceptance was reopened.
- This report is bound to the pre-budget-tightening snapshot. Any writer fix, budget tightening, or other source delta requires an exact changed-path/hash closure before a final source PASS can be asserted.
- All source remained untouched by this reviewer. Publication is outside this subtask.
