#!/usr/bin/env python3
"""Task-only Git readback; --freeze saves the pre-publication dirty denominator."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PRIMARY = Path('/Users/luca/Desktop/luca_gstack')
SNAPSHOT = HERE / 'primary-dirty-snapshot.json'


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args])


def fingerprint(path):
    full = PRIMARY / path
    if full.is_symlink():
        working = b'symlink:' + os.fsencode(os.readlink(full))
    elif full.exists():
        working = full.read_bytes()
    else:
        working = b'absent'
    return {
        'path': path,
        'working_sha256': hashlib.sha256(working).hexdigest(),
        'index_entry': git(PRIMARY, 'ls-files', '--stage', '--', path).decode(),
    }


if sys.argv[1:] == ['--freeze']:
    paths = set()
    for argv in [('diff', '--name-only', '-z'), ('diff', '--cached', '--name-only', '-z'),
                 ('ls-files', '--others', '--exclude-standard', '-z')]:
        paths.update(x.decode() for x in git(PRIMARY, *argv).split(b'\0') if x)
    state = {'primary': str(PRIMARY.resolve()), 'baseline': git(PRIMARY, 'rev-parse', 'HEAD').decode().strip(),
             'dirty': [fingerprint(p) for p in sorted(paths)]}
    with SNAPSHOT.open('x') as file:
        json.dump(state, file, ensure_ascii=False, indent=2)
        file.write('\n')
    print(f'FROZEN {len(paths)} original dirty paths; no Git mutations')
elif sys.argv[1:]:
    raise SystemExit('usage: verify-publication.py [--freeze]')
else:
    state = json.loads(SNAPSHOT.read_text())
    assert state['primary'] == str(PRIMARY.resolve()), 'primary root drift'
    assert [fingerprint(r['path']) for r in state['dirty']] == state['dirty'], 'original user changes drifted'
    head = git(ROOT, 'rev-parse', 'HEAD').decode().strip()
    assert git(PRIMARY, 'rev-parse', 'HEAD').decode().strip() == head, 'primary HEAD differs'
    remote = git(ROOT, 'ls-remote', 'origin', 'refs/heads/main').decode().split()
    assert remote == [head, 'refs/heads/main'], 'remote main differs'
    print(f'PASS publication {head}; {len(state["dirty"])} original dirty paths preserved')
