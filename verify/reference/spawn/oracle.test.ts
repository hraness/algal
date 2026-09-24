import {test,expect} from 'bun:test';
import {canonical,execute,spawnDefinition,start,type State,type Values} from './oracle';
import {fixtures,fixture,type Mutation,DEFAULT} from './fixtures';
const run=(id:string,mutation:Mutation='none')=>{const f=fixture(id);return execute(f.program,f.args,f.budget,f.tape,mutation,f.catalog);};
const failure=(s:State,path:string)=>{expect(s.outcome).toBe('failed');expect(s.failure?.code).toBe('BUDGET_EXHAUSTED');expect(s.failure?.path).toBe(path);};
test('two dynamic occurrences retain equal request identities and distinct results/paths',()=>{
 const s=run('two-success');expect(s.outcome).toBe('complete');expect(s.work).toEqual({steps:5,agentCalls:2,units:1550});
 expect(s.effects).toHaveLength(2);expect(canonical(s.effects[0]!.request)).toBe(canonical(s.effects[1]!.request));expect(s.effects.map(e=>[e.ordinal,e.path,e.response])).toEqual([[0,'left/leaf',{kind:'output',value:'A'}],[1,'right/leaf',{kind:'output',value:'B'}]]);
 for(const [path,value]of [['left','A'],['right','B']] as const){expect(s.cells[path!]?.work).toBe(725);expect(s.cells[path!+'/leaf']?.work).toBe(625);expect(s.cells[path!]?.outputs).toEqual({data:{out:value},digest:spawnDefinition(fixture('two-success').catalog[0]).digest});}
});
test('root call and step refusals preserve exact charged prefix and failure location',()=>{
 const calls=run('calls-one');failure(calls,'right/leaf');expect(calls.work).toEqual({steps:5,agentCalls:1,units:1025});expect(calls.effects).toHaveLength(1);expect(calls.cells['right/leaf']?.work).toBe(100);expect(calls.cells.right?.work).toBe(200);
 const steps=run('steps-four');failure(steps,'right/leaf');expect(steps.work).toEqual({steps:4,agentCalls:1,units:925});expect(steps.cells['right/leaf']).toBeUndefined();expect(steps.cells.right?.work).toBe(100);
});
test('dynamic depth boundary is charged at the wrapper without entering a child',()=>{
 const no=run('depth-zero');expect(no.outcome).toBe('failed');expect(no.failure).toMatchObject({code:'DEPTH_EXCEEDED',path:'left'});expect(no.work).toEqual({steps:2,agentCalls:0,units:200});expect(no.cells['left/leaf']).toBeUndefined();expect(no.effects).toHaveLength(0);
 expect(run('depth-one').work).toEqual({steps:5,agentCalls:2,units:1550});expect(run('depth-one').outcome).toBe('complete');
});
test('invalid outputs retain attempt occurrence and all retry charges',()=>{
 const yes=run('retry-success');expect(yes.outcome).toBe('complete');expect(yes.work).toEqual({steps:3,agentCalls:2,units:1348});expect(yes.cells['left/leaf']?.work).toBe(1148);expect(yes.cells.left?.work).toBe(1248);expect(yes.effects.map(e=>e.response)).toEqual([{kind:'output',value:1},{kind:'output',value:'A'}]);expect(canonical(yes.effects[0]!.request)).toBe(canonical(yes.effects[1]!.request));
 const no=run('retry-calls-one');failure(no,'left/leaf');expect(no.work).toEqual({steps:3,agentCalls:1,units:823});expect(no.effects).toHaveLength(1);
});
test('spawn agent byte bounds clamp to root and charge only admitted output bytes',()=>{
 for(const id of ['context-below','cell-context-narrow']){const s=run(id);failure(s,'left/leaf');expect(s.work).toEqual({steps:3,agentCalls:0,units:300});expect(s.effects).toHaveLength(0);}
 const context=run('context-exact');expect(context.outcome).toBe('complete');expect(context.work.units).toBe(825);expect(((context.effects[0]!.request as Values).budget as Values).maxContextBytes).toBe(22);
 const output=run('output-below');failure(output,'left/leaf');expect(output.work).toEqual({steps:3,agentCalls:1,units:822});expect(output.effects[0]!.response).toEqual({kind:'output',value:'A'});expect(((output.effects[0]!.request as Values).budget as Values).maxOutputBytes).toBe(2);
 const exact=run('output-exact');expect(exact.outcome).toBe('complete');expect(exact.work.units).toBe(825);expect(((exact.effects[0]!.request as Values).budget as Values).maxOutputBytes).toBe(3);
});
test('maxWork is checked after leaf commit and nested return preserves that evidence',()=>{
 const no=run('work-below');failure(no,'left/leaf');expect(no.work).toEqual({steps:3,agentCalls:1,units:825});expect(no.cells['left/leaf']?.status).toBe('committed');expect(no.cells.left?.status).toBe('failed');expect(no.effects).toHaveLength(1);
 const yes=run('work-exact');expect(yes.outcome).toBe('complete');expect(yes.work.units).toBe(825);
});
test('child declaration cannot replace or narrow the root ledger',()=>{
 expect(run('child-zero').outcome).toBe('complete');expect(run('child-zero').work).toEqual({steps:3,agentCalls:1,units:825});const widened=run('child-widen');failure(widened,'right/leaf');expect(widened.work).toEqual({steps:5,agentCalls:1,units:1025});
});
test('dynamic wire data selects the prescribed child and changes its two identities',()=>{
 const s=run('data-selected-child');expect(s.outcome).toBe('complete');expect(s.work).toEqual({steps:6,agentCalls:2,units:1650});expect((s.effects[0]!.request as Values).prompt).toBe('first');expect((s.effects[1]!.request as Values).prompt).toBe('second');expect(s.cells.left?.outputs?.digest).not.toBe(s.cells.right?.outputs?.digest);expect(canonical(s.effects[0]!.request)).not.toBe(canonical(s.effects[1]!.request));
});
test('eight executable transition mutants break reached semantic predicates',()=>{
 expect(run('two-success','reset-budget').work).not.toEqual({steps:5,agentCalls:2,units:1550});
 expect(run('two-success','collapse-effect').effects).toHaveLength(1);
 expect(run('two-success','repeat-first-output').cells['right/leaf']?.outputs).toEqual({out:'A'});
 expect(run('two-success','spawn-reuse-path').cells['right/leaf']).toBeUndefined();
 expect(run('child-zero','spawn-child-budget').outcome).toBe('failed');
 expect(run('two-success','spawn-forge-digest').cells.left?.outputs?.digest).toBe('sha256:'+'0'.repeat(64));
 expect(run('retry-calls-one','refund-retry').outcome).toBe('complete');
 expect(run('context-below','widen-bytes').outcome).toBe('complete');
});
test('finite corpus and independent catalog admission fail closed',()=>{
 const all=fixtures();expect(all).toHaveLength(17);expect(new Set(all.map(f=>f.id)).size).toBe(17);
 for(const f of all){expect(JSON.stringify(f).length).toBeLessThan(16384);expect(execute(f.program,f.args,f.budget,f.tape,'none',f.catalog).outcome).not.toBe('running');}
 const f=fixture('two-success');expect(()=>start(f.program,f.args,f.budget,'none',[...f.catalog,...f.catalog,...f.catalog])).toThrow('catalog bound');expect(()=>start(f.program,f.args,f.budget,'none',[...f.catalog,...f.catalog])).toThrow('duplicate');
 expect(()=>spawnDefinition({...f.catalog[0],hidden:true})).toThrow('unknown');expect(()=>spawnDefinition({...f.catalog[0],prompt:'x'.repeat(129)})).toThrow('prompt');expect(()=>spawnDefinition({...f.catalog[0],budgets:{...DEFAULT,maxAgentCalls:65}})).toThrow('calls');
 const unsupported=structuredClone(f.program);const source=unsupported.cells[0];if(source?.kind!=='const')throw Error('fixture');source.values.manifest={contract:'unmodeled'};expect(()=>execute(unsupported,{},f.budget,f.tape,'none',f.catalog)).toThrow('unsupported dynamic manifest');
 expect(()=>execute(f.program,{},f.budget,[],'none',f.catalog)).toThrow('tape occurrence');
});
