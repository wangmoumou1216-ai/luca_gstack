<research_findings agent="1" angle="Anthropic/Claude Code project memory, user memory, auto memory, lifecycle, provenance/retrieval/maintenance">

<search_log>
  <round number="1">
    <queries>
      <query tool="websearch">site:docs.anthropic.com Claude Code memory CLAUDE.md project memory user memory</query>
      <query tool="websearch">site:docs.anthropic.com Claude Code memory CLAUDE.md settings hierarchy project user memory</query>
      <query tool="websearch">site:anthropic.com context engineering memory tool limitations Anthropic</query>
    </queries>
    <results_useful_urls>
      https://docs.anthropic.com/en/docs/claude-code/memory -> redirected to https://code.claude.com/docs/en/memory (Round 2)
      https://docs.anthropic.com/en/docs/claude-code/settings -> redirected to https://code.claude.com/docs/en/settings (Round 2)
      https://docs.anthropic.com/en/docs/claude-code/slash-commands -> redirected to https://code.claude.com/docs/en/slash-commands / skills page (Round 2)
      https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prompt-templates-and-variables -> redirected to platform Claude prompting best practices (Round 2)
      https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents (Round 2)
      https://www.anthropic.com/engineering/managed-agents (Round 2)
      https://www.anthropic.com/engineering/how-we-contain-claude (Round 2)
      https://alignment.anthropic.com/2025/automated-auditing/ (Round 2)
      https://support.anthropic.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects -> redirected to https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects
    </results_useful_urls>
  </round>
  <round number="2">
    <webfetch_urls>
      https://code.claude.com/docs/en/memory
      https://code.claude.com/docs/en/settings
      https://code.claude.com/docs/en/slash-commands
      https://code.claude.com/docs/en/hooks
      https://code.claude.com/docs/en/sub-agents
      https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects
      https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context
      https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
      https://www.anthropic.com/engineering/managed-agents
      https://www.anthropic.com/engineering/how-we-contain-claude
      https://alignment.anthropic.com/2025/automated-auditing/
    </webfetch_urls>
    <new_leads>
      New leads found in full text: CLAUDE.md vs auto memory distinction; `MEMORY.md` first 200 lines/25KB startup cap; topic files loaded on demand; auto memory modified timestamps in v2.1.214+; subagent memory scopes; hooks as enforcement/provenance tools; Claude.ai chat memory as separate cloud product memory; RAG for Claude.ai Projects; persistent memory poisoning as a known future risk; memory-management failure modes in Anthropic alignment-auditing agents.
    </new_leads>
    <followup_queries>
      <query tool="websearch">site:code.claude.com/docs/en/memory auto memory first 200 lines 25KB v2.1.214 modified</query>
      <query tool="websearch">site:code.claude.com/docs/en subagent memory project local user autoMemoryEnabled</query>
      <query tool="websearch">site:support.claude.com Claude chat search memory build on previous context official</query>
      <query tool="websearch">site:anthropic.com engineering persistent memory poisoning CLAUDE.md</query>
    </followup_queries>
  </round>
  <round number="3">
    <verification_targets>
      F1/F2: whether Claude Code has two memory systems and whether they are context rather than policy.
      F3/F4: exact storage, loading, line/size limits, and version-gated metadata for auto memory.
      F5: whether Claude.ai Projects/RAG memory should be conflated with Claude Code repository memory.
      F6/F7: maintenance, provenance, and lifecycle mechanisms through /memory, /context, hooks, and settings.
      F8/F9: limitations and risks from official Anthropic engineering/research sources.
    </verification_targets>
    <verification_queries>
      <query tool="websearch">site:code.claude.com/docs/en/memory auto memory first 200 lines 25KB v2.1.214 modified</query>
      <query tool="websearch">site:code.claude.com/docs/en subagent memory project local user autoMemoryEnabled</query>
      <query tool="websearch">site:support.claude.com Claude chat search memory build on previous context official</query>
      <query tool="websearch">site:anthropic.com engineering persistent memory poisoning CLAUDE.md</query>
    </verification_queries>
    <findings_revised>
      The older indexed snippet for Claude Code memory said autoMemoryDirectory was not accepted from project/local settings; the current opened official page says it is read from any settings scope and honored under workspace-trust rules. I use the current opened page as higher confidence and mark the version-sensitive storage-setting detail as MEDIUM where relevant.
      Claude.ai chat/project memory and Claude Code auto memory are distinct products and should not be treated as one shared memory system unless the official page explicitly names cross-product sharing, such as Chat/Cowork cloud memory.
      Promotional claims that RAG maintains quality and expands project capacity are recorded as official product claims, not independently measured effectiveness.
    </findings_revised>
  </round>
  <totals>
    <total_websearches>7</total_websearches>
    <total_webfetches>11</total_webfetches>
  </totals>
</search_log>

<finding id="1">
  <claim>Claude Code has two complementary persistent-memory mechanisms: human-written CLAUDE.md instruction files and Claude-written auto memory.</claim>
  <detail>Current Claude Code docs state that every session starts fresh, and that knowledge crosses sessions through these two mechanisms. CLAUDE.md is for standing instructions and rules; auto memory is for learned notes from corrections, preferences, and project context that Claude cannot derive from code. This distinction is central for auditing luca_gstack memory: manually governed repository/user rules and generated memories have different authorship and maintenance expectations.</detail>
  <source>https://code.claude.com/docs/en/memory</source>
  <source_date>crawled today by web tool; page itself did not expose a publication date</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Direct current Claude Code documentation, explicit comparison table, verified against the current opened page.</evidence_basis>
  <evidence>Docs say sessions begin with fresh context and list CLAUDE.md files and auto memory as the two carry-over mechanisms; the table separates writer, content, scope, and startup loading.</evidence>
</finding>

<finding id="2">
  <claim>Claude Code memory is loaded as context, not as enforced configuration; hard enforcement belongs in settings, permissions, or hooks.</claim>
  <detail>The memory page explicitly says Claude treats both CLAUDE.md and auto memory as context rather than enforced configuration. It recommends PreToolUse hooks for blocking actions regardless of model choice. The settings page reinforces this split: settings can deny tools or paths, while CLAUDE.md shapes behavior. For memory audit design, this means a memory rule cannot be treated as a deterministic policy control.</detail>
  <source>https://code.claude.com/docs/en/memory and https://code.claude.com/docs/en/settings</source>
  <source_date>crawled today by web tool; pages did not expose publication dates</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Two official pages agree: memory guides model behavior; settings/hooks enforce client behavior.</evidence_basis>
  <evidence>The memory docs say both systems are context and point to PreToolUse hooks for blocking; settings docs say settings rules are enforced by the client while CLAUDE.md is behavioral guidance.</evidence>
</finding>

<finding id="3">
  <claim>Claude Code loads user, managed, project, and local CLAUDE.md scopes in a defined order, with narrower project context appearing later in context.</claim>
  <detail>The current memory docs list managed policy, user instructions, project instructions, and local instructions, then explain that ancestor files load at launch and subdirectory files load lazily when files there are read. Files are concatenated from filesystem root down to the working directory, and local files append after CLAUDE.md at the same level. User-level rules load before project rules, so project rules have later-context priority, but conflicting rules can still lead to arbitrary model choice.</detail>
  <source>https://code.claude.com/docs/en/memory</source>
  <source_date>crawled today by web tool; page itself did not expose a publication date</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Direct load-order, lazy-load, and conflict-handling statements in official docs.</evidence_basis>
  <evidence>The docs list scope locations and say files in the hierarchy above cwd load at launch; subdirectory CLAUDE.md files load only when Claude reads those subtrees.</evidence>
</finding>

<finding id="4">
  <claim>Claude Code auto memory is repository-scoped, machine-local, and startup loading is limited to the first 200 lines or 25KB of MEMORY.md.</claim>
  <detail>Each project gets an auto-memory directory under `~/.claude/projects/<project>/memory/`, where the project key is derived from the git repository, so worktrees and subdirectories in the same repo share a directory. `MEMORY.md` is a concise index loaded at session start; topic files are not loaded at startup and must be read on demand by Claude. This favors index/provenance hygiene over large evergreen dumps.</detail>
  <source>https://code.claude.com/docs/en/memory</source>
  <source_date>crawled today by web tool; page itself did not expose a publication date</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Direct storage and loading semantics from official memory docs.</evidence_basis>
  <evidence>The docs identify MEMORY.md as the index, loaded in every session up to 200 lines or 25KB, with topic files loaded on demand and memory not shared across machines/cloud environments.</evidence>
</finding>

<finding id="5">
  <claim>Claude Code auto memory has lightweight lifecycle/provenance features but not a full governance workflow.</claim>
  <detail>Auto memory can be toggled by `/memory`, user/project settings, or `CLAUDE_CODE_DISABLE_AUTO_MEMORY`; files are plain markdown that users can browse, edit, or delete. Claude Code records a `modified` ISO 8601 timestamp in YAML frontmatter when Claude writes a memory file that has frontmatter, requiring v2.1.214 or later. It also excludes memory files from session transcript retention cleanup. These are useful provenance primitives, but the official docs do not describe evidence citations, promotion gates, review workflows, or automatic correctness checks.</detail>
  <source>https://code.claude.com/docs/en/memory</source>
  <source_date>crawled today by web tool; page itself did not expose a publication date; version details include v2.1.214+ and v2.1.234+ requirements</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Official docs explicitly describe toggles, paths, markdown editability, retention exclusion, and modified frontmatter, while omitting governance mechanisms.</evidence_basis>
  <evidence>Docs say auto memory files are plain markdown, `/memory` opens them, old transcripts are deleted after retention but memory files stay, and `modified` is written into frontmatter on later versions.</evidence>
</finding>

<finding id="6">
  <claim>Subagent memory is separate from the main Claude Code conversation memory and can be scoped as user, project, or local.</claim>
  <detail>The memory docs say the main conversation’s auto memory is not loaded into subagents except forks. The subagent docs describe a `memory` frontmatter field that gives a subagent its own persistent directory, with `user`, `project`, and `local` scopes. When enabled, its prompt includes memory-management instructions and the first 200 lines or 25KB of that agent memory index; Read/Write/Edit are automatically enabled for memory management. If auto memory is disabled, the subagent memory field has no effect.</detail>
  <source>https://code.claude.com/docs/en/sub-agents and https://code.claude.com/docs/en/memory</source>
  <source_date>crawled today by web tool; pages did not expose publication dates</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Direct official subagent and memory docs agree on isolation and scopes.</evidence_basis>
  <evidence>Subagent docs list `~/.claude/agent-memory/<name>/`, `.claude/agent-memory/<name>/`, and `.claude/agent-memory-local/<name>/` as memory locations.</evidence>
</finding>

<finding id="7">
  <claim>Claude.ai chat/project memory and Claude Code repository memory are related concepts but separate product surfaces with different storage, retrieval, and controls.</claim>
  <detail>Claude.ai memory is described in Help Center docs as chat-generated topics, project-specific memory spaces and summaries, search over past chats via RAG, and cloud Chat/Cowork memory sharing. Claude Code auto memory is local markdown in `~/.claude/projects/<project>/memory/` and is not shared across machines or cloud environments. Therefore, a luca_gstack memory audit should not assume Claude.ai memory, Claude Code `MEMORY.md`, and repository `CLAUDE.md` have one unified lifecycle.</detail>
  <source>https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context and https://code.claude.com/docs/en/memory</source>
  <source_date>Claude.ai memory page updated this week; Claude Code memory page crawled today with no publication date exposed</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Official product docs define distinct surfaces and explicitly limit some sharing to cloud Chat/Cowork, while Claude Code memory is machine-local.</evidence_basis>
  <evidence>Claude.ai docs say each project has a separate memory space and project summary; Claude Code docs say auto memory files are machine-local markdown and are not shared across machines or cloud environments.</evidence>
</finding>

<finding id="8">
  <claim>RAG for Claude.ai Projects is an official automatic retrieval mode, but Anthropic’s quality claims should be treated as product claims rather than independent proof.</claim>
  <detail>The Help Center says RAG activates automatically when project knowledge approaches or exceeds context limits and uses a project knowledge search tool instead of loading all project content into memory at once. The page claims up to 10x larger project capacity, maintained quality, and faster responses. These statements are official capability/promotional claims; the page does not provide benchmark methodology, confidence intervals, or failure analysis.</detail>
  <source>https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects</source>
  <source_date>March 16, 2026</source_date>
  <source_type>official_docs</source_type>
  <confidence>HIGH for capability; MEDIUM for effectiveness claims</confidence>
  <evidence_strength>STRONG for existence/behavior; MODERATE for quality claims</evidence_strength>
  <evidence_basis>Official Help Center page directly describes behavior, but promotional quality outcomes are not accompanied by external measurement details.</evidence_basis>
  <evidence>The page says RAG uses a project knowledge search tool and activates automatically; it also claims up to 10x capacity and maintained response quality.</evidence>
</finding>

<finding id="9">
  <claim>Anthropic’s engineering and research writing treats memory/context as a limited, lossy, and security-sensitive resource rather than a solved persistence layer.</claim>
  <detail>The context-engineering article argues that long contexts suffer diminishing returns and require careful curation. The Managed Agents article says compaction and memory involve irreversible retain/discard choices and can fail when future-needed tokens are dropped. Anthropic’s alignment-auditing paper reports that memory-management tools helped long investigations, but agents could still summarize poorly, redo work, become overconfident, and get stuck. The containment article names persistent memory poisoning across product memory, CLAUDE.md, mounted workspaces, and long-running state directories as an emerging risk.</detail>
  <source>https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents; https://www.anthropic.com/engineering/managed-agents; https://alignment.anthropic.com/2025/automated-auditing/; https://www.anthropic.com/engineering/how-we-contain-claude</source>
  <source_date>Context engineering published roughly 2025; Managed Agents crawled last week; alignment auditing published 2025; containment article crawled today/published about 3 months ago per search result</source_date>
  <source_type>blog | academic</source_type>
  <confidence>HIGH</confidence>
  <evidence_strength>STRONG</evidence_strength>
  <evidence_basis>Multiple Anthropic primary sources agree on context limits, memory maintenance failure modes, and persistence/security risks.</evidence_basis>
  <evidence>The research paper says Claude can fail to update notes effectively and may become overconfident after reading memory files; the containment article says persistent memory poisoning can be reloaded every agent start.</evidence>
</finding>

<contradictions>
  One version-sensitive discrepancy appeared in search snippets versus the current opened Claude Code memory page. An older indexed snippet said `autoMemoryDirectory` was accepted from policy/user settings and `--settings`, not project/local settings. The current official page says it is read from any settings scope and honored under workspace-trust rules for project/local settings, and adds a v2.1.234+ option for `CLAUDE_CODE_PROJECT_DIR_NAME` beside `CLAUDE_CONFIG_DIR`. I treat the current opened page as authoritative as of 2026-09-08, but any implementation depending on this setting should pin a minimum Claude Code version and test `/status` or `/memory`.
</contradictions>

<gaps>
  I did not find official public documentation for the exact Claude Code auto-memory selection algorithm: how Claude decides what is "worth remembering," how it derives topic filenames, whether duplicate memories are merged semantically, or how retrieval from topic files is ranked. Official docs describe observable storage/loading behavior and user controls, but not the internal classifier/model prompt or scoring criteria.
  I did not find independent Anthropic benchmark data for Claude.ai memory or Project RAG quality beyond Help Center claims. Treat "maintained quality" and "better context" as official product assertions unless separately evaluated in luca_gstack.
  I did not inspect user-local memory files for this angle because the assignment requested official-source research and no repository/user-browser changes.
</gaps>

<depth_check>
  PASS. Used only official Anthropic/Claude docs, Help Center pages, Anthropic engineering posts, and an original Anthropic alignment research page. Completed 3 rounds, performed 7 web searches and full-read/opened 11 official/primary pages, including at least 3 distinct official sources. Findings: 9. Each finding separates capability from effectiveness where applicable and includes source URL, date/version notes when available, confidence, evidence strength, and limitations.
</depth_check>

</research_findings>
