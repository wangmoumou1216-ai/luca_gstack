# Architecture candidates: offline visual HTML report

Consumed through EOF by code-recon's explicit architecture-opportunities branch. This is the
report method owner, not a new skill or a product prototype. Bind actual code/ADR/vocabulary,
independent explorer evidence, original U-ID/scope/resume_target and exact approved report_path.
Default suggestion uses real OS temp (`TMPDIR`, else /tmp; TEMP on Windows), with a fresh
architecture-review-<timestamp>.html; canonical path/preimage/output authority must still be
confirmed before writing. No repo fallback or arbitrary temp write by inference.

## Evidence and candidate card

Use codebase-design's exact module/interface/implementation/depth/seam/adapter/leverage/locality
terms and the actual project's domain nouns. Depth is interface leverage, not LOC ratio. For each
actual candidate render one article with a stable id:

- Short title naming the proposed deepening and badges: Strong / Worth exploring / Speculative;
  dependency category in-process / local-substitutable / remote-but-owned (ports & adapters) /
  true external (mock). Unknown dependency stays UNKNOWN rather than invented stand-in.
- Actual files/modules with line/commit/read evidence and observed friction. No fabricated hotspot.
- Before and After side by side, visible and non-empty: Before depicts current code; After is
  labelled Proposed and preserves known behavior. Do not propose a new interface design yet.
- Problem and solution, one concise sentence each; wins in locality/leverage/testing terms.
- Deletion evidence: wrapper removal makes complexity disappear→shallow; deleting load-bearing
  module spreads complexity to callers→earning its keep. Don't swap the direction.
- Relevant ADR conflict callout only when real friction warrants reopening it; cite actual ADR
  and why, not a list of theoretical forbidden refactors.

End with one Top recommendation naming a real card, one reason and an anchor to it. It is a
recommendation, not adoption. User must actually choose before grilling/design/interface work.

## Scaffold and offline renderer

One self-contained UTF-8 HTML. Use existing general report capability or inline CSS/SVG/verified
local resources; **no CDN, remote scripts/fonts/images, dependency installs or network writes**.
Source Tailwind/Mermaid CDN is adapted to plain CSS and rendered SVG. An already available local
Mermaid renderer may produce inline SVG, but unrendered mermaid text is not a diagram. This is
code explanation; no product five-state/24-point aesthetics gate.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Architecture review — ACTUAL_REPO</title>
  <style>
    body { margin:0; background:#fafaf9; color:#0f172a; font:16px/1.5 system-ui; }
    main { max-width:68rem; margin:auto; padding:3rem 1.5rem; }
    article, #top-recommendation { background:white; border:1px solid #cbd5e1; border-radius:12px; padding:1.5rem; margin:2rem 0; }
    .pair { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
    .pair svg { width:100%; min-height:240px; }
    .module { fill:#fff; stroke:#334155; stroke-width:2; }
    .deep { fill:#0f172a; stroke:#0f172a; stroke-width:4; }
    .seam { stroke:#64748b; stroke-dasharray:4 4; }
    .leak { stroke:#dc2626; }
    .warning { background:#fffbeb; border-left:4px solid #d97706; padding:.75rem; }
    .files { font:13px/1.5 ui-monospace,monospace; }
    @media(max-width:700px) { .pair { grid-template-columns:1fr; } }
  </style>
</head>
<body><main>
  <header><h1>ACTUAL_REPO · ACTUAL_DATE</h1>
    <p>Solid box: module · dashed: seam · red arrow: leakage · thick dark: deep module</p>
  </header>
  <section id="candidates"><!-- real candidate articles and visible diagrams --></section>
  <section id="top-recommendation"><!-- real name, reason, href to card --></section>
</main></body>
</html>
```

This scaffold must be filled from real evidence; comments/tokens are not an acceptable report.
Escape file names/domain text into HTML, include SVG title/description and legible labels, retain
before/proposed distinction, and don't use mass height as a claimed quantitative depth metric.
Each article orders title/badges/files, centerpiece before/after, problem/solution/wins, ADR callout.

## Diagram patterns: choose what communicates this candidate

Mix patterns when evidence differs; don't force every candidate into the same generic graph:

1. **Graph/flow/sequence**: dependencies, calls or round trips. Render actual nodes/arrows as inline
   SVG or already available local renderer output. Red leakage edges, dark deep module; before
   six real round trips versus a proposed consolidated path only when evidence supports it.
2. **Boxes and arrows**: bordered modules plus positioned inline SVG paths when graph layout
   obscures the point; After has a thick deep module and faded internal implementation.
3. **Cross-section**: stacked thin modules show current call layers; proposed deep module shows
   consolidated responsibility. Label real roles so decorative stripes don't stand in for structure.
4. **Mass diagram**: interface and implementation rectangles visualize relative learning burden
   qualitatively; no LOC ratio or invented measured depth. Explain what callers actually know.
5. **Call-graph collapse**: real call tree before, same responsibility behind one module after,
   now-internal calls faded. Preserve dependency type and testing seam in the proposed picture.

Editorial spacing, stone/slate background, one restrained accent, red leakage, amber warning;
side-by-side diagrams around 320px when legible, compact schematic labels. Prose sparse: if a
diagram needs a paragraph, redraw it. Wins name locality/leverage/test interface, not “cleaner code”.
Use domain nouns with architecture vocabulary; don't substitute component/service/unit for module,
API/signature for full interface, or boundary for seam. No app code, auth, routes or data writes.

## Actual browser validation and handoff

Only within current effect authority open the exact absolute file (existing app/browser capability,
or authorized OS open). Inspect every diagram is truly visible/readable, before/after labels match
code/proposal, Top anchor navigates to the real article, console has no errors, and resource/network
observation confirms offline rendering and zero network writes. Save actual browser evidence.
If browser was not run, NOT_RUN; markup/screenshot placeholders cannot be called visual PASS.

Show path and ask the real user which candidate to explore. No answer, rejection or missing owner
means stop at report. Selection hands the same U-ID/scope/resume_target/authority intersection to
grilling→codebase-design, not automatic implementation. A load-bearing rejection may merit an ADR
proposal; domain term updates return to domain-modeling's real human/write gate. Alternative
interfaces still require its own approved independent serial design process.

Source08 improve-codebase-architecture/SKILL.md and HTML-REPORT.md, Matt Pocock, MIT,
pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`; offline and permission adaptation is explicit.
<!-- FILE_END: code-recon/references/architecture-candidates-report.md -->
