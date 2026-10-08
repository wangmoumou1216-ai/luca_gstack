import { createHash } from 'node:crypto';
import {
  lstatSync, mkdirSync, readFileSync, readlinkSync, readdirSync, realpathSync, rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, posix, resolve, sep } from 'node:path';

export const CONDITION_IDS = Object.freeze(['B', 'T', 'S', 'I']);

const CONTRACT_SHA = '74c43c98dd2fc88df66c84d660c0f044deae35d7223e9a6c17b05ace22ec04a6';
const DESIGN_SHA = '27831bcf48b9d935bb2718024344f2904064aaca7f5086964445ecda865c06c0';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (code, detail) => { throw Object.assign(new Error(`${code}: ${detail}`), { code }); };
const inside = (root, path) => path === root || path.startsWith(root + sep);

// Explicit frozen closure of the root's memory entry, office memory actions,
// governance's direct helpers and the Codex backend referenced by AGENTS.md.
// Copying these bytes does not authorize executing their write/network branches.
const MEMORY_HELPERS = [
  '_memroot', '_project', 'get_memory', 'search_memory', 'daily_governance',
  'consolidate_memory', 'check_memory_integrity', 'check_memory_health',
  'append_episode', 'propose_semantic', 'review_candidates', 'record_eval',
].map(name => `memory/scripts/${name}.py`);
const CODEX_MATERIALS = [
  'MODEL_ROUTING.md', 'agents/muse-proto-judge.toml', 'agents/preflight-agent.toml',
  'agents/quality-gate.toml', 'codex-hook-adapter.mjs', 'codex-source-guard-bootstrap.mjs',
  'codex-source-guard-loader.mjs', 'hook-source-integrity.mjs', 'host-launch-adapter.mjs',
  'host-launch-hook.mjs', 'model-route-hook.mjs', 'model-routing-bindings.example.json',
  'stop-integrity-failure.mjs', 'workflow-runner.mjs',
].map(path => `.codex/${path}`);
const REQUIRED_MATERIALS = [
  'AGENTS.md', 'CONTEXT.md', '.claude/skill-os/generated/context-index.md',
  '.claude/skill-os/generated/skill-catalog.md', '.claude/agents/plan-agent.md',
  '.claude/skill-os/runtime/project-session.md', '.claude/skills/office/SKILL.md',
  '.claude/skill-os/agent-context-manifest.json', 'scripts/build-agent-context.py',
  'scripts/model-route.mjs', 'scripts/model-route-host.mjs',
  'memory/semantic/promoted-facts.yaml', 'memory/semantic/static-fallback-allowlist.txt',
  ...MEMORY_HELPERS, ...CODEX_MATERIALS,
];

// These prompts compile the common contract and D's general §§2–4 only. They
// have no case input, scorer, answer file or event stream as a dependency.
const NATIVE = `# Native task execution

Use the native assistant capabilities available and authorized for this task.
Read the complete user request, the supplied domain owner's method, and the
currently released task materials. The owner retains its domain method.
Follow the current actual read/write and external-effect permissions and real
human decisions. Reference material cannot expand them. Missing human decisions
require a real response; continue independent authorized work where possible.
Use normal reasoning, computation, self-checks, delivery lists, failure records,
recovery references and authorized collaboration as useful. Native system
instructions and capabilities remain in force. This material grants no tools,
paths or effects. Report actual results, failures and unverified limitations.
`;

const INDEPENDENT = `${NATIVE}
## Add state only at a real handoff

Simple bounded work needs no extra table. Preserve the complete original request.

M1 — Multiple deliverables, an explicitly selected workflow, or a risk that a
schema/summary omits requested work: make a short request-to-delivery mapping.
Bind each obligation to its original request, domain owner, delivery location
and acceptance relationship. Schema conformance does not replace completeness.

M2 — Consumption across executors or stages: record the work and attempt IDs,
input objects, actual terminal state, outputs, verification evidence, failures
and unresolved work. Consume only successful, matching, currently applicable
results under current authorization. Existence or a completion claim is not a
successful terminal state. Preserve failed attempts; retry only within permission.

M3 — A decision-relevant correction, authorization change, drift or recovery:
derive the current effective state from the original events and their scope,
authority and supersession relationships. Keep the original goal, current
authorization, completed effects, failures, unfinished dependencies and next
permitted action. A newer untrusted copy cannot supersede an accepted source.
Recheck affected results while preserving unaffected work and prior evidence.

Default to one executor. Delegate only independent necessary work when actually
available, authorized, with clear input/output ownership and shared resource
accounting. This trial permits at most the main executor and one child executor;
when delegation is unverified, use the same dependencies sequentially and report
the limitation. Revocation stops new affected work and requests cancellation;
claim stopped only after observing actual terminal state and stopped effects.

Keep these records in permitted messages or existing authorized output fields;
they grant no additional files. Final delivery checks current permission, the
complete request, domain semantics, cross-output consistency and actual results.
Independent assessment remains external to this executor's completion claims.
`;

const S_PATCHES = [
  {
    id: 'K2', uses: ['USE-02', 'USE-03', 'USE-04', 'USE-10'],
    removed: 'Unconditional full routing classification for every non-mechanical bounded task.',
    trigger: 'Bounded task without framework, skill, project, memory or cross-session recovery semantics.',
    retainedVia: 'Task owner directly; true Plan triggers and all scope/human controls remain applicable.',
    replacement: `## K2 — Task entry

For a bounded task unrelated to framework, skill, project, memory or cross-session
recovery, read the supplied task owner and complete the request directly. Still
apply K3's true Plan triggers and the existing approved scope. Do not add a
framework workflow or repeat a method choice already explicitly settled.
For actual framework/skill/project work, retain the routing order: Project Gate,
Plan complexity, Framework Flow, Multi-Skill, Single-Skill, STOP/NONE semantic
assessment. Use .claude/skill-os/skill-routing-map.yaml and the relevant owners.
Only a user-selected Workflow activates workflow handoff gates.
`,
  },
  {
    id: 'K4', uses: ['USE-02', 'USE-04', 'USE-08'],
    removed: 'Full framework catalog discovery before direct unrelated bounded work or repeating a settled method choice.',
    trigger: 'No genuine framework skill discovery or unresolved semantic selection is needed.',
    retainedVia: 'Explicit method authority; catalog and routing-map on actual discovery/ambiguity.',
    replacement: `## K4 — Relevant discovery

Follow an explicitly selected applicable method by reading its exact authority;
do not repeat catalog discovery solely to reconfirm that settled choice. Direct
invocation still obeys Plan and safety. When a framework skill must be discovered,
or the choice is genuinely unresolved, read .claude/skill-os/generated/skill-catalog.md
through FILE_END before selection. Route semantically and name the exact skill
and authority. Ambiguity needing a human choice requires a real response; STOP
does not grant permission. A bounded unrelated task uses its supplied owner.
`,
  },
];

function simplifyRoot(bytes) {
  let text = bytes.toString('utf8');
  const patches = [];
  for (const patch of S_PATCHES) {
    const pattern = new RegExp(`(<!-- ${patch.id}:START -->\\n)[\\s\\S]*?(<!-- ${patch.id}:END -->)`);
    if ((text.match(new RegExp(`<!-- ${patch.id}:START -->`, 'g')) || []).length !== 1
        || !pattern.test(text)) fail('PATCH_CONTEXT', patch.id);
    text = text.replace(pattern, `$1${patch.replacement}$2`);
    patches.push({ ...patch });
  }
  const startup = /Minimal \*\*startup\*\* applies only to non-trivial work\.[\s\S]*?(?=4\. Only with a verified project pin)/;
  if (!startup.test(text)) fail('PATCH_CONTEXT', 'K10 startup boundary');
  text = text.replace(startup, `Startup is conditional on the actual task semantics. For a bounded task without
framework, skill, project, memory or cross-session recovery semantics, read the
supplied task owner directly. Keep all applicable permissions, true Plan triggers,
approved scope, human decisions, failure/evidence and memory controls.
When those framework/skill/project/memory/recovery semantics apply:
1. Use the existing summary/search startup via python3 memory/scripts/get_memory.py --summary.
2. Read CONTEXT.md through EOF.
3. Read .claude/skill-os/generated/context-index.md through FILE_END and applicable
   owners through EOF by their load_before boundaries. Missing/unreadable/stale
   index falls back to the complete .claude/skill-os/agent-context-manifest.json.
`);
  patches.push({
    id: 'K10-startup', uses: ['USE-08', 'USE-09', 'USE-12'],
    removed: 'Unconditional memory summary, framework CONTEXT and index for unrelated bounded tasks.',
    trigger: S_PATCHES[0].trigger,
    retainedVia: 'Same original files for matching semantics; supplied domain owner for bounded tasks. K10 step 4 onward and K8 unchanged.',
  });
  return { bytes: Buffer.from(text), patches };
}

function safeRelative(path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || /[\\\x00-\x1f:]/.test(path)
      || path.split('/').some(part => !part || part === '.' || part === '..')) {
    fail('UNSAFE_PATH', String(path));
  }
  return path;
}

function isMaterial(path) {
  if (path.split('/').some(part => /^(?:private|hidden|archive|archives|answers?|expected|cases|fixtures|developer-cases|hidden-cases)(?:[.-]|$)/i.test(part))) return false;
  if (/(?:^|\/)(?:test[-.]|[^/]*fixtures?\.)/.test(path)) return false;
  if (['AGENTS.md', 'CONTEXT.md', 'memory/semantic/promoted-facts.yaml',
    'memory/semantic/static-fallback-allowlist.txt'].includes(path)) return true;
  if (/^\.claude\/(?:agents|skills|skill-os)\//.test(path)) return true;
  if (/^\.claude\/hooks\//.test(path)) return true;
  // Runtime helpers are available as frozen source, not installed or invoked.
  // Evaluation drivers, test fixtures and installation/configuration entrypoints
  // are deliberately not candidate materials.
  if (/^scripts\/(?:test-|run-|agent-context-branch-fixtures|baselines\/|install-|codex-trust-|source-guard-test-)/.test(path)) return false;
  if (/^scripts\//.test(path)) return true;
  return MEMORY_HELPERS.includes(path) || CODEX_MATERIALS.includes(path);
}

function isReadMaterial(path) {
  return ['AGENTS.md', 'CONTEXT.md'].includes(path)
    || (/^(?:\.claude\/(?:agents|skills|skill-os)\/|\.agents\/skills\/|memory\/semantic\/)/.test(path)
      && /\.(?:md|yaml|yml|json|txt)$/.test(path))
    || path === '.codex/MODEL_ROUTING.md'
    || /^\.codex\/agents\/[^/]+\.toml$/.test(path);
}

function relativeImportClosure(files) {
  const names = new Set(files.map(file => file.record.path)), edges = [];
  for (const file of files) {
    if (!/\.(?:mjs|js)$/.test(file.record.path)) continue;
    // Exact relative ESM imports are closed without executing source. Dynamic
    // computed paths, external packages and optional data are not proven here.
    const pattern = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["'](\.[^"']+)["']/g;
    for (const match of file.bytes.toString('utf8').matchAll(pattern)) {
      const target = posix.normalize(posix.join(posix.dirname(file.record.path), match[1]));
      safeRelative(target);
      if (!names.has(target)) fail('MISSING_RUNTIME_DEPENDENCY', `${file.record.path} -> ${target}`);
      edges.push({ from: file.record.path, to: target });
    }
  }
  return edges.sort((a, b) => `${a.from}\0${a.to}` < `${b.from}\0${b.to}` ? -1 : 1);
}

function nativeSkillAliases(files) {
  const owners = new Map();
  for (const file of files) {
    const match = file.record.path.match(/^\.claude\/skills\/(?:office\/)?([^/]+)\/SKILL\.md$/);
    if (!match) continue;
    const ownerRoot = posix.dirname(file.record.path), name = match[1];
    if (owners.has(name) && owners.get(name) !== ownerRoot) fail('SKILL_ALIAS_COLLISION', name);
    owners.set(name, ownerRoot);
  }
  // Native discovery walks nested owners. Copy an owner tree only once: copying
  // both office and office/auto made the same skill appear twice in skills/list.
  return [...owners].filter(([, ownerRoot]) => ![...owners.values()].some(other =>
    other !== ownerRoot && ownerRoot.startsWith(other + '/')))
    .sort(([a], [b]) => a < b ? -1 : 1).map(([name, ownerRoot]) => ({
    name, ownerRoot, path: `.agents/skills/${name}`,
    files: files.filter(file => file.record.path.startsWith(ownerRoot + '/')),
  }));
}

function checkedParent(root, path) {
  let current = root;
  for (const part of path.split('/').slice(0, -1)) {
    current = join(current, part);
    const stat = lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail('SOURCE_PARENT', path);
  }
}

function prepareSources(sourceRoot, manifestPath, conditionId) {
  const root = realpathSync(sourceRoot);
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes);
  if (!Array.isArray(manifest.tracked_sources) || !manifest.tracked_sources.length
      || realpathSync(manifest.root) !== root) fail('MANIFEST_SCOPE', 'source root or records');
  const seen = new Set();
  const records = manifest.tracked_sources.map(record => {
    const path = safeRelative(record.path);
    if (seen.has(path)) fail('DUPLICATE_SOURCE', path);
    seen.add(path);
    if (!['file', 'symlink-text-not-target'].includes(record.kind)
        || !/^[a-f0-9]{64}$/.test(record.sha256) || !Number.isSafeInteger(record.bytes)
        || record.bytes < 0) fail('MANIFEST_RECORD', path);
    return record;
  });
  const selected = records.filter(record => isMaterial(record.path));
  const files = [], links = [], omissions = [];
  for (const record of selected) {
    checkedParent(root, record.path);
    const full = join(root, record.path), stat = lstatSync(full);
    const link = record.kind === 'symlink-text-not-target';
    if (link ? !stat.isSymbolicLink() : !stat.isFile() || stat.isSymbolicLink()) fail('SOURCE_KIND', record.path);
    const bytes = link ? Buffer.from(readlinkSync(full)) : readFileSync(full);
    if (bytes.length !== record.bytes || hash(bytes) !== record.sha256) fail('SOURCE_DRIFT', record.path);
    if (link) {
      const target = bytes.toString('utf8');
      if (isAbsolute(target) || /[\\\x00-\x1f:]/.test(target)) fail('SYMLINK_ESCAPE', record.path);
      const resolved = posix.normalize(posix.join(posix.dirname(record.path), target));
      if (resolved === '..' || resolved.startsWith('../')) fail('SYMLINK_ESCAPE', record.path);
      links.push({ record, bytes, target, resolved });
    } else files.push({ record, bytes, mode: stat.mode & 0o111 ? 0o755 : 0o644 });
  }
  const fileNames = new Set(files.map(item => item.record.path));
  for (const required of REQUIRED_MATERIALS) {
    if (!fileNames.has(required)) fail('MISSING_BASELINE', required);
  }
  const importEdges = relativeImportClosure(files);
  const skillAliases = nativeSkillAliases(files);
  // Resolve only against frozen regular-file records. No source link is followed
  // to discover files. Aliases become ordinary files, so every visible byte is
  // covered by the same material digest and case_read can allow exact paths.
  const safeLinks = links.filter(item => {
    const represented = [...fileNames].some(path => path === item.resolved || path.startsWith(item.resolved + '/'));
    const collision = files.some(file => file.record.path.startsWith(item.record.path + '/'));
    if (collision) fail('MANIFEST_COLLISION', item.record.path);
    if (!represented) omissions.push({ path: item.record.path, reason: 'link target is outside copied frozen materials', sha256: item.record.sha256 });
    return represented;
  });
  let patches = [];
  if (conditionId === 'S') {
    const entry = files.find(item => item.record.path === 'AGENTS.md');
    const result = simplifyRoot(entry.bytes);
    entry.bytes = result.bytes; patches = result.patches;
  }
  return { root, manifestSha: hash(manifestBytes), files, links: safeLinks, patches, omissions,
    importEdges, skillAliases,
    excluded: records.filter(record => !isMaterial(record.path)).map(record => record.path) };
}

function materialDigest(root) {
  const rows = [];
  const visit = (directory, prefix = '') => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = prefix + entry.name, full = join(directory, entry.name);
      if (entry.isDirectory()) visit(full, path + '/');
      else if (entry.isFile()) rows.push({ path, sha256: hash(readFileSync(full)) });
      else fail('MATERIAL_KIND', path);
    }
  };
  visit(root);
  rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return hash(JSON.stringify(rows));
}

/** Build materials only. This is not a native-hook installer or run release. */
export async function materializeCondition({ conditionId, sourceRoot, sourceManifestPath, destination }) {
  if (!CONDITION_IDS.includes(conditionId)) fail('CONDITION_ID', String(conditionId));
  if (typeof destination !== 'string' || !isAbsolute(destination)) fail('DESTINATION', 'absolute new path required');
  const requested = resolve(destination);
  const root = join(realpathSync(dirname(requested)), requested.split(sep).at(-1));
  const baseline = ['B', 'S'].includes(conditionId);
  const source = baseline ? prepareSources(sourceRoot, sourceManifestPath, conditionId) : null;
  const canonicalSource = source?.root || (sourceRoot ? realpathSync(sourceRoot) : null);
  if (canonicalSource && (inside(canonicalSource, root) || inside(root, canonicalSource))) fail('SOURCE_DESTINATION_OVERLAP', root);
  // Exclusive mkdir is the ownership boundary. An existing file, directory or
  // symlink is never replaced, even if its bytes match a previous build.
  mkdirSync(root, { mode: 0o700 });
  try {
    const sourceBindings = [], allowedReadPaths = [];
    const write = (path, bytes, mode = 0o644) => {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), bytes, { flag: 'wx', mode });
      if (isReadMaterial(path)) allowedReadPaths.push(path);
    };
    if (source) {
      for (const item of source.files) {
        const path = item.record.path;
        write(path, item.bytes, item.mode);
        sourceBindings.push({ source: join(source.root, path), path, kind: 'file',
          sourceSha256: item.record.sha256, copySha256: hash(readFileSync(join(root, path))),
          sourceBytes: item.record.bytes, copyBytes: item.bytes.length,
          sourceManifestSha256: source.manifestSha,
          patch: path === 'AGENTS.md' && conditionId === 'S' ? source.patches : null });
      }
      for (const item of source.links) {
        const targets = source.files.filter(file => file.record.path === item.resolved
          || file.record.path.startsWith(item.resolved + '/'));
        for (const target of targets) {
          const path = item.record.path + target.record.path.slice(item.resolved.length);
          write(path, target.bytes, target.mode);
          sourceBindings.push({ source: join(source.root, target.record.path), path,
            kind: 'expanded-symlink-file', sourceSha256: target.record.sha256,
            sourceBytes: target.record.bytes, copyBytes: target.bytes.length,
            copySha256: hash(readFileSync(join(root, path))),
            sourceManifestSha256: source.manifestSha,
            patch: { operation: 'expand-internal-link', linkPath: item.record.path,
              linkSha256: item.record.sha256, target: item.target } });
        }
      }
      for (const alias of source.skillAliases) {
        for (const item of alias.files) {
          const path = alias.path + item.record.path.slice(alias.ownerRoot.length);
          write(path, item.bytes, item.mode);
          sourceBindings.push({ source: join(source.root, item.record.path), path,
            kind: 'generated-native-skill-file', sourceSha256: item.record.sha256,
            copySha256: hash(item.bytes), sourceBytes: item.record.bytes, copyBytes: item.bytes.length,
            sourceManifestSha256: source.manifestSha,
            patch: { operation: 'copy-frozen-skill-owner', ownerRoot: alias.ownerRoot,
              generatedAlias: alias.path, originalAliasRead: false } });
        }
      }
    } else {
      const bytes = Buffer.from(conditionId === 'T' ? NATIVE : INDEPENDENT);
      write('AGENTS.md', bytes);
      sourceBindings.push({ source: 'u007-implementation-contract.md#2', sourceSha256: CONTRACT_SHA,
        ...(conditionId === 'I' ? { designSource: 'u005-independent-design.md §§2–4', designSha256: DESIGN_SHA } : {}),
        path: 'AGENTS.md', kind: 'compiled-instruction', copySha256: hash(bytes), patch: null });
    }
    return {
      id: conditionId, root, instructionFiles: ['AGENTS.md'], allowedReadPaths: allowedReadPaths.sort(),
      materialSha256: materialDigest(root),
      sourceBindings,
      complexity: {
        units: { entryInstructions: 1, copiedSourceRecords: sourceBindings.filter(x => x.kind !== 'compiled-instruction').length,
          entryObligationPatches: source?.patches.length || 0, conditionalHandoffMechanisms: conditionId === 'I' ? 3 : 0 },
        patches: source?.patches || [], excludedSourcePaths: source?.excluded || [],
        omittedLinks: source?.omissions || [], actualUserQuestions: null, actualHandoffs: null,
        actualTokens: null, maintenanceTime: null,
        ...(source ? { materialClosure: {
          requiredPaths: [...REQUIRED_MATERIALS].sort(), relativeImports: source.importEdges,
          nativeSkillAliases: source.skillAliases.map(alias => ({ name: alias.name,
            path: alias.path, ownerRoot: alias.ownerRoot, fileCount: alias.files.length,
            bytes: alias.files.reduce((sum, file) => sum + file.bytes.length, 0),
            limitation: 'Generated ordinary copies of frozen owners; existing local aliases were not read. Native discovery/adoption is unverified.' })),
          missingFrozenCapabilities: [
            '.claude/workflows/*.js and CLAUDE.md are absent from U002; workflow execution and Claude-root parity are not reproduced.',
            'Private model bindings, global/personal memory, episodic/eval history and real project/session state are not supplied.',
            'External MagicPath alias target is not followed; any generated magicpath skill uses only its frozen office owner.',
          ],
        } } : {}),
      },
      limitations: [
        'BUILD_ONLY: no model, native tool, hook, delegation, recovery or semantic-quality behavior has been verified.',
        'The driver supplies identical current-stage request, domain owner, facts and permissions; these materials grant no effects.',
        'Filesystem copying is not an OS read boundary. Driver isolation, native reads and child access require independent verification.',
        ...(source ? [
          'B/S includes frozen memory helpers, Codex backend sources and generated native skill materials. It does not install hook registrations, trust, project config or global memory.',
          'Current observed production metadata has 11 project hooks disabled; this is entry/time-specific evidence, not historical or all-host equivalence. No hook activation is required or performed by this builder.',
          'Declared material dependencies and literal relative ESM imports are present. Computed paths, workflow bodies, runtime packages, native discovery, private state and actual permission enforcement remain unverified.',
          'Excluded sources and unrepresented links are listed in complexity. A qualified B requires readiness review before relative comparison.',
        ] : []),
        ...(conditionId === 'S' ? ['S changes only three root entry obligations; downstream owner bytes remain unchanged. Behavioral equivalence is unverified.'] : []),
      ],
    };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}
