import {spawnDefinition,type Budget,type Cell,type Program,type SpawnSpec,type State,type Tape} from './oracle';
export const DEFAULT:Budget={maxSteps:32,maxAgentCalls:8,maxWork:10000,maxDepth:2,maxContextBytes:65536,maxOutputBytes:65536};
export type Fixture={id:string;program:Program;args:Record<string,never>;budget:Budget;tape:Tape;catalog:SpawnSpec[]};
const spawn=(id:string):Cell=>({id,kind:'spawn',inputs:{manifest:{type:'json'},args:{type:'json',optional:true}},outputs:{data:{type:'json'},digest:{type:'text'}}});
export function fixtures():Fixture[]{
 const all:Fixture[]=[];
 function add(id:string,{two=false,budget={},attempts=1,childCalls=8,agentBudget,values=['A',...(two?['B']:[])]}:{two?:boolean;budget?:Partial<Budget>;attempts?:number;childCalls?:number;agentBudget?:SpawnSpec['agentBudget'];values?:(string|number)[]}={}){
  const spec:SpawnSpec={id:'leaf',prompt:'fixture',attempts,budgets:{...DEFAULT,maxAgentCalls:childCalls},...(agentBudget?{agentBudget}:{})};
  const definition=spawnDefinition(spec);
  const program:Program={cells:[{id:'definition',kind:'const',inputs:{},outputs:{manifest:{type:'json'}},values:{manifest:definition.manifest}},spawn('left'),...(two?[spawn('right')]:[])],edges:['left',...(two?['right']:[])].map(id=>({from:{cell:'definition',port:'manifest'},to:{cell:id,port:'manifest'}})),interface:{inputs:{},outputs:{}}};
  all.push({id,program,args:{},budget:{...DEFAULT,...budget},tape:values.map(value=>({cell:'leaf',response:{kind:'output',value}})),catalog:[spec]});
 }
 add('two-success',{two:true});add('calls-one',{two:true,budget:{maxAgentCalls:1}});add('steps-four',{two:true,budget:{maxSteps:4}});add('depth-zero',{two:true,budget:{maxDepth:0}});add('depth-one',{two:true,budget:{maxDepth:1}});
 add('retry-success',{attempts:2,values:[1,'A']});add('retry-calls-one',{attempts:2,values:[1,'A'],budget:{maxAgentCalls:1}});
 add('context-below',{budget:{maxContextBytes:21},agentBudget:{maxContextBytes:65536}});add('context-exact',{budget:{maxContextBytes:22},agentBudget:{maxContextBytes:65536}});add('cell-context-narrow',{agentBudget:{maxContextBytes:21}});
 add('output-below',{budget:{maxOutputBytes:2},agentBudget:{maxOutputBytes:65536}});add('output-exact',{budget:{maxOutputBytes:3},agentBudget:{maxOutputBytes:65536}});
 add('work-below',{budget:{maxWork:824}});add('work-exact',{budget:{maxWork:825}});
 add('child-zero',{budget:{maxAgentCalls:1},childCalls:0});add('child-widen',{two:true,budget:{maxAgentCalls:1},childCalls:64});
 const first:SpawnSpec={id:'first',prompt:'first',attempts:1,budgets:{...DEFAULT}},second:SpawnSpec={id:'second',prompt:'second',attempts:1,budgets:{...DEFAULT}};
 all.push({id:'data-selected-child',catalog:[first,second],budget:{...DEFAULT},args:{},tape:[{cell:'leaf',response:{kind:'output',value:'A'}},{cell:'leaf',response:{kind:'output',value:'B'}}],program:{cells:[...[first,second].map((spec,i):Cell=>({id:'definition'+i,kind:'const',inputs:{},outputs:{manifest:{type:'json'}},values:{manifest:spawnDefinition(spec).manifest}})),spawn('left'),spawn('right')],edges:[{from:{cell:'definition0',port:'manifest'},to:{cell:'left',port:'manifest'}},{from:{cell:'definition1',port:'manifest'},to:{cell:'right',port:'manifest'}}],interface:{inputs:{},outputs:{}}}});
 return all;
}
export function fixture(id:string):Fixture {const found=fixtures().find(f=>f.id===id);if(!found)throw new Error('unknown spawn fixture');return found;}
export type Mutation=State['mutation'];
