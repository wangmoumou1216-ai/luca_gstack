#!/usr/bin/env node
import { appendFileSync, readFileSync } from 'fs';
import { createHash } from 'crypto';

const raw = readFileSync(0, 'utf8');
let payload = null;
try { payload = JSON.parse(raw); } catch { payload = null; }

const typeOf = (value) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const prompt = payload && typeof payload === 'object'
  ? String(payload.prompt ?? payload.message ?? '')
  : '';
const record = {
  captured_at: new Date().toISOString(),
  raw_sha256: createHash('sha256').update(Buffer.from(raw, 'utf8')).digest('hex'),
  prompt_sha256: createHash('sha256').update(Buffer.from(prompt, 'utf8')).digest('hex'),
  prompt_utf8_bytes: Buffer.byteLength(prompt, 'utf8'),
  keys: payload && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.keys(payload).sort()
    : [],
  types: payload && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, typeOf(value)]))
    : {},
  native_identity_fields: payload && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.fromEntries(
        ['session_id', 'turn_id', 'prompt_id', 'user_message_id', 'transcript_path', 'hook_event_name', 'cwd']
          .filter((key) => Object.hasOwn(payload, key))
          .map((key) => [key, payload[key]]),
      )
    : {},
  raw_input: payload,
};

const out = process.env.LRS_CENSUS_OUT;
if (!out) process.exitCode = 2;
else appendFileSync(out, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });
