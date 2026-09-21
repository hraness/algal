// A handled expression failure must cross the same work-budget boundary in
// both runtimes before a recovery agent can run. Scripted responses only.
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../src/contract";
import { scriptedExecutor } from "../src/effects";
import { boundedBytes } from "../src/io";
import { builtinRegistry } from "../src/registry";
import { runOrganism } from "../src/run";
import { MemoryStore } from "../src/store";
import { canonicalize, type JsonObject, type JsonValue } from "../src/values";
import { verifyReceipt } from "../src/verify";

const binary = resolve(process.argv[2] ?? process.env.ALGAL_BIN ?? "target/debug/algal");
const directory = await mkdtemp(join(tmpdir(), "algal-work-budget-parity-"));
function require(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function native(args: string[]): Promise<{ code: number; value: JsonObject }> {
  const child = Bun.spawn([binary, ...args], { cwd: directory, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); child.kill("SIGKILL"); }, 10_000);
  try {
    const [stdout, stderr, code] = await Promise.all([
      boundedBytes(child.stdout, 1_048_576, "work-budget parity stdout", controller.signal),
      boundedBytes(child.stderr, 65_536, "work-budget parity stderr", controller.signal), child.exited,
    ]);
    require(!controller.signal.aborted, "native work-budget parity deadline");
    require(stdout.length > 0, `native returned no JSON: ${new TextDecoder().decode(stderr)}`);
    return { code, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(stdout)) as JsonObject };
  } finally {
    clearTimeout(timer);
    child.kill("SIGKILL");
    await child.exited;
  }
}

try {
  for (const maxWork of [1, 10_000]) {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:handled-work-budget", name: "Handled work budget",
      budgets: { maxWork, maxAgentCalls: 1 },
      cells: [
        { id: "worker", kind: "expr", inputs: {}, expr: { contract: "algal.expr.v1", program: ["div", 1, 0] }, output: { kind: "json", schema: {} } },
        { id: "fallback", kind: "agent", inputs: { err: "json" }, prompt: "fixture", output: { kind: "text" } },
      ],
      edges: [{ from: { cell: "worker", port: "out" }, to: { cell: "fallback", port: "err" }, on: "fail" }],
    });
    const data = manifestToJson(manifest);
    const manifestFile = join(directory, `${maxWork}.manifest.json`);
    const responsesFile = join(directory, `${maxWork}.responses.json`);
    const responses = { fallback: "recovered" };
    await writeFile(manifestFile, canonicalize(data));
    await writeFile(responsesFile, canonicalize(responses));
    const reference = await runOrganism({ manifest, fns: builtinRegistry(), store: new MemoryStore(), executors: [scriptedExecutor(responses)] });
    const actual = await native(["run", manifestFile, "--responses", responsesFile, "--dir", join(directory, "store")]);
    const overBudget = maxWork === 1;
    require(reference.outcome === (overBudget ? "failed" : "complete"), "unexpected reference outcome");
    require(reference.effects.length === (overBudget ? 0 : 1), "recovery effect crossed work boundary");
    if (overBudget) require(reference.failure?.code === "BUDGET_EXHAUSTED" && reference.failure.path === "worker", "work failure boundary moved");
    require(actual.code === (overBudget ? 1 : 0), "native run exit differs");
    for (const key of ["outcome", "failure", "cells", "effects", "events", "work"] as const) {
      require(canonicalize(actual.value[key] ?? null) === canonicalize((reference[key] ?? null) as JsonValue), `${maxWork}: ${key} differs`);
    }
    require((await verifyReceipt(actual.value, data, new MemoryStore())).ok, "Bun cannot verify native work-budget receipt");
    const receiptFile = join(directory, `${maxWork}.bun.receipt.json`);
    await writeFile(receiptFile, canonicalize(reference as unknown as JsonValue));
    const verified = await native(["verify", receiptFile, manifestFile, "--dir", join(directory, "store")]);
    require(verified.code === 0 && verified.value.ok === true, "native cannot verify Bun work-budget receipt");
  }
  console.log(JSON.stringify({ ok: true, cases: 2, crossRuntimeVerifications: 4, liveProviderCalls: 0 }));
} finally {
  await rm(directory, { recursive: true, force: true });
}
