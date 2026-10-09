import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { canonicalJson, canonicalManifestHash, fileRecord, parseCanonicalJson, sha256Bytes, validateInertStorageReceipt } from './carrier-asset-profile.mjs';
import { verifyTemplateCopies, verifyCopyBytes } from './template-copy.mjs';
import { inspectCarrierPacket } from './carrier-packet.mjs';
import { locateOriginalEditRanges, verifyOriginalEditedOutput, resolveOriginalProfile } from './original-template-edits.mjs';
import { COMPOSITION_PROFILE, prepareBehaviorBindings, restoreBehaviorBindings, appendBoundBehavior } from './original-composition.mjs';
import { inspectOriginalResources } from './original-template-resources.mjs';
import { authorizeScopedOperation, verifyScopedStageReadback, verifyScopedOutputReadback, preparePrototypeEvidence, verifyPrototypeEvidence } from './design-flow-handoff.mjs';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const nonempty = s => typeof s === 'string' && s.trim().length > 0;
const safeId = s => typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(s);
const hash = sha256Bytes;
const json = value => Buffer.from(canonicalJson(value));
const file = (path, bytes, mime = 'application/json') => ({ ...fileRecord(path, mime, bytes), bytes: Buffer.from(bytes) });
const shape = (value, keys) => value && !Array.isArray(value) && typeof value === 'object' && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
const locateAction = action => ({ action_id: action.action_id, action: action.action, scope: action.scope, locator: action.locator });

function assertOriginalConfirmation(bundle, manifest) {
  const adoption = bundle?.confirmation;
  if (!adoption || adoption.actor !== 'user' || !nonempty(adoption.evidence) || !Number.isFinite(Date.parse(adoption.confirmed_at)) || adoption.handoff_bundle_hash !== bundle.handoff_bundle_hash || adoption.original_sha256 !== manifest.original_sha256 || adoption.tac_sha256 !== manifest.tac_sha256) fail('ORIGINAL_ADOPTION_STALE', 'Adoption must remain the exact real-user witness bound to the immutable original contract');
  return adoption;
}

export async function prepareOriginalCopyHandoff({ pageId, packetBody, target, handoffId, actions, prototypeEvidence, executionProfile, behaviorBindings }, { root = defaultRoot, browser } = {}) {
  if (!safeId(handoffId) || target?.tool !== 'od' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(target.projectId ?? '')) fail('ORIGINAL_TARGET_INVALID', 'Exact project and fresh safe handoff ID required');
  await verifyTemplateCopies({ root });
  const sourceManifest = JSON.parse(await readFile(resolve(root, '.claude/skill-os/page-library/source-manifest.json'), 'utf8'));
  const entry = sourceManifest.sources.find(source => source.page_id === pageId);
  if (!entry) fail('ORIGINAL_SOURCE_REQUIRED', 'Select a registered original, not a rewritten source');
  const base = await readFile(resolve(root, entry.copy_source)); verifyCopyBytes(base, entry);
  const resourceAudit = await inspectOriginalResources(base, { browser });
  const packet = inspectCarrierPacket(packetBody);
  const facts = new Map(packet.facts.map(fact => [fact.id, fact]));
  const scoped = new Set(packet.scopes.flatMap(scope => scope.source_ids));
  if (!Array.isArray(actions) || !actions.length) fail('ORIGINAL_ACTIONS_REQUIRED', 'Explicit original-location assessment required');
  for (const action of actions) {
    if (!shape(action, ['action_id', 'action', 'scope', 'locator', 'source_ids', 'confidence', 'rationale', 'alternatives']) || !Array.isArray(action.source_ids) || !action.source_ids.length || new Set(action.source_ids).size !== action.source_ids.length || action.source_ids.some(id => !facts.has(id) || scoped.has(id))) fail('ORIGINAL_FACT_BINDING', 'Actions must cite actual unscoped frozen facts exactly');
    if (action.confidence !== 'high' || !nonempty(action.rationale) || !Array.isArray(action.alternatives) || action.alternatives.length) fail('ORIGINAL_NEEDS_CONTEXT', 'Resolve semantic or location ambiguity before preparing a carrier');
  }
  if ([...facts.keys()].some(id => !scoped.has(id) && !actions.some(a => a.source_ids.includes(id)))) fail('ORIGINAL_FACT_COVERAGE', 'Every Packet fact must have a disposition; do not shrink the denominator');
  const profile = resolveOriginalProfile(actions, executionProfile);
  if (profile !== COMPOSITION_PROFILE && behaviorBindings !== undefined) fail('ORIGINAL_PROFILE_INVALID', 'Behavior inputs require explicit composition');
  const behavior = profile === COMPOSITION_PROFILE ? prepareBehaviorBindings(behaviorBindings, { actions, factIds: [...facts.keys()].filter(id => !scoped.has(id)) }) : null;
  if (behavior) appendBoundBehavior(base, behaviorBindings); // prove the source has the exact supported insertion seam, without executing it
  const ranges = await locateOriginalEditRanges(base, actions.map(locateAction), { browser, executionProfile: profile, allowPreserveOnly: Boolean(behavior) });
  const prototype = preparePrototypeEvidence(prototypeEvidence, { factIds: [...facts.keys()], sourceIndexVerified: true });
  const contract = {
    schema_version: 1, profile, page_id: pageId,
    source_sha256: entry.raw_sha256, source_bytes: entry.raw_bytes,
    source_packet_sha256: packet.source_packet_sha256, applicability: packet.applicability,
    actions, original_locations: ranges.targets, resource_audit: resourceAudit,
    ...(behavior ? { behavior_bindings: behavior.records } : {}),
    coverage: packet.facts.map(f => ({ id: f.id, action_ids: actions.filter(a => a.source_ids.includes(f.id)).map(a => a.action_id), scopes: packet.scopes.filter(s => s.source_ids.includes(f.id)) })),
    output: { entry: 'output/index.html', edits: 'output/implementation-manifest.json', edits_schema: '{"schema_version":1,"edits":[{"action_id":"...","html":"..."}]}', policy: profile === 'original-ui-refinement-v1' ? 'Refine uses the complete target outerHTML and changes only valid class/style attributes within that exact original scope; preserve has no edit. All business DOM, text, behavior attributes, comments, non-target bytes, original scripts/global styles and resources remain unchanged. New functionality, executable code and assets require a separate reviewed contract. Prototype attachments are inert evidence; frozen facts remain the sole requirement authority.' : 'add appends inside the target; modify replaces its inner HTML; remove deletes its whole node; preserve has no edit. All other bytes/scripts/styles stay unchanged. New executable code or assets require another reviewed contract.' }
  };
  if (behavior) contract.output.policy = 'Use original-composition-v1 on one original baseline. add appends edit.html inside the target; modify replaces only its inner HTML; remove deletes the whole target node and requires empty edit.html; preserve has no edit. refine uses the complete target outerHTML and changes only meaningful valid class/style attributes within that disjoint scope, preserving business DOM, text, behavior attributes and comments. Each non-preserve action needs exactly one {action_id,html} edit in output/implementation-manifest.json. Generated fragments remain static; every byte outside the declared edits and behavior insertion stays unchanged, including original scripts/global CSS. After edits, append each frozen input/behavior/<id>.js verbatim, in binding order, as a classic <script data-luca-behavior="<id>">CODE</script> immediately before the explicit </body>, with one newline before each script and one after the last. No additional script, inline event, resource or code change is authorized by output. Binding hashes prove integrity, not user approval, code review, runtime containment or behavior. Full source/acceptance coverage, independent exact-code review and subsequent browser/visual acceptance remain required.';
  const namespace = `handoffs/${handoffId}`;
  const files = [
    file('input/base-template.html', base, 'text/html; charset=utf-8'),
    file('control/brief.md', Buffer.from(packetBody), 'text/markdown; charset=utf-8'),
    file('control/original-adaptation.json', json(contract)),
    file('control/original-adaptation.md', Buffer.from('# Original template adaptation\n\nUse the complete unchanged original input. Source copy is not a rewrite.\n\n```json\n' + canonicalJson(contract) + '\n```\n\n## Complete frozen facts\n' + packet.facts.map(f => `${JSON.stringify(f.id)}: ${JSON.stringify(f.text)}`).join('\n') + '\n'), 'text/markdown; charset=utf-8')
  ];
  files.push(...prototype.files);
  if (behavior) files.push(...behavior.files);
  const records = files.map(({ bytes, ...rest }) => ({ ...rest, bytes: bytes.length }));
  const manifest = { schema_version: 3, bundle_kind: 'carrier', carrier_profile: profile, target: { tool: 'od', projectId: target.projectId }, handoff_id: handoffId, namespace, page_id: pageId, original_sha256: entry.raw_sha256, source_packet_sha256: packet.source_packet_sha256, tac_sha256: hash(json(contract)), input_root: 'input', output_root: 'output', output_profile: 'single', immutable_files: records, ...(prototype.records.length ? { prototype_evidence: prototype.records } : {}) };
  manifest.handoff_bundle_hash = canonicalManifestHash(manifest, records);
  files.push(file('control/handoff-manifest.json', json(manifest)));
  const bundle = { status: 'EXPORTED', schema_version: 3, bundle_kind: 'carrier', carrier_profile: profile, target: manifest.target, handoff_id: handoffId, namespace, handoff_bundle_hash: manifest.handoff_bundle_hash, files };
  assertOriginalBundle(bundle);
  return bundle;
}

function assertOriginalBundle(bundle) {
  if (bundle?.status !== 'EXPORTED' || bundle.schema_version !== 3 || bundle.bundle_kind !== 'carrier' || !['original-preserving-v1', 'original-ui-refinement-v1', COMPOSITION_PROFILE].includes(bundle.carrier_profile) || !Array.isArray(bundle.files) || bundle.files.length < 5) fail('ORIGINAL_BUNDLE_INVALID', 'Expected an immutable supported original bundle');
  const expected = ['input/base-template.html', 'control/brief.md', 'control/original-adaptation.json', 'control/original-adaptation.md'];
  if (!isDeepStrictEqual(bundle.files.slice(0, 4).map(f => f.path), expected) || bundle.files.at(-1)?.path !== 'control/handoff-manifest.json' || new Set(bundle.files.map(f => f.path)).size !== bundle.files.length) fail('ORIGINAL_BUNDLE_CHANGED', 'Exact original input/control file set and unique evidence paths required');
  for (const item of bundle.files) if (!Buffer.isBuffer(item.bytes) || hash(item.bytes) !== item.sha256) fail('ORIGINAL_BUNDLE_CHANGED', 'Immutable file changed');
  const get = path => bundle.files.find(f => f.path === path).bytes;
  const manifest = parseCanonicalJson(get('control/handoff-manifest.json'));
  const manifestKeys = ['schema_version', 'bundle_kind', 'carrier_profile', 'target', 'handoff_id', 'namespace', 'page_id', 'original_sha256', 'source_packet_sha256', 'tac_sha256', 'input_root', 'output_root', 'output_profile', 'immutable_files', 'handoff_bundle_hash', ...(Object.hasOwn(manifest, 'prototype_evidence') ? ['prototype_evidence'] : [])];
  if (!shape(manifest, manifestKeys) || manifest.schema_version !== 3 || manifest.bundle_kind !== 'carrier' || manifest.input_root !== 'input' || manifest.output_root !== 'output' || manifest.output_profile !== 'single' || !shape(manifest.target, ['tool', 'projectId']) || manifest.target.tool !== 'od' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(manifest.target.projectId ?? '') || !safeId(bundle.handoff_id) || (Object.hasOwn(manifest, 'prototype_evidence') && (!Array.isArray(manifest.prototype_evidence) || !manifest.prototype_evidence.length))) fail('ORIGINAL_BUNDLE_CHANGED', 'Original manifest uses a closed versioned schema with optional nonempty prototype evidence');
  const records = bundle.files.slice(0, -1).map(({ bytes, ...rest }) => ({ ...rest, bytes: bytes.length }));
  if (canonicalManifestHash(manifest, records) !== bundle.handoff_bundle_hash || manifest.handoff_bundle_hash !== bundle.handoff_bundle_hash || !isDeepStrictEqual(manifest.immutable_files, records) || !isDeepStrictEqual(manifest.target, bundle.target) || manifest.handoff_id !== bundle.handoff_id || manifest.namespace !== bundle.namespace || bundle.namespace !== `handoffs/${bundle.handoff_id}` || manifest.carrier_profile !== bundle.carrier_profile) fail('ORIGINAL_BUNDLE_CHANGED', 'Original scope/manifest changed');
  const contract = parseCanonicalJson(get('control/original-adaptation.json'));
  const composed = contract.profile === COMPOSITION_PROFILE;
  if (!shape(contract, ['schema_version', 'profile', 'page_id', 'source_sha256', 'source_bytes', 'source_packet_sha256', 'applicability', 'actions', 'original_locations', 'resource_audit', 'coverage', 'output', ...(composed ? ['behavior_bindings'] : [])]) || contract.schema_version !== 1 || !Array.isArray(contract.actions) || !contract.actions.length || contract.actions.some(action => !shape(action, ['action_id', 'action', 'scope', 'locator', 'source_ids', 'confidence', 'rationale', 'alternatives']) || !['add', 'modify', 'remove', 'preserve', 'refine'].includes(action.action)) || (contract.profile === 'original-ui-refinement-v1' && contract.actions.some(action => !['refine', 'preserve'].includes(action.action))) || !shape(contract.output, ['entry', 'edits', 'edits_schema', 'policy']) || contract.output.entry !== 'output/index.html' || contract.output.edits !== 'output/implementation-manifest.json') fail('ORIGINAL_BUNDLE_CHANGED', 'Original contract and action profile must remain closed and version-bound');
  const packet = inspectCarrierPacket(get('control/brief.md').toString('utf8'));
  verifyPrototypeEvidence(bundle.files.slice(0, -1), manifest.prototype_evidence, { factIds: packet.facts.map(fact => fact.id), sourceIndexVerified: true });
  const behaviorBindings = composed ? restoreBehaviorBindings(contract.behavior_bindings, bundle.files, { actions: contract.actions, factIds: packet.facts.filter(f => !packet.scopes.some(s => s.source_ids.includes(f.id))).map(f => f.id) }) : undefined;
  if (bundle.files.length !== 5 + (manifest.prototype_evidence?.length ? manifest.prototype_evidence.length + 1 : 0) + (behaviorBindings?.length ?? 0) || contract.profile !== manifest.carrier_profile || resolveOriginalProfile(contract.actions, contract.profile) !== contract.profile || hash(get('input/base-template.html')) !== manifest.original_sha256 || hash(get('control/brief.md')) !== manifest.source_packet_sha256 || hash(get('control/original-adaptation.json')) !== manifest.tac_sha256 || contract.source_sha256 !== manifest.original_sha256 || contract.source_packet_sha256 !== manifest.source_packet_sha256) fail('ORIGINAL_BUNDLE_CHANGED', 'Original/Packet/contract/evidence identity changed');
  if (Object.hasOwn(bundle, 'confirmation')) assertOriginalConfirmation(bundle, manifest);
  return { manifest, contract, get, behaviorBindings };
}

export function confirmOriginalCopyHandoff(bundle, adoption) {
  const { manifest } = assertOriginalBundle(bundle);
  if (adoption?.actor !== 'user' || !nonempty(adoption.evidence) || adoption.handoff_bundle_hash !== bundle.handoff_bundle_hash || adoption.original_sha256 !== manifest.original_sha256 || adoption.tac_sha256 !== manifest.tac_sha256 || !Number.isFinite(Date.parse(adoption.confirmed_at))) fail('ORIGINAL_ADOPTION_REQUIRED', 'Real user adoption must bind the exact original/TAC/bundle');
  return { ...bundle, confirmation: { ...adoption } };
}

function sameReceipt(bundle, receipt) {
  return receipt && receipt.projectId === bundle.target.projectId && receipt.handoff_id === bundle.handoff_id && receipt.namespace === bundle.namespace && receipt.handoff_bundle_hash === bundle.handoff_bundle_hash;
}
export function authorizeOriginalOperation(bundle, grant, operation, { runtime, staged } = {}) {
  const { manifest } = assertOriginalBundle(bundle);
  assertOriginalConfirmation(bundle, manifest);
  if (operation === 'stage') validateInertStorageReceipt(grant?.inertStorageReceipt, { templateSha256: manifest.original_sha256, handoffId: bundle.handoff_id });
  if (operation === 'run' && (!sameReceipt(bundle, staged) || staged.status !== 'STAGED')) fail('ORIGINAL_STAGE_REQUIRED', 'Headless run requires the exact plain stage receipt');
  if (operation === 'recover' && (!sameReceipt(bundle, staged) || staged.status !== 'OD_RUN_AUTHORIZED')) fail('ORIGINAL_STAGE_REQUIRED', 'Original v1 recovery requires the exact authorized headless run, not an old stage or desktop report');
  const authorized = authorizeScopedOperation(bundle, grant, operation, { runtime });
  if (operation === 'run') {
    if (!/^[a-f0-9]{64}$/.test(grant.prompt_hash ?? '')) fail('ORIGINAL_PROMPT_REQUIRED', 'Headless authority must bind its exact prompt');
    return { ...staged, status: 'OD_RUN_AUTHORIZED', prompt_hash: grant.prompt_hash, authorization: authorized };
  }
  return authorized;
}
export function verifyOriginalStage(bundle, readback) {
  const { manifest } = assertOriginalBundle(bundle);
  assertOriginalConfirmation(bundle, manifest);
  return verifyScopedStageReadback(bundle, readback);
}
export function reportOriginalGeneration(bundle, staged, report) {
  const { manifest } = assertOriginalBundle(bundle);
  assertOriginalConfirmation(bundle, manifest);
  // A saved STAGED/desktop receipt cannot prove that no later headless run was
  // canceled. Until a trusted attempt ledger exists, this branch is unsafe.
  fail('ORIGINAL_DESKTOP_UNSUPPORTED', 'Original v1 desktop generation cannot establish current-attempt provenance; use a fresh authorized headless run');
}
export async function recoverOriginalOutput(bundle, staged, readback, authorization, options = {}) {
  const { manifest, contract, get, behaviorBindings } = assertOriginalBundle(bundle);
  assertOriginalConfirmation(bundle, manifest);
  if (!sameReceipt(bundle, staged) || staged.status !== 'OD_RUN_AUTHORIZED' || !sameReceipt(bundle, authorization) || !isDeepStrictEqual(authorization.scope, ['recover'])) fail('ORIGINAL_RECOVER_AUTHORITY', 'Independent exact recover authority and headless generation evidence required');
  if (!nonempty(readback.run?.run_id) || readback.run.handoff_id !== bundle.handoff_id || !/^[a-f0-9]{64}$/.test(readback.run.prompt_hash ?? '') || readback.run.prompt_hash !== staged.prompt_hash || readback.run.status !== 'succeeded') fail('ORIGINAL_RUN_NOT_SUCCEEDED', 'Do not turn an unfinished/canceled run into successful headless acceptance; keep its artifact as evidence');
  const outputs = verifyScopedOutputReadback(bundle, staged, readback, ['output/index.html', 'output/implementation-manifest.json']);
  const output = outputs.find(f => f.path.endsWith('/output/index.html')).bytes;
  const declared = parseCanonicalJson(outputs.find(f => f.path.endsWith('/output/implementation-manifest.json')).bytes);
  if (!shape(declared, ['schema_version', 'edits']) || declared.schema_version !== 1) fail('ORIGINAL_EDIT_SET', 'Output edit manifest is untrusted and must use the closed schema');
  const validation = await verifyOriginalEditedOutput({ base: get('input/base-template.html'), output, actions: contract.actions.map(locateAction), edits: declared.edits, executionProfile: contract.profile, behaviorBindings }, options);
  return { status: 'RECOVERED', bundle_kind: 'carrier', carrier_profile: bundle.carrier_profile, project_id: bundle.target.projectId, handoff_id: bundle.handoff_id, namespace: bundle.namespace, original_sha256: manifest.original_sha256, handoff_bundle_hash: bundle.handoff_bundle_hash, output_sha256: hash(output), output_bytes: output.length, mechanical_validation: validation, provenance: 'od_run_observed', semantic_acceptance: 'PENDING_INDEPENDENT_REVIEW' };
}
