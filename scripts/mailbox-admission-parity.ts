// Real Bun/native custody interoperability, with no model or provider calls.
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { FileMailboxService } from "../src/mailbox";
import { boundedBytes } from "../src/io";

const repository = resolve(import.meta.dir, "..");
const native = resolve(process.env.ALGAL_BIN ?? join(repository, "target/debug/algal"));
const root = await mkdtemp(join(tmpdir(), "algal-mailbox-parity-"));
const source = join(repository, "src/mailbox.ts");
const errors: Record<string, unknown>[] = [];
let complete = false;
let child: Bun.Subprocess<"pipe", "pipe", "pipe"> | undefined;
let holderStderr: Promise<string | Error> | undefined;
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function nativeCall(args: string[]) {
  const operation = Bun.spawn([native, "--dir", root, ...args], {
    stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 5_000, killSignal: "SIGKILL",
  });
  try {
    const [code, stdout, stderr] = await Promise.all([
      operation.exited, boundedBytes(operation.stdout, 65_536, "native stdout"),
      boundedBytes(operation.stderr, 65_536, "native stderr"),
    ]);
    return { code, stdout: new TextDecoder().decode(stdout), stderr: new TextDecoder().decode(stderr) };
  } finally {
    if (operation.exitCode === null && operation.signalCode === null) operation.kill("SIGKILL");
    await operation.exited;
  }
}
function live(holder: Bun.Subprocess<"pipe", "pipe", "pipe">): void {
  check(holder.exitCode === null && holder.signalCode === null, "Bun admission holder exited before release");
  process.kill(holder.pid, 0);
}
async function ready(holder: Bun.Subprocess<"pipe", "pipe", "pipe">): Promise<void> {
  const reader = holder.stdout.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      (async () => {
        let bytes = 0;
        let line = "";
        while (true) {
          const chunk = await reader.read();
          check(!chunk.done, "Bun admission holder exited before readiness");
          bytes += chunk.value.byteLength;
          check(bytes <= 4_096, "Bun admission readiness exceeded its byte bound");
          line += new TextDecoder().decode(chunk.value);
          if (line.includes("\n")) {
            check(line.trim() === "ready", "Bun admission barrier missing");
            return;
          }
        }
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Bun admission barrier timed out")), 5_000); }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    await reader.cancel();
    reader.releaseLock();
  }
}

try {
  const binaryBefore = await stat(native);
  const binarySha256 = createHash("sha256").update(await readFile(native)).digest("hex");
  child = Bun.spawn([process.execPath, "--eval", `
    import {FileMailboxService} from ${JSON.stringify(source)};
    import {writeSync} from "node:fs";
    class Paused extends FileMailboxService {
      async inspect(name) {
        const result = await super.inspect(name);
        // The reachable stdin callback retains the pending async continuation
        // and Database. An unrelated timer alone only proves PID liveness.
        const released = new Promise(resolve => {
          process.stdin.once("data", resolve);
          process.stdin.resume();
        });
        // Run GC only after this action has suspended on the rooted promise.
        setTimeout(() => {
          Bun.gc(true);
          writeSync(1, "ready\\n");
        }, 0);
        await released;
        return result;
      }
    }
    await new Paused(${JSON.stringify(root)}).create("shared", {maxMessages:1,maxMessageBytes:32});
  `], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const holder = child;
  holderStderr = boundedBytes(holder.stderr, 65_536, "Bun admission stderr").then(
    bytes => new TextDecoder().decode(bytes),
    error => {
      if (holder.exitCode === null && holder.signalCode === null) holder.kill("SIGKILL");
      return error instanceof Error ? error : new Error(String(error));
    },
  );
  await ready(child);
  live(child);
  const markerPath = join(root, ".mailbox-admission/.lock");
  const marker = await readFile(markerPath, "utf8");
  const denied = await nativeCall(["mailbox", "create", "shared", "--max-messages", "64", "--max-message-bytes", "1024"]);
  errors.push({ phase: "native-live-contender", ...denied, holderExitCode: child.exitCode, holderSignalCode: child.signalCode });
  live(child);
  check(denied.code === 2 && denied.stderr.includes("IO_FAILED"), "native bypassed the live Bun admission lease");
  check(await readFile(markerPath, "utf8") === marker, "live owner marker changed");
  const peer = new FileMailboxService(root);
  check(await peer.inspect("shared") === undefined, "contender published a mailbox before acquiring custody");

  child.kill("SIGKILL");
  await child.exited;
  const diagnostics = await holderStderr;
  if (diagnostics instanceof Error) throw diagnostics;
  const nativeCreated = await nativeCall(["mailbox", "create", "shared", "--max-messages", "64", "--max-message-bytes", "1024"]);
  errors.push({ phase: "native-crash-takeover", ...nativeCreated });
  check(nativeCreated.code === 0, "native could not acquire custody after the owned SIGKILL");
  const owner = JSON.parse(marker) as { nonce: string };
  check(await readFile(join(root, ".mailbox-admission/owners", `${owner.nonce}.json`), "utf8") === marker, "abandoned Bun marker was not archived exactly");
  const nativeConfig: unknown = JSON.parse(nativeCreated.stdout);
  check(isDeepStrictEqual(await peer.create("shared", { maxMessages: 64, maxMessageBytes: 1024 }), nativeConfig), "Bun cannot read native admission");
  let conflict: unknown;
  try { await peer.create("shared", { maxMessages: 1, maxMessageBytes: 32 }); }
  catch (error) { conflict = error; }
  check(conflict instanceof Error && "code" in conflict && conflict.code === "PARSE_FAILED", "Bun widened native admission");

  const bunConfig = await peer.create("bun-created", { maxMessages: 2, maxMessageBytes: 64 });
  const wrong = await nativeCall(["mailbox", "create", "bun-created", "--max-messages", "4", "--max-message-bytes", "64"]);
  errors.push({ phase: "native-conflicting-bounds", ...wrong });
  check(wrong.code === 2 && wrong.stderr.includes("PARSE_FAILED"), "native widened Bun admission");
  const same = await nativeCall(["mailbox", "create", "bun-created", "--max-messages", "2", "--max-message-bytes", "64"]);
  check(same.code === 0 && isDeepStrictEqual(JSON.parse(same.stdout), bunConfig), "native cannot read Bun admission");
  const binaryAfter = await stat(native);
  check(binaryBefore.ino === binaryAfter.ino && binaryBefore.size === binaryAfter.size && binaryBefore.mtimeMs === binaryAfter.mtimeMs,
    "native binary changed during qualification");
  check(createHash("sha256").update(await readFile(native)).digest("hex") === binarySha256, "native bytes changed during qualification");
  console.log(JSON.stringify({ ok: true, contract: "algal.mailbox-admission-parity.v1", binarySha256,
    liveContention: "Bun holder / native contender", forcedGcBeforeContention: true, ownedSigkillTakeover: true,
    exactOwnerArchive: true, mutualReadback: true, conflictingBoundsRejectedBothDirections: true,
    mailboxes: (await peer.list()).map(config => config.name), modelCalls: 0 }));
  complete = true;
} finally {
  if (child !== undefined) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await child.exited;
    const stderr = await holderStderr;
    if (stderr) errors.push({ phase: "holder-stderr", stderr: stderr instanceof Error ? stderr.message : stderr });
  }
  if (complete) await rm(root, { recursive: true, force: true });
  else {
    const evidence = join(root, "qualification-failure.json");
    await writeFile(evidence, JSON.stringify({ root, native, errors, retainedEntries: await readdir(root) }, null, 2));
    console.error(`Mailbox admission failure retained at ${evidence}`);
  }
}
