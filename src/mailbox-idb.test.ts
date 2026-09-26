/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/** IndexedDbMailboxService contract tests on the fake IndexedDB harness
 * (`idb-fake.ts`). Assert the same observable behavior as the file
 * driver: deterministic digests, idempotent sends, delivery dedupe,
 * capability checks, bounds, and durable state across connections. */
import { beforeAll, describe, expect, test } from "bun:test";
import { AlgalError } from "./errors";
import { digestText, type Digest } from "./digest";
import { asIdbFactory, installFakeIdb } from "./idb-fake";
import { IndexedDbMailboxService } from "./mailbox-idb";
import type { JsonValue } from "./values";

let factory: IDBFactory;
const key = (seed: string): Digest => digestText(`mailbox-key-${seed}`);
async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "OK";
  } catch (error) {
    return error instanceof AlgalError ? error.code : String(error);
  }
}
async function open(name: string): Promise<IndexedDbMailboxService> {
  return IndexedDbMailboxService.open({ name, factory });
}

beforeAll(() => {
  factory = asIdbFactory(installFakeIdb());
});

describe("IndexedDbMailboxService", () => {
  test("create admits config and dedupes; list/inspect round-trip", async () => {
    const service = await open("t.mailbox.create");
    const config = await service.create("alpha", { maxMessages: 4, maxMessageBytes: 1024 });
    expect(config.contract).toBe("algal.mailbox.v1");
    expect(config.name).toBe("alpha");
    expect(config.maxMessages).toBe(4);
    expect(config.maxMessageBytes).toBe(1024);
    expect(config.send).toMatch(/^cap:mailbox-send:sha256:[0-9a-f]{64}$/);
    expect(config.receive).toMatch(/^cap:mailbox-receive:sha256:[0-9a-f]{64}$/);
    // Idempotent re-create returns the retained admission, not a new one.
    const again = await service.create("alpha", { maxMessages: 4, maxMessageBytes: 1024 });
    expect(again).toEqual(config);
    await service.create("beta");
    const names = (await service.list()).map((c) => c.name);
    expect(names).toEqual(["alpha", "beta"]);
    expect(await service.inspect("alpha")).toEqual(config);
    expect(await service.inspect("missing")).toBeUndefined();
    service.close();
  });
  test("create with different bounds fails on the retained admission", async () => {
    const service = await open("t.mailbox.bounds");
    await service.create("gamma", { maxMessages: 2 });
    expect(await code(service.create("gamma", { maxMessages: 3 }))).toBe("PARSE_FAILED");
    service.close();
  });
  test("send is idempotent by key and receive consumes in key order", async () => {
    const service = await open("t.mailbox.flow");
    const config = await service.create("flow");
    const value: JsonValue = { hello: "world", n: 1 };
    const mid = `sha256:${"5".repeat(64)}` as Digest;
    const first = await service.send(config.send, value, mid);
    expect(first.id).toMatch(/^sha256:[0-9a-f]{64}$/);
    // Same key + same content resolves the same message id.
    expect((await service.send(config.send, value, mid)).id).toBe(first.id);
    // Same key + different content is an immutable conflict.
    expect(await code(service.send(config.send, { other: true }, mid))).toBe("DIGEST_MISMATCH");
    // Pending order follows the idempotency-key hex, not insertion order.
    const low = `sha256:${"0".repeat(63)}1` as Digest;
    const high = `sha256:${"f".repeat(64)}` as Digest;
    const later = await service.send(config.send, "later", high);
    const earlier = await service.send(config.send, "earlier", low);
    expect(await service.hasPending(config.receive)).toBe(true);
    // low < mid < high regardless of send order.
    const r1 = await service.receive(config.receive);
    expect(r1.id).toBe(earlier.id);
    expect(r1.message).toBe("earlier");
    const r2 = await service.receive(config.receive);
    expect(r2.id).toBe(first.id);
    expect(r2.message).toEqual(value);
    const r3 = await service.receive(config.receive);
    expect(r3.id).toBe(later.id);
    expect(r3.message).toBe("later");
    expect(await service.hasPending(config.receive)).toBe(false);
    expect(await code(service.receive(config.receive))).toBe("EFFECT_SUSPENDED");
    service.close();
  });
  test("send after consume stays idempotent and empty receive suspends", async () => {
    const service = await open("t.mailbox.resume");
    const config = await service.create("resume");
    const { id } = await service.send(config.send, "v", key("r1"));
    await service.receive(config.receive);
    // Resend after consume resolves the retained id without duplicating.
    expect((await service.send(config.send, "v", key("r1"))).id).toBe(id);
    expect(await service.hasPending(config.receive)).toBe(false);
    service.close();
  });
  test("capability checks deny forged, wrong-class, and revoked handles", async () => {
    const service = await open("t.mailbox.caps");
    const config = await service.create("caps");
    // Forge an unadmitted send handle: well-formed but never issued.
    const forged = `cap:mailbox-send:sha256:${"0".repeat(64)}`;
    expect(await code(service.send(forged as never, "v", key("c1")))).toBe("CAPABILITY_DENIED");
    // The receive handle carries the wrong class for send.
    expect(await code(service.send(config.receive, "v", key("c1")))).toBe("TYPE_MISMATCH");
    // Revoked handles are denied on send and receive.
    await service.revoke(config.send);
    expect(await code(service.send(config.send, "v", key("c1")))).toBe("CAPABILITY_DENIED");
    await service.revoke(config.receive);
    expect(await code(service.receive(config.receive))).toBe("CAPABILITY_DENIED");
    service.close();
  });
  test("mailbox and message bounds fail closed", async () => {
    const service = await open("t.mailbox.limits");
    const config = await service.create("small", { maxMessages: 1, maxMessageBytes: 16 });
    await service.send(config.send, "one", key("s1"));
    expect(await code(service.send(config.send, "two", key("s2")))).toBe("MAILBOX_FULL");
    const big = await service.create("bytes", { maxMessageBytes: 8 });
    expect(await code(service.send(big.send, { padded: "too large" }, key("s3")))).toBe("BUDGET_EXHAUSTED");
    service.close();
  });
  test("state survives close and reopen on the same factory", async () => {
    const first = await open("t.mailbox.durable");
    const config = await first.create("keep");
    const { id } = await first.send(config.send, { durable: true }, key("d1"));
    first.close();
    const second = await open("t.mailbox.durable");
    expect(await second.inspect("keep")).toEqual(config);
    expect(await second.hasPending(config.receive)).toBe(true);
    const got = await second.receive(config.receive);
    expect(got.id).toBe(id);
    expect(got.message).toEqual({ durable: true });
    second.close();
  });
  test("a closed connection fails closed", async () => {
    const service = await open("t.mailbox.closed");
    await service.create("gone");
    service.close();
    expect(await code(service.list())).toBe("IO_FAILED");
  });
  test("the browser subpaths bundle from package source without Node or Bun imports", async () => {
    const consumer = "idb-consumer.ts";
    const result = await Bun.build({
      entrypoints: [consumer],
      files: {
        [consumer]: [
          'export * from "@hraness/algal/mailbox-idb";',
          'export * from "@hraness/algal/mailbox-core";',
          'export * from "@hraness/algal/host-events-idb";',
          'export * from "@hraness/algal/host-events-core";',
        ].join("\n"),
      },
      target: "browser",
      format: "esm",
      metafile: true,
      throw: false,
    });
    expect(result.logs.map((log) => `${log.level}: ${log.message}`)).toEqual([]);
    expect(result.success).toBe(true);
    const externals = Object.values(result.metafile!.inputs)
      .flatMap((input) => input.imports)
      .filter((item) => item.external)
      .map((item) => item.path);
    expect(externals).toEqual([]);
  });
});
