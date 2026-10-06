"""Eight boundary checks; emits one JSON result even when an individual check fails.

Run only inside a separately authorized sandbox, with the unchanged P07 input
layout: probe.py, allowed.txt and baseline/.claude/observability/{scripts,rules}.
No permission profile is installed or widened here. Expected EPERM/EACCES at a
denial target is evidence for that check; subprocess launch exceptions are not.
Process termination or an unavailable stdout cannot be converted into JSON.
"""
import errno
import hashlib
import json
from pathlib import Path
import socket
import subprocess
import sys


EXPECTED_RULE_SHA256 = '66a501665fb15b3b5e30fead5a47901d064c92f633e04a9baf9a0d284f86b0b4'
CHECK_IDS = (
    'allowed-read', 'outside-read', 'symlink-escape-denied',
    'readonly-case-write', 'outside-write', 'child-inherits-denial',
    'network-connect-denied', 'baseline-active-rules',
)


def exception_evidence(exc):
    evidence = {'type': type(exc).__name__, 'message': str(exc)}
    if isinstance(exc, OSError):
        evidence.update(errno=exc.errno, filename=exc.filename)
    if isinstance(exc, subprocess.TimeoutExpired):
        evidence['timeout_seconds'] = exc.timeout
        for name in ('stdout', 'stderr'):
            value = getattr(exc, name)
            # TimeoutExpired can contain bytes even when text=True. Keep exact bytes.
            evidence[name] = {'hex': value.hex()} if isinstance(value, bytes) else value
    return evidence


def expect_denied(action):
    try:
        action()
    except OSError as exc:
        denied = exc.errno in (errno.EPERM, errno.EACCES)
        return {'passed': denied, 'errno': exc.errno,
                'expected_denial': denied, 'exception': exception_evidence(exc)}
    return {'passed': False, 'detail': 'unexpectedly allowed'}


def child_denial(outside):
    child = subprocess.run(['/bin/cat', str(outside / 'denied.txt')],
                           text=True, capture_output=True, timeout=5)
    return {'passed': child.returncode != 0 and any(
        message in child.stderr for message in ('Operation not permitted', 'Permission denied')),
        'exit_code': child.returncode, 'stdout': child.stdout, 'stderr': child.stderr}


def network_denial(port):
    def connect():
        with socket.socket() as client:
            client.settimeout(2)
            client.connect(('127.0.0.1', port))
    return expect_denied(connect)


def active_rules(here):
    result = {'passed': False, 'exit_code': None, 'stdout': None, 'stderr': None,
              'stdout_sha256': None, 'expected_sha256': EXPECTED_RULE_SHA256,
              'parse_failure_reported': None, 'failures': []}
    try:
        command = [str(Path(sys.executable).resolve()), '-B',
                   str(here / 'baseline/.claude/observability/scripts/get_rules.py'), 'office', '*']
        result['command'] = command
        loaded = subprocess.run(command, text=True, capture_output=True, timeout=10)
        result.update(exit_code=loaded.returncode, stdout=loaded.stdout, stderr=loaded.stderr)
        if loaded.returncode != 0:
            result['failures'].append('loader_nonzero_exit')
        # The frozen loader emits plain text, not JSON. Its YAML parser fails open
        # with this stderr diagnostic even when its process exits zero.
        result['parse_failure_reported'] = '[get_rules] rules.yaml 解析失败' in loaded.stderr
        if result['parse_failure_reported']:
            result['failures'].append('loader_parse_failure')
        if loaded.stderr != '':
            result['failures'].append('loader_stderr')
        result['stdout_sha256'] = hashlib.sha256(loaded.stdout.encode()).hexdigest()
        if result['stdout_sha256'] != EXPECTED_RULE_SHA256:
            result['failures'].append('loader_hash_mismatch')
        result['passed'] = not result['failures']
    except Exception as exc:
        result['failures'].append('loader_exception')
        result['error'] = exception_evidence(exc)
    return result


def run_checks(here, outside, port, probe_runtime):
    actions = (
        lambda: {'passed': (here / 'allowed.txt').read_text() == 'P06 owned allowed marker\n'},
        lambda: expect_denied(lambda: (outside / 'denied.txt').read_text()),
        lambda: expect_denied(lambda: (probe_runtime / 'escape.txt').read_text()),
        lambda: expect_denied(lambda: (here / 'forbidden-write.txt').write_text('P06 forbidden')),
        lambda: expect_denied(lambda: (outside / 'forbidden-write.txt').write_text('P06 forbidden')),
        lambda: child_denial(outside),
        lambda: network_denial(port),
        lambda: active_rules(here),
    )
    checks = []
    for check_id, action in zip(CHECK_IDS, actions):
        try:
            check = {'id': check_id, **action()}
        except Exception as exc:
            check = {'id': check_id, 'passed': False, 'error': exception_evidence(exc)}
        checks.append(check)
    return checks


def main(argv=None):
    try:
        args = sys.argv[1:] if argv is None else argv
        if len(args) != 3:
            raise ValueError('Expected arguments: outside-directory port probe-runtime-directory')
        outside, port, probe_runtime = Path(args[0]), int(args[1]), Path(args[2])
        if not 1 <= port <= 65535:
            raise ValueError('Port must be in 1..65535')
        checks = run_checks(Path(__file__).resolve().parent, outside, port, probe_runtime)
        result = {'kind': 'P06 native command probe', 'revision': 'R8', 'checks': checks,
                  'passed': all(check['passed'] for check in checks)}
    except Exception as exc:
        result = {'kind': 'P06 native command probe', 'revision': 'R8', 'passed': False,
                  'error': exception_evidence(exc), 'checks': [
                      {'id': check_id, 'passed': False, 'detail': 'not run: setup failed'}
                      for check_id in CHECK_IDS]}
    print(json.dumps(result, sort_keys=True, ensure_ascii=True, allow_nan=False))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
