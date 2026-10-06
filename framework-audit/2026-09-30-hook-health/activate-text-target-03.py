#!/usr/bin/env python3
"""Reviewed single-use activation batch; default preflight never mutates.

--apply requires existing repair authority and an explicit human reload decision.
This program neither grants that authority nor pauses other sessions.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
from datetime import datetime, timezone

ROOT = Path('/Users/luca/Desktop/luca_gstack')
CANDIDATE = Path('/Users/luca/.codex/worktrees/hook-text-data/luca_gstack')
AUDIT = ROOT / 'framework-audit/2026-09-30-hook-health'
BASE = '1ea5d2364cb2b706e8183b3a51ea079b6a1c71da'
TARGET = '54ef203b4dd77e23564d0cba22f773346d30dfec'
BEFORE_DIGEST = 'e2ca1945db477cc2f1cf073c80e34c8cb58c4f25d9ac2fb5a1d48d0982f59691'
AFTER_DIGEST = '1981bc83163ea3d56d83e51defbdb247184c075691f8542659bbb165b8e90469'
BEFORE_MANIFEST = 'c5d6fb2fd710993e175e942e18e41795fe93bd824182d4f9800abc8fee4b6c0b'
FILES = ('.claude/hooks/project-scope-guard.mjs', 'scripts/test-project-scope-guard.mjs',
         '.codex/hooks.json', 'README.md', 'scripts/test-project-gate-v34-mutations.mjs')
HOMES = ('/Users/luca/.codex', '/Users/luca/.luca/codex/aihub-direct', '/Users/luca/.codex-aihub-test')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply', action='store_true')
args = parser.parse_args()
steps = []
sha = lambda value: hashlib.sha256(value).hexdigest()

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def run(label, argv, home=None):
    env = os.environ.copy()
    if home:
        env['CODEX_HOME'] = home
    result = subprocess.run(argv, cwd=ROOT, env=env, capture_output=True, text=True, timeout=120)
    steps.append({'step': label, 'exit': result.returncode, 'codex_home': home})
    if args.apply:
        path = AUDIT / (label + '.log')
        path.write_text(result.stdout + result.stderr)
        path.chmod(0o600)
    require(result.returncode == 0, label + ' failed')
    return result.stdout

def health(label, root, source_only=False):
    code = 'import {inspectHookHealth} from ' + json.dumps((ROOT / 'scripts/codex-hook-health.mjs').as_uri())
    code += ';const r=inspectHookHealth(' + json.dumps(str(root)) + ',{sourceOnly:' + str(source_only).lower() + '});console.log(JSON.stringify(r));process.exitCode=r.ok?0:1;'
    return json.loads(run(label, ['node', '--input-type=module', '-e', code]))

def record(value, initial=False):
    path = AUDIT / 'text-target-activation-result.json'
    mode = 'x' if initial else 'w'
    with path.open(mode) as output:
        output.write(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
        output.flush()
        os.fsync(output.fileno())
    path.chmod(0o600)
    descriptor = os.open(AUDIT, os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)

require(ROOT.resolve() == ROOT and CANDIDATE.resolve() == CANDIDATE, 'root identity changed')
require(run('text-preflight-head', ['git', 'rev-parse', 'HEAD']).strip() == BASE, 'mother HEAD changed')
require(run('text-preflight-branch', ['git', 'branch', '--show-current']).strip() == 'main', 'mother branch changed')
require(not run('text-preflight-index', ['git', 'diff', '--cached', '--name-only']).strip(), 'mother index has user changes')
require(subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=CANDIDATE, text=True).strip() == TARGET, 'candidate commit changed')
scope = json.loads((AUDIT / 'followup-review/SCOPE-03.json').read_text())
require(scope['base'] == BASE and scope['source_digest'] == AFTER_DIGEST
        and {item['relative'] for item in scope['files']} == set(FILES), 'source scope changed')
patch = subprocess.check_output(['git', 'diff', '--no-ext-diff', BASE, TARGET, '--', *FILES], cwd=ROOT)
require(sha(patch) == scope['diff_sha256'], 'reviewed patch changed')
for item in scope['files']:
    live = ROOT / item['relative']
    require(live.is_file() and not live.is_symlink(), 'unsafe source target')
    old = subprocess.check_output(['git', 'show', BASE + ':' + item['relative']], cwd=ROOT)
    require(live.read_bytes() == old, 'source preimage changed: ' + item['relative'])
    require(sha((CANDIDATE / item['relative']).read_bytes()) == item['sha256'], 'candidate bytes changed')
for name, run_id in [('standards-03.json', 'hook-text-standards-1981bc83-20260930-03'),
                     ('spec-03.json', 'hook-text-spec-1981bc83-20260930-03')]:
    review = json.loads((AUDIT / 'followup-review' / name).read_text())
    require(review['eval_run_id'] == run_id and review['verdict']['status'] == 'PASS', 'source review not closed')
before = health('text-health-before', ROOT)
require(before['registration']['current_digest'] == BEFORE_DIGEST
        and before['installation']['manifest_sha256'] == BEFORE_MANIFEST, 'protected preimage changed')
require(health('text-candidate-source-health', CANDIDATE, True)['registration']['current_digest'] == AFTER_DIGEST, 'candidate digest changed')
require(json.loads(run('text-controlled-state', ['node', 'scripts/controlled-change.mjs', 'inspect', '--repo', str(ROOT)]))['kind'] == 'inactive', 'controlled change is active')
for index, home in enumerate(HOMES):
    require(Path(home).resolve() == Path(home), 'profile home changed')
    output = run('text-trust-before-' + str(index), ['node', 'scripts/codex-trust-hooks.mjs', '--host-launch', '--dry-run'], home)
    require('本仓精确条目 11 个（待授信 0）' in output, 'baseline profile trust changed')
if not args.apply:
    print(json.dumps({'status': 'PREFLIGHT_PASS_NO_MUTATION', 'target_commit': TARGET,
        'files': len(FILES), 'profile_homes': HOMES, 'reload_decision': 'NOT_ESTABLISHED_BY_PREFLIGHT'}))
    raise SystemExit(0)
window = json.loads((AUDIT / 'text-target-maintenance-window.json').read_text())
require(window.get('status') == 'HUMAN_WAIVED_OTHER_THREAD_COORDINATION' and window.get('target_commit') == TARGET
        and window.get('source_root') == str(ROOT), 'explicit human reload decision missing')
require(json.loads(run('text-controlled-state-boundary', ['node', 'scripts/controlled-change.mjs', 'inspect', '--repo', str(ROOT)]))['kind'] == 'inactive', 'controlled change became active')
record({'status': 'PREPARED', 'target_commit': TARGET, 'files': FILES, 'homes': HOMES,
        'window': window, 'at': datetime.now(timezone.utc).isoformat()}, initial=True)
try:
    run('text-main-fast-forward', ['git', 'merge', '--ff-only', TARGET])
    run('text-source-install', ['node', 'scripts/install-codex-source-guard.mjs', '--root', str(ROOT), '--preserve-other-roots'])
    for index, home in enumerate(HOMES):
        run('text-trust-apply-' + str(index), ['node', 'scripts/codex-trust-hooks.mjs', '--host-launch'], home)
        output = run('text-trust-readback-' + str(index), ['node', 'scripts/codex-trust-hooks.mjs', '--host-launch', '--dry-run'], home)
        require('本仓精确条目 11 个（待授信 0）' in output, 'final profile trust incomplete')
    final = health('text-health-after', ROOT)
    require(final['registration']['current_digest'] == AFTER_DIGEST, 'final digest changed')
    code = "import {verifyHostHooks} from '/Users/luca/Desktop/项目/muse/app/host-hook-ready.js';const root=" + json.dumps(str(ROOT)) + ";for(const home of " + json.dumps(HOMES) + "){await verifyHostHooks({hooksPath:root+'/.codex/hooks.json',binary:'/Users/luca/.local/bin/codex',codexHome:home,gstackRoot:root});}console.log('PASS three profile host gates');"
    run('text-three-profile-host-readback', ['node', '--input-type=module', '-e', code])
    record({'status': 'ACTIVATED_SOURCE_INSTALL_AND_THREE_PROFILE_TRUST_VERIFIED_LIVE_RELOAD_PENDING',
        'target_commit': TARGET, 'source_digest': AFTER_DIGEST, 'profile_homes': HOMES,
        'steps': steps, 'live_session': 'UNVERIFIED; existing sessions must reload registered commands',
        'gui': 'UNVERIFIED', 'at': datetime.now(timezone.utc).isoformat()})
    print('Activated reviewed commit/install/three profile trusts; existing sessions still require reload verification.')
except Exception as error:
    record({'status': 'FAILED_REQUIRES_REVIEW', 'error': str(error), 'target_commit': TARGET,
        'steps': steps, 'recovery': 'Do not rerun or rewrite Git history. Inspect source/install/profile readbacks and resume only the proven unfinished phase through its official API.'})
    raise
