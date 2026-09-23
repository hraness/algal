# Bounded audit probe evidence

These results were observed on 2026-09-23 against ALGAL a86327f76f6e632fe7fceda17b738a749a341ab6, using Bun 1.3.14 and the committed expression WASM. They are counterexamples/observations, not passing formal proofs. Commands below run from the ALGAL repository root. No native counterpart was run, no external effect was dispatched, and no source code was changed.

## Undeclared inherited output port

    bun -e 'import {parseOrganismManifest} from "./src/contract.ts"; import {compileOrganism} from "./src/graph.ts"; import {builtinRegistry} from "./src/registry.ts"; import {MemoryStore} from "./src/store.ts"; const m=parseOrganismManifest({contract:"algal.organism.v1",key:"organism:probe",name:"probe",cells:[{id:"source",kind:"const",outputs:{actual:{type:"json",value:1}}},{id:"sink",kind:"fn",fn:"echo.v1"}],edges:[{from:{cell:"source",port:"constructor"},to:{cell:"sink",port:"value"}}]}); try {await compileOrganism(m,builtinRegistry(),new MemoryStore()); console.log(JSON.stringify({admitted:true,sourceOwnPorts:Object.keys(m.cells[0].outputs)}));} catch(e) {console.log(JSON.stringify({admitted:false,code:e.code,message:e.message}));}'

Observed:

    {"admitted":true,"sourceOwnPorts":["actual"]}

## Policy case limit

[evaluation-policy-repro.txt](evaluation-policy-repro.txt) contains the executed source. It derives its in-memory fixture from src/application-adaptation.test.ts, sets maxCases to 3, adds a fourth case, records genuine pure foundry executions and then submits correctly bound evidence directly to verification/admission.

Copy the text file to a fresh temporary .ts path and run it with Bun. Its imports name /Users/bg/Documents/algal/src explicitly; update that prefix if moving the checkout. The original executed path was /private/tmp/algal-formal-audit-11r4eto4/evaluation-policy-repro.ts.

Observed:

    {"policyMaxCases":3,"actualCases":4,"evaluatorError":"Error: Evaluation case set exceeds policy bound","verifierVerdict":"accepted","activationAdmitted":true}

ActivationAdmitted refers to admitApplicationActivation returning successfully. This probe does not mutate an ApplicationService head or prove that every production host would admit the supplied candidate.

## Malformed UTF-8 in a CAS object

    bun -e 'import {mkdtemp,mkdir,writeFile} from "node:fs/promises"; import {join} from "node:path"; import {FileStore} from "./src/store"; import {digestCanonical} from "./src/digest"; const dir=await mkdtemp("/private/tmp/algal-utf8-audit-"); const digest=digestCanonical("\uFFFD"); await mkdir(join(dir,"values")); await writeFile(join(dir,"values",digest.slice(7)+".json"),new Uint8Array([34,255,34])); const read=await new FileStore(dir).getValue(digest); console.log(JSON.stringify({invalidUtf8Bytes:[34,255,34],accepted:read===String.fromCharCode(65533),value:read}));'

Observed:

    {"invalidUtf8Bytes":[34,255,34],"accepted":true,"value":"�"}

This creates only a fresh temporary directory. The canonical digest is for the decoded replacement-character string; the observation concerns malformed-input admission, not a cryptographic collision.

## Wide expression index on WASM

    bun -e 'import {evalProgram} from "./src/expr.ts"; console.log(JSON.stringify(evalProgram(["nth",["quote",[]],4294967296],{},100000)));'

Observed:

    {"err":{"code":"EXPR_PATH","op":"nth","what":"index 4294967295 out of range 0"},"fuel":4,"ok":false}

The predicted different native64 message follows from a source-level usize conversion. A native comparison is still required before reporting an executed cross-target mismatch.
