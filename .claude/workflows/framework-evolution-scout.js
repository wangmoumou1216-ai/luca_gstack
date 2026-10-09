export const meta = {
  name: 'framework-evolution-scout',
  description: '月度框架自进化侦察：从 sources-registry 生成发现通道(S1-S4)，按 gaps-register 做 fit-to-gap 门禁，gh 证据核验 + 供应链 + 推荐级红队，产出 propose-only 演进 digest。零自动编辑 luca_gstack。args 可选 {date,focus_gaps}；args.target_repos=模式1b 单点候选评估（用户点名 repo 时用：跳过发现段，同门禁 Verify+红队+bookkeep 落笔）。',
  phases: [
    { title: 'Load' },
    { title: 'AdoptionReview' },
    { title: 'Discover' },
    { title: 'Intake' },
    { title: 'Verify' },
    { title: 'Redteam' },
  ],
}

// ── 红线 ────────────────────────────────────────────────────────────────────
// 1. propose-only：本工作流只「发现 + 门禁 + 红队 + 出 digest 数据」，绝不编辑任何
//    luca_gstack **行为面**文件（skills/hooks/routing/registry 判断字段），绝不安装任何东西。
//    簿记落盘（candidate-log 追加 + yield_stats 计数）由人工触发的确定性脚本
//    scripts/evolution-bookkeep.mjs 完成（喂本工作流的返回 JSON）；gaps-register 的
//    status 开关仍由人裁决后落笔。落地(融合)是另一条人工触发的管线：
//    approved 候选的落地步骤走 .claude/skill-os/evolution/FUSION-RUNBOOK.md（发现→落地的唯一
//    入口指针——此前该 runbook 在所有主入口面零引用，采纳时找不到融合门）。
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

// Validate caller intent before any agent; omitted input alone selects the default sweep.
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v)
const textValue = v => typeof v === 'string' && v.trim().length > 0
const score = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 3
const stringList = v => Array.isArray(v) && v.every(textValue)
let parsed = args === undefined ? {} : args
if (typeof parsed === 'string') {
  try { parsed = JSON.parse(parsed) } catch { throw new Error('invalid evolution args JSON') }
}
if (!record(parsed)) throw new Error('evolution args must be an object')
if ('date' in parsed && !textValue(parsed.date)) throw new Error('invalid date')
if ('focus_gaps' in parsed && (!stringList(parsed.focus_gaps) || !parsed.focus_gaps.length)) throw new Error('invalid focus_gaps')
const runDate = parsed.date || 'unknown'
const focusGaps = parsed.focus_gaps || null
let targetRepos = null
if ('target_repos' in parsed) {
  const supplied = typeof parsed.target_repos === 'string' ? [parsed.target_repos] : parsed.target_repos
  if (!stringList(supplied) || !supplied.length || supplied.some(r => !/^[\w.-]+\/[\w.-]+$/.test(r.trim()))) throw new Error('invalid target_repos')
  targetRepos = [...new Set(supplied.map(r => r.trim().toLowerCase()))]
}

// Ephemeral coverage binds the original dispatch set, not just surviving results.
const phaseCoverage = {}
const failures = []
function checked(name, ids, values, valid) {
  const completed = []
  phaseCoverage[name] = { expected: [...ids], completed }
  if (!Array.isArray(values) || values.length !== ids.length) failures.push({ phase: name, id: '*', reason: 'result count mismatch' })
  return ids.map((id, i) => {
    const v = values?.[i]
    if (!valid(v, id, i)) { failures.push({ phase: name, id, reason: 'missing or invalid result', result: v ?? null }); return null }
    completed.push(id)
    return v
  })
}
const candidateId = c => c.repo.toLowerCase() + '#' + c.name.toLowerCase()
function finish(result) {
  const incomplete = failures.length > 0
  result.run_status = incomplete ? 'INCOMPLETE' : 'COMPLETE'
  result.phase_coverage = phaseCoverage
  result.failures = failures
  if (incomplete) {
    for (const key of ['approved', 'approved_overflow', 'conditional', 'opportunities', 'results']) {
      if (result[key]?.length) { result[key + '_quarantined'] = result[key]; result[key] = [] }
    }
  }
  return result
}
function validCandidate(c) {
  return record(c) && ['name','repo','url','dimension','gap_id','one_line_value'].every(k => textValue(c[k]))
    && ['install','port-pattern','adapt-idea'].includes(c.reuse_mode) && score(c.fit_score)
    && (c.gap_id === 'none' || openGapIds.includes(c.gap_id))
}
function mergeVerdict(c, v) {
  const valid = record(v) && record(v.scores) && ['fit','quality','adoption','maintenance'].every(k => score(v.scores[k]))
    && record(v.hard) && ['safety','compatibility','non_redundancy','gap_addressed','provenance'].every(k => ['PASS','FAIL'].includes(v.hard[k]))
    && record(v.evidence) && record(v.supply_chain)
    && ['name','repo','source_id'].every(k => v[k] == null || v[k] === c[k])
    && (v.gap_id == null || v.gap_id === 'none' || openGapIds.includes(v.gap_id))
    && (v.reuse_mode == null || ['install','port-pattern','adapt-idea'].includes(v.reuse_mode))
  if (!valid) return null
  // Strict adapters represent optional fields as null: absence must not erase known facts.
  return { ...c, ...v, name: c.name, repo: c.repo, source_id: c.source_id,
    gap_id: v.gap_id ?? c.gap_id, reuse_mode: v.reuse_mode ?? c.reuse_mode }
}
const validRedteam = r => record(r) && ['stands','downgraded','killed'].includes(r.redteam_verdict)
  && ['LOW','MEDIUM','HIGH'].includes(r.integration_risk) && textValue(r.reason)

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
          // 自设重访条件（可缺省）。曾写在 YAML `#` 注释里 → safe_load 丢弃、schema 不声明即被剥掉，
          // 条件满足也无人可能发现（2026-07-21 实证：GAP-self-evolution 超阈值 4.6 倍无人知）。
          revisit_when: { type: 'string' },
          revisit_status: { type: 'string' },
        },
        required: ['id', 'dimension', 'severity'],
      },
    },
    existing_names: { type: 'array', items: { type: 'string' }, description: 'lowercased skill/agent names already present (office+global+static)' },
    existing_repos: { type: 'array', items: { type: 'string' }, description: 'owner/repo to BLOCK from re-surfacing: all vetting-registry repos + candidate-log REJECTED/KILLED within TTL. Opportunities and stale rejects excluded (分级拉黑, 见 loader prompt #6)' },
    prior_opportunities: {
      type: 'array',
      items: { type: 'object', properties: { name: { type: 'string' }, repo: { type: 'string' }, note: { type: 'string' }, date: { type: 'string' } } },
      description: 'opportunity entries from the MOST RECENT prior run in candidate-log — digest 必须逐条裁决（开 gap / 对标深评[高信号 hub→BENCHMARK-RUNBOOK 模式2] / 归档 / 观察）',
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
  '2. .claude/skill-os/evolution/gaps-register.yaml → gaps where status=="open": {id,dimension,statement,severity,desired_capability_keywords,revisit_when,revisit_status}（后两个字段可缺省；缺省时省略，不要编造）. DROP deferred/closed. 任何 revisit_status 以 "MET" 开头的 gap 必须在 digest 首节单列为「到期待裁决」，不得只当普通匹配目标. ALSO: gaps with status=="addressed" whose addressed_at is MORE than 90 days before RUN_DATE (python datetime) → return in addressed_recheck {id,addressed_at,statement}（自建方案的复核窗，不进候选匹配）.\n' +
  '3. .claude/skill-os/evolution/self-model.yaml → already_have_static.builtins + already_have_static.personas.\n' +
  '4. .claude/skill-os/evolution/self-model.generated.yaml → already_have_ondisk.{skills_office,skills_global,agents,hooks}.\n' +
  '5. .claude/skill-os/external-skills/vetting-registry.yaml → EVERY repo identifier (owner/repo) under any status (approved/conditional/rejected/…). If the YAML shape is unclear, grep for "repo:" / "owner" / github URLs and collect them.\n' +
  '6. .claude/skill-os/evolution/candidate-log.jsonl (if present) → 分级拉黑 (tiered blocking, use python datetime vs RUN_DATE): merge into existing_repos ONLY the "repo" fields of entries whose verdict/type indicates REJECTED or KILLED* AND whose date is within 183 days of RUN_DATE. Do NOT block: type=="opportunity"/verdict=="OPPORTUNITY" entries (never blocked), APPROVED/CONDITIONAL entries older than 183 days, or rejects older than 183 days（仓会成熟；resurface 时 verify 层会重新全量安全筛查兜底）. In load_notes, note how many stale rejects became resurfaceable.\n' +
  '7. From candidate-log.jsonl also extract prior_opportunities = the opportunity entries (type=="opportunity" or verdict=="OPPORTUNITY") belonging to the MOST RECENT prior SWEEP run tag — EXCLUDE runs whose tag starts with "punctual-" or "backfill-" (single-target/backfill bookkeeping, not sweep rounds; they carry no opportunities and must not shadow the real prior sweep): {name,repo,note(=note/why_notable/reason),date}. The digest author MUST adjudicate each one.\n\n' +
  'RETURN: sources (active), gaps (open), existing_names = lowercased union of all names from #3+#4, existing_repos = lowercased owner/repo list from #5 + #6 (tiered), prior_opportunities (#7), addressed_recheck (#2). load_notes = anything that failed to parse. Do NOT invent; if a file is missing, return what you have and note it.\n' +
  'RUN_DATE: ' + runDate

phase('Load')
const loaded = await agent(loaderPrompt, { label: 'load:truth-files', phase: 'Load', schema: LOADER_SCHEMA })
const ctx = checked('Load', ['truth-files'], [loaded], v => record(v)
  && Array.isArray(v.sources) && v.sources.length > 0 && v.sources.every(s => record(s) && textValue(s.id) && record(s.discovery))
  && new Set(v.sources.map(s => s.id)).size === v.sources.length
  && Array.isArray(v.gaps) && v.gaps.every(g => record(g) && textValue(g.id))
  && new Set(v.gaps.map(g => g.id)).size === v.gaps.length
  && stringList(v.existing_names) && stringList(v.existing_repos))[0]
if (!ctx || !ctx.sources || !ctx.sources.length) {
  log('LOADER FAILED or no active sources — aborting (check evolution/*.yaml).')
  return finish({ run_date: runDate, error: 'loader_failed_or_no_sources', load_notes: loaded && loaded.load_notes })
}
let sources = ctx.sources
let gaps = ctx.gaps || []
if (focusGaps && focusGaps.length) gaps = gaps.filter(g => focusGaps.includes(g.id))
const existingNames = new Set((ctx.existing_names || []).map(s => String(s).toLowerCase()))
const existingRepos = new Set((ctx.existing_repos || []).map(s => String(s).toLowerCase()))
const gapsText = gaps.map(g => `- ${g.id} [${g.dimension}/${g.severity}] ${g.statement || ''} (keywords: ${(g.desired_capability_keywords || []).join(', ')})`).join('\n')
const openGapIds = gaps.map(g => g.id)
// 自设重访条件已满足的 gap → 进 digest 首节强制裁决项（与 addressed_recheck 同级）。
// 只声明字段不接消费端 = SC-20260715-001 红线，故此处必须落到 return。
const revisitDue = gaps
  .filter(g => String(g.revisit_status || '').trim().toUpperCase().startsWith('MET'))
  .map(g => ({ id: g.id, revisit_when: g.revisit_when || '', revisit_status: g.revisit_status, statement: g.statement || '' }))
if (revisitDue.length) log(`⚠️ ${revisitDue.length} 个 gap 的自设重访条件已满足，须在 digest 首节单列待裁：${revisitDue.map(g => g.id).join(', ')}`)
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

// ── 模式1b 单点候选评估（BENCHMARK-RUNBOOK「单点工具走模式1」的实际入口）─────────
// 跳过 AdoptionReview+Discover；Intake 构造候选后复用下方同一套 verifyPrompt/adjudicate/
// redteamPrompt（function 声明提升，此处可直接调用）——门禁零复制，sweep 路径零改动。
if (targetRepos) {
  const priorEntryHints = targetRepos.filter(r => existingRepos.has(String(r).toLowerCase()))
  if (priorEntryHints.length) log('⚠️ 已有评估记录（vetting-registry/candidate-log 命中），本轮按复评跑：' + priorEntryHints.join(', '))
  phase('Intake')
  const intakePrompt = r =>
    'You are the INTAKE agent for a PUNCTUAL (user-pointed) candidate evaluation. The user asked luca_gstack to evaluate ONE specific repo: "' + r + '".\n' +
    'Using REAL tool output only (gh api repos/' + r + ' ; README via gh api repos/' + r + '/readme), produce EXACTLY ONE candidate object describing what this repo IS:\n' +
    '- name / repo(owner/repo) / url / kind (skill | subagent | pattern | capability | collection | tool)\n' +
    '- gap_id: map to ONE of the OPEN GAPS below only if it genuinely fits; else "none" — do NOT force-fit, "none" is a legitimate answer and downstream hard gates handle it\n' +
    '- dimension, reuse_mode (install | port-pattern | adapt-idea), one_line_value, fit_hypothesis, fit_score 0-3, signals (stars/forks/pushed as observed), evidence_url\n\n' +
    'OPEN GAPS:\n' + gapsText + '\n\n' +
    'Return via schema: candidates=[that ONE object], channel_notes=what you observed vs could not verify.'
  const intake = await parallel(targetRepos.map(r => () =>
    agent(intakePrompt(r), { label: 'intake:' + r, phase: 'Intake', schema: CANDIDATE_SCHEMA })))
  const acceptedIntake = checked('Intake', targetRepos, intake, (d, repo) => record(d)
    && Array.isArray(d.candidates) && d.candidates.length === 1 && validCandidate(d.candidates[0])
    && d.candidates[0].repo.toLowerCase() === repo)
  const targets = acceptedIntake.filter(Boolean).flatMap(d => d.candidates)
  phase('Verify')
  const pVerdicts = await parallel(targets.map(c => () =>
    agent(verifyPrompt(c), { label: 'verify:' + c.repo, phase: 'Verify', schema: VERDICT_SCHEMA })
      .then(v => mergeVerdict(c, v))))
  const pJudged = checked('Verify', targets.map(candidateId), pVerdicts, Boolean).filter(Boolean).map(adjudicate)
  phase('Redteam')
  // G1 相位完整性（claude5-unhobble）：fallback 替换计数——null 被保守默认吞掉后按返回数
  // 计数恒 100%，必须数替换本身（07-02 事故机理：整相位未跑仍发布裁决）
  let pRedteamFallbacks = 0
  const pRawRedteam = await parallel(pJudged.map(v => () =>
    agent(redteamPrompt(v), { label: 'redteam:' + v.repo, phase: 'Redteam', schema: REDTEAM_SCHEMA })))
  const pCheckedRedteam = checked('Redteam', pJudged.map(candidateId), pRawRedteam, validRedteam)
  const pRedteamed = pJudged.map((v, i) => {
    const r = pCheckedRedteam[i]
    if (!r) pRedteamFallbacks++
    return { ...v, redteam: r || { redteam_verdict: 'downgraded', integration_risk: 'UNKNOWN', reason: 'redteam agent 未返回或非法——不得采纳' } }
  })
  for (const v of pRedteamed) {
    // 无 open gap 对口 → 机械封顶 REJECTED（与 sweep 的 opportunities 分流同义；不依赖 verify LLM 自觉 FAIL）
    if (v.gap_id === 'none') { v.verdict = 'REJECTED'; v.no_open_gap_note = '无 open gap 对口：结论最多 opportunity/开 gap 提案，不可采纳（机械封顶，非 LLM 裁量）' }
    if (v.redteam.redteam_verdict === 'killed') { v.verdict = 'REJECTED'; v.killed_by_redteam = true }
    // 白名单语义与 sweep 对齐：APPROVED 只有精确 'stands' 才保得住，任何非规范字符串一律降档
    else if (v.verdict === 'APPROVED' && v.redteam.redteam_verdict !== 'stands') v.verdict = 'CONDITIONAL'
  }
  return finish({
    run_date: runDate,
    mode: 'punctual',
    red_lines: 'propose-only(行为面零编辑; 簿记走 scripts/evolution-bookkeep.mjs); 热度≠适配; 采纳另行人裁走 FUSION-RUNBOOK',
    target_repos: targetRepos,
    prior_entry_hint: priorEntryHints,
    stats: {
      raw: targets.length, unique: targets.length, verified: pJudged.length,
      approved: pRedteamed.filter(v => v.verdict === 'APPROVED').length,
      conditional: pRedteamed.filter(v => v.verdict === 'CONDITIONAL').length,
      rejected: pRedteamed.filter(v => v.verdict === 'REJECTED').length,
      killed_by_redteam: pRedteamed.filter(v => v.killed_by_redteam).length,
      dropped_existing: 0, opportunities: 0,
    },
    // G1：分母=targets.length（派发面；pJudged 是 filter(Boolean) 幸存后集合，会放行 Verify 损耗）
    run_status: (pJudged.length === targets.length && pRedteamFallbacks === 0) ? 'COMPLETE' : 'INCOMPLETE',
    phases_completed: { verify: `${pJudged.length}/${targets.length}`, redteam_fallbacks: pRedteamFallbacks },
    results: pRedteamed,
  })
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
  'You are a DISCOVERY SCOUT for luca_gstack (a product-neutral Skill OS across supported harnesses). Primarily find external projects/capabilities/patterns that fill a KNOWN, OPEN gap below. ALSO surface genuinely high-signal/impressive projects that fit NO open gap as OPPORTUNITIES (gap_id="none") — do NOT silently drop them; a human will judge whether to register a new gap.\n\n' +
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
const adoptionReview = checked('AdoptionReview', ['adoption-log'], [discoverResults[0]], v => record(v)
  && Array.isArray(v.entries) && v.entries.every(e => record(e) && textValue(e.fused_candidate_id)
    && ['keep','watch','revert'].includes(e.recommendation)))[0]
const discovered = checked('Discover', sources.map(s => s.id), discoverResults.slice(1), (d, id) => record(d)
  && Array.isArray(d.candidates) && d.candidates.every(c => validCandidate(c) && (c.source_id == null || c.source_id === id)))
  .map((d, i) => d && ({ ...d, candidates: d.candidates.map(c => ({ ...c, source_id: sources[i].id })) }))
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
    .then(v => mergeVerdict(c, v))
))

function adjudicate(v) {
  const h = v.hard || {}
  // default-deny：硬门任何非规范 "PASS"（含 "FAIL (…)"、"UNKNOWN"、缺字段）一律按 FAIL
  const HARD_KEYS = ['safety', 'compatibility', 'non_redundancy', 'gap_addressed', 'provenance']
  const hardFail = HARD_KEYS.some(k => h[k] !== 'PASS') || v.gap_id === 'none'
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
const judged = checked('Verify', shortlist.map(candidateId), verdicts, Boolean).filter(Boolean).map(adjudicate)
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
    '2. ATTACK THE FIT HYPOTHESIS: what environment assumption does the fit-claim depend on, and does luca_gstack (framework/ read-only; actual current model, harness and verified project constraints only) actually satisfy it? If it depends on something luca_gstack lacks → downgrade or kill.\n' +
    '3. INTEGRATION COST: which luca_gstack surface files would the fusion touch? If it must edit framework/, SKILL.md P1-P7 invariants, or weaken confirmed project constraints → integration_risk="HIGH".\n\n' +
    'redteam_verdict: "stands" (recommendation holds), "downgraded" (real but weaker than scored → CONDITIONAL), or "killed" (incumbent suffices / fit bogus). reason = one line.'
}

phase('Redteam')
const pool = approved.concat(conditional)
// G1 相位完整性：fallback 替换计数（按返回数计数恒 100%，须数替换本身——07-02 事故机理）
let sweepRedteamFallbacks = 0
const rawRedteam = await parallel(pool.map(v => () =>
  agent(redteamPrompt(v), { label: 'redteam:' + v.repo, phase: 'Redteam', schema: REDTEAM_SCHEMA })
))
const checkedRedteam = checked('Redteam', pool.map(candidateId), rawRedteam, validRedteam)
const redteamed = pool.map((v, i) => {
  const r = checkedRedteam[i]
  if (!r) sweepRedteamFallbacks++
  return { ...v, redteam: r || { redteam_verdict: 'downgraded', integration_risk: 'UNKNOWN', reason: 'redteam agent 未返回或非法——不得采纳' } }
})
// apply red-team verdicts
const killed = redteamed.filter(v => v.redteam.redteam_verdict === 'killed')
const survivors = redteamed.filter(v => v.redteam.redteam_verdict !== 'killed')
approved = survivors.filter(v => v.verdict === 'APPROVED' && v.redteam.redteam_verdict === 'stands').sort(byScore)
conditional = survivors.filter(v => v.verdict === 'CONDITIONAL' || v.redteam.redteam_verdict === 'downgraded').sort(byScore)
for (const v of conditional) v.verdict = 'CONDITIONAL'
for (const k of killed) { k.verdict = 'REJECTED'; k.killed_by_redteam = true }
log('Redteam: ' + killed.length + ' killed, ' + approved.length + ' stand, ' + conditional.length + ' conditional')

// ── source yield + gaps coverage ──
const sourceYield = {}
for (const s of sources) sourceYield[s.id] = { surfaced: sourceSurfaced[s.id] || 0, approved: 0 }
for (const v of approved) if (sourceYield[v.source_id]) sourceYield[v.source_id].approved++
const gapsCovered = {}
for (const g of gaps) gapsCovered[g.id] = approved.filter(v => v.gap_id === g.id).length

// G1 相位完整性契约（claude5-unhobble；07-02 事故：13 agent 阵亡首跑发布 2 APPROVED 终版全反转）
// 分母=shortlist.length（实际派发面；unique 含 MAX_VERIFY 帽/droppedExisting 合法衰减不可用）
const verifyDeaths = shortlist.length - judged.length
const runStatus = failures.length === 0 ? 'COMPLETE' : 'INCOMPLETE'
const quarantined = runStatus !== 'COMPLETE'
if (quarantined) log(`⚠️ run INCOMPLETE（verify 阵亡 ${verifyDeaths}/${shortlist.length}、redteam fallback ${sweepRedteamFallbacks}）——采纳裁决隔离，bookkeep 将拒登记`)

return finish({
  run_date: runDate,
  red_lines: 'propose-only(行为面零编辑; 簿记走 scripts/evolution-bookkeep.mjs); NOT routed through consolidate_memory; 热度≠适配',
  // digest 首节四件套（均为强制裁决项，不是可选附录）：
  adoption_review: adoptionReview || { entries: [], review_notes: 'adoption-review agent 未返回' },
  prior_opportunities_to_adjudicate: (ctx.prior_opportunities || []),
  addressed_recheck: (ctx.addressed_recheck || []),
  revisit_due: revisitDue,   // 自设重访条件已满足的 open gap（2026-07-21 补；此前字段无消费端）
  stats: {
    raw: raw.length, unique: deduped.length, verified: judged.length,
    approved: approved.length, conditional: conditional.length,
    rejected: rejected.length + killed.length, killed_by_redteam: killed.length,
    dropped_existing: droppedExisting, opportunities: opportunities.length,
  },
  run_status: runStatus,
  phases_completed: { verify: `${judged.length}/${shortlist.length}`, redteam_fallbacks: sweepRedteamFallbacks },
  source_yield: sourceYield,
  gaps_covered: gapsCovered,
  channel_notes: channelNotes,
  approved: quarantined ? [] : approved.slice(0, TOP_DIGEST),
  approved_overflow: quarantined ? [] : approved.slice(TOP_DIGEST),
  approved_quarantined: quarantined ? approved : [],
  conditional,
  opportunities,  // 高信号无 gap → 人审是否开新 gap（恢复"借鉴"能力，非自动采纳）
  killed: killed.map(k => ({ name: k.name, repo: k.repo, gap_id: k.gap_id, source_id: k.source_id, reason: k.redteam.reason,
    verdict: k.verdict, hard: k.hard, scores: k.scores, weighted_score: k.weighted_score, reuse_mode: k.reuse_mode, redteam: k.redteam })),
  // 持久化结构化裁决（对抗裁判认定的真 delta）：hard{} + weighted + scores 落进可复查产物
  rejected_summary: rejected.map(r => ({ name: r.name, repo: r.repo, gap_id: r.gap_id, source_id: r.source_id, weighted_score: r.weighted_score, hard: r.hard, scores: r.scores, verdict: r.verdict, reuse_mode: r.reuse_mode, reasons: r.reject_reasons || [], redundant_with: r.redundant_with })),
})
