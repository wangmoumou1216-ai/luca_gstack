# Framework Template Migration — Handshake Plan

**Status:** `NEEDS_CONTEXT` — the user has locked a new P0 OD behavior: a selected template is copied into the OD package as `base-template.html`, and OD must emit a new derived `index.html` rather than mutate the framework source. The previous three red-team rounds cover structural retirement; a focused review of this carrier-to-OD amendment is required before it can be handshake-ready. No template mutation is authorized until the replacement package, exact manifest, and explicit approval exist.

**Scope:** Physically retire the approved obsolete template inventory from `framework/` and install its approved replacements there only after the replacement package and an exact old→new migration manifest are approved. No legacy selectable template may remain as an active selection/copy source after the migration; each must have a validated successor or an explicit approved retirement/adaptation record. For an adopted template, the design flow copies exact template bytes and local assets into an OD package, with OD producing a new derived `index.html`; OD never mutates `framework/` sources. `.claude/skill-os/page-library/sources/` may be used only as a temporary compatibility-validation staging area, never as the final destination for this full replacement. This is framework/meta work: it remains `NO_PIN`, touches no downstream-project aliases, and does not stage, commit, or push Git changes.

## What is known now

- `framework/` contains five selectable desktop reference pages: `list-page.html`, `detail-page-2col.html`, `detail-page-3col.html`, `form-page.html`, and `home-page.html`; `shared-head.html` is retained as a historical asset and `tokens.css` is deprecated.
- A template is an **optional reference/carrier**, never a mandatory design system. `html-prototype` and `figma-demo` may use one only after the user explicitly selects it; otherwise they may use `template: none` / an independent page.
- The page library is a live contract: five stable `page_id`s, 27 regions, source hashes, viewports, and unique structural anchors point at the current HTML. Replacing a source deliberately invalidates earlier page selections until they are reconfirmed.
- The current OD transport exports `brief.md`, `page-reference.json`, and an optional `reference.png`; it deliberately does **not** transport raw HTML/CSS/assets. The user-selected carrier behavior therefore requires a new, explicit transport and readback contract—not a silent interpretation of the existing screenshot path.
- Normal writes to `framework/` are blocked. The existing maintenance escape (`.claude/.allow-framework-write` or `ALLOW_FRAMEWORK_WRITE=1`) is broad while active, so it is not an exact-file technical allowlist.
- Current baseline checks pass for the page library and framework-HTML baseline fixtures. The live `html-validate` executable is not installed locally, so live HTML validation is currently unavailable; its required version is `11.10.0`.

## Current logic to preserve

| Layer | What it governs | Migration consequence |
|---|---|---|
| Root / framework-maintenance | `framework/` is normally read-only; framework work is `NO_PIN`; external/current design systems override old local visual values. | Do not silently restore the old CRM/token system as a global default. Use a narrowly approved maintenance window only after the exact manifest exists. |
| `framework/README.md` | Current file catalog, optional template-selection guide, local assets, and legacy module vocabulary. | Rewrite the catalog and structural guidance to match the new assets; remove only rules made obsolete by the approved mapping. |
| `design-brief` → page-context → design-flow-handoff → `open-design` | Design facts are aligned first; page-context semantically selects and confirms a template/module reference; the handoff stages an OD package and verifies its exact readback. | **P0:** add a template-aware carrier contract: selected `base-template.html` + local assets + module-level adaptation instructions enter OD; OD returns a new derived `index.html`. The design brief remains the source of requirements/decisions/states, not the template. |
| Page library / page-context | Stable page and region identity, hash-bound source, structural anchor validation, isolated preview, and real-user adoption. | Preserve semantically equivalent IDs; otherwise retire old IDs, add new IDs, update hashes/anchors/viewports, require reconfirmation, and expose stable module anchors/allowed preserve-or-change boundaries for the OD carrier contract. |
| `html-prototype` / `figma-demo` | A user-selected template can be copied into an output and has declared replace/preserve regions; independent generation is valid. | **P2:** update selectable template names, structural assumptions, and copy rules only after the P0 OD chain is correct. Do not make new templates compulsory. |
| Guard / verifier / CI | Default write protection, expected HTML file set, HTML debt baseline, and template presence checks. | Keep protection enabled after the migration; intentionally update only the checks whose approved file set or validator findings change. |

## Premise gate

1. **Should this be solved?** Yes. The current template package still feeds optional prototype carriers and page-reference preview, while you report it is no longer usable.
2. **Smaller alternative?** Merely stop selecting the old templates would avoid deletion, but would leave stale page-library references and unusable optional carriers. It does not meet the requested framework refresh.
3. **Default-output bias:** “Delete and replace everything” biases the work toward a cleaner-looking repository. The independent reviewer will treat deletion as `REFUTED` unless each old asset has a named successor or an approved retirement record.

### Kill assumptions

- **KILL-1:** The supplied package cannot be statically inspected, has unknown provenance/licensing, or depends on unapproved remote/dynamic resources. If true, it is not admitted into the reference library.
- **KILL-2:** A proposed successor does not represent the same page/region semantics and no approved retirement/new-ID mapping exists. If true, do not delete its predecessor.
- **KILL-3:** The new templates require a visual/design-system authority that conflicts with the current rule that templates are structural references only. If true, stop for an explicit design-system decision.
- **KILL-4:** A real `html-validate@11.10.0` gate or an explicitly approved equivalent cannot be provisioned. If true, do not claim framework HTML validation passed.
- **KILL-5:** OD cannot stage and read back exact base-template bytes, required local assets, the module-adaptation contract, and a derived `index.html` without mutating `framework/`. If true, block the carrier behavior rather than fall back silently to screenshot-only reference.

## Locked P0 design-flow decision — template-aware OD carrier

The selected template is an immutable carrier copy, never an OD write target in `framework/`:

```text
aligned requirement / Design Generation Packet
→ semantic template + module match (page-context)
→ real user adoption of the page/region
→ Template Adaptation Contract
→ OD package: brief.md + base-template.html + assets/ + template-adaptation.json
   + page-reference.json + optional reference.png
→ OD derives index.html
→ exact readback / recovery: index.html + assets/ + implementation manifest
```

`template-adaptation.json` must bind each requested change to a stable module ID/anchor, with `add | modify | remove | preserve`, requirement/decision/state/AC references, assets, and explicit keep boundaries. `brief.md` stays the complete design source. The page reference remains structure-and-location evidence; it does not let the template override the design system configured in OD. If no template is high-confidence or the user chooses no reference, `reference=none` remains a valid non-carrier OD path.

## Required input and human decisions

Before an executable plan can be compiled, provide the replacement package and answer these decisions in the same message:

1. **Carrier cutover:** the final destination is replacement files under `framework/`. For every approved old→new mapping, name the semantic template match, stable module anchors, allowed additions/modifications/removals/preserved regions, required local assets, and the exact OD carrier package mapping: immutable `base-template.html` → derived `index.html`. Name affected `html-prototype` / `figma-demo` adapters as P2 compatibility work. The transition artifact must be removed or retired before final `DONE`; no old `framework/` template may remain selectable or copyable.
2. **Visual authority:** the template's DOM/assets are a controlled carrier; the design system remains the user-configured OD authority unless you explicitly make a template visual system binding in a separate contract.
3. **Identity map:** for each current logical page — `list`, `detail-2col`, `detail-3col`, `form`, `home` — say `preserve`, `replace with <new file>`, or `retire`; include new page types, if any.
4. **Historical outputs:** are existing copied prototypes/examples forward-only, or should any named generated outputs be migrated too? Nothing will be backported by default.

The package must include, for every proposed template: source path/file, intended role and viewport, required asset tree, provenance/license, whether remote resources or runtime compilation are required, a stable module/anchor inventory, preserve/change boundaries, and a reference screenshot/Figma/source when visual fidelity matters.

## Execution shape after input is supplied

**Complexity:** `Hierarchical` / `Deep` — protected files, deletion, multiple consumer contracts, runtime validation, dual-harness evidence, and independent review.

**Approval:** a second, exact-file approval is mandatory. This document does not authorize a guard bypass, deletion, or framework write.

### Phase 0 — Intake and compatibility audit

**Mode:** Sequential; `reasoning-heavy` for the judgment steps, `core-execution` for deterministic inventory.

1. Read the supplied package without copying it into the repository.
2. Produce a migration manifest containing exact paths, SHA-256 values, provenance, asset dependencies, remote-resource policy, old→new file mapping, page/region/anchor/viewport/state mapping, stable module contracts, OD carrier package mapping (`base-template.html` → `index.html`), carrier-scope/adapters, and the exact retained/deleted set.
3. Check that each candidate supports the isolated static preview contract. React/Next pages, remote fonts/images, dynamic/duplicate anchors, or unsupported compilers must be converted to an approved static export or excluded from the page library.
4. If a transition-only `.claude/skill-os/page-library/sources/` staging area is used, design and freeze a deterministic HTML/asset validator, baseline, and CI invocation that enumerate every staged source. It must enforce the approved static-source policy and use `html-validate@11.10.0` (or an explicitly user-approved equivalent); the existing framework-only checker is not evidence for these staging sources.
5. Record the current framework hash manifest and the relevant worktree status; preserve all unrelated dirty files.

**Gate:** you approve the manifest, physical retirement map, carrier cutover, and—when transition sources are used—the source-validator/baseline/CI design. No wildcard deletion and no placeholder file path is allowed.

### Phase 1 — Compile the exact mutation plan

**Mode:** Sequential with an independent checklist review; `reasoning-heavy`.

1. Bind each U-block to the approved manifest's exact files and source hashes.
2. Decide whether the existing broad maintenance escape is acceptable as a short, procedural window, or whether an exact-file allowlist must first be added to the guard and covered by its tests.
3. Bind every changed consumer surface in P0 order: `design-brief` integration boundary, page-context/catalog/preview, `scripts/design-flow-handoff.mjs`, `open-design` staging/recovery/readback, template files/assets, `framework/README.md`, HTML baseline, `scripts/verify.sh`, and CI; then bind `html-prototype`, `figma-demo`, schemas, and guard tests whenever their selection, copy, asset, path, or anchor assumption changes. Every old selectable/copy source must be removed or routed to its named successor; no page-library-only exception exists for a full replacement.
4. Freeze a per-changed-consumer, per-harness evidence matrix before approval: Claude discovery/invocation, Codex discovery/invocation, required primitive, unavailable-primitive degradation/refusal, and one named behavioral probe with assertion/evidence path. A changed consumer cannot be approved without all five fields.
5. Freeze assertions, visual acceptance evidence, and a no-commit/no-push boundary.

**Gate:** you explicitly approve the exact file set, deletion list, and the short maintenance mechanism. A generic “update the framework” approval is insufficient.

### Phase 2 — Protected migration

**Mode:** Sequential; `core-execution` with checklist verification after each bounded batch.

1. Open only the approved maintenance window, make only manifest-listed changes, and close the window immediately after the batch.
2. Add validated replacements and required local assets before removing predecessors; never use a delete-then-copy sequence.
3. Update structural contracts together: catalog paths/hashes/regions/anchors/module boundaries, README selection guidance, the P0 template-aware OD package/stage/readback/recovery contract, baseline/CI/verify expectations, and only then P2 optional-carrier rules.
4. Retire page IDs rather than reusing them where semantics changed. Old user selections become stale by design and must be reconfirmed rather than silently remapped.
5. Verify the scope by exact manifest/hash/diff comparison before any further work.

**Gate:** all approved files are present, all unapproved files are unchanged, and the maintenance escape is removed.

### Phase 3 — Runtime and regression validation

**Mode:** Supervisor; execution and an independent verifier are separate.

Required blocking checks, adapted to the approved manifest:

```bash
# [BLOCKING] CTX-01 — page sources, hashes, anchors, and containment are valid
node scripts/page-context.mjs validate --catalog .claude/skill-os/page-library/catalog.json

# [BLOCKING] CTX-02 — page-context mutation guards still reject stale/invalid references
node scripts/test-page-context.mjs --mutation
node scripts/test-page-context-preview.mjs --mutation

# [BLOCKING] HTML-01 — final framework carrier files: live HTML validator matches the intentional baseline
npm run check:framework-html --silent

# [BLOCKING] HTML-02 — final framework carrier baseline contract remains strict
npm run test:framework-html-baseline --silent

# [BLOCKING] GUARD-01 — normal framework protection still denies writes after the maintenance window
npm run test:project-scope --silent

# [BLOCKING] FLOW-01 — page-reference handoff rejects stale evidence correctly
npm run test:design-flow-handoff --silent

# [BLOCKING] REPO-01 — repository-level framework checks pass
bash scripts/verify.sh
```

Additional required evidence:

- Render each registered replacement in isolated preview at its declared viewport; inspect local-asset reachability and every catalog region's visible anchor.
- Add and run a Phase-1-frozen blocking carrier-flow test that proves: exact base-template and asset bytes reach the bound OD project; module instructions bind only registered anchors; OD returns a distinct derived `index.html`; framework bytes remain unchanged; stale source hashes, unconfirmed references, missing assets, or a screenshot-only fallback are rejected. Its exact command and CI job must be named in the delta plan before approval.
- If transition-only `.claude/skill-os/page-library/sources/` staging is used, run the Phase-1-frozen source validator, source baseline, and CI job for every staged source. Absence of that validator/baseline/CI job is a blocking failure; the framework-only commands above do not substitute for it. Final verification must also prove that staged artifacts are retired and no legacy `framework/` source remains selectable/copyable.
- Execute the frozen five-part matrix for every changed consumer: separate Claude and Codex discovery/invocation; required primitive; unavailable-primitive degradation/refusal; and the named behavioral probe with its assertion. A shared Markdown promise is not parity evidence.
- If CI or the guard changes, run their focused contract tests before the repository verification.

### Phase 4 — Independent closure

**Mode:** independent default-`REFUTE` review, then final re-review if anything changes; `reasoning-heavy`.

1. Give the reviewer the frozen file set, manifest, assertions, runtime evidence, and final diff — not the implementation narrative.
2. Review deletion correctness, stale-reference behavior, guard restoration, P0 template-aware OD carrier integrity (base bytes/assets/module contract/derived output), consumer compatibility, rendered output, and both-harness evidence.
3. Run exactly three recorded default-`REFUTE` rounds for this handshake plan: (R1) premise/contract attack, (R2) plan-surface attack, and (R3) post-revision closure attack. Any repair returns to the same focused checks and then to the next remaining round; unresolved blockers return to you for a decision.

**Completion status:** `DONE` only after every blocking gate and both-harness proof pass. A missing validator, source-specific validation surface, or second-harness proof is `BLOCKED`; it is never downgraded to `DONE_WITH_CONCERNS` or silently treated as success.

## Independent review record

The following read-only collaboration reviews are recorded in this plan; they are conversation audit records, not immutable repository artifacts or implementation approval.

| Reviewer / role | Exact target | Verdict / retained finding |
|---|---|---|
| `/root/template_contract_audit` — contract audit | Current template consumers, page-library contract, guard, verifier, and CI surfaces | Confirmed live optional consumers, hash-bound page-library references, isolated preview constraints, broad-but-temporary guard escape, and the required migration/validation surfaces. |
| `/root/template_migration_redteam` — R1 default-`REFUTE` premise review | User objective against current repository contracts | `REFUTED` executable migration today: no replacement payload or exact mapping exists. It admitted only a conditional intake plan and identified the unavailable live `html-validate` gate. |
| `/root/template_migration_redteam` — R2 plan-surface adversarial review | This handshake plan before its corrective revision | `REFUTED` pending the five corrections now incorporated: source-branch validation, carrier-scope Human Gate, blocking-status semantics, five-part cross-harness matrix, and auditable review claims. |
| `/root/template_migration_redteam` — R3 post-revision closure attack and delta confirmation | Corrected handshake plan, including the physical-retirement correction | Initial attack `REFUTED` a page-library-only end state; the targeted same-round delta confirmation **PASSed** after the plan required physical replacement in `framework/`, named successor adapters, and forbade every legacy selectable/copy source. |
| `/root/template_migration_redteam` — carrier-to-OD scope delta review | This amendment's `base-template.html` → OD-derived `index.html` carrier contract | **Pending.** The three prior rounds remain evidence for structural retirement, but do not certify this new OD transport behavior. |

The three completed red-team rounds support structural retirement. This amended plan needs the focused carrier-to-OD delta review before it regains a **conditional handshake** status; it never authorizes implementation by itself.

## Final handshake

When you provide the package and four decisions above, I will produce one delta plan that names every file and hash, show it for your explicit approval, then execute exactly that plan. Until then: no old template will be deleted, no new template will be copied into `framework/`, and no Git publication will occur.
