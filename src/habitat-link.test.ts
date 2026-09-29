import { describe, expect, test } from "bun:test";
import { digestCanonical } from "./digest";
import { AlgalError } from "./errors";
import type { JsonValue } from "./values";
import {
  HabitatLinkClient,
  habitatInvocationDigest,
  parseHabitatAcceptance,
  parseHabitatDescriptor,
  parseHabitatInvocation,
  parseHabitatMessage,
  parseHabitatResult,
} from "./habitat-link";

const digest = (n = "a") => `sha256:${n.repeat(64)}` as const;
const invocation = () => ({
  contract: "algal.habitat-invocation.v1",
  operationId: "0123456789abcdef0123456789abcdef",
  sender: { habitat: "h_0123456789abcdef0123456789abcdef", principal: "planner" },
  target: { application: "specialist", entrypoint: "classify", manifest: digest(), interface: digest("b") },
  args: { input: "hello" },
  reply: { kind: "poll", reference: "reply-1" },
  terms: { maxWork: 1000, maxAgentCalls: 2, maxBytes: 4096, maxHops: 2 },
  grant: digest("c"),
} as const);

describe("habitat-link records", () => {
  test("parses the descriptor and all result states", () => {
    expect(parseHabitatDescriptor({
      contract: "algal.habitat-descriptor.v1",
      habitat: "h_0123456789abcdef0123456789abcdef",
      key: digest(),
      protocols: ["algal.habitat-link.v1"],
      transports: [{ kind: "http", base: "https://example.invalid/" }],
      expires: 0,
    }).habitat).toBe("h_0123456789abcdef0123456789abcdef");
    const parsed = parseHabitatInvocation(invocation());
    expect(habitatInvocationDigest(parsed)).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(parseHabitatAcceptance({ contract: "algal.habitat-acceptance.v1", operationId: invocation().operationId, invocation: digest(), status: "accepted", target: invocation().sender.habitat, process: "link-0123456789abcdef0123456789abcdef", replayed: false }).status).toBe("accepted");
    expect(parseHabitatResult({ contract: "algal.habitat-result.v1", operationId: invocation().operationId, invocation: digest(), status: "complete", process: "link-0123456789abcdef0123456789abcdef", outputs: { ok: true }, receipt: digest("d") }).outputs).toEqual({ ok: true });
    expect(parseHabitatMessage({ contract: "algal.habitat-message.v1", messageId: invocation().operationId, sender: invocation().sender, recipient: "cap:mailbox-send:sha256:" + "e".repeat(64), body: { hello: "world" }, grant: digest("f") }).body).toEqual({ hello: "world" });
  });

  test("rejects unknown keys, invalid ids, and bounds", () => {
    expect(() => parseHabitatInvocation({ ...invocation(), extra: true })).toThrow(AlgalError);
    expect(() => parseHabitatInvocation({ ...invocation(), operationId: "bad" })).toThrow(AlgalError);
    expect(() => parseHabitatInvocation({ ...invocation(), terms: { ...invocation().terms, maxHops: 99 } })).toThrow(AlgalError);
    expect(() => parseHabitatMessage({ contract: "algal.habitat-message.v1", messageId: invocation().operationId, sender: invocation().sender, recipient: "cap:wrong:sha256:" + "e".repeat(64), body: {}, grant: digest() })).toThrow(AlgalError);
  });

  test("client submits and reads a durable invocation", async () => {
    const seen: Request[] = [];
    const client = new HabitatLinkClient({
      baseUrl: "https://habitat.invalid/",
      habitat: invocation().sender.habitat,
      authorization: "Bearer test",
      fetch: async (input, init) => {
        const request = new Request(String(input), init);
        seen.push(request);
        if (new URL(request.url).pathname.endsWith("/habitat-link/messages")) {
          const sent = await request.clone().json() as { messageId: string };
          return Response.json({ contract: "algal.habitat-message-acceptance.v1", messageId: sent.messageId, message: digestCanonical(sent as unknown as JsonValue), status: "accepted", target: invocation().sender.habitat, delivery: "sha256:" + "1".repeat(64), replayed: false });
        }
        if (request.method === "POST") return Response.json({ contract: "algal.habitat-acceptance.v1", operationId: invocation().operationId, invocation: digest(), status: "accepted", target: invocation().sender.habitat, process: "link-0123456789abcdef0123456789abcdef", replayed: false });
        return Response.json({ contract: "algal.habitat-result.v1", operationId: invocation().operationId, invocation: digest(), status: "complete", process: "link-0123456789abcdef0123456789abcdef", receipt: digest("d") });
      },
    });
    const accepted = await client.invoke(parseHabitatInvocation(invocation()));
    expect(accepted.replayed).toBe(false);
    expect((await client.getInvocation(invocation().operationId)).status).toBe("complete");
    expect(seen[0]!.headers.get("authorization")).toBe("Bearer test");
    expect(seen[0]!.headers.get("idempotency-key")).toBe(invocation().operationId);
    const message = { contract: "algal.habitat-message.v1", messageId: invocation().operationId, sender: invocation().sender, recipient: `cap:mailbox-send:sha256:${"e".repeat(64)}`, body: { hello: "world" }, grant: digest("f") } as const;
    const delivery = await client.sendMessage(message);
    expect(delivery.deliveryId).toBe("sha256:" + "1".repeat(64));
    expect(new URL(seen[2]!.url).pathname).toBe(`/v1/habitats/${invocation().sender.habitat}/habitat-link/messages`);
    expect(seen[2]!.headers.get("idempotency-key")).toBe(message.messageId);
    expect(JSON.parse(await seen[2]!.text()).contract).toBe("algal.habitat-message.v1");
  });
});
