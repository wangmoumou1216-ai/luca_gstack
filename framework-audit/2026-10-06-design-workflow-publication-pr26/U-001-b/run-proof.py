#!/usr/bin/env python3
"""Freeze caller sources and retain failure-propagation mutation/restoration proof."""
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import tempfile

EVIDENCE = pathlib.Path(__file__).resolve().parent
ROOT = EVIDENCE.parents[2]
GUARD = ROOT / 'scripts/test-workflow-state-guard.py'
SKILLS = ROOT / '.claude/skills/office'
WRITER = SKILLS / 'references/write_state.py'
NAMES = ('idea', 'challenge', 'retro', 'figma-demo', 'evals', 'open-design',
         'html-prototype', 'redteam', 'ux-audit')
WRITER_HASH = 'dcfe5a38ec9d06f0847e1235f302602d947bc2fe4772e4fe7626291a93eacf06'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(label, skills=SKILLS, case='', partition='all'):
    command = [sys.executable, str(GUARD), '--partition', partition,
               '--skills-root', str(skills), '--evidence', str(EVIDENCE / (label + '.json'))]
    if case:
        command.extend(['--case', case])
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
    (EVIDENCE / (label + '.log')).write_text(result.stdout + result.stderr, encoding='utf-8')
    receipt = json.loads((EVIDENCE / (label + '.json')).read_text())
    print(f'{label}: exit={result.returncode}; {receipt["passed"]}/{receipt["total"]} PASS')
    return result.returncode, receipt


def main():
    assert sha(WRITER) == WRITER_HASH, 'Accepted writer changed'
    sources = {name: (SKILLS / name / 'SKILL.md').read_text() for name in NAMES}
    before = {name: sha(SKILLS / name / 'SKILL.md') for name in NAMES}
    before['guard'] = sha(GUARD)
    rc, green = run('green-source-bound')
    assert rc == 0 and green['passed'] == green['total']
    mutation_hashes = {}
    with tempfile.TemporaryDirectory(prefix='workflow-caller-mutation-') as directory:
        copies = pathlib.Path(directory)
        for name, text in sources.items():
            pattern = r'(?m)^([ \t]*)python3 \.claude/skills/office/references/write_state\.py \|\| \{\n.*?^\1\}'
            changed, count = re.subn(pattern, lambda match: match.group(1) +
                'python3 .claude/skills/office/references/write_state.py 2>/dev/null || echo "workflow-state 写入跳过"',
                text, flags=re.S)
            assert count == 1, f'{name}: expected one failure-propagation group'
            path = copies / name / 'SKILL.md'
            path.parent.mkdir()
            path.write_text(changed)
            mutation_hashes[name] = sha(path)
        rc, red = run('mutation-propagation-red', copies, 'replace-failure', 'callers')
        assert rc == 1 and red['passed'] == 0 and red['total'] == 9
        assert all('swallowed failure: exit=0' in item['error'] for item in red['outcomes'])
        assert all(process['exit_code'] == 0 and 'DEPENDENT_PHASE_REACHED' in process['stdout']
                   for fixture in red['actual_runs'] for process in fixture['processes'])
        for name, text in sources.items():
            (copies / name / 'SKILL.md').write_text(text)
            assert sha(copies / name / 'SKILL.md') == before[name]
        rc, restored = run('mutation-propagation-restored', copies, 'replace-failure', 'callers')
        assert rc == 0 and restored['passed'] == restored['total'] == 9
    assert not pathlib.Path(directory).exists()
    rc, final = run('final-restored-green')
    assert rc == 0 and final['passed'] == final['total']
    after = {name: sha(SKILLS / name / 'SKILL.md') for name in NAMES}
    after['guard'] = sha(GUARD)
    assert before == after and sha(WRITER) == WRITER_HASH
    (EVIDENCE / 'proof-summary.json').write_text(json.dumps({
        'work_root': str(ROOT), 'accepted_writer_sha256': WRITER_HASH,
        'source_before': before, 'source_after': after, 'production_sources_unchanged': True,
        'green_exit': 0, 'final_exit': 0, 'final_passed': final['passed'], 'final_total': final['total'],
        'mutation': {'original_sha256': {name: before[name] for name in NAMES},
                     'mutated_sha256': mutation_hashes, 'red_exit': 1, 'red_passed': 0,
                     'red_total': 9, 'restored_exit': 0, 'restored_passed': 9,
                     'temporary_removed': True},
    }, indent=2) + '\n')


if __name__ == '__main__':
    main()
