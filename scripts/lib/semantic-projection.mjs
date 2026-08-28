import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const UNIQUE_YAML_PROGRAM = [
  'import json,sys,yaml',
  'from yaml.constructor import ConstructorError',
  'class UniqueKeyLoader(yaml.SafeLoader):',
  '    pass',
  'def construct_unique_mapping(loader, node, deep=False):',
  '    loader.flatten_mapping(node)',
  '    mapping = {}',
  '    for key_node, value_node in node.value:',
  '        key = loader.construct_object(key_node, deep=deep)',
  '        try:',
  '            duplicate = key in mapping',
  '        except TypeError:',
  '            raise ConstructorError("while constructing a mapping", node.start_mark, "unhashable key", key_node.start_mark)',
  '        if duplicate:',
  '            raise ConstructorError("while constructing a mapping", node.start_mark, "duplicate key: "+repr(key), key_node.start_mark)',
  '        mapping[key] = loader.construct_object(value_node, deep=deep)',
  '    return mapping',
  'UniqueKeyLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, construct_unique_mapping)',
  'try:',
  '    value = yaml.load(sys.stdin.read(), Loader=UniqueKeyLoader)',
  '    print(json.dumps(value, ensure_ascii=False, separators=(",",":"), default=str))',
  'except Exception as exc:',
  '    print(type(exc).__name__+": "+str(exc), file=sys.stderr)',
  '    raise SystemExit(2)',
].join('\n');

function parseYamlUnique(source, label) {
  let output;
  try {
    output = execFileSync('python3', ['-c', UNIQUE_YAML_PROGRAM], {
      encoding: 'utf8',
      input: source,
    });
  } catch (error) {
    const detail = String(error.stderr || error.stdout || error.message).trim();
    throw new Error(`${label}: ${detail || 'invalid YAML'}`);
  }
  return JSON.parse(output);
}

export function readSkillHeader(path) {
  const source = readFileSync(path, 'utf8');
  const normalized = source.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  if (lines[0] !== '---') throw new Error(`missing canonical frontmatter opener in ${path}`);
  const endLine = lines.findIndex((line, index) => index > 0 && line === '---');
  if (endLine < 0) throw new Error(`missing canonical frontmatter closer in ${path}`);
  const parsed = parseYamlUnique(lines.slice(1, endLine).join('\n'), `invalid frontmatter in ${path}`);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`frontmatter must be a mapping in ${path}`);
  }
  if (typeof parsed.name !== 'string' || !parsed.name.trim()) {
    throw new Error(`frontmatter name must be a non-empty string in ${path}`);
  }
  const metadata = parsed.metadata ?? {};
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error(`frontmatter metadata must be a mapping in ${path}`);
  }
  return { name: parsed.name.trim(), metadata, source };
}

export function readBoundedBlock(source, beginMarker, endMarker) {
  const beginAt = source.indexOf(beginMarker);
  const endAt = source.indexOf(endMarker);
  if (beginAt < 0 || endAt < 0 || endAt <= beginAt) {
    throw new Error(`missing or malformed bounded block ${beginMarker} ... ${endMarker}`);
  }
  if (source.indexOf(beginMarker, beginAt + beginMarker.length) >= 0
      || source.indexOf(endMarker, endAt + endMarker.length) >= 0) {
    throw new Error(`bounded block markers must be unique: ${beginMarker} ... ${endMarker}`);
  }
  const value = source
    .slice(beginAt + beginMarker.length, endAt)
    .replace(/\r\n/g, '\n')
    .trim();
  if (!value) throw new Error(`bounded block is empty: ${beginMarker}`);
  return value;
}

export function readAuthority(repoRoot, reference) {
  const splitAt = reference.indexOf('#');
  if (splitAt <= 0 || splitAt === reference.length - 1) {
    throw new Error(`authority reference must be <path>#<dot.path>: ${reference}`);
  }
  const relativePath = reference.slice(0, splitAt);
  const dotPath = reference.slice(splitAt + 1);
  const path = resolve(repoRoot, relativePath);
  const rootReal = realpathSync(repoRoot);
  let stat;
  try { stat = lstatSync(path); } catch {
    throw new Error(`authority file missing: ${relativePath}`);
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`authority must be a repository-owned regular file: ${relativePath}`);
  }
  const pathReal = realpathSync(path);
  const rel = relative(rootReal, pathReal);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)
      || dirname(pathReal) === pathReal) {
    throw new Error(`authority escapes repository root: ${relativePath}`);
  }
  let node = parseYamlUnique(readFileSync(pathReal, 'utf8'), `invalid authority YAML ${relativePath}`);
  for (const part of dotPath.split('.')) {
    if (!node || typeof node !== 'object' || Array.isArray(node) || !(part in node)) {
      throw new Error(`missing authority path: ${dotPath}`);
    }
    node = node[part];
  }
  return node;
}

export function gateProjection(reference, authorityNode) {
  if (!authorityNode || typeof authorityNode !== 'object' || Array.isArray(authorityNode)) {
    throw new Error(`authority node must be a mapping: ${reference}`);
  }
  const appliesWhen = authorityNode.applies_when;
  if (typeof appliesWhen !== 'string' || !appliesWhen.trim()) {
    throw new Error(`authority applies_when must be a non-empty string: ${reference}`);
  }
  const allowStandaloneOverride = authorityNode.allow_standalone_override;
  if (typeof allowStandaloneOverride !== 'boolean') {
    throw new Error(`authority allow_standalone_override must be boolean: ${reference}`);
  }
  const allowParallelStart = authorityNode.allow_parallel_start;
  if (typeof allowParallelStart !== 'boolean') {
    throw new Error(`authority allow_parallel_start must be boolean: ${reference}`);
  }
  const raw = authorityNode.block_if;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`authority block_if must be a non-empty list: ${reference}`);
  }
  const obligations = raw.map((item, index) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new Error(`authority block_if[${index}] must be a non-empty string: ${reference}`);
    }
    return item.trim();
  });
  if (new Set(obligations).size !== obligations.length) {
    throw new Error(`authority block_if contains duplicate obligations: ${reference}`);
  }
  if (typeof authorityNode.order_significant !== 'boolean') {
    throw new Error(`authority order_significant must be boolean: ${reference}`);
  }
  const orderSignificant = authorityNode.order_significant;
  const normalized = orderSignificant ? obligations : [...obligations].sort();
  const payload = JSON.stringify({
    schema_version: 2,
    authority: reference,
    applies_when: appliesWhen.trim(),
    allow_standalone_override: allowStandaloneOverride,
    allow_parallel_start: allowParallelStart,
    order_significant: orderSignificant,
    block_if: normalized,
  });
  return {
    digest: `sha256:${createHash('sha256').update(payload).digest('hex')}`,
    appliesWhen: appliesWhen.trim(),
    allowStandaloneOverride,
    allowParallelStart,
    obligations,
    orderSignificant,
  };
}
