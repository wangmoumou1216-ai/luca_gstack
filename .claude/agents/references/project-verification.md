# Current-instance verification

Load through EOF before Plan freezes its first required current-instance behavioural verification, TP constructs or
executes an affected TEST, or QG accepts its results. This is the single method owner for current
instance, driver, data and evidence preservation. Existing suites, ASSERT/TEST cards, RTM,
`outputs_produced` / PRIMARY_OUTPUTS and the QG report/envelope remain the execution and transport
contracts. A receipt adds evidence; it grants no project, process, browser, network or cleanup rights.

## Prepare once, drive the current subject

1. **Reuse.** Inspect the authorised repo's documented commands and existing suites before adding a
   driver. Map their actual user paths and results to every required ASSERT. A trusted suite that
   covers the current feature × entry × state set needs only the instance/data/evidence binding
   below, not another harness. When coverage is missing, Plan puts the smallest preparation in the
   existing U-block before its first dependent TEST; it does not create a second test scheduler.
2. **Freeze.** Bind the verified project (framework fixtures explicitly say NO_PIN), current source
   revision and actual approved scope. Index the user-facing features, each supported entry and
   each required happy, edge and error state from source ASSERTs. Read the matching feature recipes;
   reconcile missing/dead/duplicate entries against source. Freeze the manifest bytes and hash
   before TEST. Required rows cannot be deleted because a driver returned fewer results. An
   unreachable row retains its ASSERT, attempted route and concrete prerequisite as a GAP; another
   entry does not prove it. N/A requires the source scope to exclude that row before the run.
3. **Launch / doctor / drive.** Launch uses the repo's exact supported command and an isolated
   port/profile/data directory when possible. Short-lived CLIs get a fresh owned session per drive.
   Doctor is a read-only readiness and identity probe, never a functional TEST. Probe immediately
   before the first drive, on every fresh session, after DEV restarts or surprising/failed drives,
   and again after TEST before teardown. Compare project, source revision, scope, surface, owned
   instance ID/PID and data root. Restart invalidates the old doctor receipt even at the same
   revision: rebind the actual instance and re-freeze before dependent TEST. A healthy but wedged
   UI needs a known-state reset or relaunch. Missing identity means GAP, not guessed ownership.
4. **Observe.** Drive the real user entry with stable handles/commands. Capture action and resulting
   state, including persisted side effects from a second user-facing view where relevant. Record
   actual argv/cwd, data, timestamps, stdout, stderr, exit code and expected/observed values for each
   source ASSERT. Internal setters, test-only endpoints, compilation and cached images do not prove
   that path. Mocks apply only at an existing isolated external boundary and are declared. Observe
   what dry-run/test mode actually skips. Harness failures go to the driver owner; product failures
   stay on the original DEV/U-ID. Repairs get a fresh live drive, not a changed PASS label.
5. **Preserve.** Tear down only the resources created and recorded by this run, including failed
   iterations. Stop exact owned PIDs/sessions, never processes selected by name. Remove only owned
   scratch data; retain proof outside that cleanup root. Read and hash every evidence file again
   after cleanup. Wrong revision/instance, missing error state, driver failure or destroyed evidence
   is GAP/FAIL and prevents required PASS. Changed manifests/drivers/source invalidate old receipts.

## Frozen manifest and actual receipt

Use an exact caller-supplied path plus SHA-256, not a latest-file search. `schema_version` is `1`.
All paths are exact authorised absolute paths. The frozen contract's `launch/doctor/drive` notation
is encoded as three fields; `feature×entry×state→assert_id[]` is encoded as `coverage` rows. These
are evidence encodings inside existing outputs, not new completion JSON or workflow state.

| Manifest field | Required value |
|---|---|
| `project_identity` | Verified canonical project/session identity; a synthetic framework fixture explicitly records `NO_PIN` and its fixture ID. Never derive it from shared aliases. |
| `source_revision` | Actual revision/build and, when bytes exist, `locator` + `sha256`; include relevant dirty-source identity rather than claiming HEAD represents edited bytes. |
| `approved_scope_ref` | Exact approved task/effect locator and its byte hash where applicable; a reference is not permission. |
| `surface` | Actual user surface and exact URL/command/session, including environment/profile. |
| `instance_probe` | Supported read-only probe command, expected identity fields and readiness predicate; expected instance includes `project_identity`, `source_revision`, `approved_scope_ref`, `surface`, `instance_id`, `pid`, `data_root`. For a non-process surface use its actual session/build identity, not an invented PID. |
| `launch`, `doctor`, `drive` | Exact argv/cwd/environment references, readiness/stop recipe and stable entry handles. `drive.driver_ref` binds the reused suite or prepared driver by path + hash/revision; doctor cannot replace it. |
| `test_data` | Seed/fixture path + hash (`seed_ref`), owned `data_root`, required auth/preconditions and reset recipe. Production data is read only with its own actual grant. |
| `coverage` | Nonempty rows `{feature,entry,state,assert_ids}` from source, including every required entry/error state; each `assert_ids` is nonempty and binds existing ASSERT IDs/pass criteria. |
| `evidence_location` | Durable evidence directory outside every scratch cleanup root; evidence refs carry path + SHA-256. |
| `cleanup` | `{owned_resources,preserve_evidence}`: exact owned PID/session/directory identifiers with run ownership, permitted teardown recipe and `preserve_evidence: true`. |

| Receipt field | Actual run evidence |
|---|---|
| `manifest_sha256`, `run_id` | Hash of the frozen manifest bytes and unique current run identity. |
| `verified_instance` | `before` and `after` probe observations with timestamps and evidence refs; after is a new probe after TEST, not a copy of before. Include failed/restart probes in operations/evidence. |
| `driver_revision` | Actual driver/suite path + hash/revision used; verify current bytes still match `drive.driver_ref`. |
| `source_assert_ids` | Complete source ASSERT set from frozen coverage, not a denominator rebuilt from returned results. |
| `operations` | Ordered actual operations with unique ID, feature/entry/state, ASSERT IDs, argv/cwd, start/end, exit code, stdout/stderr refs and observed result. Failed attempts remain visible. |
| `actual_results` | Each required tuple/ASSERT has an operation-bound expected/actual comparison, PASS/FAIL/UNKNOWN and nonempty evidence refs. Manual predicates preserve actual evidence and their source pass criteria. |
| `evidence_refs` | Complete action/result/probe/data/log artifacts with exact path + hash; QG reads the relevant actual evidence, not only this list. |
| `cleanup_result` | Actual teardown actions/targets/exit codes, remaining owned residue, and post-cleanup evidence readback; evidence hashes remain usable. |
| `remaining_gaps`, `status` | Explicit unresolved tuples/prerequisites/driver/identity/evidence failures; PASS only with none. GAP is an evidence outcome, not a new Plan completion status. |

## Consume and decide

Plan supplies the frozen denominator and preparation dependency; TP TEST produces the current
receipt and existing outputs transport the manifest, receipt and proof files. QG matches the
source ASSERT set and current RTM, re-probes an available live instance or checks the captured
post-TEST probe and exact owned teardown, reads actual evidence, then applies its existing
BLOCKING/WARNING policy. Any required GAP/UNKNOWN fails that acceptance. Product mismatch is
FAIL. Preserve actual nonzero driver/assertion codes; exit semantics stay in Plan Agent Block 3.
Reusing a suite removes redundant scaffolding, never the need to prove its current subject.

The following **process-fixture receipt predicate** is a runnable, narrow integrity example for
automatable exact-value ASSERTs. `current` is a newly executed, read-only post-TEST identity probe,
captured before teardown. It is not a probe invented from receipt fields. Existing TEST/QG owns
launching, judging manual predicates and completion. This predicate verifies links/coverage; it
cannot authenticate self-reported observations, native agent loading, authority or model identity.
`expectedManifestSha256` comes from the caller's pre-TEST freeze, independently of the receipt.
The contract test extracts this exact block and runs it on real isolated local process/driver
outputs. Other surfaces retain the same method with their actual identity and ASSERT predicates.

<!-- RECEIPT_PREDICATE_START -->
```javascript
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function verificationReceipt(manifestPath, receiptPath, current, expectedManifestSha256) {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const stable = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
  const same = (a, b) => stable(a) === stable(b);
  const gaps = [];
  const gap = code => gaps.push(code);
  let productFailure = false;
  try {
    const raw = fs.readFileSync(manifestPath);
    const m = JSON.parse(raw);
    const r = JSON.parse(fs.readFileSync(receiptPath));
    const required = ['schema_version', 'project_identity', 'source_revision', 'approved_scope_ref',
      'surface', 'instance_probe', 'launch', 'doctor', 'drive', 'test_data', 'coverage',
      'evidence_location', 'cleanup'];
    for (const key of required) if (m[key] === undefined) gap(`manifest:${key}`);
    for (const key of ['manifest_sha256', 'run_id', 'verified_instance', 'driver_revision',
      'source_assert_ids', 'operations', 'actual_results', 'evidence_refs', 'cleanup_result',
      'remaining_gaps', 'status']) if (r[key] === undefined) gap(`receipt:${key}`);
    if (m.schema_version !== 1 || r.manifest_sha256 !== hash(raw) || expectedManifestSha256 !== hash(raw) || !r.run_id) gap('manifest-binding');
    if (hash(fs.readFileSync(m.source_revision.locator)) !== m.source_revision.sha256) gap('source-drift');
    if (m.approved_scope_ref.path && hash(fs.readFileSync(m.approved_scope_ref.path)) !== m.approved_scope_ref.sha256) gap('scope-drift');
    if (!same(r.driver_revision, m.drive.driver_ref) ||
        hash(fs.readFileSync(m.drive.driver_ref.path)) !== m.drive.driver_ref.sha256) gap('driver-drift');
    if (hash(fs.readFileSync(m.test_data.seed_ref.path)) !== m.test_data.seed_ref.sha256) gap('data-drift');
    const expected = m.instance_probe.expected;
    if (!same(expected.project_identity, m.project_identity) ||
        expected.source_revision !== m.source_revision.sha256 ||
        !same(expected.approved_scope_ref, m.approved_scope_ref) ||
        !same(expected.surface, m.surface) || expected.data_root !== m.test_data.data_root) gap('probe-binding');
    for (const probe of [r.verified_instance.before, r.verified_instance.after, current]) {
      for (const key of Object.keys(expected)) if (!same(probe?.[key], expected[key])) gap(`instance:${key}`); // guard:instance
      if (!probe?.ready || !probe?.observed_at || !probe?.evidence_ref) gap('probe-missing');
    }
    const tuples = m.coverage.flatMap(row => row.assert_ids.map(assert_id => ({
      feature: row.feature, entry: row.entry, state: row.state, assert_id
    })));
    if (!tuples.length || new Set(tuples.map(stable)).size !== tuples.length) gap('coverage-invalid');
    const ids = [...new Set(tuples.map(row => row.assert_id))].sort();
    if (!same([...r.source_assert_ids].sort(), ids)) gap('assert-source-set');
    const refs = new Map(r.evidence_refs.map(ref => [ref.path, ref]));
    const linked = ref => ref && refs.get(ref.path)?.sha256 === ref.sha256;
    for (const probe of [r.verified_instance.before, r.verified_instance.after, current]) {
      if (!linked(probe.evidence_ref)) gap('probe-evidence');
      const observed = JSON.parse(fs.readFileSync(probe.evidence_ref.path));
      if (![...Object.keys(expected), 'ready', 'observed_at'].every(key => same(probe[key], observed[key])) ||
          !Number.isFinite(Date.parse(probe.observed_at))) gap('probe-readback');
    }
    if (!refs.size || refs.size !== r.evidence_refs.length) gap('evidence-set');
    for (const ref of refs.values()) {
      const actualPath = fs.existsSync(ref.path) ? fs.realpathSync(ref.path)
        : path.join(fs.realpathSync(path.dirname(ref.path)), path.basename(ref.path));
      const relative = path.relative(fs.realpathSync(m.evidence_location), actualPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) gap('evidence-scope');
      if (!fs.existsSync(ref.path) || hash(fs.readFileSync(ref.path)) !== ref.sha256) gap('evidence-missing-or-drifted'); // guard:evidence
      if (fs.existsSync(ref.path) && fs.lstatSync(ref.path).isSymbolicLink()) gap('evidence-symlink');
    }
    const operations = new Map(r.operations.map(op => [op.operation_id, op]));
    if (!operations.size || operations.size !== r.operations.length) gap('operations-invalid');
    for (const op of operations.values()) {
      if (op.exit_code !== 0) gap('driver-failure'); // guard:driver
      if (!Array.isArray(op.argv) || !op.argv.length || !op.cwd || !linked(op.stdout_ref) || !linked(op.stderr_ref)) gap('operation-evidence');
      if (!op.argv.includes(m.drive.driver_ref.path)) gap('operation-driver');
      if (Date.parse(op.started_at) < Date.parse(r.verified_instance.before.observed_at) ||
          Date.parse(op.ended_at) > Date.parse(r.verified_instance.after.observed_at) ||
          !(Date.parse(op.started_at) <= Date.parse(op.ended_at))) gap('probe-order');
    }
    for (const tuple of tuples) {
      const results = r.actual_results.filter(result => Object.keys(tuple).every(key => result[key] === tuple[key]));
      if (results.length !== 1) gap('coverage-missing-or-duplicate'); // guard:coverage
      for (const result of results) {
        const op = operations.get(result.operation_id);
        if (!op || !['feature', 'entry', 'state'].every(key => op[key] === tuple[key]) ||
            !op.assert_ids.includes(tuple.assert_id) || !result.evidence_refs.length ||
            !result.evidence_refs.every(linked)) gap('result-binding');
        if (result.status === 'FAIL' || !same(result.expected, result.actual)) productFailure = true;
        if (op && fs.existsSync(op.stdout_ref.path) && !same(result.actual, JSON.parse(fs.readFileSync(op.stdout_ref.path)))) gap('result-readback');
        if (result.status !== 'PASS') gap(`result:${tuple.assert_id}`);
      }
    }
    if (m.cleanup.preserve_evidence !== true || r.cleanup_result.evidence_preserved !== true ||
        r.cleanup_result.remaining_owned_resources.length) gap('cleanup-incomplete');
    for (const action of r.cleanup_result.actions) {
      if (!m.cleanup.owned_resources.some(resource => same(resource, action.resource)) || action.exit_code !== 0) gap('cleanup-ownership');
    }
    for (const resource of m.cleanup.owned_resources) {
      if (!r.cleanup_result.actions.some(action => same(action.resource, resource))) gap('cleanup-missing');
      if (resource.kind === 'directory' && fs.existsSync(resource.path)) gap('cleanup-residue');
      if (resource.kind === 'process') {
        try { process.kill(resource.pid, 0); gap('cleanup-residue'); }
        catch (error) { if (error.code !== 'ESRCH') gap('cleanup-inspection'); }
      }
    }
    if (r.remaining_gaps.length || r.status !== 'PASS') gap('reported-gap');
  } catch (error) { gap(`unreadable:${error.code || error.name}`); }
  return { status: productFailure ? 'FAIL' : gaps.length ? 'GAP' : 'PASS', gaps };
}
```
<!-- RECEIPT_PREDICATE_END -->

## Verification limits and provenance

Run `node scripts/test-project-verification-contract.mjs` for isolated loopback API/CLI fixtures,
real driver outputs, restart/negative cases and guard-removal checks. A passing fixture is evidence
for this narrow process contract, not a real application's UI/API/CLI acceptance. Cold native
Plan/TP/QG invocation must separately show which owner it loaded and how it handled good/bad
receipts. Regex, mock agents and registry reachability do not establish that consumption. Missing
runtime or relevant device evidence stays UNKNOWN for the dependent claim.

Adapted method: Cursor pstack `create-verification-skill`, `maintain-verification-skill` and its
feature-map examples, pin `2eb7ed4613cfc8f098dfe464a23680ea44d84c5e`, MIT, Copyright (c) 2026 Lauren
Tan. Upstream generation, concurrent source waves and PR publication are not adopted as local
authority; actual approved Plan/harness policy governs those effects. This file supplies original
local instruction and integrity code. No upstream author certification is claimed.

Upstream MIT notice:

```text
MIT License

Copyright (c) 2026 Lauren Tan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

<!-- FILE_END: agents/references/project-verification.md -->
