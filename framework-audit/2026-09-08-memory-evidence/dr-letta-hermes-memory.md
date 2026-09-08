<research_findings agent="4" angle="Letta and Nous Hermes official memory mechanisms: persistence, semantic memory, skill learning, retrieval">

<search_log>
  <round number="1">
    <queries>
      <query tool="websearch">Letta memory official docs archival core memory source repository</query>
      <query tool="websearch">Letta agent memory blocks archival memory recall official docs</query>
      <query tool="websearch">Nous Hermes memory official repository paper long term memory skills</query>
      <query tool="websearch">Nous Hermes 3 technical report memory tool use official paper</query>
    </queries>
    <results_useful_urls>
      https://docs.letta.com/guides/core-concepts/memory/memory-blocks/ -> Round 2
      https://docs.letta.com/api/resources/agents -> Round 2
      https://docs.letta.com/api/typescript/resources/agents/subresources/passages -> Round 2
      https://www.letta.com/blog/memory-blocks/ -> Round 2
      https://www.letta.com/blog/context-repositories/ -> Round 2
      https://arxiv.org/abs/2310.08560 -> Round 2
      https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/ -> Round 2
      https://hermes-agent.nousresearch.com/docs/user-guide/which-file-does-what -> Round 2
      https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers/ -> Round 2
      https://hermes-agent.nousresearch.com/docs/user-guide/features/skills/ -> Round 2
      https://hermes-agent.nousresearch.com/docs/developer-guide/memory-provider-plugin -> Round 2
      https://arxiv.org/abs/2508.18255 -> Round 2
    </results_useful_urls>
  </round>
  <round number="2">
    <webfetch_urls>
      https://docs.letta.com/guides/core-concepts/memory/memory-blocks/
      https://docs.letta.com/api/resources/agents
      https://docs.letta.com/api/typescript/resources/agents/subresources/passages
      https://www.letta.com/blog/memory-blocks/
      https://www.letta.com/blog/context-repositories/
      https://arxiv.org/abs/2310.08560
      https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/
      https://hermes-agent.nousresearch.com/docs/user-guide/which-file-does-what
      https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers/
      https://raw.githubusercontent.com/NousResearch/hermes-agent/main/website/docs/user-guide/features/memory.md
      https://raw.githubusercontent.com/NousResearch/hermes-agent/main/website/docs/user-guide/features/memory-providers.md
      https://raw.githubusercontent.com/NousResearch/hermes-agent/main/website/docs/developer-guide/memory-provider-plugin.md
      https://raw.githubusercontent.com/NousResearch/hermes-agent/main/website/docs/user-guide/which-file-does-what.md
      https://arxiv.org/abs/2508.18255
    </webfetch_urls>
    <new_leads>
      Letta: memory blocks are persisted editable context sections; archival memory is exposed as passages with create/list/delete/search endpoints; MemGPT is the original Letta lineage paper; Letta Code moves memory into git-backed Context Repositories/MemFS and adds skills as procedural memory.
      Hermes: built-in MEMORY.md/USER.md are bounded frozen startup memory; session search is separate FTS retrieval; external providers are additive and single-active; provider hooks cover prefetch, sync_turn, session-end extraction, pre-compress checkpointing, and memory-write mirroring; skills are separate progressive-disclosure procedural knowledge.
      Nous Hermes model reports describe model training/evaluation, not a built-in persistent-memory architecture.
    </new_leads>
    <followup_queries>
      <query tool="websearch">Letta Code skills memory official repository system prompt MEMORY.md skills</query>
      <query tool="websearch">site:github.com/letta-ai/letta-code MEMORY.md skills Letta Code official</query>
      <query tool="websearch">site:hermes-agent.nousresearch.com/docs memory Hermes Agent Persistent Memory USER.md MEMORY.md</query>
      <query tool="websearch">site:hermes-agent.nousresearch.com/docs memory providers Hermes Agent</query>
      <query tool="websearch">site:hermes-agent.nousresearch.com/docs skills MEMORY.md USER.md AGENTS.md</query>
    </followup_queries>
  </round>
  <round number="3">
    <verification_targets>
      F1/F2: Letta core memory vs archival/retrieval.
      F3: Letta skill learning and MemFS vs legacy server memory.
      F4/F5/F6: Hermes built-in persistent memory, retrieval, provider plugins, skill learning.
      F7: Hermes model report vs Hermes Agent runtime distinction.
    </verification_targets>
    <verification_queries>
      <query tool="websearch">MemGPT original paper Letta memory archival recall core memory arxiv</query>
      <query tool="websearch">Letta Context Repositories Git-based Memory official paper MemFS</query>
      <query tool="websearch">site:hermes-agent.nousresearch.com/docs developer memory provider plugin prefetch sync_turn on_session_end</query>
    </verification_queries>
    <findings_revised>
      Letta API memory and Letta Code MemFS were kept separate: the API exposes DB-backed blocks/passages/folders/files, while Letta Code research/docs emphasize local git-backed context repositories.
      Nous "Hermes" was split into Hermes Agent, which has documented runtime memory, and Hermes 4 model, whose technical report documents hybrid reasoning/instruction following rather than persistent memory.
      Provider claims such as "semantic search", "dialectic reasoning", or "automatic extraction" were treated as capabilities and configuration surfaces, not as externally proven effectiveness.
    </findings_revised>
  </round>
  <totals>
    <total_websearches>12</total_websearches>
    <total_webfetches>14</total_webfetches>
  </totals>
</search_log>

<finding id="1">
  <claim>Letta's core memory is persisted editable in-context state, implemented as memory blocks rather than unstructured chat history.</claim>
  <detail>Letta docs and API pages describe a Block as a reserved section of the LLM context window with value, label, description, limit, read-only flag, metadata, timestamps, and attach/detach operations. Blocks can be shared across agents and edited through API/tool interfaces. This is persistent state compiled into prompts, not a semantic search index by itself.</detail>
  <source>https://docs.letta.com/guides/core-concepts/memory/memory-blocks/; https://docs.letta.com/api/resources/agents</source>
  <source_type>official_docs</source_type>
  <source_date>Letta docs crawled today / search index 3-5 months old depending on page</source_date>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Direct API schema and official conceptual docs agree.</evidence_basis>
  <evidence>Docs define memory blocks as persisted editable sections of in-context memory and expose `/core-memory/blocks` retrieve/update/list/attach/detach endpoints.</evidence>
</finding>

<finding id="2">
  <claim>Letta archival memory is distinct from core memory and is exposed as passage storage with search endpoints.</claim>
  <detail>The Agents API lists archival-memory operations: list passages, create passage, delete passage, and search archival memory. This maps to the MemGPT lineage where core memory stays in the prompt, recall storage tracks chronological conversation history, and archival storage provides longer-term external storage retrieved on demand. The official docs do not prove that every stored passage is semantically correct; they expose storage and retrieval machinery.</detail>
  <source>https://docs.letta.com/api/typescript/resources/agents/subresources/passages; https://arxiv.org/abs/2310.08560</source>
  <source_type>official_docs | academic</source_type>
  <source_date>MemGPT submitted 2023-10-12, revised 2024-02-12; Letta API page crawled 3 months ago</source_date>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>API endpoints and original MemGPT paper define the memory-tier boundary.</evidence_basis>
  <evidence>Letta exposes `/v1/agents/{agent_id}/archival-memory` and `/archival-memory/search`; MemGPT describes hierarchical memory tiers and tool-mediated movement between fast and slow memory.</evidence>
</finding>

<finding id="3">
  <claim>Letta Code's newer memory architecture uses git-backed Context Repositories/MemFS for progressive disclosure and skill learning.</claim>
  <detail>The Context Repositories post says Letta Code stores a copy of agent context in a local filesystem, with git versioning, file descriptions/frontmatter, and a `system/` area for always-loaded context. It frames skills as procedural memory stored in the memory filesystem and says memory reflection and defragmentation agents can update memory/skills in worktrees. This is a stronger provenance story than opaque memory writes, but the post is a product/research announcement rather than a public benchmark showing outcome gains.</detail>
  <source>https://www.letta.com/blog/context-repositories/; https://github.com/letta-ai/letta-code/blob/main/src/agent/subagents/builtin/reflection.md</source>
  <source_type>official_docs | code</source_type>
  <source_date>Context Repositories published 2026-02-12; GitHub prompt crawled last month</source_date>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG for mechanism; MODERATE for claimed benefits</evidence_strength>
  <evidence_basis>Official source and prompt files document the mechanism, while effectiveness claims are not independently measured here.</evidence_basis>
  <evidence>The post says context repositories are git-backed and support concurrent subagent memory work; reflection prompt says durable reusable workflows can become skills under `$MEMORY_DIR/skills/`.</evidence>
</finding>

<finding id="4">
  <claim>Hermes Agent built-in memory is bounded, file-backed, and injected as a frozen startup snapshot.</claim>
  <detail>Hermes docs define two built-in stores: `MEMORY.md` for agent notes and `USER.md` for the user profile, stored under `~/.hermes/memories/`. The limits are 2,200 and 1,375 characters respectively; writes use add/replace/remove, exact duplicates are rejected, memory is scanned for injection/exfiltration patterns, and the in-prompt snapshot does not update until the next session. This is persistent in-context memory, not live retrieval.</detail>
  <source>https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/; https://raw.githubusercontent.com/NousResearch/hermes-agent/main/website/docs/user-guide/features/memory.md</source>
  <source_type>official_docs | code</source_type>
  <source_date>Hermes docs crawled 5 days ago; raw source fetched 2026-09-08</source_date>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Official hosted docs and repository source match.</evidence_basis>
  <evidence>Docs say MEMORY.md and USER.md are loaded into the system prompt once at session start and enforce strict character limits.</evidence>
</finding>

<finding id="5">
  <claim>Hermes separates persistent memory from retrieval over prior sessions.</claim>
  <detail>The memory docs describe `session_search` as SQLite FTS5 over CLI and messaging sessions, returning actual messages with no LLM summarization or truncation. The docs explicitly contrast memory and session search: memory is small, always in context, and paid every prompt in token cost; session search is on-demand retrieval over past conversations. This makes retrieval available without promoting every historical fact into memory.</detail>
  <source>https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/</source>
  <source_type>official_docs</source_type>
  <source_date>crawled 5 days ago</source_date>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Direct table in official docs distinguishes memory and session search.</evidence_basis>
  <evidence>The table says persistent memory is about 1,300 tokens total and always in context; session search is unlimited, FTS5-backed, and searched when needed.</evidence>
</finding>

<finding id="6">
  <claim>Hermes external memory providers are additive, single-active, and lifecycle-driven; they cover semantic retrieval and capture only when a provider implements it.</claim>
  <detail>Hermes ships external provider plugins alongside built-in memory; only one external provider can be active at a time. The provider docs list pre-turn context injection, non-blocking prefetch, post-turn sync, session-end extraction, mirroring built-in memory writes, and provider-specific tools. The developer guide exposes hooks such as `prefetch`, `queue_prefetch`, `sync_turn`, `on_session_end`, `on_pre_compress`, and `on_memory_write`; it also warns cloud providers to document off-device message content.</detail>
  <source>https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers/; https://raw.githubusercontent.com/NousResearch/hermes-agent/main/website/docs/developer-guide/memory-provider-plugin.md</source>
  <source_type>official_docs | code</source_type>
  <source_date>provider docs crawled 5 days ago; raw source fetched 2026-09-08</source_date>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Hosted docs and repository developer guide define the lifecycle and single-provider constraint.</evidence_basis>
  <evidence>Docs say providers prefetch relevant memories before each turn and sync turns after each response; developer guide says `sync_turn()` must be non-blocking and lists lifecycle hooks.</evidence>
</finding>

<finding id="7">
  <claim>Hermes skill learning is procedural memory, separate from MEMORY.md/USER.md and from semantic retrieval providers.</claim>
  <detail>Hermes docs describe skills as on-demand knowledge documents loaded progressively to minimize token usage, with source of truth under `~/.hermes/skills/`. The persistent-memory docs describe a background self-improvement review that can save memory or update skills, controlled by `skills.write_approval` and background review settings. This means skills encode reusable procedures and tool knowledge, while MEMORY.md/USER.md encode compact always-on facts and preferences.</detail>
  <source>https://hermes-agent.nousresearch.com/docs/user-guide/features/skills/; https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/</source>
  <source_type>official_docs</source_type>
  <source_date>skills page crawled today; memory page crawled 5 days ago</source_date>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Official docs give different storage paths, loading behavior, and approval gates.</evidence_basis>
  <evidence>Skills live under `~/.hermes/skills/` and are loaded on demand; memory stores live under `~/.hermes/memories/` and are injected at startup.</evidence>
</finding>

<finding id="8">
  <claim>Nous Hermes model reports should not be counted as persistent-memory mechanisms unless paired with Hermes Agent or another runtime.</claim>
  <detail>The Hermes 4 Technical Report describes hybrid reasoning models, training, data curation, and benchmark evaluation across math, coding, knowledge, comprehension, and alignment. Its abstract does not claim a built-in persistent memory store, user profile, memory provider lifecycle, skill-learning system, or retrieval substrate. Therefore the official persistent-memory mechanism belongs to Hermes Agent runtime/docs, while the Hermes model is an inference model that may be used inside such a runtime.</detail>
  <source>https://arxiv.org/abs/2508.18255</source>
  <source_type>academic</source_type>
  <source_date>submitted 2025-08-25, revised 2025-09-02</source_date>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG for absence in abstract/metadata; MODERATE for full-paper negative claim</evidence_strength>
  <evidence_basis>Official paper metadata and abstract define scope as model training/evaluation, not runtime memory; full PDF was not deeply parsed beyond the arXiv abstract page.</evidence_basis>
  <evidence>The report presents Hermes 4 as hybrid reasoning models and says it evaluates mathematical reasoning, coding, knowledge, comprehension, and alignment benchmarks.</evidence>
</finding>

<contradictions>
  Letta appears in two eras: server/API memory blocks and archival passages remain documented, while Letta Code blog posts say memory is moving toward git-backed Context Repositories and away from specialized legacy memory tools. These are not strictly contradictory; they are different product surfaces and a transition path. Hermes similarly has built-in file memory plus optional provider plugins; provider marketing phrases should not be read as a guarantee of memory quality.
</contradictions>

<gaps>
  I did not find an official Nous "nous-memory" repository; a direct raw README fetch under `NousResearch/nous-memory` returned 404. I therefore used Hermes Agent docs/source and Hermes 4 report as the official Nous/Hermes sources.
  I did not find public benchmark evidence proving Letta/Hermes memory improves task outcomes in general. Letta has evaluation/research posts, and Hermes docs list mechanisms, but the claims here are limited to documented capability and architecture.
  I did not install or run either system, preserving the research-only scope and avoiding service/API costs.
</gaps>

<depth_check>
  PASS. Completed 3 rounds, used only official Letta docs/API/blog/repo, official Hermes Agent docs/repo, and original arXiv papers. Full-read/opened more than 3 official originals, produced 8 findings, separated persistence, semantic memory/retrieval, skill learning, and model/runtime scope, and did not edit the repository.
</depth_check>

</research_findings>
