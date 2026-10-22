// Pure registration owner. No filesystem, installer, native RPC or project selection.
// Recognition is not release adoption or native trust. The fixed digests below
// cover complete reviewed registration semantics, never the current source hash.
import { createHash } from 'node:crypto';

export const CONTRACT_SCHEMA_VERSION = 1;
export const CONTRACT_API_MAJOR = 1;
export const MAX_DOCUMENT_BYTES = 256 * 1024;
export const MAX_REPORT_BYTES = 128 * 1024;
const PROTOCOL = 'native-trust-v1';
const PREVIOUS = '071dcae5ae935ce15318dea12d1deaee3cddec60c74bda6d82ec1c422eb885e4';
const CURRENT = 'c6ef2efa3fcb18e91163f4c2dd25277d8c568ae82c490949d47aeff549601c45';
const REVISIONS = new Map([[PREVIOUS, 'native-trust-v1.1'], [CURRENT, 'native-trust-v1.2']]);
const REQUIRED_CAPABILITIES = ['host-launch-v1'];
const CODEX_CAPABILITIES = ['hooks-list-v1', 'native-hook-trust-v1', 'config-read-v1', 'config-batch-write-cas-v1'];
// Stable identities are explicitly assigned per reviewed version. They are not
// inferred from positions or command strings and must never be written to hooks.json.
const LOCATIONS = [
  ['session-restore', 'SessionStart', 'session_start', 0],
  ['model-route-root', 'SessionStart', 'session_start', 1],
  ['route-guard', 'UserPromptSubmit', 'user_prompt_submit', 0],
  ['project-scope-guard', 'PreToolUse', 'pre_tool_use', 0],
  ['model-route-tool', 'PreToolUse', 'pre_tool_use', 1],
  ['post-edit', 'PostToolUse', 'post_tool_use', 0],
  ['session-sync', 'Stop', 'stop', 0],
  ['model-route-subagent-start', 'SubagentStart', 'subagent_start', 0],
  ['model-route-subagent-stop', 'SubagentStop', 'subagent_stop', 0],
  ['session-end', 'SessionEnd', 'session_end', 0],
  ['model-route-session-end', 'SessionEnd', 'session_end', 1],
].map(([id, event, nativeEvent, groupIndex]) => ({ id, event, nativeEvent, groupIndex, hookIndex: 0,
  nativeKeySuffix: `:${nativeEvent}:${groupIndex}:0` }));
const REVIEWED_LOCATIONS = new Map([[PREVIOUS, LOCATIONS], [CURRENT, LOCATIONS]]);
const TRANSITION = {
  fromDigest: PREVIOUS, toDigest: CURRENT,
  idMapping: LOCATIONS.map(({ id }) => ({ fromId: id, toId: id })),
  allowedActions: ['replace-owned-registration', 'refresh-existing-native-trust', 'disable-framework-duplicates'],
  // This is a semantic review reference, never a machine-generated adoption receipt.
  reviewRef: 'luca-hook-upgrade/R2/sha256:351bb15c514a9c64156c1dea60774ac1d9ef3e408a447f5c2bbe516bf55cf13f#U-002',
  changes: [{ id: 'model-route-tool', field: 'matcher',
    before: '^(Bash|Agent|spawn_agent|collaboration__spawn_agent|collaborationspawn_agent)$',
    after: '^(Bash|Agent|spawn_agent|collaboration__spawn_agent|collaborationspawn_agent|followup_task|send_message|collaboration__followup_task|collaborationfollowup_task|collaboration__send_message|collaborationsend_message)$' }],
};
const sha = value => createHash('sha256').update(value).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (object(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function fields(value, allowed, required, label) {
  if (!object(value) || required.some(key => !Object.hasOwn(value, key))
      || Object.keys(value).some(key => !allowed.includes(key))) throw new Error(`INVALID_FIELDS: ${label}`);
}
function validate(document) {
  fields(document, ['description', 'hooks'], ['hooks'], 'document');
  if (Object.hasOwn(document, 'description') && typeof document.description !== 'string') throw new Error('INVALID_DESCRIPTION');
  if (!object(document.hooks) || !Object.keys(document.hooks).length) throw new Error('INVALID_EVENTS');
  const events = new Set(LOCATIONS.map(row => row.event));
  for (const [event, groups] of Object.entries(document.hooks)) {
    if (!events.has(event) || !Array.isArray(groups) || !groups.length || groups.length > 64) throw new Error('INVALID_EVENT_GROUPS');
    for (const group of groups) {
      fields(group, ['matcher', 'hooks'], ['hooks'], 'group');
      if (Object.hasOwn(group, 'matcher') && typeof group.matcher !== 'string') throw new Error('INVALID_MATCHER');
      if (!Array.isArray(group.hooks) || !group.hooks.length || group.hooks.length > 64) throw new Error('INVALID_HOOKS');
      for (const hook of group.hooks) {
        fields(hook, ['type', 'command', 'statusMessage', 'timeoutSec', 'additionalContextLimit', 'async'], ['type', 'command'], 'hook');
        if (hook.type !== 'command' || typeof hook.command !== 'string' || !hook.command.length) throw new Error('INVALID_COMMAND');
        if (Object.hasOwn(hook, 'statusMessage') && typeof hook.statusMessage !== 'string') throw new Error('INVALID_STATUS_MESSAGE');
        for (const field of ['timeoutSec', 'additionalContextLimit']) if (Object.hasOwn(hook, field)
            && (!Number.isSafeInteger(hook[field]) || hook[field] < 0)) throw new Error(`INVALID_OPERATIONAL_FIELD: ${field}`);
        if (Object.hasOwn(hook, 'async') && typeof hook.async !== 'boolean') throw new Error('INVALID_ASYNC');
      }
    }
  }
}

/** Evaluate raw artifact bytes; never echoes unrecognized commands into diagnostics. */
export function evaluateHookDocument(bytes) {
  const result = { recognized: false, classification: 'INVALID', protocol: null, contractRevision: null,
    semanticDigest: null, artifactDigest: null, hooks: [], nativeLocations: [], problems: [] };
  try {
    if (typeof bytes !== 'string' && !Buffer.isBuffer(bytes)) throw new Error('INVALID_DOCUMENT_BYTES');
    if (Buffer.byteLength(bytes) > MAX_DOCUMENT_BYTES) throw new Error('DOCUMENT_TOO_LARGE');
    result.artifactDigest = sha(bytes);
    let document;
    try { document = JSON.parse(bytes.toString()); } catch { throw new Error('INVALID_JSON'); }
    validate(document);
    // Object key order/JSON whitespace and top-level description are presentation.
    // Every registration field and every array position remains in the digest.
    result.semanticDigest = sha(JSON.stringify(canonical(document.hooks)));
    if (!REVISIONS.has(result.semanticDigest)) {
      result.classification = 'UNRECOGNIZED';
      result.problems.push('REGISTRATION_CONTRACT_MISMATCH');
      return result;
    }
    result.recognized = true;
    result.classification = result.semanticDigest === CURRENT ? 'CURRENT' : 'RECOGNIZED_PREVIOUS';
    result.protocol = PROTOCOL;
    result.contractRevision = REVISIONS.get(result.semanticDigest);
    result.nativeLocations = structuredClone(REVIEWED_LOCATIONS.get(result.semanticDigest));
    result.hooks = result.nativeLocations.map(location => {
      const { id, event, groupIndex, hookIndex, nativeKeySuffix } = location;
      const group = document.hooks[event][groupIndex], hook = group.hooks[hookIndex];
      // These are source declarations, not Codex-normalized defaults/metadata.
      // In particular, timeoutSec presence does not establish its CLI interpretation.
      return { id, event, nativeKeySuffix, matcher: group.matcher ?? null,
        executionOrder: { groupIndex, hookIndex }, type: hook.type, command: hook.command,
        timeout: hook.timeoutSec ?? null, additionalContextLimit: hook.additionalContextLimit ?? null,
        statusMessage: hook.statusMessage ?? null, otherOperationalFields: Object.hasOwn(hook, 'async') ? { async: hook.async } : {},
        // Exact field presence matters: an omitted field is not an explicit default.
        operationalFields: structuredClone(hook) };
    });
  } catch (error) { result.problems.push(error.message); }
  return result;
}

/** Compatibility is a negotiation over declared capabilities, not a CLI probe. */
export function checkContractCompatibility(contract, { schemaVersion = 1, contractApiMajor = 1,
  appProtocol = 1, appCapabilities = REQUIRED_CAPABILITIES, codexCapabilities = CODEX_CAPABILITIES } = {}) {
  const problems = [];
  if (!contract || contract.schemaVersion !== schemaVersion) problems.push('UNSUPPORTED_SCHEMA_VERSION');
  if (!contract || contract.contractApiMajor !== contractApiMajor) problems.push('UNSUPPORTED_CONTRACT_API');
  if (contract?.protocol !== PROTOCOL) problems.push('UNSUPPORTED_HOOK_PROTOCOL');
  const range = contract?.supportedAppProtocolRange;
  if (!Number.isSafeInteger(appProtocol) || !range || appProtocol < range.min || appProtocol > range.max) problems.push('UNSUPPORTED_APP_PROTOCOL');
  if (!Array.isArray(contract?.requiredCapabilities) || !Array.isArray(appCapabilities)
      || contract.requiredCapabilities.some(capability => !appCapabilities.includes(capability))) problems.push('MISSING_APP_CAPABILITY');
  if (!Array.isArray(contract?.supportedCodexCapabilities) || !Array.isArray(codexCapabilities)
      || contract.supportedCodexCapabilities.some(capability => !codexCapabilities.includes(capability))) problems.push('MISSING_CODEX_CAPABILITY');
  return { ok: problems.length === 0, problems };
}

/** Describe this recognized source release without granting any adoption. */
export function describeHookContract(bytes, frameworkRootIdentity = null) {
  const evaluated = evaluateHookDocument(bytes);
  if (!evaluated.recognized) return null;
  return { schemaVersion: CONTRACT_SCHEMA_VERSION, contractApiMajor: CONTRACT_API_MAJOR,
    protocol: evaluated.protocol, contractRevision: evaluated.contractRevision, frameworkRootIdentity,
    semanticDigest: evaluated.semanticDigest, artifactDigest: evaluated.artifactDigest,
    requiredCapabilities: [...REQUIRED_CAPABILITIES], supportedAppProtocolRange: { min: 1, max: 1 },
    supportedCodexCapabilities: [...CODEX_CAPABILITIES],
    hooks: evaluated.hooks, nativeLocations: evaluated.nativeLocations,
    recognizedPreviousContracts: [{ protocol: PROTOCOL, contractRevision: REVISIONS.get(PREVIOUS), semanticDigest: PREVIOUS }],
    reviewedTransitions: [structuredClone(TRANSITION)] };
}

/** Classification only. KNOWN_UPGRADE still requires external adoption and state checks. */
export function compareHookDocuments(sourceBytes, documentBytes) {
  const source = evaluateHookDocument(sourceBytes), document = evaluateHookDocument(documentBytes);
  if (!source.recognized) return { state: 'INCOMPATIBLE', transition: null };
  if (!document.recognized) return { state: 'LOCAL_MODIFIED', transition: null };
  if (source.semanticDigest === document.semanticDigest) return {
    state: source.artifactDigest === document.artifactDigest ? 'EQUIVALENT' : 'METADATA_ONLY', transition: null };
  if (document.semanticDigest === TRANSITION.fromDigest && source.semanticDigest === TRANSITION.toDigest) {
    return { state: 'KNOWN_UPGRADE', transition: structuredClone(TRANSITION) };
  }
  return { state: 'INCOMPATIBLE', transition: null };
}
