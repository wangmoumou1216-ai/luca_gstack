export const meta = {
  name: 'external-skill-scout',
  description: 'Hunt GitHub for useful Claude Code skills/subagents, gate them on a 7-dim 门禁, evidence-verify each candidate with gh, synthesize ranked recommendations. args: string focus OR {focus:[],existing_skills:[],date}.',
  phases: [
    { title: 'Load' },
    { title: 'Discover' },
    { title: 'Verify' },
  ],
}

// ── The 门禁 (durable home of the gate criteria) ──────────────────────────
// HARD gates (any FAIL => REJECTED, no matter the stars): safety, compatibility, non_redundancy.
// SOFT scores (0-3 each, weighted): fit 30, quality 30, adoption 20, maintenance 20.
// Verdict: hardFail->REJECTED; else weighted>=70 APPROVED; >=45 CONDITIONAL; else REJECTED.
const GATE_WEIGHTS = { fit: 30, quality: 30, adoption: 20, maintenance: 20 }

// FALLBACK ONLY（loader 失败时兜底）：硬编码清单必然漂移（GAP-registration-sync 教训）。
// 非冗余硬门的正常路径是 Load phase 从 self-model 真值文件读活清单。
const FALLBACK_EXISTING = [
  // luca office skills
  'idea','brainstorm','deepresearch','ux-research','ux-brainstorm','design-brief','design-review',
  'taste-review','open-design','magicpath','html-prototype','figma-demo','figma-layer','fx-icon-search',
  'ux-audit','tech-spec','task-plan','handoff-review','redteam','evals','retro','compare','challenge',
  'careful','auto',
  // claude-code built-in / globally-installed skills
  'code-review','simplify','verify','security-review','review','init','run','skill-creator','find-skills',
  'update-config','keybindings-help','statusline-setup','loop','schedule','fewer-permission-prompts',
  'claude-api','deep-research','agent-browser','web-access','frontend-slides','fxui-source-to-html',
  'docx','pptx','xlsx','pdf','figma-generate-design','capture-open-tabs','codebase-to-course',
  'lark-im','lark-doc','lark-base','lark-calendar','lark-sheets','lark-wiki','lark-task',
  'elon-musk-perspective','steve-jobs-perspective','naval-perspective','ilya-sutskever-perspective',
]

const FOCUS_LABEL = {
  'claude-code-meta': 'Claude Code meta-skills: subagent/orchestration patterns, context engineering, hooks, skill authoring, debugging Claude itself',
  'code-engineering': 'code & engineering execution: TDD, code review, debugging, refactoring, build/verify muscle',
  'design-frontend': 'design systems & frontend craft: shadcn, tailwind, accessibility (a11y), design-to-code',
  'verification-redteam': 'verification & red-teaming: testing, eval harnesses, adversarial review',
}

// ── args parsing (string => single focus; object => full config) ──────────
// The harness may deliver an object arg JSON-stringified; recover it so re-runs work either way.
let parsedArgs = args
if (typeof args === 'string' && args.trim()) {
  const t = args.trim()
  if (t[0] === '{' || t[0] === '[') { try { parsedArgs = JSON.parse(t) } catch (e) { parsedArgs = t } }
  else parsedArgs = t
}
let focus, runDate, extraExisting
if (typeof parsedArgs === 'string') {
  focus = [parsedArgs]
  extraExisting = []
  runDate = 'unknown'
} else {
  focus = (parsedArgs && parsedArgs.focus) || ['claude-code-meta', 'code-engineering', 'design-frontend', 'verification-redteam']
  extraExisting = (parsedArgs && parsedArgs.existing_skills) || []
  runDate = (parsedArgs && parsedArgs.date) || 'unknown'
}
const focusText = focus.map(f => '- ' + f + ': ' + (FOCUS_LABEL[f] || f)).join('\n')

// ── Phase 0: 从 self-model 真值文件读活的既有能力清单（非冗余硬门的判定基准）──
const EXISTING_LOADER_SCHEMA = {
  type: 'object',
  properties: {
    existing_names: { type: 'array', items: { type: 'string' } },
    load_notes: { type: 'string' },
  },
  required: ['existing_names'],
}
phase('Load')
const loadedExisting = await agent(
  'You are a LOADER. Read luca_gstack truth files with Bash+python3 (yaml.safe_load; e.g. python3 -c "import yaml,json;print(json.dumps(yaml.safe_load(open(P))))") and return existing capability names:\n' +
  '1. .claude/skill-os/evolution/self-model.yaml → already_have_static.builtins + already_have_static.personas\n' +
  '2. .claude/skill-os/evolution/self-model.generated.yaml → already_have_ondisk.{skills_office,skills_global,agents}\n' +
  'RETURN existing_names = lowercased union of all names. Do NOT invent; if a file is missing, return what you have and note it in load_notes.',
  { label: 'load:existing', phase: 'Load', schema: EXISTING_LOADER_SCHEMA }
)
let existing
if (loadedExisting && loadedExisting.existing_names && loadedExisting.existing_names.length) {
  existing = loadedExisting.existing_names.concat(extraExisting)
} else {
  existing = FALLBACK_EXISTING.concat(extraExisting)
  log('existing loader failed — falling back to hardcoded FALLBACK_EXISTING (may be stale; non-redundancy verdicts less reliable)')
}
const existingText = existing.join(', ')

// ── schemas ───────────────────────────────────────────────────────────────
const CANDIDATE_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          repo: { type: 'string', description: 'owner/repo' },
          url: { type: 'string' },
          type: { type: 'string', description: 'skill | subagent | collection | plugin' },
          category: { type: 'string', description: 'one of the focus-area keys' },
          claimed_stars: { type: 'string', description: 'as observed in tool output, or unknown' },
          install_method: { type: 'string' },
          one_line_value: { type: 'string' },
          fit_hypothesis: { type: 'string' },
          fit_score: { type: 'number', description: '0-3 self-assessed fit to a CRM product-design Claude Code workflow' },
          evidence_url: { type: 'string' },
        },
        required: ['name', 'repo', 'url', 'type', 'category', 'one_line_value', 'fit_score'],
      },
    },
    channel_notes: { type: 'string', description: 'what was reachable / thin / failed in this channel' },
  },
  required: ['candidates', 'channel_notes'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'object',
      properties: {
        fit: { type: 'number' }, adoption: { type: 'number' },
        maintenance: { type: 'number' }, quality: { type: 'number' },
      },
      required: ['fit', 'adoption', 'maintenance', 'quality'],
    },
    hard: {
      type: 'object',
      properties: {
        safety: { type: 'string', enum: ['PASS', 'FAIL'] },
        compatibility: { type: 'string', enum: ['PASS', 'FAIL'] },
        non_redundancy: { type: 'string', enum: ['PASS', 'FAIL'] },
      },
      required: ['safety', 'compatibility', 'non_redundancy'],
    },
    evidence: {
      type: 'object',
      properties: {
        stars: { type: ['number', 'null'] },
        last_commit: { type: ['string', 'null'], description: 'ISO date of latest commit / pushed_at' },
        license: { type: ['string', 'null'] },
        open_issues: { type: ['number', 'null'] },
        archived: { type: ['boolean', 'null'] },
        verified_at: { type: 'string', description: 'UTC timestamp captured via date -u' },
        source_url: { type: 'string' },
      },
      required: ['stars', 'last_commit', 'license', 'verified_at', 'source_url'],
    },
    why_useful: { type: 'string' },
    caveat: { type: 'string' },
    install_command: { type: 'string' },
    integration_note: { type: 'string' },
    reject_reasons: { type: 'array', items: { type: 'string' } },
    redundant_with: { type: 'string' },
  },
  required: ['scores', 'hard', 'evidence', 'why_useful', 'install_command', 'integration_note'],
}

// ── Phase 1: discovery channels (multi-modal sweep, blind to each other) ───
const SCOUT_PREAMBLE =
  'You are a DISCOVERY SCOUT finding external Claude Code extensions on GitHub (SKILL.md skills AND Claude Code subagents) that would strengthen a product designer\'s Claude Code OS used for CRM product design (PRD / UX / prototype / spec workflow).\n\n' +
  'FOCUS AREAS (only return things plausibly fitting one of these gaps):\n' + focusText + '\n\n' +
  'TOOLS: Bash is available for `gh` (already authenticated) and `npx`. For web pages, FIRST run ToolSearch with query "select:WebFetch,WebSearch" to load those tools, then use them.\n\n' +
  'HARD RULES: Only return repos you ACTUALLY OBSERVED in real tool output. Never invent repos/stars from memory. If a tool errors, record it in channel_notes and return what you verified. For each candidate set fit_score 0-3 (3 = directly fills a focus gap). claimed_stars = as observed or "unknown" (real verification happens downstream). Map category to one focus key. Aim for QUALITY over volume; drop anything clearly unrelated to Claude Code or the focus areas.'

const channels = [
  {
    label: 'C1:gh-search',
    prompt: SCOUT_PREAMBLE + '\n\nCHANNEL = GitHub repo search. Run these (space them out; the search API is 30/min, code search 10/min so prefer repo search):\n' +
      'gh search repos "claude skill" --sort stars --limit 40 --json fullName,stargazersCount,description,url,updatedAt\n' +
      'gh search repos "claude-code subagent" --sort stars --limit 40 --json fullName,stargazersCount,description,url,updatedAt\n' +
      'gh search repos "claude code agents" --sort stars --limit 40 --json fullName,stargazersCount,description,url,updatedAt\n' +
      'gh search repos "claude code skills" --sort stars --limit 30 --json fullName,stargazersCount,description,url,updatedAt\n' +
      'gh search repos "agent skills" --sort stars --limit 30 --json fullName,stargazersCount,description,url,updatedAt\n' +
      'Optionally ONE: gh search code "SKILL.md claude" --limit 15 --json repository,path (counts against the tight 10/min code limit; skip if rate-limited).\n' +
      'Parse fullName as repo, stargazersCount as claimed_stars, url, description. Keep only Claude-Code-relevant repos that map to a focus area.',
  },
  {
    label: 'C2:skills.sh',
    prompt: SCOUT_PREAMBLE + '\n\nCHANNEL = skills.sh leaderboard (the npx skills ecosystem the user installs from). Load WebFetch, then WebFetch https://skills.sh/ and follow category/leaderboard links you see (try also https://skills.sh/?q=testing , ?q=code-review , ?q=design , ?q=subagent , ?q=context). Extract top skills by install count for the focus areas: name, owner/repo, installs (-> claimed_stars field as "Ninstalls"), the `npx skills add ...` install command (-> install_method), and url. Note coverage/gaps in channel_notes.',
  },
  {
    label: 'C3:awesome-lists',
    prompt: SCOUT_PREAMBLE + '\n\nCHANNEL = curated awesome-lists. First find the canonical lists: gh search repos "awesome claude code" --sort stars --limit 15 --json fullName,stargazersCount,url AND gh search repos "awesome claude skills" --sort stars --limit 10 --json fullName,stargazersCount,url AND gh search repos "awesome claude subagents" --sort stars --limit 10 --json fullName,stargazersCount,url. Then read the READMEs of the top lists (use: gh api repos/OWNER/REPO/readme --jq .content | base64 --decode  OR load WebFetch and fetch the raw README). Extract listed skills/subagents that fit the focus areas, with their linked target repo as repo+url. Note which lists you read in channel_notes.',
  },
  {
    label: 'C4:npx-skills',
    prompt: SCOUT_PREAMBLE + '\n\nCHANNEL = npx skills CLI. Run `npx skills find <query>` for queries spanning the focus areas, e.g.: "code review", "testing", "tdd", "debugging", "refactor", "accessibility", "design system", "tailwind", "shadcn", "subagent", "context", "prompt engineering", "documentation", "git". The first npx run may download the package; allow it (give it time). Parse each result for skill name, source owner/repo, installs, and the install command. If npx errors or hangs after a couple tries, record it in channel_notes and fall back to loading WebFetch on https://skills.sh/. Return candidates with install_method set to the npx add command.',
  },
  {
    label: 'C5:known-hubs',
    prompt: SCOUT_PREAMBLE + '\n\nCHANNEL = deep-dive known high-value hubs. For each repo below, get metadata with `gh api repos/OWNER/REPO --jq "{stars:.stargazers_count,pushed:.pushed_at,desc:.description}"` and enumerate its inner skills/agents with `gh api "repos/OWNER/REPO/git/trees/HEAD?recursive=1" --jq ".tree[].path"` (filter for SKILL.md / *.md agent files / skill dirs). Then pick the TOP 5-8 STANDOUT members per hub that fit the focus areas (do NOT dump every member). Hubs: anthropics/skills ; obra/superpowers ; vercel-labs/agent-skills ; wshobson/agents ; VoltAgent/awesome-claude-code-subagents . Also run gh search repos "claude subagents" --sort stars --limit 10 --json fullName,stargazersCount,url to catch other big collections. For each standout member: name = the skill/agent, repo = owner/repo, url = deep link to the file/dir, set type and category and fit_score. channel_notes = which hubs were reachable + their HEAD commit recency if seen.',
  },
]

phase('Discover')
const discovered = await parallel(
  channels.map(ch => () => agent(ch.prompt, { label: ch.label, phase: 'Discover', schema: CANDIDATE_SCHEMA }))
)
const channelNotes = discovered.map((d, i) => channels[i].label + ': ' + ((d && d.channel_notes) || 'NO RESULT (agent returned null)'))
const raw = discovered.filter(Boolean).flatMap(d => d.candidates || [])
log('Discovery: ' + raw.length + ' raw candidates across ' + channels.length + ' channels')

// ── merge + dedup (barrier-side plain code: needs the full set) ────────────
// Sort by self-assessed fit so the cost cap keeps the most promising; cap per-repo for diversity.
raw.sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0))
const seen = new Set()
const perRepo = {}
const deduped = []
// normalize names so the same skill surfaced by two channels under different labels collapses
// (e.g. "UI-UX-Pro-Max" vs "ui-ux-pro-max (collection)" -> "uiuxpromax")
const norm = s => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '')
for (const c of raw) {
  const repo = String(c.repo || '').toLowerCase()
  const key = repo + '#' + norm(c.name)
  if (!repo || seen.has(key)) continue
  if ((perRepo[repo] || 0) >= 4) continue // diversity cap: max 4 members per repo
  seen.add(key)
  perRepo[repo] = (perRepo[repo] || 0) + 1
  deduped.push(c)
}
const MAX_VERIFY = 32
const shortlist = deduped.slice(0, MAX_VERIFY)
const droppedForCap = deduped.length - shortlist.length
log('Deduped to ' + deduped.length + ' unique; verifying ' + shortlist.length + (droppedForCap > 0 ? ' (dropped ' + droppedForCap + ' over cap)' : ''))

// ── Phase 3: adversarial, evidence-grounded verification (the 监管 core) ───
function verifyPrompt(c) {
  const label = FOCUS_LABEL[c.category] || c.category || 'the user focus areas'
  return 'You are a SKEPTICAL, ADVERSARIAL verifier. Your job is to find reasons to REJECT this candidate, not to praise it. When uncertain, score LOW and FAIL the hard gates. Use REAL tool output only — never your training memory.\n\n' +
    'CANDIDATE: name="' + c.name + '" repo="' + c.repo + '" url="' + c.url + '" type="' + c.type + '" category="' + c.category + '"\n' +
    '(If repo has more than 2 path segments, the GitHub repo is the first owner/repo; the rest is a path inside it.)\n\n' +
    'GATHER EVIDENCE (run these):\n' +
    '1. gh api repos/OWNER/REPO --jq "{stars:.stargazers_count,pushed:.pushed_at,updated:.updated_at,license:.license.spdx_id,issues:.open_issues_count,archived:.archived,disabled:.disabled,url:.html_url}"\n' +
    '2. gh api "repos/OWNER/REPO/commits?per_page=1" --jq ".[0].commit.committer.date"  (latest commit date)\n' +
    '3. Fetch the ACTUAL skill/agent file: gh api "repos/OWNER/REPO/contents/PATH" --jq ".content" | base64 --decode  (or load WebFetch and fetch the raw.githubusercontent.com URL). Read its frontmatter + body. If you cannot locate a SKILL.md or a Claude subagent .md, that is a COMPATIBILITY problem.\n' +
    '4. verified_at: run  date -u +%Y-%m-%dT%H:%M:%SZ\n' +
    '5. SAFETY SCAN the skill file and any bundled scripts for: destructive bash (rm -rf, dd, mkfs, git push --force), network exfiltration (curl/wget POSTing local data, base64 piped to curl), secret harvesting (reading ~/.ssh, .env, env tokens, keychain), or curl-pipe-to-shell. ANY of these => safety FAIL.\n\n' +
    'SCORE THE 门禁:\n' +
    'SOFT (0-3 each): fit (does it genuinely fill THIS gap for a CRM product-design Claude Code workflow: ' + label + '? 0 if off-target), adoption (stars: <100 weak=0-1, 100-1k=1-2, >1k=3; factor installs if known), maintenance (latest commit: <=6mo=3, 6-18mo=1-2, >18mo or archived=0), quality (SKILL.md structure, clear scope, examples/tests/evals, real docs vs thin stub).\n' +
    'HARD (return exactly "PASS" or "FAIL"): safety (safe code AND a permissive license present like MIT/Apache/BSD; missing or non-permissive license OR unsafe code => FAIL), compatibility (judge by what the candidate IS: install-as-SKILL/subagent => needs valid SKILL.md/subagent frontmatter, installable via `npx skills add` or droppable into ~/.claude/skills or .claude/agents, no trigger collision; install-as-MCP/tool/npm/CLI => does NOT need a SKILL.md, do NOT FAIL merely for lacking one — needs a real install path + no infra the user lacks + wires in as an MCP/tool NOT into route-guard/office; port-pattern/adapt-idea => the pattern is extractable without dragging a whole framework. FAIL only if none hold), non_redundancy (NOT already covered by the user\'s existing skills below — UNLESS clearly and demonstrably better; if redundant and not better => FAIL and set redundant_with).\n\n' +
    'USER EXISTING SKILLS (non-redundancy reference): ' + existingText + '\n\n' +
    'RETURN the schema. why_useful = 1-2 concrete sentences tying it to a CRM product-design workflow. install_command = exact (npx skills add owner/repo@name -g -y, or a git clone + copy path). integration_note = where it would live in this OS (global ~/.claude/skills for a general skill, .claude/skills/office/ + a skill-routing-map.yaml entry for a design-pipeline skill, or .claude/agents/ for a subagent) and any registration step. evidence.* MUST be the numbers you actually observed; use null if a call failed. Cite real figures, default to skepticism.'
}

phase('Verify')
const verdicts = await parallel(
  shortlist.map(c => () =>
    agent(verifyPrompt(c), { label: 'verify:' + c.repo, phase: 'Verify', schema: VERDICT_SCHEMA })
      .then(v => (v ? Object.assign({}, c, v) : null))
  )
)

// ── adjudicate verdicts deterministically (gate logic lives in the mechanism) ─
function adjudicate(v) {
  const h = v.hard || {}
  // default-deny：硬门任何非规范 "PASS"（含 "FAIL (…)"、"UNKNOWN"、缺字段）一律按 FAIL
  const hardFail = ['safety', 'compatibility', 'non_redundancy'].some(k => h[k] !== 'PASS')
  const s = v.scores || {}
  const weighted = Math.round(
    ((s.fit || 0) / 3) * GATE_WEIGHTS.fit +
    ((s.quality || 0) / 3) * GATE_WEIGHTS.quality +
    ((s.adoption || 0) / 3) * GATE_WEIGHTS.adoption +
    ((s.maintenance || 0) / 3) * GATE_WEIGHTS.maintenance
  )
  let verdict
  if (hardFail) verdict = 'REJECTED'
  else if (weighted >= 70) verdict = 'APPROVED'
  else if (weighted >= 45) verdict = 'CONDITIONAL'
  else verdict = 'REJECTED'
  return Object.assign({}, v, { weighted_score: weighted, verdict, hard_fail: hardFail })
}

const judged = verdicts.filter(Boolean).map(adjudicate)
const byScore = (a, b) => (b.weighted_score || 0) - (a.weighted_score || 0)
const approved = judged.filter(v => v.verdict === 'APPROVED').sort(byScore)
const conditional = judged.filter(v => v.verdict === 'CONDITIONAL').sort(byScore)
const rejected = judged.filter(v => v.verdict === 'REJECTED').sort(byScore)
log('Verified ' + judged.length + ': APPROVED ' + approved.length + ', CONDITIONAL ' + conditional.length + ', REJECTED ' + rejected.length)

return {
  run_date: runDate,
  focus,
  stats: {
    raw: raw.length, unique: deduped.length, verified: judged.length,
    approved: approved.length, conditional: conditional.length, rejected: rejected.length,
    dropped_for_cap: droppedForCap,
  },
  channel_notes: channelNotes,
  approved, conditional, rejected,
}
