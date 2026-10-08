from pathlib import Path
import json, hashlib

root = Path('/Users/luca/Desktop/luca_gstack')
out = root / 'framework-audit/2026-09-30-hook-health'
c = json.loads((root / '.codex/hooks.json').read_text())
exports = 'export LUCA_CHILD_SOURCE_ROOT="$(pwd -P)"; export NODE_OPTIONS="--import=$HOME/.codex/luca-child-project/source-guard/bootstrap.mjs"; '
verify = 'node "$(git rev-parse --show-toplevel)/.codex/hook-source-integrity.mjs" --verify'
failmsg = 'echo "[luca_gstack] hook source integrity mismatch" >&2; '
fallback = "printf '%s\\n' '{\"continue\":false,\"stopReason\":\"Hook recovery unavailable; turn stopped. Restore the protected installation before continuing.\"}'"
recovery = 'printf \'%s\' "$luca_stop_payload" | LUCA_CHILD_SOURCE_ROOT="$(pwd -P)" NODE_OPTIONS="--import=$HOME/.codex/luca-child-project/source-guard/bootstrap.mjs" node --input-type=module -e \'await import(process.env.LUCA_PROTECTED_CODE_ROOT + "/.codex/stop-integrity-failure.mjs")\' || ' + fallback
for event, groups in c['hooks'].items():
    for group in groups:
        for hook in group['hooks']:
            tail = hook['command'].split(exports, 1)[1]
            if event == 'Stop':
                tail = tail.removeprefix('luca_stop_payload=$(cat); ')
                hook['command'] = 'luca_stop_payload=$(cat); luca_hook_root=$(git rev-parse --show-toplevel) && [ -n "$luca_hook_root" ] && cd "$luca_hook_root" || { ' + fallback + '; exit 0; }; ' + exports + verify + ' || { ' + failmsg + recovery + '; exit 0; }; ' + tail
            else:
                hook['command'] = 'luca_hook_root=$(git rev-parse --show-toplevel) && [ -n "$luca_hook_root" ] && cd "$luca_hook_root" || exit 2; ' + exports + verify + ' || { ' + failmsg + 'exit 2; }; ' + tail
c['description'] = c['description'].replace('node scripts/codex-trust-hooks.mjs SessionEnd', 'node scripts/codex-trust-hooks.mjs --host-launch SessionEnd')
p = out / 'stable-hooks-r3.json'
p.write_text(json.dumps(c, ensure_ascii=False, indent=2) + '\n')
contract = hashlib.sha256(json.dumps(c['hooks'], sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
print(json.dumps({'artifact': str(p), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'protocol_sha256': contract, 'hooks': sum(len(g['hooks']) for groups in c['hooks'].values() for g in groups)}))
