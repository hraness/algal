/** Habitat budget parity: one `algal.foundry.config.v1` activity with a
 * `budget` runs through the reference Bun CLI (`cli.ts`) and the native
 * `algal` CLI. Config parsing, the budget, and the exit code live in the CLIs,
 * so both legs spawn real commands (as store parity does). Every case must
 * produce identical stdout, identical `--out` bytes, and identical exit codes.
 * The complete report and each terminal exhaustion record (work, runs,
 * attempts, and a refused generator) are then verified across runtimes: the
 * reference verifies the native store's output and the native CLI verifies
 * the reference store's output, with identical verification results.
 *
 * native-parity.ts runs this after the bundled examples; it also runs alone:
 *
 *   bun scripts/habitat-budget-fixture.ts
 *   ALGAL_BIN=/path/to/algal bun scripts/habitat-budget-fixture.ts */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../src/contract";
import { digestCanonical } from "../src/digest";
import { canonicalize, type JsonObject, type JsonValue } from "../src/values";

const root = resolve(import.meta.dir, "..");
const cli = join(root, "cli.ts");

type Spawned = { code: number; stdout: string; stderr: string };

async function spawn(argv: string[]): Promise<Spawned> {
  const child = Bun.spawn(argv, { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  return { code, stdout: stdout.trim(), stderr };
}

function candidate(key: string, program: JsonValue, maxAgentCalls: number): JsonValue {
  return manifestToJson(parseOrganismManifest({
    contract: "algal.organism.v1", key, name: key,
    budgets: { maxWork: 1_000, maxAgentCalls },
    interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "out" } } },
    cells: [
      { id: "src", kind: "input", outputs: { value: "json" } },
      { id: "out", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program }, output: { kind: "json", schema: { type: "string" } } },
    ],
    edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
  }));
}

/** Prints one line per case and returns the case and failure counts. */
export async function habitatBudgetParity(binary: string): Promise<{ cases: number; failed: number }> {
  const temporary = await mkdtemp(join(tmpdir(), "algal-habitat-budget-parity-"));
  const failures: string[] = [];
  let cases = 0;
  try {
    // Ceilings differ per candidate so each limit can be the one exceeded:
    // the constant reserves one executor attempt per run, the echo three.
    const constant = candidate("organism:budget-constant", "a", 1);
    const echo = candidate("organism:budget-echo", ["get", "value"], 3);
    const generator = manifestToJson(parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:budget-generator", name: "budget generator",
      budgets: { maxWork: 2_000, maxAgentCalls: 0 },
      interface: { inputs: {}, outputs: { candidates: { cell: "out", port: "out" } } },
      cells: [{ id: "out", kind: "expr", inputs: {}, expr: { contract: "algal.expr.v1", program: ["quote", [echo]] }, output: { kind: "json", schema: { type: "array" } } }],
      edges: [],
    }));
    const fixtures = join(temporary, "fixtures");
    await mkdir(fixtures, { recursive: true });
    for (const [name, value] of Object.entries({ constant, echo, generator })) {
      await writeFile(join(fixtures, `${name}.algal.json`), canonicalize(value));
    }
    const splits = [
      { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "a" } },
      { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "b" } },
      { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "c" } },
    ];
    const base = { contract: "algal.foundry.config.v1", candidates: ["constant.algal.json", "echo.algal.json"], cases: splits };
    const generated = { contract: "algal.foundry.config.v1", candidates: ["constant.algal.json"], cases: splits,
      generator: { manifest: "generator.algal.json", args: {}, output: "candidates" } };
    const scenarios: { name: string; config: JsonObject; search?: boolean; code: number; expect?: (out: JsonObject) => string | undefined }[] = [
      { name: "complete-with-generator", config: { ...generated, budget: { work: 6_000, attempts: 8, runs: 6 } }, code: 0,
        expect: out => (out.budget as JsonObject | undefined)?.outcome === "complete" && ((out.budget as JsonObject).runs as JsonValue[]).length === 6
          ? undefined : "expected a report with a complete six-run budget" },
      { name: "exhausted-work", config: { ...base, budget: { work: 1_300, attempts: 8, runs: 8 } }, code: 1,
        expect: out => refusal(out, ["work"], 2) },
      { name: "exhausted-runs", config: { ...base, budget: { work: 100_000, attempts: 8, runs: 3 } }, code: 1,
        expect: out => refusal(out, ["runs"], 3) },
      { name: "exhausted-attempts", config: { ...base, budget: { work: 100_000, attempts: 2, runs: 8 } }, code: 1,
        expect: out => refusal(out, ["attempts"], 2) },
      { name: "exhausted-generator", config: { ...generated, budget: { work: 1_999, attempts: 8, runs: 8 } }, code: 1,
        expect: out => refusal(out, ["work"], 0) },
      { name: "invalid-limits", config: { ...base, budget: { work: 1, attempts: 0, runs: 0 } }, code: 2 },
      { name: "search-refuses-budget", search: true, code: 2,
        config: { ...generated, search: { maxGenerations: 1, feedbackInput: "feedback" }, budget: { work: 6_000, attempts: 8, runs: 6 } } },
    ];
    cases = scenarios.length;
    for (const scenario of scenarios) {
      try {
        const config = join(fixtures, `${scenario.name}.config.json`);
        await writeFile(config, canonicalize(scenario.config));
        const stores = { ts: join(temporary, "ts", scenario.name), native: join(temporary, "native", scenario.name) };
        const outs = { ts: join(temporary, `${scenario.name}.ts.json`), native: join(temporary, `${scenario.name}.native.json`) };
        const command = scenario.search ? ["foundry", "search", config] : ["foundry", config];
        const ts = await spawn([process.execPath, cli, ...command, "--dir", stores.ts, "--out", outs.ts]);
        const native = await spawn([binary, "--dir", stores.native, ...command, "--out", outs.native]);
        if (ts.code !== scenario.code || native.code !== scenario.code) {
          throw new Error(`exit ts=${ts.code} native=${native.code}, expected ${scenario.code}: ${ts.stderr.trim()} | ${native.stderr.trim()}`);
        }
        if (scenario.code === 2) {
          console.log(`habitat-budget ${scenario.name}: both runtimes refuse`);
          continue;
        }
        if (ts.stdout !== native.stdout) throw new Error(`stdout differs\nts:     ${ts.stdout.slice(0, 400)}\nnative: ${native.stdout.slice(0, 400)}`);
        const [tsOut, nativeOut] = await Promise.all([readFile(outs.ts, "utf8"), readFile(outs.native, "utf8")]);
        if (tsOut !== nativeOut) throw new Error("--out bytes differ");
        const output = JSON.parse(ts.stdout) as JsonObject;
        const problem = scenario.expect?.(output);
        if (problem) throw new Error(problem);
        // Cross-verify: each runtime verifies the other's output against the
        // other's store; both must accept with identical results.
        const byTs = await spawn([process.execPath, cli, "foundry", "verify", outs.native, "--dir", stores.native]);
        const byNative = await spawn([binary, "--dir", stores.ts, "foundry", "verify", outs.ts]);
        if (byTs.code !== 0 || byNative.code !== 0) throw new Error(`cross verification failed: ${byTs.stdout} | ${byNative.stdout} ${byNative.stderr}`);
        if (byTs.stdout !== byNative.stdout) throw new Error(`verification differs\nts:     ${byTs.stdout}\nnative: ${byNative.stdout}`);
        if (output.contract === "algal.habitat-budget.v1") await tampered(output, stores, binary, temporary, scenario.name);
        else await tamperedReport(output, stores, binary, temporary, scenario.name);
        console.log(`habitat-budget ${scenario.name}: identical ${String(output.contract)} + cross-verified`);
      } catch (error) {
        failures.push(scenario.name);
        console.error(`habitat-budget ${scenario.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  return { cases, failed: failures.length };
}

function refusal(out: JsonObject, reasons: string[], runs: number): string | undefined {
  const refused = out.refused as JsonObject | null;
  const ok = out.contract === "algal.habitat-budget.v1" && out.outcome === "exhausted" &&
    (out.runs as JsonValue[]).length === runs && canonicalize(refused?.reasons ?? null) === canonicalize(reasons);
  return ok ? undefined : `expected an exhausted record with ${runs} runs refused for ${reasons.join(", ")}`;
}

/** Both runtimes must reject the same evidence the same way. */
async function verifyBoth(value: JsonValue, stores: { ts: string; native: string }, binary: string, file: string) {
  await writeFile(file, canonicalize(value));
  const ts = await spawn([process.execPath, cli, "foundry", "verify", file, "--dir", stores.ts]);
  const native = await spawn([binary, "--dir", stores.ts, "foundry", "verify", file]);
  return { ts, native };
}

async function tampered(record: JsonObject, stores: { ts: string; native: string }, binary: string, temporary: string, name: string) {
  const missing = structuredClone(record);
  const runs = missing.runs as JsonObject[];
  if (runs.length > 0) {
    runs[0]!.receipt = `sha256:${"0".repeat(64)}`;
    const { ts, native } = await verifyBoth(missing, stores, binary, join(temporary, `${name}.missing.json`));
    if (ts.code !== 1 || native.code !== 1 || ts.stdout !== native.stdout) {
      throw new Error(`missing-receipt verification differs: ${ts.code} ${ts.stdout} | ${native.code} ${native.stdout}`);
    }
  }
  const totals = structuredClone(record);
  (totals.charged as JsonObject).runs = ((totals.charged as JsonObject).runs as number) + 1;
  const { ts, native } = await verifyBoth(totals, stores, binary, join(temporary, `${name}.totals.json`));
  if (ts.code !== 2 || native.code !== 2) throw new Error(`inconsistent totals accepted: ${ts.code} | ${native.code}`);
}

async function tamperedReport(report: JsonObject, stores: { ts: string; native: string }, binary: string, temporary: string, name: string) {
  const swapped = structuredClone(report);
  const runs = (swapped.budget as JsonObject).runs as JsonValue[];
  [runs[1], runs[2]] = [runs[2]!, runs[1]!];
  delete swapped.digest;
  swapped.digest = digestCanonical(swapped);
  const { ts, native } = await verifyBoth(swapped, stores, binary, join(temporary, `${name}.swapped.json`));
  if (ts.code !== 1 || native.code !== 1 || ts.stdout !== native.stdout) {
    throw new Error(`reordered budget verification differs: ${ts.code} ${ts.stdout} | ${native.code} ${native.stdout}`);
  }
}

if (import.meta.main) {
  const result = await habitatBudgetParity(process.env.ALGAL_BIN ?? join(root, "target/debug/algal"));
  console.log(JSON.stringify({ habitatBudgetCases: result.cases, failed: result.failed }));
  process.exitCode = result.failed ? 1 : 0;
}
