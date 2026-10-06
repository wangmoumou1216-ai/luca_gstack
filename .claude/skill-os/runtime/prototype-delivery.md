# Prototype delivery — exact per-attempt identity

Read through EOF before candidate freezing/PREACCEPT/sealing or explicit `final_artifact_ref`
consumption. This owner: identity/integrity; project-session: authority; OD Phase 4–6: completion.
Manifests, flags, `authority_ref` and helper success grant no effects or judge authenticity.

## Caller scope and branches

Each call: actual `read_paths`, allowed `read_roots`, optional authorized exact `allowed_urls`.
All source/scope/base/recovery/spec/method/evidence files must pass. `base.asset_root` grants nothing.
Native verified messages: exact `source_refs`/`scope_refs`; CLI: files, no message attestation.

Production needs verified pin and authorized canonical `<project>/docs/prototype/YYYY-MM-DD-topic`.
Caller verifies effects before `effects{verified_active_project,canonical_project_root,
authorized_delivery_root,copy,edit,metadata,edit_paths}`. Asset-root-relative `edit_paths` includes
separately approved new files. Copy/edit/metadata/browser are separate. Stage/run/recover and
`original-ui-refinement-v1` authorize neither scripts nor derived edits.

NO_PIN allows authorized HTML inspection, never production enhanced/copy publication. Authorized
framework fixtures use owned isolated files and `effects.framework_fixture=true`, record boundary,
claim no production pin/native independent acceptance.

- `adequate-original`: sufficient original inside root, unchanged; accurate hash-bound original
  spec or fresh-attempt observation spec. Overwrite permission cannot preserve old certificate.
  Unavailable for notes.
- `adequate-copy`: byte-identical external original/all selected assets/name/relative imports.
  Review copy. Patch `operations=[]`, `content_changed=false`; HTML-only/changed URLs fail.
- `enhanced-copy`: authorized in-scope fixes, one before/after patch per changed/new file;
  retain all source expectations/KEEP.

Optional v1 `processor_id` accepts only `motion-polish`/`prototype-notes`; absent means legacy
motion. Return effective processor without rewriting old bytes. One namespace locates prepare,
candidate/methods/report/certificate. Content path:
`<processor_id>/<unique-attempt-id>/content/<base.entry_relative>`.
Metadata `prototype-spec.md`, `methods.json`, `patch.json`, `candidate-subject.json`, `qa-results.json`,
`prototype-qa-report.md`, `accepted-delivery.json` stays outside content; same-named source files
stay inside. Exclusive attempts refuse existing unknown attempts, symlinks, escapes and
source/output overlap, without cleanup/replacement.

Ordinary raw → notes: `bindBase` + `prepareCopy`, `processor_id:'prototype-notes'`, already authorized
sibling root. Production roots in verified canonical project: `P/docs/prototype/YYYY-MM-DD-topic`
and `P/docs/prototype/YYYY-MM-DD-topic-notes`; raw remains asset root. Neither real root contains
other; ordinary overlap guard remains. Selected external HTML: `base.origin='external-html'`,
exact authorized asset root, separate delivery root.

Only `deriveFromAccepted` permits same-root accepted motion → notes. Current context resolves exact
selected parent certificate/candidate/report/final/spec/raw-base/source/evidence. Derive base from
accepted entry/content closure (adequate-original: asset root), retain origin/recovery provenance,
bind parent spec. Exclusive child content is disjoint from actual parent content. Recheck source,
parent and copied closure after copy. Retain failed unaccepted attempt; retry fresh ID. No arbitrary
caller base, parent through prepareCopy, alternative parent, other-attempt deletion or grants.

Child `parent_accepted_ref{path,sha256}` is re-resolved at candidate check/PREACCEPT/seal/final.
Compare parent final/base/source/provenance, same root, disjoint content and every parent required
ID. Candidate/raw/fake-accepted/notes parents, unknown processors, escapes, symlinks and drift fail.
Read-only consumers need current reads only; derive needs copy/edit/metadata; freeze needs metadata
and actual edit paths; notes sealing rechecks metadata/edit. Candidate metadata grants none.

Scan actual HTML/CSS/JS imports/resources. Refuse missing resources, root-absolute paths,
unresolved dynamic imports/fetches, unapproved protocols/network and `<base>` remapping. Preserve
allowed remote URLs exactly; browser verifies mapping/CSP and out-of-scope requests. Static scans
cannot prove all JS; independent runtime acceptance remains required. No implied installation.

## Ordered identity chain

1. Bind source/base/closure/scope/methods/current context.
2. Observe actual input/DOM/time. Freeze original AC/STATE/required motion IDs before tests;
   never delete required IDs after failure.
3. Create branch; retain raw/spec/recovery provenance; freeze candidate bytes.
4. Independent QG receives exact candidate path+SHA. PREACCEPT needs no accepted artifact/OD DONE.
   Review all source requirements and actual final motion, beyond changed CSS. Repair makes fresh
   attempt/report; retain prior FAIL.
5. Verify real independent invocation/output under current model-routing, then seal unchanged
   candidate with independent PASS.
6. Handoff carries exact certificate path+SHA as `final_artifact_ref`. OD child returns existing
   outputs; parent completes once, no extra child handoff.

`candidate-subject.json → final/spec/source/base/scope/method/patch/required IDs`;
`qa-results.json → candidate path+SHA/final SHA/results/evidence`;
`accepted-delivery.json → candidate ref/report ref/same final+spec`;
`handoff/card → exact accepted path+SHA`.
Report cannot depend on later certificate; no certificate self-hash.
`PASS` proves no behavior/reviewer identity.

## Synchronous APIs

`scripts/prototype-delivery.mjs` returns plain objects/named integrity or scope errors, awaitable;
separate context each call. Preserve original six API results/errors.

| API | Input / effect / result |
|---|---|
| `bindBase(input,context)` | `source,base,scope,methods,authority_ref`; read-only validated clone; no grant/selection |
| `prepareCopy(bound,{delivery_root,attempt_id,kind},context)` | Copy/edit/metadata; exclusive `{attempt_id,attempt_dir,content_root,entry,kind}`; optional `processor_id`, effective processor |
| `deriveFromAccepted({accepted_ref,delivery_root,attempt_id,processor_id:'prototype-notes',scope,methods,authority_ref},context)` | Exact accepted motion; no base/extra inputs; exclusive `{bound,attempt,parent_accepted_ref}` |
| `checkCandidate(input,context)` | Schema input; `methods_ref`; no-replace methods/candidate freeze; resolved candidate + ref |
| `resolveCandidateSubject({path,sha256,delivery_root},context)` | Exact candidate; read-only final/spec/source/base/required IDs, PREACCEPT |
| `sealAccepted({candidate_ref,report_ref,delivery_root},context)` | Unchanged candidate + independent PASS; metadata; publish certificate once in same attempt; resolved final |
| `resolveFinal({path,sha256,delivery_root},context)` | Exact certificate; current final+spec/error; no root-only/latest |

No general plugin executor.

Complete types: `prototype-delivery.schema.json`. Candidate version1, `kind=preaccept-candidate`,
binds attempt/source/base/scope/methods/patch/authority/root/delivery and unique nonempty
`required_behavior_refs`. Base closure `{path,sha256,bytes}` is asset-root-relative; delivery entry/
closure is delivery-root-relative; metadata/source/method refs are exact absolute paths.
`base.origin=open-design` needs real recovery receipt; standalone uses exact original entry/closure,
no invented receipt, `raw_provenance=null` unless supplied. New patch `before_sha256=null`; patch
repeats only base/operations/changed, matching candidate/bytes. Read-only resolution rechecks all.

Report version1: `candidate_ref,final_sha256,status`,
`required_behavior_results[{id,status,expected,observed,evidence_refs[{path,sha256}]}]`,
`reviewer_provenance{reviewer_role,invocation_ref,output_ref,origin}`. Each frozen ID: once, PASS,
current hashed evidence. Honest `origin` distinguishes self-check/native independent review.
Helper validates links; caller authenticates independence/evidence suitability.

Notes requires `notes_manifest_ref{path,sha256}` in attempt metadata, outside content and distinct
from spec/reserved methods/patch/candidate/report/certificate. Strict `notes_manifest` binds:

- `schema_version:1`, exact candidate `scope`, `input_data_ref{path,sha256}`;
- `runtime`/`content_guideline`, each `{path,sha256,pin_or_version}`, checked with current reads;
- unique full `required_behavior_refs`, unique nonempty `notes_instance_refs` as `NOTES:<case-id>`;
- `behavior_mapping[{behavior_id,annotation_ids,source_refs}]`, each required ID once.

Manifest/candidate required sets are exact; notes-instance IDs equal full set's `NOTES:` IDs.
Derived child includes every parent required ID. Candidate/report/final consumption rechecks
dependencies. Notes report names `processor_id:'prototype-notes'`; certificate repeats processor/
manifest/parent bindings. Non-notes candidates refuse notes-only manifest/parent fields. Absent
legacy processor means motion without notes manifest. Explicit code checks enforce conditions;
unsupported JSON-schema if/then/allOf is not a gate.

Required: source D/STATE/AC/KEEP ∪ parent ∪ actual notes-instance IDs. Caller list cannot reveal
original business/source denominator to helper. Cold QG compares full source/parent requirements,
scope/mapping/runtime/content versions, new final observation spec, actual behavior/content. Notes
spec describes final; raw/parent specs remain unchanged provenance. Hashes/manifest/synthetic
integrity prove neither semantic completeness nor native independent acceptance.

Resolved candidate fields: `candidate_ref,delivery_root,final_entry,final_sha256,spec_path,
spec_sha256,source_ref,base,raw_provenance,required_behavior_refs,delivery,candidate`.
Final adds `accepted_ref,acceptance_ref,integrity='PASS',reviewer_authenticity='CALLER_RESPONSIBILITY'`.
Both return effective `processor_id`, plus `parent_accepted_ref`/`notes_manifest_ref` or null. OD/TS CMP/TP source/cards/compile consume these fields. Selected notes final cannot fall back to old motion/raw.
User-edited notes: ordinary non-overlapping external-HTML path, new acceptance; no notes → notes.

## Read-only CLI

```text
node scripts/prototype-delivery.mjs <command> <ref flags> --delivery-root <verified root> [--read-path <exact file>] [--read-root <permitted root>]
```

Commands/ref flags: `candidate-check --subject <absolute candidate> --sha256 <candidate SHA>`;
`validate --accepted <absolute certificate> --sha256 <handoff SHA>`;
`resolve --accepted <absolute certificate> --sha256 <handoff SHA>`.
Repeat read flags; root is caller's in-root read boundary, outside files need current flags.
Runtime permission applies; flags grant nothing. Success: complete integrity, bound JSON, exit0;
failure: specific error/nonzero. No files/`--grant`/lock recovery/latest. Exact remote/messages
require verified API context, never CLI inference.

## Publication, drift and consumers

Publish: owned sibling temp → fsync → atomic no-replace hard link → directory fsync → owned temp
unlink. Unsupported no-replace/different bytes fail; no overwrite. Revalidate identical-byte reuse;
separate attempts retain both outputs; partial temps never accepted. Crash before publication: no
accepted certificate; after: revalidate exact ref, finish only missing authorized handoff.
Never clean unknown attempts/stale files or blindly reinstall handlers.

Source/base/scope/method/patch/final/spec/candidate/report/evidence drift invalidates dependencies.
Affected owner needs fresh attempt/review or relevant TS/TP re-gate. Required invalid/missing
motion/notes ref: no raw fallback. Unselected old tasks retain contract. Unresolved product/design
alternatives: existing Human Gate; never select by time/order/name similarity.

Legacy tests use exact frozen helper/schema `scripts/fixtures/prototype-delivery-v1/` in isolated
legacy-runtime. Old producer creates all three kinds; new API/CLI resolves same absolute
certificate path+SHA, no re-signing/inventory change. Drift fails; no production QG ticket.

<!-- FILE_END: skill-os/runtime/prototype-delivery.md -->
