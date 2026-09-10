// P6 decision contracts. Live execution requires a separately reviewed frozen release manifest.
export const BRANCH_FIXTURE_VERSION = 'p6-page-flow-v2';

const PAGE_OWNER = '.claude/skill-os/runtime/page-context.md';
const PAGE_CATALOG = '.claude/skill-os/page-library/catalog.json';
const DESIGN_BRIEF = '.claude/skills/office/design-brief/SKILL.md';
const OPEN_DESIGN = '.claude/skills/office/open-design/SKILL.md';
const UX_AUDIT = '.claude/skills/office/ux-audit/SKILL.md';
const bool = (equals) => ({ type: 'boolean', equals });
const set = (...exactSet) => ({ type: 'array', exactSet });
const literal = (value) => ({ type: 'string', pattern: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\s\\S])`) });
const choice = (equals, ...choices) => ({ type: 'string', equals, choices });

const notes = [
  'RELEASE_REQUIRED: this contract version is not live authority. A release reviewer must bind the released branch context, scorer, and governed fallback IDs in a frozen release manifest before live execution.',
  'Supplied scenario messages, validation results, and OD receipts are synthetic data for decision checks. A correct answer is not a real user adoption, OD read-back, or generated design.',
  'Legacy F9/F10 claims and failures retain their original meaning; these fixtures neither rescore nor replace their historical rows.',
  'F9-v2 is omitted unless the caller explicitly supplies a validated nonempty fallbackIds array. The release reviewer must bind that exact set to the governed allowlist and both root projections; syntax validation alone is not governance evidence.',
];

const syntheticBoundary = `Evaluate the following independent synthetic scenarios as a pre-execution decision check. The quoted user messages and tool receipts are supplied test data, not actual user consent or external evidence from this session. Do not contact a tool project or execute a skill. Use the repository's applicable contracts to derive decisions; the scenario data do not define policy. Return only the requested field values and source files actually read.`;

/** Return fresh fixture objects. An omitted fallbackIds leaves F9-v2 unavailable, never guessed. */
export function createBranchFixtures({ fallbackIds } = {}) {
  if (fallbackIds !== undefined && (!Array.isArray(fallbackIds) || fallbackIds.length === 0
      || !fallbackIds.every((id) => typeof id === 'string' && id.trim() === id && /^(?:SF-\d{3}|SC-\d{8}-\d{3})$/.test(id))
      || new Set(fallbackIds).size !== fallbackIds.length || fallbackIds.includes('SF-002'))) {
    throw new TypeError('fallbackIds must be an explicit nonempty unique governed-ID array excluding superseded SF-002');
  }
  const fixtures = {
    'F13-page-handoff': {
      version: BRANCH_FIXTURE_VERSION,
      notes: [...notes],
      obligations: ['S4', 'S5', 'R-3', 'K5', 'K6', 'K7', 'P-01', 'P-02', 'P-07'],
      targets: [OPEN_DESIGN, PAGE_OWNER, PAGE_CATALOG],
      contractEdges: [[OPEN_DESIGN, PAGE_OWNER], [PAGE_OWNER, PAGE_CATALOG]],
      request: `${syntheticBoundary}

The aligned source SRC-701 has these exact entries:
R-701|让手机用户组合条件缩小待处理记录范围。
R-702|让手机用户比较并勾选查询结果。
R-703|业务对象名称保留“纷享销客业务记录”。
KEEP-701|全局导航不在本次修改范围。
Use the current page catalog to map R-701 and R-702 to page and region IDs. Return semantic_mapping as strings requirement_id|page_id|region_id. All relevant catalog versions have passed validation in this scenario; the target platform is mobile. Return reference_layout as structural-reference or fixed-desktop-layout.

H: For SRC-701 the candidate has a validated source, clear evidence for the collection purpose and each target region, and no unresolved conflict. A recommendation was displayed. No adoption reply arrived. The synthetic user already authorized writing SRC-701 to OD project od-fixture-701. Classify h_confidence (high/low/no-match), h_next (wait-adoption/stage-reference/stage-none), and h_write_now.
L: A sound editor request says “列表” only in the title. It requires editing synchronized waveforms on a time axis; no catalog page supports that core purpose or region. Internal retrieval returned weak lexical hits, and an optional request for the user's own reference has no reply. The aligned sound-editor source and writing to od-fixture-702 are authorized. Return l_visible_page_ids, l_reference (none/catalog-page), l_next (wait-reference/stage-none/stage-reference), and l_write_now.
N: An aligned spatial sculpture task has no catalog candidate at all; writing it to od-fixture-703 is authorized. Return n_reference and n_write_now.
R: For SRC-701, synthetic message U-REJECT says “这次不用参考页，按已定需求交接”; writing to od-fixture-701 was already authorized. Return r_attached_page_ids, r_next (ask-again/stage-none/stage-reference), and r_write_now.
E: For SRC-701, synthetic message U-SELECT says “我选 list 的 records 区域作为结构参考”; the source hash and region validation succeeded. An automatic ranker later proposes home/tasks. Return e_page_id, e_region_id, e_reconfirm, and e_next (reuse-selection/replace-selection/wait-adoption).
S: The same explicit selection now has a source hash different from the current catalog. Return s_next (reconfirm/replace-silently/reuse-selection) and s_write_now. I: the explicit selection names list/not-a-region and validation fails; return i_next and i_write_now using the same choices.
P: U-SELECT is valid and target od-fixture-701 is known, but the user has not authorized OD writes. Return p_write_now. T: the user authorized an OD write but did not identify a project or authorize creation; return t_write_now. H above has the converse facts: OD permission exists but adoption is unanswered.
J: A generated JSON selection has actor=user and evidence=U-AUTO, but no matching user message or selector action exists. Return j_next (wait-adoption/stage-reference) and j_write_now.

Receipt cases concern an otherwise authorized and valid E packet. Its exact target is od-fixture-701; required package files are brief.md=BODY-701, page-reference.json=REGION-701, and reference.png=PNG-701. Return accepted_receipt_ids for cases whose supplied facts meet the stage read-back gate:
C-LOCAL: only /private/tmp/reference.png exists locally; no OD receipt.
C-UPLOAD: HTTP 200 uploads, without reading back project, body, or attachments.
C-WRONG: read-back matches all bytes but project is od-fixture-999.
C-MISSING: read-back project, brief.md, and page-reference.json match, but reference.png is absent.
C-CHANGED: read-back project, brief.md, and page-reference.json match, but reference.png bytes are PNG-999.
C-VALID: read-back from od-fixture-701 returns brief.md=BODY-701, page-reference.json=REGION-701, and reference.png=PNG-701 exactly; the receiver can open all three package files; no design artifact exists yet.
For C-VALID return receipt_stage (staged/unverified/generated), design_generated, and evidence_scope (synthetic-only/actual-external-evidence). Return carried_source_id and carried_requirements containing the exact source entries applicable after R's rejection or E's selection.`,
      claims: {
        semantic_mapping: set('R-701|list|filters', 'R-702|list|records'),
        reference_layout: choice('structural-reference', 'structural-reference', 'fixed-desktop-layout'),
        h_confidence: choice('high', 'high', 'low', 'no-match'),
        h_next: choice('wait-adoption', 'wait-adoption', 'stage-reference', 'stage-none'),
        h_write_now: bool(false),
        l_visible_page_ids: set(),
        l_reference: choice('none', 'none', 'catalog-page'),
        l_next: choice('stage-none', 'wait-reference', 'stage-none', 'stage-reference'),
        l_write_now: bool(true),
        n_reference: choice('none', 'none', 'catalog-page'),
        n_write_now: bool(true),
        r_attached_page_ids: set(),
        r_next: choice('stage-none', 'ask-again', 'stage-none', 'stage-reference'),
        r_write_now: bool(true),
        e_page_id: literal('list'),
        e_region_id: literal('records'),
        e_reconfirm: bool(false),
        e_next: choice('reuse-selection', 'reuse-selection', 'replace-selection', 'wait-adoption'),
        s_next: choice('reconfirm', 'reconfirm', 'replace-silently', 'reuse-selection'),
        s_write_now: bool(false),
        i_next: choice('reconfirm', 'reconfirm', 'replace-silently', 'reuse-selection'),
        i_write_now: bool(false),
        p_write_now: bool(false),
        t_write_now: bool(false),
        j_next: choice('wait-adoption', 'wait-adoption', 'stage-reference'),
        j_write_now: bool(false),
        accepted_receipt_ids: set('C-VALID'),
        receipt_stage: choice('staged', 'staged', 'unverified', 'generated'),
        design_generated: bool(false),
        evidence_scope: choice('synthetic-only', 'synthetic-only', 'actual-external-evidence'),
        carried_source_id: literal('SRC-701'),
        carried_requirements: set(
          'R-701|让手机用户组合条件缩小待处理记录范围。',
          'R-702|让手机用户比较并勾选查询结果。',
          'R-703|业务对象名称保留“纷享销客业务记录”。',
          'KEEP-701|全局导航不在本次修改范围。',
        ),
      },
    },
    'F14-flow-preservation': {
      version: BRANCH_FIXTURE_VERSION,
      notes: [...notes,
        'PARTIAL_S9_COVERAGE: the claims sample packet preservation and pre-execution decisions. They do not prove full P-01–P-19 preservation; coverage.sampled records the exact claim fields and untested portions.',
        'Full S9 closure requires the branch independent preservation review with per-behaviour original/new owners and evidence, followed by applicable final implementation, mutation, and Harness evidence. P-16 scoring and P-17/P-18 runtime paths remain deferred, not passed by capability labels.',
      ],
      coverage: {
        status: 'partial',
        authority: 'framework-audit/2026-09-05-page-library-design-flow-branch-plan.md#S9',
        sampled: [
          { id: 'P-01', claims: ['c_next', 'requirement_rows'], deferred: 'Full PRD six-field provenance, B/C baseline and alignment gates, and out-of-scope opportunity decisions.' },
          { id: 'P-02', claims: ['requirement_rows', 'packet_source_id'], deferred: 'End-to-end stable-ID propagation and Oracle patch handling across actual consumers.' },
          { id: 'P-03', claims: ['decision_fields'], deferred: 'Complete real decision-card schema and every core interaction; only one supplied eight-field decision is sampled.' },
          { id: 'P-04', claims: ['applicable_state_rows', 'na_state_rows'], deferred: 'Full twelve-state/AI applicability matrix and scene C Phase 5 deferral; only the supplied states are sampled.' },
          { id: 'P-05', claims: ['ai_constraints', 'decision_fields'], deferred: 'Trust assumptions, fallback behaviour, and actual permission/pause/takeover/undo interactions.' },
          { id: 'P-06', claims: ['removed_alternative_status', 'voice'], deferred: 'Conflict explanations, standalone derivation, and detection of invented research facts across real sources.' },
          { id: 'P-07', claims: ['packet_source_id', 'requirement_rows', 'decision_fields', 'applicable_state_rows'], deferred: 'Actual single-Packet consumption and fact preservation across the full consumer chain.' },
          { id: 'P-08', claims: ['a_mode', 'a_require_prd', 'a_invent_trace_ids', 'a_traceability'], deferred: 'Workflow/standalone routing and override execution beyond the one adhoc decision.' },
          { id: 'P-09', claims: ['c_next', 'recover_actions', 'recover_target', 'unknown_recover_next'], deferred: 'Actual chain/adhoc/recover dispatch and missing-source behaviour.' },
          { id: 'P-10', claims: ['default_generation', 'recover_target', 'stage_is_design_done'], deferred: 'Actual headless opt-in gate and stable slug through stage, recover, and handoff.' },
          { id: 'P-11', claims: ['ds_next', 'ds_write_design_system_id', 'ds_override_external', 'variant_bindings'], deferred: 'Actual external design-system configuration and per-target binding verification.' },
          { id: 'P-12', claims: ['retry_next', 'retry_additional_requests', 'retry_target'], deferred: 'Actual bounded retry and desktop recovery on the same staged project.' },
          { id: 'P-13', claims: ['variant_bindings', 'recover_files', 'variant_selection', 'relative_links'], deferred: 'Actual multi-target recovery, artifact classification, nonempty prototype validation, and working relative links.' },
          { id: 'P-14', claims: ['recover_iteration_mode', 'traceability', 'unverified_decisions', 'cd_status', 'cd_probe_od'], deferred: 'User-controlled iteration and actual first/iterated recovery, handoff paths, slug and risk records.' },
          { id: 'P-15', claims: ['ux0_next', 'ux2_next'], deferred: 'Full module selection, serial execution, real retry/skip/stop decisions, and continuation after summary.' },
          { id: 'P-16', claims: ['ux1_general_review', 'ux1_ds_compliance', 'ux1_keyboard', 'ux_issue_rows'], deferred: 'A/B/C module weights, partial scores, skip reasons, and full scene C baseline/P0 handling. No scoring calculation is asserted.' },
          { id: 'P-17', claims: ['retained_flow_capabilities'], deferred: 'Only generic retention labels are asserted: research selection, first-party data chains, engineering presets/HITL/routes, and graph reachability require independent branch review and runtime evidence.' },
          { id: 'P-18', claims: ['retained_flow_capabilities'], deferred: 'Only an independent-AC-judge retention label is asserted: per-skill generic schema, QA, AC judging, and equivalent-owner migrations require the full behaviour inventory and independent preservation evidence.' },
          { id: 'P-19', claims: ['retired_entry_callable', 'od_figma_verified'], deferred: 'Actual direct/natural-language/indirect retirement dispatch rejection and preservation of historical artifacts.' },
        ],
        required_evidence: ['branch-independent-S9-preservation-review', 'final-implementation-and-mutation-evidence', 'final-Harness-evidence'],
      },
      targets: [DESIGN_BRIEF, OPEN_DESIGN, UX_AUDIT, PAGE_OWNER],
      contractEdges: [[OPEN_DESIGN, PAGE_OWNER]],
      request: `${syntheticBoundary}

An aligned chain source SRC-801 contains a Design Generation Packet with these rows:
R-801|SOURCE=INTERVIEW-41|允许逐条批准待发送建议。
AE-801|R-801|拒绝后没有消息发出。
PATCH-801|R-801|去向=D-801|理由=防止误发。
KEEP-801|已发消息历史不改。
Its core decision D-801 has eight fields: trigger=建议就绪; actor=用户; action=逐条确认发送; feedback=展示发送进度; recovery=暂停后人工接管; rationale=INTERVIEW-41中的误发投诉; rejected=自动批量发送; tradeoff=增加一次确认。
Applicable states: STATE-EMPTY=解释暂无建议; STATE-LOADING=显示进度并可暂停; STATE-DENIED=保留草稿且不发送; STATE-ERROR=保留输入供重试; STATE-TAKEOVER=人工接管; STATE-UNDO=撤销未提交发送。STATE-OFFLINE=N/A，理由=此产品仅在线工作。Format na_state_rows as state_id=N/A|reason.
An upstream alternative ALT-REMOVED has status REMOVED; voice is 简洁直白. User constraints: AI-PERMISSION=逐条批准; AI-PAUSE=可暂停; AI-TAKEOVER=可人工接管; AI-UNDO=提交前可撤销. Return packet_source_id, requirement_rows, decision_fields (D-801|field=value), applicable_state_rows (state_id=value), na_state_rows, ai_constraints, removed_alternative_status, and voice. They describe the packet to hand over after the external design-flow change.

C: chain input is absent and its only evidence is a page selection. Return c_next (request-source/create-empty-project/use-page-as-requirements).
A: User explicitly asks to send the named, readable, nonempty source NOTE-802 to OD; it has no PRD or R/AE/D matrix. Return a_mode (chain/adhoc/recover), a_require_prd, a_invent_trace_ids, and a_traceability (source-only/best-effort/complete-matrix).
REC: “把 od-fixture-801 的最新产物拉回来”; that exact slug is verified in the supplied handoff, whereas od-fixture-999 was updated more recently. Return recover_target, recover_actions as applicable action identifiers from [fetch-bound-artifacts, compile-requirements, match-pages, create-project, generate-design], and recover_iteration_mode (same-recover/new-generation).
UNKNOWN: User says only “拉回来”; there is no known binding and no project name. Return unknown_recover_next (ask-target/use-most-recent/create-project).
DS: User says “设计系统我在 OD 里面自己配”; the tool project and write scope are already authorized. Local token and technical component-map files do not exist. Return ds_next (continue-handoff/request-local-tokens), ds_write_design_system_id, ds_override_external, and default_generation (desktop/headless/local-generator).
MULTI: User separately authorizes two variants and explicitly supplies bindings od-fixture-a=DS-A and od-fixture-b=DS-B. Return variant_bindings as project_id|design_system_id strings.
RETRY: User explicitly opted into headless. Original request failed; its single unchanged retry also failed. Daemon is UP; project od-fixture-801 and staged material remain. Return retry_next (desktop-same-project/retry-again/new-project/local-generator), retry_additional_requests (zero/one/unbounded), and retry_target.
REC-FILES: od-fixture-801 contains navigation index.html linking ./variant-a.html and ./variant-b.html, plus two nonempty actual prototypes with those names. User has not selected a variant. Return recover_files, variant_selection (unresolved/first-by-name/most-recent), and relative_links (preserve/break).
STAGE: only staged brief and attachments were read back; no generated HTML exists. Return stage_is_design_done.
TRACE: a recovered chain prototype covers only D-801; a second source decision D-802 is not demonstrated. Return traceability (best-effort/complete-matrix) and unverified_decisions.
UX0: user selected modules A and B but supplied no screenshot. Return ux0_next (request-screenshot/score-anyway).
UX1: a static screenshot exists, no actual external design-system specification is supplied, and no keyboard or focus observation exists. Return ux1_general_review, ux1_ds_compliance (verified/unknown), and ux1_keyboard (verified/unknown).
UX2: selected order is A then B; A fails and user has made no retry/skip/stop decision. Return ux2_next (ask-failure-decision/run-B/skip-A).
UX3: confirmed baseline issue UX-P0-801 says “提交失败丢失输入”, severity=P0, location=form/basic, evidence=SHOT-801, status=confirmed. Return ux_issue_rows as id|severity|location|evidence|status|description.
CD: user asks for this same source package exported for manual Claude Design attachment; export exists but no import receipt exists. Return cd_status (exported/imported/generated) and cd_probe_od.
FLOW: user still requests the existing research choice, first-party provenance, engineering HITL path, and independent AC judging. A cleanup proposal removes all of them together with lucagstack's figma-layer entry because they shared design-flow files. Evaluate this proposal under the current contracts. Return retained_flow_capabilities using [research-choice, first-party-provenance, engineering-HITL, independent-AC-judge, figma-layer-write], retired_entry_callable, and od_figma_verified.`,
      claims: {
        packet_source_id: literal('SRC-801'),
        requirement_rows: set('R-801|SOURCE=INTERVIEW-41|允许逐条批准待发送建议。', 'AE-801|R-801|拒绝后没有消息发出。', 'PATCH-801|R-801|去向=D-801|理由=防止误发。', 'KEEP-801|已发消息历史不改。'),
        decision_fields: set('D-801|trigger=建议就绪', 'D-801|actor=用户', 'D-801|action=逐条确认发送', 'D-801|feedback=展示发送进度', 'D-801|recovery=暂停后人工接管', 'D-801|rationale=INTERVIEW-41中的误发投诉', 'D-801|rejected=自动批量发送', 'D-801|tradeoff=增加一次确认'),
        applicable_state_rows: set('STATE-EMPTY=解释暂无建议', 'STATE-LOADING=显示进度并可暂停', 'STATE-DENIED=保留草稿且不发送', 'STATE-ERROR=保留输入供重试', 'STATE-TAKEOVER=人工接管', 'STATE-UNDO=撤销未提交发送'),
        na_state_rows: set('STATE-OFFLINE=N/A|此产品仅在线工作'),
        ai_constraints: set('AI-PERMISSION=逐条批准', 'AI-PAUSE=可暂停', 'AI-TAKEOVER=可人工接管', 'AI-UNDO=提交前可撤销'),
        removed_alternative_status: choice('REMOVED', 'REMOVED', 'ACTIVE'),
        voice: literal('简洁直白'),
        c_next: choice('request-source', 'request-source', 'create-empty-project', 'use-page-as-requirements'),
        a_mode: choice('adhoc', 'chain', 'adhoc', 'recover'),
        a_require_prd: bool(false),
        a_invent_trace_ids: bool(false),
        a_traceability: choice('source-only', 'source-only', 'best-effort', 'complete-matrix'),
        recover_target: literal('od-fixture-801'),
        recover_actions: set('fetch-bound-artifacts'),
        recover_iteration_mode: choice('same-recover', 'same-recover', 'new-generation'),
        unknown_recover_next: choice('ask-target', 'ask-target', 'use-most-recent', 'create-project'),
        ds_next: choice('continue-handoff', 'continue-handoff', 'request-local-tokens'),
        ds_write_design_system_id: bool(false),
        ds_override_external: bool(false),
        default_generation: choice('desktop', 'desktop', 'headless', 'local-generator'),
        variant_bindings: set('od-fixture-a|DS-A', 'od-fixture-b|DS-B'),
        retry_next: choice('desktop-same-project', 'desktop-same-project', 'retry-again', 'new-project', 'local-generator'),
        retry_additional_requests: choice('zero', 'zero', 'one', 'unbounded'),
        retry_target: literal('od-fixture-801'),
        recover_files: set('index.html', 'variant-a.html', 'variant-b.html'),
        variant_selection: choice('unresolved', 'unresolved', 'first-by-name', 'most-recent'),
        relative_links: choice('preserve', 'preserve', 'break'),
        stage_is_design_done: bool(false),
        traceability: choice('best-effort', 'best-effort', 'complete-matrix'),
        unverified_decisions: set('D-802'),
        ux0_next: choice('request-screenshot', 'request-screenshot', 'score-anyway'),
        ux1_general_review: bool(true),
        ux1_ds_compliance: choice('unknown', 'verified', 'unknown'),
        ux1_keyboard: choice('unknown', 'verified', 'unknown'),
        ux2_next: choice('ask-failure-decision', 'ask-failure-decision', 'run-B', 'skip-A'),
        ux_issue_rows: set('UX-P0-801|P0|form/basic|SHOT-801|confirmed|提交失败丢失输入'),
        cd_status: choice('exported', 'exported', 'imported', 'generated'),
        cd_probe_od: bool(false),
        retained_flow_capabilities: set('research-choice', 'first-party-provenance', 'engineering-HITL', 'independent-AC-judge'),
        retired_entry_callable: bool(false),
        od_figma_verified: bool(false),
      },
    },
    'F10-v2': {
      version: BRANCH_FIXTURE_VERSION,
      notes: [...notes],
      obligations: ['K1', 'K2', 'K4', 'K6', 'K10', 'P-11', 'P-19'],
      targets: [OPEN_DESIGN, PAGE_OWNER],
      contractEdges: [[OPEN_DESIGN, PAGE_OWNER]],
      request: `After normal startup, classify a future handoff of an aligned mobile design to OD. The user will configure its design system in OD; this turn builds or writes nothing. State framework_editable, framework_template_required, local_tokens_required, local_component_map_required, and may_override_external_design_system. Classify a direct request for lucagstack figma-layer in retired_entry_action (dispatch/retired-unavailable) and state whether its retirement verifies OD's own Figma capability (od_figma_verified). Derive these answers from the current repository contracts.`,
      claims: {
        framework_editable: bool(false),
        framework_template_required: bool(false),
        local_tokens_required: bool(false),
        local_component_map_required: bool(false),
        may_override_external_design_system: bool(false),
        retired_entry_action: choice('retired-unavailable', 'dispatch', 'retired-unavailable'),
        od_figma_verified: bool(false),
      },
    },
  };
  if (fallbackIds !== undefined) fixtures['F9-v2'] = {
    version: BRANCH_FIXTURE_VERSION,
    notes: [...notes, 'fallbackIds are caller-bound test expectations, not proof of release approval or actual promotion.'],
    obligations: ['K6', 'K8'],
    isolatedRoot: true,
    request: 'Hooks, repository modules, and memory loaders are unavailable. From the already loaded root list every governed Static Fallback ID in static_fallback_ids. Classify framework_editable and framework_template_required for a future design handoff, and state whether a stable fact can be written directly to promoted-facts without candidate/review/promotion (direct_fact_write_allowed).',
    claims: {
      static_fallback_ids: set(...[...fallbackIds].sort()),
      framework_editable: bool(false),
      framework_template_required: bool(false),
      direct_fact_write_allowed: bool(false),
    },
  };
  return fixtures;
}
