// Open Design caller for the single prototype-notes processor.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as notes from './prototype-notes.mjs';
import * as delivery from './prototype-delivery.mjs';
const odHash = bytes => createHash('sha256').update(bytes).digest('hex');
const odRequire = (condition, code) => { if (!condition) throw new Error(code); };
const odRef = file => ({ path: file, sha256: odHash(fs.readFileSync(file)) });
const odResult = result => { if (!result.ok) throw new Error(result.code + ': ' + result.message); return result.value; };
function odRead(ref, host) {
  odRequire(ref && typeof ref.path === 'string' && path.isAbsolute(ref.path) && !ref.path.split(path.sep).some(v => v === '.' || v === '..'), 'OD_REF_REQUIRED');
  const file = path.normalize(ref.path), context = host.current_context;
  odRequire(context && ((context.read_paths || []).includes(file) || (context.read_roots || []).some(root => file === root || file.startsWith(root + path.sep))), 'READ_SCOPE_REFUSED');
  let cursor = path.parse(file).root;
  for (const part of file.slice(cursor.length).split(path.sep).filter(Boolean)) { cursor = path.join(cursor, part); odRequire(!fs.lstatSync(cursor).isSymbolicLink(), 'SYMLINK_REFUSED'); }
  const bytes = fs.readFileSync(file); odRequire(odHash(bytes) === ref.sha256, 'HASH_DRIFT'); return bytes;
}
function odEnabled(host) { return host.notes_enabled !== false && host.delivery_intent === 'interactive-html' && host.recovery_only !== true; }
function odPhase(host) {
  odRequire(host.phase?.owner === 'open-design' && host.phase.completion === 'IN_PROGRESS', 'OD_PHASE_NOT_ACTIVE');
  odRequire(host.phase.status !== 'STAGED', 'OD_STAGED');
  odRead(host.phase.source_ref, host);
  odRequire(host.phase.recovery_status === 'RECOVERED', 'OD_RECOVERY_REQUIRED');
  odRead(host.raw_recovery_ref, host);
  odRequire(Array.isArray(host.source_required) && host.source_required.length > 0 && host.source_required.every(id => typeof id === 'string' && id.length > 0), 'OD_SOURCE_REQUIRED');
}
function odConfirmation(host, bound, source, existing) {
  const files = bound.base.closure.map(item => ({ path: item.path, sha256: item.path === bound.base.entry_relative ? odHash(source) : item.sha256 })).sort((a,b) => a.path.localeCompare(b.path));
  const business = odHash(JSON.stringify(files)), confirmation = host.user_confirmation;
  odRequire(confirmation && confirmation.source_ref && typeof confirmation.confirmed_prototype_revision === 'string' && typeof confirmation.input_artifact_sha256 === 'string', 'OD_CONFIRMATION_REQUIRED');
  odRead(confirmation.source_ref, host);
  odRequire(confirmation.confirmed_prototype_revision === business &&
    (confirmation.input_artifact_sha256 === bound.base.sha256 || existing && confirmation.input_artifact_sha256 === odHash(source)), 'OD_CONFIRMATION_STALE');
  return business;
}
async function odInput(host) {
  odPhase(host);
  const parent = host.parent_accepted_ref ? delivery.resolveFinal({ ...host.parent_accepted_ref, delivery_root: host.delivery_root }, host.current_context) : null;
  odRequire(!parent || parent.processor_id === 'motion-polish', 'PARENT_PROCESSOR');
  const bound = parent ? null : delivery.bindBase({ ...host.base_input, processor_id: 'prototype-notes' }, host.current_context);
  const entryRef = parent ? { path: parent.final_entry, sha256: parent.final_sha256 } : { path: bound.base.entry, sha256: bound.base.sha256 };
  odRequire(host.raw_gate?.kind === 'mechanical-current-version' && host.raw_gate.status === 'PASS', 'OD_RAW_GATE_FAILED');
  odRead(host.raw_gate.source_ref, host);
  odRequire(host.raw_gate.subject_ref?.path === entryRef.path && host.raw_gate.subject_ref.sha256 === entryRef.sha256, 'OD_RAW_GATE_STALE');
  const bytes = odRead(entryRef, host).toString('utf8');
  let source = bytes, existing = null;
  odRequire(['raw','annotated-html'].includes(host.input_kind), 'OD_INPUT_KIND_REQUIRED');
  if (host.input_kind === 'annotated-html') { existing = odResult(await notes.extractNotes(bytes)); source = existing.source; }
  const parentRoot = parent && (parent.delivery.kind === 'adequate-original' ? parent.base.asset_root : path.join(path.dirname(parent.candidate_ref.path), 'content'));
  const base = parent ? { ...parent.base, entry: parent.final_entry, sha256: parent.final_sha256,
    entry_relative: path.relative(parentRoot, parent.final_entry).split(path.sep).join('/'),
    closure: parent.delivery.closure.map(item => ({ ...item, path: path.relative(parentRoot, path.join(parent.delivery_root,item.path)).split(path.sep).join('/') })) } : bound.base;
  const business_revision = odConfirmation(host, { base }, source, existing);
  const sources_ref = structuredClone(host.sources_ref), sources = JSON.parse(odRead(sources_ref, host));
  odRequire(Array.isArray(sources) && sources.length > 0 && sources.some(item => item.kind === '设计规格' || item.kind === '用户确认' || item.kind === '原型观察'), 'OD_SOURCE_REQUIRED');
  const guideline_ref = structuredClone(host.guideline_ref), runtime_ref = structuredClone(host.runtime_ref);
  odRead(guideline_ref, host); odRead(runtime_ref, host);
  odRequire(guideline_ref.pin_or_version === '1.0.0' && runtime_ref.pin_or_version === '1.0.0', 'UNKNOWN_VERSION');
  odRequire(guideline_ref.sha256 === '322de1d236e7b4e0ba26520f036ccf2d76e3a58211d4bd5726adf37d78fbbf42', 'CONTENT_GUIDELINE_CHANGED');
  return { bound, parent, source, existing, business_revision, sources, sources_ref, entryRef, guideline_ref, runtime_ref };
}
export async function prepareODNotesCandidate(request, host) {
  if (!odEnabled(host)) return { notes_enabled: false, reason: host.recovery_only ? 'recovery-only' : 'disabled-or-no-interactive-delivery' };
  const input = await odInput(host), current = input.existing?.notes || host.current_notes;
  odRequire(current && request.proposed?.content_guideline_version === host.guideline_ref.pin_or_version, 'OD_NOTES_INPUT_REQUIRED');
  odRequire(request.proposed.provenance?.business_revision === input.business_revision, 'OD_CONFIRMATION_STALE');
  odRequire(Array.isArray(host.notes_required) && host.notes_required.length > 0 && host.notes_required.every(id => /^NOTES:.+/.test(id)), 'OD_NOTES_REQUIRED');
  const generation = { source: input.source, before: current, proposed: request.proposed, scope: host.generation_scope,
    bindings: host.bindings, behaviors: host.behaviors, sources: input.sources };
  odResult(await notes.validateGenerationScope(generation, host.notes_caller_context));
  const merged = odResult(await notes.mergeNotes({ ...generation, previous: current, current }, host.notes_caller_context));
  odResult(await notes.validateGenerationScope({ ...generation, proposed: merged.merged }, host.notes_caller_context));
  const built = odResult(await notes.buildAnnotatedHtml({ source: input.source, notes: merged.merged, sources: input.sources,
    bindings: host.bindings, generation: { behaviors: host.behaviors, before: merged.merged } }, host.notes_caller_context));
  const after = await odInput(host);
  odRequire(after.entryRef.sha256 === input.entryRef.sha256 && after.business_revision === input.business_revision && after.source === input.source, 'SOURCE_CHANGED');
  odRequire(JSON.stringify(after.sources_ref) === JSON.stringify(input.sources_ref), 'SOURCE_CHANGED');
  odRequire(JSON.stringify(after.guideline_ref) === JSON.stringify(input.guideline_ref) && JSON.stringify(after.runtime_ref) === JSON.stringify(input.runtime_ref), 'CONTENT_METHOD_CHANGED');
  const builtNotes = odResult(await notes.extractNotes(built.html));
  odRequire(builtNotes.source === input.source && odHash(JSON.stringify(builtNotes.notes)) === odHash(JSON.stringify(merged.merged)), 'SOURCE_CHANGED');
  const prepared = input.parent ? delivery.deriveFromAccepted({ accepted_ref: host.parent_accepted_ref, delivery_root: host.delivery_root,
    attempt_id: host.attempt_id, processor_id: 'prototype-notes', scope: host.scope, methods: host.methods, authority_ref: host.authority_ref }, host.current_context) :
    { bound: input.bound, attempt: delivery.prepareCopy(input.bound, { delivery_root: host.delivery_root, attempt_id: host.attempt_id, processor_id: 'prototype-notes' }, host.current_context) };
  const { bound, attempt } = prepared, write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  fs.writeFileSync(attempt.entry, built.html);
  const required = [...new Set([...host.source_required, ...(input.parent?.required_behavior_refs || []), ...host.notes_required])];
  const data = path.join(attempt.attempt_dir, 'notes-input.json');
  write(data, { notes: merged.merged, business_revision: input.business_revision, input_artifact_sha256: input.entryRef.sha256,
    user_confirmation: host.user_confirmation, scope: host.generation_scope, bindings: host.bindings, behaviors: host.behaviors, sources_ref: input.sources_ref, source_ref: bound.source,
    coverage: merged.coverage, conflicts: merged.conflicts, superseded_suggestions: merged.superseded_suggestions,
    guideline: input.guideline_ref, runtime: input.runtime_ref, raw_semantic_status: host.raw_semantic_status, delivery_acceptance: 'NOT_RUN' });
  const manifest = path.join(attempt.attempt_dir, 'notes-manifest.json');
  const mapping = required.map(behavior_id => ({ behavior_id, annotation_ids: merged.coverage.filter(row => row.behavior_id === behavior_id).flatMap(row => row.annotation_ids), source_refs: [bound.source.locator] }));
  write(manifest, { schema_version: 1, scope: bound.scope, input_data_ref: odRef(data), runtime: input.runtime_ref, content_guideline: input.guideline_ref,
    required_behavior_refs: required, notes_instance_refs: host.notes_required, behavior_mapping: mapping });
  const spec = path.join(attempt.attempt_dir, 'prototype-spec.md');
  fs.writeFileSync(spec, '# Current notes observation spec\n' + JSON.stringify({ final: odRef(attempt.entry), data: odRef(data), runtime: input.runtime_ref,
    guideline: input.guideline_ref, scope: host.generation_scope, mapping, required_behavior_refs: required,
    annotation_states: merged.merged.annotations.map(a => ({ id: a.id, evidence_status: a.evidence_status, implementation_status: a.implementation_status })),
    raw_recovery_ref: host.raw_recovery_ref, parent_accepted_ref: host.parent_accepted_ref || null, evidence_refs: host.behavior_evidence_refs || [], independent_acceptance: 'NOT_RUN' }, null, 2) + '\n', { flag: 'wx' });
  const closure = bound.base.closure.map(item => { const file = path.join(attempt.content_root,item.path); return { path: path.relative(host.delivery_root,file).split(path.sep).join('/'), sha256: odRef(file).sha256, bytes: fs.statSync(file).size }; });
  const operations = bound.base.closure.flatMap((item,index) => item.sha256 === closure[index].sha256 ? [] : [{ path: item.path, before_sha256: item.sha256, after_sha256: closure[index].sha256 }]);
  const patch = path.join(attempt.attempt_dir,'patch.json'), patchData = { base_sha256: bound.base.sha256, operations, content_changed: operations.length > 0 }; write(patch,patchData);
  const candidate = delivery.checkCandidate({ ...bound, attempt_id: host.attempt_id, processor_id: 'prototype-notes', delivery_root: host.delivery_root,
    required_behavior_refs: required, notes_manifest_ref: odRef(manifest), delivery: { id: host.attempt_id, kind: 'enhanced-copy', entry: path.relative(host.delivery_root,attempt.entry).split(path.sep).join('/'),
      sha256: odRef(attempt.entry).sha256, closure, spec: odRef(spec) }, patch: { ...odRef(patch), ...patchData } }, host.current_context);
  return { notes_enabled: true, review_stage: 'PREACCEPT', candidate_ref: candidate.candidate_ref, delivery_root: host.delivery_root,
    business_revision: input.business_revision, notes_manifest_ref: odRef(manifest), guideline_ref: structuredClone(input.guideline_ref), runtime_ref: structuredClone(input.runtime_ref), required_behavior_refs: required,
    input_artifact_ref: structuredClone(input.entryRef), source_ref: structuredClone(bound.source), parent_accepted_ref: structuredClone(bound.parent_accepted_ref || null),
    raw_semantic_status: host.raw_semantic_status, independent_acceptance: 'NOT_RUN', content_review: { guideline_ref: structuredClone(input.guideline_ref), sources_ref: structuredClone(input.sources_ref), input_data_ref: odRef(data) } };
}
export async function resolveODNotesFinal(exactNotesRef, prepared, host) {
  odRequire(odEnabled(host) && prepared.notes_enabled && prepared.review_stage === 'PREACCEPT', 'OD_NOTES_PREPARED_REQUIRED');
  const current = await odInput(host); odRequire(current.business_revision === prepared.business_revision, 'OD_CONFIRMATION_STALE');
  odRequire(JSON.stringify(current.entryRef) === JSON.stringify(prepared.input_artifact_ref) &&
    JSON.stringify(current.sources_ref) === JSON.stringify(prepared.content_review?.sources_ref) &&
    JSON.stringify(current.bound?.source || current.parent.source_ref) === JSON.stringify(prepared.source_ref) &&
    JSON.stringify(current.parent?.accepted_ref || null) === JSON.stringify(prepared.parent_accepted_ref), 'SOURCE_CHANGED');
  odRequire(JSON.stringify([...new Set([...host.source_required, ...(current.parent?.required_behavior_refs || []), ...host.notes_required])]) === JSON.stringify(prepared.required_behavior_refs), 'OD_REQUIRED_CHANGED');
  odRequire(JSON.stringify(current.guideline_ref) === JSON.stringify(prepared.guideline_ref) &&
    JSON.stringify(current.runtime_ref) === JSON.stringify(prepared.runtime_ref) &&
    JSON.stringify(prepared.content_review?.guideline_ref) === JSON.stringify(prepared.guideline_ref), 'CONTENT_METHOD_CHANGED');
  const resolved = delivery.resolveFinal({ ...exactNotesRef, delivery_root: host.delivery_root }, host.current_context);
  const manifest = JSON.parse(odRead(resolved.notes_manifest_ref, host));
  odRequire(JSON.stringify(manifest.content_guideline) === JSON.stringify(current.guideline_ref) &&
    JSON.stringify(manifest.runtime) === JSON.stringify(current.runtime_ref), 'CONTENT_METHOD_CHANGED');
  odRequire(resolved.processor_id === 'prototype-notes' && resolved.candidate_ref.path === prepared.candidate_ref.path && resolved.candidate_ref.sha256 === prepared.candidate_ref.sha256 &&
    resolved.notes_manifest_ref.path === prepared.notes_manifest_ref.path && resolved.notes_manifest_ref.sha256 === prepared.notes_manifest_ref.sha256 &&
    JSON.stringify(resolved.required_behavior_refs) === JSON.stringify(prepared.required_behavior_refs), 'OD_FINAL_IDENTITY_MISMATCH');
  return { ...resolved, notes_final_ref: resolved.accepted_ref, final_artifact_ref: resolved.accepted_ref, parent_completion: 'OWNER_MUST_VERIFY_NATIVE_ACCEPTANCE_BEFORE_SINGLE_COMPLETION' };
}
