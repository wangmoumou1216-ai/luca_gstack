# Recoverable upstream snapshot

This directory stores the minimal upstream bytes referenced by `SOURCE-MANIFEST.tsv`.

The manifest preserves the original capture path under `/private/tmp` as provenance, while
`scripts/validate-skill-integration-receipt.mjs` verifies these committed copies. The snapshot
directory is named with the exact upstream commit and every included file is still checked against
the frozen SHA-256 tuple in the manifest.

Do not edit the snapshot in place. A source update requires a new commit-named snapshot and an
explicit receipt migration.
