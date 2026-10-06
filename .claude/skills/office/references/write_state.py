#!/usr/bin/env python3
"""
workflow-state 写入工具
用法：
  export _PROJECT_ROOT="/absolute/resolved/project/root"
  export _TOPIC="customer-list-filter"
  export _SCENE="A"
  export _NODE="brainstorm"
  export _STATUS="DONE"
  export _OUTPUT="docs/prd/2025-01-01-customer-list-filter-prd.md"
  python3 .claude/skills/office/references/write_state.py
"""

import yaml
import datetime
import os
import sys
import json
import math
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path

try:
    import fcntl
except ImportError:
    fcntl = None

PROJECT_ROOT = os.environ.get('_PROJECT_ROOT', '')
if not PROJECT_ROOT or not os.path.isabs(PROJECT_ROOT):
    raise SystemExit('_PROJECT_ROOT must be an absolute, already-resolved project root')
PROJECT_ROOT_PATH = Path(PROJECT_ROOT).resolve(strict=True)
STATE_FILE = PROJECT_ROOT_PATH / '.luca' / 'workflow-state.yaml'
TOPIC_FILE = PROJECT_ROOT_PATH / '.luca' / 'current-topic.txt'
LOCK_FILE = PROJECT_ROOT_PATH / '.luca' / 'workflow-state.lock'
UNSET = object()


class ProjectionStaleError(RuntimeError):
    """The source of truth committed, but its display projection did not."""


def ensure_state_parent():
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)


def read_state():
    try:
        with STATE_FILE.open(encoding='utf-8') as stream:
            state = yaml.safe_load(stream)
    except FileNotFoundError:
        return {}
    if not isinstance(state, dict):
        raise ValueError('existing workflow-state must be a mapping (empty/null is invalid)')
    if 'nodes' in state:
        if not isinstance(state['nodes'], dict):
            raise ValueError('existing workflow-state.nodes must be a mapping')
        if any(not isinstance(value, dict) for value in state['nodes'].values()):
            raise ValueError('every existing workflow-state node must be a mapping')
    return state


def validated_extra(extra):
    if extra is not None and not isinstance(extra, dict):
        raise ValueError('extra must be an object')
    patch = dict(extra or {})
    if '_EXTRA_JSON' in os.environ:
        parsed = json.loads(os.environ['_EXTRA_JSON'])
        if not isinstance(parsed, dict):
            raise ValueError('_EXTRA_JSON must be a JSON object')
        patch.update(parsed)
    return patch


def lock_timeout():
    timeout = float(os.environ.get('_STATE_LOCK_TIMEOUT_SECONDS', '5'))
    if not math.isfinite(timeout) or not 0 < timeout <= 60:
        raise ValueError('_STATE_LOCK_TIMEOUT_SECONDS must be finite and within (0, 60]')
    return timeout


@contextmanager
def state_lock(timeout):
    if fcntl is None:
        raise RuntimeError('workflow-state locking unsupported on this platform')
    # This inode stays stable across state replaces and is never unlinked on exit.
    with LOCK_FILE.open('a') as lock:
        deadline = time.monotonic() + timeout
        while True:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError(f'workflow-state lock timeout after {timeout:g}s')
                time.sleep(min(0.05, remaining))
        try:
            yield
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


def atomic_write(target, content):
    fd, temporary = tempfile.mkstemp(prefix=f'.{target.name}.', suffix='.tmp', dir=target.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, target)
    finally:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


def update_state(node='', status=UNSET, output=UNSET, extra=None, topic='', scene=''):
    patch = validated_extra(extra)
    timeout = lock_timeout()
    if not node and not (topic and scene):
        return
    if fcntl is None:
        raise RuntimeError('workflow-state locking unsupported on this platform')
    ensure_state_parent()
    with state_lock(timeout):
        state = read_state()
        now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        if topic and scene:
            state['topic'] = topic
            state['scene'] = scene
        if node:
            # YAML aliases may share these mappings with unrelated fields/nodes.
            nodes = dict(state.get('nodes', {}))
            target = dict(nodes.get(node, {}))
            if status is UNSET:
                target.setdefault('status', 'DONE')
            else:
                target['status'] = status
            if output is UNSET:
                target.setdefault('output', '')
            else:
                target['output'] = output
            target['completed_at'] = now
            target.update(patch)
            nodes[node] = target
            state['nodes'] = nodes
        state['last_updated'] = now
        content = yaml.safe_dump(state, allow_unicode=True, default_flow_style=False)
        atomic_write(STATE_FILE, content)
        # State is authoritative; a failed projection never rolls its commit back.
        if topic and scene:
            try:
                atomic_write(TOPIC_FILE, topic)
            except OSError as error:
                raise ProjectionStaleError(f'state committed / projection stale: {error}') from error
    if topic and scene:
        print(f'topic set: {topic}, scene: {scene}')
    if node:
        print(f"workflow-state updated: {node} → {target['status']}")


def write_state(node, status, output=UNSET, extra=None):
    update_state(node=node, status=status, output=output, extra=extra)


def set_topic(topic, scene):
    update_state(topic=topic, scene=scene)


if __name__ == '__main__':
    node = os.environ.get('_NODE', '')
    status = os.environ.get('_STATUS', UNSET)
    output = os.environ.get('_OUTPUT', UNSET)
    topic = os.environ.get('_TOPIC', '')
    scene = os.environ.get('_SCENE', '')

    try:
        update_state(node=node, status=status, output=output, topic=topic, scene=scene)
    except ProjectionStaleError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except (OSError, ValueError, RuntimeError, yaml.YAMLError) as error:
        print(f'workflow-state not committed: {error}', file=sys.stderr)
        sys.exit(1)
