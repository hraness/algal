import {describe,expect,test} from 'bun:test';
import {canonical,execute,internalBounds,start,step,waiting,type State} from './oracle';
import {agent,constant,DEFAULT,fixtures,fn,graph,wire} from './fixtures';
const cases=fixtures();
const observed=new Map<string,State>();
const run=(id:string,mutation:State['mutation']='none')=>{const f=cases.find(x=>x.id===id)!;if(mutation==='none'&&observed.has(id))return observed.get(id)!;const result=execute(f.program,f.args,f.budget,f.tape,mutation);if(mutation==='none')observed.set(id,result);return result;};
describe('independent small-step fixture oracle',()=>{
 test('generated inventory is bounded, deterministic and has unique identities',()=>{
  expect(cases.length).toBe(89);expect(new Set(cases.map(f=>f.id)).size).toBe(cases.length);expect(cases).toEqual(fixtures());
  for(const f of cases){const result=run(f.id);expect(result.outcome).not.toBe('running');expect(result.trace.length).toBeLessThanOrEqual(internalBounds(f.budget).transitions);expect(result.work.units).toBeLessThanOrEqual(internalBounds(f.budget).work);}
 },120000);
 test('late producers do not repeat charged guards and edge order controls fan-in',()=>{
  for(const f of cases.filter(f=>f.id.startsWith('fanin-')&&f.id.endsWith('-1'))){const r=execute(f.program,f.args,f.budget,f.tape);expect(r.work).toEqual({steps:3,agentCalls:0,units:312});expect(Object.values(r.guardCounts)).toEqual([1,1]);expect(r.cells.join?.outputs?.value).toBe(f.id.split('-')[2]==='1'?'blue\nred':'red\nblue');}
  expect(run('fanin-many-flatten').cells.join?.outputs?.value).toBe('red\nred\nblue');
 });
 test('false guards skip without activation; malformed guard preserves producer prefix',()=>{
  const skipped=run('fanin-0-0-0');expect(skipped.work).toEqual({steps:2,agentCalls:0,units:202});expect(skipped.cells.join).toEqual({status:'skipped',work:0});
  const bad=run('guard-invalid-delayed');expect(bad.failure?.code).toBe('GUARD_INVALID');expect(bad.cells.join).toBeUndefined();expect(bad.work.units).toBe(201);expect(bad.work.steps).toBe(2);
 });
 test('guard failure precedence and check before another guard',()=>{
  expect(run('guard-invalid-priority').failure?.code).toBe('GUARD_INVALID');const work=run('guard-fuel-before-next-guard');expect(work.failure?.code).toBe('BUDGET_EXHAUSTED');expect(Object.values(work.guardCounts)).toEqual([1]);
 });
 test('all-empty optional, optional-many, and required inputs skip',()=>{
  for(const id of ['optional-all-empty','optional-many-all-empty','required-empty']){const r=run(id);expect(r.outcome).toBe('complete');expect(r.work.steps).toBe(id==='optional-many-all-empty'?2:1);expect(Object.values(r.cells).filter(c=>c.status==='skipped').length).toBe(1);expect(r.effects).toHaveLength(0);}
 });
 test('failed pure call keeps cost, original unhandled error and handled work check',()=>{
  const caught=run('handled-function-failure');expect(caught.outcome).toBe('complete');expect(caught.work.units).toBe(315);expect(caught.cells.fallback?.outputs?.value).toEqual({code:'FN_FAILED',message:'inc.v1: value must be a finite number'});
  const bounded=run('handled-work-exhausted');expect(bounded.failure?.code).toBe('BUDGET_EXHAUSTED');expect(bounded.cells.fallback).toBeUndefined();expect(bounded.work.units).toBe(205);
  expect(run('unhandled-original-error').failure?.code).toBe('FN_FAILED');
 });
 test('input admission is charged before callback and produces no effect',()=>{const r=run('input-schema-charged');expect(r.work).toEqual({steps:2,agentCalls:0,units:200});expect(r.cells.agent?.status).toBe('failed');expect(r.failure?.code).toBe('TYPE_MISMATCH');});
 test('step refusal does not record or charge a later cell',()=>{const r=run('step-boundary-1');expect(r.work).toEqual({steps:1,agentCalls:0,units:100});expect(r.cells.first).toBeUndefined();expect(r.failure?.path).toBe('first');});
 test('identical retry requests occupy two positions and failed binding remains charged',()=>{
  const r=run('retry-2-calls-2');expect(r.outcome).toBe('complete');expect(r.work).toEqual({steps:1,agentCalls:2,units:1149});expect(r.effects.map(e=>e.ordinal)).toEqual([0,1]);expect(r.effects[0]?.request).toEqual(r.effects[1]?.request);expect(r.effects[0]?.response).not.toEqual(r.effects[1]?.response);
  const limited=run('retry-2-calls-1');expect(limited.failure?.code).toBe('BUDGET_EXHAUSTED');expect(limited.work.units).toBe(623);
 });
 test('await has no autonomous completion, and transitions do not mutate earlier states',()=>{
  let r=start(graph([agent('a')],[]),{},DEFAULT);while(!waiting(r))r=step(r);const before=structuredClone(r);expect(step(r)).toBe(r);const next=step(r,{kind:'output',value:'ok'});expect(r).toEqual(before);expect(next.effects.length).toBe(1);expect(next.work.units).toBe(622);expect(()=>step(next,{kind:'output',value:'bad'})).toThrow('without dispatch');
 });
 test('work equality succeeds; overrun is detected after committed cell',()=>{expect(run('effect-work-equality').outcome).toBe('complete');const r=run('effect-work-overrun');expect(r.outcome).toBe('failed');expect(r.cells.agent?.status).toBe('committed');expect(r.work.units).toBe(626);});
 test('root bytes constrain a wider cell budget and output refusal is not byte-charged',()=>{
  const ctx=run('bytes-maxContextBytes-widen');expect(ctx.work).toEqual({steps:1,agentCalls:0,units:100});expect(ctx.effects).toHaveLength(0);
  const out=run('bytes-maxOutputBytes-widen');expect(out.work).toEqual({steps:1,agentCalls:1,units:622});expect(out.cells.agent?.status).toBe('failed');expect(out.effects).toHaveLength(1);
 });
 test('repeat carries and each aggregates with unique full paths',()=>{
  const repeat=run('nested-repeat');expect(repeat.cells.wrap?.outputs?.value).toBe(2);expect(repeat.cells.wrap?.rounds).toBe(2);expect(repeat.cells['wrap/r1/in']?.outputs?.value).toBe(1);expect(repeat.cells.wrap?.work).toBe(510);expect(repeat.work.units).toBe(610);
  const each=run('nested-each');expect(each.cells.wrap?.outputs?.value).toEqual([1,2]);expect(each.cells.wrap?.items).toBe(2);expect(each.cells['wrap/i1/in']?.outputs?.value).toBe(1);
  expect(run('repeat-until').cells.wrap?.rounds).toBeUndefined();const empty=run('each-empty');expect(empty.cells.wrap?.outputs?.value).toEqual([]);expect(Object.keys(empty.cells)).toEqual(['in','wrap']);
 });
 test('nested steps/calls are shared and depth refusal preserves child boundary',()=>{
  const r=run('nested-organism-depth-refusal');expect(r.work.steps).toBe(2);expect(r.failure?.path).toBe('wrap');expect(r.cells['wrap/in']).toBeUndefined();
  expect(run('nested-repeat-steps-shared').work.steps).toBe(3);expect(run('repeat-calls-shared-3').work.agentCalls).toBe(3);expect(run('repeat-calls-shared-3').failure?.code).toBe('BUDGET_EXHAUSTED');expect(run('repeat-calls-shared-4').outcome).toBe('complete');
 });
 test('suspension and poison do not route to guest fallback',()=>{
  const p=graph([agent('a'),fn('fallback','echo')],[wire('a','out','fallback','value',{on:'fail'})]);
  const suspended=execute(p,{},DEFAULT,[{cell:'a',response:{kind:'error',code:'EFFECT_SUSPENDED',message:'later'}}]);expect(suspended.outcome).toBe('suspended');expect(suspended.cells.fallback).toBeUndefined();
  const mutated=execute(p,{},DEFAULT,[{cell:'a',response:{kind:'error',code:'EFFECT_SUSPENDED',message:'later'}}],'suspend-failure');expect(mutated.outcome).toBe('complete');expect(mutated.cells.fallback?.status).toBe('committed');
  const poisoned=execute(p,{},DEFAULT,[{cell:'a',response:{kind:'poison',message:'unknown completion'}}]);expect(poisoned.outcome).toBe('journal-error');expect(poisoned.cells.a).toBeUndefined();expect(poisoned.cells.fallback).toBeUndefined();expect(poisoned.effects).toHaveLength(0);
 });
 test('transition mutations break meaningful fixture observations',()=>{
  expect(run('fanin-0-0-1','reverse-edges').cells.join?.outputs).not.toEqual(run('fanin-0-0-1').cells.join?.outputs);
  expect(run('nested-repeat','drop-carry').cells.wrap?.outputs?.value).toBe(1);
  expect(run('nested-repeat','reuse-path').cells['wrap/r1/in']).toBeUndefined();
  expect(run('nested-organism','reset-budget').work).not.toEqual(run('nested-organism').work);
  expect(run('retry-2-calls-1','refund-retry').outcome).toBe('complete');
  expect(run('bytes-maxContextBytes-widen','widen-bytes').outcome).toBe('complete');
 });
 test('maximum step/call/depth/round/item boundaries preserve shared ledgers',()=>{
  expect(run('maximum-steps-exact-1024').outcome).toBe('complete');expect(run('maximum-steps-exact-1024').work.steps).toBe(1024);expect(run('maximum-steps-refuse-1025').work.steps).toBe(1024);expect(run('maximum-steps-refuse-1025').cells.later).toBeUndefined();expect(run('maximum-each-refuse-64-at-63').failure?.code).toBe('BUDGET_EXHAUSTED');
  const at=run('maximum-steps-57');expect(at.work.steps).toBe(1024);expect(at.failure?.code).toBe('BUDGET_EXHAUSTED');
  expect(run('maximum-steps-56').outcome).toBe('complete');
  expect(run('maximum-calls-exact-64').work.agentCalls).toBe(64);expect(run('maximum-calls-exact-64').outcome).toBe('complete');
  const refused=run('maximum-calls-refuse-65');expect(refused.work.agentCalls).toBe(64);expect(refused.effects).toHaveLength(64);expect(refused.failure?.code).toBe('BUDGET_EXHAUSTED');
  expect(run('maximum-repeat-sixteen').cells.repeat?.rounds).toBe(16);expect(run('maximum-each-64').cells.each?.items).toBe(64);
  expect(run('maximum-depth-8-bound-8').outcome).toBe('complete');expect(run('maximum-depth-8-bound-7').failure?.code).toBe('DEPTH_EXCEEDED');
 },120000);
 test('canonical index ordering and unsupported interface/output contracts reject',()=>{
  expect(canonical({'10':0,'2':0,'4294967294':0,'4294967295':0,'00':0,a:0})).toBe('{"2":0,"10":0,"4294967294":0,"00":0,"4294967295":0,"a":0}');
  for(const flag of ['optional','many']as const){const a=agent('a');a.outputs.out![flag]=true;expect(()=>start(graph([a],[]),{},DEFAULT)).toThrow('exact text output');}
  const child=graph([constant('a',{value:0},{value:{type:'json'}})],[],{inputs:{},outputs:{first:{cell:'a',port:'value'},second:{cell:'a',port:'value'}}});
  expect(()=>start(child,{},DEFAULT)).toThrow('ambiguous interface aliases');
  const broken=structuredClone(cases.find(f=>f.id==='nested-repeat')!.program);broken.cells[1]!.inputs.v={type:'text'};expect(()=>start(broken,{},DEFAULT)).toThrow('wrapper interface signature');
 });
 test('admission rejects unknown keys, cycles, unsafe numbers and oversized IR',()=>{
  const p=graph([constant('a',{value:'red'},{value:{type:'json'}}),fn('echo','echo')],[wire('a','value','echo','value')]);
  expect(()=>start({...p,hidden:true},{},DEFAULT)).toThrow('unknown');
  expect(()=>start(graph([fn('a','echo'),fn('b','echo')],[wire('a','value','b','value'),wire('b','value','a','value')]),{},DEFAULT)).toThrow('cycle');
  expect(()=>start(p,{a:{value:NaN}},DEFAULT)).toThrow('integer');expect(()=>start(p,{}, {...DEFAULT,maxSteps:1025})).toThrow('steps');
  expect(()=>start(graph([constant('constructor',{value:0},{value:{type:'json'}})],[]),{},DEFAULT)).toThrow('name');
  expect(canonical({b:1,a:['red',false]})).toBe('{"a":["red",false],"b":1}');
 });
});
