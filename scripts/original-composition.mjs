import { parse as parseJavaScript } from 'acorn';
import { parse as parseHtml } from 'parse5';
import { sha256Bytes, fileRecord } from './carrier-asset-profile.mjs';

export const COMPOSITION_PROFILE = 'original-composition-v1';
const fail = (message) => { throw Object.assign(new Error(message), { code: 'ORIGINAL_BEHAVIOR_INVALID' }); };
const token = value => typeof value === 'string' && /^[A-Za-z][\w.-]{0,79}$/.test(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const uniqueStrings = value => Array.isArray(value) && value.length > 0 && value.length <= 64
  && value.every(nonempty) && new Set(value).size === value.length;

// These checks establish a closed transport format, not code safety, consent or
// a runtime sandbox. The caller reviews exact code before freezing this input.
export function prepareBehaviorBindings(bindings, { actions, factIds } = {}) {
  if (!Array.isArray(bindings) || !bindings.length || bindings.length > 8) fail('Composition needs one to eight explicit behavior bindings');
  const ids = new Set();
  const files = [], records = [];
  let total = 0;
  for (const binding of bindings) {
    const keys = ['id', 'source_ids', 'source_ref', 'mount_action_id', 'acceptance_ids', 'bytes'];
    if (!binding || Object.keys(binding).length !== keys.length || !keys.every(k => Object.hasOwn(binding, k))
      || !token(binding.id) || ids.has(binding.id) || !nonempty(binding.source_ref)
      || !token(binding.mount_action_id) || !uniqueStrings(binding.source_ids) || !uniqueStrings(binding.acceptance_ids)
      || !Buffer.isBuffer(binding.bytes) || !binding.bytes.length || binding.bytes.length > 512 * 1024) fail('Closed, unique, source-bound behavior bytes and acceptance IDs required');
    ids.add(binding.id); total += binding.bytes.length;
    if (total > 1024 * 1024) fail('Behavior closure exceeds 1 MiB');
    if (actions && !actions.some(a => a.action_id === binding.mount_action_id && ['add', 'modify', 'preserve'].includes(a.action))) fail('Behavior mount must bind a declared original action');
    if (factIds && binding.source_ids.some(id => !factIds.includes(id))) fail('Behavior cites an unknown frozen source ID');
    const code = binding.bytes.toString('utf8');
    if (!Buffer.from(code).equals(binding.bytes) || /\0|<\/script\b|<!--|-->/i.test(code)) fail('Classic script bytes must be UTF-8 without HTML parser control sequences');
    let tree;
    try { tree = parseJavaScript(code, { ecmaVersion: 'latest', sourceType: 'script' }); }
    catch { fail('Self-contained classic JavaScript required'); }
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'ImportExpression') fail('External module closures are unsupported');
      for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
    };
    visit(tree);
    const path = `input/behavior/${binding.id}.js`;
    const { bytes, ...mapping } = binding;
    records.push({ ...mapping, path, sha256: sha256Bytes(bytes), byte_length: bytes.length });
    files.push({ ...fileRecord(path, 'text/javascript; charset=utf-8', bytes), bytes: Buffer.from(bytes) });
  }
  return { records, files };
}

export function restoreBehaviorBindings(records, files, options) {
  if (!Array.isArray(records)) fail('Frozen behavior records required');
  const bindings = records.map(record => {
    if (!record || Object.keys(record).sort().join(',') !== 'acceptance_ids,byte_length,id,mount_action_id,path,sha256,source_ids,source_ref') fail('Frozen behavior record schema changed');
    const file = files.find(file => file.path === record.path);
    if (!file || !Buffer.isBuffer(file.bytes) || record.path !== `input/behavior/${record.id}.js`
      || file.bytes.length !== record.byte_length || sha256Bytes(file.bytes) !== record.sha256) fail('Frozen behavior file missing or changed');
    const { path, sha256, byte_length, ...mapping } = record;
    return { ...mapping, bytes: file.bytes };
  });
  prepareBehaviorBindings(bindings, options);
  return bindings;
}

function bodyEnd(html) {
  const doc = parseHtml(html, { sourceCodeLocationInfo: true });
  const body = doc.childNodes.find(node => node.tagName === 'html')?.childNodes.find(node => node.tagName === 'body');
  const offset = body?.sourceCodeLocation?.endTag?.startOffset;
  if (!Number.isInteger(offset)) fail('Composition requires an explicit original body end tag');
  return offset;
}
function extension(bindings) {
  prepareBehaviorBindings(bindings);
  return bindings.map(binding => `\n<script data-luca-behavior="${binding.id}">${binding.bytes.toString('utf8')}</script>`).join('') + '\n';
}

export function appendBoundBehavior(output, bindings) {
  const html = output.toString('utf8'), at = bodyEnd(html);
  return Buffer.from(html.slice(0, at) + extension(bindings) + html.slice(at));
}

export function removeBoundBehavior(output, bindings) {
  const html = output.toString('utf8'), at = bodyEnd(html), suffix = extension(bindings);
  if (html.slice(at - suffix.length, at) !== suffix) fail('Output must embed every exact frozen behavior once, in order, at the body-end seam');
  return Buffer.from(html.slice(0, at - suffix.length) + html.slice(at));
}
