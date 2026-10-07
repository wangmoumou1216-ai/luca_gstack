#!/usr/bin/env node
import assert from 'node:assert/strict';
import { ROUTING_PLAN_FIXTURES, ROUTING_PLAN_SUITE_VERSION, validateRoutingPlanSuite } from './routing-plan-v1-suite.mjs';

const summary = validateRoutingPlanSuite();
assert.deepEqual(summary, { suite: ROUTING_PLAN_SUITE_VERSION, fixture_count: 27, rp_count: 24, po_count: 3 });
const ids = Object.keys(ROUTING_PLAN_FIXTURES);
assert.equal(new Set(ids).size, ids.length);
for (const [id, fixture] of Object.entries(ROUTING_PLAN_FIXTURES)) {
  assert.equal(fixture.id, id);
  assert.equal(fixture.suite, ROUTING_PLAN_SUITE_VERSION);
  assert.equal(typeof fixture.request, 'string');
  assert.ok(!fixture.request.includes('expected') && !fixture.request.includes('标准答案'));
  assert.deepEqual(Object.keys(fixture.claims), [id.startsWith('PO-') ? 'plan_case' : 'routing_class']);
  assert.ok(Array.isArray(fixture.targets) && fixture.targets.length > 0);
  assert.deepEqual(fixture.targets, fixture.candidateSourceTargets);
}
assert.deepEqual(ids.filter((id) => id.startsWith('PO-')).sort(), ['PO-01', 'PO-02', 'PO-03']);
assert.equal(ids.filter((id) => id.startsWith('RP-')).length, 24);
console.log('PASS routing-plan-v1 suite: 24 RP + 3 PO, frozen IDs, public prompts and claim shape');
