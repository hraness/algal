/** Habitat budget parity: one `algal.foundry.config.v1` activity with a
 * `budget` runs through the reference Bun CLI (`cli.ts`) and the native
 * `algal` CLI. Config parsing, the budget, and the exit code live in the CLIs,
 * so both legs spawn real commands (as store parity does). Every case must
 * produce identical stdout, identical `--out` bytes, and identical exit codes.
 * The complete report and each terminal exhaustion record (work, runs,
 * attempts, and a refused generator) are then verified across runtimes: the
 * reference verifies the native store's output and the native CLI verifies
 * the reference store's output, with identical verification results. Search
 * cases run `foundry search` under one account across generations, then
 * cross-verify with `foundry search-verify`; an unbudgeted search pins the
 * default path.
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
    // A search generator proposes the constant before any feedback exists
    // and the echo afterwards, so the second generation evaluates both.
    const searchGenerator = manifestToJson(parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:budget-search-generator", name: "budget search generator",
      budgets: { maxWork: 2_000, maxAgentCalls: 0 },
      interface: { inputs: { feedback: { cell: "src", port: "value" } }, outputs: { candidates: { cell: "out", port: "out" } } },
      cells: [
        { id: "src", kind: "input", outputs: { value: "json" } },
        { id: "out", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program: ["if", ["eq", ["get", "value"], null], ["quote", [constant]], ["quote", [echo]]] }, output: { kind: "json", schema: { type: "array" } } },
      ],
      edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
    }));
    const fixtures = join(temporary, "fixtures");
    await mkdir(fixtures, { recursive: true });
    for (const [name, value] of Object.entries({ constant, echo, generator, "search-generator": searchGenerator })) {
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
    const searched = { contract: "algal.foundry.config.v1", cases: splits,
      generator: { manifest: "search-generator.algal.json", args: {}, output: "candidates" },
      search: { maxGenerations: 2, feedbackInput: "feedback" } };
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
      // Generations 0 and 1 run the generator and each candidate's selection
      // cases; the final epoch reruns the winner and its holdout: 11 runs.
      { name: "search-plain", search: true, config: searched, code: 0,
        expect: out => out.contract === "algal.search.v1" && out.budget === undefined ? undefined : "expected an unbudgeted search report" },
      { name: "search-complete", search: true, config: { ...searched, budget: { work: 100_000, attempts: 8, runs: 16 } }, code: 0,
        expect: out => (out.budget as JsonObject | undefined)?.outcome === "complete" && ((out.budget as JsonObject).runs as JsonValue[]).length === 11 &&
          (out.result as JsonObject).budget === undefined ? undefined : "expected a search report with a complete 11-run budget" },
      { name: "search-exhausted-runs", search: true, config: { ...searched, budget: { work: 100_000, attempts: 8, runs: 4 } }, code: 1,
        expect: out => refusal(out, ["runs"], 4) },
      // The echo reserves three attempts; it first runs in generation 1.
      { name: "search-exhausted-attempts", search: true, config: { ...searched, budget: { work: 100_000, attempts: 2, runs: 16 } }, code: 1,
        expect: out => refusal(out, ["attempts"], 6) },
      { name: "search-exhausted-generator", search: true, config: { ...searched, budget: { work: 1_999, attempts: 8, runs: 16 } }, code: 1,
        expect: out => refusal(out, ["work"], 0) },
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
        const verify = scenario.search ? "search-verify" : "verify";
        const byTs = await spawn([process.execPath, cli, "foundry", verify, outs.native, "--dir", stores.native]);
        const byNative = await spawn([binary, "--dir", stores.ts, "foundry", verify, outs.ts]);
        if (byTs.code !== 0 || byNative.code !== 0) throw new Error(`cross verification failed: ${byTs.stdout} | ${byNative.stdout} ${byNative.stderr}`);
        if (byTs.stdout !== byNative.stdout) throw new Error(`verification differs\nts:     ${byTs.stdout}\nnative: ${byNative.stdout}`);
        if (output.contract === "algal.habitat-budget.v1") await tampered(output, stores, binary, temporary, scenario.name, verify);
        else if (output.budget !== undefined) await tamperedReport(output, stores, binary, temporary, scenario.name, verify);
        console.log(`habitat-budget ${scenario.name}: identical ${String(output.contract)} + cross-verified`);
      } catch (error) {
        failures.push(scenario.name);
        console.error(`habitat-budget ${scenario.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // Habitat schedules run in both runtimes: a foundry and a search take
    // round-robin turns on one account; the record, the journal, the resumed
    // replay, and cross-verified results must be byte-identical.
    cases++;
    try {
      await writeFile(join(fixtures, "schedule-foundry.config.json"), canonicalize(base));
      await writeFile(join(fixtures, "schedule-search.config.json"), canonicalize(searched));
      const schedule = join(fixtures, "schedule.json");
      await writeFile(schedule, canonicalize({
        contract: "algal.habitat-schedule.config.v1", order: "round-robin", budget: { work: 100_000, attempts: 8, runs: 32 },
        activities: [{ kind: "foundry", config: "schedule-foundry.config.json" }, { kind: "search", config: "schedule-search.config.json" }],
      }));
      const stores = { ts: join(temporary, "ts", "schedule"), native: join(temporary, "native", "schedule") };
      const outs = { ts: join(temporary, "schedule.ts.json"), native: join(temporary, "schedule.native.json") };
      const journals = { ts: join(temporary, "ts", "schedule-journal"), native: join(temporary, "native", "schedule-journal") };
      const [ts, native] = await Promise.all([
        spawn([process.execPath, cli, "foundry", "schedule", schedule, "--dir", stores.ts, "--journal", journals.ts, "--out", outs.ts]),
        spawn([binary, "--dir", stores.native, "foundry", "schedule", schedule, "--journal", journals.native, "--out", outs.native]),
      ]);
      if (ts.code !== 0 || native.code !== 0) throw new Error(`exit ts=${ts.code} native=${native.code}: ${ts.stderr.trim()} | ${native.stderr.trim()}`);
      if (ts.stdout !== native.stdout) throw new Error(`stdout differs\nts:     ${ts.stdout.slice(0, 400)}\nnative: ${native.stdout.slice(0, 400)}`);
      const [tsOut, nativeOut] = await Promise.all([readFile(outs.ts, "utf8"), readFile(outs.native, "utf8")]);
      if (tsOut !== nativeOut) throw new Error("--out bytes differ");
      // The journal's immutable entries are canonical files; each must match.
      const entries = ["journal.json", ...Array.from({ length: 16 }, (_, i) => `runs/${String(i).padStart(6, "0")}.json`)];
      for (const entry of entries) {
        const [a, b] = await Promise.all([readFile(join(journals.ts, entry), "utf8"), readFile(join(journals.native, entry), "utf8")]);
        if (a !== b) throw new Error(`journal entry ${entry} differs\nts:     ${a.slice(0, 300)}\nnative: ${b.slice(0, 300)}`);
      }
      // Resuming each complete journal replays it: identical bytes again.
      const [replayedTs, replayedNative] = await Promise.all([
        spawn([process.execPath, cli, "foundry", "schedule", schedule, "--dir", stores.ts, "--journal", journals.ts]),
        spawn([binary, "--dir", stores.native, "foundry", "schedule", schedule, "--journal", journals.native]),
      ]);
      if (replayedTs.code !== 0 || replayedNative.code !== 0 || replayedTs.stdout !== ts.stdout || replayedNative.stdout !== ts.stdout) {
        throw new Error(`journal replay differs: ts=${replayedTs.code} native=${replayedNative.code}\n${replayedTs.stderr.trim()} | ${replayedNative.stderr.trim()}`);
      }
      // Cross-verify: each runtime verifies the other's schedule record
      // against the other's store, with identical results.
      const verifyTs = await spawn([process.execPath, cli, "foundry", "schedule-verify", outs.native, "--dir", stores.native]);
      const verifyNative = await spawn([binary, "--dir", stores.ts, "foundry", "schedule-verify", outs.ts]);
      if (verifyTs.code !== 0 || verifyNative.code !== 0) throw new Error(`schedule verification failed: ${verifyTs.stdout} | ${verifyNative.stdout} ${verifyNative.stderr}`);
      if (verifyTs.stdout !== verifyNative.stdout) throw new Error(`schedule verification differs\nts:     ${verifyTs.stdout}\nnative: ${verifyNative.stdout}`);
      // An exhausted schedule writes its terminal record and exits 1.
      const tight = join(fixtures, "schedule-tight.json");
      await writeFile(tight, canonicalize({
        contract: "algal.habitat-schedule.config.v1", order: "round-robin", budget: { work: 100_000, attempts: 8, runs: 3 },
        activities: [{ kind: "foundry", config: "schedule-foundry.config.json" }, { kind: "search", config: "schedule-search.config.json" }],
      }));
      const [tightTs, tightNative] = await Promise.all([
        spawn([process.execPath, cli, "foundry", "schedule", tight, "--dir", join(temporary, "ts", "schedule-tight")]),
        spawn([binary, "--dir", join(temporary, "native", "schedule-tight"), "foundry", "schedule", tight]),
      ]);
      if (tightTs.code !== 1 || tightNative.code !== 1 || tightTs.stdout !== tightNative.stdout) {
        throw new Error(`exhausted schedule differs: ts=${tightTs.code} ${tightTs.stdout.slice(0, 300)} | native=${tightNative.code} ${tightNative.stdout.slice(0, 300)}`);
      }
      console.log("habitat-budget schedule: identical record, journal, replay, and cross-verification");
    } catch (error) {
      failures.push("schedule");
      console.error(`habitat-budget schedule: ${error instanceof Error ? error.message : String(error)}`);
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
async function verifyBoth(value: JsonValue, stores: { ts: string; native: string }, binary: string, file: string, verify: string) {
  await writeFile(file, canonicalize(value));
  const ts = await spawn([process.execPath, cli, "foundry", verify, file, "--dir", stores.ts]);
  const native = await spawn([binary, "--dir", stores.ts, "foundry", verify, file]);
  return { ts, native };
}

async function tampered(record: JsonObject, stores: { ts: string; native: string }, binary: string, temporary: string, name: string, verify: string) {
  const missing = structuredClone(record);
  const runs = missing.runs as JsonObject[];
  if (runs.length > 0) {
    runs[0]!.receipt = `sha256:${"0".repeat(64)}`;
    const { ts, native } = await verifyBoth(missing, stores, binary, join(temporary, `${name}.missing.json`), verify);
    if (ts.code !== 1 || native.code !== 1 || ts.stdout !== native.stdout) {
      throw new Error(`missing-receipt verification differs: ${ts.code} ${ts.stdout} | ${native.code} ${native.stdout}`);
    }
  }
  const totals = structuredClone(record);
  (totals.charged as JsonObject).runs = ((totals.charged as JsonObject).runs as number) + 1;
  const { ts, native } = await verifyBoth(totals, stores, binary, join(temporary, `${name}.totals.json`), verify);
  if (ts.code !== 2 || native.code !== 2) throw new Error(`inconsistent totals accepted: ${ts.code} | ${native.code}`);
  if (verify === "search-verify") {
    // `search-verify` expects a search's account.
    const foreign = { ...structuredClone(record), activity: "foundry" };
    const other = await verifyBoth(foreign, stores, binary, join(temporary, `${name}.foreign.json`), verify);
    if (other.ts.code !== 1 || other.native.code !== 1 || other.ts.stdout !== other.native.stdout ||
        (JSON.parse(other.ts.stdout) as { mismatches: string[] }).mismatches[0] !== "budget activity is not search") {
      throw new Error(`foreign-activity verification differs: ${other.ts.code} ${other.ts.stdout} | ${other.native.code} ${other.native.stdout}`);
    }
  }
}

async function tamperedReport(report: JsonObject, stores: { ts: string; native: string }, binary: string, temporary: string, name: string, verify: string) {
  const swapped = structuredClone(report);
  const runs = (swapped.budget as JsonObject).runs as JsonValue[];
  [runs[1], runs[2]] = [runs[2]!, runs[1]!];
  delete swapped.digest;
  swapped.digest = digestCanonical(swapped);
  const { ts, native } = await verifyBoth(swapped, stores, binary, join(temporary, `${name}.swapped.json`), verify);
  if (ts.code !== 1 || native.code !== 1 || ts.stdout !== native.stdout) {
    throw new Error(`reordered budget verification differs: ${ts.code} ${ts.stdout} | ${native.code} ${native.stdout}`);
  }
}

if (import.meta.main) {
  const result = await habitatBudgetParity(process.env.ALGAL_BIN ?? join(root, "target/debug/algal"));
  console.log(JSON.stringify({ habitatBudgetCases: result.cases, failed: result.failed }));
  process.exitCode = result.failed ? 1 : 0;
}
