#!/usr/bin/env python3
"""Run the real state CLI against corruption, faults and controlled concurrency.

All nine state callers are extracted from their actual SKILL shell blocks.
Scheduling pauses follow the real YAML read; fault probes target filesystem
primitives, without replacing transaction business logic.
"""
import argparse
import datetime
import fcntl
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile
import time

import yaml

REPO = pathlib.Path(__file__).resolve().parent.parent
SKILLS = REPO / '.claude' / 'skills' / 'office'
WRITER = SKILLS / 'references' / 'write_state.py'
CALLER_NAMES = ('idea', 'challenge', 'retro', 'figma-demo', 'evals', 'open-design',
                'html-prototype', 'redteam', 'ux-audit')
TRACE = []
CURRENT_CASE = ''


def timestamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


GOOD = """topic: 速记
scene: B
iteration: 5
custom:
  retained: true
nodes:
  brainstorm:
    status: DONE
    handoff_path: docs/handoff/kept.md
  design-brief:
    status: DONE
"""
BAD = GOOD + '  bad: [unclosed\n'
MODES = {
    'node': {'_NODE': 'idea', '_STATUS': 'DONE', '_OUTPUT': 'docs/idea/new.md'},
    'topic': {'_TOPIC': 'new-topic', '_SCENE': 'A'},
    'combined': {'_NODE': 'idea', '_STATUS': 'DONE', '_OUTPUT': 'docs/idea/new.md',
                 '_TOPIC': 'new-topic', '_SCENE': 'A'},
}

# sitecustomize loads in an otherwise normal `python writer.py` process.
PROBE = r'''
import os
import datetime
import json
import pathlib
import sys
import time
root = pathlib.Path(os.environ['_PROJECT_ROOT'])
tag = os.environ.get('WF_PROBE_TAG', 'single')
probe = root / '.probe'
probe.mkdir(exist_ok=True)
(probe / (tag + '.identity.json')).write_text(json.dumps({
    'pid': os.getpid(), 'argv': sys.argv, 'cwd': os.getcwd(),
    'data_root': str(root.resolve()),
    'started_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
}))
(probe / (tag + '.identity.' + str(os.getpid()) + '.json')).write_text(
    (probe / (tag + '.identity.json')).read_text())
(probe / (tag + '.started')).touch()
if os.environ.get('WF_PROBE_WRITE_FAIL'):
    import resource
    import signal
    signal.signal(signal.SIGXFSZ, signal.SIG_IGN)
    resource.setrlimit(resource.RLIMIT_FSIZE, (0, resource.getrlimit(resource.RLIMIT_FSIZE)[1]))
import yaml
original_load = yaml.safe_load
def safe_load(*args, **kwargs):
    state = original_load(*args, **kwargs)
    if os.environ.get('WF_PROBE_WRITE_FAIL'):
        return state
    with (probe / (tag + '.loads')).open('a') as stream:
        stream.write('read\n')
    if os.environ.get('WF_PROBE_SCHEDULE') and pathlib.Path(sys.argv[0]).name == 'write_state.py':
        (probe / (tag + '.read')).touch()
        deadline = time.monotonic() + 8
        while not (probe / (tag + '.release')).exists():
            if time.monotonic() > deadline:
                raise RuntimeError('test schedule timed out')
            time.sleep(0.01)
    return state
yaml.safe_load = safe_load
original_replace = os.replace
def replace(source, destination, *args, **kwargs):
    with (probe / (tag + '.replaces')).open('a') as stream:
        stream.write(pathlib.Path(destination).name + '\n')
    if (os.environ.get('WF_PROBE_REPLACE_FAIL') and
            pathlib.Path(destination).name == 'workflow-state.yaml'):
        raise OSError('injected state replace failure')
    return original_replace(source, destination, *args, **kwargs)
os.replace = replace
'''


def caller_block(name):
    path = SKILLS / name / 'SKILL.md'
    candidates = [block for block in re.findall(r'```bash\n(.*?)\n```', path.read_text(), re.S)
                  if 'references/write_state.py' in block or
                  ('baseline_score' in block and 'PYEOF' in block)]
    assert len(candidates) == 1, f'{name}: expected one actual state shell block'
    return path, candidates[0]


def wait_file(path, timeout=4):
    deadline = time.monotonic() + timeout
    while not path.exists():
        if time.monotonic() > deadline:
            raise AssertionError(f'Schedule signal missing: {path.name}')
        time.sleep(0.01)


class Fixture:
    def __init__(self, content=GOOD):
        self.temp = tempfile.TemporaryDirectory(prefix='workflow-state-guard-')
        self.root = pathlib.Path(self.temp.name).resolve()
        self.state = self.root / '.luca' / 'workflow-state.yaml'
        self.topic = self.root / '.luca' / 'current-topic.txt'
        self.state.parent.mkdir()
        if content is not None:
            self.state.write_text(content, encoding='utf-8')
        self.topic.write_text('old-topic', encoding='utf-8')
        self.support = self.root / '.support'
        self.support.mkdir()
        (self.support / 'sitecustomize.py').write_text(PROBE, encoding='utf-8')
        self.processes = []
        self.calls = []
        self.before = self.state.read_text() if self.state.exists() else None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        results = []
        for process, call in zip(self.processes, self.calls):
            if process.poll() is None:
                process.kill()
            self.finish(process)
            identity = self.root / '.probe' / (call['probe']['WF_PROBE_TAG'] + '.identity.json')
            call['actual_identity'] = json.loads(identity.read_text()) if identity.exists() else None
            call['actual_identities'] = [json.loads(path.read_text()) for path in sorted(
                (self.root / '.probe').glob(call['probe']['WF_PROBE_TAG'] + '.identity.*.json'))]
            results.append(call)
        record = {'case': CURRENT_CASE, 'fixture_root': str(self.root),
                  'state_before': self.before,
                  'state_after': self.state.read_text() if self.state.exists() else None,
                  'topic_after': '<directory>' if self.topic.is_dir() else self.topic.read_text()
                  if self.topic.exists() else None, 'processes': results,
                  'artifacts_after': {str(path.relative_to(self.root)): path.read_text()
                                      for path in self.root.glob('docs/**/*') if path.is_file()},
                  'decoy_state_after': (self.root / '.decoy/.luca/workflow-state.yaml').read_text()
                  if (self.root / '.decoy/.luca/workflow-state.yaml').exists() else None}
        self.temp.cleanup()
        record['cleanup'] = {'checked_at': timestamp(), 'fixture_removed': not self.root.exists(),
                             'state_absent': not self.state.exists(),
                             'topic_absent': not self.topic.exists(),
                             'support_absent': not self.support.exists()}
        assert all(record['cleanup'][key] for key in ('fixture_removed', 'state_absent',
                                                     'topic_absent', 'support_absent'))
        TRACE.append(record)

    def start(self, changes, probe=None, command=None, source=None):
        env = dict(os.environ)
        for key in ('_NODE', '_STATUS', '_OUTPUT', '_TOPIC', '_SCENE', '_EXTRA_JSON',
                    '_STATE_LOCK_TIMEOUT_SECONDS', 'WF_PROBE_TAG', 'WF_PROBE_SCHEDULE',
                    'WF_PROBE_WRITE_FAIL', 'WF_PROBE_REPLACE_FAIL'):
            env.pop(key, None)
        env.update({'_PROJECT_ROOT': str(self.root), **changes})
        probe = {'WF_PROBE_TAG': f'call-{len(self.calls) + 1}', **(probe or {})}
        env.update(probe)
        env['PYTHONPATH'] = str(self.support)
        started_at = timestamp()
        command = command or [sys.executable, str(WRITER)]
        process = subprocess.Popen(command, cwd=self.root, env=env,
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.processes.append(process)
        self.calls.append({'argv': command, 'source': source,
                           'pid': process.pid, 'cwd': str(self.root), 'data_root': str(self.root),
                           'started_at': started_at, 'input': changes, 'probe': probe})
        return process

    def start_caller(self, name, changes, probe=None):
        path, block = caller_block(name)
        # A sentinel after the extracted production block detects swallowed failures.
        command = ['bash', '--noprofile', '--norc', '-c', block + '\necho DEPENDENT_PHASE_REACHED\n']
        return self.start(changes, probe, command, {'path': str(path),
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'actual_block': block})

    def run_caller(self, name, changes, probe=None):
        process = self.start_caller(name, changes, probe)
        stdout, stderr = self.finish(process, timeout=10)
        return process.returncode, stdout, stderr

    def finish(self, process, timeout=None):
        call = self.calls[self.processes.index(process)]
        if 'exit_code' not in call:
            stdout, stderr = process.communicate(timeout=timeout)
            call.update({'exit_code': process.returncode, 'stdout': stdout, 'stderr': stderr,
                         'completed_at': timestamp()})
        return call['stdout'], call['stderr']

    def run(self, changes, probe=None):
        process = self.start(changes, probe)
        stdout, stderr = self.finish(process, timeout=10)
        return process.returncode, stdout, stderr

    def load(self):
        return yaml.safe_load(self.state.read_text(encoding='utf-8'))

    def no_temps(self):
        assert not list(self.state.parent.glob('.*.tmp')), 'Transaction temporary file leaked'


def expect_reject(content, changes):
    with Fixture(content) as fixture:
        before, topic = fixture.state.read_bytes(), fixture.topic.read_bytes()
        rc, stdout, stderr = fixture.run(changes)
        assert rc != 0, f'invalid existing state accepted: exit={rc}, stdout={stdout!r}'
        assert fixture.state.read_bytes() == before, 'State bytes changed on rejection'
        assert fixture.topic.read_bytes() == topic, 'Projection changed on rejection'
        assert stderr.strip(), 'Failure was hidden'
        fixture.no_temps()


def valid_case(mode, missing=False):
    with Fixture(None if missing else GOOD) as fixture:
        rc, stdout, stderr = fixture.run(MODES[mode])
        assert rc == 0, f'valid write failed: {stderr}'
        state = fixture.load()
        if not missing:
            assert state['iteration'] == 5 and state['custom'] == {'retained': True}
            assert state['nodes']['brainstorm']['handoff_path'] == 'docs/handoff/kept.md'
            assert state['nodes']['design-brief']['status'] == 'DONE'
        if mode != 'topic':
            assert state['nodes']['idea']['output'] == 'docs/idea/new.md'
            assert state['nodes']['idea']['status'] == 'DONE'
        if mode != 'node':
            assert state['topic'] == 'new-topic' and state['scene'] == 'A'
            assert fixture.topic.read_text() == 'new-topic'
        else:
            assert fixture.topic.read_text() == 'old-topic'
        assert stdout.strip()
        fixture.no_temps()


def extra_case(value, mode):
    with Fixture() as fixture:
        before = fixture.state.read_bytes()
        rc, stdout, stderr = fixture.run({**MODES[mode], '_EXTRA_JSON': value})
        assert rc != 0, f'invalid extra accepted: {value!r}, exit={rc}, stdout={stdout!r}'
        assert fixture.state.read_bytes() == before and fixture.topic.read_text() == 'old-topic'
        assert stderr.strip()
        fixture.no_temps()


def extra_preservation():
    with Fixture() as fixture:
        changes = {**MODES['node'], '_NODE': 'brainstorm', '_EXTRA_JSON':
                   json.dumps({'baseline_score': 85, 'custom_node': {'kept': True}})}
        rc, stdout, stderr = fixture.run(changes)
        assert rc == 0, stderr
        node = fixture.load()['nodes']['brainstorm']
        assert node['handoff_path'] == 'docs/handoff/kept.md'
        assert node['baseline_score'] == 85 and node['custom_node'] == {'kept': True}


def aliases_preserved():
    content = '''custom: &shared
  brainstorm: &node
    status: DONE
    handoff_path: kept.md
  unrelated: *node
nodes: *shared
'''
    with Fixture(content) as fixture:
        rc, stdout, stderr = fixture.run({**MODES['node'], '_NODE': 'brainstorm'})
        assert rc == 0, stderr
        state = fixture.load()
        expected = {'status': 'DONE', 'handoff_path': 'kept.md'}
        assert state['custom']['brainstorm'] == state['custom']['unrelated'] == expected
        assert state['nodes']['unrelated'] == expected
        assert state['nodes']['brainstorm']['output'] == 'docs/idea/new.md'


def supplied_fields_only():
    with Fixture() as fixture:
        rc, stdout, stderr = fixture.run({**MODES['node'], '_STATUS': 'BLOCKED'})
        assert rc == 0, stderr
        rc, stdout, stderr = fixture.run({'_NODE': 'idea', '_EXTRA_JSON': '{"second": true}'})
        assert rc == 0, stderr
        node = fixture.load()['nodes']['idea']
        assert node['status'] == 'BLOCKED' and node['output'] == 'docs/idea/new.md'
        assert node['second'] is True
        rc, stdout, stderr = fixture.run({'_NODE': 'idea', '_OUTPUT': ''})
        assert rc == 0, stderr
        node = fixture.load()['nodes']['idea']
        assert node['output'] == '' and node['status'] == 'BLOCKED' and node['second'] is True


def new_node_defaults():
    with Fixture() as fixture:
        rc, stdout, stderr = fixture.run({'_NODE': 'idea'})
        assert rc == 0, stderr
        node = fixture.load()['nodes']['idea']
        assert node['status'] == 'DONE' and node['output'] == ''


def stable_lock_inode():
    with Fixture('{}\n') as fixture:
        rc, stdout, stderr = fixture.run(MODES['node'])
        assert rc == 0, stderr
        lock = fixture.state.parent / 'workflow-state.lock'
        before = lock.stat().st_ino
        rc, stdout, stderr = fixture.run(MODES['combined'])
        assert rc == 0 and lock.stat().st_ino == before, stderr


def one_combined_transaction():
    with Fixture() as fixture:
        rc, stdout, stderr = fixture.run(MODES['combined'], {'WF_PROBE_TAG': 'combined'})
        assert rc == 0, stderr
        assert (fixture.root / '.probe/combined.loads').read_text().splitlines() == ['read']
        assert (fixture.root / '.probe/combined.replaces').read_text().splitlines() == [
            'workflow-state.yaml', 'current-topic.txt']


def state_failure(kind):
    with Fixture() as fixture:
        before = fixture.state.read_bytes()
        probe = {'WF_PROBE_TAG': kind, 'WF_PROBE_' + kind.upper() + '_FAIL': '1'}
        rc, stdout, stderr = fixture.run(MODES['combined'], probe)
        assert rc != 0, f'{kind} fault ignored'
        assert fixture.state.read_bytes() == before and fixture.topic.read_text() == 'old-topic'
        assert 'workflow-state updated:' not in stdout and 'topic set:' not in stdout
        assert stderr.strip()
        fixture.no_temps()


def projection_failure():
    with Fixture() as fixture:
        fixture.topic.unlink()
        fixture.topic.mkdir()
        rc, stdout, stderr = fixture.run(MODES['combined'])
        assert rc != 0 and 'state committed / projection stale' in stderr, stderr
        assert 'workflow-state updated:' not in stdout and 'topic set:' not in stdout
        state = fixture.load()
        assert state['topic'] == 'new-topic' and state['nodes']['idea']['status'] == 'DONE'
        assert state['iteration'] == 5
        fixture.no_temps()
        fixture.topic.rmdir()
        rc, stdout, stderr = fixture.run(MODES['topic'])
        assert rc == 0 and fixture.topic.read_text() == 'new-topic', stderr
        assert fixture.load()['nodes']['idea']['status'] == 'DONE'


def concurrency(kind):
    with Fixture() as fixture:
        first = {**MODES['node'], '_NODE': 'idea', '_EXTRA_JSON': '{"first": true}'}
        second = {**MODES['node'], '_NODE': 'redteam'}
        if kind == 'topic-node':
            first = MODES['topic']
        elif kind == 'same-node':
            second = {**MODES['node'], '_NODE': 'idea', '_STATUS': 'BLOCKED',
                      '_OUTPUT': 'second.md', '_EXTRA_JSON': '{"second": true}'}
        elif kind == 'topic-topic':
            first, second = MODES['combined'], {'_TOPIC': 'second-topic', '_SCENE': 'C'}
        a = fixture.start(first, {'WF_PROBE_TAG': 'a', 'WF_PROBE_SCHEDULE': '1'})
        probe = fixture.root / '.probe'
        wait_file(probe / 'a.read')
        b = fixture.start(second, {'WF_PROBE_TAG': 'b', 'WF_PROBE_SCHEDULE': '1'})
        wait_file(probe / 'b.started')
        # A owns the first read. An unlocked B reads the same old snapshot here.
        deadline = time.monotonic() + 0.4
        while not (probe / 'b.read').exists() and time.monotonic() < deadline:
            time.sleep(0.01)
        (probe / 'a.release').touch()
        a_out, a_err = fixture.finish(a, timeout=4)
        wait_file(probe / 'b.read')
        (probe / 'b.release').touch()
        b_out, b_err = fixture.finish(b, timeout=4)
        assert a.returncode == b.returncode == 0, (a_err, b_err)
        state = fixture.load()
        assert state['iteration'] == 5 and state['custom'] == {'retained': True}
        if kind == 'different-node':
            assert 'idea' in state['nodes'] and 'redteam' in state['nodes'], 'Concurrent node lost'
        elif kind == 'topic-node':
            assert state['topic'] == 'new-topic' and 'redteam' in state['nodes'], 'Concurrent topic lost'
            assert fixture.topic.read_text() == state['topic']
        elif kind == 'same-node':
            node = state['nodes']['idea']
            assert node['status'] == 'BLOCKED' and node['output'] == 'second.md'
            assert node['first'] is True and node['second'] is True, 'Same-node patch lost'
        else:
            assert 'idea' in state['nodes'] and state['topic'] == 'second-topic'
            assert fixture.topic.read_text() == state['topic']
        fixture.no_temps()


def lock_timeout():
    with Fixture() as fixture:
        before = fixture.state.read_bytes()
        with (fixture.state.parent / 'workflow-state.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            started = time.monotonic()
            rc, stdout, stderr = fixture.run({**MODES['combined'], '_STATE_LOCK_TIMEOUT_SECONDS': '0.15'})
            elapsed = time.monotonic() - started
            assert rc != 0 and 'lock timeout' in stderr, stderr
            assert 0.1 <= elapsed < 3, f'Lock wait not bounded: {elapsed}'
            assert fixture.state.read_bytes() == before and fixture.topic.read_text() == 'old-topic'
        rc, stdout, stderr = fixture.run(MODES['combined'])
        assert rc == 0, stderr


def process_exit_releases_lock():
    with Fixture() as fixture:
        before = fixture.state.read_bytes()
        process = fixture.start(MODES['node'], {'WF_PROBE_TAG': 'killed', 'WF_PROBE_SCHEDULE': '1'})
        wait_file(fixture.root / '.probe/killed.read')
        process.kill()
        fixture.finish(process, timeout=4)
        assert fixture.state.read_bytes() == before
        rc, stdout, stderr = fixture.run(MODES['combined'])
        assert rc == 0, stderr
        assert fixture.load()['nodes']['idea']['status'] == 'DONE'
        fixture.no_temps()


def timeout_invalid(value):
    with Fixture() as fixture:
        before = fixture.state.read_bytes()
        rc, stdout, stderr = fixture.run({**MODES['combined'], '_STATE_LOCK_TIMEOUT_SECONDS': value})
        assert rc != 0 and fixture.state.read_bytes() == before, f'Invalid lock timeout accepted: {value}'
        assert fixture.topic.read_text() == 'old-topic' and stderr.strip()


def prepare_caller(fixture, name, with_node=True, score='85'):
    writer = fixture.root / '.claude/skills/office/references/write_state.py'
    writer.parent.mkdir(parents=True)
    writer.symlink_to(WRITER)
    decoy = fixture.root / '.decoy/.luca'
    decoy.mkdir(parents=True)
    (decoy / 'workflow-state.yaml').write_text(GOOD)
    (decoy / 'current-topic.txt').write_text('decoy-topic')
    for filename in ('workflow-state.yaml', 'current-topic.txt'):
        (fixture.root / '.claude' / filename).symlink_to(decoy / filename)
    (fixture.root / '.shared-project').symlink_to(decoy.parent)
    if with_node and fixture.state.exists():
        try:
            state = fixture.load()
        except yaml.YAMLError:
            state = None
        if isinstance(state, dict):
            state['nodes']['ux-audit'] = {'status': 'PENDING', 'output': 'old.md', 'custom_node': 'kept'}
            fixture.state.write_text(yaml.safe_dump(state, allow_unicode=True))
    date = time.strftime('%Y-%m-%d')
    if name in ('figma-demo', 'html-prototype', 'open-design'):
        relative = f'docs/prototype/{date}-t/index.html'
    else:
        directory = {'idea': 'idea', 'challenge': 'prd', 'retro': 'retro', 'evals': 'evals',
                     'redteam': 'redteam', 'ux-audit': 'evaluation'}[name]
        relative = f'docs/{directory}/{date}-t-{name}.md'
    artifact = fixture.root / relative
    artifact.parent.mkdir(parents=True, exist_ok=True)
    artifact.write_text(f'综合 UX 得分：{score}/100（完整评分）\n' if name == 'ux-audit'
                        else 'generated artifact must survive\n')
    fixture.before = fixture.state.read_text() if fixture.state.exists() else None
    return artifact, relative


def caller_case(name, kind):
    with Fixture(BAD if kind == 'corrupt' else GOOD) as fixture:
        artifact, relative = prepare_caller(fixture, name)
        artifact_before = artifact.read_bytes()
        before, topic = fixture.state.read_bytes(), fixture.topic.read_bytes()
        env = {'_TOPIC': 't', '_SCENE': 'C'}
        probe = None
        if kind == 'replace-failure':
            probe = {'WF_PROBE_REPLACE_FAIL': '1'}
        elif kind == 'unbound':
            env['_PROJECT_ROOT'] = ''
        elif kind == 'shared-alias':
            env['_PROJECT_ROOT'] = str(fixture.root / '.shared-project')
        rc, stdout, stderr = fixture.run_caller(name, env, probe)
        assert artifact.read_bytes() == artifact_before, 'Generated artifact was removed or changed'
        assert (fixture.root / '.decoy/.luca/workflow-state.yaml').read_text() == GOOD, 'Shared state alias changed'
        assert (fixture.root / '.decoy/.luca/current-topic.txt').read_text() == 'decoy-topic', 'Shared topic alias changed'
        if kind == 'valid':
            assert rc == 0, stderr
            state = fixture.load()
            assert state['iteration'] == 5 and state['custom'] == {'retained': True}
            assert state['nodes']['brainstorm']['handoff_path'] == 'docs/handoff/kept.md'
            assert state['nodes'][name]['status'] == 'DONE' and state['nodes'][name]['output'] == relative
            if name == 'ux-audit':
                assert state['nodes'][name]['baseline_score'] == 85
                assert state['nodes'][name]['custom_node'] == 'kept'
            if name == 'figma-demo':
                assert state['nodes'][name]['blueprint'] == relative.replace('index.html', 'blueprint.yaml')
            assert 'DEPENDENT_PHASE_REACHED' in stdout
        else:
            assert rc != 0, f'{name} {kind} swallowed failure: exit={rc}, stdout={stdout!r}'
            assert stderr.strip(), f'{name} {kind} hid stderr'
            assert 'DEPENDENT_PHASE_REACHED' not in stdout, 'Dependent phase continued after state failure'
            assert fixture.state.read_bytes() == before and fixture.topic.read_bytes() == topic
        fixture.no_temps()


def idea_scene(known):
    with Fixture() as fixture:
        prepare_caller(fixture, 'idea')
        before = fixture.topic.read_text()
        rc, stdout, stderr = fixture.run_caller('idea', {'_TOPIC': 't', '_SCENE': 'A' if known else 'unknown'})
        assert rc == 0, stderr
        if known:
            assert fixture.load()['topic'] == 't' and fixture.topic.read_text() == 't'
        else:
            assert fixture.load()['topic'] == '速记' and fixture.topic.read_text() == before
        assert 'idea' in fixture.load()['nodes']


def ux_no_node(missing=False):
    with Fixture(None if missing else GOOD) as fixture:
        prepare_caller(fixture, 'ux-audit', with_node=False)
        before = fixture.state.read_bytes() if fixture.state.exists() else None
        rc, stdout, stderr = fixture.run_caller('ux-audit', {'_TOPIC': 't', '_SCENE': 'C'})
        assert rc == 0, stderr
        assert (fixture.state.read_bytes() if fixture.state.exists() else None) == before
        assert fixture.topic.read_text() == 'old-topic'
        assert (fixture.root / '.decoy/.luca/workflow-state.yaml').read_text() == GOOD
        assert (fixture.root / '.decoy/.luca/current-topic.txt').read_text() == 'decoy-topic'
        assert 'DEPENDENT_PHASE_REACHED' in stdout


def ux_invalid_score(value):
    with Fixture() as fixture:
        artifact, relative = prepare_caller(fixture, 'ux-audit', score=value)
        if value == 'incomplete':
            artifact.write_text('综合 UX 得分：85/100（不完整评分）\n')
        elif value == 'ambiguous':
            artifact.write_text('综合 UX 得分：85/100（完整评分）\n综合 UX 得分：84/100（完整评分）\n')
        elif value == 'missing-report':
            artifact.unlink()
        before = fixture.state.read_bytes()
        rc, stdout, stderr = fixture.run_caller('ux-audit', {'_TOPIC': 't', '_SCENE': 'C'})
        assert rc != 0 and stderr.strip(), f'Invalid baseline accepted: {value}'
        assert fixture.state.read_bytes() == before and fixture.topic.read_text() == 'old-topic'
        assert 'DEPENDENT_PHASE_REACHED' not in stdout


def ux_mixed_write():
    with Fixture() as fixture:
        prepare_caller(fixture, 'ux-audit')
        a = fixture.start_caller('ux-audit', {'_TOPIC': 't', '_SCENE': 'C'},
                                 {'WF_PROBE_TAG': 'a', 'WF_PROBE_SCHEDULE': '1'})
        probe = fixture.root / '.probe'
        wait_file(probe / 'a.read')
        b = fixture.start({**MODES['node'], '_NODE': 'redteam'},
                          {'WF_PROBE_TAG': 'b', 'WF_PROBE_SCHEDULE': '1'})
        wait_file(probe / 'b.started')
        deadline = time.monotonic() + 0.4
        while not (probe / 'b.read').exists() and time.monotonic() < deadline:
            time.sleep(0.01)
        (probe / 'a.release').touch()
        a_out, a_err = fixture.finish(a, timeout=4)
        wait_file(probe / 'b.read')
        (probe / 'b.release').touch()
        b_out, b_err = fixture.finish(b, timeout=4)
        assert a.returncode == b.returncode == 0, (a_err, b_err)
        state = fixture.load()
        assert state['nodes']['ux-audit']['baseline_score'] == 85 and 'redteam' in state['nodes']
        assert state['nodes']['ux-audit']['custom_node'] == 'kept'
        assert state['topic'] == 't' and fixture.topic.read_text() == 't'
        fixture.no_temps()


def main():
    global WRITER, SKILLS, CURRENT_CASE
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--writer', type=pathlib.Path, default=WRITER,
                        help='Exclusive temporary production-source copy for mutations')
    parser.add_argument('--partition', choices=('all', 'writer', 'callers'), default='all')
    parser.add_argument('--skills-root', type=pathlib.Path, default=SKILLS,
                        help='Exclusive temporary SKILL source copies for caller mutations')
    parser.add_argument('--case', default='', help='Run case names containing this string')
    parser.add_argument('--evidence', type=pathlib.Path, help='Save actual subprocess inputs/results')
    args = parser.parse_args()
    WRITER = args.writer.resolve(strict=True)
    SKILLS = args.skills_root.resolve(strict=True)
    frozen_hashes = {'writer': hashlib.sha256(WRITER.read_bytes()).hexdigest(),
                     'guard': hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()}
    if args.partition in ('all', 'callers'):
        frozen_hashes.update({name: hashlib.sha256((SKILLS / name / 'SKILL.md').read_bytes()).hexdigest()
                              for name in CALLER_NAMES})
    suite_started_at = timestamp()
    cases = []
    if args.partition in ('all', 'writer'):
        for mode in MODES:
            cases.extend([(f'valid-{mode}', lambda m=mode: valid_case(m)),
                          (f'missing-{mode}', lambda m=mode: valid_case(m, True))])
        malformed = {
            'corrupt': BAD, 'empty': '', 'null': 'null\n', 'list': '[]\n', 'scalar': 'value\n',
            'nodes-null': 'nodes: null\n', 'nodes-list': 'nodes: []\n',
            'node-null': 'nodes:\n  idea: null\n', 'node-list': 'nodes:\n  idea: []\n',
            'other-node-scalar': 'nodes:\n  unrelated: invalid\n',
        }
        for shape, content in malformed.items():
            for mode, changes in MODES.items():
                cases.append((f'reject-{shape}-{mode}', lambda c=content, e=changes: expect_reject(c, e)))
        for value in ('{broken', '[]', 'null', '"string"', ''):
            for mode in MODES:
                cases.append((f'extra-invalid-{value!r}-{mode}', lambda v=value, m=mode: extra_case(v, m)))
        cases.extend([('extra-preservation', extra_preservation),
                      ('yaml-alias-preservation', aliases_preserved),
                      ('same-node-supplied-fields', supplied_fields_only),
                      ('new-node-defaults', new_node_defaults),
                      ('lock-stable-inode', stable_lock_inode),
                      ('combined-single-transaction', one_combined_transaction),
                      ('state-write-failure', lambda: state_failure('write')),
                      ('state-replace-failure', lambda: state_failure('replace')),
                      ('projection-failure-repair', projection_failure),
                      ('lock-timeout', lock_timeout), ('lock-process-exit', process_exit_releases_lock)])
        for kind in ('different-node', 'topic-node', 'same-node', 'topic-topic'):
            cases.append((f'concurrency-{kind}', lambda k=kind: concurrency(k)))
        for value in ('-1', '0', 'nan', 'inf', 'invalid', '61'):
            cases.append((f'lock-invalid-timeout-{value}', lambda v=value: timeout_invalid(v)))
    if args.partition in ('all', 'callers'):
        for name in CALLER_NAMES:
            for kind in ('corrupt', 'replace-failure', 'valid', 'unbound', 'shared-alias'):
                cases.append((f'caller-{name}-{kind}', lambda n=name, k=kind: caller_case(n, k)))
        cases.extend([('caller-idea-known-scene', lambda: idea_scene(True)),
                      ('caller-idea-unknown-scene', lambda: idea_scene(False)),
                      ('caller-ux-standalone-no-node', ux_no_node),
                      ('caller-ux-standalone-no-state', lambda: ux_no_node(True)),
                      ('caller-ux-mixed-write', ux_mixed_write)])
        for value in ('UNKNOWN', '85.5', '101', 'incomplete', 'ambiguous', 'missing-report'):
            cases.append((f'caller-ux-score-{value}', lambda v=value: ux_invalid_score(v)))
    selected = [(name, run) for name, run in cases if args.case in name]
    if not selected:
        parser.error('No matching case')
    failed = 0
    outcomes = []
    for name, run in selected:
        CURRENT_CASE = name
        try:
            run()
            print(f'[PASS] {name}')
            outcomes.append({'case': name, 'status': 'PASS'})
        except Exception as error:
            failed += 1
            print(f'[FAIL] {name}: {type(error).__name__}: {error}')
            outcomes.append({'case': name, 'status': 'FAIL', 'error': f'{type(error).__name__}: {error}'})
    final_hashes = {'writer': hashlib.sha256(WRITER.read_bytes()).hexdigest(),
                    'guard': hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()}
    if args.partition in ('all', 'callers'):
        final_hashes.update({name: hashlib.sha256((SKILLS / name / 'SKILL.md').read_bytes()).hexdigest()
                             for name in CALLER_NAMES})
    drift = frozen_hashes != final_hashes
    if drift:
        failed += 1
        print('[FAIL] source hashes drifted during suite')
    print(f'\n=== workflow-state guard: {len(selected) - failed}/{len(selected)} PASS; '
          f'{"ALL PASS" if not failed else str(failed) + " FAILED"} ===')
    if args.evidence:
        args.evidence.write_text(json.dumps({
            'writer': str(WRITER), 'writer_sha256': frozen_hashes['writer'],
            'guard_sha256': frozen_hashes['guard'], 'source_integrity': {
                'before': frozen_hashes, 'after': final_hashes, 'drift': drift},
            'started_at': suite_started_at, 'completed_at': timestamp(),
            'passed': len(selected) - failed, 'total': len(selected), 'exit_code': 1 if failed else 0,
            'outcomes': outcomes, 'actual_runs': TRACE,
        }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
