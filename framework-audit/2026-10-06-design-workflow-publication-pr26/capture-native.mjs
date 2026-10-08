import fs from 'node:fs';
import path from 'node:path';
import {readActivation} from '/Users/luca/.codex/worktrees/a379/luca_gstack/scripts/model-route-host.mjs';

const [label, agentId] = process.argv.slice(2);
if (!label || !agentId || !/^[a-zA-Z0-9_-]+$/.test(label)) throw Error('label and exact native agent ID required');
const state = readActivation({harness:'codex', root_session_id:'01a10eac-b920-7303-af95-dc419099c22b'});
const calls = Object.values(state.invocations).filter(x=>x.external_identity?.agent_id === agentId);
const call = calls.at(-1);
if (!call || call.status !== 'accepted') throw Error('same-invocation adoption/completion is not accepted');
const match = /^codex-transcript:(.+):(01[a-z0-9-]+)$/.exec(call.evidence_ref);
if (!match) throw Error('native transcript evidence missing');
const events = fs.readFileSync(match[1], 'utf8').trim().split('\n').map(x=>JSON.parse(x));
const messages = events.filter(x=>x.type==='response_item' && x.payload?.type==='message' && x.payload.role==='assistant')
  .map(x=>(x.payload.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('\n')).filter(Boolean);
const report = messages.findLast(x=>x.includes('EVAL_ENVELOPE_JSON')) || messages.at(-1);
if (!report) throw Error('native response unavailable');
const out = path.dirname(new URL(import.meta.url).pathname);
fs.writeFileSync(path.join(out, `${label}-native-receipt.json`), JSON.stringify(call,null,2)+'\n');
fs.writeFileSync(path.join(out, `${label}-review.md`), report+'\n');
if (report.includes('EVAL_ENVELOPE_JSON')) {
  const envelope = JSON.parse(report.split('EVAL_ENVELOPE_JSON').at(-1).trim());
  fs.writeFileSync(path.join(out, `${label}-envelope.json`), JSON.stringify(envelope,null,2)+'\n');
}
console.log(JSON.stringify({label,status:call.status,agent_id:agentId,invocation_id:call.invocation_id,report_path:path.join(out,`${label}-review.md`)}));
