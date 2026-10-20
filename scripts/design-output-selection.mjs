import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute } from 'node:path';

const tools = new Set(['open-design', 'claude-design']);
const sha = value => createHash('sha256').update(value).digest('hex');
const fail = code => { throw new Error(code); };
const validTool = value => tools.has(value) || fail('UNKNOWN_DESIGN_TOOL');

/** Local identity check only. Caller owns read/write authority and verifies real user sources.
 * packet.tool is the caller's verified frozen target (null means explicitly unselected).
 * Never infer a target from arbitrary prose, a filename, a recommendation or tool availability.
 */
export function resolveDesignOutput({ packet, task, choice = null, selection = null }) {
  if (!packet || !isAbsolute(packet.path ?? '') || !/^[a-f0-9]{64}$/.test(packet.sha256 ?? '')) fail('PACKET_IDENTITY_REQUIRED');
  if (packet.tool !== null) validTool(packet.tool);
  const packetPath = realpathSync(packet.path);
  if (packetPath !== packet.path || sha(readFileSync(packetPath)) !== packet.sha256) fail('PACKET_DRIFT');
  if (!task || typeof task !== 'object' || Array.isArray(task) || !task.source_ref || !task.scope || !task.execution_mode) fail('FULL_TASK_REQUIRED');
  const preservedTask = structuredClone(task);
  const taskHash = sha(JSON.stringify(preservedTask));
  const identity = { path: packetPath, sha256: packet.sha256, tool: packet.tool };
  if (selection) {
    if (selection.schema_version !== 1 || JSON.stringify(selection.packet) !== JSON.stringify(identity)
      || selection.task_sha256 !== taskHash || JSON.stringify(selection.task) !== JSON.stringify(preservedTask)
      || !selection.choice_source_ref) fail('SELECTION_DRIFT');
    validTool(selection.tool);
    if (packet.tool && packet.tool !== selection.tool) fail('FROZEN_TOOL_CONFLICT_RETURN_BRIEF');
  }
  if (choice) {
    validTool(choice.tool);
    if (typeof choice.source_ref !== 'string' || !choice.source_ref.trim()) fail('REAL_CHOICE_SOURCE_REQUIRED');
  }
  const tool = choice?.tool ?? selection?.tool ?? packet.tool;
  if (packet.tool && tool !== packet.tool) fail('FROZEN_TOOL_CONFLICT_RETURN_BRIEF');
  if (selection && choice && selection.tool !== choice.tool) fail('SELECTION_CONFLICT_RETURN_BRIEF');
  if (!tool) return { status: 'NEEDS_CONTEXT', question: 'choose-design-tool', task: preservedTask, node: null };
  const record = selection ?? {
    schema_version: 1, packet: identity, task: preservedTask, task_sha256: taskHash,
    tool, choice_source_ref: choice?.source_ref ?? packet.choice_source_ref,
  };
  if (typeof record.choice_source_ref !== 'string' || !record.choice_source_ref.trim()) fail('REAL_CHOICE_SOURCE_REQUIRED');
  return { status: 'SELECTED', tool, node: tool, task: preservedTask, selection: structuredClone(record) };
}
