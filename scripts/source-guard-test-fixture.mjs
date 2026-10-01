// Tests explicitly freeze the review bytes before requesting installation.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inside, sha256 } from './source-guard-review.mjs';

const installer=fileURLToPath(new URL('./install-codex-source-guard.mjs',import.meta.url));
function assertTemp(path) {
  const temp=realpathSync(tmpdir());
  if(!inside(path,temp)||path===temp)throw new Error('source guard fixture must stay below OS temp');
}
export function frozenManifestSha(destination) {
  assertTemp(destination);
  const path=join(destination,'manifest.json');
  return existsSync(path)?sha256(readFileSync(path)):'ABSENT';
}
export function freezeSourceGuardReview({roots,destination,directory,asRoot,env={}}) {
  assertTemp(destination);
  const reviewDir=directory||dirname(destination);
  assertTemp(reviewDir);
  const result=spawnSync(process.execPath,[installer,'--print-review',...roots.flatMap(root=>['--root',root]),...(asRoot?['--as-root',asRoot]:[])],{
    env:{...process.env,...env,NODE_ENV:'test'},encoding:'utf8',maxBuffer:64*1024*1024,
  });
  if(result.status!==0)throw new Error(`review freeze failed: ${result.stderr}`);
  const bytes=Buffer.from(result.stdout),file=join(reviewDir,`review-${sha256(bytes)}.json`);
  writeFileSync(file,bytes,{mode:0o600});
  return {file,bytes,sha256:sha256(bytes),artifact:JSON.parse(bytes),expectedManifestSha:frozenManifestSha(destination)};
}
export function installFrozenSourceGuard({roots,destination,review,preserveOtherRoots=false,dryRun=false,env={},nodeArgs=[],extraArgs=[]}) {
  assertTemp(destination);
  return spawnSync(process.execPath,[...nodeArgs,installer,...roots.flatMap(root=>['--root',root]),
    '--test-dest',destination,'--reviewed-file',review.file,'--reviewed-sha',review.sha256,
    '--expected-manifest-sha',review.expectedManifestSha,...(preserveOtherRoots?['--preserve-other-roots']:[]),
    ...(dryRun?['--dry-run']:[]),...extraArgs],{
    env:{...process.env,...env,NODE_ENV:'test'},encoding:'utf8',maxBuffer:64*1024*1024,
  });
}
export function installTestSourceGuard(options) {
  const review=freezeSourceGuardReview(options);
  return installFrozenSourceGuard({...options,review});
}
