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
from pathlib import Path

PROJECT_ROOT = os.environ.get('_PROJECT_ROOT', '')
if not PROJECT_ROOT or not os.path.isabs(PROJECT_ROOT):
    raise SystemExit('_PROJECT_ROOT must be an absolute, already-resolved project root')
PROJECT_ROOT_PATH = Path(PROJECT_ROOT).resolve(strict=True)
STATE_FILE = PROJECT_ROOT_PATH / '.luca' / 'workflow-state.yaml'
TOPIC_FILE = PROJECT_ROOT_PATH / '.luca' / 'current-topic.txt'


def ensure_state_parent():
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)

def write_state(node, status, output='', extra=None):
    ensure_state_parent()
    try:
        with open(STATE_FILE) as f:
            state = yaml.safe_load(f) or {}
    except Exception:
        state = {}

    state.setdefault('nodes', {}).setdefault(node, {})
    state['nodes'][node]['status'] = status
    state['nodes'][node]['output'] = output
    state['nodes'][node]['completed_at'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

    if extra:
        for k, v in extra.items():
            state['nodes'][node][k] = v

    extra_json = os.environ.get('_EXTRA_JSON')
    if extra_json:
        try:
            for k, v in json.loads(extra_json).items():
                state['nodes'][node][k] = v
        except Exception:
            pass

    state['last_updated'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

    with open(STATE_FILE, 'w') as f:
        yaml.dump(state, f, allow_unicode=True, default_flow_style=False)

    print(f'workflow-state updated: {node} → {status}')


def set_topic(topic, scene):
    ensure_state_parent()
    try:
        with open(STATE_FILE) as f:
            state = yaml.safe_load(f) or {}
    except Exception:
        state = {}

    state['topic'] = topic
    state['scene'] = scene
    state['last_updated'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

    with open(STATE_FILE, 'w') as f:
        yaml.dump(state, f, allow_unicode=True, default_flow_style=False)

    # 同时写 current-topic.txt
    with open(TOPIC_FILE, 'w') as f:
        f.write(topic)

    print(f'topic set: {topic}, scene: {scene}')


if __name__ == '__main__':
    node = os.environ.get('_NODE', '')
    status = os.environ.get('_STATUS', 'DONE')
    output = os.environ.get('_OUTPUT', '')
    topic = os.environ.get('_TOPIC', '')
    scene = os.environ.get('_SCENE', '')

    if topic and scene:
        set_topic(topic, scene)

    if node:
        write_state(node, status, output)
