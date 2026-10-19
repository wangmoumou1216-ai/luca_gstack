#!/usr/bin/env node
// Public read-only inspection and native-only reservation syntax. No CLI unlock.
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {dirname,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readActivation,activationContentSha,dispatchAdmission} from './model-route-host.mjs';
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const text = v => typeof v === 'string' && v.trim().length > 0;
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
function options(args,allowed) {
  const out={};
  for(let i=0;i<args.length;i+=2) {
    if(!allowed.includes(args[i]) || out[args[i]] !== undefined || !text(args[i+1])) throw Error('INVALID_RECOVERY_ARGUMENTS');
    out[args[i]]=args[i+1];
  }
  return out;
}
// Deliberately a small argv grammar, not a shell evaluator. No redirection,
// expansion, pipeline, environment assignment, or second effect can hide here.
export function recoveryCommand(command,cwd,root) {
  if(!text(command)) return null;
  if(!command.includes('codex-review-recovery.mjs')) return null;
  const tokens=[];let word='',quote=null,active=false;
  for(const ch of command.trim()) {
    if(quote) {if(ch===quote) quote=null;else word+=ch;active=true;}
    else if(ch==='"'||ch==="'") {quote=ch;active=true;}
    else if(/\s/.test(ch)) {if(active){tokens.push(word);word='';active=false;}}
    else {word+=ch;active=true;}
  }
  if(active)tokens.push(word);
  const entry=basename(tokens[0]||'')==='node'
    &&resolve(cwd,tokens[1]||'')===resolve(root,'scripts/codex-review-recovery.mjs');
  // Mentioning the filename in cat/rg/tests is not invoking this effect. Only
  // the exact entry and reserve verb enter the restrictive native grammar.
  if(!entry)return null;
  if(!/^reserve(?:$|[\n\r$`;&|<>\\])/.test(tokens[2]||''))return null;
  if(quote)throw Error('INVALID_RECOVERY_COMMAND');
  if(/[\n\r$`;&|<>\\]/.test(command))throw Error('UNSAFE_RECOVERY_COMMAND');
  const args=options(tokens.slice(3),['--descriptor','--expected-state-sha','--authorization']);
  if(Object.keys(args).length!==3 || !hex(args['--expected-state-sha'])) throw Error('INVALID_RECOVERY_ARGUMENTS');
  return {descriptor_path:resolve(cwd,args['--descriptor']),expected_state_sha:args['--expected-state-sha'],
    authorization_path:resolve(cwd,args['--authorization']),command};
}
function canonicalFile(path) {
  if(!text(path) || resolve(path)!==path || realpathSync(path)!==path || !statSync(path).isFile()) {
    throw Error('RECOVERY_SOURCE_NOT_CANONICAL');
  }
  return readFileSync(path);
}
export function readRecoveryDescriptor(path,authorizationPath) {
  const bytes=canonicalFile(path),descriptor=JSON.parse(bytes),descriptor_sha=digest(bytes);
  if(!object(descriptor) || descriptor.schema_version!==1 || descriptor.read_only!==true
      || descriptor.agent_type!=='quality-gate' || descriptor.fork_turns!=='none'
      || !Array.isArray(descriptor.files) || !descriptor.files.length
      || !Array.isArray(descriptor.criteria) || !descriptor.criteria.length
      || !text(descriptor.authorization_ref)) throw Error('INVALID_RECOVERY_DESCRIPTOR');
  const paths=new Set(),ids=new Set();
  for(const file of descriptor.files) {
    if(!object(file)||!hex(file.sha256)||paths.has(file.path)||digest(canonicalFile(file.path))!==file.sha256) {
      throw Error('RECOVERY_FILE_MISMATCH');
    }
    paths.add(file.path);
  }
  for(const c of descriptor.criteria) {
    if(!object(c)||!text(c.id)||!text(c.text)||ids.has(c.id)) throw Error('RECOVERY_CRITERIA_INVALID');ids.add(c.id);
  }
  const authorizationBytes=canonicalFile(authorizationPath),authorization=JSON.parse(authorizationBytes);
  // This binding is not a human approval verifier. The controlling agent must
  // verify the referenced actual user message before invoking the native seam.
  if(authorization.approved!==true || authorization.descriptor_sha!==descriptor_sha
      || authorization.user_source_ref!==descriptor.authorization_ref || authorization.effect!=='independent-readonly-review') {
    throw Error('RECOVERY_AUTHORIZATION_BINDING_MISMATCH');
  }
  return {descriptor,descriptor_sha,authorization_ref:authorization.user_source_ref,
    authorization_sha:digest(authorizationBytes)};
}
function wrapperArguments(source) {
  const match=/^\s*text\(await tools\.exec_command\((\{[\s\S]*\})\)\);?\s*$/.exec(source);
  if(!match) throw Error('UNSUPPORTED_RECOVERY_WRAPPER');
  let args;
  try {args=JSON.parse(match[1]);}
  catch {
    const literal=/^\{\s*cmd\s*:\s*("(?:[^"\\]|\\.)*")\s*,\s*max_output_tokens\s*:\s*(\d+)\s*\}$/.exec(match[1]);
    if(!literal) throw Error('UNSUPPORTED_RECOVERY_WRAPPER');
    args={cmd:JSON.parse(literal[1]),max_output_tokens:Number(literal[2])};
  }
  if(!object(args)||Object.keys(args).some(k=>!['cmd','workdir','max_output_tokens','yield_time_ms','login','shell','tty'].includes(k))) {
    throw Error('UNSUPPORTED_RECOVERY_WRAPPER');
  }
  return args;
}
// The caller supplies records already verified by currentNativeRecords. This
// binds a hook payload to a current *native tool call*, not just an active turn.
export function attestCurrentNativeCall({events,context,actual,source_identity},payload,kind='command') {
  const ci=events.findLastIndex(r=>r.type==='turn_context');
  const calls=events.map((row,index)=>({row,index})).filter(({row,index})=>index>ci&&row.type==='response_item'
    && ['function_call','custom_tool_call'].includes(row.payload?.type));
  const last=calls.at(-1);if(!last)throw Error('CURRENT_NATIVE_CALL_MISSING');
  const call=last.row.payload;
  if(!text(call.call_id)||context.turn_id!==payload.turn_id)throw Error('CURRENT_NATIVE_CALL_MISMATCH');
  if(events.filter(r=>r.type==='response_item'&&['function_call','custom_tool_call'].includes(r.payload?.type)
      &&r.payload.call_id===call.call_id).length!==1)throw Error('CURRENT_NATIVE_CALL_NOT_UNIQUE');
  const tail=events.slice(last.index+1);
  if(tail.some(r=>r.type!=='token_usage_record' && !(r.type==='event_msg'&&r.payload?.type==='token_count'))) {
    throw Error('CURRENT_NATIVE_CALL_NOT_PENDING');
  }
  let args;
  if(kind==='command') {
    if(call.type==='custom_tool_call'&&call.namespace==='functions'&&call.name==='exec') args=wrapperArguments(call.input);
    else if(call.type==='function_call'&&call.name==='exec_command'&&(!call.namespace||call.namespace==='functions')
        &&call.call_id===payload.tool_use_id) args=JSON.parse(call.arguments);
    else throw Error('CURRENT_NATIVE_CALL_MISMATCH');
    if(args.cmd!==payload.tool_input?.command || (args.workdir && resolve(args.workdir)!==realpathSync(payload.cwd))) {
      throw Error('CURRENT_NATIVE_COMMAND_MISMATCH');
    }
  } else {
    if(call.type!=='function_call'||call.namespace!=='collaboration'||call.call_id!==payload.tool_use_id
        || !['followup_task','send_message'].includes(call.name)) throw Error('CURRENT_NATIVE_CALL_MISMATCH');
    args=JSON.parse(call.arguments);
    if(args.target!==payload.tool_input?.target) throw Error('CURRENT_NATIVE_TARGET_MISMATCH');
  }
  const prefix=events.slice(0,last.index+1);
  return {call_id:call.call_id,turn_id:context.turn_id,path:actual,source_identity,prefix_length:prefix.length,
    prefix_sha:digest(JSON.stringify(prefix)),operation_id:digest(JSON.stringify({root:payload.session_id,
      turn:context.turn_id,call:call.call_id,input:kind==='command'?args.cmd:args}))};
}
export function parseRecoveryReport(message,descriptor) {
  const marker=[...message.matchAll(/^REVIEW_RECOVERY_REPORT_JSON[ \t]*\r?$/gm)].at(-1);
  if(!marker)throw Error('RECOVERY_REPORT_MISSING');
  let source=message.slice(marker.index+marker[0].length).trim();
  // quality-gate appends its separate verdict envelope after the recovery
  // payload. Its verdict never substitutes for this report's scope binding.
  const tail=/(?:^|\r?\n)EVAL_ENVELOPE_JSON[ \t]*\r?\n/.exec(source);
  if(tail) {
    const envelope=JSON.parse(source.slice(tail.index+tail[0].length).trim());
    if(!object(envelope)||envelope.schema_version!==1||envelope.producer!=='quality-gate'
        ||!text(envelope.eval_run_id))throw Error('RECOVERY_EVAL_ENVELOPE_INVALID');
    source=source.slice(0,tail.index).trim();
  }
  source=source.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
  const report=JSON.parse(source);
  if(!object(report)||!Array.isArray(report.criteria)||report.criteria.length!==descriptor.criteria.length) {
    throw Error('RECOVERY_REPORT_INCOMPLETE');
  }
  return report;
}
export function verifyRecoveryRegistration(root) {
  const script = `import {spawn} from 'node:child_process';
const p=spawn('codex',['app-server','--listen','stdio://'],{cwd:process.argv[1],env:process.env,stdio:['pipe','pipe','pipe']});
let b='',done=false;const finish=(status,value)=>{if(done)return;done=true;clearTimeout(timer);if(value)process.stdout.write(JSON.stringify(value));p.kill('SIGKILL');process.exitCode=status;};
const timer=setTimeout(()=>finish(1),7000);p.on('error',()=>finish(1));p.stderr.resume();
p.stdout.on('data',bytes=>{b+=bytes;const lines=b.split('\\n');b=lines.pop();for(const line of lines){let r;try{r=JSON.parse(line)}catch{continue}if(r.id===2)finish(r.error?1:0,r.result);}});
p.stdin.on('error',()=>finish(1));p.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{clientInfo:{name:'recovery-hook-registration',version:'1'}}})+'\\n'+JSON.stringify({jsonrpc:'2.0',id:2,method:'hooks/list',params:{cwds:[process.argv[1]]}})+'\\n');`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script,root],
    {encoding:'utf8',timeout:9000,maxBuffer:2*1024*1024});
  if(result.status!==0)throw Error('RECOVERY_REGISTRATION_NEEDS_CONTEXT');
  const data=JSON.parse(result.stdout).data?.find(x=>x.cwd===root);
  if(!data||data.errors?.length)throw Error('RECOVERY_REGISTRATION_NEEDS_CONTEXT');
  const path=resolve(root,'.codex/hooks.json'),definition=JSON.parse(readFileSync(path));
  const group=definition.hooks.PreToolUse.find(g=>g.matcher?.includes('followup_task')&&g.matcher?.includes('send_message'));
  if(!group)throw Error('RECOVERY_FENCE_NOT_REGISTERED');
  for(const name of ['collaborationfollowup_task','collaborationsend_message']) {
    if(!new RegExp(group.matcher).test(name))throw Error('RECOVERY_FENCE_NOT_REGISTERED');
  }
  for(const g of [group,...(definition.hooks.SessionStart||[])]) for(const expected of g.hooks) {
    const matches=data.hooks.filter(h=>h.sourcePath===path&&h.command===expected.command);
    if(matches.length!==1||matches[0].enabled!==true||matches[0].trustStatus!=='trusted'
        ||(g.matcher&&matches[0].matcher!==g.matcher)||matches[0].async)throw Error('RECOVERY_FENCE_NOT_TRUSTED');
  }
}
function main() {
  const [action,...args]=process.argv.slice(2);
  if(action==='reserve')throw Error('NATIVE_PRETOOL_RESERVATION_REQUIRED');
  if(action!=='inspect')throw Error('usage: codex-review-recovery.mjs inspect --session <root-id> [--operation-id <id>]');
  const flags=options(args,['--session','--operation-id']);if(!text(flags['--session']))throw Error('SESSION_REQUIRED');
  const input={harness:'codex',root_session_id:flags['--session'],
    state_root:process.env.NODE_ENV==='test'?process.env.LUCA_MODEL_ROUTE_STATE_ROOT:undefined};
  const state=readActivation(input);if(!state)throw Error('ACTIVATION_MISSING');
  const reservation=Object.values(state.recovery_reservations||{}).find(r=>r.operation_id===flags['--operation-id']);
  console.log(JSON.stringify({schema_version:state.version,root_session_id:state.root_session_id,
    state_sha:activationContentSha(input),admission:dispatchAdmission(state),
    obligations:state.review_obligations||{},reservation:reservation||null,
    required:state.version===1?'LEGACY_RECOVERY_NEEDS_CONTEXT':null},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {main();} catch(error) {console.error(error.message);process.exitCode=1;}
}
