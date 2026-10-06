from pathlib import Path
import datetime, hashlib, json, os, subprocess, time

E = Path(__file__).resolve().parent
PROMPTS = ['PRD是啥', 'PRD是啥，规划一下', 'PRD是什么，了解其机制']
IDENTITY_ENV = ['LUCA_ACTUAL_HARNESS', 'LUCA_HARNESS_ADAPTED', 'CLAUDE_PROJECT_DIR',
                'CODEX_HOME', 'CODEX_SANDBOX', 'CODEX_SESSION_ID']
STRIP_ENV = IDENTITY_ENV + ['NODE_OPTIONS', 'LUCA_CHILD_SOURCE_ROOT', 'LUCA_PROTECTED_CODE_ROOT',
    'MUSE_HOST_LAUNCH_ID', 'MUSE_HOST_LAUNCH_HANDLE', 'MUSE_HOST_LAUNCH_ENDPOINT',
    'MUSE_HOST_LAUNCH_NONCE', 'MUSE_HOST_RUN_ID', 'MUSE_OPEN_REQUEST_ID',
    'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']

def command(label, argv, root, extra=None, payload=None):
    env = dict(os.environ)
    for field in STRIP_ENV:
        env.pop(field, None)
    overrides = {'LUCA_PROJECTS_ROOT': str(root / 'fixture-projects'),
        'MEMORY_ROOT': str(root / 'fixture-memory'), 'ROUTE_GUARD_DRY_RUN': '0',
        'ROUTE_GUARD_PROJECTS': 'fixture', 'ROUTE_GUARD_CURRENT_PROJECT': 'fixture',
        'ROUTE_GUARD_HEAVY_SKILLS': ''}
    overrides.update(extra or {})
    env.update(overrides)
    start = datetime.datetime.now(datetime.timezone.utc).isoformat()
    clock = time.monotonic()
    result = subprocess.run(argv, cwd=root, env=env,
        input=json.dumps(payload, ensure_ascii=False) if payload is not None else '',
        text=True, capture_output=True, timeout=90)
    elapsed = time.monotonic() - clock
    end = datetime.datetime.now(datetime.timezone.utc).isoformat()
    (E / f'{label}.stdout').write_text(result.stdout)
    (E / f'{label}.stderr').write_text(result.stderr)
    receipt = {'argv': argv, 'cwd': str(root), 'env_overrides': overrides,
        'env_removed': STRIP_ENV, 'input': payload, 'started_at': start, 'ended_at': end,
        'exit': result.returncode, 'elapsed_seconds': round(elapsed, 3),
        'stdout': str(E / f'{label}.stdout'), 'stderr': str(E / f'{label}.stderr')}
    (E / f'{label}.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
    return result

def judge(text, harness, prompt):
    gates = '❓ STOP' in text and '确认或补充' in text and not any(
        value in text for value in ['project.sh', '--tx', 'PROJECT_SWITCH'])
    if '规划一下' in prompt:
        gates = gates and 'Plan Agent 5 条件' in text
    if '了解其机制' in prompt:
        gates = gates and '研究/认知信号' in text
    if harness == 'unknown':
        identity = '当前宿主入口未确定' in text and 'AGENTS.md' not in text and 'CLAUDE.md' not in text
    else:
        wanted = 'AGENTS.md' if harness == 'codex' else 'CLAUDE.md'
        foreign = 'CLAUDE.md' if harness == 'codex' else 'AGENTS.md'
        identity = wanted in text and foreign not in text
    return {'identity_correct': identity, 'original_gates_retained': gates}

rows = []
for condition in ['old', 'candidate']:
    root = E / condition
    for harness in ['codex', 'claude', 'unknown']:
        prompts = PROMPTS if harness != 'unknown' else PROMPTS[:2]
        for index, prompt in enumerate(prompts):
            extra = {} if harness == 'unknown' else {
                'CLAUDE_PROJECT_DIR': str(root), 'LUCA_ACTUAL_HARNESS': harness}
            label = f'{condition}-{harness}-{index}'
            payload = {'prompt': prompt, 'prompt_id': 'protocol-field'}
            result = command(label, ['node', '.claude/hooks/route-guard.mjs'], root, extra, payload)
            verdict = judge(result.stdout, harness, prompt)
            rows.append({'condition': condition, 'harness': harness, 'prompt': prompt,
                'receipt': str(E / f'{label}.json'), 'exit': result.returncode, **verdict})
            assert result.returncode == 0, result.stderr
            assert verdict['original_gates_retained'], label
            if condition == 'candidate':
                assert verdict['identity_correct'], label
            elif harness in ['codex', 'unknown']:
                assert not verdict['identity_correct'], 'Old counterexample did not reproduce'

for condition in ['old', 'candidate']:
    root = E / condition
    for harness in ['codex', 'claude']:
        for index, prompt in enumerate(PROMPTS):
            payload = {'prompt': prompt, 'prompt_id': 'protocol-field',
                       'cwd': str(root), 'hook_event_name': 'UserPromptSubmit'}
            if harness == 'codex':
                argv = ['node', '.codex/host-launch-hook.mjs', str(root / '.claude/hooks/route-guard.mjs')]
                extra = {'LUCA_NATIVE_HOOK_STRICT': '1'}
            else:
                argv = ['node', '.claude/hooks/route-guard.mjs']
                extra = {'CLAUDE_PROJECT_DIR': str(root)}
            label = f'public-{condition}-{harness}-{index}'
            result = command(label, argv, root, extra, payload)
            text = result.stdout
            if harness == 'codex':
                output = json.loads(text)
                assert output['hookSpecificOutput']['hookEventName'] == 'UserPromptSubmit'
                text = output['hookSpecificOutput']['additionalContext']
            verdict = judge(text, harness, prompt)
            rows.append({'condition': condition, 'public_entry': harness, 'prompt': prompt,
                'receipt': str(E / f'{label}.json'), 'exit': result.returncode, **verdict})
            assert result.returncode == 0 and verdict['original_gates_retained'], label
            assert verdict['identity_correct'] == (condition == 'candidate' or harness == 'claude'), label

(E / 'entry-results.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'explicit_entry_operations': len(rows), 'candidate_correct':
    sum(row['condition'] == 'candidate' and row['identity_correct'] for row in rows),
    'old_identity_failures': sum(row['condition'] == 'old' and not row['identity_correct'] for row in rows),
    'all_original_gates_retained': all(row['original_gates_retained'] for row in rows)}, ensure_ascii=False))
