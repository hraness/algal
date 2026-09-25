/** Finite spawn extension of the independent scheduler oracle. No production imports. */
import { createHash } from "node:crypto";
export type Json = null | boolean | number | string | Json[] | {[key:string]:Json};
export type Values = Record<string,Json>;
export type Port = {type:'json'|'text'; many?:boolean; optional?:boolean; schemaType?:'string'|'integer'|'object'};
export type Ports = Record<string,Port>;
export type End = {cell:string;port:string};
export type Guard = {kind:'equals';value:Json} | {kind:'literal';value:Json};
export type Edge = {from:End;to:End;on?:'fail';guard?:Guard};
type Base = {id:string;inputs:Ports;outputs:Ports};
export type Cell = Base & (
  {kind:'input'} | {kind:'const';values:Values} | {kind:'spawn'} |
  {kind:'fn';op:'echo'|'inc'|'join'|'coalesce'} |
  {kind:'agent';prompt:string;attempts:number;budget?:{maxContextBytes?:number;maxOutputBytes?:number}} |
  {kind:'organism'|'repeat'|'each';child:Program;max?:number;over?:string;carry?:Record<string,string>;until?:{output:string;value:Json}}
);
export type Program = {cells:Cell[];edges:Edge[];interface:{inputs:Record<string,End>;outputs:Record<string,End>}};
export type SpawnSpec = {id:string;prompt:string;attempts:number;budgets:Budget;agentBudget?:{maxContextBytes?:number;maxOutputBytes?:number}};
export type SpawnDefinition = {manifest:Json;program:Program;digest:string;budgets:Budget};
export type Budget = {maxSteps:number;maxAgentCalls:number;maxWork:number;maxDepth:number;maxContextBytes:number;maxOutputBytes:number};
export type Failure = {code:string;message:string;path?:string};
export type Response = {kind:'output';value:Json;retryable?:false} | {kind:'error';code:string;message:string;retryable?:false} | {kind:'poison';code?:string;message:string};
export type Tape = {cell:string;response:Response}[];
type Status = 'committed'|'skipped'|'failed'|'suspended';
type CellRecord = {status:Status;work:number;outputs?:Values;failure?:Failure;effectOrdinal?:number;rounds?:number;items?:number};
type Effect = {ordinal:number;path:string;request:Json;response:Exclude<Response,{kind:'poison'}>};
type Phase = 'scan'|'edge'|'collect'|'input'|'execute'|'effect'|'await'|'bind'|'commit'|'settle'|'post'|'push'|'child'|'return'|'terminal';
type Frame = {
  program:Program;args:Record<string,Values>;prefix:string;depth:number;phase:Phase;scan:number;progress:boolean;
  resolved:Record<string,Status>;edges:('pending'|'dead'|'delivered')[];edgeValues:(Json|undefined)[];
  current:number;inbound:number[];edgeCursor:number;inputs:Values;before:number;outputs:Values;
  failure?:Failure;suspended:boolean;outcome?:'complete'|'failed'|'suspended'|'stuck';
  attempt:number;request?:Json;maxOutput:number;lastResponse?:Response;effectOrdinal?:number;
  iteration:number;carried:Values;aggregate:Values;lastChild:Values;spawned?:SpawnDefinition;
};
export type State = {
  frames:Frame[];budget:Budget;catalog:SpawnDefinition[];cells:Record<string,CellRecord>;effects:Effect[];
  work:{steps:number;agentCalls:number;units:number};outcome:'running'|'complete'|'failed'|'suspended'|'stuck'|'journal-error';
  failure?:Failure;trace:{action:string;path:string;units:number}[];guardCounts:Record<string,number>;
  mutation:'none'|'reverse-edges'|'reset-budget'|'reuse-path'|'drop-carry'|'suspend-failure'|'widen-bytes'|'refund-retry'|'collapse-effect'|'repeat-first-output'|'spawn-reuse-path'|'spawn-child-budget'|'spawn-forge-digest';
};

function insist(value:unknown,what:string):asserts value { if(!value)throw new Error(`oracle admission: ${what}`); }
function object(x:unknown):x is Record<string,unknown>{return x!==null&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null)&&Reflect.ownKeys(x).every(k=>typeof k==='string'&&Object.getOwnPropertyDescriptor(x,k)?.enumerable===true&&Object.hasOwn(Object.getOwnPropertyDescriptor(x,k)!,'value'));}
function fields(x:unknown,allowed:string[],required:string[],what:string):asserts x is Record<string,unknown>{
 insist(object(x),what);insist(Object.keys(x).every(k=>allowed.includes(k)),`${what} unknown field`);
 insist(required.every(k=>Object.hasOwn(x,k)),`${what} missing field`);
}
function integer(x:unknown,min:number,max:number,what:string):asserts x is number {insist(Number.isSafeInteger(x)&&Number(x)>=min&&Number(x)<=max,what);}
function name(x:unknown):asserts x is string{insist(typeof x==='string'&&/^[a-z][a-z0-9_-]{0,31}$/.test(x)&&!['constructor','prototype','__proto__'].includes(x),'name');}
function json(x:unknown,depth=0):asserts x is Json{
 insist(depth<=12,'fixture JSON depth');
 if(x===null||typeof x==='boolean')return;
 if(typeof x==='number'){integer(x,-1000000,1000000,'fixture integer');return;}
 if(typeof x==='string'){insist(x.length<=1024&&Array.from(x).every(char=>char.charCodeAt(0)<=127),'fixture ASCII text');return;}
 if(Array.isArray(x)){insist(x.length<=64&&Reflect.ownKeys(x).length===x.length+1,'fixture array');for(const v of x)json(v,depth+1);return;}
 insist(object(x)&&Object.keys(x).length<=64,'fixture object');
 for(const [k,v]of Object.entries(x)){insist(/^[\x20-\x7e]{1,128}$/.test(k),'fixture key');json(v,depth+1);}
}
function objectKeys(value:Record<string,unknown>):string[]{
 const index=(key:string)=>/^(?:0|[1-9][0-9]*)$/.test(key)&&Number(key)<4294967295&&String(Number(key))===key;
 return Object.keys(value).sort((a,b)=>index(a)?index(b)?Number(a)-Number(b):-1:index(b)?1:a<b?-1:a>b?1:0);
}
export function canonical(value:Json):string{
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value!==null&&typeof value==='object')return '{'+objectKeys(value).map(k=>JSON.stringify(k)+':'+canonical(value[k]!)).join(',')+'}';
 return JSON.stringify(value);
}
const bytes=(value:Json)=>new TextEncoder().encode(canonical(value)).length;
/** Conservative reachable-state bounds for this admitted IR; see PROGRESS.md. */
export function internalBounds(budget:Budget):{frames:number;transitions:number;work:number}{
 const frames=1+64*budget.maxSteps;
 return {frames,transitions:64*frames+32*budget.maxSteps+8*budget.maxAgentCalls+8,work:110*budget.maxSteps+12*frames+budget.maxAgentCalls*(500+budget.maxContextBytes+budget.maxOutputBytes)};
}
function ports(value:unknown):asserts value is Ports{
 insist(object(value)&&Object.keys(value).length<=8,'ports');
 for(const [k,v]of Object.entries(value)){
  name(k);fields(v,['type','many','optional','schemaType'],['type'],'port');
  insist(v.type==='json'||v.type==='text','port type');
  for(const flag of ['many','optional'])insist(v[flag]===undefined||v[flag]===true,'normalized port flag');
  insist(v.schemaType===undefined||v.type==='json'&&['string','integer','object'].includes(String(v.schemaType)),'port schema');
 }
}
function endpoint(value:unknown):asserts value is End{fields(value,['cell','port'],['cell','port'],'endpoint');name(value.cell);name(value.port);}
function compatible(source:Port,target:Port):boolean{return !(source.many&&!target.many&&target.type!=='json')&&(source.type===target.type||target.type==='json');}
function childPorts(p:Program,side:'inputs'|'outputs'):Ports{return Object.fromEntries(Object.entries(p.interface[side]).map(([alias,t])=>[alias,structuredClone(p.cells.find(c=>c.id===t.cell)!.outputs[t.port]!)]));}
function admitProgram(raw:unknown,depth=0,bound={programs:0,cells:0}):asserts raw is Program{
 fields(raw,['cells','edges','interface'],['cells','edges','interface'],'program');insist(depth<=8&&++bound.programs<=64,'fixture embedding bound');
 insist(Array.isArray(raw.cells)&&raw.cells.length>=1&&raw.cells.length<=5,'fixture cells');
 insist((bound.cells+=raw.cells.length)<=128,'fixture total cells');
 const ids=new Set<string>();
 for(const c of raw.cells){
  insist(object(c),'cell');const kind=c.kind;
  const extra=kind==='input'||kind==='spawn'?[]:kind==='const'?['values']:kind==='fn'?['op']:kind==='agent'?['prompt','attempts','budget']:kind==='organism'?['child']:kind==='repeat'?['child','max','carry','until']:['child','max','over'];
  fields(c,['id','kind','inputs','outputs',...extra],['id','kind','inputs','outputs'],'cell');
  name(c.id);insist(!ids.has(c.id),'duplicate cell');ids.add(c.id);ports(c.inputs);ports(c.outputs);
  insist(['input','const','fn','agent','organism','repeat','each','spawn'].includes(String(kind)),'supported kind');
  if(kind==='input'||kind==='const'){insist(Object.keys(c.inputs).length===0,'source has no inputs');insist(Object.values(c.outputs).every(p=>!p.many),'source scalar ports');}
  if(kind==='const'){json(c.values);insist(object(c.values),'constant outputs');insist(canonical(Object.keys(c.values).sort())===canonical(Object.keys(c.outputs).sort()),'constant output keys');}
  if(kind==='fn'){
   insist(['echo','inc','join','coalesce'].includes(String(c.op)),'pure operation');
   const inputs:Ports=c.op==='join'?{items:{type:'text',many:true},sep:{type:'text',optional:true}}:c.op==='coalesce'?{a:{type:'json',optional:true},b:{type:'json',optional:true},c:{type:'json',optional:true}}:{value:{type:'json'}};
   const outputs:Ports={value:{type:c.op==='join'?'text':'json'}};
   insist(canonical(c.inputs)===canonical(inputs)&&canonical(c.outputs)===canonical(outputs),'pure operation signature');
  }
  if(kind==='spawn')insist(canonical(c.inputs)===canonical({manifest:{type:'json'},args:{type:'json',optional:true}})&&canonical(c.outputs)===canonical({data:{type:'json'},digest:{type:'text'}}),'spawn signature');
  if(kind==='agent'){
   insist(typeof c.prompt==='string'&&c.prompt.length<=128,'prompt');json(c.prompt);integer(c.attempts,1,3,'attempt bound');
   if(c.budget!==undefined){fields(c.budget,['maxContextBytes','maxOutputBytes'],[],'cell byte budget');for(const v of Object.values(c.budget))integer(v,1,65536,'cell byte bound');}
   insist(canonical(c.outputs)===canonical({out:{type:'text'}}),'agent exact text output');
  }
  if(['organism','repeat','each'].includes(String(kind))){
   admitProgram(c.child,depth+1,bound);
   const expectedInputs=childPorts(c.child,'inputs'),expectedOutputs=childPorts(c.child,'outputs');
   if(kind==='repeat'||kind==='each')integer(c.max,1,kind==='repeat'?16:64,'iteration bound');
   if(kind==='each'){
    name(c.over);insist(Object.hasOwn(expectedInputs,c.over),'each input');
    expectedInputs[c.over]={type:'json'};
    for(const key of Object.keys(expectedOutputs))expectedOutputs[key]={...expectedOutputs[key]!,many:true};
   }
   if(c.carry!==undefined){
    insist(object(c.carry)&&Object.keys(c.carry).length<=8,'carry map');const targets=new Set<string>();
    for(const [out,input]of Object.entries(c.carry)){
     name(out);name(input);insist(!targets.has(input),'ambiguous carry target');targets.add(input);
     const source=expectedOutputs[out],target=expectedInputs[input];
     insist(source&&target&&compatible(source,target)&&(!target.many||source.many),'carry signature');
     expectedInputs[input]={...target,optional:true};
    }
   }
   if(c.until!==undefined){fields(c.until,['output','value'],['output','value'],'until');name(c.until.output);json(c.until.value);insist(typeof c.until.value==='string'&&c.until.value.length<=64&&Object.hasOwn(expectedOutputs,c.until.output),'until text output');}
   insist(canonical(c.inputs)===canonical(expectedInputs)&&canonical(c.outputs)===canonical(expectedOutputs),'wrapper interface signature');
  }
 }
 insist(Array.isArray(raw.edges)&&raw.edges.length<=12,'fixture edge bound');
 const cells=raw.cells as Cell[];
 for(const e of raw.edges){
  fields(e,['from','to','on','guard'],['from','to'],'edge');endpoint(e.from);endpoint(e.to);
  const source=e.from,target=e.to;
  const from=cells.find(c=>c.id===source.cell),to=cells.find(c=>c.id===target.cell);
  insist(from&&to&&Object.hasOwn(from.outputs,e.from.port)&&Object.hasOwn(to.inputs,e.to.port),'edge port');
  insist(e.on===undefined||e.on==='fail','edge kind');
  const sourcePort=from.outputs[source.port]!,targetPort=to.inputs[target.port]!;
  insist(e.on==='fail'?targetPort.type==='json':compatible(sourcePort,targetPort),'edge type compatibility');
  if(e.guard!==undefined){
   fields(e.guard,['kind','value'],['kind','value'],'guard');insist(e.guard.kind==='equals'||e.guard.kind==='literal','guard kind');json(e.guard.value);insist(e.on===undefined,'fail guard');
   if(e.guard.kind==='equals')insist(typeof e.guard.value==='string'&&e.guard.value.length<=64&&sourcePort.type==='text'&&!sourcePort.many,'text equality guard');
   else insist(e.guard.value===null||['boolean','number','string'].includes(typeof e.guard.value),'literal scalar guard');
  }
 }
 for(const c of cells)for(const [port,decl]of Object.entries(c.inputs)){
  const incoming=(raw.edges as Edge[]).filter(e=>e.to.cell===c.id&&e.to.port===port);
  insist(decl.many||incoming.length<=1,'scalar fan-in');insist(new Set(incoming.map(e=>e.on??'normal')).size<=1,'mixed normal/fail input');
 }
 // Independent cycle rejection; no production topological ordering is used.
 const reached=new Set<string>();for(let n=0;n<cells.length;n++)for(const c of cells)if((raw.edges as Edge[]).every(e=>e.to.cell!==c.id||reached.has(e.from.cell)))reached.add(c.id);
 insist(reached.size===cells.length,'cycle');
 fields(raw.interface,['inputs','outputs'],['inputs','outputs'],'interface');
 for(const side of ['inputs','outputs']){
  insist(object(raw.interface[side])&&Object.keys(raw.interface[side]).length<=8,'interface map');const aliases=new Set<string>();
  for(const [alias,target]of Object.entries(raw.interface[side])){name(alias);endpoint(target);const c=cells.find(c=>c.id===target.cell);insist(c&&Object.hasOwn(c.outputs,target.port)&&(side!=='inputs'||c.kind==='input'),'interface endpoint');const key=target.cell+'.'+target.port;insist(!aliases.has(key),'ambiguous interface aliases');aliases.add(key);}
 }
}
function frame(program:Program,args:Record<string,Values>,prefix:string,depth:number):Frame{
 return {program,args,prefix,depth,phase:'scan',scan:0,progress:false,resolved:{},edges:program.edges.map(()=> 'pending'),edgeValues:program.edges.map(()=>undefined),current:0,inbound:[],edgeCursor:0,inputs:{},before:0,outputs:{},suspended:false,attempt:0,maxOutput:0,iteration:0,carried:{},aggregate:{},lastChild:{}};
}
function admitBudget(budget:unknown):asserts budget is Budget {
 fields(budget,['maxSteps','maxAgentCalls','maxWork','maxDepth','maxContextBytes','maxOutputBytes'],['maxSteps','maxAgentCalls','maxWork','maxDepth','maxContextBytes','maxOutputBytes'],'root budget');
 integer(budget.maxSteps,1,1024,'steps');integer(budget.maxAgentCalls,0,64,'calls');integer(budget.maxDepth,0,8,'depth');integer(budget.maxWork,1,100000000,'work');for(const k of ['maxContextBytes','maxOutputBytes'])integer(budget[k],1,65536,k);
}
/** Deliberately finite independent normalization: a single no-input text agent.
 * Unknown dynamic wire values are unsupported fixture inputs, never product refusals. */
export function spawnDefinition(raw:unknown):SpawnDefinition {
 fields(raw,['id','prompt','attempts','budgets','agentBudget'],['id','prompt','attempts','budgets'],'spawn definition');name(raw.id);json(raw.prompt);insist(typeof raw.prompt==='string'&&raw.prompt.length<=128,'spawn prompt');integer(raw.attempts,1,3,'spawn attempts');admitBudget(raw.budgets);
 if(raw.agentBudget!==undefined){fields(raw.agentBudget,['maxContextBytes','maxOutputBytes'],[],'spawn agent budget');for(const value of Object.values(raw.agentBudget))integer(value,1,65536,'spawn agent byte bound');}
 const spec=structuredClone(raw) as SpawnSpec;
 const cell:Cell={id:'leaf',kind:'agent',inputs:{},outputs:{out:{type:'text'}},prompt:spec.prompt,attempts:spec.attempts,...(spec.agentBudget?{budget:spec.agentBudget}:{})};
 const program:Program={cells:[cell],edges:[],interface:{inputs:{},outputs:{out:{cell:'leaf',port:'out'}}}};
 const manifest:Json={contract:'algal.organism.v1',key:'organism:spawn-'+spec.id,name:'Spawn fixture '+spec.id,budgets:spec.budgets as unknown as Json,cells:[{id:'leaf',kind:'agent',prompt:spec.prompt,view:{inputs:'*'},output:{kind:'text'},...(spec.attempts>1?{retry:{attempts:spec.attempts}}:{}),...(spec.agentBudget?{budget:spec.agentBudget as Json}:{})}],edges:[],interface:program.interface as unknown as Json};
 const serialized=canonical(manifest);insist(serialized.length<=4096,'spawn catalog manifest bytes');
 return {manifest,program,digest:'sha256:'+createHash('sha256').update(serialized).digest('hex'),budgets:spec.budgets};
}
export function start(program:unknown,args:unknown,budget:unknown,mutation:State['mutation']='none',catalogSpecs:unknown=[]):State{
 insist(['none','reverse-edges','reset-budget','reuse-path','drop-carry','suspend-failure','widen-bytes','refund-retry','collapse-effect','repeat-first-output','spawn-reuse-path','spawn-child-budget','spawn-forge-digest'].includes(mutation),'mutation');
 admitProgram(program);admitBudget(budget);
 insist(Array.isArray(catalogSpecs)&&catalogSpecs.length<=2,'spawn catalog bound');const catalog=catalogSpecs.map(spawnDefinition);insist(new Set(catalog.map(c=>canonical(c.manifest))).size===catalog.length,'duplicate spawn definition');
 json(args);insist(object(args)&&Object.values(args).every(object),'root args');
 return structuredClone({frames:[frame(program,args as Record<string,Values>,'',0)],budget:budget as Budget,catalog,cells:{},effects:[],work:{steps:0,agentCalls:0,units:0},outcome:'running',trace:[],guardCounts:{},mutation});
}
function portError(value:Json,p:Port):string|undefined{
 const values=p.many?(Array.isArray(value)?value:undefined):[value];if(values===undefined)return 'expected list';
 for(const v of values){if(p.type==='text'&&typeof v!=='string')return 'expected text';
  if(p.schemaType==='string'&&typeof v!=='string'||p.schemaType==='integer'&&!Number.isInteger(v)||p.schemaType==='object'&&!object(v))return `expected ${p.schemaType}`;
 }return undefined;
}
function projected(f:Frame,s:State):Values{const out:Values={};for(const [alias,t]of Object.entries(f.program.interface.outputs)){const v=s.cells[path(f.prefix,t.cell)]?.outputs?.[t.port];if(v!==undefined)out[alias]=v;}return out;}
const path=(prefix:string,id:string)=>prefix?`${prefix}/${id}`:id;
function failFrame(s:State,f:Frame,error:Failure,at:string){f.failure=error;f.outcome='failed';f.phase='terminal';s.failure??={...error,path:at};}
function pure(op:Extract<Cell,{kind:'fn'}>['op'],inputs:Values):{outputs:Values}|{error:Failure}{
 if(op==='echo')return {outputs:{value:inputs.value??null}};
 if(op==='join')return {outputs:{value:(inputs.items as Json[]).map(v=>String(v)).join(typeof inputs.sep==='string'?inputs.sep:'\n')}};
 if(op==='inc')return typeof inputs.value==='number'?{outputs:{value:inputs.value+1}}:{error:{code:'FN_FAILED',message:'inc.v1: value must be a finite number'}};
 for(const key of ['a','b','c'])if(inputs[key]!==undefined&&inputs[key]!==null)return {outputs:{value:inputs[key]!}};
 return {error:{code:'FN_FAILED',message:'coalesce.v1: all inputs empty'}};
}
export function waiting(state:State):boolean{return state.outcome==='running'&&state.frames.at(-1)!.phase==='await';}
/** Pure immutable transition. A missing external response leaves await unchanged. */
export function step(previous:State,response?:Response):State{
 if(previous.outcome!=='running')return previous;
 if(waiting(previous)&&response===undefined)return previous;
 if(!waiting(previous)&&response!==undefined)throw new Error('oracle response without dispatch');
 if(response!==undefined){
  const raw:unknown=response;insist(object(raw),'response');
  if(raw.kind==='output'){fields(raw,['kind','value','retryable'],['kind','value'],'output response');json(raw.value);insist(raw.retryable===undefined||raw.retryable===false,'output retryability');}
  else if(raw.kind==='error'){fields(raw,['kind','code','message','retryable'],['kind','code','message'],'error response');insist(typeof raw.code==='string'&&/^[A-Z_]{1,64}$/.test(raw.code),'error code');json(raw.message);insist(typeof raw.message==='string'&&(raw.retryable===undefined||raw.retryable===false),'error response fields');}
  else{fields(raw,['kind','code','message'],['kind','message'],'poison response');insist(raw.kind==='poison','response kind');json(raw.message);insist(typeof raw.message==='string'&&(raw.code===undefined||typeof raw.code==='string'&&/^[A-Z_]{1,64}$/.test(raw.code)),'poison fields');}
 }
 const {trace:priorTrace,...priorSemantic}=previous;
 // Trace entries are append-only observations. Share old entries while copying
 // the outer array; all mutable semantic state still gets a deep clone.
 const s:State={...structuredClone(priorSemantic),trace:[...priorTrace]},f=s.frames.at(-1)!,c=f.program.cells[f.current]!,at=c?path(f.prefix,c.id):f.prefix;
 let action:string=f.phase;
 const error=(code:string,message:string)=>{f.failure={code,message};f.phase='settle';};
 switch(f.phase){
  case 'scan':{
   if(f.scan===f.program.cells.length){
    const pending=f.program.cells.some(x=>!Object.hasOwn(f.resolved,x.id));
    if(pending&&f.progress){f.scan=0;f.progress=false;action='sweep';}
    else{f.outcome=pending?'stuck':'complete';f.phase='terminal';action='frame-finish';}break;
   }
   const candidate=f.program.cells[f.scan]!;
   if(Object.hasOwn(f.resolved,candidate.id)||f.program.edges.some(e=>e.to.cell===candidate.id&&!Object.hasOwn(f.resolved,e.from.cell))){f.scan++;action='scan-wait';break;}
   f.current=f.scan;f.inbound=f.program.edges.flatMap((e,i)=>e.to.cell===candidate.id?[i]:[]);
   if(s.mutation==='reverse-edges')f.inbound.reverse();
   f.edgeCursor=0;f.inputs={};f.outputs={};delete f.failure;delete f.effectOrdinal;f.phase='edge';action='select';break;
  }
  case 'edge':{
   if(f.edgeCursor===f.inbound.length){f.phase='collect';action='edges-ready';break;}
   const i=f.inbound[f.edgeCursor++]!,e=f.program.edges[i]!,source=s.cells[path(f.prefix,e.from.cell)];
   let v=e.on==='fail'?(source?.status==='failed'?source.failure as Json:undefined):(source?.status==='committed'?source.outputs?.[e.from.port]:undefined);
   if(v!==undefined&&e.guard){
    const g=e.guard;const match=g.kind==='literal'?g.value:canonical(v)===canonical(g.value);
    if(g.kind==='literal'){s.work.units++;s.guardCounts[`${f.prefix}:${i}`]=(s.guardCounts[`${f.prefix}:${i}`]??0)+1;}
    if(typeof match!=='boolean'){failFrame(s,f,{code:'GUARD_INVALID',message:`guard expr must produce boolean, got ${match===null?'null':typeof match}`},at);action='guard-invalid';break;}
    if(s.work.units>s.budget.maxWork){failFrame(s,f,{code:'BUDGET_EXHAUSTED',message:'maxWork exhausted'},at);action='guard-work-limit';break;}
    if(!match)v=undefined;
   }
   f.edges[i]=v===undefined?'dead':'delivered';f.edgeValues[i]=v;action='resolve-edge';break;
  }
  case 'collect':{
   let nonempty=0,missing=false;
   for(const [p,decl]of Object.entries(c.inputs)){
    const hits:Json[]=[];for(const i of f.inbound){const e=f.program.edges[i]!;if(e.to.port!==p||f.edges[i]!=='delivered')continue;const v=f.edgeValues[i]!;
     const producer=f.program.cells.find(x=>x.id===e.from.cell)!;
     if(decl.many&&producer.outputs[e.from.port]!.many&&Array.isArray(v))hits.push(...v);else hits.push(v);
    }
    if(hits.length)nonempty++;else if(!decl.optional)missing=true;
    if(decl.many){if(hits.length||decl.optional)f.inputs[p]=hits;}else if(hits.length)f.inputs[p]=hits[0]!;
   }
   if(Object.keys(c.inputs).length&&(nonempty===0||missing)){f.resolved[c.id]='skipped';s.cells[at]={status:'skipped',work:0};f.progress=true;f.scan++;f.phase='scan';action='skip';break;}
   if(s.work.steps===s.budget.maxSteps){failFrame(s,f,{code:'BUDGET_EXHAUSTED',message:'maxSteps exhausted'},at);action='step-limit';break;}
   s.work.steps++;f.before=s.work.units;s.work.units+=100;f.phase='input';action='activate';break;
  }
  case 'input':{
   const bad=Object.entries(c.inputs).find(([p,d])=>f.inputs[p]!==undefined&&portError(f.inputs[p]!,d)!==undefined);
   if(bad)error('TYPE_MISMATCH',portError(f.inputs[bad[0]]!,bad[1])!);else f.phase='execute';action='input-admission';break;
  }
  case 'execute':{
   if(c.kind==='input'){f.outputs=Object.fromEntries(Object.keys(c.outputs).filter(p=>f.args[c.id]?.[p]!==undefined).map(p=>[p,f.args[c.id]![p]!]));f.phase='commit';}
   else if(c.kind==='const'){f.outputs=structuredClone(c.values);f.phase='commit';}
   else if(c.kind==='fn'){s.work.units+=c.op==='inc'?5:10;const result=pure(c.op,f.inputs);if('error'in result){f.failure=result.error;f.phase='settle';}else{f.outputs=result.outputs;f.phase='commit';}}
   else if(c.kind==='agent'){f.attempt=0;f.phase='effect';}
   else if(c.kind==='spawn'){
    const selected=s.catalog.find(d=>canonical(d.manifest)===canonical(f.inputs.manifest!));insist(selected!==undefined,'unsupported dynamic manifest');
    const supplied=f.inputs.args??{};insist(object(supplied)&&Object.keys(supplied).length===0,'spawn fixture has no arguments');
    f.spawned=selected;f.iteration=0;f.carried={};f.lastChild={};f.aggregate={};f.phase='push';
   }
   else {f.iteration=0;f.carried={};f.lastChild={};f.aggregate=Object.fromEntries(Object.keys(c.child.interface.outputs).map(k=>[k,[]]));
    if(c.kind==='each'&&!Array.isArray(f.inputs[c.over!]))error('TYPE_MISMATCH',`each cell "${c.id}" over "${c.over}" expected a list`);
    else if(c.kind==='each'&&(f.inputs[c.over!]as Json[]).length>c.max!)error('BUDGET_EXHAUSTED',`each cell "${c.id}" got ${(f.inputs[c.over!]as Json[]).length} items, maxItems ${c.max}`);
    else if(c.kind==='each'&&(f.inputs[c.over!]as Json[]).length===0){f.outputs=f.aggregate;f.phase='commit';}
    else f.phase='push';
   }action='execute';break;
  }
  case 'effect':{
   insist(c.kind==='agent','effect kind');
   const limit=(key:'maxContextBytes'|'maxOutputBytes')=>s.mutation==='widen-bytes'?(c.budget?.[key]??s.budget[key]):Math.min(c.budget?.[key]??s.budget[key],s.budget[key]);
   const context={inputs:f.inputs,turn:0},maxContext=limit('maxContextBytes');f.maxOutput=limit('maxOutputBytes');
   if(bytes(context)>maxContext){error('BUDGET_EXHAUSTED',`context view ${bytes(context)}B exceeds maxContextBytes ${maxContext}B`);action='context-limit';break;}
   if(s.work.agentCalls===s.budget.maxAgentCalls){error('BUDGET_EXHAUSTED','maxAgentCalls exhausted');action='call-limit';break;}
   f.request={contract:'algal.effect.v1',cellId:c.id,kind:'agent',prompt:c.prompt,context,output:{kind:'text'},budget:{maxContextBytes:maxContext,maxOutputBytes:f.maxOutput}};
   f.attempt++;s.work.agentCalls++;s.work.units+=500+bytes(context);f.phase='await';action='dispatch';break;
  }
  case 'await':{
   insist(response!==undefined,'effect response');
   if(response.kind==='poison'){s.outcome='journal-error';s.failure={code:response.code??'JOURNAL_INTEGRITY',message:response.message,path:at};action='poison';break;}
   const prior=s.effects.find(e=>canonical(e.request)===canonical(f.request!));
   const selected=s.mutation==='repeat-first-output'&&prior?prior.response:response;
   f.lastResponse=structuredClone(selected);f.effectOrdinal=s.effects.length;
   if(s.mutation==='collapse-effect'&&prior)f.effectOrdinal=prior.ordinal;
   else s.effects.push({ordinal:s.effects.length,path:at,request:f.request!,response:structuredClone(selected)});
   f.phase='bind';action='return-effect';break;
  }
  case 'bind':{
   insist(c.kind==='agent','binding kind');const result=f.lastResponse!;
   if(result.kind==='error')f.failure={code:result.code,message:result.message};
   else if(result.kind==='output'){
    if(bytes(result.value)>f.maxOutput)f.failure={code:'BUDGET_EXHAUSTED',message:`effect output ${bytes(result.value)}B exceeds maxOutputBytes ${f.maxOutput}B`};
    else{s.work.units+=bytes(result.value);if(typeof result.value!=='string')f.failure={code:'EFFECT_UNPARSEABLE',message:`cell "${c.id}": expected text output`};else{delete f.failure;f.outputs={out:result.value};}}
   }
   if(!f.failure)f.phase='commit';
   else if(f.attempt<c.attempts&&result.kind!=='poison'&&result.retryable!==false&&!(result.kind==='error'&&result.code==='EFFECT_SUSPENDED')){
    if(s.mutation==='refund-retry'){s.work.agentCalls--;s.work.units-=500+bytes((f.request as Values).context!);}
    f.phase='effect';delete f.failure;
   }else f.phase='settle';action='bind-output';break;
  }
  case 'commit':{
   const bad=Object.entries(f.outputs).find(([p,v])=>!Object.hasOwn(c.outputs,p)||portError(v,c.outputs[p]!)!==undefined);
   if(bad){error('TYPE_MISMATCH',Object.hasOwn(c.outputs,bad[0])?portError(bad[1],c.outputs[bad[0]]!)!:'undeclared output');action='output-reject';break;}
   const rec:CellRecord={status:'committed',work:s.work.units-f.before};if(Object.keys(f.outputs).length)rec.outputs=structuredClone(f.outputs);
   if(f.effectOrdinal!==undefined)rec.effectOrdinal=f.effectOrdinal;
   if(c.kind==='repeat'&&f.iteration>1)rec.rounds=f.iteration;
   if(c.kind==='each'&&f.iteration>0)rec.items=f.iteration;
   s.cells[at]=rec;f.resolved[c.id]='committed';f.phase='post';action='commit';break;
  }
  case 'settle':{
   insist(f.failure,'settle error');const suspended=f.failure.code==='EFFECT_SUSPENDED'&&s.mutation!=='suspend-failure';
   const rec:CellRecord={status:suspended?'suspended':'failed',work:s.work.units-f.before};if(!suspended)rec.failure={code:f.failure.code,message:f.failure.message};
   s.cells[at]=rec;f.resolved[c.id]=rec.status;
   if(suspended){f.suspended=true;f.outcome='suspended';f.phase='terminal';delete s.failure;}
   else if(f.program.edges.some(e=>e.from.cell===c.id&&e.on==='fail')){delete s.failure;delete f.failure;f.phase='post';}
   else failFrame(s,f,f.failure,at);
   action=suspended?'suspend':'fail';break;
  }
  case 'post':{
   if(s.work.units>s.budget.maxWork){failFrame(s,f,{code:'BUDGET_EXHAUSTED',message:'maxWork exhausted'},at);action='work-limit';}
   else{f.scan++;f.progress=true;f.phase='scan';action='post';}break;
  }
  case 'push':{
   insist(c.kind==='organism'||c.kind==='repeat'||c.kind==='each'||c.kind==='spawn','wrapper kind');
   const child=c.kind==='spawn'?f.spawned!.program:c.child;
   const suffix=c.kind==='organism'||c.kind==='spawn'?'':`/${c.kind==='repeat'?'r':'i'}${s.mutation==='reuse-path'?0:f.iteration}`;
   const childPath=s.mutation==='spawn-reuse-path'&&c.kind==='spawn'?path(f.prefix,'left'):at+suffix,depth=f.depth+1;
   if(depth>s.budget.maxDepth){s.failure??={code:'DEPTH_EXCEEDED',message:`depth ${depth} exceeds maxDepth ${s.budget.maxDepth}`,path:childPath};error('DEPTH_EXCEEDED',s.failure.message);action='depth-limit';break;}
   const supplied=c.kind==='spawn'?{...f.inputs.args as Values|undefined}:{...f.inputs,...(s.mutation==='drop-carry'?{}:f.carried)};
   if(c.kind==='each'){
    const item=(f.inputs[c.over!]as Json[])[f.iteration]!,target=c.child.interface.inputs[c.over!]!,decl=c.child.cells.find(x=>x.id===target.cell)!.outputs[target.port]!;
    const invalid=portError(item,decl);if(invalid){error('TYPE_MISMATCH',invalid);action='item-reject';break;}
    supplied[c.over!]=item;
   }
   const args:Record<string,Values>={};for(const [alias,t]of Object.entries(child.interface.inputs)){const v=supplied[alias];if(v!==undefined)(args[t.cell]??={})[t.port]=v;}
   f.phase='child';s.frames.push(frame(child,args,childPath,depth));
   if(s.mutation==='spawn-child-budget'&&c.kind==='spawn')s.budget=structuredClone(f.spawned!.budgets);
   if(s.mutation==='reset-budget')s.work={steps:0,agentCalls:0,units:0};action='push';break;
  }
  case 'terminal':{
   if(s.frames.length===1){s.outcome=f.outcome!;if(s.outcome==='complete'||s.outcome==='stuck'||s.outcome==='suspended')delete s.failure;action='finish';break;}
   const childOutputs=projected(f,s);s.frames.pop();const parent=s.frames.at(-1)!,wrapper=parent.program.cells[parent.current]!;
   insist(wrapper.kind==='organism'||wrapper.kind==='repeat'||wrapper.kind==='each'||wrapper.kind==='spawn','return wrapper');
   if(f.outcome!=='complete'){
    parent.failure=f.outcome==='suspended'?{code:'EFFECT_SUSPENDED',message:'inner run suspended'}:(s.failure?{code:s.failure.code,message:s.failure.message}:{code:'STUCK',message:'inner run stuck'});parent.phase='settle';
   }else{parent.lastChild=childOutputs;parent.phase='return';}
   action='pop';break;
  }
  case 'return':{
   insist(c.kind==='organism'||c.kind==='repeat'||c.kind==='each'||c.kind==='spawn','return continuation');
   f.iteration++;
   if(c.kind==='spawn'){f.outputs={data:f.lastChild,digest:s.mutation==='spawn-forge-digest'?'sha256:'+('0'.repeat(64)):f.spawned!.digest};f.phase='commit';break;}
   if(c.kind==='organism'){f.outputs=f.lastChild;f.phase='commit';break;}
   if(c.kind==='each')for(const [key,value]of Object.entries(f.lastChild))(f.aggregate[key]as Json[]).push(value);
   if(c.kind==='repeat')for(const [out,input]of Object.entries(c.carry??{})){const value=f.lastChild[out];if(value!==undefined)f.carried[input]=value;}
   const count=c.kind==='each'?(f.inputs[c.over!]as Json[]).length:c.max!;
   const until=c.kind==='repeat'&&c.until&&f.lastChild[c.until.output]!==undefined&&canonical(f.lastChild[c.until.output]!)===canonical(c.until.value);
   if(f.iteration<count&&!until)f.phase='push';else{f.outputs=c.kind==='each'?f.aggregate:f.lastChild;f.phase='commit';}action='child-result';break;
  }
  case 'child':throw new Error('oracle parent resumed without child return');
 }
 s.trace.push({action,path:at,units:s.work.units});
 insist(s.trace.length<=internalBounds(s.budget).transitions,'derived internal transition bound');return s;
}
export function execute(program:Program,args:Record<string,Values>,budget:Budget,tape:Tape=[],mutation:State['mutation']='none',catalog:SpawnSpec[]=[]):State{
 let state=start(program,args,budget,mutation,catalog),cursor=0;
 while(state.outcome==='running'){
  if(waiting(state)){const f=state.frames.at(-1)!,cell=f.program.cells[f.current]!;const next=tape[cursor++];if(!next||next.cell!==cell.id)throw new Error(`oracle tape occurrence ${cursor-1} mismatch for ${cell.id}`);state=step(state,next.response);}
  else state=step(state);
 }
 return state;
}
