#!/usr/bin/env node
// No public prepare CLI: authority enters only through the verified App's inherited IPC.
import { createServer } from 'node:net';
import { mkdtempSync, chmodSync, realpathSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';

const ownRoot=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const gstackRoot=realpathSync(process.argv[2] || ownRoot);
const projectsRoot=realpathSync(process.argv[3] || join(gstackRoot,'projects'));
// Test exception is structural, never an environment switch, and cannot target production roots.
const fixtureParent=process.argv[4]==='--fixture' && /^\/private\/tmp\/host-launch-[^/]+\/gstack$/.test(gstackRoot)
  && projectsRoot===join(dirname(gstackRoot),'projects') && gstackRoot!==ownRoot;
if (!process.send || (!fixtureParent && gstackRoot!==ownRoot)) {
  throw Object.assign(new Error('HOST_PARENT_DENIED'),{code:'HOST_PARENT_DENIED'});
}
if (!fixtureParent) {
  const guardRoot=join(homedir(),'.codex','luca-child-project','source-guard');
  const snapshot=process.env.LUCA_PROTECTED_CODE_ROOT || '';
  if (process.env.NODE_OPTIONS!==`--import=${join(guardRoot,'bootstrap.mjs')}`
      || !snapshot.startsWith(join(guardRoot,'roots')+'/')) {
    throw Object.assign(new Error('HOST_SOURCE_UNPROTECTED'),{code:'HOST_SOURCE_UNPROTECTED'});
  }
}
// Load framework authority only after the protected loader has been established.
const { createHostLaunchBroker } = await import('../.claude/hooks/lib/host-launch.mjs');
const challenges=new Map();
const broker=createHostLaunchBroker({gstackRoot,projectsRoot,revalidateProfile: params=>new Promise((resolve,reject)=>{
  const id=randomUUID();const timer=setTimeout(()=>{challenges.delete(id);reject(new Error('PROFILE_REVALIDATION_TIMEOUT'));},2500);
  challenges.set(id,{resolve,reject,timer});process.send({type:'revalidateProfile',id,...params});
})});
const socketRoot=realpathSync(mkdtempSync('/private/tmp/muse-host-launch-'));
chmodSync(socketRoot,0o700);
const endpoint=join(socketRoot,'claim.sock');
const server=createServer(socket=>{
  socket.setTimeout(5000,()=>socket.destroy());
  let bytes='';let done=false;
  socket.on('data',async chunk=>{
    if(done)return;bytes+=chunk.toString('utf8');
    if(Buffer.byteLength(bytes)>1024*1024){done=true;socket.destroy();return;}
    if(!bytes.includes('\n'))return;done=true;
    try{
      const message=JSON.parse(bytes.slice(0,bytes.indexOf('\n')));
      if(!['attach','beforeTool'].includes(message.method))throw new Error('METHOD_DENIED');
      const result=await broker.claim(message.method,message.params);
      if(message.method==='attach')process.send({type:'nativeAttached',launchId:message.params.launchId,
        sessionId:result.sessionId,sourceId:result.sourceId});
      if(result.receipt)process.send({type:'bindingReceipt',launchId:message.params.launchId,receipt:result.receipt});
      socket.end(JSON.stringify({result})+'\n');
    }catch(error){socket.end(JSON.stringify({error:{code:error.code || error.message || 'CLAIM_FAILED'}})+'\n');}
  });
  socket.on('error',()=>{});
});
server.listen(endpoint,()=>{chmodSync(endpoint,0o600);process.send({type:'ready',claimEndpoint:endpoint});});
process.on('message',async message=>{
  if(message?.type==='revalidateProfileResult'){
    const c=challenges.get(message.id);if(!c)return;challenges.delete(message.id);clearTimeout(c.timer);c.resolve(message.profileIdentity || null);return;
  }
  if(!message || !['prepare','dispatch','cancel','readReceipt'].includes(message.method)){
    process.send({id:message?.id,error:{code:'METHOD_DENIED'}});return;
  }
  try {const result=await broker.parent(message.method,message.params);
    process.send({id:message.id,result:message.method==='prepare'?{...result,claimEndpoint:endpoint}:result});
  } catch(error){process.send({id:message.id,error:{code:error.code || error.message || 'PARENT_FAILED'}});}
});
const close=()=>{for(const c of challenges.values()){clearTimeout(c.timer);c.reject(new Error('HOST_DISCONNECTED'));}
  server.close();rmSync(socketRoot,{recursive:true,force:true});process.exitCode=0;};
process.on('disconnect',close);process.on('SIGTERM',()=>{close();process.exit(0);});
