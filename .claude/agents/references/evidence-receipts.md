# Evidence receipts

Load through EOF before a parent assigns several source slices or measurement arms, before
Orchestrator aggregates their results, or before QG accepts an assertion that depends on that
coverage. This is the sole method owner for source/version/range/method receipts. Existing Plan
assertions, `outputs_produced`, native invocation/adoption receipts and QG/eval envelopes keep
their own meanings. Collection may be serial; a receipt creates no scheduling, permission,
model-identity, task-state or UI-preservation authority.

## 1. Parent freezes the denominator

Before any reader starts, derive every expected slice from the actual task and its assertion
dependencies. Save the exact expected set in a parent-owned task artifact, bind its current
bytes/hash in the dispatch, and retain that original for aggregation and QG. The set is complete
when each requested source/range or measurement arm has a unique `slice_id`, an exact version,
an appropriate method and its dependent assertion IDs. Returned results never define the
denominator. A child cannot delete, rename, replace or reclassify a parent slice; a real scope
change returns to the parent owner and preserves the earlier set and gap history.

Each expected record has exactly these fields:

| Field | Meaning |
|---|---|
| `slice_id` | Stable unique ID in this parent task. |
| `source_locator` | Exact permitted source, candidate or measurement subject; resolve within the actual read scope. |
| `source_sha256_or_version` | Frozen bytes hash or externally verifiable revision/version, with the verification source. |
| `read_or_measure_range` | Exact extent and units: byte/line interval or EOF; measurement subject, sample count/unit and order as applicable. |
| `required_method` | Full method/configuration needed for this claim, including sampling and order where relevant. |
| `required_for_assertions[]` | Exact dependent IDs from the parent's existing assertions. |
| `authority_ref` | Locator of the actual task/read/effect scope; the locator itself grants nothing. |

Requiredness comes from the frozen task and the existing assertion levels, not from reader
success. A slice supporting a required/BLOCKING assertion must close before that dependent
assertion passes. An optional slice or WARNING dependency can remain a gap: withdraw or mark
UNKNOWN only its affected claim, disclose the concern, and continue unrelated satisfied work.
An empty `required_for_assertions` does not erase an explicit required dependency in the task;
the parent must reconcile that discrepancy before dispatch.

## 2. Reader records what actually happened

Return one observed record for every assigned slice, including failed and partial attempts.
Preserve each attempt when retrying. The receipt is complete when an independent consumer can
locate the actual read/measurement output and tell the claimed range/method from the performed
range/method. Put receipt/findings/evidence paths in the existing `outputs_produced` list.

Each observed record has exactly these fields:

| Field | Meaning |
|---|---|
| `slice_id` | The assigned parent ID, unchanged. |
| `actual_source_version` | Version/hash actually inspected, not copied from the expected record. |
| `actual_range` | Extent actually delivered/read or samples actually measured, with units. |
| `actual_method` | Method and full configuration actually used. |
| `method_evidence_ref` | Actual tool-output/process/driver/trace locator permitting spot-check or replay. |
| `findings_ref` | Exact findings or comparison artifact, including evidenced rejection reasons. |
| `reader_identity` | Actual invocation/reader reference; identity claims use the existing native authority. |
| `provenance_level` | State whether evidence is an actual tool observation, independently replayed, or self-report only. |
| `status` | `COMPLETE`, `PARTIAL` or `GAP` for this slice, distinct from the worker's completion status and QG verdict. |
| `gap_reason` | Concrete missing range, wrong version/method, unavailable evidence or dropout; null only for a complete supported slice. |

For EOF, retain all emitted ranges, source version and actual untruncated output references.
Reading a summary supports a summary claim. Hashing an entire file while emitting a prefix does
not establish a full-document read. A hash detects byte drift; an EOF checkbox is a claim.
Neither authenticates reading, comprehension, a source signature, reviewer identity or model.
For a measurement, retain command/driver revision, sample definition, count, sequence, actual
values and stdout/stderr/exit status. An average or conclusion alone cannot replay the method.

## 3. Orchestrator aggregates without dropping evidence

Compare every original parent ID with the unchanged observed collection. Retain N−1 dropouts,
duplicates, extra IDs, partial reads, wrong versions, wrong methods and rejected results in the
aggregate. A rejected result is still evidence of a gap, never a disappearing denominator item.
Preserve the original parent set separately from any child-returned copy. Reconcile range and
method differences before claiming completion; an extra slice cannot compensate for a missing
required one. Retries stay within the existing authority and approved execution policy.

For a comparison/synthesis, read every required candidate to its specified extent before
selecting. In the ordinary findings artifact record the exact base/version and task criteria,
grafts with source candidate/range and compatibility evidence, and each non-adoption reason.
Keep rejected alternatives, rejected grafts and dropouts visible, including convergence with no
useful graft. Verify the resulting artifact against the original required assertions. A base
choice establishes implementation provenance; it does not invent KEEP rules or lock UI choices.
Unresolved human design/scope decisions use the existing Human Gate.

Aggregation completes when every parent slice has a supported observation or an explicit gap,
and every dependent claim has its coverage consequence. Pass that original denominator, all
observations, findings and real evidence references to QG through the existing transport.

## 4. QG checks the claim against the original set

Before accepting each affected criterion:

1. Recover the parent-frozen bytes and task dependencies from their actual authority. Reject a
   child-substituted denominator. Check unique IDs and account for every required slice and
   every duplicate/extra result; choose a retry only with a visible reason and preserved history.
2. Check actual source identity/version, required range (including EOF), method/configuration
   and evidence provenance. `COMPLETE` or a correct self-reported hash cannot repair a mismatch.
3. Open real tool evidence and spot-check the exact source/range. Replay a measurement needed
   by the assertion using the same subject/version, sample unit/count and order; preserve actual
   replay output. For complete-read claims check emitted coverage rather than the hashing span.
   Inaccessible, truncated or merely self-authored proof leaves the dependent claim UNKNOWN.
4. Report the specific gap/rejection and dependent assertion IDs. Missing required coverage,
   wrong source/version/range/method, summary-as-EOF, unsupported provenance or child deletion
   prevents those required claims from passing. Optional gaps downgrade only their claims.
   Use the existing QG report and eval envelope; this reference creates no second verdict.

A deterministic consistency check supplements this consumer work. A fixture evaluator, receipt
JSON, source-regex match or local process replay is not a genuine independent QG verdict. Both
Claude and Codex reach this shared owner from Orchestrator/QG pointers; each native consumer
invocation must be evidenced separately. Missing native capability leaves that claim UNKNOWN.

## Local byte-read and measurement replay example

This executable example checks local fixture byte-read receipts and a byte-length measurement.
It is extracted by `scripts/test-evidence-receipts-contract.mjs`, with real isolated child-process
output and guard-removal controls. Its `input` file is test transport, not a new completion or
task-state schema. Parent hashes and process captures come from the executing test/caller,
separately from reader claims. Arbitrary JSON cannot authenticate that capture's origin. The
consumer still checks its real invocation provenance; other measurement methods require their
own appropriate replay rather than being silently replaced with byte counting.

<!-- RECEIPT_REPLAY_START -->
```javascript
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const equal = (a, b) => { try { assert.deepEqual(a, b); return true; } catch { return false; } };
const fields = (record, names) => equal(Object.keys(record).sort(), [...names].sort());
const expectedFields = ['slice_id', 'source_locator', 'source_sha256_or_version',
  'read_or_measure_range', 'required_method', 'required_for_assertions', 'authority_ref'];
const observedFields = ['slice_id', 'actual_source_version', 'actual_range', 'actual_method',
  'method_evidence_ref', 'findings_ref', 'reader_identity', 'provenance_level', 'status', 'gap_reason'];

// The driver emits the inspected extent, not just a full-file hash or an EOF assertion.
export const driver = `
const fs = require('node:fs');
const crypto = require('node:crypto');
const [path, rangeText, methodText] = process.argv.slice(1);
const range = JSON.parse(rangeText), method = JSON.parse(methodText);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const all = fs.readFileSync(path);
let result;
if (method.kind === 'read' && method.operation === 'emit-bytes') {
  if (range.unit !== 'bytes' || range.start < 0 || range.end > all.length || range.end < range.start)
    throw Error('invalid read range');
  const emitted = all.subarray(range.start, range.end);
  result = {actual_source_version: hash(all), actual_range: {...range, eof: range.end === all.length},
    actual_method: method, content_base64: emitted.toString('base64')};
} else if (method.kind === 'measure' && method.operation === 'byte-length') {
  if (range.unit !== 'samples' || range.start !== 0 || range.end !== method.sample_count ||
      method.sample_unit !== 'one complete file read' || method.order.length !== method.sample_count ||
      method.order.some(subject => subject !== path)) throw Error('invalid measurement method');
  const samples = method.order.map(subject => fs.readFileSync(subject).length);
  result = {actual_source_version: hash(all), actual_range: range, actual_method: method, samples};
} else throw Error('unsupported example method');
process.stdout.write(JSON.stringify(result) + '\\n');
`;

export function replay(input) {
  const parentBytes = readFileSync(input.parent_expected_ref.path);
  assert.equal(digest(parentBytes), input.parent_expected_ref.sha256, 'parent snapshot drift');
  const scopeBytes = readFileSync(input.parent_scope_ref.path);
  assert.equal(digest(scopeBytes), input.parent_scope_ref.sha256, 'parent scope drift');
  assert.deepEqual(input.assertion_levels, JSON.parse(scopeBytes).assertion_levels, 'parent assertion levels changed');
  const expected = JSON.parse(parentBytes), returned = load(input.returned_expected_path);
  if (!equal(expected, returned)) throw Error('child denominator changed'); // denominator guard
  assert.ok(Array.isArray(expected) && expected.length > 0, 'empty parent denominator');
  const ids = expected.map(item => item.slice_id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate expected ID');
  const observed = load(input.observed_path);
  assert.ok(Array.isArray(observed), 'observed must be an array');
  const findings = [], replays = [], blocked = new Set();
  for (const item of observed) {
    assert.ok(fields(item, observedFields), 'observed field mismatch');
    assert.ok(ids.includes(item.slice_id), 'unassigned observed ID');
  }
  for (const wanted of expected) {
    assert.ok(fields(wanted, expectedFields), 'expected field mismatch');
    assert.ok(wanted.authority_ref && Array.isArray(wanted.required_for_assertions), 'missing parent scope');
    for (const id of wanted.required_for_assertions)
      assert.ok(['BLOCKING', 'WARNING'].includes(input.assertion_levels[id]), 'unknown assertion dependency');
    const matches = observed.filter(item => item.slice_id === wanted.slice_id);
    let reason;
    if (matches.length !== 1) reason = matches.length ? 'duplicate observed ID' : 'missing observation';
    else {
      const actual = matches[0];
      if (actual.status !== 'COMPLETE' || actual.gap_reason !== null) reason = actual.gap_reason || 'incomplete observation';
      else if (actual.actual_source_version !== wanted.source_sha256_or_version) reason = 'wrong source version';
      else if (!equal(actual.actual_range, wanted.read_or_measure_range)) reason = 'wrong range or summary-as-EOF';
      else if (!equal(actual.actual_method, wanted.required_method)) reason = 'wrong method';
      else if (!['tool-observed', 'independently-replayed'].includes(actual.provenance_level)) reason = 'self-report only';
      else if (!actual.reader_identity) reason = 'missing reader identity reference';
      else {
        try {
          readFileSync(actual.findings_ref);
          const capture = load(actual.method_evidence_ref);
          const argv = ['-e', driver, wanted.source_locator,
            JSON.stringify(wanted.read_or_measure_range), JSON.stringify(wanted.required_method)];
          assert.equal(capture.command, process.execPath, 'wrong replay executable');
          assert.deepEqual(capture.args, argv, 'wrong captured range/method');
          assert.equal(capture.exit_code, 0, 'capture process failed');
          assert.equal(capture.stderr, '', 'capture process error');
          const fresh = spawnSync(process.execPath, argv, {encoding: 'utf8', timeout: 10000});
          replays.push({slice_id: wanted.slice_id, command: process.execPath, args: argv,
            exit_code: fresh.status, stdout: fresh.stdout, stderr: fresh.stderr});
          assert.equal(fresh.status, 0, 'replay process failed');
          assert.equal(fresh.stderr, '', 'replay process error');
          const result = JSON.parse(fresh.stdout);
          assert.equal(result.actual_source_version, wanted.source_sha256_or_version, 'replayed source drift');
          assert.deepEqual(result.actual_range, wanted.read_or_measure_range, 'replayed range mismatch');
          assert.deepEqual(result.actual_method, wanted.required_method, 'replayed method mismatch');
          assert.deepEqual(JSON.parse(capture.stdout), result, 'capture disagrees with independent replay');
        } catch (error) { reason = `evidence/replay gap: ${error.message}`; }
      }
    }
    if (reason) {
      const dependencies = wanted.required_for_assertions;
      dependencies.filter(id => input.assertion_levels[id] === 'BLOCKING').forEach(id => blocked.add(id));
      findings.push({slice_id: wanted.slice_id, gap_reason: reason, affected_assertions: dependencies});
    }
  }
  return {mechanical_check: blocked.size ? 'REQUIRED_GAP' : findings.length ? 'OPTIONAL_GAP' : 'CONSISTENT',
    expected_count: expected.length, observed_count: observed.length, blocked_assertions: [...blocked], findings, replays,
    native_qg: 'NOT_RUN_BY_THIS_EXAMPLE'};
}

if (process.argv[2]) {
  try {
    const result = replay(load(process.argv[2]));
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = result.blocked_assertions.length ? 1 : 0;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
```
<!-- RECEIPT_REPLAY_END -->

## Source and scope

Adapted from Lauren Tan's pstack `swarm` and `arena`, cursor/plugins pin
`2eb7ed4613cfc8f098dfe464a23680ea44d84c5e`, MIT:
`pstack/skills/swarm/SKILL.md` (SHA-256
`e28057fbbd1113257b2e953c6e891c41f535dbb01400b6bfd3eb9a85a2ab861f`) and
`pstack/skills/arena/SKILL.md` (SHA-256
`e3a1f6c49a08b7e0b92134e53300d146f1f22ba83386d2019926e736df421851`).
The local adaptation retains predeclared slices/version/method, explicit dropouts and
base/graft/rejection provenance. Current Luca owners retain scheduling, native model/adoption
validation, authority and Human Gates; upstream cloud fan-out, model defaults and mandatory
arena state are research material only. No author certification or measured net benefit is implied.

MIT License — Copyright (c) 2026 Lauren Tan.
Permission is hereby granted, free of charge, to any person obtaining a copy of this software
and associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions: The above copyright notice and this
permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.

<!-- FILE_END: evidence-receipts.md -->
