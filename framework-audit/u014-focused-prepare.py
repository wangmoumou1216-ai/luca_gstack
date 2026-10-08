"""Freeze four targeted native decision runs. No model invocation."""
from pathlib import Path
import datetime,hashlib,json,os,shlex,shutil,subprocess,tempfile
B=Path('/Users/luca/Desktop/luca_gstack/framework-audit');ROOT=Path('/Users/luca/.codex/worktrees/tri-system-adoptable-fixes/luca_gstack');BASE='05120197073144c0f46b6fb30a192733d529cc4f'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def ref(p):return {'path':str(p),'sha256':sha(p)}
def save(p,v):
 with Path(p).open('x') as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def main():
 draft=json.loads((B/'u014-fix-behavior-cases-draft.json').read_text());model=json.loads((B/'u014-p10-preparation.json').read_text())['model']
 fields=['id','next_action','source_reference','ask_user_again','restart_same_worker','consume_missing_result','decision_status','new_external_effect_authorized','choose_replacement_without_user']
 props={x:{'type':['boolean','null']} for x in fields[3:]};props.update(id={'type':'string'},next_action={'type':'string'},source_reference={'type':'string'},decision_status={'type':['string','null']})
 schema={'type':'object','properties':{'decisions':{'type':'array','items':{'type':'object','properties':props,'required':fields,'additionalProperties':False}}},'required':['decisions'],'additionalProperties':False}
 files=['.claude/agents/orchestrator.md','.claude/skills/office/auto/SKILL.md','.claude/skills/office/references/handoff-protocol.md']
 root=Path(tempfile.mkdtemp(prefix='u014-focused-decisions-')).resolve();snapshots={}
 for arm in ['old','new']:
  snapshots[arm]=[]
  for name in files:
   p=root/'frozen'/arm/name;p.parent.mkdir(parents=True,exist_ok=True)
   data=subprocess.run(['git','show',BASE+':'+name],cwd=ROOT,capture_output=True,check=True).stdout if arm=='old' else (ROOT/name).read_bytes()
   p.write_bytes(data);snapshots[arm].append({'relative_path':name,**ref(p)})
 actor_data={'cases':draft['cases'],'output_contract':draft['output_contract']};assert 'predeclared_oracle' not in json.dumps(actor_data)
 common='''这是一项有限的框架规则决策回归。下列状态均是合成案例，不是真实项目或真实在途任务。只依据本次完整提供的适用合同与案例事实，逐项返回下一步决定和交接状态，不实际执行任何任务/skill/命令，不调用工具，不读取外部文件、不访问网络、不修改文件或配置。当前只授权这一次决策输出；各案例内部的授权事实用于决定该案例应如何处理，不授权现实中的效果。未解决的人类决定保留为未解决。案例互相独立。给每项id一个JSON对象，不适用字段填null。source_reference只写适用章节的简短引用，不输出内部思考。所有合同正文已包含在输入中，无需猜测其他checkout的版本。保留原生系统指令。只返回符合schema的JSON，不输出额外说明。\n\n'''
 binary=Path(json.loads((B/'u014-p10-preparation.json').read_text())['codex']['path']);claude=Path(shutil.which('claude')).resolve()
 runs=[]
 # Two independent native harnesses; counterbalanced old/new order. No previous answer provided.
 for idx,(rid,harness,arm,dep) in enumerate([('F01','codex','old',None),('F02','codex','new','F01'),('F03','claude','new',None),('F04','claude','old','F03')]):
  cwd=root/f'actor-{idx+1}';cwd.mkdir();prompt=cwd/'request.txt';sp=cwd/'output-schema.json';save(sp,schema)
  authority='\n\n'.join('===== '+r['relative_path']+' =====\n'+Path(r['path']).read_text() for r in snapshots[arm])
  prompt.write_text(common+'<applicable_contracts>\n'+authority+'\n</applicable_contracts>\n\n<case_input>\n'+json.dumps(actor_data,ensure_ascii=False)+'\n</case_input>\n')
  assert 'predeclared_oracle' not in prompt.read_text()
  if harness=='codex':
   # Preserve provider/auth transport; the previously parsed process-local entry suppresses unrelated MCP definitions.
   runtime=B/'u014-codex-minimal-eval-entry.sh'
   profile={'filesystem':{':root':'deny',':minimal':'read',str(cwd):'read'},'network':{'enabled':False}}
   def toml(v):
    if isinstance(v,dict):return '{'+','.join(json.dumps(k)+'='+toml(x) for k,x in v.items())+'}'
    if isinstance(v,bool):return str(v).lower()
    return json.dumps(v)
   args=[str(runtime),'exec','--ephemeral','--skip-git-repo-check','--json','-C',str(cwd),'--output-schema',str(sp),'-m',model['name'],'-c','model_reasoning_effort='+json.dumps(model['effort']),'-c','approval_policy="never"','-c','allow_login_shell=false','--disable','apps','--disable','shell_snapshot','-c','permissions.u014-focused='+toml(profile),'-c','default_permissions="u014-focused"','-']
  else:
   runtime=claude
   args=[str(claude),'-p','--output-format','stream-json','--verbose','--no-session-persistence','--safe-mode','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--tools','','--permission-mode','dontAsk','--no-chrome','--model','opus','--effort','high','--json-schema',json.dumps(schema,ensure_ascii=False)]
  runs.append({'id':rid,'harness':harness,'arm':arm,'depends_on':dep,'cwd':str(cwd),'actor_input':ref(prompt),'schema':ref(sp),'runtime':ref(runtime),'argv':args,'evidence_root':str(root/'evidence'/rid),'model_requested':model if harness=='codex' else {'role':'core-execution Claude compatibility','alias':'opus','effort':'high'}})
 frozen=[ref(B/n) for n in ['u014-focused-native-run.py','u014-focused-prepare.py','u014-p10-launch.py','u014-fix-behavior-cases-draft.json','u014-focused-method-envelope.json','u014-adoptable-method-envelope.json']]
 frozen += [ref(binary),ref(Path('/Users/luca/.codex/AGENTS.md'))]
 frozen += [ref(Path(row['path'])) for rows in snapshots.values() for row in rows]
 reg={'status':'REGISTERED','registered_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':draft['scope'],'authority':'Latest user continue making new version adoptable, R-U014-3; J31 method PASS. Only targeted decision tests, not P-series qualification.','limits':{'wall_seconds':480,'observed_tokens':120000,'automatic_retries':0,'runs':4},'budget':{'additional_before':18,'additional_after_max':22,'additional_cap':24,'total_cap':144},'model_provenance':'Codex request unchanged frozen P10 projection; Claude core-execution maps opus from model-routing.yaml. Effective identity recorded if returned, otherwise unknown.','sources':snapshots,'frozen_inputs':frozen,'runs':runs,'limitations':['One sample per harness/arm, synthetic states, no actual worker/project side effects.','No automatic checkout root loaded: fresh isolated temp cwd; full applicable contracts supplied verbatim, oracle excluded.','Native defaults and harmless user Wiki instructions remain; no claim of full instruction/tool definition inventory.','Only concrete same-harness old-fail/new-pass slices without protection regressions can support adoption; both-correct is not relative benefit.','No efficiency, full multiagent, migration, required-source closure or whole-framework superiority claim.']}
 save(B/'u014-focused-native-registration.json',reg)
 print(json.dumps({'root':str(root),'registered_runs':[x['id'] for x in runs],'model_calls':0,'snapshot_files':files}))
if __name__=='__main__':main()
