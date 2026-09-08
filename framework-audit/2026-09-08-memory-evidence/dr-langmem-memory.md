<research_findings agent="3" angle="LangGraph/LangMem namespaced long-term store, short-term state, hot path vs background extraction, concurrency, update, evaluation">

<search_log>
  <round number="1">
    <queries>
      <query tool="context7">Resolve LangGraph for long-term memory namespaces, store, short-term state, hot path, background extraction, concurrency, evaluation</query>
      <query tool="context7">Resolve LangMem for background memory extraction, concurrency, update, evaluation</query>
      <query tool="websearch">LangGraph long term memory namespaces official</query>
      <query tool="websearch">LangMem background memory extraction concurrency</query>
      <query tool="websearch">site:docs.langchain.com/oss/python/langgraph persistence stores memory namespaces</query>
      <query tool="websearch">site:langchain-ai.github.io/langmem background_quickstart delayed_processing evaluation</query>
    </queries>
    <results_useful_urls>
      https://docs.langchain.com/oss/python/concepts/memory -> Round 2
      https://docs.langchain.com/oss/python/langgraph/persistence -> Round 2
      https://langchain-ai.github.io/langmem/ -> Round 2
      https://langchain-ai.github.io/langmem/background_quickstart/ -> Round 2
      https://langchain-ai.github.io/langmem/hot_path_quickstart/ -> Round 2
      https://langchain-ai.github.io/langmem/guides/delayed_processing/ -> Round 2
      https://langchain-ai.github.io/langmem/guides/extract_semantic_memories/ -> Round 2
      https://langchain-ai.github.io/langmem/guides/dynamically_configure_namespaces/ -> Round 2
      https://langchain-ai.github.io/langmem/reference/memory/ -> Round 2
      https://docs.langchain.com/langsmith/evaluation -> Round 2
      https://docs.langchain.com/langsmith/evaluate-llm-application -> Round 2
      https://docs.langchain.com/langsmith/experiment-configuration -> Round 2
      https://www.langchain.com/pricing -> Round 2
    </results_useful_urls>
  </round>
  <round number="2">
    <webfetch_urls>
      https://docs.langchain.com/oss/python/concepts/memory
      https://docs.langchain.com/oss/python/langgraph/persistence
      https://langchain-ai.github.io/langmem/background_quickstart/
      https://langchain-ai.github.io/langmem/guides/delayed_processing/
      https://langchain-ai.github.io/langmem/hot_path_quickstart/
      https://langchain-ai.github.io/langmem/guides/extract_semantic_memories/
      https://langchain-ai.github.io/langmem/guides/dynamically_configure_namespaces/
      https://langchain-ai.github.io/langmem/reference/memory/
      https://docs.langchain.com/langsmith/evaluation
      https://docs.langchain.com/langsmith/experiment-configuration
      https://www.langchain.com/pricing
    </webfetch_urls>
    <new_leads>
      Context7 official library IDs used: /websites/langchain_oss_python_langgraph and /langchain-ai/langmem. New leads: LangGraph checkpointers vs stores; namespace tuple/key model; dynamic namespace templates; profile vs collection tradeoffs; LangMem manager update/delete switches; ReflectionExecutor debouncing and serverless remote-executor requirement; LangSmith offline/online evaluation, max_concurrency, caching, and pay-as-you-go LCU/LSU pricing.
    </new_leads>
    <followup_queries>
      <query tool="websearch">site:langchain-ai.github.io/langmem "Configure Dynamic Namespaces"</query>
      <query tool="websearch">site:langchain-ai.github.io/langmem "Manage a Semantic Memory Collection"</query>
      <query tool="websearch">site:langchain-ai.github.io/langmem evaluation LangMem memory</query>
      <query tool="websearch">LangGraph Platform pricing official LangSmith cost memory store</query>
      <query tool="websearch">LangGraph Cloud pricing official LangSmith platform</query>
    </followup_queries>
  </round>
  <round number="3">
    <verification_targets>
      F1/F2: short-term state vs long-term store boundary.
      F3/F4: namespace behavior and dynamic template substitution.
      F5: hot-path vs background extraction tradeoffs and immediate availability.
      F6: background concurrency/debounce semantics and serverless limitation.
      F7/F8: update/evaluation/cost constraints.
    </verification_targets>
    <verification_queries>
      <query tool="websearch">site:docs.langchain.com/langsmith evaluation max_concurrency cache official</query>
      <query tool="websearch">site:langchain-ai.github.io/langmem reference memory enable_updates enable_deletes query_limit</query>
      <query tool="websearch">LangSmith Plans and Pricing LCU LSU official</query>
    </verification_queries>
    <findings_revised>
      Initial wording that LangMem "background quickstart" always runs truly out of band was narrowed: one quickstart example awaits the manager inline, while the same page and API reference direct users to ReflectionExecutor for delayed/background processing. Dynamic namespace URLs were corrected from guessed slugs to the official `dynamically_configure_namespaces` page. Production-readiness claims were narrowed to official install/service prerequisites and cost surfaces.
    </findings_revised>
  </round>
  <totals>
    <total_websearches>12</total_websearches>
    <total_webfetches>11</total_webfetches>
    <total_context7_queries>5</total_context7_queries>
  </totals>
</search_log>

<finding id="1">
  <claim>LangGraph defines two separate memory persistence primitives: checkpointers for short-term thread state and stores for long-term cross-thread data.</claim>
  <detail>The persistence docs say checkpointers persist graph-state snapshots for one thread, while stores persist application-defined key-value data across threads. The memory overview repeats the same boundary: short-term memory is graph state read at each step; long-term memory is user or application data recallable from any thread. This matters for memory architecture because conversation continuity and durable user knowledge are not the same storage concern.</detail>
  <source>https://docs.langchain.com/oss/python/langgraph/persistence; https://docs.langchain.com/oss/python/concepts/memory</source>
  <source_date>crawled today by web tool; docs pages did not expose publication dates</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Direct official docs and Context7 current-doc query agree on the checkpointer/store split.</evidence_basis>
  <evidence>Persistence docs describe checkpointers as single-thread state and stores as cross-thread data for preferences, facts, and shared knowledge.</evidence>
</finding>

<finding id="2">
  <claim>LangGraph long-term memory is organized as JSON documents under tuple namespaces and keys, with optional semantic search.</claim>
  <detail>Official docs describe a store item as a namespaced document with a distinct key, timestamps, and value payload. Namespaces can be any tuple length and commonly encode user, organization, feature, or memory type. Semantic search requires embedding configuration; otherwise simple storage/retrieval still works. `InMemoryStore` and `MemorySaver` are development conveniences and are not persistent across restarts.</detail>
  <source>https://docs.langchain.com/oss/python/langgraph/persistence; https://docs.langchain.com/oss/python/concepts/memory</source>
  <source_date>crawled today by web tool; docs pages did not expose publication dates</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Official examples show namespace tuples, `store.put`, `store.search`, timestamps, embedding index configuration, and production warnings.</evidence_basis>
  <evidence>Docs show a namespace such as `(user_id, "memories")`, key-based writes, search results with `created_at`/`updated_at`, and recommend DB-backed stores for production.</evidence>
</finding>

<finding id="3">
  <claim>LangMem builds on LangGraph stores by adding memory tools, memory managers, and dynamic namespace templates.</claim>
  <detail>The LangMem quickstarts use `create_manage_memory_tool`, `create_search_memory_tool`, and `create_memory_store_manager` against a LangGraph `BaseStore`. The dynamic namespace guide states that template variables such as `{user_id}` are filled from `RunnableConfig.configurable`, enabling per-user, per-org, per-assistant, or per-type isolation. The agent sees a memory capability while the application controls where data is stored.</detail>
  <source>https://langchain-ai.github.io/langmem/hot_path_quickstart/; https://langchain-ai.github.io/langmem/guides/dynamically_configure_namespaces/; https://langchain-ai.github.io/langmem/reference/memory/</source>
  <source_date>LangMem docs crawled today; search index showed 5 days ago for several pages</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Official docs and API reference describe tool functions, manager functions, and namespace parameter defaults.</evidence_basis>
  <evidence>LangMem reference gives default namespace `("memories", "{langgraph_user_id}")` and says templates are populated from runtime context.</evidence>
</finding>

<finding id="4">
  <claim>LangGraph/LangMem explicitly separate hot-path memory writing from background extraction, with different latency, transparency, and quality tradeoffs.</claim>
  <detail>In the hot path, the agent actively calls memory tools before or during a user-facing response, making new memory available quickly and allowing user-visible transparency. The memory overview warns that this can add latency and force the agent to multitask between the main job and memory formation. Background extraction separates memory management from the response path and can reduce latency, but the docs warn that update frequency matters because other threads may not see fresh context until extraction has run.</detail>
  <source>https://docs.langchain.com/oss/python/concepts/memory; https://langchain-ai.github.io/langmem/hot_path_quickstart/; https://langchain-ai.github.io/langmem/background_quickstart/</source>
  <source_date>LangChain docs crawled today; LangMem search index showed 5 days ago</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Multiple official pages use the same hot-path/background terminology and list tradeoffs.</evidence_basis>
  <evidence>The memory overview says hot-path creation can affect latency and memory quality, while background creation removes primary-app latency but requires timing decisions.</evidence>
</finding>

<finding id="5">
  <claim>LangMem background extraction can be debounced with `ReflectionExecutor`, but local background threads are not sufficient for serverless deployments.</claim>
  <detail>The delayed-processing guide says active conversations can cause redundant work, incomplete mid-conversation context, and extra token consumption if every message is processed immediately. `ReflectionExecutor` maintains pending memory tasks per thread, cancels old tasks when new messages arrive, and processes after a delay. The same guide warns that local threads terminate between serverless function invocations and says to use the LangGraph Platform remote executor instead.</detail>
  <source>https://langchain-ai.github.io/langmem/guides/delayed_processing/; https://langchain-ai.github.io/langmem/reference/memory/</source>
  <source_date>LangMem docs crawled today; search index showed 5 days ago</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Official guide directly describes queue/cancel/delay behavior and the serverless limitation.</evidence_basis>
  <evidence>Delayed-processing docs say the executor keeps a queue, cancels old tasks on new messages, and only processes after the configured delay.</evidence>
</finding>

<finding id="6">
  <claim>LangMem memory updates are LLM-mediated and configurable, not guaranteed-correct database rules.</claim>
  <detail>The API reference says memory managers analyze conversation messages and existing memories, then create or update structured entries. Controls include Pydantic schemas, custom instructions, `enable_inserts`, `enable_updates`, `enable_deletes`, `query_limit`, and optional separate `query_model`. The semantic-memory guide states that extraction can use parallel tool calling to create, update, and delete memories; it also warns that managing many changes in one LLM call can be difficult, and suggests using a separate memory-manager agent for complex updates.</detail>
  <source>https://langchain-ai.github.io/langmem/reference/memory/; https://langchain-ai.github.io/langmem/guides/extract_semantic_memories/</source>
  <source_date>LangMem docs crawled today; search index showed 5 days ago</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>API reference gives the update/delete controls; guide describes LLM/tool-call extraction and its complexity limits.</evidence_basis>
  <evidence>Reference docs list `enable_inserts=True`, `enable_updates=True`, `enable_deletes=False`, `query_limit=5`, and optional `query_model` for memory retrieval.</evidence>
</finding>

<finding id="7">
  <claim>Official docs recommend evaluation for memory behavior because profile/collection designs and model defaults can fail in different ways.</claim>
  <detail>The memory overview says single profiles can become error-prone as they grow, while collections improve downstream recall but push complexity into update/delete/search. It also says some models may over-insert while others over-update, and suggests evaluation with LangSmith. LangSmith docs provide offline and online evaluation modes, datasets, code/human/LLM-as-judge evaluators, experiment repetitions, caching, and `max_concurrency` controls. For a luca_gstack memory audit, memory quality needs an eval harness; docs do not imply the memory layer self-validates facts.</detail>
  <source>https://docs.langchain.com/oss/python/concepts/memory; https://docs.langchain.com/langsmith/evaluation; https://docs.langchain.com/langsmith/experiment-configuration</source>
  <source_date>LangChain docs crawled today; LangSmith docs search index showed 3-4 months ago</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Official memory and LangSmith evaluation docs explicitly connect memory tuning with evals and expose concurrency/caching controls.</evidence_basis>
  <evidence>LangSmith evaluation docs define offline evaluation before shipping and online evaluation on production traces; experiment config documents `max_concurrency` and cache environment settings.</evidence>
</finding>

<finding id="8">
  <claim>Installation and service-cost constraints are material: LangMem requires package installation and model-provider keys, while managed deployment/evaluation can incur LangSmith usage charges.</claim>
  <detail>LangMem docs and the GitHub README install with `pip install -U langmem` and require an LLM provider API key such as `ANTHROPIC_API_KEY`. Examples also use OpenAI embeddings, so provider/API costs may include both extraction models and embedding models. For production persistence, docs recommend DB-backed stores such as Postgres; LangGraph/LangSmith platform can manage stores, but pricing pages show seat fees, trace allowances, LCU/LSU pay-as-you-go units, deployment compute/memory/database metering, tuned evaluator charges, and retention-cost differences. Any adoption plan should separate open-source library cost from hosted LangSmith costs.</detail>
  <source>https://langchain-ai.github.io/langmem/; https://langchain-ai.github.io/langmem/background_quickstart/; https://www.langchain.com/pricing; https://docs.langchain.com/langsmith/view-usage</source>
  <source_date>LangMem docs crawled today; pricing page crawled 4 days ago; usage docs search index showed 3 months ago</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Official install docs and current pricing page define package/API-key prerequisites and hosted-service metering.</evidence_basis>
  <evidence>Pricing page lists Developer, Plus, Enterprise plans, $39 Plus seats, LCU/LSU metering, deployment resource charges, trace allowances, and Engine/Tuned Evaluator billing.</evidence>
</finding>

<contradictions>
  No direct contradiction between official docs was found. The only correction was wording: "background quickstart" includes an inline `await memory_manager.ainvoke(...)` example, while true delayed/background operation is documented through `ReflectionExecutor`. Therefore the verified claim is not that all LangMem background examples are asynchronous out of band, but that LangMem provides ReflectionExecutor for deferred/background extraction.
</contradictions>

<gaps>
  I did not find an official guarantee for conflict-free concurrent writes to the same memory item across separate processes; docs expose async APIs, checkpointer pending writes, and evaluation concurrency, but not a full memory-update transaction model for LangMem semantic conflicts.
  I did not find official benchmark numbers for LangMem extraction precision/recall. The docs recommend evaluation but do not publish a universal memory-quality score.
  I did not install LangMem or run a live LangSmith deployment because this angle is research-only and must preserve install/service cost limits.
</gaps>

<depth_check>
  PASS. Used current official docs/source only: LangChain/LangGraph docs, LangMem official docs/GitHub source docs, LangSmith docs, and LangChain pricing/usage pages. Completed 3 rounds, ≥3 official full reads, ≥5 findings, and included search log, confidence, limitations, installation constraints, and hosted-service cost constraints. Artifact is under 2500 words.
</depth_check>

</research_findings>
