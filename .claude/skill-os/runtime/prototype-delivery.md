# Prototype delivery — exact per-attempt identity

Read through EOF before freezing a motion candidate, PREACCEPT review, sealing acceptance or
consuming an explicit `final_artifact_ref`. This owner defines identity and integrity. Project
authority remains in project-session; OD completion remains in open-design Phase 4–6. A manifest,
CLI read-context flag, `authority_ref` or helper success grants no effects and authenticates no judge.

## Caller scope and branches

Caller supplies current actual `read_paths` (exact files), `read_roots` (actually permitted roots),
and optional `allowed_urls` for already authorized exact remote dependencies. `base.asset_root`
describes topology; it never expands reads. Every local source/scope/base/recovery/spec/method and
evidence file must pass that current context. Native verified message sources may instead be passed
as exact `source_refs`/`scope_refs` in context; the CLI supports file sources, not message attestation.

Production enhancement requires a verified active project and an explicitly authorized canonical
`<project>/docs/prototype/YYYY-MM-DD-topic` root. The caller verifies the real pin and effects before
passing `effects{verified_active_project,canonical_project_root,authorized_delivery_root,copy,
edit,metadata,edit_paths}`. These parameters encode the caller's decision; they are not helper-issued
grants. `edit_paths` names approved paths relative to base asset root, including separately approved
new files. Copy, edit, metadata and browser execution are separate actual effects. Stage/run/recover
receipts and `original-ui-refinement-v1` do not authorize local scripts or derived edits.

NO_PIN inspection can honestly report findings from exact authorized HTML; it cannot publish a
production enhanced/copy delivery. An explicitly authorized framework test uses caller-owned
isolated files and `effects.framework_fixture=true`, records that boundary, and does not claim a
production project pin. Helper tests and local driver checks are not native independent acceptance.

- `adequate-original`: final is the exact sufficient original inside delivery root; original bytes
  stay unchanged. Reuse a hash-bound accurate original spec, or write an observation spec in a fresh
  attempt. Later overwrite permission does not keep an old certificate valid.
- `adequate-copy`: sufficient external original is copied byte for byte, including complete selected
  assets, original entry filename and relative imports. Actual delivery copy is reviewed. Patch has
  `operations=[]`, `content_changed=false`; copying only HTML or changing URLs fails this branch.
- `enhanced-copy`: an authorized copy resolves actual in-scope gaps. Each changed/new file has one
  patch operation binding before/after bytes. All source expectations and explicit KEEP survive.

All copies use `motion-polish/<unique-attempt-id>/content/<base.entry_relative>` under the root.
Metadata (`prototype-spec.md`, `methods.json`, `patch.json`, `candidate-subject.json`, `qa-results.json`,
`prototype-qa-report.md`, `accepted-delivery.json`) stays outside content. A source file with one of
these names is preserved under content. New attempt creation is exclusive; existing unknown attempts,
symlinks, source/output overlap and escaping paths fail without cleanup or replacement.

Static closure checks examine actual selected HTML/CSS/JS imports and resource paths, not the
caller saying “closed”. Missing resources, root-absolute paths, unresolved dynamic imports/fetches,
unapproved protocols/network dependencies and `<base>` URL remapping fail. Preserve allowed existing
remote URLs exactly; browser evidence must also show the approved URL mapping/CSP works and catches
runtime requests outside scope. Static scanning cannot prove every possible JS execution; independent
runtime acceptance retains that responsibility. No library installation is implied.

## Ordered identity chain

1. Bind exact source/base/closure/scope/methods and current read context.
2. Observe actual input/DOM/time behavior, freeze all original AC/STATE and required motion behavior
   IDs before testing. Required IDs cannot be removed after a failure.
3. Create the selected branch, preserve raw/spec/recovery provenance, and freeze candidate bytes.
4. Caller sends exact candidate path+SHA to a genuinely independent QG. PREACCEPT needs no existing
   accepted artifact or OD DONE handoff. QG checks all original source requirements and actual final
   motion, not only changed CSS. Candidate repair creates a new attempt/report; prior FAIL remains.
5. Caller verifies real independent invocation/output under current model-routing. Only then seal an
   unchanged candidate with its independently produced PASS report.
6. Transport exact certificate path+SHA in ordinary handoff `final_artifact_ref`; internal OD child
   returns it in existing outputs and parent finishes its own handoff once. No extra child handoff.

`candidate-subject.json → final/spec/source/base/scope/method/patch/required IDs`;
`qa-results.json → candidate path+SHA/final SHA/results/evidence`;
`accepted-delivery.json → candidate ref/report ref/same final+spec`;
`handoff/card → exact accepted path+SHA`. Report never depends on the later certificate and certificate
has no self-hash. JSON field `PASS` cannot establish behavioral truth or routed reviewer identity.

## Six synchronous APIs

Import from `scripts/prototype-delivery.mjs`. API calls may be awaited; they return plain objects or
throw a named integrity/scope error. Context is supplied separately on every invocation.

| API | Exact input | Result / effect |
|---|---|---|
| `bindBase(input,context)` | `source,base,scope,methods,authority_ref` | Validated read-only clone; no grant or global selection |
| `prepareCopy(bound,{delivery_root,attempt_id,kind},context)` | Bound snapshot and actual copy/edit/metadata effects | Exclusive attempt; `{attempt_id,attempt_dir,content_root,entry,kind}` |
| `checkCandidate(input,context)` | Complete candidate fields below; `methods_ref` generated | Freezes methods/candidate with no-replace; returns resolved candidate plus `candidate_ref` |
| `resolveCandidateSubject({path,sha256,delivery_root},context)` | Exact current candidate ref | Read-only final/spec/source/base/required IDs for PREACCEPT |
| `sealAccepted({candidate_ref,report_ref,delivery_root},context)` | Unchanged candidate and exact independent PASS report; metadata effect | Publishes same-attempt certificate once and returns resolved final |
| `resolveFinal({path,sha256,delivery_root},context)` | Exact certificate ref selected by handoff/card | Read-only current final+spec or error; no root-only/latest lookup |

Candidate fields and types are defined in `prototype-delivery.schema.json`: version 1,
`kind=preaccept-candidate`, `attempt_id`, `source{locator,version,sha256}`, `base{entry,sha256,
asset_root,entry_relative,closure[{path,sha256,bytes}],origin?,recovery_ref?{path,sha256},spec?}`, `scope{
reference,sha256,preserved_expectations}`, `methods[{path,pin_or_version,sha256}]`, `methods_ref`,
`patch{path,sha256,base_sha256,operations[{path,before_sha256,after_sha256}],content_changed}`,
`authority_ref`, `delivery_root`, `delivery{id,kind,entry,sha256,closure,spec{path,sha256}}`, and unique
nonempty `required_behavior_refs` strings. Base closure paths are relative to asset root; delivery
entry/closure paths are relative to delivery root; metadata/source/method refs use exact absolute paths.
`base.origin=open-design` requires the actual recovery receipt. Standalone base provenance is its
exact original entry/closure; it needs no fabricated OD receipt and returns `raw_provenance=null`
when no additional provenance ref was actually supplied. New patch files have `before_sha256=null`.
Patch file content repeats only base/operations/changed
fields and must match both the candidate and actual changed bytes. Read-only resolution rechecks all.

Report has version 1, `candidate_ref`, `final_sha256`, `required_behavior_results[{id,status,expected,
observed,evidence_refs[{path,sha256}]}]`, `reviewer_provenance{reviewer_role,invocation_ref,output_ref,
origin}`, and `status`. Every frozen required ID occurs exactly once and is PASS, with current hashed
evidence. `origin` honestly distinguishes local self-checks from genuine independent native reviews;
the helper validates links, while caller authenticates independence and suitability of evidence.

Resolved candidate returns `candidate_ref,delivery_root,final_entry,final_sha256,spec_path,spec_sha256,
source_ref,base,raw_provenance,required_behavior_refs,delivery,candidate`. Resolved final adds
`accepted_ref,acceptance_ref,integrity='PASS',reviewer_authenticity='CALLER_RESPONSIBILITY'`. Consumers
use these exact fields for OD output, TS CMP evidence, TP source/cards and compile revalidation.

## Read-only CLI

```text
node scripts/prototype-delivery.mjs candidate-check --subject <absolute candidate> --sha256 <candidate SHA> --delivery-root <verified root> [--read-path <exact file>] [--read-root <permitted root>]
node scripts/prototype-delivery.mjs validate --accepted <absolute certificate> --sha256 <handoff SHA> --delivery-root <verified root> [--read-path <exact file>] [--read-root <permitted root>]
node scripts/prototype-delivery.mjs resolve --accepted <absolute certificate> --sha256 <handoff SHA> --delivery-root <verified root> [--read-path <exact file>] [--read-root <permitted root>]
```

Read flags repeat. Delivery root is itself the caller-provided in-root read boundary; outside files
need explicit current read flags. No flag grants reads; actual runtime permission still applies.
Commands output the bound JSON above, exit 0 only on complete integrity success, and exit nonzero
with a specific error otherwise. They create no files. No `--grant`, lock recovery or latest command.
Exact remote/message context must use APIs with caller-verified context rather than CLI inference.

## Publication, drift and consumers

Candidate and certificate use an owned sibling temp, fsync, atomic no-replace hard link, directory
fsync, then owned temp unlink. Unsupported no-replace fails; no overwrite fallback. Existing identical
bytes may be reused after revalidation; different bytes fail. Separate attempts preserve both outputs.
Partial temps are never accepted records. A crash before publication leaves no accepted certificate;
after publication caller revalidates the exact ref and completes only missing authorized handoff.
Do not clean unknown attempts/stale files or blindly reinstall handlers.

Source/base/scope/method/patch/final/spec/candidate/report/evidence drift invalidates dependencies.
Consumers return the affected owner for a new attempt/review or relevant TS/TP re-gate. Missing or
invalid ref on a task requiring motion cannot fall back to raw. Old unselected tasks retain their
existing contract. Multiple unresolved product/design alternatives return the existing Human Gate;
timestamps, directory order and filename similarity never select a final.

<!-- FILE_END: skill-os/runtime/prototype-delivery.md -->
