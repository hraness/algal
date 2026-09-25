import {test,expect} from 'bun:test';
import {mkdtemp,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {encoded,LIMITS} from './custody';
import {syntheticArchive} from './archive-fixture';
import {accumulateArchiveBytes,admitCommandArguments,readmitArchive} from './readmit';
import {hashBytes} from '../../lib/files';

test('synthetic archive admits the exact closed matrix and rejects raw evidence mutations without targets',async()=>{
 const archive=await mkdtemp(join(tmpdir(),'algal-spawn-reader-synthetic-'));
 try{
  const authority=await syntheticArchive(archive),baseline=await readmitArchive(archive,authority);expect(baseline.commands).toBe(88);expect(baseline.files).toBe(405);expect(baseline.formalClaims).toBe(0);
  async function mutate(path:string,change:(value:Record<string,unknown>)=>void){
   expect((await readmitArchive(archive,authority)).status).toBe('admitted');const file=join(archive,path),before=await readFile(file),value=JSON.parse(before.toString()) as Record<string,unknown>;change(value);await writeFile(file,encoded(value));try{await expect(readmitArchive(archive,authority)).rejects.toThrow();}finally{await writeFile(file,before);}
  }
  await mutate('summary.json',value=>{value.comparisons=33;});
  await mutate('summary.json',value=>{(value.rows as unknown[]).reverse();});
  await mutate('binding-before.json',value=>{value.extra='untrusted binding';});
  await mutate('two-success/fixture.json',value=>{value.id='calls-one';});
  await mutate('two-success/oracle.json',value=>{value.extra='untrusted model';});
  await mutate('two-success/args.json',value=>{value.extra={};});
  await mutate('two-success/manifest.json',value=>{value.name='forged';});
  await mutate('two-success/responses.json',value=>{value.leaf=['A','A'];});
  await mutate('two-success/native-run.command.json',value=>{value.command=['/bin/sh','-c','touch /never-executed'];});
  await mutate('two-success/native-run.command.json',value=>{value.cleanupObserved='true';});
  await mutate('two-success/native-run.command.json',value=>{value.timedOut=null;});
  await mutate('two-success/native-run.command.json',value=>{value.stderr='';});
  await mutate('two-success/native-run.command.json',value=>{value.stdout=String(value.stdout)+'{}\n';});
  await mutate('two-success/native-run.command.json.inputs.json',value=>{(value.after as {sha256:string}[])[0]!.sha256='sha256:'+'0'.repeat(64);});
  await mutate('two-success/bun-run.command.json',value=>{value.stdout=String(value.stdout).replace('two-success','calls-one');});
  await mutate('two-success/bun-verify-result.json',value=>{value.digest='sha256:'+'0'.repeat(64);});
  await mutate('two-success/bun-mutations-result.json',value=>{(value as unknown as unknown[]).reverse();});
  await mutate('two-success/reordered-receipt.json',value=>{value.effects=[...(value.effects as unknown[])].reverse();});
  const original=await readFile(join(archive,'summary.json')),summary=JSON.parse(original.toString()) as {files:{path:string}[]},cas=summary.files.find(file=>file.path.startsWith('two-success/native-state/manifests/'))!.path;
  const casPath=join(archive,cas),bytes=await readFile(casPath);expect((await readmitArchive(archive,authority)).status).toBe('admitted');await writeFile(casPath,Buffer.concat([bytes,Buffer.from('\n')]));await expect(readmitArchive(archive,authority)).rejects.toThrow('raw CAS bytes');await writeFile(casPath,bytes);
  expect((await readmitArchive(archive,authority)).status).toBe('admitted');await writeFile(join(archive,'extra.json'),'{}\n');await expect(readmitArchive(archive,authority)).rejects.toThrow();await rm(join(archive,'extra.json'));
  expect((await readmitArchive(archive,authority)).status).toBe('admitted');await symlink('summary.json',join(archive,'extra-link'));await expect(readmitArchive(archive,authority)).rejects.toThrow('symlink');await rm(join(archive,'extra-link'));
  expect((await readmitArchive(archive,authority)).status).toBe('admitted');await expect(readmitArchive(archive,{...authority,bunPath:'/forged/bun'})).rejects.toThrow('authority');
 }finally{await rm(archive,{recursive:true,force:true});}
},120000);

test('command arguments reject vectors that cannot fit the finite supervised invocation',()=>{
 expect(()=>admitCommandArguments(['/fixture/child','x'.repeat(4096)])).not.toThrow();
 for(const value of [[],Array.from({length:65},()=>'/x'),['/x',''],['/x',null],['/x','x'.repeat(4097)],['/x','x\0y'],['/x','😀'.repeat(1025)]])expect(()=>admitCommandArguments(value)).toThrow('argv bound');
});
test('fully rehashed archive cannot admit derived command arguments over the execution limit',async()=>{
 const archive=await mkdtemp(join(tmpdir(),'algal-spawn-argv-regression-'));
 try{
  const authority=await syntheticArchive(archive);expect((await readmitArchive(archive,authority)).status).toBe('admitted');
  const path=join(archive,'summary.json'),summary=JSON.parse(await readFile(path,'utf8')) as {archive:string;files:{path:string;sha256:string;bytes:number}[]},recorded='/'+'x'.repeat(4095);let commands=0,maxArgument=0;
  for(const file of summary.files)if(file.path.endsWith('.command.json')){
   const target=join(archive,file.path),record=JSON.parse(await readFile(target,'utf8')) as {command:string[]};record.command=record.command.map(arg=>arg.startsWith(archive)?recorded+arg.slice(archive.length):arg);maxArgument=Math.max(maxArgument,...record.command.map(arg=>arg.length));const raw=encoded(record);await writeFile(target,raw);file.sha256=hashBytes(raw);file.bytes=Buffer.byteLength(raw);commands++;
  }
  summary.archive=recorded;await writeFile(path,encoded(summary));expect(commands).toBe(88);expect(maxArgument).toBeGreaterThan(4096);
  await expect(readmitArchive(archive,{...authority,recordedArchive:recorded})).rejects.toThrow('command argv bound');
 }finally{await rm(archive,{recursive:true,force:true});}
},30000);

test('actual read bytes cannot exceed the archive budget after a smaller stat preflight',()=>{
 const before=LIMITS.archiveBytes-1,statBytes=1,observedBytes=2;
 expect(before+statBytes<=LIMITS.archiveBytes).toBe(true);
 expect(accumulateArchiveBytes(before,statBytes)).toBe(LIMITS.archiveBytes);
 expect(()=>accumulateArchiveBytes(before,observedBytes)).toThrow('actual archive byte bound');
 expect(accumulateArchiveBytes(0,0)).toBe(0);
 for(const [used,read]of [[-1,1],[1,-1],[NaN,1],[0,Infinity],[0,0.5],[Number.MAX_SAFE_INTEGER,1]])expect(()=>accumulateArchiveBytes(used!,read!)).toThrow('actual archive byte bound');
});
