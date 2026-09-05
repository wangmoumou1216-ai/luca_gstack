#!/usr/bin/env node
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRANCH_FIXTURE_VERSION, createBranchFixtures } from './agent-context-branch-fixtures.mjs';

// Deliberately synthetic IDs exercise input binding, not actual governed-memory publication.
const TEST_FALLBACK_IDS = ['SF-901', 'SC-20000101-901'];
const positives = {
  'F13-page-handoff': {
    semantic_mapping: ['R-701|list|filters', 'R-702|list|records'],
    reference_layout: 'structural-reference',
    h_confidence: 'high', h_next: 'wait-adoption', h_write_now: false,
    l_visible_page_ids: [], l_reference: 'none', l_next: 'stage-none', l_write_now: true,
    n_reference: 'none', n_write_now: true,
    r_attached_page_ids: [], r_next: 'stage-none', r_write_now: true,
    e_page_id: 'list', e_region_id: 'records', e_reconfirm: false, e_next: 'reuse-selection',
    s_next: 'reconfirm', s_write_now: false, i_next: 'reconfirm', i_write_now: false,
    p_write_now: false, t_write_now: false, j_next: 'wait-adoption', j_write_now: false,
    accepted_receipt_ids: ['C-VALID'], receipt_stage: 'staged', design_generated: false,
    evidence_scope: 'synthetic-only', carried_source_id: 'SRC-701',
    carried_requirements: [
      'R-701|让手机用户组合条件缩小待处理记录范围。',
      'R-702|让手机用户比较并勾选查询结果。',
      'R-703|业务对象名称保留“纷享销客业务记录”。',
      'KEEP-701|全局导航不在本次修改范围。',
    ],
  },
  'F14-flow-preservation': {
    packet_source_id: 'SRC-801',
    requirement_rows: ['R-801|SOURCE=INTERVIEW-41|允许逐条批准待发送建议。', 'AE-801|R-801|拒绝后没有消息发出。', 'PATCH-801|R-801|去向=D-801|理由=防止误发。', 'KEEP-801|已发消息历史不改。'],
    decision_fields: ['D-801|trigger=建议就绪', 'D-801|actor=用户', 'D-801|action=逐条确认发送', 'D-801|feedback=展示发送进度', 'D-801|recovery=暂停后人工接管', 'D-801|rationale=INTERVIEW-41中的误发投诉', 'D-801|rejected=自动批量发送', 'D-801|tradeoff=增加一次确认'],
    applicable_state_rows: ['STATE-EMPTY=解释暂无建议', 'STATE-LOADING=显示进度并可暂停', 'STATE-DENIED=保留草稿且不发送', 'STATE-ERROR=保留输入供重试', 'STATE-TAKEOVER=人工接管', 'STATE-UNDO=撤销未提交发送'],
    na_state_rows: ['STATE-OFFLINE=N/A|此产品仅在线工作'],
    ai_constraints: ['AI-PERMISSION=逐条批准', 'AI-PAUSE=可暂停', 'AI-TAKEOVER=可人工接管', 'AI-UNDO=提交前可撤销'],
    removed_alternative_status: 'REMOVED', voice: '简洁直白', c_next: 'request-source',
    a_mode: 'adhoc', a_require_prd: false, a_invent_trace_ids: false, a_traceability: 'source-only',
    recover_target: 'od-fixture-801', recover_actions: ['fetch-bound-artifacts'], recover_iteration_mode: 'same-recover',
    unknown_recover_next: 'ask-target', ds_next: 'continue-handoff',
    ds_write_design_system_id: false, ds_override_external: false, default_generation: 'desktop',
    variant_bindings: ['od-fixture-a|DS-A', 'od-fixture-b|DS-B'],
    retry_next: 'desktop-same-project', retry_additional_requests: 'zero', retry_target: 'od-fixture-801',
    recover_files: ['index.html', 'variant-a.html', 'variant-b.html'], variant_selection: 'unresolved', relative_links: 'preserve',
    stage_is_design_done: false, traceability: 'best-effort', unverified_decisions: ['D-802'],
    ux0_next: 'request-screenshot', ux1_general_review: true, ux1_ds_compliance: 'unknown', ux1_keyboard: 'unknown',
    ux2_next: 'ask-failure-decision', ux_issue_rows: ['UX-P0-801|P0|form/basic|SHOT-801|confirmed|提交失败丢失输入'],
    cd_status: 'exported', cd_probe_od: false,
    retained_flow_capabilities: ['research-choice', 'first-party-provenance', 'engineering-HITL', 'independent-AC-judge'],
    retired_entry_callable: false, od_figma_verified: false,
  },
  'F10-v2': {
    framework_editable: false, framework_template_required: false, local_tokens_required: false,
    local_component_map_required: false, may_override_external_design_system: false,
    retired_entry_action: 'retired-unavailable', od_figma_verified: false,
  },
  'F9-v2': {
    static_fallback_ids: TEST_FALLBACK_IDS, framework_editable: false,
    framework_template_required: false, direct_fact_write_allowed: false,
  },
};

export function testBranchFixtureShape() {
  const unbound = createBranchFixtures();
  assert.equal(BRANCH_FIXTURE_VERSION, 'p6-page-flow-v2');
  assert.deepEqual(Object.keys(unbound).sort(), ['F10-v2', 'F13-page-handoff', 'F14-flow-preservation']);
  assert.equal(unbound['F9-v2'], undefined, 'missing release binding invented an F9-v2 fixture');
  const openDesign = '.claude/skills/office/open-design/SKILL.md';
  const pageOwner = '.claude/skill-os/runtime/page-context.md';
  const pageCatalog = '.claude/skill-os/page-library/catalog.json';
  for (const id of ['F13-page-handoff', 'F14-flow-preservation', 'F10-v2']) {
    assert.ok(unbound[id].targets.includes(openDesign));
    assert.ok(unbound[id].targets.includes(pageOwner));
    assert.deepEqual(unbound[id].contractEdges, id === 'F13-page-handoff'
      ? [[openDesign, pageOwner], [pageOwner, pageCatalog]] : [[openDesign, pageOwner]]);
  }
  const receiptRequest = unbound['F13-page-handoff'].request;
  for (const file of ['brief.md=BODY-701', 'page-reference.json=REGION-701', 'reference.png=PNG-701']) {
    assert.ok(receiptRequest.includes(file));
  }
  assert.doesNotMatch(receiptRequest, /whole-page\.png|location\.txt/);
  assert.deepEqual(unbound['F13-page-handoff'].claims.accepted_receipt_ids.exactSet, ['C-VALID']);
  for (const fallbackIds of [null, [], 'SF-901', [''], ['SF-002'], ['SF-901', 'SF-901'],
    [' SF-901'], ['SF-901\n'], ['TBD'], ['../SF-901'], [901], ['SC-20000101-901\u0000']]) {
    assert.throws(() => createBranchFixtures({ fallbackIds }), /fallbackIds/, `invalid binding accepted: ${JSON.stringify(fallbackIds)}`);
  }
  const supplied = [...TEST_FALLBACK_IDS];
  const fixtures = createBranchFixtures({ fallbackIds: supplied });
  supplied.push('SF-902');
  assert.deepEqual(fixtures['F9-v2'].claims.static_fallback_ids.exactSet, [...TEST_FALLBACK_IDS].sort());
  assert.equal(fixtures['F9-v2'].isolatedRoot, true);
  assert.equal(fixtures['F9-v2'].targets, undefined, 'root-only fixture requires unavailable modules');
  const flow = fixtures['F14-flow-preservation'];
  assert.equal(flow.obligations, undefined, 'F14 presents an unqualified full S9 coverage list');
  assert.equal(flow.coverage.status, 'partial');
  assert.ok(flow.notes.some((note) => note.includes('PARTIAL_S9_COVERAGE')));
  assert.deepEqual(flow.coverage.sampled.map((entry) => entry.id),
    Array.from({ length: 19 }, (_, index) => `P-${String(index + 1).padStart(2, '0')}`));
  for (const entry of flow.coverage.sampled) {
    assert.ok(entry.claims.length > 0 && entry.claims.every((key) => Object.hasOwn(flow.claims, key)),
      `${entry.id}: coverage cites a nonexistent assertion`);
    assert.ok(entry.deferred.length > 0, `${entry.id}: sampled coverage hides its remaining evidence`);
  }
  assert.match(flow.coverage.sampled.find((entry) => entry.id === 'P-16').deferred, /weights, partial scores, skip reasons/);
  for (const id of ['P-17', 'P-18']) {
    assert.deepEqual(flow.coverage.sampled.find((entry) => entry.id === id).claims, ['retained_flow_capabilities']);
    assert.match(flow.coverage.sampled.find((entry) => entry.id === id).deferred, /Only .*label/);
  }
  assert.ok(flow.coverage.required_evidence.includes('branch-independent-S9-preservation-review'));
  for (const [id, fixture] of Object.entries(fixtures)) {
    assert.equal(fixture.version, BRANCH_FIXTURE_VERSION);
    assert.ok(fixture.notes.some((note) => note.includes('RELEASE_REQUIRED')));
    assert.ok(fixture.notes.some((note) => note.includes('synthetic')));
    assert.ok(fixture.notes.some((note) => note.includes('release reviewer')));
    assert.ok(fixture.request.length > 0);
    assert.deepEqual(Object.keys(fixture.claims).sort(), Object.keys(positives[id]).sort(), `${id}: positive sample drift`);
    for (const [key, spec] of Object.entries(fixture.claims)) {
      assert.ok(['boolean', 'string', 'array'].includes(spec.type), `${id}.${key}: unsupported claim type`);
      if (spec.type === 'array') {
        assert.ok(Array.isArray(spec.exactSet));
        assert.equal(new Set(spec.exactSet).size, spec.exactSet.length);
        assert.ok(spec.exactSet.every((item) => typeof item === 'string' && !item.includes('\u0000')));
      } else if (spec.type === 'boolean') assert.equal(typeof spec.equals, 'boolean');
      else if (spec.choices) {
        assert.ok(spec.choices.length > 1, `${id}.${key}: schema gives away a sole answer`);
        assert.ok(spec.choices.includes(spec.equals));
      } else assert.ok(spec.pattern instanceof RegExp);
    }
  }
  fixtures['F13-page-handoff'].claims.semantic_mapping.exactSet.push('MUTATED');
  assert.equal(createBranchFixtures()['F13-page-handoff'].claims.semantic_mapping.exactSet.length, 2,
    'fixture instances share mutable expectations');
  return { fixtures: 4, release_bound: false, evidence: 'fixture-shape-only' };
}

// Uses the production runner's matcher and schema builder; there is no duplicate scoring implementation.
export function runBranchFixtureContractTests({ claimsMatch, answerSchema }) {
  assert.equal(typeof claimsMatch, 'function');
  assert.equal(typeof answerSchema, 'function');
  testBranchFixtureShape();
  const fixtures = createBranchFixtures({ fallbackIds: TEST_FALLBACK_IDS });
  let rejected = 0;
  const reject = (id, claims, reason) => {
    assert.equal(claimsMatch(fixtures[id], claims), false, `${id}: ${reason}`);
    rejected++;
  };
  for (const [id, fixture] of Object.entries(fixtures)) {
    const correct = structuredClone(positives[id]);
    assert.equal(claimsMatch(fixture, correct), true, `${id}: independent positive sample rejected`);
    const schema = answerSchema(fixture);
    assert.deepEqual(schema.properties.claims.required.sort(), Object.keys(correct).sort());
    assert.equal(schema.properties.claims.additionalProperties, false);
    for (const [key, value] of Object.entries(correct)) {
      const missing = { ...correct };
      delete missing[key];
      reject(id, missing, `missing ${key} passed`);
      const wrong = typeof value === 'boolean' ? !value
        : Array.isArray(value) ? [...value, 'UNSUPPORTED'] : `not ${value}`;
      reject(id, { ...correct, [key]: wrong }, `incorrect ${key} passed`);
      reject(id, { ...correct, [key]: 123 }, `wrong type ${key} passed`);
      const property = schema.properties.claims.properties[key];
      assert.equal(property.const, undefined, `${id}.${key}: schema injects correct answer`);
      if (Array.isArray(value)) {
        assert.equal(property.items.enum, undefined, `${id}.${key}: schema exposes expected set`);
        assert.equal(Object.hasOwn(property, 'minItems'), false, `${id}.${key}: schema exposes answer-derived minimum cardinality`);
        assert.equal(Object.hasOwn(property, 'maxItems'), false, `${id}.${key}: schema exposes answer-derived maximum cardinality`);
        assert.equal(claimsMatch(fixture, { ...correct, [key]: [...value].reverse() }), true, `${id}.${key}: set order became policy`);
        if (value.length > 1) reject(id, { ...correct, [key]: [value[0], value[0], ...value.slice(2)] }, `duplicate ${key} replaced required entry`);
        if (value.length) reject(id, { ...correct, [key]: [[value[0]], ...value.slice(1)] }, `nested nonstring ${key} escaped through join coercion`);
        reject(id, { ...correct, [key]: [null, ...value.slice(1)] }, `null array item ${key} passed`);
      } else if (typeof value === 'string' && !fixture.claims[key].choices) {
        reject(id, { ...correct, [key]: `${value}\n` }, `newline-suffixed literal ${key} passed`);
      }
    }
    reject(id, { ...correct, extra_policy: true }, 'additional unscored claim passed');
    assert.equal(claimsMatch(fixture, correct), true, `${id}: restored sample rejected`);
  }
  const f13 = positives['F13-page-handoff'];
  for (const badReceipt of ['C-LOCAL', 'C-UPLOAD', 'C-WRONG', 'C-MISSING', 'C-CHANGED']) {
    reject('F13-page-handoff', { ...f13, accepted_receipt_ids: [badReceipt] }, `${badReceipt} accepted as staged`);
  }
  reject('F13-page-handoff', { ...f13, semantic_mapping: ['R-701|list|pagination', 'R-702|list|records'] }, 'wrong semantic region passed');
  reject('F13-page-handoff', { ...f13, e_page_id: 'home', e_region_id: 'tasks' }, 'automatic ranker overrode explicit valid choice');
  reject('F13-page-handoff', { ...f13, carried_requirements: f13.carried_requirements.map((row) => row.replace('纷享销客', '')) }, 'legal source vocabulary stripped');
  const f14 = positives['F14-flow-preservation'];
  reject('F14-flow-preservation', { ...f14, recover_target: 'od-fixture-999' }, 'most-recent target guessed');
  reject('F14-flow-preservation', { ...f14, variant_bindings: ['od-fixture-a|DS-B', 'od-fixture-b|DS-A'] }, 'design-system bindings crossed');
  reject('F14-flow-preservation', { ...f14, decision_fields: f14.decision_fields.map((row) => row.replace('action=逐条确认发送', 'action=自动批量发送')) }, 'removed alternative resurrected');
  reject('F9-v2', { ...positives['F9-v2'], static_fallback_ids: ['SF-002', TEST_FALLBACK_IDS[1]] }, 'old governed rule substituted');
  return { fixtures: 4, rejected_counterexamples: rejected, evidence: 'local-production-claim-contract-only', model_behaviour_verified: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(testBranchFixtureShape()));
  console.log('Production matcher tests run via runner --self-test; no live harness or OD evidence was produced.');
}
