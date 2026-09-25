/** Isolated actual-catch diagnostic controls. The selected runtime command is mocked, never executed. */
import {mock} from 'bun:test';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import type {History} from '../../traces/schema';
const [kind,mode,directory]=process.argv.slice(2);
assert(process.argv.length===5&&['native','bun'].includes(kind??'')&&['clean','collision'].includes(mode??'')&&directory!==undefined&&directory.startsWith('/'),'closed control arguments');
const runnerPath=resolve(import.meta.dir,'../../lib/runner.ts'),runner=await import(runnerPath),Failure=runner.CommandFailure;
const stdout=Uint8Array.of(255,0,254),stderr=Uint8Array.of(253,0,252),owned=join(directory,'replay');
const primary=new Failure('original controlled invalid UTF-8 failure',stdout,stderr,{command:['/not-executed'],completion:undefined,drained:undefined,receivedBytes:{stdout:stdout.length,stderr:stderr.length},supervisorExit:undefined,timedOut:false,outputExceeded:false,stdoutEnded:true,stderrEnded:true});
let calls=0;
mock.module(runnerPath,()=>({...runner,runCommand:async()=>{calls++;if(mode==='collision')await writeFile(join(owned,'stdout.bin'),'earlier evidence',{flag:'wx'});throw primary;}}));
const root=resolve(import.meta.dir,'../../..'),history:History={contract:'algal.verification-history.v1',seed:1,commands:[]};
let caught:unknown;
try{
 if(kind==='native'){
  const {artifactIdentity,replayNative}=await import('../../traces/native');const fake=join(directory,'identity-only-artifact');await writeFile(fake,'this identity fixture must never execute',{flag:'wx'});await replayNative(root,await artifactIdentity(fake),history,owned);
 }else{const {runBunHistory}=await import('../../traces/run');await runBunHistory(root,owned,history);}
}catch(error){caught=error;}
assert.equal(calls,1,'actual adapter must reach its command catch exactly once');
if(mode==='collision'){assert(caught instanceof AggregateError);assert.equal(caught.cause,primary);assert.equal(caught.errors[0],primary);assert.equal(caught.errors.length,2);assert.equal(await readFile(join(owned,'stdout.bin'),'utf8'),'earlier evidence');}
else{assert.equal(caught,primary);assert.deepEqual(new Uint8Array(await readFile(join(owned,'stdout.bin'))),stdout);}
assert.deepEqual(new Uint8Array(await readFile(join(owned,'stderr.bin'))),stderr);
const record=JSON.parse(await readFile(join(owned,'custody-failure.json'),'utf8'));
assert.equal(record.message,primary.message);for(const key of ['completion','drained','supervisorExit'])assert.equal(record.observation[key],null);assert.equal(record.observation.stdoutEnded,true);
console.log(JSON.stringify({contract:'algal.failure-catch-control.v1',kind,mode,calls,ok:true}));
