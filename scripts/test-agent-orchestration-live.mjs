#!/usr/bin/env node
/** AOR-only live evidence driver. No provider, model, permission or hook overrides.
 * Exit 0: guard self-tests pass; 1: invalid evidence; 2: live capability/evidence GAP.
 * Manifest v1: {schema_version:1, fixture_sha256, driver_sha256, source_root,
 * sources:[{path,sha256}], runs:[{case_id,harness,prompt:{path,sha256},
 * inputs:[{path,sha256}], owned_root, ownership:{path,sha256}, timeout_ms}]}
 * Each owned root must be an existing OS-temp checkout, marker JSON must contain
 * {case_id,harness,root,owner:"AOR-DELIVERY-20261007"}. Preparation is separate
 * and never represented as native action. --run records only manifest-selected
 * tuples; --verify ALWAYS reports the full frozen two-harness denominator.
 * V-11 has an objective native read-before-write oracle. Other semantic and
 * lifecycle claims need independent evidence; self-reported PASS never suffices.
 * --verify may use --driver-source <archived driver> to revalidate an older
 * capture with this checker. Execution always binds the currently running code.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const FIXTURE = path.join(ROOT, 'scripts/fixtures/agent-orchestration-cases.json');
const digest = b => crypto.createHash('sha256').update(b).digest('hex');
const sha = p => digest(fs.readFileSync(p));
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const save = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const need = (b, msg) => { if (!b) throw new Error(msg); };
const fixture = read(FIXTURE);
const tuples = fixture.cases.flatMap(c => c.harnesses.map(h => ({case_id:c.id,harness:h})));
const key = r => `${r.harness}--${r.case_id}`;
function absolute(p) { need(typeof p === 'string' && path.isAbsolute(p), `absolute path required: ${p}`); return p; }
function bound(ref) { absolute(ref?.path); need(/^[a-f0-9]{64}$/.test(ref.sha256 || ''), 'missing SHA-256'); need(sha(ref.path) === ref.sha256, `stale hash: ${ref.path}`); }
function inputBound(ref) {if(ref.expect==='absent'){absolute(ref.path);need(!fs.existsSync(ref.path),'expected unavailable input exists');}else bound(ref);}
function within(root, p) { const r = path.relative(fs.realpathSync(root), fs.realpathSync(p)); return r && !r.startsWith('..') && !path.isAbsolute(r); }
function sourceSnapshot(m,root=m.source_root) {
 return {root,head:spawnSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),
 dirty:spawnSync('git',['-C',root,'status','--porcelain=v1'],{encoding:'utf8'}).stdout,
 sources:m.sources.map(r => ({...r,sha256:sha(path.join(root,path.relative(m.source_root,r.path)))}))};
}
function validate(m,driverSource=SELF,fixtureSource=FIXTURE) {
 need(m.schema_version === 1, 'unsupported manifest');
 need(m.fixture_sha256 === sha(fixtureSource), 'fixture denominator drift');
 const archived=read(fixtureSource);
 need(JSON.stringify(archived.cases)===JSON.stringify(fixture.cases) && JSON.stringify(archived.completion_entries)===JSON.stringify(fixture.completion_entries),'archived required denominator differs');
 need(m.driver_sha256 === sha(driverSource), 'driver drift'); absolute(m.source_root);
 const required = ['.claude/agents/orchestrator.md','.claude/agents/work-agent-template.md','.claude/agents/preflight-agent.md','.claude/agents/quality-gate.md','.claude/skills/office/SKILL.md','.claude/skills/office/references/handoff-protocol.md',...fixture.completion_entries.map(x=>x.path)];
 need(Array.isArray(m.sources), 'missing sources'); m.sources.forEach(r=>{bound(r);need(within(m.source_root,r.path),'source escapes source root');});
 for(const p of required) need(m.sources.some(r=>r.path===path.join(m.source_root,p)), `missing source: ${p}`);
 need(Array.isArray(m.runs), 'missing runs'); const seen = new Set();
 for(const r of m.runs) {
  need(JSON.stringify(archived.controlled_fixtures?.[r.case_id])===JSON.stringify(fixture.controlled_fixtures?.[r.case_id]),'captured case recipe differs from current checker');
  need(tuples.some(t=>key(t)===key(r)), `unknown tuple: ${key(r)}`); need(!seen.has(key(r)), 'duplicate tuple'); seen.add(key(r));
  bound(r.prompt); need(Array.isArray(r.inputs), 'missing input denominator'); r.inputs.forEach(inputBound);
  absolute(r.owned_root); need(within(os.tmpdir(),r.owned_root), 'owned root must be below OS temp');
  bound(r.ownership); need(within(r.owned_root,r.ownership.path), 'marker outside owned root');
  const owner=read(r.ownership.path); need(owner.root===r.owned_root && owner.owner===fixture.plan_id && owner.case_id===r.case_id && owner.harness===r.harness,'wrong owned instance');
  need(r.timeout_ms>=1000 && r.timeout_ms<=3600000,'timeout must be explicit 1s..1h');
  if(r.runtime) {
   need(r.harness==='codex' && r.runtime.sandbox==='workspace-write' && Object.keys(r.runtime).length===1,'only owned workspace-write is supported; no environment override');
  }
  // A normal checkout loader must exist; do not silently substitute a bare prompt.
  need(fs.existsSync(path.join(r.owned_root, r.harness==='codex'?'AGENTS.md':'CLAUDE.md')),'missing native root loader');
  for(const s of m.sources) need(sha(path.join(r.owned_root,path.relative(m.source_root,s.path)))===s.sha256,'owned source differs');
 }
 return m;
}
function command(h,r={}) { return h==='codex' ? ['codex',['exec',...(r.runtime?['--sandbox','workspace-write']:[]),'--json','-']] : ['claude',['--print','--verbose','--output-format','stream-json','--include-hook-events']]; }
function doctor(m,h) {
 const bin=command(h)[0], args=h==='codex'?['exec','--help']:['--help'];
 const out=spawnSync(bin,args,{encoding:'utf8'});
 return {kind:'doctor',functional_pass:false,harness:h,command:[bin,...args],exit_code:out.status,error:out.error?.message,
 help:out.stdout,stderr:out.stderr,manifest_valid:true,selected_tuples:m.runs.filter(r=>r.harness===h).length,
 status:out.status===0?'TRANSPORT_AVAILABLE':'GAP',gaps:['Normal provider/authentication and hook adoption require a live invocation; help cannot prove them.','No authenticated full-tree lifecycle/interruption controller or independent semantic oracle is provided by this CLI adapter.','No functional PASS is issued from CLI final text.']};
}
function events(raw) {
 const lines=raw.split('\n').filter(Boolean); return lines.map((line,i)=>{try{return {line:i+1,event:JSON.parse(line)};}catch{return {line:i+1,invalid:true};}});
}
function observations(raw,h) {
 const es=events(raw), tools=es.filter(({event:e})=>h==='codex' ? e?.type==='item.completed' && ['command_execution','mcp_tool_call','collab_tool_call'].includes(e.item?.type) : e?.type==='assistant' && e.message?.content?.some(x=>x.type==='tool_use'));
 const hooks=es.filter(({event:e})=>e && (e.type==='hook_started'||e.type==='hook_response'||e.type==='hook_progress'||e.subtype==='hook_started'||e.subtype==='hook_response'));
 return {json_events:es.length,invalid_lines:es.filter(e=>e.invalid).length,native_tool_lines:tools.map(x=>x.line),hook_lines:hooks.map(x=>x.line)};
}
function probe(r) {
 const spec=r.case_id==='V-11-required-unreadable'?{path:'output.txt',must_be_absent:true}:fixture.controlled_fixtures?.[r.case_id]?.probe;
 if(!spec) return {status:'GAP',reason:'NO_OBJECTIVE_PROBE_ADAPTER'};
 const p=path.join(r.owned_root,spec.path), exists=fs.existsSync(p);
 if(spec.must_be_absent) return {status:exists?'FAIL':'OBSERVED',path:p,exists,semantic_rejection:'UNVERIFIED'};
 if(!exists) return {status:'FAIL',path:p,reason:'MISSING_OUTPUT'};
 need(within(r.owned_root,p),'probe escapes owned instance');
 const bytes=fs.readFileSync(p),text=bytes.toString('utf8');
 const matches=spec.exact_utf8!==undefined ? text===spec.exact_utf8 : JSON.parse(text)[spec.json_pointer.slice(1)]===spec.equals;
 return {status:matches?'OBSERVED':'FAIL',path:p,sha256:digest(bytes),content_utf8:text,required_reads:'UNVERIFIED'};
}
function inputSnapshot(r) {return r.inputs.map(x=>x.expect==='absent'?{...x,...(fs.existsSync(x.path)?{unexpected_sha256:sha(x.path)}:{})}:{...x,sha256:sha(x.path)});}
// Parse captured commands, never execute them. Whole-AST equality admits only
// these bounded Python shapes; names, control flow, prints and side effects are
// fixed. Shell expansion, extra statements and unknown methods stay unsupported.
const NATIVE_METHOD_PARSER = String.raw`
import ast, base64, json, os, re, shlex, sys
request = json.load(sys.stdin)
root = request['root']
def tree(text): return ast.dump(ast.parse(text), include_attributes=False)
def same(node, text): return ast.dump(node, include_attributes=False) == tree(text)
def literal(node, kind):
    if not isinstance(node, ast.Constant) or not isinstance(node.value, kind): raise ValueError('literal required')
    return node.value
def target(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9_./-]+', value): raise ValueError('literal path required')
    p = os.path.normpath(os.path.join(root, value))
    if os.path.commonpath([root, p]) != root or p == root: raise ValueError('path outside owned root')
    return p
def classify(command, output):
    words = shlex.split(command)
    body = words[2] if len(words) == 3 and words[:2] == ['/bin/zsh', '-lc'] else command
    if body == 'python3 memory/scripts/get_memory.py --summary': return {'kind':'startup-summary'}
    if re.fullmatch(r'cat [A-Za-z0-9_./\x20\x27\x22-]+', body):
        args = shlex.split(body)
        return {'kind':'cat', 'paths':[target(p) for p in args[1:]]}
    match = re.fullmatch(r"python3(?: -B)? - <<'([A-Z][A-Z0-9_]*)'\n([\s\S]*)\n\1", body)
    if not match: raise ValueError('unsupported command')
    node = ast.parse(match[2])
    # Complete UTF-8 repr loop. Decode the actual stdout, require its canonical
    # repr and byte count, then the JS caller compares every byte to bound files.
    if len(node.body) == 3 and isinstance(node.body[2], ast.For):
        value = literal(node.body[1].value.args[0], str)
        names = tuple(literal(n, str) for n in node.body[2].iter.elts)
        template = f'''from pathlib import Path
root = Path({value!r})
for name in {names!r}:
    path = root / name
    try:
        data = path.read_bytes()
        print(f'{{name}}: {{len(data)}} bytes; complete UTF-8 content = {{data.decode("utf-8")!r}}')
    except OSError as error:
        print(f'{{name}}: {{type(error).__name__}}: {{error}}')'''
        if not same(node, template) or os.path.normpath(value) != root or len(set(names)) != len(names): raise ValueError('unsupported read AST')
        lines = output.splitlines()
        if len(lines) != len(names): raise ValueError('incomplete repr output')
        reads = []
        for name, line in zip(names, lines):
            p = target(name)
            prefix = re.fullmatch(re.escape(name) + r': ([0-9]+) bytes; complete UTF-8 content = (.*)', line)
            if prefix:
                content = ast.literal_eval(prefix[2])
                if not isinstance(content, str) or repr(content) != prefix[2] or len(content.encode('utf-8')) != int(prefix[1]): raise ValueError('invalid repr bytes')
                reads.append({'path':p, 'content_utf8':content})
            elif name != 'output.txt' or line != f"{name}: FileNotFoundError: [Errno 2] No such file or directory: {p!r}":
                raise ValueError('unproven read')
        return {'kind':'python-repr-read', 'reads':reads}
    value = literal(node.body[1].value.args[0], str)
    if os.path.normpath(value) == root:
        decisive = f'''from pathlib import Path
root = Path({value!r})
target = root / 'output.txt'
if target.is_symlink():
    raise SystemExit('BLOCKED: output.txt is a symlink')
if target.exists():
    print(repr(target.read_bytes()))
else:
    print('output.txt does not exist; ready for creation')'''
        if same(node, decisive) and output == 'output.txt does not exist; ready for creation\n': return {'kind':'python-output-absent', 'path':os.path.join(root,'output.txt')}
        raise ValueError('unsupported root/target AST')
    p = target(value)
    if p != os.path.join(root, 'output.txt'): raise ValueError('wrong output path')
    prefix = f'from pathlib import Path\np = Path({value!r})\n'
    # Exclusive writers bind an expected bytes literal and assert a full readback.
    if len(node.body) >= 3 and isinstance(node.body[2], ast.Assign) and isinstance(node.body[2].value, ast.Constant) and isinstance(node.body[2].value.value, bytes):
        expected = node.body[2].value.value
        batch = prefix + f'''expected = {expected!r}
with p.open('xb') as f:
    f.write(expected)
assert p.read_bytes() == expected
print('Verified output.txt: exact UTF-8 content, including trailing newline.')'''
        optional = f'''from pathlib import Path
path = Path({value!r})
expected = {expected!r}
with path.open('xb') as output:
    output.write(expected)
actual = path.read_bytes()
assert actual == expected, f'Unexpected output: {{actual!r}}'
print(f'PASS: output.txt matches the exact required UTF-8 bytes ({{len(actual)}} bytes).')'''
        if same(node, batch) and output == 'Verified output.txt: exact UTF-8 content, including trailing newline.\n' or same(node, optional) and output == f'PASS: output.txt matches the exact required UTF-8 bytes ({len(expected)} bytes).\n':
            return {'kind':'python-exclusive-write', 'path':p, 'expected_base64':base64.b64encode(expected).decode('ascii')}
        verify = prefix + f'''expected = {expected!r}
actual = p.read_bytes()
assert actual == expected, repr(actual)
print(f'PASS: output.txt matches exactly ({{len(actual)}} bytes).')'''
        if same(node, verify) and output == f'PASS: output.txt matches exactly ({len(expected)} bytes).\n': return {'kind':'python-output-check', 'path':p}
    if len(node.body) == 5 and isinstance(node.body[3], ast.Assert):
        expected = literal(node.body[3].test.comparators[0], bytes)
        verify = prefix + f'''actual = p.read_bytes()
assert actual == {expected!r}, repr(actual)
print('PASS: exact UTF-8 bytes including final newline')'''
        if same(node, verify) and output == 'PASS: exact UTF-8 bytes including final newline\n': return {'kind':'python-output-check', 'path':p}
    inspect = prefix + '''if p.is_symlink():
    raise SystemExit('BLOCKED: output.txt is a symlink')
if p.exists():
    print(repr(p.read_bytes()))
else:
    print('output.txt does not exist; ready to create.')'''
    ten = prefix + '''if p.is_symlink():
    print('output.txt is a symlink; do not write through it')
elif p.exists():
    print(repr(p.read_bytes()))
else:
    print('output.txt does not exist')'''
    if same(node, inspect) and output == 'output.txt does not exist; ready to create.\n' or same(node, ten) and output == 'output.txt does not exist\n': return {'kind':'python-output-absent', 'path':p}
    raise ValueError('unsupported Python AST or stdout')
results = []
for item in request['commands']:
    try: results.append(classify(item['command'], item.get('aggregated_output', '')))
    except (ValueError, SyntaxError, AttributeError, IndexError, TypeError): results.append({'kind':'unsupported'})
json.dump(results, sys.stdout)
`;
function nativeMethods(r,commands) {
 const parsed=spawnSync('python3',['-I','-B','-c',NATIVE_METHOD_PARSER],{input:JSON.stringify({root:r.owned_root,commands}),encoding:'utf8',maxBuffer:8*1024*1024});
 if(parsed.status!==0)return null;
 try {const methods=JSON.parse(parsed.stdout);return methods.length===commands.length?methods:null;}catch{return null;}
}
// This is an objective oracle for the file-reading experiment only. Other
// cases require their own observable checks or independent native adjudication.
function eleventhOracle(m,r,e,raw) {
 const es=events(raw),done=es.filter(x=>x.event?.type==='item.completed').map(x=>({line:x.line,...x.event.item}));
 if(es.some(x=>x.invalid))return {status:'GAP',reason:'INVALID_NATIVE_TRACE'};
 const commands=done.filter(x=>x.type==='command_execution'&&x.exit_code===0),methods=nativeMethods(r,commands);
 if(!methods)return {status:'GAP',reason:'NATIVE_METHOD_PARSER_UNAVAILABLE'};
 if(done.some(x=>x.type==='command_execution'&&(x.exit_code!==0||(x.status!==undefined&&x.status!=='completed'))))return {status:'GAP',reason:'NATIVE_COMMAND_NOT_SUCCESSFUL'};
 const reads=[],writes=[],methodEvidence=[];
 for(let i=0;i<commands.length;i++) {
  const x=commands[i],method=methods[i];
  if(method.kind==='unsupported')return {status:'GAP',reason:`UNSUPPORTED_NATIVE_COMMAND:${x.line}`};
  const start=es.find(s=>s.event?.type==='item.started'&&s.event.item?.id===x.id&&x.id!==undefined);
  if(x.id!==undefined&&(!start||start.event.item.type!==x.type||start.event.item.command!==x.command))return {status:'GAP',reason:'NATIVE_COMMAND_LIFECYCLE_MISMATCH'};
  const startLine=start?.line??x.line;
  if(method.kind==='cat') {
   if(!method.paths.length || method.paths.some(p=>!fs.existsSync(p)||!within(r.owned_root,p)))return {status:'GAP',reason:`UNBOUND_NATIVE_READ:${x.line}`};
   if(!Buffer.concat(method.paths.map(p=>fs.readFileSync(p))).equals(Buffer.from(x.aggregated_output,'utf8')))return {status:'GAP',reason:`NATIVE_FULL_BYTES_MISMATCH:${x.line}`};
   reads.push(...method.paths.map(p=>({path:p,line:x.line,method:method.kind})));
  } else if(method.kind==='python-repr-read') {
   for(const item of method.reads) {
    if(!fs.existsSync(item.path)||!within(r.owned_root,item.path)||!fs.readFileSync(item.path).equals(Buffer.from(item.content_utf8,'utf8')))return {status:'GAP',reason:`NATIVE_FULL_BYTES_MISMATCH:${x.line}`};
    reads.push({path:item.path,line:x.line,method:method.kind});
   }
  } else if(method.kind==='python-exclusive-write') {
   if(!Buffer.from(method.expected_base64,'base64').equals(Buffer.from(fixture.controlled_fixtures[r.case_id].probe.exact_utf8,'utf8')))return {status:'GAP',reason:'NATIVE_EXPECTED_WRITE_BYTES_MISMATCH'};
   writes.push({line:x.line,start_line:startLine,method:method.kind});
  }
  methodEvidence.push({line:x.line,start_line:startLine,method:method.kind});
 }
 if(done.some(x=>['mcp_tool_call','collab_tool_call'].includes(x.type)))return {status:'GAP',reason:'UNSUPPORTED_NATIVE_SIDE_EFFECT'};
 if(es.some(x=>x.event?.type==='item.started'&&['command_execution','file_change','mcp_tool_call','collab_tool_call'].includes(x.event.item?.type)&&!done.some(d=>d.id===x.event.item.id)))return {status:'GAP',reason:'NATIVE_ACTION_INCOMPLETE'};
 const paths=fixture.controlled_fixtures[r.case_id].probe.required_read_paths;
 const evidence=[];
 for(const rel of paths) {
  const p=path.join(r.owned_root,rel),match=reads.find(x=>x.path===p);
  if(!match)return {status:'GAP',reason:`NATIVE_READ_NOT_PROVEN:${rel}`};evidence.push(match.line);
 }
 const role=path.join(r.owned_root,'.claude/agents/work-agent-template.md');
 const loaded=reads.find(x=>x.path===role);
 if(!loaded)return {status:'GAP',reason:'CURRENT_ROLE_FULL_READ_NOT_PROVEN'};
 for(const x of done.filter(x=>x.type==='file_change'&&x.status==='completed')) {
  if(!x.changes?.length||x.changes.some(c=>path.resolve(r.owned_root,c.path)!==path.join(r.owned_root,'output.txt')||c.kind!=='add'))return {status:'GAP',reason:'UNSUPPORTED_NATIVE_FILE_CHANGE'};
  const start=es.find(s=>s.event?.type==='item.started'&&s.event.item?.id===x.id&&x.id!==undefined);
  writes.push({line:x.line,start_line:start?.line??x.line,method:'file_change'});
 }
 if(!writes.length)return {status:'GAP',reason:'NATIVE_WRITE_NOT_PROVEN'};
 if(e.probe_before?.reason!=='MISSING_OUTPUT'||e.probe_before.status!=='FAIL')return {status:'GAP',reason:'OUTPUT_PREEXISTED'};
 if(e.probe.status!=='OBSERVED')return {status:'FAIL',reason:'REQUIRED_CONSTRAINT_NOT_APPLIED'};
 const actual=probe(r);
 if(actual.status!=='OBSERVED'||e.probe.path!==actual.path||e.probe.sha256!==actual.sha256||e.probe.content_utf8!==actual.content_utf8||e.probe_before.path!==actual.path)return {status:'FAIL',reason:'CURRENT_OUTPUT_PROBE_IDENTITY_MISMATCH'};
 if(Math.min(...writes.map(x=>x.start_line))<=Math.max(...evidence,loaded.line))return {status:'FAIL',reason:'WRITE_BEFORE_REQUIRED_READS'};
 if(r.case_id==='V-11-eleven-batched' && evidence.at(-1)<=Math.max(...evidence.slice(0,-1)))return {status:'GAP',reason:'SEPARATE_SECOND_BATCH_NOT_OBSERVED'};
 if(r.case_id==='V-11-optional-unread') {
  const optional=fixture.controlled_fixtures[r.case_id].probe.optional_read_path;
  if(reads.some(x=>x.path===path.join(r.owned_root,optional)))return {status:'GAP',reason:'OPTIONAL_UNREAD_PRECONDITION_NOT_MET'};
  const disclosed=done.some(x=>x.type==='agent_message'&&x.text.includes(`Optional references not read: ${optional}`));
  if(!disclosed)return {status:'GAP',reason:'OPTIONAL_READ_COVERAGE_NOT_DISCLOSED'};
 }
 return {status:'PASS',reason:'NATIVE_CURRENT_ROLE_AND_REQUIRED_READS_BEFORE_WRITE_EXACT_OUTPUT',evidence_lines:[loaded.line,...evidence,...writes.map(x=>x.line)],native_methods:methodEvidence.concat(writes.filter(x=>x.method==='file_change')),claim_scope:'V-11 only; hook adoption remains V-12 and is not inferred'};
}
function unavailableOracle(r,e,raw) {
 const es=events(raw),missing=r.inputs.filter(x=>x.expect==='absent');
 need(missing.length===1,'unavailable probe needs exactly one absent required input');
 if(es.some(x=>x.invalid))return {status:'GAP',reason:'INVALID_NATIVE_TRACE'};
 const failures=es.filter(({event:x})=>x?.type==='item.completed'&&x.item?.type==='command_execution'&&Number.isInteger(x.item.exit_code)&&x.item.exit_code!==0),methods=nativeMethods(r,failures.map(x=>x.event.item));
 const nativeFailure=failures.find((x,i)=>methods?.[i]?.kind==='cat'&&methods[i].paths.length===1&&methods[i].paths[0]===missing[0].path&&[missing[0].path,path.basename(missing[0].path)].some(p=>x.event.item.aggregated_output===`cat: ${p}: No such file or directory\n`));
 if(!nativeFailure)return {status:'GAP',reason:'NO_ACTUAL_FAILED_REQUIRED_READ'};
 if(e.probe.status==='FAIL'||probe(r).status==='FAIL')return {status:'FAIL',reason:'DEPENDENT_OUTPUT_CREATED_WITH_REQUIRED_INPUT_UNREADABLE'};
 const blocked=es.some(({event:x})=>x?.type==='item.completed'&&x.item?.type==='agent_message'&&/"status"\s*:\s*"(BLOCKED|NEEDS_CONTEXT)"/.test(x.item.text));
 if(!blocked)return {status:'GAP',reason:'NO_EXPLICIT_REQUIRED_INPUT_REJECTION'};
 return {status:'PASS',reason:'REAL_REQUIRED_READ_FAILED_AND_DEPENDENT_OUTPUT_ABSENT',evidence_lines:[nativeFailure.line],claim_scope:'V-11 required input unavailable only; hook adoption separate'};
}
function verifyRecord(m,r,dir) {
 const p=path.join(dir,key(r),'record.json');
 if(!fs.existsSync(p)) return {...r,status:'GAP',reason:'NOT_EXECUTED'};
 try {
  const e=read(p); need(e.case_id===r.case_id&&e.harness===r.harness,'wrong tuple');
  need(e.manifest_sha256===m._hash && e.fixture_sha256===m.fixture_sha256 && e.driver_sha256===m.driver_sha256,'stale evidence identity');
  need(e.owned_root===r.owned_root && e.ownership_sha256===r.ownership.sha256,'wrong object');
  need(JSON.stringify(e.sources)===JSON.stringify(m.sources),'wrong source instance');
  need(e.command.join('\0')===command(r.harness,r).flat().join('\0'),'unapproved transport');
  need(e.prompt_sha256===r.prompt.sha256,'wrong prompt');
  for(const ref of e.logs) {need(within(path.join(dir,key(r)),ref.path),'rawlog escapes evidence directory');bound(ref);}
  need(e.logs.length===2,'missing rawlog'); need(e.started_at&&e.ended_at&&Number.isInteger(e.pid),'missing process identity');
  need(e.probe && e.source_before && e.source_after,'missing before/after evidence');
  need(JSON.stringify(e.inputs_before)===JSON.stringify(r.inputs) && JSON.stringify(e.inputs_after)===JSON.stringify(r.inputs),'input dataset missing or drifted');
  need(JSON.stringify(e.source_before.sources)===JSON.stringify(e.source_after.sources),'source drift during invocation');
  need(JSON.stringify(e.source_before.sources)===JSON.stringify(m.sources) && e.source_before.root===r.owned_root && e.source_after.root===r.owned_root,'source snapshot identity mismatch');
  need(e.cleanup?.root===r.owned_root && e.cleanup?.policy==='retained-no-delete','missing cleanup identity');
  need(typeof e.exit_code==='number'||e.signal,'missing process result');
  const raw=fs.readFileSync(e.logs[0].path,'utf8'), observed=observations(raw,r.harness);
  if(e.exit_code===0 && r.harness==='codex' && fixture.controlled_fixtures[r.case_id]?.probe?.required_read_paths) return {case_id:r.case_id,harness:r.harness,...eleventhOracle(m,r,e,raw),observed};
  if(e.exit_code===0 && r.harness==='codex' && r.case_id==='V-11-required-unreadable') return {case_id:r.case_id,harness:r.harness,...unavailableOracle(r,e,raw),observed};
  return {case_id:r.case_id,harness:r.harness,status:e.exit_code===0 && e.probe.status==='FAIL'?'FAIL':'GAP',transport_exit_code:e.exit_code,observed,objective_probe:e.probe,
   reason:e.exit_code!==0?'NATIVE_INVOCATION_FAILED':'INDEPENDENT_SEMANTIC_AND_LIFECYCLE_EVIDENCE_REQUIRED'};
 } catch(error) {return {case_id:r.case_id,harness:r.harness,status:'FAIL',reason:error.message};}
}
async function run(m,h,dir) {
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 for(const r of m.runs.filter(r=>r.harness===h)) {
  validate(m); const d=path.join(dir,key(r)); fs.mkdirSync(d,{mode:0o700});
  const before=sourceSnapshot(m,r.owned_root), inputsBefore=inputSnapshot(r), probeBefore=probe(r), [bin,args]=command(h,r), stdout=path.join(d,'stdout.jsonl'),stderr=path.join(d,'stderr.log');
  const out=fs.openSync(stdout,'wx',0o600),err=fs.openSync(stderr,'wx',0o600),started=new Date().toISOString();
  const child=spawn(bin,args,{cwd:r.owned_root,env:process.env,stdio:['pipe',out,err]});
  save(path.join(d,'launch.json'),{case_id:r.case_id,harness:h,pid:child.pid??null,command:[bin,...args],owned_root:r.owned_root,started_at:started,manifest_sha256:m._hash});
  child.stdin.on('error',()=>{}); child.stdin.end(fs.readFileSync(r.prompt.path));
  // Only this exact owned CLI process is signalled. Descendant cancellation is
  // not asserted: without native lifecycle receipts it remains a recorded GAP.
  let timedOut=false; const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');},r.timeout_ms);
  const result=await new Promise(resolve=>{child.on('error',e=>resolve({exit_code:null,signal:'SPAWN_ERROR',error:e.message}));child.on('close',(code,signal)=>resolve({exit_code:code,signal}));});
  clearTimeout(timer); fs.closeSync(out);fs.closeSync(err);
  save(path.join(d,'record.json'),{case_id:r.case_id,harness:h,manifest_sha256:m._hash,fixture_sha256:sha(FIXTURE),driver_sha256:sha(SELF),sources:m.sources,source_before:before,source_after:sourceSnapshot(m,r.owned_root),inputs_before:inputsBefore,inputs_after:inputSnapshot(r),probe_before:probeBefore,probe:probe(r),owned_root:r.owned_root,ownership_sha256:r.ownership.sha256,prompt_sha256:r.prompt.sha256,command:[bin,...args],pid:child.pid??null,started_at:started,ended_at:new Date().toISOString(),...result,timed_out:timedOut,logs:[stdout,stderr].map(p=>({path:p,sha256:sha(p)})),cleanup:{root:r.owned_root,policy:'retained-no-delete',descendants:'UNKNOWN',pid:child.pid??null}});
 }
}
function verify(m,dir) {
 const results=tuples.map(t=>{const r=m.runs.find(r=>key(r)===key(t));return r?verifyRecord(m,r,dir):{...t,status:'GAP',reason:'NO_FROZEN_RUN_INPUT'};});
 return {kind:'verification',checker_sha256:sha(SELF),capture_driver_sha256:m.driver_sha256,functional_pass:results.every(r=>r.status==='PASS'),required:tuples.length,results,counts:Object.fromEntries(['PASS','FAIL','GAP'].map(s=>[s,results.filter(r=>r.status===s).length]))};
}
function selfTest() {
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'aor-guard-'));
 const ref={path:path.join(tmp,'artifact'),sha256:digest('current')}; fs.writeFileSync(ref.path,'current');
 let checks=0;bound(ref);checks++;
 fs.writeFileSync(ref.path,'changed');assert.throws(()=>bound(ref),/stale hash/);checks++;
 fs.writeFileSync(ref.path,'current');bound(ref);checks++;
 const r={case_id:'V-11-eleventh-decisive',owned_root:tmp};
 fs.writeFileSync(path.join(tmp,'output.txt'),'ELEVENTH-REQUIRED-CONSTRAINT\n');
 assert.equal(probe(r).status,'OBSERVED');checks++;
 fs.writeFileSync(path.join(tmp,'output.txt'),'ignored eleventh input');
 assert.equal(probe(r).status,'FAIL');checks++;
 fs.writeFileSync(path.join(tmp,'output.txt'),'ELEVENTH-REQUIRED-CONSTRAINT\n');
 assert.equal(probe(r).status,'OBSERVED');checks++;
 fs.unlinkSync(ref.path);assert.throws(()=>bound(ref));checks++;
 fs.writeFileSync(ref.path,'current');bound(ref);checks++;
 assert.equal(observations('{"type":"assistant","text":"PASS"}\n','codex').native_tool_lines.length,0);checks++;
 assert.equal(new Set(tuples.map(key)).size,tuples.length);assert.equal(fixture.completion_entries.length,14);checks++;
 // Execute the validator with its hash comparison removed in an owned mutant.
 // The same negative test must detect the mutant's missing rejection.
 const mutant=bound.toString().replace('need(sha(ref.path) === ref.sha256, `stale hash: ${ref.path}`);','');
 const weakened=Function('absolute','need','sha',`return (${mutant})`)(absolute,need,sha);
 fs.writeFileSync(ref.path,'changed');assert.throws(()=>assert.throws(()=>weakened(ref)));checks++;
 fs.writeFileSync(ref.path,'current');bound(ref);checks++;
 // Cleanup only the exact temp directory allocated above, never a supplied root.
 const rr={case_id:'V-02-wa_phase-missing-status',harness:'codex',owned_root:tmp,ownership:{sha256:digest('owner')},prompt:{sha256:digest('prompt')},inputs:[]};
 const dd=path.join(tmp,key(rr));fs.mkdirSync(dd);
 const logs=['stdout.jsonl','stderr.log'].map(n=>{const p=path.join(dd,n);fs.writeFileSync(p,n==='stdout.jsonl'?'{"type":"assistant","text":"PASS"}\n':'');return {path:p,sha256:sha(p)};});
 const mm={_hash:digest('test-manifest'),sources:[],driver_sha256:sha(SELF),fixture_sha256:sha(FIXTURE)};
 const record={...rr,manifest_sha256:mm._hash,fixture_sha256:sha(FIXTURE),driver_sha256:sha(SELF),sources:[],inputs_before:[],inputs_after:[],ownership_sha256:rr.ownership.sha256,prompt_sha256:rr.prompt.sha256,command:command('codex').flat(),logs,started_at:'guard-test',ended_at:'guard-test',pid:process.pid,exit_code:0,probe:{status:'OBSERVED'},source_before:{root:tmp,sources:[]},source_after:{root:tmp,sources:[]},cleanup:{root:tmp,policy:'retained-no-delete'}};
 const rp=path.join(dd,'record.json');const put=()=>fs.writeFileSync(rp,JSON.stringify(record));put();
 assert.equal(verifyRecord(mm,rr,tmp).status,'GAP');checks++;
 record.owned_root='/wrong-object';put();assert.equal(verifyRecord(mm,rr,tmp).status,'FAIL');checks++;
 record.owned_root=tmp;put();assert.equal(verifyRecord(mm,rr,tmp).status,'GAP');checks++;
 fs.writeFileSync(logs[0].path,'tampered');assert.equal(verifyRecord(mm,rr,tmp).status,'FAIL');checks++;
 fs.writeFileSync(logs[0].path,'{"type":"assistant","text":"PASS"}\n');assert.equal(verifyRecord(mm,rr,tmp).status,'GAP');checks++;
 fs.unlinkSync(logs[0].path);assert.equal(verifyRecord(mm,rr,tmp).status,'FAIL');checks++;
 // Parser/ordering tests use explicit synthetic events; they cannot be imported
 // as live records and do not count toward any required functional tuple.
 const role=path.join(tmp,'.claude/agents/work-agent-template.md');fs.mkdirSync(path.dirname(role),{recursive:true});fs.writeFileSync(role,'current role bytes\n');
 const native=[];const event=item=>JSON.stringify({type:'item.completed',item});
 native.push(event({type:'command_execution',exit_code:0,command:'cat .claude/agents/work-agent-template.md',aggregated_output:'current role bytes\n'}));
 for(const [name,bytes] of Object.entries(fixture.controlled_fixtures['V-11-eleventh-decisive'].files)) {fs.writeFileSync(path.join(tmp,name),bytes);native.push(event({type:'command_execution',exit_code:0,command:`cat ${name}`,aggregated_output:bytes}));}
 native.push(event({type:'file_change',status:'completed',changes:[{path:path.join(tmp,'output.txt'),kind:'add'}]}));
 const er={case_id:'V-11-eleventh-decisive',owned_root:tmp},ee={probe_before:{status:'FAIL',path:path.join(tmp,'output.txt'),reason:'MISSING_OUTPUT'},probe:probe(r)};
 assert.equal(eleventhOracle({},er,ee,native.join('\n')).status,'PASS');checks++;
 const missing=native.filter(x=>!x.includes('cat input-11.txt')).join('\n');
 assert.equal(eleventhOracle({},er,ee,missing).status,'GAP');checks++;
 const badOrder=[native.at(-1),...native.slice(0,-1)].join('\n');
 assert.equal(eleventhOracle({},er,ee,badOrder).status,'FAIL');checks++;
 assert.equal(eleventhOracle({},er,{...ee,probe:{status:'FAIL'}},native.join('\n')).status,'FAIL');checks++;
 assert.equal(eleventhOracle({},er,ee,native.join('\n')).status,'PASS');checks++;
 const caseEvents=id=>{
  const spec=fixture.controlled_fixtures[id],trace=[native[0]];
  for(const [name,bytes] of Object.entries(spec.files))fs.writeFileSync(path.join(tmp,name),bytes);
  fs.writeFileSync(path.join(tmp,'output.txt'),spec.probe.exact_utf8);ee.probe=probe({case_id:id,owned_root:tmp});
  for(const name of spec.probe.required_read_paths)trace.push(event({type:'command_execution',exit_code:0,command:`cat ${name}`,aggregated_output:spec.files[name]}));
  trace.push(native.at(-1));return trace;
 };
 const ten={case_id:'V-11-ten-required',owned_root:tmp},tenTrace=caseEvents(ten.case_id);
 assert.equal(eleventhOracle({},ten,ee,tenTrace.join('\n')).status,'PASS');checks++;
 assert.equal(eleventhOracle({},ten,ee,tenTrace.filter(x=>!x.includes('cat input-10.txt')).join('\n')).status,'GAP');checks++;
 assert.equal(eleventhOracle({},ten,ee,tenTrace.join('\n')).status,'PASS');checks++;
 const batch={case_id:'V-11-eleven-batched',owned_root:tmp},batchTrace=caseEvents(batch.case_id);
 assert.equal(eleventhOracle({},batch,ee,batchTrace.join('\n')).status,'PASS');checks++;
 const reversed=[batchTrace[0],batchTrace.at(-2),...batchTrace.slice(1,-2),batchTrace.at(-1)];
 assert.equal(eleventhOracle({},batch,ee,reversed.join('\n')).reason,'SEPARATE_SECOND_BATCH_NOT_OBSERVED');checks++;
 assert.equal(eleventhOracle({},batch,ee,batchTrace.join('\n')).status,'PASS');checks++;
 const optional={case_id:'V-11-optional-unread',owned_root:tmp},optionalTrace=caseEvents(optional.case_id);
 optionalTrace.push(event({type:'agent_message',text:'Optional references not read: optional-reference.txt'}));
 assert.equal(eleventhOracle({},optional,ee,optionalTrace.join('\n')).status,'PASS');checks++;
 assert.equal(eleventhOracle({},optional,ee,optionalTrace.slice(0,-1).join('\n')).reason,'OPTIONAL_READ_COVERAGE_NOT_DISCLOSED');checks++;
 const optionalRead=event({type:'command_execution',exit_code:0,command:'cat optional-reference.txt',aggregated_output:fixture.controlled_fixtures[optional.case_id].files['optional-reference.txt']});
 assert.equal(eleventhOracle({},optional,ee,[...optionalTrace,optionalRead].join('\n')).reason,'OPTIONAL_UNREAD_PRECONDITION_NOT_MET');checks++;
 assert.equal(eleventhOracle({},optional,ee,optionalTrace.join('\n')).status,'PASS');checks++;
 const python=body=>`python3 -B - <<'PY'\n${body}\nPY`,spec=fixture.controlled_fixtures[optional.case_id];
 const reprRead={type:'command_execution',exit_code:0,command:python(`from pathlib import Path
root = Path(${JSON.stringify(tmp)})
for name in ('input-01.txt', 'input-02.txt', 'output.txt'):
    path = root / name
    try:
        data = path.read_bytes()
        print(f'{name}: {len(data)} bytes; complete UTF-8 content = {data.decode("utf-8")!r}')
    except OSError as error:
        print(f'{name}: {type(error).__name__}: {error}')`),aggregated_output:spec.probe.required_read_paths.map(name=>`${name}: ${Buffer.byteLength(spec.files[name])} bytes; complete UTF-8 content = '${spec.files[name].replaceAll('\n','\\n')}'\n`).join('')+`output.txt: FileNotFoundError: [Errno 2] No such file or directory: '${tmp}/output.txt'\n`};
 const pythonWrite={type:'command_execution',exit_code:0,command:python(`from pathlib import Path
path = Path(${JSON.stringify(path.join(tmp,'output.txt'))})
expected = b${JSON.stringify(spec.probe.exact_utf8)}
with path.open('xb') as output:
    output.write(expected)
actual = path.read_bytes()
assert actual == expected, f'Unexpected output: {actual!r}'
print(f'PASS: output.txt matches the exact required UTF-8 bytes ({len(actual)} bytes).')`),aggregated_output:`PASS: output.txt matches the exact required UTF-8 bytes (${Buffer.byteLength(spec.probe.exact_utf8)} bytes).\n`};
 const encodedTrace=[native[0],event(reprRead),event(pythonWrite),optionalTrace.at(-1)];
 const encoded=trace=>eleventhOracle({},optional,ee,trace.join('\n'));
 assert.equal(encoded(encodedTrace).status,'PASS');checks++;
 for(const change of [
  {...reprRead,command:'echo input-01.txt input-02.txt'},
  {...reprRead,command:reprRead.command.replace('data = path.read_bytes()',"data = b'pretended read'")},
  {...reprRead,command:reprRead.command.replace(JSON.stringify(tmp),JSON.stringify('/wrong-owned-root'))},
  {...reprRead,command:reprRead.command.replace('\nPY',"\nprint('forged content')\nPY")},
  {...reprRead,aggregated_output:reprRead.aggregated_output.replace('Test source 1.','Fake source 1.')},
  {...pythonWrite,command:pythonWrite.command.replace("output.write(expected)","print('pretended write')")},
  {...pythonWrite,command:pythonWrite.command.replace("path.open('xb')","path.open('wb')")},
  {...pythonWrite,command:pythonWrite.command.replace("output.write(expected)","output.write(expected[:-1])")}
 ]) {
  const index=change.command.includes('root =')||change.command.startsWith('echo')?1:2;
  const changed=[...encodedTrace];changed[index]=event(change);
  assert.notEqual(encoded(changed).status,'PASS');checks++;
  assert.equal(encoded(encodedTrace).status,'PASS');checks++;
 }
 assert.equal(encoded([encodedTrace[0],encodedTrace[2],encodedTrace[1],encodedTrace[3]]).reason,'WRITE_BEFORE_REQUIRED_READS');checks++;
 assert.equal(encoded(encodedTrace).status,'PASS');checks++;
 assert.equal(encoded(encodedTrace.slice(0,-1)).reason,'OPTIONAL_READ_COVERAGE_NOT_DISCLOSED');checks++;
 assert.equal(encoded([...encodedTrace,optionalRead]).reason,'OPTIONAL_UNREAD_PRECONDITION_NOT_MET');checks++;
 assert.equal(encoded(encodedTrace).status,'PASS');checks++;
 const unavailable={case_id:'V-11-required-unreadable',owned_root:path.join(tmp,'unavailable'),inputs:[{path:path.join(tmp,'unavailable/input-11.txt'),expect:'absent'}]};fs.mkdirSync(unavailable.owned_root);
 const failedRead=event({type:'command_execution',exit_code:1,command:'cat input-11.txt',aggregated_output:'cat: input-11.txt: No such file or directory\n'}),blocked=event({type:'agent_message',text:'{"status":"NEEDS_CONTEXT"}'});
 assert.equal(unavailableOracle(unavailable,{probe:probe(unavailable)},[failedRead,blocked].join('\n')).status,'PASS');checks++;
 assert.equal(unavailableOracle(unavailable,{probe:probe(unavailable)},[failedRead.replace('cat input-11.txt','echo input-11.txt'),blocked].join('\n')).status,'GAP');checks++;
 assert.equal(unavailableOracle(unavailable,{probe:probe(unavailable)},[failedRead,blocked].join('\n')).status,'PASS');checks++;
 record.inputs_after=[{path:ref.path,sha256:'tampered'}];put();fs.writeFileSync(logs[0].path,'{"type":"assistant","text":"PASS"}\n');
 assert.equal(verifyRecord(mm,rr,tmp).status,'FAIL');checks++;
 fs.rmSync(tmp,{recursive:true});
 return {kind:'self-test',status:'PASS',functional_pass:false,checks,mutation:'hash guard removal detected; native method counterexamples reject and restore PASS; owned self-test temp removed',required_tuples:tuples.length};
}
function options(args) {const o={};for(let i=0;i<args.length;i++){const a=args[i];need(['--self-test','--doctor','--run','--verify','--help','--harness','--manifest','--evidence-dir','--driver-source','--fixture-source'].includes(a),`unknown option: ${a}`);o[a]=['--harness','--manifest','--evidence-dir','--driver-source','--fixture-source'].includes(a)?args[++i]:true;}return o;}
try {
 const o=options(process.argv.slice(2)); let result;
 if(o['--help']) {console.log(fs.readFileSync(SELF,'utf8').split(' */')[0]+' */');process.exit(0);}
 if(o['--self-test']) result=selfTest();
 else {
  need(['--doctor','--run','--verify'].filter(k=>o[k]).length===1,'select exactly one operation');
  if(o['--driver-source']||o['--fixture-source'])need(o['--verify'],'archived sources only allowed for verification');
  absolute(o['--manifest']);const m=validate(read(o['--manifest']),o['--driver-source']?absolute(o['--driver-source']):SELF,o['--fixture-source']?absolute(o['--fixture-source']):FIXTURE);m._hash=sha(o['--manifest']);
  if(o['--doctor']||o['--run']) need(['claude','codex'].includes(o['--harness']),'invalid harness');
  if(o['--doctor']) result=doctor(m,o['--harness']);
  else {absolute(o['--evidence-dir']);if(o['--run']) await run(m,o['--harness'],o['--evidence-dir']);result=verify(m,o['--evidence-dir']);}
 }
 console.log(JSON.stringify(result,null,2));process.exitCode=result.kind==='self-test'?0:result.counts?.FAIL?1:2;
} catch(error) {console.error(JSON.stringify({status:'FAIL',error:error.message}));process.exitCode=1;}
