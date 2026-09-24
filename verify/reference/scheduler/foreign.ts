import {agent,DEFAULT,fn,graph,wire} from './fixtures';
import type {Program,Response} from './oracle';
export {DEFAULT};
const unhandled=graph([agent('primary',{},3),agent('later')],[]);
const handled=graph([agent('primary',{},3),fn('fallback','echo'),agent('later')],[wire('primary','out','fallback','value',{on:'fail'})]);
const nested=graph([{id:'outer',kind:'organism',inputs:{},outputs:{value:{type:'text'}},child:graph([{id:'inner',kind:'organism',inputs:{},outputs:{value:{type:'text'}},child:{...handled,interface:{inputs:{},outputs:{value:{cell:'primary',port:'out'}}}}}],[],{inputs:{},outputs:{value:{cell:'inner',port:'value'}}})}],[]);
const cases:{id:string;program:Program;mode:'output'|'suspend'|'settled'|'signal';journal:boolean}[]=[];
for(const [shape,program]of Object.entries({unhandled,handled,nested}))for(const mode of ['output','suspend','settled','signal']as const)cases.push({id:shape+'-'+mode,program,mode,journal:false});
for(const [shape,program]of Object.entries({handled,nested}))cases.push({id:shape+'-journal-poison',program,mode:'signal',journal:true});
export function foreign(mode:string,runtime:'bun'|'native',journal:boolean):Response{
 if(mode==='output')return {kind:'output',value:'ok',retryable:false};
 if(mode==='suspend')return {kind:'error',code:'EFFECT_SUSPENDED',message:'executor asked the host to suspend the run',retryable:false};
 if(mode==='settled')return {kind:'error',code:'EFFECT_FAILED',message:runtime==='bun'?'executor exited 7; diagnostics withheld':'host executable failed; diagnostics withheld',retryable:false};
 const message=runtime==='bun'?'executor terminated by signal; external completion uncertain':'host executable was terminated by a signal; external completion may be uncertain';
 return journal?{kind:'poison',code:'EFFECT_FAILED',message}:{kind:'error',code:'EFFECT_FAILED',message,retryable:false};
}

export function foreignFixtures(){return structuredClone(cases);}
