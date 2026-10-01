# Authorized ADR format

Before offering an ADR, read `.claude/skill-os/extraction-bar.md` through EOF; that is the single
offer-gate owner. Read relevant existing system/context decisions first. Offer only when all three
conditions apply: meaningful reversal cost, surprising without background, and an actual trade-off.
Architecture shape, cross-context integration, lock-in, non-obvious ownership/scope, deliberate
deviations, invisible constraints or non-obvious rejected alternatives can qualify. Routine decisions
do not. An offer or model acceptance is not permission to persist.

Only after an explicit record request binds an authorized exact ADR artifact use this format:

```md
# {Short title of the decision}

{One to three sentences: context, accepted decision, and why it won the real trade-off.}
```

A paragraph is enough. Add Status (proposed/accepted/deprecated/superseded), Considered Options or
Consequences only when they convey useful non-obvious information. Keep proposed and accepted
states honest. Preserve existing owner location and numbering; read the actual directory's maximum
number before allocating a new number, never reuse or renumber existing IDs. A missing directory is
created lazily only when the exact first ADR path and effect are authorized. No default ADR layout,
root adapter rewrite or decisions.md/global-memory write is implied.

Source05 ADR-FORMAT, MIT, pinned commit as in SKILL.md; local extraction and exact-path authority
replace upstream default-directory creation.

<!-- FILE_END: domain-modeling/ADR-FORMAT.md -->
