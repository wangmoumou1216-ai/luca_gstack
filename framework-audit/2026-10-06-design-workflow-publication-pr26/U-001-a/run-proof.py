#!/usr/bin/env python3
"""Retain real CLI outputs and prove guard rejection/lock assertions detect regressions."""
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile

EVIDENCE = pathlib.Path(__file__).resolve().parent
ROOT = EVIDENCE.parents[2]
WRITER = ROOT / '.claude/skills/office/references/write_state.py'
GUARD = ROOT / 'scripts/test-workflow-state-guard.py'


def sha(content):
    return hashlib.sha256(content).hexdigest()


def run(label, writer, case='', partition='writer'):
    command = [sys.executable, str(GUARD), '--writer', str(writer), '--partition', partition,
               '--evidence', str(EVIDENCE / (label + '.json'))]
    if case:
        command.extend(['--case', case])
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
    (EVIDENCE / (label + '.log')).write_text(result.stdout + result.stderr, encoding='utf-8')
    receipt = json.loads((EVIDENCE / (label + '.json')).read_text())
    print(f'{label}: exit={result.returncode}; {receipt["passed"]}/{receipt["total"]} PASS')
    return result.returncode, receipt


def main():
    source = WRITER.read_text(encoding='utf-8')
    frozen = sha(WRITER.read_bytes())
    rc, baseline = run('baseline-replay', EVIDENCE / 'baseline-writer.py')
    assert rc == 1
    baseline_cases = {item['case']: item['status'] for item in baseline['outcomes']}
    for name in ('reject-corrupt-node', 'reject-corrupt-topic', 'reject-corrupt-combined',
                 'concurrency-different-node', 'concurrency-topic-node'):
        assert baseline_cases[name] == 'FAIL'
    rc, green = run('green-real-cli', WRITER, partition='all')
    assert rc == 0 and green['passed'] == green['total']

    permissive_read = '''def read_state():
    try:
        with STATE_FILE.open(encoding='utf-8') as stream:
            return yaml.safe_load(stream) or {}
    except Exception:
        return {}


'''
    read_start = source.index('def read_state():')
    read_end = source.index('def validated_extra(', read_start)
    reject_removed = source[:read_start] + permissive_read + source[read_end:]
    lock_removed = source.replace('from contextlib import contextmanager',
                                  'from contextlib import contextmanager, nullcontext')
    assert source.count('with state_lock(timeout):') == 1
    lock_removed = lock_removed.replace('with state_lock(timeout):', 'with nullcontext():')
    mutations = []
    for label, changed, case in (
        ('mutation-reject', reject_removed, 'reject-corrupt'),
        ('mutation-lock', lock_removed, 'concurrency'),
    ):
        with tempfile.TemporaryDirectory(prefix=label + '-') as directory:
            temporary = pathlib.Path(directory) / 'write_state.py'
            temporary.write_text(changed, encoding='utf-8')
            rc, red = run(label + '-red', temporary, case)
            assert rc == 1 and red['passed'] == 0, f'{label} did not trip all expected assertions'
            assert all(process['exit_code'] == 0 for entry in red['actual_runs']
                       for process in entry.get('processes', [])), 'Mutation failed outside assertions'
            temporary.write_text(source, encoding='utf-8')
            assert sha(temporary.read_bytes()) == frozen
            rc, restored = run(label + '-restored', temporary, case)
            assert rc == 0 and restored['passed'] == restored['total']
        mutations.append({'mutation': label, 'original_sha256': frozen,
                          'mutation_sha256': sha(changed.encode('utf-8')),
                          'expected_partition': case, 'red_exit': 1, 'restored_exit': 0,
                          'temporary_removed': not pathlib.Path(directory).exists()})

    rc, final = run('final-restored-green', WRITER, partition='all')
    assert rc == 0 and final['passed'] == final['total']
    assert sha(WRITER.read_bytes()) == frozen, 'Production source drifted during proof'
    summary = {'work_root': str(ROOT), 'production_writer_sha256': frozen,
               'guard_sha256': sha(GUARD.read_bytes()), 'baseline_exit': 1,
               'green_exit': 0, 'final_exit': 0, 'final_passed': final['passed'],
               'final_total': final['total'], 'mutations': mutations,
               'production_source_unchanged_during_mutations': True}
    (EVIDENCE / 'proof-summary.json').write_text(json.dumps(summary, indent=2) + '\n')


if __name__ == '__main__':
    main()
