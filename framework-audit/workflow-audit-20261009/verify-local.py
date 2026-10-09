from pathlib import Path
import datetime,hashlib,json,subprocess,sys
ROOT=Path(__file__).resolve().parents[2]; EV=Path(__file__).resolve().parent
cases={'A1':['node','scripts/test-design-workflow-contract.mjs'],'A2':['node','scripts/test-scout-workflows.mjs'],'A3':['node','scripts/test-evolution-bookkeep.mjs'],'A4':['node','scripts/test-workflow-runner.mjs'],'A5a':['node','scripts/test-workflow-runner-runtime.mjs'],'A5b':['node','scripts/check-routing-map.mjs'],'A5c':['python3','scripts/build-agent-context.py','check'],'A5d':['node','scripts/check-agents-parity.mjs']}
paths=[i['path'] for i in json.loads((EV/'preimages.json').read_text())['implementation_files']]
def inventory(): return {p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths}
label=sys.argv[1] if len(sys.argv)>1 else 'final-tests'; dest=EV/label; dest.mkdir(exist_ok=False)
frozen=inventory();(dest/'sources.json').write_text(json.dumps(frozen,indent=2)+'\n')
(dest/'driver.json').write_text(json.dumps({'sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'assertions':cases,'note':'Sources frozen before testing; individual argv/exit and stdout/stderr retained. Model boundary fixtures, not native product behavior.'},indent=2)+'\n')
summary=[]
for name,argv in cases.items():
 started=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with (dest/(name+'.stdout.txt')).open('w') as out,(dest/(name+'.stderr.txt')).open('w') as err:
  process=subprocess.Popen(argv,cwd=ROOT,stdout=out,stderr=err);rc=process.wait()
 row={'id':name,'argv':argv,'cwd':str(ROOT),'pid':process.pid,'started_at':started,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':rc,'sources_unchanged':inventory()==frozen}
 (dest/(name+'.json')).write_text(json.dumps(row,indent=2)+'\n');summary.append(row);print(name,rc,flush=True)
(EV/(label+'-summary.json')).write_text(json.dumps(summary,indent=2)+'\n')
sys.exit(0 if all(x['exit_code']==0 and x['sources_unchanged'] for x in summary) else 1)
