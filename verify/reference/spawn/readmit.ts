/** Read-only raw archive admission. Archived argv and paths never authorize execution. */
import {lstat,opendir} from 'node:fs/promises';
import {isAbsolute,join} from 'node:path';
import {manifestToJson} from '../../../src/contract';
import {MemoryStore} from '../../../src/store';
import {parseRunReceipt,receiptDigest} from '../../../src/run';
import {hashBytes,readFileBounded} from '../../lib/files';
import type {CommandResult} from '../../lib/runner';
import {actual,expected,materialize} from './adapter';
import {admitInputs,admitNative,admitProjection,admitReplay,admitWorker,encoded,insist,LIMITS,type InputFile} from './custody';
import {fixtures} from './fixtures';
import {CONTRACT,RELATION} from './definition';
import {canonical,execute,spawnDefinition,type Json} from './oracle';

type Dict=Record<string,unknown>;
export type Authority={binding:unknown;recordedArchive:string;workerPath:string;nativePath:string;bunPath:string};
const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
/** This finite matrix has no empty/NUL arguments; UTF-8 bytes also stay below the supervisor character bound. */
export function admitCommandArguments(value:unknown):asserts value is string[]{
 insist(Array.isArray(value)&&value.length>0&&value.length<=64&&value.every(argument=>typeof argument==='string'&&argument.length>0&&argument.length<=4096&&!argument.includes('\0')&&new TextEncoder().encode(argument).length<=4096),'command argv bound');
}
/** Check observed bytes after reading; stat sizes are only preflight hints. */
export function accumulateArchiveBytes(before:number,incoming:number):number{
 insist(Number.isSafeInteger(before)&&before>=0&&Number.isSafeInteger(incoming)&&incoming>=0&&before+incoming<=LIMITS.archiveBytes,'actual archive byte bound');return before+incoming;
}
function object(value:unknown,keys:readonly string[],label:string):Dict{insist(value!==null&&typeof value==='object'&&!Array.isArray(value),label+' object');const row=value as Dict;admitProjection([...keys].sort(),Object.keys(row).sort());return row;}
/** Authority must be independently selected and pinned by the caller, never copied from this archive. */
export async function readmitArchive(archive:string,authority:Authority){
 insist([archive,authority.recordedArchive,authority.workerPath,authority.nativePath,authority.bunPath].every(path=>isAbsolute(path)&&path.length<=4096),'explicit archive authority');
 const inventory:InputFile[]=[],directories:string[]=[];let archiveBytes=0,entries=0;
 async function walk(relative:string,depth:number):Promise<void>{
  insist(depth<=8,'archive depth');for await(const entry of await opendir(join(archive,relative))){
   insist(++entries<=1024,'archive entry bound');const path=relative?relative+'/'+entry.name:entry.name,info=await lstat(join(archive,path));insist(!info.isSymbolicLink(),'archive symlink');
   if(info.isDirectory()){directories.push(path);await walk(path,depth+1);}else{insist(info.isFile()&&inventory.length<LIMITS.archiveFiles&&info.size<=LIMITS.fileBytes&&archiveBytes+info.size<=LIMITS.archiveBytes,'archive inventory bound');const raw=await readFileBounded(archive,path,LIMITS.fileBytes);archiveBytes=accumulateArchiveBytes(archiveBytes,raw.length);inventory.push({path,bytes:raw.length,sha256:hashBytes(raw)});}
  }
 }
 await walk('',0);inventory.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 const retained=new Set<string>(),expectedDirectories=new Set<string>();
 const raw=async(path:string)=>{const entry=inventory.find(row=>row.path===path);insist(entry,'missing required archive file');const bytes=await readFileBounded(archive,path,LIMITS.fileBytes);insist(bytes.length===entry.bytes&&hashBytes(bytes)===entry.sha256,'archive changed during read');retained.add(path);for(let i=path.indexOf('/');i>=0;i=path.indexOf('/',i+1))expectedDirectories.add(path.slice(0,i));return bytes;};
 const json=async(path:string)=>{const bytes=await raw(path),text=decoder.decode(bytes);insist(!text.startsWith('\ufeff'),'archive BOM');const value:unknown=JSON.parse(text);insist(encoded(value)===text,'archive canonical metadata');return value;};
 const same=async(path:string,value:unknown)=>admitProjection(value,await json(path));
 await same('binding-before.json',authority.binding);await same('binding-after.json',authority.binding);
 const binding=authority.binding as {native:{path:string};repository:{runtime:{path:string}}};insist(binding.native.path===authority.nativePath&&binding.repository.runtime.path===authority.bunPath,'authority executable paths');
 let commands=0,comparisons=0,replays=0,negativeReplays=0,capturedOutputBytes=0;
 async function command(path:string,argv:string[],inputs:string[]):Promise<CommandResult>{
  admitCommandArguments(argv);
  const row=object(await json(path),['command','exitCode','signal','timedOut','outputExceeded','cleanupObserved','stdout','stderr'],'command');
  insist(typeof row.stdout==='string'&&typeof row.stderr==='string'&&Number.isInteger(row.exitCode)&&row.signal===null&&row.timedOut===false&&row.outputExceeded===false&&row.cleanupObserved===true,'command metadata');
  if(argv[0]===authority.nativePath)insist(canonical(JSON.parse(row.stdout) as Json)+'\n'===row.stdout,'native exact canonical frame');
  const outputBytes=new TextEncoder().encode(row.stdout).length+new TextEncoder().encode(row.stderr).length;insist(outputBytes<=LIMITS.commandBytes,'command output bound');capturedOutputBytes+=outputBytes;
  admitCommandArguments(row.command);const result=row as unknown as CommandResult;admitProjection(argv,result.command);
  const snapshots:InputFile[]=[];for(const input of inputs){const bytes=await raw(input);snapshots.push({path:input,bytes:bytes.length,sha256:hashBytes(bytes)});}
  const record=object(await json(path+'.inputs.json'),['before','after'],'input snapshots');admitInputs(snapshots,record.before as InputFile[]);admitInputs(snapshots,record.after as InputFile[]);commands++;return result;
 }
 async function cas(path:string,text:string):Promise<void>{const bytes=await raw(path),want=new TextEncoder().encode(text);insist(bytes.length===want.length&&bytes.every((b,i)=>b===want[i]),'raw CAS bytes');}
 const cases=fixtures();insist(cases.length===17&&new Set(cases.map(f=>f.id)).size===17,'closed fixture inventory');const rows:unknown[]=[];
 for(const f of cases){
  const directory=join(authority.recordedArchive,f.id),prefix=(path:string)=>f.id+'/'+path,state=execute(f.program,f.args,f.budget,f.tape,'none',f.catalog),want=expected(state);
  for(const name of ['native-state','verify-state'])expectedDirectories.add(prefix(name));
  await same(prefix('fixture.json'),f);await same(prefix('oracle.json'),{projection:want,trace:state.trace,effects:state.effects});
  // This is the explicit adapter representation, not a second production-semantic oracle.
  const manifest=manifestToJson(await materialize(f.program,new MemoryStore(),f.budget));await same(prefix('manifest.json'),manifest);await same(prefix('args.json'),f.args);
  const responses:Record<string,unknown[]>={};for(const row of f.tape){insist(row.response.kind==='output','fixed output tape');(responses[row.cell]??=[]).push(row.response.value);}await same(prefix('responses.json'),responses);
  const bunReceipt=await json(prefix('bun-receipt.json'));admitProjection(want,actual(bunReceipt));comparisons++;
  const bunResult=object(await json(prefix('bun-run-result.json')),['requests','selfVerification'],'Bun run result');admitProjection(state.effects.map(e=>e.request),bunResult.requests);admitReplay(bunResult.selfVerification,bunReceipt,true);replays++;
  const bunArgs=[authority.bunPath,authority.workerPath,'run',f.id,directory];admitWorker(await command(prefix('bun-run.command.json'),bunArgs,[prefix('fixture.json'),prefix('oracle.json')]),bunArgs,f.id,'run',bunResult);
  const nativeReceipt=await json(prefix('native-receipt.json'));admitProjection(want,actual(nativeReceipt));comparisons++;
  const nativeArgs=[authority.nativePath,'run',join(directory,'manifest.json'),'--responses',join(directory,'responses.json'),'--args',join(directory,'args.json'),'--write','--dir',join(directory,'native-state')];
  const native=await command(prefix('native-run.command.json'),nativeArgs,['manifest.json','responses.json','args.json'].map(prefix));admitProjection(nativeReceipt,JSON.parse(native.stdout));const persistedDigest=hashBytes(canonical(nativeReceipt as Json));admitNative(native,nativeArgs,state.outcome==='complete'?0:1,'receipt '+persistedDigest+'\n');
  const rootWire=canonical(manifest as Json),rootDigest=hashBytes(rootWire);insist((nativeReceipt as {manifestDigest:string}).manifestDigest===rootDigest,'root manifest identity');await cas(prefix(`native-state/manifests/${rootDigest.slice(7)}.json`),rootWire);await cas(prefix(`native-state/runs/${persistedDigest.slice(7)}.json`),canonical(nativeReceipt as Json));
  for(const runtime of ['bun','native'])for(const spec of f.catalog){const definition=spawnDefinition(spec);await cas(prefix(`${runtime}-state/manifests/${definition.digest.slice(7)}.json`),canonical(definition.manifest));}
  for(const runtime of ['bun','native']){const argv=[authority.nativePath,'verify',join(directory,runtime+'-receipt.json'),join(directory,'manifest.json'),'--dir',join(directory,'verify-state')];const out=await command(prefix('native-verify-'+runtime+'.command.json'),argv,[prefix(runtime+'-receipt.json'),prefix('manifest.json')]);admitNative(out,argv,0);admitReplay(JSON.parse(out.stdout),runtime==='bun'?bunReceipt:nativeReceipt,true);replays++;}
  const verifyArgs=[authority.bunPath,authority.workerPath,'verify',f.id,directory],verified=await json(prefix('bun-verify-result.json'));admitWorker(await command(prefix('bun-verify.command.json'),verifyArgs,[prefix('native-receipt.json'),prefix('manifest.json')]),verifyArgs,f.id,'verify',verified);admitReplay(verified,nativeReceipt,true);replays++;
  if(f.id==='two-success'){
   const original=parseRunReceipt(bunReceipt);insist(original.effects.length===2&&original.effects[0]!.requestDigest===original.effects[1]!.requestDigest,'occurrence witness');
   const results=await json(prefix('bun-mutations-result.json'));insist(Array.isArray(results)&&results.length===2,'mutation count');
   const argv=[authority.bunPath,authority.workerPath,'mutations',f.id,directory];admitWorker(await command(prefix('bun-mutations.command.json'),argv,[prefix('bun-receipt.json'),prefix('manifest.json')]),argv,f.id,'mutations',results);
   for(const [i,mode]of ['reordered','duplicated'].entries()){
    const changed=structuredClone(original);changed.effects=mode==='reordered'?[...changed.effects].reverse():[structuredClone(changed.effects[0]!),structuredClone(changed.effects[0]!)];changed.digest=receiptDigest(changed);parseRunReceipt(changed);await same(prefix(mode+'-receipt.json'),changed);
    const report=object(results[i],['mode','report'],'mutation result');insist(report.mode===mode,'mutation order');admitReplay(report.report,bunReceipt,false);negativeReplays++;
    const argv=[authority.nativePath,'verify',join(directory,mode+'-receipt.json'),join(directory,'manifest.json'),'--dir',join(directory,'verify-state')],out=await command(prefix('native-'+mode+'.command.json'),argv,[prefix(mode+'-receipt.json'),prefix('manifest.json')]);admitNative(out,argv,1);admitReplay(JSON.parse(out.stdout),nativeReceipt,false);negativeReplays++;
   }
  }
  rows.push({id:f.id,outcome:state.outcome,effects:state.effects.length,work:state.work});
 }
 const files=inventory.filter(row=>row.path!=='summary.json');
 const summary={contract:CONTRACT,ok:true,archive:authority.recordedArchive,cases:17,comparisons,replays,negativeReplays,commands,limits:LIMITS,rows,files,scope:RELATION};await same('summary.json',summary);
 insist(commands===88&&comparisons===34&&replays===68&&negativeReplays===4,'closed execution matrix');admitProjection([...retained].sort(),inventory.map(row=>row.path));admitProjection([...expectedDirectories].sort(),directories.sort());
 // Reread the complete closed inventory after semantic admission to detect retained changes.
 for(const row of inventory){const bytes=await readFileBounded(archive,row.path,LIMITS.fileBytes);insist(bytes.length===row.bytes&&hashBytes(bytes)===row.sha256,'archive changed during admission');}
 return {contract:'algal.spawn-readmission.v1',status:'admitted',formalClaims:0,cases:17,comparisons,replays,negativeReplays,commands,archiveBytes,capturedOutputBytes,files:inventory.length,summarySha256:inventory.find(row=>row.path==='summary.json')!.sha256,scope:RELATION};
}
