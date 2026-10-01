# Pull-request body from actual change evidence

Read at implement/Orchestrator publication preparation, including marking a draft ready after final
review. Use actual immutable base/head/diff, source requirement and current verification records.
Preparing a body is not authority to send/create/update/mark ready or close tickets; each external
effect needs exact real approval. code-review remains read-only. Missing diff/evidence is a named
gap and blocks publication, never a fabricated link, screenshot or success.

Use the actual domain vocabulary owner when authorized; do not assume GLOSSARY.md exists or
create it. Keep prose brief and each view next to the claim it supports. Three non-empty sections:

```markdown
## Summary

<smallest useful visual sketch from the actual diff>

## Evidence

- **Before:** <real screenshot, output or failing behavior/command>
  **After:** <real screenshot, output or passing behavior/command>

## Merge Danger

**Door:** <one-way or two-way, with the actual recovery condition>
**Blast Radius:** <scope of affected callers/data/runtime, with concrete ramifications>
```

## Summary: choose the smallest explanatory view

Lead with the concrete problem and resulting behavior, then the smallest view needed for the
reviewer to understand ownership/order. Choose one or a few, not every visual:

- Logic/algorithm: pseudocode of the actual decision.
- Runtime flow: call tree of only the relevant calls.
- UI structure: component tree with relevant actual paths/state/module ownership.
- File responsibility/refactor: shallow file tree of changed ownership.
- Interaction/control/data: small Mermaid diagram when relationships matter.
- Existing recognizable shape: diff sketch (component/file/call/state change).
- Mostly new logic, hidden ordering/ownership or a useful copyable target: show the whole relevant
  block, with actual code rather than ellipses that conceal the behavior.

Example shape, replace all example facts with real diff evidence:

```diff
 on(save)
-  write content
+  if unchanged: return cached result
+  write content; invalidate cache
```

No empty diagram, invented files or process diary. Select views that answer the current review
question and keep irrelevant calls/props/states out.

## Evidence: before and after with inspectable provenance

Visual changes use actual before/after screenshots when the environment supports them; preserve
capture path/context. Other changes use actual execution output, exact test/command, exit and
known failure→success. Link only real accessible local artifacts or verified check/PR URLs from
the current candidate head. A static/syntax check does not prove behavior. Label NOT_RUN/UNKNOWN
and missing baseline honestly; never invent “before failed” or omit a regression.

## Merge Danger: door and blast radius

Two-way means actual reversal is cheap and known; one-way covers destructive or hard-to-reverse
state/decisions. Explain the concrete recovery constraint, not a default adjective. Blast radius
states the affected callers, layout, consumers, mobile/runtime paths, data or shared configuration
and plausible consequences visible from this change. A small diff can have a wide radius.

Before any external effect, re-read actual head/base and evidence binding; drift goes back to the
owner rather than publishing stale approval. Use a structured tool body or body-file preserving
real newlines. Attach the created PR by the app's required artifact tool and retain the real URL;
never fabricate a PR link for a draft body. Ticket closing is separately authorized.

Source22 pr, Matt Pocock, MIT, pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`. Its Summary visual
menu and placement guidance credit Dex Horthy / Humanlayer `show-me`:
https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md
No runtime dependency on that external skill is introduced.
<!-- FILE_END: implement/references/pull-request.md -->
