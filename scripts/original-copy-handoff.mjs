import { isDeepStrictEqual } from 'node:util';
import { parseCanonicalJson, sha256Bytes, validateInertStorageReceipt } from './carrier-asset-profile.mjs';
import { verifyOriginalEditedOutput } from './original-template-edits.mjs';
import { authorizeScopedOperation, verifyScopedStageReadback, verifyScopedOutputReadback } from './design-flow-handoff.mjs';
import { prepareOriginalMaterials, assertOriginalBundle as assertMaterials, assertOriginalConfirmation, confirmOriginalMaterials } from './design-original-materials.mjs';
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const nonempty = s => typeof s === 'string' && s.trim().length > 0;
const hash = sha256Bytes;
const shape = (value, keys) => value && !Array.isArray(value) && typeof value === 'object' && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
const locateAction = action => ({ action_id: action.action_id, action: action.action, scope: action.scope, locator: action.locator });
function assertOriginalBundle(bundle) {
  if (bundle?.target?.tool !== 'od') fail('ORIGINAL_TARGET_INVALID', 'OD requires its exact project target');
  return assertMaterials(bundle);
}
export async function prepareOriginalCopyHandoff(args, options) {
  if (args?.target?.tool !== 'od') fail('ORIGINAL_TARGET_INVALID', 'OD requires its exact project target');
  return prepareOriginalMaterials(args, options);
}
export function confirmOriginalCopyHandoff(bundle, adoption) {
  assertOriginalBundle(bundle); return confirmOriginalMaterials(bundle, adoption);
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
