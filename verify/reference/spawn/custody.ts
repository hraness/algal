import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {hashBytes,readFileBounded,stableJson} from '../../lib/files';
import {requireSuccess,type CommandResult} from '../../lib/runner';
export const LIMITS={fileBytes:262144,commandBytes:262144,commandMs:30000,archiveBytes:16777216,archiveFiles:512,workerBytes:2097152,workerFiles:8} as const;
export function insist(ok:unknown,what:string):asserts ok {if(!ok)throw new Error(what);}
/** Exact JSON UTF-8 size before the serializer can allocate its encoded result. */
export function jsonBytes(value:unknown,max:number=LIMITS.fileBytes):number{
 let size=0,nodes=0;const active=new Set<object>();
 const add=(n:number)=>{size+=n;insist(size<=max,'JSON byte bound');};
 const string=(s:string)=>{add(2);for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c===34||c===92)add(2);else if(c===8||c===9||c===10||c===12||c===13)add(2);else if(c<32)add(6);else if(c<128)add(1);else if(c<2048)add(2);else if(c>=0xd800&&c<=0xdbff&&i+1<s.length&&s.charCodeAt(i+1)>=0xdc00&&s.charCodeAt(i+1)<=0xdfff){add(4);i++;}else if(c>=0xd800&&c<=0xdfff)add(6);else add(3);}};
 const visit=(v:unknown,depth:number):void=>{insist(++nodes<=10000&&depth<=32,'JSON structure bound');if(v===null){add(4);return;}if(typeof v==='string'){string(v);return;}if(typeof v==='boolean'){add(v?4:5);return;}if(typeof v==='number'){insist(Number.isFinite(v),'JSON finite number');add(JSON.stringify(v).length);return;}insist(v!==null&&typeof v==='object'&&!active.has(v),'JSON value/cycle');active.add(v);if(Array.isArray(v)){insist(v.length<=4096,'JSON array bound');insist(Object.keys(v).length===v.length,'JSON array properties');add(2);for(let i=0;i<v.length;i++){if(i)add(1);const d=Object.getOwnPropertyDescriptor(v,String(i));insist(d&&'value'in d,'JSON dense data array');visit(d.value,depth+1);}}else{insist(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null,'JSON object prototype');const keys=Object.keys(v);insist(keys.length<=4096,'JSON object bound');add(2);for(const [i,key]of keys.entries()){if(i)add(1);const d=Object.getOwnPropertyDescriptor(v,key);insist(d&&'value'in d,'JSON accessor');string(key);add(1);visit(d.value,depth+1);}}active.delete(v);};visit(value,0);return size;
}
export function encoded(value:unknown,max:number=LIMITS.fileBytes):string{const size=jsonBytes(value,max-1);const text=stableJson(value)+'\n';insist(new TextEncoder().encode(text).length===size+1,'JSON size agreement');return text;}
export async function readJson(directory:string,path:string):Promise<unknown>{const raw=await readFileBounded(directory,path,LIMITS.fileBytes);const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);insist(!text.startsWith('\ufeff'),'JSON BOM');return JSON.parse(text);}
export class Writer{
 bytes=0;files=0;constructor(readonly directory:string,readonly maxBytes:number=LIMITS.archiveBytes,readonly maxFiles:number=LIMITS.archiveFiles){}
 capacity(bytes:number,files:number){insist(Number.isSafeInteger(bytes)&&bytes>=0&&Number.isSafeInteger(files)&&files>=0&&this.bytes+bytes<=this.maxBytes&&this.files+files<=this.maxFiles,'archive reservation');}
 async put(path:string,value:unknown){const size=jsonBytes(value,LIMITS.fileBytes-1)+1;this.capacity(size,1);const text=encoded(value);this.bytes+=size;this.files++;await writeFile(join(this.directory,path),text,{flag:'wx',mode:0o600});return {path,bytes:size,sha256:hashBytes(text)};}
}
export function summary(id:string,mode:string,value:unknown):string{return stableJson({contract:'algal.spawn-worker.v1',id,mode,sha256:hashBytes(encoded(value))});}
export function admitWorker(result:CommandResult,argv:string[],id:string,mode:string,value:unknown){requireSuccess(result);insist(stableJson(result.command)===stableJson(argv)&&result.stdout===summary(id,mode,value)+'\n'&&result.stderr==='','worker command/frame binding');}
export function admitNative(result:CommandResult,argv:string[],code:number,stderr:string=''){insist(stableJson(result.command)===stableJson(argv)&&result.exitCode===code&&result.signal===null&&!result.timedOut&&!result.outputExceeded&&result.cleanupObserved&&result.stderr===stderr,'native command boundary');}
export function admitProjection(want:unknown,got:unknown){insist(stableJson(want)===stableJson(got),'spawn semantic projection mismatch');}

export type InputFile={path:string;bytes:number;sha256:string};
/** Snapshot only declared, cooperating fixture inputs; no inferred filesystem authority. */
export async function captureInputs(directory:string,paths:readonly string[]):Promise<InputFile[]>{
 insist(paths.length<=8&&new Set(paths).size===paths.length,'command input inventory');
 const result:InputFile[]=[];for(const path of paths){const raw=await readFileBounded(directory,path,LIMITS.fileBytes);result.push({path,bytes:raw.length,sha256:hashBytes(raw)});}return result;
}
export function admitInputs(before:InputFile[],after:InputFile[]):void{insist(stableJson(before)===stableJson(after),'fixture inputs changed during command');}
export async function admitRaw(directory:string,path:string,want:string):Promise<void>{
 const raw=await readFileBounded(directory,path,LIMITS.fileBytes),expected=new TextEncoder().encode(want);
 insist(raw.length===expected.length&&raw.every((byte,i)=>byte===expected[i]),'fixture raw bytes differ');
}
export function admitReplay(value:unknown,receipt:unknown,ok:boolean):void{
 insist(value!==null&&typeof value==='object'&&!Array.isArray(value),'replay result object');
 const report=value as Record<string,unknown>,original=receipt as Record<string,unknown>;
 insist(stableJson(Object.keys(report).sort())===stableJson(['digest','mismatches','ok','outcome']),'closed replay result');
 insist(report.ok===ok&&typeof report.digest==='string'&&/^sha256:[a-f0-9]{64}$/.test(report.digest)&&typeof report.outcome==='string'&&['complete','failed','stuck','suspended'].includes(report.outcome),'replay result metadata');
 insist(Array.isArray(report.mismatches)&&report.mismatches.length<=4096&&report.mismatches.every(m=>typeof m==='string'&&m.length<=65536)&&(ok?report.mismatches.length===0:report.mismatches.length>0),'replay mismatch evidence');
 if(ok)insist(report.digest===original.digest&&report.outcome===original.outcome,'replay receipt identity');
}
