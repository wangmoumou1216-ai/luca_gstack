Quality Gate: design-brief workflow  
Status: **FAIL (6/9)** — static contracts; no live OD run.

- **PASS C1** Selected pipeline decisions survive without re-interrogation: `design-brief/SKILL.md:91,129,137`; `ux-brainstorm/references/design-proposal-template.md:154`.
- **PASS C2** Written/spoken requirements can generate without PRD: `design-brief/references/input-contract.md:17,41`; graph:214.
- **PASS C3** Catalog/source owns template semantics; Brief owns current mapping: `runtime/page-context.md:62`.
- **PASS C4** Actions/states require source, support evidence and AC; conflicts return for resolution: Brief:143; page-context:70.
- **PASS C5** Refinement and embedding have separate permissions: input-contract:24,68; OD:99.
- **PASS C6** Adaptation precedes freeze; binding/TAC/adoption follow it; changed facts return to Brief: Brief:197–205.
- **FAIL C7 — workflow wiring:** graph:142 registers entrances, but `.claude/agents/orchestrator.md:292,310` still selects by scene; `.claude/skills/office/auto/SKILL.md:77` defaults to the full pipeline unless “skip” is stated. `office/references/office-wizard.md:235` omits new entrances and retains C’s compulsory audit input. Consume selected entrance/path before scene recommendations.
- **FAIL C8 — standalone engineering gate:** graph:251/preflight:93 require `prd_end_to_end`, but direct `tech-spec/SKILL.md:112` checks PRD existence/IDs without that scope gate; `task-plan/SKILL.md:74,97` lacks explicit upstream verdict/scope checks. Standalone bypasses Orchestrator (`orchestrator.md:40`). Add checks to consumers; preserve the separate pure-engineering synthesis exception.
- **UNKNOWN C9** Actual OD generation, behavioral preservation and embedding→refinement baseline transfer remain unproved.

Evidence paths above use `.claude/skills/office/` or `.claude/skill-os/`. Generated-context and framework quality checks passed. Retain bundle adoption and unresolved-decision Human Gates; no additional product workflow is needed.

EVAL_ENVELOPE_JSON
{"schema_version":1,"producer":"quality-gate","eval_run_id":"design-brief-final-workflow-20261001","subject":{"skill":"design-brief","topic":"design-brief-six-capability-workflow","scene":"unknown","input_summary":"只读核验六能力、四输入场景、上下游合同、workflow入口及standalone工程门；候选工作区，NO_PIN，无live OD。","output_paths":[".claude/skills/office/design-brief/SKILL.md",".claude/skills/office/design-brief/SCHEMA.md",".claude/skills/office/design-brief/references/input-contract.md",".claude/skills/office/design-brief/references/output-templates.md",".claude/skills/office/open-design/SKILL.md",".claude/skill-os/runtime/page-context.md",".claude/skill-os/optional-workflow-graph.yaml",".claude/agents/orchestrator.md",".claude/skills/office/auto/SKILL.md",".claude/skills/office/references/office-wizard.md",".claude/skills/office/tech-spec/SKILL.md",".claude/skills/office/task-plan/SKILL.md"],"duration":"heavy"},"verdict":{"status":"FAIL","passed":6,"total":9,"findings":["FAIL C7: 新design_entry_paths未接入旧scene编排推荐；auto仍默认整链；office展示入口仍旧。","FAIL C8: standalone工程消费者未显式闭合上游gate与prd_end_to_end范围检查，不能仅依赖workflow graph/preflight。","UNKNOWN C9: 无live OD生成、行为保持及植入后精修基线交接证据；合同PASS不代表生产执行PASS。"]}}
