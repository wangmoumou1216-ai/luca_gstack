# Payload census scratch workspace

This nested scratch repository exists only to load the capture-only Codex hook without loading the
production Luca hooks. The collector writes synthetic `UserPromptSubmit` inputs to `/private/tmp` and
prints nothing to stdout.
