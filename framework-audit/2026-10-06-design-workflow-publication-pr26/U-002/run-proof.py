from pathlib import Path
import argparse,datetime,hashlib,json,os,subprocess
p=argparse.ArgumentParser();p.add_argument('name');p.add_argument('--root',required=True);a=p.parse_args()
work=Path('/Users/luca/.codex/worktrees/design-workflow-fixes/luca_gstack')
evidence=work/'framework-audit/2026-10-06-design-workflow-implementation/U-002'
rels=['.claude/skills/office/brainstorm/SKILL.md','.claude/skills/office/ux-brainstorm/SKILL.md','.claude/skills/office/brainstorm/references/adversarial-review.md','.claude/skills/office/ux-brainstorm/references/adversarial-review.md','.claude/skill-os/codex-viability.yaml','.claude/agents/quality-gate.md']
root=Path(a.root).resolve();script=work/'scripts/test-design-workflow-contract.mjs'
def snapshot():
 return {str(f):{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size} for f in [*[root/r for r in rels],script]}
before=snapshot();start=datetime.datetime.now(datetime.timezone.utc).isoformat()
cmd=['node',str(script),'--root',str(root)]
proc=subprocess.Popen(cmd,cwd=work,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
stdout,stderr=proc.communicate(timeout=30)
proof={'test_kind':'STATIC_ONLY_NOT_NATIVE','command':cmd,'pid':proc.pid,'runner_pid':os.getpid(),'cwd':str(work),'source_root':str(root),'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':proc.returncode,'stdout':stdout,'stderr':stderr,'before':before,'after':snapshot()}
assert proof['before']==proof['after'],'source drift during suite'
(evidence/(a.name+'.log')).write_text(stdout+stderr)
proofpath=evidence/(a.name+'.json');proofpath.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
assert json.loads(proofpath.read_text())==proof
print(stdout.splitlines()[-1]);print(str(proofpath));print('exit_code',proc.returncode)
