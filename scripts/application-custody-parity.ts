/** Required all-eight-runtime custody schedules. Build the native integration
 * test with cargo --no-run --message-format=json, then provide its exact
 * executable as ALGAL_CUSTODY_TEST_BIN. Missing native evidence is an error. */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { allowCustody, custodyControl, custodyHash, readCustodyJson, seedCustody, writeCustodyJson, type CustodyActor, type CustodyPhase } from "../src/fixtures/application-custody";
import { ApplicationService } from "../src/application";
import type { JsonValue } from "../src/values";

type Runtime = "bun" | "native";
const native = process.env.ALGAL_CUSTODY_TEST_BIN;
if (!native || !isAbsolute(native) || !(await stat(native)).isFile()) throw new Error("ALGAL_CUSTODY_TEST_BIN must name the exact built native application_custody test executable");
const nativeSha256 = createHash("sha256").update(await readFile(native)).digest("hex");
const helper = join(import.meta.dir, "../src/fixtures/application-custody-child.ts");
const actors: CustodyActor[] = ["creator", "late", "live"];

async function bounded<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Owned custody child deadline exceeded")), ms); })]); }
  finally { clearTimeout(timer); }
}
function launch(runtime: Runtime, directory: string, actor: CustodyActor, token: string) {
  const command = runtime === "bun" ? [process.execPath, helper, directory, actor, token]
    : [native!, "--exact", "application_custody_child", "--ignored", "--nocapture"];
  const child = Bun.spawn(command, { stdin: "ignore", stdout: "pipe", stderr: "pipe", env: {
    ...process.env, ALGAL_CUSTODY_DIRECTORY: directory, ALGAL_CUSTODY_ACTOR: actor, ALGAL_CUSTODY_TOKEN: token,
  } });
  async function drain(stream: ReadableStream<Uint8Array>) {
    const chunks: Uint8Array[] = []; let bytes = 0;
    try {
      for await (const chunk of stream) {
        bytes += chunk.length;
        if (bytes > 65_536) { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); return { error: "Custody child output exceeded bound", text: "" }; }
        chunks.push(chunk);
      }
      return { text: Buffer.concat(chunks).toString("utf8") };
    } catch (error) { return { text: "", error: String(error) }; }
  }
  const output = Promise.all([drain(child.stdout), drain(child.stderr)]);
  return { child, output, actor, runtime };
}
type Owned = ReturnType<typeof launch>;
async function finish(owned: Owned, cleanup = false) {
  if (cleanup && owned.child.exitCode === null && owned.child.signalCode === null) owned.child.kill("SIGKILL");
  const code = await bounded(owned.child.exited, cleanup ? 2000 : 10_000);
  const streams = await bounded(owned.output, 2000);
  if (!cleanup) {
    assert.equal(code, 0, `${owned.runtime}/${owned.actor}: ${streams.map(s => s.text).join("\n")}`);
    for (const stream of streams) assert.equal(stream.error, undefined);
    assert.equal(streams[1]!.text, "");
  }
}
async function collect(children: Owned[]) {
  const collected = await Promise.allSettled(children.map(child => finish(child, true)));
  const failed = collected.find(result => result.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
}
async function record(directory: string, owned: Owned, phase: string, token: string): Promise<Record<string, JsonValue>> {
  const deadline = performance.now() + 10_000;
  for (;;) {
    try {
      const value = await readCustodyJson(custodyControl(directory, owned.actor, phase));
      assert(value && typeof value === "object" && !Array.isArray(value));
      assert.equal(value.token, token); assert.equal(value.actor, owned.actor); assert.equal(value.pid, owned.child.pid);
      if (phase !== "result") assert.equal(value.phase, phase);
      return value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
    }
    if (owned.child.exitCode !== null || owned.child.signalCode !== null) throw new Error(`Child exited before ${owned.actor}:${phase}`);
    if (performance.now() >= deadline) throw new Error(`Missing ${owned.actor}:${phase} barrier`);
    await Bun.sleep(5);
  }
}
async function release(directory: string, actor: CustodyActor, phase: CustodyPhase, token: string) {
  await writeCustodyJson(custodyControl(directory, actor, `${phase}.release`), { actor, phase, token });
}

async function schedule(runtimes: Runtime[]) {
  const root = await mkdtemp(join(tmpdir(), "algal-custody-matrix-"));
  const children: Owned[] = [];
  const token = randomBytes(24).toString("hex");
  try {
    const oracle = await seedCustody(join(root, "oracle"));
    const h0 = (await oracle.service.create(oracle.create)).digest;
    const directory = join(root, "actual");
    const { service, create } = await seedCustody(directory);
    const lateCommand = { ...create, kind: "memory", expectedHead: h0, operation: custodyHash("late") };
    const liveCommand = { ...lateCommand, operation: custodyHash("live") };
    await mkdir(join(directory, "custody-control"));
    await writeCustodyJson(join(directory, "custody-control/scenario.json"), { creator: create, late: lateCommand, live: liveCommand } as unknown as JsonValue);
    const start = (actor: CustodyActor) => { const child = launch(runtimes[actors.indexOf(actor)]!, directory, actor, token); children.push(child); return child; };
    const late = start("late"); await record(directory, late, "selected", token);
    const creator = start("creator"), genesis = await record(directory, creator, "result", token); await finish(creator);
    assert.equal(genesis.ok, true); assert.equal(genesis.digest, h0);
    const live = start("live"); await record(directory, live, "admitted", token);
    await release(directory, "late", "selected", token);
    const lateResult = await record(directory, late, "result", token); await finish(late);
    await release(directory, "live", "admitted", token);
    const liveResult = await record(directory, live, "result", token); await finish(live);
    assert.equal(liveResult.ok, true);
    assert.equal(liveResult.previous, h0);
    const head = liveResult.digest;
    assert(typeof head === "string" && /^sha256:[a-f0-9]{64}$/.test(head));
    assert.equal(lateResult.ok, false, `acknowledged siblings: ${JSON.stringify({ lateResult, liveResult })}`);
    assert.match(String(lateResult.message), /held by another live operation/);
    const reopened = new ApplicationService(directory, allowCustody);
    assert.deepEqual((await reopened.history("fixture")).map(row => row.digest), [h0, head]);
    await assert.rejects(service.commit(lateCommand), /Stale application head/);
    assert.equal((await reopened.commit(liveCommand)).digest, head);
    return { runtimes, ok: true, initial: h0, head, observed: ["late-selected", "creator-returned", "live-admitted", "late-rejected", "live-returned", "reopened-linear-history", "stale-late-rejected", "live-idempotent"] };
  } finally {
    // Only direct, owned fixture processes are used; they spawn no descendants.
    // Observe exit and captured EOF before removing their filesystem namespace.
    await collect(children);
    await rm(root, { recursive: true, force: true });
  }
}

const profiles: JsonValue[] = [];
for (const creator of ["bun", "native"] as const) for (const late of ["bun", "native"] as const) for (const live of ["bun", "native"] as const) {
  const runtimes = [creator, late, live];
  try { profiles.push(await schedule(runtimes)); }
  catch (error) { profiles.push({ runtimes, ok: false, error: String(error instanceof Error ? error.message : error) }); }
}
console.log(JSON.stringify({ contract: "algal.custody-test.v1", nativeSha256, profiles }));
if (profiles.some(profile => (profile as Record<string, JsonValue>).ok !== true)) process.exitCode = 1;
