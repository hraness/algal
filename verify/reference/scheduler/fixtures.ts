import type {Budget,Cell,Edge,Json,Ports,Program,Tape,Values} from './oracle';
export type Fixture={id:string;program:Program;args:Record<string,Values>;budget:Budget;tape:Tape;knownByteDefect?:true};
export const DEFAULT:Budget={maxSteps:32,maxAgentCalls:8,maxWork:10000,maxDepth:2,maxContextBytes:65536,maxOutputBytes:65536};
const empty={inputs:{},outputs:{}};
export const graph=(cells:Cell[],edges:Edge[],iface:Program['interface']=empty):Program=>({cells,edges,interface:iface});
export const wire=(a:string,ap:string,b:string,bp:string,extra:Partial<Edge>={}):Edge=>({from:{cell:a,port:ap},to:{cell:b,port:bp},...extra});
export const constant=(id:string,values:Values,outputs:Ports):Cell=>({id,kind:'const',inputs:{},outputs,values});
export const fn=(id:string,op:'echo'|'inc'|'join'|'coalesce'):Cell=>({id,kind:'fn',op,
 inputs:op==='join'?{items:{type:'text',many:true},sep:{type:'text',optional:true}}:op==='coalesce'?{a:{type:'json',optional:true},b:{type:'json',optional:true},c:{type:'json',optional:true}}:{value:{type:'json'}},
 outputs:{value:{type:op==='join'?'text':'json'}}});
export const agent=(id:string,inputs:Ports={},attempts=1):Cell=>({id,kind:'agent',inputs,outputs:{out:{type:'text'}},prompt:'fixture',attempts});
function permutations<T>(xs:T[]):T[][]{if(xs.length===0)return [[]];return xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>i!==j)).map(rest=>[x,...rest]));}
export function fixtures():Fixture[]{
 const all:Fixture[]=[];
 const add=(id:string,program:Program,options:Partial<Omit<Fixture,'id'|'program'>>={})=>all.push({id,program,args:{},budget:{...DEFAULT},tape:[],...options});
 const producers=[constant('red',{value:'red'},{value:{type:'text'}}),constant('blue',{value:'blue'},{value:{type:'text'}})];
 // Six declaration orders, two edge orders, and both guarded outcomes.
 for(const [order,cells]of permutations([...producers,fn('join','join')]).entries())for(const reverse of [false,true])for(const accept of [false,true]){
  const edges=(reverse?[...producers].reverse():producers).map(c=>wire(c.id,'value','join','items',{guard:{kind:'literal',value:accept}}));
  add(`fanin-${order}-${Number(reverse)}-${Number(accept)}`,graph(cells,edges));
 }
 const textChild=graph([{id:'item',kind:'input',inputs:{},outputs:{value:{type:'text'}}}],[],{inputs:{v:{cell:'item',port:'value'}},outputs:{value:{cell:'item',port:'value'}}});
 const textEach:Cell={id:'many',kind:'each',inputs:{v:{type:'json'}},outputs:{value:{type:'text',many:true}},child:textChild,max:2,over:'v'};
 add('fanin-many-flatten',graph([constant('list',{value:['red','blue']},{value:{type:'json'}}),textEach,fn('join','join'),constant('last',{value:'red'},{value:{type:'text'}})],
  [wire('last','value','join','items'),wire('many','value','join','items'),wire('list','value','many','v')]));
 add('guard-invalid-delayed',graph([producers[0]!,fn('join','join'),producers[1]!],[wire('blue','value','join','items',{guard:{kind:'literal',value:1}}),wire('red','value','join','items')]));
 add('guard-fuel-before-next-guard',graph(producers.concat(fn('join','join')),[wire('red','value','join','items',{guard:{kind:'literal',value:true}}),wire('blue','value','join','items',{guard:{kind:'literal',value:true}})]),{budget:{...DEFAULT,maxWork:200}});
 add('guard-invalid-priority',graph(producers.concat(fn('join','join')),[wire('red','value','join','items',{guard:{kind:'literal',value:1}}),wire('blue','value','join','items')]),{budget:{...DEFAULT,maxWork:200}});
 add('optional-all-empty',graph([{id:'in',kind:'input',inputs:{},outputs:{value:{type:'json',optional:true}}},fn('coalesce','coalesce')],[wire('in','value','coalesce','a')]));
 add('optional-many-all-empty',graph([constant('list',{value:[]},{value:{type:'json'}}),textEach,agent('agent',{items:{type:'text',many:true,optional:true}})],[wire('list','value','many','v'),wire('many','value','agent','items')]));
 add('required-empty',graph([{id:'in',kind:'input',inputs:{},outputs:{value:{type:'json',optional:true}}},fn('echo','echo')],[wire('in','value','echo','value')]));
 const failure=graph([constant('in',{value:'red'},{value:{type:'json'}}),fn('inc','inc'),fn('fallback','echo')],[wire('in','value','inc','value'),wire('inc','value','fallback','value',{on:'fail'})]);
 add('handled-function-failure',failure);
 add('handled-work-exhausted',failure,{budget:{...DEFAULT,maxWork:200}});
 add('unhandled-original-error',graph(failure.cells.slice(0,2),failure.edges.slice(0,1)),{budget:{...DEFAULT,maxWork:200}});
 add('input-schema-charged',graph([constant('in',{value:'red'},{value:{type:'json'}}),agent('agent',{value:{type:'json',schemaType:'integer'}})],[wire('in','value','agent','value')]));
 for(const maxSteps of [1,2,3])add(`step-boundary-${maxSteps}`,graph([constant('in',{value:0},{value:{type:'json'}}),fn('first','inc'),fn('last','inc')],[wire('in','value','first','value'),wire('first','value','last','value')]),{budget:{...DEFAULT,maxSteps}});
 for(const attempts of [1,2])for(const maxAgentCalls of [0,1,2])add(`retry-${attempts}-calls-${maxAgentCalls}`,graph([agent('agent',{},attempts)],[]),{budget:{...DEFAULT,maxAgentCalls},tape:[{cell:'agent',response:{kind:'output',value:1}},{cell:'agent',response:{kind:'output',value:'ok'}}]});
 add('effect-work-equality',graph([agent('agent')],[]),{budget:{...DEFAULT,maxWork:626},tape:[{cell:'agent',response:{kind:'output',value:'ok'}}]});
 add('effect-work-overrun',graph([agent('agent')],[]),{budget:{...DEFAULT,maxWork:625},tape:[{cell:'agent',response:{kind:'output',value:'ok'}}]});
 for(const boundary of ['maxContextBytes','maxOutputBytes']as const)for(const mode of ['default','narrow','equal','widen']as const){
  const cell=agent('agent');if(cell.kind!=='agent')throw Error('fixture');
  if(mode!=='default')cell.budget={[boundary]:mode==='widen'?65536:1};
  add(`bytes-${boundary}-${mode}`,graph([cell],[]),{budget:{...DEFAULT,[boundary]:mode==='narrow'?65536:1},tape:[{cell:'agent',response:{kind:'output',value:'ok'}}],...(mode==='widen'?{knownByteDefect:true}:{})});
 }
 const inner=graph([{id:'in',kind:'input',inputs:{},outputs:{value:{type:'json'}}},fn('inc','inc')],[wire('in','value','inc','value')],{inputs:{v:{cell:'in',port:'value'}},outputs:{value:{cell:'inc',port:'value'}}});
 const wrap=(kind:'organism'|'repeat'|'each',max=2):Cell=>({id:'wrap',kind,inputs:{v:{type:'json',...(kind==='repeat'?{optional:true}:{})}},outputs:{value:{type:'json',...(kind==='each'?{many:true}:{})}},child:inner,...(kind==='repeat'?{max,carry:{value:'v'}}:{}),...(kind==='each'?{max,over:'v'}:{})});
 for(const kind of ['organism','repeat','each']as const){
  const source=constant('in',{value:kind==='each'?[0,1]:0},{value:{type:'json'}});
  add(`nested-${kind}`,graph([source,wrap(kind)],[wire('in','value','wrap','v')]));
  add(`nested-${kind}-depth-refusal`,graph([source,wrap(kind)],[wire('in','value','wrap','v')]),{budget:{...DEFAULT,maxDepth:0}});
  add(`nested-${kind}-steps-shared`,graph([source,wrap(kind)],[wire('in','value','wrap','v')]),{budget:{...DEFAULT,maxSteps:3}});
 }
 const untilChild=graph([constant('leaf',{value:'blue'},{value:{type:'text'}})],[],{inputs:{},outputs:{value:{cell:'leaf',port:'value'}}});
 add('repeat-until',graph([{id:'wrap',kind:'repeat',inputs:{},outputs:{value:{type:'text'}},child:untilChild,max:2,until:{output:'value',value:'blue'}}],[]));
 // Empty each receives a scalar JSON array, so the wrapper activates rather
 // than being skipped by an empty many producer.
 const emptyEach=wrap('each');emptyEach.inputs.v={type:'json'};
 add('each-empty',graph([constant('in',{value:[]},{value:{type:'json'}}),emptyEach],[wire('in','value','wrap','v')]));
 const nestedAgent=graph([agent('leaf',{},2)],[],{inputs:{},outputs:{value:{cell:'leaf',port:'out'}}});
 for(const maxCalls of [1,2,3,4])add(`repeat-calls-shared-${maxCalls}`,graph([{id:'wrap',kind:'repeat',inputs:{},outputs:{value:{type:'text'}},child:nestedAgent,max:2}],[]),{budget:{...DEFAULT,maxAgentCalls:maxCalls},tape:[1,'ok',1,'done'].map(value=>({cell:'leaf',response:{kind:'output',value} as const}))});
 // A no-input wrapper family for two-depth work overshoot and unwind.
 const leaf=graph([agent('leaf')],[],{inputs:{},outputs:{value:{cell:'leaf',port:'out'}}});
 const middle=graph([{id:'middle',kind:'organism',inputs:{},outputs:{value:{type:'text'}},child:leaf}],[],{inputs:{},outputs:{value:{cell:'middle',port:'value'}}});
 for(const maxWork of [1,826,926])add(`two-depth-work-${maxWork}`,graph([{id:'outer',kind:'organism',inputs:{},outputs:{value:{type:'text'}},child:middle}],[]),{budget:{...DEFAULT,maxWork},tape:[{cell:'leaf',response:{kind:'output',value:'ok'}}]});

 // Maximum admitted root and wrapper boundaries, with immediately adjacent
 // refusals reached by execution rather than rejected fixture budgets.
 const leafUnit=graph([constant('unit',{value:0},{value:{type:'json'}})],[],{inputs:{},outputs:{value:{cell:'unit',port:'value'}}});
 const repeatUnit:Cell={id:'repeat',kind:'repeat',inputs:{},outputs:{value:{type:'json'}},child:leafUnit,max:16};
 add('maximum-repeat-sixteen',graph([repeatUnit],[]),{budget:{...DEFAULT,maxSteps:1024,maxWork:1000000}});
 const inputLeaf=graph([{id:'item',kind:'input',inputs:{},outputs:{value:{type:'json'}}}],[],{inputs:{v:{cell:'item',port:'value'}},outputs:{value:{cell:'item',port:'value'}}});
 const eachUnit:Cell={id:'each',kind:'each',inputs:{v:{type:'json'}},outputs:{value:{type:'json',many:true}},child:inputLeaf,max:64,over:'v'};
 for(const n of [1,63,64])add(`maximum-each-${n}`,graph([constant('list',{value:Array.from({length:n},(_,i)=>i)},{value:{type:'json'}}),eachUnit],[wire('list','value','each','v')]),{budget:{...DEFAULT,maxSteps:1024,maxWork:1000000}});
 const innerMany=graph([repeatUnit],[],{inputs:{},outputs:{value:{cell:'repeat',port:'value'}}});
 const repeatedMany:Cell={id:'each',kind:'each',inputs:{v:{type:'json'}},outputs:{value:{type:'json',many:true}},child:{...innerMany,cells:[{id:'item',kind:'input',inputs:{},outputs:{value:{type:'json'}}},repeatUnit],interface:{inputs:{v:{cell:'item',port:'value'}},outputs:innerMany.interface.outputs}},max:64,over:'v'};
 for(const n of [56,57,64])add(`maximum-steps-${n}`,graph([constant('list',{value:Array.from({length:n},()=>0)},{value:{type:'json'}}),repeatedMany],[wire('list','value','each','v')]),{budget:{...DEFAULT,maxSteps:1024,maxDepth:8,maxWork:1000000}});
 const agentInput=graph([{id:'item',kind:'input',inputs:{},outputs:{value:{type:'json'}}},agent('leaf')],[],{inputs:{v:{cell:'item',port:'value'}},outputs:{value:{cell:'leaf',port:'out'}}});
 const eachAgent:Cell={id:'each',kind:'each',inputs:{v:{type:'json'}},outputs:{value:{type:'text',many:true}},child:agentInput,max:64,over:'v'};
 for(const extra of [false,true])add(`maximum-calls-${extra?'refuse-65':'exact-64'}`,graph([constant('list',{value:Array.from({length:64},()=>0)},{value:{type:'json'}}),eachAgent,...(extra?[agent('later')]:[])],[wire('list','value','each','v')]),{budget:{...DEFAULT,maxSteps:1024,maxAgentCalls:64,maxWork:1000000},tape:Array.from({length:64},()=>({cell:'leaf',response:{kind:'output',value:'ok'} as const}))});
 let deep=leafUnit;
 for(let depth=1;depth<=8;depth++){
  deep=graph([{id:'wrap',kind:'organism',inputs:{},outputs:{value:{type:'json'}},child:deep}],[],{inputs:{},outputs:{value:{cell:'wrap',port:'value'}}});
  if(depth>=7)for(const maximum of [7,8])add(`maximum-depth-${depth}-bound-${maximum}`,deep,{budget:{...DEFAULT,maxDepth:maximum,maxWork:1000000}});
 }
 const block=graph(Array.from({length:4},(_,i)=>constant('unit'+i,{value:0},{value:{type:'json'}})),[]);
 const count68=graph([constant('one',{value:0},{value:{type:'json'}}),constant('two',{value:0},{value:{type:'json'}}),constant('three',{value:0},{value:{type:'json'}}),{id:'sixteen',kind:'repeat',inputs:{},outputs:{},child:block,max:16}],[]);
 const fifteen:Cell={id:'fifteen',kind:'repeat',inputs:{},outputs:{},child:count68,max:15};
 for(const extra of [false,true])add(`maximum-steps-${extra?'refuse-1025':'exact-1024'}`,graph([constant('one',{value:0},{value:{type:'json'}}),constant('two',{value:0},{value:{type:'json'}}),constant('three',{value:0},{value:{type:'json'}}),fifteen,...(extra?[constant('later',{value:0},{value:{type:'json'}})]:[])],[]),{budget:{...DEFAULT,maxSteps:1024,maxDepth:8,maxWork:1000000}});
 add('maximum-each-refuse-64-at-63',graph([constant('list',{value:Array.from({length:64},(_,i)=>i)},{value:{type:'json'}}),{...eachUnit,max:63}],[wire('list','value','each','v')]),{budget:{...DEFAULT,maxSteps:1024,maxWork:1000000}});
 const indexObject:Json={'10':'ten','2':'two','4294967294':'last-index','4294967295':'non-index','00':'not-index',a:'a'};
 add('canonical-numeric-index-keys',graph([constant('input',{value:indexObject},{value:{type:'json'}}),agent('agent',{value:{type:'json'}})],[wire('input','value','agent','value')]),{tape:[{cell:'agent',response:{kind:'output',value:'ok'}}]});
 return all;
}

