from pathlib import Path
import datetime, hashlib, json, os, subprocess, sys, time

e = Path(__file__).resolve().parent
label = sys.argv[1]
root = e / ('old' if label.startswith('old') else 'candidate')
commands = {
    'old-red': ['node', 'scripts/test-route-guard.mjs'],
    'old-original': ['node', 'scripts/test-route-guard.mjs'],
    'candidate-routes': ['node', 'scripts/test-route-guard.mjs'],
    'candidate-parity': ['node', 'scripts/check-capability-parity.mjs'],
    'candidate-semantic': ['node', 'scripts/test-semantic-parity.mjs'],
    'candidate-reverse': ['git', 'apply', '--reverse', '--check', str(e / 'minimal.patch')],
    'old-forward': ['git', 'apply', '--check', str(e / 'minimal.patch')],
}
argv = commands[label]
env = dict(os.environ)
removed = ['NODE_OPTIONS', 'LUCA_CHILD_SOURCE_ROOT', 'LUCA_PROTECTED_CODE_ROOT',
    'LUCA_ACTUAL_HARNESS', 'LUCA_HARNESS_ADAPTED', 'CODEX_HOME', 'CODEX_SANDBOX',
    'CODEX_SESSION_ID', 'MUSE_HOST_LAUNCH_ID', 'MUSE_HOST_LAUNCH_HANDLE',
    'LUCA_PARITY_ROOT', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']
for field in removed:
    env.pop(field, None)
overrides = {'CLAUDE_PROJECT_DIR': str(root), 'LUCA_PROJECTS_ROOT': str(root / 'fixture-projects'),
             'MEMORY_ROOT': str(root / 'fixture-memory')}
env.update(overrides)
source = {p: hashlib.sha256((root / p).read_bytes()).hexdigest() for p in
    ['.claude/hooks/route-guard.mjs', 'scripts/test-route-guard.mjs', '.claude/skill-os/capability-parity.json']}
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
clock = time.monotonic()
r = subprocess.run(argv, cwd=root, env=env, text=True, capture_output=True, timeout=120)
elapsed = time.monotonic() - clock
(e / f'{label}.stdout').write_text(r.stdout)
(e / f'{label}.stderr').write_text(r.stderr)
receipt = {'argv': argv, 'cwd': str(root), 'env_overrides': overrides, 'env_removed': removed,
    'source_hashes': source, 'started_at': started,
    'ended_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'exit': r.returncode, 'elapsed_seconds': round(elapsed, 3),
    'stdout': str(e / f'{label}.stdout'), 'stderr': str(e / f'{label}.stderr')}
(e / f'{label}.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(receipt, ensure_ascii=False))
print('\n'.join(r.stdout.splitlines()[-6:]))
if r.returncode:
    print(r.stderr[-1700:])
sys.exit(r.returncode)
