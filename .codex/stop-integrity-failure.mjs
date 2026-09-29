// Loaded only from LUCA_PROTECTED_CODE_ROOT by the exact trusted Stop command.
// Never import the workspace whose source digest has just failed.
import { readFileSync } from 'node:fs';
import { readProjectState, attestPendingProjectEvent, closeAttestedProjectEvent }
  from '../.claude/hooks/lib/project-substrate.mjs';
import { revokeProjectEvent } from '../.claude/hooks/lib/project-event-closure.mjs';

const root = process.env.LUCA_CHILD_SOURCE_ROOT;
let result = 'recovery required';
try {
  const payload = JSON.parse(readFileSync(0, 'utf8'));
  if (payload.hook_event_name !== 'Stop' || !payload.session_id || payload.cwd !== root) {
    throw new Error('Stop identity does not match this source root');
  }
  const state = readProjectState(root, payload.session_id).value;
  const current = state.event_control?.current;
  const boundary = String(payload.turn_id || payload.prompt_id || current?.boundary_id || '');
  if (!current && !state.event_control?.candidates?.length) result = 'no active event';
  else {
    try {
      const observed = attestPendingProjectEvent({ gstackRoot: root,
        sessionId: payload.session_id, boundaryId: boundary, cwd: root,
        observation: 'stop', transcriptPath: payload.transcript_path || '',
        codexHome: process.env.CODEX_HOME || '', assistantText: payload.last_assistant_message || '' });
      if (observed.event?.status === 'active') {
        revokeProjectEvent(root, payload.session_id, observed.event);
        result = 'event revoked';
        closeAttestedProjectEvent({ gstackRoot: root, sessionId: payload.session_id,
          eventId: observed.event.event_id, boundaryId: observed.event.boundary_id });
      } else result = 'no active event';
    } catch (error) {
      if (error?.details?.stale_stop || error?.code === 'STOP_WITNESS_AMBIGUOUS') result = 'unattributed Stop ignored';
      else if (current?.status === 'active' && current.boundary_id === boundary
          && !state.event_control?.candidates?.length) {
        revokeProjectEvent(root, payload.session_id, current);
        result = 'event quarantined';
      }
      process.stderr.write(`[Stop recovery] ${error.code || 'ERROR'}: ${error.message}\n`);
    }
  }
} catch (error) {
  process.stderr.write(`[Stop recovery] ${error.code || 'ERROR'}: ${error.message}\n`);
}
process.stdout.write(JSON.stringify({ continue: false,
  stopReason: `Stop hook integrity or execution failed; ${result}. This turn is stopped; restore reviewed source before continuing.` }));
