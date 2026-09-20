import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { canonicalize, type JsonValue } from "../src/values";
import { manifestToJson, parseOrganismManifest } from "../src/contract";
import { FileStore, MemoryStore } from "../src/store";
import { fileTransport, type Transport } from "../src/transport";
import { scriptedExecutor } from "../src/effects";
import { builtinRegistry } from "../src/registry";
import { runOrganism } from "../src/run";
import { verifyReceipt } from "../src/verify";
import { compileSource } from "../src/source";

const root = resolve(import.meta.dir, "..");
const examples = join(root, "examples");
const binary = process.env.ALGAL_BIN ?? join(root, "target/debug/algal");
const temporary = await mkdtemp(join(tmpdir(), "algal-parity-"));
const files = (await readdir(examples)).filter((f) => /\.algal\.json$/.test(f)).sort();
const modules = await Promise.all(files.map(async (file) => parseOrganismManifest(JSON.parse(await readFile(join(examples, file), "utf8")))));
// The readable front end stays outside the kernel: both runtimes receive the
// exact same compiled artifact. Exercise all committed source examples too.
const sourceFiles = await readdir(join(examples, "source"));
const sourceEntries = sourceFiles.filter(f => f.endsWith(".algal")).sort();
const generated = new Map<string, { manifestPath: string; fixtureBase: string; responsesPath?: string }>();
for (const file of sourceEntries) {
  const source = await readFile(join(examples, "source", file), "utf8");
  const { manifest } = compileSource(source);
  const base = file.slice(0, -6);
  const name = `source-${base}`;
  const manifestPath = join(temporary, `${name}.algal.json`);
  await writeFile(manifestPath, canonicalize(manifestToJson(manifest)));
  // Named response fixtures exercise every selected path of a source program.
  // Keep each run's store and receipt separate even when the manifest is shared.
  const variants = sourceFiles.filter(f => f.startsWith(`${base}.responses.`) && f.endsWith(".json") && f.length > `${base}.responses..json`.length).sort();
  for (const variant of variants.length ? variants : [undefined]) {
    const label = variant?.slice(`${base}.responses.`.length, -5);
    const caseName = label === undefined ? name : `${name}-${label}`;
    files.push(`${caseName}.algal.json`);
    modules.push(manifest);
    generated.set(caseName, { manifestPath, fixtureBase: join(examples, "source", base),
      ...(variant === undefined ? {} : { responsesPath: join(examples, "source", variant) }) });
  }
}
let failed = 0;

async function native(args: string[]) {
  const proc = Bun.spawn([binary, ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  if (code !== 0) throw new Error(stderr || stdout);
  return JSON.parse(stdout) as Record<string, JsonValue>;
}

try {
  for (const [index, file] of files.entries()) {
    const name = file.replace(/\.algal\.json$/, "");
    const manifest = modules[index]!;
    const store = new MemoryStore();
    for (const module of modules) await store.putManifest(module);
    let args: Record<string, Record<string, JsonValue>> = {};
    let responses: Record<string, JsonValue> = {};
    const manifestPath = generated.get(name)?.manifestPath ?? join(examples, file);
    const fixtureBase = generated.get(name)?.fixtureBase ?? join(examples, name);
    const runArgs = ["run", manifestPath, "--modules", examples, "--dir", join(temporary, name), "--write"];
    for (const suffix of ["args", "responses"] as const) {
      const path = suffix === "responses" ? generated.get(name)?.responsesPath ?? `${fixtureBase}.responses.json` : `${fixtureBase}.args.json`;
      try {
        const value = JSON.parse(await readFile(path, "utf8"));
        if (suffix === "args") args = value;
        else responses = value;
        runArgs.push(`--${suffix}`, path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    const transports: Record<string, Transport> = {};
    const transportFile = join(examples, `${name}.transports.json`);
    if (await Bun.file(transportFile).exists()) {
      const targets: Record<string, string> = JSON.parse(await readFile(transportFile, "utf8"));
      for (const [key, target] of Object.entries(targets)) transports[key] = fileTransport(resolve(root, target), key);
      runArgs.push("--transports", transportFile);
    }
    const reference = await runOrganism({ manifest, args, store, transports, fns: builtinRegistry(), executors: [scriptedExecutor(responses)] });
    try {
      if (generated.has(name) && reference.outcome !== "complete") throw new Error(`source example did not complete: ${reference.outcome}`);
      const result = await native(runArgs);
      const expected = reference as unknown as Record<string, JsonValue>;
      const differences = ["manifestDigest", "manifestKey", "args", "outcome", "cells", "effects", "events", "work", "failure"]
        .filter((field) => canonicalize(result[field] ?? null) !== canonicalize(expected[field] ?? null));
      if (differences.length) {
        failed++;
        console.error(`${name}: differs in ${differences.join(", ")}`);
        for (const field of differences) console.error(JSON.stringify({ field, native: result[field], reference: expected[field] }));
        continue;
      }
      const reverse = await verifyReceipt(
        result as JsonValue,
        manifestToJson(manifest),
        new FileStore(join(temporary, name)),
        builtinRegistry(),
        transports,
      );
      if (!reverse.ok) throw new Error(`reference could not verify native receipt: ${JSON.stringify(reverse)}`);
      const receiptFile = join(temporary, `${name}.receipt.json`);
      await writeFile(receiptFile, canonicalize(expected));
      const verification = await native(["verify", receiptFile, manifestPath, "--modules", examples, "--dir", join(temporary, name)]);
      if (verification.ok !== true) throw new Error(`native could not verify reference receipt: ${JSON.stringify(verification)}`);
      const identity = await native(["digest", manifestPath]);
      if (identity.digest !== reference.manifestDigest) throw new Error("manifest identity mismatch");
      console.log(`${name}: identical semantics + receipts cross-verified`);
    } catch (error) {
      failed++;
      console.error(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`manifest: ${canonicalize(manifestToJson(manifest)).slice(0, 160)}`);
    }
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log(JSON.stringify({ examples: files.length, passed: files.length - failed, failed }));
process.exitCode = failed ? 1 : 0;
