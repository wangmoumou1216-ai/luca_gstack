# Matt38 candidate rollback procedure

This is a precommit procedure, not a restore-success receipt. Native verification and adoption are PENDING.

## Authority and exact scope

Use FINAL-PLAN, the real H0 receipt, the historical M2 receipt and the new real M4 approval receipt under the external audit root. Htest and Hpublish remain separate gates.
The original plan records M0; the approved candidate base and restoration baseline is M4 `d6acaf21e89e4c662289c716f7dcd4d3102751e0`.
External scope/preimages are in preapproval/PATH-SCOPE.json and PREIMAGES.json. Exact per-effect controls and known postimages remain under A/control/<UID> and implementation receipts, outside the candidate tree.

## Candidate content before commit

End affected workers before restoration. Read current type/mode/bytes and compare each exact path with this task's known postimage.
Only an exact known postimage may receive its exact inverse patch and original mode/type. If current content is a third state, stop the affected phase and preserve peer/user changes.
Do not reset, stash, force, rewrite history, clean unrelated files, change project pins/aliases, or overwrite memory/learning records.

## Approved formal trial installation

Before any Htest write, the trusted operator binds actual candidate Git objects, M4 baseline, exact R/E paths, personal pre/postimages, sessions, source-guard/trust and command effects to a concrete approved scope.
Save actual preimage bytes; a SHA alone is not a backup. Preserve R main at M4 while the candidate is installed detached. E's separately approved permanent baseline fast-forward to M4 is retained after failure; never restore E to E0.
On failed or interrupted candidate trials, end the test sessions/broker first, normally switch R/E from the detached candidate back to the approved M4 baseline/main, and CAS-restore only the approved personal files whose current values equal the known candidate postimages.
An originally absent file may be removed only when its current bytes/type/mode exactly equal this task's known postimage. Third-state personal changes stop restoration. Preserve all other personal files and teach learning records.

## Source guard, trust and validation

Use the official install-codex-source-guard.mjs and codex-trust-hooks.mjs entry owners only within separately approved exact runtime scope.
Read back the actual restored source digest and normalized hook registration, preserve all other source/trust roots, and run a fresh native smoke after authorized restoration.
Do not replay whole default/Direct configuration files, modify private model bindings, bypass hooks, or report restoration success before the actual smoke evidence exists.

## Publication and external evidence

After publication, any reversal requires a separately approved normal revert; no force push or history rewrite.
Actual frozen-file, frozen-candidate, CI, native behavior, personal CAS, installation, restoration and publication receipts are written externally under A only after their respective effects occur.
This file embeds no future release commit, tree, complete inventory hash or success claim.

External audit root: `/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt`.
H0: `/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/preapproval/H0-APPROVAL.json`.
M2 delta: `/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/preapproval/M2-BASELINE-APPROVAL.json`.
Content receipt: `/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/implementation/U013/PRODUCTION-RECEIPT.json`.

## M4 当前恢复基线与历史保留

当前候选 parent 与未来获批测试后的恢复基线为 M4 `d6acaf21e89e4c662289c716f7dcd4d3102751e0`。历史 M2 `54ef203b4dd77e23564d0cba22f773346d30dfec` 的批准回执保持不变，本次新基线批准引用 `/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/preapproval/M4-baseline-alignment/v2/M4-APPROVAL-RECEIPT.json`；应用前外部 manifest 绑定实际回执 SHA。本次未执行或批准 R/E fast-forward、安装或恢复效果；实际安装、窗口与回滚仍在 Htest/Hpublish 精确范围里绑定。

保留旧候选分支、提交、PR 和失败检查。替代候选仅在原 W 建新分支，恢复源码只能覆盖仍等于本任务已知 postimage 的对象；任何第三态或再次基线变化均停止。M4 的 15 项源更新不得回写成旧字节。

M4 安装回滚必须使用官方 reviewed-file / reviewed-sha / expected-manifest-sha 合同，明确私有 snapshot 元数据与锁文件 CAS；不回放全局配置、不删除他人 snapshot、不把 lock 恢复当作本次已授权效果。
