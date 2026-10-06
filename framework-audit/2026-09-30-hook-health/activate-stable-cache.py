#!/usr/bin/env python3
"""Reviewed one-shot App/source activation; default performs read-only preflight."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import stat
import struct
import subprocess

ROOT = Path('/Users/luca/Desktop/luca_gstack')
CANDIDATE = Path('/Users/luca/.codex/worktrees/hook-text-data/luca_gstack')
APP_ROOT = Path('/Users/luca/Desktop/项目/muse')
AUDIT = ROOT / 'framework-audit/2026-09-30-hook-health'
CONTROLLER = AUDIT / 'activate-stable-cache.py'
PREPARE_HELPER = AUDIT / 'prepare-cache-app-bundle.mjs.txt'
APP_INSTALLER = AUDIT / 'install-stable-app.mjs.txt'
APP_PACKAGE = AUDIT / 'stable-app-package-receipt.json'
INSTALLED_APP_PROOF = AUDIT / 'stable-app-already-installed.json'
INSTALLED_APP = Path('/Applications/luca.app')
CODE_REVIEW = AUDIT / 'stable-install-review-final2.json'
CODE_REVIEW_SHA = 'd42a7983e364cf07cda45f792428c149eb60f25cf4e2e54a0a8c40d0f6374181'
DEPLOY_REVIEW = AUDIT / 'stable-install-review-final3.json'
DEPLOY_DELTA = AUDIT / 'deployment-snapshot-delta.json'
LOCAL_APPROVAL = AUDIT / 'stable-local-release-gate-01.json'
CI_ENVIRONMENT = AUDIT / 'CI-SHELL-DEPENDENCY-RESUME-01.json'
CI_POSTIMAGE = AUDIT / 'ci-shell-workflow-resume01.yml.txt'
CI_RELATIVE = '.github/workflows/ci.yml'
CI_SOURCE_COMMIT = '689444174a9a32b1a3fcf92e492cf446e284e4b0'
SCOPE_02 = AUDIT / 'CACHE-FINAL-SCOPE-02.json'
SCOPE_02_SHA = '1eff6622a143d5f94ccbe8babaf2211a457d6d332d4e28e6d98b973e0f8bdd97'
CI_INSERTION_ANCHOR = b'        run: pip install pyyaml\n'
CI_INSERTION = (b'      - name: Install zsh for three-shell Hook regression\n'
                b'        run: |\n'
                b'          sudo apt-get update\n'
                b'          sudo apt-get install -y zsh\n'
                b'          test -x /bin/zsh\n')
PRESERVED_REPORT = '.claude/skill-os/evolution/report-2026-06.html'
PRESERVED_REPORT_SHA = '945644b3d649c43ea950e7325a72c408741521dc3f4c4b49ecc3ddb27643a23f'
PRESERVED_REPORT_BYTES = 14960
GUARD = Path('/Users/luca/.codex/luca-child-project/source-guard')
RECEIPT = AUDIT / 'stable-cache-activation-result.json'
HOMES = ['/Users/luca/.codex', '/Users/luca/.codex-aihub-test', '/Users/luca/.luca/codex/aihub-direct']
BASE = '54ef203b4dd77e23564d0cba22f773346d30dfec'
APP_BASE = '0f63d4edb2c3df7096e12c6ccd6f1e7114975f8e'
APP_BRANCH = 'refactor/claude-code-kernel'
GH_REPO = 'wangmoumou1216-ai/luca_gstack'
FRAMEWORK_ORIGIN = 'https://github.com/wangmoumou1216-ai/luca_gstack.git'
APP_ORIGIN = 'https://github.com/wangmoumou1216-ai/muse.git'
FILES = {'.claude/skill-os/runtime/project-session.md', '.codex/hooks.json', '.codex/hook-source-integrity.mjs',
         'README.md', 'scripts/codex-hook-health.mjs', 'scripts/install-codex-source-guard.mjs',
         'scripts/source-guard-review.mjs', 'scripts/source-guard-test-fixture.mjs',
         'scripts/test-codex-child-hook-integrity.mjs', 'scripts/test-codex-hook-health.mjs',
         'scripts/test-codex-trust-hooks.mjs', 'scripts/test-controlled-change.mjs',
         'scripts/test-hook-source-digests.mjs', 'scripts/test-prompt-attestation.mjs', 'scripts/test-source-guard-preserve.mjs'}
APP_FILES = {'app/host-hook-ready.js', 'app/test-host-hook-ready.mjs'}
SOURCE_DIRS = ('.codex', '.claude/hooks', 'scripts', 'memory/scripts')
SNAPSHOT_DIRS = ('memory/scripts', '.claude/skill-os', '.claude/skills/office', '.claude/agents')
SNAPSHOT_EXTRA = ('.codex/stop-integrity-failure.mjs', '.claude/hooks/lib/project-substrate.mjs',
                  '.claude/hooks/lib/event-attestation.mjs', '.claude/hooks/lib/project-selection.mjs',
                  '.claude/hooks/lib/project-event-closure.mjs')
sha = lambda value: hashlib.sha256(value).hexdigest()


def require(value, message):
    if not value:
        raise RuntimeError(message)


def digest(value):
    return isinstance(value, str) and re.fullmatch(r'[a-f0-9]{64}', value) is not None


def commit(value):
    return isinstance(value, str) and re.fullmatch(r'[a-f0-9]{40}', value) is not None


def text(value):
    return isinstance(value, str) and 0 < len(value) <= 4096 and '\0' not in value


def exact(value, fields):
    return isinstance(value, dict) and set(value) == set(fields)


def regular_bytes(path, private=False, limit=64 * 1024 * 1024):
    path = Path(path)
    require(path.is_absolute() and path.resolve(strict=True) == path, 'noncanonical evidence path')
    before = path.lstat()
    require(stat.S_ISREG(before.st_mode) and not path.is_symlink() and before.st_size <= limit,
            'unsafe evidence file: ' + str(path))
    if private:
        require(before.st_uid == os.getuid() and before.st_mode & 0o077 == 0, 'untrusted private evidence')
    fd = os.open(path, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
    try:
        opened = os.fstat(fd)
        require(stat.S_ISREG(opened.st_mode) and (opened.st_dev, opened.st_ino) == (before.st_dev, before.st_ino),
                'evidence changed while opening')
        if private:
            require(opened.st_uid == os.getuid() and opened.st_mode & 0o077 == 0, 'untrusted opened evidence')
        with os.fdopen(fd, 'rb', closefd=False) as source:
            value = source.read(limit + 1)
        after, named = os.fstat(fd), path.lstat()
        require(len(value) <= limit and len(value) == opened.st_size
                and (after.st_size, after.st_mtime_ns) == (opened.st_size, opened.st_mtime_ns)
                and (named.st_dev, named.st_ino) == (opened.st_dev, opened.st_ino), 'evidence changed while reading')
        return value
    finally:
        os.close(fd)


def frozen_bytes(reference, fixed=None):
    require(exact(reference, ['path', 'sha256']) and text(reference['path']) and digest(reference['sha256']),
            'invalid frozen evidence reference')
    path = Path(reference['path'])
    require(path.parent == AUDIT and (fixed is None or path == fixed), 'evidence outside fixed audit path')
    value = regular_bytes(path)
    require(sha(value) == reference['sha256'], 'frozen evidence changed: ' + path.name)
    return value


def frozen(reference, fixed=None):
    return json.loads(frozen_bytes(reference, fixed))


class Execution:
    def __init__(self):
        self.steps = []
        self.executed = set()
        self.logging_enabled = False

    def run(self, label, argv, cwd=ROOT, home=None, input_text=None, binary=False):
        require(isinstance(label, str) and re.fullmatch(r'[a-z0-9-]+', label) and label not in self.executed,
                'step repeated or invalid: ' + str(label))
        require(isinstance(argv, list) and argv and all(text(part) for part in argv), 'invalid command argv')
        require(input_text is None or isinstance(input_text, str), 'input_text must be original decoded helper bytes')
        require(not binary or input_text is None, 'binary read cannot execute helper stdin')
        self.executed.add(label)
        env = dict(os.environ)
        if home is not None:
            require(home in HOMES, 'profile outside fixed homes')
            env['CODEX_HOME'] = home
        # No log is opened until the durable PREPARED receipt exists.
        log_fd = None
        if self.logging_enabled:
            log_fd = os.open(AUDIT / ('stable-' + label + '.log'),
                             os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0), 0o600)
        result, failure = None, None
        try:
            result = subprocess.run(argv, cwd=cwd, env=env, input=input_text, text=not binary,
                                    capture_output=True, timeout=120)
            self.steps.append({'step': label, 'exit': result.returncode, 'home': home})
            require(result.returncode == 0, label + ' failed')
            return result.stdout
        except Exception as error:
            failure = str(error)
            if result is None:
                self.steps.append({'step': label, 'exit': None, 'home': home, 'error': failure})
            raise
        finally:
            if log_fd is not None:
                try:
                    if result is None:
                        output = json.dumps({'error': failure}) + '\n'
                    elif binary:
                        output = json.dumps({'stdout_sha256': sha(result.stdout),
                                             'stderr': result.stderr.decode('utf-8', errors='replace')}) + '\n'
                    else:
                        output = result.stdout + result.stderr
                    with os.fdopen(log_fd, 'w', closefd=False) as log:
                        log.write(output)
                        log.flush()
                        os.fsync(log.fileno())
                finally:
                    os.close(log_fd)


def durable_record(value, initial=False):
    temporary = RECEIPT.with_name(RECEIPT.name + '.tmp')
    if initial:
        require(not os.path.lexists(RECEIPT), 'activation already attempted; inspect durable receipt')
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0), 0o600)
    try:
        with os.fdopen(fd, 'w', closefd=False) as output:
            output.write(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
            output.flush()
            os.fsync(output.fileno())
    finally:
        os.close(fd)
    if initial:
        # Publish without replacing another controller's PREPARED receipt.
        os.link(temporary, RECEIPT, follow_symlinks=False)
        temporary.unlink()
    else:
        require(RECEIPT.is_file() and not RECEIPT.is_symlink(), 'durable receipt identity changed')
        os.replace(temporary, RECEIPT)
    fd = os.open(AUDIT, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def validate_release(release):
    require(isinstance(release, dict) and type(release.get('schema_version')) is int
            and release['schema_version'] in (1, 2, 3)
            and release.get('kind') == 'luca-stable-cache-activation', 'wrong release schema')
    app_fields = (['app_package', 'prepare_helper', 'app_installer'] if release['schema_version'] == 1
                  else ['app_mode', 'installed_app'])
    ci_fields = ['ci_environment'] if release['schema_version'] == 3 else []
    require(exact(release, ['schema_version', 'kind', 'controller_sha256', 'target_commit', 'scope',
                           'install_review', 'code_install_review', 'deployment_snapshot_delta',
                           'reviews', 'publication', 'app_publication', 'expected_manifest_sha256',
                           'root_session_id', 'activation_id', *app_fields, *ci_fields]), 'wrong release fields')
    if release['schema_version'] in (2, 3):
        require(release['app_mode'] == 'already-installed', 'wrong App fulfillment mode')
    if release['schema_version'] == 3:
        require(release['scope'] == {'path': str(SCOPE_02), 'sha256': SCOPE_02_SHA}, 'original scope02 binding changed')
    require(digest(release['controller_sha256']) and commit(release['target_commit'])
            and digest(release['expected_manifest_sha256']) and text(release['root_session_id'])
            and text(release['activation_id']), 'invalid release scalar types')
    require(exact(release['reviews'], ['standards', 'spec']), 'wrong review axes')
    for ticket in release['reviews'].values():
        validate_ticket(ticket)
    for name in ['invocation_id', 'agent_id', 'eval_run_id', 'path']:
        require(release['reviews']['standards'][name] != release['reviews']['spec'][name], 'review axes are not independent')
    publication = release['publication']
    require(exact(publication, ['target_commit', 'branch', 'remote_sha', 'run_id', 'ci_run'])
            and publication['target_commit'] == release['target_commit'] and publication['branch'] == 'main'
            and publication['remote_sha'] == release['target_commit'] and type(publication['run_id']) is int
            and publication['run_id'] > 0, 'invalid source publication binding')
    app = release['app_publication']
    require(exact(app, ['target_commit', 'branch', 'remote_sha', 'local_head'])
            and commit(app['target_commit']) and app['branch'] == APP_BRANCH
            and app['target_commit'] == app['remote_sha'] == app['local_head'], 'invalid App publication binding')
    for name in ['scope', 'install_review', 'code_install_review', 'deployment_snapshot_delta',
                 *[name for name in app_fields if name != 'app_mode'], *ci_fields]:
        reference = release[name]
        require(exact(reference, ['path', 'sha256']) and text(reference['path']) and digest(reference['sha256']),
                'invalid release evidence: ' + name)
    require(exact(publication['ci_run'], ['path', 'sha256']) and text(publication['ci_run']['path'])
            and digest(publication['ci_run']['sha256']), 'invalid CI evidence reference')
    if release['schema_version'] == 3:
        require(release['ci_environment']['path'] == str(CI_ENVIRONMENT), 'CI environment manifest path changed')


def validate_ticket(ticket):
    require(exact(ticket, ['path', 'sha256', 'eval_run_id', 'invocation_id', 'agent_id', 'evidence_ref'])
            and digest(ticket['sha256']) and all(text(ticket[name]) for name in ticket if name != 'sha256'),
            'invalid native review ticket')


def validate_scope(scope, release):
    require(exact(scope, ['schema_version', 'kind', 'sets', 'plan', 'hooks', 'install_review', 'pending_live'])
            and type(scope['schema_version']) is int and scope['schema_version'] == 1
            and scope['kind'] == 'hook-cache-final-file-set' and isinstance(scope['sets'], list)
            and len(scope['sets']) == 2, 'wrong source scope')
    for source_set, root, base, expected in zip(scope['sets'], [CANDIDATE, APP_ROOT], [BASE, APP_BASE], [FILES, APP_FILES]):
        require(exact(source_set, ['root', 'base', 'files', 'diff_sha256']) and source_set['root'] == str(root)
                and source_set['base'] == base and digest(source_set['diff_sha256'])
                and isinstance(source_set['files'], list) and len(source_set['files']) == len(expected), 'scope baseline changed')
        seen = set()
        for item in source_set['files']:
            require(exact(item, ['path', 'relative', 'sha256', 'bytes', 'tracked']) and item['relative'] in expected
                    and item['relative'] not in seen and item['path'] == str(root / item['relative'])
                    and digest(item['sha256']) and type(item['bytes']) is int and item['bytes'] >= 0
                    and type(item['tracked']) is bool, 'scope file set or type widened')
            seen.add(item['relative'])
        require(seen == expected, 'scope file set widened')
    require(scope['install_review'] == release['code_install_review'], 'code approval differs from source review')
    for name in ['plan', 'hooks', 'install_review']:
        frozen_bytes(scope[name])
    require(isinstance(scope['pending_live'], list) and all(text(item) for item in scope['pending_live']), 'invalid pending live evidence')


def ci_environment_binding(release):
    environment = frozen(release['ci_environment'], CI_ENVIRONMENT)
    require(exact(environment, ['schema_version', 'kind', 'source_commit', 'target_commit', 'relative',
                                'preimage_sha256', 'postimage_sha256', 'postimage_bytes', 'patch_sha256', 'postimage'])
            and type(environment['schema_version']) is int and environment['schema_version'] == 1
            and environment['kind'] == 'luca-ci-shell-dependency-change'
            and environment['source_commit'] == CI_SOURCE_COMMIT and commit(environment['target_commit'])
            and environment['target_commit'] == release['target_commit'] and environment['relative'] == CI_RELATIVE
            and all(digest(environment[name]) for name in ['preimage_sha256', 'postimage_sha256', 'patch_sha256'])
            and type(environment['postimage_bytes']) is int and environment['postimage_bytes'] > 0
            and environment['postimage'] == {'path': str(CI_POSTIMAGE), 'sha256': environment['postimage_sha256']},
            'invalid fixed CI environment manifest')
    postimage = frozen_bytes(environment['postimage'], CI_POSTIMAGE)
    require(len(postimage) == environment['postimage_bytes'], 'CI artifact postimage size changed')
    return environment


def verify_ci_environment(execution, environment, target, label):
    require(environment['source_commit'] == CI_SOURCE_COMMIT and environment['target_commit'] == target
            and environment['relative'] == CI_RELATIVE, 'CI environment commit binding changed')
    for suffix, revision in [('base', BASE), ('source', CI_SOURCE_COMMIT), ('target', target)]:
        entry = execution.run(label + '-mode-' + suffix, ['git', 'ls-tree', revision, '--', CI_RELATIVE], CANDIDATE).split()
        require(len(entry) == 4 and entry[:2] == ['100644', 'blob'] and commit(entry[2]) and entry[3] == CI_RELATIVE,
                'CI workflow must remain a regular nonexecutable Git blob')
    postimage = frozen_bytes(environment['postimage'], CI_POSTIMAGE)
    preimage = execution.run(label + '-preimage', ['git', 'show', CI_SOURCE_COMMIT + ':' + CI_RELATIVE], CANDIDATE, binary=True)
    baseline = execution.run(label + '-base-preimage', ['git', 'show', BASE + ':' + CI_RELATIVE], CANDIDATE, binary=True)
    require(preimage == baseline and sha(preimage) == environment['preimage_sha256'], 'CI Git preimage changed')
    require(preimage.count(CI_INSERTION_ANCHOR) == 1 and CI_INSERTION not in preimage
            and postimage == preimage.replace(CI_INSERTION_ANCHOR, CI_INSERTION_ANCHOR + CI_INSERTION, 1),
            'CI change is not the fixed five-line zsh installation insertion')
    blob = execution.run(label + '-postimage', ['git', 'show', target + ':' + CI_RELATIVE], CANDIDATE, binary=True)
    actual = regular_bytes(CANDIDATE / CI_RELATIVE)
    require(blob == actual == postimage and len(blob) == environment['postimage_bytes']
            and sha(blob) == environment['postimage_sha256'], 'CI Git/candidate/artifact postimage changed')
    patch = execution.run(label + '-patch', ['git', 'diff', '--no-ext-diff', '--no-textconv', '--no-renames',
                                           CI_SOURCE_COMMIT, target, '--', CI_RELATIVE], CANDIDATE, binary=True)
    require(sha(patch) == environment['patch_sha256'], 'CI reviewed patch changed')


def verify_committed_set(execution, source_set, target, label, ci_environment=None):
    root, base = Path(source_set['root']), source_set['base']
    require(execution.run(label + '-head', ['git', 'rev-parse', 'HEAD'], root).strip() == target, 'local published HEAD changed')
    expected = {item['relative'] for item in source_set['files']}
    if ci_environment is None:
        require(execution.run(label + '-parent', ['git', 'rev-parse', target + '^'], root).strip() == base,
                'published change is not the single frozen-base commit')
    else:
        require(root == CANDIDATE and base == BASE and expected == FILES, 'CI descendant allowed only for original framework set')
        require(execution.run(label + '-parent', ['git', 'rev-list', '--parents', '-n', '1', target], root).split()
                == [target, CI_SOURCE_COMMIT], 'CI target is not the sole direct child of reviewed source commit')
        require(execution.run(label + '-source-parent', ['git', 'rev-list', '--parents', '-n', '1', CI_SOURCE_COMMIT], root).split()
                == [CI_SOURCE_COMMIT, BASE], 'reviewed source commit is not the sole direct child of frozen base')
        source_changed = set(execution.run(label + '-source-scope', ['git', 'diff', '--no-renames', '--name-only', BASE, CI_SOURCE_COMMIT], root).splitlines())
        require(source_changed == FILES, 'original source commit scope changed')
        ci_changed = set(execution.run(label + '-ci-scope', ['git', 'diff', '--no-renames', '--name-only', CI_SOURCE_COMMIT, target], root).splitlines())
        require(ci_changed == {CI_RELATIVE}, 'CI commit contains out-of-scope changes')
        expected = expected | {CI_RELATIVE}
    changed = set(execution.run(label + '-commit-scope', ['git', 'diff', '--no-renames', '--name-only', base, target], root).splitlines())
    require(changed == expected, 'commit contains out-of-scope changes')
    if ci_environment is not None:
        verify_ci_environment(execution, ci_environment, target, label + '-ci')
    tracked = [item['relative'] for item in source_set['files'] if item['tracked']]
    original_diff = execution.run(label + '-original-diff', ['git', 'diff', base, '--', *tracked], root, binary=True)
    require(sha(original_diff) == source_set['diff_sha256'], 'original tracked review diff changed')
    blobs = {}
    for index, item in enumerate(source_set['files']):
        actual = regular_bytes(item['path'])
        require(len(actual) == item['bytes'] and sha(actual) == item['sha256'], 'reviewed working file changed')
        blob = execution.run(label + '-blob-' + str(index), ['git', 'show', target + ':' + item['relative']], root, binary=True)
        require(sha(blob) == item['sha256'] and blob == actual, 'reviewed commit blob differs from working source')
        blobs[item['relative']] = blob
    return blobs


def safe_relative(value):
    return (text(value) and not value.startswith('/') and '\\' not in value
            and all(part and part not in ('.', '..') for part in value.split('/')))


def validate_artifact(artifact):
    require(exact(artifact, ['schema_version', 'kind', 'bootstrap_sha256', 'loader_sha256', 'roots'])
            and type(artifact['schema_version']) is int and artifact['schema_version'] == 1
            and artifact['kind'] == 'luca-source-guard-review' and digest(artifact['bootstrap_sha256'])
            and digest(artifact['loader_sha256']) and isinstance(artifact['roots'], list)
            and len(artifact['roots']) == 1, 'invalid reviewed artifact')
    row = artifact['roots'][0]
    require(exact(row, ['root', 'files', 'snapshot_files', 'source_files', 'source_sha256', 'hooks_sha256'])
            and row['root'] == str(ROOT) and digest(row['source_sha256']) and digest(row['hooks_sha256']),
            'artifact root/digest mismatch')
    for name in ['files', 'snapshot_files', 'source_files']:
        inventory = row[name]
        require(isinstance(inventory, dict) and list(inventory) == sorted(inventory, key=lambda key: key.encode('utf-8')),
                'invalid or unsorted artifact inventory')
        for path, value in inventory.items():
            require(safe_relative(path), 'unsafe artifact relative path')
            if name == 'files':
                require(Path(path).suffix in ('.js', '.mjs') and exact(value, ['sha256', 'format'])
                        and digest(value['sha256']) and value['format'] in ('module', 'commonjs'), 'invalid JS approval')
            else:
                require(digest(value), 'invalid artifact file SHA')
            if name == 'source_files':
                require(any(path.startswith(folder + '/') for folder in SOURCE_DIRS)
                        and Path(path).suffix in ('.mjs', '.js', '.py', '.sh'), 'invalid source scan path')
    return row


def deployment_artifact(release):
    require(release['code_install_review'] == {'path': str(CODE_REVIEW), 'sha256': CODE_REVIEW_SHA},
            'original code artifact binding changed')
    code = frozen(release['code_install_review'], CODE_REVIEW)
    deploy = frozen(release['install_review'], DEPLOY_REVIEW)
    code_row, deploy_row = validate_artifact(code), validate_artifact(deploy)
    require(PRESERVED_REPORT not in code_row['snapshot_files'], 'report already present in original code artifact')
    expected = dict(code_row['snapshot_files'], **{PRESERVED_REPORT: PRESERVED_REPORT_SHA})
    require(deploy_row['snapshot_files'] == expected, 'deployment snapshot is not the single preserved report addition')
    normalized = dict(deploy, roots=[dict(deploy_row, snapshot_files=code_row['snapshot_files'])])
    require(normalized == code, 'deployment artifact changed code, source, hooks or shared runtime')
    delta = frozen(release['deployment_snapshot_delta'], DEPLOY_DELTA)
    require(delta == {'schema_version': 1, 'kind': 'luca-preserved-deployment-snapshot-delta',
                      'relative': PRESERVED_REPORT, 'bytes': PRESERVED_REPORT_BYTES, 'sha256': PRESERVED_REPORT_SHA,
                      'mother_path': str(ROOT / PRESERVED_REPORT), 'candidate_path': str(CANDIDATE / PRESERVED_REPORT),
                      'preserved_mother': True, 'copied_original_bytes': True, 'git_publication': False}
            and type(delta['schema_version']) is int and type(delta['bytes']) is int
            and type(delta['preserved_mother']) is bool and type(delta['copied_original_bytes']) is bool
            and type(delta['git_publication']) is bool, 'invalid fixed deployment snapshot delta')
    mother, candidate = regular_bytes(ROOT / PRESERVED_REPORT), regular_bytes(CANDIDATE / PRESERVED_REPORT)
    require(len(mother) == PRESERVED_REPORT_BYTES and sha(mother) == PRESERVED_REPORT_SHA and candidate == mother,
            'preserved report original bytes changed')
    return deploy


def physical_inventory(folder, prefix, extensions=None, skip_cache=False):
    """Mirror the review inventories; even a nonselected special file fails a physical tree."""
    files, visited = {}, 0
    def walk(path, relative):
        nonlocal visited
        metadata = path.lstat()
        require(stat.S_ISDIR(metadata.st_mode) and path.resolve(strict=True) == path,
                'unsafe inventory directory: ' + str(path))
        visited += 1
        require(visited <= 20000, 'too many inventory directories')
        for child in sorted(path.iterdir(), key=lambda item: item.name.encode('utf-8')):
            if skip_cache and (child.name == '__pycache__' or child.name.endswith('.pyc')):
                continue
            name = relative + '/' + child.name
            require(safe_relative(name), 'unsafe inventory name')
            metadata = child.lstat()
            if stat.S_ISDIR(metadata.st_mode):
                walk(child, name)
            elif stat.S_ISREG(metadata.st_mode):
                if extensions is None or child.suffix in extensions:
                    files[name] = sha(regular_bytes(child))
            else:
                raise RuntimeError('inventory has a symlink or special file: ' + str(child))
    walk(folder, prefix)
    return files


def package_format(file):
    for folder in [file.parent, *file.parent.parents]:
        if folder != ROOT and ROOT not in folder.parents:
            break
        package = folder / 'package.json'
        if package.exists():
            value = json.loads(regular_bytes(package))
            return 'module' if isinstance(value, dict) and value.get('type') == 'module' else 'commonjs'
    return 'commonjs'


def mother_javascript():
    files, visited = {}, 0
    def walk(folder):
        nonlocal visited
        metadata = folder.lstat()
        require(stat.S_ISDIR(metadata.st_mode) and folder.resolve(strict=True) == folder, 'unsafe JS directory')
        visited += 1
        require(visited <= 20000, 'too many JS source directories')
        for file in folder.iterdir():
            metadata = file.lstat()
            if stat.S_ISLNK(metadata.st_mode):
                continue
            if stat.S_ISDIR(metadata.st_mode):
                if file.name not in ('.git', 'node_modules', '__pycache__'):
                    walk(file)
            elif stat.S_ISREG(metadata.st_mode) and file.suffix in ('.mjs', '.js'):
                name = str(file.relative_to(ROOT))
                require(safe_relative(name), 'unsafe JS source name')
                files[name] = {'sha256': sha(regular_bytes(file)),
                               'format': 'module' if file.suffix == '.mjs' else package_format(file)}
                require(len(files) <= 10000, 'too many JS source files')
    walk(ROOT)
    return files


def predict_mother_artifact(artifact, target_blobs):
    """Predict the complete deployed inventories without changing the mother checkout."""
    row = validate_artifact(artifact)
    require(set(target_blobs) == FILES and all(isinstance(value, bytes) for value in target_blobs.values()),
            'prediction requires all verified target blobs')
    source = {}
    for folder in SOURCE_DIRS:
        source.update(physical_inventory(ROOT / folder, folder, ('.mjs', '.js', '.py', '.sh')))
    snapshot = {}
    for folder in SNAPSHOT_DIRS:
        snapshot.update(physical_inventory(ROOT / folder, folder, skip_cache=True))
    snapshot['CLAUDE.md'] = sha(regular_bytes(ROOT / 'CLAUDE.md'))
    if (ROOT / SNAPSHOT_EXTRA[0]).exists():
        snapshot.update({file: sha(regular_bytes(ROOT / file)) for file in SNAPSHOT_EXTRA})
    javascript = mother_javascript()
    for name, blob in target_blobs.items():
        value = sha(blob)
        if any(name.startswith(folder + '/') for folder in SOURCE_DIRS) and Path(name).suffix in ('.mjs', '.js', '.py', '.sh'):
            source[name] = value
        if any(name.startswith(folder + '/') for folder in SNAPSHOT_DIRS) or name == 'CLAUDE.md' or name in snapshot:
            snapshot[name] = value
        if Path(name).suffix in ('.mjs', '.js'):
            javascript[name] = {'sha256': value, 'format': 'module' if Path(name).suffix == '.mjs' else package_format(ROOT / name)}
    require(source == row['source_files'], 'future mother source inventory differs from reviewed artifact')
    require(snapshot == row['snapshot_files'], 'future mother full snapshot differs from reviewed artifact')
    require(javascript == row['files'], 'future mother JS approvals differ from reviewed artifact')
    require(sha(target_blobs['.codex/hooks.json']) == row['hooks_sha256'], 'future hooks bytes differ from reviewed artifact')


def verify_mother_preimage(execution, source_set, label, ci_environment=None):
    require(execution.run(label + '-head', ['git', 'rev-parse', 'HEAD']).strip() == BASE, 'mother HEAD changed')
    require(execution.run(label + '-branch', ['git', 'branch', '--show-current']).strip() == 'main', 'mother branch changed')
    require(not execution.run(label + '-index', ['git', 'diff', '--cached', '--name-only']).strip(), 'mother has staged user work')
    for index, item in enumerate(source_set['files']):
        file = ROOT / item['relative']
        if item['tracked']:
            prior = execution.run(label + '-preimage-' + str(index), ['git', 'show', BASE + ':' + item['relative']], binary=True)
            require(regular_bytes(file) == prior, 'mother source preimage changed')
        else:
            require(not os.path.lexists(file), 'new target already exists in mother')
    if ci_environment is not None:
        prior = execution.run(label + '-ci-base', ['git', 'show', BASE + ':' + CI_RELATIVE], binary=True)
        reviewed = execution.run(label + '-ci-source', ['git', 'show', CI_SOURCE_COMMIT + ':' + CI_RELATIVE], binary=True)
        require(prior == reviewed == regular_bytes(ROOT / CI_RELATIVE)
                and sha(prior) == ci_environment['preimage_sha256'], 'mother CI workflow preimage changed')


def protected_preimage(release, artifact):
    manifest_bytes = regular_bytes(GUARD / 'manifest.json', private=True)
    require(sha(manifest_bytes) == release['expected_manifest_sha256'], 'protected manifest CAS changed')
    manifest = json.loads(manifest_bytes)
    require(isinstance(manifest, dict) and isinstance(manifest.get('roots'), list), 'invalid protected manifest')
    require(not os.path.lexists(GUARD / '.install.lock'), 'installer lock present; do not recover automatically')
    for name in ['bootstrap', 'loader']:
        require(sha(regular_bytes(GUARD / (name + '.mjs'), private=True)) == artifact[name + '_sha256'], 'shared runtime changed')
    return manifest


def remote_head(execution, label, root, branch, target, origin):
    require(execution.run(label + '-origin', ['git', 'remote', 'get-url', 'origin'], root).strip() == origin,
            'publication origin changed')
    rows = execution.run(label, ['git', 'ls-remote', '--exit-code', 'origin', 'refs/heads/' + branch], root).splitlines()
    require(len(rows) == 1 and rows[0].split() == [target, 'refs/heads/' + branch], 'published remote branch changed')


def ci_projection(value, target, run_id):
    require(isinstance(value, dict) and type(value.get('databaseId')) is int and value['databaseId'] == run_id
            and value.get('headSha') == target and value.get('headBranch') == 'main'
            and value.get('status') == 'completed' and value.get('conclusion') == 'success'
            and value.get('url') == f'https://github.com/{GH_REPO}/actions/runs/{run_id}'
            and isinstance(value.get('jobs'), list) and value['jobs'], 'official same-head CI is not successful')
    jobs, seen = [], set()
    for job in value['jobs']:
        require(isinstance(job, dict) and type(job.get('databaseId')) is int and job['databaseId'] > 0
                and job['databaseId'] not in seen and text(job.get('name')) and job.get('status') == 'completed'
                and job.get('conclusion') == 'success'
                and job.get('url') == f'https://github.com/{GH_REPO}/actions/runs/{run_id}/job/{job["databaseId"]}',
                'official CI job missing, unsuccessful or duplicate')
        seen.add(job['databaseId'])
        jobs.append({key: job[key] for key in ['databaseId', 'name', 'status', 'conclusion', 'url']})
    require(any(job['name'] == 'Required Checks' for job in jobs), 'required CI aggregation absent')
    return {'databaseId': run_id, 'headSha': target, 'headBranch': 'main', 'status': 'completed',
            'conclusion': 'success', 'url': value['url'], 'jobs': sorted(jobs, key=lambda job: job['databaseId'])}


def verify_ci(execution, publication, label):
    target, run_id = publication['target_commit'], publication['run_id']
    saved = ci_projection(frozen(publication['ci_run']), target, run_id)
    live = json.loads(execution.run(label, ['gh', 'run', 'view', str(run_id), '--repo', GH_REPO,
                                            '--json', 'databaseId,headSha,headBranch,status,conclusion,url,jobs'], CANDIDATE))
    require(ci_projection(live, target, run_id) == saved, 'live official CI run/jobs differ from frozen evidence')
    return saved


def package_binding(release, scope):
    package = frozen(release['app_package'], APP_PACKAGE)
    prepare = frozen_bytes(release['prepare_helper'], PREPARE_HELPER)
    installer = frozen_bytes(release['app_installer'], APP_INSTALLER)
    host = next(item for item in scope['sets'][1]['files'] if item['relative'] == 'app/host-hook-ready.js')
    require(isinstance(package, dict) and type(package.get('schema_version')) is int and package['schema_version'] == 1
            and package.get('kind') == 'luca-hook-package-prepared' and package.get('prepared') is True
            and package.get('installed') is False and package.get('signature_verified') is True
            and type(package.get('reviewed_files')) is int and package['reviewed_files'] == 17
            and package.get('helper_sha256') == sha(prepare) == release['prepare_helper']['sha256']
            and package.get('scope') == release['scope']['path']
            and package.get('scope_sha256') == release['scope']['sha256']
            and package.get('target_host_sha256') == host['sha256'], 'App package is not bound to this reviewed source/helper')
    baseline = package.get('installed_baseline')
    require(isinstance(baseline, dict) and baseline.get('app') == '/Applications/luca.app'
            and baseline.get('signature_verified') is True, 'App installed baseline absent')
    for name in ['asar_sha256', 'header_sha256', 'host_sha256', 'info_sha256', 'bundle_inventory_sha256',
                 'module_inventory_sha256', 'unpacked_sha256']:
        require(digest(baseline.get(name)), 'invalid App baseline SHA')
    for name in ['asar_sha256', 'header_sha256', 'info_sha256', 'bundle_inventory_sha256', 'unpacked_sha256']:
        require(digest(package.get(name)), 'invalid App package SHA')
    require(digest(package.get('helper_sha256')) and text(package.get('app')) and text(package.get('temp_root')),
            'invalid App package path/scalar type')
    tooling = package.get('tooling')
    asar_root = APP_ROOT / 'app/node_modules/@electron/asar'
    expected_tools = {str(asar_root / name) for name in ['package.json', 'lib/asar.js', 'lib/disk.js',
                      'lib/filesystem.js', 'lib/integrity.js', 'lib/pickle.js', 'lib/wrapped-fs.js']}
    expected_tools.add(str(APP_ROOT / 'app/macos-release.mjs'))
    require(exact(tooling, ['entry', 'version', 'files']) and tooling['entry'] == str(asar_root / 'lib/asar.js')
            and tooling['version'] == '3.4.1' and isinstance(tooling['files'], dict)
            and set(tooling['files']) == expected_tools, 'App tooling identity changed')
    # Authenticate every local module before the installer performs its static import.
    for file, value in tooling['files'].items():
        require(digest(value) and sha(regular_bytes(file)) == value, 'App tooling changed before helper execution')
    return package, installer.decode('utf-8')


def app_helper(execution, label, release, installer_text, apply=False):
    require(sha(installer_text.encode('utf-8')) == release['app_installer']['sha256'], 'App installer stdin bytes changed')
    require(frozen_bytes(release['app_installer'], APP_INSTALLER).decode('utf-8') == installer_text, 'App installer changed')
    output = execution.run(label, ['node', '--input-type=module', '-', '--package-sha', release['app_package']['sha256'],
                                    *(['--apply'] if apply else [])], input_text=installer_text)
    if not apply:
        result = json.loads(output)
        require(result.get('status') == 'PREFLIGHT_PASS_NO_MUTATION'
                and result.get('package_sha256') == release['app_package']['sha256'], 'App install preflight did not pass')
    return output


def packed_host(archive):
    """Read the fixed packed module using ASAR's two uint32 pickles; execute no App code."""
    require(len(archive) >= 16, 'installed ASAR header truncated')
    size_payload, header_size, header_payload, json_size = struct.unpack_from('<IIII', archive)
    require(size_payload == 4 and header_size >= 8 and header_payload == header_size - 4
            and json_size > 0 and header_size == 8 + ((json_size + 3) // 4) * 4
            and 8 + header_size <= len(archive), 'installed ASAR header invalid')
    header_bytes = archive[16:16 + json_size]
    header = json.loads(header_bytes)
    require(isinstance(header, dict) and isinstance(header.get('files'), dict), 'installed ASAR files absent')
    host = header['files'].get('host-hook-ready.js')
    require(isinstance(host, dict) and 'link' not in host and 'files' not in host
            and host.get('unpacked', False) is False and type(host.get('size')) is int and host['size'] > 0
            and isinstance(host.get('offset'), str) and re.fullmatch(r'0|[1-9][0-9]*', host['offset']),
            'installed host must be a packed regular module')
    offset = 8 + header_size + int(host['offset'])
    require(offset + host['size'] <= len(archive), 'installed host ASAR range invalid')
    content = archive[offset:offset + host['size']]
    require(isinstance(host.get('integrity'), dict) and host['integrity'].get('algorithm') == 'SHA256'
            and host['integrity'].get('hash') == sha(content), 'installed host ASAR integrity mismatch')
    return content, sha(header_bytes)


def verify_installed_app(execution, release, scope, label):
    reference = release['installed_app']
    proof = frozen(reference, INSTALLED_APP_PROOF)
    host = next(item for item in scope['sets'][1]['files'] if item['relative'] == 'app/host-hook-ready.js')
    require(exact(proof, ['schema_version', 'kind', 'app', 'scope', 'host_relative', 'host_sha256',
                          'asar_sha256', 'header_sha256', 'info_sha256', 'signature_verified'])
            and type(proof['schema_version']) is int and proof['schema_version'] == 1
            and proof['kind'] == 'luca-hook-already-installed-proof' and proof['app'] == str(INSTALLED_APP)
            and proof['scope'] == release['scope'] and proof['host_relative'] == 'host-hook-ready.js'
            and proof['host_sha256'] == host['sha256'] and proof['signature_verified'] is True
            and all(digest(proof[name]) for name in ['host_sha256', 'asar_sha256', 'header_sha256', 'info_sha256']),
            'installed App proof not bound to reviewed source')
    require(INSTALLED_APP.resolve(strict=True) == INSTALLED_APP and INSTALLED_APP.is_dir(), 'installed App root changed')
    execution.run(label + '-signature-before', ['/usr/bin/codesign', '--verify', '--deep', '--strict', str(INSTALLED_APP)])
    archive_path, info_path = INSTALLED_APP / 'Contents/Resources/app.asar', INSTALLED_APP / 'Contents/Info.plist'
    archive, info_bytes = regular_bytes(archive_path), regular_bytes(info_path)
    require(sha(archive) == proof['asar_sha256'] and sha(info_bytes) == proof['info_sha256'], 'installed App frozen bytes changed')
    content, header_sha = packed_host(archive)
    info = plistlib.loads(info_bytes)
    require(isinstance(info, dict) and isinstance(info.get('ElectronAsarIntegrity'), dict)
            and info['ElectronAsarIntegrity'].get('Resources/app.asar') == {'algorithm': 'SHA256', 'hash': header_sha}
            and header_sha == proof['header_sha256'] and sha(content) == host['sha256']
            and len(content) == host['bytes'], 'installed App host/header differs from reviewed source')
    execution.run(label + '-signature-after', ['/usr/bin/codesign', '--verify', '--deep', '--strict', str(INSTALLED_APP)])
    require(regular_bytes(archive_path) == archive and regular_bytes(info_path) == info_bytes,
            'installed App changed during signature/readback verification')
    return {'status': 'ALREADY_INSTALLED_SIGNATURE_AND_BYTE_READBACK_VERIFIED_LIVE_RESTART_PENDING',
            'proof': reference, 'app': str(INSTALLED_APP), 'app_install_performed': False,
            'host_sha256': host['sha256'], 'asar_sha256': proof['asar_sha256'],
            'header_sha256': header_sha, 'info_sha256': proof['info_sha256'], 'signature_verified': True}


def app_release_binding(release):
    if release['schema_version'] == 1:
        return {'app_package_sha256': release['app_package']['sha256']}
    return {'app_mode': release['app_mode'], 'installed_app_sha256': release['installed_app']['sha256']}


def verify_native_review(execution, identity, ticket, label, historical=False):
    # Normal SessionEnd preserves accepted calls while invalidating pending ones.
    # Only completed source reviews may be consumed after their root is paused.
    require(type(historical) is bool, 'invalid historical review flag')
    code = 'import {readActivation} from "./scripts/model-route-host.mjs";const s=readActivation({harness:"codex",root_session_id:' + json.dumps(identity['root_session_id']) + '});console.log(JSON.stringify(s));'
    state = json.loads(execution.run(label, ['node', '--input-type=module', '-e', code]))
    require(isinstance(state, dict) and state.get('status') in (('active', 'paused') if historical else ('active',))
            and state.get('root_session_id') == identity['root_session_id']
            and state.get('activation_id') == identity['activation_id'] and state.get('critical_failure') is False
            and isinstance(state.get('invocations'), dict), 'native activation not current/active')
    call = state['invocations'].get(ticket['invocation_id'])
    require(isinstance(call, dict) and call.get('invocation_id') == ticket['invocation_id']
            and call.get('status') == 'accepted' and call.get('requested_role') == 'peak'
            and call.get('route_harness') == 'codex-native' and call.get('critical') is True
            and call.get('activation_id') == state['activation_id'] and call.get('root_generation') == state.get('root_generation')
            and call.get('root_session_id') == identity['root_session_id'] and call.get('release_digest') == state.get('release_digest')
            and isinstance(call.get('external_identity'), dict) and call['external_identity'].get('agent_id') == ticket['agent_id']
            and call.get('evidence_ref') == ticket['evidence_ref'], 'native independent review evidence changed')


def verify_local_approval(reference, release_reference, release, execution):
    gate = frozen(reference, LOCAL_APPROVAL)
    require(exact(gate, ['schema_version', 'kind', 'release_sha256', 'review'])
            and type(gate['schema_version']) is int and gate['schema_version'] in (1, 2)
            and gate['kind'] == 'luca-stable-local-release-gate'
            and digest(gate['release_sha256']) and gate['release_sha256'] == release_reference['sha256'],
            'local approval not bound to exact release bytes')
    ticket = gate['review']
    if gate['schema_version'] == 1:
        validate_ticket(ticket)
        identity = release
    else:
        require(exact(ticket, ['path', 'sha256', 'eval_run_id', 'invocation_id', 'agent_id', 'evidence_ref',
                               'root_session_id', 'activation_id'])
                and text(ticket['root_session_id']) and text(ticket['activation_id']), 'invalid local native identity ticket')
        validate_ticket({name: value for name, value in ticket.items() if name not in ('root_session_id', 'activation_id')})
        identity = ticket
    for prior in release['reviews'].values():
        for name in ['invocation_id', 'agent_id', 'eval_run_id', 'path']:
            require(ticket[name] != prior[name], 'local release review reused an old source ticket')
    verdict = frozen({'path': ticket['path'], 'sha256': ticket['sha256']})
    require(isinstance(verdict, dict) and verdict.get('eval_run_id') == ticket['eval_run_id']
            and isinstance(verdict.get('verdict'), dict) and verdict['verdict'].get('status') == 'PASS'
            and isinstance(verdict.get('subject'), dict), 'local release review not PASS')
    subject = verdict['subject']
    require(isinstance(subject.get('output_paths'), list) and release_reference['path'] in subject['output_paths']
            and release['install_review']['path'] in subject['output_paths'] and text(subject.get('input_summary'))
            and release_reference['sha256'] in subject['input_summary'], 'local review does not bind release SHA and actual install artifact')
    verify_native_review(execution, identity, ticket, 'local-release-review-native')
    return reference


def preflight(release, execution):
    validate_release(release)
    require(Path(__file__).resolve() == CONTROLLER and sha(regular_bytes(CONTROLLER)) == release['controller_sha256'], 'controller not reviewed')
    require(ROOT.resolve() == ROOT and CANDIDATE.resolve() == CANDIDATE and APP_ROOT.resolve() == APP_ROOT,
            'root identity changed')
    scope = frozen(release['scope'])
    validate_scope(scope, release)
    artifact = deployment_artifact(release)
    target, app_target = release['target_commit'], release['app_publication']['target_commit']
    ci_environment = ci_environment_binding(release) if release['schema_version'] == 3 else None
    target_blobs = verify_committed_set(execution, scope['sets'][0], target, 'candidate', ci_environment)
    verify_committed_set(execution, scope['sets'][1], app_target, 'app')
    verify_mother_preimage(execution, scope['sets'][0], 'mother', ci_environment)
    predict_mother_artifact(artifact, target_blobs)
    for label, root in [('mother', ROOT), ('candidate', CANDIDATE)]:
        require(not execution.run(label + '-report-untracked', ['git', 'ls-files', '--', PRESERVED_REPORT], root).strip(),
                'preserved deployment report became Git tracked')
        require(execution.run(label + '-report-ignored', ['git', 'check-ignore', '--', PRESERVED_REPORT], root).strip() == PRESERVED_REPORT,
                'deployment report is no longer ignored')
    package, installer_text, installed_app = None, None, None
    if release['schema_version'] == 1:
        package, installer_text = package_binding(release, scope)
        # The App helper preflight is executed through its frozen original stdin bytes.
        app_helper(execution, 'app-install-preflight', release, installer_text)
    else:
        installed_app = verify_installed_app(execution, release, scope, 'app-installed-preflight')
    require(execution.run('app-branch', ['git', 'branch', '--show-current'], APP_ROOT).strip() == APP_BRANCH,
            'App branch changed')
    remote_head(execution, 'app-remote-head', APP_ROOT, APP_BRANCH, app_target, APP_ORIGIN)
    for name in ['standards', 'spec']:
        ticket = release['reviews'][name]
        verdict = frozen({'path': ticket['path'], 'sha256': ticket['sha256']})
        require(verdict.get('eval_run_id') == ticket['eval_run_id'] and verdict.get('verdict', {}).get('status') == 'PASS'
                and release['scope']['path'] in verdict.get('subject', {}).get('output_paths', []), 'review gate not bound/closed')
        verify_native_review(execution, release, ticket, 'review-' + name + '-native', historical=True)
    ci = verify_ci(execution, release['publication'], 'official-ci-live')
    remote_head(execution, 'remote-head', ROOT, 'main', target, FRAMEWORK_ORIGIN)
    old_manifest = protected_preimage(release, artifact)
    for home in HOMES:
        require(Path(home).resolve() == Path(home) and Path(home).is_dir(), 'profile identity changed')
    require(json.loads(execution.run('controlled-state', ['node', 'scripts/controlled-change.mjs', 'inspect', '--repo', str(ROOT)]))['kind'] == 'inactive', 'controlled change active')
    health_before = json.loads(execution.run('health-preimage', ['node', 'scripts/codex-hook-health.mjs', '--json']))
    require(health_before['ok'] and health_before['installation']['manifest_sha256'] == release['expected_manifest_sha256'], 'installed source preimage unhealthy')
    for index, home in enumerate(HOMES):
        output = execution.run('trust-preimage-' + str(index), ['node', 'scripts/codex-trust-hooks.mjs', '--host-launch', '--dry-run'], home=home)
        require('本仓精确条目 11 个（待授信 0）' in output, 'baseline profile trust changed')
    processes = execution.run('installer-process-preflight', ['/bin/ps', '-axo', 'pid=,command='])
    require(not any('install-codex-source-guard.mjs' in line for line in processes.splitlines()), 'another installer is live')
    require(not os.path.lexists(RECEIPT) and not os.path.lexists(RECEIPT.with_name(RECEIPT.name + '.tmp')),
            'activation has receipt/reservation; inspect before any retry')
    return {'scope': scope, 'artifact': artifact, 'old_manifest': old_manifest, 'package': package,
            'installer_text': installer_text, 'installed_app': installed_app, 'ci': ci, 'target_blobs': target_blobs,
            'ci_environment': ci_environment}


def activate(release, release_sha, state, execution):
    target, artifact, package = release['target_commit'], state['artifact'], state['package']
    require(exact(state.get('local_approval'), ['path', 'sha256'])
            and state['local_approval']['path'] == str(LOCAL_APPROVAL) and digest(state['local_approval']['sha256']),
            'reviewed local release approval required before mutation')
    durable_record({'status': 'PREPARED', 'target_commit': target, 'app_commit': release['app_publication']['target_commit'],
                    'release_sha256': release_sha, **app_release_binding(release),
                    **({'app_receipt': state['installed_app']} if release['schema_version'] in (2, 3) else {}),
                    **({'ci_environment': release['ci_environment']} if release['schema_version'] == 3 else {}),
                    'local_approval': state['local_approval'], 'ci': state['ci'], 'at': datetime.now(timezone.utc).isoformat()}, initial=True)
    execution.logging_enabled = True
    try:
        # App fulfillment failure stops before mother/source mutation. No automatic retry or rollback here.
        if release['schema_version'] == 1:
            current_package, current_installer = package_binding(release, state['scope'])
            require(current_package == package and current_installer == state['installer_text'], 'App package/installer changed before apply import')
            app_helper(execution, 'app-install', release, state['installer_text'], apply=True)
            app_receipt = json.loads(regular_bytes(AUDIT / 'stable-app-install-result.json', private=True))
            require(app_receipt.get('status') == 'INSTALLED_SIGNATURE_AND_BYTE_READBACK_VERIFIED_LIVE_RESTART_PENDING'
                    and app_receipt.get('package_sha256') == release['app_package']['sha256']
                    and app_receipt.get('host_sha256') == package['target_host_sha256']
                    and app_receipt.get('bundle_inventory_sha256') == package['bundle_inventory_sha256'], 'App installed receipt mismatch')
        else:
            app_receipt = verify_installed_app(execution, release, state['scope'], 'app-installed-before-source')
            require(app_receipt == state['installed_app'], 'installed App fulfillment changed before source activation')
        remote_head(execution, 'app-remote-before-source', APP_ROOT, APP_BRANCH,
                    release['app_publication']['target_commit'], APP_ORIGIN)
        require(execution.run('app-head-before-source', ['git', 'rev-parse', 'HEAD'], APP_ROOT).strip()
                == release['app_publication']['local_head'], 'App local HEAD changed after install')
        verify_ci(execution, release['publication'], 'official-ci-before-source')
        remote_head(execution, 'remote-before-source', ROOT, 'main', target, FRAMEWORK_ORIGIN)
        require(execution.run('candidate-head-before-source', ['git', 'rev-parse', 'HEAD'], CANDIDATE).strip() == target,
                'candidate local HEAD changed after App install')
        require(frozen(release['scope']) == state['scope'] and deployment_artifact(release) == artifact,
                'reviewed scope/artifact changed after App install')
        if release['schema_version'] == 1:
            package_binding(release, state['scope'])
        else:
            require(verify_installed_app(execution, release, state['scope'], 'app-installed-source-fence') == app_receipt,
                    'installed App fulfillment changed at source fence')
        for source_set in state['scope']['sets']:
            for item in source_set['files']:
                require(sha(regular_bytes(item['path'])) == item['sha256'], 'reviewed working source changed after App install')
        if release['schema_version'] == 3:
            require(ci_environment_binding(release) == state['ci_environment'], 'CI environment manifest changed at source fence')
            verify_ci_environment(execution, state['ci_environment'], target, 'ci-source-fence')
        verify_mother_preimage(execution, state['scope']['sets'][0], 'mother-before-source', state['ci_environment'])
        predict_mother_artifact(artifact, state['target_blobs'])
        require(protected_preimage(release, artifact) == state['old_manifest'], 'protected preimage changed after App install')
        execution.run('main-fast-forward', ['git', '-c', 'merge.autostash=false', 'merge', '--ff-only', target])
        execution.run('source-install', ['node', 'scripts/install-codex-source-guard.mjs', '--root', str(ROOT), '--preserve-other-roots',
                                       '--reviewed-file', release['install_review']['path'], '--reviewed-sha', release['install_review']['sha256'],
                                       '--expected-manifest-sha', release['expected_manifest_sha256']])
        installed = json.loads(regular_bytes(GUARD / 'manifest.json', private=True))
        require([row for row in installed['roots'] if row['root'] != str(ROOT)] ==
                [row for row in state['old_manifest']['roots'] if row['root'] != str(ROOT)], 'other roots changed')
        health = json.loads(execution.run('health-readback', ['node', 'scripts/codex-hook-health.mjs', '--json']))
        require(health['ok'], 'full installed health failed')
        for index, home in enumerate(HOMES):
            execution.run('trust-apply-' + str(index), ['node', 'scripts/codex-trust-hooks.mjs', '--host-launch'], home=home)
            output = execution.run('trust-readback-' + str(index), ['node', 'scripts/codex-trust-hooks.mjs', '--host-launch', '--dry-run'], home=home)
            require('本仓精确条目 11 个（待授信 0）' in output, 'official exact trust incomplete')
        code = "import {verifyHostHooks} from '/Users/luca/Desktop/项目/muse/app/host-hook-ready.js';const root=" + json.dumps(str(ROOT)) + ';for(const home of ' + json.dumps(HOMES) + "){await verifyHostHooks({hooksPath:root+'/.codex/hooks.json',binary:'/Users/luca/.local/bin/codex',codexHome:home,gstackRoot:root});}console.log('PASS');"
        execution.run('three-consumer-readback', ['node', '--input-type=module', '-e', code])
        if release['schema_version'] in (2, 3):
            require(verify_installed_app(execution, release, state['scope'], 'app-installed-final-readback') == app_receipt,
                    'installed App fulfillment changed during source activation')
        durable_record({'status': 'ACTIVATED_APP_SOURCE_AND_THREE_PROFILE_TRUST_VERIFIED_LIVE_RELOAD_PENDING',
                        'target_commit': target, 'app_commit': release['app_publication']['target_commit'],
                        'release_sha256': release_sha, **app_release_binding(release),
                        **({'ci_environment': release['ci_environment']} if release['schema_version'] == 3 else {}),
                        'local_approval': state['local_approval'],
                        'app_receipt': app_receipt, 'ci': state['ci'], 'artifact_sha256': release['install_review']['sha256'],
                        'manifest_sha256': sha(regular_bytes(GUARD / 'manifest.json', private=True)),
                        'source_sha256': artifact['roots'][0]['source_sha256'], 'homes': HOMES, 'steps': execution.steps,
                        'live': 'UNVERIFIED: normal App/desktop reload and real user prompt required',
                        'at': datetime.now(timezone.utc).isoformat()})
        print('Reviewed App fulfillment and source activation verified; 11 exact hooks trusted in all three profiles. Normal live reload remains unverified.')
    except Exception as error:
        durable_record({'status': 'FAILED_REQUIRES_REVIEW', 'target_commit': target, 'release_sha256': release_sha,
                        'local_approval': state['local_approval'],
                        **app_release_binding(release),
                        **({'ci_environment': release['ci_environment']} if release['schema_version'] == 3 else {}),
                        'steps': execution.steps, 'error': str(error),
                        'recovery': 'Do not rerun or raw-restore App/manifest/config. Inspect durable receipts, logs and authoritative installed bytes; review only the unfinished phase with fresh CAS.'})
        raise


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release', required=True)
    parser.add_argument('--release-sha', required=True)
    parser.add_argument('--approval')
    parser.add_argument('--approval-sha')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args(argv)
    require(digest(args.release_sha), 'invalid release byte SHA')
    require((args.approval is None) == (args.approval_sha is None), 'approval path and SHA must be provided together')
    require(not args.apply or args.approval is not None, '--apply requires the independent local release gate')
    if args.approval is not None:
        require(digest(args.approval_sha), 'invalid approval byte SHA')
    reference = {'path': args.release, 'sha256': args.release_sha}
    release = frozen(reference)
    execution = Execution()
    state = preflight(release, execution)
    if args.approval is not None:
        state['local_approval'] = verify_local_approval({'path': args.approval, 'sha256': args.approval_sha}, reference, release, execution)
    if not args.apply:
        print(json.dumps({'status': 'PREFLIGHT_PASS_NO_MUTATION', 'target_commit': release['target_commit'],
                          'app_commit': release['app_publication']['target_commit'],
                          **app_release_binding(release),
                          **({'app_receipt': state['installed_app']} if release['schema_version'] in (2, 3) else {}),
                          **({'ci_environment': release['ci_environment']} if release['schema_version'] == 3 else {}),
                          'artifact_sha256': release['install_review']['sha256'], 'ci': state['ci'], 'homes': HOMES}))
        return
    # Reauthenticate the one approved release immediately before the durable attempt fence.
    require(frozen(reference) == release, 'release changed before PREPARED')
    activate(release, args.release_sha, state, execution)


if __name__ == '__main__':
    main()
