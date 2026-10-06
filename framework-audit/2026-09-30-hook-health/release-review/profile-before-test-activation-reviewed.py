#!/usr/bin/env python3
"""Execute the real helper with memory-only I/O and controlled subprocess failures.

No activation, real writes, configuration reads or protected installation occurs.
"""
import argparse
import contextlib
import copy
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

AUDIT = Path(__file__).resolve().parents[1]
ROOT = AUDIT.parents[1]
HELPER = (AUDIT / 'activate-reviewed.py').read_text()
MANIFEST = json.loads((AUDIT / 'candidate-manifest.json').read_text())


def scenario(mutate=lambda _: None, failure=None, optimized=False, source=HELPER):
    data, writes, deletes, calls = {}, [], [], []
    manifest = copy.deepcopy(MANIFEST)
    manifest['release_review_status'] = 'PASS_CANDIDATE_ONLY_LIVE_PENDING'
    for name in ['candidate.patch', 'candidate.tar.gz', 'rollback.tar.gz']:
        data[str(AUDIT / name)] = (AUDIT / name).read_bytes()
    with tarfile.open(AUDIT / 'candidate.tar.gz') as archive:
        for row in manifest['files']:
            data[str(Path(manifest['candidate_root']) / row['path'])] = archive.extractfile(row['path']).read()
            if not row['new']:
                data[str(ROOT / row['path'])] = (ROOT / row['path']).read_bytes()
    mutate(manifest)
    data[str(AUDIT / 'candidate-manifest.json')] = json.dumps(manifest).encode()
    guard = Path.home() / '.codex/luca-child-project/source-guard'
    data[str(guard / 'manifest.json')] = b'{"roots":[]}'
    config = Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'config.toml'
    data[str(config)] = b'[hooks.state]\n'

    class MemoryPath:
        def __init__(self, value): self.path = str(value)
        def __str__(self): return self.path
        def __eq__(self, other): return self.path == str(other)
        def __truediv__(self, value): return MemoryPath(str(Path(self.path) / str(value)))
        @classmethod
        def home(cls): return cls(Path.home())
        def resolve(self): return self
        def as_uri(self): return Path(self.path).as_uri()
        def read_bytes(self): return data[self.path]
        def read_text(self): return self.read_bytes().decode()
        def write_bytes(self, value): writes.append(self.path); data[self.path] = value
        def write_text(self, value): self.write_bytes(value.encode())
        def chmod(self, _): pass
        def exists(self): return self.path in data
        def is_file(self): return self.exists()
        def is_symlink(self): return False
        def unlink(self): deletes.append(self.path); data.pop(self.path)
        def open(self, _): return io.BytesIO(self.read_bytes())

    def run(argv, **_):
        calls.append(argv)
        if argv[:2] == ['git', 'apply'] and '--check' not in argv:
            if failure == 'patch': return SimpleNamespace(returncode=1, stdout='', stderr='injected patch refusal')
            for row in MANIFEST['files']:
                data[str(ROOT / row['path'])] = data[str(Path(MANIFEST['candidate_root']) / row['path'])]
            return SimpleNamespace(returncode=0, stdout='', stderr='')
        if len(argv) > 1 and argv[1] == 'scripts/install-codex-source-guard.mjs':
            return SimpleNamespace(returncode=1, stdout='', stderr='injected installer refusal')
        if argv and argv[0] == 'node':
            stdout = json.dumps({'ok': True, 'registration': {'current_digest': MANIFEST['baseline_source_digest']}})
        else:
            stdout = ''
        return SimpleNamespace(returncode=0, stdout=stdout, stderr='')

    # tarfile needs a real, read-only filename; all mutations remain MemoryPath.
    real_tar_open = tarfile.open
    error = None
    with patch('pathlib.Path', MemoryPath), patch.object(subprocess, 'run', run), \
         patch.object(argparse.ArgumentParser, 'parse_args', return_value=SimpleNamespace(apply=True)), \
         patch.object(tarfile, 'open', side_effect=lambda path, *a, **k: real_tar_open(str(path), *a, **k)), \
         contextlib.redirect_stdout(io.StringIO()):
        try:
            exec(compile(source, 'activate-reviewed.py', 'exec', optimize=1 if optimized else 0), {})
        except Exception as exc:
            error = str(exc)
    return SimpleNamespace(error=error, writes=writes, deletes=deletes, calls=calls, data=data)


class ActivationFailureTests(unittest.TestCase):
    def test_malicious_target_and_new_metadata_refused_even_when_optimized(self):
        for optimized in [False, True]:
            for change in ['path', 'new', 'patch']:
                def mutate(m):
                    if change == 'path': m['files'][0]['path'] = 'unrelated/keep.md'
                    elif change == 'new': m['files'][1]['new'] = True
                    else: m['patch_sha256'] = 'a' * 64
                result = scenario(mutate, 'patch', optimized)
                self.assertIn('manifest core changed', result.error)
                self.assertEqual(result.calls, [])
                self.assertEqual(result.writes, [])
                self.assertEqual(result.deletes, [])

    def test_failed_patch_has_no_target_rollback(self):
        result = scenario(failure='patch', optimized=True)
        self.assertIn('activation-patch-apply failed', result.error)
        self.assertEqual(result.deletes, [])
        self.assertFalse(any(path.startswith(str(ROOT) + '/') and not path.startswith(str(AUDIT) + '/')
                             for path in result.writes))

    def test_successful_patch_then_failed_install_restores_exact_preimages(self):
        result = scenario(optimized=True)
        self.assertIn('activation-source-install failed', result.error)
        for row in MANIFEST['files']:
            path = str(ROOT / row['path'])
            if row['new']: self.assertNotIn(path, result.data)
            else: self.assertEqual(result.data[path], (ROOT / row['path']).read_bytes())
        self.assertEqual(set(result.deletes), {str(ROOT / row['path']) for row in MANIFEST['files'] if row['new']})


if __name__ == '__main__':
    unittest.main()
