# Provenance — diagnosing-bugs

## Current method source

Repository: `mattpocock/skills`; MIT, copyright Matt Pocock.
Pinned commit: `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`.
Source: `skills/engineering/diagnosing-bugs` complete directory, recorded by the adaptation source
index (source04) and repository SOURCE-MAP. Frozen input hashes:

| Source | SHA-256 |
|---|---|
| SKILL.md | 9168404abda0967a5d32977e3498cd95fda6807018852f3de736a78357c82b40 |
| agents/openai.yaml | 3e430dbe4334a87597488c060cb3dc3786bb00c9182877d6f5ec41f62490e90b |
| scripts/hitl-loop.template.sh | 35103539fc36873eea36074769ad454f9379d6fc8b2dc0e26ce987fd3bfe5503 |

Full method retained: actual fast/deterministic symptom-specific red loop, ten reproduction avenues,
minimisation with a rerun after every cut, 3–5 ranked falsifiable hypotheses, one-variable probes,
tagged instrumentation, measurement-first performance diagnosis, correct-seam red-before-fix green
regression, original-loop recheck and cleanup. No current upstream references directory is invented.

## Legacy supplements retained and adapted

The existing root-cause-tracing, defense-in-depth, condition-based-waiting and TypeScript example
derive from the personal `systematic-debugging` material frozen in
`framework-audit/2026-08-30-mattpocock-six-skills-integration/SOURCE-MANIFEST.tsv`.
They remain attributed legacy supplements, not claimed to be source04 files at the new pin.
The example is now a self-contained illustrative interface rather than imports from an unavailable
Lace project. Historical outcome numbers were removed as they are not fresh Luca verification.

## Local safety adaptation

Expected TDD red is excluded. Diagnose-only remains read-only/no-network and ends before repair.
Potentially writing loops require approved scratch/effects; temporary instrumentation is tagged and
redacted. Source tracing precedes proportionate boundary defenses, not catch-and-mask patches.
Internal dispatch returns to original U-ID with permission intersection. Git publication, personal
installation and automatic memory writes are not part of the method.

The repository LICENSE and all existing safe-diagnostic/snapshot/HITL/polluter scripts are preserved
byte-for-byte by this content unit; their mentions do not expand execution authority.

<!-- FILE_END: diagnosing-bugs/PROVENANCE.md -->
