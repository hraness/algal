// Shared-DAG admission and ordinary repeated-child execution. No provider calls.
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../src/contract";
import { compileOrganism } from "../src/graph";
import { boundedBytes } from "../src/io";
import { builtinRegistry } from "../src/registry";
import { runOrganism } from "../src/run";
import { MemoryStore } from "../src/store";
import { canonicalize, type JsonValue } from "../src/values";
import { verifyReceipt } from "../src/verify";

const binary = resolve(process.env.ALGAL_BIN ?? "target/debug/algal");
const directory = await mkdtemp(join(tmpdir(), "algal-compilation-parity-"));
const modules = join(directory, "modules");
const store = new MemoryStore();
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function native(args: string[]) {
  const child = Bun.spawn([binary, "--dir", join(directory, "store"), ...args], { stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 10_000, killSignal: "SIGKILL" });
  try {
    const [code, out, err] = await Promise.all([child.exited, boundedBytes(child.stdout, 1_048_576, "compile parity stdout"), boundedBytes(child.stderr, 65_536, "compile parity stderr")]);
    return { code, stdout: new TextDecoder().decode(out), stderr: new TextDecoder().decode(err) };
  } finally { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); await child.exited; }
}
try {
  await mkdir(modules);
  let current = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:leaf", name: "Leaf",
    cells: [{ id: "value", kind: "const", outputs: { out: { type: "text", value: "ok" } } }], edges: [], interface: { inputs: {}, outputs: {} }, budgets: { maxSteps: 1024, maxDepth: 8 } });
  let ordinary = current;
  for (let level = 0; level < 11; level++) {
    const digest = await store.putManifest(current);
    await writeFile(join(modules, `${level}.algal.json`), canonicalize(manifestToJson(current)));
    current = parseOrganismManifest({ contract: "algal.organism.v1", key: `organism:level-${level}`, name: `Level ${level}`,
      cells: ["left", "right"].map(id => ({ id, kind: "organism", manifest: digest })), edges: [], interface: { inputs: {}, outputs: {} }, budgets: { maxSteps: 1024, maxDepth: 8 } });
    if (level === 2) ordinary = current;
  }
  const manifest = join(directory, "ordinary.algal.json");
  const adversary = join(directory, "shared-dag.algal.json");
  await writeFile(manifest, canonicalize(manifestToJson(ordinary)));
  await writeFile(adversary, canonicalize(manifestToJson(current)));
  let refused: unknown;
  try { await compileOrganism(current, builtinRegistry(), store); } catch (error) { refused = error; }
  check(refused instanceof Error && "code" in refused && refused.code === "BUDGET_EXHAUSTED", "Bun admitted unbounded DAG expansion");
  const denied = await native(["check", adversary, "--modules", modules]);
  check(denied.code === 2 && denied.stderr.includes("BUDGET_EXHAUSTED"), "native admission differs from Bun");
  const reference = await runOrganism({ manifest: ordinary, store, fns: builtinRegistry(), executors: [] });
  const actual = await native(["run", manifest, "--modules", modules]);
  check(actual.code === 0, `native repeated-child execution failed: ${actual.stderr}`);
  const receipt: JsonValue = JSON.parse(actual.stdout);
  const actualRecord = receipt as Record<string, JsonValue>;
  const referenceRecord = reference as unknown as Record<string, JsonValue>;
  // Runtime version metadata is deliberately independent (native 0.2.0 versus
  // reference 0.1.0), and therefore so is the full receipt digest. Match the
  // same semantic fields as native-parity, then verify both complete receipts.
  const differences = ["manifestDigest", "manifestKey", "args", "outcome", "cells", "effects", "events", "work", "failure"]
    .filter(key => canonicalize(actualRecord[key] ?? null) !== canonicalize(referenceRecord[key] ?? null));
  check(differences.length === 0, `ordinary repeated-child semantics differ: ${differences.join(", ")}`);
  check((await verifyReceipt(receipt, manifestToJson(ordinary), store)).ok, "Bun cannot verify native repeated-child receipt");
  const receiptPath = join(directory, "bun.receipt.json");
  await writeFile(receiptPath, canonicalize(reference as unknown as JsonValue));
  const verified = await native(["verify", receiptPath, manifest, "--modules", modules]);
  check(verified.code === 0 && JSON.parse(verified.stdout).ok === true, "native cannot verify Bun repeated-child receipt");
  console.log(JSON.stringify({ ok: true, sharedDagRejectedBothRuntimes: true, ordinarySemanticsIdentical: true, crossVerified: true, modelCalls: 0 }));
} finally { await rm(directory, { recursive: true, force: true }); }
