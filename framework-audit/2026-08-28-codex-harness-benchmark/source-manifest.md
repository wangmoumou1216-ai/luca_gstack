# Source Snapshot Manifest

Status: **EVIDENCE_MANIFEST**
Captured: **2026-08-28**
Scope: pure meta, NO_PIN

This manifest narrows reproducibility claims after redteam. The upstream repository is content-pinned. Official web guidance is time-variant; hashes record the downloaded Markdown twins seen on the access date but this benchmark does not redistribute complete pages. The local side is a current-worktree assessment, not a clean-commit reconstruction.

## 1. OpenAI repository snapshot

| Field | Value |
|---|---|
| Repository | https://github.com/openai/codex |
| Commit | 7d6f808b97e424da80271be8cc539e8c5437a229 |
| Commit URL | https://github.com/openai/codex/commit/7d6f808b97e424da80271be8cc539e8c5437a229 |
| Commit timestamp | 2026-08-28T06:18:20Z |
| Downloaded archive SHA-256 | cfc6c2ea55bf55b17b59333d6dce1517733c30943e8dfa135e2f1611674c09b4 |
| Execution posture | Source inspected only; no upstream code or test suite executed |

## 2. Official web-source snapshot hashes

All pages were accessed on 2026-08-28.

| Evidence ID | Canonical source | Downloaded Markdown SHA-256 |
|---|---|---|
| O-DOC-01 | https://learn.chatgpt.com/codex/open-source | 1bd29ea9f6d4148fb7a01d528f4985dc20ec25f109ac500b9f109a032afd399f |
| O-DOC-02 | https://learn.chatgpt.com/codex/agent-configuration/agents-md | 9d1f87a2d1cb55b4782b95abe710692b35b9659789c2db31a22c7074a3383e8e |
| O-DOC-03 | https://learn.chatgpt.com/codex/hooks | c1f1b2d78195fb6d382f9b9f32fe78d79025d6f0e1c65d87a1eece1693a78271 |
| O-DOC-04 | https://learn.chatgpt.com/codex/build-skills | d15791562748e64a53dfec534b8558aa522e732cec0fdedcf7257fa4ef486a20 |
| O-DOC-05 | https://learn.chatgpt.com/codex/agent-configuration/subagents | 578375343fcbb4bfac2121fbc2bc1ef9839b306c98e49e0472310ef6e179f5a6 |
| O-DOC-06 | https://learn.chatgpt.com/codex/agent-approvals-security | 58c06f5bdb41655f810d2c39c41f782fccd6d77508f709c601da5fe55ca18acd |
| O-DOC-07 | https://learn.chatgpt.com/codex/sandboxing | 32591067a44ac1a1f865cb3b903ba3b43478fee4a7759cb0733fdfd666fff257 |
| O-DOC-08 | https://learn.chatgpt.com/codex/agent-configuration/rules | 04c837d168686d94e4fce70cac20e40fa6e5a7bc07047938dc699edcd546d5d3 |
| O-DOC-09 | https://learn.chatgpt.com/codex/extend/mcp | c8241aaeece7a970751e14f9c864e972f8abacc09117e3f8b70f3932a0094f35 |
| O-DOC-10 | https://learn.chatgpt.com/codex/plugins | b49cbe16257c69064e39fb8f094dbef872ae304a0412602dc92a9f7f172a68a8 |
| O-DOC-11 | https://learn.chatgpt.com/codex/build-plugins | 48cda6c81fb1066d26ddeea6274c9dcd32cc79e9cd18528aa8182b99d18519e9 |
| O-DOC-12 | https://learn.chatgpt.com/codex/customization/memories | 7dd55f174448e6092c33e0d5532ebc11abf45abd305e74cbb1407ab8fe958217 |
| O-DOC-13 | https://learn.chatgpt.com/codex/sandboxing/auto-review | 3a6de6d1e8efcab25176e5d575dae8b66ec6d13e6c26bc534a1f625592e4e6d9 |
| O-DOC-14 | https://learn.chatgpt.com/codex/config-file/config-advanced | 6b2e6132e2eb0506231005c1d55f46fdd462e0d876de363ed3213b621756a751 |
| O-DOC-15 | https://learn.chatgpt.com/codex/app-server | ed260792a8d17ed2ff91caceccc80bb9d256dbc1289cd6bf088c44db538bc91f |
| O-DOC-16 | https://learn.chatgpt.com/codex/codex-sdk | c1742b8558d8a24d0a36e1a8016226329477011b10c24d23481c482341e89d63 |
| O-DOC-17 | https://learn.chatgpt.com/codex/non-interactive-mode | cd4a99999324ff8a1c73e08a767126cea7c5db0bc977adc5f44eee0285b41fd8 |
| O-DOC-18 | https://learn.chatgpt.com/codex/long-running-work | 14bba6e57c9bae8bf37b289ef369a4c59863c07f95037fe3d37143b14057246b |

## 3. Local baseline posture

| Field | Value |
|---|---|
| Repository HEAD at benchmark start | b438c92b1d1dbb28f5252396181f1cb9ab806900 |
| Start HEAD timestamp | 2026-08-28T14:17:31+08:00 |
| Repository HEAD at final sampling | 60dd0ce6f72da0a29200378aafe925b8b4144f32 |
| Final-sampling HEAD timestamp | 2026-08-28T15:54:14+08:00 |
| Worktree posture | Dirty before benchmark; existing changes preserved |
| Assessment truth | Time-stamped hashes for high-impact sources, not a complete immutable snapshot of every checker input |
| Product context | Excluded; NO_PIN maintained; no identity transaction invoked |

Pre-existing dirty paths relevant to the allowed meta boundary:

- .claude/observability/observations.jsonl — modified
- .claude/observability/rules.yaml — modified
- memory/evals/routing/fixtures.jsonl — modified
- framework-audit/2026-08-20-routing-steering-handshake/** — existing modified/untracked artifacts

The benchmark did not modify those paths. L-SRC-10 claims use the exact current rules file hash below and are therefore not reproducible from HEAD alone.

Concurrent meta changes appeared during the benchmark and were also not made by this benchmark: `handoff` skill/projection, AGENTS.md, CLAUDE.md, route/skill/model/input maps, viability registry, route guard, selected evolution logs and related checks. The `handoff` commit advanced HEAD to `60dd0ce` at 15:54:14+08:00. Final high-impact sampling below is timestamped `2026-08-28T15:59:54+0800` against that HEAD plus the disclosed dirty worktree; the route map and route guard changed after the earlier 15:49 sample, so their final hashes were refreshed rather than silently retaining stale values. No OpenAI/Codex benchmark entry was found in adoption-log, benchmark-registry or gaps-register at that sampling point.

## 4. High-impact local source hashes

| SHA-256 | Path |
|---|---|
| c08be0adab6a352b280ed8635d4633ea69531d00c88198e493544f88ab7c1c5f | AGENTS.md |
| c0e3344fd5654606b58a5c2e753aac60d74edf4ae20fbd4752747c06e4e7cc9e | CLAUDE.md |
| 05826d41e56f5af0d069620d6d5cff49d9e59425a60fc2961cd7629f65226b63 | .claude/skill-os/evolution/BENCHMARK-RUNBOOK.md |
| 8d0c2bb71d7a83a6f2618685f7880f2cd2a8eea02887ce3a5d6967b97c9c00fe | .claude/skill-os/evolution/CHECKPOINT.md |
| 78f47a91f2871eb7afea0e23ae0551677e534eeb703801a89c2e9aa021d8fb7d | .claude/skill-os/skill-routing-map.yaml |
| 21299833618d04e65f8ea939e0e78c6543341c21884c7fcff850142ac53fa3fc | .claude/skill-os/model-routing.yaml |
| 3b7d494cfcd9f0683073444e52d2e71fb0e30ca4fa6583336efce918c8a1c623 | .claude/skill-os/input-modes.yaml |
| e091f7d88745138c34350e385c8a66fe671a44555aec1f8b841e0abe45fdb793 | .claude/skill-os/optional-workflow-graph.yaml |
| 46ac3cf6254367d94a8228e6c1722e2fa055cbf5d2fa608b17ebf016f2157a60 | .codex/hooks.json |
| f871a3a84089ce68e9373b2c0e22278f2d9c68ad46ad14e4ed65469131b2dae6 | .codex/codex-hook-adapter.mjs |
| 94cbd3534392be5631ab7f87386a3ce26c65347b8a065e0eb7698863c384081a | .codex/config.toml |
| 01f15c7b7ee74a3cc9afe7d90b373ae076e0d55e768447a1fd690c0f37c0312a | .codex/workflow-runner.mjs |
| 41abdb2c5be223dca0cd87765ee0e6c9b4399bd28828484348a9a157f51116cc | .codex/agents/preflight-agent.toml |
| edd74c79ca7d0c20f6012ad19dde40820d7dafba7ab50d298a46a35f124697df | .codex/agents/quality-gate.toml |
| a4ee0515f85a9eb1e35c5bd5c3e004d7deae00d7d045dca4fd80a6b6e6445e04 | .codex/agents/muse-proto-judge.toml |
| 6af76edb39bb2b4c90342ea7518e92fc10ca12c3dfef18311d91c1973fc4afba | .claude/hooks/route-guard.mjs |
| a772f032dffa5cfbb530bd8015e810800f87ea958166484310cd4541160ce0b9 | .claude/hooks/project-scope-guard.mjs |
| d65dc4071687295bbf3ee3e4c9ba05e4e999f962e159fcd42e443c8e7214e3d2 | .claude/hooks/lib/harness.mjs |
| e6f54c1d762b1bb79c65feb1ecfd2bc8ab1c89f318d81091855fa625a072428d | .claude/hooks/lib/project-substrate.mjs |
| 914fa32e66ca41497f5a864018f18d3e4a1748bed83440f84e21d24cb9a002b3 | .claude/agents/quality-gate.md |
| 6ad2660f538f7a75ad7708779a8a9289523e0dbd4fde93f353df7a84412aec74 | .claude/observability/scripts/write_observation.py |
| 2dbd8495f77346f85e38abccd72dcc852cc89e9078b500c1a5d0c0704b95a0d6 | .github/workflows/ci.yml |
| baa18bd6ce394cd4299e50d71b441e13f30fdd332719033982008f3609ab5e59 | scripts/verify.sh |
| 5b682e8d293adeb9f11bccfbe6eac3141671ee2499fe7b95acb4f379d9683c66 | scripts/verify-codex-wiring.mjs |
| 41f1ad06edb3b8394e2c56d141ba142dcec354afe22c6f2353d65debef612156 | scripts/test-project-scope-guard.mjs |
| 7687e19177ac449635c43383f7fbbc70ba18b61d0c24cf8a278165c8e843037f | scripts/check-capability-parity.mjs |
| 089a40c11c35acba83be657dc6c439cf4652c5587c4de166d41c1b6ece5cb243 | scripts/check-codex-viability.mjs |
| 597335e7c7ed4ecb1bb886c605b0f2e953cfe679238c2b7e7fe021ecb4c7a993 | memory/README.md |
| 95f79b7893e9987333a3c0c44c24a5772468afcf44d582b0480e8860cf2312e7 | memory/scripts/search_memory.py |
| 736996403ab6ebdebbbc4a39952e43197b7d6886f75e1a310200a5dd23d8afe0 | memory/scripts/propose_semantic.py |
| ffb5ddc9267447f4dc7e19c6991b0b61aeb18ef6a645bc70e340c9db6791b27b | memory/scripts/consolidate_memory.py |
| db87c92b97f6945c54846297eba5e57d0e373eb5c3237ec4b9fc1a37e5a3d020 | .claude/observability/scripts/get_rules.py |
| dc3e4b2523a144a9467c5c77b9729d281acaa208c33270ac596c2a0a273fe6e1 | .claude/observability/rules.yaml |
| 749786e35834227a1348b2b282b9a4da5e621028e4c0ea4e376f6d3481145f08 | .claude/skill-os/codex-viability.yaml |
| 41f867ee82e5f4cc80e8f1095992e70055382be94e429e3df5b82fc4c90a067b | .claude/skills/office/handoff/SKILL.md |

## 5. Reproduction limits

- Full upstream tests were not run; test-file counts establish breadth only.
- The local static verifier reported PASS=18, FAIL=0, BLOCKED=1 for its intentionally skipped live segment. An explicitly authorized read-only full probe outside the outer sandbox then reported PASS=21, FAIL=0, BLOCKED=0. The earlier attempt inside the outer sandbox failed during nested app-server initialization with `Operation not permitted`, before hook loading; the successful full probe remains branch-bounded rather than proof of every event/failure path. Its stdout was observed in-session but not persisted, so this artifact set cannot independently replay that receipt.
- `test-project-scope-guard.mjs` reported PASS=88, FAIL=0, but source-inspected fallback, negation and broader tool/command cases are outside those assertions.
- Final route counterexample on the refreshed `route-guard.mjs` hash: piping `{"prompt":"这是 luca_gstack 的框架任务，不是下游产品项目任务，保持 NO_PIN，不要触发 Project Gate。执行 framework-evolution Mode 2，深度调研 Codex harness。"}` to `ROUTE_GUARD_DRY_RUN=1 node .claude/hooks/route-guard.mjs --dry-run` returned `decision: NEEDS_CONTEXT` with both framework and downstream lexical signals. Dry-run performed no project transaction.
- Viability was time-variant in this dirty/concurrently changing worktree: initial inventory lane PASS=33/FAIL=0 before `handoff`; interim 2026-08-28T15:44:25+0800 PASS=32/FAIL=1 when `handoff` lacked a registry entry; final verification after a concurrent registry update PASS=34/FAIL=0 across 32 skills. This benchmark performed none of those source/registry changes and records all three observations rather than presenting one as an immutable run. Full stdout was not retained, so the timeline is an observed, hash-bounded research record rather than a replayable receipt bundle.
- The local skill projection includes symlinks and one real MagicPath directory. Source files establish that MagicPath is intentional delegation; filesystem/anchor checks alone do not validate that reason.
- Official web guidance may change after the access date. Pinned source controls implementation claims for the assessed commit when public guidance and code differ.

<!-- FILE_END: source-manifest.md -->
