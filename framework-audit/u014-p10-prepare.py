"""Last U014 qualification preparation. No model invocation; no global config mutation."""
from pathlib import Path
import json,hashlib,tempfile,socket,subprocess,datetime,shlex
B=Path('/Users/luca/Desktop/luca_gstack/framework-audit')
def read(n):return json.loads((B/n).read_text())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def save(n,v):
 with (B/n).open('x') as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
old=read('u014-p09-preparation.json')
inst=Path(tempfile.mkdtemp(prefix='luca-u014-p10-')).resolve()
(inst/'outside').mkdir();(inst/'probe-runtime').mkdir()
(inst/'outside/denied.txt').write_bytes((Path(old['instance_root'])/'outside/denied.txt').read_bytes())
(inst/'probe-runtime/escape.txt').symlink_to(inst/'outside/denied.txt')
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
def transform(x):
 if isinstance(x,dict):return {transform(k):transform(v) for k,v in x.items()}
 if isinstance(x,list):return [transform(v) for v in x]
 if isinstance(x,str):return x.replace(old['instance_root'],str(inst)).replace('p09','p10').replace('P09','P10').replace(str(old['port']),str(port))
 if x==old['port']:return port
 return x
c=old['codex']['path'];py=old['python']['path']
flags=['-c',f'shell_environment_policy.set.PYTHONEXECUTABLE="{py}"','-c','mcp_servers.context7.enabled=false']
for k in ['cua_repl','node_repl','pencil','shadcn']:flags+=['-c',f'mcp_servers.{k}={{command="/usr/bin/false",enabled=false}}']
w=B/'u014-codex-minimal-eval-entry.sh'
with w.open('x') as f:f.write('#!/bin/sh\n# Isolated evaluation process only; never writes global settings.\nPATH='+shlex.quote(str(Path(py).parent))+':"$PATH"\nexport PATH\nexec '+shlex.quote(c)+' "$@" '+shlex.join(flags)+'\n')
w.chmod(0o700)
subprocess.run(['/bin/sh','-n',str(w)],check=True)
m=subprocess.run([str(w),'mcp','list','--json'],capture_output=True,text=True,check=True,timeout=30)
listed=[{'name':x['name'],'enabled':x['enabled']} for x in json.loads(m.stdout)]
assert all(not x['enabled'] for x in listed)
save('u014-p10-local-entry-check.json',{'argv':[str(w),'mcp','list','--json'],'exit_code':m.returncode,'mcp_servers':listed,'model_runs':0,'app_server_effective_adoption':'UNVERIFIED','scope':'Same isolated entry for all comparison conditions. Native shell and registered case tools retained; no claim for MCP integrations, UI, external data or full day-to-day feature coverage.','delta':'Disable unrelated inherited MCP definitions only within process; canonical Python shell environment; no new permission or resource grant.'})
case=transform(read('u014-p09-case-draft.json'))
case['request']=case['request'].replace('The launcher supplies the same canonical Python environment intended for all subsequent conditions;','The task-local launcher supplies the same canonical Python environment intended for all subsequent conditions;')
save('u014-p10-case-draft.json',case)
reg=transform(read('u014-p09-registration-draft.json'))
reg['case_file']['sha256']=reg['bindings']['cases_sha256']=sha(B/'u014-p10-case-draft.json')
reg['reason_for_new_attempt']='P09 passed all eight actual command checks but stopped at observed token cap (132970). Last attempt disables unrelated inherited MCP definitions only in the isolated evaluation process. No check, runtime grant, scoring rule, protocol or cap is relaxed. Actual benefit and app-server adoption remain unverified.'
reg['task_local_entry']={'path':str(w),'sha256':sha(w),'arguments':flags,'applies_to':'All comparison conditions equally, if qualified; no native multiagent or full MCP capability claim'}
save('u014-p10-registration-draft.json',reg)
man=transform(read('u014-p09-manifest-draft.json'))
man['runtime_release']['bindings']=reg['bindings'];man['runtime_release']['registration']['sha256']=sha(B/'u014-p10-registration-draft.json')
save('u014-p10-manifest-draft.json',man)
launcher=transform((B/'u014-p09-launch.py').read_text()).replace("== 8","== 9")
launcher=launcher.replace("'codexCommand': prep['codex']['path']","'codexCommand': prep['task_local_entry']['path']")
launcher=launcher.replace("[prep['python'], prep['codex'], *prep['package_files']]","[prep['python'], prep['codex'], prep['task_local_entry'], *prep['package_files']]")
with (B/'u014-p10-launch.py').open('x') as f:f.write(launcher)
prep=transform(old);prep['port']=port;prep['task_local_entry']=reg['task_local_entry'];prep['prepared_at']=datetime.datetime.now(datetime.timezone.utc).isoformat();prep['prepare_script_sha256']=sha(__file__)
prep['launcher']['sha256']=sha(B/'u014-p10-launch.py');prep['input_changes']=reg['reason_for_new_attempt']
save('u014-p10-preparation.json',prep)
prev=read('u014-p09-review-inputs.json'); paths=[]
for i in prev['inputs']:
 p=Path(i['path']); q=Path(transform(str(p)))
 paths.append(q if q.exists() else p)
paths += [w,B/'u014-p10-local-entry-check.json',B/'u014-p09-launch.json',Path(read('u014-p09-launch.json')['evidence_root'])/'result.json']
save('u014-p10-review-inputs.json',{'scope':'P09 outcome review plus final single P10 readiness; no production adoption','inputs':[{'path':str(p),'sha256':sha(p),'bytes':p.stat().st_size} for p in paths],'assertions':['P09 actual eight checks pass but INVALID_RUN remains; no qualification/quality/value PASS','P10 exact eight checks, same T condition, permissions, cap and protocol; unrelated MCP definitions disabled process-locally only','Actual app-server adoption is tested, not inferred from CLI list; scope excludes MCP/UI/external integrations','Last qualification #10 in 144 total; no automatic retry; stop U014-b on failure','Exact reviewed hashes, live terminal/usage/process cleanup and original evidence preserved']})
print(json.dumps({'prepared':str(inst),'port':port,'model_runs':0}))
