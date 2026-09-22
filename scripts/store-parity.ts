/** Store parity: replays the CAS store, slot, and listing commands through
 * the reference Bun CLI (`cli.ts`) and the native `algal` CLI, requiring
 * every emitted record to be identical. Unlike the process/application
 * drivers — which call the TypeScript service layer in-process — these
 * surfaces live only in the CLIs, so both legs spawn real commands. `dir`
 * fields in listing output embed the per-runtime store path and are
 * normalized before comparison.
 *
 *   bun scripts/store-parity.ts             # target/debug/algal
 *   ALGAL_BIN=/path/to/algal bun scripts/store-parity.ts
 *
 * Exit 0 = identical outputs on every step; nonzero prints the first
 * divergence. */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../src/contract";
import { digestCanonical } from "../src/digest";
import { canonicalize, type JsonValue } from "../src/values";

const root = resolve(import.meta.dir, "..");
const binary = process.env.ALGAL_BIN ?? join(root, "target/debug/algal");
const cli = join(root, "cli.ts");
const temporary = await mkdtemp(join(tmpdir(), "algal-store-parity-"));
const tsDir = join(temporary, "ts");
const nativeDir = join(temporary, "native");
await mkdir(tsDir, { recursive: true });
await mkdir(nativeDir, { recursive: true });

const manifest = parseOrganismManifest({
  contract: "algal.organism.v1",
  key: "organism:store-parity",
  name: "store parity",
  cells: [
    {
      id: "out",
      kind: "const",
      outputs: { value: { type: "json", value: "ok" } },
    },
  ],
  edges: [],
});
const manifestJson = manifestToJson(manifest);
const manifestFile = join(temporary, "manifest.json");
await writeFile(manifestFile, canonicalize(manifestJson));
const manifestRef = digestCanonical(manifestJson);
const value = { contract: "algal.store-parity.v1", n: 1 } as JsonValue;
const valueFile = join(temporary, "value.json");
await writeFile(valueFile, canonicalize(value));
const valueRef = digestCanonical(value);
const slotFile = join(temporary, "slot.json");
await writeFile(slotFile, canonicalize({ k: [1, 2] }));
const missing = `sha256:${"0".repeat(64)}`;

const spawn = async (argv: string[]) => {
  const proc = Bun.spawn(argv, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout: stdout.trim(), stderr, code };
};
// The reference CLI takes its command first, then flags; clap accepts the
// global --dir before the subcommand.
const runTs = (args: string[]) =>
  spawn([process.execPath, cli, ...args, "--dir", tsDir]);
const runNative = (args: string[]) =>
  spawn([binary, "--dir", nativeDir, ...args]);

// Listing emits carry the runtime-local store path; digests and rows are the
// comparable surface.
const normalize = (out: string): unknown => {
  const value = JSON.parse(out);
  if (value !== null && typeof value === "object" && "dir" in value)
    (value as Record<string, unknown>).dir = "<dir>";
  return value;
};

const steps: {
  name: string;
  args: () => { ts: string[]; native: string[] };
  fails?: boolean;
  before?: () => Promise<void>;
}[] = [
  {
    name: "store-put-value",
    args: () => ({ ts: ["store", "put", valueFile], native: ["store", "put", valueFile] }),
  },
  {
    name: "store-get-value",
    args: () => ({ ts: ["store", "get", valueRef], native: ["store", "get", valueRef] }),
  },
  {
    name: "store-has-value",
    args: () => ({ ts: ["store", "has", valueRef], native: ["store", "has", valueRef] }),
  },
  {
    name: "store-has-miss",
    args: () => ({ ts: ["store", "has", missing], native: ["store", "has", missing] }),
  },
  {
    name: "store-get-miss",
    fails: true,
    args: () => ({ ts: ["store", "get", missing], native: ["store", "get", missing] }),
  },
  {
    name: "slot-set",
    args: () => ({ ts: ["slot", "set", "s", slotFile], native: ["slot", "set", "s", slotFile] }),
  },
  {
    name: "slot-get",
    args: () => ({ ts: ["slot", "get", "s"], native: ["slot", "get", "s"] }),
  },
  {
    name: "slot-get-miss",
    fails: true,
    args: () => ({ ts: ["slot", "get", "absent"], native: ["slot", "get", "absent"] }),
  },
  { name: "slots", args: () => ({ ts: ["slots"], native: ["slots"] }) },
  {
    // `--write` persists the manifest and receipt into both stores; the full
    // canonical receipt is the emitted surface on both CLIs.
    name: "run",
    args: () => ({ ts: ["run", manifestFile, "--write"], native: ["run", manifestFile, "--write"] }),
  },
  { name: "runs", args: () => ({ ts: ["runs"], native: ["runs"] }) },
  { name: "manifests", args: () => ({ ts: ["manifests"], native: ["manifests"] }) },
  {
    name: "manifest",
    args: () => ({ ts: ["manifest", manifestRef], native: ["manifest", manifestRef] }),
  },
  {
    name: "manifest-miss",
    fails: true,
    args: () => ({ ts: ["manifest", missing], native: ["manifest", missing] }),
  },
  {
    name: "digest",
    args: () => ({ ts: ["digest", manifestFile], native: ["digest", manifestFile] }),
  },
];

try {
  let checked = 0;
  for (const step of steps) {
    try {
      await step.before?.();
      const args = step.args();
      const [tsOut, nativeOut] = await Promise.all([
        runTs(args.ts),
        runNative(args.native),
      ]);
      if (step.fails) {
        if (tsOut.code === 0 || nativeOut.code === 0) {
          console.error(
            `PARITY DIVERGENCE at "${step.name}": expected rejection — ts ${tsOut.code}, native ${nativeOut.code}`,
          );
          process.exit(1);
        }
        checked++;
        continue;
      }
      if (tsOut.code !== 0 || nativeOut.code !== 0) {
        console.error(
          `PARITY DIVERGENCE at "${step.name}": ts exit ${tsOut.code} ${tsOut.stderr.trim()} | native exit ${nativeOut.code} ${nativeOut.stderr.trim()}`,
        );
        process.exit(1);
      }
      const tsJson = normalize(tsOut.stdout);
      const nativeJson = normalize(nativeOut.stdout);
      if (
        canonicalize(tsJson as JsonValue) !== canonicalize(nativeJson as JsonValue)
      ) {
        console.error(`PARITY DIVERGENCE at "${step.name}"`);
        console.error(`  ts:     ${canonicalize(tsJson as JsonValue)}`);
        console.error(`  native: ${canonicalize(nativeJson as JsonValue)}`);
        process.exit(1);
      }
      checked++;
    } catch (error) {
      console.error(`PARITY STEP CRASHED at "${step.name}"`);
      throw error;
    }
  }
  console.log(
    `store parity: ${checked} steps identical across TypeScript and native`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
