import {test,expect} from 'bun:test';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {hashBytes} from '../lib/files';
import {requireSuccess,runCommand} from '../lib/runner';

for(const mode of ['library','cli']as const)test(`spawn ${mode} entry emits one JSON frame after a synthetic successful matrix`,async()=>{
 const directory=await mkdtemp(join(tmpdir(),'algal-spawn-framing-'));
 try{
  const control=join(import.meta.dir,'fixtures/spawn-framing.ts'),args=mode==='library'?[control,'library',directory]:['--preload',control,join(import.meta.dir,'../reference/spawn/run.ts'),'/synthetic/algal',join(directory,'build.json'),'sha256:'+'1'.repeat(64)];
  const result=await runCommand([process.execPath,...args],resolve(import.meta.dir,'../..'),{timeoutMs:30000,maxOutputBytes:65536});requireSuccess(result);
  expect(result.stderr).toBe('');const frame=JSON.parse(result.stdout);expect(result.stdout.trim().split('\n')).toHaveLength(1);expect(frame.ok).toBe(true);expect(frame.cases).toBe(17);expect(frame.commands).toBe(88);expect(frame.comparisons).toBe(34);expect(frame.replays).toBe(68);expect(frame.negativeReplays).toBe(4);expect(frame.summarySha256).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(frame.archive.startsWith(join(directory,'runtime')+'/')).toBe(true);expect(frame.summarySha256).toBe(hashBytes(await readFile(join(frame.archive,'summary.json'))));
  if(mode==='library')expect(frame.entry).toBe('library');else expect(frame.entry).toBeUndefined();
 }finally{await rm(directory,{recursive:true,force:true});}
},35000);
