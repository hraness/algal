/** Process parity: replays one durable process lifecycle through the
 * TypeScript `ProcessSupervisor` and the native `algal process` CLI, requiring
 * every emitted record and digest to be identical. The recovery legs plant an
 * interrupted creation marker — written by the reference runtime — into both
 * stores, so the native leg proves it accepts the reference-computed record
 * digest rather than a coincidental encoding.
 *
 *   bun scripts/process-parity.ts            # target/debug/algal
 *   ALGAL_BIN=/path/to/algal bun scripts/process-parity.ts
 *
 * Exit 0 = identical outputs on every step; nonzero prints the first
 * divergence. */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ProcessSupervisor, parseProcessRecord } from "../src/process";
import { manifestToJson, parseOrganismManifest } from "../src/contract";
import { digestCanonical } from "../src/digest";
import { canonicalize, type JsonValue } from "../src/values";

const root = resolve(import.meta.dir, "..");
const binary = process.env.ALGAL_BIN ?? join(root, "target/debug/algal");
const temporary = await mkdtemp(join(tmpdir(), "algal-process-parity-"));
const tsDir = join(temporary, "ts");
const nativeDir = join(temporary, "native");
await mkdir(tsDir, { recursive: true });
await mkdir(nativeDir, { recursive: true });

const manifest = parseOrganismManifest({
  contract: "algal.organism.v1",
  key: "organism:process-parity",
  name: "process parity",
  cells: [
    {
      id: "out",
      kind: "const",
      outputs: { value: { type: "json", value: "ok" } },
    },
  ],
  edges: [],
});
const manifestFile = join(temporary, "manifest.json");
await writeFile(manifestFile, canonicalize(manifestToJson(manifest)));

const service = new ProcessSupervisor(tsDir);
const runNativeAttempt = async (args: string[]) => {
  const proc = Bun.spawn([binary, "--dir", nativeDir, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, code };
};
const runNative = async (args: string[]) => {
  const { stdout, stderr, code } = await runNativeAttempt(args);
  if (code !== 0)
    throw new Error(
      `native ${args.join(" ")} failed (${code}): ${stderr.trim()}`,
    );
  return JSON.parse(stdout) as unknown;
};

/** Fabricate an interrupted creation exactly as `create` would have left it. */
const interrupted = async (
  name: string,
  recordDigest: string | undefined,
  extra: string[] = [],
) => {
  for (const dir of [tsDir, nativeDir]) {
    const path = join(dir, "processes", name);
    await mkdir(path, { recursive: true });
    if (recordDigest !== undefined)
      await writeFile(
        join(path, ".creating.json"),
        canonicalize({
          contract: "algal.process-creation.v1",
          name,
          record: recordDigest,
        } as JsonValue),
      );
    for (const entry of extra) await writeFile(join(path, entry), "foreign");
  }
};

const intendedRecordDigest = (name: string) =>
  digestCanonical(
    JSON.parse(
      JSON.stringify(
        parseProcessRecord({
          contract: "algal.process.v1",
          name,
          manifestDigest: digestCanonical(manifestToJson(manifest)),
          args: {},
          maxGenerations: 16,
          generation: 0,
          status: "ready",
          wake: [],
        }),
      ),
    ) as JsonValue,
  );

const steps: {
  name: string;
  ts: () => Promise<unknown>;
  native: () => Promise<string[]> | string[];
  fails?: boolean;
  before?: () => Promise<void>;
}[] = [
  {
    name: "create",
    ts: async () => service.create("worker", manifest),
    native: () => ["process", "create", "worker", manifestFile],
  },
  {
    name: "inspect",
    ts: async () => service.inspect("worker"),
    native: () => ["process", "inspect", "worker"],
  },
  {
    name: "list",
    ts: async () => ({ processes: await service.list() }),
    native: () => ["process", "list"],
  },
  {
    name: "tick",
    ts: async () => service.tick("worker"),
    native: () => ["process", "tick", "worker"],
  },
  {
    name: "inspect-settled",
    ts: async () => service.inspect("worker"),
    native: () => ["process", "inspect", "worker"],
  },
  {
    name: "verify",
    ts: async () => service.verify("worker"),
    native: () => ["process", "verify", "worker"],
  },
  {
    name: "tick-terminal",
    ts: async () => service.tick("worker"),
    native: () => ["process", "tick", "worker"],
    fails: true,
  },
  {
    name: "journal-without-intent",
    ts: async () => service.journal("worker"),
    native: () => ["process", "journal", "worker"],
    fails: true,
  },
  {
    name: "schedule-idle",
    ts: async () => service.schedule(),
    native: () => ["process", "schedule"],
  },
  {
    name: "create-duplicate",
    ts: async () => service.create("worker", manifest),
    native: () => ["process", "create", "worker", manifestFile],
    fails: true,
  },
  {
    name: "create-resume-interrupted",
    before: async () => interrupted("ghost", intendedRecordDigest("ghost")),
    ts: async () => service.create("ghost", manifest),
    native: () => ["process", "create", "ghost", manifestFile],
  },
  {
    name: "inspect-resumed",
    ts: async () => service.inspect("ghost"),
    native: () => ["process", "inspect", "ghost"],
  },
  {
    name: "create-bare-interrupted",
    before: async () => interrupted("bare", undefined),
    ts: async () => service.create("bare", manifest),
    native: () => ["process", "create", "bare", manifestFile],
    fails: true,
  },
  {
    name: "create-mismatched-marker",
    before: async () => interrupted("mismatch", intendedRecordDigest("other")),
    ts: async () => service.create("mismatch", manifest),
    native: () => ["process", "create", "mismatch", manifestFile],
    fails: true,
  },
  {
    name: "create-foreign-entry",
    before: async () =>
      interrupted("foreign", intendedRecordDigest("foreign"), ["foreign.txt"]),
    ts: async () => service.create("foreign", manifest),
    native: () => ["process", "create", "foreign", manifestFile],
    fails: true,
  },
  {
    // Retained headless directories keep their names and still fail closed on
    // inspection paths; enumeration never invents a state for them.
    name: "list-with-retained-interruptions",
    ts: async () => ({ processes: await service.list() }),
    native: () => ["process", "list"],
    fails: true,
  },
  {
    name: "schedule-with-retained-interruptions",
    ts: async () => service.schedule(),
    native: () => ["process", "schedule"],
    fails: true,
  },
];

const same = (a: unknown, b: unknown) =>
  canonicalize(a as JsonValue) === canonicalize(b as JsonValue);
let checked = 0;
try {
  for (const step of steps) {
    if (step.before) await step.before();
    const args = await step.native();
    if (step.fails) {
      const tsRejected = await step.ts().then(
        () => false,
        () => true,
      );
      const { code } = await runNativeAttempt(args);
      if (!tsRejected || code === 0) {
        console.error(
          `PARITY DIVERGENCE at "${step.name}": expected rejection — ts ${
            tsRejected ? "rejected" : "accepted"
          }, native exit ${code}`,
        );
        process.exit(1);
      }
      checked++;
      continue;
    }
    const tsOut = await step.ts();
    const nativeOut = await runNative(args);
    if (!same(tsOut, nativeOut)) {
      console.error(`PARITY DIVERGENCE at "${step.name}"`);
      console.error(`  ts:     ${canonicalize(tsOut as JsonValue)}`);
      console.error(`  native: ${canonicalize(nativeOut as JsonValue)}`);
      process.exit(1);
    }
    checked++;
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log(
  `process parity: ${checked} steps identical across TypeScript and native`,
);
