import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { crc32, inflateSync } from 'node:zlib';
import { validateSelection } from './page-context.mjs';

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
