"""Prepare the single U014 P09 qualification; does not invoke a model."""
import copy,datetime,hashlib,json,os,shlex,socket,subprocess,tempfile
from pathlib import Path
B=Path('/Users/luca/Desktop/luca_gstack/framework-audit')
ROOT=Path('/Users/luca/.codex/worktrees/f351/luca_gstack')
RUN='u014-p09-native-boundary-r1'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(n):return json.loads((B/n).read_text())
def save(p,x):
 with Path(p).open('x') as f:f.write(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def main():
 old=read('u007-p08-preparation.json'); reg=read('u007-p08-registration.json'); case=read('u007-p08-case.json')
 instance=Path(tempfile.mkdtemp(prefix='luca-u014-p09-')).resolve();(instance/'outside').mkdir();(instance/'probe-runtime').mkdir()
 marker=Path(old['instance_root'])/'outside/denied.txt';assert sha(marker)==old['owned_denied_marker_sha256'];(instance/'outside/denied.txt').write_bytes(marker.read_bytes());(instance/'probe-runtime/escape.txt').symlink_to(instance/'outside/denied.txt')
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 python=old['python']['path'];argv=[python,'-B','case/input/probe.py',str(instance/'outside'),str(port),str(instance/'probe-runtime')]
 case['id']='P09-native-boundary-canonical-python'
 case['request']='''Perform this single authorized local capability check. It is a qualification, not a task-quality comparison. Your first work action is to run the exact argv below once with native exec_command, shell=/bin/sh, login=false, tty=false, cwd=the condition directory. The complete unchanged program is case/input/probe.py. It tests eight allowed/denied boundaries including the unchanged baseline rule loader. The coordinator has bound the loopback target without listening; permission denial is required. Do not modify permissions, retry, spawn agents, inspect unrelated data, or invent output. The launcher supplies the same canonical Python environment intended for all subsequent conditions; this is not a new filesystem grant.
After the command, use case_checkpoint with {"checkpoint":"inputs_delivered"}, then {"checkpoint":"work_ready"}. Preserve the exact stdout JSON, stderr and exit result; use case_write {"path":"output/probe-result.json","content":<actual stdout JSON string>} when available, otherwise write exact failure evidence. Then call case_checkpoint with ONLY {"checkpoint":"before_final_submission"}; there is no saved-checkpoint transition, so omit artifact entirely (not an empty object). Finish with the actual outcome. All failures stay visible. Do not read or repeat the full program merely to restate this request.
Exact argv: '''+json.dumps(argv)
 casepath=B/'u014-p09-case-draft.json';save(casepath,case)
 now=datetime.datetime.now(datetime.timezone.utc).isoformat()
 reg.update(status='DRAFT_NOT_REGISTERED_NOT_RUN',probe_id='P09',run_id=RUN,run={'case_id':case['id'],'condition_id':'T','trial':1},capability_probe_limit=10,instance_root=str(instance),probe_runtime_root=str(instance/'probe-runtime'),reserved_loopback_port=port,prepared_at=now)
 reg.pop('registered_at',None);reg.pop('superseded_composite_draft',None)
 reg['reason_for_new_attempt']='Observed exact sandbox red/green: unchanged Python launcher re-enters denied opt alias, PYTHONEXECUTABLE canonical path fixes loader without profile/source changes. Remove duplicated script text and clarify optional artifact omission; preserve eight checks and resource limits.'
 envdelta={'PYTHONEXECUTABLE':python,'PATH_prepend':str(Path(python).parent)}
 reg['process_local_environment']=envdelta
 reg['case_file']={'path':str(casepath),'sha256':sha(casepath)}
 native=reg['native_command_permissions'];native['profile']['filesystem']={key.replace(old['instance_root'],str(instance)).replace(old['run_id'],RUN):value for key,value in native['profile']['filesystem'].items()};native['runtime_read_roots']=[x.replace(old['instance_root'],str(instance)) for x in native['runtime_read_roots']];native['effective_probe']=None
 for name,key in [('driver.mjs','driver_sha256'),('conditions.mjs','conditions_sha256'),('case-protocol.mjs','case_protocol_sha256'),('native-trace.mjs','native_trace_sha256')]:reg['bindings'][key]=sha(ROOT/'scripts/tri-system-eval'/name)
 reg['bindings']['cases_sha256']=sha(casepath)
 reg['stop_conditions']=['One actual attempt, 480 seconds, 30 observed actions, 120000 cumulative observed tokens; keep failures and no automatic retry.','Outer 505-second deadline; preserve native evidence and observed process cleanup.','Qualification only: no claim of value, native Agent child, fresh context or compact.']
 regpath=B/'u014-p09-registration-draft.json';save(regpath,reg)
 manifest=read('u007-p08-manifest.json');manifest['status']='DRAFT_NOT_REGISTERED_NOT_RUN';manifest['budgets']['capability_driver_probes_max']=10;manifest['budgets']['reserved_migration_retest']=14;manifest['budgets']['additional_general_max']=0
 release={k:copy.deepcopy(reg[k]) for k in ['run','run_id','probe_id','bindings','model','resources','entry','native_trace','native_command_permissions']};release.update(status='PENDING_OFFLINE_REPAIR_REVIEW',stage='probe',registration={'path':str(regpath),'sha256':sha(regpath)});manifest['runtime_release']=release;save(B/'u014-p09-manifest-draft.json',manifest)
 prep=copy.deepcopy(old);prep.update(status='DRAFT_NOT_REGISTERED_NOT_RUN',prepared_at=now,instance_root=str(instance),run_id=RUN,condition_root=str(instance/'runs'/RUN/'condition'),port=port,command_argv=argv,native_command_parameters={'shell':'/bin/sh','login':False,'tty':False,'workdir':str(instance/'runs'/RUN/'condition'),'cmd':shlex.join(argv)},runtime_read_roots=native['runtime_read_roots'],process_local_environment=envdelta,root_integration='U014 pending exact collected driver/conditions',prepare_script_sha256=sha(__file__))
 for k in ['draft_files','final_driver_identity','preparation_modules','condition_instruction_sha256']:prep.pop(k,None)
 prep['input_changes']=reg['reason_for_new_attempt'];prep['program_unchanged_sha256']=next(x['sha256'] for x in case['initial_files'] if x['path']=='input/probe.py')
 save(B/'u014-p09-preparation.json',prep)
 print(json.dumps({'prepared':str(instance),'port':port,'model_runs':0,'process_local_environment':envdelta},ensure_ascii=False))
if __name__=='__main__':main()
