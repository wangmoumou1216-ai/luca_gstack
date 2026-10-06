#!/bin/sh
# Isolated evaluation process only; never writes global settings.
PATH=/opt/homebrew/Cellar/python@3.14/3.14.5/Frameworks/Python.framework/Versions/3.14/bin:"$PATH"
export PATH
exec /Users/luca/.codex/packages/standalone/releases/0.160.0-aarch64-apple-darwin/bin/codex "$@" -c 'shell_environment_policy.set.PYTHONEXECUTABLE="/opt/homebrew/Cellar/python@3.14/3.14.5/Frameworks/Python.framework/Versions/3.14/bin/python3.14"' -c mcp_servers.context7.enabled=false -c 'mcp_servers.cua_repl={command="/usr/bin/false",enabled=false}' -c 'mcp_servers.node_repl={command="/usr/bin/false",enabled=false}' -c 'mcp_servers.pencil={command="/usr/bin/false",enabled=false}' -c 'mcp_servers.shadcn={command="/usr/bin/false",enabled=false}'
