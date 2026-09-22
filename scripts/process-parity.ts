/** Process parity: replays durable process lifecycles through the TypeScript
 * `ProcessSupervisor` and the native `algal process` CLI, requiring every
 * emitted record and digest to be identical. The suspension suite shares one
 * mailbox capability set across both stores so the wake handles — and every
 * digest that covers them — stay comparable; the recovery legs plant an
 * interrupted creation marker written by the reference runtime into both
 * stores, so the native leg proves it accepts the reference-computed record
 * digest rather than a coincidental encoding. The evidence legs export a
 * portable bundle per runtime and verify it store-free — the native
 * `verify-evidence` CLI takes no `--dir`, so `bare` steps spawn it without
 * host flags. The agent suite drives a shared command executor through the
 * EX_TEMPFAIL suspend contract, so suspended and resumed generations carry
 * identical `cmd:` executor identities and configuration digests.
 *
 *   bun scripts/process-parity.ts            # target/debug/algal
 *   ALGAL_BIN=/path/to/algal bun scripts/process-parity.ts
 *
 * Exit 0 = identical outputs on every step; nonzero prints the first
 * divergence. */
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { commandExecutor } from "../src/effects";
import { ProcessSupervisor, parseProcessRecord } from "../src/process";
import { ProcessJournal } from "../src/process-journal";
import { manifestToJson, parseOrganismManifest } from "../src/contract";
import { digestCanonical, type Digest } from "../src/digest";
import { FileMailboxService } from "../src/mailbox";
import {
  exportProcessEvidence,
  verifyProcessEvidence,
} from "../src/process-evidence";
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
const runNativeAttempt = async (
  args: string[],
  dir = nativeDir,
  bare = false,
) => {
  // `verify-evidence` is store-free: the native CLI rejects every flag,
  // including --dir, so bare steps spawn without it.
  const proc = Bun.spawn(
    bare ? [binary, ...args] : [binary, "--dir", dir, ...args],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, code };
};
const runNative = async (args: string[], dir = nativeDir, bare = false) => {
  const { stdout, stderr, code } = await runNativeAttempt(args, dir, bare);
  if (code !== 0)
    throw new Error(
      `native ${args.join(" ")} failed (${code}): ${stderr.trim()}`,
    );
  return JSON.parse(stdout) as unknown;
};

/* Suspension/wake coverage runs in a second store pair. Mailbox capability
 * nonces are minted randomly, so the reference runtime creates the mailbox once
 * and its durable `capabilities/` + `mailboxes/` state is copied into the
 * native store — both runtimes then resolve identical handles and every record
 * digest stays comparable (this also proves native `resolve` accepts
 * reference-written capability records). */
const tsMb = join(temporary, "ts-mb");
const nativeMb = join(temporary, "native-mb");
await mkdir(tsMb, { recursive: true });
await mkdir(nativeMb, { recursive: true });
const mailboxes = new FileMailboxService(tsMb);
const box = await mailboxes.create("inbox");
const outbox = await mailboxes.create("outbox");
for (const sub of ["capabilities", "mailboxes"]) {
  await cp(join(tsMb, sub), join(nativeMb, sub), { recursive: true });
}
const sleeperService = new ProcessSupervisor(tsMb);
const journaledService = new ProcessSupervisor(tsMb, {
  journal: { maxRecoveries: 2 },
});

const sleeper = parseOrganismManifest({
  contract: "algal.organism.v1",
  key: "organism:process-parity-sleeper",
  name: "process parity sleeper",
  cells: [
    {
      id: "src",
      kind: "input",
      outputs: { inbox: { type: "cap", capability: "mailbox-receive" } },
    },
    { id: "wait", kind: "tool", tool: "mailbox.receive.v1" },
  ],
  edges: [
    {
      from: { cell: "src", port: "inbox" },
      to: { cell: "wait", port: "mailbox" },
    },
  ],
});
const sleeperFile = join(temporary, "sleeper.json");
await writeFile(sleeperFile, canonicalize(manifestToJson(sleeper)));
const sleeperArgsFile = join(temporary, "sleeper-args.json");
await writeFile(
  sleeperArgsFile,
  canonicalize({ src: { inbox: box.receive } } as JsonValue),
);
const sendFile = join(temporary, "send.json");
await writeFile(sendFile, canonicalize({ approve: true } as JsonValue));
const wakeFile = join(temporary, "wake.json");
await writeFile(wakeFile, canonicalize({ wake: true } as JsonValue));
const wakeKey = digestCanonical({
  contract: "algal.process-parity-send.v1",
  seq: 1,
} as JsonValue);
const wakeKey2 = digestCanonical({
  contract: "algal.process-parity-send.v1",
  seq: 2,
} as JsonValue);
const wrongKey = digestCanonical({
  contract: "algal.process-parity-send.v1",
  seq: 3,
} as JsonValue);

/* A forwarder completes a journaled `mailbox.send` effect, then suspends on an
 * empty `mailbox.receive` — the journal holds a completed send entry and a
 * started receive entry, all deterministic. */
const forwarder = parseOrganismManifest({
  contract: "algal.organism.v1",
  key: "organism:process-parity-forwarder",
  name: "process parity forwarder",
  cells: [
    {
      id: "a-source",
      kind: "input",
      outputs: {
        inbox: { type: "cap", capability: "mailbox-receive" },
        outbox: { type: "cap", capability: "mailbox-send" },
        payload: { type: "json" },
      },
    },
    { id: "b-send", kind: "tool", tool: "mailbox.send.v1" },
    { id: "c-wait", kind: "tool", tool: "mailbox.receive.v1" },
  ],
  edges: [
    {
      from: { cell: "a-source", port: "outbox" },
      to: { cell: "b-send", port: "mailbox" },
    },
    {
      from: { cell: "a-source", port: "payload" },
      to: { cell: "b-send", port: "message" },
    },
    {
      from: { cell: "a-source", port: "inbox" },
      to: { cell: "c-wait", port: "mailbox" },
    },
  ],
});
const forwarderFile = join(temporary, "forwarder.json");
await writeFile(forwarderFile, canonicalize(manifestToJson(forwarder)));
const forwarderArgsFile = join(temporary, "forwarder-args.json");
const forwarderArgs = {
  "a-source": {
    inbox: outbox.receive,
    outbox: box.send,
    payload: { op: "ping" },
  },
} as JsonValue;
await writeFile(forwarderArgsFile, canonicalize(forwarderArgs));

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

/* Uncertain-intent recovery reuses the shared-capability stores. The fixture
 * plants exactly what `tick` publishes before a host crash — the generation-1
 * intent record in CAS, a head naming it, and a dispatch journal bound to the
 * intent — so `recover` re-dispatches the identical intent on both runtimes. */
let runnerIntent: Digest = "sha256:" as Digest;
const runnerManifestDigest = digestCanonical(manifestToJson(manifest));
const plantUncertainRunner = async () => {
  const intent = JSON.parse(
    JSON.stringify(
      parseProcessRecord({
        contract: "algal.process.v1",
        name: "runner",
        manifestDigest: runnerManifestDigest,
        args: {},
        maxGenerations: 16,
        generation: 1,
        status: "uncertain",
        wake: [],
        previous: intendedRecordDigest("runner"),
        cause: "start",
      }),
    ),
  ) as JsonValue;
  const intentDigest = digestCanonical(intent);
  for (const dir of [tsMb, nativeMb]) {
    await writeFile(
      join(dir, "values", `${intentDigest.slice(7)}.json`),
      canonicalize(intent),
    );
    await writeFile(
      join(dir, "processes", "runner", "head.json"),
      canonicalize({
        contract: "algal.process-head.v1",
        name: "runner",
        record: intentDigest,
      } as JsonValue),
    );
    await ProcessJournal.create(dir, "runner", intentDigest, runnerManifestDigest);
  }
  runnerIntent = intentDigest;
};
const wrongIntent = digestCanonical({
  contract: "algal.process-parity-intent.v1",
} as JsonValue);

/* An agent cell whose executor suspends: exit 75 (EX_TEMPFAIL) is the shared
   "answer not ready" contract on both runtimes. A single counter file — the
   same absolute path embedded in one shared command string — suspends the
   first two calls (the TypeScript and native suspend legs run back to back)
   and answers the two resume legs. Keeping the command byte-identical keeps
   the `cmd:<digest>` executor identity identical across runtimes. */
const tsAgent = join(temporary, "ts-agent");
const nativeAgent = join(temporary, "native-agent");
await mkdir(tsAgent, { recursive: true });
await mkdir(nativeAgent, { recursive: true });
const GATE_CMD = `cat >/dev/null; n=$(cat "${join(temporary, "gate")}" 2>/dev/null || echo 0); echo $((n + 1)) > "${join(temporary, "gate")}"; if [ "$n" -lt 2 ]; then exit 75; fi; printf '"done"'`;
const agentService = new ProcessSupervisor(tsAgent, {
  executors: [commandExecutor(GATE_CMD)],
});
const agent = parseOrganismManifest({
  contract: "algal.organism.v1",
  key: "organism:process-parity-agent",
  name: "process parity agent",
  cells: [
    { id: "worker", kind: "agent", prompt: "work", output: { kind: "text" } },
  ],
  edges: [],
});
const agentFile = join(temporary, "agent.json");
await writeFile(agentFile, canonicalize(manifestToJson(agent)));

/* Portable evidence legs: each runtime exports the same process history to a
   canonical bundle, then verifies it store-free — the native verify-evidence
   CLI rejects every flag, so `bare` steps spawn it without --dir. */
let workerEvidence: JsonValue | undefined;
let forwarderEvidence: JsonValue | undefined;
const workerEvidenceFile = join(temporary, "worker-evidence.json");
const forwarderEvidenceFile = join(temporary, "forwarder-evidence.json");
const tamperedEvidenceFile = join(temporary, "tampered-evidence.json");

const steps: {
  name: string;
  ts: () => Promise<unknown>;
  native: () => Promise<string[]> | string[];
  dir?: string;
  bare?: boolean;
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
  /* Mailbox suspension/wake lifecycle on the shared-capability store pair:
   * create → tick suspends on the empty mailbox → scheduler stays idle → a
   * manual tick re-suspends → send → scheduler wakes with the receive handle
   * as cause → verify replays all three generations offline. */
  {
    name: "create-sleeper",
    dir: nativeMb,
    ts: async () =>
      sleeperService.create("sleeper", sleeper, {
        src: { inbox: box.receive },
      }),
    native: () => [
      "process",
      "create",
      "sleeper",
      sleeperFile,
      "--args",
      sleeperArgsFile,
    ],
  },
  {
    name: "tick-suspends",
    dir: nativeMb,
    ts: async () => sleeperService.tick("sleeper"),
    native: () => ["process", "tick", "sleeper"],
  },
  {
    name: "inspect-suspended",
    dir: nativeMb,
    ts: async () => sleeperService.inspect("sleeper"),
    native: () => ["process", "inspect", "sleeper"],
  },
  {
    name: "schedule-suspended-idle",
    dir: nativeMb,
    ts: async () => sleeperService.schedule(),
    native: () => ["process", "schedule"],
  },
  {
    // A manual tick is a legal wake cause on a suspended process: it re-runs
    // the manifest and re-suspends on the still-empty mailbox.
    name: "tick-manual-resuspends",
    dir: nativeMb,
    ts: async () => sleeperService.tick("sleeper"),
    native: () => ["process", "tick", "sleeper"],
  },
  {
    name: "mailbox-send",
    dir: nativeMb,
    ts: async () => mailboxes.send(box.send, { approve: true }, wakeKey),
    native: () => [
      "mailbox",
      "send",
      box.send,
      sendFile,
      "--idempotency-key",
      wakeKey,
    ],
  },
  {
    name: "mailbox-send-idempotent",
    dir: nativeMb,
    ts: async () => mailboxes.send(box.send, { approve: true }, wakeKey),
    native: () => [
      "mailbox",
      "send",
      box.send,
      sendFile,
      "--idempotency-key",
      wakeKey,
    ],
  },
  {
    // The send capability class is closed: a receive handle cannot send.
    name: "mailbox-send-wrong-capability",
    dir: nativeMb,
    ts: async () => mailboxes.send(box.receive, { approve: true }, wrongKey),
    native: () => [
      "mailbox",
      "send",
      box.receive,
      sendFile,
      "--idempotency-key",
      wrongKey,
    ],
    fails: true,
  },
  {
    name: "schedule-wakes",
    dir: nativeMb,
    ts: async () => sleeperService.schedule(),
    native: () => ["process", "schedule"],
  },
  {
    name: "inspect-complete",
    dir: nativeMb,
    ts: async () => sleeperService.inspect("sleeper"),
    native: () => ["process", "inspect", "sleeper"],
  },
  {
    name: "verify-sleeper",
    dir: nativeMb,
    ts: async () => sleeperService.verify("sleeper"),
    native: () => ["process", "verify", "sleeper"],
  },
  {
    name: "mailbox-receive-empty",
    dir: nativeMb,
    ts: async () => mailboxes.receive(box.receive),
    native: () => ["mailbox", "receive", box.receive],
    fails: true,
  },
  /* Uncertain-intent recovery: `create-runner` leaves a ready generation, then
   * the before hook publishes the exact uncertain intent and journal a crashed
   * dispatch would have left. `recover` must bind that intent digest exactly —
   * a settled sibling, a wrong digest, tick and schedule all reject. */
  {
    name: "create-runner",
    dir: nativeMb,
    ts: async () => sleeperService.create("runner", manifest),
    native: () => ["process", "create", "runner", manifestFile],
  },
  {
    name: "tick-uncertain-blocked",
    dir: nativeMb,
    before: plantUncertainRunner,
    ts: async () => sleeperService.tick("runner"),
    native: () => ["process", "tick", "runner"],
    fails: true,
  },
  {
    // The scheduler skips an uncertain process entirely: it needs explicit
    // recovery, never an automatic retry, and never blocks other candidates.
    name: "schedule-uncertain-skipped",
    dir: nativeMb,
    ts: async () => sleeperService.schedule(),
    native: () => ["process", "schedule"],
  },
  {
    name: "journal-uncertain",
    dir: nativeMb,
    ts: async () => sleeperService.journal("runner"),
    native: () => ["process", "journal", "runner"],
  },
  {
    // Recovery cannot attach to a settled sibling's head.
    name: "recover-settled-blocked",
    dir: nativeMb,
    ts: async () => sleeperService.recover("sleeper", runnerIntent),
    native: () => [
      "process",
      "recover",
      "sleeper",
      "--expected-intent",
      runnerIntent,
    ],
    fails: true,
  },
  {
    name: "recover-wrong-intent",
    dir: nativeMb,
    ts: async () => sleeperService.recover("runner", wrongIntent),
    native: () => [
      "process",
      "recover",
      "runner",
      "--expected-intent",
      wrongIntent,
    ],
    fails: true,
  },
  {
    name: "recover-runner",
    dir: nativeMb,
    ts: async () => sleeperService.recover("runner", runnerIntent),
    native: () => [
      "process",
      "recover",
      "runner",
      "--expected-intent",
      runnerIntent,
    ],
  },
  {
    name: "inspect-recovered",
    dir: nativeMb,
    ts: async () => sleeperService.inspect("runner"),
    native: () => ["process", "inspect", "runner"],
  },
  {
    name: "verify-runner",
    dir: nativeMb,
    ts: async () => sleeperService.verify("runner"),
    native: () => ["process", "verify", "runner"],
  },
  {
    // The settled record's `previous` names the intent digest, so the intent
    // stays reachable in the chain and `journal` describes its completed
    // effect records after recovery.
    name: "journal-settled",
    dir: nativeMb,
    ts: async () => sleeperService.journal("runner"),
    native: () => ["process", "journal", "runner"],
  },
  /* Journaled dispatch: the forwarder's send completes and journals a
   * completed effect entry before the receive suspends as a `started` entry.
   * `journal` describes both, then an ordinary send wakes it through the
   * scheduler on an unjournaled generation. */
  {
    name: "create-forwarder",
    dir: nativeMb,
    ts: async () => sleeperService.create("forwarder", forwarder, forwarderArgs),
    native: () => [
      "process",
      "create",
      "forwarder",
      forwarderFile,
      "--args",
      forwarderArgsFile,
    ],
  },
  {
    name: "tick-journal-suspends",
    dir: nativeMb,
    ts: async () => journaledService.tick("forwarder"),
    native: () => ["process", "tick", "forwarder", "--journal"],
  },
  {
    name: "journal-forwarder-suspended",
    dir: nativeMb,
    ts: async () => sleeperService.journal("forwarder"),
    native: () => ["process", "journal", "forwarder"],
  },
  {
    name: "send-to-outbox",
    dir: nativeMb,
    ts: async () => mailboxes.send(outbox.send, { wake: true }, wakeKey2),
    native: () => [
      "mailbox",
      "send",
      outbox.send,
      wakeFile,
      "--idempotency-key",
      wakeKey2,
    ],
  },
  {
    name: "schedule-wakes-forwarder",
    dir: nativeMb,
    ts: async () => sleeperService.schedule(),
    native: () => ["process", "schedule"],
  },
  {
    name: "inspect-forwarder",
    dir: nativeMb,
    ts: async () => sleeperService.inspect("forwarder"),
    native: () => ["process", "inspect", "forwarder"],
  },
  {
    name: "verify-forwarder",
    dir: nativeMb,
    ts: async () => sleeperService.verify("forwarder"),
    native: () => ["process", "verify", "forwarder"],
  },
  {
    // `journal` resolves the latest uncertain intent in the chain — the
    // unjournaled wake tick — and finds no journal for it, even though an
    // earlier journaled intent exists. Latest-intent-only is the contract.
    name: "journal-forwarder-latest-unjournaled",
    dir: nativeMb,
    ts: async () => sleeperService.journal("forwarder"),
    native: () => ["process", "journal", "forwarder"],
    fails: true,
  },
  {
    name: "export-worker",
    ts: async () => {
      workerEvidence = (await exportProcessEvidence(
        await service.inspect("worker"),
        service.store,
        service.evidenceTools(),
      )) as unknown as JsonValue;
      return workerEvidence;
    },
    native: () => ["process", "export", "worker"],
  },
  {
    name: "verify-evidence-worker",
    bare: true,
    before: async () =>
      writeFile(workerEvidenceFile, canonicalize(workerEvidence!)),
    ts: async () => verifyProcessEvidence(workerEvidence),
    native: () => ["process", "verify-evidence", workerEvidenceFile],
  },
  {
    name: "export-forwarder",
    dir: nativeMb,
    ts: async () => {
      forwarderEvidence = (await exportProcessEvidence(
        await sleeperService.inspect("forwarder"),
        sleeperService.store,
        sleeperService.evidenceTools(),
      )) as unknown as JsonValue;
      return forwarderEvidence;
    },
    native: () => ["process", "export", "forwarder"],
  },
  {
    name: "verify-evidence-forwarder",
    bare: true,
    before: async () =>
      writeFile(forwarderEvidenceFile, canonicalize(forwarderEvidence!)),
    ts: async () => verifyProcessEvidence(forwarderEvidence),
    native: () => ["process", "verify-evidence", forwarderEvidenceFile],
  },
  {
    // A foreign field fails the closed evidence parser on both runtimes.
    name: "verify-evidence-tampered",
    bare: true,
    fails: true,
    before: async () =>
      writeFile(
        tamperedEvidenceFile,
        canonicalize({ ...(workerEvidence as object), injected: 1 }),
      ),
    ts: async () =>
      verifyProcessEvidence({ ...(workerEvidence as object), injected: 1 }),
    native: () => ["process", "verify-evidence", tamperedEvidenceFile],
  },
  {
    name: "create-agent",
    dir: nativeAgent,
    ts: async () => agentService.create("agent", agent),
    native: () => ["process", "create", "agent", agentFile],
  },
  {
    // The executor exits 75 on its first call — a durable agent suspension.
    name: "tick-agent-suspends",
    dir: nativeAgent,
    ts: async () => agentService.tick("agent"),
    native: () => ["process", "tick", "agent", "--executor-cmd", GATE_CMD],
  },
  {
    name: "inspect-agent-suspended",
    dir: nativeAgent,
    ts: async () => agentService.inspect("agent"),
    native: () => ["process", "inspect", "agent"],
  },
  {
    // Executor suspension carries no wake capabilities — nothing can
    // schedule it; only a manual tick resumes the checkpoint.
    name: "schedule-agent-idle",
    dir: nativeAgent,
    ts: async () => agentService.schedule(),
    native: () => ["process", "schedule"],
  },
  {
    name: "tick-agent-resumes",
    dir: nativeAgent,
    ts: async () => agentService.tick("agent"),
    native: () => ["process", "tick", "agent", "--executor-cmd", GATE_CMD],
  },
  {
    name: "verify-agent",
    dir: nativeAgent,
    ts: async () => agentService.verify("agent"),
    native: () => ["process", "verify", "agent"],
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
    try {
      if (step.before) await step.before();
      const args = await step.native();
      if (step.fails) {
        const tsRejected = await step.ts().then(
          () => false,
          () => true,
        );
        const { code } = await runNativeAttempt(args, step.dir, step.bare);
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
      const nativeOut = await runNative(args, step.dir, step.bare);
      if (!same(tsOut, nativeOut)) {
        console.error(`PARITY DIVERGENCE at "${step.name}"`);
        console.error(`  ts:     ${canonicalize(tsOut as JsonValue)}`);
        console.error(`  native: ${canonicalize(nativeOut as JsonValue)}`);
        process.exit(1);
      }
      checked++;
    } catch (error) {
      console.error(`PARITY STEP CRASHED at "${step.name}"`);
      throw error;
    }
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log(
  `process parity: ${checked} steps identical across TypeScript and native`,
);
