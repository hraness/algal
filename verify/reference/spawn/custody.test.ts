import {test,expect} from 'bun:test';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {admitInputs,admitNative,admitProjection,admitRaw,admitReplay,admitWorker,captureInputs,encoded,jsonBytes,summary,Writer} from './custody';
import type {CommandResult} from '../../lib/runner';
const argv=['/fixture/bun','/fixture/worker','run','case','/fixture/archive'];
const result=(output:unknown):CommandResult=>({command:argv,exitCode:0,signal:null,timedOut:false,outputExceeded:false,cleanupObserved:true,stdout:summary('case','run',output)+'\n',stderr:''});
test('exact JSON preflight handles escaped Unicode before allocation',()=>{for(const value of ['a','\ud800','😀','\ufeff','\n\t\\"',{'10':1,'2':['x',null]}])expect(jsonBytes(value)).toBe(new TextEncoder().encode(JSON.stringify(value)).length);expect(()=>encoded('x'.repeat(262144))).toThrow('byte bound');const cycle:unknown[]=[];cycle.push(cycle);expect(()=>encoded(cycle)).toThrow('cycle');expect(()=>encoded({get x(){throw Error('getter executed');}})).toThrow('accessor');});
test('archive reservations reject aggregate excess before writing',async()=>{const dir=await mkdtemp(join(tmpdir(),'algal-spawn-unit-'));try{const w=new Writer(dir,8,1);await w.put('one.json',null);expect(w.bytes).toBe(5);await expect(w.put('two.json',null)).rejects.toThrow('reservation');expect(()=>w.capacity(4,0)).toThrow('reservation');}finally{await rm(dir,{recursive:true,force:true});}});
test('worker raw frame/custody and native exit boundaries are exact',()=>{const value={ok:true};expect(()=>admitWorker(result(value),argv,'case','run',value)).not.toThrow();for(const changed of [{...result(value),stdout:result(value).stdout+'{}\n'},{...result(value),stderr:'noise'},{...result(value),command:['/other']},{...result(value),cleanupObserved:false},{...result(value),timedOut:true},{...result(value),outputExceeded:true},{...result(value),signal:'SIGTERM'},{...result(value),exitCode:1}])expect(()=>admitWorker(changed,argv,'case','run',value)).toThrow();expect(()=>admitNative({...result(value),stdout:'{}'},argv,0)).not.toThrow();expect(()=>admitNative(result(value),argv,1)).toThrow();});
test('projection rejects equal-digest occurrence loss/order and changed manifest identity',()=>{const want={effects:[{requestDigest:'same',output:'A'},{requestDigest:'same',output:'B'}],cells:{left:{outputs:{digest:'manifest'}}},work:{steps:5,agentCalls:2,units:1550}};expect(()=>admitProjection(want,structuredClone(want))).not.toThrow();for(const changed of [{...want,effects:[...want.effects].reverse()},{...want,effects:[want.effects[0],want.effects[0]]},{...want,effects:[want.effects[0]]},{...want,work:{...want.work,units:1450}},{...want,cells:{left:{outputs:{digest:'forged'}}}}])expect(()=>admitProjection(want,changed)).toThrow();});


test('fixture input reread rejects same-size mutation and raw byte-only edits',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'algal-spawn-input-unit-'));try{
  await writeFile(join(dir,'input.json'),'{"value":"A"}');const before=await captureInputs(dir,['input.json']);expect(()=>admitInputs(before,structuredClone(before))).not.toThrow();
  await writeFile(join(dir,'input.json'),'{"value":"B"}');const changed=await captureInputs(dir,['input.json']);expect(changed[0]!.bytes).toBe(before[0]!.bytes);expect(()=>admitInputs(before,changed)).toThrow('inputs changed');
  await writeFile(join(dir,'input.json'),' {"value":"A"}');const whitespace=await captureInputs(dir,['input.json']);expect(JSON.parse(' {"value":"A"}')).toEqual(JSON.parse('{"value":"A"}'));expect(()=>admitInputs(before,whitespace)).toThrow('inputs changed');
  await expect(captureInputs(dir,['input.json','input.json'])).rejects.toThrow('inventory');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('dynamic CAS admission binds exact bytes instead of only parsed values',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'algal-spawn-cas-unit-'));try{
  const wire='{"a":1,"z":2}';await writeFile(join(dir,'manifest.json'),wire);await expect(admitRaw(dir,'manifest.json',wire)).resolves.toBeUndefined();
  for(const changed of [wire+'\n','{"z":2,"a":1}','{"a":1,"a":1,"z":2}']){expect(()=>admitProjection(JSON.parse(wire),JSON.parse(changed))).not.toThrow();await writeFile(join(dir,'manifest.json'),changed);await expect(admitRaw(dir,'manifest.json',wire)).rejects.toThrow('raw bytes');}
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('replay result is closed and success is bound to the exact receipt',()=>{
 const receipt={digest:'sha256:'+'a'.repeat(64),outcome:'complete'},report={ok:true,...receipt,mismatches:[]};expect(()=>admitReplay(report,receipt,true)).not.toThrow();
 for(const changed of [{...report,extra:1},{...report,digest:'sha256:'+'b'.repeat(64)},{...report,outcome:'failed'},{...report,ok:false},{...report,mismatches:['changed']},{...report,mismatches:[1]},{ok:true}])expect(()=>admitReplay(changed,receipt,true)).toThrow();
 expect(()=>admitReplay({...report,ok:false,mismatches:['effects[0].output']},receipt,false)).not.toThrow();expect(()=>admitReplay({...report,ok:false},receipt,false)).toThrow('mismatch');
});
test('JSON preflight refuses array accessors without invoking them',()=>{let invoked=false;const array:unknown[]=[];Object.defineProperty(array,'0',{enumerable:true,get(){invoked=true;return 1;}});expect(()=>encoded(array)).toThrow('data array');expect(invoked).toBe(false);const extra=[1];Object.assign(extra,{extra:1});expect(()=>encoded(extra)).toThrow('array properties');});

test('owned native persistence admits only its exact receipt diagnostic',()=>{const diagnostic='receipt sha256:'+'a'.repeat(64)+'\n',native={...result({}),stderr:diagnostic};expect(()=>admitNative(native,argv,0,diagnostic)).not.toThrow();for(const stderr of ['',diagnostic+'noise',diagnostic.replace('a','b'),diagnostic+'\n'])expect(()=>admitNative({...native,stderr},argv,0,diagnostic)).toThrow('native command boundary');});
