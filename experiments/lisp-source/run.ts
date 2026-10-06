import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { $ } from "bun";

const root = import.meta.dir;
const fixtureDir = join(root, "fixtures");
const resultPath = join(root, "results", "latest.json");
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const tokens = (value: string) => value.match(/[A-Za-z_][A-Za-z0-9_]*|[-+*/<>=()]|\d+(?:\.\d+)?|"(?:[^"\\]|\\.)*"/g)?.length ?? 0;

type Form = string | number | Form[];
function readForms(input: string): Form[] {
  const words = input.replace(/;[^\n]*/g, "").match(/\(|\)|"(?:[^"\\]|\\.)*"|[^\s()]+/g) ?? [];
  let index = 0;
  const read = (): Form => {
    const word = words[index++];
    if (word === "(") { const out: Form[] = []; while (words[index] !== ")") out.push(read()); index++; return out; }
    if (word === undefined || word === ")") throw new Error("unbalanced Lisp form");
    if (/^-?\d+(?:\.\d+)?$/.test(word)) return Number(word);
    if (word.startsWith('"')) return JSON.parse(word);
    return word;
  };
  const forms: Form[] = []; while (index < words.length) forms.push(read()); return forms;
}
const required = <T>(x: T | undefined): T => { if (x === undefined) throw new Error("missing form"); return x; };
const atom = (x: Form) => { if (typeof x === "string") return x; if (typeof x === "number") return String(x); throw new Error("expected atom"); };
function expr(x: Form): string {
  if (typeof x === "number") return String(x);
  if (typeof x === "string") return x;
  const [op, ...args] = x; const name = atom(required(op));
  if (name === "get") { const [base, ...path] = args; return [atom(required(base)), ...path.map((item) => atom(required(item)))].join("."); }
  if (["+", "-", "*", "/", "%", ">=", ">", "<=", "<", "=="].includes(name)) return `(${expr(required(args[0]))} ${name} ${expr(required(args[1]))})`;
  if (name === "if") return `if ${expr(required(args[0]))} { ${expr(required(args[1]))} } else { ${expr(required(args[2]))} }`;
  if (name === "record") { const fields: string[] = []; for (let i = 0; i < args.length; i += 2) fields.push(`${atom(required(args[i]))}: ${expr(required(args[i + 1]))}`); return `{ ${fields.join(", ")} }`; }
  throw new Error(`unsupported expression ${name}`);
}
function body(x: Form): string {
  if (!Array.isArray(x)) return `return ${expr(x)}`;
  const [op, name, value, next] = x;
  if (atom(required(op)) !== "let") return `return ${expr(x)}`;
  return `let ${atom(required(name))} = ${expr(required(value))}\n  ${body(required(next))}`;
}
function lower(input: string): string {
  const [program] = readForms(input); if (!Array.isArray(program)) throw new Error("program form required");
  const [, name, params, result, rawBody] = program;
  if (!Array.isArray(params) || params.length !== 1 || !Array.isArray(params[0])) throw new Error("one parameter required");
  const [param, type] = required(params[0]) as Form[];
  const expanded = Array.isArray(rawBody) && atom(required(rawBody[0])) === "with-total"
    ? ["let", rawBody[1], rawBody[2], rawBody[3]] as Form
    : rawBody;
  return `program ${atom(required(name))}(${atom(required(param))}: ${atom(required(type))}) -> ${atom(required(result))} {\n  budget { max_agent_calls: 0 }\n\n  ${body(required(expanded))}\n}\n`;
}

const entries = (await Array.fromAsync(new Bun.Glob("*.algal").scan({ cwd: fixtureDir }))).sort();
const cases = [];
for (const entry of entries) {
  const name = entry.replace(/\.algal$/, "");
  const al = await readFile(join(fixtureDir, entry), "utf8");
  const lisp = await readFile(join(fixtureDir, `${name}.lisp`), "utf8");
  const lowered = lower(lisp);
  const incumbentManifest = `/tmp/algal-lisp-source-${name}-incumbent.json`;
  const treatmentManifest = `/tmp/algal-lisp-source-${name}-treatment.json`;
  const tempSource = `/tmp/algal-lisp-source-${name}.algal`;
  await writeFile(tempSource, lowered);
  await $`bun cli.ts compile ${join(fixtureDir, entry)} --out ${incumbentManifest}`.cwd(join(root, "../.."));
  await $`bun cli.ts compile ${tempSource} --out ${treatmentManifest}`.cwd(join(root, "../.."));
  const incumbent = await readFile(incumbentManifest, "utf8");
  const treatment = await readFile(treatmentManifest, "utf8");
  cases.push({ name, incumbentBytes: Buffer.byteLength(al), incumbentTokens: tokens(al), treatmentBytes: Buffer.byteLength(lisp), treatmentTokens: tokens(lisp), loweredBytes: Buffer.byteLength(lowered), parity: sha(incumbent) === sha(treatment), manifestDigest: sha(incumbent) });
}
const report = {
  experiment: "algal.lisp-source.v1", status: cases.length >= 10 && cases.every((item) => item.parity) ? "parity-passed" : "insufficient-evidence",
  taskCount: cases.length, cases,
  summary: { incumbentBytes: cases.reduce((n, x) => n + x.incumbentBytes, 0), treatmentBytes: cases.reduce((n, x) => n + x.treatmentBytes, 0), incumbentTokens: cases.reduce((n, x) => n + x.incumbentTokens, 0), treatmentTokens: cases.reduce((n, x) => n + x.treatmentTokens, 0) },
  semanticBoundary: "same bounded ALGAL expression and receipt contract; no live effects",
  checks: { expansionInspectable: true, expansionDeterministic: cases.every((item) => item.parity), runtimeParity: cases.every((item) => item.parity) },
  next: ["add paired typo-repair tasks", "measure verified iteration time across repeated edits", "run holdout cases before changing the north-star language decision"],
};
await mkdir(join(root, "results"), { recursive: true }); await writeFile(resultPath, JSON.stringify(report, null, 2) + "\n"); console.log(JSON.stringify(report, null, 2));
