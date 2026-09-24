import {test,expect} from 'bun:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {requireSuccess,runCommand} from '../lib/runner';
for(const kind of ['native','bun'])for(const mode of ['clean','collision'])test(`actual ${kind} command catch preserves primary failure with ${mode} retention`,async()=>{
 const directory=await mkdtemp(join(tmpdir(),'algal-actual-failure-catch-'));
 try{
  const result=await runCommand([process.execPath,join(import.meta.dir,'fixtures/failure-catch.ts'),kind,mode,directory],resolve(import.meta.dir,'../..'),{timeoutMs:10000,maxOutputBytes:65536});requireSuccess(result);
  expect(result.stderr).toBe('');expect(result.stdout).toBe(JSON.stringify({contract:'algal.failure-catch-control.v1',kind,mode,calls:1,ok:true})+'\n');
 }finally{await rm(directory,{recursive:true,force:true});}
},15000);
