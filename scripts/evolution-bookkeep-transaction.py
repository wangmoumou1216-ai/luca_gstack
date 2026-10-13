#!/usr/bin/env python3
"""Specific POSIX transaction owner for candidate-log + source yield counters.

One never-unlinked lock spans recovery, the read-only Node planner, and commit.
The journal retains exact bytes for each run; no legacy half-run is inferred.
"""
import base64
import fcntl
import hashlib
import json
import os
import stat
import subprocess
import sys
import tempfile

LOCK = '.evolution-bookkeep.lock'
JOURNAL = '.evolution-bookkeep-journal.json'
TARGETS = {'log': 'candidate-log.jsonl', 'registry': 'sources-registry.yaml'}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encode(data):
    return base64.b64encode(data).decode('ascii')


def state(data):
    return {'bytes_b64': encode(data), 'sha256': sha(data)}


def decode(value):
    require(isinstance(value, dict) and set(value) == {'bytes_b64', 'sha256'}, 'invalid journal byte state')
    data = base64.b64decode(value['bytes_b64'], validate=True)
    require(sha(data) == value['sha256'], 'journal byte hash mismatch')
    return data


def main():
    node, script, supplied_root = sys.argv[1:4]
    dry = sys.argv[4:] == ['--dry-run']
    require(not sys.argv[4:] or dry, 'invalid transaction arguments')
    root = os.path.realpath(supplied_root)
    directory = root
    for component in ['.claude', 'skill-os', 'evolution']:
        directory = os.path.join(directory, component)
        require(stat.S_ISDIR(os.lstat(directory).st_mode), 'symlink/non-directory evolution boundary')
    dfd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    lockfd = None
    raw = sys.stdin.buffer.read()
    input_hash = sha(raw)

    def identity(fd, name):
        held, named = os.fstat(fd), os.stat(name, dir_fd=dfd, follow_symlinks=False)
        require(stat.S_ISREG(held.st_mode) and stat.S_ISREG(named.st_mode)
                and held.st_nlink == named.st_nlink == 1
                and (held.st_dev, held.st_ino) == (named.st_dev, named.st_ino), f'unsafe/replaced file identity: {name}')
        return held

    def boundaries():
        held, named = os.fstat(dfd), os.stat(directory, follow_symlinks=False)
        require((held.st_dev, held.st_ino) == (named.st_dev, named.st_ino), 'evolution directory replaced')
        require(os.path.realpath(directory) == directory, 'evolution ancestor changed')
        if lockfd is not None:
            identity(lockfd, LOCK)

    def read(name, optional=False):
        try:
            fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=dfd)
        except FileNotFoundError:
            if optional:
                return None
            raise
        try:
            before = identity(fd, name)
            require(before.st_mode & 0o444, f'unreadable file: {name}')
            with os.fdopen(os.dup(fd), 'rb') as source:
                data = source.read()
            after = identity(fd, name)
            require((before.st_size, before.st_mtime_ns, before.st_ctime_ns) ==
                    (after.st_size, after.st_mtime_ns, after.st_ctime_ns), f'file changed while reading: {name}')
            return data
        finally:
            os.close(fd)

    # Test-only crash injection is constrained to an explicitly marked OS-temp root.
    # Exiting simulates process death (including no Python finally cleanup).
    def boundary(label):
        if os.environ.get('EVOLUTION_BOOKKEEP_CRASH_AT') == label:
            marker = os.environ.get('EVOLUTION_BOOKKEEP_TEST_ROOT')
            temp_root = os.path.realpath(tempfile.gettempdir())
            require(marker is not None and os.path.realpath(marker) == root
                    and os.path.commonpath([temp_root, root]) == temp_root and root != temp_root,
                    'fault injection requires explicit isolated OS-temp test root')
            os._exit(86)

    def replace(name, data, label):
        boundaries()
        old = read(name, optional=True)
        mode = stat.S_IMODE(os.stat(name, dir_fd=dfd, follow_symlinks=False).st_mode) if old is not None else 0o600
        # Named temporary files share the pinned directory and are never reused.
        temp = f'.{name}.{os.getpid()}.{os.urandom(8).hex()}.tmp'
        fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode, dir_fd=dfd)
        try:
            with os.fdopen(os.dup(fd), 'wb') as out:
                out.write(data)
                out.flush()
            os.fchmod(fd, mode)
            os.fsync(fd)
            boundary(label + ':file-fsync')
            boundaries()
            require(read(name, optional=True) == old, f'target drift during replacement: {name}')
            os.replace(temp, name, src_dir_fd=dfd, dst_dir_fd=dfd)
            boundary(label + ':rename')
            os.fsync(dfd)
            boundary(label + ':dir-fsync')
        finally:
            os.close(fd)
            try:
                os.unlink(temp, dir_fd=dfd)
            except FileNotFoundError:
                pass

    def persist(journal, label):
        nonlocal journal_bytes
        require(read(JOURNAL, optional=True) == journal_bytes, 'journal drift refuses replacement')
        encoded = (json.dumps(journal, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
        replace(JOURNAL, encoded, label)
        journal_bytes = encoded

    def adoption(tx):
        if tx['adoption_sha256'] is not None:
            require(sha(read('adoption-log.jsonl')) == tx['adoption_sha256'], 'adoption ledger changed since review')

    def validate(journal):
        require(read(JOURNAL, optional=True) == journal_bytes, 'journal drift refuses transaction')
        require(isinstance(journal, dict) and journal.get('version') == 1
                and journal.get('root') == root and journal.get('targets') == TARGETS
                and isinstance(journal.get('transactions'), list) and journal['transactions'], 'stale/invalid journal boundary')
        require(lockfd is not None and journal.get('lock_identity') ==
                {'dev': os.fstat(lockfd).st_dev, 'ino': os.fstat(lockfd).st_ino}, 'journal lock identity changed')
        runs, hashes, previous = set(), set(), None
        for i, tx in enumerate(journal['transactions']):
            require(isinstance(tx, dict) and isinstance(tx.get('run'), str) and tx['run']
                    and isinstance(tx.get('input_sha256'), str) and len(tx['input_sha256']) == 64
                    and tx['run'] not in runs and tx['input_sha256'] not in hashes, 'invalid/duplicate journal identity')
            require(tx.get('status') == 'COMMITTED' or (i == len(journal['transactions']) - 1 and tx.get('status') == 'PREPARED'), 'invalid journal state sequence')
            require('adoption_sha256' in tx and (tx['adoption_sha256'] is None or
                    isinstance(tx['adoption_sha256'], str) and len(tx['adoption_sha256']) == 64), 'invalid adoption journal binding')
            require(set(tx.get('before', {})) == set(TARGETS) and set(tx.get('after', {})) == set(TARGETS), 'invalid journal targets')
            for key in TARGETS:
                decode(tx['before'][key])
                decode(tx['after'][key])
                if previous:
                    require(tx['before'][key] == previous['after'][key], 'discontinuous/stale journal history')
            runs.add(tx['run'])
            hashes.add(tx['input_sha256'])
            previous = tx
        current = {k: read(n) for k, n in TARGETS.items()}
        last = journal['transactions'][-1]
        for key in TARGETS:
            allowed = [decode(last['after'][key])]
            if last['status'] == 'PREPARED':
                allowed.append(decode(last['before'][key]))
            require(current[key] in allowed, f'third-state drift refuses recovery: {TARGETS[key]}')

    def complete(journal):
        tx = journal['transactions'][-1]
        validate(journal)  # Check BOTH target states before touching either.
        adoption(tx)
        for key, name in TARGETS.items():
            boundaries()
            validate(journal)
            adoption(tx)
            desired = decode(tx['after'][key])
            if read(name) != desired:
                replace(name, desired, key)
            # A recovered rename can already be visible without directory durability.
            fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=dfd)
            try:
                identity(fd, name)
                os.fsync(fd)
            finally:
                os.close(fd)
            os.fsync(dfd)
            boundary(key + ':durable')
        validate(journal)
        tx['status'] = 'COMMITTED'
        persist(journal, 'committed')

    try:
        try:
            if dry:
                lockfd = os.open(LOCK, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=dfd)
            else:
                # Separate exclusive creation from open-existing. Concurrent
                # create-or-open with O_NOFOLLOW can return ENOENT on macOS.
                try:
                    lockfd = os.open(LOCK, os.O_RDWR | os.O_NOFOLLOW | os.O_CREAT | os.O_EXCL, 0o600, dir_fd=dfd)
                except FileExistsError:
                    lockfd = os.open(LOCK, os.O_RDWR | os.O_NOFOLLOW, dir_fd=dfd)
        except FileNotFoundError:
            if not dry:
                raise
        if lockfd is not None:
            identity(lockfd, LOCK)
            fcntl.flock(lockfd, fcntl.LOCK_SH if dry else fcntl.LOCK_EX)
            boundaries()
            if not dry:
                os.fsync(lockfd)
                os.fsync(dfd)
        journal_bytes = read(JOURNAL, optional=True)
        journal = json.loads(journal_bytes) if journal_bytes is not None else None
        if journal_bytes is not None:
            validate(journal)
            if journal['transactions'][-1]['status'] == 'PREPARED':
                require(not dry, 'PREPARED transaction requires normal recovery; dry-run writes nothing')
                # Conflicting same-run inputs must not commit a pending transaction.
                require(journal['transactions'][-1]['input_sha256'] == input_hash,
                        'PREPARED transaction belongs to another input; retry the exact recorded input first')
                complete(journal)
            known = next((t for t in journal['transactions'] if t['input_sha256'] == input_hash), None)
            if known:
                adoption(known)
                print(f"{'dry-run: ' if dry else ''}COMMITTED already; idempotent no-op (run={known['run']})")
                return
        before = {key: read(name) for key, name in TARGETS.items()}
        planner = subprocess.run([node, script, '--plan', '--root', root],
                                 input=json.dumps({'input_b64': encode(raw), 'before': {k: encode(v) for k, v in before.items()}}),
                                 text=True, capture_output=True)
        require(planner.returncode == 0, planner.stderr.strip() or 'Node planner failed')
        plan = json.loads(planner.stdout)
        require(plan['input_sha256'] == input_hash, 'planner input hash mismatch')
        require(journal is None or all(t['run'] != plan['run'] for t in journal['transactions']),
                f"same run/different input conflict: {plan['run']} (--force cannot bypass)")
        # Legacy records are deliberately not auto-repaired or guessed into a journal.
        for line in before['log'].decode('utf-8').splitlines():
            if line.strip():
                row = json.loads(line)
                require(not (row.get('run') == plan['run'] and row.get('bookkeep') is True),
                        'legacy same-run record lacks transaction proof; manual reconciliation required')
        after = {key: base64.b64decode(plan['after'][key], validate=True) for key in TARGETS}
        if dry:
            print('dry-run（零写入）\n' + plan['summary'])
        else:
            boundaries()
            require(all(read(name) == before[key] for key, name in TARGETS.items()), 'target drift during planning')
            if journal is None:
                journal = {'version': 1, 'root': root, 'targets': TARGETS, 'transactions': [],
                           'lock_identity': {'dev': os.fstat(lockfd).st_dev, 'ino': os.fstat(lockfd).st_ino}}
            tx = {'run': plan['run'], 'input_sha256': input_hash, 'adoption_sha256': plan['adoption_sha256'],
                  'status': 'PREPARED', 'before': {k: state(v) for k, v in before.items()},
                  'after': {k: state(v) for k, v in after.items()}}
            adoption(tx)
            journal['transactions'].append(tx)
            persist(journal, 'prepared')
            complete(journal)
            print('COMMITTED\n' + plan['summary'])
        for warning in plan['warnings']:
            print(warning, file=sys.stderr)
    finally:
        if lockfd is not None:
            os.close(lockfd)
        os.close(dfd)


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'Bookkeeping refused: {exc}', file=sys.stderr)
        sys.exit(2)
