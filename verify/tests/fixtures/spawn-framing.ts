/** Framing control only: execute the real producer/reader with synthetic command records, never targets. */
import {mock} from 'bun:test';
import {strict as assert} from 'node:assert';
import * as os from 'node:os';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {basename,dirname,join,resolve} from 'node:path';
import {hashBytes,hashJson} from '../../lib/files';
import {readRetainedEvidence} from '../../lib/evidence-retention';
import {syntheticArchive} from '../../reference/spawn/archive-fixture';
import type {CommandResult} from '../../lib/runner';

const library=import.meta.main,directory=library?process.argv[3]:dirname(process.argv[3]!);
const scenario=library?process.argv[2]:'cli';assert(['library','cli','first-worker-failure','copied-reader-failure'].includes(scenario!),'known isolated control scenario');
const failing=scenario==='first-worker-failure'||scenario==='copied-reader-failure';
const primary=new Error(`Injected ${scenario}`);let readerCalls=0;
assert(directory!==undefined&&directory.startsWith('/'),'owned absolute control directory');
const source=join(directory,'synthetic-source'),temp=join(directory,'runtime');await mkdir(source);await mkdir(temp);const resultsRoot=join(directory,'retained');await mkdir(resultsRoot);
const authority=await syntheticArchive(source),runner=await import('../../lib/runner'),definition=await import('../../reference/spawn/definition');
const reader=await import('../../reference/spawn/readmit');
const originalReadmitArchive=reader.readmitArchive;
if(failing)mock.module(resolve(import.meta.dir,'../../reference/spawn/readmit.ts'),()=>({...reader,readmitArchive:async(...args:Parameters<typeof originalReadmitArchive>)=>{
 readerCalls++;return originalReadmitArchive(...args);
}}));
let commands=0,bindings=0;const cases=new Set<string>();
mock.module('node:os',()=>({...os,tmpdir:()=>temp}));
mock.module(resolve(import.meta.dir,'../../reference/spawn/definition.ts'),()=>({...definition,captureSpawnBinding:async()=>{bindings++;if(scenario==='copied-reader-failure'&&bindings===3)throw primary;return authority.binding;}}));
async function materialize(id:string,destination:string):Promise<void>{
 async function copy(relative:string):Promise<void>{
  for(const entry of await readdir(join(source,id,relative),{withFileTypes:true})){
   const path=join(relative,entry.name),target=join(destination,path);
   if(entry.isDirectory()){await mkdir(target,{recursive:true});await copy(path);}
   else if(!entry.name.includes('.command.json')&&!['fixture.json','oracle.json','native-receipt.json'].includes(entry.name))await writeFile(target,await readFile(join(source,id,path)),{flag:'wx'});
  }
 }
 await copy('');cases.add(id);
}
mock.module(resolve(import.meta.dir,'../../lib/runner.ts'),()=>({...runner,runCommand:async(argv:string[],_root:string,options:{timeoutMs:number;maxOutputBytes:number}):Promise<CommandResult>=>{
 assert.equal(options.timeoutMs,30000);assert.equal(options.maxOutputBytes,262144);commands++;
 if(scenario==='first-worker-failure'){assert.equal(commands,1);throw primary;}
 let id:string,name:string;
 if(argv[0]===authority.bunPath){
  id=argv[3]!;const mode=argv[2]!;assert(['run','verify','mutations'].includes(mode));name='bun-'+mode;
  if(mode==='run'){assert(!cases.has(id));await materialize(id,argv[4]!);}
 }else{
  assert.equal(argv[0],authority.nativePath);id=basename(dirname(argv[2]!));
  if(argv[1]==='run')name='native-run';
  else{assert.equal(argv[1],'verify');const receipt=basename(argv[2]!, '-receipt.json');name=['bun','native'].includes(receipt)?'native-verify-'+receipt:'native-'+receipt;}
 }
 const record=JSON.parse(await readFile(join(source,id,name+'.command.json'),'utf8'))as CommandResult;return {...record,command:argv};
}}));
function completed():void{assert.equal(commands,88,'the real producer must reach every synthetic command');assert.equal(bindings,library?4:3,'the real producer must complete source checks before/after/readmission');assert.equal(cases.size,17);}
if(library){
 const {runSpawnConformance}=await import('../../reference/spawn/run');
 if(failing){
  let resolved=false,caught=false;
  try{await runSpawnConformance(resolve(import.meta.dir,'../../..'),authority.nativePath,join(directory,'build.json'),'sha256:'+'1'.repeat(64),resultsRoot);resolved=true;}catch(error){assert.equal(error,primary,'primary failure identity survives diagnostic retention');caught=true;}
  assert(caught&&!resolved,'no successful result or evidence pointer');
  assert.equal(commands,scenario==='first-worker-failure'?1:88);assert.equal(bindings,scenario==='first-worker-failure'?1:3);assert.equal(readerCalls,scenario==='first-worker-failure'?0:1);assert.equal(cases.size,scenario==='first-worker-failure'?0:17);
  const runtimeEntries=await readdir(temp);assert.equal(runtimeEntries.length,1);const archive=join(temp,runtimeEntries[0]!);
  const selectedAuthority={binding:authority.binding,recordedArchive:archive,workerPath:resolve(import.meta.dir,'../../reference/spawn/worker.ts'),nativePath:authority.nativePath,bunPath:authority.bunPath};
  let diagnostics=0,incomplete=0,rawFiles=0;
  for(const name of await readdir(resultsRoot)){
   assert(/^[a-f0-9]{64}$/.test(name));const retained=join(resultsRoot,name),path=join(retained,'manifest.json');let bytes:Buffer;
   try{bytes=await readFile(path);}catch(error){assert.equal((error as NodeJS.ErrnoException).code,'ENOENT');assert.equal(scenario,'copied-reader-failure');assert.deepEqual(await readdir(retained),['raw']);incomplete++;continue;}
   assert.equal(hashBytes(bytes),'sha256:'+name);const manifest=JSON.parse(bytes.toString());assert.equal(manifest.classification,'diagnostic');assert.equal(manifest.recordedArchive,archive);assert.equal(manifest.authorityDigest,hashJson(selectedAuthority));diagnostics++;rawFiles=manifest.files.length;
   assert.equal(await readRetainedEvidence({directory:retained,manifestSha256:hashBytes(bytes),suite:'spawn-conformance',classification:'diagnostic',recordedArchive:archive,authorityDigest:hashJson(selectedAuthority),limits:{maxBytes:16777216,maxFileBytes:262144,maxEntries:1024,maxDepth:8}}),null);
   if(scenario==='first-worker-failure'){const failure=JSON.parse(await readFile(join(retained,'raw/failure.json'),'utf8'));assert.equal(failure.commands,1);assert.equal(failure.error,String(primary));}
   else assert.deepEqual(await readFile(join(retained,'raw/summary.json')),await readFile(join(archive,'summary.json')));
  }
  assert.equal(diagnostics,1);assert.equal(incomplete,0);assert.equal(rawFiles,scenario==='first-worker-failure'?4:406);
  console.log(JSON.stringify({scenario,primaryPreserved:true,publishedSuccess:false,diagnosticManifests:diagnostics,admittedManifests:0,incompleteCopies:incomplete,commands,readerCalls,rawFiles}));
 }else{
 const result=await runSpawnConformance(resolve(import.meta.dir,'../../..'),authority.nativePath,join(directory,'build.json'),'sha256:'+'1'.repeat(64),resultsRoot);completed();assert.equal(result.admission?.status,'admitted');assert.equal(result.evidence.classification,'admitted');assert.equal(result.evidence.files,405);assert.equal(result.evidence.manifest.sha256,hashBytes(await readFile(join(resultsRoot,result.evidence.manifest.path))));
 console.log(JSON.stringify({entry:'library',archive:result.archive,ok:result.ok,cases:result.cases,comparisons:result.comparisons,replays:result.replays,negativeReplays:result.negativeReplays,commands:result.commands,summarySha256:hashBytes(await readFile(join(result.archive,'summary.json')))}));
 }
}else process.once('beforeExit',completed);
