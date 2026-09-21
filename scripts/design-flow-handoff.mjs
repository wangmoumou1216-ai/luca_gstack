import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { crc32, inflateSync } from 'node:zlib';
import * as pageContext from './page-context.mjs';
import { inspectCarrierPacket, renderTacMarkdown } from './carrier-packet.mjs';
import { anchoredNodes, parseCarrierDom, structuralDom } from './carrier-dom.mjs';
export { createCarrierPacket, inspectCarrierPacket, renderTacMarkdown } from './carrier-packet.mjs';
import {
  canonicalJson, canonicalManifestHash, carrierContentHash, fileRecord,
  parseCanonicalJson, resolveAssetClosure, safeRelativePath, sha256Bytes,
  validateInertStorageReceipt
} from './carrier-asset-profile.mjs';

const { validateSelection } = pageContext;

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const text = value => typeof value === 'string' && value.trim().length > 0;
const odProjectId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
const file = (name, mediaType, bytes) => ({ name, mediaType, bytes: Buffer.from(bytes), sha256: hash(bytes) });

// Accept the static preview renderer's RGB/RGBA PNGs. Reject text chunks and
// trailing documents instead of shipping source code inside a nominal image.
function checkPng(png) {
  const reject = () => fail('PNG_REQUIRED', 'Attach complete static RGB/RGBA PNG bytes, not a path, source HTML or active document');
  if (!Buffer.isBuffer(png) || png.length < 45 || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) reject();
  let offset = 8;
  let width, height, channels, ended = false;
  const compressed = [];
  while (offset < png.length) {
    if (offset + 12 > png.length) reject();
    const size = png.readUInt32BE(offset), end = offset + size + 12;
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (end > png.length || !['IHDR', 'IDAT', 'IEND', 'sRGB', 'gAMA', 'cHRM', 'pHYs'].includes(type) || crc32(png.subarray(offset + 4, end - 4)) !== png.readUInt32BE(end - 4)) reject();
    if (offset === 8 && type !== 'IHDR') reject();
    if (type === 'IHDR') {
      if (offset !== 8 || size !== 13 || png[offset + 16] !== 8 || ![2, 6].includes(png[offset + 17]) || png[offset + 18] !== 0 || png[offset + 19] !== 0 || png[offset + 20] !== 0) reject();
      width = png.readUInt32BE(offset + 8); height = png.readUInt32BE(offset + 12); channels = png[offset + 17] === 2 ? 3 : 4;
      if (!width || !height || (width * channels + 1) * height > 128 * 1024 * 1024) reject();
    }
    if (type === 'IDAT') compressed.push(png.subarray(offset + 8, end - 4));
    if (type === 'IEND') { if (size !== 0 || end !== png.length) reject(); ended = true; }
    offset = end;
  }
  if (!ended || compressed.length === 0) reject();
  let pixels;
  try { pixels = inflateSync(Buffer.concat(compressed), { maxOutputLength: (width * channels + 1) * height }); } catch { reject(); }
  if (pixels.length !== (width * channels + 1) * height) reject();
  for (let row = 0; row < height; row++) if (pixels[row * (width * channels + 1)] > 4) reject();
}

// The upstream skill owns alignment and source scope. This helper transports its
// exact body; it neither recompiles requirements nor reads caller-supplied paths.
export async function buildDesignHandoff({ source, target, selection }, { catalog, root, preview, verifiedUserDecision } = {}) {
  if (!['chain', 'adhoc', 'ux'].includes(source?.mode) || !text(source?.id) || !text(source?.body)) fail('SOURCE_REQUIRED', 'Provide the aligned Generation Packet, explicit adhoc plan, or confirmed UX issues as a complete body');
  if (!['od', 'claude-design'].includes(target?.tool) || (target.projectId !== undefined && !(target.tool === 'od' ? odProjectId(target.projectId) : text(target.projectId)))) fail('TARGET_REQUIRED', 'Name the design tool and exact bound project ID; OD IDs must be safe lowercase slugs of at most 64 characters');
  const validated = await validateSelection(catalog, selection, { root, preview });
  const brief = source.body;
  const bundle = {
    status: 'EXPORTED', brief,
    source: { mode: source.mode, id: source.id, sha256: hash(Buffer.from(brief)) },
    target: { tool: target.tool, ...(target.projectId === undefined ? {} : { projectId: target.projectId }) },
    reference: 'none', files: [file('brief.md', 'text/markdown; charset=utf-8', Buffer.from(brief))]
  };
  if (validated.status === 'confirmed') {
    // A caller must obtain this witness from the actual user message/selector and
    // bind the screenshot the user saw. JSON cannot cryptographically prove a human.
    const witness = verifiedUserDecision;
    if (!text(witness?.messageRef) || witness.evidence !== selection.confirmation.evidence || witness.confirmedAt !== selection.confirmation.confirmed_at || !isDeepStrictEqual(witness.selection, selection) || !text(witness.previewSha256) || witness.previewSha256 !== preview?.manifest?.screenshot?.sha256) fail('USER_DECISION_REQUIRED', 'Independently check the actual user decision, exact selection and preview version before adopting a reference');
    const manifest = preview?.manifest;
    const shot = manifest?.screenshot;
    const png = preview?.png;
    checkPng(png);
    if (manifest.schema_version !== 1 || manifest.page_id !== validated.reference.page_id || manifest.source_hash !== validated.reference.source_hash || shot.source_hash !== validated.reference.source_hash || !isDeepStrictEqual(manifest.viewport, validated.reference.viewport) || !isDeepStrictEqual(shot.viewport, validated.reference.viewport) || hash(png) !== shot.sha256 || png.readUInt32BE(16) !== shot.width || png.readUInt32BE(20) !== shot.height) fail('STALE_SCREENSHOT', 'Preview bytes, source version or viewport differ from the confirmed current page');
    bundle.reference = {
      page_id: validated.reference.page_id, source_ref: validated.reference.source_ref,
      source_hash: validated.reference.source_hash, screenshot_sha256: shot.sha256,
      usage: 'structure-and-location-only', attachment: 'reference.png',
      interpretation: 'The reference identifies structure and location; visual style and target layout dimensions are decided in the target design tool.',
      location: { kind: 'page', description: 'Whole reference page; screenshot dimensions describe the source, not the target layout.', bounds: { x: 0, y: 0, width: shot.width, height: shot.height } },
      confirmation: { ...validated.confirmation }, message_ref: witness.messageRef
    };
    if (validated.reference.kind === 'region') {
      const region = validated.reference.region;
      const matches = manifest.regions?.filter(item => item.region_id === region.region_id) ?? [];
      const bounds = matches[0]?.bounds;
      if (matches.length !== 1 || !bounds || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(bounds[key])) || bounds.x < 0 || bounds.y < 0 || bounds.width <= 0 || bounds.height <= 0 || bounds.x + bounds.width > shot.width || bounds.y + bounds.height > shot.height) fail('LOCATION_REQUIRED', 'The selected region needs a unique visible location in this screenshot');
      bundle.reference.location = { kind: 'region', region_id: region.region_id, description: `${region.name}: ${region.intent}`, bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } };
    }
    if (validated.reference.kind === 'box') {
      const { x, y, width, height } = validated.reference.box;
      bundle.reference.location = { kind: 'box', description: 'User-selected area in original screenshot coordinates.', bounds: { x, y, width, height } };
    }
  }
  const metadata = { source: bundle.source, target: bundle.target, status: validated.status, reference: bundle.reference };
  bundle.files.push(file('page-reference.json', 'application/json', Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`)));
  if (validated.status === 'confirmed') bundle.files.push(file('reference.png', 'image/png', preview.png));
  return bundle;
}

// Run immediately before the caller's external stage operation. Page adoption
// does not supply a tool/project/write grant, and export does not perform a write.
export function authorizeStage(bundle, grant) {
  if (bundle?.status !== 'EXPORTED' || bundle.target?.tool !== 'od' || !odProjectId(bundle.target.projectId) || grant?.tool !== 'od' || grant.projectId !== bundle.target.projectId || grant.write !== true || !text(grant.messageRef)) fail('STAGE_NOT_AUTHORIZED', 'Stage requires the exact bound OD project and a separately verified user write grant');
  return { tool: 'od', projectId: bundle.target.projectId };
}

// This checks evidence supplied by the real caller; it performs no network read.
// Tests may simulate that boundary, but fixture receipts cannot prove OD access.
export function verifyReadback(bundle, readback) {
  if (!readback || !text(readback.readRef) || !Array.isArray(readback.files)) fail('READBACK_REQUIRED', 'Read the target project and each uploaded file back from OD; HTTP success alone is insufficient');
  if (bundle?.target?.tool !== 'od' || !odProjectId(bundle.target.projectId) || readback.tool !== 'od' || readback.projectId !== bundle.target.projectId) fail('READBACK_TARGET_MISMATCH', 'Readback must identify the exact bound OD project');
  const expectedNames = ['brief.md', 'page-reference.json', ...(bundle.reference === 'none' ? [] : ['reference.png'])];
  if (bundle.status !== 'EXPORTED' || !text(bundle.brief) || !Array.isArray(bundle.files) || !isDeepStrictEqual(bundle.files.map(item => item.name), expectedNames) || bundle.source?.sha256 !== hash(Buffer.from(bundle.brief)) || bundle.files.some(item => !Buffer.isBuffer(item.bytes) || item.sha256 !== hash(item.bytes)) || !bundle.files[0].bytes.equals(Buffer.from(bundle.brief))) fail('BUNDLE_CHANGED', 'The exported body, source identity or expected attachments changed before readback');
  let metadata;
  try { metadata = JSON.parse(bundle.files[1].bytes.toString('utf8')); } catch { fail('BUNDLE_CHANGED', 'The exported page reference metadata is invalid'); }
  if (!isDeepStrictEqual(metadata.source, bundle.source) || !isDeepStrictEqual(metadata.target, bundle.target) || !isDeepStrictEqual(metadata.reference, bundle.reference)) fail('BUNDLE_CHANGED', 'The exported transport metadata no longer matches its source, target or reference');
  if (readback.files.some(item => !text(item?.name)) || new Set(readback.files.map(item => item.name)).size !== readback.files.length) fail('READBACK_REQUIRED', 'Readback file names must identify unique actual files');
  for (const expected of bundle.files) {
    const actual = readback.files.find(item => item.name === expected.name);
    if (!actual) fail('READBACK_MISSING_FILE', `Missing actual readback bytes for ${expected.name}`);
    if (!Buffer.isBuffer(actual.bytes) || !actual.bytes.equals(expected.bytes)) fail('READBACK_CONTENT_MISMATCH', `Actual OD bytes differ from the export: ${expected.name}`);
  }
  return { status: 'STAGED', tool: 'od', projectId: bundle.target.projectId, readRef: readback.readRef, files: bundle.files.map(item => ({ name: item.name, sha256: hash(item.bytes) })) };
}

export function recoverTarget(binding) {
  if (binding?.tool !== 'od' || !odProjectId(binding.projectId)) fail('RECOVER_TARGET_REQUIRED', 'Recover requires an explicitly bound safe OD project slug; never infer the most recent project');
  return { tool: 'od', projectId: binding.projectId };
}

// ---- V2 carrier branch ---------------------------------------------------
// V1 above intentionally remains the backwards-compatible reference transport.
// V2 uses a separate namespace and never writes it itself: callers supply actual
// OD readback bytes to the verification functions below.

const carrierId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
const hashHex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const v2File = (path, mediaType, bytes) => ({ ...fileRecord(path, mediaType, bytes), bytes: Buffer.from(bytes) });
const bytesOf = (value, code, message) => {
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (typeof value === 'string') return Buffer.from(value, 'utf8');
  fail(code, message);
};
const one = (array, predicate) => array.filter(predicate);
const fullPath = (namespace, path) => `${namespace}/${path}`;

function v2Source(source) {
  if (!['chain', 'adhoc', 'ux'].includes(source?.mode) || !text(source?.id) || !text(source?.body)) fail('SOURCE_REQUIRED', 'Carrier handoff requires the complete frozen Design Generation Packet body');
  const bytes = Buffer.from(source.body, 'utf8');
  return { mode: source.mode, id: source.id, body: source.body, bytes, sha256: hash(bytes) };
}

function v2Target(target) {
  if (target?.tool !== 'od' || !odProjectId(target.projectId)) fail('TARGET_REQUIRED', 'Carrier handoff requires one exact safe OD project ID');
  return { tool: 'od', projectId: target.projectId };
}

function strictControlJson(value, path) {
  const bytes = bytesOf(value, 'CONTROL_JSON_REQUIRED', `${path} must be canonical JSON bytes`);
  const parsed = parseCanonicalJson(bytes);
  const canonical = Buffer.from(canonicalJson(parsed), 'utf8');
  if (!canonical.equals(bytes)) fail('JSON_NON_CANONICAL', `${path} must use canonical JSON without alternate whitespace or escaping`);
  return { bytes, parsed };
}

function draftValidator(options) {
  const validator = options?.validateCarrierBindingDraft ?? pageContext.validateCarrierBindingDraft;
  if (typeof validator !== 'function') fail('CARRIER_CONTRACT_UNAVAILABLE', 'Carrier handoff requires the current page-context V2 draft validator');
  return validator;
}

function finalValidator(options) {
  const validator = options?.validateCarrierBinding ?? pageContext.validateCarrierBinding;
  if (typeof validator !== 'function') fail('CARRIER_CONTRACT_UNAVAILABLE', 'Carrier confirmation requires the current page-context V2 final validator');
  return validator;
}

function bindingDetails(draft) {
  const binding = draft?.binding ?? draft;
  const frozen = draft?.frozen_packet;
  if (!binding || !frozen || !text(binding.page_id) || !hashHex(binding.source_hash) || !hashHex(binding.module_contract_hash) || !hashHex(frozen.source_packet_sha256) || !hashHex(draft.binding_sha256)) fail('CARRIER_BINDING_INVALID', 'The page-context draft must contain a fresh eligible page, frozen packet, module contract and binding hash');
  return { draft, binding, frozen, bindingSha256: draft.binding_sha256 };
}

const sourceKey = item => `${item.source_kind}:${item.id}:${item.packet_span_hash}`;

function assertTacFields(tac) {
  const fields = (value, required, optional = []) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) fail('TAC_FIELDS_INVALID', 'TAC is a closed projection contract, not a channel for additional instructions or undeclared fields');
  };
  const array = value => { if (!Array.isArray(value)) fail('TAC_FIELDS_INVALID', 'TAC projection tables must be arrays'); };
  const sourceFields = ['source_kind', 'id', 'packet_span_hash'];
  fields(tac, ['template', 'source_packet_sha256', 'applicability_set_sha256', 'applicability_set', 'changes', 'coverage', 'output'], ['carrier_content_hash']);
  fields(tac.template, ['page_id', 'module_contract_hash'], ['carrier_content_hash']);
  for (const name of ['applicability_set', 'changes', 'coverage']) array(tac[name]);
  for (const item of tac.applicability_set) fields(item, sourceFields);
  for (const change of tac.changes) {
    if (change?.action === 'preserve') fields(change, ['change_id', 'action', 'module_id', 'invariants'], ['source_projections']);
    else {
      fields(change, ['change_id', 'action', change?.action === 'add' ? 'slot_id' : 'module_id', 'source_projections']);
    }
    if (change.source_projections !== undefined) {
      array(change.source_projections);
      for (const projection of change.source_projections) fields(projection, sourceFields);
    }
  }
  for (const row of tac.coverage) {
    fields(row, [...sourceFields, 'disposition']);
    const disposition = row.disposition;
    if (disposition?.kind === 'change') fields(disposition, ['kind', 'change_id']);
    else if (disposition?.kind === 'non_template_effect') fields(disposition, ['kind', 'scope_span_hash']);
    else if (disposition?.kind === 'out_of_scope') fields(disposition, ['kind', 'scope_span_hash', 'confirmation_ref']);
    else fail('TAC_FIELDS_INVALID', 'Unknown TAC coverage disposition');
  }
  fields(tac.output, ['entry', 'base_must_remain_unchanged']);
}

function tacDetails(tacJson, tacMarkdown, sourcePacketSha256, moduleContractHash, carrierHash, binding, frozen, contract, packetBody) {
  const json = strictControlJson(tacJson, 'control/template-adaptation.json');
  const markdown = bytesOf(tacMarkdown, 'TAC_REQUIRED', 'Carrier handoff requires the generated readable TAC projection');
  if (markdown.length === 0) fail('TAC_REQUIRED', 'Carrier handoff requires a non-empty readable TAC projection');
  const tac = json.parsed;
  assertTacFields(tac);
  const packet = inspectCarrierPacket(packetBody);
  if (packet.source_packet_sha256 !== sourcePacketSha256 || packet.applicability_set_sha256 !== frozen.applicability_set_sha256 || !isDeepStrictEqual(tac.applicability_set, packet.applicability)) fail('TAC_APPLICABILITY_INVALID', 'Applicability must be the complete ordered fact set derived from actual frozen Packet bytes');
  const expectedCarrier = tac.carrier_content_hash ?? tac.template?.carrier_content_hash;
  if (Object.hasOwn(tac, 'carrier_content_hash') && Object.hasOwn(tac.template, 'carrier_content_hash') && tac.carrier_content_hash !== tac.template.carrier_content_hash) fail('TAC_STALE', 'Top-level and template carrier hashes cannot disagree');
  if (tac.source_packet_sha256 !== sourcePacketSha256 || tac.template?.page_id !== binding.page_id || tac.template?.module_contract_hash !== moduleContractHash || expectedCarrier !== carrierHash || tac.applicability_set_sha256 !== frozen.applicability_set_sha256) fail('TAC_STALE', 'TAC packet/applicability/module/carrier identity does not match the immutable handoff inputs');
  if (!Array.isArray(tac.applicability_set) || hash(Buffer.from(canonicalJson(tac.applicability_set), 'utf8')) !== frozen.applicability_set_sha256) fail('TAC_APPLICABILITY_INVALID', 'TAC must include the exact canonical applicability set bound by the frozen packet');
  const applicable = new Map();
  for (const item of tac.applicability_set) {
    if (!['requirement', 'decision', 'state', 'acceptance', 'constraint'].includes(item?.source_kind) || !text(item?.id) || !hashHex(item?.packet_span_hash)) fail('TAC_APPLICABILITY_INVALID', 'Applicability entries require source_kind, stable id and packet span hash');
    const key = sourceKey(item);
    if (applicable.has(key)) fail('TAC_APPLICABILITY_INVALID', 'Applicability entries must be unique');
    applicable.set(key, item);
  }
  if (!applicable.size || !Array.isArray(tac.changes) || !Array.isArray(tac.coverage)) fail('TAC_COVERAGE_INVALID', 'TAC requires applicability, changes and coverage tables');
  const actions = new Map(binding.actions.map(action => [action.action_id, action]));
  const contractModules = new Map(contract.modules.map(module => [module.module_id, module]));
  const contractSlots = new Map(contract.slots.map(slot => [slot.slot_id, slot]));
  const changes = new Map();
  const traceKeys = new Map();
  for (const change of tac.changes) {
    if (!text(change?.change_id) || changes.has(change.change_id)) fail('TAC_ACTION_INVALID', 'Every TAC change needs one unique change_id');
    const action = actions.get(change.change_id);
    const targetMatches = action?.action === 'add' ? change.slot_id === action.slot_id && !Object.hasOwn(change, 'module_id') : change.module_id === action?.module_id && !Object.hasOwn(change, 'slot_id');
    if (!action || change.action !== action.action || !targetMatches) fail('TAC_ACTION_INVALID', 'TAC changes must exactly project the validated module/slot actions');
    if (Object.hasOwn(change, 'selector') || Object.hasOwn(change, 'path') || Object.hasOwn(change, 'anchor')) fail('TAC_ACTION_INVALID', 'TAC cannot carry executable selectors, paths or anchors');
    if (change.action === 'preserve') {
      const expected = (contractModules.get(change.module_id)?.invariants ?? []).map(item => item.invariant_id).sort();
      const actual = Array.isArray(change.invariants) ? [...change.invariants].sort() : [];
      if (!expected.length || !isDeepStrictEqual(actual, expected)) fail('TAC_PRESERVE_INVALID', 'Preserve actions must list every registered invariant exactly once');
    }
    if (change.action !== 'preserve' || change.source_projections !== undefined) {
      if (!Array.isArray(change.source_projections) || !change.source_projections.length) fail('TAC_TRACE_INVALID', 'A modifying action, or an explicitly fact-backed preserve action, needs source projections');
      const keys = change.source_projections.map(projection => sourceKey(projection));
      if (new Set(keys).size !== keys.length || keys.some(key => !applicable.has(key))) fail('TAC_TRACE_INVALID', 'Change projections must uniquely reference the bound applicability set');
      traceKeys.set(change.change_id, keys.sort());
    }
    changes.set(change.change_id, change);
  }
  if (changes.size !== actions.size || [...actions.keys()].some(id => !changes.has(id))) fail('TAC_ACTION_INVALID', 'TAC must contain exactly one change for every validated binding action');
  const covered = new Set();
  const dispositions = new Map();
  for (const row of tac.coverage) {
    const key = sourceKey(row ?? {});
    if (!applicable.has(key) || covered.has(key)) fail('TAC_COVERAGE_INVALID', 'Every applicability item needs exactly one non-duplicated coverage row');
    covered.add(key);
    const disposition = row.disposition;
    dispositions.set(key, disposition);
    if (disposition?.kind === 'change') {
      if (packet.scopes.some(scope => scope.source_ids.includes(row.id))) fail('TAC_SCOPE_CONFLICT', 'A frozen non-template or out-of-scope decision cannot be overridden by TAC change coverage');
      if (!changes.has(disposition.change_id) || !traceKeys.get(disposition.change_id)?.includes(key)) fail('TAC_COVERAGE_INVALID', 'Change coverage must point to a change that traces the same source item');
    } else if (disposition?.kind === 'non_template_effect') {
      if (!hashHex(disposition.scope_span_hash)) fail('TAC_COVERAGE_INVALID', 'Non-template effects require a packet scope span hash');
    } else if (disposition?.kind === 'out_of_scope') {
      if (!hashHex(disposition.scope_span_hash) || !text(disposition.confirmation_ref)) fail('TAC_COVERAGE_INVALID', 'Out-of-scope coverage requires a packet span and user confirmation');
    } else fail('TAC_COVERAGE_INVALID', 'Coverage disposition must be change, non_template_effect or out_of_scope');
    if (disposition.kind !== 'change' && !packet.scopes.some(scope => scope.scope_span_hash === disposition.scope_span_hash && scope.kind === disposition.kind && scope.source_ids.includes(row.id) && (scope.kind !== 'out_of_scope' || scope.confirmation_ref === disposition.confirmation_ref))) fail('TAC_SCOPE_INVALID', 'Coverage must cite an actual frozen scope decision for this exact fact and disposition');
  }
  if (covered.size !== applicable.size) fail('TAC_COVERAGE_INVALID', 'Coverage must close the complete applicability set');
  for (const [changeId, keys] of traceKeys) for (const key of keys) {
    const disposition = dispositions.get(key);
    if (disposition?.kind !== 'change' || disposition.change_id !== changeId) fail('TAC_TRACE_COVERAGE_CONFLICT', 'Every modifying source projection must be covered by that exact change, never an exclusion or another action');
  }
  const projectedPairs = [...changes.values()].flatMap(change => (change.source_projections ?? []).map(projection => JSON.stringify([projection.id, change.change_id]))).sort();
  const assessedPairs = binding.match_assessment.judgments.filter(judgment => actions.get(judgment.action_id)?.action !== 'preserve' || changes.get(judgment.action_id)?.source_projections !== undefined).map(judgment => JSON.stringify([judgment.fact_id, judgment.action_id])).sort();
  if (!isDeepStrictEqual(projectedPairs, assessedPairs)) fail('TAC_MATCH_ASSESSMENT_CONFLICT', 'TAC and assessment must contain exactly the same fact/action pairs for modifications and explicitly fact-backed preserves');
  if (tac.output?.entry !== 'output/index.html' || tac.output?.base_must_remain_unchanged !== true) fail('TAC_OUTPUT_INVALID', 'Single carrier TAC must bind output/index.html and immutable base input');
  if (!markdown.equals(Buffer.from(renderTacMarkdown(tac, packetBody)))) fail('TAC_MARKDOWN_MISMATCH', 'Readable TAC must be the deterministic projection of this JSON and actual Packet text');
  return { json, markdown, sha256: hash(json.bytes), markdownSha256: hash(markdown), applicability: [...applicable.values()], changes: [...changes.values()], traceKeys };
}

function referenceDetails(value, binding, sourcePacketSha256) {
  const reference = strictControlJson(value, 'control/page-reference.json');
  if (reference.parsed.page_id !== binding.page_id || reference.parsed.source_hash !== binding.source_hash || reference.parsed.source_packet_sha256 !== sourcePacketSha256) fail('PAGE_REFERENCE_STALE', 'Page reference must bind the same selected carrier page, source and frozen packet');
  return reference;
}

function recordsFor(files) {
  return files.map(item => ({ path: item.path, media_type: item.media_type, bytes: item.bytes.length, sha256: hash(item.bytes) }));
}

function manifestFor({ handoffId, namespace, target, binding, frozen, source, closure, carrierHash, tac, reference, files }) {
  const immutable = recordsFor(files);
  const body = {
    schema_version: 2,
    bundle_kind: 'carrier',
    handoff_id: handoffId,
    namespace,
    target,
    page_id: binding.page_id,
    source_packet_sha256: source.sha256,
    applicability_set_sha256: frozen.applicability_set_sha256,
    module_contract_hash: binding.module_contract_hash,
    carrier_content_hash: carrierHash,
    carrier_profile: 'structural_carrier',
    tac_sha256: tac.sha256,
    tac_markdown_sha256: tac.markdownSha256,
    page_reference_sha256: hash(reference.bytes),
    carrier_output_profile: 'single',
    asset_profile: closure.asset_profile,
    input_root: 'input',
    control_root: 'control',
    output_root: 'output',
    limits: { file_count: immutable.length + 1, total_bytes: immutable.reduce((sum, item) => sum + item.bytes, 0) },
    immutable_files: immutable
  };
  const handoffBundleHash = canonicalManifestHash(body, immutable);
  return { ...body, handoff_bundle_hash: handoffBundleHash };
}

function carrierManifestFile(manifest) {
  const bytes = Buffer.from(canonicalJson(manifest), 'utf8');
  return v2File('control/handoff-manifest.json', 'application/json', bytes);
}

function assertCarrierConfirmation(bundle, fresh) {
  const adoption = bundle?.confirmation;
  if (!adoption || adoption.actor !== 'user' || !text(adoption.evidence) || !Number.isFinite(Date.parse(adoption.confirmed_at)) || adoption.binding_sha256 !== bundle.binding_sha256 || adoption.tac_sha256 !== fresh.manifest.tac_sha256 || adoption.carrier_content_hash !== bundle.carrier_content_hash || adoption.handoff_bundle_hash !== bundle.handoff_bundle_hash || adoption.carrier_profile !== 'structural_carrier' || adoption.output_profile !== 'single') fail('CARRIER_ADOPTION_STALE', 'Carrier confirmation must remain the exact user adoption bound to this TAC, binding, carrier content, profile and bundle hash');
  return adoption;
}

function assertCarrierBundleFresh(bundle) {
  if (bundle?.schema_version !== 2 || bundle?.bundle_kind !== 'carrier' || bundle?.status !== 'EXPORTED' || !carrierId(bundle.handoff_id) || bundle.namespace !== `handoffs/${bundle.handoff_id}` || bundle.carrier_output_profile !== 'single' || bundle.carrier_profile !== 'structural_carrier') fail('CARRIER_BUNDLE_INVALID', 'Expected an exported V2 structural-carrier single-output bundle');
  const immutable = one(bundle.files ?? [], item => item.path !== 'control/handoff-manifest.json');
  const manifestFile = one(bundle.files ?? [], item => item.path === 'control/handoff-manifest.json');
  if (manifestFile.length !== 1 || immutable.length + 1 !== bundle.files.length || bundle.files.some(item => !Buffer.isBuffer(item.bytes) || item.sha256 !== hash(item.bytes))) fail('CARRIER_BUNDLE_CHANGED', 'Carrier immutable file table changed after export');
  const manifest = strictControlJson(manifestFile[0].bytes, 'control/handoff-manifest.json').parsed;
  const records = recordsFor(immutable);
  if (manifest.handoff_bundle_hash !== bundle.handoff_bundle_hash || canonicalManifestHash(manifest, records) !== bundle.handoff_bundle_hash || canonicalJson(manifest) !== manifestFile[0].bytes.toString('utf8') || !isDeepStrictEqual(manifest.immutable_files, records)) fail('CARRIER_BUNDLE_CHANGED', 'Carrier manifest/body/file-record hashes are stale');
  if (!isDeepStrictEqual(manifest.target, bundle.target) || manifest.handoff_id !== bundle.handoff_id || manifest.namespace !== bundle.namespace || manifest.asset_profile !== bundle.asset_profile) fail('CARRIER_BUNDLE_CHANGED', 'Mutable target, namespace or asset profile differs from the immutable manifest');
  const base = one(immutable, item => item.path === 'input/base-template.html');
  if (base.length !== 1 || base[0].sha256 !== bundle.base_template_sha256) fail('CARRIER_BUNDLE_CHANGED', 'Immutable raw base template changed');
  if (!hashHex(bundle.carrier_content_hash) || !hashHex(bundle.source_packet_sha256) || !hashHex(bundle.module_contract_hash) || manifest.carrier_content_hash !== bundle.carrier_content_hash || manifest.source_packet_sha256 !== bundle.source_packet_sha256 || manifest.module_contract_hash !== bundle.module_contract_hash || manifest.carrier_profile !== 'structural_carrier') fail('CARRIER_BUNDLE_CHANGED', 'Carrier identity hashes/profile are incomplete or changed');
  const tac = one(immutable, item => item.path === 'control/template-adaptation.json');
  if (tac.length !== 1) fail('CARRIER_BUNDLE_CHANGED', 'Missing immutable TAC JSON');
  const parsedTac = strictControlJson(tac[0].bytes, 'control/template-adaptation.json').parsed;
  const expectedCarrier = parsedTac.carrier_content_hash ?? parsedTac.template?.carrier_content_hash;
  if (parsedTac.source_packet_sha256 !== bundle.source_packet_sha256 || parsedTac.template?.module_contract_hash !== bundle.module_contract_hash || parsedTac.template?.page_id !== bundle.binding_draft?.binding?.page_id || parsedTac.applicability_set_sha256 !== bundle.binding_draft?.frozen_packet?.applicability_set_sha256 || expectedCarrier !== bundle.carrier_content_hash || manifest.tac_sha256 !== hash(tac[0].bytes)) fail('TAC_STALE', 'TAC no longer binds this frozen packet/applicability/module/carrier');
  const readControl = path => {
    const matches = one(immutable, item => item.path === path);
    if (matches.length !== 1) fail('CARRIER_BUNDLE_CHANGED', `Missing immutable control: ${path}`);
    return strictControlJson(matches[0].bytes, path).parsed;
  };
  const contract = readControl('control/module-contract.json');
  const draft = readControl('control/carrier-binding.json');
  if (pageContext.computeModuleContractHash(contract) !== bundle.module_contract_hash || pageContext.computeBindingHash(draft) !== bundle.binding_sha256 || !isDeepStrictEqual(contract, bundle.carrier_contract) || !isDeepStrictEqual(draft, bundle.binding_draft) || !isDeepStrictEqual(bundle.tac_contract, { applicability: parsedTac.applicability_set, changes: parsedTac.changes })) fail('CARRIER_BUNDLE_CHANGED', 'Mutable carrier/binding/TAC caches must exactly match their hash-bound immutable controls');
  const brief = one(immutable, item => item.path === 'control/brief.md');
  const markdown = one(immutable, item => item.path === 'control/template-adaptation.md');
  if (brief.length !== 1 || markdown.length !== 1 || hash(brief[0].bytes) !== bundle.source_packet_sha256) fail('CARRIER_BUNDLE_CHANGED', 'Missing or stale immutable Packet/Markdown');
  tacDetails(tac[0].bytes, markdown[0].bytes, bundle.source_packet_sha256, bundle.module_contract_hash, bundle.carrier_content_hash, draft.binding, draft.frozen_packet, contract, brief[0].bytes.toString('utf8'));
  const fresh = { manifest, immutable, manifestFile: manifestFile[0], contract, changes: parsedTac.changes, packetBody: brief[0].bytes.toString('utf8') };
  if (Object.hasOwn(bundle, 'confirmation')) assertCarrierConfirmation(bundle, fresh);
  return fresh;
}

/**
 * Create a local, immutable V2 carrier package in memory.  It does not write
 * the package, call OD, or imply a user adoption.  The returned bundle hash is
 * what the user must later confirm through confirmCarrierBundle().
 */
export async function prepareCarrierHandoff({ source, target, handoffId, carrierBinding, baseTemplate, assets = [], assetProfile = 'p0-static-v1', tacJson, tacMarkdown, pageReference, inertStorageReceipt }, { catalog, root, validateCarrierBindingDraft } = {}) {
  if (!carrierId(handoffId)) fail('HANDOFF_ID_INVALID', 'handoffId must be a new ASCII letters/numbers/dash/underscore identifier');
  const packet = v2Source(source); const boundTarget = v2Target(target);
  inspectCarrierPacket(packet.body);
  const draft = await draftValidator({ validateCarrierBindingDraft })(catalog, carrierBinding, { root, packetBody: packet.body });
  const details = bindingDetails(draft);
  if (details.frozen.source_packet_sha256 !== packet.sha256) fail('PACKET_STALE', 'Carrier binding draft must be bound to the exact frozen packet bytes');
  const closure = resolveAssetClosure({ baseTemplate: bytesOf(baseTemplate, 'BASE_TEMPLATE_REQUIRED', 'Raw base-template bytes are required'), assets, profile: assetProfile, inertStorageReceipt });
  parseCarrierDom(closure.base_template.toString('utf8'));
  if (details.binding.source_hash !== closure.raw_template_sha256) fail('CARRIER_SOURCE_STALE', 'Carrier binding source hash must equal the immutable raw base-template bytes');
  const carrierHash = carrierContentHash(closure, details.binding.module_contract_hash);
  if (details.binding.carrier_profile !== 'structural_carrier') fail('CARRIER_PROFILE_UNSUPPORTED', 'P0 transport only supports the explicitly adopted structural_carrier profile');
  const tac = tacDetails(tacJson, tacMarkdown, packet.sha256, details.binding.module_contract_hash, carrierHash, details.binding, details.frozen, details.draft.contract, packet.body);
  const reference = referenceDetails(pageReference, details.binding, packet.sha256);
  const files = [
    v2File('input/base-template.html', 'text/html; charset=utf-8', closure.base_template),
    ...closure.assets.map(asset => v2File(`input/${asset.path}`, asset.media_type, asset.bytes)),
    v2File('control/brief.md', 'text/markdown; charset=utf-8', packet.bytes),
    v2File('control/template-adaptation.json', 'application/json', tac.json.bytes),
    v2File('control/template-adaptation.md', 'text/markdown; charset=utf-8', tac.markdown),
    v2File('control/module-contract.json', 'application/json', Buffer.from(canonicalJson(details.draft.contract))),
    v2File('control/carrier-binding.json', 'application/json', Buffer.from(canonicalJson(details.draft))),
    v2File('control/page-reference.json', 'application/json', reference.bytes)
  ];
  const namespace = `handoffs/${handoffId}`;
  const manifest = manifestFor({ handoffId, namespace, target: boundTarget, binding: details.binding, frozen: details.frozen, source: packet, closure, carrierHash, tac, reference, files });
  files.push(carrierManifestFile(manifest));
  const bundle = {
    schema_version: 2, bundle_kind: 'carrier', status: 'EXPORTED', handoff_id: handoffId, namespace,
    target: boundTarget, carrier_output_profile: 'single', carrier_profile: 'structural_carrier', asset_profile: closure.asset_profile,
    source_packet_sha256: packet.sha256, module_contract_hash: details.binding.module_contract_hash,
    binding_sha256: details.bindingSha256, carrier_content_hash: carrierHash,
    handoff_bundle_hash: manifest.handoff_bundle_hash, base_template_sha256: closure.raw_template_sha256,
    binding_draft: details.draft, carrier_contract: details.draft.contract, tac_contract: { applicability: tac.applicability, changes: tac.changes }, closure, inert_storage_receipt: inertStorageReceipt ?? null,
    manifest, files
  };
  assertCarrierBundleFresh(bundle);
  return bundle;
}

// Confirming a bundle is deliberately separate from preparing it: the exact
// bundle hash does not exist until preparation, and stage authorization cannot
// be inferred from either operation.
export async function confirmCarrierBundle(bundle, carrierBinding, { catalog, root, validateCarrierBinding } = {}) {
  const fresh = assertCarrierBundleFresh(bundle);
  const finalized = await finalValidator({ validateCarrierBinding })(catalog, carrierBinding, { root, packetBody: fresh.packetBody });
  const adoption = finalized?.adoption ?? carrierBinding?.adoption;
  const bindingSha256 = finalized?.binding_sha256 ?? carrierBinding?.binding_sha256;
  if (!adoption || adoption.handoff_bundle_hash !== bundle.handoff_bundle_hash || adoption.carrier_content_hash !== bundle.carrier_content_hash || adoption.tac_sha256 !== fresh.manifest.tac_sha256 || adoption.carrier_profile !== 'structural_carrier' || adoption.output_profile !== 'single' || adoption.binding_sha256 !== bundle.binding_sha256 || bindingSha256 !== bundle.binding_sha256) fail('CARRIER_ADOPTION_STALE', 'User adoption must bind this exact TAC, carrier content, binding, structural carrier profile, single output profile and bundle hash');
  return { ...bundle, confirmation: { actor: adoption.actor, evidence: adoption.evidence, confirmed_at: adoption.confirmed_at, binding_sha256: bundle.binding_sha256, tac_sha256: fresh.manifest.tac_sha256, carrier_content_hash: bundle.carrier_content_hash, handoff_bundle_hash: bundle.handoff_bundle_hash, carrier_profile: 'structural_carrier', output_profile: 'single' } };
}

function capabilityFor(bundle, receipt, operation, runtime) {
  if (!['claude', 'codex'].includes(runtime) || !receipt || receipt.version !== 1 || receipt.kind !== 'od-handoff-capability' || receipt.status !== 'PASS' || receipt.runtime !== runtime || !text(receipt.receipt_ref) || receipt.tool !== 'od' || receipt.project_id !== bundle.target.projectId || receipt.handoff_id !== bundle.handoff_id || receipt.namespace !== bundle.namespace || receipt.handoff_bundle_hash !== bundle.handoff_bundle_hash || receipt.output_profile !== 'single' || !Array.isArray(receipt.operations) || !receipt.operations.includes(operation)) fail('OD_CAPABILITY_RECEIPT_REQUIRED', `A successful capability receipt from the active ${runtime || 'unknown'} runtime, bound to this exact handoff, must cover ${operation}`);
  return { runtime: receipt.runtime, receipt_ref: receipt.receipt_ref };
}

function exactGrant(bundle, grant, operation, code, runtime) {
  const enabled = grant?.[operation] === true;
  if (!enabled || grant.tool !== 'od' || grant.projectId !== bundle.target.projectId || grant.handoff_id !== bundle.handoff_id || grant.namespace !== bundle.namespace || grant.handoff_bundle_hash !== bundle.handoff_bundle_hash || grant.output_profile !== 'single' || !text(grant.messageRef)) fail(code, `${operation} needs its own exact user grant for this project, namespace, hash and output profile`);
  return capabilityFor(bundle, grant.capabilityReceipt, operation, runtime);
}

// Shared transport primitives. Profile owners must validate their immutable
// bundle before calling these; these functions never perform external I/O.
export function authorizeScopedOperation(bundle, grant, operation, { runtime } = {}) {
  if (!['stage', 'run', 'recover'].includes(operation) || !bundle.confirmation) fail('SCOPED_AUTHORIZATION_REQUIRED', 'An adopted bundle and a specific operation are required');
  const capability = exactGrant(bundle, grant, operation, 'SCOPED_AUTHORIZATION_REQUIRED', runtime);
  return { tool: 'od', projectId: bundle.target.projectId, handoff_id: bundle.handoff_id, namespace: bundle.namespace, handoff_bundle_hash: bundle.handoff_bundle_hash, output_profile: 'single', scope: [operation], authorization_ref: grant.messageRef, capability };
}

export function authorizeCarrierStage(bundle, grant, { runtime } = {}) {
  const fresh = assertCarrierBundleFresh(bundle);
  if (!bundle.confirmation) fail('CARRIER_STAGE_NOT_AUTHORIZED', 'Carrier adoption is required before stage authorization');
  assertCarrierConfirmation(bundle, fresh);
  const capability = exactGrant(bundle, grant, 'stage', 'CARRIER_STAGE_NOT_AUTHORIZED', runtime);
  if (bundle.closure.active_content.script_tags || bundle.closure.active_content.event_handlers) validateInertStorageReceipt(bundle.inert_storage_receipt, { templateSha256: bundle.base_template_sha256, handoffId: bundle.handoff_id });
  return { tool: 'od', projectId: bundle.target.projectId, handoff_id: bundle.handoff_id, namespace: bundle.namespace, handoff_bundle_hash: bundle.handoff_bundle_hash, output_profile: 'single', scope: ['stage'], capability };
}

export function authorizeCarrierRun(bundle, staged, grant, { runtime } = {}) {
  const fresh = assertCarrierBundleFresh(bundle);
  assertCarrierConfirmation(bundle, fresh);
  if (staged?.status !== 'STAGED' || staged.handoff_bundle_hash !== bundle.handoff_bundle_hash) fail('CARRIER_RUN_NOT_AUTHORIZED', 'Run authorization requires the exact staged carrier receipt');
  const capability = exactGrant(bundle, grant, 'run', 'CARRIER_RUN_NOT_AUTHORIZED', runtime);
  if (!hashHex(grant.prompt_hash)) fail('CARRIER_RUN_NOT_AUTHORIZED', 'Run authorization must bind the exact prompt hash');
  return { ...staged, status: 'OD_RUN_AUTHORIZED', prompt_hash: grant.prompt_hash, authorization_ref: grant.messageRef, capability };
}

export function authorizeCarrierRecover(bundle, staged, grant, { runtime } = {}) {
  const fresh = assertCarrierBundleFresh(bundle);
  assertCarrierConfirmation(bundle, fresh);
  if (!['USER_GENERATION_REPORTED', 'OD_RUN_AUTHORIZED'].includes(staged?.status) || staged.handoff_bundle_hash !== bundle.handoff_bundle_hash || staged.namespace !== bundle.namespace) fail('CARRIER_RECOVER_NOT_AUTHORIZED', 'Recover authorization requires an exact desktop generation report or headless run authorization, never a plain STAGED receipt');
  const capability = exactGrant(bundle, grant, 'recover', 'CARRIER_RECOVER_NOT_AUTHORIZED', runtime);
  return { tool: 'od', projectId: bundle.target.projectId, handoff_id: bundle.handoff_id, namespace: bundle.namespace, handoff_bundle_hash: bundle.handoff_bundle_hash, output_profile: 'single', scope: ['recover'], authorization_ref: grant.messageRef, capability };
}

function inventory(entries, label) {
  if (!Array.isArray(entries)) fail('INVENTORY_REQUIRED', `${label} must contain a complete project inventory`);
  const records = entries.map(entry => {
    if (!entry || !Buffer.isBuffer(entry.bytes)) fail('INVENTORY_REQUIRED', `${label} entries require actual bytes, not paths or declared hashes`);
    return { path: safeRelativePath(entry.path), bytes: entry.bytes.length, sha256: hash(entry.bytes) };
  }).sort((a, b) => a.path.localeCompare(b.path));
  if (new Set(records.map(item => item.path)).size !== records.length) fail('INVENTORY_REQUIRED', `${label} contains duplicate paths`);
  return records;
}

export function projectInventoryHash(entries) {
  const records = inventory(entries, 'Project inventory');
  return { records, sha256: sha256Bytes(Buffer.from(canonicalJson(records), 'utf8')) };
}

function assertInventoryDelta(before, after, allowedNew, allowedChanged = new Set()) {
  const previous = new Map(before.map(item => [item.path, item]));
  const current = new Map(after.map(item => [item.path, item]));
  for (const path of new Set([...previous.keys(), ...current.keys()])) {
    const was = previous.get(path); const now = current.get(path);
    if (!was && now && !allowedNew.has(path)) fail('PROJECT_INVENTORY_CHANGED', `Unexpected project file appeared: ${path}`);
    if (was && !now) fail('PROJECT_INVENTORY_CHANGED', `Existing project file disappeared: ${path}`);
    if (was && now && (was.sha256 !== now.sha256 || was.bytes !== now.bytes) && !allowedChanged.has(path)) fail('PROJECT_INVENTORY_CHANGED', `Unexpected project file changed: ${path}`);
  }
}

function exactNamespaceFiles(expected, actual, namespace) {
  if (!Array.isArray(actual) || actual.some(item => !item || !Buffer.isBuffer(item.bytes))) fail('READBACK_REQUIRED', 'OD readback must contain actual bytes for every namespace file');
  const actualMap = new Map();
  for (const item of actual) {
    const path = safeRelativePath(item.path);
    if (!path.startsWith(`${namespace}/`)) fail('READBACK_SCOPE', 'Readback must be constrained to the exact handoff namespace');
    if (actualMap.has(path)) fail('READBACK_REQUIRED', 'Readback contains duplicate namespace paths');
    actualMap.set(path, item.bytes);
  }
  const expectedMap = new Map(expected.map(item => [item.path.startsWith(`${namespace}/`) ? item.path : fullPath(namespace, item.path), item.bytes]));
  if (actualMap.size !== expectedMap.size) fail('READBACK_EXTRA_FILE', 'Namespace contains a missing or extra file');
  for (const [path, bytes] of expectedMap) {
    const actualBytes = actualMap.get(path);
    if (!actualBytes) fail('READBACK_MISSING_FILE', `Missing readback bytes: ${path}`);
    if (!actualBytes.equals(bytes)) fail('READBACK_CONTENT_MISMATCH', `OD readback bytes changed: ${path}`);
  }
}

function assertReadbackInventory(files, records) {
  const actual = new Map(records.map(item => [item.path, item]));
  for (const file of files) {
    const record = actual.get(file.path);
    if (!record || record.bytes !== file.bytes.length || record.sha256 !== hash(file.bytes)) fail('READBACK_INVENTORY_MISMATCH', `Namespace bytes must agree with the complete post-inventory: ${file.path}`);
  }
}

export function verifyCarrierReadback(bundle, readback) {
  const fresh = assertCarrierBundleFresh(bundle);
  assertCarrierConfirmation(bundle, fresh);
  return verifyScopedStageReadback(bundle, readback);
}

export function verifyScopedStageReadback(bundle, readback) {
  if (!bundle.confirmation || readback?.tool !== 'od' || readback.projectId !== bundle.target.projectId || readback.namespace !== bundle.namespace || !text(readback.readRef)) fail('READBACK_TARGET_MISMATCH', 'Carrier readback must identify the confirmed OD project, namespace and actual read reference');
  const before = inventory(readback.pre_inventory, 'Pre-stage inventory');
  const after = inventory(readback.post_inventory, 'Post-stage inventory');
  const prefix = `${bundle.namespace}/`;
  if (before.some(item => item.path.startsWith(prefix))) fail('NAMESPACE_NOT_FRESH', 'The handoff namespace existed before stage');
  const expected = bundle.files.map(item => fullPath(bundle.namespace, item.path));
  assertInventoryDelta(before, after, new Set(expected));
  if (after.filter(item => item.path.startsWith(prefix)).length !== expected.length || expected.some(path => !after.find(item => item.path === path))) fail('READBACK_EXTRA_FILE', 'Post-stage namespace does not exactly match immutable inputs');
  exactNamespaceFiles(bundle.files, readback.files, bundle.namespace);
  assertReadbackInventory(readback.files, after);
  return { status: 'STAGED', tool: 'od', projectId: bundle.target.projectId, handoff_id: bundle.handoff_id, namespace: bundle.namespace, handoff_bundle_hash: bundle.handoff_bundle_hash, read_ref: readback.readRef, project_inventory_sha256: sha256Bytes(Buffer.from(canonicalJson(after), 'utf8')), post_inventory: after };
}

export function verifyScopedOutputReadback(bundle, staged, readback, outputPaths) {
  if (readback?.tool !== 'od' || readback.projectId !== bundle.target.projectId || readback.namespace !== bundle.namespace || !text(readback.readRef) || !Array.isArray(readback.files)) fail('READBACK_TARGET_MISMATCH', 'Exact scoped output bytes required');
  const allowed = new Set(outputPaths.map(path => fullPath(bundle.namespace, safeRelativePath(path))));
  if (allowed.size !== outputPaths.length) fail('OUTPUT_EXTRA_FILE', 'Duplicate output paths');
  const outputs = readback.files.filter(file => allowed.has(file.path));
  if (outputs.length !== allowed.size) fail('OUTPUT_REQUIRED', 'Every declared output must be present');
  exactNamespaceFiles([...bundle.files.map(file => ({ path: fullPath(bundle.namespace, file.path), bytes: file.bytes })), ...outputs], readback.files, bundle.namespace);
  const after = inventory(readback.post_inventory, 'Post-generation inventory');
  assertInventoryDelta(staged.post_inventory, after, allowed);
  assertReadbackInventory(readback.files, after);
  return outputs;
}

export function reportCarrierGeneration(staged, report) {
  if (staged?.status !== 'STAGED' || !text(report?.messageRef)) fail('GENERATION_REPORT_REQUIRED', 'Only a staged bundle can receive a user generation report');
  return { ...staged, status: 'USER_GENERATION_REPORTED', user_generation: { message_ref: report.messageRef } };
}

function validateCarrierMechanicalEvidence(bundle, outputBytes, evidence, { contract, changes }) {
  if (!contract || !Array.isArray(changes) || !evidence || !Array.isArray(evidence.module_traces) || !Array.isArray(evidence.preserve_invariants)) fail('MECHANICAL_EVIDENCE_REQUIRED', 'Recovery requires caller-verified module traces and preserve invariant evidence');
  const html = parseCarrierDom(outputBytes.toString('utf8'));
  const baseHtml = parseCarrierDom(one(bundle.files, item => item.path === 'input/base-template.html')[0].bytes.toString('utf8'));
  const anchorCount = (tree, anchor) => anchoredNodes(tree, anchor).length;
  const canonicalAnchoredDom = (tree, anchor) => canonicalJson(structuralDom(anchoredNodes(tree, anchor)[0]));
  const beforeMasks = new Map(); const afterMasks = new Map();
  const modules = new Map(contract.modules.map(module => [module.module_id, module]));
  const slots = new Map(contract.slots.map(slot => [slot.slot_id, slot]));
  for (const module of contract.modules.filter(item => item.required)) if (anchorCount(html, module.anchor) !== 1) fail('MODULE_ANCHOR_INVALID', `Required module anchor is not unique after generation: ${module.module_id}`);
  const expectedTraces = [];
  const expectedInvariants = [];
  for (const change of changes) {
    if (change.action === 'preserve') {
      const module = modules.get(change.module_id);
      if (!module || anchorCount(html, module.anchor) !== 1) fail('PRESERVE_INVARIANT_FAILED', `Preserved module anchor changed: ${change.module_id}`);
      if (canonicalAnchoredDom(html, module.anchor) !== canonicalAnchoredDom(baseHtml, module.anchor)) fail('PRESERVE_DOM_CHANGED', `Preserved module canonical DOM changed: ${change.module_id}`);
      for (const invariantId of change.invariants) {
        const invariant = module.invariants.find(item => item.invariant_id === invariantId);
        if (!invariant || anchorCount(html, invariant.anchor) !== 1) fail('PRESERVE_INVARIANT_FAILED', `Preserved invariant changed: ${change.module_id}/${invariantId}`);
        expectedInvariants.push(`${change.module_id}:${invariantId}`);
      }
      continue;
    }
    const target = change.action === 'add' ? slots.get(change.slot_id) : modules.get(change.module_id);
    const count = anchorCount(html, target?.anchor);
    if ((change.action === 'remove' && count !== 0) || (change.action !== 'remove' && count !== 1)) fail('MODULE_ACTION_FAILED', `Generated output does not mechanically satisfy ${change.change_id}/${change.action}`);
    const before = anchoredNodes(baseHtml, target.anchor);
    const after = anchoredNodes(html, target.anchor);
    if (before.length !== 1) fail('MODULE_ACTION_FAILED', `Base target must be a unique real node: ${change.change_id}`);
    const original = structuralDom(before[0]);
    if (change.action === 'remove') {
      beforeMasks.set(before[0], null);
    } else {
      const generated = structuralDom(after[0]);
      if (isDeepStrictEqual(original, generated)) fail('MODULE_ACTION_NO_CHANGE', `Action must change actual target structure/content, not comments, whitespace or visual styling: ${change.change_id}`);
      if (change.action === 'add') {
        // Addition is insertion inside the slot: its container and every old
        // child stay unchanged and ordered. Replacing placeholder content is
        // a modify action, not authority implicitly granted by add.
        let cursor = 0;
        for (const child of generated.children) if (isDeepStrictEqual(child, original.children[cursor])) cursor++;
        if (original.tag !== generated.tag || !isDeepStrictEqual(original.attrs, generated.attrs) || cursor !== original.children.length || generated.children.length <= original.children.length) fail('ADD_SLOT_VIOLATION', `Add must insert inside its exact slot without changing existing content: ${change.change_id}`);
      }
      const marker = { authorized_change: change.change_id };
      beforeMasks.set(before[0], marker); afterMasks.set(after[0], marker);
    }
    expectedTraces.push({ change_id: change.change_id, source_keys: change.source_projections.map(sourceKey).sort() });
  }
  if (!isDeepStrictEqual(structuralDom(baseHtml, beforeMasks), structuralDom(html, afterMasks))) fail('UNAUTHORIZED_STRUCTURE_CHANGE', 'Business DOM outside the exact authorized targets changed or a target moved; visual-only CSS/class/head changes are separate');
  const actualTraces = evidence.module_traces.map(item => ({ change_id: item?.change_id, source_keys: Array.isArray(item?.source_keys) ? [...item.source_keys].sort() : [], status: item?.status })).sort((a, b) => String(a.change_id).localeCompare(String(b.change_id)));
  const normalizedExpected = expectedTraces.map(item => ({ ...item, status: 'PASS' })).sort((a, b) => a.change_id.localeCompare(b.change_id));
  if (!isDeepStrictEqual(actualTraces, normalizedExpected)) fail('MODULE_TRACE_INCOMPLETE', 'Every add/modify/remove action must have an exact PASS trace to its TAC source projections');
  const actualInvariants = evidence.preserve_invariants.map(item => `${item?.module_id}:${item?.invariant_id}:${item?.status}`).sort();
  const normalizedInvariants = expectedInvariants.map(key => `${key}:PASS`).sort();
  if (!isDeepStrictEqual(actualInvariants, normalizedInvariants)) fail('PRESERVE_INVARIANT_FAILED', 'Every declared preserve invariant must have one exact PASS result');
  return { module_traces: actualTraces, preserve_invariants: actualInvariants };
}

function outputFilesFromReadback(bundle, namespaceFiles) {
  const prefix = `${bundle.namespace}/output/`;
  const output = namespaceFiles.filter(item => item.path.startsWith(prefix));
  const index = output.filter(item => item.path === `${prefix}index.html`);
  if (index.length !== 1) fail('OUTPUT_REQUIRED', 'Single profile requires exactly output/index.html');
  const assets = output.filter(item => item.path.startsWith(`${prefix}assets/`)).map(item => ({ path: item.path.slice(prefix.length), bytes: item.bytes }));
  const implementation = output.filter(item => item.path === `${prefix}implementation-manifest.json`);
  if (implementation.length > 1) fail('OUTPUT_EXTRA_FILE', 'Only one untrusted implementation manifest is allowed');
  const closure = resolveAssetClosure({ baseTemplate: index[0].bytes, assets, profile: bundle.asset_profile, inertStorageReceipt: bundle.inert_storage_receipt });
  const allowed = new Set([`${prefix}index.html`, ...closure.assets.map(asset => `${prefix}${asset.path}`), ...(implementation.length ? [`${prefix}implementation-manifest.json`] : [])]);
  if (output.some(item => !allowed.has(item.path))) fail('OUTPUT_EXTRA_FILE', 'Single output contains unreferenced or unauthorized files');
  return { index: index[0], closure, allowed };
}

export function observeCarrierOutput(bundle, staged, readback, authorization) {
  const fresh = assertCarrierBundleFresh(bundle);
  assertCarrierConfirmation(bundle, fresh);
  if (!['USER_GENERATION_REPORTED', 'OD_RUN_AUTHORIZED'].includes(staged?.status) || staged.projectId !== bundle.target.projectId || staged.namespace !== bundle.namespace || staged.handoff_bundle_hash !== bundle.handoff_bundle_hash) fail('RECOVERY_PRECONDITION', 'Recovery requires an exact desktop generation report or headless run authorization');
  if (authorization?.scope?.length !== 1 || authorization.scope[0] !== 'recover' || authorization.projectId !== bundle.target.projectId || authorization.handoff_id !== bundle.handoff_id || authorization.namespace !== bundle.namespace || authorization.handoff_bundle_hash !== bundle.handoff_bundle_hash) fail('CARRIER_RECOVER_NOT_AUTHORIZED', 'Output readback requires its independent recover authorization first');
  if (readback?.tool !== 'od' || readback.projectId !== bundle.target.projectId || readback.namespace !== bundle.namespace || !text(readback.readRef)) fail('READBACK_TARGET_MISMATCH', 'Output readback must identify the exact OD project and namespace');
  const namespaceFiles = readback.files;
  if (!Array.isArray(namespaceFiles)) fail('READBACK_REQUIRED', 'Output recovery requires namespace bytes');
  const immutable = bundle.files.map(item => ({ path: fullPath(bundle.namespace, item.path), bytes: item.bytes }));
  const allExpected = [...immutable, ...namespaceFiles.filter(item => item.path.startsWith(`${bundle.namespace}/output/`))];
  exactNamespaceFiles(allExpected, namespaceFiles, bundle.namespace);
  const output = outputFilesFromReadback(bundle, namespaceFiles);
  if (output.index.bytes.equals(one(bundle.files, item => item.path === 'input/base-template.html')[0].bytes)) fail('OUTPUT_BASE_MASQUERADE', 'base-template.html copied or renamed as output is not a derivative');
  const mechanicalEvidence = validateCarrierMechanicalEvidence(bundle, output.index.bytes, readback.mechanical_verification, fresh);
  const after = inventory(readback.post_inventory, 'Post-generation inventory');
  const allowedNew = output.allowed;
  assertInventoryDelta(staged.post_inventory, after, allowedNew);
  assertReadbackInventory(namespaceFiles, after);
  const run = readback.run && text(readback.run.run_id) && readback.run.handoff_id === bundle.handoff_id && hashHex(readback.run.prompt_hash) && readback.run.status === 'succeeded' ? { run_id: readback.run.run_id, prompt_hash: readback.run.prompt_hash, handoff_id: bundle.handoff_id, status: 'succeeded' } : null;
  if (staged.status === 'OD_RUN_AUTHORIZED' && (!run || run.prompt_hash !== staged.prompt_hash)) fail('RUN_RECEIPT_MISMATCH', 'Observed headless run must have succeeded and bind its independent authorization prompt hash');
  if (staged.status === 'USER_GENERATION_REPORTED' && readback.run !== undefined) fail('RUN_RECEIPT_MISMATCH', 'Desktop observation cannot mix in unbound headless run evidence');
  return { status: 'GENERATED_OBSERVED', tool: 'od', projectId: bundle.target.projectId, handoff_id: bundle.handoff_id, namespace: bundle.namespace, handoff_bundle_hash: bundle.handoff_bundle_hash, read_ref: readback.readRef, provenance: run ? 'od_run_observed' : 'output_observed_only', run, mechanical_evidence: mechanicalEvidence, output: { entry: 'output/index.html', sha256: hash(output.index.bytes), bytes: output.index.bytes.length, assets: output.closure.assets.map(asset => ({ path: `output/${asset.path}`, sha256: hash(asset.bytes), bytes: asset.bytes.length })) }, project_inventory_sha256: sha256Bytes(Buffer.from(canonicalJson(after), 'utf8')), post_inventory: after };
}

// This returns a local receipt object only.  Writing it outside OD is a later
// caller-owned effect; the receipt intentionally separates mechanical evidence
// from the still-required semantic acceptance review.
export function recoverCarrierOutput(bundle, observed, authorization) {
  const fresh = assertCarrierBundleFresh(bundle);
  assertCarrierConfirmation(bundle, fresh);
  if (observed?.status !== 'GENERATED_OBSERVED' || observed.projectId !== bundle.target.projectId || observed.handoff_id !== bundle.handoff_id || observed.handoff_bundle_hash !== bundle.handoff_bundle_hash || !observed.mechanical_evidence) fail('RECOVERY_PRECONDITION', 'Only an exact mechanically verified carrier output can be recovered');
  if (authorization?.scope?.length !== 1 || authorization.scope[0] !== 'recover' || authorization.projectId !== bundle.target.projectId || authorization.handoff_id !== bundle.handoff_id || authorization.namespace !== bundle.namespace || authorization.handoff_bundle_hash !== bundle.handoff_bundle_hash) fail('CARRIER_RECOVER_NOT_AUTHORIZED', 'Recover requires its independent exact authorization receipt');
  return { schema_version: 1, status: 'RECOVERED', bundle_kind: 'carrier', derivation: 'observed-template-derivative', carrier_profile: 'structural_carrier', handoff_id: bundle.handoff_id, namespace: bundle.namespace, project_id: bundle.target.projectId, source_packet_sha256: bundle.source_packet_sha256, module_contract_hash: bundle.module_contract_hash, carrier_content_hash: bundle.carrier_content_hash, handoff_bundle_hash: bundle.handoff_bundle_hash, provenance: observed.provenance, run: observed.run, output: observed.output, module_traces: observed.mechanical_evidence.module_traces, preserve_invariants: observed.mechanical_evidence.preserve_invariants, mechanical_validation: 'PASS', semantic_acceptance: 'PENDING_INDEPENDENT_REVIEW' };
}

function referenceManifestFile(manifest) {
  return v2File('control/handoff-manifest.json', 'application/json', Buffer.from(canonicalJson(manifest), 'utf8'));
}

function assertReferenceBundleFresh(bundle) {
  if (bundle?.schema_version !== 2 || bundle?.bundle_kind !== 'reference_only' || bundle?.status !== 'EXPORTED' || !carrierId(bundle.handoff_id) || bundle.namespace !== `handoffs/${bundle.handoff_id}` || bundle.reference_output_profile !== 'single') fail('REFERENCE_BUNDLE_INVALID', 'Expected an exported V2 reference-only bundle');
  if ('carrier_content_hash' in bundle || 'module_contract_hash' in bundle || 'tac_sha256' in bundle || 'carrier_profile' in bundle) fail('REFERENCE_SEMANTIC_LEAK', 'Reference-only bundles cannot contain carrier, TAC or template-derivation identity');
  const manifestFile = one(bundle.files ?? [], item => item.path === 'control/handoff-manifest.json');
  const immutable = one(bundle.files ?? [], item => item.path !== 'control/handoff-manifest.json');
  if (manifestFile.length !== 1 || immutable.length + 1 !== bundle.files.length || bundle.files.some(item => !Buffer.isBuffer(item.bytes) || item.sha256 !== hash(item.bytes))) fail('REFERENCE_BUNDLE_CHANGED', 'Reference-only immutable file table changed');
  const manifest = strictControlJson(manifestFile[0].bytes, 'control/handoff-manifest.json').parsed;
  const records = recordsFor(immutable);
  if (manifest.bundle_kind !== 'reference_only' || manifest.handoff_bundle_hash !== bundle.handoff_bundle_hash || canonicalManifestHash(manifest, records) !== bundle.handoff_bundle_hash || !isDeepStrictEqual(manifest.immutable_files, records) || ['carrier_content_hash', 'module_contract_hash', 'tac_sha256', 'carrier_profile'].some(key => key in manifest)) fail('REFERENCE_BUNDLE_CHANGED', 'Reference-only manifest/hash changed or leaked carrier semantics');
  return { manifest, immutable };
}

export async function buildReferenceOnlyHandoff({ handoffId, ...args }, options) {
  if (!carrierId(handoffId)) fail('HANDOFF_ID_INVALID', 'reference_only requires a new safe handoffId');
  const legacy = await buildDesignHandoff(args, options);
  const namespace = `handoffs/${handoffId}`;
  const files = legacy.files.map(item => v2File(item.name === 'reference.png' ? 'control/reference.png' : `control/${item.name}`, item.mediaType, item.bytes));
  const records = recordsFor(files);
  const manifestBody = {
    schema_version: 2, bundle_kind: 'reference_only', handoff_id: handoffId, namespace, target: legacy.target,
    source_packet_sha256: legacy.source.sha256, reference_output_profile: 'single', control_root: 'control', output_root: 'output',
    limits: { file_count: records.length + 1, total_bytes: records.reduce((sum, item) => sum + item.bytes, 0) }, immutable_files: records
  };
  const manifest = { ...manifestBody, handoff_bundle_hash: canonicalManifestHash(manifestBody, records) };
  files.push(referenceManifestFile(manifest));
  const bundle = { schema_version: 2, bundle_kind: 'reference_only', status: 'EXPORTED', derivation: 'not-template-derived', handoff_id: handoffId, namespace, target: legacy.target, source_packet_sha256: legacy.source.sha256, reference_output_profile: 'single', handoff_bundle_hash: manifest.handoff_bundle_hash, manifest, files };
  assertReferenceBundleFresh(bundle);
  return bundle;
}

export function authorizeReferenceStage(bundle, grant, { runtime } = {}) {
  assertReferenceBundleFresh(bundle);
  const capability = exactGrant(bundle, grant, 'stage', 'REFERENCE_STAGE_NOT_AUTHORIZED', runtime);
  return { tool: 'od', projectId: bundle.target.projectId, handoff_id: bundle.handoff_id, namespace: bundle.namespace, handoff_bundle_hash: bundle.handoff_bundle_hash, output_profile: 'single', scope: ['stage'], capability };
}

export function verifyReferenceReadback(bundle, readback) {
  assertReferenceBundleFresh(bundle);
  if (readback?.tool !== 'od' || readback.projectId !== bundle.target.projectId || readback.namespace !== bundle.namespace || !text(readback.readRef)) fail('READBACK_TARGET_MISMATCH', 'Reference readback must identify the exact project and namespace');
  const before = inventory(readback.pre_inventory, 'Pre-stage inventory');
  const after = inventory(readback.post_inventory, 'Post-stage inventory');
  if (before.some(item => item.path.startsWith(`${bundle.namespace}/`))) fail('NAMESPACE_NOT_FRESH', 'Reference handoff namespace existed before stage');
  const expected = bundle.files.map(item => fullPath(bundle.namespace, item.path));
  assertInventoryDelta(before, after, new Set(expected));
  exactNamespaceFiles(bundle.files, readback.files, bundle.namespace);
  return { status: 'STAGED', bundle_kind: 'reference_only', tool: 'od', projectId: bundle.target.projectId, handoff_id: bundle.handoff_id, namespace: bundle.namespace, handoff_bundle_hash: bundle.handoff_bundle_hash, read_ref: readback.readRef, post_inventory: after };
}

export function observeReferenceOutput(bundle, staged, readback, authorization) {
  assertReferenceBundleFresh(bundle);
  if (staged?.status !== 'STAGED' || staged.handoff_bundle_hash !== bundle.handoff_bundle_hash || readback?.projectId !== bundle.target.projectId || readback.namespace !== bundle.namespace || !text(readback.readRef)) fail('RECOVERY_PRECONDITION', 'Reference recovery requires its exact staged namespace');
  if (authorization?.scope?.length !== 1 || authorization.scope[0] !== 'recover' || authorization.projectId !== bundle.target.projectId || authorization.handoff_id !== bundle.handoff_id || authorization.namespace !== bundle.namespace || authorization.handoff_bundle_hash !== bundle.handoff_bundle_hash) fail('REFERENCE_RECOVER_NOT_AUTHORIZED', 'Reference output readback requires its independent recover authorization first');
  const immutable = bundle.files.map(item => ({ path: fullPath(bundle.namespace, item.path), bytes: item.bytes }));
  const output = readback.files?.filter(item => item.path.startsWith(`${bundle.namespace}/output/`)) ?? [];
  const index = output.filter(item => item.path === `${bundle.namespace}/output/index.html`);
  if (index.length !== 1 || output.some(item => item.path !== index[0].path)) fail('OUTPUT_EXTRA_FILE', 'Reference single profile permits only output/index.html');
  exactNamespaceFiles([...immutable, index[0]], readback.files, bundle.namespace);
  const after = inventory(readback.post_inventory, 'Post-generation inventory');
  assertInventoryDelta(staged.post_inventory, after, new Set([index[0].path]));
  return { status: 'GENERATED_OBSERVED', bundle_kind: 'reference_only', projectId: bundle.target.projectId, handoff_id: bundle.handoff_id, namespace: bundle.namespace, handoff_bundle_hash: bundle.handoff_bundle_hash, read_ref: readback.readRef, output: { entry: 'output/index.html', sha256: hash(index[0].bytes), bytes: index[0].bytes.length } };
}

export function authorizeReferenceRecover(bundle, staged, grant, { runtime } = {}) {
  assertReferenceBundleFresh(bundle);
  if (staged?.status !== 'STAGED' || staged.handoff_bundle_hash !== bundle.handoff_bundle_hash || staged.namespace !== bundle.namespace) fail('REFERENCE_RECOVER_NOT_AUTHORIZED', 'Reference recover authorization requires its exact staged receipt before output readback');
  const capability = exactGrant(bundle, grant, 'recover', 'REFERENCE_RECOVER_NOT_AUTHORIZED', runtime);
  return { tool: 'od', projectId: bundle.target.projectId, handoff_id: bundle.handoff_id, namespace: bundle.namespace, handoff_bundle_hash: bundle.handoff_bundle_hash, output_profile: 'single', scope: ['recover'], capability };
}

export function recoverReferenceOutput(bundle, observed, authorization) {
  assertReferenceBundleFresh(bundle);
  if (observed?.bundle_kind !== 'reference_only' || observed.handoff_bundle_hash !== bundle.handoff_bundle_hash || authorization?.scope?.length !== 1 || authorization.scope[0] !== 'recover' || authorization.handoff_bundle_hash !== bundle.handoff_bundle_hash) fail('REFERENCE_RECOVER_NOT_AUTHORIZED', 'Reference recover requires an independent exact authorization');
  return { schema_version: 1, status: 'RECOVERED', bundle_kind: 'reference_only', derivation: 'not-template-derived', handoff_id: bundle.handoff_id, namespace: bundle.namespace, project_id: bundle.target.projectId, source_packet_sha256: bundle.source_packet_sha256, handoff_bundle_hash: bundle.handoff_bundle_hash, output: observed.output, semantic_acceptance: 'PENDING_INDEPENDENT_REVIEW' };
}
