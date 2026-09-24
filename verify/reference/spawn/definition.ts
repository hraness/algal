import {readdir} from 'node:fs/promises';
import {basename,dirname,isAbsolute,join} from 'node:path';
import {hashFile} from '../../lib/files';
import {captureBinding} from '../../lib/runner';
import {artifactIdentity} from '../../traces/native';
import {insist,readJson} from './custody';
export const BASE='verify/reference/spawn';
export const SOURCE_FILES=['PROGRESS.md','README.md','SCOPE.md','adapter.ts','archive-fixture.ts','custody.test.ts','custody.ts','definition.ts','fixtures.ts','oracle.test.ts','oracle.ts','readmit.test.ts','readmit.ts','run.ts','worker.ts'] as const;
export const RELATION='Finite single-agent dynamic spawn conformance and offline raw consistency; no Phase07 completion, universal source refinement, arbitrary dynamic manifest parser or physical exactly-once claim.';
export const CONTRACT='algal.spawn-conformance.v1';
/** No discovery or build: source/build correspondence depends on the caller-pinned build manifest. */
export async function captureSpawnBinding(root:string,binary:string,manifestPath:string,manifestSha:string){
 insist(isAbsolute(root)&&isAbsolute(binary)&&isAbsolute(manifestPath)&&/^sha256:[a-f0-9]{64}$/.test(manifestSha),'explicit frozen source/native authority');
 insist(await hashFile(dirname(manifestPath),basename(manifestPath))===manifestSha,'frozen build manifest changed');
 const manifest=await readJson(dirname(manifestPath),basename(manifestPath)) as {artifacts:{path:string;bytes:number;sha256:string}[];buildInputs:{path:string;sha256:string}[]};
 insist(Array.isArray(manifest.artifacts)&&manifest.artifacts.length<=64&&Array.isArray(manifest.buildInputs)&&manifest.buildInputs.length>0&&manifest.buildInputs.length<=4096,'native manifest inventory');
 const native=await artifactIdentity(binary);insist(manifest.artifacts.some(a=>a.path===native.path&&a.bytes===native.bytes&&'sha256:'+a.sha256===native.sha256),'frozen native artifact mismatch');
 for(const input of manifest.buildInputs)insist(await hashFile(root,input.path)==='sha256:'+input.sha256,'native build input changed');
 const entries=await readdir(join(root,BASE),{withFileTypes:true});insist(entries.length===SOURCE_FILES.length&&entries.every(entry=>entry.isFile())&&entries.map(entry=>entry.name).sort().join('\0')===SOURCE_FILES.join('\0'),'closed spawn source inventory');
 return {repository:await captureBinding(root),sources:await Promise.all(SOURCE_FILES.map(async path=>({path,sha256:await hashFile(join(root,BASE),path)}))),native,manifest:{path:manifestPath,sha256:manifestSha,buildInputs:manifest.buildInputs}};
}
