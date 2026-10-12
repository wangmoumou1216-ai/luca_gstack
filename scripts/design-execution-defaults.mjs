import { createHash } from 'node:crypto';

const fail = code => { throw Object.assign(new Error(code), { code }); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const slug = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
const cdDisplayName = (topic, handoffId) => {
  const singleLine = topic.replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]+/g, ' ').replace(/\s+/g, ' ').trim();
  let name = '';
  for (const point of singleLine) {
    if (name.length + point.length > 120) break;
    name += point;
  }
  return name.trim() || `Design ${handoffId}`;
};

/** Parameter policy only. The caller has already resolved the real tool choice and
 * verified frozen facts and confirmation sources. Returned names are proposals,
 * never remote identities or grants. Stage/create/run/recover keep their own gates.
 */
export function resolveDesignExecutionDefaults({
  selectedTool, topic, handoffId, operation = 'stage', target = null,
  generationMode, platform, fidelity, designSystem = null,
  unresolvedDesignQuestions = [], knownProjectIds = [],
}) {
  if (!['open-design', 'claude-design'].includes(selectedTool)) fail('SELECTED_TOOL_REQUIRED');
  if (!['stage', 'recover'].includes(operation)) fail('UNKNOWN_DESIGN_OPERATION');
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(handoffId ?? '')) fail('HANDOFF_ID_REQUIRED');
  if (!Array.isArray(unresolvedDesignQuestions) || unresolvedDesignQuestions.length) fail('RETURN_BRIEF_UNRESOLVED_DESIGN');
  for (const value of [platform, fidelity]) if (value !== undefined && !nonempty(value)) fail('RETURN_BRIEF_INVALID_PARAMETER');
  if (target !== null && (target.tool !== selectedTool ||
    !(selectedTool === 'open-design' ? slug(target.projectId) : nonempty(target.workspaceId)))) fail('BOUND_TARGET_REQUIRED');
  if (operation === 'recover') {
    if (!target) fail('RECOVERY_IDENTITY_REQUIRED');
    // Preserve caller binding only; the host still checks the exact artifact/revision,
    // lease and current recovery authority before reading or exporting output.
    return { operation, selectedTool, boundTarget: structuredClone(target), proposedTarget: null,
      generationMode: null, parameterQuestions: [], executionAuthority: 'NOT_PROVIDED' };
  }
  const mode = generationMode ?? (selectedTool === 'open-design' ? 'headless' : 'manual');
  if (selectedTool === 'claude-design' && mode !== 'manual') fail('CD_MANUAL_GENERATION_REQUIRED');
  if (selectedTool === 'open-design' && !['headless', 'desktop'].includes(mode)) fail('UNKNOWN_OD_GENERATION_MODE');
  let proposedTarget = null;
  if (!target) {
    if (!nonempty(topic)) fail('TOPIC_REQUIRED');
    const name = topic.trim();
    if (selectedTool === 'open-design') {
      if (!Array.isArray(knownProjectIds) || knownProjectIds.some(id => !slug(id))) fail('INVALID_PROJECT_INVENTORY');
      const prefix = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 44).replace(/-$/, '') || 'design';
      const suffix = createHash('sha256').update(JSON.stringify([selectedTool, name, handoffId])).digest('hex').slice(0, 12);
      const projectId = `${prefix}-${suffix}`;
      if (knownProjectIds.includes(projectId)) fail('TARGET_COLLISION_INSPECT_CURRENT_RESULT');
      proposedTarget = { name, projectId, creation: 'create-only' };
    } else {
      // CD owns opaque workspace/artifact IDs; a display name cannot stand in for one.
      proposedTarget = { name: cdDisplayName(name, handoffId), creation: 'create-only' };
    }
  }
  if (designSystem !== null && (designSystem.tool !== selectedTool || !nonempty(designSystem.sourceRef) ||
    !['current', 'bound', 'none'].includes(designSystem.choice) ||
    (designSystem.choice !== 'none' && !nonempty(designSystem.configurationRef)))) fail('DESIGN_SYSTEM_CONFIRMATION_REQUIRED');
  return {
    operation, selectedTool, boundTarget: target ? structuredClone(target) : null, proposedTarget,
    generationMode: mode, platform: platform ?? 'responsive-web', fidelity: fidelity ?? 'high',
    designSystem: designSystem ? structuredClone(designSystem) : null,
    parameterQuestions: designSystem ? [] : ['design-system'],
    executionAuthority: 'NOT_PROVIDED',
  };
}
