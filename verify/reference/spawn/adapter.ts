/** Separate production adapter; never imported by oracle semantics. */
import {createHash} from 'node:crypto';
import {parseOrganismManifest} from '../../../src/contract';
import {parseRunReceipt} from '../../../src/run';
import type {Store} from '../../../src/store-contract';
import {canonical,type Budget,type Port,type Program,type State} from './oracle';
const hash=(data:string|Uint8Array)=>'sha256:'+createHash('sha256').update(data).digest('hex');
const port=(p:Port)=>{const {schemaType,...rest}=p;return {...rest,...(schemaType?{schema:{type:schemaType}}:{})};};
const ports=(p:Record<string,Port>)=>Object.fromEntries(Object.entries(p).map(([key,p])=>[key,port(p)]));
export async function materialize(p:Program,store:Store,budget?:Budget):Promise<ReturnType<typeof parseOrganismManifest>>{
 const cells:unknown[]=[];
 for(const c of p.cells){
  if(c.kind==='input')cells.push({id:c.id,kind:c.kind,outputs:ports(c.outputs)});
  else if(c.kind==='const')cells.push({id:c.id,kind:c.kind,outputs:Object.fromEntries(Object.entries(c.outputs).map(([k,p])=>[k,{...port(p),value:c.values[k]}]))});
  else if(c.kind==='fn')cells.push({id:c.id,kind:c.kind,fn:c.op+'.v1'});
  else if(c.kind==='spawn')cells.push({id:c.id,kind:'spawn'});
  else if(c.kind==='agent')cells.push({id:c.id,kind:c.kind,inputs:ports(c.inputs),prompt:c.prompt,output:{kind:'text'},...(c.attempts>1?{retry:{attempts:c.attempts}}:{}),...(c.budget?{budget:c.budget}:{})});
  else{
   const manifest=await store.putManifest(await materialize(c.child,store));
   cells.push({id:c.id,kind:c.kind,manifest,...(c.kind==='repeat'?{maxRounds:c.max,...(c.carry?{carry:c.carry}:{}),...(c.until?{until:{output:c.until.output,equals:c.until.value}}:{})}:{}),...(c.kind==='each'?{maxItems:c.max,over:c.over}:{})});
  }
 }
 return parseOrganismManifest({contract:'algal.organism.v1',key:'organism:oracle-fixture',name:'Oracle fixture',...(budget?{budgets:budget}:{}),interface:p.interface,cells,edges:p.edges.map(e=>({from:e.from,to:e.to,...(e.on?{on:e.on}:{}),...(e.guard?{guard:e.guard.kind==='equals'?{equals:e.guard.value}:{expr:{contract:'algal.expr.v1',program:e.guard.value}}}:{})}))});
}
export function expected(state:State, metadata:{executor?:string;configurationDigest?:string;retryable?:false}={}){
 const digests=state.effects.map(e=>hash(canonical(e.request)));
 const cells=Object.fromEntries(Object.entries(state.cells).map(([key,record])=>{const {effectOrdinal,failure,...rest}=record;return [key,{...rest,...(effectOrdinal===undefined?{}:{effectDigest:digests[effectOrdinal]}),...(failure?{failure:{code:failure.code}}:{})}]}));
 const effects=state.effects.map((e,i)=>({requestDigest:digests[i],executor:metadata.executor??'scripted',...(metadata.configurationDigest?{configurationDigest:metadata.configurationDigest}:{}),...(metadata.retryable===false?{retryable:false}:{}),...(e.response.kind==='output'?{output:e.response.value}:{error:{code:e.response.code,message:e.response.message},...(e.response.retryable===false||e.response.code==='EFFECT_SUSPENDED'?{retryable:false}:{})})}));
 const actions:Record<string,string>={commit:'cell.commit',skip:'cell.skip',fail:'cell.fail',suspend:'cell.suspend',dispatch:'effect'};
 return {outcome:state.outcome,...(state.failure?{failure:{code:state.failure.code,path:state.failure.path}}:{}),cells,effects,work:state.work,events:state.trace.filter(t=>actions[t.action]).map(t=>({kind:actions[t.action],path:t.path}))};
}
export function actual(raw:unknown){
 const r=parseRunReceipt(raw);
 return {outcome:r.outcome,...(r.failure?{failure:{code:r.failure.code,path:r.failure.path}}:{}),cells:Object.fromEntries(Object.entries(r.cells).map(([k,v])=>{const {failure,...rest}=v;return [k,{...rest,...(failure?{failure:{code:failure.code}}:{})}]})),effects:r.effects,work:r.work,events:r.events.filter((e)=>!['run.start','run.end'].includes(e.kind)).map((e)=>({kind:e.kind,path:e.path}))};
}
