/** Synthetic reader controls only. No target commands or production replay are executed. */
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {manifestToJson} from '../../../src/contract';
import {MemoryStore} from '../../../src/store';
import {parseRunReceipt,receiptDigest} from '../../../src/run';
import {hashBytes} from '../../lib/files';
import {expected,materialize} from './adapter';
import {encoded,LIMITS,summary,type InputFile} from './custody';
import {fixtures} from './fixtures';
import {canonical,execute,spawnDefinition,type Json} from './oracle';
import type {Authority} from './readmit';
import {CONTRACT,RELATION} from './definition';
export async function syntheticArchive(archive:string):Promise<Authority>{
 const authority:Authority={recordedArchive:archive,workerPath:'/synthetic/worker.ts',nativePath:'/synthetic/algal',bunPath:'/synthetic/bun',binding:{syntheticTestOnly:true,native:{path:'/synthetic/algal'},repository:{runtime:{path:'/synthetic/bun'}}}};
 const files=new Map<string,InputFile>();
 async function putRaw(path:string,text:string){await mkdir(dirname(join(archive,path)),{recursive:true});await writeFile(join(archive,path),text,{flag:'wx'});files.set(path,{path,bytes:Buffer.byteLength(text),sha256:hashBytes(text)});}
 const put=async(path:string,value:unknown)=>putRaw(path,encoded(value));
 await put('binding-before.json',authority.binding);await put('binding-after.json',authority.binding);const rows:unknown[]=[];
 async function command(path:string,argv:string[],stdout:string,inputs:string[],exitCode=0,stderr=''){
  await put(path,{command:argv,exitCode,signal:null,timedOut:false,outputExceeded:false,cleanupObserved:true,stdout,stderr});const snapshot=inputs.map(input=>({...files.get(input)!}));await put(path+'.inputs.json',{before:snapshot,after:snapshot});
 }
 for(const f of fixtures()){
  const p=(name:string)=>f.id+'/'+name,dir=join(archive,f.id),state=execute(f.program,f.args,f.budget,f.tape,'none',f.catalog),want=expected(state),manifest=manifestToJson(await materialize(f.program,new MemoryStore(),f.budget)),wire=canonical(manifest as Json),manifestDigest=hashBytes(wire);
  await mkdir(join(dir,'native-state'),{recursive:true});await mkdir(join(dir,'verify-state'),{recursive:true});
  const cells=Object.fromEntries(Object.entries(want.cells).map(([key,value])=>[key,{...value,...(value.failure?{failure:state.cells[key]!.failure}:{})}]));
  const raw={contract:'algal.run.v1',runtime:{name:'algal',version:'synthetic-reader-control'},manifestDigest,manifestKey:'organism:oracle-fixture',args:f.args,outcome:state.outcome,cells,effects:want.effects,work:state.work,events:want.events.map((event,seq)=>({...event,seq})),...(state.failure?{failure:state.failure}:{})};const receipt=parseRunReceipt({...raw,digest:hashBytes(canonical(raw as Json))});
  const report={ok:true,digest:receipt.digest,outcome:receipt.outcome,mismatches:[]},result={requests:state.effects.map(effect=>effect.request),selfVerification:report};
  await put(p('fixture.json'),f);await put(p('oracle.json'),{projection:want,trace:state.trace,effects:state.effects});await put(p('manifest.json'),manifest);await put(p('args.json'),f.args);
  const responses:Record<string,unknown[]>={};for(const row of f.tape)if(row.response.kind==='output')(responses[row.cell]??=[]).push(row.response.value);await put(p('responses.json'),responses);await put(p('bun-receipt.json'),receipt);await put(p('bun-run-result.json'),result);await put(p('native-receipt.json'),receipt);await put(p('bun-verify-result.json'),report);
  const bunArgs=[authority.bunPath,authority.workerPath,'run',f.id,dir];await command(p('bun-run.command.json'),bunArgs,summary(f.id,'run',result)+'\n',[p('fixture.json'),p('oracle.json')]);
  const nativeArgs=[authority.nativePath,'run',join(dir,'manifest.json'),'--responses',join(dir,'responses.json'),'--args',join(dir,'args.json'),'--write','--dir',join(dir,'native-state')],receiptWire=canonical(receipt as unknown as Json),persistedDigest=hashBytes(receiptWire);await command(p('native-run.command.json'),nativeArgs,receiptWire+'\n',['manifest.json','responses.json','args.json'].map(p),state.outcome==='complete'?0:1,'receipt '+persistedDigest+'\n');
  await putRaw(p(`native-state/manifests/${manifestDigest.slice(7)}.json`),wire);await putRaw(p(`native-state/runs/${persistedDigest.slice(7)}.json`),receiptWire);
  for(const runtime of ['bun','native'])for(const spec of f.catalog){const definition=spawnDefinition(spec);await putRaw(p(`${runtime}-state/manifests/${definition.digest.slice(7)}.json`),canonical(definition.manifest));}
  for(const runtime of ['bun','native']){const argv=[authority.nativePath,'verify',join(dir,runtime+'-receipt.json'),join(dir,'manifest.json'),'--dir',join(dir,'verify-state')];await command(p('native-verify-'+runtime+'.command.json'),argv,canonical(report)+'\n',[p(runtime+'-receipt.json'),p('manifest.json')]);}
  const verifyArgs=[authority.bunPath,authority.workerPath,'verify',f.id,dir];await command(p('bun-verify.command.json'),verifyArgs,summary(f.id,'verify',report)+'\n',[p('native-receipt.json'),p('manifest.json')]);
  if(f.id==='two-success'){
   const reports=[];for(const mode of ['reordered','duplicated']){const changed=structuredClone(receipt);changed.effects=mode==='reordered'?[...changed.effects].reverse():[structuredClone(changed.effects[0]!),structuredClone(changed.effects[0]!)];changed.digest=receiptDigest(changed);parseRunReceipt(changed);await put(p(mode+'-receipt.json'),changed);const report={ok:false,digest:receipt.digest,outcome:receipt.outcome,mismatches:['synthetic rejected occurrence control']};reports.push({mode,report});const argv=[authority.nativePath,'verify',join(dir,mode+'-receipt.json'),join(dir,'manifest.json'),'--dir',join(dir,'verify-state')];await command(p('native-'+mode+'.command.json'),argv,canonical(report)+'\n',[p(mode+'-receipt.json'),p('manifest.json')],1);}
   await put(p('bun-mutations-result.json'),reports);const argv=[authority.bunPath,authority.workerPath,'mutations',f.id,dir];await command(p('bun-mutations.command.json'),argv,summary(f.id,'mutations',reports)+'\n',[p('bun-receipt.json'),p('manifest.json')]);
  }
  rows.push({id:f.id,outcome:state.outcome,effects:state.effects.length,work:state.work});
 }
 await put('summary.json',{contract:CONTRACT,ok:true,archive,cases:17,comparisons:34,replays:68,negativeReplays:4,commands:88,limits:LIMITS,rows,files:[...files.values()].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0),scope:RELATION});return authority;
}
