#!/usr/bin/env node
// Per-attempt identity checks. Caller authority and independent reviewer authenticity stay outside this module.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { verifyMaterialDependencies } from './material-dependencies.mjs';
import { verifyClaudeDesignRecovery } from './claude-design-recover.mjs';

const schema = JSON.parse(fs.readFileSync(new URL('../.claude/skill-os/prototype-delivery.schema.json', import.meta.url)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (code, detail) => { throw new Error(`${code}: ${detail}`); };
const requireThat = (test, code, detail) => { if (!test) fail(code, detail); };
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const within = (file, root) => file === root || file.startsWith(root + path.sep);
const ref = file => ({ path: file, sha256: hash(fs.readFileSync(file)) });
const encode = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');

function absolute(value) {
  requireThat(typeof value === 'string' && path.isAbsolute(value), 'ABSOLUTE_PATH_REQUIRED', String(value));
  requireThat(!value.split(path.sep).some(part => part === '.' || part === '..'), 'PATH_ESCAPE', value);
  return path.normalize(value);
}
function relative(value) {
  requireThat(typeof value === 'string' && value.length > 0 && !path.isAbsolute(value) && !/[\\\0?#]/.test(value), 'PATH_ESCAPE', String(value));
  requireThat(value.split('/').every(part => part && part !== '.' && part !== '..'), 'PATH_ESCAPE', value);
  return value;
}
function noSymlink(file, mustExist = true) {
  const full = absolute(file);
  let cursor = path.parse(full).root;
  for (const part of full.slice(cursor.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if (!fs.existsSync(cursor)) {
      try { requireThat(!fs.lstatSync(cursor).isSymbolicLink(), 'SYMLINK_REFUSED', cursor); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      requireThat(!mustExist || cursor !== full, 'MISSING_FILE', full);
      continue;
    }
    requireThat(!fs.lstatSync(cursor).isSymbolicLink(), 'SYMLINK_REFUSED', cursor);
  }
  if (mustExist) requireThat(fs.existsSync(full), 'MISSING_FILE', full);
  return full;
}
function rootPath(value) {
  const full = noSymlink(value);
  requireThat(fs.statSync(full).isDirectory(), 'DIRECTORY_REQUIRED', full);
  requireThat(fs.realpathSync(full) === full, 'NONCANONICAL_ROOT', full);
  return full;
}
function contextFor(context = {}, deliveryRoot) {
  const roots = (context.read_roots || []).map(rootPath);
  if (deliveryRoot) roots.push(rootPath(deliveryRoot));
  const files = (context.read_paths || []).map(file => noSymlink(file));
  return { ...context, read_roots: roots, read_paths: files };
}
function read(file, context) {
  const full = absolute(file);
  requireThat(context.read_paths.includes(full) || context.read_roots.some(root => within(full, root)), 'READ_SCOPE_REFUSED', full); // guard:read-context
  noSymlink(full);
  requireThat(fs.statSync(full).isFile(), 'FILE_REQUIRED', full);
  return fs.readFileSync(full);
}
function checkedRef(item, context) {
  validate(item, 'ref');
  const bytes = read(item.path, context);
  requireThat(hash(bytes) === item.sha256, 'HASH_DRIFT', item.path); // guard:hash
  return bytes;
}
function sourceRef(item, context) {
  if (path.isAbsolute(item.locator)) checkedRef({ path: item.locator, sha256: item.sha256 }, context);
  else requireThat(context.source_refs?.some(source => equal(source, item)), 'SOURCE_CONTEXT_REQUIRED', item.locator);
}
function scopeRef(item, context) {
  if (path.isAbsolute(item.reference)) checkedRef({ path: item.reference, sha256: item.sha256 }, context);
  else requireThat(context.scope_refs?.some(scope => equal(scope, item)), 'SCOPE_CONTEXT_REQUIRED', item.reference);
}
function effects(context, deliveryRoot, names) {
  const actual = context.effects;
  requireThat(actual && actual.authorized_delivery_root === deliveryRoot, 'EFFECT_SCOPE_REQUIRED', deliveryRoot);
  requireThat(actual.framework_fixture === true || (actual.verified_active_project && actual.canonical_project_root &&
    path.dirname(deliveryRoot) === path.join(rootPath(actual.canonical_project_root), 'docs/prototype') &&
    /^\d{4}-\d{2}-\d{2}-.+/.test(path.basename(deliveryRoot))), 'VERIFIED_PROJECT_REQUIRED', deliveryRoot);
  for (const name of names) requireThat(actual[name] === true, 'EFFECT_REFUSED', name);
}
function processorNamespace(subject) {
  const processor = subject.processor_id === undefined ? 'motion-polish' : subject.processor_id;
  requireThat(['motion-polish', 'prototype-notes'].includes(processor), 'PROCESSOR_ID', String(processor));
  return processor;
}
function notesRawEffects(bound, deliveryRoot, context) {
  if (context.effects?.framework_fixture === true || bound.base.origin === 'external-html') return;
  requireThat(path.dirname(bound.base.asset_root) === path.dirname(deliveryRoot) &&
    /^\d{4}-\d{2}-\d{2}-.+/.test(path.basename(bound.base.asset_root)) &&
    path.basename(deliveryRoot) === path.basename(bound.base.asset_root) + '-notes', 'NOTES_RAW_ROOT', deliveryRoot);
}

// The deliberately small JSON-schema subset used by the adjacent schema, with strict objects.
function validate(value, name) {
  function visit(value, rule, at) {
    if (rule.$ref) return visit(value, schema.$defs[rule.$ref.split('/').at(-1)], at);
    if (rule.anyOf) {
      requireThat(rule.anyOf.some(option => { try { visit(value, option, at); return true; } catch { return false; } }), 'SCHEMA', at);
      return;
    }
    if ('const' in rule) requireThat(value === rule.const, 'SCHEMA', at);
    if (rule.enum) requireThat(rule.enum.includes(value), 'SCHEMA', at);
    if (rule.type === 'object') {
      requireThat(value && typeof value === 'object' && !Array.isArray(value), 'SCHEMA', at);
      for (const key of rule.required || []) requireThat(Object.hasOwn(value, key), 'SCHEMA', `${at}.${key}`);
      for (const [key, item] of Object.entries(value)) {
        requireThat(rule.additionalProperties !== false || Object.hasOwn(rule.properties || {}, key), 'SCHEMA', `${at}.${key}`);
        if (rule.properties?.[key]) visit(item, rule.properties[key], `${at}.${key}`);
      }
    }
    if (rule.type === 'array') {
      requireThat(Array.isArray(value) && value.length >= (rule.minItems || 0), 'SCHEMA', at);
      if (rule.uniqueItems) requireThat(new Set(value.map(item => JSON.stringify(item))).size === value.length, 'SCHEMA', at);
      value.forEach((item, index) => visit(item, rule.items, `${at}[${index}]`));
    }
    if (rule.type === 'string') requireThat(typeof value === 'string' && value.length >= (rule.minLength || 0) &&
      (!rule.pattern || new RegExp(rule.pattern).test(value)), 'SCHEMA', at);
    if (rule.type === 'boolean') requireThat(typeof value === 'boolean', 'SCHEMA', at);
    if (rule.type === 'integer') requireThat(Number.isSafeInteger(value) && value >= (rule.minimum || 0), 'SCHEMA', at);
  }
  visit(value, schema.$defs[name], name);
}

function closure(items, root, context) {
  const names = new Set();
  for (const item of items) {
    relative(item.path);
    requireThat(!names.has(item.path), 'DUPLICATE_CLOSURE', item.path);
    names.add(item.path);
    const bytes = checkedRef({ path: path.join(root, item.path), sha256: item.sha256 }, context);
    requireThat(bytes.length === item.bytes, 'BYTE_DRIFT', item.path);
  }
  return names;
}
function dependencies(items, root, entry, context) {
  return verifyMaterialDependencies({items, entry, bytesOf: name => read(path.join(root, name), context), allowedUrls: context.allowed_urls || []});
}
function runtimeRequirements(proof, required) {
  requireThat(proof.runtime_requirements.length === 0 || Array.isArray(required) && proof.runtime_requirements.every(id => required.includes(id)), 'CD_RUNTIME_REQUIREMENT_REQUIRED', 'RUNTIME:DC_EXPORT_V1 must remain in the required report denominator'); // guard:cd-runtime-required
}

function boundChecks(bound, context) {
  processorNamespace(bound);
  validate(bound.source, 'source'); validate(bound.base, 'base'); validate(bound.scope, 'scope');
  validate(bound.methods, 'methods');
  sourceRef(bound.source, context); scopeRef(bound.scope, context);
  const root = rootPath(bound.base.asset_root);
  relative(bound.base.entry_relative);
  requireThat(bound.base.entry === path.join(root, bound.base.entry_relative), 'BASE_ENTRY_MISMATCH', bound.base.entry);
  const names = closure(bound.base.closure, root, context);
  requireThat(names.has(bound.base.entry_relative), 'ENTRY_NOT_IN_CLOSURE', bound.base.entry);
  checkedRef({ path: bound.base.entry, sha256: bound.base.sha256 }, context);
  requireThat(bound.base.origin !== 'open-design' || bound.base.recovery_ref, 'OD_RECOVERY_REQUIRED', bound.base.entry);
  if (bound.base.recovery_ref) checkedRef(bound.base.recovery_ref, context);
  if (bound.base.origin === 'claude-design') {
    requireThat(bound.base.recovery_ref, 'CD_RECOVERY_REQUIRED', bound.base.entry);
    requireThat(typeof context.authenticateClaudeDesignSelection === 'function', 'CD_SELECTION_CONTEXT_REQUIRED', 'NEEDS_CONTEXT: verified caller selection callback required');
    const recovered = verifyClaudeDesignRecovery(bound.base.recovery_ref, {
      authorizeRead: item => {
        const file = absolute(item.path);
        requireThat(context.read_paths.includes(file) || context.read_roots.some(root => within(file, root)), 'READ_SCOPE_REFUSED', file);
        return true;
      },
      authenticateSelection: subject => context.authenticateClaudeDesignSelection({ ...subject, recoveryRef: bound.base.recovery_ref }),
    });
    requireThat(recovered.selectionAuthenticity === 'CALLER_VERIFIED', 'CD_SELECTION_CONTEXT_REQUIRED', bound.base.entry);
    requireThat(bound.source.locator === recovered.receipt.packet.path && bound.source.sha256 === recovered.receipt.packet.sha256, 'CD_PACKET_MISMATCH', bound.source.locator);
    // Derived notes bind the accepted parent final through parentChecks; raw provenance stays checked above.
    if (!bound.parent_accepted_ref) {
      requireThat(bound.base.entry === recovered.entry && bound.base.sha256 === recovered.sha256, 'CD_RAW_IDENTITY_MISMATCH', bound.base.entry); // guard:cd-raw-identity
      if (recovered.bundle) {
        const order = items => items.map(({ path: name, sha256, bytes }) => ({ path: name, sha256, bytes }))
          .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
        const bundleMatches = root === recovered.bundle.asset_root && bound.base.entry_relative === recovered.bundle.entry_relative &&
          equal(order(bound.base.closure), order(recovered.bundle.closure));
        requireThat(bundleMatches, 'CD_EXPORT_BUNDLE_MISMATCH', bound.base.entry); // guard:cd-export-bundle
      }
    }
    if (recovered.mechanicalAcceptance === 'PENDING_FIDELITY') {
      requireThat(typeof context.verifyClaudeDesignFidelity === 'function' && context.verifyClaudeDesignFidelity({
        recoveryRef: bound.base.recovery_ref, receipt: recovered.receipt, readRefs: recovered.readRefs,
      }) === true, 'CD_FIDELITY_REQUIRED', 'Actual original/template checks required');
    }
  }
  if (bound.base.spec) checkedRef(bound.base.spec, context);
  for (const method of bound.methods) checkedRef({ path: method.path, sha256: method.sha256 }, context);
  const proof = dependencies(bound.base.closure, root, bound.base.entry_relative, context);
  if (Object.hasOwn(bound, 'required_behavior_refs')) runtimeRequirements(proof, bound.required_behavior_refs);
}

export function bindBase(input, context = {}) {
  requireThat(!Object.hasOwn(input, 'parent_accepted_ref'), 'DERIVATION_ENTRY_REQUIRED', 'Use deriveFromAccepted');
  const actual = contextFor(context);
  const bound = structuredClone(input);
  boundChecks(bound, actual);
  return bound;
}

export function prepareCopy(bound, options, context = {}) {
  const deliveryRoot = rootPath(options.delivery_root);
  const actual = contextFor(context, deliveryRoot);
  boundChecks(bound, actual);
  const kind = options.kind || 'enhanced-copy';
  requireThat(['adequate-original', 'adequate-copy', 'enhanced-copy'].includes(kind), 'KIND', kind);
  const processor = processorNamespace(options);
  requireThat(!bound.parent_accepted_ref && !options.parent_accepted_ref, 'DERIVATION_ENTRY_REQUIRED', 'Use deriveFromAccepted');
  requireThat(processor !== 'prototype-notes' || kind !== 'adequate-original', 'PROCESSOR_KIND', kind);
  const attemptDir = attemptPath({ ...options, delivery_root: deliveryRoot });
  effects(actual, deliveryRoot, kind === 'adequate-original' ? ['metadata'] : ['copy', 'metadata']);
  if (kind === 'enhanced-copy') effects(actual, deliveryRoot, ['edit']);
  if (processor === 'prototype-notes') notesRawEffects(bound, deliveryRoot, actual);
  requireThat(!within(deliveryRoot, bound.base.asset_root) && !within(bound.base.asset_root, deliveryRoot) || kind === 'adequate-original', 'SOURCE_OUTPUT_OVERLAP', deliveryRoot);
  if (kind === 'adequate-original') requireThat(within(bound.base.entry, deliveryRoot), 'OUTSIDE_ROOT_FINAL', bound.base.entry);
  return createAttempt(bound, { ...options, kind, processor_id: processor }, actual, attemptDir);
}
function createAttempt(bound, options, actual, attemptDir) {
  const kind = options.kind;
  const parent = path.dirname(attemptDir);
  noSymlink(parent, false);
  noSymlink(attemptDir, false);
  fs.mkdirSync(parent, { recursive: true });
  try { fs.mkdirSync(attemptDir); } catch (error) { if (error.code === 'EEXIST') fail('ATTEMPT_EXISTS', attemptDir); throw error; }
  const contentRoot = path.join(attemptDir, 'content');
  if (kind !== 'adequate-original') {
    fs.mkdirSync(contentRoot);
    for (const item of bound.base.closure) {
      const target = path.join(contentRoot, item.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, read(path.join(bound.base.asset_root, item.path), actual), { flag: 'wx' });
    }
  }
  return { attempt_id: options.attempt_id, attempt_dir: attemptDir, content_root: kind === 'adequate-original' ? null : contentRoot,
    entry: kind === 'adequate-original' ? bound.base.entry : path.join(contentRoot, bound.base.entry_relative), kind,
    processor_id: processorNamespace(options) };
}

function baseFromParent(parent) {
  const assetRoot = parent.delivery.kind === 'adequate-original' ? parent.base.asset_root : path.join(attemptPath(parent.candidate), 'content');
  return { ...structuredClone(parent.base), entry: parent.final_entry, sha256: parent.final_sha256, asset_root: assetRoot,
    closure: parent.delivery.closure.map(item => ({ ...item, path: path.relative(assetRoot, path.join(parent.delivery_root, item.path)).split(path.sep).join('/') })),
    spec: { path: parent.spec_path, sha256: parent.spec_sha256 } };
}
function acceptedMotion(parentRef, deliveryRoot, context) {
  // Check the processor before recursively resolving. Notes cannot nominate another notes child or a cycle.
  const certificate = JSON.parse(checkedRef(parentRef, context));
  validate(certificate, 'accepted');
  const candidate = JSON.parse(checkedRef(certificate.candidate_ref, context));
  validate(candidate, 'candidate');
  requireThat(processorNamespace(certificate) === 'motion-polish' && processorNamespace(candidate) === 'motion-polish' &&
    !candidate.parent_accepted_ref, 'PARENT_PROCESSOR', parentRef.path);
  return resolveFinal({ ...parentRef, delivery_root: deliveryRoot }, context);
}
function parentChecks(subject, deliveryRoot, context) {
  requireThat(processorNamespace(subject) === 'prototype-notes', 'PARENT_PROCESSOR', 'Only accepted motion to notes');
  const parent = acceptedMotion(subject.parent_accepted_ref, deliveryRoot, context);
  requireThat(parent.delivery_root === deliveryRoot, 'PARENT_ROOT', deliveryRoot);
  requireThat(equal(subject.source, parent.source_ref) && equal(subject.base, baseFromParent(parent)), 'PARENT_BASE_MISMATCH', subject.base.entry); // guard:parent-base
  const content = path.join(attemptPath(subject), 'content');
  noSymlink(content, false);
  const parentRoot = rootPath(subject.base.asset_root);
  requireThat(!within(content, parentRoot) && !within(parentRoot, content), 'PARENT_CONTENT_OVERLAP', content);
  if (subject.required_behavior_refs) requireThat(parent.required_behavior_refs.every(id => subject.required_behavior_refs.includes(id)), 'PARENT_REQUIRED_MISSING', deliveryRoot); // guard:parent-required
  return parent;
}
export function deriveFromAccepted(input, context = {}) {
  const keys = ['accepted_ref', 'delivery_root', 'attempt_id', 'processor_id', 'scope', 'methods', 'authority_ref'];
  requireThat(input && keys.every(key => Object.hasOwn(input, key)) && Object.keys(input).every(key => keys.includes(key)), 'DERIVATION_INPUT', 'Exact accepted ref, no caller base');
  requireThat(processorNamespace(input) === 'prototype-notes', 'PROCESSOR_TRANSITION', 'Only accepted motion to notes');
  requireThat(typeof input.authority_ref === 'string' && input.authority_ref.length, 'SCHEMA', 'authority_ref');
  const deliveryRoot = rootPath(input.delivery_root), actual = contextFor(context, deliveryRoot);
  effects(actual, deliveryRoot, ['copy', 'edit', 'metadata']);
  const attemptDir = attemptPath(input);
  const parent = acceptedMotion(input.accepted_ref, deliveryRoot, actual);
  const bound = { source: structuredClone(parent.source_ref), base: baseFromParent(parent), scope: structuredClone(input.scope),
    methods: structuredClone(input.methods), authority_ref: input.authority_ref, processor_id: 'prototype-notes', parent_accepted_ref: structuredClone(input.accepted_ref) };
  boundChecks(bound, actual);
  parentChecks({ ...bound, ...input }, deliveryRoot, actual);
  const attempt = createAttempt(bound, { ...input, kind: 'enhanced-copy' }, actual, attemptDir);
  // Source and accepted dependencies must still be the exact snapshot after every copy read.
  boundChecks(bound, actual);
  parentChecks({ ...bound, ...input }, deliveryRoot, actual);
  closure(bound.base.closure, attempt.content_root, actual);
  return { bound, attempt, parent_accepted_ref: structuredClone(input.accepted_ref) };
}

function publish(file, bytes) {
  noSymlink(path.dirname(file)); noSymlink(file, false);
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  let fd;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    try { fs.linkSync(temp, file); } catch (error) { // guard:no-replace
      if (error.code !== 'EEXIST') fail('ATOMIC_NO_REPLACE_UNAVAILABLE', `${file}: ${error.code}`);
      requireThat(fs.readFileSync(file).equals(bytes), 'PUBLICATION_CONFLICT', file);
    }
    const directory = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
    requireThat(fs.readFileSync(file).equals(bytes), 'PUBLICATION_DRIFT', file);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
  return ref(file);
}
function attemptPath(candidate) {
  requireThat(typeof candidate.attempt_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(candidate.attempt_id), 'ATTEMPT_ID', String(candidate.attempt_id)); // guard:attempt-id
  const parent = path.join(absolute(candidate.delivery_root), processorNamespace(candidate));
  const directory = path.join(parent, candidate.attempt_id);
  requireThat(within(directory, parent), 'PATH_ESCAPE', directory);
  return directory;
}
function contentInventory(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      noSymlink(full);
      if (entry.isDirectory()) walk(full);
      else { requireThat(entry.isFile(), 'CONTENT_FILE_REQUIRED', full); files.push(path.relative(root, full).split(path.sep).join('/')); }
    }
  }
  walk(root);
  return files.sort();
}
function candidateChecks(candidate, context) {
  validate(candidate, 'candidate');
  const deliveryRoot = rootPath(candidate.delivery_root);
  const processor = processorNamespace(candidate);
  if (candidate.parent_accepted_ref) parentChecks(candidate, deliveryRoot, context);
  else if (processor === 'prototype-notes') requireThat(!within(deliveryRoot, candidate.base.asset_root) && !within(candidate.base.asset_root, deliveryRoot), 'SOURCE_OUTPUT_OVERLAP', deliveryRoot);
  requireThat(processor === 'prototype-notes' || !candidate.notes_manifest_ref, 'NOTES_PROCESSOR_REQUIRED', deliveryRoot);
  requireThat(processor !== 'prototype-notes' || candidate.delivery.kind !== 'adequate-original', 'PROCESSOR_KIND', candidate.delivery.kind);
  boundChecks(candidate, context);
  const attemptDir = noSymlink(attemptPath(candidate));
  requireThat(candidate.delivery.id === candidate.attempt_id, 'ATTEMPT_MISMATCH', candidate.attempt_id);
  const entry = path.join(deliveryRoot, relative(candidate.delivery.entry));
  checkedRef({ path: entry, sha256: candidate.delivery.sha256 }, context);
  closure(candidate.delivery.closure, deliveryRoot, context);
  const copied = candidate.delivery.kind !== 'adequate-original';
  const contentRoot = copied ? path.join(attemptDir, 'content') : candidate.base.asset_root;
  if (copied) requireThat(entry === path.join(contentRoot, candidate.base.entry_relative), 'COPY_TOPOLOGY', entry);
  else requireThat(entry === candidate.base.entry, 'ORIGINAL_ENTRY', entry);
  const local = candidate.delivery.closure.map(item => ({ ...item, path: path.relative(contentRoot, path.join(deliveryRoot, item.path)).split(path.sep).join('/') }));
  local.forEach(item => relative(item.path));
  if (copied) requireThat(equal(contentInventory(contentRoot), local.map(item => item.path).sort()), 'UNDECLARED_CONTENT', contentRoot);
  runtimeRequirements(dependencies(local, contentRoot, candidate.base.entry_relative, context), candidate.required_behavior_refs);
  checkedRef(candidate.delivery.spec, context);
  requireThat(within(candidate.delivery.spec.path, attemptDir) && !within(candidate.delivery.spec.path, path.join(attemptDir, 'content')) ||
    candidate.delivery.kind === 'adequate-original' && candidate.base.spec && equal(candidate.delivery.spec, candidate.base.spec), 'SPEC_LOCATION', candidate.delivery.spec.path);
  checkedRef(candidate.methods_ref, context);
  requireThat(candidate.methods_ref.path === path.join(attemptDir, 'methods.json') && equal(JSON.parse(read(candidate.methods_ref.path, context)), candidate.methods), 'METHODS_MISMATCH', attemptDir);
  const patch = JSON.parse(checkedRef({ path: candidate.patch.path, sha256: candidate.patch.sha256 }, context));
  validate(patch, 'patch_data');
  requireThat(candidate.patch.path === path.join(attemptDir, 'patch.json') && equal(patch.operations, candidate.patch.operations) &&
    patch.base_sha256 === candidate.patch.base_sha256 && patch.content_changed === candidate.patch.content_changed &&
    patch.base_sha256 === candidate.base.sha256, 'PATCH_MISMATCH', candidate.patch.path);
  const base = new Map(candidate.base.closure.map(item => [item.path, item]));
  const final = new Map(local.map(item => [item.path, item]));
  requireThat([...base.keys()].every(key => final.has(key)), 'COPY_CLOSURE_MISSING', attemptDir);
  const changed = [...new Set([...base.keys(), ...final.keys()])].filter(key => base.get(key)?.sha256 !== final.get(key)?.sha256);
  const operations = patch.operations;
  requireThat(operations.length === changed.length && new Set(operations.map(item => item.path)).size === operations.length &&
    operations.every(item => changed.includes(item.path) && item.before_sha256 === (base.get(item.path)?.sha256 || null) && item.after_sha256 === final.get(item.path)?.sha256), 'PATCH_CONTENT_MISMATCH', attemptDir);
  if (candidate.delivery.kind !== 'enhanced-copy') {
    requireThat(!changed.length && operations.length === 0 && patch.content_changed === false, 'ADEQUATE_COPY_CHANGED', attemptDir); // guard:adequate-bytes
  } else requireThat(changed.length > 0 && patch.content_changed === true, 'ENHANCEMENT_UNCHANGED', attemptDir);
  if (processor === 'prototype-notes') notesManifestChecks(candidate, attemptDir, context);
  return { entry, attemptDir };
}
function notesManifestChecks(candidate, attemptDir, context) {
  requireThat(candidate.notes_manifest_ref, 'NOTES_MANIFEST_REQUIRED', attemptDir);
  const file = absolute(candidate.notes_manifest_ref.path);
  requireThat(within(file, attemptDir) && !within(file, path.join(attemptDir, 'content')) &&
    file !== absolute(candidate.delivery.spec.path) &&
    !['methods.json', 'patch.json', 'candidate-subject.json', 'qa-results.json', 'accepted-delivery.json', 'prototype-spec.md'].includes(path.basename(file)), 'NOTES_MANIFEST_LOCATION', file);
  const manifest = JSON.parse(checkedRef(candidate.notes_manifest_ref, context));
  validate(manifest, 'notes_manifest');
  requireThat(equal(manifest.scope, candidate.scope), 'NOTES_SCOPE_MISMATCH', file);
  const ids = manifest.required_behavior_refs, mapped = manifest.behavior_mapping.map(item => item.behavior_id);
  requireThat(ids.length === candidate.required_behavior_refs.length && candidate.required_behavior_refs.every(id => ids.includes(id)) &&
    mapped.length === ids.length && new Set(mapped).size === mapped.length && ids.every(id => mapped.includes(id)) &&
    equal([...manifest.notes_instance_refs].sort(), ids.filter(id => id.startsWith('NOTES:')).sort()), 'NOTES_REQUIRED_SET_MISMATCH', file); // guard:notes-set
  checkedRef(manifest.input_data_ref, context);
  checkedRef({ path: manifest.runtime.path, sha256: manifest.runtime.sha256 }, context);
  checkedRef({ path: manifest.content_guideline.path, sha256: manifest.content_guideline.sha256 }, context);
}

export function checkCandidate(input, context = {}) {
  const candidate = { schema_version: 1, kind: 'preaccept-candidate', ...structuredClone(input) };
  const deliveryRoot = rootPath(candidate.delivery_root);
  const actual = contextFor(context, deliveryRoot);
  effects(actual, deliveryRoot, ['metadata']);
  processorNamespace(candidate);
  if (processorNamespace(candidate) === 'prototype-notes' && !candidate.parent_accepted_ref) {
    validate(candidate.base, 'base');
    notesRawEffects(candidate, deliveryRoot, actual);
  }
  const attemptDir = noSymlink(attemptPath(candidate));
  candidate.methods_ref = publish(path.join(attemptDir, 'methods.json'), encode(candidate.methods));
  candidateChecks(candidate, actual);
  if (candidate.delivery.kind === 'enhanced-copy') {
    effects(actual, deliveryRoot, ['edit']);
    requireThat(candidate.patch.operations.every(item => actual.effects.edit_paths?.includes(item.path)), 'EDIT_SCOPE_REFUSED', attemptDir);
  }
  const candidateRef = publish(path.join(attemptDir, 'candidate-subject.json'), encode(candidate));
  return { candidate_ref: candidateRef, ...resolvedCandidate(candidate, candidateRef) };
}
function resolvedCandidate(candidate, candidateRef) {
  return { candidate_ref: candidateRef, delivery_root: candidate.delivery_root, final_entry: path.join(candidate.delivery_root, candidate.delivery.entry),
    final_sha256: candidate.delivery.sha256, spec_path: candidate.delivery.spec.path, spec_sha256: candidate.delivery.spec.sha256,
    source_ref: candidate.source, base: candidate.base, raw_provenance: candidate.base.recovery_ref || null,
    required_behavior_refs: candidate.required_behavior_refs, delivery: candidate.delivery, candidate,
    processor_id: processorNamespace(candidate), parent_accepted_ref: candidate.parent_accepted_ref || null, notes_manifest_ref: candidate.notes_manifest_ref || null };
}
export function resolveCandidateSubject(input, context = {}) {
  const deliveryRoot = rootPath(input.delivery_root);
  const actual = contextFor(context, deliveryRoot);
  const candidateRef = { path: absolute(input.path), sha256: input.sha256 };
  requireThat(within(candidateRef.path, deliveryRoot), 'SUBJECT_OUTSIDE_ROOT', candidateRef.path);
  const candidate = JSON.parse(checkedRef(candidateRef, actual));
  requireThat(candidate.delivery_root === deliveryRoot && candidateRef.path === path.join(attemptPath(candidate), 'candidate-subject.json'), 'SUBJECT_PATH_MISMATCH', candidateRef.path);
  candidateChecks(candidate, actual);
  return resolvedCandidate(candidate, candidateRef);
}
function reportChecks(reportRef, resolved, context) {
  const report = JSON.parse(checkedRef(reportRef, context));
  validate(report, 'report');
  requireThat(processorNamespace(report) === resolved.processor_id, 'REPORT_PROCESSOR_MISMATCH', reportRef.path);
  requireThat(reportRef.path === path.join(attemptPath(resolved.candidate), 'qa-results.json'), 'REPORT_LOCATION', reportRef.path);
  requireThat(equal(report.candidate_ref, resolved.candidate_ref) && report.final_sha256 === resolved.final_sha256, 'REPORT_SUBJECT_MISMATCH', reportRef.path);
  const ids = report.required_behavior_results.map(item => item.id);
  requireThat(ids.length === resolved.required_behavior_refs.length && new Set(ids).size === ids.length &&
    resolved.required_behavior_refs.every(id => ids.includes(id)), 'REQUIRED_SET_MISMATCH', reportRef.path); // guard:required-set
  requireThat(report.status === 'PASS' && report.required_behavior_results.every(item => item.status === 'PASS'), 'REQUIRED_NOT_PASS', reportRef.path);
  for (const item of report.required_behavior_results) for (const evidence of item.evidence_refs) checkedRef(evidence, context);
  checkedRef(report.reviewer_provenance.invocation_ref, context);
  checkedRef(report.reviewer_provenance.output_ref, context);
  return report;
}
export function sealAccepted(input, context = {}) {
  const actual = contextFor(context, input.delivery_root);
  effects(actual, input.delivery_root, ['metadata']);
  const resolved = resolveCandidateSubject({ ...input.candidate_ref, delivery_root: input.delivery_root }, actual);
  if (resolved.processor_id === 'prototype-notes' && resolved.delivery.kind === 'enhanced-copy') {
    effects(actual, input.delivery_root, ['edit']);
    requireThat(resolved.candidate.patch.operations.every(item => actual.effects.edit_paths?.includes(item.path)), 'EDIT_SCOPE_REFUSED', resolved.candidate.attempt_id);
  }
  reportChecks(input.report_ref, resolved, actual);
  const certificate = { schema_version: 1, kind: 'accepted-prototype-delivery', attempt_id: resolved.candidate.attempt_id,
    candidate_ref: input.candidate_ref, acceptance_ref: input.report_ref,
    final: { entry: resolved.candidate.delivery.entry, sha256: resolved.final_sha256, spec: resolved.candidate.delivery.spec } };
  if (Object.hasOwn(resolved.candidate, 'processor_id')) certificate.processor_id = resolved.candidate.processor_id;
  if (resolved.parent_accepted_ref) certificate.parent_accepted_ref = resolved.parent_accepted_ref;
  if (resolved.notes_manifest_ref) certificate.notes_manifest_ref = resolved.notes_manifest_ref;
  validate(certificate, 'accepted');
  // Re-read all frozen dependencies immediately before publication, including when reusing identical bytes.
  resolveCandidateSubject({ ...input.candidate_ref, delivery_root: input.delivery_root }, actual);
  reportChecks(input.report_ref, resolved, actual);
  const acceptedRef = publish(path.join(attemptPath(resolved.candidate), 'accepted-delivery.json'), encode(certificate));
  return resolveFinal({ ...acceptedRef, delivery_root: input.delivery_root }, actual);
}
export function resolveFinal(input, context = {}) {
  const deliveryRoot = rootPath(input.delivery_root);
  const actual = contextFor(context, deliveryRoot);
  const acceptedRef = { path: absolute(input.path), sha256: input.sha256 };
  requireThat(within(acceptedRef.path, deliveryRoot), 'ACCEPTED_OUTSIDE_ROOT', acceptedRef.path);
  const certificate = JSON.parse(checkedRef(acceptedRef, actual));
  validate(certificate, 'accepted');
  const resolved = resolveCandidateSubject({ ...certificate.candidate_ref, delivery_root: deliveryRoot }, actual);
  requireThat(processorNamespace(certificate) === resolved.processor_id && equal(certificate.parent_accepted_ref || null, resolved.parent_accepted_ref) &&
    equal(certificate.notes_manifest_ref || null, resolved.notes_manifest_ref), 'CERTIFICATE_PROCESSOR_MISMATCH', acceptedRef.path);
  requireThat(acceptedRef.path === path.join(attemptPath(resolved.candidate), 'accepted-delivery.json') &&
    certificate.attempt_id === resolved.candidate.attempt_id && equal(certificate.final, { entry: resolved.candidate.delivery.entry,
      sha256: resolved.final_sha256, spec: resolved.candidate.delivery.spec }), 'CERTIFICATE_MISMATCH', acceptedRef.path);
  reportChecks(certificate.acceptance_ref, resolved, actual);
  return { ...resolved, accepted_ref: acceptedRef, acceptance_ref: certificate.acceptance_ref, integrity: 'PASS', reviewer_authenticity: 'CALLER_RESPONSIBILITY' };
}

function cli(argv) {
  const [command, ...args] = argv;
  requireThat(['candidate-check', 'validate', 'resolve'].includes(command), 'CLI_USAGE', 'candidate-check|validate|resolve');
  const options = { read_paths: [], read_roots: [] };
  const acceptedFlags = new Set(['--subject', '--accepted', '--sha256', '--delivery-root', '--read-path', '--read-root']);
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    requireThat(acceptedFlags.has(flag) && value && !value.startsWith('--'), 'CLI_USAGE', flag);
    if (flag === '--read-path') options.read_paths.push(absolute(value));
    else if (flag === '--read-root') options.read_roots.push(absolute(value));
    else { requireThat(!options[flag], 'CLI_USAGE', `duplicate ${flag}`); options[flag] = value; }
  }
  requireThat(options['--sha256'] && options['--delivery-root'] &&
    (command === 'candidate-check' ? options['--subject'] && !options['--accepted'] : options['--accepted'] && !options['--subject']), 'CLI_USAGE', 'exact identity flags required');
  const input = { path: options[command === 'candidate-check' ? '--subject' : '--accepted'], sha256: options['--sha256'], delivery_root: options['--delivery-root'] };
  return command === 'candidate-check' ? resolveCandidateSubject(input, options) : resolveFinal(input, options);
}
if (process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) { // guard:cli-entry
  try { console.log(JSON.stringify(cli(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
