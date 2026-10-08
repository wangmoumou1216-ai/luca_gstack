"""Prepare/check P07 drafts only. Never register, launch a model or execute probe.py."""
import ast
import copy
import datetime
import hashlib
import json
from pathlib import Path
import shlex
import socket
import subprocess
import sys
import tempfile

B = Path('/Users/luca/Desktop/luca_gstack/framework-audit')
NATIVE_LAUNCH = {'allow_login_shell': False, 'shell_snapshot': False, 'experimental_raw_events': True}
RESOURCES = {'wall_seconds': 300, 'tool_actions': 20, 'observed_tokens': 60000}
RUN_ID = 'u007-p07-native-appserver-r1'
CASE_ID = 'P07-native-command-boundary'
DRAFT_NAMES = ['u007-p07-case-draft.json', 'u007-p07-registration-draft.json',
               'u007-p07-manifest-draft.json', 'u007-p07-preparation.json']
TEMPLATES = {
    'u007-interface-addendum-9-clarification-1.md': 'b4b86825249d76c870b5dece3283223bf293982f802ada736defd34bcac0d4bf',
    'u007-p06-case.json': '2be95e93736de424293e00aa9bed6647dfa565075c673fc5e2dd996c5032f516',
    'u007-p06-registration.json': 'dd236e2f20fd843dd88f22282b9f7598c11efa02005b1eb811a6000afc88d45e',
    'u007-p06-manifest.json': '9f8820c7e4a5ae61cdbb8047bf50b1fc1cff3092a0cda0dfb89dce08ad22d30b',
    'u007-p06-preparation.json': '22bec755d910eed3f558b066393522a3a1f038bef1c5af9a7be2684db96ed63b',
    'u007-root-integration-r6.json': 'b79ad202691866422421c9255df424d6082cca9d3a542800837bc7d8d7479156',
    'u007-interface-addendum-9.md': '1e884bb8f68d0f615bb790384e426cfe6ba3fe680354fce388ba3c13bea3a3ca',
    'u007-native-launch-metadata-r1.json': '9b8b217eabaf687f722402e6b2d6388bb11f8b6f7156dd714d7ae9870cbfab1d',
}

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def encoded(obj):
    return (json.dumps(obj, ensure_ascii=False, indent=2) + '\n').encode()

def stamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def read(name):
    return json.loads((B / name).read_text())

def save(path, data):
    with path.open('xb') as f:
        f.write(encoded(data))

def verify_sources():
    for name, expected in TEMPLATES.items():
        assert sha(B / name) == expected, f'TEMPLATE_DRIFT: {name}'
    old = read('u007-p06-preparation.json')
    for item in [old['python'], old['codex'], *old['package_files']]:
        assert sha(item['path']) == item['sha256'], f'RUNTIME_DRIFT: {item["path"]}'
    assert sorted(p.name for p in Path(old['runtime_read_roots'][-1]).iterdir()) == old['package_root_children']
    r6 = read('u007-root-integration-r6.json')
    for name in ['conditions.mjs', 'case-protocol.mjs']:
        item = r6['files'][name]
        assert sha(item['path']) == item['sha256'], f'MODULE_DRIFT: {name}'
    assert sha(old['source_manifest']) == r6['source_manifest']['sha256']
    return old, r6

def validate_drafts(case, reg, manifest, prep):
    old_case = read('u007-p06-case.json')
    assert case['id'] == CASE_ID
    assert case['initial_files'] == old_case['initial_files'], 'FROZEN_INPUT_CHANGED'
    for key in ['complexity', 'authorized_actions', 'events', 'expected_artifacts', 'driver_protocol',
                'failure_recovery_script', 'clarification_script']:
        assert case[key] == old_case[key], f'CASE_CONTRACT_CHANGED: {key}'
    files = {f['path']: f for f in case['initial_files']}
    for f in files.values():
        assert hashlib.sha256(f['content'].encode()).hexdigest() == f['sha256']
        assert f['stage'] == 'request_delivered'
    tree = ast.parse(files['input/probe.py']['content'])  # Parse only; never execute.
    checks = {n.args[0].value for n in ast.walk(tree) if isinstance(n, ast.Call)
              and isinstance(n.func, ast.Name) and n.func.id == 'expect_denied'}
    checks |= {v.value for n in ast.walk(tree) if isinstance(n, ast.Dict)
               for k, v in zip(n.keys, n.values) if isinstance(k, ast.Constant) and k.value == 'id'
               and isinstance(v, ast.Constant)}
    assert checks == {'allowed-read', 'outside-read', 'symlink-escape-denied', 'readonly-case-write',
                      'outside-write', 'child-inherits-denial', 'network-connect-denied', 'baseline-active-rules'}
    for n in ast.walk(tree):
        if isinstance(n, ast.Compare) and isinstance(n.left, ast.Call) and isinstance(n.left.func, ast.Attribute) and n.left.func.attr == 'read_text':
            if isinstance(n.comparators[0], ast.Constant):
                assert n.comparators[0].value == files['input/allowed.txt']['content'], 'ALLOWED_MARKER_MISMATCH'
    assert reg['status'] == 'DRAFT_NOT_REGISTERED_NOT_RUN'
    assert manifest['status'] == 'DRAFT_NOT_REGISTERED_NOT_RUN'
    release = manifest['runtime_release']
    assert release['status'] == 'PENDING_DRIVER_FREEZE_AND_INDEPENDENT_REVIEW'
    assert reg['bindings']['driver_sha256'] == 'PENDING', 'FINAL_DRIVER_NOT_FROZEN'
    for key in ['entry', 'resources', 'bindings', 'model', 'native_command_permissions', 'run', 'run_id', 'probe_id']:
        assert release[key] == reg[key], f'CROSS_FILE_MISMATCH: {key}'
    assert reg['entry'] == {'transport': 'codex-app-server-stdio', 'native_launch': NATIVE_LAUNCH}
    assert all(type(reg['entry']['native_launch'][k]) is bool for k in NATIVE_LAUNCH)
    old_prep = read('u007-p06-preparation.json')
    expected_permissions = copy.deepcopy(read('u007-p06-registration.json')['native_command_permissions'])
    expected_permissions['profile']['filesystem'] = {k.replace(old_prep['instance_root'], prep['instance_root']).replace(old_prep['run_id'], RUN_ID): v for k, v in expected_permissions['profile']['filesystem'].items()}
    expected_permissions['runtime_read_roots'] = [x.replace(old_prep['instance_root'], prep['instance_root']) for x in expected_permissions['runtime_read_roots']]
    assert reg['native_command_permissions'] == expected_permissions, 'PERMISSION_SCOPE_CHANGED'
    assert reg['resources'] == RESOURCES
    assert reg['capability_probe_limit'] == 7
    assert release['stage'] == 'probe'
    assert manifest['budgets']['simple']['observed_tokens'] == 60000
    assert reg['model'] == read('u007-p06-preparation.json')['model']
    assert reg['native_command_permissions']['effective_probe'] is None
    assert reg['bindings']['cases_sha256'] == hashlib.sha256(encoded(case)).hexdigest()
    assert release['registration']['sha256'] == hashlib.sha256(encoded(reg)).hexdigest()
    assert prep['final_driver_identity']['status'] == 'PENDING'
    assert not (Path(prep['instance_root']) / 'runs' / RUN_ID).exists(), 'RUN_ALREADY_EXISTS'

def check():
    verify_sources()
    prep = read(DRAFT_NAMES[3])
    for item in prep['draft_files']:
        assert sha(item['path']) == item['sha256'], f'DRAFT_DRIFT: {item["path"]}'
    assert sha(__file__) == prep['prepare_script_sha256']
    case, reg, manifest = (read(name) for name in DRAFT_NAMES[:3])
    validate_drafts(case, reg, manifest, prep)
    instance = Path(prep['instance_root'])
    assert sha(instance / 'outside/denied.txt') == prep['owned_denied_marker_sha256']
    assert (instance / 'probe-runtime/escape.txt').is_symlink()
    assert (instance / 'probe-runtime/escape.txt').resolve() == instance / 'outside/denied.txt'
    for f in case['initial_files']:
        assert sha(instance / 'prepared-condition/case' / f['path']) == f['sha256']
    assert sha(instance / 'prepared-condition/AGENTS.md') == prep['condition_instruction_sha256']
    print(json.dumps({'status': 'DRAFT_INTEGRITY_PASS_NOT_RUNTIME_RELEASE', 'instance_root': str(instance)}))

def prepare(instance=None):
    for name in DRAFT_NAMES:
        assert not (B / name).exists(), f'EXISTING_OUTPUT: {name}'
    old, r6 = verify_sources()
    old_case, old_reg, manifest = (read(name) for name in ['u007-p06-case.json', 'u007-p06-registration.json', 'u007-p06-manifest.json'])
    # A free-port observation only; root must bind without listen until the future run's terminal cleanup.
    with socket.socket() as probe_port:
        probe_port.bind(('127.0.0.1', 0))
        port = probe_port.getsockname()[1]
    instance = Path(instance).resolve() if instance else Path(tempfile.mkdtemp(prefix='luca-u007-p07-')).resolve()
    assert instance.parent == Path(tempfile.gettempdir()).resolve() and instance.name.startswith('luca-u007-p07-')
    (instance / 'outside').mkdir(exist_ok=True); (instance / 'probe-runtime').mkdir(exist_ok=True)
    original_marker = Path(old['instance_root']) / 'outside/denied.txt'
    assert sha(original_marker) == old['owned_denied_marker_sha256']
    (instance / 'outside/denied.txt').write_bytes(original_marker.read_bytes())
    link = instance / 'probe-runtime/escape.txt'
    if link.is_symlink():
        assert link.resolve() == instance / 'outside/denied.txt'
    else:
        link.symlink_to(instance / 'outside/denied.txt')
    condition_root = instance / 'runs' / RUN_ID / 'condition'
    case = copy.deepcopy(old_case); case['id'] = CASE_ID
    case['request'] = case['request'].replace(old['instance_root'], str(instance)).replace(str(old['port']), str(port))
    case['request'] = case['request'].replace('Exact argv:',
        'Use native exec_command with shell="/bin/sh", login=false, tty=false. If these parameters are unsupported or not adopted, preserve that failure; do not substitute standalone command/exec or unsandboxed thread shell. Exact argv:', 1)
    argv = [old['python']['path'], '-B', 'case/input/probe.py', str(instance / 'outside'), str(port), str(instance / 'probe-runtime')]
    reg = copy.deepcopy(old_reg)
    reg.update(status='DRAFT_NOT_REGISTERED_NOT_RUN', probe_id='P07', run_id=RUN_ID,
               run={'case_id': CASE_ID, 'condition_id': 'T', 'trial': 1}, prepared_at=stamp(),
               instance_root=str(instance), probe_runtime_root=str(instance / 'probe-runtime'),
               reserved_loopback_port=port, capability_probe_limit=7, resources=RESOURCES,
               entry={'transport': 'codex-app-server-stdio', 'native_launch': NATIVE_LAUNCH})
    reg.pop('registered_at', None)
    reg['reason_for_new_attempt'] = 'Addendum9 one composite recovery: P06 native open_session denied; bound non-login/snapshot settings plus raw events and 60000 tokens. P01-P06 retained; no root-cause or boundary-success claim.'
    reg['model_selection'] = 'Preserve the frozen P06 user-selected model/effort and compare actual response at root launch; preparation does not read global configuration.'
    permissions = reg['native_command_permissions']
    permissions['profile']['filesystem'] = {k.replace(old['instance_root'], str(instance)).replace(old['run_id'], RUN_ID): v
                                             for k, v in permissions['profile']['filesystem'].items()}
    permissions['runtime_read_roots'] = [x.replace(old['instance_root'], str(instance)) for x in permissions['runtime_read_roots']]
    reg['bindings'].update(driver_sha256='PENDING', cases_sha256=hashlib.sha256(encoded(case)).hexdigest(),
                           conditions_sha256=r6['files']['conditions.mjs']['sha256'],
                           case_protocol_sha256=r6['files']['case-protocol.mjs']['sha256'])
    reg['case_file'] = {'path': str(B / DRAFT_NAMES[0]), 'sha256': reg['bindings']['cases_sha256']}
    # Pure Node material/protocol functions only. No driver, transport, thread or probe execution.
    js = r'''import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url'; import {join} from 'node:path';
const args=JSON.parse(process.argv[1]);
const {materializeCondition}=await import(pathToFileURL(args.conditions));
const {createCaseRuntime}=await import(pathToFileURL(args.protocol));
const condition=await materializeCondition({conditionId:'T',sourceRoot:args.sourceRoot,sourceManifestPath:args.sourceManifest,destination:join(args.instance,'prepared-condition')});
const runtime=createCaseRuntime({caseData:args.case,caseRoot:join(condition.root,'case'),evidenceRoot:join(args.instance,'preparation-evidence'),conditionReadPaths:[join(condition.root,'AGENTS.md')]});
const initial=JSON.parse(runtime.initialMessage());
const result={kind:'OFFLINE_PREPARATION_ONLY',condition,initial,snapshot:runtime.snapshot()};
writeFileSync(join(args.instance,'static-material-check.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({materialSha256:condition.materialSha256,available:initial.available_files,checkpoint:initial.checkpoint}));'''
    args = {'conditions': r6['files']['conditions.mjs']['path'], 'protocol': r6['files']['case-protocol.mjs']['path'],
            'sourceRoot': manifest['source_root'], 'sourceManifest': old['source_manifest'], 'instance': str(instance), 'case': case}
    run = subprocess.run(['node', '--input-type=module', '-e', js, json.dumps(args)], capture_output=True, text=True, timeout=20)
    save(instance / 'static-material-process.json', {'command_kind': 'Node materializeCondition/createCaseRuntime/initialMessage only', 'exit_code': run.returncode, 'stdout': run.stdout, 'stderr': run.stderr})
    assert run.returncode == 0, f'OFFLINE_PREPARATION_FAILED: {instance}'
    result = json.loads(run.stdout)
    assert result['materialSha256'] == old_reg['bindings']['condition_material_sha256']
    assert result['checkpoint'] == 'request_delivered'
    assert sorted(result['available']) == sorted(case['authorized_actions']['read_paths'])
    reg['bindings']['condition_material_sha256'] = result['materialSha256']
    release = copy.deepcopy(manifest['runtime_release'])
    for key in ['entry', 'resources', 'bindings', 'model', 'native_command_permissions', 'run', 'run_id', 'probe_id']:
        release[key] = copy.deepcopy(reg[key])
    release.update(status='PENDING_DRIVER_FREEZE_AND_INDEPENDENT_REVIEW', registration={'path': str(B / DRAFT_NAMES[1]), 'sha256': hashlib.sha256(encoded(reg)).hexdigest()})
    manifest.update(status='DRAFT_NOT_REGISTERED_NOT_RUN', runtime_release=release, updated_at=stamp(),
                    next_allowed_work='Root collects W27-W29, fills final driver identity in both bindings and rehashes drafts, obtains independent readiness review, then mechanically registers one P07. This draft grants no run.',
                    staff_call_allocation={'preparation': 29, 'review_advice': 26, 'total': 55, 'revision': str(B / 'u007-interface-addendum-9.md')})
    manifest['budgets']['capability_driver_probes_max'] = 7
    manifest['budgets']['simple']['observed_tokens'] = 60000  # P07-only manifest; master is untouched.
    for name in ['u007-interface-addendum-8.md', 'u007-interface-addendum-9.md', 'u007-interface-addendum-9-clarification-1.md']:
        path = B / name
        manifest['interface_addenda'].append({'path': str(path), 'sha256': sha(path)})
    prep = copy.deepcopy(old)
    prep.update(status='DRAFT_NOT_REGISTERED_NOT_RUN', prepared_at=stamp(), instance_root=str(instance), run_id=RUN_ID,
                condition_root=str(condition_root), command_argv=argv, port=port,
                runtime_read_roots=permissions['runtime_read_roots'], root_integration=str(B / 'u007-root-integration-r6.json'),
                input_release_change='None: same four P06 files at request_delivered; same four checkpoints and T instruction.',
                entry=reg['entry'], resources=RESOURCES, native_command_parameters={'shell':'/bin/sh','login':False,'tty':False,'workdir':str(condition_root),'cmd':shlex.join(argv)},
                final_driver_identity={'status':'PENDING','reason':'W28 not collected/frozen; do not treat R6 as final'},
                preparation_modules={k:r6['files'][k] for k in ['conditions.mjs','case-protocol.mjs']},
                prepare_script_sha256=sha(__file__), condition_instruction_sha256=sha(instance / 'prepared-condition/AGENTS.md'),
                outer_timeout_seconds=325,
                template_bindings=[{'path':str(B / n),'sha256':v} for n,v in TEMPLATES.items()])
    prep['draft_files'] = [{'path':str(B / name),'sha256':hashlib.sha256(encoded(obj)).hexdigest()}
                           for name,obj in zip(DRAFT_NAMES[:3],[case,reg,manifest])]
    validate_drafts(case,reg,manifest,prep)
    for name,obj in zip(DRAFT_NAMES,[case,reg,manifest,prep]):save(B / name,obj)
    check()

if __name__ == '__main__':
    if sys.argv[1:] == ['--check']:
        check()
    elif not sys.argv[1:]:
        prepare()
    else:
        raise SystemExit('Usage: python3 -B u007-p07-prepare.py [--check]')
