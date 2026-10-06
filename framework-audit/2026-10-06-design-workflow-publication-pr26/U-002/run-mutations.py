from pathlib import Path
import datetime,hashlib,json,os,shutil,subprocess,tempfile
work=Path('/Users/luca/.codex/worktrees/design-workflow-fixes/luca_gstack')
evidence=work/'framework-audit/2026-10-06-design-workflow-implementation/U-002'
proofrunner=evidence/'run-proof.py'
rels=['.claude/skills/office/brainstorm/SKILL.md','.claude/skills/office/ux-brainstorm/SKILL.md','.claude/skills/office/brainstorm/references/adversarial-review.md','.claude/skills/office/ux-brainstorm/references/adversarial-review.md','.claude/skill-os/codex-viability.yaml','.claude/agents/quality-gate.md']
def hashes():return {r:hashlib.sha256((work/r).read_bytes()).hexdigest() for r in rels+['scripts/test-design-workflow-contract.mjs']}
before=hashes();runs=[]
for kind in ['independence','severity','tier-branch','draft-exemption','ordinary-handoff']:
 started=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with tempfile.TemporaryDirectory(prefix='owned-u002-',dir=evidence) as d:
  fixture=Path(d)
  for rel in rels:
   dest=fixture/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(work/rel,dest)
  affected=[]
  def mutate(rel,old,new):
   f=fixture/rel;s=f.read_text();assert old in s,(kind,rel,old);f.write_text(s.replace(old,new));affected.append(rel)
  if kind=='independence':
   for skill in ['brainstorm','ux-brainstorm']:
    rel='.claude/skill-os/codex-viability.yaml';f=fixture/rel;s=f.read_text();old=next(line for line in s.splitlines() if line.startswith('  '+skill+':'))
    mutate(rel,old,f'  {skill}: {{tier: 2, degrade: "Oracle 作者可内联自审"}}')
  elif kind=='severity':
   for rel in rels[:4]:
    f=fixture/rel;s=f.read_text();lines=[line for line in s.splitlines() if 'critical/CRITICAL → BLOCKER' in line or 'high/HIGH → MAJOR' in line]
    assert lines
    for line in lines:mutate(rel,line,'- Surviving critical/high are advisory and allow writing.')
  elif kind=='tier-branch':
   mutate('.claude/agents/quality-gate.md','| brainstorm | Lightweight | N/A |','| brainstorm | Lightweight | ≥3 |')
   mutate('.claude/agents/quality-gate.md','| brainstorm | Standard | ≥2 |','| brainstorm | Standard | ≥3 |')
  elif kind=='draft-exemption':
   mutate('.claude/agents/quality-gate.md','4. 仅此 facet 豁免未来阶段的 WA status=DONE、outputs_produced 存在性、最终 output/handoff\n   和 workflow-state DONE 检查。','4. 此 facet 要求 WA status=DONE、outputs_produced 存在性、最终 output/handoff 和 workflow-state DONE。')
  else:
   f=fixture/'.claude/agents/quality-gate.md';s=f.read_text();old=next(line for line in s.splitlines() if line.startswith('| **Handoff 质量**'))
   mutate('.claude/agents/quality-gate.md',old,'| **Handoff 质量** | ordinary handoff optional | skip existence |')
  name='mutation-'+kind+'-red';cmd=['python3',str(proofrunner),name,'--root',str(fixture)]
  proc=subprocess.Popen(cmd,cwd=work,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);out,err=proc.communicate(timeout=30)
  proof=json.loads((evidence/(name+'.json')).read_text());assert proc.returncode==0 and proof['exit_code']==1,(kind,out,err)
  failed=[line for line in proof['stdout'].splitlines() if line.startswith('FAIL ')]
  assert failed,(kind,'mutation failed to turn suite red')
  record={'kind':kind,'fixture_root':str(fixture),'affected':sorted(set(affected)),'driver_command':cmd,'driver_pid':proc.pid,'cwd':str(work),'started_at':started,'driver_exit_code':proc.returncode,'driver_stdout':out,'driver_stderr':err,'test_result':proof['stdout'].splitlines()[-1],'failed_cases':failed,'proof':str(evidence/(name+'.json'))}
 assert not fixture.exists(),'owned fixture cleanup failed'
 assert json.loads((evidence/(name+'.json')).read_text())==proof,'retained proof readback failed'
 record['cleanup']={'owned_fixture_removed':True,'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'retained_proof_readback':True};runs.append(record)
 print(kind,record['test_result'])
after=hashes();assert before==after,'real source changed during mutations'
summary={'kind':'STATIC_ONLY_NOT_NATIVE','runner_pid':os.getpid(),'cwd':str(work),'before':before,'after':after,'original_denominator':135,'mutations':runs}
p=evidence/'mutations-summary.json';p.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');assert json.loads(p.read_text())==summary
