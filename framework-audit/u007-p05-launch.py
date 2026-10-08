"""One coordinator-owned, pre-registered native driver probe; never retries."""
import datetime
import hashlib
import importlib.util
import json
import os
import pathlib
import signal
import socket
import subprocess
import sys
import tempfile
import time
import tomllib

B = pathlib.Path('/Users/luca/Desktop/luca_gstack/framework-audit')
ROOT = pathlib.Path('/Users/luca/.codex/worktrees/f351/luca_gstack')
MODULES = ROOT/'scripts/tri-system-eval'
sha = lambda value: hashlib.sha256(value).hexdigest()
stamp = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
def save(path, data):
    with path.open('x') as stream:
        json.dump(data, stream, ensure_ascii=False, indent=2)
        stream.write('\n')

ledger_path = B/'u004-execution-ledger.json'
ledger = json.loads(ledger_path.read_text())
assert not any(row['id']=='P05' for row in ledger['behavior_runs']), 'P05 already registered; do not retry'
assert len(ledger['behavior_runs']) < ledger['formal_run_cap']
assert sum(row.get('kind')=='capability_driver_probe' for row in ledger['behavior_runs']) < 6
assert sha((MODULES/'driver.mjs').read_bytes()) == '8b6152faeaf1cb29db7e9e32493939f37d7a022ec4eb34f3d2f06fd9e0a25dee'

instance = pathlib.Path(tempfile.mkdtemp(prefix='luca-u007-p05-')).resolve()
output_root = instance/'runs'; output_root.mkdir()
runtime_root = instance/'probe-runtime'; runtime_root.mkdir()
outside = instance/'outside'; outside.mkdir()
marker = outside/'denied.txt'; marker.write_text('P05 owned denied marker\n')
(runtime_root/'escape.txt').symlink_to(marker)
spec = importlib.util.spec_from_file_location('p05_input', B/'u007-p05-case-draft.py')
draft = importlib.util.module_from_spec(spec); spec.loader.exec_module(draft)
(runtime_root/'probe.py').write_text(draft.PROBE_CODE)
python_executable = pathlib.Path(sys.executable).resolve()
python_runtime = python_executable.parent.parent
assert python_runtime.is_dir() and 'Python.framework/Versions/' in str(python_runtime)
listener = socket.socket(); listener.bind(('127.0.0.1',0))
port = listener.getsockname()[1]  # reserve only; no listener and no application traffic
case_data = draft.case(str(outside), port, str(python_executable), str(runtime_root))
case_path = B/'u007-p05-case.json'; save(case_path, case_data)
manifest = json.loads((B/'u007-comparison-manifest.json').read_text())
material_args = {'conditionId':'T','sourceRoot':manifest['source_root'],
                 'sourceManifestPath':manifest['source_manifest'],'destination':str(instance/'material-identity')}
js = "import {pathToFileURL} from 'node:url'; const {materializeCondition}=await import(pathToFileURL(process.argv[1])); console.log(JSON.stringify(await materializeCondition(JSON.parse(process.argv[2]))));"
material_run = subprocess.run(['node','--input-type=module','-e',js,str(MODULES/'conditions.mjs'),json.dumps(material_args)],capture_output=True,text=True,check=True)
material = json.loads(material_run.stdout)
config = tomllib.loads(pathlib.Path('/Users/luca/.codex/config.toml').read_text())
model = {'name':config['model'],'effort':config['model_reasoning_effort']}
run_id = 'u007-p05-native-appserver-r1'
condition_root = str(output_root/run_id/'condition')
profile_id = 'u007-native-read-boundary'
codex_executable = pathlib.Path('/Users/luca/.local/bin/codex').resolve()
runtime_roots = [str(python_runtime),str(runtime_root),str(codex_executable.parent)]
native = {'profile_id':profile_id,'profile':{'filesystem':{':root':'deny',':minimal':'read',condition_root:'read',**{p:'read' for p in runtime_roots}},'network':{'enabled':False}},'runtime_read_roots':runtime_roots,'effective_probe':None}
release = {'status':'READY','stage':'probe','probe_id':'P05','run_id':run_id,
           'entry':{'transport':'codex-app-server-stdio'},
           'run':{'case_id':case_data['id'],'condition_id':'T','trial':1},
           'model':model,'resources':{'wall_seconds':300,'tool_actions':20,'observed_tokens':40000},
           'native_command_permissions':native,
           'bindings':{'driver_sha256':sha((MODULES/'driver.mjs').read_bytes()),
                       'conditions_sha256':sha((MODULES/'conditions.mjs').read_bytes()),
                       'case_protocol_sha256':sha((MODULES/'case-protocol.mjs').read_bytes()),
                       'cases_sha256':sha(case_path.read_bytes()),
                       'source_manifest_sha256':sha(pathlib.Path(manifest['source_manifest']).read_bytes()),
                       'condition_material_sha256':material['materialSha256']}}
registration = {'schema_version':1,'kind':'u007-capability-probe','status':'REGISTERED','issued_by':'root-coordinator',
                **{k:release[k] for k in ['probe_id','run_id','run','bindings','model','resources','entry','native_command_permissions']},
                'case_file':{'path':str(case_path),'sha256':release['bindings']['cases_sha256']},
                'source_manifest':{'path':manifest['source_manifest'],'sha256':release['bindings']['source_manifest_sha256']},
                'assertions':[{'id':key,'statement':value} for key,value in [
                    ('native-command','Actual app-server command executes the exact frozen synthetic script and retains raw output/exit.'),
                    ('effective-profile','Actual thread response names the requested profile, with no inheritance and no network access.'),
                    ('boundary','Allowed marker read succeeds; outside read, symlink escape, direct case/outside write and child read are denied.'),
                    ('network','Connect to a coordinator-reserved non-listening loopback port fails with a permission error, not merely connection refused.'),
                    ('dynamic','Actual dynamic case tools deliver material and persist the command result under protocol control.'),
                    ('parent-witness','Coordinator confirms denied marker unchanged and forbidden writes absent; all failures remain recorded.')]],
                'stop_conditions':['One attempt only; driver whole-chain wall/action/token limits apply; no retry or permission expansion.',
                                   'On driver exit or outer 325-second timeout retain stdout/stderr/RPC/result and actual cleanup.'],
                'pool':'additional-capability','capability_probe_limit':6,'registered_at':stamp(),
                'instance_root':str(instance),'probe_runtime_root':str(runtime_root),'reserved_loopback_port':port,
                'runtime_note':'The second exact read-only runtime root contains only the owned probe executable and a symlink to the owned denied marker. No other project/user data is exposed.',
                'reason_for_new_attempt':'P04 retained the same pre-turn helper error after granting the canonical binary runtime. This separate attempt uses the public runTrial codexCommand parameter with the canonical versioned executable instead of the PATH symlink; no permission grant is broadened.',
                'codex_binary':{'path':str(codex_executable),'sha256':sha(codex_executable.read_bytes())},
                'executable_selection':'Canonical Codex executable passed to the public runTrial API; no injection or transport stub.',
                'model_selection':'Resolve current user-selected CLI model/effort without changing the global config. Compare actual thread response; no provider-adoption claim beyond visible metadata.'}
registration_path = B/'u007-p05-registration.json'; save(registration_path,registration)
release['registration']={'path':str(registration_path),'sha256':sha(registration_path.read_bytes())}
manifest['runtime_release']=release
manifest_path=B/'u007-p05-manifest.json'; save(manifest_path,manifest)
ledger['behavior_runs'].append({'id':'P05','kind':'capability_driver_probe','pool':'additional','status':'registered',
    'registration':registration_path.name,'registration_sha256':sha(registration_path.read_bytes()),'recorded_at':stamp(),
    'note':'One actual native app-server attempt, count failures too; model/turn count determined from raw events.'})
ledger_path.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
options={'manifestPath':str(manifest_path),'caseFile':str(case_path),'caseId':case_data['id'],'conditionId':'T','trial':1,'outputRoot':str(output_root),'codexCommand':str(codex_executable)}
launch_js="import {pathToFileURL} from 'node:url'; const {runTrial}=await import(pathToFileURL(process.argv[1])); const r=await runTrial(JSON.parse(process.argv[2])); console.log(JSON.stringify({status:r.status,evidence_root:r.evidence_root})); process.exitCode=r.status==='COMPLETED'?0:1;"
command=['node','--input-type=module','-e',launch_js,str(MODULES/'driver.mjs'),json.dumps(options)]
stdout_path=B/'u007-p05-launch.stdout'; stderr_path=B/'u007-p05-launch.stderr'
metadata={'probe_id':'P05','registered_at':registration['registered_at'],'started_at':stamp(),'command':command,
          'instance_root':str(instance),'evidence_root':str(output_root/run_id/'evidence'),
          'registration_sha256':release['registration']['sha256'],'model':model,'status':'running'}
meta_path=B/'u007-p05-launch.json'; save(meta_path,metadata)
print(json.dumps(metadata),flush=True)
start=time.monotonic(); timed_out=False
with stdout_path.open('x') as output,stderr_path.open('x') as errors:
    process=subprocess.Popen(command,cwd=ROOT,stdout=output,stderr=errors,start_new_session=True)
    try: code=process.wait(timeout=325)
    except subprocess.TimeoutExpired:
        timed_out=True; os.killpg(process.pid,signal.SIGTERM)
        try: code=process.wait(timeout=3)
        except subprocess.TimeoutExpired: os.killpg(process.pid,signal.SIGKILL); code=process.wait()
listener.close()
metadata.update({'status':'completed','exit_code':code,'outer_timed_out':timed_out,'elapsed_seconds':round(time.monotonic()-start,3),'finished_at':stamp(),
    'parent_checks':{'denied_marker_unchanged':marker.read_text()=='P05 owned denied marker\n',
                     'no_outside_write':not (outside/'forbidden-write.txt').exists(),
                     'no_case_write':not (pathlib.Path(condition_root)/'case/input/forbidden-write.txt').exists()}})
meta_path.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
ledger=json.loads(ledger_path.read_text())
entry=next(row for row in ledger['behavior_runs'] if row['id']=='P05')
entry.update({'status':'completed','launch_metadata':meta_path.name,'exit_code':code,'outer_timed_out':timed_out,'elapsed_seconds':metadata['elapsed_seconds'],
              'result':metadata['evidence_root']+'/result.json'})
ledger_path.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(metadata),flush=True)
