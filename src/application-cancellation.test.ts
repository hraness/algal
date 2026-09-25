import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService } from "./application";
import { allowCustody, barrier, custodyDeadline, custodyHash, seedCustody } from "./fixtures/application-custody";

for (const existing of [false, true]) test(`aborted host admission settles and releases ${existing ? "existing" : "new"} application custody`, async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-admission-abort-"));
  const controller = new AbortController(), entered = barrier();
  const reason = new DOMException("owned admission cancelled", "AbortError");
  let pending: Promise<{ ok: boolean; error?: unknown }> | undefined;
  try {
    const { service, create } = await seedCustody(dir);
    const initial = existing ? await service.create(create) : null;
    const command = initial ? { ...create, operation: custodyHash("cancelled-next"), kind: "memory", expectedHead: initial.digest } : create;
    const paused = new ApplicationService(dir, { async admitCommit() {
      // Cancellation belongs to this real host callback. ApplicationService
      // itself does not expose an AbortSignal or promise-cancellation API.
      await new Promise<never>((_, reject) => {
        const aborted = () => reject(controller.signal.reason);
        controller.signal.addEventListener("abort", aborted, { once: true });
        entered.release();
      });
    } });
    pending = paused.commit(command).then(() => ({ ok: true }), error => ({ ok: false, error }));
    await custodyDeadline(entered.promise);
    await expect(service.commit(command)).rejects.toThrow("held by another live operation");
    controller.abort(reason);
    const result = await custodyDeadline(pending);
    expect(result.ok).toBe(false);
    expect(result.error).toBe(reason);
    const reopened = new ApplicationService(dir, allowCustody);
    expect((await reopened.inspect("fixture"))?.digest ?? null).toBe(initial?.digest ?? null);
    expect((await reopened.history("fixture")).map(row => row.digest)).toEqual(initial ? [initial.digest] : []);
    const next = await reopened.commit(command);
    expect(next.state.sequence).toBe(existing ? 1 : 0);
    expect(next.state.previous).toBe(initial?.digest ?? null);
    expect((await reopened.commit(command)).digest).toBe(next.digest);
  } finally {
    controller.abort(reason);
    if (pending) await custodyDeadline(pending);
    await rm(dir, { recursive: true, force: true });
  }
}, 20_000);
