import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TriageHost } from "../local-triage/host";
import { proposeWithApple } from "./apple";

test("a failed admitted native attempt is retained, cannot be resent, and does not mutate task state", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-triage-apple-test-"));
  try {
    const host = new TriageHost(join(directory, "host")), original = await host.initialize();
    const options = { native: "/usr/bin/false", bridge: "/usr/bin/true", attemptDirectory: join(directory, "attempt"), instruction: "Group tasks by priority." };
    const results = await Promise.allSettled([proposeWithApple(host, options), proposeWithApple(host, options)]);
    expect(results.every(result => result.status === "rejected")).toBe(true);
    expect(await readFile(join(options.attemptDirectory, "admission.json"), "utf8")).toContain('"maxCalls":1');
    expect(await readFile(join(options.attemptDirectory, "unsettled.json"), "utf8")).toContain("inspect-retained-receipt-never-resend");
    await expect(proposeWithApple(host, options)).rejects.toThrow("already admitted");
    expect((await host.capture()).head).toBe(original.head);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);
