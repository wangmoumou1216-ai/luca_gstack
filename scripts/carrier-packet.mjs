import { canonicalJson, sha256Bytes } from './carrier-asset-profile.mjs';

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const digest = value => sha256Bytes(Buffer.from(value, 'utf8'));
const prefix = '# Design Generation Packet\n\n```json\n';
const suffix = '\n```\n';
const kinds = ['requirement', 'decision', 'state', 'acceptance', 'constraint'];
function keys(value, required, optional = []) {
  return value && !Array.isArray(value) && typeof value === 'object' && required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => [...required, ...optional].includes(key));
}

// A closed, versioned envelope is intentional: prose outside this index could
// hide an uncounted requirement. Completeness against upstream intent remains
// a human freeze gate, not something an HTML/hash validator can establish.
export function createCarrierPacket(document) {
  const body = `${prefix}${canonicalJson(document)}${suffix}`;
  inspectCarrierPacket(body);
  return body;
}

export function inspectCarrierPacket(body) {
  if (typeof body !== 'string' || !body.startsWith(prefix) || !body.endsWith(suffix)) fail('PACKET_REFREEZE_REQUIRED', 'Carrier requires the versioned structured Packet envelope; refreeze legacy prose or explicitly choose reference_only');
  let document;
  try { document = JSON.parse(body.slice(prefix.length, -suffix.length)); } catch { fail('PACKET_INVALID', 'Packet must contain canonical structured JSON'); }
  if (`${prefix}${canonicalJson(document)}${suffix}` !== body || !keys(document, ['schema_version', 'packet_kind', 'items', 'scopes']) || document.schema_version !== 1 || document.packet_kind !== 'design-generation' || !Array.isArray(document.items) || !document.items.length || !Array.isArray(document.scopes)) fail('PACKET_INVALID', 'Packet v1 is a closed canonical items/scopes document');
  const ids = new Set();
  for (const item of document.items) {
    if (!keys(item, ['source_kind', 'id', 'text']) || !kinds.includes(item.source_kind) || !nonempty(item.id) || !nonempty(item.text) || ids.has(item.id)) fail('PACKET_INVALID', 'Every Packet fact needs a globally unique stable ID, supported kind and original nonempty text');
    ids.add(item.id);
  }
  const scopeIds = new Set();
  const scopedFactIds = new Set();
  for (const scope of document.scopes) {
    if (!keys(scope, ['scope_id', 'kind', 'text', 'source_ids'], ['confirmation_ref']) || !nonempty(scope.scope_id) || scopeIds.has(scope.scope_id) || !['non_template_effect', 'out_of_scope'].includes(scope.kind) || !nonempty(scope.text) || !Array.isArray(scope.source_ids) || !scope.source_ids.length || new Set(scope.source_ids).size !== scope.source_ids.length || scope.source_ids.some(id => !ids.has(id)) || (scope.kind === 'out_of_scope' && !nonempty(scope.confirmation_ref)) || (scope.confirmation_ref !== undefined && !nonempty(scope.confirmation_ref))) fail('PACKET_INVALID', 'Scope dispositions must reference real facts and an explicit original reason; exclusions also require user confirmation');
    scopeIds.add(scope.scope_id);
    for (const id of scope.source_ids) {
      if (scopedFactIds.has(id)) fail('PACKET_SCOPE_CONFLICT', 'Each frozen fact may have only one unambiguous scope decision; resolve competing scopes before freezing');
      scopedFactIds.add(id);
    }
  }
  const applicability = document.items.map(item => ({ source_kind: item.source_kind, id: item.id, packet_span_hash: digest(item.text) }));
  return { document, facts: document.items, applicability, source_packet_sha256: digest(body), applicability_set_sha256: digest(canonicalJson(applicability)), scopes: document.scopes.map(scope => ({ ...scope, scope_span_hash: digest(canonicalJson(scope)) })) };
}

// Rendering only: TAC validation remains in the handoff owner. JSON quoting
// prevents source Markdown from being interpreted as a new control section.
export function renderTacMarkdown(tac, packetBody) {
  const packet = inspectCarrierPacket(packetBody);
  return '# Template Adaptation Contract\n\n## Frozen Packet facts\n\n' + packet.facts.map(item => `- ${JSON.stringify(item.id)} (${item.source_kind}): ${JSON.stringify(item.text)}`).join('\n') + '\n\n## Frozen scope decisions\n\n' + packet.scopes.map(scope => `- ${JSON.stringify(scope)}`).join('\n') + '\n\n## Machine contract (exact canonical projection)\n\n```json\n' + canonicalJson(tac) + '\n```\n';
}
