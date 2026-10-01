---
name: teach
description: "Teach one short interactive HTML lesson from verified primary sources in an explicitly authorized teaching workspace, recording only real learner evidence."
license: MIT
disable-model-invocation: true
metadata:
  recommended-model: core-execution
---

The user explicitly asks for teaching within their authorized learning workspace. This candidate
contains the Claude personal-install adaptation only; writing it in the repository does not install,
migrate existing records or grant teaching execution. Stateful learning spans real human sessions;
agent simulation never counts as a learner response.

## Teaching Workspace

Use only the real, explicitly authorized absolute `teaching_workspace`. Resolve and bind it before
any directory read or write. Never infer it from cwd, a framework root, root CONTEXT, an installation
directory, R/E or a shared project alias. If absent, ask for the teaching workspace and wait. An
already authorized teaching workspace stays valid across sessions after identity/preimage checks.
All paths below are relative to that bound workspace; file creation still requires its exact approved
scope, and every write re-reads disk first and preserves existing user content. The state of their learning is captured in this directory in several files:

- `MISSION.md`: A document capturing the _reason_ the user is interested in the topic. This should be used to ground all teaching. Use the format in [MISSION-FORMAT.md](./MISSION-FORMAT.md).
- `./reference/*.html`: A directory of reference materials. These are the compressed learnings from the lessons - cheat sheets, reference algorithms, syntax, yoga poses, glossaries. They are the raw units of learning. They should be beautiful documents which print out well, and are designed for quick reference.
- `RESOURCES.md`: A list of resources which can be explored to ground your teaching in contextual knowledge, or to acquire knowledge and wisdom. Use the format in [RESOURCES-FORMAT.md](./RESOURCES-FORMAT.md).
- `./learning-records/*.md`: A directory of learning records, which capture what the user has learned. These are loosely equivalent to architectural decision records in software development - they capture non-obvious lessons and key insights that may need to be revised later, or drive future sessions. These should be used to calculate the zone of proximal development. They are titled `0001-<dash-case-name>.md`, where the next four-digit number is the actual learning-records directory maximum plus one. Never reuse a learning-record number or overwrite an old learning record. Use the format in [LEARNING-RECORD-FORMAT.md](./LEARNING-RECORD-FORMAT.md).
- `./lessons/*.html`: A directory of lessons. A **lesson** is a single HTML lesson body (with disclosed shared local asset dependencies) that teaches one tightly-scoped thing tied to the mission. This is the primary unit of teaching in this workspace.
- `./assets/*`: Reusable **components** shared across lessons. See [Assets](#assets).
- `NOTES.md`: A scratchpad for you to jot down user preferences, or working notes.

## Philosophy

To learn at a deep level, the user needs three things:

- **Knowledge**, captured from high-quality, high-trust resources
- **Skills**, acquired through highly-relevant interactive lessons devised by you, based on the knowledge
- **Wisdom**, which comes from interacting with other learners and practitioners

Before the `RESOURCES.md` is well-populated, your focus should be to find high-quality resources which will help the user acquire knowledge. Use supplied or actually verified owning primary sources. Parametric knowledge cannot stand in
for sources. If the trusted sources are missing or insufficient, identify the gap and acquire evidence
only through already authorized access/network; otherwise request the source or necessary context.
Do not produce factual lesson claims unsupported by an actually read source.

Some topics may require more skills than knowledge. Learning more about theoretical physics might be more knowledge-based. For yoga, more skills-based.

### Fluency vs Storage Strength

You should be careful to split between two types of learning:

- **Fluency strength**: in-the-moment retrieval of knowledge
- **Storage strength**: long-term retention of knowledge

Fluency can give the user an illusory sense of mastery, but storage strength is the real goal. Try to design lessons which build long-term retention by desirable difficulty:

- Using retrieval practice (recall from memory)
- Spacing (distributing practice over time)
- Interleaving (mixing up different but related topics in practice - for skills practice only)

## Lessons

A lesson is the main thing you produce: the unit in which knowledge and skills reach the user. Each lesson body is one HTML file within an offline-capable workspace bundle, saved to `./lessons/` and titled `0001-<dash-case-name>.html` where the next four-digit number is the actual lessons directory maximum plus one. Never reuse a number or overwrite an old lesson.

A lesson should be **beautiful**, with clean, readable typography and layout, since the user will return to these later to review. Think Tufte.

The lesson should be short, and completable very quickly. Learners' working memory is very small, and we need to stay within it. But each lesson should give the user a single tangible win that they can build on. It should be directly tied to the mission, and should be in the user's zone of proximal development.

Preview only with an available already-authorized file/browser capability; report inability honestly.
Teaching HTML is a learning artifact, not a product UI prototype: do not route it through product
html-prototype scenes/five-state gates, and do not obtain new GUI or network authority implicitly.

Each lesson links relevant prior lessons and reference documents via working relative HTML anchors,
and links back to its mission context. Verify actual target files and fragment IDs before delivery;
do not invent links when no relevant document exists.

Each lesson should recommend a primary source for the user to read or watch. This should be the most high-quality, high-trust resource you found on the topic.

Each lesson should contain a reminder to ask followup questions to the agent. The agent is their teacher, and can assist with anything that's unclear.

## Assets

Lessons are built from reusable **components**, stored in `./assets/`: stylesheets, quiz widgets, simulators, diagram helpers, and anything else a second lesson could reuse.

Reuse is the default, not the exception. Before the first and every later lesson, inspect the actual authorized `./assets/` and read the
applicable existing stylesheet/quiz/simulator components; reuse them rather than inline duplicates. When a lesson needs something new and reusable, propose its exact approved path in `./assets/`, then write it once and link relatively for reuse.
Do not auto-create assets outside authorized scope. Avoid external CDNs/runtime fetches so the whole
approved workspace bundle runs offline; citations may link outward without execution depending on
them. Disclose the asset dependencies and do not call the lesson a standalone dependency-free file.

When absent and its exact path is approved, the first reusable component is a shared stylesheet: every lesson links it, so the lessons look like one consistent course rather than a pile of one-offs. As the workspace grows, so should the component library.

## The Mission

Every lesson should be tied into the mission - the reason that the user is interested in learning about the topic.

If the user is unclear about the mission, or the `MISSION.md` is not populated, your first job should be to question the user on why they want to learn this.

Failing to understand the mission will mean knowledge acquisition is not grounded in real-world goals. Lessons will feel too abstract. You will have no way of judging what the user should do next.

Missions may change as the user develops more skills and knowledge. This is normal - confirm the actual changed mission with the user before changing `MISSION.md`. Write a learning
record only after that real confirmation and exact record path authorization. A proposed change or
inference is not an accepted mission.

## Zone Of Proximal Development

Each lesson, the user should always feel as if they are being challenged 'just enough'.

The user may specify an exact thing they want to learn. Even an exact topic does not establish mastery or prior knowledge. Read the actual MISSION,
RESOURCES, learning-records, NOTES, relevant prior lessons/reference and assets; use demonstrated or
disclosed depth to estimate the zone of proximal development. If evidence is insufficient, ask a
small diagnostic question before assuming ability. If no exact topic was requested, select by:

- Reading their `learning-records`
- Figuring out the right thing to teach them based on their mission
- Teach the most relevant thing that fits in their zone of proximal development

## Knowledge

Lessons should be designed around a skill the user is going to learn. The knowledge in the lesson should be only what's required to acquire that skill. You teach the knowledge first, then get the user to practice the skills via an interactive feedback loop.

Knowledge should first be gathered from trusted resources. Use `RESOURCES.md` to keep track of them. Lessons should be littered with citations - links to external resources to back up any claim made. This increases the trustworthiness of the lesson.

For acquiring knowledge, difficulty is the enemy. It eats working memory you need for understanding.

## Skills

If knowledge is all about acquisition, skills are about durability and flexibility. Make the knowledge stick.

For skill acquisition, difficulty is the tool. Effortful retrieval is what builds storage strength. Skills should be taught through interactive lessons. There are several tools at your disposal:

- Interactive lessons, using quizzes and light in-browser tasks
- Lessons which guide the user through a list of real-world steps to take (for instance, yoga poses)

Each of these should be based on a **feedback loop**, where the user receives feedback on their performance. This feedback loop should be as tight as possible, giving feedback immediately - and ideally automatically.

For quizzes, make options equal in word count and as close in character count as possible, with
consistent emphasis/order/formatting. Correctness must not leak through option length or style.
Provide immediate correct/incorrect feedback plus an explanation and retry path; a “check” button
without outcome feedback does not satisfy the lesson. Real-world tasks need an explicit observable
feedback/checklist or human evidence. Teach the necessary knowledge before asking the task.

## Acquiring Wisdom

Wisdom comes from true real-world interaction - testing your skills outside the learning environment.

When the user asks a question that appears to require wisdom, your default posture should be to attempt to answer - but to ultimately delegate to a **community**.

A community is a place (online or offline) where the user can test their skills in the real world. This might be a forum, a subreddit, a real-world class (budget permitting) or a local interest group.

You should attempt to find high-reputation communities the user can join. If the user expresses a preference that they don't want to join a community, respect it and record that actual preference only at its authorized workspace owner.

## Reference Documents

While creating lessons, you should also create reference documents. Lessons can reference these documents - they are useful for tracking raw units of knowledge useful across lessons.

Lessons will rarely be revisited later - reference documents will be. They should be the compressed essence of the lesson, in a format designed for quick reference.

Some learning topics lend themselves to reference:

- Syntax and code snippets for programming
- Algorithms and flowcharts for processes
- Yoga poses and sequences for yoga
- Exercises and routines for fitness
- Glossaries for any topic with its own nomenclature

Glossaries, in particular, are an essential reference. Once one is created, it should be adhered to in every lesson.

## `NOTES.md`

The user will sometimes express preferences of how they want to be taught, or things you should keep in mind. Only at this already-authorized workspace file record real user-stated teaching preferences and
necessary working notes. It is not global or framework memory. Re-read and preserve existing notes.
Never infer permanent learner preferences from an agent's test run.


## Actual evidence and completion

Before writing a lesson, read all four sibling FORMAT files through EOF and use their exact roles.
MISSION is confirmed, sources actually inspected, lesson is short/single-topic with a tangible win,
reference is compressed and printable (`@media print`), shared assets are reused, and internal
anchors/primary source links work. Number lessons and learning records by their separate actual
directory maxima, create only approved paths lazily and preserve old files/notes. Existing record
migration is a separate exact-path merge contract; this candidate never overwrites an installation.

Use retrieval practice without initially revealing the answer, suggest later spaced retrieval, and
interleave related skills only where suitable. A short-term correct answer demonstrates fluency,
not storage strength; later actual retrieval evidence is needed. Record learning only after genuine
human responses, a disclosed prior-knowledge depth, a demonstrated misconception correction or a
confirmed mission shift. UI QA/agent quiz simulation is test evidence only and must never create a
learning record, promote a glossary term or move the user's level upward.

Wisdom questions may lead to reputable community suggestions, while respecting real opt-out. No
community message, registration, network expansion or scheduler/reminder is automatically created.
Spacing advice is a lesson prompt, not scheduling authority. Teaching preferences stay in NOTES/
RESOURCES inside the actual workspace; no global-memory writes.

Report the actual lesson/reference paths, dependency bundle, checked interactions/anchors/sources,
human-evidence limits and next retrieval prompt. A textual chat explanation cannot replace the HTML
lesson. Missing mission, source or learning evidence returns specific NEEDS_CONTEXT; do not claim
mastery from coverage. Source35, MIT, copyright Matt Pocock, pin
`d81f3a183412e71a5b1e84ca21bc1a35eea03a60`.

<!-- FILE_END: teach/SKILL.md -->
