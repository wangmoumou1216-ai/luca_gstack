import fs from 'node:fs';
import { parse } from 'parse5';
import { canonicalJson, sha256Bytes } from './carrier-asset-profile.mjs';
import { prepareBehaviorBindings } from './original-composition.mjs';
const fail = code => { throw Object.assign(new Error(code), { code }); };
export function readExact(ref) {
  if (!ref || typeof ref.path !== 'string' || !ref.path.startsWith('/') || fs.realpathSync(ref.path) !== ref.path) fail('CD_NONCANONICAL_PATH');
  let p = ''; for (const part of ref.path.split('/').filter(Boolean)) { p += '/' + part; if (fs.lstatSync(p).isSymbolicLink()) fail('CD_SYMLINK'); }
  const stat = fs.statSync(ref.path); if (!stat.isFile() || stat.size > 50 * 1024 * 1024) fail('CD_SOURCE_LIMIT');
  const bytes = fs.readFileSync(ref.path);
  if (sha256Bytes(bytes) !== ref.sha256) fail('CD_SOURCE_DRIFT');
  return bytes;
}
export function extractPrototypeBehavior({ prototype, scriptId, binding }) {
  const bytes = readExact(prototype), html = bytes.toString('utf8');
  if (!Buffer.from(html).equals(bytes)) fail('CD_PROTOTYPE_ENCODING');
  const nodes = []; const walk = n => { if (n.tagName === 'script' && n.attrs?.some(a => a.name === 'id' && a.value === scriptId)) nodes.push(n); (n.childNodes || []).forEach(walk); }; walk(parse(html, { sourceCodeLocationInfo: true }));
  if (nodes.length !== 1 || nodes[0].attrs.some(a => a.name === 'src' || (a.name === 'type' && a.value === 'module'))) fail('CD_BEHAVIOR_SOURCE_AMBIGUOUS');
  const loc = nodes[0].sourceCodeLocation;
  const code = Buffer.from(html.slice(loc.startTag.endOffset, loc.endTag.startOffset));
  const prepared = { ...binding, source_ref: `${prototype.path}#${scriptId}@${prototype.sha256}`, bytes: code };
  prepareBehaviorBindings([prepared]);
  return prepared;
}
export function behaviorIdentity(bindings) { return sha256Bytes(Buffer.from(canonicalJson(prepareBehaviorBindings(bindings).records))); }
// The caller authenticates the independent invocation; this helper only binds
// its evidence to exact code and acceptance coverage, never creates a review.
export function verifyBehaviorPreparation(bindings, evidence, authenticateReview) {
  const digest = behaviorIdentity(bindings);
  if (!evidence?.review || !evidence?.behavior || typeof authenticateReview !== 'function') fail('CD_BEHAVIOR_REVIEW_REQUIRED');
  const review = JSON.parse(readExact(evidence.review));
  const behavior = JSON.parse(readExact(evidence.behavior));
  if (review.status !== 'PASS' || !review.producerInvocation || !review.reviewerInvocation || review.producerInvocation === review.reviewerInvocation || review.behaviorSha256 !== digest || authenticateReview(review, evidence.review) !== true) fail('CD_BEHAVIOR_REVIEW_REQUIRED');
  const required = [...new Set(bindings.flatMap(b => b.acceptance_ids))].sort();
  if (behavior.status !== 'PASS' || behavior.behaviorSha256 !== digest || !behavior.isolated || !Array.isArray(behavior.acceptanceIds) || JSON.stringify([...behavior.acceptanceIds].sort()) !== JSON.stringify(required) || behavior.unexpectedRequests !== 0 || behavior.dialogs !== 0 || behavior.errors !== 0) fail('CD_BEHAVIOR_EVIDENCE_REQUIRED');
  return { behaviorSha256: digest, review: evidence.review, behavior: evidence.behavior };
}
