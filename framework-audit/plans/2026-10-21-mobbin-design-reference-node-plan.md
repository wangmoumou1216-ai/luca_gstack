# Plan: Mobbin design-reference node inside competitor analysis

- plan_id: PLAN-20261021-MOBBIN-NODE
- path: framework-audit/plans/2026-10-21-mobbin-design-reference-node-plan.md
- plan_sha256: not recorded in this file (a file cannot hold its own hash); the commit message names the plan path
- scope: NO_PIN framework work in this checkout; no project is read or written; `framework/` untouched
- source identity: user message "竞品分析这里，我刚才付费了mobbin … 把mobbin这个节点加入到竞品分析里。让他作为设计分析的库。提供UI和交互和动效的设计思路 … 重新包装竞品分析这个节点作为必须询问我。以及如果我说需要分析，必须进入到mobbin这个节点，来提供价值。辅助cd或者od出设计。… 做一个计划然后执行"
- orchestration: Sequential, single agent, one cold reviewer after implementation (no Supervisor pairing, no fan-out); the user asked for "计划然后执行", so no extra approval gate
- tier: Standard (8 files, no irreversible effect before the final push)
- note on wording: "动销" in the user's first message is read as "动效" (motion). The user later ruled motion OUT of this node ("那4这个在竞品分析这里不要"; point 4 was the motion lens), so the node covers UI and interaction only; motion stays with the existing `motion-polish`.

## Block 0 — premise gate

1. Should this be solved: yes. It is the user's explicit decision (paid Mobbin access) and the current node conflicts with it: today's light scan is asked only when a named decision exists, a decline is final, and it runs on WebFetch/WebSearch with a "document-level precedent only" ceiling. Mobbin returns real screens and step-by-step flows, which that ceiling cannot.
2. Smaller alternative: swap only the executor and keep the named-decision gate. Rejected: the user wants the ask to be mandatory and "yes" to always enter Mobbin.
3. Default-form bias: the default product here is "more research", which tilts toward forcing cost and noise onto every design task. Counter-weights: the ask is one plain sentence, a decline is final and free, analysis happens only on "yes", and nothing reaches generation unless the user adopts it. The cold reviewer defaults to REFUTED and is asked specifically whether the mandatory ask became a questionnaire or a second ask point, and whether Mobbin findings leak into generator input.
- KILL-1: if the host cannot call the Mobbin tools in the main agent, the node cannot deliver its value; stop and return to the user.

## Facts verified live (2026-10-21, after the user authorized Mobbin)

- The Mobbin MCP is already installed in this environment as `plugin:mobbin:mobbin` (HTTP, OAuth); only authorization was missing. No `claude mcp add`, no global config edit.
- Tools: `search_screens` (platform ios|web, mode deep|standard, `exclude_screen_ids`), `search_flows` (platform, page), `search_sections` (marketing site sections, no platform). Every call takes `task_intent`, `output_destination`, `output_tool`, which must stay the same across one task.
- A flow result is an ordered list of static screens (`position`, `image_url`), `app_name`, `platform`, `mobbin_url`, `screen_count`. Only some screens come with an inline preview. There is no video and no animation data.
- Image URLs expire after 30 days; cite `mobbin_url`. `search_screens` may return an `ai_usage_notice` that must be shown word for word.

## Design (the contract the files must say)

1. Ask: mandatory, once per task, plain text, one sentence, asked by the first node that can (brainstorm Optional research, otherwise design-brief Phase 0). It no longer requires a named decision. It is skipped only when already answered or inherited downstream, or when the user supplied a finished analysis (ingest only, still recorded). NO_PIN: still ask; if yes, deliver in the conversation and write no project files.
2. Entry on "need analysis": when the user says they want competitor / reference analysis of UI, interaction or motion at any time, the work enters the Mobbin node directly with no second ask. A decline is final for the task.
3. Executor: Mobbin tools only, in the main agent (images must be looked at). `search_flows` for interaction, `search_screens` for UI, `search_sections` for marketing-site sections. Query rules are inlined (one target per query, at most three constraints, platform in the parameter not the query, no brand/copy/taste words, no negations), so the node does not depend on the plugin skill being present. Budget: at most 6 search calls per analysis plus one second pull; more only if the user asks.
4. Two lenses only: UI and interaction. Motion is out of this node by the user's ruling (Mobbin has no video anyway); the node must not claim or invent any motion finding or parameter, and refers motion work to `motion-polish`.
5. Evidence discipline: every guidance point names the image that supports it and claims only what an opened image shows; open `image_url` for any screen cited without a preview; check `app_name`/`platform`; record `mobbin_url`, never the expiring image link; "adopted does not mean effective"; no change is reported honestly.
6. Failure: not authorized, tool refused (credits), or tools absent → NEEDS_CONTEXT with an actionable step (authorize the Mobbin MCP / check plan credits). No automatic fallback. The user may explicitly choose the old document-level scan; that is their choice, never a silent switch.
7. Output: a design reference pack that guides the design, not a list of examples. Folder `docs/research/mobbin-reference-<date>-<slug>/` in the locked project holding `reference-pack.md` and `images/`. Per design point the pack gives: (a) 设计指导 — what to do in this requirement, why, and when not to; (b) 对应图 — the downloaded Mobbin image (copied from `image_url`, because that link expires in 30 days) next to its `mobbin_url`, naming which step or area of the image shows the point; (c) 可采纳条目 — ready-to-adopt Brief lines (D/STATE/AC wording) the user can accept as they are. Header: `scope`, `decision_changed: pending`. The images are internal design reference only and never ship in a product deliverable.
8. Assisting CD/OD: the pack is reference material. The user picks items; adopted items are written into the Brief as D/STATE/AC under the existing adoption rules, then frozen into the Packet and reach CD/OD that way. No new Packet/TAC field, nothing auto-MUST, nothing flows into generation unasked, so CD/OD output stays unchanged unless the user adopts.
8b. The adopted images go to CD/OD as attachments (user ruling: "必须要"), through the existing prototype-evidence channel of `scripts/design-flow-handoff.mjs`, no code change. Verified live: a real Mobbin image (webp) converted with `python3 -I` + PIL to a clean 8-bit RGB PNG (about 570 KB) is accepted by `preparePrototypeEvidence` as `purpose: interaction-reference` with `source_ids` bound to a Packet D/STATE/AC ID. Rules: PNG only (the validator accepts nothing else for images), purpose is always `interaction-reference` (never `visual-reference`: the images guide structure and interaction, not visual style), `source_ids` are the Packet IDs of the adopted items the image supports, only adopted images are attached, path `mobbin/<slug>-<NN>.png`. The pack stores the images already as clean PNG so they are ready when the handoff is built after the freeze. The user's wording for the label is "作为设计参考".
9. ux-research: the Mobbin pass is run by the main agent and handed to ux-research as input; ux-research does not call Mobbin itself.
10. Measurement: keep the per-use log line (date / asked / yes|no / decision_changed). The old "rollback on a high decline rate" is dropped (a mandatory ask makes the rate meaningless); replaced by: after five executed analyses, if `decision_changed=yes` is under one in three, the user reviews whether the node is worth its cost.

## Phases (U-blocks)

- U-001 `.claude/skills/office/references/competitor-scan.md`: rewrite as the Mobbin node per the contract (file path kept so pointers and tests stay stable).
- U-002 `.claude/skills/office/design-brief/SKILL.md` Phase 0 pointer (mandatory one-time ask, enter Mobbin on yes) and the attachment sentence near the Packet freeze (adopted Mobbin images ride as `interaction-reference` evidence), `.claude/skills/office/brainstorm/SKILL.md` Optional-research pointer, and one sentence each in `open-design/SKILL.md` and `claude-design/SKILL.md` saying these attachments are reference only and never override D/STATE/AC or the user's design system.
- U-003 `.claude/agents/references/plan-design-guidance.md` table row and the "competitor analysis" paragraph; update `expectedDesignGuidanceSha256` in `scripts/check-agent-context.mjs`.
- U-004 `.claude/skills/office/ux-research/references/competitor-analysis.md`: pointer line and a short "design evidence library" paragraph (item 9).
- U-005 `scripts/test-design-workflow-frontlight.mjs`: rewrite F12/F13 to the new contract (keep the no-motion-parameter guard), extend the mutation table, add an F14 for the Mobbin node.
- U-006 `.claude/skill-os/skill-invariants.md` output-neutrality note; `CHANGELOG.md` entry.
- U-007 cold review (one agent, default REFUTED), fix, full verify, commit explicit files, fetch without the dead proxy, push, confirm local == remote.

## Assertions

```bash
# [BLOCKING] A1 — frontlight tests pass with mutation
if ( set -o pipefail; node scripts/test-design-workflow-frontlight.mjs ); then echo "PASS A1"; else check_rc=$?; echo "FAIL A1"; exit "${check_rc:-1}"; fi

# [BLOCKING] A2 — generated context and the guidance pin are current
if ( set -o pipefail; python3 scripts/build-agent-context.py check && node scripts/check-agent-context.mjs ); then echo "PASS A2"; else check_rc=$?; echo "FAIL A2"; exit "${check_rc:-1}"; fi

# [BLOCKING] A3 — routing tests still pass
if ( set -o pipefail; node scripts/test-route-guard.mjs && python3 memory/scripts/eval_routing.py --keyword-only ); then echo "PASS A3"; else check_rc=$?; echo "FAIL A3"; exit "${check_rc:-1}"; fi

# [BLOCKING] A4 — the node names Mobbin, covers no motion lens, and requires images
if ( set -o pipefail; grep -q 'search_flows' .claude/skills/office/references/competitor-scan.md && grep -q 'images/' .claude/skills/office/references/competitor-scan.md && ! grep -nE '[0-9]+\s?ms\b|缓动|时长' .claude/skills/office/references/competitor-scan.md ); then echo "PASS A4"; else check_rc=$?; echo "FAIL A4"; exit "${check_rc:-1}"; fi

# [BLOCKING] A5 — full verify
if ( set -o pipefail; bash scripts/verify.sh ); then echo "PASS A5"; else check_rc=$?; echo "FAIL A5"; exit "${check_rc:-1}"; fi

# [BLOCKING] A6 — push landed
if ( set -o pipefail; git -c http.proxy= -c https.proxy= fetch origin && [ "$(git rev-parse main)" = "$(git rev-parse origin/main)" ] ); then echo "PASS A6"; else check_rc=$?; echo "FAIL A6"; exit "${check_rc:-1}"; fi
```

criteria (judged by the cold reviewer, binary, with evidence):
- [C1] The ask is mandatory and happens once; there is no second ask point and no questionnaire.
- [C2] Saying "I need analysis" enters the Mobbin node; a decline is final; failure returns NEEDS_CONTEXT with no silent fallback.
- [C3] The node covers UI and interaction only; it makes no motion claim and invents no motion value.
- [C6] Every guidance point in the pack names the image that supports it and carries a ready-to-adopt Brief line; a pack of bare examples fails.
- [C4] Nothing from Mobbin reaches CD/OD generation unless the user adopts it into the Brief; no new Packet/TAC field.
- [C7] Adopted Mobbin images reach CD/OD as `interaction-reference` PNG attachments bound to Packet IDs; none is sent unadopted, none as `visual-reference`.
- [C5] No file outside the listed U-blocks changed; other sessions' files untouched.

## Failure policy

A BLOCKING failure stops the phase; the same failure three times is BLOCKED with evidence. A reviewer BLOCKER that survives one repair round stops the work and is reported.
