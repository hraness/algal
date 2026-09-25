import {isAbsolute,join} from 'node:path';
import {manifestToJson,parseOrganismManifest} from '../../../src/contract';
import {scriptedExecutor,type EffectRequest} from '../../../src/effects';
import {builtinRegistry} from '../../../src/registry';
import {runOrganism,parseRunReceipt,receiptDigest} from '../../../src/run';
import {FileStore,MemoryStore} from '../../../src/store';
import {verifyReceipt} from '../../../src/verify';
import type {JsonValue} from '../../../src/values';
import {stableJson} from '../../lib/files';
import {materialize} from './adapter';
import {fixture} from './fixtures';
import {spawnDefinition} from './oracle';
import {Writer,LIMITS,readJson,insist,summary} from './custody';
if(import.meta.main){
 const [mode,id,directory]=process.argv.slice(2);insist(process.argv.length===5&&mode&&['run','verify','mutations'].includes(mode??'')&&id&&directory&&isAbsolute(directory),'worker arguments');const f=fixture(id);const writer=new Writer(directory,LIMITS.workerBytes,LIMITS.workerFiles);let result:unknown;
 if(mode==='run'){
  const store=new FileStore(join(directory,'bun-state'));const manifest=await materialize(f.program,store,f.budget);
  for(const spec of f.catalog){const definition=spawnDefinition(spec);insist(stableJson(manifestToJson(parseOrganismManifest(definition.manifest)))===stableJson(definition.manifest),'independent normalized dynamic manifest differs');}
  const responses:Record<string,JsonValue[]>={};for(const row of f.tape){insist(row.response.kind==='output','static output tape');(responses[row.cell]??=[]).push(row.response.value);}
  await writer.put('manifest.json',manifestToJson(manifest));await writer.put('responses.json',responses);await writer.put('args.json',f.args);
  const requests:EffectRequest[]=[];const inner=scriptedExecutor(responses);const receipt=await runOrganism({manifest,args:f.args,store,fns:builtinRegistry(),executors:[{...inner,async execute(request,signal){requests.push(structuredClone(request));return inner.execute(request,signal);}}]});
  await writer.put('bun-receipt.json',receipt);const selfVerification=await verifyReceipt(receipt as unknown as JsonValue,manifestToJson(manifest),new MemoryStore());insist(selfVerification.ok,'Bun own replay failed');result={requests,selfVerification};
 }else if(mode==='verify'){
  const receipt=await readJson(directory,'native-receipt.json'),manifest=await readJson(directory,'manifest.json');const verified=await verifyReceipt(receipt as JsonValue,manifest as JsonValue,new MemoryStore());insist(verified.ok,'Bun cross-runtime replay failed');result=verified;
 }else{
  insist(id==='two-success','mutation witness inventory');const original=parseRunReceipt(await readJson(directory,'bun-receipt.json'));insist(original.effects.length===2&&original.effects[0]!.requestDigest===original.effects[1]!.requestDigest,'equal-digest mutation witness');const reports=[];
  for(const mode of ['reordered','duplicated']as const){const changed=structuredClone(original);changed.effects=mode==='reordered'?[...changed.effects].reverse():[structuredClone(changed.effects[0]!),structuredClone(changed.effects[0]!)];changed.digest=receiptDigest(changed);parseRunReceipt(changed);await writer.put(mode+'-receipt.json',changed);const report=await verifyReceipt(changed as unknown as JsonValue,await readJson(directory,'manifest.json') as JsonValue,new MemoryStore());insist(!report.ok&&report.mismatches.length>0,'real replay accepted occurrence mutation');reports.push({mode,report});}result=reports;
 }
 await writer.put('bun-'+mode+'-result.json',result);console.log(summary(id,mode,result));
}
