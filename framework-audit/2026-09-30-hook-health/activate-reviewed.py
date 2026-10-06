#!/usr/bin/env python3
"""One reviewed maintenance batch. Default is read-only preflight.

The caller must establish human activation authority and a coordinated maintenance
window before --apply. This helper does not grant authority or lock other sessions.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tomllib
from datetime import datetime, timezone

ROOT = Path('/Users/luca/Desktop/luca_gstack')
AUDIT = ROOT / 'framework-audit/2026-09-30-hook-health'
PATCH_SHA = '3d90329de723ab5720769576e66f9a2c92ec0568a7920f8658a8da7ce8504729'
MANIFEST_CORE_SHA = 'a279e95e60e431856586d47b68c1c581d8732ee3f6ecf192c83d8c15ac85e6de'
CORE_KEYS = ('candidate_root', 'source_root', 'files', 'baseline_source_digest',
             'candidate_source_digest', 'patch_sha256', 'baseline_commit',
             'candidate_archive_sha256', 'rollback_archive_sha256', 'revision')
TARGET_PATHS = frozenset(('scripts/codex-hook-health.mjs', 'scripts/codex-trust-hooks.mjs',
    'scripts/test-codex-hook-health.mjs', 'scripts/test-codex-trust-hooks.mjs',
    'scripts/verify.sh', 'README.md', '.codex/hooks.json'))
GUARD = Path.home() / '.codex/luca-child-project/source-guard'
REVIEWED_CODEX_HOME = Path('/Users/luca/.codex')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply', action='store_true')
args = parser.parse_args()
manifest = json.loads((AUDIT / 'candidate-manifest.json').read_text())
candidate = Path(manifest['candidate_root'])
sha = lambda data: hashlib.sha256(data).hexdigest()

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

# This package activates only the reviewed mother-root/system-profile pair.
# A provider home has independent trust; inheriting one must never widen scope.
codex_home_text = os.environ.get('CODEX_HOME') or str(REVIEWED_CODEX_HOME)
require(codex_home_text == str(REVIEWED_CODEX_HOME),
        'Reviewed CODEX_HOME changed; use the exact reviewed directory')
codex_home = Path(codex_home_text)
require(codex_home.resolve() == codex_home,
        'Reviewed CODEX_HOME changed; review that root/profile pair separately')
config_path = codex_home / 'config.toml'

steps = []

def save(name, value):
    path = AUDIT / name
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    path.chmod(0o600)

def run(label, argv):
    result = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True, timeout=120)
    steps.append({'step': label, 'argv': argv, 'exit': result.returncode})
    if args.apply:
        (AUDIT / (label + '.log')).write_text(result.stdout + result.stderr)
        save('activation-progress.json', {'steps': steps})
    if result.returncode:
        detail = f'see {label}.log' if args.apply else (result.stdout + result.stderr)[-5000:]
        raise RuntimeError(f'{label} failed; {detail}')
    return result.stdout

def health(path):
    # Imports the frozen, reviewed read-only checker; never evaluates hooks.json.
    source = ('import {inspectHookHealth} from ' + json.dumps((candidate / 'scripts/codex-hook-health.mjs').as_uri())
              + ';const r=inspectHookHealth(' + json.dumps(str(ROOT))
              + ');console.log(JSON.stringify(r));process.exitCode=r.ok?0:1;')
    return json.loads(run(path, ['node', '--input-type=module', '-e', source]))

core = {key: manifest[key] for key in CORE_KEYS}
require(sha(json.dumps(core, sort_keys=True, separators=(',', ':')).encode()) == MANIFEST_CORE_SHA,
        'Reviewed activation manifest core changed')
require(ROOT.resolve() == ROOT and manifest['source_root'] == str(ROOT), 'Reviewed activation root changed')
require(manifest['patch_sha256'] == PATCH_SHA, 'Reviewed activation invariant failed at original line 53')
for name, key in [('candidate.patch', 'patch_sha256'), ('candidate.tar.gz', 'candidate_archive_sha256'),
                  ('rollback.tar.gz', 'rollback_archive_sha256')]:
    require(sha((AUDIT / name).read_bytes()) == manifest[key], name)
require(len(manifest['files']) == 7, 'Reviewed activation invariant failed at original line 57')
require({row['path'] for row in manifest['files']} == TARGET_PATHS, 'Reviewed target allowlist changed')
for row in manifest['files']:
    require(set(row) == {'path', 'before_sha256', 'after_sha256', 'new'}, 'Invalid target metadata')
    require(type(row['new']) is bool and row['new'] == (row['before_sha256'] is None),
            'New-file flag does not match reviewed preimage')
    live, reviewed = ROOT / row['path'], candidate / row['path']
    require(not live.is_symlink() and not reviewed.is_symlink(), row['path'])
    require((sha(live.read_bytes()) if live.exists() else None) == row['before_sha256'], row['path'])
    require(sha(reviewed.read_bytes()) == row['after_sha256'], row['path'])
with tarfile.open(AUDIT / 'rollback.tar.gz') as archive:
    old_files = {row['path']: archive.extractfile(row['path']).read()
                 for row in manifest['files'] if not row['new']}
for row in manifest['files']:
    if not row['new']:
        require(sha(old_files[row['path']]) == row['before_sha256'], 'Reviewed activation invariant failed at original line 68')
run('activation-patch-check', ['git', 'apply', '--check', str(AUDIT / 'candidate.patch')])
before_health = health('activation-health-before')
require(before_health['registration']['current_digest'] == manifest['baseline_source_digest'], 'Reviewed activation invariant failed at original line 71')
before_manifest_bytes = (GUARD / 'manifest.json').read_bytes()
before_manifest = json.loads(before_manifest_bytes)
if not args.apply:
    print(json.dumps({'status': 'PREFLIGHT_PASS_NO_MUTATION', 'files': 7,
        'source_root': str(ROOT), 'codex_home': str(codex_home),
        'trust_scope': 'THIS_ROOT_PROFILE_PAIR_ONLY', 'steps': steps}))
    raise SystemExit(0)
require(manifest.get('release_review_status') == 'PASS_CANDIDATE_ONLY_LIVE_PENDING',
        'The exact candidate has not passed release review')

# Re-read known native obligations at the mutation boundary. The coordinated
# dispatch pause is still required: an empty snapshot alone is not a lock.
window_source = '''
import {readActivation} from './scripts/model-route-host.mjs';
const ids = ['01a0f0fe-e6fa-7660-beb5-181b1a9b6444',
  '01a0f062-3813-7c52-9ad6-61aacf054d1c',
  '01a0ec5b-44d2-7042-a523-f634e1406260',
  '01a0f05f-e05c-7693-b844-326c9eb66b75'];
const rows = ids.map(root_session_id => {
  const s=readActivation({harness:'codex',root_session_id});
  if(!s) throw new Error('Missing native activation: '+root_session_id);
  return {root_session_id,activation_id:s.activation_id,critical_failure:s.critical_failure,
    pending_preparations:Object.values(s.preparations||{}).filter(x=>x.status==='pending').map(x=>x.preparation_id),
    pending_invocations:Object.values(s.invocations||{}).filter(x=>x.status==='pending').map(x=>({invocation_id:x.invocation_id,external_identity:x.external_identity}))};
});
console.log(JSON.stringify({observed_at:new Date().toISOString(),rows}));
process.exitCode=rows.some(x=>x.critical_failure||x.pending_preparations.length||x.pending_invocations.length)?1:0;
'''
run('activation-window-readback', ['node', '--input-type=module', '-e', window_source])

# Back up only the source manifest and exact target trust entries here. The
# official trust script privately backs up the full config and protects its CAS.
(AUDIT / 'source-manifest-before-activation.json').write_bytes(before_manifest_bytes)
(AUDIT / 'source-manifest-before-activation.json').chmod(0o600)
with config_path.open('rb') as config_file:
    config = tomllib.load(config_file)
state = config.get('hooks', {}).get('state', {})
prefix = str(ROOT / '.codex/hooks.json') + ':'
save('trust-targets-before-activation.json', {key: value for key, value in state.items() if key.startswith(prefix)})
installed = False
patch_applied = False
try:
    # All source writes and protected activation occur in this single approved
    # batch; later tool availability is not assumed during the transition.
    # Recheck target preimages at the actual write boundary, after window reads.
    for row in manifest['files']:
        path = ROOT / row['path']
        require(not path.is_symlink(), row['path'])
        require((sha(path.read_bytes()) if path.exists() else None) == row['before_sha256'], row['path'])
    run('activation-patch-apply', ['git', 'apply', str(AUDIT / 'candidate.patch')])
    patch_applied = True
    for row in manifest['files']:
        require(sha((ROOT / row['path']).read_bytes()) == row['after_sha256'], row['path'])
    require((GUARD / 'manifest.json').read_bytes() == before_manifest_bytes, 'concurrent manifest change')
    run('activation-source-install', ['node', 'scripts/install-codex-source-guard.mjs',
        '--root', str(ROOT), '--preserve-other-roots'])
    installed = True
    after_manifest = json.loads((GUARD / 'manifest.json').read_bytes())
    before_others = [row for row in before_manifest['roots'] if row['root'] != str(ROOT)]
    require(before_others == [row for row in after_manifest['roots'] if row['root'] != str(ROOT)], 'other root changed')
    for label, suffix in [('activation-trust-dry-run', ['--dry-run']),
                          ('activation-trust-apply', []), ('activation-trust-readback', ['--dry-run'])]:
        output = run(label, ['node', 'scripts/codex-trust-hooks.mjs', '--host-launch', *suffix])
        if label == 'activation-trust-readback':
            require('本仓精确条目 11 个（待授信 0）' in output, 'trust readback did not confirm 11/11')
    final = health('activation-health-after')
    require(final['registration']['current_digest'] == manifest['candidate_source_digest'], 'Reviewed activation invariant failed at original line 128')
    save('activation-result.json', {'status': 'ACTIVATED_TRUST_VERIFIED_LIVE_SESSION_PENDING',
        'activated_at': datetime.now(timezone.utc).isoformat(), 'patch_sha256': PATCH_SHA,
        'source_digest': manifest['candidate_source_digest'], 'files': 7, 'trusted_hooks': 11,
        'source_root': str(ROOT), 'codex_home': str(codex_home),
        'trust_scope': 'THIS_ROOT_PROFILE_PAIR_ONLY',
        'other_roots_preserved': len(before_others), 'manifest_sha256': sha((GUARD / 'manifest.json').read_bytes()),
        'steps': steps, 'live_session': 'UNVERIFIED'})
    print('ACTIVATED: source/install/11 exact trusts verified for ' + str(ROOT) + ' / '
          + str(codex_home) + '; existing live sessions still require verification.')
except Exception as error:
    # If installation committed before a later failure, preserve the new source:
    # restoring only the source would break the newly installed manifest.
    protected_changed = (GUARD / 'manifest.json').read_bytes() != before_manifest_bytes
    rollback = []
    if patch_applied and not installed and not protected_changed:
        for row in manifest['files']:
            path = ROOT / row['path']
            if path.is_file() and not path.is_symlink() and sha(path.read_bytes()) == row['after_sha256']:
                if row['new']:
                    path.unlink()
                else:
                    path.write_bytes(old_files[row['path']])
                rollback.append(row['path'])
    save('activation-result.json', {'status': 'FAILED_REQUIRES_REVIEW', 'error': str(error),
        'protected_manifest_changed': protected_changed, 'rolled_back_unchanged_candidate_files': rollback,
        'steps': steps})
    raise
