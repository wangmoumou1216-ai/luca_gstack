# Angle 5 — Evaluation and memory failure evidence, 2026-09-08

E1 FACT HIGH: LongMemEval separates extraction, multi-session reasoning, temporal reasoning, knowledge updates and abstention. https://arxiv.org/html/2410.10813v2
E2 FACT HIGH: Its analysis separates indexing, retrieval and reading. Retrieving relevant material is not the same as using it correctly. Same paper as E1.
E3 FACT HIGH: Official LoCoMo data includes timestamps, turn IDs and answer evidence IDs, enabling source-grounded checks. https://github.com/snap-research/locomo
E4 FACT HIGH: LoCoMo release notes distinguish the current ten-conversation subset from the earlier fifty-conversation release. Scores require dataset-version alignment. Same source as E3.
E5 FACT MODERATE: Harness the Memory (2026 preprint) reports task/backbone-dependent substrate results, not one universally superior memory architecture. https://arxiv.org/html/2608.15008
E6 INFERENCE: Local acceptance should exercise write→fresh-process recall, scope exclusion before read, updates/expiry and missing-evidence behavior. Specific regression checks do not establish a general benchmark score.

## Actual search log

Round 1: “site.arxiv.org LongMemEval memory update abstention benchmark”; “site.arxiv.org LoCoMo long term conversational memory benchmark”; broad harness-memory query surfaced 2608.15008.
Round 2 full reads: the three sources above. Raw LoCoMo README tool error resolved by official GitHub rendered README lines 180 onward; abstract pages used for version/source locators.
Round 3: checked LongMemEval limitations, LoCoMo release subset notes, and task/backbone table in 2608.15008. No local reproduction of published performance numbers or transferred gain claim.
Depth: three primary works, >=5 findings, three rounds. Papers E1/E2 remain one independent source. Gaps: local longitudinal evidence and full benchmark run absent. Recent preprint evidence is weaker than replicated production findings.
