# P6 v25 release preflight

Status before live dispatch: **PASS**.

Independent preflight bound candidate `ee07d89375185daa26a8599fc7aeb7a4a5cfd879d9e714de33c16c34310b4bfc`
and baseline `4faa8176b9029ecbe4ca207528fda6771b0ea467a890a39f6700e126d49360a7`
to evaluator `0ff638cea1e8a7fb7813a9221030c11d6790b30541823310d7c30c34bbf4eb55`,
scoring `7b9dfba8a6c9d1f6af0eeea968c057a313454c30137000d504ba8e872daa3534`,
and manifest `8a3c3024206ba676560a988746aa6b99bd8f5d4e422057c6113cbb56e3560cdd`.
Candidate and baseline `--describe` returned `RELEASE_BOUND`; the proposed 11 candidate cells were
unique and complete, single-trial, serial, zero-rerun, and fail-stop. Claude was pinned to
`claude-opus-4-6`; Codex stayed default with no invented model name. The old baseline rows and old
candidate F9 PASS were restricted to historical evidence.

The user later authorized only Codex F14 and, after its retained failure, Codex F13. The other nine
cells are USER_WAIVED. Their absence cannot be converted to PASS.
