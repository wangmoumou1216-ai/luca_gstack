# Shape — exploit

Read through FILE_END before any shape proposals. The shared skill body owns path identity,
material immutability, disk preimages and handoff; this file owns paragraph-by-paragraph
shaping. Source 27: `skills/in-progress/writing-shape/SKILL.md`, Matt Pocock, MIT, pin
`d81f3a183412e71a5b1e84ca21bc1a35eea03a60`, blob
`02f2866d13e72504e010f2ad3458eb9b36b876db`.

## A fixed quarry, a separate article

Read the complete input pile through EOF. It can be a tidy fragment list, unstructured prose
or a transcript. The exploring is done: **exploit** means commit to a path through that
material and mine it for an article. The pile is read-only; the article has its own exact,
authorized target. Neither a soft-link nor a hard-link alias is a separate target.

The author selects the opening and agrees each block before it is written. Missing input,
path, prerequisites or agreement pauses the dependent step; an unanswered question is not
permission to choose for them.

## Ground the reader's journey

Before any openings, settle with the real author what the audience already knows. Ask which
concepts the reader brings and obtain an actual answer; don't label your guesses as confirmed
prerequisites. Established answers from this session/handoff need not be asked again.

A concept is **grounded** if it is a confirmed prerequisite or the current article has
actually introduced it. Where the concept has a named term, land the idea and term together.
Grounding is about ideas, not merely finding a word in the text: ordinary words can hide an
idea the reader has never met. Each block `requires` established concepts and `grounds`
new concepts. Keep a running grounded set based on the real article.

Every candidate must satisfy `requires ⊆ grounded` before selection. If the next move needs
an ungrounded concept, introduce it in a prior grounding block first, or explicitly settle
a changed prerequisite with the author. Too many prerequisites exclude readers; too many
early definitions drown the opening. Discuss the trade-off rather than silently assuming
expertise. The selected block's new concepts enter grounded only when that block is actually
written and still establishes them in the current disk version.

## Build and agree one block at a time

1. After the full pile read and prerequisite confirmation, draft **2–3 candidate openings**
   from the supplied material. They imply different theses or angles, and each is reachable
   from the confirmed prerequisites. Show their actual text, purpose and concepts. The real
   author chooses one or composes a hybrid; wait. The choice defines the article's promise.
2. Re-read the article/preimage and immediately write only the agreed opening. STOP writing.
   Do not treat that choice as agreement to a complete article or later paragraphs.
3. Re-read the current disk article. Ask “given this opening, what does the reader need to
   hear next?” Pull supporting material from the pile and propose one reachable block with
   its job, requires, grounds and a deliberate form. Discuss and obtain actual agreement.
4. Re-read again before the narrow append, write that agreed block immediately, then STOP
   writing. Never accumulate several agreements for a later batch or write ahead of them.
5. On the next decision, continue from the actual article. Repeat until the author decides
   the article is done. A rewritten opening can change what the next block needs to do.

A block may be prose, list, table, callout, quote or code; it need not be exactly one
paragraph. Argue for its form aloud with the author, using the trade-offs below.

## Push on the argument

This inverts an ideation interview: ask what the article is arguing, and what order makes
that argument legible. Push back on weak transitions and blocks that haven't earned their
place. Propose a cut; apply it only after the author's specific agreement.

- What does this paragraph do for the reader that the previous one didn't?
- If we cut it, what breaks?
- Is this prose or a list, and why?
- This sentence does two jobs: split it or choose one.
- The opening promised X and we drifted to Y: re-thread this, or agree an opening revision.

## Mine real material; name the gaps

The pile is a quarry, not a script. Split a fragment over blocks, merge several, paraphrase,
or quote when the wording itself matters. Fit the surrounding prose so the article reads
in one voice. Quoted text must come from real supplied material; do not manufacture quotes.

If a promised example, fact or premise is absent, name the specific gap: “We need an example
here and the pile doesn't have one. Give me one or we cut this section.” Wait for real
material or an agreed cut. Do not mine new facts from imagination, silently research beyond
scope, or repair the raw file. Use additional supplied evidence only after the author
confirms how it joins the read-only material for this session.

## Format arguments to have with the author

| Choice | Reason to discuss |
|---|---|
| Prose / list | Prose carries an argument; a list helps genuinely parallel items scan quickly. Nonparallel items need prose. |
| Inline / callout | A tip, warning or aside may use `> [!TIP]` or `> [!NOTE]` only if it would derail the main argument inline. Otherwise keep it inline. |
| Table / repeated structure | Three or more instances with the same fields suit a table; otherwise prose with bold leads may work better. |
| Quote / paraphrase | Quote when the original wording is the point; paraphrase when the idea matters. |
| Code block / inline code | Multiline, runnable or illustrative code suits a block; a single identifier/token suits inline code. |

Each form choice has a reason and real author agreement; it is not an unannounced platform
formatting pass. No unrequested frontmatter, publication or destination-specific decoration.

## Preserve the living article and let the author end

Re-read disk before every write and after edits. When asked to rewrite a paragraph/block,
edit only that current paragraph/block and leave the rest alone. Substantive edits or rollback
recompute introduced concepts and the article's promise from current bytes, not cached state.
If later blocks now depend on a removed foundation, name that gap and discuss the next repair;
don't rewrite other paragraphs without agreement.

The author decides when it is done. Deliver the actual separate article path and any open
questions through the shared completion/handoff rules; no whole-article auto-completion.

<!-- FILE_END: writing-workshop/references/shape.md -->
