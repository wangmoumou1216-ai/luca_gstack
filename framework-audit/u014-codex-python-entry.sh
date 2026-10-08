#!/bin/sh
# Task-local carrier of the verified interpreter setting. No global config write.
# Model invocation remains controlled by the driver and its frozen run manifest.
PATH="/opt/homebrew/Cellar/python@3.14/3.14.5/Frameworks/Python.framework/Versions/3.14/bin:$PATH"
export PATH
exec /Users/luca/.codex/packages/standalone/releases/0.160.0-aarch64-apple-darwin/bin/codex "$@" \
  -c 'shell_environment_policy.set.PYTHONEXECUTABLE="/opt/homebrew/Cellar/python@3.14/3.14.5/Frameworks/Python.framework/Versions/3.14/bin/python3.14"'
