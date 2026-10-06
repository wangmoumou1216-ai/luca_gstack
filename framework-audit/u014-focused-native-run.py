"""Run one frozen, targeted instruction-decision regression with a native CLI.
No case engine, no qualification retry, no global config or production writes.
"""
import datetime,hashlib,importlib.util,json,os,signal,subprocess,sys,time
from pathlib import Path
B=Path('/Users/luca/Desktop/luca_gstack/framework-audit')
spec=importlib.util.spec_from_file_location('owned_cleanup', B/'u014-p10-launch.py')
cleanup=importlib.util.module_from_spec(spec);spec.loader.exec_module(cleanup)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def save(p,v):Path(p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def usage_from_stream(p,harness):
 usage=None;events=[]
 if not p.exists():return None,[]
 for line in p.open():
  try:e=json.loads(line)
  except ValueError:continue
  if harness=='codex' and e.get('type')=='turn.completed':
   u=e.get('usage',{});usage={'raw':u,'total':u.get('input_tokens',0)+u.get('output_tokens',0),'cached_input_is_subset':True}
  if harness=='claude' and e.get('type')=='result':
   u=e.get('usage',{});usage={'raw':u,'model_usage':e.get('modelUsage'),'cost_usd':e.get('total_cost_usd'),'total':sum(u.get(k,0) for k in ['input_tokens','output_tokens','cache_read_input_tokens','cache_creation_input_tokens']),'cache_is_additional_to_input':True}
  if e.get('type') in ['error','turn.failed']:events.append(e)
 return usage,events

def main():
 rid=sys.argv[1];reg_path=B/'u014-focused-native-registration.json';reg=json.loads(reg_path.read_text());assert reg['status']=='REGISTERED'
 row=next(x for x in reg['runs'] if x['id']==rid)
 for x in reg['frozen_inputs']+[row['actor_input'],row['schema'],row['runtime']]:assert sha(x['path'])==x['sha256'],x['path']
 out=Path(row['evidence_root']);out.mkdir(parents=True,exist_ok=False)
 if row.get('depends_on'):
  prior=next(x for x in reg['runs'] if x['id']==row['depends_on']);assert (Path(prior['evidence_root'])/'receipt.json').exists()
 lp=B/'u004-execution-ledger.json';ledger=json.loads(lp.read_text());assert not any(x['id']==rid for x in ledger['behavior_runs']);assert len(ledger['behavior_runs'])<144
 assert sum(x.get('pool')=='additional' for x in ledger['behavior_runs'])<24
 ledger['behavior_runs'].append({'id':rid,'kind':'targeted_instruction_decision_regression','pool':'additional','status':'running','registration':str(reg_path),'registration_sha256':sha(reg_path),'at':cleanup.stamp(),'harness':row['harness'],'arm':row['arm'],'evidence_root':str(out)})
 save(lp,ledger)
 start=time.monotonic();record={'run_id':rid,'argv':row['argv'],'cwd':row['cwd'],'harness':row['harness'],'arm':row['arm'],'started_at':cleanup.stamp(),'registration_sha256':sha(reg_path),'actor_input_sha256':sha(row['actor_input']['path']),'cleanup_observation_errors':[],'cleanup':[],'status':'running'}
 save(out/'started.json',record);known={};why=None
 with (out/'stdout.jsonl').open('x') as stdout,(out/'stderr.log').open('x') as stderr,Path(row['actor_input']['path']).open() as prompt:
  process=subprocess.Popen(row['argv'],cwd=row['cwd'],stdin=prompt,stdout=stdout,stderr=stderr,start_new_session=True)
  try:
   while process.poll() is None:
    try:cleanup.observe_owned(cleanup.process_table(),known,process.pid)
    except Exception as error:record['cleanup_observation_errors'].append(type(error).__name__)
    usage,_=usage_from_stream(out/'stdout.jsonl',row['harness'])
    if time.monotonic()-start>=reg['limits']['wall_seconds']:why='WALL_LIMIT';break
    if usage and usage['total']>reg['limits']['observed_tokens']:why='OBSERVED_TOKEN_LIMIT';break
    time.sleep(.5)
  finally:
   for sig in [signal.SIGTERM,signal.SIGKILL]:
    groups={process.pid} if process.poll() is None else set()
    try:
     live=cleanup.observe_owned(cleanup.process_table(),known,process.pid if process.poll() is None else None)
     groups.update(x['group'] for x in live.values() if x['group']!=os.getpgrp())
    except Exception as error:record['cleanup_observation_errors'].append(type(error).__name__)
    for group in groups:
     try:os.killpg(group,sig);record['cleanup'].append({'group':group,'signal':sig.name,'sent':True})
     except ProcessLookupError:record['cleanup'].append({'group':group,'signal':sig.name,'already_gone':True})
    if sig==signal.SIGTERM and groups:time.sleep(1)
   code=process.wait(timeout=3)
 usage,errors=usage_from_stream(out/'stdout.jsonl',row['harness']);survivors=list(cleanup.observe_owned(cleanup.process_table(),known,None).values())
 if usage and usage['total']>reg['limits']['observed_tokens']:why='OBSERVED_TOKEN_LIMIT'
 record.update(status='COMPLETED_PENDING_SEMANTIC_REVIEW' if code==0 and not why and not survivors and usage else 'INVALID_OR_INCOMPLETE',exit_code=code,stop_reason=why,finished_at=cleanup.stamp(),elapsed_seconds=round(time.monotonic()-start,3),usage=usage,errors=errors,observed_survivors=survivors,observed_owned_processes=list(known.values()),source_inputs_unchanged=all(sha(x['path'])==x['sha256'] for x in reg['frozen_inputs']),evidence_files=[{'path':str(p),'sha256':sha(p)} for p in out.iterdir() if p.is_file()])
 save(out/'receipt.json',record)
 ledger=json.loads(lp.read_text());entry=next(x for x in ledger['behavior_runs'] if x['id']==rid);entry.update(status=record['status'],receipt=str(out/'receipt.json'),exit_code=code,elapsed_seconds=record['elapsed_seconds'],observed_tokens=usage['total'] if usage else None);save(lp,ledger)
 print(json.dumps({k:record[k] for k in ['run_id','status','exit_code','stop_reason','elapsed_seconds','usage','observed_survivors']},ensure_ascii=False))
if __name__=='__main__':main()
