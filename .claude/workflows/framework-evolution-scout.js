export const meta = {
  name: 'framework-evolution-scout',
  description: '月度框架自进化侦察：从 sources-registry 生成发现通道(S1-S4)，按 gaps-register 做 fit-to-gap 门禁，gh 证据核验 + 供应链 + 推荐级红队，产出 propose-only 演进 digest。零自动编辑 luca_gstack。args 可选 {date,focus_gaps}。',
  phases: [
    { title: 'Load' },
    { title: 'AdoptionReview' },
    { title: 'Discover' },
    { title: 'Verify' },
    { title: 'Redteam' },
  ],
}

// ── 红线 ────────────────────────────────────────────────────────────────────
// 1. propose-only：本工作流只「发现 + 门禁 + 红队 + 出 digest 数据」，绝不编辑任何
//    luca_gstack **行为面**文件（skills/hooks/routing/registry 判断字段），绝不安装任何东西。
//    簿记落盘（candidate-log 追加 + yield_stats 计数）由人工触发的确定性脚本
//    scripts/evolution-bookkeep.mjs 完成（喂本工作流的返回 JSON）；gaps-register 的
//    status 开关仍由人裁决后落笔。落地(融合)是另一条人工触发的管线。
// 2. 不走 consolidate_memory 晋升门(FM-2)：演进 digest 是独立 artifact。
// 3. 热度 ≠ 适配：star 只买「进门禁考试票」，录取要 fit-to-gap + 跨源信号 + 过硬门。
// 真值源：.claude/skill-os/evolution/{sources-registry,self-model,self-model.generated,gaps-register}.yaml
//        + .claude/skill-os/external-skills/vetting-registry.yaml
// ─────────────────────────────────────────────────────────────────────────────

// 权重按 reuse_mode 分档：借想法(port-pattern/adapt-idea)不需要源仓热度——adoption/maintenance
// 对其是错误信号（历史最高价值采纳全是小仓 adapt-idea，如 agent-starter 80★→GOMS/code-hygiene）。
// reuse_mode 缺失/未知 → 按 install 档（对小仓更苛刻的那档，保持怀疑默认）。
const GATE_WEIGHTS = {
  install: { fit: 30, quality: 30, adoption: 20, maintenance: 20 },
  pattern: { fit: 40, quality: 40, adoption: 10, maintenance: 10 },
}
const MAX_VERIFY = 32
const TOP_DIGEST = 3 // FM-9 防橡皮图章：digest 封顶 top-3 APPROVED

let parsed = args
if (typeof args === 'string' && args.trim()) {
  const t = args.trim()
  if (t[0] === '{' || t[0] === '[') { try { parsed = JSON.parse(t) } catch (e) { parsed = {} } }
  else parsed = {}
}
const runDate = (parsed && parsed.date) || 'unknown'
const focusGaps = (parsed && parsed.focus_gaps) || null // 可选：只跑某些 GAP-id

// ── Phase Load：workflow 无 fs，派一个 loader agent 用 Bash+python 读真值文件 ──
const LOADER_SCHEMA = {
  type: 'object',
  properties: {
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          class: { type: 'string' },
          feeds_dimensions: { type: 'array', items: { type: 'string' } },
          reuse_mode: { type: 'array', items: { type: 'string' } },
          authority_tier: { type: 'string' },
          discovery: { type: 'object', description: 'method + queries/hubs/targets, verbatim from registry' },
          freshness_window_months: { type: ['number', 'null'] },
          discrimination: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'authority_tier', 'discovery', 'reuse_mode', 'feeds_dimensions'],
      },
    },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          dimension: { type: 'string' },
          statement: { type: 'string' },
          severity: { type: 'string' },
          desired_capability_keywords: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'dimension', 'severity'],
      },
    },
    existing_names: { type: 'array', items: { type: 'string' }, description: 'lowercased skill/agent names already present (office+global+static)' },
    existing_repos: { type: 'array', items: { type: 'string' }, description: 'owner/repo to BLOCK from re-surfacing: all vetting-registry repos + candidate-log REJECTED/KILLED within TTL. Opportunities and stale rejects excluded (分级拉黑, 见 loader prompt #6)' },
    prior_opportunities: {
      type: 'array',
      items: { type: 'object', properties: { name: { type: 'string' }, repo: { type: 'string' }, note: { type: 'string' }, date: { type: 'string' } } },
      description: 'opportunity entries from the MOST RECENT prior run in candidate-log — digest 必须逐条裁决（开 gap/归档/观察）',
    },
    addressed_recheck: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'string' }, addressed_at: { type: 'string' }, statement: { type: 'string' } } },
      description: 'gaps with status=addressed whose addressed_at is >90 days old — 自建方案定期接受外部挑战的复核窗',
    },
    load_notes: { type: 'string' },
  },
  required: ['sources', 'gaps', 'existing_names', 'existing_repos'],
}

const loaderPrompt =
  'You are a LOADER. Read luca_gstack 真值文件 and return structured JSON. Use Bash with python3 to parse YAML deterministically, e.g.:\n' +
  '  python3 -c "import yaml,json;print(json.dumps(yaml.safe_load(open(P))))"\n\n' +
  'Read and extract (RUN_DATE for date math = the date below; if "unknown", use `date -u +%Y-%m-%d`):\n' +
  '1. .claude/skill-os/evolution/sources-registry.yaml → sources where status=="active": {id,class,feeds_dimensions,reuse_mode,authority_tier,discovery,freshness_window_months,discrimination}. DROP status:off.\n' +
  '2. .claude/skill-os/evolution/gaps-register.yaml → gaps where status=="open": {id,dimension,statement,severity,desired_capability_keywords}. DROP deferred/closed. ALSO: gaps with status=="addressed" whose addressed_at is MORE than 90 days before RUN_DATE (python datetime) → return in addressed_recheck {id,addressed_at,statement}（自建方案的复核窗，不进候选匹配）.\n' +
  '3. .claude/skill-os/evolution/self-model.yaml → already_have_static.builtins + already_have_static.personas.\n' +
  '4. .claude/skill-os/evolution/self-model.generated.yaml → already_have_ondisk.{skills_office,skills_global,agents,hooks}.\n' +
  '5. .claude/skill-os/external-skills/vetting-registry.yaml → EVERY repo identifier (owner/repo) under any status (approved/conditional/rejected/…). If the YAML shape is unclear, grep for "repo:" / "owner" / github URLs and collect them.\n' +
  '6. .claude/skill-os/evolution/candidate-log.jsonl (if present) → 分级拉黑 (tiered blocking, use python datetime vs RUN_DATE): merge into existing_repos ONLY the "repo" fields of entries whose verdict/type indicates REJECTED or KILLED* AND whose date is within 183 days of RUN_DATE. Do NOT block: type=="opportunity"/verdict=="OPPORTUNITY" entries (never blocked), APPROVED/CONDITIONAL entries older than 183 days, or rejects older than 183 days（仓会成熟；resurface 时 verify 层会重新全量安全筛查兜底）. In load_notes, note how many stale rejects became resurfaceable.\n' +
  '7. From candidate-log.jsonl also extract prior_opportunities = the opportunity entries (type=="opportunity" or verdict=="OPPORTUNITY") belonging to the MOST RECENT prior run tag: {name,repo,note(=note/why_notable/reason),date}. The digest author MUST adjudicate each one.\n\n' +
  'RETURN: sources (active), gaps (open), existing_names = lowercased union of all names from #3+#4, existing_repos = lowercased owner/repo list from #5 + #6 (tiered), prior_opportunities (#7), addressed_recheck (#2). load_notes = anything that failed to parse. Do NOT invent; if a file is missing, return what you have and note it.\n' +
  'RUN_DATE: ' + runDate

phase('Load')
const ctx = await agent(loaderPrompt, { label: 'load:truth-files', phase: 'Load', schema: LOADER_SCHEMA })
if (!ctx || !ctx.sources || !ctx.sources.length) {
  log('LOADER FAILED or no active sources — aborting (check evolution/*.yaml).')
  return { run_date: runDate, error: 'loader_failed_or_no_sources', load_notes: ctx && ctx.load_notes }
}
let sources = ctx.sources
let gaps = ctx.gaps || []
if (focusGaps && focusGaps.length) gaps = gaps.filter(g => focusGaps.includes(g.id))
const existingNames = new Set((ctx.existing_names || []).map(s => String(s).toLowerCase()))
const existingRepos = new Set((ctx.existing_repos || []).map(s => String(s).toLowerCase()))
const gapsText = gaps.map(g => `- ${g.id} [${g.dimension}/${g.severity}] ${g.statement || ''} (keywords: ${(g.desired_capability_keywords || []).join(', ')})`).join('\n')
const openGapIds = gaps.map(g => g.id)
log(`Loaded ${sources.length} active sources, ${gaps.length} open gaps, ${existingNames.size} existing names, ${existingRepos.size} vetted repos`)

// ── schemas ─────────────────────────────────────────────────────────────────
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
          kind: { type: 'string', description: 'skill | subagent | pattern | capability | collection' },
          dimension: { type: 'string', description: 'one of the 7 surface dimensions the matched gap belongs to' },
          gap_id: { type: 'string', description: 'which OPEN GAP-id this addresses; "none" if it maps to no open gap' },
          reuse_mode: { type: 'string', description: 'install | port-pattern | adapt-idea' },
          source_id: { type: 'string' },
          one_line_value: { type: 'string' },
          fit_hypothesis: { type: 'string' },
          fit_score: { type: 'number', description: '0-3 self-assessed fit to the named gap' },
          signals: { type: 'string', description: 'observed multi-signal: stars/forks/recency/dependents as seen in tool output, or unknown' },
          evidence_url: { type: 'string' },
        },
        required: ['name', 'repo', 'url', 'dimension', 'gap_id', 'reuse_mode', 'one_line_value', 'fit_score'],
      },
    },
    channel_notes: { type: 'string' },
  },
  required: ['candidates', 'channel_notes'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'object',
      properties: { fit: { type: 'number' }, adoption: { type: 'number' }, maintenance: { type: 'number' }, quality: { type: 'number' } },
      required: ['fit', 'adoption', 'maintenance', 'quality'],
    },
    hard: {
      type: 'object',
      properties: {
        safety: { type: 'string', enum: ['PASS', 'FAIL'] }, compatibility: { type: 'string', enum: ['PASS', 'FAIL'] },
        non_redundancy: { type: 'string', enum: ['PASS', 'FAIL'] },
        gap_addressed: { type: 'string', enum: ['PASS', 'FAIL'] }, provenance: { type: 'string', enum: ['PASS', 'FAIL'] },
      },
      required: ['safety', 'compatibility', 'non_redundancy', 'gap_addressed', 'provenance'],
    },
    evidence: {
      type: 'object',
      properties: {
        stars: { type: ['number', 'null'] }, forks: { type: ['number', 'null'] },
        last_commit: { type: ['string', 'null'] }, license: { type: ['string', 'null'] },
        archived: { type: ['boolean', 'null'] }, created_at: { type: ['string', 'null'] },
        verified_at: { type: 'string' }, source_url: { type: 'string' },
      },
      required: ['stars', 'last_commit', 'license', 'verified_at', 'source_url'],
    },
    supply_chain: {
      type: 'object',
      properties: {
        pinned_sha: { type: ['string', 'null'] }, deps: { type: 'string' },
        egress: { type: 'string', description: 'none | flagged' }, footprint_note: { type: 'string' },
      },
      required: ['pinned_sha', 'egress'],
    },
    gap_id: { type: 'string' },
    reuse_mode: { type: 'string' },
    why_useful: { type: 'string' },
    how_to_reuse: { type: 'string', description: 'install=安装命令+落点; port-pattern/adapt-idea=要把哪段模式搬进哪个 luca_gstack 文件' },
    caveat: { type: 'string' },
    reject_reasons: { type: 'array', items: { type: 'string' } },
    redundant_with: { type: 'string' },
  },
  required: ['scores', 'hard', 'evidence', 'supply_chain', 'why_useful', 'how_to_reuse'],
}

const REDTEAM_SCHEMA = {
  type: 'object',
  properties: {
    redteam_verdict: { type: 'string', description: 'stands | downgraded | killed' },
    incumbent_steelman: { type: 'string', description: '为什么现有能力还不够覆盖该 GAP（或：其实够了→killed）' },
    fit_attack: { type: 'string', description: 'fit-claim 依赖的环境假设 + luca_gstack 是否满足' },
    integration_risk: { type: 'string', description: 'LOW | MEDIUM | HIGH (触碰 framework/、P1-P7、品牌锁 → HIGH)' },
    reason: { type: 'string' },
  },
  required: ['redteam_verdict', 'integration_risk', 'reason'],
}

// ── Phase AdoptionReview：读 adoption-log 出 keep/watch/revert 复盘（propose-only）──
const ADOPTION_REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fused_candidate_id: { type: 'string' },
          recommendation: { type: 'string', enum: ['keep', 'watch', 'revert'] },
          evidence: { type: 'string', description: 'OBSERVED evidence of help/harm, or "unknown" — never invent' },
          helped_update: { type: 'string', description: 'proposed new value for the helped field (yes|no|unknown), propose-only' },
        },
        required: ['fused_candidate_id', 'recommendation', 'evidence'],
      },
    },
    review_notes: { type: 'string' },
  },
  required: ['entries', 'review_notes'],
}
const adoptionReviewPrompt =
  'You are the ADOPTION REVIEWER (propose-only: read/inspect only, edit NOTHING). Read .claude/skill-os/evolution/adoption-log.jsonl. For EACH fused entry produce keep/watch/revert with OBSERVED evidence only:\n' +
  '1. Is the fused content still in place? grep the target file(s) named in "target" for the fused mechanism.\n' +
  '2. Any sign of help/harm since fusion: `git log --oneline -- <target files>` (reverts? follow-up fixes?); search memory/episodic/index.jsonl for the skill/candidate name; note quality-gate/regression mentions if any.\n' +
  '3. helped currently "unknown" + no evidence found → recommendation="watch", evidence="unknown". Recommend "revert" ONLY with concrete regression evidence.\n' +
  'review_notes = coverage + what was uncheckable. Never invent outcomes.'

// ── Phase Discover：按 source.discovery.method 生成通道 ──────────────────────
const DISCOVER_PREAMBLE =
  'You are a DISCOVERY SCOUT for luca_gstack (a Claude Code Skill-OS for CRM 产品设计). Primarily find external projects/capabilities/patterns that fill a KNOWN, OPEN gap below. ALSO surface genuinely high-signal/impressive projects that fit NO open gap as OPPORTUNITIES (gap_id="none") — do NOT silently drop them; a human will judge whether to register a new gap.\n\n' +
  'OPEN GAPS (map a candidate to one if it fits; if it is high-signal but fits none, set gap_id="none" and STILL return it as an opportunity — only drop true low-signal off-topic noise):\n' + gapsText + '\n\n' +
  'HARD RULES:\n' +
  '- Only return things you ACTUALLY OBSERVED in real tool output. Never invent repos/stars from memory. VERIFY a repo actually exists before returning it.\n' +
  '- Do NOT return closed-source / proprietary platform built-in features (e.g. Claude Code managed settings / built-in flags) as candidates — they have no installable artifact and are not adoptable.\n' +
  '- gh search repos AND-joins terms → use SINGLE-keyword or ≤2-word queries (loop per term); 3+ word queries silently return [].\n' +
  '- 热度 ≠ 适配：do NOT rank by raw star count. Prefer multi-signal: recency (pushed within the source freshness window), forks/dependents (real adoption, not just stars), maintenance. Record what you saw in "signals".\n' +
  '- For each candidate: set gap_id to the OPEN gap it fills (or "none" for an opportunity), dimension to its surface dimension, reuse_mode per the source, fit_score 0-3 (3 = directly fills that gap).\n' +
  '- Drop anything already covered by EXISTING (below) unless demonstrably better.\n' +
  '- For web pages, FIRST run ToolSearch with query "select:WebFetch,WebSearch" then use them. Bash has `gh` (authenticated) and `npx`.\n\n' +
  'EXISTING (drop dupes early; non-redundancy is hard-gated downstream): ' + [...existingNames].join(', ') + '\n'

function channelPrompt(src) {
  const disc = JSON.stringify(src.discovery || {})
  const window = src.freshness_window_months || 18
  const discrim = (src.discrimination || []).map(d => '  • ' + d).join('\n')
  let method = ''
  const m = (src.discovery && src.discovery.method) || ''
  if (m === 'gh-search') {
    method = 'CHANNEL METHOD = gh repo search + hub deep-dive. (a) Run `gh search repos "<q>" --sort stars --limit 30 --json fullName,stargazersCount,forksCount,description,url,updatedAt,pushedAt` for EACH query in discovery.queries SEPARATELY (do not concatenate terms). KEEP repos pushed within ' + window + ' months. (b) Then deep-dive EACH hub in discovery.hubs: `gh api repos/OWNER/REPO --jq "{stars:.stargazers_count,forks:.forks_count,pushed:.pushed_at,desc:.description}"` + enumerate members via `gh api "repos/OWNER/REPO/git/trees/HEAD?recursive=1" --jq ".tree[].path"`, pick standout skills/patterns (these big skill collections were under-surfaced before). Capture forks (real adoption) not just stars into "signals".'
  } else if (m === 'webfetch-diff') {
    method = 'CHANNEL METHOD = official-platform diff. Load WebFetch, fetch each url in discovery.targets (Anthropic docs/changelog/cookbook, MCP). Identify NEW or recently-changed platform CAPABILITIES (new hook events, plugins, subagent features, MCP servers) within ' + window + ' months. These are reuse_mode=install or adapt-idea; repo = the canonical repo/url; map each to the gap_id its capability would fill. This source is authority=official: low noise, but still must map to an OPEN gap.'
  } else if (m === 'known-hub-deepdive') {
    method = 'CHANNEL METHOD = known-hub deep-dive. For each hub in discovery.hubs: `gh api repos/OWNER/REPO --jq "{stars:.stargazers_count,forks:.forks_count,pushed:.pushed_at,created:.created_at,desc:.description}"` then enumerate members with `gh api "repos/OWNER/REPO/git/trees/HEAD?recursive=1" --jq ".tree[].path"`. Pick the TOP standouts that map to an OPEN gap (do NOT dump every member). Also run any discovery.also searches. For architecture-pattern sources reuse_mode=port-pattern (NOT installable — the value is the PATTERN to port, name the file/idea).'
  } else if (m === 'webfetch-curated') {
    method = 'CHANNEL METHOD = curated frontier. Load WebFetch; fetch discovery.targets. Return at most 3, adapt-idea only, highest bar; "interesting" is not enough — must map to an OPEN gap with a concrete reuse idea.'
  } else {
    method = 'CHANNEL METHOD = generic: use the discovery config as given.'
  }
  return DISCOVER_PREAMBLE +
    '\nSOURCE id=' + src.id + ' authority=' + src.authority_tier + ' reuse_mode=' + JSON.stringify(src.reuse_mode) +
    ' feeds_dimensions=' + JSON.stringify(src.feeds_dimensions) + '\n' +
    'discovery config: ' + disc + '\n' +
    'this source\'s discrimination checklist:\n' + discrim + '\n\n' +
    method + '\n\nSet source_id="' + src.id + '" on every candidate. Aim for QUALITY over volume. channel_notes = what was reachable/thin/failed + recency coverage.'
}

phase('Discover')
// AdoptionReview 与 Discover 无数据依赖，并入同一批并发（各自用 opts.phase 分组）
const discoverResults = await parallel([
  () => agent(adoptionReviewPrompt, { label: 'adoption-review', phase: 'AdoptionReview', schema: ADOPTION_REVIEW_SCHEMA }),
  ...sources.map(src => () => agent(channelPrompt(src), { label: 'disc:' + src.id, phase: 'Discover', schema: CANDIDATE_SCHEMA })),
])
const adoptionReview = discoverResults[0]
const discovered = discoverResults.slice(1)
const channelNotes = discovered.map((d, i) => sources[i].id + ': ' + ((d && d.channel_notes) || 'NO RESULT'))
const raw = discovered.filter(Boolean).flatMap(d => d.candidates || [])
const sourceSurfaced = {}
for (const c of raw) sourceSurfaced[c.source_id] = (sourceSurfaced[c.source_id] || 0) + 1
log('Discovery: ' + raw.length + ' raw candidates across ' + sources.length + ' sources')

// ── merge + dedup（drop existing names/repos + 无 open gap 的早删）──────────────
raw.sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0))
const norm = s => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '')
const seen = new Set(); const perRepo = {}; const deduped = []; const opportunities = []
let droppedExisting = 0
for (const c of raw) {
  const repo = String(c.repo || '').toLowerCase()
  const nm = norm(c.name)
  if (!repo) continue
  if (existingRepos.has(repo) || existingNames.has(nm) || existingNames.has(String(c.name || '').toLowerCase())) { droppedExisting++; continue }
  const key = repo + '#' + nm
  if (seen.has(key)) continue
  seen.add(key)
  if (!c.gap_id || c.gap_id === 'none' || !openGapIds.includes(c.gap_id)) {
    // 不静默丢：高信号无 gap → 机会项（人审是否开新 gap），轻量持久化、不进严格 verify
    if (opportunities.length < 10) opportunities.push({ name: c.name, repo: c.repo, url: c.url, dimension: c.dimension, reuse_mode: c.reuse_mode, source_id: c.source_id, why_notable: c.one_line_value, signals: c.signals || '' })
    continue
  }
  if ((perRepo[repo] || 0) >= 4) continue
  perRepo[repo] = (perRepo[repo] || 0) + 1; deduped.push(c)
}
const shortlist = deduped.slice(0, MAX_VERIFY)
log('Deduped: ' + deduped.length + ' gap-mapped (dropped ' + droppedExisting + ' existing); ' + opportunities.length + ' opportunities (no-gap, surfaced for review); verifying ' + shortlist.length)

// ── Phase Verify：对抗式、证据落地核验（含 gap_addressed + provenance 新硬门）──
function verifyPrompt(c) {
  const gap = gaps.find(g => g.id === c.gap_id)
  const gapText = gap ? `${gap.id} [${gap.dimension}/${gap.severity}]: ${gap.statement}` : c.gap_id
  return 'You are a SKEPTICAL, ADVERSARIAL verifier. Find reasons to REJECT, not to praise. When uncertain, score LOW and FAIL hard gates. Use REAL tool output only.\n\n' +
    'CANDIDATE: name="' + c.name + '" repo="' + c.repo + '" url="' + c.url + '" kind="' + c.kind + '" reuse_mode="' + c.reuse_mode + '" source="' + c.source_id + '"\n' +
    'CLAIMED to address GAP ' + gapText + '\n' +
    '(If repo has >2 path segments, the GitHub repo is the first owner/repo; the rest is a path inside it.)\n\n' +
    'GATHER EVIDENCE (run these; for non-GitHub/official targets, use WebFetch):\n' +
    '1. gh api repos/OWNER/REPO --jq "{stars:.stargazers_count,forks:.forks_count,pushed:.pushed_at,created:.created_at,license:.license.spdx_id,archived:.archived,disabled:.disabled,url:.html_url}"\n' +
    '2. gh api "repos/OWNER/REPO/commits?per_page=1" --jq ".[0].commit.committer.date"  AND  gh api "repos/OWNER/REPO/commits?per_page=1" --jq ".[0].sha"  (latest commit date + SHA to PIN)\n' +
    '3. Fetch the ACTUAL skill/agent/pattern file (gh api "repos/OWNER/REPO/contents/PATH" --jq ".content" | base64 --decode). Read frontmatter + body. If install-type and no SKILL.md/subagent .md → COMPATIBILITY problem.\n' +
    '4. verified_at: date -u +%Y-%m-%dT%H:%M:%SZ\n' +
    '5. SAFETY+SUPPLY-CHAIN SCAN the file and any bundled scripts/package.json for: destructive bash (rm -rf, dd, mkfs, git push --force), exfiltration (curl/wget POST of local data, base64|curl), secret harvesting (~/.ssh, .env, env tokens, keychain), curl-pipe-to-shell, install-time code exec beyond a plain `npx skills add` arg-array / postinstall that fetches+runs. Enumerate runtime deps. Note egress none|flagged.\n\n' +
    'SCORE 门禁:\n' +
    'SOFT (0-3): fit (FIT-TO-GAP rubric: 3=directly fills THIS gap AND the gap is high-severity with corroborating need; 2=fills a high/med gap; 1=partial/low; 0=does not actually fill the named gap), adoption (forks+dependents+stars: real usage>raw stars; <100 stars & ~0 forks weak=0-1, real adoption=2-3), maintenance (latest commit <=6mo=3, 6-18mo=1-2, >18mo/archived=0), quality (structure, clear scope, examples/tests/docs vs thin stub).\n' +
    'HARD (exactly "PASS" or "FAIL"):\n' +
    '  safety (safe code AND permissive license MIT/Apache/BSD present; else FAIL),\n' +
    '  compatibility (judge by what the candidate IS: install-as-SKILL/subagent → needs valid SKILL.md/subagent frontmatter, droppable into ~/.claude/skills or .claude/, no trigger collision; install-as-MCP/tool (e.g. npm package / MCP server / installable CLI) → does NOT need a SKILL.md — do NOT FAIL merely for lacking one; needs a real install path + no infra the user lacks + wires in as an MCP/tool NOT into route-guard/office; port-pattern/adapt-idea → the pattern/idea is extractable without dragging a heavy runtime or whole framework. FAIL only if none of these hold),\n' +
    '  non_redundancy (NOT already covered by EXISTING unless demonstrably better; if redundant set redundant_with and FAIL),\n' +
    '  gap_addressed (does it ACTUALLY fill the named OPEN gap? if the gap-claim is bogus or it maps to no open gap → FAIL),\n' +
    '  provenance (repo not archived/disabled; >=1 real commit within 18mo; star count cross-checked — if created very recently with anomalously high stars, note it and lean FAIL).\n\n' +
    'EXISTING (non-redundancy reference): ' + [...existingNames].join(', ') + '\n\n' +
    'RETURN schema. why_useful=1-2 concrete sentences tying it to the gap. how_to_reuse: if reuse_mode=install → exact install command + where it lives (~/.claude/skills | .claude/skills/office + routing-map entry | .claude/agents | observability/rules.yaml for brand-sensitive); if port-pattern/adapt-idea → which SPECIFIC pattern to port into which luca_gstack file. supply_chain.pinned_sha = the SHA from step 2. evidence.* = real observed numbers (null if a call failed). Default to skepticism.'
}

phase('Verify')
const verdicts = await parallel(shortlist.map(c => () =>
  agent(verifyPrompt(c), { label: 'verify:' + c.repo, phase: 'Verify', schema: VERDICT_SCHEMA })
    .then(v => (v ? Object.assign({}, c, v) : null))
))

function adjudicate(v) {
  const h = v.hard || {}
  // default-deny：硬门任何非规范 "PASS"（含 "FAIL (…)"、"UNKNOWN"、缺字段）一律按 FAIL
  const HARD_KEYS = ['safety', 'compatibility', 'non_redundancy', 'gap_addressed', 'provenance']
  const hardFail = HARD_KEYS.some(k => h[k] !== 'PASS')
  const s = v.scores || {}
  const W = /^(port-pattern|adapt-idea)/.test(String(v.reuse_mode || '')) ? GATE_WEIGHTS.pattern : GATE_WEIGHTS.install
  const weighted = Math.round(
    ((s.fit || 0) / 3) * W.fit + ((s.quality || 0) / 3) * W.quality +
    ((s.adoption || 0) / 3) * W.adoption + ((s.maintenance || 0) / 3) * W.maintenance
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
let approved = judged.filter(v => v.verdict === 'APPROVED').sort(byScore)
let conditional = judged.filter(v => v.verdict === 'CONDITIONAL').sort(byScore)
const rejected = judged.filter(v => v.verdict === 'REJECTED').sort(byScore)
log('Verified ' + judged.length + ': APPROVED ' + approved.length + ', CONDITIONAL ' + conditional.length + ', REJECTED ' + rejected.length)

// ── Phase Redteam：红队「推荐」而非「仓库」——steel-man 现任 / 攻击 fit / 集成成本 ──
function redteamPrompt(v) {
  const gap = gaps.find(g => g.id === v.gap_id)
  return 'You red-team a RECOMMENDATION (not the repo). A repo can be perfect yet the recommendation wrong: wrong-gap-fit, duplicates an incumbent under a new name, or hidden integration cost. Be brutal; default to downgrade/kill when weak.\n\n' +
    'RECOMMENDATION: "' + v.name + '" (' + v.repo + ') reuse_mode=' + v.reuse_mode + ' weighted=' + v.weighted_score + '\n' +
    'addresses GAP ' + (gap ? gap.id + ': ' + gap.statement : v.gap_id) + '\n' +
    'why_useful: ' + (v.why_useful || '') + '\nhow_to_reuse: ' + (v.how_to_reuse || '') + '\n\n' +
    'EXISTING luca_gstack capabilities: ' + [...existingNames].join(', ') + '\n\n' +
    'DO THREE THINGS:\n' +
    '1. STEEL-MAN THE INCUMBENT: name the closest existing skill/agent and argue why it is ALREADY enough for this gap. If that argument is strong → redteam_verdict="killed".\n' +
    '2. ATTACK THE FIT HYPOTHESIS: what environment assumption does the fit-claim depend on, and does luca_gstack (FxUI brand-lock, framework/ read-only, Sonnet default, Claude Code harness) actually satisfy it? If it depends on something luca_gstack lacks → downgrade or kill.\n' +
    '3. INTEGRATION COST: which luca_gstack surface files would the fusion touch? If it must edit framework/, SKILL.md P1-P7 invariants, or weaken a brand-lock → integration_risk="HIGH".\n\n' +
    'redteam_verdict: "stands" (recommendation holds), "downgraded" (real but weaker than scored → CONDITIONAL), or "killed" (incumbent suffices / fit bogus). reason = one line.'
}

phase('Redteam')
const pool = approved.concat(conditional)
const redteamed = await parallel(pool.map(v => () =>
  agent(redteamPrompt(v), { label: 'redteam:' + v.repo, phase: 'Redteam', schema: REDTEAM_SCHEMA })
    .then(r => Object.assign({}, v, { redteam: r || { redteam_verdict: 'downgraded', integration_risk: 'UNKNOWN', reason: 'redteam agent 未返回——决定层失败按保守降级处理，不得视为无异议' } }))
))
// apply red-team verdicts
const killed = redteamed.filter(v => v.redteam.redteam_verdict === 'killed')
const survivors = redteamed.filter(v => v.redteam.redteam_verdict !== 'killed')
approved = survivors.filter(v => v.verdict === 'APPROVED' && v.redteam.redteam_verdict === 'stands').sort(byScore)
conditional = survivors.filter(v => v.verdict === 'CONDITIONAL' || v.redteam.redteam_verdict === 'downgraded').sort(byScore)
for (const k of killed) { k.verdict = 'REJECTED'; k.killed_by_redteam = true }
log('Redteam: ' + killed.length + ' killed, ' + approved.length + ' stand, ' + conditional.length + ' conditional')

// ── source yield + gaps coverage ──
const sourceYield = {}
for (const s of sources) sourceYield[s.id] = { surfaced: sourceSurfaced[s.id] || 0, approved: 0 }
for (const v of approved) if (sourceYield[v.source_id]) sourceYield[v.source_id].approved++
const gapsCovered = {}
for (const g of gaps) gapsCovered[g.id] = approved.filter(v => v.gap_id === g.id).length

return {
  run_date: runDate,
  red_lines: 'propose-only(行为面零编辑; 簿记走 scripts/evolution-bookkeep.mjs); NOT routed through consolidate_memory; 热度≠适配',
  // digest 首节三件套（均为强制裁决项，不是可选附录）：
  adoption_review: adoptionReview || { entries: [], review_notes: 'adoption-review agent 未返回' },
  prior_opportunities_to_adjudicate: (ctx.prior_opportunities || []),
  addressed_recheck: (ctx.addressed_recheck || []),
  stats: {
    raw: raw.length, unique: deduped.length, verified: judged.length,
    approved: approved.length, conditional: conditional.length,
    rejected: rejected.length + killed.length, killed_by_redteam: killed.length,
    dropped_existing: droppedExisting, opportunities: opportunities.length,
  },
  source_yield: sourceYield,
  gaps_covered: gapsCovered,
  channel_notes: channelNotes,
  approved: approved.slice(0, TOP_DIGEST),
  approved_overflow: approved.slice(TOP_DIGEST),
  conditional,
  opportunities,  // 高信号无 gap → 人审是否开新 gap（恢复"借鉴"能力，非自动采纳）
  killed: killed.map(k => ({ name: k.name, repo: k.repo, gap_id: k.gap_id, reason: k.redteam.reason })),
  // 持久化结构化裁决（对抗裁判认定的真 delta）：hard{} + weighted + scores 落进可复查产物
  rejected_summary: rejected.map(r => ({ name: r.name, repo: r.repo, gap_id: r.gap_id, weighted_score: r.weighted_score, hard: r.hard, scores: r.scores, reasons: r.reject_reasons || [], redundant_with: r.redundant_with })),
}
