#!/usr/bin/env node
// Codex-only fail-closed host claim, then the unchanged legacy adapter.
import { connect } from 'node:net';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const input=readFileSync(0,'utf8');
const hostLaunch=Boolean(process.env.MUSE_HOST_LAUNCH_ID || process.env.MUSE_HOST_LAUNCH_HANDLE);
const protectedSource=Boolean(process.env.LUCA_CHILD_SOURCE_ROOT);
async function claim(method,payload){
  const env=process.env;
  const endpoint=env.MUSE_HOST_LAUNCH_ENDPOINT;
  if(!/^\/private\/tmp\/muse-host-launch-[^/]+\/claim\.sock$/.test(endpoint || ''))throw new Error('CLAIM_ENDPOINT_INVALID');
  const params={launchId:env.MUSE_HOST_LAUNCH_ID,claimHandle:env.MUSE_HOST_LAUNCH_HANDLE,
    launchNonce:env.MUSE_HOST_LAUNCH_NONCE,hostRunId:env.MUSE_HOST_RUN_ID,openRequestId:env.MUSE_OPEN_REQUEST_ID,nativePayload:payload};
  return new Promise((resolve,reject)=>{
    const socket=connect(endpoint);let response='';
    socket.setTimeout(4500,()=>socket.destroy(new Error('CLAIM_TIMEOUT')));
    socket.on('connect',()=>socket.write(JSON.stringify({method,params})+'\n'));
    socket.on('data',chunk=>{response+=chunk;if(response.length>1024*1024)socket.destroy(new Error('CLAIM_SIZE'));
      if(response.includes('\n')){try{const value=JSON.parse(response.split('\n')[0]);socket.destroy();
        if(value.error)reject(new Error(value.error.code));else resolve(value.result);}catch(error){reject(error);}}});
    socket.on('error',reject);socket.on('end',()=>{if(!response.includes('\n'))reject(new Error('CLAIM_INCOMPLETE'));});
  });
}
try {
  if(hostLaunch){
    const payload=JSON.parse(input);
    if(payload.hook_event_name==='SessionStart')await claim('attach',payload);
    else if(payload.hook_event_name==='PreToolUse')await claim('beforeTool',payload);
  }
  const allowed=new Set(['session-restore.mjs','route-guard.mjs','project-scope-guard.mjs'].map(name=>join(root,'.claude','hooks',name)));
  if(!allowed.has(process.argv[2]))throw new Error('LEGACY_TARGET_DENIED');
  const adapter=hostLaunch?'host-launch-adapter.mjs':'codex-hook-adapter.mjs';
  const child=spawnSync(process.execPath,[join(root,'.codex',adapter),process.argv[2]],
    {input,env:process.env,cwd:process.cwd(),encoding:'utf8',maxBuffer:4*1024*1024,timeout:30000});
  if(child.stdout)process.stdout.write(child.stdout);if(child.stderr)process.stderr.write(child.stderr);
  // Host launch must not fail open if its legacy evidence/boundary producer crashes.
  process.exitCode=hostLaunch || protectedSource
    ? (child.error?2:(child.status===0||child.status===2?child.status:2))
    : (child.status===2?2:0);
}catch(error){
  if(!hostLaunch && !protectedSource){process.stderr.write(String(error?.message || error)+'\n');process.exitCode=0;}
  else{
  const reason=`${hostLaunch?'Host launch':'Protected hook'} refused: ${error.code || error.message}`;
  process.stderr.write(reason+'\n');
  process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:reason}})+'\n');
  process.exitCode=2;
  }
}
